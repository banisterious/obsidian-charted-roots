/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { UniverseService } from '../src/universes/services/universe-service';
import { mergeUniverseList } from '../src/universes/services/merged-universe-list';
import type CanvasRootsPlugin from '../main';

/**
 * #505 — After a Universe rename via Edit Universe modal where the typed
 * name diverges from the sanitized basename, the Edit Person dropdown
 * shows only the basename and drops the typed name. The dropdown is built
 * from three sources merged via `new Set`; the universe-note source
 * (`universeService.getAllUniverses().map(u => u.name)`) should contribute
 * the typed name (`Star Wars (AU)`) while entity sources contribute the
 * cascaded basename (`Star Wars AU`). Both should appear.
 *
 * These tests fence the universe-cache side: `getAllUniverses` returns the
 * typed `fm.name` value (not the basename) so the merge has both forms to
 * dedupe-by-string and preserve.
 */

function makeFile(path: string, basename: string): TFile {
	return new TFile({ path, basename, extension: 'md' });
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

function seedUniverse(app: App, args: { path: string; basename: string; name: string; crId: string }): TFile {
	const file = makeFile(args.path, args.basename);
	app.vault.files.set(file.path, file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'universe',
		cr_id: args.crId,
		name: args.name,
	});
	return file;
}

describe('UniverseService.getAllUniverses — name vs basename divergence (#505)', () => {
	it('returns the typed `fm.name` (with parens), not the sanitized basename', () => {
		const { service, app } = makeService();
		seedUniverse(app, {
			path: 'Universes/Star Wars AU.md',
			basename: 'Star Wars AU',
			name: 'Star Wars (AU)',
			crId: 'universe-star-wars-au-001',
		});

		const universes = service.getAllUniverses();

		expect(universes).toHaveLength(1);
		expect(universes[0].name).toBe('Star Wars (AU)');
		expect(universes[0].file.basename).toBe('Star Wars AU');
	});

	it('uniformly returns the typed name across multiple universes with divergent basenames', () => {
		const { service, app } = makeService();
		seedUniverse(app, {
			path: 'Universes/Star Wars AU.md',
			basename: 'Star Wars AU',
			name: 'Star Wars (AU)',
			crId: 'universe-star-wars-au-001',
		});
		seedUniverse(app, {
			path: 'Universes/Westeros TV.md',
			basename: 'Westeros TV',
			name: 'Westeros (TV)',
			crId: 'universe-westeros-tv-002',
		});
		seedUniverse(app, {
			path: 'Universes/The Dying Earth.md',
			basename: 'The Dying Earth',
			name: 'The Dying Earth',
			crId: 'universe-dying-earth-003',
		});

		const names = service.getAllUniverses().map(u => u.name).sort();

		// Typed names — parens preserved on the two divergent universes.
		expect(names).toEqual([
			'Star Wars (AU)',
			'The Dying Earth',
			'Westeros (TV)',
		]);
	});

	it('falls back to the basename only when fm.name is missing or non-string', () => {
		const { service, app } = makeService();
		const file = makeFile('Universes/Nameless.md', 'Nameless');
		app.vault.files.set(file.path, file);
		app.metadataCache._setFrontmatter(file, {
			cr_type: 'universe',
			cr_id: 'universe-nameless-001',
			// no name field
		});

		const universes = service.getAllUniverses();
		expect(universes).toHaveLength(1);
		expect(universes[0].name).toBe('Nameless');
	});

	it('reload picks up name changes (cascade rewrites entity names; universe note keeps typed name in fm.name)', () => {
		const { service, app } = makeService();
		const file = seedUniverse(app, {
			path: 'Universes/Star Wars.md',
			basename: 'Star Wars',
			name: 'Star Wars',
			crId: 'universe-star-wars-001',
		});

		// Pre-rename: name is plain
		expect(service.getAllUniverses()[0].name).toBe('Star Wars');

		// Simulate Edit Universe rename: frontmatter `name` becomes the
		// typed value, file is renamed to the sanitized basename.
		app.metadataCache._setFrontmatter(file, {
			cr_type: 'universe',
			cr_id: 'universe-star-wars-001',
			name: 'Star Wars (AU)',
		});
		app.vault._rename(file, 'Universes/Star Wars AU.md');

		void service.reloadCache();

		const universes = service.getAllUniverses();
		expect(universes).toHaveLength(1);
		expect(universes[0].name).toBe('Star Wars (AU)');
		expect(universes[0].file.basename).toBe('Star Wars AU');
	});
});

describe('mergeUniverseList — three-source merge for Edit Person dropdown (#505)', () => {
	it('preserves both the typed name and the cascaded basename when they diverge', () => {
		// Post-rename state: universe note has typed name with parens, but
		// the cascade rewrote entities to the sanitized basename. Both forms
		// must reach the dropdown so the user can recognize and pick the
		// typed display name.
		const result = mergeUniverseList({
			universeNoteNames: ['Star Wars (AU)'],
			personUniverses: ['Star Wars AU'],
			placeUniverses: ['Star Wars AU'],
		});

		expect(result).toEqual(['Star Wars (AU)', 'Star Wars AU']);
	});

	it('dedupes exact-string matches across sources', () => {
		// No rename divergence: every source carries the same identifier.
		const result = mergeUniverseList({
			universeNoteNames: ['Westeros'],
			personUniverses: ['Westeros', 'Westeros'],
			placeUniverses: ['Westeros'],
		});

		expect(result).toEqual(['Westeros']);
	});

	it('returns universe notes even when no entity has referenced them yet', () => {
		// Freshly-created or freshly-renamed universe — no person/place uses
		// the new name yet. The Edit Person dropdown still needs to show it
		// (#488 Part 1 motivation).
		const result = mergeUniverseList({
			universeNoteNames: ['New Universe'],
			personUniverses: [],
			placeUniverses: [],
		});

		expect(result).toEqual(['New Universe']);
	});

	it('returns entity universes even when no universe note exists for them', () => {
		// Informal references — entities mention a universe by name without
		// a corresponding universe note. Still a valid value for new entity
		// notes to reference.
		const result = mergeUniverseList({
			universeNoteNames: [],
			personUniverses: ['Pre-Universe-System Vault'],
			placeUniverses: [],
		});

		expect(result).toEqual(['Pre-Universe-System Vault']);
	});

	it('sorts the merged result alphabetically', () => {
		const result = mergeUniverseList({
			universeNoteNames: ['Westeros', 'Middle-earth'],
			personUniverses: ['Star Wars'],
			placeUniverses: ['Dune'],
		});

		expect(result).toEqual(['Dune', 'Middle-earth', 'Star Wars', 'Westeros']);
	});

	it('returns an empty list when all three sources are empty', () => {
		const result = mergeUniverseList({
			universeNoteNames: [],
			personUniverses: [],
			placeUniverses: [],
		});

		expect(result).toEqual([]);
	});
});