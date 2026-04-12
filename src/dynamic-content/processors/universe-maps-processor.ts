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

			await this.renderer.render(el, context, config, component);

			// Re-render when map notes change
			const metadataHandler = async (changedFile: TFile) => {
				const cache = this.plugin.app.metadataCache.getFileCache(changedFile);
				const fm = cache?.frontmatter;
				if (changedFile.path === context.universeFile.path ||
					(fm?.cr_type === 'map' || fm?.type === 'map')) {
					const freshContext = this.resolveUniverseContext(ctx);
					if (freshContext) {
						el.empty();
						await this.renderer.render(el, freshContext, config, component);
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

		// Find map notes for this universe
		const maps = this.getCustomMapsForUniverse(name, crId);

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
	private getCustomMapsForUniverse(universeName: string, universeCrId: string): Array<{
		name: string;
		filePath: string;
		imagePath?: string;
		mapId?: string;
	}> {
		const maps: Array<{
			name: string;
			filePath: string;
			imagePath?: string;
			mapId?: string;
		}> = [];

		const files = this.plugin.app.vault.getMarkdownFiles();
		const lowerName = universeName.toLowerCase();

		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;

			if (fm?.cr_type !== 'map' && fm?.type !== 'map') continue;
			if (!fm.universe) continue;

			const universeValue = String(fm.universe).toLowerCase();
			if (universeValue !== lowerName && universeValue !== universeCrId) continue;

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

		maps.sort((a, b) => a.name.localeCompare(b.name));
		return maps;
	}
}
