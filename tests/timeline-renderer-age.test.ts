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

/**
 * #624 — Bare 1-3 digit birth date paired with era-prefixed event date
 * silently dropped the age annotation.
 *
 * @doctorwodka's custom Earthfall calendar (DE / EF / PEF, forward-direction)
 * surfaced this: a person stored as `birth_date: 310` (bare, 3-digit) with
 * adopted-child events stored as `adoption_date: DE 1264` (era-prefixed)
 * lost the age annotation on the adoption event only — marriage and
 * birth events at the same magnitudes rendered fine because both sides
 * of their math were bare 4-digit values.
 *
 * The fix relaxes `extractStandardYear` to accept any whole-string
 * digit input as a year, so the bare 3-digit birth now parses cleanly
 * and `calculateAge` can complete via the standard-date path.
 */
describe("TimelineRenderer.computeEventAge — bare birth + era-prefixed event (#624)", () => {
	let renderer: TimelineRenderer;

	beforeEach(() => {
		renderer = makeRenderer(true);
	});

	it('computes age across bare 3-digit birth + era-prefixed event (Star Wars ABY)', () => {
		expect(
			privates(renderer).computeEventAge('310', 'ABY 1264', 'star-wars')
		).toBe(954);
	});

	it('computes age across bare 3-digit birth + bare 4-digit event (no era)', () => {
		expect(
			privates(renderer).computeEventAge('310', '1264', undefined)
		).toBe(954);
	});

	it('computes age across bare 2-digit birth + bare 4-digit event', () => {
		expect(
			privates(renderer).computeEventAge('99', '1500', undefined)
		).toBe(1401);
	});

	it('computes age across era-prefixed birth + bare 4-digit event', () => {
		expect(
			privates(renderer).computeEventAge('ABY 310', '1264', 'star-wars')
		).toBe(954);
	});

	it('still computes age across era-prefixed birth + era-prefixed event (regression)', () => {
		expect(
			privates(renderer).computeEventAge('ABY 310', 'ABY 1264', 'star-wars')
		).toBe(954);
	});

	it('still returns undefined when event predates birth across bare years', () => {
		expect(
			privates(renderer).computeEventAge('1000', '500', undefined)
		).toBeUndefined();
	});
});

/**
 * #624 follow-up — inline approximation markers in fictional-era birth dates.
 *
 * The v0.22.50 #624 fix relaxed `extractStandardYear` to accept bare digit-only
 * strings, but @doctorwodka's actual frontmatter shape is `born: DE ~310`
 * (era + inline tilde + 3-digit year). The inline tilde breaks the fictional
 * parser's pattern matching, and the standard fallback's approximate regex
 * requires 4 digits, so the birth value parsed as null. Paired with an
 * era-prefixed adoption date like `DE 1264-08-15`, the timeline-renderer's
 * safety-net check fired (`looksLikeFictionalDate` returns true on the
 * adoption via un-anchored prefix match) and the age annotation dropped.
 *
 * The v0.22.51 fix extends `stripApproximationMarkers` to handle inline
 * markers between an era and a year, restoring the fictional-parse path
 * for these inputs.
 */
describe("TimelineRenderer.computeEventAge — inline approximation markers on fictional eras (#624 follow-up)", () => {
	// Configured to mirror @doctorwodka's Earthfall calendar.
	// (Constructed via createDateService with a custom system to ensure
	// the inline-marker fix exercises a non-built-in era abbreviation.)
	function makeRendererWithEarthfall(): TimelineRenderer {
		const dateService = createDateService({
			enableFictionalDates: true,
			showBuiltInDateSystems: false,
			fictionalDateSystems: [{
				id: 'earthfall',
				name: 'Earthfall',
				universe: 'doctorwodka-test',
				eras: [
					{ id: 'de', name: 'Post-Earthfall', abbrev: 'DE', epoch: 0, direction: 'forward' },
					{ id: 'ef', name: 'Earthfall', abbrev: 'EF', epoch: -100, direction: 'forward' },
					{ id: 'pef', name: 'Pre-Earthfall', abbrev: 'PEF', epoch: -6000, direction: 'forward' },
				],
			}],
		});
		const service = {
			getDateService: () => dateService,
			extractYear: (dateStr: string | number | undefined | null): string => {
				if (dateStr === undefined || dateStr === null || dateStr === '') return '';
				const value = typeof dateStr === 'string' ? dateStr : String(dateStr);
				const match = value.match(/\b(\d{4})\b/) ?? value.match(/(\d+)/);
				return match ? match[1] : '';
			},
		};
		return new TimelineRenderer(service as never);
	}

	it('computes age across "DE ~310" birth + "DE 1264-08-15" adoption (the reported scenario)', () => {
		const renderer = makeRendererWithEarthfall();
		const age = privates(renderer).computeEventAge('DE ~310', 'DE 1264-08-15', 'doctorwodka-test');
		expect(age).toBe(954);
	});

	it('computes age across "DE ~310" birth + plain "DE 1264" adoption', () => {
		const renderer = makeRendererWithEarthfall();
		const age = privates(renderer).computeEventAge('DE ~310', 'DE 1264', 'doctorwodka-test');
		expect(age).toBe(954);
	});

	it('computes age across "DE c. 310" birth + "DE 1264" adoption (inline c. variant)', () => {
		const renderer = makeRendererWithEarthfall();
		const age = privates(renderer).computeEventAge('DE c. 310', 'DE 1264', 'doctorwodka-test');
		expect(age).toBe(954);
	});

	it('computes age across "DE circa 310" birth + "DE 1264" adoption (inline circa variant)', () => {
		const renderer = makeRendererWithEarthfall();
		const age = privates(renderer).computeEventAge('DE circa 310', 'DE 1264', 'doctorwodka-test');
		expect(age).toBe(954);
	});

	it('still works when birth has no marker (regression: "DE 310" + "DE 1264" => 954)', () => {
		const renderer = makeRendererWithEarthfall();
		const age = privates(renderer).computeEventAge('DE 310', 'DE 1264', 'doctorwodka-test');
		expect(age).toBe(954);
	});
});
