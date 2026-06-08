/**
 * Collections Dockable View
 *
 * A workspace ItemView that displays the collections list in a dockable
 * sidebar panel. Uses `renderCollectionsList()` for a simplified browsable
 * list, independent of the Control Center modal's full-featured collections tab.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { renderCollectionsList } from './collections-tab';
import type { CollectionBrowseMode } from './collections-tab';

export const VIEW_TYPE_COLLECTIONS = 'canvas-roots-collections';

interface CollectionsViewState {
	mode?: CollectionBrowseMode;
	search?: string;
}

export class CollectionsView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentMode: CollectionBrowseMode = 'families';
	private currentSearch = '';
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_COLLECTIONS;
	}

	getDisplayText(): string {
		return 'Collections';
	}

	getIcon(): string {
		return 'folder-tree';
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
		container.addClass('cr-collections-view');

		// Header
		this.buildHeader(container);

		// List content
		const listContainer = container.createDiv({ cls: 'cr-cv-content' });
		renderCollectionsList({
			container: listContainer,
			plugin: this.plugin,
			initialMode: this.currentMode,
			initialSearch: this.currentSearch,
			onStateChange: (mode, search) => {
				this.currentMode = mode;
				this.currentSearch = search;
			}
		});
	}

	/**
	 * Build the header with title and refresh button
	 */
	private buildHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'cr-cv-header' });

		header.createEl('h2', { text: 'Collections', cls: 'cr-cv-title' });

		const actions = header.createDiv({ cls: 'cr-cv-actions' });

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
			mode: this.currentMode,
			search: this.currentSearch
		};
	}

	async setState(state: Partial<CollectionsViewState>): Promise<void> {
		if (state.mode) {
			this.currentMode = state.mode;
		}
		if (state.search !== undefined) {
			this.currentSearch = state.search;
		}
		this.buildUI();
	}
}
