import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import type { JourneyPath, MapFilters } from '../src/maps/types/map-types';

/**
 * #504 — Journey-mode marriage popups previously showed only the focal
 * person's age at marriage. The popup helper-rendering can compute the
 * partner's age too, but the partner's birth date wasn't on the waypoint.
 *
 * `buildJourneyPaths` now resolves the spouse via `marriage.spouseId` from
 * the same `people` array it iterates, and threads `spouseBirthDate` onto
 * marriage waypoints so the popup can pair the two ages.
 *
 * Suggested by @DigitalDreamn during #501 verification.
 */

interface PrivateMembers {
	buildJourneyPaths: (people: unknown[], filters: MapFilters) => JourneyPath[];
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

describe('MapDataService.buildJourneyPaths — partner birth date threading (#504)', () => {
	it("threads the spouse's born value onto a marriage waypoint when both spouses are in the dataset", () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-mos-eisley', name: 'Mos Eisley', lat: 1, lng: 1 });
		seedPlace(service, { crId: 'pl-tatooine', name: 'Tatooine', lat: 2, lng: 2 });

		const owen = {
			crId: 'p-owen',
			name: 'Owen Lars',
			born: '32 BBY',
			birthPlace: 'Mos Eisley',
			birthPlaceId: 'pl-mos-eisley',
			marriages: [
				{ place: 'Tatooine', placeId: 'pl-tatooine', date: '19 BBY', spouseId: 'p-beru', spouseName: 'Beru Whitesun' },
			],
		};
		const beru = {
			crId: 'p-beru',
			name: 'Beru Whitesun',
			born: '37 BBY',
		};

		const paths = privates(service).buildJourneyPaths([owen, beru], filters);

		const owenPath = paths.find(p => p.personId === 'p-owen');
		expect(owenPath).toBeDefined();

		const marriageWp = owenPath?.waypoints.find(w => w.eventType === 'marriage');
		expect(marriageWp).toBeDefined();
		expect(marriageWp?.spouseName).toBe('Beru Whitesun');
		expect(marriageWp?.spouseBirthDate).toBe('37 BBY');
	});

	it('omits spouseBirthDate when the spouse cannot be resolved (legacy flat marriage data without spouseId)', () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-naboo', name: 'Naboo', lat: 1, lng: 1 });
		seedPlace(service, { crId: 'pl-coruscant', name: 'Coruscant', lat: 2, lng: 2 });

		const person = {
			crId: 'p-padme',
			name: 'Padmé Amidala',
			born: '46 BBY',
			birthPlace: 'Naboo',
			birthPlaceId: 'pl-naboo',
			marriages: [
				// No spouseId — legacy flat shape with just a name
				{ place: 'Coruscant', placeId: 'pl-coruscant', date: '22 BBY', spouseName: 'Anakin Skywalker' },
			],
		};

		const paths = privates(service).buildJourneyPaths([person], filters);
		const marriageWp = paths[0]?.waypoints.find(w => w.eventType === 'marriage');

		expect(marriageWp?.spouseName).toBe('Anakin Skywalker');
		expect(marriageWp?.spouseBirthDate).toBeUndefined();
	});

	it('omits spouseBirthDate when the spouse is in the dataset but has no born value', () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-paris', name: 'Paris', lat: 1, lng: 1 });
		seedPlace(service, { crId: 'pl-naboo', name: 'Naboo', lat: 2, lng: 2 });

		const person = {
			crId: 'p-jane',
			name: 'Jane',
			born: '50 BBY',
			birthPlace: 'Paris',
			birthPlaceId: 'pl-paris',
			marriages: [
				{ place: 'Naboo', placeId: 'pl-naboo', date: '25 BBY', spouseId: 'p-john', spouseName: 'John' },
			],
		};
		const spouseWithoutBorn = {
			crId: 'p-john',
			name: 'John',
			// born is intentionally undefined
		};

		const paths = privates(service).buildJourneyPaths([person, spouseWithoutBorn], filters);
		const marriageWp = paths[0]?.waypoints.find(w => w.eventType === 'marriage');

		expect(marriageWp?.spouseName).toBe('John');
		expect(marriageWp?.spouseBirthDate).toBeUndefined();
	});

	it("preserves the spouse's birth date as a string even when the source value is a numeric year", () => {
		// Year-only frontmatter (common for real-world genealogy) is loaded as
		// a number. The popup's age math expects a string, so the threading
		// must coerce.
		const service = makeService();
		seedPlace(service, { crId: 'pl-york', name: 'York', lat: 1, lng: 1 });
		seedPlace(service, { crId: 'pl-london', name: 'London', lat: 2, lng: 2 });

		const husband = {
			crId: 'p-1',
			name: 'Husband',
			born: 1850,
			birthPlace: 'York',
			birthPlaceId: 'pl-york',
			marriages: [
				{ place: 'London', placeId: 'pl-london', date: 1875, spouseId: 'p-2', spouseName: 'Wife' },
			],
		};
		const wife = {
			crId: 'p-2',
			name: 'Wife',
			born: 1855,
		};

		const paths = privates(service).buildJourneyPaths([husband, wife], filters);
		const marriageWp = paths[0]?.waypoints.find(w => w.eventType === 'marriage');

		expect(marriageWp?.spouseBirthDate).toBe('1855');
	});

	it('does not bleed spouseBirthDate onto non-marriage waypoints', () => {
		const service = makeService();
		seedPlace(service, { crId: 'pl-tatooine', name: 'Tatooine', lat: 0, lng: 0 });

		const owen = {
			crId: 'p-owen',
			name: 'Owen Lars',
			born: '32 BBY',
			birthPlace: 'Tatooine',
			birthPlaceId: 'pl-tatooine',
			marriages: [
				{ place: 'Tatooine', placeId: 'pl-tatooine', date: '19 BBY', spouseId: 'p-beru', spouseName: 'Beru Whitesun' },
			],
		};
		const beru = { crId: 'p-beru', name: 'Beru Whitesun', born: '37 BBY' };

		const paths = privates(service).buildJourneyPaths([owen, beru], filters);
		const owenPath = paths.find(p => p.personId === 'p-owen');

		const birthWp = owenPath?.waypoints.find(w => w.eventType === 'birth');
		expect(birthWp).toBeDefined();
		expect(birthWp?.spouseBirthDate).toBeUndefined();
		expect(birthWp?.spouseName).toBeUndefined();
	});
});
