/**
 * Shared living-status determination for person statistics and filters.
 *
 * The explicit `cr_living` flag is authoritative: `true` always counts as
 * living and `false` never does, regardless of dates — so an explicitly-living
 * person is counted even with no birth date or in a fictional universe (#776).
 * Without the flag, fall back to the date heuristic: a recorded death date means
 * not living, and otherwise the person counts as living only if their birth year
 * is within `threshold` years of `currentYear`.
 *
 * Note: the date-heuristic branch uses whatever `currentYear` the caller passes.
 * Resolving a fictional universe's current year (rather than the real-world year)
 * is tracked separately in #473.
 */
export interface LivingStatusInput {
	/** Explicit `cr_living` frontmatter override, if set. */
	crLiving?: boolean;
	/** Whether the person has any recorded death date. */
	hasDeathDate: boolean;
	/** Resolved birth year, or null when unknown/unparseable. */
	birthYear: number | null;
	/** Reference "now" year the age threshold is measured against. */
	currentYear: number;
	/** Max plausible age before a missing death date stops implying living. */
	threshold: number;
}

export function isLivingPerson(input: LivingStatusInput): boolean {
	// Explicit flag wins over any date inference.
	if (input.crLiving === true) return true;
	if (input.crLiving === false) return false;

	// A recorded death date means they are not living.
	if (input.hasDeathDate) return false;

	// Without a birth year we cannot judge plausible living status.
	if (input.birthYear === null) return false;

	return input.currentYear - input.birthYear < input.threshold;
}
