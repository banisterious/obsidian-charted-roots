import { describe, expect, it } from 'vitest';
import { qualifyPlaceWithAncestors, resolvePlaceContext } from '../src/dynamic-content/renderers/place-context';

/**
 * #701 — Dynamic Timeline Block place context. A leaf place ("London") is
 * qualified with its immediate parent ("London, England"), resolved from the
 * place note hierarchy (parent_place). `qualifyPlaceWithAncestors` is the pure
 * formatter; ancestor names arrive nearest-first (as PlaceGraphService
 * .getAncestors returns them).
 */
describe('qualifyPlaceWithAncestors — timeline place context (#701)', () => {
	it('appends the immediate parent at the default depth of 1', () => {
		expect(qualifyPlaceWithAncestors('London', ['England', 'United Kingdom'])).toBe('London, England');
		expect(qualifyPlaceWithAncestors('Aldera', ['Alderaan'])).toBe('Aldera, Alderaan');
	});

	it('returns the bare leaf when there are no ancestors', () => {
		expect(qualifyPlaceWithAncestors('London', [])).toBe('London');
	});

	it('appends multiple ancestors when a deeper depth is requested', () => {
		expect(
			qualifyPlaceWithAncestors('Lars Homestead', ['Tatooine', 'Tatoo System', 'Outer Rim Territories'], 2)
		).toBe('Lars Homestead, Tatooine, Tatoo System');
	});

	it('caps at the available ancestors when depth exceeds the chain', () => {
		expect(qualifyPlaceWithAncestors('Aldera', ['Alderaan'], 3)).toBe('Aldera, Alderaan');
	});

	it('does not repeat a segment the leaf already carries', () => {
		// A comma-qualified leaf whose immediate parent (England) duplicates an
		// existing segment: England is skipped and the next distinct ancestor
		// fills the depth slot instead — England is never doubled.
		expect(qualifyPlaceWithAncestors('London, England', ['England', 'United Kingdom'])).toBe('London, England, United Kingdom');
	});

	it('skips a duplicate ancestor without consuming the depth slot', () => {
		// Immediate parent duplicates the leaf; the next distinct ancestor is used.
		expect(qualifyPlaceWithAncestors('London', ['London', 'England'])).toBe('London, England');
	});

	it('is case-insensitive when detecting duplicate segments', () => {
		expect(qualifyPlaceWithAncestors('London', ['LONDON', 'England'])).toBe('London, England');
	});

	it('ignores blank ancestor names', () => {
		expect(qualifyPlaceWithAncestors('London', ['', '  ', 'England'])).toBe('London, England');
	});

	it('trims the leaf and returns it unchanged when empty or depth < 1', () => {
		expect(qualifyPlaceWithAncestors('  London  ', ['England'])).toBe('London, England');
		expect(qualifyPlaceWithAncestors('', ['England'])).toBe('');
		expect(qualifyPlaceWithAncestors('London', ['England'], 0)).toBe('London');
	});

	it('appends the whole chain when depth equals the ancestor count (full hierarchy)', () => {
		const ancestors = ['Tatooine', 'Tatoo System', 'Arkanis sector', 'Outer Rim Territories'];
		expect(qualifyPlaceWithAncestors('Lars Homestead', ancestors, ancestors.length)).toBe(
			'Lars Homestead, Tatooine, Tatoo System, Arkanis sector, Outer Rim Territories'
		);
	});
});

/**
 * #705 — configurable place-context depth. `resolvePlaceContext` maps a
 * per-block `place_context` override and the global setting to an
 * { enabled, depth } pair. The sentinel `depth: 0` means "full" — applyPlaceContext
 * translates it to the actual ancestor count before calling the formatter.
 */
describe('resolvePlaceContext — depth resolution (#705)', () => {
	it('uses the global setting when there is no per-block override', () => {
		expect(resolvePlaceContext(undefined, true, 2)).toEqual({ enabled: true, depth: 2 });
		expect(resolvePlaceContext(undefined, false, 2)).toEqual({ enabled: false, depth: 2 });
	});

	it('treats a boolean override as on/off at the global depth', () => {
		expect(resolvePlaceContext(true, false, 3)).toEqual({ enabled: true, depth: 3 });
		expect(resolvePlaceContext(false, true, 3)).toEqual({ enabled: false, depth: 0 });
	});

	it('treats a numeric override as an explicit depth', () => {
		expect(resolvePlaceContext(2, false, 1)).toEqual({ enabled: true, depth: 2 });
	});

	it('treats 0 and "full"/"all" as the full-hierarchy sentinel', () => {
		expect(resolvePlaceContext(0, false, 1)).toEqual({ enabled: true, depth: 0 });
		expect(resolvePlaceContext('full', false, 1)).toEqual({ enabled: true, depth: 0 });
		expect(resolvePlaceContext('All', false, 1)).toEqual({ enabled: true, depth: 0 });
	});

	it('recognizes truthy and falsy string overrides', () => {
		expect(resolvePlaceContext('true', false, 2)).toEqual({ enabled: true, depth: 2 });
		expect(resolvePlaceContext('on', false, 2)).toEqual({ enabled: true, depth: 2 });
		expect(resolvePlaceContext('off', true, 2)).toEqual({ enabled: false, depth: 0 });
		expect(resolvePlaceContext('none', true, 2)).toEqual({ enabled: false, depth: 0 });
		expect(resolvePlaceContext('', true, 2)).toEqual({ enabled: false, depth: 0 });
	});

	it('parses a numeric string override', () => {
		expect(resolvePlaceContext('3', false, 1)).toEqual({ enabled: true, depth: 3 });
	});

	it('clamps negatives to full and floors fractionals', () => {
		expect(resolvePlaceContext(-1, false, 1)).toEqual({ enabled: true, depth: 0 });
		expect(resolvePlaceContext(2.7, false, 1)).toEqual({ enabled: true, depth: 2 });
	});

	it('normalizes a non-finite global depth to 1 (the historical leaf+parent depth)', () => {
		expect(resolvePlaceContext(undefined, true, Number.NaN)).toEqual({ enabled: true, depth: 1 });
	});

	it('falls back to the global setting for an unrecognized string', () => {
		expect(resolvePlaceContext('sideways', true, 2)).toEqual({ enabled: true, depth: 2 });
		expect(resolvePlaceContext('sideways', false, 2)).toEqual({ enabled: false, depth: 2 });
	});
});
