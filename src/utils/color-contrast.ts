/**
 * Color-contrast helpers for keeping graphical elements visible against
 * their background regardless of the active theme.
 *
 * Introduced for #668: the Family Chart connector lines are stroked with
 * the theme's `--text-color`, which the High Contrast theme deliberately
 * sets to black so card labels read against the bright (cyan/magenta)
 * card fills. Lines, however, sit on the chart *background* — black on the
 * High Contrast dark background (`#000`) renders them invisible. Rather
 * than couple line colour to a new per-theme setting (which would not
 * self-heal for users who already selected the theme), we derive a
 * line colour at render time: keep the theme's intended colour when it
 * contrasts the background, otherwise substitute a visible tone.
 */

export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/**
 * Parse a CSS colour string into RGB components. Handles the two shapes the
 * Family Chart theme presets emit — `#rgb` / `#rrggbb` hex and
 * `rgb(r, g, b)` — and returns `null` for anything else (named colours,
 * `var(...)`, etc.) so callers can fall back to a no-op.
 */
export function parseColorToRgb(color: string): Rgb | null {
	if (!color) return null;
	const value = color.trim();

	const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (hexMatch) {
		let hex = hexMatch[1];
		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}
		return {
			r: parseInt(hex.substring(0, 2), 16),
			g: parseInt(hex.substring(2, 4), 16),
			b: parseInt(hex.substring(4, 6), 16),
		};
	}

	const rgbMatch = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
	if (rgbMatch) {
		return {
			r: Number(rgbMatch[1]),
			g: Number(rgbMatch[2]),
			b: Number(rgbMatch[3]),
		};
	}

	return null;
}

/**
 * Perceived luminance on a 0..1 scale (ITU-R BT.601 weighting — the same
 * formula already used by `getContrastColor`). 0 = black, 1 = white.
 */
export function perceivedLuminance(rgb: Rgb): number {
	return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/**
 * Minimum luminance separation below which a line is treated as too close to
 * its background to see. The working themes stroke white lines on dark
 * backgrounds (separation ~0.87); only the High Contrast dark case
 * (black-on-black, separation 0) falls under this margin, so it is the only
 * theme this guard rewrites.
 */
export const MIN_LINE_LUMINANCE_SEPARATION = 0.25;

/**
 * Return a line/stroke colour guaranteed to be visible against `background`.
 *
 * When `intended` already separates from the background by at least
 * {@link MIN_LINE_LUMINANCE_SEPARATION}, it is returned unchanged so each
 * theme keeps its deliberately tuned line colour. Otherwise a contrasting
 * tone is substituted (white on a dark background, black on a light one).
 * If either colour cannot be parsed, `intended` is returned unchanged.
 */
export function ensureVisibleLineColor(intended: string, background: string): string {
	const intendedRgb = parseColorToRgb(intended);
	const backgroundRgb = parseColorToRgb(background);
	if (!intendedRgb || !backgroundRgb) return intended;

	const intendedL = perceivedLuminance(intendedRgb);
	const backgroundL = perceivedLuminance(backgroundRgb);

	if (Math.abs(intendedL - backgroundL) >= MIN_LINE_LUMINANCE_SEPARATION) {
		return intended;
	}

	return backgroundL < 0.5 ? '#ffffff' : '#000000';
}
