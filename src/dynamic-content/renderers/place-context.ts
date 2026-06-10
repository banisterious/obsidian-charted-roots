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

/** Resolved place-context settings for one timeline block. */
export interface PlaceContextResolution {
	/** Whether place context applies at all. */
	enabled: boolean;
	/**
	 * How many ancestor levels to append. The sentinel `0` means "full" — all
	 * the way up to the root place (resolved against the actual ancestor count
	 * at render time).
	 */
	depth: number;
}

/**
 * Resolve whether place context applies, and to what depth, from a per-block
 * `place_context` override and the global setting (#705).
 *
 * The per-block override wins when present and accepts several forms:
 *   - `true`            → on, at the global depth
 *   - `false`           → off
 *   - a number `N >= 1` → on, depth N
 *   - `0` or `"full"`   → on, full hierarchy (sentinel depth 0)
 *   - strings: `"off"`/`"none"`/`"no"`/`""` disable; `"true"`/`"on"`/`"yes"`
 *     enable at the global depth; `"all"`/`"full"` enable full; a numeric
 *     string parses as N
 *
 * With no override the global enabled flag + global depth apply. Negative or
 * non-finite depths clamp to `0` (full); fractional depths floor.
 */
export function resolvePlaceContext(
	override: string | number | boolean | undefined,
	globalEnabled: boolean,
	globalDepth: number
): PlaceContextResolution {
	const baseDepth = normalizeDepth(globalDepth);

	if (override === undefined || override === null) {
		return { enabled: globalEnabled, depth: baseDepth };
	}
	if (typeof override === 'boolean') {
		// depth is irrelevant when disabled; report 0 uniformly with the other
		// off paths.
		return { enabled: override, depth: override ? baseDepth : 0 };
	}
	if (typeof override === 'number') {
		return { enabled: true, depth: normalizeDepth(override) };
	}

	const token = override.trim().toLowerCase();
	if (token === 'full' || token === 'all') return { enabled: true, depth: 0 };
	if (token === 'true' || token === 'on' || token === 'yes') return { enabled: true, depth: baseDepth };
	if (token === '' || token === 'false' || token === 'off' || token === 'no' || token === 'none') {
		return { enabled: false, depth: 0 };
	}
	const parsed = Number(token);
	if (Number.isFinite(parsed)) return { enabled: true, depth: normalizeDepth(parsed) };

	// Unrecognized string → fall back to the global setting.
	return { enabled: globalEnabled, depth: baseDepth };
}

/** Floor a depth to an integer; clamp negatives/non-finite to 0 (= full). A
 * non-finite global default is treated as 1 (the historical leaf+parent depth). */
function normalizeDepth(depth: number): number {
	if (!Number.isFinite(depth)) return 1;
	const floored = Math.floor(depth);
	return floored < 0 ? 0 : floored;
}
