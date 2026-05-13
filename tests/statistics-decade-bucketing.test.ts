/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import { createDateService, type DateService } from '../src/dates/services/date-service';
import type { CanvasRootsSettings } from '../src/types';

/**
 * #560 — Decade bucketing for Longevity Analysis and Timeline Density used
 * Math.floor, which rounds toward negative infinity. Negative years that
 * didn't end in 0 ended up in the next-more-negative decade (e.g. -25
 * bucketed to -30 instead of -20). The fix switched to Math.trunc, which
 * rounds toward zero — matching BCE/BBY convention where the "-20s decade"
 * spans -20 through -29.
 */

interface ExtractDecadeAccess {
	extractDecade: (dateStr: string | undefined) => number | null;
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

function privates(service: StatisticsService): ExtractDecadeAccess {
	return service as unknown as ExtractDecadeAccess;
}

describe('StatisticsService.extractDecade — negative-year bucketing (#560)', () => {
	const dateService = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [],
	});

	it('buckets positive years to the start of their decade', () => {
		const e = privates(makeService(dateService));
		expect(e.extractDecade('1985')).toBe(1980);
		expect(e.extractDecade('1980')).toBe(1980);
		expect(e.extractDecade('1989')).toBe(1980);
		expect(e.extractDecade('1990')).toBe(1990);
	});

	it('buckets negative years toward zero (BCE/BBY convention)', () => {
		const e = privates(makeService(dateService));
		// Headline case from the bug report: -21 belongs in the -20s, not the -30s.
		expect(e.extractDecade('21 BBY')).toBe(-20);
		expect(e.extractDecade('25 BBY')).toBe(-20);
		expect(e.extractDecade('29 BBY')).toBe(-20);
	});

	it('buckets exact-multiple-of-10 negative years to themselves', () => {
		const e = privates(makeService(dateService));
		expect(e.extractDecade('20 BBY')).toBe(-20);
		expect(e.extractDecade('30 BBY')).toBe(-30);
	});

	it('buckets single-digit years across zero to "0s"', () => {
		const e = privates(makeService(dateService));
		expect(e.extractDecade('5 ABY')).toBe(0);
		expect(e.extractDecade('5 BBY')).toBe(0);
		expect(e.extractDecade('9 BBY')).toBe(0);
	});

	it('buckets larger negative years correctly', () => {
		const e = privates(makeService(dateService));
		expect(e.extractDecade('1045 BBY')).toBe(-1040);
		expect(e.extractDecade('1042 BBY')).toBe(-1040);
		expect(e.extractDecade('1050 BBY')).toBe(-1050);
	});

	it('returns null for unparseable dates', () => {
		const e = privates(makeService(dateService));
		expect(e.extractDecade('not a date')).toBeNull();
		expect(e.extractDecade(undefined)).toBeNull();
	});
});