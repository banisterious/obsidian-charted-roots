/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * People Tab for the Control Center
 *
 * Renders the People tab, including person statistics, parent claim conflicts,
 * batch operations, person list, context menus, timeline/coverage badges,
 * proof summaries, and relationship field helpers.
 */

import { App, ButtonComponent, Menu, Notice, Platform, Setting, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import type { LucideIconName } from './lucide-icons';
import { createLucideIcon } from './lucide-icons';
import { createStatItem } from './shared/card-component';
import { pluralize } from '../utils/format-utils';
import { extractPlaceInfo } from './person-picker';
import type { PlaceInfo } from './person-picker';
import { VaultStatsService } from '../core/vault-stats';
import { FamilyGraphService, PersonNode } from '../core/family-graph';
import { PlaceGraphService } from '../core/place-graph';
import { FolderFilterService } from '../core/folder-filter';
import { DataQualityService } from '../core/data-quality';
import { CreatePersonModal } from './create-person-modal';
import { TemplateSnippetsModal } from './template-snippets-modal';
import { MediaManagerModal } from '../core/ui/media-manager-modal';
import { SpouseMetadata, extractSourcedFactsFromFrontmatter, normalizeMarriageLocation } from '../core/person-note-writer';
import { createTimelineSummary } from '../events/ui/person-timeline';
import { getFamilyTimelineSummary } from '../events/ui/family-timeline';
import { EventService } from '../events/services/event-service';
import { CreateEventModal } from '../events/ui/create-event-modal';
import { getSpouseLabel } from '../utils/terminology';
import { formatDisplayDate } from '../dates';
import { EvidenceService } from '../sources';

// ---------------------------------------------------------------------------
// Options interface
// ---------------------------------------------------------------------------

export interface PeopleTabOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	app: App;
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement;
	showTab: (tabId: string) => void;
	closeModal: () => void;
	showQuickCreatePlaceModal: (placeName: string) => void;
	showPersonTimelineModal: (file: TFile, name: string, eventService: EventService) => void;
	showFamilyTimelineModal: (file: TFile, name: string, eventService: EventService, familyGraph: FamilyGraphService) => void;
	getCachedFamilyGraph: () => FamilyGraphService;
	getCachedPlaceGraph: () => PlaceGraphService;
	getCachedUniverses: () => string[];
	invalidateCaches: () => void;
	// Batch operation callbacks (these remain in control-center.ts)
	previewRemoveDuplicateRelationships: () => void;
	removeDuplicateRelationships: () => void;
	previewRemovePlaceholders: () => void;
	removePlaceholders: () => void;
	previewAddPersonType: () => void;
	addPersonType: () => void;
	previewNormalizeNames: () => void;
	normalizeNames: () => void;
	previewFixBidirectionalRelationships: () => void;
	fixBidirectionalRelationships: () => void;
	previewValidateDates: () => void;
	validateDates: () => void;
	previewDetectImpossibleDates: () => void;
}

// ---------------------------------------------------------------------------
// Person list state
// ---------------------------------------------------------------------------

/** Person list item for display (includes place info for action buttons) */
interface PersonListItem {
	crId: string;
	name: string;
	birthDate?: string;
	deathDate?: string;
	birthPlace?: PlaceInfo;
	deathPlace?: PlaceInfo;
	burialPlace?: PlaceInfo;
	file: TFile;
	mediaCount: number;
}

let personListItems: PersonListItem[] = [];
let personListFilter: 'all' | 'has-dates' | 'missing-dates' | 'unlinked-places' | 'living' = 'all';
let personListSort: 'name-asc' | 'name-desc' | 'birth-asc' | 'birth-desc' | 'death-asc' | 'death-desc' = 'name-asc';

/** Maximum people to render initially (for performance) */
const PERSON_LIST_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Shared list renderer (used by dockable ItemView)
// ---------------------------------------------------------------------------

/**
 * Filter options for the people list
 */
export type PersonListFilter = 'all' | 'has-dates' | 'missing-dates' | 'unlinked-places' | 'living';

/**
 * Sort options for the people list
 */
export type PersonListSort = 'name-asc' | 'name-desc' | 'birth-asc' | 'birth-desc' | 'death-asc' | 'death-desc';

/**
 * Options for rendering the people list.
 * Used by both the modal card and the dockable ItemView.
 */
export interface PeopleListOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	/** Initial filter state for restoration */
	initialFilter?: PersonListFilter;
	/** Initial sort state for restoration */
	initialSort?: PersonListSort;
	/** Initial search text for restoration */
	initialSearch?: string;
	/** Callback invoked when filter/sort/search state changes (for persistence) */
	onStateChange?: (filter: PersonListFilter, sort: PersonListSort, search: string) => void;
}

/**
 * Render a simplified people list with filter/sort/search/pagination.
 * Used by the dockable PeopleView. The modal uses its own loadPersonList()
 * which includes row-click-to-edit and interactive badges.
 */
