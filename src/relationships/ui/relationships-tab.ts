/**
 * Relationships Tab UI Component
 *
 * Renders the Relationships tab in the Control Center, showing
 * relationship types, relationships list with filter/sort/pagination,
 * context menus, and statistics.
 *
 * The list rendering is extracted into `renderRelationshipsList()` so it
 * can be shared between the modal card and the dockable ItemView.
 */

import { setIcon, Menu, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { getContrastColor } from '../../ui/create-person-types';
import { RelationshipService } from '../services/relationship-service';
import {
	RELATIONSHIP_CATEGORY_NAMES,
	type RelationshipCategory,
	type ParsedRelationship
} from '../types/relationship-types';
import { renderRelationshipTypeManagerCard } from './relationship-type-manager-card';

/**
 * Filter options for relationships list
 */
export type RelationshipFilter = 'all' | 'defined' | 'inferred' | `type_${string}` | `category_${string}` | `person_${string}`;

/**
 * Sort options for relationships list
 */
export type RelationshipSort = 'from_asc' | 'from_desc' | 'to_asc' | 'to_desc' | 'type' | 'date_asc' | 'date_desc';

/**
 * Options for rendering the relationships list.
 * Used by both the modal card and the dockable ItemView.
 */
export interface RelationshipsListOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	/** Navigation callback — used by the modal for tab switching. Optional in ItemView context. */
	showTab?: (tabId: string) => void;
	/** Initial filter state for restoration */
	initialFilter?: RelationshipFilter;
	/** Initial sort state for restoration */
	initialSort?: RelationshipSort;
	/** Callback invoked when filter/sort state changes (for persistence) */
	onStateChange?: (filter: RelationshipFilter, sort: RelationshipSort) => void;
}

/**
 * Render the Relationships tab content
 */
export function renderRelationshipsTab(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement,
	showTab: (tabId: string) => void
): void {
	const relationshipService = new RelationshipService(plugin);

	// Relationship Type Manager card (replaces simple types card)
	renderRelationshipTypeManagerCard(container, plugin, createCard, () => {
		showTab('relationships');
	});

	// Relationships Overview card
	renderRelationshipsOverviewCard(container, plugin, createCard, showTab);

	// Statistics card
	renderRelationshipStatsCard(container, relationshipService, createCard);
}

/**
 * Render Custom Relationships card — thin wrapper around renderRelationshipsList()
 */
function renderRelationshipsOverviewCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement,
	showTab: (tabId: string) => void
): void {
	const card = createCard({
		title: 'Custom relationships',
		icon: 'users'
	});

	addDockButton(card, plugin);

	const content = card.querySelector('.crc-card__content') as HTMLElement;

	renderRelationshipsList({
		container: content,
		plugin,
		showTab
	});

	container.appendChild(card);
}

/**
 * Add a dock button to a card header that opens the relationships view
 * in the right sidebar.
 */
function addDockButton(card: HTMLElement, plugin: CanvasRootsPlugin): void {
	const header = card.querySelector('.crc-card__header');
	if (!header) return;

	const dockBtn = document.createElement('button');
	dockBtn.className = 'crc-card__dock-btn clickable-icon';
	dockBtn.setAttribute('aria-label', 'Open in sidebar');
	setIcon(dockBtn, 'panel-right');
	dockBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void plugin.activateRelationshipsView();
	});
	header.appendChild(dockBtn);
}

/**
 * Render the relationships list with filter/sort/pagination and context menus.
 * Shared between the modal card and the dockable ItemView.
 */
