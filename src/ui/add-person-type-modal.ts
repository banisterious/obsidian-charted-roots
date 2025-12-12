import { App, Modal, TFile } from 'obsidian';
import { createLucideIcon } from './lucide-icons';

/**
 * Preview modal for adding cr_type property to person notes
 */
export class AddPersonTypePreviewModal extends Modal {
	private allChanges: Array<{ person: { name: string }; file: TFile }>;
	private filteredChanges: Array<{ person: { name: string }; file: TFile }> = [];
	private onApply: () => Promise<void>;

	// Filter state
	private searchQuery = '';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{ person: { name: string }; file: TFile }>,
		onApply: () => Promise<void>
	) {
		super(app);
		this.allChanges = changes;
		this.onApply = onApply;
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;

		// Add modal class for sizing
		this.modalEl.addClass('crc-batch-preview-modal');

		titleEl.setText('Preview: Add cr_type property to person notes');

		// Description
		const description = contentEl.createDiv({ cls: 'crc-batch-description' });
		description.createEl('p', {
			text: 'This operation will add "cr_type: person" to all person notes that don\'t already have it. This is recommended for better compatibility and ensures all batch operations can find your person notes reliably.'
		});

		// Count display
		this.countEl = contentEl.createEl('p', { cls: 'crc-batch-count' });

		// Controls row: search + sort
		const controlsRow = contentEl.createDiv({ cls: 'crc-batch-controls' });

		// Search input
		const searchContainer = controlsRow.createDiv({ cls: 'crc-batch-search' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search by name...',
			cls: 'crc-batch-search-input'
		});
		searchInput.addEventListener('input', () => {
			this.searchQuery = searchInput.value.toLowerCase();
			this.applyFiltersAndSort();
		});

		// Sort toggle
		const sortContainer = controlsRow.createDiv({ cls: 'crc-batch-sort' });
		const sortBtn = sortContainer.createEl('button', {
			text: 'A→Z',
			cls: 'crc-batch-sort-btn'
		});
		sortBtn.addEventListener('click', () => {
			this.sortAscending = !this.sortAscending;
			sortBtn.textContent = this.sortAscending ? 'A→Z' : 'Z→A';
			this.applyFiltersAndSort();
		});

		// Scrollable table container
		const tableContainer = contentEl.createDiv({ cls: 'crc-batch-table-container' });
		const table = tableContainer.createEl('table', { cls: 'crc-batch-preview-table' });

		// Header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Person' });
		headerRow.createEl('th', { text: 'Action' });

		this.tbody = table.createEl('tbody');

		// Initial render
		this.applyFiltersAndSort();

		// Backup warning
		const warning = contentEl.createDiv({ cls: 'crc-warning-callout' });
		const warningIcon = createLucideIcon('alert-triangle', 16);
		warning.appendChild(warningIcon);
		warning.createSpan({
			text: ' Backup your vault before proceeding. This operation will modify existing notes.'
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-confirmation-buttons' });

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'crc-btn-secondary'
		});
		cancelButton.addEventListener('click', () => this.close());

		const applyButton = buttonContainer.createEl('button', {
			text: `Apply to ${this.allChanges.length} note${this.allChanges.length === 1 ? '' : 's'}`,
			cls: 'mod-cta'
		});
		applyButton.addEventListener('click', () => {
			void (async () => {
				// Disable buttons during operation
				applyButton.disabled = true;
				cancelButton.disabled = true;
				applyButton.textContent = 'Applying changes...';

				// Run the operation
				await this.onApply();

				// Close the modal after completion (like BuildPlaceHierarchyModal)
				// This avoids stale cache issues when user reopens the preview
				this.close();
			})();
		});
	}

	/**
	 * Apply filters and sorting, then re-render the table
	 */
	private applyFiltersAndSort(): void {
		// Filter
		this.filteredChanges = this.allChanges.filter(change => {
			// Search filter
			if (this.searchQuery && !change.person.name.toLowerCase().includes(this.searchQuery)) {
				return false;
			}
			return true;
		});

		// Sort by person name
		this.filteredChanges.sort((a, b) => {
			const comparison = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? comparison : -comparison;
		});

		// Update count
		if (this.countEl) {
			this.countEl.textContent = `Found ${this.filteredChanges.length} of ${this.allChanges.length} person note${this.allChanges.length === 1 ? '' : 's'} needing cr_type property`;
		}

		// Render table
		this.renderTable();
	}

	/**
	 * Render the table with current filtered/sorted data
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		// Clear existing rows
		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');

			// Person name
			row.createEl('td', { text: change.person.name });

			// Action description
			row.createEl('td', {
				text: 'Add cr_type: person',
				cls: 'crc-batch-value'
			});
		}

		// Show empty state if no results
		if (this.filteredChanges.length === 0) {
			const emptyRow = this.tbody.createEl('tr');
			const emptyCell = emptyRow.createEl('td', {
				attr: { colspan: '2' },
				cls: 'crc-batch-empty'
			});
			emptyCell.createEl('p', {
				text: 'No person notes match the search'
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
