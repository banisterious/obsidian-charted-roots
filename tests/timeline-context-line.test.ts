import { describe, expect, it } from 'vitest';
import { parseContextLine } from '../src/dynamic-content/renderers/timeline-renderer';

/**
 * #693 — Context-note events in fictional dating systems (BBY/ABY, custom
 * eras) never rendered on the Dynamic Timeline Block. The context-note parser
 * matched dates with a Gregorian-only regex (`\d{4}` — exactly four digits, no
 * era abbreviation), so a line like "- BBY 32: Invasion of Naboo" matched
 * nothing and the note produced zero entries, while a real-world "US History"
 * note worked. `parseContextLine` keeps the Gregorian path byte-for-byte and
 * adds a fictional-era fallback. Reported by @DigitalDreamn.
 */
describe('parseContextLine — Gregorian (unchanged behavior)', () => {
	it('parses a plain four-digit year', () => {
		expect(parseContextLine('1914: World War I begins')).toEqual({
			startRaw: '1914',
			endRaw: undefined,
			title: 'World War I begins',
		});
	});

	it('parses a bulleted line (- and *)', () => {
		expect(parseContextLine('- 1914: WWI')).toEqual({
			startRaw: '1914',
			endRaw: undefined,
			title: 'WWI',
		});
		expect(parseContextLine('* 1929-10-29: Black Tuesday')).toEqual({
			startRaw: '1929-10-29',
			endRaw: undefined,
			title: 'Black Tuesday',
		});
	});

	it('parses a bare-hyphen year range', () => {
		expect(parseContextLine('- 1861-1865: American Civil War')).toEqual({
			startRaw: '1861',
			endRaw: '1865',
			title: 'American Civil War',
		});
	});

	it('parses an en-dash year range', () => {
		expect(parseContextLine('1939–1945: World War II')).toEqual({
			startRaw: '1939',
			endRaw: '1945',
			title: 'World War II',
		});
	});

	it('treats a full ISO date as a single date, not a range', () => {
		expect(parseContextLine('1929-10-29: Black Tuesday')).toEqual({
			startRaw: '1929-10-29',
			endRaw: undefined,
			title: 'Black Tuesday',
		});
	});

	it('keeps colons inside the title (splits on the date colon only)', () => {
		expect(parseContextLine('1939: World War II: The Pacific')).toEqual({
			startRaw: '1939',
			endRaw: undefined,
			title: 'World War II: The Pacific',
		});
	});
});

describe('parseContextLine — fictional eras (#693)', () => {
	it('parses an era-prefixed date (BBY 32)', () => {
		expect(parseContextLine('- BBY 32: Invasion of Naboo')).toEqual({
			startRaw: 'BBY 32',
			endRaw: undefined,
			title: 'Invasion of Naboo',
		});
	});

	it('parses an era-suffixed date (32 BBY)', () => {
		expect(parseContextLine('32 BBY: Invasion of Naboo')).toEqual({
			startRaw: '32 BBY',
			endRaw: undefined,
			title: 'Invasion of Naboo',
		});
	});

	it('parses a fictional range on an en-dash', () => {
		expect(parseContextLine('BBY 32 – BBY 22: The Clone Wars')).toEqual({
			startRaw: 'BBY 32',
			endRaw: 'BBY 22',
			title: 'The Clone Wars',
		});
	});

	it('parses a fictional range on a spaced hyphen', () => {
		expect(parseContextLine('- BBY 32 - BBY 22: The Clone Wars')).toEqual({
			startRaw: 'BBY 32',
			endRaw: 'BBY 22',
			title: 'The Clone Wars',
		});
	});

	it('parses a fictional range on "to"', () => {
		expect(parseContextLine('BBY 32 to BBY 22: The Clone Wars')).toEqual({
			startRaw: 'BBY 32',
			endRaw: 'BBY 22',
			title: 'The Clone Wars',
		});
	});

	it('parses a custom era abbreviation (ABY 4)', () => {
		expect(parseContextLine('ABY 4: Battle of Endor')).toEqual({
			startRaw: 'ABY 4',
			endRaw: undefined,
			title: 'Battle of Endor',
		});
	});
});

describe('parseContextLine — non-event lines are skipped', () => {
	it('returns null for a prose/heading line with a colon but no date', () => {
		expect(parseContextLine('Note: this is just a comment')).toBeNull();
	});

	it('returns null for a line with no colon', () => {
		expect(parseContextLine('BBY 32 Invasion of Naboo')).toBeNull();
		expect(parseContextLine('Just some prose')).toBeNull();
	});

	it('returns null for an empty title', () => {
		expect(parseContextLine('BBY 32:')).toBeNull();
		expect(parseContextLine('1914:   ')).toBeNull();
	});

	it('returns null for a blank line', () => {
		expect(parseContextLine('')).toBeNull();
		expect(parseContextLine('   ')).toBeNull();
	});

	it('returns null for a bare sub-four-digit year with no era (documented boundary)', () => {
		// "532: Event" has no era abbreviation and fewer than four digits, so it
		// matches neither the Gregorian regex nor the fictional-shape gate. Such
		// dates need an era abbreviation (e.g. "AC 532") to be recognized.
		expect(parseContextLine('532: Founding of the city')).toBeNull();
	});
});