export function renderRelationshipsList(options: RelationshipsListOptions): void {
	const { container, plugin, showTab, onStateChange } = options;
	const service = new RelationshipService(plugin);

	// Loading
	const loading = container.createDiv({ cls: 'crc-loading' });
	loading.createSpan({ text: 'Loading relationships...' });

	try {
		const relationships = service.getAllRelationshipsWithInferred();
		const stats = service.getStats();

		loading.remove();

		if (relationships.length === 0) {
			const emptyState = container.createDiv({ cls: 'crc-empty-state' });
			setIcon(emptyState.createSpan({ cls: 'crc-empty-icon' }), 'link-2');
			emptyState.createEl('p', { text: 'No custom relationships found.' });
			emptyState.createEl('p', {
				cls: 'crc-text-muted',
				text: 'Custom relationships (godparent, guardian, mentor, etc.) are defined in person note frontmatter. Standard family links (spouse, parent, child) are handled separately on canvas trees.'
			});
		} else {
			// Summary row
			const summaryRow = container.createDiv({ cls: 'crc-relationship-summary-row' });
			summaryRow.createSpan({
				text: `${stats.totalDefined} defined relationships`,
				cls: 'crc-relationship-stat'
			});
			summaryRow.createSpan({
				text: `${stats.totalInferred} inferred`,
				cls: 'crc-relationship-stat crc-text-muted'
			});
			summaryRow.createSpan({
				text: `${stats.peopleWithRelationships} people`,
				cls: 'crc-relationship-stat'
			});

			// State for filters, sorting, and pagination
			let currentFilter: RelationshipFilter = options.initialFilter ?? 'all';
			let currentSort: RelationshipSort = options.initialSort ?? 'from_asc';
			let displayLimit = 25;

			// Filter and sort controls
			const controls = container.createDiv({ cls: 'crc-relationship-controls' });

			// Filter dropdown
			const filterContainer = controls.createDiv({ cls: 'crc-filter-container' });
			const filterSelect = filterContainer.createEl('select', { cls: 'dropdown crc-filter-select' });

			// Build filter options
			filterSelect.createEl('option', { value: 'all', text: 'All relationships' });

			// Source filter group
			const sourceGroup = filterSelect.createEl('optgroup', { attr: { label: 'By source' } });
			sourceGroup.createEl('option', { value: 'defined', text: 'Defined only' });
			sourceGroup.createEl('option', { value: 'inferred', text: 'Inferred only' });

			// Type-based filters
			const allTypes = service.getAllRelationshipTypes();
			const usedTypeIds = new Set(relationships.map(r => r.type.id));
			const usedTypes = allTypes.filter(t => usedTypeIds.has(t.id));
			if (usedTypes.length > 0) {
				const typeGroup = filterSelect.createEl('optgroup', { attr: { label: 'By type' } });
				for (const t of usedTypes) {
					typeGroup.createEl('option', { value: `type_${t.id}`, text: t.name });
				}
			}

			// Category-based filters
			const usedCategories = new Set(relationships.map(r => r.type.category));
			if (usedCategories.size > 1) {
				const catGroup = filterSelect.createEl('optgroup', { attr: { label: 'By category' } });
				for (const cat of usedCategories) {
					catGroup.createEl('option', {
						value: `category_${cat}`,
						text: RELATIONSHIP_CATEGORY_NAMES[cat]
					});
				}
			}

			// Person-based filters (top people by relationship count)
			const personCounts = new Map<string, { name: string; count: number }>();
			for (const rel of relationships) {
				const existing = personCounts.get(rel.sourceCrId);
				if (existing) {
					existing.count++;
				} else {
					personCounts.set(rel.sourceCrId, { name: rel.sourceName, count: 1 });
				}
			}
			const topPeople = Array.from(personCounts.entries())
				.sort((a, b) => b[1].count - a[1].count)
				.slice(0, 10);
			if (topPeople.length > 0) {
				const personGroup = filterSelect.createEl('optgroup', { attr: { label: 'By person' } });
				for (const [crId, info] of topPeople) {
					personGroup.createEl('option', {
						value: `person_${crId}`,
						text: `${info.name} (${info.count})`
					});
				}
			}

			// Set initial filter value
			filterSelect.value = currentFilter;

			// Sort dropdown
			const sortContainer = controls.createDiv({ cls: 'crc-filter-container' });
			const sortSelect = sortContainer.createEl('select', { cls: 'dropdown crc-filter-select' });
			sortSelect.createEl('option', { value: 'from_asc', text: 'From A–Z' });
			sortSelect.createEl('option', { value: 'from_desc', text: 'From Z–A' });
			sortSelect.createEl('option', { value: 'to_asc', text: 'To A–Z' });
			sortSelect.createEl('option', { value: 'to_desc', text: 'To Z–A' });
			sortSelect.createEl('option', { value: 'type', text: 'Type' });
			sortSelect.createEl('option', { value: 'date_asc', text: 'Date (oldest)' });
			sortSelect.createEl('option', { value: 'date_desc', text: 'Date (newest)' });

			// Set initial sort value
			sortSelect.value = currentSort;

			// Table container (for refreshing)
			const tableContainer = container.createDiv({ cls: 'crc-relationships-table-container' });

			// Filter function
			const filterRelationships = (rels: ParsedRelationship[]): ParsedRelationship[] => {
				return rels.filter(rel => {
					switch (currentFilter) {
						case 'all':
							return true;
						case 'defined':
							return !rel.isInferred;
						case 'inferred':
							return rel.isInferred;
						default:
							if (currentFilter.startsWith('type_')) {
								const typeId = currentFilter.replace('type_', '');
								return rel.type.id === typeId;
							}
							if (currentFilter.startsWith('category_')) {
								const cat = currentFilter.replace('category_', '');
								return rel.type.category === cat;
							}
							if (currentFilter.startsWith('person_')) {
								const crId = currentFilter.replace('person_', '');
								return rel.sourceCrId === crId || rel.targetCrId === crId;
							}
							return true;
					}
				});
			};

			// Sort function
			const sortRelationships = (rels: ParsedRelationship[]): ParsedRelationship[] => {
				return [...rels].sort((a, b) => {
					switch (currentSort) {
						case 'from_asc':
							return a.sourceName.localeCompare(b.sourceName);
						case 'from_desc':
							return b.sourceName.localeCompare(a.sourceName);
						case 'to_asc':
							return a.targetName.localeCompare(b.targetName);
						case 'to_desc':
							return b.targetName.localeCompare(a.targetName);
						case 'type':
							return a.type.name.localeCompare(b.type.name);
						case 'date_asc':
							return (a.from || '').localeCompare(b.from || '');
						case 'date_desc':
							return (b.from || '').localeCompare(a.from || '');
						default:
							return 0;
					}
				});
			};

			// Render table function
			const renderTable = () => {
				tableContainer.empty();

				const filtered = filterRelationships(relationships);
				const sorted = sortRelationships(filtered);
				const displayed = sorted.slice(0, displayLimit);

				if (filtered.length === 0) {
					const noResults = tableContainer.createDiv({ cls: 'crc-empty-state' });
					noResults.createEl('p', { text: 'No relationships match the current filter.' });
					return;
				}

				const table = tableContainer.createEl('table', { cls: 'crc-relationships-table' });

				// Header
				const thead = table.createEl('thead');
				const headerRow = thead.createEl('tr');
				headerRow.createEl('th', { text: 'From' });
				headerRow.createEl('th', { text: 'Type' });
				headerRow.createEl('th', { text: 'To' });
				headerRow.createEl('th', { text: 'Dates' });

				// Body
				const tbody = table.createEl('tbody');
				for (const rel of displayed) {
					renderRelationshipRow(tbody, rel, plugin, showTab);
				}

				// Show count and load more button
				if (filtered.length > displayLimit) {
					const loadMoreContainer = tableContainer.createDiv({ cls: 'crc-load-more-container' });
					loadMoreContainer.createSpan({
						text: `Showing ${displayed.length} of ${filtered.length} relationships`,
						cls: 'crc-text-muted'
					});
					const loadMoreBtn = loadMoreContainer.createEl('button', { cls: 'mod-cta' });
					loadMoreBtn.textContent = 'Load more';
					loadMoreBtn.addEventListener('click', () => {
						displayLimit += 25;
						renderTable();
					});
				} else if (filtered.length > 0) {
					const countInfo = tableContainer.createDiv({ cls: 'crc-count-info' });
					countInfo.createSpan({
						text: `Showing all ${filtered.length} relationship${filtered.length !== 1 ? 's' : ''}`,
						cls: 'crc-text-muted'
					});
				}
			};

			// Event listeners
			filterSelect.addEventListener('change', () => {
				currentFilter = filterSelect.value as RelationshipFilter;
				displayLimit = 25; // Reset pagination on filter change
				renderTable();
				onStateChange?.(currentFilter, currentSort);
			});

			sortSelect.addEventListener('change', () => {
				currentSort = sortSelect.value as RelationshipSort;
				renderTable();
				onStateChange?.(currentFilter, currentSort);
			});

			// Initial render
			renderTable();
		}
	} catch (error) {
		loading.remove();
		container.createEl('p', {
			cls: 'crc-error',
			text: `Failed to load relationships: ${error instanceof Error ? error.message : String(error)}`
		});
	}
}

