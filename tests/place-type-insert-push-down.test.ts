import { describe, expect, it } from 'vitest';
import {
	findTypeAtLevel,
	computeInsertPushDown
} from '../src/places/constants/default-place-types';

/**
 * #734 follow-up — inserting/re-levelling a place type onto an occupied level.
 * The neighbour-swap reorder can't make room above the current top, so placing
 * a type there is an opt-in "insert above, push lower types down":
 * - findTypeAtLevel detects whether the chosen level already holds another type
 *   (so the UI knows to offer the tie-vs-push-down choice).
 * - computeInsertPushDown shifts every other type at/below the target down by
 *   one, preserving ties and gaps among the shifted block.
 */

const CAT = [
	{ id: 'galaxy', hierarchyLevel: 0 },
	{ id: 'sector', hierarchyLevel: 1 },
	{ id: 'system', hierarchyLevel: 2 },
];

describe('findTypeAtLevel (#734)', () => {
	it('returns the type occupying the target level', () => {
		expect(findTypeAtLevel(CAT, 1)?.id).toBe('sector');
	});

	it('returns undefined when the level is free', () => {
		expect(findTypeAtLevel(CAT, 5)).toBeUndefined();
	});

	it('skips the excluded id so re-levelling onto its own level is not a clash', () => {
		expect(findTypeAtLevel(CAT, 1, 'sector')).toBeUndefined();
	});

	it('still reports a clash when a different type holds the excluded type\'s old level', () => {
		expect(findTypeAtLevel(CAT, 0, 'sector')?.id).toBe('galaxy');
	});
});

describe('computeInsertPushDown (#734)', () => {
	it('pushes every type at or below the target down by one', () => {
		// Insert a new top type at level 0 (the "Galaxy above Region" case).
		expect(computeInsertPushDown(CAT, 0)).toEqual([
			{ id: 'galaxy', hierarchyLevel: 1 },
			{ id: 'sector', hierarchyLevel: 2 },
			{ id: 'system', hierarchyLevel: 3 },
		]);
	});

	it('leaves shallower types untouched', () => {
		expect(computeInsertPushDown(CAT, 2)).toEqual([
			{ id: 'system', hierarchyLevel: 3 },
		]);
	});

	it('returns nothing when the target is below every existing type', () => {
		expect(computeInsertPushDown(CAT, 9)).toEqual([]);
	});

	it('excludes the type being placed so re-levelling does not shift itself', () => {
		// Country (id sector here) moved down onto level 2; system shifts, sector does not.
		expect(computeInsertPushDown(CAT, 2, 'sector')).toEqual([
			{ id: 'system', hierarchyLevel: 3 },
		]);
	});

	it('preserves an intentional tie by shifting both tied types together', () => {
		const tied = [
			{ id: 'province', hierarchyLevel: 3 },
			{ id: 'state', hierarchyLevel: 3 },
			{ id: 'county', hierarchyLevel: 5 },
		];
		expect(computeInsertPushDown(tied, 3)).toEqual([
			{ id: 'province', hierarchyLevel: 4 },
			{ id: 'state', hierarchyLevel: 4 },
			{ id: 'county', hierarchyLevel: 6 },
		]);
	});

	it('preserves a gap below the insertion point', () => {
		const gapped = [
			{ id: 'a', hierarchyLevel: 5 },
			{ id: 'b', hierarchyLevel: 6 },
			{ id: 'c', hierarchyLevel: 8 },
		];
		// Insert at 6: b and c shift, a stays; the 6->8 gap (now 7->9) is preserved.
		expect(computeInsertPushDown(gapped, 6)).toEqual([
			{ id: 'b', hierarchyLevel: 7 },
			{ id: 'c', hierarchyLevel: 9 },
		]);
	});
});
