/* eslint-disable @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import type { PersonNode } from '../src/core/family-graph';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #458 — Marriage stats had a hardcoded upper age cap of 80, bypassing the
 * `maxAge` getter that already returns `Infinity` when `enableFictionalDates`
 * is on. Two surfaces affected: marriage-pattern age stats (age at first
 * marriage) and longest-marriages records (marriage duration). This suite
 * fences both against the hardcoded 80 regression.
 */

function makeSettings(overrides: Partial<CanvasRootsSettings> = {}): CanvasRootsSettings {
	return {
		enableFictionalDates: false,
		propertyAliases: {},
		valueAliases: {},
		...overrides,
	} as unknown as CanvasRootsSettings;
}

function makePerson(overrides: Partial<PersonNode> = {}): PersonNode {
	return {
		crId: 'p:1',
		name: 'Test',
		stepfatherCrIds: [],
		stepmotherCrIds: [],
		adoptiveParentCrIds: [],
		adoptedChildCrIds: [],
		stepchildrenCrIds: [],
		parentCrIds: [],
		spouseCrIds: [],
		childrenCrIds: [],
		file: {} as never,
		...overrides,
	} as PersonNode;
}

function makeService(settings: CanvasRootsSettings, people: PersonNode[]): StatisticsService {
	const service = new StatisticsService({} as never, settings);
	const mockFamilyGraph = {
		getAllPeople: () => people,
	};
	(service as unknown as { familyGraphService: unknown }).familyGraphService = mockFamilyGraph;
	return service;
}

describe('Marriage pattern age cap — fictional dates (#458)', () => {
	it('includes marriages at age 90+ when enableFictionalDates is on', () => {
		const people: PersonNode[] = [
			makePerson({
				crId: 'p:1',
				name: 'Long-lived A',
				birthDate: '1000',
				sex: 'm',
				spouses: [{ personId: 'p:2', marriageDate: '1095' }],
			}),
			makePerson({
				crId: 'p:2',
				name: 'Long-lived B',
				birthDate: '1010',
				sex: 'f',
				spouses: [{ personId: 'p:1', marriageDate: '1095' }],
			}),
		];

		const service = makeService(makeSettings({ enableFictionalDates: true }), people);
		const analysis = service.getMarriagePatternAnalysis();

		expect(analysis.overall.count).toBe(2);
		expect(analysis.overall.maxAge).toBeGreaterThanOrEqual(85);
	});

	it('still excludes marriages over the real-world cap (120) when fictional dates are off', () => {
		const people: PersonNode[] = [
			makePerson({
				crId: 'p:1',
				name: 'Implausible A',
				birthDate: '1000',
				sex: 'm',
				spouses: [{ personId: 'p:2', marriageDate: '1130' }],
			}),
		];

		const service = makeService(makeSettings({ enableFictionalDates: false }), people);
		const analysis = service.getMarriagePatternAnalysis();

		expect(analysis.overall.count).toBe(0);
	});

	it('admits marriages between 80 and 120 in real-world mode (matches lifespan cap)', () => {
		const people: PersonNode[] = [
			makePerson({
				crId: 'p:1',
				name: 'Late marriage',
				birthDate: '1900',
				sex: 'm',
				spouses: [{ personId: 'p:2', marriageDate: '1985' }],
			}),
		];

		const service = makeService(makeSettings({ enableFictionalDates: false }), people);
		const analysis = service.getMarriagePatternAnalysis();

		expect(analysis.overall.count).toBe(1);
		expect(analysis.overall.maxAge).toBe(85);
	});

	it('still excludes marriages below the lower bound (10)', () => {
		const people: PersonNode[] = [
			makePerson({
				crId: 'p:1',
				name: 'Too young',
				birthDate: '1900',
				sex: 'm',
				spouses: [{ personId: 'p:2', marriageDate: '1905' }],
			}),
		];

		const service = makeService(makeSettings({ enableFictionalDates: true }), people);
		const analysis = service.getMarriagePatternAnalysis();

		expect(analysis.overall.count).toBe(0);
	});
});

describe('Longest-marriage duration cap — fictional dates (#458)', () => {
	it('includes marriages lasting 100+ years when enableFictionalDates is on', () => {
		const people: PersonNode[] = [
			makePerson({
				crId: 'p:1',
				name: 'Long-married A',
				birthDate: '1000',
				deathDate: '1200',
				sex: 'm',
				spouses: [{ personId: 'p:2', marriageDate: '1050' }],
			}),
			makePerson({
				crId: 'p:2',
				name: 'Long-married B',
				birthDate: '1010',
				deathDate: '1190',
				sex: 'f',
				spouses: [{ personId: 'p:1', marriageDate: '1050' }],
			}),
		];

		const service = makeService(makeSettings({ enableFictionalDates: true }), people);
		const records = service.getRecordSuperlatives();
		const longest = records.longestMarriages;

		expect(longest.entries.length).toBeGreaterThan(0);
		expect(longest.entries[0].displayValue).toMatch(/1[45]0 years/);
	});

	it('still excludes marriages over the real-world cap (120) when fictional dates are off', () => {
		const people: PersonNode[] = [
			makePerson({
				crId: 'p:1',
				name: 'Implausible',
				birthDate: '1000',
				deathDate: '1150',
				sex: 'm',
				spouses: [{ personId: 'p:2', marriageDate: '1010' }],
			}),
			makePerson({
				crId: 'p:2',
				name: 'Implausible spouse',
				birthDate: '1010',
				deathDate: '1140',
				sex: 'f',
				spouses: [{ personId: 'p:1', marriageDate: '1010' }],
			}),
		];

		const service = makeService(makeSettings({ enableFictionalDates: false }), people);
		const records = service.getRecordSuperlatives();

		expect(records.longestMarriages.entries.length).toBe(0);
	});
});