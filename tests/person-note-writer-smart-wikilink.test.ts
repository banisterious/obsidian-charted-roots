import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { createSmartWikilink } from '../src/core/person-note-writer';

/**
 * #524 regression: when a person's `name` frontmatter differs from
 * their filename (a deliberate vault pattern — e.g., filing women under
 * maiden name with `name` set to a married-name display), the
 * person-note-writer's `createSmartWikilink` used to silently produce
 * the bare `[[name]]` form because its name-based reverse lookup
 * (`getFirstLinkpathDest`) returned null when no file with the name as
 * basename existed. The fix accepts an optional cr_id and looks up the
 * file by id, deriving the actual basename for the wikilink target.
 *
 * These tests fence the contract: same name/basename → unaliased,
 * diverging → aliased `[[basename|name]]`, no cr_id → fallback to the
 * historical name-based lookup.
 */

function seedPerson(
	app: App,
	args: { path: string; basename: string; name: string; crId: string }
): TFile {
	const file = new TFile({
		path: args.path,
		basename: args.basename,
		extension: 'md',
	});
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'person',
		cr_id: args.crId,
		name: args.name,
	});
	return file;
}

describe('createSmartWikilink — cr_id-based file resolution (#524)', () => {
	it('returns [[basename|name]] when cr_id resolves to a file whose basename differs from the name', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/Susan Smith.md',
			basename: 'Susan Smith',
			name: 'Susan Anderson',
			crId: 'person-susan-001',
		});

		const result = createSmartWikilink('Susan Anderson', app, 'person-susan-001');
		expect(result).toBe('[[Susan Smith|Susan Anderson]]');
	});

	it('returns [[name]] when cr_id resolves to a file whose basename matches the name', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/Jane Doe.md',
			basename: 'Jane Doe',
			name: 'Jane Doe',
			crId: 'person-jane-002',
		});

		const result = createSmartWikilink('Jane Doe', app, 'person-jane-002');
		expect(result).toBe('[[Jane Doe]]');
	});

	it('falls back to name-based lookup when no cr_id is provided', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/John Smith.md',
			basename: 'John Smith',
			name: 'John Smith',
			crId: 'person-john-003',
		});

		// No cr_id passed — relies on getFirstLinkpathDest, which the mock
		// can't resolve without an explicit setup. Should still return a
		// usable wikilink in the standard form.
		const result = createSmartWikilink('John Smith', app);
		expect(result).toBe('[[John Smith]]');
	});

	it('falls back to name-based lookup when cr_id does not resolve to any file', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/Existing.md',
			basename: 'Existing',
			name: 'Existing',
			crId: 'person-existing',
		});

		// Pass a cr_id that doesn't match any seeded file; should fall through.
		const result = createSmartWikilink('Some Name', app, 'person-nonexistent');
		expect(result).toBe('[[Some Name]]');
	});

	it('passes through pre-formatted wikilinks unchanged', () => {
		const app = new App();
		const result = createSmartWikilink('[[Pre Formatted|Display]]', app, 'person-anything');
		expect(result).toBe('[[Pre Formatted|Display]]');
	});

	it('reproduces the #524 bug shape: pre-fix code returned [[name]] for diverging name/basename', () => {
		// Sanity check that the cr_id-less path produces the broken form
		// the bug describes — confirms the fix specifically requires cr_id
		// to be plumbed through.
		const app = new App();
		seedPerson(app, {
			path: 'People/Susan Smith.md',
			basename: 'Susan Smith',
			name: 'Susan Anderson',
			crId: 'person-susan-001',
		});

		// Without cr_id, no way to resolve "Susan Anderson" to "Susan Smith".
		// Mock's getFirstLinkpathDest doesn't know about Susan Anderson.
		const broken = createSmartWikilink('Susan Anderson', app);
		expect(broken).toBe('[[Susan Anderson]]');

		// With cr_id, the fix kicks in.
		const fixed = createSmartWikilink('Susan Anderson', app, 'person-susan-001');
		expect(fixed).toBe('[[Susan Smith|Susan Anderson]]');
	});
});

