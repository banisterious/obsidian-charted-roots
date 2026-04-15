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
import { CanvasGenerator, CanvasData, CanvasGenerationOptions } from '../../core/canvas-generator';
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

/**
 * Relationship field data used by handleTreeGeneration
 */
interface RelationshipField {
	name: string;
	crId?: string;
	birthDate?: string;
	deathDate?: string;
}

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
	const { container, plugin, app, showTab, closeModal, openCanvasTree,
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
	bookDesc.setText('Compile reports, trees, and notes into a single PDF or ODT document.');

	const bookActions = bookContent.createDiv({ cls: 'cr-sv-report-card-actions' });
	const bookBtn = bookActions.createEl('button', {
		cls: 'mod-cta',
		text: 'Open book builder'
	});

	bookBtn.addEventListener('click', () => {
		const modal = new BookBuilderModal(plugin);
		modal.open();
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
// Tree generation helper (currently unused but extracted for completeness)
// ---------------------------------------------------------------------------

/**
 * Handle tree generation logic.
 *
 * Note: This method is currently not called by `showTreeGenerationTab` —
 * the Unified Tree Wizard Modal handles generation instead. It is retained
 * here as part of the extraction for potential future use.
 */
async function handleTreeGeneration(
	app: App,
	plugin: CanvasRootsPlugin,
	closeModal: () => void,
	rootPersonField: RelationshipField,
	treeType: 'ancestors' | 'descendants' | 'full',
	maxGenerations: number,
	includeSpouses: boolean,
	includeStepParents: boolean,
	includeAdoptiveParents: boolean,
	direction: 'vertical' | 'horizontal',
	spacingX: number,
	spacingY: number,
	layoutType: LayoutType,
	canvasFileName: string,
	collectionFilter?: string,
	placeFilter?: { placeName: string; types: ('birth' | 'death' | 'marriage' | 'burial')[] },
	styleOverrides?: StyleOverrides
): Promise<void> {
	// Validate root person
	if (!rootPersonField.crId) {
		new Notice('Please select a root person');
		return;
	}

	try {
		new Notice('Generating family tree...');

		// Create tree options
		const treeOptions: TreeOptions = {
			rootCrId: rootPersonField.crId,
			treeType,
			maxGenerations: maxGenerations || undefined,
			includeSpouses,
			includeStepParents,
			includeAdoptiveParents,
			collectionFilter,
			placeFilter
		};

		// Create canvas generation options with embedded metadata
		const canvasOptions: CanvasGenerationOptions = {
			direction,
			nodeSpacingX: spacingX,
			nodeSpacingY: spacingY,
			layoutType: layoutType,
			nodeColorScheme: plugin.settings.nodeColorScheme,
			showLabels: true,
			useFamilyChartLayout: true,  // Use family-chart for proper spouse handling
			parentChildArrowStyle: plugin.settings.parentChildArrowStyle,
			spouseArrowStyle: plugin.settings.spouseArrowStyle,
			parentChildEdgeColor: plugin.settings.parentChildEdgeColor,
			spouseEdgeColor: plugin.settings.spouseEdgeColor,
			showSpouseEdges: plugin.settings.showSpouseEdges,
			spouseEdgeLabelFormat: plugin.settings.spouseEdgeLabelFormat,
			showSourceIndicators: plugin.settings.showSourceIndicators,
			showResearchCoverage: plugin.settings.trackFactSourcing,
			customRelationshipTypes: plugin.settings.customRelationshipTypes,
			canvasRootsMetadata: {
				plugin: 'charted-roots',
				generation: {
					rootCrId: rootPersonField.crId,
					rootPersonName: rootPersonField.name,
					treeType,
					maxGenerations: maxGenerations || 0,
					includeSpouses,
					direction,
					timestamp: Date.now()
				},
				layout: {
					nodeWidth: plugin.settings.defaultNodeWidth,
					nodeHeight: plugin.settings.defaultNodeHeight,
					nodeSpacingX: spacingX,
					nodeSpacingY: spacingY,
					layoutType: layoutType
				},
				// Include style overrides if provided
				styleOverrides: styleOverrides
			}
		};

		// Generate tree
		logger.info('tree-generation', 'Starting tree generation', {
			rootCrId: treeOptions.rootCrId,
			treeType: treeOptions.treeType,
			maxGenerations: treeOptions.maxGenerations
		});

		const graphService = plugin.createFamilyGraphService();
		const familyTree = graphService.generateTree(treeOptions);

		if (!familyTree) {
			logger.error('tree-generation', 'Failed to generate tree: root person not found');
			new Notice('Failed to generate tree: root person not found');
			return;
		}

		// Log tree structure
		logger.info('tree-generation', 'Family tree generated', {
			rootPerson: familyTree.root.name,
			rootCrId: familyTree.root.crId,
			totalNodes: familyTree.nodes.size,
			totalEdges: familyTree.edges.length,
			nodeList: Array.from(familyTree.nodes.values()).map(n => ({
				name: n.name,
				crId: n.crId,
				hasFather: !!n.fatherCrId,
				hasMother: !!n.motherCrId,
				childrenCount: n.childrenCrIds.length
			})),
			edgeList: familyTree.edges.map(e => ({
				from: familyTree.nodes.get(e.from)?.name || e.from,
				to: familyTree.nodes.get(e.to)?.name || e.to,
				type: e.type
			}))
		});

		// Check for disconnected people (only for full trees)
		if (treeOptions.treeType === 'full') {
			const totalPeople = graphService.getTotalPeopleCount();
			const connectedPeople = familyTree.nodes.size;
			const disconnectedCount = totalPeople - connectedPeople;

			if (disconnectedCount > 0) {
				logger.info('tree-generation', 'Disconnected people detected', {
					totalPeople,
					connectedPeople,
					disconnectedCount
				});

				// Show helpful notice to user (persists until dismissed)
				const msg = `Full Family Tree shows ${connectedPeople} of ${totalPeople} people.\n\n` +
					`${disconnectedCount} people are not connected to ${familyTree.root.name} ` +
					`through family relationships.\n\n` +
					`This usually means your vault has multiple separate family trees. ` +
					`Use the "Generate all trees" command to create canvases for all family groups at once.`;

				new Notice(msg, 0); // 0 = persist until user dismisses
			}
		}

		// Generate canvas
		const canvasGenerator = new CanvasGenerator();
		const canvasData = canvasGenerator.generateCanvas(familyTree, canvasOptions);

		// Log canvas generation
		logger.info('canvas-generation', 'Canvas data generated', {
			nodeCount: canvasData.nodes.length,
			edgeCount: canvasData.edges.length,
			canvasNodes: canvasData.nodes.map(n => ({
				id: n.id,
				file: n.file
			}))
		});

		// Determine canvas file name
		let fileName = canvasFileName.trim();
		if (!fileName) {
			// Auto-generate filename with layout type
			const layoutSuffix = layoutType === 'standard' ? '' : ` (${layoutType})`;
			fileName = `Family Tree - ${rootPersonField.name}${layoutSuffix}`;
		}
		if (!fileName.endsWith('.canvas')) {
			fileName += '.canvas';
		}

		// Create canvas file
		// Note: Obsidian uses a specific JSON format: tabs for indentation,
		// but objects within arrays are compact (single line, no spaces)
		const canvasContent = formatCanvasJson(canvasData);

		// Use canvasesFolder setting
		const folder = plugin.settings.canvasesFolder || 'Charted Roots/Canvases';
		await ensureFolderExists(app, folder);
		const filePath = normalizePath(`${folder}/${fileName}`);

		// Log the actual canvas content being written
		logger.info('canvas-generation', 'Canvas JSON content to write', {
			contentLength: canvasContent.length,
			contentPreview: canvasContent.substring(0, 500),
			hasNodes: canvasContent.includes('"nodes"'),
			hasEdges: canvasContent.includes('"edges"')
		});

		let file: TFile;
		const existingFile = app.vault.getAbstractFileByPath(filePath);
		if (existingFile instanceof TFile) {
			// Update existing file
			await app.vault.modify(existingFile, canvasContent);
			file = existingFile;
			new Notice(`Updated existing canvas: ${fileName}`);
		} else {
			// Create new file
			file = await app.vault.create(filePath, canvasContent);
			new Notice(`Created canvas: ${fileName}`);
		}

		// Wait a moment for file system to settle before opening
		// This helps prevent race conditions where Obsidian tries to parse
		// the canvas before the write is fully complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// Save to recent trees history
		const treeInfo: RecentTreeInfo = {
			canvasPath: file.path,
			canvasName: fileName,
			peopleCount: canvasData.nodes.length,
			edgeCount: canvasData.edges.length,
			rootPerson: rootPersonField.name,
			timestamp: Date.now()
		};

		logger.info('tree-generation', 'Saving to recent trees history', {
			treeInfo,
			currentRecentTreesCount: plugin.settings.recentTrees?.length || 0
		});

		// Ensure recentTrees array exists (defensive)
		if (!plugin.settings.recentTrees) {
			plugin.settings.recentTrees = [];
		}

		// Add to beginning of array and keep only last 10
		plugin.settings.recentTrees = [treeInfo, ...plugin.settings.recentTrees].slice(0, 10);

		logger.info('tree-generation', 'After adding to recent trees', {
			newRecentTreesCount: plugin.settings.recentTrees.length,
			recentTrees: plugin.settings.recentTrees
		});

		await plugin.saveSettings();

		logger.info('tree-generation', 'Settings saved successfully');

		// Open the canvas file
		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(file);

		new Notice(`Family tree generated successfully! (${canvasData.nodes.length} people)`);
		closeModal();
	} catch (error: unknown) {
		console.error('Error generating tree:', error);
		new Notice(`Error generating tree: ${getErrorMessage(error)}`);
	}
}

// ---------------------------------------------------------------------------
// GEDCOM helpers
// ---------------------------------------------------------------------------

/**
 * Show GEDCOM analysis before import (v2)
 */
async function showGedcomAnalysis(
	app: App,
	plugin: CanvasRootsPlugin,
	showTab: (tabId: string) => void,
	getCachedFamilyGraph: () => FamilyGraphService,
	file: File,
	analysisContainer: HTMLElement,
	fileBtn: HTMLButtonElement,
	stagingBaseFolder?: string
): Promise<void> {
	try {
		// Show loading state
		analysisContainer.empty();
		analysisContainer.removeClass('cr-hidden');
		fileBtn.addClass('cr-hidden');

		// Determine if using staging or configured folders
		const useStaging = !!stagingBaseFolder;

		analysisContainer.createEl('p', {
			text: `File: ${file.name}`,
			cls: 'crc-text-muted'
		});

		// Show destination info
		if (useStaging) {
			analysisContainer.createEl('p', {
				text: `Destination: ${stagingBaseFolder}/ (People/, Events/, Sources/, Places/)`,
				cls: 'crc-text-muted'
			});
		} else {
			const destFolders = [
				`People → ${plugin.settings.peopleFolder || 'vault root'}`,
				`Events → ${plugin.settings.eventsFolder || 'Events'}`,
				`Sources → ${plugin.settings.sourcesFolder || 'Sources'}`,
				`Places → ${plugin.settings.placesFolder || 'Places'}`
			];
			analysisContainer.createEl('p', {
				text: `Destination: ${destFolders[0]}`,
				cls: 'crc-text-muted'
			});
		}

		const loadingMsg = analysisContainer.createEl('p', {
			text: 'Analyzing file...',
			cls: 'crc-text-muted'
		});

		// Read and analyze file using v2 importer
		const content = await file.text();
		const importerV2 = new GedcomImporterV2(app, plugin);
		const analysis = importerV2.analyzeFile(content);

		// Update UI with analysis results
		loadingMsg.remove();

		const results = analysisContainer.createDiv({ cls: 'crc-analysis-results' });

		// Basic stats
		results.createEl('p', {
			text: `\u2713 ${analysis.individualCount} people found`
		});
		results.createEl('p', {
			text: `\u2713 ${analysis.familyCount} families found`
		});

		// Extended stats from v2 (events, sources, places)
		if (analysis.eventCount > 0) {
			results.createEl('p', {
				text: `\u2713 ${analysis.eventCount} events found`
			});
		}
		if (analysis.sourceCount > 0) {
			results.createEl('p', {
				text: `\u2713 ${analysis.sourceCount} sources found`
			});
		}
		if (analysis.uniquePlaces > 0) {
			results.createEl('p', {
				text: `\u2713 ${analysis.uniquePlaces} places found`
			});
		}

		// Component analysis
		if (analysis.componentCount > 1) {
			results.createEl('p', {
				text: `\u26A0 ${analysis.componentCount} disconnected family groups`,
				cls: 'crc-warning-text'
			});

			const helpText = results.createEl('p', {
				cls: 'crc-text-muted crc-mt-2'
			});
			helpText.appendText('This file contains multiple separate family trees. After import, use the ');
			helpText.createEl('strong', { text: '"Generate all trees"' });
			helpText.appendText(' command to create canvases for all family groups.');
		}

		// Import options (checkboxes for event/source/place notes)
		let createPeopleNotes = true;
		let createEventNotes = analysis.eventCount > 0;
		let createSourceNotes = analysis.sourceCount > 0;
		let createPlaceNotes = analysis.uniquePlaces > 0;

		// Import options section - always show since people toggle is always available
		const optionsSection = analysisContainer.createDiv({ cls: 'crc-import-options crc-mt-4' });
		optionsSection.createEl('p', {
			text: 'Import options',
			cls: 'crc-text-muted crc-font-medium'
		});
		optionsSection.createEl('p', {
			text: 'Choose which note types to create. Disable people notes if you already have them in your vault.',
			cls: 'crc-text-muted crc-text--small crc-mb-2'
		});

		// People notes toggle (always shown)
		const peopleFolder = plugin.settings.peopleFolder || 'People';
		new Setting(optionsSection)
			.setName(`Create people notes (${analysis.individualCount.toLocaleString()} found)`)
			.setDesc(`Person notes with relationships and life events \u2192 ${peopleFolder}/`)
			.addToggle(toggle => toggle
				.setValue(createPeopleNotes)
				.onChange(value => {
					createPeopleNotes = value;
				})
			);

		if (analysis.eventCount > 0) {
			const eventsFolder = plugin.settings.eventsFolder || 'Events';
			new Setting(optionsSection)
				.setName(`Create event notes (${analysis.eventCount.toLocaleString()} found)`)
				.setDesc(`Births, deaths, marriages, and other life events \u2192 ${eventsFolder}/`)
				.addToggle(toggle => toggle
					.setValue(createEventNotes)
					.onChange(value => {
						createEventNotes = value;
					})
				);
		}

		if (analysis.sourceCount > 0) {
			const sourcesFolder = plugin.settings.sourcesFolder || 'Sources';
			new Setting(optionsSection)
				.setName(`Create source notes (${analysis.sourceCount.toLocaleString()} found)`)
				.setDesc(`Citations and references for genealogical records \u2192 ${sourcesFolder}/`)
				.addToggle(toggle => toggle
					.setValue(createSourceNotes)
					.onChange(value => {
						createSourceNotes = value;
					})
				);
		}

		if (analysis.uniquePlaces > 0) {
			const placesFolder = plugin.settings.placesFolder || 'Places';
			new Setting(optionsSection)
				.setName(`Create place notes (${analysis.uniquePlaces.toLocaleString()} found)`)
				.setDesc(`Locations with parent/child hierarchy (city \u2192 county \u2192 state) \u2192 ${placesFolder}/`)
				.addToggle(toggle => toggle
					.setValue(createPlaceNotes)
					.onChange(value => {
						createPlaceNotes = value;
					})
				);
		}

		// Dynamic content blocks toggle
		let includeDynamicBlocks = false;
		new Setting(optionsSection)
			.setName('Include dynamic content blocks')
			.setDesc('Add timeline, family relationships, and media gallery blocks to person notes (can be frozen to static markdown later)')
			.addToggle(toggle => toggle
				.setValue(includeDynamicBlocks)
				.onChange(value => {
					includeDynamicBlocks = value;
				})
			);

		// Filename format options
		let filenameFormat: FilenameFormat = 'original';
		let useAdvancedFormats = false;
		const filenameFormats: FilenameFormatOptions = {
			people: 'original',
			events: 'original',
			sources: 'original',
			places: 'original'
		};

		const formatSection = analysisContainer.createDiv({ cls: 'crc-import-options crc-mt-4' });

		// Main format dropdown (applies to all when not using advanced)
		const mainFormatSetting = new Setting(formatSection)
			.setName('Filename format')
			.setDesc('How to format filenames for all created notes')
			.addDropdown(dropdown => dropdown
				.addOption('original', 'Original (John Smith.md)')
				.addOption('kebab-case', 'Kebab-case (john-smith.md)')
				.addOption('snake_case', 'Snake_case (john_smith.md)')
				.setValue(filenameFormat)
				.onChange(value => {
					filenameFormat = value as FilenameFormat;
					// Sync to all per-type formats when changing main
					filenameFormats.people = filenameFormat;
					filenameFormats.events = filenameFormat;
					filenameFormats.sources = filenameFormat;
					filenameFormats.places = filenameFormat;
				})
			);

		// Advanced toggle
		const advancedContainer = formatSection.createDiv({ cls: 'crc-advanced-formats' });
		const advancedToggle = new Setting(advancedContainer)
			.setName('Customize per note type')
			.setDesc('Set different filename formats for each note type')
			.addToggle(toggle => toggle
				.setValue(useAdvancedFormats)
				.onChange(value => {
					useAdvancedFormats = value;
					advancedSection.toggleClass('cr-hidden', !value);
					mainFormatSetting.settingEl.toggleClass('cr-hidden', value);
				})
			);
		advancedToggle.settingEl.addClass('crc-setting--compact');

		// Per-type format dropdowns (hidden by default)
		const advancedSection = advancedContainer.createDiv({ cls: 'crc-advanced-formats__options cr-hidden' });

		const createFormatDropdown = (
			dropdownContainer: HTMLElement,
			label: string,
			type: keyof FilenameFormatOptions
		) => {
			new Setting(dropdownContainer)
				.setName(label)
				.addDropdown(dropdown => dropdown
					.addOption('original', 'Original')
					.addOption('kebab-case', 'Kebab-case')
					.addOption('snake_case', 'Snake_case')
					.setValue(filenameFormats[type])
					.onChange(value => {
						filenameFormats[type] = value as FilenameFormat;
					})
				)
				.settingEl.addClass('crc-setting--compact');
		};

		createFormatDropdown(advancedSection, 'People', 'people');
		createFormatDropdown(advancedSection, 'Events', 'events');
		createFormatDropdown(advancedSection, 'Sources', 'sources');
		createFormatDropdown(advancedSection, 'Places', 'places');

		// Action buttons
		const actions = analysisContainer.createDiv({ cls: 'crc-gedcom-actions crc-mt-4' });

		const importBtn = actions.createEl('button', {
			cls: 'crc-btn crc-btn--primary',
			text: useStaging ? 'Import to staging' : 'Import to vault'
		});
		importBtn.addEventListener('click', () => {
			void (async () => {
				analysisContainer.addClass('cr-hidden');
				fileBtn.removeClass('cr-hidden');
				await handleGedcomImportV2(
					app,
					plugin,
					showTab,
					getCachedFamilyGraph,
					file,
					stagingBaseFolder,
					createPeopleNotes,
					createEventNotes,
					createSourceNotes,
					createPlaceNotes,
					useAdvancedFormats ? undefined : filenameFormat,
					useAdvancedFormats ? filenameFormats : undefined,
					includeDynamicBlocks
				);
			})();
		});

		const cancelBtn = actions.createEl('button', {
			cls: 'crc-btn crc-btn--secondary crc-ml-2',
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			analysisContainer.addClass('cr-hidden');
			fileBtn.removeClass('cr-hidden');
		});

	} catch (error: unknown) {
		const errorMsg = getErrorMessage(error);
		logger.error('gedcom', `GEDCOM analysis failed: ${errorMsg}`);
		analysisContainer.empty();
		analysisContainer.createEl('p', {
			text: `Failed to analyze file: ${errorMsg}`,
			cls: 'crc-error-text'
		});

		const retryBtn = analysisContainer.createEl('button', {
			cls: 'crc-btn crc-btn--secondary crc-mt-2',
			text: 'Try different file'
		});
		retryBtn.addEventListener('click', () => {
			analysisContainer.addClass('cr-hidden');
			fileBtn.removeClass('cr-hidden');
		});
	}
}

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
		setTimeout(() => progressModal.close(), 1500);

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
		// GEDCOM data already contains complete bidirectional relationships, and running
		// syncImportedRelationships causes corruption when there are duplicate names
		// (e.g., two "John Smith" people) because the sync matches by filename, not cr_id.

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

/**
 * Handle GEDCOM file export
 */
async function handleGedcomExport(
	app: App,
	plugin: CanvasRootsPlugin,
	exportOptions: {
		fileName: string;
		collectionFilter?: string;
		includeCollectionCodes: boolean;
		includeCustomRelationships?: boolean;
		branchRootCrId?: string;
		branchDirection?: 'ancestors' | 'descendants';
		branchIncludeSpouses?: boolean;
		privacyOverride?: {
			enablePrivacyProtection: boolean;
			privacyDisplayFormat: 'living' | 'private' | 'initials' | 'hidden';
		};
		includeEntities?: {
			people: boolean;
			events: boolean;
			sources: boolean;
			places: boolean;
		};
		outputDestination?: 'download' | 'vault';
		outputFolder?: string;
	}
): Promise<void> {
	// Create and open progress modal
	const { ExportProgressModal } = await import('../../ui/export-progress-modal');
	const progressModal = new ExportProgressModal(app, 'GEDCOM');
	progressModal.open();

	try {
		logger.info('gedcom-export', `Starting GEDCOM export: ${exportOptions.fileName}`);

		// Update progress: loading data
		progressModal.updateProgress({ phase: 'loading', current: 0, total: 1 });

		// Create exporter
		const { GedcomExporter } = await import('../../gedcom/gedcom-exporter');
		const exporter = new GedcomExporter(app);

		// Conditionally set services based on includeEntities flags
		const includeEntities = exportOptions.includeEntities ?? {
			people: true,
			events: true,
			sources: true,
			places: true
		};

		if (includeEntities.events) {
			exporter.setEventService(plugin.settings);
		}

		if (includeEntities.sources) {
			exporter.setSourceService(plugin.settings);
		}

		if (includeEntities.places) {
			exporter.setPlaceGraphService(plugin.settings);
		}

		// Set property/value alias services (always needed for person data)
		const { PropertyAliasService } = await import('../../core/property-alias-service');
		const { ValueAliasService } = await import('../../core/value-alias-service');
		const propertyAliasService = new PropertyAliasService(plugin);
		const valueAliasService = new ValueAliasService(plugin);
		exporter.setPropertyAliasService(propertyAliasService);
		exporter.setValueAliasService(valueAliasService);

		// Set relationship service if custom relationships are enabled
		if (exportOptions.includeCustomRelationships) {
			const { RelationshipService } = await import('../../relationships/services/relationship-service');
			const relationshipService = new RelationshipService(plugin);
			exporter.setRelationshipService(relationshipService);
		}

		// Update progress: generating export
		progressModal.updateProgress({ phase: 'generating', current: 1, total: 2 });

		// Export to GEDCOM
		const result = exporter.exportToGedcom({
			peopleFolder: plugin.settings.peopleFolder,
			collectionFilter: exportOptions.collectionFilter,
			branchRootCrId: exportOptions.branchRootCrId,
			branchDirection: exportOptions.branchDirection,
			branchIncludeSpouses: exportOptions.branchIncludeSpouses,
			includeCollectionCodes: exportOptions.includeCollectionCodes,
			includeCustomRelationships: exportOptions.includeCustomRelationships,
			fileName: exportOptions.fileName,
			sourceApp: 'Charted Roots',
			sourceVersion: plugin.manifest.version,
			citationsFolder: plugin.settings.citationsFolder,
			privacySettings: {
				enablePrivacyProtection: exportOptions.privacyOverride?.enablePrivacyProtection ?? plugin.settings.enablePrivacyProtection,
				livingPersonAgeThreshold: plugin.settings.livingPersonAgeThreshold,
				privacyDisplayFormat: exportOptions.privacyOverride?.privacyDisplayFormat ?? plugin.settings.privacyDisplayFormat,
				hideDetailsForLiving: plugin.settings.hideDetailsForLiving
			}
		});

		// Log results
		logger.info('gedcom-export', `Export complete: ${result.individualsExported} individuals, ${result.familiesExported} families`);

		if (result.errors.length > 0) {
			logger.warn('gedcom-export', `Export had ${result.errors.length} errors`);
			result.errors.forEach(error => logger.error('gedcom-export', error));
		}

		// Update stats
		progressModal.updateStats({
			people: result.individualsExported,
			relationships: result.familiesExported
		});

		if (result.success && result.gedcomContent) {
			const outputDestination = exportOptions.outputDestination ?? 'download';

			// Update progress: writing file
			progressModal.updateProgress({ phase: 'writing', current: 2, total: 2 });

			if (outputDestination === 'vault') {
				// Save to vault
				const outputFolder = exportOptions.outputFolder || '';
				const gedFileName = `${result.fileName}.ged`;
				const filePath = outputFolder ? `${outputFolder}/${gedFileName}` : gedFileName;

				await app.vault.adapter.write(filePath, result.gedcomContent);

				// Save last export info
				plugin.settings.lastGedcomExport = {
					timestamp: Date.now(),
					peopleCount: result.individualsExported,
					destination: 'vault',
					filePath: filePath,
					privacyExcluded: result.privacyExcluded
				};
				await plugin.saveSettings();

				let noticeMsg = `GEDCOM saved to vault: ${filePath}`;
				if (result.privacyExcluded && result.privacyExcluded > 0) {
					noticeMsg += ` (${result.privacyExcluded} living excluded)`;
				} else if (result.privacyObfuscated && result.privacyObfuscated > 0) {
					noticeMsg += ` (${result.privacyObfuscated} living obfuscated)`;
				}
				new Notice(noticeMsg);
			} else {
				// Download file
				const blob = new Blob([result.gedcomContent], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${result.fileName}.ged`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				// Save last export info
				plugin.settings.lastGedcomExport = {
					timestamp: Date.now(),
					peopleCount: result.individualsExported,
					destination: 'download',
					privacyExcluded: result.privacyExcluded
				};
				await plugin.saveSettings();

				let noticeMsg = `GEDCOM exported: ${result.individualsExported} people, ${result.familiesExported} families`;
				if (result.privacyExcluded && result.privacyExcluded > 0) {
					noticeMsg += ` (${result.privacyExcluded} living excluded)`;
				} else if (result.privacyObfuscated && result.privacyObfuscated > 0) {
					noticeMsg += ` (${result.privacyObfuscated} living obfuscated)`;
				}
				new Notice(noticeMsg);
			}

			// Mark export as complete
			progressModal.markComplete();

			// Close the modal after a short delay
			setTimeout(() => {
				progressModal.close();
			}, 1500);
		} else {
			throw new Error('Export failed to generate content');
		}
	} catch (error: unknown) {
		const errorMsg = getErrorMessage(error);
		logger.error('gedcom-export', `GEDCOM export failed: ${errorMsg}`);
		new Notice(`Failed to export GEDCOM: ${errorMsg}`);
		progressModal.close();
	}
}
