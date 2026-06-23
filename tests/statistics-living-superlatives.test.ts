/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import { createDateService } from '../src/dates/services/date-service';
import type { CanvasRootsSettings } from '../src/settings';
import type { PersonNode } from '../src/core/family-graph';

/**
 * #749 — Record superlatives ("Oldest people") now include living people,
 * aged against a "current date": today for the real world, the per-universe
 * `current_date` for fictional universes. A real-world living age is capped so
 * a merely-missing death date doesn't surface someone as implausibly old;
 * fictional-universe people are uncapped, and `cr_living` forces inclusion.
 */

function makeSettings(): CanvasRootsSettings {
	return {
		enableFictionalDates: false,
		showBuiltInDateSystems: false,
		fictionalDateSystems: [],
		propertyAliases: {},
		valueAliases: {},
	} as unknown as CanvasRootsSettings;
}

function makePerson(overrides: Partial<PersonNode>): PersonNode {
	return {
		crId: 'p',
		name: 'Person',
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

function makeService(people: PersonNode[], universeService?: unknown): StatisticsService {
	const settings = makeSettings();
	const dateService = createDateService({
		enableFictionalDates: settings.enableFictionalDates,
		showBuiltInDateSystems: settings.showBuiltInDateSystems,
		fictionalDateSystems: settings.fictionalDateSystems,
	});
	const plugin = { getDateService: () => dateService, settings } as never;
	const service = new StatisticsService({} as never, settings, plugin);
	(service as unknown as { familyGraphService: unknown }).familyGraphService = {
		getAllPeople: () => people,
	};
	if (universeService) {
		(service as unknown as { universeService: unknown }).universeService = universeService;
	}
	return service;
}

const oldestEntries = (s: StatisticsService) => s.getRecordSuperlatives().oldestPeople.entries;
const byName = (entries: { name: string; displayValue: string }[], name: string) =>
	entries.find(e => e.name === name);

const thisYear = new Date().getFullYear();

describe('Oldest people includes living people (#749)', () => {
	it('ages a real-world living person to today and flags it', () => {
		const living = makePerson({ crId: 'a', name: 'Alive Alice', birthDate: String(thisYear - 50) });
		const dead = makePerson({ crId: 'b', name: 'Dead Dan', birthDate: '1900', deathDate: '1962' });
		const entries = oldestEntries(makeService([living, dead]));

		expect(byName(entries, 'Alive Alice')?.displayValue).toBe('50 years (living)');
		// Age-at-death is unchanged and not flagged as living.
		expect(byName(entries, 'Dead Dan')?.displayValue).toBe('62 years');
	});

	it('caps a real-world living age so a missing death date is not implausibly old', () => {
		const ancient = makePerson({ crId: 'c', name: 'Ancient Andy', birthDate: String(thisYear - 200) });
		const entries = oldestEntries(makeService([ancient]));
		expect(byName(entries, 'Ancient Andy')).toBeUndefined();
	});

	it('lets cr_living force inclusion past the real-world cap', () => {
		const flagged = makePerson({
			crId: 'd',
			name: 'Methuselah',
			birthDate: String(thisYear - 200),
			cr_living: true,
		});
		const entries = oldestEntries(makeService([flagged]));
		expect(byName(entries, 'Methuselah')?.displayValue).toBe('200 years (living)');
	});

	it('ages a fictional-universe living person to its current_date, uncapped', () => {
		const mockUniverses = {
			getUniverseByName: (n: string) => (n === 'Eldoria' ? { name: 'Eldoria', currentDate: '1000' } : null),
			getUniverse: () => null,
		};
		// Age 500 exceeds the real-world cap, but a fictional universe is uncapped.
		const elf = makePerson({ crId: 'e', name: 'Old Elf', birthDate: '500', universe: 'Eldoria' });
		const entries = oldestEntries(makeService([elf], mockUniverses));
		expect(byName(entries, 'Old Elf')?.displayValue).toBe('500 years (living)');
	});

	it('excludes a fictional-universe living person when the universe has no current date', () => {
		const mockUniverses = {
			getUniverseByName: () => ({ name: 'Void' }),
			getUniverse: () => null,
		};
		const ghost = makePerson({ crId: 'f', name: 'Timeless Tam', birthDate: '100', universe: 'Void' });
		const entries = oldestEntries(makeService([ghost], mockUniverses));
		expect(byName(entries, 'Timeless Tam')).toBeUndefined();
	});
});
