/**
 * Post-Import Cleanup Wizard Modal
 *
 * A 10-step wizard for post-import data cleanup operations.
 *
 * Step 1: Quality Report — Review data quality issues (review-only)
 * Step 2: Bidirectional Relationships — Fix parent-child link consistency (batch)
 * Step 3: Date Formats — Normalize dates to ISO 8601 (batch)
 * Step 4: Gender Values — Normalize gender/sex values (batch)
 * Step 5: Orphan References — Clear dangling links (batch)
 * Step 6: Source Migration — Convert indexed sources to array format (batch)
 * Step 7: Place Variants — Standardize place name variants (interactive)
 * Step 8: Bulk Geocode — Add coordinates to places (interactive)
 * Step 9: Place Hierarchy — Build containment chains (interactive)
 * Step 10: Flatten Properties — Fix nested frontmatter (batch)
 */

import { App, Modal, Notice, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { DataQualityService, type BatchOperationResult } from '../core/data-quality';

/**
 * Wizard step types
 */
export type StepType = 'review' | 'batch' | 'interactive';

/**
 * Step status
 */
export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'skipped';

/**
 * Wizard step configuration
 */
interface WizardStepConfig {
	id: string;
	number: number;
	title: string;
	shortTitle: string;
	description: string;
	type: StepType;
	service: string;
	detectMethod?: string;
	previewMethod?: string;
	applyMethod?: string;
	dependencies: number[];
}

/**
 * Step state
 */
interface StepState {
	status: StepStatus;
	issueCount: number;
	fixCount: number;
	skippedReason?: string;
}

/**
 * Wizard state
 */
interface CleanupWizardState {
	currentStep: number;
	steps: Record<number, StepState>;
	startTime: number;
	isPreScanning: boolean;
	preScanComplete: boolean;
}

/**
 * Wizard step definitions
 */
const WIZARD_STEPS: WizardStepConfig[] = [
	{
		id: 'quality-report',
		number: 1,
		title: 'Quality Report',
		shortTitle: 'Quality Report',
		description: 'Review data quality issues identified in your vault.',
		type: 'review',
		service: 'DataQualityService',
		detectMethod: 'getIssuesSummary',
		dependencies: []
	},
	{
		id: 'bidirectional',
		number: 2,
		title: 'Fix Bidirectional Relationships',
		shortTitle: 'Bidir Rels',
		description: 'Ensure parent-child relationships are properly linked in both directions.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectBidirectionalIssues',
		applyMethod: 'fixBidirectionalInconsistencies',
		dependencies: [1]
	},
	{
		id: 'date-normalize',
		number: 3,
		title: 'Normalize Date Formats',
		shortTitle: 'Dates',
		description: 'Convert non-standard date formats to ISO 8601 (YYYY-MM-DD).',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectDateIssues',
		applyMethod: 'normalizeDateFormats',
		dependencies: [2]
	},
	{
		id: 'gender-normalize',
		number: 4,
		title: 'Normalize Gender Values',
		shortTitle: 'Gender',
		description: 'Standardize gender/sex values to consistent format.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectGenderIssues',
		applyMethod: 'normalizeGenderValues',
		dependencies: [2]
	},
	{
		id: 'orphan-clear',
		number: 5,
		title: 'Clear Orphan References',
		shortTitle: 'Orphans',
		description: 'Remove dangling links to non-existent notes.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectOrphanReferences',
		applyMethod: 'clearOrphanReferences',
		dependencies: [2]
	},
	{
		id: 'source-migrate',
		number: 6,
		title: 'Migrate Source Properties',
		shortTitle: 'Sources',
		description: 'Convert indexed source properties (source_2, source_3) to array format.',
		type: 'batch',
		service: 'SourceMigrationService',
		detectMethod: 'detectIndexedSources',
		applyMethod: 'migrateToArrayFormat',
		dependencies: [5]
	},
	{
		id: 'place-variants',
		number: 7,
		title: 'Standardize Place Variants',
		shortTitle: 'Place Names',
		description: 'Choose canonical names for places with multiple variants.',
		type: 'interactive',
		service: 'PlaceGraphService',
		detectMethod: 'detectPlaceVariants',
		applyMethod: 'standardizeVariant',
		dependencies: []
	},
	{
		id: 'geocode',
		number: 8,
		title: 'Bulk Geocode',
		shortTitle: 'Geocode',
		description: 'Add geographic coordinates to place notes.',
		type: 'interactive',
		service: 'GeocodingService',
		detectMethod: 'detectUngeocoded',
		applyMethod: 'geocodePlace',
		dependencies: [7]
	},
	{
		id: 'place-hierarchy',
		number: 9,
		title: 'Enrich Place Hierarchy',
		shortTitle: 'Hierarchy',
		description: 'Build containment chains (city → county → state → country).',
		type: 'interactive',
		service: 'PlaceGraphService',
		detectMethod: 'detectMissingHierarchy',
		applyMethod: 'enrichHierarchy',
		dependencies: [8]
	},
	{
		id: 'flatten-props',
		number: 10,
		title: 'Flatten Nested Properties',
		shortTitle: 'Flatten',
		description: 'Convert nested YAML objects to flat property format.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectNestedProperties',
		applyMethod: 'flattenProperties',
		dependencies: []
	}
];

/**
 * Cleanup Wizard Modal
 */
export class CleanupWizardModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private state: CleanupWizardState;
	private contentContainer: HTMLElement | null = null;
	private footerContainer: HTMLElement | null = null;
	private progressContainer: HTMLElement | null = null;
	private dataQualityService: DataQualityService;

	// View state
	private currentView: 'overview' | 'step' | 'summary' = 'overview';

	constructor(app: App, plugin: CanvasRootsPlugin) {
		super(app);
		this.plugin = plugin;
		this.state = this.getDefaultState();
		this.dataQualityService = new DataQualityService(app);
	}

	/**
	 * Get default wizard state
	 */
	private getDefaultState(): CleanupWizardState {
		const steps: Record<number, StepState> = {};
		for (const step of WIZARD_STEPS) {
			steps[step.number] = {
				status: 'pending',
				issueCount: 0,
				fixCount: 0
			};
		}

		return {
			currentStep: 0,
			steps,
			startTime: Date.now(),
			isPreScanning: false,
			preScanComplete: false
		};
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-cleanup-wizard');

		// Modal header with icon and title
		const header = contentEl.createDiv({ cls: 'crc-cleanup-wizard-header' });

		const titleRow = header.createDiv({ cls: 'crc-wizard-title' });
		const iconEl = titleRow.createDiv({ cls: 'crc-wizard-title-icon' });
		setIcon(iconEl, 'sparkles');
		titleRow.createSpan({ text: 'Post-Import Cleanup Wizard' });

		// Progress container (used in step view)
		this.progressContainer = contentEl.createDiv({ cls: 'crc-wizard-progress crc-cleanup-wizard-progress' });
		this.progressContainer.style.display = 'none';

		// Content container
		this.contentContainer = contentEl.createDiv({ cls: 'crc-cleanup-wizard-content' });

		// Footer container
		this.footerContainer = contentEl.createDiv({ cls: 'crc-cleanup-wizard-footer' });

		// Start pre-scan and render
		this.renderCurrentView();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the current view
	 */
	private renderCurrentView(): void {
		if (!this.contentContainer || !this.footerContainer) return;

		this.contentContainer.empty();
		this.footerContainer.empty();

		switch (this.currentView) {
			case 'overview':
				this.renderOverview();
				break;
			case 'step':
				this.renderStepView();
				break;
			case 'summary':
				this.renderSummary();
				break;
		}
	}

	/**
	 * Render the overview tile grid
	 */
	private renderOverview(): void {
		if (!this.contentContainer || !this.footerContainer || !this.progressContainer) return;

		// Hide step progress in overview
		this.progressContainer.style.display = 'none';

		const section = this.contentContainer.createDiv({ cls: 'crc-cleanup-section' });

		// Intro text
		const intro = section.createDiv({ cls: 'crc-cleanup-intro' });
		intro.textContent = 'Clean up your vault after import. Click a step to begin, or start from the first step.';

		// Pre-scan status
		if (this.state.isPreScanning) {
			const scanningEl = section.createDiv({ cls: 'crc-cleanup-scanning' });
			const spinnerEl = scanningEl.createDiv({ cls: 'crc-cleanup-spinner' });
			setIcon(spinnerEl, 'loader-2');
			scanningEl.createSpan({ text: 'Analyzing vault...' });
		}

		// Tile grid (5x2)
		const grid = section.createDiv({ cls: 'crc-cleanup-tile-grid' });

		for (const stepConfig of WIZARD_STEPS) {
			this.renderStepTile(grid, stepConfig);
		}

		// Footer buttons
		const leftBtns = this.footerContainer.createDiv({ cls: 'crc-cleanup-footer-left' });
		const cancelBtn = leftBtns.createEl('button', {
			cls: 'crc-btn crc-btn--secondary',
			text: 'Close'
		});
		cancelBtn.addEventListener('click', () => this.close());

		const rightBtns = this.footerContainer.createDiv({ cls: 'crc-cleanup-footer-right' });

		// Skip All button
		const skipAllBtn = rightBtns.createEl('button', {
			cls: 'crc-btn crc-btn--secondary',
			text: 'Skip All & Exit'
		});
		skipAllBtn.addEventListener('click', () => {
			// Mark all as skipped and close
			for (const step of WIZARD_STEPS) {
				if (this.state.steps[step.number].status === 'pending') {
					this.state.steps[step.number].status = 'skipped';
					this.state.steps[step.number].skippedReason = 'Skipped by user';
				}
			}
			this.currentView = 'summary';
			this.renderCurrentView();
		});

		// Start Cleanup button
		const startBtn = rightBtns.createEl('button', {
			cls: 'crc-btn crc-btn--primary'
		});
		const startIcon = startBtn.createSpan({ cls: 'crc-btn-icon' });
		setIcon(startIcon, 'play');
		startBtn.createSpan({ text: 'Start Cleanup' });

		startBtn.addEventListener('click', () => {
			this.state.currentStep = 1;
			this.currentView = 'step';
			this.renderCurrentView();
		});

		// Start pre-scan if not done
		if (!this.state.preScanComplete && !this.state.isPreScanning) {
			void this.runPreScan();
		}
	}

	/**
	 * Render a single step tile
	 */
	private renderStepTile(container: HTMLElement, stepConfig: WizardStepConfig): void {
		const stepState = this.state.steps[stepConfig.number];
		const tile = container.createDiv({ cls: 'crc-cleanup-tile' });

		// Add status class
		tile.addClass(`crc-cleanup-tile--${stepState.status}`);

		// Step number badge
		const numberBadge = tile.createDiv({ cls: 'crc-cleanup-tile-number' });
		numberBadge.textContent = String(stepConfig.number);

		// Title
		const title = tile.createDiv({ cls: 'crc-cleanup-tile-title' });
		title.textContent = stepConfig.shortTitle;

		// Status/count badge
		const badge = tile.createDiv({ cls: 'crc-cleanup-tile-badge' });

		switch (stepState.status) {
			case 'pending':
				if (stepState.issueCount > 0) {
					badge.textContent = `${stepState.issueCount} ${stepState.issueCount === 1 ? 'fix' : 'fixes'}`;
					badge.addClass('crc-cleanup-tile-badge--count');
				} else if (this.state.preScanComplete) {
					badge.textContent = '0 issues';
					badge.addClass('crc-cleanup-tile-badge--empty');
				} else {
					badge.textContent = 'Pending';
					badge.addClass('crc-cleanup-tile-badge--pending');
				}
				break;
			case 'in_progress':
				badge.textContent = 'In progress';
				badge.addClass('crc-cleanup-tile-badge--progress');
				break;
			case 'complete':
				const checkIcon = badge.createSpan({ cls: 'crc-cleanup-tile-badge-icon' });
				setIcon(checkIcon, 'check');
				if (stepState.fixCount > 0) {
					badge.createSpan({ text: `${stepState.fixCount} fixed` });
				} else {
					badge.createSpan({ text: 'Done' });
				}
				badge.addClass('crc-cleanup-tile-badge--complete');
				break;
			case 'skipped':
				badge.textContent = 'Skipped';
				badge.addClass('crc-cleanup-tile-badge--skipped');
				break;
		}

		// Click handler
		tile.addEventListener('click', () => {
			this.state.currentStep = stepConfig.number;
			this.currentView = 'step';
			this.renderCurrentView();
		});
	}

	/**
	 * Render the step progress indicator
	 */
	private renderStepProgress(): void {
		if (!this.progressContainer) return;
		this.progressContainer.empty();
		this.progressContainer.style.display = 'block';

		const stepsRow = this.progressContainer.createDiv({ cls: 'crc-wizard-steps crc-cleanup-progress-steps' });

		// Show 10 step dots (more compact than numbered circles)
		for (let i = 1; i <= 10; i++) {
			const stepState = this.state.steps[i];
			const dot = stepsRow.createDiv({ cls: 'crc-cleanup-progress-dot' });

			if (i === this.state.currentStep) {
				dot.addClass('crc-cleanup-progress-dot--active');
			} else if (stepState.status === 'complete') {
				dot.addClass('crc-cleanup-progress-dot--complete');
			} else if (stepState.status === 'skipped') {
				dot.addClass('crc-cleanup-progress-dot--skipped');
			}

			// Connector line (except after last)
			if (i < 10) {
				const connector = stepsRow.createDiv({ cls: 'crc-cleanup-progress-connector' });
				if (stepState.status === 'complete' || stepState.status === 'skipped') {
					connector.addClass('crc-cleanup-progress-connector--done');
				}
			}
		}

		// Step label
		const stepLabel = this.progressContainer.createDiv({ cls: 'crc-cleanup-step-label' });
		stepLabel.textContent = `Step ${this.state.currentStep} of 10`;
	}

	/**
	 * Render the current step view
	 */
	private renderStepView(): void {
		if (!this.contentContainer || !this.footerContainer) return;

		// Show step progress
		this.renderStepProgress();

		const stepConfig = WIZARD_STEPS.find(s => s.number === this.state.currentStep);
		if (!stepConfig) return;

		const stepState = this.state.steps[this.state.currentStep];

		const section = this.contentContainer.createDiv({ cls: 'crc-cleanup-section' });

		// Step title
		section.createEl('h3', {
			text: `Step ${stepConfig.number}: ${stepConfig.title}`,
			cls: 'crc-cleanup-step-title'
		});

		// Step description
		const desc = section.createDiv({ cls: 'crc-cleanup-step-description' });
		desc.textContent = stepConfig.description;

		// Step content based on type
		const contentArea = section.createDiv({ cls: 'crc-cleanup-step-content' });

		switch (stepConfig.type) {
			case 'review':
				this.renderReviewStep(contentArea, stepConfig, stepState);
				break;
			case 'batch':
				this.renderBatchStep(contentArea, stepConfig, stepState);
				break;
			case 'interactive':
				this.renderInteractiveStep(contentArea, stepConfig, stepState);
				break;
		}

		// Footer navigation
		this.renderStepFooter(stepConfig, stepState);
	}

	/**
	 * Render a review-only step (Step 1)
	 */
	private renderReviewStep(
		container: HTMLElement,
		_stepConfig: WizardStepConfig,
		stepState: StepState
	): void {
		if (stepState.issueCount === 0 && this.state.preScanComplete) {
			const noIssues = container.createDiv({ cls: 'crc-cleanup-no-issues' });
			const icon = noIssues.createDiv({ cls: 'crc-cleanup-no-issues-icon' });
			setIcon(icon, 'check-circle');
			noIssues.createDiv({ cls: 'crc-cleanup-no-issues-text', text: 'No quality issues detected!' });
			noIssues.createDiv({ cls: 'crc-cleanup-no-issues-hint', text: 'Your vault looks good. You can skip to the next step or review the other steps.' });
			return;
		}

		// Show issue summary grouped by type
		const issueList = container.createDiv({ cls: 'crc-cleanup-issue-list' });

		// Placeholder for issues - will be populated by pre-scan
		const placeholder = issueList.createDiv({ cls: 'crc-cleanup-placeholder' });
		if (this.state.isPreScanning) {
			const spinner = placeholder.createDiv({ cls: 'crc-cleanup-spinner' });
			setIcon(spinner, 'loader-2');
			placeholder.createSpan({ text: 'Analyzing quality issues...' });
		} else {
			placeholder.textContent = `Found ${stepState.issueCount} quality issues. Review them above and proceed to fix automatically in subsequent steps.`;
		}
	}

	/**
	 * Render a batch-fix step (Steps 2-6, 10)
	 */
	private renderBatchStep(
		container: HTMLElement,
		stepConfig: WizardStepConfig,
		stepState: StepState
	): void {
		if (stepState.status === 'complete') {
			const complete = container.createDiv({ cls: 'crc-cleanup-step-complete' });
			const icon = complete.createDiv({ cls: 'crc-cleanup-step-complete-icon' });
			setIcon(icon, 'check-circle');
			complete.createDiv({ cls: 'crc-cleanup-step-complete-text', text: 'Step complete!' });
			if (stepState.fixCount > 0) {
				complete.createDiv({ cls: 'crc-cleanup-step-complete-count', text: `${stepState.fixCount} items fixed` });
			}
			return;
		}

		if (stepState.issueCount === 0 && this.state.preScanComplete) {
			const noIssues = container.createDiv({ cls: 'crc-cleanup-no-issues' });
			const icon = noIssues.createDiv({ cls: 'crc-cleanup-no-issues-icon' });
			setIcon(icon, 'check-circle');
			noIssues.createDiv({ cls: 'crc-cleanup-no-issues-text', text: 'No issues to fix!' });
			noIssues.createDiv({ cls: 'crc-cleanup-no-issues-hint', text: 'This step has nothing to do. You can skip to the next step.' });
			return;
		}

		// Show preview table
		const preview = container.createDiv({ cls: 'crc-cleanup-preview' });

		if (stepState.issueCount > 0) {
			const summary = preview.createDiv({ cls: 'crc-cleanup-preview-summary' });
			summary.textContent = `${stepState.issueCount} ${stepState.issueCount === 1 ? 'item' : 'items'} will be fixed:`;

			// Placeholder for preview table
			const table = preview.createDiv({ cls: 'crc-cleanup-preview-table' });
			const placeholder = table.createDiv({ cls: 'crc-cleanup-placeholder' });
			placeholder.textContent = `Preview for ${stepConfig.title} will appear here.`;
		} else if (this.state.isPreScanning) {
			const scanning = preview.createDiv({ cls: 'crc-cleanup-scanning' });
			const spinner = scanning.createDiv({ cls: 'crc-cleanup-spinner' });
			setIcon(spinner, 'loader-2');
			scanning.createSpan({ text: 'Detecting issues...' });
		}
	}

	/**
	 * Render an interactive step (Steps 7-9)
	 */
	private renderInteractiveStep(
		container: HTMLElement,
		stepConfig: WizardStepConfig,
		stepState: StepState
	): void {
		if (stepState.status === 'complete') {
			const complete = container.createDiv({ cls: 'crc-cleanup-step-complete' });
			const icon = complete.createDiv({ cls: 'crc-cleanup-step-complete-icon' });
			setIcon(icon, 'check-circle');
			complete.createDiv({ cls: 'crc-cleanup-step-complete-text', text: 'Step complete!' });
			if (stepState.fixCount > 0) {
				complete.createDiv({ cls: 'crc-cleanup-step-complete-count', text: `${stepState.fixCount} items processed` });
			}
			return;
		}

		// Placeholder for interactive UI
		const interactive = container.createDiv({ cls: 'crc-cleanup-interactive' });
		const placeholder = interactive.createDiv({ cls: 'crc-cleanup-placeholder' });
		placeholder.textContent = `Interactive UI for ${stepConfig.title} will be implemented in Phase 2.`;

		// Note about interactive steps
		const note = interactive.createDiv({ cls: 'crc-cleanup-note' });
		const noteIcon = note.createDiv({ cls: 'crc-cleanup-note-icon' });
		setIcon(noteIcon, 'info');
		note.createSpan({ text: 'This step requires manual decisions for each item. You can skip it for now and run it individually later.' });
	}

	/**
	 * Render step footer with navigation buttons
	 */
	private renderStepFooter(stepConfig: WizardStepConfig, stepState: StepState): void {
		if (!this.footerContainer) return;

		const leftBtns = this.footerContainer.createDiv({ cls: 'crc-cleanup-footer-left' });

		// Overview button
		const overviewBtn = leftBtns.createEl('button', {
			cls: 'crc-btn crc-btn--secondary'
		});
		const overviewIcon = overviewBtn.createSpan({ cls: 'crc-btn-icon' });
		setIcon(overviewIcon, 'layout-grid');
		overviewBtn.createSpan({ text: 'Overview' });
		overviewBtn.addEventListener('click', () => {
			this.currentView = 'overview';
			this.renderCurrentView();
		});

		// Back button (if not first step)
		if (this.state.currentStep > 1) {
			const backBtn = leftBtns.createEl('button', {
				cls: 'crc-btn crc-btn--secondary',
				text: 'Back'
			});
			backBtn.addEventListener('click', () => {
				this.state.currentStep--;
				this.renderCurrentView();
			});
		}

		const rightBtns = this.footerContainer.createDiv({ cls: 'crc-cleanup-footer-right' });

		// Skip button
		const skipBtn = rightBtns.createEl('button', {
			cls: 'crc-btn crc-btn--secondary',
			text: 'Skip Step'
		});
		skipBtn.addEventListener('click', () => {
			this.state.steps[this.state.currentStep].status = 'skipped';
			this.state.steps[this.state.currentStep].skippedReason = 'Skipped by user';
			this.advanceToNextStep();
		});

		// Apply/Continue button
		if (stepConfig.type === 'review' || stepState.status === 'complete') {
			// Review step or already complete - just show Next
			const nextBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: this.state.currentStep === 10 ? 'Finish' : 'Next'
			});
			nextBtn.addEventListener('click', () => {
				if (stepState.status === 'pending') {
					this.state.steps[this.state.currentStep].status = 'complete';
				}
				this.advanceToNextStep();
			});
		} else if (stepConfig.type === 'batch' && stepState.issueCount > 0) {
			// Batch step with issues - show Apply button
			const applyBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary'
			});
			const applyIcon = applyBtn.createSpan({ cls: 'crc-btn-icon' });
			setIcon(applyIcon, 'zap');
			applyBtn.createSpan({ text: 'Apply Fixes' });
			applyBtn.addEventListener('click', () => {
				void this.applyBatchFixes(stepConfig);
			});
		} else {
			// No issues or interactive step - show Next
			const nextBtn = rightBtns.createEl('button', {
				cls: 'crc-btn crc-btn--primary',
				text: this.state.currentStep === 10 ? 'Finish' : 'Next'
			});
			nextBtn.addEventListener('click', () => {
				if (stepState.status === 'pending' && stepState.issueCount === 0) {
					this.state.steps[this.state.currentStep].status = 'skipped';
					this.state.steps[this.state.currentStep].skippedReason = 'No issues found';
				}
				this.advanceToNextStep();
			});
		}
	}

	/**
	 * Advance to the next step or summary
	 */
	private advanceToNextStep(): void {
		if (this.state.currentStep >= 10) {
			this.currentView = 'summary';
		} else {
			this.state.currentStep++;
		}
		this.renderCurrentView();
	}

	/**
	 * Apply batch fixes for a step
	 */
	private async applyBatchFixes(stepConfig: WizardStepConfig): Promise<void> {
		const stepState = this.state.steps[stepConfig.number];
		stepState.status = 'in_progress';
		this.renderCurrentView();

		try {
			let result: BatchOperationResult | null = null;

			// Call the appropriate service method
			switch (stepConfig.id) {
				case 'bidirectional':
					result = await this.dataQualityService.fixBidirectionalInconsistencies();
					break;
				case 'date-normalize':
					result = await this.dataQualityService.normalizeDateFormats();
					break;
				case 'gender-normalize':
					result = await this.dataQualityService.normalizeGenderValues();
					break;
				case 'orphan-clear':
					result = await this.dataQualityService.clearOrphanReferences();
					break;
				// TODO: Add other batch methods as they're implemented
				default:
					// Placeholder for unimplemented methods
					await new Promise(resolve => setTimeout(resolve, 500));
					result = { processed: 0, modified: stepState.issueCount, errors: [] };
			}

			if (result) {
				stepState.status = 'complete';
				stepState.fixCount = result.modified;
				new Notice(`Fixed ${result.modified} issues`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error: ${message}`);
			stepState.status = 'pending';
		}

		this.renderCurrentView();
	}

	/**
	 * Render the summary screen
	 */
	private renderSummary(): void {
		if (!this.contentContainer || !this.footerContainer || !this.progressContainer) return;

		// Hide step progress
		this.progressContainer.style.display = 'none';

		const section = this.contentContainer.createDiv({ cls: 'crc-cleanup-section' });

		// Success header
		const header = section.createDiv({ cls: 'crc-cleanup-summary-header' });
		const headerIcon = header.createDiv({ cls: 'crc-cleanup-summary-icon' });
		setIcon(headerIcon, 'check-circle');
		header.createEl('h2', { text: 'Cleanup Complete!' });

		// Stats cards
		const stats = section.createDiv({ cls: 'crc-cleanup-summary-stats' });

		let totalFixes = 0;
		let skippedCount = 0;
		let manualCount = 0;

		for (const step of WIZARD_STEPS) {
			const stepState = this.state.steps[step.number];
			if (stepState.status === 'complete') {
				totalFixes += stepState.fixCount;
			} else if (stepState.status === 'skipped') {
				skippedCount++;
			}
			// Count manual issues (step 1 review items that weren't auto-fixable)
			if (step.number === 1 && stepState.issueCount > 0) {
				// This is a simplification - in reality we'd track manual vs auto-fixable
			}
		}

		this.renderStatCard(stats, String(totalFixes), 'Fixes Applied', 'zap');
		this.renderStatCard(stats, String(skippedCount), 'Steps Skipped', 'skip-forward');
		this.renderStatCard(stats, String(manualCount), 'Manual Issues', 'hand');

		// Step breakdown
		section.createEl('h4', { text: 'Step Breakdown', cls: 'crc-cleanup-breakdown-title' });

		const breakdown = section.createDiv({ cls: 'crc-cleanup-breakdown' });

		for (const step of WIZARD_STEPS) {
			const stepState = this.state.steps[step.number];
			const row = breakdown.createDiv({ cls: 'crc-cleanup-breakdown-row' });

			const label = row.createDiv({ cls: 'crc-cleanup-breakdown-label' });
			label.textContent = `Step ${step.number}: ${step.title}`;

			const status = row.createDiv({ cls: 'crc-cleanup-breakdown-status' });

			switch (stepState.status) {
				case 'complete':
					const checkIcon = status.createSpan({ cls: 'crc-cleanup-breakdown-icon crc-cleanup-breakdown-icon--complete' });
					setIcon(checkIcon, 'check');
					if (stepState.fixCount > 0) {
						status.createSpan({ text: `${stepState.fixCount} fixed` });
					} else {
						status.createSpan({ text: 'Reviewed' });
					}
					break;
				case 'skipped':
					const skipIcon = status.createSpan({ cls: 'crc-cleanup-breakdown-icon crc-cleanup-breakdown-icon--skipped' });
					setIcon(skipIcon, 'skip-forward');
					status.createSpan({ text: stepState.skippedReason || 'Skipped' });
					break;
				case 'pending':
					status.createSpan({ text: 'Not started', cls: 'crc-cleanup-breakdown-pending' });
					break;
			}
		}

		// Footer
		const leftBtns = this.footerContainer.createDiv({ cls: 'crc-cleanup-footer-left' });

		const saveReportBtn = leftBtns.createEl('button', {
			cls: 'crc-btn crc-btn--secondary'
		});
		const saveIcon = saveReportBtn.createSpan({ cls: 'crc-btn-icon' });
		setIcon(saveIcon, 'file-text');
		saveReportBtn.createSpan({ text: 'Save Report' });
		saveReportBtn.addEventListener('click', () => {
			void this.saveReport();
		});

		const rightBtns = this.footerContainer.createDiv({ cls: 'crc-cleanup-footer-right' });

		const doneBtn = rightBtns.createEl('button', {
			cls: 'crc-btn crc-btn--primary',
			text: 'Done'
		});
		doneBtn.addEventListener('click', () => this.close());
	}

	/**
	 * Render a stat card
	 */
	private renderStatCard(container: HTMLElement, value: string, label: string, icon: string): void {
		const card = container.createDiv({ cls: 'crc-cleanup-stat-card' });
		const iconEl = card.createDiv({ cls: 'crc-cleanup-stat-icon' });
		setIcon(iconEl, icon);
		card.createDiv({ cls: 'crc-cleanup-stat-value', text: value });
		card.createDiv({ cls: 'crc-cleanup-stat-label', text: label });
	}

	/**
	 * Run pre-scan to populate issue counts
	 */
	private async runPreScan(): Promise<void> {
		this.state.isPreScanning = true;
		this.renderCurrentView();

		try {
			// Initialize DataQualityService with plugin settings
			this.dataQualityService.setSettings(this.plugin.settings);
			this.dataQualityService.refreshCache();

			// Get quality summary for step 1
			const summary = await this.dataQualityService.getIssuesSummary();

			// Populate step 1 with total issues
			let totalIssues = 0;
			for (const category of Object.values(summary)) {
				totalIssues += category.length;
			}
			this.state.steps[1].issueCount = totalIssues;

			// For now, use placeholder counts for other steps
			// In a full implementation, each step would have its own detection method
			// This is Phase 1 - we'll wire up actual detection in subsequent phases

			this.state.preScanComplete = true;
		} catch (error) {
			console.error('Pre-scan failed:', error);
		} finally {
			this.state.isPreScanning = false;
			this.renderCurrentView();
		}
	}

	/**
	 * Save cleanup report to vault
	 */
	private async saveReport(): Promise<void> {
		const date = new Date().toISOString().split('T')[0];
		const fileName = `Cleanup Summary ${date}.md`;
		const folderPath = 'Canvas Roots/Reports';

		// Build report content
		let content = `# Cleanup Summary\n\n`;
		content += `**Date:** ${new Date().toLocaleString()}\n\n`;
		content += `## Summary\n\n`;

		let totalFixes = 0;
		let skippedCount = 0;

		for (const step of WIZARD_STEPS) {
			const stepState = this.state.steps[step.number];
			if (stepState.status === 'complete') {
				totalFixes += stepState.fixCount;
			} else if (stepState.status === 'skipped') {
				skippedCount++;
			}
		}

		content += `- **Fixes Applied:** ${totalFixes}\n`;
		content += `- **Steps Skipped:** ${skippedCount}\n\n`;

		content += `## Step Details\n\n`;

		for (const step of WIZARD_STEPS) {
			const stepState = this.state.steps[step.number];
			let statusText = '';

			switch (stepState.status) {
				case 'complete':
					statusText = stepState.fixCount > 0 ? `${stepState.fixCount} fixed` : 'Reviewed';
					break;
				case 'skipped':
					statusText = stepState.skippedReason || 'Skipped';
					break;
				case 'pending':
					statusText = 'Not started';
					break;
			}

			const icon = stepState.status === 'complete' ? '✅' : stepState.status === 'skipped' ? '⏭️' : '⏳';
			content += `${icon} **Step ${step.number}: ${step.title}** - ${statusText}\n`;
		}

		content += `\n---\n*Generated by Canvas Roots Cleanup Wizard*\n`;

		try {
			// Ensure folder exists
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (!folder) {
				await this.app.vault.createFolder(folderPath);
			}

			// Create report file
			const filePath = `${folderPath}/${fileName}`;
			await this.app.vault.create(filePath, content);
			new Notice(`Report saved to ${filePath}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to save report: ${message}`);
		}
	}
}
