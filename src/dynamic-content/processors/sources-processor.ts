/**
 * Sources Processor
 *
 * Handles the `charted-roots-sources` code block.
 * Renders a table of sources linked to the current person note.
 *
 * Usage in a note:
 * ```charted-roots-sources
 * title: Sources
 * sort: chronological
 * filter: census, vital_record
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { SourcesRenderer, type SourceTableRow } from '../renderers/sources-renderer';
import type { SourceService } from '../../sources/services/source-service';
import type { SourceNote, FactKey } from '../../sources/types/source-types';
import { SOURCED_PROPERTY_NAMES, SOURCED_PROPERTY_TO_FACT_KEY, FACT_KEY_LABELS } from '../../sources/types/source-types';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';

/**
 * Processor for charted-roots-sources code blocks
 */
export class SourcesProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: SourcesRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new SourcesRenderer(this.service);
	}

	/**
	 * Process a charted-roots-sources code block
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

			// Gather sources and render
			const sourceService = this.plugin.getSourceService();
			const rows = this.gatherSources(context.file, sourceService);

			// Initial render
			void this.renderer.render(el, rows, context.file, config, component);

			// Register for metadata changes to re-render when frontmatter changes
			const metadataHandler = (changedFile: TFile) => {
				if (changedFile.path === context.file.path) {
					sourceService.invalidateCache();
					const freshRows = this.gatherSources(context.file, sourceService);
					el.empty();
					void this.renderer.render(el, freshRows, context.file, config, component);
				}
			};

			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			renderBlockError(el, `Error rendering sources: ${message}`);
		}
	}

	/**
	 * Gather all sources linked to a person note from frontmatter
	 */
	private gatherSources(file: TFile, sourceService: SourceService): SourceTableRow[] {
		const app = this.plugin.app;
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;

		if (!fm) return [];

		// Map of source crId → { source, facts }
		const sourceMap = new Map<string, { source: SourceNote; facts: Set<FactKey> }>();

		// 1. General sources from the `sources` frontmatter array
		const sourcesProperty = this.plugin.resolveFrontmatterProperty<string | string[]>(fm, 'sources');
		if (sourcesProperty) {
			const sourceLinks = Array.isArray(sourcesProperty) ? sourcesProperty : [sourcesProperty];
			for (const link of sourceLinks) {
				const resolved = this.resolveSourceFromLink(link, file.path, sourceService);
				if (resolved && !sourceMap.has(resolved.crId)) {
					sourceMap.set(resolved.crId, { source: resolved, facts: new Set() });
				}
			}
		}

		// 2. Fact-level sources from sourced_* properties
		for (const propName of SOURCED_PROPERTY_NAMES) {
			const propValue = fm[propName];
			if (!propValue) continue;

			const factKey = SOURCED_PROPERTY_TO_FACT_KEY[propName];
			const links = Array.isArray(propValue) ? propValue : [propValue];

			for (const link of links) {
				if (typeof link !== 'string') continue;
				const resolved = this.resolveSourceFromLink(link, file.path, sourceService);
				if (!resolved) continue;

				const existing = sourceMap.get(resolved.crId);
				if (existing) {
					existing.facts.add(factKey);
				} else {
					const facts = new Set<FactKey>();
					facts.add(factKey);
					sourceMap.set(resolved.crId, { source: resolved, facts });
				}
			}
		}

		// 3. Legacy sourced_facts fallback (nested object format)
		const legacySourcedFacts = fm.sourced_facts;
		if (legacySourcedFacts && typeof legacySourcedFacts === 'object' && !Array.isArray(legacySourcedFacts)) {
			for (const [factKeyStr, value] of Object.entries(legacySourcedFacts as Record<string, unknown>)) {
				// Validate this is a known fact key
				if (!(factKeyStr in FACT_KEY_LABELS)) continue;
				const factKey = factKeyStr as FactKey;

				// Value can be { sources: [...] } or directly [...]
				const links: unknown[] = Array.isArray(value)
					? value
					: (value && typeof value === 'object' && 'sources' in value && Array.isArray((value as Record<string, unknown>).sources))
						? (value as Record<string, unknown[]>).sources
						: [];

				for (const link of links) {
					if (typeof link !== 'string') continue;
					const resolved = this.resolveSourceFromLink(link, file.path, sourceService);
					if (!resolved) continue;

					const existing = sourceMap.get(resolved.crId);
					if (existing) {
						existing.facts.add(factKey);
					} else {
						const facts = new Set<FactKey>();
						facts.add(factKey);
						sourceMap.set(resolved.crId, { source: resolved, facts });
					}
				}
			}
		}

		// Convert to rows
		const rows: SourceTableRow[] = [];
		for (const { source, facts } of sourceMap.values()) {
			rows.push({
				source,
				typeDef: sourceService.getSourceTypeDefinition(source),
				facts: Array.from(facts)
			});
		}

		return rows;
	}

	/**
	 * Resolve a wikilink string to a SourceNote
	 */
	private resolveSourceFromLink(
		link: unknown,
		sourcePath: string,
		sourceService: SourceService
	): SourceNote | undefined {
		if (typeof link !== 'string') return undefined;

		const path = extractWikilinkPath(link) || link;
		if (!path) return undefined;

		const linkedFile = this.plugin.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
		if (!linkedFile) return undefined;

		return sourceService.getSourceByPath(linkedFile.path);
	}

}
