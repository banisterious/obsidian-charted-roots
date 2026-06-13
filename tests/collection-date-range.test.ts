import { describe, expect, it } from 'vitest';
import { computeCollectionDateRange } from '../src/core/collection-date-range';

/**
 * #714 — the Statistics Dashboard date range must span the earliest to latest
 * known date counting BOTH birth and death years, not collapse to birth years
 * (which dropped death dates and could show "1900 — 1900").
 */
describe('computeCollectionDateRange (#714)', () => {
	it('spans both birth and death years across people', () => {
		// The reported case: born 1900/died 1990 and born 1800/died 1892.
		const range = computeCollectionDateRange([
			{ birthDate: '1900', deathDate: '1990' },
			{ birthDate: '1800', deathDate: '1892' }
		]);
		expect(range).toEqual({ earliest: 1800, latest: 1990, span: 190 });
	});

	it('includes the death year for a single person (no longer 1900 — 1900)', () => {
		const range = computeCollectionDateRange([{ birthDate: '1900', deathDate: '1990' }]);
		expect(range).toEqual({ earliest: 1900, latest: 1990, span: 90 });
	});

	it('uses the death year when only a death date is present', () => {
		const range = computeCollectionDateRange([{ deathDate: '1750' }]);
		expect(range).toEqual({ earliest: 1750, latest: 1750, span: 0 });
	});

	it('reads the leading year from full ISO dates', () => {
		const range = computeCollectionDateRange([
			{ birthDate: '1820-06-15', deathDate: '1895-03-02' }
		]);
		expect(range).toEqual({ earliest: 1820, latest: 1895, span: 75 });
	});

	it('returns an empty range when no datable years exist', () => {
		expect(computeCollectionDateRange([])).toEqual({});
		expect(computeCollectionDateRange([{}, { birthDate: '' }])).toEqual({});
	});

	it('ignores values without a leading 4-digit year', () => {
		// Fictional era dates and bare qualifiers have no leading 4-digit year.
		const range = computeCollectionDateRange([
			{ birthDate: '23 ABY' },
			{ birthDate: 'ABT 1850', deathDate: '1!@#' },
			{ birthDate: '1801' }
		]);
		expect(range).toEqual({ earliest: 1801, latest: 1801, span: 0 });
	});
});
