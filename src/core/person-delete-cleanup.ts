/**
 * Person Delete Cleanup (#442)
 *
 * When a person note is deleted, this module sweeps two parallel sets of
 * fields on referencing person notes:
 *
 * 1. `*_id` fields (e.g. `father_id`, `children_id`) — the canonical cr_id
 *    arrays / scalars. Obsidian doesn't touch these because they're plain
 *    strings, not wikilinks.
 *
 * 2. Wikilink fields (e.g. `father`, `children`) — the human-readable
 *    `[[Person Name]]` arrays / scalars. The original 0.22.7 fix delegated
 *    these to Obsidian's native wikilink cleanup, but Obsidian only rewrites
 *    wikilinks on rename — on delete it leaves them in place as broken
 *    placeholder links. Without this sweep the deleted name lingers in the
 *    properties pane and a subsequent save can re-inject empty-string IDs
 *    into the parallel `*_id` array (#478).
 *
 * Triggered from `metadataCache.on('deleted')` in main.ts; the previous
 * frontmatter cache is read to recover the deleted file's cr_id, and the
 * deleted file's basename is passed through so wikilink targets can be
 * matched.
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
	'step_child_id'
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
 * Wikilink-bearing counterparts to the `*_id` field lists above. Each
 * canonical name here mirrors a name in the corresponding `*_ID_FIELDS`
 * constant with `_id` stripped, so the two sets stay in lockstep as new
 * relationship types are added.
 */
const SCALAR_PERSON_WIKILINK_FIELDS = [
	'father',
	'mother',
	'adoptive_father',
	'adoptive_mother'
] as const;

const ARRAY_PERSON_WIKILINK_FIELDS = [
	'parents',
	'stepfather',
	'stepmother',
	'adoptive_parent',
	'adopted_child',
	'partners',
	'children',
	'step_child'
] as const;

const POLYMORPHIC_PERSON_WIKILINK_FIELDS = ['spouse'] as const;

const INDEXED_SPOUSE_WIKILINK_PATTERN = /^spouse\d+$/;

/**
 * Extract the link target (basename, lowercased) from a wikilink string.
 * Handles plain `[[Name]]`, path-prefixed `[[folder/Name]]`, display-aliased
 * `[[Name|Alias]]`, heading refs `[[Name#Heading]]`, and block refs
 * `[[Name^block-id]]`. Returns null when the value isn't a wikilink.
 */
function extractWikilinkBasename(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const match = value.match(/^\s*\[\[([^\]]+)\]\]\s*$/);
	if (!match) return null;
	let target = match[1].split('|')[0].split('#')[0].split('^')[0];
	const lastSlash = target.lastIndexOf('/');
	if (lastSlash >= 0) target = target.slice(lastSlash + 1);
	if (target.endsWith('.md')) target = target.slice(0, -3);
	return target.trim().toLowerCase();
}

/**
 * Whether a frontmatter value is a wikilink that resolves to the deleted
 * person's basename. Comparison is case-insensitive to match Obsidian's
 * own wikilink resolution.
 */
function wikilinkMatchesBasename(value: unknown, deletedBasename: string): boolean {
	const target = extractWikilinkBasename(value);
	return target !== null && target === deletedBasename.toLowerCase();
}

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
 * remove every reference to a deleted person from the canonical relationship
 * fields. The `*_id` sweep runs whenever `deletedCrId` is provided; the
 * parallel wikilink-field sweep additionally runs when `deletedBasename` is
 * provided (it's optional for backward compatibility with callers that only
 * have the cr_id).
 *
 * Returns the list of mutations (one per affected field) without applying
 * them. Pure function over the frontmatter object so unit tests can fence
 * the rules without mocking the vault.
 */
