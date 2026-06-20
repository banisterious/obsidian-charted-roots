import { describe, expect, it } from 'vitest';
import { coordsBelongToCRS } from '../src/maps/types/map-types';

/**
 * #747 — fictional (pixel-mapped) events leaked onto the real-world map at
 * 0,0 because event markers fabricate lat/lng to 0 for pixel-only places, and
 * the geographic map rendered them anyway. coordsBelongToCRS decides whether a
 * marker/place/endpoint belongs to the active coordinate system so each map
 * shows only its own locations.
 */
describe('coordsBelongToCRS (#747)', () => {
	const real = { lat: 48.85, lng: 2.35 };
	const fictionalPixelOnly = { lat: 0, lng: 0, pixelX: 1200, pixelY: 800 };
	const placePixelOnly = { pixelX: 1200, pixelY: 800 }; // place marker: lat/lng undefined
	const dualCoord = { lat: 51.75, lng: -1.25, pixelX: 10, pixelY: 20 };

	describe('geographic (real-world) map', () => {
		it('includes a real-world location', () => {
			expect(coordsBelongToCRS(real, 'geographic')).toBe(true);
		});

		it('excludes a fictional pixel-only event fabricated to 0,0', () => {
			expect(coordsBelongToCRS(fictionalPixelOnly, 'geographic')).toBe(false);
		});

		it('excludes a pixel-only place marker (no real lat/lng)', () => {
			expect(coordsBelongToCRS(placePixelOnly, 'geographic')).toBe(false);
		});

		it('includes a place that has both real and pixel coordinates', () => {
			expect(coordsBelongToCRS(dualCoord, 'geographic')).toBe(true);
		});
	});

	describe('pixel (custom image) map', () => {
		it('includes anything with pixel coordinates', () => {
			expect(coordsBelongToCRS(fictionalPixelOnly, 'pixel')).toBe(true);
			expect(coordsBelongToCRS(placePixelOnly, 'pixel')).toBe(true);
			expect(coordsBelongToCRS(dualCoord, 'pixel')).toBe(true);
		});

		it('excludes a real-world location with no pixel coordinates', () => {
			expect(coordsBelongToCRS(real, 'pixel')).toBe(false);
		});
	});
});