/**
 * #537 regression: cascade saves used to accumulate `|alias` segments on
 * existing wikilinks until they became unparseable, at which point the
 * bidirectional linker treated the slot as broken and silently dropped the
 * reference. The chain:
 *   1. First write (legitimate, basename≠name): produces [[basename|alias]].
 *   2. Loader's `extractName` regex preserves the pipe — by design, since the
 *      downstream resolver splits on `|` to get the basename stem.
 *   3. Next write fed `basename|alias` to `createSmartWikilink`. With no
 *      bracket-prefix early-return and no pipe handling, the helper compared
 *      the file's basename against the *piped* input, found them different,
 *      and wrapped with another pipe: [[basename|basename|alias]].
 *   4. Repeat → [[basename|basename|basename|alias]] → unparseable → dropped.
 *
 * The fix collapses `basename|alias` stem form to the trailing alias before
 * the basename comparison, making the helper idempotent under round-trip and
 * self-healing for already-corrupted vaults.
 */
describe('createSmartWikilink — pipe-stem idempotency (#537)', () => {
	it('is idempotent when fed its own [[basename|alias]] output via extractName-style stem', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/mildred-barrow.md',
			basename: 'mildred-barrow',
			name: 'Mildred Barrow',
			crId: 'person-mildred',
		});

		const first = createSmartWikilink('Mildred Barrow', app, 'person-mildred');
		expect(first).toBe('[[mildred-barrow|Mildred Barrow]]');

		// Loader's extractName on `[[mildred-barrow|Mildred Barrow]]` returns
		// the stem `mildred-barrow|Mildred Barrow`. The next write must not
		// add another pipe.
		const second = createSmartWikilink('mildred-barrow|Mildred Barrow', app, 'person-mildred');
		expect(second).toBe('[[mildred-barrow|Mildred Barrow]]');

		// Third pass — still stable.
		const third = createSmartWikilink('mildred-barrow|Mildred Barrow', app, 'person-mildred');
		expect(third).toBe('[[mildred-barrow|Mildred Barrow]]');
	});

	it('self-heals existing accumulated triple-pipe corruption', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		// Vault state has been corrupted by previous cascades into the
		// triple-pipe form. The next save (loader strips brackets via
		// extractName) feeds the inner segments back as a piped stem.
		const stem = 'Errol Naberrie|Errol Naberrie|Errol Naberrie';
		const result = createSmartWikilink(stem, app, 'person-errol');

		// Heals back to the canonical bare form because basename === alias.
		expect(result).toBe('[[Errol Naberrie]]');
	});

	it('self-heals triple-pipe corruption when basename differs from name', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/mildred-barrow.md',
			basename: 'mildred-barrow',
			name: 'Mildred Barrow',
			crId: 'person-mildred',
		});

		// After several cascade passes the wikilink had become
		// [[mildred-barrow|mildred-barrow|Mildred Barrow]]; loader extracts
		// the inner content as a piped stem.
		const stem = 'mildred-barrow|mildred-barrow|Mildred Barrow';
		const result = createSmartWikilink(stem, app, 'person-mildred');

		// Heals to the canonical aliased form.
		expect(result).toBe('[[mildred-barrow|Mildred Barrow]]');
	});

	it('preserves the bare [[name]] form across repeated saves when basename matches', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		const first = createSmartWikilink('Errol Naberrie', app, 'person-errol');
		expect(first).toBe('[[Errol Naberrie]]');

		// extractName on `[[Errol Naberrie]]` returns `Errol Naberrie` — no
		// pipe, no stem-collapse needed.
		const second = createSmartWikilink('Errol Naberrie', app, 'person-errol');
		expect(second).toBe('[[Errol Naberrie]]');
	});

	it('handles trailing whitespace inside the alias stem without re-piping', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/mildred-barrow.md',
			basename: 'mildred-barrow',
			name: 'Mildred Barrow',
			crId: 'person-mildred',
		});

		// Defensive: a stray space after the alias shouldn't trip basename
		// comparison.
		const result = createSmartWikilink('mildred-barrow|Mildred Barrow ', app, 'person-mildred');
		expect(result).toBe('[[mildred-barrow|Mildred Barrow]]');
	});
});

