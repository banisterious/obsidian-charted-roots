/**
 * Fictional Date Parser
 *
 * Parses date strings in fictional calendar formats (e.g., "TA 2941", "AC 283")
 * and provides utilities for age calculation and date comparison.
 */

import type {
	FictionalDateSystem,
	FictionalEra,
	ParsedFictionalDate,
	DateParseResult,
	DateFormatOptions,
	AgeCalculation
} from '../types/date-types';
import { pluralize } from '../../utils/format-utils';

/**
 * Strip approximation markers ("ish", "?", "circa", etc.) from a date string,
 * returning the cleaned form plus a flag indicating whether any marker was
 * removed. Handles both attached ("10ish") and detached ("10 ish") suffixes,
 * trailing "?", prefixes (circa, ca, c., about, abt, approx, ~), and inline
 * placement between an era and a year (e.g., "DE ~310", "DE c. 1264").
 *
 * Without this, "EF 10ish" falls through every fictional-parser pattern and
 * gets misclassified as a standard date (#562). The inline-marker handling
 * specifically covers fictional-era dates with approximation on the year
 * portion, like @doctorwodka's `born: DE ~310` (#624 follow-up).
 */
function stripApproximationMarkers(input: string): { stripped: string; isApproximate: boolean } {
	let stripped = input;
	let isApproximate = false;

	const afterPrefix = stripped.replace(/^(?:about|abt|circa|ca|c\.|approx(?:imately)?|~)\s+/i, '');
	if (afterPrefix !== stripped) {
		stripped = afterPrefix;
		isApproximate = true;
	}

	// Inline approximation marker between an era and a year, e.g., "DE ~310"
	// → "DE 310". The `\s+` before the marker ensures we don't accidentally
	// re-match the prefix case handled above, and the `(?=\d)` lookahead
	// ensures the marker is positioned to qualify a year rather than floating
	// arbitrarily mid-string.
	const afterInline = stripped.replace(
		/\s+(?:about|abt|circa|ca|c\.|approx(?:imately)?|~)\s*(?=\d)/gi,
		' '
	);
	if (afterInline !== stripped) {
		stripped = afterInline;
		isApproximate = true;
	}

	const afterQuestion = stripped.replace(/\s*\?\s*$/, '');
	if (afterQuestion !== stripped) {
		stripped = afterQuestion;
		isApproximate = true;
	}

	const afterIsh = stripped.replace(/(\d+)\s*ish\b/gi, '$1');
	if (afterIsh !== stripped) {
		stripped = afterIsh;
		isApproximate = true;
	}

	return { stripped: stripped.trim(), isApproximate };
}

/**
 * Normalize a universe name to a comparison slug: lowercased, non-alphanumeric
 * runs collapsed to single dashes, edges trimmed. This makes "Star Wars",
 * "star-wars", and a wikilink-wrapped "[[Star Wars]]" all compare equal, and
 * mirrors the slug logic in `suggestBuiltinForUniverseName`
 * (`src/universes/ui/calendar-suggest.ts`). Shared by the universe-matching
 * methods below so they agree on what counts as the same universe.
 */
function universeSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Parser for fictional date systems
 */
export class FictionalDateParser {
	private systems: FictionalDateSystem[];
	private abbrevToEra: Map<string, { system: FictionalDateSystem; era: FictionalEra }>;

	constructor(systems: FictionalDateSystem[]) {
		this.systems = systems;
		this.abbrevToEra = new Map();
		this.buildAbbreviationIndex();
	}

	/**
	 * Build an index of era abbreviations for fast lookup
	 */
	private buildAbbreviationIndex(): void {
		this.abbrevToEra.clear();
		for (const system of this.systems) {
			for (const era of system.eras) {
				// Store with lowercase key for case-insensitive matching
				const key = era.abbrev.toLowerCase();
				// Don't overwrite if already exists (first system wins)
				if (!this.abbrevToEra.has(key)) {
					this.abbrevToEra.set(key, { system, era });
				}
			}
		}
	}

	/**
	 * Update the list of date systems
	 */
	public updateSystems(systems: FictionalDateSystem[]): void {
		this.systems = systems;
		this.buildAbbreviationIndex();
	}

