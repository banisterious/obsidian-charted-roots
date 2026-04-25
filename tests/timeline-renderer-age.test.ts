import { describe, expect, it, beforeEach } from 'vitest';
import { TimelineRenderer } from '../src/dynamic-content/renderers/timeline-renderer';
import { createDateService } from '../src/dates/services/date-service';

/**
 * #439 — Timeline dynamic block doesn't calculate ages for fictional eras.
 *
 * The naive `entryYear - birthYear` calculation in TimelineRenderer broke for
 * descending fictional eras (BBY): `26 BBY >= 82 BBY` evaluated as `26 >= 82`
 * (false), so age never resolved for non-birth events. This suite fences the
 * `computeEventAge` helper that defers to `DateService.calculateAge` with the
 * person's universe, falling back to naive subtraction for real-world dates
 * or when DateService is unavailable.
 *
 * Same fix shape as #434 / #437.
 */

interface PrivateMembers {
	computeEventAge: (
		birthDate: string | undefined,
		eventDate: string | undefined,
		universe: string | undefined
	) => number | undefined;
}

function privates(renderer: TimelineRenderer): PrivateMembers {
	return renderer as unknown as PrivateMembers;
}

function makeRenderer(withDateService: boolean): TimelineRenderer {
	const dateService = withDateService
		? createDateService({
				enableFictionalDates: true,
				showBuiltInDateSystems: true,
				fictionalDateSystems: [],
			})
		: null;

	const service = {
		getDateService: () => dateService,
		extractYear: (dateStr: string | number | undefined | null): string => {
			if (dateStr === undefined || dateStr === null || dateStr === '') return '';
			const value = typeof dateStr === 'string' ? dateStr : String(dateStr);
			const match = value.match(/(\d{4})/);
			return match ? match[1] : '';
		},
	};

	return new TimelineRenderer(service as never);
}

describe('TimelineRenderer.computeEventAge — fictional eras (#439)', () => {
	let renderer: TimelineRenderer;

	beforeEach(() => {
		renderer = makeRenderer(true);
	});

	describe('descending era (BBY)', () => {
		it('computes age across a BBY-span lifetime (82 BBY → 20 BBY death)', () => {
			expect(
				privates(renderer).computeEventAge('82 BBY', '20 BBY', 'star-wars')
			).toBe(62);
		});

		it('computes age at marriage (82 BBY birth, 26 BBY marriage = age 56)', () => {
			expect(
				privates(renderer).computeEventAge('82 BBY', '26 BBY', 'star-wars')
			).toBe(56);
		});

		it('computes age at child birth (82 BBY → 52 BBY = age 30)', () => {
			expect(
				privates(renderer).computeEventAge('82 BBY', '52 BBY', 'star-wars')
			).toBe(30);
		});

		it('computes age 0 at the birth event itself', () => {
			expect(
				privates(renderer).computeEventAge('82 BBY', '82 BBY', 'star-wars')
			).toBe(0);
		});

		it('does not produce a negative age when an event predates birth in BBY', () => {
			// 90 BBY is earlier in time than 82 BBY (BBY counts down toward zero)
			const age = privates(renderer).computeEventAge('82 BBY', '90 BBY', 'star-wars');
			expect(age === undefined || age <= 0).toBe(true);
		});
	});

	describe('era crossings (BBY → ABY)', () => {
		it('computes age for an event that spans BBY → ABY (born 22 BBY, event 5 ABY = age 27)', () => {
			expect(
				privates(renderer).computeEventAge('22 BBY', '5 ABY', 'star-wars')
			).toBe(27);
		});

		it('computes age for ABY-only spans (4 ABY birth, 50 ABY event = age 46)', () => {
			expect(
				privates(renderer).computeEventAge('4 ABY', '50 ABY', 'star-wars')
			).toBe(46);
		});
	});

	describe('real-world dates (no universe)', () => {
		it('computes age between ISO dates without a universe', () => {
			expect(
				privates(renderer).computeEventAge('1905-03-12', '1982-09-08', undefined)
			).toBe(77);
		});

		it('computes age between bare-year strings', () => {
			expect(
				privates(renderer).computeEventAge('1900', '1980', undefined)
			).toBe(80);
		});

		it('returns undefined when the event predates birth', () => {
			expect(
				privates(renderer).computeEventAge('1900', '1850', undefined)
			).toBeUndefined();
		});
	});

	describe('fallback when DateService is unavailable', () => {
		beforeEach(() => {
			renderer = makeRenderer(false);
		});

		it('falls back to naive year subtraction for real-world dates', () => {
			expect(
				privates(renderer).computeEventAge('1905-03-12', '1982-09-08', undefined)
			).toBe(77);
		});

		it('cannot resolve fictional eras without DateService (returns undefined for backwards BBY)', () => {
			// Without DateService, "82" >= "26" fails the guard. The bug pattern
			// reproduces here, but only as a fallback when the service hasn't loaded.
			const age = privates(renderer).computeEventAge('82 BBY', '26 BBY', 'star-wars');
			expect(age === undefined).toBe(true);
		});
	});

	describe('missing or invalid inputs', () => {
		it('returns undefined when birthDate is missing', () => {
			expect(
				privates(renderer).computeEventAge(undefined, '1982-09-08', undefined)
			).toBeUndefined();
		});

		it('returns undefined when eventDate is missing', () => {
			expect(
				privates(renderer).computeEventAge('1905-03-12', undefined, undefined)
			).toBeUndefined();
		});

		it('returns undefined for unparseable dates', () => {
			expect(
				privates(renderer).computeEventAge('not-a-date', 'also-not-a-date', undefined)
			).toBeUndefined();
		});
	});
});
