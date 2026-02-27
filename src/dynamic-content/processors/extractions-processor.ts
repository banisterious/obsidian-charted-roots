/**
 * Extractions Processor
 *
 * Handles the `charted-roots-extractions` code block.
 * Renders persons, events, and places that reference the current source note.
 *
 * Usage in a source note:
 * ```charted-roots-extractions
 * title: Extractions
 * sort: chronological
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService } from '../services/dynamic-content-service';
import { ExtractionsRenderer, type ExtractionData, type PersonExtractionRow } from '../renderers/extractions-renderer';
import { EventService } from '../../events/services/event-service';
import type { EventNote } from '../../events/types/event-types';
import { SOURCED_PROPERTY_NAMES, SOURCED_PROPERTY_TO_FACT_KEY } from '../../sources/types/source-types';
import type { FactKey } from '../../sources/types/source-types';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';

/**
 * Processor for charted-roots-extractions code blocks
 */
export class ExtractionsProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: ExtractionsRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new ExtractionsRenderer(this.service);
	}

	/**
	 * Process a charted-roots-extractions code block
	 */
	process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void {
		try {
			const config = this.service.parseConfig(source);
			const context = this.service.buildContext(ctx);

			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// Gather extractions and render
			const data = this.gatherExtractions(context.file);
			void this.renderer.render(el, data, context.file, config, component);

			// Register for metadata changes to re-render
			const metadataHandler = () => {
				const freshData = this.gatherExtractions(context.file);
				el.empty();
				void this.renderer.render(el, freshData, context.file, config, component);
			};

			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.renderError(el, `Error rendering extractions: ${message}`);
		}
	}

	/**
	 * Gather all entities that reference the current source note
	 */
	private gatherExtractions(file: TFile): ExtractionData {
		const sourceBasename = file.basename;

		const persons = this.findPersonsReferencingSource(sourceBasename);
		const events = this.findEventsReferencingSource(sourceBasename);
		const places = this.derivePlaces(events);

		return { persons, events, places };
	}

	/**
	 * Find person notes that reference this source via sources array or sourced_* properties
	 */
	private findPersonsReferencingSource(sourceBasename: string): PersonExtractionRow[] {
		const app = this.plugin.app;
		const persons: PersonExtractionRow[] = [];

		for (const file of app.vault.getFiles()) {
			if (file.extension !== 'md') continue;

			const cache = app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			// Only check person notes
			const crType = fm.cr_type || fm.type;
			if (crType !== 'person') continue;

			const facts = new Set<FactKey>();
			let referencesSource = false;

			// Check general sources array
			const sourcesProperty = this.plugin.resolveFrontmatterProperty<string | string[]>(fm, 'sources');
			if (sourcesProperty) {
				const sourceLinks = Array.isArray(sourcesProperty) ? sourcesProperty : [sourcesProperty];
				for (const link of sourceLinks) {
					if (typeof link === 'string' && this.matchesSource(link, sourceBasename)) {
						referencesSource = true;
						break;
					}
				}
			}

			// Check sourced_* properties for fact-level citations
			for (const propName of SOURCED_PROPERTY_NAMES) {
				const propValue = fm[propName];
				if (!propValue) continue;

				const links = Array.isArray(propValue) ? propValue : [propValue];
				for (const link of links) {
					if (typeof link === 'string' && this.matchesSource(link, sourceBasename)) {
						referencesSource = true;
						facts.add(SOURCED_PROPERTY_TO_FACT_KEY[propName]);
						break;
					}
				}
			}

			// Check legacy sourced_facts
			const legacySourcedFacts = fm.sourced_facts;
			if (legacySourcedFacts && typeof legacySourcedFacts === 'object' && !Array.isArray(legacySourcedFacts)) {
				for (const [factKeyStr, value] of Object.entries(legacySourcedFacts as Record<string, unknown>)) {
					const links: unknown[] = Array.isArray(value)
						? value
						: (value && typeof value === 'object' && 'sources' in value && Array.isArray((value as Record<string, unknown>).sources))
							? (value as Record<string, unknown[]>).sources
							: [];

					for (const link of links) {
						if (typeof link === 'string' && this.matchesSource(link, sourceBasename)) {
							referencesSource = true;
							facts.add(factKeyStr as FactKey);
							break;
						}
					}
				}
			}

			if (referencesSource) {
				persons.push({
					filePath: file.path,
					name: fm.name || file.basename,
					facts: Array.from(facts)
				});
			}
		}

		// Sort alphabetically by name
		persons.sort((a, b) => a.name.localeCompare(b.name));
		return persons;
	}

	/**
	 * Find events that reference this source in their sources array
	 */
	private findEventsReferencingSource(sourceBasename: string): EventNote[] {
		const eventService = new EventService(this.plugin.app, this.plugin.settings);
		const allEvents = eventService.getAllEvents();

		const matching = allEvents.filter(event => {
			if (!event.sources || event.sources.length === 0) return false;
			return event.sources.some(link => this.matchesSource(link, sourceBasename));
		});

		// Sort chronologically
		matching.sort((a, b) => {
			if (!a.date && !b.date) return 0;
			if (!a.date) return 1;
			if (!b.date) return -1;
			return a.date.localeCompare(b.date);
		});

		return matching;
	}

	/**
	 * Derive unique places from events that reference this source
	 */
	private derivePlaces(events: EventNote[]): string[] {
		const placeSet = new Set<string>();
		for (const event of events) {
			if (event.place) {
				placeSet.add(event.place);
			}
		}
		return Array.from(placeSet).sort();
	}

	/**
	 * Check if a wikilink matches the source basename
	 */
	private matchesSource(link: string, sourceBasename: string): boolean {
		const path = extractWikilinkPath(link);
		// Compare basename (last segment of path, without extension)
		const linkBasename = path.split('/').pop()?.replace(/\.md$/, '') || path;
		return linkBasename === sourceBasename;
	}

	/**
	 * Render an error message
	 */
	private renderError(el: HTMLElement, message: string): void {
		el.createDiv({
			cls: 'cr-dynamic-block cr-dynamic-block--error',
			text: message
		});
	}
}
