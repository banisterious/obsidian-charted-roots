import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { createDateService } from '../src/dates/services/date-service';
import { computeSortOrder } from '../src/events/services/sort-order-service';
import type { FictionalDateSystem } from '../src/dates/types/date-types';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #722 — fictional/era dates dropped month and day precision on parse
 * (`DE 1264-08-15` collapsed to the year), so two same-year era dates could
 * only be ordered by a raw-string tiebreak, which mis-sorts across eras. The
 * parser now records month/day, and the event sort orders by them within the
 * same canonical year.
 */

const TWO_ERA_SYSTEM: FictionalDateSystem = {
	id: 'test-two-eras',
	name: 'Two-era test system',
	eras: [
		{ id: 'era-of-forging', name: 'Era of Forging', abbrev: 'EF', epoch: -100, direction: 'forward' },
		{ id: 'dawn-era', name: 'Dawn Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

const dateService = createDateService({
	enableFictionalDates: true,
	showBuiltInDateSystems: false,
	fictionalDateSystems: [TWO_ERA_SYSTEM],
});

describe('fictional date month/day precision parsing (#722)', () => {
	it('preserves month precision', () => {
		const parsed = dateService.parseDate('DE 1264-08');
		expect(parsed?.fictional?.month).toBe(8);
		expect(parsed?.fictional?.day).toBeUndefined();
		expect(parsed?.year).toBe(1264); // canonical year still correct
	});

	it('preserves month and day precision', () => {
		const parsed = dateService.parseDate('DE 1264-08-15');
		expect(parsed?.fictional?.month).toBe(8);
		expect(parsed?.fictional?.day).toBe(15);
	});

	it('leaves month/day undefined for a year-only date', () => {
		const parsed = dateService.parseDate('DE 5');
		expect(parsed?.fictional?.month).toBeUndefined();
		expect(parsed?.fictional?.day).toBeUndefined();
	});

	it('keeps month precision on a negative-era year (the #655 case)', () => {
		const parsed = dateService.parseDate('DE -01-12');
		expect(parsed?.fictional?.year).toBe(-1);
		expect(parsed?.fictional?.month).toBe(12);
	});
});

function makeEvent(overrides: Partial<EventNote> & { crId: string; title: string }): EventNote {
	const path = `${overrides.title}.md`;
	return { filePath: path, file: { path } as unknown as EventNote['file'], ...overrides } as EventNote;
}

function makeApp(writes: Map<string, number>): App {
	return {
		fileManager: {
			processFrontMatter: async (file: { path: string }, cb: (fm: Record<string, unknown>) => void) => {
				const fm: Record<string, unknown> = {};
				cb(fm);
				if (typeof fm.sort_order === 'number') writes.set(file.path, fm.sort_order);
			},
		},
	} as unknown as App;
}

describe('event sort orders same-year era dates by month (#722)', () => {
	it('sorts by month across eras that share a canonical year', async () => {
		// EF 105 and DE 5 both canonical year 5. March (month 3) must precede
		// December (month 12). Pre-fix, the raw-string tiebreak compared
		// "DE 5-12" vs "EF 105-03" alphabetically and put December first.
		const events = [
			makeEvent({ crId: 'd', title: 'December', date: 'DE 5-12' }),
			makeEvent({ crId: 'm', title: 'March', date: 'EF 105-03' }),
		];
		const writes = new Map<string, number>();
		const result = await computeSortOrder(makeApp(writes), events, dateService);

		expect(result.cycleEvents).toEqual([]);
		expect(writes.get('March.md')!).toBeLessThan(writes.get('December.md')!);
	});
});
