import { describe, expect, it, beforeEach } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import type { LifeEvent } from '../src/maps/types/map-types';

/**
 * #438 — map journey doesn't surface life events from cr_type: event notes.
 *
 * The fix wires `EventService.getEventsForPerson` into `MapDataService.getPersonData`
 * so external event notes feed the same downstream journey/marker code as inline
 * `events:` arrays. This suite fences the helper logic introduced for that fix:
 * the inline + external merge, the dedup key, and date coercion (YAML Date objects
 * → ISO strings).
 */

function makeService(): MapDataService {
	const plugin = {
		settings: {
			propertyAliases: {},
			valueAliases: {},
		},
		getEventService: () => null,
	} as never;
	return new MapDataService(plugin);
}

interface PrivateMembers {
	mergeAndDedupeLifeEvents: (
		inline?: LifeEvent[],
		external?: LifeEvent[]
	) => LifeEvent[] | undefined;
	coerceDateValue: (value: unknown) => string | number | undefined;
}

function privates(service: MapDataService): PrivateMembers {
	return service as unknown as PrivateMembers;
}

describe('MapDataService — life event merge and dedup (#438)', () => {
	let service: MapDataService;

	beforeEach(() => {
		service = makeService();
	});

	describe('mergeAndDedupeLifeEvents', () => {
		it('returns undefined when both lists are empty/undefined', () => {
			expect(privates(service).mergeAndDedupeLifeEvents(undefined, undefined)).toBeUndefined();
			expect(privates(service).mergeAndDedupeLifeEvents([], [])).toBeUndefined();
		});

		it('passes through inline-only events when no external events exist', () => {
			const inline: LifeEvent[] = [
				{ event_type: 'residence', place: '[[Boston]]', date_from: '1920-01-08' },
			];

			const merged = privates(service).mergeAndDedupeLifeEvents(inline, undefined);

			expect(merged).toEqual(inline);
		});

		it('passes through external-only events when no inline events exist', () => {
			const external: LifeEvent[] = [
				{ event_type: 'occupation', place: '[[Philadelphia]]', date_from: '1925-09-01' },
			];

			const merged = privates(service).mergeAndDedupeLifeEvents(undefined, external);

			expect(merged).toEqual(external);
		});

		it('combines disjoint inline and external lists', () => {
			const inline: LifeEvent[] = [
				{ event_type: 'baptism', place: '[[Boston]]', date_from: '1905-04-05' },
			];
			const external: LifeEvent[] = [
				{ event_type: 'occupation', place: '[[Philadelphia]]', date_from: '1925-09-01' },
			];

			const merged = privates(service).mergeAndDedupeLifeEvents(inline, external);

			expect(merged).toHaveLength(2);
			expect(merged?.[0].place).toBe('[[Boston]]');
			expect(merged?.[1].place).toBe('[[Philadelphia]]');
		});

		it('dedupes events that share event_type, place, and date_from', () => {
			const sameLogicalEvent = {
				event_type: 'residence' as const,
				place: '[[Boston]]',
				date_from: '1920-01-08',
			};

			const merged = privates(service).mergeAndDedupeLifeEvents(
				[sameLogicalEvent],
				[sameLogicalEvent]
			);

			expect(merged).toHaveLength(1);
		});

		it('keeps the inline version when both schemas record the same event', () => {
			const inline: LifeEvent[] = [
				{
					event_type: 'residence',
					place: '[[Boston]]',
					date_from: '1920-01-08',
					description: 'inline-authored description',
				},
			];
			const external: LifeEvent[] = [
				{
					event_type: 'residence',
					place: '[[Boston]]',
					date_from: '1920-01-08',
					description: 'external-event-note description',
				},
			];

			const merged = privates(service).mergeAndDedupeLifeEvents(inline, external);

			expect(merged).toHaveLength(1);
			expect(merged?.[0].description).toBe('inline-authored description');
		});

		it('treats events at the same place/type but different dates as distinct', () => {
			const inline: LifeEvent[] = [
				{ event_type: 'residence', place: '[[Boston]]', date_from: '1910-04-15' },
			];
			const external: LifeEvent[] = [
				{ event_type: 'residence', place: '[[Boston]]', date_from: '1920-01-08' },
			];

			const merged = privates(service).mergeAndDedupeLifeEvents(inline, external);

			expect(merged).toHaveLength(2);
		});

		it('normalizes wikilink vs raw place string for dedup', () => {
			// Inline events typically store place as a wikilink "[[Boston]]"; an
			// external event-note's place may also be "[[Boston]]" but the
			// extractPlaceString helper unwraps wikilinks. The dedup key uses
			// the unwrapped form so the two formats collapse correctly.
			const inline: LifeEvent[] = [
				{ event_type: 'residence', place: '[[Boston]]', date_from: '1920-01-08' },
			];
			const external: LifeEvent[] = [
				{ event_type: 'residence', place: 'Boston', date_from: '1920-01-08' },
			];

			const merged = privates(service).mergeAndDedupeLifeEvents(inline, external);

			expect(merged).toHaveLength(1);
		});
	});

	describe('coerceDateValue', () => {
		it('passes string dates through unchanged', () => {
			expect(privates(service).coerceDateValue('1905-04-05')).toBe('1905-04-05');
		});

		it('passes year numbers through unchanged', () => {
			expect(privates(service).coerceDateValue(1925)).toBe(1925);
		});

		it('converts a Date object to an ISO date string', () => {
			const date = new Date('1905-04-05T00:00:00Z');
			expect(privates(service).coerceDateValue(date)).toBe('1905-04-05');
		});

		it('returns undefined for invalid Date objects', () => {
			expect(privates(service).coerceDateValue(new Date('not-a-date'))).toBeUndefined();
		});

		it('returns undefined for null, undefined, or unsupported types', () => {
			expect(privates(service).coerceDateValue(null)).toBeUndefined();
			expect(privates(service).coerceDateValue(undefined)).toBeUndefined();
			expect(privates(service).coerceDateValue({ year: 1905 })).toBeUndefined();
			expect(privates(service).coerceDateValue([1905])).toBeUndefined();
		});
	});
});
