/**
 * Family Chart Overlay Z-Order (#450)
 *
 * Decides whether the custom-relationships overlay group should paint
 * UNDER the structural family-link layer or ON TOP of it.
 *
 * The original choice (from #386) was "always under" so heavy stacks of
 * overlay arcs on a single endpoint pair couldn't occlude the structural
 * parent-child / spouse line. That's the right call when stacking is
 * heavy, but for the typical case (a few non-stacked overlay arcs per
 * focal person) it hides the feature being demonstrated — arcs route
 * through the children-row link bundle and disappear behind it.
 *
 * The rule: paint UNDER when at least one pair has ≥ 3 overlay arcs
 * stacked on it (the original #386 trigger), else paint ON TOP. The
 * threshold is the count of *arcs actually drawn* per pair, after
 * structural-counterpart restyling has dropped any entries that
 * restyle the structural link in place (#404).
 */

const HEAVY_STACK_THRESHOLD = 3;

/**
 * Returns true when the overlay should paint UNDER `links_view` to
 * preserve the visibility of structural family links beneath a heavy
 * stack of overlay arcs. False means paint on top of family links.
 *
 * @param maxArcStackDepth The maximum number of overlay arcs drawn on
 *   any single endpoint pair, after structural-counterpart restyling.
 */
export function shouldPaintOverlayUnderLinks(maxArcStackDepth: number): boolean {
	return maxArcStackDepth >= HEAVY_STACK_THRESHOLD;
}
