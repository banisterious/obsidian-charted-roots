/* eslint-disable obsidianmd/ui/sentence-case -- Rule misfires on quoted button labels, month names, proper-noun section paths, and example strings; per-site audit deferred. */
/**
 * Data Quality modal classes used by the Data Quality tab
 *
 * Extracted from control-center.ts to reduce file size. Contains all preview
 * modals for batch operations: duplicate relationships, placeholder removal,
 * name normalization, orphaned references, bidirectional inconsistencies,
 * impossible dates, generic batch operations, confirmation dialog, and
 * date validation.
 */

import { App, Modal, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { createLucideIcon } from './lucide-icons';
import type { NormalizationPreview } from '../core/data-quality';
import { pluralize } from '../utils/format-utils';

// ==========================================================================
// DuplicateRelationshipsPreviewModal
// ==========================================================================

/**
 * Modal for previewing duplicate relationship removal
 */
export class DuplicateRelationshipsPreviewModal extends Modal {
	// All changes for this operation
	private allChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }>;
	// Filtered/sorted changes for display
	private filteredChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];
	private onApply: () => Promise<void>;

	// Filter state
	private searchQuery = '';
	private selectedField = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }>,
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

		titleEl.setText('Preview: Remove duplicate relationships');

		// Count display
		this.countEl = contentEl.createEl('p', { cls: 'crc-batch-count' });

		// Controls row: search + filter + sort
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

		// Field filter dropdown (only show if multiple fields)
		const uniqueFields = [...new Set(this.allChanges.map(c => c.field))];
		if (uniqueFields.length > 1) {
			const filterContainer = controlsRow.createDiv({ cls: 'crc-batch-filter' });
			const filterSelect = filterContainer.createEl('select', { cls: 'crc-batch-filter-select' });
			filterSelect.createEl('option', { text: 'All fields', value: 'all' });
			for (const field of uniqueFields.sort()) {
				filterSelect.createEl('option', { text: field, value: field });
			}
			filterSelect.addEventListener('change', () => {
				this.selectedField = filterSelect.value;
				this.applyFiltersAndSort();
			});
		}

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
		headerRow.createEl('th', { text: 'Field' });
		headerRow.createEl('th', { text: 'Current' });
		headerRow.createEl('th', { text: 'After' });
		headerRow.createEl('th', { text: 'Actions' });

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
			text: `Apply ${this.allChanges.length} ${pluralize(this.allChanges.length, 'change')}`,
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
			// Field filter
			if (this.selectedField !== 'all' && change.field !== this.selectedField) {
				return false;
			}
			return true;
		});

		// Sort by person name
		this.filteredChanges.sort((a, b) => {
			const cmp = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? cmp : -cmp;
		});

		// Update count
		if (this.countEl) {
			const peopleCount = new Set(this.allChanges.map(c => c.person.name)).size;
			if (this.filteredChanges.length === this.allChanges.length) {
				this.countEl.textContent = `Found ${this.allChanges.length} duplicate relationship ${pluralize(this.allChanges.length, 'entry', 'entries')} across ${peopleCount} ${pluralize(peopleCount, 'person', 'people')}:`;
			} else {
				this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} duplicate entries:`;
			}
		}

		// Re-render table
		this.renderTable();
	}

	/**
	 * Render the filtered/sorted changes to the table body
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.field });
			// Old value with strikethrough
			const oldCell = row.createEl('td', { cls: 'crc-batch-old-value' });
			oldCell.createEl('s', { text: change.oldValue, cls: 'crc-text--muted' });
			row.createEl('td', { text: change.newValue, cls: 'crc-batch-new-value' });

			// Action buttons (inline)
			const actionCell = row.createEl('td', { cls: 'crc-batch-actions crc-batch-actions--inline' });

			// Open in new tab button
			const openTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new tab' }
			});
			const fileIcon = createLucideIcon('file-text', 14);
			openTabBtn.appendChild(fileIcon);
			openTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('tab').openFile(change.file);
			});

			// Open in new window button
			const openWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new window' }
			});
			const windowIcon = createLucideIcon('external-link', 14);
			openWindowBtn.appendChild(windowIcon);
			openWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.file);
			});
		}

		if (this.filteredChanges.length === 0 && this.allChanges.length > 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: 'No matches found',
				cls: 'crc-text-muted'
			});
			cell.setAttribute('colspan', '5');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// ==========================================================================
// PlaceholderRemovalPreviewModal
// ==========================================================================

/**
 * Modal for previewing placeholder value removal
 */
export class PlaceholderRemovalPreviewModal extends Modal {
	// All changes for this operation
	private allChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }>;
	// Filtered/sorted changes for display
	private filteredChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];
	private onApply: () => Promise<void>;

	// Filter state
	private searchQuery = '';
	private selectedField = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }>,
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

		titleEl.setText('Preview: Remove placeholder values');

		// Description
		const description = contentEl.createDiv({ cls: 'crc-batch-description' });
		description.createEl('p', {
			text: 'This operation removes common placeholder values from GEDCOM imports and data entry mistakes:'
		});
		const useCases = description.createEl('ul');
		useCases.createEl('li', { text: 'Placeholder text: (unknown), Unknown, N/A, ???, Empty, None' });
		useCases.createEl('li', { text: 'Malformed wikilinks: [[unknown) ]] with mismatched brackets' });
		useCases.createEl('li', { text: 'Leading commas in places: ", , , Canada" → "Canada"' });
		useCases.createEl('li', { text: 'Empty parent/spouse fields showing as "Empty"' });

		// Count display
		this.countEl = contentEl.createEl('p', { cls: 'crc-batch-count' });

		// Controls row: search + filter + sort
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

		// Field filter dropdown (only show if multiple fields)
		const uniqueFields = [...new Set(this.allChanges.map(c => c.field))];
		if (uniqueFields.length > 1) {
			const filterContainer = controlsRow.createDiv({ cls: 'crc-batch-filter' });
			const filterSelect = filterContainer.createEl('select', { cls: 'crc-batch-filter-select' });
			filterSelect.createEl('option', { text: 'All fields', value: 'all' });
			for (const field of uniqueFields.sort()) {
				filterSelect.createEl('option', { text: field, value: field });
			}
			filterSelect.addEventListener('change', () => {
				this.selectedField = filterSelect.value;
				this.applyFiltersAndSort();
			});
		}

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
		headerRow.createEl('th', { text: 'Field' });
		headerRow.createEl('th', { text: 'Current' });
		headerRow.createEl('th', { text: 'After' });
		headerRow.createEl('th', { text: 'Actions' });

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
			text: `Apply ${this.allChanges.length} ${pluralize(this.allChanges.length, 'change')}`,
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
			// Field filter
			if (this.selectedField !== 'all' && change.field !== this.selectedField) {
				return false;
			}
			return true;
		});

		// Sort by person name
		this.filteredChanges.sort((a, b) => {
			const cmp = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? cmp : -cmp;
		});

		// Update count
		if (this.countEl) {
			const peopleCount = new Set(this.allChanges.map(c => c.person.name)).size;
			if (this.filteredChanges.length === this.allChanges.length) {
				this.countEl.textContent = `Found ${this.allChanges.length} placeholder ${pluralize(this.allChanges.length, 'value')} across ${peopleCount} ${pluralize(peopleCount, 'person', 'people')}:`;
			} else {
				this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} placeholder values:`;
			}
		}

		// Re-render table
		this.renderTable();
	}

	/**
	 * Render the filtered/sorted changes to the table body
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.field });
			row.createEl('td', { text: change.oldValue, cls: 'crc-batch-old-value' });
			row.createEl('td', { text: change.newValue, cls: 'crc-batch-new-value' });

			// Action buttons
			const actionCell = row.createEl('td', { cls: 'crc-batch-actions crc-batch-actions--inline' });

			// Open in new tab button
			const openTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new tab' }
			});
			const fileIcon = createLucideIcon('file-text', 14);
			openTabBtn.appendChild(fileIcon);
			openTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('tab').openFile(change.file);
			});

			// Open in new window button
			const openWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new window' }
			});
			const windowIcon = createLucideIcon('external-link', 14);
			openWindowBtn.appendChild(windowIcon);
			openWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.file);
			});
		}

		if (this.filteredChanges.length === 0 && this.allChanges.length > 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: 'No matches found',
				cls: 'crc-text-muted'
			});
			cell.setAttribute('colspan', '5');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// ==========================================================================
// NameNormalizationPreviewModal
// ==========================================================================

/**
 * Modal for previewing name formatting normalization
 */
