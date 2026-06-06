import { describe, expect, it } from 'vitest';
import {
	placeSpellingSignature,
	consolidatePlaceVariants,
	mergeVariantHistoricalNames,
} from '../src/gedcom/gedcom-place-variants';
import { isSameLocationDifferentJurisdiction } from '../src/utils/place-segments';

/**
 * #687 — conservative consolidation of variant place spellings on GEDCOM import.
 * The jurisdiction predicate mirrors what the importer injects: the segment-aware
 * "same town, different higher tier" test requiring the leaf plus one more
 * segment to agree, so a leaf-only collision never merges.
 */
const sameLocationVariant = (a: string, b: string): boolean =>
	isSameLocationDifferentJurisdiction(a, b);

describe('placeSpellingSignature (#687)', () => {
	it('folds accents, case, and spacing to one signature', () => {
		expect(placeSpellingSignature('Montréal, Québec, Canada'))
			.toBe(placeSpellingSignature('montreal,  Quebec , Canada'));
	});

	it('folds a trailing period (St. vs St)', () => {
		expect(placeSpellingSignature('St. Louis, Missouri'))
			.toBe(placeSpellingSignature('St Louis, Missouri'));
	});

	it('keeps genuinely different places apart', () => {
		expect(placeSpellingSignature('Quebec, Canada'))
			.not.toBe(placeSpellingSignature('Quebec, Quebec, Canada'));
	});
});

describe('consolidatePlaceVariants (#687)', () => {
	it('merges accent/case/spacing variants and keeps the richest form', () => {
		const { canonicalOf, variantsOf } = consolidatePlaceVariants(
			['Montreal, Quebec, Canada', 'Montréal, Québec, Canada', 'montreal, quebec, canada'],
			sameLocationVariant,
		);
		// The accented form is preferred as canonical (richest spelling).
		const canonical = canonicalOf.get('Montreal, Quebec, Canada');
		expect(canonical).toBe('Montréal, Québec, Canada');
		// All three forms resolve to the same canonical.
		expect(canonicalOf.get('Montréal, Québec, Canada')).toBe(canonical);
		expect(canonicalOf.get('montreal, quebec, canada')).toBe(canonical);
		// The other two forms are preserved as variants.
		expect(new Set(variantsOf.get(canonical!))).toEqual(
			new Set(['Montreal, Quebec, Canada', 'montreal, quebec, canada']),
		);
	});

	it('does NOT merge two distinct places that only share a leaf name', () => {
		// "Quebec, Canada" (the province) must not fold into "Quebec, Quebec, Canada".
		const { canonicalOf, variantsOf } = consolidatePlaceVariants(
			['Quebec, Canada', 'Quebec, Quebec, Canada'],
			sameLocationVariant,
		);
		expect(canonicalOf.get('Quebec, Canada')).toBe('Quebec, Canada');
		expect(canonicalOf.get('Quebec, Quebec, Canada')).toBe('Quebec, Quebec, Canada');
		expect(variantsOf.size).toBe(0);
	});

	it('merges a same-town, different-jurisdiction-tier variant', () => {
		// Same town (Malden, Essex) under modern vs colonial higher tiers (#635 shape).
		const modern = 'Malden, Essex, Massachusetts, USA';
		const colonial = 'Malden, Essex, Massachusetts Bay Colony, British America';
		const { canonicalOf, variantsOf } = consolidatePlaceVariants(
			[modern, colonial],
			sameLocationVariant,
		);
		const canonical = canonicalOf.get(modern);
		expect(canonicalOf.get(colonial)).toBe(canonical);
		// One of the two is kept; the other is preserved as a variant (no data loss).
		expect(variantsOf.get(canonical!)).toHaveLength(1);
	});

	it('does NOT merge a depth difference (a missing middle tier is ambiguous)', () => {
		// "Paris, France" might be Paris-the-city written short, or a different Paris
		// in another region. Conservative mode leaves the ambiguity alone.
		const { canonicalOf, variantsOf } = consolidatePlaceVariants(
			['Paris, France', 'Paris, Île-de-France, France'],
			sameLocationVariant,
		);
		expect(canonicalOf.get('Paris, France')).toBe('Paris, France');
		expect(canonicalOf.get('Paris, Île-de-France, France')).toBe('Paris, Île-de-France, France');
		expect(variantsOf.size).toBe(0);
	});

	it('leaves a clean place list untouched (no variants, identity mapping)', () => {
		const places = ['Boston, Suffolk, Massachusetts, USA', 'Chicago, Cook, Illinois, USA'];
		const { canonicalOf, variantsOf } = consolidatePlaceVariants(places, sameLocationVariant);
		expect(canonicalOf.get(places[0])).toBe(places[0]);
		expect(canonicalOf.get(places[1])).toBe(places[1]);
		expect(variantsOf.size).toBe(0);
	});

	it('maps every member (including the canonical) in membersOf', () => {
		const { membersOf } = consolidatePlaceVariants(
			['Montreal, Quebec, Canada', 'Montréal, Québec, Canada'],
			sameLocationVariant,
		);
		const members = membersOf.get('Montréal, Québec, Canada');
		expect(new Set(members)).toEqual(
			new Set(['Montreal, Quebec, Canada', 'Montréal, Québec, Canada']),
		);
	});
});

describe('mergeVariantHistoricalNames (#687)', () => {
	it('adds new variants and skips the canonical and existing entries', () => {
		const merged = mergeVariantHistoricalNames(
			[{ name: 'Montreal, QC, Canada' }],
			'Montréal, Québec, Canada',
			['Montréal, Québec, Canada', 'Montreal, QC, Canada', 'Montreal, Quebec, Canada'],
		);
		// Canonical skipped, the already-present QC form not duplicated, the new
		// "Quebec" form added.
		expect(merged.map(h => h.name)).toEqual(['Montreal, QC, Canada', 'Montreal, Quebec, Canada']);
	});

	it('dedupes case-insensitively', () => {
		const merged = mergeVariantHistoricalNames([], 'Hartford, Connecticut', ['hartford, connecticut', 'Hartford, CT']);
		// The case-variant of the canonical is skipped; only the distinct form lands.
		expect(merged.map(h => h.name)).toEqual(['Hartford, CT']);
	});

	it('returns the existing list unchanged when nothing is new', () => {
		const existing = [{ name: 'Old Form' }];
		const merged = mergeVariantHistoricalNames(existing, 'New Form', []);
		expect(merged).toEqual(existing);
	});
});
