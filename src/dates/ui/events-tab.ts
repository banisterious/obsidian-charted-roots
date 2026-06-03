/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Events Tab UI Component
 *
 * Renders the Events tab in the Control Center, showing
 * event notes management, date systems configuration, and temporal data statistics.
 */

import { App, EventRef, Menu, Modal, Notice, Setting, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { createLucideIcon } from '../../ui/lucide-icons';
import { getContrastColor } from '../../ui/create-person-types';
import { CreateEventModal } from '../../events/ui/create-event-modal';
import type { EventNote } from '../../events/types/event-types';
import { getEventType, getAllEventTypes } from '../../events/types/event-types';
import { TimelineCanvasExporter, TimelineColorScheme, TimelineLayoutStyle } from '../../events/services/timeline-canvas-exporter';
import { TimelineMarkdownExporter, TimelineExportFormat } from '../../events/services/timeline-markdown-exporter';
import { computeSortOrder } from '../../events/services/sort-order-service';
import { renderEventTypeManagerCard } from '../../events/ui/event-type-manager-card';
import { isEventNote } from '../../utils/note-type-detection';
import { extractDisplayLabel } from '../../utils/wikilink-resolver';
import { toSafeFilename } from '../../core/canvas-utils';
import { timelineExportTitle } from '../services/timeline-export-naming';
import { TemplateSnippetsModal } from '../../ui/template-snippets-modal';
import { calculateDateStatistics } from '../services/date-statistics';
import { openManageMediaModal } from '../../plugin/context-menu-helpers';

/* ──────────────────────────────────────────────────────────────────────────
   Types for the dockable Events list (renderEventsList)
   ────────────────────────────────────────────────────────────────────────── */

export interface EventsListOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	initialTypeFilter?: string;
	initialPersonFilter?: string;
	initialUniverseFilter?: string;
	initialPlaceFilter?: string;
	initialDateFrom?: number | null;
	initialDateTo?: number | null;
	initialSearch?: string;
	onStateChange?: (state: TimelineFilterState) => void;
}

/* ──────────────────────────────────────────────────────────────────────────
   Shared timeline-filter helpers (used by both the Control Center modal
   Timeline card and the dockable Events sidebar). Centralizing the filter
   state shape + predicate keeps the two implementations in sync; each new
   filter dimension adds one field here and is honored everywhere.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Sentinel value for the universe filter representing "events with no
 * universe field set" (real-world events).
 */
export const UNIVERSE_FILTER_REAL = '__real__';
/**
 * Sentinel value for the universe filter representing "events with any
 * universe field set" (any fictional vault).
 */
export const UNIVERSE_FILTER_ANY_FICTIONAL = '__fictional__';

/** Filter state for the timeline event list. */
export interface TimelineFilterState {
	/** Event type id; empty string means "all types". */
	type: string;
	/** Person wikilink (or substring); empty string means "all people". */
	person: string;
	/** Universe name, `UNIVERSE_FILTER_REAL`, `UNIVERSE_FILTER_ANY_FICTIONAL`, or empty for "all". */
	universe: string;
	/** Place wikilink; empty string means "all places". */
	place: string;
	/** Lower-bound year (inclusive). `null` means no lower bound. */
	dateFrom: number | null;
	/** Upper-bound year (inclusive). `null` means no upper bound. */
	dateTo: number | null;
	/** Free-text search across title/date/place/description; lowercased before matching. */
	search: string;
}

/**
 * Strip wikilink brackets from a string. Used to normalize person/place
 * wikilink values before substring matching against filter input.
 */
function stripWikilink(value: string): string {
	return value.replace(/^\[\[/, '').replace(/\]\]$/, '');
}

/**
 * Apply the timeline filter state to a list of events. Returns the subset
 * that passes every active filter. Empty filter fields are skipped (no
 * narrowing). Shared by both the Control Center modal Timeline card and
 * the dockable Events sidebar (#515).
 */
export function applyTimelineFilters(events: EventNote[], state: TimelineFilterState): EventNote[] {
	const personNeedle = state.person ? stripWikilink(state.person).toLowerCase() : '';
	const placeNeedle = state.place ? stripWikilink(state.place).toLowerCase() : '';
	const search = state.search.toLowerCase();
	const dateBounded = state.dateFrom !== null || state.dateTo !== null;

	return events.filter(event => {
		if (state.type && event.eventType !== state.type) return false;

		if (personNeedle) {
			const singlePerson = event.person ? stripWikilink(event.person).toLowerCase() : '';
			const multiplePeople = event.persons?.map(p => stripWikilink(p).toLowerCase()) || [];
			if (!singlePerson.includes(personNeedle) && !multiplePeople.some(p => p.includes(personNeedle))) {
				return false;
			}
		}

		if (state.universe) {
			if (state.universe === UNIVERSE_FILTER_REAL) {
				if (event.universe) return false;
			} else if (state.universe === UNIVERSE_FILTER_ANY_FICTIONAL) {
				if (!event.universe) return false;
			} else if (event.universe !== state.universe) {
				return false;
			}
		}

		if (placeNeedle) {
			const eventPlace = event.place ? stripWikilink(event.place).toLowerCase() : '';
			if (!eventPlace.includes(placeNeedle)) return false;
		}

		if (dateBounded) {
			// Events with no date pass only when both bounds are absent (already
			// excluded by `dateBounded`). With at least one bound active, an
			// undated event is filtered out.
			const year = event.date ? extractYear(event.date) : null;
			if (year === null) return false;
			if (state.dateFrom !== null && year < state.dateFrom) return false;
			if (state.dateTo !== null && year > state.dateTo) return false;
		}

		if (search) {
			const searchableText = [
				event.title,
				event.date || '',
				event.place || '',
				event.description || ''
			].join(' ').toLowerCase();
			if (!searchableText.includes(search)) return false;
		}

		return true;
	});
}

/**
 * Render the Events tab content
 */
export function renderEventsTab(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement,
	showTab: (tabId: string) => void,
	closeModal: () => void
): void {
	// Event Notes card (create and manage events)
	renderEventNotesCard(container, plugin, createCard);

	// Timeline card (event list with filtering)
	renderTimelineCard(container, plugin, createCard, showTab);

	// Export card (export timeline to Canvas/Excalidraw)
	renderExportCard(container, plugin, createCard);

	// Event Type Manager card (customize, hide, create event types)
	renderEventTypeManagerCard(container, plugin, createCard, () => {
		// Refresh the tab content when types change
		container.empty();
		renderEventsTab(container, plugin, createCard, showTab, closeModal);
	});

	// Statistics card
	renderStatisticsCard(container, plugin, createCard, closeModal);
}

/**
 * Render the Actions card with create button and event statistics
 */
function renderEventNotesCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement
): void {
	const card = createCard({
		title: 'Actions',
		icon: 'plus',
		subtitle: 'Create and manage life events for your people'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Create Event button
	new Setting(content)
		.setName('Create event note')
		.setDesc('Create a new event to document a life event')
		.addButton(button => button
			.setButtonText('Create')
			.setCta()
			.onClick(() => {
				const eventService = plugin.getEventService();
				if (eventService) {
					const modal = new CreateEventModal(
						plugin.app,
						eventService,
						plugin.settings,
						{ plugin }
					);
					modal.open();
				}
			}));

	// Create Events base button
	new Setting(content)
		.setName('Create Events base')
		.setDesc('Create an Obsidian base for managing Event notes. After creating, click "Properties" to enable columns like Title, Type, Date, Person, Place, and Confidence.')
		.addButton(button => button
			.setButtonText('Create')
			.onClick(() => {
				plugin.app.commands.executeCommandById('charted-roots:create-events-base-template');
			}));

	// Calendar view button
	new Setting(content)
		.setName('Open calendar view')
		.setDesc('View significant dates on a monthly calendar')
		.addButton(button => button
			.setButtonText('Calendar')
			.onClick(() => {
				void plugin.activateCalendarView();
			}));

	// Fictional date systems button (#358)
	new Setting(content)
		.setName('Fictional date systems')
		.setDesc('Manage custom calendars for worldbuilding')
		.addButton(button => button
			.setButtonText('Open settings')
			.onClick(() => {
				// @ts-expect-error - Obsidian internal API
				plugin.app.setting.open();
				// @ts-expect-error - Obsidian internal API
				plugin.app.setting.openTabById('charted-roots');
				// Delay to allow settings tab to render, then expand the dates section
				window.setTimeout(() => {
					const datesSection = activeDocument.querySelector('.cr-settings-section[data-section-name="dates"]') as HTMLDetailsElement;
					if (datesSection) datesSection.open = true;
				}, 200);
			}));

	// Templater templates button
	new Setting(content)
		.setName('Templater templates')
		.setDesc('Copy ready-to-use templates for Templater integration')
		.addButton(button => button
			.setButtonText('View templates')
			.onClick(() => {
				new TemplateSnippetsModal(plugin.app, 'event', plugin.settings.propertyAliases).open();
			}));

	// Compute sort order button
	let computeBtn: HTMLButtonElement;
	new Setting(content)
		.setName('Compute sort order')
		.setDesc('Calculate sort_order values from before/after relationships')
		.addButton(button => {
			computeBtn = button.buttonEl;
			button.setButtonText('Compute')
				.onClick(async () => {
					const eventService = plugin.getEventService();
					if (!eventService) return;

					computeBtn.disabled = true;
					computeBtn.textContent = 'Computing...';

					try {
						const events = eventService.getAllEvents();
						const result = await computeSortOrder(plugin.app, events, plugin.getDateService());

						if (result.errors.length > 0) {
							new Notice(`Computed sort order with ${result.errors.length} errors. Check console.`);
						} else if (result.cycleEvents.length > 0) {
							new Notice(`Updated ${result.updatedCount} events. ${result.cycleEvents.length} events in cycles couldn't be ordered.`);
						} else {
							new Notice(`Successfully computed sort order for ${result.updatedCount} events.`);
						}

						// Invalidate cache to reload events
						eventService.invalidateCache();
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						new Notice(`Failed to compute sort order: ${message}`);
					} finally {
						computeBtn.disabled = false;
						computeBtn.textContent = 'Compute';
					}
				});
		});

	// Event statistics
	const stats = calculateEventStatistics(plugin);

	if (stats.totalEvents > 0) {
		const statsSection = content.createDiv({ cls: 'cr-stats-section crc-mt-3' });
		statsSection.createEl('h4', { text: 'Event statistics', cls: 'cr-subsection-heading' });

		const statsList = statsSection.createEl('ul', { cls: 'cr-stats-list' });

		// Total events
		const totalItem = statsList.createEl('li');
		totalItem.setText(`${stats.totalEvents} event notes in vault`);

		// By category breakdown
		if (stats.byCategory.core > 0 || stats.byCategory.extended > 0 || stats.byCategory.narrative > 0) {
			const categoryItem = statsList.createEl('li');
			const parts: string[] = [];
			if (stats.byCategory.core > 0) parts.push(`${stats.byCategory.core} core`);
			if (stats.byCategory.extended > 0) parts.push(`${stats.byCategory.extended} extended`);
			if (stats.byCategory.narrative > 0) parts.push(`${stats.byCategory.narrative} narrative`);
			if (stats.byCategory.custom > 0) parts.push(`${stats.byCategory.custom} custom`);
			categoryItem.setText(`By category: ${parts.join(', ')}`);
		}

		// Events with dates
		if (stats.totalEvents > 0) {
			const datedItem = statsList.createEl('li');
			const datedPercent = Math.round((stats.withDates / stats.totalEvents) * 100);
			datedItem.setText(`${stats.withDates} events have dates (${datedPercent}%)`);
		}
	} else {
		// Empty state
		const emptyState = content.createDiv({ cls: 'crc-empty-state crc-mt-3' });
		emptyState.createEl('p', {
			text: 'No event notes found.',
			cls: 'crc-text-muted'
		});
		emptyState.createEl('p', {
			text: 'Create event notes to document life events like births, deaths, marriages, and more.',
			cls: 'crc-text-muted'
		});
	}

	container.appendChild(card);
}

/**
 * Add a dock button to a card header that opens the events view
 * in the right sidebar.
 */
function addEventsDockButton(card: HTMLElement, plugin: CanvasRootsPlugin): void {
	const header = card.querySelector('.crc-card__header');
	if (!header) return;

	const dockBtn = activeDocument.createElement('button');
	dockBtn.className = 'crc-card__dock-btn clickable-icon';
	dockBtn.setAttribute('aria-label', 'Open in sidebar');
	setIcon(dockBtn, 'panel-right');
	dockBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void plugin.activateEventsView();
	});
	header.appendChild(dockBtn);
}

/**
 * Render the Timeline card with event list, filtering, and gap analysis
 */
function renderTimelineCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement,
	_showTab: (tabId: string) => void
): void {
	const eventService = plugin.getEventService();
	if (!eventService) return;

	const card = createCard({
		title: 'Timeline',
		icon: 'clock',
		subtitle: 'All events in chronological order'
	});

	addEventsDockButton(card, plugin);

	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Get all events
	const allEvents = eventService.getAllEvents();

	if (allEvents.length === 0) {
		const emptyState = content.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No events yet.',
			cls: 'crc-text-muted'
		});
		emptyState.createEl('p', {
			text: 'Create event notes to see them in the timeline.',
			cls: 'crc-text-muted'
		});
		container.appendChild(card);
		return;
	}

	// Filter controls
	const filterRow = content.createDiv({ cls: 'crc-timeline-filters' });

	// Event type filter
	const typeFilter = filterRow.createEl('select', { cls: 'dropdown' });
	typeFilter.createEl('option', { value: '', text: 'All types' });

	const eventTypes = getAllEventTypes(
		plugin.settings.customEventTypes || [],
		plugin.settings.showBuiltInEventTypes !== false,
		plugin.settings.eventTypeCustomizations,
		plugin.settings.hiddenEventTypes
	);
	for (const type of eventTypes) {
		typeFilter.createEl('option', { value: type.id, text: type.name });
	}

	// Person filter
	const personFilter = filterRow.createEl('select', { cls: 'dropdown' });
	personFilter.createEl('option', { value: '', text: 'All people' });

	const uniquePeople = eventService.getUniquePeople();
	for (const person of uniquePeople) {
		// Strip wikilink brackets for display
		const displayName = extractDisplayLabel(person);
		personFilter.createEl('option', { value: person, text: displayName });
	}

	// Search input
	const searchInput = filterRow.createEl('input', {
		cls: 'crc-timeline-search',
		attr: {
			type: 'text',
			placeholder: 'Search events...'
		}
	});

	// More-filters disclosure (#515): render universe/place/date-range
	// controls in a collapsible section between the primary filter row
	// and the table so the row stays compact on narrow widths. Modal
	// version doesn't persist filter state, so the disclosure always
	// starts collapsed.
	const moreFiltersToggle = filterRow.createEl('button', {
		cls: 'crc-timeline-more-filters-toggle clickable-icon',
		attr: { 'aria-expanded': 'false', 'aria-label': 'Toggle more filters' }
	});
	setIcon(moreFiltersToggle, 'sliders-horizontal');
	moreFiltersToggle.createSpan({ text: ' More filters', cls: 'crc-timeline-more-filters-label' });

	const moreFiltersRow = content.createDiv({ cls: 'crc-timeline-more-filters crc-timeline-more-filters--collapsed' });

	// Universe filter: enumerate from event.universe values rather than
	// from universe notes, so events tagged with a universe name surface
	// in the dropdown even before the user creates a dedicated universe
	// note.
	const universeFilter = moreFiltersRow.createEl('select', { cls: 'dropdown' });
	universeFilter.createEl('option', { value: '', text: '(any)' });
	universeFilter.createEl('option', { value: UNIVERSE_FILTER_REAL, text: '(real-world)' });
	universeFilter.createEl('option', { value: UNIVERSE_FILTER_ANY_FICTIONAL, text: '(any fictional)' });
	const universeNames = new Set<string>();
	for (const e of allEvents) {
		if (e.universe) universeNames.add(e.universe);
	}
	for (const name of Array.from(universeNames).sort((a, b) => a.localeCompare(b))) {
		universeFilter.createEl('option', { value: name, text: name });
	}

	// Place filter
	const placeFilter = moreFiltersRow.createEl('select', { cls: 'dropdown' });
	placeFilter.createEl('option', { value: '', text: 'All places' });
	for (const place of eventService.getUniquePlaces()) {
		placeFilter.createEl('option', { value: place, text: stripWikilink(place) });
	}

	// Date range inputs
	const dateFromInput = moreFiltersRow.createEl('input', {
		cls: 'crc-timeline-date-input',
		attr: { type: 'number', placeholder: 'From year' }
	});
	const dateToInput = moreFiltersRow.createEl('input', {
		cls: 'crc-timeline-date-input',
		attr: { type: 'number', placeholder: 'To year' }
	});

	moreFiltersToggle.addEventListener('click', () => {
		const isCollapsed = moreFiltersRow.classList.toggle('crc-timeline-more-filters--collapsed');
		moreFiltersToggle.setAttribute('aria-expanded', String(!isCollapsed));
	});

	// Event table container
	const tableContainer = content.createDiv({ cls: 'crc-timeline-table-container' });

	// Render initial table
	let filteredEvents = sortEventsChronologically([...allEvents]);
	renderEventTable(tableContainer, filteredEvents, plugin);

	// Filter handler
	const applyFilters = () => {
		filteredEvents = applyTimelineFilters(allEvents, {
			type: typeFilter.value,
			person: personFilter.value,
			universe: universeFilter.value,
			place: placeFilter.value,
			dateFrom: dateFromInput.value ? parseInt(dateFromInput.value, 10) : null,
			dateTo: dateToInput.value ? parseInt(dateToInput.value, 10) : null,
			search: searchInput.value
		});
		filteredEvents = sortEventsChronologically(filteredEvents);
		renderEventTable(tableContainer, filteredEvents, plugin);
	};

	typeFilter.addEventListener('change', applyFilters);
	personFilter.addEventListener('change', applyFilters);
	universeFilter.addEventListener('change', applyFilters);
	placeFilter.addEventListener('change', applyFilters);
	dateFromInput.addEventListener('input', applyFilters);
	dateToInput.addEventListener('input', applyFilters);
	searchInput.addEventListener('input', applyFilters);

	// Timeline gap analysis section
	renderTimelineGaps(content, allEvents, plugin);

	container.appendChild(card);
}

/**
 * Sort events chronologically
 */
function sortEventsChronologically(events: EventNote[]): EventNote[] {
	return events.sort((a, b) => {
		// Events with sortOrder use that first
		if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
			return a.sortOrder - b.sortOrder;
		}
		if (a.sortOrder !== undefined) return -1;
		if (b.sortOrder !== undefined) return 1;

		// Then sort by date
		if (a.date && b.date) {
			return a.date.localeCompare(b.date);
		}
		if (a.date) return -1;
		if (b.date) return 1;

		// Finally sort by title
		return a.title.localeCompare(b.title);
	});
}