export class NameNormalizationPreviewModal extends Modal {
	// All changes for this operation
	private allChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }>;
	// Filtered/sorted changes for display
	private filteredChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];
	private onApply: () => Promise<void>;

	// Filter state
	private searchQuery = '';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }>,
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

		titleEl.setText('Preview: Normalize name formatting');

		// Description
		const description = contentEl.createDiv({ cls: 'crc-batch-description' });
		description.createEl('p', {
			text: 'This operation standardizes name capitalization and handles surname prefixes:'
		});
		const useCases = description.createEl('ul');
		useCases.createEl('li', { text: 'ALL CAPS names: "JOHN SMITH" → "John Smith"' });
		useCases.createEl('li', { text: 'Lowercase names: "john doe" → "John Doe"' });
		useCases.createEl('li', { text: 'Mac/Mc prefixes: "macdonald" → "MacDonald", "mccarthy" → "McCarthy"' });
		useCases.createEl('li', { text: "O' prefix: \"o'brien\" → \"O'Brien\"" });
		useCases.createEl('li', { text: 'Dutch/German prefixes: "Vincent Van Gogh" → "Vincent van Gogh"' });
		useCases.createEl('li', { text: 'Multiple spaces collapsed to single space' });

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
		headerRow.createEl('th', { text: 'Current name' });
		headerRow.createEl('th', { text: 'Normalized name' });
		headerRow.createEl('th', { text: 'Actions' });

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
			text: `Apply ${this.allChanges.length} ${pluralize(this.allChanges.length, 'change')}`,
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
			const cmp = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? cmp : -cmp;
		});

		// Update count
		if (this.countEl) {
			const peopleCount = new Set(this.allChanges.map(c => c.person.name)).size;
			if (this.filteredChanges.length === this.allChanges.length) {
				this.countEl.textContent = `Found ${this.allChanges.length} ${pluralize(this.allChanges.length, 'name')} to normalize across ${peopleCount} ${pluralize(peopleCount, 'person', 'people')}:`;
			} else {
				this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} names:`;
			}
		}

		// Re-render table
		this.renderTable();
	}

	/**
	 * Render the filtered/sorted changes to the table body
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.oldValue, cls: 'crc-batch-old-value' });
			row.createEl('td', { text: change.newValue, cls: 'crc-batch-new-value' });

			// Action buttons
			const actionCell = row.createEl('td', { cls: 'crc-batch-actions crc-batch-actions--inline' });

			// Open in new tab button
			const openTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new tab' }
			});
			const fileIcon = createLucideIcon('file-text', 14);
			openTabBtn.appendChild(fileIcon);
			openTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('tab').openFile(change.file);
			});

			// Open in new window button
			const openWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new window' }
			});
			const windowIcon = createLucideIcon('external-link', 14);
			openWindowBtn.appendChild(windowIcon);
			openWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.file);
			});
		}

		if (this.filteredChanges.length === 0 && this.allChanges.length > 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: 'No matches found',
				cls: 'crc-text-muted'
			});
			cell.setAttribute('colspan', '4');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// ==========================================================================
// OrphanedRefsPreviewModal
// ==========================================================================

/**
 * Modal for previewing orphaned cr_id reference removal
 */
export class OrphanedRefsPreviewModal extends Modal {
	private allChanges: Array<{ person: { name: string; file: TFile }; field: string; orphanedId: string }>;
	private filteredChanges: Array<{ person: { name: string; file: TFile }; field: string; orphanedId: string }> = [];
	private onApply: () => Promise<void>;

	// Filter state
	private searchQuery = '';
	private selectedField = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{ person: { name: string; file: TFile }; field: string; orphanedId: string }>,
		onApply: () => Promise<void>
	) {
		super(app);
		this.allChanges = changes;
		this.filteredChanges = [...changes];
		this.onApply = onApply;
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;

		this.modalEl.addClass('crc-batch-preview-modal');
		titleEl.setText('Preview: Remove orphaned cr_id references');

		// Description with use cases
		const description = contentEl.createDiv({ cls: 'crc-batch-description' });
		description.createEl('p', {
			text: 'This operation removes broken relationship references (cr_id values) that point to deleted or non-existent person notes:'
		});
		const useCases = description.createEl('ul');
		useCases.createEl('li', { text: 'father_id, mother_id: Parent references' });
		useCases.createEl('li', { text: 'spouse_id, partners_id: Spouse/partner references' });
		useCases.createEl('li', { text: 'children_id: Child references' });
		description.createEl('p', {
			text: 'Note: Only the _id fields are cleaned. Wikilink references (father, mother, spouse, children) are left unchanged.',
			cls: 'crc-text--muted'
		});

		// Search input
		const searchContainer = contentEl.createDiv({ cls: 'crc-filter-container' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search by person name or orphaned ID...',
			cls: 'crc-search-input'
		});
		searchInput.addEventListener('input', (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
			this.applyFiltersAndSort();
		});

		// Field filter dropdown
		const filterContainer = contentEl.createDiv({ cls: 'crc-filter-container' });
		filterContainer.createSpan({ text: 'Filter by field: ', cls: 'crc-filter-label' });
		const fieldSelect = filterContainer.createEl('select', { cls: 'dropdown' });

		const fields = ['all', 'father_id', 'mother_id', 'spouse_id', 'partners_id', 'children_id'];
		fields.forEach(field => {
			const option = fieldSelect.createEl('option', {
				value: field,
				text: field === 'all' ? 'All fields' : field
			});
			if (field === this.selectedField) {
				option.selected = true;
			}
		});

		fieldSelect.addEventListener('change', (e) => {
			this.selectedField = (e.target as HTMLSelectElement).value;
			this.applyFiltersAndSort();
		});

		// Sort toggle
		const sortContainer = contentEl.createDiv({ cls: 'crc-filter-container' });
		const sortButton = sortContainer.createEl('button', {
			text: `Sort: ${this.sortAscending ? 'A-Z' : 'Z-A'}`,
			cls: 'crc-btn-secondary'
		});
		sortButton.addEventListener('click', () => {
			this.sortAscending = !this.sortAscending;
			sortButton.textContent = `Sort: ${this.sortAscending ? 'A-Z' : 'Z-A'}`;
			this.applyFiltersAndSort();
		});

		// Count display
		this.countEl = contentEl.createDiv({ cls: 'crc-batch-count' });

		// Table
		const tableContainer = contentEl.createDiv({ cls: 'crc-table-container' });
		const table = tableContainer.createEl('table', { cls: 'crc-batch-table' });

		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Person' });
		headerRow.createEl('th', { text: 'Field' });
		headerRow.createEl('th', { text: 'Orphaned ID' });
		headerRow.createEl('th', { text: 'Actions' });

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
			text: `Apply ${this.allChanges.length} ${pluralize(this.allChanges.length, 'change')}`,
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

	private applyFiltersAndSort(): void {
		// Filter
		this.filteredChanges = this.allChanges.filter(change => {
			// Search filter
			if (this.searchQuery) {
				const matchesSearch =
					change.person.name.toLowerCase().includes(this.searchQuery) ||
					change.orphanedId.toLowerCase().includes(this.searchQuery);
				if (!matchesSearch) return false;
			}

			// Field filter
			if (this.selectedField !== 'all' && change.field !== this.selectedField) {
				return false;
			}

			return true;
		});

		// Sort
		this.filteredChanges.sort((a, b) => {
			const comparison = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? comparison : -comparison;
		});

		// Render
		this.renderTable();
	}

	private renderTable(): void {
		if (!this.tbody || !this.countEl) return;

		// Update count
		this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} orphaned ${pluralize(this.allChanges.length, 'reference')}`;

		// Clear table
		this.tbody.empty();

		// Render rows
		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.field, cls: 'crc-field-name' });
			row.createEl('td', { text: change.orphanedId, cls: 'crc-monospace' });

			// Action buttons
			const actionCell = row.createEl('td', { cls: 'crc-batch-actions crc-batch-actions--inline' });

			// Open in tab button
			const openTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in tab' }
			});
			const fileIcon = createLucideIcon('file-text', 14);
			openTabBtn.appendChild(fileIcon);
			openTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf().openFile(change.person.file);
			});

			// Open in new window button
			const openWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': 'Open note in new window' }
			});
			const windowIcon = createLucideIcon('external-link', 14);
			openWindowBtn.appendChild(windowIcon);
			openWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.person.file);
			});
		}

		// Empty state
		if (this.filteredChanges.length === 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: this.searchQuery || this.selectedField !== 'all'
					? 'No orphaned references match your filters'
					: 'No orphaned references found',
				cls: 'crc-text--muted'
			});
			cell.colSpan = 4;
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// ==========================================================================
// BidirectionalInconsistencyPreviewModal
// ==========================================================================

