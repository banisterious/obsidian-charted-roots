/**
 * Person Delete Cleanup (#442)
 *
 * When a person note is deleted, Obsidian's wikilink-rewriting handles the
 * `father:` / `mother:` / `spouse:` / etc. wikilink fields on referencing
 * notes — but it does NOT touch the parallel `*_id` arrays that store
 * cr_ids as plain strings. This module scans all person notes and removes
 * the deleted person's cr_id from those `*_id` fields, restoring symmetry
 * with Obsidian's native wikilink cleanup.
 *
 * Triggered from `metadataCache.on('deleted')` in main.ts; the previous
 * frontmatter cache is read to recover the deleted file's cr_id and to
 * gate cleanup to person notes only.
 */

import type { App, TFile } from 'obsidian';
import type { CachedMetadata } from 'obsidian';

/**
 * Canonical *_id field names on person notes that hold person cr_ids
 * (and therefore need cleanup when a referenced person is deleted).
 *
 * Excludes fields that hold non-person ids (`birth_place_id`,
 * `death_place_id`, `event_id`, `source_id`, etc.).
 */
const SCALAR_PERSON_ID_FIELDS = [
	'father_id',
	'mother_id',
	'adoptive_father_id',
	'adoptive_mother_id'
] as const;

const ARRAY_PERSON_ID_FIELDS = [
	'parents_id',
	'stepfather_id',
	'stepmother_id',
	'adoptive_parent_id',
	'adopted_child_id',
	'partners_id',
	'children_id',
	'stepchild_id'
] as const;

/**
 * Fields that may be either a single cr_id string or an array of cr_ids
 * depending on user/vault format choices (e.g., one-spouse-per-frontmatter
 * vs. multi-spouse arrays).
 */
const POLYMORPHIC_PERSON_ID_FIELDS = ['spouse_id'] as const;

/**
 * Pattern for indexed-spouse `_id` keys (`spouse1_id`, `spouse2_id`, ...).
 * Each holds a single cr_id string.
 */
const INDEXED_SPOUSE_ID_PATTERN = /^spouse\d+_id$/;

/**
 * Resolve a canonical property name to its actual frontmatter key, honoring
 * the user's property aliases.
 */
function resolveWriteProperty(canonical: string, aliases: Record<string, string>): string {
	for (const [userProp, canonicalProp] of Object.entries(aliases)) {
		if (canonicalProp === canonical) return userProp;
	}
	return canonical;
}

/**
 * Decide whether a frontmatter cache identifies a person note. We treat
 * `cr_type === 'person'` as the canonical signal, falling back to the
 * legacy `type` field for vaults that haven't migrated.
 */
export function isPersonFrontmatter(fm: Record<string, unknown> | undefined): boolean {
	if (!fm) return false;
	const crType = fm.cr_type ?? fm.type;
	return crType === 'person';
}

/**
 * Result of a delete-cleanup pass.
 */
export interface DeleteCleanupResult {
	/** Number of files whose frontmatter we modified */
	filesUpdated: number;
	/** Per-file fieldname → new value records, useful for logging/tests */
	changes: Array<{ filePath: string; field: string; before: unknown; after: unknown }>;
}

/**
 * Plan the frontmatter mutations needed on a single note's frontmatter to
 * remove every reference to `deletedCrId` from the canonical *_id fields.
 *
 * Returns the list of mutations (one per affected field) without applying
 * them. Pure function over the frontmatter object so unit tests can fence
 * the rules without mocking the vault.
 */
export function planFrontmatterCleanup(
	fm: Record<string, unknown>,
	deletedCrId: string,
	aliases: Record<string, string> = {}
): Array<{ field: string; before: unknown; after: unknown | undefined }> {
	const mutations: Array<{ field: string; before: unknown; after: unknown | undefined }> = [];

	const removeFromArray = (key: string, value: unknown): void => {
		if (!Array.isArray(value)) return;
		const filtered = value.filter(v => v !== deletedCrId);
		if (filtered.length !== value.length) {
			mutations.push({ field: key, before: value, after: filtered });
		}
	};

	const clearIfMatchScalar = (key: string, value: unknown): void => {
		if (typeof value !== 'string') return;
		if (value === deletedCrId) {
			// `undefined` after means "delete the key" when applied via processFrontMatter
			mutations.push({ field: key, before: value, after: undefined });
		}
	};

	for (const canonical of SCALAR_PERSON_ID_FIELDS) {
		const key = resolveWriteProperty(canonical, aliases);
		clearIfMatchScalar(key, fm[key]);
	}

	for (const canonical of ARRAY_PERSON_ID_FIELDS) {
		const key = resolveWriteProperty(canonical, aliases);
		removeFromArray(key, fm[key]);
	}

	for (const canonical of POLYMORPHIC_PERSON_ID_FIELDS) {
		const key = resolveWriteProperty(canonical, aliases);
		const value = fm[key];
		if (Array.isArray(value)) {
			removeFromArray(key, value);
		} else {
			clearIfMatchScalar(key, value);
		}
	}

	// Indexed spouse slots — `spouse1_id`, `spouse2_id`, ... — match by pattern
	// over the live frontmatter so we don't miss user-extended slots.
	for (const key of Object.keys(fm)) {
		if (!INDEXED_SPOUSE_ID_PATTERN.test(key)) continue;
		clearIfMatchScalar(key, fm[key]);
	}

	return mutations;
}

/**
 * Walk every markdown file in the vault, identify person notes, and remove
 * `deletedCrId` from all relevant `*_id` fields. Returns counts and the
 * per-file mutation log.
 *
 * Uses `app.fileManager.processFrontMatter` for safe YAML round-trip.
 */
export async function cleanupPersonReferencesAfterDelete(
	app: App,
	deletedCrId: string,
	aliases: Record<string, string> = {}
): Promise<DeleteCleanupResult> {
	const result: DeleteCleanupResult = { filesUpdated: 0, changes: [] };

	if (!deletedCrId) return result;

	const files: TFile[] = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!isPersonFrontmatter(cache?.frontmatter as Record<string, unknown> | undefined)) {
			continue;
		}

		const fm = cache?.frontmatter as Record<string, unknown> | undefined;
		if (!fm) continue;

		const mutations = planFrontmatterCleanup(fm, deletedCrId, aliases);
		if (mutations.length === 0) continue;

		await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			for (const mutation of mutations) {
				if (mutation.after === undefined) {
					delete frontmatter[mutation.field];
				} else {
					frontmatter[mutation.field] = mutation.after;
				}
			}
		});

		result.filesUpdated += 1;
		for (const mutation of mutations) {
			result.changes.push({
				filePath: file.path,
				field: mutation.field,
				before: mutation.before,
				after: mutation.after
			});
		}
	}

	return result;
}

/**
 * Recover the deleted file's cr_id from a metadataCache `deleted` callback's
 * `prevCache` argument. Returns null when the file wasn't a person note or
 * the cache was unavailable (best-effort per Obsidian's API guarantees).
 */
export function getDeletedPersonCrId(prevCache: CachedMetadata | null): string | null {
	const fm = prevCache?.frontmatter as Record<string, unknown> | undefined;
	if (!isPersonFrontmatter(fm)) return null;
	const crId = fm?.cr_id;
	return typeof crId === 'string' && crId ? crId : null;
}
