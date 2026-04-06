import { Notice, TFile, TFolder, Modal } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { FolderStatisticsModal } from '../ui/folder-statistics-modal';
import { getErrorMessage } from '../core/error-utils';
import { ExcalidrawExporter } from '../excalidraw/excalidraw-exporter';
import { generateCrId } from '../core/uuid';
import { ReferenceNumberingService } from '../core/reference-numbering';
import type { NumberingSystem } from '../core/reference-numbering';
import { LineageTrackingService } from '../core/lineage-tracking';
import type { LineageType } from '../core/lineage-tracking';
import { TreePreviewRenderer } from '../ui/tree-preview';
import { extractWikilinkPath } from '../utils/wikilink-resolver';
import { GeocodingService } from '../maps/services/geocoding-service';
import { SourcePickerModal, CreateSourceModal, CitationGeneratorModal } from '../sources';
import { UniverseService, EditUniverseModal } from '../universes';
import { MediaManageModal } from '../core/ui/media-manage-modal';
import { getLogger } from '../core/logging';

const logger = getLogger('context-menu-helpers');

export async function confirmDeleteEvent(plugin: CanvasRootsPlugin, eventTitle: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Delete event');
		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		const deleteBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

export async function confirmDeleteUniverse(plugin: CanvasRootsPlugin, universeName: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Delete universe');
		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete "${universeName}"? This action cannot be undone.`
		});
		modal.contentEl.createEl('p', {
			text: 'Note: This will not delete entities associated with this universe.',
			cls: 'mod-warning'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		const deleteBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

export async function promptParentType(plugin: CanvasRootsPlugin): Promise<'father' | 'mother' | null> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Select parent type');

		modal.contentEl.createEl('p', {
			text: 'Is this person the father or mother?'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const fatherBtn = buttonContainer.createEl('button', {
			text: 'Father',
			cls: 'mod-cta'
		});
		fatherBtn.addEventListener('click', () => {
			modal.close();
			resolve('father');
		});

		const motherBtn = buttonContainer.createEl('button', {
			text: 'Mother',
			cls: 'mod-cta'
		});
		motherBtn.addEventListener('click', () => {
			modal.close();
			resolve('mother');
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(null);
		});

		modal.open();
	});
}

export async function promptSetCollectionName(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	// Get current group_name if it exists
	const cache = plugin.app.metadataCache.getFileCache(file);
	const currentCollectionName = cache?.frontmatter?.group_name || '';

	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Set group name');

		modal.contentEl.createEl('p', {
			text: 'Enter a name for this connected group (family, faction, organization, etc.):'
		});

		const inputContainer = modal.contentEl.createDiv({ cls: 'setting-item-control' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "Smith Family", "House Stark", "The Council"',
			value: currentCollectionName,
			cls: 'cr-prompt-input'
		});

		modal.contentEl.createEl('p', {
			text: 'Leave empty to remove the group name.',
			cls: 'cr-help-text'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => {
			void (async () => {
				const collectionName = input.value.trim();

				// Update or remove group_name in frontmatter
				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					if (collectionName) {
						frontmatter.group_name = collectionName;
					} else {
						delete frontmatter.group_name;
					}
				});

				new Notice(collectionName
					? `Group name set to "${collectionName}"`
					: 'Group name removed'
				);

				modal.close();
				resolve();
			})();
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve();
		});

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});

		modal.open();

		// Focus the input
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);
	});
}

export async function promptSetCollection(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	// Get current collection if it exists
	const cache = plugin.app.metadataCache.getFileCache(file);
	const currentCollection = cache?.frontmatter?.collection || '';

	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Set collection');

		modal.contentEl.createEl('p', {
			text: 'Enter a collection to organize this person (e.g., "Paternal Line", "House Stark", "1800s Branch"):'
		});

		const inputContainer = modal.contentEl.createDiv({ cls: 'setting-item-control' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "Paternal Line", "Maternal Branch"',
			value: currentCollection,
			cls: 'cr-prompt-input'
		});

		modal.contentEl.createEl('p', {
			text: 'Collections let you organize people across family groups. Leave empty to remove.',
			cls: 'cr-help-text'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => {
			void (async () => {
				const collection = input.value.trim();

				// Update or remove collection in frontmatter
				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					if (collection) {
						frontmatter.collection = collection;
					} else {
						delete frontmatter.collection;
					}
				});

				new Notice(collection
					? `Collection set to "${collection}"`
					: 'Collection removed'
				);

				modal.close();
				resolve();
			})();
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve();
		});

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});

		modal.open();

		// Focus the input
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);
	});
}

export async function linkEntityToEvent(plugin: CanvasRootsPlugin, entityName: string,
	event: import('../events/types/event-types').EventNote,
	fieldName: 'persons' | 'sources'): Promise<void> {
	const wikilink = `[[${entityName}]]`;

	try {
		await plugin.app.fileManager.processFrontMatter(event.file, (frontmatter) => {
			if (!frontmatter[fieldName]) {
				frontmatter[fieldName] = [];
			}
			if (!Array.isArray(frontmatter[fieldName])) {
				frontmatter[fieldName] = [frontmatter[fieldName]];
			}

			const alreadyLinked = frontmatter[fieldName].some((entry: string) => {
				const refName = extractWikilinkPath(entry);
				return refName.toLowerCase() === entityName.toLowerCase();
			});

			if (!alreadyLinked) {
				frontmatter[fieldName].push(wikilink);
				new Notice(`Linked ${entityName} to ${event.title || event.file.basename}`);
			} else {
				new Notice(`${entityName} is already linked to this event`);
			}
		});
	} catch (err) {
		new Notice(`Failed to link ${entityName} to event`);
		console.error('linkEntityToEvent error:', err);
	}
}

export async function linkPersonToEvent(plugin: CanvasRootsPlugin, personFile: TFile, personName: string, event: import('../events/types/event-types').EventNote): Promise<void> {
	await linkEntityToEvent(plugin, personName, event, 'persons');
}

export async function linkSourceToEvent(plugin: CanvasRootsPlugin, sourceFile: TFile, event: import('../events/types/event-types').EventNote): Promise<void> {
	await linkEntityToEvent(plugin, sourceFile.basename, event, 'sources');
}

export function addSourceToPersonNote(plugin: CanvasRootsPlugin, file: TFile): void {
	new SourcePickerModal(plugin.app, plugin, {
		onSelect: async (source) => {
			// Get current sources from frontmatter
			const cache = plugin.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter || {};

			// Find the next available source slot
			let nextSlot = 1;
			if (frontmatter.source) {
				nextSlot = 2;
				while (frontmatter[`source_${nextSlot}`]) {
					nextSlot++;
				}
			}

			// Create the wikilink
			const sourceLink = `[[${source.filePath.replace(/\.md$/, '')}]]`;

			// Check if this source is already linked
			const existingSources: string[] = [];
			if (frontmatter.source) existingSources.push(String(frontmatter.source));
			for (let i = 2; i <= 50; i++) {
				const key = `source_${i}`;
				if (frontmatter[key]) {
					existingSources.push(String(frontmatter[key]));
				} else {
					break;
				}
			}

			if (existingSources.some(s => s.includes(source.filePath.replace(/\.md$/, '')))) {
				new Notice(`Source "${source.title}" is already linked to this person`);
				return;
			}

			// Add the source to frontmatter
			await plugin.app.fileManager.processFrontMatter(file, (fm) => {
				if (nextSlot === 1) {
					fm.source = sourceLink;
				} else {
					fm[`source_${nextSlot}`] = sourceLink;
				}
			});

			new Notice(`Linked source: ${source.title}`);
		}
	}).open();
}

export function openManageMediaModal(plugin: CanvasRootsPlugin, file: TFile, entityType: string, entityName: string): void {
	if (!plugin.mediaService) {
		new Notice('Media service not available');
		return;
	}

	// Get existing media from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingMedia = plugin.mediaService.parseMediaProperty(cache?.frontmatter || {});

	new MediaManageModal(
		plugin.app,
		plugin.mediaService,
		file,
		existingMedia,
		async (updatedMediaRefs) => {
			if (!plugin.mediaService) return;
			await plugin.mediaService.updateMediaProperty(file, updatedMediaRefs);
		},
		() => {
			// Re-open the link media modal when "Add media" is clicked
			plugin.openLinkMediaModal(file, entityType, entityName);
		},
		{
			entityName,
			entityType
		}
	).open();
}

export async function geocodeSinglePlace(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm) {
		new Notice('Could not read place frontmatter');
		return;
	}

	// Check if already has coordinates
	if (fm.latitude && fm.longitude) {
		new Notice('Place already has coordinates');
		return;
	}

	// Get the place name - prefer full_name, fall back to title or name
	const placeName = fm.full_name || fm.title || fm.name || file.basename;

	if (!placeName) {
		new Notice('Could not determine place name for geocoding');
		return;
	}

	// Get parent place name if available
	let parentName: string | undefined;
	if (fm.parent) {
		const placeGraph = plugin.createPlaceGraphService();
		placeGraph.reloadCache();
		const parentPlace = placeGraph.getPlaceByCrId(fm.parent);
		parentName = parentPlace?.name;
	}

	new Notice(`Geocoding "${placeName}"...`);

	const geocodingService = new GeocodingService(plugin.app);
	const result = await geocodingService.geocodeSingle(placeName, parentName);

	if (result.success && result.coordinates) {
		// Update the file with coordinates
		await geocodingService.updatePlaceCoordinates(file, result.coordinates);
		new Notice(`Found coordinates: ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.long.toFixed(4)}`);
	} else {
		new Notice(result.error || 'Could not find coordinates for this place');
	}
}

export function openEditSourceModal(plugin: CanvasRootsPlugin, file: TFile): void {
	// Get source data from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Source note does not have a cr_id');
		return;
	}

	// Get source from service
	const sourceService = plugin.getSourceService();
	const source = sourceService.getSourceByPath(file.path);

	if (!source) {
		new Notice('Could not find source data');
		return;
	}

	// Open the modal in edit mode
	new CreateSourceModal(plugin.app, plugin, {
		editFile: file,
		editSource: source,
		onSuccess: () => {
			new Notice('Source updated');
		}
	}).open();
}

export function openCitationGenerator(plugin: CanvasRootsPlugin, file: TFile): void {
	// Get source data from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Source note does not have a cr_id');
		return;
	}

	// Get source from service
	const sourceService = plugin.getSourceService();
	const source = sourceService.getSourceByPath(file.path);

	if (!source) {
		new Notice('Could not find source data');
		return;
	}

	// Open the citation generator modal
	new CitationGeneratorModal(plugin.app, plugin, source).open();
}

export function openEditUniverseModal(plugin: CanvasRootsPlugin, file: TFile): void {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Universe note does not have a cr_id');
		return;
	}

	// Get universe from service
	const universeService = new UniverseService(plugin);
	const universe = universeService.getUniverseByFile(file);

	if (!universe) {
		new Notice('Could not find universe data');
		return;
	}

	// Open the edit modal
	new EditUniverseModal(plugin.app, plugin, {
		universe,
		file,
		onUpdated: () => {
			new Notice('Universe updated');
		}
	}).open();
}

export async function toggleRootPerson(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	// Get current root_person status
	const cache = plugin.app.metadataCache.getFileCache(file);
	const isRootPerson = cache?.frontmatter?.root_person === true;

	if (isRootPerson) {
		// Unmarking this person
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			delete frontmatter.root_person;
		});
		new Notice('Unmarked as root person');
	} else {
		// Marking this person - first unmark any existing root person
		const familyGraph = plugin.createFamilyGraphService();
		const { allMarked } = familyGraph.getMarkedRootPerson();

		for (const existingRoot of allMarked) {
			if (existingRoot.file.path !== file.path) {
				await plugin.app.fileManager.processFrontMatter(existingRoot.file, (frontmatter) => {
					delete frontmatter.root_person;
				});
			}
		}

		// Now mark the new root person
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.root_person = true;
		});

		if (allMarked.length > 0 && allMarked.some(p => p.file.path !== file.path)) {
			new Notice('Marked as root person (previous root unmarked)');
		} else {
			new Notice('Marked as root person');
		}
	}
}

export async function assignReferenceNumbersFromPerson(plugin: CanvasRootsPlugin, file: TFile, system: NumberingSystem): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const crId = cache?.frontmatter?.cr_id;
	const personName = cache?.frontmatter?.name || file.basename;

	if (!crId) {
		new Notice('Invalid person note: missing cr_id');
		return;
	}

	try {
		const service = new ReferenceNumberingService(plugin.app);
		let stats;

		new Notice(`Assigning ${system} numbers from ${personName}...`);

		switch (system) {
			case 'ahnentafel':
				stats = await service.assignAhnentafel(crId);
				break;
			case 'daboville':
				stats = await service.assignDAboville(crId);
				break;
			case 'henry':
				stats = await service.assignHenry(crId);
				break;
			case 'generation':
				stats = await service.assignGeneration(crId);
				break;
		}

		new Notice(`Assigned ${stats.totalAssigned} ${system} numbers from ${stats.rootPerson}`);
	} catch (error) {
		logger.error('reference-numbering', `Failed to assign ${system} numbers`, error);
		new Notice(`Failed to assign numbers: ${getErrorMessage(error)}`);
	}
}

export async function assignLineageFromPerson(plugin: CanvasRootsPlugin, file: TFile, type: LineageType): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const crId = cache?.frontmatter?.cr_id;
	const personName = cache?.frontmatter?.name || file.basename;

	if (!crId) {
		new Notice('Invalid person note: missing cr_id');
		return;
	}

	// Prompt for lineage name
	const lineageName = await promptLineageName(plugin, personName);
	if (!lineageName) return;

	try {
		const service = new LineageTrackingService(plugin.app);
		new Notice(`Assigning "${lineageName}" lineage from ${personName}...`);

		const stats = await service.assignLineage({
			name: lineageName,
			rootCrId: crId,
			type: type
		});

		new Notice(`Assigned "${lineageName}" to ${stats.totalMembers} descendants (${stats.maxGeneration} generations)`);
	} catch (error) {
		logger.error('lineage-tracking', 'Failed to assign lineage', error);
		new Notice(`Failed to assign lineage: ${getErrorMessage(error)}`);
	}
}

export async function showCreatePlaceNotesForPerson(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm) {
		new Notice('No frontmatter found in this note');
		return;
	}

	// Collect all place references from this person
	const placeFields: string[] = [];

	// Birth/death/burial places
	if (fm.birth_place && typeof fm.birth_place === 'string') {
		placeFields.push(fm.birth_place);
	}
	if (fm.death_place && typeof fm.death_place === 'string') {
		placeFields.push(fm.death_place);
	}
	if (fm.burial_place && typeof fm.burial_place === 'string') {
		placeFields.push(fm.burial_place);
	}

	// Spouse marriage locations
	let spouseIndex = 1;
	while (fm[`spouse${spouseIndex}`] || fm[`spouse${spouseIndex}_id`]) {
		const marriageLocation = fm[`spouse${spouseIndex}_marriage_location`];
		if (marriageLocation && typeof marriageLocation === 'string') {
			placeFields.push(marriageLocation);
		}
		spouseIndex++;
	}

	// Deduplicate and filter out wikilinks (already linked to place notes)
	const uniquePlaces = [...new Set(placeFields)]
		.map(p => p.trim())
		.filter(p => p && !p.startsWith('[['));

	if (uniquePlaces.length === 0) {
		new Notice('No unlinked place references found in this person note');
		return;
	}

	// Check which places already have notes
	const placeGraph = plugin.createPlaceGraphService();
	placeGraph.reloadCache();

	const missingPlaces: string[] = [];
	for (const placeName of uniquePlaces) {
		const existingPlace = placeGraph.getPlaceByName(placeName);
		if (!existingPlace) {
			missingPlaces.push(placeName);
		}
	}

	if (missingPlaces.length === 0) {
		new Notice('All place references already have corresponding place notes');
		return;
	}

	// Show modal to select which places to create
	const { CreateMissingPlacesModal } = await import('../ui/create-missing-places-modal');

	const modal = new CreateMissingPlacesModal(
		plugin.app,
		missingPlaces.map(name => ({ name, count: 1 })),
		{
			directory: plugin.settings.peopleFolder || '',
			placeGraph, // Reuse the placeGraph from earlier in plugin function
			onComplete: (created: number) => {
				if (created > 0) {
					new Notice(`Created ${created} place note${created !== 1 ? 's' : ''}`);
				}
			}
		}
	);
	modal.open();
}

export async function promptLineageName(plugin: CanvasRootsPlugin, suggestedName: string): Promise<string | null> {
	// Extract surname for suggestion
	const nameParts = suggestedName.trim().split(/\s+/);
	const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : suggestedName;
	const suggestion = `${surname} Line`;

	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Enter lineage name');

		modal.contentEl.createEl('p', {
			text: 'Enter a name for this lineage (e.g., "Smith Line", "Tudor Dynasty"):'
		});

		const inputContainer = modal.contentEl.createDiv({ cls: 'setting-item-control' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "Smith Line", "Tudor Dynasty"',
			value: suggestion,
			cls: 'cr-prompt-input'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Assign',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => {
			const lineageName = input.value.trim();
			if (lineageName) {
				modal.close();
				resolve(lineageName);
			} else {
				new Notice('Please enter a lineage name');
			}
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(null);
		});

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});

		modal.open();

		// Focus the input
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);
	});
}

export async function regenerateTimelineCanvas(plugin: CanvasRootsPlugin, canvasFile: TFile): Promise<void> {
	try {
		new Notice('Regenerating timeline...');

		// Get event service
		const eventService = plugin.getEventService();
		if (!eventService) {
			new Notice('Event service not available');
			return;
		}

		// Get all events
		const events = eventService.getAllEvents();
		if (events.length === 0) {
			new Notice('No events found');
			return;
		}

		// Import and use TimelineCanvasExporter
		const { TimelineCanvasExporter } = await import('../events/services/timeline-canvas-exporter');
		const exporter = new TimelineCanvasExporter(plugin.app, plugin.settings);

		const result = await exporter.regenerateCanvas(canvasFile, events);

		if (result.success) {
			new Notice(`Timeline regenerated successfully! (${events.length} events)`);
		} else {
			new Notice(`Failed to regenerate timeline: ${result.error}`);
		}
	} catch (error: unknown) {
		console.error('Error regenerating timeline canvas:', error);
		new Notice('Failed to regenerate timeline. Check console for details.');
	}
}

export async function exportCanvasToExcalidraw(plugin: CanvasRootsPlugin, canvasFile: TFile) {
	try {
		new Notice('Exporting to Excalidraw...');

		// Initialize exporter
		const exporter = new ExcalidrawExporter(plugin.app);

		// Export canvas
		const result = await exporter.exportToExcalidraw({
			canvasFile,
			preserveColors: true,
			fontSize: 16,
			strokeWidth: 2
		});

		if (!result.success) {
			new Notice(`Export failed: ${result.errors.join(', ')}`);
			return;
		}

		// Save Excalidraw file to vault root
		const outputPath = `${result.fileName}.excalidraw.md`;
		await plugin.app.vault.create(outputPath, result.excalidrawContent!);

		new Notice(`Exported ${result.elementsExported} elements to ${result.fileName}.excalidraw.md`);

		// Open the newly created file
		const excalidrawFile = plugin.app.vault.getAbstractFileByPath(outputPath);
		if (excalidrawFile instanceof TFile) {
			const leaf = plugin.app.workspace.getLeaf(false);
			await leaf.openFile(excalidrawFile);
		}
	} catch (error: unknown) {
		console.error('Error exporting to Excalidraw:', error);
		new Notice(`Failed to export to Excalidraw: ${getErrorMessage(error)}`);
	}
}

export async function exportCanvasAsImage(plugin: CanvasRootsPlugin, canvasFile: TFile, format: 'png' | 'svg' | 'pdf') {
	try {
		new Notice(`Exporting as ${format.toUpperCase()}...`);

		// Read canvas to get root person
		const canvasContent = await plugin.app.vault.read(canvasFile);
		const canvasData = JSON.parse(canvasContent);
		const metadata = canvasData.metadata?.frontmatter;

		if ((metadata?.plugin !== 'charted-roots' && metadata?.plugin !== 'canvas-roots') || !metadata.generation?.rootCrId) {
			new Notice('This canvas does not contain Charted Roots tree data');
			return;
		}

		const rootCrId = metadata.generation.rootCrId;
		const treeType = metadata.generation.treeType || 'full';
		const maxGenerations = metadata.generation.maxGenerations || 0;
		const includeSpouses = metadata.generation.includeSpouses ?? true;

		// Build family tree
		const graphService = plugin.createFamilyGraphService();

		const familyTree = graphService.generateTree({
			rootCrId,
			treeType,
			maxGenerations,
			includeSpouses
		});

		if (!familyTree) {
			new Notice('Failed to build family tree from canvas data');
			return;
		}

		// Create a temporary container for the preview renderer
		const tempContainer = document.createElement('div');
		tempContainer.addClass('cr-offscreen-render');
		document.body.appendChild(tempContainer);

		try {
			// Render tree
			const renderer = new TreePreviewRenderer(tempContainer);
			renderer.setColorScheme(plugin.settings.nodeColorScheme);
			renderer.renderPreview(familyTree, {
				layoutType: metadata.generation.layoutType || plugin.settings.defaultLayoutType,
				treeType: treeType === 'ancestors' ? 'ancestor' : treeType === 'descendants' ? 'descendant' : 'full',
				direction: 'vertical',
				nodeWidth: plugin.settings.defaultNodeWidth,
				nodeHeight: plugin.settings.defaultNodeHeight,
				nodeSpacingX: plugin.settings.horizontalSpacing,
				nodeSpacingY: plugin.settings.verticalSpacing
			});

			// Export based on format
			if (format === 'png') {
				await renderer.exportAsPNG();
			} else if (format === 'svg') {
				renderer.exportAsSVG();
			} else if (format === 'pdf') {
				await renderer.exportAsPDF();
			}

			new Notice(`${format.toUpperCase()} exported successfully`);
		} finally {
			// Clean up temporary container
			document.body.removeChild(tempContainer);
		}
	} catch (error: unknown) {
		console.error(`Error exporting canvas as ${format}:`, error);
		new Notice(`Failed to export as ${format.toUpperCase()}: ${getErrorMessage(error)}`);
	}
}

export async function exportPersonTimelineFromFile(plugin: CanvasRootsPlugin, personFile: TFile,
	format: 'canvas' | 'excalidraw' = 'canvas'): Promise<void> {
	const eventService = plugin.getEventService();
	if (!eventService) {
		new Notice('Event service not available');
		return;
	}

	const cache = plugin.app.metadataCache.getFileCache(personFile);
	const personName = cache?.frontmatter?.name || personFile.basename;
	const allEvents = eventService.getAllEvents();
	const personLink = `[[${personName}]]`;

	// Filter events for this person
	const personEvents = allEvents.filter(e => {
		if (e.person) {
			const normalizedPerson = e.person.replace(/^\[\[/, '').replace(/\]\]$/, '').toLowerCase();
			return normalizedPerson === personName.toLowerCase();
		}
		return false;
	});

	if (personEvents.length === 0) {
		new Notice(`No events found for ${personName}`);
		return;
	}

	try {
		const { TimelineCanvasExporter } = await import('../events/services/timeline-canvas-exporter');
		const exporter = new TimelineCanvasExporter(plugin.app, plugin.settings);

		const result = await exporter.exportToCanvas(allEvents, {
			title: `${personName} Timeline`,
			filterPerson: personLink,
			layoutStyle: 'horizontal',
			colorScheme: 'event_type',
			includeOrderingEdges: true
		});

		if (result.success && result.path) {
			if (format === 'excalidraw') {
				// Convert to Excalidraw
				const { ExcalidrawExporter } = await import('../excalidraw/excalidraw-exporter');
				const excalidrawExporter = new ExcalidrawExporter(plugin.app);

				const canvasFile = plugin.app.vault.getAbstractFileByPath(result.path);
				if (!(canvasFile instanceof TFile)) {
					throw new Error('Canvas file not found after export');
				}

				const excalidrawResult = await excalidrawExporter.exportToExcalidraw({
					canvasFile,
					fileName: result.path.replace('.canvas', '').split('/').pop(),
					preserveColors: true
				});

				if (excalidrawResult.success && excalidrawResult.excalidrawContent) {
					// Save to vault root
					const excalidrawFileName = result.path.replace('.canvas', '.excalidraw.md').split('/').pop();
					const excalidrawPath = excalidrawFileName || result.path.replace('.canvas', '.excalidraw.md');
					await plugin.app.vault.create(excalidrawPath, excalidrawResult.excalidrawContent);
					new Notice(`Timeline exported to ${excalidrawPath}`);
					const file = plugin.app.vault.getAbstractFileByPath(excalidrawPath);
					if (file instanceof TFile) {
						void plugin.app.workspace.getLeaf(false).openFile(file);
					}
				} else {
					new Notice(`Excalidraw export failed: ${excalidrawResult.errors?.join(', ') || 'Unknown error'}`);
				}
			} else {
				new Notice(`Timeline exported to ${result.path}`);
				const file = plugin.app.vault.getAbstractFileByPath(result.path);
				if (file instanceof TFile) {
					void plugin.app.workspace.getLeaf(false).openFile(file);
				}
			}
		} else {
			new Notice(`Export failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Export failed: ${message}`);
	}
}

export async function addEssentialPersonProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// cr_type: Set to 'person' if missing
					if (!frontmatter.cr_type) {
						frontmatter.cr_type = 'person';
						propertiesAdded = true;
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
						propertiesAdded = true;
					}

					// born: Add as empty if missing
					if (!frontmatter.born) {
						frontmatter.born = '';
						propertiesAdded = true;
					}

					// died: Add as empty if missing
					if (!frontmatter.died) {
						frontmatter.died = '';
						propertiesAdded = true;
					}

					// father: Add as empty if missing
					if (!frontmatter.father) {
						frontmatter.father = '';
						propertiesAdded = true;
					}

					// mother: Add as empty if missing
					if (!frontmatter.mother) {
						frontmatter.mother = '';
						propertiesAdded = true;
					}

					// spouses: Add as empty array if missing
					if (!frontmatter.spouses) {
						frontmatter.spouses = [];
						propertiesAdded = true;
					}

					// children: Add as empty array if missing
					if (!frontmatter.children) {
						frontmatter.children = [];
						propertiesAdded = true;
					}

					// group_name: Add as empty if missing
					if (!frontmatter.group_name) {
						frontmatter.group_name = '';
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential properties');
			} else {
				new Notice('Failed to add essential properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential person properties:', error);
		new Notice('Failed to add essential person properties');
	}
}

export async function addEssentialPlaceProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "place" (migrate from legacy 'type' property)
					if (frontmatter.cr_type !== 'place') {
						frontmatter.cr_type = 'place';
						propertiesAdded = true;
					}
					// Remove legacy 'type' property if it exists (migrated to cr_type)
					if (frontmatter.type === 'place') {
						delete frontmatter.type;
						propertiesAdded = true;
					}

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
						propertiesAdded = true;
					}

					// place_type: Add as empty if missing
					if (!frontmatter.place_type) {
						frontmatter.place_type = '';
						propertiesAdded = true;
					}

					// place_category: Use setting default if missing
					if (!frontmatter.place_category) {
						frontmatter.place_category = plugin.settings.defaultPlaceCategory;
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential place properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential place properties');
			} else {
				new Notice('Failed to add essential place properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential place properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential place properties:', error);
		new Notice('Failed to add essential place properties');
	}
}

export async function addEssentialMapProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "map"
					if (frontmatter.cr_type !== 'map') {
						frontmatter.cr_type = 'map';
						propertiesAdded = true;
					}

					// map_id: Generate from filename if missing
					if (!frontmatter.map_id) {
						frontmatter.map_id = file.basename.toLowerCase().replace(/\s+/g, '-');
						propertiesAdded = true;
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
						propertiesAdded = true;
					}

					// universe: Add empty if missing
					if (!frontmatter.universe) {
						frontmatter.universe = '';
						propertiesAdded = true;
					}

					// image: Add empty if missing
					if (!frontmatter.image) {
						frontmatter.image = '';
						propertiesAdded = true;
					}

					// bounds: Add flat properties if missing (check for both flat and nested)
					const hasFlatBounds = frontmatter.bounds_north !== undefined;
					const hasNestedBounds = frontmatter.bounds && typeof frontmatter.bounds === 'object';
					if (!hasFlatBounds && !hasNestedBounds) {
						frontmatter.bounds_north = 100;
						frontmatter.bounds_south = -100;
						frontmatter.bounds_east = 100;
						frontmatter.bounds_west = -100;
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential map properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential map properties');
			} else {
				new Notice('Failed to add essential map properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential map properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential map properties:', error);
		new Notice('Failed to add essential map properties');
	}
}

export async function addEssentialUniverseProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "universe"
					frontmatter.cr_type = 'universe';

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
					}

					// description: Add empty if missing
					if (frontmatter.description === undefined) {
						frontmatter.description = '';
					}

					// status: Default to 'active' if missing
					if (!frontmatter.status) {
						frontmatter.status = 'active';
					}

					// author: Add empty if missing
					if (frontmatter.author === undefined) {
						frontmatter.author = '';
					}

					// genre: Add empty if missing
					if (frontmatter.genre === undefined) {
						frontmatter.genre = '';
					}
				});

				processedCount++;

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential universe properties');
			} else {
				new Notice('Failed to add essential universe properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential universe properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential universe properties:', error);
		new Notice('Failed to add essential universe properties');
	}
}

export async function addEssentialSourceProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "source"
					if (frontmatter.cr_type !== 'source') {
						frontmatter.cr_type = 'source';
						propertiesAdded = true;
					}

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// title: Use filename if missing
					if (!frontmatter.title) {
						frontmatter.title = file.basename;
						propertiesAdded = true;
					}

					// source_type: Default to 'other' if missing
					if (!frontmatter.source_type) {
						frontmatter.source_type = 'other';
						propertiesAdded = true;
					}

					// confidence: Default to 'unknown' if missing
					if (!frontmatter.confidence) {
						frontmatter.confidence = 'unknown';
						propertiesAdded = true;
					}

					// source_repository: Add empty if missing (check both new and legacy names)
					if (!frontmatter.source_repository && !frontmatter.repository) {
						frontmatter.source_repository = '';
						propertiesAdded = true;
					}

					// source_date: Add empty if missing (check both new and legacy names)
					if (!frontmatter.source_date && !frontmatter.date) {
						frontmatter.source_date = '';
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential source properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential source properties');
			} else {
				new Notice('Failed to add essential source properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential source properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential source properties:', error);
		new Notice('Failed to add essential source properties');
	}
}

export async function addEssentialEventProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "event"
					if (frontmatter.cr_type !== 'event') {
						frontmatter.cr_type = 'event';
						propertiesAdded = true;
					}

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// title: Use filename if missing
					if (!frontmatter.title) {
						frontmatter.title = file.basename;
						propertiesAdded = true;
					}

					// event_type: Default to 'custom' if missing
					if (!frontmatter.event_type) {
						frontmatter.event_type = 'custom';
						propertiesAdded = true;
					}

					// date: Add empty if missing
					if (!frontmatter.date) {
						frontmatter.date = '';
						propertiesAdded = true;
					}

					// date_precision: Default to 'unknown' if missing
					if (!frontmatter.date_precision) {
						frontmatter.date_precision = 'unknown';
						propertiesAdded = true;
					}

					// persons: Add empty array if missing (use persons array, not deprecated singular person)
					if (!frontmatter.persons) {
						frontmatter.persons = [];
						propertiesAdded = true;
					}

					// place: Add empty if missing
					if (!frontmatter.place) {
						frontmatter.place = '';
						propertiesAdded = true;
					}

					// confidence: Default to 'unknown' if missing
					if (!frontmatter.confidence) {
						frontmatter.confidence = 'unknown';
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential event properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential event properties');
			} else {
				new Notice('Failed to add essential event properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential event properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential event properties:', error);
		new Notice('Failed to add essential event properties');
	}
}

export async function addCrId(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let idAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// Skip if cr_id already exists
					if (frontmatter.cr_id) {
						return;
					}

					// All note types use plain cr_id format (cr_type identifies the note type)
					frontmatter.cr_id = generateCrId();
					idAdded = true;
				});

				if (idAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added cr_id');
			} else if (skippedCount === 1) {
				new Notice('File already has cr_id');
			} else {
				new Notice('Failed to add cr_id');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already have cr_id`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Add cr_id: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding cr_id:', error);
		new Notice('Failed to add cr_id');
	}
}