export function renderPeopleList(options: PeopleListOptions): void {
	const { container, plugin, onStateChange } = options;
	const app = plugin.app;
	container.empty();

	// Local state (closure-scoped, not module-level)
	let currentFilter: PersonListFilter = options.initialFilter ?? 'all';
	let currentSort: PersonListSort = options.initialSort ?? 'name-asc';
	let currentSearch: string = options.initialSearch ?? '';

	// Load person data
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	if (people.length === 0) {
		container.createEl('p', {
			text: 'No person notes found. Create person notes with a cr_id in frontmatter.',
			cls: 'crc-text--muted'
		});
		return;
	}

	// Map to display items
	interface ListItem {
		crId: string;
		name: string;
		birthDate?: string;
		deathDate?: string;
		birthPlace?: PlaceInfo;
		deathPlace?: PlaceInfo;
		burialPlace?: PlaceInfo;
		file: TFile;
		mediaCount: number;
	}

	const items: ListItem[] = people.map(p => {
		const cache = app.metadataCache.getFileCache(p.file);
		const fm = cache?.frontmatter || {};
		return {
			crId: p.crId,
			name: p.name,
			birthDate: p.birthDate,
			deathDate: p.deathDate,
			birthPlace: extractPlaceInfo(fm.birth_place),
			deathPlace: extractPlaceInfo(fm.death_place),
			burialPlace: extractPlaceInfo(fm.burial_place),
			file: p.file,
			mediaCount: p.media?.length || 0
		};
	});

	// Controls row
	const controlsRow = container.createDiv({ cls: 'crc-person-controls' });

	// Filter dropdown
	const filterSelect = controlsRow.createEl('select', { cls: 'dropdown' });
	const filterOptions: { value: PersonListFilter; label: string }[] = [
		{ value: 'all', label: 'All people' },
		{ value: 'has-dates', label: 'Has dates' },
		{ value: 'missing-dates', label: 'Missing dates' },
		{ value: 'unlinked-places', label: 'Unlinked places' },
		{ value: 'living', label: 'Living (no death)' }
	];
	for (const opt of filterOptions) {
		filterSelect.createEl('option', { text: opt.label, value: opt.value });
	}
	filterSelect.value = currentFilter;

	// Sort dropdown
	const sortSelect = controlsRow.createEl('select', { cls: 'dropdown' });
	const sortOptions: { value: PersonListSort; label: string }[] = [
		{ value: 'name-asc', label: 'Name (A\u2013Z)' },
		{ value: 'name-desc', label: 'Name (Z\u2013A)' },
		{ value: 'birth-asc', label: 'Birth (oldest)' },
		{ value: 'birth-desc', label: 'Birth (newest)' },
		{ value: 'death-asc', label: 'Death (oldest)' },
		{ value: 'death-desc', label: 'Death (newest)' }
	];
	for (const opt of sortOptions) {
		sortSelect.createEl('option', { text: opt.label, value: opt.value });
	}
	sortSelect.value = currentSort;

	// Search input
	const searchInput = controlsRow.createEl('input', {
		cls: 'crc-filter-input',
		attr: {
			type: 'text',
			placeholder: `Search ${items.length} people...`
		}
	});
	if (currentSearch) {
		searchInput.value = currentSearch;
	}

	// List container
	const listContainer = container.createDiv({ cls: 'crc-person-list' });

	// Helper: check for unlinked places
	const hasUnlinkedPlaces = (p: ListItem): boolean => {
		return (p.birthPlace != null && !p.birthPlace.isLinked) ||
			(p.deathPlace != null && !p.deathPlace.isLinked) ||
			(p.burialPlace != null && !p.burialPlace.isLinked) || false;
	};

	// Apply filter, sort, search, and render
	const applyFiltersAndRender = () => {
		const query = currentSearch.toLowerCase();

		let filtered = items.filter(p =>
			p.name.toLowerCase().includes(query) ||
			(p.birthDate && p.birthDate.includes(query)) ||
			(p.deathDate && p.deathDate.includes(query))
		);

		switch (currentFilter) {
			case 'has-dates':
				filtered = filtered.filter(p => p.birthDate || p.deathDate);
				break;
			case 'missing-dates':
				filtered = filtered.filter(p => !p.birthDate && !p.deathDate);
				break;
			case 'unlinked-places':
				filtered = filtered.filter(hasUnlinkedPlaces);
				break;
			case 'living':
				filtered = filtered.filter(p => p.birthDate && !p.deathDate);
				break;
		}

		filtered.sort((a, b) => {
			switch (currentSort) {
				case 'name-asc':
					return a.name.localeCompare(b.name);
				case 'name-desc':
					return b.name.localeCompare(a.name);
				case 'birth-asc':
					return (a.birthDate || '9999').localeCompare(b.birthDate || '9999');
				case 'birth-desc':
					return (b.birthDate || '0000').localeCompare(a.birthDate || '0000');
				case 'death-asc':
					return (a.deathDate || '9999').localeCompare(b.deathDate || '9999');
				case 'death-desc':
					return (b.deathDate || '0000').localeCompare(a.deathDate || '0000');
				default:
					return 0;
			}
		});

		renderListItems(listContainer, filtered);
	};

	// Render the table with pagination
	const renderListItems = (target: HTMLElement, people: ListItem[]) => {
		target.empty();

		if (people.length === 0) {
			target.createEl('p', {
				text: 'No matching people found.',
				cls: 'crc-text--muted'
			});
			return;
		}

		const table = target.createEl('table', { cls: 'crc-person-table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Name', cls: 'crc-person-table__th' });
		headerRow.createEl('th', { text: 'Born', cls: 'crc-person-table__th' });
		headerRow.createEl('th', { text: 'Died', cls: 'crc-person-table__th' });
		headerRow.createEl('th', { text: 'Media', cls: 'crc-person-table__th crc-person-table__th--center' });
		headerRow.createEl('th', { text: '', cls: 'crc-person-table__th crc-person-table__th--icon' });

		const tbody = table.createEl('tbody');
		let renderedCount = 0;

		const renderBatch = (startFrom: number, limit: number): number => {
			let rendered = 0;
			for (let i = startFrom; i < people.length && rendered < limit; i++) {
				renderSimpleRow(tbody, people[i]);
				rendered++;
			}
			return rendered;
		};

		renderedCount = renderBatch(0, PERSON_LIST_PAGE_SIZE);

		if (renderedCount < people.length) {
			const loadMoreContainer = target.createDiv({ cls: 'crc-load-more-container' });
			const loadMoreBtn = new ButtonComponent(loadMoreContainer)
				.setButtonText(`Load more (${renderedCount} of ${people.length} shown)`)
				.onClick(() => {
					const newRendered = renderBatch(renderedCount, PERSON_LIST_PAGE_SIZE);
					renderedCount += newRendered;

					if (renderedCount >= people.length) {
						loadMoreContainer.remove();
					} else {
						loadMoreBtn.setButtonText(`Load more (${renderedCount} of ${people.length} shown)`);
					}
				});
		}
	};

	// Render a simplified table row (no row-click-to-edit, no interactive badges)
	const renderSimpleRow = (tbody: HTMLElement, person: ListItem) => {
		const row = tbody.createEl('tr', { cls: 'crc-person-table__row crc-person-table__row--browse' });

		// Name
		row.createEl('td', {
			text: person.name,
			cls: 'crc-person-table__td crc-person-table__td--name'
		});

		// Born
		row.createEl('td', {
			text: person.birthDate ? formatDisplayDate(person.birthDate) : '\u2014',
			cls: 'crc-person-table__td crc-person-table__td--date'
		});

		// Died
		row.createEl('td', {
			text: person.deathDate ? formatDisplayDate(person.deathDate) : '\u2014',
			cls: 'crc-person-table__td crc-person-table__td--date'
		});

		// Media count (read-only)
		const mediaCell = row.createEl('td', {
			cls: 'crc-person-table__td crc-person-table__td--media'
		});
		if (person.mediaCount > 0) {
			const mediaBadge = mediaCell.createEl('span', {
				cls: 'crc-person-list-badge crc-person-list-badge--media',
				attr: { title: `${person.mediaCount} media file${person.mediaCount !== 1 ? 's' : ''}` }
			});
			const mediaIcon = createLucideIcon('image', 12);
			mediaBadge.appendChild(mediaIcon);
			mediaBadge.appendText(person.mediaCount.toString());
		} else {
			mediaCell.createEl('span', { text: '\u2014', cls: 'crc-text-muted' });
		}

		// Actions: open note button
		const actionsCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--actions' });
		const openBtn = actionsCell.createEl('button', {
			cls: 'crc-person-table__open-btn clickable-icon',
			attr: { 'aria-label': 'Open note' }
		});
		const fileIcon = createLucideIcon('file-text', 14);
		openBtn.appendChild(fileIcon);
		openBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			void (async () => {
				await plugin.trackRecentFile(person.file, 'person');
				void app.workspace.getLeaf(false).openFile(person.file);
			})();
		});

		// Context menu
		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const menu = new Menu();

			menu.addItem((item) => {
				item.setTitle('Open note')
					.setIcon('file')
					.onClick(() => {
						void (async () => {
							await plugin.trackRecentFile(person.file, 'person');
							void app.workspace.getLeaf(false).openFile(person.file);
						})();
					});
			});

			menu.addItem((item) => {
				item.setTitle('Open in new tab')
					.setIcon('file-plus')
					.onClick(() => {
						void (async () => {
							await plugin.trackRecentFile(person.file, 'person');
							void app.workspace.getLeaf('tab').openFile(person.file);
						})();
					});
			});

			menu.addItem((item) => {
				item.setTitle('Open in new window')
					.setIcon('picture-in-picture-2')
					.onClick(() => {
						void (async () => {
							await plugin.trackRecentFile(person.file, 'person');
							void app.workspace.getLeaf('window').openFile(person.file);
						})();
					});
			});

			menu.showAtMouseEvent(e);
		});
	};

	// Event handlers
	searchInput.addEventListener('input', () => {
		currentSearch = searchInput.value;
		onStateChange?.(currentFilter, currentSort, currentSearch);
		applyFiltersAndRender();
	});

	filterSelect.addEventListener('change', () => {
		currentFilter = filterSelect.value as PersonListFilter;
		onStateChange?.(currentFilter, currentSort, currentSearch);
		applyFiltersAndRender();
	});

	sortSelect.addEventListener('change', () => {
		currentSort = sortSelect.value as PersonListSort;
		onStateChange?.(currentFilter, currentSort, currentSearch);
		applyFiltersAndRender();
	});

	// Initial render
	applyFiltersAndRender();
}

/**
 * Add a dock button to a card header that opens the people view
 * in the right sidebar.
 */
function addPeopleDockButton(card: HTMLElement, plugin: CanvasRootsPlugin): void {
	const header = card.querySelector('.crc-card__header');
	if (!header) return;

	const dockBtn = activeDocument.createElement('button');
	dockBtn.className = 'crc-card__dock-btn clickable-icon';
	dockBtn.setAttribute('aria-label', 'Open in sidebar');
	setIcon(dockBtn, 'panel-right');
	dockBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void plugin.activatePeopleView();
	});
	header.appendChild(dockBtn);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Render the People tab content
 */
