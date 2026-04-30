import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import type { MapMarker } from '../src/maps/types/map-types';

/**
 * #501 — Marriage between two spouses produced one marker per spouse on the
 * map (Owen's `spouse1_marriage_*` → marker for Owen at Tatooine; Beru's
 * `spouse1_marriage_*` → separate marker for Beru at the same place). The
 * #493 `eventCrId` dedup didn't apply because marriages live as frontmatter
 * on each spouse's note rather than as `cr_type: event` notes.
 *
 * `dedupeMarriageMarkers` groups marriage markers by a sorted-pair key
 * (sorted person+spouse cr_ids, place, date) and builds a `participants`
 * list naming both spouses on the surviving marker.
 *
 * Reported by @DigitalDreamn during #493 and #498 verification.
 */

interface PrivateMembers {
	dedupeMarriageMarkers: (markers: MapMarker[]) => MapMarker[];
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

function makeMarker(overrides: Partial<MapMarker>): MapMarker {
	return {
		personId: 'person-default',
		personName: 'Default Person',
		type: 'marriage',
		lat: 0,
		lng: 0,
		placeName: 'Default Place',
		...overrides,
	};
}

describe('MapDataService.dedupeMarriageMarkers (#501)', () => {
	it('passes through non-marriage markers unchanged', () => {
		const service = makeService();
		const markers = [
			makeMarker({ type: 'birth', personName: 'Alice', placeId: 'pl-1' }),
			makeMarker({ type: 'death', personName: 'Bob', placeId: 'pl-2' }),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(2);
		expect(result.every(m => m.participants === undefined)).toBe(true);
	});

	it('passes through a single marriage marker (partner not in dataset)', () => {
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-owen',
				personName: 'Owen Lars',
				placeId: 'pl-tat',
				date: '19 BBY',
				spouseId: 'p-beru',
				spouseName: 'Beru Whitesun',
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(1);
		expect(result[0].participants).toBeUndefined();
		expect(result[0].personName).toBe('Owen Lars');
	});

	it('collapses Owen→Beru and Beru→Owen markers into one with both as participants', () => {
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-owen',
				personName: 'Owen Lars',
				placeId: 'pl-tat',
				date: '19 BBY',
				spouseId: 'p-beru',
				spouseName: 'Beru Whitesun',
			}),
			makeMarker({
				personId: 'p-beru',
				personName: 'Beru Whitesun',
				placeId: 'pl-tat',
				date: '19 BBY',
				spouseId: 'p-owen',
				spouseName: 'Owen Lars',
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(1);
		expect(result[0].participants).toHaveLength(2);
		const names = result[0].participants?.map(p => p.personName).sort();
		expect(names).toEqual(['Beru Whitesun', 'Owen Lars']);
		// Exactly one participant flagged primary (the kept marker's person).
		const primaries = result[0].participants?.filter(p => p.isPrimary);
		expect(primaries).toHaveLength(1);
	});

	it('passes through a marriage marker with no spouseId set (legacy fallback)', () => {
		// Legacy flat data without `spouse_id` populated — no partner identity
		// to dedup against. Falls through unchanged.
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-owen',
				personName: 'Owen Lars',
				placeId: 'pl-tat',
				date: '19 BBY',
				// no spouseId
			}),
			makeMarker({
				personId: 'p-beru',
				personName: 'Beru Whitesun',
				placeId: 'pl-tat',
				date: '19 BBY',
				// no spouseId
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(2);
		expect(result.every(m => m.participants === undefined)).toBe(true);
	});

	it('keeps two unrelated couples at the same place separate', () => {
		// Owen ↔ Beru and Cliegg ↔ Shmi both married at Tatooine should
		// produce two distinct markers, not one merged group.
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-owen',
				personName: 'Owen Lars',
				placeId: 'pl-tat',
				date: '19 BBY',
				spouseId: 'p-beru',
				spouseName: 'Beru Whitesun',
			}),
			makeMarker({
				personId: 'p-beru',
				personName: 'Beru Whitesun',
				placeId: 'pl-tat',
				date: '19 BBY',
				spouseId: 'p-owen',
				spouseName: 'Owen Lars',
			}),
			makeMarker({
				personId: 'p-cliegg',
				personName: 'Cliegg Lars',
				placeId: 'pl-tat',
				date: '32 BBY',
				spouseId: 'p-shmi',
				spouseName: 'Shmi Skywalker',
			}),
			makeMarker({
				personId: 'p-shmi',
				personName: 'Shmi Skywalker',
				placeId: 'pl-tat',
				date: '32 BBY',
				spouseId: 'p-cliegg',
				spouseName: 'Cliegg Lars',
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(2);
		const names = result.map(m => [m.personName, m.participants?.find(p => !p.isPrimary)?.personName]).sort();
		expect(names).toContainEqual(expect.arrayContaining(['Owen Lars']));
		expect(names).toContainEqual(expect.arrayContaining(['Cliegg Lars']));
	});

	it('keeps the same couple separate when dates differ (re-marriage edge case)', () => {
		// Same couple, different dates — treat as different marriage events
		// (e.g., a civil + religious ceremony recorded as separate dates).
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'A',
				placeId: 'pl-1',
				date: '1920-06-15',
				spouseId: 'p-b',
				spouseName: 'B',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'B',
				placeId: 'pl-1',
				date: '1920-06-15',
				spouseId: 'p-a',
				spouseName: 'A',
			}),
			makeMarker({
				personId: 'p-a',
				personName: 'A',
				placeId: 'pl-1',
				date: '1920-06-22',
				spouseId: 'p-b',
				spouseName: 'B',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'B',
				placeId: 'pl-1',
				date: '1920-06-22',
				spouseId: 'p-a',
				spouseName: 'A',
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		// Two pair-symmetric groups, deduped to one each.
		expect(result).toHaveLength(2);
		expect(result.every(m => m.participants?.length === 2)).toBe(true);
	});

	it('keeps the same couple separate when places differ', () => {
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'A',
				placeId: 'pl-courthouse',
				date: '1920-06-15',
				spouseId: 'p-b',
				spouseName: 'B',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'B',
				placeId: 'pl-courthouse',
				date: '1920-06-15',
				spouseId: 'p-a',
				spouseName: 'A',
			}),
			makeMarker({
				personId: 'p-a',
				personName: 'A',
				placeId: 'pl-church',
				date: '1920-06-15',
				spouseId: 'p-b',
				spouseName: 'B',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'B',
				placeId: 'pl-church',
				date: '1920-06-15',
				spouseId: 'p-a',
				spouseName: 'A',
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(2);
		expect(result.every(m => m.participants?.length === 2)).toBe(true);
	});

	it('preserves multi-spouse pairs that share a partner only across some marriages', () => {
		// Cliegg has two marriages: to Aika (deceased) and Shmi. Each pair
		// is its own dedup group.
		const service = makeService();
		const markers = [
			// Cliegg's first marriage (to Aika)
			makeMarker({
				personId: 'p-cliegg',
				personName: 'Cliegg Lars',
				placeId: 'pl-tat',
				date: '47 BBY',
				spouseId: 'p-aika',
				spouseName: 'Aika',
			}),
			makeMarker({
				personId: 'p-aika',
				personName: 'Aika',
				placeId: 'pl-tat',
				date: '47 BBY',
				spouseId: 'p-cliegg',
				spouseName: 'Cliegg Lars',
			}),
			// Cliegg's second marriage (to Shmi)
			makeMarker({
				personId: 'p-cliegg',
				personName: 'Cliegg Lars',
				placeId: 'pl-tat',
				date: '32 BBY',
				spouseId: 'p-shmi',
				spouseName: 'Shmi Skywalker',
			}),
			makeMarker({
				personId: 'p-shmi',
				personName: 'Shmi Skywalker',
				placeId: 'pl-tat',
				date: '32 BBY',
				spouseId: 'p-cliegg',
				spouseName: 'Cliegg Lars',
			}),
		];

		const result = privates(service).dedupeMarriageMarkers(markers);

		expect(result).toHaveLength(2);
		expect(result.every(m => m.participants?.length === 2)).toBe(true);
	});
});
