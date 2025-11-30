import { TFile } from 'obsidian';
import type { CanvasRootsSettings, FolderFilterMode } from '../settings';

/**
 * Service for filtering files based on folder inclusion/exclusion rules.
 * Used to control which folders are scanned for person notes.
 */
export class FolderFilterService {
	constructor(private settings: CanvasRootsSettings) {}

	/**
	 * Check if a file should be included in person note discovery
	 * based on the current folder filtering settings.
	 */
	shouldIncludeFile(file: TFile): boolean {
		return this.shouldIncludePath(file.path);
	}

	/**
	 * Check if a file path should be included in person note discovery.
	 * Useful when you have a path string but not a TFile object.
	 */
	shouldIncludePath(filePath: string): boolean {
		// First check staging folder exclusion (takes precedence)
		if (this.shouldExcludeAsStaging(filePath)) {
			return false;
		}

		if (this.settings.folderFilterMode === 'disabled') {
			return true;
		}

		if (this.settings.folderFilterMode === 'exclude') {
			// Exclude mode: include unless in excluded folder
			for (const folder of this.settings.excludedFolders) {
				if (this.isInFolder(filePath, folder)) {
					return false;
				}
			}
			return true;
		}

		if (this.settings.folderFilterMode === 'include') {
			// Include mode: exclude unless in included folder
			for (const folder of this.settings.includedFolders) {
				if (this.isInFolder(filePath, folder)) {
					return true;
				}
			}
			return false;
		}

		return true;
	}

	/**
	 * Check if a file should be excluded because it's in the staging folder
	 */
	private shouldExcludeAsStaging(filePath: string): boolean {
		// Skip if staging isolation is disabled
		if (!this.settings.enableStagingIsolation) {
			return false;
		}

		// Skip if no staging folder is configured
		const stagingFolder = this.settings.stagingFolder;
		if (!stagingFolder) {
			return false;
		}

		// Check if file is in staging folder
		return this.isInFolder(filePath, stagingFolder);
	}

	/**
	 * Check if a file is in the staging folder
	 */
	isInStagingFolder(filePath: string): boolean {
		const stagingFolder = this.settings.stagingFolder;
		if (!stagingFolder) {
			return false;
		}
		return this.isInFolder(filePath, stagingFolder);
	}

	/**
	 * Check if file path is within a folder (including subfolders).
	 * Case-insensitive for cross-platform compatibility.
	 */
	private isInFolder(filePath: string, folderPath: string): boolean {
		// Normalize paths: lowercase, remove leading/trailing slashes
		const normalizedFile = filePath.toLowerCase();
		const normalizedFolder = folderPath.toLowerCase().replace(/^\/|\/$/g, '');

		if (!normalizedFolder) {
			// Empty folder path matches nothing
			return false;
		}

		// File is in folder if path starts with folder + /
		// or if the file is directly in that folder
		return normalizedFile.startsWith(normalizedFolder + '/');
	}

	/**
	 * Get the current filter mode
	 */
	getMode(): FolderFilterMode {
		return this.settings.folderFilterMode;
	}

	/**
	 * Get list of active filters for UI display or debugging
	 */
	getActiveFilters(): { mode: FolderFilterMode; folders: string[]; stagingFolder: string | null } {
		return {
			mode: this.settings.folderFilterMode,
			folders: this.settings.folderFilterMode === 'exclude'
				? this.settings.excludedFolders
				: this.settings.folderFilterMode === 'include'
					? this.settings.includedFolders
					: [],
			stagingFolder: this.settings.enableStagingIsolation && this.settings.stagingFolder
				? this.settings.stagingFolder
				: null
		};
	}

	/**
	 * Check if filtering is currently enabled (either folder filter or staging isolation)
	 */
	isEnabled(): boolean {
		return this.settings.folderFilterMode !== 'disabled' ||
			(this.settings.enableStagingIsolation && !!this.settings.stagingFolder);
	}

	/**
	 * Check if staging isolation is active
	 */
	isStagingIsolationActive(): boolean {
		return this.settings.enableStagingIsolation && !!this.settings.stagingFolder;
	}

	/**
	 * Get the configured staging folder path
	 */
	getStagingFolder(): string {
		return this.settings.stagingFolder;
	}
}