	/**
	 * Parse a date string like "TA 2941" or "AC 283"
	 *
	 * Supported formats:
	 * - "{abbrev} {year}" (e.g., "TA 2941")
	 * - "{abbrev}{year}" (e.g., "TA2941")
	 * - "{year} {abbrev}" (e.g., "2941 TA")
	 *
	 * @param dateStr The date string to parse
	 * @param universe Optional universe to prefer when multiple systems match
	 * @returns Parse result with success/failure and parsed date or error
	 */
	public parse(dateStr: string, universe?: string, preferredSystemId?: string): DateParseResult {
		if (!dateStr || typeof dateStr !== 'string') {
			return { success: false, error: 'Empty or invalid date string', raw: String(dateStr) };
		}

		const trimmed = dateStr.trim();
		if (!trimmed) {
			return { success: false, error: 'Empty date string', raw: dateStr };
		}

		// Strip approximation markers ("ish", "?", "circa", etc.) before pattern
		// matching so "EF 10ish" parses as approximate "EF 10" rather than
		// falling through to the standard-date fallback (#562).
		const { stripped, isApproximate } = stripApproximationMarkers(trimmed);

		// Strip an optional ISO 8601 time suffix (`T HH:MM[:SS]`, with an
		// optional space before the `T`) before pattern matching. The
		// v0.22.46 sibling-sort tiebreak (#590) consumes time precision
		// off the raw string directly; the parser only needs to recover
		// the year and era so the canonical-year sort and display work
		// correctly when a fictional-era date carries a time component
		// (e.g., `BBY 29 T20:03:04`). The time itself is not preserved
		// on the parsed result.
		const TIME_SUFFIX_RE = /\s*T\d{1,2}:\d{2}(?::\d{2})?$/;
		const withoutTime = stripped.replace(TIME_SUFFIX_RE, '').trim();

		// Strip an optional ISO-style date suffix (`-MM-DD` or `-MM`)
		// after the time strip so a fictional-era date with month/day
		// precision (e.g., `DE 1264-08-15`) parses as the year-and-era
		// pair rather than falling through to the standard-date fallback
		// and losing the era on display (#626). Same rationale as the
		// time strip: precision beyond the year isn't preserved on the
		// parsed result — the raw frontmatter string is still available
		// for sort tiebreaks.
		// Require a year digit immediately before the `-NN` so a month/day
		// suffix (`DE 1222-03`) strips but a signed/negative year (`EP -30`)
		// is left intact — the capture preserves the year's last digit. Without
		// the guard the strip ate the negative year itself (#655).
		// Capture the month (and optional day) from that suffix before stripping,
		// so sub-year precision is preserved on the parsed result for ordering
		// instead of collapsing to the year (#722). Mirrors DATE_SUFFIX_RE so the
		// same dates that get stripped here get their precision recorded.
		let month: number | undefined;
		let day: number | undefined;
		const suffixMatch = withoutTime.match(/\d-(\d{2})(?:-(\d{2}))?$/);
		if (suffixMatch) {
			const m = parseInt(suffixMatch[1], 10);
			if (m >= 1 && m <= 12) month = m;
			if (suffixMatch[2]) {
				const d = parseInt(suffixMatch[2], 10);
				if (d >= 1 && d <= 31) day = d;
			}
		}

		const DATE_SUFFIX_RE = /(\d)-\d{2}(?:-\d{2})?$/;
		const withoutSuffix = withoutTime.replace(DATE_SUFFIX_RE, '$1').trim();

		// Strip a trailing decade marker (`EP 30s` → `EP 30`) and treat the
		// result as approximate — the decade's start year stands in as the
		// canonical point so it sorts and places sensibly (#655).
		const DECADE_SUFFIX_RE = /\ds$/;
		const isDecade = DECADE_SUFFIX_RE.test(withoutSuffix);
		const withoutDate = isDecade ? withoutSuffix.replace(/s$/, '').trim() : withoutSuffix;

		// Try to match various patterns. The year capture accepts an optional
		// leading `-` so signed/negative fictional years (`EP -18`) parse to a
		// negative canonical year rather than being rejected (#655).
		const patterns = [
			// "TA 2941" or "TA  2941" (abbreviation space year)
			/^([A-Za-z]+)\s+(-?\d+)$/,
			// "TA2941" (abbreviation directly followed by year)
			/^([A-Za-z]+)(-?\d+)$/,
			// "2941 TA" (year space abbreviation)
			/^(-?\d+)\s+([A-Za-z]+)$/,
			// "2941TA" (year directly followed by abbreviation)
			/^(-?\d+)([A-Za-z]+)$/
		];

		let abbrev: string | null = null;
		let yearStr: string | null = null;

		for (const pattern of patterns) {
			const match = withoutDate.match(pattern);
			if (match) {
				if (/^-?\d+$/.test(match[1])) {
					// Year first pattern
					yearStr = match[1];
					abbrev = match[2];
				} else {
					// Abbreviation first pattern
					abbrev = match[1];
					yearStr = match[2];
				}
				break;
			}
		}

		if (!abbrev || !yearStr) {
			return {
				success: false,
				error: `Could not parse date format: "${trimmed}"`,
				raw: dateStr
			};
		}

		// Look up the era by abbreviation
		const abbrevLower = abbrev.toLowerCase();
		const lookup = this.abbrevToEra.get(abbrevLower);

		if (!lookup) {
			return {
				success: false,
				error: `Unknown era abbreviation: "${abbrev}"`,
				raw: dateStr
			};
		}

		let { system, era } = lookup;

		// Prefer the universe's explicitly-linked default calendar when the
		// caller resolved one (the universe note's `default_calendar`), since
		// that's the calendar the user picked for this universe (#650). Fall
		// back to matching on the system's own `universe` field.
		const preferred = preferredSystemId
			? this.systems.find(s => s.id === preferredSystemId)
			: undefined;
		const preferredEra = preferred?.eras.find(e => e.abbrev.toLowerCase() === abbrevLower);
		if (preferred && preferredEra) {
			system = preferred;
			era = preferredEra;
		} else if (universe) {
			const universeMatch = this.findSystemByUniverse(universe, abbrevLower);
			if (universeMatch) {
				system = universeMatch.system;
				era = universeMatch.era;
			}
		}

		const year = parseInt(yearStr, 10);
		if (isNaN(year)) {
			return {
				success: false,
				error: `Invalid year: "${yearStr}"`,
				raw: dateStr
			};
		}

		// Calculate canonical year
		const canonicalYear = this.toCanonicalYear(era, year);

		return {
			success: true,
			date: {
				system,
				era,
				year,
				raw: dateStr,
				canonicalYear,
				...(month !== undefined ? { month } : {}),
				...(day !== undefined ? { day } : {}),
				...(isApproximate || isDecade ? { isApproximate: true } : {})
			}
		};
	}

