/**
 * Research Timeline Renderer
 *
 * Renders a table of research activities with gap detection.
 * Supports grouping by person, project, or source.
 */

import { MarkdownRenderer, MarkdownRenderChild, TFile, setIcon } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { ResearchResult } from '../../research/types/research-types';

/**
 * A single research activity entry
 */
export interface ResearchActivity {
	date: string | undefined;
	source: string | undefined;
	searchedFor: string | undefined;
	result: ResearchResult | undefined;
	project: string | undefined;
	person: string | undefined;
	origin: 'frontmatter' | 'markdown';
	filePath: string;
}

type GroupMode = 'person' | 'project' | 'source' | 'none';
type SortMode = 'chronological' | 'reverse';

/** Result display metadata */
const RESULT_INFO: Record<string, { label: string; cls: string; icon: string }> = {
	positive: { label: 'Positive', cls: 'cr-research-timeline__result--positive', icon: 'check-circle' },
	negative: { label: 'Negative', cls: 'cr-research-timeline__result--negative', icon: 'x-circle' },
	inconclusive: { label: 'Inconclusive', cls: 'cr-research-timeline__result--inconclusive', icon: 'help-circle' }
};

/**
 * Renders research timeline content into an HTML element
 */
export class ResearchTimelineRenderer {
	private service: DynamicContentService;
	private currentActivities: ResearchActivity[] | null = null;
	private currentFile: TFile | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the research timeline block
	 */
	async render(
		el: HTMLElement,
		activities: ResearchActivity[],
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-research-timeline' });

		// Sort
		const sorted = this.sortActivities(activities, config);

		// Store for freeze
		this.currentActivities = sorted;
		this.currentFile = file;
		this.currentConfig = config;

		// Render header
		this.renderHeader(container, sorted.length, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (sorted.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No research activity found.'
			});
			return;
		}

		const groupMode = (config.group as GroupMode) || 'none';