/**
 * Render a single relationship as a table row with context menu
 */
function renderRelationshipRow(
	tbody: HTMLTableSectionElement,
	rel: ParsedRelationship,
	plugin: CanvasRootsPlugin,
	showTab?: (tabId: string) => void
): void {
	const row = tbody.createEl('tr');
	if (rel.isInferred) {
		row.classList.add('crc-table-row--muted');
	}

	// From
	const fromCell = row.createEl('td');
	const fromLink = fromCell.createEl('a', {
		text: rel.sourceName,
		cls: 'crc-relationship-link'
	});
	fromLink.addEventListener('click', (e) => {
		e.preventDefault();
		void plugin.app.workspace.openLinkText(rel.sourceFilePath, '');
	});

	// Type
	const typeCell = row.createEl('td');
	const typeBadge = typeCell.createSpan({ cls: 'crc-relationship-badge' });
	typeBadge.style.setProperty('background-color', rel.type.color);
	typeBadge.style.setProperty('color', getContrastColor(rel.type.color));
	typeBadge.textContent = rel.type.name;
	if (rel.isInferred) {
		typeCell.createSpan({ text: ' (inferred)', cls: 'crc-text-muted' });
	}

	// To
	const toCell = row.createEl('td');
	if (rel.targetFilePath) {
		const toLink = toCell.createEl('a', {
			text: rel.targetName,
			cls: 'crc-relationship-link'
		});
		toLink.addEventListener('click', (e) => {
			e.preventDefault();
			void plugin.app.workspace.openLinkText(rel.targetFilePath!, '');
		});
	} else {
		toCell.createSpan({ text: rel.targetName, cls: 'crc-text-muted' });
	}

	// Dates
	const datesCell = row.createEl('td');
	const dateParts: string[] = [];
	if (rel.from) dateParts.push(rel.from);
	if (rel.to) dateParts.push(rel.to);
	datesCell.textContent = dateParts.length > 0 ? dateParts.join(' – ') : '—';

	// Context menu
	row.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showRelationshipContextMenu(rel, e, plugin, showTab);
	});
}

