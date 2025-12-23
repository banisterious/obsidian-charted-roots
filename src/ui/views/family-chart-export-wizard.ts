/**
 * Family Chart Export Wizard
 *
 * A two-step wizard for exporting family chart visualizations.
 *
 * Step 1: Quick Export — Presets, format selection, filename, size estimate
 * Step 2: Customize — Avatar options, scope, format-specific settings
 *
 * Most users complete their export in Step 1. Step 2 provides additional
 * customization for power users.
 */

import { Modal, Notice, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { createLucideIcon } from '../lucide-icons';
import type { FamilyChartView } from './family-chart-view';
import { FamilyChartExportProgressModal } from './family-chart-export-progress-modal';

/**
 * Export format types
 */
type ExportFormat = 'png' | 'svg' | 'pdf' | 'odt';

/**
 * Export preset definitions
 */
interface ExportPreset {
	id: string;
	label: string;
	description: string;
	format: ExportFormat;
	includeAvatars: boolean;
	scale?: number;          // PNG only
	includeCoverPage?: boolean;  // PDF/ODT only
}

/**
 * Available presets
 */
const EXPORT_PRESETS: ExportPreset[] = [
	{
		id: 'quick-share',
		label: 'Quick Share',
		description: 'PNG · 1x · No avatars',
		format: 'png',
		includeAvatars: false,
		scale: 1
	},
	{
		id: 'high-quality',
		label: 'High Quality',
		description: 'PNG · 2x · With avatars',
		format: 'png',
		includeAvatars: true,
		scale: 2
	},
	{
		id: 'print-ready',
		label: 'Print Ready',
		description: 'PDF · Cover page',
		format: 'pdf',
		includeAvatars: true,
		includeCoverPage: true
	},
	{
		id: 'editable',
		label: 'Editable',
		description: 'SVG · Vector format',
		format: 'svg',
		includeAvatars: false
	},
	{
		id: 'document',
		label: 'Document',
		description: 'ODT · For merging',
		format: 'odt',
		includeAvatars: true,
		includeCoverPage: true
	}
];

/**
 * Form data for export options
 */
interface ExportFormData {
	// Step 1 - Quick Export
	selectedPreset: string | null;
	format: ExportFormat;
	filename: string;

	// Step 2 - Customize
	includeAvatars: boolean;
	scope: 'full' | 'limited';
	limitedDepth: number;

	// PNG options
	scale: number;

	// PDF options
	pageSize: 'fit' | 'a4' | 'letter' | 'legal' | 'tabloid';
	layout: 'single' | 'tiled';
	orientation: 'auto' | 'portrait' | 'landscape';
	includeCoverPage: boolean;
	coverTitle: string;
	coverSubtitle: string;

	// ODT options (same cover page options as PDF)
}

/**
 * Size estimate for export preview
 */
interface ExportEstimate {
	peopleCount: number;
	avatarCount: number;
	estimatedSizeBytes: number;
	isLarge: boolean;
	warningMessage: string | null;
}

/**
 * Family Chart Export Wizard Modal
 */
export class FamilyChartExportWizard extends Modal {
	private plugin: CanvasRootsPlugin;
	private chartView: FamilyChartView;

	// Current step (0 = Quick Export, 1 = Customize)
	private currentStep: number = 0;

	// Form data
	private formData: ExportFormData;

	// UI containers
	private contentContainer?: HTMLElement;
	private progressContainer?: HTMLElement;

	// Export estimate cache
	private estimate: ExportEstimate | null = null;

	// Step definitions
	private readonly steps = [
		{ number: 1, title: 'Quick Export', description: 'Choose a preset or format' },
		{ number: 2, title: 'Customize', description: 'Fine-tune export options' }
	];

	constructor(plugin: CanvasRootsPlugin, chartView: FamilyChartView) {
		super(plugin.app);
		this.plugin = plugin;
		this.chartView = chartView;

		// Initialize form data with defaults
		this.formData = this.getDefaultFormData();
	}

	/**
	 * Get default form data based on current chart state
	 */
	private getDefaultFormData(): ExportFormData {
		const info = this.chartView.getExportInfo();
		const sanitizedName = this.getRootPersonName(); // Hyphenated for filename
		const displayName = info.rootPersonName; // Original name with spaces for cover title
		const date = new Date().toISOString().split('T')[0];
		const defaultFilename = `${sanitizedName}-family-chart-${date}`;

		return {
			selectedPreset: null,
			format: 'png',
			filename: defaultFilename,
			includeAvatars: true,
			scope: 'full',
			limitedDepth: 3,
			scale: 2,
			pageSize: 'fit',
			layout: 'single',
			orientation: 'auto',
			includeCoverPage: false,
			coverTitle: `${displayName} Family Tree`,
			coverSubtitle: ''
		};
	}

	/**
	 * Get root person name from chart for default filename
	 */
	private getRootPersonName(): string {
		const info = this.chartView.getExportInfo();
		// Sanitize name for filename
		const sanitized = info.rootPersonName
			.replace(/[<>:"/\\|?*]/g, '')
			.replace(/\s+/g, '-');
		return sanitized || 'family';
	}

	/**
	 * Calculate export size estimate
	 */
	private calculateEstimate(): ExportEstimate {
		const info = this.chartView.getExportInfo();
		const peopleCount = info.peopleCount;
		const avatarCount = info.avatarCount;

		// Estimate file size based on format and options
		// These are rough estimates based on typical family chart exports
		const baseSizePerPerson = 500; // bytes for SVG node
		const avatarSize = 15000; // ~15KB per base64 avatar
		const scaleMultiplier = this.formData.format === 'png' ? this.formData.scale : 1;

		let estimatedSizeBytes = peopleCount * baseSizePerPerson * scaleMultiplier;
		if (this.formData.includeAvatars) {
			estimatedSizeBytes += avatarCount * avatarSize;
		}

		// PNG and PDF are typically larger than SVG
		if (this.formData.format === 'png' || this.formData.format === 'pdf') {
			estimatedSizeBytes *= 2;
		}

		const isLarge = peopleCount > 100 ||
			(avatarCount > 50 && this.formData.includeAvatars) ||
			estimatedSizeBytes > 5 * 1024 * 1024;

		let warningMessage: string | null = null;
		if (isLarge) {
			warningMessage = 'Large export — may take 10-30 seconds';
		}

		return {
			peopleCount,
			avatarCount,
			estimatedSizeBytes,
			isLarge,
			warningMessage
		};
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-export-wizard');

		// Modal header with icon and title
		const header = contentEl.createDiv({ cls: 'cr-export-wizard-header' });

		const titleRow = header.createDiv({ cls: 'cr-wizard-title' });
		titleRow.appendChild(createLucideIcon('download', 24));
		titleRow.createSpan({ text: 'Export Family Chart' });

		// Close button
		const closeBtn = header.createDiv({ cls: 'cr-export-wizard-close' });
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => this.close());

		// Step progress indicator
		this.renderStepProgress(contentEl);

		// Content container
		this.contentContainer = contentEl.createDiv({ cls: 'cr-export-wizard-content' });

		// Calculate initial estimate
		this.estimate = this.calculateEstimate();

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
		this.progressContainer = container.createDiv({ cls: 'cr-wizard-progress' });
		this.updateStepProgress();
	}

	/**
	 * Update the step progress indicator
	 */
	private updateStepProgress(): void {
		if (!this.progressContainer) return;
		this.progressContainer.empty();

		const stepsRow = this.progressContainer.createDiv({ cls: 'cr-wizard-steps' });

		this.steps.forEach((step, index) => {
			// Step circle with number
			const stepEl = stepsRow.createDiv({ cls: 'cr-wizard-step' });

			// Mark active or completed
			if (index === this.currentStep) {
				stepEl.addClass('cr-wizard-step--active');
			} else if (index < this.currentStep) {
				stepEl.addClass('cr-wizard-step--completed');
			}

			// Step number circle
			const numberEl = stepEl.createDiv({ cls: 'cr-wizard-step-number' });
			if (index < this.currentStep) {
				// Show checkmark for completed steps
				setIcon(numberEl, 'check');
			} else {
				numberEl.textContent = String(step.number);
			}

			// Step info (title shown only for active step)
			const infoEl = stepEl.createDiv({ cls: 'cr-wizard-step-info' });
			infoEl.createDiv({ cls: 'cr-wizard-step-title', text: step.title });

			// Add connector between steps (except after last step)
			if (index < this.steps.length - 1) {
				const connector = stepsRow.createDiv({ cls: 'cr-wizard-connector' });
				if (index < this.currentStep) {
					connector.addClass('cr-wizard-connector--completed');
				}
			}
		});

		// Step counter and description below the circles
		const stepInfo = this.progressContainer.createDiv({ cls: 'cr-export-step-info' });
		const currentStepData = this.steps[this.currentStep];

		stepInfo.createDiv({
			cls: 'cr-export-step-counter',
			text: `Step ${this.currentStep + 1} of ${this.steps.length}`
		});

		stepInfo.createDiv({
			cls: 'cr-export-step-description',
			text: currentStepData.description
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

		// Recalculate estimate based on current options
		this.estimate = this.calculateEstimate();

		if (this.currentStep === 0) {
			this.renderStep1(this.contentContainer);
		} else {
			this.renderStep2(this.contentContainer);
		}

		this.renderFooter(this.contentContainer);
	}

	// ========== STEP 1: QUICK EXPORT ==========

	private renderStep1(container: HTMLElement): void {
		// Presets section
		const presetsSection = container.createDiv({ cls: 'cr-export-section' });
		presetsSection.createEl('h3', { text: 'Presets', cls: 'cr-export-section-title' });

		const presetsGrid = presetsSection.createDiv({ cls: 'cr-export-presets-grid' });

		for (const preset of EXPORT_PRESETS) {
			const presetCard = presetsGrid.createDiv({
				cls: `cr-export-preset-card ${this.formData.selectedPreset === preset.id ? 'cr-export-preset-card--selected' : ''}`
			});

			presetCard.createDiv({ cls: 'cr-export-preset-label', text: preset.label });
			presetCard.createDiv({ cls: 'cr-export-preset-desc', text: preset.description });

			presetCard.addEventListener('click', () => {
				this.applyPreset(preset);
				this.renderCurrentStep();
			});
		}

		// Separator
		container.createEl('hr', { cls: 'cr-export-separator' });

		// Format section
		const formatSection = container.createDiv({ cls: 'cr-export-section' });
		formatSection.createEl('h3', { text: 'Format', cls: 'cr-export-section-title' });

		const formatGrid = formatSection.createDiv({ cls: 'cr-export-format-grid' });

		const formats: { id: ExportFormat; label: string; icon: string }[] = [
			{ id: 'png', label: 'PNG', icon: 'image' },
			{ id: 'svg', label: 'SVG', icon: 'file-code' },
			{ id: 'pdf', label: 'PDF', icon: 'file-text' },
			{ id: 'odt', label: 'ODT', icon: 'file' }
		];

		for (const format of formats) {
			const formatCard = formatGrid.createDiv({
				cls: `cr-export-format-card ${this.formData.format === format.id ? 'cr-export-format-card--selected' : ''}`
			});

			const iconEl = formatCard.createDiv({ cls: 'cr-export-format-icon' });
			setIcon(iconEl, format.icon);

			formatCard.createDiv({ cls: 'cr-export-format-label', text: format.label });

			formatCard.addEventListener('click', () => {
				this.formData.format = format.id;
				this.formData.selectedPreset = null; // Clear preset when manually changing format
				this.updateFilenameExtension();
				this.renderCurrentStep();
			});
		}

		// Filename section
		const filenameSection = container.createDiv({ cls: 'cr-export-section' });
		filenameSection.createEl('h3', { text: 'Filename', cls: 'cr-export-section-title' });

		const filenameRow = filenameSection.createDiv({ cls: 'cr-export-filename-row' });

		const filenameInput = filenameRow.createEl('input', {
			type: 'text',
			cls: 'cr-export-filename-input',
			value: this.formData.filename
		});

		filenameInput.addEventListener('input', (e) => {
			this.formData.filename = (e.target as HTMLInputElement).value;
		});

		filenameRow.createSpan({ cls: 'cr-export-filename-ext', text: `.${this.formData.format}` });

		// Separator
		container.createEl('hr', { cls: 'cr-export-separator' });

		// Estimate section
		this.renderEstimatePanel(container);
	}

	// ========== STEP 2: CUSTOMIZE ==========

	private renderStep2(container: HTMLElement): void {
		// Avatars section
		const avatarsSection = container.createDiv({ cls: 'cr-export-section' });
		avatarsSection.createEl('h3', { text: 'Avatars', cls: 'cr-export-section-title' });

		const avatarOptions = [
			{ value: true, label: 'Include avatars', desc: 'Slower, larger file' },
			{ value: false, label: 'Exclude avatars', desc: 'Faster, smaller file' }
		];

		for (const opt of avatarOptions) {
			const optionRow = avatarsSection.createDiv({ cls: 'cr-export-radio-row' });

			const radio = optionRow.createEl('input', {
				type: 'radio',
				attr: { name: 'avatars', id: `avatar-${opt.value}` }
			});
			radio.checked = this.formData.includeAvatars === opt.value;
			radio.addEventListener('change', () => {
				this.formData.includeAvatars = opt.value;
				this.renderCurrentStep();
			});

			const label = optionRow.createEl('label', { attr: { for: `avatar-${opt.value}` } });
			label.createSpan({ text: opt.label, cls: 'cr-export-radio-label' });
			label.createSpan({ text: ` (${opt.desc})`, cls: 'cr-export-radio-desc' });
		}

		// Scope section
		const scopeSection = container.createDiv({ cls: 'cr-export-section' });
		scopeSection.createEl('h3', { text: 'Scope', cls: 'cr-export-section-title' });

		// Full tree option (always selected for now)
		const fullTreeRow = scopeSection.createDiv({ cls: 'cr-export-radio-row' });
		const fullTreeRadio = fullTreeRow.createEl('input', {
			type: 'radio',
			attr: { name: 'scope', id: 'scope-full', checked: 'checked' }
		});
		fullTreeRadio.checked = true;

		const fullTreeLabel = fullTreeRow.createEl('label', { attr: { for: 'scope-full' } });
		fullTreeLabel.createSpan({ text: 'Full tree', cls: 'cr-export-radio-label' });
		fullTreeLabel.createSpan({ text: ' (uses current depth settings from toolbar)', cls: 'cr-export-radio-desc' });

		// Note about adjusting depth
		const scopeHint = scopeSection.createDiv({ cls: 'cr-export-scope-hint' });
		scopeHint.createSpan({
			text: 'Tip: Adjust tree depth using the branch icon in the toolbar before exporting.',
			cls: 'cr-export-hint-text'
		});

		// Format-specific options
		this.renderFormatSpecificOptions(container);

		// Separator
		container.createEl('hr', { cls: 'cr-export-separator' });

		// Estimate section
		this.renderEstimatePanel(container);
	}

	/**
	 * Render format-specific options in Step 2
	 */
	private renderFormatSpecificOptions(container: HTMLElement): void {
		// Separator before format options
		container.createEl('hr', { cls: 'cr-export-separator' });

		switch (this.formData.format) {
			case 'png':
				this.renderPngOptions(container);
				break;
			case 'pdf':
				this.renderPdfOptions(container);
				break;
			case 'odt':
				this.renderOdtOptions(container);
				break;
			// SVG has no additional options
		}
	}

	/**
	 * Render PNG-specific options
	 */
	private renderPngOptions(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-export-section' });
		section.createEl('h3', { text: 'PNG Options', cls: 'cr-export-section-title' });

		const scaleRow = section.createDiv({ cls: 'cr-export-option-row' });
		scaleRow.createSpan({ text: 'Scale:', cls: 'cr-export-option-label' });

		const scaleButtons = scaleRow.createDiv({ cls: 'cr-export-scale-buttons' });

		for (const scale of [1, 2, 3]) {
			const btn = scaleButtons.createEl('button', {
				cls: `cr-export-scale-btn ${this.formData.scale === scale ? 'cr-export-scale-btn--selected' : ''}`,
				text: `${scale}x`
			});
			btn.addEventListener('click', () => {
				this.formData.scale = scale;
				this.renderCurrentStep();
			});
		}
	}

	/**
	 * Render PDF-specific options
	 */
	private renderPdfOptions(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-export-section' });
		section.createEl('h3', { text: 'PDF Options', cls: 'cr-export-section-title' });

		// Page size
		const pageSizeRow = section.createDiv({ cls: 'cr-export-option-row' });
		pageSizeRow.createSpan({ text: 'Page size:', cls: 'cr-export-option-label' });

		const pageSizeSelect = pageSizeRow.createEl('select', { cls: 'cr-export-select' });
		const pageSizes = [
			{ value: 'fit', label: 'Fit to content' },
			{ value: 'a4', label: 'A4' },
			{ value: 'letter', label: 'Letter' },
			{ value: 'legal', label: 'Legal' },
			{ value: 'tabloid', label: 'Tabloid' }
		];

		for (const size of pageSizes) {
			const option = pageSizeSelect.createEl('option', {
				value: size.value,
				text: size.label
			});
			if (size.value === this.formData.pageSize) option.selected = true;
		}

		pageSizeSelect.addEventListener('change', () => {
			this.formData.pageSize = pageSizeSelect.value as ExportFormData['pageSize'];
			this.renderCurrentStep();
		});

		// Layout (only for non-fit page sizes)
		if (this.formData.pageSize !== 'fit') {
			const layoutRow = section.createDiv({ cls: 'cr-export-option-row' });
			layoutRow.createSpan({ text: 'Layout:', cls: 'cr-export-option-label' });

			const layoutSelect = layoutRow.createEl('select', { cls: 'cr-export-select' });
			const layouts = [
				{ value: 'single', label: 'Single page' },
				{ value: 'tiled', label: 'Tiled pages' }
			];

			for (const layout of layouts) {
				const option = layoutSelect.createEl('option', {
					value: layout.value,
					text: layout.label
				});
				if (layout.value === this.formData.layout) option.selected = true;
			}

			layoutSelect.addEventListener('change', () => {
				this.formData.layout = layoutSelect.value as 'single' | 'tiled';
				this.renderCurrentStep();
			});

			// Orientation (only for tiled layout)
			if (this.formData.layout === 'tiled') {
				const orientationRow = section.createDiv({ cls: 'cr-export-option-row' });
				orientationRow.createSpan({ text: 'Orientation:', cls: 'cr-export-option-label' });

				const orientationSelect = orientationRow.createEl('select', { cls: 'cr-export-select' });
				const orientations = [
					{ value: 'auto', label: 'Auto' },
					{ value: 'portrait', label: 'Portrait' },
					{ value: 'landscape', label: 'Landscape' }
				];

				for (const orientation of orientations) {
					const option = orientationSelect.createEl('option', {
						value: orientation.value,
						text: orientation.label
					});
					if (orientation.value === this.formData.orientation) option.selected = true;
				}

				orientationSelect.addEventListener('change', () => {
					this.formData.orientation = orientationSelect.value as 'auto' | 'portrait' | 'landscape';
				});
			}
		}

		// Cover page
		this.renderCoverPageOptions(section);
	}

	/**
	 * Render ODT-specific options
	 */
	private renderOdtOptions(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-export-section' });
		section.createEl('h3', { text: 'ODT Options', cls: 'cr-export-section-title' });

		// Cover page
		this.renderCoverPageOptions(section);
	}

	/**
	 * Render cover page options (shared by PDF and ODT)
	 */
	private renderCoverPageOptions(container: HTMLElement): void {
		const coverRow = container.createDiv({ cls: 'cr-export-option-row cr-export-option-row--checkbox' });

		const checkbox = coverRow.createEl('input', {
			type: 'checkbox',
			attr: { id: 'cover-page' }
		});
		checkbox.checked = this.formData.includeCoverPage;

		const label = coverRow.createEl('label', {
			text: 'Include cover page',
			attr: { for: 'cover-page' }
		});

		checkbox.addEventListener('change', () => {
			this.formData.includeCoverPage = checkbox.checked;
			this.renderCurrentStep();
		});

		// Title/subtitle fields when cover page enabled
		if (this.formData.includeCoverPage) {
			const titleRow = container.createDiv({ cls: 'cr-export-option-row' });
			titleRow.createSpan({ text: 'Title:', cls: 'cr-export-option-label' });

			const titleInput = titleRow.createEl('input', {
				type: 'text',
				cls: 'cr-export-input',
				value: this.formData.coverTitle
			});

			titleInput.addEventListener('input', (e) => {
				this.formData.coverTitle = (e.target as HTMLInputElement).value;
			});

			const subtitleRow = container.createDiv({ cls: 'cr-export-option-row' });
			subtitleRow.createSpan({ text: 'Subtitle:', cls: 'cr-export-option-label' });

			const subtitleInput = subtitleRow.createEl('input', {
				type: 'text',
				cls: 'cr-export-input',
				value: this.formData.coverSubtitle,
				placeholder: 'Optional'
			});

			subtitleInput.addEventListener('input', (e) => {
				this.formData.coverSubtitle = (e.target as HTMLInputElement).value;
			});
		}
	}

	/**
	 * Render the estimate panel
	 */
	private renderEstimatePanel(container: HTMLElement): void {
		if (!this.estimate) return;

		const section = container.createDiv({ cls: 'cr-export-section cr-export-estimate' });
		section.createEl('h3', { text: 'Estimate', cls: 'cr-export-section-title' });

		const statsRow = section.createDiv({ cls: 'cr-export-stats-row' });

		statsRow.createDiv({
			cls: 'cr-export-stat',
			text: `People: ${this.estimate.peopleCount}`
		});

		if (this.formData.includeAvatars) {
			statsRow.createDiv({
				cls: 'cr-export-stat',
				text: `Avatars: ${this.estimate.avatarCount}`
			});
		}

		statsRow.createDiv({
			cls: 'cr-export-stat',
			text: `Est. size: ${this.formatFileSize(this.estimate.estimatedSizeBytes)}`
		});

		// Warning message
		if (this.estimate.warningMessage) {
			const warning = section.createDiv({ cls: 'cr-export-warning' });
			warning.appendChild(createLucideIcon('alert-triangle', 16));
			warning.createSpan({ text: this.estimate.warningMessage });
		}
	}

	/**
	 * Render the footer with navigation buttons
	 * Layout matches "Generate family tree" wizard: Cancel on left, primary action on right
	 */
	private renderFooter(container: HTMLElement): void {
		const footer = container.createDiv({ cls: 'cr-export-wizard-footer' });

		// Left side: Cancel (step 1) or Back (step 2)
		if (this.currentStep === 0) {
			const cancelBtn = footer.createEl('button', {
				cls: 'cr-btn',
				text: 'Cancel'
			});
			cancelBtn.addEventListener('click', () => this.close());
		} else {
			const backBtn = footer.createEl('button', {
				cls: 'cr-btn'
			});
			backBtn.appendChild(createLucideIcon('chevron-left', 16));
			backBtn.appendText('Back');
			backBtn.addEventListener('click', () => {
				this.currentStep = 0;
				this.renderCurrentStep();
			});
		}

		// Right side: Primary action with arrow
		if (this.currentStep === 0) {
			// Step 1: Show both "Next" (to customize) and "Export" (quick path)
			const rightBtns = footer.createDiv({ cls: 'cr-export-footer-right' });

			const nextBtn = rightBtns.createEl('button', {
				cls: 'cr-btn cr-btn--outline'
			});
			nextBtn.appendText('Customize');
			nextBtn.appendChild(createLucideIcon('arrow-right', 16));
			nextBtn.addEventListener('click', () => {
				this.currentStep = 1;
				this.renderCurrentStep();
			});

			const exportBtn = rightBtns.createEl('button', {
				cls: 'cr-btn cr-btn--primary'
			});
			exportBtn.appendText('Export');
			exportBtn.appendChild(createLucideIcon('download', 16));
			exportBtn.addEventListener('click', () => this.doExport());
		} else {
			// Step 2: Just Export
			const exportBtn = footer.createEl('button', {
				cls: 'cr-btn cr-btn--primary'
			});
			exportBtn.appendText('Export');
			exportBtn.appendChild(createLucideIcon('download', 16));
			exportBtn.addEventListener('click', () => this.doExport());
		}
	}

	// ========== HELPER METHODS ==========

	/**
	 * Apply a preset to form data
	 */
	private applyPreset(preset: ExportPreset): void {
		this.formData.selectedPreset = preset.id;
		this.formData.format = preset.format;
		this.formData.includeAvatars = preset.includeAvatars;

		if (preset.scale !== undefined) {
			this.formData.scale = preset.scale;
		}

		if (preset.includeCoverPage !== undefined) {
			this.formData.includeCoverPage = preset.includeCoverPage;
		}

		this.updateFilenameExtension();
	}

	/**
	 * Update filename extension based on current format
	 */
	private updateFilenameExtension(): void {
		// The extension is displayed separately, so just ensure filename doesn't have one
		const filename = this.formData.filename;
		const extMatch = filename.match(/\.(png|svg|pdf|odt)$/i);
		if (extMatch) {
			this.formData.filename = filename.slice(0, -extMatch[0].length);
		}
	}

	/**
	 * Format file size for display
	 */
	private formatFileSize(bytes: number): string {
		if (bytes === 0) return '~0 B';
		if (bytes < 1024) return `~${bytes} B`;
		if (bytes < 1024 * 1024) return `~${(bytes / 1024).toFixed(1)} KB`;
		return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * Perform the export
	 */
	private async doExport(): Promise<void> {
		const filename = `${this.formData.filename}.${this.formData.format}`;

		try {
			if (this.formData.format === 'odt') {
				// ODT export not yet implemented (Phase 6)
				new Notice('ODT export not yet implemented');
				return;
			}

			// Close the wizard modal
			this.close();

			// Determine format name for progress modal title
			const formatNames: Record<string, string> = {
				png: 'PNG',
				svg: 'SVG',
				pdf: 'PDF'
			};
			const formatName = formatNames[this.formData.format] || this.formData.format.toUpperCase();

			// Create and open progress modal
			const progressModal = new FamilyChartExportProgressModal(this.app, formatName);
			progressModal.open();

			// Perform the export with progress tracking
			await this.chartView.exportWithOptions({
				format: this.formData.format as 'png' | 'svg' | 'pdf',
				filename,
				includeAvatars: this.formData.includeAvatars,
				scale: this.formData.scale,
				// PDF-specific options
				pageSize: this.formData.pageSize,
				layout: this.formData.layout,
				orientation: this.formData.orientation,
				includeCoverPage: this.formData.includeCoverPage,
				coverTitle: this.formData.coverTitle,
				coverSubtitle: this.formData.coverSubtitle,
				// Progress tracking
				onProgress: (progress) => {
					if (progressModal.cancelled) return;
					progressModal.updateProgress(progress);
				},
				isCancelled: () => progressModal.cancelled
			});

			// Handle completion
			if (progressModal.cancelled) {
				progressModal.markCancelled();
				// Auto-close after brief delay
				setTimeout(() => progressModal.close(), 1000);
			} else {
				progressModal.markComplete();
				// Auto-close after brief delay
				setTimeout(() => progressModal.close(), 1500);
			}

		} catch (error) {
			console.error('Export failed:', error);
			new Notice(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
