import { describe, expect, it } from 'vitest';
import { compareMembersByJoinDate } from '../src/dynamic-content/renderers/members-renderer';

/**
 * #702 — `sort: date` on the charted-roots-members block. The date branch was
 * declared but never implemented (it floated current members up, then always
 * sorted by name). Members now sort by the era-aware canonical year of their
 * membership start date (`from`), so fictional BBY/ABY join dates order by true
 * chronology. `compareMembersByJoinDate` operates on the pre-resolved canonical
 * year stored on each entry.
 */
describe('compareMembersByJoinDate — member date sort (#702)', () => {
	const member = (fromYear: number | undefined, name: string) => ({ fromYear, name });

	it('orders earlier membership first within a single era (BBY counts down)', () => {
		// BBY 30 = -30 (joined earlier) before BBY 20 = -20.
		const early = member(-30, 'Zed');
		const late = member(-20, 'Anna');
		expect(compareMembersByJoinDate(early, late)).toBeLessThan(0);
		expect(compareMembersByJoinDate(late, early)).toBeGreaterThan(0);
	});

	it('orders across the BBY/ABY boundary by true chronology, not lexically', () => {
		// BBY 5 (-5) precedes ABY 2 (+2); a lexical "ABY" < "BBY" compare would
		// have inverted this.
		const bby = member(-5, 'Bbb');
		const aby = member(2, 'Aaa');
		expect(compareMembersByJoinDate(bby, aby)).toBeLessThan(0);
	});

	it('sorts members with a start date ahead of those without', () => {
		const dated = member(-10, 'Zed');
		const undated = member(undefined, 'Anna');
		expect(compareMembersByJoinDate(dated, undated)).toBeLessThan(0);
		expect(compareMembersByJoinDate(undated, dated)).toBeGreaterThan(0);
	});

	it('falls back to name when neither has a resolved date', () => {
		const anna = member(undefined, 'Anna');
		const zed = member(undefined, 'Zed');
		expect(compareMembersByJoinDate(anna, zed)).toBeLessThan(0);
	});

	it('falls back to name on a same-year tie', () => {
		const anna = member(-15, 'Anna');
		const zed = member(-15, 'Zed');
		expect(compareMembersByJoinDate(anna, zed)).toBeLessThan(0);
		expect(compareMembersByJoinDate(zed, anna)).toBeGreaterThan(0);
	});

	it('sorts a mixed list earliest-first, undated last', () => {
		const list = [
			member(undefined, 'No Date'),
			member(2, 'ABY Two'),
			member(-30, 'BBY Thirty'),
			member(-10, 'BBY Ten'),
		];
		const sorted = [...list].sort(compareMembersByJoinDate);
		expect(sorted.map((m) => m.name)).toEqual(['BBY Thirty', 'BBY Ten', 'ABY Two', 'No Date']);
	});
});
