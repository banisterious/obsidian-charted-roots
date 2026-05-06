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
