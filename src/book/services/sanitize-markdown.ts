/* eslint-disable @typescript-eslint/no-unsafe-return -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Markdown sanitization helpers for the book pipeline.
 *
 * Static export renderers (PDF/ODT) can't resolve Obsidian wikilinks or
 * the plugin's `charted-roots-*` dynamic code blocks, and they don't
 * strip frontmatter. Both vault-note chapters and report chapters in
 * `BookGenerationService` route their content through these helpers
 * before handing off to the renderer.
 *
 * Kept in a standalone module with no app imports so vitest can import
 * the helpers without dragging in the Obsidian Modal class.
 */

/**
 * Strip YAML frontmatter from markdown content.
 */
export function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	if (match) {
		return content.slice(match[0].length);
	}
	return content;
}

/**
 * Strip wikilinks, keeping display text or link target.
 */
export function stripWikilinks(content: string): string {
	return content.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_match, target, _pipe, alias) => alias || target);
}

/**
 * Strip charted-roots dynamic code blocks that won't render in a activeDocument.
 */
export function stripDynamicBlocks(content: string): string {
	return content.replace(/```charted-roots-[\s\S]*?```/g, '');
}

/**
 * Sanitize markdown for static document rendering (PDF/ODT). Used by
 * both vault-note chapters and report chapters in the book pipeline,
 * since both can carry wikilinks / dynamic blocks / frontmatter that
 * the static export renderers won't resolve.
 */
export function sanitizeVaultNoteMarkdown(rawContent: string): string {
	let content = stripFrontmatter(rawContent);
	content = stripWikilinks(content);
	content = stripDynamicBlocks(content);
	return content.trim();
}