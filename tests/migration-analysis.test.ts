import { describe, expect, it } from 'vitest';
import {
	orderMovementPlaces,
	buildLocationSequence,
	collapseNestedLocations,
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
