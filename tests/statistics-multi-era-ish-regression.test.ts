/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import { createDateService } from '../src/dates/services/date-service';
import type { CanvasRootsSettings } from '../src/settings';
import type { FictionalDateSystem } from '../src/dates/types/date-types';
import type { PersonNode } from '../src/core/family-graph';

/**
 * #566 trace — reporter @doctorwodka's character disappeared from Longevity
 * Analysis after moving birth from DE to EF era:
 *
 *   Before era change: born "DE -70ish", died "DE 1265-02-09"
 *   After era change:  born "EF 30ish", died "DE 1265-02-09"
 *
 * Eras: EF (epoch -100), DE (epoch 0). Both forward-counting.
 *
 * Expected: lifespan = 1335 in both cases (canonical -70 → 1265).
 * Actual (per reporter): person appears pre-swap, disappears post-swap.
 *
 * This suite simulates the exact data path through StatisticsService to
 * pinpoint which filter is dropping the character.
 */

const REPORTER_SYSTEM: FictionalDateSystem = {
	id: 'reporter-system',
	name: 'Reporter multi-era system',
	eras: [
		{ id: 'era-of-forging', name: 'Era of Forging', abbrev: 'EF', epoch: -100, direction: 'forward' },
		{ id: 'dawn-era', name: 'Dawn Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

function makeSettings(): CanvasRootsSettings {
	return {
		enableFictionalDates: true,
		showBuiltInDateSystems: false,
		fictionalDateSystems: [REPORTER_SYSTEM],
		propertyAliases: {},
		valueAliases: {},
	} as unknown as CanvasRootsSettings;
}

function makePerson(overrides: Partial<PersonNode>): PersonNode {
	return {
		crId: 'p:elf',
		name: 'Long-lived Elf',
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

function makeServiceWithDateService(people: PersonNode[]): StatisticsService {
	const settings = makeSettings();
	const dateService = createDateService({
		enableFictionalDates: settings.enableFictionalDates,
		showBuiltInDateSystems: settings.showBuiltInDateSystems,
		fictionalDateSystems: settings.fictionalDateSystems,
	});
	const plugin = {
		getDateService: () => dateService,
		settings,
	} as never;
	const service = new StatisticsService({} as never, settings, plugin);
	const mockFamilyGraph = {
		getAllPeople: () => people,
	};
	(service as unknown as { familyGraphService: unknown }).familyGraphService = mockFamilyGraph;
	return service;
}

describe('#566 reporter scenario — pre-swap state (born "DE -70ish")', () => {
	const elf = makePerson({
		birthDate: 'DE -70ish',
		deathDate: 'DE 1265-02-09',
		birthPlace: 'Ulnox',
	});
	const service = makeServiceWithDateService([elf]);
	const analysis = service.getLongevityAnalysis();

	it('includes the elf in overall lifespans', () => {
		expect(analysis.overall.count).toBe(1);
	});

	it('reports lifespan 1335 (canonical -70 → standard 1265)', () => {
		expect(analysis.overall.maxAge).toBe(1335);
	});

	it('places the elf in the -70s birth decade row', () => {
		const minus70s = analysis.byBirthDecade.find(d => d.decade === -70);
		expect(minus70s).toBeDefined();
		expect(minus70s?.stats.count).toBe(1);
	});
});

describe('#566 reporter scenario — post-swap state (born "EF 30ish") — repaired by #562 fix', () => {
	const elf = makePerson({
		birthDate: 'EF 30ish',
		deathDate: 'DE 1265-02-09',
		birthPlace: 'Ulnox',
	});
	const service = makeServiceWithDateService([elf]);
	const analysis = service.getLongevityAnalysis();

	// Before the #562 approximation-marker strip, "EF 30ish" failed every
	// fictional pattern AND the final \b(\d+)\b fallback (because "30" has
	// no trailing word boundary — "ish" letters share the word-class with
	// the trailing "0"). extractYear returned null, calculateLifespan
	// returned null, and the `age !== null` filter silently dropped the
	// elf. With #562's approximation strip, "EF 30ish" parses as
	// fictional with canonical year -70 and the elf reappears.
	it('includes the elf post-#562 (was silently dropped pre-#562)', () => {
		expect(analysis.overall.count).toBe(1);
	});

	it('keeps the -70s decade row (EF 30 canonical = -100 + 30 = -70)', () => {
		const minus70s = analysis.byBirthDecade.find(d => d.decade === -70);
		expect(minus70s).toBeDefined();
	});

	it('preserves the 1335-year lifespan across the era swap', () => {
		expect(analysis.overall.maxAge).toBe(1335);
	});
});