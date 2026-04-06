import { Plugin, Notice, TFile, TFolder, EventRef, WorkspaceLeaf, ObsidianProtocolData } from 'obsidian';
import { CanvasRootsSettings, DEFAULT_SETTINGS, CanvasRootsSettingTab } from './src/settings';
import { LoggerFactory, getLogger } from './src/core/logging';
import { FamilyGraphService } from './src/core/family-graph';
import { BidirectionalLinker } from './src/core/bidirectional-linker';
import { RelationshipHistoryService, RelationshipHistoryData, formatChangeDescription } from './src/core/relationship-history';
import { RelationshipHistoryModal } from './src/ui/relationship-history-modal';
import { FamilyChartView, VIEW_TYPE_FAMILY_CHART } from './src/ui/views/family-chart-view';
import { MapView, VIEW_TYPE_MAP } from './src/maps/map-view';
import { StatisticsView, VIEW_TYPE_STATISTICS } from './src/statistics';
import { CalendarView, VIEW_TYPE_CALENDAR } from './src/calendar/calendar-view';
import { RelationshipsView, VIEW_TYPE_RELATIONSHIPS } from './src/relationships/ui/relationships-view';
import { PeopleView, VIEW_TYPE_PEOPLE } from './src/ui/views/people-view';
import { EventsView, VIEW_TYPE_EVENTS } from './src/dates/ui/events-view';
import { PlacesView, VIEW_TYPE_PLACES } from './src/ui/views/places-view';
import { OrganizationsView, VIEW_TYPE_ORGANIZATIONS } from './src/organizations/ui/organizations-view';
import { SourcesView, VIEW_TYPE_SOURCES } from './src/sources/ui/sources-view';
import { UniversesView, VIEW_TYPE_UNIVERSES } from './src/universes/ui/universes-view';
import { CollectionsView, VIEW_TYPE_COLLECTIONS } from './src/ui/collections-view';
import { DataQualityView, VIEW_TYPE_DATA_QUALITY } from './src/ui/data-quality-view';
import { FolderFilterService } from './src/core/folder-filter';
import { TemplateFilterService } from './src/core/template-filter';
import { PersonIndexService } from './src/core/person-index-service';
import { PlaceGraphService } from './src/core/place-graph';
import { EvidenceService, ProofSummaryService, SourceService } from './src/sources';
import { EventService } from './src/events/services/event-service';
import { TimelineProcessor, RelationshipsProcessor, MediaProcessor, SourceRolesProcessor, TransfersProcessor, MembersProcessor, SourcesProcessor, ExtractionsProcessor, NegativeFindingsProcessor, ResearchTimelineProcessor } from './src/dynamic-content';
import { RecentFilesService, RecentEntityType } from './src/core/recent-files-service';
import { registerCustomIcons } from './src/ui/lucide-icons';
import { MediaService } from './src/core/media-service';
import { MigrationNoticeView, VIEW_TYPE_MIGRATION_NOTICE } from './src/ui/views/migration-notice-view';
import { ProfileView, VIEW_TYPE_ENTITY_PROFILE } from './src/profile-view/profile-view';
import { WebClipperService } from './src/core/web-clipper-service';
import { PluginRenameMigrationService, showMigrationNotice } from './src/migration/plugin-rename-migration-service';

