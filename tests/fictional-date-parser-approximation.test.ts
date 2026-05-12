import { describe, expect, it } from 'vitest';
import { FictionalDateParser } from '../src/dates/parser/fictional-date-parser';
import { createDateService } from '../src/dates/services/date-service';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #562 — `FictionalDateParser.parse` was anchored `^...$` and rejected any
 * date carrying a trailing approximation marker like "ish" or "?". With
 * multiple eras configured, "EF 10ish" fell through every fictional pattern
 * → standard fallback (which only accepts 4-digit years) → final regex
 * matched the bare "10" in era-local space, putting the event in the wrong
 * decade on Timeline Density (and reading as "wholly removed" because the
 * expected canonical decade no longer held it). This suite fences the
 * approximation-stripper plus the `isApproximate` propagation.
 */

const ENGLISH_FANTASY_SYSTEM: FictionalDateSystem = {
	id: 'test-multi-era',
	name: 'Test multi-era system',
	eras: [
		{ name: 'Era of Forging', abbrev: 'EF', epoch: -100, direction: 'forward' },
		{ name: 'Dawn Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

describe('FictionalDateParser approximation markers (#562)', () => {
	const parser = new FictionalDateParser([ENGLISH_FANTASY_SYSTEM]);

	it('parses "EF 10ish" as approximate EF 10 with canonical year -90', () => {
		const result = parser.parse('EF 10ish');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('EF');
		expect(result.date.year).toBe(10);
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "EF 10 ish" (detached suffix) as approximate', () => {
		const result = parser.parse('EF 10 ish');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "10ish EF" (year-first with ish) as approximate', () => {
		const result = parser.parse('10ish EF');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "EF 10?" (trailing question mark) as approximate', () => {
		const result = parser.parse('EF 10?');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "circa EF 10" (prefix circa) as approximate', () => {
		const result = parser.parse('circa EF 10');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "ca EF 10" (prefix ca) as approximate', () => {
		const result = parser.parse('ca EF 10');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "approx EF 10" as approximate', () => {
		const result = parser.parse('approx EF 10');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBe(true);
	});

	it('parses "EF 10" (control) as non-approximate', () => {
		const result = parser.parse('EF 10');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(-90);
		expect(result.date.isApproximate).toBeUndefined();
	});

	it('parses "DE 100" (control, different era) as non-approximate', () => {
		const result = parser.parse('DE 100');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.canonicalYear).toBe(100);
		expect(result.date.isApproximate).toBeUndefined();
	});

	it('rejects "EF ish 10" — ish is only meaningful adjacent to digits', () => {
		// After prefix strip (no prefix here) and trying ish-strip (no digit-adjacency),
		// the input stays "EF ish 10" which doesn't match any anchored pattern.
		const result = parser.parse('EF ish 10');
		expect(result.success).toBe(false);
	});
});

describe('DateService.parseDate propagates fictional isApproximate (#562)', () => {
	const dateService = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: false,
		fictionalDateSystems: [ENGLISH_FANTASY_SYSTEM],
	});

	it('returns isApproximate=true and canonical year for "EF 10ish"', () => {
		const parsed = dateService.parseDate('EF 10ish');
		expect(parsed).not.toBeNull();
		expect(parsed?.type).toBe('fictional');
		expect(parsed?.year).toBe(-90);
		expect(parsed?.isApproximate).toBe(true);
	});

	it('does not set isApproximate for plain "EF 10"', () => {
		const parsed = dateService.parseDate('EF 10');
		expect(parsed?.isApproximate).toBeUndefined();
	});
});
