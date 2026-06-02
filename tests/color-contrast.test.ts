import { describe, expect, it } from 'vitest';
import {
	ensureVisibleLineColor,
	parseColorToRgb,
	perceivedLuminance,
} from '../src/utils/color-contrast';

/**
 * #668 — the Family Chart High Contrast theme strokes connector lines with
 * its `--text-color`, which it sets to black so card labels read against
 * the bright card fills. On the High Contrast *dark* background (`#000`)
 * those black lines vanish. `ensureVisibleLineColor` keeps each theme's
 * intended line colour when it contrasts the background and substitutes a
 * visible tone only when it does not.
 */
describe('parseColorToRgb', () => {
	it('parses 6-digit hex', () => {
		expect(parseColorToRgb('#00ffff')).toEqual({ r: 0, g: 255, b: 255 });
	});

	it('parses 3-digit shorthand hex', () => {
		expect(parseColorToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
	});

	it('parses rgb() form (the preset background shape)', () => {
		expect(parseColorToRgb('rgb(33, 33, 33)')).toEqual({ r: 33, g: 33, b: 33 });
	});

	it('parses rgba() form', () => {
		expect(parseColorToRgb('rgba(250, 250, 250, 0.5)')).toEqual({ r: 250, g: 250, b: 250 });
	});

	it('returns null for unparseable colours', () => {
		expect(parseColorToRgb('var(--text-color)')).toBeNull();
		expect(parseColorToRgb('rebeccapurple')).toBeNull();
		expect(parseColorToRgb('')).toBeNull();
	});
});

describe('perceivedLuminance', () => {
	it('is 0 for black and 1 for white', () => {
		expect(perceivedLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
		expect(perceivedLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
	});
});

describe('ensureVisibleLineColor', () => {
	it('rewrites black-on-black (High Contrast dark) to white', () => {
		expect(ensureVisibleLineColor('#000000', '#000000')).toBe('#ffffff');
	});

	it('keeps white lines on the Classic dark background', () => {
		expect(ensureVisibleLineColor('#ffffff', 'rgb(33, 33, 33)')).toBe('#ffffff');
	});

	it('keeps dark lines on a light High Contrast background', () => {
		// Light mode still has enough separation; the CSS light override also
		// supersedes this value, but the helper must not need rescuing here.
		expect(ensureVisibleLineColor('#000000', '#ffffff')).toBe('#000000');
	});

	it('substitutes black when an invisible line sits on a light background', () => {
		expect(ensureVisibleLineColor('#fefefe', '#ffffff')).toBe('#000000');
	});

	it('returns the intended colour unchanged when a colour cannot be parsed', () => {
		expect(ensureVisibleLineColor('var(--x)', '#000000')).toBe('var(--x)');
		expect(ensureVisibleLineColor('#000000', 'var(--y)')).toBe('#000000');
	});
});
