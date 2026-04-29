import { describe, expect, it } from 'vitest';
import { getJourneyWaypointEventLabel } from '../src/maps/types/map-types';

/**
 * #499 — Journey-mode rich popup and play-control label rendered "Custom"
 * for events whose raw type didn't match a built-in MarkerType. Sibling to
 * #466 which fixed the same gap on static map markers via `customLabel` on
 * MapMarker. The journey-side path is JourneyWaypoint.customLabel +
 * getJourneyWaypointEventLabel — the popup and control read the helper so
 * `Backstory` (etc.) survives instead of collapsing to `Custom`.
 */

describe('getJourneyWaypointEventLabel (#499)', () => {
	it('returns customLabel when the waypoint type is `custom` and a label is present', () => {
		const waypoint = { eventType: 'custom' as const, customLabel: 'backstory' };
		expect(getJourneyWaypointEventLabel(waypoint)).toBe('backstory');
	});

	it('falls back to `custom` when the waypoint type is `custom` but no customLabel is set', () => {
		const waypoint = { eventType: 'custom' as const };
		expect(getJourneyWaypointEventLabel(waypoint)).toBe('custom');
	});

	it('returns the canonical eventType for built-in marker types', () => {
		const waypoint = { eventType: 'residence' as const };
		expect(getJourneyWaypointEventLabel(waypoint)).toBe('residence');
	});

	it('ignores customLabel when the eventType is a built-in marker type', () => {
		// Defensive: even if a stray customLabel leaks onto a built-in type, the
		// canonical type wins so the popup never silently displays a fictional
		// label for a real birth/death/marriage waypoint.
		const waypoint = { eventType: 'birth' as const, customLabel: 'should-be-ignored' };
		expect(getJourneyWaypointEventLabel(waypoint)).toBe('birth');
	});

	it('preserves multi-word custom labels verbatim', () => {
		const waypoint = { eventType: 'custom' as const, customLabel: 'first journey' };
		expect(getJourneyWaypointEventLabel(waypoint)).toBe('first journey');
	});
});
