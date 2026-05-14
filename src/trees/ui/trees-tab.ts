/**
 * Trees & Reports tab for the Control Center
 *
 * Displays canvas tree overview, recent trees, tips, reports, visual trees,
 * and canvas settings. Also contains GEDCOM import/export helpers and
 * reference numbering prompts used after import.
 */

import { Modal, Notice, Setting, TFile, normalizePath, setIcon } from 'obsidian';
import type { App } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { createLucideIcon } from '../../ui/lucide-icons';
import { CanvasGenerator, CanvasGenerationOptions } from '../../core/canvas-generator';
import type { TreeOptions } from '../../core/family-graph';
import { ensureFolderExists, formatCanvasJson } from '../../core/canvas-utils';
import { getErrorMessage } from '../../core/error-utils';
import { getLogger } from '../../core/logging';
import { GedcomImporterV2 } from '../../gedcom/gedcom-importer-v2';
import type { GedcomImportOptionsV2, FilenameFormat, FilenameFormatOptions, GedcomDataV2 } from '../../gedcom/gedcom-types';
import { analyzeGedcomQuality, applyQualityFixes } from '../../gedcom/gedcom-quality-analyzer';
import { GedcomQualityPreviewModal } from '../../ui/gedcom-quality-preview-modal';
import { GedcomImportProgressModal } from '../../ui/gedcom-import-progress-modal';
import { PersonPickerModal } from '../../ui/person-picker';
import { ReferenceNumberingService } from '../../core/reference-numbering';
import type { NumberingSystem } from '../../core/reference-numbering';
import type { RecentTreeInfo, RecentImportInfo, LayoutType } from '../../settings';
import type { StyleOverrides } from '../../core/canvas-style-overrides';
import { renderCanvasLayoutCard, renderCanvasStylingCard } from '../../ui/preferences-tab';
import { UnifiedTreeWizardModal } from './unified-tree-wizard-modal';
import { REPORT_METADATA } from '../../reports/types/report-types';
import type { ReportType } from '../../reports/types/report-types';
import { ReportWizardModal } from '../../reports/ui/report-wizard-modal';
import { BookBuilderModal } from '../../book/ui/book-builder-modal';
import type { FamilyGraphService } from '../../core/family-graph';

const logger = getLogger('TreesTab');

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface TreesTabOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	app: App;
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement;
	showTab: (tabId: string) => void;
	closeModal: () => void;
	openCanvasTree: (canvasPath: string) => Promise<void>;
	showRecentTreeContextMenu: (event: MouseEvent, tree: RecentTreeInfo) => void;
	openAndGenerateAllTrees: () => Promise<void>;
	formatTimeAgo: (timestamp: number) => string;
	getCachedFamilyGraph: () => FamilyGraphService;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Render the Trees & Reports tab content into the given container.
 */
export function renderTreesTab(options: TreesTabOptions): void {
	showTreeGenerationTab(options);
}


// ---------------------------------------------------------------------------
// Tab renderer
// ---------------------------------------------------------------------------

/**
 * Render the Canvas Trees tab.
 *
 * Shows stats, quick actions, recent trees, tips, reports, visual trees,
 * and canvas layout / styling cards.
 */