	/**
	 * Find a system that matches the given universe and has the era
	 * abbreviation. Universe comparison is slug-aware (so a wikilink-wrapped or
	 * differently-cased `universe` value still resolves), and a user-defined
	 * system is preferred over a built-in that shares the same universe and era
	 * abbreviation — otherwise the built-in that ships with the plugin (e.g.
	 * Galactic Standard's BBY/ABY) shadows a custom calendar reusing those
	 * abbreviations, since built-ins are listed first (#650).
	 */
	private findSystemByUniverse(
		universe: string,
		abbrevLower: string
	): { system: FictionalDateSystem; era: FictionalEra } | null {
		const slug = universeSlug(universe);
		if (!slug) return null;

		const matches: { system: FictionalDateSystem; era: FictionalEra }[] = [];
		for (const system of this.systems) {
			if (!system.universe) continue;
			const sysSlug = universeSlug(system.universe);
			if (!sysSlug) continue;
			if (sysSlug !== slug && !slug.includes(sysSlug) && !sysSlug.includes(slug)) continue;
			const era = system.eras.find(e => e.abbrev.toLowerCase() === abbrevLower);
			if (era) {
				matches.push({ system, era });
			}
		}
		if (matches.length === 0) return null;

		return matches.find(m => !m.system.builtIn) ?? matches[0];
	}

	/**
	 * Find the first system whose `universe` field matches the given universe
	 * name via slug-aware comparison ("Star Wars" → matches `star-wars`, with
	 * prefix / superset support so fan-canon naming like "Star Wars Legends"
	 * still resolves to Galactic Standard). Mirrors the slug logic used by
	 * `suggestBuiltinForUniverseName` in `src/universes/ui/calendar-suggest.ts`.
	 */
	public findSystemForUniverse(universe: string): FictionalDateSystem | undefined {
		const slug = universeSlug(universe);
		if (!slug) return undefined;
		return this.systems.find(sys => {
			if (!sys.universe) return false;
			const sysSlug = universeSlug(sys.universe);
			if (!sysSlug) return false;
			return sysSlug === slug || slug.includes(sysSlug) || sysSlug.includes(slug);
		});
	}

	/**
	 * Convert an era year to a canonical year for comparison
	 *
	 * The canonical year is an absolute position on the timeline,
	 * allowing comparison across different eras.
	 */
	public toCanonicalYear(era: FictionalEra, year: number): number {
		const direction = era.direction || 'forward';

		if (direction === 'backward') {
			// For backward-counting eras (like BC), higher years are earlier
			return era.epoch - year;
		} else {
			// For forward-counting eras, add year to epoch
			return era.epoch + year;
		}
	}

