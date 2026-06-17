import { describe, expect, it } from 'vitest';
import {
	nextHierarchyLevelForCategory,
	reorderTypeWithinCategory
} from '../src/places/constants/default-place-types';

/**
 * #734 — smarter, less tedious hierarchy ranks for place types.
 * - nextHierarchyLevelForCategory: a new type defaults one level deeper than the
 *   deepest existing type in its category (or the category's range minimum when
 *   empty), so successive adds auto-increment instead of all landing at 0.
 * - reorderTypeWithinCategory: moving a type up/down renumbers the category to
 *   consecutive levels anchored at its current minimum, realizing the order and
 *   breaking ties.
 */
describe('nextHierarchyLevelForCategory (#734)', () => {
	it('returns deepest existing level + 1 when the category has types', () => {
		expect(nextHierarchyLevelForCategory('settlement', [6, 7, 8])).toBe(9);
		expect(nextHierarchyLevelForCategory('astrographical', [0, 1, 2])).toBe(3);
	});

	it('starts at the category range minimum when empty (built-in)', () => {
		expect(nextHierarchyLevelForCategory('political', [])).toBe(2);
		expect(nextHierarchyLevelForCategory('settlement', [])).toBe(6);
	});

	it('starts at 0 for an empty custom category (default range)', () => {
		expect(nextHierarchyLevelForCategory('astrographical', [])).toBe(0);
	});
});

describe('reorderTypeWithinCategory (#734 swap-adjacent)', () => {
	it('swaps the two adjacent levels and returns only the changed pair', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 2 },
			{ id: 'b', hierarchyLevel: 3 },
			{ id: 'c', hierarchyLevel: 4 }
		];
		// Move 'c' up past 'b' — only c and b change levels.
		expect(reorderTypeWithinCategory(types, 'c', 'up')).toEqual([
			{ id: 'c', hierarchyLevel: 3 },
			{ id: 'b', hierarchyLevel: 4 }
		]);
	});

	it('preserves gaps by swapping the exact two levels', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 2 },
			{ id: 'b', hierarchyLevel: 5 },
			{ id: 'c', hierarchyLevel: 7 }
		];
		expect(reorderTypeWithinCategory(types, 'b', 'up')).toEqual([
			{ id: 'b', hierarchyLevel: 2 },
			{ id: 'a', hierarchyLevel: 5 }
		]);
	});

	it('leaves an unrelated tie untouched (the Province/State case)', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 1 },
			{ id: 'province', hierarchyLevel: 2 },
			{ id: 'state', hierarchyLevel: 2 }
		];
		// Reordering a/b doesn't mention province or state at all.
		const result = reorderTypeWithinCategory(types, 'b', 'up');
		expect(result).toEqual([
			{ id: 'b', hierarchyLevel: 0 },
			{ id: 'a', hierarchyLevel: 1 }
		]);
		expect(result.some(r => r.id === 'province' || r.id === 'state')).toBe(false);
	});

	it('moves a type down', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 1 },
			{ id: 'c', hierarchyLevel: 2 }
		];
		expect(reorderTypeWithinCategory(types, 'a', 'down')).toEqual([
			{ id: 'a', hierarchyLevel: 1 },
			{ id: 'b', hierarchyLevel: 0 }
		]);
	});

	it('is a no-op when the neighbour shares the same level (preserve the tie)', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 0 }
		];
		expect(reorderTypeWithinCategory(types, 'b', 'up')).toEqual([]);
	});

	it('is a no-op at the top and bottom boundaries', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 1 }
		];
		expect(reorderTypeWithinCategory(types, 'a', 'up')).toEqual([]);
		expect(reorderTypeWithinCategory(types, 'b', 'down')).toEqual([]);
	});

	it('returns empty for an unknown type id', () => {
		const types = [{ id: 'a', hierarchyLevel: 0 }, { id: 'b', hierarchyLevel: 1 }];
		expect(reorderTypeWithinCategory(types, 'nope', 'up')).toEqual([]);
	});
});
