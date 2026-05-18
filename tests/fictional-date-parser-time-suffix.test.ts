import { describe, expect, it } from 'vitest';
import { FictionalDateParser } from '../src/dates/parser/fictional-date-parser';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #590 follow-up — when twins are recorded with an ISO 8601 time
 * component on a fictional-era date (e.g., `born: BBY 29 T20:03:04`),
 * the parser previously didn't strip the trailing time, the patterns
 * (all anchored at `$`) failed to match, parsing fell through to the
 * standard-date path, and the entry displayed as a real-world year
 * with a wildly off age. This suite fences the time-suffix strip in
 * both `parse()` and `looksLikeFictionalDate()`.
 */

const STAR_WARS_SYSTEM: FictionalDateSystem = {
	id: 'star-wars',
	name: 'Star Wars',
	eras: [
		{ name: 'Before Battle of Yavin', abbrev: 'BBY', epoch: 0, direction: 'backward' },
		{ name: 'After Battle of Yavin', abbrev: 'ABY', epoch: 0, direction: 'forward' },
	],
};

describe('FictionalDateParser ISO 8601 time suffix (#590 follow-up)', () => {
	const parser = new FictionalDateParser([STAR_WARS_SYSTEM]);

	it('parses "BBY 29T20:03:04" (no space before T) as BBY 29', () => {
		const result = parser.parse('BBY 29T20:03:04');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('BBY');
		expect(result.date.year).toBe(29);
		expect(result.date.canonicalYear).toBe(-29);
	});

	it('parses "BBY 29 T20:03:04" (space before T) as BBY 29', () => {
		const result = parser.parse('BBY 29 T20:03:04');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('BBY');
		expect(result.date.year).toBe(29);
		expect(result.date.canonicalYear).toBe(-29);
	});

	it('parses "BBY 29 T03:42" (HH:MM only, no seconds)', () => {
		const result = parser.parse('BBY 29 T03:42');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-29);
	});

	it('parses "BBY 29" (no time) as BBY 29 — unchanged baseline', () => {
		const result = parser.parse('BBY 29');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-29);
	});

	it('parses "29 BBY T20:03:04" (year-first with time)', () => {
		const result = parser.parse('29 BBY T20:03:04');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-29);
	});

	it('does NOT strip a partial time-looking suffix like ":42"', () => {
		// Defensive — only the full `T HH:MM[:SS]` pattern should strip.
		const result = parser.parse('BBY 29:42');
		expect(result.success).toBe(false);
	});

	it('looksLikeFictionalDate returns true for "BBY 29 T20:03:04"', () => {
		expect(parser.looksLikeFictionalDate('BBY 29 T20:03:04')).toBe(true);
	});

	it('looksLikeFictionalDate returns true for "BBY 29T03:42"', () => {
		expect(parser.looksLikeFictionalDate('BBY 29T03:42')).toBe(true);
	});

	it('looksLikeFictionalDate returns false for plain ISO with time', () => {
		// A standard ISO datetime should not be claimed by the fictional parser.
		expect(parser.looksLikeFictionalDate('1985-04-12T03:42')).toBe(false);
	});
});
