/**
 * GEDCOM Quality Preview Modal
 *
 * Shows data quality issues found in GEDCOM data before import,
 * allowing users to review and configure how issues should be handled.
 */

import { App, Modal, Setting } from 'obsidian';
import { createLucideIcon, setLucideIcon, LucideIconName } from './lucide-icons';
import type {
	GedcomQualityAnalysis,
	GedcomQualityIssue,
	QualityFixChoices,
	QualityIssueCategory,
	QualityIssueSeverity,
	PlaceVariantInfo
} from '../gedcom/gedcom-quality-analyzer';

/**
 * Result of the quality preview modal
 */
export interface QualityPreviewResult {
	/** Whether to continue with import */
	proceed: boolean;
	/** User's fix choices */
	choices: QualityFixChoices;
}

/**
 * Options for the quality preview modal
 */
export interface QualityPreviewOptions {
	/** Callback when user makes a decision */
	onComplete: (result: QualityPreviewResult) => void;
}

/**
 * Tab configuration for issue categories
 */
interface TabConfig {
	id: QualityIssueCategory | 'places' | 'summary';
	label: string;
	icon: LucideIconName;
}

const TABS: TabConfig[] = [
	{ id: 'summary', label: 'Summary', icon: 'bar-chart' },
	{ id: 'places', label: 'Places', icon: 'globe' },
	{ id: 'date', label: 'Dates', icon: 'calendar' },
	{ id: 'relationship', label: 'Relationships', icon: 'users' },
	{ id: 'reference', label: 'References', icon: 'link' },
	{ id: 'data', label: 'Data', icon: 'file-text' }
];

const SEVERITY_ICONS: Record<QualityIssueSeverity, LucideIconName> = {
	error: 'alert-circle',
	warning: 'alert-triangle',
	info: 'info'
};

const SEVERITY_CLASSES: Record<QualityIssueSeverity, string> = {
	error: 'crc-severity--error',
	warning: 'crc-severity--warning',
	info: 'crc-severity--info'
};

/**
 * Modal for previewing GEDCOM quality issues before import
 */
export class GedcomQualityPreviewModal extends Modal {
	private analysis: GedcomQualityAnalysis;
	private choices: QualityFixChoices;
	private onComplete: (result: QualityPreviewResult) => void;
	private activeTab: TabConfig['id'] = 'summary';
	private tabContentEl: HTMLElement | null = null;

	constructor(
		app: App,
		analysis: GedcomQualityAnalysis,
		options: QualityPreviewOptions
	) {
		super(app);
		this.analysis = analysis;
		this.choices = { ...analysis.defaultChoices };
		this.onComplete = options.onComplete;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.modalEl.addClass('crc-quality-preview-modal');
		this.modalEl.addClass('crc-batch-preview-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-modal-header' });
		const titleContainer = header.createDiv({ cls: 'crc-modal-title' });
		const titleIcon = createLucideIcon('clipboard-check', 24);
		titleContainer.appendChild(titleIcon);
		titleContainer.createEl('span', { text: 'Data quality preview' });

		// Summary bar
		this.renderSummaryBar(contentEl);

		// Tabs
		const tabsContainer = contentEl.createDiv({ cls: 'crc-quality-tabs' });
		this.renderTabs(tabsContainer);

		// Tab content area
		this.tabContentEl = contentEl.createDiv({ cls: 'crc-quality-tab-content' });
		this.renderTabContent();

