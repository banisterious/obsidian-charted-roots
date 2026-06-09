/**
 * Create/Edit Source Modal
 *
 * Modal for creating new source notes or editing existing ones.
 * Includes person role assignment (#219).
 */

import { App, Modal, Setting, Notice, TFile, FuzzySuggestModal, setIcon, AbstractInputSuggest, TextComponent } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { SourceConfidence, SourceNote, SourceClassification, InformationClassification, EvidenceClassification } from '../types/source-types';
import {
	getSourceTypesByCategory,
	SOURCE_CATEGORY_NAMES,
	PERSON_ROLE_PROPERTIES,
	PERSON_ROLE_LABELS,
	PERSON_ROLE_DESCRIPTIONS,
	SOURCE_CLASSIFICATION_LABELS,
	INFORMATION_CLASSIFICATION_LABELS,
	EVIDENCE_CLASSIFICATION_LABELS,
	type PersonRoleProperty
} from '../types/source-types';
import { ModalStatePersistence, renderResumePromptBanner } from '../../ui/modal-state-persistence';
import { PersonPickerModal, type PersonInfo } from '../../ui/person-picker';

/**
 * Person role entry for the modal
 */
interface PersonRoleEntry {
	/** Person cr_id */
	crId: string;
	/** Person display name */
	name: string;
	/** Role category */
	role: PersonRoleProperty;
	/** Optional role details */
	details?: string;
}

/**
 * Form data structure for persistence
 */
interface SourceFormData {
	title: string;
	sourceType: string;
	date: string;
	dateAccessed: string;
	repository: string;
	repositoryUrl: string;
	collection: string;
	location: string;
	confidence: SourceConfidence;
	sourceClassification: SourceClassification | '';
	informationClassification: InformationClassification | '';
	evidenceClassification: EvidenceClassification | '';
	transcription: string;
	media: string[];
	personRoles: PersonRoleEntry[];
	sourceParent: string;
	sourceParentId: string;
}

/** Supported media file extensions */
const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'pdf'];

/**
 * Modal for selecting media files from the vault
 */
class MediaFileSuggestModal extends FuzzySuggestModal<TFile> {
	private onSelect: (file: TFile) => void;

	constructor(app: App, onSelect: (file: TFile) => void) {
		super(app);
		this.onSelect = onSelect;
		this.setPlaceholder('Select a media file...');
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter(file => {
			const ext = file.extension.toLowerCase();
			return MEDIA_EXTENSIONS.includes(ext);
		});
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onSelect(file);
	}
}

/**
 * Inline suggest for location field with autocomplete from existing locations
 */
class LocationSuggest extends AbstractInputSuggest<string> {
	private locations: string[];
	private textComponent: TextComponent;
	private onSelectValue: (value: string) => void;

	constructor(app: App, textComponent: TextComponent, locations: string[], onSelectValue: (value: string) => void) {
		super(app, textComponent.inputEl);
		this.textComponent = textComponent;
		this.locations = locations;
		this.onSelectValue = onSelectValue;
	}

	getSuggestions(inputStr: string): string[] {
		const lowerInput = inputStr.toLowerCase();
		return this.locations.filter(loc =>
			loc.toLowerCase().includes(lowerInput)
		);
	}

	renderSuggestion(location: string, el: HTMLElement): void {
		el.setText(location);
	}

	selectSuggestion(location: string): void {
		this.textComponent.setValue(location);
		this.onSelectValue(location);
		this.close();
	}
}

/**
 * Autocomplete suggest for source notes (#337)
 */
class SourceSuggest extends AbstractInputSuggest<SourceNote> {
	private sources: SourceNote[];
	private textComponent: TextComponent;
	private onSelectSource: (source: SourceNote) => void;

	constructor(app: App, textComponent: TextComponent, sources: SourceNote[], onSelectSource: (source: SourceNote) => void) {
		super(app, textComponent.inputEl);
		this.textComponent = textComponent;
		this.sources = sources;
		this.onSelectSource = onSelectSource;
	}

	getSuggestions(inputStr: string): SourceNote[] {
		const lowerInput = inputStr.toLowerCase();
		return this.sources.filter(s =>
			s.title.toLowerCase().includes(lowerInput)
		);
	}

	renderSuggestion(source: SourceNote, el: HTMLElement): void {
		el.setText(source.title);
	}

	selectSuggestion(source: SourceNote): void {
		this.textComponent.setValue(source.title);
		this.onSelectSource(source);
		this.close();
	}
}

/**
 * Options for opening the source modal
 */
