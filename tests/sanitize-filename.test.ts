import { describe, expect, it } from 'vitest';
import { sanitizeFilename, sanitizeName } from '../src/utils/name-sanitization';

/**
 * #509 — Event / Source / Proof Summary filename generators previously used
 * an aggressive `[^a-z0-9]+ -> -` slug regex that destroyed accented chars,
 * casing, and spaces — `Birth of Padmé Naberrie` became `birth-of-padm-
 * naberrie.md`. Person notes, by contrast, go through `sanitizeName` which
 * preserves all of those.
 *
 * `sanitizeFilename` wraps `sanitizeName` with a length cap and replaces
 * the four slug-style call sites (event-service, source-service,
 * proof-summary-service, life-events-migration-service). These tests fence
 * the conservative behavior — what's preserved, what's stripped, and the
 * length cap.
 */

describe('sanitizeFilename (#509)', () => {
	describe('preserves user-typed content', () => {
		it('preserves accented characters', () => {
			expect(sanitizeFilename('Birth of Padmé Naberrie')).toBe('Birth of Padmé Naberrie');
			expect(sanitizeFilename('José García')).toBe('José García');
			expect(sanitizeFilename('Ælfric of Ærenø')).toBe('Ælfric of Ærenø');
		});

		it('preserves casing', () => {
			expect(sanitizeFilename('Battle of Hastings')).toBe('Battle of Hastings');
			expect(sanitizeFilename('WWI Armistice')).toBe('WWI Armistice');
		});

		it('preserves apostrophes', () => {
			expect(sanitizeFilename("O'Brien's Wedding")).toBe("O'Brien's Wedding");
		});

		it('preserves hyphens', () => {
			expect(sanitizeFilename('Anne Marie-Jane Smith Birth')).toBe('Anne Marie-Jane Smith Birth');
		});

		it('preserves internal spaces', () => {
			expect(sanitizeFilename('Birth of John Smith')).toBe('Birth of John Smith');
		});

		it('preserves numbers and standard punctuation', () => {
			expect(sanitizeFilename('Census 1900 - Boston')).toBe('Census 1900 - Boston');
		});
	});

	describe('strips wikilink-unsafe characters', () => {
		it('strips parens', () => {
			expect(sanitizeFilename('John (Jack) Doe Birth')).toBe('John Jack Doe Birth');
		});

		it('strips brackets', () => {
			expect(sanitizeFilename('Smith [née Jones] Marriage')).toBe('Smith née Jones Marriage');
		});

		it('strips quotes', () => {
			expect(sanitizeFilename('Susan "Sue" Smith Birth')).toBe('Susan Sue Smith Birth');
		});

		it('strips colons and pipes', () => {
			// `:` and `|` are in WIKILINK_UNSAFE_CHARS; `/` is intentionally
			// not (Obsidian uses it as the path separator).
			expect(sanitizeFilename('foo: bar | qux')).toBe('foo bar qux');
		});
	});

	describe('whitespace handling', () => {
		it('collapses multiple spaces to single', () => {
			expect(sanitizeFilename('Birth   of   John')).toBe('Birth of John');
		});

		it('trims leading and trailing whitespace', () => {
			expect(sanitizeFilename('  Birth of John  ')).toBe('Birth of John');
		});
	});

	describe('length cap', () => {
		it('caps at 100 characters by default', () => {
			expect(sanitizeFilename('a'.repeat(150))).toHaveLength(100);
		});

		it('honors a custom maxLength', () => {
			expect(sanitizeFilename('a'.repeat(50), 20)).toHaveLength(20);
		});

		it('does not pad short inputs', () => {
			expect(sanitizeFilename('Short')).toBe('Short');
		});
	});

	describe('empty / pathological inputs', () => {
		it('returns "Unknown" for empty input', () => {
			expect(sanitizeFilename('')).toBe('Unknown');
		});

		it('returns "Unknown" when all chars get stripped', () => {
			expect(sanitizeFilename('()[]{}')).toBe('Unknown');
		});

		it('preserves punctuation that is not in the unsafe set', () => {
			// Exclamation, period, comma, etc. — not filesystem-illegal, not
			// wikilink-unsafe, so they survive.
			expect(sanitizeFilename('!!!')).toBe('!!!');
			expect(sanitizeFilename('Hello, World!')).toBe('Hello, World!');
		});
	});

	describe('parity with sanitizeName', () => {
		it('produces the same output as sanitizeName when under the length cap', () => {
			const inputs = [
				'Birth of Padmé',
				"O'Brien's Wedding",
				'Susan "Sue" Smith',
				'John (Jack) Doe',
			];
			for (const input of inputs) {
				expect(sanitizeFilename(input)).toBe(sanitizeName(input));
			}
		});
	});
});