		if (groupMode === 'none') {
			await this.renderTable(contentEl, sorted, file, config, component);
		} else {
			await this.renderGrouped(contentEl, sorted, groupMode, file, config, component);
		}
	}

	/**
	 * Render the header with title, count, and toolbar
	 */
	private renderHeader(container: HTMLElement, count: number, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const titleText = (config.title as string) || 'Research timeline';
		const titleWithCount = count > 0 ? `${titleText} (${count})` : titleText;

		const titleEl = header.createSpan({ cls: 'cr-dynamic-block__title' });
		const iconEl = titleEl.createSpan({ cls: 'cr-dynamic-block__icon' });
		setIcon(iconEl, 'clock');
		titleEl.createSpan({ text: ` ${titleWithCount}` });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to markdown' }
		});
		freezeBtn.textContent = '\u2744\uFE0F';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});
	}

	/**
	 * Sort activities by date
	 */
	private sortActivities(activities: ResearchActivity[], config: DynamicBlockConfig): ResearchActivity[] {
		const mode = (config.sort as SortMode) || 'chronological';
		const sorted = [...activities];

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
	 * Render activities grouped by person, project, or source
	 */
	private async renderGrouped(
		contentEl: HTMLElement,
		activities: ResearchActivity[],
		groupMode: GroupMode,
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const groups = new Map<string, ResearchActivity[]>();

		for (const a of activities) {
			let key: string;
			switch (groupMode) {
				case 'person':
					key = a.person || 'Unknown';
					break;
				case 'project':
					key = a.project || 'Unknown';
					break;
				case 'source':
					key = a.source || 'Unknown';
					break;
				default:
					key = 'All';
			}

			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(a);
		}

		// Sort group keys alphabetically
		const sortedKeys = Array.from(groups.keys()).sort();

		for (const key of sortedKeys) {
			const groupActivities = groups.get(key)!;
			const groupEl = contentEl.createDiv({ cls: 'cr-research-timeline__group' });

			const headerEl = groupEl.createDiv({ cls: 'cr-research-timeline__group-header' });
			// Render group key as wikilink if it looks like a note name
			await MarkdownRenderer.render(
				component.containerEl.doc.defaultView?.app ?? (null as never),
				`**[[${key}]]** (${groupActivities.length})`,
				headerEl,
				file.path,
				component
			);

			await this.renderTable(groupEl, groupActivities, file, config, component);
		}
	}

	/**
	 * Compute the gap in days between two ISO date strings
	 */
	private computeGapDays(dateA: string, dateB: string): number {
		const a = new Date(dateA);
		const b = new Date(dateB);
		return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
	}

	/**
	 * Render a table of activities with gap detection
	 */
	private async renderTable(
		contentEl: HTMLElement,
		activities: ResearchActivity[],
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const gapThreshold = typeof config.gap === 'number' ? config.gap : 30;
		const table = contentEl.createEl('table', { cls: 'cr-research-timeline__table' });

		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Source' });
		headerRow.createEl('th', { text: 'Searched for' });
		headerRow.createEl('th', { text: 'Result' });
		headerRow.createEl('th', { text: 'Project' });
		headerRow.createEl('th', { text: 'Person' });
		headerRow.createEl('th', { text: 'Gap (days)' });

		const tbody = table.createEl('tbody');

		for (let i = 0; i < activities.length; i++) {
			const activity = activities[i];

			// Compute gap from previous activity
			let gapDays: number | undefined;
			if (i > 0 && activity.date && activities[i - 1].date) {
				gapDays = this.computeGapDays(activities[i - 1].date!, activity.date);
			}

			const isGap = gapDays !== undefined && gapDays >= gapThreshold;

			const tr = tbody.createEl('tr');
			if (isGap) {
				tr.addClass('cr-research-timeline__row--gap');
			}

			// Date
			const dateText = activity.date ? this.service.formatDate(activity.date) : '\u2014';
			tr.createEl('td', { text: dateText, cls: 'cr-research-timeline__date' });

			// Source (as wikilink)
			const sourceCell = tr.createEl('td', { cls: 'cr-research-timeline__source' });
			if (activity.source) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					`[[${activity.source}]]`,
					sourceCell,
					file.path,
					component
				);
			} else {
				sourceCell.setText('\u2014');
			}

			// Searched for
			tr.createEl('td', {
				text: activity.searchedFor || '\u2014',
				cls: 'cr-research-timeline__searched-for'
			});

			// Result (with icon and color)
			const resultCell = tr.createEl('td', { cls: 'cr-research-timeline__result' });
			if (activity.result) {
				const info = RESULT_INFO[activity.result];
				if (info) {
					resultCell.addClass(info.cls);
					const resultIcon = resultCell.createSpan({ cls: 'cr-research-timeline__result-icon' });
					setIcon(resultIcon, info.icon);
					resultCell.createSpan({ text: ` ${info.label}` });
				}
			} else {
				resultCell.setText('\u2014');
			}

			// Project (as wikilink)
			const projectCell = tr.createEl('td', { cls: 'cr-research-timeline__project' });
			if (activity.project) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					`[[${activity.project}]]`,
					projectCell,
					file.path,
					component
				);
			} else {
				projectCell.setText('\u2014');
			}

			// Person (as wikilink)
			const personCell = tr.createEl('td', { cls: 'cr-research-timeline__person' });
			if (activity.person) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					`[[${activity.person}]]`,
					personCell,
					file.path,
					component
				);
			} else {
				personCell.setText('\u2014');
			}

			// Gap (days)
			const gapCell = tr.createEl('td', { cls: 'cr-research-timeline__gap' });
			if (gapDays !== undefined) {
				gapCell.setText(String(gapDays));
				if (isGap) {
					gapCell.addClass('cr-research-timeline__gap--flagged');
				}
			} else {
				gapCell.setText('\u2014');
			}
		}
	}

	/**
	 * Freeze to markdown
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentFile || !this.currentActivities) return;

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentFile,
			'charted-roots-research-timeline',
			markdown
		);
	}

	/**
	 * Generate frozen markdown table
	 */
	private generateMarkdown(): string {
		if (!this.currentActivities || !this.currentConfig) return '';

		const gapThreshold = typeof this.currentConfig.gap === 'number' ? this.currentConfig.gap : 30;
		const title = (this.currentConfig.title as string) || 'Research timeline';
		const lines: string[] = [`## ${title}`, ''];

		if (this.currentActivities.length === 0) {
			lines.push('*No research activity found.*');
			return lines.join('\n');
		}

		lines.push('| Date | Source | Searched for | Result | Project | Person | Gap (days) |');
		lines.push('|------|--------|--------------|--------|---------|--------|------------|');

		for (let i = 0; i < this.currentActivities.length; i++) {
			const a = this.currentActivities[i];
			const date = a.date ? this.service.formatDate(a.date) : '\u2014';
			const source = a.source ? `[[${a.source}]]` : '\u2014';
			const searchedFor = a.searchedFor || '\u2014';
			const result = a.result || '\u2014';
			const project = a.project ? `[[${a.project}]]` : '\u2014';
			const person = a.person ? `[[${a.person}]]` : '\u2014';

			let gap = '\u2014';
			if (i > 0 && a.date && this.currentActivities[i - 1].date) {
				const gapDays = this.computeGapDays(this.currentActivities[i - 1].date!, a.date);
				gap = gapDays >= gapThreshold ? `**${gapDays}**` : String(gapDays);
			}

			lines.push(`| ${date} | ${source} | ${searchedFor} | ${result} | ${project} | ${person} | ${gap} |`);
		}

		return lines.join('\n');
	}
}
