/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import type { PersonNode } from '../src/core/family-graph';
import type { CanvasRootsSettings } from '../src/types';

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
	const file = new TFile({ path: `Places/${name}.md`, basename: name, extension: 'md' });
	app.vault.files.set(file.path, file);
	const fm: Record<string, unknown> = { cr_type: 'place', cr_id: crId, title: name };
	if (parent) fm.parent_place = `[[${parent}]]`;
	app.metadataCache._setFrontmatter(file, fm);
}

function person(name: string, birthPlace: string): PersonNode {
	return {
		file: new TFile({ path: `People/${name}.md`, basename: name, extension: 'md' }),
		birthPlace,
	} as unknown as PersonNode;
}

function makeService(people: PersonNode[], events: Record<string, MockEvent[]>): StatisticsService {
	const app = new App();

	// A small place hierarchy: Jedi Temple inside Coruscant; Lonely Outpost inside
	// Outer Rim (which is never a migration endpoint); Shili the shared origin.
	addPlace(app, 'Coruscant 643b', 'iss643b-p01-tst-200');
	addPlace(app, 'Jedi Temple 643b', 'iss643b-p02-tst-201', 'Coruscant 643b');
	addPlace(app, 'Outer Rim 643b', 'iss643b-p03-tst-202');
	addPlace(app, 'Lonely Outpost 643b', 'iss643b-p04-tst-203', 'Outer Rim 643b');
	addPlace(app, 'Shili 643b', 'iss643b-p05-tst-204');

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
