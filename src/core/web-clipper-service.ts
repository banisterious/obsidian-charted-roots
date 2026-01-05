import { App, TFile, EventRef } from 'obsidian';
import type { CanvasRootsSettings } from '../settings';

/**
 * Metadata properties that identify a clipped note.
 * A note is considered "clipped" if it has ANY ONE of these properties.
 */
const CLIPPER_PROPERTIES = ['clip_source_type', 'clipped_from', 'clipped_date'] as const;

/**
 * Service for detecting and tracking Web Clipper integration.
 * Monitors staging folder for clipped notes and provides count tracking.
 */
export class WebClipperService {
	private unreadClipCount = 0;
	private fileCreateRef: EventRef | null = null;

	constructor(
		private app: App,
		private settings: CanvasRootsSettings
	) {}

	/**
	 * Start monitoring the staging folder for new clipped notes
	 */
	startWatching(): void {
		// Only watch if staging is configured
		if (!this.settings.stagingFolder || !this.settings.enableStagingIsolation) {
			return;
		}

		// Register file creation handler
		this.fileCreateRef = this.app.vault.on('create', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.handleFileCreated(file);
			}
		});

		// Initialize count from existing files
		this.initializeCount();
	}

	/**
	 * Stop monitoring for new clipped notes
	 */
	stopWatching(): void {
		if (this.fileCreateRef) {
			this.app.vault.offref(this.fileCreateRef);
			this.fileCreateRef = null;
		}
	}

	/**
	 * Get the current count of unread clipped notes
	 */
	getUnreadClipCount(): number {
		return this.unreadClipCount;
	}

	/**
	 * Reset the unread clip count (called when Staging Manager opens)
	 */
	resetUnreadCount(): void {
		this.unreadClipCount = 0;
	}

	/**
	 * Check if a file is a clipped note (has clipper metadata)
	 */
	isClippedNote(file: TFile): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return false;

		// Check if ANY clipper property exists
		return CLIPPER_PROPERTIES.some(prop =>
			cache.frontmatter?.[prop] !== undefined
		);
	}

	/**
	 * Get all clipped notes in the staging folder
	 */
	getClippedNotes(): TFile[] {
		const stagingPath = this.settings.stagingFolder;
		if (!stagingPath) return [];

		return this.app.vault.getMarkdownFiles()
			.filter(file => this.isInStagingFolder(file.path) && this.isClippedNote(file));
	}

	/**
	 * Initialize unread count from existing files in staging
	 */
	private initializeCount(): void {
		// Start at 0 - only count new clips after plugin load
		this.unreadClipCount = 0;
	}

	/**
	 * Handle new file creation
	 */
	private async handleFileCreated(file: TFile): Promise<void> {
		// Only process files in staging folder
		if (!this.isInStagingFolder(file.path)) {
			return;
		}

		// Wait briefly for metadata cache to update
		await new Promise(resolve => setTimeout(resolve, 100));

		// Check if it's a clipped note
		if (this.isClippedNote(file)) {
			this.unreadClipCount++;
		}
	}

	/**
	 * Check if a file path is within the staging folder
	 */
	private isInStagingFolder(path: string): boolean {
		const stagingPath = this.settings.stagingFolder;
		if (!stagingPath) return false;

		// Normalize paths for comparison
		const normalizedPath = path.replace(/\\/g, '/');
		const normalizedStaging = stagingPath.replace(/\\/g, '/');

		return normalizedPath.startsWith(normalizedStaging + '/') ||
		       normalizedPath === normalizedStaging;
	}
}
