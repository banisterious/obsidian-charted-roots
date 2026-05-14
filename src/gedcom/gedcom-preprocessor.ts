/* eslint-disable @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * GEDCOM Preprocessor for MyHeritage Compatibility
 *
 * Automatically detects and fixes common issues in MyHeritage GEDCOM exports:
 * - UTF-8 BOM (Byte Order Mark) removal
 * - Double-encoded HTML entities (e.g., &amp;lt;br&amp;gt;)
 * - Single-encoded HTML entities mixed in same records
 * - <br> tag conversion to newlines
 * - Decorative HTML tag stripping
 *
 * @see https://github.com/banisterious/obsidian-charted-roots/issues/144
 */

import { getLogger } from '../core/logging';

const logger = getLogger('GedcomPreprocessor');

/**
 * Detection results from analyzing GEDCOM content
 */
export interface PreprocessorDetection {
	hasUtf8Bom: boolean;
	isMyHeritage: boolean;
	hasDoubleEncodedEntities: boolean;
	hasTabContinuations: boolean;
	shouldPreprocess: boolean;
}

/**
 * Result of preprocessing a GEDCOM file
 */
export interface PreprocessResult {
	content: string;
	wasPreprocessed: boolean;
	fixes: {
		bomRemoved: boolean;
		tabContinuationsFixed: number;
		skippedLeadingLines: number;
		concFieldsNormalized: number;
		detectionInfo: PreprocessorDetection;
	};
}

/**
 * GEDCOM compatibility mode setting values
 */
export type GedcomCompatibilityMode = 'auto' | 'myheritage' | 'none';

/**
 * Detect if content is from MyHeritage and needs preprocessing
 */
export function detectMyHeritage(content: string): PreprocessorDetection {
	// Check for UTF-8 BOM
	const hasUtf8Bom = content.charCodeAt(0) === 0xFEFF ||
		(content.charCodeAt(0) === 0xEF &&
		 content.charCodeAt(1) === 0xBB &&
		 content.charCodeAt(2) === 0xBF);

	// Check for MyHeritage source tag (uppercase "MYHERITAGE" per real samples)
	// Check first 2000 chars to find header section
	const isMyHeritage = /1\s+SOUR\s+MYHERITAGE/i.test(content.substring(0, 2000));

	// Check for double-encoded entities (sample first 50KB for performance)
	// Includes &amp;nbsp; which appears in MyHeritage exports
	const sample = content.substring(0, 50000);
	const hasDoubleEncodedEntities = /&amp;(?:lt|gt|amp|quot|nbsp);/i.test(sample);

	// Check for tab-prefixed continuation lines (MyHeritage non-standard format)
	// These are lines that start with a tab instead of a level number
	const hasTabContinuations = /^\t[^\t\n]/m.test(sample);

	return {
		hasUtf8Bom,
		isMyHeritage,
		hasDoubleEncodedEntities,
		hasTabContinuations,
		shouldPreprocess: hasUtf8Bom || hasTabContinuations ||
			(isMyHeritage && hasDoubleEncodedEntities)
	};
}

/**
 * Strip UTF-8 BOM from content if present
 */
export function stripUtf8Bom(content: string): { content: string; fixed: boolean } {
	// Handle BOM as Unicode character U+FEFF
	if (content.charCodeAt(0) === 0xFEFF) {
		return { content: content.substring(1), fixed: true };
	}

	// Handle BOM as raw bytes (if reading as binary)
	if (content.charCodeAt(0) === 0xEF &&
		content.charCodeAt(1) === 0xBB &&
		content.charCodeAt(2) === 0xBF) {
		return { content: content.substring(3), fixed: true };
	}

	return { content, fixed: false };
}

/**
 * Normalize tab-prefixed and unprefixed continuation lines
 *
 * MyHeritage exports non-standard GEDCOM where continuation data appears on lines
 * that start with a tab character or have no prefix at all, instead of proper CONC tags.
 *
 * Example malformed input:
 *   3 TEXT Some text
 *   4 CONC first part
 *   	second part (tab-prefixed)
 *   	third part (tab-prefixed)
 *   fourth part (no prefix)
 *
 * This function appends such lines to the previous line with a space separator.
 * Leading malformed lines (before first valid GEDCOM line) are skipped.
 */
