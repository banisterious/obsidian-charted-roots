/* eslint-disable @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Extractions Renderer
 *
 * Renders persons, events, and places that reference a source note.
 * Three grouped sections with tables, freeze-to-markdown support.
 */

import { MarkdownRenderer, MarkdownRenderChild, TFile, setIcon } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { EventNote } from '../../events/types/event-types';
import { getEventType } from '../../events/types/event-types';
import type { FactKey } from '../../sources/types/source-types';
import { FACT_KEY_LABELS } from '../../sources/types/source-types';

/**
 * A person that references this source
 */
export interface PersonExtractionRow {
	filePath: string;
	name: string;
	facts: FactKey[];
}

/**
 * All entities that reference this source
 */
export interface ExtractionData {
	persons: PersonExtractionRow[];
	events: EventNote[];
	places: string[];
}

/**
 * Renders extractions content into an HTML element
 */
export class ExtractionsRenderer {
	private service: DynamicContentService;
	private currentData: ExtractionData | null = null;
	private currentFile: TFile | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the extractions block
	 */
	async render(
		el: HTMLElement,
		data: ExtractionData,
		file: TFile,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-extractions' });

		// Store for freeze
		this.currentData = data;
		this.currentFile = file;
		this.currentConfig = config;

		const totalCount = data.persons.length + data.events.length + data.places.length;

		// Header
		this.renderHeader(container, totalCount, config);

		// Content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (totalCount === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No entities reference this source.'
			});
			return;
		}

		if (data.persons.length > 0) {
			await this.renderPersonsSection(contentEl, data.persons, file, component);
		}
		if (data.events.length > 0) {
			await this.renderEventsSection(contentEl, data.events, file, component);
		}
		if (data.places.length > 0) {
			await this.renderPlacesSection(contentEl, data.places, data.events, file, component);
		}
	}

	/**
	 * Render the header with title, count, and toolbar
	 */
	private renderHeader(container: HTMLElement, count: number, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const titleText = config.title as string || 'Extractions';
		const titleWithCount = count > 0 ? `${titleText} (${count})` : titleText;

		const titleEl = header.createSpan({ cls: 'cr-dynamic-block__title' });

		const iconEl = titleEl.createSpan({ cls: 'cr-dynamic-block__icon' });
		setIcon(iconEl, 'search');

		titleEl.createSpan({ text: ` ${titleWithCount}` });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

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
	 * Render the persons section
	 */
	private async renderPersonsSection(
		contentEl: HTMLElement,
		persons: PersonExtractionRow[],
		file: TFile,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = contentEl.createDiv({ cls: 'cr-extractions__section' });
		section.createEl('h4', {
			text: `Persons (${persons.length})`,
			cls: 'cr-extractions__section-title'
		});

		const table = section.createEl('table', { cls: 'cr-sources__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Name' });
		headerRow.createEl('th', { text: 'Facts cited' });

		const tbody = table.createEl('tbody');
		for (const person of persons) {
			const tr = tbody.createEl('tr');

			// Name column (wikilink)
			const nameCell = tr.createEl('td', { cls: 'cr-sources__title' });
			const basename = person.filePath.replace(/\.md$/, '').split('/').pop() || person.name;
			const displayName = person.name !== basename ? person.name : undefined;
			const wikilink = displayName ? `[[${basename}|${displayName}]]` : `[[${basename}]]`;
			await MarkdownRenderer.render(
				component.containerEl.doc.defaultView?.app ?? (null as never),
				wikilink,
				nameCell,
				file.path,
				component
			);

			// Facts column
			const factsText = person.facts.length > 0
				? person.facts.map(f => FACT_KEY_LABELS[f]).filter(Boolean).join(', ')
				: '—';
			tr.createEl('td', { text: factsText, cls: 'cr-sources__facts' });
		}
	}

	/**
	 * Render the events section
	 */
	private async renderEventsSection(
		contentEl: HTMLElement,
		events: EventNote[],
		file: TFile,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = contentEl.createDiv({ cls: 'cr-extractions__section' });
		section.createEl('h4', {
			text: `Events (${events.length})`,
			cls: 'cr-extractions__section-title'
		});

		const table = section.createEl('table', { cls: 'cr-sources__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Type' });
		headerRow.createEl('th', { text: 'Title' });
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Person(s)' });
		headerRow.createEl('th', { text: 'Place' });

		const tbody = table.createEl('tbody');
		for (const event of events) {
			const tr = tbody.createEl('tr');

			// Type column (icon)
			const typeCell = tr.createEl('td', { cls: 'cr-sources__type' });
			const typeDef = getEventType(event.eventType, [], true);
			if (typeDef) {
				const typeIconEl = typeCell.createSpan({ cls: 'cr-sources__type-icon' });
				setIcon(typeIconEl, typeDef.icon);
				typeIconEl.setAttribute('aria-label', typeDef.name);
			} else {
				typeCell.setText(event.eventType);
			}

			// Title column (wikilink)
			const titleCell = tr.createEl('td', { cls: 'cr-sources__title' });
			const basename = event.filePath.replace(/\.md$/, '').split('/').pop() || event.title;
			const displayTitle = event.title !== basename ? event.title : undefined;
			const titleLink = displayTitle ? `[[${basename}|${displayTitle}]]` : `[[${basename}]]`;
			await MarkdownRenderer.render(
				component.containerEl.doc.defaultView?.app ?? (null as never),
				titleLink,
				titleCell,
				file.path,
				component
			);

			// Date column
			const dateText = event.date ? this.service.formatDate(event.date) : '—';
			tr.createEl('td', { text: dateText, cls: 'cr-sources__date' });

			// Person(s) column
			const personsCell = tr.createEl('td', { cls: 'cr-sources__title' });
			const personLinks = event.persons?.length
				? event.persons.join(', ')
				: event.person || '—';
			if (personLinks !== '—') {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					personLinks,
					personsCell,
					file.path,
					component
				);
			} else {
				personsCell.setText('—');
			}

			// Place column
			const placeCell = tr.createEl('td', { cls: 'cr-sources__title' });
			if (event.place) {
				await MarkdownRenderer.render(
					component.containerEl.doc.defaultView?.app ?? (null as never),
					event.place,
					placeCell,
					file.path,
					component
				);
			} else {
				placeCell.setText('—');
			}
		}
	}

	/**
	 * Render the places section (derived from events)
	 */
	private async renderPlacesSection(
		contentEl: HTMLElement,
		places: string[],
		events: EventNote[],
		file: TFile,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = contentEl.createDiv({ cls: 'cr-extractions__section' });
		section.createEl('h4', {
			text: `Places (${places.length})`,
			cls: 'cr-extractions__section-title'
		});

		// Count events per place
		const placeCounts = new Map<string, number>();
		for (const event of events) {
			if (event.place) {
				placeCounts.set(event.place, (placeCounts.get(event.place) || 0) + 1);
			}
		}

		const table = section.createEl('table', { cls: 'cr-sources__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Place' });
		headerRow.createEl('th', { text: 'Events' });

		const tbody = table.createEl('tbody');
		for (const place of places) {
			const tr = tbody.createEl('tr');

			// Place column (wikilink)
			const placeCell = tr.createEl('td', { cls: 'cr-sources__title' });
			await MarkdownRenderer.render(
				component.containerEl.doc.defaultView?.app ?? (null as never),
				place,
				placeCell,
				file.path,
				component
			);

			// Event count column
			const count = placeCounts.get(place) || 0;
			tr.createEl('td', { text: String(count), cls: 'cr-sources__date' });
		}
	}

	/**
	 * Freeze to markdown
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentFile || !this.currentData) return;

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentFile,
			'charted-roots-extractions',
			markdown
		);
	}

	/**
	 * Generate frozen markdown tables
	 */
	private generateMarkdown(): string {
		if (!this.currentData || !this.currentConfig) return '';

		const title = this.currentConfig.title as string || 'Extractions';
		const lines: string[] = [`## ${title}`, ''];
		const { persons, events, places } = this.currentData;

		if (persons.length === 0 && events.length === 0 && places.length === 0) {
			lines.push('*No entities reference this source.*');
			return lines.join('\n');
		}

		// Persons
		if (persons.length > 0) {
			lines.push(`### Persons (${persons.length})`, '');
			lines.push('| Name | Facts cited |');
			lines.push('|------|------------|');
			for (const person of persons) {
				const basename = person.filePath.replace(/\.md$/, '').split('/').pop() || person.name;
				const displayName = person.name !== basename ? person.name : undefined;
				const nameLink = displayName ? `[[${basename}|${displayName}]]` : `[[${basename}]]`;
				const facts = person.facts.length > 0
					? person.facts.map(f => FACT_KEY_LABELS[f]).filter(Boolean).join(', ')
					: '—';
				lines.push(`| ${nameLink} | ${facts} |`);
			}
			lines.push('');
		}

		// Events
		if (events.length > 0) {
			lines.push(`### Events (${events.length})`, '');
			lines.push('| Type | Title | Date | Person(s) | Place |');
			lines.push('|------|-------|------|-----------|-------|');
			for (const event of events) {
				const typeDef = getEventType(event.eventType, [], true);
				const type = typeDef?.name || event.eventType;
				const basename = event.filePath.replace(/\.md$/, '').split('/').pop() || event.title;
				const displayTitle = event.title !== basename ? event.title : undefined;
				const titleLink = displayTitle ? `[[${basename}|${displayTitle}]]` : `[[${basename}]]`;
				const date = event.date ? this.service.formatDate(event.date) : '—';
				const personText = event.persons?.length
					? event.persons.join(', ')
					: event.person || '—';
				const place = event.place || '—';
				lines.push(`| ${type} | ${titleLink} | ${date} | ${personText} | ${place} |`);
			}
			lines.push('');
		}

		// Places
		if (places.length > 0) {
			// Count events per place
			const placeCounts = new Map<string, number>();
			for (const event of events) {
				if (event.place) {
					placeCounts.set(event.place, (placeCounts.get(event.place) || 0) + 1);
				}
			}

			lines.push(`### Places (${places.length})`, '');
			lines.push('| Place | Events |');
			lines.push('|-------|--------|');
			for (const place of places) {
				const count = placeCounts.get(place) || 0;
				lines.push(`| ${place} | ${count} |`);
			}
			lines.push('');
		}

		return lines.join('\n');
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-argument -- Match scope of file-level disable at top. */
