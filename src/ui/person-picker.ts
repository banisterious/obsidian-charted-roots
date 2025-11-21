import { App, Modal, TFile } from 'obsidian';
import { createLucideIcon } from './lucide-icons';

/**
 * Person data extracted from note frontmatter
 */
export interface PersonInfo {
	name: string;
	crId: string;
	birthDate?: string;
	deathDate?: string;
	sex?: string;
	file: TFile;
}

/**
 * Sort options for person list
 */
type SortOption = 'name-asc' | 'name-desc' | 'birth-asc' | 'birth-desc' | 'recent';

/**
 * Filter options for person list
 */
interface FilterOptions {
	livingStatus: 'all' | 'living' | 'deceased';
	hasBirthDate: 'all' | 'yes' | 'no';
	sex: 'all' | 'M' | 'F';
}

/**
 * Person Picker Modal
 * Allows users to search and select a person from the vault
 */
export class PersonPickerModal extends Modal {
	private searchQuery: string = '';
	private allPeople: PersonInfo[] = [];
	private filteredPeople: PersonInfo[] = [];
	private onSelect: (person: PersonInfo) => void;
	private searchInput: HTMLInputElement;
	private resultsContainer: HTMLElement;
	private sortOption: SortOption = 'name-asc';
	private filters: FilterOptions = {
		livingStatus: 'all',
		hasBirthDate: 'all',
		sex: 'all'
	};

	constructor(app: App, onSelect: (person: PersonInfo) => void) {
		super(app);
		this.onSelect = onSelect;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('crc-person-picker-modal');

		// Load all people from vault
		await this.loadPeople();

		// Create modal structure
		this.createModalContent();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Load all person notes from the vault
	 */
	private async loadPeople(): Promise<void> {
		this.allPeople = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const personInfo = await this.extractPersonInfo(file);
			if (personInfo) {
				this.allPeople.push(personInfo);
			}
		}

		// Initial sort by name
		this.sortPeople();
		this.filteredPeople = [...this.allPeople];
	}

	/**
	 * Sort people based on current sort option
	 */
	private sortPeople(): void {
		switch (this.sortOption) {
			case 'name-asc':
				this.allPeople.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'name-desc':
				this.allPeople.sort((a, b) => b.name.localeCompare(a.name));
				break;
			case 'birth-asc':
				this.allPeople.sort((a, b) => this.compareBirthDates(a.birthDate, b.birthDate, true));
				break;
			case 'birth-desc':
				this.allPeople.sort((a, b) => this.compareBirthDates(a.birthDate, b.birthDate, false));
				break;
			case 'recent':
				this.allPeople.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
				break;
		}
	}

	/**
	 * Compare birth dates for sorting
	 * @param ascending - true for oldest first, false for youngest first
	 */
	private compareBirthDates(dateA: string | undefined, dateB: string | undefined, ascending: boolean): number {
		// Put people without birth dates at the end
		if (!dateA && !dateB) return 0;
		if (!dateA) return 1;
		if (!dateB) return -1;

		// Parse dates - try to extract year from various formats
		const yearA = this.extractYear(dateA);
		const yearB = this.extractYear(dateB);

		if (yearA === null && yearB === null) return 0;
		if (yearA === null) return 1;
		if (yearB === null) return -1;

		return ascending ? yearA - yearB : yearB - yearA;
	}

	/**
	 * Extract year from a date string (supports various formats)
	 */
	private extractYear(dateStr: string): number | null {
		// Try to match a 4-digit year
		const yearMatch = dateStr.match(/\b(\d{4})\b/);
		if (yearMatch) {
			return parseInt(yearMatch[1], 10);
		}
		return null;
	}

	/**
	 * Extract person information from a note file
	 */
	private async extractPersonInfo(file: TFile): Promise<PersonInfo | null> {
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache || !cache.frontmatter) {
				return null;
			}

			const fm = cache.frontmatter;

			// Must have cr_id to be a valid person note
			if (!fm.cr_id) {
				return null;
			}

			// Extract name (from frontmatter or filename)
			const name = fm.name || file.basename;

