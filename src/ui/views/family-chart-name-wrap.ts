/**
 * #671 — The SVG card renderer clips long names at the card's right edge (f3
 * fades them under a mask) instead of wrapping. For the fixed-width rectangular
 * card styles the Family Chart view measures each name and, when it overflows,
 * splits it across two lines so the whole name stays readable.
 *
 * `wrapNameToTwoLines` is the pure splitting decision, kept UI-free so the
 * greedy word-packing can be fenced by tests independently of the SVG
 * measurement it runs against in the view. The caller supplies a `measure`
 * function that returns the rendered width of a string in the card's font, so
 * this stays free of any DOM dependency.
 */

/**
 * Greedily pack `name` into (at most) two lines that each fit within
 * `maxWidth`. Words fill the first line until the next word would overflow; the
 * remaining words form the second line. A single word wider than `maxWidth`
 * stays whole — mid-word breaking isn't worth it — in which case the second
 * line comes back empty so the caller can decide not to wrap at all.
 *
 * The second line is not itself re-checked against `maxWidth`: with a two-line
 * cap an over-long remainder still falls back to f3's edge fade, which is no
 * worse than the unwrapped clip it replaces.
 */
export function wrapNameToTwoLines(
	name: string,
	maxWidth: number,
	measure: (s: string) => number
): [string, string] {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length <= 1) {
		// Nothing to break on (empty or a single token): return it whole with no
		// second line so the caller skips wrapping.
		return [words[0] ?? '', ''];
	}

	let line1 = '';
	let i = 0;
	for (; i < words.length; i++) {
		const candidate = line1 ? `${line1} ${words[i]}` : words[i];
		// Always keep at least the first word on line 1, even if it alone
		// overflows; only break once line 1 has content to keep.
		if (line1 && measure(candidate) > maxWidth) break;
		line1 = candidate;
	}
	const line2 = words.slice(i).join(' ');
	return [line1, line2];
}
