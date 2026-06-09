/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import { createDateService, type DateService } from '../src/dates/services/date-service';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #437 part 2 — `StatisticsService.extractYear` was a parallel surface that
 * #437's `data-quality.ts` fix didn't cover. The Statistics Dashboard's
 * "Date inconsistencies" counter compared raw digit-runs from BBY-style
 * descending eras and false-positived on coherent lifespans (`1045 BBY`
 * read as 1045, `1042 BBY` as 1042, comparison flagged `birth > death`).
 * This suite fences the `extractYear` deferral to `DateService.parseDate`
 * so descending-era inputs return signed canonical years.
 */

interface ExtractYearAccess {
	extractYear: (dateStr: string | undefined, universe?: string) => number | null;
}

function makeService(dateService: DateService | null): StatisticsService {
	const settings = {
		enableFictionalDates: true,
		propertyAliases: {},
		valueAliases: {},
	} as unknown as CanvasRootsSettings;
	const plugin = { getDateService: () => dateService } as never;
	return new StatisticsService({} as never, settings, plugin);
}

function privates(service: StatisticsService): ExtractYearAccess {
	return service as unknown as ExtractYearAccess;
}

describe('StatisticsService.extractYear — fictional-era support (#437 part 2)', () => {
	const dateService = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [],
	});

	it('returns negative canonical year for descending-era BBY inputs', () => {
		const service = makeService(dateService);
		expect(privates(service).extractYear('1045 BBY')).toBe(-1045);
		expect(privates(service).extractYear('1042 BBY')).toBe(-1042);
	});

	it('preserves chronological ordering across coherent BBY lifespans', () => {
		const service = makeService(dateService);
		const birthYear = privates(service).extractYear('1045 BBY')!;
		const deathYear = privates(service).extractYear('1042 BBY')!;
		// 1042 BBY is three years AFTER 1045 BBY; canonical years must reflect that.
		expect(deathYear).toBeGreaterThan(birthYear);
		// And `birth > death` (the false-positive trigger) must be false.
		expect(birthYear > deathYear).toBe(false);
	});

	it('returns positive canonical year for ascending-era ABY inputs', () => {
		const service = makeService(dateService);
		expect(privates(service).extractYear('15 ABY')).toBe(15);
		expect(privates(service).extractYear('200 ABY')).toBe(200);
	});

	it('orders BBY then ABY correctly (era crossing)', () => {
		const service = makeService(dateService);
		const birth = privates(service).extractYear('10 BBY')!;
		const death = privates(service).extractYear('5 ABY')!;
		expect(death).toBeGreaterThan(birth);
	});

	it('falls back to regex extraction for real-world ISO and 4-digit dates', () => {
		const service = makeService(dateService);
		expect(privates(service).extractYear('1820-12-15')).toBe(1820);
		expect(privates(service).extractYear('1905')).toBe(1905);
	});

	it('returns null when DateService is unavailable and the string has no year', () => {
		const service = makeService(null);
		expect(privates(service).extractYear('not a date')).toBeNull();
	});
});