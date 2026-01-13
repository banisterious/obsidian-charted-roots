/**
 * World Map Preview Component
 *
 * A clickable Leaflet-based world map preview for the Control Center Maps tab.
 * Shows a real world map with place markers overlaid.
 */

import type { App } from 'obsidian';
import type { PlaceNode } from '../../models/place';
import * as L from 'leaflet';

/**
 * Options for rendering the world map preview
 */
export interface WorldMapPreviewOptions {
	/** Places to show as markers on the map */
	places: PlaceNode[];
	/** Callback when the map is clicked */
	onClick: () => void;
	/** Maximum number of markers to display (default: 150) */
	maxMarkers?: number;
}

/**
 * Render a clickable world map preview with place markers using Leaflet
 */
export function renderWorldMapPreview(
	container: HTMLElement,
	app: App,
	options: WorldMapPreviewOptions
): HTMLElement {
	const { places, onClick, maxMarkers = 150 } = options;

	// Filter to places with coordinates
	const placesWithCoords = places.filter(p => p.coordinates?.lat !== undefined && p.coordinates?.long !== undefined);

	// Create the map container
	const mapContainer = container.createDiv({ cls: 'cr-world-map-preview' });

	// Create a div for the Leaflet map
	const mapDiv = mapContainer.createDiv({ cls: 'cr-world-map-leaflet' });

	// Initialize Leaflet map
	const map = L.map(mapDiv, {
		center: [20, 0], // Slightly north of equator for better continent view
		zoom: 1,
		minZoom: 1,
		maxZoom: 1, // Lock zoom for preview
		zoomControl: false,
		attributionControl: false,
		dragging: false,
		scrollWheelZoom: false,
		doubleClickZoom: false,
		boxZoom: false,
		keyboard: false,
		touchZoom: false
	});

	// Use OpenStreetMap tiles (or a simple tile layer)
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		noWrap: true
	}).addTo(map);

	// Add place markers if any
	if (placesWithCoords.length > 0) {
		const markersToShow = placesWithCoords.slice(0, maxMarkers);

		// Create a simple circle marker style for preview
		const markerOptions: L.CircleMarkerOptions = {
			radius: 4,
			fillColor: 'var(--interactive-accent)',
			color: 'var(--background-primary)',
			weight: 1,
			opacity: 1,
			fillOpacity: 0.8
		};

		for (const place of markersToShow) {
			if (!place.coordinates) continue;

			L.circleMarker(
				[place.coordinates.lat, place.coordinates.long],
				markerOptions
			).addTo(map);
		}
	}

	// Add stats badge overlay
	const statsBadge = mapContainer.createDiv({ cls: 'cr-world-map-stats' });
	const count = placesWithCoords.length;
	statsBadge.setText(`${count} place${count !== 1 ? 's' : ''}`);

	// Add hint text
	const hint = mapContainer.createDiv({ cls: 'cr-world-map-hint' });
	hint.setText('Click to open map');

	// Add click overlay (transparent div to capture clicks)
	const clickOverlay = mapContainer.createDiv({ cls: 'cr-world-map-click-overlay' });
	// Ensure overlay captures pointer events
	clickOverlay.style.pointerEvents = 'auto';

	// Make entire container clickable - add handler to both overlay and container
	clickOverlay.addEventListener('click', onClick);
	mapContainer.addEventListener('click', onClick);
	mapContainer.setAttribute('role', 'button');
	mapContainer.setAttribute('tabindex', '0');
	mapContainer.setAttribute('aria-label', `Open map view. ${count} places with coordinates.`);

	// Keyboard accessibility
	mapContainer.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick();
		}
	});

	// Invalidate map size after it's added to DOM (needed for Leaflet)
	setTimeout(() => {
		map.invalidateSize();
	}, 100);

	return mapContainer;
}
