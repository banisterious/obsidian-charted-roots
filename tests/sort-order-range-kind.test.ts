import { describe, expect, it } from 'vitest';
import { compareRangeKind } from '../src/events/services/sort-order-service';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #569 — When two events share a start date and one is a range event
 * (has `date_end`) while the other is a point event (no `date_end`),
 * the point event sorts first. Readers expect "what happened on this
 * date" before "state that began here."
 */

function makeEvent(overrides: Partial<EventNote> & { date: string }): EventNote {
	return {
		title: overrides.title ?? 'Event',
		date: overrides.date,
		dateEnd: overrides.dateEnd,
	} as EventNote;
}

describe('compareRangeKind (#569 sibling-date tiebreak)', () => {
	it('sorts a point event before a range event with the same start date', () => {
		const range = makeEvent({ date: '1920-01-08', dateEnd: '1925-08-30' });
		const point = makeEvent({ date: '1920-01-08' });
		expect(compareRangeKind(point, range)).toBeLessThan(0);
		expect(compareRangeKind(range, point)).toBeGreaterThan(0);
	});

	it('returns 0 when both events are point events (same kind)', () => {
		const a = makeEvent({ date: '1920-01-08' });
		const b = makeEvent({ date: '1920-01-08' });
		expect(compareRangeKind(a, b)).toBe(0);
	});

	it('returns 0 when both events are range events (same kind)', () => {
		const a = makeEvent({ date: '1920-01-08', dateEnd: '1925-08-30' });
		const b = makeEvent({ date: '1920-01-08', dateEnd: '1930-12-31' });
		expect(compareRangeKind(a, b)).toBe(0);
	});

	it('preserves ordering when used as a tiebreak in Array.sort', () => {
		const events = [
			makeEvent({ title: 'Residence', date: '1920-01-08', dateEnd: '1925-08-30' }),
			makeEvent({ title: 'Census', date: '1920-01-08' }),
		];
		const sorted = [...events].sort(compareRangeKind);
		expect(sorted[0].title).toBe('Census');
		expect(sorted[1].title).toBe('Residence');
	});
});