export function renderPeopleTab(options: PeopleTabOptions): void {
	const { container, plugin, app, createCard, showTab, invalidateCaches } = options;

	// Actions Card
	const actionsCard = createCard({
		title: 'Actions',
		icon: 'plus',
		subtitle: 'Create and manage person notes'
	});

	const actionsContent = actionsCard.querySelector('.crc-card__content') as HTMLElement;

	new Setting(actionsContent)
		.setName('Create new person note')
		.setDesc('Create a new person note with family relationships')
		.addButton(button => button
			.setButtonText('Create person')
			.setCta()
			.onClick(() => {
				const familyGraph = options.getCachedFamilyGraph();
				const allUniverses = options.getCachedUniverses();

				new CreatePersonModal(app, {
					directory: plugin.settings.peopleFolder || '',
					familyGraph,
					propertyAliases: plugin.settings.propertyAliases,
					includeDynamicBlocks: false,
					dynamicBlockTypes: ['media', 'timeline', 'relationships'],
					existingUniverses: allUniverses,
					plugin,
					onCreated: () => {
						invalidateCaches();
						showTab('people');
					}
				}).open();
			}));

	new Setting(actionsContent)
		.setName('Create family group')
		.setDesc('Use the wizard to create multiple family members at once')
		.addButton(button => button
			.setButtonText('Create family')
			.onClick(() => {
				void import('./family-creation-wizard').then(({ FamilyCreationWizardModal }) => {
					new FamilyCreationWizardModal(app, plugin).open();
				});
			}));

	new Setting(actionsContent)
		.setName('Templater templates')
		.setDesc('Copy ready-to-use templates for Templater integration')
		.addButton(button => button
			.setButtonText('View templates')
			.onClick(() => {
				new TemplateSnippetsModal(app, undefined, plugin.settings.propertyAliases).open();
			}));

	new Setting(actionsContent)
		.setName('Create People base')
		.setDesc('Create an Obsidian base for managing People notes. After creating, click "Properties" to enable columns like Name, Parents, Spouse, Children, Birth, and Death.')
		.addButton(button => button
			.setButtonText('Create')
			.onClick(() => {
				app.commands.executeCommandById('charted-roots:create-base-template');
			}));

	new Setting(actionsContent)
		.setName('Link media')
		.setDesc('Open the Media Manager to browse, link, and organize media files for person notes')
		.addButton(button => button
			.setButtonText('Open Media Manager')
			.onClick(() => {
				new MediaManagerModal(app, plugin).open();
			}));

	// Web Clipper info box (#364)
	const clipperNote = actionsContent.createDiv({ cls: 'cr-info-box cr-info-box--muted' });
	const clipperIcon = clipperNote.createSpan({ cls: 'cr-info-box-icon' });
	setIcon(clipperIcon, 'globe');
	const clipperText = clipperNote.createSpan();
	clipperText.appendText('Import people from the web using ');
	clipperText.createEl('a', {
		text: 'Web Clipper templates',
		href: 'https://github.com/banisterious/obsidian-charted-roots/wiki/Web-Clipper-Integration#ready-to-use-templates'
	});
	clipperText.appendText(' (FamilySearch, Wikipedia biographies, and more).');

	container.appendChild(actionsCard);

	// Batch Operations Card
	const batchCard = createCard({
		title: 'Batch operations',
		icon: 'zap',
		subtitle: 'Fix common data issues across person notes'
	});

	const batchContent = batchCard.querySelector('.crc-card__content') as HTMLElement;

	// Navigation guidance
	const navInfo = batchContent.createEl('p', {
		cls: 'crc-text-muted',
		text: 'These operations work on all person notes in your vault. For comprehensive data quality analysis across all entities, see the '
	});
	const dataQualityLink = navInfo.createEl('a', {
		text: 'Data Quality tab',
		href: '#',
		cls: 'crc-text-link'
	});
	dataQualityLink.addEventListener('click', (e) => {
		e.preventDefault();
		showTab('data-quality');
	});
	navInfo.appendText('.');

	new Setting(batchContent)
		.setName('Remove duplicate relationships')
		.setDesc('Clean up duplicate entries in spouse and children arrays')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewRemoveDuplicateRelationships();
			}))
		.addButton(button => button
			.setButtonText('Apply')
			.setCta()
			.onClick(() => {
				void options.removeDuplicateRelationships();
			}));

	new Setting(batchContent)
		.setName('Remove placeholder values')
		.setDesc('Clean up placeholder text like "Unknown", "N/A", "???", and malformed wikilinks')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewRemovePlaceholders();
			}))
		.addButton(button => button
			.setButtonText('Apply')
			.setCta()
			.onClick(() => {
				void options.removePlaceholders();
			}));

	new Setting(batchContent)
		.setName('Add cr_type property to person notes')
		.setDesc('Add cr_type: person to all person notes that don\'t have it (recommended for better compatibility)')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewAddPersonType();
			}))
		.addButton(button => button
			.setButtonText('Apply')
			.setCta()
			.onClick(() => {
				void options.addPersonType();
			}));

	new Setting(batchContent)
		.setName('Normalize name formatting')
		.setDesc('Standardize name capitalization: "JOHN SMITH" \u2192 "John Smith", handle prefixes like van, de, Mac')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewNormalizeNames();
			}))
		.addButton(button => button
			.setButtonText('Apply')
			.setCta()
			.onClick(() => {
				void options.normalizeNames();
			}));

	new Setting(batchContent)
		.setName('Fix bidirectional relationship inconsistencies')
		.setDesc('Add missing reciprocal relationship links (parent\u2194child, spouse\u2194spouse)')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewFixBidirectionalRelationships();
			}))
		.addButton(button => button
			.setButtonText('Apply')
			.setCta()
			.onClick(() => {
				void options.fixBidirectionalRelationships();
			}));

	new Setting(batchContent)
		.setName('Validate date formats')
		.setDesc('Check all date fields (born, died, birth_date, death_date) for format issues based on your date validation preferences')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewValidateDates();
			}))
		.addButton(button => button
			.setButtonText('Apply')
			.setCta()
			.onClick(() => {
				void options.validateDates();
			}));

	new Setting(batchContent)
		.setName('Detect impossible dates')
		.setDesc('Find logical date errors (birth after death, unrealistic lifespans, parent-child date conflicts)')
		.addButton(button => button
			.setButtonText('Preview')
			.onClick(() => {
				void options.previewDetectImpossibleDates();
			}));

	container.appendChild(batchCard);

	// Parent Claim Conflicts Card
	const conflictsCard = createCard({
		title: 'Parent claim conflicts',
		icon: 'alert-triangle',
		subtitle: 'Children claimed by multiple parents'
	});
	const conflictsContent = conflictsCard.querySelector('.crc-card__content') as HTMLElement;
	conflictsContent.createEl('p', {
		text: 'Scanning for conflicts...',
		cls: 'crc-text--muted'
	});
	container.appendChild(conflictsCard);

	// Load conflicts asynchronously
	void loadParentClaimConflicts(conflictsContent, options);

	// Statistics Card
	const statsCard = createCard({
		title: 'Person statistics',
		icon: 'users',
		subtitle: 'Overview of person notes in your vault'
	});

	const statsContent = statsCard.querySelector('.crc-card__content') as HTMLElement;
	statsContent.createEl('p', {
		text: 'Loading statistics...',
		cls: 'crc-text--muted'
	});

	container.appendChild(statsCard);

	// Load statistics asynchronously
	void loadPersonStatistics(statsContent, options);

	// Person List Card
	const listCard = createCard({
		title: 'Person notes',
		icon: 'user',
		subtitle: 'All person notes in your vault'
	});

	addPeopleDockButton(listCard, plugin);

	const listContent = listCard.querySelector('.crc-card__content') as HTMLElement;
	listContent.createEl('p', {
		text: 'Loading people...',
		cls: 'crc-text--muted'
	});

	container.appendChild(listCard);

	// Load person list asynchronously
	void loadPersonList(listContent, options);
}

// ---------------------------------------------------------------------------
// Person statistics
// ---------------------------------------------------------------------------

/**
 * Load person statistics into container
 */
