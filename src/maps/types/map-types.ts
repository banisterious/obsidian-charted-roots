/**
 * Type definitions for Canvas Roots Map View
 */

import type * as L from 'leaflet';

// ============================================================================
// Core Map Data Types
// ============================================================================

/**
 * Types of markers displayed on the map
 */
export type MarkerType = 'birth' | 'death' | 'marriage' | 'burial' | 'residence';

/**
 * A marker representing a person's life event location
 */
export interface MapMarker {
	/** cr_id of the person */
	personId: string;
	/** Display name of the person */
	personName: string;
	/** Type of life event */
	type: MarkerType;
	/** Latitude coordinate */
	lat: number;
	/** Longitude coordinate */
	lng: number;
	/** Name of the place */
	placeName: string;
	/** cr_id of the place note (if linked) */
	placeId?: string;
	/** Date of the event (ISO format) */
	date?: string;
	/** Year extracted from date (for filtering) */
	year?: number;
	/** Collection the person belongs to */
	collection?: string;
	/** Universe for fictional places */
	universe?: string;
	/** Place category (real, fictional, etc.) */
	placeCategory?: string;
}

/**
 * A migration path connecting birth to death location
 */
export interface MigrationPath {
	/** cr_id of the person */
	personId: string;
	/** Display name of the person */
	personName: string;
	/** Origin location (typically birth) */
	origin: {
		lat: number;
		lng: number;
		name: string;
	};
	/** Destination location (typically death) */
	destination: {
		lat: number;
		lng: number;
		name: string;
	};
	/** Birth year for filtering */
	birthYear?: number;
	/** Death year for filtering */
	deathYear?: number;
	/** Collection the person belongs to */
	collection?: string;
	/** Universe for fictional places */
	universe?: string;
}

/**
 * Aggregated path for routes shared by multiple people
 */
export interface AggregatedPath extends MigrationPath {
	/** Number of people who traveled this route */
	count: number;
	/** List of person IDs who traveled this route */
	personIds: string[];
	/** List of person names who traveled this route */
	personNames: string[];
}

// ============================================================================
// Custom Image Map Types
// ============================================================================

/**
 * Configuration for a custom image map (fictional worlds)
 */
export interface CustomMapConfig {
	/** Unique identifier for this map */
	id: string;
	/** Display name */
	name: string;
	/** Universe this map belongs to */
	universe: string;
	/** Path to the map image in the vault */
	imagePath: string;
	/** Coordinate bounds for the image */
	bounds: {
		/** Top-left corner */
		topLeft: { x: number; y: number };
		/** Bottom-right corner */
		bottomRight: { x: number; y: number };
	};
	/** Optional center point for initial view */
	center?: { x: number; y: number };
	/** Optional initial zoom level */
	defaultZoom?: number;
}

// ============================================================================
// Filter and Display Options
// ============================================================================

/**
 * Filter options for map display
 */
export interface MapFilters {
	/** Filter by collection name */
	collection?: string;
	/** Filter by universe (for fictional maps) */
	universe?: string;
	/** Minimum year (inclusive) */
	yearFrom?: number;
	/** Maximum year (inclusive) */
	yearTo?: number;
	/** Place categories to include */
	placeCategories?: string[];
	/** Marker types to show */
	markerTypes?: MarkerType[];
}

/**
 * Layer visibility toggles
 */
export interface LayerVisibility {
	/** Show birth markers */
	births: boolean;
	/** Show death markers */
	deaths: boolean;
	/** Show marriage markers */
	marriages: boolean;
	/** Show burial markers */
	burials: boolean;
	/** Show migration paths */
	paths: boolean;
	/** Show heat map layer */
	heatMap: boolean;
}

/**
 * Heat map configuration
 */
export interface HeatMapConfig {
	/** Which marker types to include in heat map */
	includeTypes: MarkerType[];
	/** Blur radius */
	blur: number;
	/** Point radius */
	radius: number;
	/** Maximum intensity */
	maxIntensity: number;
}

/**
 * Time slider state for "who was alive" animation
 */
export interface TimeSliderState {
	/** Whether the time slider is enabled */
	enabled: boolean;
	/** Currently selected year */
	currentYear: number;
	/** Whether animation is playing */
	isPlaying: boolean;
	/** Animation speed in milliseconds per year */
	speed: number;
	/** Show only people alive at current year (vs cumulative) */
	snapshotMode: boolean;
}

// ============================================================================
// Map State
// ============================================================================

/**
 * Current state of the map view
 */