function showTreeGenerationTab(options: TreesTabOptions): void {
	const { container, plugin, showTab, openCanvasTree,
		showRecentTreeContextMenu, openAndGenerateAllTrees, formatTimeAgo, createCard } = options;

	// Get data
	const graphService = plugin.createFamilyGraphService();
	const familyComponents = graphService.findAllFamilyComponents();
	const recentTrees = plugin.settings.recentTrees?.slice(0, 10) || [];
	const totalPeopleInTrees = recentTrees.reduce((sum, t) => sum + (t.peopleCount || 0), 0);
	const totalPeopleInVault = familyComponents.reduce((sum, c) => sum + c.size, 0);

	// === Overview Card ===
	const overviewCard = container.createDiv({ cls: 'crc-tree-card' });

	// Card header with title and actions
	const cardHeader = overviewCard.createDiv({ cls: 'crc-tree-card__header' });
	const titleSection = cardHeader.createDiv({ cls: 'crc-tree-card__title-section' });
	titleSection.appendChild(createLucideIcon('git-branch', 20));
	titleSection.createSpan({ text: 'Canvas Trees', cls: 'crc-tree-card__title' });

	// Quick actions in header
	const actionsSection = cardHeader.createDiv({ cls: 'crc-tree-card__actions' });

	const newTreeBtn = actionsSection.createEl('button', { cls: 'cr-btn cr-btn--primary' });
	newTreeBtn.appendChild(createLucideIcon('plus', 16));
	newTreeBtn.appendText('New Tree');
	newTreeBtn.addEventListener('click', () => {
		const wizard = new UnifiedTreeWizardModal(plugin, {
			onComplete: () => showTab('tree-generation')
		});
		wizard.open();
	});

	if (recentTrees.length > 0) {
		const openLatestBtn = actionsSection.createEl('button', { cls: 'cr-btn cr-btn--secondary' });
		openLatestBtn.appendChild(createLucideIcon('external-link', 16));
		openLatestBtn.appendText('Open Latest');
		openLatestBtn.addEventListener('click', () => {
			void openCanvasTree(recentTrees[0].canvasPath);
		});
	}

	if (familyComponents.length > 1) {
		const allTreesBtn = actionsSection.createEl('button', { cls: 'cr-btn cr-btn--secondary' });
		allTreesBtn.appendChild(createLucideIcon('network', 16));
		allTreesBtn.appendText(`Generate All (${familyComponents.length})`);
		allTreesBtn.addEventListener('click', () => {
			void openAndGenerateAllTrees();
		});
	}

	// Stats grid
	const statsGrid = overviewCard.createDiv({ cls: 'crc-tree-card__stats' });

	const stats = [
		{ value: recentTrees.length, label: 'Trees', icon: 'file' as const },
		{ value: totalPeopleInTrees, label: 'In Trees', icon: 'users' as const },
		{ value: familyComponents.length, label: 'Families', icon: 'home' as const },
		{ value: totalPeopleInVault, label: 'In Vault', icon: 'user' as const }
	];

	stats.forEach(stat => {
		const statBox = statsGrid.createDiv({ cls: 'crc-tree-stat-box' });
		const iconEl = statBox.createDiv({ cls: 'crc-tree-stat-box__icon' });
		iconEl.appendChild(createLucideIcon(stat.icon, 16));
		statBox.createDiv({ cls: 'crc-tree-stat-box__value', text: String(stat.value) });
		statBox.createDiv({ cls: 'crc-tree-stat-box__label', text: stat.label });
	});

	// === Recent Trees Card ===
	const recentCard = container.createDiv({ cls: 'crc-tree-card' });
	const recentHeader = recentCard.createDiv({ cls: 'crc-tree-card__header crc-tree-card__header--simple' });
	recentHeader.appendChild(createLucideIcon('clock', 18));
	recentHeader.createSpan({ text: 'Recent trees', cls: 'crc-tree-card__title' });
	if (recentTrees.length > 0) {
		recentHeader.createSpan({ text: String(recentTrees.length), cls: 'crc-tree-card__badge' });
	}

	const recentContent = recentCard.createDiv({ cls: 'crc-tree-card__content' });

	if (recentTrees.length > 0) {
		recentTrees.forEach((tree, index) => {
			const treeItem = recentContent.createDiv({
				cls: `crc-recent-tree-item ${index > 0 ? 'crc-recent-tree-item--bordered' : ''}`
			});

			const treeInfo = treeItem.createDiv({ cls: 'crc-recent-tree-info' });

			const titleRow = treeInfo.createDiv({ cls: 'crc-recent-tree-title' });
			titleRow.appendChild(createLucideIcon('git-branch', 16));
			titleRow.createSpan({
				text: tree.canvasName.replace('.canvas', ''),
				cls: 'crc-recent-tree-name'
			});

			const metaRow = treeInfo.createDiv({ cls: 'crc-recent-tree-meta' });
			metaRow.createSpan({ text: `${tree.peopleCount} people`, cls: 'crc-badge crc-badge--small' });
			if (tree.rootPerson) {
				metaRow.createSpan({ text: ' · ', cls: 'crc-text-muted' });
				metaRow.createSpan({ text: `Root: ${tree.rootPerson}`, cls: 'crc-text-muted crc-text-sm' });
			}
			if (tree.timestamp) {
				metaRow.createSpan({ text: ' · ', cls: 'crc-text-muted' });
				metaRow.createSpan({ text: formatTimeAgo(tree.timestamp), cls: 'crc-text-muted crc-text-sm' });
			}

			const actionRow = treeItem.createDiv({ cls: 'crc-recent-tree-actions' });

			const openBtn = actionRow.createEl('button', {
				cls: 'crc-btn crc-btn--icon crc-btn--ghost',
				attr: { 'aria-label': 'Open canvas' }
			});
			openBtn.appendChild(createLucideIcon('external-link', 14));
			openBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				void openCanvasTree(tree.canvasPath);
			});

			const moreBtn = actionRow.createEl('button', {
				cls: 'crc-btn crc-btn--icon crc-btn--ghost',
				attr: { 'aria-label': 'More actions' }
			});
			moreBtn.appendChild(createLucideIcon('more-vertical', 14));
			moreBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				showRecentTreeContextMenu(e, tree);
			});

			treeItem.addEventListener('click', () => {
				void openCanvasTree(tree.canvasPath);
			});
		});
	} else {
		// Empty state
		const emptyState = recentContent.createDiv({ cls: 'crc-tree-empty-state' });
		const emptyIcon = emptyState.createDiv({ cls: 'crc-tree-empty-icon' });
		emptyIcon.appendChild(createLucideIcon('git-branch', 40));
		emptyState.createEl('p', {
			text: 'No trees yet. Click "New Tree" to create your first canvas.',
			cls: 'crc-text-muted'
		});
	}

	// === Tips Card ===
	const tipsCard = container.createDiv({ cls: 'crc-tree-card crc-tree-card--muted' });
	const tipsHeader = tipsCard.createDiv({ cls: 'crc-tree-card__header crc-tree-card__header--simple' });
	tipsHeader.appendChild(createLucideIcon('lightbulb', 18));
	tipsHeader.createSpan({ text: 'Tips', cls: 'crc-tree-card__title' });

	const tipsContent = tipsCard.createDiv({ cls: 'crc-tree-card__content' });
	const tipsList = tipsContent.createEl('ul', { cls: 'crc-tree-tips-list' });
	const tips = [
		'Use "Ancestors" or "Descendants" for focused lineage views.',
		'Filter by collection to generate trees for specific branches.',
		'Right-click recent trees for regenerate, reveal, or delete options.'
	];
	tips.forEach(tip => tipsList.createEl('li', { text: tip }));

	// === Book Builder Card ===
	const bookCard = container.createDiv({ cls: 'crc-tree-card' });
	const bookHeader = bookCard.createDiv({ cls: 'crc-tree-card__header crc-tree-card__header--simple' });
	bookHeader.appendChild(createLucideIcon('book', 18));
	bookHeader.createSpan({ text: 'Book builder', cls: 'crc-tree-card__title' });

	const bookContent = bookCard.createDiv({ cls: 'crc-tree-card__content' });
	const bookDesc = bookContent.createDiv({ cls: 'crc-text-muted crc-mb-2' });
	bookDesc.setText('Compile reports, trees, and notes into a single PDF or ODT activeDocument.');

	const bookActions = bookContent.createDiv({ cls: 'cr-sv-report-card-actions' });
	const bookBtn = bookActions.createEl('button', {
		cls: 'mod-cta',
		text: 'Open book builder'
	});

	bookBtn.addEventListener('click', () => {
		const modal = new BookBuilderModal(plugin);
		modal.open();
	});

	// === Report Wizard Card (#372) ===
	const wizardCard = container.createDiv({ cls: 'crc-tree-card' });
	const wizardHeader = wizardCard.createDiv({ cls: 'crc-tree-card__header crc-tree-card__header--simple' });
	wizardHeader.appendChild(createLucideIcon('wand', 18));
	wizardHeader.createSpan({ text: 'Report wizard', cls: 'crc-tree-card__title' });

	const wizardContent = wizardCard.createDiv({ cls: 'crc-tree-card__content' });
	const wizardDesc = wizardContent.createDiv({ cls: 'crc-text-muted crc-mb-2' });
	wizardDesc.setText('Step-by-step wizard to generate any report type with options.');

	const wizardActions = wizardContent.createDiv({ cls: 'cr-sv-report-card-actions' });
	const wizardBtn = wizardActions.createEl('button', {
		cls: 'mod-cta',
		text: 'Open report wizard'
	});

	wizardBtn.addEventListener('click', () => {
		void import('../../reports/ui/report-wizard-modal').then(({ ReportWizardModal }) => {
			new ReportWizardModal(plugin).open();
		});
	});

	// === Reports Card ===
	const reportsCard = container.createDiv({ cls: 'crc-tree-card' });
	const reportsHeader = reportsCard.createDiv({ cls: 'crc-tree-card__header crc-tree-card__header--simple' });
	reportsHeader.appendChild(createLucideIcon('file-text', 18));
	reportsHeader.createSpan({ text: 'Reports', cls: 'crc-tree-card__title' });

	const reportsContent = reportsCard.createDiv({ cls: 'crc-tree-card__content' });
	const reportsDesc = reportsContent.createDiv({ cls: 'crc-text-muted crc-mb-2' });
	reportsDesc.setText('Generate formatted reports from your genealogy data.');

	const reportsGrid = reportsContent.createDiv({ cls: 'cr-sv-reports-grid' });

	// Create a card for each report type (excluding visual trees which use the tree wizard)
	for (const [type, metadata] of Object.entries(REPORT_METADATA)) {
		// Skip visual trees - they're generated via the tree wizard above
		if (metadata.category === 'visual-trees') continue;

		const reportCard = reportsGrid.createDiv({ cls: 'cr-sv-report-card' });

		const reportCardHeader = reportCard.createDiv({ cls: 'cr-sv-report-card-header' });
		const iconEl = reportCardHeader.createSpan({ cls: 'cr-sv-report-card-icon' });
		setIcon(iconEl, metadata.icon);
		reportCardHeader.createSpan({ cls: 'cr-sv-report-card-title', text: metadata.name });

		reportCard.createDiv({ cls: 'cr-sv-report-card-desc crc-text-muted', text: metadata.description });

		const reportCardActions = reportCard.createDiv({ cls: 'cr-sv-report-card-actions' });
		const generateBtn = reportCardActions.createEl('button', {
			cls: 'mod-cta',
			text: 'Generate'
		});

		generateBtn.addEventListener('click', () => {
			const modal = new ReportWizardModal(plugin, {
				reportType: type as ReportType
			});
			modal.open();
		});
	}

	// === Visual Trees Card (PDF exports) ===
	const visualTreesCard = container.createDiv({ cls: 'crc-tree-card' });
	const visualTreesHeader = visualTreesCard.createDiv({ cls: 'crc-tree-card__header crc-tree-card__header--simple' });
	visualTreesHeader.appendChild(createLucideIcon('file-image', 18));
	visualTreesHeader.createSpan({ text: 'Visual trees', cls: 'crc-tree-card__title' });

	const visualTreesContent = visualTreesCard.createDiv({ cls: 'crc-tree-card__content' });
	const visualTreesDesc = visualTreesContent.createDiv({ cls: 'crc-text-muted crc-mb-2' });
	visualTreesDesc.setText('Generate printable PDF tree diagrams with positioned boxes and connecting lines.');

	const visualTreesGrid = visualTreesContent.createDiv({ cls: 'cr-sv-reports-grid' });

	// Visual tree type mapping for the unified wizard
	const visualTreeTypes: Record<string, 'full' | 'ancestors' | 'descendants' | 'fan'> = {
		'pedigree-tree-pdf': 'ancestors',
		'descendant-tree-pdf': 'descendants',
		'hourglass-tree-pdf': 'full',
		'fan-chart-pdf': 'fan'
	};

	// Create a card for each visual tree report
	for (const [type, metadata] of Object.entries(REPORT_METADATA)) {
		if (metadata.category !== 'visual-trees') continue;
		if (metadata.hidden) continue;

		const vtCard = visualTreesGrid.createDiv({ cls: 'cr-sv-report-card' });

		const vtCardHeader = vtCard.createDiv({ cls: 'cr-sv-report-card-header' });
		const vtIconEl = vtCardHeader.createSpan({ cls: 'cr-sv-report-card-icon' });
		setIcon(vtIconEl, metadata.icon);
		vtCardHeader.createSpan({ cls: 'cr-sv-report-card-title', text: metadata.name });

		vtCard.createDiv({ cls: 'cr-sv-report-card-desc crc-text-muted', text: metadata.description });

		const vtCardActions = vtCard.createDiv({ cls: 'cr-sv-report-card-actions' });
		const vtGenerateBtn = vtCardActions.createEl('button', {
			cls: 'mod-cta',
			text: 'Generate'
		});

		vtGenerateBtn.addEventListener('click', () => {
			const wizard = new UnifiedTreeWizardModal(plugin, {
				outputFormat: 'pdf',
				treeType: visualTreeTypes[type]
			});
			wizard.open();
		});
	}

	// === Canvas Settings Section ===
	// Canvas Layout and Styling cards (moved from Preferences tab)
	renderCanvasLayoutCard(container, plugin, createCard);
	renderCanvasStylingCard(container, plugin, createCard);
}

