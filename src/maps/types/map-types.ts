/**
 * Type definitions for Charted Roots Map View
 */

import type * as L from 'leaflet';

// ============================================================================
// Core Map Data Types
// ============================================================================

/**
 * Types of markers displayed on the map
 * Core life events: birth, death, marriage, burial
 * Additional events: residence, occupation, education, military, immigration, baptism, confirmation, ordination, custom
 */
export type MarkerType =
	| 'birth'
	| 'death'
	| 'marriage'
	| 'burial'
	| 'residence'
	| 'occupation'
	| 'education'
	| 'military'
	| 'immigration'
	| 'baptism'
	| 'confirmation'
	| 'ordination'
	| 'custom';

/**
 * Event types that can be stored in the events array
 */
export type EventType =
	| 'residence'
	| 'occupation'
	| 'education'
	| 'military'
	| 'immigration'
	| 'baptism'
	| 'confirmation'
	| 'ordination'
	| 'custom';

/**
 * A life event from the events array in person frontmatter
 */
export interface LifeEvent {
	/** Type of event */
	event_type: EventType;
	/** Wikilink to place note */
	place: string;
	/** Start date (YYYY as number, or YYYY-MM, or YYYY-MM-DD as string) */
	date_from?: string | number;
	/** End date for duration events */
	date_to?: string | number;
	/** Brief description */
	description?: string;
	/**
	 * Display label preserved when the raw event type doesn't match a built-in
	 * `MarkerType` and gets resolved to `custom`. Lets the map popup render
	 * `<originalType>:` (e.g., `Backstory:`) instead of the generic `Custom:`
	 * label that loses category information (#466).
	 */
	customLabel?: string;
}

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
	/** Latitude coordinate (for geographic coordinate system) */
	lat: number;
	/** Longitude coordinate (for geographic coordinate system) */
	lng: number;
	/** Pixel X coordinate (for pixel coordinate system) */
	pixelX?: number;
	/** Pixel Y coordinate (for pixel coordinate system) */
	pixelY?: number;
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
	/** Description of the event (for events array entries) */
	description?: string;
	/** End date for duration events (ISO format) */
	dateTo?: string;
	/** End year extracted from dateTo (for filtering) */
	yearTo?: number;
	/** Alternate name for multilingual display (#347) */
	altName?: string;
	/** Raw birth date string (preserves fictional-era context for popup age annotation) (#444) */
	birthDate?: string;
	/**
	 * Display label preserved when the raw event type doesn't match a built-in
	 * `MarkerType` and gets resolved to `custom`. Used by the popup to render
	 * `<originalType>:` (e.g., `Backstory:`) instead of the generic `Custom:`
	 * label that loses category information (#466).
	 */
	customLabel?: string;
}

/**
 * A marker representing a standalone place (not tied to a person event)
 */
