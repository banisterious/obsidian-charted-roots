import { describe, expect, it } from 'vitest';
import { effectiveCardSpacing } from '../src/ui/views/family-chart-spacing';

/**
 * #669 follow-up — Circle/SVG cards widen to fit long names and toggled
 * descriptive fields, which raises the minimum spacing needed to avoid
 * overlap. The old logic wrote that minimum back into the user's stored
 * spacing, so spacing ratcheted UP when cards grew but never back DOWN when
 * they shrank: after toggling fields off, the tree stayed spread out and the
 * connector lines didn't re-compact. The fix keeps the user's preference
 * separate and derives the applied value with this primitive, so spacing
 * tracks the card size in both directions.
 */

describe('effectiveCardSpacing (#669 follow-up)', () => {
	it('grows to the minimum when the preference would overlap cards', () => {
		expect(effectiveCardSpacing(250, 300)).toBe(300);
	});

	it('keeps the user preference when it already clears the minimum', () => {
		expect(effectiveCardSpacing(350, 300)).toBe(350);
	});

	it('returns the shared value when preference equals minimum', () => {
		expect(effectiveCardSpacing(300, 300)).toBe(300);
	});

	it('re-compacts back toward the preference as the minimum drops (the shrink-back fix)', () => {
		const preference = 250;
		// Toggle descriptive fields ON: cards widen, minimum climbs above pref.
		expect(effectiveCardSpacing(preference, 320)).toBe(320);
		// Toggle them OFF again: minimum falls — applied spacing must fall too,
		// not stay ratcheted at 320.
		expect(effectiveCardSpacing(preference, 290)).toBe(290);
		// All the way back to base: the user's preference re-asserts itself.
		expect(effectiveCardSpacing(preference, 196)).toBe(250);
	});

	it('never drops below the minimum even for a tight preference', () => {
		expect(effectiveCardSpacing(140, 196)).toBe(196);
	});
});
