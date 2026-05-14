/**
 * Universes Tab UI Component
 *
 * Renders the Universes tab in the Control Center, showing
 * universe list, orphan detection, and quick actions.
 */

import { Menu, Notice, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { createLucideIcon, setLucideIcon } from '../../ui/lucide-icons';
import { UniverseService, createUniverseService } from '../services/universe-service';
import { UniverseWizardModal } from './universe-wizard';
import { EditUniverseModal } from './edit-universe-modal';
import type { UniverseInfo, UniverseEntityCounts } from '../types';
import { DEFAULT_DATE_SYSTEMS } from '../../dates/constants/default-date-systems';

/**
 * Resolve a calendar id (built-in or custom) to its display name. Returns
 * the id verbatim when nothing matches so the user still sees something
 * actionable rather than an empty cell (#432 Phase 1).
 */
function resolveCalendarName(plugin: CanvasRootsPlugin, calendarId: string): string {
	const builtin = DEFAULT_DATE_SYSTEMS.find(s => s.id === calendarId);
	if (builtin) return builtin.name;
	const customs = plugin.settings.fictionalDateSystems || [];
	const custom = customs.find(s => s.id === calendarId);
	return custom ? custom.name : calendarId;
}
import { getLogger } from '../../core/logging';
import { getErrorMessage } from '../../core/error-utils';
import { confirmDeleteUniverse } from '../../plugin/context-menus';

const logger = getLogger('UniversesTab');

export type UniverseListFilter = 'all' | 'active' | 'draft' | 'archived' | 'has-entities' | 'empty';
export type UniverseListSort = 'name-asc' | 'name-desc' | 'created-asc' | 'created-desc' | 'entities-asc' | 'entities-desc';

export interface UniversesListOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	initialFilter?: UniverseListFilter;
	initialSort?: UniverseListSort;
	initialSearch?: string;
	onStateChange?: (filter: UniverseListFilter, sort: UniverseListSort, search: string) => void;
}

type UnivFilter = UniverseListFilter;
type UnivSort = UniverseListSort;

/** Module-level state for universe list filter */
let universeListFilter: UnivFilter = 'all';

/** Module-level state for universe list sort */
let universeListSort: UnivSort = 'name-asc';

/**
 * Render the Universes tab content
 */
