/**
 * Pure helpers for writing dual-storage relationship arrays (a wikilink
 * field plus its `*_id` companion) into frontmatter. Extracted from
 * `person-note-writer.ts` so the align-and-prune logic can be unit-tested
 * without pulling in the Obsidian runtime (#410).
 *
 * Covers the shape the Edit Person modal's save path produces: aligned
 * `names[]` / `ids[]` pairs where unresolved entries carry an empty-string
 * id slot, which must be preserved in the output unless every slot is
 * empty (in which case the `*_id` key is pruned entirely).
 */

/**
 * A patch describing what to emit for a single dual-storage relationship
 * field. `null` signals "delete the key" so callers can distinguish
 * "write this value" from "remove the key entirely" cleanly.
 */
export interface RelationshipArrayPatch {
	/** Value to write at the wikilink key, or `null` to delete the key. */
	name: string | string[] | null;
	/** Value to write at the `*_id` key, or `null` to delete the key. */
	id: string | string[] | null;
	/** True when input lengths were mismatched and the fallback ran. */
	mismatched: boolean;
}

/**
 * Compute the emission patch for an aligned pair of wikilink/id arrays.
 *
 * Preconditions: `ids.length > 0`. Callers handle the empty-input case
 * separately (typically by deleting both keys to fully clear the field).
 *
 * Three output shapes:
 *
 * - **Aligned, some resolved ids:** emit both `name` and `id`. Empty-
 *   string slots in `ids` are preserved in the output array so the
 *   per-index pairing with `names` survives the round trip.
 * - **Aligned, every id empty:** emit `name`, signal `id: null` (delete).
 *   Keeps frontmatter clean when no IDs are resolvable yet; the next
 *   load retries resolution per-entry.
 * - **Mismatched lengths:** safety fallback — signal `name: null` to drop
 *   potentially corrupt name↔id pairings, emit `id` only. Caller should
 *   log this (the `mismatched` flag is set).
 *
 * Scalar-vs-array encoding: length === 1 produces a scalar value;
 * length > 1 produces an array. Matches the legacy frontmatter shape.
 */
export function computeRelationshipArrayPatch(
	names: string[] | undefined,
	ids: string[],
	wikilinker: (name: string, id?: string) => string
): RelationshipArrayPatch {
	if (names && names.length === ids.length) {
		const nameValue = names.length === 1
			? wikilinker(names[0], ids[0])
			: names.map((name, i) => wikilinker(name, ids[i]));

		const hasAnyResolvedId = ids.some(id => id);
		const idValue = hasAnyResolvedId
			? (ids.length === 1 ? ids[0] : ids)
			: null;

		return { name: nameValue, id: idValue, mismatched: false };
	}

	// Mismatched lengths: drop names to avoid corrupt pairings, emit ids only.
	return {
		name: null,
		id: ids.length === 1 ? ids[0] : ids,
		mismatched: true
	};
}

/**
 * Apply a patch to a mutable frontmatter object. `null` values delete
 * their keys; everything else is assigned. Convenience for writer code
 * that wants a one-call application.
 */
export function applyRelationshipArrayPatch(
	frontmatter: Record<string, unknown>,
	nameKey: string,
	idKey: string,
	patch: RelationshipArrayPatch
): void {
	if (patch.name === null) delete frontmatter[nameKey];
	else frontmatter[nameKey] = patch.name;

	if (patch.id === null) delete frontmatter[idKey];
	else frontmatter[idKey] = patch.id;
}
