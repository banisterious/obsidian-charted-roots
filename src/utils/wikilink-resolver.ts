/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Wikilink resolver utility
 *
 * Resolves wikilink syntax ([[path/to/file]] or ![[path/to/file]])
 * to actual file paths using Obsidian's metadata cache.
 */

import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import { getLogger } from '../core/logging';

const logger = getLogger('WikilinkResolver');

/**
 * Wikilink pattern - matches [[path]] or ![[path]] with optional display text
 * Groups:
 *   1: The link path (before any pipe for display text)
 */
const WIKILINK_PATTERN = /^!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/;

/**
 * Check if a string is in wikilink format
 */
export function isWikilink(value: string): boolean {
	if (typeof value !== 'string') return false;
	return WIKILINK_PATTERN.test(value.trim());
}

/**
 * Extract the path from a wikilink
 * Returns the original value if not a wikilink
 * Also handles edge cases where quotes may be embedded
 */
export function extractWikilinkPath(value: string): string {
	// Guard against non-string values (e.g., from malformed frontmatter)
	if (typeof value !== 'string') {
		return String(value ?? '');
	}
	let trimmed = value.trim();

	// Handle case where YAML parsed [["path"]] as a nested structure
	// which becomes the string "[["path"]]" with embedded quotes
	// Strip outer quotes if present
	if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))) {
		trimmed = trimmed.slice(1, -1);
	}

	const match = trimmed.match(WIKILINK_PATTERN);
	if (match) {
		let path = match[1];
		// Strip quotes from the path if present (from malformed YAML like [["path"]])
		if ((path.startsWith('"') && path.endsWith('"')) ||
			(path.startsWith("'") && path.endsWith("'"))) {
			path = path.slice(1, -1);
		}
		return path;
	}
	return value;
}

/**
 * Extract the user-facing display label from a wikilink-shaped string.
 *
 * Strips `[[…]]` brackets if present, then collapses pipe-form
 * (`basename|alias` → `alias`) and path-form (`path/to/file` →
 * `file`) so the result is what a reader expects to see rendered:
 * the alias when one exists, otherwise the bare basename.
 *
 * Mirrors the writer-side stem-collapse from `createSmartWikilink` so
 * the Edit Person modal's "Linked to:" labels and read-only input fields
 * surface clean names regardless of whether the underlying frontmatter
 * stores `[[basename]]`, `[[basename|alias]]`, `[[path/to/file]]`, or
 * `[[path/to/file|alias]]` (#543).
 *
 * Idempotent: feeding the output back through the helper returns the
 * same string. Bare strings (without brackets) pass through their
 * pipe/slash collapse unchanged.
 */
export function extractDisplayLabel(value: string | null | undefined): string {
	if (!value) return '';
	const trimmed = value.trim();
	if (!trimmed) return '';
	// Strip `[[…]]` if present (mirrors the loader's extractName).
	const inner = trimmed
		.replace(/^\[\[/, '')
		.replace(/\]\]$/, '');
	// Pipe-form: alias is the last segment.
	const afterPipe = inner.includes('|')
		? inner.split('|').pop()!.trim() || inner
		: inner;
	// Path-form: basename is the last segment.
	const afterSlash = afterPipe.includes('/')
		? afterPipe.split('/').pop()!.trim() || afterPipe
		: afterPipe;
	// Trim once more to handle whitespace inside otherwise-clean brackets
	// (e.g., `[[ Errol Naberrie ]]` strips to ` Errol Naberrie ` after the
	// bracket removal but neither pipe nor slash fired the inner trim).
	return afterSlash.trim();
}

/**
 * Convert a path to wikilink format
 * If already a wikilink, returns as-is
 */
export function toWikilink(path: string): string {
	if (isWikilink(path)) {
		return path;
	}
	return `[[${path}]]`;
}

/**
 * Return the canonical wikilink target for a file: the bare basename when
 * unique in the vault, or the full path (without `.md`) when basename is
 * ambiguous with another file.
 *
 * Plugin writers that emit `[[basename]]` rely on Obsidian's link resolver
 * picking the right file, but the resolver has no way to know the plugin
 * intended the cr_id-resolved file specifically — when two files share a
 * basename (e.g., a plugin-managed person note plus an unrelated note with
 * the same name elsewhere in the vault), the resolver picks one based on
 * its own heuristics and can land on the wrong target. Emitting the path
 * form forces an unambiguous resolution (#540).
 */
export function getCanonicalLinktext(app: App, file: TFile): string {
	let count = 0;
	for (const f of app.vault.getMarkdownFiles()) {
		if (f.basename === file.basename) {
			count++;
			if (count > 1) {
				// Path form, with `.md` extension stripped.
				return file.path.replace(/\.md$/, '');
			}
		}
	}
	return file.basename;
}

/**
 * Resolve a path (possibly a wikilink) to a TFile
 *
 * @param app - Obsidian App instance
 * @param value - The path or wikilink to resolve
 * @param sourcePath - Optional source file path for relative link resolution
 * @returns The resolved TFile, or null if not found
 */
export function resolvePathToFile(
	app: App,
	value: string,
	sourcePath?: string
): TFile | null {
	if (!value || !value.trim()) {
		return null;
	}

	// Extract path from wikilink if needed
	const linkPath = extractWikilinkPath(value);

	// First try exact path match
	const exactFile = app.vault.getAbstractFileByPath(linkPath);
	if (exactFile instanceof TFile) {
		return exactFile;
	}

	// Use Obsidian's link resolution which handles:
	// - Relative paths
	// - Shortest path matching
	// - Case-insensitive matching on some systems
	const resolved = app.metadataCache.getFirstLinkpathDest(
		linkPath,
		sourcePath ?? ''
	);

	return resolved;
}

/**
 * Resolve an image path (possibly a wikilink) to a blob URL
 * This is useful for loading images in Leaflet or other contexts
 * that need a URL rather than a TFile
 *
 * @param app - Obsidian App instance
 * @param value - The path or wikilink to resolve
 * @param sourcePath - Optional source file path for relative link resolution
 * @returns A blob URL for the image, or null if not found
 */
export async function resolveImageToUrl(
	app: App,
	value: string,
	sourcePath?: string
): Promise<string | null> {
	const linkPath = extractWikilinkPath(value);
	const file = resolvePathToFile(app, value, sourcePath);

	if (file) {
		try {
			const arrayBuffer = await app.vault.readBinary(file);
			const blob = new Blob([arrayBuffer]);
			return URL.createObjectURL(blob);
		} catch (error) {
			logger.error('resolve-image', `Failed to read file: ${file.path}`, { error });
			return null;
		}
	}

	// Fallback: try reading directly with vault adapter
	// This handles cases where the file might exist but isn't in the cache
	try {
		const exists = await app.vault.adapter.exists(linkPath);
		if (exists) {
			const data = await app.vault.adapter.readBinary(linkPath);
			const blob = new Blob([data]);
			return URL.createObjectURL(blob);
		}
	} catch (error) {
		logger.error('resolve-image', `Adapter fallback failed for "${linkPath}"`, { error });
	}

	logger.warn('resolve-image', `Could not resolve: "${value}"`);
	return null;
}