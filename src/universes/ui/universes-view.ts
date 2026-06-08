/**
 * Universes Dockable View
 *
 * A workspace ItemView that displays the universes list in a dockable
 * sidebar panel. Uses `renderUniversesList()` for a simplified browsable
 * table, independent of the Control Center modal's full-featured list.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { renderUniversesList } from './universes-tab';
import type { UniverseListFilter, UniverseListSort } from './universes-tab';

export const VIEW_TYPE_UNIVERSES = 'canvas-roots-universes';

interface UniversesViewState {
	filter?: UniverseListFilter;
	sort?: UniverseListSort;
	search?: string;
}

export class UniversesView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentFilter: UniverseListFilter = 'all';
	private currentSort: UniverseListSort = 'name-asc';
	private currentSearch = '';
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_UNIVERSES;
	}

	getDisplayText(): string {
		return 'Universes';
	}

	getIcon(): string {
		return 'globe';
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
		container.addClass('cr-universes-view');

		// Header
		this.buildHeader(container);

		// List content
		const listContainer = container.createDiv({ cls: 'cr-uv-content' });
		renderUniversesList({
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
		const header = container.createDiv({ cls: 'cr-uv-header' });

		header.createEl('h2', { text: 'Universes', cls: 'cr-uv-title' });

		const actions = header.createDiv({ cls: 'cr-uv-actions' });

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

	async setState(state: Partial<UniversesViewState>): Promise<void> {
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
