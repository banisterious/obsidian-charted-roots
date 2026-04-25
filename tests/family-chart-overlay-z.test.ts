import { describe, expect, it } from 'vitest';
import { shouldPaintOverlayUnderLinks } from '../src/ui/views/family-chart-overlay-z';

/**
 * #450 — Custom-relationships overlay arcs were intentionally painted UNDER
 * the structural family-link layer to keep heavy overlay stacks from
 * occluding parent-child / spouse lines (#386). That tradeoff hides the
 * typical case (a few non-stacked arcs per focal person) behind the
 * family-link bundle. The fix flips the rule: paint ON TOP by default,
 * fall back to the original "under" behavior only when at least one pair
 * has 3+ overlay arcs stacked on it (the original #386 trigger).
 *
 * `shouldPaintOverlayUnderLinks` is the pure decision function. Fences the
 * threshold so the rule doesn't drift as the renderer evolves.
 */

describe('shouldPaintOverlayUnderLinks (#450)', () => {
	it('paints on top when no pair has more than 2 stacked arcs', () => {
		expect(shouldPaintOverlayUnderLinks(0)).toBe(false);
		expect(shouldPaintOverlayUnderLinks(1)).toBe(false);
		expect(shouldPaintOverlayUnderLinks(2)).toBe(false);
	});

	it('paints under when at least one pair has 3 stacked arcs (#386 trigger)', () => {
		expect(shouldPaintOverlayUnderLinks(3)).toBe(true);
	});

	it('paints under for stacks beyond the threshold', () => {
		expect(shouldPaintOverlayUnderLinks(4)).toBe(true);
		expect(shouldPaintOverlayUnderLinks(10)).toBe(true);
	});

	it('handles the empty-overlay case (no arcs drawn)', () => {
		// Defensive: if no arcs are drawn the overlay group is empty and the
		// z-order decision is moot, but the helper should still return a
		// sensible default rather than throwing on 0.
		expect(shouldPaintOverlayUnderLinks(0)).toBe(false);
	});
});
