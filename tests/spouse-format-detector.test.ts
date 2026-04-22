import { describe, expect, it } from 'vitest';
import { detectSpouseTargetFormat } from '../src/core/spouse-format-detector';

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
