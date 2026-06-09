/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import type { PersonNode } from '../src/core/family-graph';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #643 (part b) — sub-place destination roll-up, exercised end-to-end through a
 * real PlaceGraphService so the wiring (place-node ancestry + anchor building +
 * getMigrationAnalysis) is covered, not just the pure helper. The graph layer is
 * where a name-vs-basename mismatch would silently skip the roll-up, so this test
 * builds an actual place hierarchy and asserts the aggregated destinations.
 *
 * Scenario mirrors the reporter's vault: two migrants name Coruscant directly, a
 * third names the Jedi Temple (a sub-place of Coruscant) and should roll up to
 * it; a fourth names an outpost whose parent nobody names and must NOT roll up.
 */

interface MockEvent {
	eventType: string;
	place: string;
	date: string;
}

function addPlace(app: App, name: string, crId: string, parent?: string): void {
	const file = makeTFile({ path: `Places/${name}.md`, basename: name, extension: 'md' });
	app.vault.files.set(file.path, file);
	const fm: Record<string, unknown> = { cr_type: 'place', cr_id: crId, title: name };
	if (parent) fm.parent_place = `[[${parent}]]`;
	app.metadataCache._setFrontmatter(file, fm);
}

function person(name: string, birthPlace: string): PersonNode {
	return {
		file: makeTFile({ path: `People/${name}.md`, basename: name, extension: 'md' }),
		birthPlace,
	} as unknown as PersonNode;
}

function makeService(
	people: PersonNode[],
	events: Record<string, MockEvent[]>,
	setupPlaces?: (app: App) => void
): StatisticsService {
	const app = new App();

	if (setupPlaces) {
		setupPlaces(app);
	} else {
		// A small place hierarchy: Jedi Temple inside Coruscant; Lonely Outpost inside
		// Outer Rim (which is never a migration endpoint); Shili the shared origin.
		addPlace(app, 'Coruscant 643b', 'iss643b-p01-tst-200');
		addPlace(app, 'Jedi Temple 643b', 'iss643b-p02-tst-201', 'Coruscant 643b');
		addPlace(app, 'Outer Rim 643b', 'iss643b-p03-tst-202');
		addPlace(app, 'Lonely Outpost 643b', 'iss643b-p04-tst-203', 'Outer Rim 643b');
		addPlace(app, 'Shili 643b', 'iss643b-p05-tst-204');
	}

	const settings = {
		enableFictionalDates: false,
		livingPersonAgeThreshold: 100,
		propertyAliases: {},
		valueAliases: {},
	} as unknown as CanvasRootsSettings;

	const eventService = {
		getEventsForPerson: (personLink: string): MockEvent[] => events[personLink] ?? [],
	};
	const plugin = {
		getEventService: () => eventService,
		getDateService: () => null,
	} as never;

	const service = new StatisticsService(app, settings, plugin);
	// Pre-seed the family graph so getAllPeople returns our fixtures directly.
	(service as unknown as { familyGraphService: { getAllPeople: () => PersonNode[] } }).familyGraphService = {
		getAllPeople: () => people,
	};
	return service;
}

function immigration(place: string, date: string): MockEvent {
	return { eventType: 'immigration', place: `[[${place}]]`, date };
}

