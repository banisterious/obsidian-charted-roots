/**
 * Book Builder Modal
 *
 * A four-step wizard for building and generating compiled books.
 *
 * Step 1: Setup — Book metadata and template selection
 * Step 2: Chapters — Drag-and-drop chapter list with add/edit/remove
 * Step 3: Output — Format, page size, font, TOC/cover options
 * Step 4: Generate — Progress bar and save/download
 */

import { App, Modal, Notice, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { createLucideIcon } from '../../ui/lucide-icons';
import { PersonPickerModal, PersonInfo } from '../../ui/person-picker';
import { REPORT_METADATA, getReportsByCategory } from '../../reports/types/report-types';
import type { ReportType, ReportCategory } from '../../reports/types/report-types';
import type { VisualTreeChartType } from '../../trees/types/visual-tree-types';
import { BookGenerationService } from '../services/book-generation-service';
import type {
	BookDefinition,
	BookChapter,
	BookChapterType,
	BookMetadata,
	BookOutputOptions,
	BookOutputFormat,
	ReportChapterConfig,
	VisualTreeChapterConfig,
	VaultNoteChapterConfig,
	SectionDividerConfig,
	BookGenerationProgress,
} from '../types/book-types';
import { getLogger } from '../../core/logging';

const logger = getLogger('BookBuilderModal');

/** Options for opening the book builder with pre-loaded definition */
export interface BookBuilderOptions {
	/** Pre-loaded book definition (from .book.json) */
	definition?: BookDefinition;
	/** Source file path (for re-saving) */
	sourceFilePath?: string;
}

/** Chapter type display metadata */
const CHAPTER_TYPE_META: Record<BookChapterType, { label: string; icon: string }> = {
	'report': { label: 'Report', icon: 'file-text' },
	'visual-tree': { label: 'Visual tree', icon: 'git-branch' },
	'vault-note': { label: 'Vault note', icon: 'file' },
	'section-divider': { label: 'Section divider', icon: 'minus' },
};

/** Visual tree chart type labels */
const CHART_TYPE_LABELS: Record<VisualTreeChartType, string> = {
	'pedigree': 'Pedigree chart',
	'descendant': 'Descendant chart',
	'hourglass': 'Hourglass chart',
	'fan': 'Fan chart',
};

/**
 * Book Builder Modal
 */
export class BookBuilderModal extends Modal {
	private plugin: CanvasRootsPlugin;

	// Wizard state
	private currentStep: number = 0;

	// Book definition state
	private metadata: BookMetadata;
	private chapters: BookChapter[];
	private outputOptions: BookOutputOptions;

	// Source file path (for re-saving)
	private sourceFilePath?: string;

	// UI containers
	private contentContainer?: HTMLElement;
	private progressContainer?: HTMLElement;
	private chapterListContainer?: HTMLElement;

	// Drag state
	private draggedItem: HTMLElement | null = null;
	private draggedIndex: number = -1;

	// Generation state
	private isGenerating: boolean = false;

	// Step definitions
	private readonly steps = [
		{ number: 1, title: 'Setup', description: 'Book metadata and template' },
		{ number: 2, title: 'Chapters', description: 'Add and arrange chapters' },
		{ number: 3, title: 'Output', description: 'Format and options' },
		{ number: 4, title: 'Generate', description: 'Generate book' },
	];

	constructor(plugin: CanvasRootsPlugin, options?: BookBuilderOptions) {
		super(plugin.app);
		this.plugin = plugin;

		if (options?.definition) {
			// Load from existing definition
			this.metadata = { ...options.definition.metadata };
			this.chapters = options.definition.chapters.map(ch => ({ ...ch }));
			this.outputOptions = { ...options.definition.outputOptions };
			this.sourceFilePath = options.sourceFilePath;
		} else {
			// Defaults
			this.metadata = {
				title: '',
				subtitle: '',
				author: '',
				date: new Date().toISOString().split('T')[0],
			};
			this.chapters = [];
			this.outputOptions = {
				format: 'pdf',
				pageSize: 'A4',
				fontStyle: 'serif',
				dateFormat: 'mdy',
				includeCoverPage: true,
				includeTableOfContents: true,
			};
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-book-builder');

		// Header
		const header = contentEl.createDiv({ cls: 'cr-book-builder-header' });
		const titleRow = header.createDiv({ cls: 'cr-wizard-title' });
		titleRow.appendChild(createLucideIcon('book-open', 24));
		titleRow.createSpan({ text: 'Book builder' });

		// Step progress
		this.renderStepProgress(contentEl);

		// Content container
		this.contentContainer = contentEl.createDiv({ cls: 'cr-book-builder-content' });

		this.renderCurrentStep();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	// ========== STEP PROGRESS ==========

	private renderStepProgress(container: HTMLElement): void {
		this.progressContainer = container.createDiv({ cls: 'cr-wizard-progress' });
		this.updateStepProgress();
	}

	private updateStepProgress(): void {
		if (!this.progressContainer) return;
		this.progressContainer.empty();

		const stepsRow = this.progressContainer.createDiv({ cls: 'cr-wizard-steps' });

		this.steps.forEach((step, index) => {
			const stepEl = stepsRow.createDiv({ cls: 'cr-wizard-step' });

			if (index === this.currentStep) {
				stepEl.addClass('cr-wizard-step--active');
			} else if (index < this.currentStep) {
				stepEl.addClass('cr-wizard-step--completed');
			}

			const numberEl = stepEl.createDiv({ cls: 'cr-wizard-step-number' });
			if (index < this.currentStep) {
				setIcon(numberEl, 'check');
			} else {
				numberEl.textContent = String(step.number);
			}

			const infoEl = stepEl.createDiv({ cls: 'cr-wizard-step-info' });
			infoEl.createDiv({ cls: 'cr-wizard-step-title', text: step.title });

			if (index < this.steps.length - 1) {
				const connector = stepsRow.createDiv({ cls: 'cr-wizard-connector' });
				if (index < this.currentStep) {
					connector.addClass('cr-wizard-connector--completed');
				}
			}
		});

		const stepInfo = this.progressContainer.createDiv({ cls: 'cr-report-step-info' });
		const currentStepData = this.steps[this.currentStep];
		stepInfo.createDiv({
			cls: 'cr-report-step-counter',
			text: `Step ${this.currentStep + 1} of ${this.steps.length}`
		});
		stepInfo.createDiv({
			cls: 'cr-report-step-description',
			text: currentStepData.description
		});
	}

	private renderCurrentStep(): void {
		if (!this.contentContainer) return;
		this.contentContainer.empty();
		this.updateStepProgress();

		switch (this.currentStep) {
			case 0:
				this.renderStep1_Setup(this.contentContainer);
				break;
			case 1:
				this.renderStep2_Chapters(this.contentContainer);
				break;
			case 2:
				this.renderStep3_Output(this.contentContainer);
				break;
			case 3:
				this.renderStep4_Generate(this.contentContainer);
				break;
		}

		this.renderFooter(this.contentContainer);
	}

	// ========== STEP 1: SETUP ==========

	private renderStep1_Setup(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-report-section' });
		section.createEl('h3', { text: 'Book metadata', cls: 'cr-report-section-title' });

		// Title
		this.renderTextInput(section, 'Title', this.metadata.title, (val) => {
			this.metadata.title = val;
		}, 'e.g., Smith Family History');

		// Subtitle
		this.renderTextInput(section, 'Subtitle', this.metadata.subtitle || '', (val) => {
			this.metadata.subtitle = val || undefined;
		}, 'Optional subtitle');

		// Author
		this.renderTextInput(section, 'Author', this.metadata.author || '', (val) => {
			this.metadata.author = val || undefined;
		}, 'e.g., John Smith');

		// Date
		this.renderTextInput(section, 'Date', this.metadata.date || '', (val) => {
			this.metadata.date = val || undefined;
		}, 'e.g., 2026-03-14');

		// Template section
		container.createEl('hr', { cls: 'cr-report-separator' });
		const templateSection = container.createDiv({ cls: 'cr-report-section' });
		templateSection.createEl('h3', { text: 'Start from template', cls: 'cr-report-section-title' });
		templateSection.createEl('p', {
			cls: 'cr-text-muted',
			text: 'Templates pre-populate the chapter list. You can customize chapters in the next step.'
		});

		this.renderTemplateCards(templateSection);
	}

	private renderTextInput(
		container: HTMLElement,
		label: string,
		value: string,
		onChange: (value: string) => void,
		placeholder?: string
	): void {
		const row = container.createDiv({ cls: 'cr-report-option-row' });
		row.createSpan({ text: `${label}:`, cls: 'cr-report-option-label' });
		const input = row.createEl('input', {
			cls: 'cr-report-input cr-report-input--text',
			type: 'text',
			value: value,
			placeholder: placeholder || ''
		});
		input.addEventListener('input', () => onChange(input.value));
	}

	private renderTemplateCards(container: HTMLElement): void {
		const grid = container.createDiv({ cls: 'cr-book-template-grid' });

		const templates = [
			{
				id: 'family-history',
				label: 'Family history book',
				icon: 'book-open',
				description: 'Polished document for sharing with relatives. Includes pedigree chart, individual summaries, family group sheets, and descendant register.',
			},
			{
				id: 'research-compilation',
				label: 'Research compilation',
				icon: 'search',
				description: 'Working document for researchers. Includes gaps report, source summaries, individual summaries, and ahnentafel.',
			},
			{
				id: 'blank',
				label: 'Blank book',
				icon: 'file-plus',
				description: 'Start with an empty chapter list and build from scratch.',
			},
		];

		for (const template of templates) {
			const card = grid.createDiv({ cls: 'cr-book-template-card' });

			const iconEl = card.createDiv({ cls: 'cr-book-template-icon' });
			iconEl.appendChild(createLucideIcon(template.icon, 24));

			card.createDiv({ cls: 'cr-book-template-label', text: template.label });
			card.createDiv({ cls: 'cr-book-template-desc', text: template.description });

			card.addEventListener('click', () => {
				if (template.id === 'blank') {
					this.chapters = [];
					this.currentStep = 1;
					this.renderCurrentStep();
				} else {
					this.applyTemplateWithPersonPicker(template.id);
				}
			});
		}
	}

	private applyTemplateWithPersonPicker(templateId: string): void {
		const picker = new PersonPickerModal(this.app, (person: PersonInfo) => {
			this.applyTemplate(templateId, person.crId, person.name);
			this.currentStep = 1;
			this.renderCurrentStep();
		});
		picker.open();
	}

	private applyTemplate(templateId: string, rootPersonCrId: string, rootPersonName: string): void {
		const chapters: BookChapter[] = [];
		let id = 1;

		const addChapter = (type: BookChapterType, title: string, config: BookChapter['config']): void => {
			chapters.push({
				id: `ch-${id++}`,
				type,
				title,
				pageBreakBefore: chapters.length > 0,
				config,
			});
		};

		if (templateId === 'family-history') {
			addChapter('section-divider', 'Charts', { subtitle: 'Visual family tree charts' } as SectionDividerConfig);
			addChapter('visual-tree', 'Pedigree chart', {
				chartType: 'pedigree',
				rootPersonCrId,
				rootPersonName,
				maxGenerations: 5,
			} as VisualTreeChapterConfig);
			addChapter('visual-tree', 'Descendant chart', {
				chartType: 'descendant',
				rootPersonCrId,
				rootPersonName,
				maxGenerations: 5,
			} as VisualTreeChapterConfig);
			addChapter('section-divider', 'Reports', { subtitle: 'Detailed genealogical reports' } as SectionDividerConfig);
			addChapter('report', `Individual summary — ${rootPersonName}`, {
				reportType: 'individual-summary' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { includeDetails: true, includeSources: true },
			} as ReportChapterConfig);
			addChapter('report', `Family group sheet — ${rootPersonName}`, {
				reportType: 'family-group-sheet' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { includeChildren: true, includeSources: true },
			} as ReportChapterConfig);
			addChapter('report', `Ahnentafel — ${rootPersonName}`, {
				reportType: 'ahnentafel' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { maxGenerations: 10, includeDetails: true, includeSources: true },
			} as ReportChapterConfig);
			addChapter('report', `Register report — ${rootPersonName}`, {
				reportType: 'register-report' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { maxGenerations: 5, includeSpouses: true, includeSources: true },
			} as ReportChapterConfig);
		} else if (templateId === 'research-compilation') {
			addChapter('report', `Brick wall report — ${rootPersonName}`, {
				reportType: 'brick-wall-report' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { maxGenerations: 10 },
			} as ReportChapterConfig);
			addChapter('report', `Source summary — ${rootPersonName}`, {
				reportType: 'source-summary' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: {},
			} as ReportChapterConfig);
			addChapter('report', `Individual summary — ${rootPersonName}`, {
				reportType: 'individual-summary' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { includeDetails: true, includeSources: true },
			} as ReportChapterConfig);
			addChapter('report', `Ahnentafel — ${rootPersonName}`, {
				reportType: 'ahnentafel' as ReportType,
				subjectCrId: rootPersonCrId,
				subjectName: rootPersonName,
				reportOptions: { maxGenerations: 10, includeDetails: true, includeSources: true },
			} as ReportChapterConfig);
		}

		this.chapters = chapters;
	}

	// ========== STEP 2: CHAPTERS ==========

	private renderStep2_Chapters(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-report-section' });

		// Header with add button
		const headerRow = section.createDiv({ cls: 'cr-book-chapters-header' });
		headerRow.createEl('h3', { text: 'Chapters', cls: 'cr-report-section-title' });

		const addBtn = headerRow.createEl('button', { cls: 'cr-btn cr-btn--small' });
		addBtn.appendChild(createLucideIcon('plus', 14));
		addBtn.appendText('Add chapter');
		addBtn.addEventListener('click', () => this.showAddChapterMenu(addBtn));

		// Chapter list
		this.chapterListContainer = section.createDiv({ cls: 'cr-book-chapter-list' });

		if (this.chapters.length === 0) {
			this.renderEmptyChapterState();
		} else {
			this.renderChapterList();
		}
	}

	private renderEmptyChapterState(): void {
		if (!this.chapterListContainer) return;
		this.chapterListContainer.empty();

		const empty = this.chapterListContainer.createDiv({ cls: 'cr-book-empty-state' });
		const iconEl = empty.createDiv();
		iconEl.appendChild(createLucideIcon('book-open', 32));
		empty.createEl('p', { text: 'No chapters yet' });
		empty.createEl('p', {
			cls: 'cr-text-muted',
			text: 'Click "Add chapter" to start building your book, or go back and select a template.'
		});
	}

	private renderChapterList(): void {
		if (!this.chapterListContainer) return;
		this.chapterListContainer.empty();

		this.chapters.forEach((chapter, index) => {
			const row = this.createChapterRow(chapter, index);
			this.chapterListContainer!.appendChild(row);
		});
	}

	private createChapterRow(chapter: BookChapter, index: number): HTMLElement {
		const row = document.createElement('div');
		row.className = 'cr-book-chapter-row';
		row.dataset.index = index.toString();
		row.draggable = true;

		// Drag handle
		const dragHandle = row.createDiv({ cls: 'cr-book-chapter-row__handle' });
		setIcon(dragHandle, 'grip-vertical');

		// Chapter number
		const numEl = row.createDiv({ cls: 'cr-book-chapter-row__number' });
		numEl.textContent = String(index + 1);

		// Type icon
		const typeIcon = row.createDiv({ cls: 'cr-book-chapter-row__type-icon' });
		const meta = CHAPTER_TYPE_META[chapter.type];
		setIcon(typeIcon, meta.icon);
		typeIcon.setAttribute('aria-label', meta.label);

		// Info
		const info = row.createDiv({ cls: 'cr-book-chapter-row__info' });
		info.createDiv({ cls: 'cr-book-chapter-row__title', text: chapter.title || '(untitled)' });
		const subtitle = this.getChapterSubtitle(chapter);
		if (subtitle) {
			info.createDiv({ cls: 'cr-book-chapter-row__subtitle', text: subtitle });
		}

		// Actions
		const actions = row.createDiv({ cls: 'cr-book-chapter-row__actions' });

		// Edit button
		const editBtn = actions.createDiv({ cls: 'cr-book-chapter-row__action' });
		setIcon(editBtn, 'pencil');
		editBtn.setAttribute('aria-label', 'Edit chapter');
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.editChapter(index);
		});

		// Remove button
		const removeBtn = actions.createDiv({ cls: 'cr-book-chapter-row__action' });
		setIcon(removeBtn, 'x');
		removeBtn.setAttribute('aria-label', 'Remove chapter');
		removeBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.removeChapter(index);
		});

		// Drag events
		row.addEventListener('dragstart', (e) => this.handleDragStart(e, row, index));
		row.addEventListener('dragend', () => this.handleDragEnd());
		row.addEventListener('dragover', (e) => this.handleDragOver(e));
		row.addEventListener('dragenter', (e) => this.handleDragEnter(e, row));
		row.addEventListener('dragleave', (e) => this.handleDragLeave(e, row));
		row.addEventListener('drop', (e) => this.handleDrop(e, index));

		return row;
	}

	private getChapterSubtitle(chapter: BookChapter): string {
		switch (chapter.type) {
			case 'report': {
				const config = chapter.config as ReportChapterConfig;
				const reportMeta = REPORT_METADATA[config.reportType];
				const label = reportMeta?.label || config.reportType;
				return config.subjectName ? `${label} — ${config.subjectName}` : label;
			}
			case 'visual-tree': {
				const config = chapter.config as VisualTreeChapterConfig;
				const chartLabel = CHART_TYPE_LABELS[config.chartType] || config.chartType;
				return config.rootPersonName ? `${chartLabel} — ${config.rootPersonName}` : chartLabel;
			}
			case 'vault-note': {
				const config = chapter.config as VaultNoteChapterConfig;
				return config.notePath;
			}
			case 'section-divider': {
				const config = chapter.config as SectionDividerConfig;
				return config.subtitle || '';
			}
			default:
				return '';
		}
	}

	// ========== ADD CHAPTER MENU ==========

	private showAddChapterMenu(anchorEl: HTMLElement): void {
		const menu = this.contentContainer!.createDiv({ cls: 'cr-book-add-menu' });

		// Position near the button
		const rect = anchorEl.getBoundingClientRect();
		const modalRect = this.contentEl.getBoundingClientRect();
		menu.style.top = `${rect.bottom - modalRect.top + 4}px`;
		menu.style.right = `${modalRect.right - rect.right}px`;

		const options: { type: BookChapterType; label: string; icon: string }[] = [
			{ type: 'report', label: 'Add report', icon: 'file-text' },
			{ type: 'visual-tree', label: 'Add visual tree', icon: 'git-branch' },
			{ type: 'vault-note', label: 'Add vault note', icon: 'file' },
			{ type: 'section-divider', label: 'Add section divider', icon: 'minus' },
		];

		for (const opt of options) {
			const item = menu.createDiv({ cls: 'cr-book-add-menu__item' });
			item.appendChild(createLucideIcon(opt.icon, 16));
			item.createSpan({ text: opt.label });
			item.addEventListener('click', () => {
				menu.remove();
				this.addChapterOfType(opt.type);
			});
		}

		// Close on click outside
		const closeHandler = (e: MouseEvent) => {
			if (!menu.contains(e.target as HTMLElement) && e.target !== anchorEl) {
				menu.remove();
				document.removeEventListener('click', closeHandler);
			}
		};
		setTimeout(() => document.addEventListener('click', closeHandler), 0);
	}

	private addChapterOfType(type: BookChapterType): void {
		switch (type) {
			case 'report':
				this.addReportChapter();
				break;
			case 'visual-tree':
				this.addVisualTreeChapter();
				break;
			case 'vault-note':
				this.addVaultNoteChapter();
				break;
			case 'section-divider':
				this.addSectionDividerChapter();
				break;
		}
	}

	private addReportChapter(): void {
		// Show inline config for report type + subject
		this.showChapterConfigModal('report', null, (chapter) => {
			this.chapters.push(chapter);
			this.renderChapterList();
		});
	}

	private addVisualTreeChapter(): void {
		this.showChapterConfigModal('visual-tree', null, (chapter) => {
			this.chapters.push(chapter);
			this.renderChapterList();
		});
	}

	private addVaultNoteChapter(): void {
		// File picker for markdown files
		const mdFiles = this.app.vault.getMarkdownFiles()
			.sort((a, b) => a.path.localeCompare(b.path));

		this.showFilePickerModal(mdFiles, (file) => {
			const chapter: BookChapter = {
				id: this.generateChapterId(),
				type: 'vault-note',
				title: file.basename,
				pageBreakBefore: this.chapters.length > 0,
				config: { notePath: file.path } as VaultNoteChapterConfig,
			};
			this.chapters.push(chapter);
			this.renderChapterList();
		});
	}

	private addSectionDividerChapter(): void {
		this.showChapterConfigModal('section-divider', null, (chapter) => {
			this.chapters.push(chapter);
			this.renderChapterList();
		});
	}

	// ========== CHAPTER CONFIG MODAL ==========

	private showChapterConfigModal(
		type: BookChapterType,
		existingChapter: BookChapter | null,
		onSave: (chapter: BookChapter) => void
	): void {
		const configModal = new ChapterConfigModal(
			this.app,
			this.plugin,
			type,
			existingChapter,
			(chapter) => {
				onSave(chapter);
			}
		);
		configModal.open();
	}

	private showFilePickerModal(files: TFile[], onSelect: (file: TFile) => void): void {
		const modal = new FilePickerModal(this.app, files, onSelect);
		modal.open();
	}

	private editChapter(index: number): void {
		const chapter = this.chapters[index];
		this.showChapterConfigModal(chapter.type, chapter, (updated) => {
			this.chapters[index] = updated;
			this.renderChapterList();
		});
	}

	private removeChapter(index: number): void {
		this.chapters.splice(index, 1);
		if (this.chapters.length === 0) {
			this.renderEmptyChapterState();
		} else {
			this.renderChapterList();
		}
	}

	// ========== DRAG AND DROP ==========

	private handleDragStart(e: DragEvent, row: HTMLElement, index: number): void {
		this.draggedItem = row;
		this.draggedIndex = index;
		row.addClass('cr-book-chapter-row--dragging');
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', index.toString());
		}
	}

	private handleDragEnd(): void {
		if (this.draggedItem) {
			this.draggedItem.removeClass('cr-book-chapter-row--dragging');
		}
		this.draggedItem = null;
		this.draggedIndex = -1;

		if (this.chapterListContainer) {
			const rows = this.chapterListContainer.querySelectorAll('.cr-book-chapter-row');
			rows.forEach(row => row.removeClass('cr-book-chapter-row--drag-over'));
		}
	}

	private handleDragOver(e: DragEvent): void {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
	}

	private handleDragEnter(e: DragEvent, row: HTMLElement): void {
		e.preventDefault();
		if (row !== this.draggedItem) {
			row.addClass('cr-book-chapter-row--drag-over');
		}
	}

	private handleDragLeave(e: DragEvent, row: HTMLElement): void {
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (!row.contains(relatedTarget)) {
			row.removeClass('cr-book-chapter-row--drag-over');
		}
	}

	private handleDrop(e: DragEvent, targetIndex: number): void {
		e.preventDefault();
		if (this.draggedIndex === -1 || this.draggedIndex === targetIndex) {
			return;
		}

		const [moved] = this.chapters.splice(this.draggedIndex, 1);
		this.chapters.splice(targetIndex, 0, moved);
		this.renderChapterList();
	}

	// ========== STEP 3: OUTPUT ==========

	private renderStep3_Output(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-report-section' });
		section.createEl('h3', { text: 'Output settings', cls: 'cr-report-section-title' });

		// Format
		const formatRow = section.createDiv({ cls: 'cr-report-option-row' });
		formatRow.createSpan({ text: 'Format:', cls: 'cr-report-option-label' });
		const formatSelect = formatRow.createEl('select', { cls: 'cr-report-select' });
		for (const fmt of [{ value: 'pdf', label: 'PDF' }, { value: 'odt', label: 'ODT' }]) {
			const option = formatSelect.createEl('option', { value: fmt.value, text: fmt.label });
			if (fmt.value === this.outputOptions.format) option.selected = true;
		}
		formatSelect.addEventListener('change', () => {
			this.outputOptions.format = formatSelect.value as BookOutputFormat;
		});

		// Page size
		const sizeRow = section.createDiv({ cls: 'cr-report-option-row' });
		sizeRow.createSpan({ text: 'Page size:', cls: 'cr-report-option-label' });
		const sizeSelect = sizeRow.createEl('select', { cls: 'cr-report-select' });
		for (const size of [{ value: 'A4', label: 'A4' }, { value: 'LETTER', label: 'Letter' }]) {
			const option = sizeSelect.createEl('option', { value: size.value, text: size.label });
			if (size.value === this.outputOptions.pageSize) option.selected = true;
		}
		sizeSelect.addEventListener('change', () => {
			this.outputOptions.pageSize = sizeSelect.value as 'A4' | 'LETTER';
		});

		// Font style
		const fontRow = section.createDiv({ cls: 'cr-report-option-row' });
		fontRow.createSpan({ text: 'Font style:', cls: 'cr-report-option-label' });
		const fontSelect = fontRow.createEl('select', { cls: 'cr-report-select' });
		for (const font of [{ value: 'serif', label: 'Serif' }, { value: 'sans-serif', label: 'Sans-serif' }]) {
			const option = fontSelect.createEl('option', { value: font.value, text: font.label });
			if (font.value === this.outputOptions.fontStyle) option.selected = true;
		}
		fontSelect.addEventListener('change', () => {
			this.outputOptions.fontStyle = fontSelect.value as 'serif' | 'sans-serif';
		});

		// Date format
		const dateRow = section.createDiv({ cls: 'cr-report-option-row' });
		dateRow.createSpan({ text: 'Date format:', cls: 'cr-report-option-label' });
		const dateSelect = dateRow.createEl('select', { cls: 'cr-report-select' });
		for (const df of [
			{ value: 'mdy', label: 'Month Day, Year' },
			{ value: 'dmy', label: 'Day Month Year' },
			{ value: 'ymd', label: 'Year-Month-Day' }
		]) {
			const option = dateSelect.createEl('option', { value: df.value, text: df.label });
			if (df.value === this.outputOptions.dateFormat) option.selected = true;
		}
		dateSelect.addEventListener('change', () => {
			this.outputOptions.dateFormat = dateSelect.value as 'mdy' | 'dmy' | 'ymd';
		});

		// Toggles
		container.createEl('hr', { cls: 'cr-report-separator' });
		const toggleSection = container.createDiv({ cls: 'cr-report-section' });
		toggleSection.createEl('h3', { text: 'Include', cls: 'cr-report-section-title' });

		this.renderToggle(toggleSection, 'Cover page', this.outputOptions.includeCoverPage, (val) => {
			this.outputOptions.includeCoverPage = val;
		});
		this.renderToggle(toggleSection, 'Table of contents', this.outputOptions.includeTableOfContents, (val) => {
			this.outputOptions.includeTableOfContents = val;
		});
	}

	private renderToggle(
		container: HTMLElement,
		label: string,
		checked: boolean,
		onChange: (value: boolean) => void
	): void {
		const row = container.createDiv({ cls: 'cr-report-toggle-row' });
		const checkbox = row.createEl('input', { type: 'checkbox', cls: 'cr-report-checkbox' });
		checkbox.checked = checked;
		row.createEl('label', { text: label, cls: 'cr-report-toggle-label' });
		checkbox.addEventListener('change', () => onChange(checkbox.checked));
	}

	// ========== STEP 4: GENERATE ==========

	private renderStep4_Generate(container: HTMLElement): void {
		const section = container.createDiv({ cls: 'cr-report-section' });
		section.createEl('h3', { text: 'Review', cls: 'cr-report-section-title' });

		// Summary
		const summary = section.createDiv({ cls: 'cr-book-generate-summary' });
		summary.createDiv({ text: `Title: ${this.metadata.title || '(untitled)'}` });
		summary.createDiv({ text: `Chapters: ${this.chapters.length}` });
		summary.createDiv({ text: `Format: ${this.outputOptions.format.toUpperCase()}` });
		summary.createDiv({ text: `Page size: ${this.outputOptions.pageSize}` });

		// Chapter breakdown
		const breakdown = section.createDiv({ cls: 'cr-book-chapter-breakdown' });
		const typeCounts = new Map<BookChapterType, number>();
		for (const ch of this.chapters) {
			typeCounts.set(ch.type, (typeCounts.get(ch.type) || 0) + 1);
		}
		for (const [type, count] of typeCounts) {
			const meta = CHAPTER_TYPE_META[type];
			const item = breakdown.createDiv({ cls: 'cr-book-breakdown-item' });
			item.appendChild(createLucideIcon(meta.icon, 14));
			item.createSpan({ text: `${count} ${meta.label.toLowerCase()}${count > 1 ? 's' : ''}` });
		}

		// Progress area (hidden until generation starts)
		container.createEl('hr', { cls: 'cr-report-separator' });
		const progressSection = container.createDiv({ cls: 'cr-book-progress-section' });
		progressSection.id = 'book-progress-section';
		progressSection.style.display = 'none';

		progressSection.createEl('h3', { text: 'Generating...', cls: 'cr-report-section-title' });

		const progressBar = progressSection.createDiv({ cls: 'cr-book-progress-bar' });
		const progressFill = progressBar.createDiv({ cls: 'cr-book-progress-fill' });
		progressFill.id = 'book-progress-fill';

		const progressText = progressSection.createDiv({ cls: 'cr-book-progress-text' });
		progressText.id = 'book-progress-text';

		// Save definition section
		container.createEl('hr', { cls: 'cr-report-separator' });
		const saveSection = container.createDiv({ cls: 'cr-report-section' });
		saveSection.createEl('h3', { text: 'Save book definition', cls: 'cr-report-section-title' });
		saveSection.createEl('p', {
			cls: 'cr-text-muted',
			text: 'Save as .book.json to re-generate later as your vault data changes.'
		});

		const saveRow = saveSection.createDiv({ cls: 'cr-book-save-row' });
		const saveBtn = saveRow.createEl('button', { cls: 'cr-btn' });
		saveBtn.appendChild(createLucideIcon('save', 16));
		saveBtn.appendText('Save definition');
		saveBtn.addEventListener('click', () => { void this.saveDefinition(); });
	}

	// ========== FOOTER ==========

	private renderFooter(container: HTMLElement): void {
		const footer = container.createDiv({ cls: 'cr-report-wizard-footer' });

		// Left: Cancel or Back
		if (this.currentStep === 0) {
			const cancelBtn = footer.createEl('button', { cls: 'cr-btn', text: 'Cancel' });
			cancelBtn.addEventListener('click', () => this.close());
		} else {
			const backBtn = footer.createEl('button', { cls: 'cr-btn' });
			backBtn.appendChild(createLucideIcon('chevron-left', 16));
			backBtn.appendText('Back');
			backBtn.addEventListener('click', () => {
				this.currentStep--;
				this.renderCurrentStep();
			});
		}

		// Right: Next or Generate
		const rightBtns = footer.createDiv({ cls: 'cr-report-footer-right' });

		if (this.currentStep < 3) {
			const nextBtn = rightBtns.createEl('button', { cls: 'cr-btn cr-btn--primary' });
			nextBtn.appendText('Next');
			nextBtn.appendChild(createLucideIcon('arrow-right', 16));

			const canProceed = this.canProceedToNextStep();
			if (!canProceed) {
				nextBtn.addClass('cr-btn--disabled');
			} else {
				nextBtn.addEventListener('click', () => {
					this.currentStep++;
					this.renderCurrentStep();
				});
			}
		} else {
			// Generate button
			const generateBtn = rightBtns.createEl('button', { cls: 'cr-btn cr-btn--primary' });
			generateBtn.appendText('Generate');
			generateBtn.appendChild(createLucideIcon('book-open', 16));

			if (this.chapters.length === 0 || this.isGenerating) {
				generateBtn.addClass('cr-btn--disabled');
			} else {
				generateBtn.addEventListener('click', () => { void this.doGenerate(); });
			}
		}
	}

	private canProceedToNextStep(): boolean {
		switch (this.currentStep) {
			case 0:
				return this.metadata.title.trim().length > 0;
			case 1:
				return this.chapters.length > 0;
			case 2:
				return true;
			default:
				return false;
		}
	}

	// ========== GENERATION ==========

	private async doGenerate(): Promise<void> {
		if (this.isGenerating) return;
		this.isGenerating = true;

		// Show progress
		const progressSection = document.getElementById('book-progress-section');
		if (progressSection) progressSection.style.display = 'block';

		const definition = this.buildDefinition();

		try {
			const service = new BookGenerationService(this.app, this.plugin.settings, this.plugin);

			const result = await service.generateBook(definition, (progress: BookGenerationProgress) => {
				this.updateProgress(progress);
			});

			if (result.success && result.blob) {
				service.downloadBook(result.blob, result.suggestedFilename);
				new Notice(`Book generated: ${result.suggestedFilename}`);

				// Show warnings if any
				if (result.warnings.length > 0) {
					new Notice(`${result.warnings.length} warning(s) during generation`);
				}

				this.close();
			} else {
				const errorMsg = result.errors.join('\n');
				new Notice(`Book generation failed: ${errorMsg}`);
				logger.error('Book generation failed', result.errors);
			}
		} catch (error) {
			logger.error('Book generation error', error);
			new Notice(`Book generation error: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			this.isGenerating = false;
		}
	}

	private updateProgress(progress: BookGenerationProgress): void {
		const fill = document.getElementById('book-progress-fill');
		const text = document.getElementById('book-progress-text');

		if (fill) {
			const pct = (progress.currentChapter / progress.totalChapters) * 100;
			fill.style.width = `${pct}%`;
		}
		if (text) {
			const phaseLabel = progress.phase === 'generating' ? 'Generating' : 'Rendering';
			text.textContent = `${phaseLabel}: ${progress.chapterTitle} (${progress.currentChapter}/${progress.totalChapters})`;
		}
	}

	// ========== SAVE / LOAD ==========

	private buildDefinition(): BookDefinition {
		return {
			version: 1,
			metadata: { ...this.metadata },
			chapters: this.chapters.map(ch => ({ ...ch })),
			outputOptions: { ...this.outputOptions },
		};
	}

	private async saveDefinition(): Promise<void> {
		const definition = this.buildDefinition();
		const json = JSON.stringify(definition, null, 2);

		const sanitizedTitle = this.metadata.title
			.replace(/[\\/:*?"<>|]/g, '-')
			.replace(/\s+/g, ' ')
			.trim() || 'untitled-book';
		const filename = `${sanitizedTitle}.book.json`;

		// Save to vault root or configured folder
		const folder = this.plugin.settings.reportsFolder || '';
		const path = folder ? `${folder}/${filename}` : filename;

		try {
			const existingFile = this.app.vault.getAbstractFileByPath(path);
			if (existingFile instanceof TFile) {
				await this.app.vault.modify(existingFile, json);
			} else {
				// Ensure folder exists
				if (folder) {
					const folderExists = this.app.vault.getAbstractFileByPath(folder);
					if (!folderExists) {
						await this.app.vault.createFolder(folder);
					}
				}
				await this.app.vault.create(path, json);
			}

			this.sourceFilePath = path;
			new Notice(`Book definition saved: ${path}`);
		} catch (error) {
			logger.error('Failed to save book definition', error);
			new Notice(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// ========== UTILITIES ==========

	private generateChapterId(): string {
		return `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
	}
}

// ========== CHAPTER CONFIG MODAL ==========

/**
 * Modal for configuring a single chapter (add or edit).
 */
class ChapterConfigModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private chapterType: BookChapterType;
	private existingChapter: BookChapter | null;
	private onSave: (chapter: BookChapter) => void;

	// Form state
	private title: string;
	private pageBreakBefore: boolean;
	private reportType: ReportType | null = null;
	private subjectCrId?: string;
	private subjectName?: string;
	private reportOptions: Record<string, unknown> = {};
	private chartType: VisualTreeChartType = 'pedigree';
	private maxGenerations: number = 5;
	private subtitle: string = '';

	constructor(
		app: App,
		plugin: CanvasRootsPlugin,
		chapterType: BookChapterType,
		existingChapter: BookChapter | null,
		onSave: (chapter: BookChapter) => void
	) {
		super(app);
		this.plugin = plugin;
		this.chapterType = chapterType;
		this.existingChapter = existingChapter;
		this.onSave = onSave;

		// Initialize from existing chapter
		if (existingChapter) {
			this.title = existingChapter.title;
			this.pageBreakBefore = existingChapter.pageBreakBefore;

			switch (chapterType) {
				case 'report': {
					const config = existingChapter.config as ReportChapterConfig;
					this.reportType = config.reportType;
					this.subjectCrId = config.subjectCrId;
					this.subjectName = config.subjectName;
					this.reportOptions = { ...config.reportOptions };
					break;
				}
				case 'visual-tree': {
					const config = existingChapter.config as VisualTreeChapterConfig;
					this.chartType = config.chartType;
					this.subjectCrId = config.rootPersonCrId;
					this.subjectName = config.rootPersonName;
					this.maxGenerations = config.maxGenerations;
					break;
				}
				case 'section-divider': {
					const config = existingChapter.config as SectionDividerConfig;
					this.subtitle = config.subtitle || '';
					break;
				}
			}
		} else {
			this.title = '';
			this.pageBreakBefore = true;
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-chapter-config-modal');

		const meta = CHAPTER_TYPE_META[this.chapterType];
		const header = contentEl.createDiv({ cls: 'crc-picker-header' });
		const titleSection = header.createDiv({ cls: 'crc-picker-title' });
		const icon = titleSection.createSpan();
		setIcon(icon, meta.icon);
		titleSection.appendText(this.existingChapter ? `Edit ${meta.label.toLowerCase()}` : `Add ${meta.label.toLowerCase()}`);

		const section = contentEl.createDiv({ cls: 'cr-report-section cr-chapter-config-body' });

		// Title input
		this.renderConfigTextInput(section, 'Title', this.title, (val) => {
			this.title = val;
		}, `Chapter title`);

		// Type-specific fields
		switch (this.chapterType) {
			case 'report':
				this.renderReportConfig(section);
				break;
			case 'visual-tree':
				this.renderVisualTreeConfig(section);
				break;
			case 'section-divider':
				this.renderSectionDividerConfig(section);
				break;
		}

		// Footer
		const footer = contentEl.createDiv({ cls: 'crc-picker-footer' });
		const cancelBtn = footer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const saveBtn = footer.createEl('button', { cls: 'mod-cta', text: this.existingChapter ? 'Save' : 'Add' });
		saveBtn.addEventListener('click', () => this.save());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderConfigTextInput(
		container: HTMLElement,
		label: string,
		value: string,
		onChange: (value: string) => void,
		placeholder?: string
	): void {
		const row = container.createDiv({ cls: 'cr-report-option-row' });
		row.createSpan({ text: `${label}:`, cls: 'cr-report-option-label' });
		const input = row.createEl('input', {
			cls: 'cr-report-input cr-report-input--text',
			type: 'text',
			value,
			placeholder: placeholder || ''
		});
		input.addEventListener('input', () => onChange(input.value));
	}

	private renderReportConfig(container: HTMLElement): void {
		// Report type dropdown
		const typeRow = container.createDiv({ cls: 'cr-report-option-row' });
		typeRow.createSpan({ text: 'Report type:', cls: 'cr-report-option-label' });

		const select = typeRow.createEl('select', { cls: 'cr-report-select' });
		const defaultOpt = select.createEl('option', { value: '', text: 'Select report type...' });
		defaultOpt.disabled = true;
		if (!this.reportType) defaultOpt.selected = true;

		// Group by category
		const categories: ReportCategory[] = ['genealogical', 'research', 'timeline', 'geographic', 'summary'];
		for (const cat of categories) {
			const reports = getReportsByCategory(cat);
			if (reports.length === 0) continue;
			const optgroup = select.createEl('optgroup');
			optgroup.label = cat.charAt(0).toUpperCase() + cat.slice(1);
			for (const report of reports) {
				const opt = optgroup.createEl('option', { value: report.type, text: report.label });
				if (report.type === this.reportType) opt.selected = true;
			}
		}

		select.addEventListener('change', () => {
			this.reportType = select.value as ReportType;
			if (!this.title) {
				const meta = REPORT_METADATA[this.reportType];
				this.title = meta?.label || this.reportType;
			}
		});

		// Subject (person picker button)
		const subjectRow = container.createDiv({ cls: 'cr-report-option-row' });
		subjectRow.createSpan({ text: 'Subject:', cls: 'cr-report-option-label' });

		const subjectBtn = subjectRow.createEl('button', {
			cls: 'cr-btn cr-btn--small',
			text: this.subjectName || 'Select person...'
		});
		subjectBtn.addEventListener('click', () => {
			const picker = new PersonPickerModal(this.app, (person: PersonInfo) => {
				this.subjectCrId = person.crId;
				this.subjectName = person.name;
				subjectBtn.textContent = person.name;
			});
			picker.open();
		});
	}

	private renderVisualTreeConfig(container: HTMLElement): void {
		// Chart type dropdown
		const typeRow = container.createDiv({ cls: 'cr-report-option-row' });
		typeRow.createSpan({ text: 'Chart type:', cls: 'cr-report-option-label' });

		const select = typeRow.createEl('select', { cls: 'cr-report-select' });
		for (const [value, label] of Object.entries(CHART_TYPE_LABELS)) {
			const opt = select.createEl('option', { value, text: label });
			if (value === this.chartType) opt.selected = true;
		}
		select.addEventListener('change', () => {
			this.chartType = select.value as VisualTreeChartType;
		});

		// Root person
		const personRow = container.createDiv({ cls: 'cr-report-option-row' });
		personRow.createSpan({ text: 'Root person:', cls: 'cr-report-option-label' });

		const personBtn = personRow.createEl('button', {
			cls: 'cr-btn cr-btn--small',
			text: this.subjectName || 'Select person...'
		});
		personBtn.addEventListener('click', () => {
			const picker = new PersonPickerModal(this.app, (person: PersonInfo) => {
				this.subjectCrId = person.crId;
				this.subjectName = person.name;
				personBtn.textContent = person.name;
			});
			picker.open();
		});

		// Max generations
		const genRow = container.createDiv({ cls: 'cr-report-option-row' });
		genRow.createSpan({ text: 'Generations:', cls: 'cr-report-option-label' });
		const genInput = genRow.createEl('input', {
			cls: 'cr-report-input',
			type: 'number',
			attr: { min: '1', step: '1' },
			value: String(this.maxGenerations)
		});
		genInput.addEventListener('change', () => {
			const val = parseInt(genInput.value);
			if (!isNaN(val) && val >= 1) {
				this.maxGenerations = val;
			} else {
				genInput.value = String(this.maxGenerations);
			}
		});
	}

	private renderSectionDividerConfig(container: HTMLElement): void {
		this.renderConfigTextInput(container, 'Subtitle', this.subtitle, (val) => {
			this.subtitle = val;
		}, 'Optional subtitle text');
	}

	private save(): void {
		const chapter: BookChapter = {
			id: this.existingChapter?.id || `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			type: this.chapterType,
			title: this.title || CHAPTER_TYPE_META[this.chapterType].label,
			pageBreakBefore: this.pageBreakBefore,
			config: this.buildConfig(),
		};
		this.onSave(chapter);
		this.close();
	}

	private buildConfig(): BookChapter['config'] {
		switch (this.chapterType) {
			case 'report':
				return {
					reportType: this.reportType || 'individual-summary',
					subjectCrId: this.subjectCrId,
					subjectName: this.subjectName,
					reportOptions: { ...this.reportOptions },
				} as ReportChapterConfig;
			case 'visual-tree':
				return {
					chartType: this.chartType,
					rootPersonCrId: this.subjectCrId || '',
					rootPersonName: this.subjectName,
					maxGenerations: this.maxGenerations,
				} as VisualTreeChapterConfig;
			case 'vault-note':
				return (this.existingChapter?.config || { notePath: '' }) as VaultNoteChapterConfig;
			case 'section-divider':
				return {
					subtitle: this.subtitle || undefined,
				} as SectionDividerConfig;
		}
	}
}

// ========== FILE PICKER MODAL ==========

/**
 * Simple file picker modal for selecting vault markdown files.
 */
class FilePickerModal extends Modal {
	private files: TFile[];
	private onSelect: (file: TFile) => void;
	private filteredFiles: TFile[];
	private searchQuery: string = '';
	private resultsContainer?: HTMLElement;

	constructor(app: App, files: TFile[], onSelect: (file: TFile) => void) {
		super(app);
		this.files = files;
		this.filteredFiles = files;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-file-picker-modal');

		const header = contentEl.createDiv({ cls: 'crc-picker-header' });
		const titleSection = header.createDiv({ cls: 'crc-picker-title' });
		const icon = titleSection.createSpan();
		setIcon(icon, 'file');
		titleSection.appendText('Select vault note');

		// Search
		const searchContainer = contentEl.createDiv({ cls: 'cr-file-picker-search' });
		const searchInput = searchContainer.createEl('input', {
			cls: 'cr-report-input cr-report-input--text',
			type: 'text',
			placeholder: 'Search notes...'
		});
		searchInput.addEventListener('input', () => {
			this.searchQuery = searchInput.value.toLowerCase();
			this.filterAndRender();
		});

		// Results
		this.resultsContainer = contentEl.createDiv({ cls: 'cr-file-picker-results' });
		this.filterAndRender();

		// Focus search
		setTimeout(() => searchInput.focus(), 50);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private filterAndRender(): void {
		if (!this.resultsContainer) return;
		this.resultsContainer.empty();

		this.filteredFiles = this.searchQuery
			? this.files.filter(f => f.path.toLowerCase().includes(this.searchQuery))
			: this.files;

		const displayFiles = this.filteredFiles.slice(0, 100);

		if (displayFiles.length === 0) {
			this.resultsContainer.createDiv({
				cls: 'cr-file-picker-empty',
				text: 'No matching notes found'
			});
			return;
		}

		for (const file of displayFiles) {
			const item = this.resultsContainer.createDiv({ cls: 'cr-file-picker-item' });
			const itemIcon = item.createSpan({ cls: 'cr-file-picker-item__icon' });
			setIcon(itemIcon, 'file');
			item.createSpan({ cls: 'cr-file-picker-item__path', text: file.path });

			item.addEventListener('click', () => {
				this.onSelect(file);
				this.close();
			});
		}

		if (this.filteredFiles.length > 100) {
			this.resultsContainer.createDiv({
				cls: 'cr-text-muted',
				text: `Showing 100 of ${this.filteredFiles.length} results. Refine your search.`
			});
		}
	}
}
