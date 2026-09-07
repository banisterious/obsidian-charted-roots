import { describe, expect, it } from 'vitest';
import { getCartoTileUrl } from '../src/maps/carto-basemap';

describe('CARTO basemap authentication', () => {
	it('preserves the existing URL for old settings and cleared keys', () => {
		for (const key of [undefined, '', '   ']) {
			expect(getCartoTileUrl(key)).toBe('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
		}
	});

	it('trims pasted keys and preserves all Leaflet placeholders', () => {
		expect(getCartoTileUrl('  test-key  ')).toBe('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=test-key');
	});

	it('keeps query separators and fragments inside the key value', () => {
		const url = getCartoTileUrl('test&extra=1#fragment+/?');
		expect(url).toContain('?key=test%26extra%3D1%23fragment%2B%2F%3F');
		expect(url).not.toContain('&extra=');
	});
});
