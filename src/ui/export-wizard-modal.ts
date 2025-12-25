/**
 * Export Wizard Modal
 *
 * A 6-step wizard for exporting genealogical data.
 *
 * Step 1: Format — Select export format (GEDCOM, GEDCOM X, Gramps XML, CSV)
 * Step 2: Folders — Preference folders or custom folder pickers
 * Step 3: Options — Privacy controls, inclusions (sources, places, notes, media)
 * Step 4: Preview — Entity counts, privacy summary
 * Step 5: Export — Progress with real-time log
 * Step 6: Complete — Download/save options
 */

import { App, Modal, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { createLucideIcon } from './lucide-icons';

/**
 * Export format types
 */
export type ExportFormat = 'gedcom' | 'gedcomx' | 'gramps' | 'csv';

/**
 * Folder source options
 */
export type FolderSource = 'preferences' | 'custom';

/**
 * Privacy handling options
 */
export type PrivacyHandling = 'exclude' | 'redact' | 'include';

/**
 * Export wizard form data
 */
interface ExportWizardFormData {
	// Step 1: Format
	format: ExportFormat;

	// Step 2: Folders
	folderSource: FolderSource;
	peoplePath: string;
	placesPath: string;
	eventsPath: string;
	sourcesPath: string;

	// Step 3: Options
	includeSources: boolean;
	includePlaces: boolean;
	includeNotes: boolean;
	includeMedia: boolean;
	privacyHandling: PrivacyHandling;
	livingThresholdYears: number;

	// Step 4: Preview (populated after scanning)
	previewCounts: {
		people: number;
		places: number;
		sources: number;
		events: number;
	};
	livingCount: number;

	// Step 5: Export (progress)
	exportedCount: number;
	totalCount: number;
	exportLog: string[];

	// Step 6: Complete
	exportComplete: boolean;
	outputFilePath: string;
	outputFileSize: number;
}

/**
 * Format configuration
 */
interface FormatConfig {
	id: ExportFormat;
	name: string;
	description: string;
	extension: string;
	icon: string;
}

const EXPORT_FORMATS: FormatConfig[] = [
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
		name: 'Gramps XML',
		description: 'Gramps software format (.gramps)',
		extension: '.gramps',
		icon: 'file-code'
	},
	{
		id: 'csv',
		name: 'CSV',
		description: 'Spreadsheet-compatible (.csv)',
		extension: '.csv',
		icon: 'table'
	}
];

/**
 * Export Wizard Modal
 */
