import { describe, expect, it } from 'vitest';
import {
	planFrontmatterCleanup,
	isPersonFrontmatter,
	getDeletedPersonCrId
} from '../src/core/person-delete-cleanup';

/**
 * #442 — When a person note is deleted, the wikilink references on other
 * notes' relationship arrays are auto-cleaned by Obsidian, but the parallel
 * `*_id` arrays carrying cr_id strings are not. Downstream code (timeline
 * gathering, family chart, exports) tries to resolve dead ids and silently
 * fails on the orphan residue.
 *
 * `planFrontmatterCleanup` is the pure rules engine that decides which
 * fields to mutate on a single note's frontmatter to remove every reference
 * to a given deleted cr_id. Fencing it here so the field list and the
 * scalar/array handling stay correct as new relationship types get added.
 */

const DELETED_CR_ID = 'person-test-lars-1234';

describe('planFrontmatterCleanup (#442)', () => {
	describe('scalar *_id fields', () => {
		it('clears father_id when it matches the deleted cr_id', () => {
			const fm = { father_id: DELETED_CR_ID };
			const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID);
			expect(mutations).toEqual([
				{ field: 'father_id', before: DELETED_CR_ID, after: undefined }
			]);
		});

		it('leaves father_id alone when it points at someone else', () => {
			const fm = { father_id: 'person-other-9999' };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([]);
		});

		it('clears each of the canonical scalar fields independently', () => {
			const fm = {
				father_id: DELETED_CR_ID,
				mother_id: DELETED_CR_ID,
				adoptive_father_id: DELETED_CR_ID,
				adoptive_mother_id: DELETED_CR_ID
			};
			const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID);
			const fields = mutations.map(m => m.field).sort();
			expect(fields).toEqual([
				'adoptive_father_id',
				'adoptive_mother_id',
				'father_id',
				'mother_id'
			]);
			expect(mutations.every(m => m.after === undefined)).toBe(true);
		});
	});

	describe('array *_id fields', () => {
		it('removes the deleted cr_id from step_child_id (the bug DigitalDreamn reported)', () => {
			const fm = { step_child_id: ['person-owen-1', DELETED_CR_ID] };
			const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID);
			expect(mutations).toEqual([
				{ field: 'step_child_id', before: ['person-owen-1', DELETED_CR_ID], after: ['person-owen-1'] }
			]);
		});

		it('leaves an array alone when the deleted cr_id is not present', () => {
			const fm = { children_id: ['person-a', 'person-b'] };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([]);
		});

		it('removes from every canonical array field that contains the cr_id', () => {
			const fm = {
				parents_id: [DELETED_CR_ID, 'person-a'],
				stepfather_id: [DELETED_CR_ID],
				stepmother_id: ['person-b'],
				adoptive_parent_id: [DELETED_CR_ID, 'person-c'],
				adopted_child_id: ['person-d', DELETED_CR_ID],
				partners_id: ['person-e'],
				children_id: [DELETED_CR_ID],
				step_child_id: [DELETED_CR_ID, 'person-f']
			};

			const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID);
			const touched = mutations.map(m => m.field).sort();

			expect(touched).toEqual([
				'adopted_child_id',
				'adoptive_parent_id',
				'children_id',
				'parents_id',
				'step_child_id',
				'stepfather_id'
			]);
			// stepmother_id and partners_id should not be in the mutation list
			expect(touched).not.toContain('stepmother_id');
			expect(touched).not.toContain('partners_id');
		});

		it('reduces a single-element array to an empty array', () => {
			const fm = { stepfather_id: [DELETED_CR_ID] };
			const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID);
			expect(mutations).toEqual([
				{ field: 'stepfather_id', before: [DELETED_CR_ID], after: [] }
			]);
		});
	});

	describe('polymorphic spouse fields', () => {
		it('clears spouse_id when stored as a single string match', () => {
			const fm = { spouse_id: DELETED_CR_ID };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([
				{ field: 'spouse_id', before: DELETED_CR_ID, after: undefined }
			]);
		});

		it('removes from spouse_id when stored as an array', () => {
			const fm = { spouse_id: [DELETED_CR_ID, 'person-second'] };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([
				{ field: 'spouse_id', before: [DELETED_CR_ID, 'person-second'], after: ['person-second'] }
			]);
		});

		it('clears indexed spouseN_id slots (spouse1_id, spouse2_id, ...)', () => {
			const fm = {
				spouse1_id: 'person-other',
				spouse2_id: DELETED_CR_ID,
				spouse3_id: DELETED_CR_ID
			};
			const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID);
			const fields = mutations.map(m => m.field).sort();
			expect(fields).toEqual(['spouse2_id', 'spouse3_id']);
			expect(mutations.every(m => m.after === undefined)).toBe(true);
		});

		it('does not match keys that look like indexed-spouse but are not', () => {
			// Only `spouse\d+_id` should be treated as indexed spouse slots.
			const fm = {
				spouseidsomething: DELETED_CR_ID,    // no digit
				spouse_id_extra: DELETED_CR_ID,      // not the indexed pattern
				before_spouse1_id: DELETED_CR_ID     // anchor mismatch
			};
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([]);
		});
	});

	describe('non-relationship and non-id fields are ignored', () => {
		it('does not touch place ids, event ids, source ids, or wikilink fields', () => {
			const fm = {
				cr_id: DELETED_CR_ID,                  // own id — never touch
				birth_place_id: DELETED_CR_ID,         // place reference — different namespace
				death_place_id: DELETED_CR_ID,         // ditto
				event_id: DELETED_CR_ID,               // event reference — different namespace
				source_id: DELETED_CR_ID,              // source reference — different namespace
				father: '[[Test Lars]]',               // wikilink — Obsidian handles it
				custom_field: DELETED_CR_ID            // user-defined — out of scope
			};
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([]);
		});

		it('returns no mutations for a person note that doesn\'t reference the deleted id at all', () => {
			const fm = {
				cr_type: 'person',
				cr_id: 'person-other',
				name: 'Owen Lars',
				father_id: 'person-cliegg',
				mother_id: 'person-aika'
			};
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([]);
		});
	});

	describe('property aliases', () => {
		it('honors a renamed canonical field via the aliases map', () => {
			// User aliased `father_id` → `papa_id` in their vault.
			const fm = { papa_id: DELETED_CR_ID };
			const aliases = { papa_id: 'father_id' };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID, aliases)).toEqual([
				{ field: 'papa_id', before: DELETED_CR_ID, after: undefined }
			]);
		});

		it('honors a renamed array field via the aliases map', () => {
			const fm = { kids_ids: [DELETED_CR_ID, 'person-other'] };
			const aliases = { kids_ids: 'children_id' };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID, aliases)).toEqual([
				{ field: 'kids_ids', before: [DELETED_CR_ID, 'person-other'], after: ['person-other'] }
			]);
		});
	});
});

