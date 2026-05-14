/* eslint-disable @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Footnote Parser
 *
 * Parses Obsidian reference-style footnotes from markdown text.
 * Supports both numbered [^1] and named [^citation-name] footnotes.
 */

/**
 * Parsed footnote result
 */
export interface FootnoteParseResult {
	/** Text with footnote definitions removed */
	textWithoutDefinitions: string;
	/** Map of footnote IDs to their content */
	footnotes: Map<string, string>;
	/** Ordered list of footnote IDs as they appear in the text */
	footnoteOrder: string[];
}

/**
 * Regex patterns for footnote parsing
 */
const FOOTNOTE_MARKER_PATTERN = /\[\^([^\]]+)\]/g;
const FOOTNOTE_DEFINITION_PATTERN = /^\[\^([^\]]+)\]:\s*(.+)$/gm;

/**
 * Parse footnotes from markdown text
 *
 * Extracts footnote definitions and returns the text without them,
 * along with a map of footnote IDs to their content.
 *
 * @param text - Markdown text potentially containing footnotes
 * @returns Parsed result with cleaned text and footnote map
 */
export function parseFootnotes(text: string): FootnoteParseResult {
	const footnotes = new Map<string, string>();
	const footnoteOrderSet = new Set<string>();

	// First, extract all footnote definitions
	let textWithoutDefinitions = text;
	let match: RegExpExecArray | null;

	// Collect all definitions
	while ((match = FOOTNOTE_DEFINITION_PATTERN.exec(text)) !== null) {
		const id = match[1];
		const content = match[2].trim();
		footnotes.set(id, content);
	}

	// Remove definition lines from text
	textWithoutDefinitions = text.replace(FOOTNOTE_DEFINITION_PATTERN, '');

	// Clean up any resulting double blank lines
	textWithoutDefinitions = textWithoutDefinitions.replace(/\n{3,}/g, '\n\n');

	// Now find all footnote markers to determine order
	const markerPattern = new RegExp(FOOTNOTE_MARKER_PATTERN.source, 'g');
	while ((match = markerPattern.exec(textWithoutDefinitions)) !== null) {
		const id = match[1];
		if (footnotes.has(id)) {
			footnoteOrderSet.add(id);
		}
	}

	return {
		textWithoutDefinitions: textWithoutDefinitions.trim(),
		footnotes,
		footnoteOrder: Array.from(footnoteOrderSet)
	};
}

/**
 * Check if text contains any footnote markers
 */
export function hasFootnotes(text: string): boolean {
	return FOOTNOTE_MARKER_PATTERN.test(text);
}

/**
 * Get all footnote marker IDs from text (without definitions)
 */
export function getFootnoteMarkerIds(text: string): string[] {
	const ids: string[] = [];
	const pattern = new RegExp(FOOTNOTE_MARKER_PATTERN.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		ids.push(match[1]);
	}

	return ids;
}

/**
 * Replace footnote markers with a custom replacement function
 *
 * @param text - Text containing footnote markers
 * @param replacer - Function that receives the footnote ID and returns replacement text
 * @returns Text with markers replaced
 */
export function replaceFootnoteMarkers(
	text: string,
	replacer: (id: string, index: number) => string
): string {
	let index = 0;
	return text.replace(FOOTNOTE_MARKER_PATTERN, (_, id) => {
		return replacer(id, index++);
	});
}

/* eslint-enable @typescript-eslint/no-unsafe-argument */
