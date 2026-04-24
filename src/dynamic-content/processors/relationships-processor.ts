/**
 * Relationships Processor
 *
 * Handles the `charted-roots-relationships` code block.
 * Renders family relationships for the current person note with wikilinks.
 *
 * Usage in a note:
 * ```charted-roots-relationships
 * type: immediate
 * include: parents, spouse, children
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError, renderBlockLoading } from '../services/dynamic-content-service';
import { RelationshipsRenderer } from '../renderers/relationships-renderer';

/**
 * Processor for charted-roots-relationships code blocks
 */
export class RelationshipsProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: RelationshipsRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new RelationshipsRenderer(this.service);
	}

	/**
	 * Process a charted-roots-relationships code block
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
			if (!context.crId || !context.person) {
				renderBlockLoading(el, 'Waiting for metadata...');

				// Register for metadata changes - will re-render when cache is ready
				const metadataHandler = async (changedFile: TFile) => {
					if (changedFile.path === context.file.path) {
						// Re-build context to get fresh data
						const freshContext = this.service.buildContext(ctx);
						if (!freshContext) return;
						// Clear and re-render
						el.empty();
						if (freshContext.crId && freshContext.person) {
							await this.renderer.render(el, freshContext, config, component);
						} else if (!freshContext.crId) {
							renderBlockError(el, 'This note does not have a cr_id. Relationships can only be rendered in person notes.');
						} else {
							renderBlockError(el, 'Could not find person data for this note.');
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

			// Register for metadata changes to re-render when frontmatter changes
			const metadataHandler = async (changedFile: TFile) => {
				if (changedFile.path === context.file.path) {
					// Re-build context to get fresh data
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

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			renderBlockError(el, `Error rendering relationships: ${message}`);
		}
	}

}