/**
 * Render event table
 */
function renderEventTable(
	container: HTMLElement,
	events: EventNote[],
	plugin: CanvasRootsPlugin
): void {
	container.empty();

	if (events.length === 0) {
		container.createEl('p', {
			text: 'No matching events.',
			cls: 'crc-text-muted crc-text-center'
		});
		return;
	}

	// Hint text above table
	const hint = container.createEl('p', { cls: 'crc-text-muted crc-text-small crc-mb-2' });
	hint.appendText('Click a row to edit. ');
	const fileIconHint = createLucideIcon('file-text', 12);
	fileIconHint.addClass('crc-icon-inline');
	hint.appendChild(fileIconHint);
	hint.appendText(' opens the note.');

	const table = container.createEl('table', { cls: 'crc-timeline-table' });

	// Header
	const thead = table.createEl('thead');
	const headerRow = thead.createEl('tr');
	headerRow.createEl('th', { text: 'Date' });
	headerRow.createEl('th', { text: 'Event' });
	headerRow.createEl('th', { text: 'Type' });
	headerRow.createEl('th', { text: 'Person' });
	headerRow.createEl('th', { text: 'Place' });
	headerRow.createEl('th', { text: 'Media', cls: 'crc-timeline-th--center' });
	headerRow.createEl('th', { text: '', cls: 'crc-timeline-th--actions' });

	// Body
	const tbody = table.createEl('tbody');

	const eventService = plugin.getEventService();

	for (const event of events) {
		const row = tbody.createEl('tr', { cls: 'crc-timeline-row' });

		// Click row to open edit modal
		row.addEventListener('click', () => {
			if (eventService) {
				const modal = new CreateEventModal(
					plugin.app,
					eventService,
					plugin.settings,
					{
						plugin,
						editEvent: event,
						editFile: event.file,
						onUpdated: () => {
							// Refresh the table
							renderEventTable(container, events, plugin);
						}
					}
				);
				modal.open();
			}
		});

		// Context menu
		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const menu = new Menu();

			menu.addItem((item) => {
				item
					.setTitle('Open note')
					.setIcon('file')
					.onClick(async () => {
						await plugin.trackRecentFile(event.file, 'event');
						void plugin.app.workspace.getLeaf(false).openFile(event.file);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Open in new tab')
					.setIcon('file-plus')
					.onClick(async () => {
						await plugin.trackRecentFile(event.file, 'event');
						void plugin.app.workspace.getLeaf('tab').openFile(event.file);
					});
			});

			menu.addSeparator();

			// Media actions
			const mediaCount = event.media?.length || 0;
			menu.addItem((item) => {
				item
					.setTitle('Link media...')
					.setIcon('image-plus')
					.onClick(() => {
						plugin.openLinkMediaModal(event.file, 'event', event.title);
					});
			});

			if (mediaCount > 0) {
				menu.addItem((item) => {
					item
						.setTitle(`Manage media (${mediaCount})...`)
						.setIcon('images')
						.onClick(() => {
							openManageMediaModal(plugin, event.file, 'event', event.title);
						});
				});
			}

			menu.addSeparator();

			menu.addItem((item) => {
				item
					.setTitle('Delete event')
					.setIcon('trash')
					.onClick(async () => {
						const confirmed = await confirmDeleteEvent(plugin.app, event.title);
						if (confirmed) {
							await plugin.app.fileManager.trashFile(event.file);
							new Notice(`Deleted event: ${event.title}`);
						}
					});
			});

			menu.showAtMouseEvent(e);
		});

		// Date cell
		const dateCell = row.createEl('td', { cls: 'crc-timeline-cell-date' });
		if (event.date) {
			dateCell.textContent = event.date;
			if (event.dateEnd) {
				dateCell.textContent += ` – ${event.dateEnd}`;
			}
		} else {
			dateCell.createEl('span', { text: 'Unknown', cls: 'crc-text-muted' });
		}

		// Event title cell
		const titleCell = row.createEl('td', { cls: 'crc-timeline-cell-title' });
		titleCell.textContent = event.title;

		// Type cell with badge
		const typeCell = row.createEl('td', { cls: 'crc-timeline-cell-type' });
		const typeDef = getEventType(
			event.eventType,
			plugin.settings.customEventTypes || [],
			plugin.settings.showBuiltInEventTypes !== false,
			plugin.settings.eventTypeCustomizations
		);
		if (typeDef) {
			const badge = typeCell.createEl('span', { cls: 'crc-event-type-badge' });
			badge.style.setProperty('background-color', typeDef.color);
			badge.style.setProperty('color', getContrastColor(typeDef.color));
			const icon = createLucideIcon(typeDef.icon, 12);
			badge.appendChild(icon);
			badge.appendText(` ${typeDef.name}`);
		} else {
			typeCell.textContent = event.eventType;
		}

		// Person cell
		const personCell = row.createEl('td', { cls: 'crc-timeline-cell-person' });
		// Collect all people (from both person and persons fields), deduplicated
		const personSet = new Set<string>();
		if (event.person) {
			personSet.add(extractDisplayLabel(event.person));
		}
		if (event.persons && event.persons.length > 0) {
			for (const p of event.persons) {
				personSet.add(extractDisplayLabel(p));
			}
		}
		const allPeople = Array.from(personSet);

		if (allPeople.length > 0) {
			personCell.textContent = allPeople.join(', ');
		} else {
			personCell.createEl('span', { text: '—', cls: 'crc-text-muted' });
		}

		// Place cell
		const placeCell = row.createEl('td', { cls: 'crc-timeline-cell-place' });
		if (event.place) {
			placeCell.textContent = extractDisplayLabel(event.place);
		} else {
			placeCell.createEl('span', { text: '—', cls: 'crc-text-muted' });
		}

		// Media cell
		const mediaCell = row.createEl('td', { cls: 'crc-timeline-cell-media' });
		const mediaCount = event.media?.length || 0;
		if (mediaCount > 0) {
			const mediaBadge = mediaCell.createEl('span', {
				cls: 'crc-person-list-badge crc-person-list-badge--media',
				attr: { title: `${mediaCount} media file${mediaCount !== 1 ? 's' : ''}` }
			});
			const mediaIcon = createLucideIcon('image', 12);
			mediaBadge.appendChild(mediaIcon);
			mediaBadge.appendText(mediaCount.toString());

			// Click to open manage media modal
			mediaBadge.addEventListener('click', (e) => {
				e.stopPropagation();
				openManageMediaModal(plugin, event.file, 'event', event.title);
			});
		} else {
			mediaCell.createEl('span', { text: '—', cls: 'crc-text-muted' });
		}

		// Actions cell with open note button
		const actionsCell = row.createEl('td', { cls: 'crc-timeline-cell-actions' });
		const openBtn = actionsCell.createEl('button', {
			cls: 'crc-timeline-open-btn clickable-icon',
			attr: { 'aria-label': 'Open note' }
		});
		const fileIcon = createLucideIcon('file-text', 14);
		openBtn.appendChild(fileIcon);
		openBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			void (async () => {
				await plugin.trackRecentFile(event.file, 'event');
				void plugin.app.workspace.getLeaf(false).openFile(event.file);
			})();
		});
	}

	// Show count
	container.createEl('p', {
		text: `Showing ${events.length} event${events.length !== 1 ? 's' : ''}`,
		cls: 'crc-text-muted crc-text-small crc-mt-2'
	});
}

/**
 * Render timeline gap analysis
 */
function renderTimelineGaps(
	container: HTMLElement,
	events: EventNote[],
	_plugin: CanvasRootsPlugin
): void {
	// Only analyze if we have dated events
	const datedEvents = events.filter(e => e.date).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

	if (datedEvents.length < 2) return;

	// Find gaps (periods with no events)
	const gaps: { start: string; end: string; years: number }[] = [];
	const GAP_THRESHOLD_YEARS = 5; // Consider gaps of 5+ years

	for (let i = 0; i < datedEvents.length - 1; i++) {
		const current = datedEvents[i];
		const next = datedEvents[i + 1];

		if (!current.date || !next.date) continue;

		// Extract years from dates
		const currentYear = extractYear(current.date);
		const nextYear = extractYear(next.date);

		if (currentYear && nextYear) {
			const yearGap = nextYear - currentYear;
			if (yearGap >= GAP_THRESHOLD_YEARS) {
				gaps.push({
					start: current.date,
					end: next.date,
					years: yearGap
				});
			}
		}
	}

	// Count unsourced events
	const unsourcedCount = events.filter(e => !e.sources || e.sources.length === 0).length;

	// Count orphan events (no person linked)
	const orphanCount = events.filter(e => !e.person && (!e.persons || e.persons.length === 0)).length;

	// Only show section if there are issues
	if (gaps.length === 0 && unsourcedCount === 0 && orphanCount === 0) return;

	const section = container.createDiv({ cls: 'crc-timeline-gaps crc-mt-4' });
	section.createEl('h4', { text: 'Data quality insights', cls: 'cr-subsection-heading' });

	const issuesList = section.createEl('ul', { cls: 'crc-timeline-gaps-list' });

	// Timeline gaps
	if (gaps.length > 0) {
		const gapItem = issuesList.createEl('li', { cls: 'crc-timeline-gap-item crc-timeline-gap-item--warning' });
		const icon = createLucideIcon('alert-triangle', 14);
		gapItem.appendChild(icon);

		if (gaps.length === 1) {
			gapItem.appendText(` Timeline gap detected: ${gaps[0].years} years (${gaps[0].start} – ${gaps[0].end})`);
		} else {
			gapItem.appendText(` ${gaps.length} timeline gaps detected (${GAP_THRESHOLD_YEARS}+ year periods with no events)`);

			// Show first few gaps
			const gapDetails = issuesList.createEl('ul', { cls: 'crc-timeline-gap-details' });
			for (const gap of gaps.slice(0, 3)) {
				gapDetails.createEl('li', { text: `${gap.years} years: ${gap.start} – ${gap.end}` });
			}
			if (gaps.length > 3) {
				gapDetails.createEl('li', { text: `...and ${gaps.length - 3} more`, cls: 'crc-text-muted' });
			}
		}
	}

	// Unsourced events
	if (unsourcedCount > 0) {
		const unsourcedItem = issuesList.createEl('li', { cls: 'crc-timeline-gap-item crc-timeline-gap-item--info' });
		const icon = createLucideIcon('info', 14);
		unsourcedItem.appendChild(icon);
		unsourcedItem.appendText(` ${unsourcedCount} event${unsourcedCount !== 1 ? 's' : ''} without source citations`);
	}

	// Orphan events
	if (orphanCount > 0) {
		const orphanItem = issuesList.createEl('li', { cls: 'crc-timeline-gap-item crc-timeline-gap-item--info' });
		const icon = createLucideIcon('user-minus', 14);
		orphanItem.appendChild(icon);
		orphanItem.appendText(` ${orphanCount} event${orphanCount !== 1 ? 's' : ''} not linked to any person`);
	}
}

