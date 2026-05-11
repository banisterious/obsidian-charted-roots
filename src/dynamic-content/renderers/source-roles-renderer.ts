/**
 * Source Roles Renderer
 *
 * Renders person roles from source notes as a formatted table.
 * Displays principals, witnesses, informants, officials, etc. with wikilinks.
 */

import { MarkdownRenderer, MarkdownRenderChild, App } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { SourceNote } from '../../sources/types/source-types';
import {
	PERSON_ROLE_PROPERTIES,
	PERSON_ROLE_LABELS,
	parsePersonRoleEntries,
	type PersonRoleProperty,
	type ParsedPersonRole
} from '../../sources/types/source-types';

/**
 * Row entry for the roles table
 */
interface RoleTableRow {
	roleLabel: string;
	roleProperty: PersonRoleProperty;
	person: ParsedPersonRole;
}

/**
 * Context for rendering source roles
 */
export interface SourceRolesContext {
	/** The source note containing roles */
	source: SourceNote;
	/** The source file path */
	sourcePath: string;
	/** App instance for rendering */
	app: App;
}

/**
 * Renders source roles content into an HTML element
 */
export class SourceRolesRenderer {
	private service: DynamicContentService;
	/** Store data for freeze functionality */
	private currentRows: RoleTableRow[] | null = null;
	private currentContext: SourceRolesContext | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the source roles block
	 */
	async render(
		el: HTMLElement,
		context: SourceRolesContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-source-roles' });

		// Build table rows
		const rows = this.buildTableRows(context.source, config);

		// Store for freeze functionality
		this.currentRows = rows;
		this.currentContext = context;
		this.currentConfig = config;

		// Render header
		this.renderHeader(container, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (rows.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No person roles found in this source.'
			});
			return;
		}

		// Render the table
		await this.renderTable(contentEl, rows, context, component);
	}

	/**
	 * Render the header with title and toolbar
	 */
	private renderHeader(container: HTMLElement, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const title = config.title as string || 'Person roles';
		header.createSpan({ cls: 'cr-dynamic-block__title', text: title });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

		// Freeze button
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to Markdown' }
		});
		freezeBtn.textContent = '❄️';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});
	}

	/**
	 * Build table rows from source roles
	 */
	private buildTableRows(source: SourceNote, config: DynamicBlockConfig): RoleTableRow[] {
		const rows: RoleTableRow[] = [];

		// Check what roles to include
		const include = config.include as string[] | undefined;
		const exclude = config.exclude as string[] | undefined;

		for (const prop of PERSON_ROLE_PROPERTIES) {
			// Apply include filter
			if (include && include.length > 0 && !include.includes(prop)) {
				continue;
			}

			// Apply exclude filter
			if (exclude && exclude.length > 0 && exclude.includes(prop)) {
				continue;
			}

			const entries = source[prop];
			if (!entries || entries.length === 0) continue;

			const parsed = parsePersonRoleEntries(entries);
			const label = PERSON_ROLE_LABELS[prop];

			for (const person of parsed) {
				rows.push({
					roleLabel: label,
					roleProperty: prop,
					person
				});
			}
		}

		return rows;
	}

	/**
	 * Render the roles table
	 */
	private async renderTable(
		contentEl: HTMLElement,
		rows: RoleTableRow[],
		context: SourceRolesContext,
		component: MarkdownRenderChild
	): Promise<void> {
		const table = contentEl.createEl('table', { cls: 'cr-source-roles__table' });

		// Header row
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Role' });
		headerRow.createEl('th', { text: 'Person' });
		headerRow.createEl('th', { text: 'Details' });

		// Body rows
		const tbody = table.createEl('tbody');

		for (const row of rows) {
			const tr = tbody.createEl('tr');

			// Role column
			tr.createEl('td', { text: row.roleLabel, cls: 'cr-source-roles__role' });

			// Person column (with wikilink)
			const personCell = tr.createEl('td', { cls: 'cr-source-roles__person' });
			const wikilink = `[[${row.person.linkTarget}]]`;
			await MarkdownRenderer.render(
				context.app,
				wikilink,
				personCell,
				context.sourcePath,
				component
			);

			// Details column
			const details = row.person.details || '—';
			tr.createEl('td', { text: details, cls: 'cr-source-roles__details' });
		}
	}

	/**
	 * Generate markdown from current data and replace the code block
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentContext || !this.currentRows) {
			return;
		}

		const markdown = this.generateMarkdown();

		// Get file from path
		const file = this.currentContext.app.vault.getAbstractFileByPath(this.currentContext.sourcePath);
		if (!file || !(file instanceof (await import('obsidian')).TFile)) {
			return;
		}

		await this.service.freezeToMarkdown(
			file,
			'charted-roots-source-roles',
			markdown
		);
	}

	/**
	 * Generate markdown representation of the roles
	 */
	private generateMarkdown(): string {
		if (!this.currentRows || !this.currentConfig) {
			return '';
		}

		const title = this.currentConfig.title as string || 'Person roles';
		const lines: string[] = [`## ${title}`, ''];

		if (this.currentRows.length === 0) {
			lines.push('*No person roles found.*');
			return lines.join('\n');
		}

		// Generate markdown table
		lines.push('| Role | Person | Details |');
		lines.push('|------|--------|---------|');

		for (const row of this.currentRows) {
			const person = `[[${row.person.linkTarget}]]`;
			const details = row.person.details || '—';
			lines.push(`| ${row.roleLabel} | ${person} | ${details} |`);
		}

		return lines.join('\n');
	}
}