export function renderUniversesTab(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement,
	showTab: (tabId: string) => void,
	closeModal: () => void
): void {
	const app = plugin.app;
	const universeService = createUniverseService(plugin);
	const universes = universeService.getAllUniverses();
	const orphans = universeService.findOrphanUniverses();

	// Build universe list with entity counts for filtering/sorting
	const universeItems = universes.map(u => {
		const counts = universeService.getEntityCountsForUniverse(u.crId);
		const totalEntities = counts.people + counts.places + counts.events +
			counts.organizations + counts.maps + counts.calendars;
		return { ...u, counts, totalEntities };
	});

	// Refresh helper — re-renders the entire tab
	const refresh = () => {
		renderUniversesTab(container, plugin, createCard, showTab, closeModal);
	};

	// Quick Actions Card
	const actionsCard = createCard({
		title: 'Quick Actions',
		icon: 'zap',
		subtitle: 'Create universes and explore related features'
	});
	const actionsContent = actionsCard.querySelector('.crc-card__content') as HTMLElement;

	const tileGrid = actionsContent.createDiv({ cls: 'crc-dashboard-tile-grid' });

	// Tile 1: Create Universe
	const createTile = tileGrid.createDiv({ cls: 'crc-dashboard-tile' });
	createTile.setAttribute('data-tile-id', 'create-universe');
	createTile.setAttribute('title', 'Create a new fictional world with optional calendar, map, and schema');
	const createIcon = createTile.createDiv({ cls: 'crc-dashboard-tile-icon' });
	setLucideIcon(createIcon, 'globe', 24);
	createTile.createDiv({ cls: 'crc-dashboard-tile-label', text: 'Create Universe' });
	createTile.setAttribute('tabindex', '0');
	createTile.setAttribute('role', 'button');
	createTile.addEventListener('click', () => {
		new UniverseWizardModal(plugin, {
			onComplete: () => refresh()
		}).open();
	});
	createTile.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			new UniverseWizardModal(plugin, {
				onComplete: () => refresh()
			}).open();
		}
	});

	// Tile 2: Fictional Date Systems
	const calendarTile = tileGrid.createDiv({ cls: 'crc-dashboard-tile' });
	calendarTile.setAttribute('data-tile-id', 'fictional-calendars');
	calendarTile.setAttribute('title', 'Learn about custom calendars for fictional worlds');
	const calendarIcon = calendarTile.createDiv({ cls: 'crc-dashboard-tile-icon' });
	setLucideIcon(calendarIcon, 'calendar-plus', 24);
	calendarTile.createDiv({ cls: 'crc-dashboard-tile-label', text: 'Date Systems' });
	calendarTile.setAttribute('tabindex', '0');
	calendarTile.setAttribute('role', 'button');
	calendarTile.addEventListener('click', () => {
		showTab('events');
	});
	calendarTile.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			showTab('events');
		}
	});

	// Tile 3: Custom Maps
	const mapTile = tileGrid.createDiv({ cls: 'crc-dashboard-tile' });
	mapTile.setAttribute('data-tile-id', 'custom-maps');
	mapTile.setAttribute('title', 'Learn about custom maps for fictional geography');
	const mapIcon = mapTile.createDiv({ cls: 'crc-dashboard-tile-icon' });
	setLucideIcon(mapIcon, 'map', 24);
	mapTile.createDiv({ cls: 'crc-dashboard-tile-label', text: 'Custom Maps' });
	mapTile.setAttribute('tabindex', '0');
	mapTile.setAttribute('role', 'button');
	mapTile.addEventListener('click', () => {
		showTab('places');
	});
	mapTile.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			showTab('places');
		}
	});

	container.appendChild(actionsCard);

	// Universe List Card
	const listCard = createCard({
		title: 'Your Universes',
		icon: 'globe',
		subtitle: 'All universe notes in your vault'
	});
	addUniversesDockButton(listCard, plugin);
	const listContent = listCard.querySelector('.crc-card__content') as HTMLElement;

	if (universeItems.length === 0) {
		// Empty state message
		const emptyState = listContent.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No universe notes found. Click "Create Universe" above to get started.',
			cls: 'crc-text--muted'
		});
	} else {
		// Controls row (filter + sort + search)
		const controlsRow = listContent.createDiv({ cls: 'crc-person-controls' });

		// Filter dropdown
		const filterSelect = controlsRow.createEl('select', { cls: 'dropdown' });
		const filterOptions = [
			{ value: 'all', label: 'All universes' },
			{ value: 'active', label: 'Active' },
			{ value: 'draft', label: 'Draft' },
			{ value: 'archived', label: 'Archived' },
			{ value: 'has-entities', label: 'Has entities' },
			{ value: 'empty', label: 'Empty' }
		];
		filterOptions.forEach(opt => {
			const option = filterSelect.createEl('option', { text: opt.label, value: opt.value });
			if (opt.value === universeListFilter) option.selected = true;
		});

		// Sort dropdown
		const sortSelect = controlsRow.createEl('select', { cls: 'dropdown' });
		const sortOptions = [
			{ value: 'name-asc', label: 'Name (A\u2013Z)' },
			{ value: 'name-desc', label: 'Name (Z\u2013A)' },
			{ value: 'created-asc', label: 'Created (oldest)' },
			{ value: 'created-desc', label: 'Created (newest)' },
			{ value: 'entities-asc', label: 'Entities (fewest)' },
			{ value: 'entities-desc', label: 'Entities (most)' }
		];
		sortOptions.forEach(opt => {
			const option = sortSelect.createEl('option', { text: opt.label, value: opt.value });
			if (opt.value === universeListSort) option.selected = true;
		});

		// Search input
		const searchInput = controlsRow.createEl('input', {
			cls: 'crc-filter-input',
			attr: {
				type: 'text',
				placeholder: `Search ${universeItems.length} universes...`
			}
		});

		// Usage hint
		const hint = listContent.createEl('p', {
			cls: 'crc-text-muted crc-text-small crc-mb-2'
		});
		hint.appendText('Click a row to edit. ');
		const fileIconHint = createLucideIcon('file-text', 12);
		fileIconHint.addClass('crc-icon-inline');
		hint.appendChild(fileIconHint);
		hint.appendText(' opens the note.');

		// List container
		const listContainer = listContent.createDiv({ cls: 'crc-person-list' });

		// Apply filter, sort, and render
		const applyFiltersAndRender = () => {
			const query = searchInput.value.toLowerCase();

			// Filter by search query
			let filtered = universeItems.filter(u =>
				u.name.toLowerCase().includes(query) ||
				(u.description && u.description.toLowerCase().includes(query)) ||
				(u.author && u.author.toLowerCase().includes(query)) ||
				(u.genre && u.genre.toLowerCase().includes(query))
			);

			// Apply category filter
			switch (universeListFilter) {
				case 'active':
					filtered = filtered.filter(u => u.status === 'active');
					break;
				case 'draft':
					filtered = filtered.filter(u => u.status === 'draft');
					break;
				case 'archived':
					filtered = filtered.filter(u => u.status === 'archived');
					break;
				case 'has-entities':
					filtered = filtered.filter(u => u.totalEntities > 0);
					break;
				case 'empty':
					filtered = filtered.filter(u => u.totalEntities === 0);
					break;
			}

			// Apply sort
			filtered.sort((a, b) => {
				switch (universeListSort) {
					case 'name-asc':
						return a.name.localeCompare(b.name);
					case 'name-desc':
						return b.name.localeCompare(a.name);
					case 'created-asc':
						return (a.created || '0000').localeCompare(b.created || '0000');
					case 'created-desc':
						return (b.created || '9999').localeCompare(a.created || '9999');
					case 'entities-asc':
						return a.totalEntities - b.totalEntities;
					case 'entities-desc':
						return b.totalEntities - a.totalEntities;
					default:
						return 0;
				}
			});

			renderUniverseListItems(listContainer, filtered, universeService, app, plugin, refresh);
		};

		// Event handlers
		searchInput.addEventListener('input', applyFiltersAndRender);
		filterSelect.addEventListener('change', () => {
			universeListFilter = filterSelect.value as typeof universeListFilter;
			applyFiltersAndRender();
		});
		sortSelect.addEventListener('change', () => {
			universeListSort = sortSelect.value as typeof universeListSort;
			applyFiltersAndRender();
		});

		// Initial render
		applyFiltersAndRender();

		// View full statistics link
		const statsLink = listContent.createDiv({ cls: 'cr-stats-link' });
		const link = statsLink.createEl('a', { text: 'View full statistics \u2192', cls: 'crc-text-muted' });
		link.addEventListener('click', (e) => {
			e.preventDefault();
			closeModal();
			void plugin.activateStatisticsView();
		});
	}

	container.appendChild(listCard);

	// Orphan universes section
	if (orphans.length > 0) {
		const orphanCard = createCard({
			title: 'Orphan universe values',
			icon: 'alert-triangle',
			subtitle: 'Universe references without matching notes'
		});
		const orphanContent = orphanCard.querySelector('.crc-card__content') as HTMLElement;

		orphanContent.createEl('p', {
			text: 'These universe values are used by entities but don\'t have corresponding universe notes. Create notes to enable full universe management.',
			cls: 'crc-text-muted crc-mb-3'
		});

		orphans.forEach(orphan => {
			const row = orphanContent.createDiv({ cls: 'crc-flex crc-justify-between crc-items-center crc-mb-2' });
			row.createSpan({ text: `"${orphan.value}"`, cls: 'crc-code' });
			row.createSpan({ text: `${orphan.entityCount} entities`, cls: 'crc-text-muted' });
			const createNoteBtn = row.createEl('button', {
				text: 'Create note',
				cls: 'crc-btn crc-btn--small'
			});
			createNoteBtn.addEventListener('click', () => {
				void (async () => {
					try {
						// Create universe from orphan value, using the orphan value as cr_id
						// so existing entity references will match
						await universeService.createUniverse({
							name: orphan.value.charAt(0).toUpperCase() + orphan.value.slice(1).replace(/-/g, ' '),
							crId: orphan.value
						});
						new Notice(`Created universe: ${orphan.value}`);
						// Refresh the tab
						refresh();
					} catch (err) {
						new Notice(`Failed to create universe: ${getErrorMessage(err)}`);
					}
				})();
			});
		});

		// Create all button
		if (orphans.length > 1) {
			const createAllBtn = orphanContent.createEl('button', {
				text: 'Create all',
				cls: 'crc-btn crc-btn--secondary crc-mt-3'
			});
			createAllBtn.addEventListener('click', () => {
				void (async () => {
					for (const orphan of orphans) {
						try {
							await universeService.createUniverse({
								name: orphan.value.charAt(0).toUpperCase() + orphan.value.slice(1).replace(/-/g, ' '),
								crId: orphan.value
							});
						} catch (err) {
							logger.error('createOrphanUniverse', `Failed: ${orphan.value}`, err);
						}
					}
					new Notice(`Created ${orphans.length} universe notes`);
					refresh();
				})();
			});
		}

		container.appendChild(orphanCard);
	}
}

