import { App, Modal, TFile } from 'obsidian';
import { createLucideIcon } from './lucide-icons';

/**
 * Person data extracted from note frontmatter
 */
export interface PersonInfo {
	name: string;
	crId: string;
	birthDate?: string;
	file: TFile;
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

		// Sort by name
		this.allPeople.sort((a, b) => a.name.localeCompare(b.name));
		this.filteredPeople = [...this.allPeople];
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

		// Search section
		const searchSection = contentEl.createDiv({ cls: 'crc-picker-search' });
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

		// Results section
		this.resultsContainer = contentEl.createDiv({ cls: 'crc-picker-results' });
		this.renderResults();
	}

	/**
	 * Filter people based on search query
	 */
	private filterPeople(): void {
		if (!this.searchQuery) {
			this.filteredPeople = [...this.allPeople];
		} else {
			this.filteredPeople = this.allPeople.filter(person =>
				person.name.toLowerCase().includes(this.searchQuery) ||
				person.crId.toLowerCase().includes(this.searchQuery)
			);
		}

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
