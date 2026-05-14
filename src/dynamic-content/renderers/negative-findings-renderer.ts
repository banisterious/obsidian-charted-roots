/* eslint-disable @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Negative Findings Renderer
 *
 * Renders a searchable, filterable table of negative findings.
 * Supports grouping by person, project, or source.
 */

import { MarkdownRenderer, MarkdownRenderChild, TFile, setIcon } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';

/**
 * A single negative finding entry
 */
export interface NegativeFinding {
	date: string | undefined;
	source: string | undefined;
	searchedFor: string | undefined;
	project: string | undefined;
	person: string | undefined;
	origin: 'frontmatter' | 'markdown';
	filePath: string;
}

type GroupMode = 'person' | 'project' | 'source' | 'none';
type SortMode = 'chronological' | 'reverse';

/**
 * Renders negative findings content into an HTML element
 */
export class NegativeFindingsRenderer {
	private service: DynamicContentService;
	private currentFindings: NegativeFinding[] | null = null;
	private currentFile: TFile | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the negative findings block
	 */
	async render(
		el: HTMLElement,
		findings: NegativeFinding[],
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-negative-findings' });

		// Sort
		const sorted = this.sortFindings(findings, config);

		// Store for freeze
		this.currentFindings = sorted;
		this.currentFile = file;
		this.currentConfig = config;

		// Render header
		this.renderHeader(container, sorted.length, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (sorted.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No negative findings found.'
			});
			return;
		}

		const groupMode = (config.group as GroupMode) || 'none';

		if (groupMode === 'none') {
			await this.renderTable(contentEl, sorted, file, component);
		} else {
			await this.renderGrouped(contentEl, sorted, groupMode, file, component);
		}
	}

	/**
	 * Render the header with title, count, and toolbar
	 */
	private renderHeader(container: HTMLElement, count: number, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const titleText = (config.title as string) || 'Negative findings';
		const titleWithCount = count > 0 ? `${titleText} (${count})` : titleText;

		const titleEl = header.createSpan({ cls: 'cr-dynamic-block__title' });
		const iconEl = titleEl.createSpan({ cls: 'cr-dynamic-block__icon' });
		setIcon(iconEl, 'search-x');
		titleEl.createSpan({ text: ` ${titleWithCount}` });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to Markdown' }
		});
		freezeBtn.textContent = '\u2744\uFE0F';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});
	}

	/**
	 * Sort findings by date
	 */
	private sortFindings(findings: NegativeFinding[], config: DynamicBlockConfig): NegativeFinding[] {
		const mode = (config.sort as SortMode) || 'chronological';
		const sorted = [...findings];

		sorted.sort((a, b) => {
			const dateA = a.date || '';
			const dateB = b.date || '';
			if (!dateA && !dateB) return 0;
			if (!dateA) return 1;
			if (!dateB) return -1;
			return mode === 'reverse'
				? dateB.localeCompare(dateA)
				: dateA.localeCompare(dateB);
		});

		return sorted;
	}

	/**
	 * Render findings grouped by person, project, or source
	 */
	private async renderGrouped(
		contentEl: HTMLElement,
		findings: NegativeFinding[],
		groupMode: GroupMode,
		file: TFile,
		component: MarkdownRenderChild
	): Promise<void> {
		const groups = new Map<string, NegativeFinding[]>();

		for (const f of findings) {
			let key: string;
			switch (groupMode) {
				case 'person':
					key = f.person || 'Unknown';
					break;
				case 'project':
					key = f.project || 'Unknown';
					break;
				case 'source':
					key = f.source || 'Unknown';
					break;
				default:
					key = 'All';
			}

			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(f);
		}

		// Sort group keys alphabetically
		const sortedKeys = Array.from(groups.keys()).sort();

		for (const key of sortedKeys) {
			const groupFindings = groups.get(key)!;
			const groupEl = contentEl.createDiv({ cls: 'cr-negative-findings__group' });

			const headerEl = groupEl.createDiv({ cls: 'cr-negative-findings__group-header' });
			// Render group key as wikilink if it looks like a note name
			await MarkdownRenderer.render(
				component.containerEl.doc.defaultView?.app ?? (null as never),
				`**[[${key}]]** (${groupFindings.length})`,
				headerEl,
				file.path,
				component
			);

			await this.renderTable(groupEl, groupFindings, file, component);
		}
	}

	/**
	 * Render a table of findings
	 */
	private async renderTable(
		contentEl: HTMLElement,
		findings: NegativeFinding[],
		file: TFile,
		component: MarkdownRenderChild
	): Promise<void> {
		const table = contentEl.createEl('table', { cls: 'cr-negative-findings__table' });

		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Source' });
		headerRow.createEl('th', { text: 'Searched for' });
		headerRow.createEl('th', { text: 'Project' });
		headerRow.createEl('th', { text: 'Person' });

		const tbody = table.createEl('tbody');

		for (const finding of findings) {
			const tr = tbody.createEl('tr');

			// Date
			const dateText = finding.date ? this.service.formatDate(finding.date) : '\u2014';
			tr.createEl('td', { text: dateText, cls: 'cr-negative-findings__date' });

			// Source (as wikilink)
			const sourceCell = tr.createEl('td', { cls: 'cr-negative-findings__source' });
			if (finding.source) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					`[[${finding.source}]]`,
					sourceCell,
					file.path,
					component
				);
			} else {
				sourceCell.setText('\u2014');
			}

			// Searched for
			tr.createEl('td', {
				text: finding.searchedFor || '\u2014',
				cls: 'cr-negative-findings__searched-for'
			});

			// Project (as wikilink)
			const projectCell = tr.createEl('td', { cls: 'cr-negative-findings__project' });
			if (finding.project) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					`[[${finding.project}]]`,
					projectCell,
					file.path,
					component
				);
			} else {
				projectCell.setText('\u2014');
			}

			// Person (as wikilink)
			const personCell = tr.createEl('td', { cls: 'cr-negative-findings__person' });
			if (finding.person) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					`[[${finding.person}]]`,
					personCell,
					file.path,
					component
				);
			} else {
				personCell.setText('\u2014');
			}
		}
	}

	/**
	 * Freeze to markdown
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentFile || !this.currentFindings) return;

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentFile,
			'charted-roots-negative-findings',
			markdown
		);
	}

	/**
	 * Generate frozen markdown table
	 */
	private generateMarkdown(): string {
		if (!this.currentFindings || !this.currentConfig) return '';

		const title = (this.currentConfig.title as string) || 'Negative findings';
		const lines: string[] = [`## ${title}`, ''];

		if (this.currentFindings.length === 0) {
			lines.push('*No negative findings found.*');
			return lines.join('\n');
		}

		lines.push('| Date | Source | Searched for | Project | Person |');
		lines.push('|------|--------|--------------|---------|--------|');

		for (const f of this.currentFindings) {
			const date = f.date ? this.service.formatDate(f.date) : '\u2014';
			const source = f.source ? `[[${f.source}]]` : '\u2014';
			const searchedFor = f.searchedFor || '\u2014';
			const project = f.project ? `[[${f.project}]]` : '\u2014';
			const person = f.person ? `[[${f.person}]]` : '\u2014';
			lines.push(`| ${date} | ${source} | ${searchedFor} | ${project} | ${person} |`);
		}

		return lines.join('\n');
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-argument */
