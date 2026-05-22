import { describe, expect, it } from 'vitest';
import {
	compareTimelineEntriesByDate,
	type TimelineEntry,
} from '../src/dynamic-content/renderers/timeline-renderer';
import type { DateService } from '../src/dates/services/date-service';

/**
 * Minimal DateService stub for the descending-era tiebreak tests.
 * Recognizes "BBY N" / "BBY N T..." formats and returns a fictional
 * parse with `era.direction = 'backward'`. Any other input falls
 * through to null so the comparator's pre-existing behavior holds.
 */
function backwardEraDateServiceStub(): DateService {
	return {
		parseDate(dateStr?: string) {
			if (!dateStr || !/^BBY\s+\d/.test(dateStr.trim())) return null;
			return {
				type: 'fictional',
				raw: dateStr,
				year: 0,
				fictional: {
					era: { id: 'bby', name: 'BBY', abbrev: 'BBY', epoch: 0, direction: 'backward' },
					system: { id: 'star-wars', name: 'Star Wars', eras: [] },
					year: parseInt(dateStr.replace(/^BBY\s+(\d+).*$/, '$1')),
					raw: dateStr,
					canonicalYear: 0,
				},
			};
		},
	} as unknown as DateService;
}

/**
 * Fences the year-then-rawDate sort comparator added in #609 against the
 * Dynamic Timeline Block's twin / triplet reversal. Same shape as the
 * v0.22.46 sibling-sort tiebreak in `RelationshipQueryService.getChildren`,
 * but applied to the timeline-event sort path.
 */

function entry(year: string, rawDate?: string, title = 'untitled'): TimelineEntry {
	return { date: rawDate ?? '', year, type: 'birth', title, rawDate };
}

describe('compareTimelineEntriesByDate — year compare', () => {
	it('orders distinct years chronologically (ascending)', () => {
		const a = entry('1985');
		const b = entry('1990');
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(b, a, 'chronological')).toBeGreaterThan(0);
	});

	it('orders distinct years in reverse (descending)', () => {
		const a = entry('1985');
		const b = entry('1990');
		expect(compareTimelineEntriesByDate(a, b, 'reverse')).toBeGreaterThan(0);
		expect(compareTimelineEntriesByDate(b, a, 'reverse')).toBeLessThan(0);
	});

	it('treats unparseable year strings as 0', () => {
		const a = entry('not-a-year', '1985-04-12');
		const b = entry('1985', '1985-04-12');
		// Both parseInt to 0 / 1985 respectively; a (year=0) sorts before b
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBeLessThan(0);
	});
});

describe('compareTimelineEntriesByDate — year-tie tiebreak (#609)', () => {
	it('orders twins by ISO time suffix when years tie', () => {
		// Twin A born earlier (firstborn) with timestamped birth
		const twinA = entry('1985', '1985-04-12T03:42', 'Twin A');
		// Twin B born later (secondborn) with timestamped birth
		const twinB = entry('1985', '1985-04-12T03:45', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(twinB, twinA, 'chronological')).toBeGreaterThan(0);
	});

	it('reverses the tiebreak when sortOrder is reverse', () => {
		// In reverse mode, the chronologically later twin sorts first
		const twinA = entry('1985', '1985-04-12T03:42', 'Twin A');
		const twinB = entry('1985', '1985-04-12T03:45', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'reverse')).toBeGreaterThan(0);
		expect(compareTimelineEntriesByDate(twinB, twinA, 'reverse')).toBeLessThan(0);
	});

	it('orders fictional-era twins by time suffix', () => {
		// BBY 29 twins, both timestamped
		const twinA = entry('29', 'BBY 29 T20:03:04', 'Twin A');
		const twinB = entry('29', 'BBY 29 T20:08:15', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'chronological')).toBeLessThan(0);
	});

	it('returns 0 when years tie AND raw dates are identical', () => {
		// Two events on the same exact date — falls through to insertion
		// order via the surrounding stable sort
		const a = entry('1985', '1985-04-12', 'Event A');
		const b = entry('1985', '1985-04-12', 'Event B');
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBe(0);
		expect(compareTimelineEntriesByDate(a, b, 'reverse')).toBe(0);
	});

	it('returns 0 when years tie AND both raw dates are missing', () => {
		const a = entry('1985');
		const b = entry('1985');
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBe(0);
	});

	it('tiebreaks deterministically when only one twin has a time suffix', () => {
		// Degenerate but possible: one twin timestamped, the other not.
		// Shorter string lex-compares as less, so the untimestamped one
		// sorts first. The user can't disambiguate further without setting
		// times on both — same trade-off as the v0.22.46 sibling-sort.
		const noTime = entry('1985', '1985-04-12');
		const withTime = entry('1985', '1985-04-12T03:45');
		expect(compareTimelineEntriesByDate(noTime, withTime, 'chronological')).toBeLessThan(0);
	});
});

