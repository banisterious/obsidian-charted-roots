/**
 * Segment-aware comparison of hierarchical place names (#643 / #635 / #614).
 *
 * Genealogical place names are hierarchical and most-specific-first, the way
 * GEDCOM's `PLAC` tag records them: `"Malden, Essex, Massachusetts, USA"` is
 * leaf (Malden) -> county -> state -> country. Splitting on commas yields the
 * segments leaf-first.
 *
 * Three questions recur across the places work, and all three are really about
 * how two segment chains line up, not about raw string containment (which is
 * what the over-eager substring match in #614 gets wrong):
 *
 * - **Same location, different jurisdiction** (#635): two notes share the leaf
 *   and its immediate parent but diverge at a higher administrative tier, e.g.
 *   `"Malden, Essex, Massachusetts Bay Colony, British America"` (a 1680 record)
 *   vs `"Malden, Essex, Massachusetts, USA"` (a modern one). That divergence
 *   pattern is the historical-name signature.
 * - **Ancestor / descendant** (#643): one place sits inside the other, e.g.
 *   `"Tatooine"` contains `"Lars Homestead, Tatooine"`, so the pair should not
 *   count as a migration on its own.
 * - **Same place** (#614): the full segment chains match, so a lookup should
 *   resolve to it rather than to some unrelated place sharing a substring.
 *
 * This module is intentionally pure and DOM-free so the comparison logic can be
 * unit-tested in isolation. Callers pass plain place names; strip any wikilink
 * wrapping (e.g. `[[Name|Alias]]`) before calling.
 */

/**
 * Normalize a single segment for comparison: trim, collapse internal
 * whitespace, drop a trailing period, and lowercase. Segment comparison is
 * case- and spacing-insensitive so `"Massachusetts "` and `"massachusetts"`
 * count as the same tier.
 */
function normalizeSegment(segment: string): string {
	return segment
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/\.$/, '')
		.toLowerCase();
}

/**
 * Split a hierarchical place name into its segments, leaf-first. Splits on
 * commas, trims each part, and drops empty parts (so `"A,,B"` and trailing
 * commas don't produce blank segments). Returns `[]` for an empty/blank name.
 */
export function splitPlaceSegments(name: string): string[] {
	if (!name) return [];
	return name
		.split(',')
		.map(part => part.trim())
		.filter(part => part.length > 0);
}

/**
 * Count how many leading (leaf-side) segments two chains share before the first
 * divergence. `["Malden","Essex","Massachusetts","USA"]` and
 * `["Malden","Essex","Massachusetts Bay Colony","British America"]` share 2
 * (Malden, Essex), then diverge.
 */
export function sharedLeafSegmentCount(a: string[], b: string[]): number {
	const limit = Math.min(a.length, b.length);
	let shared = 0;
	for (let i = 0; i < limit; i++) {
		if (normalizeSegment(a[i]) !== normalizeSegment(b[i])) break;
		shared++;
	}
	return shared;
}

/**
 * Whether two place names refer to the same location under different historical
 * jurisdictions (#635): they agree on the leaf and at least `minSharedLeaf`
 * leaf-side segments, but each carries a higher tier the other doesn't match.
 *
 * Requiring agreement on the leaf plus its immediate parent (default 2) is what
 * keeps unrelated places that merely share a leaf name apart: two different
 * "Springfield"s in different counties share only 1 segment and are not treated
 * as the same location.
 *
 * A pure ancestor/descendant pair (one chain is pure prefix of the other, e.g.
 * `"Tatooine"` vs `"Lars Homestead, Tatooine"`) is deliberately excluded; that
 * is {@link isSegmentAncestor}'s concern, not a jurisdiction variant.
 */
export function isSameLocationDifferentJurisdiction(
	aName: string,
	bName: string,
	minSharedLeaf = 2
): boolean {
	const a = splitPlaceSegments(aName);
	const b = splitPlaceSegments(bName);
	if (a.length === 0 || b.length === 0) return false;

	const shared = sharedLeafSegmentCount(a, b);
	if (shared < minSharedLeaf) return false;

	// Both must carry a diverging tier beyond the shared leaf region. If the
	// shared count reaches either chain's full length, one is a prefix of the
	// other (same place or ancestor/descendant), not a jurisdiction variant.
	return shared < a.length && shared < b.length;
}

