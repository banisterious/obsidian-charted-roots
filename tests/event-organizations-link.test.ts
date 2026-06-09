/* eslint-disable @typescript-eslint/no-unsafe-call -- Obsidian API + plugin stubs are any-typed surfaces; project policy accepts these in tests. */
import { describe, it, expect } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { EventService } from '../src/events/services/event-service';
import type { EventNote } from '../src/events/types/event-types';
import { DEFAULT_NOTE_TYPE_DETECTION_SETTINGS } from '../src/utils/note-type-detection';

/**
 * #659 — events can link to organization notes via an `organizations` wikilink
 * array, surfacing the event on the org's profile "Events" section. These fence
 * the `getEventsForOrganization` reverse-lookup (matching on the normalized
 * wikilink the same way person/place lookups do) and the frontmatter parse.
 */

function ev(overrides: Partial<EventNote>): EventNote {
	return overrides as EventNote;
}

function makeSettings(): never {
	return {
		propertyAliases: {},
		noteTypeDetection: DEFAULT_NOTE_TYPE_DETECTION_SETTINGS,
	} as never;
}

/** Service over a fixed event set, bypassing the vault scan. */
function makeServiceWithEvents(events: EventNote[]): EventService {
	const service = new EventService(new App() as never, makeSettings());
	(service as unknown as { getAllEvents: () => EventNote[] }).getAllEvents = () => events;
	return service;
}

describe('EventService.getEventsForOrganization (#659)', () => {
	it('matches events whose organizations array references the org', () => {
		const service = makeServiceWithEvents([
			ev({ crId: 'e1', organizations: ['[[Jedi Order]]'] }),
			ev({ crId: 'e2', organizations: ['[[Galactic Senate]]'] }),
			ev({ crId: 'e3' }),
		]);

		expect(service.getEventsForOrganization('[[Jedi Order]]').map(e => e.crId)).toEqual(['e1']);
	});

	it('matches the org-profile call shape ([[basename]]) against a bracketed link', () => {
		// The org profile loader calls with `[[${file.basename}]]`; the stored
		// link is also bracketed, so the bracket-stripping normalize aligns them.
		const service = makeServiceWithEvents([
			ev({ crId: 'e1', organizations: ['[[Jedi Order]]'] }),
		]);

		expect(service.getEventsForOrganization('[[Jedi Order]]').map(e => e.crId)).toEqual(['e1']);
	});

	it('matches a bare basename against a bracketed link', () => {
		const service = makeServiceWithEvents([
			ev({ crId: 'e1', organizations: ['[[Jedi Order]]'] }),
		]);

		expect(service.getEventsForOrganization('Jedi Order').map(e => e.crId)).toEqual(['e1']);
	});

	it('matches one of several linked organizations', () => {
		const service = makeServiceWithEvents([
			ev({ crId: 'e1', organizations: ['[[Jedi Order]]', '[[Galactic Senate]]'] }),
		]);

		expect(service.getEventsForOrganization('[[Galactic Senate]]').map(e => e.crId)).toEqual(['e1']);
	});

	it('returns empty when no event links the org', () => {
		const service = makeServiceWithEvents([ev({ crId: 'e1', organizations: ['[[Sith Order]]'] })]);

		expect(service.getEventsForOrganization('[[Jedi Order]]')).toEqual([]);
	});
});

describe('EventService.parseEventNote — organizations (#659)', () => {
	function parse(frontmatter: Record<string, unknown>): EventNote | null {
		const app = new App();
		const file = makeTFile({ path: 'Event.md', basename: 'Event', extension: 'md' });
		app.vault._addFile(file);
		app.metadataCache._setFrontmatter(file, frontmatter);
		const service = new EventService(app as never, makeSettings());
		return service.parseEventNote(file, frontmatter);
	}

	it('reads the organizations array from frontmatter', () => {
		const event = parse({
			cr_type: 'event',
			cr_id: 'evt-1',
			title: 'Battle of Geonosis',
			event_type: 'other',
			organizations: ['[[Jedi Order]]', '[[Galactic Senate]]'],
		});

		expect(event?.organizations).toEqual(['[[Jedi Order]]', '[[Galactic Senate]]']);
	});

	it('leaves organizations empty when the property is absent', () => {
		const event = parse({
			cr_type: 'event',
			cr_id: 'evt-2',
			title: 'A Quiet Day',
			event_type: 'other',
		});

		expect(event?.organizations).toEqual([]);
	});
});