export function normalizeTabContinuations(content: string): { content: string; fixCount: number; skippedLeadingLines: number } {
	const lines = content.split(/\r?\n/);
	// Use array of arrays to avoid repeated string concatenation (performance)
	// Each entry is an array of parts that will be joined with space at the end
	const normalized: string[][] = [];
	let fixCount = 0;
	let skippedLeadingLines = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trimStart();

		// Valid GEDCOM line starts with a digit - start a new group
		if (/^\d/.test(trimmed)) {
			normalized.push([line]);
			continue;
		}

		// Empty or whitespace-only lines: skip them entirely
		// In valid GEDCOM, these shouldn't exist. In MyHeritage exports,
		// they appear as tab-only lines between continuation fragments.
		// Skipping them allows the next continuation line to be properly
		// appended to the previous valid GEDCOM line.
		if (!trimmed) {
			continue;
		}

		// Line doesn't start with digit - it's a malformed continuation
		// Append to previous line group
		if (normalized.length > 0) {
			normalized[normalized.length - 1].push(trimmed);
			fixCount++;
		} else {
			// Edge case: leading malformed lines before first valid GEDCOM line
			// Skip these (they're likely anonymization artifacts or file corruption)
			skippedLeadingLines++;
		}
	}

	// Join each line group with spaces, then join all lines with newlines
	return {
		content: normalized.map(parts => parts.join(' ')).join('\n'),
		fixCount,
		skippedLeadingLines
	};
}

/**
 * Yield to the event loop to prevent UI freezing.
 * Uses setTimeout with 0ms which defers to the next event loop iteration,
 * allowing pending UI updates and user interactions to be processed.
 */
async function yieldToEventLoop(): Promise<void> {
	// In Electron/Obsidian, window.setTimeout(0) is more reliable than requestAnimationFrame
	// because rAF is tied to rendering frames which may not apply in this context
	return new Promise(resolve => window.setTimeout(resolve, 0));
}

/**
 * Async version of normalizeTabContinuations that yields periodically.
 */
export async function normalizeTabContinuationsAsync(content: string): Promise<{ content: string; fixCount: number; skippedLeadingLines: number }> {
	// Yield before the expensive split operation
	await yieldToEventLoop();
	const lines = content.split(/\r?\n/);
	await yieldToEventLoop();

	const normalized: string[][] = [];
	let fixCount = 0;
	let skippedLeadingLines = 0;
	const YIELD_INTERVAL = 5000; // Balance responsiveness with performance

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trimStart();

		// Valid GEDCOM line starts with a digit - start a new group
		if (/^\d/.test(trimmed)) {
			normalized.push([line]);
		} else if (!trimmed) {
			// Empty or whitespace-only lines: skip them entirely
			// (see sync version for explanation)
			// Just continue to next line
		} else if (normalized.length > 0) {
			// Malformed continuation - append to previous line group
			normalized[normalized.length - 1].push(trimmed);
			fixCount++;
		} else {
			// Edge case: leading malformed lines before first valid GEDCOM line
			// Skip these (they're likely anonymization artifacts or file corruption)
			skippedLeadingLines++;
		}

		if (i > 0 && i % YIELD_INTERVAL === 0) {
			await yieldToEventLoop();
		}
	}

	return {
		content: normalized.map(parts => parts.join(' ')).join('\n'),
		fixCount,
		skippedLeadingLines
	};
}

/**
 * Decode common HTML entities to their character equivalents
 */
function decodeHtmlEntities(text: string): string {
	const entities: Record<string, string> = {
		'&lt;': '<',
		'&gt;': '>',
		'&amp;': '&',
		'&quot;': '"',
		'&apos;': "'",
		'&#39;': "'",
		'&nbsp;': ' '  // Non-breaking space -> regular space
	};

	let result = text;

	// Replace named entities (case-insensitive)
	for (const [entity, char] of Object.entries(entities)) {
		result = result.replace(new RegExp(entity, 'gi'), char);
	}

	// Replace numeric entities (&#60; or &#x3C;)
	result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
	result = result.replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

	return result;
}

/**
 * Repair HTML entities in text content
 * Handles:
 * - Double-encoded entities (&amp;lt; -> <)
 * - Single-encoded entities (&lt; -> <)
 * - <br> tag conversion to newlines
 * - Decorative HTML tag stripping
 * - Embedded newline cleanup
 */
