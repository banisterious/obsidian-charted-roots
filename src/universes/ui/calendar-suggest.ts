/**
 * Calendar suggestion helpers for the Universe wizard (#432 Phase 1).
 *
 * Pure utilities that map a universe name to a built-in `FictionalDateSystem`
 * via slug-matching against the system's `universe` field. Lifted into their
 * own module so the wizard's modal-bearing main file isn't pulled in by
 * unit tests (Modal isn't mockable cheaply).
 */

import type { FictionalDateSystem } from '../../dates/types/date-types';
import { DEFAULT_DATE_SYSTEMS } from '../../dates/constants/default-date-systems';

/**
 * Slug a universe name for matching against a built-in calendar's `universe`
 * field (e.g., "Star Wars" → "star-wars" matches STAR_WARS_CALENDAR.universe).
 * Trims, lowercases, replaces non-alphanumeric runs with single `-`, and
 * strips leading/trailing separators.
 */
export function universeNameToSlug(name: string): string {
	return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Find the built-in calendar whose `universe` field matches the given
 * universe name's slug (used to preselect a sensible default in the wizard).
 * Matches exact, prefix, and superset slugs so fan-canon naming like
 * "Star Wars Legends" still resolves to Galactic Standard. Returns undefined
 * when no built-in is a confident match.
 */
export function suggestBuiltinForUniverseName(name: string): FictionalDateSystem | undefined {
	if (!name.trim()) return undefined;
	const slug = universeNameToSlug(name);
	if (!slug) return undefined;
	return DEFAULT_DATE_SYSTEMS.find(sys => {
		const sysSlug = sys.universe ? universeNameToSlug(sys.universe) : '';
		if (!sysSlug) return false;
		return sysSlug === slug || slug.includes(sysSlug) || sysSlug.includes(slug);
	});
}
