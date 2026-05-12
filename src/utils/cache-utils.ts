/**
 * Cache utilities for working with Obsidian's metadata cache.
 */

import { App, TFile } from 'obsidian';

/**
 * Wait for the metadata cache to reflect a just-written change to a
 * specific file. `processFrontMatter` (and `vault.create` / `vault.modify`)
 * writes the file synchronously, but the metadata cache update fires
 * asynchronously via the file watcher event — so reading
 * `getFileCache(file)` immediately after the write returns can hand back
 * stale data. Subsequent code paths that re-read the cache then act on
 * the pre-write state, producing the "trailing one update behind"
 * pattern first observed in the #541 follow-up.
 *
 * Listens for the next `metadataCache.changed` event for the target
 * file, with a timeout fallback so the caller proceeds if the event
 * doesn't fire within the window (e.g., when the cache was already up
 * to date by the time we registered the listener, or when the write
 * touched only file content the metadata cache doesn't track).
 */
export function waitForCacheRefresh(app: App, file: TFile, timeoutMs = 500): Promise<void> {
	return new Promise<void>(resolve => {
		let settled = false;
		const finish = (): void => {
			if (settled) return;
			settled = true;
			app.metadataCache.offref(ref);
			activeWindow.clearTimeout(timeoutId);
			resolve();
		};
		const ref = app.metadataCache.on('changed', (changedFile) => {
			if (changedFile.path === file.path) {
				finish();
			}
		});
		const timeoutId = activeWindow.setTimeout(finish, timeoutMs);
	});
}
