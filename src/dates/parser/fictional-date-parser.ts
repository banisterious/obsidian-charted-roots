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
	public parse(dateStr: string, universe?: string): DateParseResult {
		if (!dateStr || typeof dateStr !== 'string') {
			return { success: false, error: 'Empty or invalid date string', raw: String(dateStr) };
		}

		const trimmed = dateStr.trim();
		if (!trimmed) {
			return { success: false, error: 'Empty date string', raw: dateStr };
		}

		// Try to match various patterns
		const patterns = [
			// "TA 2941" or "TA  2941" (abbreviation space year)
			/^([A-Za-z]+)\s+(\d+)$/,
			// "TA2941" (abbreviation directly followed by year)
			/^([A-Za-z]+)(\d+)$/,
			// "2941 TA" (year space abbreviation)
			/^(\d+)\s+([A-Za-z]+)$/,
			// "2941TA" (year directly followed by abbreviation)
			/^(\d+)([A-Za-z]+)$/
		];

		let abbrev: string | null = null;
		let yearStr: string | null = null;

		for (const pattern of patterns) {
			const match = trimmed.match(pattern);
			if (match) {
				if (/^\d+$/.test(match[1])) {
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

		// If universe is specified, prefer a system that matches
		if (universe) {
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
				canonicalYear
			}
		};
	}

	/**
	 * Find a system that matches the given universe and has the era abbreviation
	 */
	private findSystemByUniverse(
		universe: string,
		abbrevLower: string
	): { system: FictionalDateSystem; era: FictionalEra } | null {
		const universeLower = universe.toLowerCase();

		for (const system of this.systems) {
			if (system.universe?.toLowerCase() === universeLower) {
				const era = system.eras.find(e => e.abbrev.toLowerCase() === abbrevLower);
				if (era) {
					return { system, era };
				}
			}
		}

		return null;
	}

	/**
	 * Find the first system whose `universe` field matches the given universe
	 * name via slug-aware comparison ("Star Wars" → matches `star-wars`, with
	 * prefix / superset support so fan-canon naming like "Star Wars Legends"
	 * still resolves to Galactic Standard). Mirrors the slug logic used by
	 * `suggestBuiltinForUniverseName` in `src/universes/ui/calendar-suggest.ts`.
	 */
	public findSystemForUniverse(universe: string): FictionalDateSystem | undefined {
		const trimmed = universe.trim();
		if (!trimmed) return undefined;
		const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
		if (!slug) return undefined;
		return this.systems.find(sys => {
			if (!sys.universe) return false;
			const sysSlug = sys.universe.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

		// Check if it matches our expected patterns
		const fictionalPatterns = [
			/^[A-Za-z]+\s*\d+$/, // "TA 2941" or "TA2941"
			/^\d+\s*[A-Za-z]+$/ // "2941 TA" or "2941TA"
		];

		// Exclude ISO date patterns
		const isoPattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
		if (isoPattern.test(trimmed)) {
			return false;
		}

		return fictionalPatterns.some(p => p.test(trimmed));
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
