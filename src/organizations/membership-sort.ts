/**
 * Ordering for a person's memberships in the Entity Profile (#743).
 *
 * Memberships were previously shown in insert order, which left the date ranges
 * scattered (and an edited membership jumping to the bottom). They are now
 * ordered by earliest start year, resolved to an era-aware canonical year by
 * the caller so fictional BBY/ABY dates sort by true chronology.
 */

/** Pre-resolved sort key for one membership. */
export interface MembershipSortKey {
	/** Era-aware canonical start year; undefined when the start date is missing/unparseable. */
	fromYear?: number;
	/** True when the membership has an end date (i.e. it has ended). */
	hasEnd: boolean;
	/** Organization display name, for the final alphabetical tiebreak. */
	name: string;
}

/**
 * Compare two memberships for display order:
 * 1. Earliest start year first.
 * 2. Memberships with no start date sort last.
 * 3. On a tied start year, an *ended* membership wins over an ongoing
 *    ("Current") one — the Current badge implies it's still running, so a
 *    completed span reads as the earlier of the two (reporter's preference).
 * 4. Remaining ties break alphabetically by organization name.
 */
export function compareMembershipsByStartDate(a: MembershipSortKey, b: MembershipSortKey): number {
	if (a.fromYear !== undefined && b.fromYear !== undefined) {
		if (a.fromYear !== b.fromYear) return a.fromYear - b.fromYear;
		if (a.hasEnd !== b.hasEnd) return a.hasEnd ? -1 : 1;
		return a.name.localeCompare(b.name);
	}
	if (a.fromYear !== undefined) return -1;
	if (b.fromYear !== undefined) return 1;
	return a.name.localeCompare(b.name);
}
