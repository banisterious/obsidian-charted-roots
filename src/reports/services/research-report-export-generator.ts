/* eslint-disable @typescript-eslint/no-unsafe-return -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Research Report Export Generator
 *
 * Generates export content from a markdown research report note.
 * Unlike other generators, this reads an existing note rather than
 * generating content from structured data.
 */

import { App, TFile } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	ResearchReportExportOptions,
	ResearchReportExportResult
} from '../types/report-types';
import { hasFootnotes, getFootnoteMarkerIds } from '../utils/footnote-parser';
import { getLogger } from '../../core/logging';

const logger = getLogger('ResearchReportExportGenerator');

/**
 * Generator for Research Report exports
 */
export class ResearchReportExportGenerator {
	private app: App;
	private settings: CanvasRootsSettings;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Generate research report export
	 */
	async generate(options: ResearchReportExportOptions): Promise<ResearchReportExportResult> {
		logger.info('generate', 'Generating Research Report Export', { notePath: options.notePath });

		const warnings: string[] = [];

		// Get the file
		const file = this.app.vault.getAbstractFileByPath(options.notePath);
		if (!file || !(file instanceof TFile)) {
			return {
				success: false,
				content: '',
				suggestedFilename: 'research-report.md',
				stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0 },
				error: `Note not found: ${options.notePath}`,
				warnings: [],
				noteTitle: 'Unknown',
				wordCount: 0,
				footnoteCount: 0
			};
		}

		// Read the note content
		const rawContent = await this.app.vault.read(file);

		// Parse frontmatter and body
		const { frontmatter, body } = this.parseNote(rawContent);

		// Determine title
		const noteTitle = options.customTitle || frontmatter.title || file.basename;

		// Process the body
		// Strip wikilinks to plain text
		const processedBody = this.stripWikilinks(body);

		// Count statistics
		const wordCount = this.countWords(processedBody);
		const footnoteCount = this.countFootnotes(processedBody);

		// Build suggested filename
		const suggestedFilename = this.sanitizeFilename(noteTitle) + '.pdf';

		logger.info('generate', 'Research report processed', {
			title: noteTitle,
			wordCount,
			footnoteCount
		});

		return {
			success: true,
			content: processedBody,
			suggestedFilename,
			stats: {
				peopleCount: 0,
				eventsCount: 0,
				sourcesCount: footnoteCount
			},
			warnings,
			noteTitle,
			wordCount,
			footnoteCount
		};
	}

	/**
	 * Parse note content into frontmatter and body
	 */
	private parseNote(content: string): { frontmatter: Record<string, unknown>; body: string } {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return { frontmatter: {}, body: content };
		}

		// Parse YAML frontmatter (simple key: value parsing)
		const frontmatterText = match[1];
		const frontmatter: Record<string, unknown> = {};

		for (const line of frontmatterText.split('\n')) {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.slice(0, colonIndex).trim();
				let value: string | boolean | number = line.slice(colonIndex + 1).trim();
				// Remove quotes if present
				if ((value.startsWith('"') && value.endsWith('"')) ||
					(value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1);
				}
				frontmatter[key] = value;
			}
		}

		const body = content.slice(match[0].length);
		return { frontmatter, body };
	}

	/**
	 * Strip wikilinks from text, keeping display text
	 */
	private stripWikilinks(text: string): string {
		// [[Target|Display]] -> Display
		// [[Target]] -> Target
		return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => {
			return display || target;
		});
	}

	/**
	 * Count words in text
	 */
	private countWords(text: string): number {
		// Remove markdown syntax
		const cleaned = text
			.replace(/```[\s\S]*?```/g, '') // code blocks
			.replace(/`[^`]+`/g, '') // inline code
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links
			.replace(/[#*_~`]/g, '') // markdown formatting
			.replace(/\[\^[^\]]+\]/g, '') // footnote markers
			.replace(/\[\^[^\]]+\]:[^\n]+/g, ''); // footnote definitions

		// Count words
		const words = cleaned.match(/\b\w+\b/g);
		return words ? words.length : 0;
	}

	/**
	 * Count footnotes in text
	 */
	private countFootnotes(text: string): number {
		if (!hasFootnotes(text)) {
			return 0;
		}
		const ids = getFootnoteMarkerIds(text);
		// Count unique footnote IDs
		return new Set(ids).size;
	}

	/**
	 * Sanitize filename
	 */
	private sanitizeFilename(name: string): string {
		return name
			.replace(/[<>:"/\\|?*]/g, '-')
			.replace(/\s+/g, ' ')
			.trim();
	}
}

/**
 * Create a ResearchReportExportGenerator instance
 */
export function createResearchReportExportGenerator(
	app: App,
	settings: CanvasRootsSettings
): ResearchReportExportGenerator {
	return new ResearchReportExportGenerator(app, settings);
}

/* eslint-enable @typescript-eslint/no-unsafe-return */