/**
 * Render universe list items as a table
 */
function renderUniverseListItems(
	container: HTMLElement,
	universes: (UniverseInfo & { counts: UniverseEntityCounts; totalEntities: number })[],
	universeService: UniverseService,
	app: CanvasRootsPlugin['app'],
	plugin: CanvasRootsPlugin,
	refresh: () => void
): void {
	container.empty();

	if (universes.length === 0) {
		container.createEl('p', {
			text: 'No matching universes found.',
			cls: 'crc-text--muted'
		});
		return;
	}

	// Create table structure
	const table = container.createEl('table', { cls: 'crc-person-table' });
	const thead = table.createEl('thead');
	const headerRow = thead.createEl('tr');
	headerRow.createEl('th', { text: 'Name', cls: 'crc-person-table__th' });
	headerRow.createEl('th', { text: 'Status', cls: 'crc-person-table__th' });
	headerRow.createEl('th', { text: 'Entities', cls: 'crc-person-table__th' });
	headerRow.createEl('th', { text: '', cls: 'crc-person-table__th crc-person-table__th--icon' });

	const tbody = table.createEl('tbody');

	for (const universe of universes) {
		renderUniverseTableRow(tbody, universe, universeService, app, plugin, refresh);
	}
}

/**
 * Render a single universe as a table row
 */
