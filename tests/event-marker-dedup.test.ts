import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import type { MapMarker } from '../src/maps/types/map-types';

/**
 * #493 — Events with multiple participants produced one marker per participant
 * because `buildMarkers` iterates per-person and the same `cr_type: event` note
 * referenced by N people contributed N markers to the same place. Dedup by
 * `eventCrId` after collection so the place renders one combined marker with a
 * participants list. Inline events have no `eventCrId` and never dedup.
 *
 * Reported by @DigitalDreamn during #487 testing.
 */

interface PrivateMembers {
	dedupeEventMarkers: (markers: MapMarker[]) => MapMarker[];
}

interface MockEventService {
	getEventById: (crId: string) => { person?: string } | undefined;
}

function makeService(eventService?: MockEventService): MapDataService {
	const plugin = {
		settings: {
			propertyAliases: {},
			valueAliases: {},
		},
		getEventService: () => eventService,
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
		type: 'custom',
		lat: 0,
		lng: 0,
		placeName: 'Default Place',
		...overrides,
	};
}

describe('MapDataService.dedupeEventMarkers (#493)', () => {
	it('passes through inline-event markers unchanged (no eventCrId)', () => {
		const service = makeService();
		const markers = [
			makeMarker({ personId: 'p-a', personName: 'Alice', placeName: 'Boston' }),
			makeMarker({ personId: 'p-b', personName: 'Bob', placeName: 'Boston' }),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result).toHaveLength(2);
		expect(result.every(m => m.participants === undefined)).toBe(true);
	});

	it('passes through a single-participant event marker unchanged', () => {
		const service = makeService();
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result).toHaveLength(1);
		expect(result[0].participants).toBeUndefined();
		expect(result[0].personName).toBe('Alice');
	});

	it('collapses two markers sharing eventCrId into one with both participants', () => {
		const service = makeService({
			getEventById: () => ({ person: '[[Alice]]' }),
		});
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'Bob',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result).toHaveLength(1);
		expect(result[0].participants).toBeDefined();
		expect(result[0].participants).toHaveLength(2);
		expect(result[0].participants?.map(p => p.personName).sort()).toEqual(['Alice', 'Bob']);
	});

	it('selects the event note primary as the kept marker (personName / personId)', () => {
		const service = makeService({
			getEventById: () => ({ person: '[[Bob]]' }),
		});
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'Bob',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result[0].personName).toBe('Bob');
		expect(result[0].personId).toBe('p-b');
		expect(result[0].participants?.find(p => p.personName === 'Bob')?.isPrimary).toBe(true);
		expect(result[0].participants?.find(p => p.personName === 'Alice')?.isPrimary).toBe(false);
	});

	it('falls back to the first marker when the event note has no primary', () => {
		const service = makeService({
			getEventById: () => ({}),
		});
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'Bob',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result[0].personName).toBe('Alice');
		expect(result[0].participants?.every(p => !p.isPrimary)).toBe(true);
	});

	it('falls back to the first marker when the EventService is unavailable', () => {
		const service = makeService(undefined);
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'Bob',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result).toHaveLength(1);
		expect(result[0].personName).toBe('Alice');
		expect(result[0].participants).toHaveLength(2);
	});

	it('keeps event groups separate by eventCrId', () => {
		const service = makeService({
			getEventById: () => ({}),
		});
		const markers = [
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'Bob',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-c',
				personName: 'Carol',
				placeName: 'Philadelphia',
				eventCrId: 'evt-002',
			}),
			makeMarker({
				personId: 'p-d',
				personName: 'Dan',
				placeName: 'Philadelphia',
				eventCrId: 'evt-002',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result).toHaveLength(2);
		const boston = result.find(m => m.placeName === 'Boston');
		const phil = result.find(m => m.placeName === 'Philadelphia');
		expect(boston?.participants).toHaveLength(2);
		expect(phil?.participants).toHaveLength(2);
	});

	it('preserves inline-event markers alongside deduped event markers', () => {
		const service = makeService({
			getEventById: () => ({ person: '[[Alice]]' }),
		});
		const markers = [
			// External event with two participants
			makeMarker({
				personId: 'p-a',
				personName: 'Alice',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			makeMarker({
				personId: 'p-b',
				personName: 'Bob',
				placeName: 'Boston',
				eventCrId: 'evt-001',
			}),
			// Inline event on a third person — passes through
			makeMarker({
				personId: 'p-c',
				personName: 'Carol',
				placeName: 'Philadelphia',
			}),
		];

		const result = privates(service).dedupeEventMarkers(markers);

		expect(result).toHaveLength(2);
		const carol = result.find(m => m.personName === 'Carol');
		expect(carol?.participants).toBeUndefined();
	});
});
