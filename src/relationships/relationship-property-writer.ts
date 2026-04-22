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
 * Mutates `frontmatter` in place when the entry is new.
 * Returns `'duplicate'` without mutating when `crId` is already present.
 */
export function addFlatRelationship(
	frontmatter: Record<string, unknown>,
	typeId: string,
	wikilink: string,
	crId: string
): AddFlatRelationshipResult {
	const idKey = `${typeId}_id`;
	const existingTargets = normalizeToArray(frontmatter[typeId]);
	const existingIds = normalizeToArray(frontmatter[idKey]);

	if (existingIds.includes(crId)) {
		return 'duplicate';
	}

	existingTargets.push(wikilink);
	existingIds.push(crId);

	frontmatter[typeId] = existingTargets.length === 1 ? existingTargets[0] : existingTargets;
	frontmatter[idKey] = existingIds.length === 1 ? existingIds[0] : existingIds;

	return 'added';
}