function loadPersonStatistics(container: HTMLElement, options: PeopleTabOptions): void {
	const { app, plugin, closeModal } = options;
	container.empty();

	const statsService = new VaultStatsService(app);
	statsService.setSettings(plugin.settings);
	const stats = statsService.collectStats();

	// If no people, show getting started message
	if (stats.people.totalPeople === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No person notes found in your vault.',
			cls: 'crc-text--muted'
		});
		emptyState.createEl('p', {
			text: 'Person notes require a cr_id property in their frontmatter. Create person notes to start building your family tree.',
			cls: 'crc-text--muted crc-text--small'
		});
		return;
	}

	// Overview statistics grid
	const statsGrid = container.createDiv({ cls: 'crc-stats-grid' });

	// Total people
	createStatItem(statsGrid, 'Total people', stats.people.totalPeople.toString(), 'users');

	// With birth date
	const birthPercent = stats.people.totalPeople > 0
		? Math.round((stats.people.peopleWithBirthDate / stats.people.totalPeople) * 100)
		: 0;
	createStatItem(statsGrid, 'With birth date', `${stats.people.peopleWithBirthDate} (${birthPercent}%)`, 'calendar');

	// Living people
	createStatItem(statsGrid, 'Living', stats.people.livingPeople.toString(), 'heart');

	// Orphaned (no relationships)
	createStatItem(statsGrid, 'No relationships', stats.people.orphanedPeople.toString(), 'user-minus');

	// Relationship statistics section
	const relSection = container.createDiv({ cls: 'crc-mt-4' });
	relSection.createEl('h4', { text: 'Relationships', cls: 'crc-section-title' });

	const relGrid = relSection.createDiv({ cls: 'crc-stats-grid crc-stats-grid--compact' });

	// With father
	const fatherPercent = stats.people.totalPeople > 0
		? Math.round((stats.people.peopleWithFather / stats.people.totalPeople) * 100)
		: 0;
	createStatItem(relGrid, 'With father', `${stats.people.peopleWithFather} (${fatherPercent}%)`);

	// With mother
	const motherPercent = stats.people.totalPeople > 0
		? Math.round((stats.people.peopleWithMother / stats.people.totalPeople) * 100)
		: 0;
	createStatItem(relGrid, 'With mother', `${stats.people.peopleWithMother} (${motherPercent}%)`);

	// With spouse
	const spousePercent = stats.people.totalPeople > 0
		? Math.round((stats.people.peopleWithSpouse / stats.people.totalPeople) * 100)
		: 0;
	createStatItem(relGrid, `With ${getSpouseLabel(plugin.settings, { lowercase: true })}`, `${stats.people.peopleWithSpouse} (${spousePercent}%)`);

	// Total relationships
	createStatItem(relGrid, 'Total relationships', stats.relationships.totalRelationships.toString());

	// View full statistics link
	const statsLink = container.createDiv({ cls: 'cr-stats-link' });
	const link = statsLink.createEl('a', { text: 'View full statistics \u2192', cls: 'crc-text-muted' });
	link.addEventListener('click', (e) => {
		e.preventDefault();
		closeModal();
		void plugin.activateStatisticsView();
	});
}

// ---------------------------------------------------------------------------
// Parent claim conflicts
// ---------------------------------------------------------------------------

/**
 * Load parent claim conflicts into container
 */
function loadParentClaimConflicts(container: HTMLElement, options: PeopleTabOptions): void {
	const { app, plugin } = options;
	container.empty();

	// Create services
	const folderFilter = new FolderFilterService(plugin.settings);
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();

	const dataQuality = new DataQualityService(
		app,
		plugin.settings,
		familyGraph,
		folderFilter,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality.setPersonIndex(plugin.personIndex);
	}

	// Detect conflicts
	const inconsistencies = dataQuality.detectBidirectionalInconsistencies();
	const conflicts = inconsistencies.filter(i => i.type === 'conflicting-parent-claim');

	if (conflicts.length === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No parent claim conflicts found.',
			cls: 'crc-text--muted'
		});
		emptyState.createEl('p', {
			text: 'Conflicts occur when multiple people list the same child in their children_id field.',
			cls: 'crc-text--muted crc-text--small'
		});
		return;
	}

	// Explanation
	const explanation = container.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	explanation.createEl('p', {
		text: `Found ${conflicts.length} ${pluralize(conflicts.length, 'conflict')} where multiple people claim the same child. Review each and choose which parent is correct.`,
		cls: 'crc-text--small'
	});

	// Create table
	const tableContainer = container.createDiv({ cls: 'crc-batch-table-container' });
	const table = tableContainer.createEl('table', { cls: 'crc-batch-preview-table crc-conflicts-table' });

	const thead = table.createEl('thead');
	const headerRow = thead.createEl('tr');
	headerRow.createEl('th', { text: 'Child' });
	headerRow.createEl('th', { text: 'Type' });
	headerRow.createEl('th', { text: 'Claimant 1' });
	headerRow.createEl('th', { text: 'Claimant 2' });
	headerRow.createEl('th', { text: 'Actions' });

	const tbody = table.createEl('tbody');

	for (const conflict of conflicts) {
		const child = conflict.relatedPerson;
		const claimant1 = conflict.person;  // Current parent in child's father_id/mother_id
		const claimant2 = conflict.conflictingPerson;  // Other claimant

		if (!claimant2) continue;

		const row = tbody.createEl('tr');

		// Child cell (clickable)
		const childCell = row.createEl('td');
		const childLink = childCell.createEl('a', {
			text: child.name || child.file.basename,
			cls: 'crc-person-link'
		});
		childLink.addEventListener('click', (e) => {
			e.preventDefault();
			void app.workspace.openLinkText(child.file.path, '', false);
		});
		childLink.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			showPersonLinkContextMenu(child.file, e, options);
		});

		// Conflict type
		row.createEl('td', { text: conflict.conflictType === 'father' ? 'Father' : 'Mother' });

		// Claimant 1 cell - show name and cr_id for disambiguation
		const claimant1Cell = row.createEl('td');
		const claimant1Link = claimant1Cell.createEl('a', {
			text: claimant1.name || claimant1.file.basename,
			cls: 'crc-person-link'
		});
		claimant1Link.addEventListener('click', (e) => {
			e.preventDefault();
			void app.workspace.openLinkText(claimant1.file.path, '', false);
		});
		claimant1Link.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			showPersonLinkContextMenu(claimant1.file, e, options);
		});
		claimant1Cell.createEl('span', {
			text: ` (${claimant1.crId})`,
			cls: 'crc-text--muted crc-text--small'
		});

		// Claimant 2 cell - show name and cr_id for disambiguation
		const claimant2Cell = row.createEl('td');
		const claimant2Link = claimant2Cell.createEl('a', {
			text: claimant2.name || claimant2.file.basename,
			cls: 'crc-person-link'
		});
		claimant2Link.addEventListener('click', (e) => {
			e.preventDefault();
			void app.workspace.openLinkText(claimant2.file.path, '', false);
		});
		claimant2Link.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			showPersonLinkContextMenu(claimant2.file, e, options);
		});
		claimant2Cell.createEl('span', {
			text: ` (${claimant2.crId})`,
			cls: 'crc-text--muted crc-text--small'
		});

		// Actions cell
		const actionsCell = row.createEl('td', { cls: 'crc-conflict-actions' });

		// Keep Claimant 1 button
		const keepBtn1 = actionsCell.createEl('button', {
			text: 'Keep 1',
			cls: 'crc-btn-small',
			attr: { title: `Keep ${claimant1.name || claimant1.file.basename} as ${conflict.conflictType}` }
		});
		keepBtn1.addEventListener('click', () => {
			void (async () => {
				await resolveParentConflict(child, claimant1, claimant2, conflict.conflictType!, 'keep1', options);
				row.remove();
				updateConflictCardCount(container, tbody);
			})();
		});

		// Keep Claimant 2 button
		const keepBtn2 = actionsCell.createEl('button', {
			text: 'Keep 2',
			cls: 'crc-btn-small',
			attr: { title: `Keep ${claimant2.name || claimant2.file.basename} as ${conflict.conflictType}` }
		});
		keepBtn2.addEventListener('click', () => {
			void (async () => {
				await resolveParentConflict(child, claimant1, claimant2, conflict.conflictType!, 'keep2', options);
				row.remove();
				updateConflictCardCount(container, tbody);
			})();
		});
	}

	// Count display
	const countDiv = container.createDiv({ cls: 'crc-conflicts-count crc-mt-2' });
	countDiv.createSpan({
		text: `${conflicts.length} ${pluralize(conflicts.length, 'conflict')} to resolve`,
		cls: 'crc-text--muted'
	});
}

/**
 * Resolve a parent claim conflict
 */
async function resolveParentConflict(
	child: PersonNode,
	claimant1: PersonNode,
	claimant2: PersonNode,
	conflictType: 'father' | 'mother',
	resolution: 'keep1' | 'keep2',
	options: PeopleTabOptions
): Promise<void> {
	const { app, plugin } = options;
	const parentField = conflictType === 'father' ? 'father_id' : 'mother_id';
	const parentWikilinkField = conflictType === 'father' ? 'father' : 'mother';

	// Suspend linker during changes
	plugin.bidirectionalLinker?.suspend();

	const modifiedFiles: TFile[] = [];

	try {
		if (resolution === 'keep1') {
			// Keep claimant1: remove child from claimant2's children_id
			await removeChildFromParent(claimant2.file, child.crId, app);
			modifiedFiles.push(claimant2.file);
			new Notice(`Removed ${child.name || child.file.basename} from ${claimant2.name || claimant2.file.basename}'s children`);
		} else {
			// Keep claimant2: update child's parent field and remove from claimant1's children_id
			await app.fileManager.processFrontMatter(child.file, (fm) => {
				fm[parentField] = claimant2.crId;
				fm[parentWikilinkField] = `[[${claimant2.name || claimant2.file.basename}]]`;
			});
			await removeChildFromParent(claimant1.file, child.crId, app);
			modifiedFiles.push(child.file, claimant1.file);
			new Notice(`Changed ${child.name || child.file.basename}'s ${conflictType} to ${claimant2.name || claimant2.file.basename}`);
		}

		// Reload cache
		const familyGraph = plugin.createFamilyGraphService();
		await familyGraph.reloadCache(modifiedFiles);
	} finally {
		// Resume linker after a short delay
		window.setTimeout(() => {
			plugin.bidirectionalLinker?.resume();
		}, 500);
	}
}

