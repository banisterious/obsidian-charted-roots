/**
 * Data Quality tab for the Control Center
 *
 * Extracted from control-center.ts to reduce file size. Contains the main
 * Data Quality tab rendering, research gaps sections, vault-wide analysis,
 * batch operations (cross-domain and person-specific), and all supporting
 * helper functions.
 */

import { App, Notice, Setting, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import type { LucideIconName } from './lucide-icons';
import { createLucideIcon } from './lucide-icons';
import { FamilyGraphService } from '../core/family-graph';
import { FolderFilterService } from '../core/folder-filter';
import { DataQualityService } from '../core/data-quality';
import type { DataQualityReport, DataQualityIssue, IssueSeverity, IssueCategory, BidirectionalInconsistency, ImpossibleDateIssue } from '../core/data-quality';
import { PlaceGraphService } from '../core/place-graph';
import { EventService } from '../events/services/event-service';
import { PlaceGeneratorModal } from '../enhancement/ui/place-generator-modal';
import { FlattenNestedPropertiesModal } from './flatten-nested-properties-modal';
import { BulkMediaLinkModal } from '../core/ui/bulk-media-link-modal';
import { TemplateSnippetsModal } from './template-snippets-modal';
import { AddPersonTypePreviewModal } from './add-person-type-modal';
import { getErrorMessage } from '../core/error-utils';
import {
	EvidenceService,
	FACT_KEY_LABELS,
	FACT_KEYS,
	ProofSummaryService,
	CreateProofModal
} from '../sources';
import type {
	FactKey,
	ResearchGapsSummary,
	PersonResearchCoverage,
	ProofSummaryNote
} from '../sources';
import {
	DuplicateRelationshipsPreviewModal,
	PlaceholderRemovalPreviewModal,
	NameNormalizationPreviewModal,
	OrphanedRefsPreviewModal,
	BidirectionalInconsistencyPreviewModal,
	ImpossibleDatesPreviewModal,
	BatchPreviewModal,
	DateValidationPreviewModal
} from './data-quality-modals';

// ---------------------------------------------------------------------------
// Options interface
// ---------------------------------------------------------------------------

export interface DataQualityTabOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	app: App;
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement;
	showTab: (tabId: string) => void;
	closeModal: () => void;
	getCachedFamilyGraph: () => FamilyGraphService;
	invalidateCaches: () => void;
}

// ---------------------------------------------------------------------------
// Dockable view types
// ---------------------------------------------------------------------------

export type DataQualityFilter = 'all' | 'errors' | 'warnings' | 'info';

export interface DataQualityDashboardOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	initialFilter?: DataQualityFilter;
	initialSearch?: string;
	onStateChange?: (filter: DataQualityFilter, search: string) => void;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Render the Data Quality tab
 */
export function renderDataQualityTab(options: DataQualityTabOptions): void {
	const { container, plugin, app } = options;
	container.empty();

	// Quick Start Guidance Card
	const quickStartCard = options.createCard({
		title: 'Quick start',
		icon: 'info',
		subtitle: 'Where to find data quality tools'
	});
	const quickStartContent = quickStartCard.querySelector('.crc-card__content') as HTMLElement;

	const guidanceText = quickStartContent.createEl('p', {
		cls: 'crc-text-muted'
	});
	guidanceText.appendText('Data quality tools are organized by entity type for convenience. This tab provides vault-wide analysis and cross-domain operations.');

	// Domain-specific links
	const linksList = quickStartContent.createEl('ul', { cls: 'crc-text-muted' });

	const peopleItem = linksList.createEl('li');
	peopleItem.appendText('For person-specific batch operations, see the ');
	const peopleLink = peopleItem.createEl('a', {
		text: 'People tab',
		href: '#',
		cls: 'crc-text-link'
	});
	peopleLink.addEventListener('click', (e) => {
		e.preventDefault();
		options.showTab('people');
	});

	const placesItem = linksList.createEl('li');
	placesItem.appendText('For place-specific data quality, see the ');
	const placesLink = placesItem.createEl('a', {
		text: 'Places tab',
		href: '#',
		cls: 'crc-text-link'
	});
	placesLink.addEventListener('click', (e) => {
		e.preventDefault();
		options.showTab('places');
	});

	const schemasItem = linksList.createEl('li');
	schemasItem.appendText('For schema validation, see the ');
	const schemasLink = schemasItem.createEl('a', {
		text: 'Schemas tab',
		href: '#',
		cls: 'crc-text-link'
	});
	schemasLink.addEventListener('click', (e) => {
		e.preventDefault();
		options.showTab('schemas');
	});

	// Cleanup Wizard button
	const wizardSection = quickStartContent.createDiv({ cls: 'crc-mt-3' });
	const wizardBtn = wizardSection.createEl('button', {
		cls: 'crc-btn crc-btn--primary'
	});
	const wizardIcon = wizardBtn.createSpan({ cls: 'crc-btn-icon' });
	setIcon(wizardIcon, 'sparkles');
	wizardBtn.createSpan({ text: 'Run Cleanup Wizard' });
	wizardBtn.addEventListener('click', () => {
		options.closeModal();
		void import('./cleanup-wizard-modal').then(({ CleanupWizardModal }) => {
			new CleanupWizardModal(app, plugin).open();
		});
	});

	container.appendChild(quickStartCard);

	// Research Needed Section (always show - independent of trackFactSourcing)
	renderResearchNeededSection(container, options);

	// Research Gaps Section (only when fact-level tracking is enabled)
	if (plugin.settings.trackFactSourcing) {
		renderResearchGapsSection(container, options);

		// Source Conflicts Section
		renderSourceConflictsSection(container, options);
	}

	// === VAULT-WIDE ANALYSIS ===
	const analysisCard = options.createCard({
		title: 'Vault-wide analysis',
		icon: 'search',
		subtitle: 'Comprehensive data quality report across all entities'
	});
	const analysisContent = analysisCard.querySelector('.crc-card__content') as HTMLElement;

	// Explanation
	const analysisExplanation = analysisContent.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	analysisExplanation.createEl('p', {
		text: 'Scan your genealogy data to identify data issues like missing dates, invalid values, ' +
			'circular relationships, and orphaned parent references.',
		cls: 'crc-text--small'
	});

	let selectedScope: 'all' | 'staging' | 'folder' = 'all';
	const selectedFolder = '';

	new Setting(analysisContent)
		.setName('Analysis scope')
		.setDesc('Choose which records to analyze')
		.addDropdown(dropdown => dropdown
			.addOption('all', 'All records (main tree)')
			.addOption('staging', 'Staging folder only')
			.setValue(selectedScope)
			.onChange(value => {
				selectedScope = value as 'all' | 'staging' | 'folder';
			})
		);

	// Results container (initially empty)
	const resultsContainer = analysisContent.createDiv({ cls: 'crc-data-quality-results' });

	// Run analysis button
	new Setting(analysisContent)
		.setName('Run analysis')
		.setDesc('Scan records for data quality issues')
		.addButton(button => button
			.setButtonText('Analyze')
			.setCta()
			.onClick(() => {
				runDataQualityAnalysis(resultsContainer, selectedScope, selectedFolder, options);
			}));

	addDataQualityDockButton(analysisCard, plugin);
	container.appendChild(analysisCard);

	// === CROSS-DOMAIN BATCH OPERATIONS ===
	const batchCard = options.createCard({
		title: 'Cross-domain batch operations',
		icon: 'zap',
		subtitle: 'Standardization operations across all entity types'
	});
	const batchContent = batchCard.querySelector('.crc-card__content') as HTMLElement;

	// Explanation
	const batchExplanation = batchContent.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	batchExplanation.createEl('p', {
		text: 'These operations work across people, places, events, and sources. Use Preview to see what will change before applying. For entity-specific operations, see the domain tabs (People, Places, etc.).',
		cls: 'crc-text--small'
	});

	// Normalize dates
	new Setting(batchContent)
		.setName('Normalize date formats')
		.setDesc('Convert dates to standard YYYY-MM-DD format')
		.addButton(btn => btn
			.setButtonText('Preview')
			.onClick(() => {
				void previewBatchOperation('dates', selectedScope, selectedFolder, options);
			})
		)
		.addButton(btn => btn
			.setButtonText('Apply')
			.setCta()
			.onClick(() => void runBatchOperation('dates', selectedScope, selectedFolder, options))
		);

	// Normalize sex
	new Setting(batchContent)
		.setName('Normalize sex values')
		.setDesc('Standardize to M/F format. Uses biological sex to match historical records and GEDCOM standards.')
		.addButton(btn => btn
			.setButtonText('Preview')
			.onClick(() => void previewBatchOperation('sex', selectedScope, selectedFolder, options))
		)
		.addButton(btn => btn
			.setButtonText('Apply')
			.setCta()
			.onClick(() => void runBatchOperation('sex', selectedScope, selectedFolder, options))
		);

	// Clear orphan references
	new Setting(batchContent)
		.setName('Clear orphan references')
		.setDesc('Remove parent references that point to non-existent records')
		.addButton(btn => btn
			.setButtonText('Preview')
			.onClick(() => void previewBatchOperation('orphans', selectedScope, selectedFolder, options))
		)
		.addButton(btn => btn
			.setButtonText('Apply')
			.setWarning()
			.onClick(() => void runBatchOperation('orphans', selectedScope, selectedFolder, options))
		);

	// Repair missing relationship IDs
	new Setting(batchContent)
		.setName('Repair missing relationship IDs')
		.setDesc('Populate _id fields from resolvable wikilinks (e.g., father_id from father)')
		.addButton(btn => btn
			.setButtonText('Preview')
			.onClick(() => void previewBatchOperation('missing_ids', selectedScope, selectedFolder, options))
		)
		.addButton(btn => btn
			.setButtonText('Apply')
			.setCta()
			.onClick(() => void runBatchOperation('missing_ids', selectedScope, selectedFolder, options))
		);

	// Migrate legacy type property (only show if cr_type is the primary)
	if (plugin.settings.noteTypeDetection?.primaryTypeProperty === 'cr_type') {
		new Setting(batchContent)
			.setName('Migrate legacy type property')
			.setDesc('Convert type to cr_type for all Charted Roots notes')
			.addButton(btn => btn
				.setButtonText('Preview')
				.onClick(() => void previewBatchOperation('legacy_type', selectedScope, selectedFolder, options))
			)
			.addButton(btn => btn
				.setButtonText('Apply')
				.setCta()
				.onClick(() => void runBatchOperation('legacy_type', selectedScope, selectedFolder, options))
			);
	}

	// Flatten nested properties
	new Setting(batchContent)
		.setName('Flatten nested properties')
		.setDesc('Convert nested YAML (e.g., coordinates: { lat, long }) to flat properties')
		.addButton(btn => btn
			.setButtonText('Open')
			.setCta()
			.onClick(() => {
				new FlattenNestedPropertiesModal(app).open();
			})
		);

	container.appendChild(batchCard);

	// === DATA ENHANCEMENT ===
	// Data Enhancement card
	const enhancementCard = options.createCard({
		title: 'Data enhancement',
		icon: 'sparkles',
		subtitle: 'Create missing notes from existing data'
	});
	const enhancementContent = enhancementCard.querySelector('.crc-card__content') as HTMLElement;

	// Explanation
	const enhancementExplanation = enhancementContent.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	enhancementExplanation.createEl('p', {
		text: 'Enhance your notes by generating place notes from place strings in person and event notes. ' +
			'Useful for data imported from CSV, manually entered records, or vaults created before place notes were supported.',
		cls: 'crc-text--small'
	});

	// Generate place notes
	new Setting(enhancementContent)
		.setName('Generate place notes')
		.setDesc('Create place notes from place strings and update references to use wikilinks')
		.addButton(btn => btn
			.setButtonText('Open')
			.setCta()
			.onClick(() => {
				const placeGraph = new PlaceGraphService(app);
				new PlaceGeneratorModal(app, plugin.settings, {}, placeGraph).open();
			})
		);

	container.appendChild(enhancementCard);

	// Data Tools card
	const toolsCard = options.createCard({
		title: 'Data tools',
		icon: 'sliders',
		subtitle: 'Utility tools for managing your data'
	});
	const toolsContent = toolsCard.querySelector('.crc-card__content') as HTMLElement;

	// Explanation
	const toolsExplanation = toolsContent.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	toolsExplanation.createEl('p', {
		text: 'Create Obsidian Bases to view and manage your data in spreadsheet-like table views.',
		cls: 'crc-text--small'
	});

	const baseTypes = [
		{ value: 'people', label: 'People', command: 'charted-roots:create-base-template' },
		{ value: 'places', label: 'Places', command: 'charted-roots:create-places-base-template' },
		{ value: 'events', label: 'Events', command: 'charted-roots:create-events-base-template' },
		{ value: 'organizations', label: 'Organizations', command: 'charted-roots:create-organizations-base-template' },
		{ value: 'sources', label: 'Sources', command: 'charted-roots:create-sources-base-template' },
		{ value: 'universes', label: 'Universes', command: 'charted-roots:create-universes-base-template' }
	];

	let selectedBaseType = baseTypes[0];

	new Setting(toolsContent)
		.setName('Create base')
		.setDesc('Create an Obsidian Base for managing your data in table view')
		.addDropdown(dropdown => dropdown
			.addOptions(Object.fromEntries(baseTypes.map(t => [t.value, t.label])))
			.setValue(selectedBaseType.value)
			.onChange(value => {
				selectedBaseType = baseTypes.find(t => t.value === value) || baseTypes[0];
			})
		)
		.addButton(btn => btn
			.setButtonText('Create')
			.setCta()
			.onClick(() => {
				options.closeModal();
				app.commands.executeCommandById(selectedBaseType.command);
			})
		);

	// Bulk media linking
	new Setting(toolsContent)
		.setName('Bulk link media')
		.setDesc('Link media files to multiple entities (people, events, places, etc.) at once')
		.addButton(btn => btn
			.setButtonText('Open')
			.onClick(() => {
				new BulkMediaLinkModal(app, plugin).open();
			})
		);

	container.appendChild(toolsCard);
}

