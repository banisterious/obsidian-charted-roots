import { describe, it, expect } from 'vitest';
import { TimelineCanvasExporter } from '../src/events/services/timeline-canvas-exporter';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #657 follow-up — Canvas/Excalidraw is the default export format, and its
 * filter still compared the stripped dropdown value against raw bracketed
 * `person`/`persons` fields, so a person-filtered Canvas export reported
 * "No events to export after filtering" (DigitalDreamn, filtering to
 * "Cliegg Lars"). The canvas exporter now shares `eventMatchesPerson`, so the
 * filter behaves like the markdown exporter fixed in #657.
 */

function makeExporter(): TimelineCanvasExporter {
	return new TimelineCanvasExporter({} as never, {} as never);
}

function ev(overrides: Partial<EventNote>): EventNote {
	return overrides as EventNote;
}

describe('TimelineCanvasExporter person filter normalization (#657 follow-up)', () => {
	it('matches a bracketed persons entry against a stripped filter value', () => {
		const exporter = makeExporter();
		const events = [
			ev({ persons: ['[[Cliegg Lars]]'], date: '1850' }),
			ev({ persons: ['[[Shmi Skywalker]]'], date: '1860' }),
		];

		const summary = exporter.getExportSummary(events, { filterPerson: 'Cliegg Lars' });

		expect(summary.totalEvents).toBe(1);
		expect(summary.datedEvents).toBe(1);
	});

	it('matches a bracketed singular person field', () => {
		const exporter = makeExporter();
		const events = [ev({ person: '[[Cliegg Lars]]', date: '1850' })];

		const summary = exporter.getExportSummary(events, { filterPerson: 'Cliegg Lars' });

		expect(summary.totalEvents).toBe(1);
	});

	it('does not match an unrelated person', () => {
		const exporter = makeExporter();
		const events = [ev({ persons: ['[[Shmi Skywalker]]'], date: '1860' })];

		const summary = exporter.getExportSummary(events, { filterPerson: 'Cliegg Lars' });

		expect(summary.totalEvents).toBe(0);
	});
});
