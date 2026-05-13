/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/* eslint-disable obsidianmd/ui/sentence-case -- Rule misfires on quoted button labels, month names, proper-noun section paths, and example strings; per-site audit deferred. */
/**
 * Base Template Methods
 *
 * Extracted from main.ts — creates .base template files for different entity types.
 * Each method follows the same pattern: check availability, resolve path, create file.
 */

import { Notice, TFile, TFolder, Modal } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { getLogger } from '../core/logging';
import { getErrorMessage } from '../core/error-utils';
import { generatePeopleBaseTemplate } from '../constants/base-template';
import { generatePlacesBaseTemplate } from '../constants/places-base-template';
import { ORGANIZATIONS_BASE_TEMPLATE } from '../constants/organizations-base-template';
import { SOURCES_BASE_TEMPLATE } from '../constants/sources-base-template';
import { UNIVERSES_BASE_TEMPLATE } from '../constants/universes-base-template';
import { NOTES_BASE_TEMPLATE } from '../constants/notes-base-template';
import { RESEARCH_BASE_TEMPLATE } from '../constants/research-base-template';
import { generateEventsBaseTemplate } from '../constants/events-base-template';

const logger = getLogger('BaseTemplates');

/**
 * Check if Bases feature is available in Obsidian
 */
function isBasesAvailable(plugin: CanvasRootsPlugin): boolean {
	const baseFiles = plugin.app.vault.getFiles().filter(f => f.extension === 'base');
	// @ts-expect-error - accessing internal plugins
	const basesInternalPlugin = plugin.app.internalPlugins?.plugins?.['bases'];
	return baseFiles.length > 0 || (basesInternalPlugin?.enabled === true);
}

/**
 * Confirm base creation if Bases plugin may not be installed
 */
function confirmBaseCreation(plugin: CanvasRootsPlugin): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Bases plugin not detected');

		modal.contentEl.createEl('p', {
			text: 'The Obsidian Bases plugin does not appear to be installed. The .base file will be created, but you\'ll need to install the Bases plugin to use it.'
		});

		modal.contentEl.createEl('p', {
			text: 'Would you like to create the template anyway?',
			cls: 'cr-confirm-text'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const createBtn = buttonContainer.createEl('button', {
			text: 'Create anyway',
			cls: 'mod-cta'
		});
		createBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		modal.open();
	});
}

/**
 * Helper to resolve the target path for a base template, creating the folder if needed
 */
async function resolveBasePath(
	plugin: CanvasRootsPlugin,
	fileName: string,
	folder?: TFolder
): Promise<{ path: string; existing: TFile | null } | null> {
	// Check availability and confirm if needed
	if (!isBasesAvailable(plugin)) {
		const proceed = await confirmBaseCreation(plugin);
		if (!proceed) return null;
	}

	const targetFolder = plugin.settings.basesFolder || (folder ? folder.path : '');
	const folderPath = targetFolder ? targetFolder + '/' : '';
	const defaultPath = folderPath + fileName;

	// Create the bases folder if it doesn't exist
	if (plugin.settings.basesFolder && !plugin.app.vault.getAbstractFileByPath(plugin.settings.basesFolder)) {
		await plugin.app.vault.createFolder(plugin.settings.basesFolder);
	}

	const existingFile = plugin.app.vault.getAbstractFileByPath(defaultPath);
	if (existingFile instanceof TFile) {
		return { path: defaultPath, existing: existingFile };
	}

	return { path: defaultPath, existing: null };
}

/**
 * Create a base template file, opening it if it already exists
 */
async function createBaseFile(
	plugin: CanvasRootsPlugin,
	fileName: string,
	templateContent: string,
	displayName: string,
	viewCount: string,
	folder?: TFolder
): Promise<void> {
	try {
		const resolved = await resolveBasePath(plugin, fileName, folder);
		if (!resolved) return;

		if (resolved.existing) {
			new Notice(`${displayName} base template already exists at ${resolved.path}`);
			const leaf = plugin.app.workspace.getLeaf(false);
			await leaf.openFile(resolved.existing);
			return;
		}

		const file = await plugin.app.vault.create(resolved.path, templateContent);
		new Notice(`${displayName} base template created with ${viewCount} pre-configured views!`);
		logger.info('base-template', `Created ${displayName.toLowerCase()} base template at ${resolved.path}`);

		const leaf = plugin.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	} catch (error: unknown) {
		const errorMsg = getErrorMessage(error);
		logger.error('base-template', `Failed to create ${displayName.toLowerCase()} base template`, error);

		if (errorMsg.includes('already exists')) {
			new Notice('A file with this name already exists.');
		} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
			new Notice('Permission denied. Check file system permissions.');
		} else if (errorMsg.includes('ENOSPC')) {
			new Notice('Disk full. Free up space and try again.');
		} else {
			new Notice(`Failed to create ${displayName} base template: ${errorMsg}`);
		}
	}
}

