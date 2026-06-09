/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { FamilyGraphService } from '../src/core/family-graph';
import { PlaceGraphService } from '../src/core/place-graph';
import { OrganizationService } from '../src/organizations/services/organization-service';
import { UniverseService } from '../src/universes/services/universe-service';

/**
 * #547 regression: each cache-holding service had a write→reload race
 * where reloadCache ran before Obsidian's metadata cache caught up,
 * silently dropping new entries. The fix: reloadCache(modifiedFiles)
 * awaits each file's metadataCache.changed event before rebuilding.
 *
 * These tests model the production race: a file exists in the vault
 * but its metadata isn't yet indexed. reloadCache(modifiedFiles)
 * should NOT settle until a metadataCache.changed event fires for
 * each modified file. The pre-fix synchronous reloadCache would
 * complete immediately and the new entry would be missing.
 */

function makeFile(path: string): TFile {
	return makeTFile({
		path,
		basename: path.split('/').pop()!.replace(/\.md$/, ''),
		extension: 'md'
	});
}

function makePlugin(app: App): unknown {
	return {
		app,
		settings: {
			noteTypeDetection: { mode: 'cr_type' },
			propertyAliases: {},
			customOrganizationTypes: [],
			organizationTypeCustomizations: {},
			organizationsFolder: 'Charted Roots/Organizations',
			universesFolder: 'Charted Roots/Universes',
		},
	};
}

describe('FamilyGraphService.reloadCache — cache-race (#547)', () => {
	it('awaits metadataCache.changed before rebuilding when modifiedFiles is provided', async () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		const file = makeFile('People/Han Solo.md');
		app.vault._addFile(file);
		// File exists but metadata isn't indexed yet (matches Obsidian's
		// async catch-up after vault.create / processFrontMatter).

		let reloaded = false;
		const promise = service.reloadCache([file]).then(() => {
			reloaded = true;
		});

		await Promise.resolve();
		expect(reloaded).toBe(false);

		// Now Obsidian "catches up" — index the file's frontmatter and
		// fire the changed event.
		app.metadataCache._setFrontmatter(file, {
			cr_type: 'person',
			cr_id: 'person-han-solo',
			name: 'Han Solo',
		});
		app.metadataCache._fire('changed', file);

		await promise;
		expect(reloaded).toBe(true);
		expect(service.getPersonByCrId('person-han-solo')).toBeDefined();
	});

	it('reloads immediately when modifiedFiles is omitted (refresh path)', async () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		const file = makeFile('People/Leia.md');
		app.vault._addFile(file);
		app.metadataCache._setFrontmatter(file, {
			cr_type: 'person',
			cr_id: 'person-leia',
			name: 'Leia Organa',
		});

		await service.reloadCache();
		expect(service.getPersonByCrId('person-leia')).toBeDefined();
	});
});

describe('PlaceGraphService.reloadCache — cache-race (#547)', () => {
	it('awaits metadataCache.changed before rebuilding when modifiedFiles is provided', async () => {
		const app = new App();
		const service = new PlaceGraphService(app);

		const file = makeFile('Places/Tatooine.md');
		app.vault._addFile(file);

		let reloaded = false;
		const promise = service.reloadCache([file]).then(() => {
			reloaded = true;
		});

		await Promise.resolve();
		expect(reloaded).toBe(false);

		app.metadataCache._setFrontmatter(file, {
			cr_type: 'place',
			cr_id: 'place-tatooine',
			name: 'Tatooine',
		});
		app.metadataCache._fire('changed', file);

		await promise;
		expect(reloaded).toBe(true);
		expect(service.getPlaceByCrId('place-tatooine')).toBeDefined();
	});
});

describe('OrganizationService.reloadCache — cache-race (#547)', () => {
	it('awaits metadataCache.changed before rebuilding when modifiedFiles is provided', async () => {
		const app = new App();
		const plugin = makePlugin(app);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const service = new OrganizationService(plugin as any);

		const file = makeFile('Organizations/Jedi Order.md');
		app.vault._addFile(file);

		let reloaded = false;
		const promise = service.reloadCache([file]).then(() => {
			reloaded = true;
		});

		await Promise.resolve();
		expect(reloaded).toBe(false);

		app.metadataCache._setFrontmatter(file, {
			cr_type: 'organization',
			cr_id: 'org-jedi-order',
			name: 'Jedi Order',
			org_type: 'guild',
		});
		app.metadataCache._fire('changed', file);

		await promise;
		expect(reloaded).toBe(true);
		expect(service.getOrganization('org-jedi-order')).not.toBeNull();
	});
});

describe('UniverseService.reloadCache — cache-race (#547)', () => {
	it('awaits metadataCache.changed before rebuilding when modifiedFiles is provided', async () => {
		const app = new App();
		const plugin = makePlugin(app);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const service = new UniverseService(plugin as any);

		const file = makeFile('Universes/Star Wars.md');
		app.vault._addFile(file);

		let reloaded = false;
		const promise = service.reloadCache([file]).then(() => {
			reloaded = true;
		});

		await Promise.resolve();
		expect(reloaded).toBe(false);

		app.metadataCache._setFrontmatter(file, {
			cr_type: 'universe',
			cr_id: 'universe-star-wars',
			name: 'Star Wars',
		});
		app.metadataCache._fire('changed', file);

		await promise;
		expect(reloaded).toBe(true);
		expect(service.getUniverse('universe-star-wars')).not.toBeNull();
	});
});