/**
 * Show context menu for a relationship row
 */
function showRelationshipContextMenu(
	rel: ParsedRelationship,
	event: MouseEvent,
	plugin: CanvasRootsPlugin,
	showTab?: (tabId: string) => void
): void {
	const menu = new Menu();

	// Open source person note
	menu.addItem((item) => {
		item
			.setTitle(`Open ${rel.sourceName}`)
			.setIcon('file')
			.onClick(async () => {
				const file = plugin.app.vault.getAbstractFileByPath(rel.sourceFilePath);
				if (file instanceof TFile) {
					await plugin.trackRecentFile(file, 'person');
					void plugin.app.workspace.getLeaf(false).openFile(file);
				}
			});
	});

	// Open target person note (if resolvable)
	if (rel.targetFilePath) {
		menu.addItem((item) => {
			item
				.setTitle(`Open ${rel.targetName}`)
				.setIcon('file')
				.onClick(async () => {
					const file = plugin.app.vault.getAbstractFileByPath(rel.targetFilePath!);
					if (file instanceof TFile) {
						await plugin.trackRecentFile(file, 'person');
						void plugin.app.workspace.getLeaf(false).openFile(file);
					}
				});
		});
	}

	menu.addSeparator();

	// Open source in new tab
	menu.addItem((item) => {
		item
			.setTitle(`Open ${rel.sourceName} in new tab`)
			.setIcon('file-plus')
			.onClick(async () => {
				const file = plugin.app.vault.getAbstractFileByPath(rel.sourceFilePath);
				if (file instanceof TFile) {
					await plugin.trackRecentFile(file, 'person');
					void plugin.app.workspace.getLeaf('tab').openFile(file);
				}
			});
	});

	if (rel.targetFilePath) {
		menu.addItem((item) => {
			item
				.setTitle(`Open ${rel.targetName} in new tab`)
				.setIcon('file-plus')
				.onClick(async () => {
					const file = plugin.app.vault.getAbstractFileByPath(rel.targetFilePath!);
					if (file instanceof TFile) {
						await plugin.trackRecentFile(file, 'person');
						void plugin.app.workspace.getLeaf('tab').openFile(file);
					}
				});
		});
	}

	// View in People tab (only in modal context)
	if (showTab) {
		menu.addSeparator();

		menu.addItem((item) => {
			item
				.setTitle('View in People tab')
				.setIcon('users')
				.onClick(() => {
					showTab('people');
				});
		});
	}

	menu.showAtMouseEvent(event);
}

