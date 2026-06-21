import { describe, expect, it } from 'vitest';
import { unwrapWikilinkDisplay, normalizeLabelValue } from '../src/utils/wikilink-resolver';

/**
 * Coverage for `unwrapWikilinkDisplay`, the helper used by the Family
 * Chart card text fields and info panel to surface a clean display name
 * when the underlying value is a wikilink, while leaving free-form text
 * (including legitimate `/` and `|` characters) untouched (#622).
 *
 * Where `extractDisplayLabel` assumes its input is wikilink-shaped and
 * collapses path/pipe segments unconditionally, this variant guards on
 * the bracket pair so plain text like `"Cook/Server"` passes through.
 */
describe('unwrapWikilinkDisplay', () => {
	describe('nullish and empty', () => {
		it('returns empty string for null', () => {
			expect(unwrapWikilinkDisplay(null)).toBe('');
		});

		it('returns empty string for undefined', () => {
			expect(unwrapWikilinkDisplay(undefined)).toBe('');
		});

		it('returns empty string for empty input', () => {
			expect(unwrapWikilinkDisplay('')).toBe('');
		});

		it('returns empty string for whitespace-only input', () => {
			expect(unwrapWikilinkDisplay('   ')).toBe('');
		});
	});

	describe('bracketed wikilinks (delegates to extractDisplayLabel)', () => {
		it('strips brackets from a bare bracketed wikilink', () => {
			expect(unwrapWikilinkDisplay('[[Catholic]]')).toBe('Catholic');
		});

		it('extracts alias from a piped wikilink', () => {
			expect(unwrapWikilinkDisplay('[[catholic-faith|Catholic]]')).toBe('Catholic');
		});

		it('extracts basename from a path-form wikilink', () => {
			expect(unwrapWikilinkDisplay('[[Religions/Catholic|Catholic]]')).toBe('Catholic');
		});

		it('strips path even without alias (path-only wikilink)', () => {
			expect(unwrapWikilinkDisplay('[[Religions/Catholic]]')).toBe('Catholic');
		});

		it('trims whitespace around bracketed input', () => {
			expect(unwrapWikilinkDisplay('  [[Catholic]]  ')).toBe('Catholic');
		});
	});

	describe('plain text passes through (the #622 regression-prevention guarantee)', () => {
		it('preserves a single-word plain string', () => {
			expect(unwrapWikilinkDisplay('Catholic')).toBe('Catholic');
		});

		it('preserves plain text containing forward slash (occupation pattern)', () => {
			expect(unwrapWikilinkDisplay('Cook/Server')).toBe('Cook/Server');
		});

		it('preserves plain text containing pipe', () => {
			expect(unwrapWikilinkDisplay('Carpenter|Painter')).toBe('Carpenter|Painter');
		});

		it('preserves plain text with whitespace around slash', () => {
			expect(unwrapWikilinkDisplay('Carpenter / Painter')).toBe('Carpenter / Painter');
		});

		it('preserves plain text with multiple slashes', () => {
			expect(unwrapWikilinkDisplay('Cook/Server/Bartender')).toBe('Cook/Server/Bartender');
		});

		it('preserves a place-style comma-and-slash address', () => {
			expect(unwrapWikilinkDisplay('Brooklyn, NY/USA')).toBe('Brooklyn, NY/USA');
		});

		it('trims surrounding whitespace on plain input', () => {
			expect(unwrapWikilinkDisplay('  Catholic  ')).toBe('Catholic');
		});
	});

	describe('partially-bracketed input is treated as plain text', () => {
		it('leaves input alone when only the opening brackets are present', () => {
			expect(unwrapWikilinkDisplay('[[Catholic')).toBe('[[Catholic');
		});

		it('leaves input alone when only the closing brackets are present', () => {
			expect(unwrapWikilinkDisplay('Catholic]]')).toBe('Catholic]]');
		});

		it('leaves input alone when brackets surround other content', () => {
			expect(unwrapWikilinkDisplay('See [[Catholic]] above')).toBe('See [[Catholic]] above');
		});
	});

	describe('idempotency', () => {
		it.each([
			'Catholic',
			'[[Catholic]]',
			'[[catholic-faith|Catholic]]',
			'[[Religions/Catholic|Catholic]]',
			'Cook/Server',
			'Brooklyn, NY/USA',
			'',
		])('feeding output back yields same result: %s', (input) => {
			const first = unwrapWikilinkDisplay(input);
			const second = unwrapWikilinkDisplay(first);
			expect(second).toBe(first);
		});
	});
});

/**
 * `normalizeLabelValue` cleans free-form label fields (collection, universe)
 * that may contain one or more wikilinks, so aggregation surfaces stop treating
 * `[[Harra]]`, `Harra`, and `[[Harra|Harra]]` as different values (#755).
 */
describe('normalizeLabelValue', () => {
	it('returns empty string for nullish/empty input', () => {
		expect(normalizeLabelValue(null)).toBe('');
		expect(normalizeLabelValue(undefined)).toBe('');
		expect(normalizeLabelValue('')).toBe('');
	});

	it('strips brackets from a bare wikilink', () => {
		expect(normalizeLabelValue('[[Harra]]')).toBe('Harra');
	});

	it('takes the display/alias from a piped wikilink', () => {
		expect(normalizeLabelValue('[[Lands of the Undying|Lands of the Undying]]')).toBe('Lands of the Undying');
		expect(normalizeLabelValue('[[note-id|Imperial line]]')).toBe('Imperial line');
	});

	it('normalizes every wikilink in a comma-joined value', () => {
		expect(normalizeLabelValue('[[Angarath]],[[Clan of the Wood]]')).toBe('Angarath,Clan of the Wood');
	});

	it('leaves plain text untouched (including slashes and bare pipes)', () => {
		expect(normalizeLabelValue('Harra')).toBe('Harra');
		expect(normalizeLabelValue('Cook/Server')).toBe('Cook/Server');
		expect(normalizeLabelValue('Smith, Jones Family')).toBe('Smith, Jones Family');
	});

	it('collapses all forms of one collection to the same value', () => {
		const forms = ['[[Imperial line]]', 'Imperial line', '[[Imperial line|Imperial line]]'];
		const normalized = forms.map(normalizeLabelValue);
		expect(new Set(normalized).size).toBe(1);
		expect(normalized[0]).toBe('Imperial line');
	});
});
