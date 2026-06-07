import { describe, expect, it } from 'vitest';
import { shouldShowTimelineIcons } from '../src/dynamic-content/renderers/timeline-renderer';

/**
 * #691 — Event icons rendered inconsistently on the Dynamic Timeline Block.
 * The icon decision used to be `iconMode === 'icon' || iconMode === 'both' ||
 * hasFamilyEvents`, while context and family rows drew icons unconditionally.
 * In the (then-default) 'text' mode a person's own events therefore showed
 * icons only when the timeline also contained a family event — so the same
 * note could render icons on some rows but not others, and an identical event
 * type appeared iconed on one person and bare on another.
 *
 * The decision is now driven solely by the icon mode (all rows or none), with
 * no dependency on the presence of family events. These tests lock that in.
 * Reported by @DigitalDreamn.
 */
describe('shouldShowTimelineIcons', () => {
	it('shows icons in icon mode', () => {
		expect(shouldShowTimelineIcons('icon')).toBe(true);
	});

	it('shows icons in both mode (the #691 default)', () => {
		expect(shouldShowTimelineIcons('both')).toBe(true);
	});

	it('hides icons in text mode', () => {
		expect(shouldShowTimelineIcons('text')).toBe(false);
	});

	it('hides icons for an unset/unknown mode (pre-#691 text fallback)', () => {
		expect(shouldShowTimelineIcons(undefined)).toBe(false);
		expect(shouldShowTimelineIcons('')).toBe(false);
		expect(shouldShowTimelineIcons('nonsense')).toBe(false);
	});

	it('does not depend on family events being present (the #691 regression)', () => {
		// The signature no longer accepts a `hasFamilyEvents` term: the result
		// for a given mode is constant. text => never icons, regardless of what
		// the timeline contains; both => always icons.
		expect(shouldShowTimelineIcons('text')).toBe(false);
		expect(shouldShowTimelineIcons('both')).toBe(true);
	});
});