/**
 * Modal for previewing bidirectional relationship inconsistencies
 */
export class BidirectionalInconsistencyPreviewModal extends Modal {
	private allChanges: Array<{
		person: { name: string; file: TFile };
		relatedPerson: { name: string; file: TFile };
		type: string;
		description: string;
	}>;
	private filteredChanges: Array<{
		person: { name: string; file: TFile };
		relatedPerson: { name: string; file: TFile };
		type: string;
		description: string;
	}> = [];
	private onApply: () => Promise<void>;

	// Filter state
	private searchQuery = '';
	private selectedType = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{
			person: { name: string; file: TFile };
			relatedPerson: { name: string; file: TFile };
			type: string;
			description: string;
		}>,
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

		titleEl.setText('Preview: Fix bidirectional relationship inconsistencies');

		// Description
		const description = contentEl.createDiv({ cls: 'crc-batch-description' });
		description.createEl('p', {
			text: 'This operation fixes one-way relationships by adding the missing reciprocal links:'
		});
		const useCases = description.createEl('ul');
		useCases.createEl('li', { text: 'Parent lists child, but child doesn\'t list parent' });
		useCases.createEl('li', { text: 'Child lists parent, but parent doesn\'t list child' });
		useCases.createEl('li', { text: 'Person A lists Person B as spouse, but B doesn\'t list A' });