export interface PlaceMarker {
	/** cr_id of the place */
	placeId: string;
	/** Display name of the place */
	placeName: string;
	/** Latitude coordinate (for geographic coordinate system) */
	lat?: number;
	/** Longitude coordinate (for geographic coordinate system) */
	lng?: number;
	/** Pixel X coordinate (for pixel coordinate system) */
	pixelX?: number;
	/** Pixel Y coordinate (for pixel coordinate system) */
	pixelY?: number;
	/** Place category (real, fictional, etc.) */
	category?: string;
	/** Universe for fictional places */
	universe?: string;
	/** Linked map ID for drill-down navigation (#361) */
	linkedMap?: string;
	/** Display name of the linked map */
	linkedMapName?: string;
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
		pixelX?: number;
		pixelY?: number;
		name: string;
	};
	/** Destination location (typically death) */
	destination: {
		lat: number;
		lng: number;
		pixelX?: number;
		pixelY?: number;
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

/**
 * A waypoint in a person's journey (chronologically ordered life event location)
 */
export interface JourneyWaypoint {
	/** Latitude coordinate */
	lat: number;
	/** Longitude coordinate */
	lng: number;
	/** Pixel X coordinate (for pixel coordinate system) */
	pixelX?: number;
	/** Pixel Y coordinate (for pixel coordinate system) */
	pixelY?: number;
	/** Name of the place */
	name: string;
	/** cr_id of the place note */
	placeId?: string;
	/** Type of life event at this location */
	eventType: MarkerType;
	/** Date of the event */
	date?: string;
	/** Year extracted from date */
	year?: number;
	/** End date for duration events */
	dateTo?: string;
	/** End year for duration events */
	yearTo?: number;
	/** Description of the event */
	description?: string;
}

/**
 * A journey path connecting all life events for a person in chronological order
 */
export interface JourneyPath {
	/** cr_id of the person */
	personId: string;
	/** Display name of the person */
	personName: string;
	/** Ordered list of waypoints (locations) in the person's life */
	waypoints: JourneyWaypoint[];
	/** Birth year for filtering */
	birthYear?: number;
	/** Raw birth date string (preserves fictional-era context for age calculation) */
	birthDate?: string;
	/** Death year for filtering */
	deathYear?: number;
	/** Collection the person belongs to */
	collection?: string;
	/** Universe for fictional places */
	universe?: string;
	/** Per-path color override (for family overlay) */
	color?: string;
	/** Per-path weight override (for family overlay) */
	weight?: number;
	/** Per-path opacity override (for family overlay) */
	opacity?: number;
	/** Relationship label (e.g., 'Father', 'Spouse') for family overlay */
	relationshipLabel?: string;
}

// ============================================================================
// Custom Image Map Types
// ============================================================================

/**
 * Coordinate system type for custom maps
 * - 'geographic': Uses lat/lng coordinates (default, for maps with real-world reference points)
 * - 'pixel': Uses pixel coordinates with L.CRS.Simple (for custom image maps)
 */
export type CoordinateSystemType = 'geographic' | 'pixel';

/**
 * Four corner positions for distortable image alignment
 * Order: NW, NE, SW, SE (in a "Z" pattern)
 */
export interface ImageCorners {
	nw: { lat: number; lng: number };
	ne: { lat: number; lng: number };
	sw: { lat: number; lng: number };
	se: { lat: number; lng: number };
}

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
	/** Coordinate system type ('geographic' or 'pixel') */
	coordinateSystem: CoordinateSystemType;
	/** Coordinate bounds for the image */
	bounds: {
		/** Top-left corner */
		topLeft: { x: number; y: number };
		/** Bottom-right corner */
		bottomRight: { x: number; y: number };
	};
	/** Image dimensions in pixels (required for pixel coordinate system) */
	imageDimensions?: { width: number; height: number };
	/** Optional center point for initial view */
	center?: { x: number; y: number };
	/** Optional initial zoom level */
	defaultZoom?: number;
	/** Optional minimum zoom level */
	minZoom?: number;
	/** Optional maximum zoom level */
	maxZoom?: number;
	/**
	 * Corner positions for distortable image alignment.
	 * When present, enables distortable image mode for interactive
	 * scale/rotate/distort operations on the map image.
	 */
	corners?: ImageCorners;
	/** Path to the source file for saving corner updates */
	sourcePath?: string;
	/** Parent map ID for drill-down hierarchy (#361) */
	parentMap?: string;
	/** Region on the parent map where this child map sits (#361 Phase 3) */
	parentRegion?: { x: number; y: number; w: number; h: number };
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
	/** Current map ID for per-map place filtering */
	mapId?: string;
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
	// Core life events
	/** Show birth markers */
	births: boolean;
	/** Show death markers */
	deaths: boolean;
	/** Show marriage markers */
	marriages: boolean;
	/** Show burial markers */
	burials: boolean;

	// Additional life events
	/** Show residence markers */
	residences: boolean;
	/** Show occupation markers */
	occupations: boolean;
	/** Show education markers */
	educations: boolean;
	/** Show military markers */
	military: boolean;
	/** Show immigration markers */
	immigrations: boolean;
	/** Show religious event markers (baptism, confirmation, ordination) */
	religious: boolean;
	/** Show custom event markers */
	custom: boolean;

	// Other layers
	/** Show migration paths (birth → death) */
	paths: boolean;
	/** Show journey paths (all life events connected chronologically) */
	journeys: boolean;
	/** Show heat map layer */
	heatMap: boolean;
	/** Show all places (not just those with person events) */
	places: boolean;
	/** Show child map markers and overlay regions (#362) */
	childMaps: boolean;
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
	/** Currently active map ('openstreetmap' for OSM or a custom map ID) */
	activeMap: string;
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
	/** Standalone place markers (not tied to person events) */
	placeMarkers: PlaceMarker[];
	/** All migration paths to display (birth → death) */
	paths: MigrationPath[];
	/** Aggregated paths (for line weight visualization) */
	aggregatedPaths: AggregatedPath[];
	/** Journey paths (all life events connected chronologically) */
	journeyPaths: JourneyPath[];
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
 * Extended marker with Charted Roots metadata
 */
export interface CRMarker extends L.Marker {
	crData?: MapMarker;
}

/**
 * Extended polyline with Charted Roots metadata
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

	// Core life event colors
	/** Birth marker color */
	birthMarkerColor: string;
	/** Death marker color */
	deathMarkerColor: string;
	/** Marriage marker color */
	marriageMarkerColor: string;
	/** Burial marker color */
	burialMarkerColor: string;

	// Additional event colors
	/** Residence marker color */
	residenceMarkerColor: string;
	/** Occupation marker color */
	occupationMarkerColor: string;
	/** Education marker color */
	educationMarkerColor: string;
	/** Military marker color */
	militaryMarkerColor: string;
	/** Immigration marker color */
	immigrationMarkerColor: string;
	/** Religious event marker color (baptism, confirmation, ordination) */
	religiousMarkerColor: string;
	/** Custom event marker color */
	customMarkerColor: string;

	/** Show migration paths by default */
	showMigrationPaths: boolean;
	/** Migration path color */
	pathColor: string;
	/** Migration path line weight */
	pathWeight: number;
	/** Show person name labels on migration paths */
	showPathLabels: boolean;

	/** Show journey paths (all life events) by default */
	showJourneyPaths: boolean;
	/** Journey path color */
	journeyPathColor: string;
	/** Journey path line weight */
	journeyPathWeight: number;
	/** Show person name labels on journey paths */
	showJourneyLabels: boolean;
	/** Outline color around path labels for legibility on colorful or dark backgrounds (#483) */
	pathLabelStroke: 'none' | 'white' | 'black';

	/** Heat map blur radius */
	heatMapBlur: number;
	/** Heat map point radius */
	heatMapRadius: number;
	/** Heat map intensity level */
	heatMapIntensity: 'low' | 'medium' | 'high';
	/** Customizable heat map intensity presets */
	heatMapPresets: {
		low: { radius: number; blur: number; opacity: number };
		medium: { radius: number; blur: number; opacity: number };
		high: { radius: number; blur: number; opacity: number };
	};

	/** Folder for custom map images */
	customMapsFolder: string;

	// Event display settings (from main plugin settings)
	/** Event icon display mode */
	eventIconMode?: 'text' | 'icon' | 'both';
	/** Custom event type definitions */
	customEventTypes?: { type: string; name: string; icon: string; color: string; category?: string }[];
	/** Whether to show built-in event types */
	showBuiltInEventTypes?: boolean;
}

