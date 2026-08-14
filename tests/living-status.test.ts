import { describe, expect, it } from 'vitest';
import { isLivingPerson } from '../src/utils/living-status';

/**
 * #776 — Person statistics "Living" count (and the Statistics dashboard and the
 * people-tab living filter) ignored the explicit `cr_living` flag and required a
 * birth year, so a person set `cr_living: true` (especially with no birthday or
 * in a fictional universe) was never counted as living. The shared
 * `isLivingPerson` helper now treats `cr_living` as authoritative. Reported by
 * @doctorwodka.
 */

const CURRENT_YEAR = 2026;
const THRESHOLD = 100;

describe('isLivingPerson — cr_living is authoritative (#776)', () => {
	it('counts cr_living: true even with no birth year', () => {
		expect(isLivingPerson({ crLiving: true, hasDeathDate: false, birthYear: null, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(true);
	});

	it('counts cr_living: true even when a death date is present', () => {
		expect(isLivingPerson({ crLiving: true, hasDeathDate: true, birthYear: 1900, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(true);
	});

	it('counts cr_living: true for a fictional birth year far outside the real-world threshold', () => {
		// e.g. a canonical fictional year — the flag wins regardless of the date math
		expect(isLivingPerson({ crLiving: true, hasDeathDate: false, birthYear: 8000, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(true);
	});

	it('excludes cr_living: false even when within the age threshold', () => {
		expect(isLivingPerson({ crLiving: false, hasDeathDate: false, birthYear: 2020, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(false);
	});
});

describe('isLivingPerson — date heuristic when no flag (#776)', () => {
	it('is not living with a recorded death date', () => {
		expect(isLivingPerson({ hasDeathDate: true, birthYear: 1990, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(false);
	});

	it('is not living without a birth year', () => {
		expect(isLivingPerson({ hasDeathDate: false, birthYear: null, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(false);
	});

	it('is living when birth year is within the threshold', () => {
		expect(isLivingPerson({ hasDeathDate: false, birthYear: 1990, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(true);
	});

	it('is not living when birth year is beyond the threshold', () => {
		expect(isLivingPerson({ hasDeathDate: false, birthYear: 1900, currentYear: CURRENT_YEAR, threshold: THRESHOLD })).toBe(false);
	});
});
