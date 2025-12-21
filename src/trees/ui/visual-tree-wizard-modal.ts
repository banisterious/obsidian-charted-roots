/**
 * Visual Tree Wizard Modal
 *
 * Modal for configuring and generating visual tree PDF diagrams.
 *
 * @deprecated Use UnifiedTreeWizardModal instead. This wizard has been superseded
 * by the unified wizard which supports both Canvas and PDF output formats.
 * This file will be removed in a future release.
 */

import { Modal, Setting, Notice, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { createLucideIcon, setLucideIcon, LucideIconName } from '../../ui/lucide-icons';
import { PersonPickerModal, PersonInfo } from '../../ui/person-picker';
import { FolderFilterService } from '../../core/folder-filter';
import { FamilyGraphService } from '../../core/family-graph';
import { VisualTreeService } from '../services/visual-tree-service';
import { PdfReportRenderer } from '../../reports/services/pdf-report-renderer';
import type {
	VisualTreeOptions,
	VisualTreeChartType,
	VisualTreePageSize,
	VisualTreeOrientation,
	VisualTreeNodeContent,
	VisualTreeColorScheme,
	LargeTreeHandling,
	TreeSizeAnalysis
} from '../types/visual-tree-types';

/**
 * Options for opening the visual tree wizard
 */
export interface VisualTreeWizardOptions {
	/** Pre-selected chart type */
	chartType?: VisualTreeChartType;
	/** Pre-selected person CR ID */
	personCrId?: string;
	/** Pre-selected person name */
	personName?: string;
}

/**
 * Modal for configuring visual tree PDF generation
 * @deprecated Use UnifiedTreeWizardModal instead
 */
export class VisualTreeWizardModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private options: VisualTreeWizardOptions;

	// Services
	private graphService: FamilyGraphService;
	private visualTreeService: VisualTreeService;
	private pdfRenderer: PdfReportRenderer;

	// Form state
	private selectedPersonCrId: string = '';
	private selectedPersonName: string = '';
	private chartType: VisualTreeChartType = 'pedigree';
	private maxGenerations: number = 5;
	private pageSize: VisualTreePageSize = 'letter';
	private orientation: VisualTreeOrientation = 'landscape';
	private nodeContent: VisualTreeNodeContent = 'name-dates';
	private colorScheme: VisualTreeColorScheme = 'gender';
	private includeSpouses: boolean = false;
	private title: string = '';
	private largeTreeHandling: LargeTreeHandling = 'auto-page-size';

	// UI element references
	private optionsContainer: HTMLElement | null = null;
	private personPickerSetting: Setting | null = null;
	private largeTreeWarning: HTMLElement | null = null;
	private treeSizeAnalysis: TreeSizeAnalysis | null = null;

	constructor(
		plugin: CanvasRootsPlugin,
		options?: VisualTreeWizardOptions
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.options = options ?? {};

		// Initialize services
		this.graphService = new FamilyGraphService(plugin.app);
		this.graphService.setSettings(plugin.settings);
		this.graphService.setPropertyAliases(plugin.settings.propertyAliases);
		this.graphService.setValueAliases(plugin.settings.valueAliases);

		this.visualTreeService = new VisualTreeService(plugin.app, this.graphService);
		this.pdfRenderer = new PdfReportRenderer();

		// Apply pre-selected options
		if (options?.chartType) {
			this.chartType = options.chartType;
		}
		if (options?.personCrId) {
			this.selectedPersonCrId = options.personCrId;
		}
		if (options?.personName) {
			this.selectedPersonName = options.personName;
		}
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass('cr-visual-tree-wizard');

		// Header
		const header = contentEl.createDiv({ cls: 'cr-modal-header' });
		const titleContainer = header.createDiv({ cls: 'cr-modal-title' });
		const icon = createLucideIcon('file-image', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Generate visual tree PDF');

		// Description
		contentEl.createEl('p', {
			text: 'Create a graphical family tree diagram as a PDF file.',
			cls: 'cr-modal-desc'
		});

		// Form container
		const form = contentEl.createDiv({ cls: 'cr-modal-form' });

		// Person picker
		this.renderPersonPicker(form);

		// Chart type selection
		this.renderChartTypeSelection(form);

		// Options container (for dynamic options)
		this.optionsContainer = form.createDiv({ cls: 'cr-visual-tree-options' });
		this.renderOptions();

		// Footer with buttons
		const footer = contentEl.createDiv({ cls: 'cr-modal-footer' });

		const cancelBtn = footer.createEl('button', {
			text: 'Cancel',
			cls: 'cr-btn'
		});
		cancelBtn.addEventListener('click', () => this.close());

		const generateBtn = footer.createEl('button', {
			text: 'Generate PDF',
			cls: 'cr-btn cr-btn--primary'
		});
		generateBtn.prepend(createLucideIcon('file-image', 16));
		generateBtn.addEventListener('click', () => void this.generatePdf());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/**
	 * Render person picker
	 */
	private renderPersonPicker(container: HTMLElement): void {
		const personContainer = container.createDiv({ cls: 'cr-form-group' });

		this.personPickerSetting = new Setting(personContainer)
			.setName('Root person')
			.setDesc(this.selectedPersonName || 'Select the person at the center of the tree')
			.addButton(button => {
				button
					.setButtonText(this.selectedPersonName || 'Select person...')
					.setCta()
					.onClick(() => {
						const folderFilter = this.plugin.settings.folderFilterMode !== 'disabled'
							? new FolderFilterService(this.plugin.settings)
							: undefined;

						const picker = new PersonPickerModal(
							this.app,
							(person: PersonInfo) => {
								this.selectedPersonCrId = person.crId;
								this.selectedPersonName = person.name;
								button.setButtonText(person.name);
								if (this.personPickerSetting) {
									this.personPickerSetting.setDesc(`Selected: ${person.name}`);
								}
								// Auto-fill title
								if (!this.title) {
									this.title = `${person.name} - ${this.getChartTypeLabel()}`;
								}
								// Analyze tree size now that person is selected
								this.analyzeTreeAndUpdateWarning();
							},
							folderFilter
						);
						picker.open();
					});
			});
	}

	/**
	 * Render chart type selection with visual cards
	 */
	private renderChartTypeSelection(container: HTMLElement): void {
		container.createDiv({ cls: 'setting-item-name', text: 'Chart type' });

		const typesContainer = container.createDiv({ cls: 'crc-wizard-tree-types crc-visual-tree-types' });

		const chartTypes: Array<{
			id: VisualTreeChartType;
			label: string;
			desc: string;
			icon: string;
			available: boolean;
		}> = [
			{
				id: 'pedigree',
				label: 'Pedigree',
				desc: 'Ancestors branching upward',
				icon: 'pedigree-tree',
				available: true
			},
			{
				id: 'descendant',
				label: 'Descendant',
				desc: 'Descendants branching downward',
				icon: 'descendant-tree',
				available: false // Phase 2.2
			},
			{
				id: 'hourglass',
				label: 'Hourglass',
				desc: 'Ancestors and descendants',
				icon: 'hourglass-tree',
				available: false // Phase 2.2
			},
			{
				id: 'fan',
				label: 'Fan chart',
				desc: 'Semicircular pedigree',
				icon: 'fan-chart',
				available: false // Phase 2.3
			}
		];

		for (const type of chartTypes) {
			const card = typesContainer.createDiv({
				cls: `crc-wizard-type-card ${this.chartType === type.id ? 'crc-wizard-type-card--selected' : ''} ${!type.available ? 'crc-wizard-type-card--disabled' : ''}`
			});

			const iconEl = createLucideIcon(type.icon as LucideIconName, 18);
			card.appendChild(iconEl);

			const info = card.createDiv({ cls: 'crc-wizard-type-info' });
			info.createDiv({ cls: 'crc-wizard-type-label', text: type.label });
			info.createDiv({ cls: 'crc-wizard-type-desc', text: type.desc });

			if (!type.available) {
				info.createDiv({ cls: 'crc-wizard-type-badge', text: 'Coming soon' });
			}

			if (type.available) {
				card.addEventListener('click', () => {
					this.chartType = type.id;
					// Update selection visually
					typesContainer.querySelectorAll('.crc-wizard-type-card').forEach(c => {
						c.removeClass('crc-wizard-type-card--selected');
					});
					card.addClass('crc-wizard-type-card--selected');
					// Re-render options for new chart type
					this.renderOptions();
				});
			}
		}
	}

	/**
	 * Render chart-specific options
	 */
	private renderOptions(): void {
		if (!this.optionsContainer) return;
		this.optionsContainer.empty();

		// Generations
		new Setting(this.optionsContainer)
			.setName('Maximum generations')
			.setDesc('How many generations to include')
			.addSlider(slider => {
				slider
					.setLimits(2, 10, 1)
					.setValue(this.maxGenerations)
					.setDynamicTooltip()
					.onChange(value => {
						this.maxGenerations = value;
						this.analyzeTreeAndUpdateWarning();
					});
			});

		// Page size
		new Setting(this.optionsContainer)
			.setName('Page size')
			.addDropdown(dropdown => {
				dropdown
					.addOption('letter', 'Letter (8.5 × 11 in)')
					.addOption('a4', 'A4 (210 × 297 mm)')
					.addOption('legal', 'Legal (8.5 × 14 in)')
					.addOption('tabloid', 'Tabloid (11 × 17 in)')
					.addOption('a3', 'A3 (297 × 420 mm)')
					.addOption('arch-d', 'Arch D (24 × 36 in)')
					.setValue(this.pageSize)
					.onChange(value => {
						this.pageSize = value as VisualTreePageSize;
						this.analyzeTreeAndUpdateWarning();
					});
			});

		// Orientation
		new Setting(this.optionsContainer)
			.setName('Orientation')
			.addDropdown(dropdown => {
				dropdown
					.addOption('landscape', 'Landscape')
					.addOption('portrait', 'Portrait')
					.setValue(this.orientation)
					.onChange(value => {
						this.orientation = value as VisualTreeOrientation;
						this.analyzeTreeAndUpdateWarning();
					});
			});

		// Node content
		new Setting(this.optionsContainer)
			.setName('Node content')
			.setDesc('What to display in each box')
			.addDropdown(dropdown => {
				dropdown
					.addOption('name', 'Name only')
					.addOption('name-dates', 'Name + dates')
					.addOption('name-dates-places', 'Name + dates + places')
					.setValue(this.nodeContent)
					.onChange(value => {
						this.nodeContent = value as VisualTreeNodeContent;
					});
			});

		// Color scheme
		new Setting(this.optionsContainer)
			.setName('Color scheme')
			.addDropdown(dropdown => {
				dropdown
					.addOption('default', 'Default (theme colors)')
					.addOption('gender', 'By gender (blue/pink)')
					.addOption('generation', 'By generation (rainbow)')
					.addOption('grayscale', 'Grayscale (for printing)')
					.setValue(this.colorScheme)
					.onChange(value => {
						this.colorScheme = value as VisualTreeColorScheme;
					});
			});

		// Include spouses (for applicable chart types)
		if (this.chartType !== 'fan') {
			new Setting(this.optionsContainer)
				.setName('Include spouses')
				.setDesc('Show spouse nodes alongside each person')
				.addToggle(toggle => {
					toggle
						.setValue(this.includeSpouses)
						.onChange(value => {
							this.includeSpouses = value;
						});
				});
		}

		// Large tree warning and handling options
		this.largeTreeWarning = this.optionsContainer.createDiv({ cls: 'cr-large-tree-warning' });
		this.largeTreeWarning.style.display = 'none';

		// Run initial analysis if person is selected
		if (this.selectedPersonCrId) {
			this.analyzeTreeAndUpdateWarning();
		}

		// Custom title
		new Setting(this.optionsContainer)
			.setName('Title')
			.setDesc('Custom title for the PDF (optional)')
			.addText(text => {
				text
					.setPlaceholder('Leave blank for auto-generated title')
					.setValue(this.title)
					.onChange(value => {
						this.title = value;
					});
			});
	}

	/**
	 * Analyze tree size and show warning if needed
	 */
	private analyzeTreeAndUpdateWarning(): void {
		if (!this.selectedPersonCrId || !this.largeTreeWarning) return;

		const options: VisualTreeOptions = {
			rootPersonCrId: this.selectedPersonCrId,
			chartType: this.chartType,
			maxGenerations: this.maxGenerations,
			pageSize: this.pageSize,
			orientation: this.orientation,
			nodeContent: this.nodeContent,
			colorScheme: this.colorScheme
		};

		this.treeSizeAnalysis = this.visualTreeService.analyzeTreeSize(options);

		if (!this.treeSizeAnalysis || !this.treeSizeAnalysis.isLarge) {
			this.largeTreeWarning.style.display = 'none';
			return;
		}

		// Show warning with options
		this.largeTreeWarning.style.display = 'block';
		this.largeTreeWarning.empty();

		const analysis = this.treeSizeAnalysis;

		// Warning header
		const header = this.largeTreeWarning.createDiv({ cls: 'cr-large-tree-warning-header' });
		header.appendChild(createLucideIcon('alert-triangle', 16));
		header.createSpan({ text: 'Large tree detected' });

		// Info
		const info = this.largeTreeWarning.createDiv({ cls: 'cr-large-tree-warning-info' });
		info.createEl('p', {
			text: `This tree has ${analysis.generationsCount} generations with up to ${analysis.maxNodesInGeneration} people in the widest generation. At current settings, cards would be approximately ${Math.round(analysis.estimatedCardWidth)}×${Math.round(analysis.estimatedCardHeight)} points, which may be too small to read.`
		});

		// Options
		const optionsDiv = this.largeTreeWarning.createDiv({ cls: 'cr-large-tree-warning-options' });
		optionsDiv.createEl('p', { text: 'Choose how to handle this:' });

		// Auto page size option
		const autoSizeOption = optionsDiv.createDiv({ cls: 'cr-large-tree-option' });
		const autoSizeRadio = autoSizeOption.createEl('input', {
			type: 'radio',
			attr: {
				name: 'largeTreeHandling',
				value: 'auto-page-size',
				id: 'largeTree-autoSize'
			}
		});
		if (this.largeTreeHandling === 'auto-page-size') {
			autoSizeRadio.checked = true;
		}
		autoSizeRadio.addEventListener('change', () => {
			this.largeTreeHandling = 'auto-page-size';
		});

		const autoSizeLabel = autoSizeOption.createEl('label', {
			attr: { for: 'largeTree-autoSize' }
		});
		autoSizeLabel.createEl('strong', { text: 'Use larger page size' });
		if (analysis.canFitOnSinglePage && analysis.recommendedPageSize) {
			autoSizeLabel.createEl('span', {
				text: ` — Will use ${this.getPageSizeLabel(analysis.recommendedPageSize)} to fit all ${analysis.generationsCount} generations on a single page`
			});
		} else {
			autoSizeLabel.createEl('span', {
				text: ' — Tree is too large to fit on any single page, even at maximum size'
			});
		}

		// Multi-page option
		const multiPageOption = optionsDiv.createDiv({ cls: 'cr-large-tree-option' });
		const multiPageRadio = multiPageOption.createEl('input', {
			type: 'radio',
			attr: {
				name: 'largeTreeHandling',
				value: 'multi-page',
				id: 'largeTree-multiPage'
			}
		});
		if (this.largeTreeHandling === 'multi-page') {
			multiPageRadio.checked = true;
		}
		multiPageRadio.addEventListener('change', () => {
			this.largeTreeHandling = 'multi-page';
		});

		const multiPageLabel = multiPageOption.createEl('label', {
			attr: { for: 'largeTree-multiPage' }
		});
		multiPageLabel.createEl('strong', { text: 'Split across multiple pages' });
		multiPageLabel.createEl('span', {
			text: ` — Will create ${analysis.pagesNeededForMultiPage} pages, each showing 4 generations`
		});
	}

	/**
	 * Get human-readable page size label
	 */
	private getPageSizeLabel(pageSize: VisualTreePageSize): string {
		const labels: Record<VisualTreePageSize, string> = {
			'letter': 'Letter',
			'a4': 'A4',
			'legal': 'Legal',
			'tabloid': 'Tabloid',
			'a3': 'A3',
			'arch-d': 'Arch D (24×36 in)'
		};
		return labels[pageSize] || pageSize;
	}

	/**
	 * Generate the PDF
	 */
	private async generatePdf(): Promise<void> {
		// Validate
		if (!this.selectedPersonCrId) {
			new Notice('Please select a root person.');
			return;
		}

		// Build options
		const options: VisualTreeOptions = {
			rootPersonCrId: this.selectedPersonCrId,
			chartType: this.chartType,
			maxGenerations: this.maxGenerations,
			pageSize: this.pageSize,
			orientation: this.orientation,
			nodeContent: this.nodeContent,
			colorScheme: this.colorScheme,
			includeSpouses: this.includeSpouses,
			title: this.title || `${this.selectedPersonName} - ${this.getChartTypeLabel()}`,
			largeTreeHandling: this.treeSizeAnalysis?.isLarge ? this.largeTreeHandling : undefined
		};

		try {
			new Notice('Generating PDF...');

			// Build layouts (may be multiple for multi-page output)
			const layouts = this.visualTreeService.buildLayouts(options);

			if (layouts.length === 0) {
				new Notice('Failed to generate tree layout. The person may not have any ancestors.');
				return;
			}

			// Generate PDF(s)
			await this.pdfRenderer.renderVisualTrees(layouts, options);

			// Calculate total people count
			const totalPeople = layouts.reduce((sum, l) => sum + l.stats.peopleCount, 0);
			const totalGenerations = layouts[0].stats.generationsCount + (layouts.length > 1 ? ` (${layouts.length} pages)` : '');

			if (layouts.length > 1) {
				new Notice(`PDF generated with ${totalPeople} people across ${layouts.length} pages.`);
			} else {
				new Notice(`PDF generated with ${layouts[0].stats.peopleCount} people across ${layouts[0].stats.generationsCount} generations.`);
			}
			this.close();

		} catch (error) {
			console.error('Error generating visual tree PDF:', error);
			new Notice('Error generating PDF. Check console for details.');
		}
	}

	/**
	 * Get display label for chart type
	 */
	private getChartTypeLabel(): string {
		switch (this.chartType) {
			case 'pedigree': return 'Pedigree Chart';
			case 'descendant': return 'Descendant Chart';
			case 'hourglass': return 'Hourglass Chart';
			case 'fan': return 'Fan Chart';
		}
	}
}
