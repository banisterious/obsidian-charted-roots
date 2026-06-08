import type { LifeEvent, EventType } from '../maps/types/map-types';

/**
 * Event types that surface from a person's inline `events:` frontmatter array.
 * Birth, death, and marriage are intentionally excluded — those come from
 * dedicated frontmatter fields (born / died / spouseN_marriage_*), so an inline
 * entry of one of those types would double-count. Shared by the Maps marker
 * pipeline and the Dynamic Timeline Block (#692).
 */
export const LIFE_EVENT_TYPES: ReadonlyArray<EventType> = [
	'residence', 'occupation', 'education', 'military',
	'immigration', 'baptism', 'burial', 'confirmation', 'ordination', 'custom'
];

/**
 * Coerce a raw frontmatter date value to a string/number (or undefined). A
 * `Date` (YAML may parse an unquoted ISO date into one) is reduced to its
 * `YYYY-MM-DD` string.
 */
export function coerceLifeEventDate(value: unknown): string | number | undefined {
	if (typeof value === 'string' || typeof value === 'number') return value;
	if (value instanceof Date && !isNaN(value.getTime())) {
		return value.toISOString().split('T')[0];
	}
	return undefined;
}

export interface ParseLifeEventsOptions {
	/**
	 * Resolve a raw `event_type` string to a canonical `EventType`, applying the
	 * user's value aliases. Injected so this parser stays pure and free of the
	 * plugin/settings — callers bind their own ValueAliasService.
	 */
	resolveEventType: (rawType: string) => EventType;
}

/**
 * Parse a person's inline `events:` frontmatter array into `LifeEvent` objects.
 * Entries missing `event_type` or `place`, or whose resolved type isn't a
 * life-event type, are skipped. `custom`-resolved entries preserve the original
 * type string as `customLabel` so the category isn't lost in display (#466).
 */
export function parseLifeEvents(raw: unknown, opts: ParseLifeEventsOptions): LifeEvent[] {
	if (!Array.isArray(raw)) return [];

	const parsed: LifeEvent[] = [];
	for (const event of raw) {
		if (typeof event !== 'object' || event === null) continue;

		const obj = event as Record<string, unknown>;
		const rawType = obj.event_type as string;
		const place = obj.place as string;
		if (!rawType || !place) continue;

		const resolved = opts.resolveEventType(rawType);
		if (!LIFE_EVENT_TYPES.includes(resolved)) continue;

		parsed.push({
			event_type: resolved,
			place,
			date_from: coerceLifeEventDate(obj.date_from),
			date_to: coerceLifeEventDate(obj.date_to),
			description: obj.description as string | undefined,
			customLabel: resolved === 'custom' && rawType ? rawType : undefined
		});
	}

	return parsed;
}

/**
 * Stable key for de-duplicating a life event against another timeline source
 * (e.g. an external `cr_type: event` note describing the same event). Keys on
 * resolved type + place + the full date string when present (#692). Place is
 * expected pre-stripped of wikilink syntax by the caller.
 */
export function lifeEventDedupKey(type: string, place: string | undefined, rawDate: string | undefined): string {
	return `${type}|${(place || '').trim().toLowerCase()}|${(rawDate || '').trim()}`;
}