/**
 * Whether `ancestorName` is a strictly higher-tier ancestor of `descendantName`
 * by segment chain (#643): the ancestor's segments match the root-side tail of
 * the descendant's. `"Tatooine"` is an ancestor of `"Lars Homestead, Tatooine"`;
 * `"Massachusetts, USA"` is an ancestor of `"Malden, Essex, Massachusetts, USA"`.
 *
 * Equal chains return `false` (not *strictly* an ancestor). This only works
 * when both names carry their hierarchy; when a place is recorded as a bare leaf
 * (`"Lars Homestead"` with no `", Tatooine"`), use the place graph's parent
 * links instead — there is nothing in the string to compare.
 */
export function isSegmentAncestor(ancestorName: string, descendantName: string): boolean {
	const ancestor = splitPlaceSegments(ancestorName);
	const descendant = splitPlaceSegments(descendantName);
	if (ancestor.length === 0 || ancestor.length >= descendant.length) return false;

	// The ancestor's segments must equal the descendant's root-side tail.
	const offset = descendant.length - ancestor.length;
	for (let i = 0; i < ancestor.length; i++) {
		if (normalizeSegment(ancestor[i]) !== normalizeSegment(descendant[offset + i])) {
			return false;
		}
	}
	return true;
}

/**
 * Whether two place names denote the same place by their full segment chains
 * (#614): same length and every tier matches, case- and spacing-insensitive.
 * Use this in place of a substring match so `"Munich, Bavaria"` does not resolve
 * to the region `"Bavaria"`.
 */
export function placeNamesEqual(aName: string, bName: string): boolean {
	const a = splitPlaceSegments(aName);
	const b = splitPlaceSegments(bName);
	if (a.length === 0 || a.length !== b.length) return false;
	return sharedLeafSegmentCount(a, b) === a.length;
}

/**
 * Resolve a (possibly hierarchical) place name to the best-matching key from a
 * set of known place names, preferring the most specific match so a
 * hierarchical string like `"Lebanon, Kansas, USA"` resolves to the `"Lebanon"`
 * leaf rather than collapsing onto an ancestor like `"USA"` (#763 — the same
 * substring-collapse class as #614, here in the map's place lookup).
 *
 * Matching, in priority order:
 *  1. exact full-chain equality;
 *  2. a known place exactly equal to one of the search name's segments,
 *     leaf-first, so the city wins over the country;
 *  3. a substring match (the search is a bare leaf and the known place carries
 *     the full chain, or vice versa), preferring the longest — most specific —
 *     match so a hierarchical string never collapses onto a short ancestor.
 *
 * Containment in step 3 keeps a diverging jurisdiction apart: `"Lebanon, Kansas,
 * USA"` does not match a `"Lebanon, Oregon"` note. Returns the matching key
 * exactly as supplied, or `null`.
 */
export function resolvePlaceNameKey(searchName: string, knownNames: Iterable<string>): string | null {
	const searchSegments = splitPlaceSegments(searchName);
	if (searchSegments.length === 0) return null;

	const known = [...knownNames];

	// 1. Exact full-chain match.
	for (const name of known) {
		if (placeNamesEqual(name, searchName)) return name;
	}

	// 2. A known place exactly equal to one of the search segments, leaf-first
	//    (the leaf city resolves before any ancestor tier like the country).
	for (const segment of searchSegments) {
		for (const name of known) {
			if (placeNamesEqual(name, segment)) return name;
		}
	}

	// 3. Substring fallback, longest (most specific) wins.
	const search = normalizeSegment(searchName);
	let best: string | null = null;
	let bestLength = 0;
	for (const name of known) {
		const candidate = normalizeSegment(name);
		if (candidate.length === 0) continue;
		if (candidate.includes(search) || search.includes(candidate)) {
			if (candidate.length > bestLength) {
				best = name;
				bestLength = candidate.length;
			}
		}
	}
	return best;
}
