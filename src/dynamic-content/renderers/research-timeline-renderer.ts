/**
 * Research Timeline Renderer
 *
 * Renders research activities in multiple view modes:
 * - table: Chronological activity log with gap detection (default)
 * - heatmap: GitHub-style contribution grid showing activity density
 * - timeline: Horizontal bars per person/project with gap highlighting
 *
 * Supports grouping by person, project, or source (table view).
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

type ViewMode = 'table' | 'heatmap' | 'timeline';
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

		const viewMode = (config.view as ViewMode) || 'table';

		switch (viewMode) {
			case 'heatmap':
				this.renderHeatmap(contentEl, sorted, config);
				break;
			case 'timeline':
				this.renderTimelineView(contentEl, sorted, config);
				break;
			default: {
				const groupMode = (config.group as GroupMode) || 'none';
				if (groupMode === 'none') {
					await this.renderTable(contentEl, sorted, file, config, component);
				} else {
					await this.renderGrouped(contentEl, sorted, groupMode, file, config, component);
				}
				break;
			}
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
			attr: { 'aria-label': 'Freeze to Markdown' }
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
	 * Render a GitHub-style activity heatmap.
	 * Shows 52 weeks of activity density, with color intensity indicating session count per day.
	 */
	private renderHeatmap(
		contentEl: HTMLElement,
		activities: ResearchActivity[],
		config: DynamicBlockConfig
	): void {
		const gapThreshold = typeof config.gap === 'number' ? config.gap : 30;

		// Count activities per date
		const countsByDate = new Map<string, number>();
		for (const a of activities) {
			if (!a.date) continue;
			countsByDate.set(a.date, (countsByDate.get(a.date) || 0) + 1);
		}

		// Determine date range: last 52 weeks ending today (or latest activity date)
		const allDates = Array.from(countsByDate.keys()).sort();
		const endDate = new Date();
		const startDate = new Date(endDate);
		startDate.setDate(startDate.getDate() - 52 * 7 + 1);

		// Align start to Sunday
		startDate.setDate(startDate.getDate() - startDate.getDay());

		// Find max count for intensity scaling
		let maxCount = 0;
		for (const count of countsByDate.values()) {
			if (count > maxCount) maxCount = count;
		}
		if (maxCount === 0) maxCount = 1;

		const wrapper = contentEl.createDiv({ cls: 'cr-research-timeline__heatmap' });

		// Day labels
		const dayLabels = wrapper.createDiv({ cls: 'cr-research-timeline__heatmap-day-labels' });
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		for (let d = 0; d < 7; d++) {
			const label = dayLabels.createDiv({ cls: 'cr-research-timeline__heatmap-day-label' });
			// Only show labels for Mon, Wed, Fri to avoid crowding
			if (d % 2 === 1) {
				label.setText(dayNames[d]);
			}
		}

		// Grid of weeks
		const grid = wrapper.createDiv({ cls: 'cr-research-timeline__heatmap-grid' });

		const current = new Date(startDate);
		let weekEl: HTMLElement | null = null;
		while (current <= endDate) {
			const dayOfWeek = current.getDay();
			if (dayOfWeek === 0) {
				weekEl = grid.createDiv({ cls: 'cr-research-timeline__heatmap-week' });
			}

			const dateStr = current.toISOString().slice(0, 10);
			const count = countsByDate.get(dateStr) || 0;

			// Determine intensity level (0-4)
			let level = 0;
			if (count > 0) {
				level = Math.min(4, Math.ceil((count / maxCount) * 4));
			}

			weekEl!.createDiv({
				cls: `cr-research-timeline__heatmap-cell cr-research-timeline__heatmap-cell--level-${level}`,
				attr: {
					'aria-label': `${dateStr}: ${count} ${count === 1 ? 'activity' : 'activities'}`,
					title: `${dateStr}: ${count} ${count === 1 ? 'activity' : 'activities'}`
				}
			});

			current.setDate(current.getDate() + 1);
		}

		// Month labels along the top
		const monthLabels = wrapper.createDiv({ cls: 'cr-research-timeline__heatmap-month-labels' });
		const monthCurrent = new Date(startDate);
		let lastMonth = -1;
		let weekCount = 0;

		while (monthCurrent <= endDate) {
			if (monthCurrent.getDay() === 0) {
				const month = monthCurrent.getMonth();
				if (month !== lastMonth) {
					const label = monthLabels.createDiv({
						cls: 'cr-research-timeline__heatmap-month-label',
						text: monthCurrent.toLocaleString('default', { month: 'short' })
					});
					label.style.gridColumnStart = String(weekCount + 1);
					lastMonth = month;
				}
				weekCount++;
			}
			monthCurrent.setDate(monthCurrent.getDate() + 1);
		}

		// Legend
		const legend = wrapper.createDiv({ cls: 'cr-research-timeline__heatmap-legend' });
		legend.createSpan({ text: 'Less', cls: 'cr-research-timeline__heatmap-legend-label' });
		for (let i = 0; i <= 4; i++) {
			legend.createDiv({
				cls: `cr-research-timeline__heatmap-cell cr-research-timeline__heatmap-cell--level-${i}`
			});
		}
		legend.createSpan({ text: 'More', cls: 'cr-research-timeline__heatmap-legend-label' });

		// Gap summary: find longest inactive stretch within the date range
		if (allDates.length > 1) {
			const gapSummary = wrapper.createDiv({ cls: 'cr-research-timeline__heatmap-summary' });
			const sortedDates = allDates.filter(d => d >= startDate.toISOString().slice(0, 10)).sort();
			let longestGap = 0;
			let gapStart = '';
			let gapEnd = '';

			for (let i = 1; i < sortedDates.length; i++) {
				const gap = this.computeGapDays(sortedDates[i - 1], sortedDates[i]);
				if (gap > longestGap) {
					longestGap = gap;
					gapStart = sortedDates[i - 1];
					gapEnd = sortedDates[i];
				}
			}

			if (longestGap >= gapThreshold) {
				const iconEl = gapSummary.createSpan({ cls: 'cr-research-timeline__heatmap-summary-icon' });
				setIcon(iconEl, 'alert-triangle');
				gapSummary.createSpan({
					text: ` Longest gap: ${longestGap} days (${gapStart} to ${gapEnd})`
				});
			}
		}
	}

	/**
	 * Render a horizontal timeline view with one row per person or project.
	 * Shows markers at each research session with highlighted gap regions.
	 */
	private renderTimelineView(
		contentEl: HTMLElement,
		activities: ResearchActivity[],
		config: DynamicBlockConfig
	): void {
		const gapThreshold = typeof config.gap === 'number' ? config.gap : 30;

		// Group activities by person or project (default: person)
		const groupBy = (config.group as string) || 'person';
		const groups = new Map<string, ResearchActivity[]>();

		for (const a of activities) {
			if (!a.date) continue;
			const key = groupBy === 'project'
				? (a.project || 'Unknown project')
				: (a.person || 'Unknown person');
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(a);
		}

		if (groups.size === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No dated research activity found.'
			});
			return;
		}

		// Determine global date range
		let globalMin = Infinity;
		let globalMax = -Infinity;
		for (const a of activities) {
			if (!a.date) continue;
			const t = new Date(a.date).getTime();
			if (t < globalMin) globalMin = t;
			if (t > globalMax) globalMax = t;
		}

		const totalRange = globalMax - globalMin;
		if (totalRange <= 0) return;

		const wrapper = contentEl.createDiv({ cls: 'cr-research-timeline__timeline-view' });

		// Sort groups alphabetically
		const sortedKeys = Array.from(groups.keys()).sort();

		for (const key of sortedKeys) {
			const groupActivities = groups.get(key)!;
			const sortedByDate = groupActivities
				.filter(a => a.date)
				.sort((a, b) => a.date!.localeCompare(b.date!));

			if (sortedByDate.length === 0) continue;

			const row = wrapper.createDiv({ cls: 'cr-research-timeline__timeline-row' });

			// Label
			row.createDiv({
				cls: 'cr-research-timeline__timeline-label',
				text: key
			});

			// Bar
			const bar = row.createDiv({ cls: 'cr-research-timeline__timeline-bar' });

			// Render gap regions
			for (let i = 1; i < sortedByDate.length; i++) {
				const gapDays = this.computeGapDays(sortedByDate[i - 1].date!, sortedByDate[i].date!);
				if (gapDays >= gapThreshold) {
					const startT = new Date(sortedByDate[i - 1].date!).getTime();
					const endT = new Date(sortedByDate[i].date!).getTime();
					const leftPct = ((startT - globalMin) / totalRange) * 100;
					const widthPct = ((endT - startT) / totalRange) * 100;

					const gapEl = bar.createDiv({
						cls: 'cr-research-timeline__timeline-gap',
						attr: {
							title: `${gapDays}-day gap (${sortedByDate[i - 1].date} to ${sortedByDate[i].date})`
						}
					});
					gapEl.style.left = `${leftPct}%`;
					gapEl.style.width = `${widthPct}%`;
				}
			}

			// Render activity markers
			for (const a of sortedByDate) {
				const t = new Date(a.date!).getTime();
				const leftPct = ((t - globalMin) / totalRange) * 100;

				const resultCls = a.result ? `cr-research-timeline__timeline-marker--${a.result}` : '';
				const marker = bar.createDiv({
					cls: `cr-research-timeline__timeline-marker ${resultCls}`,
					attr: {
						title: `${a.date}: ${a.searchedFor || 'Research activity'} (${a.result || 'unknown'})`
					}
				});
				marker.style.left = `${leftPct}%`;
			}
		}

		// Date axis
		const axis = wrapper.createDiv({ cls: 'cr-research-timeline__timeline-axis' });
		const axisLabel = axis.createDiv({ cls: 'cr-research-timeline__timeline-label' });
		// Empty label to align with rows
		axisLabel.setText('');

		const axisBar = axis.createDiv({ cls: 'cr-research-timeline__timeline-bar cr-research-timeline__timeline-axis-bar' });
		const startLabel = new Date(globalMin).toISOString().slice(0, 10);
		const endLabel = new Date(globalMax).toISOString().slice(0, 10);
		axisBar.createSpan({ cls: 'cr-research-timeline__timeline-axis-start', text: startLabel });
		axisBar.createSpan({ cls: 'cr-research-timeline__timeline-axis-end', text: endLabel });
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
