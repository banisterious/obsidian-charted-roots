import { describe, expect, it } from 'vitest';
import { FictionalDateParser } from '../src/dates/parser/fictional-date-parser';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #655 / #660 — the fictional-date parser rejected signed/negative years
 * (`EP -18`), the ISO-suffix strip corrupted them (eating `-18` as a month),
 * and decade notation (`EP 30s`) was unsupported. Because every fictional-date
 * surface routes through the parser, a rejected value sorted/placed wrong
 * everywhere — #660's "negative dates sort out of order" is the visible
 * symptom (the parse failure fell back to a broken string sort).
 *
 * `EP` is a forward-counting era at epoch 0, so the canonical year equals the
 * written year — negative years stay negative and sort earliest-first.
 */
const EPOCH_SYSTEM: FictionalDateSystem = {
	id: 'epoch',
	name: 'Epoch Calendar',
	universe: 'Epoch',
	eras: [{ id: 'ep', name: 'Epoch', abbrev: 'EP', epoch: 0, direction: 'forward' }],
};

function makeParser(): FictionalDateParser {
	return new FictionalDateParser([EPOCH_SYSTEM]);
}

describe('FictionalDateParser — negative years (#655)', () => {
	it('parses a space-separated negative year', () => {
		const result = makeParser().parse('EP -18');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.date.year).toBe(-18);
			expect(result.date.canonicalYear).toBe(-18);
		}
	});

	it('parses negative years of varying magnitude', () => {
		const parser = makeParser();
		for (const [raw, year] of [['EP -30', -30], ['EP -200', -200], ['EP -500', -500]] as const) {
			const result = parser.parse(raw);
			expect(result.success).toBe(true);
			if (result.success) expect(result.date.year).toBe(year);
		}
	});

	it('does not strip a negative year as if it were a month suffix', () => {
		// Before the guard, the `-MM` suffix strip ate the `-18` of "EP -18".
		const result = makeParser().parse('EP -18');
		expect(result.success).toBe(true);
		if (result.success) expect(result.date.year).toBe(-18);
	});

	it('still strips a real month/day suffix on positive years', () => {
		const parser = makeParser();
		expect(parser.parse('EP 1264-08-15').success).toBe(true);
		const r1 = parser.parse('EP 1264-08-15');
		if (r1.success) expect(r1.date.year).toBe(1264);
		const r2 = parser.parse('EP 1222-03');
		if (r2.success) expect(r2.date.year).toBe(1222);
	});

	it('strips a month suffix while keeping a negative year (EP -18-03)', () => {
		const result = makeParser().parse('EP -18-03');
		expect(result.success).toBe(true);
		if (result.success) expect(result.date.year).toBe(-18);
	});
});

describe('FictionalDateParser — decade notation (#655)', () => {
	it('parses a decade as its start year, flagged approximate', () => {
		const result = makeParser().parse('EP 30s');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.date.year).toBe(30);
			expect(result.date.isApproximate).toBe(true);
		}
	});

	it('parses a negative decade', () => {
		const result = makeParser().parse('EP -30s');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.date.year).toBe(-30);
			expect(result.date.isApproximate).toBe(true);
		}
	});
});

describe('FictionalDateParser.looksLikeFictionalDate — negative/decade (#655)', () => {
	const parser = makeParser();

	it('recognizes negative and decade shapes', () => {
		expect(parser.looksLikeFictionalDate('EP -18')).toBe(true);
		expect(parser.looksLikeFictionalDate('EP -500')).toBe(true);
		expect(parser.looksLikeFictionalDate('EP 30s')).toBe(true);
		expect(parser.looksLikeFictionalDate('EP -30s')).toBe(true);
	});

	it('still rejects a plain ISO date', () => {
		expect(parser.looksLikeFictionalDate('2024-08-15')).toBe(false);
	});
});

describe('canonical-year sort order for negative dates (#660)', () => {
	it('orders more-negative years earliest (-500 < -200 < -1)', () => {
		const parser = makeParser();
		const years = ['EP -01-12', 'EP -200', 'EP -500'].map(raw => {
			const r = parser.parse(raw);
			return r.success ? r.date.canonicalYear : NaN;
		});

		// EP -01-12 → year -1 (the month suffix strips); sorted ascending.
		expect([...years].sort((a, b) => a - b)).toEqual([-500, -200, -1]);
	});
});
