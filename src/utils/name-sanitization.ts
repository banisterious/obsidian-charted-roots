/**
 * Shared name sanitization utilities for Charted Roots.
 *
 * These utilities ensure consistent handling of special characters in names
 * across all importers (Gramps, GEDCOM, GedcomX, CSV) and note writers.
 *
 * Problem: Names with special characters (quotes, parentheses, brackets) can
 * break wikilink resolution when the filename is sanitized but the wikilink
 * content is not. For example:
 * - Filename: "Susan Sue.md" (sanitized)
 * - Wikilink: "[[Susan "Sue"]]" (unsanitized, doesn't resolve)
 *
 * Solution: Apply consistent sanitization to both filenames AND wikilink
 * targets, using alias format when the display name differs from the sanitized
 * filename.
 *
 * @see https://github.com/banisterious/obsidian-charted-roots/issues/139
 */

/**
 * Characters that must be removed from names used in filenames or wikilinks.
 * These cause wikilink parsing issues or are filesystem-illegal.
 *
 * Includes:
 * - Filesystem-illegal: \ : * ? " < > |
 * - Wikilink-breaking: [ ] (the wikilink delimiters themselves \u2014 a name
 *   like `Susan [Sue]` inside `[[Susan [Sue]]]` would close the link early)
 *
 * Does NOT include (relaxed in #506 after empirical cross-platform evidence):
 * - Parentheses `( )` \u2014 preserved. Obsidian doesn't use them syntactically.
 *   Names like "John (Jack) Doe" and universes like "Star Wars (AU)" round-
 *   trip cleanly through file resolution, rename cascades, and dynamic blocks.
 * - Curly braces `{ }` \u2014 preserved. Same reasoning; no Obsidian syntax uses them.
 * - Apostrophes (') \u2014 valid in names like "O'Brien"
 * - Accented characters \u2014 valid in names like "Jos\u00e9"
 * - Hyphens (-) \u2014 valid in names like "Mary-Jane"
 */
export const WIKILINK_UNSAFE_CHARS = /[\\:*?"<>|[\]]/g;

/**
 * Sanitize a name for use in filenames and wikilinks.
 *
 * Removes characters that break wikilink parsing or are filesystem-illegal.
 * Normalizes whitespace and trims the result.
 *
 * @param name The original name (may contain special characters)
 * @returns Sanitized name safe for filenames/wikilinks, or 'Unknown' if empty
 *
 * @example
 * sanitizeName('Susan "Sue" Smith')  // 'Susan Sue Smith' (quotes stripped)
 * sanitizeName('John (Jack) Doe')    // 'John (Jack) Doe' (parens preserved, #506)
 * sanitizeName('Smith [née Jones]')  // 'Smith née Jones' (brackets stripped)
 * sanitizeName('???')                // 'Unknown'
 * sanitizeName("O'Brien")            // "O'Brien" (apostrophes preserved)
 */
export function sanitizeName(name: string): string {
	if (!name) {
		return 'Unknown';
	}

	const sanitized = name
		.replace(WIKILINK_UNSAFE_CHARS, '')
		.replace(/\s+/g, ' ')
		.trim();

	return sanitized || 'Unknown';
}

/**
 * Sanitize a title for use as a filename basename (without extension).
 *
 * Wraps `sanitizeName` with a length cap. Preserves accented characters,
 * casing, apostrophes, hyphens, and spaces — strips only the chars that
 * are filesystem-illegal or break wikilink parsing. The previous slug-style
 * generators in event / source / proof-summary services used an aggressive
 * `[^a-z0-9]+ → -` regex that destroyed accented characters and casing,
 * producing `birth-of-padm-naberrie.md` from `Birth of Padmé Naberrie`
 * (#509). This helper keeps the user-facing typing intact.
 *
 * @example
 * sanitizeFilename('Birth of Padmé Naberrie')   // 'Birth of Padmé Naberrie'
 * sanitizeFilename("O'Brien's Wedding")         // "O'Brien's Wedding"
 * sanitizeFilename('Susan "Sue" Marriage')      // 'Susan Sue Marriage'
 * sanitizeFilename('a'.repeat(150))             // 100-char string
 * sanitizeFilename('!!!')                       // '!!!' (preserved — punctuation isn't unsafe here)
 * sanitizeFilename('')                          // 'Unknown'
 */
export function sanitizeFilename(title: string, maxLength = 100): string {
	return sanitizeName(title).substring(0, maxLength);
}

/**
 * Check if a name contains characters that would be removed by sanitization.
 *
 * Useful for determining whether alias format is needed in wikilinks.
 *
 * @param name The name to check
 * @returns true if the name contains wikilink-unsafe characters
 *
 * @example
 * needsSanitization('John Smith')        // false
 * needsSanitization('Susan "Sue" Smith') // true (quotes are unsafe)
 * needsSanitization('John (Jack) Doe')   // false (parens preserved per #506)
 * needsSanitization('Smith [née Jones]') // true (brackets are unsafe)
 */
export function needsSanitization(name: string): boolean {
	if (!name) {
		return false;
	}
	return WIKILINK_UNSAFE_CHARS.test(name);
}

/**
 * Create a wikilink that handles special characters in names.
 *
 * When the sanitized name differs from the original, uses alias format
 * to preserve the display name while ensuring the link resolves.
 *
 * @param originalName The original name (may contain special characters)
 * @returns Wikilink string, potentially with alias format
 *
 * @example
 * createSanitizedWikilink('John Smith')        // '[[John Smith]]'
 * createSanitizedWikilink('John (Jack) Doe')   // '[[John (Jack) Doe]]' (parens preserved per #506, no alias needed)
 * createSanitizedWikilink('Susan "Sue" Smith') // '[[Susan Sue Smith|Susan "Sue" Smith]]'
 * createSanitizedWikilink('???')               // '[[Unknown|???]]'
 */
export function createSanitizedWikilink(originalName: string): string {
	if (!originalName) {
		return '[[Unknown]]';
	}

	const sanitized = sanitizeName(originalName);

	if (sanitized !== originalName) {
		// Use alias format: [[sanitized-filename|Original Display Name]]
		return `[[${sanitized}|${originalName}]]`;
	}

	return `[[${originalName}]]`;
}
