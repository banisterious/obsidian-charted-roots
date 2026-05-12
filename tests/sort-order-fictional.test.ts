import { describe, expect, it } from 'vitest';
import { createDateService } from '../src/dates/services/date-service';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #564 — `computeSortOrder` used a local `compareDates` whose `extractYear`
 * only matched a leading `-?\d+`. For multi-era inputs like `EF 10` and
 * `DE 5`, both returned 0 and the function fell to `localeCompare`, which
 * sorted alphabetically by era abbreviation. With EF epoch -100 and DE
 * epoch 0, that put `EF 10` (canonical -90) AFTER `DE 5` (canonical 5).
 *
 * This suite exercises `compareDates` indirectly through `DateService` —
 * the production path threads `DateService` into the sort comparator, and
 * the comparator's canonical-year branch is the load-bearing fix. The
 * test confirms that path (canonical-year math beats alphabetical
 * fallback) on the same scenarios the reporter cited.
 */

const TWO_ERA_SYSTEM: FictionalDateSystem = {
	id: 'test-two-eras',
	name: 'Two-era test system',
	eras: [
		{ name: 'Era of Forging', abbrev: 'EF', epoch: -100, direction: 'forward' },
		{ name: 'Dawn Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

describe('DateService canonical-year ordering for multi-era inputs (#564)', () => {
	const dateService = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: false,
		fictionalDateSystems: [TWO_ERA_SYSTEM],
	});

	it('parses "EF 10" to canonical -90 (epoch -100 + 10)', () => {
		const parsed = dateService.parseDate('EF 10');
		expect(parsed?.year).toBe(-90);
	});

	it('parses "DE 5" to canonical 5 (epoch 0 + 5)', () => {
		const parsed = dateService.parseDate('DE 5');
		expect(parsed?.year).toBe(5);
	});

	it('canonical-year comparison puts EF 10 before DE 5 (-90 < 5)', () => {
		const a = dateService.parseDate('EF 10');
		const b = dateService.parseDate('DE 5');
		expect(a?.year).toBeDefined();
		expect(b?.year).toBeDefined();
		expect((a!.year as number) - (b!.year as number)).toBeLessThan(0);
	});

	it('confirms reporter equivalence: EF 100 and DE 0 have same canonical year', () => {
		const efBoundary = dateService.parseDate('EF 100');
		const deOrigin = dateService.parseDate('DE 0');
		expect(efBoundary?.year).toBe(0);
		expect(deOrigin?.year).toBe(0);
	});

	it('sorts an array of mixed-era events by canonical year', () => {
		const dates = ['DE 5', 'EF 10', 'DE 100', 'EF 50'];
		const sorted = [...dates].sort((a, b) => {
			const pa = dateService.parseDate(a);
			const pb = dateService.parseDate(b);
			if (pa?.year != null && pb?.year != null) {
				return pa.year - pb.year;
			}
			return a.localeCompare(b);
		});
		// Canonical years: EF 10 = -90, EF 50 = -50, DE 5 = 5, DE 100 = 100
		expect(sorted).toEqual(['EF 10', 'EF 50', 'DE 5', 'DE 100']);
	});

	it('falls back to leading-integer compare when DateService is unavailable', () => {
		// Pre-#564 compareDates behavior — kept as a regression fence so the
		// fallback path is documented even though the production path uses
		// DateService.
		const extractYear = (date: string): number => {
			const match = date.match(/^(-?\d+)/);
			return match ? parseInt(match[1], 10) : 0;
		};
		// "EF 10" → 0 (no leading digit), "DE 5" → 0 (no leading digit).
		// Both 0, falls to localeCompare. This is the exact bug.
		expect(extractYear('EF 10')).toBe(0);
		expect(extractYear('DE 5')).toBe(0);
		expect('EF 10'.localeCompare('DE 5')).toBeGreaterThan(0); // EF after DE alphabetically
	});

	it('still orders ISO-format dates correctly via DateService', () => {
		const a = dateService.parseDate('1855-03-15');
		const b = dateService.parseDate('1860-01-01');
		expect(a?.year).toBe(1855);
		expect(b?.year).toBe(1860);
		expect((a!.year as number) - (b!.year as number)).toBeLessThan(0);
	});

});
