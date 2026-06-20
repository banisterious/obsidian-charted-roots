import { describe, expect, it } from 'vitest';
import { getPlaceCategoryLabel, PLACE_CATEGORY_LABELS } from '../src/models/place';

/**
 * #745 — the Entity Profile heading showed a place's raw category id (e.g.
 * "historical") instead of its display label. getPlaceCategoryLabel maps the
 * id to the human label for display while callers keep the raw id for editing.
 */
describe('getPlaceCategoryLabel (#745)', () => {
	it('maps each known category to its label', () => {
		expect(getPlaceCategoryLabel('real')).toBe('Real');
		expect(getPlaceCategoryLabel('historical')).toBe('Historical');
		expect(getPlaceCategoryLabel('disputed')).toBe('Disputed');
		expect(getPlaceCategoryLabel('legendary')).toBe('Legendary');
		expect(getPlaceCategoryLabel('mythological')).toBe('Mythological');
		expect(getPlaceCategoryLabel('fictional')).toBe('Fictional');
	});

	it('returns an empty string for an unset category', () => {
		expect(getPlaceCategoryLabel('')).toBe('');
		expect(getPlaceCategoryLabel(undefined)).toBe('');
		expect(getPlaceCategoryLabel(null)).toBe('');
	});

	it('falls back to the raw value for an unrecognized id', () => {
		expect(getPlaceCategoryLabel('imaginary')).toBe('imaginary');
	});

	it('covers every category in the label map', () => {
		for (const [id, label] of Object.entries(PLACE_CATEGORY_LABELS)) {
			expect(getPlaceCategoryLabel(id)).toBe(label);
		}
	});
});