// ---------------------------------------------------------------------------
// GEDCOM helpers
// ---------------------------------------------------------------------------

/**
 * Handle GEDCOM file import using v2 importer
 */
async function handleGedcomImportV2(
	app: App,
	plugin: CanvasRootsPlugin,
	showTab: (tabId: string) => void,
	getCachedFamilyGraph: () => FamilyGraphService,
	file: File,
	stagingBaseFolder: string | undefined,
	createPeopleNotes: boolean,
	createEventNotes: boolean,
	createSourceNotes: boolean,
	createPlaceNotes: boolean,
	filenameFormat?: FilenameFormat,
	filenameFormats?: FilenameFormatOptions,
	includeDynamicBlocks?: boolean
): Promise<void> {
	try {
		const useStaging = !!stagingBaseFolder;
		logger.info('gedcom', `Starting GEDCOM v2 import: ${file.name} to ${useStaging ? stagingBaseFolder : 'configured folders'}`);

		// Read file content
		const content = await file.text();

		// Create v2 importer
		const importer = new GedcomImporterV2(app, plugin);

		// Parse and validate GEDCOM first (for quality preview)
		const parseResult = importer.parseContent(content);
		if (!parseResult.valid || !parseResult.data) {
			new Notice(`Invalid GEDCOM file: ${parseResult.errors.join(', ')}`);
			return;
		}

		// Analyze data quality
		const qualityAnalysis = analyzeGedcomQuality(parseResult.data);

		// Show quality preview modal if there are issues or place variants
		const hasIssues = qualityAnalysis.summary.totalIssues > 0;
		const hasVariants = qualityAnalysis.summary.placeVariants.length > 0;

		if (hasIssues || hasVariants) {
			// Show quality preview and wait for user decision
			const previewResult = await new Promise<{ proceed: boolean; data: GedcomDataV2 }>((resolve) => {
				const previewModal = new GedcomQualityPreviewModal(app, qualityAnalysis, {
					onComplete: (result) => {
						if (result.proceed) {
							// Apply user's fix choices to the data
							applyQualityFixes(parseResult.data!, result.choices);
						}
						resolve({ proceed: result.proceed, data: parseResult.data! });
					}
				});
				previewModal.open();
			});

			if (!previewResult.proceed) {
				logger.info('gedcom', 'Import cancelled by user after quality preview');
				return;
			}

			// Continue with the (potentially modified) data
			await executeGedcomImport(
				app,
				plugin,
				showTab,
				getCachedFamilyGraph,
				content,
				previewResult.data,
				importer,
				useStaging,
				stagingBaseFolder,
				createPeopleNotes,
				createEventNotes,
				createSourceNotes,
				createPlaceNotes,
				filenameFormat,
				filenameFormats,
				file.name,
				includeDynamicBlocks
			);
		} else {
			// No issues - proceed directly
			await executeGedcomImport(
				app,
				plugin,
				showTab,
				getCachedFamilyGraph,
				content,
				parseResult.data,
				importer,
				useStaging,
				stagingBaseFolder,
				createPeopleNotes,
				createEventNotes,
				createSourceNotes,
				createPlaceNotes,
				filenameFormat,
				filenameFormats,
				file.name,
				includeDynamicBlocks
			);
		}
	} catch (error: unknown) {
		const errorMsg = getErrorMessage(error);
		logger.error('gedcom', `GEDCOM v2 import failed: ${errorMsg}`);
		new Notice(`Failed to import GEDCOM: ${errorMsg}`);
	}
}