/**
 * Default map settings
 */
export const DEFAULT_MAP_SETTINGS: MapSettings = {
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

	showMigrationPaths: true,
	pathColor: '#6366f1',  // indigo
	pathWeight: 2,
	showPathLabels: true,
	showJourneyPaths: false,
	journeyPathColor: '#8b5cf6',  // violet (distinct from migration paths)
	journeyPathWeight: 2,
	showJourneyLabels: true,
	pathLabelStroke: 'none',
	heatMapBlur: 15,
	heatMapRadius: 25,
	heatMapIntensity: 'medium' as const,
	heatMapPresets: {
		low: { radius: 0.55, blur: 1.2, opacity: 0.1 },
		medium: { radius: 0.7, blur: 1.0, opacity: 0.12 },
		high: { radius: 0.9, blur: 0.7, opacity: 0.18 },
	},
	customMapsFolder: 'Charted Roots/Places/Maps'
};

/**
 * Get the marker color for a given event type
 */
export function getMarkerColor(type: MarkerType, settings: MapSettings): string {
	switch (type) {
		case 'birth':
			return settings.birthMarkerColor;
		case 'death':
			return settings.deathMarkerColor;
		case 'marriage':
			return settings.marriageMarkerColor;
		case 'burial':
			return settings.burialMarkerColor;
		case 'residence':
			return settings.residenceMarkerColor;
		case 'occupation':
			return settings.occupationMarkerColor;
		case 'education':
			return settings.educationMarkerColor;
		case 'military':
			return settings.militaryMarkerColor;
		case 'immigration':
			return settings.immigrationMarkerColor;
		case 'baptism':
		case 'confirmation':
		case 'ordination':
			return settings.religiousMarkerColor;
		case 'custom':
			return settings.customMarkerColor;
		default:
			return settings.residenceMarkerColor; // fallback
	}
}

