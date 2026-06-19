import { describe, expect, it } from 'vitest';
import { compareMembershipsByStartDate, type MembershipSortKey } from '../src/organizations/membership-sort';

/**
 * #743 — Entity Profile memberships sort by earliest start year, undated last,
 * with an ended membership winning a tied start year over an ongoing one, then
 * alphabetical by org name.
 */
const sort = (keys: MembershipSortKey[]): string[] =>
	[...keys].sort(compareMembershipsByStartDate).map(k => k.name);

describe('compareMembershipsByStartDate (#743)', () => {
	it('orders by earliest start year', () => {
		expect(sort([
			{ fromYear: 18, hasEnd: false, name: 'Empire' },
			{ fromYear: -36, hasEnd: true, name: 'Republic' },
			{ fromYear: -22, hasEnd: true, name: 'Jedi Order' }
		])).toEqual(['Republic', 'Jedi Order', 'Empire']);
	});

	it('sorts undated memberships last', () => {
		expect(sort([
			{ fromYear: undefined, hasEnd: false, name: 'Mystery Guild' },
			{ fromYear: -36, hasEnd: true, name: 'Republic' }
		])).toEqual(['Republic', 'Mystery Guild']);
	});

	it('on a tied start year, an ended membership wins over a current one', () => {
		expect(sort([
			{ fromYear: -13, hasEnd: false, name: 'Galactic Senate' },   // ongoing
			{ fromYear: -13, hasEnd: true, name: 'Naboo Royal House' }    // ended
		])).toEqual(['Naboo Royal House', 'Galactic Senate']);
	});

	it('breaks remaining ties alphabetically by name', () => {
		expect(sort([
			{ fromYear: -13, hasEnd: true, name: 'Senate' },
			{ fromYear: -13, hasEnd: true, name: 'House Organa' }
		])).toEqual(['House Organa', 'Senate']);
	});

	it('orders two undated memberships alphabetically', () => {
		expect(sort([
			{ fromYear: undefined, hasEnd: false, name: 'Zeta' },
			{ fromYear: undefined, hasEnd: true, name: 'Alpha' }
		])).toEqual(['Alpha', 'Zeta']);
	});
});
