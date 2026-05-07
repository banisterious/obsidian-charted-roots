import { describe, expect, it } from 'vitest';
import { MediaService } from '../src/core/media-service';
import type { App } from 'obsidian';
import type { CanvasRootsSettings } from '../src/core/settings';

/**
 * Coverage for `parseMediaCaptions` (#523). The parser is pure — only
 * reads `frontmatter.media_captions` and produces a Map keyed by image
 * filename. Tests fence the behavior directly without an Obsidian
 * vault or actual settings, since the method doesn't touch either.
 */

const service = new MediaService({} as App, {} as CanvasRootsSettings);

describe('MediaService.parseMediaCaptions', () => {
	it('returns an empty map when media_captions is absent', () => {
		const result = service.parseMediaCaptions({});
		expect(result.size).toBe(0);
	});

	it('returns an empty map when media_captions is not an array', () => {
		const result = service.parseMediaCaptions({ media_captions: 'not-an-array' });
		expect(result.size).toBe(0);
	});

	it('parses a single { image, caption } entry into the map', () => {
		const fm = {
			media_captions: [
				{ image: 'wedding-1925.jpg', caption: 'Wedding day, June 1925' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.size).toBe(1);
		expect(result.get('wedding-1925.jpg')).toBe('Wedding day, June 1925');
	});

	it('parses multiple entries, keyed by filename', () => {
		const fm = {
			media_captions: [
				{ image: 'a.jpg', caption: 'First' },
				{ image: 'b.jpg', caption: 'Second' },
				{ image: 'c.jpg', caption: 'Third' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.size).toBe(3);
		expect(result.get('a.jpg')).toBe('First');
		expect(result.get('b.jpg')).toBe('Second');
		expect(result.get('c.jpg')).toBe('Third');
	});

	it('skips entries with empty caption strings', () => {
		const fm = {
			media_captions: [
				{ image: 'a.jpg', caption: 'Real caption' },
				{ image: 'b.jpg', caption: '' },
				{ image: 'c.jpg', caption: '   ' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.size).toBe(1);
		expect(result.get('a.jpg')).toBe('Real caption');
		expect(result.has('b.jpg')).toBe(false);
		expect(result.has('c.jpg')).toBe(false);
	});

	it('skips entries missing the image filename', () => {
		const fm = {
			media_captions: [
				{ caption: 'Orphaned caption' },
				{ image: '', caption: 'Empty image key' },
				{ image: 'a.jpg', caption: 'Valid' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.size).toBe(1);
		expect(result.get('a.jpg')).toBe('Valid');
	});

	it('skips non-string caption values', () => {
		const fm = {
			media_captions: [
				{ image: 'a.jpg', caption: 42 },
				{ image: 'b.jpg', caption: null },
				{ image: 'c.jpg', caption: true },
				{ image: 'd.jpg', caption: 'Valid' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.size).toBe(1);
		expect(result.get('d.jpg')).toBe('Valid');
	});

	it('skips non-object array entries', () => {
		const fm = {
			media_captions: [
				'a string',
				null,
				42,
				{ image: 'a.jpg', caption: 'Valid' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.size).toBe(1);
		expect(result.get('a.jpg')).toBe('Valid');
	});

	it('preserves caption text including punctuation and Unicode', () => {
		const fm = {
			media_captions: [
				{ image: 'a.jpg', caption: 'Wedding — June 1925, Aix-en-Provence' },
				{ image: 'b.jpg', caption: 'お祝い 1975' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.get('a.jpg')).toBe('Wedding — June 1925, Aix-en-Provence');
		expect(result.get('b.jpg')).toBe('お祝い 1975');
	});

	it('does not trim leading/trailing whitespace from non-empty captions', () => {
		// We treat all-whitespace as empty (skipped above), but preserve
		// internal padding when the user deliberately included it.
		const fm = {
			media_captions: [
				{ image: 'a.jpg', caption: '  with leading spaces' }
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result.get('a.jpg')).toBe('  with leading spaces');
	});
});
