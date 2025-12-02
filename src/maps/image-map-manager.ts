/**
 * Image Map Manager
 *
 * Handles custom image maps for fictional worlds and historical maps.
 * Allows users to use their own map images with custom coordinate systems.
 */

import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import * as L from 'leaflet';
import { getLogger } from '../core/logging';
import type { CustomMapConfig } from './types/map-types';

const logger = getLogger('ImageMapManager');

/**
 * Configuration for a custom image map stored in frontmatter
 */
export interface ImageMapFrontmatter {
	/** Type must be 'map' to be recognized */
	type: 'map';
	/** Unique identifier for this map */
	map_id: string;
	/** Display name for the map */
	name: string;
	/** Universe this map belongs to (for filtering) */
	universe: string;
	/** Path to the image file (relative to vault) */
	image: string;
	/** Coordinate bounds for the image */
	bounds: {
		/** Southwest corner (bottom-left) */
		south: number;
		west: number;
		/** Northeast corner (top-right) */
		north: number;
		east: number;
	};
	/** Optional default center point */
	center?: {
		lat: number;
		lng: number;
	};
	/** Optional default zoom level */
	default_zoom?: number;
	/** Optional minimum zoom */
	min_zoom?: number;
	/** Optional maximum zoom */
	max_zoom?: number;
}

/**
 * Manages custom image maps loaded from vault
 */
export class ImageMapManager {
	private app: App;
	private mapsFolder: string;
	private mapConfigs: Map<string, CustomMapConfig> = new Map();
	private imageOverlays: Map<string, L.ImageOverlay> = new Map();

	constructor(app: App, mapsFolder: string) {
		this.app = app;
		this.mapsFolder = mapsFolder;
	}

	/**
	 * Load all custom map configurations from the vault
	 */
	async loadMapConfigs(): Promise<CustomMapConfig[]> {
		this.mapConfigs.clear();
		const configs: CustomMapConfig[] = [];

		// Look for map config files (markdown files with type: map in frontmatter)
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			// Check if file is in the maps folder or has map type
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;
			if (fm.type !== 'map') continue;

			try {
				const config = this.parseMapConfig(fm, file);
				if (config) {
					this.mapConfigs.set(config.id, config);
					configs.push(config);
					logger.debug('load-config', `Loaded map config: ${config.name}`, { id: config.id });
				}
			} catch (error) {
				logger.warn('parse-config', `Failed to parse map config from ${file.path}`, { error });
			}
		}

