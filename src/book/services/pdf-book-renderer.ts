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
		chapterResults: ChapterGenerationResult[]
	): Promise<Blob> {
		await this.pdfRenderer.ensurePdfMake();

		const docDefinition = this.buildDocumentDefinition(definition, chapterResults);

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
		chapterResults: ChapterGenerationResult[]
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
		for (let i = 0; i < successfulResults.length; i++) {
			const result = successfulResults[i];
			const chapter = definition.chapters.find(c => c.id === result.chapterId);
			if (!chapter) continue;

			const isFirstContent = i === 0;
			content.push(...this.renderChapterContent(
				chapter.title,
				chapter.type,
				result,
				chapter.pageBreakBefore || !isFirstContent
			));
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
		pageBreakBefore: boolean
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
				return this.renderSectionDivider(title, pageBreakBefore);
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

		if (pageBreakBefore) {
			content.push({ text: '', pageBreak: 'before' });
		}

		// Chapter title
		content.push({
			text: title,
			style: 'title',
			tocItem: true,
			margin: [0, 0, 0, 10],
		} as Content);

		// Scale image to fit page width (515pt content area for A4 with 40pt margins)
		const maxWidth = 515;
		const scale = Math.min(1, maxWidth / dimensions.width);
		const displayWidth = dimensions.width * scale;

		content.push({
			image: imageDataUrl,
			width: displayWidth,
			alignment: 'center',
			margin: [0, 10, 0, 10],
		} as Content);

		return content;
	}

	/**
	 * Render section divider as a centered title page.
	 */
	private renderSectionDivider(
		title: string,
		pageBreakBefore: boolean
	): Content[] {
		const content: Content[] = [];

		if (pageBreakBefore) {
			content.push({ text: '', pageBreak: 'before' });
		}

		// Vertical spacer
		content.push({ text: '', margin: [0, 150, 0, 0] });

		// Section title
		content.push({
			text: title,
			fontSize: 24,
			bold: true,
			alignment: 'center',
			color: COLORS.primaryText,
			tocItem: true,
			margin: [0, 0, 0, 20],
		} as Content);

		// Decorative line
		content.push({
			canvas: [
				{
					type: 'line',
					x1: 157,
					y1: 0,
					x2: 357,
					y2: 0,
					lineWidth: 1,
					lineColor: COLORS.dividerLine,
				},
			],
			margin: [0, 0, 0, 0],
		} as Content);

		return content;
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