describe('compareTimelineEntriesByDate — descending-era tiebreak (#609 follow-on)', () => {
	const ds = backwardEraDateServiceStub();

	it('inverts the lex-compare for BBY twins in chronological mode', () => {
		// BBY 29 twins, firstborn at T20:03:04, secondborn at T20:08:15.
		// Surrounding year sort produces "smaller-BBY-first" (e.g., BBY 18
		// before BBY 80), i.e., new-at-top / old-at-bottom. The tiebreak
		// must place the secondborn (later real-time) above the firstborn
		// to match that pattern. Without dateService, the literal lex
		// compare would put the firstborn on top — wrong for BBY.
		const twinA = entry('29', 'BBY 29 T20:03:04', 'Twin A (firstborn)');
		const twinB = entry('29', 'BBY 29 T20:08:15', 'Twin B (secondborn)');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'chronological', ds)).toBeGreaterThan(0);
		expect(compareTimelineEntriesByDate(twinB, twinA, 'chronological', ds)).toBeLessThan(0);
	});

	it('inverts again under reverse sortOrder, returning firstborn to the top slot', () => {
		// Reverse-mode BBY: year sort becomes "larger-BBY-first" (old at
		// top). The composition of descending-era inversion and reverse
		// inversion lands the firstborn at top, matching the surrounding
		// old-at-top pattern.
		const twinA = entry('29', 'BBY 29 T20:03:04', 'Twin A (firstborn)');
		const twinB = entry('29', 'BBY 29 T20:08:15', 'Twin B (secondborn)');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'reverse', ds)).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(twinB, twinA, 'reverse', ds)).toBeGreaterThan(0);
	});

	it('preserves the ISO-date tiebreak when dateService is provided', () => {
		// ISO dates aren't fictional — parseDate returns null in the stub,
		// so the inversion path doesn't trigger and existing behavior holds.
		const twinA = entry('1985', '1985-04-12T03:42', 'Twin A');
		const twinB = entry('1985', '1985-04-12T03:45', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'chronological', ds)).toBeLessThan(0);
	});

	it('falls back to literal lex compare when dateService is omitted (back-compat)', () => {
		// Backward-compat: the old three-arg signature still works.
		const twinA = entry('29', 'BBY 29 T20:03:04', 'Twin A');
		const twinB = entry('29', 'BBY 29 T20:08:15', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'chronological')).toBeLessThan(0);
	});

	it('inverts even when only one twin has a parseable backward-era rawDate', () => {
		// Degenerate but defensive: as long as ONE rawDate resolves to a
		// backward era, the tiebreak inverts. (Unlikely in practice — twins
		// share an era — but worth fencing the OR-not-AND semantics.)
		const a = entry('29', 'BBY 29 T20:03:04', 'A');
		const b = entry('29', 'some-non-era-string', 'B');
		// rawA < rawB lex → without inversion, a first. With inversion: b first.
		expect(compareTimelineEntriesByDate(a, b, 'chronological', ds)).toBeGreaterThan(0);
	});
});

describe('compareTimelineEntriesByDate — stable sort integration', () => {
	it('preserves insertion order for fully-equal entries in Array.sort', () => {
		// Simulates the surrounding Array.prototype.sort guarantee (stable
		// since ES2019). When the comparator returns 0, original index wins.
		const events: TimelineEntry[] = [
			entry('1985', '1985-04-12', 'First'),
			entry('1985', '1985-04-12', 'Second'),
			entry('1985', '1985-04-12', 'Third'),
		];
		const sorted = [...events].sort((a, b) =>
			compareTimelineEntriesByDate(a, b, 'chronological')
		);
		expect(sorted.map((e) => e.title)).toEqual(['First', 'Second', 'Third']);
	});

	it('sorts a mixed twin + non-twin set correctly', () => {
		// Three events: two twins in 1985 (different times) + one in 1990
		const events: TimelineEntry[] = [
			entry('1990', '1990-06-15', 'Younger sibling'),
			entry('1985', '1985-04-12T03:45', 'Twin B (secondborn)'),
			entry('1985', '1985-04-12T03:42', 'Twin A (firstborn)'),
		];
		const sorted = [...events].sort((a, b) =>
			compareTimelineEntriesByDate(a, b, 'chronological')
		);
		expect(sorted.map((e) => e.title)).toEqual([
			'Twin A (firstborn)',
			'Twin B (secondborn)',
			'Younger sibling',
		]);
	});
});
