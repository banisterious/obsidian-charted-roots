/**
 * Person-filter matching for timeline exports.
 *
 * The "Filter by person" dropdown values are built from `getUniquePeople()`,
 * which normalizes references the same way `EventService.normalizeWikilink`
 * does — stripping `[[...]]` brackets and trimming, but keeping any `|alias`.
 * An event's raw `person` / `persons` fields keep their brackets, so a filter
 * must normalize both sides or a bracketed entry never matches the (stripped)
 * dropdown value. Every exporter (markdown + canvas) shares this matcher so the
 * filter behaves identically across formats (#657, #657 follow-up).
 *
 * Pure: no I/O, no Obsidian types, fully unit-testable.
 */

import { EventNote } from './types/event-types';

/**
 * Strip wikilink brackets and trim, matching `EventService.normalizeWikilink`.
 */
export function normalizePersonRef(ref: string): string {
	return ref.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
}

/**
 * Whether an event names the given person, comparing on normalized wikilinks.
 * Matches against both the principal (`person`) and participants (`persons`).
 */
export function eventMatchesPerson(event: EventNote, filterPerson: string): boolean {
	const needle = normalizePersonRef(filterPerson);
	if (event.person && normalizePersonRef(event.person) === needle) {
		return true;
	}
	return Boolean(event.persons?.some(p => normalizePersonRef(p) === needle));
}
