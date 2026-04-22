import { describe, expect, it } from 'vitest';
import {
	addFlatRelationship,
	normalizeToArray
} from '../src/relationships/relationship-property-writer';

/**
 * Regression coverage for #419 — symmetric custom relationships now
 * auto-propagate to the target. The writer helper underpins both the
 * source-side add and the reciprocal mirror, so these tests fence the
 * add/skip/duplicate contract and the scalar-vs-array encoding that
 * callers round-trip to Obsidian frontmatter.
 */

describe('normalizeToArray', () => {
	it('null returns empty array', () => {
		expect(normalizeToArray(null)).toEqual([]);
	});

	it('undefined returns empty array', () => {
		expect(normalizeToArray(undefined)).toEqual([]);
	});

	it('empty string returns empty array', () => {
		expect(normalizeToArray('')).toEqual([]);
	});

	it('scalar string returns single-element array', () => {
		expect(normalizeToArray('[[Alice]]')).toEqual(['[[Alice]]']);
	});

	it('string array returns a copy with entries preserved', () => {
		expect(normalizeToArray(['[[Alice]]', '[[Bob]]'])).toEqual(['[[Alice]]', '[[Bob]]']);
	});

	it('non-string scalar is JSON-stringified', () => {
		expect(normalizeToArray(42)).toEqual(['42']);
	});

	it('array with non-string entries stringifies the non-strings', () => {
		expect(normalizeToArray(['[[Alice]]', 42])).toEqual(['[[Alice]]', '42']);
	});
});

describe('addFlatRelationship', () => {
	describe('add to empty frontmatter', () => {
		it('returns "added" and writes scalar encoding for single entry', () => {
			const fm: Record<string, unknown> = {};

			const result = addFlatRelationship(fm, 'twin', '[[Alice]]', 'cr_alice');

			expect(result).toBe('added');
			expect(fm.twin).toBe('[[Alice]]');
			expect(fm.twin_id).toBe('cr_alice');
		});
	});

	describe('add when scalar entry already present', () => {
		it('promotes both keys to arrays on the second add', () => {
			const fm: Record<string, unknown> = {
				twin: '[[Alice]]',
				twin_id: 'cr_alice'
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('added');
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]']);
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob']);
		});
	});

	describe('add when array already present', () => {
		it('appends to the existing arrays', () => {
			const fm: Record<string, unknown> = {
				twin: ['[[Alice]]', '[[Bob]]'],
				twin_id: ['cr_alice', 'cr_bob']
			};

			const result = addFlatRelationship(fm, 'twin', '[[Carol]]', 'cr_carol');

			expect(result).toBe('added');
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]', '[[Carol]]']);
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob', 'cr_carol']);
		});
	});

	describe('duplicate cr_id', () => {
		it('returns "duplicate" and does not mutate frontmatter (scalar case)', () => {
			const fm: Record<string, unknown> = {
				twin: '[[Alice]]',
				twin_id: 'cr_alice'
			};

			const result = addFlatRelationship(fm, 'twin', '[[Alice]]', 'cr_alice');

			expect(result).toBe('duplicate');
			expect(fm.twin).toBe('[[Alice]]');
			expect(fm.twin_id).toBe('cr_alice');
		});

		it('returns "duplicate" and does not mutate frontmatter (array case)', () => {
			const fm: Record<string, unknown> = {
				twin: ['[[Alice]]', '[[Bob]]'],
				twin_id: ['cr_alice', 'cr_bob']
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('duplicate');
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]']);
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob']);
		});
	});

	describe('unrelated keys', () => {
		it('preserves unrelated frontmatter entries', () => {
			const fm: Record<string, unknown> = {
				name: 'Alice',
				cr_id: 'cr_alice',
				spouse: '[[Bob]]',
				spouse_id: 'cr_bob'
			};

			addFlatRelationship(fm, 'twin', '[[Carol]]', 'cr_carol');

			expect(fm.name).toBe('Alice');
			expect(fm.cr_id).toBe('cr_alice');
			expect(fm.spouse).toBe('[[Bob]]');
			expect(fm.spouse_id).toBe('cr_bob');
			expect(fm.twin).toBe('[[Carol]]');
			expect(fm.twin_id).toBe('cr_carol');
		});
	});

	describe('mismatched-state input', () => {
		it('handles target key present without id key (legacy wikilink-only row)', () => {
			const fm: Record<string, unknown> = {
				twin: '[[Alice]]'
				// twin_id intentionally missing
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('added');
			// Source target gets promoted to array; id key starts fresh with
			// a single id, so it normalizes to scalar.
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]']);
			expect(fm.twin_id).toBe('cr_bob');
		});

		it('handles id key present without target key (legacy id-only row)', () => {
			const fm: Record<string, unknown> = {
				twin_id: 'cr_alice'
				// twin intentionally missing
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('added');
			expect(fm.twin).toBe('[[Bob]]');
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob']);
		});
	});

	describe('different relationship types coexist', () => {
		it('adding twin does not touch the mentor pair', () => {
			const fm: Record<string, unknown> = {
				mentor: '[[Alice]]',
				mentor_id: 'cr_alice'
			};

			addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(fm.mentor).toBe('[[Alice]]');
			expect(fm.mentor_id).toBe('cr_alice');
			expect(fm.twin).toBe('[[Bob]]');
			expect(fm.twin_id).toBe('cr_bob');
		});
	});
});
