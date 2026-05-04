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
