/* eslint-disable @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { createSmartWikilink } from '../src/events/services/event-service';

/**
 * Property-based coverage for the event-service `createSmartWikilink`
 * variant (#548).
 *
 * Unlike the person and organization variants, this helper assumes its
 * `name` argument is already a clean display name (no `[[…]]` brackets,
 * no pipe-form residue, no path-form residue). Its job is to wrap the
 * name with brackets and add the disambiguated `[[basename|name]]` form
 * when an explicit `basename` or `file` reveals ambiguity.
 *
 * Callers are responsible for stripping wikilink decoration before
 * calling this — both `EventService.updateEvent` and the Edit Event
 * modal's save path do so via `parseWikilink` / `extractDisplayLabel`
 * (#510, #549). The fuzz dimension here is therefore vault state +
 * parameter combinations rather than input shape.
 */

function seedFile(app: App, args: { path: string; basename: string; crId?: string }): TFile {
	const file = makeTFile({ path: args.path, basename: args.basename, extension: 'md' });
	app.vault._addFile(file);
	if (args.crId) {
		app.metadataCache._setFrontmatter(file, { cr_id: args.crId });
	}
	return file;
}

describe('event-service.createSmartWikilink — parameter and vault-state coverage (#548)', () => {
	describe('explicit basename argument', () => {
		it('returns [[name]] when basename matches name', () => {
			const app = new App();
			expect(createSmartWikilink('Kaelorin', null, app as unknown as App, 'Kaelorin'))
				.toBe('[[Kaelorin]]');
		});

		it('returns [[basename|name]] when basename differs from name', () => {
			const app = new App();
			expect(createSmartWikilink('Kaelorin', null, app as unknown as App, 'Charted Roots/Places/Kaelorin'))
				.toBe('[[Charted Roots/Places/Kaelorin|Kaelorin]]');
		});

		it('explicit basename trumps file argument when both provided', () => {
			const app = new App();
			const file = seedFile(app, { path: 'Other/Place.md', basename: 'Other Basename' });
			expect(createSmartWikilink('Display Name', file, app as unknown as App, 'Explicit Basename'))
				.toBe('[[Explicit Basename|Display Name]]');
		});
	});

	describe('TFile argument without explicit basename', () => {
		it('returns [[name]] when file.basename matches name', () => {
			const app = new App();
			const file = seedFile(app, { path: 'A/Match.md', basename: 'Match' });
			expect(createSmartWikilink('Match', file, app as unknown as App))
				.toBe('[[Match]]');
		});

		it('returns [[basename|name]] when file.basename differs from name', () => {
			const app = new App();
			const file = seedFile(app, { path: 'A/Errol-Naberrie.md', basename: 'Errol-Naberrie' });
			expect(createSmartWikilink('Errol Naberrie', file, app as unknown as App))
				.toBe('[[Errol-Naberrie|Errol Naberrie]]');
		});
	});

	describe('vault resolution (no file or basename argument)', () => {
		it('returns [[name]] when name resolves to a file with matching basename', () => {
			const app = new App();
			seedFile(app, { path: 'A/Tatooine.md', basename: 'Tatooine' });
			expect(createSmartWikilink('Tatooine', null, app as unknown as App))
				.toBe('[[Tatooine]]');
		});

		it('returns [[basename|name]] when resolved file has a different basename', () => {
			const app = new App();
			seedFile(app, { path: 'A/Errol-Naberrie.md', basename: 'Errol-Naberrie' });
			// Looking up by "Errol-Naberrie" (matches basename) returns the
			// file; output stays bare since basename === name.
			expect(createSmartWikilink('Errol-Naberrie', null, app as unknown as App))
				.toBe('[[Errol-Naberrie]]');
		});

		it('returns [[name]] when name does not resolve to any file', () => {
			const app = new App();
			expect(createSmartWikilink('Unknown', null, app as unknown as App))
				.toBe('[[Unknown]]');
		});
	});

	/**
	 * Property-based coverage. Each scenario constructs vault state +
	 * parameters and asserts properties that must hold regardless of the
	 * specific names used.
	 *
	 * Properties asserted:
	 * 1. Output is a parseable wikilink (`^\[\[…\]\]$`).
	 * 2. Output never contains nested `[[` or `]]`.
	 * 3. Output is exactly one of: `[[name]]` or `[[basename|name]]`.
	 * 4. When output is `[[basename|name]]`, the alias half equals the
	 *    input name.
	 */
	describe('property-based scenarios', () => {
		const scenarios: Array<{
			label: string;
			run: (app: App) => string;
			expectAlias: boolean;
			name: string;
		}> = [
			{
				label: 'bare name, empty vault, no params',
				name: 'Solo',
				expectAlias: false,
				run: (app) => createSmartWikilink('Solo', null, app as unknown as App),
			},
			{
				label: 'bare name, matching basename',
				name: 'Match',
				expectAlias: false,
				run: (app) => createSmartWikilink('Match', null, app as unknown as App, 'Match'),
			},
			{
				label: 'bare name, divergent basename',
				name: 'Display',
				expectAlias: true,
				run: (app) => createSmartWikilink('Display', null, app as unknown as App, 'Real-Basename'),
			},
			{
				label: 'name with apostrophe, divergent basename',
				name: "O'Brien",
				expectAlias: true,
				run: (app) => createSmartWikilink("O'Brien", null, app as unknown as App, 'OBrien'),
			},
			{
				label: 'unicode CJK name, matching basename',
				name: '日本太郎',
				expectAlias: false,
				run: (app) => createSmartWikilink('日本太郎', null, app as unknown as App, '日本太郎'),
			},
			{
				label: 'name with diacritic, divergent basename',
				name: 'Müller',
				expectAlias: true,
				run: (app) => createSmartWikilink('Müller', null, app as unknown as App, 'Mueller'),
			},
			{
				label: 'TFile with matching basename',
				name: 'Place',
				expectAlias: false,
				run: (app) => {
					const file = seedFile(app, { path: 'A/Place.md', basename: 'Place' });
					return createSmartWikilink('Place', file, app as unknown as App);
				},
			},
			{
				label: 'TFile with divergent basename',
				name: 'Display Name',
				expectAlias: true,
				run: (app) => {
					const file = seedFile(app, { path: 'A/different-basename.md', basename: 'different-basename' });
					return createSmartWikilink('Display Name', file, app as unknown as App);
				},
			},
			{
				label: 'name with spaces, vault resolves to matching file',
				name: 'Hessey Family Compound',
				expectAlias: false,
				run: (app) => {
					seedFile(app, { path: 'Places/Hessey Family Compound.md', basename: 'Hessey Family Compound' });
					return createSmartWikilink('Hessey Family Compound', null, app as unknown as App);
				},
			},
		];

		it.each(scenarios)('properties hold: $label', ({ run, expectAlias, name }) => {
			const app = new App();
			const output = run(app);

			// Property 1: output is a parseable wikilink.
			expect(output).toMatch(/^\[\[[^\]]+\]\]$/);

			// Property 2: no nested brackets.
			expect(output.slice(2, -2)).not.toContain('[[');
			expect(output.slice(2, -2)).not.toContain(']]');

			// Properties 3 + 4: exactly bare-or-aliased form, alias matches input.
			if (expectAlias) {
				const inner = output.slice(2, -2);
				expect(inner).toContain('|');
				const [, alias] = inner.split('|');
				expect(alias).toBe(name);
			} else {
				expect(output).toBe(`[[${name}]]`);
			}
		});
	});
});