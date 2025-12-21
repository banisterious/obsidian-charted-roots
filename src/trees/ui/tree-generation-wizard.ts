/**
 * Tree Generation Wizard Modal
 *
 * Multi-step wizard for generating canvas trees with:
 * - Step 1: Root person selection
 * - Step 2: Tree type and layout options
 * - Step 3: Scope and style options
 * - Step 4: Preview
 * - Step 5: Output settings and generation
 */

import { Modal, Setting, Notice, TFile, TFolder, setIcon, normalizePath } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { createLucideIcon, setLucideIcon, LucideIconName } from '../../ui/lucide-icons';
import type { PersonInfo } from '../../ui/person-picker';
import { TreePreviewRenderer } from '../../ui/tree-preview';
import { FamilyGraphService, FamilyTree, PersonNode, TreeOptions } from '../../core/family-graph';
import { CanvasGenerator, CanvasGenerationOptions } from '../../core/canvas-generator';
import type { LayoutOptions } from '../../core/layout-engine';
import type { CanvasColor, ColorScheme, LayoutType, RecentTreeInfo } from '../../settings';
import { ensureFolderExists } from '../../core/canvas-utils';
import { getLogger } from '../../core/logging';
import { isPersonNote } from '../../utils/note-type-detection';

const logger = getLogger('tree-wizard');

/**
 * Wizard step identifiers
 */
type WizardStep = 'person' | 'layout' | 'options' | 'preview' | 'output';

/**
 * Step configuration
 */
interface StepConfig {
	id: WizardStep;
	title: string;
	subtitle: string;
}

const WIZARD_STEPS: StepConfig[] = [
	{ id: 'person', title: 'Select root person', subtitle: 'Choose the starting point' },
	{ id: 'layout', title: 'Tree type & layout', subtitle: 'Configure the tree structure' },
	{ id: 'options', title: 'Options', subtitle: 'Scope and style settings' },
	{ id: 'preview', title: 'Preview', subtitle: 'Review before generating' },
	{ id: 'output', title: 'Output settings', subtitle: 'Name and save location' }
];

/**
 * Tree type options
 */
type TreeType = 'full' | 'ancestors' | 'descendants';

/**
 * Layout algorithm options
 */
type LayoutAlgorithm = 'standard' | 'compact' | 'timeline' | 'hourglass';

/**
 * Sort options for person list
 */
type PersonSortOption = 'name-asc' | 'name-desc' | 'birth-asc' | 'birth-desc';

/**
 * Filter options for person list
 */
interface PersonFilterOptions {
	sex: 'all' | 'male' | 'female' | 'unknown';
	hasConnections: boolean; // Only show people with family connections
}

/**
 * Form data for wizard
 */
interface WizardFormData {
	// Step 1: Person
	rootPerson: PersonInfo | null;

	// Step 2: Layout
	treeType: TreeType;
	layoutAlgorithm: LayoutAlgorithm;
	direction: 'vertical' | 'horizontal';
	maxAncestorGenerations: number;
	maxDescendantGenerations: number;
	includeSpouses: boolean;

	// Step 3: Options - Scope
	includeStepParents: boolean;
	includeAdoptiveParents: boolean;
	collectionFilter: string; // Empty = no filter
	placeFilter: string; // Empty = no filter
	placeFilterTypes: Set<'birth' | 'death' | 'marriage' | 'burial'>;
	universeFilter: string; // Empty = no filter

	// Step 3: Options - Style
	colorScheme: ColorScheme;
	parentChildArrowStyle: 'directed' | 'bidirectional' | 'undirected';
	spouseArrowStyle: 'directed' | 'bidirectional' | 'undirected';
	parentChildEdgeColor: CanvasColor;
	spouseEdgeColor: CanvasColor;
	showSpouseEdges: boolean;
	spouseEdgeLabelFormat: 'none' | 'date-only' | 'date-location' | 'full';

	// Step 5: Output
	canvasName: string;
	saveFolder: string;
	openAfterGenerate: boolean;
}

/**
 * Tree Generation Wizard Modal
 */
