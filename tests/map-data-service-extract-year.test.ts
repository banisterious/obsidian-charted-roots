import { describe, expect, it, beforeEach } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import { createDateService, type DateService } from '../src/dates/services/date-service';

/**
 * #454 — `MapDataService.extractYear` required a 4-digit year, silently
 * dropping fictional-era timestamps under 1000 like `82 BBY` / `41 BBY`.
 * This suite fences the deferral to `DateService.parseDate` so fictional
 * eras and standard dates both resolve correctly.
 */

interface ExtractYearAccess {
	extractYear: (dateStr?: string | number, universe?: string) => number | undefined;
}

function makeService(dateService: DateService | null): MapDataService {
	const plugin = {
		settings: {
			propertyAliases: {},
			valueAliases: {},
		},
		getEventService: () => null,
		getDateService: () => dateService,
	} as never;
	return new MapDataService(plugin);
}

function privates(service: MapDataService): ExtractYearAccess {
	return service as unknown as ExtractYearAccess;
}

describe('MapDataService.extractYear — fictional eras (#454)', () => {
	let dateService: DateService;
	let service: MapDataService;

	beforeEach(() => {
		dateService = createDateService({
			enableFictionalDates: true,
			showBuiltInDateSystems: true,
			fictionalDateSystems: [],
		});
		service = makeService(dateService);
	});

	it('parses descending-era BBY years as negative canonical year', () => {
		expect(privates(service).extractYear('82 BBY')).toBe(-82);
		expect(privates(service).extractYear('41 BBY')).toBe(-41);
	});

	it('parses ascending-era ABY years as positive canonical year', () => {
		expect(privates(service).extractYear('15 ABY')).toBe(15);
		expect(privates(service).extractYear('200 ABY')).toBe(200);
	});

	it('orders BBY years chronologically when sorted numerically', () => {
		const years = ['82 BBY', '41 BBY', '15 ABY', '200 ABY']
			.map(d => privates(service).extractYear(d))
			.filter((y): y is number => y !== undefined)
			.sort((a, b) => a - b);

		expect(years).toEqual([-82, -41, 15, 200]);
	});

	it('parses sub-1000 fictional-era years that the legacy 4-digit cap dropped', () => {
		expect(privates(service).extractYear('5 BBY')).toBe(-5);
		expect(privates(service).extractYear('1 ABY')).toBe(1);
	});

	it('still parses standard ISO and 4-digit dates correctly', () => {
		expect(privates(service).extractYear('1820-12-15')).toBe(1820);
		expect(privates(service).extractYear('1905')).toBe(1905);
		expect(privates(service).extractYear(1820)).toBe(1820);
	});

	it('returns undefined for unparseable input', () => {
		expect(privates(service).extractYear(undefined)).toBeUndefined();
		expect(privates(service).extractYear('')).toBeUndefined();
		expect(privates(service).extractYear('not a date')).toBeUndefined();
	});
});

describe('MapDataService.extractYear — fallback when DateService unavailable', () => {
	const service = makeService(null);

	it('parses 4-digit ISO dates via regex fallback', () => {
		expect(privates(service).extractYear('1820-12-15')).toBe(1820);
		expect(privates(service).extractYear('1905-04-05')).toBe(1905);
	});

	it('accepts numeric years in the 1000-9999 range', () => {
		expect(privates(service).extractYear(1820)).toBe(1820);
		expect(privates(service).extractYear(9999)).toBe(9999);
	});

	it('returns undefined for sub-1000 numeric inputs (legacy data-quality cap)', () => {
		expect(privates(service).extractYear(82)).toBeUndefined();
		expect(privates(service).extractYear(0)).toBeUndefined();
	});

	it('returns undefined when the string lacks a 4-digit year', () => {
		expect(privates(service).extractYear('82 BBY')).toBeUndefined();
	});
});
