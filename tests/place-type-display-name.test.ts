import { describe, expect, it } from 'vitest';
import { getPlaceTypeDisplayName } from '../src/places/constants/default-place-types';
import type { PlaceTypeDefinition } from '../src/places/types/place-types';

/**
 * #728 — place types were shown as their raw sluggified id across the Place
 * Statistics card, the Places list, and the Parent place dropdown.
 * getPlaceTypeDisplayName resolves a type id to its display name, honoring
 * built-in names and customizations, with a humanized fallback for unknown ids.
 */
describe('getPlaceTypeDisplayName (#728)', () => {
	const customTypes: PlaceTypeDefinition[] = [
		{ id: 'space_region', name: 'Region (space)', hierarchyLevel: 0, category: 'astrographical', builtIn: false },
		{ id: 'astro_system', name: 'System', hierarchyLevel: 2, category: 'astrographical', builtIn: false }
	];

	it('returns the built-in display name for a built-in id', () => {
		expect(getPlaceTypeDisplayName('planet')).toBe('Planet');
		expect(getPlaceTypeDisplayName('city')).toBe('City');
	});

	it('returns the custom type display name for a custom id', () => {
		expect(getPlaceTypeDisplayName('space_region', customTypes)).toBe('Region (space)');
		expect(getPlaceTypeDisplayName('astro_system', customTypes)).toBe('System');
	});

	it('honors a customization override on a built-in type', () => {
		expect(getPlaceTypeDisplayName('planet', [], { planet: { name: 'World' } })).toBe('World');
	});

	it('falls back to a humanized slug for an unknown id', () => {
		expect(getPlaceTypeDisplayName('space_region')).toBe('Space region');
		expect(getPlaceTypeDisplayName('astro_system')).toBe('Astro system');
	});
});
