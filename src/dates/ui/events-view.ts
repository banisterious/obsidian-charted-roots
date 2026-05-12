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
	search?: string;
}

export class EventsView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentTypeFilter = '';
	private currentPersonFilter = '';
	private currentSearch = '';
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

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
			activeWindow.clearTimeout(this.refreshTimeout);
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
			initialSearch: this.currentSearch,
			onStateChange: (typeFilter, personFilter, search) => {
				this.currentTypeFilter = typeFilter;
				this.currentPersonFilter = personFilter;
				this.currentSearch = search;
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
			activeWindow.clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = activeWindow.setTimeout(() => {
			this.refreshTimeout = null;
			this.refresh();
		}, 2000);
	}

	// State persistence
	getState(): EventsViewState {
		return {
			typeFilter: this.currentTypeFilter,
			personFilter: this.currentPersonFilter,
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
		if (state.search !== undefined) {
			this.currentSearch = state.search;
		}
		this.buildUI();
	}
}
