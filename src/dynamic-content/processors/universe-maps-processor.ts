/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Universe Maps Processor
 *
 * Handles the `charted-roots-universe-maps` code block.
 * Renders clickable map thumbnails for maps belonging to the current universe.
 *
 * Usage in a universe note:
 * ```charted-roots-universe-maps
 * size: medium
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { UniverseMapsRenderer, type UniverseMapsContext } from '../renderers/universe-maps-renderer';
import { isUniverseNote } from '../../utils/note-type-detection';

/**
 * Processor for charted-roots-universe-maps code blocks
 */
export class UniverseMapsProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: UniverseMapsRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new UniverseMapsRenderer(this.service, plugin);
	}

	/**
	 * Process a charted-roots-universe-maps code block
	 */
	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			const config = this.service.parseConfig(source);
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			const context = this.resolveUniverseContext(ctx);

			if (!context) {
				renderBlockError(el, 'This block must be placed in a universe note with a cr_id.');
				return;
			}

			this.renderer.render(el, context, config, component);

			// Re-render when map notes change
			const metadataHandler = (changedFile: TFile) => {
				const cache = this.plugin.app.metadataCache.getFileCache(changedFile);
				const fm = cache?.frontmatter;
				if (changedFile.path === context.universeFile.path ||
					(fm?.cr_type === 'map' || fm?.type === 'map')) {
					const freshContext = this.resolveUniverseContext(ctx);
					if (freshContext) {
						el.empty();
						this.renderer.render(el, freshContext, config, component);
					}
				}
			};

			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			renderBlockError(el, `Error rendering universe maps: ${message}`);
		}
	}

	/**
	 * Resolve the universe context from the current file
	 */
	private resolveUniverseContext(ctx: MarkdownPostProcessorContext): UniverseMapsContext | null {
		const app = this.plugin.app;

		const currentFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(currentFile instanceof TFile)) {
			return null;
		}

		const cache = app.metadataCache.getFileCache(currentFile);
		const fm = cache?.frontmatter;

		if (!isUniverseNote(fm, cache, this.plugin.settings.noteTypeDetection)) {
			return null;
		}

		const crId = fm?.cr_id as string | undefined;
		const name = fm?.name as string | undefined;
		if (!crId || !name) {
			return null;
		}

		// Match referencing notes against any of the universe's aliases
		// (basename / name / cr_id). Cascade writes the basename and the
		// dropdown writes the name, so a single key would miss either side
		// after rename when sanitization strips chars from the basename
		// (#503).
		const aliases = new Set<string>();
		aliases.add(currentFile.basename.toLowerCase());
		aliases.add(name.toLowerCase());
		aliases.add(crId.toLowerCase());

		const maps = this.getCustomMapsForUniverse(aliases);

		return {
			universeName: name,
			universeCrId: crId,
			maps,
			universeFile: currentFile,
			app
		};
	}

	/**
	 * Get custom map notes belonging to a universe
	 */
	private getCustomMapsForUniverse(universeAliases: Set<string>): Array<{
		name: string;
		filePath: string;
		imagePath?: string;
		mapId?: string;
		placeCount?: number;
	}> {
		const maps: Array<{
			name: string;
			filePath: string;
			imagePath?: string;
			mapId?: string;
			placeCount?: number;
		}> = [];

		const files = this.plugin.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;

			if (fm?.cr_type !== 'map' && fm?.type !== 'map') continue;
			if (!fm.universe) continue;

			const universeValue = String(fm.universe).toLowerCase();
			if (!universeAliases.has(universeValue)) continue;

			// Parse image path (handle wikilink YAML arrays)
			const rawImage = fm.image || fm.image_path || fm.imagePath;
			let imagePath: string | undefined;
			if (rawImage) {
				if (Array.isArray(rawImage) && rawImage.length === 1 &&
					Array.isArray(rawImage[0]) && rawImage[0].length === 1) {
					imagePath = `[[${rawImage[0][0]}]]`;
				} else if (typeof rawImage === 'string') {
					imagePath = rawImage;
				}
			}

			maps.push({
				name: fm.name || file.basename,
				filePath: file.path,
				imagePath,
				mapId: fm.map_id
			});
		}

		// Count places with coordinates per map
		const placeCounts = this.countPlacesPerMap(universeAliases, maps.map(m => m.mapId).filter(Boolean) as string[]);
		for (const map of maps) {
			map.placeCount = map.mapId ? (placeCounts.get(map.mapId) ?? 0) : 0;
		}

		maps.sort((a, b) => a.name.localeCompare(b.name));
		return maps;
	}

	/**
	 * Count place notes with coordinates per map.
	 * Places specify which map(s) they belong to via the `maps` or `map_id` field.
	 * Places without a maps field are counted under all maps in their universe.
	 */
	private countPlacesPerMap(universeAliases: Set<string>, mapIds: string[]): Map<string, number> {
		const counts = new Map<string, number>();
		for (const id of mapIds) {
			counts.set(id, 0);
		}

		const files = this.plugin.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			const crType = fm.cr_type || fm.type;
			if (crType !== 'place') continue;
			if (!fm.universe) continue;

			const universeValue = String(fm.universe).toLowerCase();
			if (!universeAliases.has(universeValue)) continue;

			// Check for coordinates (geographic or pixel)
			const hasGeo = fm.coordinates_lat != null && fm.coordinates_long != null;
			const hasPixel = fm.custom_coordinates_x != null && fm.custom_coordinates_y != null;
			const hasPixelAlt = fm.pixel_x != null && fm.pixel_y != null;
			if (!hasGeo && !hasPixel && !hasPixelAlt) continue;

			// Determine which map(s) this place belongs to
			let placeMaps: string[] | null = null;
			if (Array.isArray(fm.maps)) {
				placeMaps = fm.maps.map((m: unknown) => String(m)).filter((m: string) => m.length > 0);
			} else if (fm.map_id) {
				placeMaps = [String(fm.map_id)];
			}

			if (placeMaps && placeMaps.length > 0) {
				// Place specifies its map(s) — count only for those
				for (const mapId of placeMaps) {
					if (counts.has(mapId)) {
						counts.set(mapId, (counts.get(mapId) ?? 0) + 1);
					}
				}
			} else {
				// Place has no map restriction — count for all maps in the universe
				for (const mapId of mapIds) {
					counts.set(mapId, (counts.get(mapId) ?? 0) + 1);
				}
			}
		}

		return counts;
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment -- Match scope of file-level disable at top. */
