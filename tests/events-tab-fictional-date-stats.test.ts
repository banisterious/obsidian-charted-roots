import { describe, it, expect, beforeEach } from 'vitest';
import { TFile } from 'obsidian';
import { createDateService, DateService } from '../src/dates/services/date-service';
import { calculateDateStatistics } from '../src/dates/services/date-statistics';
import { TimelineMarkdownExporter } from '../src/events/services/timeline-markdown-exporter';
import type { EventNote } from '../src/events/types/event-types';
import { DEFAULT_NOTE_TYPE_DETECTION_SETTINGS } from '../src/utils/note-type-detection';
import type { FictionalDateSystem } from '../src/dates/types/date-types';

/**
 * #648 — Events tab Statistics card and Timeline Export undercounted fictional
 * dates because they used local date helpers stricter than the shared parser.
 *
 * Both counters now route through the DateService. These tests fence:
 *  1. The shapes the local helpers missed (approximation markers, ISO-style
 *     month/day suffixes) are recognized — including doctorwodka's Earthfall
 *     values DE 1222-03-06 / DE 1222-03 / DE ~1226 / PEF 260ish.
 *  2. A death-only fictional person (no born) is counted toward
 *     withFictionalDates — previously the died branch tallied the system but
 *     never the person.
 *  3. Timeline Export counts fictional-dated events as dated and derives a
 *     canonical year range, instead of reading "0 dated" for an all-fictional
 *     vault.
 */

// doctorwodka's Earthfall calendar: PEF counts backward from epoch, DE forward.
const EARTHFALL: FictionalDateSystem = {
	id: 'earthfall',
	name: 'Earthfall Calendar',
	universe: 'Earthfall',
	eras: [
		{ id: 'pef', name: 'Pre-Earthfall', abbrev: 'PEF', epoch: -6000, direction: 'backward' },
		{ id: 'de', name: 'Diaspora Era', abbrev: 'DE', epoch: 0, direction: 'forward' },
	],
};

function makeDateService(): DateService {
	return createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: false,
		fictionalDateSystems: [EARTHFALL],
	});
}

interface MockNote {
	path: string;
	frontmatter: Record<string, unknown>;
}

function makePlugin(notes: MockNote[], dateService: DateService | null) {
	const files = notes.map(
		n => new TFile({ path: n.path, basename: n.path.replace(/\.md$/, ''), extension: 'md' })
	);
	const cacheByPath = new Map(
		notes.map(n => [n.path, { frontmatter: n.frontmatter }])
	);
	return {
		app: {
			vault: { getMarkdownFiles: () => files },
			metadataCache: {
				getFileCache: (file: TFile) => cacheByPath.get(file.path) ?? null,
			},
		},
		settings: {
			noteTypeDetection: DEFAULT_NOTE_TYPE_DETECTION_SETTINGS,
			propertyAliases: {},
			showBuiltInDateSystems: false,
			fictionalDateSystems: [EARTHFALL],
		},
		getDateService: () => dateService,
	} as never;
}

describe('calculateDateStatistics — fictional date counting (#648)', () => {
	let dateService: DateService;

	beforeEach(() => {
		dateService = makeDateService();
	});

	it('parses every Earthfall shape the local heuristic missed', () => {
		for (const value of ['DE 1222-03-06', 'DE 1222-03', 'DE ~1226', 'PEF 260ish']) {
			expect(dateService.parseDate(value)?.type).toBe('fictional');
		}
	});

	it('counts approximation-marker and ISO-suffix birth dates', () => {
		const plugin = makePlugin(
			[
				{ path: 'a.md', frontmatter: { cr_type: 'person', born: 'DE ~310' } },
				{ path: 'b.md', frontmatter: { cr_type: 'person', born: 'DE 1264-08' } },
				{ path: 'c.md', frontmatter: { cr_type: 'person', born: 'DE 1222-03-06' } },
			],
			dateService
		);

		const stats = calculateDateStatistics(plugin);

		expect(stats.totalPersons).toBe(3);
		expect(stats.withFictionalDates).toBe(3);
	});

	it('counts a death-only fictional person (PEF 260ish, no born)', () => {
		const plugin = makePlugin(
			[{ path: 'a.md', frontmatter: { cr_type: 'person', died: 'PEF 260ish' } }],
			dateService
		);

		const stats = calculateDateStatistics(plugin);

		expect(stats.withDeathDates).toBe(1);
		expect(stats.withFictionalDates).toBe(1);
		expect(stats.systemsInUse).toEqual([{ name: 'Earthfall Calendar', count: 1 }]);
	});

	it('counts a person once when both born and died are fictional', () => {
		const plugin = makePlugin(
			[{ path: 'a.md', frontmatter: { cr_type: 'person', born: 'DE 1200', died: 'DE 1280' } }],
			dateService
		);

		const stats = calculateDateStatistics(plugin);

		expect(stats.withFictionalDates).toBe(1);
		expect(stats.systemsInUse).toEqual([{ name: 'Earthfall Calendar', count: 1 }]);
	});

	it('counts fictional event-note dates alongside persons (#644 path)', () => {
		const plugin = makePlugin(
			[
				{ path: 'p.md', frontmatter: { cr_type: 'person', born: 'DE 1200' } },
				{ path: 'e.md', frontmatter: { cr_type: 'event', date: 'DE 1264-08-15' } },
			],
			dateService
		);

		const stats = calculateDateStatistics(plugin);

		expect(stats.withFictionalDates).toBe(2);
	});

	it('counts nothing fictional when fictional dates are disabled', () => {
		const plugin = makePlugin(
			[{ path: 'a.md', frontmatter: { cr_type: 'person', born: 'DE 1222-03-06' } }],
			null
		);

		const stats = calculateDateStatistics(plugin);

		expect(stats.totalPersons).toBe(1);
		expect(stats.withFictionalDates).toBe(0);
	});
});

describe('TimelineMarkdownExporter — fictional date detection (#648)', () => {
	function makeEvent(date: string): EventNote {
		return { date } as EventNote;
	}

	function makeExporter(dateService: DateService | null): TimelineMarkdownExporter {
		return new TimelineMarkdownExporter({} as never, {} as never, dateService);
	}

	it('reports fictional-dated events as dated, not "0 dated"', () => {
		const exporter = makeExporter(makeDateService());

		const summary = exporter.getExportSummary([
			makeEvent('DE 1222-03-06'),
			makeEvent('DE ~1226'),
			makeEvent('PEF 260ish'),
		]);

		expect(summary.totalEvents).toBe(3);
		expect(summary.datedEvents).toBe(3);
		expect(summary.undatedEvents).toBe(0);
	});

	it('derives a canonical year range across eras', () => {
		const exporter = makeExporter(makeDateService());

		// PEF counts backward from epoch -6000, so PEF 260 sits far before DE 1222.
		const range = exporter.getDateRange([
			makeEvent('DE 1222'),
			makeEvent('PEF 260'),
		]);

		expect(range.earliest).not.toBeNull();
		expect(range.latest).not.toBeNull();
		expect(range.earliest!).toBeLessThan(range.latest!);
		expect(range.latest).toBe(1222);
	});

	it('falls back to leading-4-digit parsing when fictional dates are disabled', () => {
		const exporter = makeExporter(null);

		const summary = exporter.getExportSummary([
			makeEvent('1850-03-15'),
			makeEvent('DE 1222'),
		]);

		// Only the standard date is recognized without a date service.
		expect(summary.datedEvents).toBe(1);
		expect(summary.undatedEvents).toBe(1);
	});
});