export function planFrontmatterCleanup(
	fm: Record<string, unknown>,
	deletedCrId: string,
	aliases: Record<string, string> = {},
	deletedBasename?: string
): Array<{ field: string; before: unknown; after: unknown | undefined }> {
	const mutations: Array<{ field: string; before: unknown; after: unknown | undefined }> = [];

	// All relationship-array fields are de-facto polymorphic: YAML serializers
	// (and the plugin's own writer) emit a scalar string when the array has a
	// single element and an array when it has more. Treating these as
	// array-only would miss the very common single-relationship case
	// (e.g. `children_id: "qoq-993-gnz-860"` for an only child). So we accept
	// both shapes everywhere — array-form filters in place, scalar-form clears
	// the key entirely if it matches.
	const removeFromArrayOrScalar = (key: string, value: unknown): void => {
		if (Array.isArray(value)) {
			const filtered = value.filter(v => v !== deletedCrId);
			if (filtered.length !== value.length) {
				mutations.push({ field: key, before: value, after: filtered });
			}
		} else if (typeof value === 'string' && value === deletedCrId) {
			mutations.push({ field: key, before: value, after: undefined });
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
		removeFromArrayOrScalar(key, fm[key]);
	}

	for (const canonical of POLYMORPHIC_PERSON_ID_FIELDS) {
		const key = resolveWriteProperty(canonical, aliases);
		removeFromArrayOrScalar(key, fm[key]);
	}

	// Indexed spouse slots — `spouse1_id`, `spouse2_id`, ... — match by pattern
	// over the live frontmatter so we don't miss user-extended slots.
	for (const key of Object.keys(fm)) {
		if (!INDEXED_SPOUSE_ID_PATTERN.test(key)) continue;
		clearIfMatchScalar(key, fm[key]);
	}

	// Parallel wikilink sweep (#442 follow-up). Obsidian leaves broken
	// `[[deleted]]` links in frontmatter on delete, so we sweep the
	// wikilink-bearing relationship fields the same way we sweep their
	// `*_id` counterparts. Gated on basename so callers that only have
	// the cr_id (legacy / tests) still work.
	if (deletedBasename) {
		// Same scalar-or-array polymorphism as the `_id` sweep above. The
		// plugin's writer serializes single-relationship wikilinks as scalars
		// (`children: "[[Sirkkel Yelar]]"`) rather than single-element arrays,
		// so handling array-only would miss every only-child / only-step-child
		// case.
		const removeWikilinkFromArrayOrScalar = (key: string, value: unknown): void => {
			if (Array.isArray(value)) {
				const filtered = value.filter(v => !wikilinkMatchesBasename(v, deletedBasename));
				if (filtered.length !== value.length) {
					mutations.push({ field: key, before: value, after: filtered });
				}
			} else if (wikilinkMatchesBasename(value, deletedBasename)) {
				mutations.push({ field: key, before: value, after: undefined });
			}
		};

		const clearIfMatchScalarWikilink = (key: string, value: unknown): void => {
			if (wikilinkMatchesBasename(value, deletedBasename)) {
				mutations.push({ field: key, before: value, after: undefined });
			}
		};

		for (const canonical of SCALAR_PERSON_WIKILINK_FIELDS) {
			const key = resolveWriteProperty(canonical, aliases);
			clearIfMatchScalarWikilink(key, fm[key]);
		}

		for (const canonical of ARRAY_PERSON_WIKILINK_FIELDS) {
			const key = resolveWriteProperty(canonical, aliases);
			removeWikilinkFromArrayOrScalar(key, fm[key]);
		}

		for (const canonical of POLYMORPHIC_PERSON_WIKILINK_FIELDS) {
			const key = resolveWriteProperty(canonical, aliases);
			removeWikilinkFromArrayOrScalar(key, fm[key]);
		}

		for (const key of Object.keys(fm)) {
			if (!INDEXED_SPOUSE_WIKILINK_PATTERN.test(key)) continue;
			clearIfMatchScalarWikilink(key, fm[key]);
		}
	}

	return mutations;
}

/**
 * Walk every markdown file in the vault, identify person notes, and remove
 * references to the deleted person from all relevant `*_id` fields and
 * (when `deletedBasename` is provided) parallel wikilink fields. Returns
 * counts and the per-file mutation log.
 *
 * Uses `app.fileManager.processFrontMatter` for safe YAML round-trip on
 * each affected file.
 */
export async function cleanupPersonReferencesAfterDelete(
	app: App,
	deletedCrId: string,
	aliases: Record<string, string> = {},
	deletedBasename?: string
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

		const mutations = planFrontmatterCleanup(fm, deletedCrId, aliases, deletedBasename);
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
