import { describe, expect, it, beforeEach } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import { formatPopupDateRange } from '../src/maps/types/map-types';
import type { LifeEvent, MapFilters, MapMarker } from '../src/maps/types/map-types';

/**
 * #444 — map marker popups don't show age for non-birth events and only render
 * the start date for duration events. This suite fences the data + formatting
 * pieces of the fix:
 *   - `formatPopupDateRange` renders duration ranges as `from – to`
 *   - `MapMarker.birthDate` flows from `PersonData.born` through both marker
 *     construction paths (place-based and event-based) so the rendering side
 *     can call `DateService.calculateAge` with a real birth date.
 *
 * Sibling to #434 (journey-mode rich popup) and the broader DateService-bypass
 * cluster (#433 / #437 / #439).
 */

interface PrivatePlaceData {
	crId: string;
	name: string;
	lat?: number;
	lng?: number;
	universe?: string;
	category?: string;
}

interface PrivatePerson {
	crId: string;
	name: string;
	born?: string | number;
	died?: string | number;
	birthPlace?: string;
	birthPlaceId?: string;
	collection?: string;
	altName?: string;
	events?: LifeEvent[];
}

interface PrivateMembers {
	placeCache: Map<string, PrivatePlaceData>;
	placeByNameCache: Map<string, PrivatePlaceData>;
	createMarkerFromPlace: (
		person: PrivatePerson,
		type: 'birth' | 'death' | 'marriage' | 'burial',
		placeId: string | undefined,
		placeName: string | undefined,
		date: string | number | undefined,
		filters: MapFilters
	) => MapMarker | null;
	createMarkerFromEvent: (
		person: PrivatePerson,
		event: LifeEvent,
		filters: MapFilters
	) => MapMarker | null;
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

function seedPlace(service: MapDataService, place: PrivatePlaceData): void {
	privates(service).placeCache.set(place.crId, place);
	privates(service).placeByNameCache.set(place.name.toLowerCase(), place);
}

const NO_FILTERS: MapFilters = {};

describe('formatPopupDateRange (#444)', () => {
	it('returns undefined when no dates are set', () => {
		expect(formatPopupDateRange(undefined, undefined)).toBeUndefined();
	});

	it('returns the start date alone for single-date events', () => {
		expect(formatPopupDateRange('1820-04-05', undefined)).toBe('1820-04-05');
	});

	it('renders a range when both start and end are set', () => {
		expect(formatPopupDateRange('1920', '1925')).toBe('1920 – 1925');
	});

	it('collapses identical start/end into a single date', () => {
		// A duration event with date_from === date_to is effectively a point event;
		// avoid the visually noisy `1925 – 1925` rendering.
		expect(formatPopupDateRange('1925', '1925')).toBe('1925');
	});

	it('falls back to the end date when only it is set', () => {
		expect(formatPopupDateRange(undefined, '1925')).toBe('1925');
	});

	it('handles fictional-era strings the same as real-world dates', () => {
		expect(formatPopupDateRange('64 BBY', '60 BBY')).toBe('64 BBY – 60 BBY');
	});
});

describe('MapMarker.birthDate population (#444)', () => {
	let service: MapDataService;

	beforeEach(() => {
		service = makeService();
		seedPlace(service, { crId: 'place-boston', name: 'Boston', lat: 42, lng: -71 });
		seedPlace(service, { crId: 'place-tatooine', name: 'Tatooine', lat: 0, lng: 0, universe: 'star-wars' });
	});

	describe('createMarkerFromPlace', () => {
		it('populates birthDate from a string-form person.born', () => {
			const person: PrivatePerson = {
				crId: 'p-1',
				name: 'Alice',
				born: '1820-04-05',
				birthPlaceId: 'place-boston',
			};

			const marker = privates(service).createMarkerFromPlace(
				person, 'death', 'place-boston', 'Boston', '1875-09-22', NO_FILTERS
			);

			expect(marker?.birthDate).toBe('1820-04-05');
		});

		it('coerces a numeric year-only person.born into a string', () => {
			const person: PrivatePerson = {
				crId: 'p-2',
				name: 'Bob',
				born: 1820,
				birthPlaceId: 'place-boston',
			};

			const marker = privates(service).createMarkerFromPlace(
				person, 'death', 'place-boston', 'Boston', 1875, NO_FILTERS
			);

			expect(marker?.birthDate).toBe('1820');
		});

		it('leaves birthDate undefined when person.born is missing', () => {
			const person: PrivatePerson = {
				crId: 'p-3',
				name: 'Carol',
				birthPlaceId: 'place-boston',
			};

			const marker = privates(service).createMarkerFromPlace(
				person, 'death', 'place-boston', 'Boston', '1875-09-22', NO_FILTERS
			);

			expect(marker?.birthDate).toBeUndefined();
		});

		it('preserves descending-era birth dates (BBY) verbatim for fictional persons', () => {
			const person: PrivatePerson = {
				crId: 'p-shmi',
				name: 'Shmi Skywalker Lars',
				born: '72 BBY',
				birthPlaceId: 'place-tatooine',
			};

			const marker = privates(service).createMarkerFromPlace(
				person, 'death', 'place-tatooine', 'Tatooine', '22 BBY', NO_FILTERS
			);

			expect(marker?.birthDate).toBe('72 BBY');
		});
	});

	describe('createMarkerFromEvent', () => {
		it('populates birthDate from person.born on event-derived markers', () => {
			const person: PrivatePerson = {
				crId: 'p-cliegg',
				name: 'Cliegg Lars',
				born: '82 BBY',
			};
			const event: LifeEvent = {
				event_type: 'residence',
				place: '[[Tatooine]]',
				date_from: '64 BBY',
				date_to: '22 BBY',
			};

			const marker = privates(service).createMarkerFromEvent(person, event, NO_FILTERS);

			expect(marker?.birthDate).toBe('82 BBY');
			expect(marker?.date).toBe('64 BBY');
			expect(marker?.dateTo).toBe('22 BBY');
		});

		it('leaves birthDate undefined on event markers when person.born is missing', () => {
			const person: PrivatePerson = {
				crId: 'p-no-birth',
				name: 'Unknown',
			};
			const event: LifeEvent = {
				event_type: 'residence',
				place: '[[Boston]]',
				date_from: '1920',
			};

			const marker = privates(service).createMarkerFromEvent(person, event, NO_FILTERS);

			expect(marker?.birthDate).toBeUndefined();
		});
	});
});