/**
 * Remove a child from a parent's children_id array
 */
async function removeChildFromParent(parentFile: TFile, childCrId: string, app: App): Promise<void> {
	await app.fileManager.processFrontMatter(parentFile, (fm) => {
		if (fm.children_id) {
			if (Array.isArray(fm.children_id)) {
				fm.children_id = fm.children_id.filter((id: string) => id !== childCrId);
				if (fm.children_id.length === 0) {
					delete fm.children_id;
				}
			} else if (fm.children_id === childCrId) {
				delete fm.children_id;
			}
		}
	});
}

/**
 * Update conflict card count after resolving one
 */
function updateConflictCardCount(container: HTMLElement, tbody: HTMLElement): void {
	const remainingRows = tbody.querySelectorAll('tr').length;
	const countEl = container.querySelector('.crc-conflicts-count span');

	if (remainingRows === 0) {
		// All conflicts resolved - show empty state
		container.empty();
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'All parent claim conflicts have been resolved!',
			cls: 'crc-text--muted'
		});
	} else if (countEl) {
		countEl.textContent = `${remainingRows} ${pluralize(remainingRows, 'conflict')} to resolve`;
	}
}

// ---------------------------------------------------------------------------
// Person list
// ---------------------------------------------------------------------------

/**
 * Load person list into container
 */
function loadPersonList(container: HTMLElement, options: PeopleTabOptions): void {
	const { app, plugin } = options;
	container.empty();

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	if (people.length === 0) {
		container.createEl('p', {
			text: 'No person notes found. Create person notes with a cr_id in frontmatter.',
			cls: 'crc-text--muted'
		});
		return;
	}

	// Map to display format with place info
	personListItems = people.map(p => {
		// Get place info from frontmatter (need raw values for isLinked detection)
		const cache = app.metadataCache.getFileCache(p.file);
		const fm = cache?.frontmatter || {};

		return {
			crId: p.crId,
			name: p.name,
			birthDate: p.birthDate,
			deathDate: p.deathDate,
			birthPlace: extractPlaceInfo(fm.birth_place),
			deathPlace: extractPlaceInfo(fm.death_place),
			burialPlace: extractPlaceInfo(fm.burial_place),
			file: p.file,
			mediaCount: p.media?.length || 0
		};
	});

	// Create controls row (filter + sort + search)
	const controlsRow = container.createDiv({ cls: 'crc-person-controls' });

	// Filter dropdown
	const filterSelect = controlsRow.createEl('select', {
		cls: 'dropdown'
	});
	const filterOptions = [
		{ value: 'all', label: 'All people' },
		{ value: 'has-dates', label: 'Has dates' },
		{ value: 'missing-dates', label: 'Missing dates' },
		{ value: 'unlinked-places', label: 'Unlinked places' },
		{ value: 'living', label: 'Living (no death)' }
	];
	filterOptions.forEach(opt => {
		const option = filterSelect.createEl('option', { text: opt.label, value: opt.value });
		if (opt.value === personListFilter) option.selected = true;
	});

	// Sort dropdown
	const sortSelect = controlsRow.createEl('select', {
		cls: 'dropdown'
	});
	const sortOptions = [
		{ value: 'name-asc', label: 'Name (A\u2013Z)' },
		{ value: 'name-desc', label: 'Name (Z\u2013A)' },
		{ value: 'birth-asc', label: 'Birth (oldest)' },
		{ value: 'birth-desc', label: 'Birth (newest)' },
		{ value: 'death-asc', label: 'Death (oldest)' },
		{ value: 'death-desc', label: 'Death (newest)' }
	];
	sortOptions.forEach(opt => {
		const option = sortSelect.createEl('option', { text: opt.label, value: opt.value });
		if (opt.value === personListSort) option.selected = true;
	});

	// Search input
	const searchInput = controlsRow.createEl('input', {
		cls: 'crc-filter-input',
		attr: {
			type: 'text',
			placeholder: `Search ${personListItems.length} people...`
		}
	});

	// Usage hint
	const hint = container.createEl('p', {
		cls: 'crc-text-muted crc-text-small crc-mb-2'
	});
	hint.appendText('Click a row to edit. ');
	// File icon for "open note"
	const fileIconHint = createLucideIcon('file-text', 12);
	fileIconHint.addClass('crc-icon-inline');
	hint.appendChild(fileIconHint);
	hint.appendText(' opens the note. ');
	// Unlinked places badge
	const exampleBadge = hint.createEl('span', {
		cls: 'crc-person-list-badge crc-person-list-badge--unlinked crc-person-list-badge--hint'
	});
	const badgeIcon = createLucideIcon('map-pin', 10);
	exampleBadge.appendChild(badgeIcon);
	exampleBadge.appendText('1');
	hint.appendText(' creates place notes.');

	// List container
	const listContainer = container.createDiv({ cls: 'crc-person-list' });

	// Helper to check if person has unlinked places
	const hasUnlinkedPlaces = (p: PersonListItem): boolean => {
		return (p.birthPlace && !p.birthPlace.isLinked) ||
			(p.deathPlace && !p.deathPlace.isLinked) ||
			(p.burialPlace && !p.burialPlace.isLinked) || false;
	};

	// Apply filter, sort, and render
	const applyFiltersAndRender = () => {
		const query = searchInput.value.toLowerCase();

		// Filter by search query
		let filtered = personListItems.filter(p =>
			p.name.toLowerCase().includes(query) ||
			(p.birthDate && p.birthDate.includes(query)) ||
			(p.deathDate && p.deathDate.includes(query))
		);

		// Apply category filter
		switch (personListFilter) {
			case 'has-dates':
				filtered = filtered.filter(p => p.birthDate || p.deathDate);
				break;
			case 'missing-dates':
				filtered = filtered.filter(p => !p.birthDate && !p.deathDate);
				break;
			case 'unlinked-places':
				filtered = filtered.filter(hasUnlinkedPlaces);
				break;
			case 'living':
				filtered = filtered.filter(p => p.birthDate && !p.deathDate);
				break;
		}

		// Apply sort
		filtered.sort((a, b) => {
			switch (personListSort) {
				case 'name-asc':
					return a.name.localeCompare(b.name);
				case 'name-desc':
					return b.name.localeCompare(a.name);
				case 'birth-asc':
					return (a.birthDate || '9999').localeCompare(b.birthDate || '9999');
				case 'birth-desc':
					return (b.birthDate || '0000').localeCompare(a.birthDate || '0000');
				case 'death-asc':
					return (a.deathDate || '9999').localeCompare(b.deathDate || '9999');
				case 'death-desc':
					return (b.deathDate || '0000').localeCompare(a.deathDate || '0000');
				default:
					return 0;
			}
		});

		renderPersonListItems(listContainer, filtered, options);
	};

	// Event handlers
	searchInput.addEventListener('input', applyFiltersAndRender);

	filterSelect.addEventListener('change', () => {
		personListFilter = filterSelect.value as typeof personListFilter;
		applyFiltersAndRender();
	});

	sortSelect.addEventListener('change', () => {
		personListSort = sortSelect.value as typeof personListSort;
		applyFiltersAndRender();
	});

	// Initial render
	applyFiltersAndRender();
}

/**
 * Render person list items as a table with pagination
 */
