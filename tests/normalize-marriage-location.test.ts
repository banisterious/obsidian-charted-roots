import { describe, expect, it } from 'vitest';
import { normalizeMarriageLocation } from '../src/core/person-note-writer';

/**
 * #513 — `spouse{N}_marriage_location` ended up in nested-array block-list
 * form (`[["Basename"]]`) after Edit Person → Save because the writer wrapped
 * its `createSmartWikilink(...)` output in extra JS-string quotes, which
 * processFrontMatter round-tripped into the array shape for unrecognized
 * link fields. The writer fix drops the embedded quotes; this helper handles
 * the load-side normalization so existing degraded data round-trips back to
 * the canonical form on the next save.
 */

describe('normalizeMarriageLocation (#513)', () => {
	it('passes a clean wikilink string through unchanged', () => {
		expect(normalizeMarriageLocation('[[Boston Suffolk County]]')).toBe('[[Boston Suffolk County]]');
	});

	it('passes a bare string through unchanged', () => {
		expect(normalizeMarriageLocation('Boston Suffolk County')).toBe('Boston Suffolk County');
	});

	it('reshapes the nested-array block-list form to a wikilink string', () => {
		// The reported degradation case from #513.
		expect(normalizeMarriageLocation([['Boston Suffolk County']])).toBe('[[Boston Suffolk County]]');
	});

	it('returns undefined for undefined / null', () => {
		expect(normalizeMarriageLocation(undefined)).toBeUndefined();
		expect(normalizeMarriageLocation(null)).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		expect(normalizeMarriageLocation('')).toBeUndefined();
	});

	it('returns undefined for unrecognized shapes (defensive)', () => {
		// Plain single-element array — not the nested form. Don't guess.
		expect(normalizeMarriageLocation(['Boston Suffolk County'])).toBeUndefined();
		// Empty array.
		expect(normalizeMarriageLocation([])).toBeUndefined();
		// Object.
		expect(normalizeMarriageLocation({ name: 'Boston' })).toBeUndefined();
		// Number.
		expect(normalizeMarriageLocation(42)).toBeUndefined();
	});

	it('does not match nested arrays of length other than one (defensive)', () => {
		// Multi-element outer array — would imply multiple locations, which the
		// schema does not support. Don't silently collapse.
		expect(normalizeMarriageLocation([['A'], ['B']])).toBeUndefined();
		// Multi-element inner array.
		expect(normalizeMarriageLocation([['A', 'B']])).toBeUndefined();
	});
});
