import { describe, expect, it } from 'vitest';
import {
	orderMovementPlaces,
	buildLocationSequence,
	collapseNestedLocations,
	collapseConsecutiveLocations,
	extractMigrationLegs,
	rollUpToAttestedAncestor,
} from '../src/statistics/services/migration-analysis';
import { placeNamesEqual, isSegmentAncestor } from '../src/utils/place-segments';

/**
 * #643 — event-driven migration analysis. These fence the order-and-collapse
 * logic that turns a person's dated movement events into "did they move, and
 * where to". The same-location predicate here mirrors the service's string side
 * (graph ancestry is exercised separately against a real vault).
 */

const sameLocation = (a: string, b: string): boolean =>
	placeNamesEqual(a, b) || isSegmentAncestor(a, b) || isSegmentAncestor(b, a);

describe('orderMovementPlaces (#643)', () => {
	it('orders by attested year', () => {
		expect(orderMovementPlaces([
			{ place: 'Coruscant', year: 1230 },
			{ place: 'Shili', year: 1210 },
			{ place: 'Mandalore', year: 1220 },
		])).toEqual(['Shili', 'Mandalore', 'Coruscant']);
	});

	it('keeps undated places at the end', () => {
		expect(orderMovementPlaces([
			{ place: 'Undated', year: null },
			{ place: 'Early', year: 1000 },
		])).toEqual(['Early', 'Undated']);
	});

	it('drops blank place names', () => {
		expect(orderMovementPlaces([
			{ place: '', year: 1000 },
			{ place: 'Real', year: 1010 },
		])).toEqual(['Real']);
	});
});

describe('buildLocationSequence (#643)', () => {
	it('puts birth first and death last around the movement places', () => {
		expect(buildLocationSequence('Stewjon', ['Coruscant'], 'Tatooine'))
			.toEqual(['Stewjon', 'Coruscant', 'Tatooine']);
	});

	it('omits missing endpoints (living migrant with only events)', () => {
		expect(buildLocationSequence('', ['Shili', 'Coruscant'], ''))
			.toEqual(['Shili', 'Coruscant']);
	});

	it('handles birth-and-death only (the fallback shape)', () => {
		expect(buildLocationSequence('Stewjon', [], 'Tatooine'))
			.toEqual(['Stewjon', 'Tatooine']);
	});
});

describe('collapseNestedLocations (#643)', () => {
	it('treats a child place and its parent as one location', () => {
		// Tatooine -> Lars Homestead, Tatooine should NOT read as a move.
		const collapsed = collapseNestedLocations(
			['Tatooine', 'Lars Homestead, Tatooine'],
			sameLocation,
		);
		expect(collapsed).toHaveLength(1);
	});

	it('keeps genuinely distinct locations (a real move)', () => {
		expect(collapseNestedLocations(['Shili', 'Coruscant'], sameLocation))
			.toEqual(['Shili', 'Coruscant']);
	});

	it('reports more than one location for a lifetime A -> B -> A trip', () => {
		// Born A, lived B, died A: distinct locations = {A, B} -> moved.
		const collapsed = collapseNestedLocations(
			['Tatooine', 'Coruscant', 'Tatooine'],
			sameLocation,
		);
		expect(collapsed).toEqual(['Tatooine', 'Coruscant']);
		expect(collapsed.length).toBeGreaterThan(1);
	});

	it('collapses to one location when the person never really left', () => {
		const collapsed = collapseNestedLocations(
			['Tatooine', 'Tatooine', 'Lars Homestead, Tatooine'],
			sameLocation,
		);
		expect(collapsed).toHaveLength(1);
	});
});

describe('collapseConsecutiveLocations (#684 per-leg)', () => {
	it('keeps a round trip as three stops (unlike the global collapse)', () => {
		expect(collapseConsecutiveLocations(['Tatooine', 'Coruscant', 'Tatooine'], sameLocation))
			.toEqual(['Tatooine', 'Coruscant', 'Tatooine']);
	});

	it('merges adjacent duplicates', () => {
		expect(collapseConsecutiveLocations(['Shili', 'Shili', 'Coruscant'], sameLocation))
			.toEqual(['Shili', 'Coruscant']);
	});

	it('merges an adjacent parent/child hop into one stop', () => {
		// Tatooine -> Lars Homestead (on Tatooine) -> Coruscant is one move, not two.
		expect(collapseConsecutiveLocations(
			['Tatooine', 'Lars Homestead, Tatooine', 'Coruscant'],
			sameLocation,
		)).toEqual(['Tatooine', 'Coruscant']);
	});

	it('returns a single stop when the person never left', () => {
		expect(collapseConsecutiveLocations(['Tatooine', 'Tatooine'], sameLocation))
			.toEqual(['Tatooine']);
	});

	it('drops blank entries', () => {
		expect(collapseConsecutiveLocations(['', 'Shili', '', 'Coruscant'], sameLocation))
			.toEqual(['Shili', 'Coruscant']);
	});
});