		logger.info('load-complete', `Loaded ${configs.length} custom map configs`);
		return configs;
	}

	/**
	 * Parse a map configuration from frontmatter
	 */
	private parseMapConfig(fm: Record<string, unknown>, file: TFile): CustomMapConfig | null {
		// Validate required fields
		if (!fm.map_id || !fm.name || !fm.universe || !fm.image || !fm.bounds) {
			logger.warn('invalid-config', `Map config in ${file.path} missing required fields`);
			return null;
		}

		const bounds = fm.bounds as Record<string, unknown>;
		if (
			typeof bounds.south !== 'number' ||
			typeof bounds.west !== 'number' ||
			typeof bounds.north !== 'number' ||
			typeof bounds.east !== 'number'
		) {
			logger.warn('invalid-bounds', `Map config in ${file.path} has invalid bounds`);
			return null;
		}

		const center = fm.center as Record<string, unknown> | undefined;

		return {
			id: String(fm.map_id),
			name: String(fm.name),
			universe: String(fm.universe),
			imagePath: String(fm.image),
			bounds: {
				topLeft: { x: bounds.west as number, y: bounds.north as number },
				bottomRight: { x: bounds.east as number, y: bounds.south as number }
			},
			center: center ? {
				x: (center.lng as number) ?? 0,
				y: (center.lat as number) ?? 0
			} : undefined,
			defaultZoom: typeof fm.default_zoom === 'number' ? fm.default_zoom : 2
		};
	}

	/**
	 * Get a map configuration by ID
	 */
	getMapConfig(mapId: string): CustomMapConfig | undefined {
		return this.mapConfigs.get(mapId);
	}

	/**
	 * Get all map configurations
	 */
	getAllConfigs(): CustomMapConfig[] {
		return [...this.mapConfigs.values()];
	}

	/**
	 * Get map configurations for a specific universe
	 */
	getConfigsForUniverse(universe: string): CustomMapConfig[] {
		return [...this.mapConfigs.values()].filter(c => c.universe === universe);
	}

	/**
	 * Create a Leaflet image overlay for a custom map
	 */
	async createImageOverlay(mapId: string): Promise<L.ImageOverlay | null> {
		const config = this.mapConfigs.get(mapId);
		if (!config) {
			logger.warn('create-overlay', `Map config not found: ${mapId}`);
			return null;
		}

		// Check if we already have this overlay cached
		const cached = this.imageOverlays.get(mapId);
		if (cached) {
			return cached;
		}

		try {
			// Get the image file
			const imageFile = this.app.vault.getAbstractFileByPath(config.imagePath);
			if (!imageFile || !(imageFile instanceof this.app.vault.adapter.constructor)) {
				// Try to read it as a file anyway
				const imageUrl = await this.getImageUrl(config.imagePath);
				if (!imageUrl) {
					logger.error('image-not-found', `Image not found: ${config.imagePath}`);
					return null;
				}

				// Create the image overlay with bounds
				const bounds = L.latLngBounds(
					[config.bounds.bottomRight.y, config.bounds.topLeft.x],   // Southwest (bottom-left)
					[config.bounds.topLeft.y, config.bounds.bottomRight.x]    // Northeast (top-right)
				);

				const overlay = L.imageOverlay(imageUrl, bounds, {
					opacity: 1,
					interactive: false
				});

				this.imageOverlays.set(mapId, overlay);
				logger.debug('create-overlay', `Created image overlay for ${config.name}`);
				return overlay;
			}
		} catch (error) {
			logger.error('create-overlay-error', `Failed to create overlay for ${mapId}`, { error });
		}

		return null;
	}

	/**
	 * Get a data URL for an image in the vault
	 */
	private async getImageUrl(imagePath: string): Promise<string | null> {
		try {
			const file = this.app.vault.getAbstractFileByPath(imagePath);
			if (file && file instanceof TFile) {
				const arrayBuffer = await this.app.vault.readBinary(file);
				const blob = new Blob([arrayBuffer]);
				return URL.createObjectURL(blob);
			}

			// Try with vault adapter directly
			const exists = await this.app.vault.adapter.exists(imagePath);
			if (exists) {
				const data = await this.app.vault.adapter.readBinary(imagePath);
				const blob = new Blob([data]);
				return URL.createObjectURL(blob);
			}

			return null;
		} catch (error) {
			logger.error('get-image-url', `Failed to get image URL for ${imagePath}`, { error });
			return null;
		}
	}

	/**
	 * Get the Leaflet bounds for a custom map
	 */
	getMapBounds(mapId: string): L.LatLngBounds | null {
		const config = this.mapConfigs.get(mapId);
		if (!config) return null;

		return L.latLngBounds(
			[config.bounds.bottomRight.y, config.bounds.topLeft.x],   // Southwest
			[config.bounds.topLeft.y, config.bounds.bottomRight.x]    // Northeast
		);
	}

	/**
	 * Get the default center for a custom map
	 */
	getMapCenter(mapId: string): L.LatLng | null {
		const config = this.mapConfigs.get(mapId);
		if (!config) return null;

		if (config.center) {
			return L.latLng(config.center.y, config.center.x);
		}

		// Calculate center from bounds
		const bounds = this.getMapBounds(mapId);
		return bounds?.getCenter() ?? null;
	}

	/**
	 * Get the default zoom for a custom map
	 */
	getDefaultZoom(mapId: string): number {
		const config = this.mapConfigs.get(mapId);
		return config?.defaultZoom ?? 2;
	}

	/**
	 * Get the universe for a custom map
	 */
	getMapUniverse(mapId: string): string | null {
		const config = this.mapConfigs.get(mapId);
		return config?.universe ?? null;
	}

	/**
	 * Clean up resources (revoke object URLs)
	 */
	destroy(): void {
		// Revoke any object URLs we created
		for (const overlay of this.imageOverlays.values()) {
			const url = (overlay as L.ImageOverlay).getElement()?.src;
			if (url && url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		}
		this.imageOverlays.clear();
		this.mapConfigs.clear();
	}
}

/**
 * Example map configuration file content:
 *
 * ```yaml
 * ---
 * type: map
 * map_id: middle-earth
 * name: Middle-earth
 * universe: tolkien
 * image: assets/maps/middle-earth.jpg
 * bounds:
 *   north: 50
 *   south: -50
 *   west: -100
 *   east: 100
 * center:
 *   lat: 0
 *   lng: 0
 * default_zoom: 3
 * min_zoom: 1
 * max_zoom: 6
 * ---
 *
 * # Middle-earth Map
 *
 * This is the map configuration for Middle-earth locations.
 *
 * ## Place coordinates
 *
 * When adding places in this universe, use the following coordinate system:
 * - (0, 0) is approximately the center of the map (Isengard area)
 * - Positive lat values are north, negative are south
 * - Positive lng values are east, negative are west
 * ```
 */
