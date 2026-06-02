/**
 * Data Quality Dockable View
 *
 * A workspace ItemView that displays a read-only Data Quality dashboard
 * in a dockable sidebar panel. Shows research gaps, source conflicts,
 * and auto-running vault-wide analysis results.
 */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { renderDataQualityDashboard } from './data-quality-tab';
import type { DataQualityFilter } from './data-quality-tab';

export const VIEW_TYPE_DATA_QUALITY = 'canvas-roots-data-quality';

interface DataQualityViewState {
	filter?: DataQualityFilter;
	search?: string;
}

export class DataQualityView extends ItemView {
	plugin: CanvasRootsPlugin;
	private currentFilter: DataQualityFilter = 'all';
	private currentSearch = '';
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_DATA_QUALITY;
	}

	getDisplayText(): string {
		return 'Data quality';
	}

	getIcon(): string {
		return 'shield-check';
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
		container.addClass('cr-data-quality-view');

		// Header
		this.buildHeader(container);

		// Dashboard content
		const dashboardContainer = container.createDiv({ cls: 'cr-dqv-content' });
		renderDataQualityDashboard({
			container: dashboardContainer,
			plugin: this.plugin,
			initialFilter: this.currentFilter,
			initialSearch: this.currentSearch,
			onStateChange: (filter, search) => {
				this.currentFilter = filter;
				this.currentSearch = search;
			}
		});
	}

	/**
	 * Build the header with title and refresh button
	 */
	private buildHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'cr-dqv-header' });

		header.createEl('h2', { text: 'Data quality', cls: 'cr-dqv-title' });

		const actions = header.createDiv({ cls: 'cr-dqv-actions' });

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
	 * Register event handlers for vault changes.
	 *
	 * Edits and new notes are tracked via `metadataCache.on('changed')` rather
	 * than `vault.on('modify')`: the vault event fires on save, before Obsidian
	 * re-parses the frontmatter, so a refresh triggered off it re-scans the
	 * stale cache and a just-corrected value still reads as missing (#664). The
	 * metadata-cache event fires *after* the re-parse, so the auto-refresh sees
	 * the corrected data. Deletes still use the vault event (no cache to await).
	 */
	private registerEventHandlers(): void {
		this.registerEvent(
			this.app.metadataCache.on('changed', () => this.scheduleRefresh())
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
	getState(): DataQualityViewState {
		return {
			filter: this.currentFilter,
			search: this.currentSearch
		};
	}

	async setState(state: Partial<DataQualityViewState>): Promise<void> {
		if (state.filter) {
			this.currentFilter = state.filter;
		}
		if (state.search !== undefined) {
			this.currentSearch = state.search;
		}
		this.buildUI();
	}
}
