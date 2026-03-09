import { Plugin, Notice, TFile, TFolder, Menu, Platform, Modal, EventRef, WorkspaceLeaf, ObsidianProtocolData } from 'obsidian';
import { CanvasRootsSettings, DEFAULT_SETTINGS, CanvasRootsSettingTab } from './src/settings';
import { ControlCenterModal } from './src/ui/control-center';
import { RegenerateOptionsModal } from './src/ui/regenerate-options-modal';
import { TreeStatisticsModal } from './src/ui/tree-statistics-modal';
import { PersonPickerModal } from './src/ui/person-picker';
import { RelationshipContext } from './src/ui/quick-create-person-modal';
import { RelationshipManager } from './src/core/relationship-manager';
import { RelationshipValidator } from './src/core/relationship-validator';
import { ValidationResultsModal } from './src/ui/validation-results-modal';
import { FindOnCanvasModal } from './src/ui/find-on-canvas-modal';
import { FolderScanModal } from './src/ui/folder-scan-modal';
import { FolderStatisticsModal } from './src/ui/folder-statistics-modal';
import { RelationshipCalculatorModal } from './src/ui/relationship-calculator-modal';
import { LoggerFactory, getLogger } from './src/core/logging';
import { getErrorMessage } from './src/core/error-utils';
import { FamilyGraphService } from './src/core/family-graph';
import { CanvasGenerator } from './src/core/canvas-generator';
import { generatePeopleBaseTemplate } from './src/constants/base-template';
import { generatePlacesBaseTemplate } from './src/constants/places-base-template';
import { ORGANIZATIONS_BASE_TEMPLATE } from './src/constants/organizations-base-template';
import { SOURCES_BASE_TEMPLATE } from './src/constants/sources-base-template';
import { UNIVERSES_BASE_TEMPLATE } from './src/constants/universes-base-template';
import { NOTES_BASE_TEMPLATE } from './src/constants/notes-base-template';
import { RESEARCH_BASE_TEMPLATE } from './src/constants/research-base-template';
import { generateEventsBaseTemplate } from './src/constants/events-base-template';
import { ExcalidrawExporter } from './src/excalidraw/excalidraw-exporter';
import { BidirectionalLinker } from './src/core/bidirectional-linker';
import { generateCrId } from './src/core/uuid';
import { ReferenceNumberingService, NumberingSystem } from './src/core/reference-numbering';
import { LineageTrackingService, LineageType } from './src/core/lineage-tracking';
import { RelationshipHistoryService, RelationshipHistoryData, formatChangeDescription } from './src/core/relationship-history';
import { RelationshipHistoryModal } from './src/ui/relationship-history-modal';
import { FamilyChartView, VIEW_TYPE_FAMILY_CHART } from './src/ui/views/family-chart-view';
import { MapView, VIEW_TYPE_MAP } from './src/maps/map-view';
import { StatisticsView, VIEW_TYPE_STATISTICS } from './src/statistics';
import { RelationshipsView, VIEW_TYPE_RELATIONSHIPS } from './src/relationships/ui/relationships-view';
import { PeopleView, VIEW_TYPE_PEOPLE } from './src/ui/views/people-view';
import { EventsView, VIEW_TYPE_EVENTS } from './src/dates/ui/events-view';
import { PlacesView, VIEW_TYPE_PLACES } from './src/ui/views/places-view';
import { OrganizationsView, VIEW_TYPE_ORGANIZATIONS } from './src/organizations/ui/organizations-view';
import { SourcesView, VIEW_TYPE_SOURCES } from './src/sources/ui/sources-view';
import { UniversesView, VIEW_TYPE_UNIVERSES } from './src/universes/ui/universes-view';
import { CollectionsView, VIEW_TYPE_COLLECTIONS } from './src/ui/collections-view';
import { DataQualityView, VIEW_TYPE_DATA_QUALITY } from './src/ui/data-quality-view';
import { AddResearchQuestionModal } from './src/ui/add-research-question-modal';
import { TreePreviewRenderer } from './src/ui/tree-preview';
import { FolderFilterService } from './src/core/folder-filter';
import { TemplateFilterService } from './src/core/template-filter';
import { PersonIndexService } from './src/core/person-index-service';
import { SplitWizardModal } from './src/ui/split-wizard-modal';
import { CreatePlaceModal } from './src/ui/create-place-modal';
import { PlaceLookupModal } from './src/places/ui/place-lookup-modal';
import { CreatePersonModal } from './src/ui/create-person-modal';
import { CreateMapWizardModal } from './src/ui/create-map-wizard-modal';
import type { SpouseMetadata } from './src/core/person-note-writer';
import { PlaceGraphService } from './src/core/place-graph';
import { MergeDuplicatePlacesModal, findDuplicatePlaceNotes } from './src/ui/merge-duplicate-places-modal';
import { SchemaService, ValidationService } from './src/schemas';
import { AddRelationshipModal } from './src/ui/add-relationship-modal';
import { SourcePickerModal, SourceService, CreateSourceModal, CitationGeneratorModal, EvidenceService, ProofSummaryService } from './src/sources';
import { EventService } from './src/events/services/event-service';
import { CreateEventModal } from './src/events/ui/create-event-modal';
import { isPlaceNote, isSourceNote, isEventNote, isMapNote, isSchemaNote, isUniverseNote, isPersonNote, isOrganizationNote } from './src/utils/note-type-detection';
import { extractWikilinkPath } from './src/utils/wikilink-resolver';
import { GeocodingService } from './src/maps/services/geocoding-service';
import { TimelineProcessor, RelationshipsProcessor, MediaProcessor, SourceRolesProcessor, TransfersProcessor, MembersProcessor, SourcesProcessor, ExtractionsProcessor } from './src/dynamic-content';
import { UniverseService, EditUniverseModal, UniverseWizardModal } from './src/universes';
import { RecentFilesService, RecentEntityType } from './src/core/recent-files-service';
import { registerCustomIcons } from './src/ui/lucide-icons';
import { MediaService } from './src/core/media-service';
import { MediaPickerModal } from './src/core/ui/media-picker-modal';
import { MediaManageModal } from './src/core/ui/media-manage-modal';
import { CleanupWizardModal } from './src/ui/cleanup-wizard-modal';
import { MigrationNoticeView, VIEW_TYPE_MIGRATION_NOTICE } from './src/ui/views/migration-notice-view';
import { ProfileView, VIEW_TYPE_ENTITY_PROFILE } from './src/profile-view/profile-view';
import { WebClipperService } from './src/core/web-clipper-service';
import { PluginRenameMigrationService, showMigrationNotice } from './src/migration/plugin-rename-migration-service';

