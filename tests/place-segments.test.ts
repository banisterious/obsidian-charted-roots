import { describe, expect, it } from 'vitest';
import {
	splitPlaceSegments,
	sharedLeafSegmentCount,
	isSameLocationDifferentJurisdiction,
	isSegmentAncestor,
	placeNamesEqual,
} from '../src/utils/place-segments';

/**
 * #643 / #635 / #614 — the shared segment-aware place-comparison primitive.
 * These fence the three questions the places work keeps asking: same location
 * under a different historical jurisdiction, ancestor/descendant containment,
 * and exact same-place identity, all over comma-separated leaf-first names.
 */

describe('splitPlaceSegments', () => {
	it('splits a hierarchical name leaf-first', () => {
		expect(splitPlaceSegments('Malden, Essex, Massachusetts, USA')).toEqual([
			'Malden', 'Essex', 'Massachusetts', 'USA',
		]);
	});

	it('trims whitespace and drops empty segments', () => {
		expect(splitPlaceSegments('  Tatooine  ')).toEqual(['Tatooine']);
		expect(splitPlaceSegments('A,,B,')).toEqual(['A', 'B']);
	});

	it('returns an empty array for empty input', () => {
		expect(splitPlaceSegments('')).toEqual([]);
		expect(splitPlaceSegments('   ')).toEqual([]);
	});
});

describe('sharedLeafSegmentCount', () => {
	it('counts matching leaf-side segments before divergence', () => {
		const a = ['Malden', 'Essex', 'Massachusetts', 'USA'];
		const b = ['Malden', 'Essex', 'Massachusetts Bay Colony', 'British America'];
		expect(sharedLeafSegmentCount(a, b)).toBe(2);
	});

	it('is case- and spacing-insensitive', () => {
		expect(sharedLeafSegmentCount(['Malden '], ['malden'])).toBe(1);
	});

	it('is 0 when the leaves differ', () => {
		expect(sharedLeafSegmentCount(['Lars Homestead', 'Tatooine'], ['Tatooine'])).toBe(0);
	});
});

describe('isSameLocationDifferentJurisdiction (#635)', () => {
	it('matches the same town under different historical jurisdictions', () => {
		expect(isSameLocationDifferentJurisdiction(
			'Malden, Essex, Massachusetts Bay Colony, British America',
			'Malden, Essex, Massachusetts, USA',
		)).toBe(true);
	});

	it('does not match unrelated places that only share a leaf name', () => {
		// Two different Springfields: share only the leaf, so below the
		// leaf+parent threshold.
		expect(isSameLocationDifferentJurisdiction(
			'Springfield, Sangamon, Illinois, USA',
			'Springfield, Hampden, Massachusetts, USA',
		)).toBe(false);
	});

	it('does not match an identical name (same place, not a variant)', () => {
		expect(isSameLocationDifferentJurisdiction(
			'Malden, Essex, Massachusetts, USA',
			'Malden, Essex, Massachusetts, USA',
		)).toBe(false);
	});

	it('does not match a pure ancestor/descendant pair', () => {
		expect(isSameLocationDifferentJurisdiction(
			'Lars Homestead, Tatooine',
			'Tatooine',
		)).toBe(false);
	});

	it('honors a custom minimum shared-leaf threshold', () => {
		// With only the leaf required, two same-leaf places match.
		expect(isSameLocationDifferentJurisdiction(
			'Springfield, Illinois',
			'Springfield, Massachusetts',
			1,
		)).toBe(true);
	});

	it('returns false on empty input', () => {
		expect(isSameLocationDifferentJurisdiction('', 'Tatooine')).toBe(false);
	});
});

describe('isSegmentAncestor (#643)', () => {
	it('detects a parent place containing a child place', () => {
		expect(isSegmentAncestor('Tatooine', 'Lars Homestead, Tatooine')).toBe(true);
	});

	it('detects a multi-segment ancestor as a root-side tail', () => {
		expect(isSegmentAncestor('Massachusetts, USA', 'Malden, Essex, Massachusetts, USA')).toBe(true);
		expect(isSegmentAncestor('USA', 'Malden, Essex, Massachusetts, USA')).toBe(true);
	});

	it('rejects a non-tail subsequence', () => {
		// "Essex, USA" is not the root-side tail (which is "Massachusetts, USA").
		expect(isSegmentAncestor('Essex, USA', 'Malden, Essex, Massachusetts, USA')).toBe(false);
	});

	it('rejects equal chains (not strictly an ancestor)', () => {
		expect(isSegmentAncestor('Tatooine', 'Tatooine')).toBe(false);
	});

	it('rejects when the would-be ancestor is longer', () => {
		expect(isSegmentAncestor('Lars Homestead, Tatooine', 'Tatooine')).toBe(false);
	});
});

describe('placeNamesEqual (#614)', () => {
	it('matches identical chains regardless of case and spacing', () => {
		expect(placeNamesEqual('Munich, Bavaria', 'munich,  bavaria')).toBe(true);
	});

	it('does not match a place against its parent region', () => {
		// The substring-fallback bug #614 guards against: a city must not equal
		// its region.
		expect(placeNamesEqual('Munich, Bavaria', 'Bavaria')).toBe(false);
	});

	it('does not match different chains of equal length', () => {
		expect(placeNamesEqual('Springfield, Illinois', 'Springfield, Massachusetts')).toBe(false);
	});

	it('returns false on empty input', () => {
		expect(placeNamesEqual('', '')).toBe(false);
	});
});