describe('isPersonFrontmatter', () => {
	it('returns true for cr_type: person', () => {
		expect(isPersonFrontmatter({ cr_type: 'person', cr_id: 'x' })).toBe(true);
	});

	it('returns true for legacy `type: person` without cr_type', () => {
		expect(isPersonFrontmatter({ type: 'person', cr_id: 'x' })).toBe(true);
	});

	it('returns false for non-person cr_types', () => {
		expect(isPersonFrontmatter({ cr_type: 'place' })).toBe(false);
		expect(isPersonFrontmatter({ cr_type: 'event' })).toBe(false);
		expect(isPersonFrontmatter({ cr_type: 'source' })).toBe(false);
		expect(isPersonFrontmatter({ cr_type: 'organization' })).toBe(false);
	});

	it('returns false for empty / undefined frontmatter', () => {
		expect(isPersonFrontmatter(undefined)).toBe(false);
		expect(isPersonFrontmatter({})).toBe(false);
	});
});

describe('getDeletedPersonCrId', () => {
	it('returns the cr_id when the previous cache had a person frontmatter', () => {
		const prevCache = {
			frontmatter: { cr_type: 'person', cr_id: DELETED_CR_ID }
		} as never;
		expect(getDeletedPersonCrId(prevCache)).toBe(DELETED_CR_ID);
	});

	it('returns null when the deleted file was not a person', () => {
		const prevCache = {
			frontmatter: { cr_type: 'place', cr_id: 'place-x' }
		} as never;
		expect(getDeletedPersonCrId(prevCache)).toBeNull();
	});

	it('returns null when prevCache is null (cache was unavailable)', () => {
		expect(getDeletedPersonCrId(null)).toBeNull();
	});

	it('returns null when frontmatter has no cr_id', () => {
		const prevCache = { frontmatter: { cr_type: 'person' } } as never;
		expect(getDeletedPersonCrId(prevCache)).toBeNull();
	});
});