import { registerContextMenus, promptLineageName } from './src/plugin/context-menus';
import {
	activateFamilyChartView as _activateFamilyChartView,
	activateMapView as _activateMapView,
	activateStatisticsView as _activateStatisticsView,
	activateCalendarView as _activateCalendarView,
	activateRelationshipsView as _activateRelationshipsView,
	activatePeopleView as _activatePeopleView,
	activateEventsView as _activateEventsView,
	activatePlacesView as _activatePlacesView,
	activateOrganizationsView as _activateOrganizationsView,
	activateSourcesView as _activateSourcesView,
	activateUniversesView as _activateUniversesView,
	activateCollectionsView as _activateCollectionsView,
	activateDataQualityView as _activateDataQualityView,
	activateProfileView as _activateProfileView,
	moveFamilyChartToMainWorkspace as _moveFamilyChartToMainWorkspace,
} from './src/plugin/activation';
import {
	createBaseTemplate as _createBaseTemplate,
	createPlacesBaseTemplate as _createPlacesBaseTemplate,
	createOrganizationsBaseTemplate as _createOrganizationsBaseTemplate,
	createSourcesBaseTemplate as _createSourcesBaseTemplate,
	createUniversesBaseTemplate as _createUniversesBaseTemplate,
	createNotesBaseTemplate as _createNotesBaseTemplate,
	createResearchBaseTemplate as _createResearchBaseTemplate,
	createEventsBaseTemplate as _createEventsBaseTemplate,
	createAllBases as _createAllBases,
} from './src/plugin/base-templates';
import {
	openLinkMediaModal as _openLinkMediaModal,
	openEditPlaceModal as _openEditPlaceModal,
	openEditEventModal as _openEditEventModal,
	openEditPersonModal as _openEditPersonModal,
	promptAssignReferenceNumbers as _promptAssignReferenceNumbers,
	promptClearReferenceNumbers as _promptClearReferenceNumbers,
	promptAssignLineage as _promptAssignLineage,
	promptRemoveLineage as _promptRemoveLineage,
	generateTreeForCurrentNote as _generateTreeForCurrentNote,
	regenerateCanvas as _regenerateCanvas,
	createPersonNote as _createPersonNote,
	generateAllTrees as _generateAllTrees,
	insertDynamicBlocks as _insertDynamicBlocks,
	generateExcalidrawTreeForPerson as _generateExcalidrawTreeForPerson,
} from './src/plugin/bulk-operations';
import { registerCommandsAndEvents as _registerCommandsAndEvents } from './src/plugin/commands';

const logger = getLogger('CanvasRootsPlugin');

export default class CanvasRootsPlugin extends Plugin {
	settings: CanvasRootsSettings;
	private fileModifyEventRef: EventRef | null = null;
	public bidirectionalLinker: BidirectionalLinker | null = null;
	private relationshipHistory: RelationshipHistoryService | null = null;
	private folderFilter: FolderFilterService | null = null;
	private templateFilter: TemplateFilterService | null = null;
	public personIndex: PersonIndexService | null = null;
	private eventService: EventService | null = null;
	private sourceService: SourceService | null = null;
	private recentFilesService: RecentFilesService | null = null;
	private mediaService: MediaService | null = null;
	private webClipperService: WebClipperService | null = null;

	/**
	 * Flag to temporarily disable bidirectional sync during bulk operations (e.g., import)
	 * This prevents the file watcher from adding duplicate relationships while importing
	 */
	private _syncDisabled: boolean = false;

	/**
	 * Temporarily disable bidirectional sync (for use during bulk imports)
	 */
	disableBidirectionalSync(): void {
		this._syncDisabled = true;
		logger.debug('sync-control', 'Bidirectional sync temporarily disabled');
	}

	/**
	 * Re-enable bidirectional sync after bulk operation
	 */
	enableBidirectionalSync(): void {
		this._syncDisabled = false;
		logger.debug('sync-control', 'Bidirectional sync re-enabled');
	}

	/**
	 * Check if bidirectional sync is currently disabled
	 */
	isSyncDisabled(): boolean {
		return this._syncDisabled;
	}

	/**
	 * Get the folder filter service for filtering person notes by folder
	 */
	getFolderFilter(): FolderFilterService | null {
		return this.folderFilter;
	}

	/**
	 * Get the template filter service for detecting template folders
	 */
	getTemplateFilter(): TemplateFilterService | null {
		return this.templateFilter;
	}

	/**
	 * Resolve a frontmatter property value, checking aliases if canonical property not found.
	 * Canonical property takes precedence over aliased property.
	 * @param frontmatter The frontmatter object from a note
	 * @param canonicalProperty The canonical property name (e.g., 'cr_id', 'born', 'died')
	 * @returns The property value, or undefined if not found
	 */
	resolveFrontmatterProperty<T>(frontmatter: Record<string, unknown> | undefined, canonicalProperty: string): T | undefined {
		if (!frontmatter) return undefined;

		// Canonical property takes precedence
		if (frontmatter[canonicalProperty] !== undefined) {
			return frontmatter[canonicalProperty] as T;
		}

		// Check aliases - find user property that maps to this canonical property
		const aliases = this.settings.propertyAliases ?? {};
		for (const [userProp, canonicalProp] of Object.entries(aliases)) {
			if (canonicalProp === canonicalProperty && frontmatter[userProp] !== undefined) {
				return frontmatter[userProp] as T;
			}
		}

		return undefined;
	}

	/**
	 * Get the event service for managing event notes
	 */
	getEventService(): EventService | null {
		return this.eventService;
	}

