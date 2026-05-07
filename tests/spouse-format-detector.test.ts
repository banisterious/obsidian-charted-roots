import { describe, expect, it } from 'vitest';
import {
	detectSpouseTargetFormat,
	findNextOpenSpouseSlot,
	isSpouseInFrontmatter
} from '../src/core/spouse-format-detector';

/**
 * Regression coverage for #420 Gap B — the bidirectional linker must
 * preserve a target's existing spouse frontmatter format when writing
 * a new reciprocal spouse entry. Writing flat `spouse:` onto a target
 * that uses indexed `spouseN:` produces duplicate YAML keys and wipes
 * the indexed list (silent data loss on any cross-note bidi write).
 *
 * The helper is pure, so tests exercise it directly against plain
 * frontmatter objects without an Obsidian vault.
 */

describe('detectSpouseTargetFormat', () => {
	describe('empty / flat frontmatter', () => {
		it('empty frontmatter → flat', () => {
			expect(detectSpouseTargetFormat({})).toEqual({ format: 'flat' });
		});

		it('flat spouse key only → flat', () => {
			expect(detectSpouseTargetFormat({
				spouse: '[[Alice]]',
				spouse_id: 'cr_alice'
			})).toEqual({ format: 'flat' });
		});

		it('flat spouse as array → flat', () => {
			expect(detectSpouseTargetFormat({
				spouse: ['[[Alice]]', '[[Bob]]'],
				spouse_id: ['cr_alice', 'cr_bob']
			})).toEqual({ format: 'flat' });
		});

		it('unrelated keys only → flat', () => {
			expect(detectSpouseTargetFormat({
				name: 'William',
				cr_id: 'cr_william',
				father: '[[Grandpa]]'
			})).toEqual({ format: 'flat' });
		});
	});

	describe('indexed format — slot detection', () => {
		it('single spouse1 → indexed, nextIndex 2', () => {
			expect(detectSpouseTargetFormat({
				spouse1: '[[Alice]]',
				spouse1_id: 'cr_alice'
			})).toEqual({ format: 'indexed', nextIndex: 2 });
		});

		it('spouse1 and spouse2 → indexed, nextIndex 3', () => {
			expect(detectSpouseTargetFormat({
				spouse1: '[[Alice]]',
				spouse1_id: 'cr_alice',
				spouse2: '[[Bob]]',
				spouse2_id: 'cr_bob'
			})).toEqual({ format: 'indexed', nextIndex: 3 });
		});

		it('spouse1-3 → indexed, nextIndex 4', () => {
			expect(detectSpouseTargetFormat({
				spouse1: '[[Alice]]',
				spouse1_id: 'cr_alice',
				spouse2: '[[Bob]]',
				spouse2_id: 'cr_bob',
				spouse3: '[[Carol]]',
				spouse3_id: 'cr_carol'
			})).toEqual({ format: 'indexed', nextIndex: 4 });
		});
	});

	describe('indexed format — gaps in indexing', () => {
		it('spouse1 and spouse3 (gap at 2) → indexed, nextIndex 2 fills the gap', () => {
			expect(detectSpouseTargetFormat({
				spouse1: '[[Alice]]',
				spouse1_id: 'cr_alice',
				spouse3: '[[Carol]]',
				spouse3_id: 'cr_carol'
			})).toEqual({ format: 'indexed', nextIndex: 2 });
		});

		it('spouse2 only (no spouse1) → indexed, nextIndex 1 fills slot 1', () => {
			expect(detectSpouseTargetFormat({
				spouse2: '[[Bob]]',
				spouse2_id: 'cr_bob'
			})).toEqual({ format: 'indexed', nextIndex: 1 });
		});
	});

	describe('partial slot usage', () => {
		it('spouse1 set but spouse1_id missing → slot counts as used', () => {
			expect(detectSpouseTargetFormat({
				spouse1: '[[Alice]]'
			})).toEqual({ format: 'indexed', nextIndex: 2 });
		});

		it('spouse1_id set but spouse1 missing → slot counts as used', () => {
			expect(detectSpouseTargetFormat({
				spouse1_id: 'cr_alice'
			})).toEqual({ format: 'indexed', nextIndex: 2 });
		});
	});

	describe('empty-value slots', () => {
		it('spouse1 empty string + spouse1_id empty → not used, remains flat', () => {
			expect(detectSpouseTargetFormat({
				spouse1: '',
				spouse1_id: ''
			})).toEqual({ format: 'flat' });
		});

		it('spouse1 null + spouse1_id null → not used, remains flat', () => {
			expect(detectSpouseTargetFormat({
				spouse1: null,
				spouse1_id: null
			})).toEqual({ format: 'flat' });
		});

		it('spouse1 empty array → not used, remains flat', () => {
			expect(detectSpouseTargetFormat({
				spouse1: []
			})).toEqual({ format: 'flat' });
		});
	});

	describe('mixed-state recovery (#420)', () => {
		it('indexed slots AND residue flat spouse key → indexed wins', () => {
			// The scenario #420 reproduces: a target with indexed spouses
			// receives a buggy flat-format bidi write, leaving a stray
			// `spouse:` key. Next time a new spouse needs to be added, the
			// detector should still route to indexed so the corruption
			// doesn't compound.
			expect(detectSpouseTargetFormat({
				spouse1: '[[Alice]]',
				spouse1_id: 'cr_alice',
				spouse2: '[[Bob]]',
				spouse2_id: 'cr_bob',
				spouse: '[[Lucinda]]',
				spouse_id: 'cr_lucinda'
			})).toEqual({ format: 'indexed', nextIndex: 3 });
		});
	});

	describe('edge — all slots full', () => {
		it('all ten indexed slots used → indexed, nextIndex past max', () => {
			const fm: Record<string, unknown> = {};
			for (let i = 1; i <= 10; i++) {
				fm[`spouse${i}`] = `[[Person${i}]]`;
				fm[`spouse${i}_id`] = `cr_${i}`;
			}
			expect(detectSpouseTargetFormat(fm)).toEqual({
				format: 'indexed',
				nextIndex: 11
			});
		});
	});
});

