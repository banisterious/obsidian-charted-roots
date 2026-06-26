/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { UniverseService } from '../src/universes/services/universe-service';
import type CanvasRootsPlugin from '../main';

/**
 * #755 follow-up — the Orphan universe values scan grouped references by their
 * raw frontmatter string, so `[[Lands of the Undying]]`,
 * `[[Lands of the Undying|Lands of the Undying]]`, and the plain text form
 * appeared as separate orphan buckets (241 / 116 / ... entities) and showed the
 * brackets. The reference gather and per-type count now normalize wikilink
 * syntax, so the forms collapse to a single plain-text orphan. Reported by
 * @lomarcanys.
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

function seedPerson(app: App, args: { path: string; basename: string; universe: string }): void {
	const file = makeFile(args.path, args.basename);
	app.vault.files.set(file.path, file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'person',
		name: args.basename,
		universe: args.universe,
	});
}

describe('UniverseService.findOrphanUniverses — wikilink normalization (#755)', () => {
	it('merges bracketed, aliased, and plain references into one orphan', () => {
		const { service, app } = makeService();
		seedPerson(app, { path: 'people/A.md', basename: 'A', universe: '[[Lands of the Undying]]' });
		seedPerson(app, { path: 'people/B.md', basename: 'B', universe: '[[Lands of the Undying|Lands of the Undying]]' });
		seedPerson(app, { path: 'people/C.md', basename: 'C', universe: 'Lands of the Undying' });

		const orphans = service.findOrphanUniverses();

		expect(orphans).toHaveLength(1);
		expect(orphans[0].value).toBe('Lands of the Undying');
		expect(orphans[0].entityCount).toBe(3);
		expect(orphans[0].byType.people).toBe(3);
	});

	it('keeps genuinely distinct universe values separate', () => {
		const { service, app } = makeService();
		seedPerson(app, { path: 'people/A.md', basename: 'A', universe: '[[Lands of the Undying]]' });
		seedPerson(app, { path: 'people/B.md', basename: 'B', universe: '[[Land of Use]]' });

		const orphans = service.findOrphanUniverses();
		const values = orphans.map(o => o.value).sort();

		expect(values).toEqual(['Land of Use', 'Lands of the Undying']);
	});
});