// ---------------------------------------------------------------------------
// Research Needed Section
// ---------------------------------------------------------------------------

interface ResearchNeededItem {
	name: string;
	file: TFile;
	type: 'person' | 'event' | 'place';
	questions: string[];
}

function renderResearchNeededSection(container: HTMLElement, options: DataQualityTabOptions): void {
	const { plugin, app } = options;

	// Query all entities with needs_research property
	const items: ResearchNeededItem[] = [];

	// Query people
	const familyGraph = options.getCachedFamilyGraph();
	const allPeople = familyGraph.getAllPeople();
	for (const person of allPeople) {
		const cache = app.metadataCache.getFileCache(person.file);
		const questions = cache?.frontmatter?.needs_research;
		if (Array.isArray(questions) && questions.length > 0) {
			items.push({
				name: person.name,
				file: person.file,
				type: 'person',
				questions: questions.map(String)
			});
		}
	}

	// Query events
	const eventService = new EventService(app, plugin.settings);
	const allEvents = eventService.getAllEvents();
	for (const event of allEvents) {
		const cache = app.metadataCache.getFileCache(event.file);
		const questions = cache?.frontmatter?.needs_research;
		if (Array.isArray(questions) && questions.length > 0) {
			items.push({
				name: event.title,
				file: event.file,
				type: 'event',
				questions: questions.map(String)
			});
		}
	}

	// Query places
	const placeGraph = new PlaceGraphService(app);
	const allPlaces = placeGraph.getAllPlaces();
	for (const place of allPlaces) {
		const cache = app.metadataCache.getFileCache(place.file);
		const questions = cache?.frontmatter?.needs_research;
		if (Array.isArray(questions) && questions.length > 0) {
			items.push({
				name: place.name,
				file: place.file,
				type: 'place',
				questions: questions.map(String)
			});
		}
	}

	// Don't render card if no items
	if (items.length === 0) {
		return;
	}

	// Create card
	const card = options.createCard({
		title: 'Research needed',
		icon: 'help-circle',
		subtitle: 'Entities flagged for additional research'
	});
	const section = card.querySelector('.crc-card__content') as HTMLElement;
	section.addClass('crc-research-needed-section');

	// Summary stats
	const statsRow = section.createDiv({ cls: 'crc-schema-summary-row' });

	// Total entities
	const totalStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
	setIcon(totalStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'flag');
	totalStat.createSpan({
		text: `${items.length} entities`,
		cls: 'crc-schema-stat-text'
	});

	// Total questions
	const totalQuestions = items.reduce((sum, item) => sum + item.questions.length, 0);
	const questionsStat = statsRow.createDiv({ cls: 'crc-schema-stat crc-schema-stat-warning' });
	setIcon(questionsStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'help-circle');
	questionsStat.createSpan({
		text: `${totalQuestions} questions`,
		cls: 'crc-schema-stat-text'
	});

	// Count by type
	const personCount = items.filter(i => i.type === 'person').length;
	const eventCount = items.filter(i => i.type === 'event').length;
	const placeCount = items.filter(i => i.type === 'place').length;

	if (personCount > 0) {
		const personStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
		setIcon(personStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'user');
		personStat.createSpan({
			text: `${personCount} people`,
			cls: 'crc-schema-stat-text'
		});
	}
	if (eventCount > 0) {
		const eventStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
		setIcon(eventStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'calendar');
		eventStat.createSpan({
			text: `${eventCount} events`,
			cls: 'crc-schema-stat-text'
		});
	}
	if (placeCount > 0) {
		const placeStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
		setIcon(placeStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'map-pin');
		placeStat.createSpan({
			text: `${placeCount} places`,
			cls: 'crc-schema-stat-text'
		});
	}

	// List of items
	const list = section.createDiv({ cls: 'crc-research-needed-list' });

	for (const item of items) {
		const itemEl = list.createDiv({ cls: 'crc-research-needed-item' });

		// Icon by type
		const iconEl = itemEl.createSpan({ cls: 'crc-research-needed-icon' });
		const iconName = item.type === 'person' ? 'user' : item.type === 'event' ? 'calendar' : 'map-pin';
		setIcon(iconEl, iconName);

		// Content
		const contentEl = itemEl.createDiv({ cls: 'crc-research-needed-content' });

		// Clickable name
		const nameLink = contentEl.createEl('a', {
			text: item.name,
			cls: 'crc-link',
			href: '#'
		});
		nameLink.addEventListener('click', (e) => {
			e.preventDefault();
			options.closeModal();
			void app.workspace.openLinkText(item.file.path, '', false);
		});

		// Questions as badges
		const questionsEl = contentEl.createDiv({ cls: 'crc-research-needed-questions' });
		for (const question of item.questions) {
			const badge = questionsEl.createSpan({
				cls: 'crc-research-needed-question',
				text: question
			});
			badge.setAttribute('title', question);
		}
	}

	container.appendChild(card);
}

// ---------------------------------------------------------------------------
// Research Gaps Section
// ---------------------------------------------------------------------------

function renderResearchGapsSection(container: HTMLElement, options: DataQualityTabOptions): void {
	const { plugin, app } = options;

	// Create card for Research Gaps
	const card = options.createCard({
		title: 'Research gaps',
		icon: 'search',
		subtitle: 'Track unsourced and weakly sourced facts'
	});
	const section = card.querySelector('.crc-card__content') as HTMLElement;
	section.addClass('crc-research-gaps-section');

	// Explanation
	const explanation = section.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	explanation.createEl('p', {
		text: 'Identify facts that need sources or stronger evidence. Focus research efforts on gaps in your documentation.',
		cls: 'crc-text--small'
	});

	// Header actions
	const header = section.createDiv({ cls: 'crc-section-header' });

	const headerActions = header.createDiv({ cls: 'crc-section-header-actions' });

	// Export button
	const exportBtn = headerActions.createEl('button', {
		cls: 'crc-icon-button',
		attr: { 'aria-label': 'Export research gaps to CSV' }
	});
	setIcon(exportBtn, 'download');
	exportBtn.addEventListener('click', () => {
		exportResearchGapsToCSV(app, plugin);
	});

	const sourcesLink = headerActions.createEl('button', {
		cls: 'crc-link-button',
		text: 'Open sources tab'
	});
	setIcon(sourcesLink.createSpan({ cls: 'crc-button-icon-right' }), 'external-link');
	sourcesLink.addEventListener('click', () => {
		options.showTab('sources');
	});

	// Get research gaps data
	const evidenceService = new EvidenceService(app, plugin.settings);
	const gaps = evidenceService.getResearchGaps(10);

	// Summary stats
	const statsRow = section.createDiv({ cls: 'crc-schema-summary-row' });

	// People tracked
	const trackedStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
	setIcon(trackedStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'users');
	trackedStat.createSpan({
		text: `${gaps.totalPeopleTracked} tracked`,
		cls: 'crc-schema-stat-text'
	});

	// Count total unsourced
	const totalUnsourced = Object.values(gaps.unsourcedByFact).reduce((a, b) => a + b, 0);
	const unsourcedStat = statsRow.createDiv({ cls: 'crc-schema-stat crc-schema-stat-warning' });
	setIcon(unsourcedStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'alert-triangle');
	unsourcedStat.createSpan({
		text: `${totalUnsourced} unsourced facts`,
		cls: 'crc-schema-stat-text'
	});

	// Count weakly sourced
	const totalWeakly = Object.values(gaps.weaklySourcedByFact).reduce((a, b) => a + b, 0);
	const weaklyStat = statsRow.createDiv({ cls: 'crc-schema-stat crc-schema-stat-info' });
	setIcon(weaklyStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'info');
	weaklyStat.createSpan({
		text: `${totalWeakly} weakly sourced`,
		cls: 'crc-schema-stat-text'
	});

	// Quality filter dropdown
	const filterRow = section.createDiv({ cls: 'crc-filter-row' });
	filterRow.createSpan({ text: 'Filter by:', cls: 'crc-filter-label' });
	const qualityFilter = filterRow.createEl('select', { cls: 'dropdown crc-filter-select' });
	qualityFilter.createEl('option', { value: 'all', text: 'All research gaps' });
	qualityFilter.createEl('option', { value: 'unsourced', text: 'Unsourced only' });
	qualityFilter.createEl('option', { value: 'weakly-sourced', text: 'Weakly sourced only' });
	qualityFilter.createEl('option', { value: 'needs-primary', text: 'Needs primary source' });

	// Store current filter state
	let currentQualityFilter = 'all';

	// Re-render function for when filter changes
	const rerenderBreakdown = (): void => {
		// Remove existing breakdown and people sections
		section.querySelectorAll('.crc-research-gaps-breakdown, .crc-research-gaps-lowest').forEach(el => el.remove());

		// Filter data based on selection
		const filteredGaps = filterResearchGapsByQuality(gaps, currentQualityFilter);

		// Render breakdown
		renderResearchGapsBreakdown(section, filteredGaps, currentQualityFilter);

		// Render lowest coverage people
		renderLowestCoveragePeople(section, filteredGaps.lowestCoverage, evidenceService, currentQualityFilter, app);
	};

	qualityFilter.addEventListener('change', () => {
		currentQualityFilter = qualityFilter.value;
		rerenderBreakdown();
	});

	// If no tracking data, show empty state
	if (gaps.totalPeopleTracked === 0 && gaps.totalPeopleUntracked > 0) {
		const emptyState = section.createDiv({ cls: 'crc-empty-state crc-compact' });
		setIcon(emptyState.createSpan({ cls: 'crc-empty-icon' }), 'file-search');
		emptyState.createEl('p', {
			text: `No fact-level source tracking data found. Add sourced_* properties to your person notes to track research coverage.`
		});
		container.appendChild(card);
		return;
	}

	// Render initial breakdown and people list
	renderResearchGapsBreakdown(section, gaps, 'all');
	renderLowestCoveragePeople(section, gaps.lowestCoverage, evidenceService, 'all', app);

	container.appendChild(card);
}

// ---------------------------------------------------------------------------
// Source Conflicts Section
// ---------------------------------------------------------------------------

