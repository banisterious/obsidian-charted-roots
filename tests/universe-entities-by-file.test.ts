import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { UniverseService } from '../src/universes/services/universe-service';
import type CanvasRootsPlugin from '../main';

/**
 * #503 — Read-path lookups by the universe's `name` frontmatter diverge from
 * the cascade-written basename whenever `sanitizeName` strips characters
 * (parens, brackets, quotes). A universe renamed to `"Star Wars (AU)"`
 * becomes basename `"Star Wars AU"`; the cascade rewrites entities to the
 * basename, but `getEntitiesForUniverse(name)` was comparing against the
 * unsanitized name and returning zero entities.
 *
 * The new file-keyed lookup matches against any of the universe note's
 * aliases — basename, frontmatter `name`, or `cr_id` — so it survives the
 * divergence regardless of which form an entity's `universe:` field happens
 * to hold.
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

function seedPerson(app: App, args: { path: string; basename: string; name: string; universe: string }): void {
	const file = makeFile(args.path, args.basename);
	app.vault.files.set(file.path, file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'person',
		name: args.name,
		universe: args.universe,
	});
}

describe('UniverseService.getEntitiesForUniverseFile — alias-aware lookup (#503)', () => {
	it('finds entities whose universe field is the basename when the typed name has been sanitized', () => {
		// Scenario: universe renamed to "Star Wars (AU)". Sanitized basename
		// becomes "Star Wars AU" (parens stripped). Cascade rewrites entities
		// to the basename; the universe note still carries the typed name in
		// its `name:` frontmatter. Lookup must match either form.
		const { service, app } = makeService();
		const universeFile = seedUniverse(app, {
			path: 'Universes/Star Wars AU.md',
			basename: 'Star Wars AU',
			name: 'Star Wars (AU)',
			crId: 'universe-star-wars-au-001',
		});
		seedPerson(app, {
			path: 'People/Cliegg.md',
			basename: 'Cliegg',
			name: 'Cliegg Lars',
			universe: 'Star Wars AU', // basename, post-cascade
		});

		const entities = service.getEntitiesForUniverseFile(universeFile);

		expect(entities.people).toHaveLength(1);
		expect(entities.people[0].name).toBe('Cliegg Lars');
	});

	it('finds entities whose universe field is the typed name when the universe has not been renamed', () => {
		// Pre-rename / never-renamed scenario: name has special chars,
		// basename strips them, but entities were saved with the name
		// (because the dropdown writes name). Lookup must still resolve.
		const { service, app } = makeService();
		const universeFile = seedUniverse(app, {
			path: 'Universes/Crazy Name.md',
			basename: 'Crazy Name',
			name: 'Crazy (Name)',
			crId: 'universe-crazy-name-001',
		});
		seedPerson(app, {
			path: 'People/Anna.md',
			basename: 'Anna',
			name: 'Anna K',
			universe: 'Crazy (Name)', // matches frontmatter name, not basename
		});

		const entities = service.getEntitiesForUniverseFile(universeFile);

		expect(entities.people).toHaveLength(1);
		expect(entities.people[0].name).toBe('Anna K');
	});

	it('finds entities by cr_id when that is what the entity stores in `universe:`', () => {
		const { service, app } = makeService();
		const universeFile = seedUniverse(app, {
			path: 'Universes/Westeros.md',
			basename: 'Westeros',
			name: 'Westeros',
			crId: 'universe-westeros-xyz',
		});
		seedPerson(app, {
			path: 'People/Ned.md',
			basename: 'Ned',
			name: 'Ned Stark',
			universe: 'universe-westeros-xyz',
		});

		const entities = service.getEntitiesForUniverseFile(universeFile);

		expect(entities.people).toHaveLength(1);
		expect(entities.people[0].name).toBe('Ned Stark');
	});

	it('does not match unrelated universes', () => {
		const { service, app } = makeService();
		const universeFile = seedUniverse(app, {
			path: 'Universes/Star Wars.md',
			basename: 'Star Wars',
			name: 'Star Wars',
			crId: 'universe-star-wars-001',
		});
		seedPerson(app, {
			path: 'People/Frodo.md',
			basename: 'Frodo',
			name: 'Frodo',
			universe: 'Middle-earth',
		});

		const entities = service.getEntitiesForUniverseFile(universeFile);

		expect(entities.people).toHaveLength(0);
	});

	it('matches case-insensitively across all aliases', () => {
		const { service, app } = makeService();
		const universeFile = seedUniverse(app, {
			path: 'Universes/Star Wars AU.md',
			basename: 'Star Wars AU',
			name: 'Star Wars (AU)',
			crId: 'universe-star-wars-au-001',
		});
		seedPerson(app, {
			path: 'People/Cliegg.md',
			basename: 'Cliegg',
			name: 'Cliegg',
			universe: 'STAR WARS AU', // user-typed all caps
		});

		const entities = service.getEntitiesForUniverseFile(universeFile);

		expect(entities.people).toHaveLength(1);
	});
});
