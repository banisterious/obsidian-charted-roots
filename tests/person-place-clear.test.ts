/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Obsidian API returns any-typed surfaces (frontmatter, file caches); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { updatePersonNote, type PersonData } from '../src/core/person-note-writer';

/**
 * #680 — unlinking a person's birth/death place in the Edit Person modal and
 * saving left the wikilink behind. The modal signalled the cleared field with
 * `undefined`, but the writer reads `undefined` as "leave unchanged" and an
 * empty string as "clear this property" (the same convention father/mother
 * use). These fence the writer contract the fix relies on: '' clears both the
 * wikilink and its companion _id, while undefined leaves them alone.
 */

function seedPerson(app: App, frontmatter: Record<string, unknown>): TFile {
	const file = new TFile({ path: 'People/Anakin Skywalker.md', basename: 'Anakin Skywalker', extension: 'md' });
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, frontmatter);
	return file;
}

function frontmatterOf(app: App, file: TFile): Record<string, unknown> {
	return (app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
}

const SEEDED = {
	cr_type: 'person',
	cr_id: 'person-anakin',
	name: 'Anakin Skywalker',
	birth_place: '[[Tatooine]]',
	birth_place_id: 'place-tatooine',
	death_place: '[[Mustafar]]',
	death_place_id: 'place-mustafar',
};

describe('updatePersonNote — clearing birth/death place (#680)', () => {
	it('removes birth_place and birth_place_id when cleared with empty strings', async () => {
		const app = new App();
		const file = seedPerson(app, { ...SEEDED });

		await updatePersonNote(app, file, {
			birthPlaceCrId: '',
			birthPlaceName: '',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect('birth_place' in fm).toBe(false);
		expect('birth_place_id' in fm).toBe(false);
		// Death place was not touched in this call → left intact.
		expect(fm.death_place).toBe('[[Mustafar]]');
		expect(fm.death_place_id).toBe('place-mustafar');
	});

	it('removes death_place and death_place_id when cleared with empty strings', async () => {
		const app = new App();
		const file = seedPerson(app, { ...SEEDED });

		await updatePersonNote(app, file, {
			deathPlaceCrId: '',
			deathPlaceName: '',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect('death_place' in fm).toBe(false);
		expect('death_place_id' in fm).toBe(false);
		expect(fm.birth_place).toBe('[[Tatooine]]');
	});

	it('clears both places in one save', async () => {
		const app = new App();
		const file = seedPerson(app, { ...SEEDED });

		await updatePersonNote(app, file, {
			birthPlaceCrId: '',
			birthPlaceName: '',
			deathPlaceCrId: '',
			deathPlaceName: '',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect('birth_place' in fm).toBe(false);
		expect('birth_place_id' in fm).toBe(false);
		expect('death_place' in fm).toBe(false);
		expect('death_place_id' in fm).toBe(false);
	});

	it('leaves an existing place untouched when the field is not provided (undefined)', async () => {
		// The pre-#680 modal sent undefined, which is the "leave unchanged"
		// signal — this is the behavior that made the bug; the writer is correct,
		// the modal now sends '' instead.
		const app = new App();
		const file = seedPerson(app, { ...SEEDED });

		await updatePersonNote(app, file, {
			name: 'Anakin Skywalker',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect(fm.birth_place).toBe('[[Tatooine]]');
		expect(fm.birth_place_id).toBe('place-tatooine');
		expect(fm.death_place).toBe('[[Mustafar]]');
	});

	it('still sets a new place when provided', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, {
			birthPlaceCrId: 'place-naboo',
			birthPlaceName: 'Naboo',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect(fm.birth_place).toContain('Naboo');
		expect(fm.birth_place_id).toBe('place-naboo');
	});
});
