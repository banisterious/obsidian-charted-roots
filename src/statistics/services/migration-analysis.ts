/**
 * Pure helpers for event-driven migration analysis (#643).
 *
 * The migration analysis used to compare a person's birth location with their
 * death location and call any difference a move. That misses living migrants
 * (no death location), counts a child place against its own parent as a move
 * (Tatooine -> Lars Homestead), and reports a lifetime A -> B -> A round trip as
 * "didn't move". The fix walks each person's movement events (Residence,
 * Immigration) as the primary signal, falling back to birth/death only when no
 * such events exist.
 *
 * This module holds the order-and-collapse logic, kept pure so it can be tested
 * without a vault. The "are these two places the same location" decision is
 * injected as a predicate, because in the service it consults both the
 * segment-aware string comparison and the place graph's parent links.
 */

/** A place name paired with the year it was attested (null when undated). */
export interface DatedPlace {
	place: string;
	year: number | null;
}

/**
 * Order movement places chronologically by attested year. Undated entries sort
 * to the end (keeping their relative order) rather than being dropped, so a
 * person with some undated events still contributes their locations.
 */
export function orderMovementPlaces(events: DatedPlace[]): string[] {
	return [...events]
		.sort((a, b) => {
			if (a.year === null && b.year === null) return 0;
			if (a.year === null) return 1;
			if (b.year === null) return -1;
			return a.year - b.year;
		})
		.map(e => e.place)
		.filter(p => p.length > 0);
}

/**
 * Build a person's chronological location sequence: birth place first (earliest
 * by definition), the movement-event places in between, death place last.
 * Missing endpoints are simply omitted.
 */
export function buildLocationSequence(
	birthPlace: string,
	movementPlaces: string[],
	deathPlace: string
): string[] {
	const sequence: string[] = [];
	if (birthPlace) sequence.push(birthPlace);
	sequence.push(...movementPlaces);
	if (deathPlace) sequence.push(deathPlace);
	return sequence;
}

/**
 * Reduce a location sequence to the distinct places visited, treating two
 * places as the same when `sameLocation` says so (equal, or one nested inside
 * the other in the place hierarchy). Order of first appearance is preserved.
 *
 * A person counts as having moved when this returns more than one location, so
 * collapsing parent/child pairs is what stops a within-place "move" (a city and
 * a homestead on it) from inflating the migration count.
 */
export function collapseNestedLocations(
	places: string[],
	sameLocation: (a: string, b: string) => boolean
): string[] {
	const kept: string[] = [];
	for (const place of places) {
		if (!place) continue;
		if (!kept.some(k => sameLocation(k, place))) {
			kept.push(place);
		}
	}
	return kept;
}
