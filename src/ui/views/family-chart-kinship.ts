/**
 * Pure helpers for the Family Chart's kinship-label overlay.
 */

/** Minimal person shape needed to decide a spouse kinship relationship. */
export interface KinshipPerson {
	id: string;
	rels: { spouses: string[] };
}

/**
 * Whether two charted people are spouses in the relationship data, as opposed
 * to merely co-parents that f3 joins with a straight connector so their shared
 * child can branch from the midpoint.
 *
 * The kinship-label pass classifies links by geometry — a straight line reads
 * as a spouse link — so a co-parent connector would otherwise be labelled
 * "Spouse" even when the two were never married (#694). Reciprocity is treated
 * leniently: a link counts as spousal if either side lists the other (the
 * chart's sanitize pass already drops one-sided spouse references before this
 * runs, but the OR keeps the decision robust if one slips through).
 */
export function arePersonsSpouses(
	a: KinshipPerson | undefined,
	b: KinshipPerson | undefined
): boolean {
	if (!a || !b) return false;
	return a.rels.spouses.includes(b.id) || b.rels.spouses.includes(a.id);
}
