/**
 * Pure reverse-lookup helpers for the Source profile's "Referenced events"
 * section (#654). Kept UI-free (no service imports) so the matching logic can
 * be unit-tested without the profile loader's dependency graph.
 */

import type { EventNote } from '../events/types/event-types';

/**
 * Whether a wikilink resolves to the given source note basename. Mirrors the
 * loader's `matchesSource`: strip `[[…]]` and any `|alias`, then match on the
 * full name or a path-suffix.
 */
export function linkMatchesSourceBasename(link: string, sourceBasename: string): boolean {
	const stripped = link.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
	return stripped === sourceBasename || stripped.endsWith('/' + sourceBasename);
}

/**
 * Event notes that cite the given source via their `sources` array.
 */
export function findEventsReferencingSource(events: EventNote[], sourceBasename: string): EventNote[] {
	return events.filter(event =>
		event.sources?.some(link => linkMatchesSourceBasename(link, sourceBasename))
	);
}
