import { describe, expect, it } from 'vitest';
import { DynamicContentService } from '../src/dynamic-content/services/dynamic-content-service';
import type CanvasRootsPlugin from '../main';

/**
 * Regression coverage for #416 — the timeline-renderer red-bar crash
 * caused by bare-year YAML values (`died: 1893` parsing as Number) being
 * passed to the service's date helpers. `formatDate` and `extractYear`
 * now coerce input at entry, so any call site can pass YAML-parsed
 * values directly.
 *
 * The methods don't touch `this.plugin`, so instantiating with a cast
 * stub is sufficient for testing.
 */

const svc = new DynamicContentService({} as CanvasRootsPlugin);

describe('extractYear', () => {
	describe('numeric inputs (#416)', () => {
		it('bare year number returns the year string', () => {
			expect(svc.extractYear(1893)).toBe('1893');
		});

		it('four-digit number returns year string', () => {
			expect(svc.extractYear(2026)).toBe('2026');
		});

		it('three-digit number falls through to "any digits" branch', () => {
			// 3-digit years don't match the \b\d{4}\b pattern, so they hit
			// the final fallback. Locked in to document behavior.
			expect(svc.extractYear(800)).toBe('800');
		});
	});

	describe('string inputs', () => {
		it('bare year string returns the year', () => {
			expect(svc.extractYear('1893')).toBe('1893');
		});

		it('ISO date string returns just the year', () => {
			expect(svc.extractYear('1893-05-15')).toBe('1893');
		});

		it('GEDCOM qualifier "Bef. 1893" returns the year', () => {
			expect(svc.extractYear('Bef. 1893')).toBe('1893');
		});

		it('BCE suffix returns negative year', () => {
			expect(svc.extractYear('11 BCE')).toBe('-11');
		});

		it('AD suffix returns positive year', () => {
			expect(svc.extractYear('14 AD')).toBe('14');
		});

		it('ISO negative year returns negative', () => {
			expect(svc.extractYear('-0011-01-15')).toBe('-11');
		});
	});

	describe('standalone negative years (#476)', () => {
		it('custom-era prefix with negative year preserves the sign', () => {
			expect(svc.extractYear('DE -5740')).toBe('-5740');
		});

		it('negative year embedded in a sentence preserves the sign', () => {
			expect(svc.extractYear('Year -1234 of the Reign')).toBe('-1234');
		});

		it('negative year that is also short (3 digits) preserves the sign', () => {
			// Won't match the 4-digit standard branch; standalone-negative
			// branch should catch it.
			expect(svc.extractYear('Cycle -42')).toBe('-42');
		});

		it('ISO date with month/day separator stays positive', () => {
			// Hyphen between digits is an ISO separator, not a sign.
			expect(svc.extractYear('1942-08-15')).toBe('1942');
		});

		it('compound word with hyphen between digit and word is not negative', () => {
			expect(svc.extractYear('5-year-old')).toBe('5');
		});

		// #476 follow-up: doctorwodka's verification on 0.22.10 showed that the
		// standalone-negative regex's trailing `\b` failed when the user appended
		// a letter suffix like "ish" — both the trailing digit and the suffix
		// letter are word chars, so no word boundary fires between them. Switched
		// to a `(?=$|[^0-9])` lookahead so the digits can end against any
		// non-digit (or end of string) without requiring a true word boundary.
		it('preserves negative sign when digits are followed by a letter suffix (e.g., "ish")', () => {
			expect(svc.extractYear('DE -5740ish')).toBe('-5740');
		});

		it('preserves negative sign when followed by punctuation', () => {
			expect(svc.extractYear('DE -5740.')).toBe('-5740');
		});

		it('does not over-match when negative digits are immediately followed by more digits', () => {
			// "DE -57402" should match `-57402` as a single number (the `\d+` is
			// greedy), NOT split into `-5740` + `2`.
			expect(svc.extractYear('DE -57402')).toBe('-57402');
		});
	});

	describe('empty-ish inputs', () => {
		it.each([undefined, null, ''])('returns empty string for %s', (v) => {
			expect(svc.extractYear(v)).toBe('');
		});

		it('returns empty string for a string with no digits', () => {
			expect(svc.extractYear('unknown')).toBe('');
		});
	});
});

describe('formatDate', () => {
	describe('numeric inputs (#416)', () => {
		it('bare year number returns the year string', () => {
			expect(svc.formatDate(1893)).toBe('1893');
		});
	});

	describe('string inputs', () => {
		it('ISO date formats as "D Mon YYYY"', () => {
			expect(svc.formatDate('1893-05-15')).toBe('15 May 1893');
		});

		it('year-month formats as "Mon YYYY"', () => {
			expect(svc.formatDate('1893-05')).toBe('May 1893');
		});

		it('GEDCOM "BET" range converts to en-dash', () => {
			expect(svc.formatDate('BET 1890 AND 1893')).toBe('1890–1893');
		});

		it('GEDCOM "ABT" qualifier converts to "c."', () => {
			expect(svc.formatDate('ABT 1878')).toBe('c. 1878');
		});

		it('GEDCOM "BEF" qualifier converts to "before"', () => {
			expect(svc.formatDate('BEF 1893')).toBe('before 1893');
		});

		it('GEDCOM "AFT" qualifier converts to "after"', () => {
			expect(svc.formatDate('AFT 1893')).toBe('after 1893');
		});

		it('GEDCOM partial-date qualifier formats the month', () => {
			expect(svc.formatDate('ABT 1855-03')).toBe('c. Mar 1855');
		});

		it('bare year string passes through unchanged', () => {
			expect(svc.formatDate('1893')).toBe('1893');
		});
	});

	describe('empty-ish inputs', () => {
		it.each([undefined, null, ''])('returns empty string for %s', (v) => {
			expect(svc.formatDate(v)).toBe('');
		});
	});
});
