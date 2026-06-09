/**
 * Places Dockable View
 *
 * A workspace ItemView that displays the places list in a dockable
 * sidebar panel. Uses `renderPlacesList()` for a simplified browsable
 * table, independent of the Control Center modal's full-featured list.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { renderPlacesList, type PlaceListFilter, type PlaceListSort } from '../places-tab';

export const VIEW_TYPE_PLACES = 'canvas-roots-places';

interface PlacesViewState {
	filter?: PlaceListFilter;
	sort?: PlaceListSort;
	search?: string;
}

export class PlacesView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentFilter: PlaceListFilter = 'all';
	private currentSort: PlaceListSort = 'name_asc';
	private currentSearch = '';
	private refreshTimeout: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_PLACES;
	}

	getDisplayText(): string {
		return 'Places';
	}

	getIcon(): string {
		return 'map-pin';
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
		container.addClass('cr-places-view');

		// Header
		this.buildHeader(container);

		// List content
		const listContainer = container.createDiv({ cls: 'cr-plv-content' });
		renderPlacesList({
			container: listContainer,
			plugin: this.plugin,
			initialFilter: this.currentFilter,
			initialSort: this.currentSort,
			initialSearch: this.currentSearch,
			onStateChange: (filter, sort, search) => {
				this.currentFilter = filter;
				this.currentSort = sort;
				this.currentSearch = search;
			}
		});
	}

	/**
	 * Build the header with title and refresh button
	 */
	private buildHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'cr-plv-header' });

		header.createEl('h2', { text: 'Places', cls: 'cr-plv-title' });

		const actions = header.createDiv({ cls: 'cr-plv-actions' });

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
			filter: this.currentFilter,
			sort: this.currentSort,
			search: this.currentSearch
		};
	}

	async setState(state: Partial<PlacesViewState>): Promise<void> {
		if (state.filter) {
			this.currentFilter = state.filter;
		}
		if (state.sort) {
			this.currentSort = state.sort;
		}
		if (state.search !== undefined) {
			this.currentSearch = state.search;
		}
		this.buildUI();
	}
}
