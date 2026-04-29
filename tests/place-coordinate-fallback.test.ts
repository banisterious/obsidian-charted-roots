import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';

/**
 * #494 — Events at child places (e.g., `Lars Homestead` with
 * `parent_place: [[Tatooine]]` and no own pixel coordinates) didn't render
 * on the map. The fix walks up the parent_place chain when a place has no
 * own coords and inherits the nearest ancestor's positioning, while keeping
 * the child's identity for popup / click-through.
 *
 * Reproduction shape: @DigitalDreamn's "Lars Homestead" with parent Tatooine
 * on a Star Wars custom image map.
 */

interface PlaceCacheEntry {
	crId: string;
	name: string;
	lat?: number;
	lng?: number;
	pixelX?: number;
	pixelY?: number;
	parentPlace?: string;
	parentPlaceId?: string;
	mapId?: string;
	maps?: string[];
	category?: string;
	universe?: string;
}

interface PrivateMembers {
	placeCache: Map<string, PlaceCacheEntry>;
	placeByNameCache: Map<string, PlaceCacheEntry>;
	applyCoordinateFallback: (place: PlaceCacheEntry) => PlaceCacheEntry;
	resolvePlace: (placeId?: string, placeName?: string) => PlaceCacheEntry | null;
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

function seed(service: MapDataService, place: PlaceCacheEntry): void {
	const access = privates(service);
	access.placeCache.set(place.crId, place);
	access.placeByNameCache.set(place.name.toLowerCase(), place);
}

describe('MapDataService.applyCoordinateFallback (#494)', () => {
	it('returns the place unchanged when it already has coordinates', () => {
		const service = makeService();
		const place: PlaceCacheEntry = {
			crId: 'pl-tat',
			name: 'Tatooine',
			pixelX: 100,
			pixelY: 200,
		};
		seed(service, place);

		const result = privates(service).applyCoordinateFallback(place);

		expect(result).toEqual(place);
	});

	it('inherits the parent place coords when the child has none (parent by id)', () => {
		const service = makeService();
		const tatooine: PlaceCacheEntry = {
			crId: 'pl-tat',
			name: 'Tatooine',
			pixelX: 100,
			pixelY: 200,
			mapId: 'galaxy-map',
		};
		const homestead: PlaceCacheEntry = {
			crId: 'pl-lh',
			name: 'Lars Homestead',
			parentPlaceId: 'pl-tat',
		};
		seed(service, tatooine);
		seed(service, homestead);

		const result = privates(service).applyCoordinateFallback(homestead);

		expect(result.crId).toBe('pl-lh');
		expect(result.name).toBe('Lars Homestead');
		expect(result.pixelX).toBe(100);
		expect(result.pixelY).toBe(200);
		expect(result.mapId).toBe('galaxy-map');
	});

	it('falls back to parentPlace name lookup when parentPlaceId is not set', () => {
		const service = makeService();
		const tatooine: PlaceCacheEntry = {
			crId: 'pl-tat',
			name: 'Tatooine',
			pixelX: 100,
			pixelY: 200,
		};
		const homestead: PlaceCacheEntry = {
			crId: 'pl-lh',
			name: 'Lars Homestead',
			parentPlace: 'Tatooine',
			// No parentPlaceId — legacy data
		};
		seed(service, tatooine);
		seed(service, homestead);

		const result = privates(service).applyCoordinateFallback(homestead);

		expect(result.pixelX).toBe(100);
		expect(result.pixelY).toBe(200);
	});

	it('walks up the chain to a grandparent with coords', () => {
		const service = makeService();
		const galaxy: PlaceCacheEntry = {
			crId: 'pl-gal',
			name: 'Outer Rim',
			pixelX: 50,
			pixelY: 50,
		};
		const tatooine: PlaceCacheEntry = {
			crId: 'pl-tat',
			name: 'Tatooine',
			parentPlaceId: 'pl-gal',
		};
		const homestead: PlaceCacheEntry = {
			crId: 'pl-lh',
			name: 'Lars Homestead',
			parentPlaceId: 'pl-tat',
		};
		seed(service, galaxy);
		seed(service, tatooine);
		seed(service, homestead);

		const result = privates(service).applyCoordinateFallback(homestead);

		expect(result.crId).toBe('pl-lh');
		expect(result.pixelX).toBe(50);
		expect(result.pixelY).toBe(50);
	});

	it('returns the original place when no ancestor has coordinates', () => {
		const service = makeService();
		const tatooine: PlaceCacheEntry = {
			crId: 'pl-tat',
			name: 'Tatooine',
		};
		const homestead: PlaceCacheEntry = {
			crId: 'pl-lh',
			name: 'Lars Homestead',
			parentPlaceId: 'pl-tat',
		};
		seed(service, tatooine);
		seed(service, homestead);

		const result = privates(service).applyCoordinateFallback(homestead);

		// Returned as-is — downstream hasValidCoordinates check drops the marker.
		expect(result.pixelX).toBeUndefined();
		expect(result.pixelY).toBeUndefined();
		expect(result.crId).toBe('pl-lh');
	});

	it('preserves child identity (crId, name, category, universe) when inheriting', () => {
		const service = makeService();
		const tatooine: PlaceCacheEntry = {
			crId: 'pl-tat',
			name: 'Tatooine',
			pixelX: 100,
			pixelY: 200,
			category: 'fictional',
			universe: 'Star Wars',
		};
		const homestead: PlaceCacheEntry = {
			crId: 'pl-lh',
			name: 'Lars Homestead',
			parentPlaceId: 'pl-tat',
			category: 'fictional',
			universe: 'Star Wars',
		};
		seed(service, tatooine);
		seed(service, homestead);

		const result = privates(service).applyCoordinateFallback(homestead);

		expect(result.crId).toBe('pl-lh');
		expect(result.name).toBe('Lars Homestead');
		expect(result.category).toBe('fictional');
		expect(result.universe).toBe('Star Wars');
	});

	it('breaks out cleanly if the parent chain forms a cycle', () => {
		const service = makeService();
		const a: PlaceCacheEntry = { crId: 'pl-a', name: 'A', parentPlaceId: 'pl-b' };
		const b: PlaceCacheEntry = { crId: 'pl-b', name: 'B', parentPlaceId: 'pl-a' };
		seed(service, a);
		seed(service, b);

		const result = privates(service).applyCoordinateFallback(a);

		// No coords found anywhere; should return original without infinite-looping.
		expect(result.crId).toBe('pl-a');
		expect(result.pixelX).toBeUndefined();
	});
});
