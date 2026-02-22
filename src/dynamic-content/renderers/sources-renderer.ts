/**
 * Sources Renderer
 *
 * Renders a table of sources linked to a person note.
 * Shows source type, title (as wikilink), date, and which facts each source supports.
 */

import { MarkdownRenderer, MarkdownRenderChild, TFile, setIcon } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { SourceNote, SourceTypeDefinition, FactKey } from '../../sources/types/source-types';
import { FACT_KEY_LABELS } from '../../sources/types/source-types';

/**
 * Row entry for the sources table
 */
export interface SourceTableRow {
	source: SourceNote;
	typeDef: SourceTypeDefinition | undefined;
	facts: FactKey[];
}

/**
 * Sort mode for the sources table
 */
type SortMode = 'chronological' | 'reverse' | 'type';

/**
 * Renders sources content into an HTML element
 */
export class SourcesRenderer {
	private service: DynamicContentService;
	private currentRows: SourceTableRow[] | null = null;
	private currentFile: TFile | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the sources block
	 */
	async render(
		el: HTMLElement,
		rows: SourceTableRow[],
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-sources' });

		// Apply filters
		let filtered = this.applyFilters(rows, config);

		// Sort
		filtered = this.sortRows(filtered, config);

		// Store for freeze
		this.currentRows = filtered;
		this.currentFile = file;
		this.currentConfig = config;

		// Render header
		this.renderHeader(container, filtered.length, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (filtered.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No sources linked to this note.'
			});
			return;
		}

		await this.renderTable(contentEl, filtered, file, component);
	}

	/**
	 * Render the header with title, count, and toolbar
	 */
	private renderHeader(container: HTMLElement, count: number, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const titleText = config.title as string || 'Sources';
		const titleWithCount = count > 0 ? `${titleText} (${count})` : titleText;

		const titleEl = header.createSpan({ cls: 'cr-dynamic-block__title' });

		const iconEl = titleEl.createSpan({ cls: 'cr-dynamic-block__icon' });
		setIcon(iconEl, 'book-open');

		titleEl.createSpan({ text: ` ${titleWithCount}` });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

		// Freeze button
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to markdown' }
		});
		freezeBtn.textContent = '❄️';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});
	}

	/**
	 * Apply include/exclude filters based on source type
	 */
	private applyFilters(rows: SourceTableRow[], config: DynamicBlockConfig): SourceTableRow[] {
		const include = config.filter as string[] | string | undefined;
		const exclude = config.exclude as string[] | string | undefined;

		let filtered = rows;

		if (include) {
			const includeTypes = Array.isArray(include) ? include : [include];
			filtered = filtered.filter(r => includeTypes.includes(r.source.sourceType));
		}

		if (exclude) {
			const excludeTypes = Array.isArray(exclude) ? exclude : [exclude];
			filtered = filtered.filter(r => !excludeTypes.includes(r.source.sourceType));
		}

		return filtered;
	}

	/**
	 * Sort rows by configured mode
	 */
	private sortRows(rows: SourceTableRow[], config: DynamicBlockConfig): SourceTableRow[] {
		const mode = (config.sort as SortMode) || 'chronological';
		const sorted = [...rows];

		switch (mode) {
			case 'chronological':
				sorted.sort((a, b) => this.compareDates(a.source.date, b.source.date));
				break;
			case 'reverse':
				sorted.sort((a, b) => this.compareDates(b.source.date, a.source.date));
				break;
			case 'type':
				sorted.sort((a, b) => a.source.sourceType.localeCompare(b.source.sourceType));
				break;
		}

		return sorted;
	}

	/**
	 * Compare two date strings for sorting
	 */
	private compareDates(a: string | undefined, b: string | undefined): number {
		if (!a && !b) return 0;
		if (!a) return 1;
		if (!b) return -1;
		return a.localeCompare(b);
	}

	/**
	 * Render the sources table
	 */
	private async renderTable(
		contentEl: HTMLElement,
		rows: SourceTableRow[],
		file: TFile,
		component: MarkdownRenderChild
	): Promise<void> {
		const table = contentEl.createEl('table', { cls: 'cr-sources__table' });

		// Header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Type' });
		headerRow.createEl('th', { text: 'Title' });
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Facts' });

		// Body
		const tbody = table.createEl('tbody');
		const app = this.service.getSettings() ? component.containerEl.doc.defaultView?.app : undefined;

		for (const row of rows) {
			const tr = tbody.createEl('tr');

			// Type column (icon)
			const typeCell = tr.createEl('td', { cls: 'cr-sources__type' });
			if (row.typeDef) {
				const iconEl = typeCell.createSpan({ cls: 'cr-sources__type-icon' });
				setIcon(iconEl, row.typeDef.icon);
				iconEl.setAttribute('aria-label', row.typeDef.name);
			} else {
				typeCell.setText(row.source.sourceType);
			}

			// Title column (wikilink with display title)
			const titleCell = tr.createEl('td', { cls: 'cr-sources__title' });
			const basename = row.source.filePath.replace(/\.md$/, '').split('/').pop() || row.source.title;
			const displayTitle = row.source.title && row.source.title !== basename ? row.source.title : undefined;
			const wikilink = displayTitle ? `[[${basename}|${displayTitle}]]` : `[[${basename}]]`;
			await MarkdownRenderer.render(
				component.containerEl.doc.defaultView?.app ?? (app as never),
				wikilink,
				titleCell,
				file.path,
				component
			);

			// Date column
			const dateText = row.source.date ? this.service.formatDate(row.source.date) : '—';
			tr.createEl('td', { text: dateText, cls: 'cr-sources__date' });

			// Facts column
			const factsText = row.facts.length > 0
				? row.facts.map(f => FACT_KEY_LABELS[f]).join(', ')
				: '—';
			tr.createEl('td', { text: factsText, cls: 'cr-sources__facts' });
		}
	}

	/**
	 * Freeze to markdown
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentFile || !this.currentRows) return;

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentFile,
			'charted-roots-sources',
			markdown
		);
	}

	/**
	 * Generate frozen markdown table
	 */
	private generateMarkdown(): string {
		if (!this.currentRows || !this.currentConfig) return '';

		const title = this.currentConfig.title as string || 'Sources';
		const lines: string[] = [`## ${title}`, ''];

		if (this.currentRows.length === 0) {
			lines.push('*No sources linked.*');
			return lines.join('\n');
		}

		lines.push('| Type | Title | Date | Facts |');
		lines.push('|------|-------|------|-------|');

		for (const row of this.currentRows) {
			const type = row.typeDef?.name || row.source.sourceType;
			const basename = row.source.filePath.replace(/\.md$/, '').split('/').pop() || row.source.title;
			const displayTitle = row.source.title && row.source.title !== basename ? row.source.title : undefined;
			const titleLink = displayTitle ? `[[${basename}|${displayTitle}]]` : `[[${basename}]]`;
			const date = row.source.date ? this.service.formatDate(row.source.date) : '—';
			const facts = row.facts.length > 0
				? row.facts.map(f => FACT_KEY_LABELS[f]).join(', ')
				: '—';
			lines.push(`| ${type} | ${titleLink} | ${date} | ${facts} |`);
		}

		return lines.join('\n');
	}
}