/**
 * Execute the actual GEDCOM import with pre-parsed data
 */
async function executeGedcomImport(
	app: App,
	plugin: CanvasRootsPlugin,
	showTab: (tabId: string) => void,
	getCachedFamilyGraph: () => FamilyGraphService,
	content: string,
	gedcomData: GedcomDataV2,
	importer: GedcomImporterV2,
	useStaging: boolean,
	stagingBaseFolder: string | undefined,
	createPeopleNotes: boolean,
	createEventNotes: boolean,
	createSourceNotes: boolean,
	createPlaceNotes: boolean,
	filenameFormat?: FilenameFormat,
	filenameFormats?: FilenameFormatOptions,
	fileName?: string,
	includeDynamicBlocks?: boolean
): Promise<void> {
	// Disable bidirectional sync during import to prevent duplicate relationships
	// The file watcher would otherwise trigger syncRelationships before Phase 2 replaces GEDCOM IDs with cr_ids
	plugin.disableBidirectionalSync();
	plugin.bidirectionalLinker?.suspend();

	// Show progress modal
	const progressModal = new GedcomImportProgressModal(app);
	progressModal.open();

	try {
		// Build import options - use staging subfolders or configured folders
		const options: GedcomImportOptionsV2 = {
			peopleFolder: useStaging
				? `${stagingBaseFolder}/People`
				: (plugin.settings.peopleFolder || 'People'),
			eventsFolder: useStaging
				? `${stagingBaseFolder}/Events`
				: (plugin.settings.eventsFolder || 'Events'),
			sourcesFolder: useStaging
				? `${stagingBaseFolder}/Sources`
				: (plugin.settings.sourcesFolder || 'Sources'),
			placesFolder: useStaging
				? `${stagingBaseFolder}/Places`
				: (plugin.settings.placesFolder || 'Places'),
			overwriteExisting: false,
			fileName: fileName,
			createPeopleNotes,
			createEventNotes,
			createSourceNotes,
			createPlaceNotes,
			filenameFormat: filenameFormat || 'original',
			filenameFormats,
			propertyAliases: plugin.settings.propertyAliases,
			includeDynamicBlocks,
			dynamicBlockTypes: ['media', 'timeline', 'relationships'],
			onProgress: (progress) => {
				progressModal.updateProgress({
					phase: progress.phase,
					current: progress.current,
					total: progress.total,
					message: progress.message
				});
				// Update running stats based on phase
				if (progress.phase === 'places' && progress.current > 0) {
					progressModal.updateStats({ places: progress.current });
				} else if (progress.phase === 'sources' && progress.current > 0) {
					progressModal.updateStats({ sources: progress.current });
				} else if (progress.phase === 'people' && progress.current > 0) {
					progressModal.updateStats({ people: progress.current });
				} else if (progress.phase === 'events' && progress.current > 0) {
					progressModal.updateStats({ events: progress.current });
				}
			}
		};

		// Import GEDCOM file with pre-parsed data
		const result = await importer.importFile(content, options, gedcomData);

		// Mark progress as complete and close modal after a brief delay
		progressModal.markComplete();
		window.setTimeout(() => progressModal.close(), 1500);

		// Log results
		logger.info('gedcom', `Import complete: ${result.individualsImported} people, ${result.eventsCreated} events, ${result.sourcesCreated} sources, ${result.placesCreated} places`);

		if (result.errors.length > 0) {
			logger.warn('gedcom', `Import had ${result.errors.length} errors`);
			result.errors.forEach(error => logger.error('gedcom', error));
		}

		// Track import in recent imports history
		const totalNotesCreated = result.individualsImported + result.eventsCreated + result.sourcesCreated + result.placesCreated;
		if (result.success && totalNotesCreated > 0 && fileName) {
			const importInfo: RecentImportInfo = {
				fileName: fileName,
				recordsImported: result.individualsImported,
				notesCreated: totalNotesCreated,
				timestamp: Date.now()
			};

			plugin.settings.recentImports.unshift(importInfo);
			if (plugin.settings.recentImports.length > 10) {
				plugin.settings.recentImports = plugin.settings.recentImports.slice(0, 10);
			}
			await plugin.saveSettings();
		}

		// Note: Bidirectional relationship sync after GEDCOM import is intentionally skipped.
		// GEDCOM data already contains complete bidirectional relationships, and re-running
		// a filename-based post-import sync corrupts them when duplicate names exist
		// (e.g., two "John Smith" people) because it matches by filename, not cr_id.

		// Show results notice
		let noticeMsg = `Import complete: ${result.individualsImported} people`;
		if (result.eventsCreated > 0) {
			noticeMsg += `, ${result.eventsCreated} events`;
		}
		if (result.sourcesCreated > 0) {
			noticeMsg += `, ${result.sourcesCreated} sources`;
		}
		if (result.errors.length > 0) {
			noticeMsg += `. ${result.errors.length} errors occurred`;
		}
		new Notice(noticeMsg, 8000);

		// Auto-create bases for imported note types (silently, skips if already exist)
		if (totalNotesCreated > 0) {
			await plugin.createAllBases({ silent: true });
		}

		// Refresh dashboard to show updated stats
		if (totalNotesCreated > 0) {
			showTab('dashboard');
		}

		// If successful, offer to assign reference numbers
		if (result.success && result.individualsImported > 0) {
			promptAssignReferenceNumbersAfterImport(app, plugin, getCachedFamilyGraph);
		}
	} catch (error: unknown) {
		progressModal.close();
		const errorMsg = getErrorMessage(error);
		logger.error('gedcom', `GEDCOM v2 import failed: ${errorMsg}`);
		new Notice(`Failed to import GEDCOM: ${errorMsg}`);
	} finally {
		// Re-enable bidirectional sync and resume linker after import completes (success or failure)
		plugin.enableBidirectionalSync();
		plugin.bidirectionalLinker?.resume();
	}
}

