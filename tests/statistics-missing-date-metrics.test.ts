/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { StatisticsService } from '../src/statistics/services/statistics-service';
import type { PersonNode } from '../src/core/family-graph';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #676 — the Statistics Dashboard "issues notice" reported missing births even
 * when "Data completeness → with birth date" read 100%. The completeness
 * percentages are derived from the FamilyGraph people, but the missing-date
 * counts subtracted a separate VaultStats scan from the FamilyGraph total,
 * mixing two scans whose person sets can disagree. This suite fences the
 * missing-date and living counts to the SAME FamilyGraph people, so the two
 * dashboard sections can never contradict each other.
 */

interface QualityAccess {
	computeQualityMetrics: (
		vaultStats: unknown,
		analytics: unknown
	) => {
		missingBirthDate: number;
		missingDeathDate: number;
		livingPeople: number;
	};
}

// Minimal stubs for the two cross-cut sources computeQualityMetrics still reads
// for non-people metrics. peopleWith* are deliberately mismatched from the
// FamilyGraph people to prove they no longer feed the missing-date counts.
const STUB_VAULT_STATS = {
	people: {
		peopleWithBirthDate: 0,
		peopleWithDeathDate: 0,
		livingPeople: 999,
	},
	places: { totalPlaces: 0, placesWithCoordinates: 0 },
};
const STUB_ANALYTICS = { relationshipMetrics: { orphanedPeople: 0 } };

function person(partial: Partial<PersonNode>): PersonNode {
	return partial as PersonNode;
}

function makeService(people: PersonNode[]): StatisticsService {
	const settings = {
		enableFictionalDates: false,
		livingPersonAgeThreshold: 100,
		propertyAliases: {},
		valueAliases: {},
	} as unknown as CanvasRootsSettings;
	const app = {
		vault: { getMarkdownFiles: () => [] },
		metadataCache: { getFileCache: () => null },
	} as never;
	const plugin = { getDateService: () => null } as never;
	const service = new StatisticsService(app, settings, plugin);
	// Pre-seed the lazily-created FamilyGraphService so getAllPeople is stubbed.
	(service as unknown as { familyGraphService: { getAllPeople: () => PersonNode[] } }).familyGraphService = {
		getAllPeople: () => people,
	};
	return service;
}

function quality(service: StatisticsService) {
	return (service as unknown as QualityAccess).computeQualityMetrics(STUB_VAULT_STATS, STUB_ANALYTICS);
}

describe('StatisticsService missing-date metrics (#676)', () => {
	it('reports zero missing births when every FamilyGraph person has a birth date', () => {
		const people = [
			person({ birthDate: '1850', deathDate: '1900' }),
			person({ birthDate: '1990' }),
			person({ birthDate: '1700' }),
		];
		const metrics = quality(makeService(people));
		// VaultStats reports 0 with-birth-date, but the count must follow the
		// FamilyGraph people that drive the completeness percentage instead.
		expect(metrics.missingBirthDate).toBe(0);
	});

	it('counts only FamilyGraph people who lack a birth date', () => {
		const people = [
			person({ birthDate: '1850' }),
			person({}),
			person({ deathDate: '1900' }),
		];
		expect(quality(makeService(people)).missingBirthDate).toBe(2);
	});

	it('excludes plausibly-living people from missing deaths', () => {
		const people = [
			person({ birthDate: '1850', deathDate: '1900' }), // has death → not missing
			person({ birthDate: '1990' }),                    // recent birth → living
			person({ birthDate: '1700' }),                    // long-dead, no death → missing
			person({}),                                       // no birth year → not living → missing
		];
		const metrics = quality(makeService(people));
		expect(metrics.livingPeople).toBe(1);
		expect(metrics.missingDeathDate).toBe(2);
	});

	it('treats a person born within the living threshold as living, not missing a death', () => {
		const people = [person({ birthDate: '2000' })];
		const metrics = quality(makeService(people));
		expect(metrics.livingPeople).toBe(1);
		expect(metrics.missingDeathDate).toBe(0);
	});
});