/**
 * Extract year from a date string
 */
function extractYear(dateStr: string): number | null {
	// Try ISO format first (YYYY-MM-DD or YYYY)
	const isoMatch = dateStr.match(/^(\d{4})/);
	if (isoMatch) {
		return parseInt(isoMatch[1], 10);
	}

	// Try any 4-digit number
	const yearMatch = dateStr.match(/\d{4}/);
	if (yearMatch) {
		return parseInt(yearMatch[0], 10);
	}

	return null;
}

/** Export format types */
type ExportFormat = 'canvas' | 'excalidraw' | 'markdown';

/**
 * Render the unified Export timeline card with format selector
 */
function renderExportCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement
): void {
	const eventService = plugin.getEventService();
	if (!eventService) return;

	const allEvents = eventService.getAllEvents();

	// Check if Excalidraw is available
	const excalidrawAvailable = (plugin.app as unknown as { plugins: { enabledPlugins: Set<string> } }).plugins?.enabledPlugins?.has('obsidian-excalidraw-plugin') ?? false;

	const card = createCard({
		title: 'Export timeline',
		icon: 'download',
		subtitle: 'Export events to Canvas, Excalidraw, or Markdown'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Deprecation notice - direct users to Reports
	const deprecationNotice = content.createDiv({ cls: 'crc-deprecation-notice' });
	const noticeIcon = createLucideIcon('info', 16);
	deprecationNotice.appendChild(noticeIcon);
	const noticeText = deprecationNotice.createSpan();
	noticeText.appendText('Timeline exports are moving to ');
	noticeText.createEl('strong', { text: 'Statistics & Reports → Reports → Timeline' });
	noticeText.appendText(' for a unified experience with all formats and options.');
	const openReportsLink = deprecationNotice.createEl('a', {
		text: 'Open Reports',
		cls: 'crc-deprecation-notice__link'
	});
	openReportsLink.addEventListener('click', (e) => {
		e.preventDefault();
		// Navigate to Reports tab in Control Center
		const controlCenter = activeDocument.querySelector('.canvas-roots-control-center');
		if (controlCenter) {
			const reportsTab = controlCenter.querySelector('[data-tab-id="reports"]') as HTMLElement;
			if (reportsTab) {
				reportsTab.click();
			}
		}
	});

	if (allEvents.length === 0) {
		const emptyState = content.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No events to export.',
			cls: 'crc-text-muted'
		});
		container.appendChild(card);
		return;
	}

	// State variables
	let exportFormat: ExportFormat = 'canvas';
	let titleValue = 'Event Timeline';
	let layoutValue: TimelineLayoutStyle = 'horizontal';
	let colorValue: TimelineColorScheme = 'event_type';
	let personValue = '';
	let typeValue = '';
	let groupValue = '';
	let includeEdges = true;
	let groupByPerson = false;
	let markdownFormat: TimelineExportFormat = 'callout';

	// Excalidraw-specific options
	let excalidrawRoughness = 1; // 0=architect, 1=artist, 2=cartoonist
	let excalidrawFontFamily: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1; // 1=Virgil, 2=Helvetica, 3=Cascadia, 4=Comic Shanns, 5=Excalifont, 6=Nunito, 7=Lilita One
	let excalidrawFillStyle: 'solid' | 'hachure' | 'cross-hatch' = 'solid';
	let excalidrawStrokeStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
	let excalidrawStrokeWidth = 2;
	let excalidrawFontSize = 16;

	// Format selector (always visible at top)
	const formatDescriptions: Record<ExportFormat, string> = {
		canvas: 'Native Obsidian canvas with linked nodes',
		excalidraw: excalidrawAvailable
			? 'Hand-drawn style diagrams (Excalidraw)'
			: 'Requires Excalidraw plugin',
		markdown: 'Text-based formats (callout, table, list, dataview)'
	};

	const formatSetting = new Setting(content)
		.setName('Export format')
		.setDesc(formatDescriptions[exportFormat])
		.addDropdown(dropdown => {
			dropdown
				.addOption('canvas', 'Canvas')
				.addOption('excalidraw', 'Excalidraw')
				.addOption('markdown', 'Markdown')
				.setValue(exportFormat)
				.onChange(value => {
					exportFormat = value as ExportFormat;
					formatSetting.setDesc(formatDescriptions[exportFormat]);
					updateVisibleOptions();
					updateExportButton();
				});
		});

	// Title (always visible)
	new Setting(content)
		.setName('Title')
		.setDesc('Name for the exported file')
		.addText(text => text
			.setPlaceholder('Event timeline')
			.setValue(titleValue)
			.onChange(value => { titleValue = value; }));

	// Container for format-specific options
	const formatOptionsContainer = content.createDiv({ cls: 'crc-export-format-options' });

	// --- Canvas/Excalidraw options section ---
	const canvasOptionsSection = formatOptionsContainer.createDiv({ cls: 'crc-export-section crc-export-section--canvas' });

	// Layout style
	new Setting(canvasOptionsSection)
		.setName('Layout')
		.setDesc('How events are arranged')
		.addDropdown(dropdown => dropdown
			.addOption('horizontal', 'Horizontal (left to right)')
			.addOption('vertical', 'Vertical (top to bottom)')
			.addOption('gantt', 'Gantt (by date and person)')
			.setValue(layoutValue)
			.onChange(value => { layoutValue = value as TimelineLayoutStyle; }));

	// Color scheme
	new Setting(canvasOptionsSection)
		.setName('Color by')
		.setDesc('How to color event nodes')
		.addDropdown(dropdown => dropdown
			.addOption('event_type', 'Event type')
			.addOption('category', 'Category (core/extended/narrative)')
			.addOption('confidence', 'Confidence level')
			.addOption('monochrome', 'No color')
			.setValue(colorValue)
			.onChange(value => { colorValue = value as TimelineColorScheme; }));

	// Include ordering edges
	new Setting(canvasOptionsSection)
		.setName('Include ordering edges')
		.setDesc('Draw edges for before/after relationships')
		.addToggle(toggle => toggle
			.setValue(includeEdges)
			.onChange(value => { includeEdges = value; }));

	// Group by person (Canvas only)
	const groupByPersonSetting = new Setting(canvasOptionsSection)
		.setName('Group by person')
		.setDesc('Visually group events by their associated person')
		.addToggle(toggle => toggle
			.setValue(groupByPerson)
			.onChange(value => { groupByPerson = value; }));

	// --- Excalidraw-specific options section ---
	const excalidrawOptionsSection = formatOptionsContainer.createDiv({ cls: 'crc-export-section crc-export-section--excalidraw' });

	// Drawing style (roughness)
	const roughnessDescriptions: Record<number, string> = {
		0: 'Clean, precise lines like architectural drawings',
		1: 'Slightly rough, natural hand-drawn appearance',
		2: 'Very rough, expressive cartoon-like style'
	};
	const roughnessSetting = new Setting(excalidrawOptionsSection)
		.setName('Drawing style')
		.setDesc(roughnessDescriptions[excalidrawRoughness])
		.addDropdown(dropdown => dropdown
			.addOption('0', 'Architect (clean)')
			.addOption('1', 'Artist (natural)')
			.addOption('2', 'Cartoonist (rough)')
			.setValue(String(excalidrawRoughness))
			.onChange(value => {
				excalidrawRoughness = parseInt(value);
				roughnessSetting.setDesc(roughnessDescriptions[excalidrawRoughness]);
			}));

	// Font family
	new Setting(excalidrawOptionsSection)
		.setName('Font')
		.setDesc('Font style for event labels')
		.addDropdown(dropdown => dropdown
			.addOption('1', 'Virgil (hand-drawn)')
			.addOption('5', 'Excalifont (hand-drawn)')
			.addOption('4', 'Comic Shanns (comic)')
			.addOption('2', 'Helvetica (clean)')
			.addOption('6', 'Nunito (rounded)')
			.addOption('7', 'Lilita One (display)')
			.addOption('3', 'Cascadia (monospace)')
			.setValue(String(excalidrawFontFamily))
			.onChange(value => { excalidrawFontFamily = parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 | 7; }));

	// Font size
	new Setting(excalidrawOptionsSection)
		.setName('Font size')
		.setDesc('Size of text labels (default: 16)')
		.addSlider(slider => slider
			.setLimits(10, 32, 2)
			.setValue(excalidrawFontSize)
			.setDynamicTooltip()
			.onChange(value => { excalidrawFontSize = value; }));

	// Stroke width
	new Setting(excalidrawOptionsSection)
		.setName('Stroke width')
		.setDesc('Thickness of lines and borders (default: 2)')
		.addSlider(slider => slider
			.setLimits(1, 6, 1)
			.setValue(excalidrawStrokeWidth)
			.setDynamicTooltip()
			.onChange(value => { excalidrawStrokeWidth = value; }));

	// Fill style
	new Setting(excalidrawOptionsSection)
		.setName('Fill style')
		.setDesc('How shapes are filled')
		.addDropdown(dropdown => dropdown
			.addOption('solid', 'Solid')
			.addOption('hachure', 'Hachure (diagonal lines)')
			.addOption('cross-hatch', 'Cross-hatch')
			.setValue(excalidrawFillStyle)
			.onChange(value => { excalidrawFillStyle = value as 'solid' | 'hachure' | 'cross-hatch'; }));

	// Stroke style
	new Setting(excalidrawOptionsSection)
		.setName('Stroke style')
		.setDesc('Style of lines and borders')
		.addDropdown(dropdown => dropdown
			.addOption('solid', 'Solid')
			.addOption('dashed', 'Dashed')
			.addOption('dotted', 'Dotted')
			.setValue(excalidrawStrokeStyle)
			.onChange(value => { excalidrawStrokeStyle = value as 'solid' | 'dashed' | 'dotted'; }));

	// --- Markdown options section ---
	const markdownOptionsSection = formatOptionsContainer.createDiv({ cls: 'crc-export-section crc-export-section--markdown' });

	// Markdown format dropdown
	const mdFormatDescriptions: Record<string, string> = {
		callout: 'Visual timeline with year columns, colored dots, and event cards. Requires the included CSS.',
		table: 'Compact markdown table with columns for date, event, people, place, and sources.',
		list: 'Simple bullet list grouped by year. Maximum compatibility, no CSS required.',
		dataview: 'Generates a Dataview query that dynamically displays events. Requires Dataview plugin.'
	};

	const mdFormatSetting = new Setting(markdownOptionsSection)
		.setName('Markdown format')
		.setDesc(mdFormatDescriptions[markdownFormat])
		.addDropdown(dropdown => dropdown
			.addOption('callout', 'Vertical timeline (styled callouts)')
			.addOption('table', 'Condensed table')
			.addOption('list', 'Simple list')
			.addOption('dataview', 'Dataview query (dynamic)')
			.setValue(markdownFormat)
			.onChange(value => {
				markdownFormat = value as TimelineExportFormat;
				mdFormatSetting.setDesc(mdFormatDescriptions[value]);
			}));

	// --- Common filter options (always visible) ---
	const filtersSection = content.createDiv({ cls: 'crc-export-filters crc-mt-2' });
	filtersSection.createEl('div', { text: 'Filters', cls: 'setting-item-heading' });

	// Filter by person
	new Setting(filtersSection)
		.setName('Filter by person')
		.setDesc('Show only events for a specific person')
		.addDropdown(dropdown => {
			dropdown.addOption('', 'All people');
			const uniquePeople = eventService.getUniquePeople();
			for (const person of uniquePeople) {
				const displayName = extractDisplayLabel(person);
				dropdown.addOption(person, displayName);
			}
			dropdown.setValue(personValue);
			dropdown.onChange(value => { personValue = value; updateQuickStats(); });
		});

	// Filter by event type
	new Setting(filtersSection)
		.setName('Filter by type')
		.setDesc('Show only events of a specific type')
		.addDropdown(dropdown => {
			dropdown.addOption('', 'All types');
			const exportEventTypes = getAllEventTypes(
				plugin.settings.customEventTypes || [],
				plugin.settings.showBuiltInEventTypes !== false,
				plugin.settings.eventTypeCustomizations,
				plugin.settings.hiddenEventTypes
			);
			for (const type of exportEventTypes) {
				dropdown.addOption(type.id, type.name);
			}
			dropdown.setValue(typeValue);
			dropdown.onChange(value => { typeValue = value; updateQuickStats(); });
		});

	// Filter by group
	new Setting(filtersSection)
		.setName('Filter by group')
		.setDesc('Show only events in a specific group')
		.addDropdown(dropdown => {
			dropdown.addOption('', 'All groups');
			const uniqueGroups = eventService.getUniqueGroups();
			for (const group of uniqueGroups) {
				dropdown.addOption(group, group);
			}
			dropdown.setValue(groupValue);
			dropdown.onChange(value => { groupValue = value; updateQuickStats(); });
		});

	// Quick stats row
	const markdownExporter = new TimelineMarkdownExporter(plugin.app, plugin.settings, plugin.getDateService());
	const quickStatsRow = content.createDiv({ cls: 'crc-quick-stats crc-mt-2' });

	const updateQuickStats = () => {
		const filterOptions = {
			filterPerson: personValue || undefined,
			filterEventType: typeValue || undefined,
			filterGroup: groupValue || undefined
		};
		const summary = markdownExporter.getExportSummary(allEvents, filterOptions);
		const dateRange = markdownExporter.getDateRange(allEvents, filterOptions);

		quickStatsRow.empty();
		const statsText = quickStatsRow.createEl('span', { cls: 'crc-quick-stats-text' });

		let mainLine = `${summary.totalEvents} events`;
		if (dateRange.earliest && dateRange.latest) {
			const span = dateRange.latest - dateRange.earliest;
			mainLine += ` spanning ${dateRange.earliest}–${dateRange.latest} (${span} years)`;
		}
		statsText.createEl('span', { text: mainLine });

		if (summary.uniquePeople > 0 || summary.uniquePlaces > 0) {
			const secondaryStats: string[] = [];
			if (summary.uniquePeople > 0) secondaryStats.push(`${summary.uniquePeople} people`);
			if (summary.uniquePlaces > 0) secondaryStats.push(`${summary.uniquePlaces} places`);
			if (summary.datedEvents < summary.totalEvents) {
				secondaryStats.push(`${summary.datedEvents} dated`);
			}
			statsText.createEl('span', {
				text: ` • ${secondaryStats.join(' • ')}`,
				cls: 'crc-text-muted'
			});
		}
	};

	// Initial stats
	updateQuickStats();

	// Export button
	const buttonRow = content.createDiv({ cls: 'crc-button-row crc-mt-3' });
	const exportBtn = buttonRow.createEl('button', { cls: 'crc-btn crc-btn--primary' });

	const updateExportButton = () => {
		exportBtn.empty();
		let iconName: LucideIconName = 'download';
		let buttonText = 'Export';

		switch (exportFormat) {
			case 'canvas':
				iconName = 'layout';
				buttonText = 'Export to Canvas';
				break;
			case 'excalidraw':
				iconName = 'edit';
				buttonText = 'Export to Excalidraw';
				break;
			case 'markdown':
				iconName = 'file-text';
				buttonText = 'Export to Markdown';
				break;
		}

		const icon = createLucideIcon(iconName, 16);
		exportBtn.appendChild(icon);
		exportBtn.appendText(` ${buttonText}`);

		// Disable Excalidraw button if plugin not available
		exportBtn.disabled = exportFormat === 'excalidraw' && !excalidrawAvailable;
	};

	const updateVisibleOptions = () => {
		// Show/hide canvas options (shared between Canvas and Excalidraw)
		const showCanvas = exportFormat === 'canvas' || exportFormat === 'excalidraw';
		canvasOptionsSection.toggleClass('crc-hidden', !showCanvas);

		// Show/hide group by person (Canvas only, not Excalidraw)
		groupByPersonSetting.settingEl.toggleClass('crc-hidden', exportFormat !== 'canvas');

		// Show/hide Excalidraw-specific options
		excalidrawOptionsSection.toggleClass('crc-hidden', exportFormat !== 'excalidraw');

		// Show/hide markdown options
		markdownOptionsSection.toggleClass('crc-hidden', exportFormat !== 'markdown');
	};

	// Initial visibility
	updateVisibleOptions();
	updateExportButton();

	// Export handler
	exportBtn.addEventListener('click', () => {
		void (async () => {
			const title = titleValue || 'Event Timeline';

			if (exportFormat === 'canvas') {
				await handleCanvasExport(plugin, allEvents, title, layoutValue, colorValue, personValue, typeValue, groupValue, includeEdges, groupByPerson, exportBtn);
			} else if (exportFormat === 'excalidraw') {
				await handleExcalidrawExport(plugin, allEvents, title, layoutValue, colorValue, personValue, typeValue, groupValue, includeEdges, exportBtn, {
					roughness: excalidrawRoughness,
					fontFamily: excalidrawFontFamily,
					fillStyle: excalidrawFillStyle,
					strokeStyle: excalidrawStrokeStyle,
					strokeWidth: excalidrawStrokeWidth,
					fontSize: excalidrawFontSize
				});
			} else if (exportFormat === 'markdown') {
				await handleMarkdownExport(plugin, allEvents, title, markdownFormat, personValue, typeValue, groupValue, exportBtn);
			}
		})();
	});

	container.appendChild(card);
}