function renderPersonListItems(
	container: HTMLElement,
	people: PersonListItem[],
	options: PeopleTabOptions
): void {
	container.empty();

	if (people.length === 0) {
		container.createEl('p', {
			text: 'No matching people found.',
			cls: 'crc-text--muted'
		});
		return;
	}

	// For large lists, show count and paginate
	const totalCount = people.length;
	const needsPagination = totalCount > PERSON_LIST_PAGE_SIZE;
	let renderedCount = 0;

	// Create table structure
	const table = container.createEl('table', { cls: 'crc-person-table' });
	const thead = table.createEl('thead');
	const headerRow = thead.createEl('tr');
	headerRow.createEl('th', { text: 'Name', cls: 'crc-person-table__th' });
	headerRow.createEl('th', { text: 'Born', cls: 'crc-person-table__th' });
	headerRow.createEl('th', { text: 'Died', cls: 'crc-person-table__th' });
	headerRow.createEl('th', { text: 'Media', cls: 'crc-person-table__th crc-person-table__th--center' });
	headerRow.createEl('th', { text: '', cls: 'crc-person-table__th crc-person-table__th--icon' }); // For badges

	const tbody = table.createEl('tbody');

	const renderBatch = (startFrom: number, limit: number): number => {
		let rendered = 0;
		for (let i = startFrom; i < people.length && rendered < limit; i++) {
			renderPersonTableRow(tbody, people[i], options);
			rendered++;
		}
		return rendered;
	};

	// Initial render
	renderedCount = renderBatch(0, PERSON_LIST_PAGE_SIZE);

	// Show "Load more" button if needed
	if (needsPagination && renderedCount < totalCount) {
		const loadMoreContainer = container.createDiv({ cls: 'crc-load-more-container' });
		const loadMoreBtn = new ButtonComponent(loadMoreContainer)
			.setButtonText(`Load more (${renderedCount} of ${totalCount} shown)`)
			.onClick(() => {
				const newRendered = renderBatch(renderedCount, PERSON_LIST_PAGE_SIZE);
				renderedCount += newRendered;

				if (renderedCount >= totalCount) {
					loadMoreContainer.remove();
				} else {
					loadMoreBtn.setButtonText(`Load more (${renderedCount} of ${totalCount} shown)`);
				}
			});
	}
}

/**
 * Render a single person as a table row
 */
