/**
 * Place-context formatting for timeline entries (#701).
 *
 * The Dynamic Timeline Block renders a leaf place name ("London", "Aldera").
 * When place context is enabled, the renderer resolves the place's ancestors
 * through the place graph (parent_place links) and appends them here so a row
 * reads "Born in London, England" instead of the ambiguous bare leaf.
 */

import { splitPlaceSegments } from '../../utils/place-segments';

/**
 * Qualify a leaf place name with up to `depth` ancestor segments.
 *
 * @param leaf          the leaf place display name (e.g. "London")
 * @param ancestorNames ancestor names ordered nearest-first, as returned by
 *                      `PlaceGraphService.getAncestors` (immediate parent first)
 * @param depth         how many ancestor segments to append (default 1 =
 *                      leaf + immediate parent)
 * @returns the qualified name (e.g. "London, England"); the bare leaf when
 *          there are no usable ancestors
 *
 * Ancestors that duplicate the leaf or an already-included segment
 * (case-insensitive) are skipped, so a place whose name already carries its
 * parent ("London, England") never repeats it. A skipped duplicate does not
 * consume a depth slot — the next distinct ancestor is used instead.
 */
export function qualifyPlaceWithAncestors(
	leaf: string,
	ancestorNames: string[],
	depth = 1
): string {
	const trimmedLeaf = leaf.trim();
	if (!trimmedLeaf || depth < 1) return trimmedLeaf;

	const segments = [trimmedLeaf];
	const seen = new Set(splitPlaceSegments(trimmedLeaf).map(s => s.toLowerCase()));

	for (const raw of ancestorNames) {
		if (segments.length - 1 >= depth) break;
		const name = raw.trim();
		if (!name) continue;
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		segments.push(name);
		seen.add(key);
	}

	return segments.join(', ');
}
