/**
 * Import Wizard Modal
 *
 * A 7-step wizard for importing genealogical data.
 *
 * Step 1: Format — Select import format (GEDCOM, GEDCOM X, Gramps, CSV)
 * Step 2: File — Drag-and-drop file picker
 * Step 3: Options — Entity types, target folder, conflict handling
 * Step 4: Preview — Entity counts, duplicate warnings
 * Step 5: Import — Progress with real-time log
 * Step 6: Numbering — Optional reference numbering
 * Step 7: Complete — Summary with actions
 */

import { App, Modal, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { createLucideIcon } from './lucide-icons';

/**
 * Import format types
 */
export type ImportFormat = 'gedcom' | 'gedcomx' | 'gramps' | 'csv';

/**
 * Numbering system types
 */
export type NumberingSystem = 'ahnentafel' | 'daboville' | 'henry' | 'generation' | 'none';

/**
 * Conflict handling options
 */
export type ConflictHandling = 'skip' | 'overwrite' | 'rename';

/**
 * Import wizard form data
 */
interface ImportWizardFormData {
	// Step 1: Format
	format: ImportFormat;

	// Step 2: File
	file: File | null;
	fileName: string;
	fileSize: number;

	// Step 3: Options
	importPeople: boolean;
	importPlaces: boolean;
	importSources: boolean;
	importEvents: boolean;
	importMedia: boolean;
	targetFolder: string;
	conflictHandling: ConflictHandling;

	// Step 4: Preview (populated after parsing)
	previewCounts: {
		people: number;
		places: number;
		sources: number;
		events: number;
		media: number;
	};
	duplicateCount: number;

	// Step 5: Import (progress)
	importedCount: number;
	totalCount: number;
	importLog: string[];

	// Step 6: Numbering
	numberingSystem: NumberingSystem;
	rootPersonCrId: string | null;
	rootPersonName: string | null;

	// Step 7: Complete
	importComplete: boolean;
	skippedCount: number;
}

/**
 * Format configuration
 */
interface FormatConfig {
	id: ImportFormat;
	name: string;
	description: string;
	extension: string;
	icon: string;
}

const IMPORT_FORMATS: FormatConfig[] = [
	{
		id: 'gedcom',
		name: 'GEDCOM 5.5.1',
		description: 'Standard genealogy format (.ged)',
		extension: '.ged',
		icon: 'file-text'
	},
	{
		id: 'gedcomx',
		name: 'GEDCOM X (JSON)',
		description: 'Modern JSON-based format',
		extension: '.json',
		icon: 'file-json'
	},
	{
		id: 'gramps',
		name: 'Gramps XML/.gpkg',
		description: 'Gramps software (.gpkg includes media)',
		extension: '.gpkg,.gramps',
		icon: 'file-archive'
	},
	{
		id: 'csv',
		name: 'CSV',
		description: 'Spreadsheet data (.csv)',
		extension: '.csv',
		icon: 'table'
	}
];

/**
 * Import Wizard Modal
 */
export class ImportWizardModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private currentStep: number = 0;
	private formData: ImportWizardFormData;
	private contentContainer: HTMLElement | null = null;
	private progressContainer: HTMLElement | null = null;

	// Step definitions
	private readonly steps = [
		{ number: 1, title: 'Format', description: 'Choose import format' },
		{ number: 2, title: 'File', description: 'Select file to import' },
		{ number: 3, title: 'Options', description: 'Configure import options' },
		{ number: 4, title: 'Preview', description: 'Review before importing' },
		{ number: 5, title: 'Import', description: 'Importing data...' },
		{ number: 6, title: 'Numbering', description: 'Assign reference numbers' },
		{ number: 7, title: 'Complete', description: 'Import finished' }
	];

	constructor(app: App, plugin: CanvasRootsPlugin) {
		super(app);
		this.plugin = plugin;
		this.formData = this.getDefaultFormData();
	}

	/**
	 * Get default form data
	 */
	private getDefaultFormData(): ImportWizardFormData {
		return {
			// Step 1
			format: 'gedcom',

			// Step 2
			file: null,
			fileName: '',
			fileSize: 0,

			// Step 3
			importPeople: true,
			importPlaces: true,
			importSources: true,
			importEvents: true,
			importMedia: true,
			targetFolder: this.plugin?.settings?.peopleFolder || 'People',
			conflictHandling: 'skip',

			// Step 4
			previewCounts: {
				people: 0,
				places: 0,
				sources: 0,
				events: 0,
				media: 0
			},
			duplicateCount: 0,

			// Step 5
			importedCount: 0,
			totalCount: 0,
			importLog: [],

			// Step 6
			numberingSystem: 'none',
			rootPersonCrId: null,
			rootPersonName: null,

			// Step 7
			importComplete: false,
			skippedCount: 0
		};
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-import-wizard');

		// Modal header with icon and title
		const header = contentEl.createDiv({ cls: 'crc-import-wizard-header' });

		const titleRow = header.createDiv({ cls: 'crc-wizard-title' });
		const iconEl = titleRow.createDiv({ cls: 'crc-wizard-title-icon' });
		setIcon(iconEl, 'download');
		titleRow.createSpan({ text: 'Import Data' });

		// Step progress indicator
		this.renderStepProgress(contentEl);

		// Content container
		this.contentContainer = contentEl.createDiv({ cls: 'crc-import-wizard-content' });

		// Render current step
		this.renderCurrentStep();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the step progress indicator
	 */
	private renderStepProgress(container: HTMLElement): void {
		this.progressContainer = container.createDiv({ cls: 'crc-wizard-progress' });
		this.updateStepProgress();
	}

	/**
	 * Update the step progress indicator
	 */
	private updateStepProgress(): void {
		if (!this.progressContainer) return;
		this.progressContainer.empty();

		const stepsRow = this.progressContainer.createDiv({ cls: 'crc-wizard-steps' });

		// Only show 5 step circles (steps 1-5) to keep UI compact
		// Steps 6 and 7 are conditional/post-import
		const visibleSteps = this.steps.slice(0, 5);

		visibleSteps.forEach((step, index) => {
			// Step circle with number
			const stepEl = stepsRow.createDiv({ cls: 'crc-wizard-step' });

			// Map currentStep to visible step index
			const effectiveStep = Math.min(this.currentStep, 4);

			// Mark active or completed
			if (index === effectiveStep) {
				stepEl.addClass('crc-wizard-step--active');
			} else if (index < effectiveStep) {
				stepEl.addClass('crc-wizard-step--completed');
			}

			// Step number circle
			const numberEl = stepEl.createDiv({ cls: 'crc-wizard-step-number' });
			if (index < effectiveStep) {
				// Show checkmark for completed steps
				setIcon(numberEl, 'check');
			} else {
				numberEl.textContent = String(step.number);
			}

			// Add connector between steps (except after last visible step)
			if (index < visibleSteps.length - 1) {
				const connector = stepsRow.createDiv({ cls: 'crc-wizard-connector' });
				if (index < effectiveStep) {
					connector.addClass('crc-wizard-connector--completed');
				}
			}
		});
	}

	/**
	 * Render the current step
	 */
	private renderCurrentStep(): void {
		if (!this.contentContainer) return;
		this.contentContainer.empty();

		// Update step progress indicator
		this.updateStepProgress();

		switch (this.currentStep) {
			case 0:
				this.renderStep1Format(this.contentContainer);
				break;
			case 1:
				this.renderStep2File(this.contentContainer);
				break;
			case 2:
				this.renderStep3Options(this.contentContainer);
				break;
			case 3:
				this.renderStep4Preview(this.contentContainer);
				break;
			case 4:
				this.renderStep5Import(this.contentContainer);
				break;
			case 5:
				this.renderStep6Numbering(this.contentContainer);
				break;
			case 6:
				this.renderStep7Complete(this.contentContainer);
				break;
		}

		// Render footer with navigation buttons
		this.renderFooter(this.contentContainer);
	}

	/**
	 * Step 1: Format Selection
	 */
	private renderStep1Format(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });
		section.createEl('h3', { text: 'Choose import format', cls: 'crc-import-section-title' });

		const formatGrid = section.createDiv({ cls: 'crc-import-format-grid' });

		for (const format of IMPORT_FORMATS) {
			const card = formatGrid.createDiv({ cls: 'crc-import-format-card' });
			if (this.formData.format === format.id) {
				card.addClass('crc-import-format-card--selected');
			}

			const cardHeader = card.createDiv({ cls: 'crc-import-format-card-header' });
			const iconEl = cardHeader.createDiv({ cls: 'crc-import-format-card-icon' });
			setIcon(iconEl, format.icon);
			cardHeader.createDiv({ cls: 'crc-import-format-card-title', text: format.name });

			card.createDiv({ cls: 'crc-import-format-card-description', text: format.description });

			card.addEventListener('click', () => {
				this.formData.format = format.id;
				this.renderCurrentStep();
			});
		}
	}

	/**
	 * Step 2: File Selection
	 */
	private renderStep2File(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });
		const selectedFormat = IMPORT_FORMATS.find(f => f.id === this.formData.format);
		section.createEl('h3', { text: `Select ${selectedFormat?.name || ''} file`, cls: 'crc-import-section-title' });

		// File dropzone
		const dropzone = section.createDiv({ cls: 'crc-import-dropzone' });

		if (this.formData.file) {
			dropzone.addClass('crc-import-dropzone--has-file');

			const fileInfo = dropzone.createDiv({ cls: 'crc-import-file-info' });
			const fileIcon = fileInfo.createDiv({ cls: 'crc-import-file-icon' });
			setIcon(fileIcon, 'file');

			const fileDetails = fileInfo.createDiv({ cls: 'crc-import-file-details' });
			fileDetails.createDiv({ cls: 'crc-import-file-name', text: this.formData.fileName });
			fileDetails.createDiv({
				cls: 'crc-import-file-size',
				text: this.formatFileSize(this.formData.fileSize)
			});

			const removeBtn = fileInfo.createDiv({ cls: 'crc-import-file-remove' });
			setIcon(removeBtn, 'x');
			removeBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.formData.file = null;
				this.formData.fileName = '';
				this.formData.fileSize = 0;
				this.renderCurrentStep();
			});
		} else {
			const dropzoneContent = dropzone.createDiv({ cls: 'crc-import-dropzone-content' });
			const dropzoneIcon = dropzoneContent.createDiv({ cls: 'crc-import-dropzone-icon' });
			setIcon(dropzoneIcon, 'upload');

			dropzoneContent.createDiv({
				cls: 'crc-import-dropzone-text',
				text: 'Drag and drop your file here'
			});
			dropzoneContent.createDiv({
				cls: 'crc-import-dropzone-subtext',
				text: 'or click to browse'
			});
		}

		// Hidden file input
		const fileInput = section.createEl('input', {
			type: 'file',
			cls: 'crc-import-file-input'
		}) as HTMLInputElement;
		fileInput.accept = selectedFormat?.extension || '*';
		fileInput.style.display = 'none';

		fileInput.addEventListener('change', () => {
			if (fileInput.files && fileInput.files.length > 0) {
				const file = fileInput.files[0];
				this.formData.file = file;
				this.formData.fileName = file.name;
				this.formData.fileSize = file.size;
				this.renderCurrentStep();
			}
		});

		dropzone.addEventListener('click', () => {
			fileInput.click();
		});

		// Drag and drop handlers
		dropzone.addEventListener('dragover', (e) => {
			e.preventDefault();
			dropzone.addClass('crc-import-dropzone--dragover');
		});

		dropzone.addEventListener('dragleave', () => {
			dropzone.removeClass('crc-import-dropzone--dragover');
		});

		dropzone.addEventListener('drop', (e) => {
			e.preventDefault();
			dropzone.removeClass('crc-import-dropzone--dragover');

			if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
				const file = e.dataTransfer.files[0];
				this.formData.file = file;
				this.formData.fileName = file.name;
				this.formData.fileSize = file.size;
				this.renderCurrentStep();
			}
		});
	}

	/**
	 * Step 3: Options
	 */
	private renderStep3Options(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });

		// Entity types
		section.createEl('h4', { text: 'Entity types to import', cls: 'crc-import-options-title' });

		const entityOptions = section.createDiv({ cls: 'crc-import-options-grid' });

		this.renderToggleOption(entityOptions, 'People', 'Individual and family records', this.formData.importPeople, (val) => {
			this.formData.importPeople = val;
		});

		this.renderToggleOption(entityOptions, 'Places', 'Location records', this.formData.importPlaces, (val) => {
			this.formData.importPlaces = val;
		});

		this.renderToggleOption(entityOptions, 'Sources', 'Source citations', this.formData.importSources, (val) => {
			this.formData.importSources = val;
		});

		this.renderToggleOption(entityOptions, 'Events', 'Historical events', this.formData.importEvents, (val) => {
			this.formData.importEvents = val;
		});

		if (this.formData.format === 'gramps') {
			this.renderToggleOption(entityOptions, 'Media', 'Attached media files', this.formData.importMedia, (val) => {
				this.formData.importMedia = val;
			});
		}

		// Target folder
		section.createEl('h4', { text: 'Target folder', cls: 'crc-import-options-title crc-mt-3' });

		const folderRow = section.createDiv({ cls: 'crc-import-option-row' });
		const folderInput = folderRow.createEl('input', {
			type: 'text',
			cls: 'crc-import-input',
			value: this.formData.targetFolder,
			placeholder: 'People'
		});
		folderInput.addEventListener('input', () => {
			this.formData.targetFolder = folderInput.value;
		});

		// Conflict handling
		section.createEl('h4', { text: 'Duplicate handling', cls: 'crc-import-options-title crc-mt-3' });

		const conflictOptions = section.createDiv({ cls: 'crc-import-conflict-options' });

		const conflictChoices: Array<{ id: ConflictHandling; label: string; description: string }> = [
			{ id: 'skip', label: 'Skip duplicates', description: 'Keep existing notes, skip new ones with same cr_id' },
			{ id: 'overwrite', label: 'Overwrite', description: 'Replace existing notes with imported data' },
			{ id: 'rename', label: 'Create new', description: 'Import as new notes with different names' }
		];

		for (const choice of conflictChoices) {
			const optionEl = conflictOptions.createDiv({ cls: 'crc-import-conflict-option' });
			if (this.formData.conflictHandling === choice.id) {
				optionEl.addClass('crc-import-conflict-option--selected');
			}

			const radio = optionEl.createDiv({ cls: 'crc-import-radio' });
			const radioContent = optionEl.createDiv({ cls: 'crc-import-radio-content' });
			radioContent.createDiv({ cls: 'crc-import-radio-label', text: choice.label });
			radioContent.createDiv({ cls: 'crc-import-radio-description', text: choice.description });

			optionEl.addEventListener('click', () => {
				this.formData.conflictHandling = choice.id;
				this.renderCurrentStep();
			});
		}
	}

	/**
	 * Step 4: Preview
	 */
	private renderStep4Preview(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });
		section.createEl('h3', { text: 'Preview', cls: 'crc-import-section-title' });

		// File info
		const fileCard = section.createDiv({ cls: 'crc-import-preview-card' });
		const fileHeader = fileCard.createDiv({ cls: 'crc-import-preview-header' });
		const fileIcon = fileHeader.createDiv({ cls: 'crc-import-preview-icon' });
		setIcon(fileIcon, 'file');
		fileHeader.createDiv({ cls: 'crc-import-preview-filename', text: this.formData.fileName });

		// TODO: Implement actual file parsing to get real counts
		// For now, show placeholder counts
		const counts = section.createDiv({ cls: 'crc-import-preview-counts' });

		const countItems = [
			{ label: 'People', count: '—', icon: 'users', enabled: this.formData.importPeople },
			{ label: 'Places', count: '—', icon: 'map-pin', enabled: this.formData.importPlaces },
			{ label: 'Sources', count: '—', icon: 'archive', enabled: this.formData.importSources },
			{ label: 'Events', count: '—', icon: 'calendar', enabled: this.formData.importEvents }
		];

		for (const item of countItems) {
			if (item.enabled) {
				const countEl = counts.createDiv({ cls: 'crc-import-preview-count' });
				const countIcon = countEl.createDiv({ cls: 'crc-import-preview-count-icon' });
				setIcon(countIcon, item.icon);
				countEl.createDiv({ cls: 'crc-import-preview-count-value', text: item.count });
				countEl.createDiv({ cls: 'crc-import-preview-count-label', text: item.label });
			}
		}

		// Note about parsing
		const noteEl = section.createDiv({ cls: 'crc-import-preview-note' });
		noteEl.createSpan({ text: 'File will be parsed when you click Import. Entity counts will be shown during import.' });
	}

	/**
	 * Step 5: Import Progress
	 */
	private renderStep5Import(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });
		section.createEl('h3', { text: 'Importing...', cls: 'crc-import-section-title' });

		// Progress bar
		const progressBar = section.createDiv({ cls: 'crc-import-progress-bar' });
		const progressFill = progressBar.createDiv({ cls: 'crc-import-progress-fill' });
		progressFill.style.width = '0%';

		// Status text
		const statusEl = section.createDiv({ cls: 'crc-import-progress-status' });
		statusEl.textContent = 'Starting import...';

		// Log area
		const logArea = section.createDiv({ cls: 'crc-import-log' });
		logArea.createDiv({ cls: 'crc-import-log-entry', text: 'Waiting to start...' });

		// TODO: Implement actual import logic
		// This will need to read the file, parse it, and create notes
	}

	/**
	 * Step 6: Reference Numbering
	 */
	private renderStep6Numbering(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });

		// Success message
		const successEl = section.createDiv({ cls: 'crc-import-success' });
		const successIcon = successEl.createDiv({ cls: 'crc-import-success-icon' });
		setIcon(successIcon, 'check-circle');
		successEl.createDiv({ cls: 'crc-import-success-text', text: 'Import successful!' });
		successEl.createDiv({ cls: 'crc-import-success-count', text: `${this.formData.importedCount} people imported` });

		section.createEl('h3', { text: 'Assign reference numbers?', cls: 'crc-import-section-title crc-mt-3' });

		const helpText = section.createDiv({ cls: 'crc-import-help-text' });
		helpText.textContent = 'Reference numbers help organize and cite individuals in your tree. You can also do this later from the context menu.';

		// Numbering system options
		section.createEl('h4', { text: 'Numbering system', cls: 'crc-import-options-title crc-mt-3' });

		const numberingOptions = section.createDiv({ cls: 'crc-import-numbering-options' });

		const systems: Array<{ id: NumberingSystem; label: string; description: string }> = [
			{ id: 'ahnentafel', label: 'Ahnentafel', description: 'Ancestor numbering: self=1, father=2, mother=3, paternal grandfather=4, etc.' },
			{ id: 'daboville', label: "d'Aboville", description: 'Descendant numbering with dots: 1, 1.1, 1.2, 1.1.1, etc.' },
			{ id: 'henry', label: 'Henry', description: 'Compact descendant numbering: 1, 11, 12, 111, etc.' },
			{ id: 'generation', label: 'Generation', description: 'Relative generation depth: 0=self, -1=parents, +1=children' }
		];

		for (const system of systems) {
			const optionEl = numberingOptions.createDiv({ cls: 'crc-import-numbering-option' });
			if (this.formData.numberingSystem === system.id) {
				optionEl.addClass('crc-import-numbering-option--selected');
			}

			const radio = optionEl.createDiv({ cls: 'crc-import-radio' });
			const radioContent = optionEl.createDiv({ cls: 'crc-import-radio-content' });
			radioContent.createDiv({ cls: 'crc-import-radio-label', text: system.label });
			radioContent.createDiv({ cls: 'crc-import-radio-description', text: system.description });

			optionEl.addEventListener('click', () => {
				this.formData.numberingSystem = system.id;
				this.renderCurrentStep();
			});
		}

		// Root person picker (if a numbering system is selected)
		if (this.formData.numberingSystem !== 'none') {
			section.createEl('h4', { text: 'Root person', cls: 'crc-import-options-title crc-mt-3' });

			const rootPersonNote = section.createDiv({ cls: 'crc-import-help-text' });
			rootPersonNote.textContent = 'Numbers are assigned relative to this person.';

			// TODO: Add person picker component
			const pickerPlaceholder = section.createDiv({ cls: 'crc-import-person-picker-placeholder' });
			pickerPlaceholder.textContent = 'Person picker will be implemented here';
		}
	}

	/**
	 * Step 7: Complete
	 */
	private renderStep7Complete(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-import-section' });

		// Completion message
		const completeEl = section.createDiv({ cls: 'crc-import-complete' });
		const completeIcon = completeEl.createDiv({ cls: 'crc-import-complete-icon' });
		setIcon(completeIcon, 'check-circle');
		completeEl.createDiv({ cls: 'crc-import-complete-title', text: 'Import Complete!' });
		completeEl.createDiv({ cls: 'crc-import-complete-message', text: 'Your data has been successfully imported.' });

		// Summary stats
		const stats = section.createDiv({ cls: 'crc-import-complete-stats' });

		const statItems = [
			{ label: 'People', value: this.formData.previewCounts.people, color: 'blue' },
			{ label: 'Places', value: this.formData.previewCounts.places, color: 'green' },
			{ label: 'Sources', value: this.formData.previewCounts.sources, color: 'purple' },
			{ label: 'Events', value: this.formData.previewCounts.events, color: 'orange' }
		];

		for (const stat of statItems) {
			if (stat.value > 0) {
				const statEl = stats.createDiv({ cls: 'crc-import-complete-stat' });
				statEl.createDiv({ cls: `crc-import-complete-stat-value crc-import-complete-stat-value--${stat.color}`, text: String(stat.value) });
				statEl.createDiv({ cls: 'crc-import-complete-stat-label', text: stat.label });
			}
		}

		// Skipped/duplicates info
		if (this.formData.skippedCount > 0) {
			const skippedEl = section.createDiv({ cls: 'crc-import-complete-skipped' });
			skippedEl.textContent = `${this.formData.skippedCount} duplicates were skipped.`;
		}

		// Numbering result
		if (this.formData.numberingSystem !== 'none' && this.formData.rootPersonName) {
			const numberingEl = section.createDiv({ cls: 'crc-import-complete-numbering' });
			numberingEl.innerHTML = `✓ ${this.getNumberingSystemName()} numbers assigned from ${this.formData.rootPersonName}`;
		}
	}

	/**
	 * Render footer with navigation buttons
	 */
	private renderFooter(container: HTMLElement): void {
		const footer = container.createDiv({ cls: 'crc-import-footer' });

		// Left side: Cancel or Back
		const leftBtns = footer.createDiv({ cls: 'crc-import-footer-left' });

		if (this.currentStep === 0) {
			// Step 0: Show Cancel button
			const cancelBtn = leftBtns.createEl('button', {
				cls: 'crc-btn crc-btn--secondary',
				text: 'Cancel'
			});
			cancelBtn.addEventListener('click', () => this.close());
		} else if (this.currentStep < 4) {
			// Steps 1-3: Show Back button
			const backBtn = leftBtns.createEl('button', {
				cls: 'crc-btn crc-btn--secondary',
				text: 'Back'
			});
			backBtn.addEventListener('click', () => {
				this.currentStep--;
				this.renderCurrentStep();
			});
		} else if (this.currentStep === 5) {
			// Step 5 (Numbering): Show Skip button
			const skipBtn = leftBtns.createEl('button', {
				cls: 'crc-btn crc-btn--secondary',
				text: 'Skip'
			});
			skipBtn.addEventListener('click', () => {
				this.formData.numberingSystem = 'none';
				this.currentStep = 6;
				this.renderCurrentStep();
			});
		}

		// Right side: Next or action buttons
		const rightBtns = footer.createDiv({ cls: 'crc-import-footer-right' });

		if (this.currentStep < 3) {
			// Steps 0-2: Show Next button
			const nextBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: 'Next'
			});

			// Disable if requirements not met
			if (!this.canProceedToNextStep()) {
				nextBtn.disabled = true;
				nextBtn.addClass('crc-btn--disabled');
			}

			nextBtn.addEventListener('click', () => {
				if (this.canProceedToNextStep()) {
					this.currentStep++;
					this.renderCurrentStep();
				}
			});
		} else if (this.currentStep === 3) {
			// Step 3: Show Import button
			const importBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: 'Import'
			});
			importBtn.addEventListener('click', () => {
				this.currentStep = 4;
				this.renderCurrentStep();
				// TODO: Start actual import
			});
		} else if (this.currentStep === 5) {
			// Step 5 (Numbering): Show Assign Numbers button
			const assignBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: 'Assign Numbers'
			});

			if (this.formData.numberingSystem === 'none' || !this.formData.rootPersonCrId) {
				assignBtn.disabled = true;
				assignBtn.addClass('crc-btn--disabled');
			}

			assignBtn.addEventListener('click', () => {
				// TODO: Assign reference numbers
				this.currentStep = 6;
				this.renderCurrentStep();
			});
		} else if (this.currentStep === 6) {
			// Step 6 (Complete): Show Done and Import Another buttons
			const importAnotherBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--secondary',
				text: 'Import Another'
			});
			importAnotherBtn.addEventListener('click', () => {
				this.formData = this.getDefaultFormData();
				this.currentStep = 0;
				this.renderCurrentStep();
			});

			const doneBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: 'Done'
			});
			doneBtn.addEventListener('click', () => this.close());
		}
	}

	/**
	 * Check if we can proceed to the next step
	 */
	private canProceedToNextStep(): boolean {
		switch (this.currentStep) {
			case 0:
				// Step 1: Format - always can proceed
				return true;
			case 1:
				// Step 2: File - need file selected
				return this.formData.file !== null;
			case 2:
				// Step 3: Options - always can proceed
				return true;
			default:
				return true;
		}
	}

	/**
	 * Render a toggle option
	 */
	private renderToggleOption(
		container: HTMLElement,
		label: string,
		description: string,
		value: boolean,
		onChange: (value: boolean) => void
	): void {
		const row = container.createDiv({ cls: 'crc-import-toggle-row' });

		const labelEl = row.createDiv({ cls: 'crc-import-toggle-label' });
		labelEl.createSpan({ text: label });
		labelEl.createEl('small', { text: description });

		const toggle = row.createDiv({ cls: 'crc-import-toggle' });
		if (value) {
			toggle.addClass('crc-import-toggle--on');
		}

		toggle.addEventListener('click', () => {
			toggle.toggleClass('crc-import-toggle--on', !value);
			onChange(!value);
		});
	}

	/**
	 * Format file size for display
	 */
	private formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} bytes`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * Get numbering system display name
	 */
	private getNumberingSystemName(): string {
		switch (this.formData.numberingSystem) {
			case 'ahnentafel': return 'Ahnentafel';
			case 'daboville': return "d'Aboville";
			case 'henry': return 'Henry';
			case 'generation': return 'Generation';
			default: return '';
		}
	}
}