function renderPersonTableRow(
	tbody: HTMLElement,
	person: PersonListItem,
	options: PeopleTabOptions
): void {
	const { app, plugin, invalidateCaches, showTab } = options;
	const row = tbody.createEl('tr', { cls: 'crc-person-table__row' });

	// Name cell
	row.createEl('td', {
		text: person.name,
		cls: 'crc-person-table__td crc-person-table__td--name'
	});

	// Birth date cell
	row.createEl('td', {
		text: person.birthDate ? formatDisplayDate(person.birthDate) : '\u2014',
		cls: 'crc-person-table__td crc-person-table__td--date'
	});

	// Death date cell
	row.createEl('td', {
		text: person.deathDate ? formatDisplayDate(person.deathDate) : '\u2014',
		cls: 'crc-person-table__td crc-person-table__td--date'
	});

	// Media count cell
	const mediaCell = row.createEl('td', {
		cls: 'crc-person-table__td crc-person-table__td--media'
	});
	if (person.mediaCount > 0) {
		const mediaBadge = mediaCell.createEl('span', {
			cls: 'crc-person-list-badge crc-person-list-badge--media',
			attr: { title: `${person.mediaCount} media file${person.mediaCount !== 1 ? 's' : ''}` }
		});
		const mediaIcon = createLucideIcon('image', 12);
		mediaBadge.appendChild(mediaIcon);
		mediaBadge.appendText(person.mediaCount.toString());

		// Click to open manage media modal
		mediaBadge.addEventListener('click', (e) => {
			e.stopPropagation();
			plugin.openManageMediaModal(person.file, 'person', person.name);
		});
	} else {
		mediaCell.createEl('span', { text: '\u2014', cls: 'crc-text-muted' });
	}

	// Actions cell (timeline badge + unlinked places badge + open note button)
	const actionsCell = row.createEl('td', { cls: 'crc-person-table__td crc-person-table__td--actions' });

	// Timeline badge (person's own events)
	const eventService = plugin.getEventService();
	if (eventService) {
		const personLink = `[[${person.file.basename}]]`;
		const events = eventService.getEventsForPerson(personLink);

		if (events.length > 0) {
			const summary = createTimelineSummary(events);
			const timelineBadge = actionsCell.createEl('span', {
				cls: 'crc-person-list-badge crc-person-list-badge--timeline',
				attr: {
					title: summary.dateRange
						? `${summary.count} events (${summary.dateRange})`
						: `${summary.count} events`
				}
			});
			const calendarIcon = createLucideIcon('calendar', 12);
			timelineBadge.appendChild(calendarIcon);
			timelineBadge.appendText(summary.count.toString());

			// Click to show timeline in modal
			timelineBadge.addEventListener('click', (e) => {
				e.stopPropagation();
				options.showPersonTimelineModal(person.file, person.name, eventService);
			});
		}

		// Family timeline badge (events for person + spouses + children).
		// Only shown when the family unit has members with events beyond just the person.
		const familyGraph = plugin.createFamilyGraphService();
		familyGraph.ensureCacheLoaded();
		const familySummary = getFamilyTimelineSummary(person.file, eventService, familyGraph);
		if (familySummary.memberCount > 1 && familySummary.totalEvents > 0) {
			const familyBadge = actionsCell.createEl('span', {
				cls: 'crc-person-list-badge crc-person-list-badge--family-timeline',
				attr: {
					title: familySummary.dateRange
						? `Family: ${familySummary.totalEvents} events, ${familySummary.memberCount} members (${familySummary.dateRange})`
						: `Family: ${familySummary.totalEvents} events, ${familySummary.memberCount} members`
				}
			});
			const usersIcon = createLucideIcon('users', 12);
			familyBadge.appendChild(usersIcon);
			familyBadge.appendText(familySummary.totalEvents.toString());

			familyBadge.addEventListener('click', (e) => {
				e.stopPropagation();
				options.showFamilyTimelineModal(person.file, person.name, eventService, familyGraph);
			});
		}
	}

	// Check for unlinked places
	const unlinkedPlaces: { type: string; info: PlaceInfo }[] = [];
	if (person.birthPlace && !person.birthPlace.isLinked) {
		unlinkedPlaces.push({ type: 'Birth', info: person.birthPlace });
	}
	if (person.deathPlace && !person.deathPlace.isLinked) {
		unlinkedPlaces.push({ type: 'Death', info: person.deathPlace });
	}
	if (person.burialPlace && !person.burialPlace.isLinked) {
		unlinkedPlaces.push({ type: 'Burial', info: person.burialPlace });
	}

	if (unlinkedPlaces.length > 0) {
		const badge = actionsCell.createEl('span', {
			cls: 'crc-person-list-badge crc-person-list-badge--unlinked',
			attr: {
				title: `${unlinkedPlaces.length} unlinked place${unlinkedPlaces.length !== 1 ? 's' : ''}: ${unlinkedPlaces.map(p => p.info.placeName).join(', ')}`
			}
		});
		const mapIcon = createLucideIcon('map-pin', 12);
		badge.appendChild(mapIcon);
		badge.appendText(unlinkedPlaces.length.toString());

		// Click to show place creation options
		badge.addEventListener('click', (e) => {
			e.stopPropagation();
			showUnlinkedPlacesMenu(unlinkedPlaces, e, options);
		});
	}

	// Research coverage badge (when fact-level source tracking is enabled)
	if (plugin.settings.trackFactSourcing) {
		const evidenceService = new EvidenceService(app, plugin.settings);
		const coverage = evidenceService.getFactCoverageForFile(person.file);

		if (coverage && coverage.totalFactCount > 0) {
			// Determine badge class based on coverage percent
			let badgeClass = 'crc-person-list-badge';
			if (coverage.coveragePercent >= 75) {
				badgeClass += ' crc-person-list-badge--coverage-high';
			} else if (coverage.coveragePercent >= 50) {
				badgeClass += ' crc-person-list-badge--coverage-medium';
			} else {
				badgeClass += ' crc-person-list-badge--coverage-low';
			}

			const coverageBadge = actionsCell.createEl('span', {
				cls: badgeClass,
				attr: {
					title: `Research coverage: ${coverage.coveragePercent}% (${coverage.sourcedFactCount}/${coverage.totalFactCount} facts sourced)`
				}
			});
			const bookIcon = createLucideIcon('book-open', 12);
			coverageBadge.appendChild(bookIcon);
			coverageBadge.appendText(`${coverage.coveragePercent}%`);
		}
	}

	// Open note button
	const openBtn = actionsCell.createEl('button', {
		cls: 'crc-person-table__open-btn clickable-icon',
		attr: { 'aria-label': 'Open note' }
	});
	const fileIcon = createLucideIcon('file-text', 14);
	openBtn.appendChild(fileIcon);
	openBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void (async () => {
			await plugin.trackRecentFile(person.file, 'person');
			void app.workspace.getLeaf(false).openFile(person.file);
		})();
	});

	// Click row to open edit modal
	row.addEventListener('click', () => {
		// Get full person data from frontmatter for edit modal
		const cache = app.metadataCache.getFileCache(person.file);
		const fm = cache?.frontmatter || {};

		// Extract relationship data (separate IDs and names for dual storage)
		const fatherId = fm.father_id;
		const motherId = fm.mother_id;
		const parentIds = fm.parents_id;

		// Extract name from wikilink or plain string
		const extractName = (value: unknown): string | undefined => {
			if (!value || typeof value !== 'string') return undefined;
			const match = value.match(/\[\[([^\]]+)\]\]/);
			return match ? match[1] : value;
		};

		// Extract father/mother names from wikilinks
		const fatherName = extractName(fm.father);
		const motherName = extractName(fm.mother);

		// Extract spouse names/IDs - check for indexed format first (#204)
		const spouseNames: string[] = [];
		const spouseIds: string[] = [];
		const spouseMetadata: SpouseMetadata[] = [];

		let hasIndexedSpouses = false;
		for (let i = 1; i <= 10; i++) {
			const spouseLink = fm[`spouse${i}`];
			const spouseId = fm[`spouse${i}_id`];
			if (spouseLink || spouseId) {
				hasIndexedSpouses = true;
				const name = extractName(spouseLink);
				const crId = String(spouseId || '');

				if (name) spouseNames.push(name);
				if (crId) spouseIds.push(crId);

				spouseMetadata.push({
					crId: crId || '',
					name: name || crId || `Spouse ${i}`,
					marriageDate: fm[`spouse${i}_marriage_date`] as string | undefined,
					marriageLocation: normalizeMarriageLocation(fm[`spouse${i}_marriage_location`]),
					marriageStatus: fm[`spouse${i}_marriage_status`] as SpouseMetadata['marriageStatus'],
					divorceDate: fm[`spouse${i}_divorce_date`] as string | undefined
				});
			}
		}

		if (!hasIndexedSpouses) {
			if (fm.spouse) {
				const spouses = Array.isArray(fm.spouse) ? fm.spouse : [fm.spouse];
				for (const s of spouses) {
					const name = extractName(String(s));
					if (name) spouseNames.push(name);
				}
			}
			if (fm.spouse_id) {
				const ids = Array.isArray(fm.spouse_id) ? fm.spouse_id : [fm.spouse_id];
				for (const id of ids) {
					spouseIds.push(String(id));
				}
			}
		}

		// Extract children names/IDs
		const childNames: string[] = [];
		const childIds: string[] = [];
		if (fm.children) {
			const children = Array.isArray(fm.children) ? fm.children : [fm.children];
			for (const c of children) {
				const name = extractName(String(c));
				if (name) childNames.push(name);
			}
		}
		if (fm.children_id) {
			const ids = Array.isArray(fm.children_id) ? fm.children_id : [fm.children_id];
			for (const id of ids) {
				childIds.push(String(id));
			}
		}

		// Extract source IDs and names
		const sourceNames: string[] = [];
		const sourceIds: string[] = [];
		if (fm.sources) {
			const sources = Array.isArray(fm.sources) ? fm.sources : [fm.sources];
			for (const s of sources) {
				const name = extractName(String(s));
				if (name) sourceNames.push(name);
			}
		}
		if (fm.sources_id) {
			const ids = Array.isArray(fm.sources_id) ? fm.sources_id : [fm.sources_id];
			for (const id of ids) {
				sourceIds.push(String(id));
			}
		}

		// Extract gender-neutral parent names/IDs
		const parentNames: string[] = [];
		if (fm.parents) {
			const parents = Array.isArray(fm.parents) ? fm.parents : [fm.parents];
			for (const p of parents) {
				const name = extractName(String(p));
				if (name) parentNames.push(name);
			}
		}

		// Use cached graph services and universes to avoid expensive recomputation on every click
		const familyGraph = options.getCachedFamilyGraph();
		const placeGraph = options.getCachedPlaceGraph();
		const allUniverses = options.getCachedUniverses();

		const modal = new CreatePersonModal(app, {
			editFile: person.file,
			editPersonData: {
				crId: person.crId,
				name: person.name,
				personType: fm.personType,
				sex: fm.sex,
				gender: fm.gender,
				pronouns: fm.pronouns,
				// Name components (#174, #192)
				givenName: fm.given_name,
				surnames: Array.isArray(fm.surnames) ? fm.surnames : (fm.surnames ? [fm.surnames] : undefined),
				maidenName: fm.maiden_name,
				marriedNames: Array.isArray(fm.married_names) ? fm.married_names : (fm.married_names ? [fm.married_names] : undefined),
				// Other
				cr_living: typeof fm.cr_living === 'boolean' ? fm.cr_living : (fm.cr_living === 'true' ? true : (fm.cr_living === 'false' ? false : undefined)),
				born: person.birthDate,
				died: person.deathDate,
				birthPlace: person.birthPlace?.placeName,
				deathPlace: person.deathPlace?.placeName,
				birthPlaceId: fm.birth_place_id,
				birthPlaceName: person.birthPlace?.placeName,
				deathPlaceId: fm.death_place_id,
				deathPlaceName: person.deathPlace?.placeName,
				occupation: fm.occupation,
				researchLevel: typeof fm.research_level === 'number' ? fm.research_level : undefined,
				fatherId: typeof fatherId === 'string' ? fatherId : undefined,
				fatherName: fatherName,
				motherId: typeof motherId === 'string' ? motherId : undefined,
				motherName: motherName,
				spouseIds: spouseIds.length > 0 ? spouseIds : undefined,
				spouseNames: spouseNames.length > 0 ? spouseNames : undefined,
				spouseMetadata: spouseMetadata.length > 0 ? spouseMetadata : undefined,
				childIds: childIds.length > 0 ? childIds : undefined,
				childNames: childNames.length > 0 ? childNames : undefined,
				sourceIds: sourceIds.length > 0 ? sourceIds : undefined,
				sourceNames: sourceNames.length > 0 ? sourceNames : undefined,
				parentIds: Array.isArray(parentIds) ? parentIds : (parentIds ? [parentIds] : undefined),
				parentNames: parentNames.length > 0 ? parentNames : undefined,
				collection: fm.collection,
				universe: fm.universe,
				// DNA tracking fields
				dnaSharedCm: typeof fm.dna_shared_cm === 'number' ? fm.dna_shared_cm : undefined,
				dnaTestingCompany: fm.dna_testing_company,
				dnaKitId: fm.dna_kit_id,
				dnaMatchType: fm.dna_match_type,
				dnaEndogamyFlag: typeof fm.dna_endogamy_flag === 'boolean' ? fm.dna_endogamy_flag : undefined,
				dnaNotes: fm.dna_notes,
				// Fact-level source attributions (#512). Without this, every
				// Save round-trip would wipe sourced_* frontmatter properties
				// because the modal save path always writes sourcedFacts.
				sourcedFacts: extractSourcedFactsFromFrontmatter(fm as Record<string, unknown>)
			},
			familyGraph,
			placeGraph,
			settings: plugin.settings,
			propertyAliases: plugin.settings.propertyAliases,
			existingUniverses: allUniverses,
			plugin,
			onUpdated: () => {
				// Refresh the People tab and invalidate caches since data changed
				invalidateCaches();
				showTab('people');
			}
		});
		modal.open();
	});

	// Context menu for row
	row.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showPersonContextMenu(person, e, options);
	});
}

// ---------------------------------------------------------------------------
// Context menus
// ---------------------------------------------------------------------------

/**
 * Show menu for creating unlinked place notes
 */
function showUnlinkedPlacesMenu(
	unlinkedPlaces: { type: string; info: PlaceInfo }[],
	event: MouseEvent,
	options: PeopleTabOptions
): void {
	const menu = new Menu();

	for (const { type, info } of unlinkedPlaces) {
		menu.addItem((item) => {
			item
				.setTitle(`Create "${info.placeName}" (${type.toLowerCase()})`)
				.setIcon('map-pin')
				.onClick(() => {
					void options.showQuickCreatePlaceModal(info.placeName);
				});
		});
	}

	menu.showAtMouseEvent(event);
}

/**
 * Show context menu for a person list item
 */
