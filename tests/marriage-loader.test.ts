import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';

/**
 * #498 — Map journey mode missed marriages on multi-spouse people because
 * `MapDataService` only read legacy flat `marriage_*` frontmatter; the
 * indexed `spouseN_marriage_*` schema (which is what the bidirectional
 * linker writes for multi-spouse data after #481) was ignored entirely.
 *
 * `loadMarriages` reads indexed slots first (1-10), falls back to a single
 * legacy flat entry, and returns undefined when neither shape has data.
 *
 * Reproduction: @DigitalDreamn's Cliegg Lars (married twice, indexed
 * format) showed zero marriage waypoints on his journey.
 */

interface PrivateMembers {
	loadMarriages: (fm: Record<string, unknown>) => unknown[] | undefined;
}

function makeService(): MapDataService {
	const plugin = {
		settings: {
			propertyAliases: {},
			valueAliases: {},
		},
		getEventService: () => null,
	} as never;
	return new MapDataService(plugin);
}

function privates(service: MapDataService): PrivateMembers {
	return service as unknown as PrivateMembers;
}

describe('MapDataService.loadMarriages (#498)', () => {
	const service = makeService();

	it('returns undefined when no marriage data is present', () => {
		expect(privates(service).loadMarriages({})).toBeUndefined();
	});

	it('reads a single indexed marriage from spouse1_marriage_* slots', () => {
		const fm = {
			spouse1_marriage_location: '[[Tatooine]]',
			spouse1_marriage_location_id: 'mtr-830-xna-790',
			spouse1_marriage_date: '47 BBY',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toEqual([
			{ place: 'Tatooine', placeId: 'mtr-830-xna-790', date: '47 BBY' },
		]);
	});

	it('reads multiple indexed marriages and preserves order', () => {
		const fm = {
			spouse1_marriage_location: '[[Tatooine]]',
			spouse1_marriage_date: '47 BBY',
			spouse2_marriage_location: '[[Mos Espa]]',
			spouse2_marriage_date: '40 BBY',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toHaveLength(2);
		expect(result?.[0]).toMatchObject({ place: 'Tatooine', date: '47 BBY' });
		expect(result?.[1]).toMatchObject({ place: 'Mos Espa', date: '40 BBY' });
	});

	it('skips empty indexed slots between populated ones', () => {
		// User who deleted spouse2 but still has spouse1 and spouse3 entries.
		// We don't try to be clever about renumbering — empty slots are skipped.
		const fm = {
			spouse1_marriage_location: '[[Tatooine]]',
			spouse3_marriage_location: '[[Naboo]]',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toHaveLength(2);
		expect(result?.[0]).toMatchObject({ place: 'Tatooine' });
		expect(result?.[1]).toMatchObject({ place: 'Naboo' });
	});

	it('includes a slot when only the date is set (no place)', () => {
		// Date-only marriage record still counts as a populated slot — caller
		// downstream filters it out (no resolvable place = no waypoint).
		const fm = {
			spouse1_marriage_date: '47 BBY',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toHaveLength(1);
		expect(result?.[0]).toMatchObject({ date: '47 BBY' });
	});

	it('includes a slot when only the place_id is set (no place name)', () => {
		const fm = {
			spouse1_marriage_location_id: 'mtr-830-xna-790',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toHaveLength(1);
		expect(result?.[0]).toMatchObject({ placeId: 'mtr-830-xna-790' });
	});

	it('falls back to legacy flat marriage_* when no indexed slots are populated', () => {
		const fm = {
			marriage_place: '[[Boston]]',
			marriage_place_id: 'pl-bos-001',
			marriage_date: '1920-01-08',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toEqual([
			{ place: 'Boston', placeId: 'pl-bos-001', date: '1920-01-08' },
		]);
	});

	it('prefers indexed slots over legacy flat fields when both are present', () => {
		// Mixed-state vault during a migration — indexed wins so we don't
		// double-count the same marriage from both shapes.
		const fm = {
			spouse1_marriage_location: '[[Tatooine]]',
			marriage_place: '[[Boston]]',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result).toHaveLength(1);
		expect(result?.[0]).toMatchObject({ place: 'Tatooine' });
	});

	it('unwraps wikilink-formatted place strings', () => {
		const fm = {
			spouse1_marriage_location: '[[Tatooine|Tatooine (planet)]]',
		};

		const result = privates(service).loadMarriages(fm);

		expect(result?.[0]).toMatchObject({ place: 'Tatooine' });
	});

	it('accepts numeric year-only dates', () => {
		const fm = {
			spouse1_marriage_date: 1920,
		};

		const result = privates(service).loadMarriages(fm);

		expect(result?.[0]).toMatchObject({ date: 1920 });
	});
});
