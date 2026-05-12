/**
 * Universe Entities Processor
 *
 * Handles the `charted-roots-universe-people`, `charted-roots-universe-places`,
 * `charted-roots-universe-events`, and `charted-roots-universe-organizations`
 * code blocks.
 *
 * Renders entities belonging to the universe defined in the current note.
 *
 * Usage in a universe note:
 * ```charted-roots-universe-people
 * sort: name
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { UniverseEntitiesRenderer, type UniverseEntitiesContext } from '../renderers/universe-entities-renderer';
import { createUniverseService } from '../../universes/services/universe-service';
import { isUniverseNote } from '../../utils/note-type-detection';

/** Which entity types to show */
export type UniverseEntityFilter = 'people' | 'places' | 'events' | 'organizations' | 'all';

/**
 * Processor for charted-roots-universe-* code blocks
 */
export class UniverseEntitiesProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: UniverseEntitiesRenderer;
	private entityFilter: UniverseEntityFilter;

	constructor(plugin: CanvasRootsPlugin, entityFilter: UniverseEntityFilter = 'all') {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new UniverseEntitiesRenderer(this.service);
		this.entityFilter = entityFilter;
	}

	/**
	 * Process a universe entities code block
	 */
	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse config from code block source
			const config = this.service.parseConfig(source);

			// Override show filter based on block type
			if (this.entityFilter !== 'all') {
				config.show = this.entityFilter;
			}

			// Create a MarkdownRenderChild for proper cleanup
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// Resolve universe context
			const context = this.resolveUniverseContext(ctx);

			if (!context) {
				renderBlockError(el, 'This block must be placed in a universe note with a cr_id.');
				return;
			}

			// Initial render
			await this.renderer.render(el, context, config, component);

			// Register for metadata changes to re-render
			const metadataHandler = async (changedFile: TFile) => {
				const cache = this.plugin.app.metadataCache.getFileCache(changedFile);
				const fm = cache?.frontmatter;

				// Re-render if the changed file is the universe note itself, or
				// if its `universe:` field references this universe by any of
				// the aliases the lookup honors (basename / name / cr_id) — the
				// cascade writes basename and the dropdown writes name, so a
				// single comparison key would miss either side after rename
				// (#503).
				if (changedFile.path === context.universeFile.path ||
					(fm?.universe && context.universeAliases.has(String(fm.universe).toLowerCase()))) {
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
			renderBlockError(el, `Error rendering universe entities: ${message}`);
		}
	}

	/**
	 * Resolve the universe context from the current file
	 */
	private resolveUniverseContext(ctx: MarkdownPostProcessorContext): UniverseEntitiesContext | null {
		const app = this.plugin.app;

		// Get current file
		const currentFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(currentFile instanceof TFile)) {
			return null;
		}

		// Check if current note is a universe note
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

		// Get entities for this universe. Match by file (basename / name /
		// cr_id) so the lookup survives universe rename when the typed name
		// has chars stripped by sanitization (#503).
		const universeService = createUniverseService(this.plugin);
		const entities = universeService.getEntitiesForUniverseFile(currentFile);

		const aliases = new Set<string>();
		aliases.add(currentFile.basename.toLowerCase());
		aliases.add(name.toLowerCase());
		aliases.add(crId.toLowerCase());

		return {
			universeName: name,
			universeCrId: crId,
			universeAliases: aliases,
			entities,
			universeFile: currentFile,
			app
		};
	}
}
