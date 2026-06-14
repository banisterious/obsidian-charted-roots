import { describe, expect, it } from 'vitest';
import { createDateService } from '../src/dates/services/date-service';

/**
 * #453 — `DateService.formatCanonicalYear` is the inverse of
 * `parseDate(...).year`: takes a canonical signed year + a universe
 * context and returns an era-formatted display string. Used by the
 * map time slider so labels read "82 BBY" rather than the canonical
 * `-82` for fictional-era universes. Real-world dates and unconfigured
 * universes should fall back cleanly to `String(year)`.
 */

function makeService() {
	return createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [],
	});
}

describe('DateService.formatCanonicalYear — fictional-era inverse formatting (#453)', () => {
	const service = makeService();

	it('formats descending-era canonical years for Star Wars (BBY)', () => {
		expect(service.formatCanonicalYear(-82, 'Star Wars')).toBe('82 BBY');
		expect(service.formatCanonicalYear(-1042, 'Star Wars')).toBe('1042 BBY');
	});

	it('formats ascending-era canonical years for Star Wars (ABY)', () => {
		expect(service.formatCanonicalYear(5, 'Star Wars')).toBe('5 ABY');
		expect(service.formatCanonicalYear(200, 'Star Wars')).toBe('200 ABY');
	});

	it('renders the Battle of Yavin epoch (canonical 0) as "0 BBY" since BBY is declared first', () => {
		// Canonical 0 satisfies both eras (BBY: epoch 0 - 0 = 0; ABY: 0 - epoch 0 = 0).
		// Walk-in-order picks BBY first since it's declared first in the system.
		expect(service.formatCanonicalYear(0, 'Star Wars')).toBe('0 BBY');
	});

	it('handles slug-aware universe matching ("Star Wars" → star-wars)', () => {
		// The Star Wars calendar uses universe field "star-wars" (slug);
		// the user's universe field is typically the display name "Star Wars".
		// findSystemForUniverse should still match.
		expect(service.formatCanonicalYear(-82, 'Star Wars')).toBe('82 BBY');
		expect(service.formatCanonicalYear(-82, 'star-wars')).toBe('82 BBY');
		expect(service.formatCanonicalYear(-82, 'STAR WARS')).toBe('82 BBY');
	});

	it('handles superset slug matching for fan-canon universe names', () => {
		// "Star Wars Legends" should still resolve to the Star Wars calendar
		// via slug superset / prefix logic.
		expect(service.formatCanonicalYear(-82, 'Star Wars Legends')).toBe('82 BBY');
	});

	it('returns canonical integer when no universe is provided', () => {
		expect(service.formatCanonicalYear(-82)).toBe('-82');
		expect(service.formatCanonicalYear(1820)).toBe('1820');
	});

	it('returns canonical integer when universe does not match any configured system', () => {
		expect(service.formatCanonicalYear(-82, 'Some Unknown Universe')).toBe('-82');
	});

	it('returns canonical integer when fictional dates are disabled', () => {
		const realWorldOnly = createDateService({
			enableFictionalDates: false,
			showBuiltInDateSystems: true,
			fictionalDateSystems: [],
		});
		expect(realWorldOnly.formatCanonicalYear(-82, 'Star Wars')).toBe('-82');
		expect(realWorldOnly.formatCanonicalYear(1820, 'Star Wars')).toBe('1820');
	});
});

describe('DateService.formatCanonicalYear — pre-epoch years (#729)', () => {
	// A calendar with a single forward era and no "before" era: any year before
	// its epoch has no era to label it.
	const service = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [{
			id: 'gaean_reach',
			name: 'Gaean Reach Calendar',
			universe: 'Gaean Reach',
			eras: [{ id: 'gr', name: 'Gaean Reach', abbrev: 'GR', epoch: 0, direction: 'forward' }],
			defaultEra: 'gr'
		}]
	});

	it('renders a pre-epoch year relative to the earliest era instead of a bare negative', () => {
		expect(service.formatCanonicalYear(-29, 'Gaean Reach')).toBe('29 before GR');
		expect(service.formatCanonicalYear(-500, 'Gaean Reach')).toBe('500 before GR');
	});

	it('still labels on-or-after-epoch years normally', () => {
		expect(service.formatCanonicalYear(0, 'Gaean Reach')).toBe('0 GR');
		expect(service.formatCanonicalYear(1538, 'Gaean Reach')).toBe('1538 GR');
	});

	it('leaves real-world (no universe) negatives as the bare integer', () => {
		// No fictional system in play — "before" phrasing doesn't apply.
		expect(service.formatCanonicalYear(-100)).toBe('-100');
	});

	it('does not trigger for calendars with a backward era (BBY covers pre-epoch)', () => {
		expect(service.formatCanonicalYear(-82, 'Star Wars')).toBe('82 BBY');
	});
});

describe('DateService.formatCanonicalYear — round-trip with parseDate (#453)', () => {
	const service = makeService();

	it('round-trips Star Wars BBY dates correctly', () => {
		const parsed = service.parseDate('82 BBY', 'Star Wars');
		expect(parsed?.year).toBe(-82);
		expect(service.formatCanonicalYear(parsed!.year!, 'Star Wars')).toBe('82 BBY');
	});

	it('round-trips real-world ISO dates back to numeric year', () => {
		const parsed = service.parseDate('1820-12-15', undefined);
		expect(parsed?.year).toBe(1820);
		// No universe context for real-world; format returns the integer
		expect(service.formatCanonicalYear(parsed!.year!, undefined)).toBe('1820');
	});
});
