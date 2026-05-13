/**
 * Maps tab for the Control Center modal
 *
 * Renders the maps tab content including world map preview, custom maps gallery,
 * visualizations, place timeline, and map statistics.
 */

import { Menu, MenuItem, Modal, Notice, Setting, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { setLucideIcon } from '../../ui/lucide-icons';
import { createStatItem } from '../../ui/shared/card-component';
import { PlaceGraphService } from '../../core/place-graph';
import { BulkGeocodeModal } from './bulk-geocode-modal';
import { CreateMapWizardModal } from '../../ui/create-map-wizard-modal';
import { CreateMapModal } from '../../ui/create-map-modal';
import { MigrationDiagramModal } from '../../ui/migration-diagram-modal';
import { PlaceNetworkModal } from '../../ui/place-network-modal';
import { renderWorldMapPreview } from './world-map-preview';
import { renderPlaceTimelineCard } from '../../events/ui/place-timeline';
import { resolvePathToFile } from '../../utils/wikilink-resolver';
import { getErrorMessage } from '../../core/error-utils';

/**
 * Options for rendering the Maps tab
 */
export interface MapsTabOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	app: App;
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement;
	showTab: (tabId: string) => void;
	closeModal: () => void;
}

/**
 * Convert a value to a safe string for YAML frontmatter
 */
function toSafeString(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'object' && value !== null) return JSON.stringify(value);
	return String(value as string | number | boolean | bigint | symbol);
}

/**
 * Generate a URL-friendly map ID from a name
 */
function generateMapId(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Get all custom map notes from the vault
 */
function getCustomMaps(app: App): Array<{
	name: string;
	filePath: string;
	imagePath?: string;
	universe?: string;
	id?: string;
}> {
	const maps: Array<{
		name: string;
		filePath: string;
		imagePath?: string;
		universe?: string;
		id?: string;
	}> = [];

	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (frontmatter?.cr_type === 'map' || frontmatter?.type === 'map') {
			// Get raw image value - may be string, nested array (YAML [[path]]), or quoted wikilink
			const rawImage = frontmatter.image || frontmatter.image_path || frontmatter.imagePath;
			let imagePath: string | undefined;

			if (rawImage) {
				// Handle wikilinks parsed as nested arrays by YAML
				// [[path/to/file]] becomes [["path/to/file"]] in memory
				if (Array.isArray(rawImage) && rawImage.length === 1 &&
					Array.isArray(rawImage[0]) && rawImage[0].length === 1) {
					imagePath = `[[${rawImage[0][0]}]]`;
				} else if (typeof rawImage === 'string') {
					imagePath = rawImage;
				}
			}

			maps.push({
				name: frontmatter.name || file.basename,
				filePath: file.path,
				imagePath,
				universe: frontmatter.universe,
				id: frontmatter.map_id
			});
		}
	}

	// Sort by name
	maps.sort((a, b) => a.name.localeCompare(b.name));

	return maps;
}

/**
 * Load custom maps into a thumbnail grid
 */
