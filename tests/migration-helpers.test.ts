import { describe, expect, it } from 'vitest';
import {
	mergeSourcesWithoutDuplicates,
	transformSourcedFactsToFlatProperties
} from '../src/sources/services/sourced-facts-migration-service';
import { mergeIndexedSourcesToArray } from '../src/sources/services/source-migration-service';
import {
	formatEventDate,
	generateEventTitle,
	type InlineEvent
} from '../src/events/services/life-events-migration-service';

/**
 * Regression coverage for the pure helpers extracted from the three
 * migration services. These are the 1.0 testing-gate tests for
 * migrations — they lock in the transformation semantics that run on
 * note load and at Cleanup Wizard time, so schema-churn regressions
 * surface in CI rather than in user vaults.
 */

describe('transformSourcedFactsToFlatProperties (sourced-facts migration)', () => {
	it('maps one fact key to its flat property', () => {
		const result = transformSourcedFactsToFlatProperties(
			{
				birth_date: { sources: ['[[cert-1]]'] }
			},
			['birth_date']
		);
		expect(result).toEqual({
			sourced_birth_date: ['[[cert-1]]']
		});
	});

	it('maps multiple fact keys independently', () => {
		const result = transformSourcedFactsToFlatProperties(
			{
				birth_date: { sources: ['[[cert-1]]'] },
				death_date: { sources: ['[[cert-2]]', '[[cert-3]]'] }
			},
			['birth_date', 'death_date']
		);
		expect(result).toEqual({
			sourced_birth_date: ['[[cert-1]]'],
			sourced_death_date: ['[[cert-2]]', '[[cert-3]]']
		});
	});

	it('skips fact keys whose sources array is empty', () => {
		const result = transformSourcedFactsToFlatProperties(
			{
				birth_date: { sources: [] },
				death_date: { sources: ['[[cert]]'] }
			},
			['birth_date', 'death_date']
		);
		expect(result).toEqual({
			sourced_death_date: ['[[cert]]']
		});
	});

	it('only transforms fact keys in the factKeys filter argument', () => {
		const result = transformSourcedFactsToFlatProperties(
			{
				birth_date: { sources: ['[[a]]'] },
				death_date: { sources: ['[[b]]'] }
			},
			['birth_date']
		);
		expect(result).toEqual({ sourced_birth_date: ['[[a]]'] });
	});

	it('returns fresh source arrays — mutating the output does not affect the input', () => {
		const facts = { birth_date: { sources: ['[[cert-1]]'] } };
		const result = transformSourcedFactsToFlatProperties(facts, ['birth_date']);
		result.sourced_birth_date.push('[[spurious]]');
		expect(facts.birth_date.sources).toEqual(['[[cert-1]]']);
	});

	it('empty factKeys filter produces empty output', () => {
		const result = transformSourcedFactsToFlatProperties(
			{ birth_date: { sources: ['[[cert]]'] } },
			[]
		);
		expect(result).toEqual({});
	});
});

describe('mergeSourcesWithoutDuplicates (sourced-facts migration)', () => {
	it('concatenates disjoint arrays, existing first', () => {
		expect(mergeSourcesWithoutDuplicates(['a', 'b'], ['c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
	});

	it('filters out duplicates from incoming', () => {
		expect(mergeSourcesWithoutDuplicates(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
	});

	it('returns existing unchanged when incoming is fully duplicate', () => {
		expect(mergeSourcesWithoutDuplicates(['a', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
	});

	it('empty existing returns incoming as-is', () => {
		expect(mergeSourcesWithoutDuplicates([], ['a', 'b'])).toEqual(['a', 'b']);
	});

	it('empty incoming returns existing as-is', () => {
		expect(mergeSourcesWithoutDuplicates(['a'], [])).toEqual(['a']);
	});

	it('preserves order of existing entries', () => {
		expect(mergeSourcesWithoutDuplicates(['z', 'a', 'm'], ['a', 'b'])).toEqual(['z', 'a', 'm', 'b']);
	});
});

describe('mergeIndexedSourcesToArray (source migration)', () => {
	it('merges indexed sources into existing sources with dedup', () => {
		expect(mergeIndexedSourcesToArray(['s2', 's3'], ['s1'])).toEqual(['s1', 's2', 's3']);
	});

	it('empty indexed, non-empty existing returns existing', () => {
		expect(mergeIndexedSourcesToArray([], ['a', 'b'])).toEqual(['a', 'b']);
	});

	it('non-empty indexed, empty existing returns indexed', () => {
		expect(mergeIndexedSourcesToArray(['a', 'b'], [])).toEqual(['a', 'b']);
	});

	it('deduplicates when indexed and existing overlap', () => {
		expect(mergeIndexedSourcesToArray(['a', 'b'], ['b', 'c'])).toEqual(['b', 'c', 'a']);
	});

	it('preserves order: existing first, then indexed', () => {
		expect(mergeIndexedSourcesToArray(['x'], ['a', 'b'])).toEqual(['a', 'b', 'x']);
	});

	it('deduplicates within indexed array itself', () => {
		expect(mergeIndexedSourcesToArray(['a', 'a', 'b'], [])).toEqual(['a', 'b']);
	});

	it('both empty → empty output', () => {
		expect(mergeIndexedSourcesToArray([], [])).toEqual([]);
	});
});

describe('formatEventDate (life-events migration)', () => {
	it('string passes through unchanged', () => {
		expect(formatEventDate('1888-05-15')).toBe('1888-05-15');
	});

	it('number stringifies (year-only convention)', () => {
		expect(formatEventDate(1888)).toBe('1888');
	});

	it('undefined → undefined', () => {
		expect(formatEventDate(undefined)).toBeUndefined();
	});

	it('null → undefined', () => {
		expect(formatEventDate(null)).toBeUndefined();
	});

	it('empty string stays as empty string', () => {
		// Current behavior: empty string passes through. Worth locking in so
		// a future refactor doesn't accidentally convert '' to undefined.
		expect(formatEventDate('')).toBe('');
	});
});

describe('generateEventTitle (life-events migration)', () => {
	const baseEvent: InlineEvent = { event_type: 'baptism' };

	it('includes year from date_from when present', () => {
		expect(generateEventTitle('Alice', { ...baseEvent, date_from: '1850-06-15' }))
			.toBe('Alice - Baptism 1850');
	});

	it('includes year when date_from is a numeric year', () => {
		expect(generateEventTitle('Alice', { ...baseEvent, date_from: 1850 }))
			.toBe('Alice - Baptism 1850');
	});

	it('omits year when date_from is missing', () => {
		expect(generateEventTitle('Alice', baseEvent)).toBe('Alice - Baptism');
	});

	it('maps event_type through the display-name table', () => {
		expect(generateEventTitle('Alice', { event_type: 'immigration', date_from: '1900' }))
			.toBe('Alice - Immigration 1900');
	});

	it('falls back to "Event" for unknown event_type values', () => {
		expect(generateEventTitle('Alice', { event_type: 'nonexistent' as never }))
			.toBe('Alice - Event');
	});
});

// `slugifyTitle` removed in #509 — life-events-migration filename
// generation now goes through `sanitizeFilename` from utils/name-sanitization.
// See `tests/sanitize-filename.test.ts` for fences on the new helper.