export async function insertSourceRolesBlock(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	try {
		const content = await plugin.app.vault.read(file);

		// Check if already has source roles block
		if (content.includes('```charted-roots-source-roles')) {
			new Notice('Source roles block already exists in this note');
			return;
		}

		// Build the block (self-referencing - no source parameter needed)
		const blockLines = [
			'',
			'```charted-roots-source-roles',
			'```',
			''
		];

		// Append to end of file
		const newContent = content.trimEnd() + '\n' + blockLines.join('\n');
		await plugin.app.vault.modify(file, newContent);

		new Notice('Source roles block added');

	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Error inserting source roles block:', error);
		new Notice(`Failed to add source roles block: ${message}`);
	}
}

export async function insertMembersBlock(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	try {
		const content = await plugin.app.vault.read(file);

		if (content.includes('```charted-roots-members')) {
			new Notice('Members block already exists in this note');
			return;
		}

		const blockLines = [
			'',
			'```charted-roots-members',
			'group-by: role',
			'```',
			''
		];

		// Append to end of file
		const newContent = content.trimEnd() + '\n' + blockLines.join('\n');
		await plugin.app.vault.modify(file, newContent);

		new Notice('Members block added');

	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Error inserting members block:', error);
		new Notice(`Failed to add members block: ${message}`);
	}
}

export function showFolderStatistics(plugin: CanvasRootsPlugin, folder: TFolder): void {
	new FolderStatisticsModal(plugin.app, folder).open();
}

export async function openCanvasInFamilyChart(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	try {
		const canvasContent = await plugin.app.vault.read(file);
		const canvasData = JSON.parse(canvasContent);
		const metadata = canvasData.metadata?.frontmatter;

		if ((metadata?.plugin !== 'charted-roots' && metadata?.plugin !== 'canvas-roots') || !metadata.generation?.rootCrId) {
			new Notice('This canvas does not contain Charted Roots tree data');
			return;
		}

		const rootCrId = metadata.generation.rootCrId;
		// Open in main workspace when triggered from canvas context menu
		await plugin.activateFamilyChartView(rootCrId, true);
	} catch (error) {
		logger.error('open-canvas-chart', 'Failed to open canvas in family chart', error);
		new Notice('Failed to read canvas file');
	}
}
