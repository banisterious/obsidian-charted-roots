/**
 * Map Controller - Leaflet map management
 *
 * Handles Leaflet map initialization, layer management, and user interactions.
 */

import * as L from 'leaflet';

// Track if plugins have been initialized
let pluginsInitialized = false;

/**
 * Initialize Leaflet plugins
 * Must be called before using marker clusters or other plugin features
 */
async function initializeLeafletPlugins(): Promise<void> {
	if (pluginsInitialized) return;

	// IMPORTANT: Leaflet plugins expect L to be available globally
	// We need to assign it to window before importing the plugins
	(window as unknown as { L: typeof L }).L = L;

	// Import Leaflet plugins dynamically after L is on window
	// These plugins extend the L namespace via side effects
	await import('leaflet.markercluster');
	await import('leaflet-polylinedecorator');
	await import('leaflet.heat');
	await import('leaflet-fullscreen');
	await import('leaflet-minimap');
	await import('leaflet-search');
	await import('leaflet-textpath');

	pluginsInitialized = true;
}

/**
 * Create a marker cluster group, handling different import scenarios
 */
function createMarkerClusterGroup(options?: L.MarkerClusterGroupOptions): L.MarkerClusterGroup {
	const globalL = (window as unknown as { L: typeof L }).L;

	// Try the standard L.markerClusterGroup function first
	if (typeof globalL.markerClusterGroup === 'function') {
		return globalL.markerClusterGroup(options);
	}

	// Try accessing MarkerClusterGroup constructor directly
	if (typeof globalL.MarkerClusterGroup === 'function') {
		return new globalL.MarkerClusterGroup(options);
	}

	throw new Error('leaflet.markercluster is not properly loaded');
}

import type CanvasRootsPlugin from '../../main';
import { getLogger } from '../core/logging';
import type {
	MapData,
	MapMarker,
	MigrationPath,
	AggregatedPath,
	MapSettings,
	MapState,
	LayerVisibility,
	GeoJSONFeatureCollection,
	SVGExportOptions,
	CRMarker,
	CRPolyline,
	CustomMapConfig
} from './types/map-types';
import { ImageMapManager } from './image-map-manager';

const logger = getLogger('MapController');

// OpenStreetMap tile URL
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Controller for Leaflet map functionality
 */
export class MapController {
	private container: HTMLElement;
	private settings: MapSettings;
	private plugin: CanvasRootsPlugin;

	// Leaflet instances
	private map: L.Map | null = null;
	private tileLayer: L.TileLayer | null = null;

	// Layer groups for different marker types
	private birthClusterGroup: L.MarkerClusterGroup | null = null;
	private deathClusterGroup: L.MarkerClusterGroup | null = null;
	private marriageClusterGroup: L.MarkerClusterGroup | null = null;
	private burialClusterGroup: L.MarkerClusterGroup | null = null;
	private pathLayer: L.LayerGroup | null = null;
	private heatLayer: L.Layer | null = null;

	// Controls
	private fullscreenControl: L.Control | null = null;
	private miniMap: L.Control | null = null;
	private searchControl: L.Control | null = null;

	// Custom image maps
	private imageMapManager: ImageMapManager;
	private currentImageOverlay: L.ImageOverlay | null = null;
	private activeMapId: string = 'openstreetmap';

	// Current data
	private currentData: MapData | null = null;
	private currentLayers: LayerVisibility = {
		births: true,
		deaths: true,
		marriages: false,
		burials: false,
		paths: true,
		heatMap: false
	};

	// Callback for when active map changes
	private onMapChangeCallback: ((mapId: string, universe: string | null) => void) | null = null;

	constructor(container: HTMLElement, settings: MapSettings, plugin: CanvasRootsPlugin) {
		this.container = container;
		this.settings = settings;
		this.plugin = plugin;
		this.imageMapManager = new ImageMapManager(plugin.app, settings.customMapsFolder);
	}