function renderSourceConflictsSection(container: HTMLElement, options: DataQualityTabOptions): void {
	const { plugin, app } = options;

	const proofService = new ProofSummaryService(app, plugin.settings);
	if (plugin.personIndex) {
		proofService.setPersonIndex(plugin.personIndex);
	}
	const conflictedProofs = proofService.getProofsByStatus('conflicted');

	// Create card for Source Conflicts
	const card = options.createCard({
		title: 'Source conflicts',
		icon: 'scale',
		subtitle: 'Resolve conflicting evidence in your research'
	});
	const section = card.querySelector('.crc-card__content') as HTMLElement;
	section.addClass('crc-conflicts-section');

	// Explanation
	const explanation = section.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	explanation.createEl('p', {
		text: 'Track and resolve cases where multiple sources provide conflicting information about the same fact.',
		cls: 'crc-text--small'
	});

	// Summary stats
	const statsRow = section.createDiv({ cls: 'crc-schema-summary-row' });

	// Count of conflicted proofs
	const conflictStat = statsRow.createDiv({
		cls: `crc-schema-stat ${conflictedProofs.length > 0 ? 'crc-schema-stat-warning' : ''}`
	});
	const conflictIcon = conflictStat.createSpan({ cls: 'crc-schema-stat-icon' });
	setIcon(conflictIcon, conflictedProofs.length > 0 ? 'alert-triangle' : 'check');
	conflictStat.createSpan({
		text: `${conflictedProofs.length} unresolved conflict${conflictedProofs.length !== 1 ? 's' : ''}`,
		cls: 'crc-schema-stat-text'
	});

	// Total proofs
	const allProofs = proofService.getAllProofs();
	const proofStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
	const proofIcon = proofStat.createSpan({ cls: 'crc-schema-stat-icon' });
	setIcon(proofIcon, 'scale');
	proofStat.createSpan({
		text: `${allProofs.length} proof summar${allProofs.length !== 1 ? 'ies' : 'y'}`,
		cls: 'crc-schema-stat-text'
	});

	// Empty state if no proofs
	if (allProofs.length === 0) {
		const emptyState = section.createDiv({ cls: 'crc-empty-state crc-compact' });
		const emptyIcon = emptyState.createSpan({ cls: 'crc-empty-icon' });
		setIcon(emptyIcon, 'scale');
		emptyState.createEl('p', {
			text: 'No proof summaries created yet. Use proof summaries to document your research reasoning and resolve conflicting evidence.'
		});

		// Buttons container
		const buttonRow = emptyState.createDiv({ cls: 'crc-empty-state-buttons' });

		// Create proof button
		const createBtn = buttonRow.createEl('button', {
			cls: 'crc-btn crc-btn--primary',
			text: 'Create proof summary'
		});
		createBtn.addEventListener('click', () => {
			new CreateProofModal(app, plugin, {
				onSuccess: () => {
					renderDataQualityTab(options);
				}
			}).open();
		});

		// View templates button
		const templateBtn = buttonRow.createEl('button', {
			cls: 'crc-btn',
			text: 'View templates'
		});
		const templateIcon = createLucideIcon('file-code', 14);
		templateBtn.insertBefore(templateIcon, templateBtn.firstChild);
		templateBtn.addEventListener('click', () => {
			new TemplateSnippetsModal(app, 'proof', plugin.settings.propertyAliases).open();
		});

		container.appendChild(card);
		return;
	}

	// If no conflicts, show success state
	if (conflictedProofs.length === 0) {
		const successState = section.createDiv({ cls: 'crc-dq-no-issues' });
		const successIcon = successState.createDiv({ cls: 'crc-dq-no-issues-icon' });
		setIcon(successIcon, 'check');
		successState.createSpan({ text: 'No unresolved source conflicts' });
		container.appendChild(card);
		return;
	}

	// Show conflicted proofs
	const conflictList = section.createDiv({ cls: 'crc-conflicts-list' });

	for (const proof of conflictedProofs) {
		renderConflictItem(conflictList, proof, app);
	}

	container.appendChild(card);
}

// ---------------------------------------------------------------------------
// Conflict Item Rendering
// ---------------------------------------------------------------------------

function renderConflictItem(container: HTMLElement, proof: ProofSummaryNote, app: App): void {
	const item = container.createDiv({ cls: 'crc-conflict-item' });

	// Header with alert icon
	const header = item.createDiv({ cls: 'crc-conflict-item-header' });
	const alertIcon = header.createSpan({ cls: 'crc-conflict-icon' });
	setIcon(alertIcon, 'alert-triangle');

	// Title (clickable)
	const title = header.createSpan({ cls: 'crc-conflict-title', text: proof.title });
	title.addEventListener('click', () => {
		void app.workspace.openLinkText(proof.filePath, '', true);
	});

	// Fact type badge
	header.createSpan({
		cls: 'crc-proof-badge',
		text: FACT_KEY_LABELS[proof.factType]
	});

	// Subject person
	const personRow = item.createDiv({ cls: 'crc-conflict-person' });
	const personIcon = personRow.createSpan();
	setIcon(personIcon, 'user');
	personRow.createSpan({ text: proof.subjectPerson.replace(/\[\[|\]\]/g, '') });

	// Conflicting evidence
	const evidenceSection = item.createDiv({ cls: 'crc-conflict-evidence' });
	evidenceSection.createSpan({ cls: 'crc-conflict-evidence-label', text: 'Conflicting evidence:' });

	const evidenceList = evidenceSection.createDiv({ cls: 'crc-conflict-evidence-list' });

	for (const ev of proof.evidence) {
		const evItem = evidenceList.createDiv({
			cls: `crc-conflict-evidence-item ${ev.supports === 'conflicts' ? 'crc-conflict-evidence-item--conflicts' : ''}`
		});

		// Support indicator
		const supportIcon = evItem.createSpan({ cls: 'crc-conflict-support-icon' });
		if (ev.supports === 'conflicts') {
			setIcon(supportIcon, 'x');
		} else {
			setIcon(supportIcon, 'check');
		}

		// Source name
		evItem.createSpan({
			cls: 'crc-conflict-source',
			text: ev.source.replace(/\[\[|\]\]/g, '')
		});

		// Information (claim)
		if (ev.information) {
			evItem.createSpan({
				cls: 'crc-conflict-claim',
				text: `: "${ev.information}"`
			});
		}
	}

	// Resolve button
	const actions = item.createDiv({ cls: 'crc-conflict-actions' });
	const resolveBtn = actions.createEl('button', {
		cls: 'crc-btn crc-btn--small',
		text: 'Open to resolve'
	});
	resolveBtn.addEventListener('click', () => {
		void app.workspace.openLinkText(proof.filePath, '', true);
	});
}

// ---------------------------------------------------------------------------
// Research Gaps helpers
// ---------------------------------------------------------------------------

function filterResearchGapsByQuality(
	gaps: ResearchGapsSummary,
	filter: string
): ResearchGapsSummary {
	if (filter === 'all') {
		return gaps;
	}

	// Create filtered copy
	const filtered: ResearchGapsSummary = {
		totalPeopleTracked: gaps.totalPeopleTracked,
		totalPeopleUntracked: gaps.totalPeopleUntracked,
		unsourcedByFact: { ...gaps.unsourcedByFact },
		weaklySourcedByFact: { ...gaps.weaklySourcedByFact },
		lowestCoverage: []
	};

	// Filter the people list based on selected criteria
	for (const person of gaps.lowestCoverage) {
		const hasMatchingGap = person.facts.some(fact => {
			switch (filter) {
				case 'unsourced':
					return fact.status === 'unsourced';
				case 'weakly-sourced':
					return fact.status === 'weakly-sourced';
				case 'needs-primary':
					// Any fact that doesn't have a primary source
					return fact.bestQuality !== 'primary';
				default:
					return true;
			}
		});

		if (hasMatchingGap) {
			filtered.lowestCoverage.push(person);
		}
	}

	return filtered;
}

function renderResearchGapsBreakdown(
	container: HTMLElement,
	gaps: ResearchGapsSummary,
	filter: string
): void {
	// Determine which counts to show based on filter
	let factCounts: Record<FactKey, number>;
	let title: string;

	switch (filter) {
		case 'unsourced':
			factCounts = gaps.unsourcedByFact;
			title = 'Unsourced facts by type';
			break;
		case 'weakly-sourced':
			factCounts = gaps.weaklySourcedByFact;
			title = 'Weakly sourced facts by type';
			break;
		case 'needs-primary':
			// Combine unsourced + weakly sourced for "needs primary"
			factCounts = {} as Record<FactKey, number>;
			for (const key of FACT_KEYS) {
				factCounts[key] = (gaps.unsourcedByFact[key] || 0) + (gaps.weaklySourcedByFact[key] || 0);
			}
			title = 'Facts needing primary sources';
			break;
		default: // 'all'
			factCounts = gaps.unsourcedByFact;
			title = 'Unsourced facts by type';
	}

	const totalCount = Object.values(factCounts).reduce((a, b) => a + b, 0);
	if (totalCount === 0) return;

	const breakdownSection = container.createDiv({ cls: 'crc-research-gaps-breakdown' });
	breakdownSection.createEl('h4', { text: title, cls: 'crc-section-subtitle' });

	const grid = breakdownSection.createDiv({ cls: 'crc-schema-error-grid' });

	// Sort by count descending
	const sortedFacts = (Object.entries(factCounts) as [FactKey, number][])
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1]);

	for (const [factKey, count] of sortedFacts) {
		const item = grid.createDiv({ cls: 'crc-schema-error-item' });
		item.createSpan({ text: FACT_KEY_LABELS[factKey], cls: 'crc-schema-error-label' });
		item.createSpan({ text: String(count), cls: 'crc-schema-error-count' });
	}
}

function renderLowestCoveragePeople(
	container: HTMLElement,
	people: PersonResearchCoverage[],
	_evidenceService: EvidenceService,
	filter: string,
	app: App
): void {
	if (people.length === 0) {
		const emptySection = container.createDiv({ cls: 'crc-research-gaps-lowest' });
		emptySection.createEl('p', {
			text: `No people match the "${filter}" filter.`,
			cls: 'crc-text--muted'
		});
		return;
	}

	const lowestSection = container.createDiv({ cls: 'crc-research-gaps-lowest' });
	lowestSection.createEl('h4', { text: 'Lowest research coverage', cls: 'crc-section-subtitle' });

	const list = lowestSection.createDiv({ cls: 'crc-research-gaps-list' });

	for (const person of people.slice(0, 5)) {
		const item = list.createDiv({ cls: 'crc-research-gaps-person' });

		// Progress bar
		const progressBar = item.createDiv({ cls: 'crc-progress-bar crc-progress-bar--small' });
		const progressFill = progressBar.createDiv({ cls: 'crc-progress-bar__fill' });
		progressFill.style.setProperty('width', `${person.coveragePercent}%`);

		// Adjust color based on coverage
		if (person.coveragePercent < 25) {
			progressFill.addClass('crc-progress-bar__fill--danger');
		} else if (person.coveragePercent < 50) {
			progressFill.addClass('crc-progress-bar__fill--warning');
		}

		// Name and stats
		const info = item.createDiv({ cls: 'crc-research-gaps-info' });
		const nameLink = info.createEl('a', {
			text: person.personName,
			cls: 'crc-link',
			href: '#'
		});
		nameLink.addEventListener('click', (e) => {
			e.preventDefault();
			const file = app.vault.getAbstractFileByPath(person.filePath);
			if (file instanceof TFile) {
				void app.workspace.openLinkText(file.path, '', false);
			}
		});

		info.createSpan({
			text: `${person.coveragePercent}% (${person.sourcedFactCount}/${person.totalFactCount} facts)`,
			cls: 'crc-text-muted crc-text-small'
		});
	}
}

function exportResearchGapsToCSV(app: App, plugin: CanvasRootsPlugin): void {
	const evidenceService = new EvidenceService(app, plugin.settings);
	const gaps = evidenceService.getResearchGaps(1000); // Get all, not just top 10

	if (gaps.lowestCoverage.length === 0) {
		new Notice('No research coverage data to export');
		return;
	}

	// Build CSV with headers
	const headers = ['Name', 'File Path', 'Coverage %', 'Sourced Facts', 'Total Facts', ...FACT_KEYS.map(k => FACT_KEY_LABELS[k])];
	const rows: string[][] = [];

	for (const person of gaps.lowestCoverage) {
		const row: string[] = [
			`"${person.personName.replace(/"/g, '""')}"`,
			`"${person.filePath.replace(/"/g, '""')}"`,
			String(person.coveragePercent),
			String(person.sourcedFactCount),
			String(person.totalFactCount)
		];

		// Add status for each fact type
		for (const factKey of FACT_KEYS) {
			const fact = person.facts.find(f => f.factKey === factKey);
			if (fact) {
				row.push(fact.status);
			} else {
				row.push('unsourced');
			}
		}

		rows.push(row);
	}

	const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

	void navigator.clipboard.writeText(csv).then(() => {
		new Notice(`Research gaps exported: ${gaps.lowestCoverage.length} people copied to clipboard as CSV`);
	}).catch(() => {
		new Notice('Failed to copy to clipboard');
	});
}

// ---------------------------------------------------------------------------
// Vault-wide analysis
// ---------------------------------------------------------------------------