export interface MapState {
	/** Current center coordinates */
	center: { lat: number; lng: number };
	/** Current zoom level */
	zoom: number;
	/** Active filters */
	filters: MapFilters;
	/** Layer visibility */
	layers: LayerVisibility;
	/** Currently active map (OSM or custom map ID) */
	activeMap: 'openstreetmap' | string;
	/** Heat map configuration */
	heatMapConfig: HeatMapConfig;
}

/**
 * Person life span data for time slider filtering
 */
export interface PersonLifeSpan {
	/** cr_id of the person */
	personId: string;
	/** Display name */
	personName: string;
	/** Birth year (undefined if unknown) */
	birthYear?: number;
	/** Death year (undefined if still alive or unknown) */
	deathYear?: number;
	/** Collection the person belongs to */
	collection?: string;
}

/**
 * Data prepared for map display
 */
export interface MapData {
	/** All markers to display */
	markers: MapMarker[];
	/** All migration paths to display */
	paths: MigrationPath[];
	/** Aggregated paths (for line weight visualization) */
	aggregatedPaths: AggregatedPath[];
	/** Available collections for filtering */
	collections: string[];
	/** Available universes for filtering */
	universes: string[];
	/** Year range in the data */
	yearRange: { min: number; max: number };
	/** Custom maps available */
	customMaps: CustomMapConfig[];
	/** Life span data for all people (for time slider) */
	personLifeSpans: PersonLifeSpan[];
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * GeoJSON Feature for export
 */
export interface GeoJSONFeature {
	type: 'Feature';
	geometry: {
		type: 'Point' | 'LineString';
		coordinates: number[] | number[][];
	};
	properties: Record<string, unknown>;
}

/**
 * GeoJSON FeatureCollection for export
 */
export interface GeoJSONFeatureCollection {
	type: 'FeatureCollection';
	features: GeoJSONFeature[];
}

/**
 * Options for SVG export
 */
export interface SVGExportOptions {
	/** Include person name labels */
	includeLabels: boolean;
	/** Title for the SVG */
	title?: string;
	/** Width of the SVG */
	width: number;
	/** Height of the SVG */
	height: number;
	/** Include legend */
	includeLegend: boolean;
	/** Include coordinate labels */
	includeCoordinates: boolean;
}

// ============================================================================
// Leaflet Extension Types
// ============================================================================

/**
 * Extended marker with Canvas Roots metadata
 */
export interface CRMarker extends L.Marker {
	crData?: MapMarker;
}

/**
 * Extended polyline with Canvas Roots metadata
 */
export interface CRPolyline extends L.Polyline {
	crData?: MigrationPath | AggregatedPath;
}

// ============================================================================
// Settings Types
// ============================================================================

/**
 * Map-related plugin settings
 */
export interface MapSettings {
	/** Tile provider for real-world maps */
	tileProvider: 'openstreetmap' | 'custom';
	/** Custom tile URL template (if tileProvider is 'custom') */
	customTileUrl?: string;

	/** Default center for initial map view */
	defaultCenter: { lat: number; lng: number };
	/** Default zoom level */
	defaultZoom: number;

	/** Birth marker color */
	birthMarkerColor: string;
	/** Death marker color */
	deathMarkerColor: string;
	/** Marriage marker color */
	marriageMarkerColor: string;
	/** Burial marker color */
	burialMarkerColor: string;
	/** Other marker color */
	otherMarkerColor: string;

	/** Show migration paths by default */
	showMigrationPaths: boolean;
	/** Migration path color */
	pathColor: string;
	/** Migration path line weight */
	pathWeight: number;
	/** Show person name labels on migration paths */
	showPathLabels: boolean;

	/** Heat map blur radius */
	heatMapBlur: number;
	/** Heat map point radius */
	heatMapRadius: number;

	/** Folder for custom map images */
	customMapsFolder: string;
}

/**
 * Default map settings
 */
export const DEFAULT_MAP_SETTINGS: MapSettings = {
	tileProvider: 'openstreetmap',
	defaultCenter: { lat: 40, lng: -40 },
	defaultZoom: 3,
	birthMarkerColor: '#22c55e',  // green
	deathMarkerColor: '#ef4444',  // red
	marriageMarkerColor: '#a855f7', // purple
	burialMarkerColor: '#6b7280',  // gray
	otherMarkerColor: '#3b82f6',  // blue
	showMigrationPaths: true,
	pathColor: '#6366f1',  // indigo
	pathWeight: 2,
	showPathLabels: true,
	heatMapBlur: 15,
	heatMapRadius: 25,
	customMapsFolder: 'Canvas Roots/Places/Maps'
};
