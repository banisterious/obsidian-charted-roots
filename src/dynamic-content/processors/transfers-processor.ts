/**
 * Transfers Processor
 *
 * Handles the `charted-roots-transfers` code block.
 * Renders a chronological list of transfer events for the current person note.
 *
 * Usage in a note:
 * ```charted-roots-transfers
 * sort: chronological
 * limit: 10
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TAbstractFile, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError, renderBlockLoading } from '../services/dynamic-content-service';
import { TransfersRenderer } from '../renderers/transfers-renderer';

/**
 * Processor for charted-roots-transfers code blocks
 */
export class TransfersProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: TransfersRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new TransfersRenderer(this.service);
	}

	/**
	 * Process a charted-roots-transfers code block
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
			if (!context) return;

			// Create a MarkdownRenderChild for proper cleanup of rendered markdown
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// If cr_id not found, the metadata cache may not be ready yet
			// Show loading state and wait for the 'changed' event to re-render
			if (!context.crId) {
				renderBlockLoading(el, 'Waiting for metadata...');

				// Register for metadata changes - will re-render when cache is ready
				const metadataHandler = async (changedFile: TFile) => {
					if (changedFile.path === context.file.path) {
						// Re-build context to get fresh data
						const freshContext = this.service.buildContext(ctx);
						if (!freshContext) return;
						// Clear and re-render
						el.empty();
						if (freshContext.crId) {
							await this.renderer.render(el, freshContext, config, component);
						} else {
							renderBlockError(el, 'This note does not have a cr_id. Transfer history can only be rendered in person notes.');
						}
					}
				};

				component.registerEvent(
					this.plugin.app.metadataCache.on('changed', metadataHandler)
				);
				return;
			}

			// Initial render
			await this.renderer.render(el, context, config, component);

			// Get the events folder for filtering event note changes
			const eventsFolder = this.plugin.settings.eventsFolder || '';

			// Register for metadata changes to re-render when frontmatter changes
			const metadataHandler = async (changedFile: TFile) => {
				// Re-render if the person's own file changed
				if (changedFile.path === context.file.path) {
					// Re-build context to get fresh data
					const freshContext = this.service.buildContext(ctx);
					if (!freshContext) return;
					// Clear and re-render
					el.empty();
					await this.renderer.render(el, freshContext, config, component);
					return;
				}

				// Also re-render if an event note changed (it might be a transfer event)
				if (eventsFolder && changedFile.path.startsWith(eventsFolder)) {
					// Re-build context to get fresh data (this will reload events)
					const freshContext = this.service.buildContext(ctx);
					if (!freshContext) return;
					// Clear and re-render
					el.empty();
					await this.renderer.render(el, freshContext, config, component);
				}
			};

			// Register the event and store reference for cleanup
			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

			// Also listen for file creation events (for newly created transfer events)
			const createHandler = (file: TAbstractFile) => {
				if (file instanceof TFile && eventsFolder && file.path.startsWith(eventsFolder)) {
					// Small delay to allow metadata cache to process the new file
					window.setTimeout(() => {
						const freshContext = this.service.buildContext(ctx);
						if (!freshContext) return;
						el.empty();
						void this.renderer.render(el, freshContext, config, component);
					}, 100);
				}
			};

			component.registerEvent(
				this.plugin.app.vault.on('create', createHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			renderBlockError(el, `Error rendering transfer history: ${message}`);
		}
	}

}
