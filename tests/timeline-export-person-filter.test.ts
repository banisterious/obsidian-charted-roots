import { describe, it, expect } from 'vitest';
import { TimelineMarkdownExporter } from '../src/events/services/timeline-markdown-exporter';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #657 — the timeline exporter's person filter compared a normalized dropdown
 * value (brackets stripped by `getUniquePeople`) against raw `person`/`persons`
 * fields that keep their wikilink brackets, so a person-filtered export matched
 * nothing. The filter now normalizes both sides.
 */

function makeExporter(): TimelineMarkdownExporter {
	return new TimelineMarkdownExporter({} as never, {} as never, null);
}

function ev(overrides: Partial<EventNote>): EventNote {
	return overrides as EventNote;
}

describe('TimelineMarkdownExporter person filter normalization (#657)', () => {
	it('matches a bracketed persons entry against a stripped filter value', () => {
		const exporter = makeExporter();
		const events = [
			ev({ persons: ['[[Jane Doe]]'], date: '1850' }),
			ev({ persons: ['[[John Smith]]'], date: '1860' }),
		];

		const summary = exporter.getExportSummary(events, { filterPerson: 'Jane Doe' });

		expect(summary.totalEvents).toBe(1);
		expect(summary.datedEvents).toBe(1);
	});

	it('matches a bracketed singular person field', () => {
		const exporter = makeExporter();
		const events = [ev({ person: '[[Jane Doe]]', date: '1850' })];

		const summary = exporter.getExportSummary(events, { filterPerson: 'Jane Doe' });

		expect(summary.totalEvents).toBe(1);
	});

	it('still matches when the filter value itself carries brackets', () => {
		const exporter = makeExporter();
		const events = [ev({ persons: ['[[Jane Doe]]'], date: '1850' })];

		const summary = exporter.getExportSummary(events, { filterPerson: '[[Jane Doe]]' });

		expect(summary.totalEvents).toBe(1);
	});

	it('getDateRange honors the person filter instead of ranging all events', () => {
		const exporter = makeExporter();
		const events = [
			ev({ persons: ['[[Jane Doe]]'], date: '1850' }),
			ev({ persons: ['[[John Smith]]'], date: '1990' }),
		];

		const range = exporter.getDateRange(events, { filterPerson: 'Jane Doe' });

		expect(range.earliest).toBe(1850);
		expect(range.latest).toBe(1850);
	});

	it('does not match an unrelated person', () => {
		const exporter = makeExporter();
		const events = [ev({ persons: ['[[Jane Doe]]'], date: '1850' })];

		const summary = exporter.getExportSummary(events, { filterPerson: 'Nobody' });

		expect(summary.totalEvents).toBe(0);
	});
});
