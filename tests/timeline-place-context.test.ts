import { describe, expect, it } from 'vitest';
import { qualifyPlaceWithAncestors } from '../src/dynamic-content/renderers/place-context';

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
});