/**
 * Prompt user to assign reference numbers after GEDCOM import
 */
function promptAssignReferenceNumbersAfterImport(
	app: App,
	plugin: CanvasRootsPlugin,
	getCachedFamilyGraph: () => FamilyGraphService
): void {
	// Get person count for preview
	const graphService = plugin.createFamilyGraphService();
	const allPeople = graphService.getAllPeople();
	const personCount = allPeople.length;

	// Show menu to select numbering system
	const systemChoices: { system: NumberingSystem; icon: string; label: string; description: string }[] = [
		{ system: 'ahnentafel', icon: 'arrow-up', label: 'Ahnentafel', description: 'Best for pedigree charts \u2014 numbers ancestors (1=self, 2=father, 3=mother, 4=paternal grandfather...)' },
		{ system: 'daboville', icon: 'git-branch', label: "d'Aboville", description: 'Best for descendant reports \u2014 clear lineage paths using dots (1.1, 1.2, 1.1.1)' },
		{ system: 'henry', icon: 'list-ordered', label: 'Henry', description: 'Compact descendant numbering \u2014 shorter than d\'Aboville but uses letters after 9 children' },
		{ system: 'generation', icon: 'layers', label: 'Generation', description: 'Shows generational distance from root person (0=self, \u22121=parents, +1=children)' }
	];

	// Create a simple selection modal
	const modal = new Modal(app);
	modal.titleEl.setText('Assign reference numbers');

	const content = modal.contentEl;
	content.addClass('cr-ref-numbers-modal');

	content.createEl('p', {
		text: 'Reference numbers uniquely identify individuals when names are ambiguous and follow standard genealogical notation for sharing research.',
		cls: 'crc-text-muted'
	});

	// Person count preview
	if (personCount > 0) {
		const previewEl = content.createDiv({ cls: 'cr-ref-numbers-preview' });
		previewEl.createSpan({ text: `This will update ` });
		previewEl.createEl('strong', { text: `${personCount} person${personCount !== 1 ? 's' : ''}` });
		previewEl.createSpan({ text: ' in your tree.' });
	}

	const buttonContainer = content.createDiv({ cls: 'cr-numbering-system-buttons' });

	for (const choice of systemChoices) {
		const btn = buttonContainer.createDiv({
			cls: 'cr-numbering-btn'
		});

		// Icon
		const iconSpan = btn.createSpan({ cls: 'cr-numbering-btn-icon' });
		setIcon(iconSpan, choice.icon);

		// Text content
		const textContainer = btn.createDiv({ cls: 'cr-numbering-btn-text' });
		textContainer.createEl('div', { cls: 'cr-numbering-btn-label', text: choice.label });
		textContainer.createEl('div', { cls: 'cr-numbering-btn-desc', text: choice.description });

		btn.addEventListener('click', () => {
			modal.close();
			selectRootPersonForNumbering(app, getCachedFamilyGraph, choice.system);
		});
	}

	// Footer with skip link and learn more
	const footerContainer = content.createDiv({ cls: 'cr-ref-numbers-footer' });

	const skipLink = footerContainer.createEl('a', {
		cls: 'cr-ref-numbers-skip',
		text: 'Skip for now'
	});
	skipLink.addEventListener('click', (e) => {
		e.preventDefault();
		modal.close();
	});

	const learnMoreLink = footerContainer.createEl('a', {
		cls: 'cr-ref-numbers-learn-more',
		text: 'Learn more',
		href: 'https://github.com/banisterious/obsidian-charted-roots/wiki/Relationship-Tools#reference-numbering-systems'
	});
	learnMoreLink.setAttr('target', '_blank');
	learnMoreLink.setAttr('rel', 'noopener noreferrer');

	modal.open();
}

