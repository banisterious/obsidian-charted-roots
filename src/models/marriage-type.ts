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
