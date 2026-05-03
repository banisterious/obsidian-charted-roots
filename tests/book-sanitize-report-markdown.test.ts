import { describe, expect, it } from 'vitest';
import { sanitizeVaultNoteMarkdown } from '../src/book/services/sanitize-markdown';

/**
 * #522 regression: report chapters in Book Builder rendered raw
 * `[[wikilink]]` syntax in PDF/ODT output because their markdown was
 * passed through to the renderer without sanitization. The vault-note
 * chapter type already ran through `sanitizeVaultNoteMarkdown`; the
 * fix made the report chapter type do the same. These tests fence the
 * sanitizer's contract against realistic report-shaped markdown so a
 * future change to `stripWikilinks` (or its callers) doesn't silently
 * regress.
 */

describe('sanitizeVaultNoteMarkdown — report chapter wikilink handling (#522)', () => {
	it('strips simple [[Name]] wikilinks from a Family Group Sheet header', () => {
		const input = [
			'# Family Group Sheet: William Anderson & Margaret O\'Brien',
			'',
			'## Husband',
			'',
			'- **Name:** [[William Anderson]]',
			'- **Birth:** 1905-03-12, [[Boston Suffolk County]]',
			'- **Death:** 1982-09-08, [[Miami Miami-Dade County]]',
		].join('\n');

		const output = sanitizeVaultNoteMarkdown(input);

		expect(output).toContain('**Name:** William Anderson');
		expect(output).toContain('**Birth:** 1905-03-12, Boston Suffolk County');
		expect(output).toContain('**Death:** 1982-09-08, Miami Miami-Dade County');
		expect(output).not.toContain('[[');
		expect(output).not.toContain(']]');
	});

	it('strips piped [[Target|Display]] wikilinks keeping the display text', () => {
		const input = [
			'## Witnesses',
			'',
			'- [[John Smith Sr.|John Smith Sr. (Decedent)]]',
			'- [[Thomas Brown|Thomas Brown (Administrator)]]',
		].join('\n');

		const output = sanitizeVaultNoteMarkdown(input);

		expect(output).toContain('John Smith Sr. (Decedent)');
		expect(output).toContain('Thomas Brown (Administrator)');
		expect(output).not.toContain('[[');
		expect(output).not.toContain(']]');
	});

	it('strips wikilinks inside markdown table cells (Children section)', () => {
		const input = [
			'## Children',
			'',
			'| Name | Birth | Death | Spouse |',
			'|------|-------|-------|--------|',
			'| [[Robert Anderson]] | 1930-01-25 | 2015-03-17 | [[Helen Henderson]] |',
			'| [[Susan Anderson]] | 1933-09-06 |  | [[Richard Cooper]] |',
		].join('\n');

		const output = sanitizeVaultNoteMarkdown(input);

		expect(output).toContain('| Robert Anderson | 1930-01-25 | 2015-03-17 | Helen Henderson |');
		expect(output).toContain('| Susan Anderson | 1933-09-06 |  | Richard Cooper |');
		expect(output).not.toContain('[[');
	});

	it('handles multiple wikilinks on the same line', () => {
		const input = '**Parents:** [[John Anderson]] and [[Mary Smith]]';
		const output = sanitizeVaultNoteMarkdown(input);
		expect(output).toBe('**Parents:** John Anderson and Mary Smith');
	});

	it('preserves non-wikilink text including stray brackets in prose', () => {
		// Paranoia: the regex should not eat single brackets or non-wikilink
		// constructs like markdown links.
		const input = 'See note [a] and [external link](http://example.com) and [[Real Wikilink]].';
		const output = sanitizeVaultNoteMarkdown(input);
		expect(output).toContain('[a]');
		expect(output).toContain('[external link](http://example.com)');
		expect(output).toContain('Real Wikilink');
		expect(output).not.toContain('[[Real Wikilink]]');
	});

	it('strips frontmatter when present (vault-note path safety)', () => {
		const input = [
			'---',
			'cr_type: report',
			'title: "Family Group Sheet"',
			'---',
			'',
			'# Family Group Sheet',
			'',
			'Body content.',
		].join('\n');

		const output = sanitizeVaultNoteMarkdown(input);

		expect(output).not.toContain('cr_type');
		expect(output).not.toContain('---');
		expect(output).toContain('# Family Group Sheet');
		expect(output).toContain('Body content.');
	});

	it('strips charted-roots-* dynamic code blocks', () => {
		const input = [
			'# Person',
			'',
			'```charted-roots-media',
			'columns: 3',
			'```',
			'',
			'Other content.',
		].join('\n');

		const output = sanitizeVaultNoteMarkdown(input);

		expect(output).not.toContain('charted-roots-media');
		expect(output).not.toContain('columns: 3');
		expect(output).toContain('Other content.');
	});
});
