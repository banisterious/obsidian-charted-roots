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

	/**
	 * Property-based input-shape coverage (#548). When the next variant in
	 * the wikilink-input-contract cluster surfaces, add it to this corpus
	 * and the existing assertions will catch regressions.
	 *
	 * Properties asserted:
	 * 1. Output never contains `[`, `]`, `|`, or `/` (display-clean).
	 * 2. Output is trimmed (no leading/trailing whitespace).
	 * 3. Idempotency: f(f(x)) === f(x).
	 */
	describe('property-based input-shape coverage', () => {
		const corpus: Array<{ input: string | null | undefined; description: string }> = [
			// Empty / nullish
			{ input: '', description: 'empty string' },
			{ input: null, description: 'null' },
			{ input: undefined, description: 'undefined' },
			{ input: '   ', description: 'whitespace-only' },
			{ input: '\t\n', description: 'tab and newline' },

			// Bare strings
			{ input: 'Errol Naberrie', description: 'bare basename' },
			{ input: '  Errol Naberrie  ', description: 'bare basename with surrounding whitespace' },
			{ input: 'Plo Koon', description: 'bare name with space' },
			{ input: "O'Brien", description: 'bare name with apostrophe' },
			{ input: 'Müller', description: 'bare name with diacritic' },
			{ input: '日本太郎', description: 'unicode CJK name' },

			// Bracketed wikilinks
			{ input: '[[Errol Naberrie]]', description: 'bare bracketed' },
			{ input: '[[Plo Koon]]', description: 'bare bracketed with space' },
			{ input: '[[mildred-barrow|Mildred Barrow]]', description: 'pipe-form aliased' },
			{ input: '[[Charted Roots/People/Errol Naberrie]]', description: 'path-form no alias' },
			{ input: '[[Charted Roots/People/Errol Naberrie|Errol Naberrie]]', description: 'path-form with self-alias (#540 canonical)' },
			{ input: '[[a/b/c/d/e/Deep]]', description: 'deeply nested path-form' },
			{ input: '[[a/b/c/d/e/Deep|Deep]]', description: 'deeply nested path-form with alias' },

			// Bare residue from loader / previous bug eras
			{ input: 'mildred-barrow|Mildred Barrow', description: 'bare pipe-form (loader output)' },
			{ input: 'Charted Roots/People/Errol Naberrie', description: 'bare path-form (loader output)' },
			{ input: '[[Errol Naberrie|Errol Naberrie|Errol Naberrie]]', description: 'pipe-accumulation triple (#537)' },
			{ input: '[[Errol Naberrie|Charted Roots/People/Errol Naberrie]]', description: 'inverted alias residue (#538)' },
			{ input: '[[basename|path/to/file]]', description: 'pipe-then-path residue' },

			// Edge cases
			{ input: '[[]]', description: 'empty brackets' },
			{ input: '[[ Errol  Naberrie ]]', description: 'whitespace inside brackets' },
		];

		const assertProperties = (output: string, input: string | null | undefined): void => {
			expect(output).not.toMatch(/[[\]]/);
			expect(output).not.toContain('|');
			expect(output).not.toContain('/');
			expect(output).toBe(output.trim());

			// Idempotency: applying the helper again yields the same result.
			expect(extractDisplayLabel(output)).toBe(output);
		};

		it.each(corpus)('properties hold for: $description', ({ input }) => {
			const output = extractDisplayLabel(input);
			assertProperties(output, input);
		});
	});
});
