/**
 * Marriage type presets (#628).
 *
 * A fixed list of common non-standard union types offered as quick picks in
 * the person modal. The field itself accepts any free-text value — these are
 * suggestions, not an enforced enumeration. Presented as a dropdown plus a
 * "Custom..." option that reveals a free-text input.
 */
export const MARRIAGE_TYPE_PRESETS = [
	'Common-law marriage',
	'Cohabitation',
	'Domestic (civil) partnership',
	'Putative marriage',
	'Concubinage',
] as const;

export type MarriageTypePreset = (typeof MARRIAGE_TYPE_PRESETS)[number];

/**
 * Append the marriage type as a parenthetical suffix to a marriage label,
 * e.g. `"Marriage to Jane Doe"` -> `"Marriage to Jane Doe (Common-law marriage)"`.
 *
 * Returns the label unchanged when the type is empty or display is disabled,
 * so callers can wrap unconditionally. Pure — used by the timeline marriage
 * rows (#628) and available to any future display surface.
 */
export function withMarriageType(
	label: string,
	marriageType: string | undefined,
	show: boolean
): string {
	const trimmed = marriageType?.trim();
	return show && trimmed ? `${label} (${trimmed})` : label;
}