function runDataQualityAnalysis(
	container: HTMLElement,
	scope: 'all' | 'staging' | 'folder',
	folderPath: string | undefined,
	options: DataQualityTabOptions
): void {
	const { plugin, app } = options;
	container.empty();

	// Show loading
	const loadingEl = container.createDiv({ cls: 'crc-loading' });
	loadingEl.createSpan({ text: 'Analyzing data quality...' });

	// Create service and run analysis
	const familyGraph = new FamilyGraphService(app);
	const folderFilter = new FolderFilterService(plugin.settings);
	familyGraph.setFolderFilter(folderFilter);
	familyGraph.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph.setValueAliases(plugin.settings.valueAliases);

	const dataQualityService = new DataQualityService(
		app,
		plugin.settings,
		familyGraph,
		folderFilter,
		plugin
	);
	if (plugin.personIndex) {
		dataQualityService.setPersonIndex(plugin.personIndex);
	}

	// Run analysis (synchronous)
	const report = dataQualityService.analyze({
		scope,
		folderPath,
	});

	// Clear loading and show results
	container.empty();
	renderDataQualityReport(container, report, options);
}

function renderDataQualityReport(
	container: HTMLElement,
	report: DataQualityReport,
	options: DataQualityTabOptions
): void {
	const { summary, issues } = report;

	// Summary section
	const summarySection = container.createDiv({ cls: 'crc-dq-summary' });

	// Quality score
	const scoreEl = summarySection.createDiv({ cls: 'crc-dq-score' });
	const scoreValue = scoreEl.createDiv({ cls: 'crc-dq-score-value' });
	scoreValue.setText(String(summary.qualityScore));

	// Color based on score
	if (summary.qualityScore >= 80) {
		scoreValue.addClass('crc-dq-score--good');
	} else if (summary.qualityScore >= 50) {
		scoreValue.addClass('crc-dq-score--warning');
	} else {
		scoreValue.addClass('crc-dq-score--poor');
	}

	scoreEl.createDiv({ cls: 'crc-dq-score-label', text: 'Quality score' });

	// Stats grid
	const statsGrid = summarySection.createDiv({ cls: 'crc-dq-stats-grid' });

	renderDqStatCard(statsGrid, 'People analyzed', String(summary.totalPeople), 'users');
	renderDqStatCard(statsGrid, 'Total issues', String(summary.totalIssues), 'alert-circle');
	renderDqStatCard(statsGrid, 'Errors', String(summary.bySeverity.error), 'alert-triangle');
	renderDqStatCard(statsGrid, 'Warnings', String(summary.bySeverity.warning), 'alert-circle');

	// Completeness metrics
	const completenessSection = container.createDiv({ cls: 'crc-section' });
	completenessSection.createEl('h3', { text: 'Data completeness' });

	const completenessGrid = completenessSection.createDiv({ cls: 'crc-dq-completeness-grid' });

	const total = summary.totalPeople || 1; // Avoid division by zero
	renderCompletenessBar(completenessGrid, 'Birth date', summary.completeness.withBirthDate, total);
	renderCompletenessBar(completenessGrid, 'Death date', summary.completeness.withDeathDate, total);
	renderCompletenessBar(completenessGrid, 'Gender', summary.completeness.withGender, total);
	renderCompletenessBar(completenessGrid, 'Both parents', summary.completeness.withBothParents, total);
	renderCompletenessBar(completenessGrid, 'At least one parent', summary.completeness.withAtLeastOneParent, total);
	renderCompletenessBar(completenessGrid, 'Has spouse', summary.completeness.withSpouse, total);
	renderCompletenessBar(completenessGrid, 'Has children', summary.completeness.withChildren, total);

	// Issues by category
	if (issues.length > 0) {
		const issuesSection = container.createDiv({ cls: 'crc-section' });
		issuesSection.createEl('h3', { text: 'Issues found' });

		// Category filter
		const filterRow = issuesSection.createDiv({ cls: 'crc-dq-filter-row' });
		let selectedCategory: IssueCategory | 'all' = 'all';
		let selectedSeverity: IssueSeverity | 'all' = 'all';

		new Setting(filterRow)
			.setName('Category')
			.addDropdown(dropdown => dropdown
				.addOption('all', 'All categories')
				.addOption('date_inconsistency', 'Date issues')
				.addOption('relationship_inconsistency', 'Relationship issues')
				.addOption('missing_data', 'Missing data')
				.addOption('data_format', 'Format issues')
				.addOption('orphan_reference', 'Orphan references')
				.addOption('nested_property', 'Nested properties')
				.setValue(selectedCategory)
				.onChange(value => {
					selectedCategory = value as IssueCategory | 'all';
					renderIssuesList(issuesList, issues, selectedCategory, selectedSeverity, options);
				})
			);

		new Setting(filterRow)
			.setName('Severity')
			.addDropdown(dropdown => dropdown
				.addOption('all', 'All severities')
				.addOption('error', 'Errors only')
				.addOption('warning', 'Warnings only')
				.addOption('info', 'Info only')
				.setValue(selectedSeverity)
				.onChange(value => {
					selectedSeverity = value as IssueSeverity | 'all';
					renderIssuesList(issuesList, issues, selectedCategory, selectedSeverity, options);
				})
			);

		const issuesList = issuesSection.createDiv({ cls: 'crc-dq-issues-list' });
		renderIssuesList(issuesList, issues, selectedCategory, selectedSeverity, options);
	} else {
		const noIssuesEl = container.createDiv({ cls: 'crc-dq-no-issues' });
		setIcon(noIssuesEl.createSpan({ cls: 'crc-dq-no-issues-icon' }), 'check');
		noIssuesEl.createSpan({ text: 'No issues found! Your data looks great.' });
	}
}

function renderDqStatCard(
	container: HTMLElement,
	label: string,
	value: string,
	icon: LucideIconName
): void {
	const card = container.createDiv({ cls: 'crc-dq-stat-card' });
	const iconEl = card.createDiv({ cls: 'crc-dq-stat-icon' });
	setIcon(iconEl, icon);
	card.createDiv({ cls: 'crc-dq-stat-value', text: value });
	card.createDiv({ cls: 'crc-dq-stat-label', text: label });
}

function renderCompletenessBar(
	container: HTMLElement,
	label: string,
	count: number,
	total: number
): void {
	const percent = Math.round((count / total) * 100);
	const row = container.createDiv({ cls: 'crc-dq-completeness-row' });

	row.createDiv({ cls: 'crc-dq-completeness-label', text: label });

	const barContainer = row.createDiv({ cls: 'crc-dq-completeness-bar-container' });
	const bar = barContainer.createDiv({ cls: 'crc-dq-completeness-bar' });
	bar.style.setProperty('width', `${percent}%`);

	// Color based on percentage
	if (percent >= 80) {
		bar.addClass('crc-dq-completeness-bar--good');
	} else if (percent >= 50) {
		bar.addClass('crc-dq-completeness-bar--warning');
	} else {
		bar.addClass('crc-dq-completeness-bar--poor');
	}

	row.createDiv({ cls: 'crc-dq-completeness-value', text: `${count}/${total} (${percent}%)` });
}

function renderIssuesList(
	container: HTMLElement,
	issues: DataQualityIssue[],
	category: IssueCategory | 'all',
	severity: IssueSeverity | 'all',
	options: DataQualityTabOptions
): void {
	container.empty();

	const filtered = issues.filter(issue => {
		if (category !== 'all' && issue.category !== category) return false;
		if (severity !== 'all' && issue.severity !== severity) return false;
		return true;
	});

	if (filtered.length === 0) {
		container.createDiv({
			cls: 'crc-dq-no-matches',
			text: 'No issues match the selected filters.'
		});
		return;
	}

	// Show count
	container.createDiv({
		cls: 'crc-dq-issues-count',
		text: `Showing ${filtered.length} issue${filtered.length === 1 ? '' : 's'}`
	});

	// Render issues (limit to first 100 for performance)
	const displayIssues = filtered.slice(0, 100);
	for (const issue of displayIssues) {
		renderIssueItem(container, issue, options);
	}

	if (filtered.length > 100) {
		container.createDiv({
			cls: 'crc-dq-more-issues',
			text: `... and ${filtered.length - 100} more issues`
		});
	}
}

function renderIssueItem(container: HTMLElement, issue: DataQualityIssue, options: DataQualityTabOptions): void {
	const item = container.createDiv({ cls: `crc-dq-issue crc-dq-issue--${issue.severity}` });

	// Severity icon
	const iconEl = item.createDiv({ cls: 'crc-dq-issue-icon' });
	const iconName = issue.severity === 'error' ? 'alert-triangle' :
		issue.severity === 'warning' ? 'alert-circle' : 'info';
	setIcon(iconEl, iconName);

	// Content
	const content = item.createDiv({ cls: 'crc-dq-issue-content' });

	// Person name as clickable link
	const personLink = content.createEl('a', {
		cls: 'crc-dq-issue-person',
		text: issue.person.name
	});
	personLink.addEventListener('click', (e) => {
		e.preventDefault();
		// Open the person's file
		const file = issue.person.file;
		if (file) {
			void options.app.workspace.openLinkText(file.path, '', false);
			options.closeModal();
		}
	});

	// Issue message
	content.createDiv({ cls: 'crc-dq-issue-message', text: issue.message });

	// Category badge
	const badge = item.createDiv({ cls: 'crc-dq-issue-badge' });
	badge.setText(formatCategoryName(issue.category));
}

function formatCategoryName(category: IssueCategory): string {
	const names: Record<IssueCategory, string> = {
		date_inconsistency: 'Date',
		relationship_inconsistency: 'Relationship',
		missing_data: 'Missing data',
		data_format: 'Format',
		orphan_reference: 'Orphan ref',
		nested_property: 'Nested',
		legacy_type_property: 'Legacy type',
		legacy_membership: 'Legacy membership',
	};
	return names[category] || category;
}

// ---------------------------------------------------------------------------
// Dock button
// ---------------------------------------------------------------------------

function addDataQualityDockButton(card: HTMLElement, plugin: CanvasRootsPlugin): void {
	const header = card.querySelector('.crc-card__header');
	if (!header) return;

	const dockBtn = document.createElement('button');
	dockBtn.className = 'crc-card__dock-btn clickable-icon';
	dockBtn.setAttribute('aria-label', 'Open in sidebar');
	setIcon(dockBtn, 'panel-right');
	dockBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void plugin.activateDataQualityView();
	});
	header.appendChild(dockBtn);
}

// ---------------------------------------------------------------------------
// Dockable dashboard renderer
// ---------------------------------------------------------------------------

/**
 * Render a read-only Data Quality dashboard for the dockable view.
 *
 * Shows Research Gaps, Source Conflicts, and Vault-wide Analysis results.
 * Management features (batch ops, wizards, data tools) remain modal-only.
 */