		// Count display
		this.countEl = contentEl.createEl('p', { cls: 'crc-batch-count' });

		// Controls row: search + filter + sort
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

		// Type filter dropdown
		const uniqueTypes = [...new Set(this.allChanges.map(c => c.type))];
		if (uniqueTypes.length > 1) {
			const filterContainer = controlsRow.createDiv({ cls: 'crc-batch-filter' });
			const filterSelect = filterContainer.createEl('select', { cls: 'crc-batch-filter-select' });
			filterSelect.createEl('option', { text: 'All types', value: 'all' });
			for (const type of uniqueTypes.sort()) {
				const displayText = type
					.replace('missing-child-in-parent', 'Missing child in parent')
					.replace('missing-parent-in-child', 'Missing parent in child')
					.replace('missing-spouse-in-spouse', 'Missing spouse link');
				filterSelect.createEl('option', { text: displayText, value: type });
			}
			filterSelect.addEventListener('change', () => {
				this.selectedType = filterSelect.value;
				this.applyFiltersAndSort();
			});
		}

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
		headerRow.createEl('th', { text: 'Related person' });
		headerRow.createEl('th', { text: 'Issue' });
		headerRow.createEl('th', { text: 'Actions' });

		this.tbody = table.createEl('tbody');

		// Initial render
		this.applyFiltersAndSort();

		// Backup warning
		const warning = contentEl.createDiv({ cls: 'crc-warning-callout' });
		const warningIcon = createLucideIcon('alert-triangle', 16);
		warning.appendChild(warningIcon);
		warning.createSpan({
			text: ' Backup your vault before proceeding. This operation will add missing relationship links to notes.'
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-confirmation-buttons' });

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'crc-btn-secondary'
		});
		cancelButton.addEventListener('click', () => this.close());

		const applyButton = buttonContainer.createEl('button', {
			text: `Fix ${this.allChanges.length} ${pluralize(this.allChanges.length, 'inconsistency', 'inconsistencies')}`,
			cls: 'mod-cta'
		});
		applyButton.addEventListener('click', () => {
			void (async () => {
				// Disable buttons during operation
				applyButton.disabled = true;
				cancelButton.disabled = true;
				applyButton.textContent = 'Fixing inconsistencies...';

				// Run the operation
				await this.onApply();

				// Close modal after completion
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
			if (this.searchQuery) {
				const personMatch = change.person.name.toLowerCase().includes(this.searchQuery);
				const relatedMatch = change.relatedPerson.name.toLowerCase().includes(this.searchQuery);
				if (!personMatch && !relatedMatch) {
					return false;
				}
			}
			// Type filter
			if (this.selectedType !== 'all' && change.type !== this.selectedType) {
				return false;
			}
			return true;
		});

		// Sort by person name
		this.filteredChanges.sort((a, b) => {
			const cmp = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? cmp : -cmp;
		});

		// Update count
		if (this.countEl) {
			const peopleCount = new Set(this.allChanges.map(c => c.person.name)).size;
			if (this.filteredChanges.length === this.allChanges.length) {
				this.countEl.textContent = `Found ${this.allChanges.length} ${pluralize(this.allChanges.length, 'inconsistency', 'inconsistencies')} across ${peopleCount} ${pluralize(peopleCount, 'person', 'people')}:`;
			} else {
				this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} inconsistencies:`;
			}
		}

		// Re-render table
		this.renderTable();
	}

	/**
	 * Render the filtered/sorted changes to the table body
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.relatedPerson.name });
			row.createEl('td', { text: change.description });

			// Action buttons cell
			const actionCell = row.createEl('td', { cls: 'crc-batch-actions crc-batch-actions--inline' });

			// Open person in tab
			const openPersonTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': `Open ${change.person.name} in tab` }
			});
			const fileIcon1 = createLucideIcon('file-text', 14);
			openPersonTabBtn.appendChild(fileIcon1);
			openPersonTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf().openFile(change.person.file);
			});

			// Open person in new window
			const openPersonWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': `Open ${change.person.name} in new window` }
			});
			const windowIcon1 = createLucideIcon('external-link', 14);
			openPersonWindowBtn.appendChild(windowIcon1);
			openPersonWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.person.file);
			});

			// Separator
			actionCell.createSpan({ text: ' ', cls: 'crc-batch-actions-separator' });

			// Open related person in tab
			const openRelatedTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': `Open ${change.relatedPerson.name} in tab` }
			});
			const fileIcon2 = createLucideIcon('file-text', 14);
			openRelatedTabBtn.appendChild(fileIcon2);
			openRelatedTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf().openFile(change.relatedPerson.file);
			});

			// Open related person in new window
			const openRelatedWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': `Open ${change.relatedPerson.name} in new window` }
			});
			const windowIcon2 = createLucideIcon('external-link', 14);
			openRelatedWindowBtn.appendChild(windowIcon2);
			openRelatedWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.relatedPerson.file);
			});
		}

		if (this.filteredChanges.length === 0 && this.allChanges.length > 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: 'No matches found',
				cls: 'crc-text-muted'
			});
			cell.setAttribute('colspan', '4');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// ==========================================================================
// ImpossibleDatesPreviewModal
// ==========================================================================

/**
 * Modal for previewing impossible date issues
 */
export class ImpossibleDatesPreviewModal extends Modal {
	private allChanges: Array<{
		person: { name: string; file: TFile };
		relatedPerson?: { name: string; file: TFile };
		type: string;
		description: string;
	}>;
	private filteredChanges: Array<{
		person: { name: string; file: TFile };
		relatedPerson?: { name: string; file: TFile };
		type: string;
		description: string;
	}> = [];

	// Filter state
	private searchQuery = '';
	private selectedType = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		changes: Array<{
			person: { name: string; file: TFile };
			relatedPerson?: { name: string; file: TFile };
			type: string;
			description: string;
		}>
	) {
		super(app);
		this.allChanges = changes;
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;

		// Add modal class for sizing
		this.modalEl.addClass('crc-batch-preview-modal');

		titleEl.setText('Preview: Impossible date issues');

		// Description
		const description = contentEl.createDiv({ cls: 'crc-batch-description' });
		description.createEl('p', {
			text: 'This preview shows logical date errors that need manual review and correction:'
		});
		const useCases = description.createEl('ul');
		useCases.createEl('li', { text: 'Birth after death or death before birth' });
		useCases.createEl('li', { text: 'Unrealistic lifespans (>120 years)' });
		useCases.createEl('li', { text: 'Parents born after children or children born after parent death' });
		useCases.createEl('li', { text: 'Parents too young at child\'s birth (<10 years)' });

		const warningNote = contentEl.createDiv({ cls: 'crc-warning-callout' });
		const warningIcon = createLucideIcon('alert-triangle', 16);
		warningNote.appendChild(warningIcon);
		warningNote.createSpan({
			text: ' This is a preview-only tool. Review the issues and manually correct the dates in the affected notes.'
		});

		// Count display
		this.countEl = contentEl.createEl('p', { cls: 'crc-batch-count' });

		// Controls row: search + filter + sort
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

		// Type filter dropdown
		const uniqueTypes = [...new Set(this.allChanges.map(c => c.type))];
		if (uniqueTypes.length > 1) {
			const filterContainer = controlsRow.createDiv({ cls: 'crc-batch-filter' });
			const filterSelect = filterContainer.createEl('select', { cls: 'crc-batch-filter-select' });
			filterSelect.createEl('option', { text: 'All types', value: 'all' });
			for (const type of uniqueTypes.sort()) {
				const displayText = type
					.replace('birth-after-death', 'Birth after death')
					.replace('unrealistic-lifespan', 'Unrealistic lifespan')
					.replace('parent-born-after-child', 'Parent born after child')
					.replace('parent-died-before-child', 'Parent died before child')
					.replace('parent-too-young', 'Parent too young')
					.replace('child-born-after-parent-death', 'Child born after parent death');
				filterSelect.createEl('option', { text: displayText, value: type });
			}
			filterSelect.addEventListener('change', () => {
				this.selectedType = filterSelect.value;
				this.applyFiltersAndSort();
			});
		}

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
		headerRow.createEl('th', { text: 'Related person' });
		headerRow.createEl('th', { text: 'Issue' });
		headerRow.createEl('th', { text: 'Actions' });

		this.tbody = table.createEl('tbody');

		// Initial render
		this.applyFiltersAndSort();

		// Close button
		const buttonContainer = contentEl.createDiv({ cls: 'crc-confirmation-buttons' });
		const closeButton = buttonContainer.createEl('button', {
			text: 'Close',
			cls: 'mod-cta'
		});
		closeButton.addEventListener('click', () => this.close());
	}

	/**
	 * Apply filters and sorting, then re-render the table
	 */
	private applyFiltersAndSort(): void {
		// Filter
		this.filteredChanges = this.allChanges.filter(change => {
			// Search filter
			if (this.searchQuery) {
				const personMatch = change.person.name.toLowerCase().includes(this.searchQuery);
				const relatedMatch = change.relatedPerson?.name.toLowerCase().includes(this.searchQuery);
				if (!personMatch && !relatedMatch) {
					return false;
				}
			}
			// Type filter
			if (this.selectedType !== 'all' && change.type !== this.selectedType) {
				return false;
			}
			return true;
		});

		// Sort by person name
		this.filteredChanges.sort((a, b) => {
			const cmp = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? cmp : -cmp;
		});

		// Update count
		if (this.countEl) {
			const peopleCount = new Set(this.allChanges.map(c => c.person.name)).size;
			if (this.filteredChanges.length === this.allChanges.length) {
				this.countEl.textContent = `Found ${this.allChanges.length} ${pluralize(this.allChanges.length, 'issue')} across ${peopleCount} ${pluralize(peopleCount, 'person', 'people')}:`;
			} else {
				this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} issues:`;
			}
		}

		// Re-render table
		this.renderTable();
	}

