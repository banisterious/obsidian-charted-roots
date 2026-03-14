/**
 * Book Types
 *
 * Type definitions for the Book / Narrative Compilation feature (#294).
 * Defines the schema for book definitions (.book.json), chapter types,
 * generation results, and progress reporting.
 */

import type { ReportType } from '../../reports/types/report-types';
import type { VisualTreeChartType } from '../../trees/types/visual-tree-types';

/** Chapter types in a book */
export type BookChapterType = 'report' | 'visual-tree' | 'vault-note' | 'section-divider';

/** Output format for the generated book */
export type BookOutputFormat = 'pdf' | 'odt';

/** Configuration for a report chapter */
export interface ReportChapterConfig {
	reportType: ReportType;
	/** Subject person/place/collection CR ID */
	subjectCrId?: string;
	/** Subject name for display */
	subjectName?: string;
	/** Report-specific options (varies by report type) */
	reportOptions: Record<string, unknown>;
}

/** Configuration for a visual tree chapter */
export interface VisualTreeChapterConfig {
	chartType: VisualTreeChartType;
	rootPersonCrId: string;
	rootPersonName?: string;
	maxGenerations: number;
}

/** Configuration for a vault note chapter */
export interface VaultNoteChapterConfig {
	/** Path to the vault note (relative to vault root) */
	notePath: string;
}

/** Configuration for a section divider */
export interface SectionDividerConfig {
	/** Subtitle or descriptive text below the section title */
	subtitle?: string;
}

/** Union of all chapter config types */
export type BookChapterConfig =
	| ReportChapterConfig
	| VisualTreeChapterConfig
	| VaultNoteChapterConfig
	| SectionDividerConfig;

/** A single chapter in a book */
export interface BookChapter {
	/** Unique ID for this chapter (for reordering, persistence) */
	id: string;
	/** Chapter type */
	type: BookChapterType;
	/** Display title (user-editable, or auto-derived from report type) */
	title: string;
	/** Whether to insert a page break before this chapter */
	pageBreakBefore: boolean;
	/** Type-specific configuration */
	config: BookChapterConfig;
}

/** Book-level metadata */
export interface BookMetadata {
	title: string;
	subtitle?: string;
	author?: string;
	date?: string;
	/** Logo/crest image as base64 data URL */
	logoDataUrl?: string;
	/** Additional notes for the cover page */
	coverNotes?: string;
}

/** Book-level output options */
export interface BookOutputOptions {
	format: BookOutputFormat;
	pageSize: 'A4' | 'LETTER';
	fontStyle: 'serif' | 'sans-serif';
	dateFormat: 'mdy' | 'dmy' | 'ymd';
	includeCoverPage: boolean;
	includeTableOfContents: boolean;
	includeBibliography: boolean;
	includeNameIndex: boolean;
	/** Chapter numbering style */
	chapterNumbering: 'none' | 'numeric' | 'roman';
}

/**
 * Complete book definition (persisted as .book.json).
 * This is the schema for saved book configurations.
 */
export interface BookDefinition {
	/** Schema version for forward compatibility */
	version: 1;
	metadata: BookMetadata;
	chapters: BookChapter[];
	outputOptions: BookOutputOptions;
}

/** A single bibliography entry (deduplicated across chapters) */
export interface BibliographyEntry {
	/** Unique key for deduplication (normalized source text) */
	key: string;
	/** Formatted citation text */
	citation: string;
	/** Chapter titles where this source was referenced */
	referencedIn: string[];
}

/** A single name index entry */
export interface NameIndexEntry {
	/** Person's display name */
	name: string;
	/** Chapter titles where this person is mentioned */
	chapters: string[];
}

/** Result of generating a single chapter */
export interface ChapterGenerationResult {
	chapterId: string;
	chapterTitle: string;
	chapterType: BookChapterType;
	success: boolean;
	/** Markdown content (for report and vault-note chapters) */
	markdown?: string;
	/** Image data URL (for visual tree chapters) */
	imageDataUrl?: string;
	/** Image dimensions in points for visual tree chapters */
	imageDimensions?: { width: number; height: number };
	error?: string;
	warnings: string[];
}

/** Progress callback for book generation */
export interface BookGenerationProgress {
	currentChapter: number;
	totalChapters: number;
	chapterTitle: string;
	phase: 'generating' | 'rendering';
}

/** Result of generating the complete book */
export interface BookGenerationResult {
	success: boolean;
	/** Generated PDF or ODT blob */
	blob?: Blob;
	suggestedFilename: string;
	errors: string[];
	warnings: string[];
	stats: {
		chapterCount: number;
		totalPeople: number;
		totalSources: number;
		generationTimeMs: number;
	};
}
