/**
 * Media Processor
 *
 * Handles the `charted-roots-media` code block.
 * Renders a gallery of media files linked to the current note.
 *
 * Usage in a note:
 * ```charted-roots-media
 * columns: 4
 * size: medium
 * filter: images
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { MediaRenderer } from '../renderers/media-renderer';

/**
 * Processor for charted-roots-media code blocks
 */
export class MediaProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: MediaRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new MediaRenderer(plugin, this.service);
	}

	/**
	 * Process a charted-roots-media code block
	 */
	process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void {
		try {
			// Parse config from code block source
			const config = this.service.parseConfig(source);

			// Build context (resolves file, cr_id, person)
			const context = this.service.buildContext(ctx);
			if (!context) return;

			// Create a MarkdownRenderChild for proper cleanup
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// Initial render
			this.renderer.render(el, context, config, component);

			// Register for metadata changes to re-render when frontmatter changes
			const metadataHandler = (changedFile: TFile) => {
				if (changedFile.path === context.file.path) {
					// Re-build context to get fresh data
					const freshContext = this.service.buildContext(ctx);
					if (!freshContext) return;
					// Clear and re-render
					el.empty();
					this.renderer.render(el, freshContext, config, component);
				}
			};

			// Register the event and store reference for cleanup
			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			renderBlockError(el, `Error rendering media gallery: ${message}`);
		}
	}

}