function loadCustomMapsGrid(
	container: HTMLElement,
	options: MapsTabOptions
): void {
	const { app, plugin, closeModal } = options;
	container.empty();

	// Find all map notes (cr_type: map in frontmatter)
	const customMaps = getCustomMaps(app);

	if (customMaps.length === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No custom maps found.',
			cls: 'crc-text--muted'
		});
		emptyState.createEl('p', {
			text: 'Create a note with cr_type: map in frontmatter to define custom image maps for fictional worlds.',
			cls: 'crc-text--muted crc-text--small'
		});

		// Link to wiki
		const wikiLink = emptyState.createEl('a', {
			text: 'Learn more about custom maps \u2192',
			href: 'https://github.com/banisterious/obsidian-charted-roots/wiki/Geographic-Features#custom-image-maps',
			cls: 'crc-link external-link crc-mt-2'
		});
		wikiLink.setAttr('target', '_blank');
		return;
	}

	// Create thumbnail grid
	const grid = container.createDiv({ cls: 'cr-map-grid' });

	for (const mapNote of customMaps) {
		const thumbnail = grid.createDiv({ cls: 'cr-map-thumbnail' });

		// Try to load image preview
		if (mapNote.imagePath) {
			// Use wikilink resolver to handle both plain paths and [[wikilinks]]
			const imageFile = resolvePathToFile(app, mapNote.imagePath);
			if (imageFile) {
				const imgUrl = app.vault.getResourcePath(imageFile);
				const img = thumbnail.createEl('img', {
					attr: {
						src: imgUrl,
						alt: mapNote.name
					}
				});
				img.onerror = () => {
					// Replace with placeholder on error
					img.remove();
					const placeholder = thumbnail.createDiv({ cls: 'cr-map-thumbnail__placeholder' });
					setLucideIcon(placeholder, 'map', 32);
				};
			} else {
				// Image not found - show placeholder
				const placeholder = thumbnail.createDiv({ cls: 'cr-map-thumbnail__placeholder' });
				setLucideIcon(placeholder, 'map', 32);
			}
		} else {
			// No image path - show placeholder
			const placeholder = thumbnail.createDiv({ cls: 'cr-map-thumbnail__placeholder' });
			setLucideIcon(placeholder, 'map', 32);
		}

		// Overlay with name and universe
		const overlay = thumbnail.createDiv({ cls: 'cr-map-thumbnail__overlay' });
		overlay.createDiv({ cls: 'cr-map-thumbnail__name', text: mapNote.name });
		if (mapNote.universe) {
			overlay.createDiv({ cls: 'cr-map-thumbnail__universe', text: mapNote.universe });
		}

		// Action buttons container (stacked vertically on right)
		const actionsContainer = thumbnail.createDiv({ cls: 'cr-map-thumbnail__actions' });

		// Edit button
		const editBtn = actionsContainer.createDiv({ cls: 'cr-map-thumbnail__action-btn' });
		setLucideIcon(editBtn, 'edit', 14);
		editBtn.setAttribute('aria-label', 'Edit map');
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation(); // Prevent thumbnail click
			const file = app.vault.getAbstractFileByPath(mapNote.filePath);
			if (file instanceof TFile) {
				const cache = app.metadataCache.getFileCache(file);
				const frontmatter = cache?.frontmatter;
				new CreateMapModal(app, {
					editFile: file,
					editFrontmatter: frontmatter,
					propertyAliases: plugin.settings.propertyAliases,
					onCreated: () => {
						// Refresh the maps grid after editing
						loadCustomMapsGrid(container, options);
					}
				}).open();
			}
		});

		// Menu button
		const menuBtn = actionsContainer.createDiv({ cls: 'cr-map-thumbnail__action-btn' });
		setLucideIcon(menuBtn, 'more-vertical', 14);
		menuBtn.setAttribute('aria-label', 'More options');
		menuBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			showMapContextMenu(mapNote, container, e, options);
		});

		// Click to open in Map View with this specific map
		thumbnail.addEventListener('click', () => {
			closeModal();
			void plugin.activateMapView(mapNote.id);
		});

		// Right-click context menu
		thumbnail.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			showMapContextMenu(mapNote, container, e, options);
		});
	}
}

/**
 * Show context menu for a custom map
 */