/**
 * Regression coverage for #534 — when the source provides marriage
 * details, the bidirectional linker must land the target in indexed
 * format so the `spouseN_*` companion-field namespace exists to
 * receive them. `findNextOpenSpouseSlot` exposes the next open slot
 * uniformly regardless of whether the target detector reports flat or
 * indexed, so the linker can pick a slot in either case.
 */
describe('findNextOpenSpouseSlot', () => {
	it('empty frontmatter → slot 1', () => {
		expect(findNextOpenSpouseSlot({})).toBe(1);
	});

	it('flat spouse data only → slot 1 (indexed namespace is untouched)', () => {
		expect(findNextOpenSpouseSlot({
			spouse: '[[Alice]]',
			spouse_id: 'cr_alice'
		})).toBe(1);
	});

	it('spouse1 used → slot 2', () => {
		expect(findNextOpenSpouseSlot({
			spouse1: '[[Alice]]',
			spouse1_id: 'cr_alice'
		})).toBe(2);
	});

	it('spouse1 + spouse2 used → slot 3', () => {
		expect(findNextOpenSpouseSlot({
			spouse1: '[[Alice]]',
			spouse1_id: 'cr_alice',
			spouse2: '[[Bob]]',
			spouse2_id: 'cr_bob'
		})).toBe(3);
	});

	it('spouse1 + spouse3 (gap at 2) → slot 2 fills gap', () => {
		expect(findNextOpenSpouseSlot({
			spouse1: '[[Alice]]',
			spouse1_id: 'cr_alice',
			spouse3: '[[Carol]]',
			spouse3_id: 'cr_carol'
		})).toBe(2);
	});

	it('spouse2 only (no spouse1) → slot 1', () => {
		expect(findNextOpenSpouseSlot({
			spouse2: '[[Bob]]',
			spouse2_id: 'cr_bob'
		})).toBe(1);
	});

	it('partial slot — wikilink set, id missing → counts as used', () => {
		expect(findNextOpenSpouseSlot({
			spouse1: '[[Alice]]'
		})).toBe(2);
	});

	it('partial slot — id set, wikilink missing → counts as used', () => {
		expect(findNextOpenSpouseSlot({
			spouse1_id: 'cr_alice'
		})).toBe(2);
	});

	it('empty-value slots (empty string / null) → slot 1', () => {
		expect(findNextOpenSpouseSlot({
			spouse1: '',
			spouse1_id: null
		})).toBe(1);
	});

	it('all ten slots full → returns 11 (past max)', () => {
		const fm: Record<string, unknown> = {};
		for (let i = 1; i <= 10; i++) {
			fm[`spouse${i}`] = `[[Person${i}]]`;
			fm[`spouse${i}_id`] = `cr_${i}`;
		}
		expect(findNextOpenSpouseSlot(fm)).toBe(11);
	});
});

/**
 * Regression coverage for #423 — the bidirectional linker must recognize
 * when a spouse wikilink has simply moved between flat and indexed
 * format on the same note, rather than being removed entirely. Without
 * this check, a phantom-deletion cascade wipes spouse data on both
 * sides of the relationship whenever a user edits a spouse entry in a
 * way that migrates format (e.g., adding marriage metadata, which
 * upgrades flat `spouse:` to indexed `spouse1:`).
 */
