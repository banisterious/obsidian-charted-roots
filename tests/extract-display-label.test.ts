import { describe, expect, it } from 'vitest';
import { extractDisplayLabel } from '../src/utils/wikilink-resolver';

/**
 * Coverage for `extractDisplayLabel`, the helper used by the Edit Person
 * modal's "Linked to:" labels and read-only input fields to surface a
 * clean display name regardless of how the wikilink is stored on disk
 * (#543).
 *
 * Mirrors the writer-side stem-collapse pattern from `createSmartWikilink`:
 * after stripping `[[…]]` brackets, collapse pipe-form to the alias and
 * path-form to the basename. The result is what a reader expects to see.
 */
describe('extractDisplayLabel', () => {
	describe('bare strings', () => {
		it('returns a bare basename unchanged', () => {
			expect(extractDisplayLabel('Errol Naberrie')).toBe('Errol Naberrie');
		});

		it('returns empty string for null', () => {
			expect(extractDisplayLabel(null)).toBe('');
		});

		it('returns empty string for undefined', () => {
			expect(extractDisplayLabel(undefined)).toBe('');
		});

		it('returns empty string for empty input', () => {
			expect(extractDisplayLabel('')).toBe('');
		});

		it('returns empty string for whitespace-only input', () => {
			expect(extractDisplayLabel('   ')).toBe('');
		});
	});

	describe('bracketed wikilinks', () => {
		it('strips brackets from a bare bracketed wikilink', () => {
			expect(extractDisplayLabel('[[Errol Naberrie]]')).toBe('Errol Naberrie');
		});

		it('extracts alias from a piped wikilink', () => {
			expect(extractDisplayLabel('[[mildred-barrow|Mildred Barrow]]')).toBe('Mildred Barrow');
		});

		it('extracts basename from a path-form wikilink (#540 canonical)', () => {
			expect(extractDisplayLabel('[[Charted Roots/People/Errol Naberrie|Errol Naberrie]]')).toBe('Errol Naberrie');
		});

		it('strips path even without alias (path-only wikilink)', () => {
			expect(extractDisplayLabel('[[Charted Roots/People/Errol Naberrie]]')).toBe('Errol Naberrie');
		});
	});

	describe('residue shapes from earlier bug eras', () => {
		it('collapses inverted alias residue (#538 bug shape)', () => {
			// `[[basename|path/to/file]]` — pipe-strip yields the path,
			// slash-strip yields the basename.
			expect(extractDisplayLabel('[[Errol Naberrie|Charted Roots/People/Errol Naberrie]]')).toBe('Errol Naberrie');
		});

		it('collapses pipe-accumulation triple', () => {
			expect(extractDisplayLabel('[[Errol Naberrie|Errol Naberrie|Errol Naberrie]]')).toBe('Errol Naberrie');
		});

		it('collapses bare path-form (loader output for path-form wikilink)', () => {
			expect(extractDisplayLabel('Charted Roots/People/Errol Naberrie')).toBe('Errol Naberrie');
		});

		it('collapses bare pipe-form (loader output for piped wikilink)', () => {
			expect(extractDisplayLabel('mildred-barrow|Mildred Barrow')).toBe('Mildred Barrow');
		});
	});

	describe('idempotency', () => {
		it.each([
			'Errol Naberrie',
			'[[Errol Naberrie]]',
			'[[mildred-barrow|Mildred Barrow]]',
			'[[Charted Roots/People/Errol Naberrie|Errol Naberrie]]',
			'[[Errol Naberrie|Charted Roots/People/Errol Naberrie]]',
			'mildred-barrow|Mildred Barrow',
			'Charted Roots/People/Errol Naberrie',
		])('feeding output back yields same result: %s', (input) => {
			const first = extractDisplayLabel(input);
			const second = extractDisplayLabel(first);
			expect(second).toBe(first);
		});
	});
});
