/**
 * Charted Roots cr_id resolver (#559).
 *
 * Resolve a Charted Roots note from a `cr_id` value. Filters candidates by
 * the caller's expected `cr_type` so a duplicate file outside the plugin's
 * folder structure — recovered via Obsidian's File Recovery, copied for
 * troubleshooting, archived elsewhere — can't shadow the canonical CR
 * note by sharing its cr_id.
 *
 * Three near-identical `findFileByCrId` helpers (in `person-note-writer.ts`,
 * `organization-service.ts`, `place-note-writer.ts`) previously did this
 * resolution without a `cr_type` filter, returning whichever file happened
 * to appear first in `app.vault.getMarkdownFiles()`. When the first match
 * was a non-CR duplicate, the writer would emit a path-aliased wikilink
 * pointing at the wrong target — silently redirecting entries that then
 * appeared "missing" from the Family block and modal renderers (which
 * filter by `cr_type`).
 *
 * This consolidates the three copies into one helper that takes the
 * expected `cr_type` as a parameter — each caller already knows which
 * entity type it's writing.
 */

import type { App, TFile } from 'obsidian';
import type { NoteType } from './note-type-detection';

/**
 * Find a Charted Roots note by its `cr_id`, filtered to the expected
 * `cr_type`. Returns the first markdown file whose frontmatter carries
 * both the matching `cr_id` and the expected `cr_type`, or `null` if no
 * such file exists in the vault.
 *
 * Non-CR files (no `cr_type`) and CR files of the wrong type are skipped.
 * Order across candidates matching both fields is `getMarkdownFiles()`
 * order — for a well-formed vault this is unique.
 */
export function findCrNoteByCrId(
	app: App,
	crId: string,
	expectedCrType: NoteType
): TFile | null {
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm) continue;
		if (fm.cr_id !== crId) continue;
		if (fm.cr_type !== expectedCrType) continue;
		return file;
	}
	return null;
}
