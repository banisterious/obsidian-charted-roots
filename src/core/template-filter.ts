import type { App } from 'obsidian';
import type { CanvasRootsSettings } from '../settings';
import { getLogger } from './logging';

const logger = getLogger('TemplateFilter');

/**
 * Service for detecting and filtering template folders.
 * Auto-detects template folders from core Templates, Templater, and QuickAdd plugins.
 * Used to exclude template files from note discovery.
 */
export class TemplateFilterService {
	private app: App;
	private settings: CanvasRootsSettings;
	private detectedFolders: string[] = [];
	private initialized = false;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Initialize template folder detection.
	 * Should be called after layout is ready to ensure plugins are loaded.
	 */
	initialize(): void {
		if (this.initialized) {
			return;
		}

		this.detectTemplateFolders();
		this.initialized = true;
	}

	/**
	 * Detect template folders from installed plugins.
	 * Updates the internal list of detected folders.
	 */
	detectTemplateFolders(): void {
		if (!this.settings.autoDetectTemplateFolders) {
			this.detectedFolders = [];
			logger.debug('detectTemplateFolders', 'Auto-detection disabled');
			return;
		}

		const folders: string[] = [];

		// 1. Core Templates plugin
		const coreTemplatesFolder = this.getCoreTemplatesFolder();
		if (coreTemplatesFolder) {
			folders.push(coreTemplatesFolder);
			logger.debug('detectTemplateFolders', `Found core Templates folder: ${coreTemplatesFolder}`);
		}

		// 2. Templater plugin
		const templaterFolder = this.getTemplaterFolder();
		if (templaterFolder) {
			folders.push(templaterFolder);
			logger.debug('detectTemplateFolders', `Found Templater folder: ${templaterFolder}`);
		}

		// 3. QuickAdd plugin
		const quickAddFolder = this.getQuickAddFolder();
		if (quickAddFolder) {
			folders.push(quickAddFolder);
			logger.debug('detectTemplateFolders', `Found QuickAdd folder: ${quickAddFolder}`);
		}

		// Remove duplicates (in case plugins share the same folder)
		this.detectedFolders = [...new Set(folders)];

		if (this.detectedFolders.length > 0) {
			logger.info('detectTemplateFolders', `Template folder detection: found ${this.detectedFolders.length} folder(s)`, {
				folders: this.detectedFolders
			});
		} else {
			logger.debug('detectTemplateFolders', 'No template folders detected');
		}
	}

	/**
	 * Get template folder from core Templates plugin.
	 */
	private getCoreTemplatesFolder(): string | null {
		try {
			// Access internal plugins API (not in public types)
			const internalPlugins = (this.app as AppWithInternalPlugins).internalPlugins;
			const templatesPlugin = internalPlugins?.plugins?.['templates'];

			if (templatesPlugin?.enabled && templatesPlugin?.instance?.options?.folder) {
				return templatesPlugin.instance.options.folder;
			}
		} catch (e) {
			logger.debug('getCoreTemplatesFolder', 'Could not access core Templates plugin settings');
		}
		return null;
	}

	/**
	 * Get template folder from Templater plugin.
	 */
	private getTemplaterFolder(): string | null {
		try {
			// Access community plugins API
			const plugins = (this.app as AppWithPlugins).plugins;
			const templater = plugins?.plugins?.['templater-obsidian'];

			if (templater?.settings?.templates_folder) {
				return templater.settings.templates_folder;
			}
		} catch (e) {
			logger.debug('getTemplaterFolder', 'Could not access Templater plugin settings');
		}
		return null;
	}

	/**
	 * Get template folder from QuickAdd plugin.
	 */
	private getQuickAddFolder(): string | null {
		try {
			// Access community plugins API
			const plugins = (this.app as AppWithPlugins).plugins;
			const quickAdd = plugins?.plugins?.['quickadd'];

			if (quickAdd?.settings?.templateFolderPath) {
				return quickAdd.settings.templateFolderPath;
			}
		} catch (e) {
			logger.debug('getQuickAddFolder', 'Could not access QuickAdd plugin settings');
		}
		return null;
	}

	/**
	 * Get all template folders (auto-detected + user-specified).
	 */
	getAllTemplateFolders(): string[] {
		const userFolders = this.settings.templateFolders || [];
		const allFolders = [...this.detectedFolders, ...userFolders];
		// Remove duplicates and empty strings
		return [...new Set(allFolders)].filter(f => f.length > 0);
	}

	/**
	 * Get only auto-detected template folders.
	 */
	getDetectedFolders(): string[] {
		return [...this.detectedFolders];
	}

	/**
	 * Check if a file path is in a template folder.
	 * @param filePath The file path to check
	 * @returns true if the file is in a template folder
	 */
	isInTemplateFolder(filePath: string): boolean {
		const templateFolders = this.getAllTemplateFolders();
		if (templateFolders.length === 0) {
			return false;
		}

		const normalizedPath = filePath.toLowerCase();

		for (const folder of templateFolders) {
			const normalizedFolder = folder.toLowerCase().replace(/^\/|\/$/g, '');
			if (!normalizedFolder) continue;

			// Check if file path starts with folder path
			if (normalizedPath.startsWith(normalizedFolder + '/')) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Re-detect template folders.
	 * Call this if plugin settings may have changed.
	 */
	refresh(): void {
		this.detectTemplateFolders();
	}
}

/**
 * Type augmentation for accessing internal plugins
 */
interface AppWithInternalPlugins {
	internalPlugins?: {
		plugins?: {
			templates?: {
				enabled: boolean;
				instance?: {
					options?: {
						folder?: string;
					};
				};
			};
		};
	};
}

/**
 * Type augmentation for accessing community plugins
 */
interface AppWithPlugins {
	plugins?: {
		plugins?: {
			'templater-obsidian'?: {
				settings?: {
					templates_folder?: string;
				};
			};
			'quickadd'?: {
				settings?: {
					templateFolderPath?: string;
				};
			};
		};
	};
}