	/**
	 * Format a parsed date back to a string
	 */
	public format(date: ParsedFictionalDate, options?: DateFormatOptions): string {
		const { era, year } = date;
		const useLong = options?.useLongForm ?? false;
		const eraStr = useLong ? era.name : era.abbrev;

		if (options?.includeYearPrefix) {
			return `${eraStr} Year ${year}`;
		}

		return `${eraStr} ${year}`;
	}

	/**
	 * Calculate age between two dates in the same or compatible systems
	 *
	 * @param birth Birth date (parsed)
	 * @param death Death date (parsed), or null for current age
	 * @param currentYear Current year for living persons (if death is null)
	 * @returns Age calculation result
	 */
	public calculateAge(
		birth: ParsedFictionalDate,
		death: ParsedFictionalDate | null,
		currentYear?: { era: FictionalEra; year: number }
	): AgeCalculation {
		const birthCanonical = birth.canonicalYear;
		let deathCanonical: number;

		if (death) {
			deathCanonical = death.canonicalYear;
		} else if (currentYear) {
			deathCanonical = this.toCanonicalYear(currentYear.era, currentYear.year);
		} else {
			return {
				years: 0,
				isExact: false,
				display: 'Unknown',
				error: 'No death date or current year provided'
			};
		}

		const years = deathCanonical - birthCanonical;

		if (years < 0) {
			return {
				years: Math.abs(years),
				isExact: false,
				display: `${Math.abs(years)} years (dates may be reversed)`,
				error: 'Death date appears to be before birth date'
			};
		}

		return {
			years,
			isExact: true,
			display: `${years} ${pluralize(years, 'year')}`
		};
	}

	/**
	 * Check if a date string appears to be a fictional date format
	 *
	 * This is a quick check to determine if we should attempt parsing,
	 * without doing a full parse.
	 */
	public looksLikeFictionalDate(dateStr: string): boolean {
		if (!dateStr || typeof dateStr !== 'string') {
			return false;
		}

		const trimmed = dateStr.trim();
		// Strip an optional `T HH:MM[:SS]` suffix (with optional leading
		// space) so fictional-era dates with twin-disambiguation times
		// (#590) still pass this look-ahead check — kept in sync with the
		// suffix-strip in `parse()`.
		const withoutTime = trimmed.replace(/\s*T\d{1,2}:\d{2}(?::\d{2})?$/, '').trim();

		// Exclude ISO date patterns BEFORE stripping the date suffix so
		// `2024-08-15` (a real ISO date) is still rejected here rather
		// than being reduced to `2024` and then matched as a bare year.
		// Kept in sync with `parse()`'s date-suffix strip (#626).
		const isoPattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
		if (isoPattern.test(withoutTime)) {
			return false;
		}

		// Strip an optional ISO-style date suffix (`-MM-DD` or `-MM`), guarded
		// to require a preceding year digit so a signed/negative year (`EP -30`)
		// survives, then a trailing decade marker (`EP 30s`). Kept in sync with
		// `parse()`'s strips (#626, #655).
		const withoutSuffix = withoutTime.replace(/(\d)-\d{2}(?:-\d{2})?$/, '$1').trim();
		const withoutDate = withoutSuffix.replace(/(\d)s$/, '$1').trim();

		// Check if it matches our expected patterns. The year accepts an
		// optional leading `-` to recognize negative fictional years (#655).
		const fictionalPatterns = [
			/^[A-Za-z]+\s*-?\d+$/, // "TA 2941" or "TA2941" or "EP -18"
			/^-?\d+\s*[A-Za-z]+$/ // "2941 TA" or "2941TA"
		];

		return fictionalPatterns.some(p => p.test(withoutDate));
	}

	/**
	 * Get all available date systems
	 */
	public getSystems(): FictionalDateSystem[] {
		return [...this.systems];
	}

	/**
	 * Get a system by ID
	 */
	public getSystem(id: string): FictionalDateSystem | undefined {
		return this.systems.find(s => s.id === id);
	}

	/**
	 * Get systems for a specific universe
	 */
	public getSystemsForUniverse(universe: string): FictionalDateSystem[] {
		const universeLower = universe.toLowerCase();
		return this.systems.filter(
			s => s.universe?.toLowerCase() === universeLower
		);
	}

	/**
	 * Try to parse a date, returning null if it doesn't look like a fictional date
	 *
	 * This is useful when you want to check if a date is fictional without
	 * generating errors for standard ISO dates.
	 */
	public tryParse(dateStr: string, universe?: string): ParsedFictionalDate | null {
		if (!this.looksLikeFictionalDate(dateStr)) {
			return null;
		}

		const result = this.parse(dateStr, universe);
		return result.success ? result.date : null;
	}
}