export class TreeGenerationWizardModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private currentStep: number = 0;
	private onComplete?: (canvasPath: string) => void;

	// Form data
	private formData: WizardFormData;

	// Services
	private graphService: FamilyGraphService;

	// UI elements
	private contentContainer?: HTMLElement;
	private progressContainer?: HTMLElement;
	private previewRenderer?: TreePreviewRenderer;
	private previewContainer?: HTMLElement;

	// Person list for Step 1
	private allPeople: PersonInfo[] = [];
	private filteredPeople: PersonInfo[] = [];
	private searchQuery: string = '';
	private sortOption: PersonSortOption = 'name-asc';
	private filterOptions: PersonFilterOptions = {
		sex: 'all',
		hasConnections: false
	};

	constructor(
		plugin: CanvasRootsPlugin,
		options?: {
			onComplete?: (canvasPath: string) => void;
			initialPerson?: PersonInfo;
		}
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.onComplete = options?.onComplete;

		// Initialize graph service with settings
		this.graphService = new FamilyGraphService(plugin.app);
		this.graphService.setSettings(plugin.settings);
		this.graphService.setPropertyAliases(plugin.settings.propertyAliases);
		this.graphService.setValueAliases(plugin.settings.valueAliases);

		// Initialize form data with defaults from plugin settings
		this.formData = {
			rootPerson: options?.initialPerson ?? null,
			treeType: 'full',
			layoutAlgorithm: plugin.settings.defaultLayoutType as LayoutAlgorithm,
			direction: 'vertical',
			maxAncestorGenerations: 0, // 0 = unlimited
			maxDescendantGenerations: 0,
			includeSpouses: true,
			// Step 3: Options - Scope
			includeStepParents: false,
			includeAdoptiveParents: false,
			collectionFilter: '',
			placeFilter: '',
			placeFilterTypes: new Set(['birth', 'death']),
			universeFilter: '',
			// Step 3: Options - Style
			colorScheme: plugin.settings.nodeColorScheme,
			parentChildArrowStyle: plugin.settings.parentChildArrowStyle,
			spouseArrowStyle: plugin.settings.spouseArrowStyle,
			parentChildEdgeColor: plugin.settings.parentChildEdgeColor,
			spouseEdgeColor: plugin.settings.spouseEdgeColor,
			showSpouseEdges: plugin.settings.showSpouseEdges,
			spouseEdgeLabelFormat: plugin.settings.spouseEdgeLabelFormat,
			// Step 5: Output
			canvasName: '',
			saveFolder: plugin.settings.canvasesFolder || '',
			openAfterGenerate: true
		};
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass('crc-tree-wizard');

		// Header
		const header = contentEl.createDiv({ cls: 'cr-wizard-header' });
		const titleContainer = header.createDiv({ cls: 'cr-wizard-title' });
		const icon = createLucideIcon('git-branch', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Generate canvas tree');

		// Progress indicator
		this.progressContainer = contentEl.createDiv({ cls: 'cr-wizard-progress' });
		this.renderProgress();

		// Content area
		this.contentContainer = contentEl.createDiv({ cls: 'cr-wizard-content' });

		// Load people for Step 1
		await this.loadPeople();

		this.renderCurrentStep();
	}

	onClose(): void {
		this.contentEl.empty();
		// Clean up preview renderer
		if (this.previewRenderer) {
			this.previewRenderer = undefined;
		}
	}

	/**
	 * Load all people from the vault
	 */
	private async loadPeople(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		this.allPeople = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter?.cr_id) continue;

			const fm = cache.frontmatter;

			// Use proper note type detection to filter out non-person notes
			// (places, events, sources also have cr_id but shouldn't appear here)
			if (!isPersonNote(fm, cache)) {
				continue;
			}

			// Extract name - ensure it's a string
			const rawName = fm.name;
			const name = typeof rawName === 'string' ? rawName : (Array.isArray(rawName) ? rawName.join(' ') : file.basename);

			// Handle dates that might be Date objects (Obsidian parses YAML dates)
			const birthDate = fm.birth_date instanceof Date ? fm.birth_date.toISOString().split('T')[0] : fm.birth_date;
			const deathDate = fm.death_date instanceof Date ? fm.death_date.toISOString().split('T')[0] : fm.death_date;

			this.allPeople.push({
				name,
				crId: fm.cr_id,
				birthDate,
				deathDate,
				sex: fm.sex,
				file
			});
		}

		// Apply initial filters and sorting
		this.applyFiltersAndSort();
	}

	/**
	 * Render the progress indicator
	 */
	private renderProgress(): void {
		if (!this.progressContainer) return;
		this.progressContainer.empty();

		const stepsContainer = this.progressContainer.createDiv({ cls: 'cr-wizard-steps' });

		for (let i = 0; i < WIZARD_STEPS.length; i++) {
			const step = WIZARD_STEPS[i];
			const stepEl = stepsContainer.createDiv({
				cls: `cr-wizard-step ${i === this.currentStep ? 'cr-wizard-step--active' : ''} ${i < this.currentStep ? 'cr-wizard-step--completed' : ''}`
			});

			const stepNumber = stepEl.createDiv({ cls: 'cr-wizard-step-number' });
			if (i < this.currentStep) {
				setLucideIcon(stepNumber, 'check', 14);
			} else {
				stepNumber.setText(String(i + 1));
			}

			const stepInfo = stepEl.createDiv({ cls: 'cr-wizard-step-info' });
			stepInfo.createDiv({ cls: 'cr-wizard-step-title', text: step.title });

			// Add connector line (except for last step)
			if (i < WIZARD_STEPS.length - 1) {
				stepsContainer.createDiv({
					cls: `cr-wizard-connector ${i < this.currentStep ? 'cr-wizard-connector--completed' : ''}`
				});
			}
		}
	}

	/**
	 * Render the current step content
	 */
	private renderCurrentStep(): void {
		if (!this.contentContainer) return;
		this.contentContainer.empty();

		const step = WIZARD_STEPS[this.currentStep];

		// Step header
		const stepHeader = this.contentContainer.createDiv({ cls: 'cr-wizard-step-header' });
		stepHeader.createEl('h3', { text: step.title, cls: 'cr-wizard-step-heading' });
		stepHeader.createEl('p', { text: `Step ${this.currentStep + 1} of ${WIZARD_STEPS.length}`, cls: 'cr-wizard-step-counter' });

		// Step content
		const stepContent = this.contentContainer.createDiv({ cls: 'cr-wizard-step-content' });

		switch (step.id) {
			case 'person':
				this.renderPersonStep(stepContent);
				break;
			case 'layout':
				this.renderLayoutStep(stepContent);
				break;
			case 'options':
				this.renderOptionsStep(stepContent);
				break;
			case 'preview':
				this.renderPreviewStep(stepContent);
				break;
			case 'output':
				this.renderOutputStep(stepContent);
				break;
		}

		// Navigation buttons
		this.renderNavigation();
	}

	/**
	 * Step 1: Root person selection
	 */
	private renderPersonStep(container: HTMLElement): void {
		container.createEl('p', {
			text: 'Choose the person who will be at the center of your family tree.',
			cls: 'cr-wizard-step-desc'
		});

		// Selected person display (at top when selected)
		if (this.formData.rootPerson) {
			const selectedContainer = container.createDiv({ cls: 'crc-wizard-selected-person' });
			this.renderSelectedPerson(selectedContainer);
		}

		// Search and toolbar row
		const toolbarRow = container.createDiv({ cls: 'crc-wizard-toolbar' });

		// Search input
		const searchWrapper = toolbarRow.createDiv({ cls: 'crc-wizard-search-wrapper' });
		const searchIcon = createLucideIcon('search', 16);
		searchWrapper.appendChild(searchIcon);

		const searchInput = searchWrapper.createEl('input', {
			type: 'text',
			placeholder: 'Search by name...',
			cls: 'crc-wizard-search-input'
		});
		searchInput.value = this.searchQuery;

		// Store reference to list container for updates
		const listContainer = container.createDiv({ cls: 'crc-wizard-person-list' });

		searchInput.addEventListener('input', (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			this.applyFiltersAndSort();
			this.renderPersonList(listContainer);
		});

		// Sort dropdown
		const sortContainer = toolbarRow.createDiv({ cls: 'crc-wizard-sort' });
		const sortSelect = sortContainer.createEl('select', { cls: 'crc-wizard-select' });

		const sortOptions: { value: PersonSortOption; label: string }[] = [
			{ value: 'name-asc', label: 'Name A-Z' },
			{ value: 'name-desc', label: 'Name Z-A' },
			{ value: 'birth-asc', label: 'Birth (oldest)' },
			{ value: 'birth-desc', label: 'Birth (newest)' }
		];

		for (const opt of sortOptions) {
			const option = sortSelect.createEl('option', { value: opt.value, text: opt.label });
			if (opt.value === this.sortOption) {
				option.selected = true;
			}
		}

		sortSelect.addEventListener('change', () => {
			this.sortOption = sortSelect.value as PersonSortOption;
			this.applyFiltersAndSort();
			this.renderPersonList(listContainer);
		});

		// Filter row
		const filterRow = container.createDiv({ cls: 'crc-wizard-filters' });

		// Sex filter
		const sexFilter = filterRow.createDiv({ cls: 'crc-wizard-filter-group' });
		sexFilter.createSpan({ text: 'Sex:', cls: 'crc-wizard-filter-label' });

		const sexOptions: { value: 'all' | 'male' | 'female' | 'unknown'; label: string }[] = [
			{ value: 'all', label: 'All' },
			{ value: 'male', label: 'Male' },
			{ value: 'female', label: 'Female' },
			{ value: 'unknown', label: 'Unknown' }
		];

		for (const opt of sexOptions) {
			const chip = sexFilter.createEl('button', {
				text: opt.label,
				cls: `crc-wizard-filter-chip ${this.filterOptions.sex === opt.value ? 'crc-wizard-filter-chip--active' : ''}`
			});
			chip.addEventListener('click', () => {
				this.filterOptions.sex = opt.value;
				this.applyFiltersAndSort();
				this.renderCurrentStep();
			});
		}

		// Has connections filter
		const connectionsFilter = filterRow.createDiv({ cls: 'crc-wizard-filter-group' });
		const connectionsLabel = connectionsFilter.createEl('label', { cls: 'crc-wizard-filter-toggle' });
		const connectionsCheckbox = connectionsLabel.createEl('input', { type: 'checkbox' });
		connectionsCheckbox.checked = this.filterOptions.hasConnections;
		connectionsLabel.appendText('Has family connections');

		connectionsCheckbox.addEventListener('change', () => {
			this.filterOptions.hasConnections = connectionsCheckbox.checked;
			this.applyFiltersAndSort();
			this.renderPersonList(listContainer);
		});

		// Results count
		const resultsCount = container.createDiv({ cls: 'crc-wizard-results-count' });
		resultsCount.createSpan({ text: `${this.filteredPeople.length} of ${this.allPeople.length} people` });

		// Person list (already created above, just render it)
		this.renderPersonList(listContainer);
	}

	/**
	 * Render the selected person display
	 */
	private renderSelectedPerson(container: HTMLElement): void {
		container.empty();
		const person = this.formData.rootPerson;
		if (!person) return;

		const card = container.createDiv({ cls: 'crc-wizard-selected-card' });

		const icon = createLucideIcon('user', 20);
		card.appendChild(icon);

		const info = card.createDiv({ cls: 'crc-wizard-selected-info' });
		info.createDiv({ cls: 'crc-wizard-selected-name', text: person.name });

		const dates = this.formatDates(person.birthDate, person.deathDate);
		if (dates) {
			info.createDiv({ cls: 'crc-wizard-selected-dates', text: dates });
		}

		const clearBtn = card.createEl('button', {
			cls: 'crc-wizard-clear-btn',
			attr: { type: 'button', 'aria-label': 'Clear selection' }
		});
		setLucideIcon(clearBtn, 'x', 16);
		clearBtn.addEventListener('click', () => {
			this.formData.rootPerson = null;
			this.formData.canvasName = '';
			this.renderCurrentStep();
		});
	}

	/**
	 * Apply filters and sorting to the people list
	 */
	private applyFiltersAndSort(): void {
		const query = this.searchQuery.toLowerCase().trim();

		// Start with all people
		let result = [...this.allPeople];

		// Apply search filter
		if (query) {
			result = result.filter(p => p.name.toLowerCase().includes(query));
		}

		// Apply sex filter
		if (this.filterOptions.sex !== 'all') {
			result = result.filter(p => {
				const sex = p.sex?.toLowerCase();
				if (this.filterOptions.sex === 'male') {
					return sex === 'm' || sex === 'male';
				} else if (this.filterOptions.sex === 'female') {
					return sex === 'f' || sex === 'female';
				} else if (this.filterOptions.sex === 'unknown') {
					return !sex || (sex !== 'm' && sex !== 'male' && sex !== 'f' && sex !== 'female');
				}
				return true;
			});
		}

		// Apply has connections filter
		if (this.filterOptions.hasConnections) {
			result = result.filter(p => {
				const cache = this.app.metadataCache.getFileCache(p.file);
				const fm = cache?.frontmatter;
				if (!fm) return false;
				// Check for any family relationship properties
				return fm.father || fm.mother || fm.spouse || fm.spouses ||
					fm.children || fm.siblings || fm.partners;
			});
		}

		// Apply sorting
		result.sort((a, b) => {
			switch (this.sortOption) {
				case 'name-asc':
					return a.name.localeCompare(b.name);
				case 'name-desc':
					return b.name.localeCompare(a.name);
				case 'birth-asc':
					return this.compareDates(a.birthDate, b.birthDate, true);
				case 'birth-desc':
					return this.compareDates(a.birthDate, b.birthDate, false);
				default:
					return 0;
			}
		});

		this.filteredPeople = result;
	}

	/**
	 * Compare dates for sorting (handles undefined/empty values)
	 */
	private compareDates(dateA?: string, dateB?: string, ascending: boolean = true): number {
		// Push undefined/empty to the end
		if (!dateA && !dateB) return 0;
		if (!dateA) return 1;
		if (!dateB) return -1;

		// Extract year for comparison (handles various date formats)
		const yearA = this.extractYear(dateA);
		const yearB = this.extractYear(dateB);

		if (yearA === null && yearB === null) return 0;
		if (yearA === null) return 1;
		if (yearB === null) return -1;

		return ascending ? yearA - yearB : yearB - yearA;
	}

	/**
	 * Extract year from a date string
	 */
	private extractYear(date: string): number | null {
		// Try to extract a 4-digit year
		const match = date.match(/(\d{4})/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return null;
	}

	/**
	 * Render the person list
	 */
	private renderPersonList(container: HTMLElement): void {
		container.empty();

		if (this.filteredPeople.length === 0) {
			container.createDiv({
				cls: 'crc-wizard-empty',
				text: this.searchQuery ? 'No people match your search.' : 'No people found in vault.'
			});
			return;
		}

		// Limit display for performance
		const displayLimit = 50;
		const displayPeople = this.filteredPeople.slice(0, displayLimit);

		for (const person of displayPeople) {
			const isSelected = this.formData.rootPerson?.crId === person.crId;
			const row = container.createDiv({
				cls: `crc-wizard-person-row ${isSelected ? 'crc-wizard-person-row--selected' : ''}`
			});

			const radio = row.createEl('input', {
				type: 'radio',
				attr: {
					name: 'root-person',
					value: person.crId,
					...(isSelected ? { checked: 'true' } : {})
				}
			});

			const info = row.createDiv({ cls: 'crc-wizard-person-info' });
			info.createDiv({ cls: 'crc-wizard-person-name', text: person.name });

			const dates = this.formatDates(person.birthDate, person.deathDate);
			if (dates) {
				info.createDiv({ cls: 'crc-wizard-person-dates', text: dates });
			}

			row.addEventListener('click', () => {
				this.formData.rootPerson = person;
				// Auto-fill canvas name if empty
				if (!this.formData.canvasName) {
					this.formData.canvasName = `${person.name} - Family Tree`;
				}
				this.renderCurrentStep();
			});
		}

		if (this.filteredPeople.length > displayLimit) {
			container.createDiv({
				cls: 'crc-wizard-more',
				text: `Showing ${displayLimit} of ${this.filteredPeople.length} people. Refine your search to see more.`
			});
		}
	}

	/**
	 * Step 2: Tree type and layout options
	 */
	private renderLayoutStep(container: HTMLElement): void {
		container.createEl('p', {
			text: 'Choose how your family tree should be structured and displayed.',
			cls: 'cr-wizard-step-desc'
		});

		const form = container.createDiv({ cls: 'cr-wizard-form' });

		// Tree type selection with visual cards
		form.createEl('div', { cls: 'cr-wizard-subsection', text: 'Tree type' });

		const treeTypeContainer = form.createDiv({ cls: 'crc-wizard-tree-types' });

		const treeTypes: { id: TreeType; label: string; desc: string; icon: LucideIconName }[] = [
			{ id: 'full', label: 'Full tree', desc: 'Both ancestors and descendants', icon: 'git-branch' },
			{ id: 'ancestors', label: 'Ancestors only', desc: 'Parents, grandparents, etc.', icon: 'arrow-up' },
			{ id: 'descendants', label: 'Descendants only', desc: 'Children, grandchildren, etc.', icon: 'arrow-down' }
		];

		for (const type of treeTypes) {
			const card = treeTypeContainer.createDiv({
				cls: `crc-wizard-type-card ${this.formData.treeType === type.id ? 'crc-wizard-type-card--selected' : ''}`
			});

			const iconEl = createLucideIcon(type.icon, 24);
			card.appendChild(iconEl);

			card.createDiv({ cls: 'crc-wizard-type-label', text: type.label });
			card.createDiv({ cls: 'crc-wizard-type-desc', text: type.desc });

			card.addEventListener('click', () => {
				this.formData.treeType = type.id;
				this.renderCurrentStep();
			});
		}

		// Layout algorithm
		new Setting(form)
			.setName('Layout algorithm')
			.setDesc('How nodes are arranged on the canvas')
			.addDropdown(dropdown => dropdown
				.addOption('standard', 'Standard')
				.addOption('compact', 'Compact')
				.addOption('timeline', 'Timeline (chronological)')
				.addOption('hourglass', 'Hourglass')
				.setValue(this.formData.layoutAlgorithm)
				.onChange(value => {
					this.formData.layoutAlgorithm = value as LayoutAlgorithm;
				}));

		// Direction
		new Setting(form)
			.setName('Direction')
			.setDesc('Primary flow direction of the tree')
			.addDropdown(dropdown => dropdown
				.addOption('vertical', 'Vertical (top to bottom)')
				.addOption('horizontal', 'Horizontal (left to right)')
				.setValue(this.formData.direction)
				.onChange(value => {
					this.formData.direction = value as 'vertical' | 'horizontal';
				}));

		// Generation limits
		if (this.formData.treeType !== 'descendants') {
			new Setting(form)
				.setName('Ancestor generations')
				.setDesc('Maximum ancestor generations (0 = unlimited)')
				.addSlider(slider => slider
					.setLimits(0, 10, 1)
					.setValue(this.formData.maxAncestorGenerations)
					.setDynamicTooltip()
					.onChange(value => {
						this.formData.maxAncestorGenerations = value;
					}));
		}

		if (this.formData.treeType !== 'ancestors') {
			new Setting(form)
				.setName('Descendant generations')
				.setDesc('Maximum descendant generations (0 = unlimited)')
				.addSlider(slider => slider
					.setLimits(0, 10, 1)
					.setValue(this.formData.maxDescendantGenerations)
					.setDynamicTooltip()
					.onChange(value => {
						this.formData.maxDescendantGenerations = value;
					}));
		}

		// Include spouses
		new Setting(form)
			.setName('Include spouses')
			.setDesc('Show spouse nodes alongside each person')
			.addToggle(toggle => toggle
				.setValue(this.formData.includeSpouses)
				.onChange(value => {
					this.formData.includeSpouses = value;
				}));
	}

	/**
	 * Step 3: Options (scope and style settings)
	 */
	private renderOptionsStep(container: HTMLElement): void {
		container.createEl('p', {
			text: 'Configure additional scope and style options.',
			cls: 'cr-wizard-step-desc'
		});

		const form = container.createDiv({ cls: 'cr-wizard-form crc-wizard-options-form' });

		// ========== SCOPE SECTION ==========
		const scopeDetails = form.createEl('details', { cls: 'crc-wizard-details' });
		scopeDetails.open = true;
		const scopeSummary = scopeDetails.createEl('summary', { cls: 'crc-wizard-details-summary' });
		scopeSummary.createSpan({ text: 'Scope options', cls: 'crc-wizard-details-title' });

		const scopeContent = scopeDetails.createDiv({ cls: 'crc-wizard-details-content' });

		// Include step-parents
		new Setting(scopeContent)
			.setName('Include step-parents')
			.setDesc('Show step-parent relationships with dashed lines')
			.addToggle(toggle => toggle
				.setValue(this.formData.includeStepParents)
				.onChange(value => {
					this.formData.includeStepParents = value;
				}));

		// Include adoptive parents
		new Setting(scopeContent)
			.setName('Include adoptive parents')
			.setDesc('Show adoptive parent relationships with dotted lines')
			.addToggle(toggle => toggle
				.setValue(this.formData.includeAdoptiveParents)
				.onChange(value => {
					this.formData.includeAdoptiveParents = value;
				}));

		// Collection filter
		const collections = this.graphService.getUserCollections();
		if (collections.length > 0) {
			new Setting(scopeContent)
				.setName('Filter by collection')
				.setDesc('Limit tree to people in a specific collection')
				.addDropdown(dropdown => {
					dropdown.addOption('', 'All collections (no filter)');
					for (const collection of collections) {
						dropdown.addOption(collection.name, collection.name);
					}
					dropdown.setValue(this.formData.collectionFilter);
					dropdown.onChange(value => {
						this.formData.collectionFilter = value;
					});
				});
		}

		// Place filter
		new Setting(scopeContent)
			.setName('Filter by place')
			.setDesc('Limit tree to people associated with a specific place')
			.addText(text => text
				.setPlaceholder('e.g., London, England')
				.setValue(this.formData.placeFilter)
				.onChange(value => {
					this.formData.placeFilter = value;
				}));

		// Place filter types (only show if place filter has content)
		if (this.formData.placeFilter) {
			const placeTypesSetting = new Setting(scopeContent)
				.setName('Place filter types')
				.setDesc('Which place fields to check');

			const typesContainer = placeTypesSetting.controlEl.createDiv({ cls: 'crc-place-filter-types' });
			const placeTypes: Array<{ value: 'birth' | 'death' | 'marriage' | 'burial'; label: string }> = [
				{ value: 'birth', label: 'Birth' },
				{ value: 'death', label: 'Death' },
				{ value: 'marriage', label: 'Marriage' },
				{ value: 'burial', label: 'Burial' }
			];

			for (const type of placeTypes) {
				const label = typesContainer.createEl('label', { cls: 'crc-place-filter-type' });
				const checkbox = label.createEl('input', { type: 'checkbox' });
				checkbox.checked = this.formData.placeFilterTypes.has(type.value);
				checkbox.addEventListener('change', () => {
					if (checkbox.checked) {
						this.formData.placeFilterTypes.add(type.value);
					} else {
						this.formData.placeFilterTypes.delete(type.value);
					}
				});
				label.appendText(type.label);
			}
		}

		// Universe filter (if universes exist)
		const universes = this.getAvailableUniverses();
		if (universes.length > 0) {
			new Setting(scopeContent)
				.setName('Filter by universe')
				.setDesc('Limit tree to people in a specific fictional universe')
				.addDropdown(dropdown => {
					dropdown.addOption('', 'All universes (no filter)');
					for (const universe of universes) {
						dropdown.addOption(universe, universe);
					}
					dropdown.setValue(this.formData.universeFilter);
					dropdown.onChange(value => {
						this.formData.universeFilter = value;
					});
				});
		}

		// ========== STYLE SECTION ==========
		const styleDetails = form.createEl('details', { cls: 'crc-wizard-details' });
		styleDetails.open = false;
		const styleSummary = styleDetails.createEl('summary', { cls: 'crc-wizard-details-summary' });
		styleSummary.createSpan({ text: 'Style options', cls: 'crc-wizard-details-title' });
		styleSummary.createSpan({ text: '(uses global settings by default)', cls: 'crc-wizard-details-hint' });

		const styleContent = styleDetails.createDiv({ cls: 'crc-wizard-details-content' });

		// Color scheme
		new Setting(styleContent)
			.setName('Node coloring')
			.setDesc('How nodes are colored on the canvas')
			.addDropdown(dropdown => dropdown
				.addOption('sex', 'By sex (green/purple)')
				.addOption('generation', 'By generation (gradient)')
				.addOption('collection', 'By collection')
				.addOption('monochrome', 'Monochrome (neutral)')
				.setValue(this.formData.colorScheme)
				.onChange(value => {
					this.formData.colorScheme = value as ColorScheme;
				}));

		// Parent-child arrows
		new Setting(styleContent)
			.setName('Parent-child arrows')
			.setDesc('Arrow style for parent-child edges')
			.addDropdown(dropdown => dropdown
				.addOption('directed', 'Directed (→)')
				.addOption('bidirectional', 'Bidirectional (↔)')
				.addOption('undirected', 'Undirected (—)')
				.setValue(this.formData.parentChildArrowStyle)
				.onChange(value => {
					this.formData.parentChildArrowStyle = value as 'directed' | 'bidirectional' | 'undirected';
				}));

		// Spouse arrows
		new Setting(styleContent)
			.setName('Spouse arrows')
			.setDesc('Arrow style for spouse edges')
			.addDropdown(dropdown => dropdown
				.addOption('directed', 'Directed (→)')
				.addOption('bidirectional', 'Bidirectional (↔)')
				.addOption('undirected', 'Undirected (—)')
				.setValue(this.formData.spouseArrowStyle)
				.onChange(value => {
					this.formData.spouseArrowStyle = value as 'directed' | 'bidirectional' | 'undirected';
				}));

		// Parent-child edge color
		new Setting(styleContent)
			.setName('Parent-child edge color')
			.setDesc('Color for parent-child relationship edges')
			.addDropdown(dropdown => dropdown
				.addOption('none', 'Theme default')
				.addOption('1', 'Red')
				.addOption('2', 'Orange')
				.addOption('3', 'Yellow')
				.addOption('4', 'Green')
				.addOption('5', 'Cyan')
				.addOption('6', 'Purple')
				.setValue(this.formData.parentChildEdgeColor)
				.onChange(value => {
					this.formData.parentChildEdgeColor = value as CanvasColor;
				}));

		// Spouse edge color
		new Setting(styleContent)
			.setName('Spouse edge color')
			.setDesc('Color for spouse relationship edges')
			.addDropdown(dropdown => dropdown
				.addOption('none', 'Theme default')
				.addOption('1', 'Red')
				.addOption('2', 'Orange')
				.addOption('3', 'Yellow')
				.addOption('4', 'Green')
				.addOption('5', 'Cyan')
				.addOption('6', 'Purple')
				.setValue(this.formData.spouseEdgeColor)
				.onChange(value => {
					this.formData.spouseEdgeColor = value as CanvasColor;
				}));

		// Show spouse edges
		new Setting(styleContent)
			.setName('Show spouse edges')
			.setDesc('Display marriage/partnership relationship edges')
			.addToggle(toggle => toggle
				.setValue(this.formData.showSpouseEdges)
				.onChange(value => {
					this.formData.showSpouseEdges = value;
				}));

		// Spouse edge labels
		new Setting(styleContent)
			.setName('Spouse edge labels')
			.setDesc('Information shown on spouse edges')
			.addDropdown(dropdown => dropdown
				.addOption('none', 'None')
				.addOption('date-only', 'Date only')
				.addOption('date-location', 'Date + location')
				.addOption('full', 'Full (date + location + status)')
				.setValue(this.formData.spouseEdgeLabelFormat)
				.onChange(value => {
					this.formData.spouseEdgeLabelFormat = value as 'none' | 'date-only' | 'date-location' | 'full';
				}));
	}

	/**
	 * Get available universes from the vault
	 */
	private getAvailableUniverses(): string[] {
		const universes: Set<string> = new Set();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const universe = cache?.frontmatter?.universe;
			if (universe && typeof universe === 'string') {
				universes.add(universe);
			}
		}

		return Array.from(universes).sort();
	}

	/**
	 * Build TreeOptions from form data
	 */
	private buildTreeOptions(): TreeOptions {
		if (!this.formData.rootPerson) {
			throw new Error('Root person not selected');
		}

		const options: TreeOptions = {
			rootCrId: this.formData.rootPerson.crId,
			treeType: this.formData.treeType,
			maxGenerations: this.formData.treeType === 'ancestors'
				? this.formData.maxAncestorGenerations || undefined
				: this.formData.treeType === 'descendants'
					? this.formData.maxDescendantGenerations || undefined
					: undefined,
			includeSpouses: this.formData.includeSpouses,
			includeStepParents: this.formData.includeStepParents,
			includeAdoptiveParents: this.formData.includeAdoptiveParents
		};

		// Add collection filter if set
		if (this.formData.collectionFilter) {
			options.collectionFilter = this.formData.collectionFilter;
		}

		// Add place filter if set
		if (this.formData.placeFilter) {
			options.placeFilter = {
				placeName: this.formData.placeFilter,
				types: Array.from(this.formData.placeFilterTypes)
			};
		}

		return options;
	}

	/**
	 * Step 4: Preview
	 */
	private renderPreviewStep(container: HTMLElement): void {
		const person = this.formData.rootPerson;
		if (!person) {
			container.createEl('p', {
				text: 'No root person selected. Go back to Step 1.',
				cls: 'cr-wizard-step-desc'
			});
			return;
		}

		container.createEl('p', {
			text: 'Preview your tree before generating. Pan and zoom to explore.',
			cls: 'cr-wizard-step-desc'
		});

		// Preview container
		this.previewContainer = container.createDiv({ cls: 'crc-wizard-preview-container' });

		// Preview controls
		const controls = container.createDiv({ cls: 'crc-wizard-preview-controls' });

		const zoomInBtn = controls.createEl('button', { cls: 'cr-btn cr-btn--small cr-btn--icon' });
		setIcon(zoomInBtn, 'zoom-in');
		zoomInBtn.addEventListener('click', () => this.previewRenderer?.zoomIn());

		const zoomOutBtn = controls.createEl('button', { cls: 'cr-btn cr-btn--small cr-btn--icon' });
		setIcon(zoomOutBtn, 'zoom-out');
		zoomOutBtn.addEventListener('click', () => this.previewRenderer?.zoomOut());

		const resetBtn = controls.createEl('button', { cls: 'cr-btn cr-btn--small cr-btn--icon' });
		setIcon(resetBtn, 'maximize-2');
		resetBtn.addEventListener('click', () => this.previewRenderer?.resetView());

		// Summary
		const summary = container.createDiv({ cls: 'crc-wizard-preview-summary' });

		// Build and render preview
		void this.buildPreview(summary);
	}

	/**
	 * Build the preview tree
	 */
	private async buildPreview(summaryContainer: HTMLElement): Promise<void> {
		if (!this.previewContainer || !this.formData.rootPerson) return;

		// Show loading state
		this.previewContainer.empty();
		const loading = this.previewContainer.createDiv({ cls: 'crc-wizard-loading' });
		loading.createSpan({ text: 'Building tree...' });

		try {
			// Build family tree using TreeOptions
			const treeOptions = this.buildTreeOptions();

			const familyTree = this.graphService.generateTree(treeOptions);

			if (!familyTree || familyTree.nodes.size === 0) {
				this.previewContainer.empty();
				this.previewContainer.createDiv({
					cls: 'crc-wizard-empty',
					text: 'No family connections found for this person.'
				});
				return;
			}

			// Count nodes
			const nodeCount = familyTree.nodes.size;

			// Update summary
			summaryContainer.empty();
			summaryContainer.createSpan({ text: `${nodeCount} people in tree` });

			// Check if tree is too large for preview
			if (nodeCount > 200) {
				this.previewContainer.empty();
				this.previewContainer.createDiv({
					cls: 'crc-wizard-warning',
					text: `Tree has ${nodeCount} people - too large for preview. The canvas will still generate correctly.`
				});
				return;
			}

			// Clear loading and render preview
			this.previewContainer.empty();
			this.previewRenderer = new TreePreviewRenderer(this.previewContainer);
			this.previewRenderer.setColorScheme(this.formData.colorScheme);

			const layoutOptions: LayoutOptions = {
				direction: this.formData.direction,
				nodeWidth: this.plugin.settings.defaultNodeWidth,
				nodeHeight: this.plugin.settings.defaultNodeHeight,
				nodeSpacingX: this.plugin.settings.horizontalSpacing,
				nodeSpacingY: this.plugin.settings.verticalSpacing,
				layoutType: this.formData.layoutAlgorithm
			};

			this.previewRenderer.renderPreview(familyTree, layoutOptions);

		} catch (error) {
			console.error('Error building preview:', error);
			this.previewContainer.empty();
			this.previewContainer.createDiv({
				cls: 'crc-wizard-error',
				text: 'Error building preview. Check console for details.'
			});
		}
	}

	/**
	 * Step 4: Output settings
	 */
	private renderOutputStep(container: HTMLElement): void {
		container.createEl('p', {
			text: 'Configure where and how to save your canvas tree.',
			cls: 'cr-wizard-step-desc'
		});

		const form = container.createDiv({ cls: 'cr-wizard-form' });

		// Canvas name
		new Setting(form)
			.setName('Canvas name')
			.setDesc('Name for the generated canvas file')
			.addText(text => text
				.setPlaceholder('Family Tree')
				.setValue(this.formData.canvasName)
				.onChange(value => {
					this.formData.canvasName = value;
				}));

		// Save folder
		new Setting(form)
			.setName('Save location')
			.setDesc('Folder where the canvas will be saved')
			.addText(text => {
				text.setPlaceholder('/')
					.setValue(this.formData.saveFolder)
					.onChange(value => {
						this.formData.saveFolder = value;
					});

				// Add folder picker button
				const btn = text.inputEl.parentElement?.createEl('button', {
					cls: 'cr-btn cr-btn--icon',
					attr: { type: 'button' }
				});
				if (btn) {
					setLucideIcon(btn, 'folder', 16);
					btn.addEventListener('click', () => {
						this.showFolderPicker(text.inputEl);
					});
				}
			});

		// Open after generate
		new Setting(form)
			.setName('Open after generation')
			.setDesc('Automatically open the canvas after it is created')
			.addToggle(toggle => toggle
				.setValue(this.formData.openAfterGenerate)
				.onChange(value => {
					this.formData.openAfterGenerate = value;
				}));

		// Summary of what will be generated
		const summarySection = form.createDiv({ cls: 'crc-wizard-output-summary' });
		summarySection.createEl('h4', { text: 'Summary', cls: 'cr-wizard-subsection' });

		const summaryList = summarySection.createEl('ul', { cls: 'crc-wizard-summary-list' });
		summaryList.createEl('li', { text: `Root person: ${this.formData.rootPerson?.name || 'Not selected'}` });
		summaryList.createEl('li', { text: `Tree type: ${this.getTreeTypeLabel()}` });
		summaryList.createEl('li', { text: `Layout: ${this.formData.layoutAlgorithm}, ${this.formData.direction}` });
		summaryList.createEl('li', { text: `Spouses: ${this.formData.includeSpouses ? 'Included' : 'Not included'}` });
	}

	/**
	 * Show folder picker
	 */
	private showFolderPicker(inputEl: HTMLInputElement): void {
		// Simple folder picker using a dropdown of existing folders
		const folders = this.app.vault.getAllLoadedFiles()
			.filter((f): f is TFolder => f instanceof TFolder)
			.map(f => f.path)
			.sort();

		// For now, just show a notice - could be enhanced with a proper modal
		new Notice('Enter a folder path manually, or leave empty for vault root.');
	}

	/**
	 * Render navigation buttons
	 */
	private renderNavigation(): void {
		if (!this.contentContainer) return;

		const nav = this.contentContainer.createDiv({ cls: 'cr-wizard-nav' });

		// Cancel/Back button
		if (this.currentStep === 0) {
			const cancelBtn = nav.createEl('button', {
				text: 'Cancel',
				cls: 'cr-btn'
			});
			cancelBtn.addEventListener('click', () => this.close());
		} else {
			const backBtn = nav.createEl('button', {
				text: 'Back',
				cls: 'cr-btn'
			});
			backBtn.prepend(createLucideIcon('chevron-left', 16));
			backBtn.addEventListener('click', () => this.goBack());
		}

		// Right side buttons
		const rightBtns = nav.createDiv({ cls: 'cr-wizard-nav-right' });

		// Next/Generate button
		if (this.currentStep < WIZARD_STEPS.length - 1) {
			const nextBtn = rightBtns.createEl('button', {
				text: 'Next',
				cls: 'cr-btn cr-btn--primary'
			});
			nextBtn.appendChild(createLucideIcon('arrow-right', 16));

			// Disable if requirements not met
			if (this.currentStep === 0 && !this.formData.rootPerson) {
				nextBtn.disabled = true;
				nextBtn.addClass('cr-btn--disabled');
			}

			nextBtn.addEventListener('click', () => this.goNext());
		} else {
			const generateBtn = rightBtns.createEl('button', {
				text: 'Generate',
				cls: 'cr-btn cr-btn--primary'
			});
			generateBtn.prepend(createLucideIcon('sparkles', 16));

			// Disable if no canvas name
			if (!this.formData.canvasName.trim()) {
				generateBtn.disabled = true;
				generateBtn.addClass('cr-btn--disabled');
			}

			generateBtn.addEventListener('click', () => void this.generateCanvas());
		}
	}

	/**
	 * Navigate to next step
	 */
	private goNext(): void {
		if (this.currentStep < WIZARD_STEPS.length - 1) {
			this.currentStep++;
			this.renderProgress();
			this.renderCurrentStep();
		}
	}

	/**
	 * Navigate to previous step
	 */
	private goBack(): void {
		if (this.currentStep > 0) {
			this.currentStep--;
			this.renderProgress();
			this.renderCurrentStep();
		}
	}

	/**
	 * Generate the canvas
	 */
	private async generateCanvas(): Promise<void> {
		if (!this.formData.rootPerson || !this.formData.canvasName.trim()) {
			new Notice('Please select a root person and enter a canvas name.');
			return;
		}

		try {
			new Notice('Generating canvas...');

			// Build tree options (includes all scope options)
			const treeOptions = this.buildTreeOptions();

			// Generate tree
			logger.info('tree-wizard', 'Starting tree generation', treeOptions);

			const familyTree = this.graphService.generateTree(treeOptions);

			if (!familyTree) {
				new Notice('Failed to generate tree: root person not found');
				return;
			}

			logger.info('tree-wizard', 'Family tree generated', {
				rootPerson: familyTree.root.name,
				totalNodes: familyTree.nodes.size,
				totalEdges: familyTree.edges.length
			});

			// Build canvas generation options (use form data for user-configurable options)
			const canvasOptions: CanvasGenerationOptions = {
				direction: this.formData.direction,
				nodeSpacingX: this.plugin.settings.horizontalSpacing,
				nodeSpacingY: this.plugin.settings.verticalSpacing,
				layoutType: this.formData.layoutAlgorithm as LayoutType,
				nodeColorScheme: this.formData.colorScheme,
				showLabels: true,
				useFamilyChartLayout: true,
				parentChildArrowStyle: this.formData.parentChildArrowStyle,
				spouseArrowStyle: this.formData.spouseArrowStyle,
				parentChildEdgeColor: this.formData.parentChildEdgeColor,
				spouseEdgeColor: this.formData.spouseEdgeColor,
				showSpouseEdges: this.formData.showSpouseEdges,
				spouseEdgeLabelFormat: this.formData.spouseEdgeLabelFormat,
				showSourceIndicators: this.plugin.settings.showSourceIndicators,
				showResearchCoverage: this.plugin.settings.trackFactSourcing,
				canvasRootsMetadata: {
					plugin: 'canvas-roots',
					generation: {
						rootCrId: this.formData.rootPerson.crId,
						rootPersonName: this.formData.rootPerson.name,
						treeType: this.formData.treeType,
						maxGenerations: treeOptions.maxGenerations || 0,
						includeSpouses: this.formData.includeSpouses,
						direction: this.formData.direction,
						timestamp: Date.now()
					},
					layout: {
						nodeWidth: this.plugin.settings.defaultNodeWidth,
						nodeHeight: this.plugin.settings.defaultNodeHeight,
						nodeSpacingX: this.plugin.settings.horizontalSpacing,
						nodeSpacingY: this.plugin.settings.verticalSpacing,
						layoutType: this.formData.layoutAlgorithm as LayoutType
					}
				}
			};

			// Generate canvas data
			const canvasGenerator = new CanvasGenerator();
			const canvasData = canvasGenerator.generateCanvas(familyTree, canvasOptions);

			logger.info('tree-wizard', 'Canvas data generated', {
				nodeCount: canvasData.nodes.length,
				edgeCount: canvasData.edges.length
			});

			// Determine file name and path
			let fileName = this.formData.canvasName.trim();
			if (!fileName.endsWith('.canvas')) {
				fileName += '.canvas';
			}

			// Use save folder from form data, or default canvas folder
			const folder = this.formData.saveFolder.trim() ||
				this.plugin.settings.canvasesFolder ||
				'Canvas Roots/Canvases';

			await ensureFolderExists(this.app, folder);
			const filePath = normalizePath(`${folder}/${fileName}`);

			// Format canvas JSON (Obsidian format: tabs for indentation, compact objects)
			const canvasContent = this.formatCanvasJson(canvasData);

			// Create or update file
			let file: TFile;
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);
			if (existingFile instanceof TFile) {
				await this.app.vault.modify(existingFile, canvasContent);
				file = existingFile;
				new Notice(`Updated existing canvas: ${fileName}`);
			} else {
				file = await this.app.vault.create(filePath, canvasContent);
				new Notice(`Created canvas: ${fileName}`);
			}

			// Wait for file system to settle
			await new Promise(resolve => setTimeout(resolve, 100));

			// Save to recent trees history
			const treeInfo: RecentTreeInfo = {
				canvasPath: file.path,
				canvasName: fileName,
				peopleCount: canvasData.nodes.length,
				edgeCount: canvasData.edges.length,
				rootPerson: this.formData.rootPerson.name,
				timestamp: Date.now()
			};

			if (!this.plugin.settings.recentTrees) {
				this.plugin.settings.recentTrees = [];
			}

			// Remove existing entry for this path if present
			this.plugin.settings.recentTrees = this.plugin.settings.recentTrees.filter(
				t => t.canvasPath !== file.path
			);

			// Add to front of list
			this.plugin.settings.recentTrees.unshift(treeInfo);

			// Keep only last 10
			if (this.plugin.settings.recentTrees.length > 10) {
				this.plugin.settings.recentTrees = this.plugin.settings.recentTrees.slice(0, 10);
			}

			await this.plugin.saveSettings();

			// Open if requested
			if (this.formData.openAfterGenerate) {
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(file);
			}

			// Call completion callback
			this.onComplete?.(file.path);
			this.close();

		} catch (error) {
			console.error('Error generating canvas:', error);
			new Notice('Error generating canvas. Check console for details.');
		}
	}

	/**
	 * Format canvas data as JSON in Obsidian format
	 */
	private formatCanvasJson(data: { nodes: unknown[]; edges: unknown[]; metadata?: unknown }): string {
		const safeStringify = (obj: unknown): string => {
			const seen = new WeakSet();
			return JSON.stringify(obj, (_key, value) => {
				if (typeof value === 'object' && value !== null) {
					if (seen.has(value)) {
						return '[Circular]';
					}
					seen.add(value);
				}
				return value;
			});
		};

		const lines: string[] = [];
		lines.push('{');

		// Format nodes array
		lines.push('\t"nodes":[');
		data.nodes.forEach((node, index) => {
			const compact = safeStringify(node);
			const suffix = index < data.nodes.length - 1 ? ',' : '';
			lines.push(`\t\t${compact}${suffix}`);
		});
		lines.push('\t],');

		// Format edges array
		lines.push('\t"edges":[');
		data.edges.forEach((edge, index) => {
			const compact = safeStringify(edge);
			const suffix = index < data.edges.length - 1 ? ',' : '';
			lines.push(`\t\t${compact}${suffix}`);
		});
		lines.push('\t]');

		// Add metadata if present
		if (data.metadata) {
			lines[lines.length - 1] = '\t],';  // Add comma after edges
			lines.push(`\t"metadata":${safeStringify(data.metadata)}`);
		}

		lines.push('}');
		return lines.join('\n');
	}

	/**
	 * Format birth/death dates for display
	 */
	private formatDates(birthDate?: string, deathDate?: string): string {
		if (!birthDate && !deathDate) return '';
		const birth = birthDate || '?';
		const death = deathDate || '';
		return death ? `(${birth} - ${death})` : `(b. ${birth})`;
	}

	/**
	 * Get label for current tree type
	 */
	private getTreeTypeLabel(): string {
		switch (this.formData.treeType) {
			case 'full': return 'Full tree (ancestors & descendants)';
			case 'ancestors': return 'Ancestors only';
			case 'descendants': return 'Descendants only';
		}
	}
}
