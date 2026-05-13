/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { App, Menu, Modal, Notice, Platform, TFile, setIcon, normalizePath } from 'obsidian';
import CanvasRootsPlugin from '../../main';
import { TAB_CONFIGS, NAV_GROUPS, TOOL_CONFIGS, createLucideIcon, setLucideIcon, LucideIconName } from './lucide-icons';
import { ensureFolderExists } from '../core/canvas-utils';
import { FamilyGraphService, TreeOptions } from '../core/family-graph';
import { CanvasGenerator } from '../core/canvas-generator';
import { getLogger } from '../core/logging';
import { getErrorMessage } from '../core/error-utils';
import { pluralize } from '../utils/format-utils';
import type { RecentTreeInfo } from '../settings';
import { ConfirmationModal } from './data-quality-modals';
import { renderDataQualityTab } from './data-quality-tab';
import {
	previewRemoveDuplicateRelationships,
	removeDuplicateRelationships,
	previewRemovePlaceholders,
	removePlaceholders,
	previewAddPersonType,
	addPersonType,
	previewNormalizeNames,
	normalizeNames,
	previewFixBidirectionalRelationships,
	fixBidirectionalRelationships,
	previewDetectImpossibleDates,
	previewValidateDates,
	validateDates
} from './data-quality-batch-ops';
import { PlaceGraphService } from '../core/place-graph';
import { createUniverseService } from '../universes/services/universe-service';
import { mergeUniverseList } from '../universes/services/merged-universe-list';
import { CreatePlaceModal } from './create-place-modal';
import { TemplateSnippetsModal } from './template-snippets-modal';
import { renderSchemasTab } from '../schemas/ui/schemas-tab';
import { renderCollectionsTab } from './collections-tab';
import { renderMapsTab } from '../maps/ui/maps-tab';
import { renderRelationshipsTab } from '../relationships';
import { renderEventsTab } from '../dates';
import { renderOrganizationsTab } from '../organizations';
import { renderPersonTimeline } from '../events/ui/person-timeline';
import { renderFamilyTimeline } from '../events/ui/family-timeline';
import { EventService } from '../events/services/event-service';
import { renderDashboardTab } from './dashboard-tab';
import { renderPlacesTab } from './places-tab';
import { renderPeopleTab } from './people-tab';
import { MediaManagerModal } from '../core/ui/media-manager-modal';
import {
	renderSourcesTab
} from '../sources';
import { renderUniversesTab } from '../universes/ui/universes-tab';
import { UnifiedTreeWizardModal } from '../trees/ui/unified-tree-wizard-modal';
import { renderTreesTab } from '../trees/ui/trees-tab';
import { formatCanvasJson } from '../core/canvas-utils';

const logger = getLogger('ControlCenter');

/**
 * Charted Roots Control Center Modal
 * Centralized interface for all plugin operations
 */
export class ControlCenterModal extends Modal {
	plugin: CanvasRootsPlugin;
	private activeTab: string = 'dashboard';
	private drawer: HTMLElement;
	private contentContainer: HTMLElement;
	private appBar: HTMLElement;
	private drawerBackdrop: HTMLElement;

	// Cached data to avoid expensive recomputation
	private cachedUniverses: string[] | null = null;
	private cachedFamilyGraph: FamilyGraphService | null = null;
	private cachedPlaceGraph: PlaceGraphService | null = null;

	constructor(app: App, plugin: CanvasRootsPlugin, initialTab?: string) {
		super(app);
		this.plugin = plugin;
		if (initialTab) {
			this.activeTab = initialTab;
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('crc-control-center-modal');

		// Create modal structure
		this.createModalContainer();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		// Clear caches on close
		this.cachedUniverses = null;
		this.cachedFamilyGraph = null;
		this.cachedPlaceGraph = null;
	}

	/**
	 * Get cached family graph service, creating it if needed.
	 * This avoids expensive reloads on every row click.
	 */
	private getCachedFamilyGraph(): FamilyGraphService {
		if (!this.cachedFamilyGraph) {
			this.cachedFamilyGraph = this.plugin.createFamilyGraphService();
		}
		return this.cachedFamilyGraph;
	}

	/**
	 * Get cached place graph service, creating it if needed.
	 */
	private getCachedPlaceGraph(): PlaceGraphService {
		if (!this.cachedPlaceGraph) {
			this.cachedPlaceGraph = this.plugin.createPlaceGraphService();
		}
		return this.cachedPlaceGraph;
	}

	/**
	 * Get cached universe list, computing it once if needed.
	 *
	 * Merges three sources so the dropdown reflects the full set of universes
	 * the user has defined or referenced:
	 *
	 * 1. Universe notes in the universes folder (`UniverseService`) — the
	 *    authoritative source. Includes universes the user has just created
	 *    or renamed but whose new name no person/place file references yet.
	 * 2. Distinct `universe:` field values across person notes.
	 * 3. Distinct `universe:` field values across place notes.
	 *
	 * Sources 2 and 3 keep working for vaults that reference universes
	 * informally (no Universe note created), and they cover the legacy case
	 * where a Universe note's name diverges from a referencing note's
	 * `universe:` value (the rename hasn't cascaded through yet — see #488
	 * Part 2). Source 1 is the fix that prevents a freshly-renamed universe
	 * from being absent from the Edit Person dropdown. (#488 Part 1)
	 */
	private getCachedUniverses(): string[] {
		if (!this.cachedUniverses) {
			const placeGraph = this.getCachedPlaceGraph();
			const familyGraph = this.getCachedFamilyGraph();
			const universeService = createUniverseService(this.plugin);

			this.cachedUniverses = mergeUniverseList({
				universeNoteNames: universeService.getAllUniverses().map(u => u.name),
				personUniverses: familyGraph.getAllUniverses(),
				placeUniverses: placeGraph.getAllUniverses(),
			});
		}
		return this.cachedUniverses;
	}

	/**
	 * Invalidate cached data (call when data changes)
	 */
	private invalidateCaches(): void {
		this.cachedUniverses = null;
		this.cachedFamilyGraph = null;
		this.cachedPlaceGraph = null;
	}

	/**
	 * Create the main modal container with header, drawer, and content
	 */
	private createModalContainer(): void {
		const { contentEl } = this;

		// Main modal container
		const modalContainer = contentEl.createDiv({ cls: 'crc-modal-container' });

		// Sticky header
		this.createStickyHeader(modalContainer);

		// Main container (drawer + content)
		const mainContainer = modalContainer.createDiv({ cls: 'crc-main-container' });

		// Navigation drawer
		this.createNavigationDrawer(mainContainer);

		// Content area
		this.contentContainer = mainContainer.createDiv({ cls: 'crc-content-area' });

		// Show initial tab
		this.showTab(this.activeTab);
	}

	/**
	 * Create sticky header with title
	 */
	private createStickyHeader(container: HTMLElement): void {
		this.appBar = container.createDiv({ cls: 'crc-sticky-header' });

		// Mobile menu toggle button (hidden on desktop via CSS)
		const menuToggle = this.appBar.createEl('button', {
			cls: 'crc-mobile-menu-toggle',
			attr: { type: 'button' }
		});
		setIcon(menuToggle, 'menu');
		menuToggle.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.toggleMobileDrawer();
		});

