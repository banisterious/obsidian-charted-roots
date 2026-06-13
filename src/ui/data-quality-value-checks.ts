/**
 * Pure value checks shared by the Data Quality batch operations (preview + apply
 * copies), so the two stay in lockstep and can be unit tested.
 *
 * Both functions are careful with parenthetical annotations: people are often
 * disambiguated with a balanced parenthetical in the note title — e.g.
 * `Jon Smith (son of Robert)` — and that annotation is neither a malformed
 * link nor a set of name words to re-case (#715).
 */

/**
 * Matches a wikilink with a stray closing paren and no opening paren — a
 * genuinely malformed link like `[[unknown) ]]`. A balanced parenthetical such
 * as `[[Jon Smith (son of Robert)]]` is a valid disambiguator and must NOT
 * match (the `[^(]*` forbids any `(` before the `)`).
 */
const MALFORMED_WIKILINK_RE = /^\[\[[^(]*\)\s*\]\]$/;

/**
 * True when `trimmed` is a malformed wikilink (stray unbalanced closing paren),
 * used by the placeholder-removal op. Balanced parentheticals return false.
 */
export function isMalformedWikilink(trimmed: string): boolean {
	return MALFORMED_WIKILINK_RE.test(trimmed);
}

/**
 * Normalize a name to proper Title Case with smart handling of prefixes,
 * initials, Roman numerals, and Mac/Mc/O'/hyphenated names. Text inside a
 * parenthetical annotation is left exactly as written (casing and spacing),
 * since it's a user disambiguator, not name words. Returns null when the input
 * is empty or already normalized (no change).
 */
export function normalizePersonNameCasing(name: string): string | null {
	if (!name || typeof name !== 'string') return null;

	// Trim and collapse multiple spaces
	const cleaned = name.trim().replace(/\s+/g, ' ');
	if (!cleaned) return null;

	// Helper function to normalize a single word/segment
	const normalizeWord = (word: string, isFirstWord: boolean): string => {
		if (!word) return word;

		const lowerWord = word.toLowerCase();

		// Preserve initials (A., B., A.B., H.G., etc.)
		// Matches patterns like "A.", "A.B.", "H.G.", etc.
		if (/^([a-z]\.)+$/i.test(word)) {
			return word.toUpperCase();
		}

		// Preserve Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
		if (/^[ivx]+$/i.test(word)) {
			return word.toUpperCase();
		}

		// Common surname prefixes that should stay lowercase (unless at start)
		const lowercasePrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'den', 'der', 'ten', 'ter', 'du'];
		if (!isFirstWord && lowercasePrefixes.includes(lowerWord)) {
			return lowerWord;
		}

		// Handle Mac prefix (but not "Mack" as a standalone name)
		// Only apply if there are at least 2 more letters after "Mac"
		if (lowerWord.startsWith('mac') && word.length > 5) {
			return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
		}

		// Handle Mc prefix
		if (lowerWord.startsWith('mc') && word.length > 2) {
			return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
		}

		// Handle O' prefix
		if (lowerWord.startsWith("o'") && word.length > 2) {
			return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
		}

		// Handle hyphenated names (Abdul-Aziz, Mary-Jane, etc.)
		if (word.includes('-')) {
			return word.split('-')
				.map(part => normalizeWord(part, false))
				.join('-');
		}

		// Standard title case
		return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
	};

	// Normalize only the words outside any parenthetical; leave the parenthetical
	// annotation (a disambiguator like "(son of Robert)") exactly as written,
	// including its casing and inner spacing. A shared word counter keeps
	// first-word handling correct across the split (#715).
	let wordIndex = 0;
	const result = cleaned
		.split(/(\([^)]*\))/)
		.map(segment => {
			if (segment.startsWith('(')) return segment;
			return segment.replace(/\S+/g, word => normalizeWord(word, wordIndex++ === 0));
		})
		.join('');

	// Only return if it's different from the input
	return result !== cleaned ? result : null;
}
