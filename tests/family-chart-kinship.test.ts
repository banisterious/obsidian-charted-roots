import { describe, expect, it } from 'vitest';
import { arePersonsSpouses, type KinshipPerson } from '../src/ui/views/family-chart-kinship';

/**
 * #694 — The Family Chart's kinship labels marked two people as "Spouse"
 * whenever they shared a child, because the label was inferred from link
 * geometry (f3 connects co-parents with a straight line so the shared child
 * can branch from the midpoint, and a straight line reads as a spouse link).
 * `arePersonsSpouses` is the data-driven gate: a connector is only labelled
 * "Spouse" when the two endpoints are actually spouses in the relationship
 * data. Reported by @doctorwodka.
 */
function person(id: string, spouses: string[] = []): KinshipPerson {
	return { id, rels: { spouses } };
}

describe('arePersonsSpouses', () => {
	it('is true for a reciprocal spouse pair', () => {
		const a = person('a', ['b']);
		const b = person('b', ['a']);
		expect(arePersonsSpouses(a, b)).toBe(true);
		expect(arePersonsSpouses(b, a)).toBe(true);
	});

	it('is false for co-parents who are not spouses (the #694 case)', () => {
		// Mother and father share a child but neither lists the other as a spouse.
		const mother = person('mother', []);
		const father = person('father', []);
		expect(arePersonsSpouses(mother, father)).toBe(false);
	});

	it('is true when only one side lists the other (lenient reciprocity)', () => {
		const a = person('a', ['b']);
		const b = person('b', []);
		expect(arePersonsSpouses(a, b)).toBe(true);
		expect(arePersonsSpouses(b, a)).toBe(true);
	});

	it('is true for a multi-spouse hub linked to one of its spouses', () => {
		const hub = person('hub', ['s1', 's2', 's3']);
		const s2 = person('s2', ['hub']);
		expect(arePersonsSpouses(hub, s2)).toBe(true);
	});

	it('is false when a person is a spouse of someone else but not of this partner', () => {
		// `a` is married to `x`, and co-parents a child with `b` — not married to b.
		const a = person('a', ['x']);
		const b = person('b', ['y']);
		expect(arePersonsSpouses(a, b)).toBe(false);
	});

	it('is false when either person is missing', () => {
		const a = person('a', ['b']);
		expect(arePersonsSpouses(a, undefined)).toBe(false);
		expect(arePersonsSpouses(undefined, a)).toBe(false);
		expect(arePersonsSpouses(undefined, undefined)).toBe(false);
	});
});
