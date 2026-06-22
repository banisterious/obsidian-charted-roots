import { describe, expect, it } from 'vitest';
import { GedcomParser } from '../src/gedcom/gedcom-parser';

/**
 * #716 — GEDCOM import silently dropped several widely-used date formats
 * (full month names, dotted/synonym qualifiers, DD/MM/YYYY slash dates, and
 * event-label-prefixed dates). These cover every row in the issue table plus
 * the classification used to surface ambiguous/non-standard inputs as import
 * warnings instead of dropping them silently.
 */
describe('GedcomParser.normalizeGedcomDate (#716)', () => {
	describe('formats that previously dropped to undefined', () => {
		it('parses a full month name with day', () => {
			expect(GedcomParser.normalizeGedcomDate('27 June 1885')).toBe('1885-06-27');
		});

		it('parses a full month name without day', () => {
			expect(GedcomParser.normalizeGedcomDate('October 1848')).toBe('1848-10');
		});

		it('parses a dotted "Abt." qualifier', () => {
			expect(GedcomParser.normalizeGedcomDate('Abt. 1809')).toBe('ABT 1809');
		});

		it('parses a dotted qualifier with a full-month date', () => {
			expect(GedcomParser.normalizeGedcomDate('Bef. 26 May 1776')).toBe('BEF 1776-05-26');
		});

		it('parses an unambiguous DD/MM/YYYY slash date', () => {
			expect(GedcomParser.normalizeGedcomDate('19/08/1990')).toBe('1990-08-19');
		});

		it('recovers a date behind an event label', () => {
			expect(GedcomParser.normalizeGedcomDate('Bapt 18 Dec 1690')).toBe('1690-12-18');
			expect(GedcomParser.normalizeGedcomDate('Buried 11 April 1758')).toBe('1758-04-11');
		});
	});

	describe('qualifier synonyms map to canonical tokens', () => {
		it('ABOUT and CIRCA fold to ABT', () => {
			expect(GedcomParser.normalizeGedcomDate('About 1820')).toBe('ABT 1820');
			expect(GedcomParser.normalizeGedcomDate('Circa 1820')).toBe('ABT 1820');
		});

		it('BEFORE/AFTER fold to BEF/AFT', () => {
			expect(GedcomParser.normalizeGedcomDate('Before 1900')).toBe('BEF 1900');
			expect(GedcomParser.normalizeGedcomDate('After 1900')).toBe('AFT 1900');
		});
	});

	describe('existing formats still work', () => {
		it('parses DD MMM YYYY', () => {
			expect(GedcomParser.normalizeGedcomDate('15 MAR 1950')).toBe('1950-03-15');
		});

		it('parses MMM YYYY', () => {
			expect(GedcomParser.normalizeGedcomDate('MAR 1950')).toBe('1950-03');
		});

		it('parses a bare year', () => {
			expect(GedcomParser.normalizeGedcomDate('1950')).toBe('1950');
		});

		it('passes a BET range through', () => {
			expect(GedcomParser.normalizeGedcomDate('Bet 1882 and 1885')).toBe('BET 1882 AND 1885');
		});

		it('preserves an existing ABT qualifier', () => {
			expect(GedcomParser.normalizeGedcomDate('ABT 1950')).toBe('ABT 1950');
		});
	});

	describe('slash-date disambiguation', () => {
		it('reads MM/DD when the second component must be the day', () => {
			expect(GedcomParser.normalizeGedcomDate('08/19/1990')).toBe('1990-08-19');
		});

		it('assumes DD/MM when both components are <= 12', () => {
			expect(GedcomParser.normalizeGedcomDate('05/06/1990')).toBe('1990-06-05');
		});

		it('rejects an impossible slash date', () => {
			expect(GedcomParser.normalizeGedcomDate('19/19/1990')).toBeUndefined();
		});
	});

	describe('hardened month handling', () => {
		it('returns undefined for an unrecognized month instead of defaulting to January', () => {
			expect(GedcomParser.normalizeGedcomDate('15 FOO 1950')).toBeUndefined();
		});
	});
});

describe('GedcomParser.normalizeGedcomDateDetailed classification (#716)', () => {
	it('classifies a clean parse as ok', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('27 June 1885');
		expect(r.value).toBe('1885-06-27');
		expect(r.status).toBe('ok');
	});

	it('classifies an empty input as ok with no value', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('');
		expect(r.value).toBeUndefined();
		expect(r.status).toBe('ok');
	});

	it('flags an event-label date and reports the stripped label', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('Bapt 18 Dec 1690');
		expect(r.value).toBe('1690-12-18');
		expect(r.status).toBe('event-label');
		expect(r.label).toBe('Bapt');
	});

	it('flags an ambiguous slash date', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('05/06/1990');
		expect(r.value).toBe('1990-06-05');
		expect(r.status).toBe('ambiguous-slash');
	});

	it('does not flag an unambiguous slash date', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('19/08/1990');
		expect(r.status).toBe('ok');
	});

	it('flags a non-empty unparseable date and preserves the original', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('sometime in the spring');
		expect(r.value).toBeUndefined();
		expect(r.status).toBe('unparsed');
		expect(r.original).toBe('sometime in the spring');
	});
});

describe('GedcomParser date interpretation overrides (#718)', () => {
	it('reads an ambiguous slash date as month/day when chosen', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('05/06/1990', { slashOrder: 'month-day' });
		expect(r.value).toBe('1990-05-06');
		// Still classified ambiguous so the preview keeps counting it.
		expect(r.status).toBe('ambiguous-slash');
	});

	it('keeps day/month for an ambiguous slash date by default', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('05/06/1990', { slashOrder: 'day-month' });
		expect(r.value).toBe('1990-06-05');
	});

	it('does not swap an unambiguous slash date even when month-day is chosen', () => {
		// 19 can only be the day, so the interpretation must not flip it.
		const r = GedcomParser.normalizeGedcomDateDetailed('19/08/1990', { slashOrder: 'month-day' });
		expect(r.value).toBe('1990-08-19');
		expect(r.status).toBe('ok');
	});

	it('blanks an event-label date when skip is chosen but keeps the classification', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('Bapt 18 Dec 1690', { eventLabel: 'skip' });
		expect(r.value).toBeUndefined();
		expect(r.status).toBe('event-label');
		expect(r.label).toBe('Bapt');
	});

	it('imports an event-label date when import is chosen', () => {
		const r = GedcomParser.normalizeGedcomDateDetailed('Buried 11 April 1758', { eventLabel: 'import' });
		expect(r.value).toBe('1758-04-11');
		expect(r.status).toBe('event-label');
	});

	it('leaves a clean date untouched regardless of interpretation', () => {
		expect(GedcomParser.normalizeGedcomDate('27 June 1885', { slashOrder: 'month-day', eventLabel: 'skip' }))
			.toBe('1885-06-27');
	});
});
