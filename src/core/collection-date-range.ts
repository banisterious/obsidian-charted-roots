/**
 * Compute the span of years a collection covers for the Statistics Dashboard's
 * Entity overview.
 *
 * Counts BOTH the birth and death year of every person, so the range reflects
 * the whole period the collection covers rather than collapsing to birth years
 * alone (#714). Years are read from the leading 4-digit prefix of each date
 * string; values without a leading 4-digit year (e.g. fictional "23 ABY" or a
 * bare "ABT 1850" qualifier) are ignored, matching the existing behaviour.
 */
export interface CollectionDateRange {
	/** Earliest year found, or undefined when no datable years exist. */
	earliest?: number;
	/** Latest year found, or undefined when no datable years exist. */
	latest?: number;
	/** latest - earliest (0 for a single point), or undefined when no years. */
	span?: number;
}

export function computeCollectionDateRange(
	people: ReadonlyArray<{ birthDate?: string; deathDate?: string }>
): CollectionDateRange {
	const years = people
		.flatMap(p => [p.birthDate, p.deathDate])
		.filter((d): d is string => typeof d === 'string' && d.length > 0)
		.map(d => {
			const match = d.match(/^(\d{4})/);
			return match ? parseInt(match[1], 10) : null;
		})
		.filter((y): y is number => y !== null);

	if (years.length === 0) return {};

	const earliest = Math.min(...years);
	const latest = Math.max(...years);
	return { earliest, latest, span: latest - earliest };
}
