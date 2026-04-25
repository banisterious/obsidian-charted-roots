import { describe, expect, it } from 'vitest';
import {
	universeNameToSlug,
	suggestBuiltinForUniverseName
} from '../src/universes/ui/calendar-suggest';

/**
 * #432 Phase 1 — wizard step 2 preselects a built-in calendar based on the
 * universe name's slug. Fences the suggestion logic so the wizard doesn't
 * silently regress to "always select first" or stop matching common
 * fictional-universe naming conventions.
 *
 * The helpers are pure functions over `DEFAULT_DATE_SYSTEMS`; tests rely on
 * the canonical built-ins that ship with the plugin (Middle-earth, Westeros,
 * Star Wars Galactic Standard, Generic Fantasy Ages).
 */

describe('universeNameToSlug', () => {
	it('lowercases and replaces non-alphanumeric runs with a single hyphen', () => {
		expect(universeNameToSlug('Star Wars')).toBe('star-wars');
		expect(universeNameToSlug('Middle-earth')).toBe('middle-earth');
		expect(universeNameToSlug('A Song of Ice and Fire')).toBe('a-song-of-ice-and-fire');
	});

	it('trims whitespace and strips leading/trailing separators', () => {
		expect(universeNameToSlug('  Star Wars  ')).toBe('star-wars');
		expect(universeNameToSlug('-Star Wars-')).toBe('star-wars');
		expect(universeNameToSlug('!!!Westeros???')).toBe('westeros');
	});

	it('returns an empty string for an empty / whitespace / punctuation-only name', () => {
		expect(universeNameToSlug('')).toBe('');
		expect(universeNameToSlug('   ')).toBe('');
		expect(universeNameToSlug('!@#$')).toBe('');
	});

	it('collapses multiple separators into single hyphens', () => {
		expect(universeNameToSlug('Star   Wars')).toBe('star-wars');
		expect(universeNameToSlug('Star_Wars--Universe')).toBe('star-wars-universe');
	});
});

describe('suggestBuiltinForUniverseName (#432)', () => {
	it('returns the Star Wars Galactic Standard Calendar for "Star Wars"', () => {
		const suggestion = suggestBuiltinForUniverseName('Star Wars');
		expect(suggestion?.id).toBe('star_wars');
	});

	it('matches case-insensitively', () => {
		expect(suggestBuiltinForUniverseName('STAR WARS')?.id).toBe('star_wars');
		expect(suggestBuiltinForUniverseName('star wars')?.id).toBe('star_wars');
	});

	it('returns Middle-earth Calendar for "Middle-earth"', () => {
		const suggestion = suggestBuiltinForUniverseName('Middle-earth');
		expect(suggestion?.id).toBe('middle_earth');
	});

	it('returns Westeros Calendar for "Westeros"', () => {
		const suggestion = suggestBuiltinForUniverseName('Westeros');
		expect(suggestion?.id).toBe('westeros');
	});

	it('matches when the universe name extends a known slug ("Star Wars Legends")', () => {
		// `slug.includes(sysSlug)` covers fan-fiction / sub-canon naming.
		const suggestion = suggestBuiltinForUniverseName('Star Wars Legends');
		expect(suggestion?.id).toBe('star_wars');
	});

	it('returns undefined for universes that do not match any built-in', () => {
		expect(suggestBuiltinForUniverseName('Discworld')).toBeUndefined();
		expect(suggestBuiltinForUniverseName('My Custom Universe')).toBeUndefined();
	});

	it('returns undefined for an empty or whitespace-only universe name', () => {
		expect(suggestBuiltinForUniverseName('')).toBeUndefined();
		expect(suggestBuiltinForUniverseName('   ')).toBeUndefined();
	});

	it('does not match when the slugified built-in universe field is empty', () => {
		// Generic Fantasy Calendar has no `universe` field, so it should
		// never be auto-suggested — even when the universe name is generic.
		const suggestion = suggestBuiltinForUniverseName('Generic Fantasy');
		expect(suggestion?.id).not.toBe('generic_fantasy');
	});
});
