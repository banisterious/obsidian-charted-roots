/**
 * Regression test for #634: CalendarDataService.getEventsForMonth must
 * filter by year as well as month.
 *
 * Before the fix, only `event.month !== month` was checked, so a person born
 * in February 2010 would appear on Feb 15, 1850 when the calendar was
 * navigated to February 1850.
 */
import { describe, expect, it, vi } from 'vitest';
import { App } from 'obsidian';
import { CalendarDataService } from '../src/calendar/calendar-data-service';
import type { CalendarEvent } from '../src/calendar/types/calendar-types';
import type { CanvasRootsSettings } from '../src/settings';

function makeService(): CalendarDataService {
	const app = new App();
	const settings = {} as unknown as CanvasRootsSettings;
	return new CalendarDataService(app as unknown as App, settings, null);
}

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
	return {
		id: 'test-id',
		personName: 'Test Person',
		personCrId: 'test-cr-id',
		eventType: 'birth',
		date: '1850-02-15',
		month: 2,
		day: 15,
		year: 1850,
		yearsAgo: 0,
		isApproximate: false,
		source: 'person',
		filePath: 'test.md',
		...overrides,
	};
}

describe('CalendarDataService.getEventsForMonth — year filter (#634)', () => {
	it('excludes events from a different year even when the month matches', () => {
		const service = makeService();

		// Seed getEvents with two February events in different years
		const eventSameYear = makeEvent({ year: 1850, month: 2, day: 15, id: 'same-year' });
		const eventDiffYear = makeEvent({ year: 2010, month: 2, day: 15, id: 'diff-year' });

		vi.spyOn(service, 'getEvents').mockReturnValue([eventSameYear, eventDiffYear]);

		const { dayEvents, impreciseEvents } = service.getEventsForMonth(1850, 2);

		const allReturned = [...dayEvents.values()].flat().concat(impreciseEvents);
		const returnedIds = allReturned.map(e => e.id);

		expect(returnedIds).toContain('same-year');
		expect(returnedIds).not.toContain('diff-year');
	});

	it('includes an event when both month and year match', () => {
		const service = makeService();

		const event = makeEvent({ year: 1850, month: 2, day: 10, id: 'match' });
		vi.spyOn(service, 'getEvents').mockReturnValue([event]);

		const { dayEvents } = service.getEventsForMonth(1850, 2);

		expect(dayEvents.get(10)).toHaveLength(1);
		expect(dayEvents.get(10)![0].id).toBe('match');
	});

	it('handles negative (signed) years for custom eras', () => {
		const service = makeService();

		// Year -100 (e.g. 100 BC) — only this should appear for month 3, year -100
		const eventMatch = makeEvent({ year: -100, month: 3, day: 1, id: 'bc-match' });
		const eventNoMatch = makeEvent({ year: 100, month: 3, day: 1, id: 'ad-no-match' });

		vi.spyOn(service, 'getEvents').mockReturnValue([eventMatch, eventNoMatch]);

		const { dayEvents } = service.getEventsForMonth(-100, 3);

		const allReturned = [...dayEvents.values()].flat();
		const returnedIds = allReturned.map(e => e.id);

		expect(returnedIds).toContain('bc-match');
		expect(returnedIds).not.toContain('ad-no-match');
	});

	it('places month-only events (null day) in impreciseEvents, not dayEvents', () => {
		const service = makeService();

		const imprecise = makeEvent({ year: 1850, month: 2, day: null, id: 'imprecise' });
		vi.spyOn(service, 'getEvents').mockReturnValue([imprecise]);

		const { dayEvents, impreciseEvents } = service.getEventsForMonth(1850, 2);

		expect(impreciseEvents).toHaveLength(1);
		expect(impreciseEvents[0].id).toBe('imprecise');
		expect([...dayEvents.values()].flat()).toHaveLength(0);
	});
});
