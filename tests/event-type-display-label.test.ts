import { describe, expect, it } from 'vitest';
import { humanizeEventTypeId, resolveEventTypeLabel } from '../src/events/types/event-types';
import type { EventTypeDefinition } from '../src/events/types/event-types';
import { resolveMarkerEventTypeId } from '../src/maps/types/map-types';

/**
 * #774 — Map event pop-ups (static markers and the journey rich pop-up) showed
 * the raw event_type slug for custom/two-word types (`plot_point`,
 * `jedi_knighting`) and lost the icon, because the pop-up resolved the generic
 * `custom` marker type instead of the real slug in `customLabel`, and labelled
 * with `capitalize(slug)`. The marker's real type id is now resolved from
 * customLabel and rendered via its registered display name (humanized fallback
 * for unregistered ids). Reported by @DigitalDreamn.
 */

const customTypes: EventTypeDefinition[] = [
	{ id: 'jedi_knighting', name: 'Knighting', description: '', icon: 'calendar', color: '#abcabc', category: 'custom', isBuiltIn: false },
];

describe('resolveMarkerEventTypeId (#774)', () => {
	it('returns the customLabel slug for a custom marker', () => {
		expect(resolveMarkerEventTypeId('custom', 'plot_point')).toBe('plot_point');
	});

	it('returns the marker type for a built-in marker', () => {
		expect(resolveMarkerEventTypeId('birth', undefined)).toBe('birth');
	});

	it('ignores a stray customLabel on a built-in marker type', () => {
		expect(resolveMarkerEventTypeId('birth', 'should-be-ignored')).toBe('birth');
	});

	it('falls back to `custom` when no customLabel is present', () => {
		expect(resolveMarkerEventTypeId('custom', undefined)).toBe('custom');
	});
});

describe('humanizeEventTypeId (#774)', () => {
	it('turns a two-word slug into a sentence-case label', () => {
		expect(humanizeEventTypeId('plot_point')).toBe('Plot point');
	});

	it('capitalizes a single-word slug', () => {
		expect(humanizeEventTypeId('residence')).toBe('Residence');
	});
});

describe('resolveEventTypeLabel (#774)', () => {
	it('uses a registered custom type\'s display name, not its slug', () => {
		expect(resolveEventTypeLabel('jedi_knighting', customTypes, true)).toBe('Knighting');
	});

	it('uses a built-in type\'s display name', () => {
		expect(resolveEventTypeLabel('birth', [], true)).toBe('Birth');
	});

	it('humanizes an unregistered slug', () => {
		expect(resolveEventTypeLabel('plot_point', [], true)).toBe('Plot point');
	});

	it('humanizes a built-in id when built-ins are disabled and it is not custom', () => {
		expect(resolveEventTypeLabel('birth', [], false)).toBe('Birth');
	});
});
