import { describe, expect, it } from 'vitest';
import { timelineExportTitle } from '../src/dates/services/timeline-export-naming';
import { toSafeFilename } from '../src/core/canvas-utils';

/**
 * #657 follow-up — every timeline export derived its file name from the title
 * alone (default "Event Timeline"), so exporting a second person prompted to
 * overwrite the first person's canvas. The export title now folds in the
 * active person filter, giving each person a distinct title and file name.
 */
describe('timelineExportTitle (#657 follow-up)', () => {
	it('leaves the title unchanged when no person filter is set', () => {
		expect(timelineExportTitle('Event Timeline', '')).toBe('Event Timeline');
	});

	it('appends the filtered person', () => {
		expect(timelineExportTitle('Event Timeline', '[[Ahsoka Tano]]')).toBe('Event Timeline - Ahsoka Tano');
	});

	it('respects a custom title while still distinguishing by person', () => {
		expect(timelineExportTitle('My Saga', '[[Cliegg Lars]]')).toBe('My Saga - Cliegg Lars');
	});

	it('yields distinct file stems per person so exports do not collide', () => {
		const ahsoka = toSafeFilename(timelineExportTitle('Event Timeline', '[[Ahsoka Tano]]'));
		const cliegg = toSafeFilename(timelineExportTitle('Event Timeline', '[[Cliegg Lars]]'));
		expect(ahsoka).toBe('event-timeline-ahsoka-tano');
		expect(cliegg).toBe('event-timeline-cliegg-lars');
		expect(ahsoka).not.toBe(cliegg);
	});
});
