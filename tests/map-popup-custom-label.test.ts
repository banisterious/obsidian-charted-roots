import { describe, expect, it } from 'vitest';
import { MapDataService } from '../src/maps/map-data-service';
import type { LifeEvent } from '../src/maps/types/map-types';

/**
 * #466 — Map popups for `cr_type: event` markers showed the literal `Custom:`
 * label whenever the raw `event_type` didn't match a built-in `MarkerType`.
 * The fix preserves the raw type (or event-note title) on `LifeEvent` and
 * `MapMarker` as `customLabel` so the popup can render `<originalType>:`
 * (e.g., `Backstory:`) instead of dropping the category context.
 */

interface ParseEventsArrayAccess {
	parseEventsArray: (events: unknown) => LifeEvent[] | undefined;
}

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

function privates(service: MapDataService): ParseEventsArrayAccess {
	return service as unknown as ParseEventsArrayAccess;
}

describe('MapDataService.parseEventsArray — customLabel propagation (#466)', () => {
	const service = makeService();

	it('preserves the raw event_type as customLabel when it resolves to `custom`', () => {
		const events = [
			{ event_type: 'backstory', place: '[[Tatooine]]', date_from: '64 BBY' },
		];

		const parsed = privates(service).parseEventsArray(events);

		expect(parsed).toBeDefined();
		expect(parsed!.length).toBe(1);
		expect(parsed![0].event_type).toBe('custom');
		expect(parsed![0].customLabel).toBe('backstory');
	});

	it('leaves customLabel undefined when the event_type is a built-in MarkerType', () => {
		const events = [
			{ event_type: 'residence', place: '[[Tatooine]]', date_from: '64 BBY' },
		];

		const parsed = privates(service).parseEventsArray(events);

		expect(parsed).toBeDefined();
		expect(parsed![0].event_type).toBe('residence');
		expect(parsed![0].customLabel).toBeUndefined();
	});

	it('preserves multi-word custom event types verbatim', () => {
		const events = [
			{ event_type: 'first journey', place: '[[Alderaan]]', date_from: '50 BBY' },
		];

		const parsed = privates(service).parseEventsArray(events);

		expect(parsed!.length).toBe(1);
		expect(parsed![0].customLabel).toBe('first journey');
	});
});