export class ExportWizardModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private currentStep: number = 0;
	private formData: ExportWizardFormData;
	private contentContainer: HTMLElement | null = null;
	private progressContainer: HTMLElement | null = null;

	// Step definitions
	private readonly steps = [
		{ number: 1, title: 'Format', description: 'Choose export format' },
		{ number: 2, title: 'Folders', description: 'Select source folders' },
		{ number: 3, title: 'Options', description: 'Privacy and inclusions' },
		{ number: 4, title: 'Preview', description: 'Review before exporting' },
		{ number: 5, title: 'Export', description: 'Exporting data...' },
		{ number: 6, title: 'Complete', description: 'Export finished' }
	];

	constructor(app: App, plugin: CanvasRootsPlugin) {
		super(app);
		this.plugin = plugin;
		this.formData = this.getDefaultFormData();
	}

	/**
	 * Get default form data
	 */
	private getDefaultFormData(): ExportWizardFormData {
		return {
			// Step 1
			format: 'gedcom',

			// Step 2
			folderSource: 'preferences',
			peoplePath: this.plugin?.settings?.peopleFolder || 'People',
			placesPath: this.plugin?.settings?.placesFolder || 'Places',
			eventsPath: this.plugin?.settings?.eventsFolder || 'Events',
			sourcesPath: this.plugin?.settings?.sourcesFolder || 'Sources',

			// Step 3
			includeSources: true,
			includePlaces: true,
			includeNotes: true,
			includeMedia: false,
			privacyHandling: 'exclude',
			livingThresholdYears: 100,

			// Step 4
			previewCounts: {
				people: 0,
				places: 0,
				sources: 0,
				events: 0
			},
			livingCount: 0,

			// Step 5
			exportedCount: 0,
			totalCount: 0,
			exportLog: [],

			// Step 6
			exportComplete: false,
			outputFilePath: '',
			outputFileSize: 0
		};
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-export-wizard');

		// Modal header with icon and title
		const header = contentEl.createDiv({ cls: 'crc-export-wizard-header' });

		const titleRow = header.createDiv({ cls: 'crc-wizard-title' });
		const iconEl = titleRow.createDiv({ cls: 'crc-wizard-title-icon' });
		setIcon(iconEl, 'upload');
		titleRow.createSpan({ text: 'Export Data' });

		// Step progress indicator
		this.renderStepProgress(contentEl);

		// Content container
		this.contentContainer = contentEl.createDiv({ cls: 'crc-export-wizard-content' });

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

		// Show first 4 step circles (steps 1-4) to keep UI compact
		const visibleSteps = this.steps.slice(0, 4);

		visibleSteps.forEach((step, index) => {
			// Step circle with number
			const stepEl = stepsRow.createDiv({ cls: 'crc-wizard-step' });

			// Map currentStep to visible step index
			const effectiveStep = Math.min(this.currentStep, 3);

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
				this.renderStep2Folders(this.contentContainer);
				break;
			case 2:
				this.renderStep3Options(this.contentContainer);
				break;
			case 3:
				this.renderStep4Preview(this.contentContainer);
				break;
			case 4:
				this.renderStep5Export(this.contentContainer);
				break;
			case 5:
				this.renderStep6Complete(this.contentContainer);
				break;
		}

		// Render footer with navigation buttons
		this.renderFooter(this.contentContainer);
	}

	/**
	 * Step 1: Format Selection
	 */
	private renderStep1Format(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-export-section' });
		section.createEl('h3', { text: 'Choose export format', cls: 'crc-export-section-title' });

		const formatGrid = section.createDiv({ cls: 'crc-export-format-grid' });

		for (const format of EXPORT_FORMATS) {
			const card = formatGrid.createDiv({ cls: 'crc-export-format-card' });
			if (this.formData.format === format.id) {
				card.addClass('crc-export-format-card--selected');
			}

			const cardHeader = card.createDiv({ cls: 'crc-export-format-card-header' });
			const iconEl = cardHeader.createDiv({ cls: 'crc-export-format-card-icon' });
			setIcon(iconEl, format.icon);
			cardHeader.createDiv({ cls: 'crc-export-format-card-title', text: format.name });

			card.createDiv({ cls: 'crc-export-format-card-description', text: format.description });

			card.addEventListener('click', () => {
				this.formData.format = format.id;
				this.renderCurrentStep();
			});
		}
	}

	/**
	 * Step 2: Folder Selection
	 */
	private renderStep2Folders(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-export-section' });

		// Folder source dropdown
		section.createEl('h4', { text: 'Folder source', cls: 'crc-export-options-title' });

		const sourceRow = section.createDiv({ cls: 'crc-export-option-row' });
		sourceRow.createSpan({ text: 'Use folders from', cls: 'crc-export-option-label' });

		const sourceSelect = sourceRow.createEl('select', { cls: 'crc-export-select' }) as HTMLSelectElement;
		const prefOption = sourceSelect.createEl('option', { value: 'preferences', text: 'Preference folders' });
		const customOption = sourceSelect.createEl('option', { value: 'custom', text: 'Specify folders' });

		if (this.formData.folderSource === 'preferences') {
			prefOption.selected = true;
		} else {
			customOption.selected = true;
		}

		sourceSelect.addEventListener('change', () => {
			this.formData.folderSource = sourceSelect.value as FolderSource;
			this.renderCurrentStep();
		});

		// Show folder paths
		if (this.formData.folderSource === 'preferences') {
			section.createEl('h4', { text: 'Configured folders', cls: 'crc-export-options-title crc-mt-3' });

			const helpText = section.createDiv({ cls: 'crc-export-help-text' });
			helpText.textContent = 'These folders are configured in your Preferences settings.';

			const foldersGrid = section.createDiv({ cls: 'crc-export-folders-grid' });

			this.renderFolderRow(foldersGrid, 'People folder', this.formData.peoplePath, false);
			this.renderFolderRow(foldersGrid, 'Places folder', this.formData.placesPath, false);
			this.renderFolderRow(foldersGrid, 'Events folder', this.formData.eventsPath, false);
			this.renderFolderRow(foldersGrid, 'Sources folder', this.formData.sourcesPath, false);
		} else {
			section.createEl('h4', { text: 'Custom folders', cls: 'crc-export-options-title crc-mt-3' });

			const helpText = section.createDiv({ cls: 'crc-export-help-text' });
			helpText.textContent = 'Specify custom folders for this export.';

			const foldersGrid = section.createDiv({ cls: 'crc-export-folders-grid' });

			this.renderFolderRow(foldersGrid, 'People folder', this.formData.peoplePath, true, (val) => {
				this.formData.peoplePath = val;
			});
			this.renderFolderRow(foldersGrid, 'Places folder', this.formData.placesPath, true, (val) => {
				this.formData.placesPath = val;
			});
			this.renderFolderRow(foldersGrid, 'Events folder', this.formData.eventsPath, true, (val) => {
				this.formData.eventsPath = val;
			});
			this.renderFolderRow(foldersGrid, 'Sources folder', this.formData.sourcesPath, true, (val) => {
				this.formData.sourcesPath = val;
			});
		}
	}

	/**
	 * Step 3: Options
	 */
	private renderStep3Options(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-export-section' });

		// Privacy controls
		section.createEl('h4', { text: 'Privacy controls', cls: 'crc-export-options-title' });

		const privacyOptions = section.createDiv({ cls: 'crc-export-privacy-options' });

		const privacyChoices: Array<{ id: PrivacyHandling; label: string; description: string }> = [
			{ id: 'exclude', label: 'Exclude living persons', description: 'Do not include potentially living individuals' },
			{ id: 'redact', label: 'Redact living persons', description: 'Include but hide sensitive details' },
			{ id: 'include', label: 'Include all', description: 'Export all data without privacy filtering' }
		];

		for (const choice of privacyChoices) {
			const optionEl = privacyOptions.createDiv({ cls: 'crc-export-privacy-option' });
			if (this.formData.privacyHandling === choice.id) {
				optionEl.addClass('crc-export-privacy-option--selected');
			}

			const radio = optionEl.createDiv({ cls: 'crc-export-radio' });
			const radioContent = optionEl.createDiv({ cls: 'crc-export-radio-content' });
			radioContent.createDiv({ cls: 'crc-export-radio-label', text: choice.label });
			radioContent.createDiv({ cls: 'crc-export-radio-description', text: choice.description });

			optionEl.addEventListener('click', () => {
				this.formData.privacyHandling = choice.id;
				this.renderCurrentStep();
			});
		}

		// Living threshold
		if (this.formData.privacyHandling !== 'include') {
			const thresholdRow = section.createDiv({ cls: 'crc-export-option-row crc-mt-2' });
			thresholdRow.createSpan({ text: 'Consider living if born within', cls: 'crc-export-option-label' });

			const thresholdInput = thresholdRow.createEl('input', {
				type: 'number',
				cls: 'crc-export-input crc-export-input--small',
				value: String(this.formData.livingThresholdYears)
			}) as HTMLInputElement;
			thresholdInput.min = '50';
			thresholdInput.max = '150';

			thresholdRow.createSpan({ text: 'years' });

			thresholdInput.addEventListener('input', () => {
				this.formData.livingThresholdYears = parseInt(thresholdInput.value) || 100;
			});
		}

		// Inclusions
		section.createEl('h4', { text: 'Include in export', cls: 'crc-export-options-title crc-mt-3' });

		const inclusionOptions = section.createDiv({ cls: 'crc-export-options-grid' });

		this.renderToggleOption(inclusionOptions, 'Sources', 'Source citations and references', this.formData.includeSources, (val) => {
			this.formData.includeSources = val;
		});

		this.renderToggleOption(inclusionOptions, 'Places', 'Location records', this.formData.includePlaces, (val) => {
			this.formData.includePlaces = val;
		});

		this.renderToggleOption(inclusionOptions, 'Notes', 'Personal notes and descriptions', this.formData.includeNotes, (val) => {
			this.formData.includeNotes = val;
		});

		if (this.formData.format === 'gramps') {
			this.renderToggleOption(inclusionOptions, 'Media', 'Attached media files', this.formData.includeMedia, (val) => {
				this.formData.includeMedia = val;
			});
		}
	}

	/**
	 * Step 4: Preview
	 */
	private renderStep4Preview(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-export-section' });
		section.createEl('h3', { text: 'Preview', cls: 'crc-export-section-title' });

		// Summary card
		const summaryCard = section.createDiv({ cls: 'crc-export-preview-card' });

		// Settings summary
		const settingsGrid = summaryCard.createDiv({ cls: 'crc-export-preview-settings' });

		this.renderSettingRow(settingsGrid, 'Format', this.getFormatDisplayName());
		this.renderSettingRow(settingsGrid, 'Folders', this.formData.folderSource === 'preferences' ? 'Preference folders' : 'Custom folders');

		if (this.formData.privacyHandling !== 'include') {
			const privacyText = this.formData.privacyHandling === 'exclude'
				? `${this.formData.livingCount} living persons excluded`
				: `${this.formData.livingCount} living persons redacted`;
			this.renderSettingRow(settingsGrid, 'Privacy', privacyText, 'warning');
		}

		// Entity counts
		section.createEl('h4', { text: 'Entities to export', cls: 'crc-export-options-title crc-mt-3' });

		const counts = section.createDiv({ cls: 'crc-export-preview-counts' });

		// TODO: Implement actual vault scanning to get real counts
		const countItems = [
			{ label: 'People', count: '—', icon: 'users' },
			{ label: 'Places', count: this.formData.includePlaces ? '—' : '0', icon: 'map-pin' },
			{ label: 'Sources', count: this.formData.includeSources ? '—' : '0', icon: 'archive' },
			{ label: 'Events', count: '—', icon: 'calendar' }
		];

		for (const item of countItems) {
			const countEl = counts.createDiv({ cls: 'crc-export-preview-count' });
			const countIcon = countEl.createDiv({ cls: 'crc-export-preview-count-icon' });
			setIcon(countIcon, item.icon);
			countEl.createDiv({ cls: 'crc-export-preview-count-value', text: item.count });
			countEl.createDiv({ cls: 'crc-export-preview-count-label', text: item.label });
		}

		// Note about scanning
		const noteEl = section.createDiv({ cls: 'crc-export-preview-note' });
		noteEl.createSpan({ text: 'Vault will be scanned when you click Export. Entity counts will be shown during export.' });
	}

	/**
	 * Step 5: Export Progress
	 */
	private renderStep5Export(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-export-section' });
		section.createEl('h3', { text: 'Exporting...', cls: 'crc-export-section-title' });

		// Progress bar
		const progressBar = section.createDiv({ cls: 'crc-export-progress-bar' });
		const progressFill = progressBar.createDiv({ cls: 'crc-export-progress-fill' });
		progressFill.style.width = '0%';

		// Status text
		const statusEl = section.createDiv({ cls: 'crc-export-progress-status' });
		statusEl.textContent = 'Starting export...';

		// Log area
		const logArea = section.createDiv({ cls: 'crc-export-log' });
		logArea.createDiv({ cls: 'crc-export-log-entry', text: 'Waiting to start...' });

		// TODO: Implement actual export logic
	}

	/**
	 * Step 6: Complete
	 */
	private renderStep6Complete(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'crc-export-section' });

		// Completion message
		const completeEl = section.createDiv({ cls: 'crc-export-complete' });
		const completeIcon = completeEl.createDiv({ cls: 'crc-export-complete-icon' });
		setIcon(completeIcon, 'check-circle');
		completeEl.createDiv({ cls: 'crc-export-complete-title', text: 'Export Complete!' });
		completeEl.createDiv({ cls: 'crc-export-complete-message', text: 'Your data has been successfully exported.' });

		// File info
		const fileCard = section.createDiv({ cls: 'crc-export-file-card crc-mt-3' });

		const fileHeader = fileCard.createDiv({ cls: 'crc-export-file-header' });
		const fileIcon = fileHeader.createDiv({ cls: 'crc-export-file-icon' });
		setIcon(fileIcon, 'file');

		const fileDetails = fileHeader.createDiv({ cls: 'crc-export-file-details' });
		fileDetails.createDiv({
			cls: 'crc-export-file-name',
			text: this.formData.outputFilePath || `export.${this.getFormatExtension()}`
		});
		fileDetails.createDiv({
			cls: 'crc-export-file-size',
			text: this.formatFileSize(this.formData.outputFileSize)
		});

		// Summary stats
		section.createEl('h4', { text: 'Export summary', cls: 'crc-export-options-title crc-mt-3' });

		const stats = section.createDiv({ cls: 'crc-export-complete-stats' });

		const statItems = [
			{ label: 'People', value: this.formData.previewCounts.people, color: 'blue' },
			{ label: 'Places', value: this.formData.previewCounts.places, color: 'green' },
			{ label: 'Sources', value: this.formData.previewCounts.sources, color: 'purple' },
			{ label: 'Events', value: this.formData.previewCounts.events, color: 'orange' }
		];

		for (const stat of statItems) {
			if (stat.value > 0) {
				const statEl = stats.createDiv({ cls: 'crc-export-complete-stat' });
				statEl.createDiv({ cls: `crc-export-complete-stat-value crc-export-complete-stat-value--${stat.color}`, text: String(stat.value) });
				statEl.createDiv({ cls: 'crc-export-complete-stat-label', text: stat.label });
			}
		}

		// Privacy note
		if (this.formData.privacyHandling !== 'include' && this.formData.livingCount > 0) {
			const privacyNote = section.createDiv({ cls: 'crc-export-complete-privacy' });
			privacyNote.textContent = `${this.formData.livingCount} living persons ${this.formData.privacyHandling === 'exclude' ? 'excluded' : 'redacted'}.`;
		}
	}

	/**
	 * Render footer with navigation buttons
	 */
	private renderFooter(container: HTMLElement): void {
		const footer = container.createDiv({ cls: 'crc-export-footer' });

		// Left side: Cancel or Back
		const leftBtns = footer.createDiv({ cls: 'crc-export-footer-left' });

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
		}

		// Right side: Next or action buttons
		const rightBtns = footer.createDiv({ cls: 'crc-export-footer-right' });

		if (this.currentStep < 3) {
			// Steps 0-2: Show Next button
			const nextBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: 'Next'
			});

			nextBtn.addEventListener('click', () => {
				this.currentStep++;
				this.renderCurrentStep();
			});
		} else if (this.currentStep === 3) {
			// Step 3: Show Export button
			const exportBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: 'Export'
			});
			exportBtn.addEventListener('click', () => {
				this.currentStep = 4;
				this.renderCurrentStep();
				// TODO: Start actual export
			});
		} else if (this.currentStep === 5) {
			// Step 5 (Complete): Show Export Another and Done buttons
			const exportAnotherBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--secondary',
				text: 'Export Another'
			});
			exportAnotherBtn.addEventListener('click', () => {
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
	 * Render a folder row
	 */
	private renderFolderRow(
		container: HTMLElement,
		label: string,
		value: string,
		editable: boolean,
		onChange?: (value: string) => void
	): void {
		const row = container.createDiv({ cls: 'crc-export-folder-row' });
		row.createSpan({ text: label, cls: 'crc-export-folder-label' });

		if (editable && onChange) {
			const inputWrapper = row.createDiv({ cls: 'crc-export-folder-input-wrapper' });
			const input = inputWrapper.createEl('input', {
				type: 'text',
				cls: 'crc-export-input',
				value: value
			});
			input.addEventListener('input', () => onChange(input.value));

			const browseBtn = inputWrapper.createEl('button', {
				cls: 'crc-btn crc-btn--small',
				text: 'Browse'
			});
			// TODO: Implement folder picker
		} else {
			row.createSpan({ text: value + '/', cls: 'crc-export-folder-value' });
		}
	}

	/**
	 * Render a setting row
	 */
	private renderSettingRow(
		container: HTMLElement,
		label: string,
		value: string,
		valueClass?: string
	): void {
		const row = container.createDiv({ cls: 'crc-export-setting-row' });
		row.createSpan({ text: label, cls: 'crc-export-setting-label' });
		const valueEl = row.createSpan({ text: value, cls: 'crc-export-setting-value' });
		if (valueClass) {
			valueEl.addClass(`crc-export-setting-value--${valueClass}`);
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
		const row = container.createDiv({ cls: 'crc-export-toggle-row' });

		const labelEl = row.createDiv({ cls: 'crc-export-toggle-label' });
		labelEl.createSpan({ text: label });
		labelEl.createEl('small', { text: description });

		const toggle = row.createDiv({ cls: 'crc-export-toggle' });
		if (value) {
			toggle.addClass('crc-export-toggle--on');
		}

		toggle.addEventListener('click', () => {
			toggle.toggleClass('crc-export-toggle--on', !value);
			onChange(!value);
		});
	}

	/**
	 * Get format display name
	 */
	private getFormatDisplayName(): string {
		const format = EXPORT_FORMATS.find(f => f.id === this.formData.format);
		return format?.name || this.formData.format;
	}

	/**
	 * Get format file extension
	 */
	private getFormatExtension(): string {
		const format = EXPORT_FORMATS.find(f => f.id === this.formData.format);
		return format?.extension.replace('.', '') || 'ged';
	}

	/**
	 * Format file size for display
	 */
	private formatFileSize(bytes: number): string {
		if (bytes === 0) return '—';
		if (bytes < 1024) return `${bytes} bytes`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
}
