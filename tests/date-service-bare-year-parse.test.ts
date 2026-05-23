import { describe, expect, it } from 'vitest';
import { createDateService } from '../src/dates/services/date-service';

/**
 * #624 — `extractStandardYear`'s final fallback previously required a
 * 4-digit run (`\b(\d{4})\b`), so bare 1-3 digit year strings like "310"
 * or "99" parsed as `null`. Combined with the fictional parser's rejection
 * of bare digits (no era abbreviation), this left bare 1-3 digit years
 * with nowhere to land — propagating as asymmetric age failures whenever
 * such a value was paired with an era-prefixed date elsewhere on the
 * same person (e.g., `birth_date: 310`, `adoption_date: DE 1264`).
 *
 * The fix adds an additional fallback that accepts any whole-string
 * digit-only input (positive or negative) as a year. This suite fences
 * the new behavior and verifies that prior parses remain stable.
 */
function makeService() {
	return createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [],
	});
}

describe('DateService.parseDate — bare year strings (#624)', () => {
	const service = makeService();

	describe('bare 1-3 digit years are now parseable', () => {
		it('parses bare 3-digit string as standard year', () => {
			const parsed = service.parseDate('310');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(310);
		});

		it('parses bare 2-digit string as standard year', () => {
			const parsed = service.parseDate('99');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(99);
		});

		it('parses bare 1-digit string as standard year', () => {
			const parsed = service.parseDate('5');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(5);
		});

		it('parses bare zero as standard year 0', () => {
			const parsed = service.parseDate('0');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(0);
		});

		it('parses bare 5+ digit string as standard year', () => {
			const parsed = service.parseDate('12000');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(12000);
		});

		it('parses bare negative 1-3 digit string as standard year', () => {
			const parsed = service.parseDate('-5');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(-5);
		});

		it('trims surrounding whitespace before matching', () => {
			const parsed = service.parseDate('  310  ');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(310);
		});
	});

	describe('whole-string anchoring prevents substring matches', () => {
		it('does not parse "5 Jan" as year 5', () => {
			const parsed = service.parseDate('5 Jan');
			// The string has no whole-string digit match and no 4-digit
			// substring; should return null rather than year 5.
			expect(parsed).toBeNull();
		});

		it('does not parse "1900s" as year 1900', () => {
			const parsed = service.parseDate('1900s');
			expect(parsed).toBeNull();
		});

		it('does not parse "abc" as a year', () => {
			expect(service.parseDate('abc')).toBeNull();
		});

		it('does not parse an empty string', () => {
			expect(service.parseDate('')).toBeNull();
		});

		it('does not parse a whitespace-only string', () => {
			expect(service.parseDate('   ')).toBeNull();
		});
	});

	describe('existing parse paths remain stable', () => {
		it('still parses bare 4-digit year as standard', () => {
			const parsed = service.parseDate('1942');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(1942);
		});

		it('still parses 4-digit-substring inside other text', () => {
			const parsed = service.parseDate('March 12, 1942');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(1942);
		});

		it('still parses ISO date as standard', () => {
			const parsed = service.parseDate('1942-08-15');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(1942);
		});

		it('still parses year ranges (uses earlier year)', () => {
			const parsed = service.parseDate('1920-1930');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(1920);
		});

		it('still parses "before" dates', () => {
			const parsed = service.parseDate('bef 1850');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(1850);
		});

		it('still parses approximate dates', () => {
			const parsed = service.parseDate('circa 1850');
			expect(parsed?.type).toBe('standard');
			expect(parsed?.year).toBe(1850);
		});

		it('still parses era-prefixed fictional dates as fictional (not standard)', () => {
			const parsed = service.parseDate('BBY 82', 'Star Wars');
			expect(parsed?.type).toBe('fictional');
			expect(parsed?.year).toBe(-82); // canonical year
		});
	});
});
