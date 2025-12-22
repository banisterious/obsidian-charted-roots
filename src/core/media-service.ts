/**
 * Media Service
 *
 * Entity-agnostic media linking, resolution, and gallery support.
 * Provides shared functionality for media handling across all entity types.
 */

import { App, TFile } from 'obsidian';
import type { CanvasRootsSettings } from '../settings';

/**
 * Supported image extensions for thumbnails
 */
export const IMAGE_EXTENSIONS = ['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'];

/**
 * Supported audio extensions
 */
export const AUDIO_EXTENSIONS = ['.flac', '.m4a', '.mp3', '.ogg', '.wav', '.webm', '.3gp'];

/**
 * Supported video extensions
 */
export const VIDEO_EXTENSIONS = ['.mkv', '.mov', '.mp4', '.ogv', '.webm'];

/**
 * Supported PDF extensions
 */
export const PDF_EXTENSIONS = ['.pdf'];

/**
 * Supported document extensions (non-native preview)
 */
export const DOCUMENT_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];

/**
 * Media type classification
 */
export type MediaType = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'other';

/**
 * Entity types that support media
 */
export type MediaEntityType = 'person' | 'event' | 'place' | 'organization' | 'source';

/**
 * Resolved media item with file information
 */
export interface MediaItem {
	/** Original media reference from frontmatter (wikilink or path) */
	mediaRef: string;
	/** Resolved file in vault (if found) */
	file: TFile | null;
	/** Type of media */
	type: MediaType;
	/** Display name (filename without path) */
	displayName: string;
	/** File extension (lowercase, with dot) */
	extension: string;
}

/**
 * Media linked to an entity
 */
export interface EntityMedia {
	/** Entity type */
	entityType: MediaEntityType;
	/** Entity's cr_id */
	entityCrId: string;
	/** Entity's display name */
	entityName: string;
	/** Entity's file */
	entityFile: TFile;
	/** Resolved media items */
	media: MediaItem[];
}

/**
 * Service for entity-agnostic media operations
 */
export class MediaService {
	constructor(
		private app: App,
		private settings: CanvasRootsSettings
	) {}

	/**
	 * Parse media array from frontmatter.
	 * Expects YAML array format:
	 *   media:
	 *     - "[[file1.jpg]]"
	 *     - "[[file2.jpg]]"
	 *
	 * Also handles single value for backwards compatibility.
	 */
	parseMediaProperty(frontmatter: Record<string, unknown>): string[] {
		if (!frontmatter.media) return [];

		// Handle array format
		if (Array.isArray(frontmatter.media)) {
			return frontmatter.media.filter((item): item is string => typeof item === 'string');
		}

		// Single value - wrap in array
		if (typeof frontmatter.media === 'string') {
			return [frontmatter.media];
		}

		return [];
	}

	/**
	 * Resolve a media reference (wikilink or path) to a MediaItem
	 */
	resolveMediaItem(mediaRef: string): MediaItem {
		// Parse wikilink or path
		let path = mediaRef;

		// Handle wikilinks: [[path]] or [[path|alias]]
		const wikilinkMatch = mediaRef.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
		if (wikilinkMatch) {
			path = wikilinkMatch[1];
		}

		// Try to find the file
		const abstractFile = this.app.vault.getAbstractFileByPath(path);
		const file = abstractFile instanceof TFile ? abstractFile : null;

		// Determine type from extension
		const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
		const type = this.getMediaType(ext);

		// Get display name (filename without path)
		const displayName = path.substring(path.lastIndexOf('/') + 1);

		return {
			mediaRef,
			file,
			type,
			displayName,
			extension: ext
		};
	}

	/**
	 * Resolve all media references to MediaItems
	 */
	resolveMediaItems(mediaRefs: string[]): MediaItem[] {
		return mediaRefs.map(ref => this.resolveMediaItem(ref));
	}

	/**
	 * Get the first media item suitable for use as a thumbnail.
	 * Returns the first image or video, skipping audio/documents.
	 */
	getFirstThumbnailMedia(mediaRefs: string[]): MediaItem | null {
		for (const ref of mediaRefs) {
			const item = this.resolveMediaItem(ref);
			if (item.type === 'image' || item.type === 'video') {
				return item;
			}
		}
		return null;
	}

	/**
	 * Get the first media file suitable for use as a thumbnail.
	 * Returns the TFile if found, null otherwise.
	 */
	getFirstThumbnailFile(mediaRefs: string[]): TFile | null {
		const item = this.getFirstThumbnailMedia(mediaRefs);
		return item?.file ?? null;
	}

	/**
	 * Determine media type from file extension
	 */
	getMediaType(extension: string): MediaType {
		const ext = extension.toLowerCase();

		if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
		if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
		if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
		if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
		if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';

		return 'other';
	}

	/**
	 * Check if a file extension is a supported image type
	 */
	isImageExtension(extension: string): boolean {
		return IMAGE_EXTENSIONS.includes(extension.toLowerCase());
	}

	/**
	 * Check if a file extension is a supported video type
	 */
	isVideoExtension(extension: string): boolean {
		return VIDEO_EXTENSIONS.includes(extension.toLowerCase());
	}

	/**
	 * Check if a file extension is displayable as a thumbnail
	 * (images and videos can be displayed as thumbnails)
	 */
	isThumbnailableExtension(extension: string): boolean {
		const ext = extension.toLowerCase();
		return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
	}

	/**
	 * Update frontmatter with new media array.
	 * Writes media as YAML array format.
	 */
	async updateMediaProperty(file: TFile, mediaRefs: string[]): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			if (mediaRefs.length > 0) {
				fm.media = mediaRefs;
			} else {
				delete fm.media;
			}
		});
	}

	/**
	 * Add a media reference to an entity's media array
	 */
	async addMediaToEntity(file: TFile, mediaRef: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const existing = this.parseMediaProperty(fm);
			if (!existing.includes(mediaRef)) {
				existing.push(mediaRef);
				fm.media = existing;
			}
		});
	}

	/**
	 * Remove a media reference from an entity's media array
	 */
	async removeMediaFromEntity(file: TFile, mediaRef: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const existing = this.parseMediaProperty(fm);
			const filtered = existing.filter(ref => ref !== mediaRef);
			if (filtered.length > 0) {
				fm.media = filtered;
			} else {
				delete fm.media;
			}
		});
	}

	/**
	 * Reorder media array (for thumbnail selection via drag-and-drop)
	 */
	async reorderMedia(file: TFile, newOrder: string[]): Promise<void> {
		await this.updateMediaProperty(file, newOrder);
	}

	/**
	 * Get resource path for a media file (for rendering in HTML)
	 */
	getResourcePath(file: TFile): string {
		return this.app.vault.getResourcePath(file);
	}

	/**
	 * Convert a file path to a wikilink reference
	 */
	pathToWikilink(path: string): string {
		return `[[${path}]]`;
	}

	/**
	 * Extract file path from a wikilink reference
	 */
	wikilinkToPath(wikilink: string): string {
		const match = wikilink.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
		return match ? match[1] : wikilink;
	}
}
