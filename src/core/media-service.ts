/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
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
/** Crop region for an image (#354) */
export interface MediaCrop {
	x: number;
	y: number;
	w: number;
	h: number;
	/** If true, x/y/w/h are percentages (0-100) instead of pixels. Used by Gramps import. */
	percent?: boolean;
}

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
	/** Crop region for this image (#354) */
	crop?: MediaCrop;
	/** Caption for this image (#523) — short label rendered beneath the thumbnail */
	caption?: string;
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
 * Normalize a single media item from frontmatter to a wikilink string.
 * Handles the various formats Obsidian/YAML can produce:
 *   - String: "[[file.jpg]]" → "[[file.jpg]]"
 *   - Link object: { link: "file.jpg" } → "[[file.jpg]]"
 *   - Nested array: [["file.jpg"]] → "[[file.jpg]]" (YAML parses unquoted [[]] as nested array)
 *   - Nested array with commas in filename: [["Name", " File.jpg"]] → "[[Name, File.jpg]]"
 */
export function normalizeMediaRef(item: unknown): string | null {
	if (typeof item === 'string') {
		return item;
	}

	// Obsidian Link object (unquoted wikilinks parsed by metadata cache)
	if (typeof item === 'object' && item !== null && 'link' in item) {
		const link = (item as { link: unknown }).link;
		if (typeof link === 'string') {
			return `[[${link}]]`;
		}
	}

	// Nested array from YAML parsing unquoted [[filename]] as [["filename"]]
	// Commas in filenames cause YAML to split into multiple elements,
	// e.g. [[Name, File.jpg]] → [["Name", " File.jpg"]]
	if (Array.isArray(item)) {
		// Unwrap one level of nesting if the first element is also an array
		const inner = item.length === 1 && Array.isArray(item[0]) ? item[0] as unknown[] : item;

		// If the innermost array has all-string elements, rejoin with comma
		// to reconstruct filenames that YAML split on commas
		if (inner.length > 0 && inner.every((el): el is string => typeof el === 'string')) {
			const joined = inner.map(s => s.trim()).join(', ');
			return joined.startsWith('[[') ? joined : `[[${joined}]]`;
		}
	}

	return null;
}

/**
 * Parse a media property value from frontmatter into an array of wikilink strings.
 * Handles all formats: string arrays, Link objects, nested arrays, and single values.
 */
export function parseMediaRefs(mediaValue: unknown): string[] {
	if (!mediaValue) return [];

	// Single string value
	if (typeof mediaValue === 'string') {
		return [mediaValue];
	}

	// Array of items (most common)
	if (Array.isArray(mediaValue)) {
		const results: string[] = [];
		for (const item of mediaValue) {
			const normalized = normalizeMediaRef(item);
			if (normalized) {
				results.push(normalized);
			}
		}
		return results;
	}

	// Single Link object
	const normalized = normalizeMediaRef(mediaValue);
	if (normalized) {
		return [normalized];
	}

	return [];
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
	 * Handles all YAML/Obsidian formats: string arrays, Link objects,
	 * nested arrays (from unquoted wikilinks), and single values.
	 */
	parseMediaProperty(frontmatter: Record<string, unknown>): string[] {
		return parseMediaRefs(frontmatter.media);
	}

	/**
	 * Resolve a media reference (wikilink or path) to a MediaItem
	 */
	resolveMediaItem(mediaRef: string): MediaItem {
		// Parse wikilink or path
		let linkPath = mediaRef;

		// Handle wikilinks: [[path]] or [[path|alias]]
		const wikilinkMatch = mediaRef.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
		if (wikilinkMatch) {
			linkPath = wikilinkMatch[1];
		}

		// Try to find the file using Obsidian's link resolution
		// This handles relative paths and files without full paths
		let file: TFile | null = null;

		// First try direct path lookup
		const abstractFile = this.app.vault.getAbstractFileByPath(linkPath);
		if (abstractFile instanceof TFile) {
			file = abstractFile;
		} else {
			// Use Obsidian's link resolution (handles partial paths)
			const resolved = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
			if (resolved instanceof TFile) {
				file = resolved;
			}
		}

		// Determine type from extension
		const ext = linkPath.substring(linkPath.lastIndexOf('.')).toLowerCase();
		const type = this.getMediaType(ext);

		// Get display name (filename without path)
		const displayName = linkPath.substring(linkPath.lastIndexOf('/') + 1);

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
	 * Resolve media items with crop data from frontmatter (#354)
	 */
	resolveMediaItemsWithCrops(frontmatter: Record<string, unknown>): MediaItem[] {
		const mediaRefs = this.parseMediaProperty(frontmatter);
		const items = this.resolveMediaItems(mediaRefs);

		// Parse media_crop array if present
		const crops = this.parseMediaCrops(frontmatter);
		if (crops.size > 0) {
			for (const item of items) {
				if (item.file) {
					const crop = crops.get(item.file.name) || crops.get(item.displayName);
					if (crop) {
						item.crop = crop;
					}
				}
			}
		}

		return items;
	}

	/**
	 * Parse media_captions from frontmatter (#523).
	 *
	 * Captions live in a flat parallel string array, index-aligned with
	 * the `media:` array (matching the `<type>_notes` pattern from #530).
	 * Empty / missing slots are returned as empty strings so the caller
	 * can correlate by index.
	 */
	parseMediaCaptions(frontmatter: Record<string, unknown>): string[] {
		const raw = frontmatter.media_captions;
		if (!Array.isArray(raw)) return [];
		return raw.map(v => (typeof v === 'string' ? v : ''));
	}

	/**
	 * Parse media_crop array from frontmatter (#354)
	 * Returns a map of image filename → crop region
	 */
	parseMediaCrops(frontmatter: Record<string, unknown>): Map<string, MediaCrop> {
		const crops = new Map<string, MediaCrop>();
		const rawCrops = frontmatter.media_crop;

		if (!Array.isArray(rawCrops)) return crops;

		for (const entry of rawCrops) {
			if (typeof entry !== 'object' || !entry) continue;
			const obj = entry as Record<string, unknown>;
			const image = obj.image as string;
			const x = typeof obj.x === 'number' ? obj.x : undefined;
			const y = typeof obj.y === 'number' ? obj.y : undefined;
			const w = typeof obj.w === 'number' ? obj.w : undefined;
			const h = typeof obj.h === 'number' ? obj.h : undefined;

			if (image && x !== undefined && y !== undefined && w !== undefined && h !== undefined) {
				const percent = obj.percent === true;
				crops.set(image, { x, y, w, h, percent });
			}
		}

		return crops;
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

	/**
	 * Check if a file path is within the configured media folders.
	 * Returns true if filter is disabled, folders are empty, or file is in a media folder.
	 */
	isInMediaFolders(filePath: string): boolean {
		const { enableMediaFolderFilter, mediaFolders } = this.settings;

		// If filter is disabled or no folders configured, accept all files
		if (!enableMediaFolderFilter || mediaFolders.length === 0) {
			return true;
		}

		// Check if file is in any of the configured folders
		return mediaFolders.some(folder => {
			const normalizedFolder = folder.endsWith('/') ? folder : `${folder}/`;
			return filePath.startsWith(normalizedFolder) || filePath.startsWith(folder + '/');
		});
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
