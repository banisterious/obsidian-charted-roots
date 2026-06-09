/**
 * Organizations Dockable View
 *
 * A workspace ItemView that displays the organizations list in a dockable
 * sidebar panel. Uses `renderOrganizationsList()` for a simplified browsable
 * table, independent of the Control Center modal's full-featured list.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { renderOrganizationsList } from './organizations-tab';
import type { OrgListFilter, OrgListSort } from './organizations-tab';

export const VIEW_TYPE_ORGANIZATIONS = 'canvas-roots-organizations';

interface OrganizationsViewState {
	filter?: OrgListFilter;
	sort?: OrgListSort;
	search?: string;
}

export class OrganizationsView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentFilter: OrgListFilter = 'all';
	private currentSort: OrgListSort = 'name_asc';
	private currentSearch = '';
	private refreshTimeout: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_ORGANIZATIONS;
	}

	getDisplayText(): string {
		return 'Organizations';
	}

	getIcon(): string {
		return 'building';
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
		container.addClass('cr-organizations-view');

		// Header
		this.buildHeader(container);

		// List content
		const listContainer = container.createDiv({ cls: 'cr-ov-content' });
		renderOrganizationsList({
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
		const header = container.createDiv({ cls: 'cr-ov-header' });

		header.createEl('h2', { text: 'Organizations', cls: 'cr-ov-title' });

		const actions = header.createDiv({ cls: 'cr-ov-actions' });

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

	async setState(state: Partial<OrganizationsViewState>): Promise<void> {
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