describe('StatisticsService migration sub-place roll-up (#643b)', () => {
	const people = [
		person('Migrant Coruscant A 643b', '[[Shili 643b]]'),
		person('Migrant Coruscant B 643b', '[[Shili 643b]]'),
		person('Migrant Temple 643b', '[[Shili 643b]]'),
		person('Migrant Outpost 643b', '[[Shili 643b]]'),
	];
	const events: Record<string, MockEvent[]> = {
		'[[Migrant Coruscant A 643b]]': [immigration('Coruscant 643b', '2005')],
		'[[Migrant Coruscant B 643b]]': [immigration('Coruscant 643b', '2006')],
		'[[Migrant Temple 643b]]': [immigration('Jedi Temple 643b', '2007')],
		'[[Migrant Outpost 643b]]': [immigration('Lonely Outpost 643b', '2008')],
	};

	function destinations(): Map<string, number> {
		const analysis = makeService(people, events).getMigrationAnalysis();
		return new Map(analysis.topDestinations.map(d => [d.name, d.count]));
	}

	it('rolls the Jedi Temple migrant up so Coruscant counts all three', () => {
		expect(destinations().get('Coruscant 643b')).toBe(3);
	});

	it('drops the sub-place as its own destination', () => {
		expect(destinations().has('Jedi Temple 643b')).toBe(false);
	});

	it('does NOT roll up a sub-place whose parent nobody names', () => {
		const dest = destinations();
		expect(dest.get('Lonely Outpost 643b')).toBe(1);
		expect(dest.has('Outer Rim 643b')).toBe(false);
	});

	it('counts every migrant as moved and shares the single origin', () => {
		const analysis = makeService(people, events).getMigrationAnalysis();
		expect(analysis.analyzedCount).toBe(4);
		expect(analysis.movedCount).toBe(4);
		expect(analysis.migrationRate).toBe(100);
		expect(new Map(analysis.topOrigins.map(o => [o.name, o.count])).get('Shili 643b')).toBe(4);
	});

	it('routes the rolled-up migrant from the origin to Coruscant', () => {
		const analysis = makeService(people, events).getMigrationAnalysis();
		const routes = new Map(analysis.topRoutes.map(r => [`${r.from}|||${r.to}`, r.count]));
		expect(routes.get('Shili 643b|||Coruscant 643b')).toBe(3);
		expect(routes.get('Shili 643b|||Lonely Outpost 643b')).toBe(1);
	});
});

/**
 * #684 — per-leg routes through the real service. A net first -> last model
 * undercounts a group's shared move (members born elsewhere land on a different
 * row) and shows no route at all for a round trip. Counting each leg fixes both.
 */
describe('StatisticsService per-leg migration routes (#684)', () => {
	function setupPlaces(app: App): void {
		addPlace(app, 'Startown 684', 'iss684-p01-tst-300');
		addPlace(app, 'Midtown 684', 'iss684-p02-tst-301');
		addPlace(app, 'Newtown 684', 'iss684-p03-tst-302');
		addPlace(app, 'Tatooine 684', 'iss684-p04-tst-303');
		addPlace(app, 'Ator 684', 'iss684-p05-tst-304');
	}

	// Family of four moves to Newtown: father + two children born at Startown; the
	// mother was born at Midtown and moved Midtown -> Startown before the family
	// move. Plus a round trip (Cliegg: Tatooine -> Ator -> Tatooine) and a one-way
	// mover (Owen: Ator -> Tatooine) who share the Ator -> Tatooine leg.
	const people = [
		person('Father 684', '[[Startown 684]]'),
		person('Child One 684', '[[Startown 684]]'),
		person('Child Two 684', '[[Startown 684]]'),
		person('Mother 684', '[[Midtown 684]]'),
		person('Cliegg 684', '[[Tatooine 684]]'),
		person('Owen 684', '[[Ator 684]]'),
	];
	const events: Record<string, MockEvent[]> = {
		'[[Father 684]]': [immigration('Newtown 684', '1990')],
		'[[Child One 684]]': [immigration('Newtown 684', '1992')],
		'[[Child Two 684]]': [immigration('Newtown 684', '1993')],
		'[[Mother 684]]': [immigration('Startown 684', '1985'), immigration('Newtown 684', '1990')],
		'[[Cliegg 684]]': [immigration('Ator 684', '2000'), immigration('Tatooine 684', '2010')],
		'[[Owen 684]]': [immigration('Tatooine 684', '2005')],
	};

	function routes(): Map<string, number> {
		const analysis = makeService(people, events, setupPlaces).getMigrationAnalysis();
		return new Map(analysis.topRoutes.map(r => [`${r.from}|||${r.to}`, r.count]));
	}

	it('counts the family shared leg for every member, including one born elsewhere', () => {
		expect(routes().get('Startown 684|||Newtown 684')).toBe(4);
		expect(routes().get('Midtown 684|||Startown 684')).toBe(1);
	});

	it('puts a round-tripper and a one-way mover on the same shared leg', () => {
		expect(routes().get('Ator 684|||Tatooine 684')).toBe(2);
		expect(routes().get('Tatooine 684|||Ator 684')).toBe(1);
	});

	it('still counts each person once for the moved/rate totals', () => {
		const analysis = makeService(people, events, setupPlaces).getMigrationAnalysis();
		expect(analysis.analyzedCount).toBe(6);
		expect(analysis.movedCount).toBe(6);
		expect(analysis.migrationRate).toBe(100);
	});
});