import { registerContextMenus, promptLineageName } from './src/plugin/context-menus';

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
	}

	// =========================================================================
	// Commands and workspace events
	// =========================================================================

	private registerCommandsAndEvents(): void {
		// Add ribbon icon for control center
		this.addRibbonIcon('users', 'Open Charted Roots control center', () => {
			new ControlCenterModal(this.app, this).open();
		});

		// Add command: Open Control Center
		this.addCommand({
			id: 'open-control-center',
			name: 'Open control center',
			callback: () => {
				new ControlCenterModal(this.app, this).open();
			}
		});

		// Add command: Manage Staging Area
		this.addCommand({
			id: 'manage-staging-area',
			name: 'Manage staging area',
			callback: async () => {
				const { StagingManagementModal } = await import('./src/ui/staging-management-modal');
				new StagingManagementModal(this.app, this).open();
			}
		});

		// Add command: Open Statistics Dashboard
		this.addCommand({
			id: 'open-statistics-dashboard',
			name: 'Open statistics dashboard',
			callback: () => {
				void this.activateStatisticsView();
			}
		});

		// Add command: Open Relationships view
		this.addCommand({
			id: 'open-relationships-view',
			name: 'Open relationships',
			callback: () => {
				void this.activateRelationshipsView();
			}
		});

		// Add command: Open People view
		this.addCommand({
			id: 'open-people-view',
			name: 'Open people',
			callback: () => {
				void this.activatePeopleView();
			}
		});

		// Add command: Open Events view
		this.addCommand({
			id: 'open-events-view',
			name: 'Open events',
			callback: () => {
				void this.activateEventsView();
			}
		});

		// Add command: Open Places view
		this.addCommand({
			id: 'open-places-view',
			name: 'Open places',
			callback: () => {
				void this.activatePlacesView();
			}
		});

		// Add command: Open Organizations view
		this.addCommand({
			id: 'open-organizations-view',
			name: 'Open organizations',
			callback: () => {
				void this.activateOrganizationsView();
			}
		});

		// Add command: Open Sources view
		this.addCommand({
			id: 'open-sources-view',
			name: 'Open sources',
			callback: () => {
				void this.activateSourcesView();
			}
		});

		// Add command: Open Universes view
		this.addCommand({
			id: 'open-universes-view',
			name: 'Open universes',
			callback: () => {
				void this.activateUniversesView();
			}
		});

		// Add command: Open Collections view
		this.addCommand({
			id: 'open-collections-view',
			name: 'Open collections',
			callback: () => {
				void this.activateCollectionsView();
			}
		});

		// Add command: Open Data Quality view
		this.addCommand({
			id: 'open-data-quality-view',
			name: 'Open data quality',
			callback: () => {
				void this.activateDataQualityView();
			}
		});

		// Add command: Open Entity Profile
		this.addCommand({
			id: 'open-entity-profile',
			name: 'Open entity profile',
			callback: () => {
				void this.activateProfileView();
			}
		});

		// Add command: Add research question to current note
		this.addCommand({
			id: 'add-research-question',
			name: 'Add research question to current note',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;

				const cache = this.app.metadataCache.getFileCache(file);
				const crType = cache?.frontmatter?.cr_type;
				const crId = cache?.frontmatter?.cr_id;

				// Valid for person notes (with cr_id), event notes, and place notes
				const validTypes = ['person', 'event', 'place'];
				const isValidType = validTypes.includes(crType);
				const isLegacyPersonNote = crId && !crType; // Legacy person notes have cr_id but no cr_type

				if (!isValidType && !isLegacyPersonNote) return false;

				if (!checking) {
					new AddResearchQuestionModal(this.app, file).open();
				}
				return true;
			}
		});

		// Add command: Post-Import Cleanup Wizard
		this.addCommand({
			id: 'open-cleanup-wizard',
			name: 'Post-import cleanup wizard',
			callback: () => {
				new CleanupWizardModal(this.app, this).open();
			}
		});

		// Register workspace event to open Control Center to a specific tab
		// Used by Plugin Settings to link to Preferences tab
		// Register both new and legacy event names for backward compatibility
		const openControlCenter = (initialTab?: string) => {
			new ControlCenterModal(this.app, this, initialTab).open();
		};
		this.registerEvent(
			this.app.workspace.on('charted-roots:open-control-center' as 'layout-change', openControlCenter)
		);
		this.registerEvent(
			this.app.workspace.on('canvas-roots:open-control-center' as 'layout-change', openControlCenter) // Legacy
		);

		// Register workspace event to open Cleanup Wizard
		// Used by Migration Notice view
		const openCleanupWizard = () => {
			new CleanupWizardModal(this.app, this).open();
		};
		this.registerEvent(
			this.app.workspace.on('charted-roots:open-cleanup-wizard' as 'layout-change', openCleanupWizard)
		);
		this.registerEvent(
			this.app.workspace.on('canvas-roots:open-cleanup-wizard' as 'layout-change', openCleanupWizard) // Legacy
		);

		// Check for version upgrade and show migration notice if needed
		this.app.workspace.onLayoutReady(() => {
			void this.checkVersionUpgrade();
		});

		// Add command: Generate Tree for Current Note
		this.addCommand({
			id: 'generate-tree-for-current-note',
			name: 'Generate tree for current note',
			callback: () => {
				void this.generateTreeForCurrentNote();
			}
		});

		// Add command: Regenerate Tree
		this.addCommand({
			id: 'regenerate-tree',
			name: 'Regenerate tree',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();

				if (!activeFile || activeFile.extension !== 'canvas') {
					new Notice('No active canvas. Please open a canvas file first.');
					return;
				}

				// Show options modal
				new RegenerateOptionsModal(this.app, this, activeFile).open();
			}
		});

		// Add command: Create Person Note
		this.addCommand({
			id: 'create-person-note',
			name: 'Create person note',
			callback: () => {
				this.createPersonNote();
			}
		});

		// Add command: Create Family Wizard
		this.addCommand({
			id: 'create-family-wizard',
			name: 'Create family wizard',
			callback: () => {
				void import('./src/ui/family-creation-wizard').then(({ FamilyCreationWizardModal }) => {
					new FamilyCreationWizardModal(this.app, this).open();
				});
			}
		});

		// Add command: Create Event Note
		this.addCommand({
			id: 'create-event-note',
			name: 'Create event note',
			callback: () => {
				if (this.eventService) {
					new CreateEventModal(this.app, this.eventService, this.settings).open();
				}
			}
		});

		// Add command: Edit current note (opens appropriate edit modal based on note type)
		this.addCommand({
			id: 'edit-current-note',
			name: 'Edit current note',
			checkCallback: (checking) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile || activeFile.extension !== 'md') {
					return false;
				}

				const cache = this.app.metadataCache.getFileCache(activeFile);
				const fm = cache?.frontmatter;
				const detectionSettings = this.settings.noteTypeDetection;

				// Check if this is a supported note type
				const isPerson = isPersonNote(fm, cache, detectionSettings);
				const isPlace = isPlaceNote(fm, cache, detectionSettings);
				const isEvent = isEventNote(fm, cache, detectionSettings);

				if (!isPerson && !isPlace && !isEvent) {
					return false;
				}

				if (!checking) {
					if (isPerson) {
						this.openEditPersonModal(activeFile);
					} else if (isPlace) {
						this.openEditPlaceModal(activeFile);
					} else if (isEvent) {
						this.openEditEventModal(activeFile);
					}
				}

				return true;
			}
		});

		// Add command: Generate All Trees (for multi-family vaults)
		this.addCommand({
			id: 'generate-all-trees',
			name: 'Generate all trees',
			callback: () => {
				void this.generateAllTrees();
			}
		});

		// Add command: Create Base Template
		this.addCommand({
			id: 'create-base-template',
			name: 'Create base template',
			callback: () => {
				void this.createBaseTemplate();
			}
		});

		// Add command: Create Organizations Base Template
		this.addCommand({
			id: 'create-organizations-base-template',
			name: 'Create organizations base template',
			callback: () => {
				void this.createOrganizationsBaseTemplate();
			}
		});

		// Add command: Create Sources Base Template
		this.addCommand({
			id: 'create-sources-base-template',
			name: 'Create sources base template',
			callback: () => {
				void this.createSourcesBaseTemplate();
			}
		});

		// Add command: Create Places Base Template
		this.addCommand({
			id: 'create-places-base-template',
			name: 'Create places base template',
			callback: () => {
				void this.createPlacesBaseTemplate();
			}
		});

		// Add command: Create Events Base Template
		this.addCommand({
			id: 'create-events-base-template',
			name: 'Create events base template',
			callback: () => {
				void this.createEventsBaseTemplate();
			}
		});

		// Add command: Create Universe
		this.addCommand({
			id: 'create-universe',
			name: 'Create universe',
			callback: () => {
				new UniverseWizardModal(this, {
					onComplete: () => {
						// Universe created successfully
					}
				}).open();
			}
		});

		// Add command: Create Universes Base Template
		this.addCommand({
			id: 'create-universes-base-template',
			name: 'Create universes base template',
			callback: () => {
				void this.createUniversesBaseTemplate();
			}
		});

		// Add command: Create Notes Base Template
		this.addCommand({
			id: 'create-notes-base-template',
			name: 'Create notes base template',
			callback: () => {
				void this.createNotesBaseTemplate();
			}
		});

		// Add command: Create Research Base Template
		this.addCommand({
			id: 'create-research-base-template',
			name: 'Create research base template',
			callback: () => {
				void this.createResearchBaseTemplate();
			}
		});

		// Add command: Create All Base Templates
		this.addCommand({
			id: 'create-all-bases',
			name: 'Create all base templates',
			callback: () => {
				void this.createAllBases();
			}
		});

		// Add command: Calculate Relationship
		this.addCommand({
			id: 'calculate-relationship',
			name: 'Calculate relationship between people',
			callback: () => {
				new RelationshipCalculatorModal(this.app).open();
			}
		});

		// Add command: Find Duplicates
		this.addCommand({
			id: 'find-duplicates',
			name: 'Find duplicate people',
			callback: async () => {
				const { DuplicateDetectionModal } = await import('./src/ui/duplicate-detection-modal');
				new DuplicateDetectionModal(this.app, this.settings).open();
			}
		});

		// Add command: Open Family Chart
		// If a person note is active, use it as the root; otherwise show picker/empty state
		this.addCommand({
			id: 'open-family-chart',
			name: 'Open family chart',
			callback: () => {
				// Try to get cr_id from active note if it's a person note
				const activeFile = this.app.workspace.getActiveFile();
				let crId: string | undefined;
				if (activeFile && activeFile.extension === 'md') {
					const cache = this.app.metadataCache.getFileCache(activeFile);
					crId = this.resolveFrontmatterProperty<string>(cache?.frontmatter, 'cr_id');
				}
				void this.activateFamilyChartView(crId);
			}
		});

		// Add command: Open Map View
		this.addCommand({
			id: 'open-map-view',
			name: 'Open map view',
			callback: () => {
				void this.activateMapView();
			}
		});

		// Add command: Open New Map View (for side-by-side comparison)
		this.addCommand({
			id: 'open-new-map-view',
			name: 'Open new map view (for comparison)',
			callback: () => {
				void this.activateMapView(undefined, true);
			}
		});

		// Add command: Open new Family Chart (always creates new tab)
		this.addCommand({
			id: 'open-new-family-chart',
			name: 'Open new family chart',
			callback: () => {
				void this.activateFamilyChartView(undefined, true, true);
			}
		});

		// Add command: Open Family Chart for Current Note
		this.addCommand({
			id: 'open-family-chart-for-note',
			name: 'Open current note in family chart',
			checkCallback: (checking) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile || activeFile.extension !== 'md') {
					return false;
				}
				const cache = this.app.metadataCache.getFileCache(activeFile);
				const crId = this.resolveFrontmatterProperty<string>(cache?.frontmatter, 'cr_id');
				if (!crId) {
					return false;
				}
				if (!checking) {
					void this.activateFamilyChartView(crId);
				}
				return true;
			}
		});

		// Add command: Assign Ahnentafel Numbers
		this.addCommand({
			id: 'assign-ahnentafel',
			name: 'Assign Ahnentafel numbers (ancestors)',
			callback: () => {
				this.promptAssignReferenceNumbers('ahnentafel');
			}
		});

		// Add command: Assign d'Aboville Numbers
		this.addCommand({
			id: 'assign-daboville',
			name: "Assign d'Aboville numbers (descendants)",
			callback: () => {
				this.promptAssignReferenceNumbers('daboville');
			}
		});

		// Add command: Assign Henry Numbers
		this.addCommand({
			id: 'assign-henry',
			name: 'Assign Henry numbers (descendants)',
			callback: () => {
				this.promptAssignReferenceNumbers('henry');
			}
		});

		// Add command: Assign Generation Numbers
		this.addCommand({
			id: 'assign-generation',
			name: 'Assign generation numbers (all relatives)',
			callback: () => {
				this.promptAssignReferenceNumbers('generation');
			}
		});

		// Add command: Clear Reference Numbers
		this.addCommand({
			id: 'clear-reference-numbers',
			name: 'Clear reference numbers',
			callback: () => {
				this.promptClearReferenceNumbers();
			}
		});

		// Add command: Assign Lineage
		this.addCommand({
			id: 'assign-lineage',
			name: 'Assign lineage from root person',
			callback: () => {
				this.promptAssignLineage();
			}
		});

		// Add command: Remove Lineage
		this.addCommand({
			id: 'remove-lineage',
			name: 'Remove lineage tags',
			callback: () => {
				this.promptRemoveLineage();
			}
		});

		// Add command: View relationship history
		this.addCommand({
			id: 'view-relationship-history',
			name: 'View relationship history',
			callback: () => {
				this.showRelationshipHistory();
			}
		});

		// Add command: Undo last relationship change
		this.addCommand({
			id: 'undo-relationship-change',
			name: 'Undo last relationship change',
			callback: () => {
				void this.undoLastRelationshipChange();
			}
		});

		// Add command: Split Tree Wizard
		this.addCommand({
			id: 'split-tree-wizard',
			name: 'Split tree wizard',
			callback: () => {
				new SplitWizardModal(this.app, this.settings, this.folderFilter ?? undefined).open();
			}
		});

		// Add command: Create Place Note
		this.addCommand({
			id: 'create-place-note',
			name: 'Create place note',
			callback: () => {
				new CreatePlaceModal(this.app, {
					directory: this.settings.placesFolder || '',
					familyGraph: this.createFamilyGraphService(),
					placeGraph: this.createPlaceGraphService(),
					settings: this.settings,
					plugin: this
				}).open();
			}
		});

		// Add command: Look up Place (#218)
		this.addCommand({
			id: 'lookup-place',
			name: 'Look up place',
			callback: () => {
				new PlaceLookupModal(this.app, {
					settings: this.settings,
					onSelect: (result) => {
						// Open Create Place modal with the selected result pre-populated
						new CreatePlaceModal(this.app, {
							directory: this.settings.placesFolder || '',
							initialName: result.standardizedName,
							initialPlaceType: result.placeType,
							familyGraph: this.createFamilyGraphService(),
							placeGraph: this.createPlaceGraphService(),
							settings: this.settings,
							plugin: this,
							prefilledCoordinates: result.coordinates ? {
								lat: result.coordinates.lat,
								lng: result.coordinates.lng
							} : undefined
						}).open();
					}
				}).open();
			}
		});

		// Add command: Create Custom Map
		this.addCommand({
			id: 'create-custom-map',
			name: 'Create custom map',
			callback: () => {
				new CreateMapWizardModal(this.app, this, {
					directory: this.settings.mapsFolder
				}).open();
			}
		});

		// Add command: Open Places Tab
		this.addCommand({
			id: 'open-places-tab',
			name: 'Open places tab',
			callback: () => {
				const modal = new ControlCenterModal(this.app, this);
				modal.openToTab('places');
			}
		});

		// Add command: Merge Duplicate Places
		this.addCommand({
			id: 'merge-duplicate-places',
			name: 'Merge duplicate place notes',
			callback: () => {
				const duplicateGroups = findDuplicatePlaceNotes(this.app, {
					settings: this.settings,
					folderFilter: this.folderFilter
				});
				if (duplicateGroups.length === 0) {
					new Notice('No duplicate place notes found. Your places are unique!');
					return;
				}
				new MergeDuplicatePlacesModal(this.app, duplicateGroups).open();
			}
		});

		// Add command: Open Schemas Tab
		this.addCommand({
			id: 'open-schemas-tab',
			name: 'Open schemas tab',
			callback: () => {
				const modal = new ControlCenterModal(this.app, this);
				modal.openToTab('schemas');
			}
		});

		// Add command: Validate Vault Against Schemas
		this.addCommand({
			id: 'validate-vault-schemas',
			name: 'Validate vault against schemas',
			callback: async () => {
				const schemaService = new SchemaService(this);
				const validationService = new ValidationService(this, schemaService);

				new Notice('Running schema validation...');

				try {
					const results = await validationService.validateVault();
					const summary = validationService.getSummary(results);

					const failedCount = new Set(results.filter(r => !r.isValid).map(r => r.filePath)).size;
					const passedCount = summary.totalPeopleValidated - failedCount;

					new Notice(`Schema validation: ${passedCount} passed, ${failedCount} failed, ${summary.totalErrors} errors`);

					// Open Control Center to Schemas tab to show full results
					const modal = new ControlCenterModal(this.app, this);
					modal.openToTab('schemas');
				} catch (error) {
					new Notice(`Schema validation failed: ${getErrorMessage(error)}`);
				}
			}
		});

		// Add command: Add Custom Relationship
		this.addCommand({
			id: 'add-custom-relationship',
			name: 'Add custom relationship to current person',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();

				if (!activeFile || activeFile.extension !== 'md') {
					new Notice('No active markdown file. Please open a person note first.');
					return;
				}

				// Check if the file has a cr_id (is a person note)
				const cache = this.app.metadataCache.getFileCache(activeFile);
				if (!cache?.frontmatter?.cr_id) {
					new Notice('Current file is not a person note (missing cr_id)');
					return;
				}

				new AddRelationshipModal(this.app, this, activeFile).open();
			}
		});

		// Add command: Insert Dynamic Blocks
		this.addCommand({
			id: 'insert-dynamic-blocks',
			name: 'Insert dynamic blocks in current note',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();

				if (!activeFile || activeFile.extension !== 'md') {
					new Notice('No active markdown file. Please open a person note first.');
					return;
				}

				// Check if the file has a cr_id (is a person note)
				const cache = this.app.metadataCache.getFileCache(activeFile);
				if (!cache?.frontmatter?.cr_id) {
					new Notice('Current file is not a person note (missing cr_id)');
					return;
				}

				await this.insertDynamicBlocks([activeFile]);
			}
		});

		// Add command: Open Relationships Tab
		this.addCommand({
			id: 'open-relationships-tab',
			name: 'Open relationships tab',
			callback: () => {
				const modal = new ControlCenterModal(this.app, this);
				modal.openToTab('relationships');
			}
		});

		// Add command: Create Organization Note
		this.addCommand({
			id: 'create-organization-note',
			name: 'Create organization note',
			callback: async () => {
				const { CreateOrganizationModal } = await import('./src/organizations');
				new CreateOrganizationModal(this.app, this, () => {
					// Optionally open to organizations tab after creation
				}).open();
			}
		});

		// Add command: Open Organizations Tab
		this.addCommand({
			id: 'open-organizations-tab',
			name: 'Open organizations tab',
			callback: () => {
				const modal = new ControlCenterModal(this.app, this);
				modal.openToTab('organizations');
			}
		});

		// Add command: Create Source Note
		this.addCommand({
			id: 'create-source-note',
			name: 'Create source note',
			callback: async () => {
				const { CreateSourceModal } = await import('./src/sources');
				new CreateSourceModal(this.app, this, () => {
					// Optionally open to sources tab after creation
				}).open();
			}
		});

		// Add command: Create Note (Phase 4 Gramps Notes)
		this.addCommand({
			id: 'create-note',
			name: 'Create note',
			callback: async () => {
				const { CreateNoteModal } = await import('./src/ui/create-note-modal');
				new CreateNoteModal(this.app, this).open();
			}
		});

		// Add command: Open Sources Tab
		this.addCommand({
			id: 'open-sources-tab',
			name: 'Open sources tab',
			callback: () => {
				const modal = new ControlCenterModal(this.app, this);
				modal.openToTab('sources');
			}
		});

		// Add command: Generate Place Notes
		this.addCommand({
			id: 'generate-place-notes',
			name: 'Generate place notes from place strings',
			callback: async () => {
				const { PlaceGeneratorModal } = await import('./src/enhancement/ui/place-generator-modal');
				new PlaceGeneratorModal(this.app, this.settings).open();
			}
		});
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

	/**
	 * Open media picker to link media files to an entity
	 */
	openLinkMediaModal(file: TFile, entityType: string, entityName: string): void {
		if (!this.mediaService) {
			new Notice('Media service not available');
			return;
		}

		// Get existing media from frontmatter
		const cache = this.app.metadataCache.getFileCache(file);
		const existingMedia = this.mediaService.parseMediaProperty(cache?.frontmatter || {});

		new MediaPickerModal(
			this.app,
			this.mediaService,
			(selectedFiles) => {
				if (!this.mediaService) return;

				// Add each selected file as a wikilink
				void (async () => {
					for (const mediaFile of selectedFiles) {
						const wikilink = this.mediaService!.pathToWikilink(mediaFile.path);
						await this.mediaService!.addMediaToEntity(file, wikilink);
					}

					new Notice(`Linked ${selectedFiles.length} media file${selectedFiles.length !== 1 ? 's' : ''} to ${entityName}`);
				})();
			},
			{
				title: 'Link media',
				subtitle: `Select media files to link to ${entityName}`,
				multiSelect: true,
				existingMedia
			},
			this
		).open();
	}

	/**
	 * Open the place edit modal for a place note
	 */
	openEditPlaceModal(file: TFile): void {
		// Get the place cr_id from frontmatter
		const cache = this.app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id;

		if (!crId) {
			new Notice('Place note does not have a cr_id');
			return;
		}

		// Load the place from the place graph
		const placeGraph = this.createPlaceGraphService();
		placeGraph.reloadCache();
		const place = placeGraph.getPlaceByCrId(crId);

		if (!place) {
			new Notice('Could not find place in graph');
			return;
		}

		// Get family graph for collection options
		const familyGraph = new FamilyGraphService(this.app);
		void familyGraph.reloadCache();

		// Open the modal in edit mode
		new CreatePlaceModal(this.app, {
			editPlace: place,
			editFile: file,
			familyGraph,
			placeGraph,
			settings: this.settings
		}).open();
	}

	/**
	 * Open the event edit modal for an event note
	 */
	openEditEventModal(file: TFile): void {
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;

		if (!fm?.cr_id) {
			new Notice('Event note does not have a cr_id');
			return;
		}

		// Get event from service
		const eventService = new EventService(this.app, this.settings);
		const event = eventService.getEventByFile(file);

		if (!event) {
			new Notice('Could not find event data');
			return;
		}

		// Open the edit modal
		new CreateEventModal(this.app, eventService, this.settings, {
			editEvent: event,
			editFile: file,
			onUpdated: () => {
				new Notice('Event updated');
			}
		}).open();
	}

	/**
	 * Open the person edit modal for a person note
	 */
	openEditPersonModal(file: TFile): void {
		// Get frontmatter data
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;

		if (!fm?.cr_id) {
			new Notice('Person note does not have a cr_id');
			return;
		}

		// Extract relationship names from wikilinks
		const extractName = (value: string | undefined): string | undefined => {
			if (!value) return undefined;
			// Handle wikilink format: [[Name]] or "[[Name]]"
			const match = value.match(/\[\[([^\]]+)\]\]/);
			return match ? match[1] : value;
		};

		// Extract spouse names/IDs - check for indexed format first (#204)
		const spouseNames: string[] = [];
		const spouseIds: string[] = [];
		const spouseMetadata: SpouseMetadata[] = [];

		// Check for indexed spouse format (spouse1, spouse1_id, spouse1_marriage_date, etc.)
		let hasIndexedSpouses = false;
		for (let i = 1; i <= 10; i++) {
			const spouseLink = fm[`spouse${i}`];
			const spouseId = fm[`spouse${i}_id`];
			if (spouseLink || spouseId) {
				hasIndexedSpouses = true;
				const name = extractName(String(spouseLink || ''));
				const crId = String(spouseId || '');

				if (name) spouseNames.push(name);
				if (crId) spouseIds.push(crId);

				// Build metadata object
				spouseMetadata.push({
					crId: crId || '',
					name: name || crId || `Spouse ${i}`,
					marriageDate: fm[`spouse${i}_marriage_date`] as string | undefined,
					marriageLocation: fm[`spouse${i}_marriage_location`] as string | undefined,
					marriageStatus: fm[`spouse${i}_marriage_status`] as SpouseMetadata['marriageStatus'],
					divorceDate: fm[`spouse${i}_divorce_date`] as string | undefined
				});
			}
		}

		// Fall back to legacy array format if no indexed spouses found
		if (!hasIndexedSpouses) {
			if (fm.spouse) {
				const spouses = Array.isArray(fm.spouse) ? fm.spouse : [fm.spouse];
				for (const s of spouses) {
					const name = extractName(String(s));
					if (name) spouseNames.push(name);
				}
			}
			if (fm.spouse_id) {
				const ids = Array.isArray(fm.spouse_id) ? fm.spouse_id : [fm.spouse_id];
				for (const id of ids) {
					spouseIds.push(String(id));
				}
			}
		}

		// Extract children names/IDs
		const childNames: string[] = [];
		const childIds: string[] = [];
		if (fm.children) {
			const children = Array.isArray(fm.children) ? fm.children : [fm.children];
			for (const c of children) {
				const name = extractName(String(c));
				if (name) childNames.push(name);
			}
		}
		if (fm.children_id) {
			const ids = Array.isArray(fm.children_id) ? fm.children_id : [fm.children_id];
			for (const id of ids) {
				childIds.push(String(id));
			}
		}

		// Extract sources names/IDs
		const sourceNames: string[] = [];
		const sourceIds: string[] = [];
		if (fm.sources) {
			const sources = Array.isArray(fm.sources) ? fm.sources : [fm.sources];
			for (const s of sources) {
				const name = extractName(String(s));
				if (name) sourceNames.push(name);
			}
		}
		if (fm.sources_id) {
			const ids = Array.isArray(fm.sources_id) ? fm.sources_id : [fm.sources_id];
			for (const id of ids) {
				sourceIds.push(String(id));
			}
		}

		// Extract gender-neutral parents names/IDs
		const parentNames: string[] = [];
		const parentIds: string[] = [];
		if (fm.parents) {
			const parents = Array.isArray(fm.parents) ? fm.parents : [fm.parents];
			for (const p of parents) {
				const name = extractName(String(p));
				if (name) parentNames.push(name);
			}
		}
		if (fm.parents_id) {
			const ids = Array.isArray(fm.parents_id) ? fm.parents_id : [fm.parents_id];
			for (const id of ids) {
				parentIds.push(String(id));
			}
		}

		// Use factory methods to get properly configured graph services
		const familyGraph = this.createFamilyGraphService();
		const placeGraph = this.createPlaceGraphService();

		// Merge universes from both places and people
		const placeUniverses = placeGraph.getAllUniverses();
		const personUniverses = familyGraph.getAllUniverses();
		const allUniverses = [...new Set([...placeUniverses, ...personUniverses])].sort();

		// Open the modal in edit mode
		new CreatePersonModal(this.app, {
			editFile: file,
			editPersonData: {
				crId: String(fm.cr_id),
				name: String(fm.name || ''),
				personType: fm.personType,
				gender: fm.gender || fm.sex,
				pronouns: fm.pronouns,
				// Name components (#174, #192)
				givenName: fm.given_name,
				surnames: Array.isArray(fm.surnames) ? fm.surnames : (fm.surnames ? [fm.surnames] : undefined),
				maidenName: fm.maiden_name,
				marriedNames: Array.isArray(fm.married_names) ? fm.married_names : (fm.married_names ? [fm.married_names] : undefined),
				// Dates and places
				born: fm.born,
				died: fm.died,
				birthPlace: fm.birth_place,
				deathPlace: fm.death_place,
				birthPlaceId: fm.birth_place_id,
				birthPlaceName: extractName(fm.birth_place),
				deathPlaceId: fm.death_place_id,
				deathPlaceName: extractName(fm.death_place),
				occupation: fm.occupation,
				researchLevel: typeof fm.research_level === 'number' ? fm.research_level : undefined,
				fatherId: fm.father_id,
				fatherName: extractName(fm.father),
				motherId: fm.mother_id,
				motherName: extractName(fm.mother),
				spouseIds: spouseIds.length > 0 ? spouseIds : undefined,
				spouseNames: spouseNames.length > 0 ? spouseNames : undefined,
				spouseMetadata: spouseMetadata.length > 0 ? spouseMetadata : undefined,
				childIds: childIds.length > 0 ? childIds : undefined,
				childNames: childNames.length > 0 ? childNames : undefined,
				sourceIds: sourceIds.length > 0 ? sourceIds : undefined,
				sourceNames: sourceNames.length > 0 ? sourceNames : undefined,
				parentIds: parentIds.length > 0 ? parentIds : undefined,
				parentNames: parentNames.length > 0 ? parentNames : undefined,
				collection: fm.collection,
				universe: fm.universe,
				// DNA tracking fields
				dnaSharedCm: typeof fm.dna_shared_cm === 'number' ? fm.dna_shared_cm : undefined,
				dnaTestingCompany: fm.dna_testing_company,
				dnaKitId: fm.dna_kit_id,
				dnaMatchType: fm.dna_match_type,
				dnaEndogamyFlag: typeof fm.dna_endogamy_flag === 'boolean' ? fm.dna_endogamy_flag : undefined,
				dnaNotes: fm.dna_notes
			},
			familyGraph,
			placeGraph,
			settings: this.settings,
			propertyAliases: this.settings.propertyAliases,
			existingUniverses: allUniverses,
			plugin: this
		}).open();
	}

	/**
	 * Prompt user to select a person and assign reference numbers
	 */
	private promptAssignReferenceNumbers(system: NumberingSystem): void {
		const picker = new PersonPickerModal(this.app, (selectedPerson) => {
			void (async () => {
				try {
					const service = new ReferenceNumberingService(this.app);
					let stats;

					new Notice(`Assigning ${system} numbers from ${selectedPerson.name}...`);

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
		});
		picker.open();
	}

	/**
	 * Prompt user to select a numbering system and clear those numbers
	 */
	private promptClearReferenceNumbers(): void {
		const systemChoices: { system: NumberingSystem; label: string }[] = [
			{ system: 'ahnentafel', label: 'Ahnentafel numbers' },
			{ system: 'daboville', label: "d'Aboville numbers" },
			{ system: 'henry', label: 'Henry numbers' },
			{ system: 'generation', label: 'Generation numbers' }
		];

		const menu = new Menu();
		for (const choice of systemChoices) {
			menu.addItem((item) => {
				item
					.setTitle(`Clear ${choice.label}`)
					.setIcon('trash-2')
					.onClick(async () => {
						try {
							const service = new ReferenceNumberingService(this.app);
							new Notice(`Clearing ${choice.label}...`);
							const count = await service.clearNumbers(choice.system);
							new Notice(`Cleared ${count} ${choice.label}`);
						} catch (error) {
							logger.error('clear-numbers', `Failed to clear ${choice.label}`, error);
							new Notice(`Failed to clear numbers: ${getErrorMessage(error)}`);
						}
					});
			});
		}
		menu.showAtMouseEvent(new MouseEvent('click'));
	}

	/**
	 * Prompt user to select a person and lineage type, then assign lineage
	 */
	private promptAssignLineage(): void {
		const picker = new PersonPickerModal(this.app, (selectedPerson) => {
			void (async () => {
				// Show lineage type selection
				const lineageType = await this.promptLineageType();
				if (!lineageType) return;

				// Prompt for lineage name
				const lineageName = await promptLineageName(this, selectedPerson.name);
				if (!lineageName) return;

				try {
					const service = new LineageTrackingService(this.app);
					new Notice(`Assigning "${lineageName}" lineage from ${selectedPerson.name}...`);

					const stats = await service.assignLineage({
						name: lineageName,
						rootCrId: selectedPerson.crId,
						type: lineageType
					});

					new Notice(`Assigned "${lineageName}" to ${stats.totalMembers} descendants (${stats.maxGeneration} generations)`);
				} catch (error) {
					logger.error('lineage-tracking', 'Failed to assign lineage', error);
					new Notice(`Failed to assign lineage: ${getErrorMessage(error)}`);
				}
			})();
		});
		picker.open();
	}

	/**
	 * Prompt user to select and remove a lineage
	 */
	private promptRemoveLineage(): void {
		try {
			const service = new LineageTrackingService(this.app);
			const lineages = service.getAllLineages();

			if (lineages.length === 0) {
				new Notice('No lineages found in vault');
				return;
			}

			const menu = new Menu();
			for (const lineage of lineages) {
				menu.addItem((item) => {
					item
						.setTitle(`Remove "${lineage}"`)
						.setIcon('trash-2')
						.onClick(async () => {
							try {
								new Notice(`Removing "${lineage}" lineage...`);
								const count = await service.removeLineage(lineage);
								new Notice(`Removed "${lineage}" from ${count} people`);
							} catch (error) {
								logger.error('lineage-tracking', 'Failed to remove lineage', error);
								new Notice(`Failed to remove lineage: ${getErrorMessage(error)}`);
							}
						});
				});
			}
			menu.showAtMouseEvent(new MouseEvent('click'));
		} catch (error) {
			logger.error('lineage-tracking', 'Failed to get lineages', error);
			new Notice(`Failed to get lineages: ${getErrorMessage(error)}`);
		}
	}

	/**
	 * Prompt user to select a lineage type
	 */
	private async promptLineageType(): Promise<LineageType | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Select lineage type');

			modal.contentEl.createEl('p', {
				text: 'How should descendants be traced?'
			});

			const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

			const allBtn = buttonContainer.createEl('button', {
				text: 'All descendants',
				cls: 'mod-cta'
			});
			allBtn.addEventListener('click', () => {
				modal.close();
				resolve('all');
			});

			const patriBtn = buttonContainer.createEl('button', {
				text: 'Patrilineal'
			});
			patriBtn.addEventListener('click', () => {
				modal.close();
				resolve('patrilineal');
			});

			const matriBtn = buttonContainer.createEl('button', {
				text: 'Matrilineal'
			});
			matriBtn.addEventListener('click', () => {
				modal.close();
				resolve('matrilineal');
			});

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(null);
			});

			modal.open();
		});
	}

	private generateTreeForCurrentNote(): void {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice('No active note. Please open a person note first.');
			return;
		}

		// Check if the active file is a person note (has cr_id)
		const cache = this.app.metadataCache.getFileCache(activeFile);
		if (!cache?.frontmatter?.cr_id) {
			new Notice('Current note is not a person note (missing cr_id field)');
			return;
		}

		// Open Control Center with this person pre-selected
		const modal = new ControlCenterModal(this.app, this);
		modal.openWithPerson(activeFile);
	}

	async regenerateCanvas(canvasFile: TFile, direction?: 'vertical' | 'horizontal') {
		try {
			new Notice('Regenerating canvas...');

			// 1. Read current Canvas JSON
			const canvasContent = await this.app.vault.read(canvasFile);
			const canvasData = JSON.parse(canvasContent);

			if (!canvasData.nodes || canvasData.nodes.length === 0) {
				new Notice('Canvas is empty - nothing to regenerate');
				return;
			}

			// 2. Try to read original generation metadata from canvas
			const storedMetadata = canvasData.metadata?.frontmatter;
			const isCanvasRootsTree = storedMetadata?.plugin === 'charted-roots' || storedMetadata?.plugin === 'canvas-roots';

			// 3. Extract person note nodes (file nodes only)
			const personNodes = canvasData.nodes.filter(
				(node: { type: string; file?: string }) =>
					node.type === 'file' && node.file?.endsWith('.md')
			);

			if (personNodes.length === 0) {
				new Notice('No person notes found in canvas');
				return;
			}

			// 4. Determine root person and tree parameters
			let rootCrId: string | undefined;
			let rootPersonName: string | undefined;
			let treeType: 'full' | 'ancestors' | 'descendants' = 'full';
			let maxGenerations: number | undefined;
			let includeSpouses: boolean = true;

			if (isCanvasRootsTree && storedMetadata.generation) {
				// Use stored metadata if available
				rootCrId = storedMetadata.generation.rootCrId;
				rootPersonName = storedMetadata.generation.rootPersonName;
				treeType = storedMetadata.generation.treeType;
				maxGenerations = storedMetadata.generation.maxGenerations || undefined;
				includeSpouses = storedMetadata.generation.includeSpouses;
			} else {
				// Fallback: find first node with cr_id
				for (const node of personNodes) {
					const file = this.app.vault.getAbstractFileByPath(node.file);
					if (file instanceof TFile) {
						const cache = this.app.metadataCache.getFileCache(file);
						if (cache?.frontmatter?.cr_id) {
							rootCrId = cache.frontmatter.cr_id;
							rootPersonName = file.basename;
							break;
						}
					}
				}

				if (!rootCrId || !rootPersonName) {
					new Notice('No person notes with cr_id found in canvas');
					return;
				}

				// Default to full tree for canvases without metadata
				treeType = 'full';
				maxGenerations = undefined;
				includeSpouses = true;
			}

			// Validate we have root person info before proceeding
			if (!rootCrId || !rootPersonName) {
				new Notice('No person notes with cr_id found in canvas');
				return;
			}

			// 5. Build family tree using original parameters
			const graphService = this.createFamilyGraphService();
			const familyTree = graphService.generateTree({
				rootCrId,
				treeType,
				maxGenerations,
				includeSpouses
			});

			if (!familyTree) {
				new Notice('Failed to build family tree from canvas nodes');
				return;
			}

			// 6. Determine layout settings (prefer stored, fall back to current settings)
			const nodeWidth = storedMetadata?.layout?.nodeWidth ?? this.settings.defaultNodeWidth;
			const nodeHeight = storedMetadata?.layout?.nodeHeight ?? this.settings.defaultNodeHeight;
			const nodeSpacingX = storedMetadata?.layout?.nodeSpacingX ?? this.settings.horizontalSpacing;
			const nodeSpacingY = storedMetadata?.layout?.nodeSpacingY ?? this.settings.verticalSpacing;
			const originalDirection = storedMetadata?.generation?.direction ?? 'vertical';

			// 7. Recalculate layout preserving original parameters (except direction if user changed it)
			const canvasGenerator = new CanvasGenerator();

			// Convert plural tree type (from TreeOptions) to singular (for LayoutOptions)
			const layoutTreeType: 'ancestor' | 'descendant' | 'full' =
				treeType === 'ancestors' ? 'ancestor' :
				treeType === 'descendants' ? 'descendant' :
				'full';

			// Preserve style overrides from stored metadata if present
			const styleOverrides = storedMetadata?.styleOverrides;

			const newCanvasData = canvasGenerator.generateCanvas(familyTree, {
				nodeSpacingX,
				nodeSpacingY,
				nodeWidth,
				nodeHeight,
				direction: direction ?? originalDirection,
				treeType: layoutTreeType,
				nodeColorScheme: this.settings.nodeColorScheme,
				showLabels: true,
				useFamilyChartLayout: true,
				parentChildArrowStyle: this.settings.parentChildArrowStyle,
				spouseArrowStyle: this.settings.spouseArrowStyle,
				parentChildEdgeColor: this.settings.parentChildEdgeColor,
				spouseEdgeColor: this.settings.spouseEdgeColor,
				showSpouseEdges: this.settings.showSpouseEdges,
				spouseEdgeLabelFormat: this.settings.spouseEdgeLabelFormat,
				showSourceIndicators: this.settings.showSourceIndicators,
				showResearchCoverage: this.settings.trackFactSourcing,
				canvasRootsMetadata: {
					plugin: 'charted-roots',
					generation: {
						rootCrId: rootCrId,
						rootPersonName: rootPersonName,
						treeType: treeType,
						maxGenerations: maxGenerations || 0,
						includeSpouses,
						direction: direction ?? originalDirection,
						timestamp: Date.now()
					},
					layout: {
						nodeWidth,
						nodeHeight,
						nodeSpacingX,
						nodeSpacingY
					},
					// Preserve style overrides during regeneration
					styleOverrides: styleOverrides
				}
			});

			// 6. Update Canvas JSON with new data (preserves any non-person nodes)
			const updatedCanvasData = {
				...canvasData,
				nodes: newCanvasData.nodes,
				edges: newCanvasData.edges,
				metadata: newCanvasData.metadata
			};

			// 7. Format and write back to Canvas file (using same formatting as Control Center)
			const formattedJson = this.formatCanvasJson(updatedCanvasData);
			await this.app.vault.modify(canvasFile, formattedJson);

			new Notice(`Canvas regenerated successfully! (${newCanvasData.nodes.length} people)`);
		} catch (error: unknown) {
			console.error('Error regenerating canvas:', error);
			new Notice('Failed to regenerate canvas. Check console for details.');
		}
	}

	/**
	 * Format canvas JSON to match Obsidian's exact format
	 * Uses tabs for structure and compact objects on single lines
	 */
	private formatCanvasJson(data: unknown): string {
		const canvasData = data as {
			nodes: Array<Record<string, unknown>>;
			edges: Array<Record<string, unknown>>;
			metadata?: Record<string, unknown>;
		};

		const lines: string[] = [];
		lines.push('{');

		// Nodes array
		lines.push('\t"nodes":[');
		canvasData.nodes.forEach((node, i) => {
			const isLast = i === canvasData.nodes.length - 1;
			const nodeStr = JSON.stringify(node);
			lines.push(`\t\t${nodeStr}${isLast ? '' : ','}`);
		});
		lines.push('\t],');

		// Edges array
		lines.push('\t"edges":[');
		canvasData.edges.forEach((edge, i) => {
			const isLast = i === canvasData.edges.length - 1;
			const edgeStr = JSON.stringify(edge);
			lines.push(`\t\t${edgeStr}${isLast ? '' : ','}`);
		});
		lines.push('\t],');

		// Metadata
		lines.push('\t"metadata":{');
		lines.push('\t\t"version":"1.0-1.0",');
		const frontmatter = canvasData.metadata?.frontmatter || {};
		lines.push(`\t\t"frontmatter":${JSON.stringify(frontmatter)}`);
		lines.push('\t}');

		lines.push('}');

		return lines.join('\n');
	}

	private createPersonNote() {
		const familyGraph = this.createFamilyGraphService();

		new CreatePersonModal(this.app, {
			directory: this.settings.peopleFolder || '',
			familyGraph,
			propertyAliases: this.settings.propertyAliases,
			plugin: this,
			onCreated: (file) => {
				// Track the newly created person in recent files
				const recentService = this.getRecentFilesService();
				if (recentService) {
					void recentService.trackFile(file, 'person');
				}
			}
		}).open();
	}

	async generateAllTrees() {
		new Notice('Finding all family groups...');

		try {
			// Open Control Center to generate all trees
			const modal = new ControlCenterModal(this.app, this);
			await modal.openAndGenerateAllTrees();
		} catch (error: unknown) {
			console.error('Error generating all trees:', error);
			new Notice('Failed to generate all trees. Check console for details.');
		}
	}

	/**
	 * Insert dynamic content blocks into person note(s)
	 * Adds canvas-roots-timeline and canvas-roots-relationships code blocks
	 */
	async insertDynamicBlocks(files: TFile[]): Promise<void> {
		// For bulk operations (10+ files), show progress
		const showProgress = files.length >= 10;
		let progressNotice: Notice | null = null;

		if (showProgress) {
			progressNotice = new Notice(
				`Inserting dynamic blocks: 0/${files.length}...`,
				0 // Don't auto-dismiss
			);
		}

		try {
			let addedCount = 0;
			let skippedCount = 0;
			let errorCount = 0;
			let processedCount = 0;

			for (const file of files) {
				try {
					// Check if this note has cr_id
					const cache = this.app.metadataCache.getFileCache(file);
					if (!cache?.frontmatter?.cr_id) {
						skippedCount++;
						processedCount++;
						continue;
					}

					const content = await this.app.vault.read(file);
					const blocksToAdd: string[] = [];
					const detectionSettings = this.settings.noteTypeDetection;

					const fm = cache.frontmatter;

					if (isOrganizationNote(fm, cache, detectionSettings)) {
						// Organization note: insert members block (#268)
						const hasMembers = content.includes('```charted-roots-members');
						if (hasMembers) {
							skippedCount++;
							processedCount++;
							continue;
						}
						blocksToAdd.push('```charted-roots-members');
						blocksToAdd.push('group-by: role');
						blocksToAdd.push('```');
						blocksToAdd.push('');
					} else if (isPersonNote(fm, cache, detectionSettings)) {
						// Person note: insert relationships, timeline, media blocks
						const hasRelationships = content.includes('```charted-roots-relationships') || content.includes('```canvas-roots-relationships');
						const hasTimeline = content.includes('```charted-roots-timeline') || content.includes('```canvas-roots-timeline');
						const hasMedia = content.includes('```charted-roots-media') || content.includes('```canvas-roots-media');

						if (hasRelationships && hasTimeline && hasMedia) {
							skippedCount++;
							processedCount++;
							continue;
						}

						if (!hasRelationships) {
							blocksToAdd.push('```charted-roots-relationships');
							blocksToAdd.push('type: immediate');
							blocksToAdd.push('```');
							blocksToAdd.push('');
						}

						if (!hasTimeline) {
							blocksToAdd.push('```charted-roots-timeline');
							blocksToAdd.push('sort: chronological');
							blocksToAdd.push('```');
							blocksToAdd.push('');
						}

						if (!hasMedia) {
							blocksToAdd.push('```charted-roots-media');
							blocksToAdd.push('columns: 3');
							blocksToAdd.push('size: medium');
							blocksToAdd.push('editable: true');
							blocksToAdd.push('```');
							blocksToAdd.push('');
						}
					} else if (
						isEventNote(fm, cache, detectionSettings) ||
						isPlaceNote(fm, cache, detectionSettings) ||
						isSourceNote(fm, cache, detectionSettings)
					) {
						// Event/Place/Source notes: media block only (#269)
						const hasMedia = content.includes('```charted-roots-media') || content.includes('```canvas-roots-media');
						if (hasMedia) {
							skippedCount++;
							processedCount++;
							continue;
						}
						blocksToAdd.push('```charted-roots-media');
						blocksToAdd.push('columns: 3');
						blocksToAdd.push('size: medium');
						blocksToAdd.push('editable: true');
						blocksToAdd.push('```');
						blocksToAdd.push('');
					} else {
						// Unknown entity type — skip
						skippedCount++;
						processedCount++;
						continue;
					}

					if (blocksToAdd.length === 0) {
						skippedCount++;
						processedCount++;
						continue;
					}

					// Find insertion point after frontmatter
					const frontmatterEnd = content.indexOf('---', 3);
					if (frontmatterEnd === -1) {
						// No frontmatter, add at start
						const newContent = blocksToAdd.join('\n') + '\n' + content;
						await this.app.vault.modify(file, newContent);
					} else {
						// Insert after frontmatter
						const insertPoint = frontmatterEnd + 3;
						const before = content.slice(0, insertPoint);
						const after = content.slice(insertPoint);
						// Ensure proper spacing
						const newContent = before + '\n\n' + blocksToAdd.join('\n') + after;
						await this.app.vault.modify(file, newContent);
					}

					addedCount++;
					processedCount++;

					// Update progress notice every 5 files or at the end
					if (progressNotice && (processedCount % 5 === 0 || processedCount === files.length)) {
						progressNotice.setMessage(
							`Inserting dynamic blocks: ${processedCount}/${files.length} (${addedCount} added)...`
						);
					}

				} catch (error: unknown) {
					console.error(`Error adding dynamic blocks to ${file.path}:`, error);
					errorCount++;
					processedCount++;
				}
			}

			// Hide progress notice
			if (progressNotice) {
				progressNotice.hide();
			}

			// Show summary
			if (files.length === 1) {
				if (addedCount === 1) {
					new Notice('Added dynamic content blocks');
				} else if (skippedCount === 1) {
					new Notice('Note already has dynamic blocks or is not a supported note type');
				} else {
					new Notice('Failed to add dynamic blocks');
				}
			} else {
				const parts = [];
				if (addedCount > 0) parts.push(`${addedCount} updated`);
				if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
				if (errorCount > 0) parts.push(`${errorCount} errors`);
				new Notice(`Dynamic blocks: ${parts.join(', ')}`);
			}

		} catch (error: unknown) {
			// Hide progress notice on error
			if (progressNotice) {
				progressNotice.hide();
			}
			console.error('Error inserting dynamic blocks:', error);
			new Notice('Failed to add dynamic blocks');
		}
	}

	/**
	 * Generate an Excalidraw tree directly from a person note
	 * Uses default settings for quick generation
	 */
	private async generateExcalidrawTreeForPerson(personFile: TFile) {
		try {
			new Notice('Generating Excalidraw tree...');

			// Get person info from file metadata
			const cache = this.app.metadataCache.getFileCache(personFile);
			if (!cache?.frontmatter?.cr_id) {
				new Notice('Invalid person note: missing cr_id');
				return;
			}

			const rootCrId = cache.frontmatter.cr_id;
			const rootName = cache.frontmatter.name || personFile.basename;

			// Generate tree with default settings
			const graphService = this.createFamilyGraphService();
			const familyTree = graphService.generateTree({
				rootCrId,
				treeType: 'full',
				maxGenerations: 5,
				includeSpouses: true
			});

			if (!familyTree) {
				new Notice('Failed to generate tree: root person not found');
				return;
			}

			// Generate canvas with default options
			const canvasGenerator = new CanvasGenerator();
			const canvasData = canvasGenerator.generateCanvas(familyTree, {
				direction: 'vertical',
				nodeSpacingX: 300,
				nodeSpacingY: 200,
				layoutType: this.settings.defaultLayoutType,
				nodeColorScheme: this.settings.nodeColorScheme,
				showLabels: true,
				useFamilyChartLayout: true,
				parentChildArrowStyle: this.settings.parentChildArrowStyle,
				spouseArrowStyle: this.settings.spouseArrowStyle,
				parentChildEdgeColor: this.settings.parentChildEdgeColor,
				spouseEdgeColor: this.settings.spouseEdgeColor,
				showSpouseEdges: this.settings.showSpouseEdges,
				spouseEdgeLabelFormat: this.settings.spouseEdgeLabelFormat,
				showSourceIndicators: this.settings.showSourceIndicators,
				showResearchCoverage: this.settings.trackFactSourcing
			});

			// Create temporary canvas file
			const tempCanvasName = `temp-${Date.now()}.canvas`;
			const tempCanvasPath = `${personFile.parent?.path || ''}/${tempCanvasName}`;
			const tempCanvasFile = await this.app.vault.create(tempCanvasPath, JSON.stringify(canvasData, null, '\t'));

			// Export to Excalidraw
			const exporter = new ExcalidrawExporter(this.app);
			const result = await exporter.exportToExcalidraw({
				canvasFile: tempCanvasFile,
				preserveColors: true,
				fontSize: 16,
				strokeWidth: 2
			});

			// Delete temporary canvas file (respects user's deletion preference)
			await this.app.fileManager.trashFile(tempCanvasFile);

			if (!result.success) {
				new Notice(`Export failed: ${result.errors.join(', ')}`);
				return;
			}

			// Save Excalidraw file to vault root
			const outputFileName = `Family Tree - ${rootName}.excalidraw.md`;

			// Check if file exists and create unique name if needed
			let finalPath = outputFileName;
			let counter = 1;
			while (this.app.vault.getAbstractFileByPath(finalPath)) {
				finalPath = `Family Tree - ${rootName} (${counter}).excalidraw.md`;
				counter++;
			}

			await this.app.vault.create(finalPath, result.excalidrawContent!);

			new Notice(`Generated Excalidraw tree with ${result.elementsExported} elements`);

			// Open the newly created file
			const excalidrawFile = this.app.vault.getAbstractFileByPath(finalPath);
			if (excalidrawFile instanceof TFile) {
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(excalidrawFile);
			}
		} catch (error: unknown) {
			console.error('Error generating Excalidraw tree:', error);
			new Notice(`Failed to generate Excalidraw tree: ${getErrorMessage(error)}`);
		}
	}

	async createBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			// Bases is a core Obsidian feature (1.9.0+), not a community plugin
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'people.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content (using aliased property names)
			const templateContent = generatePeopleBaseTemplate({
				aliases: this.settings.propertyAliases,
				maxLivingAge: this.settings.livingPersonAgeThreshold
			});
			const file = await this.app.vault.create(defaultPath, templateContent);

			new Notice('Base template created with 22 pre-configured views!');
			logger.info('base-template', `Created base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('base-template', 'Failed to create base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create a places base template file in the specified folder
	 */
	async createPlacesBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			// Bases is a core Obsidian feature (1.9.0+), not a community plugin
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'places.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Places base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content (using aliased property names)
			const templateContent = generatePlacesBaseTemplate(this.settings.propertyAliases);
			const file = await this.app.vault.create(defaultPath, templateContent);

			new Notice('Places base template created with 14 pre-configured views!');
			logger.info('places-base-template', `Created places base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('places-base-template', 'Failed to create places base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Places base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create an organizations base template file in the specified folder
	 */
	async createOrganizationsBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			// Bases is a core Obsidian feature (1.9.0+), not a community plugin
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'organizations.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Organizations base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content
			const file = await this.app.vault.create(defaultPath, ORGANIZATIONS_BASE_TEMPLATE);

			new Notice('Organizations base template created with 17 pre-configured views!');
			logger.info('organizations-base-template', `Created organizations base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('organizations-base-template', 'Failed to create organizations base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Organizations base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create a sources base template file in the specified folder
	 */
	async createSourcesBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			// Bases is a core Obsidian feature (1.9.0+), not a community plugin
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'sources.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Sources base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content
			const file = await this.app.vault.create(defaultPath, SOURCES_BASE_TEMPLATE);

			new Notice('Sources base template created with 18 pre-configured views!');
			logger.info('sources-base-template', `Created sources base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('sources-base-template', 'Failed to create sources base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Sources base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create a universes base template file in the specified folder
	 */
	public async createUniversesBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			// Bases is a core Obsidian feature (1.9.0+), not a community plugin
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'universes.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Universes base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content
			const file = await this.app.vault.create(defaultPath, UNIVERSES_BASE_TEMPLATE);

			new Notice('Universes base template created with 12 pre-configured views!');
			logger.info('universes-base-template', `Created universes base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('universes-base-template', 'Failed to create universes base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Universes base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create a notes base template file in the specified folder
	 * Part of Phase 4 Gramps Notes integration
	 */
	public async createNotesBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'notes.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Notes base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content
			const file = await this.app.vault.create(defaultPath, NOTES_BASE_TEMPLATE);

			new Notice('Notes base template created with 11 pre-configured views!');
			logger.info('notes-base-template', `Created notes base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('notes-base-template', 'Failed to create notes base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Notes base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create a research base template file in the specified folder
	 */
	async createResearchBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'research.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Research base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content
			const file = await this.app.vault.create(defaultPath, RESEARCH_BASE_TEMPLATE);

			new Notice('Research base template created with 12 pre-configured views!');
			logger.info('research-base-template', `Created research base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('research-base-template', 'Failed to create research base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Research base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Create an events base template file in the specified folder
	 */
	async createEventsBaseTemplate(folder?: TFolder) {
		try {
			// Validate: Check if Bases feature is available
			// Bases is a core Obsidian feature (1.9.0+), not a community plugin
			const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
			// @ts-expect-error - accessing internal plugins
			const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
			const isBasesAvailable = baseFiles.length > 0 ||
				(basesInternalPlugin?.enabled === true);

			if (!isBasesAvailable) {
				const proceed = await this.confirmBaseCreation();
				if (!proceed) return;
			}

			// Determine the target path - use basesFolder if configured, otherwise use context folder
			const targetFolder = this.settings.basesFolder || (folder ? folder.path : '');
			const folderPath = targetFolder ? targetFolder + '/' : '';
			const defaultPath = folderPath + 'events.base';

			// Create the bases folder if it doesn't exist
			if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
				await this.app.vault.createFolder(this.settings.basesFolder);
			}

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice(`Events base template already exists at ${defaultPath}`);
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content (using aliased property names)
			const templateContent = generateEventsBaseTemplate(this.settings.propertyAliases);
			const file = await this.app.vault.create(defaultPath, templateContent);

			new Notice('Events base template created with 20 pre-configured views!');
			logger.info('events-base-template', `Created events base template at ${defaultPath}`);

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			logger.error('events-base-template', 'Failed to create events base template', error);

			// Provide specific error messages
			if (errorMsg.includes('already exists')) {
				new Notice('A file with this name already exists.');
			} else if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
				new Notice('Permission denied. Check file system permissions.');
			} else if (errorMsg.includes('ENOSPC')) {
				new Notice('Disk full. Free up space and try again.');
			} else {
				new Notice(`Failed to create Events base template: ${errorMsg}`);
			}
		}
	}

	/**
	 * Confirm base creation if Bases plugin may not be installed
	 */
	private async confirmBaseCreation(): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Bases plugin not detected');

			modal.contentEl.createEl('p', {
				text: 'The Obsidian Bases plugin does not appear to be installed. The .base file will be created, but you\'ll need to install the Bases plugin to use it.'
			});

			modal.contentEl.createEl('p', {
				text: 'Would you like to create the template anyway?',
				cls: 'cr-confirm-text'
			});

			const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

			const createBtn = buttonContainer.createEl('button', {
				text: 'Create anyway',
				cls: 'mod-cta'
			});
			createBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			modal.open();
		});
	}

	/**
	 * Check if Bases feature is available in Obsidian
	 */
	private isBasesAvailable(): boolean {
		const baseFiles = this.app.vault.getFiles().filter(f => f.extension === 'base');
		// @ts-expect-error - accessing internal plugins
		const basesInternalPlugin = this.app.internalPlugins?.plugins?.['bases'];
		return baseFiles.length > 0 || (basesInternalPlugin?.enabled === true);
	}

	/**
	 * Create all base templates at once
	 * Silently skips bases that already exist
	 */
	async createAllBases(options?: { silent?: boolean }): Promise<{ created: string[]; skipped: string[] }> {
		const created: string[] = [];
		const skipped: string[] = [];
		const silent = options?.silent ?? false;

		// In interactive mode, confirm with user if Bases feature isn't already in use
		// In silent mode (auto-create after import), always proceed - bases files are useful
		// even if the Bases plugin isn't currently enabled
		if (!silent && !this.isBasesAvailable()) {
			const proceed = await this.confirmBaseCreation();
			if (!proceed) return { created, skipped };
		}

		// Determine the target folder
		const targetFolder = this.settings.basesFolder || '';
		const folderPath = targetFolder ? targetFolder + '/' : '';

		// Create the bases folder if it doesn't exist
		if (this.settings.basesFolder && !this.app.vault.getAbstractFileByPath(this.settings.basesFolder)) {
			await this.app.vault.createFolder(this.settings.basesFolder);
		}

		// Define all base types with their templates
		const baseTypes = [
			{ name: 'people', file: 'people.base', generator: () => generatePeopleBaseTemplate(this.settings.propertyAliases) },
			{ name: 'places', file: 'places.base', generator: () => generatePlacesBaseTemplate(this.settings.propertyAliases) },
			{ name: 'events', file: 'events.base', generator: () => generateEventsBaseTemplate(this.settings.propertyAliases) },
			{ name: 'organizations', file: 'organizations.base', generator: () => ORGANIZATIONS_BASE_TEMPLATE },
			{ name: 'sources', file: 'sources.base', generator: () => SOURCES_BASE_TEMPLATE },
			{ name: 'research', file: 'research.base', generator: () => RESEARCH_BASE_TEMPLATE },
		];

		for (const baseType of baseTypes) {
			const filePath = folderPath + baseType.file;
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);

			if (existingFile) {
				skipped.push(baseType.name);
			} else {
				try {
					const content = baseType.generator();
					await this.app.vault.create(filePath, content);
					created.push(baseType.name);
				} catch (error: unknown) {
					logger.error('create-all-bases', `Failed to create ${baseType.name} base`, error);
					skipped.push(baseType.name);
				}
			}
		}

		if (!silent) {
			if (created.length > 0) {
				new Notice(`Created ${created.length} base${created.length > 1 ? 's' : ''}: ${created.join(', ')}`);
			}
			if (skipped.length > 0 && created.length === 0) {
				new Notice('All bases already exist');
			}
		}

		logger.info('create-all-bases', `Created: ${created.join(', ') || 'none'}, Skipped: ${skipped.join(', ') || 'none'}`);
		return { created, skipped };
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

	/**
	 * Activate the Family Chart view
	 * Opens an existing view or creates a new one
	 * @param rootPersonId - Optional cr_id to set as root person
	 * @param useMainWorkspace - If true, opens in main workspace instead of sidebar
	 * @param forceNew - If true, always creates a new view even if one exists
	 */
	async activateFamilyChartView(rootPersonId?: string, useMainWorkspace: boolean = true, forceNew: boolean = false): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_FAMILY_CHART);
		let isNewLeaf = false;

		// Check if we should reuse an existing leaf
		// Only reuse if one exists, we're not forcing new, AND we have a root person to show
		// (without a root person, opening existing view would show stale data)
		if (leaves.length > 0 && !forceNew && rootPersonId) {
			// Find an existing leaf, preferring one in main workspace if useMainWorkspace is true
			if (useMainWorkspace) {
				// Try to find a leaf in main workspace first
				const mainLeaf = leaves.find(l => l.getRoot() === workspace.rootSplit);
				leaf = mainLeaf || leaves[0];
			} else {
				leaf = leaves[0];
			}
		}

		// If no suitable existing leaf or if we need a new one
		if (!leaf) {
			// Create a new leaf based on placement preference
			if (useMainWorkspace) {
				// Open in main workspace as a new tab
				leaf = workspace.getLeaf('tab');
			} else {
				// Open in right sidebar
				leaf = workspace.getRightLeaf(false);
			}
			if (leaf) {
				// Pass rootPersonId in the initial state to avoid timing issues
				// The view's setState() will be called with this state before onOpen()
				await leaf.setViewState({
					type: VIEW_TYPE_FAMILY_CHART,
					active: true,
					state: rootPersonId ? { rootPersonId } : undefined
				});
				isNewLeaf = true;
			}
		}

		// Reveal the leaf in case it is in a collapsed sidebar
		if (leaf) {
			void workspace.revealLeaf(leaf);

			// If reusing an existing leaf, set the root person directly
			// (for new leaves, the state was already passed via setViewState)
			if (!isNewLeaf && rootPersonId && leaf.view instanceof FamilyChartView) {
				leaf.view.setRootPerson(rootPersonId);
			}
		}
	}

	/**
	 * Activate the Map view
	 * Opens an existing view or creates a new one
	 * @param mapId Optional map ID to switch to after opening
	 * @param forceNew If true, always create a new map view (for side-by-side comparison)
	 * @param splitDirection If provided, split the existing map view in this direction
	 */
	async activateMapView(
		mapId?: string,
		forceNew = false,
		splitDirection?: 'horizontal' | 'vertical',
		focusCoordinates?: { lat: number; lng: number; zoom?: number }
	): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_MAP);

		if (!forceNew && leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else if (forceNew && leaves.length > 0 && splitDirection) {
			// Split an existing map view
			const existingLeaf = leaves[0];
			leaf = workspace.createLeafBySplit(existingLeaf, splitDirection);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_MAP, active: true });
			}
		} else {
			// Open in main workspace as a new tab
			leaf = workspace.getLeaf('tab');
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_MAP, active: true });
			}
		}

		// Reveal the leaf
		if (leaf) {
			void workspace.revealLeaf(leaf);

			// Use a short delay to ensure the map controller is initialized
			setTimeout(() => {
				const mapView = leaf?.view as {
					mapController?: {
						setActiveMap: (id: string) => Promise<void>;
						setView: (center: { lat: number; lng: number }, zoom: number) => void;
					}
				};

				// If a specific map was requested, switch to it
				if (mapId && mapView?.mapController?.setActiveMap) {
					void mapView.mapController.setActiveMap(mapId);
				}

				// If coordinates were provided, center the map on them
				if (focusCoordinates && mapView?.mapController?.setView) {
					const zoom = focusCoordinates.zoom ?? 12; // Default zoom level for a place
					mapView.mapController.setView(
						{ lat: focusCoordinates.lat, lng: focusCoordinates.lng },
						zoom
					);
				}
			}, 100);
		}
	}

	/**
	 * Activate the Statistics Dashboard view
	 */
	async activateStatisticsView(): Promise<void> {
		const { workspace } = this.app;

		// Check if there's already a statistics view open
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_STATISTICS);
		if (leaves.length > 0) {
			// Reveal the existing view
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		// Create a new view
		const leaf = workspace.getLeaf('tab');
		await leaf.setViewState({
			type: VIEW_TYPE_STATISTICS,
			active: true
		});
		void workspace.revealLeaf(leaf);
	}

	/**
	 * Open or focus the Relationships dockable view in the right sidebar
	 */
	async activateRelationshipsView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_RELATIONSHIPS);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_RELATIONSHIPS,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Open or focus the People dockable view in the right sidebar
	 */
	async activatePeopleView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PEOPLE);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_PEOPLE,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Open or focus the Events dockable view in the right sidebar
	 */
	async activateEventsView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EVENTS);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_EVENTS,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Open or focus the Places dockable view in the right sidebar
	 */
	async activatePlacesView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PLACES);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_PLACES,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Open or focus the Organizations dockable view in the right sidebar
	 */
	async activateOrganizationsView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ORGANIZATIONS);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_ORGANIZATIONS,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	async activateSourcesView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_SOURCES);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_SOURCES,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	async activateUniversesView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_UNIVERSES);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_UNIVERSES,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	async activateCollectionsView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_COLLECTIONS);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_COLLECTIONS,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	async activateDataQualityView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_DATA_QUALITY);
		if (leaves.length > 0) {
			void workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_DATA_QUALITY,
				active: true
			});
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Open or reveal the entity profile view.
	 * Finds an existing unpinned profile leaf, or creates a new one in the right sidebar.
	 * If a file is provided, navigates the profile to that entity.
	 */
	async activateProfileView(file?: TFile): Promise<void> {
		const { workspace } = this.app;

		// Find an existing unpinned profile leaf
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ENTITY_PROFILE);
		const unpinnedLeaf = leaves.find(leaf => {
			const view = leaf.view;
			if (view instanceof ProfileView) {
				const state = view.getState();
				return !state.pinned;
			}
			return true;
		});

		if (unpinnedLeaf) {
			void workspace.revealLeaf(unpinnedLeaf);
			if (file && unpinnedLeaf.view instanceof ProfileView) {
				unpinnedLeaf.view.navigateToFile(file);
			}
			return;
		}

		// Create a new leaf in the right sidebar
		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_ENTITY_PROFILE,
				active: true
			});
			void workspace.revealLeaf(leaf);
			if (file && leaf.view instanceof ProfileView) {
				leaf.view.navigateToFile(file);
			}
		}
	}

	/**
	 * Move a Family Chart view from sidebar to main workspace
	 * Called from the view's toolbar
	 */
	async moveFamilyChartToMainWorkspace(currentLeaf: WorkspaceLeaf): Promise<void> {
		const { workspace } = this.app;

		// Get the current state before moving
		const currentView = currentLeaf.view;
		let rootPersonId: string | null = null;
		if (currentView instanceof FamilyChartView) {
			const state = currentView.getState();
			rootPersonId = state.rootPersonId;
		}

		// Close the current leaf
		currentLeaf.detach();

		// Open in main workspace
		const newLeaf = workspace.getLeaf('tab');
		await newLeaf.setViewState({ type: VIEW_TYPE_FAMILY_CHART, active: true });
		void workspace.revealLeaf(newLeaf);

		// Restore the root person
		if (rootPersonId && newLeaf.view instanceof FamilyChartView) {
			newLeaf.view.setRootPerson(rootPersonId);
		}
	}
}
