/**
 * Events Dockable View
 *
 * A workspace ItemView that displays the events timeline in a dockable
 * sidebar panel. Uses `renderEventsList()` for a simplified browsable
 * table, independent of the Control Center modal's full-featured timeline.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { renderEventsList } from './events-tab';

export const VIEW_TYPE_EVENTS = 'canvas-roots-events';

interface EventsViewState {
	typeFilter?: string;
	personFilter?: string;
	universeFilter?: string;
	placeFilter?: string;
	dateFrom?: number | null;
	dateTo?: number | null;
	search?: string;
}

export class EventsView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentTypeFilter = '';
	private currentPersonFilter = '';
	private currentUniverseFilter = '';
	private currentPlaceFilter = '';
	private currentDateFrom: number | null = null;
	private currentDateTo: number | null = null;
	private currentSearch = '';
	private refreshTimeout: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_EVENTS;
	}

	getDisplayText(): string {
		return 'Events';
	}

	getIcon(): string {
		return 'calendar';
	}

	async onOpen(): Promise<void> {
		this.buildUI();
		this.registerEventHandlers();
	}

	async onClose(): Promise<void> {
		if (this.refreshTimeout) {
			window.clearTimeout(this.refreshTimeout);
		}
	}

	/**
	 * Build the view UI
	 */
	private buildUI(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass('cr-events-view');

		// Header
		this.buildHeader(container);

		// List content
		const listContainer = container.createDiv({ cls: 'cr-ev-content' });
		renderEventsList({
			container: listContainer,
			plugin: this.plugin,
			initialTypeFilter: this.currentTypeFilter,
			initialPersonFilter: this.currentPersonFilter,
			initialUniverseFilter: this.currentUniverseFilter,
			initialPlaceFilter: this.currentPlaceFilter,
			initialDateFrom: this.currentDateFrom,
			initialDateTo: this.currentDateTo,
			initialSearch: this.currentSearch,
			onStateChange: (state) => {
				this.currentTypeFilter = state.type;
				this.currentPersonFilter = state.person;
				this.currentUniverseFilter = state.universe;
				this.currentPlaceFilter = state.place;
				this.currentDateFrom = state.dateFrom;
				this.currentDateTo = state.dateTo;
				this.currentSearch = state.search;
				// Trigger Obsidian to persist the new state via getState().
				// Without this, in-memory changes are only saved opportunistically
				// (on the next workspace save), causing dropdowns to revert to
				// the last persisted value on reload. requestSaveLayout is
				// debounced by Obsidian, so per-keystroke calls are safe.
				this.app.workspace.requestSaveLayout();
			}
		});
	}

	/**
	 * Build the header with title and refresh button
	 */
	private buildHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'cr-ev-header' });

		header.createEl('h2', { text: 'Events', cls: 'cr-ev-title' });

		const actions = header.createDiv({ cls: 'cr-ev-actions' });

		const refreshBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': 'Refresh' }
		});
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.addEventListener('click', () => this.refresh());
	}

	/**
	 * Refresh the view
	 */
	private refresh(): void {
		this.buildUI();
	}

	/**
	 * Register event handlers for vault changes
	 */
	private registerEventHandlers(): void {
		this.registerEvent(
			this.app.vault.on('modify', () => this.scheduleRefresh())
		);
		this.registerEvent(
			this.app.vault.on('create', () => this.scheduleRefresh())
		);
		this.registerEvent(
			this.app.vault.on('delete', () => this.scheduleRefresh())
		);
	}

	/**
	 * Schedule a debounced refresh
	 */
	private scheduleRefresh(): void {
		if (this.refreshTimeout) {
			window.clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = window.setTimeout(() => {
			this.refreshTimeout = null;
			this.refresh();
		}, 2000);
	}

	// State persistence
	getState(): Record<string, unknown> {
		return {
			typeFilter: this.currentTypeFilter,
			personFilter: this.currentPersonFilter,
			universeFilter: this.currentUniverseFilter,
			placeFilter: this.currentPlaceFilter,
			dateFrom: this.currentDateFrom,
			dateTo: this.currentDateTo,
			search: this.currentSearch
		};
	}

	async setState(state: Partial<EventsViewState>): Promise<void> {
		if (state.typeFilter !== undefined) {
			this.currentTypeFilter = state.typeFilter;
		}
		if (state.personFilter !== undefined) {
			this.currentPersonFilter = state.personFilter;
		}
		if (state.universeFilter !== undefined) {
			this.currentUniverseFilter = state.universeFilter;
		}
		if (state.placeFilter !== undefined) {
			this.currentPlaceFilter = state.placeFilter;
		}
		if (state.dateFrom !== undefined) {
			this.currentDateFrom = state.dateFrom;
		}
		if (state.dateTo !== undefined) {
			this.currentDateTo = state.dateTo;
		}
		if (state.search !== undefined) {
			this.currentSearch = state.search;
		}
		this.buildUI();
	}
}
