/**
 * Book Generation Service
 *
 * Orchestrates the generation of a complete book from a BookDefinition.
 * Iterates through chapters, generates content for each (reports, visual trees,
 * vault notes, section dividers), then delegates to PdfBookRenderer or
 * OdtBookRenderer for final document assembly.
 */

import { App, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { CanvasRootsSettings } from '../../settings';
import { ReportGenerationService } from '../../reports/services/report-generation-service';
import { VisualTreeService } from '../../trees/services/visual-tree-service';
import { VisualTreeSvgRenderer } from '../../trees/services/visual-tree-svg-renderer';
import type { VisualTreeOptions } from '../../trees/types/visual-tree-types';
import { PdfBookRenderer } from './pdf-book-renderer';
import { OdtBookRenderer } from './odt-book-renderer';
import type {
	BookDefinition,
	BookChapter,
	BookGenerationProgress,
	BookGenerationResult,
	ChapterGenerationResult,
	ReportChapterConfig,
	VisualTreeChapterConfig,
	VaultNoteChapterConfig,
	BibliographyEntry,
	NameIndexEntry,
} from '../types/book-types';
import { getLogger } from '../../core/logging';

const logger = getLogger('BookGenerationService');

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	if (match) {
		return content.slice(match[0].length);
	}
	return content;
}

/**
 * Strip wikilinks, keeping display text or link target.
 */
function stripWikilinks(content: string): string {
	return content.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_match, target, _pipe, alias) => alias || target);
}

/**
 * Strip charted-roots dynamic code blocks that won't render in a document.
 */
function stripDynamicBlocks(content: string): string {
	return content.replace(/```charted-roots-[\s\S]*?```/g, '');
}

/**
 * Sanitize vault note markdown for document rendering.
 */
function sanitizeVaultNoteMarkdown(rawContent: string): string {
	let content = stripFrontmatter(rawContent);
	content = stripWikilinks(content);
	content = stripDynamicBlocks(content);
	return content.trim();
}

export class BookGenerationService {
	private app: App;
	private settings: CanvasRootsSettings;
	private plugin: CanvasRootsPlugin;

	constructor(app: App, settings: CanvasRootsSettings, plugin: CanvasRootsPlugin) {
		this.app = app;
		this.settings = settings;
		this.plugin = plugin;
	}

