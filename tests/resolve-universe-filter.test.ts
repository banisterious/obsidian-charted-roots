import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { resolveUniverseFilterValue } from '../src/maps/resolve-universe-filter';

/**
 * #503 — When a map's `universe:` field holds a universe `cr_id`, the map
 * filter resolver must return the universe note's **basename**, not its
 * frontmatter `name`. The rename cascade writes the basename to every
 * referencing entity; if the filter compares the resolved name (which can
 * carry sanitization-stripped chars like parens) to the cascade-written
 * basename, every marker silently disappears.
 *
 * Discovered during dev-vault sanity testing: a Dying Earth map with
 * `universe: universe-the-dying-earth-mnkte9t5` lost all markers after the
 * universe was renamed to `"The Dying Earth (Vance)"` — the resolver was
 * returning the parens-name while cascaded people had the basename
 * `"The Dying Earth Vance"`.
 */

function makeFile(path: string, basename: string): TFile {
	return new TFile({ path, basename, extension: 'md' });
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

describe('resolveUniverseFilterValue (#503)', () => {
	it('returns the universe note basename when given its cr_id', () => {
		const app = new App();
		seedUniverse(app, {
			path: 'Universes/The Dying Earth Vance.md',
			basename: 'The Dying Earth Vance',
			name: 'The Dying Earth (Vance)',
			crId: 'universe-the-dying-earth-mnkte9t5',
		});

		const resolved = resolveUniverseFilterValue(app, 'universe-the-dying-earth-mnkte9t5');

		// Basename, not fm.name. Cascade writes basename onto entities.
		expect(resolved).toBe('The Dying Earth Vance');
	});

	it('returns the same basename even when fm.name diverges from the basename', () => {
		// The whole point of the fix: divergence between sanitized basename
		// and typed name must not break the filter chain.
		const app = new App();
		seedUniverse(app, {
			path: 'Universes/Crazy Name.md',
			basename: 'Crazy Name',
			name: 'Crazy (Name)',
			crId: 'universe-crazy-001',
		});

		expect(resolveUniverseFilterValue(app, 'universe-crazy-001')).toBe('Crazy Name');
	});

	it('passes through values that do not match any universe cr_id', () => {
		const app = new App();
		seedUniverse(app, {
			path: 'Universes/Westeros.md',
			basename: 'Westeros',
			name: 'Westeros',
			crId: 'universe-westeros-xyz',
		});

		// Already a name / basename — return unchanged
		expect(resolveUniverseFilterValue(app, 'Middle-earth')).toBe('Middle-earth');
		// Unknown cr_id-shaped value — also unchanged
		expect(resolveUniverseFilterValue(app, 'universe-not-here-000')).toBe('universe-not-here-000');
	});

	it('returns null for a null filter (no universe scope)', () => {
		const app = new App();
		expect(resolveUniverseFilterValue(app, null)).toBeNull();
	});

	it('returns null for an empty string (treated as no filter)', () => {
		const app = new App();
		expect(resolveUniverseFilterValue(app, '')).toBeNull();
	});

	it('matches the right universe when multiple universe notes exist', () => {
		const app = new App();
		seedUniverse(app, {
			path: 'Universes/Star Wars.md',
			basename: 'Star Wars',
			name: 'Star Wars',
			crId: 'universe-star-wars-001',
		});
		seedUniverse(app, {
			path: 'Universes/The Dying Earth Vance.md',
			basename: 'The Dying Earth Vance',
			name: 'The Dying Earth (Vance)',
			crId: 'universe-the-dying-earth-mnkte9t5',
		});
		seedUniverse(app, {
			path: 'Universes/Westeros.md',
			basename: 'Westeros',
			name: 'Westeros',
			crId: 'universe-westeros-xyz',
		});

		expect(resolveUniverseFilterValue(app, 'universe-the-dying-earth-mnkte9t5'))
			.toBe('The Dying Earth Vance');
		expect(resolveUniverseFilterValue(app, 'universe-star-wars-001'))
			.toBe('Star Wars');
		expect(resolveUniverseFilterValue(app, 'universe-westeros-xyz'))
			.toBe('Westeros');
	});

	it('also matches by the legacy `type: universe` shape', () => {
		// A few legacy notes use `type:` instead of `cr_type:`. The resolver
		// honors both via the same fallback the rest of the codebase uses.
		const app = new App();
		const file = makeFile('Universes/Legacy.md', 'Legacy');
		app.vault.files.set(file.path, file);
		app.metadataCache._setFrontmatter(file, {
			type: 'universe',
			cr_id: 'universe-legacy-001',
			name: 'Legacy (old)',
		});

		expect(resolveUniverseFilterValue(app, 'universe-legacy-001')).toBe('Legacy');
	});
});
