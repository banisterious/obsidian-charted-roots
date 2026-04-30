/**
 * Universe Entities Renderer
 *
 * Renders lists of entities (people, places, events, organizations)
 * belonging to a universe. Used by the charted-roots-universe-* code blocks.
 */

import { MarkdownRenderer, MarkdownRenderChild, App, TFile } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { UniverseEntities, UniverseEntityEntry } from '../../universes/types/universe-types';

/**
 * Context for rendering universe entities
 */
export interface UniverseEntitiesContext {
	/** Universe display name */
	universeName: string;
	/** Universe cr_id */
	universeCrId: string;
	/**
	 * Lowercased identifier set for the universe — file basename, frontmatter
	 * `name`, and `cr_id`. Used by the cache-change handler so a referencing
	 * note's `universe:` value matches whether it was written by the dropdown
	 * (name) or rewritten by the rename cascade (basename) (#503).
	 */
	universeAliases: Set<string>;
	/** Entities grouped by type */
	entities: UniverseEntities;
	/** The universe note file */
	universeFile: TFile;
	/** App instance for rendering */
	app: App;
}

/**
 * Renders universe entities content into an HTML element
 */
export class UniverseEntitiesRenderer {
	private service: DynamicContentService;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the universe entities block
	 */
	async render(
		el: HTMLElement,
		context: UniverseEntitiesContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-universe-entities' });

		// Determine which sections to show
		const show = config.show as string || 'all';
		const sections = show === 'all'
			? ['people', 'places', 'events', 'organizations'] as const
			: [show] as const;

		// Check if everything is empty
		const totalCount = context.entities.people.length +
			context.entities.places.length +
			context.entities.events.length +
			context.entities.organizations.length;

		if (totalCount === 0) {
			container.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No entities found for this universe.'
			});
			return;
		}

		// Render each requested section
		for (const section of sections) {
			switch (section) {
				case 'people':
					if (context.entities.people.length > 0) {
						await this.renderPeopleSection(container, context, config, component);
					}
					break;
				case 'places':
					if (context.entities.places.length > 0) {
						await this.renderPlacesSection(container, context, config, component);
					}
					break;
				case 'events':
					if (context.entities.events.length > 0) {
						await this.renderEventsSection(container, context, config, component);
					}
					break;
				case 'organizations':
					if (context.entities.organizations.length > 0) {
						await this.renderOrganizationsSection(container, context, config, component);
					}
					break;
			}
		}
	}

	/**
	 * Render the people section
	 */
	private async renderPeopleSection(
		container: HTMLElement,
		context: UniverseEntitiesContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = container.createDiv({ cls: 'cr-universe-entities__section' });
		{
			section.createEl('h4', { cls: 'cr-universe-entities__heading', text: `People (${context.entities.people.length})` });
		}

		const table = section.createEl('table', { cls: 'cr-universe-entities__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Name' });
		headerRow.createEl('th', { text: 'Born' });
		headerRow.createEl('th', { text: 'Died' });
		headerRow.createEl('th', { text: 'Occupation' });

		const tbody = table.createEl('tbody');

		let entries = [...context.entities.people];
		entries = this.sortEntries(entries, config);
		entries = this.applyLimit(entries, config);

		for (const entry of entries) {
			const row = tbody.createEl('tr');

			// Name as wikilink
			const nameCell = row.createEl('td');
			await this.renderWikilink(nameCell, entry, context, component);

			// Dates
			row.createEl('td', { text: entry.born || '—', cls: 'cr-universe-entities__date' });
			row.createEl('td', { text: entry.died || '—', cls: 'cr-universe-entities__date' });
			row.createEl('td', { text: entry.occupation || '—', cls: 'cr-universe-entities__meta' });
		}
	}

	/**
	 * Render the places section
	 */
	private async renderPlacesSection(
		container: HTMLElement,
		context: UniverseEntitiesContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = container.createDiv({ cls: 'cr-universe-entities__section' });
		{
			section.createEl('h4', { cls: 'cr-universe-entities__heading', text: `Places (${context.entities.places.length})` });
		}

		const table = section.createEl('table', { cls: 'cr-universe-entities__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Name' });
		headerRow.createEl('th', { text: 'Type' });

		const tbody = table.createEl('tbody');

		let entries = [...context.entities.places];
		entries = this.sortEntries(entries, config);
		entries = this.applyLimit(entries, config);

		for (const entry of entries) {
			const row = tbody.createEl('tr');

			const nameCell = row.createEl('td');
			await this.renderWikilink(nameCell, entry, context, component);

			row.createEl('td', { text: entry.placeType || '—', cls: 'cr-universe-entities__meta' });
		}
	}

	/**
	 * Render the events section
	 */
	private async renderEventsSection(
		container: HTMLElement,
		context: UniverseEntitiesContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = container.createDiv({ cls: 'cr-universe-entities__section' });
		{
			section.createEl('h4', { cls: 'cr-universe-entities__heading', text: `Events (${context.entities.events.length})` });
		}

		const table = section.createEl('table', { cls: 'cr-universe-entities__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Event' });
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Type' });
		headerRow.createEl('th', { text: 'Place' });

		const tbody = table.createEl('tbody');

		let entries = [...context.entities.events];
		entries = this.sortEntries(entries, config);
		entries = this.applyLimit(entries, config);

		for (const entry of entries) {
			const row = tbody.createEl('tr');

			const nameCell = row.createEl('td');
			await this.renderWikilink(nameCell, entry, context, component);

			row.createEl('td', { text: entry.date || '—', cls: 'cr-universe-entities__date' });

			const typeCell = row.createEl('td', { cls: 'cr-universe-entities__meta' });
			if (entry.eventType) {
				const badge = typeCell.createSpan({ cls: `cr-universe-entities__badge cr-universe-entities__badge--${entry.eventType}` });
				badge.textContent = entry.eventType;
			} else {
				typeCell.textContent = '—';
			}

			row.createEl('td', { text: entry.placeName || '—', cls: 'cr-universe-entities__meta' });
		}
	}

	/**
	 * Render the organizations section
	 */
	private async renderOrganizationsSection(
		container: HTMLElement,
		context: UniverseEntitiesContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = container.createDiv({ cls: 'cr-universe-entities__section' });
		{
			section.createEl('h4', { cls: 'cr-universe-entities__heading', text: `Organizations (${context.entities.organizations.length})` });
		}

		const table = section.createEl('table', { cls: 'cr-universe-entities__table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Name' });
		headerRow.createEl('th', { text: 'Type' });

		const tbody = table.createEl('tbody');

		let entries = [...context.entities.organizations];
		entries = this.sortEntries(entries, config);
		entries = this.applyLimit(entries, config);

		for (const entry of entries) {
			const row = tbody.createEl('tr');

			const nameCell = row.createEl('td');
			await this.renderWikilink(nameCell, entry, context, component);

			row.createEl('td', { text: entry.orgType || '—', cls: 'cr-universe-entities__meta' });
		}
	}

	/**
	 * Render a wikilink for an entity entry
	 */
	private async renderWikilink(
		cell: HTMLElement,
		entry: UniverseEntityEntry,
		context: UniverseEntitiesContext,
		component: MarkdownRenderChild
	): Promise<void> {
		const linkEl = cell.createSpan({ cls: 'cr-universe-entities__link' });
		const basename = entry.file.path.replace(/\.md$/, '').split('/').pop() || entry.name;
		const wikilink = basename !== entry.name
			? `[[${basename}|${entry.name}]]`
			: `[[${basename}]]`;
		await MarkdownRenderer.render(
			context.app,
			wikilink,
			linkEl,
			context.universeFile.path,
			component
		);
	}

	/**
	 * Sort entries based on config
	 */
	private sortEntries(entries: UniverseEntityEntry[], config: DynamicBlockConfig): UniverseEntityEntry[] {
		const sort = config.sort as string || 'name';

		switch (sort) {
			case 'date':
				return entries.sort((a, b) => {
					const dateA = a.born || a.date || '';
					const dateB = b.born || b.date || '';
					return dateA.localeCompare(dateB);
				});
			case 'type':
				return entries.sort((a, b) => {
					const typeA = a.eventType || a.placeType || a.orgType || a.occupation || '';
					const typeB = b.eventType || b.placeType || b.orgType || b.occupation || '';
					return typeA.localeCompare(typeB) || a.name.localeCompare(b.name);
				});
			case 'name':
			default:
				return entries.sort((a, b) => a.name.localeCompare(b.name));
		}
	}

	/**
	 * Apply limit if configured
	 */
	private applyLimit(entries: UniverseEntityEntry[], config: DynamicBlockConfig): UniverseEntityEntry[] {
		const limit = config.limit as number;
		if (limit && limit > 0) {
			return entries.slice(0, limit);
		}
		return entries;
	}
}