	/**
	 * Render the filtered/sorted changes to the table body
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const row = this.tbody.createEl('tr');
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.relatedPerson?.name || '\u2014' });
			row.createEl('td', { text: change.description });

			// Action buttons cell
			const actionCell = row.createEl('td', { cls: 'crc-batch-actions crc-batch-actions--inline' });

			// Open person in tab
			const openPersonTabBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': `Open ${change.person.name} in tab` }
			});
			const fileIcon1 = createLucideIcon('file-text', 14);
			openPersonTabBtn.appendChild(fileIcon1);
			openPersonTabBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf().openFile(change.person.file);
			});

			// Open person in new window
			const openPersonWindowBtn = actionCell.createEl('button', {
				cls: 'crc-batch-action-btn clickable-icon',
				attr: { 'aria-label': `Open ${change.person.name} in new window` }
			});
			const windowIcon1 = createLucideIcon('external-link', 14);
			openPersonWindowBtn.appendChild(windowIcon1);
			openPersonWindowBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf('window').openFile(change.person.file);
			});

			// If there's a related person, add buttons for them too
			if (change.relatedPerson) {
				// Separator
				actionCell.createSpan({ text: ' ', cls: 'crc-batch-actions-separator' });

				// Open related person in tab
				const openRelatedTabBtn = actionCell.createEl('button', {
					cls: 'crc-batch-action-btn clickable-icon',
					attr: { 'aria-label': `Open ${change.relatedPerson.name} in tab` }
				});
				const fileIcon2 = createLucideIcon('file-text', 14);
				openRelatedTabBtn.appendChild(fileIcon2);
				openRelatedTabBtn.addEventListener('click', () => {
					void this.app.workspace.getLeaf().openFile(change.relatedPerson!.file);
				});

				// Open related person in new window
				const openRelatedWindowBtn = actionCell.createEl('button', {
					cls: 'crc-batch-action-btn clickable-icon',
					attr: { 'aria-label': `Open ${change.relatedPerson.name} in new window` }
				});
				const windowIcon2 = createLucideIcon('external-link', 14);
				openRelatedWindowBtn.appendChild(windowIcon2);
				openRelatedWindowBtn.addEventListener('click', () => {
					void this.app.workspace.getLeaf('window').openFile(change.relatedPerson!.file);
				});
			}
		}

		if (this.filteredChanges.length === 0 && this.allChanges.length > 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: 'No matches found',
				cls: 'crc-text-muted'
			});
			cell.setAttribute('colspan', '4');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// ==========================================================================
// BatchPreviewModal
// ==========================================================================

/**
 * Modal for previewing batch operation changes
 */
export class BatchPreviewModal extends Modal {
	private operation: 'dates' | 'sex' | 'orphans' | 'legacy_type' | 'missing_ids';
	private preview: NormalizationPreview;
	private onApply: () => Promise<void>;
	private sexNormalizationDisabled: boolean;

