import { describe, expect, it } from 'vitest';
import { extractSourcedFactsFromFrontmatter } from '../src/core/person-note-writer';

/**
 * #512 — Edit Person modal silently wipes per-fact source attributions
 * because callers never populated `editPersonData.sourcedFacts` from
 * frontmatter. This helper closes the load-path gap; tests fence its
 * contract so future refactors don't reintroduce the data-loss bug.
 */

describe('extractSourcedFactsFromFrontmatter (#512)', () => {
	it('returns undefined when no sourced_* properties are present', () => {
		const fm = { name: 'Alice', born: '1850' };
		expect(extractSourcedFactsFromFrontmatter(fm)).toBeUndefined();
	});

	it('strips wikilink brackets from a simple [[basename]] form', () => {
		const fm = {
			sourced_birth_date: ['[[Family Bible]]'],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible'],
		});
	});

	it('strips pipe-aliases and keeps the basename', () => {
		// Regression: the previous inline implementation in bulk-operations.ts
		// captured the entire `basename|alias` content with the pipe intact.
		const fm = {
			sourced_birth_date: ['[[1870 Census|US 1870]]'],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['1870 Census'],
		});
	});

	it('handles multiple wikilinks per property', () => {
		const fm = {
			sourced_birth_date: ['[[Family Bible]]', '[[Birth Certificate]]'],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible', 'Birth Certificate'],
		});
	});

	it('handles a single string value (legacy non-array form)', () => {
		const fm = {
			sourced_birth_date: '[[Family Bible]]',
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible'],
		});
	});

	it('passes through bare strings without brackets unchanged', () => {
		const fm = {
			sourced_birth_date: ['Family Bible'],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible'],
		});
	});

	it('extracts every sourced_* property type independently', () => {
		const fm = {
			sourced_birth_date: ['[[Family Bible]]'],
			sourced_birth_place: ['[[1870 Census]]'],
			sourced_death_date: ['[[Death Certificate]]'],
			sourced_death_place: ['[[Cemetery Records]]'],
			sourced_parents: ['[[Marriage Cert]]'],
			sourced_marriage_date: ['[[Marriage Cert]]'],
			sourced_marriage_place: ['[[Marriage Cert]]'],
			sourced_spouse: ['[[Marriage Cert]]'],
			sourced_occupation: ['[[1880 Census]]'],
			sourced_residence: ['[[1880 Census]]'],
		};
		const result = extractSourcedFactsFromFrontmatter(fm);
		expect(result).toBeDefined();
		expect(Object.keys(result!)).toHaveLength(10);
		expect(result!.sourced_birth_date).toEqual(['Family Bible']);
		expect(result!.sourced_residence).toEqual(['1880 Census']);
	});

	it('skips empty arrays, empty strings, null, and undefined values', () => {
		const fm = {
			sourced_birth_date: [],
			sourced_death_date: ['', '   '],
			sourced_marriage_date: null,
			sourced_occupation: undefined,
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toBeUndefined();
	});

	it('skips non-string array entries (defensive)', () => {
		const fm = {
			sourced_birth_date: ['[[Family Bible]]', 42, null, { foo: 'bar' }],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible'],
		});
	});

	it('ignores non-sourced frontmatter properties', () => {
		const fm = {
			name: 'Alice',
			birth_date: '1850',
			sources: ['[[Family Bible]]'],
			sourced_birth_date: ['[[Family Bible]]'],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible'],
		});
	});

	it('trims whitespace around wikilink strings', () => {
		const fm = {
			sourced_birth_date: ['  [[Family Bible]]  '],
		};
		expect(extractSourcedFactsFromFrontmatter(fm)).toEqual({
			sourced_birth_date: ['Family Bible'],
		});
	});
});
