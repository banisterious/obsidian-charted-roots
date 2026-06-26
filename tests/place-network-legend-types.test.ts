import { describe, expect, it } from 'vitest';
import {
	PLACE_TYPE_COLORS,
	PLACE_TYPE_LEGEND_ORDER,
	selectPresentPlaceTypes,
} from '../src/ui/place-network-modal';

/**
 * #767 follow-up — the Place hierarchy "Color by: Place type" legend was a fixed
 * five-item list (country/state/city/town/village) while the chart colored ~15
 * built-in types, so types like continent/estate/church were drawn but missing
 * from the legend. Two built-in types (planet, township) also had no color and
 * fell back to grey. The legend now derives from the types actually present, and
 * the color map covers every built-in type. Reported by @DigitalDreamn.
 */
describe('place-network legend type selection (#767)', () => {
	it('covers planet and township with distinct, non-fallback colors', () => {
		expect(PLACE_TYPE_COLORS.planet).toBeDefined();
		expect(PLACE_TYPE_COLORS.township).toBeDefined();
		expect(PLACE_TYPE_COLORS.planet).not.toBe(PLACE_TYPE_COLORS.other);
		expect(PLACE_TYPE_COLORS.township).not.toBe(PLACE_TYPE_COLORS.other);
		expect(PLACE_TYPE_COLORS.planet).not.toBe(PLACE_TYPE_COLORS.township);
	});

	it('legend order excludes the "other" fallback', () => {
		expect(PLACE_TYPE_LEGEND_ORDER).not.toContain('other');
		expect(PLACE_TYPE_LEGEND_ORDER).toContain('planet');
		expect(PLACE_TYPE_LEGEND_ORDER).toContain('township');
	});

	it('returns only the types present, in canonical order', () => {
		// Deliberately out of hierarchy order in the input
		const { types, hasOther } = selectPresentPlaceTypes(['city', 'planet', 'country', 'city']);
		expect(types).toEqual(['planet', 'country', 'city']);
		expect(hasOther).toBe(false);
	});

	it('flags custom/unknown types as "Other" without listing them', () => {
		const { types, hasOther } = selectPresentPlaceTypes(['country', 'astro_sector', 'system']);
		expect(types).toEqual(['country']);
		expect(hasOther).toBe(true);
	});

	it('treats an untyped (undefined) node as "Other"', () => {
		const { types, hasOther } = selectPresentPlaceTypes(['village', undefined]);
		expect(types).toEqual(['village']);
		expect(hasOther).toBe(true);
	});

	it('reports no types and no other for an empty chart', () => {
		expect(selectPresentPlaceTypes([])).toEqual({ types: [], hasOther: false });
	});
});
