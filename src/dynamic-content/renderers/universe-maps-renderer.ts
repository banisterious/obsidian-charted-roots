/**
 * Universe Maps Renderer
 *
 * Renders clickable map image thumbnails for the charted-roots-universe-maps
 * code block. Clicking a thumbnail opens the map in Map View.
 */

import { MarkdownRenderChild, App, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import { resolvePathToFile } from '../../utils/wikilink-resolver';
import { setLucideIcon } from '../../ui/lucide-icons';

/**
 * Map entry for rendering
 */
export interface UniverseMapEntry {
	name: string;
	filePath: string;
	imagePath?: string;
	mapId?: string;
	placeCount?: number;
}

/**
 * Context for rendering universe maps
 */
export interface UniverseMapsContext {
	universeName: string;
	universeCrId: string;
	maps: UniverseMapEntry[];
	universeFile: TFile;
	app: App;
}

/**
 * Renders universe map thumbnails into an HTML element
 */
export class UniverseMapsRenderer {
	private service: DynamicContentService;
	private plugin: CanvasRootsPlugin;

	constructor(service: DynamicContentService, plugin: CanvasRootsPlugin) {
		this.service = service;
		this.plugin = plugin;
	}

	/**
	 * Render the universe maps block
	 */
	render(
		el: HTMLElement,
		context: UniverseMapsContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): void {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-universe-maps' });

		if (context.maps.length === 0) {
			container.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No custom maps found for this universe.'
			});
			return;
		}

		// Heading
		container.createEl('h4', {
			cls: 'cr-universe-entities__heading',
			text: `Maps (${context.maps.length})`
		});

		// Thumbnail grid
		const size = config.size as string || 'medium';
		const grid = container.createDiv({ cls: `cr-universe-maps__grid cr-universe-maps__grid--${size}` });

		for (const map of context.maps) {
			const thumbnail = grid.createDiv({ cls: 'cr-universe-maps__thumbnail' });

			// Load image
			if (map.imagePath) {
				const imageFile = resolvePathToFile(context.app, map.imagePath);
				if (imageFile) {
					const imgUrl = context.app.vault.getResourcePath(imageFile);
					const img = thumbnail.createEl('img', {
						cls: 'cr-universe-maps__image',
						attr: {
							src: imgUrl,
							alt: map.name
						}
					});
					img.onerror = () => {
						img.remove();
						this.renderPlaceholder(thumbnail);
					};
				} else {
					this.renderPlaceholder(thumbnail);
				}
			} else {
				this.renderPlaceholder(thumbnail);
			}

			// Place count badge
			if (map.placeCount !== undefined && map.placeCount > 0) {
				const badge = thumbnail.createDiv({ cls: 'cr-universe-maps__badge' });
				badge.setText(`${map.placeCount} place${map.placeCount !== 1 ? 's' : ''}`);
			}

			// Caption overlay
			const caption = thumbnail.createDiv({ cls: 'cr-universe-maps__caption' });
			caption.createSpan({ text: map.name });

			// Click to open in Map View
			thumbnail.addEventListener('click', () => {
				if (map.mapId) {
					void this.plugin.activateMapView(map.mapId);
				}
			});

			// Cursor hint
			if (map.mapId) {
				thumbnail.addClass('cr-universe-maps__thumbnail--clickable');
			}
		}
	}

	/**
	 * Render a placeholder icon when no image is available
	 */
	private renderPlaceholder(container: HTMLElement): void {
		const placeholder = container.createDiv({ cls: 'cr-universe-maps__placeholder' });
		setLucideIcon(placeholder, 'map', 32);
	}
}