	/**
	 * Initialize the Leaflet map
	 */
	async initialize(): Promise<void> {
		logger.debug('init', 'Initializing Leaflet map');

		// Initialize Leaflet plugins first (must be done before using them)
		await initializeLeafletPlugins();

		// Create map instance
		this.map = L.map(this.container, {
			center: [this.settings.defaultCenter.lat, this.settings.defaultCenter.lng],
			zoom: this.settings.defaultZoom,
			zoomControl: true
		});

		// Add tile layer
		this.tileLayer = L.tileLayer(OSM_TILE_URL, {
			attribution: OSM_ATTRIBUTION,
			maxZoom: 19
		}).addTo(this.map);

		// Initialize cluster groups
		this.initializeClusterGroups();

		// Initialize path layer
		this.pathLayer = L.layerGroup().addTo(this.map);

		// Add fullscreen control
		this.initializeFullscreen();

		// Add mini-map
		this.initializeMiniMap();

		// Add search control
		this.initializeSearch();

		logger.debug('init-complete', 'Leaflet map initialized');
	}

	/**
	 * Initialize marker cluster groups
	 */
	private initializeClusterGroups(): void {
		if (!this.map) return;

		const clusterOptions: L.MarkerClusterGroupOptions = {
			showCoverageOnHover: false,
			maxClusterRadius: 50,
			spiderfyOnMaxZoom: true,
			disableClusteringAtZoom: 15
		};

		// Birth markers (green)
		this.birthClusterGroup = createMarkerClusterGroup({
			...clusterOptions,
			iconCreateFunction: (cluster) => this.createClusterIcon(cluster, this.settings.birthMarkerColor)
		});
		this.birthClusterGroup.addTo(this.map);

		// Death markers (red)
		this.deathClusterGroup = createMarkerClusterGroup({
			...clusterOptions,
			iconCreateFunction: (cluster) => this.createClusterIcon(cluster, this.settings.deathMarkerColor)
		});
		this.deathClusterGroup.addTo(this.map);

		// Marriage markers (purple)
		this.marriageClusterGroup = createMarkerClusterGroup({
			...clusterOptions,
			iconCreateFunction: (cluster) => this.createClusterIcon(cluster, this.settings.marriageMarkerColor)
		});

		// Burial markers (gray)
		this.burialClusterGroup = createMarkerClusterGroup({
			...clusterOptions,
			iconCreateFunction: (cluster) => this.createClusterIcon(cluster, this.settings.burialMarkerColor)
		});
	}

