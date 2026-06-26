/**
 * Display-name resolution for date/calendar systems (#766).
 *
 * Events carry a `dateSystem` id (e.g. `star_wars_out_of_universe_calendar`).
 * UI that lists those calendars — the place and person timeline filters — used
 * to show the raw id. Resolve it to the system's `name` instead, falling back
 * to a humanized form of the id so a raw sluggified id never surfaces, the same
 * way place-type names are resolved (#728).
 */

import type { FictionalDateSystem } from './types/date-types';

/**
 * Humanize a sluggified id: underscores to spaces, first letter capitalized.
 */
function humanizeId(id: string): string {
	return id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

/**
 * Resolve a date-system id to its display name. Searches `systems` for a
 * matching `id` and returns its `name`; when no system matches (e.g. a built-in
 * the caller didn't include, or an orphaned id), returns a humanized form of
 * the id rather than the raw slug.
 */
export function getCalendarSystemName(id: string, systems: FictionalDateSystem[]): string {
	const match = systems.find(system => system.id === id);
	return match?.name ?? humanizeId(id);
}
