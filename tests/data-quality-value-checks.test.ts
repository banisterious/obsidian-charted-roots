import { describe, expect, it } from 'vitest';
import { isMalformedWikilink, normalizePersonNameCasing } from '../src/ui/data-quality-value-checks';

/**
 * #715 — Data Quality ops must not treat a balanced parenthetical disambiguator
 * (e.g. "Jon Smith (son of Robert)") as a malformed link or as name words to
 * re-case.
 */
describe('isMalformedWikilink (#715)', () => {
	it('flags a stray closing paren with no opening paren', () => {
		expect(isMalformedWikilink('[[unknown) ]]')).toBe(true);
		expect(isMalformedWikilink('[[unknown)]]')).toBe(true);
	});

	it('does NOT flag a balanced parenthetical disambiguator', () => {
		expect(isMalformedWikilink('[[Jon Smith (son of Robert)]]')).toBe(false);
		expect(isMalformedWikilink('[[Jon Smith (son of William Sr)]]')).toBe(false);
		expect(isMalformedWikilink('[[Mary (Jr)]]')).toBe(false);
	});

	it('does NOT flag an ordinary wikilink', () => {
		expect(isMalformedWikilink('[[Jon Smith]]')).toBe(false);
	});
});

describe('normalizePersonNameCasing (#715)', () => {
	it('leaves a parenthetical disambiguator verbatim (no suggestion when the rest is already cased)', () => {
		expect(normalizePersonNameCasing('Jon Smith (son of Robert)')).toBeNull();
		expect(normalizePersonNameCasing('Jon Smith (son of William Sr)')).toBeNull();
	});

	it('normalizes the name outside the parenthetical but leaves the annotation as written', () => {
		expect(normalizePersonNameCasing('jon smith (son of robert)')).toBe('Jon Smith (son of robert)');
		expect(normalizePersonNameCasing('JON SMITH (SON OF ROBERT)')).toBe('Jon Smith (SON OF ROBERT)');
	});

	it('treats the first real word as the first word even when a leading parenthetical precedes it', () => {
		expect(normalizePersonNameCasing('(the elder) von trapp')).toBe('(the elder) Von Trapp');
	});

	it('still title-cases ordinary names', () => {
		expect(normalizePersonNameCasing('jon smith')).toBe('Jon Smith');
		expect(normalizePersonNameCasing('JON SMITH')).toBe('Jon Smith');
	});

	it('preserves the existing special-case handling', () => {
		expect(normalizePersonNameCasing('mcdonald')).toBe('McDonald');
		expect(normalizePersonNameCasing("o'brien")).toBe("O'Brien");
		expect(normalizePersonNameCasing('henry iii')).toBe('Henry III');
		expect(normalizePersonNameCasing('mary-jane watson')).toBe('Mary-Jane Watson');
		expect(normalizePersonNameCasing('ludwig van der berg')).toBe('Ludwig van der Berg');
	});

	it('returns null for empty or non-string input', () => {
		expect(normalizePersonNameCasing('')).toBeNull();
		expect(normalizePersonNameCasing('   ')).toBeNull();
		expect(normalizePersonNameCasing(undefined as unknown as string)).toBeNull();
	});
});
