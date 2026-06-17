import { describe, expect, it } from 'vitest';
import { humanizeTypeId } from '../src/dynamic-content/renderers/universe-entities-renderer';

/**
 * #731 — the universe dynamic blocks (places/events/organizations) used to show
 * the raw sluggified type id in the Type column. Known types now resolve to
 * their registry display name; unknown/deleted ids fall back to humanizeTypeId.
 */
describe('humanizeTypeId (#731 fallback)', () => {
	it('replaces underscores with spaces and capitalizes the first letter', () => {
		expect(humanizeTypeId('astro_sector')).toBe('Astro sector');
		expect(humanizeTypeId('space_region')).toBe('Space region');
		expect(humanizeTypeId('noble_house')).toBe('Noble house');
		expect(humanizeTypeId('jedi_knighting')).toBe('Jedi knighting');
	});

	it('handles single-word ids', () => {
		expect(humanizeTypeId('planet')).toBe('Planet');
	});

	it('does not Title-Case later words (stays sentence case)', () => {
		expect(humanizeTypeId('relief_mission_to_christophsis')).toBe('Relief mission to christophsis');
	});

	it('leaves an empty id empty', () => {
		expect(humanizeTypeId('')).toBe('');
	});
});
