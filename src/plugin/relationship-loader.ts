/**
 * Relationship loader — pure functions that extract relationship data from a
 * person note's frontmatter into the shape the Edit Person modal expects.
 *
 * Extracted from the Edit Person modal's load path so the non-trivial
 * wikilink-to-crId resolution can be unit-tested in isolation (#410). No
 * dependency on Obsidian runtime APIs; the caller supplies a `PersonLookupPool`
 * with the minimum surface the resolver needs.
 *
 * Covered behaviors:
 * - Indexed spouse format (`spouse1`..`spouseN`) with per-entry fallback (#204, #403).
 * - Legacy array format for `spouse` / `children` / `parents` with per-entry
 *   basename-aware fallback and preservation of unresolved wikilinks (#410).
 * - Singleton `father` / `mother` / `adoptive_father` / `adoptive_mother` with
 *   wikilink fallback when the `*_id` key is missing (#403).
 */

import type { SpouseMetadata } from '../core/person-note-writer';

/**
 * Minimum shape required from the family graph for name-to-crId resolution.
 * The real `FamilyGraphService` exposes a richer object per person, but this
 * module only needs a stable-name lookup with access to the backing file's
 * basename.
 */
export interface PersonLookupPool {
	getAllPeople(): Array<{
		crId: string;
		name: string;
		file: { basename: string };
	}>;
}

/**
 * Result of loading all relationship fields from a person's frontmatter.
 * Arrays are kept aligned (names[i] pairs with ids[i]); unresolved entries
 * in the array fields carry an empty string in their id slot so the
 * wikilink survives the round trip (#410).
 */
export interface LoadedRelationships {
	spouseNames: string[];
	spouseIds: string[];
	spouseMetadata: SpouseMetadata[];
	hasIndexedSpouses: boolean;
	childNames: string[];
	childIds: string[];
	parentNames: string[];
	parentIds: string[];
	fatherName: string | undefined;
	fatherId: string | undefined;
	motherName: string | undefined;
	motherId: string | undefined;
	adoptiveFatherName: string | undefined;
	adoptiveFatherId: string | undefined;
	adoptiveMotherName: string | undefined;
	adoptiveMotherId: string | undefined;
}

/**
 * Extract a display name from a wikilink value. Accepts `[[Name]]`,
 * `"[[Name]]"`, or a bare string. Returns `undefined` for null/undefined/empty.
 */
export function extractName(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	const str = typeof value === 'string' ? value : String(value);
	if (!str) return undefined;
	const match = str.match(/\[\[([^\]]+)\]\]/);
	return match ? match[1] : str;
}

/**
 * Resolve a wikilink stem to a person's crId via the lookup pool. Matches
 * against both the person's `name` frontmatter field and the note's
 * basename, since a wikilink target is a basename and may differ from
 * the stored `name` (#410). Returns `undefined` for no match, or when
 * more than one person matches (ambiguous matches are reported via the
 * optional `onAmbiguous` callback so the caller can log).
 */
export function resolveNameToCrId(
	name: string,
	pool: PersonLookupPool,
	onAmbiguous?: (name: string, matchCount: number) => void
): string | undefined {
	const stripped = name.split('|')[0].trim();
	if (!stripped) return undefined;
	const matches = pool.getAllPeople().filter(p =>
		p.name === stripped || p.file.basename === stripped
	);
	if (matches.length === 1) return matches[0].crId;
	if (matches.length > 1) {
		onAmbiguous?.(stripped, matches.length);
	}
	return undefined;
}

/**
 * Inverse of `resolveNameToCrId`: resolve a crId back to a display name via
 * the lookup pool. Used by the IDs-only fallback path in `loadAlignedArray`
 * (#415) when frontmatter carries `*_id` arrays without the paired wikilink
 * array. Returns `undefined` if no person has that crId; cr_id uniqueness
 * means no ambiguity case.
 */
export function resolveCrIdToName(
	crId: string,
	pool: PersonLookupPool
): string | undefined {
	const stripped = crId.trim();
	if (!stripped) return undefined;
	const match = pool.getAllPeople().find(p => p.crId === stripped);
	return match?.name;
}

/**
 * Load all relationship fields from a person's frontmatter.
 */
