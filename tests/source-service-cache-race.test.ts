/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, Plugin, TFile, makeTFile } from 'obsidian';
import { SourceService } from '../src/sources/services/source-service';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #519 mirror — same metadata-cache race in SourceService.
 * createSource writes a file via vault.create, but Obsidian's metadata
 * cache hasn't indexed it yet. Without the listener fix, loadSourceCache
 * silently skips the new file and stays poisoned.
 */

function makeServiceWithListeners(): {
	service: SourceService;
	app: App;
	plugin: Plugin;
} {
	const app = new App();
	const plugin = new Plugin(app);
	const settings = {
		sourcesFolder: 'Charted Roots/Sources',
		propertyAliases: {},
		customSourceTypes: [],
	} as unknown as CanvasRootsSettings;
	const service = new SourceService(app as unknown as App, settings);
	service.setupVaultListeners(plugin);
	return { service, app, plugin };
}

function seedExistingSource(
	app: App,
	args: { path: string; basename: string; crId: string; title: string }
): TFile {
	const file = makeTFile({ path: args.path, basename: args.basename, extension: 'md' });
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'source',
		cr_id: args.crId,
		title: args.title,
		source_type: 'census',
	});
	return file;
}

describe('SourceService — metadata-cache race after createSource (#519 mirror)', () => {
	it('reloads the cache once metadataCache.on("changed") fires for the new file', async () => {
		const { service, app } = makeServiceWithListeners();

		seedExistingSource(app, {
			path: 'Charted Roots/Sources/1850 Census.md',
			basename: '1850 Census',
			crId: 'src-existing-001',
			title: '1850 Census',
		});

		expect(service.getAllSources()).toHaveLength(1);

		const newFile = await service.createSource({
			title: '1860 Census',
			sourceType: 'census',
		});

		// Race window: cache loaded before metadata indexed → new source missing.
		expect(service.getAllSources()).toHaveLength(1);
		expect(service.getSourceById('src-existing-001')).toBeDefined();

		// Obsidian catches up.
		app.metadataCache._setFrontmatter(newFile, {
			cr_type: 'source',
			cr_id: 'src-new-002',
			title: '1860 Census',
			source_type: 'census',
		});
		app.metadataCache._fire('changed', newFile);

		const allSources = service.getAllSources();
		expect(allSources).toHaveLength(2);
		expect(service.getSourceById('src-new-002')).toBeDefined();
	});

	it('invalidates the cache when a cached source file is deleted', () => {
		const { service, app } = makeServiceWithListeners();
		const file = seedExistingSource(app, {
			path: 'Charted Roots/Sources/Test.md',
			basename: 'Test',
			crId: 'src-delete-test',
			title: 'Test',
		});

		expect(service.getAllSources()).toHaveLength(1);

		app.vault.files.delete(file.path);
		app.vault._fire('delete', file);

		expect(service.getAllSources()).toHaveLength(0);
	});

	it('invalidates the cache when a cached source file is renamed', () => {
		const { service, app } = makeServiceWithListeners();
		const file = seedExistingSource(app, {
			path: 'Charted Roots/Sources/Old Name.md',
			basename: 'Old Name',
			crId: 'src-rename-test',
			title: 'Old Name',
		});

		expect(service.getAllSources()).toHaveLength(1);
		const oldPath = file.path;

		app.vault._rename(file, 'Charted Roots/Sources/New Name.md');
		app.vault._fire('rename', file, oldPath);

		const reloaded = service.getSourceById('src-rename-test');
		expect(reloaded?.filePath).toBe('Charted Roots/Sources/New Name.md');
	});

	it('does not invalidate the cache when a non-source file changes', () => {
		const { service, app } = makeServiceWithListeners();
		seedExistingSource(app, {
			path: 'Charted Roots/Sources/Stable.md',
			basename: 'Stable',
			crId: 'src-stable',
			title: 'Stable',
		});

		expect(service.getAllSources()).toHaveLength(1);

		const eventFile = makeTFile({
			path: 'Charted Roots/Events/Some Event.md',
			basename: 'Some Event',
			extension: 'md',
		});
		app.vault._addFile(eventFile);
		app.metadataCache._setFrontmatter(eventFile, {
			cr_type: 'event',
			cr_id: 'evt-some',
			title: 'Some Event',
		});
		app.metadataCache._fire('changed', eventFile);

		expect(service.getAllSources()).toHaveLength(1);
	});

	it('registers three event listeners on the plugin', () => {
		const { plugin } = makeServiceWithListeners();
		expect(plugin._registeredEventCount()).toBe(3);
	});
});