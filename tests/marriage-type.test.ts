import { describe, expect, it } from 'vitest';
import { MARRIAGE_TYPE_PRESETS, withMarriageType } from '../src/models/marriage-type';

/**
 * #628 — marriage type field. `withMarriageType` is the pure display helper
 * that the Dynamic Timeline marriage rows wrap their titles with: it appends
 * the union type as a parenthetical only when display is enabled and a type
 * is actually set, so callers can wrap unconditionally and rely on the
 * global `showMarriageType` setting gating the result.
 */

describe('withMarriageType', () => {
	it('appends the type as a parenthetical when shown and set', () => {
		expect(withMarriageType('Marriage to Jane Doe', 'Common-law marriage', true))
			.toBe('Marriage to Jane Doe (Common-law marriage)');
	});

	it('returns the label unchanged when display is disabled', () => {
		expect(withMarriageType('Marriage to Jane Doe', 'Common-law marriage', false))
			.toBe('Marriage to Jane Doe');
	});

	it('returns the label unchanged when no type is set', () => {
		expect(withMarriageType('Marriage to Jane Doe', undefined, true))
			.toBe('Marriage to Jane Doe');
	});

	it('treats an empty or whitespace-only type as no type', () => {
		expect(withMarriageType('Marriage to Jane Doe', '', true))
			.toBe('Marriage to Jane Doe');
		expect(withMarriageType('Marriage to Jane Doe', '   ', true))
			.toBe('Marriage to Jane Doe');
	});

	it('trims surrounding whitespace from a custom type', () => {
		expect(withMarriageType('Marriage of John to Jane', '  Handfasting  ', true))
			.toBe('Marriage of John to Jane (Handfasting)');
	});

	it('preserves a custom (non-preset) free-text value verbatim', () => {
		expect(withMarriageType('Marriage to Ada', 'Morganatic marriage', true))
			.toBe('Marriage to Ada (Morganatic marriage)');
	});
});

describe('MARRIAGE_TYPE_PRESETS', () => {
	it('exposes the locked preset list in order', () => {
		expect(MARRIAGE_TYPE_PRESETS).toEqual([
			'Common-law marriage',
			'Cohabitation',
			'Domestic (civil) partnership',
			'Putative marriage',
			'Concubinage',
		]);
	});

	it('has no duplicate presets', () => {
		expect(new Set(MARRIAGE_TYPE_PRESETS).size).toBe(MARRIAGE_TYPE_PRESETS.length);
	});
});
