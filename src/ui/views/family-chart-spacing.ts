/**
 * Effective family-chart card spacing: the larger of the user's chosen spacing
 * and the current style/content minimum.
 *
 * #669 follow-up — the minimum-spacing floor used to be written back into the
 * stored preference, which ratcheted spacing up when cards grew (toggling
 * descriptive fields on, or a long-named Circle card widening on fit) but never
 * back down when they shrank. The tree stayed spread out and the connector
 * lines didn't re-compact after fields were toggled off. Keeping the user's
 * preference separate and deriving the applied value here lets the tree
 * re-compact toward the preference whenever the minimum drops again.
 *
 * @param preference the user's chosen spacing (px); preserved across resizes
 * @param minimum the current minimum safe spacing for the card style + content
 * @returns the spacing to apply: never below the minimum (no overlap), never
 *          above the preference once the minimum allows it (no stale spread)
 */
export function effectiveCardSpacing(preference: number, minimum: number): number {
	return Math.max(preference, minimum);
}