function showMapContextMenu(
	mapNote: { name: string; filePath: string; imagePath?: string; universe?: string; id?: string },
	gridContainer: HTMLElement,
	event: MouseEvent,
	options: MapsTabOptions
): void {
	const { app, plugin, closeModal } = options;
	const menu = new Menu();

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Open in map view')
			.setIcon('map')
			.onClick(async () => {
				closeModal();
				await plugin.activateMapView(mapNote.id);
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Edit map')
			.setIcon('edit')
			.onClick(() => {
				const file = app.vault.getAbstractFileByPath(mapNote.filePath);
				if (file instanceof TFile) {
					const cache = app.metadataCache.getFileCache(file);
					const frontmatter = cache?.frontmatter;
					new CreateMapModal(app, {
						editFile: file,
						editFrontmatter: frontmatter,
						propertyAliases: plugin.settings.propertyAliases,
						onCreated: () => {
							// Refresh the maps grid after editing
							loadCustomMapsGrid(gridContainer, options);
						}
					}).open();
				}
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Duplicate map')
			.setIcon('copy')
			.onClick(async () => {
				await duplicateMap(mapNote.filePath, gridContainer, options);
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Export to JSON')
			.setIcon('download')
			.onClick(async () => {
				await exportMapToJson(mapNote.filePath, app);
			});
	});

	menu.addSeparator();

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Open note')
			.setIcon('file-text')
			.onClick(async () => {
				const file = app.vault.getAbstractFileByPath(mapNote.filePath);
				if (file instanceof TFile) {
					await app.workspace.getLeaf(false).openFile(file);
					closeModal();
				}
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Delete map')
			.setIcon('trash')
			.onClick(async () => {
				await deleteMap(mapNote.filePath, mapNote.name, gridContainer, options);
			});
	});

	menu.showAtMouseEvent(event);
}

/**
 * Duplicate a custom map note
 */
async function duplicateMap(
	filePath: string,
	gridContainer: HTMLElement,
	options: MapsTabOptions
): Promise<void> {
	const { app, plugin } = options;
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) {
		new Notice('Map file not found');
		return;
	}

	// Read original file content
	const content = await app.vault.read(file);
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter;

	if (!frontmatter) {
		new Notice('Could not read map frontmatter');
		return;
	}

	// Generate new name and ID
	const originalName = frontmatter.name || file.basename;
	const newName = `${originalName} (copy)`;
	const originalId = frontmatter.map_id || '';
	const newId = originalId ? `${originalId}-copy` : generateMapId(newName);

	// Check if copy already exists, increment suffix if needed
	let finalName = newName;
	let finalId = newId;
	let suffix = 1;
	const parentPath = file.parent?.path || '';

	let testPath = parentPath ? `${parentPath}/${finalName}.md` : `${finalName}.md`;
	while (app.vault.getAbstractFileByPath(testPath)) {
		suffix++;
		finalName = `${originalName} (copy ${suffix})`;
		finalId = originalId ? `${originalId}-copy-${suffix}` : generateMapId(finalName);
		testPath = parentPath ? `${parentPath}/${finalName}.md` : `${finalName}.md`;
	}

	// Update frontmatter in content
	let newContent = content;

	// Replace name in frontmatter
	if (frontmatter.name) {
		newContent = newContent.replace(
			/^(name:\s*).+$/m,
			`$1${finalName}`
		);
	} else {
		// Add name if not present
		newContent = newContent.replace(
			/^(---\s*\n)/,
			`$1name: ${finalName}\n`
		);
	}

	// Replace map_id in frontmatter
	if (frontmatter.map_id) {
		newContent = newContent.replace(
			/^(map_id:\s*).+$/m,
			`$1${finalId}`
		);
	} else {
		// Add map_id if not present
		newContent = newContent.replace(
			/^(---\s*\n)/,
			`$1map_id: ${finalId}\n`
		);
	}

	// Create new file in same directory
	const newFilePath = parentPath
		? `${parentPath}/${finalName}.md`
		: `${finalName}.md`;

	try {
		const newFile = await app.vault.create(newFilePath, newContent);
		new Notice(`Created "${finalName}"`);

		// Refresh the grid
		loadCustomMapsGrid(gridContainer, options);

		// Open the new map in edit mode
		const newCache = app.metadataCache.getFileCache(newFile);
		new CreateMapModal(app, {
			editFile: newFile,
			editFrontmatter: newCache?.frontmatter,
			propertyAliases: plugin.settings.propertyAliases,
			onCreated: () => {
				loadCustomMapsGrid(gridContainer, options);
			}
		}).open();
	} catch (error) {
		new Notice(`Failed to duplicate map: ${getErrorMessage(error)}`);
	}
}

/**
 * Export a custom map's configuration to JSON
 */
async function exportMapToJson(filePath: string, app: App): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) {
		new Notice('Map file not found');
		return;
	}

	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter;

	if (!frontmatter) {
		new Notice('Could not read map frontmatter');
		return;
	}

	// Build export object with relevant map properties
	const exportData: Record<string, unknown> = {
		name: frontmatter.name || file.basename,
		map_id: frontmatter.map_id,
		type: 'map',
		universe: frontmatter.universe,
		image: frontmatter.image || frontmatter.image_path || frontmatter.imagePath,
		coordinate_system: frontmatter.coordinate_system || 'geographic',
		exported_at: new Date().toISOString(),
		exported_from: 'Charted Roots'
	};

	// Add coordinate system specific fields
	if (frontmatter.coordinate_system === 'pixel') {
		exportData.width = frontmatter.width;
		exportData.height = frontmatter.height;
	} else {
		// Geographic bounds
		if (frontmatter.bounds) {
			exportData.bounds = frontmatter.bounds;
		} else {
			exportData.bounds = {
				north: frontmatter.north,
				south: frontmatter.south,
				east: frontmatter.east,
				west: frontmatter.west
			};
		}
	}

	// Add optional fields if present
	if (frontmatter.default_zoom !== undefined) {
		exportData.default_zoom = frontmatter.default_zoom;
	}
	if (frontmatter.min_zoom !== undefined) {
		exportData.min_zoom = frontmatter.min_zoom;
	}
	if (frontmatter.max_zoom !== undefined) {
		exportData.max_zoom = frontmatter.max_zoom;
	}
	if (frontmatter.center) {
		exportData.center = frontmatter.center;
	}

	// Remove undefined values
	const cleanExport = Object.fromEntries(
		Object.entries(exportData).filter(([, v]) => v !== undefined)
	);

	const jsonContent = JSON.stringify(cleanExport, null, 2);

	// Create filename from map name
	const mapName = frontmatter.name || file.basename;
	const safeFileName = mapName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-');
	const exportFileName = `${safeFileName}-map-export.json`;

	// Save to vault root or Downloads equivalent
	try {
		// Check if file already exists
		const existingFile = app.vault.getAbstractFileByPath(exportFileName);
		if (existingFile instanceof TFile) {
			await app.vault.modify(existingFile, jsonContent);
		} else if (!existingFile) {
			await app.vault.create(exportFileName, jsonContent);
		}
		new Notice(`Exported "${mapName}" to ${exportFileName}`);
	} catch (error) {
		new Notice(`Failed to export: ${getErrorMessage(error)}`);
	}
}

/**
 * Import a custom map from a JSON file
 */
function importMapFromJson(
	gridContainer: HTMLElement,
	options: MapsTabOptions
): void {
	const { app, plugin } = options;

	// Create file input element
	const input = activeDocument.createElement('input');
	input.type = 'file';
	input.accept = '.json';

	input.addEventListener('change', () => void (async () => {
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data = JSON.parse(text) as Record<string, unknown>;

			// Validate required fields
			if (!data.name || typeof data.name !== 'string') {
				new Notice('Invalid JSON: missing "name" field');
				return;
			}

			// Check for map_id or generate one
			let mapId = data.map_id as string | undefined;
			if (!mapId) {
				mapId = generateMapId(data.name);
			}

			// Check if a map with this ID already exists
			const existingMaps = getCustomMaps(app);
			const existingMap = existingMaps.find(m => m.id === mapId);
			if (existingMap) {
				new Notice(`A map with ID "${mapId}" already exists. Please edit the JSON or delete the existing map.`);
				return;
			}

			// Build frontmatter
			const frontmatterLines: string[] = [
				'---',
				'cr_type: map',
				`name: ${data.name}`,
				`map_id: ${mapId}`
			];

			if (data.universe) {
				frontmatterLines.push(`universe: ${toSafeString(data.universe)}`);
			}
			if (data.image) {
				frontmatterLines.push(`image: ${toSafeString(data.image)}`);
			}
			if (data.coordinate_system) {
				frontmatterLines.push(`coordinate_system: ${toSafeString(data.coordinate_system)}`);
			}

			// Handle bounds (geographic) or dimensions (pixel)
			if (data.coordinate_system === 'pixel') {
				if (data.width !== undefined) {
					frontmatterLines.push(`width: ${toSafeString(data.width)}`);
				}
				if (data.height !== undefined) {
					frontmatterLines.push(`height: ${toSafeString(data.height)}`);
				}
			} else {
				// Geographic bounds
				if (data.bounds && typeof data.bounds === 'object') {
					const bounds = data.bounds as Record<string, number>;
					if (bounds.north !== undefined) frontmatterLines.push(`north: ${toSafeString(bounds.north)}`);
					if (bounds.south !== undefined) frontmatterLines.push(`south: ${toSafeString(bounds.south)}`);
					if (bounds.east !== undefined) frontmatterLines.push(`east: ${toSafeString(bounds.east)}`);
					if (bounds.west !== undefined) frontmatterLines.push(`west: ${toSafeString(bounds.west)}`);
				}
			}

			// Optional fields
			if (data.default_zoom !== undefined) {
				frontmatterLines.push(`default_zoom: ${toSafeString(data.default_zoom)}`);
			}
			if (data.min_zoom !== undefined) {
				frontmatterLines.push(`min_zoom: ${toSafeString(data.min_zoom)}`);
			}
			if (data.max_zoom !== undefined) {
				frontmatterLines.push(`max_zoom: ${toSafeString(data.max_zoom)}`);
			}
			if (data.center && typeof data.center === 'object') {
				const center = data.center as Record<string, number>;
				frontmatterLines.push(`center:`);
				if (center.lat !== undefined) frontmatterLines.push(`  lat: ${toSafeString(center.lat)}`);
				if (center.lng !== undefined) frontmatterLines.push(`  lng: ${toSafeString(center.lng)}`);
			}

			frontmatterLines.push('---');
			frontmatterLines.push('');
			frontmatterLines.push(`# ${String(data.name)}`);
			frontmatterLines.push('');
			frontmatterLines.push('*Imported from JSON*');

			const content = frontmatterLines.join('\n');

			// Determine file path - use configured maps folder or vault root
			const mapsDir = plugin.settings.mapsFolder || '';
			const safeFileName = String(data.name).replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-');
			const filePath = mapsDir
				? `${mapsDir}/${safeFileName}.md`
				: `${safeFileName}.md`;

			// Check if file already exists
			const existingFile = app.vault.getAbstractFileByPath(filePath);
			if (existingFile) {
				new Notice(`File "${filePath}" already exists`);
				return;
			}

			// Ensure directory exists
			if (mapsDir) {
				const folder = app.vault.getAbstractFileByPath(mapsDir);
				if (!folder) {
					await app.vault.createFolder(mapsDir);
				}
			}

			// Create the file
			await app.vault.create(filePath, content);
			new Notice(`Imported "${data.name}" from JSON`);

			// Refresh the grid
			loadCustomMapsGrid(gridContainer, options);

		} catch (error) {
			if (error instanceof SyntaxError) {
				new Notice('Invalid JSON file');
			} else {
				new Notice(`Failed to import: ${getErrorMessage(error)}`);
			}
		}
	})());

	// Trigger file picker
	input.click();
}

