/**
 * Map Preview Section (Place)
 *
 * Phase 1: displays coordinates as text with a button to open
 * the full Geo Map view. Embedded Leaflet deferred to Phase 3.
 */

import type { PlaceNode } from '../../models/place';
import type { SectionToggleFn, SectionState } from '../profile-types';
import type CanvasRootsPlugin from '../../../main';
import { renderProfileSection } from './section-base';

interface MapPreviewSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	plugin: CanvasRootsPlugin;
}

export function renderMapPreviewSection(
	parent: HTMLElement,
	node: PlaceNode,
	options: MapPreviewSectionOptions
): void {
	const hasCoords = node.coordinates &&
		node.coordinates.lat !== undefined &&
		node.coordinates.long !== undefined;

	let summary = 'No coordinates';
	if (hasCoords) {
		const lat = node.coordinates!.lat;
		const lon = node.coordinates!.long;
		summary = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
	}

	const content = renderProfileSection(parent, {
		sectionId: 'map-preview',
		title: 'Map',
		summary,
		expanded: options.sectionStates['map-preview'] ?? false,
		onToggle: options.onToggle,
		icon: 'map'
	});
	if (!content) return;

	if (!hasCoords) {
		content.createDiv({ cls: 'cr-profile__section-empty', text: 'No location data. Add latitude and longitude to the place note.' });
		return;
	}

	const lat = node.coordinates!.lat;
	const lon = node.coordinates!.long;

	const coordEl = content.createDiv({ cls: 'cr-profile__map-coords' });
	coordEl.createSpan({ text: `Latitude: ${lat}` });
	coordEl.createEl('br');
	coordEl.createSpan({ text: `Longitude: ${lon}` });

	const openBtn = content.createEl('button', {
		cls: 'mod-cta cr-profile__map-open-btn',
		text: 'Open in Geo Map'
	});
	openBtn.addEventListener('click', () => {
		void options.plugin.activateMapView();
	});
}