	// All changes for this operation
	private allChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string }> = [];
	// Filtered/sorted changes for display
	private filteredChanges: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string }> = [];

	// Filter state
	private searchQuery = '';
	private selectedField = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		operation: 'dates' | 'sex' | 'orphans' | 'legacy_type' | 'missing_ids',
		preview: NormalizationPreview,
		onApply: () => Promise<void>,
		sexNormalizationDisabled = false
	) {
		super(app);
		this.operation = operation;
		this.preview = preview;
		this.onApply = onApply;
		this.sexNormalizationDisabled = sexNormalizationDisabled;
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;

		// Add modal class for sizing
		this.modalEl.addClass('crc-batch-preview-modal');

		// Set title based on operation
		const titles: Record<string, string> = {
			dates: 'Preview: Date normalization',
			sex: 'Preview: Sex normalization',
			orphans: 'Preview: Clear orphan references',
			legacy_type: 'Preview: Migrate legacy type property',
			missing_ids: 'Preview: Repair missing relationship IDs',
		};
		titleEl.setText(titles[this.operation]);

		// Add operation-specific descriptions
		if (this.operation === 'sex') {
			contentEl.createEl('p', {
				text: 'Genealogical records use biological sex (M/F) rather than gender identity, as historical documents and DNA analysis require this distinction.',
				cls: 'crc-text-muted crc-text-small'
			});

			// Show disabled mode warning
			if (this.sexNormalizationDisabled) {
				const disabledWarning = contentEl.createDiv({ cls: 'crc-info-callout' });
				const infoIcon = createLucideIcon('info', 16);
				disabledWarning.appendChild(infoIcon);
				disabledWarning.createSpan({
					text: ' Sex normalization is disabled. The preview below shows what would be changed, but no changes will be applied. Change this in Settings \u2192 Charted Roots \u2192 Sex & gender.'
				});
			}
		} else if (this.operation === 'missing_ids') {
			contentEl.createEl('p', {
				text: 'Populates missing _id fields by resolving wikilinks to their cr_id values. This improves relationship reliability when notes are renamed.',
				cls: 'crc-text-muted crc-text-small'
			});

			// Show unresolvable wikilinks warning if any
			if (this.preview.unresolvableWikilinks.length > 0) {
				const warningDiv = contentEl.createDiv({ cls: 'crc-warning-callout' });
				const warningIcon = createLucideIcon('alert-triangle', 16);
				warningDiv.appendChild(warningIcon);
				warningDiv.createSpan({
					text: ` ${this.preview.unresolvableWikilinks.length} wikilink(s) could not be resolved (broken links, ambiguous targets, or targets missing cr_id). These will be skipped.`
				});
			}
		}

		// Get changes for this operation
		switch (this.operation) {
			case 'dates':
				this.allChanges = [...this.preview.dateNormalization];
				break;
			case 'sex':
				this.allChanges = [...this.preview.genderNormalization];
				break;
			case 'orphans':
				this.allChanges = [...this.preview.orphanClearing];
				break;
			case 'legacy_type':
				this.allChanges = [...this.preview.legacyTypeMigration];
				break;
			case 'missing_ids':
				// Convert MissingIdRepair to the standard change format
				this.allChanges = this.preview.missingIdRepairs.map(repair => ({
					person: { name: repair.person.name },
					field: repair.field.replace(/s$/, '') + '_id' + (repair.arrayIndex !== undefined ? `[${repair.arrayIndex}]` : ''),
					oldValue: '(missing)',
					newValue: repair.resolvedCrId
				}));
				break;
		}

		if (this.allChanges.length === 0) {
			contentEl.createEl('p', {
				text: 'No changes needed. All values are already in the correct format.',
				cls: 'crc-text-muted'
			});
		} else {
			// Count display
			this.countEl = contentEl.createEl('p', { cls: 'crc-batch-count' });

			// Controls row: search + filter + sort
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

			// Field filter dropdown (only show if multiple fields)
			const uniqueFields = [...new Set(this.allChanges.map(c => c.field))];
			if (uniqueFields.length > 1) {
				const filterContainer = controlsRow.createDiv({ cls: 'crc-batch-filter' });
				const filterSelect = filterContainer.createEl('select', { cls: 'crc-batch-filter-select' });
				filterSelect.createEl('option', { text: 'All fields', value: 'all' });
				for (const field of uniqueFields.sort()) {
					filterSelect.createEl('option', { text: field, value: field });
				}
				filterSelect.addEventListener('change', () => {
					this.selectedField = filterSelect.value;
					this.applyFiltersAndSort();
				});
			}

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
			const thead = table.createEl('thead');
			const headerRow = thead.createEl('tr');
			headerRow.createEl('th', { text: 'Person' });
			headerRow.createEl('th', { text: 'Field' });
			headerRow.createEl('th', { text: 'Current' });
			headerRow.createEl('th', { text: 'New' });

			this.tbody = table.createEl('tbody');

			// Initial render
			this.applyFiltersAndSort();
		}

		// Show skipped notes for sex operation (schema-aware mode)
		if (this.operation === 'sex' && this.preview.genderSkipped.length > 0) {
			const skippedSection = contentEl.createDiv({ cls: 'crc-batch-skipped-section' });
			const skippedHeader = skippedSection.createDiv({ cls: 'crc-batch-skipped-header' });
			const infoIcon = createLucideIcon('info', 16);
			skippedHeader.appendChild(infoIcon);
			skippedHeader.createSpan({
				text: ` ${this.preview.genderSkipped.length} ${pluralize(this.preview.genderSkipped.length, 'note')} skipped (schema override)`
			});

			// Collapsible details
			const detailsContainer = skippedSection.createEl('details', { cls: 'crc-batch-skipped-details' });
			detailsContainer.createEl('summary', { text: 'Show skipped notes' });

			const skippedList = detailsContainer.createEl('ul', { cls: 'crc-batch-skipped-list' });
			for (const skipped of this.preview.genderSkipped) {
				const item = skippedList.createEl('li');
				item.createSpan({ text: skipped.person.name, cls: 'crc-batch-skipped-name' });
				item.createSpan({
					text: ` (${skipped.currentValue}) \u2014 schema: ${skipped.schemaName}`,
					cls: 'crc-text-muted'
				});
			}
		}

		// Backup warning (don't show if normalization is disabled for this operation)
		if (this.allChanges.length > 0 && !this.sexNormalizationDisabled) {
			const warning = contentEl.createDiv({ cls: 'crc-warning-callout' });
			const warningIcon = createLucideIcon('alert-triangle', 16);
			warning.appendChild(warningIcon);
			warning.createSpan({
				text: ' Backup your vault before proceeding. This operation will modify existing notes.'
			});
		}

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-confirmation-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: this.sexNormalizationDisabled ? 'Close' : 'Cancel',
			cls: 'crc-btn-secondary'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		// Don't show Apply button if sex normalization is disabled
		if (this.sexNormalizationDisabled) {
			// No Apply button when disabled - user already sees the info callout
			return;
		}

		// Count actual changes (excluding unrecognized entries that won't be modified)
		const actualChanges = this.allChanges.filter(c => !c.newValue.includes('(unrecognized'));
		if (actualChanges.length > 0) {
			const applyBtn = buttonContainer.createEl('button', {
				text: `Apply ${actualChanges.length} ${pluralize(actualChanges.length, 'change')}`,
				cls: 'mod-cta'
			});
			applyBtn.addEventListener('click', () => {
				void (async () => {
					// Disable buttons during operation
					applyBtn.disabled = true;
					cancelBtn.disabled = true;
					applyBtn.textContent = 'Applying changes...';

					// Run the operation
					await this.onApply();

					// Show completion and enable close
					applyBtn.textContent = '\u2713 Changes applied';
					applyBtn.addClass('crc-btn-success');
					cancelBtn.textContent = 'Close';
					cancelBtn.disabled = false;

					// Update count to show completion
					if (this.countEl) {
						this.countEl.textContent = `\u2713 Successfully applied ${actualChanges.length} ${pluralize(actualChanges.length, 'change')}`;
					}
				})();
			});
		} else if (this.allChanges.length > 0) {
			// Only unrecognized values, no actual changes to apply
			contentEl.createEl('p', {
				text: 'No normalizable values found. The listed values are unrecognized and will not be changed.',
				cls: 'crc-text-muted'
			});
		}
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
			// Field filter
			if (this.selectedField !== 'all' && change.field !== this.selectedField) {
				return false;
			}
			return true;
		});

		// Sort by person name
		this.filteredChanges.sort((a, b) => {
			const cmp = a.person.name.localeCompare(b.person.name);
			return this.sortAscending ? cmp : -cmp;
		});

		// Update count
		if (this.countEl) {
			if (this.filteredChanges.length === this.allChanges.length) {
				this.countEl.textContent = `${this.allChanges.length} ${pluralize(this.allChanges.length, 'change')} will be made:`;
			} else {
				this.countEl.textContent = `Showing ${this.filteredChanges.length} of ${this.allChanges.length} changes:`;
			}
		}

		// Re-render table
		this.renderTable();
	}

	/**
	 * Render the filtered/sorted changes to the table body
	 */
	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const change of this.filteredChanges) {
			const isUnrecognized = change.newValue.includes('(unrecognized');
			const row = this.tbody.createEl('tr');
			if (isUnrecognized) {
				row.addClass('crc-batch-unrecognized-row');
			}
			row.createEl('td', { text: change.person.name });
			row.createEl('td', { text: change.field });
			row.createEl('td', {
				text: change.oldValue,
				cls: isUnrecognized ? 'crc-batch-unrecognized-value' : 'crc-batch-old-value'
			});
			row.createEl('td', {
				text: change.newValue,
				cls: isUnrecognized ? 'crc-text-muted' : 'crc-batch-new-value'
			});
		}

		if (this.filteredChanges.length === 0 && this.allChanges.length > 0) {
			const row = this.tbody.createEl('tr');
			const cell = row.createEl('td', {
				text: 'No matches found',
				cls: 'crc-text-muted crc-text--center'
			});
			cell.setAttribute('colspan', '4');
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// ==========================================================================
// ConfirmationModal
// ==========================================================================

/**
 * Simple confirmation modal for destructive actions
 */
export class ConfirmationModal extends Modal {
	private title: string;
	private message: string;
	private onResult: (confirmed: boolean) => void;

	constructor(app: App, title: string, message: string, onResult: (confirmed: boolean) => void) {
		super(app);
		this.title = title;
		this.message = message;
		this.onResult = onResult;
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;
		titleEl.setText(this.title);

		contentEl.createEl('p', { text: this.message });

		const buttonContainer = contentEl.createDiv({ cls: 'crc-confirmation-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'crc-btn-secondary'
		});
		cancelBtn.addEventListener('click', () => {
			this.onResult(false);
			this.close();
		});

		const confirmBtn = buttonContainer.createEl('button', {
			text: 'Continue',
			cls: 'mod-warning'
		});
		confirmBtn.addEventListener('click', () => {
			this.onResult(true);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// ==========================================================================
// DateValidationPreviewModal
// ==========================================================================

/**
 * Modal for previewing date validation issues
 */
export class DateValidationPreviewModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private allIssues: Array<{
		file: TFile;
		name: string;
		field: string;
		value: string;
		issue: string;
	}>;
	private filteredIssues: Array<{
		file: TFile;
		name: string;
		field: string;
		value: string;
		issue: string;
	}> = [];

	// Filter state
	private searchQuery = '';
	private selectedField = 'all';
	private sortAscending = true;

	// UI elements
	private tbody: HTMLTableSectionElement | null = null;
	private countEl: HTMLElement | null = null;

	constructor(
		app: App,
		plugin: CanvasRootsPlugin,
		issues: Array<{
			file: TFile;
			name: string;
			field: string;
			value: string;
			issue: string;
		}>
	) {
		super(app);
		this.plugin = plugin;
		this.allIssues = issues;
		this.filteredIssues = [...issues];
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;

		this.modalEl.addClass('crc-batch-preview-modal');
		titleEl.setText('Preview: Date format validation issues');

		// Summary
		const summaryEl = contentEl.createDiv({ cls: 'crc-batch-summary' });
		summaryEl.createEl('p', {
			text: `Found ${this.allIssues.length} ${pluralize(this.allIssues.length, 'date')} with format issues.`,
			cls: 'crc-batch-summary-text'
		});
		this.countEl = summaryEl.createEl('p', {
			text: `Showing ${this.filteredIssues.length} of ${this.allIssues.length}`,
			cls: 'crc-batch-summary-count'
		});

		// Search and filter controls
		const controlsEl = contentEl.createDiv({ cls: 'crc-batch-controls' });

		// Search input
		const searchContainer = controlsEl.createDiv({ cls: 'crc-batch-control' });
		searchContainer.createEl('label', { text: 'Search:', cls: 'crc-batch-label' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Filter by person name...',
			cls: 'crc-batch-search'
		});
		searchInput.addEventListener('input', () => {
			this.searchQuery = searchInput.value.toLowerCase();
			this.applyFiltersAndRender();
		});

		// Field filter dropdown
		const fieldContainer = controlsEl.createDiv({ cls: 'crc-batch-control' });
		fieldContainer.createEl('label', { text: 'Field:', cls: 'crc-batch-label' });
		const fieldSelect = fieldContainer.createEl('select', { cls: 'crc-batch-select' });

		const fieldOptions = [
			{ value: 'all', label: 'All fields' },
			{ value: 'born', label: 'Birth dates' },
			{ value: 'birth_date', label: 'Birth dates (birth_date)' },
			{ value: 'died', label: 'Death dates' },
			{ value: 'death_date', label: 'Death dates (death_date)' }
		];

		for (const opt of fieldOptions) {
			fieldSelect.createEl('option', {
				value: opt.value,
				text: opt.label
			});
		}

		fieldSelect.addEventListener('change', () => {
			this.selectedField = fieldSelect.value;
			this.applyFiltersAndRender();
		});

		// Sort toggle
		const sortContainer = controlsEl.createDiv({ cls: 'crc-batch-control' });
		sortContainer.createEl('label', { text: 'Sort:', cls: 'crc-batch-label' });
		const sortBtn = sortContainer.createEl('button', {
			text: this.sortAscending ? 'A \u2192 Z' : 'Z \u2192 A',
			cls: 'crc-batch-sort-btn'
		});
		sortBtn.addEventListener('click', () => {
			this.sortAscending = !this.sortAscending;
			sortBtn.setText(this.sortAscending ? 'A \u2192 Z' : 'Z \u2192 A');
			this.applyFiltersAndRender();
		});

		// Table
		const tableContainer = contentEl.createDiv({ cls: 'crc-batch-table-container' });
		const table = tableContainer.createEl('table', { cls: 'crc-batch-table' });

		// Table header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Person' });
		headerRow.createEl('th', { text: 'Field' });
		headerRow.createEl('th', { text: 'Current value' });
		headerRow.createEl('th', { text: 'Issue' });
		headerRow.createEl('th', { text: 'Action' });

		// Table body
		this.tbody = table.createEl('tbody');

		// Render initial data
		this.renderTable();

		// Info box
		const infoEl = contentEl.createDiv({ cls: 'crc-batch-info' });
		const infoIcon = infoEl.createEl('span', { cls: 'crc-batch-info-icon' });
		setIcon(infoIcon, 'info');
		infoEl.createEl('span', {
			text: 'Date validation is preview-only. Click "Open note" to manually correct each date. Configure validation rules in Settings \u2192 Charted Roots \u2192 Dates & validation.'
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-batch-buttons' });

		const closeBtn = buttonContainer.createEl('button', {
			text: 'Close',
			cls: 'mod-cta'
		});
		closeBtn.addEventListener('click', () => {
			this.close();
		});
	}

	private applyFiltersAndRender(): void {
		// Apply search filter
		let filtered = this.allIssues.filter(issue =>
			issue.name.toLowerCase().includes(this.searchQuery)
		);

		// Apply field filter
		if (this.selectedField !== 'all') {
			filtered = filtered.filter(issue => issue.field === this.selectedField);
		}

		// Apply sort
		filtered.sort((a, b) => {
			const aName = a.name.toLowerCase();
			const bName = b.name.toLowerCase();
			return this.sortAscending
				? aName.localeCompare(bName)
				: bName.localeCompare(aName);
		});

		this.filteredIssues = filtered;

		// Update count
		if (this.countEl) {
			this.countEl.setText(`Showing ${this.filteredIssues.length} of ${this.allIssues.length}`);
		}

		// Re-render table
		this.renderTable();
	}

	private renderTable(): void {
		if (!this.tbody) return;

		this.tbody.empty();

		for (const issue of this.filteredIssues) {
			const row = this.tbody.createEl('tr');

			// Person name
			row.createEl('td', { text: issue.name });

			// Field
			row.createEl('td', { text: issue.field });

			// Current value
			row.createEl('td', {
				text: issue.value,
				cls: 'crc-batch-value'
			});

			// Issue
			row.createEl('td', {
				text: issue.issue,
				cls: 'crc-batch-issue'
			});

			// Action: Open note button
			const actionCell = row.createEl('td');
			const openBtn = actionCell.createEl('button', {
				text: 'Open note',
				cls: 'crc-batch-action-btn'
			});
			openBtn.addEventListener('click', () => {
				void this.app.workspace.getLeaf().openFile(issue.file);
			});
		}

		// Show empty state if no results
		if (this.filteredIssues.length === 0) {
			const emptyRow = this.tbody.createEl('tr');
			const emptyCell = emptyRow.createEl('td', {
				attr: { colspan: '5' },
				cls: 'crc-batch-empty'
			});
			emptyCell.createEl('p', {
				text: 'No issues match the current filters'
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}