/**
 * Render Relationship Statistics card
 */
function renderRelationshipStatsCard(
	container: HTMLElement,
	service: RelationshipService,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement
): void {
	const card = createCard({
		title: 'Statistics',
		icon: 'bar-chart'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	try {
		const stats = service.getStats();

		if (stats.totalDefined === 0) {
			content.createEl('p', {
				cls: 'crc-text-muted',
				text: 'No relationship statistics available yet.'
			});
		} else {
			// By Type
			const byTypeSection = content.createDiv({ cls: 'crc-stats-section' });
			byTypeSection.createEl('h4', { text: 'By type', cls: 'crc-section-subtitle' });

			const typeList = byTypeSection.createDiv({ cls: 'crc-stats-list' });
			const sortedTypes = Object.entries(stats.byType)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10);

			for (const [typeId, count] of sortedTypes) {
				const typeDef = service.getRelationshipType(typeId);
				const item = typeList.createDiv({ cls: 'crc-stats-item' });

				const swatch = item.createSpan({ cls: 'crc-stats-swatch' });
				swatch.style.setProperty('background-color', typeDef?.color || '#666');

				item.createSpan({ text: typeDef?.name || typeId, cls: 'crc-stats-label' });
				item.createSpan({ text: count.toString(), cls: 'crc-stats-value' });
			}

			// By Category
			const byCatSection = content.createDiv({ cls: 'crc-stats-section' });
			byCatSection.createEl('h4', { text: 'By category', cls: 'crc-section-subtitle' });

			const catList = byCatSection.createDiv({ cls: 'crc-stats-list' });
			for (const [cat, count] of Object.entries(stats.byCategory)) {
				if (count > 0) {
					const item = catList.createDiv({ cls: 'crc-stats-item' });
					item.createSpan({
						text: RELATIONSHIP_CATEGORY_NAMES[cat as RelationshipCategory],
						cls: 'crc-stats-label'
					});
					item.createSpan({ text: count.toString(), cls: 'crc-stats-value' });
				}
			}
		}
	} catch (error) {
		content.createEl('p', {
			cls: 'crc-error',
			text: `Failed to load statistics: ${error instanceof Error ? error.message : String(error)}`
		});
	}

	container.appendChild(card);
}