	/**
	 * Get the Source service (singleton)
	 */
	getSourceService(): SourceService {
		if (!this.sourceService) {
			this.sourceService = new SourceService(this.app, this.settings);
		}
		return this.sourceService;
	}

	/**
	 * Get the Web Clipper service for detecting clipped notes
	 */
	getWebClipperService(): WebClipperService | null {
		return this.webClipperService;
	}

	/**
	 * Get the recent files service for Dashboard tracking
	 */
	getRecentFilesService(): RecentFilesService | null {
		return this.recentFilesService;
	}

	/**
	 * Get the media service for entity media operations
	 */
	getMediaService(): MediaService | null {
		return this.mediaService;
	}

	/**
	 * Track a file access for the Dashboard recent files list
	 */
	async trackRecentFile(file: TFile, type: RecentEntityType): Promise<void> {
		if (this.recentFilesService) {
			await this.recentFilesService.trackFile(file, type);
		}
	}

	/**
	 * Create a FamilyGraphService configured with the folder filter
	 * and optionally populated with research coverage and conflict data when fact tracking is enabled
	 */
	createFamilyGraphService(): FamilyGraphService {
		const graphService = new FamilyGraphService(this.app);
		if (this.folderFilter) {
			graphService.setFolderFilter(this.folderFilter);
		}
		if (this.personIndex) {
			graphService.setPersonIndex(this.personIndex);
		}
		// Set settings for note type detection
		graphService.setSettings(this.settings);

		// Populate research coverage and conflict counts when fact-level tracking is enabled
		if (this.settings.trackFactSourcing) {
			this.populateResearchCoverage(graphService);
			this.populateConflictCounts(graphService);
		}

		return graphService;
	}

	/**
	 * Populate research coverage percentages for all people in the graph
	 */
	private populateResearchCoverage(graphService: FamilyGraphService): void {
		const evidenceService = new EvidenceService(this.app, this.settings);
		const people = graphService.getAllPeople();

		for (const person of people) {
			const coverage = evidenceService.getFactCoverageForFile(person.file);
			if (coverage) {
				graphService.setResearchCoverage(person.crId, coverage.coveragePercent);
			}
		}
	}

	/**
	 * Populate conflict counts for all people in the graph
	 * Counts proof summaries with status 'conflicted' or evidence with 'conflicts' support
	 */
	private populateConflictCounts(graphService: FamilyGraphService): void {
		const proofService = new ProofSummaryService(this.app, this.settings);
		if (this.personIndex) {
			proofService.setPersonIndex(this.personIndex);
		}
		const people = graphService.getAllPeople();

		for (const person of people) {
			const proofs = proofService.getProofsForPerson(person.crId);

			// Count conflicts: proofs with status 'conflicted' OR proofs with any conflicting evidence
			let conflictCount = 0;
			for (const proof of proofs) {
				if (proof.status === 'conflicted') {
					conflictCount++;
				} else if (proof.evidence.some(e => e.supports === 'conflicts')) {
					conflictCount++;
				}
			}

			if (conflictCount > 0) {
				graphService.setConflictCount(person.crId, conflictCount);
			}
		}
	}

	/**
	 * Create a PlaceGraphService configured with folder filter and settings
	 */
	createPlaceGraphService(): PlaceGraphService {
		const placeGraph = new PlaceGraphService(this.app);
		if (this.folderFilter) {
			placeGraph.setFolderFilter(this.folderFilter);
		}
		placeGraph.setSettings(this.settings);
		placeGraph.setValueAliases(this.settings.valueAliases);
		return placeGraph;
	}

