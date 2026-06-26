import { describe, expect, it } from 'vitest';
import { parseYearFilterValue } from '../src/maps/types/map-types';

/**
 * #765 — the Map view "From year" / "To year" filters were number-only, so a
 * fictional era ("10 ABY", "896 BBY") couldn't be entered, and the bare number
 * was compared against the signed canonical years the events resolve to —
 * filtering every fictional event off the map. parseYearFilterValue resolves
 * the (now text) input to the same canonical year the events use, via the
 * DateService, with an integer fallback for plain real-world years.
 */
describe('parseYearFilterValue (#765)', () => {
	// Stand-in for DateService.parseDate(...).year: BBY negative, ABY positive,
	// a plain 4-digit year as itself; anything else unparseable.
	const parseToYear = (value: string): number | null => {
		const era = value.match(/^(\d+)\s*(BBY|ABY)$/i);
		if (era) {
			const n = parseInt(era[1], 10);
			return era[2].toUpperCase() === 'BBY' ? -n : n;
		}
		const plain = value.match(/^\d{4}$/);
		return plain ? parseInt(value, 10) : null;
	};

	it('resolves a fictional ABY era to a positive canonical year', () => {
		expect(parseYearFilterValue('10 ABY', parseToYear)).toBe(10);
	});

	it('resolves a fictional BBY era to a negative canonical year', () => {
		expect(parseYearFilterValue('896 BBY', parseToYear)).toBe(-896);
	});

	it('passes a real-world year through unchanged', () => {
		expect(parseYearFilterValue('1850', parseToYear)).toBe(1850);
	});

	it('trims surrounding whitespace before parsing', () => {
		expect(parseYearFilterValue('  39 ABY  ', parseToYear)).toBe(39);
	});

	it('returns undefined for blank input (clears the bound)', () => {
		expect(parseYearFilterValue('', parseToYear)).toBeUndefined();
		expect(parseYearFilterValue('   ', parseToYear)).toBeUndefined();
	});

	it('falls back to an integer parse when the date parser cannot resolve it', () => {
		// e.g. a bare "10" the DateService cannot place in an era, or no
		// DateService at all (parseToYear always returns null here).
		const noParse = (): number | null => null;
		expect(parseYearFilterValue('10', noParse)).toBe(10);
		expect(parseYearFilterValue('-5', noParse)).toBe(-5);
	});

	it('returns undefined when the input is neither a date nor a number', () => {
		const noParse = (): number | null => null;
		expect(parseYearFilterValue('abc', noParse)).toBeUndefined();
	});
});