export function renderDataQualityDashboard(options: DataQualityDashboardOptions): void {
	const { container, plugin } = options;
	const app = plugin.app;
	container.empty();

	let currentFilter: DataQualityFilter = options.initialFilter ?? 'all';
	let currentSearch = options.initialSearch ?? '';

	const notifyStateChange = (): void => {
		options.onStateChange?.(currentFilter, currentSearch);
	};

	// --- Section 1: Research Gaps (conditional) ---
	if (plugin.settings.trackFactSourcing) {
		const gapsSection = container.createDiv({ cls: 'cr-dqv-section' });
		gapsSection.createEl('h3', { text: 'Research gaps', cls: 'cr-dqv-section-title' });

		const evidenceService = new EvidenceService(app, plugin.settings);
		const gaps = evidenceService.getResearchGaps(10);

		if (gaps.totalPeopleTracked === 0 && gaps.totalPeopleUntracked > 0) {
			const emptyState = gapsSection.createDiv({ cls: 'crc-empty-state crc-compact' });
			setIcon(emptyState.createSpan({ cls: 'crc-empty-icon' }), 'file-search');
			emptyState.createEl('p', {
				text: 'No fact-level source tracking data found. Add sourced_* properties to your person notes to track research coverage.'
			});
		} else {
			// Summary stats
			const statsRow = gapsSection.createDiv({ cls: 'crc-schema-summary-row' });

			const trackedStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
			setIcon(trackedStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'users');
			trackedStat.createSpan({
				text: `${gaps.totalPeopleTracked} tracked`,
				cls: 'crc-schema-stat-text'
			});

			const totalUnsourced = Object.values(gaps.unsourcedByFact).reduce((a, b) => a + b, 0);
			const unsourcedStat = statsRow.createDiv({ cls: 'crc-schema-stat crc-schema-stat-warning' });
			setIcon(unsourcedStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'alert-triangle');
			unsourcedStat.createSpan({
				text: `${totalUnsourced} unsourced facts`,
				cls: 'crc-schema-stat-text'
			});

			const totalWeakly = Object.values(gaps.weaklySourcedByFact).reduce((a, b) => a + b, 0);
			const weaklyStat = statsRow.createDiv({ cls: 'crc-schema-stat crc-schema-stat-info' });
			setIcon(weaklyStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'info');
			weaklyStat.createSpan({
				text: `${totalWeakly} weakly sourced`,
				cls: 'crc-schema-stat-text'
			});

			// Breakdown and lowest coverage
			renderResearchGapsBreakdown(gapsSection, gaps, 'all');
			renderLowestCoveragePeople(gapsSection, gaps.lowestCoverage, evidenceService, 'all', app);
		}

		// --- Section 2: Source Conflicts (conditional, same gate) ---
		const conflictsSection = container.createDiv({ cls: 'cr-dqv-section' });
		conflictsSection.createEl('h3', { text: 'Source conflicts', cls: 'cr-dqv-section-title' });

		const proofService = new ProofSummaryService(app, plugin.settings);
		if (plugin.personIndex) {
			proofService.setPersonIndex(plugin.personIndex);
		}
		const conflictedProofs = proofService.getProofsByStatus('conflicted');
		const allProofs = proofService.getAllProofs();

		// Summary
		const conflictStatsRow = conflictsSection.createDiv({ cls: 'crc-schema-summary-row' });

		const conflictStat = conflictStatsRow.createDiv({
			cls: `crc-schema-stat ${conflictedProofs.length > 0 ? 'crc-schema-stat-warning' : ''}`
		});
		setIcon(conflictStat.createSpan({ cls: 'crc-schema-stat-icon' }),
			conflictedProofs.length > 0 ? 'alert-triangle' : 'check');
		conflictStat.createSpan({
			text: `${conflictedProofs.length} unresolved conflict${conflictedProofs.length !== 1 ? 's' : ''}`,
			cls: 'crc-schema-stat-text'
		});

		const proofStat = conflictStatsRow.createDiv({ cls: 'crc-schema-stat' });
		setIcon(proofStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'scale');
		proofStat.createSpan({
			text: `${allProofs.length} proof summar${allProofs.length !== 1 ? 'ies' : 'y'}`,
			cls: 'crc-schema-stat-text'
		});

		if (conflictedProofs.length === 0) {
			const successState = conflictsSection.createDiv({ cls: 'crc-dq-no-issues' });
			setIcon(successState.createDiv({ cls: 'crc-dq-no-issues-icon' }), 'check');
			successState.createSpan({ text: 'No unresolved source conflicts' });
		} else {
			const conflictList = conflictsSection.createDiv({ cls: 'crc-conflicts-list' });
			for (const proof of conflictedProofs) {
				renderConflictItem(conflictList, proof, app);
			}
		}
	}

	// --- Section 3: Vault-wide Analysis (always shown, auto-run) ---
	const analysisSection = container.createDiv({ cls: 'cr-dqv-section' });
	analysisSection.createEl('h3', { text: 'Vault-wide analysis', cls: 'cr-dqv-section-title' });

	const resultsContainer = analysisSection.createDiv({ cls: 'crc-data-quality-results' });

	// Auto-run analysis
	const loadingEl = resultsContainer.createDiv({ cls: 'crc-loading' });
	loadingEl.createSpan({ text: 'Analyzing data quality...' });

	const familyGraph = new FamilyGraphService(app);
	const folderFilter = new FolderFilterService(plugin.settings);
	familyGraph.setFolderFilter(folderFilter);
	familyGraph.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph.setValueAliases(plugin.settings.valueAliases);

	const dataQualityService = new DataQualityService(
		app,
		plugin.settings,
		familyGraph,
		folderFilter,
		plugin
	);
	if (plugin.personIndex) {
		dataQualityService.setPersonIndex(plugin.personIndex);
	}

	const report = dataQualityService.analyze({ scope: 'all' });
	resultsContainer.empty();

	const { summary, issues } = report;

	// Quality score
	const summaryDiv = resultsContainer.createDiv({ cls: 'crc-dq-summary' });
	const scoreEl = summaryDiv.createDiv({ cls: 'crc-dq-score' });
	const scoreValue = scoreEl.createDiv({ cls: 'crc-dq-score-value' });
	scoreValue.setText(String(summary.qualityScore));

	if (summary.qualityScore >= 80) {
		scoreValue.addClass('crc-dq-score--good');
	} else if (summary.qualityScore >= 50) {
		scoreValue.addClass('crc-dq-score--warning');
	} else {
		scoreValue.addClass('crc-dq-score--poor');
	}

	scoreEl.createDiv({ cls: 'crc-dq-score-label', text: 'Quality score' });

	// Stats grid
	const statsGrid = summaryDiv.createDiv({ cls: 'crc-dq-stats-grid' });
	renderDqStatCard(statsGrid, 'People analyzed', String(summary.totalPeople), 'users');
	renderDqStatCard(statsGrid, 'Total issues', String(summary.totalIssues), 'alert-circle');
	renderDqStatCard(statsGrid, 'Errors', String(summary.bySeverity.error), 'alert-triangle');
	renderDqStatCard(statsGrid, 'Warnings', String(summary.bySeverity.warning), 'alert-circle');

	// Completeness metrics
	const completenessDiv = resultsContainer.createDiv({ cls: 'crc-section' });
	completenessDiv.createEl('h3', { text: 'Data completeness' });

	const completenessGrid = completenessDiv.createDiv({ cls: 'crc-dq-completeness-grid' });
	const total = summary.totalPeople || 1;
	renderCompletenessBar(completenessGrid, 'Birth date', summary.completeness.withBirthDate, total);
	renderCompletenessBar(completenessGrid, 'Death date', summary.completeness.withDeathDate, total);
	renderCompletenessBar(completenessGrid, 'Gender', summary.completeness.withGender, total);
	renderCompletenessBar(completenessGrid, 'Both parents', summary.completeness.withBothParents, total);
	renderCompletenessBar(completenessGrid, 'At least one parent', summary.completeness.withAtLeastOneParent, total);
	renderCompletenessBar(completenessGrid, 'Has spouse', summary.completeness.withSpouse, total);
	renderCompletenessBar(completenessGrid, 'Has children', summary.completeness.withChildren, total);

	// Issues section
	if (issues.length > 0) {
		const issuesDiv = resultsContainer.createDiv({ cls: 'crc-section' });
		issuesDiv.createEl('h3', { text: 'Issues found' });

		// Filter row: severity filter + search
		const filterRow = issuesDiv.createDiv({ cls: 'crc-dq-filter-row' });

		const severitySelect = filterRow.createEl('select', { cls: 'dropdown crc-filter-select' });
		severitySelect.createEl('option', { value: 'all', text: 'All severities' });
		severitySelect.createEl('option', { value: 'errors', text: 'Errors only' });
		severitySelect.createEl('option', { value: 'warnings', text: 'Warnings only' });
		severitySelect.createEl('option', { value: 'info', text: 'Info only' });
		severitySelect.value = currentFilter;

		const searchInput = filterRow.createEl('input', {
			cls: 'crc-filter-search',
			type: 'search',
			placeholder: 'Search issues...',
			value: currentSearch
		});

		const issuesList = issuesDiv.createDiv({ cls: 'crc-dq-issues-list' });

		const rerenderIssues = (): void => {
			issuesList.empty();

			const filtered = issues.filter(issue => {
				// Severity filter
				if (currentFilter === 'errors' && issue.severity !== 'error') return false;
				if (currentFilter === 'warnings' && issue.severity !== 'warning') return false;
				if (currentFilter === 'info' && issue.severity !== 'info') return false;

				// Search filter
				if (currentSearch) {
					const search = currentSearch.toLowerCase();
					const matchesName = issue.person.name.toLowerCase().includes(search);
					const matchesMessage = issue.message.toLowerCase().includes(search);
					if (!matchesName && !matchesMessage) return false;
				}

				return true;
			});

			if (filtered.length === 0) {
				issuesList.createDiv({
					cls: 'crc-dq-no-matches',
					text: 'No issues match the selected filters.'
				});
				return;
			}

			issuesList.createDiv({
				cls: 'crc-dq-issues-count',
				text: `Showing ${filtered.length} issue${filtered.length === 1 ? '' : 's'}`
			});

			const displayIssues = filtered.slice(0, 100);
			for (const issue of displayIssues) {
				renderDashboardIssueItem(issuesList, issue, app);
			}

			if (filtered.length > 100) {
				issuesList.createDiv({
					cls: 'crc-dq-more-issues',
					text: `... and ${filtered.length - 100} more issues`
				});
			}
		};

		severitySelect.addEventListener('change', () => {
			currentFilter = severitySelect.value as DataQualityFilter;
			notifyStateChange();
			rerenderIssues();
		});

		searchInput.addEventListener('input', () => {
			currentSearch = searchInput.value;
			notifyStateChange();
			rerenderIssues();
		});

		rerenderIssues();
	} else {
		const noIssuesEl = resultsContainer.createDiv({ cls: 'crc-dq-no-issues' });
		setIcon(noIssuesEl.createSpan({ cls: 'crc-dq-no-issues-icon' }), 'check');
		noIssuesEl.createSpan({ text: 'No issues found! Your data looks great.' });
	}
}

/**
 * Render a single issue item for the dockable dashboard.
 * Unlike renderIssueItem(), this does not close a modal when clicking a person.
 */
function renderDashboardIssueItem(container: HTMLElement, issue: DataQualityIssue, app: App): void {
	const item = container.createDiv({ cls: `crc-dq-issue crc-dq-issue--${issue.severity}` });

	// Severity icon
	const iconEl = item.createDiv({ cls: 'crc-dq-issue-icon' });
	const iconName = issue.severity === 'error' ? 'alert-triangle' :
		issue.severity === 'warning' ? 'alert-circle' : 'info';
	setIcon(iconEl, iconName);

	// Content
	const content = item.createDiv({ cls: 'crc-dq-issue-content' });

	// Person name as clickable link (opens note without closing modal)
	const personLink = content.createEl('a', {
		cls: 'crc-dq-issue-person',
		text: issue.person.name
	});
	personLink.addEventListener('click', (e) => {
		e.preventDefault();
		const file = issue.person.file;
		if (file) {
			void app.workspace.openLinkText(file.path, '', false);
		}
	});

	// Issue message
	content.createDiv({ cls: 'crc-dq-issue-message', text: issue.message });

	// Category badge
	const badge = item.createDiv({ cls: 'crc-dq-issue-badge' });
	badge.setText(formatCategoryName(issue.category));
}

// ---------------------------------------------------------------------------
// Cross-domain batch operations
// ---------------------------------------------------------------------------

async function previewBatchOperation(
	operation: 'dates' | 'sex' | 'orphans' | 'legacy_type' | 'missing_ids',
	scope: 'all' | 'staging' | 'folder',
	folderPath: string | undefined,
	options: DataQualityTabOptions
): Promise<void> {
	const { plugin, app } = options;

	// Create service
	const familyGraph = new FamilyGraphService(app);
	const folderFilter = new FolderFilterService(plugin.settings);
	familyGraph.setFolderFilter(folderFilter);
	familyGraph.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph.setValueAliases(plugin.settings.valueAliases);

	const dataQualityService = new DataQualityService(
		app,
		plugin.settings,
		familyGraph,
		folderFilter,
		plugin
	);
	if (plugin.personIndex) {
		dataQualityService.setPersonIndex(plugin.personIndex);
	}

	// Get preview
	const preview = await dataQualityService.previewNormalization({ scope, folderPath });

	// Check if sex normalization is disabled
	const sexNormalizationDisabled = operation === 'sex' &&
		plugin.settings.sexNormalizationMode === 'disabled';

	// Show preview modal
	const modal = new BatchPreviewModal(
		app,
		operation,
		preview,
		async () => await runBatchOperation(operation, scope, folderPath, options),
		sexNormalizationDisabled
	);
	modal.open();
}

