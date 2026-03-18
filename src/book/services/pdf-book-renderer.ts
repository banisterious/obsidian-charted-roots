/**
 * PDF Book Renderer
 *
 * Assembles multiple chapters into a single pdfmake document with
 * cover page, table of contents, and consistent headers/footers.
 * Reuses PdfReportRenderer for markdown conversion and shared styles.
 */

import {
	PdfReportRenderer,
	type Content,
	type TDocumentDefinitions,
} from '../../reports/services/pdf-report-renderer';
import type {
	BookDefinition,
	BookOutputOptions,
	BookMetadata,
	ChapterGenerationResult,
	BibliographyEntry,
	NameIndexEntry,
} from '../types/book-types';

/** Color constants matching existing report palette */
const COLORS = {
	primaryText: '#1a1a2e',
	secondaryText: '#4a4a5a',
	accentBar: '#2c5282',
	dividerLine: '#cbd5e0',
};

/**
 * PDF Book Renderer
 *
 * Builds a single multi-chapter pdfmake document from chapter generation results.
 */
export class PdfBookRenderer {
	private pdfRenderer: PdfReportRenderer;

	constructor() {
		this.pdfRenderer = new PdfReportRenderer();
	}

	/**
	 * Render a complete book as a PDF blob.
	 */
	async renderBook(
		definition: BookDefinition,
		chapterResults: ChapterGenerationResult[],
		bibliography: BibliographyEntry[] = [],
		nameIndex: NameIndexEntry[] = []
	): Promise<Blob> {
		await this.pdfRenderer.ensurePdfMake();

		const docDefinition = this.buildDocumentDefinition(definition, chapterResults, bibliography, nameIndex);

		return new Promise<Blob>((resolve) => {
			this.pdfRenderer.pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
				resolve(blob);
			});
		});
	}

	/**
	 * Build the complete pdfmake document definition.
	 */
	private buildDocumentDefinition(
		definition: BookDefinition,
		chapterResults: ChapterGenerationResult[],
		bibliography: BibliographyEntry[],
		nameIndex: NameIndexEntry[]
	): TDocumentDefinitions {
		const { metadata, outputOptions } = definition;
		const defaultFont = this.pdfRenderer.getDefaultFont(outputOptions.fontStyle);
		const content: Content[] = [];

		// Cover page
		if (outputOptions.includeCoverPage) {
			content.push(...this.pdfRenderer.buildCoverPage(
				metadata.title,
				metadata.subtitle,
				metadata.logoDataUrl,
				metadata.coverNotes,
				outputOptions.dateFormat
			));
		}

		// Table of contents
		if (outputOptions.includeTableOfContents) {
			content.push(...this.buildTableOfContents());
		}

		// Chapters
		const successfulResults = chapterResults.filter(r => r.success);
		let chapterNumber = 0;
		for (let i = 0; i < successfulResults.length; i++) {
			const result = successfulResults[i];
			const chapter = definition.chapters.find(c => c.id === result.chapterId);
			if (!chapter) continue;

			// Number content chapters (not section dividers)
			let displayTitle = chapter.title;
			if (chapter.type !== 'section-divider' && outputOptions.chapterNumbering !== 'none') {
				chapterNumber++;
				const prefix = outputOptions.chapterNumbering === 'roman'
					? this.toRoman(chapterNumber)
					: String(chapterNumber);
				displayTitle = `${prefix}. ${chapter.title}`;
			}

			const isFirstContent = i === 0;
			content.push(...this.renderChapterContent(
				displayTitle,
				chapter.type,
				result,
				chapter.pageBreakBefore || !isFirstContent,
				chapter.type === 'section-divider' ? (chapter.config as import('../types/book-types').SectionDividerConfig).subtitle : undefined
			));
		}

		// Back matter: bibliography
		if (outputOptions.includeBibliography && bibliography.length > 0) {
			content.push(...this.renderBibliography(bibliography));
		}

		// Back matter: name index
		if (outputOptions.includeNameIndex && nameIndex.length > 0) {
			content.push(...this.renderNameIndex(nameIndex));
		}

		return {
			pageSize: outputOptions.pageSize,
			pageMargins: [40, 60, 40, 60],
			defaultStyle: {
				font: defaultFont,
				fontSize: 10,
			},
			header: this.createBookHeader(metadata.title),
			footer: this.pdfRenderer.createFooter(outputOptions.dateFormat),
			content,
			styles: this.pdfRenderer.getStyles(outputOptions.fontStyle),
		};
	}

	/**
	 * Build table of contents using pdfmake's built-in toc feature.
	 */
	private buildTableOfContents(): Content[] {
		return [
			{
				toc: {
					title: {
						text: 'Table of contents',
						style: 'title',
						margin: [0, 0, 0, 20],
					},
				},
				margin: [0, 0, 0, 0],
			} as Content,
			{ text: '', pageBreak: 'after' },
		];
	}

	/**
	 * Render a single chapter's content as pdfmake content array.
	 */
	private renderChapterContent(
		title: string,
		chapterType: string,
		result: ChapterGenerationResult,
		pageBreakBefore: boolean,
		subtitle?: string
	): Content[] {
		switch (chapterType) {
			case 'report':
			case 'vault-note':
				return this.renderMarkdownChapter(title, result.markdown || '', pageBreakBefore);
			case 'visual-tree':
				return this.renderImageChapter(
					title,
					result.imageDataUrl || '',
					result.imageDimensions || { width: 500, height: 400 },
					pageBreakBefore
				);
			case 'section-divider':
				return this.renderSectionDivider(title, pageBreakBefore, subtitle);
			default:
				return [];
		}
	}

	/**
	 * Render markdown chapter (report or vault note) to pdfmake content.
	 */
	private renderMarkdownChapter(
		title: string,
		markdown: string,
		pageBreakBefore: boolean
	): Content[] {
		const content: Content[] = [];

		if (pageBreakBefore) {
			content.push({ text: '', pageBreak: 'before' });
		}

		// Chapter title as heading, registered with TOC
		content.push({
			text: title,
			style: 'title',
			tocItem: true,
			margin: [0, 0, 0, 10],
		} as Content);

		// Convert markdown to pdfmake content
		this.pdfRenderer.resetFootnotes();
		const markdownContent = this.pdfRenderer.markdownToPdfContent(markdown);
		content.push(...markdownContent);

		// Append chapter endnotes
		const endnotes = this.pdfRenderer.buildEndnotesSection();
		if (endnotes.length > 0) {
			content.push(...endnotes);
		}

		return content;
	}

	/**
	 * Render visual tree chapter (PNG image) to pdfmake content.
	 */
	private renderImageChapter(
		title: string,
		imageDataUrl: string,
		dimensions: { width: number; height: number },
		pageBreakBefore: boolean
	): Content[] {
		const content: Content[] = [];

		// Switch to landscape for tree charts
		content.push({
			text: '',
			pageBreak: 'before',
			pageOrientation: 'landscape',
		} as Content);

		// Chapter title
		content.push({
			text: title,
			style: 'title',
			tocItem: true,
			margin: [0, 0, 0, 10],
		} as Content);

		// Scale image to fit landscape content area (40pt margins on each side)
		// Landscape letter: 792pt wide - 80pt margins = 712pt content area
		const maxWidth = 712;
		const maxHeight = 500; // Leave room for title and margins
		const scaleW = Math.min(1, maxWidth / dimensions.width);
		const scaleH = Math.min(1, maxHeight / dimensions.height);
		const scale = Math.min(scaleW, scaleH);
		const displayWidth = dimensions.width * scale;

		content.push({
			image: imageDataUrl,
			width: displayWidth,
			alignment: 'center',
			margin: [0, 10, 0, 10],
		} as Content);

		// Switch back to portrait for subsequent chapters
		content.push({
			text: '',
			pageBreak: 'after',
			pageOrientation: 'portrait',
		} as Content);

		return content;
	}

	/**
	 * Render section divider as a centered title page with decorative elements.
	 */
	private renderSectionDivider(
		title: string,
		pageBreakBefore: boolean,
		subtitle?: string
	): Content[] {
		const content: Content[] = [];

		if (pageBreakBefore) {
			content.push({ text: '', pageBreak: 'before' });
		}

		// Vertical spacer
		content.push({ text: '', margin: [0, 150, 0, 0] });

		// Upper decorative line
		content.push({
			canvas: [
				{
					type: 'line',
					x1: 157,
					y1: 0,
					x2: 357,
					y2: 0,
					lineWidth: 0.5,
					lineColor: COLORS.dividerLine,
				},
			],
			margin: [0, 0, 0, 15],
		} as Content);

		// Section title
		content.push({
			text: title,
			fontSize: 26,
			bold: true,
			alignment: 'center',
			color: COLORS.primaryText,
			tocItem: true,
			margin: [0, 0, 0, 8],
		} as Content);

		// Lower decorative line
		content.push({
			canvas: [
				{
					type: 'line',
					x1: 157,
					y1: 0,
					x2: 357,
					y2: 0,
					lineWidth: 0.5,
					lineColor: COLORS.dividerLine,
				},
			],
			margin: [0, 0, 0, 0],
		} as Content);

		// Subtitle if present
		if (subtitle) {
			content.push({
				text: subtitle,
				fontSize: 14,
				italics: true,
				alignment: 'center',
				color: COLORS.secondaryText,
				margin: [0, 15, 0, 0],
			} as Content);
		}

		return content;
	}

	/**
	 * Render consolidated bibliography as a back matter section.
	 */
	private renderBibliography(entries: BibliographyEntry[]): Content[] {
		const content: Content[] = [
			{ text: '', pageBreak: 'before' },
			{
				text: 'Bibliography',
				style: 'title',
				tocItem: true,
				margin: [0, 0, 0, 15],
			} as Content,
		];

		for (const entry of entries) {
			content.push({
				text: entry.citation,
				fontSize: 9,
				margin: [20, 0, 0, 4],
				color: COLORS.primaryText,
			} as Content);

			if (entry.referencedIn.length > 1) {
				content.push({
					text: `Referenced in: ${entry.referencedIn.join(', ')}`,
					fontSize: 8,
					italics: true,
					color: COLORS.secondaryText,
					margin: [20, 0, 0, 6],
				} as Content);
			}
		}

		return content;
	}

	/**
	 * Render name index as a back matter section.
	 * Groups entries alphabetically by last name.
	 */
	private renderNameIndex(entries: NameIndexEntry[]): Content[] {
		const content: Content[] = [
			{ text: '', pageBreak: 'before' },
			{
				text: 'Name index',
				style: 'title',
				tocItem: true,
				margin: [0, 0, 0, 15],
			} as Content,
		];

		// Group by first letter of last name
		let currentLetter = '';
		for (const entry of entries) {
			const lastName = entry.name.split(/\s+/).pop() || '';
			const letter = lastName.charAt(0).toUpperCase();

			if (letter !== currentLetter) {
				currentLetter = letter;
				content.push({
					text: letter,
					fontSize: 14,
					bold: true,
					color: COLORS.accentBar,
					margin: [0, 10, 0, 4],
				} as Content);
			}

			content.push({
				text: [
					{ text: entry.name, bold: true, fontSize: 9 },
					{ text: ` — ${entry.chapters.join(', ')}`, fontSize: 9, color: COLORS.secondaryText },
				],
				margin: [10, 0, 0, 2],
			} as Content);
		}

		return content;
	}

	/**
	 * Convert a number to a Roman numeral string.
	 */
	private toRoman(num: number): string {
		const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
		const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
		let result = '';
		for (let i = 0; i < values.length; i++) {
			while (num >= values[i]) {
				result += numerals[i];
				num -= values[i];
			}
		}
		return result;
	}

	/**
	 * Create book header showing book title on left, "Charted Roots" on right.
	 */
	private createBookHeader(bookTitle: string): (currentPage: number, pageCount: number) => Content {
		return (currentPage: number, _pageCount: number): Content => {
			// Skip header on first page (cover page)
			if (currentPage === 1) {
				return { text: '' };
			}
			return {
				columns: [
					{ text: bookTitle, style: 'pageHeader', alignment: 'left' },
					{ text: 'Charted Roots', style: 'pageHeader', alignment: 'right' },
				],
				margin: [40, 20, 40, 0],
			};
		};
	}
}
