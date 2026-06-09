import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import type { MapFilters, MapMarker } from '../src/maps/types/map-types';

/**
 * #508 — Static map marker popup pairs the partner's age alongside the
 * focal person's, paralleling the journey-mode partner-age treatment from
 * #504. `buildMarkers` now resolves the spouse via `marriage.spouseId`
 * from the same `people` array it iterates and threads `spouseBirthDate`
 * onto marriage markers so the popup renderer can compute the partner's
 * age from the same DateService path the focal age already uses.
 *
 * Suggested by @DigitalDreamn during #504 verification — she'd originally
 * meant the static popup when filing #501.
 */

interface PrivateMembers {
	buildMarkers: (people: unknown[], filters: MapFilters) => MapMarker[];
	placeCache: Map<string, unknown>;
	placeByNameCache: Map<string, unknown>;
}

function makeService(): MapDataService {
	const plugin = {
		settings: {
			propertyAliases: {},
			valueAliases: {},
			peopleFolder: '',
			placesFolder: '',
		},
		getEventService: () => null,
	} as never;
	return new MapDataService(plugin);
}

function privates(service: MapDataService): PrivateMembers {
	return service as unknown as PrivateMembers;
}

function seedPlace(service: MapDataService, place: { crId: string; name: string; lat: number; lng: number }): void {
	const data = { ...place, category: 'real' };
	privates(service).placeCache.set(place.crId, data);
	privates(service).placeByNameCache.set(place.name.toLowerCase(), data);
}

const filters: MapFilters = {
	collection: undefined,
	universe: undefined,
};

describe('MapDataService.buildMarkers — partner birth date threading (#508)', () => {
	it("threads the spouse's born value onto a marriage marker when both spouses are in the dataset", () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-tatooine', name: 'Tatooine', lat: 0, lng: 0 });

		const owen = {
			crId: 'p-owen',
			name: 'Owen Lars',
			born: '32 BBY',
			marriages: [
				{ place: 'Tatooine', placeId: 'pl-tatooine', date: '19 BBY', spouseId: 'p-beru', spouseName: 'Beru Whitesun' },
			],
		};
		const beru = {
			crId: 'p-beru',
			name: 'Beru Whitesun',
			born: '37 BBY',
		};

		const markers = privates(service).buildMarkers([owen, beru], filters);
		const marriageMarker = markers.find(m => m.type === 'marriage');

		expect(marriageMarker).toBeDefined();
		expect(marriageMarker?.spouseName).toBe('Beru Whitesun');
		expect(marriageMarker?.spouseBirthDate).toBe('37 BBY');
	});

	it('omits spouseBirthDate when the spouse cannot be resolved (legacy flat marriage data without spouseId)', () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-coruscant', name: 'Coruscant', lat: 0, lng: 0 });

		const person = {
			crId: 'p-padme',
			name: 'Padmé Amidala',
			born: '46 BBY',
			marriages: [
				// No spouseId — legacy flat shape with just a name
				{ place: 'Coruscant', placeId: 'pl-coruscant', date: '22 BBY', spouseName: 'Anakin Skywalker' },
			],
		};

		const markers = privates(service).buildMarkers([person], filters);
		const marriageMarker = markers.find(m => m.type === 'marriage');

		expect(marriageMarker?.spouseName).toBe('Anakin Skywalker');
		expect(marriageMarker?.spouseBirthDate).toBeUndefined();
	});

	it('omits spouseBirthDate when the spouse is in the dataset but has no born value', () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-naboo', name: 'Naboo', lat: 0, lng: 0 });

		const person = {
			crId: 'p-jane',
			name: 'Jane',
			born: '50 BBY',
			marriages: [
				{ place: 'Naboo', placeId: 'pl-naboo', date: '25 BBY', spouseId: 'p-john', spouseName: 'John' },
			],
		};
		const spouseWithoutBorn = {
			crId: 'p-john',
			name: 'John',
			// born intentionally undefined
		};

		const markers = privates(service).buildMarkers([person, spouseWithoutBorn], filters);
		const marriageMarker = markers.find(m => m.type === 'marriage');

		expect(marriageMarker?.spouseName).toBe('John');
		expect(marriageMarker?.spouseBirthDate).toBeUndefined();
	});

	it("preserves the spouse's birth date as a string when the source value is a numeric year", () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-london', name: 'London', lat: 0, lng: 0 });

		const husband = {
			crId: 'p-1',
			name: 'Husband',
			born: 1850,
			marriages: [
				{ place: 'London', placeId: 'pl-london', date: 1875, spouseId: 'p-2', spouseName: 'Wife' },
			],
		};
		const wife = {
			crId: 'p-2',
			name: 'Wife',
			born: 1855,
		};

		const markers = privates(service).buildMarkers([husband, wife], filters);
		const marriageMarker = markers.find(m => m.type === 'marriage');

		expect(marriageMarker?.spouseBirthDate).toBe('1855');
	});

	it('does not bleed spouseBirthDate onto non-marriage markers', () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-tatooine', name: 'Tatooine', lat: 0, lng: 0 });

		const person = {
			crId: 'p-owen',
			name: 'Owen Lars',
			born: '32 BBY',
			birthPlace: 'Tatooine',
			birthPlaceId: 'pl-tatooine',
			deathPlace: 'Tatooine',
			deathPlaceId: 'pl-tatooine',
			died: '4 ABY',
			marriages: [
				{ place: 'Tatooine', placeId: 'pl-tatooine', date: '19 BBY', spouseId: 'p-beru', spouseName: 'Beru Whitesun' },
			],
		};
		const beru = { crId: 'p-beru', name: 'Beru Whitesun', born: '37 BBY' };

		const markers = privates(service).buildMarkers([person, beru], filters);

		const birthMarker = markers.find(m => m.type === 'birth');
		const deathMarker = markers.find(m => m.type === 'death');
		expect(birthMarker?.spouseBirthDate).toBeUndefined();
		expect(birthMarker?.spouseName).toBeUndefined();
		expect(deathMarker?.spouseBirthDate).toBeUndefined();
	});
});
