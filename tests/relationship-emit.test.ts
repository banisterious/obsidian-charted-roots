import { describe, expect, it, vi } from 'vitest';
import {
	applyRelationshipArrayPatch,
	computeRelationshipArrayPatch
} from '../src/core/relationship-emit';

/**
 * Regression coverage for #410 Option 2 — the writer-side preservation
 * of unresolved wikilink entries. Mirrors the load-side tests in
 * `relationship-loader.test.ts`; together they cover the full round trip
 * for `spouse`/`children` legacy-array frontmatter.
 *
 * Key behaviors:
 * - Aligned arrays with some resolved ids → both keys written, empty
 *   slots preserved in the id array.
 * - Aligned arrays with every id empty → id key deleted entirely
 *   (keeps frontmatter clean when resolution hasn't succeeded yet).
 * - Mismatched lengths → safety fallback drops names, writes ids only,
 *   signals via `mismatched: true`.
 * - Scalar-vs-array encoding at length === 1 / > 1.
 */

// A minimal wikilinker that mirrors the writer's format: `[[Name]]`.
const wikilink = (name: string) => `[[${name}]]`;

describe('computeRelationshipArrayPatch', () => {
	describe('aligned, all ids resolved', () => {
		it('single entry produces scalar encoding', () => {
			const patch = computeRelationshipArrayPatch(
				['Alice'],
				['alice-id'],
				wikilink
			);
			expect(patch).toEqual({
				name: '[[Alice]]',
				id: 'alice-id',
				mismatched: false
			});
		});

		it('multiple entries produce array encoding', () => {
			const patch = computeRelationshipArrayPatch(
				['Alice', 'Bob'],
				['alice-id', 'bob-id'],
				wikilink
			);
			expect(patch).toEqual({
				name: ['[[Alice]]', '[[Bob]]'],
				id: ['alice-id', 'bob-id'],
				mismatched: false
			});
		});

		it('calls the wikilinker once per name in order', () => {
			const linker = vi.fn(wikilink);
			computeRelationshipArrayPatch(['A', 'B', 'C'], ['a', 'b', 'c'], linker);
			expect(linker).toHaveBeenCalledTimes(3);
			// Check only the first arg of each call (Array.prototype.map also
			// passes index and array, which we ignore).
			const firstArgs = linker.mock.calls.map(call => call[0]);
			expect(firstArgs).toEqual(['A', 'B', 'C']);
		});
	});

	describe('aligned, some ids empty (#410 Gap C preservation)', () => {
		it('preserves empty-string slot in the id array', () => {
			const patch = computeRelationshipArrayPatch(
				['Alice', 'Ghost', 'Bob'],
				['alice-id', '', 'bob-id'],
				wikilink
			);
			expect(patch.name).toEqual(['[[Alice]]', '[[Ghost]]', '[[Bob]]']);
			expect(patch.id).toEqual(['alice-id', '', 'bob-id']);
			expect(patch.mismatched).toBe(false);
		});

		it('empty slot at end of array is preserved', () => {
			const patch = computeRelationshipArrayPatch(
				['Alice', 'Ghost'],
				['alice-id', ''],
				wikilink
			);
			expect(patch.id).toEqual(['alice-id', '']);
		});

		it('empty slot at start of array is preserved', () => {
			const patch = computeRelationshipArrayPatch(
				['Ghost', 'Alice'],
				['', 'alice-id'],
				wikilink
			);
			expect(patch.id).toEqual(['', 'alice-id']);
		});
	});

	describe('aligned, every id empty (#410 Option 2 prune)', () => {
		it('single entry with empty id signals id deletion', () => {
			const patch = computeRelationshipArrayPatch(
				['Ghost'],
				[''],
				wikilink
			);
			expect(patch.name).toBe('[[Ghost]]');
			expect(patch.id).toBeNull();
			expect(patch.mismatched).toBe(false);
		});

		it('multiple entries, all empty ids, signals id deletion', () => {
			const patch = computeRelationshipArrayPatch(
				['Ghost1', 'Ghost2'],
				['', ''],
				wikilink
			);
			expect(patch.name).toEqual(['[[Ghost1]]', '[[Ghost2]]']);
			expect(patch.id).toBeNull();
			expect(patch.mismatched).toBe(false);
		});
	});

	describe('mismatched lengths (safety fallback)', () => {
		it('names shorter than ids → names dropped, ids emitted, mismatched flagged', () => {
			const patch = computeRelationshipArrayPatch(
				['Alice'],
				['alice-id', 'bob-id'],
				wikilink
			);
			expect(patch.name).toBeNull();
			expect(patch.id).toEqual(['alice-id', 'bob-id']);
			expect(patch.mismatched).toBe(true);
		});

		it('names longer than ids → same safety fallback', () => {
			const patch = computeRelationshipArrayPatch(
				['Alice', 'Bob'],
				['alice-id'],
				wikilink
			);
			expect(patch.name).toBeNull();
			expect(patch.id).toBe('alice-id');
			expect(patch.mismatched).toBe(true);
		});

		it('names undefined → safety fallback', () => {
			const patch = computeRelationshipArrayPatch(
				undefined,
				['alice-id'],
				wikilink
			);
			expect(patch.name).toBeNull();
			expect(patch.id).toBe('alice-id');
			expect(patch.mismatched).toBe(true);
		});

		it('names empty array → safety fallback (length 0 !== ids.length)', () => {
			const patch = computeRelationshipArrayPatch(
				[],
				['alice-id'],
				wikilink
			);
			expect(patch.name).toBeNull();
			expect(patch.id).toBe('alice-id');
			expect(patch.mismatched).toBe(true);
		});
	});
});

describe('applyRelationshipArrayPatch', () => {
	it('writes non-null values to the given keys', () => {
		const fm: Record<string, unknown> = {};
		applyRelationshipArrayPatch(fm, 'spouse', 'spouse_id', {
			name: ['[[Alice]]', '[[Bob]]'],
			id: ['alice-id', 'bob-id'],
			mismatched: false
		});
		expect(fm).toEqual({
			spouse: ['[[Alice]]', '[[Bob]]'],
			spouse_id: ['alice-id', 'bob-id']
		});
	});

	it('deletes keys when patch values are null', () => {
		const fm: Record<string, unknown> = {
			spouse: 'stale',
			spouse_id: 'stale-id'
		};
		applyRelationshipArrayPatch(fm, 'spouse', 'spouse_id', {
			name: null,
			id: null,
			mismatched: false
		});
		expect(fm).not.toHaveProperty('spouse');
		expect(fm).not.toHaveProperty('spouse_id');
	});

	it('mixes delete + write (name preserved, id pruned)', () => {
		const fm: Record<string, unknown> = { spouse_id: 'stale' };
		applyRelationshipArrayPatch(fm, 'spouse', 'spouse_id', {
			name: '[[Ghost]]',
			id: null,
			mismatched: false
		});
		expect(fm.spouse).toBe('[[Ghost]]');
		expect(fm).not.toHaveProperty('spouse_id');
	});

	it('works for children field keys too (not spouse-specific)', () => {
		const fm: Record<string, unknown> = {};
		applyRelationshipArrayPatch(fm, 'children', 'children_id', {
			name: '[[Only Child]]',
			id: 'only-child-id',
			mismatched: false
		});
		expect(fm).toEqual({
			children: '[[Only Child]]',
			children_id: 'only-child-id'
		});
	});
});
