/**
 * Source Roles Processor
 *
 * Handles the `charted-roots-source-roles` code block.
 * Renders person roles from a source note as a formatted table.
 *
 * Usage in a note:
 * ```charted-roots-source-roles
 * source: "[[Estate Inventory of John Smith Sr.]]"
 * ```
 *
 * If no source is specified, uses the current note (if it's a source note).
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { SourceRolesRenderer, type SourceRolesContext } from '../renderers/source-roles-renderer';
import { SourceService } from '../../sources/services/source-service';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';
import { isSourceNote } from '../../utils/note-type-detection';

/**
 * Processor for charted-roots-source-roles code blocks
 */
export class SourceRolesProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: SourceRolesRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new SourceRolesRenderer(this.service);
	}

	/**
	 * Process a charted-roots-source-roles code block
	 */
	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse config from code block source
			const config = this.service.parseConfig(source);

			// Create a MarkdownRenderChild for proper cleanup
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// Determine which source note to use
			const sourceService = new SourceService(this.plugin.app, this.plugin.settings);
			const context = await this.resolveSourceContext(config, ctx, sourceService);

			if (!context) {
				renderBlockError(el, 'Could not find source note. Specify a source with `source: "[[Source Name]]"` or use this block in a source note.');
				return;
			}

			// Initial render
			await this.renderer.render(el, context, config, component);

			// Register for metadata changes to re-render when frontmatter changes
			const metadataHandler = async (changedFile: TFile) => {
				if (changedFile.path === context.sourcePath) {
					// Invalidate source cache and re-resolve
					sourceService.invalidateCache();
					const freshContext = await this.resolveSourceContext(config, ctx, sourceService);

					if (freshContext) {
						// Clear and re-render
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
			renderBlockError(el, `Error rendering source roles: ${message}`);
		}
	}

	/**
	 * Resolve the source context from config or current file
	 */
	private async resolveSourceContext(
		config: Record<string, unknown>,
		ctx: MarkdownPostProcessorContext,
		sourceService: SourceService
	): Promise<SourceRolesContext | null> {
		const app = this.plugin.app;

		// Check if source is specified in config
		const sourceConfig = config.source as string | undefined;

		if (sourceConfig) {
			// Extract path from wikilink
			const sourcePath = extractWikilinkPath(sourceConfig);
			if (!sourcePath) {
				return null;
			}

			// Resolve to file
			const linkedFile = app.metadataCache.getFirstLinkpathDest(sourcePath, ctx.sourcePath);
			if (!linkedFile) {
				return null;
			}

			// Get source data
			const source = sourceService.getSourceByPath(linkedFile.path);
			if (!source) {
				return null;
			}

			return {
				source,
				sourcePath: linkedFile.path,
				app
			};
		}

		// No source specified - try to use current note
		const currentFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(currentFile instanceof TFile)) {
			return null;
		}

		// Check if current note is a source note
		const cache = app.metadataCache.getFileCache(currentFile);
		const fm = cache?.frontmatter;

		if (!isSourceNote(fm, cache, this.plugin.settings.noteTypeDetection)) {
			return null;
		}

		// Get source data
		const source = sourceService.getSourceByPath(currentFile.path);
		if (!source) {
			return null;
		}

		return {
			source,
			sourcePath: currentFile.path,
			app
		};
	}

}
