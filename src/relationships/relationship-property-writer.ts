/**
 * Pure helpers for writing flat-property relationship entries
 * (e.g. `twin` + `twin_id`) into person-note frontmatter.
 *
 * Extracted from `AddRelationshipModal` so the add/skip/duplicate logic
 * can be exercised by unit tests and reused for reciprocal writes on
 * symmetric custom relationships (#419).
 */

/**
 * Coerce a frontmatter value into a string[]. Matches the modal's
 * historical semantics: scalar → single-element array, missing → empty,
 * non-string array entries are JSON-stringified.
 */
export function normalizeToArray(value: unknown): string[] {
	if (value === null || value === undefined || value === '') return [];
	if (Array.isArray(value)) {
		return value.map(v => typeof v === 'string' ? v : JSON.stringify(v));
	}
	return [typeof value === 'string' ? value : JSON.stringify(value)];
}

/**
 * Result of an `addFlatRelationship` call.
 * - `added`    — entry was appended and frontmatter was mutated.
 * - `duplicate` — crId was already present; frontmatter is unchanged.
 */
export type AddFlatRelationshipResult = 'added' | 'duplicate';

/**
 * Append a wikilink / crId pair to `frontmatter[typeId]` and
 * `frontmatter[`${typeId}_id`]`, preserving the scalar-vs-array encoding
 * convention (single entries write as scalars, multiple as arrays).
 *
 * When `options.notes` is provided, also writes to a parallel
 * `frontmatter[`${typeId}_notes`]` array (#530), index-aligned with the
 * targets array. This matches the existing `<type>_from` / `<type>_to`
 * convention already read by `parseFlatRelationships`. Empty/missing slots
 * are padded with empty strings to keep indices aligned.
 *
 * Mutates `frontmatter` in place when the entry is new.
 * Returns `'duplicate'` without mutating when `crId` is already present.
 */
export function addFlatRelationship(
	frontmatter: Record<string, unknown>,
	typeId: string,
	wikilink: string,
	crId: string,
	options: { notes?: string } = {}
): AddFlatRelationshipResult {
	const idKey = `${typeId}_id`;
	const notesKey = `${typeId}_notes`;
	const existingTargets = normalizeToArray(frontmatter[typeId]);
	const existingIds = normalizeToArray(frontmatter[idKey]);

	if (existingIds.includes(crId)) {
		return 'duplicate';
	}

	existingTargets.push(wikilink);
	existingIds.push(crId);

	frontmatter[typeId] = existingTargets.length === 1 ? existingTargets[0] : existingTargets;
	frontmatter[idKey] = existingIds.length === 1 ? existingIds[0] : existingIds;

	// Notes are optional + parallel-indexed. Only touch the notes key when
	// a new note is provided OR the key already exists (so we keep alignment
	// for any subsequent reads). Pad with empty strings for prior targets
	// that had no note.
	const newNote = options.notes?.trim() ?? '';
	const existingNotes = normalizeToArray(frontmatter[notesKey]);
	if (newNote || existingNotes.length > 0) {
		// Pad existing notes up to (existingTargets.length - 1) slots with empty
		// strings to maintain index alignment, then push the new note.
		while (existingNotes.length < existingTargets.length - 1) {
			existingNotes.push('');
		}
		existingNotes.push(newNote);
		frontmatter[notesKey] = existingNotes.length === 1 ? existingNotes[0] : existingNotes;
	}

	return 'added';
}

/**
 * Parallel companion-array suffixes for a flat custom relationship, kept
 * index-aligned with the `${typeId}` targets array. Mirrors the set read by
 * `parseFlatRelationships`.
 */
const FLAT_RELATIONSHIP_COMPANION_SUFFIXES = ['_id', '_from', '_to', '_notes'] as const;

/**
 * Result of a `removeFlatRelationship` call.
 * - `removed`   — at least one matching entry was spliced out.
 * - `not-found` — no entry referenced `crId`; frontmatter is unchanged.
 */
export type RemoveFlatRelationshipResult = 'removed' | 'not-found';

/**
 * Remove every flat-relationship entry whose `${typeId}_id` equals `crId`,
 * splicing the matching index out of the targets array and each parallel
 * companion array (`_id`, `_from`, `_to`, `_notes`) so they stay aligned.
 * Re-encodes each array with the scalar-vs-array convention, deleting the key
 * entirely when it empties.
 *
 * Used to strip the orphaned reciprocal from a target note when a symmetric
 * custom relationship is deleted from the other side (#675). Idempotent:
 * returns `'not-found'` without mutating when no entry references `crId`, so a
 * reciprocal-cleanup cascade terminates after one hop.
 *
 * Mutates `frontmatter` in place when an entry is removed.
 */
export function removeFlatRelationship(
	frontmatter: Record<string, unknown>,
	typeId: string,
	crId: string
): RemoveFlatRelationshipResult {
	const ids = normalizeToArray(frontmatter[`${typeId}_id`]);
	const indices: number[] = [];
	ids.forEach((id, i) => {
		if (id === crId) indices.push(i);
	});
	if (indices.length === 0) {
		return 'not-found';
	}

	const keys = [typeId, ...FLAT_RELATIONSHIP_COMPANION_SUFFIXES.map(suffix => `${typeId}${suffix}`)];
	for (const key of keys) {
		if (frontmatter[key] === undefined) continue;
		const arr = normalizeToArray(frontmatter[key]);
		// Splice from the highest index down so earlier indices stay valid.
		for (let j = indices.length - 1; j >= 0; j--) {
			const idx = indices[j];
			if (idx < arr.length) arr.splice(idx, 1);
		}
		if (arr.length === 0) {
			delete frontmatter[key];
		} else {
			frontmatter[key] = arr.length === 1 ? arr[0] : arr;
		}
	}

	return 'removed';
}

/**
 * A symmetric custom-relationship reciprocal that should be stripped from a
 * target note because its source-side entry was deleted (#675).
 */
export interface CustomReciprocalRemoval {
	typeId: string;
	/** The target's wikilink as last snapshotted (for fast resolution). */
	targetLink: string | undefined;
	/** The target's cr_id — both resolves the note and matches the reciprocal. */
	targetCrId: string;
}

/**
 * Compare a previous snapshot of symmetric custom relationships against the
 * note's current frontmatter and return the reciprocals to remove — one per
 * (typeId, target) entry that was present before and is gone now. Only types
 * still in `symmetricTypeIds` are considered (a type whose definition changed
 * away from symmetric is left alone). Pure: the caller performs the IO. (#675)
 */
export function computeCustomReciprocalRemovals(
	previousCustom: Record<string, { targets: string[]; ids: string[] }>,
	currentFrontmatter: Record<string, unknown>,
	symmetricTypeIds: ReadonlySet<string>
): CustomReciprocalRemoval[] {
	const removals: CustomReciprocalRemoval[] = [];
	for (const [typeId, previous] of Object.entries(previousCustom)) {
		if (!symmetricTypeIds.has(typeId)) continue;
		const currentIds = normalizeToArray(currentFrontmatter[`${typeId}_id`]);
		for (let i = 0; i < previous.ids.length; i++) {
			const targetCrId = previous.ids[i];
			if (!targetCrId) continue;
			// Still listed on this note → not a deletion.
			if (currentIds.includes(targetCrId)) continue;
			removals.push({ typeId, targetLink: previous.targets[i], targetCrId });
		}
	}
	return removals;
}
