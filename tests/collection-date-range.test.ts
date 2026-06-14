import { describe, expect, it } from 'vitest';
import { computeCollectionDateRange, formatDateRangeLine } from '../src/core/collection-date-range';

/**
 * #714 — the Statistics Dashboard date range must span the earliest to latest
 * known date counting BOTH birth and death years, not collapse to birth years.
 * #719 — resolution is now era-aware (via an injected resolver) and grouped per
 * universe, so fictional BBY/ABY dates don't pool into the real-world span.
 */

/**
 * Test resolver: real-world (no universe) reads a leading 4-digit year; the
 * "starwars" universe maps BBY to a large negative canonical year and ABY to a
 * positive one — mirroring how DateService.getCanonicalYear behaves.
 */
const resolveYear = (dateStr: string, universe: string | undefined): number | null => {
	if (universe === 'starwars') {
		const bby = dateStr.match(/^(\d+)\s*BBY$/i);
		if (bby) return -parseInt(bby[1], 10);
		const aby = dateStr.match(/^(\d+)\s*ABY$/i);
		if (aby) return parseInt(aby[1], 10);
		return null;
	}
	const m = dateStr.match(/^(\d{4})/);
	return m ? parseInt(m[1], 10) : null;
};

describe('computeCollectionDateRange (#714/#719)', () => {
	it('spans both birth and death years across real-world people', () => {
		const { ranges } = computeCollectionDateRange([
			{ birthDate: '1900', deathDate: '1990' },
			{ birthDate: '1800', deathDate: '1892' }
		], resolveYear);
		expect(ranges).toEqual([{ universe: undefined, earliest: 1800, latest: 1990, span: 190 }]);
	});

	it('includes the death year for a single person (no longer 1900 — 1900)', () => {
		const { ranges } = computeCollectionDateRange([{ birthDate: '1900', deathDate: '1990' }], resolveYear);
		expect(ranges).toEqual([{ universe: undefined, earliest: 1900, latest: 1990, span: 90 }]);
	});

	it('resolves fictional BBY to a negative canonical year instead of a large positive one (#719)', () => {
		// 8082 BBY must sort BEFORE 23 ABY, not as the year 8082.
		const { ranges } = computeCollectionDateRange([
			{ birthDate: '8082 BBY', universe: 'starwars' },
			{ deathDate: '23 ABY', universe: 'starwars' }
		], resolveYear);
		expect(ranges).toEqual([{ universe: 'starwars', earliest: -8082, latest: 23, span: 8105 }]);
	});

	it('groups per universe so real-world and fictional spans are not conflated (#719)', () => {
		const { ranges } = computeCollectionDateRange([
			{ birthDate: '1850', deathDate: '1990' },
			{ birthDate: '8082 BBY', deathDate: '23 ABY', universe: 'starwars' }
		], resolveYear);
		// Real-world first, then universes alphabetically.
		expect(ranges).toEqual([
			{ universe: undefined, earliest: 1850, latest: 1990, span: 140 },
			{ universe: 'starwars', earliest: -8082, latest: 23, span: 8105 }
		]);
	});

	it('returns no ranges when no datable years exist', () => {
		expect(computeCollectionDateRange([], resolveYear).ranges).toEqual([]);
		expect(computeCollectionDateRange([{}, { birthDate: '' }], resolveYear).ranges).toEqual([]);
	});

	it('drops dates the resolver cannot parse', () => {
		const { ranges } = computeCollectionDateRange([
			{ birthDate: 'ABT 1850', deathDate: '1!@#' },
			{ birthDate: '1801' }
		], resolveYear);
		expect(ranges).toEqual([{ universe: undefined, earliest: 1801, latest: 1801, span: 0 }]);
	});
});

describe('formatDateRangeLine (#719)', () => {
	it('renders a bare span when the universe is hidden', () => {
		expect(formatDateRangeLine({ earliest: '1850', latest: '1990', spanYears: 140 }, false))
			.toBe('1850 — 1990 (140 years)');
	});

	it('prefixes the universe name (or Real-world) when shown', () => {
		expect(formatDateRangeLine({ universe: 'Star Wars', earliest: '8082 BBY', latest: '23 ABY', spanYears: 8105 }, true))
			.toBe('Star Wars: 8082 BBY — 23 ABY (8105 years)');
		expect(formatDateRangeLine({ earliest: '1850', latest: '1990', spanYears: 140 }, true))
			.toBe('Real-world: 1850 — 1990 (140 years)');
	});

	it('omits the span suffix for a single-point range', () => {
		expect(formatDateRangeLine({ earliest: '1850', latest: '1850', spanYears: 0 }, false))
			.toBe('1850 — 1850');
	});
});