export function repairHtmlEntities(text: string): { content: string; fixed: boolean } {
	let fixed = false;
	let result = text;

	// Note: Split entity repair not needed per real-world sample analysis.
	// MyHeritage splits at word boundaries, not mid-entity.

	// Step 1: Decode double-encoded entities
	// &amp;lt; -> &lt; -> <
	// &amp;gt; -> &gt; -> >
	// &amp;amp; -> &amp; -> &
	// &amp;quot; -> &quot; -> "
	// &amp;nbsp; -> &nbsp; -> (non-breaking space)
	const doubleEncodedPattern = /&amp;(lt|gt|amp|quot|nbsp|#\d+|#x[0-9a-fA-F]+);/gi;
	if (doubleEncodedPattern.test(result)) {
		fixed = true;
		// Reset lastIndex since we used test() with /g flag
		doubleEncodedPattern.lastIndex = 0;
		// First decode: &amp;lt; -> &lt;
		result = result.replace(doubleEncodedPattern, '&$1;');
		// Second decode: &lt; -> <
		result = decodeHtmlEntities(result);
	}

	// Step 2: Decode single-encoded entities (also present in MyHeritage exports)
	// These appear mixed with double-encoded in the same record
	if (/&(?:lt|gt|nbsp);/i.test(result)) {
		fixed = true;
		result = decodeHtmlEntities(result);
	}

	// Step 3: Convert <br> tags to spaces
	// Note: We use spaces instead of newlines because newlines mid-line would
	// create invalid GEDCOM (lines without level numbers). The data ends up in
	// source citations where exact formatting isn't critical.
	// Handles: <br>, <br/>, <br />, <BR />, etc.
	if (/<br\s*\/?>/i.test(result)) {
		fixed = true;
		result = result.replace(/<br\s*\/?>/gi, ' ');
	}

	// Step 4: Strip decorative HTML tags that don't add meaning
	// <a>text</a> (without href) -> text
	if (/<a>([^<]*)<\/a>/i.test(result)) {
		fixed = true;
		result = result.replace(/<a>([^<]*)<\/a>/gi, '$1');
	}

	// Step 5: Remove embedded escaped newlines (violate GEDCOM spec)
	if (/\\n|\\r\\n|\\r/.test(result)) {
		fixed = true;
		result = result.replace(/\\r\\n|\\n|\\r/g, ' ');
	}

	return { content: result, fixed };
}

/**
 * Normalize CONC and CONT continuation fields
 * - CONC: Joins without newline (per GEDCOM spec)
 * - CONT: Joins with newline (per GEDCOM spec)
 * Also repairs any entity issues in the combined content
 */
export function normalizeConcFields(content: string): { content: string; fixCount: number } {
	const lines = content.split(/\r?\n/);
	const fixed: string[] = [];
	let fixCount = 0;
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Check if this is a line followed by CONC or CONT continuations
		if (i + 1 < lines.length && /^\s*\d+\s+CON[CT]\s/.test(lines[i + 1])) {
			// Extract the level number from the current line
			const levelMatch = line.match(/^\s*(\d+)/);
			if (levelMatch) {
				const baseLevel = parseInt(levelMatch[1]);
				const contLevel = baseLevel + 1;
				const concRegex = new RegExp(`^\\s*${contLevel}\\s+CONC\\s?(.*)$`);
				const contRegex = new RegExp(`^\\s*${contLevel}\\s+CONT\\s?(.*)$`);

				let accumulated = line;
				let j = i + 1;

				while (j < lines.length) {
					const concMatch = lines[j].match(concRegex);
					const contMatch = lines[j].match(contRegex);

					if (concMatch) {
						// CONC means concatenate WITHOUT newline (per GEDCOM spec)
						accumulated += concMatch[1];
						j++;
					} else if (contMatch) {
						// CONT means continue WITH newline (per GEDCOM spec)
						accumulated += '\n' + contMatch[1];
						j++;
					} else {
						break;
					}
				}

				// Now process the accumulated content for HTML entity issues
				const processed = repairHtmlEntities(accumulated);
				if (processed.fixed) {
					fixCount++;
				}
				fixed.push(processed.content);

				i = j; // Skip past all CONC/CONT lines
				continue;
			}
		}

		// Not a CONC/CONT situation, but still check for entity issues in regular lines
		// This handles DATA/TEXT fields that may have entities without CONC
		if (/&amp;|&lt;|&gt;|&nbsp;|<br/i.test(line)) {
			const processed = repairHtmlEntities(line);
			if (processed.fixed) {
				fixCount++;
			}
			fixed.push(processed.content);
		} else {
			fixed.push(line);
		}
		i++;
	}

	return {
		content: fixed.join('\n'),
		fixCount
	};
}

