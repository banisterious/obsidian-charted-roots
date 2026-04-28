import { describe, expect, it } from 'vitest';
import {
	planFrontmatterCleanup,
	isPersonFrontmatter,
	getDeletedPersonCrId
} from '../src/core/person-delete-cleanup';

/**
 * #442 — When a person note is deleted, this module sweeps two parallel
 * sets of fields on referencing person notes:
 *
 * 1. `*_id` arrays / scalars (the cr_id sweep — original 0.22.7 fix).
 * 2. Wikilink fields (the wikilink sweep — 0.22.11 follow-up after
 *    DigitalDreamn's confirmation that Obsidian leaves broken `[[deleted]]`
 *    placeholder links in frontmatter on delete).
 *
 * `planFrontmatterCleanup` is the pure rules engine over a frontmatter
 * object. Fencing it here so the field lists and the scalar/array handling
 * stay correct as new relationship types get added.
 */

const DELETED_CR_ID = 'person-test-lars-1234';
const DELETED_BASENAME = 'Test Lars';

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

		// YAML serializers (and the plugin's own writer) emit single-element
		// "array" relationships as a scalar string, not a single-element array.
		// Handling array-only would silently miss every only-child case (and
		// only-step-child, only-partner, etc.). #442 follow-up.
		it('clears children_id when stored as a scalar string match (single child case)', () => {
			const fm = { children_id: DELETED_CR_ID };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([
				{ field: 'children_id', before: DELETED_CR_ID, after: undefined }
			]);
		});

		it('clears step_child_id when stored as a scalar string match', () => {
			const fm = { step_child_id: DELETED_CR_ID };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([
				{ field: 'step_child_id', before: DELETED_CR_ID, after: undefined }
			]);
		});

		it('leaves a scalar array-form field alone when it points elsewhere', () => {
			const fm = { children_id: 'person-other' };
			expect(planFrontmatterCleanup(fm, DELETED_CR_ID)).toEqual([]);
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
		it('does not touch place ids, event ids, source ids, or wikilink fields when deletedBasename is omitted', () => {
			const fm = {
				cr_id: DELETED_CR_ID,                  // own id — never touch
				birth_place_id: DELETED_CR_ID,         // place reference — different namespace
				death_place_id: DELETED_CR_ID,         // ditto
				event_id: DELETED_CR_ID,               // event reference — different namespace
				source_id: DELETED_CR_ID,              // source reference — different namespace
				father: '[[Test Lars]]',               // wikilink — sweep is gated on deletedBasename
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

	describe('wikilink sweep (#442 follow-up)', () => {
		describe('scalar wikilink fields', () => {
			it('clears father when its wikilink resolves to the deleted basename', () => {
				const fm = { father: '[[Test Lars]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{ field: 'father', before: '[[Test Lars]]', after: undefined }
				]);
			});

			it('leaves father alone when the wikilink points at someone else', () => {
				const fm = { father: '[[Owen Lars]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([]);
			});

			it('clears each canonical scalar wikilink field independently', () => {
				const fm = {
					father: '[[Test Lars]]',
					mother: '[[Test Lars]]',
					adoptive_father: '[[Test Lars]]',
					adoptive_mother: '[[Test Lars]]'
				};
				const fields = planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)
					.map(m => m.field).sort();
				expect(fields).toEqual([
					'adoptive_father',
					'adoptive_mother',
					'father',
					'mother'
				]);
			});
		});

		describe('array wikilink fields', () => {
			it('removes the deleted name from step_child (the field DigitalDreamn observed)', () => {
				const fm = { step_child: ['[[Owen Lars]]', '[[Test Lars]]'] };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{
						field: 'step_child',
						before: ['[[Owen Lars]]', '[[Test Lars]]'],
						after: ['[[Owen Lars]]']
					}
				]);
			});

			it('removes the deleted name from children', () => {
				const fm = { children: ['[[Owen Lars]]', '[[Test Lars]]'] };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{
						field: 'children',
						before: ['[[Owen Lars]]', '[[Test Lars]]'],
						after: ['[[Owen Lars]]']
					}
				]);
			});

			it('leaves an array alone when the deleted name is not present', () => {
				const fm = { children: ['[[Owen Lars]]', '[[Beru Lars]]'] };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([]);
			});

			it('reduces a single-element array to an empty array', () => {
				const fm = { step_child: ['[[Test Lars]]'] };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{ field: 'step_child', before: ['[[Test Lars]]'], after: [] }
				]);
			});

			// Mirror of the `_id` scalar-form behavior — the plugin's writer
			// emits `children: "[[Sirkkel Yelar]]"` for an only child rather
			// than a single-element array, so the wikilink sweep has to
			// accept the scalar shape too.
			it('clears children when stored as a scalar wikilink string (single child case)', () => {
				const fm = { children: '[[Test Lars]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{ field: 'children', before: '[[Test Lars]]', after: undefined }
				]);
			});

			it('clears step_child when stored as a scalar wikilink string', () => {
				const fm = { step_child: '[[Test Lars]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{ field: 'step_child', before: '[[Test Lars]]', after: undefined }
				]);
			});

			it('leaves a scalar array-form wikilink alone when it points elsewhere', () => {
				const fm = { children: '[[Owen Lars]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([]);
			});
		});

		describe('polymorphic spouse wikilink', () => {
			it('clears spouse when stored as a single wikilink string', () => {
				const fm = { spouse: '[[Test Lars]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{ field: 'spouse', before: '[[Test Lars]]', after: undefined }
				]);
			});

			it('removes from spouse when stored as an array of wikilinks', () => {
				const fm = { spouse: ['[[Test Lars]]', '[[Other Person]]'] };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([
					{
						field: 'spouse',
						before: ['[[Test Lars]]', '[[Other Person]]'],
						after: ['[[Other Person]]']
					}
				]);
			});

			it('clears indexed spouseN slots (spouse1, spouse2, ...)', () => {
				const fm = {
					spouse1: '[[Other Person]]',
					spouse2: '[[Test Lars]]',
					spouse3: '[[Test Lars]]'
				};
				const fields = planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)
					.map(m => m.field).sort();
				expect(fields).toEqual(['spouse2', 'spouse3']);
			});

			it('does not match keys that look like indexed-spouse but are not', () => {
				const fm = {
					spouseidsomething: '[[Test Lars]]',
					before_spouse1: '[[Test Lars]]'
				};
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([]);
			});
		});

		describe('wikilink format normalization', () => {
			it('handles path-prefixed wikilinks', () => {
				const fm = { father: '[[Charted Roots/People/Test Lars]]' };
				const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME);
				expect(mutations.map(m => m.field)).toEqual(['father']);
			});

			it('handles display-aliased wikilinks', () => {
				const fm = { father: '[[Test Lars|Lars]]' };
				const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME);
				expect(mutations.map(m => m.field)).toEqual(['father']);
			});

			it('matches case-insensitively', () => {
				const fm = { father: '[[test lars]]' };
				const mutations = planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME);
				expect(mutations.map(m => m.field)).toEqual(['father']);
			});

			it('does not match similar-but-different basenames', () => {
				const fm = { father: '[[Test Lars III]]' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([]);
			});

			it('ignores plain (non-wikilink) strings in the same fields', () => {
				const fm = { father: 'Test Lars' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)).toEqual([]);
			});
		});

		describe('combined sweep', () => {
			it('cleans both *_id and wikilink fields in a single pass (the realistic delete case)', () => {
				const fm = {
					cr_type: 'person',
					cr_id: 'person-cliegg',
					children: ['[[Test Lars]]', '[[Owen Lars]]'],
					children_id: [DELETED_CR_ID, 'person-owen'],
					step_child: ['[[Test Lars]]'],
					step_child_id: [DELETED_CR_ID]
				};
				const fields = planFrontmatterCleanup(fm, DELETED_CR_ID, {}, DELETED_BASENAME)
					.map(m => m.field).sort();
				expect(fields).toEqual(['children', 'children_id', 'step_child', 'step_child_id']);
			});
		});

		describe('property aliases on wikilink fields', () => {
			it('honors a renamed wikilink field via the aliases map', () => {
				const fm = { kids: ['[[Test Lars]]', '[[Owen Lars]]'] };
				const aliases = { kids: 'children' };
				expect(planFrontmatterCleanup(fm, DELETED_CR_ID, aliases, DELETED_BASENAME)).toEqual([
					{
						field: 'kids',
						before: ['[[Test Lars]]', '[[Owen Lars]]'],
						after: ['[[Owen Lars]]']
					}
				]);
			});
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
