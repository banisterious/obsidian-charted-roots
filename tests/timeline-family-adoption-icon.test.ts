import { describe, expect, it } from 'vitest';
import { resolveFamilyEventIcon } from '../src/dynamic-content/renderers/timeline-renderer';
import type { EventTypeDefinition } from '../src/events/types/event-types';

/**
 * #632 — Adoption family events on the Dynamic Timeline Block (adoptive
 * parent's `Adopted {name}` row, and the adopted-sibling / adopted-grandchild
 * `Adoption of {name}` rows added in #621/#623) should render with the same
 * `heart-handshake` icon and warm-orange color as the focal person's own
 * `Adopted` row (#627), rather than the generic `users` family-event icon.
 *
 * The carve-out: the adopted child's BIRTH row (shown when "Show adopted
 * children's births" is on) is typed `family_birth`, not `adoption`, so it
 * keeps the `users` icon.
 */
describe('resolveFamilyEventIcon (#632)', () => {
	it('resolves adoption family events to the built-in adoption icon and color', () => {
		const { icon, color } = resolveFamilyEventIcon('adoption');
		expect(icon).toBe('heart-handshake');
		expect(color).toBe('#fb923c');
	});

	it('keeps the generic users icon for non-adoption family events', () => {
		expect(resolveFamilyEventIcon('family_birth')).toEqual({ icon: 'users' });
		expect(resolveFamilyEventIcon('family_death')).toEqual({ icon: 'users' });
		expect(resolveFamilyEventIcon('family_parent_marriage')).toEqual({ icon: 'users' });
	});

	it('honors a custom event type overriding the built-in adoption icon/color', () => {
		const customTypes: EventTypeDefinition[] = [
			{
				id: 'adoption',
				name: 'Adoption',
				description: 'Custom',
				icon: 'baby',
				color: '#123456',
				category: 'vital',
				isBuiltIn: false
			}
		];
		const { icon, color } = resolveFamilyEventIcon('adoption', customTypes, true);
		expect(icon).toBe('baby');
		expect(color).toBe('#123456');
	});

	it('falls back to users when built-ins are disabled and no custom adoption type exists', () => {
		expect(resolveFamilyEventIcon('adoption', [], false)).toEqual({ icon: 'users' });
	});
});