/**
 * Delete a custom map note with confirmation
 */
async function deleteMap(
	filePath: string,
	mapName: string,
	gridContainer: HTMLElement,
	options: MapsTabOptions
): Promise<void> {
	const { app } = options;
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) {
		new Notice('Map file not found');
		return;
	}

	// Show confirmation dialog
	const confirmed = await showDeleteConfirmation(mapName, app);
	if (!confirmed) {
		return;
	}

	try {
		await app.fileManager.trashFile(file);
		new Notice(`Deleted "${mapName}"`);
		loadCustomMapsGrid(gridContainer, options);
	} catch (error) {
		new Notice(`Failed to delete: ${getErrorMessage(error)}`);
	}
}

/**
 * Show a confirmation dialog for deleting a map
 */
function showDeleteConfirmation(mapName: string, app: App): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(app);
		modal.titleEl.setText('Delete map');

		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete "${mapName}"?`
		});
		modal.contentEl.createEl('p', {
			text: 'The map note will be moved to trash. The image file will not be deleted.',
			cls: 'crc-text--muted'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => {
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

/**
 * Render map statistics
 */
function renderMapStatistics(
	container: HTMLElement,
	stats: ReturnType<PlaceGraphService['calculateStatistics']>,
	options: MapsTabOptions
): void {
	const { plugin, closeModal } = options;
	const statsGrid = container.createDiv({ cls: 'crc-stats-grid' });

	// Places with coordinates
	const coordPercent = stats.totalPlaces > 0
		? Math.round((stats.withCoordinates / stats.totalPlaces) * 100)
		: 0;
	createStatItem(statsGrid, 'With coordinates', `${stats.withCoordinates}/${stats.totalPlaces} (${coordPercent}%)`, 'globe');

	// Places without coordinates
	const withoutCoords = stats.totalPlaces - stats.withCoordinates;
	createStatItem(statsGrid, 'Without any coordinates', withoutCoords.toString(), 'map-pin');

	// Universes
	const universeCount = Object.keys(stats.byUniverse).length;
	if (universeCount > 0) {
		createStatItem(statsGrid, 'Universes', universeCount.toString(), 'globe');

		// List universes
		const universeSection = container.createDiv({ cls: 'crc-mt-3' });
		universeSection.createEl('h4', { text: 'Universes', cls: 'crc-section-title' });
		const universeList = universeSection.createEl('ul', { cls: 'crc-list' });

		for (const [universe, count] of Object.entries(stats.byUniverse).sort((a, b) => b[1] - a[1])) {
			const item = universeList.createEl('li');
			item.createEl('span', { text: universe });
			item.createEl('span', { text: ` (${count} places)`, cls: 'crc-text--muted' });
		}
	}

	// View full statistics link
	const statsLink = container.createDiv({ cls: 'cr-stats-link' });
	const link = statsLink.createEl('a', { text: 'View full statistics \u2192', cls: 'crc-text-muted' });
	link.addEventListener('click', (e) => {
		e.preventDefault();
		closeModal();
		void plugin.activateStatisticsView();
	});
}

/**
 * Render the Maps tab content
 */
export function renderMapsTab(options: MapsTabOptions): void {
	const { container, app, plugin, createCard, closeModal } = options;

	// Card 1: World map preview
	const mapViewCard = createCard({
		title: 'World map',
		icon: 'map',
		subtitle: 'Interactive geographic visualization'
	});

	const mapViewContent = mapViewCard.querySelector('.crc-card__content') as HTMLElement;

	// Get place data for the map preview and statistics
	const placeService = plugin.createPlaceGraphService();
	void placeService.reloadCache();
	const places = placeService.getAllPlaces();
	const stats = placeService.calculateStatistics();

	// Render the clickable world map preview
	renderWorldMapPreview(mapViewContent, app, {
		places,
		onClick: () => {
			closeModal();
			app.commands.executeCommandById('charted-roots:open-map-view');
		}
	});

	// Open new map button (for side-by-side comparison)
	new Setting(mapViewContent)
		.setName('Open new map view')
		.setDesc('Open a second map view for side-by-side comparison')
		.addButton(button => button
			.setButtonText('Open new map')
			.onClick(() => {
				closeModal();
				app.commands.executeCommandById('charted-roots:open-new-map-view');
			}));

	// Bulk geocode places without coordinates
	const placesWithoutCoords = places.filter(p =>
		!p.coordinates && ['real', 'historical', 'disputed'].includes(p.category)
	);

	if (placesWithoutCoords.length > 0) {
		new Setting(mapViewContent)
			.setName('Bulk geocode places')
			.setDesc(`${placesWithoutCoords.length} place${placesWithoutCoords.length !== 1 ? 's' : ''} without coordinates. Look up using OpenStreetMap.`)
			.addButton(button => button
				.setButtonText('Geocode')
				.onClick(() => {
					new BulkGeocodeModal(app, placeService, {
						onComplete: () => {
							// Refresh the Maps tab
							container.empty();
							renderMapsTab(options);
						}
					}).open();
				}));
	}

	container.appendChild(mapViewCard);

	// Card 2: Custom Maps
	const customMapsCard = createCard({
		title: 'Custom maps',
		icon: 'globe',
		subtitle: 'Image maps for fictional worlds'
	});

	const customMapsContent = customMapsCard.querySelector('.crc-card__content') as HTMLElement;

	// Create map buttons
	new Setting(customMapsContent)
		.setName('Create custom map')
		.setDesc('Create a new map note for a fictional or historical world')
		.addButton(button => button
			.setButtonText('Wizard')
			.setCta()
			.onClick(() => {
				closeModal();
				new CreateMapWizardModal(app, plugin, {
					directory: plugin.settings.mapsFolder
				}).open();
			}))
		.addButton(button => button
			.setButtonText('Quick create')
			.onClick(() => {
				closeModal();
				new CreateMapModal(app, {
					directory: plugin.settings.mapsFolder,
					propertyAliases: plugin.settings.propertyAliases,
					onCreated: () => {
						// Note: Control Center is closed, so we can't refresh
					}
				}).open();
			}))
		.addButton(button => button
			.setButtonText('Import JSON')
			.onClick(() => {
				importMapFromJson(mapsGridContainer, options);
			}));

	// Gallery section with heading
	const gallerySection = customMapsContent.createDiv({ cls: 'cr-map-gallery-section' });
	gallerySection.createEl('h4', { text: 'Gallery', cls: 'cr-map-gallery-heading' });

	// Placeholder for loading maps
	const mapsGridContainer = gallerySection.createDiv();
	mapsGridContainer.createEl('p', {
		text: 'Loading custom maps...',
		cls: 'crc-text--muted'
	});

	container.appendChild(customMapsCard);

	// Load custom maps asynchronously
	void loadCustomMapsGrid(mapsGridContainer, options);

	// Card 3: Visualizations
	const vizCard = createCard({
		title: 'Visualizations',
		icon: 'activity',
		subtitle: 'Migration and network diagrams'
	});

	const vizContent = vizCard.querySelector('.crc-card__content') as HTMLElement;

	new Setting(vizContent)
		.setName('Migration diagram')
		.setDesc('Visualize migration patterns from birth to death locations')
		.addButton(button => button
			.setButtonText('View diagram')
			.onClick(() => {
				new MigrationDiagramModal(app).open();
			}));

	new Setting(vizContent)
		.setName('Place hierarchy')
		.setDesc('Visualize place relationships as a network diagram')
		.addButton(button => button
			.setButtonText('View hierarchy')
			.onClick(() => {
				new PlaceNetworkModal(app).open();
			}));

	container.appendChild(vizCard);

	// Card 4: Place Timeline
	const placeTimelineCard = createCard({
		title: 'Place timeline',
		icon: 'map-pin',
		subtitle: 'Events at a location over time'
	});

	const placeTimelineContent = placeTimelineCard.querySelector('.crc-card__content') as HTMLElement;

	const eventService = plugin.getEventService();
	if (eventService) {
		renderPlaceTimelineCard(
			placeTimelineContent,
			app,
			plugin.settings,
			eventService,
			{
				onPlaceSelect: (_placeName) => {
					// Could navigate to place on map in future
				}
			}
		);
	} else {
		placeTimelineContent.createEl('p', {
			text: 'Event service not available.',
			cls: 'crc-text--muted'
		});
	}

	container.appendChild(placeTimelineCard);

	// Card 5: Map Statistics
	const statsCard = createCard({
		title: 'Map statistics',
		icon: 'bar-chart',
		subtitle: 'Geographic data overview'
	});

	const statsContent = statsCard.querySelector('.crc-card__content') as HTMLElement;
	renderMapStatistics(statsContent, stats, options);

	container.appendChild(statsCard);
}
