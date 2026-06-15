import { describe, expect, it } from 'vitest';
import { reorderPlaceTypeCategories } from '../src/places/constants/default-place-types';

/**
 * #733 — a custom place type category couldn't sort above the built-ins because
 * the built-ins occupy fixed sort positions (0–4) and ties resolve in their
 * favor. reorderPlaceTypeCategories renumbers the whole list sequentially after
 * a move, so order becomes WYSIWYG and a custom category can reach the top.
 */
describe('reorderPlaceTypeCategories (#733)', () => {
	// A custom "astrographical" category sitting at the bottom, below the built-ins.
	const order = ['geographic', 'political', 'settlement', 'subdivision', 'structure', 'astrographical'];

	it('moves a category up one step and renumbers sequentially', () => {
		const result = reorderPlaceTypeCategories(order, 'astrographical', 'up');
		expect(result.map(r => r.id)).toEqual([
			'geographic', 'political', 'settlement', 'subdivision', 'astrographical', 'structure'
		]);
		expect(result.map(r => r.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it('moves a category down one step', () => {
		const result = reorderPlaceTypeCategories(order, 'subdivision', 'down');
		expect(result.map(r => r.id)).toEqual([
			'geographic', 'political', 'settlement', 'structure', 'subdivision', 'astrographical'
		]);
	});

	it('lets a custom category reach the very top via repeated up-moves', () => {
		let current = order.map(id => id);
		for (let i = 0; i < 5; i++) {
			current = reorderPlaceTypeCategories(current, 'astrographical', 'up').map(r => r.id);
		}
		expect(current[0]).toBe('astrographical');
		// And it carries sortOrder 0 after the final move.
		const final = reorderPlaceTypeCategories(current, 'astrographical', 'up');
		expect(final.find(r => r.id === 'astrographical')?.sortOrder).toBe(0);
	});

	it('is a no-op at the top boundary but still returns sequential numbering', () => {
		const result = reorderPlaceTypeCategories(order, 'geographic', 'up');
		expect(result.map(r => r.id)).toEqual(order);
		expect(result.map(r => r.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it('is a no-op at the bottom boundary', () => {
		const result = reorderPlaceTypeCategories(order, 'astrographical', 'down');
		expect(result.map(r => r.id)).toEqual(order);
	});

	it('returns sequential numbering for an unknown id without reordering', () => {
		const result = reorderPlaceTypeCategories(order, 'does_not_exist', 'up');
		expect(result.map(r => r.id)).toEqual(order);
		expect(result.map(r => r.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
	});
});
