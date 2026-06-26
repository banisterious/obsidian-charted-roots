import { describe, expect, it } from 'vitest';
import { getCalendarSystemName } from '../src/dates/calendar-display';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #766 — the place/person timeline calendar-filter dropdowns showed an event's
 * raw `dateSystem` id (e.g. `star_wars_out_of_universe_calendar`). getCalendarSystemName
 * resolves the id to the system's display name, falling back to a humanized
 * form of the id so a raw slug never surfaces (mirrors place-type names, #728).
 */
describe('getCalendarSystemName (#766)', () => {
	const systems = [
		{ id: 'star_wars', name: 'Star Wars Calendar' },
		{ id: 'star_wars_out_of_universe_calendar', name: 'Star Wars (out of universe)' },
	] as FictionalDateSystem[];

	it('returns the display name for a known calendar id', () => {
		expect(getCalendarSystemName('star_wars_out_of_universe_calendar', systems))
			.toBe('Star Wars (out of universe)');
	});

	it('resolves a built-in id to its name', () => {
		expect(getCalendarSystemName('star_wars', systems)).toBe('Star Wars Calendar');
	});

	it('humanizes an unknown id instead of showing the raw slug', () => {
		expect(getCalendarSystemName('galactic_standard_calendar', systems))
			.toBe('Galactic standard calendar');
	});

	it('humanizes a single-token id', () => {
		expect(getCalendarSystemName('gregorian', [])).toBe('Gregorian');
	});

	it('prefers an earlier system on an id clash (user systems passed first)', () => {
		const withOverride = [
			{ id: 'star_wars', name: 'My Custom Star Wars' },
			{ id: 'star_wars', name: 'Built-in Star Wars' },
		] as FictionalDateSystem[];
		expect(getCalendarSystemName('star_wars', withOverride)).toBe('My Custom Star Wars');
	});
});
