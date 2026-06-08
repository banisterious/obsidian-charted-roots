import { describe, expect, it } from 'vitest';
import {
	parseLifeEvents,
	lifeEventDedupKey,
	coerceLifeEventDate,
	LIFE_EVENT_TYPES,
} from '../src/events/life-events-parser';
import type { EventType } from '../src/maps/types/map-types';

/**
 * #692 — the shared inline `events:` parser. Drives both the Maps marker
 * pipeline and the Dynamic Timeline Block. Alias resolution is injected so the
 * parser is pure. The identity resolver below treats a couple of strings as
 * aliases and sends anything unknown to `custom`, mirroring ValueAliasService's
 * unknown-type behavior.
 */
const resolveEventType = (raw: string): EventType => {
	const aliases: Record<string, EventType> = { home: 'residence', job: 'occupation' };
	if (aliases[raw]) return aliases[raw];
	return (LIFE_EVENT_TYPES.includes(raw as EventType) ? raw : 'custom') as EventType;
};

describe('parseLifeEvents (#692)', () => {
	it('returns [] for non-array input', () => {
		expect(parseLifeEvents(undefined, { resolveEventType })).toEqual([]);
		expect(parseLifeEvents('nope', { resolveEventType })).toEqual([]);
	});

	it('parses a valid life event', () => {
		const out = parseLifeEvents(
			[{ event_type: 'residence', place: '[[Tatooine]]', date_from: 1815, description: 'moved in' }],
			{ resolveEventType }
		);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ event_type: 'residence', place: '[[Tatooine]]', date_from: 1815, description: 'moved in' });
	});

	it('skips entries missing event_type or place', () => {
		const out = parseLifeEvents(
			[{ place: '[[X]]' }, { event_type: 'residence' }, null, 'string'],
			{ resolveEventType }
		);
		expect(out).toEqual([]);
	});

	it('resolves aliases through the injected resolver', () => {
		const out = parseLifeEvents([{ event_type: 'home', place: '[[A]]' }], { resolveEventType });
		expect(out[0].event_type).toBe('residence');
	});

	it('drops non-life-event types (e.g. an inline birth)', () => {
		// `birth` resolves to `custom` here only if not a life type; to test the
		// filter directly, use a resolver that returns a non-life type.
		const out = parseLifeEvents([{ event_type: 'birth', place: '[[A]]' }], {
			resolveEventType: () => 'birth' as EventType,
		});
		expect(out).toEqual([]);
	});

	it('preserves the original type as customLabel when resolved to custom', () => {
		const out = parseLifeEvents([{ event_type: 'Backstory', place: '[[A]]' }], { resolveEventType });
		expect(out[0].event_type).toBe('custom');
		expect(out[0].customLabel).toBe('Backstory');
	});

	it('coerces date values', () => {
		expect(coerceLifeEventDate(1815)).toBe(1815);
		expect(coerceLifeEventDate('1815-03-12')).toBe('1815-03-12');
		expect(coerceLifeEventDate(new Date('1815-03-12T00:00:00Z'))).toBe('1815-03-12');
		expect(coerceLifeEventDate({})).toBeUndefined();
		expect(coerceLifeEventDate(null)).toBeUndefined();
	});
});

describe('lifeEventDedupKey (#692)', () => {
	it('matches the same event regardless of place case/whitespace', () => {
		expect(lifeEventDedupKey('residence', '  Tatooine ', '1815'))
			.toBe(lifeEventDedupKey('residence', 'tatooine', '1815'));
	});

	it('distinguishes different dates (full date when present)', () => {
		expect(lifeEventDedupKey('residence', 'Tatooine', '1815-03-12'))
			.not.toBe(lifeEventDedupKey('residence', 'Tatooine', '1815'));
	});

	it('distinguishes different types and places', () => {
		expect(lifeEventDedupKey('residence', 'A', '1815')).not.toBe(lifeEventDedupKey('occupation', 'A', '1815'));
		expect(lifeEventDedupKey('residence', 'A', '1815')).not.toBe(lifeEventDedupKey('residence', 'B', '1815'));
	});
});
