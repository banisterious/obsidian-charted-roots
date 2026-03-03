/**
 * Map Preview Section (Place)
 *
 * Embedded Leaflet map showing the place's coordinates with a marker.
 * Uses lazy rendering — the map initializes only when the section expands.
 */

import * as L from 'leaflet';
import type { PlaceNode } from '../../models/place';
import type { SectionRenderOptions } from '../profile-view';
import { renderProfileSection } from './section-base';

/** Module-level reference to the active preview map for lifecycle management */
let activePreviewMap: L.Map | null = null;

/**
 * Clean up any active preview map. Called on entity switch and view close.
 */
export function cleanupMapPreview(): void {
	if (activePreviewMap) {
		activePreviewMap.remove();
		activePreviewMap = null;
	}
}

export function renderMapPreviewSection(
	parent: HTMLElement,
	node: PlaceNode,
	options: SectionRenderOptions
): void {
	const hasCoords = node.coordinates &&
		node.coordinates.lat !== undefined &&
		node.coordinates.long !== undefined;

	let summary = 'No coordinates';
	let lat = 0;
	let lon = 0;
	if (hasCoords) {
		lat = node.coordinates!.lat;
		lon = node.coordinates!.long;
		summary = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
	}

	renderProfileSection(parent, {
		sectionId: 'map-preview',
		title: 'Map',
		summary,
		expanded: options.sectionStates['map-preview'] ?? false,
		onToggle: options.onToggle,
		icon: 'map',
		contentRenderer: (content) => {
			if (!hasCoords) {
				content.createDiv({
					cls: 'cr-profile__section-empty',
					text: 'No location data. Add latitude and longitude to the place note.'
				});
				return;
			}

			// Map container
			const mapContainer = content.createDiv({ cls: 'cr-profile__map-container' });

			// Clean up any previous preview map
			cleanupMapPreview();

			// Initialize Leaflet map
			const map = L.map(mapContainer, {
				scrollWheelZoom: false,
				zoomControl: true,
				attributionControl: false,
				dragging: true
			});
			map.setView([lat, lon], 12);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 18
			}).addTo(map);

			// Marker with simple dot icon (matches map-controller pattern)
			const icon = L.divIcon({
				html: '<div class="cr-profile__map-marker-dot"></div>',
				className: 'cr-profile__map-marker',
				iconSize: L.point(16, 16),
				iconAnchor: L.point(8, 8)
			});
			L.marker([lat, lon], { icon }).addTo(map);

			activePreviewMap = map;

			// Invalidate map size after DOM layout settles
			requestAnimationFrame(() => {
				map.invalidateSize();
			});

			// "Open in Geo Map" button
			const openBtn = content.createEl('button', {
				cls: 'mod-cta cr-profile__map-open-btn',
				text: 'Open in Geo Map'
			});
			openBtn.addEventListener('click', () => {
				void options.plugin.activateMapView(undefined, false, undefined, {
					lat,
					lng: lon,
					zoom: 14
				});
			});
		},
		onCollapse: () => {
			cleanupMapPreview();
		}
	});
}