function renderUniverseTableRow(
	tbody: HTMLElement,
	universe: UniverseInfo & { counts: UniverseEntityCounts; totalEntities: number },
	universeService: UniverseService,
	app: CanvasRootsPlugin['app'],
	plugin: CanvasRootsPlugin,
	refresh: () => void
): void {
	const row = tbody.createEl('tr', { cls: 'crc-person-table__row' });

	// Name cell
	const nameCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--name' });
	nameCell.createSpan({ text: universe.name });
	if (universe.description) {
		nameCell.createEl('br');
		nameCell.createSpan({
			text: universe.description,
			cls: 'crc-text--muted crc-text--small'
		});
	}

	// Status cell
	const statusCell = row.createEl('td', { cls: 'crc-person-table__td' });
	statusCell.createSpan({
		text: universe.status || 'active',
		cls: `crc-badge crc-badge--${universe.status || 'active'}`
	});

	// Entities cell - show count breakdown
	const entitiesCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--date' });
	if (universe.totalEntities > 0) {
		const countParts: string[] = [];
		if (universe.counts.people > 0) countParts.push(`${universe.counts.people} people`);
		if (universe.counts.places > 0) countParts.push(`${universe.counts.places} places`);
		if (universe.counts.events > 0) countParts.push(`${universe.counts.events} events`);
		if (universe.counts.organizations > 0) countParts.push(`${universe.counts.organizations} orgs`);
		if (universe.counts.maps > 0) countParts.push(`${universe.counts.maps} maps`);
		if (universe.counts.calendars > 0) countParts.push(`${universe.counts.calendars} calendars`);
		entitiesCell.setText(countParts.join(', '));
	} else {
		entitiesCell.setText('\u2014');
	}

	// Default-calendar sub-line in the entities cell when set (#432 Phase 1)
	if (universe.defaultCalendar) {
		entitiesCell.createEl('br');
		entitiesCell.createSpan({
			text: `Default: ${resolveCalendarName(plugin, universe.defaultCalendar)}`,
			cls: 'crc-text--muted crc-text--small'
		});
	}

	// Actions cell
	const actionsCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--actions' });

	// Open note button
	const openBtn = actionsCell.createEl('button', {
		cls: 'crc-person-table__open-btn clickable-icon',
		attr: { 'aria-label': 'Open note' }
	});
	const fileIcon = createLucideIcon('file-text', 14);
	openBtn.appendChild(fileIcon);
	openBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void app.workspace.getLeaf(false).openFile(universe.file);
	});

	// Click row to open edit modal
	row.addEventListener('click', () => {
		new EditUniverseModal(app, plugin, {
			universe,
			file: universe.file,
			onUpdated: () => refresh()
		}).open();
	});

	// Context menu for row
	row.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showUniverseContextMenu(universe, e, app, plugin, refresh);
	});
}