async function runBatchOperation(
	operation: 'dates' | 'sex' | 'orphans' | 'legacy_type' | 'missing_ids',
	scope: 'all' | 'staging' | 'folder',
	folderPath: string | undefined,
	options: DataQualityTabOptions
): Promise<void> {
	const { plugin, app } = options;

	// Create service
	const familyGraph = new FamilyGraphService(app);
	const folderFilter = new FolderFilterService(plugin.settings);
	familyGraph.setFolderFilter(folderFilter);
	familyGraph.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph.setValueAliases(plugin.settings.valueAliases);

	const dataQualityService = new DataQualityService(
		app,
		plugin.settings,
		familyGraph,
		folderFilter,
		plugin
	);
	if (plugin.personIndex) {
		dataQualityService.setPersonIndex(plugin.personIndex);
	}

	let result: { processed: number; modified: number; errors: string[] };
	let operationName: string;

	try {
		switch (operation) {
			case 'dates':
				operationName = 'Date normalization';
				result = await dataQualityService.normalizeDateFormats({ scope, folderPath });
				break;
			case 'sex':
				operationName = 'Sex normalization';
				result = await dataQualityService.normalizeGenderValues({ scope, folderPath });
				break;
			case 'orphans':
				operationName = 'Orphan reference clearing';
				result = await dataQualityService.clearOrphanReferences({ scope, folderPath });
				break;
			case 'legacy_type':
				operationName = 'Legacy type migration';
				result = await dataQualityService.migrateLegacyTypeProperty({ scope, folderPath });
				break;
			case 'missing_ids':
				operationName = 'Missing ID repair';
				result = await dataQualityService.repairMissingIds({ scope, folderPath });
				break;
		}

		// Show result
		if (result.modified > 0) {
			new Notice(`${operationName}: Modified ${result.modified} of ${result.processed} files`);
		} else {
			new Notice(`${operationName}: No changes needed`);
		}

		if (result.errors.length > 0) {
			new Notice(`${result.errors.length} errors occurred. Check console for details.`);
			console.error('Batch operation errors:', result.errors);
		}

		// Refresh the family graph cache
		await familyGraph.reloadCache();

	} catch (error) {
		new Notice(`${operation} failed: ${getErrorMessage(error)}`);
	}
}

// ---------------------------------------------------------------------------
// Person-specific batch operations (called from People tab)
// ---------------------------------------------------------------------------

/**
 * Preview removing duplicate relationships
 */