/**
 * #538 regression: when the loader's `extractName` receives a path-form
 * wikilink — `[[Charted Roots/People/Errol Naberrie]]` — it returns the
 * inner content verbatim ("Charted Roots/People/Errol Naberrie") with no
 * pipe. Pre-fix, the writer treated the path string as the display name,
 * compared it against the cr_id-resolved basename, and produced the
 * inverted form `[[Errol Naberrie|Charted Roots/People/Errol Naberrie]]` —
 * basename in the target slot, path in the alias slot. Subsequent saves
 * preserved the path because the #537 stem-collapse only handled `|`
 * separators, not `/`.
 *
 * The fix adds a slash-strip step after the pipe-strip so path-form input
 * collapses to its trailing segment (the basename), regardless of whether
 * the path arrived bare or in the alias-position of a piped stem.
 */
describe('createSmartWikilink — path-form input idempotency (#538)', () => {
	it('collapses bare path-form input to the basename', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		// The loader's extractName on `[[Charted Roots/People/Errol Naberrie]]`
		// returns the inner content verbatim with no pipe.
		const stem = 'Charted Roots/People/Errol Naberrie';
		const result = createSmartWikilink(stem, app, 'person-errol');

		// Should heal to canonical basename form.
		expect(result).toBe('[[Errol Naberrie]]');
	});

	it('collapses inverted alias-form (basename | path) to canonical basename', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		// The bug-state shape: basename in target slot, path in alias slot.
		// Loader returns `Errol Naberrie|Charted Roots/People/Errol Naberrie`;
		// pipe-strip yields the path; slash-strip yields the basename.
		const stem = 'Errol Naberrie|Charted Roots/People/Errol Naberrie';
		const result = createSmartWikilink(stem, app, 'person-errol');

		expect(result).toBe('[[Errol Naberrie]]');
	});

	it('collapses path-form input when basename differs from name', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/mildred-barrow.md',
			basename: 'mildred-barrow',
			name: 'Mildred Barrow',
			crId: 'person-mildred',
		});

		// Path-form input where the path's last segment is the basename.
		const stem = 'Charted Roots/People/mildred-barrow';
		const result = createSmartWikilink(stem, app, 'person-mildred');

		// basename === slash-collapsed result, so canonical bare form.
		expect(result).toBe('[[mildred-barrow]]');
	});

	it('preserves an explicit non-path alias when there is no slash', () => {
		const app = new App();
		seedPerson(app, {
			path: 'People/mildred-barrow.md',
			basename: 'mildred-barrow',
			name: 'Mildred Barrow',
			crId: 'person-mildred',
		});

		// Standard `basename|displayName` stem with no path. Slash-strip is
		// a no-op (no slash); pipe-strip yields the alias.
		const stem = 'mildred-barrow|Mildred Barrow';
		const result = createSmartWikilink(stem, app, 'person-mildred');

		expect(result).toBe('[[mildred-barrow|Mildred Barrow]]');
	});

	it('handles deeply nested paths', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/Sub/Folder/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		const stem = 'Charted Roots/People/Sub/Folder/Errol Naberrie';
		const result = createSmartWikilink(stem, app, 'person-errol');

		expect(result).toBe('[[Errol Naberrie]]');
	});

	it('idempotent: feeding back its own canonical output stays canonical', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		// First pass: path-form input → canonical bare.
		const first = createSmartWikilink('Charted Roots/People/Errol Naberrie', app, 'person-errol');
		expect(first).toBe('[[Errol Naberrie]]');

		// Second pass: feed back. extractName on `[[Errol Naberrie]]` returns
		// `Errol Naberrie` — no slash, no pipe, no transformation.
		const second = createSmartWikilink('Errol Naberrie', app, 'person-errol');
		expect(second).toBe('[[Errol Naberrie]]');
	});
});