/**
 * Show context menu for a universe row
 */
function showUniverseContextMenu(
	universe: UniverseInfo,
	event: MouseEvent,
	app: CanvasRootsPlugin['app'],
	plugin: CanvasRootsPlugin,
	refresh: () => void
): void {
	const menu = new Menu();

	menu.addItem(item => item
		.setTitle('Open note')
		.setIcon('file-text')
		.onClick(() => {
			void app.workspace.getLeaf(false).openFile(universe.file);
		}));

	menu.addItem(item => item
		.setTitle('Edit universe')
		.setIcon('pencil')
		.onClick(() => {
			new EditUniverseModal(app, plugin, {
				universe,
				file: universe.file,
				onUpdated: () => refresh()
			}).open();
		}));

	menu.addSeparator();

	menu.addItem(item => item
		.setTitle('Delete universe')
		.setIcon('trash-2')
		.onClick(async () => {
			const confirmed = await confirmDeleteUniverse(plugin, universe.name);
			if (confirmed) {
				await app.fileManager.trashFile(universe.file);
				new Notice(`Deleted universe: ${universe.name}`);
				refresh();
			}
		}));

	menu.showAtMouseEvent(event);
}

function addUniversesDockButton(card: HTMLElement, plugin: CanvasRootsPlugin): void {
	const header = card.querySelector('.crc-card__header');
	if (!header) return;

	const dockBtn = activeDocument.createElement('button');
	dockBtn.className = 'crc-card__dock-btn clickable-icon';
	dockBtn.setAttribute('aria-label', 'Open in sidebar');
	setIcon(dockBtn, 'panel-right');
	dockBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void plugin.activateUniversesView();
	});
	header.appendChild(dockBtn);
}

/* ══════════════════════════════════════════════════════════════════════════
   Dockable Universes List — standalone renderer for the sidebar ItemView
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a browsable universes list for the dockable sidebar view.
 * Uses closure-scoped state so it operates independently of the modal tab.
 */
