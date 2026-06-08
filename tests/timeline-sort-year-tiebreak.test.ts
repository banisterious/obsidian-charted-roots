import { describe, expect, it } from 'vitest';
import {
	compareTimelineEntriesByDate,
	computeContextWindow,
	isWithinContextMargin,
	type TimelineEntry,
} from '../src/dynamic-content/renderers/timeline-renderer';

/**
 * Timeline sort comparator. The primary key is the era-aware canonical year
 * (`canonicalYear`, signed) so timelines order by true chronology, earliest-
 * at-top, even across the BBY/ABY zero boundary (#695). Same-year ties break on
 * `sort_order` (#625) then the raw-date string (#609), low-to-high in
 * chronological mode for every era — the backward-era inversions that #609/#638
 * used to compensate for the old era-blind `parseInt(year)` sort are gone.
 */

/** Entry with an explicit canonical year (the normal runtime case). */
function entry(canonicalYear: number, rawDate?: string, title = 'untitled'): TimelineEntry {
	return {
		date: rawDate ?? '',
		year: String(canonicalYear),
		type: 'birth',
		title,
		rawDate,
		canonicalYear,
	};
}

describe('compareTimelineEntriesByDate — canonical year compare', () => {
	it('orders distinct years earliest-at-top (chronological)', () => {
		const a = entry(1985);
		const b = entry(1990);
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(b, a, 'chronological')).toBeGreaterThan(0);
	});

	it('orders distinct years latest-at-top in reverse', () => {
		const a = entry(1985);
		const b = entry(1990);
		expect(compareTimelineEntriesByDate(a, b, 'reverse')).toBeGreaterThan(0);
		expect(compareTimelineEntriesByDate(b, a, 'reverse')).toBeLessThan(0);
	});

	it('orders a descending era (BBY) earliest-at-top, like Gregorian', () => {
		// BBY counts down, so BBY 82 (-82) is earlier than BBY 22 (-22): birth
		// at top, death below. This is the #695 flip — previously the era-blind
		// digit sort rendered pure-BBY reversed.
		const bornBBY82 = entry(-82, 'BBY 82', 'Born');
		const diedBBY22 = entry(-22, 'BBY 22', 'Died');
		expect(compareTimelineEntriesByDate(bornBBY82, diedBBY22, 'chronological')).toBeLessThan(0);
	});

	it('orders a mixed BBY/ABY timeline by true chronology (#695 headline)', () => {
		// canonical: BBY 10 = -10, ABY 4 = +4, ABY 40 = +40
		const bby10 = entry(-10, 'BBY 10', 'BBY 10');
		const aby4 = entry(4, 'ABY 4', 'ABY 4');
		const aby40 = entry(40, 'ABY 40', 'ABY 40');
		const sorted = [aby40, bby10, aby4].sort((a, b) =>
			compareTimelineEntriesByDate(a, b, 'chronological')
		);
		// earliest-at-top: BBY 10, then ABY 4, then ABY 40
		expect(sorted.map((e) => e.title)).toEqual(['BBY 10', 'ABY 4', 'ABY 40']);
	});

	it('falls back to era-blind year digits when canonicalYear is absent', () => {
		// No DateService / unparseable date: comparator uses parseInt(year).
		const a: TimelineEntry = { date: '', year: '1985', type: 'birth', title: 'A' };
		const b: TimelineEntry = { date: '', year: '1990', type: 'birth', title: 'B' };
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBeLessThan(0);
	});

	it('treats an unparseable year as 0 in the fallback', () => {
		const a: TimelineEntry = { date: '', year: 'not-a-year', type: 'birth', title: 'A' };
		const b = entry(1985);
		// a falls back to 0, b is 1985 → a sorts before b
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBeLessThan(0);
	});
});