/**
 * Async version of normalizeConcFields that yields periodically.
 */
export async function normalizeConcFieldsAsync(content: string): Promise<{ content: string; fixCount: number }> {
	// Yield before the expensive split operation
	await yieldToEventLoop();
	const lines = content.split(/\r?\n/);
	await yieldToEventLoop();

	const fixed: string[] = [];
	let fixCount = 0;
	let i = 0;
	const YIELD_INTERVAL = 5000; // Balance responsiveness with performance
	let yieldCounter = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (i + 1 < lines.length && /^\s*\d+\s+CON[CT]\s/.test(lines[i + 1])) {
			const levelMatch = line.match(/^\s*(\d+)/);
			if (levelMatch) {
				const baseLevel = parseInt(levelMatch[1]);
				const contLevel = baseLevel + 1;
				const concRegex = new RegExp(`^\\s*${contLevel}\\s+CONC\\s?(.*)$`);
				const contRegex = new RegExp(`^\\s*${contLevel}\\s+CONT\\s?(.*)$`);

				let accumulated = line;
				let j = i + 1;

				while (j < lines.length) {
					const concMatch = lines[j].match(concRegex);
					const contMatch = lines[j].match(contRegex);

					if (concMatch) {
						// CONC means concatenate WITHOUT newline (per GEDCOM spec)
						accumulated += concMatch[1];
						j++;
					} else if (contMatch) {
						// CONT means continue WITH newline (per GEDCOM spec)
						accumulated += '\n' + contMatch[1];
						j++;
					} else {
						break;
					}
				}

				const processed = repairHtmlEntities(accumulated);
				if (processed.fixed) {
					fixCount++;
				}
				fixed.push(processed.content);

				i = j;
				yieldCounter += j - i;
				if (yieldCounter >= YIELD_INTERVAL) {
					yieldCounter = 0;
					await yieldToEventLoop();
				}
				continue;
			}
		}

		if (/&amp;|&lt;|&gt;|&nbsp;|<br/i.test(line)) {
			const processed = repairHtmlEntities(line);
			if (processed.fixed) {
				fixCount++;
			}
			fixed.push(processed.content);
		} else {
			fixed.push(line);
		}
		i++;
		yieldCounter++;
		if (yieldCounter >= YIELD_INTERVAL) {
			yieldCounter = 0;
			await yieldToEventLoop();
		}
	}

	return {
		content: fixed.join('\n'),
		fixCount
	};
}

/**
 * Main preprocessing function
 * Orchestrates all fixes based on compatibility mode setting
 */
export function preprocessGedcom(
	content: string,
	mode: GedcomCompatibilityMode
): PreprocessResult {

	// Skip if disabled
	if (mode === 'none') {
		return {
			content,
			wasPreprocessed: false,
			fixes: {
				bomRemoved: false,
				tabContinuationsFixed: 0,
				skippedLeadingLines: 0,
				concFieldsNormalized: 0,
				detectionInfo: {
					hasUtf8Bom: false,
					isMyHeritage: false,
					hasDoubleEncodedEntities: false,
					hasTabContinuations: false,
					shouldPreprocess: false
				}
			}
		};
	}

	// Detect issues
	const detection = detectMyHeritage(content);

	// Should we preprocess?
	const shouldPreprocess = mode === 'myheritage' ||
		(mode === 'auto' && detection.shouldPreprocess);

	if (!shouldPreprocess) {
		logger.debug('preprocessGedcom', 'No preprocessing needed', {
			mode,
			detection
		});
		return {
			content,
			wasPreprocessed: false,
			fixes: {
				bomRemoved: false,
				tabContinuationsFixed: 0,
				skippedLeadingLines: 0,
				concFieldsNormalized: 0,
				detectionInfo: detection
			}
		};
	}

	logger.info('preprocessGedcom', 'Applying MyHeritage compatibility fixes', {
		mode,
		isMyHeritage: detection.isMyHeritage,
		hasUtf8Bom: detection.hasUtf8Bom,
		hasDoubleEncodedEntities: detection.hasDoubleEncodedEntities,
		hasTabContinuations: detection.hasTabContinuations
	});

	// Apply fixes
	let processed = content;

	// Fix 1: Strip UTF-8 BOM
	const bomResult = stripUtf8Bom(processed);
	processed = bomResult.content;

	// Fix 2: Normalize tab-prefixed and unprefixed continuation lines
	// Must run BEFORE normalizeConcFields so that malformed lines are joined first
	const tabResult = normalizeTabContinuations(processed);
	processed = tabResult.content;

	// Fix 3: Normalize CONC fields and repair HTML entities
	const concResult = normalizeConcFields(processed);
	processed = concResult.content;

	logger.info('preprocessGedcom', 'Preprocessing complete', {
		bomRemoved: bomResult.fixed,
		tabContinuationsFixed: tabResult.fixCount,
		skippedLeadingLines: tabResult.skippedLeadingLines,
		concFieldsNormalized: concResult.fixCount
	});

	return {
		content: processed,
		wasPreprocessed: true,
		fixes: {
			bomRemoved: bomResult.fixed,
			tabContinuationsFixed: tabResult.fixCount,
			skippedLeadingLines: tabResult.skippedLeadingLines,
			concFieldsNormalized: concResult.fixCount,
			detectionInfo: detection
		}
	};
}

