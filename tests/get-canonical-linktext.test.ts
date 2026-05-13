/* eslint-disable @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { getCanonicalLinktext } from '../src/utils/wikilink-resolver';

/**
 * Coverage for `getCanonicalLinktext`, the helper used by `createSmartWikilink`
 * across person / organization / event writers to decide whether to emit
 * `[[basename]]` or the disambiguated `[[path|basename]]` form (#540).
 *
 * Contract:
 * - Unique basename → returns `file.basename`.
 * - Ambiguous basename (≥ 2 files share the basename) → returns the file's
 *   path with the `.md` extension stripped.
 * - Output is well-formed (no brackets, pipes, leading/trailing whitespace).
 *
 * The fuzz block at the bottom (#548) extends targeted regression tests
 * with a property-based corpus of vault states.
 */

function makeFile(path: string, basename: string): TFile {
	return new TFile({ path, basename, extension: 'md' });
}

describe('getCanonicalLinktext', () => {
	describe('unique basenames', () => {
		it('returns the bare basename when no other file shares it', () => {
			const app = new App();
			const file = makeFile('Charted Roots/People/Errol Naberrie.md', 'Errol Naberrie');
			app.vault._addFile(file);
			expect(getCanonicalLinktext(app as unknown as App, file)).toBe('Errol Naberrie');
		});

		it('returns basename when the file is the only markdown file in vault', () => {
			const app = new App();
			const file = makeFile('Solo.md', 'Solo');
			app.vault._addFile(file);
			expect(getCanonicalLinktext(app as unknown as App, file)).toBe('Solo');
		});

		it('returns basename even when other unrelated basenames exist', () => {
			const app = new App();
			const target = makeFile('A/Han.md', 'Han');
			const other1 = makeFile('B/Leia.md', 'Leia');
			const other2 = makeFile('C/Luke.md', 'Luke');
			app.vault._addFile(target);
			app.vault._addFile(other1);
			app.vault._addFile(other2);
			expect(getCanonicalLinktext(app as unknown as App, target)).toBe('Han');
		});
	});

	describe('ambiguous basenames', () => {
		it('returns path-form (sans .md) when two files share a basename', () => {
			const app = new App();
			const target = makeFile('Charted Roots/People/Errol Naberrie.md', 'Errol Naberrie');
			const collision = makeFile('Other/Notes/Errol Naberrie.md', 'Errol Naberrie');
			app.vault._addFile(target);
			app.vault._addFile(collision);
			expect(getCanonicalLinktext(app as unknown as App, target))
				.toBe('Charted Roots/People/Errol Naberrie');
		});

		it('returns path-form for any of three files sharing a basename', () => {
			const app = new App();
			const a = makeFile('Folder1/Twin.md', 'Twin');
			const b = makeFile('Folder2/Twin.md', 'Twin');
			const c = makeFile('Folder3/Twin.md', 'Twin');
			app.vault._addFile(a);
			app.vault._addFile(b);
			app.vault._addFile(c);
			expect(getCanonicalLinktext(app as unknown as App, a)).toBe('Folder1/Twin');
			expect(getCanonicalLinktext(app as unknown as App, b)).toBe('Folder2/Twin');
			expect(getCanonicalLinktext(app as unknown as App, c)).toBe('Folder3/Twin');
		});

		it('returns path-form for files at the vault root sharing basename with subfolder file', () => {
			const app = new App();
			const root = makeFile('Same.md', 'Same');
			const nested = makeFile('Folder/Same.md', 'Same');
			app.vault._addFile(root);
			app.vault._addFile(nested);
			expect(getCanonicalLinktext(app as unknown as App, root)).toBe('Same');
			expect(getCanonicalLinktext(app as unknown as App, nested)).toBe('Folder/Same');
		});
	});

	describe('special characters in basenames', () => {
		it('handles apostrophes in basename', () => {
			const app = new App();
			const file = makeFile("People/O'Brien.md", "O'Brien");
			app.vault._addFile(file);
			expect(getCanonicalLinktext(app as unknown as App, file)).toBe("O'Brien");
		});

		it('handles diacritics in basename', () => {
			const app = new App();
			const file = makeFile('People/Müller.md', 'Müller');
			app.vault._addFile(file);
			expect(getCanonicalLinktext(app as unknown as App, file)).toBe('Müller');
		});

		it('handles unicode (CJK) in basename', () => {
			const app = new App();
			const file = makeFile('People/日本太郎.md', '日本太郎');
			app.vault._addFile(file);
			expect(getCanonicalLinktext(app as unknown as App, file)).toBe('日本太郎');
		});

		it('handles spaces in path segments', () => {
			const app = new App();
			const file = makeFile('Charted Roots/People/Errol Naberrie.md', 'Errol Naberrie');
			const collision = makeFile('Other Folder/Errol Naberrie.md', 'Errol Naberrie');
			app.vault._addFile(file);
			app.vault._addFile(collision);
			expect(getCanonicalLinktext(app as unknown as App, file)).toBe('Charted Roots/People/Errol Naberrie');
		});
	});

	/**
	 * Property-based input-shape coverage (#548). Each test case constructs
	 * a vault state and asserts properties that must hold regardless of the
	 * specific basenames or paths.
	 *
	 * Properties asserted:
	 * 1. Output never contains `[`, `]`, or `|` (well-formed for use in
	 *    `[[…]]` wrapping by callers).
	 * 2. Output is trimmed.
	 * 3. Output is exactly one of: file.basename (unique case) or
	 *    file.path without the .md extension (ambiguous case).
	 * 4. Output never contains the `.md` suffix.
	 */
	describe('property-based vault-shape coverage', () => {
		const scenarios: Array<{
			description: string;
			setup: () => { app: App; target: TFile; expectAmbiguous: boolean };
		}> = [
			{
				description: 'single file in vault',
				setup: () => {
					const app = new App();
					const target = makeFile('Solo.md', 'Solo');
					app.vault._addFile(target);
					return { app, target, expectAmbiguous: false };
				}
			},
			{
				description: 'two files, distinct basenames',
				setup: () => {
					const app = new App();
					const target = makeFile('A/Foo.md', 'Foo');
					app.vault._addFile(target);
					app.vault._addFile(makeFile('B/Bar.md', 'Bar'));
					return { app, target, expectAmbiguous: false };
				}
			},
			{
				description: 'two files, shared basename',
				setup: () => {
					const app = new App();
					const target = makeFile('A/Foo.md', 'Foo');
					app.vault._addFile(target);
					app.vault._addFile(makeFile('B/Foo.md', 'Foo'));
					return { app, target, expectAmbiguous: true };
				}
			},
			{
				description: 'deeply nested target with shared basename',
				setup: () => {
					const app = new App();
					const target = makeFile('a/b/c/d/e/Deep.md', 'Deep');
					app.vault._addFile(target);
					app.vault._addFile(makeFile('Other/Deep.md', 'Deep'));
					return { app, target, expectAmbiguous: true };
				}
			},
			{
				description: 'target at vault root, shared basename in subfolder',
				setup: () => {
					const app = new App();
					const target = makeFile('Root.md', 'Root');
					app.vault._addFile(target);
					app.vault._addFile(makeFile('Folder/Root.md', 'Root'));
					return { app, target, expectAmbiguous: true };
				}
			},
			{
				description: 'apostrophe basename, unique',
				setup: () => {
					const app = new App();
					const target = makeFile("People/O'Brien.md", "O'Brien");
					app.vault._addFile(target);
					return { app, target, expectAmbiguous: false };
				}
			},
			{
				description: 'apostrophe basename, ambiguous',
				setup: () => {
					const app = new App();
					const target = makeFile("People/O'Brien.md", "O'Brien");
					app.vault._addFile(target);
					app.vault._addFile(makeFile("Other/O'Brien.md", "O'Brien"));
					return { app, target, expectAmbiguous: true };
				}
			},
			{
				description: 'unicode basename, ambiguous',
				setup: () => {
					const app = new App();
					const target = makeFile('A/日本太郎.md', '日本太郎');
					app.vault._addFile(target);
					app.vault._addFile(makeFile('B/日本太郎.md', '日本太郎'));
					return { app, target, expectAmbiguous: true };
				}
			},
			{
				description: 'three files all sharing basename',
				setup: () => {
					const app = new App();
					const target = makeFile('A/Triple.md', 'Triple');
					app.vault._addFile(target);
					app.vault._addFile(makeFile('B/Triple.md', 'Triple'));
					app.vault._addFile(makeFile('C/Triple.md', 'Triple'));
					return { app, target, expectAmbiguous: true };
				}
			}
		];

		it.each(scenarios)('properties hold: $description', ({ setup }) => {
			const { app, target, expectAmbiguous } = setup();
			const output = getCanonicalLinktext(app as unknown as App, target);

			// Property 1: well-formed for [[…]] wrapping.
			expect(output).not.toMatch(/[[\]]/);
			expect(output).not.toContain('|');

			// Property 2: trimmed.
			expect(output).toBe(output.trim());

			// Property 3: exactly basename (unique) or path-without-.md (ambiguous).
			if (expectAmbiguous) {
				expect(output).toBe(target.path.replace(/\.md$/, ''));
			} else {
				expect(output).toBe(target.basename);
			}

			// Property 4: no .md suffix in either output form.
			expect(output).not.toMatch(/\.md$/);
		});
	});
});