export function previewRemoveDuplicateRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	const changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check spouse array for duplicates
		if (Array.isArray(fm.spouse) && fm.spouse.length > 1) {
			const unique = [...new Set(fm.spouse)];
			const dupCount = fm.spouse.length - unique.length;
			if (dupCount > 0) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'spouse',
					oldValue: `${fm.spouse.length} ${fm.spouse.length === 1 ? 'entry' : 'entries'} (${dupCount} ${dupCount === 1 ? 'duplicate' : 'duplicates'})`,
					newValue: `${unique.length} ${unique.length === 1 ? 'entry' : 'entries'} (deduplicated)`,
					file: person.file
				});
			}
		}

		// Check spouse_id array for duplicates
		if (Array.isArray(fm.spouse_id) && fm.spouse_id.length > 1) {
			const unique = [...new Set(fm.spouse_id)];
			const dupCount = fm.spouse_id.length - unique.length;
			if (dupCount > 0) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'spouse_id',
					oldValue: `${fm.spouse_id.length} ${fm.spouse_id.length === 1 ? 'entry' : 'entries'} (${dupCount} ${dupCount === 1 ? 'duplicate' : 'duplicates'})`,
					newValue: `${unique.length} ${unique.length === 1 ? 'entry' : 'entries'} (deduplicated)`,
					file: person.file
				});
			}
		}

		// Check children/child arrays for duplicates
		const childrenArray = fm.children || fm.child;
		if (Array.isArray(childrenArray) && childrenArray.length > 1) {
			const unique = [...new Set(childrenArray)];
			const dupCount = childrenArray.length - unique.length;
			if (dupCount > 0) {
				const fieldName = fm.children ? 'children' : 'child';
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: fieldName,
					oldValue: `${childrenArray.length} ${childrenArray.length === 1 ? 'entry' : 'entries'} (${dupCount} ${dupCount === 1 ? 'duplicate' : 'duplicates'})`,
					newValue: `${unique.length} ${unique.length === 1 ? 'entry' : 'entries'} (deduplicated)`,
					file: person.file
				});
			}
		}

		// Check children_id array for duplicates
		if (Array.isArray(fm.children_id) && fm.children_id.length > 1) {
			const unique = [...new Set(fm.children_id)];
			const dupCount = fm.children_id.length - unique.length;
			if (dupCount > 0) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'children_id',
					oldValue: `${fm.children_id.length} ${fm.children_id.length === 1 ? 'entry' : 'entries'} (${dupCount} ${dupCount === 1 ? 'duplicate' : 'duplicates'})`,
					newValue: `${unique.length} ${unique.length === 1 ? 'entry' : 'entries'} (deduplicated)`,
					file: person.file
				});
			}
		}
	}

	if (changes.length === 0) {
		new Notice('No duplicate relationships found');
		return;
	}

	// Show preview modal
	const modal = new DuplicateRelationshipsPreviewModal(
		app,
		changes,
		async () => await removeDuplicateRelationships(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Remove duplicate relationships
 */
export async function removeDuplicateRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Removing duplicate relationships...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const errors: string[] = [];

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter as Record<string, unknown>;
			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Deduplicate spouse array
				if (Array.isArray(fm.spouse) && fm.spouse.length > 1) {
					const unique = [...new Set(fm.spouse)];
					if (unique.length < fm.spouse.length) {
						frontmatter.spouse = unique;
						hasChanges = true;
					}
				}

				// Deduplicate spouse_id array
				if (Array.isArray(fm.spouse_id) && fm.spouse_id.length > 1) {
					const unique = [...new Set(fm.spouse_id)];
					if (unique.length < fm.spouse_id.length) {
						frontmatter.spouse_id = unique;
						hasChanges = true;
					}
				}

				// Deduplicate and normalize children arrays
				// Prefer 'children' (plural), migrate from 'child' (legacy) if present
				const childrenArray = fm.children || fm.child;
				if (Array.isArray(childrenArray) && childrenArray.length > 0) {
					const unique = [...new Set(childrenArray)];
					// Always write to 'children' (preferred name)
					frontmatter.children = unique.length === 1 ? unique[0] : unique;
					// Remove legacy 'child' property if present
					if (fm.child) {
						delete frontmatter.child;
						hasChanges = true;
					}
					if (unique.length < childrenArray.length) {
						hasChanges = true;
					}
				}

				// Deduplicate children_id array
				if (Array.isArray(fm.children_id) && fm.children_id.length > 1) {
					const unique = [...new Set(fm.children_id)];
					if (unique.length < fm.children_id.length) {
						frontmatter.children_id = unique;
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Removed duplicates from ${modified} ${modified === 1 ? 'file' : 'files'}`);
	} else {
		new Notice('No duplicate relationships found');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Remove duplicates errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache();

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview removing empty/placeholder values
 */
export function previewRemovePlaceholders(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	const changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];

	// Common placeholder patterns (actual placeholder text, not empty values)
	const placeholderPatterns = [
		'(unknown)',
		'(Unknown)',
		'unknown',
		'Unknown',
		'UNKNOWN',
		'N/A',
		'n/a',
		'???',
		'...',
		'Empty',
		'empty',
		'EMPTY',
		'None',
		'none',
		'NONE',
	];

	const isPlaceholder = (value: unknown): boolean => {
		// Note: null, undefined, and empty strings are NOT placeholders - they're
		// intentionally empty fields, which is valid for optional properties.
		// We only flag actual placeholder text like "Unknown", "N/A", etc.
		if (value === null || value === undefined) return false;
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed === '') return false;
			if (placeholderPatterns.includes(trimmed)) return true;
			// Check for malformed wikilinks like "[[unknown) ]]"
			if (/^\[\[.*?\)\s*\]\]$/.test(trimmed)) return true;
			// Check for strings that are just commas and spaces
			if (/^[,\s]+$/.test(trimmed)) return true;
		}
		return false;
	};

	const cleanPlaceValue = (value: string): string | null => {
		// Handle comma-separated values like ", , , Canada"
		const parts = value.split(',').map(p => p.trim()).filter(p => p && !isPlaceholder(p));
		if (parts.length === 0) return null;
		return parts.join(', ');
	};

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check name field
		if (fm.name && isPlaceholder(fm.name)) {
			changes.push({
				person: { name: person.name || 'Unknown' },
				field: 'name',
				oldValue: String(fm.name as string),
				newValue: '(remove field)',
				file: person.file
			});
		}

		// Check place fields with comma cleanup
		const placeFields = ['birth_place', 'death_place', 'burial_place', 'residence'];
		for (const field of placeFields) {
			const value = fm[field];
			if (typeof value === 'string' && value.trim()) {
				const cleaned = cleanPlaceValue(value);
				if (cleaned === null) {
					// Entirely placeholder
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: value,
						newValue: '(remove field)',
						file: person.file
					});
				} else if (cleaned !== value) {
					// Has cleanup needed
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: value,
						newValue: cleaned,
						file: person.file
					});
				}
			} else if (field in fm && isPlaceholder(value)) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field,
					oldValue: String(value),
					newValue: '(remove field)',
					file: person.file
				});
			}
		}

		// Check relationship fields (spouse, father, mother, child/children)
		const relationshipFields = ['spouse', 'father', 'mother', 'child', 'children'];
		for (const field of relationshipFields) {
			const value = fm[field];
			if (Array.isArray(value)) {
				// Check if array contains only placeholders
				const nonPlaceholders = value.filter(v => !isPlaceholder(v));
				if (nonPlaceholders.length === 0 && value.length > 0) {
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: `[${value.length} placeholder ${value.length === 1 ? 'entry' : 'entries'}]`,
						newValue: '(remove field)',
						file: person.file
					});
				} else if (nonPlaceholders.length < value.length) {
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: `${value.length} entries (${value.length - nonPlaceholders.length} placeholders)`,
						newValue: `${nonPlaceholders.length} entries (cleaned)`,
						file: person.file
					});
				}
			} else if (field in fm && isPlaceholder(value)) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field,
					oldValue: String(value),
					newValue: '(remove field)',
					file: person.file
				});
			}
		}

		// Note: Empty parent/spouse fields (null, undefined, '') are intentionally
		// NOT flagged as issues - they represent unknown/missing data which is valid.
	}

	if (changes.length === 0) {
		new Notice('No placeholder values found');
		return;
	}

	// Show preview modal
	const modal = new PlaceholderRemovalPreviewModal(
		app,
		changes,
		async () => await removePlaceholders(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Remove empty/placeholder values
 */
export async function removePlaceholders(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Removing placeholder values...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const errors: string[] = [];

	// Common placeholder patterns (actual placeholder text, not empty values)
	const placeholderPatterns = [
		'(unknown)',
		'(Unknown)',
		'unknown',
		'Unknown',
		'UNKNOWN',
		'N/A',
		'n/a',
		'???',
		'...',
		'Empty',
		'empty',
		'EMPTY',
		'None',
		'none',
		'NONE',
	];

	const isPlaceholder = (value: unknown): boolean => {
		// Note: null, undefined, and empty strings are NOT placeholders - they're
		// intentionally empty fields, which is valid for optional properties.
		// We only flag actual placeholder text like "Unknown", "N/A", etc.
		if (value === null || value === undefined) return false;
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed === '') return false;
			if (placeholderPatterns.includes(trimmed)) return true;
			// Check for malformed wikilinks like "[[unknown) ]]"
			if (/^\[\[.*?\)\s*\]\]$/.test(trimmed)) return true;
			// Check for strings that are just commas and spaces
			if (/^[,\s]+$/.test(trimmed)) return true;
		}
		return false;
	};

	const cleanPlaceValue = (value: string): string | null => {
		// Handle comma-separated values like ", , , Canada"
		const parts = value.split(',').map(p => p.trim()).filter(p => p && !isPlaceholder(p));
		if (parts.length === 0) return null;
		return parts.join(', ');
	};

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Remove placeholder name
				if (frontmatter.name && isPlaceholder(frontmatter.name)) {
					delete frontmatter.name;
					hasChanges = true;
				}

				// Clean or remove place fields
				const placeFields = ['birth_place', 'death_place', 'burial_place', 'residence'];
				for (const field of placeFields) {
					const value = frontmatter[field];
					if (typeof value === 'string' && value.trim()) {
						const cleaned = cleanPlaceValue(value);
						if (cleaned === null) {
							delete frontmatter[field];
							hasChanges = true;
						} else if (cleaned !== value) {
							frontmatter[field] = cleaned;
							hasChanges = true;
						}
					} else if (field in frontmatter && isPlaceholder(value)) {
						delete frontmatter[field];
						hasChanges = true;
					}
				}

				// Clean relationship arrays or remove if all placeholders
				const relationshipFields = ['spouse', 'child', 'children'];
				for (const field of relationshipFields) {
					const value = frontmatter[field];
					if (Array.isArray(value)) {
						const nonPlaceholders = value.filter(v => !isPlaceholder(v));
						if (nonPlaceholders.length === 0) {
							delete frontmatter[field];
							hasChanges = true;
						} else if (nonPlaceholders.length < value.length) {
							frontmatter[field] = nonPlaceholders;
							hasChanges = true;
						}
					} else if (field in frontmatter && isPlaceholder(value)) {
						delete frontmatter[field];
						hasChanges = true;
					}
				}

				// Remove placeholder parent fields
				const parentFields = ['father', 'mother'];
				for (const field of parentFields) {
					if (field in frontmatter && isPlaceholder(frontmatter[field])) {
						delete frontmatter[field];
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Removed placeholders from ${modified} ${modified === 1 ? 'file' : 'files'}`);
	} else {
		new Notice('No placeholder values found');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Remove placeholders errors:', errors);
	}

	// Wait for file system to sync before reloading
	// Brief delay to ensure all file writes are complete
	if (modified > 0) {
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache();

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview adding cr_type: person to person notes
 */
export function previewAddPersonType(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	console.debug(`[DEBUG] previewAddPersonType: Found ${people.length} people from getAllPeople()`);

	const changes: Array<{ person: { name: string }; file: TFile }> = [];

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check if cr_type already exists
		if (!fm.cr_type) {
			changes.push({
				person: { name: person.name || 'Unknown' },
				file: person.file
			});
		}
	}

	console.debug(`[DEBUG] previewAddPersonType: Found ${changes.length} people needing cr_type`);

	// Show preview modal
	new AddPersonTypePreviewModal(
		app,
		changes,
		async () => await addPersonType(plugin, app, showTab)
	).open();
}

/**
 * Add cr_type: person to all person notes
 */
export async function addPersonType(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Adding cr_type property...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const errors: string[] = [];

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Add cr_type if it doesn't exist
				if (!frontmatter.cr_type) {
					frontmatter.cr_type = 'person';
					hasChanges = true;
				}
			});

			if (hasChanges) {
				modified++;
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Added cr_type property to ${modified} ${modified === 1 ? 'file' : 'files'}`);
	} else {
		new Notice('All person notes already have cr_type property');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Add person type errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache();

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview name formatting normalization
 */
export function previewNormalizeNames(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	const changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];

	/**
	 * Normalize a name to proper Title Case with smart handling of prefixes
	 */
	const normalizeName = (name: string): string | null => {
		if (!name || typeof name !== 'string') return null;

		// Trim and collapse multiple spaces
		const cleaned = name.trim().replace(/\s+/g, ' ');
		if (!cleaned) return null;

		// Helper function to normalize a single word/segment
		const normalizeWord = (word: string, isFirstWord: boolean): string => {
			if (!word) return word;

			const lowerWord = word.toLowerCase();

			// Preserve initials (A., B., A.B., H.G., etc.)
			// Matches patterns like "A.", "A.B.", "H.G.", etc.
			if (/^([a-z]\.)+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Preserve Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
			if (/^[ivx]+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Common surname prefixes that should stay lowercase (unless at start)
			const lowercasePrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'den', 'der', 'ten', 'ter', 'du'];
			if (!isFirstWord && lowercasePrefixes.includes(lowerWord)) {
				return lowerWord;
			}

			// Handle Mac prefix (but not "Mack" as a standalone name)
			// Only apply if there are at least 2 more letters after "Mac"
			if (lowerWord.startsWith('mac') && word.length > 5) {
				return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
			}

			// Handle Mc prefix
			if (lowerWord.startsWith('mc') && word.length > 2) {
				return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle O' prefix
			if (lowerWord.startsWith("o'") && word.length > 2) {
				return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle hyphenated names (Abdul-Aziz, Mary-Jane, etc.)
			if (word.includes('-')) {
				return word.split('-')
					.map(part => normalizeWord(part, false))
					.join('-');
			}

			// Standard title case
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		};

		// Split by spaces to get words
		const words = cleaned.split(' ');
		const normalized = words.map((word, index) => {
			// Handle parentheses - preserve content inside and apply title case
			if (word.startsWith('(') && word.endsWith(')')) {
				const inner = word.slice(1, -1);
				return '(' + normalizeWord(inner, false) + ')';
			}

			// Handle opening parenthesis
			if (word.startsWith('(')) {
				const inner = word.slice(1);
				return '(' + normalizeWord(inner, index === 0);
			}

			// Handle closing parenthesis
			if (word.endsWith(')')) {
				const inner = word.slice(0, -1);
				return normalizeWord(inner, false) + ')';
			}

			return normalizeWord(word, index === 0);
		});

		const result = normalized.join(' ');

		// Only return if it's different from the input
		return result !== cleaned ? result : null;
	};

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check name field
		if (fm.name && typeof fm.name === 'string') {
			const normalized = normalizeName(fm.name);
			if (normalized) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'name',
					oldValue: fm.name,
					newValue: normalized,
					file: person.file
				});
			}
		}
	}

	if (changes.length === 0) {
		new Notice('No names need normalization');
		return;
	}

	const modal = new NameNormalizationPreviewModal(
		app,
		changes,
		async () => await normalizeNames(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Apply name formatting normalization
 */
export async function normalizeNames(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Normalizing name formatting...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const errors: string[] = [];

	/**
	 * Normalize a name to proper Title Case with smart handling of prefixes
	 */
	const normalizeName = (name: string): string | null => {
		if (!name || typeof name !== 'string') return null;

		// Trim and collapse multiple spaces
		const cleaned = name.trim().replace(/\s+/g, ' ');
		if (!cleaned) return null;

		// Helper function to normalize a single word/segment
		const normalizeWord = (word: string, isFirstWord: boolean): string => {
			if (!word) return word;

			const lowerWord = word.toLowerCase();

			// Preserve initials (A., B., A.B., H.G., etc.)
			// Matches patterns like "A.", "A.B.", "H.G.", etc.
			if (/^([a-z]\.)+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Preserve Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
			if (/^[ivx]+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Common surname prefixes that should stay lowercase (unless at start)
			const lowercasePrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'den', 'der', 'ten', 'ter', 'du'];
			if (!isFirstWord && lowercasePrefixes.includes(lowerWord)) {
				return lowerWord;
			}

			// Handle Mac prefix (but not "Mack" as a standalone name)
			// Only apply if there are at least 2 more letters after "Mac"
			if (lowerWord.startsWith('mac') && word.length > 5) {
				return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
			}

			// Handle Mc prefix
			if (lowerWord.startsWith('mc') && word.length > 2) {
				return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle O' prefix
			if (lowerWord.startsWith("o'") && word.length > 2) {
				return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle hyphenated names (Abdul-Aziz, Mary-Jane, etc.)
			if (word.includes('-')) {
				return word.split('-')
					.map(part => normalizeWord(part, false))
					.join('-');
			}

			// Standard title case
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		};

		// Split by spaces to get words
		const words = cleaned.split(' ');
		const normalized = words.map((word, index) => {
			// Handle parentheses - preserve content inside and apply title case
			if (word.startsWith('(') && word.endsWith(')')) {
				const inner = word.slice(1, -1);
				return '(' + normalizeWord(inner, false) + ')';
			}

			// Handle opening parenthesis
			if (word.startsWith('(')) {
				const inner = word.slice(1);
				return '(' + normalizeWord(inner, index === 0);
			}

			// Handle closing parenthesis
			if (word.endsWith(')')) {
				const inner = word.slice(0, -1);
				return normalizeWord(inner, false) + ')';
			}

			return normalizeWord(word, index === 0);
		});

		const result = normalized.join(' ');

		// Only return if it's different from the input
		return result !== cleaned ? result : null;
	};

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter as Record<string, unknown>;
			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Normalize name field
				if (fm.name && typeof fm.name === 'string') {
					const normalized = normalizeName(fm.name);
					if (normalized) {
						frontmatter.name = normalized;
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Normalized names in ${modified} ${modified === 1 ? 'file' : 'files'}`);
	} else {
		new Notice('No names needed normalization');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Normalize names errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache();

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview orphaned cr_id reference removal
 */
export function previewRemoveOrphanedRefs(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const changes: Array<{ person: { name: string; file: TFile }; field: string; orphanedId: string }> = [];

	// Build a map of all valid cr_ids
	const validCrIds = new Set<string>();
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id;
		if (crId && typeof crId === 'string') {
			validCrIds.add(crId);
		}
	}

	// Check each person for orphaned references
	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter?.cr_id) continue;

		const fm = cache.frontmatter as Record<string, unknown>;
		const personName = (fm.name as string) || file.basename;

		// Check father_id
		const fatherId = fm.father_id;
		if (fatherId && typeof fatherId === 'string' && !validCrIds.has(fatherId)) {
			changes.push({
				person: { name: personName, file },
				field: 'father_id',
				orphanedId: fatherId
			});
		}

		// Check mother_id
		const motherId = fm.mother_id;
		if (motherId && typeof motherId === 'string' && !validCrIds.has(motherId)) {
			changes.push({
				person: { name: personName, file },
				field: 'mother_id',
				orphanedId: motherId
			});
		}

		// Check spouse_id (can be string or array)
		const spouseId = fm.spouse_id;
		if (spouseId) {
			const spouseIds = Array.isArray(spouseId) ? spouseId : [spouseId];
			for (const id of spouseIds) {
				if (typeof id === 'string' && !validCrIds.has(id)) {
					changes.push({
						person: { name: personName, file },
						field: 'spouse_id',
						orphanedId: id
					});
				}
			}
		}

		// Check partners_id (alias for spouse_id)
		const partnersId = fm.partners_id;
		if (partnersId) {
			const partnerIds = Array.isArray(partnersId) ? partnersId : [partnersId];
			for (const id of partnerIds) {
				if (typeof id === 'string' && !validCrIds.has(id)) {
					changes.push({
						person: { name: personName, file },
						field: 'partners_id',
						orphanedId: id
					});
				}
			}
		}

		// Check children_id (can be string or array)
		const childrenId = fm.children_id;
		if (childrenId) {
			const childrenIds = Array.isArray(childrenId) ? childrenId : [childrenId];
			for (const id of childrenIds) {
				if (typeof id === 'string' && !validCrIds.has(id)) {
					changes.push({
						person: { name: personName, file },
						field: 'children_id',
						orphanedId: id
					});
				}
			}
		}
	}

	if (changes.length === 0) {
		new Notice('No orphaned cr_id references found');
		return;
	}

	const modal = new OrphanedRefsPreviewModal(
		app,
		changes,
		async () => await removeOrphanedRefs(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Remove orphaned cr_id references
 */
export async function removeOrphanedRefs(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();

	let modified = 0;
	const errors: Array<{ file: string; error: string }> = [];

	new Notice('Removing orphaned cr_id references...');

	// Build a map of all valid cr_ids
	const validCrIds = new Set<string>();
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id;
		if (crId && typeof crId === 'string') {
			validCrIds.add(crId);
		}
	}

	// Process each file
	for (const file of files) {

		try {
			const cache = app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter?.cr_id) continue;

			let hasChanges = false;

			await app.fileManager.processFrontMatter(file, (frontmatter) => {
				// Clean father_id
				if (frontmatter.father_id && typeof frontmatter.father_id === 'string') {
					if (!validCrIds.has(frontmatter.father_id)) {
						delete frontmatter.father_id;
						hasChanges = true;
					}
				}

				// Clean mother_id
				if (frontmatter.mother_id && typeof frontmatter.mother_id === 'string') {
					if (!validCrIds.has(frontmatter.mother_id)) {
						delete frontmatter.mother_id;
						hasChanges = true;
					}
				}

				// Clean spouse_id
				if (frontmatter.spouse_id) {
					const spouseIds = Array.isArray(frontmatter.spouse_id)
						? frontmatter.spouse_id
						: [frontmatter.spouse_id];
					const validSpouseIds = spouseIds.filter((id: unknown) =>
						typeof id === 'string' && validCrIds.has(id)
					);

					if (validSpouseIds.length !== spouseIds.length) {
						if (validSpouseIds.length === 0) {
							delete frontmatter.spouse_id;
						} else if (validSpouseIds.length === 1) {
							frontmatter.spouse_id = validSpouseIds[0];
						} else {
							frontmatter.spouse_id = validSpouseIds;
						}
						hasChanges = true;
					}
				}

				// Clean partners_id
				if (frontmatter.partners_id) {
					const partnerIds = Array.isArray(frontmatter.partners_id)
						? frontmatter.partners_id
						: [frontmatter.partners_id];
					const validPartnerIds = partnerIds.filter((id: unknown) =>
						typeof id === 'string' && validCrIds.has(id)
					);

					if (validPartnerIds.length !== partnerIds.length) {
						if (validPartnerIds.length === 0) {
							delete frontmatter.partners_id;
						} else if (validPartnerIds.length === 1) {
							frontmatter.partners_id = validPartnerIds[0];
						} else {
							frontmatter.partners_id = validPartnerIds;
						}
						hasChanges = true;
					}
				}

				// Clean children_id
				if (frontmatter.children_id) {
					const childrenIds = Array.isArray(frontmatter.children_id)
						? frontmatter.children_id
						: [frontmatter.children_id];
					const validChildrenIds = childrenIds.filter((id: unknown) =>
						typeof id === 'string' && validCrIds.has(id)
					);

					if (validChildrenIds.length !== childrenIds.length) {
						if (validChildrenIds.length === 0) {
							delete frontmatter.children_id;
						} else if (validChildrenIds.length === 1) {
							frontmatter.children_id = validChildrenIds[0];
						} else {
							frontmatter.children_id = validChildrenIds;
						}
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
			}
		} catch (error) {
			errors.push({
				file: file.path,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	if (modified > 0) {
		new Notice(`\u2713 Removed orphaned references from ${modified} ${modified === 1 ? 'file' : 'files'}`);
	} else {
		new Notice('No orphaned cr_id references found');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Remove orphaned refs errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache();

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview fixing bidirectional relationship inconsistencies
 */
export async function previewFixBidirectionalRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	// Create folder filter and family graph service
	const folderFilter1 = new FolderFilterService(plugin.settings);
	const familyGraph1 = plugin.createFamilyGraphService();
	// Force reload to ensure we have fresh data (cache may be stale after previous fixes)
	await familyGraph1.reloadCache();
	familyGraph1.setFolderFilter(folderFilter1);
	familyGraph1.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph1.setValueAliases(plugin.settings.valueAliases);

	const dataQuality1 = new DataQualityService(
		app,
		plugin.settings,
		familyGraph1,
		folderFilter1,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality1.setPersonIndex(plugin.personIndex);
	}

	new Notice('Detecting bidirectional relationship inconsistencies...');

	const inconsistencies = dataQuality1.detectBidirectionalInconsistencies();

	if (inconsistencies.length === 0) {
		new Notice('No bidirectional relationship inconsistencies found');
		return;
	}

	// Separate fixable inconsistencies from conflicts
	const fixableInconsistencies = inconsistencies.filter(i => i.type !== 'conflicting-parent-claim');
	const conflictCount = inconsistencies.filter(i => i.type === 'conflicting-parent-claim').length;

	// Notify about conflicts (handled separately in People tab)
	if (conflictCount > 0) {
		new Notice(`Found ${conflictCount} parent claim conflict${conflictCount === 1 ? '' : 's'}. See the "Parent claim conflicts" card in the People tab to resolve.`, 8000);
	}

	if (fixableInconsistencies.length === 0) {
		if (conflictCount > 0) {
			new Notice('No auto-fixable inconsistencies found. Only conflicts requiring manual resolution.');
		}
		return;
	}

	// Transform fixable inconsistencies to modal format
	const changes = fixableInconsistencies.map((issue: BidirectionalInconsistency) => ({
		person: {
			name: issue.person.name || issue.person.file.basename,
			file: issue.person.file
		},
		relatedPerson: {
			name: issue.relatedPerson.name || issue.relatedPerson.file.basename,
			file: issue.relatedPerson.file
		},
		type: issue.type,
		description: issue.description
	}));

	const modal = new BidirectionalInconsistencyPreviewModal(
		app,
		changes,
		async () => await fixBidirectionalRelationships(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Fix bidirectional relationship inconsistencies
 */
export async function fixBidirectionalRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	// Create folder filter and family graph service
	const folderFilter2 = new FolderFilterService(plugin.settings);
	const familyGraph2 = plugin.createFamilyGraphService();
	// Force reload to ensure we have fresh data before fixing
	await familyGraph2.reloadCache();
	familyGraph2.setFolderFilter(folderFilter2);
	familyGraph2.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph2.setValueAliases(plugin.settings.valueAliases);

	const dataQuality2 = new DataQualityService(
		app,
		plugin.settings,
		familyGraph2,
		folderFilter2,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality2.setPersonIndex(plugin.personIndex);
	}

	new Notice('Detecting inconsistencies...');

	const inconsistencies = dataQuality2.detectBidirectionalInconsistencies();

	if (inconsistencies.length === 0) {
		new Notice('No bidirectional relationship inconsistencies found');
		return;
	}

	new Notice('Fixing bidirectional relationship inconsistencies...');

	// Suspend automatic bidirectional linking during batch operation
	// to prevent interference with our updates
	plugin.bidirectionalLinker?.suspend();

	try {
		const result = await dataQuality2.fixBidirectionalInconsistencies(inconsistencies);

		if (result.modified > 0) {
			new Notice(`\u2713 Fixed ${result.modified} of ${result.processed} inconsistenc${result.processed === 1 ? 'y' : 'ies'}. Wait a moment before re-checking.`, 5000);
		} else {
			new Notice('No inconsistencies were fixed');
		}

		if (result.errors.length > 0) {
			new Notice(`\u26A0 ${result.errors.length} errors occurred. Check console for details.`);
			console.error('Fix bidirectional relationships errors:', result.errors);
		}

		// Wait for all pending file watcher events to process before resuming linker
		// This prevents the bidirectional linker from reverting our fixes
		await new Promise(resolve => setTimeout(resolve, 500));
	} finally {
		// Always resume bidirectional linking, even if errors occurred
		plugin.bidirectionalLinker?.resume();
	}

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview impossible dates detection
 */
export function previewDetectImpossibleDates(plugin: CanvasRootsPlugin, app: App): void {
	const folderFilter3 = new FolderFilterService(plugin.settings);
	const familyGraph3 = plugin.createFamilyGraphService();
	familyGraph3.ensureCacheLoaded();
	familyGraph3.setFolderFilter(folderFilter3);
	familyGraph3.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph3.setValueAliases(plugin.settings.valueAliases);

	const dataQuality3 = new DataQualityService(
		app,
		plugin.settings,
		familyGraph3,
		folderFilter3,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality3.setPersonIndex(plugin.personIndex);
	}

	const issues = dataQuality3.detectImpossibleDates();

	// Transform to modal format
	const previewItems = issues.map((issue: ImpossibleDateIssue) => ({
		person: {
			name: issue.person.name || issue.person.file.basename,
			file: issue.person.file
		},
		relatedPerson: issue.relatedPerson ? {
			name: issue.relatedPerson.name || issue.relatedPerson.file.basename,
			file: issue.relatedPerson.file
		} : undefined,
		type: issue.type,
		description: issue.description,
		personDate: issue.personDate,
		relatedDate: issue.relatedDate
	}));

	// Open modal
	const modal = new ImpossibleDatesPreviewModal(app, previewItems);
	modal.open();
}

/**
 * Preview date format validation
 */
export function previewValidateDates(plugin: CanvasRootsPlugin, app: App): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();

	const issues: Array<{
		file: TFile;
		name: string;
		field: string;
		value: string;
		issue: string;
	}> = [];

	new Notice('Analyzing date formats...');

	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter?.cr_id) continue;

		const fm = cache.frontmatter as Record<string, unknown>;
		const name = (fm.name as string) || file.basename;

		// Skip fictional dates (they have fc-calendar property)
		if (fm['fc-calendar']) continue;

		// Check born/birth_date field
		const born = fm.born || fm.birth_date;
		if (born && typeof born === 'string') {
			const issue = validateDateFormat(born, plugin);
			if (issue) {
				issues.push({
					file,
					name,
					field: fm.born ? 'born' : 'birth_date',
					value: born,
					issue
				});
			}
		}

		// Check died/death_date field
		const died = fm.died || fm.death_date;
		if (died && typeof died === 'string') {
			const issue = validateDateFormat(died, plugin);
			if (issue) {
				issues.push({
					file,
					name,
					field: fm.died ? 'died' : 'death_date',
					value: died,
					issue
				});
			}
		}
	}

	if (issues.length === 0) {
		new Notice('\u2713 All dates are valid according to your validation settings');
		return;
	}

	// Show preview modal
	new DateValidationPreviewModal(app, plugin, issues).open();
}

/**
 * Validate a date string according to current settings
 * @returns Issue description if invalid, null if valid
 */
function validateDateFormat(dateStr: string, plugin: CanvasRootsPlugin): string | null {
	const settings = plugin.settings;
	const trimmed = dateStr.trim();

	// Check for circa dates
	const circaPrefixes = ['c.', 'ca.', 'circa', '~'];
	const hasCirca = circaPrefixes.some(prefix =>
		trimmed.toLowerCase().startsWith(prefix) ||
		trimmed.toLowerCase().startsWith(prefix + ' ')
	);

	if (hasCirca && !settings.allowCircaDates) {
		return 'Circa dates not allowed (check "Allow circa dates" setting)';
	}

	// Remove circa prefix for further validation
	let cleanDate = trimmed;
	if (hasCirca) {
		for (const prefix of circaPrefixes) {
			if (cleanDate.toLowerCase().startsWith(prefix)) {
				cleanDate = cleanDate.slice(prefix.length).trim();
				break;
			}
			if (cleanDate.toLowerCase().startsWith(prefix + ' ')) {
				cleanDate = cleanDate.slice(prefix.length + 1).trim();
				break;
			}
		}
	}

	// Check for date ranges
	const hasRange = cleanDate.includes(' to ') ||
		(cleanDate.includes('-') && cleanDate.split('-').length === 3 && cleanDate.split('-')[2].length === 4);

	if (hasRange && !settings.allowDateRanges) {
		return 'Date ranges not allowed (check "Allow date ranges" setting)';
	}

	// If it's a range, validate each part separately
	if (hasRange) {
		const parts = cleanDate.includes(' to ')
			? cleanDate.split(' to ')
			: cleanDate.split('-').slice(0, 2);

		for (const part of parts) {
			const partIssue = validateSingleDate(part.trim(), plugin);
			if (partIssue) return partIssue;
		}
		return null;
	}

	// Validate single date
	return validateSingleDate(cleanDate, plugin);
}

/**
 * Validate a single date (not a range) according to current settings
 */
function validateSingleDate(dateStr: string, plugin: CanvasRootsPlugin): string | null {
	const settings = plugin.settings;

	// ISO 8601 format: YYYY-MM-DD or YYYY-MM or YYYY
	const iso8601Full = /^(\d{4})-(\d{2})-(\d{2})$/;
	const iso8601Month = /^(\d{4})-(\d{2})$/;
	const iso8601Year = /^(\d{4})$/;
	const iso8601NoZeros = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

	// GEDCOM format: DD MMM YYYY or DD MMM or MMM YYYY
	const gedcomFull = /^(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/i;
	const gedcomMonth = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/i;

	// Check for standard: ISO 8601
	if (settings.dateFormatStandard === 'iso8601') {
		// Check if leading zeros are required
		if (settings.requireLeadingZeros) {
			if (iso8601Full.test(dateStr)) return null;
			if (settings.allowPartialDates && iso8601Month.test(dateStr)) return null;
			if (settings.allowPartialDates && iso8601Year.test(dateStr)) return null;
			return 'ISO 8601 format required with leading zeros (YYYY-MM-DD)';
		} else {
			if (iso8601Full.test(dateStr) || iso8601NoZeros.test(dateStr)) return null;
			if (settings.allowPartialDates && (iso8601Month.test(dateStr) || iso8601Year.test(dateStr))) return null;
			return 'ISO 8601 format required (YYYY-MM-DD or YYYY-M-D)';
		}
	}

	// Check for standard: GEDCOM
	if (settings.dateFormatStandard === 'gedcom') {
		if (gedcomFull.test(dateStr)) return null;
		if (settings.allowPartialDates && gedcomMonth.test(dateStr)) return null;
		if (settings.allowPartialDates && iso8601Year.test(dateStr)) return null;
		return 'GEDCOM format required (DD MMM YYYY, e.g., 15 JAN 1920)';
	}

	// Flexible standard: accept multiple formats
	if (settings.dateFormatStandard === 'flexible') {
		// Accept ISO 8601 formats
		if (iso8601Full.test(dateStr) || (!settings.requireLeadingZeros && iso8601NoZeros.test(dateStr))) return null;
		if (settings.allowPartialDates && (iso8601Month.test(dateStr) || iso8601Year.test(dateStr))) return null;

		// Accept GEDCOM formats
		if (gedcomFull.test(dateStr)) return null;
		if (settings.allowPartialDates && gedcomMonth.test(dateStr)) return null;

		// If we got here, the format is not recognized
		return 'Unrecognized date format (expected YYYY-MM-DD or DD MMM YYYY)';
	}

	return 'Unknown date format standard';
}

/**
 * Apply date format validation (currently just shows preview)
 * Note: We don't auto-correct dates as this could introduce errors
 */
export function validateDates(plugin: CanvasRootsPlugin, app: App): void {
	new Notice('Date validation is preview-only. Review issues and manually correct dates in your notes.');
	previewValidateDates(plugin, app);
}
