/**
 * Timeline Processor
 *
 * Handles the `canvas-roots-timeline` code block.
 * Renders a chronological list of events for the current person note.
 *
 * Usage in a note:
 * ```canvas-roots-timeline
 * sort: chronological
 * include: birth, death, marriage, residence
 * limit: 10
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService } from '../services/dynamic-content-service';
import { TimelineRenderer } from '../renderers/timeline-renderer';

/**
 * Processor for canvas-roots-timeline code blocks
 */
export class TimelineProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: TimelineRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new TimelineRenderer(this.service);
	}

	/**
	 * Process a canvas-roots-timeline code block
	 */
	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse config from code block source
			const config = this.service.parseConfig(source);

			// Build context (resolves file, cr_id, person)
			const context = this.service.buildContext(ctx);

			// Check if this is a person note
			if (!context.crId) {
				this.renderError(el, 'This note does not have a cr_id. Timeline can only be rendered in person notes.');
				return;
			}

			// Create a MarkdownRenderChild for proper cleanup of rendered markdown
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// Initial render
			await this.renderer.render(el, context, config, component);

			// Register for metadata changes to re-render when frontmatter changes
			const metadataHandler = async (changedFile: TFile) => {
				if (changedFile.path === context.file.path) {
					// Re-build context to get fresh data
					const freshContext = this.service.buildContext(ctx);
					// Clear and re-render
					el.empty();
					await this.renderer.render(el, freshContext, config, component);
				}
			};

			// Register the event and store reference for cleanup
			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.renderError(el, `Error rendering timeline: ${message}`);
		}
	}

	/**
	 * Render an error message
	 */
	private renderError(el: HTMLElement, message: string): void {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-dynamic-block--error' });
		container.createDiv({ cls: 'cr-dynamic-block__error-message', text: message });
	}
}
