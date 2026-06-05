import { describe, expect, it } from 'vitest';
import { parseMediaCropFields, applyMediaCropFields, type MediaCrop } from '../src/core/media-service';

/**
 * #683 — media_crop migrated from a nested array of objects
 * (`media_crop: [{ image, x, y, w, h }]`) to flat parallel arrays keyed by
 * `media_crop_image` (the sources/sources_id convention). The nested form
 * tripped the Data Quality "nested property" warning; the flat form is arrays
 * of primitives, so it doesn't. These fence the reader (both forms), the
 * serializer, and the round-trip the writer and Flatten tool both rely on.
 */

describe('parseMediaCropFields — flat form (#683)', () => {
	it('reads the flat parallel arrays keyed by media_crop_image', () => {
		const fm = {
			media_crop_image: ['portrait.jpg', 'group.jpg'],
			media_crop_x: [40, 10],
			media_crop_y: [60, 20],
			media_crop_w: [200, 300],
			media_crop_h: [200, 150],
		};
		const crops = parseMediaCropFields(fm);
		expect(crops.get('portrait.jpg')).toEqual({ x: 40, y: 60, w: 200, h: 200, percent: false });
		expect(crops.get('group.jpg')).toEqual({ x: 10, y: 20, w: 300, h: 150, percent: false });
	});

	it('carries the per-entry percent flag when present', () => {
		const fm = {
			media_crop_image: ['a.jpg', 'b.jpg'],
			media_crop_x: [0, 5], media_crop_y: [0, 5], media_crop_w: [50, 60], media_crop_h: [50, 60],
			media_crop_percent: [true, false],
		};
		const crops = parseMediaCropFields(fm);
		expect(crops.get('a.jpg')?.percent).toBe(true);
		expect(crops.get('b.jpg')?.percent).toBe(false);
	});

	it('skips an entry with a non-numeric coordinate', () => {
		const fm = {
			media_crop_image: ['good.jpg', 'bad.jpg'],
			media_crop_x: [10, 20], media_crop_y: [10, 20], media_crop_w: [30, null], media_crop_h: [30, 40],
		};
		const crops = parseMediaCropFields(fm);
		expect(crops.has('good.jpg')).toBe(true);
		expect(crops.has('bad.jpg')).toBe(false);
	});

	it('returns an empty map when no crop fields exist', () => {
		expect(parseMediaCropFields({}).size).toBe(0);
	});
});

describe('parseMediaCropFields — legacy nested fallback (#683)', () => {
	it('reads the legacy media_crop array when no flat fields are present', () => {
		const fm = {
			media_crop: [
				{ image: 'portrait.jpg', x: 40, y: 60, w: 200, h: 200 },
				{ image: 'pct.jpg', x: 1, y: 2, w: 3, h: 4, percent: true },
			],
		};
		const crops = parseMediaCropFields(fm);
		expect(crops.get('portrait.jpg')).toEqual({ x: 40, y: 60, w: 200, h: 200, percent: false });
		expect(crops.get('pct.jpg')?.percent).toBe(true);
	});

	it('prefers the flat form when both are present', () => {
		const fm = {
			media_crop_image: ['flat.jpg'],
			media_crop_x: [1], media_crop_y: [1], media_crop_w: [1], media_crop_h: [1],
			media_crop: [{ image: 'legacy.jpg', x: 9, y: 9, w: 9, h: 9 }],
		};
		const crops = parseMediaCropFields(fm);
		expect(crops.has('flat.jpg')).toBe(true);
		expect(crops.has('legacy.jpg')).toBe(false);
	});
});

describe('applyMediaCropFields — serialize (#683)', () => {
	function cropMap(entries: Array<[string, MediaCrop]>): Map<string, MediaCrop> {
		return new Map(entries);
	}

	it('writes the flat arrays and omits percent when all pixel-based', () => {
		const fm: Record<string, unknown> = {};
		applyMediaCropFields(fm, cropMap([
			['portrait.jpg', { x: 40, y: 60, w: 200, h: 200 }],
			['group.jpg', { x: 10, y: 20, w: 300, h: 150 }],
		]));
		expect(fm.media_crop_image).toEqual(['portrait.jpg', 'group.jpg']);
		expect(fm.media_crop_x).toEqual([40, 10]);
		expect(fm.media_crop_y).toEqual([60, 20]);
		expect(fm.media_crop_w).toEqual([200, 300]);
		expect(fm.media_crop_h).toEqual([200, 150]);
		expect('media_crop_percent' in fm).toBe(false);
	});

	it('emits media_crop_percent only when a crop uses it', () => {
		const fm: Record<string, unknown> = {};
		applyMediaCropFields(fm, cropMap([['a.jpg', { x: 0, y: 0, w: 1, h: 1, percent: true }]]));
		expect(fm.media_crop_percent).toEqual([true]);
	});

	it('clears the legacy key and stale flat keys, and removes everything when empty', () => {
		const fm: Record<string, unknown> = {
			media_crop: [{ image: 'old.jpg', x: 1, y: 1, w: 1, h: 1 }],
			media_crop_image: ['stale.jpg'], media_crop_x: [9], media_crop_y: [9], media_crop_w: [9], media_crop_h: [9],
		};
		applyMediaCropFields(fm, new Map());
		expect('media_crop' in fm).toBe(false);
		expect('media_crop_image' in fm).toBe(false);
		expect('media_crop_x' in fm).toBe(false);
	});

	it('round-trips through parse', () => {
		const fm: Record<string, unknown> = {};
		const original = cropMap([
			['portrait.jpg', { x: 40, y: 60, w: 200, h: 200, percent: false }],
			['pct.jpg', { x: 1, y: 2, w: 3, h: 4, percent: true }],
		]);
		applyMediaCropFields(fm, original);
		const reparsed = parseMediaCropFields(fm);
		expect(reparsed.get('portrait.jpg')).toEqual({ x: 40, y: 60, w: 200, h: 200, percent: false });
		expect(reparsed.get('pct.jpg')).toEqual({ x: 1, y: 2, w: 3, h: 4, percent: true });
	});
});

describe('nested -> flat conversion (#683 migration)', () => {
	it('converts a legacy media_crop array to the flat form and drops the nested key', () => {
		// This is exactly what the Flatten Nested Properties tool runs per note.
		const fm: Record<string, unknown> = {
			cr_type: 'person',
			media_crop: [
				{ image: 'portrait.jpg', x: 40, y: 60, w: 200, h: 200 },
				{ image: 'doc.jpg', x: 5, y: 5, w: 50, h: 50, percent: true },
			],
		};
		applyMediaCropFields(fm, parseMediaCropFields(fm));

		expect('media_crop' in fm).toBe(false);
		expect(fm.media_crop_image).toEqual(['portrait.jpg', 'doc.jpg']);
		expect(fm.media_crop_x).toEqual([40, 5]);
		expect(fm.media_crop_percent).toEqual([false, true]);
		expect(fm.cr_type).toBe('person'); // unrelated keys untouched
	});
});
