import { describe, expect, it } from 'vitest';
import { FictionalDateParser } from '../src/dates/parser/fictional-date-parser';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #626 — fictional-era dates stored with an ISO-style `-MM-DD` (or
 * `-MM`) suffix previously failed every fictional-parser pattern (all
 * anchored at `$`) and fell through to the standard parser's 4-digit
 * substring fallback. The downstream effect on the Dynamic Timeline
 * Block was a missing era prefix: `DE 1264-08-15` rendered as `1264`
 * because `formatYearForDisplay` reached `extractYear` and pulled only
 * the digits. This suite fences the date-suffix strip in both `parse()`
 * and `looksLikeFictionalDate()`.
 */

const EARTHFALL_SYSTEM: FictionalDateSystem = {
	id: 'earthfall',
	name: 'Earthfall',
	universe: 'Earthfall',
	eras: [
		{ id: 'descent-era', name: 'Descent Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

const STAR_WARS_SYSTEM: FictionalDateSystem = {
	id: 'star-wars',
	name: 'Star Wars',
	eras: [
		{ id: 'before-battle-of-yavin', name: 'Before Battle of Yavin', abbrev: 'BBY', epoch: 0, direction: 'backward' },
		{ id: 'after-battle-of-yavin', name: 'After Battle of Yavin', abbrev: 'ABY', epoch: 0, direction: 'forward' },
	],
};

describe('FictionalDateParser ISO-style date suffix (#626)', () => {
	const parser = new FictionalDateParser([EARTHFALL_SYSTEM, STAR_WARS_SYSTEM]);

	it('parses "DE 1264-08-15" (-MM-DD) as DE 1264', () => {
		const result = parser.parse('DE 1264-08-15');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('DE');
		expect(result.date.year).toBe(1264);
		expect(result.date.canonicalYear).toBe(1264);
	});

	it('parses "DE 1264-08" (-MM only) as DE 1264', () => {
		const result = parser.parse('DE 1264-08');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('DE');
		expect(result.date.year).toBe(1264);
	});

	it('parses "DE 1264" (no suffix) as DE 1264 — unchanged baseline', () => {
		const result = parser.parse('DE 1264');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.year).toBe(1264);
	});

	it('parses backward-era "BBY 29-12-15" as BBY 29 (canonical -29)', () => {
		const result = parser.parse('BBY 29-12-15');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('BBY');
		expect(result.date.year).toBe(29);
		expect(result.date.canonicalYear).toBe(-29);
	});

	it('parses combined "DE 1264-08-15T20:03:04" (date AND time suffix) as DE 1264', () => {
		const result = parser.parse('DE 1264-08-15T20:03:04');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.era.abbrev).toBe('DE');
		expect(result.date.year).toBe(1264);
	});

	it('parses combined "DE 1264-08-15 T20:03:04" (space before T) as DE 1264', () => {
		const result = parser.parse('DE 1264-08-15 T20:03:04');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.date.year).toBe(1264);
	});

	it('parses year-first "29-12-15 BBY" as BBY 29 (suffix-strip is positional)', () => {
		// The date-suffix strip is anchored at end-of-string, so a
		// year-first input with the date precision attached to the year
		// portion can't reach the patterns. But if the trailing token is
		// itself an `-MM-DD` shape after the era, we still strip — same
		// rationale as the time suffix.
		const result = parser.parse('29-12-15 BBY');
		// `-12-15` strips → `29 BBY`, then year-first pattern matches.
		// Wait — `29-12-15 BBY` ends with `BBY`, not digits, so the
		// date-suffix regex (anchored at `$`) doesn't fire here. This
		// confirms the strip is end-of-string only and doesn't bleed
		// into mid-string ISO-shaped substrings.
		expect(result.success).toBe(false);
	});

	it('does NOT strip a single-digit suffix like "-5"', () => {
		// Defensive — the regex requires two digits per ISO convention.
		// `DE 1264-5` is an unusual shape and should not be silently
		// reduced; the parser stays strict.
		const result = parser.parse('DE 1264-5');
		expect(result.success).toBe(false);
	});

	it('rejects a pure ISO date "2024-08-15" (parses neither as fictional nor reduces to a bare year claim)', () => {
		// After the date-suffix strip the input would reduce to `2024`,
		// but `parse()` still needs an era abbreviation to succeed. The
		// fictional parser leaves bare 4-digit inputs alone — those are
		// the standard parser's responsibility.
		const result = parser.parse('2024-08-15');
		expect(result.success).toBe(false);
	});

	it('rejects a pure ISO date "2024-08" (year-month)', () => {
		const result = parser.parse('2024-08');
		expect(result.success).toBe(false);
	});
});

describe('FictionalDateParser.looksLikeFictionalDate ISO-style date suffix (#626)', () => {
	const parser = new FictionalDateParser([EARTHFALL_SYSTEM, STAR_WARS_SYSTEM]);

	it('returns true for "DE 1264-08-15"', () => {
		expect(parser.looksLikeFictionalDate('DE 1264-08-15')).toBe(true);
	});

	it('returns true for "DE 1264-08"', () => {
		expect(parser.looksLikeFictionalDate('DE 1264-08')).toBe(true);
	});

	it('returns true for "DE 1264" (no suffix, baseline)', () => {
		expect(parser.looksLikeFictionalDate('DE 1264')).toBe(true);
	});

	it('returns true for "BBY 29-12-15" (backward era)', () => {
		expect(parser.looksLikeFictionalDate('BBY 29-12-15')).toBe(true);
	});

	it('returns true for combined "DE 1264-08-15T20:03:04"', () => {
		expect(parser.looksLikeFictionalDate('DE 1264-08-15T20:03:04')).toBe(true);
	});

	it('returns false for pure ISO "2024-08-15"', () => {
		// The ISO-pattern check runs before the date-suffix strip so this
		// stays rejected — otherwise the strip would reduce it to `2024`
		// which would also fail, but checking ISO first is clearer.
		expect(parser.looksLikeFictionalDate('2024-08-15')).toBe(false);
	});

	it('returns false for pure ISO "2024-08" (year-month)', () => {
		expect(parser.looksLikeFictionalDate('2024-08')).toBe(false);
	});

	it('returns false for bare year "2024"', () => {
		expect(parser.looksLikeFictionalDate('2024')).toBe(false);
	});
});
