/* eslint-disable @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { MediaService } from '../src/core/media-service';
import type { App } from 'obsidian';
import type { CanvasRootsSettings } from '../src/core/settings';

/**
 * Coverage for `parseMediaCaptions` (#523). Captions live in a flat
 * parallel string array, index-aligned with `media:` (mirroring the
 * `<type>_notes` pattern from #530). Parser is pure — only reads
 * `frontmatter.media_captions`. Tests fence the behavior directly
 * without an Obsidian vault or actual settings.
 */

const service = new MediaService({} as App, {} as CanvasRootsSettings);

describe('MediaService.parseMediaCaptions', () => {
	it('returns an empty array when media_captions is absent', () => {
		const result = service.parseMediaCaptions({});
		expect(result).toEqual([]);
	});

	it('returns an empty array when media_captions is not an array', () => {
		const result = service.parseMediaCaptions({ media_captions: 'not-an-array' });
		expect(result).toEqual([]);
	});

	it('parses a single-string array', () => {
		const fm = { media_captions: ['Wedding day, June 1925'] };
		const result = service.parseMediaCaptions(fm);
		expect(result).toEqual(['Wedding day, June 1925']);
	});

	it('parses multiple strings preserving order and indices', () => {
		const fm = {
			media_captions: [
				'First',
				'Second',
				'Third'
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result).toEqual(['First', 'Second', 'Third']);
	});

	it('preserves empty-string slots so callers can correlate by index', () => {
		// Index-aligned with `media:` — the second image has no caption,
		// the others do. Empty string is the padding sentinel.
		const fm = {
			media_captions: ['First', '', 'Third']
		};
		const result = service.parseMediaCaptions(fm);
		expect(result).toEqual(['First', '', 'Third']);
	});

	it('coerces non-string array entries to empty strings', () => {
		const fm = {
			media_captions: ['First', 42, null, 'Fourth', true]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result).toEqual(['First', '', '', 'Fourth', '']);
	});

	it('preserves caption text including punctuation and Unicode', () => {
		const fm = {
			media_captions: [
				'Wedding — June 1925, Aix-en-Provence',
				'お祝い 1975'
			]
		};
		const result = service.parseMediaCaptions(fm);
		expect(result).toEqual([
			'Wedding — June 1925, Aix-en-Provence',
			'お祝い 1975'
		]);
	});

	it('does not trim whitespace on individual entries', () => {
		// Render-time logic decides whether to display whitespace-only
		// captions; the parser stays faithful to what the user wrote.
		const fm = {
			media_captions: ['  with leading spaces', '   ']
		};
		const result = service.parseMediaCaptions(fm);
		expect(result).toEqual(['  with leading spaces', '   ']);
	});
});