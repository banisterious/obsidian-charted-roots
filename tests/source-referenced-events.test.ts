import { describe, it, expect } from 'vitest';
import { findEventsReferencingSource, linkMatchesSourceBasename } from '../src/profile-view/referenced-events';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #654 — the Source profile gains a "Referenced events" section. These fence
 * the reverse-lookup that gathers event notes citing a source via their
 * `sources` array, matching the source by basename the same way the loader's
 * `findReferencedFacts` does.
 */

function ev(overrides: Partial<EventNote>): EventNote {
	return overrides as EventNote;
}

describe('findEventsReferencingSource (#654)', () => {
	it('gathers events whose sources cite the source by basename', () => {
		const events = [
			ev({ crId: 'e1', title: 'Battle of Geonosis', sources: ['[[Wookieepedia Clone Wars]]'] }),
			ev({ crId: 'e2', title: 'Unrelated', sources: ['[[Some Other Source]]'] }),
			ev({ crId: 'e3', title: 'No sources' }),
		];

		expect(findEventsReferencingSource(events, 'Wookieepedia Clone Wars').map(e => e.crId)).toEqual(['e1']);
	});

	it('matches path-form source links by basename', () => {
		const events = [ev({ crId: 'e1', sources: ['[[Charted Roots/Sources/Wookieepedia Clone Wars]]'] })];

		expect(findEventsReferencingSource(events, 'Wookieepedia Clone Wars').map(e => e.crId)).toEqual(['e1']);
	});

	it('matches aliased source links', () => {
		const events = [ev({ crId: 'e1', sources: ['[[Wookieepedia Clone Wars|Clone Wars]]'] })];

		expect(findEventsReferencingSource(events, 'Wookieepedia Clone Wars').map(e => e.crId)).toEqual(['e1']);
	});

	it('returns empty when no events cite the source', () => {
		const events = [ev({ crId: 'e1', sources: ['[[Other]]'] })];

		expect(findEventsReferencingSource(events, 'Wookieepedia Clone Wars')).toEqual([]);
	});
});

describe('linkMatchesSourceBasename (#654)', () => {
	it('matches bare, path-form, and aliased links; rejects others', () => {
		expect(linkMatchesSourceBasename('[[Clone Wars]]', 'Clone Wars')).toBe(true);
		expect(linkMatchesSourceBasename('[[Sources/Clone Wars]]', 'Clone Wars')).toBe(true);
		expect(linkMatchesSourceBasename('[[Clone Wars|CW]]', 'Clone Wars')).toBe(true);
		expect(linkMatchesSourceBasename('[[Galactic Clone Wars]]', 'Clone Wars')).toBe(false);
	});
});