/**
 * Handle Canvas export
 */
async function handleCanvasExport(
	plugin: CanvasRootsPlugin,
	allEvents: EventNote[],
	title: string,
	layoutValue: TimelineLayoutStyle,
	colorValue: TimelineColorScheme,
	personValue: string,
	typeValue: string,
	groupValue: string,
	includeEdges: boolean,
	groupByPerson: boolean,
	exportBtn: HTMLButtonElement
): Promise<void> {
	const folder = plugin.settings.canvasesFolder || 'Charted Roots';
	const exportTitle = timelineExportTitle(title, personValue);
	const safeTitle = toSafeFilename(exportTitle);
	const expectedPath = `${folder}/${safeTitle}.canvas`;
	const existingFile = plugin.app.vault.getAbstractFileByPath(expectedPath);

	if (existingFile) {
		const confirmed = await confirmOverwriteCanvas(plugin.app, expectedPath);
		if (!confirmed) return;
	}

	exportBtn.disabled = true;
	exportBtn.textContent = 'Exporting...';

	try {
		const exporter = new TimelineCanvasExporter(plugin.app, plugin.settings);
		const result = await exporter.exportToCanvas(allEvents, {
			title: exportTitle,
			layoutStyle: layoutValue,
			colorScheme: colorValue,
			filterPerson: personValue || undefined,
			filterEventType: typeValue || undefined,
			filterGroup: groupValue || undefined,
			includeOrderingEdges: includeEdges,
			groupByPerson
		});

		if (result.success && result.path) {
			if (result.warnings?.length) {
				for (const warning of result.warnings) {
					new Notice(warning, 8000);
				}
			}
			new Notice(`Timeline exported to ${result.path}`);
			const file = plugin.app.vault.getAbstractFileByPath(result.path);
			if (file instanceof TFile) {
				void plugin.app.workspace.getLeaf(false).openFile(file);
			}
		} else {
			new Notice(`Export failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Export failed: ${message}`);
	} finally {
		exportBtn.disabled = false;
		exportBtn.empty();
		const icon = createLucideIcon('layout', 16);
		exportBtn.appendChild(icon);
		exportBtn.appendText(' Export to Canvas');
	}
}

/**
 * Handle Excalidraw export
 */
async function handleExcalidrawExport(
	plugin: CanvasRootsPlugin,
	allEvents: EventNote[],
	title: string,
	layoutValue: TimelineLayoutStyle,
	colorValue: TimelineColorScheme,
	personValue: string,
	typeValue: string,
	groupValue: string,
	includeEdges: boolean,
	exportBtn: HTMLButtonElement,
	excalidrawOptions: {
		roughness: number;
		fontFamily: 1 | 2 | 3 | 4 | 5 | 6 | 7;
		fillStyle: 'solid' | 'hachure' | 'cross-hatch';
		strokeStyle: 'solid' | 'dashed' | 'dotted';
		strokeWidth: number;
		fontSize: number;
	}
): Promise<void> {
	const folder = plugin.settings.canvasesFolder || 'Charted Roots';
	const exportTitle = timelineExportTitle(title, personValue);
	const safeTitle = toSafeFilename(exportTitle);
	const expectedExcalidrawPath = `${folder}/${safeTitle}.excalidraw.md`;
	const existingExcalidraw = plugin.app.vault.getAbstractFileByPath(expectedExcalidrawPath);

	if (existingExcalidraw) {
		const confirmed = await confirmOverwriteCanvas(plugin.app, expectedExcalidrawPath);
		if (!confirmed) return;
	}

	exportBtn.disabled = true;
	exportBtn.textContent = 'Exporting...';

	try {
		const exporter = new TimelineCanvasExporter(plugin.app, plugin.settings);

		// Export to canvas first (as intermediate format)
		const result = await exporter.exportToCanvas(allEvents, {
			title: exportTitle,
			layoutStyle: layoutValue,
			colorScheme: colorValue,
			filterPerson: personValue || undefined,
			filterEventType: typeValue || undefined,
			filterGroup: groupValue || undefined,
			includeOrderingEdges: includeEdges,
			groupByPerson: false
		});

		if (result.success && result.path) {
			if (result.warnings?.length) {
				for (const warning of result.warnings) {
					new Notice(warning, 8000);
				}
			}

			// Convert to Excalidraw
			const { ExcalidrawExporter } = await import('../../excalidraw/excalidraw-exporter');
			const excalidrawExporter = new ExcalidrawExporter(plugin.app);

			const canvasFile = plugin.app.vault.getAbstractFileByPath(result.path);
			if (!(canvasFile instanceof TFile)) {
				throw new Error('Canvas file not found after export');
			}

			const excalidrawResult = await excalidrawExporter.exportToExcalidraw({
				canvasFile,
				fileName: result.path.replace('.canvas', '').split('/').pop(),
				preserveColors: true,
				roughness: excalidrawOptions.roughness,
				fontFamily: excalidrawOptions.fontFamily,
				fillStyle: excalidrawOptions.fillStyle,
				strokeStyle: excalidrawOptions.strokeStyle,
				strokeWidth: excalidrawOptions.strokeWidth,
				fontSize: excalidrawOptions.fontSize
			});

			if (excalidrawResult.success && excalidrawResult.excalidrawContent) {
				const excalidrawPath = result.path.replace('.canvas', '.excalidraw.md');
				const existingFile = plugin.app.vault.getAbstractFileByPath(excalidrawPath);
				if (existingFile instanceof TFile) {
					await plugin.app.vault.modify(existingFile, excalidrawResult.excalidrawContent);
				} else {
					await plugin.app.vault.create(excalidrawPath, excalidrawResult.excalidrawContent);
				}
				new Notice(`Timeline exported to ${excalidrawPath}`);
				const file = plugin.app.vault.getAbstractFileByPath(excalidrawPath);
				if (file instanceof TFile) {
					void plugin.app.workspace.getLeaf(false).openFile(file);
				}
			} else {
				new Notice(`Excalidraw export failed: ${excalidrawResult.errors.join(', ') || 'Unknown error'}`);
			}
		} else {
			new Notice(`Export failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Export failed: ${message}`);
	} finally {
		exportBtn.disabled = false;
		exportBtn.empty();
		const icon = createLucideIcon('edit', 16);
		exportBtn.appendChild(icon);
		exportBtn.appendText(' Export to Excalidraw');
	}
}

/**
 * Handle Markdown export
 */
async function handleMarkdownExport(
	plugin: CanvasRootsPlugin,
	allEvents: EventNote[],
	title: string,
	formatValue: TimelineExportFormat,
	personValue: string,
	typeValue: string,
	groupValue: string,
	exportBtn: HTMLButtonElement
): Promise<void> {
	const folder = plugin.settings.timelinesFolder || plugin.settings.eventsFolder || 'Charted Roots/Timelines';
	const exportTitle = timelineExportTitle(title, personValue);
	const safeTitle = toSafeFilename(exportTitle);
	const expectedPath = `${folder}/${safeTitle}.md`;
	const existingFile = plugin.app.vault.getAbstractFileByPath(expectedPath);

	if (existingFile) {
		const confirmed = await confirmOverwriteCanvas(plugin.app, expectedPath);
		if (!confirmed) return;
	}

	exportBtn.disabled = true;
	exportBtn.textContent = 'Exporting...';

	try {
		const exporter = new TimelineMarkdownExporter(plugin.app, plugin.settings, plugin.getDateService());
		const result = await exporter.export(allEvents, {
			title: exportTitle,
			format: formatValue,
			filterPerson: personValue || undefined,
			filterEventType: typeValue || undefined,
			filterGroup: groupValue || undefined,
			groupByYear: true,
			includePlaces: true,
			includeSources: true,
			multiColumn: formatValue === 'callout'
		});

		if (result.success && result.path) {
			if (result.warnings?.length) {
				for (const warning of result.warnings) {
					new Notice(warning, 8000);
				}
			}
			new Notice(`Timeline exported to ${result.path}`);
			const file = plugin.app.vault.getAbstractFileByPath(result.path);
			if (file instanceof TFile) {
				void plugin.app.workspace.getLeaf(false).openFile(file);
			}
		} else {
			new Notice(`Export failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Export failed: ${message}`);
	} finally {
		exportBtn.disabled = false;
		exportBtn.empty();
		const icon = createLucideIcon('file-text', 16);
		exportBtn.appendChild(icon);
		exportBtn.appendText(' Export to Markdown');
	}
}

/**
 * Statistics about events in the vault
 */
interface EventStatistics {
	totalEvents: number;
	withDates: number;
	byCategory: {
		core: number;
		extended: number;
		narrative: number;
		custom: number;
	};
}

/**
 * Resolve a property from frontmatter using alias mapping
 * Checks canonical property first, then falls back to aliases
 */
function resolveProperty(
	frontmatter: Record<string, unknown>,
	canonicalProperty: string,
	aliases: Record<string, string>
): unknown {
	// Canonical property takes precedence
	if (frontmatter[canonicalProperty] !== undefined) {
		return frontmatter[canonicalProperty];
	}

	// Check aliases - find user property that maps to this canonical property
	for (const [userProp, mappedCanonical] of Object.entries(aliases)) {
		if (mappedCanonical === canonicalProperty && frontmatter[userProp] !== undefined) {
			return frontmatter[userProp];
		}
	}

	return undefined;
}

/**
 * Calculate event statistics from event notes
 */
function calculateEventStatistics(plugin: CanvasRootsPlugin): EventStatistics {
	const stats: EventStatistics = {
		totalEvents: 0,
		withDates: 0,
		byCategory: {
			core: 0,
			extended: 0,
			narrative: 0,
			custom: 0
		}
	};

	// Core event types
	const coreTypes = ['birth', 'death', 'marriage', 'divorce'];
	// Extended event types
	const extendedTypes = ['burial', 'residence', 'occupation', 'education', 'military', 'immigration', 'baptism', 'confirmation', 'ordination'];
	// Narrative event types
	const narrativeTypes = ['anecdote', 'lore_event', 'plot_point', 'flashback', 'foreshadowing', 'backstory', 'climax', 'resolution'];

	// Get property aliases for resolving aliased properties
	const aliases = plugin.settings.propertyAliases || {};

	// Get all markdown files
	const files = plugin.app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = plugin.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) continue;

		// Check if this is an event note (supports cr_type, type, and tags)
		if (!isEventNote(frontmatter, cache, plugin.settings.noteTypeDetection)) continue;

		stats.totalEvents++;

		// Check for date (using property aliases)
		const dateValue = resolveProperty(frontmatter, 'date', aliases);
		if (dateValue) {
			stats.withDates++;
		}

		// Categorize by event type (using property aliases)
		const eventType = resolveProperty(frontmatter, 'event_type', aliases) as string;
		if (coreTypes.includes(eventType)) {
			stats.byCategory.core++;
		} else if (extendedTypes.includes(eventType)) {
			stats.byCategory.extended++;
		} else if (narrativeTypes.includes(eventType)) {
			stats.byCategory.narrative++;
		} else {
			stats.byCategory.custom++;
		}
	}

	return stats;
}

/**
 * Render the Statistics card with date coverage metrics
 */
function renderStatisticsCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement,
	closeModal: () => void
): void {
	const card = createCard({
		title: 'Statistics',
		icon: 'bar-chart'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Render the card body from a fresh statistics computation. Extracted so it
	// can re-run when the metadata cache settles (#651): the count walks the
	// metadata cache, which may be incompletely populated at first render (cold
	// start, post-edit re-indexing), so an early render can show a low number
	// until the cache catches up.
	const renderBody = (): void => {
		content.empty();

		const stats = calculateDateStatistics(plugin);

		if (stats.totalPersons === 0) {
			// Empty state if no persons
			const emptyState = content.createDiv({ cls: 'crc-empty-state' });
			emptyState.createEl('p', {
				text: 'No person notes found.',
				cls: 'crc-text-muted'
			});
			emptyState.createEl('p', {
				text: 'Create person notes with cr_type: person in frontmatter to see date statistics.',
				cls: 'crc-text-muted'
			});
		} else {
			// Date coverage section
			const coverageSection = content.createDiv({ cls: 'cr-stats-section' });
			coverageSection.createEl('h4', { text: 'Date coverage', cls: 'cr-subsection-heading' });

			const coverageList = coverageSection.createEl('ul', { cls: 'cr-stats-list' });

			// Birth dates
			const birthItem = coverageList.createEl('li');
			const birthPercent = Math.round((stats.withBirthDates / stats.totalPersons) * 100);
			birthItem.setText(`${stats.withBirthDates} of ${stats.totalPersons} person notes have birth dates (${birthPercent}%)`);

			// Death dates
			const deathItem = coverageList.createEl('li');
			const deathPercent = Math.round((stats.withDeathDates / stats.totalPersons) * 100);
			deathItem.setText(`${stats.withDeathDates} of ${stats.totalPersons} person notes have death dates (${deathPercent}%)`);

			// Fictional dates section (only show if fictional dates are enabled)
			if (plugin.settings.enableFictionalDates) {
				const fictionalSection = content.createDiv({ cls: 'cr-stats-section' });
				fictionalSection.createEl('h4', { text: 'Fictional dates', cls: 'cr-subsection-heading' });

				const fictionalList = fictionalSection.createEl('ul', { cls: 'cr-stats-list' });

				// Count of notes using fictional dates
				const fictionalItem = fictionalList.createEl('li');
				fictionalItem.setText(`${stats.withFictionalDates} notes use fictional date systems`);

				// Systems in use
				if (stats.systemsInUse.length > 0) {
					const systemsItem = fictionalList.createEl('li');
					const systemsText = stats.systemsInUse
						.map(s => `${s.name} (${s.count})`)
						.join(', ');
					systemsItem.setText(`Systems in use: ${systemsText}`);
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
	};

	renderBody();
	container.appendChild(card);

	// #651: recompute when Obsidian signals the metadata cache has settled, so a
	// stale low count rendered mid-indexing corrects itself without a manual tab
	// reopen. The listener removes itself once the card leaves the DOM (tab
	// switch or modal close), and self-heals any leftover refs on the next event.
	let resolvedRef: EventRef;
	const recompute = (): void => {
		if (!card.isConnected) {
			plugin.app.metadataCache.offref(resolvedRef);
			return;
		}
		renderBody();
	};
	resolvedRef = plugin.app.metadataCache.on('resolved', recompute);
}

/**
 * Confirm deletion of an event
 */
async function confirmDeleteEvent(app: App, eventTitle: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(app);
		modal.titleEl.setText('Delete event');
		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		const deleteBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

/**
 * Confirm overwriting an existing canvas file
 */
async function confirmOverwriteCanvas(app: App, canvasPath: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(app);
		modal.titleEl.setText('Overwrite canvas?');
		modal.contentEl.createEl('p', {
			text: `A canvas file already exists at "${canvasPath}".`
		});
		modal.contentEl.createEl('p', {
			text: 'Do you want to replace it with a new timeline export?'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		const overwriteBtn = buttonContainer.createEl('button', {
			text: 'Overwrite',
			cls: 'mod-warning'
		});
		overwriteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

/* ══════════════════════════════════════════════════════════════════════════
   Dockable Events List — standalone renderer for the sidebar ItemView
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a browsable events list for the dockable sidebar view.
 *
 * This is a standalone function with closure-scoped state, independent of
 * the modal's `renderTimelineCard()` / `renderEventTable()`. It provides
 * type/person filters, search, and a simplified table without row-click-to-edit,
 * media actions, delete, or gap analysis.
 */
export function renderEventsList(options: EventsListOptions): void {
	const { container, plugin, onStateChange } = options;

	const eventService = plugin.getEventService();
	if (!eventService) {
		container.createEl('p', {
			text: 'Event service is not available.',
			cls: 'crc-text-muted'
		});
		return;
	}

	// Closure-scoped state
	let currentTypeFilter = options.initialTypeFilter ?? '';
	let currentPersonFilter = options.initialPersonFilter ?? '';
	let currentUniverseFilter = options.initialUniverseFilter ?? '';
	let currentPlaceFilter = options.initialPlaceFilter ?? '';
	let currentDateFrom: number | null = options.initialDateFrom ?? null;
	let currentDateTo: number | null = options.initialDateTo ?? null;
	let currentSearch = options.initialSearch ?? '';

	// Get all events
	const allEvents = eventService.getAllEvents();

	if (allEvents.length === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No events yet.',
			cls: 'crc-text-muted'
		});
		emptyState.createEl('p', {
			text: 'Create event notes to see them here.',
			cls: 'crc-text-muted'
		});
		return;
	}

	// Filter controls
	const filterRow = container.createDiv({ cls: 'crc-timeline-filters' });

	// Event type filter
	const typeFilterEl = filterRow.createEl('select', { cls: 'dropdown' });
	typeFilterEl.createEl('option', { value: '', text: 'All types' });

	const eventTypes = getAllEventTypes(
		plugin.settings.customEventTypes || [],
		plugin.settings.showBuiltInEventTypes !== false,
		plugin.settings.eventTypeCustomizations,
		plugin.settings.hiddenEventTypes
	);
	for (const type of eventTypes) {
		const opt = typeFilterEl.createEl('option', { value: type.id, text: type.name });
		if (type.id === currentTypeFilter) opt.selected = true;
	}
	typeFilterEl.value = currentTypeFilter;

	// Person filter
	const personFilterEl = filterRow.createEl('select', { cls: 'dropdown' });
	personFilterEl.createEl('option', { value: '', text: 'All people' });

	const uniquePeople = eventService.getUniquePeople();
	for (const person of uniquePeople) {
		const displayName = extractDisplayLabel(person);
		const opt = personFilterEl.createEl('option', { value: person, text: displayName });
		if (person === currentPersonFilter) opt.selected = true;
	}
	personFilterEl.value = currentPersonFilter;

	// Search input
	const searchInput = filterRow.createEl('input', {
		cls: 'crc-timeline-search',
		attr: {
			type: 'text',
			placeholder: 'Search events...'
		}
	});
	searchInput.value = currentSearch;

	// More-filters disclosure (#515). Opens by default if any of the
	// secondary filters are persisted as set, so users with a remembered
	// universe/place/date-range filter see those controls without hunting
	// for them.
	const hasSecondaryFilter = !!(currentUniverseFilter || currentPlaceFilter || currentDateFrom !== null || currentDateTo !== null);
	const moreFiltersToggle = filterRow.createEl('button', {
		cls: 'crc-timeline-more-filters-toggle clickable-icon',
		attr: { 'aria-expanded': String(hasSecondaryFilter), 'aria-label': 'Toggle more filters' }
	});
	setIcon(moreFiltersToggle, 'sliders-horizontal');
	moreFiltersToggle.createSpan({ text: ' More filters', cls: 'crc-timeline-more-filters-label' });

	const moreFiltersRow = container.createDiv({ cls: 'crc-timeline-more-filters' });
	if (!hasSecondaryFilter) {
		moreFiltersRow.addClass('crc-timeline-more-filters--collapsed');
	}

	const universeFilterEl = moreFiltersRow.createEl('select', { cls: 'dropdown' });
	universeFilterEl.createEl('option', { value: '', text: '(any)' });
	universeFilterEl.createEl('option', { value: UNIVERSE_FILTER_REAL, text: '(real-world)' });
	universeFilterEl.createEl('option', { value: UNIVERSE_FILTER_ANY_FICTIONAL, text: '(any fictional)' });
	const universeNames = new Set<string>();
	for (const e of allEvents) {
		if (e.universe) universeNames.add(e.universe);
	}
	for (const name of Array.from(universeNames).sort((a, b) => a.localeCompare(b))) {
		universeFilterEl.createEl('option', { value: name, text: name });
	}
	universeFilterEl.value = currentUniverseFilter;

	const placeFilterEl = moreFiltersRow.createEl('select', { cls: 'dropdown' });
	placeFilterEl.createEl('option', { value: '', text: 'All places' });
	for (const place of eventService.getUniquePlaces()) {
		placeFilterEl.createEl('option', { value: place, text: stripWikilink(place) });
	}
	placeFilterEl.value = currentPlaceFilter;

	const dateFromInput = moreFiltersRow.createEl('input', {
		cls: 'crc-timeline-date-input',
		attr: { type: 'number', placeholder: 'From year' }
	});
	if (currentDateFrom !== null) dateFromInput.value = String(currentDateFrom);

	const dateToInput = moreFiltersRow.createEl('input', {
		cls: 'crc-timeline-date-input',
		attr: { type: 'number', placeholder: 'To year' }
	});
	if (currentDateTo !== null) dateToInput.value = String(currentDateTo);

	moreFiltersToggle.addEventListener('click', () => {
		const isCollapsed = moreFiltersRow.classList.toggle('crc-timeline-more-filters--collapsed');
		moreFiltersToggle.setAttribute('aria-expanded', String(!isCollapsed));
	});

	// Table container
	const tableContainer = container.createDiv({ cls: 'crc-timeline-table-container' });

	// Render function
	const renderTable = (events: EventNote[]) => {
		tableContainer.empty();

		if (events.length === 0) {
			tableContainer.createEl('p', {
				text: 'No matching events.',
				cls: 'crc-text-muted crc-text-center'
			});
			return;
		}

		const table = tableContainer.createEl('table', { cls: 'crc-timeline-table' });

		// Header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Event' });
		headerRow.createEl('th', { text: 'Type' });
		headerRow.createEl('th', { text: 'Person' });
		headerRow.createEl('th', { text: 'Place' });
		headerRow.createEl('th', { text: 'Media', cls: 'crc-timeline-th--center' });
		headerRow.createEl('th', { text: '', cls: 'crc-timeline-th--actions' });

		// Body
		const tbody = table.createEl('tbody');

		for (const event of events) {
			const row = tbody.createEl('tr', { cls: 'crc-timeline-row crc-timeline-row--browse' });

			// Context menu (simplified: open note, open in new tab only)
			row.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				const menu = new Menu();

				menu.addItem((item) => {
					item
						.setTitle('Open note')
						.setIcon('file')
						.onClick(async () => {
							await plugin.trackRecentFile(event.file, 'event');
							void plugin.app.workspace.getLeaf(false).openFile(event.file);
						});
				});

				menu.addItem((item) => {
					item
						.setTitle('Open in new tab')
						.setIcon('file-plus')
						.onClick(async () => {
							await plugin.trackRecentFile(event.file, 'event');
							void plugin.app.workspace.getLeaf('tab').openFile(event.file);
						});
				});

				menu.showAtMouseEvent(e);
			});

			// Date cell
			const dateCell = row.createEl('td', { cls: 'crc-timeline-cell-date' });
			if (event.date) {
				dateCell.textContent = event.date;
				if (event.dateEnd) {
					dateCell.textContent += ` – ${event.dateEnd}`;
				}
			} else {
				dateCell.createEl('span', { text: 'Unknown', cls: 'crc-text-muted' });
			}

			// Event title cell
			const titleCell = row.createEl('td', { cls: 'crc-timeline-cell-title' });
			titleCell.textContent = event.title;

			// Type cell with badge
			const typeCell = row.createEl('td', { cls: 'crc-timeline-cell-type' });
			const typeDef = getEventType(
				event.eventType,
				plugin.settings.customEventTypes || [],
				plugin.settings.showBuiltInEventTypes !== false,
				plugin.settings.eventTypeCustomizations
			);
			if (typeDef) {
				const badge = typeCell.createEl('span', { cls: 'crc-event-type-badge' });
				badge.style.setProperty('background-color', typeDef.color);
				badge.style.setProperty('color', getContrastColor(typeDef.color));
				const icon = createLucideIcon(typeDef.icon, 12);
				badge.appendChild(icon);
				badge.appendText(` ${typeDef.name}`);
			} else {
				typeCell.textContent = event.eventType;
			}

			// Person cell
			const personCell = row.createEl('td', { cls: 'crc-timeline-cell-person' });
			const allPeople: string[] = [];
			if (event.person) {
				allPeople.push(extractDisplayLabel(event.person));
			}
			if (event.persons && event.persons.length > 0) {
				allPeople.push(...event.persons.map(p => extractDisplayLabel(p)));
			}

			if (allPeople.length > 0) {
				personCell.textContent = allPeople.join(', ');
			} else {
				personCell.createEl('span', { text: '—', cls: 'crc-text-muted' });
			}

			// Place cell
			const placeCell = row.createEl('td', { cls: 'crc-timeline-cell-place' });
			if (event.place) {
				placeCell.textContent = extractDisplayLabel(event.place);
			} else {
				placeCell.createEl('span', { text: '—', cls: 'crc-text-muted' });
			}

			// Media cell (read-only badge, no click handler)
			const mediaCell = row.createEl('td', { cls: 'crc-timeline-cell-media' });
			const mediaCount = event.media?.length || 0;
			if (mediaCount > 0) {
				const mediaBadge = mediaCell.createEl('span', {
					cls: 'crc-person-list-badge crc-person-list-badge--media',
					attr: { title: `${mediaCount} media file${mediaCount !== 1 ? 's' : ''}` }
				});
				const mediaIcon = createLucideIcon('image', 12);
				mediaBadge.appendChild(mediaIcon);
				mediaBadge.appendText(mediaCount.toString());
			} else {
				mediaCell.createEl('span', { text: '—', cls: 'crc-text-muted' });
			}

			// Actions cell with open note button
			const actionsCell = row.createEl('td', { cls: 'crc-timeline-cell-actions' });
			const openBtn = actionsCell.createEl('button', {
				cls: 'crc-timeline-open-btn clickable-icon',
				attr: { 'aria-label': 'Open note' }
			});
			const fileIcon = createLucideIcon('file-text', 14);
			openBtn.appendChild(fileIcon);
			openBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				void (async () => {
					await plugin.trackRecentFile(event.file, 'event');
					void plugin.app.workspace.getLeaf(false).openFile(event.file);
				})();
			});
		}

		// Show count
		tableContainer.createEl('p', {
			text: `Showing ${events.length} event${events.length !== 1 ? 's' : ''}`,
			cls: 'crc-text-muted crc-text-small crc-mt-2'
		});
	};

	// Apply filters and render
	const applyFilters = () => {
		currentTypeFilter = typeFilterEl.value;
		currentPersonFilter = personFilterEl.value;
		currentUniverseFilter = universeFilterEl.value;
		currentPlaceFilter = placeFilterEl.value;
		currentDateFrom = dateFromInput.value ? parseInt(dateFromInput.value, 10) : null;
		currentDateTo = dateToInput.value ? parseInt(dateToInput.value, 10) : null;
		currentSearch = searchInput.value;

		const filterState: TimelineFilterState = {
			type: currentTypeFilter,
			person: currentPersonFilter,
			universe: currentUniverseFilter,
			place: currentPlaceFilter,
			dateFrom: currentDateFrom,
			dateTo: currentDateTo,
			search: currentSearch
		};
		const filtered = applyTimelineFilters(allEvents, filterState);
		renderTable(sortEventsChronologically([...filtered]));

		onStateChange?.(filterState);
	};

	typeFilterEl.addEventListener('change', applyFilters);
	personFilterEl.addEventListener('change', applyFilters);
	universeFilterEl.addEventListener('change', applyFilters);
	placeFilterEl.addEventListener('change', applyFilters);
	dateFromInput.addEventListener('input', applyFilters);
	dateToInput.addEventListener('input', applyFilters);
	searchInput.addEventListener('input', applyFilters);

	// Initial render
	const initialFiltered = applyTimelineFilters(allEvents, {
		type: currentTypeFilter,
		person: currentPersonFilter,
		universe: currentUniverseFilter,
		place: currentPlaceFilter,
		dateFrom: currentDateFrom,
		dateTo: currentDateTo,
		search: currentSearch
	});
	renderTable(sortEventsChronologically([...initialFiltered]));
}

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Match scope of file-level disable at top. */
