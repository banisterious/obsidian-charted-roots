/**
 * Negative Findings Processor
 *
 * Handles the `charted-roots-negative-findings` code block.
 * Surfaces all negative findings across the vault from two formats:
 *
 * 1. Frontmatter on research_log_entry notes with `result: negative`
 * 2. Markdown entries within ## Research Log sections matching `→ negative`
 *
 * Usage in a note:
 * ```charted-roots-negative-findings
 * group: person
 * sort: chronological
 * project: [[My Research Project]]
 * person: [[John Smith]]
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { DynamicBlockConfig } from '../services/dynamic-content-service';
import { DynamicContentService, renderBlockError } from '../services/dynamic-content-service';
import { NegativeFindingsRenderer, type NegativeFinding } from '../renderers/negative-findings-renderer';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';

/**
 * Regex for parsing markdown research log entries with negative results.
 *
 * Matches lines like:
 * - **2026-01-04** — [[1860 Census]] — Searched "John Smith" → negative.
 * - **2026-01-04** — [[Source]] — Searched "query" -> negative. Some notes.
 * - **2026-01-04** — Searched "query" → negative.
 *
 * Groups: 1=date, 2=source (optional wikilink), 3=searched-for text, 4=trailing notes
 */
const NEGATIVE_LINE_REGEX =
	/\*\*(\d{4}-\d{2}-\d{2})\*\*\s*[—–-]\s*(?:\[\[([^\]]+)\]\]\s*[—–-]\s*)?[Ss]earched\s+"([^"]+)"\s*(?:→|->)\s*negative\.?\s*(.*)/;

/**
 * Processor for charted-roots-negative-findings code blocks
 */
export class NegativeFindingsProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: NegativeFindingsRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new NegativeFindingsRenderer(this.service);
	}

	/**
	 * Process a charted-roots-negative-findings code block
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

			// Gather findings (async) and render
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
			renderBlockError(el, `Error rendering negative findings: ${message}`);
		}
	}

	/**
	 * Gather findings and render (async wrapper)
	 */
	private async gatherAndRender(
		el: HTMLElement,
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const findings = await this.gatherNegativeFindings(config);
		await this.renderer.render(el, findings, file, config, component);
	}

	/**
	 * Gather all negative findings from the vault
	 */
	private async gatherNegativeFindings(config: DynamicBlockConfig): Promise<NegativeFinding[]> {
		const findings: NegativeFinding[] = [];

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

			// Format 1: research_log_entry notes with result: negative
			if (crType === 'research_log_entry' && fm.result === 'negative') {
				const finding = this.extractFindingFromLogEntry(file, fm, projectFilter, personFilter);
				if (finding) findings.push(finding);
			}

			// Format 2: research_journal notes — parse markdown for → negative entries
			if (crType === 'research_journal') {
				const markdownFindings = await this.extractFindingsFromMarkdown(file, fm, projectFilter, personFilter);
				findings.push(...markdownFindings);
			}
		}

		return findings;
	}

	/**
	 * Extract a negative finding from a research_log_entry note's frontmatter
	 */
	private extractFindingFromLogEntry(
		file: TFile,
		fm: Record<string, unknown>,
		projectFilter: string | undefined,
		personFilter: string | undefined
	): NegativeFinding | null {
		const date = typeof fm.date === 'string' ? fm.date : undefined;
		const source = typeof fm.source === 'string' ? extractWikilinkPath(fm.source) || fm.source : undefined;
		const searchedFor = typeof fm.searched_for === 'string' ? fm.searched_for : undefined;

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
			project,
			person,
			origin: 'frontmatter',
			filePath: file.path
		};
	}

	/**
	 * Extract negative findings from markdown ## Research Log sections
	 */
	private async extractFindingsFromMarkdown(
		file: TFile,
		fm: Record<string, unknown>,
		projectFilter: string | undefined,
		personFilter: string | undefined
	): Promise<NegativeFinding[]> {
		// Resolve project/person from journal frontmatter for context
		const projectRaw = fm.project || fm.up;
		const project = typeof projectRaw === 'string' ? extractWikilinkPath(projectRaw) || projectRaw : undefined;
		const subjectRaw = fm.subject || fm.person;
		const person = typeof subjectRaw === 'string' ? extractWikilinkPath(subjectRaw) || subjectRaw : undefined;

		if (projectFilter && project !== projectFilter) return [];
		if (personFilter && person !== personFilter) return [];

		const content = await this.plugin.app.vault.cachedRead(file);
		const findings: NegativeFinding[] = [];

		for (const line of content.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;

			// Check for negative result marker before running full regex
			if (!trimmed.includes('negative')) continue;

			const match = trimmed.match(NEGATIVE_LINE_REGEX);
			if (!match) continue;

			findings.push({
				date: match[1],
				source: match[2] ? extractWikilinkPath(match[2]) || match[2] : undefined,
				searchedFor: match[3],
				project,
				person,
				origin: 'markdown',
				filePath: file.path
			});
		}

		return findings;
	}
}