export interface SourceModalOptions {
	/** Callback after successful create/update. Receives the file for create mode. */
	onSuccess?: (file?: TFile) => void;
	/** For edit mode: the file to edit */
	editFile?: TFile;
	/** For edit mode: the source data to edit */
	editSource?: SourceNote;
}

/**
 * Modal for creating or editing source notes
 */
export class CreateSourceModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private onSuccess: (file?: TFile) => void;

	// Edit mode
	private editMode: boolean = false;
	private editingFile?: TFile;

	// Form fields
	private title: string = '';
	private sourceType: string = 'vital_record';
	private date: string = '';
	private dateAccessed: string = '';
	private repository: string = '';
	private repositoryUrl: string = '';
	private collection: string = '';
	private location: string = '';
	private confidence: SourceConfidence = 'unknown';
	private sourceClassification: SourceClassification | '' = '';
	private informationClassification: InformationClassification | '' = '';
	private evidenceClassification: EvidenceClassification | '' = '';
	private transcription: string = '';
	private media: string[] = [];

	// Source hierarchy (#337)
	private sourceParent: string = '';
	private sourceParentId: string = '';

	// Person roles (#219)
	private personRoles: PersonRoleEntry[] = [];

	// UI state
	private mediaListContainer: HTMLElement | null = null;
	private personRolesListContainer: HTMLElement | null = null;

	// State persistence
	private persistence?: ModalStatePersistence<SourceFormData>;
	private savedSuccessfully: boolean = false;
	private resumeBanner?: HTMLElement;

	constructor(app: App, plugin: CanvasRootsPlugin, optionsOrCallback?: SourceModalOptions | (() => void)) {
		super(app);
		this.plugin = plugin;

		// Handle both old callback style and new options object
		if (typeof optionsOrCallback === 'function') {
			this.onSuccess = optionsOrCallback;
		} else if (optionsOrCallback) {
			this.onSuccess = optionsOrCallback.onSuccess || (() => {});

			// Check for edit mode
			if (optionsOrCallback.editFile && optionsOrCallback.editSource) {
				this.editMode = true;
				this.editingFile = optionsOrCallback.editFile;
				const source = optionsOrCallback.editSource;

				// Populate form fields from existing source
				this.title = source.title;
				this.sourceType = source.sourceType;
				this.date = source.date || '';
				this.dateAccessed = source.dateAccessed || '';
				this.repository = source.repository || '';
				this.repositoryUrl = source.repositoryUrl || '';
				this.collection = source.collection || '';
				this.location = source.location || '';
				this.confidence = source.confidence;
				this.sourceClassification = source.sourceClassification || '';
				this.informationClassification = source.informationClassification || '';
				this.evidenceClassification = source.evidenceClassification || '';
				this.media = [...source.media];

				// Load source hierarchy (#337)
				this.sourceParent = source.sourceParent || '';
				this.sourceParentId = source.sourceParentId || '';

				// Load existing person roles (#219)
				this.loadPersonRolesFromSource(source);
			}
		} else {
			this.onSuccess = () => {};
		}

		// Set up persistence (only in create mode)
		if (!this.editMode) {
			this.persistence = new ModalStatePersistence<SourceFormData>(this.plugin, 'source');
		}
	}

	/**
	 * Load person roles from existing source note (#219)
	 */
	private loadPersonRolesFromSource(source: SourceNote): void {
		// Build a map of cr_id to person name for resolution
		const familyGraph = this.plugin.createFamilyGraphService();
		familyGraph.ensureCacheLoaded();

		const peopleMap = new Map<string, string>();
		for (const person of familyGraph.getAllPeople()) {
			peopleMap.set(person.crId, person.name);
		}

		// Parse each role array
		for (const prop of PERSON_ROLE_PROPERTIES) {
			const entries = source[prop];
			if (!entries || entries.length === 0) continue;

			for (const raw of entries) {
				// Parse wikilink: [[target]] or [[target|display]]
				const wikilinkMatch = raw.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
				if (!wikilinkMatch) continue;

				const linkTarget = wikilinkMatch[1].trim();
				const displayText = wikilinkMatch[2]?.trim();

				// Try to find person by link target (could be file path or name)
				let personCrId: string | undefined;
				let personName: string | undefined;

				// Check if link target matches a person's file path or name
				for (const person of familyGraph.getAllPeople()) {
					const fileName = person.file.basename;
					if (linkTarget === fileName || linkTarget === person.file.path || linkTarget === person.name) {
						personCrId = person.crId;
						personName = person.name;
						break;
					}
				}

				if (!personCrId) {
					// Couldn't resolve - use link target as name
					personName = linkTarget;
					personCrId = linkTarget; // Use as pseudo-id
				}

				// Extract details from display text if present
				let details: string | undefined;
				if (displayText) {
					const detailsMatch = displayText.match(/^.+?\s*\(([^)]+)\)$/);
					if (detailsMatch) {
						details = detailsMatch[1].trim();
					}
				}

				this.personRoles.push({
					crId: personCrId,
					name: personName ?? '',
					role: prop,
					details
				});
			}
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-create-source-modal');

		contentEl.createEl('h2', { text: this.editMode ? 'Edit source' : 'Create source' });

		// Check for persisted state (only in create mode)
		if (this.persistence && !this.editMode) {
			const existingState = this.persistence.getValidState();
			if (existingState) {
				const timeAgo = this.persistence.getTimeAgoString(existingState);
				this.resumeBanner = renderResumePromptBanner(
					contentEl,
					timeAgo,
					() => {
						// Discard - clear state and remove banner
						void this.persistence?.clear();
						this.resumeBanner?.remove();
						this.resumeBanner = undefined;
					},
					() => {
						// Restore - populate form with saved data
						this.restoreFromPersistedState(existingState.formData as unknown as SourceFormData);
						this.resumeBanner?.remove();
						this.resumeBanner = undefined;
						// Re-render form with restored data
						contentEl.empty();
						this.onOpen();
					}
				);
			}
		}

		// Title (required)
		new Setting(contentEl)
			.setName('Title')
			.setDesc('Descriptive title for the source')
			.addText(text => text
				.setPlaceholder('e.g., 1900 US Census - Smith Family')
				.setValue(this.title)
				.onChange(value => this.title = value));

		// Source type (required)
		new Setting(contentEl)
			.setName('Source type')
			.setDesc('Type of documentary evidence')
			.addDropdown(dropdown => {
				// Group by category
				const groupedTypes = getSourceTypesByCategory(
					this.plugin.settings.customSourceTypes,
					this.plugin.settings.showBuiltInSourceTypes
				);

				for (const [categoryId, types] of Object.entries(groupedTypes)) {
					const categoryName = SOURCE_CATEGORY_NAMES[categoryId] || categoryId;
					// Add category as optgroup-like separator
					for (const typeDef of types) {
						dropdown.addOption(typeDef.id, `${categoryName}: ${typeDef.name}`);
					}
				}
				dropdown.setValue(this.sourceType);
				dropdown.onChange(value => this.sourceType = value);
			});

		// Date of document
		new Setting(contentEl)
			.setName('Document date')
			.setDesc('Date of the original document')
			.addText(text => text
				.setPlaceholder('e.g., 1900-06-01')
				.setValue(this.date)
				.onChange(value => this.date = value));

		// Repository
		new Setting(contentEl)
			.setName('Repository')
			.setDesc('Archive or website where source is held')
			.addText(text => text
				.setPlaceholder('e.g., Ancestry.com, FamilySearch, National Archives')
				.setValue(this.repository)
				.onChange(value => this.repository = value));

		// Confidence
		new Setting(contentEl)
			.setName('Confidence')
			.setDesc('How reliable is this source?')
			.addDropdown(dropdown => {
				dropdown.addOption('high', 'High - Primary source, direct evidence');
				dropdown.addOption('medium', 'Medium - Secondary source or indirect');
				dropdown.addOption('low', 'Low - Unverified or questionable');
				dropdown.addOption('unknown', 'Unknown - Not yet assessed');
				dropdown.setValue(this.confidence);
				dropdown.onChange(value => this.confidence = value as SourceConfidence);
			});

		// Source classification section (Mills #276, inline-expand pattern)
		this.renderClassificationSection(contentEl);

		// Additional details section (inline-expand pattern)
		this.renderAdditionalDetailsSection(contentEl);

		// Person roles section (inline-expand pattern) (#219)
		this.renderPersonRolesSection(contentEl);

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'cr-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const actionBtn = buttonContainer.createEl('button', {
			text: this.editMode ? 'Save changes' : 'Create source',
			cls: 'mod-cta'
		});
		actionBtn.addEventListener('click', () => void this.saveSource());
	}

	/**
	 * Check if classification section has any data
	 */
	private hasClassificationData(): boolean {
		return !!(this.sourceClassification || this.informationClassification || this.evidenceClassification);
	}

	/**
	 * Render source classification section (Mills #276, inline-expand pattern)
	 */
	private renderClassificationSection(container: HTMLElement): void {
		const hasData = this.hasClassificationData();
		const wrapper = container.createDiv({ cls: 'crc-inline-expand' });

		// Create expansion link (hidden when expanded)
		const expandLink = wrapper.createDiv({ cls: 'crc-inline-expand__trigger' });
		const linkIcon = expandLink.createSpan({ cls: 'crc-inline-expand__icon' });
		expandLink.createSpan({ text: 'Source classification', cls: 'crc-inline-expand__text' });
		setIcon(linkIcon, 'chevron-down');

		// Create content container (hidden by default unless has data)
		const content = wrapper.createDiv({ cls: 'crc-inline-expand__content' });

		// Collapse link (shown when expanded)
		const collapseHeader = content.createDiv({ cls: 'crc-inline-expand__header' });
		collapseHeader.createSpan({ text: 'Source classification (Mills)', cls: 'crc-inline-expand__title' });
		const collapseLink = collapseHeader.createEl('button', {
			cls: 'crc-inline-expand__collapse clickable-icon',
			attr: { 'aria-label': 'Collapse section' }
		});
		setIcon(collapseLink, 'chevron-up');

		// If has data, start expanded
		if (hasData) {
			wrapper.addClass('crc-inline-expand--expanded');
		}

		// Toggle handlers
		expandLink.addEventListener('click', () => {
			wrapper.addClass('crc-inline-expand--expanded');
		});
		collapseLink.addEventListener('click', () => {
			wrapper.removeClass('crc-inline-expand--expanded');
		});

		// Fields container
		const fields = content.createDiv({ cls: 'crc-inline-expand__fields' });

		fields.createEl('p', {
			text: 'Classify this source using the Evidence Explained framework (all optional).',
			cls: 'setting-item-description'
		});

		// Source classification dropdown
		new Setting(fields)
			.setName('Source classification')
			.setDesc('What is the document itself?')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Not set');
				for (const [value, info] of Object.entries(SOURCE_CLASSIFICATION_LABELS)) {
					dropdown.addOption(value, `${info.label} — ${info.description}`);
				}
				dropdown.setValue(this.sourceClassification);
				dropdown.onChange(value => this.sourceClassification = value as SourceClassification | '');
			});

		// Information classification dropdown
		new Setting(fields)
			.setName('Information classification')
			.setDesc('Who provided the information?')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Not set');
				for (const [value, info] of Object.entries(INFORMATION_CLASSIFICATION_LABELS)) {
					dropdown.addOption(value, `${info.label} — ${info.description}`);
				}
				dropdown.setValue(this.informationClassification);
				dropdown.onChange(value => this.informationClassification = value as InformationClassification | '');
			});

		// Evidence classification dropdown
		new Setting(fields)
			.setName('Evidence classification')
			.setDesc('How does the information relate to the research question?')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Not set');
				for (const [value, info] of Object.entries(EVIDENCE_CLASSIFICATION_LABELS)) {
					dropdown.addOption(value, `${info.label} — ${info.description}`);
				}
				dropdown.setValue(this.evidenceClassification);
				dropdown.onChange(value => this.evidenceClassification = value as EvidenceClassification | '');
			});
	}

	/**
	 * Check if additional details section has any data
	 */
	private hasAdditionalDetailsData(): boolean {
		return !!(
			this.dateAccessed ||
			this.repositoryUrl ||
			this.collection ||
			this.location ||
			this.media.length > 0 ||
			this.transcription
		);
	}

	/**
	 * Render additional details section with inline expansion
	 */
	private renderAdditionalDetailsSection(container: HTMLElement): void {
		const hasData = this.hasAdditionalDetailsData();
		const wrapper = container.createDiv({ cls: 'crc-inline-expand' });

		// Create expansion link (hidden when expanded)
		const expandLink = wrapper.createDiv({ cls: 'crc-inline-expand__trigger' });
		const linkIcon = expandLink.createSpan({ cls: 'crc-inline-expand__icon' });
		expandLink.createSpan({ text: 'Additional details', cls: 'crc-inline-expand__text' });
		setIcon(linkIcon, 'chevron-down');

		// Create content container (hidden by default unless has data)
		const content = wrapper.createDiv({ cls: 'crc-inline-expand__content' });

		// Collapse link (shown when expanded)
		const collapseHeader = content.createDiv({ cls: 'crc-inline-expand__header' });
		collapseHeader.createSpan({ text: 'Additional details', cls: 'crc-inline-expand__title' });
		const collapseLink = collapseHeader.createEl('button', {
			cls: 'crc-inline-expand__collapse clickable-icon',
			attr: { 'aria-label': 'Collapse section' }
		});
		setIcon(collapseLink, 'chevron-up');

		// If has data, start expanded
		if (hasData) {
			wrapper.addClass('crc-inline-expand--expanded');
		}

		// Toggle handlers
		expandLink.addEventListener('click', () => {
			wrapper.addClass('crc-inline-expand--expanded');
		});
		collapseLink.addEventListener('click', () => {
			wrapper.removeClass('crc-inline-expand--expanded');
		});

		// Fields container
		const fields = content.createDiv({ cls: 'crc-inline-expand__fields' });

		// Date accessed
		new Setting(fields)
			.setName('Date accessed')
			.setDesc('When you accessed this source')
			.addText(text => text
				.setPlaceholder('e.g., 2024-03-15')
				.setValue(this.dateAccessed)
				.onChange(value => this.dateAccessed = value));

		// Repository URL
		new Setting(fields)
			.setName('Repository URL')
			.setDesc('Direct link to the online source')
			.addText(text => text
				.setPlaceholder('https://...')
				.setValue(this.repositoryUrl)
				.onChange(value => this.repositoryUrl = value));

		// Collection
		new Setting(fields)
			.setName('Collection')
			.setDesc('Record group or collection name')
			.addText(text => text
				.setPlaceholder('e.g., 1900 United States Federal Census')
				.setValue(this.collection)
				.onChange(value => this.collection = value));

		// Location (with autocomplete from existing locations)
		const sourceService = this.plugin.getSourceService();
		const existingLocations = sourceService.getUniqueLocations();

		new Setting(fields)
			.setName('Location')
			.setDesc('Geographic location of the record')
			.addText(text => {
				text.setPlaceholder('e.g., New York, Kings County, Brooklyn')
					.setValue(this.location)
					.onChange(value => this.location = value);

				// Attach autocomplete suggest if there are existing locations
				if (existingLocations.length > 0) {
					new LocationSuggest(
						this.app,
						text,
						existingLocations,
						(value) => this.location = value
					);
				}
			});

		// Parent source (#337)
		const allSources = sourceService.getAllSources();
		// Exclude the current source (in edit mode) from the parent picker
		const availableParents = this.editMode && this.editingFile
			? allSources.filter(s => s.filePath !== this.editingFile!.path)
			: allSources;

		new Setting(fields)
			.setName('Parent source')
			.setDesc('Parent document (e.g., probate packet, record group)')
			.addText(text => {
				const displayValue = this.sourceParent
					? this.sourceParent.replace(/^\[\[|\]\]$/g, '')
					: '';
				text.setPlaceholder('e.g., Hardwick Probate Packet')
					.setValue(displayValue)
					.onChange(value => {
						if (!value.trim()) {
							this.sourceParent = '';
							this.sourceParentId = '';
							return;
						}
						// Try to match to an existing source
						const match = availableParents.find(s =>
							s.title.toLowerCase() === value.trim().toLowerCase()
						);
						if (match) {
							this.sourceParent = `[[${match.title}]]`;
							this.sourceParentId = match.crId;
						} else {
							// Allow freeform wikilink
							this.sourceParent = `[[${value.trim()}]]`;
							this.sourceParentId = '';
						}
					});

				if (availableParents.length > 0) {
					new SourceSuggest(
						this.app,
						text,
						availableParents,
						(source) => {
							this.sourceParent = `[[${source.title}]]`;
							this.sourceParentId = source.crId;
							text.setValue(source.title);
						}
					);
				}
			});

		// Media files section
		const mediaSetting = new Setting(fields)
			.setName('Media files')
			.setDesc('Images or documents attached to this source');

		// Add button
		mediaSetting.addButton(btn => btn
			.setButtonText('Add media')
			.setIcon('plus')
			.onClick(() => {
				new MediaFileSuggestModal(this.app, (file) => {
					const wikilink = `[[${file.path}]]`;
					if (!this.media.includes(wikilink)) {
						this.media.push(wikilink);
						this.renderMediaList();
					}
				}).open();
			}));

		// Media list container
		this.mediaListContainer = fields.createDiv({ cls: 'cr-media-picker-list' });
		this.renderMediaList();

		// Transcription (only for create mode - editing note body is complex)
		if (!this.editMode) {
			new Setting(fields)
				.setName('Initial transcription')
				.setDesc('Optional transcription of the source content')
				.addTextArea(textArea => textArea
					.setPlaceholder('Enter transcription or notes...')
					.setValue(this.transcription)
					.onChange(value => this.transcription = value));
		}
	}

	/**
	 * Check if person roles section has any data
	 */
	private hasPersonRolesData(): boolean {
		return this.personRoles.length > 0;
	}

	/**
	 * Render person roles section with inline expansion (#219)
	 */
	private renderPersonRolesSection(container: HTMLElement): void {
		const hasData = this.hasPersonRolesData();
		const wrapper = container.createDiv({ cls: 'crc-inline-expand' });

		// Create expansion link (hidden when expanded)
		const expandLink = wrapper.createDiv({ cls: 'crc-inline-expand__trigger' });
		const linkIcon = expandLink.createSpan({ cls: 'crc-inline-expand__icon' });
		expandLink.createSpan({ text: 'Person roles', cls: 'crc-inline-expand__text' });
		setIcon(linkIcon, 'chevron-down');

		// Create content container (hidden by default unless has data)
		const content = wrapper.createDiv({ cls: 'crc-inline-expand__content' });

		// Collapse link (shown when expanded)
		const collapseHeader = content.createDiv({ cls: 'crc-inline-expand__header' });
		collapseHeader.createSpan({ text: 'Person roles', cls: 'crc-inline-expand__title' });
		const collapseLink = collapseHeader.createEl('button', {
			cls: 'crc-inline-expand__collapse clickable-icon',
			attr: { 'aria-label': 'Collapse section' }
		});
		setIcon(collapseLink, 'chevron-up');

		// If has data, start expanded
		if (hasData) {
			wrapper.addClass('crc-inline-expand--expanded');
		}

		// Toggle handlers
		expandLink.addEventListener('click', () => {
			wrapper.addClass('crc-inline-expand--expanded');
		});
		collapseLink.addEventListener('click', () => {
			wrapper.removeClass('crc-inline-expand--expanded');
		});

		// Fields container
		const fields = content.createDiv({ cls: 'crc-inline-expand__fields' });

		// Description
		fields.createEl('p', {
			text: 'Track people named in this source and their roles (witness, informant, etc.).',
			cls: 'setting-item-description cr-person-roles-desc'
		});

		// Add person button
		const addSetting = new Setting(fields)
			.setName('Add person')
			.setDesc('Select a person and assign their role in this source');

		addSetting.addButton(btn => btn
			.setButtonText('Add person')
			.setIcon('user-plus')
			.onClick(() => {
				this.openAddPersonRoleModal();
			}));

		// Person roles list container
		this.personRolesListContainer = fields.createDiv({ cls: 'cr-person-roles-list' });
		this.renderPersonRolesList();
	}

	/**
	 * Open modal to add a person with role
	 */
	private openAddPersonRoleModal(): void {
		// Get family graph for person picker
		const familyGraph = this.plugin.createFamilyGraphService();
		familyGraph.ensureCacheLoaded();
		const folderFilter = this.plugin.getFolderFilter();

		// Open person picker with correct signature: (app, onSelect, options?)
		new PersonPickerModal(
			this.app,
			(person: PersonInfo) => {
				// After selecting person, show role selection
				this.showRoleSelectionForPerson(person);
			},
			{
				folderFilter: folderFilter ?? undefined,
				familyGraph,
				plugin: this.plugin
			}
		).open();
	}

	/**
	 * Show role selection modal for a selected person
	 */
	private showRoleSelectionForPerson(person: PersonInfo): void {
		// Create a simple modal for role selection
		const modal = new Modal(this.app);
		modal.titleEl.setText('Select role');

		const { contentEl } = modal;
		contentEl.empty();
		contentEl.addClass('cr-role-selection-modal');

		contentEl.createEl('p', {
			text: `Select the role for ${person.name} in this source:`
		});

		// Role dropdown
		let selectedRole: PersonRoleProperty = 'principals';
		new Setting(contentEl)
			.setName('Role')
			.addDropdown(dropdown => {
				for (const prop of PERSON_ROLE_PROPERTIES) {
					dropdown.addOption(prop, PERSON_ROLE_LABELS[prop]);
				}
				dropdown.setValue(selectedRole);
				dropdown.onChange(value => {
					selectedRole = value as PersonRoleProperty;
					// Update description
					descEl.textContent = PERSON_ROLE_DESCRIPTIONS[selectedRole];
				});
			});

		// Role description
		const descEl = contentEl.createEl('p', {
			text: PERSON_ROLE_DESCRIPTIONS[selectedRole],
			cls: 'setting-item-description'
		});

		// Optional details
		let details = '';
		new Setting(contentEl)
			.setName('Details (optional)')
			.setDesc('e.g., "Decedent", "Witness", "Administrator"')
			.addText(text => text
				.setPlaceholder('e.g., Decedent')
				.onChange(value => details = value));

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'cr-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => modal.close());

		const addBtn = buttonContainer.createEl('button', {
			text: 'Add',
			cls: 'mod-cta'
		});
		addBtn.addEventListener('click', () => {
			// Add the role entry
			this.personRoles.push({
				crId: person.crId,
				name: person.name,
				role: selectedRole,
				details: details.trim() || undefined
			});
			this.renderPersonRolesList();
			modal.close();
		});

		modal.open();
	}

	/**
	 * Render the list of person roles
	 */
	private renderPersonRolesList(): void {
		if (!this.personRolesListContainer) return;

		this.personRolesListContainer.empty();

		if (this.personRoles.length === 0) {
			this.personRolesListContainer.createSpan({
				text: 'No person roles added',
				cls: 'crc-text-muted'
			});
			return;
		}

		// Group by role for display
		const byRole = new Map<PersonRoleProperty, PersonRoleEntry[]>();
		for (const entry of this.personRoles) {
			const existing = byRole.get(entry.role) || [];
			existing.push(entry);
			byRole.set(entry.role, existing);
		}

		// Render each role group
		for (const prop of PERSON_ROLE_PROPERTIES) {
			const entries = byRole.get(prop);
			if (!entries || entries.length === 0) continue;

			const roleGroup = this.personRolesListContainer.createDiv({ cls: 'cr-person-roles-group' });
			roleGroup.createEl('h5', {
				text: PERSON_ROLE_LABELS[prop],
				cls: 'cr-person-roles-group__title'
			});

			for (const entry of entries) {
				const item = roleGroup.createDiv({ cls: 'cr-person-roles-item' });

				// Person icon and name
				const nameContainer = item.createDiv({ cls: 'cr-person-roles-item__name' });
				const iconEl = nameContainer.createSpan({ cls: 'cr-person-roles-item__icon' });
				setIcon(iconEl, 'user');
				nameContainer.createSpan({ text: entry.name });

				// Details if present
				if (entry.details) {
					item.createSpan({
						text: `(${entry.details})`,
						cls: 'cr-person-roles-item__details'
					});
				}

				// Remove button
				const removeBtn = item.createEl('button', {
					cls: 'cr-person-roles-item__remove clickable-icon',
					attr: { 'aria-label': 'Remove' }
				});
				setIcon(removeBtn, 'x');
				removeBtn.addEventListener('click', () => {
					const idx = this.personRoles.indexOf(entry);
					if (idx >= 0) {
						this.personRoles.splice(idx, 1);
						this.renderPersonRolesList();
					}
				});
			}
		}
	}

	onClose() {
		const { contentEl } = this;

		// Persist state if not saved successfully and we have persistence enabled
		if (this.persistence && !this.editMode && !this.savedSuccessfully) {
			const formData = this.gatherFormData();
			if (this.persistence.hasContent(formData)) {
				void this.persistence.persist(formData);
			}
		}

		contentEl.empty();
	}

	/**
	 * Gather current form data for persistence
	 */
	private gatherFormData(): SourceFormData {
		return {
			title: this.title,
			sourceType: this.sourceType,
			date: this.date,
			dateAccessed: this.dateAccessed,
			repository: this.repository,
			repositoryUrl: this.repositoryUrl,
			collection: this.collection,
			location: this.location,
			confidence: this.confidence,
			sourceClassification: this.sourceClassification,
			informationClassification: this.informationClassification,
			evidenceClassification: this.evidenceClassification,
			transcription: this.transcription,
			media: [...this.media],
			personRoles: [...this.personRoles],
			sourceParent: this.sourceParent,
			sourceParentId: this.sourceParentId
		};
	}

	/**
	 * Restore form state from persisted data
	 */
	private restoreFromPersistedState(formData: SourceFormData): void {
		this.title = formData.title || '';
		this.sourceType = formData.sourceType || 'vital_record';
		this.date = formData.date || '';
		this.dateAccessed = formData.dateAccessed || '';
		this.repository = formData.repository || '';
		this.repositoryUrl = formData.repositoryUrl || '';
		this.collection = formData.collection || '';
		this.location = formData.location || '';
		this.confidence = formData.confidence || 'unknown';
		this.sourceClassification = formData.sourceClassification || '';
		this.informationClassification = formData.informationClassification || '';
		this.evidenceClassification = formData.evidenceClassification || '';
		this.transcription = formData.transcription || '';
		this.media = formData.media ? [...formData.media] : [];
		this.personRoles = formData.personRoles ? [...formData.personRoles] : [];
		this.sourceParent = formData.sourceParent || '';
		this.sourceParentId = formData.sourceParentId || '';
	}

	/**
	 * Render the list of attached media files
	 */
	private renderMediaList(): void {
		if (!this.mediaListContainer) return;

		this.mediaListContainer.empty();

		if (this.media.length === 0) {
			this.mediaListContainer.createSpan({
				text: 'No media files attached',
				cls: 'crc-text-muted'
			});
			return;
		}

		for (let i = 0; i < this.media.length; i++) {
			const mediaPath = this.media[i];
			const item = this.mediaListContainer.createDiv({ cls: 'cr-media-picker-item' });

			// Extract filename from wikilink
			const match = mediaPath.match(/\[\[(.+?)\]\]/);
			const filePath = match ? match[1] : mediaPath;
			const fileName = filePath.split('/').pop() || filePath;

			// Thumbnail preview for images
			const ext = fileName.split('.').pop()?.toLowerCase() || '';
			const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);

			if (isImage) {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file instanceof TFile) {
					const thumb = item.createDiv({ cls: 'cr-media-picker-thumb' });
					const img = thumb.createEl('img');
					img.src = this.app.vault.getResourcePath(file);
				}
			} else {
				// PDF or other - show icon
				const iconEl = item.createDiv({ cls: 'cr-media-picker-icon' });
				setIcon(iconEl, 'file-text');
			}

			// Filename
			item.createSpan({ text: fileName, cls: 'cr-media-picker-name' });

			// Remove button
			const removeBtn = item.createEl('button', {
				cls: 'cr-media-picker-remove clickable-icon',
				attr: { 'aria-label': 'Remove' }
			});
			setIcon(removeBtn, 'x');
			removeBtn.addEventListener('click', () => {
				this.media.splice(i, 1);
				this.renderMediaList();
			});
		}
	}

	/**
	 * Convert person roles to frontmatter format (#219)
	 * Returns a map of role property to array of wikilink strings
	 */
	private personRolesToFrontmatter(): Partial<Record<PersonRoleProperty, string[]>> {
		const result: Partial<Record<PersonRoleProperty, string[]>> = {};

		for (const entry of this.personRoles) {
			// Build wikilink with optional display text containing details
			let wikilink: string;
			if (entry.details) {
				// [[Name|Name (Details)]]
				wikilink = `[[${entry.name}|${entry.name} (${entry.details})]]`;
			} else {
				// [[Name]]
				wikilink = `[[${entry.name}]]`;
			}

			// Add to appropriate role array
			if (!result[entry.role]) {
				result[entry.role] = [];
			}
			result[entry.role]!.push(wikilink);
		}

		return result;
	}

	private async saveSource(): Promise<void> {
		if (!this.title.trim()) {
			new Notice('Please enter a title');
			return;
		}

		try {
			const sourceService = this.plugin.getSourceService();

			// Convert person roles to frontmatter format
			const roleArrays = this.personRolesToFrontmatter();

			if (this.editMode && this.editingFile) {
				// Update existing source
				await sourceService.updateSource(this.editingFile, {
					title: this.title.trim(),
					sourceType: this.sourceType,
					date: this.date.trim() || undefined,
					dateAccessed: this.dateAccessed.trim() || undefined,
					repository: this.repository.trim() || undefined,
					repositoryUrl: this.repositoryUrl.trim() || undefined,
					collection: this.collection.trim() || undefined,
					location: this.location.trim() || undefined,
					confidence: this.confidence,
					sourceClassification: this.sourceClassification || undefined,
					informationClassification: this.informationClassification || undefined,
					evidenceClassification: this.evidenceClassification || undefined,
					media: this.media.length > 0 ? this.media : undefined,
					// Source hierarchy (#337)
					sourceParent: this.sourceParent.trim() || undefined,
					sourceParentId: this.sourceParentId.trim() || undefined,
					// Person roles (#219)
					...roleArrays
				});

				new Notice('Source updated');
			} else {
				// Create new source
				const file = await sourceService.createSource({
					title: this.title.trim(),
					sourceType: this.sourceType,
					date: this.date.trim() || undefined,
					dateAccessed: this.dateAccessed.trim() || undefined,
					repository: this.repository.trim() || undefined,
					repositoryUrl: this.repositoryUrl.trim() || undefined,
					collection: this.collection.trim() || undefined,
					location: this.location.trim() || undefined,
					confidence: this.confidence,
					sourceClassification: this.sourceClassification || undefined,
					informationClassification: this.informationClassification || undefined,
					evidenceClassification: this.evidenceClassification || undefined,
					media: this.media.length > 0 ? this.media : undefined,
					transcription: this.transcription.trim() || undefined,
					// Source hierarchy (#337)
					sourceParent: this.sourceParent.trim() || undefined,
					sourceParentId: this.sourceParentId.trim() || undefined,
					// Person roles (#219)
					...roleArrays
				});

				// Mark as saved successfully and clear persisted state
				this.savedSuccessfully = true;
				if (this.persistence) {
					void this.persistence.clear();
				}

				// Open the newly created file
				await this.app.workspace.openLinkText(file.path, '');

				this.close();
				this.onSuccess(file);
				return;
			}

			this.close();
			this.onSuccess();
		} catch (error) {
			new Notice(`Failed to ${this.editMode ? 'update' : 'create'} source: ${error}`);
		}
	}
}