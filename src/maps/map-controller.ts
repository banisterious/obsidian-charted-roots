/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Map Controller - Leaflet map management
 *
 * Handles Leaflet map initialization, layer management, and user interactions.
 */

import * as L from 'leaflet';

// Fix Leaflet's default marker icon path issue when bundled
// The default icon tries to load from incorrect paths in bundled environments
// We set an empty URL to prevent 404 errors for markers we don't use
// Our markers use L.divIcon which doesn't require external images
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
	iconUrl: '',
	iconRetinaUrl: '',
	shadowUrl: ''
});

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

import { setIcon, TFile, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { getLogger } from '../core/logging';
import { capitalize } from '../utils/format-utils';
import { getEventType } from '../events/types/event-types';
import type {
	MapData,
	MapMarker,
	PlaceMarker,
	MigrationPath,
	JourneyPath,
	MapSettings,
	MapState,
	LayerVisibility,
	GeoJSONFeatureCollection,
	SVGExportOptions,
	CRMarker,
	CRPolyline,
	CustomMapConfig
} from './types/map-types';
import { getMarkerColor, isMarkerTypeVisible, formatPopupDateRange } from './types/map-types';
import { ImageMapManager } from './image-map-manager';

const logger = getLogger('MapController');

// Tile URLs — CartoDB Voyager (doesn't require referrer header, unlike tile.openstreetmap.org)
const OSM_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

	// Unified cluster group for all event markers (birth, death, marriage, etc.)
	private eventClusterGroup: L.MarkerClusterGroup | null = null;
	// Cluster group for standalone place markers (not tied to person events)
	private placesClusterGroup: L.MarkerClusterGroup | null = null;
	private pathLayer: L.LayerGroup | null = null;
	private journeyLayer: L.LayerGroup | null = null;

	// Path-label registry (#482). Each entry tracks a visible polyline that
	// wants to display a text label and the layer it lives on, plus the
	// invisible host polyline that hosts the label (or null when the chosen
	// segment is too short for the text at the current zoom). Re-evaluated
	// on `zoomend` so labels reappear / disappear as the map zooms.
	private pathLabelEntries: Array<{
		sourcePolyline: L.Polyline;
		text: string;
		attributes: Record<string, string>;
		layer: L.LayerGroup;
		host: L.Polyline | null;
	}> = [];
	private zoomEndDebounceHandle: number | null = null;
	private heatLayer: L.Layer | null = null;
	private childMapOverlayLayer: L.LayerGroup | null = null;

	// Controls
	private fullscreenControl: L.Control | null = null;
	private miniMap: L.Control | null = null;
	private searchControl: L.Control | null = null;

	// Custom image maps
	private imageMapManager: ImageMapManager;
	private currentImageOverlay: L.ImageOverlay | null = null;
	private currentDistortableOverlay: L.DistortableImageOverlay | null = null;
	private activeMapId: string = 'openstreetmap';
	private currentCRS: 'geographic' | 'pixel' = 'geographic';
	private editModeEnabled: boolean = false;
	// Whether image alignment editing is active (vs just marker dragging)
	private imageAlignmentModeEnabled: boolean = false;

	// Region edit mode (#362) — interactive rectangle editing on the map
	private regionEditActive: boolean = false;
	private regionEditRect: L.Rectangle | null = null;
	private regionEditHandles: L.CircleMarker[] = [];
	private regionEditConfig: CustomMapConfig | null = null;
	private regionEditOriginalBounds: L.LatLngBounds | null = null;
	private regionEditToolbar: HTMLElement | null = null;
	private regionEditDragging: boolean = false;
	private regionEditDragStart: L.LatLng | null = null;
	private regionEditBoundsH: number = 0;

	// Current data
	private currentData: MapData | null = null;
	private currentLayers: LayerVisibility = {
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
		places: false
	};

	// Callback for when active map changes
	private onMapChangeCallback: ((mapId: string, universe: string | null) => void) | null = null;
	// Callback for when edit mode changes
	private onEditModeChangeCallback: ((enabled: boolean) => void) | null = null;
	// Callback for when corners are saved
	private onCornersSavedCallback: (() => void) | null = null;
	// Callback for place marker context menu (right-click)
	private onPlaceMarkerContextMenuCallback: ((placeId: string, placeName: string, event: MouseEvent) => void) | null = null;
	// Callback for when a place marker is dragged to a new position
	private onPlaceMarkerDraggedCallback: ((placeId: string, placeName: string, newCoords: { lat: number; lng: number; pixelX?: number; pixelY?: number }) => void) | null = null;

	constructor(container: HTMLElement, settings: MapSettings, plugin: CanvasRootsPlugin) {
		this.container = container;
		this.settings = settings;
		this.plugin = plugin;
		this.imageMapManager = new ImageMapManager(plugin.app, settings.customMapsFolder);
	}

	/**
	 * Update settings (e.g., when heat map intensity changes)
	 */
	updateSettings(settings: Partial<MapSettings>): void {
		Object.assign(this.settings, settings);
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

		// Add tile layer with no-referrer policy to avoid OSM blocking
		// (Obsidian's Electron sends app:// referrer which OSM rejects)
		const TileLayerNoRef = L.TileLayer.extend({
			createTile(coords: unknown, done: (err: Error | null, tile: HTMLImageElement) => void): HTMLImageElement {
				const tile = L.TileLayer.prototype.createTile.call(this, coords, done) as HTMLImageElement;
				tile.referrerPolicy = 'no-referrer';
				return tile;
			}
		});
		this.tileLayer = new TileLayerNoRef(OSM_TILE_URL, {
			attribution: OSM_ATTRIBUTION,
			maxZoom: 19
		}).addTo(this.map);

		// Initialize cluster groups
		this.initializeClusterGroups();

		// Initialize path layer (migration paths: birth → death)
		this.pathLayer = L.layerGroup().addTo(this.map);

		// Initialize journey layer (all life events connected chronologically)
		this.journeyLayer = L.layerGroup();  // Not added by default

		// Re-evaluate path labels on zoom changes so labels disappear when
		// the chosen segment is too short to fit the text and reappear when
		// the user zooms back in. Debounced so continuous zoom (mouse wheel,
		// pinch) doesn't thrash the registry. (#482)
		this.map.on('zoomend', () => {
			if (this.zoomEndDebounceHandle !== null) {
				window.clearTimeout(this.zoomEndDebounceHandle);
			}
			this.zoomEndDebounceHandle = window.setTimeout(() => {
				for (const entry of this.pathLabelEntries) {
					this.evaluatePathLabel(entry);
				}
				this.zoomEndDebounceHandle = null;
			}, 120);
		});

		// Initialize child map overlay layer (#361 Phase 3)
		this.childMapOverlayLayer = L.layerGroup().addTo(this.map);

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

		// Unified event cluster group — all marker types in one group so
		// overlapping birth/death markers at the same location cluster together (#343)
		this.eventClusterGroup = createMarkerClusterGroup({
			...clusterOptions,
			iconCreateFunction: (cluster) => this.createMixedClusterIcon(cluster)
		});
		this.eventClusterGroup.addTo(this.map);

		// Places cluster group (for standalone places not tied to person events)
		// Uses a distinct color (teal) to differentiate from event markers
		this.placesClusterGroup = createMarkerClusterGroup({
			...clusterOptions,
			iconCreateFunction: (cluster) => this.createClusterIcon(cluster, '#0891b2')
		});
		// Don't add to map by default - controlled by layer visibility
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
	 * Create a cluster icon colored by the dominant marker type in the cluster
	 */
	private createMixedClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
		const markers = cluster.getAllChildMarkers() as CRMarker[];
		const typeCounts: Record<string, number> = {};

		for (const m of markers) {
			const type = m.crData?.type || 'custom';
			typeCounts[type] = (typeCounts[type] || 0) + 1;
		}

		// Use the color of the most frequent marker type
		let dominantType = 'birth';
		let maxCount = 0;
		for (const [type, count] of Object.entries(typeCounts)) {
			if (count > maxCount) {
				maxCount = count;
				dominantType = type;
			}
		}

		const color = this.getMarkerColorForType(dominantType as import('./types/map-types').MarkerType);
		return this.createClusterIcon(cluster, color);
	}

	/**
	 * Initialize fullscreen control
	 */
	private initializeFullscreen(): void {
		if (!this.map) return;

		// @ts-expect-error - leaflet-fullscreen types not available
		this.fullscreenControl = L.control.fullscreen({
			position: 'topleft',
			// leaflet-fullscreen reads `options.title[isFullscreen]`; passing a
			// flat string yields `undefined` as the tooltip text (#446).
			title: {
				'false': 'Enter fullscreen',
				'true': 'Exit fullscreen'
			}
		}).addTo(this.map);
	}

	/**
	 * Initialize mini-map control
	 */
	private initializeMiniMap(): void {
		if (!this.map) return;

		const MiniTileLayer = L.TileLayer.extend({
			createTile(coords: unknown, done: (err: Error | null, tile: HTMLImageElement) => void): HTMLImageElement {
				const tile = L.TileLayer.prototype.createTile.call(this, coords, done) as HTMLImageElement;
				tile.referrerPolicy = 'no-referrer';
				return tile;
			}
		});
		const miniMapTiles = new MiniTileLayer(OSM_TILE_URL, {
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
		if (this.eventClusterGroup) {
			this.eventClusterGroup.eachLayer((layer) => {
				const marker = layer as CRMarker;
				if (marker.crData) {
					const searchMarker = L.marker([marker.crData.lat, marker.crData.lng], {
						opacity: 0,
						icon: L.divIcon({ className: 'cr-search-marker', iconSize: [1, 1] }),
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
			this.renderPlaceMarkers(data.placeMarkers);
			this.renderPaths(data.paths);
			this.renderJourneyPaths(data.journeyPaths);
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
	setFilteredData(markers: MapMarker[], paths: MigrationPath[], journeyPaths?: JourneyPath[]): void {
		try {
			this.renderMarkers(markers);
			this.renderPaths(paths);
			if (journeyPaths) {
				this.renderJourneyPaths(journeyPaths);
			}
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
		this.eventClusterGroup?.clearLayers();

		for (const marker of markers) {
			// Check if this marker type is visible before creating it
			if (!isMarkerTypeVisible(marker.type, this.currentLayers)) {
				continue;
			}

			const leafletMarker = this.createMarker(marker);
			this.eventClusterGroup?.addLayer(leafletMarker);
		}

		logger.debug('render-markers', `Rendered ${markers.length} markers`);
	}

	/**
	 * Render standalone place markers on the map
	 */
	private renderPlaceMarkers(placeMarkers: PlaceMarker[]): void {
		// Clear existing place markers
		this.placesClusterGroup?.clearLayers();

		if (!placeMarkers || placeMarkers.length === 0) {
			return;
		}

		for (const place of placeMarkers) {
			const leafletMarker = this.createPlaceMarker(place);
			this.placesClusterGroup?.addLayer(leafletMarker);
		}

		logger.debug('render-place-markers', `Rendered ${placeMarkers.length} place markers`);
	}

	/**
	 * Create a Leaflet marker from place marker data
	 * Uses hollow circle style and lower z-index to distinguish from event markers
	 */
	private createPlaceMarker(data: PlaceMarker): L.Marker {
		// Teal color for place markers
		const color = '#0891b2';
		const icon = this.createPlaceMarkerIcon(color);

		// Use pixel coordinates for pixel CRS, otherwise use lat/lng
		let coords: L.LatLngExpression;
		if (this.currentCRS === 'pixel' && data.pixelX !== undefined && data.pixelY !== undefined) {
			coords = [data.pixelY, data.pixelX];
		} else if (data.lat !== undefined && data.lng !== undefined) {
			coords = [data.lat, data.lng];
		} else {
			// No valid coordinates - skip
			return L.marker([0, 0], { icon });
		}

		// Make marker draggable when in edit mode
		// Use negative zIndexOffset so event markers render on top
		const marker = L.marker(coords, {
			icon,
			draggable: this.editModeEnabled,
			zIndexOffset: -1000
		});

		// Store place data on the marker for later use
		(marker as L.Marker & { placeData?: PlaceMarker }).placeData = data;

		// Create popup content
		const popupContent = this.createPlacePopupContent(data);
		marker.bindPopup(popupContent);

		// Add context menu (right-click) handler
		marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
			// Prevent default and stop propagation to avoid map's context menu
			L.DomEvent.preventDefault(e.originalEvent);
			L.DomEvent.stopPropagation(e.originalEvent);

			if (this.onPlaceMarkerContextMenuCallback) {
				this.onPlaceMarkerContextMenuCallback(data.placeId, data.placeName, e.originalEvent);
			}
		});

		// Add drag end handler
		marker.on('dragend', (e: L.DragEndEvent) => {
			const newLatLng = e.target.getLatLng();
			const newCoords: { lat: number; lng: number; pixelX?: number; pixelY?: number } = {
				lat: newLatLng.lat,
				lng: newLatLng.lng
			};

			// For pixel maps, convert to pixel coordinates
			if (this.currentCRS === 'pixel') {
				newCoords.pixelX = Math.round(newLatLng.lng);  // X is longitude
				newCoords.pixelY = Math.round(newLatLng.lat);  // Y is latitude
			}

			if (this.onPlaceMarkerDraggedCallback) {
				this.onPlaceMarkerDraggedCallback(data.placeId, data.placeName, newCoords);
			}
		});

		return marker;
	}

	/**
	 * Create popup content for a place marker
	 */
	private createPlacePopupContent(data: PlaceMarker): HTMLElement {
		const container = activeDocument.createElement('div');
		container.className = 'cr-map-popup';

		container.createEl('div', {
			cls: 'cr-map-popup-name',
			text: data.placeName
		});

		if (data.category) {
			container.createEl('div', {
				cls: 'cr-map-popup-type',
				text: capitalize(data.category)
			});
		}

		if (data.universe) {
			container.createEl('div', {
				cls: 'cr-map-popup-place',
				text: `Universe: ${data.universe}`
			});
		}

		// Open place note button
		const btnContainer = container.createEl('div', {
			cls: 'cr-map-popup-buttons'
		});

		const openPlaceBtn = btnContainer.createEl('button', {
			cls: 'cr-map-popup-btn',
			text: 'Open place'
		});
		openPlaceBtn.addEventListener('click', () => {
			this.openNoteById(data.placeId);
		});

		// Linked map drill-down button (#361)
		if (data.linkedMap) {
			const mapConfig = this.imageMapManager.getMapConfig(data.linkedMap);
			const mapName = mapConfig?.name || data.linkedMap;
			const openMapBtn = btnContainer.createEl('button', {
				cls: 'cr-map-popup-btn cr-map-popup-btn--secondary',
				text: `Open ${mapName} ↗`
			});
			openMapBtn.addEventListener('click', () => {
				void this.setActiveMap(data.linkedMap!);
			});
		}

		return container;
	}

	/**
	 * Create a Leaflet marker from map marker data
	 */
	private createMarker(data: MapMarker): CRMarker {
		const color = this.getMarkerColorForType(data.type);
		const icon = this.createMarkerIcon(color);

		// Use pixel coordinates for pixel CRS, otherwise use lat/lng
		let coords: L.LatLngExpression;
		if (this.currentCRS === 'pixel' && data.pixelX !== undefined && data.pixelY !== undefined) {
			// For L.CRS.Simple: [y, x] where y=0 is at bottom
			coords = [data.pixelY, data.pixelX];
		} else {
			coords = [data.lat, data.lng];
		}

		const marker = L.marker(coords, { icon }) as CRMarker;
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
			html: `<div class="cr-marker-dot" style="background-color: ${color};"></div>`,
			className: 'cr-marker-icon',
			iconSize: L.point(16, 16),
			iconAnchor: L.point(8, 8)
		});
	}

	/**
	 * Create a place marker icon - hollow circle style to distinguish from event markers
	 */
	private createPlaceMarkerIcon(color: string): L.DivIcon {
		return L.divIcon({
			html: `<div class="cr-place-marker-dot" style="border-color: ${color};"></div>`,
			className: 'cr-place-marker-icon',
			iconSize: L.point(14, 14),
			iconAnchor: L.point(7, 7)
		});
	}

	/**
	 * Find the longest segment of a polyline measured in screen-space (after
	 * CRS projection). Returns the segment's start/end LatLngs along with their
	 * screen-space points so callers can both rebuild a sub-polyline along that
	 * segment and inspect its direction. Returns null if the map isn't ready or
	 * the polyline has fewer than two points.
	 */
	private findLongestScreenSegment(polyline: L.Polyline): {
		start: L.LatLng;
		end: L.LatLng;
		screenStart: L.Point;
		screenEnd: L.Point;
	} | null {
		if (!this.map) return null;
		// `getLatLngs()` returns `LatLng[]` for simple polylines but `LatLng[][]`
		// for multi-polylines. Defensively flatten so the helper doesn't trip on
		// nested arrays.
		const raw = polyline.getLatLngs() as L.LatLng[] | L.LatLng[][];
		const latlngs = (Array.isArray(raw[0]) ? raw[0] : raw) as L.LatLng[];
		if (latlngs.length < 2) return null;

		let bestStart = latlngs[0];
		let bestEnd = latlngs[1];
		let bestScreenStart = this.map.latLngToLayerPoint(latlngs[0]);
		let bestScreenEnd = this.map.latLngToLayerPoint(latlngs[1]);
		let bestLen = bestScreenStart.distanceTo(bestScreenEnd);
		for (let i = 1; i < latlngs.length - 1; i++) {
			const sp = this.map.latLngToLayerPoint(latlngs[i]);
			const ep = this.map.latLngToLayerPoint(latlngs[i + 1]);
			const len = sp.distanceTo(ep);
			if (len > bestLen) {
				bestStart = latlngs[i];
				bestEnd = latlngs[i + 1];
				bestScreenStart = sp;
				bestScreenEnd = ep;
				bestLen = len;
			}
		}

		return { start: bestStart, end: bestEnd, screenStart: bestScreenStart, screenEnd: bestScreenEnd };
	}

	/**
	 * Estimate the rendered pixel-width of a text label at a given font-size.
	 * Approximation: `text.length * fontSize * 0.6` for typical sans-serif
	 * fonts. Slightly conservative (overestimates a hair) so labels start
	 * disappearing a touch before they actually overflow the segment. Used
	 * by `evaluatePathLabel` to decide whether the chosen segment can fit
	 * the label at the current zoom. (#482)
	 */
	private estimateTextWidth(text: string, fontSize: string | undefined): number {
		const px = fontSize ? parseFloat(fontSize) : 11;
		const safePx = Number.isFinite(px) && px > 0 ? px : 11;
		return text.length * safePx * 0.6;
	}

	/**
	 * Decide whether a registered path label should be visible at the current
	 * zoom and add / remove its host polyline accordingly. Re-runs on
	 * `zoomend` so labels reappear when the user zooms in and disappear when
	 * the segment becomes too short to fit the text without overflowing.
	 * (#482)
	 */
	private evaluatePathLabel(entry: typeof this.pathLabelEntries[number]): void {
		const seg = this.findLongestScreenSegment(entry.sourcePolyline);
		const textWidth = this.estimateTextWidth(entry.text, entry.attributes['font-size']);
		const segmentLength = seg ? seg.screenStart.distanceTo(seg.screenEnd) : 0;
		const shouldShow = seg !== null && segmentLength >= textWidth;

		if (shouldShow && !entry.host) {
			// Newly fits — create + add the host.
			const host = L.polyline([seg.start, seg.end], {
				opacity: 0,
				weight: 0,
				interactive: false
			});
			const flipOpts = seg.screenEnd.x < seg.screenStart.x
				? { orientation: 'flip' as const }
				: {};
			host.setText(entry.text, {
				center: true,
				offset: -5,
				...flipOpts,
				attributes: entry.attributes
			});
			entry.layer.addLayer(host);
			entry.host = host;
		} else if (!shouldShow && entry.host) {
			// No longer fits — remove the host so the label doesn't overflow.
			entry.layer.removeLayer(entry.host);
			entry.host = null;
		}
	}

	/**
	 * Register a text label that should ride along the longest screen-space
	 * segment of a source polyline. The label rides on a separate invisible
	 * "label-host" polyline rather than being attached directly to the source
	 * — leaflet-textpath repeats labels along multi-segment paths and applies
	 * a single global rotation, so any path that bends in different directions
	 * has at least one segment rendering the label upside-down (#472). Hosting
	 * the label on a single chosen segment side-steps the orientation issue
	 * entirely.
	 *
	 * The host polyline is created on demand by `evaluatePathLabel`, which
	 * also handles zoom-aware suppression: when the chosen segment is too
	 * short for the rendered text at the current zoom, the host isn't
	 * created (or is removed if present), so the text doesn't overflow past
	 * the path endpoints (#482). Re-evaluated on `zoomend`.
	 *
	 * Per #477, `orientation` is omitted when no flip is needed so
	 * leaflet-textpath skips its rotation block entirely.
	 */
	private addPathLabel(
		sourcePolyline: L.Polyline,
		text: string,
		attributes: Record<string, string>,
		layer: L.LayerGroup
	): void {
		// Apply contrasting outline for legibility on colorful / dark backgrounds (#483).
		// `paint-order: stroke fill` paints the stroke behind the fill so the outline
		// surrounds the glyph instead of fattening it from the inside.
		const finalAttributes = { ...attributes };
		const stroke = this.settings.pathLabelStroke;
		if (stroke && stroke !== 'none') {
			finalAttributes['paint-order'] = 'stroke fill';
			finalAttributes['stroke'] = stroke;
			finalAttributes['stroke-width'] = '2';
			finalAttributes['stroke-linejoin'] = 'round';
		}

		const entry = {
			sourcePolyline,
			text,
			attributes: finalAttributes,
			layer,
			host: null as L.Polyline | null
		};
		this.pathLabelEntries.push(entry);
		this.evaluatePathLabel(entry);
	}

	/**
	 * Get marker color based on type
	 */
	private getMarkerColorForType(type: MapMarker['type']): string {
		return getMarkerColor(type, this.settings);
	}

	/**
	 * Create popup content for a marker
	 */
	private createPopupContent(data: MapMarker): HTMLElement {
		const container = activeDocument.createElement('div');
		container.className = 'cr-map-popup';

		container.createEl('div', {
			cls: 'cr-map-popup-name',
			text: data.personName
		});

		// Alt name (#347)
		if (data.altName) {
			container.createEl('div', {
				cls: 'cr-map-popup-alt-name',
				text: data.altName
			});
		}

		// Multi-participant event — list co-participants beneath the primary
		// name so the popup reflects all attendees rather than rendering one
		// stacked marker per participant (#493). For marriage markers, the
		// partner's age at the marriage is appended to their entry when the
		// spouse note has a resolvable birth date — paralleling the
		// journey-mode partner-age treatment from #504, on the static-popup
		// surface (#508).
		if (data.participants && data.participants.length > 1) {
			const others = data.participants.filter(p => p.personName !== data.personName);
			if (others.length > 0) {
				const list = container.createEl('div', { cls: 'cr-map-popup-participants' });
				list.createEl('span', {
					text: 'with ',
					cls: 'cr-map-popup-participants-prefix'
				});
				const dateService = this.plugin.getDateService();
				others.forEach((p, idx) => {
					let entryText = p.personName;
					if (
						data.type === 'marriage' &&
						data.spouseBirthDate &&
						data.date &&
						p.personName === data.spouseName
					) {
						const age = dateService?.calculateAge(
							data.spouseBirthDate,
							data.date,
							data.universe
						);
						if (age && !age.error && age.years >= 0) {
							entryText = `${p.personName} (age ${age.years})`;
						}
					}
					list.createEl('span', { text: entryText, cls: 'cr-map-popup-participant' });
					if (idx < others.length - 1) {
						list.createEl('span', { text: ', ' });
					}
				});
			}
		}

		// Get event type info and icon mode
		const iconMode = this.settings.eventIconMode || 'text';
		const showIcon = iconMode === 'icon' || iconMode === 'both';
		const showText = iconMode === 'text' || iconMode === 'both';

		const eventType = getEventType(
			data.type,
			this.settings.customEventTypes || [],
			this.settings.showBuiltInEventTypes !== false
		);

		// Event type row with optional icon
		const typeRow = container.createEl('div', {
			cls: 'cr-map-popup-type'
		});

		if (showIcon && eventType) {
			const iconSpan = typeRow.createEl('span', {
				cls: 'cr-map-popup-type-icon'
			});
			setIcon(iconSpan, eventType.icon);
			// Use event type color for map popup icons (per design decisions)
			iconSpan.style.setProperty('color', eventType.color);
		}

		// Format the date row: render duration ranges as `from – to` and append
		// `(age N)` for non-birth events when birth-date data resolves a non-negative
		// age via DateService (handles fictional eras the same way the journey-mode
		// rich popup does — see #434 / #439). Birth events suppress the age
		// annotation since age 0 is redundant alongside the birth date itself.
		const dateRange = formatPopupDateRange(data.date, data.dateTo);
		let ageSuffix = '';
		if (data.type !== 'birth' && data.birthDate && data.date) {
			const dateService = this.plugin.getDateService();
			const age = dateService?.calculateAge(data.birthDate, data.date, data.universe);
			if (age && !age.error && age.years >= 0) {
				ageSuffix = ` (age ${age.years})`;
			}
		}
		const dateText = dateRange ? `: ${dateRange}${ageSuffix}` : '';
		if (showText) {
			// For `custom`-resolved events, surface the original raw event type
			// (or event-note title) instead of the generic `Custom:` label so
			// the popup carries category context (#466).
			const typeLabel = data.type === 'custom' && data.customLabel
				? capitalize(data.customLabel)
				: capitalize(data.type);
			typeRow.createEl('span', {
				text: `${typeLabel}${dateText}`
			});
		} else if (dateRange) {
			// Icon-only mode: still show the date (with range and age, when applicable)
			typeRow.createEl('span', {
				text: `${dateRange}${ageSuffix}`
			});
		}

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
		// Drop label registry entries for the cleared layer so we don't leak
		// stale source-polyline references on re-render. (#482)
		this.pathLabelEntries = this.pathLabelEntries.filter(e => e.layer !== this.pathLayer);

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
		let latlngs: L.LatLngExpression[];

		// Use pixel coordinates for pixel CRS, otherwise use lat/lng
		if (this.currentCRS === 'pixel' &&
			data.origin.pixelX !== undefined && data.origin.pixelY !== undefined &&
			data.destination.pixelX !== undefined && data.destination.pixelY !== undefined) {
			// For L.CRS.Simple: [y, x] where y=0 is at bottom
			latlngs = [
				[data.origin.pixelY, data.origin.pixelX],
				[data.destination.pixelY, data.destination.pixelX]
			];
		} else {
			latlngs = [
				[data.origin.lat, data.origin.lng],
				[data.destination.lat, data.destination.lng]
			];
		}

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
				LPolylineDecorator(polyline, {
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

		// Add text label along the path (person name) via a label-host polyline
		// that covers only the longest screen-space segment. See `addPathLabel`
		// for why we don't `setText` on the visible polyline directly (#472)
		// and how zoom-aware suppression handles the segment-too-short case
		// at low zoom (#482).
		if (this.settings.showPathLabels && this.pathLayer) {
			try {
				this.addPathLabel(polyline, data.personName, {
					fill: this.settings.pathColor,
					'font-size': '11px',
					'font-weight': '500'
				}, this.pathLayer);
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
		const container = activeDocument.createElement('div');
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
	 * Render journey paths on the map (all life events connected chronologically)
	 */
	private renderJourneyPaths(journeyPaths: JourneyPath[]): void {
		if (!this.journeyLayer) return;

		this.journeyLayer.clearLayers();
		// Drop label registry entries for the cleared layer so we don't leak
		// stale source-polyline references on re-render. (#482)
		this.pathLabelEntries = this.pathLabelEntries.filter(e => e.layer !== this.journeyLayer);

		for (const journey of journeyPaths) {
			// Need at least 2 waypoints to draw a path
			if (journey.waypoints.length < 2) continue;

			const polyline = this.createJourneyPath(journey);
			this.journeyLayer.addLayer(polyline);

			// Add arrow decorations between waypoints
			this.addJourneyArrows(journey, this.journeyLayer);
		}

		logger.debug('render-journeys', `Rendered ${journeyPaths.length} journey paths`);
	}

	/**
	 * Create a polyline for a journey path
	 */
	private createJourneyPath(journey: JourneyPath): L.Polyline {
		// Build array of coordinates from waypoints
		const latlngs: L.LatLngExpression[] = journey.waypoints.map(wp => {
			if (this.currentCRS === 'pixel' && wp.pixelX !== undefined && wp.pixelY !== undefined) {
				return [wp.pixelY, wp.pixelX] as L.LatLngTuple;
			}
			return [wp.lat, wp.lng] as L.LatLngTuple;
		});

		const polyline = L.polyline(latlngs, {
			color: journey.color || this.settings.journeyPathColor,
			weight: journey.weight ?? this.settings.journeyPathWeight,
			opacity: journey.opacity ?? 0.7,
			dashArray: '5, 5'  // Dashed line to distinguish from migration paths
		});

		// Add text label along the path (person name) via a label-host polyline
		// that covers only the longest screen-space segment. See `addPathLabel`
		// for the rationale (#472, #482).
		if (this.settings.showJourneyLabels && this.journeyLayer) {
			try {
				this.addPathLabel(polyline, journey.personName, {
					fill: journey.color || this.settings.journeyPathColor,
					'font-size': '11px',
					'font-weight': '500'
				}, this.journeyLayer);
			} catch (e) {
				logger.warn('textpath-journey', 'Could not add text label to journey path', { error: e });
			}
		}

		// Bind popup to the polyline
		polyline.bindPopup(this.createJourneyPopup(journey));

		return polyline;
	}

	/**
	 * Add arrow decorations between journey waypoints
	 */
	private addJourneyArrows(journey: JourneyPath, layer: L.LayerGroup): void {
		try {
			// @ts-expect-error - leaflet-polylinedecorator types not fully available
			const LPolylineDecorator = L.polylineDecorator;
			// @ts-expect-error - leaflet-polylinedecorator Symbol types not available
			const LSymbol = L.Symbol;

			if (!LPolylineDecorator || !LSymbol) return;

			// Build coordinates from waypoints
			const latlngs = journey.waypoints.map(wp => {
				if (this.currentCRS === 'pixel' && wp.pixelX !== undefined && wp.pixelY !== undefined) {
					return L.latLng(wp.pixelY, wp.pixelX);
				}
				return L.latLng(wp.lat, wp.lng);
			});

			// Create decorator for arrows at each segment midpoint
			const decorator = LPolylineDecorator(latlngs, {
				patterns: [
					{
						offset: '50%',
						repeat: 0,
						symbol: LSymbol.arrowHead({
							pixelSize: 8,
							polygon: false,
							pathOptions: {
								color: journey.color || this.settings.journeyPathColor,
								weight: journey.weight ?? this.settings.journeyPathWeight
							}
						})
					}
				]
			});

			layer.addLayer(decorator);
		} catch (e) {
			logger.warn('journey-arrows', 'Could not add arrow decorations to journey path', { error: e });
		}
	}

	/**
	 * Create popup content for a journey path
	 */
	private createJourneyPopup(journey: JourneyPath): HTMLElement {
		const container = activeDocument.createElement('div');
		container.className = 'cr-map-popup cr-journey-popup';

		const nameEl = container.createEl('div', { cls: 'cr-map-popup-name' });
		nameEl.textContent = journey.personName;
		if (journey.relationshipLabel) {
			nameEl.createEl('span', {
				cls: 'cr-map-popup-relationship',
				text: ` (${journey.relationshipLabel})`
			});
		}

		// Show journey summary
		const firstWp = journey.waypoints[0];
		const lastWp = journey.waypoints[journey.waypoints.length - 1];
		container.createEl('div', {
			cls: 'cr-map-popup-migration',
			text: `${journey.waypoints.length} locations: ${firstWp.name} → ... → ${lastWp.name}`
		});

		// Show years if available
		if (journey.birthYear || journey.deathYear) {
			const yearText = journey.birthYear && journey.deathYear
				? `${journey.birthYear} – ${journey.deathYear}`
				: journey.birthYear
					? `Born ${journey.birthYear}`
					: `Died ${journey.deathYear}`;
			container.createEl('div', {
				cls: 'cr-map-popup-years',
				text: yearText
			});
		}

		// List waypoints
		const waypointList = container.createEl('div', {
			cls: 'cr-journey-waypoints'
		});

		for (const wp of journey.waypoints) {
			const wpEl = waypointList.createEl('div', {
				cls: 'cr-journey-waypoint'
			});

			const eventLabel = capitalize(wp.eventType);
			const dateText = wp.year ? ` (${wp.year})` : '';
			wpEl.createEl('span', {
				cls: 'cr-journey-waypoint-event',
				text: `${eventLabel}${dateText}: `
			});
			wpEl.createEl('span', {
				cls: 'cr-journey-waypoint-place',
				text: wp.name
			});
		}

		// Button to open person note
		const openBtn = container.createEl('button', {
			cls: 'cr-map-popup-btn',
			text: 'Open person'
		});
		openBtn.addEventListener('click', () => {
			this.openNoteById(journey.personId);
		});

		// Switch-to-journey button for family overlay paths
		if (journey.relationshipLabel) {
			const switchBtn = container.createEl('button', {
				cls: 'cr-map-popup-btn cr-map-popup-btn--switch',
				text: `Switch to ${journey.personName}'s journey`
			});
			switchBtn.addEventListener('click', () => {
				container.dispatchEvent(new CustomEvent('cr-switch-journey', {
					detail: { personId: journey.personId, personName: journey.personName },
					bubbles: true
				}));
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

		// Create heat data points using appropriate coordinates
		const filteredMarkers = markers.filter(m => m.type === 'birth' || m.type === 'death');

		// Use per-point intensity of 1 — let leaflet.heat handle relative density
		const heatData: [number, number, number][] = filteredMarkers
			.filter(m => {
				if (this.currentCRS === 'pixel') {
					return m.pixelX !== undefined && m.pixelY !== undefined;
				}
				return m.lat !== undefined && m.lng !== undefined;
			})
			.map(m => {
				if (this.currentCRS === 'pixel') {
					return [m.pixelY!, m.pixelX!, 1] as [number, number, number];
				}
				return [m.lat, m.lng, 1] as [number, number, number];
			});

		if (heatData.length === 0) return;

		// Intensity presets from settings (customizable by user)
		const intensityLevel = this.settings.heatMapIntensity || 'medium';
		const presets = this.settings.heatMapPresets;
		const preset = presets[intensityLevel];
		const intensityConfig = {
			radiusMul: preset.radius,
			blurMul: preset.blur,
			minOpacity: preset.opacity
		};

		// Try to create heat layer (may fail if library not loaded properly)
		try {
			// @ts-expect-error - leaflet.heat types not available
			const LHeatLayer = L.heatLayer;
			if (LHeatLayer) {
				// For pixel maps, zoom levels are much lower (often 0-3),
				// so maxZoom must be relative to the current map zoom.
				// Radius and blur also need to be larger since pixel maps
				// cover much more area per screen pixel.
				const isPixel = this.currentCRS === 'pixel';
				const currentZoom = this.map?.getZoom() ?? 2;
				const maxZoom = isPixel
					? currentZoom + 1
					: 15;
				const baseRadius = isPixel ? 50 : this.settings.heatMapRadius;
				const baseBlur = isPixel ? 25 : this.settings.heatMapBlur;

				// On custom maps the heat layer needs to render above the image
				// overlay. Route it through a custom pane whose stacking order
				// is set in CSS (`.leaflet-cr-heat-pane` in map-view.css).
				if (isPixel && this.map && !this.map.getPane('cr-heat-pane')) {
					this.map.createPane('cr-heat-pane');
				}

				this.heatLayer = LHeatLayer(heatData, {
					radius: Math.round(baseRadius * intensityConfig.radiusMul),
					blur: Math.round(baseBlur * intensityConfig.blurMul),
					maxZoom,
					minOpacity: isPixel
						? Math.min(intensityConfig.minOpacity + 0.05, 0.3)
						: intensityConfig.minOpacity,
					max: 1.0,
					...(isPixel ? { pane: 'cr-heat-pane' } : {})
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
	/**
	 * Render clickable overlay regions for child maps on the parent map (#361 Phase 3)
	 */
	renderChildMapOverlays(mapId: string): void {
		if (!this.childMapOverlayLayer || !this.map) return;
		this.childMapOverlayLayer.clearLayers();

		if (mapId === 'openstreetmap') return;
		if (!this.currentLayers.childMaps) return;

		// Find ALL child maps (with or without parent_region)
		const allChildren = this.imageMapManager.getAllChildMaps(mapId);
		if (allChildren.length === 0) return;

		// Get parent map's bounds height for Y-axis flipping in pixel CRS.
		// Region coordinates are stored in bounds space (Y=0 at top),
		// but Leaflet Simple CRS has Y=0 at bottom, so we need to flip.
		const parentConfig = this.imageMapManager.getMapConfig(mapId);
		const boundsH = parentConfig
			? Math.abs(parentConfig.bounds.topLeft.y - parentConfig.bounds.bottomRight.y)
			: 0;

		for (const config of allChildren) {
			const region = config.parentRegion;

			// Render overlay rectangle if region is defined
			if (region) {
				let bounds: L.LatLngBounds;
				if (this.currentCRS === 'pixel' && boundsH > 0) {
					// Flip Y: image y=0 is top, Leaflet lat=0 is bottom
					const leafletTop = boundsH - region.y;
					const leafletBottom = boundsH - (region.y + region.h);
					bounds = L.latLngBounds(
						L.latLng(leafletBottom, region.x),
						L.latLng(leafletTop, region.x + region.w)
					);
				} else {
					bounds = L.latLngBounds(
						L.latLng(region.y, region.x),
						L.latLng(region.y + region.h, region.x + region.w)
					);
				}

				const rect = L.rectangle(bounds, {
					color: '#4a90d9',
					weight: 2,
					opacity: 0.7,
					fillColor: '#4a90d9',
					fillOpacity: 0.1,
					dashArray: '6, 4',
					className: 'cr-map-child-overlay',
					pane: 'overlayPane' // Renders below markers
				});

				rect.bindTooltip(config.name, {
					sticky: true,
					className: 'cr-map-child-overlay-tooltip'
				});

				rect.on('click', () => {
					void this.setActiveMap(config.id);
				});

				rect.on('mouseover', () => {
					rect.setStyle({ fillOpacity: 0.25, weight: 3 });
				});
				rect.on('mouseout', () => {
					rect.setStyle({ fillOpacity: 0.1, weight: 2 });
				});

				this.childMapOverlayLayer.addLayer(rect);
			}

			// Render child map marker
			const markerPos = this.getChildMapMarkerPosition(config, boundsH);
			const markerIcon = L.divIcon({
				html: `<div class="cr-child-map-marker"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg></div>`,
				className: 'cr-child-map-marker-icon',
				iconSize: L.point(28, 28),
				iconAnchor: L.point(14, 14)
			});

			const marker = L.marker(markerPos, { icon: markerIcon });

			// Popup with map name, open button, and region edit button
			const popupContent = activeDocument.createElement('div');
			popupContent.className = 'cr-map-popup';
			popupContent.createEl('div', { cls: 'cr-map-popup-name', text: config.name });
			popupContent.createEl('div', { cls: 'cr-map-popup-type', text: 'Child map' });
			const btnContainer = popupContent.createDiv({ cls: 'cr-map-popup-buttons' });
			const openBtn = btnContainer.createEl('button', { cls: 'cr-map-popup-btn', text: 'Open map' });
			openBtn.addEventListener('click', () => {
				void this.setActiveMap(config.id);
			});
			const regionBtn = btnContainer.createEl('button', {
				cls: 'cr-map-popup-btn cr-map-popup-btn--secondary',
				text: config.parentRegion ? 'Edit region' : 'Draw region'
			});
			regionBtn.addEventListener('click', () => {
				this.map?.closePopup();
				this.enterRegionEditMode(config);
			});

			marker.bindPopup(popupContent);
			this.childMapOverlayLayer.addLayer(marker);
		}

		logger.debug('child-overlays', `Rendered ${allChildren.length} child map overlays/markers on ${mapId}`);
	}

	/**
	 * Get the marker position for a child map (#362)
	 */
	private getChildMapMarkerPosition(config: import('./types/map-types').CustomMapConfig, boundsHeight: number): L.LatLngExpression {
		if (config.parentRegion) {
			const r = config.parentRegion;
			const cx = r.x + r.w / 2;
			const cy = r.y + r.h / 2;
			if (this.currentCRS === 'pixel' && boundsHeight > 0) {
				// Flip Y: bounds y=0 is top, Leaflet lat=0 is bottom
				return [boundsHeight - cy, cx];
			}
			return [cy, cx];
		}
		// Fallback: center of the parent map
		const center = this.map?.getCenter();
		return center ? [center.lat, center.lng] : [0, 0];
	}

	// ========================================================================
	// Region Edit Mode (#362)
	// Interactive rectangle editing directly on the Leaflet map
	// ========================================================================

	/**
	 * Enter region edit mode for a child map.
	 * Creates an editable rectangle on the parent map that can be dragged and resized.
	 */
	enterRegionEditMode(childConfig: CustomMapConfig): void {
		if (!this.map || this.regionEditActive) return;

		this.regionEditActive = true;
		this.regionEditConfig = childConfig;

		const parentConfig = this.imageMapManager.getMapConfig(this.activeMapId);
		this.regionEditBoundsH = parentConfig
			? Math.abs(parentConfig.bounds.topLeft.y - parentConfig.bounds.bottomRight.y)
			: 0;

		// Calculate initial rectangle bounds
		let bounds: L.LatLngBounds;
		if (childConfig.parentRegion) {
			bounds = this.regionToBounds(childConfig.parentRegion);
		} else {
			// Default: rectangle at center of current view, ~25% of viewport
			const mapBounds = this.map.getBounds();
			const center = this.map.getCenter();
			const latSpan = (mapBounds.getNorth() - mapBounds.getSouth()) * 0.25;
			const lngSpan = (mapBounds.getEast() - mapBounds.getWest()) * 0.25;
			bounds = L.latLngBounds(
				[center.lat - latSpan / 2, center.lng - lngSpan / 2],
				[center.lat + latSpan / 2, center.lng + lngSpan / 2]
			);
		}

		this.regionEditOriginalBounds = bounds;

		// Hide the normal child map overlays while editing
		if (this.childMapOverlayLayer && this.map.hasLayer(this.childMapOverlayLayer)) {
			this.map.removeLayer(this.childMapOverlayLayer);
		}

		// Create the editable rectangle
		this.regionEditRect = L.rectangle(bounds, {
			color: '#4a90d9',
			weight: 2,
			opacity: 0.9,
			fillColor: '#4a90d9',
			fillOpacity: 0.15,
			dashArray: '6, 4',
			interactive: true
		}).addTo(this.map);

		// Create resize handles at corners
		this.createRegionEditHandles();

		// Setup drag behavior on the rectangle
		this.setupRegionEditDrag();

		// Create the floating toolbar
		this.createRegionEditToolbar(childConfig.name);

		// Disable map dragging when interacting with the rectangle
		logger.debug('region-edit', `Entered region edit mode for "${childConfig.name}"`);
	}

	/**
	 * Exit region edit mode without saving
	 */
	exitRegionEditMode(): void {
		if (!this.map) return;

		// Remove rectangle
		if (this.regionEditRect) {
			this.map.removeLayer(this.regionEditRect);
			this.regionEditRect = null;
		}

		// Remove handles
		for (const handle of this.regionEditHandles) {
			this.map.removeLayer(handle);
		}
		this.regionEditHandles = [];

		// Remove toolbar
		if (this.regionEditToolbar) {
			this.regionEditToolbar.remove();
			this.regionEditToolbar = null;
		}

		this.regionEditActive = false;
		this.regionEditConfig = null;
		this.regionEditOriginalBounds = null;
		this.regionEditDragging = false;
		this.regionEditDragStart = null;

		// Re-show child map overlays
		if (this.childMapOverlayLayer && this.currentLayers.childMaps) {
			this.childMapOverlayLayer.addTo(this.map);
			this.renderChildMapOverlays(this.activeMapId);
		}

		logger.debug('region-edit', 'Exited region edit mode');
	}

	/**
	 * Save the current region edit and exit
	 */
	private async saveRegionEdit(): Promise<void> {
		if (!this.regionEditRect || !this.regionEditConfig) return;

		const bounds = this.regionEditRect.getBounds();
		const region = this.boundsToRegion(bounds);

		// Find the child map's file
		const sourcePath = this.regionEditConfig.sourcePath;
		if (!sourcePath) {
			new Notice('Cannot save: child map file path not found');
			this.exitRegionEditMode();
			return;
		}

		const file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) {
			new Notice('Cannot save: child map file not found');
			this.exitRegionEditMode();
			return;
		}

		// Save to frontmatter
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			fm.parent_region_x = region.x;
			fm.parent_region_y = region.y;
			fm.parent_region_w = region.w;
			fm.parent_region_h = region.h;
		});

		const childName = this.regionEditConfig.name;

		// Reload map configs BEFORE exiting edit mode so the re-render picks up the new region
		this.imageMapManager.loadMapConfigs();

		new Notice(`Region saved for "${childName}"`);
		this.exitRegionEditMode();
	}

	/**
	 * Convert bounds-space region coords to Leaflet bounds
	 */
	private regionToBounds(region: { x: number; y: number; w: number; h: number }): L.LatLngBounds {
		if (this.currentCRS === 'pixel' && this.regionEditBoundsH > 0) {
			const leafletTop = this.regionEditBoundsH - region.y;
			const leafletBottom = this.regionEditBoundsH - (region.y + region.h);
			return L.latLngBounds(
				L.latLng(leafletBottom, region.x),
				L.latLng(leafletTop, region.x + region.w)
			);
		}
		return L.latLngBounds(
			L.latLng(region.y, region.x),
			L.latLng(region.y + region.h, region.x + region.w)
		);
	}

	/**
	 * Convert Leaflet bounds back to bounds-space region coords
	 */
	private boundsToRegion(bounds: L.LatLngBounds): { x: number; y: number; w: number; h: number } {
		const sw = bounds.getSouthWest();
		const ne = bounds.getNorthEast();

		if (this.currentCRS === 'pixel' && this.regionEditBoundsH > 0) {
			// Flip Y back: Leaflet lat → bounds-space y (Y=0 at top)
			const y = this.regionEditBoundsH - ne.lat;
			const h = ne.lat - sw.lat;
			return {
				x: Math.round(sw.lng),
				y: Math.round(y),
				w: Math.round(ne.lng - sw.lng),
				h: Math.round(h)
			};
		}
		return {
			x: Math.round(sw.lng),
			y: Math.round(sw.lat),
			w: Math.round(ne.lng - sw.lng),
			h: Math.round(ne.lat - sw.lat)
		};
	}

	/**
	 * Create draggable corner handles for the region edit rectangle
	 */
	private createRegionEditHandles(): void {
		if (!this.map || !this.regionEditRect) return;

		const bounds = this.regionEditRect.getBounds();
		const corners = [
			{ pos: bounds.getSouthWest(), cursor: 'nesw-resize', idx: 0 },
			{ pos: bounds.getNorthWest(), cursor: 'nwse-resize', idx: 1 },
			{ pos: bounds.getNorthEast(), cursor: 'nesw-resize', idx: 2 },
			{ pos: bounds.getSouthEast(), cursor: 'nwse-resize', idx: 3 }
		];

		for (const corner of corners) {
			const handle = L.circleMarker(corner.pos, {
				radius: 6,
				color: '#ffffff',
				fillColor: '#4a90d9',
				fillOpacity: 1,
				weight: 2,
				className: `cr-region-handle cr-region-handle--${corner.cursor}`
			}).addTo(this.map);

			this.setupHandleDrag(handle, corner.idx);
			this.regionEditHandles.push(handle);
		}
	}

	/**
	 * Update handle positions to match current rectangle bounds
	 */
	private updateRegionEditHandles(): void {
		if (!this.regionEditRect || this.regionEditHandles.length !== 4) return;

		const bounds = this.regionEditRect.getBounds();
		const positions = [
			bounds.getSouthWest(),
			bounds.getNorthWest(),
			bounds.getNorthEast(),
			bounds.getSouthEast()
		];

		for (let i = 0; i < 4; i++) {
			this.regionEditHandles[i].setLatLng(positions[i]);
		}
	}

	/**
	 * Setup drag behavior for a corner resize handle
	 * idx: 0=SW, 1=NW, 2=NE, 3=SE
	 */
	private setupHandleDrag(handle: L.CircleMarker, idx: number): void {
		if (!this.map) return;

		let dragging = false;
		const map = this.map;

		const onMouseDown = (e: L.LeafletMouseEvent) => {
			dragging = true;
			map.dragging.disable();
			L.DomEvent.stopPropagation(e.originalEvent);
		};

		const onMouseMove = (e: L.LeafletMouseEvent) => {
			if (!dragging || !this.regionEditRect) return;

			const latlng = e.latlng;
			const bounds = this.regionEditRect.getBounds();
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();

			let newBounds: L.LatLngBounds;
			const minSize = 10; // Minimum size in map units

			switch (idx) {
				case 0: // SW
					newBounds = L.latLngBounds(
						L.latLng(Math.min(latlng.lat, ne.lat - minSize), Math.min(latlng.lng, ne.lng - minSize)),
						ne
					);
					break;
				case 1: // NW
					newBounds = L.latLngBounds(
						L.latLng(sw.lat, Math.min(latlng.lng, ne.lng - minSize)),
						L.latLng(Math.max(latlng.lat, sw.lat + minSize), ne.lng)
					);
					break;
				case 2: // NE
					newBounds = L.latLngBounds(
						sw,
						L.latLng(Math.max(latlng.lat, sw.lat + minSize), Math.max(latlng.lng, sw.lng + minSize))
					);
					break;
				case 3: // SE
					newBounds = L.latLngBounds(
						L.latLng(Math.min(latlng.lat, ne.lat - minSize), sw.lng),
						L.latLng(ne.lat, Math.max(latlng.lng, sw.lng + minSize))
					);
					break;
				default:
					return;
			}

			this.regionEditRect.setBounds(newBounds);
			this.updateRegionEditHandles();
		};

		const onMouseUp = () => {
			if (!dragging) return;
			dragging = false;
			map.dragging.enable();
		};

		handle.on('mousedown', onMouseDown);
		map.on('mousemove', onMouseMove);
		map.on('mouseup', onMouseUp);
	}

	/**
	 * Setup drag behavior on the rectangle body (move the whole region)
	 */
	private setupRegionEditDrag(): void {
		if (!this.map || !this.regionEditRect) return;

		const map = this.map;
		const rect = this.regionEditRect;

		rect.on('mousedown', (e: L.LeafletMouseEvent) => {
			this.regionEditDragging = true;
			this.regionEditDragStart = e.latlng;
			map.dragging.disable();
			L.DomEvent.stopPropagation(e.originalEvent);
		});

		map.on('mousemove', (e: L.LeafletMouseEvent) => {
			if (!this.regionEditDragging || !this.regionEditDragStart || !this.regionEditRect) return;

			const latDiff = e.latlng.lat - this.regionEditDragStart.lat;
			const lngDiff = e.latlng.lng - this.regionEditDragStart.lng;

			const bounds = this.regionEditRect.getBounds();
			const newBounds = L.latLngBounds(
				L.latLng(bounds.getSouth() + latDiff, bounds.getWest() + lngDiff),
				L.latLng(bounds.getNorth() + latDiff, bounds.getEast() + lngDiff)
			);

			this.regionEditRect.setBounds(newBounds);
			this.updateRegionEditHandles();
			this.regionEditDragStart = e.latlng;
		});

		map.on('mouseup', () => {
			if (this.regionEditDragging) {
				this.regionEditDragging = false;
				this.regionEditDragStart = null;
				map.dragging.enable();
			}
		});
	}

	/**
	 * Create the floating save/cancel toolbar for region editing
	 */
	private createRegionEditToolbar(childMapName: string): void {
		const toolbar = activeDocument.createElement('div');
		toolbar.className = 'cr-region-edit-toolbar';

		toolbar.createEl('span', {
			cls: 'cr-region-edit-toolbar__label',
			text: `Editing region for "${childMapName}"`
		});

		const btnGroup = toolbar.createDiv({ cls: 'cr-region-edit-toolbar__buttons' });

		const cancelBtn = btnGroup.createEl('button', {
			cls: 'cr-region-edit-toolbar__btn',
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			this.exitRegionEditMode();
		});

		const saveBtn = btnGroup.createEl('button', {
			cls: 'cr-region-edit-toolbar__btn cr-region-edit-toolbar__btn--save',
			text: 'Save region'
		});
		saveBtn.addEventListener('click', () => {
			void this.saveRegionEdit();
		});

		this.container.appendChild(toolbar);
		this.regionEditToolbar = toolbar;
	}

	setLayerVisibility(layers: LayerVisibility): void {
		if (!this.map) return;

		this.currentLayers = layers;

		// Re-render event markers with updated visibility filters
		// All event types share a single cluster group (#343),
		// so we re-render to add/remove individual markers
		if (this.currentData) {
			this.renderMarkers(this.currentData.markers);
		}

		// Migration paths (birth → death)
		if (this.pathLayer) {
			if (layers.paths && !this.map.hasLayer(this.pathLayer)) {
				this.map.addLayer(this.pathLayer);
			} else if (!layers.paths && this.map.hasLayer(this.pathLayer)) {
				this.map.removeLayer(this.pathLayer);
			}
		}

		// Journey paths (all life events connected chronologically)
		if (this.journeyLayer) {
			if (layers.journeys && !this.map.hasLayer(this.journeyLayer)) {
				this.map.addLayer(this.journeyLayer);
			} else if (!layers.journeys && this.map.hasLayer(this.journeyLayer)) {
				this.map.removeLayer(this.journeyLayer);
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

		// Standalone places
		if (this.placesClusterGroup) {
			if (layers.places && !this.map.hasLayer(this.placesClusterGroup)) {
				this.map.addLayer(this.placesClusterGroup);
			} else if (!layers.places && this.map.hasLayer(this.placesClusterGroup)) {
				this.map.removeLayer(this.placesClusterGroup);
			}
		}

		// Child map overlays (#362)
		if (this.childMapOverlayLayer) {
			if (layers.childMaps && !this.map.hasLayer(this.childMapOverlayLayer)) {
				this.map.addLayer(this.childMapOverlayLayer);
			} else if (!layers.childMaps && this.map.hasLayer(this.childMapOverlayLayer)) {
				this.map.removeLayer(this.childMapOverlayLayer);
			}
			// Re-render overlays when toggling on (in case map changed)
			if (layers.childMaps && this.activeMapId) {
				this.renderChildMapOverlays(this.activeMapId);
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

		// Determine if we need to switch CRS
		const targetCRS = mapId === 'openstreetmap'
			? 'geographic'
			: this.imageMapManager.getCoordinateSystem(mapId);

		// If CRS is changing, we need to recreate the map
		if (targetCRS !== this.currentCRS) {
			await this.switchCRS(mapId, targetCRS);
			return;
		}

		// Same CRS - just switch layers
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
			// Switch to custom image map (same CRS)
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

		// Render child map overlay regions (#361 Phase 3)
		this.renderChildMapOverlays(mapId);

		// Notify listeners of the map change
		if (this.onMapChangeCallback) {
			const universe = mapId === 'openstreetmap' ? null : this.imageMapManager.getMapUniverse(mapId);
			this.onMapChangeCallback(mapId, universe);
		}
	}

	/**
	 * Switch the map's coordinate reference system
	 * This requires destroying and recreating the map since Leaflet doesn't allow CRS changes
	 */
	private async switchCRS(mapId: string, targetCRS: 'geographic' | 'pixel'): Promise<void> {
		logger.debug('switch-crs', `Switching CRS from ${this.currentCRS} to ${targetCRS}`);

		// Save current data to restore after map recreation
		const savedData = this.currentData;
		const savedLayers = { ...this.currentLayers };

		// Clean up existing map layers
		this.eventClusterGroup?.clearLayers();
		this.pathLayer?.clearLayers();
		this.journeyLayer?.clearLayers();

		if (this.heatLayer && this.map) {
			this.map.removeLayer(this.heatLayer);
			this.heatLayer = null;
		}

		// Exit region edit mode if active
		if (this.regionEditActive) {
			this.exitRegionEditMode();
		}

		this.childMapOverlayLayer?.clearLayers();
		this.childMapOverlayLayer = null;

		if (this.currentImageOverlay && this.map) {
			this.map.removeLayer(this.currentImageOverlay);
			this.currentImageOverlay = null;
		}

		if (this.tileLayer && this.map) {
			this.map.removeLayer(this.tileLayer);
		}

		// Clean up controls before destroying the map to avoid stale references
		if (this.miniMap && this.map) {
			this.map.removeControl(this.miniMap);
		}
		if (this.fullscreenControl && this.map) {
			this.map.removeControl(this.fullscreenControl);
		}
		if (this.searchControl && this.map) {
			this.map.removeControl(this.searchControl);
		}

		// Destroy the old map
		this.map?.remove();
		this.map = null;
		this.eventClusterGroup = null;
		this.pathLayer = null;
		this.journeyLayer = null;
		// Drop the label registry entirely — its source-polyline references
		// belonged to the destroyed map and the zoom debounce handle is dead.
		this.pathLabelEntries = [];
		if (this.zoomEndDebounceHandle !== null) {
			window.clearTimeout(this.zoomEndDebounceHandle);
			this.zoomEndDebounceHandle = null;
		}
		this.fullscreenControl = null;
		this.miniMap = null;
		this.searchControl = null;

		// Create new map with appropriate CRS
		const mapConfig = mapId === 'openstreetmap' ? null : this.imageMapManager.getMapConfig(mapId);

		const mapOptions: L.MapOptions = {
			zoomControl: true
		};

		if (targetCRS === 'pixel') {
			// Use Simple CRS for pixel coordinates
			mapOptions.crs = L.CRS.Simple;
			mapOptions.minZoom = mapConfig?.minZoom ?? -2;
			mapOptions.maxZoom = mapConfig?.maxZoom ?? 4;
		}

		this.map = L.map(this.container, mapOptions);
		this.currentCRS = targetCRS;

		// Set up layers based on new CRS
		if (targetCRS === 'geographic') {
			// Geographic mode - add OSM tiles or custom image overlay
			if (mapId === 'openstreetmap') {
				this.tileLayer = L.tileLayer(OSM_TILE_URL, {
					attribution: OSM_ATTRIBUTION,
					maxZoom: 19
				}).addTo(this.map);

				this.map.setView(
					[this.settings.defaultCenter.lat, this.settings.defaultCenter.lng],
					this.settings.defaultZoom
				);
			} else {
				// Geographic mode custom map
				const overlay = await this.imageMapManager.createImageOverlay(mapId);
				if (overlay) {
					this.currentImageOverlay = overlay;
					overlay.addTo(this.map);

					const bounds = this.imageMapManager.getMapBounds(mapId);
					if (bounds) {
						this.map.fitBounds(bounds);
					}
				}
			}
		} else {
			// Pixel mode - add custom image overlay
			const overlay = await this.imageMapManager.createImageOverlay(mapId);
			if (overlay) {
				this.currentImageOverlay = overlay;
				overlay.addTo(this.map);

				const bounds = this.imageMapManager.getMapBounds(mapId);
				if (bounds) {
					this.map.fitBounds(bounds);
				}

				// Set to configured center/zoom
				const center = this.imageMapManager.getMapCenter(mapId);
				const zoom = this.imageMapManager.getDefaultZoom(mapId);
				if (center) {
					this.map.setView(center, zoom);
				}
			}
		}

		// Reinitialize cluster groups and layers
		this.initializeClusterGroups();
		this.pathLayer = L.layerGroup().addTo(this.map);
		this.journeyLayer = L.layerGroup();  // Not added by default
		this.childMapOverlayLayer = L.layerGroup().addTo(this.map);

		// Reinitialize controls
		this.initializeFullscreen();
		// Only add mini-map for geographic CRS (doesn't make sense for pixel maps)
		if (targetCRS === 'geographic') {
			this.initializeMiniMap();
		}
		this.initializeSearch();

		this.activeMapId = mapId;

		// Restore data and layer visibility
		if (savedData) {
			this.setData(savedData);
		}
		this.setLayerVisibility(savedLayers);

		// Render child map overlay regions (#361 Phase 3)
		this.renderChildMapOverlays(mapId);

		// Notify listeners
		if (this.onMapChangeCallback) {
			const universe = mapId === 'openstreetmap' ? null : this.imageMapManager.getMapUniverse(mapId);
			this.onMapChangeCallback(mapId, universe);
		}

		logger.info('switch-crs', `CRS switched to ${targetCRS} for map: ${mapId}`);
	}

	/**
	 * Get the current coordinate reference system
	 */
	getCurrentCRS(): 'geographic' | 'pixel' {
		return this.currentCRS;
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
	getCustomMaps(): CustomMapConfig[] {
		return this.imageMapManager.loadMapConfigs();
	}

	/**
	 * Reload the in-memory map-config cache from disk. Needed when an Edit
	 * Map save (or a universe-rename cascade) writes a map note's frontmatter
	 * after the controller has already loaded its configs — without a reload
	 * `getActiveMapUniverse()` keeps returning the stale value (#503).
	 */
	reloadMapConfigs(): void {
		this.imageMapManager.loadMapConfigs();
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
	 * Get the universe associated with the current active map
	 * Returns null for OpenStreetMap (real world)
	 */
	getActiveMapUniverse(): string | null {
		if (this.activeMapId === 'openstreetmap') {
			return null;
		}
		return this.imageMapManager.getMapUniverse(this.activeMapId);
	}

	/**
	 * Get the parent map ID for the given map (#361)
	 */
	getParentMapId(mapId: string): string | undefined {
		return this.imageMapManager.getParentMapId(mapId);
	}

	/**
	 * Get the map configuration for a given map ID (#361)
	 */
	getMapConfig(mapId: string): CustomMapConfig | undefined {
		return this.imageMapManager.getMapConfig(mapId);
	}

	/**
	 * Get the underlying Leaflet map instance
	 * Useful for attaching event handlers or coordinate transformations
	 */
	getLeafletMap(): L.Map | null {
		return this.map;
	}

	/**
	 * Convert a mouse event to map coordinates
	 * For geographic maps, returns lat/lng
	 * For pixel maps, returns pixel x/y coordinates
	 */
	mouseEventToCoordinates(event: MouseEvent): { lat: number; lng: number; pixelX?: number; pixelY?: number } | null {
		if (!this.map) return null;

		const latlng = this.map.mouseEventToLatLng(event);

		if (this.currentCRS === 'pixel') {
			// For pixel maps, latlng values represent pixel coordinates
			// In L.CRS.Simple: lat = Y, lng = X (Y=0 at bottom, increases upward)
			// We store Y directly since markers use [pixelY, pixelX] format
			return {
				lat: latlng.lat,
				lng: latlng.lng,
				pixelX: Math.round(latlng.lng),  // X is longitude
				pixelY: Math.round(latlng.lat)   // Y is latitude (no negation needed)
			};
		}

		// Geographic map - return lat/lng
		return {
			lat: latlng.lat,
			lng: latlng.lng
		};
	}

	// ========================================================================
	// Edit Mode (Distortable Image) Methods
	// ========================================================================

	/**
	 * Check if the current map supports edit mode (distortable images)
	 * Only custom image maps can be edited, not OpenStreetMap
	 */
	canEnableEditMode(): boolean {
		return this.activeMapId !== 'openstreetmap';
	}

	/**
	 * Check if edit mode is currently enabled
	 */
	isEditModeEnabled(): boolean {
		return this.editModeEnabled;
	}

	/**
	 * Toggle edit mode for the current custom map
	 * In edit mode, the map image becomes distortable (can be dragged, rotated, scaled)
	 */
	async toggleEditMode(): Promise<boolean> {
		if (!this.map) return false;

		if (this.editModeEnabled) {
			await this.disableEditMode();
			return false;
		} else {
			return this.enableImageAlignmentMode();
		}
	}

	/**
	 * Enable marker-only edit mode (markers draggable, but no image alignment)
	 * This keeps the normal map view while allowing marker repositioning
	 */
	enableMarkerEditMode(): boolean {
		if (!this.map || this.activeMapId === 'openstreetmap') {
			logger.warn('marker-edit-mode', 'Cannot enable marker edit mode: no custom map active');
			return false;
		}

		if (this.editModeEnabled) {
			logger.debug('marker-edit-mode', 'Edit mode already enabled');
			return true;
		}

		this.editModeEnabled = true;
		this.imageAlignmentModeEnabled = false;

		// Update place marker draggability
		this.updatePlaceMarkerDraggability();

		// Notify listeners
		if (this.onEditModeChangeCallback) {
			this.onEditModeChangeCallback(true);
		}

		logger.info('marker-edit-mode', 'Marker edit mode enabled');
		return true;
	}

	/**
	 * Check if image alignment mode is currently active
	 */
	isImageAlignmentModeEnabled(): boolean {
		return this.imageAlignmentModeEnabled;
	}

	/**
	 * Enable full edit mode - replace image overlay with distortable overlay for alignment
	 */
	async enableImageAlignmentMode(): Promise<boolean> {
		if (!this.map || this.activeMapId === 'openstreetmap') {
			logger.warn('edit-mode', 'Cannot enable edit mode: no custom map active');
			return false;
		}

		if (this.imageAlignmentModeEnabled) {
			logger.debug('edit-mode', 'Image alignment mode already enabled');
			return true;
		}

		try {
			// Remove current regular image overlay
			if (this.currentImageOverlay) {
				this.map.removeLayer(this.currentImageOverlay);
				this.currentImageOverlay = null;
			}

			// Create distortable overlay
			const distortableOverlay = await this.imageMapManager.createDistortableOverlay(this.activeMapId);
			if (!distortableOverlay) {
				logger.error('edit-mode', 'Failed to create distortable overlay');
				// Restore regular overlay
				await this.restoreRegularOverlay();
				return false;
			}

			// Add the 'ldi' class to the map container for distortable CSS to work
			this.container.classList.add('ldi');

			this.currentDistortableOverlay = distortableOverlay;

			// Check if corners are already pre-set (for maps with saved corners)
			const corners = distortableOverlay.getCorners?.();
			const hasPrestClearedCorners = corners && corners.length === 4;

			logger.debug('edit-mode', `Corners check: hasCorners=${!!corners}, length=${corners?.length}, valid=${hasPrestClearedCorners}`);
			if (corners) {
				logger.debug('edit-mode', `Corner 0: lat=${corners[0]?.lat}, lng=${corners[0]?.lng}`);
			}

			if (hasPrestClearedCorners) {
				// Corners are pre-set, we can add to map and then manually enable editing
				logger.debug('edit-mode', 'Taking happy path with pre-set corners');
				distortableOverlay.addTo(this.map);

				// After adding to map, verify corners are still set
				const cornersAfterAdd = distortableOverlay.getCorners?.();
				logger.debug('edit-mode', `Corners after addTo: hasCorners=${!!cornersAfterAdd}, length=${cornersAfterAdd?.length}`);

				// Overlay was created with editable:false, so we need to manually enable
				// Use a delay to ensure the image has loaded and library is fully initialized
				window.setTimeout(() => {
					// Check corners again before enabling
					const cornersBeforeEnable = distortableOverlay.getCorners?.();
					logger.debug('edit-mode', `Corners before enable: hasCorners=${!!cornersBeforeEnable}, length=${cornersBeforeEnable?.length}`);

					// Enable editing - set the flag and call enable()
					distortableOverlay.editable = true;
					if (distortableOverlay.editing) {
						distortableOverlay.editing.enable();
						logger.debug('edit-mode', 'Called editing.enable()');
					}

					// Verify corners still valid before select
					const cornersBeforeSelect = distortableOverlay.getCorners?.();
					logger.debug('edit-mode', `Corners right before select: length=${cornersBeforeSelect?.length}`);
					if (cornersBeforeSelect && cornersBeforeSelect.length >= 3) {
						logger.debug('edit-mode', `Corner[2] lat=${cornersBeforeSelect[2]?.lat}, lng=${cornersBeforeSelect[2]?.lng}`);
					}

					// Toolbar is suppressed, so just show the handles for corner manipulation
					// The select() call is what triggers _addToolbar() which causes the error
					// With suppressToolbar: true, we just need the handles visible
					logger.debug('edit-mode', 'Editing enabled - handles should be visible (toolbar suppressed)');
				}, 200);  // Longer delay to ensure image loads
			} else {
				// No pre-set corners - need to wait for image load and _initImageDimensions
				// Wrap select to prevent errors during initialization
				const originalSelect = distortableOverlay.select.bind(distortableOverlay);
				let cornersReady = false;

				// Override select method to prevent errors during initialization
				// The library type allows this reassignment through the interface
				distortableOverlay.select = function(this: L.DistortableImageOverlay, e?: Event) {
					if (!cornersReady) {
						logger.debug('edit-mode', 'Ignoring select() call - corners not ready yet');
						if (e) {
							L.DomEvent.stopPropagation(e);
						}
						return this;
					}
					return originalSelect(e);
				};

				distortableOverlay.addTo(this.map);

				// Poll for corners to be ready
				const waitForCorners = () => {
					let attempts = 0;
					const maxAttempts = 50;

					const checkCorners = () => {
						attempts++;
						const currentCorners = distortableOverlay.getCorners?.();
						const cornersValid = currentCorners &&
							currentCorners.length === 4 &&
							currentCorners.every((c: L.LatLng | null | undefined) =>
								c && typeof c.lat === 'number' && !isNaN(c.lat)
							);

						if (cornersValid) {
							cornersReady = true;
							distortableOverlay.editable = true;
							if (distortableOverlay.editing) {
								distortableOverlay.editing.enable();
							}
							distortableOverlay.select();
							logger.debug('edit-mode', 'Distortable overlay corners ready, editing enabled');
						} else if (attempts < maxAttempts) {
							window.setTimeout(checkCorners, 100);
						} else {
							logger.warn('edit-mode', 'Timed out waiting for corners to initialize');
						}
					};

					window.setTimeout(checkCorners, 50);
				};

				waitForCorners();
			}

			this.editModeEnabled = true;
			this.imageAlignmentModeEnabled = true;

			// Update place marker draggability
			this.updatePlaceMarkerDraggability();

			// Notify listeners
			if (this.onEditModeChangeCallback) {
				this.onEditModeChangeCallback(true);
			}

			logger.info('edit-mode', `Image alignment mode enabled for ${this.activeMapId}`);
			return true;
		} catch (error) {
			logger.error('edit-mode-error', 'Failed to enable edit mode', { error });
			// Try to restore regular overlay
			await this.restoreRegularOverlay();
			return false;
		}
	}

	/**
	 * Legacy method - calls enableImageAlignmentMode for backwards compatibility
	 * @deprecated Use enableMarkerEditMode() or enableImageAlignmentMode() instead
	 */
	async enableEditMode(): Promise<boolean> {
		return this.enableImageAlignmentMode();
	}

	/**
	 * Disable edit mode - restore normal map view
	 */
	async disableEditMode(): Promise<void> {
		if (!this.map || !this.editModeEnabled) return;

		try {
			// Only restore image overlay if we were in image alignment mode
			if (this.imageAlignmentModeEnabled) {
				// Remove distortable overlay
				if (this.currentDistortableOverlay) {
					// Safely deselect and disable editing
					if (typeof this.currentDistortableOverlay.deselect === 'function') {
						try {
							this.currentDistortableOverlay.deselect();
						} catch {
							// Ignore deselect errors
						}
					}
					if (this.currentDistortableOverlay.editing) {
						try {
							this.currentDistortableOverlay.editing.disable();
						} catch {
							// Ignore disable errors
						}
					}
					this.map.removeLayer(this.currentDistortableOverlay);
					this.currentDistortableOverlay = null;
				}

				// Remove the 'ldi' class from the map container
				this.container.classList.remove('ldi');

				// Restore regular overlay
				await this.restoreRegularOverlay();
			}

			this.editModeEnabled = false;
			this.imageAlignmentModeEnabled = false;

			// Update place marker draggability
			this.updatePlaceMarkerDraggability();

			// Notify listeners
			if (this.onEditModeChangeCallback) {
				this.onEditModeChangeCallback(false);
			}

			logger.info('edit-mode', 'Edit mode disabled');
		} catch (error) {
			logger.error('edit-mode-error', 'Failed to disable edit mode', { error });
		}
	}

	/**
	 * Save the current distortable overlay corners to frontmatter
	 */
	async saveEditedCorners(): Promise<boolean> {
		if (!this.currentDistortableOverlay || !this.editModeEnabled) {
			logger.warn('save-corners', 'No distortable overlay active');
			return false;
		}

		try {
			const corners = this.currentDistortableOverlay.getCorners();
			const success = await this.imageMapManager.saveCorners(this.activeMapId, corners);

			if (success && this.onCornersSavedCallback) {
				this.onCornersSavedCallback();
			}

			return success;
		} catch (error) {
			logger.error('save-corners-error', 'Failed to save corners', { error });
			return false;
		}
	}

	/**
	 * Restore the current distortable overlay to its original position
	 */
	restoreOverlay(): void {
		if (this.currentDistortableOverlay && this.editModeEnabled) {
			this.currentDistortableOverlay.restore();
			logger.debug('edit-mode', 'Restored overlay to original position');
		}
	}

	/**
	 * Restore the regular (non-distortable) image overlay
	 */
	private async restoreRegularOverlay(): Promise<void> {
		if (!this.map || this.activeMapId === 'openstreetmap') return;

		const overlay = await this.imageMapManager.createImageOverlay(this.activeMapId);
		if (overlay) {
			this.currentImageOverlay = overlay;
			overlay.addTo(this.map);
		}
	}

	/**
	 * Register a callback for when edit mode changes
	 */
	onEditModeChange(callback: (enabled: boolean) => void): void {
		this.onEditModeChangeCallback = callback;
	}

	/**
	 * Register a callback for when corners are saved
	 */
	onCornersSaved(callback: () => void): void {
		this.onCornersSavedCallback = callback;
	}

	/**
	 * Register a callback for place marker context menu (right-click)
	 */
	onPlaceMarkerContextMenu(callback: (placeId: string, placeName: string, event: MouseEvent) => void): void {
		this.onPlaceMarkerContextMenuCallback = callback;
	}

	/**
	 * Register a callback for when a place marker is dragged to a new position
	 */
	onPlaceMarkerDragged(callback: (placeId: string, placeName: string, newCoords: { lat: number; lng: number; pixelX?: number; pixelY?: number }) => void): void {
		this.onPlaceMarkerDraggedCallback = callback;
	}

	/**
	 * Update the draggable state of all place markers
	 * Called when edit mode is toggled
	 */
	private updatePlaceMarkerDraggability(): void {
		if (!this.placesClusterGroup) return;

		this.placesClusterGroup.eachLayer((layer) => {
			if (layer instanceof L.Marker) {
				if (this.editModeEnabled) {
					layer.dragging?.enable();
				} else {
					layer.dragging?.disable();
				}
			}
		});

		logger.debug('marker-draggability', `Updated place marker draggability: ${this.editModeEnabled}`);
	}

	/**
	 * Reset map alignment by clearing saved corners from frontmatter
	 * This removes any custom alignment and returns the map to default rectangular bounds
	 */
	async resetAlignment(): Promise<boolean> {
		if (!this.activeMapId || this.activeMapId === 'openstreetmap') {
			logger.warn('reset-alignment', 'Cannot reset alignment: no custom map active');
			return false;
		}

		try {
			// Clear corners from frontmatter
			const success = await this.imageMapManager.clearCorners(this.activeMapId);
			if (!success) {
				return false;
			}

			// If in edit mode, disable it first
			if (this.editModeEnabled) {
				await this.disableEditMode();
			}

			// Reload the map to apply default bounds
			await this.setActiveMap(this.activeMapId);

			logger.info('reset-alignment', `Reset alignment for map ${this.activeMapId}`);
			return true;
		} catch (error) {
			logger.error('reset-alignment-error', 'Failed to reset alignment', { error });
			return false;
		}
	}

	/**
	 * Fit map bounds to show all markers
	 */
	private fitBounds(): void {
		if (!this.map || !this.currentData) return;

		const markers = this.currentData.markers;
		if (markers.length === 0) return;

		// Create bounds using appropriate coordinates
		const coords = markers.map(m => {
			if (this.currentCRS === 'pixel' && m.pixelX !== undefined && m.pixelY !== undefined) {
				return [m.pixelY, m.pixelX] as L.LatLngTuple;
			}
			return [m.lat, m.lng] as L.LatLngTuple;
		});

		const bounds = L.latLngBounds(coords);
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
			const color = this.getMarkerColorForType(marker.type);

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

		this.eventClusterGroup?.clearLayers();
		this.pathLayer?.clearLayers();
		this.journeyLayer?.clearLayers();

		// Clean up distortable overlay if active
		if (this.currentDistortableOverlay && this.map) {
			try {
				if (typeof this.currentDistortableOverlay.deselect === 'function') {
					this.currentDistortableOverlay.deselect();
				}
				if (this.currentDistortableOverlay.editing) {
					this.currentDistortableOverlay.editing.disable();
				}
				this.map.removeLayer(this.currentDistortableOverlay);
			} catch {
				// Ignore cleanup errors
			}
			this.currentDistortableOverlay = null;
		}

		// Clean up image map manager
		this.imageMapManager.destroy();
		this.currentImageOverlay = null;

		this.map?.remove();
		this.map = null;
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- Match scope of file-level disable at top. */
