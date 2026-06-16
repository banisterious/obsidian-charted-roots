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

describe('reorderTypeWithinCategory (#734)', () => {
	// A custom category whose three types were all left at level 0 (the friction case).
	const allZero = [
		{ id: 'space_region', hierarchyLevel: 0 },
		{ id: 'sector', hierarchyLevel: 0 },
		{ id: 'system', hierarchyLevel: 0 }
	];

	it('renumbers tied levels into a defined, consecutive order', () => {
		// Moving 'system' up from the bottom of a stable all-zero list.
		const result = reorderTypeWithinCategory(allZero, 'system', 'up');
		expect(result).toEqual([
			{ id: 'space_region', hierarchyLevel: 0 },
			{ id: 'system', hierarchyLevel: 1 },
			{ id: 'sector', hierarchyLevel: 2 }
		]);
	});

	it('swaps order while preserving the anchored base level', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 2 },
			{ id: 'b', hierarchyLevel: 3 },
			{ id: 'c', hierarchyLevel: 4 }
		];
		const result = reorderTypeWithinCategory(types, 'c', 'up');
		expect(result).toEqual([
			{ id: 'a', hierarchyLevel: 2 },
			{ id: 'c', hierarchyLevel: 3 },
			{ id: 'b', hierarchyLevel: 4 }
		]);
	});

	it('moves a type down', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 1 },
			{ id: 'c', hierarchyLevel: 2 }
		];
		expect(reorderTypeWithinCategory(types, 'a', 'down').map(t => t.id))
			.toEqual(['b', 'a', 'c']);
	});

	it('is a no-op at the top boundary', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 1 }
		];
		expect(reorderTypeWithinCategory(types, 'a', 'up')).toEqual([]);
	});

	it('is a no-op at the bottom boundary', () => {
		const types = [
			{ id: 'a', hierarchyLevel: 0 },
			{ id: 'b', hierarchyLevel: 1 }
		];
		expect(reorderTypeWithinCategory(types, 'b', 'down')).toEqual([]);
	});

	it('returns empty for an unknown type id', () => {
		expect(reorderTypeWithinCategory(allZero, 'nope', 'up')).toEqual([]);
	});
});
