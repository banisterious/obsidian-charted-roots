import { describe, expect, it } from 'vitest';
import { DynamicContentService } from '../src/dynamic-content/services/dynamic-content-service';
import { createDateService } from '../src/dates/services/date-service';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #563 — Dynamic Timeline + Relationship blocks rendered birth/death years
 * via `extractYear`, which only recognizes BCE/BC + AD/CE suffixes and
 * silently strips every other era prefix. For inputs like `BBY 1045` or
 * `EF 30`, the era abbreviation disappeared and only the year digits
 * rendered.
 *
 * The fix introduces `formatYearForDisplay` — fictional-aware display
 * that preserves the era prefix, while leaving `extractYear` untouched
 * for the sort + margin-filter call sites that depend on digit-only
 * output.
 */

const FANTASY_SYSTEM: FictionalDateSystem = {
	id: 'fantasy',
	name: 'Fantasy with BBY/ABY-style eras',
	eras: [
		{ id: 'before-battle-of-yavin', name: 'Before Battle of Yavin', abbrev: 'BBY', epoch: 0, direction: 'backward' },
		{ id: 'after-battle-of-yavin', name: 'After Battle of Yavin', abbrev: 'ABY', epoch: 0, direction: 'forward' },
		{ id: 'era-of-forging', name: 'Era of Forging', abbrev: 'EF', epoch: -100, direction: 'forward' },
		{ id: 'dawn-era', name: 'Dawn Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

function makeService(): DynamicContentService {
	const dateService = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: false,
		fictionalDateSystems: [FANTASY_SYSTEM],
	});
	const plugin = {
		getDateService: () => dateService,
		app: {} as never,
		settings: {} as never,
	} as never;
	return new DynamicContentService(plugin);
}

describe('formatYearForDisplay — fictional-era preservation (#563)', () => {
	const service = makeService();

	it('returns "BBY 1045" for a BBY-prefixed fictional date', () => {
		expect(service.formatYearForDisplay('BBY 1045')).toBe('BBY 1045');
	});

	it('returns "ABY 25" for an ABY-prefixed fictional date', () => {
		expect(service.formatYearForDisplay('ABY 25')).toBe('ABY 25');
	});

	it('returns "EF 30" for a custom-era fictional date', () => {
		expect(service.formatYearForDisplay('EF 30')).toBe('EF 30');
	});

	it('returns "DE 1265" for a different custom era', () => {
		expect(service.formatYearForDisplay('DE 1265')).toBe('DE 1265');
	});

	it('falls back to digit-only output for standard ISO dates', () => {
		expect(service.formatYearForDisplay('1850-03-15')).toBe('1850');
		expect(service.formatYearForDisplay('1880')).toBe('1880');
	});

	it('falls back to digit-only output for BCE-suffix dates (handled by extractYear)', () => {
		// BCE-suffix dates are handled by extractYear's existing path —
		// formatYearForDisplay only branches on fictional-parser success.
		expect(service.formatYearForDisplay('500 BCE')).toBe('-500');
	});

	it('returns empty string for undefined / null / empty input', () => {
		expect(service.formatYearForDisplay(undefined)).toBe('');
		expect(service.formatYearForDisplay(null)).toBe('');
		expect(service.formatYearForDisplay('')).toBe('');
	});

	it('coerces numeric input to string (matches extractYear behavior)', () => {
		expect(service.formatYearForDisplay(1893)).toBe('1893');
	});

	it('preserves era prefix for year-first input (re-canonicalized via formatDate)', () => {
		// "1045 BBY" parses fictional with era=BBY, year=1045. DateService
		// re-formats to canonical "BBY 1045" via the parser's `format` method.
		expect(service.formatYearForDisplay('1045 BBY')).toBe('BBY 1045');
	});

	it('handles approximate fictional dates (post-#562 strip)', () => {
		// "EF 30ish" → strips to "EF 30", parses fictional, formats as "EF 30".
		// Approximation flag is internal to the parsed result; display drops it.
		expect(service.formatYearForDisplay('EF 30ish')).toBe('EF 30');
	});
});

describe('extractYear is unchanged by the #563 fix', () => {
	const service = makeService();

	it('still returns digit-only output for math callers', () => {
		// Sort and margin-filter call sites parseInt this output, so the
		// digit-only shape must be preserved.
		expect(service.extractYear('BBY 1045')).toBe('1045');
		expect(service.extractYear('EF 30')).toBe('30');
		expect(service.extractYear('1850-03-15')).toBe('1850');
		expect(service.extractYear('500 BCE')).toBe('-500');
	});
});

/**
 * Regression fence for the v0.22.31 follow-up surfaced by @doctorwodka:
 * the Dynamic Timeline block has THREE rendering paths — `renderFormattedEntry`
 * (the `{year}` template-substitution path), the sectioned `renderWithTemplate`
 * default block, and the flat-list `renderTimelineList` path. The first two
 * were wired through `formatYearForDisplay` in v0.22.31, but the third was
 * missed and continued to render `entry.year` (`extractYear` output, era-
 * stripped). The flow that produces an era-aware year in the flat-list path
 * is: `entry.date = formatDate(birthDate)` (DynamicContentService.formatDate
 * leaves fictional-prefixed input as-is), then `formatYearForDisplay(entry.date)`.
 * This composition test guards against both ends of that chain regressing.
 */
describe('formatYearForDisplay accepts formatDate output (timeline flat-list path)', () => {
	const service = makeService();

	it('preserves the era prefix through formatDate -> formatYearForDisplay for year-only fictional input', () => {
		// The timeline-renderer builds entries via formatDate(birthDate), then
		// renders via formatYearForDisplay(entry.date). For year-only fictional
		// input, formatDate is a passthrough (no ISO regex match) and
		// formatYearForDisplay produces the canonical era display.
		const intermediate = service.formatDate('BBY 1045');
		expect(intermediate).toBe('BBY 1045');
		expect(service.formatYearForDisplay(intermediate)).toBe('BBY 1045');
	});

	it('preserves the era prefix for custom-era inputs through the same chain', () => {
		const intermediate = service.formatDate('EF 30');
		expect(intermediate).toBe('EF 30');
		expect(service.formatYearForDisplay(intermediate)).toBe('EF 30');
	});

	it('still falls through to extractYear for standard ISO dates after formatDate', () => {
		// "1850-03-15" → formatDate produces "15 Mar 1850" → formatYearForDisplay
		// can't parse that as fictional → falls back to extractYear → "1850".
		const intermediate = service.formatDate('1850-03-15');
		expect(intermediate).toBe('15 Mar 1850');
		expect(service.formatYearForDisplay(intermediate)).toBe('1850');
	});
});