export function renderUniversesList(options: UniversesListOptions): void {
	const {
		container,
		plugin,
		initialFilter = 'all',
		initialSort = 'name-asc',
		initialSearch = '',
		onStateChange
	} = options;

	const app = plugin.app;

	// Closure-scoped state
	let currentFilter: UnivFilter = initialFilter;
	let currentSort: UnivSort = initialSort;
	let currentSearch = initialSearch;
	let displayLimit = 25;

	// Load data
	const universeService = createUniverseService(plugin);
	const universes = universeService.getAllUniverses();

	// Build universe items with entity counts
	const universeItems = universes.map(u => {
		const counts = universeService.getEntityCountsForUniverse(u.crId);
		const totalEntities = counts.people + counts.places + counts.events +
			counts.organizations + counts.maps + counts.calendars;
		return { ...u, counts, totalEntities };
	});

	container.empty();

	if (universeItems.length === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No universe notes found.',
			cls: 'crc-text--muted'
		});
		return;
	}

	// Controls row
	const controlsRow = container.createDiv({ cls: 'crc-person-controls' });

	// Filter dropdown
	const filterSelect = controlsRow.createEl('select', { cls: 'dropdown' });
	const filterOptions: { value: UnivFilter; label: string }[] = [
		{ value: 'all', label: 'All universes' },
		{ value: 'active', label: 'Active' },
		{ value: 'draft', label: 'Draft' },
		{ value: 'archived', label: 'Archived' },
		{ value: 'has-entities', label: 'Has entities' },
		{ value: 'empty', label: 'Empty' }
	];
	filterOptions.forEach(opt => {
		const option = filterSelect.createEl('option', { text: opt.label, value: opt.value });
		if (opt.value === currentFilter) option.selected = true;
	});

	// Sort dropdown
	const sortSelect = controlsRow.createEl('select', { cls: 'dropdown' });
	const sortOptions: { value: UnivSort; label: string }[] = [
		{ value: 'name-asc', label: 'Name (A\u2013Z)' },
		{ value: 'name-desc', label: 'Name (Z\u2013A)' },
		{ value: 'created-asc', label: 'Created (oldest)' },
		{ value: 'created-desc', label: 'Created (newest)' },
		{ value: 'entities-asc', label: 'Entities (fewest)' },
		{ value: 'entities-desc', label: 'Entities (most)' }
	];
	sortOptions.forEach(opt => {
		const option = sortSelect.createEl('option', { text: opt.label, value: opt.value });
		if (opt.value === currentSort) option.selected = true;
	});

	// Search input
	const searchInput = controlsRow.createEl('input', {
		cls: 'crc-filter-input',
		attr: {
			type: 'text',
			placeholder: `Search ${universeItems.length} universes...`
		}
	});
	if (currentSearch) searchInput.value = currentSearch;

	// List container
	const listContainer = container.createDiv({ cls: 'crc-person-list' });

	const applyFiltersAndRender = () => {
		const query = searchInput.value.toLowerCase();

		// Filter by search query
		let filtered = universeItems.filter(u =>
			u.name.toLowerCase().includes(query) ||
			(u.description && u.description.toLowerCase().includes(query)) ||
			(u.author && u.author.toLowerCase().includes(query)) ||
			(u.genre && u.genre.toLowerCase().includes(query))
		);

		// Apply category filter
		switch (currentFilter) {
			case 'active':
				filtered = filtered.filter(u => u.status === 'active');
				break;
			case 'draft':
				filtered = filtered.filter(u => u.status === 'draft');
				break;
			case 'archived':
				filtered = filtered.filter(u => u.status === 'archived');
				break;
			case 'has-entities':
				filtered = filtered.filter(u => u.totalEntities > 0);
				break;
			case 'empty':
				filtered = filtered.filter(u => u.totalEntities === 0);
				break;
		}

		// Apply sort
		filtered.sort((a, b) => {
			switch (currentSort) {
				case 'name-asc':
					return a.name.localeCompare(b.name);
				case 'name-desc':
					return b.name.localeCompare(a.name);
				case 'created-asc':
					return (a.created || '0000').localeCompare(b.created || '0000');
				case 'created-desc':
					return (b.created || '9999').localeCompare(a.created || '9999');
				case 'entities-asc':
					return a.totalEntities - b.totalEntities;
				case 'entities-desc':
					return b.totalEntities - a.totalEntities;
				default:
					return 0;
			}
		});

		// Render with pagination
		listContainer.empty();

		if (filtered.length === 0) {
			listContainer.createEl('p', {
				text: 'No matching universes found.',
				cls: 'crc-text--muted'
			});
			return;
		}

		const table = listContainer.createEl('table', { cls: 'crc-person-table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Name', cls: 'crc-person-table__th' });
		headerRow.createEl('th', { text: 'Status', cls: 'crc-person-table__th' });
		headerRow.createEl('th', { text: 'Entities', cls: 'crc-person-table__th' });
		headerRow.createEl('th', { text: '', cls: 'crc-person-table__th crc-person-table__th--icon' });

		const tbody = table.createEl('tbody');

		const visible = filtered.slice(0, displayLimit);
		for (const universe of visible) {
			renderBrowseUniverseRow(tbody, universe, app, plugin);
		}

		// Load more button
		if (filtered.length > displayLimit) {
			const remaining = filtered.length - displayLimit;
			const loadMore = listContainer.createEl('button', {
				text: `Load more (${remaining} remaining)`,
				cls: 'crc-btn crc-btn--secondary crc-btn--full-width crc-mt-3'
			});
			loadMore.addEventListener('click', () => {
				displayLimit += 25;
				applyFiltersAndRender();
			});
		}
	};

	// Event handlers
	searchInput.addEventListener('input', () => {
		currentSearch = searchInput.value;
		displayLimit = 25;
		onStateChange?.(currentFilter, currentSort, currentSearch);
		applyFiltersAndRender();
	});
	filterSelect.addEventListener('change', () => {
		currentFilter = filterSelect.value as UnivFilter;
		displayLimit = 25;
		onStateChange?.(currentFilter, currentSort, currentSearch);
		applyFiltersAndRender();
	});
	sortSelect.addEventListener('change', () => {
		currentSort = sortSelect.value as UnivSort;
		displayLimit = 25;
		onStateChange?.(currentFilter, currentSort, currentSearch);
		applyFiltersAndRender();
	});

	// Initial render
	applyFiltersAndRender();
}