/**
 * Select root person and assign reference numbers
 */
function selectRootPersonForNumbering(
	app: App,
	getCachedFamilyGraph: () => FamilyGraphService,
	system: NumberingSystem
): void {
	// Build context-specific title and subtitle based on numbering system
	const systemInfo: Record<NumberingSystem, { title: string; subtitle: string }> = {
		ahnentafel: {
			title: 'Select root person',
			subtitle: 'This person will be #1; ancestors are numbered upward'
		},
		daboville: {
			title: 'Select progenitor',
			subtitle: 'This person will be 1; descendants are numbered downward'
		},
		henry: {
			title: 'Select progenitor',
			subtitle: 'This person will be 1; descendants are numbered downward'
		},
		generation: {
			title: 'Select reference person',
			subtitle: 'This person will be generation 0'
		}
	};

	const { title, subtitle } = systemInfo[system];

	const picker = new PersonPickerModal(app, (selectedPerson) => {
		void (async () => {
			try {
				const service = new ReferenceNumberingService(app);
				new Notice(`Assigning ${system} numbers from ${selectedPerson.name}...`);

				let stats;
				switch (system) {
					case 'ahnentafel':
						stats = await service.assignAhnentafel(selectedPerson.crId);
						break;
					case 'daboville':
						stats = await service.assignDAboville(selectedPerson.crId);
						break;
					case 'henry':
						stats = await service.assignHenry(selectedPerson.crId);
						break;
					case 'generation':
						stats = await service.assignGeneration(selectedPerson.crId);
						break;
				}

				new Notice(`Assigned ${stats.totalAssigned} ${system} numbers from ${stats.rootPerson}`);
			} catch (error) {
				logger.error('reference-numbering', `Failed to assign ${system} numbers`, error);
				new Notice(`Failed to assign numbers: ${getErrorMessage(error)}`);
			}
		})();
	}, { title, subtitle, familyGraph: getCachedFamilyGraph() });
	picker.open();
}
