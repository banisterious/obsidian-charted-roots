/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { UniverseService } from '../src/universes/services/universe-service';
import type CanvasRootsPlugin from '../main';

/**
 * #503 — Map notes (`cr_type: map`) carry a `universe:` field that scopes
 * which markers render on them. The original cascade scope was `person |
 * place | event | organization`; map notes were silently skipped, so after
 * a Universe rename the map kept pointing at the old universe and its
 * filter no longer matched the cascaded entities.
 *
 * Fences the expanded cascade scope so map notes are rewritten alongside
 * the other entity types — and unrelated `cr_type` values stay untouched.
 */

function makeFile(path: string, basename: string): TFile {
	return makeTFile({ path, basename, extension: 'md' });
}

function makeService(): { service: UniverseService; app: App } {
	const app = new App();
	const plugin = {
		app,
		settings: { noteTypeDetection: undefined },
	} as unknown as CanvasRootsPlugin;
	const service = new UniverseService(plugin);
	return { service, app };
}

describe('UniverseService.cascadeUniverseRename — map cr_type inclusion (#503)', () => {
	it('rewrites a map note\'s universe field from old to new basename', async () => {
		const { service, app } = makeService();

		const mapFile = makeFile('Maps/Galaxy Map.md', 'Galaxy Map');
		app.vault.files.set(mapFile.path, mapFile);
		app.metadataCache._setFrontmatter(mapFile, {
			cr_id: 'map-galaxy-001',
			cr_type: 'map',
			name: 'Galaxy Map',
			universe: 'Star Wars',
		});

		const updated = await service.cascadeUniverseRename('Star Wars', 'Star Wars AU');

		expect(updated).toBe(1);
		const fm = app.metadataCache.getFileCache(mapFile)?.frontmatter;
		expect(fm?.universe).toBe('Star Wars AU');
	});

	it('rewrites map notes alongside person / place / event / organization in a single pass', async () => {
		const { service, app } = makeService();

		const personFile = makeFile('People/Cliegg.md', 'Cliegg');
		const placeFile = makeFile('Places/Tatooine.md', 'Tatooine');
		const eventFile = makeFile('Events/Battle of Geonosis.md', 'Battle of Geonosis');
		const orgFile = makeFile('Organizations/Jedi Order.md', 'Jedi Order');
		const mapFile = makeFile('Maps/Galaxy Map.md', 'Galaxy Map');

		for (const f of [personFile, placeFile, eventFile, orgFile, mapFile]) {
			app.vault.files.set(f.path, f);
		}

		app.metadataCache._setFrontmatter(personFile, { cr_type: 'person', universe: 'Star Wars' });
		app.metadataCache._setFrontmatter(placeFile, { cr_type: 'place', universe: 'Star Wars' });
		app.metadataCache._setFrontmatter(eventFile, { cr_type: 'event', universe: 'Star Wars' });
		app.metadataCache._setFrontmatter(orgFile, { cr_type: 'organization', universe: 'Star Wars' });
		app.metadataCache._setFrontmatter(mapFile, { cr_type: 'map', universe: 'Star Wars' });

		const updated = await service.cascadeUniverseRename('Star Wars', 'Star Wars AU');

		expect(updated).toBe(5);
		for (const f of [personFile, placeFile, eventFile, orgFile, mapFile]) {
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			expect(fm?.universe).toBe('Star Wars AU');
		}
	});

	it('does not touch unrelated cr_types like source or calendar', async () => {
		const { service, app } = makeService();

		const sourceFile = makeFile('Sources/Census 1900.md', 'Census 1900');
		const calendarFile = makeFile('Calendars/Galactic Standard.md', 'Galactic Standard');

		app.vault.files.set(sourceFile.path, sourceFile);
		app.vault.files.set(calendarFile.path, calendarFile);

		app.metadataCache._setFrontmatter(sourceFile, { cr_type: 'source', universe: 'Star Wars' });
		app.metadataCache._setFrontmatter(calendarFile, { cr_type: 'calendar', universe: 'Star Wars' });

		const updated = await service.cascadeUniverseRename('Star Wars', 'Star Wars AU');

		expect(updated).toBe(0);
		expect(app.metadataCache.getFileCache(sourceFile)?.frontmatter?.universe).toBe('Star Wars');
		expect(app.metadataCache.getFileCache(calendarFile)?.frontmatter?.universe).toBe('Star Wars');
	});
});