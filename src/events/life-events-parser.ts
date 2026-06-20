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

/**
 * Coerce a raw frontmatter string-ish value (e.g. `place`, `event_type`) to a
 * string, or undefined. A bare number (`place: 1850` / `event_type: 1`, which
 * YAML parses into a number) is stringified rather than left as a number to
 * crash a downstream string method — the non-string-reaches-a-string-method
 * class behind #741 and #746. Objects/arrays/null/non-finite return undefined so
 * the entry is skipped.
 */
export function coerceLifeEventText(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
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
		const rawType = coerceLifeEventText(obj.event_type);
		const place = coerceLifeEventText(obj.place);
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
 *
 * `place` and `rawDate` are coerced with `String()` because they originate from
 * frontmatter, where a bare year (`born: 1850`) parses as a number — calling
 * `.trim()` on it directly threw "e.trim is not a function" and broke the whole
 * timeline render (#741).
 */
export function lifeEventDedupKey(
	type: string,
	place: string | number | undefined,
	rawDate: string | number | undefined
): string {
	const placeStr = place == null ? '' : String(place);
	const dateStr = rawDate == null ? '' : String(rawDate);
	return `${type}|${placeStr.trim().toLowerCase()}|${dateStr.trim()}`;
}
