/**
 * Map View - Interactive geographic visualization
 *
 * An Obsidian ItemView that renders a Leaflet map for visualizing
 * birth/death locations and migration patterns.
 */

import { ItemView, WorkspaceLeaf, Menu, Notice, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { getLogger } from '../core/logging';
import { capitalize } from '../utils/format-utils';
import { MapController } from './map-controller';
import { MapDataService } from './map-data-service';
import { CreatePlaceModal } from '../ui/create-place-modal';
import { PlacePickerModal, SelectedPlaceInfo } from '../ui/place-picker';
import { UniverseSyncModal } from './ui/universe-sync-modal';
import { GeocodingService } from './services/geocoding-service';
import { PlaceCategory, UNIVERSE_CATEGORIES } from '../models/place';
import type {
	MapFilters,
	LayerVisibility,
	MapSettings,
	CustomMapConfig,
	TimeSliderState,
	MapData,
	PersonLifeSpan,
	JourneyPath,
	JourneyWaypoint
} from './types/map-types';

const logger = getLogger('MapView');

export const VIEW_TYPE_MAP = 'canvas-roots-map';

/**
 * View state that gets persisted
 */
interface MapViewState {
	filters: MapFilters;
	layers: LayerVisibility;
	center?: { lat: number; lng: number };
	zoom?: number;
	activeMap?: string;
	[key: string]: unknown;
}

/**
 * Interactive Map View for geographic visualization
 */
export class MapView extends ItemView {
	plugin: CanvasRootsPlugin;

	// Controllers and services
	private mapController: MapController | null = null;
	private dataService: MapDataService;

	// UI elements
	private toolbarEl: HTMLElement | null = null;
	private mapContainerEl: HTMLElement | null = null;
	private statusBarEl: HTMLElement | null = null;
	private mapSelectEl: HTMLSelectElement | null = null;
	private breadcrumbEl: HTMLElement | null = null;
	private timeSliderContainerEl: HTMLElement | null = null;

	// View state
	private filters: MapFilters = {};
	private customMaps: CustomMapConfig[] = [];
	private layers: LayerVisibility = {
		// Core life events
		births: true,
		deaths: true,
		marriages: false,
		burials: false,
		// Additional life events
		residences: true,
		occupations: true,
		educations: true,
		military: true,
		immigrations: true,
		religious: true,
		custom: true,
		// Other layers
		paths: true,
		journeys: false,
		heatMap: false,
		places: false,
		childMaps: true
	};

	// Time slider state
	private timeSlider: TimeSliderState = {
		enabled: false,
		currentYear: 1900,
		isPlaying: false,
		speed: 500, // ms per year
		snapshotMode: true
	};
	private animationInterval: number | null = null;
	private currentMapData: MapData | null = null;

	// Journey mode state
	private journeyMode: {
		enabled: boolean;
		personId: string | null;
		personName: string | null;
		currentStep: number;
		isPlaying: boolean;
		speed: number;
		familyOverlay: boolean;
	} = {
		enabled: false,
		personId: null,
		personName: null,
		currentStep: 0,
		isPlaying: false,
		speed: 2000,
		familyOverlay: false
	};
	private journeyPlaybackInterval: number | null = null;
	private journeyControlsEl: HTMLElement | null = null;
	private journeyPickerEl: HTMLElement | null = null;
	private familyToggleEl: HTMLElement | null = null;

	// Edit mode state
	private editModeEnabled: boolean = false;
	private movePlacesModeEnabled: boolean = false;  // Marker-only edit mode
	private editBannerEl: HTMLElement | null = null;
	private editBtn: HTMLButtonElement | null = null;
	private movePlacesBtn: HTMLButtonElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.dataService = new MapDataService(plugin);
	}

	getViewType(): string {
		return VIEW_TYPE_MAP;
	}

	getDisplayText(): string {
		return 'Map view';
	}

	getIcon(): string {
		return 'map';
	}

	async onOpen(): Promise<void> {
		logger.debug('view-open', 'Opening MapView');

		// Build UI structure
		this.buildUI();

		// Wait for container to have valid dimensions
		await this.waitForContainerDimensions();

		// Initialize map
		await this.initializeMap();

		// Register event handlers
		this.registerEventHandlers();
	}

	/**
	 * Wait for the map container to have valid dimensions
	 * Leaflet requires the container to have width/height when initializing
	 */
	private async waitForContainerDimensions(): Promise<void> {
		const maxAttempts = 20;
		const delayMs = 50;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			if (this.mapContainerEl) {
				const rect = this.mapContainerEl.getBoundingClientRect();
				logger.debug('container-dimensions', `Attempt ${attempt + 1}: ${rect.width}x${rect.height}`);

				if (rect.width > 0 && rect.height > 0) {
					return;
				}
			}

			// Wait and try again
			await new Promise<void>(resolve => {
				requestAnimationFrame(() => {
					setTimeout(resolve, delayMs);
				});
			});
		}

		// Log warning but continue anyway - map might still work
		logger.warn('container-dimensions', 'Container dimensions not detected after waiting');
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- ItemView requires async onClose
	async onClose(): Promise<void> {
		logger.debug('view-close', 'Closing MapView');
		this.destroyMap();
	}

	/**
	 * Get state to persist
	 */
	getState(): MapViewState {
		const state: MapViewState = {
			filters: this.filters,
			layers: this.layers
		};

		if (this.mapController) {
			const mapState = this.mapController.getState();
			state.center = mapState.center;
			state.zoom = mapState.zoom;
			state.activeMap = mapState.activeMap;
		}

		return state;
	}

	/**
	 * Restore state from persistence
	 */
	async setState(state: MapViewState, result: { history: boolean }): Promise<void> {
		if (state.filters) {
			this.filters = state.filters;
		}
		if (state.layers) {
			this.layers = { ...this.layers, ...state.layers };
		}

		// Apply state to map controller if it exists
		if (this.mapController) {
			if (state.center && state.zoom !== undefined) {
				this.mapController.setView(state.center, state.zoom);
			}
			if (state.activeMap) {
				await this.mapController.setActiveMap(state.activeMap);
			}
			this.mapController.setLayerVisibility(this.layers);
			await this.refreshData();
		}

		await super.setState(state, result);
	}

	/**
	 * Build the UI structure: toolbar, map container, and status bar
	 */
	private buildUI(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass('cr-map-view');

		// Create toolbar
		this.toolbarEl = container.createDiv({ cls: 'cr-map-toolbar' });
		this.buildToolbar();

		// Create time slider panel (hidden by default)
		this.timeSliderContainerEl = container.createDiv({ cls: 'cr-map-time-slider-container cr-hidden' });
		this.buildTimeSlider();

		// Create map container
		this.mapContainerEl = container.createDiv({ cls: 'cr-map-container' });

		// Add right-click context menu for creating places
		this.mapContainerEl.addEventListener('contextmenu', (e) => {
			this.handleMapContextMenu(e);
		});

		// Create status bar
		this.statusBarEl = container.createDiv({ cls: 'cr-map-status' });
		this.updateStatusBar();
	}

	/**
	 * Build the toolbar with controls
	 */
	private buildToolbar(): void {
		if (!this.toolbarEl) return;
		this.toolbarEl.empty();

		// Left section: Layer toggles and map selector
		const leftSection = this.toolbarEl.createDiv({ cls: 'cr-map-toolbar-left' });

		// Map selector dropdown
		this.mapSelectEl = leftSection.createEl('select', {
			cls: 'cr-map-select',
			attr: { 'aria-label': 'Select map' }
		});
		this.mapSelectEl.createEl('option', { value: 'openstreetmap', text: 'Real world' });
		// Custom maps will be populated after loading
		this.mapSelectEl.addEventListener('change', () => {
			const mapId = this.mapSelectEl?.value || 'openstreetmap';
			// The map change callback will handle filtering and data refresh
			void this.mapController?.setActiveMap(mapId);
		});

		// Breadcrumb for parent map navigation (#361)
		this.breadcrumbEl = leftSection.createDiv({ cls: 'cr-map-breadcrumb' });
		this.breadcrumbEl.hide();

		// Layers dropdown
		const layersBtn = leftSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon',
			attr: { 'aria-label': 'Layers' }
		});
		setIcon(layersBtn, 'layers');
		layersBtn.addEventListener('click', (e) => this.showLayersMenu(e));

		// Center section: Filters
		const centerSection = this.toolbarEl.createDiv({ cls: 'cr-map-toolbar-center' });

		// Collection filter
		const collectionSelect = centerSection.createEl('select', {
			cls: 'cr-map-select',
			attr: { 'aria-label': 'Filter by collection' }
		});
		collectionSelect.createEl('option', { value: '', text: 'All collections' });
		// Options will be populated when data loads
		collectionSelect.addEventListener('change', () => {
			this.filters.collection = collectionSelect.value || undefined;
			void this.refreshData();
		});

		// Year range
		const yearFromInput = centerSection.createEl('input', {
			cls: 'cr-map-input',
			attr: {
				type: 'number',
				placeholder: 'From year',
				'aria-label': 'From year'
			}
		});
		yearFromInput.addEventListener('change', () => {
			this.filters.yearFrom = yearFromInput.value ? parseInt(yearFromInput.value) : undefined;
			void this.refreshData();
		});

		centerSection.createSpan({ text: '–', cls: 'cr-map-separator' });

		const yearToInput = centerSection.createEl('input', {
			cls: 'cr-map-input',
			attr: {
				type: 'number',
				placeholder: 'To year',
				'aria-label': 'To year'
			}
		});
		yearToInput.addEventListener('change', () => {
			this.filters.yearTo = yearToInput.value ? parseInt(yearToInput.value) : undefined;
			void this.refreshData();
		});

		// Right section: Actions
		const rightSection = this.toolbarEl.createDiv({ cls: 'cr-map-toolbar-right' });

		// Move places button (for custom maps only) - enables marker dragging
		this.movePlacesBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon cr-map-btn-move',
			attr: { 'aria-label': 'Move places' }
		});
		setIcon(this.movePlacesBtn, 'move');
		this.movePlacesBtn.addEventListener('click', () => void this.toggleMovePlacesMode());
		// Initially disabled (enabled when custom map is selected)
		this.movePlacesBtn.disabled = true;

		// Edit mode button (for custom maps only) - enables image alignment editing
		this.editBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon cr-map-btn-edit',
			attr: { 'aria-label': 'Edit alignment' }
		});
		setIcon(this.editBtn, 'edit');
		this.editBtn.addEventListener('click', () => void this.toggleEditMode());
		// Initially disabled (enabled when custom map is selected)
		this.editBtn.disabled = true;

		// Split view button (for side-by-side comparison)
		const splitBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon',
			attr: { 'aria-label': 'Compare' }
		});
		setIcon(splitBtn, 'git-compare');
		splitBtn.addEventListener('click', (e) => this.showCompareMenu(e));

		// Journey mode button
		const journeyBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon',
			attr: { 'aria-label': 'Journey mode' }
		});
		setIcon(journeyBtn, 'route');
		journeyBtn.addEventListener('click', () => this.toggleJourneyMode(journeyBtn));

		// Timeline toggle button
		const timelineBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon',
			attr: { 'aria-label': 'Timeline' }
		});
		setIcon(timelineBtn, 'clock');
		timelineBtn.addEventListener('click', () => this.toggleTimeSlider());

		// Refresh button (force refresh reads directly from files, bypassing metadata cache)
		const refreshBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon',
			attr: { 'aria-label': 'Refresh' }
		});
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.addEventListener('click', () => void this.refreshData(true));

		// Export dropdown
		const exportBtn = rightSection.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-icon',
			attr: { 'aria-label': 'Export' }
		});
		setIcon(exportBtn, 'download');
		exportBtn.addEventListener('click', (e) => this.showExportMenu(e));
	}

	/**
	 * Show layers menu
	 */
	private showLayersMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Core life events section
		menu.addItem((item) => {
			item.setTitle('Birth markers')
				.setChecked(this.layers.births)
				.onClick(() => {
					this.layers.births = !this.layers.births;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Death markers')
				.setChecked(this.layers.deaths)
				.onClick(() => {
					this.layers.deaths = !this.layers.deaths;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Marriage markers')
				.setChecked(this.layers.marriages)
				.onClick(() => {
					this.layers.marriages = !this.layers.marriages;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Burial markers')
				.setChecked(this.layers.burials)
				.onClick(() => {
					this.layers.burials = !this.layers.burials;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addSeparator();

		// Additional life events section
		menu.addItem((item) => {
			item.setTitle('Residence markers')
				.setChecked(this.layers.residences)
				.onClick(() => {
					this.layers.residences = !this.layers.residences;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Occupation markers')
				.setChecked(this.layers.occupations)
				.onClick(() => {
					this.layers.occupations = !this.layers.occupations;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Education markers')
				.setChecked(this.layers.educations)
				.onClick(() => {
					this.layers.educations = !this.layers.educations;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Military markers')
				.setChecked(this.layers.military)
				.onClick(() => {
					this.layers.military = !this.layers.military;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Immigration markers')
				.setChecked(this.layers.immigrations)
				.onClick(() => {
					this.layers.immigrations = !this.layers.immigrations;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Religious markers')
				.setChecked(this.layers.religious)
				.onClick(() => {
					this.layers.religious = !this.layers.religious;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Custom markers')
				.setChecked(this.layers.custom)
				.onClick(() => {
					this.layers.custom = !this.layers.custom;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addSeparator();

		// Other layers section
		menu.addItem((item) => {
			item.setTitle('Migration paths (birth → death)')
				.setChecked(this.layers.paths)
				.onClick(() => {
					this.layers.paths = !this.layers.paths;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Journey paths (all events)')
				.setChecked(this.layers.journeys)
				.onClick(() => {
					this.layers.journeys = !this.layers.journeys;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('All places')
				.setChecked(this.layers.places)
				.onClick(() => {
					this.layers.places = !this.layers.places;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Child maps')
				.setChecked(this.layers.childMaps)
				.onClick(() => {
					this.layers.childMaps = !this.layers.childMaps;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle('Heat map')
				.setChecked(this.layers.heatMap)
				.onClick(() => {
					this.layers.heatMap = !this.layers.heatMap;
					this.mapController?.setLayerVisibility(this.layers);
				});
		});

		// Heat map intensity options
		if (this.layers.heatMap) {
			const currentIntensity = this.plugin.settings.heatMapIntensity || 'medium';
			for (const level of ['low', 'medium', 'high'] as const) {
				menu.addItem((item) => {
					item.setTitle(`  ${level.charAt(0).toUpperCase() + level.slice(1)} intensity`)
						.setChecked(currentIntensity === level)
						.onClick(async () => {
							this.plugin.settings.heatMapIntensity = level;
							await this.plugin.saveSettings();
							this.mapController?.updateSettings({ heatMapIntensity: level });
							void this.refreshData();
						});
				});
			}
		}

		menu.showAtMouseEvent(e);
	}

	/**
	 * Show export menu
	 */
	private showExportMenu(e: MouseEvent): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle('Export as GeoJSON overlay')
				.setIcon('file-json')
				.onClick(() => void this.exportGeoJSON());
		});

		menu.addItem((item) => {
			item.setTitle('Export as SVG overlay')
				.setIcon('image')
				.onClick(() => void this.exportSVG());
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Show compare menu for splitting the view
	 */
	private showCompareMenu(e: MouseEvent): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle('Split horizontally')
				.setIcon('separator-horizontal')
				.onClick(() => this.splitView('horizontal'));
		});

		menu.addItem((item) => {
			item.setTitle('Split vertically')
				.setIcon('separator-vertical')
				.onClick(() => this.splitView('vertical'));
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle('Open in new tab')
				.setIcon('tab')
				.onClick(() => this.openNewMapTab());
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Handle right-click context menu on the map
	 * Allows creating a new place at the clicked location
	 */
	private handleMapContextMenu(e: MouseEvent): void {
		// Don't show context menu if clicking on a marker or popup
		const target = e.target as HTMLElement;
		if (target.closest('.leaflet-marker-icon') ||
			target.closest('.leaflet-popup') ||
			target.closest('.leaflet-control')) {
			return;
		}

		// Get coordinates from click location
		const coords = this.mapController?.mouseEventToCoordinates(e);
		if (!coords) return;

		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle('Create place here')
				.setIcon('map-pin')
				.onClick(() => {
					this.createPlaceAtCoordinates(coords);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Link existing place here')
				.setIcon('link')
				.onClick(() => {
					this.linkExistingPlaceToCoordinates(coords);
				});
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Open CreatePlaceModal with prefilled coordinates from map click
	 */
	private createPlaceAtCoordinates(coords: { lat: number; lng: number; pixelX?: number; pixelY?: number }): void {
		// Get universe from the current map (null for real world)
		// Resolve cr_id to display name since entity notes store by name
		const rawUniverse = this.mapController?.getActiveMapUniverse() ?? null;
		const universe = this.resolveUniverseFilterValue(rawUniverse) ?? undefined;
		const isPixelMap = coords.pixelX !== undefined && coords.pixelY !== undefined;
		// Get current map ID for auto-populating maps field (#153)
		const currentMapId = this.mapController?.getActiveMapId();

		// Get services from plugin
		const pluginWithServices = this.plugin as unknown as {
			createFamilyGraphService: () => unknown;
			createPlaceGraphService: () => unknown;
		};

		const modal = new CreatePlaceModal(this.app, {
			directory: this.plugin.settings.placesFolder || '',
			initialUniverse: universe,
			familyGraph: pluginWithServices.createFamilyGraphService() as import('../core/family-graph').FamilyGraphService,
			placeGraph: pluginWithServices.createPlaceGraphService() as import('../core/place-graph').PlaceGraphService,
			settings: this.plugin.settings,
			plugin: this.plugin,
			prefilledCoordinates: {
				lat: coords.lat,
				lng: coords.lng,
				pixelX: coords.pixelX,
				pixelY: coords.pixelY,
				isPixelMap
			},
			// Pass current map ID for auto-populating maps field (#153)
			currentMapId: isPixelMap ? currentMapId : undefined,
			onCreated: () => {
				// Refresh the map to show the new place marker
				void this.refreshData(true);
			}
		});

		modal.open();
	}

	/**
	 * Open PlacePickerModal to select an existing place and update its coordinates
	 */
	private linkExistingPlaceToCoordinates(coords: { lat: number; lng: number; pixelX?: number; pixelY?: number }): void {
		const placeGraph = this.plugin.createPlaceGraphService();

		const isPixelMap = coords.pixelX !== undefined && coords.pixelY !== undefined;

		const picker = new PlacePickerModal(
			this.app,
			(selectedPlace: SelectedPlaceInfo) => {
				void (async () => {
					// Check universe sync before updating coordinates
					const shouldProceed = await this.handleUniverseSync(selectedPlace);
					if (!shouldProceed) {
						return; // User cancelled
					}

					// Update the place's coordinates
					const geocodingService = new GeocodingService(this.app);

					try {
						if (isPixelMap) {
							// For pixel maps, update custom_coordinates instead
							await this.app.fileManager.processFrontMatter(selectedPlace.file, (frontmatter) => {
								frontmatter.custom_coordinates_x = coords.pixelX;
								frontmatter.custom_coordinates_y = coords.pixelY;
							});
						} else {
							// For geographic maps, update lat/long
							await geocodingService.updatePlaceCoordinates(selectedPlace.file, {
								lat: coords.lat,
								long: coords.lng
							});
						}

						new Notice(`Updated coordinates for "${selectedPlace.name}"`);

						// Refresh the map to show the updated marker
						void this.refreshData(true);
					} catch (error) {
						logger.error('link-place-failed', `Failed to update coordinates: ${error}`);
						new Notice(`Failed to update coordinates: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				})();
			},
			{
				placeGraph,
				settings: this.plugin.settings,
				plugin: this.plugin
			}
		);

		picker.open();
	}

	/**
	 * Handle universe sync when linking an existing place to a map.
	 * See docs/planning/map-place-universe-sync.md for design details.
	 *
	 * @returns true if the operation should proceed, false if cancelled
	 */

	/**
	 * Resolve a universe filter value to its display name.
	 * Map configs may store the universe cr_id, but entity notes store the name.
	 * This looks up the universe note by cr_id and returns the name for filtering.
	 */
	/**
	 * Update the breadcrumb navigation based on the active map's parent hierarchy (#361)
	 */
	private updateBreadcrumb(mapId: string): void {
		if (!this.breadcrumbEl) return;
		this.breadcrumbEl.empty();

		if (mapId === 'openstreetmap') {
			this.breadcrumbEl.hide();
			return;
		}

		const parentMapId = this.mapController?.getParentMapId(mapId);
		if (!parentMapId) {
			this.breadcrumbEl.hide();
			return;
		}

		const parentConfig = this.mapController?.getMapConfig(parentMapId);
		if (!parentConfig) {
			this.breadcrumbEl.hide();
			return;
		}

		this.breadcrumbEl.show();

		// Parent map link
		const parentLink = this.breadcrumbEl.createEl('a', {
			cls: 'cr-map-breadcrumb__link',
			text: parentConfig.name
		});
		parentLink.addEventListener('click', (e) => {
			e.preventDefault();
			void this.mapController?.setActiveMap(parentMapId);
		});

		// Separator
		this.breadcrumbEl.createSpan({ cls: 'cr-map-breadcrumb__separator', text: ' → ' });

		// Current map (not a link)
		const currentConfig = this.mapController?.getMapConfig(mapId);
		this.breadcrumbEl.createSpan({
			cls: 'cr-map-breadcrumb__current',
			text: currentConfig?.name || mapId
		});
	}

	private resolveUniverseFilterValue(universe: string | null): string | null {
		if (!universe) return null;

		// Check if this is already a name (not a cr_id pattern)
		// Universe cr_ids typically contain hyphens and random chars like "universe-the-dying-earth-mnkte9t5"
		// Try to find a universe note with this cr_id
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;
			const crType = fm.cr_type || fm.type;
			if (crType === 'universe' && fm.cr_id === universe) {
				return fm.name || universe;
			}
		}

		// Not found as cr_id, assume it's already a name
		return universe;
	}

	private async handleUniverseSync(selectedPlace: SelectedPlaceInfo): Promise<boolean> {
		// Get the map's universe (null for OpenStreetMap)
		// Resolve cr_id to display name since entity notes store by name
		const rawMapUniverse = this.mapController?.getActiveMapUniverse();
		const mapUniverse = this.resolveUniverseFilterValue(rawMapUniverse ?? null);

		// Skip universe sync if map has no universe (OpenStreetMap/real world)
		if (!mapUniverse) {
			return true;
		}

		// Get the place's category and universe from frontmatter
		const cache = this.app.metadataCache.getFileCache(selectedPlace.file);
		const placeCategory = (cache?.frontmatter?.place_category || 'real') as PlaceCategory;
		const placeUniverse = cache?.frontmatter?.universe;

		// Skip universe sync for real-world places
		// Real places exist independently of fictional universes
		if (placeCategory === 'real') {
			return true;
		}

		// Check if place category supports universe assignment
		// UNIVERSE_CATEGORIES includes: fictional, mythological, legendary
		// We also include 'historical' for alternate history scenarios
		const supportsUniverse = UNIVERSE_CATEGORIES.includes(placeCategory) || placeCategory === 'historical';
		if (!supportsUniverse) {
			return true;
		}

		// Normalize place universe to array for comparison
		const placeUniverses: string[] = Array.isArray(placeUniverse)
			? placeUniverse
			: placeUniverse ? [placeUniverse] : [];

		// Case 1: Place has no universe - silently add map's universe
		if (placeUniverses.length === 0) {
			try {
				await this.app.fileManager.processFrontMatter(selectedPlace.file, (frontmatter) => {
					frontmatter.universe = mapUniverse;
				});
			} catch (error) {
				logger.error('universe-sync', `Failed to update frontmatter: ${error}`);
				new Notice(`Failed to add universe: ${error instanceof Error ? error.message : 'Unknown error'}`);
				return true; // Still proceed with linking
			}
			new Notice(`Added "${selectedPlace.name}" to universe "${mapUniverse}"`);
			return true;
		}

		// Case 2: Place already has the map's universe - no action needed
		if (placeUniverses.includes(mapUniverse)) {
			return true;
		}

		// Case 3: Place has a different universe - show confirmation dialog
		const modal = new UniverseSyncModal(this.app, {
			placeName: selectedPlace.name,
			placeUniverses,
			mapUniverse
		});

		const result = await modal.prompt();

		switch (result.action) {
			case 'add':
				// Append the map's universe to the place's universe list
				await this.app.fileManager.processFrontMatter(selectedPlace.file, (frontmatter) => {
					const currentUniverses = Array.isArray(frontmatter.universe)
						? frontmatter.universe
						: frontmatter.universe ? [frontmatter.universe] : [];
					frontmatter.universe = [...currentUniverses, mapUniverse];
				});
				new Notice(`Added universe "${mapUniverse}" to "${selectedPlace.name}"`);
				return true;

			case 'replace':
				// Replace with the map's universe
				await this.app.fileManager.processFrontMatter(selectedPlace.file, (frontmatter) => {
					frontmatter.universe = mapUniverse;
				});
				new Notice(`Replaced universe for "${selectedPlace.name}" with "${mapUniverse}"`);
				return true;

			case 'cancel':
			default:
				return false;
		}
	}

	/**
	 * Show context menu for a place marker (right-click)
	 */
	private showPlaceMarkerContextMenu(placeId: string, placeName: string, event: MouseEvent): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle('Edit place')
				.setIcon('pencil')
				.onClick(() => {
					void this.editPlace(placeId);
				});
		});

		menu.addItem((item) => {
			item.setTitle('Open note')
				.setIcon('file-text')
				.onClick(() => {
					void this.openPlaceNote(placeId);
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle('Copy coordinates')
				.setIcon('copy')
				.onClick(() => {
					void this.copyPlaceCoordinates(placeId);
				});
		});

		menu.showAtMouseEvent(event);
	}

	/**
	 * Open a place note for editing in CreatePlaceModal
	 */
	private editPlace(placeId: string): void {
		// Get services from plugin
		const pluginWithServices = this.plugin as unknown as {
			createFamilyGraphService: () => unknown;
			createPlaceGraphService: () => import('../core/place-graph').PlaceGraphService;
		};

		const placeGraph = pluginWithServices.createPlaceGraphService();
		placeGraph.reloadCache();

		const place = placeGraph.getPlaceByCrId(placeId);
		if (!place) {
			new Notice(`Place not found: ${placeId}`);
			return;
		}

		// Find the file for this place
		const file = this.app.vault.getMarkdownFiles().find(f => {
			const cache = this.app.metadataCache.getFileCache(f);
			return cache?.frontmatter?.cr_id === placeId;
		});

		if (!file) {
			new Notice(`Place file not found for: ${place.name}`);
			return;
		}

		const modal = new CreatePlaceModal(this.app, {
			editPlace: place,
			editFile: file,
			familyGraph: pluginWithServices.createFamilyGraphService() as import('../core/family-graph').FamilyGraphService,
			placeGraph,
			settings: this.plugin.settings,
			plugin: this.plugin,
			onUpdated: () => {
				void this.refreshData(true);
			}
		});

		modal.open();
	}

	/**
	 * Open a place note in the editor
	 */
	private async openPlaceNote(placeId: string): Promise<void> {
		const file = this.app.vault.getMarkdownFiles().find(f => {
			const cache = this.app.metadataCache.getFileCache(f);
			return cache?.frontmatter?.cr_id === placeId;
		});

		if (file) {
			await this.app.workspace.openLinkText(file.path, '', false);
		} else {
			new Notice(`Place file not found: ${placeId}`);
		}
	}

	/**
	 * Handle place marker being dragged to a new position
	 * Updates frontmatter and provides undo support
	 */
	private async handlePlaceMarkerDragged(
		placeId: string,
		placeName: string,
		newCoords: { lat: number; lng: number; pixelX?: number; pixelY?: number }
	): Promise<void> {
		// Find the file for this place
		const file = this.app.vault.getMarkdownFiles().find(f => {
			const cache = this.app.metadataCache.getFileCache(f);
			return cache?.frontmatter?.cr_id === placeId;
		});

		if (!file) {
			new Notice(`Place file not found: ${placeName}`);
			return;
		}

		// Get current coordinates for undo
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		const isPixelMap = newCoords.pixelX !== undefined && newCoords.pixelY !== undefined;

		// Store previous coordinates for undo
		let previousCoords: { lat?: number; lng?: number; pixelX?: number; pixelY?: number };
		if (isPixelMap) {
			previousCoords = {
				pixelX: fm?.custom_coordinates_x ?? fm?.pixel_x,
				pixelY: fm?.custom_coordinates_y ?? fm?.pixel_y
			};
		} else {
			// Geographic coordinates - check nested and flat formats
			if (fm?.coordinates && typeof fm.coordinates === 'object') {
				const coords = fm.coordinates as { lat?: number; long?: number; lng?: number };
				previousCoords = {
					lat: coords.lat,
					lng: coords.long ?? coords.lng
				};
			} else {
				previousCoords = {
					lat: fm?.coordinates_lat ?? fm?.latitude,
					lng: fm?.coordinates_long ?? fm?.longitude
				};
			}
		}

		// Update frontmatter
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				if (isPixelMap) {
					// Update pixel coordinates
					// Use custom_coordinates_x/y if they exist, otherwise pixel_x/y
					if (frontmatter.custom_coordinates_x !== undefined || frontmatter.custom_coordinates_y !== undefined) {
						frontmatter.custom_coordinates_x = newCoords.pixelX;
						frontmatter.custom_coordinates_y = newCoords.pixelY;
					} else {
						frontmatter.pixel_x = newCoords.pixelX;
						frontmatter.pixel_y = newCoords.pixelY;
					}
				} else {
					// Update geographic coordinates
					// Check what format exists and use that
					if (frontmatter.coordinates && typeof frontmatter.coordinates === 'object') {
						// Nested format: coordinates: { lat, long }
						frontmatter.coordinates.lat = parseFloat(newCoords.lat.toFixed(6));
						frontmatter.coordinates.long = parseFloat(newCoords.lng.toFixed(6));
					} else if (frontmatter.coordinates_lat !== undefined || frontmatter.coordinates_long !== undefined) {
						// Flat format: coordinates_lat, coordinates_long
						frontmatter.coordinates_lat = parseFloat(newCoords.lat.toFixed(6));
						frontmatter.coordinates_long = parseFloat(newCoords.lng.toFixed(6));
					} else {
						// Legacy format: latitude, longitude
						frontmatter.latitude = parseFloat(newCoords.lat.toFixed(6));
						frontmatter.longitude = parseFloat(newCoords.lng.toFixed(6));
					}
				}
			});

			// Format coordinates for display
			let coordText: string;
			if (isPixelMap) {
				coordText = `(${newCoords.pixelX}, ${newCoords.pixelY})`;
			} else {
				const latDir = newCoords.lat >= 0 ? 'N' : 'S';
				const lngDir = newCoords.lng >= 0 ? 'E' : 'W';
				coordText = `(${Math.abs(newCoords.lat).toFixed(4)}°${latDir}, ${Math.abs(newCoords.lng).toFixed(4)}°${lngDir})`;
			}

			// Show toast with undo option
			const fragment = document.createDocumentFragment();
			fragment.appendText(`Moved "${placeName}" to ${coordText} `);

			const undoLink = document.createElement('a');
			undoLink.textContent = 'Undo';
			undoLink.href = '#';
			undoLink.addClass('crc-undo-link');
			undoLink.addEventListener('click', (e) => {
				e.preventDefault();
				void this.undoPlaceMove(file, previousCoords, isPixelMap, placeName);
			});
			fragment.appendChild(undoLink);

			new Notice(fragment, 8000);
		} catch (error) {
			logger.error('drag-update-error', `Failed to update coordinates for ${placeName}`, { error });
			new Notice(`Failed to update coordinates for ${placeName}`);
			// Refresh map to restore marker to original position
			void this.refreshData(true);
		}
	}

	/**
	 * Undo a place marker move by restoring previous coordinates
	 */
	private async undoPlaceMove(
		file: TFile,
		previousCoords: { lat?: number; lng?: number; pixelX?: number; pixelY?: number },
		isPixelMap: boolean,
		placeName: string
	): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				if (isPixelMap) {
					// Restore pixel coordinates
					if (frontmatter.custom_coordinates_x !== undefined || frontmatter.custom_coordinates_y !== undefined) {
						frontmatter.custom_coordinates_x = previousCoords.pixelX;
						frontmatter.custom_coordinates_y = previousCoords.pixelY;
					} else {
						frontmatter.pixel_x = previousCoords.pixelX;
						frontmatter.pixel_y = previousCoords.pixelY;
					}
				} else {
					// Restore geographic coordinates
					if (frontmatter.coordinates && typeof frontmatter.coordinates === 'object') {
						frontmatter.coordinates.lat = previousCoords.lat;
						frontmatter.coordinates.long = previousCoords.lng;
					} else if (frontmatter.coordinates_lat !== undefined || frontmatter.coordinates_long !== undefined) {
						frontmatter.coordinates_lat = previousCoords.lat;
						frontmatter.coordinates_long = previousCoords.lng;
					} else {
						frontmatter.latitude = previousCoords.lat;
						frontmatter.longitude = previousCoords.lng;
					}
				}
			});

			new Notice(`Restored "${placeName}" to original position`);
			// Refresh map to show restored position
			void this.refreshData(true);
		} catch (error) {
			logger.error('undo-error', `Failed to undo move for ${placeName}`, { error });
			new Notice(`Failed to undo move for ${placeName}`);
		}
	}

	/**
	 * Copy place coordinates to clipboard
	 */
	private async copyPlaceCoordinates(placeId: string): Promise<void> {
		const pluginWithServices = this.plugin as unknown as {
			createPlaceGraphService: () => import('../core/place-graph').PlaceGraphService;
		};

		const placeGraph = pluginWithServices.createPlaceGraphService();
		placeGraph.reloadCache();

		const place = placeGraph.getPlaceByCrId(placeId);
		if (!place) {
			new Notice(`Place not found: ${placeId}`);
			return;
		}

		let coordText = '';
		if (place.coordinates) {
			coordText = `${place.coordinates.lat}, ${place.coordinates.long}`;
		} else if (place.customCoordinates) {
			coordText = `${place.customCoordinates.x}, ${place.customCoordinates.y}`;
		} else {
			new Notice('No coordinates found for this place');
			return;
		}

		await navigator.clipboard.writeText(coordText);
		new Notice(`Coordinates copied: ${coordText}`);
	}

	/**
	 * Split this view to create a side-by-side comparison
	 */
	private splitView(direction: 'horizontal' | 'vertical'): void {
		const pluginInstance = this.plugin as unknown as {
			activateMapView: (mapId?: string, forceNew?: boolean, splitDirection?: 'horizontal' | 'vertical') => Promise<void>
		};
		void pluginInstance.activateMapView(undefined, true, direction);
	}

	/**
	 * Open a new map view in a new tab
	 */
	private openNewMapTab(): void {
		const pluginInstance = this.plugin as unknown as {
			activateMapView: (mapId?: string, forceNew?: boolean) => Promise<void>
		};
		void pluginInstance.activateMapView(undefined, true);
	}

	// =========================================================================
	// Time Slider Methods
	// =========================================================================

	/**
	 * Build the time slider panel
	 */
	private buildTimeSlider(): void {
		if (!this.timeSliderContainerEl) return;
		this.timeSliderContainerEl.empty();

		// Year display
		const yearDisplay = this.timeSliderContainerEl.createDiv({ cls: 'cr-map-time-year' });
		yearDisplay.createSpan({ cls: 'cr-map-time-year-value', text: String(this.timeSlider.currentYear) });
		yearDisplay.createSpan({ cls: 'cr-map-time-year-label', text: '' });

		// Slider row
		const sliderRow = this.timeSliderContainerEl.createDiv({ cls: 'cr-map-time-slider-row' });

		// Min year label
		sliderRow.createSpan({ cls: 'cr-map-time-label', text: '1800' });

		// Slider input
		const slider = sliderRow.createEl('input', {
			cls: 'cr-map-time-slider',
			attr: {
				type: 'range',
				min: '1800',
				max: '2000',
				value: String(this.timeSlider.currentYear),
				'aria-label': 'Select year'
			}
		});

		// Max year label
		sliderRow.createSpan({ cls: 'cr-map-time-label', text: '2000' });

		// Update slider on change
		slider.addEventListener('input', () => {
			this.timeSlider.currentYear = parseInt(slider.value);
			this.updateTimeSliderDisplay();
			this.applyTimeFilter();
		});

		// Controls row
		const controlsRow = this.timeSliderContainerEl.createDiv({ cls: 'cr-map-time-controls' });

		// Play/Pause button
		const playBtn = controlsRow.createEl('button', {
			cls: 'cr-map-btn cr-map-time-play',
			attr: { 'aria-label': 'Play animation' }
		});
		playBtn.createSpan({ text: '▶' });
		playBtn.addEventListener('click', () => this.toggleAnimation());

		// Speed selector
		controlsRow.createSpan({ cls: 'cr-map-time-speed-label', text: 'Speed:' });
		const speedSelect = controlsRow.createEl('select', {
			cls: 'cr-map-select cr-map-time-speed',
			attr: { 'aria-label': 'Animation speed' }
		});
		speedSelect.createEl('option', { value: '1000', text: 'Slow' });
		speedSelect.createEl('option', { value: '500', text: 'Normal', attr: { selected: 'selected' } });
		speedSelect.createEl('option', { value: '200', text: 'Fast' });
		speedSelect.createEl('option', { value: '50', text: 'Very fast' });
		speedSelect.value = String(this.timeSlider.speed);
		speedSelect.addEventListener('change', () => {
			this.timeSlider.speed = parseInt(speedSelect.value);
			if (this.timeSlider.isPlaying) {
				// Restart animation with new speed
				this.stopAnimation();
				this.startAnimation();
			}
		});

		// Mode toggle (snapshot vs cumulative)
		controlsRow.createSpan({ cls: 'cr-map-time-mode-label', text: 'Mode:' });
		const modeSelect = controlsRow.createEl('select', {
			cls: 'cr-map-select cr-map-time-mode',
			attr: { 'aria-label': 'Display mode' }
		});
		modeSelect.createEl('option', { value: 'snapshot', text: 'Alive in year' });
		modeSelect.createEl('option', { value: 'cumulative', text: 'Born by year' });
		modeSelect.value = this.timeSlider.snapshotMode ? 'snapshot' : 'cumulative';
		modeSelect.addEventListener('change', () => {
			this.timeSlider.snapshotMode = modeSelect.value === 'snapshot';
			this.applyTimeFilter();
		});

		// Alive count display
		controlsRow.createSpan({ cls: 'cr-map-time-count', text: '' });
	}

	/**
	 * Toggle time slider visibility
	 */
	// ============================================================================
	// Journey Mode
	// ============================================================================

	/**
	 * Enter journey mode for a specific person (called externally from context menu / profile view)
	 */
	enterJourneyModeForPerson(personId: string, personName: string): void {
		this.journeyMode.enabled = true;
		this.journeyMode.personId = personId;
		this.journeyMode.personName = personName;
		this.journeyMode.currentStep = 0;

		// Highlight the journey button
		const journeyBtn = this.toolbarEl?.querySelector('[aria-label="Journey mode"]') as HTMLButtonElement;
		if (journeyBtn) journeyBtn.classList.add('cr-map-btn-active');

		this.showJourneyPersonIndicator(personName);

		// Enable journeys layer
		if (!this.layers.journeys) {
			this.layers.journeys = true;
			this.mapController?.setLayerVisibility(this.layers);
		}

		// Apply filter after data loads (may need a short delay for initial render)
		setTimeout(() => this.applyJourneyFilter(), 300);
	}

	/**
	 * Toggle journey mode on/off. Opens person picker when enabling.
	 */
	private toggleJourneyMode(btn: HTMLButtonElement): void {
		if (this.journeyMode.enabled) {
			this.exitJourneyMode(btn);
		} else {
			this.enterJourneyMode(btn);
		}
	}

	/**
	 * Enter journey mode — open person picker to select a person
	 */
	private enterJourneyMode(btn: HTMLButtonElement): void {
		// Disable time slider if active
		if (this.timeSlider.enabled) {
			this.timeSlider.enabled = false;
			if (this.timeSliderContainerEl) {
				this.timeSliderContainerEl.addClass('cr-hidden');
			}
		}

		const { PersonPickerModal } = require('../ui/person-picker');
		const picker = new PersonPickerModal(this.app, (person: { name: string; crId: string }) => {
			this.journeyMode.enabled = true;
			this.journeyMode.personId = person.crId;
			this.journeyMode.personName = person.name;
			this.journeyMode.currentStep = 0;

			btn.classList.add('cr-map-btn-active');

			// Show person indicator in toolbar
			this.showJourneyPersonIndicator(person.name);

			// Filter map to this person
			this.applyJourneyFilter();

			// Enable journeys layer if not already
			if (!this.layers.journeys) {
				this.layers.journeys = true;
				this.mapController?.setLayerVisibility(this.layers);
			}
		});
		picker.open();
	}

	/**
	 * Exit journey mode — restore full map view
	 */
	private exitJourneyMode(btn: HTMLButtonElement): void {
		this.journeyMode.enabled = false;
		this.journeyMode.personId = null;
		this.journeyMode.personName = null;
		this.journeyMode.currentStep = 0;
		this.journeyMode.familyOverlay = false;

		btn.classList.remove('cr-map-btn-active');

		// Remove person indicator
		if (this.journeyPickerEl) {
			this.journeyPickerEl.remove();
			this.journeyPickerEl = null;
		}

		// Remove playback controls
		if (this.journeyControlsEl) {
			this.journeyControlsEl.remove();
			this.journeyControlsEl = null;
		}

		// Remove family overlay toggle
		if (this.familyToggleEl) {
			this.familyToggleEl.remove();
			this.familyToggleEl = null;
		}

		// Stop playback
		if (this.journeyPlaybackInterval) {
			window.clearInterval(this.journeyPlaybackInterval);
			this.journeyPlaybackInterval = null;
		}

		// Restore full data
		void this.refreshData();
	}

	/**
	 * Show the selected person's name in the toolbar
	 */
	private showJourneyPersonIndicator(name: string): void {
		if (this.journeyPickerEl) {
			this.journeyPickerEl.remove();
		}

		if (!this.toolbarEl) return;

		const centerSection = this.toolbarEl.querySelector('.cr-map-toolbar-center');
		if (!centerSection) return;

		this.journeyPickerEl = centerSection.createDiv({ cls: 'cr-map-journey-person' });

		const icon = this.journeyPickerEl.createSpan({ cls: 'cr-map-journey-person__icon' });
		setIcon(icon, 'user');

		this.journeyPickerEl.createSpan({
			cls: 'cr-map-journey-person__name',
			text: name
		});

		const clearBtn = this.journeyPickerEl.createSpan({
			cls: 'cr-map-journey-person__clear',
			text: '\u00D7'
		});
		clearBtn.addEventListener('click', () => {
			const journeyBtn = this.toolbarEl?.querySelector('[aria-label="Journey mode"]') as HTMLButtonElement;
			if (journeyBtn) this.exitJourneyMode(journeyBtn);
		});
	}

	/**
	 * Filter the map to show only the selected person's markers and journey path
	 */
	private applyJourneyFilter(): void {
		if (!this.currentMapData || !this.journeyMode.personId) return;

		const personId = this.journeyMode.personId;

		// Filter markers to this person only
		const filteredMarkers = this.currentMapData.markers.filter(m =>
			m.personId === personId
		);

		// Filter journey paths to this person only
		const filteredJourneys = this.currentMapData.journeyPaths?.filter(j =>
			j.personId === personId
		) || [];

		// Filter migration paths to this person only
		const filteredPaths = this.currentMapData.paths.filter(p =>
			p.personId === personId
		);

		// Add family overlay paths if enabled
		if (this.journeyMode.familyOverlay) {
			const familyJourneys = this.buildFamilyJourneyPaths();
			filteredJourneys.push(...familyJourneys);
		}

		this.mapController?.setFilteredData(filteredMarkers, filteredPaths, filteredJourneys);

		// Build playback controls when the selected person has a buildable
		// journey path; otherwise surface an inline placeholder explaining
		// why the panel can't render (#445). buildJourneyPaths only includes
		// a person in journeyPaths when they have ≥ 2 unique waypoints with
		// resolvable coordinates, so an empty `filteredJourneys` is the
		// signal to show the placeholder.
		const primaryJourney = filteredJourneys.find(j => j.personId === personId);
		if (primaryJourney && primaryJourney.waypoints.length > 1) {
			this.buildJourneyPlaybackControls(primaryJourney);
		} else {
			this.buildJourneyEmptyPlaceholder(this.journeyMode.personName ?? '');
		}

		// Fit bounds to this person's markers
		if (filteredMarkers.length > 0 && this.mapController?.['map']) {
			const lats = filteredMarkers.map(m => m.lat).filter((l): l is number => l !== undefined);
			const lngs = filteredMarkers.map(m => m.lng).filter((l): l is number => l !== undefined);
			if (lats.length > 0 && lngs.length > 0) {
				const L = require('leaflet');
				const bounds = L.latLngBounds(
					L.latLng(Math.min(...lats), Math.min(...lngs)),
					L.latLng(Math.max(...lats), Math.max(...lngs))
				);
				this.mapController['map'].fitBounds(bounds, { padding: [50, 50] });
			}
		}

		// Show or hide family overlay toggle
		this.updateFamilyOverlayToggle();
	}

	/**
	 * Build playback controls for stepping through journey waypoints
	 */
	private buildJourneyPlaybackControls(journey: JourneyPath): void {
		if (this.journeyControlsEl) {
			this.journeyControlsEl.remove();
		}

		const container = this.containerEl.querySelector('.cr-map-container') || this.containerEl;
		this.journeyControlsEl = container.createDiv({ cls: 'cr-map-journey-controls' });

		const waypoints = journey.waypoints;

		// Previous button
		const prevBtn = this.journeyControlsEl.createEl('button', {
			cls: 'cr-map-journey-btn',
			attr: { 'aria-label': 'Previous waypoint' }
		});
		setIcon(prevBtn, 'skip-back');
		prevBtn.addEventListener('click', () => this.journeyStep(-1, waypoints, journey));

		// Play/Pause button
		const playBtn = this.journeyControlsEl.createEl('button', {
			cls: 'cr-map-journey-btn cr-map-journey-btn--play',
			attr: { 'aria-label': 'Play' }
		});
		setIcon(playBtn, 'play');
		playBtn.addEventListener('click', () => this.toggleJourneyPlayback(playBtn, waypoints, journey));

		// Next button
		const nextBtn = this.journeyControlsEl.createEl('button', {
			cls: 'cr-map-journey-btn',
			attr: { 'aria-label': 'Next waypoint' }
		});
		setIcon(nextBtn, 'skip-forward');
		nextBtn.addEventListener('click', () => this.journeyStep(1, waypoints, journey));

		// Progress section
		const progressEl = this.journeyControlsEl.createDiv({ cls: 'cr-map-journey-progress' });

		const progressBar = progressEl.createDiv({ cls: 'cr-map-journey-progress-bar' });
		const progressFill = progressBar.createDiv({ cls: 'cr-map-journey-progress-fill' });
		progressFill.dataset.id = 'journey-progress-fill';

		const labelEl = progressEl.createDiv({ cls: 'cr-map-journey-label' });
		labelEl.dataset.id = 'journey-label';

		// Counter
		const counterEl = this.journeyControlsEl.createSpan({ cls: 'cr-map-journey-counter' });
		counterEl.dataset.id = 'journey-counter';

		// Speed selector
		const speedBtn = this.journeyControlsEl.createEl('button', {
			cls: 'cr-map-journey-speed',
			text: '1x'
		});
		speedBtn.addEventListener('click', () => {
			const speeds = [500, 1000, 2000, 3000, 5000];
			const labels = ['0.25x', '0.5x', '1x', '1.5x', '2.5x'];
			const currentIdx = speeds.indexOf(this.journeyMode.speed);
			const nextIdx = (currentIdx + 1) % speeds.length;
			this.journeyMode.speed = speeds[nextIdx];
			speedBtn.textContent = labels[nextIdx];
		});

		// Show initial state
		this.updateJourneyDisplay(waypoints);
		this.panToWaypoint(waypoints[0], waypoints, journey);
	}

	/**
	 * Render a placeholder where the playback panel would normally appear
	 * when the selected person has fewer than 2 unique resolvable waypoints
	 * (#445). Reuses `journeyControlsEl` so existing teardown in
	 * `exitJourneyMode` and `buildJourneyPlaybackControls` removes it cleanly.
	 */
	private buildJourneyEmptyPlaceholder(personName: string): void {
		if (this.journeyControlsEl) {
			this.journeyControlsEl.remove();
		}

		const container = this.containerEl.querySelector('.cr-map-container') || this.containerEl;
		this.journeyControlsEl = container.createDiv({
			cls: 'cr-map-journey-controls cr-map-journey-controls--empty'
		});

		const subject = personName ? `${personName} needs` : 'This person needs';
		this.journeyControlsEl.createDiv({
			cls: 'cr-map-journey-empty-message',
			text: `${subject} at least 2 places with valid coordinates to build a journey path.`
		});
	}

	/**
	 * Step forward or backward through journey waypoints
	 */
	private journeyStep(direction: number, waypoints: JourneyWaypoint[], journey?: JourneyPath): void {
		const newStep = this.journeyMode.currentStep + direction;
		if (newStep < 0 || newStep >= waypoints.length) return;

		this.journeyMode.currentStep = newStep;
		this.updateJourneyDisplay(waypoints);
		this.panToWaypoint(waypoints[newStep], waypoints, journey);
	}

	/**
	 * Toggle play/pause for journey animation
	 */
	private toggleJourneyPlayback(btn: HTMLButtonElement, waypoints: JourneyWaypoint[], journey?: JourneyPath): void {
		if (this.journeyMode.isPlaying) {
			// Pause
			this.journeyMode.isPlaying = false;
			if (this.journeyPlaybackInterval) {
				window.clearInterval(this.journeyPlaybackInterval);
				this.journeyPlaybackInterval = null;
			}
			setIcon(btn, 'play');
		} else {
			// Play
			this.journeyMode.isPlaying = true;
			setIcon(btn, 'pause');

			this.journeyPlaybackInterval = window.setInterval(() => {
				const nextStep = this.journeyMode.currentStep + 1;
				if (nextStep >= waypoints.length) {
					// Loop back to start
					this.journeyMode.currentStep = 0;
				} else {
					this.journeyMode.currentStep = nextStep;
				}
				this.updateJourneyDisplay(waypoints);
				this.panToWaypoint(waypoints[this.journeyMode.currentStep], waypoints, journey);
			}, this.journeyMode.speed);
		}
	}

	/**
	 * Update the playback controls display for the current step
	 */
	private updateJourneyDisplay(waypoints: JourneyWaypoint[]): void {
		if (!this.journeyControlsEl) return;

		const step = this.journeyMode.currentStep;
		const total = waypoints.length;
		const waypoint = waypoints[step];

		// Progress bar
		const fill = this.journeyControlsEl.querySelector('[data-id="journey-progress-fill"]') as HTMLElement;
		if (fill) {
			fill.style.width = `${((step + 1) / total) * 100}%`;
		}

		// Label
		const label = this.journeyControlsEl.querySelector('[data-id="journey-label"]') as HTMLElement;
		if (label) {
			const eventType = waypoint.eventType || 'Event';
			const place = waypoint.name || '';
			label.textContent = place ? `${eventType} in ${place}` : eventType;
		}

		// Counter
		const counter = this.journeyControlsEl.querySelector('[data-id="journey-counter"]') as HTMLElement;
		if (counter) {
			counter.textContent = `${step + 1} / ${total}`;
		}
	}

	/**
	 * Pan and zoom the map to a specific waypoint
	 */
	private panToWaypoint(waypoint: JourneyWaypoint, allWaypoints?: JourneyWaypoint[], journey?: JourneyPath): void {
		if (!this.mapController?.['map']) return;

		const map = this.mapController['map'];

		// Resolve the waypoint's location to a LatLng tuple appropriate for the
		// current CRS. On `CRS.Simple` image maps, lat/lng default to 0 for
		// pixel-coord places, so a naive `[lat, lng]` flyTo lands at the
		// bottom-left corner. Use `[pixelY, pixelX]` when on pixel CRS — same
		// shape as the migration- and journey-path build paths (#474, sibling
		// fix to #448).
		const isPixelCRS = this.mapController.getCurrentCRS() === 'pixel';
		const hasPixel = waypoint.pixelX !== undefined && waypoint.pixelY !== undefined;
		const hasLatLng = waypoint.lat !== undefined && waypoint.lng !== undefined;

		let target: [number, number] | null = null;
		if (isPixelCRS && hasPixel) {
			target = [waypoint.pixelY!, waypoint.pixelX!];
		} else if (hasLatLng) {
			target = [waypoint.lat!, waypoint.lng!];
		}

		if (target) {
			map.flyTo(target, 12, { duration: 1 });

			// Close any existing popup
			map.closePopup();

			// Open rich popup after fly animation
			setTimeout(() => {
				const L = require('leaflet');
				const popupContent = this.buildRichWaypointPopup(waypoint, allWaypoints, journey);
				L.popup({ maxWidth: 300, className: 'cr-journey-rich-popup' })
					.setLatLng(target!)
					.setContent(popupContent)
					.openOn(map);
			}, 1100);
		}
	}

	/**
	 * Build rich waypoint popup content for journey mode
	 */
	private buildRichWaypointPopup(
		waypoint: JourneyWaypoint,
		allWaypoints?: JourneyWaypoint[],
		journey?: JourneyPath
	): HTMLElement {
		const container = document.createElement('div');
		container.className = 'cr-journey-rich-popup-content';

		// Header with event type
		const header = container.createDiv({ cls: 'cr-journey-rich-popup__header' });
		const eventLabel = capitalize(waypoint.eventType);
		header.createSpan({ text: eventLabel, cls: 'cr-journey-rich-popup__type' });

		if (allWaypoints) {
			const stepIndex = allWaypoints.indexOf(waypoint);
			if (stepIndex >= 0) {
				header.createSpan({
					text: `${stepIndex + 1} of ${allWaypoints.length}`,
					cls: 'cr-journey-rich-popup__step'
				});
			}
		}

		// Body rows
		const body = container.createDiv({ cls: 'cr-journey-rich-popup__body' });

		// Date
		if (waypoint.date) {
			this.addPopupRow(body, 'Date', waypoint.date);
		}

		// Place
		if (waypoint.name) {
			this.addPopupRow(body, 'Place', waypoint.name);
		}

		// Age — use DateService so fictional calendars (eras counting down, era-crossing) are handled correctly
		const dateService = this.plugin.getDateService();
		const age = dateService && journey?.birthDate && waypoint.date
			? dateService.calculateAge(journey.birthDate, waypoint.date, journey.universe)?.years
			: (journey?.birthYear && waypoint.year ? waypoint.year - journey.birthYear : undefined);
		if (age !== undefined && age >= 0) {
			this.addPopupRow(body, 'Age', `${age} years old`);
		}

		// Duration at location (time between this event and the next) — same treatment
		if (allWaypoints) {
			const stepIndex = allWaypoints.indexOf(waypoint);
			if (stepIndex >= 0 && stepIndex < allWaypoints.length - 1) {
				const nextWp = allWaypoints[stepIndex + 1];
				const duration = dateService && waypoint.date && nextWp.date
					? dateService.calculateAge(waypoint.date, nextWp.date, journey?.universe)?.years
					: (waypoint.year && nextWp.year ? nextWp.year - waypoint.year : undefined);
				if (duration !== undefined && duration > 0) {
					this.addPopupRow(body, 'Duration at location', `${duration} year${duration !== 1 ? 's' : ''}`);
				}
			}
		}

		// Description
		if (waypoint.description) {
			this.addPopupRow(body, 'Details', waypoint.description);
		}

		return container;
	}

	/**
	 * Add a label/value row to a popup
	 */
	private addPopupRow(container: HTMLElement, label: string, value: string): void {
		const row = container.createDiv({ cls: 'cr-journey-rich-popup__row' });
		row.createSpan({ text: label, cls: 'cr-journey-rich-popup__label' });
		row.createSpan({ text: value, cls: 'cr-journey-rich-popup__value' });
	}

	// ========================================================================
	// Family Journey Overlay
	// ========================================================================

	/** Relationship colors for family overlay paths */
	private static readonly FAMILY_COLORS: Record<string, string> = {
		father: '#3b82f6',   // blue
		mother: '#3b82f6',   // blue
		parent: '#3b82f6',   // blue
		spouse: '#ec4899',   // pink
		child: '#10b981',    // emerald
	};

	/**
	 * Show or update the family overlay toggle in the journey controls area
	 */
	private updateFamilyOverlayToggle(): void {
		// Remove existing toggle
		if (this.familyToggleEl) {
			this.familyToggleEl.remove();
			this.familyToggleEl = null;
		}

		if (!this.journeyMode.enabled || !this.journeyControlsEl) return;

		// Create toggle button in the controls bar
		this.familyToggleEl = this.journeyControlsEl.createEl('button', {
			cls: 'cr-map-journey-btn cr-map-journey-family-toggle',
			attr: { 'aria-label': 'Show family journeys' }
		});
		if (this.journeyMode.familyOverlay) {
			this.familyToggleEl.classList.add('cr-map-btn-active');
		}
		setIcon(this.familyToggleEl, 'users');

		this.familyToggleEl.addEventListener('click', () => {
			this.journeyMode.familyOverlay = !this.journeyMode.familyOverlay;
			this.familyToggleEl?.classList.toggle('cr-map-btn-active', this.journeyMode.familyOverlay);
			this.reapplyJourneyFilter();
		});
	}

	/**
	 * Re-apply journey filter without rebuilding playback controls (used by family toggle)
	 */
	private reapplyJourneyFilter(): void {
		if (!this.currentMapData || !this.journeyMode.personId) return;

		const personId = this.journeyMode.personId;

		const filteredMarkers = this.currentMapData.markers.filter(m =>
			m.personId === personId
		);

		const filteredJourneys = this.currentMapData.journeyPaths?.filter(j =>
			j.personId === personId
		) || [];

		const filteredPaths = this.currentMapData.paths.filter(p =>
			p.personId === personId
		);

		if (this.journeyMode.familyOverlay) {
			const familyJourneys = this.buildFamilyJourneyPaths();
			filteredJourneys.push(...familyJourneys);
		}

		this.mapController?.setFilteredData(filteredMarkers, filteredPaths, filteredJourneys);
	}

	/**
	 * Build journey paths for immediate family members with dimmed/colored styling
	 */
	private buildFamilyJourneyPaths(): JourneyPath[] {
		if (!this.currentMapData?.journeyPaths || !this.journeyMode.personId) return [];

		const familyIds = this.getImmediateFamilyIds();
		if (familyIds.length === 0) return [];

		const allJourneys = this.currentMapData.journeyPaths;
		const familyJourneys: JourneyPath[] = [];

		for (const { crId, relationship } of familyIds) {
			const journey = allJourneys.find(j => j.personId === crId);
			if (!journey || journey.waypoints.length < 2) continue;

			familyJourneys.push({
				...journey,
				color: MapView.FAMILY_COLORS[relationship] || '#94a3b8',
				weight: 1.5,
				opacity: 0.4,
				relationshipLabel: capitalize(relationship)
			});
		}

		return familyJourneys;
	}

	/**
	 * Get immediate family member cr_ids with their relationship type
	 */
	private getImmediateFamilyIds(): Array<{ crId: string; relationship: string }> {
		if (!this.journeyMode.personId) return [];

		const pluginWithServices = this.plugin as unknown as {
			createFamilyGraphService: () => unknown;
		};
		if (!pluginWithServices.createFamilyGraphService) return [];

		const familyGraph = pluginWithServices.createFamilyGraphService() as import('../core/family-graph').FamilyGraphService;
		familyGraph.ensureCacheLoaded();

		const person = familyGraph.getPersonByCrId(this.journeyMode.personId);
		if (!person) return [];

		const family: Array<{ crId: string; relationship: string }> = [];

		if (person.fatherCrId) family.push({ crId: person.fatherCrId, relationship: 'father' });
		if (person.motherCrId) family.push({ crId: person.motherCrId, relationship: 'mother' });
		for (const parentId of person.parentCrIds) {
			if (!family.some(f => f.crId === parentId)) {
				family.push({ crId: parentId, relationship: 'parent' });
			}
		}
		for (const spouseId of person.spouseCrIds) {
			family.push({ crId: spouseId, relationship: 'spouse' });
		}
		for (const childId of person.childrenCrIds) {
			family.push({ crId: childId, relationship: 'child' });
		}

		return family;
	}

	private toggleTimeSlider(): void {
		this.timeSlider.enabled = !this.timeSlider.enabled;

		if (this.timeSliderContainerEl) {
			this.timeSliderContainerEl.toggleClass('cr-hidden', !this.timeSlider.enabled);
		}

		// Update button state
		const btn = this.toolbarEl?.querySelector('.cr-map-toolbar-right button:first-child');
		if (btn) {
			btn.classList.toggle('cr-map-btn-active', this.timeSlider.enabled);
		}

		if (this.timeSlider.enabled) {
			// Update slider range from data
			this.updateTimeSliderRange();
			// Apply initial filter
			this.applyTimeFilter();
		} else {
			// Stop animation if running
			this.stopAnimation();
			// Show all markers
			this.showAllMarkers();
		}
	}

	/**
	 * Update time slider range based on data
	 */
	private updateTimeSliderRange(): void {
		if (!this.currentMapData || !this.timeSliderContainerEl) return;

		const { yearRange } = this.currentMapData;
		const slider = this.timeSliderContainerEl.querySelector('.cr-map-time-slider') as HTMLInputElement;
		const minLabel = this.timeSliderContainerEl.querySelector('.cr-map-time-label:first-child');
		const maxLabel = this.timeSliderContainerEl.querySelector('.cr-map-time-label:last-child');

		if (slider) {
			slider.min = String(yearRange.min);
			slider.max = String(yearRange.max);

			// Set current year to middle of range if out of bounds
			if (this.timeSlider.currentYear < yearRange.min || this.timeSlider.currentYear > yearRange.max) {
				this.timeSlider.currentYear = Math.floor((yearRange.min + yearRange.max) / 2);
				slider.value = String(this.timeSlider.currentYear);
			}
		}

		// Format min/max labels via DateService when a universe filter is
		// active, so fictional-era ranges render as "82 BBY" / "5 ABY"
		// rather than canonical signed integers (#453).
		const dateService = this.plugin.getDateService?.();
		const universe = this.filters.universe;
		const formatYear = (year: number): string =>
			dateService ? dateService.formatCanonicalYear(year, universe) : String(year);

		if (minLabel) minLabel.textContent = formatYear(yearRange.min);
		if (maxLabel) maxLabel.textContent = formatYear(yearRange.max);

		this.updateTimeSliderDisplay();
	}

	/**
	 * Update the time slider display (year value and count)
	 */
	private updateTimeSliderDisplay(): void {
		if (!this.timeSliderContainerEl || !this.currentMapData) return;

		const yearValue = this.timeSliderContainerEl.querySelector('.cr-map-time-year-value');
		const yearLabel = this.timeSliderContainerEl.querySelector('.cr-map-time-year-label');
		const countDisplay = this.timeSliderContainerEl.querySelector('.cr-map-time-count');

		if (yearValue) {
			// Format via DateService when a universe filter is active so
			// fictional eras render correctly (e.g., "82 BBY") rather than
			// the canonical signed integer (#453).
			const dateService = this.plugin.getDateService?.();
			const universe = this.filters.universe;
			yearValue.textContent = dateService
				? dateService.formatCanonicalYear(this.timeSlider.currentYear, universe)
				: String(this.timeSlider.currentYear);
		}

		// Calculate people alive/born
		const count = this.countPeopleForYear(this.timeSlider.currentYear);
		const total = this.currentMapData.personLifeSpans.length;

		if (yearLabel) {
			yearLabel.textContent = this.timeSlider.snapshotMode ? '' : ' (cumulative)';
		}

		if (countDisplay) {
			const label = this.timeSlider.snapshotMode ? 'alive' : 'born';
			countDisplay.textContent = `${count} of ${total} ${label}`;
		}
	}

	/**
	 * Count people alive (or born) for a given year
	 */
	private countPeopleForYear(year: number): number {
		if (!this.currentMapData) return 0;

		let count = 0;
		for (const person of this.currentMapData.personLifeSpans) {
			if (this.isPersonVisibleForYear(person, year)) {
				count++;
			}
		}
		return count;
	}

	/**
	 * Check if a person should be visible for a given year
	 */
	private isPersonVisibleForYear(person: PersonLifeSpan, year: number): boolean {
		if (this.timeSlider.snapshotMode) {
			// Snapshot mode: person was alive during this year
			const birthYear = person.birthYear ?? -Infinity;
			const deathYear = person.deathYear ?? Infinity;
			return birthYear <= year && year <= deathYear;
		} else {
			// Cumulative mode: person was born by this year
			const birthYear = person.birthYear ?? Infinity;
			return birthYear <= year;
		}
	}

	/**
	 * Apply time filter to show/hide markers
	 */
	private applyTimeFilter(): void {
		if (!this.mapController || !this.currentMapData) return;

		// Get IDs of people visible for current year
		const visiblePersonIds = new Set<string>();
		for (const person of this.currentMapData.personLifeSpans) {
			if (this.isPersonVisibleForYear(person, this.timeSlider.currentYear)) {
				visiblePersonIds.add(person.personId);
			}
		}

		// Filter markers
		const filteredMarkers = this.currentMapData.markers.filter(m => visiblePersonIds.has(m.personId));

		// Filter paths (both endpoints must be visible)
		const filteredPaths = this.currentMapData.paths.filter(p => visiblePersonIds.has(p.personId));

		// Update map controller with filtered data
		this.mapController.setFilteredData(filteredMarkers, filteredPaths);

		// Update display
		this.updateTimeSliderDisplay();
		this.updateStatusBar(filteredMarkers.length, filteredPaths.length);
	}

	/**
	 * Show all markers (disable time filtering)
	 */
	private showAllMarkers(): void {
		if (!this.mapController || !this.currentMapData) return;

		this.mapController.setData(this.currentMapData);
		this.updateStatusBar(this.currentMapData.markers.length, this.currentMapData.paths.length);
	}

	/**
	 * Toggle animation playback
	 */
	private toggleAnimation(): void {
		if (this.timeSlider.isPlaying) {
			this.stopAnimation();
		} else {
			this.startAnimation();
		}
	}

	/**
	 * Start animation
	 */
	private startAnimation(): void {
		if (!this.currentMapData) return;

		this.timeSlider.isPlaying = true;
		this.updatePlayButton();

		const { yearRange } = this.currentMapData;

		this.animationInterval = window.setInterval(() => {
			this.timeSlider.currentYear++;

			// Loop back to start when reaching end
			if (this.timeSlider.currentYear > yearRange.max) {
				this.timeSlider.currentYear = yearRange.min;
			}

			// Update slider position
			const slider = this.timeSliderContainerEl?.querySelector('.cr-map-time-slider') as HTMLInputElement;
			if (slider) {
				slider.value = String(this.timeSlider.currentYear);
			}

			this.applyTimeFilter();
		}, this.timeSlider.speed);
	}

	/**
	 * Stop animation
	 */
	private stopAnimation(): void {
		this.timeSlider.isPlaying = false;
		this.updatePlayButton();

		if (this.animationInterval !== null) {
			window.clearInterval(this.animationInterval);
			this.animationInterval = null;
		}
	}

	/**
	 * Update play button appearance
	 */
	private updatePlayButton(): void {
		const playBtn = this.timeSliderContainerEl?.querySelector('.cr-map-time-play span');
		if (playBtn) {
			playBtn.textContent = this.timeSlider.isPlaying ? '⏸' : '▶';
		}
	}

	// =========================================================================
	// Map Initialization Methods
	// =========================================================================

	/**
	 * Initialize the Leaflet map
	 */
	private async initializeMap(): Promise<void> {
		if (!this.mapContainerEl) {
			logger.error('init-error', 'Map container not found');
			return;
		}

		// Log container dimensions for debugging
		const rect = this.mapContainerEl.getBoundingClientRect();
		logger.debug('init-container', `Container dimensions: ${rect.width}x${rect.height}`);

		try {
			// Get map settings from plugin
			const settings = this.getMapSettings();

			// Create map controller
			this.mapController = new MapController(
				this.mapContainerEl,
				settings,
				this.plugin
			);

			// Initialize the map
			await this.mapController.initialize();

			// Register map change callback to filter by universe/mapId and sync dropdown
			this.mapController.onMapChange((mapId, universe) => {
				// Update filters for universe and per-map filtering
				// Universe value from map config may be a cr_id — resolve to name
				// since entity notes store universe by name
				this.filters.universe = this.resolveUniverseFilterValue(universe) ?? undefined;
				this.filters.mapId = mapId;

				// Sync dropdown
				if (this.mapSelectEl) {
					this.mapSelectEl.value = mapId;
				}

				// Update breadcrumb navigation (#361)
				this.updateBreadcrumb(mapId);

				// Enable/disable edit buttons based on map type
				const canEdit = this.mapController?.canEnableEditMode() ?? false;
				if (this.editBtn) {
					this.editBtn.disabled = !canEdit;
				}
				if (this.movePlacesBtn) {
					this.movePlacesBtn.disabled = !canEdit;
				}

				// If edit mode was enabled and we switched maps, disable it
				if (this.editModeEnabled) {
					void this.disableEditMode();
				}

				// Refresh data with new universe filter
				void this.refreshData();
			});

			// Register edit mode change callback
			this.mapController.onEditModeChange((enabled) => {
				this.editModeEnabled = enabled;
				this.updateEditUI();
			});

			// Register corners saved callback
			this.mapController.onCornersSaved(() => {
				new Notice('Map alignment saved to frontmatter');
			});

			// Register place marker context menu callback
			this.mapController.onPlaceMarkerContextMenu((placeId, placeName, event) => {
				this.showPlaceMarkerContextMenu(placeId, placeName, event);
			});

			// Register place marker dragged callback
			this.mapController.onPlaceMarkerDragged((placeId, placeName, newCoords) => {
				void this.handlePlaceMarkerDragged(placeId, placeName, newCoords);
			});

			// Load custom maps and populate dropdown
			this.loadCustomMaps();

			// Load initial data
			await this.refreshData();

			logger.info('init-success', 'Map initialized successfully');
		} catch (error) {
			// Log more details about the error
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			logger.error('init-error', 'Failed to initialize map', {
				message: errorMessage,
				stack: errorStack,
				containerWidth: rect.width,
				containerHeight: rect.height
			});
			this.showError(`Failed to initialize map: ${errorMessage}`);
		}
	}

	/**
	 * Destroy the map and clean up resources
	 */
	private destroyMap(): void {
		if (this.mapController) {
			this.mapController.destroy();
			this.mapController = null;
		}
	}

	/**
	 * Refresh map data based on current filters
	 * @param forceRefresh If true, read directly from files instead of metadata cache
	 */
	async refreshData(forceRefresh = false): Promise<void> {
		if (!this.mapController) return;

		try {
			logger.debug('refresh-start', 'Refreshing map data', { filters: this.filters, forceRefresh });

			// Get data from service (force refresh bypasses metadata cache)
			const data = await this.dataService.getMapData(this.filters, forceRefresh);

			// Store current map data for time slider
			this.currentMapData = data;

			// Update map with new data (or filtered if time slider is active)
			if (this.timeSlider.enabled) {
				this.updateTimeSliderRange();
				this.applyTimeFilter();
			} else {
				this.mapController.setData(data);
				this.updateStatusBar(data.markers.length, data.paths.length);
			}

			this.mapController.setLayerVisibility(this.layers);

			// Update collection dropdown
			this.updateCollectionDropdown(data.collections);

			logger.debug('refresh-complete', 'Map data refreshed', {
				markers: data.markers.length,
				paths: data.paths.length,
				personLifeSpans: data.personLifeSpans.length
			});
		} catch (error) {
			logger.error('refresh-error', 'Failed to refresh map data', { error });
			this.showError('Failed to load map data');
		}
	}

	/**
	 * Update the status bar with current stats
	 */
	private updateStatusBar(markerCount?: number, pathCount?: number): void {
		if (!this.statusBarEl) return;

		this.statusBarEl.empty();

		if (markerCount !== undefined && pathCount !== undefined) {
			this.statusBarEl.createSpan({
				text: `${markerCount} locations • ${pathCount} migration paths`
			});
		} else {
			this.statusBarEl.createSpan({ text: 'Loading...' });
		}

		// Attribution
		this.statusBarEl.createSpan({
			text: ' • © OpenStreetMap contributors',
			cls: 'cr-map-attribution'
		});
	}

	/**
	 * Update collection dropdown with available options
	 */
	private updateCollectionDropdown(collections: string[]): void {
		// Find collection select (second select in toolbar, after map select)
		const selects = this.toolbarEl?.querySelectorAll('.cr-map-toolbar-center .cr-map-select');
		const select = selects?.[0] as HTMLSelectElement | null;
		if (!select) return;

		// Save current selection
		const currentValue = select.value;

		// Clear and repopulate
		select.empty();
		select.createEl('option', { value: '', text: 'All collections' });

		for (const collection of collections.sort()) {
			select.createEl('option', { value: collection, text: collection });
		}

		// Restore selection if still valid
		if (currentValue && collections.includes(currentValue)) {
			select.value = currentValue;
		}
	}

	/**
	 * Load custom maps and populate the map selector dropdown
	 */
	private loadCustomMaps(): void {
		if (!this.mapController || !this.mapSelectEl) return;

		try {
			this.customMaps = this.mapController.getCustomMaps();

			// Clear existing custom map options (keep OpenStreetMap)
			while (this.mapSelectEl.options.length > 1) {
				this.mapSelectEl.remove(1);
			}

			// Add separator if there are custom maps
			if (this.customMaps.length > 0) {
				const separator = this.mapSelectEl.createEl('option', {
					value: '',
					text: '── Custom maps ──',
					attr: { disabled: 'true' }
				});
				separator.disabled = true;

				// Add custom maps grouped by universe
				const byUniverse = new Map<string, CustomMapConfig[]>();
				for (const map of this.customMaps) {
					const universe = map.universe || 'Other';
					if (!byUniverse.has(universe)) {
						byUniverse.set(universe, []);
					}
					byUniverse.get(universe)!.push(map);
				}

				for (const [universe, maps] of byUniverse) {
					for (const map of maps) {
						this.mapSelectEl.createEl('option', {
							value: map.id,
							text: `${map.name} (${universe})`
						});
					}
				}
			}

			logger.debug('load-custom-maps', `Loaded ${this.customMaps.length} custom maps`);
		} catch (error) {
			logger.error('load-custom-maps-error', 'Failed to load custom maps', { error });
		}
	}

	/**
	 * Export current view as GeoJSON
	 */
	private async exportGeoJSON(): Promise<void> {
		if (!this.mapController) return;

		try {
			const geojson = this.mapController.exportGeoJSON();
			const filename = `map-export-${new Date().toISOString().slice(0, 10)}.geojson`;

			await this.plugin.app.vault.create(filename, JSON.stringify(geojson, null, 2));
			logger.info('export-geojson', 'GeoJSON exported', { filename });
		} catch (error) {
			logger.error('export-error', 'Failed to export GeoJSON', { error });
			this.showError('Failed to export GeoJSON');
		}
	}

	/**
	 * Export current view as SVG
	 */
	private async exportSVG(): Promise<void> {
		if (!this.mapController) return;

		try {
			const svg = this.mapController.exportSVG({
				includeLabels: true,
				includeLegend: true,
				includeCoordinates: true,
				width: 800,
				height: 600
			});
			const filename = `map-export-${new Date().toISOString().slice(0, 10)}.svg`;

			await this.plugin.app.vault.create(filename, svg);
			logger.info('export-svg', 'SVG exported', { filename });
		} catch (error) {
			logger.error('export-error', 'Failed to export SVG', { error });
			this.showError('Failed to export SVG');
		}
	}

	/**
	 * Register event handlers for file changes
	 */
	private registerEventHandlers(): void {
		// Refresh when metadata cache is updated (fires after frontmatter is parsed)
		// This is more reliable than vault.on('modify') which fires before cache updates
		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', (file) => {
				// Only refresh if a person or place note changed
				if (this.isRelevantFile(file.path)) {
					logger.debug('metadata-changed', `Refreshing map due to change in ${file.path}`);
					void this.refreshData();
				}
			})
		);

		// Listen for family overlay "switch to journey" clicks
		this.containerEl.addEventListener('cr-switch-journey', ((e: CustomEvent) => {
			const { personId, personName } = e.detail as { personId: string; personName: string };
			if (personId && personName) {
				this.enterJourneyModeForPerson(personId, personName);
			}
		}) as EventListener);
	}

	/**
	 * Check if a file path is relevant to the map (person, place, or map note)
	 */
	private isRelevantFile(path: string): boolean {
		const peopleFolder = this.plugin.settings.peopleFolder;
		const placesFolder = this.plugin.settings.placesFolder;
		const mapsFolder = this.plugin.settings.mapsFolder;

		// Check if file is in a relevant folder
		if (
			(peopleFolder && path.startsWith(peopleFolder)) ||
			(placesFolder && path.startsWith(placesFolder)) ||
			(mapsFolder && path.startsWith(mapsFolder))
		) {
			return true;
		}

		// Also check if it's a place/person/map note by cr_type
		// This catches notes outside the configured folders
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (file && 'extension' in file && file.extension === 'md') {
			const cache = this.plugin.app.metadataCache.getCache(path);
			const crType = cache?.frontmatter?.cr_type;
			if (crType === 'person' || crType === 'place' || crType === 'map') {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get map settings from plugin settings
	 */
	private getMapSettings(): MapSettings {
		// Use plugin settings for maps folder, defaults for other settings
		// TODO: Add full map settings to plugin settings when implementing map settings tab
		return {
			tileProvider: 'openstreetmap',
			defaultCenter: { lat: 40, lng: -40 },
			defaultZoom: 3,
			// Core life event colors
			birthMarkerColor: '#22c55e',      // green
			deathMarkerColor: '#ef4444',      // red
			marriageMarkerColor: '#a855f7',   // purple
			burialMarkerColor: '#6b7280',     // gray
			// Additional event colors
			residenceMarkerColor: '#3b82f6',  // blue
			occupationMarkerColor: '#f97316', // orange
			educationMarkerColor: '#14b8a6',  // teal
			militaryMarkerColor: '#78716c',   // brown/stone
			immigrationMarkerColor: '#06b6d4', // cyan
			religiousMarkerColor: '#c084fc',  // light purple
			customMarkerColor: '#eab308',     // yellow (distinct from death-red cluster, #465)
			// Migration path settings
			showMigrationPaths: true,
			pathColor: '#6366f1',       // indigo
			pathWeight: 2,
			showPathLabels: true,
			// Journey path settings
			showJourneyPaths: false,
			journeyPathColor: '#8b5cf6', // violet
			journeyPathWeight: 2,
			showJourneyLabels: true,
			// Heat map settings
			heatMapBlur: 15,
			heatMapRadius: 25,
			heatMapIntensity: this.plugin.settings.heatMapIntensity || 'medium',
			heatMapPresets: this.plugin.settings.heatMapPresets || {
				low: { radius: 0.55, blur: 1.2, opacity: 0.1 },
				medium: { radius: 0.7, blur: 1.0, opacity: 0.12 },
				high: { radius: 0.9, blur: 0.7, opacity: 0.18 },
			},
			// Custom maps folder
			customMapsFolder: this.plugin.settings.mapsFolder || 'Charted Roots/Places/Maps',
			// Event display settings (from main plugin settings)
			eventIconMode: this.plugin.settings.eventIconMode,
			customEventTypes: this.plugin.settings.customEventTypes,
			showBuiltInEventTypes: this.plugin.settings.showBuiltInEventTypes
		};
	}

	// ========================================================================
	// Edit Mode Methods
	// ========================================================================

	/**
	 * Toggle move places mode (marker-only edit mode)
	 */
	private async toggleMovePlacesMode(): Promise<void> {
		if (!this.mapController) return;

		if (this.movePlacesModeEnabled) {
			await this.disableMovePlacesMode();
		} else {
			await this.enableMovePlacesMode();
		}
	}

	/**
	 * Enable move places mode (marker dragging without image alignment)
	 */
	private async enableMovePlacesMode(): Promise<void> {
		if (!this.mapController) return;

		// If image alignment edit mode is active, disable it first
		if (this.editModeEnabled && !this.movePlacesModeEnabled) {
			await this.disableEditMode();
		}

		const success = this.mapController.enableMarkerEditMode();
		if (success) {
			this.movePlacesModeEnabled = true;
			this.editModeEnabled = true;  // mapController tracks this
			this.updateEditUI();
			logger.info('move-places-mode', 'Move places mode enabled');
		}
	}

	/**
	 * Disable move places mode
	 */
	private async disableMovePlacesMode(): Promise<void> {
		if (!this.mapController) return;

		await this.mapController.disableEditMode();
		this.movePlacesModeEnabled = false;
		this.editModeEnabled = false;
		this.updateEditUI();
		logger.info('move-places-mode', 'Move places mode disabled');
	}

	/**
	 * Toggle edit mode for image alignment
	 */
	private async toggleEditMode(): Promise<void> {
		if (!this.mapController) return;

		if (this.editModeEnabled && !this.movePlacesModeEnabled) {
			await this.disableEditMode();
		} else {
			// If in move places mode, disable it first
			if (this.movePlacesModeEnabled) {
				await this.disableMovePlacesMode();
			}
			await this.enableEditMode();
		}
	}

	/**
	 * Enable edit mode (image alignment)
	 */
	private async enableEditMode(): Promise<void> {
		if (!this.mapController) return;

		const success = await this.mapController.enableImageAlignmentMode();
		if (success) {
			this.editModeEnabled = true;
			this.movePlacesModeEnabled = false;
			this.updateEditUI();
			logger.info('edit-mode', 'Image alignment edit mode enabled');
		}
	}

	/**
	 * Disable edit mode
	 */
	private async disableEditMode(): Promise<void> {
		if (!this.mapController) return;

		await this.mapController.disableEditMode();
		this.editModeEnabled = false;
		this.movePlacesModeEnabled = false;
		this.updateEditUI();
		logger.info('edit-mode', 'Edit mode disabled');
	}

	/**
	 * Update the UI to reflect edit mode state
	 */
	private updateEditUI(): void {
		// Update edit button appearance
		if (this.editBtn) {
			if (this.editModeEnabled && !this.movePlacesModeEnabled) {
				this.editBtn.addClass('active');
				const span = this.editBtn.querySelector('span');
				if (span) span.textContent = 'Exit edit';
			} else {
				this.editBtn.removeClass('active');
				const span = this.editBtn.querySelector('span');
				if (span) span.textContent = 'Edit';
			}
		}

		// Update move places button appearance
		if (this.movePlacesBtn) {
			if (this.movePlacesModeEnabled) {
				this.movePlacesBtn.addClass('active');
				const span = this.movePlacesBtn.querySelector('span');
				if (span) span.textContent = 'Done moving';
			} else {
				this.movePlacesBtn.removeClass('active');
				const span = this.movePlacesBtn.querySelector('span');
				if (span) span.textContent = 'Move places';
			}
		}

		// Show/hide edit banner
		if (this.editModeEnabled && !this.movePlacesModeEnabled) {
			// Full edit mode banner (image alignment)
			this.showEditBanner();
		} else if (this.movePlacesModeEnabled) {
			// Move places mode banner (simpler)
			this.showMovePlacesBanner();
		} else {
			this.hideEditBanner();
		}
	}

	/**
	 * Show the edit mode banner with Save/Restore/Cancel buttons
	 */
	private showEditBanner(): void {
		if (this.editBannerEl) {
			logger.debug('edit-banner', 'Banner already showing');
			return; // Already showing
		}

		// contentEl itself has the .cr-map-view class
		const container = this.contentEl;
		if (!container.hasClass('cr-map-view')) {
			logger.warn('edit-banner', 'Container missing .cr-map-view class');
			return;
		}
		logger.debug('edit-banner', 'Creating edit banner');

		this.editBannerEl = document.createElement('div');
		this.editBannerEl.className = 'cr-map-edit-banner';

		// Banner text
		const textEl = this.editBannerEl.createDiv({ cls: 'cr-map-edit-banner-text' });
		textEl.createEl('strong', { text: 'Edit mode:' });
		textEl.appendText(' Drag corners to align the map image, or drag place markers to reposition them.');

		// Button container
		const btnContainer = this.editBannerEl.createDiv({ cls: 'cr-map-edit-controls' });

		// Save button
		const saveBtn = btnContainer.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-edit cr-map-btn-save',
			text: 'Save alignment'
		});
		saveBtn.addEventListener('click', () => void this.saveEditedCorners());

		// Restore button (undo unsaved changes)
		const restoreBtn = btnContainer.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-edit cr-map-btn-restore',
			text: 'Undo changes'
		});
		restoreBtn.addEventListener('click', () => this.mapController?.restoreOverlay());

		// Reset button (clear saved alignment)
		const resetBtn = btnContainer.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-edit cr-map-btn-reset',
			text: 'Reset to default'
		});
		resetBtn.addEventListener('click', () => void this.resetAlignment());

		// Cancel button
		const cancelBtn = btnContainer.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-edit',
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => void this.disableEditMode());

		// Insert banner before the map container (after toolbar and time slider)
		if (this.mapContainerEl) {
			container.insertBefore(this.editBannerEl, this.mapContainerEl);
		} else {
			container.appendChild(this.editBannerEl);
		}
	}

	/**
	 * Hide the edit mode banner
	 */
	private hideEditBanner(): void {
		if (this.editBannerEl) {
			this.editBannerEl.remove();
			this.editBannerEl = null;
		}
	}

	/**
	 * Show the move places mode banner (simpler than full edit mode)
	 */
	private showMovePlacesBanner(): void {
		if (this.editBannerEl) {
			// Already showing a banner, replace it
			this.editBannerEl.remove();
		}

		const container = this.contentEl;
		if (!container.hasClass('cr-map-view')) {
			return;
		}

		this.editBannerEl = document.createElement('div');
		this.editBannerEl.className = 'cr-map-edit-banner cr-map-move-banner';

		// Banner text
		const textEl = this.editBannerEl.createDiv({ cls: 'cr-map-edit-banner-text' });
		textEl.createEl('strong', { text: 'Move places:' });
		textEl.appendText(' Drag place markers to reposition them. Changes are saved automatically.');

		// Button container
		const btnContainer = this.editBannerEl.createDiv({ cls: 'cr-map-edit-controls' });

		// Done button
		const doneBtn = btnContainer.createEl('button', {
			cls: 'cr-map-btn cr-map-btn-edit',
			text: 'Done'
		});
		doneBtn.addEventListener('click', () => void this.disableMovePlacesMode());

		// Insert banner before the map container
		if (this.mapContainerEl) {
			container.insertBefore(this.editBannerEl, this.mapContainerEl);
		} else {
			container.appendChild(this.editBannerEl);
		}
	}

	/**
	 * Save the edited corners to frontmatter
	 */
	private async saveEditedCorners(): Promise<void> {
		if (!this.mapController) return;

		const success = await this.mapController.saveEditedCorners();
		if (success) {
			new Notice('Map alignment saved');
		} else {
			new Notice('Failed to save map alignment');
		}
	}

	/**
	 * Reset alignment to default (clear saved corners)
	 */
	private async resetAlignment(): Promise<void> {
		if (!this.mapController) return;

		const success = await this.mapController.resetAlignment();
		if (success) {
			new Notice('Map alignment reset to default');
			this.hideEditBanner();
		} else {
			new Notice('Failed to reset map alignment');
		}
	}

	/**
	 * Show an error message in the view
	 */
	private showError(message: string): void {
		if (this.mapContainerEl) {
			this.mapContainerEl.empty();
			this.mapContainerEl.createDiv({
				cls: 'cr-map-error',
				text: message
			});
		}
	}
}
