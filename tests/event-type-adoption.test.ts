import { describe, expect, it } from 'vitest';
import {
	CORE_EVENT_TYPES,
	EVENT_TYPE_DEFINITIONS,
	getEventType,
	getEventTypeCategory,
} from '../src/events/types/event-types';

/**
 * #627 — the focal person's own `Adopted` event row on the Dynamic
 * Timeline Block previously rendered without an icon, while the
 * adoptive parent's `Adopted {name}` row (a family event) got the
 * generic `users` icon. The cause was a missing built-in event type:
 * the renderer calls `getEventType('adoption', ...)` for the focal-
 * own row, but `EVENT_TYPE_DEFINITIONS` had no entry with that id, so
 * the icon resolution fell through to the placeholder span. This
 * suite fences the new `adoption` built-in entry plus its
 * by-id-list category alignment.
 */

describe('Adoption built-in event type (#627)', () => {
	it('exists in EVENT_TYPE_DEFINITIONS with id "adoption"', () => {
		const def = EVENT_TYPE_DEFINITIONS.find(t => t.id === 'adoption');
		expect(def).toBeDefined();
	});

	it('getEventType("adoption") returns the built-in definition', () => {
		const def = getEventType('adoption');
		expect(def).toBeDefined();
		expect(def?.id).toBe('adoption');
		expect(def?.isBuiltIn).toBe(true);
	});

	it('has a non-empty icon name', () => {
		const def = getEventType('adoption');
		// Don't pin to the specific icon — the visual choice is design-owned.
		// Just fence that an icon is set, so the renderer's setIcon call
		// doesn't fall through to the placeholder branch (#627).
		expect(def?.icon).toBeTruthy();
		expect(typeof def?.icon).toBe('string');
	});

	it('has a non-empty color', () => {
		const def = getEventType('adoption');
		expect(def?.color).toBeTruthy();
		expect(typeof def?.color).toBe('string');
	});

	it('is categorized as a vital event (definition field)', () => {
		const def = getEventType('adoption');
		expect(def?.category).toBe('vital');
	});

	it('appears in CORE_EVENT_TYPES so by-id category lookup agrees', () => {
		// `getEventTypeCategory` checks CORE_EVENT_TYPES by-id to return
		// 'vital'. If the id were missing from that list while present in
		// EVENT_TYPE_DEFINITIONS, the two paths would disagree (the
		// definition's `category` says 'vital', but the by-id lookup
		// would default to 'life'). This fence keeps them in sync.
		expect((CORE_EVENT_TYPES as readonly string[]).includes('adoption')).toBe(true);
		expect(getEventTypeCategory('adoption')).toBe('vital');
	});

	it('custom types still take precedence over the built-in', () => {
		// Sanity: the customization mechanism should still work for
		// adoption the same way it does for other built-ins.
		const customAdoption = {
			id: 'adoption',
			name: 'Custom Adoption',
			description: 'overridden',
			icon: 'star' as const,
			color: '#000000',
			category: 'vital',
			isBuiltIn: false,
		};
		const def = getEventType('adoption', [customAdoption]);
		expect(def?.name).toBe('Custom Adoption');
	});
});