function showPersonContextMenu(
	person: {
		crId: string;
		name: string;
		birthDate?: string;
		deathDate?: string;
		birthPlace?: PlaceInfo;
		deathPlace?: PlaceInfo;
		burialPlace?: PlaceInfo;
		file: TFile;
	},
	event: MouseEvent,
	options: PeopleTabOptions
): void {
	const { app, plugin, closeModal } = options;
	const menu = new Menu();
	const useSubmenu = Platform.isDesktop && !Platform.isMobile;

	// Open actions
	menu.addItem((item) => {
		item
			.setTitle('Open note')
			.setIcon('file')
			.onClick(async () => {
				await plugin.trackRecentFile(person.file, 'person');
				void app.workspace.getLeaf(false).openFile(person.file);
			});
	});

	menu.addItem((item) => {
		item
			.setTitle('Open in new tab')
			.setIcon('file-plus')
			.onClick(async () => {
				await plugin.trackRecentFile(person.file, 'person');
				void app.workspace.getLeaf('tab').openFile(person.file);
			});
	});

	menu.addItem((item) => {
		item
			.setTitle('Show in Family Chart')
			.setIcon('git-fork')
			.onClick(() => {
				closeModal();
				void plugin.activateFamilyChartView(person.crId);
			});
	});

	menu.addSeparator();

	// Events actions - submenu on desktop, flat on mobile
	if (useSubmenu) {
		menu.addItem((item) => {
			item
				.setTitle('Events')
				.setIcon('calendar');
			const submenu = item.setSubmenu();

			submenu.addItem((subitem) => {
				subitem
					.setTitle('Create event for this person')
					.setIcon('calendar-plus')
					.onClick(() => {
						const eventService = plugin.getEventService();
						if (eventService) {
							new CreateEventModal(
								app,
								eventService,
								plugin.settings,
								{
									plugin,
									initialPerson: { name: person.name, crId: person.crId, basename: person.file?.basename }
								}
							).open();
						}
					});
			});

			submenu.addItem((subitem) => {
				subitem
					.setTitle('Export timeline to Canvas')
					.setIcon('layout')
					.onClick(() => {
						void exportPersonTimeline(person, 'canvas', options);
					});
			});

			submenu.addItem((subitem) => {
				subitem
					.setTitle('Export timeline to Excalidraw')
					.setIcon('edit')
					.onClick(() => {
						void exportPersonTimeline(person, 'excalidraw', options);
					});
			});
		});
	} else {
		// Mobile: flat menu with descriptive titles
		menu.addItem((item) => {
			item
				.setTitle('Create event for this person')
				.setIcon('calendar-plus')
				.onClick(() => {
					const eventService = plugin.getEventService();
					if (eventService) {
						new CreateEventModal(
							app,
							eventService,
							plugin.settings,
							{
								plugin,
								initialPerson: { name: person.name, crId: person.crId, basename: person.file?.basename }
							}
						).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Export timeline to Canvas')
				.setIcon('layout')
				.onClick(() => {
					void exportPersonTimeline(person, 'canvas', options);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Export timeline to Excalidraw')
				.setIcon('edit')
				.onClick(() => {
					void exportPersonTimeline(person, 'excalidraw', options);
				});
		});
	}

	// Media actions - submenu on desktop, flat on mobile
	if (useSubmenu) {
		menu.addItem((item) => {
			item
				.setTitle('Media')
				.setIcon('image');
			const submenu = item.setSubmenu();

			submenu.addItem((subitem) => {
				subitem
					.setTitle('Link media...')
					.setIcon('image-plus')
					.onClick(() => {
						plugin.openLinkMediaModal(person.file, 'person', person.name);
					});
			});

			submenu.addItem((subitem) => {
				subitem
					.setTitle('Manage media...')
					.setIcon('images')
					.onClick(() => {
						plugin.openManageMediaModal(person.file, 'person', person.name);
					});
			});
		});
	} else {
		// Mobile: flat menu with descriptive titles
		menu.addItem((item) => {
			item
				.setTitle('Link media...')
				.setIcon('image-plus')
				.onClick(() => {
					plugin.openLinkMediaModal(person.file, 'person', person.name);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Manage media...')
				.setIcon('images')
				.onClick(() => {
					plugin.openManageMediaModal(person.file, 'person', person.name);
				});
		});
	}

	menu.showAtMouseEvent(event);
}

/**
 * Show a simple context menu for person links with open options
 */
function showPersonLinkContextMenu(file: TFile, event: MouseEvent, options: PeopleTabOptions): void {
	const { app, plugin } = options;
	const menu = new Menu();

	menu.addItem((item) => {
		item
			.setTitle('Open')
			.setIcon('file')
			.onClick(async () => {
				await plugin.trackRecentFile(file, 'person');
				void app.workspace.getLeaf(false).openFile(file);
			});
	});

	menu.addItem((item) => {
		item
			.setTitle('Open in new tab')
			.setIcon('file-plus')
			.onClick(async () => {
				await plugin.trackRecentFile(file, 'person');
				void app.workspace.getLeaf('tab').openFile(file);
			});
	});

	menu.addItem((item) => {
		item
			.setTitle('Open in new window')
			.setIcon('external-link')
			.onClick(async () => {
				await plugin.trackRecentFile(file, 'person');
				void app.workspace.getLeaf('window').openFile(file);
			});
	});

	menu.showAtMouseEvent(event);
}

// ---------------------------------------------------------------------------
// Timeline export
// ---------------------------------------------------------------------------

/**
 * Export a person's timeline to Canvas or Excalidraw
 */
async function exportPersonTimeline(
	person: {
		crId: string;
		name: string;
		file: TFile;
	},
	format: 'canvas' | 'excalidraw' = 'canvas',
	options: PeopleTabOptions
): Promise<void> {
	const { app, plugin } = options;
	const eventService = plugin.getEventService();
	if (!eventService) {
		new Notice('Event service not available');
		return;
	}

	const allEvents = eventService.getAllEvents();
	const personLink = `[[${person.name}]]`;

	// Filter events for this person
	const personEvents = allEvents.filter(e => {
		if (e.person) {
			const normalizedPerson = e.person.replace(/^\[\[/, '').replace(/\]\]$/, '').toLowerCase();
			return normalizedPerson === person.name.toLowerCase();
		}
		return false;
	});

	if (personEvents.length === 0) {
		new Notice(`No events found for ${person.name}`);
		return;
	}

	try {
		const { TimelineCanvasExporter } = await import('../events/services/timeline-canvas-exporter');
		const exporter = new TimelineCanvasExporter(app, plugin.settings);

		const result = await exporter.exportToCanvas(allEvents, {
			title: `${person.name} Timeline`,
			filterPerson: personLink,
			layoutStyle: 'horizontal',
			colorScheme: 'event_type',
			includeOrderingEdges: true
		});

		if (result.success && result.path) {
			if (format === 'excalidraw') {
				// Convert to Excalidraw
				const { ExcalidrawExporter } = await import('../excalidraw/excalidraw-exporter');
				const excalidrawExporter = new ExcalidrawExporter(app);

				const canvasFile = app.vault.getAbstractFileByPath(result.path);
				if (!(canvasFile instanceof TFile)) {
					throw new Error('Canvas file not found after export');
				}

				const excalidrawResult = await excalidrawExporter.exportToExcalidraw({
					canvasFile,
					fileName: result.path.replace('.canvas', '').split('/').pop(),
					preserveColors: true
				});

				if (excalidrawResult.success && excalidrawResult.excalidrawContent) {
					const excalidrawPath = result.path.replace('.canvas', '.excalidraw.md');
					await app.vault.create(excalidrawPath, excalidrawResult.excalidrawContent);
					new Notice(`Timeline exported to ${excalidrawPath}`);
					const file = app.vault.getAbstractFileByPath(excalidrawPath);
					if (file instanceof TFile) {
						void app.workspace.getLeaf(false).openFile(file);
					}
				} else {
					new Notice(`Excalidraw export failed: ${excalidrawResult.errors?.join(', ') || 'Unknown error'}`);
				}
			} else {
				new Notice(`Timeline exported to ${result.path}`);
				const file = app.vault.getAbstractFileByPath(result.path);
				if (file instanceof TFile) {
					void app.workspace.getLeaf(false).openFile(file);
				}
			}
		} else {
			new Notice(`Export failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Export failed: ${message}`);
	}
}

// ---------------------------------------------------------------------------
// Timeline and coverage badges
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Research coverage details
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Match scope of file-level disable at top. */