describe('isSpouseInFrontmatter', () => {
	describe('empty frontmatter', () => {
		it('empty frontmatter returns false', () => {
			expect(isSpouseInFrontmatter({}, '[[Alice]]')).toBe(false);
		});

		it('empty wikilink returns false', () => {
			expect(isSpouseInFrontmatter({ spouse: '[[Alice]]' }, '')).toBe(false);
		});
	});

	describe('flat format', () => {
		it('scalar spouse field matching wikilink returns true', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: '[[Alice]]' },
				'[[Alice]]'
			)).toBe(true);
		});

		it('scalar spouse field not matching returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: '[[Bob]]' },
				'[[Alice]]'
			)).toBe(false);
		});

		it('array spouse field with match returns true', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: ['[[Alice]]', '[[Bob]]'] },
				'[[Alice]]'
			)).toBe(true);
		});

		it('array spouse field without match returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: ['[[Bob]]', '[[Carol]]'] },
				'[[Alice]]'
			)).toBe(false);
		});
	});

	describe('indexed format', () => {
		it('spouse1 matching returns true', () => {
			expect(isSpouseInFrontmatter(
				{ spouse1: '[[Alice]]', spouse1_id: 'cr_alice' },
				'[[Alice]]'
			)).toBe(true);
		});

		it('spouse5 matching returns true (tests full range probe)', () => {
			expect(isSpouseInFrontmatter(
				{ spouse5: '[[Alice]]' },
				'[[Alice]]'
			)).toBe(true);
		});

		it('spouse10 matching returns true (boundary)', () => {
			expect(isSpouseInFrontmatter(
				{ spouse10: '[[Alice]]' },
				'[[Alice]]'
			)).toBe(true);
		});

		it('none of the indexed slots match returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse1: '[[Bob]]', spouse2: '[[Carol]]' },
				'[[Alice]]'
			)).toBe(false);
		});
	});

	describe('format migration scenarios (#423)', () => {
		it('flat → indexed: previous flat wikilink now under spouse1 → still present', () => {
			// User edited a person to add marriage metadata, upgrading their
			// spouse from flat to indexed. The deletion detector must NOT
			// fire — the spouse is still there, just in a different location.
			expect(isSpouseInFrontmatter(
				{
					spouse1: '[[Urgan]]',
					spouse1_id: 'lyr-164-uqp-488',
					spouse1_marriage_date: 'DE ~1269'
				},
				'[[Urgan]]'
			)).toBe(true);
		});

		it('indexed → flat: previous spouse1 wikilink now under spouse → still present', () => {
			// Inverse case: user removes marriage metadata from an indexed
			// spouse, collapsing back to flat format. Same guarantee needed.
			expect(isSpouseInFrontmatter(
				{ spouse: '[[Urgan]]', spouse_id: 'lyr-164-uqp-488' },
				'[[Urgan]]'
			)).toBe(true);
		});

		it('genuine removal: wikilink absent from all locations → false', () => {
			// The legitimate deletion case. Cascade SHOULD fire here.
			expect(isSpouseInFrontmatter(
				{
					name: 'Person 2',
					spouse1: '[[Someone Else]]'
				},
				'[[Urgan]]'
			)).toBe(false);
		});

		it('mixed state: flat residue + indexed slots, match on indexed → true', () => {
			expect(isSpouseInFrontmatter(
				{
					spouse1: '[[Alice]]',
					spouse2: '[[Bob]]',
					spouse: '[[Carol]]'
				},
				'[[Bob]]'
			)).toBe(true);
		});

		it('mixed state: flat residue + indexed slots, match on flat → true', () => {
			expect(isSpouseInFrontmatter(
				{
					spouse1: '[[Alice]]',
					spouse: '[[Bob]]'
				},
				'[[Bob]]'
			)).toBe(true);
		});
	});

	describe('null / empty values', () => {
		it('spouse field set to empty string returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: '' },
				'[[Alice]]'
			)).toBe(false);
		});

		it('spouse field set to null returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: null },
				'[[Alice]]'
			)).toBe(false);
		});

		it('spouse field set to empty array returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: [] },
				'[[Alice]]'
			)).toBe(false);
		});
	});

	describe('object-shaped value (legacy edge)', () => {
		it('object with matching link property returns true', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: { link: '[[Alice]]' } },
				'[[Alice]]'
			)).toBe(true);
		});

		it('object without link property returns false', () => {
			expect(isSpouseInFrontmatter(
				{ spouse: { name: 'Alice' } },
				'[[Alice]]'
			)).toBe(false);
		});
	});
});
