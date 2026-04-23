import { describe, expect, it } from 'vitest';
import { aggregateCollections } from '../src/core/collections-aggregator';

/**
 * Regression coverage for #426 — the cross-entity Collections aggregator.
 * The underlying bug was that the Edit Person dropdown and Control Center
 * Collections view scanned person notes only, so a collection first created
 * via the Create Place modal was invisible to them. The pure helper tested
 * here is the shared merge logic the three UI surfaces now call.
 */
describe('aggregateCollections', () => {
	it('empty inputs → empty output', () => {
		expect(aggregateCollections([], [])).toEqual([]);
	});

	it('person-only collections pass through with zero placeCount', () => {
		const result = aggregateCollections(
			[{ name: 'Ancestors', count: 3 }],
			[]
		);
		expect(result).toEqual([
			{ name: 'Ancestors', personCount: 3, placeCount: 0, totalCount: 3 }
		]);
	});

	it('place-only collections pass through with zero personCount', () => {
		// The #426 scenario: Collection created via Create Place only, must
		// still surface to callers (Edit Person dropdown, Control Center list).
		const result = aggregateCollections(
			[],
			[{ name: 'Battle Sites', count: 2 }]
		);
		expect(result).toEqual([
			{ name: 'Battle Sites', personCount: 0, placeCount: 2, totalCount: 2 }
		]);
	});

	it('same name on both sides merges with per-entity counts preserved', () => {
		const result = aggregateCollections(
			[{ name: 'Original Characters', count: 5 }],
			[{ name: 'Original Characters', count: 2 }]
		);
		expect(result).toEqual([
			{ name: 'Original Characters', personCount: 5, placeCount: 2, totalCount: 7 }
		]);
	});

	it('disjoint names from both sides both appear in output', () => {
		const result = aggregateCollections(
			[{ name: 'Ancestors', count: 3 }],
			[{ name: 'Battle Sites', count: 2 }]
		);
		expect(result).toHaveLength(2);
		expect(result.map(c => c.name).sort()).toEqual(['Ancestors', 'Battle Sites']);
	});

	it('sorts by totalCount descending', () => {
		const result = aggregateCollections(
			[
				{ name: 'Small', count: 1 },
				{ name: 'Large', count: 10 },
				{ name: 'Medium', count: 5 }
			],
			[]
		);
		expect(result.map(c => c.name)).toEqual(['Large', 'Medium', 'Small']);
	});

	it('breaks ties alphabetically (case-insensitive)', () => {
		const result = aggregateCollections(
			[
				{ name: 'zebra', count: 2 },
				{ name: 'Apple', count: 2 },
				{ name: 'mango', count: 2 }
			],
			[]
		);
		expect(result.map(c => c.name)).toEqual(['Apple', 'mango', 'zebra']);
	});

	it('ties across person-only vs place-only entries sort alphabetically', () => {
		// A pure-person collection of size 3 and a pure-place collection of
		// size 3 both have totalCount 3; the secondary sort kicks in.
		const result = aggregateCollections(
			[{ name: 'Beta', count: 3 }],
			[{ name: 'Alpha', count: 3 }]
		);
		expect(result.map(c => c.name)).toEqual(['Alpha', 'Beta']);
	});

	it('mixed collection ranks above equal-size single-source collections', () => {
		// Person+place mix sums to 7 and beats single-source 5.
		const result = aggregateCollections(
			[
				{ name: 'Mixed', count: 4 },
				{ name: 'PersonOnly', count: 5 }
			],
			[{ name: 'Mixed', count: 3 }]
		);
		expect(result[0]).toMatchObject({ name: 'Mixed', totalCount: 7 });
		expect(result[1]).toMatchObject({ name: 'PersonOnly', totalCount: 5 });
	});

	it('skips entries with empty-string names (defensive)', () => {
		const result = aggregateCollections(
			[
				{ name: '', count: 3 },
				{ name: 'Real', count: 1 }
			],
			[{ name: '', count: 2 }]
		);
		expect(result).toEqual([
			{ name: 'Real', personCount: 1, placeCount: 0, totalCount: 1 }
		]);
	});

	it('collapses duplicate names within a single input array additively', () => {
		// Shouldn't happen in practice (the source services de-dupe), but
		// defensive against malformed input: duplicate names on one side sum.
		const result = aggregateCollections(
			[
				{ name: 'Dup', count: 2 },
				{ name: 'Dup', count: 3 }
			],
			[]
		);
		expect(result).toEqual([
			{ name: 'Dup', personCount: 5, placeCount: 0, totalCount: 5 }
		]);
	});

	it('zero counts on both sides drop the entry', () => {
		const result = aggregateCollections(
			[{ name: 'Ghost', count: 0 }],
			[{ name: 'Ghost', count: 0 }]
		);
		expect(result).toEqual([]);
	});

	it('realistic mix from the #426 scenario produces expected shape', () => {
		// The full shape callers should see: a collection created on persons
		// (appears on both sides because of cross-reference), a collection
		// created only on places (the #426 scenario), and a person-only
		// collection — all three surface together in the aggregated list.
		const result = aggregateCollections(
			[
				{ name: 'Original Characters', count: 12 },
				{ name: 'Historical Figures', count: 4 }
			],
			[
				{ name: 'Original Characters', count: 3 },
				{ name: 'Battle Sites', count: 2 }
			]
		);
		expect(result).toEqual([
			{ name: 'Original Characters', personCount: 12, placeCount: 3, totalCount: 15 },
			{ name: 'Historical Figures', personCount: 4, placeCount: 0, totalCount: 4 },
			{ name: 'Battle Sites', personCount: 0, placeCount: 2, totalCount: 2 }
		]);
	});
});
