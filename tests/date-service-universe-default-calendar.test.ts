import { describe, expect, it } from 'vitest';
import { DateService } from '../src/dates/services/date-service';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #650 (approach A) — the Universe Wizard stores the universe's *cr_id* in a
 * created calendar's `universe` field, while notes reference the universe by
 * its *display name*. So matching the calendar's `universe` against the note's
 * `universe` never lined up (DigitalDreamn's "Star Wars (AU)" notes vs a
 * calendar tagged `universe: universe-star-wars-...`), and dates fell back to
 * the built-in Galactic Standard Calendar.
 *
 * The fix honors the universe note's `default_calendar`: the DateService takes
 * a resolver (note universe ref -> default calendar id), and that calendar wins
 * regardless of how its own `universe` field is (or isn't) set.
 */

// Mirrors a wizard-created calendar: its `universe` field is the universe cr_id,
// NOT the display name the notes use.
const CUSTOM_SW: FictionalDateSystem = {
	id: 'star_wars_bby_aby_calendar',
	name: 'Star Wars BBY/ABY Calendar',
	universe: 'universe-star-wars-mo56lkav',
	eras: [{ id: 'bby', name: 'Before the Battle of Yavin', abbrev: 'BBY', epoch: 0, direction: 'backward' }],
};

function makeService(): DateService {
	return new DateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [CUSTOM_SW],
	});
}

describe('DateService — universe default calendar resolution (#650 approach A)', () => {
	it('without the resolver, a name-referenced note falls back to the built-in', () => {
		const svc = makeService();
		// Note says `universe: Star Wars (AU)` (display name); the calendar is
		// tagged with the cr_id, so the name/cr_id mismatch leaves the built-in.
		const parsed = svc.parseDate('BBY 19', 'Star Wars (AU)');
		expect(parsed?.fictional?.system.name).toBe('Galactic Standard Calendar');
	});

	it('with the resolver, the universe default calendar wins', () => {
		const svc = makeService();
		// Simulate the universe note: its name is "Star Wars (AU)" and its
		// default_calendar points at the custom calendar's id.
		svc.setUniverseCalendarResolver((ref) =>
			ref === 'Star Wars (AU)' ? 'star_wars_bby_aby_calendar' : null
		);
		const parsed = svc.parseDate('BBY 19', 'Star Wars (AU)');
		expect(parsed?.fictional?.system.name).toBe('Star Wars BBY/ABY Calendar');
	});

	it('resolves through a wikilink-wrapped / aliased universe reference', () => {
		const svc = makeService();
		svc.setUniverseCalendarResolver((ref) =>
			ref === 'Star Wars (AU)' ? 'star_wars_bby_aby_calendar' : null
		);
		const parsed = svc.parseDate('BBY 19', '[[Star Wars (AU)]]');
		expect(parsed?.fictional?.system.name).toBe('Star Wars BBY/ABY Calendar');
	});

	it('falls back to the built-in when the resolver finds no default calendar', () => {
		const svc = makeService();
		svc.setUniverseCalendarResolver(() => null);
		const parsed = svc.parseDate('BBY 19', 'Star Wars (AU)');
		expect(parsed?.fictional?.system.name).toBe('Galactic Standard Calendar');
	});
});