		// Action buttons
		this.renderActionButtons(contentEl);
	}

	onClose() {
		this.contentEl.empty();
	}

	/**
	 * Render the summary bar with issue counts
	 */
	private renderSummaryBar(container: HTMLElement): void {
		const { summary } = this.analysis;

		const summaryBar = container.createDiv({ cls: 'crc-quality-summary-bar' });

		// Record counts
		const recordsInfo = summaryBar.createDiv({ cls: 'crc-quality-summary-item' });
		recordsInfo.createEl('span', {
			text: `${summary.totalIndividuals} individuals`,
			cls: 'crc-quality-summary-count'
		});
		recordsInfo.createEl('span', { text: ' · ', cls: 'crc-text--muted' });
		recordsInfo.createEl('span', {
			text: `${summary.totalFamilies} families`,
			cls: 'crc-quality-summary-count'
		});
		recordsInfo.createEl('span', { text: ' · ', cls: 'crc-text--muted' });
		recordsInfo.createEl('span', {
			text: `${summary.uniquePlaces.length} unique places`,
			cls: 'crc-quality-summary-count'
		});

		// Issue counts by severity
		const issuesInfo = summaryBar.createDiv({ cls: 'crc-quality-summary-item' });

		if (summary.bySeverity.error > 0) {
			const errorBadge = issuesInfo.createSpan({ cls: 'crc-quality-badge crc-quality-badge--error' });
			setLucideIcon(errorBadge.createSpan(), 'alert-circle');
			errorBadge.createSpan({ text: ` ${summary.bySeverity.error}` });
		}

		if (summary.bySeverity.warning > 0) {
			const warnBadge = issuesInfo.createSpan({ cls: 'crc-quality-badge crc-quality-badge--warning' });
			setLucideIcon(warnBadge.createSpan(), 'alert-triangle');
			warnBadge.createSpan({ text: ` ${summary.bySeverity.warning}` });
		}

		if (summary.bySeverity.info > 0) {
			const infoBadge = issuesInfo.createSpan({ cls: 'crc-quality-badge crc-quality-badge--info' });
			setLucideIcon(infoBadge.createSpan(), 'info');
			infoBadge.createSpan({ text: ` ${summary.bySeverity.info}` });
		}

		if (summary.totalIssues === 0 && summary.placeVariants.length === 0) {
			issuesInfo.createEl('span', {
				text: '✓ No issues found',
				cls: 'crc-text--success'
			});
		}
	}

	/**
	 * Render the tab navigation
	 */
	private renderTabs(container: HTMLElement): void {
		const { summary } = this.analysis;

		for (const tab of TABS) {
			const tabBtn = container.createEl('button', {
				cls: `crc-quality-tab ${this.activeTab === tab.id ? 'crc-quality-tab--active' : ''}`
			});

			setLucideIcon(tabBtn.createSpan({ cls: 'crc-quality-tab-icon' }), tab.icon);
			tabBtn.createSpan({ text: tab.label, cls: 'crc-quality-tab-label' });

			// Badge showing count
			let count = 0;
			if (tab.id === 'places') {
				count = summary.placeVariants.length;
			} else if (tab.id !== 'summary') {
				count = summary.byCategory[tab.id as QualityIssueCategory] || 0;
			}

			if (count > 0) {
				tabBtn.createSpan({
					text: count.toString(),
					cls: 'crc-quality-tab-badge'
				});
			}

			tabBtn.addEventListener('click', () => {
				this.activeTab = tab.id;
				// Update active states
				container.querySelectorAll('.crc-quality-tab').forEach(el => {
					el.removeClass('crc-quality-tab--active');
				});
				tabBtn.addClass('crc-quality-tab--active');
				this.renderTabContent();
			});
		}
	}

	/**
	 * Render the content for the active tab
	 */
	private renderTabContent(): void {
		if (!this.tabContentEl) return;
		this.tabContentEl.empty();

		switch (this.activeTab) {
			case 'summary':
				this.renderSummaryTab(this.tabContentEl);
				break;
			case 'places':
				this.renderPlacesTab(this.tabContentEl);
				break;
			default:
				this.renderIssuesTab(this.tabContentEl, this.activeTab as QualityIssueCategory);
				break;
		}
	}

	/**
	 * Render the summary tab
	 */
	private renderSummaryTab(container: HTMLElement): void {
		const { summary } = this.analysis;

		// Overview
		const overviewSection = container.createDiv({ cls: 'crc-quality-section' });
		overviewSection.createEl('h4', { text: 'Import overview' });

		const overviewGrid = overviewSection.createDiv({ cls: 'crc-quality-overview-grid' });

		this.createStatCard(overviewGrid, 'users', summary.totalIndividuals.toString(), 'Individuals');
		this.createStatCard(overviewGrid, 'home', summary.totalFamilies.toString(), 'Families');
		this.createStatCard(overviewGrid, 'map-pin', summary.uniquePlaces.length.toString(), 'Unique places');
		this.createStatCard(
			overviewGrid,
			summary.totalIssues > 0 ? 'alert-triangle' : 'check-circle',
			summary.totalIssues.toString(),
			'Issues found',
			summary.totalIssues === 0 ? 'crc-stat-card--success' : summary.bySeverity.error > 0 ? 'crc-stat-card--error' : ''
		);

		// Place variants summary (if any)
		if (summary.placeVariants.length > 0) {
			const variantsSection = container.createDiv({ cls: 'crc-quality-section' });
			variantsSection.createEl('h4', { text: 'Place name variants' });
			variantsSection.createEl('p', {
				text: `Found ${summary.placeVariants.length} place name variant${summary.placeVariants.length !== 1 ? 's' : ''} that can be standardized (e.g., "USA" vs "United States").`,
				cls: 'crc-text--muted'
			});

			const viewBtn = variantsSection.createEl('button', {
				text: 'Configure place names →',
				cls: 'crc-btn crc-btn--small'
			});
			viewBtn.addEventListener('click', () => {
				this.activeTab = 'places';
				this.tabContentEl?.parentElement?.querySelectorAll('.crc-quality-tab').forEach(el => {
					el.removeClass('crc-quality-tab--active');
					if (el.textContent?.includes('Places')) {
						el.addClass('crc-quality-tab--active');
					}
				});
				this.renderTabContent();
			});
		}

		// Issues breakdown (if any)
		if (summary.totalIssues > 0) {
			const issuesSection = container.createDiv({ cls: 'crc-quality-section' });
			issuesSection.createEl('h4', { text: 'Issues by category' });

			const categoryGrid = issuesSection.createDiv({ cls: 'crc-quality-category-grid' });

			const categories: Array<{ cat: QualityIssueCategory; label: string; icon: LucideIconName }> = [
				{ cat: 'date', label: 'Date issues', icon: 'calendar' },
				{ cat: 'relationship', label: 'Relationship issues', icon: 'users' },
				{ cat: 'reference', label: 'Reference issues', icon: 'link' },
				{ cat: 'data', label: 'Data issues', icon: 'file-text' }
			];

			for (const { cat, label, icon } of categories) {
				const count = summary.byCategory[cat] || 0;
				if (count > 0) {
					const catItem = categoryGrid.createDiv({ cls: 'crc-quality-category-item' });
					setLucideIcon(catItem.createSpan(), icon);
					catItem.createSpan({ text: ` ${count} ${label.toLowerCase()}` });
				}
			}
		}

		// No issues message
		if (summary.totalIssues === 0 && summary.placeVariants.length === 0) {
			const successSection = container.createDiv({ cls: 'crc-quality-success' });
			const successIcon = createLucideIcon('check-circle', 48);
			successIcon.addClass('crc-text--success');
			successSection.appendChild(successIcon);
			successSection.createEl('h4', { text: 'Data looks good!' });
			successSection.createEl('p', {
				text: 'No data quality issues were detected in this GEDCOM file.',
				cls: 'crc-text--muted'
			});
		}
	}

	/**
	 * Create a stat card
	 */
	private createStatCard(
		container: HTMLElement,
		icon: LucideIconName,
		value: string,
		label: string,
		extraClass?: string
	): void {
		const card = container.createDiv({ cls: `crc-stat-card ${extraClass || ''}` });
		const iconEl = createLucideIcon(icon, 24);
		card.appendChild(iconEl);
		card.createEl('div', { text: value, cls: 'crc-stat-card-value' });
		card.createEl('div', { text: label, cls: 'crc-stat-card-label' });
	}

	/**
	 * Render the places tab with variant configuration
	 */
	private renderPlacesTab(container: HTMLElement): void {
		const { summary } = this.analysis;

		if (summary.placeVariants.length === 0) {
			const emptyState = container.createDiv({ cls: 'crc-quality-empty' });
			emptyState.createEl('p', {
				text: 'No place name variants found. All place names are already standardized.',
				cls: 'crc-text--muted'
			});
			return;
		}

		// Description
		const description = container.createDiv({ cls: 'crc-quality-section' });
		description.createEl('p', {
			text: 'The following place name variants were found. Choose which form to use for each:',
			cls: 'crc-text--muted'
		});

		// Quick actions
		const quickActions = container.createDiv({ cls: 'crc-quality-quick-actions' });
		const useCanonicalBtn = quickActions.createEl('button', {
			text: 'Use all canonical forms',
			cls: 'crc-btn crc-btn--small'
		});
		useCanonicalBtn.addEventListener('click', () => {
			for (const variant of summary.placeVariants) {
				this.choices.placeVariantChoices.set(variant.variant, variant.canonical);
			}
			this.renderTabContent();
		});

		const keepOriginalBtn = quickActions.createEl('button', {
			text: 'Keep all original forms',
			cls: 'crc-btn crc-btn--small crc-btn--ghost'
		});
		keepOriginalBtn.addEventListener('click', () => {
			for (const variant of summary.placeVariants) {
				this.choices.placeVariantChoices.set(variant.variant, variant.variant);
			}
			this.renderTabContent();
		});

		// Variants table
		const tableContainer = container.createDiv({ cls: 'crc-batch-table-container' });
		const table = tableContainer.createEl('table', { cls: 'crc-batch-preview-table' });

		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Found in file' });
		headerRow.createEl('th', { text: 'Standardize to' });
		headerRow.createEl('th', { text: 'Occurrences' });

		const tbody = table.createEl('tbody');

		for (const variant of summary.placeVariants) {
			const row = tbody.createEl('tr');

			// Original value
			const originalCell = row.createEl('td');
			const currentChoice = this.choices.placeVariantChoices.get(variant.variant);
			if (currentChoice && currentChoice !== variant.variant) {
				originalCell.createEl('s', { text: variant.variant, cls: 'crc-text--muted' });
			} else {
				originalCell.createEl('span', { text: variant.variant });
			}

			// Dropdown to choose canonical
			const choiceCell = row.createEl('td');
			const select = choiceCell.createEl('select', { cls: 'dropdown' });

			// Option: Keep original
			const keepOpt = select.createEl('option', {
				value: variant.variant,
				text: `${variant.variant} (keep)`
			});
			keepOpt.selected = currentChoice === variant.variant;

			// Option: Use canonical
			const canonicalOpt = select.createEl('option', {
				value: variant.canonical,
				text: variant.canonical
			});
			canonicalOpt.selected = !currentChoice || currentChoice === variant.canonical;

			select.addEventListener('change', () => {
				this.choices.placeVariantChoices.set(variant.variant, select.value);
				// Re-render to update strikethrough
				this.renderTabContent();
			});

			// Count
			const countCell = row.createEl('td', { cls: 'crc-batch-cell--count' });
			countCell.textContent = variant.count.toString();
		}
	}

	/**
	 * Render an issues tab for a specific category
	 */
	private renderIssuesTab(container: HTMLElement, category: QualityIssueCategory): void {
		const issues = this.analysis.issues.filter(i => i.category === category);

		if (issues.length === 0) {
			const emptyState = container.createDiv({ cls: 'crc-quality-empty' });
			emptyState.createEl('p', {
				text: `No ${category} issues found.`,
				cls: 'crc-text--muted'
			});
			return;
		}

		// Group by severity
		const errorIssues = issues.filter(i => i.severity === 'error');
		const warningIssues = issues.filter(i => i.severity === 'warning');
		const infoIssues = issues.filter(i => i.severity === 'info');

		if (errorIssues.length > 0) {
			this.renderIssueGroup(container, 'Errors', 'error', errorIssues);
		}
		if (warningIssues.length > 0) {
			this.renderIssueGroup(container, 'Warnings', 'warning', warningIssues);
		}
		if (infoIssues.length > 0) {
			this.renderIssueGroup(container, 'Info', 'info', infoIssues);
		}
	}

	/**
	 * Render a group of issues
	 */
	private renderIssueGroup(
		container: HTMLElement,
		title: string,
		severity: QualityIssueSeverity,
		issues: GedcomQualityIssue[]
	): void {
		const section = container.createDiv({ cls: 'crc-quality-issue-group' });

		const header = section.createDiv({ cls: 'crc-quality-issue-group-header' });
		const icon = createLucideIcon(SEVERITY_ICONS[severity], 16);
		icon.addClass(SEVERITY_CLASSES[severity]);
		header.appendChild(icon);
		header.createSpan({ text: ` ${title} (${issues.length})` });

		const list = section.createDiv({ cls: 'crc-quality-issue-list' });

		// Limit display to avoid overwhelming the user
		const displayLimit = 50;
		const displayIssues = issues.slice(0, displayLimit);

		for (const issue of displayIssues) {
			const issueEl = list.createDiv({ cls: `crc-quality-issue ${SEVERITY_CLASSES[issue.severity]}` });

			const issueHeader = issueEl.createDiv({ cls: 'crc-quality-issue-header' });
			issueHeader.createEl('strong', { text: issue.recordName });
			issueHeader.createSpan({
				text: ` (@${issue.recordId}@)`,
				cls: 'crc-text--muted'
			});

			issueEl.createEl('p', {
				text: issue.message,
				cls: 'crc-quality-issue-message'
			});
		}

		if (issues.length > displayLimit) {
			list.createEl('p', {
				text: `... and ${issues.length - displayLimit} more`,
				cls: 'crc-text--muted crc-text--center'
			});
		}
	}

	/**
	 * Render the action buttons
	 */
	private renderActionButtons(container: HTMLElement): void {
		const { summary } = this.analysis;

		// Warning callout if there are errors
		if (summary.bySeverity.error > 0) {
			const warning = container.createDiv({ cls: 'crc-warning-callout' });
			const warningIcon = createLucideIcon('alert-triangle', 16);
			warning.appendChild(warningIcon);
			warning.createSpan({
				text: ` ${summary.bySeverity.error} error${summary.bySeverity.error !== 1 ? 's' : ''} found. These records may have data problems that could affect your family tree.`
			});
		}

		// Buttons
		const buttonContainer = container.createDiv({ cls: 'crc-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel import',
			cls: 'crc-btn'
		});
		cancelBtn.addEventListener('click', () => {
			this.onComplete({ proceed: false, choices: this.choices });
			this.close();
		});

		const proceedBtn = buttonContainer.createEl('button', {
			text: summary.placeVariants.length > 0
				? 'Continue with these settings'
				: 'Continue import',
			cls: 'crc-btn crc-btn--primary'
		});
		proceedBtn.addEventListener('click', () => {
			this.onComplete({ proceed: true, choices: this.choices });
			this.close();
		});
	}
}