	/**
	 * Create a custom cluster icon
	 */
	private createClusterIcon(cluster: L.MarkerCluster, color: string): L.DivIcon {
		const count = cluster.getChildCount();
		const size = count < 10 ? 30 : count < 100 ? 40 : 50;

		return L.divIcon({
			html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${size / 3}px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${count}</div>`,
			className: 'cr-cluster-icon',
			iconSize: L.point(size, size)
		});
	}

	/**
	 * Initialize fullscreen control
	 */
	private initializeFullscreen(): void {
		if (!this.map) return;

		// @ts-expect-error - leaflet-fullscreen types not available
		this.fullscreenControl = L.control.fullscreen({
			position: 'topleft',
			title: 'Enter fullscreen',
			titleCancel: 'Exit fullscreen'
		}).addTo(this.map);
	}

	/**
	 * Initialize mini-map control
	 */
	private initializeMiniMap(): void {
		if (!this.map) return;

		const miniMapTiles = L.tileLayer(OSM_TILE_URL, {
			attribution: '',
			maxZoom: 13
		});

		// @ts-expect-error - leaflet-minimap types not available
		this.miniMap = new L.Control.MiniMap(miniMapTiles, {
			position: 'bottomright',
			width: 150,
			height: 150,
			zoomLevelOffset: -5,
			toggleDisplay: true
		}).addTo(this.map);
	}

	/**
	 * Initialize search control
	 * Allows searching for places by name and zooming to them
	 */
	private initializeSearch(): void {
		if (!this.map) return;

		// Create a layer group to hold searchable markers
		// The search layer will be populated when data is set
		const searchLayer = L.layerGroup().addTo(this.map);

		try {
			const globalL = (window as unknown as { L: typeof L }).L;

			// @ts-expect-error - leaflet-search types not available
			if (globalL.Control && globalL.Control.Search) {
				// @ts-expect-error - leaflet-search types not available
				this.searchControl = new globalL.Control.Search({
					layer: searchLayer,
					propertyName: 'placeName',
					position: 'topright',
					initial: false,
					zoom: 12,
					marker: false,
					textPlaceholder: 'Search places...',
					textErr: 'Place not found',
					collapsed: true,
					autoCollapse: true,
					minLength: 2,
					hideMarkerOnCollapse: true,
					buildTip: (text: string, val: { layer: L.Marker }) => {
						// Build custom tooltip for search suggestions
						const marker = val.layer as CRMarker;
						const data = marker.crData;
						if (data) {
							return `<a href="#"><b>${data.placeName}</b><br><small>${data.personName} (${data.type})</small></a>`;
						}
						return `<a href="#">${text}</a>`;
					}
				}).addTo(this.map);

				// Store reference to search layer for updates
				(this.searchControl as { _searchLayer?: L.LayerGroup })._searchLayer = searchLayer;

				logger.debug('search-init', 'Search control initialized');
			} else {
				logger.warn('search-init', 'leaflet-search not available');
			}
		} catch (e) {
			logger.warn('search-init', 'Could not initialize search control', { error: e });
		}
	}

	/**
	 * Update search layer with current markers
	 */
	private updateSearchLayer(): void {
		if (!this.searchControl) return;

		const searchLayer = (this.searchControl as { _searchLayer?: L.LayerGroup })._searchLayer;
		if (!searchLayer) return;

		// Clear existing search markers
		searchLayer.clearLayers();

		// Add all visible markers to search layer
		// We create invisible markers with the place name as a property
		if (this.birthClusterGroup) {
			this.birthClusterGroup.eachLayer((layer) => {
				const marker = layer as CRMarker;
				if (marker.crData) {
					const searchMarker = L.marker([marker.crData.lat, marker.crData.lng], {
						opacity: 0,
						// @ts-expect-error - custom property for search
						placeName: marker.crData.placeName
					}) as CRMarker;
					searchMarker.crData = marker.crData;
					searchLayer.addLayer(searchMarker);
				}
			});
		}

		if (this.deathClusterGroup) {
			this.deathClusterGroup.eachLayer((layer) => {
				const marker = layer as CRMarker;
				if (marker.crData) {
					const searchMarker = L.marker([marker.crData.lat, marker.crData.lng], {
						opacity: 0,
						// @ts-expect-error - custom property for search
						placeName: marker.crData.placeName
					}) as CRMarker;
					searchMarker.crData = marker.crData;
					searchLayer.addLayer(searchMarker);
				}
			});
		}

		logger.debug('search-update', `Updated search layer with markers`);
	}

	/**
	 * Set map data and render markers/paths
	 */
	setData(data: MapData): void {
		try {
			this.currentData = data;
			this.renderMarkers(data.markers);
			this.renderPaths(data.paths);
			this.renderHeatMap(data.markers);

			// Update search layer with new markers
			this.updateSearchLayer();

			// Fit bounds to show all markers
			this.fitBounds();
		} catch (error) {
			logger.error('set-data-error', 'Error setting map data', { error });
			throw error;
		}
	}

	/**
	 * Set filtered data (for time slider) without changing current data reference
	 * This updates only the visible markers/paths without fitting bounds
	 */
	setFilteredData(markers: MapMarker[], paths: MigrationPath[]): void {
		try {
			this.renderMarkers(markers);
			this.renderPaths(paths);
			this.renderHeatMap(markers);
			// Don't fit bounds - keep current view during animation
		} catch (error) {
			logger.error('set-filtered-data-error', 'Error setting filtered data', { error });
			throw error;
		}
	}

	/**
	 * Render markers on the map
	 */
	private renderMarkers(markers: MapMarker[]): void {
		// Clear existing markers
		this.birthClusterGroup?.clearLayers();
		this.deathClusterGroup?.clearLayers();
		this.marriageClusterGroup?.clearLayers();
		this.burialClusterGroup?.clearLayers();

		for (const marker of markers) {
			const leafletMarker = this.createMarker(marker);

			switch (marker.type) {
				case 'birth':
					this.birthClusterGroup?.addLayer(leafletMarker);
					break;
				case 'death':
					this.deathClusterGroup?.addLayer(leafletMarker);
					break;
				case 'marriage':
					this.marriageClusterGroup?.addLayer(leafletMarker);
					break;
				case 'burial':
					this.burialClusterGroup?.addLayer(leafletMarker);
					break;
			}
		}

		logger.debug('render-markers', `Rendered ${markers.length} markers`);
	}

	/**
	 * Create a Leaflet marker from map marker data
	 */
	private createMarker(data: MapMarker): CRMarker {
		const color = this.getMarkerColor(data.type);
		const icon = this.createMarkerIcon(color);

		const marker = L.marker([data.lat, data.lng], { icon }) as CRMarker;
		marker.crData = data;

		// Create popup content
		const popupContent = this.createPopupContent(data);
		marker.bindPopup(popupContent);

		return marker;
	}

	/**
	 * Create a marker icon with the specified color
	 */
	private createMarkerIcon(color: string): L.DivIcon {
		return L.divIcon({
			html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
			className: 'cr-marker-icon',
			iconSize: L.point(16, 16),
			iconAnchor: L.point(8, 8)
		});
	}

	/**
	 * Get marker color based on type
	 */
	private getMarkerColor(type: MapMarker['type']): string {
		switch (type) {
			case 'birth':
				return this.settings.birthMarkerColor;
			case 'death':
				return this.settings.deathMarkerColor;
			case 'marriage':
				return this.settings.marriageMarkerColor;
			case 'burial':
				return this.settings.burialMarkerColor;
			default:
				return this.settings.otherMarkerColor;
		}
	}

	/**
	 * Create popup content for a marker
	 */
	private createPopupContent(data: MapMarker): HTMLElement {
		const container = document.createElement('div');
		container.className = 'cr-map-popup';

		container.createEl('div', {
			cls: 'cr-map-popup-name',
			text: data.personName
		});

		const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
		const dateText = data.date ? `: ${data.date}` : '';
		container.createEl('div', {
			cls: 'cr-map-popup-type',
			text: `${typeLabel}${dateText}`
		});

		container.createEl('div', {
			cls: 'cr-map-popup-place',
			text: data.placeName
		});

		// Button container for multiple buttons
		const btnContainer = container.createEl('div', {
			cls: 'cr-map-popup-buttons'
		});

		// Open person note button
		const openPersonBtn = btnContainer.createEl('button', {
			cls: 'cr-map-popup-btn',
			text: 'Open person'
		});
		openPersonBtn.addEventListener('click', () => {
			this.openNoteById(data.personId);
		});

		// Open place note button (if place has an ID)
		if (data.placeId) {
			const openPlaceBtn = btnContainer.createEl('button', {
				cls: 'cr-map-popup-btn cr-map-popup-btn--secondary',
				text: 'Open place'
			});
			openPlaceBtn.addEventListener('click', () => {
				this.openNoteById(data.placeId!);
			});
		}

		return container;
	}

	/**
	 * Open a note by cr_id in Obsidian
	 */
	private openNoteById(crId: string): void {
		// Find the file by cr_id
		const files = this.plugin.app.vault.getMarkdownFiles();
		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.cr_id === crId) {
				void this.plugin.app.workspace.openLinkText(file.path, '');
				return;
			}
		}
		logger.warn('open-note', `Could not find note with cr_id: ${crId}`);
	}

	/**
	 * Render migration paths on the map
	 */
	private renderPaths(paths: MigrationPath[]): void {
		if (!this.pathLayer) return;

		this.pathLayer.clearLayers();

		for (const path of paths) {
			const polyline = this.createPath(path);
			this.pathLayer.addLayer(polyline);
		}

		logger.debug('render-paths', `Rendered ${paths.length} paths`);
	}

	/**
	 * Create a polyline with arrow decoration for a migration path
	 */
	private createPath(data: MigrationPath): L.Polyline {
		const latlngs: L.LatLngExpression[] = [
			[data.origin.lat, data.origin.lng],
			[data.destination.lat, data.destination.lng]
		];

		const polyline = L.polyline(latlngs, {
			color: this.settings.pathColor,
			weight: this.settings.pathWeight,
			opacity: 0.7
		}) as CRPolyline;

		polyline.crData = data;

		// Try to add arrow decoration (may fail if library not loaded properly)
		try {
			// @ts-expect-error - leaflet-polylinedecorator types not fully available
			const LPolylineDecorator = L.polylineDecorator;
			// @ts-expect-error - leaflet-polylinedecorator Symbol types not available
			const LSymbol = L.Symbol;

			if (LPolylineDecorator && LSymbol) {
				const decorator = LPolylineDecorator(polyline, {
					patterns: [
						{
							offset: '50%',
							repeat: 0,
							symbol: LSymbol.arrowHead({
								pixelSize: 10,
								polygon: false,
								pathOptions: {
									color: this.settings.pathColor,
									weight: this.settings.pathWeight
								}
							})
						}
					]
				});
				// Note: decorator is created but we only add the polyline to the layer
				// The decorator would need to be added separately if we want arrows
			}
		} catch (e) {
			logger.warn('polyline-decorator', 'Could not add arrow decoration to path', { error: e });
		}

		// Add text label along the path (person name)
		if (this.settings.showPathLabels) {
			try {
				polyline.setText(data.personName, {
					center: true,
					offset: -5, // Position above the line
					orientation: 'flip', // Ensure text reads left-to-right
					attributes: {
						fill: this.settings.pathColor,
						'font-size': '11px',
						'font-weight': '500'
					}
				});
			} catch (e) {
				logger.warn('textpath', 'Could not add text label to path', { error: e });
			}
		}

		// Bind popup to the polyline
		polyline.bindPopup(this.createPathPopup(data));

		return polyline;
	}

	/**
	 * Create popup content for a migration path
	 */
	private createPathPopup(data: MigrationPath): HTMLElement {
		const container = document.createElement('div');
		container.className = 'cr-map-popup';

		container.createEl('div', {
			cls: 'cr-map-popup-name',
			text: data.personName
		});

		container.createEl('div', {
			cls: 'cr-map-popup-migration',
			text: `${data.origin.name} → ${data.destination.name}`
		});

		if (data.birthYear && data.deathYear) {
			container.createEl('div', {
				cls: 'cr-map-popup-years',
				text: `${data.birthYear} – ${data.deathYear}`
			});
		}

		return container;
	}

	/**
	 * Render heat map layer
	 */
	private renderHeatMap(markers: MapMarker[]): void {
		if (!this.map) return;

		// Remove existing heat layer
		if (this.heatLayer) {
			this.map.removeLayer(this.heatLayer);
			this.heatLayer = null;
		}

		// Create heat data points
		const heatData: [number, number, number][] = markers
			.filter(m => m.type === 'birth' || m.type === 'death')
			.map(m => [m.lat, m.lng, 1]);

		if (heatData.length === 0) return;

		// Try to create heat layer (may fail if library not loaded properly)
		try {
			// @ts-expect-error - leaflet.heat types not available
			const LHeatLayer = L.heatLayer;
			if (LHeatLayer) {
				this.heatLayer = LHeatLayer(heatData, {
					radius: this.settings.heatMapRadius,
					blur: this.settings.heatMapBlur,
					maxZoom: 10
				});

				// Only add if heat map layer is enabled
				if (this.currentLayers.heatMap && this.heatLayer) {
					this.heatLayer.addTo(this.map);
				}
			}
		} catch (e) {
			logger.warn('heat-layer', 'Could not create heat layer', { error: e });
		}
	}

	/**
	 * Set layer visibility
	 */
	setLayerVisibility(layers: LayerVisibility): void {
		if (!this.map) return;

		this.currentLayers = layers;

		// Birth markers
		if (this.birthClusterGroup) {
			if (layers.births && !this.map.hasLayer(this.birthClusterGroup)) {
				this.map.addLayer(this.birthClusterGroup);
			} else if (!layers.births && this.map.hasLayer(this.birthClusterGroup)) {
				this.map.removeLayer(this.birthClusterGroup);
			}
		}

		// Death markers
		if (this.deathClusterGroup) {
			if (layers.deaths && !this.map.hasLayer(this.deathClusterGroup)) {
				this.map.addLayer(this.deathClusterGroup);
			} else if (!layers.deaths && this.map.hasLayer(this.deathClusterGroup)) {
				this.map.removeLayer(this.deathClusterGroup);
			}
		}

		// Marriage markers
		if (this.marriageClusterGroup) {
			if (layers.marriages && !this.map.hasLayer(this.marriageClusterGroup)) {
				this.map.addLayer(this.marriageClusterGroup);
			} else if (!layers.marriages && this.map.hasLayer(this.marriageClusterGroup)) {
				this.map.removeLayer(this.marriageClusterGroup);
			}
		}

		// Burial markers
		if (this.burialClusterGroup) {
			if (layers.burials && !this.map.hasLayer(this.burialClusterGroup)) {
				this.map.addLayer(this.burialClusterGroup);
			} else if (!layers.burials && this.map.hasLayer(this.burialClusterGroup)) {
				this.map.removeLayer(this.burialClusterGroup);
			}
		}

		// Migration paths
		if (this.pathLayer) {
			if (layers.paths && !this.map.hasLayer(this.pathLayer)) {
				this.map.addLayer(this.pathLayer);
			} else if (!layers.paths && this.map.hasLayer(this.pathLayer)) {
				this.map.removeLayer(this.pathLayer);
			}
		}

		// Heat map
		if (this.heatLayer) {
			if (layers.heatMap && !this.map.hasLayer(this.heatLayer)) {
				this.map.addLayer(this.heatLayer);
			} else if (!layers.heatMap && this.map.hasLayer(this.heatLayer)) {
				this.map.removeLayer(this.heatLayer);
			}
		}
	}

	/**
	 * Set the map view center and zoom
	 */
	setView(center: { lat: number; lng: number }, zoom: number): void {
		this.map?.setView([center.lat, center.lng], zoom);
	}

	/**
	 * Set the active map (OpenStreetMap or custom image map)
	 */
	async setActiveMap(mapId: string): Promise<void> {
		if (!this.map) return;
		if (mapId === this.activeMapId) return;

		logger.debug('set-active-map', `Switching to map: ${mapId}`);

		// Remove current map layer
		if (mapId === 'openstreetmap') {
			// Switch to OpenStreetMap tiles
			if (this.currentImageOverlay) {
				this.map.removeLayer(this.currentImageOverlay);
				this.currentImageOverlay = null;
			}

			if (!this.tileLayer) {
				this.tileLayer = L.tileLayer(OSM_TILE_URL, {
					attribution: OSM_ATTRIBUTION,
					maxZoom: 19
				});
			}

			if (!this.map.hasLayer(this.tileLayer)) {
				this.tileLayer.addTo(this.map);
			}

			// Reset to default view
			this.map.setView(
				[this.settings.defaultCenter.lat, this.settings.defaultCenter.lng],
				this.settings.defaultZoom
			);
		} else {
			// Switch to custom image map
			if (this.tileLayer && this.map.hasLayer(this.tileLayer)) {
				this.map.removeLayer(this.tileLayer);
			}

			if (this.currentImageOverlay) {
				this.map.removeLayer(this.currentImageOverlay);
			}

			const overlay = await this.imageMapManager.createImageOverlay(mapId);
			if (overlay) {
				this.currentImageOverlay = overlay;
				overlay.addTo(this.map);

				// Set view to custom map bounds
				const bounds = this.imageMapManager.getMapBounds(mapId);
				if (bounds) {
					this.map.fitBounds(bounds);
				}

				// Optionally set to configured center/zoom
				const center = this.imageMapManager.getMapCenter(mapId);
				const zoom = this.imageMapManager.getDefaultZoom(mapId);
				if (center) {
					this.map.setView(center, zoom);
				}

				logger.info('set-active-map', `Switched to custom map: ${mapId}`);
			} else {
				logger.error('set-active-map', `Failed to load custom map: ${mapId}`);
				// Fall back to OSM
				await this.setActiveMap('openstreetmap');
				return;
			}
		}

		this.activeMapId = mapId;

		// Notify listeners of the map change
		if (this.onMapChangeCallback) {
			const universe = mapId === 'openstreetmap' ? null : this.imageMapManager.getMapUniverse(mapId);
			this.onMapChangeCallback(mapId, universe);
		}
	}

	/**
	 * Register a callback for when the active map changes
	 * The callback receives the new mapId and the universe (null for OpenStreetMap)
	 */
	onMapChange(callback: (mapId: string, universe: string | null) => void): void {
		this.onMapChangeCallback = callback;
	}

	/**
	 * Get available custom maps
	 */
	async getCustomMaps(): Promise<CustomMapConfig[]> {
		return this.imageMapManager.loadMapConfigs();
	}

	/**
	 * Get custom maps for a specific universe
	 */
	getCustomMapsForUniverse(universe: string): CustomMapConfig[] {
		return this.imageMapManager.getConfigsForUniverse(universe);
	}

	/**
	 * Get the currently active map ID
	 */
	getActiveMapId(): string {
		return this.activeMapId;
	}

	/**
	 * Fit map bounds to show all markers
	 */
	private fitBounds(): void {
		if (!this.map || !this.currentData) return;

		const markers = this.currentData.markers;
		if (markers.length === 0) return;

		const bounds = L.latLngBounds(
			markers.map(m => [m.lat, m.lng] as L.LatLngTuple)
		);

		this.map.fitBounds(bounds, { padding: [50, 50] });
	}

	/**
	 * Get current map state
	 */
	getState(): MapState {
		const center = this.map?.getCenter() || L.latLng(this.settings.defaultCenter.lat, this.settings.defaultCenter.lng);
		const zoom = this.map?.getZoom() || this.settings.defaultZoom;

		return {
			center: { lat: center.lat, lng: center.lng },
			zoom,
			filters: {},
			layers: this.currentLayers,
			activeMap: this.activeMapId,
			heatMapConfig: {
				includeTypes: ['birth', 'death'],
				blur: this.settings.heatMapBlur,
				radius: this.settings.heatMapRadius,
				maxIntensity: 1
			}
		};
	}

	/**
	 * Export current data as GeoJSON
	 */
	exportGeoJSON(): GeoJSONFeatureCollection {
		const features: GeoJSONFeatureCollection['features'] = [];

		if (!this.currentData) {
			return { type: 'FeatureCollection', features };
		}

		// Export markers
		for (const marker of this.currentData.markers) {
			features.push({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [marker.lng, marker.lat]  // GeoJSON uses lng, lat order
				},
				properties: {
					personId: marker.personId,
					personName: marker.personName,
					markerType: marker.type,
					date: marker.date,
					placeName: marker.placeName,
					collection: marker.collection
				}
			});
		}

		// Export paths
		for (const path of this.currentData.paths) {
			features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[path.origin.lng, path.origin.lat],
						[path.destination.lng, path.destination.lat]
					]
				},
				properties: {
					personId: path.personId,
					personName: path.personName,
					pathType: 'migration',
					origin: path.origin.name,
					destination: path.destination.name
				}
			});
		}

		return { type: 'FeatureCollection', features };
	}

	/**
	 * Export current view as SVG
	 */
	exportSVG(options: SVGExportOptions): string {
		const { width, height, includeLabels, includeLegend, includeCoordinates, title } = options;

		if (!this.currentData || !this.map) {
			return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" text-anchor="middle">No data</text></svg>`;
		}

		const bounds = this.map.getBounds();
		const markers = this.currentData.markers;
		const paths = this.currentData.paths;

		// Projection function: lat/lng to SVG coordinates
		const project = (lat: number, lng: number): { x: number; y: number } => {
			const x = ((lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest())) * (width - 100) + 50;
			const y = ((bounds.getNorth() - lat) / (bounds.getNorth() - bounds.getSouth())) * (height - 100) + 50;
			return { x, y };
		};

		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n`;

		// Title
		if (title) {
			svg += `  <title>${this.escapeXml(title)}</title>\n`;
		}

		// Bounding box
		svg += `  <rect x="50" y="50" width="${width - 100}" height="${height - 100}" fill="none" stroke="#ccc"/>\n`;

		// Coordinate labels
		if (includeCoordinates) {
			svg += `  <text x="50" y="45" font-size="10">${bounds.getNorth().toFixed(1)}°N, ${bounds.getWest().toFixed(1)}°${bounds.getWest() < 0 ? 'W' : 'E'}</text>\n`;
			svg += `  <text x="${width - 50}" y="${height - 55}" font-size="10" text-anchor="end">${bounds.getSouth().toFixed(1)}°N, ${bounds.getEast().toFixed(1)}°${bounds.getEast() < 0 ? 'W' : 'E'}</text>\n`;
		}

		// Migration paths
		for (const path of paths) {
			const start = project(path.origin.lat, path.origin.lng);
			const end = project(path.destination.lat, path.destination.lng);

			// Bezier curve for nicer paths
			const midX = (start.x + end.x) / 2;
			const midY = (start.y + end.y) / 2 - 30;

			svg += `  <path d="M ${start.x},${start.y} Q ${midX},${midY} ${end.x},${end.y}" stroke="${this.settings.pathColor}" stroke-width="2" fill="none"/>\n`;

			// Arrow head
			const angle = Math.atan2(end.y - midY, end.x - midX);
			const arrowSize = 8;
			const ax1 = end.x - arrowSize * Math.cos(angle - Math.PI / 6);
			const ay1 = end.y - arrowSize * Math.sin(angle - Math.PI / 6);
			const ax2 = end.x - arrowSize * Math.cos(angle + Math.PI / 6);
			const ay2 = end.y - arrowSize * Math.sin(angle + Math.PI / 6);
			svg += `  <polygon points="${end.x},${end.y} ${ax1},${ay1} ${ax2},${ay2}" fill="${this.settings.pathColor}"/>\n`;
		}

		// Markers
		for (const marker of markers) {
			const pos = project(marker.lat, marker.lng);
			const color = this.getMarkerColor(marker.type);

			svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="6" fill="${color}" stroke="white" stroke-width="1"/>\n`;

			if (includeLabels) {
				svg += `  <text x="${pos.x + 10}" y="${pos.y + 4}" font-size="10">${this.escapeXml(marker.placeName)}</text>\n`;
			}
		}

		// Legend
		if (includeLegend) {
			const legendY = height - 30;
			svg += `  <g transform="translate(50, ${legendY})">\n`;
			svg += `    <circle cx="10" cy="0" r="5" fill="${this.settings.birthMarkerColor}"/><text x="20" y="4" font-size="10">Birth</text>\n`;
			svg += `    <circle cx="80" cy="0" r="5" fill="${this.settings.deathMarkerColor}"/><text x="90" y="4" font-size="10">Death</text>\n`;
			svg += `    <line x1="150" y1="0" x2="170" y2="0" stroke="${this.settings.pathColor}" stroke-width="2"/><text x="175" y="4" font-size="10">Migration</text>\n`;
			svg += `  </g>\n`;
		}

		svg += '</svg>';

		return svg;
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	/**
	 * Destroy the map and clean up resources
	 */
	destroy(): void {
		logger.debug('destroy', 'Destroying map controller');

		this.birthClusterGroup?.clearLayers();
		this.deathClusterGroup?.clearLayers();
		this.marriageClusterGroup?.clearLayers();
		this.burialClusterGroup?.clearLayers();
		this.pathLayer?.clearLayers();

		// Clean up image map manager
		this.imageMapManager.destroy();
		this.currentImageOverlay = null;

		this.map?.remove();
		this.map = null;
	}
}
