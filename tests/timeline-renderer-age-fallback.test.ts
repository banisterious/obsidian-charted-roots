import { describe, expect, it } from 'vitest';
import { looksLikeFictionalDate } from '../src/dynamic-content/renderers/timeline-renderer';

/**
 * #565 — `computeEventAge`'s fallback path (when DateService can't produce
 * an answer) used `parseInt(extractYear(date))` to compute age, but
 * `extractYear` strips era prefixes from fictional dates. For multi-era
 * inputs, the fallback returned an era-local difference that was off by
 * the era epoch — the reporter's "100 years off" symptom.
 *
 * The fix bails out of the fallback when either input has the shape of a
 * fictional date, returning undefined rather than rendering a silently
 * wrong "age N" annotation. This suite fences the `looksLikeFictionalDate`
 * heuristic that gates the bail-out.
 */

describe('looksLikeFictionalDate heuristic (#565)', () => {
	it('matches era-prefix format (EF 30, BBY 1045)', () => {
		expect(looksLikeFictionalDate('EF 30')).toBe(true);
		expect(looksLikeFictionalDate('BBY 1045')).toBe(true);
		expect(looksLikeFictionalDate('DE 5')).toBe(true);
	});

	it('matches no-space prefix format (EF30, BBY1045)', () => {
		expect(looksLikeFictionalDate('EF30')).toBe(true);
		expect(looksLikeFictionalDate('BBY1045')).toBe(true);
	});

	it('matches year-first format (30 EF, 1045 BBY)', () => {
		expect(looksLikeFictionalDate('30 EF')).toBe(true);
		expect(looksLikeFictionalDate('1045 BBY')).toBe(true);
	});

	it('matches no-space year-first format (30EF, 1045BBY)', () => {
		expect(looksLikeFictionalDate('30EF')).toBe(true);
		expect(looksLikeFictionalDate('1045BBY')).toBe(true);
	});

	it('matches GEDCOM-qualifier prefixes that share the shape (caller is responsible for deferring to DateService first)', () => {
		// "ABT 1880" / "BEF 1950" both have letter-then-digit shape. The
		// fallback path is only reached when DateService can't parse the
		// input, so GEDCOM-qualified strings should already have been
		// handled by the standard branch of `parseDate` before the heuristic
		// fires. We document this overlap rather than work around it.
		expect(looksLikeFictionalDate('ABT 1880')).toBe(true);
		expect(looksLikeFictionalDate('BEF 1950')).toBe(true);
	});

	it('does not match pure ISO dates (1850-03-15, 1880)', () => {
		expect(looksLikeFictionalDate('1850-03-15')).toBe(false);
		expect(looksLikeFictionalDate('1880')).toBe(false);
		expect(looksLikeFictionalDate('1880-01')).toBe(false);
	});

	it('does not match negative ISO dates (-0500, -1000-01-01)', () => {
		expect(looksLikeFictionalDate('-0500')).toBe(false);
		expect(looksLikeFictionalDate('-1000-01-01')).toBe(false);
	});

	it('returns false for empty / undefined / non-string input', () => {
		expect(looksLikeFictionalDate(undefined)).toBe(false);
		expect(looksLikeFictionalDate('')).toBe(false);
		expect(looksLikeFictionalDate('   ')).toBe(false);
	});

	it('returns false for pure letter input (no digits)', () => {
		expect(looksLikeFictionalDate('hello')).toBe(false);
		expect(looksLikeFictionalDate('EF')).toBe(false);
	});

	it('returns false for pure digit input (no era prefix)', () => {
		// Bare "30" or "1500" is read as a standard-year shape, not fictional.
		// DateService's standard-date path will handle it (or fail cleanly).
		expect(looksLikeFictionalDate('30')).toBe(false);
		expect(looksLikeFictionalDate('1500')).toBe(false);
	});
});
