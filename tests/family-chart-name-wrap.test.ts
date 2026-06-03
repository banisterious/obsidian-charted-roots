import { describe, expect, it } from 'vitest';
import { wrapNameToTwoLines } from '../src/ui/views/family-chart-name-wrap';

/**
 * #671 — Long card names clip on the right on the SVG card styles instead of
 * wrapping. `wrapNameToTwoLines` is the pure greedy word-packer that splits an
 * overflowing name across two lines; the view feeds it a real SVG measurement,
 * but here we use a deterministic monospace stand-in (each char = 10px) so the
 * packing behavior is fenced independently of font metrics.
 */

const CHAR_WIDTH = 10;
const measure = (s: string): number => s.length * CHAR_WIDTH;

describe('wrapNameToTwoLines (#671)', () => {
	it('packs as many whole words as fit onto the first line', () => {
		// "Maria del Carmen" = 16 chars (160px). At 130px the first line holds
		// "Maria del" (90px); adding "Carmen" (160px) overflows, so it wraps.
		const [line1, line2] = wrapNameToTwoLines('Maria del Carmen', 130, measure);
		expect(line1).toBe('Maria del');
		expect(line2).toBe('Carmen');
	});

	it('breaks after the first word when the second already overflows', () => {
		const [line1, line2] = wrapNameToTwoLines('Bartholomew Cuthbertson', 150, measure);
		expect(line1).toBe('Bartholomew');
		expect(line2).toBe('Cuthbertson');
	});

	it('returns an empty second line for a single unbreakable word', () => {
		// One token that overflows on its own: nothing to wrap on, so the caller
		// gets an empty second line and skips wrapping (the fade handles it).
		const [line1, line2] = wrapNameToTwoLines('Supercalifragilistic', 80, measure);
		expect(line1).toBe('Supercalifragilistic');
		expect(line2).toBe('');
	});

	it('keeps the first word on line 1 even when it alone overflows', () => {
		const [line1, line2] = wrapNameToTwoLines('Wolfeschlegelsteinhausen Berg', 100, measure);
		expect(line1).toBe('Wolfeschlegelsteinhausen');
		expect(line2).toBe('Berg');
	});

	it('puts every remaining word on the second line', () => {
		const [line1, line2] = wrapNameToTwoLines('Ann Mary Jane Watson', 80, measure);
		expect(line1).toBe('Ann Mary');
		expect(line2).toBe('Jane Watson');
	});

	it('collapses irregular whitespace and trims', () => {
		const [line1, line2] = wrapNameToTwoLines('  Jean   Luc  Picard  ', 90, measure);
		expect(line1).toBe('Jean Luc');
		expect(line2).toBe('Picard');
	});

	it('handles an empty name without throwing', () => {
		expect(wrapNameToTwoLines('', 100, measure)).toEqual(['', '']);
		expect(wrapNameToTwoLines('   ', 100, measure)).toEqual(['', '']);
	});
});
