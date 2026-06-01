/**
 * Sources Tab UI Component
 *
 * Renders the Sources tab in the Control Center, showing
 * sources list, statistics, and source types.
 */

import { setIcon, TFile, Menu, Setting } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { getContrastColor } from '../../ui/create-person-types';
import type { SourceService } from '../services/source-service';
import { createLucideIcon } from '../../ui/lucide-icons';
import { CreateSourceModal } from './create-source-modal';
import { SourceImageWizardModal } from './source-image-wizard';
import { SourceMediaLinkerModal } from './source-media-linker';
import { capitalize } from '../../utils/format-utils';
import { renderMediaGallery } from './media-gallery';
import { renderSourceTypeManagerCard } from './source-type-manager-card';
import type { SourceNote } from '../types/source-types';
import { getSourceType, getAllSourceTypes } from '../types/source-types';
import { TemplateSnippetsModal } from '../../ui/template-snippets-modal';
import { ExtractEventsModal } from '../../events/ui/extract-events-modal';

/**
 * Filter options for sources list
 */
export type SourceListFilter = 'all' | 'has_media' | 'no_media' | 'confidence_high' | 'confidence_medium' | 'confidence_low' | 'has_parent' | 'no_parent' | `type_${string}` | `parent_${string}`;

/**
 * Sort options for sources list
 */
export type SourceListSort = 'title_asc' | 'title_desc' | 'date_asc' | 'date_desc' | 'type' | 'confidence';

/**
 * Options for the standalone sources list renderer (dockable view)
 */
export interface SourcesListOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	initialFilter?: SourceListFilter;
	initialSort?: SourceListSort;
	initialSearch?: string;
	onStateChange?: (filter: SourceListFilter, sort: SourceListSort, search: string) => void;
}

// Internal aliases used by the modal renderer
type SourceFilter = SourceListFilter;
type SourceSort = SourceListSort;

/**
 * Render the Sources tab content
 */
export function renderSourcesTab(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement,
	showTab: (tabId: string) => void,
	closeModal: () => void
): void {
	const sourceService = plugin.getSourceService();

	// Sources List card (with Create button toolbar)
	renderSourcesListCard(container, plugin, sourceService, createCard, showTab);

	// Media Gallery card
	renderMediaGallery(container, plugin, createCard, showTab);

	// Sources Overview/Statistics card
	renderSourcesOverviewCard(container, plugin, sourceService, createCard, showTab, closeModal);

	// Source Type Manager card (customize, hide, create source types)
	renderSourceTypeManagerCard(container, plugin, createCard, () => {
		// Refresh the tab content when types change
		container.empty();
		renderSourcesTab(container, plugin, createCard, showTab, closeModal);
	});
}

/**
 * Render the Sources Overview card with statistics
 */
function renderSourcesOverviewCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	sourceService: SourceService,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement,
	_showTab: (tabId: string) => void,
	closeModal: () => void
): void {
	const card = createCard({
		title: 'Source overview',
		icon: 'archive'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	const stats = sourceService.getSourceStats();

	// Summary stats grid
	const statsGrid = content.createDiv({ cls: 'cr-stats-grid' });

	const createStatItem = (label: string, value: string | number) => {
		const item = statsGrid.createDiv({ cls: 'cr-stat-item' });
		item.createDiv({ cls: 'cr-stat-value', text: String(value) });
		item.createDiv({ cls: 'cr-stat-label', text: label });
	};

	createStatItem('Total sources', stats.totalSources);
	createStatItem('With media', stats.withMedia);
	createStatItem('Without media', stats.withoutMedia);

	// Confidence breakdown
	if (stats.totalSources > 0) {
		const breakdown = content.createDiv({ cls: 'cr-stats-breakdown' });
		breakdown.createEl('h4', { text: 'By confidence', cls: 'cr-subsection-heading' });

		const confidenceList = breakdown.createDiv({ cls: 'cr-type-breakdown-list' });

		const confidenceColors: Record<string, string> = {
			high: '#22c55e',
			medium: '#f59e0b',
			low: '#ef4444',
			unknown: '#6b7280'
		};

		for (const [level, count] of Object.entries(stats.byConfidence)) {
			if (count === 0) continue;

			const row = confidenceList.createDiv({ cls: 'cr-type-breakdown-row' });
			const swatch = row.createDiv({ cls: 'cr-type-swatch' });
			swatch.style.setProperty('background-color', confidenceColors[level] || '#6b7280');
			row.createSpan({ text: capitalize(level) });
			row.createSpan({ text: String(count), cls: 'crc-text-muted' });
		}

		// By type breakdown
		if (Object.keys(stats.byType).length > 0) {
			breakdown.createEl('h4', { text: 'By type', cls: 'cr-subsection-heading' });
			const typeList = breakdown.createDiv({ cls: 'cr-type-breakdown-list' });

			for (const [typeId, count] of Object.entries(stats.byType)) {
				const typeDef = getSourceType(
					typeId,
					plugin.settings.customSourceTypes,
					plugin.settings.showBuiltInSourceTypes
				);
				if (!typeDef) continue;

				const row = typeList.createDiv({ cls: 'cr-type-breakdown-row' });
				const swatch = row.createDiv({ cls: 'cr-type-swatch' });
				swatch.style.setProperty('background-color', typeDef.color);
				row.createSpan({ text: typeDef.name });
				row.createSpan({ text: String(count), cls: 'crc-text-muted' });
			}
		}
	}

	// View full statistics link
	const statsLink = content.createDiv({ cls: 'cr-stats-link' });
	const link = statsLink.createEl('a', { text: 'View full statistics →', cls: 'crc-text-muted' });
	link.addEventListener('click', (e) => {
		e.preventDefault();
		closeModal();
		void plugin.activateStatisticsView();
	});

	container.appendChild(card);
}

/**
 * Render the Sources List card
 */
function renderSourcesListCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	sourceService: SourceService,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement,
	showTab: (tabId: string) => void
): void {
	const card = createCard({
		title: 'Sources',
		icon: 'file-text'
	});
	addSourcesDockButton(card, plugin);
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Create source button
	new Setting(content)
		.setName('Create source')
		.setDesc('Create a new source note to document evidence')
		.addButton(button => button
			.setButtonText('Create')
			.setCta()
			.onClick(() => {
				plugin.app.commands.executeCommandById('charted-roots:create-source-note');
			}));

	// Create base button
	new Setting(content)
		.setName('Create Sources base')
		.setDesc('Create an Obsidian base for managing Source notes. After creating, click "Properties" to enable columns like Title, Type, Repository, Author, and Date.')
		.addButton(button => button
			.setButtonText('Create')
			.onClick(() => {
				plugin.app.commands.executeCommandById('charted-roots:create-sources-base-template');
			}));

	// Import source images button
	new Setting(content)
		.setName('Import source images')
		.setDesc('Bulk import images, parse filenames to extract metadata, and create source notes')
		.addButton(button => button
			.setButtonText('Import')
			.onClick(() => {
				new SourceImageWizardModal(plugin.app, plugin).open();
			}));

	// Link media to existing sources button
	new Setting(content)
		.setName('Link media to sources')
		.setDesc('Smart matching to link images to sources by filename patterns. For general media linking to any entity, use Dashboard → Media → Bulk Link Media.')
		.addButton(button => button
			.setButtonText('Link')
			.onClick(() => {
				new SourceMediaLinkerModal(plugin.app, plugin).open();
			}));

	// View templates button
	new Setting(content)
		.setName('Templater templates')
		.setDesc('Copy ready-to-use templates for Templater integration')
		.addButton(button => button
			.setButtonText('View templates')
			.onClick(() => {
				new TemplateSnippetsModal(plugin.app, 'source', plugin.settings.propertyAliases).open();
			}));

	// Web Clipper info box (#364)
	const clipperNote = content.createDiv({ cls: 'cr-info-box cr-info-box--muted' });
	const clipperIcon = clipperNote.createSpan({ cls: 'cr-info-box-icon' });
	setIcon(clipperIcon, 'globe');
	const clipperText = clipperNote.createSpan();
	clipperText.appendText('Capture sources from the web using ');
	clipperText.createEl('a', {
		text: 'Web Clipper templates',
		href: 'https://github.com/banisterious/obsidian-charted-roots/wiki/Web-Clipper-Integration#ready-to-use-templates'
	});
	clipperText.appendText(' (Find a Grave, FamilySearch, obituaries, and more).');

	const allSources = sourceService.getAllSources();

	if (allSources.length === 0) {
		const emptyState = content.createDiv({ cls: 'crc-empty-state' });
		setIcon(emptyState.createSpan({ cls: 'crc-empty-icon' }), 'archive');
		emptyState.createEl('p', { text: 'No sources found.' });
		emptyState.createEl('p', {
			cls: 'crc-text-muted',
			text: 'Create source notes with cr_type: source in frontmatter to document your evidence.'
		});
	} else {
		// State for filters, sorting, and pagination
		let currentFilter: SourceFilter = 'all';
		let currentSort: SourceSort = 'title_asc';
		let displayLimit = 25;

		// Filter and sort controls
		const controls = content.createDiv({ cls: 'crc-source-controls' });

		// Filter dropdown
		const filterContainer = controls.createDiv({ cls: 'crc-filter-container' });
		const filterSelect = filterContainer.createEl('select', { cls: 'dropdown crc-filter-select' });

		// Build filter options
		filterSelect.createEl('option', { value: 'all', text: 'All sources' });

		// Add type-based filters dynamically
		const sourceTypes = getAllSourceTypes(
			plugin.settings.customSourceTypes,
			plugin.settings.showBuiltInSourceTypes
		);
		if (sourceTypes.length > 0) {
			const typeGroup = filterSelect.createEl('optgroup', { attr: { label: 'By type' } });
			for (const st of sourceTypes) {
				typeGroup.createEl('option', { value: `type_${st.id}`, text: st.name });
			}
		}

		// Confidence filters
		const confGroup = filterSelect.createEl('optgroup', { attr: { label: 'By confidence' } });
		confGroup.createEl('option', { value: 'confidence_high', text: 'High confidence' });
		confGroup.createEl('option', { value: 'confidence_medium', text: 'Medium confidence' });
		confGroup.createEl('option', { value: 'confidence_low', text: 'Low confidence' });

		// Media filters
		const mediaGroup = filterSelect.createEl('optgroup', { attr: { label: 'By media' } });
		mediaGroup.createEl('option', { value: 'has_media', text: 'Has media' });
		mediaGroup.createEl('option', { value: 'no_media', text: 'No media' });

		// Hierarchy filters (#338)
		const hierarchyGroup = filterSelect.createEl('optgroup', { attr: { label: 'By hierarchy' } });
		hierarchyGroup.createEl('option', { value: 'has_parent', text: 'Has parent (child sources)' });
		hierarchyGroup.createEl('option', { value: 'no_parent', text: 'No parent (top-level)' });

		// Add parent-specific filters for sources that have children
		const parentSources = allSources.filter(s =>
			allSources.some(child => child.sourceParentId === s.crId)
		);
		if (parentSources.length > 0) {
			const parentGroup = filterSelect.createEl('optgroup', { attr: { label: 'Children of' } });
			for (const parent of parentSources) {
				parentGroup.createEl('option', { value: `parent_${parent.crId}`, text: parent.title });
			}
		}

		// Sort dropdown
		const sortContainer = controls.createDiv({ cls: 'crc-filter-container' });
		const sortSelect = sortContainer.createEl('select', { cls: 'dropdown crc-filter-select' });
		sortSelect.createEl('option', { value: 'title_asc', text: 'Title A-Z' });
		sortSelect.createEl('option', { value: 'title_desc', text: 'Title Z-A' });
		sortSelect.createEl('option', { value: 'date_desc', text: 'Date (newest)' });
		sortSelect.createEl('option', { value: 'date_asc', text: 'Date (oldest)' });
		sortSelect.createEl('option', { value: 'type', text: 'Type' });
		sortSelect.createEl('option', { value: 'confidence', text: 'Confidence' });

		// Table container (for refreshing)
		const tableContainer = content.createDiv({ cls: 'crc-source-table-container' });

		// Filter function
		const filterSources = (sources: SourceNote[]): SourceNote[] => {
			return sources.filter(source => {
				switch (currentFilter) {
					case 'all':
						return true;
					case 'has_media':
						return source.media && source.media.length > 0;
					case 'no_media':
						return !source.media || source.media.length === 0;
					case 'confidence_high':
						return source.confidence === 'high';
					case 'confidence_medium':
						return source.confidence === 'medium';
					case 'confidence_low':
						return source.confidence === 'low';
					case 'has_parent':
						return !!source.sourceParentId;
					case 'no_parent':
						return !source.sourceParentId;
					default:
						// Type-based filter (type_xxx)
						if (currentFilter.startsWith('type_')) {
							const typeId = currentFilter.replace('type_', '');
							return source.sourceType === typeId;
						}
						// Parent-based filter (parent_xxx)
						if (currentFilter.startsWith('parent_')) {
							const parentId = currentFilter.replace('parent_', '');
							return source.sourceParentId === parentId;
						}
						return true;
				}
			});
		};

		// Sort function
		const sortSources = (sources: SourceNote[]): SourceNote[] => {
			return [...sources].sort((a, b) => {
				switch (currentSort) {
					case 'title_asc':
						return a.title.localeCompare(b.title);
					case 'title_desc':
						return b.title.localeCompare(a.title);
					case 'date_asc':
						return (a.date || '').localeCompare(b.date || '');
					case 'date_desc':
						return (b.date || '').localeCompare(a.date || '');
					case 'type':
						return (a.sourceType || '').localeCompare(b.sourceType || '');
					case 'confidence': {
						const order = { high: 0, medium: 1, low: 2, unknown: 3 };
						return (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3);
					}
					default:
						return 0;
				}
			});
		};

		// Render table function
		const renderTable = () => {
			tableContainer.empty();

			const filtered = filterSources(allSources);
			const sorted = sortSources(filtered);
			const displayed = sorted.slice(0, displayLimit);

			if (filtered.length === 0) {
				const noResults = tableContainer.createDiv({ cls: 'crc-empty-state' });
				noResults.createEl('p', { text: 'No sources match the current filter.' });
				return;
			}

			const table = tableContainer.createEl('table', { cls: 'cr-source-table' });

			// Header
			const thead = table.createEl('thead');
			const headerRow = thead.createEl('tr');
			headerRow.createEl('th', { text: 'Title' });
			headerRow.createEl('th', { text: 'Type' });
			headerRow.createEl('th', { text: 'Date' });
			headerRow.createEl('th', { text: 'Repository' });
			headerRow.createEl('th', { text: 'Confidence' });
			headerRow.createEl('th', { text: '', cls: 'cr-source-th-actions' });

			// Body
			const tbody = table.createEl('tbody');
			for (const source of displayed) {
				renderSourceRow(tbody, source, plugin, showTab);
			}

			// Show count and load more button
			if (filtered.length > displayLimit) {
				const loadMoreContainer = tableContainer.createDiv({ cls: 'crc-load-more-container' });
				loadMoreContainer.createSpan({
					text: `Showing ${displayed.length} of ${filtered.length} sources`,
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
					text: `Showing all ${filtered.length} source${filtered.length !== 1 ? 's' : ''}`,
					cls: 'crc-text-muted'
				});
			}
		};

		// Event listeners
		filterSelect.addEventListener('change', () => {
			currentFilter = filterSelect.value as SourceFilter;
			displayLimit = 25; // Reset pagination on filter change
			renderTable();
		});

		sortSelect.addEventListener('change', () => {
			currentSort = sortSelect.value as SourceSort;
			renderTable();
		});

		// Initial render
		renderTable();
	}

	container.appendChild(card);
}

/**
 * Render a single source as a table row
 */
function renderSourceRow(
	tbody: HTMLTableSectionElement,
	source: SourceNote,
	plugin: CanvasRootsPlugin,
	showTab: (tabId: string) => void
): void {
	const typeDef = getSourceType(
		source.sourceType,
		plugin.settings.customSourceTypes,
		plugin.settings.showBuiltInSourceTypes
	);

	const row = tbody.createEl('tr', { cls: 'cr-source-row' });
	row.addEventListener('click', () => {
		// Get the file and open edit modal
		const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
		if (file instanceof TFile) {
			new CreateSourceModal(plugin.app, plugin, {
				editFile: file,
				editSource: source,
				onSuccess: () => showTab('sources')
			}).open();
		}
	});

	// Context menu for additional actions
	row.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle('Edit source')
				.setIcon('edit')
				.onClick(() => {
					const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
					if (file instanceof TFile) {
						new CreateSourceModal(plugin.app, plugin, {
							editFile: file,
							editSource: source,
							onSuccess: () => showTab('sources')
						}).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Extract events')
				.setIcon('calendar-plus')
				.onClick(() => {
					const eventService = plugin.getEventService();
					const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
					if (eventService && file instanceof TFile) {
						new ExtractEventsModal(
							plugin.app,
							eventService,
							plugin.settings,
							source,
							file,
							{
								onComplete: () => showTab('events')
							}
						).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Open note')
				.setIcon('file')
				.onClick(async () => {
					const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
					if (file instanceof TFile) {
						await plugin.trackRecentFile(file, 'source');
						void plugin.app.workspace.getLeaf(false).openFile(file);
					}
				});
		});

		menu.showAtMouseEvent(e);
	});

	// Title cell
	const titleCell = row.createEl('td', { cls: 'cr-source-cell-title' });
	titleCell.createSpan({ text: source.title });

	// Type cell with badge
	const typeCell = row.createEl('td', { cls: 'cr-source-cell-type' });
	if (typeDef) {
		const typeBadge = typeCell.createSpan({ cls: 'cr-source-type-badge' });
		typeBadge.style.setProperty('background-color', typeDef.color);
		typeBadge.style.setProperty('color', getContrastColor(typeDef.color));
		typeBadge.textContent = typeDef.name;
	} else {
		typeCell.textContent = source.sourceType;
	}

	// Date cell
	const dateCell = row.createEl('td', { cls: 'cr-source-cell-date' });
	dateCell.textContent = source.date || '—';

	// Repository cell
	const repoCell = row.createEl('td', { cls: 'cr-source-cell-repository' });
	repoCell.textContent = source.repository || '—';

	// Confidence cell with colored indicator
	const confCell = row.createEl('td', { cls: 'cr-source-cell-confidence' });
	const confBadge = confCell.createSpan({ cls: `cr-confidence-badge cr-confidence-${source.confidence}` });
	confBadge.textContent = source.confidence;

	// Actions cell with Extract Events and Open Note buttons
	const actionsCell = row.createEl('td', { cls: 'cr-source-cell-actions' });

	// Extract events button
	const extractBtn = actionsCell.createEl('button', {
		cls: 'crc-btn crc-btn--small',
		attr: { title: 'Extract events from this source' }
	});
	const calIcon = createLucideIcon('calendar-plus', 14);
	extractBtn.appendChild(calIcon);

	extractBtn.addEventListener('click', (e) => {
		e.stopPropagation(); // Don't trigger row click
		const eventService = plugin.getEventService();
		const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
		if (eventService && file instanceof TFile) {
			new ExtractEventsModal(
				plugin.app,
				eventService,
				plugin.settings,
				source,
				file,
				{
					onComplete: () => showTab('events')
				}
			).open();
		}
	});

	// Open note button
	const openBtn = actionsCell.createEl('button', {
		cls: 'crc-btn crc-btn--small',
		attr: { title: 'Open source note' }
	});
	const fileIcon = createLucideIcon('file-text', 14);
	openBtn.appendChild(fileIcon);

	openBtn.addEventListener('click', (e) => {
		e.stopPropagation(); // Don't trigger row click
		const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
		if (file instanceof TFile) {
			void (async () => {
				await plugin.trackRecentFile(file, 'source');
				void plugin.app.workspace.getLeaf(false).openFile(file);
			})();
		}
	});
}

function addSourcesDockButton(card: HTMLElement, plugin: CanvasRootsPlugin): void {
	const header = card.querySelector('.crc-card__header');
	if (!header) return;

	const dockBtn = activeDocument.createElement('button');
	dockBtn.className = 'crc-card__dock-btn clickable-icon';
	dockBtn.setAttribute('aria-label', 'Open in sidebar');
	setIcon(dockBtn, 'panel-right');
	dockBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void plugin.activateSourcesView();
	});
	header.appendChild(dockBtn);
}

/* ══════════════════════════════════════════════════════════════════════════
   Dockable Sources List — standalone renderer for the sidebar ItemView
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a browsable sources list for the dockable sidebar view.
 *
 * Standalone function with closure-scoped state, independent of the modal's
 * `renderSourcesListCard()`. Provides type/confidence/media filters, sort,
 * search, pagination, and a simplified table without row-click-to-edit or
 * extract events actions.
 */
export function renderSourcesList(options: SourcesListOptions): void {
	const { container, plugin, onStateChange } = options;

	const sourceService = plugin.getSourceService();

	// Loading indicator
	container.empty();
	container.createEl('p', { text: 'Loading sources...', cls: 'crc-text--muted' });

	// Load data
	const allSources = sourceService.getAllSources();

	container.empty();

	if (allSources.length === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		setIcon(emptyState.createSpan({ cls: 'crc-empty-icon' }), 'archive');
		emptyState.createEl('p', { text: 'No sources found.' });
		emptyState.createEl('p', {
			cls: 'crc-text-muted',
			text: 'Create source notes with cr_type: source in frontmatter.'
		});
		return;
	}

	// Closure-scoped state
	let currentFilter: SourceListFilter = options.initialFilter ?? 'all';
	let currentSort: SourceListSort = options.initialSort ?? 'title_asc';
	let currentSearch = options.initialSearch ?? '';
	let displayLimit = 25;

	// Controls row
	const controls = container.createDiv({ cls: 'crc-source-controls' });

	// Filter dropdown
	const filterContainer = controls.createDiv({ cls: 'crc-filter-container' });
	const filterSelect = filterContainer.createEl('select', { cls: 'dropdown crc-filter-select' });

	filterSelect.createEl('option', { value: 'all', text: 'All sources' });

	const sourceTypes = getAllSourceTypes(
		plugin.settings.customSourceTypes,
		plugin.settings.showBuiltInSourceTypes
	);
	if (sourceTypes.length > 0) {
		const typeGroup = filterSelect.createEl('optgroup', { attr: { label: 'By type' } });
		for (const st of sourceTypes) {
			typeGroup.createEl('option', { value: `type_${st.id}`, text: st.name });
		}
	}

	const confGroup = filterSelect.createEl('optgroup', { attr: { label: 'By confidence' } });
	confGroup.createEl('option', { value: 'confidence_high', text: 'High confidence' });
	confGroup.createEl('option', { value: 'confidence_medium', text: 'Medium confidence' });
	confGroup.createEl('option', { value: 'confidence_low', text: 'Low confidence' });

	const mediaGroup = filterSelect.createEl('optgroup', { attr: { label: 'By media' } });
	mediaGroup.createEl('option', { value: 'has_media', text: 'Has media' });
	mediaGroup.createEl('option', { value: 'no_media', text: 'No media' });

	// Hierarchy filters (#338)
	const hierarchyGroup2 = filterSelect.createEl('optgroup', { attr: { label: 'By hierarchy' } });
	hierarchyGroup2.createEl('option', { value: 'has_parent', text: 'Has parent (child sources)' });
	hierarchyGroup2.createEl('option', { value: 'no_parent', text: 'No parent (top-level)' });

	const parentSources2 = allSources.filter(s =>
		allSources.some(child => child.sourceParentId === s.crId)
	);
	if (parentSources2.length > 0) {
		const parentGroup2 = filterSelect.createEl('optgroup', { attr: { label: 'Children of' } });
		for (const parent of parentSources2) {
			parentGroup2.createEl('option', { value: `parent_${parent.crId}`, text: parent.title });
		}
	}

	filterSelect.value = currentFilter;

	// Sort dropdown
	const sortContainer = controls.createDiv({ cls: 'crc-filter-container' });
	const sortSelect = sortContainer.createEl('select', { cls: 'dropdown crc-filter-select' });
	sortSelect.createEl('option', { value: 'title_asc', text: 'Title A-Z' });
	sortSelect.createEl('option', { value: 'title_desc', text: 'Title Z-A' });
	sortSelect.createEl('option', { value: 'date_desc', text: 'Date (newest)' });
	sortSelect.createEl('option', { value: 'date_asc', text: 'Date (oldest)' });
	sortSelect.createEl('option', { value: 'type', text: 'Type' });
	sortSelect.createEl('option', { value: 'confidence', text: 'Confidence' });
	sortSelect.value = currentSort;

	// Search input
	const searchContainer = controls.createDiv({ cls: 'crc-filter-container' });
	const searchInput = searchContainer.createEl('input', {
		type: 'search',
		placeholder: 'Search sources...',
		cls: 'crc-filter-search',
		value: currentSearch
	});

	// Table container
	const tableContainer = container.createDiv({ cls: 'crc-source-table-container' });

	// Filter function
	const filterSources = (sources: SourceNote[]): SourceNote[] => {
		let filtered = sources;

		// Apply type/confidence/media filter
		filtered = filtered.filter(source => {
			switch (currentFilter) {
				case 'all':
					return true;
				case 'has_media':
					return source.media && source.media.length > 0;
				case 'no_media':
					return !source.media || source.media.length === 0;
				case 'confidence_high':
					return source.confidence === 'high';
				case 'confidence_medium':
					return source.confidence === 'medium';
				case 'confidence_low':
					return source.confidence === 'low';
				case 'has_parent':
					return !!source.sourceParentId;
				case 'no_parent':
					return !source.sourceParentId;
				default:
					if (currentFilter.startsWith('type_')) {
						const typeId = currentFilter.replace('type_', '');
						return source.sourceType === typeId;
					}
					if (currentFilter.startsWith('parent_')) {
						const parentId = currentFilter.replace('parent_', '');
						return source.sourceParentId === parentId;
					}
					return true;
			}
		});

		// Apply search
		if (currentSearch.trim()) {
			const q = currentSearch.trim().toLowerCase();
			filtered = filtered.filter(source =>
				source.title.toLowerCase().includes(q) ||
				(source.repository || '').toLowerCase().includes(q) ||
				(source.sourceType || '').toLowerCase().includes(q) ||
				(source.date || '').toLowerCase().includes(q)
			);
		}

		return filtered;
	};

	// Sort function
	const sortSources = (sources: SourceNote[]): SourceNote[] => {
		return [...sources].sort((a, b) => {
			switch (currentSort) {
				case 'title_asc':
					return a.title.localeCompare(b.title);
				case 'title_desc':
					return b.title.localeCompare(a.title);
				case 'date_asc':
					return (a.date || '').localeCompare(b.date || '');
				case 'date_desc':
					return (b.date || '').localeCompare(a.date || '');
				case 'type':
					return (a.sourceType || '').localeCompare(b.sourceType || '');
				case 'confidence': {
					const order = { high: 0, medium: 1, low: 2, unknown: 3 };
					return (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3);
				}
				default:
					return 0;
			}
		});
	};

	// Render table
	const renderTable = () => {
		tableContainer.empty();

		const filtered = filterSources(allSources);
		const sorted = sortSources(filtered);
		const displayed = sorted.slice(0, displayLimit);

		if (filtered.length === 0) {
			const noResults = tableContainer.createDiv({ cls: 'crc-empty-state' });
			noResults.createEl('p', { text: 'No sources match the current filter.' });
			return;
		}

		const table = tableContainer.createEl('table', { cls: 'cr-source-table' });

		// Header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Title' });
		headerRow.createEl('th', { text: 'Type' });
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Repository' });
		headerRow.createEl('th', { text: 'Confidence' });
		headerRow.createEl('th', { text: '', cls: 'cr-source-th-actions' });

		// Body
		const tbody = table.createEl('tbody');
		for (const source of displayed) {
			renderBrowseSourceRow(tbody, source, plugin);
		}

		// Pagination
		if (filtered.length > displayLimit) {
			const loadMoreContainer = tableContainer.createDiv({ cls: 'crc-load-more-container' });
			loadMoreContainer.createSpan({
				text: `Showing ${displayed.length} of ${filtered.length} sources`,
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
				text: `Showing all ${filtered.length} source${filtered.length !== 1 ? 's' : ''}`,
				cls: 'crc-text-muted'
			});
		}
	};

	// Event listeners
	filterSelect.addEventListener('change', () => {
		currentFilter = filterSelect.value as SourceListFilter;
		displayLimit = 25;
		renderTable();
		onStateChange?.(currentFilter, currentSort, currentSearch);
	});

	sortSelect.addEventListener('change', () => {
		currentSort = sortSelect.value as SourceListSort;
		renderTable();
		onStateChange?.(currentFilter, currentSort, currentSearch);
	});

	searchInput.addEventListener('input', () => {
		currentSearch = searchInput.value;
		displayLimit = 25;
		renderTable();
		onStateChange?.(currentFilter, currentSort, currentSearch);
	});

	// Initial render
	renderTable();
}

/**
 * Render a simplified source row for the dockable browse view.
 * No row-click-to-edit, no extract events in context menu.
 */
function renderBrowseSourceRow(
	tbody: HTMLTableSectionElement,
	source: SourceNote,
	plugin: CanvasRootsPlugin
): void {
	const typeDef = getSourceType(
		source.sourceType,
		plugin.settings.customSourceTypes,
		plugin.settings.showBuiltInSourceTypes
	);

	const row = tbody.createEl('tr', { cls: 'cr-source-row cr-source-row--browse' });

	// Context menu — open only
	row.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle('Open note')
				.setIcon('file')
				.onClick(async () => {
					const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
					if (file instanceof TFile) {
						await plugin.trackRecentFile(file, 'source');
						void plugin.app.workspace.getLeaf(false).openFile(file);
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Open in new tab')
				.setIcon('file-plus')
				.onClick(async () => {
					const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
					if (file instanceof TFile) {
						await plugin.trackRecentFile(file, 'source');
						void plugin.app.workspace.getLeaf('tab').openFile(file);
					}
				});
		});

		menu.showAtMouseEvent(e);
	});

	// Title cell
	const titleCell = row.createEl('td', { cls: 'cr-source-cell-title' });
	titleCell.createSpan({ text: source.title });

	// Type cell with badge
	const typeCell = row.createEl('td', { cls: 'cr-source-cell-type' });
	if (typeDef) {
		const typeBadge = typeCell.createSpan({ cls: 'cr-source-type-badge' });
		typeBadge.style.setProperty('background-color', typeDef.color);
		typeBadge.style.setProperty('color', getContrastColor(typeDef.color));
		typeBadge.textContent = typeDef.name;
	} else {
		typeCell.textContent = source.sourceType;
	}

	// Date cell
	const dateCell = row.createEl('td', { cls: 'cr-source-cell-date' });
	dateCell.textContent = source.date || '—';

	// Repository cell
	const repoCell = row.createEl('td', { cls: 'cr-source-cell-repository' });
	repoCell.textContent = source.repository || '—';

	// Confidence cell with colored indicator
	const confCell = row.createEl('td', { cls: 'cr-source-cell-confidence' });
	const confBadge = confCell.createSpan({ cls: `cr-confidence-badge cr-confidence-${source.confidence}` });
	confBadge.textContent = source.confidence;

	// Actions cell — open note button only (no extract events)
	const actionsCell = row.createEl('td', { cls: 'cr-source-cell-actions' });
	const openBtn = actionsCell.createEl('button', {
		cls: 'crc-btn crc-btn--small',
		attr: { title: 'Open source note' }
	});
	const fileIcon = createLucideIcon('file-text', 14);
	openBtn.appendChild(fileIcon);

	openBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		const file = plugin.app.vault.getAbstractFileByPath(source.filePath);
		if (file instanceof TFile) {
			void (async () => {
				await plugin.trackRecentFile(file, 'source');
				void plugin.app.workspace.getLeaf(false).openFile(file);
			})();
		}
	});
}