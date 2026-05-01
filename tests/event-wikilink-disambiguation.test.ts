import { describe, expect, it } from 'vitest';
import { formatWikilink, createSmartWikilink } from '../src/events/services/event-service';
import type { App, TFile } from 'obsidian';

/**
 * #510 — Event creation links use the `name` property instead of the filename
 * when filename and frontmatter `name` differ. The fix introduces an explicit
 * basename parameter on the wikilink helpers so callers that captured a TFile
 * from a picker can disambiguate which file the link targets.
 *
 * Reporter scenario (doctorwodka): two persons with shared `name: Harold James`
 * but distinct filenames `Harold James 1.md` and `Harold James 2.md`. Without
 * the basename hint, `[[Harold James]]` resolves to whichever file Obsidian's
 * metadataCache picks first — silently the wrong person.
 */

describe('formatWikilink with basename (#510)', () => {
	it('emits [[basename|name]] when basename and name differ', () => {
		expect(formatWikilink('Harold James', 'Harold James 2')).toBe('[[Harold James 2|Harold James]]');
	});

	it('emits [[name]] when basename matches name', () => {
		expect(formatWikilink('Harold James', 'Harold James')).toBe('[[Harold James]]');
	});

	it('falls back to [[name]] when basename is undefined', () => {
		expect(formatWikilink('Harold James')).toBe('[[Harold James]]');
	});

	it('falls back to [[name]] when basename is empty string', () => {
		expect(formatWikilink('Harold James', '')).toBe('[[Harold James]]');
	});

	it('preserves an already-bracketed wikilink even when basename is provided', () => {
		// Edit-mode preservation: callers may pass a value that's already a
		// wikilink (loaded from frontmatter). Don't double-wrap.
		expect(formatWikilink('[[Harold James 1|Harold James]]', 'Harold James 1')).toBe('[[Harold James 1|Harold James]]');
	});

	it('trims whitespace from the input value', () => {
		expect(formatWikilink('  Harold James  ', 'Harold James 2')).toBe('[[Harold James 2|Harold James]]');
	});
});

describe('createSmartWikilink with basename (#510)', () => {
	// Minimal App stub — only metadataCache.getFirstLinkpathDest is used by the
	// fallback path, and only when no basename hint is provided.
	const stubApp = {
		metadataCache: {
			getFirstLinkpathDest: () => null,
		},
	} as unknown as App;

	it('uses explicit basename, ignoring file and metadataCache', () => {
		// The bug case: metadataCache might resolve to "Harold James 1" (the wrong
		// file) — the explicit basename "Harold James 2" must win.
		const fakeFile = { basename: 'Harold James 1' } as TFile;
		const result = createSmartWikilink('Harold James', fakeFile, stubApp, 'Harold James 2');
		expect(result).toBe('[[Harold James 2|Harold James]]');
	});

	it('emits [[name]] when explicit basename equals name', () => {
		const result = createSmartWikilink('Harold James', null, stubApp, 'Harold James');
		expect(result).toBe('[[Harold James]]');
	});

	it('falls back to file.basename when no explicit basename is given', () => {
		const fakeFile = { basename: 'Harold James 1' } as TFile;
		const result = createSmartWikilink('Harold James', fakeFile, stubApp);
		expect(result).toBe('[[Harold James 1|Harold James]]');
	});

	it('falls back to plain wikilink when no file, no basename, no metadata match', () => {
		const result = createSmartWikilink('Harold James', null, stubApp);
		expect(result).toBe('[[Harold James]]');
	});

	it('uses metadataCache resolution when no file or basename is provided', () => {
		const resolvedApp = {
			metadataCache: {
				getFirstLinkpathDest: () => ({ basename: 'Harold James 1' } as TFile),
			},
		} as unknown as App;
		const result = createSmartWikilink('Harold James', null, resolvedApp);
		expect(result).toBe('[[Harold James 1|Harold James]]');
	});
});