describe('compareTimelineEntriesByDate — raw-date tiebreak (#609)', () => {
	it('orders twins by ISO time suffix when years tie (firstborn at top)', () => {
		const twinA = entry(1985, '1985-04-12T03:42', 'Twin A');
		const twinB = entry(1985, '1985-04-12T03:45', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(twinB, twinA, 'chronological')).toBeGreaterThan(0);
	});

	it('reverses the tiebreak under reverse sort', () => {
		const twinA = entry(1985, '1985-04-12T03:42', 'Twin A');
		const twinB = entry(1985, '1985-04-12T03:45', 'Twin B');
		expect(compareTimelineEntriesByDate(twinA, twinB, 'reverse')).toBeGreaterThan(0);
	});

	it('orders fictional-era twins firstborn-at-top, NOT inverted (#695)', () => {
		// Both BBY 29 (canonical -29). The earlier time suffix is the firstborn
		// and now sorts to the top in chronological mode for backward eras too —
		// the #609/#638 backward-era inversion is gone.
		const firstborn = entry(-29, 'BBY 29 T20:03:04', 'Twin A (firstborn)');
		const secondborn = entry(-29, 'BBY 29 T20:08:15', 'Twin B (secondborn)');
		expect(compareTimelineEntriesByDate(firstborn, secondborn, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(secondborn, firstborn, 'chronological')).toBeGreaterThan(0);
	});

	it('returns 0 when years tie and raw dates are identical', () => {
		const a = entry(1985, '1985-04-12', 'A');
		const b = entry(1985, '1985-04-12', 'B');
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBe(0);
		expect(compareTimelineEntriesByDate(a, b, 'reverse')).toBe(0);
	});

	it('returns 0 when years tie and both raw dates are missing', () => {
		const a = entry(1985);
		const b = entry(1985);
		expect(compareTimelineEntriesByDate(a, b, 'chronological')).toBe(0);
	});
});

describe('compareTimelineEntriesByDate — sort_order tiebreak (#625)', () => {
	function entryWithSort(canonicalYear: number, sortOrder: number | undefined, title: string, rawDate?: string): TimelineEntry {
		return { date: rawDate ?? '', year: String(canonicalYear), type: 'event', title, rawDate, canonicalYear, sortOrder };
	}

	it('orders same-year events by sort_order (lower first in chronological)', () => {
		const eventB = entryWithSort(1264, 1, 'Event B');
		const eventA = entryWithSort(1264, 2, 'Event A (after Event B)');
		expect(compareTimelineEntriesByDate(eventB, eventA, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(eventA, eventB, 'chronological')).toBeGreaterThan(0);
	});

	it('inverts the sort_order order under reverse', () => {
		const eventB = entryWithSort(1264, 1, 'Event B');
		const eventA = entryWithSort(1264, 2, 'Event A (after Event B)');
		expect(compareTimelineEntriesByDate(eventB, eventA, 'reverse')).toBeGreaterThan(0);
	});

	it('orders same-year backward-era events by sort_order WITHOUT inversion (#695)', () => {
		// Two BBY 29 events; "before" (sort_order 1) sits above "after"
		// (sort_order 2) in chronological mode for backward eras too.
		const eventB = entryWithSort(-29, 1, 'Event B (before)', 'BBY 29');
		const eventA = entryWithSort(-29, 2, 'Event A (after)', 'BBY 29');
		expect(compareTimelineEntriesByDate(eventB, eventA, 'chronological')).toBeLessThan(0);
		expect(compareTimelineEntriesByDate(eventA, eventB, 'chronological')).toBeGreaterThan(0);
	});

	it('year still wins over sort_order across different years', () => {
		const earlier = entryWithSort(1260, 5, 'Earlier year, higher sort_order');
		const later = entryWithSort(1264, 1, 'Later year, lower sort_order');
		expect(compareTimelineEntriesByDate(earlier, later, 'chronological')).toBeLessThan(0);
	});

	it('falls through to rawDate tiebreak when only one entry has sort_order', () => {
		const dated = entryWithSort(1264, undefined, 'Dated event', '1264-03-12');
		const ordered = entryWithSort(1264, 5, 'Ordered event');
		// ordered has empty rawDate, dated has "1264-03-12"; "" < "1264-03-12"
		// so ordered (empty rawDate) sorts first.
		expect(compareTimelineEntriesByDate(ordered, dated, 'chronological')).toBeLessThan(0);
	});
});

describe('isWithinContextMargin — era-aware context margin window (#695)', () => {
	it('includes a context event inside the person life window', () => {
		// Person lived BBY 30..BBY 20 (canonical -30..-20), margin 5 → [-35, -15].
		expect(isWithinContextMargin(-25, -30, -20, 5)).toBe(true);
	});

	it('excludes an ABY event far after a BBY-lived person (the #695 case)', () => {
		// Person BBY 30..BBY 20 (-30..-20), margin 5 → window [-35, -15].
		// ABY 25 = +25 is well outside, and must NOT be pulled in by digit
		// magnitude (era-blind, "25" would have landed inside the digit window).
		expect(isWithinContextMargin(25, -30, -20, 5)).toBe(false);
	});

	it('includes an ABY event that is genuinely within the margin across the boundary', () => {
		// Person BBY 3..ABY 1 (-3..+1), margin 5 → window [-8, +6]. ABY 4 (+4) is in.
		expect(isWithinContextMargin(4, -3, 1, 5)).toBe(true);
	});

	it('respects the margin edges inclusively', () => {
		expect(isWithinContextMargin(-35, -30, -20, 5)).toBe(true);  // lower edge
		expect(isWithinContextMargin(-15, -30, -20, 5)).toBe(true);  // upper edge
		expect(isWithinContextMargin(-36, -30, -20, 5)).toBe(false); // just past lower
		expect(isWithinContextMargin(-14, -30, -20, 5)).toBe(false); // just past upper
	});

	it('excludes an entry with no resolved canonical year', () => {
		expect(isWithinContextMargin(undefined, -30, -20, 5)).toBe(false);
	});

	it('works for Gregorian windows', () => {
		// Person 1850..1910, margin 5 → [1845, 1915].
		expect(isWithinContextMargin(1861, 1850, 1910, 5)).toBe(true);
		expect(isWithinContextMargin(1930, 1850, 1910, 5)).toBe(false);
	});
});

describe('computeContextWindow — full-lifespan window (#699)', () => {
	it('returns null when there are no dated points', () => {
		expect(computeContextWindow(undefined, undefined, [], [], false, undefined)).toBeNull();
	});

	it('anchors the lower bound on birth even when an older sibling was born earlier', () => {
		// Birth BBY 56 (-56); an older sibling born BBY 58 (-58) is a family event.
		// The window must start at birth, not at the earlier sibling birth.
		const w = computeContextWindow(-56, undefined, [], [-58], false, undefined);
		expect(w?.minYear).toBe(-56);
	});

	it('extends the upper bound to the latest family event when there is no death date', () => {
		// The Kaelorin case: last personal event is the marriage (BBY 33 = -33),
		// but children's events run to BBY 18 (-18). The window must reach -18 so
		// context during the person's later life is no longer dropped.
		const w = computeContextWindow(-56, undefined, [-56, -33], [-54, -32, -18], false, undefined);
		expect(w).toEqual({ minYear: -56, maxYear: -18 });
	});

	it('caps the upper bound at the death date, ignoring later family events', () => {
		// Death BBY 20 (-20); a child marries BBY 10 (-10) after the parent died.
		// The window must end at death, not follow the post-death family event.
		const w = computeContextWindow(-60, -20, [-60, -20], [-40, -10], false, undefined);
		expect(w).toEqual({ minYear: -60, maxYear: -20 });
	});

	it('extends to the living horizon for a death-date-less person marked living', () => {
		// The Aan'dyun case: no death, last recorded event is the marriage
		// (BBY 18 = -18), no family events, but the person is marked living. The
		// window reaches the latest context event (ABY 4 = +4) so transition-era
		// context is admitted.
		const w = computeContextWindow(-54, undefined, [-54, -18], [], true, 4);
		expect(w).toEqual({ minYear: -54, maxYear: 4 });
	});

	it('does not extend to the living horizon when the person is not living', () => {
		const w = computeContextWindow(-54, undefined, [-54, -18], [], false, 4);
		expect(w).toEqual({ minYear: -54, maxYear: -18 });
	});

	it('falls back to the min of all years when birth is unknown', () => {
		const w = computeContextWindow(undefined, undefined, [-40], [-50], false, undefined);
		expect(w).toEqual({ minYear: -50, maxYear: -40 });
	});
});

describe('compareTimelineEntriesByDate — stable sort integration', () => {
	it('preserves insertion order for fully-equal entries', () => {
		const events: TimelineEntry[] = [
			entry(1985, '1985-04-12', 'First'),
			entry(1985, '1985-04-12', 'Second'),
			entry(1985, '1985-04-12', 'Third'),
		];
		const sorted = [...events].sort((a, b) => compareTimelineEntriesByDate(a, b, 'chronological'));
		expect(sorted.map((e) => e.title)).toEqual(['First', 'Second', 'Third']);
	});

	it('sorts a mixed twin + non-twin set earliest-at-top', () => {
		const events: TimelineEntry[] = [
			entry(1990, '1990-06-15', 'Younger sibling'),
			entry(1985, '1985-04-12T03:45', 'Twin B (secondborn)'),
			entry(1985, '1985-04-12T03:42', 'Twin A (firstborn)'),
		];
		const sorted = [...events].sort((a, b) => compareTimelineEntriesByDate(a, b, 'chronological'));
		expect(sorted.map((e) => e.title)).toEqual([
			'Twin A (firstborn)',
			'Twin B (secondborn)',
			'Younger sibling',
		]);
	});

	it('sorts a full life across the BBY/ABY boundary in true order', () => {
		const events: TimelineEntry[] = [
			entry(4, 'ABY 4', 'Battle of Endor'),
			entry(-82, 'BBY 82', 'Born'),
			entry(-22, 'BBY 22', 'Died'),
			entry(-32, 'BBY 32', 'Invasion of Naboo'),
		];
		const sorted = [...events].sort((a, b) => compareTimelineEntriesByDate(a, b, 'chronological'));
		expect(sorted.map((e) => e.title)).toEqual([
			'Born',               // BBY 82 (-82)
			'Invasion of Naboo',  // BBY 32 (-32)
			'Died',               // BBY 22 (-22)
			'Battle of Endor',    // ABY 4 (+4)
		]);
	});
});
