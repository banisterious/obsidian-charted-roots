/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Obsidian API returns any-typed surfaces (frontmatter, file caches); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
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
	const file = makeTFile({ path: 'People/Anakin Skywalker.md', basename: 'Anakin Skywalker', extension: 'md' });
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

/**
 * #724 — the marriage-location field in the spouse-metadata modal was
 * link-only (no Unlink), so a linked marriage location couldn't be removed.
 * The modal now clears `marriageLocation`/`marriageLocationCrId` on unlink;
 * this fences the writer end of that contract — an empty marriage location in
 * the saved metadata removes the spouse{n}_marriage_location(+_id) keys.
 */
describe('updatePersonNote — clearing marriage location (#724)', () => {
	const SEEDED_SPOUSE = {
		cr_type: 'person',
		cr_id: 'person-anakin',
		name: 'Anakin Skywalker',
		spouse1: '[[Padme]]',
		spouse1_id: 'person-padme',
		spouse1_marriage_date: '22 BBY',
		spouse1_marriage_location: '[[Varykino]]',
		spouse1_marriage_location_id: 'place-varykino',
	};

	it('removes spouse marriage_location(+_id) when the location is unlinked but the spouse remains', async () => {
		const app = new App();
		const file = seedPerson(app, { ...SEEDED_SPOUSE });

		await updatePersonNote(app, file, {
			spouseMetadata: [
				// Spouse kept (still has a marriage date → indexed path runs),
				// but the location was unlinked → empty.
				{ name: 'Padme', crId: 'person-padme', marriageDate: '22 BBY', marriageLocation: undefined },
			],
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect('spouse1_marriage_location' in fm).toBe(false);
		expect('spouse1_marriage_location_id' in fm).toBe(false);
		// The spouse and unrelated metadata survive.
		expect(fm.spouse1).toContain('Padme');
		expect(fm.spouse1_marriage_date).toBe('22 BBY');
	});

	it('writes a place-resolved marriage_location when one is linked', async () => {
		const app = new App();
		const placeFile = makeTFile({ path: 'Places/Varykino-Naboo.md', basename: 'Varykino-Naboo', extension: 'md' });
		app.vault._addFile(placeFile);
		app.metadataCache._setFrontmatter(placeFile, { cr_type: 'place', cr_id: 'place-varykino', name: 'Varykino' });
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, {
			spouseMetadata: [
				{ name: 'Padme', crId: 'person-padme', marriageLocation: 'Varykino', marriageLocationCrId: 'place-varykino' },
			],
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		// Resolved to the diverging-filename place note, not a bare [[Varykino]].
		expect(fm.spouse1_marriage_location).toBe('[[Varykino-Naboo|Varykino]]');
		expect(fm.spouse1_marriage_location_id).toBe('place-varykino');
	});
});

describe('updatePersonNote — burial date (#682)', () => {
	it('writes a provided burial date', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, { burialDate: '19 BBY' } as Partial<PersonData>);

		expect(frontmatterOf(app, file).burial_date).toBe('19 BBY');
	});

	it('removes burial_date when cleared with an empty string', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker', burial_date: '19 BBY' });

		await updatePersonNote(app, file, { burialDate: '' } as Partial<PersonData>);

		expect('burial_date' in frontmatterOf(app, file)).toBe(false);
	});

	it('leaves an existing burial date untouched when not provided (undefined)', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker', burial_date: '19 BBY' });

		await updatePersonNote(app, file, { name: 'Anakin Skywalker' } as Partial<PersonData>);

		expect(frontmatterOf(app, file).burial_date).toBe('19 BBY');
	});
});

describe('updatePersonNote — heals missing cr_type (#744)', () => {
	it('adds cr_type: person when the note has none (the #742 footgun)', async () => {
		const app = new App();
		// A note that got a cr_id but never ran "Add essential person properties".
		const file = seedPerson(app, { cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, { name: 'Anakin Skywalker' } as Partial<PersonData>);

		expect(frontmatterOf(app, file).cr_type).toBe('person');
	});

	it('adds cr_type: person when the value is present but empty', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: '', cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, { name: 'Anakin Skywalker' } as Partial<PersonData>);

		expect(frontmatterOf(app, file).cr_type).toBe('person');
	});

	it('leaves an existing cr_type untouched (never clobbers a deliberate type)', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'character', cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, { name: 'Anakin Skywalker' } as Partial<PersonData>);

		expect(frontmatterOf(app, file).cr_type).toBe('character');
	});
});

describe('updatePersonNote — name parts (#709)', () => {
	it('writes a provided name prefix, suffix, and surname prefix', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker' });

		await updatePersonNote(app, file, {
			namePrefix: 'Dr.',
			nameSuffix: 'Jr.',
			surnamePrefix: 'von',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect(fm.name_prefix).toBe('Dr.');
		expect(fm.name_suffix).toBe('Jr.');
		expect(fm.surname_prefix).toBe('von');
	});

	it('removes name parts when cleared with empty strings', async () => {
		const app = new App();
		const file = seedPerson(app, {
			cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker',
			name_prefix: 'Dr.', name_suffix: 'Jr.', surname_prefix: 'von',
		});

		await updatePersonNote(app, file, {
			namePrefix: '',
			nameSuffix: '',
			surnamePrefix: '',
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect('name_prefix' in fm).toBe(false);
		expect('name_suffix' in fm).toBe(false);
		expect('surname_prefix' in fm).toBe(false);
	});

	it('leaves existing name parts untouched when not provided (undefined)', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-anakin', name: 'Anakin Skywalker', name_prefix: 'Dr.' });

		await updatePersonNote(app, file, { name: 'Anakin Skywalker' } as Partial<PersonData>);

		expect(frontmatterOf(app, file).name_prefix).toBe('Dr.');
	});
});

describe('updatePersonNote — gender-neutral parents (#754)', () => {
	it('writes parents and parents_id for a single sex-unknown parent', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-child', name: 'Child' });

		await updatePersonNote(app, file, {
			parentCrId: ['person-central'],
			parentName: ['[[Central]]'],
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect(fm.parents).toBe('[[Central]]');
		expect(fm.parents_id).toBe('person-central');
	});

	it('writes parents and parents_id as arrays for multiple parents', async () => {
		const app = new App();
		const file = seedPerson(app, { cr_type: 'person', cr_id: 'person-child', name: 'Child' });

		await updatePersonNote(app, file, {
			parentCrId: ['person-a', 'person-b'],
			parentName: ['[[Parent A]]', '[[Parent B]]'],
		} as Partial<PersonData>);

		const fm = frontmatterOf(app, file);
		expect(fm.parents).toEqual(['[[Parent A]]', '[[Parent B]]']);
		expect(fm.parents_id).toEqual(['person-a', 'person-b']);
	});
});