		// Title section
		const titleSection = this.appBar.createDiv({ cls: 'crc-header-title' });
		const titleIcon = createLucideIcon('git-branch', 20);
		titleSection.appendChild(titleIcon);
		titleSection.appendText('Charted Roots Control Center');

		// Action buttons section
		const actionsSection = this.appBar.createDiv({ cls: 'crc-header-actions' });
		this.createHeaderActions(actionsSection);
	}

	/**
	 * Create header action buttons
	 */
	private createHeaderActions(_container: HTMLElement): void {
		// Reserved for future header actions (e.g., help, settings)
		// The modal's native close button (X) is sufficient
	}

	/**
	 * Check if we're in mobile mode
	 */
	private isMobileMode(): boolean {
		return Platform.isMobile || activeDocument.body.classList.contains('is-mobile');
	}

	/**
	 * Create navigation drawer with tab list
	 */
	private createNavigationDrawer(container: HTMLElement): void {
		// Mobile backdrop (hidden on desktop via CSS)
		this.drawerBackdrop = container.createDiv({ cls: 'crc-drawer-backdrop' });
		this.drawerBackdrop.addEventListener('click', () => this.closeMobileDrawer());

		this.drawer = container.createDiv({ cls: 'crc-drawer' });

		// Add mobile class directly if in mobile mode
		if (this.isMobileMode()) {
			this.drawer.addClass('crc-drawer--mobile');
			this.drawerBackdrop.addClass('crc-drawer-backdrop--mobile');
			this.modalEl.addClass('crc-mobile-mode');
		}

		// Mobile close button (hidden on desktop via CSS)
		const closeBtn = this.drawer.createEl('button', {
			cls: 'crc-drawer-close',
			attr: { type: 'button' }
		});
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.closeMobileDrawer();
		});

		// Drawer header
		const header = this.drawer.createDiv({ cls: 'crc-drawer__header' });
		const headerTitle = header.createDiv({ cls: 'crc-drawer__title' });
		headerTitle.textContent = 'Navigation';

		// Drawer content
		const content = this.drawer.createDiv({ cls: 'crc-drawer__content' });
		this.createNavigationList(content);
	}

	/**
	 * Toggle mobile drawer visibility
	 */
	private toggleMobileDrawer(): void {
		const isOpen = this.drawer.classList.contains('crc-drawer--open');
		if (isOpen) {
			this.closeMobileDrawer();
		} else {
			this.openMobileDrawer();
		}
	}

	/**
	 * Open mobile drawer
	 */
	private openMobileDrawer(): void {
		this.drawer.classList.add('crc-drawer--open');
		this.drawerBackdrop.classList.add('crc-drawer-backdrop--visible');
	}

	/**
	 * Close mobile drawer
	 */
	private closeMobileDrawer(): void {
		this.drawer.classList.remove('crc-drawer--open');
		this.drawerBackdrop.classList.remove('crc-drawer-backdrop--visible');
	}

	/**
	 * Create navigation list with grouped tabs
	 */
	private createNavigationList(container: HTMLElement): void {
		// Render groups in order
		NAV_GROUPS.forEach((groupConfig, groupIndex) => {
			// Tools group renders tool entries instead of tabs
			if (groupConfig.id === 'tools') {
				this.renderToolsGroup(container, groupIndex);
				return;
			}

			// Get tabs for this group
			const groupTabs = TAB_CONFIGS.filter(tab => tab.group === groupConfig.id);

			if (groupTabs.length === 0) return;

			// Create group container
			const groupEl = container.createDiv({ cls: 'crc-nav-group' });

			// Add divider before all groups except the first
			if (groupIndex > 0) {
				groupEl.addClass('crc-nav-group--with-divider');
			}

			// Add group label if present
			if (groupConfig.label) {
				const labelEl = groupEl.createDiv({ cls: 'crc-nav-group__label' });
				labelEl.textContent = groupConfig.label;
			}

			// Create list for this group's tabs
			const list = groupEl.createEl('ul', { cls: 'crc-nav-list' });

			groupTabs.forEach((tabConfig) => {
				const listItem = list.createEl('li', {
					cls: `crc-nav-item ${tabConfig.id === this.activeTab ? 'crc-nav-item--active' : ''}`
				});
				listItem.setAttribute('data-tab', tabConfig.id);

				// Icon
				const graphic = listItem.createDiv({ cls: 'crc-nav-item__icon' });
				setLucideIcon(graphic, tabConfig.icon, 16);

				// Text
				const text = listItem.createDiv({ cls: 'crc-nav-item__text' });
				text.textContent = tabConfig.name;

				// Click handler
				listItem.addEventListener('click', () => {
					this.switchTab(tabConfig.id);
				});
			});
		});
	}

	/**
	 * Render the Tools group with modal/leaf launchers
	 */
	private renderToolsGroup(container: HTMLElement, groupIndex: number): void {
		const groupEl = container.createDiv({ cls: 'crc-nav-group' });

		// Add divider
		if (groupIndex > 0) {
			groupEl.addClass('crc-nav-group--with-divider');
		}

		// Group label
		const labelEl = groupEl.createDiv({ cls: 'crc-nav-group__label' });
		labelEl.textContent = 'Tools';

		// Create list for tool entries
		const list = groupEl.createEl('ul', { cls: 'crc-nav-list' });

		TOOL_CONFIGS.forEach((toolConfig) => {
			const listItem = list.createEl('li', {
				cls: 'crc-nav-item crc-nav-item--tool'
			});
			listItem.setAttribute('data-tool', toolConfig.id);

			// Icon
			const graphic = listItem.createDiv({ cls: 'crc-nav-item__icon' });
			setLucideIcon(graphic, toolConfig.icon, 16);

			// Text
			const text = listItem.createDiv({ cls: 'crc-nav-item__text' });
			text.textContent = toolConfig.name;

			// External indicator (↗)
			const indicator = listItem.createDiv({ cls: 'crc-nav-item__indicator' });
			indicator.textContent = '↗';

			// Click handler - open modal/leaf
			listItem.addEventListener('click', () => {
				this.openTool(toolConfig.id);
			});
		});
	}

	/**
	 * Open a tool modal or dedicated leaf
	 */
	private openTool(toolId: string): void {
		switch (toolId) {
			case 'templates':
				new TemplateSnippetsModal(this.app).open();
				break;
			case 'media-manager':
				new MediaManagerModal(this.app, this.plugin).open();
				break;
			case 'family-chart':
				// Open family chart leaf
				void this.plugin.activateFamilyChartView(undefined, true, true);
				this.close();
				break;
			case 'create-family':
				// Import and open family creation wizard
				void import('./family-creation-wizard').then(({ FamilyCreationWizardModal }) => {
					new FamilyCreationWizardModal(this.app, this.plugin).open();
				});
				break;
			case 'import-export':
				// Import and open import/export hub modal
				void import('./import-export-hub-modal').then(({ ImportExportHubModal }) => {
					new ImportExportHubModal(this.app, this.plugin).open();
				});
				break;
			case 'statistics':
				// Open statistics view leaf (includes access to reports)
				void this.plugin.activateStatisticsView();
				this.close();
				break;
		}
	}

	/**
	 * Switch to a different tab
	 */
	private switchTab(tabId: string): void {
		// Update active state in navigation
		this.drawer.querySelectorAll('.crc-nav-item').forEach(item => {
			item.classList.remove('crc-nav-item--active');
		});

		const activeItem = this.drawer.querySelector(`[data-tab="${tabId}"]`);
		if (activeItem) {
			activeItem.classList.add('crc-nav-item--active');
		}

		// Reset scroll position to top
		this.contentContainer.scrollTop = 0;

		// Update active tab and show content
		this.activeTab = tabId;
		this.showTab(tabId);

		// Close drawer on mobile after selecting a tab
		if (Platform.isMobile) {
			this.closeMobileDrawer();
		}
	}

	/**
	 * Show content for the specified tab
	 */
	private showTab(tabId: string): void {
		this.contentContainer.empty();

		switch (tabId) {
			case 'dashboard':
			case 'guide':  // Redirect legacy Guide tab to Dashboard
				this.showDashboardTab();
				break;
			case 'people':
				void this.showPeopleTab();
				break;
			case 'collections':
				void this.showCollectionsTab();
				break;
			case 'tree-generation':
				void this.showTreeGenerationTab();
				break;
			case 'data-quality':
				this.showDataQualityTab();
				break;
			case 'places':
				void this.showPlacesTab();
				break;
			case 'maps':
				void this.showMapsTab();
				break;
			case 'schemas':
				void this.showSchemasTab();
				break;
			case 'relationships':
				void this.showRelationshipsTab();
				break;
			case 'events':
				this.showEventsTab();
				break;
			case 'organizations':
				void this.showOrganizationsTab();
				break;
			case 'universes':
				this.showUniversesTab();
				break;
			case 'sources':
				void this.showSourcesTab();
				break;
			default:
				this.showPlaceholderTab(tabId);
		}
	}

	/**
	 * Open Control Center to a specific tab
	 */
	public openToTab(tabId: string): void {
		this.activeTab = tabId;
		this.open();
	}

	/**
	 * Opens the Tree Generation Wizard with the specified person already selected
	 *
	 * @param file - The TFile of the person note
	 */
	public openWithPerson(file: TFile): void {
		// Get person info from file metadata
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			new Notice('Unable to read person data from file');
			return;
		}

		const crId = cache.frontmatter.cr_id;
		const name = cache.frontmatter.name || file.basename;

		if (!crId) {
			new Notice('This note does not have a cr_id field');
			return;
		}

		// Open wizard directly with this person pre-selected
		const wizard = new UnifiedTreeWizardModal(this.plugin, {
			personCrId: crId,
			personName: name,
			onComplete: () => {
				// Refresh the tab to show the new tree in recent list (if Control Center is open)
				if (this.activeTab === 'tree-generation') {
					this.showTab(this.activeTab);
				}
			}
		});
		wizard.open();
	}

	/**
	 * Find all disconnected family components and generate a tree for each
	 * Creates separate canvases for each family group found in the vault
	 */
	public async openAndGenerateAllTrees(): Promise<void> {
		// Track results for summary
		interface TreeResult {
			success: boolean;
			familyName: string;
			peopleCount: number;
			fileName?: string;
			file?: TFile;
			error?: string;
		}

		const results: TreeResult[] = [];

		try {
			// Initialize services
			const graphService = this.plugin.createFamilyGraphService();

			// Find all family components
			logger.info('generate-all-trees', 'Finding all family components in vault');
			new Notice('Scanning vault for family groups...');
			const components = graphService.findAllFamilyComponents();

			if (components.length === 0) {
				new Notice('No family trees found in vault. Please add some person notes first.');
				return;
			}

			if (components.length === 1) {
				new Notice('Only one family tree found. Use "Generate tree" instead.');
				return;
			}

			logger.info('generate-all-trees', `Found ${components.length} family groups`, {
				sizes: components.map(c => c.size)
			});

			new Notice(`Found ${components.length} family groups. Generating trees...`);

			// Generate a tree for each component
			for (let i = 0; i < components.length; i++) {
				const component = components[i];
				const rep = component.representative;

				// Update progress
				new Notice(`Generating tree ${i + 1}/${components.length}: ${rep.name}...`, 2000);

				logger.info('generate-all-trees', `Generating tree ${i + 1}/${components.length}`, {
					representative: rep.name,
					size: component.size
				});

				try {
					// Generate full family tree for this component
					const treeOptions: TreeOptions = {
						rootCrId: rep.crId,
						treeType: 'full',
						maxGenerations: 0, // unlimited
						includeSpouses: true
					};

					const familyTree = graphService.generateTree(treeOptions);

					if (!familyTree) {
						logger.error('generate-all-trees', `Failed to generate tree for ${rep.name}: root not found`);
						results.push({
							success: false,
							familyName: component.collectionName || rep.name,
							peopleCount: component.size,
							error: 'Root person not found'
						});
						continue;
					}

					// Generate canvas with a numbered name
					const canvasGenerator = new CanvasGenerator();
					const canvasOptions = {
						nodeWidth: this.plugin.settings.defaultNodeWidth,
						nodeHeight: this.plugin.settings.defaultNodeHeight,
						nodeSpacingX: this.plugin.settings.horizontalSpacing,
						nodeSpacingY: this.plugin.settings.verticalSpacing,
						direction: 'vertical' as const,
						nodeColorScheme: this.plugin.settings.nodeColorScheme,
						showLabels: false,
						parentChildArrowStyle: this.plugin.settings.parentChildArrowStyle,
						spouseArrowStyle: this.plugin.settings.spouseArrowStyle,
						parentChildEdgeColor: this.plugin.settings.parentChildEdgeColor,
						spouseEdgeColor: this.plugin.settings.spouseEdgeColor,
						showSpouseEdges: this.plugin.settings.showSpouseEdges,
						spouseEdgeLabelFormat: this.plugin.settings.spouseEdgeLabelFormat,
						showSourceIndicators: this.plugin.settings.showSourceIndicators,
						showResearchCoverage: this.plugin.settings.trackFactSourcing,
						customRelationshipTypes: this.plugin.settings.customRelationshipTypes,
						canvasRootsMetadata: {
							plugin: 'charted-roots' as const,
							generation: {
								rootCrId: rep.crId,
								rootPersonName: rep.name,
								treeType: 'full' as const,
								maxGenerations: 0,
								includeSpouses: true,
								direction: 'vertical' as const,
								timestamp: Date.now()
							},
							layout: {
								nodeWidth: this.plugin.settings.defaultNodeWidth,
								nodeHeight: this.plugin.settings.defaultNodeHeight,
								nodeSpacingX: this.plugin.settings.horizontalSpacing,
								nodeSpacingY: this.plugin.settings.verticalSpacing
							}
						}
					};

					const canvasData = canvasGenerator.generateCanvas(familyTree, canvasOptions);

					// Create canvas file with collection name if available
					const fileName = component.collectionName
						? `${component.collectionName} - ${rep.name}.canvas`
						: `Family tree ${i + 1} - ${rep.name}.canvas`;
					const canvasContent = formatCanvasJson(canvasData);

					// Use canvasesFolder setting
					const folder = this.plugin.settings.canvasesFolder || 'Charted Roots/Canvases';
					await ensureFolderExists(this.app, folder);
					const filePath = normalizePath(`${folder}/${fileName}`);

					let file: TFile;
					const existingFile = this.app.vault.getAbstractFileByPath(filePath);
					if (existingFile instanceof TFile) {
						await this.app.vault.modify(existingFile, canvasContent);
						file = existingFile;
					} else {
						file = await this.app.vault.create(filePath, canvasContent);
					}

					results.push({
						success: true,
						familyName: component.collectionName || rep.name,
						peopleCount: canvasData.nodes.length,
						fileName,
						file
					});

					// Save to recent trees history
					const treeInfo: RecentTreeInfo = {
						canvasPath: file.path,
						canvasName: fileName,
						peopleCount: canvasData.nodes.length,
						edgeCount: canvasData.edges.length,
						rootPerson: rep.name,
						timestamp: Date.now()
					};

					// Ensure recentTrees array exists (defensive)
					if (!this.plugin.settings.recentTrees) {
						this.plugin.settings.recentTrees = [];
					}

					// Add to beginning of array and keep only last 10
					this.plugin.settings.recentTrees = [treeInfo, ...this.plugin.settings.recentTrees].slice(0, 10);

					logger.info('generate-all-trees', `Successfully generated tree ${i + 1}`, {
						fileName,
						nodeCount: canvasData.nodes.length
					});
				} catch (error: unknown) {
					logger.error('generate-all-trees', `Failed to generate tree for ${rep.name}`, error);
					results.push({
						success: false,
						familyName: component.collectionName || rep.name,
						peopleCount: component.size,
						error: getErrorMessage(error)
					});
				}
			}

			// Save settings with all the recent trees we just added
			await this.plugin.saveSettings();

			// Show results summary modal
			this.showGenerateAllTreesResults(results);
		} catch (error: unknown) {
			logger.error('generate-all-trees', 'Failed to generate all trees', error);
			throw error;
		}
	}

	/**
	 * Show results summary for Generate All Trees operation
	 */
	private showGenerateAllTreesResults(results: Array<{
		success: boolean;
		familyName: string;
		peopleCount: number;
		fileName?: string;
		file?: TFile;
		error?: string;
	}>): void {
		const successCount = results.filter(r => r.success).length;
		const failureCount = results.length - successCount;

		// Clear current content and show results
		this.contentContainer.empty();

		// Title
		this.contentContainer.createEl('h2', {
			text: 'Generate all trees - Results',
			cls: 'cr-card-title--no-margin'
		});

		// Summary stats
		const summaryCard = this.createCard({
			title: 'Summary',
			icon: 'check'
		});

		const summaryContent = summaryCard.querySelector('.crc-card__content') as HTMLElement;

		const statsGrid = summaryContent.createDiv({ cls: 'crc-stats-grid' });

		// Success count
		const successStat = statsGrid.createDiv({ cls: 'crc-stat' });
		successStat.createDiv({ cls: 'crc-stat__label', text: 'Successfully generated' });
		successStat.createDiv({
			cls: 'crc-stat__value',
			text: String(successCount)
		});

		// Failure count (if any)
		if (failureCount > 0) {
			const failureStat = statsGrid.createDiv({ cls: 'crc-stat' });
			failureStat.createDiv({ cls: 'crc-stat__label', text: 'Failed' });
			failureStat.createDiv({
				cls: 'crc-stat__value',
				text: String(failureCount)
			});
		}

		// Total trees
		const totalStat = statsGrid.createDiv({ cls: 'crc-stat' });
		totalStat.createDiv({ cls: 'crc-stat__label', text: 'Total family groups' });
		totalStat.createDiv({
			cls: 'crc-stat__value',
			text: String(results.length)
		});

		this.contentContainer.appendChild(summaryCard);

		// Success message or warning
		if (failureCount === 0) {
			const successMsg = this.contentContainer.createEl('p', {
				cls: 'crc-text-success crc-mt-3'
			});
			successMsg.createEl('strong', { text: '✓ All trees generated successfully!' });
		} else {
			const warningMsg = this.contentContainer.createEl('p', {
				cls: 'crc-text-warning crc-mt-3'
			});
			warningMsg.createEl('strong', { text: `⚠ ${failureCount} ${pluralize(failureCount, 'tree')} failed to generate.` });
			warningMsg.appendText(' See details below.');
		}

		// Details card
		const detailsCard = this.createCard({
			title: 'Generated trees',
			icon: 'file'
		});

		const detailsContent = detailsCard.querySelector('.crc-card__content') as HTMLElement;

		// List of results
		const resultsList = detailsContent.createDiv({ cls: 'crc-results-list' });

		results.forEach((result) => {
			const resultItem = resultsList.createDiv({
				cls: `crc-result-item ${result.success ? 'crc-result-item--success' : 'crc-result-item--error'}`
			});

			// Icon and family name
			const resultHeader = resultItem.createDiv({ cls: 'crc-result-item__header' });

			const icon = createLucideIcon(result.success ? 'check' : 'alert-circle', 16);
			resultHeader.appendChild(icon);

			resultHeader.createSpan({
				cls: 'crc-result-item__name',
				text: result.familyName
			});

			resultHeader.createSpan({
				cls: 'crc-result-item__count',
				text: `${result.peopleCount} people`
			});

			// Success: show file name and action buttons
			if (result.success && result.file) {
				const resultBody = resultItem.createDiv({ cls: 'crc-result-item__body' });

				resultBody.createEl('p', {
					cls: 'crc-text-muted',
					text: result.fileName || ''
				});

				// Action buttons
				const actions = resultBody.createDiv({ cls: 'crc-result-item__actions' });

				const openBtn = actions.createEl('button', {
					cls: 'crc-btn crc-btn--small',
					text: 'Open canvas'
				});
				const openIcon = createLucideIcon('external-link', 14);
				openBtn.prepend(openIcon);
				openBtn.addEventListener('click', () => {
					void (async () => {
						if (result.file) {
							const leaf = this.app.workspace.getLeaf(false);
							await leaf.openFile(result.file);
							this.close();
						}
					})();
				});

				const relayoutBtn = actions.createEl('button', {
					cls: 'crc-btn crc-btn--small crc-btn--secondary',
					text: 'Re-layout'
				});
				const relayoutIcon = createLucideIcon('refresh-cw', 14);
				relayoutBtn.prepend(relayoutIcon);
				relayoutBtn.addEventListener('click', () => {
					void (async () => {
						if (result.file) {
							// Call the plugin's regenerate method
							await this.plugin.regenerateCanvas(result.file);
						}
					})();
				});
			}

			// Failure: show error message
			if (!result.success && result.error) {
				const resultBody = resultItem.createDiv({ cls: 'crc-result-item__body' });

				resultBody.createEl('p', {
					cls: 'crc-text-error',
					text: `Error: ${result.error}`
				});
			}
		});

		this.contentContainer.appendChild(detailsCard);

		// Back button
		const backBtn = this.contentContainer.createEl('button', {
			cls: 'crc-btn crc-btn--secondary crc-btn--block crc-mt-3',
			text: 'Back to tree output'
		});
		const backIcon = createLucideIcon('chevron-right', 16);
		backBtn.prepend(backIcon);
		backBtn.addEventListener('click', () => {
			this.showTab('tree-generation');
		});

		// Final success notice
		if (failureCount === 0) {
			new Notice(`Successfully generated ${successCount} family trees!`, 5000);
		} else {
			new Notice(`Generated ${successCount} of ${results.length} trees. ${failureCount} failed.`, 5000);
		}
	}

	// ==========================================================================
	// TAB CONTENT METHODS
	// ==========================================================================

	/**
	 * Show Dashboard tab with quick actions and vault overview
	 */
	private showDashboardTab(): void {
		renderDashboardTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: this.createCard.bind(this),
			switchTab: this.switchTab.bind(this),
			closeModal: () => this.close()
		});
	}

	/**
	 * Format timestamp as relative time
	 */
	private formatTimeAgo(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return days === 1 ? '1 day ago' : `${days} days ago`;
		} else if (hours > 0) {
			return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
		} else if (minutes > 0) {
			return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
		} else {
			return 'just now';
		}
	}

	/**
	 * Show People tab — delegates to extracted module
	 */
	private showPeopleTab(): void {
		renderPeopleTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: (options) => this.createCard(options),
			showTab: (tabId) => this.showTab(tabId),
			closeModal: () => this.close(),
			showQuickCreatePlaceModal: (name) => this.showQuickCreatePlaceModal(name),
			showPersonTimelineModal: (file, name, eventService) => this.showPersonTimelineModal(file, name, eventService),
			showFamilyTimelineModal: (file, name, eventService, familyGraph) => this.showFamilyTimelineModal(file, name, eventService, familyGraph),
			getCachedFamilyGraph: () => this.getCachedFamilyGraph(),
			getCachedPlaceGraph: () => this.getCachedPlaceGraph(),
			getCachedUniverses: () => this.getCachedUniverses(),
			invalidateCaches: () => this.invalidateCaches(),
			previewRemoveDuplicateRelationships: () => previewRemoveDuplicateRelationships(this.plugin, this.app, (tabId) => this.showTab(tabId)),
			removeDuplicateRelationships: () => { void removeDuplicateRelationships(this.plugin, this.app, (tabId) => this.showTab(tabId)); },
			previewRemovePlaceholders: () => previewRemovePlaceholders(this.plugin, this.app, (tabId) => this.showTab(tabId)),
			removePlaceholders: () => { void removePlaceholders(this.plugin, this.app, (tabId) => this.showTab(tabId)); },
			previewAddPersonType: () => previewAddPersonType(this.plugin, this.app, (tabId) => this.showTab(tabId)),
			addPersonType: () => { void addPersonType(this.plugin, this.app, (tabId) => this.showTab(tabId)); },
			previewNormalizeNames: () => previewNormalizeNames(this.plugin, this.app, (tabId) => this.showTab(tabId)),
			normalizeNames: () => { void normalizeNames(this.plugin, this.app, (tabId) => this.showTab(tabId)); },
			previewFixBidirectionalRelationships: () => { void previewFixBidirectionalRelationships(this.plugin, this.app, (tabId) => this.showTab(tabId)); },
			fixBidirectionalRelationships: () => { void fixBidirectionalRelationships(this.plugin, this.app, (tabId) => this.showTab(tabId)); },
			previewValidateDates: () => previewValidateDates(this.plugin, this.app, (tabId) => this.showTab(tabId)),
			validateDates: () => validateDates(this.plugin, this.app, (tabId) => this.showTab(tabId)),
			previewDetectImpossibleDates: () => previewDetectImpossibleDates(this.plugin, this.app, (tabId) => this.showTab(tabId))
		});
	}

	/**
	 * Render the Canvas Trees tab — delegates to extracted module
	 */
	private showTreeGenerationTab(): void {
		renderTreesTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: (options) => this.createCard(options),
			showTab: (tabId) => this.switchTab(tabId),
			closeModal: () => this.close(),
			openCanvasTree: (path) => this.openCanvasTree(path),
			showRecentTreeContextMenu: (event, tree) => this.showRecentTreeContextMenu(event, tree),
			openAndGenerateAllTrees: () => this.openAndGenerateAllTrees(),
			formatTimeAgo: (timestamp) => this.formatTimeAgo(timestamp),
			getCachedFamilyGraph: () => this.getCachedFamilyGraph()
		});
	}

	/**
	 * Show Collections tab — delegates to extracted module
	 */
	private showCollectionsTab(): void {
		renderCollectionsTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: (options) => this.createCard(options),
			showTab: (tabId) => this.switchTab(tabId),
			closeModal: () => this.close(),
			formatCanvasJson: (data) => formatCanvasJson(data)
		});
	}

	/**
	 * Show the Places tab with geographic statistics
	 */
	private showPlacesTab(): void {
		renderPlacesTab(
			this.contentContainer,
			this.plugin,
			this.createCard.bind(this),
			this.showTab.bind(this)
		);
	}

	// ==========================================================================
	// Maps Tab
	// ==========================================================================

	/**
	 * Show the Maps tab content
	 */
	private showMapsTab(): void {
		renderMapsTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: (options) => this.createCard(options),
			showTab: (tabId) => this.switchTab(tabId),
			closeModal: () => this.close()
		});
	}

	/**
	 * Quick-create a single place note from an unlinked place name
	 */
	private showQuickCreatePlaceModal(placeName: string): void {
		const modal = new CreatePlaceModal(this.app, {
			directory: this.plugin.settings.placesFolder || '',
			initialName: placeName,
			familyGraph: this.plugin.createFamilyGraphService(),
			placeGraph: this.plugin.createPlaceGraphService(),
			settings: this.plugin.settings,
			plugin: this.plugin,
			onCreated: () => {
				new Notice(`Created place note: ${placeName}`);
				// Refresh the Places tab
				this.showTab('places');
			}
		});
		modal.open();
	}

	/**
	 * Show a modal with the person's timeline
	 */
	private showPersonTimelineModal(
		personFile: TFile,
		personName: string,
		eventService: EventService
	): void {
		const modal = new Modal(this.app);
		modal.titleEl.setText(`Timeline: ${personName}`);
		modal.modalEl.addClass('crc-person-timeline-modal');

		const content = modal.contentEl.createDiv({ cls: 'crc-person-timeline-modal__content' });

		renderPersonTimeline(
			content,
			personFile,
			personName,
			this.app,
			this.plugin.settings,
			eventService,
			{
				showEmptyState: true,
				onEventClick: (event) => {
					modal.close();
					void this.app.workspace.getLeaf(false).openFile(event.file);
				}
			}
		);

		modal.open();
	}

	/**
	 * Show the family timeline (events for person + spouses + children) in a modal.
	 * Parallel to showPersonTimelineModal, shipped as part of wiring up the
	 * long-dormant Family Timeline View from v0.10.0.
	 */
	private showFamilyTimelineModal(
		personFile: TFile,
		personName: string,
		eventService: EventService,
		familyGraph: FamilyGraphService
	): void {
		const modal = new Modal(this.app);
		modal.titleEl.setText(`Family timeline: ${personName}`);
		modal.modalEl.addClass('crc-family-timeline-modal');

		const content = modal.contentEl.createDiv({ cls: 'crc-family-timeline-modal__content' });

		renderFamilyTimeline(
			content,
			personFile,
			this.app,
			this.plugin.settings,
			eventService,
			familyGraph,
			{
				showEmptyState: true,
				onEventClick: (event) => {
					modal.close();
					void this.app.workspace.getLeaf(false).openFile(event.file);
				}
			}
		);

		modal.open();
	}

	// ============================================
	// SCHEMAS TAB
	// ============================================

	/**
	 * Show Schemas tab — delegates to extracted module
	 */
	private async showSchemasTab(): Promise<void> {
		await renderSchemasTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: (options) => this.createCard(options),
			showTab: (tabId) => this.switchTab(tabId),
			closeModal: () => this.close()
		});
	}

	// ==========================================================================
	// RELATIONSHIPS TAB
	// ==========================================================================

	/**
	 * Show Relationships tab with type management and relationship overview
	 */
	private showRelationshipsTab(): void {
		const container = this.contentContainer;
		renderRelationshipsTab(
			container,
			this.plugin,
			(options) => this.createCard(options),
			(tabId) => this.switchTab(tabId)
		);
	}

	/**
	 * Show Events tab with date systems and temporal statistics
	 */
	private showEventsTab(): void {
		const container = this.contentContainer;
		renderEventsTab(
			container,
			this.plugin,
			(options) => this.createCard(options),
			(tabId) => this.switchTab(tabId)
		);
	}

	/**
	 * Show Organizations tab with organization list and statistics
	 */
	private showOrganizationsTab(): void {
		const container = this.contentContainer;
		renderOrganizationsTab(
			container,
			this.plugin,
			(options) => this.createCard(options),
			(tabId) => this.switchTab(tabId)
		);
	}

	/**
	 * Show Universes tab -- delegates to extracted module
	 */
	private showUniversesTab(): void {
		renderUniversesTab(
			this.contentContainer,
			this.plugin,
			(options) => this.createCard(options),
			(tabId) => this.switchTab(tabId),
			() => this.close()
		);
	}

	/**
	 * Show Sources tab with source list and statistics
	 */
	private showSourcesTab(): void {
		const container = this.contentContainer;
		renderSourcesTab(
			container,
			this.plugin,
			(options) => this.createCard(options),
			(tabId) => this.switchTab(tabId)
		);
	}

	/**
	 * Show placeholder for unimplemented tabs
	 */
	private showPlaceholderTab(tabId: string): void {
		const container = this.contentContainer;
		const tabConfig = TAB_CONFIGS.find(t => t.id === tabId);

		const card = this.createCard({
			title: tabConfig?.name || 'Coming soon',
			icon: tabConfig?.icon || 'info'
		});

		const content = card.querySelector('.crc-card__content') as HTMLElement;
		content.createEl('p', {
			text: tabConfig?.description || 'This tab is under construction.',
			cls: 'crc-text-muted'
		});

		container.appendChild(card);
	}

	// ==========================================================================
	// UTILITY METHODS
	// ==========================================================================

	/**
	 * Create a Material Design card
	 */
	private createCard(options: {
		title: string;
		icon?: LucideIconName;
		subtitle?: string;
		elevation?: number;
	}): HTMLElement {
		const card = activeDocument.createElement('div');
		card.className = 'crc-card';

		if (options.elevation) {
			card.classList.add(`crc-elevation-${options.elevation}`);
		}

		// Header
		const header = card.createDiv({ cls: 'crc-card__header' });
		const titleContainer = header.createDiv({ cls: 'crc-card__title' });

		if (options.icon) {
			const icon = createLucideIcon(options.icon, 24);
			titleContainer.appendChild(icon);
		}

		titleContainer.appendText(options.title);

		if (options.subtitle) {
			const subtitle = header.createDiv({ cls: 'crc-card__subtitle' });
			subtitle.textContent = options.subtitle;
		}

		// Content (empty, to be filled by caller)
		card.createDiv({ cls: 'crc-card__content' });

		return card;
	}

	// =========================================================================
	// DATA QUALITY TAB
	// =========================================================================

	/**
	 * Show Data Quality tab — delegates to extracted module
	 */
	private showDataQualityTab(): void {
		renderDataQualityTab({
			container: this.contentContainer,
			plugin: this.plugin,
			app: this.app,
			createCard: (options) => this.createCard(options),
			showTab: (tabId) => this.switchTab(tabId),
			closeModal: () => this.close(),
			getCachedFamilyGraph: () => this.getCachedFamilyGraph(),
			invalidateCaches: () => this.invalidateCaches()
		});
	}

	// =========================================================================
	// RECENT CANVAS TREES HELPERS
	// =========================================================================

	/**
	 * Open a canvas tree file
	 */
	private async openCanvasTree(canvasPath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(canvasPath);
		if (file instanceof TFile) {
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
			this.close();
		} else {
			new Notice(`Canvas file not found: ${canvasPath}`);
		}
	}

	/**
	 * Show context menu for a recent canvas tree
	 */
	private showRecentTreeContextMenu(event: MouseEvent, tree: RecentTreeInfo): void {
		const menu = new Menu();

		// Open in new tab
		menu.addItem((item) => {
			item.setTitle('Open')
				.setIcon('external-link')
				.onClick(() => {
					void this.openCanvasTree(tree.canvasPath);
				});
		});

		// Open in new tab
		menu.addItem((item) => {
			item.setTitle('Open in new tab')
				.setIcon('plus')
				.onClick(() => {
					void (async () => {
						const file = this.app.vault.getAbstractFileByPath(tree.canvasPath);
						if (file instanceof TFile) {
							const leaf = this.app.workspace.getLeaf('tab');
							await leaf.openFile(file);
						} else {
							new Notice(`Canvas file not found: ${tree.canvasPath}`);
						}
					})();
				});
		});

		menu.addSeparator();

		// Regenerate canvas
		menu.addItem((item) => {
			item.setTitle('Regenerate')
				.setIcon('refresh-cw')
				.onClick(() => {
					void (async () => {
						const file = this.app.vault.getAbstractFileByPath(tree.canvasPath);
						if (file instanceof TFile) {
							await this.plugin.regenerateCanvas(file);
							new Notice('Canvas regenerated');
						} else {
							new Notice(`Canvas file not found: ${tree.canvasPath}`);
						}
					})();
				});
		});

		// Reveal in navigation
		menu.addItem((item) => {
			item.setTitle('Reveal in navigation')
				.setIcon('folder')
				.onClick(() => {
					const file = this.app.vault.getAbstractFileByPath(tree.canvasPath);
					if (file instanceof TFile) {
						// Trigger file explorer reveal
						void this.app.workspace.revealLeaf(
							this.app.workspace.getLeavesOfType('file-explorer')[0]
						);
						// Use internal API to reveal file if available
						const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
						if (fileExplorer && 'view' in fileExplorer) {
							const view = fileExplorer.view as { revealInFolder?: (file: TFile) => void };
							if (view.revealInFolder) {
								view.revealInFolder(file);
							}
						}
					} else {
						new Notice(`Canvas file not found: ${tree.canvasPath}`);
					}
				});
		});

		menu.addSeparator();

		// Remove from recent
		menu.addItem((item) => {
			item.setTitle('Remove from recent')
				.setIcon('x')
				.onClick(() => {
					void (async () => {
						if (this.plugin.settings.recentTrees) {
							this.plugin.settings.recentTrees = this.plugin.settings.recentTrees.filter(
								t => t.canvasPath !== tree.canvasPath
							);
							await this.plugin.saveSettings();
							// Refresh the tab
							this.showTab(this.activeTab);
							new Notice('Removed from recent trees');
						}
					})();
				});
		});

		// Delete canvas file
		menu.addItem((item) => {
			item.setTitle('Delete canvas')
				.setIcon('trash-2')
				.onClick(() => {
					void (async () => {
						const file = this.app.vault.getAbstractFileByPath(tree.canvasPath);
						if (file instanceof TFile) {
							// Confirm deletion
							const confirmed = await new Promise<boolean>((resolve) => {
								const modal = new ConfirmationModal(
									this.app,
									'Delete Canvas Tree',
									`Are you sure you want to delete "${tree.canvasName}"? This action cannot be undone.`,
									(result) => resolve(result)
								);
								modal.open();
							});

							if (confirmed) {
								await this.app.fileManager.trashFile(file);
								// Remove from recent trees
								if (this.plugin.settings.recentTrees) {
									this.plugin.settings.recentTrees = this.plugin.settings.recentTrees.filter(
										t => t.canvasPath !== tree.canvasPath
									);
									await this.plugin.saveSettings();
								}
								// Refresh the tab
								this.showTab(this.activeTab);
								new Notice('Canvas deleted');
							}
						} else {
							new Notice(`Canvas file not found: ${tree.canvasPath}`);
						}
					})();
				});
		});

		menu.showAtMouseEvent(event);
	}
}