describe('extractMigrationLegs (#684)', () => {
	it('splits stops into consecutive legs', () => {
		expect(extractMigrationLegs(['Shili', 'Mandalore', 'Coruscant']))
			.toEqual([['Shili', 'Mandalore'], ['Mandalore', 'Coruscant']]);
	});

	it('gives a round trip both of its legs', () => {
		expect(extractMigrationLegs(['Tatooine', 'Ator', 'Tatooine']))
			.toEqual([['Tatooine', 'Ator'], ['Ator', 'Tatooine']]);
	});

	it('returns no legs for a single stop or none', () => {
		expect(extractMigrationLegs(['Tatooine'])).toEqual([]);
		expect(extractMigrationLegs([])).toEqual([]);
	});
});

describe('per-leg route aggregation (#684 acceptance)', () => {
	// Mirrors the service's pass-2b: collapse each person's sequence to stops, take
	// the legs, and tally. Roll-up is exercised separately (rollUpToAttestedAncestor
	// above); here every place is a distinct leaf, so a leg's endpoints count as-is.
	function tallyRoutes(sequences: string[][]): Map<string, number> {
		const counts = new Map<string, number>();
		for (const seq of sequences) {
			const stops = collapseConsecutiveLocations(seq, sameLocation);
			for (const [from, to] of extractMigrationLegs(stops)) {
				if (sameLocation(from, to)) continue;
				const key = `${from} -> ${to}`;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}
		return counts;
	}

	it('counts a group share leg for every member, even from different birthplaces', () => {
		// Family of four moves S -> N. Father + two children were born at S; the
		// mother was born at M and moved M -> S -> N. The shared S -> N leg is 4.
		const counts = tallyRoutes([
			['S', 'N'],          // father
			['S', 'N'],          // child 1
			['S', 'N'],          // child 2
			['M', 'S', 'N'],     // mother
		]);
		expect(counts.get('S -> N')).toBe(4);
		expect(counts.get('M -> S')).toBe(1);
	});

	it('shows round-trip and one-way movers together on the shared leg', () => {
		// Cliegg: Tatooine -> Ator -> Tatooine (round trip, net no move). Owen:
		// Ator -> Tatooine. Both made the Ator -> Tatooine leg.
		const counts = tallyRoutes([
			['Tatooine', 'Ator', 'Tatooine'],  // Cliegg
			['Ator', 'Tatooine'],              // Owen
		]);
		expect(counts.get('Ator -> Tatooine')).toBe(2);
		expect(counts.get('Tatooine -> Ator')).toBe(1);
	});
});

describe('rollUpToAttestedAncestor (#643 sub-place roll-up)', () => {
	// Ancestors are passed as node ids; the resolver returns the representative
	// display string for an attested ancestor (so a sub-place destination merges
	// into the bucket the coarser place already uses), or null when unattested.
	// Here node "coruscant-id" is attested and represented as "Coruscant".
	const attestedNameFor = (id: string): string | null =>
		id === 'coruscant-id' ? 'Coruscant' : null;

	it('rolls a sub-place up to its attested parent', () => {
		expect(rollUpToAttestedAncestor('Jedi Temple', ['coruscant-id'], attestedNameFor))
			.toBe('Coruscant');
	});

	it('returns the nearest attested ancestor, not a farther one', () => {
		const resolver = (id: string): string | null => {
			if (id === 'coruscant-id') return 'Coruscant';
			if (id === 'coruscant-system-id') return 'Coruscant System';
			return null;
		};
		expect(rollUpToAttestedAncestor(
			'Jedi Temple',
			['coruscant-id', 'coruscant-system-id', 'galaxy-id'],
			resolver,
		)).toBe('Coruscant');
	});

	it('keeps the place when no ancestor is attested', () => {
		expect(rollUpToAttestedAncestor('Jedi Temple', ['coruscant-id'], () => null))
			.toBe('Jedi Temple');
	});

	it('skips an unattested nearer ancestor to reach an attested farther one', () => {
		expect(rollUpToAttestedAncestor(
			'Jedi Temple',
			['temple-district-id', 'coruscant-id'],
			attestedNameFor,
		)).toBe('Coruscant');
	});

	it('rolls up to the attested representative even when spelled differently', () => {
		// The link basename ("Suffolk County Massachusetts") differs from the place
		// title; matching is by node id, and the representative string is returned.
		const resolver = (id: string): string | null =>
			id === 'suffolk-id' ? 'Suffolk County Massachusetts' : null;
		expect(rollUpToAttestedAncestor('Boston Suffolk County', ['suffolk-id'], resolver))
			.toBe('Suffolk County Massachusetts');
	});

	it('keeps a place with no ancestors at all', () => {
		expect(rollUpToAttestedAncestor('Coruscant', [], attestedNameFor))
			.toBe('Coruscant');
	});
});