/**
 * #540 regression: when two files in the vault share the same basename
 * (e.g., a plugin-managed person note `Charted Roots/People/Plo Koon.md`
 * AND an unrelated note `Story Arcs/Plo Koon.md`), the plugin's writer
 * was emitting `[[Plo Koon]]` and trusting Obsidian's link resolver to
 * find the right file. The resolver picks one based on its own heuristics
 * without regard to which one the plugin intended, so the link could
 * land on the wrong file — visible as cross-folder links in Obsidian's
 * Graph view, and as silent rewiring of the wikilink to point at the
 * non-CR sibling on subsequent saves.
 *
 * The fix uses `getCanonicalLinktext` to detect basename ambiguity at
 * write time and emit the path-form wikilink (`[[Charted Roots/People/Plo Koon|Plo Koon]]`)
 * to force unambiguous resolution.
 */
describe('createSmartWikilink — basename ambiguity disambiguation (#540)', () => {
	it('emits path-form when basename is shared with another vault file', () => {
		const app = new App();
		// CR-managed person note.
		seedPerson(app, {
			path: 'Charted Roots/People/Plo Koon.md',
			basename: 'Plo Koon',
			name: 'Plo Koon',
			crId: 'person-plo-koon',
		});
		// Unrelated note outside CR sharing the same basename.
		const otherFile = new TFile({
			path: 'Story Arcs/Plo Koon.md',
			basename: 'Plo Koon',
			extension: 'md',
		});
		app.vault._addFile(otherFile);

		// Caller passes the basename + cr_id of the CR-managed note.
		const result = createSmartWikilink('Plo Koon', app, 'person-plo-koon');

		// Without #540, returns `[[Plo Koon]]` — ambiguous, resolves to whichever
		// file Obsidian's heuristic picks.
		// With #540, returns the path-form target with the basename as alias —
		// disambiguates at the resolver level while keeping the display clean.
		expect(result).toBe('[[Charted Roots/People/Plo Koon|Plo Koon]]');
	});

	it('emits bare basename when the basename is unique in the vault', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/Errol Naberrie.md',
			basename: 'Errol Naberrie',
			name: 'Errol Naberrie',
			crId: 'person-errol',
		});

		const result = createSmartWikilink('Errol Naberrie', app, 'person-errol');

		// No ambiguity; canonical bare basename form.
		expect(result).toBe('[[Errol Naberrie]]');
	});

	it('emits path-form aliased when basename ambiguous AND name differs from basename', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/mildred-barrow.md',
			basename: 'mildred-barrow',
			name: 'Mildred Barrow',
			crId: 'person-mildred',
		});
		const otherFile = new TFile({
			path: 'Notes/mildred-barrow.md',
			basename: 'mildred-barrow',
			extension: 'md',
		});
		app.vault._addFile(otherFile);

		const result = createSmartWikilink('Mildred Barrow', app, 'person-mildred');

		// Path-form target, name as alias.
		expect(result).toBe('[[Charted Roots/People/mildred-barrow|Mildred Barrow]]');
	});

	it('idempotent across saves once disambiguated', () => {
		const app = new App();
		seedPerson(app, {
			path: 'Charted Roots/People/Plo Koon.md',
			basename: 'Plo Koon',
			name: 'Plo Koon',
			crId: 'person-plo-koon',
		});
		const otherFile = new TFile({
			path: 'Story Arcs/Plo Koon.md',
			basename: 'Plo Koon',
			extension: 'md',
		});
		app.vault._addFile(otherFile);

		// First write: produces the path-form target with basename alias.
		const first = createSmartWikilink('Plo Koon', app, 'person-plo-koon');
		expect(first).toBe('[[Charted Roots/People/Plo Koon|Plo Koon]]');

		// Loader's extractName on `[[Charted Roots/People/Plo Koon|Plo Koon]]`
		// returns `Charted Roots/People/Plo Koon|Plo Koon` — pipe-strip yields
		// the alias `Plo Koon`, slash-strip is a no-op (no slash). The writer
		// then re-disambiguates because basename ambiguity is still present.
		const second = createSmartWikilink('Charted Roots/People/Plo Koon|Plo Koon', app, 'person-plo-koon');
		expect(second).toBe('[[Charted Roots/People/Plo Koon|Plo Koon]]');
	});
});
