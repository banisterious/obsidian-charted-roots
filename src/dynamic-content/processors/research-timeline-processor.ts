/**
 * Research Timeline Processor
 *
 * Handles the `charted-roots-research-timeline` code block.
 * Surfaces all research activity across the vault from two formats:
 *
 * 1. Frontmatter on research_log_entry notes (all results: positive, negative, inconclusive)
 * 2. Markdown entries within research_journal notes matching `→ result` pattern
 *
 * Usage in a note:
 * ```charted-roots-research-timeline
 * view: table
 * sort: reverse
 * person: [[John Smith]]
 * project: [[My Research Project]]
 * gap: 30
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { DynamicBlockConfig } from '../services/dynamic-content-service';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { ResearchTimelineRenderer, type ResearchActivity } from '../renderers/research-timeline-renderer';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';
import type { ResearchResult } from '../../research/types/research-types';

/**
 * Regex for parsing markdown research log entries with any result.
 *
 * Matches lines like:
 * - **2026-01-04** — [[1860 Census]] — Searched "John Smith" → negative.
 * - **2026-01-04** — [[Source]] — Searched "query" -> positive. Some notes.
 * - **2026-01-04** — Searched "query" → inconclusive.
 *
 * Groups: 1=date, 2=source (optional wikilink), 3=searched-for text, 4=result, 5=trailing notes
 */
const RESEARCH_LINE_REGEX =
	/\*\*(\d{4}-\d{2}-\d{2})\*\*\s*[—–-]\s*(?:\[\[([^\]]+)\]\]\s*[—–-]\s*)?[Ss]earched\s+"([^"]+)"\s*(?:→|->)\s*(positive|negative|inconclusive)\.?\s*(.*)/;

/**
 * Processor for charted-roots-research-timeline code blocks
 */
export class ResearchTimelineProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: ResearchTimelineRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new ResearchTimelineRenderer(this.service);
	}

	/**
	 * Process a charted-roots-research-timeline code block
	 */
	process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void {
		try {
			const config = this.service.parseConfig(source);

			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			const file = this.plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) {
				renderBlockError(el, `Could not find file: ${ctx.sourcePath}`);
				return;
			}

			// Gather activities (async) and render
			void this.gatherAndRender(el, file, config, component);

			// Register for metadata changes to re-render
			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', () => {
					el.empty();
					void this.gatherAndRender(el, file, config, component);
				})
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			renderBlockError(el, `Error rendering research timeline: ${message}`);
		}
	}

	/**
	 * Gather activities and render (async wrapper)
	 */
	private async gatherAndRender(
		el: HTMLElement,
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const activities = await this.gatherResearchActivities(config);
		await this.renderer.render(el, activities, file, config, component);
	}

	/**
	 * Gather all research activities from the vault
	 */
	private async gatherResearchActivities(config: DynamicBlockConfig): Promise<ResearchActivity[]> {
		const activities: ResearchActivity[] = [];

		const projectFilter = typeof config.project === 'string'
			? extractWikilinkPath(config.project) || config.project
			: undefined;
		const personFilter = typeof config.person === 'string'
			? extractWikilinkPath(config.person) || config.person
			: undefined;

		const app = this.plugin.app;

		for (const file of app.vault.getFiles()) {
			if (file.extension !== 'md') continue;

			const cache = app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			const crType = fm.cr_type || fm.type;

			// Format 1: research_log_entry notes (all results)
			if (crType === 'research_log_entry') {
				const activity = this.extractActivityFromLogEntry(file, fm, projectFilter, personFilter);
				if (activity) activities.push(activity);
			}

			// Format 2: research_journal notes — parse markdown for → result entries
			if (crType === 'research_journal') {
				const markdownActivities = await this.extractActivitiesFromMarkdown(file, fm, projectFilter, personFilter);
				activities.push(...markdownActivities);
			}
		}

		return activities;
	}

	/**
	 * Extract a research activity from a research_log_entry note's frontmatter
	 */
	private extractActivityFromLogEntry(
		file: TFile,
		fm: Record<string, unknown>,
		projectFilter: string | undefined,
		personFilter: string | undefined
	): ResearchActivity | null {
		const date = typeof fm.date === 'string' ? fm.date : undefined;
		const source = typeof fm.source === 'string' ? extractWikilinkPath(fm.source) || fm.source : undefined;
		const searchedFor = typeof fm.searched_for === 'string' ? fm.searched_for : undefined;
		const result = this.parseResult(fm.result);

		// Resolve project from `project` or `up` property
		const projectRaw = fm.project || fm.up;
		const project = typeof projectRaw === 'string' ? extractWikilinkPath(projectRaw) || projectRaw : undefined;

		// Resolve person/subject from `subject` or `person` property
		const subjectRaw = fm.subject || fm.person;
		const person = typeof subjectRaw === 'string' ? extractWikilinkPath(subjectRaw) || subjectRaw : undefined;

		if (projectFilter && project !== projectFilter) return null;
		if (personFilter && person !== personFilter) return null;

		return {
			date,
			source,
			searchedFor,
			result,
			project,
			person,
			origin: 'frontmatter',
			filePath: file.path
		};
	}

	/**
	 * Extract research activities from markdown ## Research Log sections
	 */
	private async extractActivitiesFromMarkdown(
		file: TFile,
		fm: Record<string, unknown>,
		projectFilter: string | undefined,
		personFilter: string | undefined
	): Promise<ResearchActivity[]> {
		// Resolve project/person from journal frontmatter for context
		const projectRaw = fm.project || fm.up;
		const project = typeof projectRaw === 'string' ? extractWikilinkPath(projectRaw) || projectRaw : undefined;
		const subjectRaw = fm.subject || fm.person;
		const person = typeof subjectRaw === 'string' ? extractWikilinkPath(subjectRaw) || subjectRaw : undefined;

		if (projectFilter && project !== projectFilter) return [];
		if (personFilter && person !== personFilter) return [];

		const content = await this.plugin.app.vault.cachedRead(file);
		const activities: ResearchActivity[] = [];

		for (const line of content.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;

			// Quick check for result marker before running full regex
			if (!trimmed.includes('→') && !trimmed.includes('->')) continue;

			const match = trimmed.match(RESEARCH_LINE_REGEX);
			if (!match) continue;

			activities.push({
				date: match[1],
				source: match[2] ? extractWikilinkPath(match[2]) || match[2] : undefined,
				searchedFor: match[3],
				result: match[4] as ResearchResult,
				project,
				person,
				origin: 'markdown',
				filePath: file.path
			});
		}

		return activities;
	}

	/**
	 * Parse a result value from frontmatter
	 */
	private parseResult(value: unknown): ResearchResult | undefined {
		if (typeof value !== 'string') return undefined;
		const normalized = value.toLowerCase().trim();
		if (normalized === 'positive' || normalized === 'negative' || normalized === 'inconclusive') {
			return normalized;
		}
		return undefined;
	}
}