export async function createBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	const templateContent = generatePeopleBaseTemplate({
		aliases: plugin.settings.propertyAliases,
		maxLivingAge: plugin.settings.livingPersonAgeThreshold
	});
	await createBaseFile(plugin, 'people.base', templateContent, 'Base', '22', folder);
}

export async function createPlacesBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	const templateContent = generatePlacesBaseTemplate(plugin.settings.propertyAliases);
	await createBaseFile(plugin, 'places.base', templateContent, 'Places', '14', folder);
}

export async function createOrganizationsBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	await createBaseFile(plugin, 'organizations.base', ORGANIZATIONS_BASE_TEMPLATE, 'Organizations', '17', folder);
}

export async function createSourcesBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	await createBaseFile(plugin, 'sources.base', SOURCES_BASE_TEMPLATE, 'Sources', '18', folder);
}

export async function createUniversesBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	await createBaseFile(plugin, 'universes.base', UNIVERSES_BASE_TEMPLATE, 'Universes', '12', folder);
}

export async function createNotesBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	await createBaseFile(plugin, 'notes.base', NOTES_BASE_TEMPLATE, 'Notes', '11', folder);
}

export async function createResearchBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	await createBaseFile(plugin, 'research.base', RESEARCH_BASE_TEMPLATE, 'Research', '12', folder);
}

export async function createEventsBaseTemplate(plugin: CanvasRootsPlugin, folder?: TFolder): Promise<void> {
	const templateContent = generateEventsBaseTemplate(plugin.settings.propertyAliases);
	await createBaseFile(plugin, 'events.base', templateContent, 'Events', '20', folder);
}

/**
 * Create all base templates at once
 * Silently skips bases that already exist
 */
export async function createAllBases(
	plugin: CanvasRootsPlugin,
	options?: { silent?: boolean }
): Promise<{ created: string[]; skipped: string[] }> {
	const created: string[] = [];
	const skipped: string[] = [];
	const silent = options?.silent ?? false;

	// In interactive mode, confirm with user if Bases feature isn't already in use
	if (!silent && !isBasesAvailable(plugin)) {
		const proceed = await confirmBaseCreation(plugin);
		if (!proceed) return { created, skipped };
	}

	// Determine the target folder
	const targetFolder = plugin.settings.basesFolder || '';
	const folderPath = targetFolder ? targetFolder + '/' : '';

	// Create the bases folder if it doesn't exist
	if (plugin.settings.basesFolder && !plugin.app.vault.getAbstractFileByPath(plugin.settings.basesFolder)) {
		await plugin.app.vault.createFolder(plugin.settings.basesFolder);
	}

	// Define all base types with their templates
	const baseTypes = [
		{ name: 'people', file: 'people.base', generator: () => generatePeopleBaseTemplate(plugin.settings.propertyAliases) },
		{ name: 'places', file: 'places.base', generator: () => generatePlacesBaseTemplate(plugin.settings.propertyAliases) },
		{ name: 'events', file: 'events.base', generator: () => generateEventsBaseTemplate(plugin.settings.propertyAliases) },
		{ name: 'organizations', file: 'organizations.base', generator: () => ORGANIZATIONS_BASE_TEMPLATE },
		{ name: 'sources', file: 'sources.base', generator: () => SOURCES_BASE_TEMPLATE },
		{ name: 'research', file: 'research.base', generator: () => RESEARCH_BASE_TEMPLATE },
	];

	for (const baseType of baseTypes) {
		const filePath = folderPath + baseType.file;
		const existingFile = plugin.app.vault.getAbstractFileByPath(filePath);

		if (existingFile) {
			skipped.push(baseType.name);
		} else {
			try {
				const content = baseType.generator();
				await plugin.app.vault.create(filePath, content);
				created.push(baseType.name);
			} catch (error: unknown) {
				logger.error('create-all-bases', `Failed to create ${baseType.name} base`, error);
				skipped.push(baseType.name);
			}
		}
	}

	if (!silent) {
		if (created.length > 0) {
			new Notice(`Created ${created.length} base${created.length > 1 ? 's' : ''}: ${created.join(', ')}`);
		}
		if (skipped.length > 0 && created.length === 0) {
			new Notice('All bases already exist');
		}
	}

	logger.info('create-all-bases', `Created: ${created.join(', ') || 'none'}, Skipped: ${skipped.join(', ') || 'none'}`);
	return { created, skipped };
}