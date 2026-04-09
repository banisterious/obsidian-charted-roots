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
import type { DataQualityReport, DataQualityIssue, IssueSeverity, IssueCategory } from '../core/data-quality';
import { PlaceGraphService } from '../core/place-graph';
import { EventService } from '../events/services/event-service';
import { PlaceGeneratorModal } from '../enhancement/ui/place-generator-modal';
import { FlattenNestedPropertiesModal } from './flatten-nested-properties-modal';
import { BulkMediaLinkModal } from '../core/ui/bulk-media-link-modal';
import { TemplateSnippetsModal } from './template-snippets-modal';
import { getErrorMessage } from '../core/error-utils';
import { pluralize } from '../utils/format-utils';
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
import { BatchPreviewModal } from './data-quality-modals';

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
	try {
		renderResearchNeededSection(container, options);
	} catch (error) {
		console.error('[Charted Roots] Error rendering Research Needed section:', error);
	}

	// Research Gaps Section (only when fact-level tracking is enabled)
	if (plugin.settings.trackFactSourcing) {
		try {
			renderResearchGapsSection(container, options);
		} catch (error) {
			console.error('[Charted Roots] Error rendering Research Gaps section:', error);
		}

		// Source Conflicts Section
		try {
			renderSourceConflictsSection(container, options);
		} catch (error) {
			console.error('[Charted Roots] Error rendering Source Conflicts section:', error);
		}
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
		{ value: 'universes', label: 'Universes', command: 'charted-roots:create-universes-base-template' },
		{ value: 'research', label: 'Research', command: 'charted-roots:create-research-base-template' }
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

function parseResearchQuestions(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map(String).filter(s => s.trim().length > 0);
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		return [value];
	}
	return [];
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
		const questions = parseResearchQuestions(cache?.frontmatter?.needs_research);
		if (questions.length > 0) {
			items.push({
				name: person.name,
				file: person.file,
				type: 'person',
				questions
			});
		}
	}

	// Query events
	const eventService = new EventService(app, plugin.settings);
	const allEvents = eventService.getAllEvents();
	for (const event of allEvents) {
		const cache = app.metadataCache.getFileCache(event.file);
		const questions = parseResearchQuestions(cache?.frontmatter?.needs_research);
		if (questions.length > 0) {
			items.push({
				name: event.title,
				file: event.file,
				type: 'event',
				questions
			});
		}
	}

	// Query places
	// PlaceNode has filePath (string) rather than file (TFile), so resolve it
	const placeGraph = new PlaceGraphService(app);
	const allPlaces = placeGraph.getAllPlaces();
	for (const place of allPlaces) {
		const placeFile = app.vault.getAbstractFileByPath(place.filePath);
		if (!(placeFile instanceof TFile)) continue;
		const cache = app.metadataCache.getFileCache(placeFile);
		const questions = parseResearchQuestions(cache?.frontmatter?.needs_research);
		if (questions.length > 0) {
			items.push({
				name: place.name,
				file: placeFile,
				type: 'place',
				questions
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
		text: `${conflictedProofs.length} unresolved ${pluralize(conflictedProofs.length, 'conflict')}`,
		cls: 'crc-schema-stat-text'
	});

	// Total proofs
	const allProofs = proofService.getAllProofs();
	const proofStat = statsRow.createDiv({ cls: 'crc-schema-stat' });
	const proofIcon = proofStat.createSpan({ cls: 'crc-schema-stat-icon' });
	setIcon(proofIcon, 'scale');
	proofStat.createSpan({
		text: `${allProofs.length} proof ${pluralize(allProofs.length, 'summary', 'summaries')}`,
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
	const familyGraph = plugin.createFamilyGraphService();
	const folderFilter = new FolderFilterService(plugin.settings);

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
		text: `Showing ${filtered.length} ${pluralize(filtered.length, 'issue')}`
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
			text: `${conflictedProofs.length} unresolved ${pluralize(conflictedProofs.length, 'conflict')}`,
			cls: 'crc-schema-stat-text'
		});

		const proofStat = conflictStatsRow.createDiv({ cls: 'crc-schema-stat' });
		setIcon(proofStat.createSpan({ cls: 'crc-schema-stat-icon' }), 'scale');
		proofStat.createSpan({
			text: `${allProofs.length} proof ${pluralize(allProofs.length, 'summary', 'summaries')}`,
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

	const familyGraph = plugin.createFamilyGraphService();
	const folderFilter = new FolderFilterService(plugin.settings);

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
				text: `Showing ${filtered.length} ${pluralize(filtered.length, 'issue')}`
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
	const familyGraph = plugin.createFamilyGraphService();
	const folderFilter = new FolderFilterService(plugin.settings);

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
	const familyGraph = plugin.createFamilyGraphService();
	const folderFilter = new FolderFilterService(plugin.settings);

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

