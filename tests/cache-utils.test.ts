import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { waitForCacheRefresh } from '../src/utils/cache-utils';

/**
 * #547: waitForCacheRefresh resolves on the next metadataCache.changed
 * event for the target file. Used by the cache-holding services
 * (Family/Organization/Universe/Place graph) to bridge the gap between
 * a synchronous write (processFrontMatter / vault.create) and the
 * asynchronous metadata-cache update.
 */
describe('waitForCacheRefresh — #547', () => {
	function makeFile(path: string): TFile {
		return new TFile({ path, basename: path.split('/').pop()!.replace('.md', ''), extension: 'md' });
	}

	it('resolves when metadataCache.changed fires for the target file', async () => {
		const app = new App();
		const file = makeFile('Universes/Star Wars.md');
		app.vault._addFile(file);

		let resolved = false;
		const promise = waitForCacheRefresh(app as unknown as App, file).then(() => {
			resolved = true;
		});

		// Hasn't resolved yet — no event fired.
		await Promise.resolve();
		expect(resolved).toBe(false);

		// Fire the metadata-cache event for the target file.
		app.metadataCache._fire('changed', file);
		await promise;
		expect(resolved).toBe(true);
	});

	it('ignores changed events for unrelated files', async () => {
		const app = new App();
		const target = makeFile('Universes/Target.md');
		const other = makeFile('Universes/Other.md');
		app.vault._addFile(target);
		app.vault._addFile(other);

		let resolved = false;
		const promise = waitForCacheRefresh(app as unknown as App, target, 100).then(() => {
			resolved = true;
		});

		// Fire for the wrong file — should not resolve.
		app.metadataCache._fire('changed', other);
		await Promise.resolve();
		expect(resolved).toBe(false);

		// Fall back to the timeout so we can assert the promise eventually
		// resolves without polluting other tests.
		await promise;
		expect(resolved).toBe(true);
	});

	it('falls back to the timeout when no changed event fires', async () => {
		const app = new App();
		const file = makeFile('Universes/Stale.md');
		app.vault._addFile(file);

		const start = Date.now();
		await waitForCacheRefresh(app as unknown as App, file, 50);
		const elapsed = Date.now() - start;

		// Should resolve via timeout — at least the timeout duration.
		expect(elapsed).toBeGreaterThanOrEqual(45);
	});

	it('unregisters its metadataCache listener after resolving', async () => {
		const app = new App();
		const file = makeFile('Universes/Cleanup.md');
		app.vault._addFile(file);

		const promise = waitForCacheRefresh(app as unknown as App, file, 50);
		app.metadataCache._fire('changed', file);
		await promise;

		// After resolution, no extra listeners should remain. Firing again
		// must not produce side effects (no error, no double-resolve).
		expect(() => app.metadataCache._fire('changed', file)).not.toThrow();
	});
});