	async onload() {
		console.debug('Loading Charted Roots plugin');

		// Register custom icons for visual tree reports
		registerCustomIcons();

		await this.loadSettings();

		// Initialize logger with saved log level
		LoggerFactory.setLogLevel(this.settings.logLevel);

		// Initialize folder filter service
		this.folderFilter = new FolderFilterService(this.settings);

		// Initialize template filter service (connects to folder filter)
		this.templateFilter = new TemplateFilterService(this.app, this.settings);
		this.folderFilter.setTemplateFilter(this.templateFilter);

		// Initialize person index service (for wikilink resolution)
		this.personIndex = new PersonIndexService(this.app, this.settings);
		this.personIndex.setFolderFilter(this.folderFilter);

		// Initialize event service
		this.eventService = new EventService(this.app, this.settings);

		// Initialize recent files service
		this.recentFilesService = new RecentFilesService(this);

		// Initialize media service
		this.mediaService = new MediaService(this.app, this.settings);

		// Initialize Web Clipper service
		this.webClipperService = new WebClipperService(this.app, this.settings);
		this.webClipperService.startWatching();

		// Run migration for property rename (collection_name -> group_name)
		await this.migrateCollectionNameToGroupName();

		// Run migration for plugin rename (Charted Roots -> Charted Roots)
		// This updates canvas metadata and code block types in vault files
		await this.migrateCanvasRootsToChartedRoots();

		// Add settings tab
		this.addSettingTab(new CanvasRootsSettingTab(this.app, this));

		// Trigger Style Settings plugin to parse our CSS settings block
		// Delay to ensure Style Settings plugin is loaded first
		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.trigger('parse-style-settings');

			// Initialize template folder detection after plugins are loaded
			if (this.templateFilter) {
				this.templateFilter.initialize();
			}
		});

		this.registerViews();
		this.registerCodeBlockProcessors();
		this.registerCommandsAndEvents();
		this.registerContextMenus();

		// Check for version upgrade and show migration notice if needed
		this.app.workspace.onLayoutReady(() => {
			void this.checkVersionUpgrade();
		});

		// Register file modification handler for bidirectional sync
		this.registerFileModificationHandler();

		// Initialize bidirectional relationship snapshots
		// This enables deletion detection from the first edit after plugin load
		if (this.settings.enableBidirectionalSync) {
			this.initializeBidirectionalSnapshots();
		}

		// Initialize relationship history service
		await this.initializeRelationshipHistory();
	}

	// =========================================================================
	// View registrations
	// =========================================================================

	private registerViews(): void {
		// Register family chart view
		this.registerView(
			VIEW_TYPE_FAMILY_CHART,
			(leaf) => new FamilyChartView(leaf, this)
		);

		// Register map view
		this.registerView(
			VIEW_TYPE_MAP,
			(leaf) => new MapView(leaf, this)
		);

		// Register statistics view
		this.registerView(
			VIEW_TYPE_STATISTICS,
			(leaf) => new StatisticsView(leaf, this)
		);

		// Register calendar view
		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) => new CalendarView(leaf, this)
		);

		// Register relationships view
		this.registerView(
			VIEW_TYPE_RELATIONSHIPS,
			(leaf) => new RelationshipsView(leaf, this)
		);

		// Register people view
		this.registerView(
			VIEW_TYPE_PEOPLE,
			(leaf) => new PeopleView(leaf, this)
		);

		// Register events view
		this.registerView(
			VIEW_TYPE_EVENTS,
			(leaf) => new EventsView(leaf, this)
		);

		// Register places view
		this.registerView(
			VIEW_TYPE_PLACES,
			(leaf) => new PlacesView(leaf, this)
		);

		// Register organizations view
		this.registerView(
			VIEW_TYPE_ORGANIZATIONS,
			(leaf) => new OrganizationsView(leaf, this)
		);

		// Register sources view
		this.registerView(
			VIEW_TYPE_SOURCES,
			(leaf) => new SourcesView(leaf, this)
		);

		// Register universes view
		this.registerView(
			VIEW_TYPE_UNIVERSES,
			(leaf) => new UniversesView(leaf, this)
		);

		// Register collections view
		this.registerView(
			VIEW_TYPE_COLLECTIONS,
			(leaf) => new CollectionsView(leaf, this)
		);

		// Register data quality view
		this.registerView(
			VIEW_TYPE_DATA_QUALITY,
			(leaf) => new DataQualityView(leaf, this)
		);

		// Register migration notice view (for upgrade notifications)
		this.registerView(
			VIEW_TYPE_MIGRATION_NOTICE,
			(leaf) => new MigrationNoticeView(leaf, this)
		);

		// Register entity profile view
		this.registerView(
			VIEW_TYPE_ENTITY_PROFILE,
			(leaf) => new ProfileView(leaf, this)
		);

		// Register URI protocol handler for opening map at specific coordinates
		// Usage: obsidian://charted-roots-map?lat=51.5074&lng=-0.1278&zoom=12
		// Also register legacy canvas-roots-map for backward compatibility
		const mapProtocolHandler = async (params: ObsidianProtocolData) => {
			const lat = parseFloat(params.lat);
			const lng = parseFloat(params.lng);
			const zoom = params.zoom ? parseInt(params.zoom, 10) : 12;

			if (!isNaN(lat) && !isNaN(lng)) {
				await this.activateMapView(undefined, false, undefined, { lat, lng, zoom });
			}
		};
		this.registerObsidianProtocolHandler('charted-roots-map', mapProtocolHandler);
		this.registerObsidianProtocolHandler('canvas-roots-map', mapProtocolHandler); // Legacy compatibility
	}

	// =========================================================================
	// Code block processors
	// =========================================================================

	private registerCodeBlockProcessors(): void {
		// Register dynamic content code block processors
		// Register both new (charted-roots-*) and legacy (canvas-roots-*) for backward compatibility
		const timelineProcessor = new TimelineProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-timeline',
			(source, el, ctx) => timelineProcessor.process(source, el, ctx)
		);
		this.registerMarkdownCodeBlockProcessor(
			'canvas-roots-timeline', // Legacy compatibility
			(source, el, ctx) => timelineProcessor.process(source, el, ctx)
		);

		const relationshipsProcessor = new RelationshipsProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-relationships',
			(source, el, ctx) => relationshipsProcessor.process(source, el, ctx)
		);
		this.registerMarkdownCodeBlockProcessor(
			'canvas-roots-relationships', // Legacy compatibility
			(source, el, ctx) => relationshipsProcessor.process(source, el, ctx)
		);

		const mediaProcessor = new MediaProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-media',
			(source, el, ctx) => mediaProcessor.process(source, el, ctx)
		);
		this.registerMarkdownCodeBlockProcessor(
			'canvas-roots-media', // Legacy compatibility
			(source, el, ctx) => mediaProcessor.process(source, el, ctx)
		);

		// Source roles processor (#219)
		const sourceRolesProcessor = new SourceRolesProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-source-roles',
			(source, el, ctx) => sourceRolesProcessor.process(source, el, ctx)
		);

		// Transfers processor (#123)
		const transfersProcessor = new TransfersProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-transfers',
			(source, el, ctx) => transfersProcessor.process(source, el, ctx)
		);

		// Members processor (#268)
		const membersProcessor = new MembersProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-members',
			(source, el, ctx) => membersProcessor.process(source, el, ctx)
		);

		// Sources processor (#278)
		const sourcesProcessor = new SourcesProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-sources',
			(source, el, ctx) => sourcesProcessor.process(source, el, ctx)
		);

		// Extractions processor (#284) — reverse lookup: source → citing entities
		const extractionsProcessor = new ExtractionsProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-extractions',
			(source, el, ctx) => extractionsProcessor.process(source, el, ctx)
		);

		// Negative findings processor (#287) — surfaces negative research results
		const negativeFindingsProcessor = new NegativeFindingsProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-negative-findings',
			(source, el, ctx) => negativeFindingsProcessor.process(source, el, ctx)
		);

		// Research timeline processor (#293) — research activity log with gap detection
		const researchTimelineProcessor = new ResearchTimelineProcessor(this);
		this.registerMarkdownCodeBlockProcessor(
			'charted-roots-research-timeline',
			(source, el, ctx) => researchTimelineProcessor.process(source, el, ctx)
		);
	}

	// =========================================================================
	// Commands and workspace events
	// =========================================================================

	private registerCommandsAndEvents(): void {
		_registerCommandsAndEvents(this);
	}


	// =========================================================================
	// Context menus
	// =========================================================================

	private registerContextMenus(): void {
		registerContextMenus(this);
	}

	/**
	 * Initialize bidirectional relationship snapshots for all person notes
	 * Runs asynchronously after a short delay to avoid blocking plugin startup
	 */
	private initializeBidirectionalSnapshots() {
		// Create the shared bidirectional linker instance
		if (!this.bidirectionalLinker) {
			this.bidirectionalLinker = new BidirectionalLinker(this.app);
			if (this.folderFilter) {
				this.bidirectionalLinker.setFolderFilter(this.folderFilter);
			}
			this.bidirectionalLinker.setEnableInclusiveParents(this.settings.enableInclusiveParents);
			this.bidirectionalLinker.setEnableDnaTracking(this.settings.enableDnaTracking);
		}

		// Run after a 1-second delay to not impact plugin load performance
		setTimeout(() => {
			try {
				this.bidirectionalLinker!.initializeSnapshots();
			} catch (error: unknown) {
				logger.error('snapshot-init', 'Failed to initialize relationship snapshots', {
					error: getErrorMessage(error)
				});
			}
		}, 1000);
	}

	/**
	 * Initialize the relationship history service
	 */
	private async initializeRelationshipHistory() {
		if (!this.settings.enableRelationshipHistory) {
			return;
		}

		// Load existing history data
		const dataKey = RelationshipHistoryService.getDataKey();
		const savedData = await this.loadData();
		const historyData: RelationshipHistoryData | null = savedData?.[dataKey] || null;

		// Create save callback
		const saveCallback = async (data: RelationshipHistoryData) => {
			const allData = await this.loadData() || {};
			allData[dataKey] = data;
			await this.saveData(allData);
		};

		this.relationshipHistory = new RelationshipHistoryService(
			this.app,
			historyData,
			saveCallback
		);

		// Cleanup old entries on startup
		if (this.settings.historyRetentionDays > 0) {
			await this.relationshipHistory.cleanupOldEntries(this.settings.historyRetentionDays);
		}

		logger.info('history-init', 'Relationship history service initialized');
	}

	/**
	 * Show the relationship history modal
	 */
	private showRelationshipHistory(personFile?: TFile) {
		if (!this.relationshipHistory) {
			new Notice('Relationship history is disabled. Enable it in settings.');
			return;
		}

		new RelationshipHistoryModal(this.app, this.relationshipHistory, personFile).open();
	}

	/**
	 * Undo the most recent relationship change
	 */
	private async undoLastRelationshipChange() {
		if (!this.relationshipHistory) {
			new Notice('Relationship history is disabled. Enable it in settings.');
			return;
		}

		const change = await this.relationshipHistory.undoLastChange();
		if (change) {
			new Notice(`Undone: ${formatChangeDescription(change)}`);
		}
	}

	/**
	 * Get the relationship history service (for external use)
	 */
	getRelationshipHistory(): RelationshipHistoryService | null {
		return this.relationshipHistory;
	}

	/**
	 * Register event handler for file modifications to auto-sync relationships
	 * Public to allow settings tab to re-register when settings change
	 */
	registerFileModificationHandler() {
		// Unregister existing handler if present
		if (this.fileModifyEventRef) {
			this.app.metadataCache.offref(this.fileModifyEventRef);
			this.fileModifyEventRef = null;
		}

		// Register new handler if sync is enabled
		if (this.settings.enableBidirectionalSync && this.settings.syncOnFileModify) {
			logger.debug('file-watcher', 'Registering file modification handler for bidirectional sync');

			this.fileModifyEventRef = this.app.metadataCache.on('changed', async (file: TFile) => {
				// Skip if sync is temporarily disabled (e.g., during bulk import)
				if (this._syncDisabled) {
					return;
				}

				// Only process markdown files
				if (file.extension !== 'md') {
					return;
				}

				// Only process files with cr_id (person notes)
				const cache = this.app.metadataCache.getFileCache(file);
				if (!cache?.frontmatter?.cr_id) {
					return;
				}

				logger.debug('file-watcher', 'Person note modified, syncing relationships', {
					file: file.path
				});

				// Sync relationships for this file
				try {
					// Create shared instance if not exists
					if (!this.bidirectionalLinker) {
						this.bidirectionalLinker = new BidirectionalLinker(this.app);
						if (this.folderFilter) {
							this.bidirectionalLinker.setFolderFilter(this.folderFilter);
						}
						this.bidirectionalLinker.setEnableInclusiveParents(this.settings.enableInclusiveParents);
						this.bidirectionalLinker.setEnableDnaTracking(this.settings.enableDnaTracking);
					}
					await this.bidirectionalLinker.syncRelationships(file);
				} catch (error: unknown) {
					logger.error('file-watcher', 'Failed to sync relationships on file modify', {
						file: file.path,
						error: getErrorMessage(error)
					});
				}
			});

			this.registerEvent(this.fileModifyEventRef);
		}
	}

	onunload() {
		console.debug('Unloading Charted Roots plugin');

		// Clean up event handlers
		if (this.fileModifyEventRef) {
			this.app.metadataCache.offref(this.fileModifyEventRef);
		}

		// Cleanup PersonIndexService
		if (this.personIndex) {
			this.personIndex.onunload();
		}

		// Stop Web Clipper file watching
		if (this.webClipperService) {
			this.webClipperService.stopWatching();
		}
	}

	async loadSettings() {
		const savedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

		// Migration: Existing users (who have saved settings but no noteTypeDetection)
		// should keep 'type' as primary for backwards compatibility.
		// New users get 'cr_type' as the default.
		if (savedData && !savedData.noteTypeDetection) {
			// User has existing settings but never configured noteTypeDetection
			// Preserve legacy behavior by using 'type' as primary
			this.settings.noteTypeDetection = {
				enableTagDetection: true,
				primaryTypeProperty: 'type'
			};
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update bidirectional linker with current settings
		if (this.bidirectionalLinker) {
			this.bidirectionalLinker.setEnableInclusiveParents(this.settings.enableInclusiveParents);
			this.bidirectionalLinker.setEnableDnaTracking(this.settings.enableDnaTracking);
		}
	}

	openLinkMediaModal(file: TFile, entityType: string, entityName: string): void {
		_openLinkMediaModal(this, file, entityType, entityName);
	}
	openEditPlaceModal(file: TFile): void { _openEditPlaceModal(this, file); }
	openEditEventModal(file: TFile): void { _openEditEventModal(this, file); }
	openEditPersonModal(file: TFile): void { _openEditPersonModal(this, file); }
	private promptAssignReferenceNumbers(system: NumberingSystem): void { _promptAssignReferenceNumbers(this, system); }
	private promptClearReferenceNumbers(): void { _promptClearReferenceNumbers(this); }
	private promptAssignLineage(): void { _promptAssignLineage(this); }
	private promptRemoveLineage(): void { _promptRemoveLineage(this); }
	private generateTreeForCurrentNote(): void { _generateTreeForCurrentNote(this); }
	async regenerateCanvas(canvasFile: TFile, direction?: 'vertical' | 'horizontal') { return _regenerateCanvas(this, canvasFile, direction); }
	private createPersonNote() { _createPersonNote(this); }
	async generateAllTrees() { return _generateAllTrees(this); }
	async insertDynamicBlocks(files: TFile[]): Promise<void> { return _insertDynamicBlocks(this, files); }
	private async generateExcalidrawTreeForPerson(personFile: TFile) { return _generateExcalidrawTreeForPerson(this, personFile); }


	async createBaseTemplate(folder?: TFolder) { return _createBaseTemplate(this, folder); }
	async createPlacesBaseTemplate(folder?: TFolder) { return _createPlacesBaseTemplate(this, folder); }
	async createOrganizationsBaseTemplate(folder?: TFolder) { return _createOrganizationsBaseTemplate(this, folder); }
	async createSourcesBaseTemplate(folder?: TFolder) { return _createSourcesBaseTemplate(this, folder); }
	async createUniversesBaseTemplate(folder?: TFolder) { return _createUniversesBaseTemplate(this, folder); }
	async createNotesBaseTemplate(folder?: TFolder) { return _createNotesBaseTemplate(this, folder); }
	async createResearchBaseTemplate(folder?: TFolder) { return _createResearchBaseTemplate(this, folder); }
	async createEventsBaseTemplate(folder?: TFolder) { return _createEventsBaseTemplate(this, folder); }
	async createAllBases(options?: { silent?: boolean }): Promise<{ created: string[]; skipped: string[] }> {
		return _createAllBases(this, options);
	}

	/**
	 * Check if user upgraded to a version that needs a migration notice
	 * Currently checks for upgrade to v0.17.0 (source array migration)
	 */
	private async checkVersionUpgrade(): Promise<void> {
		const currentVersion = this.manifest.version;
		const lastSeen = this.settings.lastSeenVersion;

		// Show notice if upgrading to 0.17.x from earlier version (or first install)
		if (this.shouldShowMigrationNotice(lastSeen, currentVersion)) {
			// Open migration notice in main workspace
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.setViewState({
				type: VIEW_TYPE_MIGRATION_NOTICE,
				active: true
			});
		}
	}

	/**
	 * Determine if the migration notice should be shown
	 * Shows when upgrading to versions with breaking changes:
	 * - 0.17.x: Source array migration
	 * - 0.18.x: Event person→persons migration
	 * - 0.19.x: Plugin rename (folder settings reminder)
	 */
	private shouldShowMigrationNotice(lastSeen: string | undefined, current: string): boolean {
		// Parse current version
		const currentParts = current.split('.').map(Number);
		const currentMinor = currentParts[1] || 0;

		// Only show for specific versions with migrations
		const hasMigration = currentMinor === 17 || currentMinor === 18 || currentMinor === 19;
		if (!hasMigration) {
			return false;
		}

		// Show if no previous version recorded (could be upgrade from pre-tracking)
		if (!lastSeen) {
			return true;
		}

		// Parse last seen version and compare
		const lastParts = lastSeen.split('.').map(Number);
		const lastMinor = lastParts[1] || 0;

		// Show if upgrading to a version with migration from an earlier version
		// e.g., upgrading from 0.16.x to 0.17.x, or from 0.17.x to 0.18.x
		if (lastMinor < currentMinor) {
			return true;
		}

		return false;
	}

	/**
	 * Migrate collection_name property to group_name
	 * Runs once on plugin load to ensure all person notes use the new property name
	 */
	private async migrateCollectionNameToGroupName() {
		try {
			const files = this.app.vault.getMarkdownFiles();
			let migratedCount = 0;

			for (const file of files) {
				const cache = this.app.metadataCache.getFileCache(file);

				// Check if this file has collection_name but not group_name
				if (cache?.frontmatter?.collection_name && !cache.frontmatter?.group_name) {
					await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
						// Copy collection_name to group_name
						frontmatter.group_name = frontmatter.collection_name;
						// Remove old property
						delete frontmatter.collection_name;
					});
					migratedCount++;
				}
			}

			if (migratedCount > 0) {
				logger.info('migration', `Migrated ${migratedCount} files from collection_name to group_name`);
			}
		} catch (error: unknown) {
			logger.error('migration', 'Error during collection_name to group_name migration', error);
		}
	}

	/**
	 * Migrate vault data from Charted Roots to Charted Roots format
	 * Updates canvas metadata and code block types
	 * Only runs once (tracked by settings.migratedToChartedRoots flag)
	 */
	private async migrateCanvasRootsToChartedRoots(): Promise<void> {
		// Skip if already migrated
		if (this.settings.migratedToChartedRoots) {
			return;
		}

		try {
			const migrationService = new PluginRenameMigrationService(this.app);

			// Check if migration is actually needed
			const needed = await migrationService.isMigrationNeeded();
			if (!needed) {
				// No files to migrate, just set the flag
				this.settings.migratedToChartedRoots = true;
				await this.saveSettings();
				return;
			}

			// Run migration
			logger.info('migration', 'Starting Charted Roots to Charted Roots migration');
			const result = await migrationService.runMigration();

			// Show notice to user
			showMigrationNotice(result);

			// Set flag to prevent re-running
			this.settings.migratedToChartedRoots = true;
			await this.saveSettings();

			logger.info('migration', 'Charted Roots to Charted Roots migration complete', result);
		} catch (error: unknown) {
			logger.error('migration', 'Error during Charted Roots to Charted Roots migration', error);
			// Don't set flag on error so migration can be retried
		}
	}

	async activateFamilyChartView(rootPersonId?: string, useMainWorkspace = true, forceNew = false): Promise<void> {
		return _activateFamilyChartView(this, rootPersonId, useMainWorkspace, forceNew);
	}
	async activateMapView(mapId?: string, forceNew = false, splitDirection?: 'horizontal' | 'vertical', focusCoordinates?: { lat: number; lng: number; zoom?: number }): Promise<void> {
		return _activateMapView(this, mapId, forceNew, splitDirection, focusCoordinates);
	}
	async activateStatisticsView(): Promise<void> { return _activateStatisticsView(this); }
	async activateCalendarView(): Promise<void> { return _activateCalendarView(this); }
	async activateRelationshipsView(): Promise<void> { return _activateRelationshipsView(this); }
	async activatePeopleView(): Promise<void> { return _activatePeopleView(this); }
	async activateEventsView(): Promise<void> { return _activateEventsView(this); }
	async activatePlacesView(): Promise<void> { return _activatePlacesView(this); }
	async activateOrganizationsView(): Promise<void> { return _activateOrganizationsView(this); }
	async activateSourcesView(): Promise<void> { return _activateSourcesView(this); }
	async activateUniversesView(): Promise<void> { return _activateUniversesView(this); }
	async activateCollectionsView(): Promise<void> { return _activateCollectionsView(this); }
	async activateDataQualityView(): Promise<void> { return _activateDataQualityView(this); }
	async activateProfileView(file?: TFile): Promise<void> { return _activateProfileView(this, file); }
	async moveFamilyChartToMainWorkspace(currentLeaf: WorkspaceLeaf): Promise<void> {
		return _moveFamilyChartToMainWorkspace(this, currentLeaf);
	}
}
