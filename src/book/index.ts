/**
 * Book / Narrative Compilation module
 *
 * Exports for the book builder feature (#294).
 */

export type {
	BookChapterType,
	BookOutputFormat,
	ReportChapterConfig,
	VisualTreeChapterConfig,
	VaultNoteChapterConfig,
	SectionDividerConfig,
	BookChapterConfig,
	BookChapter,
	BookMetadata,
	BookOutputOptions,
	BookDefinition,
	ChapterGenerationResult,
	BookGenerationProgress,
	BookGenerationResult,
} from './types/book-types';

export { BookGenerationService } from './services/book-generation-service';
export { PdfBookRenderer } from './services/pdf-book-renderer';
export { OdtBookRenderer } from './services/odt-book-renderer';
export { BookBuilderModal } from './ui/book-builder-modal';
export type { BookBuilderOptions } from './ui/book-builder-modal';