			return {
				name,
				crId: fm.cr_id,
				birthDate: fm.born || fm.birth_date,
				deathDate: fm.died || fm.death_date,
				sex: fm.sex || fm.gender,
				file
			};
		} catch (error) {
			console.error('Error extracting person info from file:', file.path, error);
			return null;
		}
	}

	/**
	 * Create the modal content
	 */
	private createModalContent(): void {
		const { contentEl } = this;

		// Header
		const header = contentEl.createDiv({ cls: 'crc-picker-header' });
		const titleSection = header.createDiv({ cls: 'crc-picker-title' });
		const icon = createLucideIcon('users', 20);
		titleSection.appendChild(icon);
		titleSection.appendText('Select Person');

		// Search and sort section
		const searchSection = contentEl.createDiv({ cls: 'crc-picker-search' });

		// Search input
		this.searchInput = searchSection.createEl('input', {
			cls: 'crc-form-input',
			attr: {
				type: 'text',
				placeholder: 'Search by name...'
			}
		});

		this.searchInput.addEventListener('input', () => {
			this.searchQuery = this.searchInput.value.toLowerCase();
			this.filterPeople();
		});

		// Auto-focus search input
		setTimeout(() => this.searchInput.focus(), 50);

		// Sort dropdown
		const sortContainer = contentEl.createDiv({ cls: 'crc-picker-sort' });
		const sortLabel = sortContainer.createSpan({ cls: 'crc-picker-sort__label', text: 'Sort by:' });
		const sortSelect = sortContainer.createEl('select', { cls: 'crc-form-select' });

		const sortOptions: Array<{ value: SortOption; label: string }> = [
			{ value: 'name-asc', label: 'Name (A-Z)' },
			{ value: 'name-desc', label: 'Name (Z-A)' },
			{ value: 'birth-asc', label: 'Birth year (oldest first)' },
			{ value: 'birth-desc', label: 'Birth year (youngest first)' },
			{ value: 'recent', label: 'Recently modified' }
		];

		sortOptions.forEach(opt => {
			const option = sortSelect.createEl('option', { value: opt.value, text: opt.label });
			if (opt.value === this.sortOption) {
				option.selected = true;
			}
		});

		sortSelect.addEventListener('change', () => {
			this.sortOption = sortSelect.value as SortOption;
			this.sortPeople();
			this.filteredPeople = [...this.allPeople];
			this.filterPeople();
		});

		// Filters section
		const filtersContainer = contentEl.createDiv({ cls: 'crc-picker-filters' });

		// Living status filter
		const livingFilter = filtersContainer.createDiv({ cls: 'crc-picker-filter' });
		livingFilter.createSpan({ cls: 'crc-picker-filter__label', text: 'Living:' });
		const livingSelect = livingFilter.createEl('select', { cls: 'crc-form-select crc-form-select--small' });
		[
			{ value: 'all', label: 'All' },
			{ value: 'living', label: 'Living only' },
			{ value: 'deceased', label: 'Deceased only' }
		].forEach(opt => {
			livingSelect.createEl('option', { value: opt.value, text: opt.label });
		});
		livingSelect.addEventListener('change', () => {
			this.filters.livingStatus = livingSelect.value as FilterOptions['livingStatus'];
			this.filterPeople();
		});

		// Birth date filter
		const birthFilter = filtersContainer.createDiv({ cls: 'crc-picker-filter' });
		birthFilter.createSpan({ cls: 'crc-picker-filter__label', text: 'Birth date:' });
		const birthSelect = birthFilter.createEl('select', { cls: 'crc-form-select crc-form-select--small' });
		[
			{ value: 'all', label: 'All' },
			{ value: 'yes', label: 'Has date' },
			{ value: 'no', label: 'Missing date' }
		].forEach(opt => {
			birthSelect.createEl('option', { value: opt.value, text: opt.label });
		});
		birthSelect.addEventListener('change', () => {
			this.filters.hasBirthDate = birthSelect.value as FilterOptions['hasBirthDate'];
			this.filterPeople();
		});

		// Sex filter
		const sexFilter = filtersContainer.createDiv({ cls: 'crc-picker-filter' });
		sexFilter.createSpan({ cls: 'crc-picker-filter__label', text: 'Sex:' });
		const sexSelect = sexFilter.createEl('select', { cls: 'crc-form-select crc-form-select--small' });
		[
			{ value: 'all', label: 'All' },
			{ value: 'M', label: 'Male' },
			{ value: 'F', label: 'Female' }
		].forEach(opt => {
			sexSelect.createEl('option', { value: opt.value, text: opt.label });
		});
		sexSelect.addEventListener('change', () => {
			this.filters.sex = sexSelect.value as FilterOptions['sex'];
			this.filterPeople();
		});

		// Results section
		this.resultsContainer = contentEl.createDiv({ cls: 'crc-picker-results' });
		this.renderResults();
	}

	/**
	 * Filter people based on search query and filter options
	 */
	private filterPeople(): void {
		this.filteredPeople = this.allPeople.filter(person => {
			// Search query filter
			if (this.searchQuery) {
				const matchesSearch = person.name.toLowerCase().includes(this.searchQuery) ||
					person.crId.toLowerCase().includes(this.searchQuery);
				if (!matchesSearch) return false;
			}

			// Living status filter
			if (this.filters.livingStatus !== 'all') {
				const isDeceased = !!person.deathDate;
				if (this.filters.livingStatus === 'living' && isDeceased) return false;
				if (this.filters.livingStatus === 'deceased' && !isDeceased) return false;
			}

			// Birth date filter
			if (this.filters.hasBirthDate !== 'all') {
				const hasBirth = !!person.birthDate;
				if (this.filters.hasBirthDate === 'yes' && !hasBirth) return false;
				if (this.filters.hasBirthDate === 'no' && hasBirth) return false;
			}

			// Sex filter
			if (this.filters.sex !== 'all') {
				if (person.sex !== this.filters.sex) return false;
			}

			return true;
		});

		this.renderResults();
	}

	/**
	 * Render the filtered results
	 */
	private renderResults(): void {
		this.resultsContainer.empty();

		if (this.filteredPeople.length === 0) {
			const emptyState = this.resultsContainer.createDiv({ cls: 'crc-picker-empty' });
			const emptyIcon = createLucideIcon('search', 48);
			emptyState.appendChild(emptyIcon);
			emptyState.createEl('p', { text: 'No people found' });
			emptyState.createEl('p', {
				text: this.allPeople.length === 0
					? 'Create person notes to link them as relationships'
					: 'Try a different search term',
				cls: 'crc-text-muted'
			});
			return;
		}

		// Render person cards
		this.filteredPeople.forEach(person => {
			const card = this.resultsContainer.createDiv({ cls: 'crc-picker-item' });

			// Main info
			const mainInfo = card.createDiv({ cls: 'crc-picker-item__main' });
			mainInfo.createDiv({ cls: 'crc-picker-item__name', text: person.name });

			// Meta info (birth date and cr_id)
			const metaInfo = card.createDiv({ cls: 'crc-picker-item__meta' });

			if (person.birthDate) {
				const birthBadge = metaInfo.createDiv({ cls: 'crc-picker-badge' });
				const birthIcon = createLucideIcon('calendar', 12);
				birthBadge.appendChild(birthIcon);
				birthBadge.appendText(person.birthDate);
			}

			const idBadge = metaInfo.createDiv({ cls: 'crc-picker-badge crc-picker-badge--id' });
			const idIcon = createLucideIcon('hash', 12);
			idBadge.appendChild(idIcon);
			idBadge.appendText(person.crId);

			// Click handler
			card.addEventListener('click', () => {
				this.onSelect(person);
				this.close();
			});

			// Hover effect
			card.addEventListener('mouseenter', () => {
				card.addClass('crc-picker-item--hover');
			});
			card.addEventListener('mouseleave', () => {
				card.removeClass('crc-picker-item--hover');
			});
		});
	}
}