	/**
	 * Generate a complete book from a definition.
	 */
	async generateBook(
		definition: BookDefinition,
		onProgress?: (progress: BookGenerationProgress) => void
	): Promise<BookGenerationResult> {
		const startTime = Date.now();
		const chapterResults: ChapterGenerationResult[] = [];
		const errors: string[] = [];
		const warnings: string[] = [];
		let totalPeople = 0;
		let totalSources = 0;

		logger.info('generateBook', `Generating book: ${definition.metadata.title}`, {
			chapterCount: definition.chapters.length,
			format: definition.outputOptions.format,
		});

		// Generate each chapter's content
		for (let i = 0; i < definition.chapters.length; i++) {
			const chapter = definition.chapters[i];

			onProgress?.({
				currentChapter: i + 1,
				totalChapters: definition.chapters.length,
				chapterTitle: chapter.title,
				phase: 'generating',
			});

			const result = await this.generateChapter(chapter);
			chapterResults.push(result);

			if (!result.success && result.error) {
				errors.push(`Chapter "${chapter.title}": ${result.error}`);
			}
			warnings.push(...result.warnings.map(w => `Chapter "${chapter.title}": ${w}`));
		}

		// Check if any chapters succeeded
		const successfulCount = chapterResults.filter(r => r.success).length;
		if (successfulCount === 0) {
			return {
				success: false,
				suggestedFilename: this.buildFilename(definition),
				errors: errors.length > 0 ? errors : ['No chapters generated successfully'],
				warnings,
				stats: {
					chapterCount: 0,
					totalPeople,
					totalSources,
					generationTimeMs: Date.now() - startTime,
				},
			};
		}

		// Render to the chosen format
		onProgress?.({
			currentChapter: definition.chapters.length,
			totalChapters: definition.chapters.length,
			chapterTitle: 'Assembling document',
			phase: 'rendering',
		});

		// Collect back matter data
		const bibliography = definition.outputOptions.includeBibliography
			? this.collectBibliography(chapterResults)
			: [];
		const nameIndex = definition.outputOptions.includeNameIndex
			? this.collectNameIndex(chapterResults)
			: [];

		let blob: Blob;
		try {
			if (definition.outputOptions.format === 'pdf') {
				const renderer = new PdfBookRenderer();
				blob = await renderer.renderBook(definition, chapterResults, bibliography, nameIndex);
			} else {
				const renderer = new OdtBookRenderer();
				blob = await renderer.renderBook(definition, chapterResults, bibliography, nameIndex);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error('generateBook', 'Failed to render book', { error: message });
			return {
				success: false,
				suggestedFilename: this.buildFilename(definition),
				errors: [`Failed to render document: ${message}`],
				warnings,
				stats: {
					chapterCount: successfulCount,
					totalPeople,
					totalSources,
					generationTimeMs: Date.now() - startTime,
				},
			};
		}

		// Compute content hashes and detect changes
		const chapterHashes = this.computeChapterHashes(chapterResults);
		const changedChapters = this.detectChangedChapters(
			chapterHashes,
			definition.lastChapterHashes
		);

		logger.info('generateBook', 'Book generated successfully', {
			chapters: successfulCount,
			changedCount: changedChapters.length,
			timeMs: Date.now() - startTime,
		});

		return {
			success: true,
			blob,
			suggestedFilename: this.buildFilename(definition),
			errors,
			warnings,
			stats: {
				chapterCount: successfulCount,
				totalPeople,
				totalSources,
				generationTimeMs: Date.now() - startTime,
			},
			chapterHashes,
			changedChapters,
		};
	}

	/**
	 * Generate content for a single chapter, dispatching by type.
	 */
	private async generateChapter(chapter: BookChapter): Promise<ChapterGenerationResult> {
		try {
			switch (chapter.type) {
				case 'report':
					return await this.generateReportChapter(chapter);
				case 'visual-tree':
					return await this.generateVisualTreeChapter(chapter);
				case 'vault-note':
					return await this.generateVaultNoteChapter(chapter);
				case 'section-divider':
					return this.generateSectionDividerChapter(chapter);
				default:
					return {
						chapterId: chapter.id,
						chapterTitle: chapter.title,
						chapterType: chapter.type,
						success: false,
						error: `Unknown chapter type: ${chapter.type}`,
						warnings: [],
					};
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error('generateChapter', `Failed to generate chapter: ${chapter.title}`, { error: message });
			return {
				chapterId: chapter.id,
				chapterTitle: chapter.title,
				chapterType: chapter.type,
				success: false,
				error: message,
				warnings: [],
			};
		}
	}

	/**
	 * Generate a report chapter by delegating to ReportGenerationService.
	 */
	private async generateReportChapter(chapter: BookChapter): Promise<ChapterGenerationResult> {
		const config = chapter.config as ReportChapterConfig;
		const reportService = new ReportGenerationService(this.app, this.settings);

		// Build options for the report generator
		// The reportOptions should contain all necessary fields for the specific report type
		const options = {
			...config.reportOptions,
			outputMethod: 'vault' as const, // We just want the markdown content
		};

		const result = await reportService.generateReport(
			config.reportType,
			options as Parameters<typeof reportService.generateReport>[1]
		);

		if (!result.success) {
			return {
				chapterId: chapter.id,
				chapterTitle: chapter.title,
				chapterType: chapter.type,
				success: false,
				error: result.error || 'Report generation failed',
				warnings: result.warnings,
			};
		}

		return {
			chapterId: chapter.id,
			chapterTitle: chapter.title,
			chapterType: chapter.type,
			success: true,
			markdown: result.content,
			warnings: result.warnings,
		};
	}

	/**
	 * Generate a visual tree chapter using the tree rendering pipeline.
	 */
	private async generateVisualTreeChapter(chapter: BookChapter): Promise<ChapterGenerationResult> {
		const config = chapter.config as VisualTreeChapterConfig;
		const familyGraphService = this.plugin.createFamilyGraphService();
		const treeService = new VisualTreeService(this.app, familyGraphService);
		const svgRenderer = new VisualTreeSvgRenderer();

		const treeOptions: VisualTreeOptions = {
			rootPersonCrId: config.rootPersonCrId,
			chartType: config.chartType,
			maxGenerations: config.maxGenerations,
			pageSize: 'letter',
			orientation: 'landscape',
			nodeContent: 'name-dates',
			colorScheme: 'default',
			includeSpouses: true,
		};

		const layouts = treeService.buildLayouts(treeOptions);
		if (layouts.length === 0) {
			return {
				chapterId: chapter.id,
				chapterTitle: chapter.title,
				chapterType: chapter.type,
				success: false,
				error: 'No tree layout generated',
				warnings: [],
			};
		}

		// Use the first layout (single-page for book chapters)
		const layout = layouts[0];
		const svgString = svgRenderer.renderToSvg(layout, treeOptions);
		const imageDataUrl = await svgRenderer.svgToDataUrl(
			svgString,
			layout.page.width,
			layout.page.height
		);

		return {
			chapterId: chapter.id,
			chapterTitle: chapter.title,
			chapterType: chapter.type,
			success: true,
			imageDataUrl,
			imageDimensions: {
				width: layout.page.width,
				height: layout.page.height,
			},
			warnings: [],
		};
	}

	/**
	 * Read a vault note and return its sanitized markdown content.
	 */
	private async generateVaultNoteChapter(chapter: BookChapter): Promise<ChapterGenerationResult> {
		const config = chapter.config as VaultNoteChapterConfig;
		const file = this.app.vault.getAbstractFileByPath(config.notePath);

		if (!file) {
			return {
				chapterId: chapter.id,
				chapterTitle: chapter.title,
				chapterType: chapter.type,
				success: false,
				error: `File not found: ${config.notePath}`,
				warnings: [],
			};
		}

		// vault.read() works on TFile
		const rawContent = await this.app.vault.read(file as import('obsidian').TFile);
		const markdown = sanitizeVaultNoteMarkdown(rawContent);

		return {
			chapterId: chapter.id,
			chapterTitle: chapter.title,
			chapterType: chapter.type,
			success: true,
			markdown,
			warnings: [],
		};
	}

	/**
	 * Generate a section divider — no content generation needed.
	 */
	private generateSectionDividerChapter(chapter: BookChapter): ChapterGenerationResult {
		return {
			chapterId: chapter.id,
			chapterTitle: chapter.title,
			chapterType: chapter.type,
			success: true,
			warnings: [],
		};
	}

	/**
	 * Collect and deduplicate bibliography entries from all chapter markdown.
	 * Extracts footnote definitions ([^N]: text) from each chapter.
	 */
	collectBibliography(chapterResults: ChapterGenerationResult[]): BibliographyEntry[] {
		const entryMap = new Map<string, BibliographyEntry>();

		for (const result of chapterResults) {
			if (!result.success || !result.markdown) continue;

			// Match footnote definitions: [^1]: citation text (may span multiple lines)
			const footnoteRegex = /^\[\^\d+\]:\s*(.+(?:\n(?!\[\^)(?!$).+)*)/gm;
			let match;
			while ((match = footnoteRegex.exec(result.markdown)) !== null) {
				const citation = match[1].replace(/\n\s*/g, ' ').trim();
				const key = citation.toLowerCase().replace(/\s+/g, ' ');

				const existing = entryMap.get(key);
				if (existing) {
					if (!existing.referencedIn.includes(result.chapterTitle)) {
						existing.referencedIn.push(result.chapterTitle);
					}
				} else {
					entryMap.set(key, {
						key,
						citation,
						referencedIn: [result.chapterTitle],
					});
				}
			}
		}

		// Sort alphabetically by citation
		return Array.from(entryMap.values())
			.sort((a, b) => a.citation.localeCompare(b.citation));
	}

	/**
	 * Collect person names mentioned across all chapters for the name index.
	 * Looks for bold names (common in reports) and wikilink-style references.
	 */
	collectNameIndex(chapterResults: ChapterGenerationResult[]): NameIndexEntry[] {
		const nameMap = new Map<string, Set<string>>();

		for (const result of chapterResults) {
			if (!result.success || !result.markdown) continue;

			// Bold names: **First Last** (common pattern in reports)
			const boldRegex = /\*\*([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)+)\*\*/g;
			let match;
			while ((match = boldRegex.exec(result.markdown)) !== null) {
				const name = match[1].trim();
				if (!nameMap.has(name)) {
					nameMap.set(name, new Set());
				}
				nameMap.get(name)!.add(result.chapterTitle);
			}

			// Table cell names: | Name | pattern — first column often contains person names
			const tableRowRegex = /^\|\s*\*?\*?([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)+)\*?\*?\s*\|/gm;
			while ((match = tableRowRegex.exec(result.markdown)) !== null) {
				const name = match[1].trim();
				if (!nameMap.has(name)) {
					nameMap.set(name, new Set());
				}
				nameMap.get(name)!.add(result.chapterTitle);
			}
		}

		// Sort by last name, then first name
		return Array.from(nameMap.entries())
			.map(([name, chapters]) => ({
				name,
				chapters: Array.from(chapters),
			}))
			.sort((a, b) => {
				const aLast = a.name.split(/\s+/).pop() || '';
				const bLast = b.name.split(/\s+/).pop() || '';
				if (aLast !== bLast) return aLast.localeCompare(bLast);
				return a.name.localeCompare(b.name);
			});
	}

	/**
	 * Compute a simple hash for each chapter's content for change detection.
	 */
	private computeChapterHashes(chapterResults: ChapterGenerationResult[]): Record<string, string> {
		const hashes: Record<string, string> = {};
		for (const result of chapterResults) {
			if (!result.success) continue;
			const content = result.markdown || result.imageDataUrl || '';
			hashes[result.chapterId] = this.simpleHash(content);
		}
		return hashes;
	}

	/**
	 * Compare current hashes with previous hashes to find changed chapters.
	 */
	private detectChangedChapters(
		currentHashes: Record<string, string>,
		previousHashes?: Record<string, string>
	): string[] {
		if (!previousHashes) return Object.keys(currentHashes);

		const changed: string[] = [];
		for (const [chapterId, hash] of Object.entries(currentHashes)) {
			if (previousHashes[chapterId] !== hash) {
				changed.push(chapterId);
			}
		}
		return changed;
	}

	/**
	 * Simple string hash (djb2 algorithm) for change detection.
	 */
	private simpleHash(str: string): string {
		let hash = 5381;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) + hash) + str.charCodeAt(i);
			hash = hash & hash; // Convert to 32-bit integer
		}
		return (hash >>> 0).toString(36);
	}

	/**
	 * Build a suggested filename from the book metadata.
	 */
	private buildFilename(definition: BookDefinition): string {
		const title = definition.metadata.title
			.replace(/[^a-zA-Z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.substring(0, 60);
		const ext = definition.outputOptions.format === 'pdf' ? 'pdf' : 'odt';
		return `${title}.${ext}`;
	}

	/**
	 * Download the generated book blob.
	 */
	static downloadBook(blob: Blob, filename: string): void {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		new Notice(`Book downloaded: ${filename}`);
	}

	/**
	 * Save the generated book blob to the vault.
	 */
	async saveToVault(blob: Blob, filename: string, folder?: string): Promise<string> {
		const path = folder ? `${folder}/${filename}` : filename;
		const arrayBuffer = await blob.arrayBuffer();
		await this.app.vault.createBinary(path, arrayBuffer);
		new Notice(`Book saved: ${path}`);
		return path;
	}
}
