import { describe, expect, it } from 'vitest';
import { formatDisplayDate } from '../src/dates/utils/date-display';

/**
 * Regression coverage for the numeric-YAML input crash in
 * `formatDisplayDate` (same class of bug as #416 in the dynamic-content
 * date helpers). Obsidian's Properties panel treats an unquoted year
 * like `born: 1800` as a Number, and YAML parses it as an integer; the
 * previous `.trim()` call crashed on non-string input. The helper now
 * coerces at entry.
 *
 * These tests fence the coercion. The full GEDCOM-qualifier formatting
 * matrix isn't re-verified here — it's covered by implicit usage; the
 * goal is to lock the string-vs-number-vs-nullish contract.
 */

describe('formatDisplayDate — input coercion', () => {
	describe('numeric inputs', () => {
		it('bare year number returns the year as a string', () => {
			expect(formatDisplayDate(1878)).toBe('1878');
		});

		it('four-digit number returns year string', () => {
			expect(formatDisplayDate(2026)).toBe('2026');
		});

		it('three-digit number falls through to as-is branch', () => {
			expect(formatDisplayDate(800)).toBe('800');
		});
	});

	describe('nullish / empty inputs', () => {
		it('undefined returns empty string', () => {
			expect(formatDisplayDate(undefined)).toBe('');
		});

		it('null returns empty string', () => {
			expect(formatDisplayDate(null)).toBe('');
		});

		it('empty string returns empty string', () => {
			expect(formatDisplayDate('')).toBe('');
		});
	});

	describe('string inputs (spot-check that formatting still works)', () => {
		it('bare year string returns the year', () => {
			expect(formatDisplayDate('1878')).toBe('1878');
		});

		it('ISO date string formats with day + month', () => {
			expect(formatDisplayDate('1855-03-15')).toBe('15 Mar 1855');
		});

		it('GEDCOM qualifier ABT formats as "c. year"', () => {
			expect(formatDisplayDate('ABT 1878')).toBe('c. 1878');
		});
	});
});
