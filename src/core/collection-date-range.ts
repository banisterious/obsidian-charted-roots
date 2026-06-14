/**
 * Compute the span of years a collection covers for the Statistics Dashboard's
 * Entity overview.
 *
 * Counts BOTH the birth and death year of every person, so the range reflects
 * the whole period the collection covers rather than collapsing to birth years
 * alone (#714).
 *
 * Years are resolved through an injected `resolveYear` callback so the helper
 * stays pure and the dates layer stays decoupled. In production this is wired to
 * `DateService.getCanonicalYear`, which returns a signed canonical year — so a
 * fictional `8082 BBY` resolves to a large *negative* year instead of being
 * misread as the ordinary year 8082 (#719). Results are grouped per universe
 * (a person's `universe`; absent = real-world) so unrelated timelines aren't
 * conflated into one nonsensical span.
 */

/** A per-universe span in signed canonical years. */
export interface UniverseYearRange {
	/** Universe name; undefined when the people are real-world (no universe). */
	universe?: string;
	/** Earliest signed canonical year. */
	earliest: number;
	/** Latest signed canonical year. */
	latest: number;
	/** latest - earliest (0 for a single point). */
	span: number;
}

export interface CollectionDateRange {
	/** One entry per universe that has datable years; real-world first. */
	ranges: UniverseYearRange[];
}

/** A per-universe span with display-ready, era-formatted bound labels. */
export interface DisplayDateRange {
	universe?: string;
	earliest: string;
	latest: string;
	spanYears: number;
}

export function computeCollectionDateRange(
	people: ReadonlyArray<{ birthDate?: string; deathDate?: string; universe?: string }>,
	resolveYear: (dateStr: string, universe: string | undefined) => number | null
): CollectionDateRange {
	// Group canonical years by universe key (real-world keyed as '').
	const byKey = new Map<string, { universe?: string; years: number[] }>();

	for (const p of people) {
		const universe = typeof p.universe === 'string' && p.universe.trim() ? p.universe.trim() : undefined;
		const key = universe ?? '';
		for (const dateStr of [p.birthDate, p.deathDate]) {
			if (typeof dateStr !== 'string' || dateStr.length === 0) continue;
			const year = resolveYear(dateStr, universe);
			if (year === null) continue;
			let group = byKey.get(key);
			if (!group) {
				group = { universe, years: [] };
				byKey.set(key, group);
			}
			group.years.push(year);
		}
	}

	const ranges: UniverseYearRange[] = [];
	for (const { universe, years } of byKey.values()) {
		if (years.length === 0) continue;
		const earliest = Math.min(...years);
		const latest = Math.max(...years);
		ranges.push({ universe, earliest, latest, span: latest - earliest });
	}

	// Real-world first, then universes alphabetically — stable display order.
	ranges.sort((a, b) => {
		if (!a.universe && b.universe) return -1;
		if (a.universe && !b.universe) return 1;
		return (a.universe ?? '').localeCompare(b.universe ?? '');
	});

	return { ranges };
}

/**
 * Render one display range as a single line. Prefixes the universe name only
 * when asked (i.e. when more than one range is shown), so a single-universe or
 * real-world vault reads as a bare span.
 */
export function formatDateRangeLine(range: DisplayDateRange, showUniverse: boolean): string {
	const span = `${range.earliest} — ${range.latest}${range.spanYears ? ` (${range.spanYears} years)` : ''}`;
	const label = range.universe ?? 'Real-world';
	return showUniverse ? `${label}: ${span}` : span;
}
