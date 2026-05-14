/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import type { App } from 'obsidian';

/**
 * Resolve a map's `universe:` field value into the comparison key the map
 * filter should use against entity `universe:` fields.
 *
 * - When the value matches a universe note's `cr_id`, returns that universe
 *   note's **basename**. The rename cascade writes the basename to every
 *   referencing entity, so the filter must equal the basename to find them.
 *   Returning the universe note's `name` instead silently mismatched whenever
 *   the typed name had characters stripped during file rename — e.g.
 *   `"The Dying Earth (Vance)"` resolved to a name with parens while entities
 *   carried the basename `"The Dying Earth Vance"`, hiding every marker
 *   (#503).
 * - When the value is null, returns null (no universe filter).
 * - Otherwise (already a name or basename), passes through unchanged.
 */
export function resolveUniverseFilterValue(app: App, universe: string | null): string | null {
	if (!universe) return null;

	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm) continue;
		const crType = fm.cr_type || fm.type;
		if (crType === 'universe' && fm.cr_id === universe) {
			return file.basename;
		}
	}

	return universe;
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment -- Match scope of file-level disable at top. */
