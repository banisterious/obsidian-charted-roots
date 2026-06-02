import { describe, it, expect } from 'vitest';
import { normalizePersonRef, eventMatchesPerson } from '../src/events/event-person-match';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #657 follow-up — the markdown exporter's person filter was normalized in
 * #657, but the canvas/excalidraw export path (the default format) kept the
 * raw `===` / `includes` comparison, so a person-filtered Canvas export still
 * collapsed to "No events to export after filtering" even though the on-screen
 * preview (markdown summary) reacted correctly. Both exporters now share this
 * matcher; these tests pin the shared contract.
 */

function ev(overrides: Partial<EventNote>): EventNote {
	return overrides as EventNote;
}

describe('normalizePersonRef', () => {
	it('strips flush wikilink brackets', () => {
		expect(normalizePersonRef('[[Jane Doe]]')).toBe('Jane Doe');
	});

	it('trims surrounding whitespace on a plain value', () => {
		expect(normalizePersonRef('Jane Doe ')).toBe('Jane Doe');
	});

	it('leaves an already-stripped value unchanged', () => {
		expect(normalizePersonRef('Jane Doe')).toBe('Jane Doe');
	});

	it('keeps an alias suffix (matches getUniquePeople / EventService.normalizeWikilink)', () => {
		expect(normalizePersonRef('[[jane|Jane Doe]]')).toBe('jane|Jane Doe');
	});
});

describe('eventMatchesPerson', () => {
	it('matches a bracketed persons entry against a stripped filter value', () => {
		expect(eventMatchesPerson(ev({ persons: ['[[Jane Doe]]'] }), 'Jane Doe')).toBe(true);
	});

	it('matches a bracketed singular person field', () => {
		expect(eventMatchesPerson(ev({ person: '[[Jane Doe]]' }), 'Jane Doe')).toBe(true);
	});

	it('matches when the filter value itself carries brackets', () => {
		expect(eventMatchesPerson(ev({ persons: ['[[Jane Doe]]'] }), '[[Jane Doe]]')).toBe(true);
	});

	it('does not match an unrelated person', () => {
		expect(eventMatchesPerson(ev({ persons: ['[[John Smith]]'] }), 'Jane Doe')).toBe(false);
	});

	it('returns false when the event names nobody', () => {
		expect(eventMatchesPerson(ev({ date: '1850' }), 'Jane Doe')).toBe(false);
	});
});