/**
 * Format a marker's date for popup display. Renders a duration as `from – to`
 * when both dates are present, otherwise whichever single date is set. Returns
 * undefined when neither side is set.
 */
export function formatPopupDateRange(date: string | undefined, dateTo: string | undefined): string | undefined {
	if (date && dateTo && date !== dateTo) return `${date} – ${dateTo}`;
	return date ?? dateTo;
}

/**
 * Build a dedup key for a journey waypoint that's robust across coordinate
 * systems (#448). The journey-path builder dedupes consecutive duplicate
 * locations, but the original lat/lng-only comparison collapsed every
 * pixel-coord place onto `(0, 0)` (because pixel-system waypoints default
 * `lat` and `lng` to `0`), preventing journey paths from ever building on
 * custom image maps.
 *
 * The key is composed of place + event type. Place keying preference:
 *   1. `placeId` — most durable, immune to coordinate drift on the place note.
 *   2. A composite of both coord systems — `lat,lng|pixelX,pixelY` — so
 *      neither system collides with another place that happens to have the
 *      other system's defaults at zero.
 *
 * Event type is folded into the key so that distinct event types at the same
 * place produce distinct waypoints (#487). Without this, a death and a custom
 * event at the same location collapsed onto a single waypoint — silently
 * dropping the death popup whenever a custom event sorted ahead of it. Same-
 * place-same-type still collapses (multiple residences at one address remain
 * a single waypoint), preserving the original #448 dedup behavior.
 */
export function journeyWaypointDedupKey(waypoint: { placeId?: string; lat?: number; lng?: number; pixelX?: number; pixelY?: number; eventType?: string }): string {
	const place = waypoint.placeId
		? `id:${waypoint.placeId}`
		: `coords:${waypoint.lat ?? ''},${waypoint.lng ?? ''}|${waypoint.pixelX ?? ''},${waypoint.pixelY ?? ''}`;
	return `${place}|type:${waypoint.eventType ?? ''}`;
}

/**
 * Check if a marker type is visible based on layer settings
 */
export function isMarkerTypeVisible(type: MarkerType, layers: LayerVisibility): boolean {
	switch (type) {
		case 'birth':
			return layers.births;
		case 'death':
			return layers.deaths;
		case 'marriage':
			return layers.marriages;
		case 'burial':
			return layers.burials;
		case 'residence':
			return layers.residences;
		case 'occupation':
			return layers.occupations;
		case 'education':
			return layers.educations;
		case 'military':
			return layers.military;
		case 'immigration':
			return layers.immigrations;
		case 'baptism':
		case 'confirmation':
		case 'ordination':
			return layers.religious;
		case 'custom':
			return layers.custom;
		default:
			return true;
	}
}

/**
 * Default layer visibility (all enabled)
 */
export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
	// Core life events
	births: true,
	deaths: true,
	marriages: true,
	burials: true,

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
	journeys: false,  // Off by default (can be visually busy with many people)
	heatMap: false,
	places: false     // Off by default (shows all places regardless of person events)
};
