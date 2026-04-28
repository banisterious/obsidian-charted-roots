import { describe, expect, it } from 'vitest';
import { journeyWaypointDedupKey } from '../src/maps/types/map-types';

/**
 * #448 — Journey paths fail to build for pixel-coord places because the
 * dedup compared `lat` / `lng` only. Custom-image-map waypoints default
 * those to `0`, so every pixel-coord place across an entire journey
 * collapsed to a single waypoint and the `>= 2 unique waypoints` gate
 * never tripped.
 *
 * `journeyWaypointDedupKey` is the coord-system-aware key used by
 * `buildJourneyPaths`. This suite fences the key contract:
 *   1. `placeId` is the strongest signal; same-id should always dedup.
 *   2. Without `placeId`, the composite key folds in BOTH coord systems
 *      so pixel-coord places aren't collapsed by their lat/lng=0 default.
 *
 * Reproduction comes from @DigitalDreamn's Star Wars universe testing
 * (Tatooine / Ator / Alderaan / Naboo all using `custom_coordinates_*`).
 */

describe('journeyWaypointDedupKey (#448)', () => {
	describe('placeId path (preferred)', () => {
		it('returns the same key for two waypoints with identical placeId', () => {
			const a = { placeId: 'place-tatooine', lat: 0, lng: 0 };
			const b = { placeId: 'place-tatooine', lat: 0, lng: 0 };
			expect(journeyWaypointDedupKey(a)).toBe(journeyWaypointDedupKey(b));
		});

		it('returns different keys for different placeIds even when coords match', () => {
			// Two pixel-coord places that happened to share lat=0,lng=0 defaults
			// must not collide if their place identities differ.
			const tatooine = { placeId: 'place-tatooine', lat: 0, lng: 0, pixelX: 100, pixelY: 200 };
			const ator = { placeId: 'place-ator', lat: 0, lng: 0, pixelX: 300, pixelY: 400 };
			expect(journeyWaypointDedupKey(tatooine)).not.toBe(journeyWaypointDedupKey(ator));
		});

		it('uses placeId even when only one waypoint has it (asymmetric, but still distinct)', () => {
			const withId = { placeId: 'place-x', lat: 1, lng: 2 };
			const withoutId = { lat: 1, lng: 2 };
			expect(journeyWaypointDedupKey(withId)).not.toBe(journeyWaypointDedupKey(withoutId));
		});
	});

	describe('coord composite path (fallback when placeId missing)', () => {
		it('distinguishes pixel-coord places that share lat/lng default of 0', () => {
			// The exact bug shape: two custom-image-map places with lat=0/lng=0
			// defaults but distinct pixel coords must produce distinct keys.
			const alderaan = { lat: 0, lng: 0, pixelX: 2117, pixelY: 1924 };
			const naboo = { lat: 0, lng: 0, pixelX: 1500, pixelY: 800 };
			expect(journeyWaypointDedupKey(alderaan)).not.toBe(journeyWaypointDedupKey(naboo));
		});

		it('treats truly-identical pixel-coord waypoints as duplicates', () => {
			const a = { lat: 0, lng: 0, pixelX: 100, pixelY: 200 };
			const b = { lat: 0, lng: 0, pixelX: 100, pixelY: 200 };
			expect(journeyWaypointDedupKey(a)).toBe(journeyWaypointDedupKey(b));
		});

		it('treats truly-identical geographic waypoints as duplicates', () => {
			const a = { lat: 42.36, lng: -71.06 };
			const b = { lat: 42.36, lng: -71.06 };
			expect(journeyWaypointDedupKey(a)).toBe(journeyWaypointDedupKey(b));
		});

		it('distinguishes geographic waypoints with different lat/lng', () => {
			const boston = { lat: 42.36, lng: -71.06 };
			const philly = { lat: 39.95, lng: -75.17 };
			expect(journeyWaypointDedupKey(boston)).not.toBe(journeyWaypointDedupKey(philly));
		});

		it('distinguishes a pixel-coord waypoint from a same-zero-lat-lng geographic one', () => {
			// Two waypoints both at lat=0,lng=0, one with pixel coords, one
			// without. They represent different places and shouldn't collide.
			const pixel = { lat: 0, lng: 0, pixelX: 100, pixelY: 200 };
			const geographic = { lat: 0, lng: 0 }; // a real-world (0, 0) coord
			expect(journeyWaypointDedupKey(pixel)).not.toBe(journeyWaypointDedupKey(geographic));
		});
	});

	describe('event-type differentiation (#487)', () => {
		it('keeps death and custom event distinct when they share a place', () => {
			// #487 — When a custom event without a date sat at the same place
			// as the death (sorted to the end of life events, immediately before
			// death which always sorts last), the place-only dedup collapsed
			// them onto a single waypoint, silently dropping the death popup.
			const customEventAtTatooine = { placeId: 'place-tatooine', eventType: 'custom' };
			const deathAtTatooine = { placeId: 'place-tatooine', eventType: 'death' };
			expect(journeyWaypointDedupKey(customEventAtTatooine))
				.not.toBe(journeyWaypointDedupKey(deathAtTatooine));
		});

		it('still collapses two same-type events at the same place (preserves #448 intent)', () => {
			// Three residences at the same address should still produce one
			// waypoint, not three. The dedup is intended to suppress trivial
			// repetition; only cross-event-type collisions need to be split.
			const residenceA = { placeId: 'place-smith-st', eventType: 'residence' };
			const residenceB = { placeId: 'place-smith-st', eventType: 'residence' };
			expect(journeyWaypointDedupKey(residenceA))
				.toBe(journeyWaypointDedupKey(residenceB));
		});

		it('treats undefined eventType consistently across both sides', () => {
			// Older callers may pass waypoints without eventType; the function
			// must remain self-consistent for those cases.
			const a = { placeId: 'place-x' };
			const b = { placeId: 'place-x' };
			expect(journeyWaypointDedupKey(a)).toBe(journeyWaypointDedupKey(b));
		});

		it('distinguishes an undated custom event from a death at the same coord-fallback place', () => {
			// Same scenario as the Cliegg case but on a coord-fallback path
			// (no placeId). Both keys share the coord composite; only event
			// type differentiates them.
			const customAtCoord = { lat: 0, lng: 0, pixelX: 1700, pixelY: 1500, eventType: 'custom' };
			const deathAtCoord = { lat: 0, lng: 0, pixelX: 1700, pixelY: 1500, eventType: 'death' };
			expect(journeyWaypointDedupKey(customAtCoord))
				.not.toBe(journeyWaypointDedupKey(deathAtCoord));
		});
	});

	describe('regression: prevents the original lat/lng-only collapse', () => {
		it('Cliegg Lars\'s 5-place pixel-coord journey produces 5 distinct keys', () => {
			// The actual reproduction shape from #434 / #448. All five places
			// have lat=0/lng=0 from the pixel-coord defaults; the dedup must
			// see them as five distinct waypoints, not one collapsed entry.
			const journey = [
				{ placeId: 'place-tatooine', lat: 0, lng: 0, pixelX: 1700, pixelY: 1500 },
				{ placeId: 'place-ator', lat: 0, lng: 0, pixelX: 2000, pixelY: 1600 },
				{ placeId: 'place-alderaan', lat: 0, lng: 0, pixelX: 2117, pixelY: 1924 },
				{ placeId: 'place-naboo', lat: 0, lng: 0, pixelX: 1500, pixelY: 1800 },
				{ placeId: 'place-tatooine', lat: 0, lng: 0, pixelX: 1700, pixelY: 1500 } // returned home
			];
			const keys = journey.map(journeyWaypointDedupKey);
			const uniqueKeys = new Set(keys);
			// Tatooine appears twice (start + end), so 4 unique keys total
			expect(uniqueKeys.size).toBe(4);
			// First and last are the same (returned home)
			expect(keys[0]).toBe(keys[4]);
			// Each other pair is distinct
			expect(keys[1]).not.toBe(keys[2]);
			expect(keys[2]).not.toBe(keys[3]);
		});
	});
});
