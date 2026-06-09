import { describe, expect, it } from 'vitest';
import { FictionalDateParser } from '../src/dates/parser/fictional-date-parser';
import { STAR_WARS_CALENDAR } from '../src/dates/constants/default-date-systems';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #650 follow-up — the built-in Galactic Standard Calendar carries
 * `universe: 'star-wars'` and ships ahead of user-defined systems, so when a
 * custom calendar reused its `BBY` / `ABY` abbreviations the universe lookup
 * returned the built-in first and the custom system never won. The Statistics
 * card's "Systems in use" therefore credited 112 notes to "Galactic Standard
 * Calendar" instead of the user's calendar. The parser now prefers a custom
 * system over a built-in that shares the universe + abbreviation, and matches
 * the universe slug-aware so wikilink-wrapped or differently-cased values
 * still resolve.
 */

// A user's own Star Wars calendar reusing the BBY/ABY abbreviations, with a
// distinct name and a slightly different universe spelling. builtIn is absent.
const CUSTOM_SW: FictionalDateSystem = {
	id: 'custom_sw',
	name: 'Galactic Calendar (Custom)',
	universe: 'Star Wars',
	eras: [
		{ id: 'bby', name: 'Before the Battle of Yavin', abbrev: 'BBY', epoch: 0, direction: 'backward' },
		{ id: 'aby', name: 'After the Battle of Yavin', abbrev: 'ABY', epoch: 0, direction: 'forward' },
	],
};

// Built-ins are listed first, mirroring date-service.ts assembly order.
function makeParser(): FictionalDateParser {
	return new FictionalDateParser([STAR_WARS_CALENDAR, CUSTOM_SW]);
}

describe('FictionalDateParser — custom system preferred over built-in (#650)', () => {
	it('attributes a BBY date to the custom system when the universe matches', () => {
		const result = makeParser().parse('BBY 100', 'Star Wars');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date?.system.name).toBe('Galactic Calendar (Custom)');
	});

	it('resolves a wikilink-wrapped universe value', () => {
		const result = makeParser().parse('ABY 34', '[[Star Wars]]');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date?.system.name).toBe('Galactic Calendar (Custom)');
	});

	it('resolves a slug-form universe value', () => {
		const result = makeParser().parse('BBY 19', 'star-wars');
		if (!result.success) return;
		expect(result.date?.system.name).toBe('Galactic Calendar (Custom)');
	});

	it('falls back to the built-in when no custom system shares the universe', () => {
		// Only the built-in is present; the built-in must still resolve.
		const result = new FictionalDateParser([STAR_WARS_CALENDAR]).parse('BBY 100', 'Star Wars');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date?.system.name).toBe('Galactic Standard Calendar');
	});

	it('without a universe, attribution stays with the abbreviation index (built-in first)', () => {
		// A note with no universe routes through the abbreviation index, which
		// keeps its "first system wins" contract — built-ins are listed first,
		// so the built-in resolves. The custom system only wins when the note's
		// universe links it (the #650 design: universe is the disambiguator).
		const result = makeParser().parse('BBY 100');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date?.system.name).toBe('Galactic Standard Calendar');
	});
});