export function loadRelationships(
	fm: Record<string, unknown>,
	pool: PersonLookupPool,
	onAmbiguous?: (name: string, matchCount: number) => void
): LoadedRelationships {
	const resolve = (name: string) => resolveNameToCrId(name, pool, onAmbiguous);
	const resolveId = (crId: string) => resolveCrIdToName(crId, pool);

	// Spouses — indexed format (spouse1, spouse1_id, spouse1_marriage_date, ...)
	const spouseNames: string[] = [];
	const spouseIds: string[] = [];
	const spouseMetadata: SpouseMetadata[] = [];
	let hasIndexedSpouses = false;
	for (let i = 1; i <= 10; i++) {
		const spouseLink = fm[`spouse${i}`];
		const spouseId = fm[`spouse${i}_id`];
		if (spouseLink || spouseId) {
			hasIndexedSpouses = true;
			const name = extractName(spouseLink);
			let crId = spouseId ? String(spouseId) : '';

			// Fallback: resolve wikilink name to crId when spouseN_id missing (#403)
			if (!crId && name) {
				crId = resolve(name) || '';
			}

			if (name) spouseNames.push(name);
			if (crId) spouseIds.push(crId);

			spouseMetadata.push({
				crId: crId || '',
				name: name || crId || `Spouse ${i}`,
				marriageDate: fm[`spouse${i}_marriage_date`] as string | undefined,
				marriageLocation: fm[`spouse${i}_marriage_location`] as string | undefined,
				marriageStatus: fm[`spouse${i}_marriage_status`] as SpouseMetadata['marriageStatus'],
				divorceDate: fm[`spouse${i}_divorce_date`] as string | undefined
			});
		}
	}

	// Spouses — legacy array format (fallback when no indexed spouses)
	if (!hasIndexedSpouses) {
		loadAlignedArray(fm.spouse, fm.spouse_id, resolve, resolveId, spouseNames, spouseIds);
	}

	// Children
	const childNames: string[] = [];
	const childIds: string[] = [];
	loadAlignedArray(fm.children, fm.children_id, resolve, resolveId, childNames, childIds);

	// Gender-neutral parents
	const parentNames: string[] = [];
	const parentIds: string[] = [];
	loadAlignedArray(fm.parents, fm.parents_id, resolve, resolveId, parentNames, parentIds);

	// Singleton parent / adoptive-parent fields with wikilink fallback (#403)
	const fatherName = extractName(fm.father);
	const fatherId = (fm.father_id as string | undefined)
		?? (fatherName ? resolve(fatherName) : undefined);
	const motherName = extractName(fm.mother);
	const motherId = (fm.mother_id as string | undefined)
		?? (motherName ? resolve(motherName) : undefined);
	const adoptiveFatherName = extractName(fm.adoptive_father);
	const adoptiveFatherId = (fm.adoptive_father_id as string | undefined)
		?? (adoptiveFatherName ? resolve(adoptiveFatherName) : undefined);
	const adoptiveMotherName = extractName(fm.adoptive_mother);
	const adoptiveMotherId = (fm.adoptive_mother_id as string | undefined)
		?? (adoptiveMotherName ? resolve(adoptiveMotherName) : undefined);

	return {
		spouseNames,
		spouseIds,
		spouseMetadata,
		hasIndexedSpouses,
		childNames,
		childIds,
		parentNames,
		parentIds,
		fatherName,
		fatherId,
		motherName,
		motherId,
		adoptiveFatherName,
		adoptiveFatherId,
		adoptiveMotherName,
		adoptiveMotherId
	};
}

/**
 * Walk a pair of parallel wikilink/id arrays from frontmatter, producing
 * aligned output arrays. For each wikilink: use the same-index `_id` entry
 * if present, otherwise fall back to name-based resolution. Unresolved
 * entries are preserved with an empty id so the wikilink survives the
 * round trip (#410).
 *
 * When the wikilink array is entirely absent but the id array has entries,
 * the id array drives the walk instead and names are resolved from the
 * lookup pool (#415). Unresolved ids are preserved with an empty name so
 * the id survives the round trip. This is the inverse of #410's fallback.
 *
 * Mutates `outNames` and `outIds` in place for simpler call sites.
 */
function loadAlignedArray(
	rawLinks: unknown,
	rawIds: unknown,
	resolve: (name: string) => string | undefined,
	resolveId: (crId: string) => string | undefined,
	outNames: string[],
	outIds: string[]
): void {
	// Explicitly-present `[]` is treated as an intentional empty list and
	// skips the IDs-only fallback. Only null/undefined (field absent, the
	// shape #415 bugs on) drops us into the inverse path.
	const linkArrayPresent = rawLinks !== undefined && rawLinks !== null;
	const linkArr = linkArrayPresent
		? (Array.isArray(rawLinks) ? rawLinks : [rawLinks])
		: [];
	const idArr = rawIds
		? (Array.isArray(rawIds) ? rawIds : [rawIds])
		: [];
	if (linkArrayPresent) {
		for (let i = 0; i < linkArr.length; i++) {
			const name = extractName(linkArr[i]);
			if (!name) continue;
			const directId = idArr[i] ? String(idArr[i]) : '';
			const id = directId || resolve(name) || '';
			outNames.push(name);
			outIds.push(id);
		}
		return;
	}
	// IDs-only fallback (#415): wikilink array absent but ids present. Resolve
	// each id to a name via the graph; on miss (orphan id pointing to a
	// deleted person note), fall back to the id string itself as a visible
	// placeholder so the save path emits `[[id-str]]` rather than an empty
	// `[[]]` wikilink — preserves the id round-trip for broken-data cases.
	for (let i = 0; i < idArr.length; i++) {
		const id = idArr[i] ? String(idArr[i]) : '';
		if (!id) continue;
		const name = resolveId(id) || id;
		outNames.push(name);
		outIds.push(id);
	}
}
