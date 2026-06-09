/**
 * Relationships Dockable View
 *
 * A workspace ItemView that displays the relationships list in a dockable
 * sidebar panel. Shares rendering logic with the Control Center modal via
 * `renderRelationshipsList()`.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { renderRelationshipsList, type RelationshipFilter, type RelationshipSort } from './relationships-tab';

export const VIEW_TYPE_RELATIONSHIPS = 'canvas-roots-relationships';

interface RelationshipsViewState {
	filter?: RelationshipFilter;
	sort?: RelationshipSort;
}

export class RelationshipsView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentFilter: RelationshipFilter = 'all';
	private currentSort: RelationshipSort = 'from_asc';
	private refreshTimeout: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_RELATIONSHIPS;
	}

	getDisplayText(): string {
		return 'Relationships';
	}

	getIcon(): string {
		return 'users';
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
		container.addClass('cr-relationships-view');

		// Header
		this.buildHeader(container);

		// List content
		const listContainer = container.createDiv({ cls: 'cr-rv-content' });
		renderRelationshipsList({
			container: listContainer,
			plugin: this.plugin,
			initialFilter: this.currentFilter,
			initialSort: this.currentSort,
			onStateChange: (filter, sort) => {
				this.currentFilter = filter;
				this.currentSort = sort;
			}
		});
	}

	/**
	 * Build the header with title and refresh button
	 */
	private buildHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'cr-rv-header' });

		header.createEl('h2', { text: 'Relationships', cls: 'cr-rv-title' });

		const actions = header.createDiv({ cls: 'cr-rv-actions' });

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
			sort: this.currentSort
		};
	}

	async setState(state: Partial<RelationshipsViewState>): Promise<void> {
		if (state.filter) {
			this.currentFilter = state.filter;
		}
		if (state.sort) {
			this.currentSort = state.sort;
		}
		this.buildUI();
	}
}