/**
 * Render a universe row for the browse-only dockable view.
 * No click-to-edit, simplified context menu (open note only).
 */
function renderBrowseUniverseRow(
	tbody: HTMLElement,
	universe: UniverseInfo & { counts: UniverseEntityCounts; totalEntities: number },
	app: CanvasRootsPlugin['app'],
	plugin: CanvasRootsPlugin
): void {
	const row = tbody.createEl('tr', { cls: 'crc-person-table__row cr-universe-row--browse' });

	// Name cell
	const nameCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--name' });
	nameCell.createSpan({ text: universe.name });
	if (universe.description) {
		nameCell.createEl('br');
		nameCell.createSpan({
			text: universe.description,
			cls: 'crc-text--muted crc-text--small'
		});
	}

	// Status cell
	const statusCell = row.createEl('td', { cls: 'crc-person-table__td' });
	statusCell.createSpan({
		text: universe.status || 'active',
		cls: `crc-badge crc-badge--${universe.status || 'active'}`
	});

	// Entities cell
	const entitiesCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--date' });
	if (universe.totalEntities > 0) {
		const countParts: string[] = [];
		if (universe.counts.people > 0) countParts.push(`${universe.counts.people} people`);
		if (universe.counts.places > 0) countParts.push(`${universe.counts.places} places`);
		if (universe.counts.events > 0) countParts.push(`${universe.counts.events} events`);
		if (universe.counts.organizations > 0) countParts.push(`${universe.counts.organizations} orgs`);
		if (universe.counts.maps > 0) countParts.push(`${universe.counts.maps} maps`);
		if (universe.counts.calendars > 0) countParts.push(`${universe.counts.calendars} calendars`);
		entitiesCell.setText(countParts.join(', '));
	} else {
		entitiesCell.setText('\u2014');
	}

	// Default-calendar sub-line in the entities cell when set (#432 Phase 1)
	if (universe.defaultCalendar) {
		entitiesCell.createEl('br');
		entitiesCell.createSpan({
			text: `Default: ${resolveCalendarName(plugin, universe.defaultCalendar)}`,
			cls: 'crc-text--muted crc-text--small'
		});
	}

	// Actions cell
	const actionsCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--actions' });
	const openBtn = actionsCell.createEl('button', {
		cls: 'crc-person-table__open-btn clickable-icon',
		attr: { 'aria-label': 'Open note' }
	});
	setIcon(openBtn, 'file-text');
	openBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void app.workspace.getLeaf(false).openFile(universe.file);
	});

	// Context menu — open note only (no edit/delete)
	row.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		const menu = new Menu();

		menu.addItem(item => item
			.setTitle('Open note')
			.setIcon('file-text')
			.onClick(() => {
				void app.workspace.getLeaf(false).openFile(universe.file);
			}));

		menu.addItem(item => item
			.setTitle('Open in new tab')
			.setIcon('file-plus')
			.onClick(() => {
				void app.workspace.getLeaf('tab').openFile(universe.file);
			}));

		menu.showAtMouseEvent(e);
	});
}