/**
 * Async version of preprocessGedcom that yields periodically.
 * Use this for large files to prevent UI freezing.
 */
export async function preprocessGedcomAsync(
	content: string,
	mode: GedcomCompatibilityMode
): Promise<PreprocessResult> {

	// Skip if disabled
	if (mode === 'none') {
		return {
			content,
			wasPreprocessed: false,
			fixes: {
				bomRemoved: false,
				tabContinuationsFixed: 0,
				skippedLeadingLines: 0,
				concFieldsNormalized: 0,
				detectionInfo: {
					hasUtf8Bom: false,
					isMyHeritage: false,
					hasDoubleEncodedEntities: false,
					hasTabContinuations: false,
					shouldPreprocess: false
				}
			}
		};
	}

	// Detect issues
	const detection = detectMyHeritage(content);

	// Should we preprocess?
	const shouldPreprocess = mode === 'myheritage' ||
		(mode === 'auto' && detection.shouldPreprocess);

	if (!shouldPreprocess) {
		logger.debug('preprocessGedcomAsync', 'No preprocessing needed', {
			mode,
			detection
		});
		return {
			content,
			wasPreprocessed: false,
			fixes: {
				bomRemoved: false,
				tabContinuationsFixed: 0,
				skippedLeadingLines: 0,
				concFieldsNormalized: 0,
				detectionInfo: detection
			}
		};
	}

	logger.info('preprocessGedcomAsync', 'Applying MyHeritage compatibility fixes', {
		mode,
		isMyHeritage: detection.isMyHeritage,
		hasUtf8Bom: detection.hasUtf8Bom,
		hasDoubleEncodedEntities: detection.hasDoubleEncodedEntities,
		hasTabContinuations: detection.hasTabContinuations
	});

	// Apply fixes
	let processed = content;

	// Fix 1: Strip UTF-8 BOM (synchronous, fast)
	const bomResult = stripUtf8Bom(processed);
	processed = bomResult.content;

	// Fix 2: Normalize tab-prefixed and unprefixed continuation lines (async)
	const tabResult = await normalizeTabContinuationsAsync(processed);
	processed = tabResult.content;

	// Fix 3: Normalize CONC fields and repair HTML entities (async)
	const concResult = await normalizeConcFieldsAsync(processed);
	processed = concResult.content;

	logger.info('preprocessGedcomAsync', 'Preprocessing complete', {
		bomRemoved: bomResult.fixed,
		tabContinuationsFixed: tabResult.fixCount,
		skippedLeadingLines: tabResult.skippedLeadingLines,
		concFieldsNormalized: concResult.fixCount
	});

	return {
		content: processed,
		wasPreprocessed: true,
		fixes: {
			bomRemoved: bomResult.fixed,
			tabContinuationsFixed: tabResult.fixCount,
			skippedLeadingLines: tabResult.skippedLeadingLines,
			concFieldsNormalized: concResult.fixCount,
			detectionInfo: detection
		}
	};
}

/* eslint-enable @typescript-eslint/no-unsafe-argument */
