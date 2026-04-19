/**
 * Interactive Family Chart View
 *
 * An Obsidian ItemView that renders the family-chart library for interactive
 * exploration and editing of family trees.
 */

import { ItemView, WorkspaceLeaf, Menu, TFile, Notice, setIcon } from 'obsidian';
import f3, { TreeDatum } from 'family-chart';
import * as d3 from 'd3';

import type CanvasRootsPlugin from '../../../main';
import { FamilyGraphService, PersonNode } from '../../core/family-graph';
import type { ColorScheme, FamilyChartColors } from '../../settings';
import { getLogger } from '../../core/logging';
import { PersonPickerModal } from '../person-picker';
import { PlacePickerModal, type SelectedPlaceInfo } from '../place-picker';
import { AddRelationshipModal } from '../add-relationship-modal';
import { getAllRelationshipTypesWithCustomizations } from '../../relationships/constants/default-relationship-types';
import { RelationshipService } from '../../relationships/services/relationship-service';
import type { ParsedRelationship, RelationshipTypeDefinition } from '../../relationships/types/relationship-types';
import { FamilyChartExportWizard } from './family-chart-export-wizard';
import { DeletePersonConfirmModal, FamilyChartStyleModal, HighlightGroupsModal } from './family-chart-view-modals';
import {
	type HighlightGroup,
	HIGHLIGHT_COLORS,
	firstMatchingGroup
} from './highlight-groups';
import type { ProgressCallback } from './family-chart-export-progress-modal';
import {
	exportWithOptions as doExportWithOptions,
	getExportInfo as doGetExportInfo,
	type FamilyChartExportContext
} from './family-chart-export';

import { getSpouseLabel } from '../../utils/terminology';
import { pluralize } from '../../utils/format-utils';

const logger = getLogger('FamilyChartView');

export const VIEW_TYPE_FAMILY_CHART = 'canvas-roots-family-chart';

/**
 * family-chart person data format
 * Matches the Datum interface from family-chart
 */
interface FamilyChartPerson {
	id: string;
	data: {
		'first name': string;
		'last name': string;
		gender: 'M' | 'F' | 'X' | 'U' | '';
		birthday?: string;
		deathday?: string;
		avatar?: string;
		[key: string]: unknown;
	};
	rels: {
		parents: string[];
		spouses: string[];
		children: string[];
	};
	[key: string]: unknown;
}

/**
 * Card style options for Family Chart
 */
type CardStyle = 'rectangle' | 'circle' | 'compact' | 'mini';


/**
 * Name display mode options for Family Chart
 * - 'full': Display full name on single line (default)
 * - 'split': Display given name and surname on separate lines
 */
type NameDisplayMode = 'full' | 'split';

/**
 * View state that gets persisted
 */
interface FamilyChartViewState {
	rootPersonId: string | null;
	colorScheme: ColorScheme;
	editMode: boolean;
	nodeSpacing?: number;
	levelSpacing?: number;
	showBirthDates?: boolean;
	showDeathDates?: boolean;
	showKinshipLabels?: boolean;
	showCustomRelationships?: boolean;
	customRelationshipTypeVisibility?: Record<string, boolean>;
	highlightGroups?: HighlightGroup[];
	showAvatars?: boolean;
	isHorizontal?: boolean;
	// Tree depth limits
	ancestryDepth?: number | null;  // null = unlimited
	progenyDepth?: number | null;   // null = unlimited
	// Display options
	showSiblingsOfMain?: boolean;
	showSingleParentEmptyCard?: boolean;
	sortChildrenByBirthDate?: boolean;
	sortSpousesByMarriageDate?: boolean;
	// As-of date filter (#376) — ISO YYYY-MM-DD. null/undefined = show all.
	asOfDate?: string | null;
	hidePrivateLiving?: boolean;
	// Card style
	cardStyle?: CardStyle;
	// Name display mode (#90)
	nameDisplayMode?: NameDisplayMode;
	// Built-in descriptive field toggles (#374)
	showTitle?: boolean;
	showOccupation?: boolean;
	showNickname?: boolean;
	showReligion?: boolean;
	showCaste?: boolean;
	showPronouns?: boolean;
	[key: string]: unknown;  // Index signature for Record<string, unknown> compatibility
}

/**
 * Interactive Family Chart View
 */
export class FamilyChartView extends ItemView {
	plugin: CanvasRootsPlugin;

	// View state
	private rootPersonId: string | null = null;
	private colorScheme: ColorScheme = 'sex';
	private editMode: boolean = false;
	private nodeSpacing: number = 250; // X spacing between nodes
	private levelSpacing: number = 150; // Y spacing between generations
	private showBirthDates: boolean = true;
	private showDeathDates: boolean = false;
	private showKinshipLabels: boolean = false;
	// Custom relationships overlay (#386); master toggle + per-type visibility
	private showCustomRelationships: boolean = false;
	private customRelationshipTypeVisibility: Record<string, boolean> = {};
	// Highlight groups (#379); up to MAX_HIGHLIGHT_GROUPS active at once
	private highlightGroups: HighlightGroup[] = [];
	private showAvatars: boolean = true; // Show person avatar thumbnails on cards
	private isHorizontal: boolean = false; // Tree orientation: false = vertical (top-to-bottom), true = horizontal (left-to-right)
	// Tree depth limits (null = unlimited)
	private ancestryDepth: number | null = null;
	private progenyDepth: number | null = null;
	// Display options
	private showSiblingsOfMain: boolean = true;
	private showSingleParentEmptyCard: boolean = false;
	private sortChildrenByBirthDate: boolean = false;
	private sortSpousesByMarriageDate: boolean = false;
	private hidePrivateLiving: boolean = false;
	// As-of date filter (#376); null = show all
	private asOfDate: string | null = null;
	// Card style: rectangle (default SVG), circle (HTML circular), compact (text-only), mini (smaller)
	private cardStyle: CardStyle = 'rectangle';
	// Name display mode: full (single line) or split (given/surname on separate lines) (#90)
	private nameDisplayMode: NameDisplayMode = 'full';
	// Built-in descriptive field toggles on the in-tree card (#374)
	private showTitle: boolean = false;
	private showOccupation: boolean = false;
	private showNickname: boolean = false;
	private showReligion: boolean = false;
	private showCaste: boolean = false;
	private showPronouns: boolean = false;

	// family-chart instances
	private f3Chart: ReturnType<typeof f3.createChart> | null = null;
	private f3Card: ReturnType<ReturnType<typeof f3.createChart>['setCardSvg']>
		| ReturnType<ReturnType<typeof f3.createChart>['setCardHtml']>
		| null = null;
	private f3EditTree: ReturnType<ReturnType<typeof f3.createChart>['editTree']> | null = null;

	// UI elements
	private toolbarEl: HTMLElement | null = null;
	private chartContainerEl: HTMLElement | null = null;
	private zoomLevelEl: HTMLElement | null = null;
	private editModeBtn: HTMLElement | null = null;
	private historyBackBtn: HTMLElement | null = null;
	private historyForwardBtn: HTMLElement | null = null;

	// Info panel UI elements
	private infoPanelEl: HTMLElement | null = null;
	private infoPanelContentEl: HTMLElement | null = null;
	private infoPanelActionsEl: HTMLElement | null = null;
	private selectedPersonId: string | null = null;
	private infoPanelEditMode: boolean = false;
	private infoPanelEditData: { firstName: string; lastName: string; altName: string; pronouns: string; occupation: string; birthPlace: string; deathPlace: string; birthDate: string; deathDate: string; gender: 'M' | 'F' | 'X' | 'U' | ''; researchLevel: string; collection: string } | null = null;

	// Sync state (prevent infinite loops during sync)
	private isSyncing: boolean = false;

	// Refresh deferral - when chart isn't visible, defer refresh until visible again
	private pendingRefresh: boolean = false;
	// Saved zoom transform - preserve zoom/pan during visible refreshes
	private savedZoomTransform: { k: number; x: number; y: number } | null = null;

	// Services
	private familyGraphService: FamilyGraphService;

	// Data cache
	private chartData: FamilyChartPerson[] = [];
	// MutationObserver to sanitize invalid SVG transforms from family-chart library
	private transformObserver: MutationObserver | null = null;
	// Avatar URL cache - maps crId to resolved avatar URL
	// Persists across chart re-initializations to avoid repeated file lookups
	private avatarUrlCache: Map<string, string> = new Map();
	// Spouse relationship lookup for sort-by-marriage-date (#375) and
	// as-of date filtering (#376). Keyed by personId → spouseId → {dates}.
	// Populated in two directions: whichever side declared the relationship.
	private spouseRelationshipData: Map<string, Map<string, { marriageDate?: string; divorceDate?: string }>> = new Map();

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.familyGraphService = plugin.createFamilyGraphService();
	}

	getViewType(): string {
		return VIEW_TYPE_FAMILY_CHART;
	}

	getDisplayText(): string {
		return 'Family chart';
	}

	getIcon(): string {
		return 'git-fork';
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- Base class requires Promise<void> return type
	async onOpen(): Promise<void> {
		logger.debug('on-open', 'Opening view', { cardStyle: this.cardStyle, rootPersonId: this.rootPersonId });

		// Build UI structure
		this.buildUI();

		// Initialize chart if we have state
		if (this.rootPersonId) {
			void this.initializeChart();
		} else {
			// Check for a marked root person before showing empty state
			const familyGraph = this.plugin.createFamilyGraphService();
			const { rootPerson } = familyGraph.getMarkedRootPerson();
			if (rootPerson) {
				this.rootPersonId = rootPerson.crId;
				void this.initializeChart();
			} else {
				this.showEmptyState();
			}
		}

		// Register event handlers
		this.registerEventHandlers();
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- Base class requires Promise<void> return type
	async onClose(): Promise<void> {
		logger.debug('view-close', 'Closing FamilyChartView');
		this.destroyChart();
	}

	/**
	 * Build the UI structure: toolbar, chart container, and info panel
	 */
	private buildUI(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass('cr-family-chart-view');

		// Create toolbar
		this.toolbarEl = container.createDiv({ cls: 'cr-fcv-toolbar' });
		this.buildToolbar();

		// Create main content area with chart and info panel side by side
		const contentArea = container.createDiv({ cls: 'cr-fcv-content' });

		// Create chart container
		this.chartContainerEl = contentArea.createDiv({ cls: 'cr-fcv-chart-container f3' });

		// Create info panel (hidden by default)
		this.infoPanelEl = contentArea.createDiv({ cls: 'cr-fcv-info-panel crc-hidden' });
		this.buildInfoPanel();
	}

	/**
	 * Build the toolbar controls
	 */
	private buildToolbar(): void {
		if (!this.toolbarEl) return;

		const toolbar = this.toolbarEl;
		toolbar.empty();

		// Left side controls
		const leftControls = toolbar.createDiv({ cls: 'cr-fcv-toolbar-left' });

		// Zoom controls group
		const zoomGroup = leftControls.createDiv({ cls: 'cr-fcv-control-group cr-fcv-zoom-group' });

		// Zoom out button
		const zoomOutBtn = zoomGroup.createEl('button', {
			cls: 'cr-fcv-btn cr-fcv-zoom-btn clickable-icon',
			attr: { 'aria-label': 'Zoom out' }
		});
		setIcon(zoomOutBtn, 'zoom-out');
		zoomOutBtn.addEventListener('click', () => this.zoomOut());

		// Zoom level indicator
		this.zoomLevelEl = zoomGroup.createSpan({ cls: 'cr-fcv-zoom-level', text: '100%' });

		// Zoom in button
		const zoomInBtn = zoomGroup.createEl('button', {
			cls: 'cr-fcv-btn cr-fcv-zoom-btn clickable-icon',
			attr: { 'aria-label': 'Zoom in' }
		});
		setIcon(zoomInBtn, 'zoom-in');
		zoomInBtn.addEventListener('click', () => this.zoomIn());

		// Right side controls
		const rightControls = toolbar.createDiv({ cls: 'cr-fcv-toolbar-right' });

		// Search button
		const searchBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Search for person' }
		});
		setIcon(searchBtn, 'search');
		searchBtn.addEventListener('click', () => { void this.openPersonSearch(); });

		// Note: Edit mode toggle and undo/redo buttons removed - editing is now done via the info panel

		// Fit to view button
		const fitBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Fit to view' }
		});
		setIcon(fitBtn, 'maximize-2');
		fitBtn.addEventListener('click', () => this.fitToView());

		// Pop out to main workspace button (only show if in sidebar)
		if (this.isInSidebar()) {
			const popOutBtn = rightControls.createEl('button', {
				cls: 'cr-fcv-btn clickable-icon',
				attr: { 'aria-label': 'Open in main workspace' }
			});
			setIcon(popOutBtn, 'external-link');
			popOutBtn.addEventListener('click', () => this.popOutToMainWorkspace());
		}

		// Layout settings button (orientation, spacing)
		const layoutBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Layout settings' }
		});
		setIcon(layoutBtn, 'sliders');
		layoutBtn.addEventListener('click', (e) => this.showLayoutMenu(e));

		// Display settings button (card display, visibility options)
		const displayBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Display settings' }
		});
		setIcon(displayBtn, 'eye');
		displayBtn.addEventListener('click', (e) => this.showDisplayMenu(e));

		// Card style button (rectangle, circle, compact, mini)
		const cardStyleBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Card style' }
		});
		setIcon(cardStyleBtn, 'layout-template');
		cardStyleBtn.addEventListener('click', (e) => this.showCardStyleMenu(e));

		// Style settings button (colors, themes)
		const styleBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Chart colors' }
		});
		setIcon(styleBtn, 'palette');
		styleBtn.addEventListener('click', (e) => this.showStyleMenu(e));

		// Depth settings button (ancestry/progeny limits)
		const depthBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Tree depth' }
		});
		setIcon(depthBtn, 'git-branch');
		depthBtn.addEventListener('click', (e) => this.showDepthMenu(e));

		// As-of date filter (#376) — "Time" group with date picker and clear button
		const timeGroup = rightControls.createDiv({ cls: 'cr-fcv-control-group cr-fcv-time-group' });
		const asOfInput = timeGroup.createEl('input', {
			cls: 'cr-fcv-as-of-date',
			attr: {
				type: 'date',
				'aria-label': 'As-of date (show family as it existed on this date)',
			},
		});
		if (this.asOfDate) asOfInput.value = this.asOfDate;
		asOfInput.addEventListener('change', () => {
			this.setAsOfDate(asOfInput.value || null);
		});
		const asOfClearBtn = timeGroup.createEl('button', {
			cls: 'cr-fcv-btn cr-fcv-as-of-clear clickable-icon',
			attr: { 'aria-label': 'Clear as-of date' },
		});
		setIcon(asOfClearBtn, 'x');
		asOfClearBtn.addEventListener('click', () => {
			asOfInput.value = '';
			this.setAsOfDate(null);
		});

		// Export button
		const exportBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Export chart' }
		});
		setIcon(exportBtn, 'download');
		exportBtn.addEventListener('click', () => this.openExportWizard());

		// Refresh button
		const refreshBtn = rightControls.createEl('button', {
			cls: 'cr-fcv-btn clickable-icon',
			attr: { 'aria-label': 'Refresh chart' }
		});
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.addEventListener('click', () => { void this.refreshChart(); });
	}

	/**
	 * Build the info panel structure
	 */
	private buildInfoPanel(): void {
		if (!this.infoPanelEl) return;

		this.infoPanelEl.empty();

		// Header
		const header = this.infoPanelEl.createDiv({ cls: 'cr-fcv-info-panel-header' });
		const headerTitle = header.createEl('h3', { text: 'Person details', cls: 'cr-fcv-info-panel-title' });
		headerTitle.setAttribute('data-view-title', 'Person details');
		headerTitle.setAttribute('data-edit-title', 'Edit person');

		const closeBtn = header.createEl('button', { cls: 'cr-fcv-info-panel-close', attr: { 'aria-label': 'Close panel' } });
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => this.closeInfoPanel());

		// Content area (populated dynamically)
		this.infoPanelContentEl = this.infoPanelEl.createDiv({ cls: 'cr-fcv-info-panel-content' });

		// Actions area (Edit button or Save/Cancel)
		this.infoPanelActionsEl = this.infoPanelEl.createDiv({ cls: 'cr-fcv-info-panel-actions' });
	}

	/**
	 * Open the info panel for a specific person
	 */
	private openInfoPanel(personId: string): void {
		if (!this.infoPanelEl) return;

		this.selectedPersonId = personId;
		this.infoPanelEditMode = false;
		this.infoPanelEditData = null;

		// Show the panel
		this.infoPanelEl.removeClass('crc-hidden');

		// Render content
		this.renderInfoPanelContent();
	}

	/**
	 * Close the info panel
	 */
	private closeInfoPanel(): void {
		if (!this.infoPanelEl) return;

		// If in edit mode with changes, ask for confirmation
		if (this.infoPanelEditMode && this.infoPanelEditData) {
			// For now, just discard - could add a confirmation dialog later
		}

		this.selectedPersonId = null;
		this.infoPanelEditMode = false;
		this.infoPanelEditData = null;
		this.infoPanelEl.addClass('crc-hidden');
	}

	/**
	 * Render the info panel content based on current mode (view/edit)
	 */
	private renderInfoPanelContent(): void {
		if (!this.infoPanelContentEl || !this.infoPanelActionsEl || !this.selectedPersonId) return;

		// Find the person data
		const personData = this.chartData.find(p => p.id === this.selectedPersonId);
		if (!personData) {
			this.infoPanelContentEl.empty();
			this.infoPanelContentEl.createEl('p', { text: 'Person not found', cls: 'cr-fcv-info-panel-error' });
			return;
		}

		// Update header title
		const headerTitle = this.infoPanelEl?.querySelector('.cr-fcv-info-panel-header h3');
		if (headerTitle) {
			headerTitle.textContent = this.infoPanelEditMode ? 'Edit person' : 'Person details';
		}

		this.infoPanelContentEl.empty();
		this.infoPanelActionsEl.empty();

		if (this.infoPanelEditMode) {
			this.renderInfoPanelEditMode(personData);
		} else {
			this.renderInfoPanelViewMode(personData);
		}
	}

	/**
	 * Render info panel in view (read-only) mode
	 */
	private renderInfoPanelViewMode(personData: FamilyChartPerson): void {
		if (!this.infoPanelContentEl || !this.infoPanelActionsEl) return;

		// Fields section
		const fieldsSection = this.infoPanelContentEl.createDiv({ cls: 'cr-fcv-info-panel-fields' });

		// First name
		this.createInfoField(fieldsSection, 'First name', personData.data['first name'] || '');

		// Last name
		this.createInfoField(fieldsSection, 'Last name', personData.data['last name'] || '');

		// Alt name (#346)
		if (personData.data['alt name']) {
			this.createInfoField(fieldsSection, 'Alt name', personData.data['alt name'] as string);
		}

		// Pronouns (#351)
		if (personData.data['pronouns']) {
			this.createInfoField(fieldsSection, 'Pronouns', personData.data['pronouns'] as string);
		}

		// Occupation (#351)
		if (personData.data['occupation']) {
			this.createInfoField(fieldsSection, 'Occupation', personData.data['occupation'] as string);
		}

		// Birth date
		this.createInfoField(fieldsSection, 'Birth date', personData.data.birthday || '');

		// Death date
		this.createInfoField(fieldsSection, 'Death date', personData.data.deathday || '');

		// Birth place (#351)
		if (personData.data['birth place']) {
			const placeDisplay = (personData.data['birth place'] as string).replace(/^\[\[|\]\]$/g, '').split('|').pop() || '';
			this.createInfoField(fieldsSection, 'Birth place', placeDisplay);
		}

		// Death place (#351)
		if (personData.data['death place']) {
			const placeDisplay = (personData.data['death place'] as string).replace(/^\[\[|\]\]$/g, '').split('|').pop() || '';
			this.createInfoField(fieldsSection, 'Death place', placeDisplay);
		}

		// Sex
		const sexDisplay = personData.data.gender === 'M' ? 'Male' : personData.data.gender === 'F' ? 'Female' : personData.data.gender === 'X' ? 'Non-binary' : personData.data.gender === 'U' ? 'Unknown' : '';
		this.createInfoField(fieldsSection, 'Sex', sexDisplay);

		// Research level (#351)
		const researchLevelRaw = personData.data['research level'];
		const researchLevel: string | number = typeof researchLevelRaw === 'number' || typeof researchLevelRaw === 'string' ? researchLevelRaw : '';
		if (researchLevel !== '') {
			const levelNames = ['Unresearched', 'Initial', 'Moderate', 'Thorough', 'Comprehensive', 'Exhaustive', 'Published'];
			const levelNum = typeof researchLevel === 'number' ? researchLevel : parseInt(researchLevel);
			const levelDisplay = !isNaN(levelNum) && levelNum >= 0 && levelNum <= 6 ? `${levelNum} — ${levelNames[levelNum]}` : String(researchLevel);
			this.createInfoField(fieldsSection, 'Research level', levelDisplay);
		}

		// Collection (#351)
		if (personData.data['collection']) {
			this.createInfoField(fieldsSection, 'Collection', personData.data['collection'] as string);
		}

		// Relationships section
		this.renderRelationshipsSection(personData);

		// Actions - View mode (settings-style: description left, buttons right)
		this.infoPanelActionsEl.addClass('view-mode');
		this.infoPanelActionsEl.removeClass('edit-mode');

		// Description (left side)
		this.infoPanelActionsEl.createDiv({
			cls: 'cr-fcv-info-panel-actions-description',
			text: 'View or edit this person'
		});

		// Buttons container (right side)
		const buttonsContainer = this.infoPanelActionsEl.createDiv({
			cls: 'cr-fcv-info-panel-actions-buttons'
		});

		// Open note button
		const openNoteBtn = buttonsContainer.createEl('button', {
			text: 'Open'
		});
		openNoteBtn.addEventListener('click', () => {
			if (this.selectedPersonId) {
				void this.openPersonNote(this.selectedPersonId);
			}
		});

		// Edit button (primary action)
		const editBtn = buttonsContainer.createEl('button', {
			text: 'Edit',
			cls: 'mod-cta'
		});
		editBtn.addEventListener('click', () => this.enterInfoPanelEditMode(personData));
	}

	/**
	 * Render info panel in edit mode
	 */
	private renderInfoPanelEditMode(personData: FamilyChartPerson): void {
		if (!this.infoPanelContentEl || !this.infoPanelActionsEl) return;

		// Initialize edit data if not already set
		if (!this.infoPanelEditData) {
			this.infoPanelEditData = {
				firstName: personData.data['first name'] || '',
				lastName: personData.data['last name'] || '',
				altName: (personData.data['alt name'] as string) || '',
				pronouns: (personData.data['pronouns'] as string) || '',
				occupation: (personData.data['occupation'] as string) || '',
				birthPlace: (personData.data['birth place'] as string) || '',
				deathPlace: (personData.data['death place'] as string) || '',
				birthDate: personData.data.birthday || '',
				deathDate: personData.data.deathday || '',
				gender: (personData.data.gender) || '',
				researchLevel: String((personData.data['research level'] as string | number | undefined) ?? ''),
				collection: (personData.data['collection'] as string) || ''
			};
		}

		// Fields section
		const fieldsSection = this.infoPanelContentEl.createDiv({ cls: 'cr-fcv-info-panel-fields' });

		// First name input
		this.createInfoFieldInput(fieldsSection, 'First name', this.infoPanelEditData.firstName, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.firstName = value;
		});

		// Last name input
		this.createInfoFieldInput(fieldsSection, 'Last name', this.infoPanelEditData.lastName, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.lastName = value;
		});

		// Alt name input (#351)
		this.createInfoFieldInput(fieldsSection, 'Alt name', this.infoPanelEditData.altName, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.altName = value;
		}, 'e.g., 张三');

		// Pronouns input (#351)
		this.createInfoFieldInput(fieldsSection, 'Pronouns', this.infoPanelEditData.pronouns, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.pronouns = value;
		}, 'e.g., she/her');

		// Occupation input (#351)
		this.createInfoFieldInput(fieldsSection, 'Occupation', this.infoPanelEditData.occupation, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.occupation = value;
		}, 'e.g., Farmer');

		// Birth place picker (#351)
		this.createPlacePickerField(fieldsSection, 'Birth place', this.infoPanelEditData.birthPlace, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.birthPlace = value;
		});

		// Death place picker (#351)
		this.createPlacePickerField(fieldsSection, 'Death place', this.infoPanelEditData.deathPlace, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.deathPlace = value;
		});

		// Birth date input
		this.createInfoFieldInput(fieldsSection, 'Birth date', this.infoPanelEditData.birthDate, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.birthDate = value;
		}, 'Not recorded');

		// Death date input
		this.createInfoFieldInput(fieldsSection, 'Death date', this.infoPanelEditData.deathDate, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.deathDate = value;
		}, 'Not recorded');

		// Sex dropdown
		const sexField = fieldsSection.createDiv({ cls: 'cr-fcv-info-field' });
		sexField.createDiv({ cls: 'cr-fcv-info-field-label', text: 'Sex' });
		const sexSelect = sexField.createEl('select', { cls: 'cr-fcv-info-field-select dropdown' });
		const options = [
			{ value: 'U', label: 'Unknown' },
			{ value: 'M', label: 'Male' },
			{ value: 'F', label: 'Female' },
			{ value: 'X', label: 'Non-binary' }
		];
		for (const opt of options) {
			const optionEl = sexSelect.createEl('option', { value: opt.value, text: opt.label });
			if (this.infoPanelEditData.gender === opt.value) {
				optionEl.selected = true;
			}
		}
		sexSelect.addEventListener('change', () => {
			if (this.infoPanelEditData) {
				this.infoPanelEditData.gender = sexSelect.value as 'M' | 'F' | 'X' | 'U' | '';
			}
		});

		// Research level dropdown (#351)
		const rlField = fieldsSection.createDiv({ cls: 'cr-fcv-info-field' });
		rlField.createDiv({ cls: 'cr-fcv-info-field-label', text: 'Research level' });
		const rlSelect = rlField.createEl('select', { cls: 'cr-fcv-info-field-select dropdown' });
		const rlOptions = [
			{ value: '', label: 'Not set' },
			{ value: '0', label: '0 — Unresearched' },
			{ value: '1', label: '1 — Initial' },
			{ value: '2', label: '2 — Moderate' },
			{ value: '3', label: '3 — Thorough' },
			{ value: '4', label: '4 — Comprehensive' },
			{ value: '5', label: '5 — Exhaustive' },
			{ value: '6', label: '6 — Published' }
		];
		for (const opt of rlOptions) {
			const optionEl = rlSelect.createEl('option', { value: opt.value, text: opt.label });
			if (this.infoPanelEditData.researchLevel === opt.value) {
				optionEl.selected = true;
			}
		}
		rlSelect.addEventListener('change', () => {
			if (this.infoPanelEditData) {
				this.infoPanelEditData.researchLevel = rlSelect.value;
			}
		});

		// Collection input (#351)
		this.createInfoFieldInput(fieldsSection, 'Collection', this.infoPanelEditData.collection, (value) => {
			if (this.infoPanelEditData) this.infoPanelEditData.collection = value;
		}, 'e.g., Smith Family');

		// Link source button (#351)
		const sourceField = fieldsSection.createDiv({ cls: 'cr-fcv-info-field' });
		sourceField.createDiv({ cls: 'cr-fcv-info-field-label', text: 'Sources' });
		const linkSourceBtn = sourceField.createEl('button', {
			text: '+ Link source',
			cls: 'cr-fcv-info-field-picker-btn'
		});
		linkSourceBtn.addEventListener('click', () => {
			this.linkSourceFromPanel();
		});

		// Relationships section
		this.renderRelationshipsSection(personData);

		// Actions - Edit mode (buttons right-aligned)
		this.infoPanelActionsEl.removeClass('view-mode');
		this.infoPanelActionsEl.addClass('edit-mode');

		// Buttons container
		const buttonsContainer = this.infoPanelActionsEl.createDiv({
			cls: 'cr-fcv-info-panel-actions-buttons'
		});

		// Cancel button (secondary)
		const cancelBtn = buttonsContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => this.cancelInfoPanelEdit());

		// Save button (primary)
		const saveBtn = buttonsContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => void this.saveInfoPanelChanges());
	}

	/**
	 * Create a read-only info field
	 */
	private createInfoField(container: HTMLElement, label: string, value: string): void {
		const field = container.createDiv({ cls: 'cr-fcv-info-field' });
		field.createDiv({ cls: 'cr-fcv-info-field-label', text: label });
		const valueEl = field.createDiv({ cls: 'cr-fcv-info-field-value' });
		if (value) {
			valueEl.textContent = value;
		} else {
			valueEl.textContent = 'Not recorded';
			valueEl.addClass('empty');
		}
	}

	/**
	 * Create an editable info field input
	 */
	private createInfoFieldInput(container: HTMLElement, label: string, value: string, onChange: (value: string) => void, placeholder?: string): void {
		const field = container.createDiv({ cls: 'cr-fcv-info-field' });
		field.createDiv({ cls: 'cr-fcv-info-field-label', text: label });
		const input = field.createEl('input', {
			type: 'text',
			value: value,
			placeholder: placeholder || '',
			cls: 'cr-fcv-info-field-input'
		});
		input.addEventListener('input', () => onChange(input.value));
	}

	/**
	 * Create a place picker field with display text and Pick/Clear buttons
	 */
	private createPlacePickerField(container: HTMLElement, label: string, value: string, onChange: (value: string) => void): void {
		const field = container.createDiv({ cls: 'cr-fcv-info-field' });
		field.createDiv({ cls: 'cr-fcv-info-field-label', text: label });

		const row = field.createDiv({ cls: 'cr-fcv-info-field-picker' });

		const displayName = value ? value.replace(/^\[\[|\]\]$/g, '').split('|').pop() || '' : '';
		const displayEl = row.createSpan({
			cls: 'cr-fcv-info-field-picker-value',
			text: displayName || 'Not set'
		});
		if (!displayName) displayEl.addClass('empty');

		const pickBtn = row.createEl('button', {
			text: 'Pick',
			cls: 'cr-fcv-info-field-picker-btn'
		});
		pickBtn.addEventListener('click', () => {
			const placeGraph = this.plugin.createPlaceGraphService();
			placeGraph.reloadCache();
			new PlacePickerModal(this.app, (place: SelectedPlaceInfo) => {
				const wikilink = `[[${place.name}]]`;
				onChange(wikilink);
				displayEl.textContent = place.name;
				displayEl.removeClass('empty');
			}, {
				placeGraph,
				settings: this.plugin.settings
			}).open();
		});

		if (value) {
			const clearBtn = row.createEl('button', {
				text: '×',
				cls: 'cr-fcv-info-field-picker-clear',
				attr: { 'aria-label': 'Clear' }
			});
			clearBtn.addEventListener('click', () => {
				onChange('');
				displayEl.textContent = 'Not set';
				displayEl.addClass('empty');
				clearBtn.remove();
			});
		}
	}

	/**
	 * Render the relationships section
	 */
	private renderRelationshipsSection(personData: FamilyChartPerson): void {
		if (!this.infoPanelContentEl) return;

		const relSection = this.infoPanelContentEl.createDiv({ cls: 'cr-fcv-info-panel-relationships' });

		const headerRow = relSection.createDiv({ cls: 'cr-fcv-relationship-header' });
		headerRow.createEl('h4', { text: 'Relationships' });

		// Add relationship button in edit mode (#351)
		if (this.infoPanelEditMode && this.selectedPersonId) {
			const addBtn = headerRow.createEl('button', {
				text: '+ Add',
				cls: 'cr-fcv-relationship-add-btn'
			});
			addBtn.addEventListener('click', () => {
				this.openAddRelationshipFromPanel();
			});
		}

		// Parents
		if (personData.rels.parents.length > 0) {
			this.renderRelationshipGroup(relSection, 'Parents', personData.rels.parents);
		}

		// Spouses
		if (personData.rels.spouses.length > 0) {
			this.renderRelationshipGroup(relSection, getSpouseLabel(this.plugin.settings, { plural: true }), personData.rels.spouses);
		}

		// Children
		if (personData.rels.children.length > 0) {
			this.renderRelationshipGroup(relSection, 'Children', personData.rels.children);
		}

		// If no relationships
		if (personData.rels.parents.length === 0 && personData.rels.spouses.length === 0 && personData.rels.children.length === 0) {
			relSection.createEl('p', { text: 'No relationships recorded', cls: 'cr-fcv-info-panel-no-rels' });
		}
	}

	/**
	 * Link a source to the selected person (#351)
	 */
	private linkSourceFromPanel(): void {
		if (!this.selectedPersonId) return;

		const files = this.app.vault.getMarkdownFiles();
		let targetFile: TFile | null = null;
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.cr_id === this.selectedPersonId) {
				targetFile = file;
				break;
			}
		}

		if (!targetFile) {
			new Notice('Could not find person note');
			return;
		}

		const { addSourceToPersonNote } = require('../../plugin/context-menu-helpers');
		addSourceToPersonNote(this.plugin, targetFile);
	}

	/**
	 * Open the Add Relationship modal for the selected person (#351)
	 */
	private openAddRelationshipFromPanel(): void {
		if (!this.selectedPersonId) return;

		// Find the file for this person
		const files = this.app.vault.getMarkdownFiles();
		let targetFile: TFile | null = null;
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.cr_id === this.selectedPersonId) {
				targetFile = file;
				break;
			}
		}

		if (!targetFile) {
			new Notice('Could not find person note');
			return;
		}

		const modal = new AddRelationshipModal(this.app, this.plugin, targetFile);
		modal.onClose = () => {
			// Refresh chart after relationship is added
			void this.refreshChart(true).then(() => {
				this.renderInfoPanelContent();
			});
		};
		modal.open();
	}

	/**
	 * Render a group of relationships (parents, spouses, or children)
	 */
	private renderRelationshipGroup(container: HTMLElement, label: string, personIds: string[]): void {
		const group = container.createDiv({ cls: 'cr-fcv-relationship-group' });
		group.createDiv({ cls: 'cr-fcv-relationship-group-label', text: label });

		for (const personId of personIds) {
			const relPerson = this.chartData.find(p => p.id === personId);
			const name = relPerson
				? `${relPerson.data['first name'] || ''} ${relPerson.data['last name'] || ''}`.trim() || 'Unknown'
				: 'Unknown';

			const link = group.createEl('a', {
				cls: 'cr-fcv-relationship-link',
				href: '#',
				text: name
			});
			link.addEventListener('click', (e) => {
				e.preventDefault();
				this.navigateToPersonInChart(personId);
			});
		}
	}

	/**
	 * Navigate to a person in the chart and open their info panel
	 */
	private navigateToPersonInChart(personId: string): void {
		// Update chart to center on the person
		// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
		if (this.f3Chart) {
			this.f3Chart.updateMainId(personId);
			this.f3Chart.updateTree({});
		}

		// Open their info panel
		this.openInfoPanel(personId);
	}

	/**
	 * Enter edit mode in the info panel
	 */
	private enterInfoPanelEditMode(personData: FamilyChartPerson): void {
		this.infoPanelEditMode = true;
		this.infoPanelEditData = {
			firstName: personData.data['first name'] || '',
			lastName: personData.data['last name'] || '',
			altName: (personData.data['alt name'] as string) || '',
			pronouns: (personData.data['pronouns'] as string) || '',
			occupation: (personData.data['occupation'] as string) || '',
			birthPlace: (personData.data['birth place'] as string) || '',
			deathPlace: (personData.data['death place'] as string) || '',
			birthDate: personData.data.birthday || '',
			deathDate: personData.data.deathday || '',
			gender: (personData.data.gender) || '',
			researchLevel: String((personData.data['research level'] as string | number | undefined) ?? ''),
			collection: (personData.data['collection'] as string) || ''
		};
		this.renderInfoPanelContent();
	}

	/**
	 * Cancel edit mode and revert to view mode
	 */
	private cancelInfoPanelEdit(): void {
		this.infoPanelEditMode = false;
		this.infoPanelEditData = null;
		this.renderInfoPanelContent();
	}

	/**
	 * Save changes from the info panel edit mode
	 */
	private async saveInfoPanelChanges(): Promise<void> {
		if (!this.selectedPersonId || !this.infoPanelEditData) return;

		logger.info('info-panel-save', 'Saving info panel changes', {
			personId: this.selectedPersonId,
			data: this.infoPanelEditData
		});

		// Build datum object for syncDatumToMarkdown
		const datum = {
			id: this.selectedPersonId,
			data: {
				'first name': this.infoPanelEditData.firstName,
				'last name': this.infoPanelEditData.lastName,
				'alt name': this.infoPanelEditData.altName,
				'pronouns': this.infoPanelEditData.pronouns,
				'occupation': this.infoPanelEditData.occupation,
				'birth place': this.infoPanelEditData.birthPlace,
				'death place': this.infoPanelEditData.deathPlace,
				'birthday': this.infoPanelEditData.birthDate,
				'deathday': this.infoPanelEditData.deathDate,
				'gender': this.infoPanelEditData.gender,
				'research level': this.infoPanelEditData.researchLevel,
				'collection': this.infoPanelEditData.collection
			}
		};

		// Sync to markdown
		await this.syncDatumToMarkdown(datum);

		// Update local chart data
		const personIndex = this.chartData.findIndex(p => p.id === this.selectedPersonId);
		if (personIndex >= 0) {
			this.chartData[personIndex].data['first name'] = this.infoPanelEditData.firstName;
			this.chartData[personIndex].data['last name'] = this.infoPanelEditData.lastName;
			this.chartData[personIndex].data['alt name'] = this.infoPanelEditData.altName;
			this.chartData[personIndex].data['pronouns'] = this.infoPanelEditData.pronouns;
			this.chartData[personIndex].data['occupation'] = this.infoPanelEditData.occupation;
			this.chartData[personIndex].data['birth place'] = this.infoPanelEditData.birthPlace;
			this.chartData[personIndex].data['death place'] = this.infoPanelEditData.deathPlace;
			this.chartData[personIndex].data['research level'] = this.infoPanelEditData.researchLevel ? parseInt(this.infoPanelEditData.researchLevel) : '';
			this.chartData[personIndex].data['collection'] = this.infoPanelEditData.collection;
			this.chartData[personIndex].data.birthday = this.infoPanelEditData.birthDate;
			this.chartData[personIndex].data.deathday = this.infoPanelEditData.deathDate;
			if (this.infoPanelEditData.gender === 'M' || this.infoPanelEditData.gender === 'F' || this.infoPanelEditData.gender === 'X' || this.infoPanelEditData.gender === 'U') {
				this.chartData[personIndex].data.gender = this.infoPanelEditData.gender;
			}
		}

		// Exit edit mode
		this.infoPanelEditMode = false;
		this.infoPanelEditData = null;

		// Refresh the chart to show updated data
		await this.refreshChart();

		// Re-render the panel in view mode
		this.renderInfoPanelContent();

		new Notice('Changes saved');
	}

	/**
	 * Show empty state when no root person is selected
	 */
	private showEmptyState(): void {
		if (!this.chartContainerEl) return;

		this.chartContainerEl.empty();
		const emptyState = this.chartContainerEl.createDiv({ cls: 'cr-fcv-empty-state' });

		emptyState.createEl('h3', { text: 'No person selected' });

		const instructions = emptyState.createDiv({ cls: 'cr-fcv-empty-state__instructions' });
		instructions.createEl('p', { text: 'To view a family chart:' });

		const list = instructions.createEl('ul');
		list.createEl('li', { text: 'Choose a person from the list below, or' });
		list.createEl('li', { text: 'Open a person note (with cr_id property) and run "Open family chart"' });

		const selectBtn = emptyState.createEl('button', {
			text: 'Choose from list',
			cls: 'mod-cta'
		});
		selectBtn.addEventListener('click', () => { void this.promptSelectPerson(); });

		// Add hint about cr_id requirement
		const hint = emptyState.createDiv({ cls: 'cr-fcv-empty-state__hint' });
		hint.createEl('small', {
			text: 'Tip: Person notes need a cr_id property to appear in the chart.',
			cls: 'mod-muted'
		});
	}

	/**
	 * Open person picker to select root person
	 */
	private promptSelectPerson(): void {
		const folderFilter = this.plugin.getFolderFilter() ?? undefined;

		new PersonPickerModal(this.app, (selectedPerson) => {
			this.rootPersonId = selectedPerson.crId;
			void this.initializeChart();
		}, folderFilter).open();
	}

	/**
	 * Initialize the family-chart instance
	 */
	private async initializeChart(): Promise<void> {
		if (!this.chartContainerEl) return;

		logger.debug('chart-init', 'Initializing chart', { rootPersonId: this.rootPersonId, cardStyle: this.cardStyle });

		// Close info panel when switching to a new chart
		this.closeInfoPanel();

		// Clear container
		this.chartContainerEl.empty();

		// Load family data (async for crop resolution)
		await this.loadChartData();

		if (this.chartData.length === 0) {
			this.showEmptyState();
			return;
		}

		// Validate that the requested root person exists in the filtered data
		if (this.rootPersonId) {
			const rootExists = this.chartData.some(p => p.id === this.rootPersonId);
			if (!rootExists) {
				// Root person was filtered out (e.g., not in configured folders)
				logger.warn('chart-init', 'Requested root person not found in filtered data', {
					rootPersonId: this.rootPersonId,
					chartDataCount: this.chartData.length
				});
				new Notice(
					'The requested person is not included in the current folder filter. ' +
					'Check your Charted Roots folder settings.',
					8000
				);
				// Clear the invalid root so the chart shows the default view
				this.rootPersonId = null;
			}
		}

		// Apply theme-appropriate styling
		const isDarkMode = document.body.classList.contains('theme-dark');
		const customColors = this.plugin.settings.familyChartColors;

		// Set CSS variables - family-chart relies on these for card colors
		// Use custom colors if set, otherwise use defaults
		this.chartContainerEl.setCssProps({
			'--female-color': customColors?.femaleColor ?? 'rgb(196, 138, 146)',
			'--male-color': customColors?.maleColor ?? 'rgb(120, 159, 172)',
			'--genderless-color': customColors?.unknownColor ?? 'rgb(140, 140, 140)',
			'--background-color': isDarkMode
				? (customColors?.backgroundDark ?? 'rgb(33, 33, 33)')
				: (customColors?.backgroundLight ?? 'rgb(250, 250, 250)'),
			'--text-color': isDarkMode
				? (customColors?.textDark ?? '#fff')
				: (customColors?.textLight ?? '#333')
		});
		// Set direct styles on container (hidden until chart is positioned)
		this.chartContainerEl.setCssStyles({
			backgroundColor: isDarkMode
				? (customColors?.backgroundDark ?? 'rgb(33, 33, 33)')
				: (customColors?.backgroundLight ?? 'rgb(250, 250, 250)'),
			color: isDarkMode
				? (customColors?.textDark ?? '#fff')
				: (customColors?.textLight ?? '#333'),
			visibility: 'hidden'
		});

		// Show loading overlay during initial positioning (positioned absolutely over the container)
		const loadingOverlay = this.chartContainerEl.createDiv({ cls: 'cr-family-chart-loading' });
		loadingOverlay.createSpan({ cls: 'cr-family-chart-loading__spinner' });
		loadingOverlay.createSpan({ cls: 'cr-family-chart-loading__text', text: 'Loading chart...' });

		try {
			// Create the chart with normal transition time
			logger.debug('init-chart', 'Creating chart with spacing', { nodeSpacing: this.nodeSpacing, levelSpacing: this.levelSpacing });
			this.f3Chart = f3.createChart(this.chartContainerEl, this.chartData)
				.setTransitionTime(800)
				.setCardXSpacing(this.nodeSpacing)
				.setCardYSpacing(this.levelSpacing)
				// Clear overlays before any tree update to prevent stale rendering (#195, #386)
				// This handles all update sources: mini-tree buttons, navigation, spacing changes, etc.
				.setBeforeUpdate(() => {
					this.clearKinshipLabelsForUpdate();
					this.clearRelationshipOverlayForUpdate();
				})
				// Re-render overlays after tree animation completes (#195, #386, #379)
				.setAfterUpdate(() => {
					this.scheduleKinshipLabelRerender();
					this.scheduleRelationshipOverlayRerender();
					this.scheduleHighlightRerender();
				});

			// Apply tree orientation
			if (this.isHorizontal) {
				this.f3Chart.setOrientationHorizontal();
			}

			// Apply tree depth limits
			if (this.ancestryDepth !== null) {
				this.f3Chart.setAncestryDepth(this.ancestryDepth);
			}
			if (this.progenyDepth !== null) {
				this.f3Chart.setProgenyDepth(this.progenyDepth);
			}

			// Apply display options
			this.f3Chart.setShowSiblingsOfMain(this.showSiblingsOfMain);
			this.f3Chart.setSingleParentEmptyCard(this.showSingleParentEmptyCard, { label: 'Unknown' });

			// Apply sort children by birth date
			if (this.sortChildrenByBirthDate) {
				this.f3Chart.setSortChildrenFunction((a, b) => {
					const aBirthday = a.data?.birthday || '';
					const bBirthday = b.data?.birthday || '';
					// Sort by birthday string (works for ISO dates)
					if (!aBirthday && !bBirthday) return 0;
					if (!aBirthday) return 1; // No date goes last
					if (!bBirthday) return -1;
					return aBirthday.localeCompare(bBirthday);
				});
			}

			// Apply sort spouses by marriage date (#375)
			if (this.sortSpousesByMarriageDate) {
				this.f3Chart.setSortSpousesFunction((d) => {
					const relMap = this.spouseRelationshipData.get(d.id);
					if (!relMap || !d.rels.spouses) return;
					d.rels.spouses.sort((a, b) => {
						const dateA = relMap.get(a)?.marriageDate;
						const dateB = relMap.get(b)?.marriageDate;
						// Spouses without a marriage date fall to the end;
						// among dated spouses, earlier marriages sort first.
						if (!dateA && !dateB) return 0;
						if (!dateA) return 1;
						if (!dateB) return -1;
						return dateA.localeCompare(dateB);
					});
				});
			}

			// Apply combined privacy/as-of filter (#376). A card is marked private
			// (hidden via opacity) if EITHER filter says so:
			//   - hidePrivateLiving: person has no death date (considered living)
			//   - asOfDate: person's birth date is after the selected date (not yet born)
			if (this.hidePrivateLiving || this.asOfDate) {
				const asOfDate = this.asOfDate;
				this.f3Chart.setPrivateCardsConfig({
					condition: (d) => {
						if (this.hidePrivateLiving && !d.data?.deathday) return true;
						if (asOfDate && this.isNotYetBornAt(d.data?.birthday, asOfDate)) return true;
						return false;
					}
				});
			}

			// Configure cards based on current card style (#90)
			// Use helper methods for display fields and dimensions
			const displayFields = this.buildDisplayFields();

			// Apply container style class for CSS targeting
			this.updateContainerStyleClass();

			// Initialize card renderer based on card style
			switch (this.cardStyle) {
				case 'circle':
					// HTML cards with circular avatar - use setOnCardUpdate to replace entire card HTML
					// Based on family-chart v2 example: external/family-chart/examples/htmls/v2/11-card-styling.html
					this.f3Card = this.f3Chart.setCardHtml()
						.setOnCardUpdate(this.createCircleCardCallback());
					break;

				case 'compact':
					// Text-only cards, no avatars
					this.f3Card = this.f3Chart.setCardSvg()
						.setCardDisplay(displayFields)
						.setCardDim(this.getCardDimensions('compact'))
						.setOnCardClick((e, d) => this.handleCardClick(e, d))
						.setOnCardUpdate(this.createOpenNoteButtonCallback());
					break;

				case 'mini':
					// Smaller cards for overview
					this.f3Card = this.f3Chart.setCardSvg()
						.setCardDisplay(displayFields)
						.setCardDim(this.getCardDimensions('mini'))
						.setOnCardClick((e, d) => this.handleCardClick(e, d))
						.setOnCardUpdate(this.createOpenNoteButtonCallback());
					break;

				case 'rectangle':
				default:
					// Default: SVG cards with square avatars
					this.f3Card = this.f3Chart.setCardSvg()
						.setCardDisplay(displayFields)
						.setCardDim(this.getCardDimensions('rectangle'))
						.setOnCardClick((e, d) => this.handleCardClick(e, d))
						.setOnCardUpdate(this.createOpenNoteButtonCallback());
					break;
			}

			// Initialize EditTree for editing capabilities
			this.initializeEditTree();

			// Set main/root person if specified
			if (this.rootPersonId) {
				this.f3Chart.updateMainId(this.rootPersonId);
			}

			// Sanitize invalid SVG transforms from the library before first render
			this.setupTransformSanitizer();

			// Initial render without fit (just get the tree in the DOM)
			this.f3Chart.updateTree({ initial: true });

			// Defer positioning operation until container dimensions are stable
			setTimeout(() => {
				if (this.f3Chart && this.chartContainerEl) {
					// Check if we have a saved zoom transform to restore
					if (this.savedZoomTransform) {
						// Restore previous zoom/pan state instead of fitting
						logger.debug('chart-init', 'Restoring saved zoom transform', this.savedZoomTransform);
						this.restoreZoomTransform(this.savedZoomTransform);
						this.savedZoomTransform = null; // Clear after restore
					} else {
						// No saved transform - trigger fit when container has proper dimensions
						this.f3Chart.updateTree({ tree_position: 'fit' });
					}
					// Show container after animation completes
					setTimeout(() => {
						if (this.chartContainerEl) {
							this.chartContainerEl.setCssStyles({ visibility: 'visible' });
							loadingOverlay.remove();
						}
					}, 850);
				}
			}, 50);

			// Render kinship labels if enabled (after chart is rendered)
			// Delay must be longer than family-chart's transition_time (1000-2000ms)
			if (this.showKinshipLabels) {
				setTimeout(() => this.renderKinshipLabels(), 1500);
			}
		} catch (error) {
			// Remove loading overlay and show error state
			loadingOverlay.remove();
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			logger.error('chart-init', 'Failed to initialize chart', { message: errorMessage, stack: errorStack });
			console.error('[Charted Roots] Family chart initialization error:', error);

			// Show error state with more detail
			const errorContainer = this.chartContainerEl.createDiv({ cls: 'cr-family-chart-error' });
			errorContainer.createEl('h3', { text: 'Chart Error' });
			errorContainer.createEl('p', { text: errorMessage || 'Failed to render family chart. Check the console for details.' });
			return;
		}

		logger.info('chart-init', 'Chart initialized', {
			personCount: this.chartData.length,
			rootPersonId: this.rootPersonId
		});
	}

	/**
	 * Set up a MutationObserver to sanitize invalid SVG transforms.
	 *
	 * The family-chart library can produce `translate(undefined, undefined)` on
	 * entering card `<g>` elements when certain node positions haven't been
	 * computed yet (upstream bug in calculateEnterAndExitPositions). This
	 * observer catches those invalid transforms and replaces them with
	 * `translate(0, 0)` so cards animate from the origin instead of breaking.
	 */
	private setupTransformSanitizer(): void {
		if (!this.chartContainerEl) return;

		this.transformObserver?.disconnect();

		this.transformObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'attributes' &&
					mutation.attributeName === 'transform') {
					const el = mutation.target as SVGElement;
					const val = el.getAttribute('transform');
					if (val && (val.includes('undefined') || val.includes('NaN'))) {
						el.setAttribute('transform', 'translate(0, 0)');
					}
				}
			}
		});

		this.transformObserver.observe(this.chartContainerEl, {
			attributes: true,
			attributeFilter: ['transform'],
			subtree: true,
		});
	}

	/**
	 * Load and transform data from person notes to family-chart format
	 */
	private async loadChartData(): Promise<void> {
		const startTime = performance.now();

		// Reset spouse relationship lookup so stale data from a previous load
		// doesn't leak into the new dataset (#375, #376).
		this.spouseRelationshipData.clear();

		// Ensure cache is loaded first
		this.familyGraphService.ensureCacheLoaded();
		const cacheLoadTime = performance.now();

		// Get all people from the vault
		const people = this.familyGraphService.getAllPeople();
		const getAllPeopleTime = performance.now();

		// Build set of valid IDs first (needed to filter out broken relationship references)
		const validIds = new Set(people.map(p => p.crId));

		// Build a map for O(1) lookups during child validation
		const peopleMap = new Map(people.map(p => [p.crId, p]));
		const buildMapsTime = performance.now();

		// Pre-resolve avatar URLs for people not already cached
		// This allows the cache to persist across chart re-initializations
		if (this.showAvatars) {
			await this.preResolveAvatars(people);
		}
		const avatarResolveTime = performance.now();

		// Transform to family-chart format, filtering relationship IDs to only valid ones
		this.chartData = people.map(person => this.transformPersonNode(person, validIds, peopleMap));
		const transformTime = performance.now();

		logger.debug('data-load', 'Loaded chart data', {
			count: this.chartData.length,
			avatarsCached: this.avatarUrlCache.size,
			timing: {
				cacheLoad: `${(cacheLoadTime - startTime).toFixed(1)}ms`,
				getAllPeople: `${(getAllPeopleTime - cacheLoadTime).toFixed(1)}ms`,
				buildMaps: `${(buildMapsTime - getAllPeopleTime).toFixed(1)}ms`,
				avatarResolve: `${(avatarResolveTime - buildMapsTime).toFixed(1)}ms`,
				transform: `${(transformTime - avatarResolveTime).toFixed(1)}ms`,
				total: `${(transformTime - startTime).toFixed(1)}ms`
			}
		});
	}

	/**
	 * Pre-resolve avatar URLs for all people with media.
	 * Only resolves URLs not already in the cache, making subsequent
	 * chart initializations faster (e.g., when toggling avatars).
	 */
	private async preResolveAvatars(people: PersonNode[]): Promise<void> {
		const mediaService = this.plugin.getMediaService();
		if (!mediaService) return;

		let newlyResolved = 0;
		let cachedHits = 0;

		for (const person of people) {
			// Skip if already cached
			if (this.avatarUrlCache.has(person.crId)) {
				cachedHits++;
				continue;
			}

			// Skip if no media
			if (!person.media || person.media.length === 0) {
				continue;
			}

			// Resolve and cache the avatar URL
			const thumbnailFile = mediaService.getFirstThumbnailFile(person.media);
			if (thumbnailFile) {
				// Check for crop region (#354)
				const cache = this.app.metadataCache.getFileCache(person.file);
				const crops = cache?.frontmatter?.media_crop;
				let cropForThumb: import('../../core/media-service').MediaCrop | undefined;
				if (Array.isArray(crops)) {
					for (const entry of crops) {
						if (typeof entry === 'object' && entry &&
							(entry as Record<string, unknown>).image === thumbnailFile.name) {
							const obj = entry as Record<string, unknown>;
							if (typeof obj.x === 'number' && typeof obj.y === 'number' &&
								typeof obj.w === 'number' && typeof obj.h === 'number') {
								cropForThumb = { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
							}
						}
					}
				}

				if (cropForThumb) {
					// Await crop generation so the cropped URL is in cache before chart renders
					const { getCroppedImageUrl } = require('../../core/crop-renderer');
					const croppedUrl = await (getCroppedImageUrl as (app: unknown, file: unknown, crop: unknown) => Promise<string | null>)(
						this.app, thumbnailFile, cropForThumb
					);
					if (croppedUrl) {
						this.avatarUrlCache.set(person.crId, croppedUrl);
					} else {
						// Fallback to uncropped
						this.avatarUrlCache.set(person.crId, this.app.vault.getResourcePath(thumbnailFile));
					}
				} else {
					const avatarUrl = this.app.vault.getResourcePath(thumbnailFile);
					this.avatarUrlCache.set(person.crId, avatarUrl);
				}
				newlyResolved++;
			}
		}

		logger.debug('avatar-cache', 'Pre-resolved avatar URLs', {
			newlyResolved,
			cachedHits,
			totalCached: this.avatarUrlCache.size
		});
	}

	/**
	 * Transform PersonNode to family-chart format
	 * @param person The person node to transform
	 * @param validIds Set of valid person IDs (for filtering broken relationship references)
	 * @param peopleMap Map of crId to PersonNode for O(1) lookups
	 */
	private transformPersonNode(person: PersonNode, validIds: Set<string>, peopleMap: Map<string, PersonNode>): FamilyChartPerson {
		// Extract name components (#90)
		// Priority: explicit given_name/surnames properties, then fallback to parsing name field
		const { firstName, lastName } = this.extractNameComponents(person);

		// Map gender - family-chart uses M/F/X/U codes
		let gender: 'M' | 'F' | 'X' | 'U' | '' = 'U';
		const sex = person.sex?.toLowerCase();
		if (sex === 'm' || sex === 'male') {
			gender = 'M';
		} else if (sex === 'f' || sex === 'female') {
			gender = 'F';
		} else if (sex === 'x' || sex === 'nonbinary' || sex === 'non-binary' || sex === 'other' || sex === 'intersex') {
			gender = 'X';
		}

		// Build parents array - family-chart library allows max 2 parents per person
		// Priority: biological parents first, then adoptive if no biological
		// Step-parents are not included (would require separate representation)
		// Filter to only valid IDs (prevents family-chart crash when referenced person is outside folder filter)
		const parents: string[] = [];

		// Try biological parents first
		if (person.fatherCrId && validIds.has(person.fatherCrId)) {
			parents.push(person.fatherCrId);
		}
		if (person.motherCrId && validIds.has(person.motherCrId)) {
			parents.push(person.motherCrId);
		}

		// Also add gender-neutral parents (allows mixing father/mother with parents property)
		// family-chart allows max 2 parents, so only add if we have room
		if (person.parentCrIds) {
			for (const parentId of person.parentCrIds) {
				if (validIds.has(parentId) && !parents.includes(parentId) && parents.length < 2) {
					parents.push(parentId);
				}
			}
		}

		// If no biological or gender-neutral parents, use adoptive parents as fallback
		// This ensures adopted children appear connected to their adoptive family
		if (parents.length === 0) {
			// Gender-specific adoptive parents
			if (person.adoptiveFatherCrId && validIds.has(person.adoptiveFatherCrId)) {
				parents.push(person.adoptiveFatherCrId);
			}
			if (person.adoptiveMotherCrId && validIds.has(person.adoptiveMotherCrId) && !parents.includes(person.adoptiveMotherCrId)) {
				parents.push(person.adoptiveMotherCrId);
			}
			// Gender-neutral adoptive parents (may overlap with gender-specific, so deduplicate)
			if (person.adoptiveParentCrIds) {
				for (const adoptiveParentId of person.adoptiveParentCrIds) {
					if (validIds.has(adoptiveParentId) && !parents.includes(adoptiveParentId) && parents.length < 2) {
						parents.push(adoptiveParentId);
					}
				}
			}
		}

		// Filter spouses to only valid IDs
		const spouses = (person.spouseCrIds || []).filter(id => validIds.has(id));

		// Record spouse relationship metadata for sort (#375) and as-of filter (#376).
		// Populate in both directions so either side of the relationship can use it.
		if (person.spouses) {
			for (const rel of person.spouses) {
				if (!rel.personId) continue;
				this.registerSpouseRelationship(person.crId, rel.personId, {
					marriageDate: rel.marriageDate,
					divorceDate: rel.divorceDate,
				});
			}
		}

		// Apply as-of date filter to marriage lines (#376): omit spouses whose
		// marriage was not active on the selected date.
		const filteredSpouses = this.asOfDate
			? spouses.filter(spouseId => this.isMarriageActiveAt(person.crId, spouseId, this.asOfDate!))
			: spouses;

		// Filter children to only valid IDs AND only those who reference this person as a parent
		// family-chart requires strict bidirectional relationships: if parent lists child,
		// the child MUST list the parent back, otherwise family-chart throws
		// "child has more than 1 parent" error during tree construction
		// Include biological, gender-neutral, and adoptive children (matching the parent logic above)
		// Combine childrenCrIds and adoptedChildCrIds for complete child list (deduplicated)
		const allChildIds = [...new Set([
			...(person.childrenCrIds || []),
			...(person.adoptedChildCrIds || [])
		])];
		const children = allChildIds.filter(childId => {
			if (!validIds.has(childId)) return false;
			// Use the pre-built map for O(1) lookup instead of service call
			const childPerson = peopleMap.get(childId);
			if (!childPerson) return false;
			// Check biological parent relationship
			if (childPerson.fatherCrId === person.crId || childPerson.motherCrId === person.crId) {
				return true;
			}
			// Check gender-neutral parent relationship (allows mixing with father/mother)
			if (childPerson.parentCrIds && childPerson.parentCrIds.includes(person.crId)) {
				return true;
			}
			// Check adoptive parent relationship (only if child has no biological or gender-neutral parents)
			// This matches the parent logic: adoptive parents only used when no biological/gender-neutral parents
			if (!childPerson.fatherCrId && !childPerson.motherCrId && (!childPerson.parentCrIds || childPerson.parentCrIds.length === 0)) {
				// Gender-specific adoptive parents
				if (childPerson.adoptiveFatherCrId === person.crId || childPerson.adoptiveMotherCrId === person.crId) {
					return true;
				}
				// Gender-neutral adoptive parents
				if (childPerson.adoptiveParentCrIds && childPerson.adoptiveParentCrIds.includes(person.crId)) {
					return true;
				}
			}
			return false;
		});

		// Get avatar from cache (pre-resolved in loadChartData)
		// The cache persists across re-initializations, making avatar toggle fast
		let avatar: string | undefined;
		if (this.showAvatars) {
			avatar = this.avatarUrlCache.get(person.crId);
		}

		return {
			id: person.crId,
			data: {
				'first name': firstName,
				'last name': lastName,
				gender,
				birthday: person.birthDate,
				deathday: person.deathDate,
				avatar,
				'alt name': person.altName || '',
				'pronouns': Array.isArray(person.pronouns) ? person.pronouns.join(', ') : (person.pronouns || ''),
				'occupation': person.occupation || '',
				'title': person.title || '',
				'nickname': person.nickname || '',
				'religion': person.religion || '',
				'caste': person.caste || '',
				'birth place': person.birthPlace || '',
				'death place': person.deathPlace || '',
				'research level': person.researchLevel ?? '',
				'collection': person.collectionName || '',
			},
			rels: {
				parents,
				spouses: filteredSpouses,
				children,
			}
		};
	}

	/**
	 * Handle click on a person card
	 * The d parameter is a TreeDatum from family-chart
	 */
	private handleCardClick(_e: MouseEvent, d: { data: { id: string; [key: string]: unknown } }): void {
		const personId = d.data.id;

		logger.debug('card-click', 'Card clicked', { personId });

		// Open the info panel for this person
		// Note: We don't call onCardClickDefault here because it would re-center the tree
		// and reset the zoom level. Users can navigate to a person via the relationships
		// section which will re-center intentionally.
		this.openInfoPanel(personId);
	}

	/**
	 * Create the onCardUpdate callback for adding "Open note" buttons to cards
	 *
	 * family-chart's onCardUpdate callback is called with `this` bound to the card's
	 * SVG group element (<g class="card">). We need to return a regular function
	 * (not arrow) to preserve that binding, while capturing a reference to the view
	 * instance for the click handler.
	 */
	private createOpenNoteButtonCallback(): (d: { data: { id: string } }) => void {
		// Use bind to capture view reference while allowing family-chart to set `this` to the card element
		return this.addOpenNoteButton.bind(this);
	}

	/**
	 * Add open note button to a family-chart card element.
	 * Called with `this` bound to the view instance via bind() in createOpenNoteButtonCallback.
	 * The card element is found via d3.select using the person ID from the data parameter.
	 */
	private addOpenNoteButton(this: FamilyChartView, d: { data: { id: string; data?: { gender?: string; deathday?: string } } }): void {
		const personId = d.data.id;
		// Find the card container element using d3's data binding
		const cardSelection = d3.selectAll<SVGGElement, { data: { id: string } }>('.card_cont')
			.filter((nodeData) => nodeData?.data?.id === personId);
		if (cardSelection.empty()) return;
		const cardEl = cardSelection.node();
		if (!cardEl) return;

		// Fix gender class — the library only knows M/F, so correct X/U after rendering
		const gender = d.data.data?.gender;
		if (gender === 'X' || gender === 'U') {
			const cardG = d3.select(cardEl).select('.card');
			cardG.classed('card-genderless', false);
			cardG.classed(gender === 'X' ? 'card-nonbinary' : 'card-genderless', true);
		}

		// Mark cards whose person was deceased by the selected as-of date (#376).
		// The person stays visible (structure is preserved) but rendered in a
		// "historical" style (dashed border, reduced opacity) defined in CSS.
		const cardG = d3.select(cardEl).select('.card');
		const deceased = !!(this.asOfDate && this.isDeceasedAt(d.data.data?.deathday, this.asOfDate));
		cardG.classed('cr-card-deceased', deceased);

		// Check if button already exists (prevents duplicates on re-render)
		if (d3.select(cardEl).select('.cr-open-note-btn').size() > 0) return;

		// Get button position based on card style
		// Card dimensions vary by style and whether both dates are shown (taller cards)
		// Button radius=9, position near right edge
		const needsTallerCards = this.showBirthDates && this.showDeathDates;
		let btnX: number;
		let btnY: number;
		let btnRadius: number;
		switch (this.cardStyle) {
			case 'compact':
				btnX = 162; // 180 width, position near right edge
				btnY = 12;
				btnRadius = 9;
				break;
			case 'mini':
				btnX = 108; // 120 width, position near right edge
				btnY = 10;
				btnRadius = 7;
				break;
			default: // rectangle
				// Width is 220 when both dates shown, 200 otherwise
				btnX = needsTallerCards ? 205 : 185;
				btnY = 12;
				btnRadius = 9;
		}

		// Create button group positioned in top-right corner
		// Append to .card group (not .card-inner which has clip-path that clips the button)
		const btnGroup = d3.select(cardEl)
			.select('.card')
			.append('g')
			.attr('class', 'cr-open-note-btn')
			.attr('transform', `translate(${btnX}, ${btnY})`)
			.style('cursor', 'pointer');

		// Add circle background
		btnGroup.append('circle')
			.attr('r', btnRadius)
			.attr('fill', 'var(--background-primary)')
			.attr('stroke', 'var(--text-muted)')
			.attr('stroke-width', 1);

		// Add file-text icon (simplified SVG path for a document)
		// Scale icon for mini cards
		const iconScale = btnRadius < 9 ? 0.7 : 1;
		const iconGroup = btnGroup.append('g')
			.attr('transform', `scale(${iconScale})`);
		iconGroup.append('path')
			.attr('d', 'M-4,-5 L2,-5 L5,-2 L5,5 L-4,5 Z M2,-5 L2,-2 L5,-2')
			.attr('fill', 'none')
			.attr('stroke', 'var(--text-muted)')
			.attr('stroke-width', 1.2)
			.attr('stroke-linecap', 'round')
			.attr('stroke-linejoin', 'round');

		// Add click handler - arrow function preserves `this` binding from bind()
		btnGroup.on('click', (event: MouseEvent) => {
			event.stopPropagation(); // Prevent card click from triggering
			void this.openPersonNote(personId);
		});

		// Add hover effect
		btnGroup.on('mouseenter', function() {
			d3.select(this).select('circle')
				.attr('fill', 'var(--interactive-accent)')
				.attr('stroke', 'var(--interactive-accent)');
			d3.select(this).select('path')
				.attr('stroke', 'var(--text-on-accent)');
		});

		btnGroup.on('mouseleave', function() {
			d3.select(this).select('circle')
				.attr('fill', 'var(--background-primary)')
				.attr('stroke', 'var(--text-muted)');
			d3.select(this).select('path')
				.attr('stroke', 'var(--text-muted)');
		});
	}

	/**
	 * Create callback for circle card style that replaces the entire card HTML.
	 * Based on family-chart v2 example: external/family-chart/examples/htmls/v2/11-card-styling.html
	 *
	 * This approach uses setOnCardUpdate to replace the card's outerHTML with a custom
	 * structure that properly centers the circle on the node position.
	 */
	private createCircleCardCallback(): (d: TreeDatum) => void {
		// Use bind to capture view reference while family-chart sets container element context
		return this.updateCircleCard.bind(this);
	}

	/**
	 * Update a card element to use circle card styling.
	 * Called with `this` bound to the view instance via bind() in createCircleCardCallback.
	 * The card container is found via d3.select using the person ID from the data parameter.
	 */
	private updateCircleCard(this: FamilyChartView, d: TreeDatum): void {
		const personId = d.data.id;
		// Find the card container element using d3's data binding
		const containerSelection = d3.selectAll<HTMLElement, TreeDatum>('.card_cont')
			.filter((nodeData) => nodeData?.data?.id === personId);
		if (containerSelection.empty()) return;
		const container = containerSelection.node();
		if (!container) return;

		const card = container.querySelector('.card');
		if (!card) return;

		// Build class list for gender styling
		const classList = [];
		const gender = d.data.data.gender as string;
		if (gender === 'M') classList.push('card-male');
		else if (gender === 'F') classList.push('card-female');
		else if (gender === 'X') classList.push('card-nonbinary');
		else classList.push('card-genderless');
		if (d.data.main) classList.push('card-main');

		// Build name
		const firstName = d.data.data['first name'] || '';
		const lastName = d.data.data['last name'] || '';
		const name = `${firstName} ${lastName}`.trim() || 'Unknown';

		// Build label with optional alt name and dates
		const parts = [name];
		const altName = d.data.data['alt name'] as string;
		if (altName) {
			parts.push(altName);
		}
		if (this.showBirthDates && d.data.data.birthday) {
			parts.push(d.data.data.birthday);
		}
		if (this.showDeathDates && d.data.data.deathday) {
			parts.push(d.data.data.deathday);
		}
		const label = parts.join('<br>');

		const avatar = d.data.data.avatar as string | undefined;

		// Build card inner HTML based on whether avatar exists
		let cardInner: string;
		if (avatar) {
			cardInner = `
			<div class="card-image ${classList.join(' ')}">
				<img src="${avatar}">
				<div class="card-label">${label}</div>
			</div>
			`;
		} else {
			cardInner = `
			<div class="card-text ${classList.join(' ')}">
				${label}
			</div>
			`;
		}

		// Replace entire card HTML with properly centered structure
		// Note: transform and pointer-events are set via CSS in .card-style-circle .card
		card.outerHTML = `
		<div class="card">
			${cardInner}
		</div>
		`;

		// Re-attach click handler to the new card element
		const newCard = container.querySelector('.card');
		if (newCard) {
			newCard.addEventListener('click', (e: Event) => {
				this.handleCardClick(e as MouseEvent, d);
			});
		}
	}

	/**
	 * Open the note for a person by their cr_id
	 */
	private async openPersonNote(crId: string): Promise<void> {
		// Find the file for this person
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.cr_id === crId) {
				// Open in a new leaf beside this one
				const leaf = this.app.workspace.getLeaf('tab');
				await leaf.openFile(file);
				return;
			}
		}

		logger.warn('open-note', 'Could not find note for person', { crId });
	}

	/**
	 * Refresh the chart with current data
	 * @param waitForMetadataCache If true, waits for Obsidian's metadata cache to process (needed after batch operations).
	 *                             If false, reloads immediately (suitable for live updates triggered by file change events).
	 */
	async refreshChart(waitForMetadataCache: boolean = false): Promise<void> {
		// Save current zoom transform before refresh (if chart exists and has valid zoom)
		if (this.f3Chart?.svg) {
			const transform = f3.handlers.getCurrentZoom(this.f3Chart.svg);
			if (transform && isFinite(transform.k) && isFinite(transform.x) && isFinite(transform.y)) {
				this.savedZoomTransform = { k: transform.k, x: transform.x, y: transform.y };
				logger.debug('refresh', 'Saved zoom transform', this.savedZoomTransform);
			}
		}

		// Clear and reload the caches
		this.familyGraphService.clearCache();
		// Also clear avatar cache so we pick up any media changes
		this.avatarUrlCache.clear();

		if (waitForMetadataCache) {
			// Wait for Obsidian's metadata cache to finish processing (needed after batch operations)
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Check if root_person marking has changed
		const familyGraph = this.plugin.createFamilyGraphService();
		const { rootPerson } = familyGraph.getMarkedRootPerson();

		if (rootPerson) {
			// A root person is marked - use them
			this.rootPersonId = rootPerson.crId;
			void this.initializeChart();
		} else if (this.rootPersonId) {
			// No marked root, but we have a current selection - keep it
			void this.initializeChart();
		} else {
			// No marked root and no current selection
			this.showEmptyState();
		}
	}

	/**
	 * Fit chart to view (zoom to show all nodes)
	 */
	private fitToView(): void {
		if (this.f3Chart) {
			this.f3Chart.updateTree({ tree_position: 'fit' });
			// Delay display update to allow fit animation to complete
			setTimeout(() => this.updateZoomLevelDisplay(), 300);
		}
	}

	/**
	 * Zoom in by a fixed amount
	 */
	private zoomIn(): void {
		if (!this.f3Chart) return;

		const svg = this.f3Chart.svg;
		if (svg) {
			// Get current zoom to validate before zooming
			const currentTransform = f3.handlers.getCurrentZoom(svg);
			if (!currentTransform || !isFinite(currentTransform.k)) {
				logger.warn('zoom', 'Invalid zoom state, resetting to fit');
				this.fitToView();
				return;
			}
			// manualZoom uses scaleBy which multiplies, so 1.2 = zoom in by 20%
			f3.handlers.manualZoom({ amount: 1.2, svg, transition_time: 200 });
			this.updateZoomLevelDisplay();
		}
	}

	/**
	 * Zoom out by a fixed amount
	 */
	private zoomOut(): void {
		if (!this.f3Chart) return;

		const svg = this.f3Chart.svg;
		if (svg) {
			// Get current zoom to validate before zooming
			const currentTransform = f3.handlers.getCurrentZoom(svg);
			if (!currentTransform || !isFinite(currentTransform.k)) {
				logger.warn('zoom', 'Invalid zoom state, resetting to fit');
				this.fitToView();
				return;
			}
			// Prevent zooming out too far (minimum 10% zoom)
			if (currentTransform.k <= 0.1) {
				logger.debug('zoom', 'Already at minimum zoom level');
				return;
			}
			// manualZoom uses scaleBy which multiplies, so 0.8 = zoom out by 20%
			f3.handlers.manualZoom({ amount: 0.8, svg, transition_time: 200 });
			this.updateZoomLevelDisplay();
		}
	}

	/**
	 * Restore a saved zoom transform to the chart
	 * Uses d3 to apply the transform directly to the SVG
	 */
	private restoreZoomTransform(transform: { k: number; x: number; y: number }): void {
		if (!this.f3Chart?.svg) return;

		const svgElement = this.f3Chart.svg;
		const svgSelection = d3.select(svgElement);

		// Create d3 zoom transform
		const d3Transform = d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k);

		// family-chart stores the zoom behavior on the svg's __zoom property
		// We need to update both the __zoom property and the visual transform
		(svgElement as unknown as { __zoom: d3.ZoomTransform }).__zoom = d3Transform;

		// Find the transform group (the first g element that family-chart creates for the tree)
		const transformGroup = svgSelection.select('g');
		if (!transformGroup.empty()) {
			transformGroup
				.transition()
				.duration(200)
				.attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
		}

		// Update zoom level display
		this.updateZoomLevelDisplay();
	}

	/**
	 * Update the zoom level display in the toolbar
	 */
	private updateZoomLevelDisplay(): void {
		if (!this.f3Chart || !this.zoomLevelEl) return;

		const svg = this.f3Chart.svg;
		if (svg) {
			// Delay slightly to allow zoom transition to complete
			setTimeout(() => {
				const transform = f3.handlers.getCurrentZoom(svg);
				// Guard against NaN or invalid transform
				if (!transform || !isFinite(transform.k)) {
					logger.warn('zoom', 'Invalid zoom transform', { transform });
					if (this.zoomLevelEl) {
						this.zoomLevelEl.textContent = '100%';
					}
					return;
				}
				const percentage = Math.round(transform.k * 100);
				if (this.zoomLevelEl) {
					this.zoomLevelEl.textContent = `${percentage}%`;
				}
			}, 250);
		}
	}

	// ============ Search ============

	/**
	 * Open person search modal to find and center on a person
	 */
	private openPersonSearch(): void {
		const folderFilter = this.plugin.getFolderFilter() ?? undefined;

		new PersonPickerModal(this.app, (selectedPerson) => {
			this.centerOnPerson(selectedPerson.crId);
		}, folderFilter).open();
	}

	/**
	 * Center the chart on a specific person
	 */
	private centerOnPerson(crId: string): void {
		if (!this.f3Chart) return;

		// Find the datum for this person
		const datum = this.chartData.find(p => p.id === crId);
		if (!datum) {
			logger.warn('center-person', 'Person not found in chart data', { crId });
			return;
		}

		// Update main ID to make this person the focus
		this.f3Chart.updateMainId(crId);
		this.f3Chart.updateTree({ tree_position: 'main_to_middle' });

		logger.debug('center-person', 'Centered on person', { crId, name: `${datum.data['first name']} ${datum.data['last name']}` });
	}

	// ============ History (Undo/Redo) ============

	/**
	 * Go back in edit history (undo)
	 */
	private historyBack(): void {
		if (!this.f3EditTree) return;

		const history = this.f3EditTree.history;
		if (history && history.canBack()) {
			history.back();
			this.updateHistoryButtons();
			logger.debug('history', 'Undo performed');
		}
	}

	/**
	 * Go forward in edit history (redo)
	 */
	private historyForward(): void {
		if (!this.f3EditTree) return;

		const history = this.f3EditTree.history;
		if (history && history.canForward()) {
			history.forward();
			this.updateHistoryButtons();
			logger.debug('history', 'Redo performed');
		}
	}

	/**
	 * Update the enabled/disabled state of history buttons
	 */
	private updateHistoryButtons(): void {
		if (!this.f3EditTree || !this.historyBackBtn || !this.historyForwardBtn) return;

		const history = this.f3EditTree.history;
		if (!history) {
			this.historyBackBtn.setAttribute('disabled', 'true');
			this.historyForwardBtn.setAttribute('disabled', 'true');
			return;
		}

		// Update back button
		if (history.canBack()) {
			this.historyBackBtn.removeAttribute('disabled');
		} else {
			this.historyBackBtn.setAttribute('disabled', 'true');
		}

		// Update forward button
		if (history.canForward()) {
			this.historyForwardBtn.removeAttribute('disabled');
		} else {
			this.historyForwardBtn.setAttribute('disabled', 'true');
		}
	}

	// ============ Export ============

	/**
	 * Open the export wizard modal
	 */
	private openExportWizard(): void {
		const wizard = new FamilyChartExportWizard(this.plugin, this);
		wizard.open();
	}

	/**
	 * Build export context for delegating to standalone export functions
	 */
	private getExportContext(): FamilyChartExportContext {
		return {
			getChartSvg: () => this.f3Chart?.svg as SVGSVGElement | null ?? null,
			chartContainerEl: this.chartContainerEl,
			cardStyle: this.cardStyle,
			chartData: this.chartData,
			rootPersonId: this.rootPersonId,
			exportFilenamePattern: this.plugin.settings.exportFilenamePattern,
			ancestryDepth: this.ancestryDepth,
			progenyDepth: this.progenyDepth
		};
	}

	/**
	 * Get export information for the wizard to display estimates
	 */
	getExportInfo(): {
		rootPersonName: string;
		peopleCount: number;
		avatarCount: number;
	} {
		return doGetExportInfo(this.getExportContext());
	}

	/**
	 * Export chart with options from the wizard
	 */
	async exportWithOptions(options: {
		format: 'png' | 'svg' | 'pdf' | 'odt';
		filename: string;
		includeAvatars: boolean;
		scale?: number;
		// PDF/ODT-specific options
		pageSize?: 'fit' | 'a4' | 'letter' | 'legal' | 'tabloid';
		layout?: 'single' | 'tiled';
		orientation?: 'auto' | 'portrait' | 'landscape';
		includeCoverPage?: boolean;
		coverTitle?: string;
		coverSubtitle?: string;
		// Progress tracking
		onProgress?: ProgressCallback;
		isCancelled?: () => boolean;
	}): Promise<void> {
		await doExportWithOptions(this.getExportContext(), options);
	}

	// ============ Layout Configuration ============

	/**
	 * Show layout settings menu (orientation, spacing)
	 */
	private showLayoutMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Tree orientation
		menu.addItem((item) => {
			item.setTitle('Tree orientation')
				.setIcon('layout')
				.setDisabled(true);
		});

		menu.addItem((item) => {
			item.setTitle(`${!this.isHorizontal ? '✓ ' : ''}Vertical (top to bottom)`)
				.onClick(() => this.setOrientation(false));
		});
		menu.addItem((item) => {
			item.setTitle(`${this.isHorizontal ? '✓ ' : ''}Horizontal (left to right)`)
				.onClick(() => this.setOrientation(true));
		});

		menu.addSeparator();

		// Node spacing (horizontal)
		menu.addItem((item) => {
			item.setTitle(`Node spacing: ${this.nodeSpacing}px`)
				.setIcon('arrow-left-right')
				.setDisabled(true);
		});

		menu.addItem((item) => {
			item.setTitle(`${this.nodeSpacing === 140 ? '✓ ' : ''}Tight (140px)`)
				.onClick(() => this.setNodeSpacing(140));
		});
		menu.addItem((item) => {
			item.setTitle(`${this.nodeSpacing === 200 ? '✓ ' : ''}Compact (200px)`)
				.onClick(() => this.setNodeSpacing(200));
		});
		menu.addItem((item) => {
			item.setTitle(`${this.nodeSpacing === 250 ? '✓ ' : ''}Normal (250px)`)
				.onClick(() => this.setNodeSpacing(250));
		});
		menu.addItem((item) => {
			item.setTitle(`${this.nodeSpacing === 350 ? '✓ ' : ''}Spacious (350px)`)
				.onClick(() => this.setNodeSpacing(350));
		});

		menu.addSeparator();

		// Level spacing (vertical)
		menu.addItem((item) => {
			item.setTitle(`Level spacing: ${this.levelSpacing}px`)
				.setIcon('arrow-up-down')
				.setDisabled(true);
		});

		menu.addItem((item) => {
			item.setTitle(`${this.levelSpacing === 100 ? '✓ ' : ''}Compact (100px)`)
				.onClick(() => this.setLevelSpacing(100));
		});
		menu.addItem((item) => {
			item.setTitle(`${this.levelSpacing === 150 ? '✓ ' : ''}Normal (150px)`)
				.onClick(() => this.setLevelSpacing(150));
		});
		menu.addItem((item) => {
			item.setTitle(`${this.levelSpacing === 200 ? '✓ ' : ''}Spacious (200px)`)
				.onClick(() => this.setLevelSpacing(200));
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Show display settings menu (card display, visibility options)
	 */
	private showDisplayMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Card display options
		menu.addItem((item) => {
			item.setTitle('Card display')
				.setIcon('credit-card')
				.setDisabled(true);
		});

		menu.addItem((item) => {
			item.setTitle(`${this.showBirthDates ? '✓ ' : ''}Show birth dates`)
				.onClick(() => this.toggleBirthDates());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.showDeathDates ? '✓ ' : ''}Show death dates`)
				.onClick(() => this.toggleDeathDates());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.nameDisplayMode === 'split' ? '✓ ' : ''}Split given/surname`)
				.onClick(() => this.toggleNameDisplayMode());
		});

		// Built-in descriptive field toggles (#374)
		menu.addItem((item) => {
			item.setTitle(`${this.showNickname ? '✓ ' : ''}Show nickname`)
				.onClick(() => this.toggleNickname());
		});
		menu.addItem((item) => {
			item.setTitle(`${this.showTitle ? '✓ ' : ''}Show title`)
				.onClick(() => this.toggleTitle());
		});
		menu.addItem((item) => {
			item.setTitle(`${this.showPronouns ? '✓ ' : ''}Show pronouns`)
				.onClick(() => this.togglePronouns());
		});
		menu.addItem((item) => {
			item.setTitle(`${this.showOccupation ? '✓ ' : ''}Show occupation`)
				.onClick(() => this.toggleOccupation());
		});
		menu.addItem((item) => {
			item.setTitle(`${this.showReligion ? '✓ ' : ''}Show religion`)
				.onClick(() => this.toggleReligion());
		});
		menu.addItem((item) => {
			item.setTitle(`${this.showCaste ? '✓ ' : ''}Show caste`)
				.onClick(() => this.toggleCaste());
		});

		// Show avatars belongs with the other card-content toggles above, not
		// with the overlay toggles that follow.
		menu.addItem((item) => {
			item.setTitle(`${this.showAvatars ? '✓ ' : ''}Show avatars`)
				.setIcon('image')
				.onClick(() => this.toggleAvatars());
		});

		menu.addSeparator();

		// Overlays / annotations drawn on top of cards and links
		menu.addItem((item) => {
			item.setTitle(`${this.showKinshipLabels ? '✓ ' : ''}Show kinship labels`)
				.setIcon('tag')
				.onClick(() => this.toggleKinshipLabels());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.showCustomRelationships ? '✓ ' : ''}Show custom relationships`)
				.setIcon('waypoints')
				.onClick(() => this.toggleCustomRelationships());
		});

		// Per-type overlay toggles (shown when master toggle is on and >1 type exists)
		if (this.showCustomRelationships) {
			const overlayTypes = getAllRelationshipTypesWithCustomizations(
				this.plugin.settings.customRelationshipTypes || [],
				true,
				this.plugin.settings.relationshipTypeCustomizations,
				[]
			).filter(t => t.includeOnFamilyChartOverlay);

			if (overlayTypes.length > 1) {
				for (const type of overlayTypes) {
					const visible = this.customRelationshipTypeVisibility[type.id] !== false;
					menu.addItem((item) => {
						item.setTitle(`    ${visible ? '✓ ' : ''}${type.name}`)
							.onClick(() => this.toggleCustomRelationshipType(type.id));
					});
				}
			}
		}

		menu.addSeparator();

		// Highlighting — changes which cards are emphasized (its own block)
		menu.addItem((item) => {
			const active = this.hasActiveHighlights();
			item.setTitle(`${active ? '✓ ' : ''}Highlight groups...`)
				.setIcon('highlighter')
				.onClick(() => this.openHighlightGroupsModal());
		});

		menu.addSeparator();

		// Visibility options
		menu.addItem((item) => {
			item.setTitle('Visibility')
				.setIcon('eye')
				.setDisabled(true);
		});

		menu.addItem((item) => {
			item.setTitle(`${this.showSiblingsOfMain ? '✓ ' : ''}Show siblings of root person`)
				.onClick(() => this.toggleShowSiblingsOfMain());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.showSingleParentEmptyCard ? '✓ ' : ''}Show unknown parent placeholders`)
				.onClick(() => this.toggleSingleParentEmptyCard());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.sortChildrenByBirthDate ? '✓ ' : ''}Sort children by birth date`)
				.onClick(() => this.toggleSortChildrenByBirthDate());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.sortSpousesByMarriageDate ? '✓ ' : ''}Sort spouses by marriage date`)
				.onClick(() => this.toggleSortSpousesByMarriageDate());
		});

		menu.addItem((item) => {
			item.setTitle(`${this.hidePrivateLiving ? '✓ ' : ''}Hide living persons`)
				.onClick(() => this.toggleHidePrivateLiving());
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Show depth settings menu (ancestry/progeny limits)
	 */
	private showDepthMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Tree depth limits - Ancestry
		const ancestryLabel = this.ancestryDepth === null ? 'Unlimited' : `${this.ancestryDepth} gen`;
		menu.addItem((item) => {
			item.setTitle(`Ancestors: ${ancestryLabel}`)
				.setIcon('arrow-up')
				.setDisabled(true);
		});

		const ancestryOptions: (number | null)[] = [null, 1, 2, 3, 5];
		for (const depth of ancestryOptions) {
			const label = depth === null ? 'Unlimited' : `${depth} ${pluralize(depth, 'generation')}`;
			const isSelected = this.ancestryDepth === depth;
			menu.addItem((item) => {
				item.setTitle(`${isSelected ? '✓ ' : '  '}${label}`)
					.onClick(() => this.setAncestryDepth(depth));
			});
		}

		menu.addSeparator();

		// Tree depth limits - Descendants
		const progenyLabel = this.progenyDepth === null ? 'Unlimited' : `${this.progenyDepth} gen`;
		menu.addItem((item) => {
			item.setTitle(`Descendants: ${progenyLabel}`)
				.setIcon('arrow-down')
				.setDisabled(true);
		});

		const progenyOptions: (number | null)[] = [null, 1, 2, 3, 5];
		for (const depth of progenyOptions) {
			const label = depth === null ? 'Unlimited' : `${depth} ${pluralize(depth, 'generation')}`;
			const isSelected = this.progenyDepth === depth;
			menu.addItem((item) => {
				item.setTitle(`${isSelected ? '✓ ' : '  '}${label}`)
					.onClick(() => this.setProgenyDepth(depth));
			});
		}

		menu.showAtMouseEvent(e);
	}

	/**
	 * Theme preset definitions for family chart colors
	 */
	static readonly THEME_PRESETS: Record<string, { name: string; colors: FamilyChartColors }> = {
		classic: {
			name: 'Classic',
			colors: {
				femaleColor: 'rgb(196, 138, 146)',
				maleColor: 'rgb(120, 159, 172)',
				unknownColor: 'rgb(140, 140, 140)',
				backgroundLight: 'rgb(250, 250, 250)',
				backgroundDark: 'rgb(33, 33, 33)',
				textLight: '#333333',
				textDark: '#ffffff'
			}
		},
		pastel: {
			name: 'Pastel',
			colors: {
				femaleColor: '#f4c2c2',
				maleColor: '#a7c7e7',
				unknownColor: '#e6e6fa',
				backgroundLight: 'rgb(250, 250, 250)',
				backgroundDark: 'rgb(33, 33, 33)',
				textLight: '#333333',
				textDark: '#ffffff'
			}
		},
		earth: {
			name: 'Earth Tones',
			colors: {
				femaleColor: '#cc7a6f',
				maleColor: '#8fbc8f',
				unknownColor: '#d2b48c',
				backgroundLight: 'rgb(250, 250, 250)',
				backgroundDark: 'rgb(33, 33, 33)',
				textLight: '#333333',
				textDark: '#ffffff'
			}
		},
		contrast: {
			name: 'High Contrast',
			colors: {
				femaleColor: '#ff00ff',
				maleColor: '#00ffff',
				unknownColor: '#ffff00',
				backgroundLight: '#ffffff',
				backgroundDark: '#000000',
				textLight: '#000000',
				textDark: '#000000' // Black text on bright colors for accessibility
			}
		},
		mono: {
			name: 'Monochrome',
			colors: {
				femaleColor: '#666666',
				maleColor: '#888888',
				unknownColor: '#aaaaaa',
				backgroundLight: 'rgb(250, 250, 250)',
				backgroundDark: 'rgb(33, 33, 33)',
				textLight: '#333333',
				textDark: '#ffffff'
			}
		}
	};

	/**
	 * Show card style selection menu
	 */
	private showCardStyleMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Header
		menu.addItem((item) => {
			item.setTitle('Card style')
				.setIcon('layout-template')
				.setDisabled(true);
		});

		menu.addSeparator();

		// Rectangle (default)
		menu.addItem((item) => {
			item.setTitle(`${this.cardStyle === 'rectangle' ? '✓ ' : '  '}Rectangle`)
				.onClick(() => this.setCardStyle('rectangle'));
		});

		// Circle (HTML with circular avatars)
		menu.addItem((item) => {
			item.setTitle(`${this.cardStyle === 'circle' ? '✓ ' : '  '}Circle`)
				.onClick(() => this.setCardStyle('circle'));
		});

		// Compact (text-only, no avatars)
		menu.addItem((item) => {
			item.setTitle(`${this.cardStyle === 'compact' ? '✓ ' : '  '}Compact`)
				.onClick(() => this.setCardStyle('compact'));
		});

		// Mini (smaller cards)
		menu.addItem((item) => {
			item.setTitle(`${this.cardStyle === 'mini' ? '✓ ' : '  '}Mini`)
				.onClick(() => this.setCardStyle('mini'));
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Set the card style and refresh the chart
	 */
	private setCardStyle(style: CardStyle): void {
		if (this.cardStyle === style) return;
		logger.debug('set-card-style', 'Changing card style', { from: this.cardStyle, to: style });
		this.cardStyle = style;
		// Reset horizontal spacing to the new style's default so the tree density
		// actually reflects the chosen style (#373). Users who want a different
		// spacing can still override via the spacing menu.
		this.nodeSpacing = this.getDefaultNodeSpacing(style);
		this.updateContainerStyleClass();
		void this.refreshChart();
		// Trigger Obsidian to save view state
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Update the container's CSS class based on current card style
	 */
	private updateContainerStyleClass(): void {
		if (!this.chartContainerEl) return;

		// Remove existing style classes
		this.chartContainerEl.removeClass(
			'card-style-rectangle',
			'card-style-circle',
			'card-style-compact',
			'card-style-mini'
		);

		// Add current style class
		this.chartContainerEl.addClass(`card-style-${this.cardStyle}`);
	}

	/**
	 * Show style/theme menu
	 */
	private showStyleMenu(e: MouseEvent): void {
		const menu = new Menu();
		const currentColors = this.plugin.settings.familyChartColors;

		// Header
		menu.addItem((item) => {
			item.setTitle('Theme')
				.setIcon('palette')
				.setDisabled(true);
		});

		menu.addSeparator();

		// Preset themes
		for (const [key, preset] of Object.entries(FamilyChartView.THEME_PRESETS)) {
			const isSelected = this.isPresetActive(key, currentColors);
			menu.addItem((item) => {
				item.setTitle(`${isSelected ? '✓ ' : '  '}${preset.name}`)
					.onClick(() => this.applyThemePreset(key));
			});
		}

		menu.addSeparator();

		// Customize option
		menu.addItem((item) => {
			item.setTitle('Customize...')
				.setIcon('settings')
				.onClick(() => this.showCustomizeModal());
		});

		// Reset option
		menu.addItem((item) => {
			item.setTitle('Reset to defaults')
				.setIcon('rotate-ccw')
				.onClick(() => this.resetToDefaultColors());
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Check if a preset is currently active
	 */
	private isPresetActive(presetKey: string, currentColors?: FamilyChartColors): boolean {
		if (!currentColors) {
			// No custom colors = classic/default
			return presetKey === 'classic';
		}

		const preset = FamilyChartView.THEME_PRESETS[presetKey];
		if (!preset) return false;

		// Compare key colors (female, male, unknown)
		return currentColors.femaleColor === preset.colors.femaleColor &&
			currentColors.maleColor === preset.colors.maleColor &&
			currentColors.unknownColor === preset.colors.unknownColor;
	}

	/**
	 * Apply a theme preset
	 */
	private async applyThemePreset(presetKey: string): Promise<void> {
		const preset = FamilyChartView.THEME_PRESETS[presetKey];
		if (!preset) return;

		// Save to settings
		this.plugin.settings.familyChartColors = { ...preset.colors };
		await this.plugin.saveSettings();

		// Apply to chart
		this.applyCustomColors();

		new Notice(`Applied "${preset.name}" theme`);
	}

	/**
	 * Reset to default colors (removes custom settings)
	 */
	private async resetToDefaultColors(): Promise<void> {
		delete this.plugin.settings.familyChartColors;
		await this.plugin.saveSettings();

		// Clear inline styles
		this.clearCustomColors();

		new Notice('Colors reset to defaults');
	}

	/**
	 * Apply custom colors from settings to the chart container
	 */
	applyCustomColors(): void {
		const colors = this.plugin.settings.familyChartColors;
		if (!colors || !this.chartContainerEl) return;

		const el = this.chartContainerEl;
		const isDark = document.body.classList.contains('theme-dark');

		// Set family-chart library variables (used for card colors)
		el.style.setProperty('--female-color', colors.femaleColor);
		el.style.setProperty('--male-color', colors.maleColor);
		el.style.setProperty('--genderless-color', colors.unknownColor);
		el.style.setProperty('--background-color', isDark ? colors.backgroundDark : colors.backgroundLight);
		el.style.setProperty('--text-color', isDark ? colors.textDark : colors.textLight);

		// Also set our cr-fcv variables for consistency with Style Settings
		el.style.setProperty('--cr-fcv-female-color', colors.femaleColor);
		el.style.setProperty('--cr-fcv-male-color', colors.maleColor);
		el.style.setProperty('--cr-fcv-unknown-color', colors.unknownColor);
		if (isDark) {
			el.style.setProperty('--cr-fcv-background-dark', colors.backgroundDark);
			el.style.setProperty('--cr-fcv-text-dark', colors.textDark);
		} else {
			el.style.setProperty('--cr-fcv-background-light', colors.backgroundLight);
			el.style.setProperty('--cr-fcv-text-light', colors.textLight);
		}

		// Update container background directly
		el.style.backgroundColor = isDark ? colors.backgroundDark : colors.backgroundLight;
		el.style.color = isDark ? colors.textDark : colors.textLight;
	}

	/**
	 * Clear custom color inline styles (reverts to CSS defaults or Style Settings)
	 */
	clearCustomColors(): void {
		if (!this.chartContainerEl) return;

		const el = this.chartContainerEl;
		const isDark = document.body.classList.contains('theme-dark');

		// Clear family-chart library variables
		el.style.removeProperty('--female-color');
		el.style.removeProperty('--male-color');
		el.style.removeProperty('--genderless-color');
		el.style.removeProperty('--background-color');
		el.style.removeProperty('--text-color');

		// Clear our cr-fcv variables
		el.style.removeProperty('--cr-fcv-female-color');
		el.style.removeProperty('--cr-fcv-male-color');
		el.style.removeProperty('--cr-fcv-unknown-color');
		el.style.removeProperty('--cr-fcv-background-light');
		el.style.removeProperty('--cr-fcv-background-dark');
		el.style.removeProperty('--cr-fcv-text-light');
		el.style.removeProperty('--cr-fcv-text-dark');

		// Reset container background to defaults
		el.style.backgroundColor = isDark ? 'rgb(33, 33, 33)' : 'rgb(250, 250, 250)';
		el.style.color = isDark ? '#fff' : '#333';
	}

	/**
	 * Show the customize colors modal
	 */
	private showCustomizeModal(): void {
		new FamilyChartStyleModal(this.app, this.plugin, FamilyChartView.THEME_PRESETS, {
			apply: () => this.applyCustomColors(),
			clear: () => this.clearCustomColors()
		}).open();
	}

	/**
	 * Toggle birth dates display
	 */
	private toggleBirthDates(): void {
		this.showBirthDates = !this.showBirthDates;
		this.updateCardDisplay();
		new Notice(`Birth dates ${this.showBirthDates ? 'shown' : 'hidden'}`);
	}

	/**
	 * Toggle death dates display
	 */
	private toggleDeathDates(): void {
		this.showDeathDates = !this.showDeathDates;
		this.updateCardDisplay();
		new Notice(`Death dates ${this.showDeathDates ? 'shown' : 'hidden'}`);
	}

	/**
	 * Toggle built-in descriptive field display on the in-tree card (#374)
	 */
	private toggleTitle(): void {
		this.showTitle = !this.showTitle;
		this.updateCardDisplay();
		new Notice(`Title ${this.showTitle ? 'shown' : 'hidden'}`);
		this.app.workspace.requestSaveLayout();
	}

	private toggleOccupation(): void {
		this.showOccupation = !this.showOccupation;
		this.updateCardDisplay();
		new Notice(`Occupation ${this.showOccupation ? 'shown' : 'hidden'}`);
		this.app.workspace.requestSaveLayout();
	}

	private toggleNickname(): void {
		this.showNickname = !this.showNickname;
		this.updateCardDisplay();
		new Notice(`Nickname ${this.showNickname ? 'shown' : 'hidden'}`);
		this.app.workspace.requestSaveLayout();
	}

	private toggleReligion(): void {
		this.showReligion = !this.showReligion;
		this.updateCardDisplay();
		new Notice(`Religion ${this.showReligion ? 'shown' : 'hidden'}`);
		this.app.workspace.requestSaveLayout();
	}

	private toggleCaste(): void {
		this.showCaste = !this.showCaste;
		this.updateCardDisplay();
		new Notice(`Caste ${this.showCaste ? 'shown' : 'hidden'}`);
		this.app.workspace.requestSaveLayout();
	}

	private togglePronouns(): void {
		this.showPronouns = !this.showPronouns;
		this.updateCardDisplay();
		new Notice(`Pronouns ${this.showPronouns ? 'shown' : 'hidden'}`);
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Toggle name display mode between full and split (#90)
	 */
	private toggleNameDisplayMode(): void {
		this.nameDisplayMode = this.nameDisplayMode === 'full' ? 'split' : 'full';
		// Need to re-initialize chart to re-transform person data with new name extraction
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}
		new Notice(`Name display: ${this.nameDisplayMode === 'split' ? 'given/surname on separate lines' : 'full name on single line'}`);
		// Trigger Obsidian to save view state
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Extract name components from a PersonNode (#90)
	 * Uses explicit given_name/surnames properties when available,
	 * falls back to parsing the name field.
	 *
	 * In split mode, splits at the last space per user feedback:
	 * "John William Smith" → firstName="John William", lastName="Smith"
	 */
	private extractNameComponents(person: PersonNode): { firstName: string; lastName: string } {
		let firstName: string;
		let lastName: string;

		// Use explicit name components if available
		if (person.givenName) {
			firstName = person.givenName;
		} else if (this.nameDisplayMode === 'split') {
			// Split mode fallback: everything before last space
			const nameParts = (person.name || '').trim().split(' ');
			firstName = nameParts.length > 1
				? nameParts.slice(0, -1).join(' ')
				: nameParts[0] || '';
		} else {
			// Full mode fallback: first word only (current behavior)
			const nameParts = (person.name || '').trim().split(' ');
			firstName = nameParts[0] || '';
		}

		if (person.surnames && person.surnames.length > 0) {
			// Join all surnames (supports Hispanic/Portuguese naming)
			lastName = person.surnames.join(' ');
		} else if (this.nameDisplayMode === 'split') {
			// Split mode fallback: last word only
			const nameParts = (person.name || '').trim().split(' ');
			lastName = nameParts.length > 1
				? nameParts[nameParts.length - 1]
				: '';
		} else {
			// Full mode fallback: everything after first word (current behavior)
			const nameParts = (person.name || '').trim().split(' ');
			lastName = nameParts.slice(1).join(' ');
		}

		return { firstName, lastName };
	}

	/**
	 * Toggle kinship labels display
	 */
	private toggleKinshipLabels(): void {
		this.showKinshipLabels = !this.showKinshipLabels;
		// If enabling, wait for any ongoing animations to complete
		// If disabling, render immediately to remove labels
		if (this.showKinshipLabels) {
			setTimeout(() => this.renderKinshipLabels(), 1500);
		} else {
			this.renderKinshipLabels();
		}
		new Notice(`Kinship labels ${this.showKinshipLabels ? 'shown' : 'hidden'}`);
	}

	/**
	 * Toggle avatar display on cards
	 */
	private toggleAvatars(): void {
		this.showAvatars = !this.showAvatars;
		// Need to re-initialize chart to re-transform person data with/without avatars
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}
		new Notice(`Avatars ${this.showAvatars ? 'shown' : 'hidden'}`);
	}

	/**
	 * Set tree orientation (vertical or horizontal)
	 */
	private setOrientation(horizontal: boolean): void {
		if (this.isHorizontal === horizontal) return; // No change

		this.isHorizontal = horizontal;

		// Re-initialize chart with new orientation
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		new Notice(`Tree orientation: ${horizontal ? 'horizontal' : 'vertical'}`);
	}

	/**
	 * Set ancestry depth limit
	 */
	private setAncestryDepth(depth: number | null): void {
		if (this.ancestryDepth === depth) return;

		this.ancestryDepth = depth;

		// Re-initialize chart with new depth
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		const label = depth === null ? 'unlimited' : `${depth} ${pluralize(depth, 'generation')}`;
		new Notice(`Ancestry depth: ${label}`);
	}

	/**
	 * Set progeny depth limit
	 */
	private setProgenyDepth(depth: number | null): void {
		if (this.progenyDepth === depth) return;

		this.progenyDepth = depth;

		// Re-initialize chart with new depth
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		const label = depth === null ? 'unlimited' : `${depth} ${pluralize(depth, 'generation')}`;
		new Notice(`Descendant depth: ${label}`);
	}

	/**
	 * Toggle show siblings of main person
	 */
	private toggleShowSiblingsOfMain(): void {
		this.showSiblingsOfMain = !this.showSiblingsOfMain;

		// Re-initialize chart with new setting
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		new Notice(`Siblings of root person ${this.showSiblingsOfMain ? 'shown' : 'hidden'}`);
	}

	/**
	 * Toggle single parent empty card display
	 */
	private toggleSingleParentEmptyCard(): void {
		this.showSingleParentEmptyCard = !this.showSingleParentEmptyCard;

		// Re-initialize chart with new setting
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		new Notice(`Unknown parent placeholders ${this.showSingleParentEmptyCard ? 'shown' : 'hidden'}`);
	}

	/**
	 * Toggle sort children by birth date
	 */
	private toggleSortChildrenByBirthDate(): void {
		this.sortChildrenByBirthDate = !this.sortChildrenByBirthDate;

		// Re-initialize chart with new setting
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		new Notice(`Sort children by birth date ${this.sortChildrenByBirthDate ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Toggle sort spouses by marriage date (#375)
	 */
	private toggleSortSpousesByMarriageDate(): void {
		this.sortSpousesByMarriageDate = !this.sortSpousesByMarriageDate;

		// Re-initialize chart so the sort function is wired (or unwired) on the
		// family-chart store. Disabling the toggle mid-session leaves the
		// previous sort function in place until the next initializeChart.
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		new Notice(`Sort spouses by marriage date ${this.sortSpousesByMarriageDate ? 'enabled' : 'disabled'}`);
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Record a spouse relationship's metadata (marriage/divorce dates) between
	 * two people for the spouse-sort toggle (#375) and as-of filter (#376).
	 * Populates both directions so either side of the relationship can use it.
	 * If the same pair gets reported twice, the first entry wins so a populated
	 * entry isn't overwritten by a blank one from the other side.
	 */
	private registerSpouseRelationship(a: string, b: string, data: { marriageDate?: string; divorceDate?: string }): void {
		if (!this.spouseRelationshipData.has(a)) this.spouseRelationshipData.set(a, new Map());
		if (!this.spouseRelationshipData.has(b)) this.spouseRelationshipData.set(b, new Map());
		const aMap = this.spouseRelationshipData.get(a)!;
		const bMap = this.spouseRelationshipData.get(b)!;
		if (!aMap.has(b)) aMap.set(b, data);
		if (!bMap.has(a)) bMap.set(a, data);
	}

	/**
	 * Set the as-of date filter (#376). Null clears the filter.
	 * Re-initializes the chart so the combined privacy/as-of predicate, spouse-line
	 * filtering, and deceased styling all pick up the new value.
	 */
	private setAsOfDate(date: string | null): void {
		const normalized = date || null;
		if (this.asOfDate === normalized) return;
		this.asOfDate = normalized;
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}
		new Notice(normalized ? `As-of date: ${normalized}` : 'As-of date cleared');
		this.app.workspace.requestSaveLayout();
	}

	// ============ As-of date helpers (#376) ============

	/**
	 * Compare two date strings. Returns negative if a < b, positive if a > b, 0 if equal.
	 * Both dates are compared as ISO strings when both look like ISO (gives day-level
	 * precision); otherwise falls back to year-level comparison for fuzzy/qualified
	 * dates ("ABT 1850", etc). Returns 0 when either side can't be parsed.
	 */
	private compareDateStrings(a: string, b: string): number {
		// Fast path for ISO-shaped dates (YYYY, YYYY-MM, or YYYY-MM-DD)
		const isoShape = /^\d{4}(-\d{2}(-\d{2})?)?$/;
		if (isoShape.test(a) && isoShape.test(b)) {
			return a.localeCompare(b);
		}
		// Fall back to year-level comparison for approximate/qualified dates
		const yearA = this.extractYearForComparison(a);
		const yearB = this.extractYearForComparison(b);
		if (yearA == null || yearB == null) return 0;
		return yearA - yearB;
	}

	/** Extract a year from a date string, handling ISO, bare-year, and qualified ("ABT 1850") formats. */
	private extractYearForComparison(dateStr: string): number | null {
		if (!dateStr) return null;
		const match = dateStr.match(/\d{4}/);
		return match ? parseInt(match[0], 10) : null;
	}

	/** True if the person was not yet born at `asOfDate`. (#376) */
	private isNotYetBornAt(birthDate: string | undefined, asOfDate: string): boolean {
		if (!birthDate) return false; // no birth date → can't say they weren't born
		return this.compareDateStrings(birthDate, asOfDate) > 0;
	}

	/** True if the person was already deceased at `asOfDate`. (#376) */
	private isDeceasedAt(deathDate: string | undefined, asOfDate: string): boolean {
		if (!deathDate) return false;
		return this.compareDateStrings(deathDate, asOfDate) < 0;
	}

	/**
	 * True if the marriage between persons a and b was active at `asOfDate`. (#376)
	 * A marriage is considered active when its marriageDate ≤ asOfDate AND
	 * either there's no divorceDate or divorceDate > asOfDate.
	 * If no marriage metadata exists for the pair, returns true (conservative:
	 * don't hide relationships we don't have dates for).
	 */
	private isMarriageActiveAt(a: string, b: string, asOfDate: string): boolean {
		const data = this.spouseRelationshipData.get(a)?.get(b);
		if (!data) return true;
		if (data.marriageDate && this.compareDateStrings(data.marriageDate, asOfDate) > 0) return false;
		if (data.divorceDate && this.compareDateStrings(data.divorceDate, asOfDate) <= 0) return false;
		return true;
	}

	/**
	 * Toggle hide private/living persons
	 */
	private toggleHidePrivateLiving(): void {
		this.hidePrivateLiving = !this.hidePrivateLiving;

		// Re-initialize chart with new setting
		if (this.f3Chart && this.rootPersonId) {
			void this.initializeChart();
		}

		new Notice(`Living persons ${this.hidePrivateLiving ? 'hidden' : 'shown'}`);
	}

	/**
	 * Clear kinship labels before a tree update (#195)
	 * Called by setBeforeUpdate callback to prevent stale labels during animation
	 */
	private clearKinshipLabelsForUpdate(): void {
		if (this.showKinshipLabels && this.chartContainerEl) {
			const existingLabels = this.chartContainerEl.querySelectorAll('.cr-kinship-label');
			existingLabels.forEach(label => label.remove());
		}
	}

	/**
	 * Schedule kinship label re-render after tree animation (#195)
	 * Called by setAfterUpdate callback to restore labels after animation completes
	 */
	private scheduleKinshipLabelRerender(): void {
		if (this.showKinshipLabels) {
			// Delay must be longer than family-chart's transition_time (~800ms)
			// to ensure link positions have stabilized
			setTimeout(() => this.renderKinshipLabels(), 1500);
		}
	}

	/**
	 * Render kinship labels on links
	 * Adds text labels showing relationship type (Father, Mother, Spouse, etc.)
	 */
	private renderKinshipLabels(): void {
		if (!this.chartContainerEl) {
			logger.debug('kinship-labels', 'No chart container');
			return;
		}

		// Remove existing kinship labels
		const existingLabels = this.chartContainerEl.querySelectorAll('.cr-kinship-label');
		existingLabels.forEach(label => label.remove());

		if (!this.showKinshipLabels) {
			logger.debug('kinship-labels', 'Kinship labels disabled');
			return;
		}

		// Get the SVG element
		const svg = this.chartContainerEl.querySelector('svg.main_svg');
		if (!svg) {
			logger.debug('kinship-labels', 'No SVG found');
			return;
		}

		// Build a lookup map of person ID to person data
		const personMap = new Map<string, FamilyChartPerson>();
		for (const person of this.chartData) {
			personMap.set(person.id, person);
		}

		// Build a map of card positions by person ID for spouse link identification
		const cardPositions = this.getCardPositions();

		// Find the links group and add labels
		const linksGroup = svg.querySelector('.links_view');
		if (!linksGroup) {
			logger.debug('kinship-labels', 'No links_view group found');
			return;
		}

		// Create a group for kinship labels
		const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		labelsGroup.setAttribute('class', 'cr-kinship-labels');

		// Get all link paths
		const links = linksGroup.querySelectorAll('path.link');

		links.forEach((linkPath) => {
			// Get link data from the path's d attribute to calculate midpoint
			const pathData = linkPath.getAttribute('d');
			if (!pathData) return;

			// Calculate midpoint of the path
			const midpoint = this.getPathMidpoint(linkPath as SVGPathElement);
			if (!midpoint) return;

			// Determine relationship type from link structure
			// Links in family-chart connect children to parents or spouses
			const linkEl = linkPath as SVGPathElement;
			const isSpouseLink = linkEl.classList.contains('spouse') ||
				pathData.includes('L') && !pathData.includes('C'); // Straight lines are typically spouse links

			// Create label text
			const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			label.setAttribute('class', 'cr-kinship-label');

			// For spouse links, position label above the line to avoid overlapping cards
			// Position closer to spouse end (85% along path) to avoid other intermediate cards
			let labelX = midpoint.x;
			let labelY = midpoint.y - 20; // Offset above the line

			if (isSpouseLink) {
				const endpoints = this.getLinkEndpoints(linkEl);
				if (endpoints) {
					// Position label in the visible gap near the spouse (end) card
					// Cards are ~200px wide, centered on their position, so card edge is ~100px from center
					// Position label 25px before the spouse's card edge (125px from spouse center)
					// This places labels in the visible gap between cards, near each spouse
					const dx = endpoints.end.x - endpoints.start.x;
					const dy = endpoints.end.y - endpoints.start.y;
					const linkLength = Math.sqrt(dx * dx + dy * dy);

					// Fixed offset from end (spouse position): 125px back from spouse center
					const offsetFromSpouse = 125;
					const ratio = Math.max(1 - (offsetFromSpouse / linkLength), 0.5); // Stay in second half

					labelX = endpoints.start.x + dx * ratio;
					labelY = endpoints.start.y + dy * ratio - 20;
				}
			}

			label.setAttribute('x', String(labelX));
			label.setAttribute('y', String(labelY));
			label.setAttribute('text-anchor', 'middle');
			label.setAttribute('dominant-baseline', 'middle');

			// Set appropriate label text
			if (isSpouseLink) {
				// Try to determine spouse number for multi-spouse scenarios (#195)
				const spouseNumber = this.getSpouseNumberForLink(linkEl, cardPositions, personMap);
				if (spouseNumber !== null) {
					// Multi-spouse: show circled number
					label.textContent = this.getCircledNumber(spouseNumber);
					label.classList.add('cr-kinship-label--spouse', 'cr-kinship-label--numbered');
				} else {
					// Single spouse or couldn't determine: show regular label
					label.textContent = getSpouseLabel(this.plugin.settings);
					label.classList.add('cr-kinship-label--spouse');
				}
			} else {
				// Parent-child link - label based on direction
				// Links go from child to parent in family-chart
				label.textContent = 'Parent';
				label.classList.add('cr-kinship-label--parent');
			}

			labelsGroup.appendChild(label);
		});

		// Append labels group inside the view group so they follow pan/zoom transforms
		// The view group contains links_view and cards_view and has the pan/zoom transform
		const viewGroup = svg.querySelector('.view');
		if (viewGroup) {
			viewGroup.appendChild(labelsGroup);
			logger.debug('kinship-labels', 'Appended labels to .view group');
		} else {
			// Fallback to SVG root if no view group found
			svg.appendChild(labelsGroup);
			logger.debug('kinship-labels', 'Appended labels to SVG root (no .view group)');
		}
	}

	// ─── Custom Relationships Overlay (#386) ────────────────────────────

	/**
	 * Clear the custom-relationships overlay before a tree update.
	 * Called by setBeforeUpdate to prevent stale lines during animation.
	 */
	private clearRelationshipOverlayForUpdate(): void {
		if (this.showCustomRelationships && this.chartContainerEl) {
			const existing = this.chartContainerEl.querySelectorAll('.cr-relationship-overlay');
			existing.forEach(el => el.remove());
		}
	}

	/**
	 * Schedule overlay re-render after tree animation completes.
	 * Uses the same ~1500ms delay as kinship labels so positions are stable.
	 */
	private scheduleRelationshipOverlayRerender(): void {
		if (this.showCustomRelationships) {
			setTimeout(() => this.renderRelationshipOverlay(), 1500);
		}
	}

	/**
	 * Render custom relationships as overlay lines on the family chart.
	 * Pulls relationships for each visible card, filters to types flagged for
	 * overlay rendering and enabled per-type, applies the as-of date filter,
	 * and draws a styled line between each pair of card centers.
	 */
	private renderRelationshipOverlay(): void {
		if (!this.chartContainerEl) return;

		// Remove existing overlay group(s)
		const existing = this.chartContainerEl.querySelectorAll('.cr-relationship-overlay');
		existing.forEach(el => el.remove());

		if (!this.showCustomRelationships) return;

		const svg = this.chartContainerEl.querySelector('svg.main_svg');
		if (!svg) return;

		// Build a set of overlay-eligible type ids and a lookup to their definitions
		const overlayTypes = this.getOverlayRelationshipTypes();
		if (overlayTypes.size === 0) return;

		// Card positions for every currently-rendered person
		const cardPositions = this.getCardPositions();
		if (cardPositions.size === 0) return;

		// Collect qualifying relationships (deduped for symmetric pairs)
		const relationships = this.collectOverlayRelationships(cardPositions, overlayTypes);
		if (relationships.length === 0) return;

		// Group by canonical endpoint pair for multi-edge stacking
		const byPair = new Map<string, Array<{ rel: ParsedRelationship; type: RelationshipTypeDefinition }>>();
		for (const entry of relationships) {
			const { rel } = entry;
			const pairKey = [rel.sourceCrId, rel.targetCrId].sort().join('|');
			const existing = byPair.get(pairKey);
			if (existing) {
				existing.push(entry);
			} else {
				byPair.set(pairKey, [entry]);
			}
		}

		// Create the overlay group
		const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		overlayGroup.setAttribute('class', 'cr-relationship-overlay');

		// Draw lines
		const STACK_OFFSET_PX = 8;
		for (const [, entries] of byPair) {
			entries.forEach((entry, index) => {
				const { rel, type } = entry;
				const from = cardPositions.get(rel.sourceCrId);
				const to = cardPositions.get(rel.targetCrId);
				if (!from || !to) return;

				// Perpendicular offset for stacking when multiple relationships share a pair
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const len = Math.sqrt(dx * dx + dy * dy) || 1;
				// Unit perpendicular vector (rotate 90° CCW)
				const px = -dy / len;
				const py = dx / len;
				// Center stack around 0 with a half-step shift for odd counts so
				// no line lands on the midpoint where a family link might sit
				// (marriage, parent-child). Even counts are already symmetric
				// around 0 and don't coincide with the midpoint.
				const N = entries.length;
				const halfShift = N % 2 === 1 ? 0.5 : 0;
				const offsetIndex = index - (N - 1) / 2 + halfShift;
				const offset = offsetIndex * STACK_OFFSET_PX;
				const ox = px * offset;
				const oy = py * offset;

				// Invisible wider "hit line" makes hover-to-tooltip easier without
				// thickening the visible line. Paired with a visible thin line on top.
				const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				hitLine.setAttribute('x1', String(from.x + ox));
				hitLine.setAttribute('y1', String(from.y + oy));
				hitLine.setAttribute('x2', String(to.x + ox));
				hitLine.setAttribute('y2', String(to.y + oy));
				hitLine.setAttribute('stroke', 'transparent');
				hitLine.setAttribute('stroke-width', '14');
				hitLine.setAttribute('fill', 'none');
				hitLine.setAttribute('class', 'cr-relationship-overlay-hitline');
				// Tooltip hangs on the hit line so hover works across the wider area
				const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
				const dateRange = this.formatRelationshipDateRange(rel);
				tooltip.textContent = dateRange
					? `${rel.sourceName} — ${type.name} — ${rel.targetName} (${dateRange})`
					: `${rel.sourceName} — ${type.name} — ${rel.targetName}`;
				hitLine.appendChild(tooltip);
				overlayGroup.appendChild(hitLine);

				const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				line.setAttribute('x1', String(from.x + ox));
				line.setAttribute('y1', String(from.y + oy));
				line.setAttribute('x2', String(to.x + ox));
				line.setAttribute('y2', String(to.y + oy));
				line.setAttribute('stroke', type.color);
				line.setAttribute('stroke-width', '2');
				line.setAttribute('fill', 'none');
				// Visible line defers pointer events to the hit line below so the
				// wider hit target is always the hover target
				line.setAttribute('pointer-events', 'none');
				if (type.lineStyle === 'dashed') {
					line.setAttribute('stroke-dasharray', '8,4');
				} else if (type.lineStyle === 'dotted') {
					line.setAttribute('stroke-dasharray', '2,3');
				}
				line.setAttribute('class', `cr-relationship-overlay-line cr-relationship-overlay-line--${type.id}`);
				overlayGroup.appendChild(line);
			});
		}

		// Insert overlay before links_view so family links paint on top of the
		// overlay. This prevents the overlay from occluding spouse/parent lines
		// when three or more relationships stack on the same pair (#386).
		const viewGroup = svg.querySelector('.view');
		if (viewGroup) {
			const linksView = viewGroup.querySelector('.links_view');
			if (linksView) {
				viewGroup.insertBefore(overlayGroup, linksView);
			} else {
				viewGroup.appendChild(overlayGroup);
			}
		} else {
			svg.appendChild(overlayGroup);
		}
	}

	/**
	 * Return a map of relationship type ids → RelationshipTypeDefinition for types
	 * that should render as overlay lines (master toggle + per-type visibility).
	 */
	private getOverlayRelationshipTypes(): Map<string, RelationshipTypeDefinition> {
		const out = new Map<string, RelationshipTypeDefinition>();
		const allTypes = getAllRelationshipTypesWithCustomizations(
			this.plugin.settings.customRelationshipTypes || [],
			true,
			this.plugin.settings.relationshipTypeCustomizations,
			[]
		);
		for (const type of allTypes) {
			if (!type.includeOnFamilyChartOverlay) continue;
			// Per-type visibility defaults to true when the master toggle is on;
			// explicit false entries disable that specific type
			if (this.customRelationshipTypeVisibility[type.id] === false) continue;
			out.set(type.id, type);
		}
		return out;
	}

	/**
	 * Gather the relationships to draw: iterate visible cards, pull each person's
	 * relationships, filter by overlay types, as-of date, and dedupe symmetric pairs.
	 */
	private collectOverlayRelationships(
		cardPositions: Map<string, { x: number; y: number }>,
		overlayTypes: Map<string, RelationshipTypeDefinition>
	): Array<{ rel: ParsedRelationship; type: RelationshipTypeDefinition }> {
		const service = new RelationshipService(this.plugin);
		const seen = new Set<string>();
		const out: Array<{ rel: ParsedRelationship; type: RelationshipTypeDefinition }> = [];

		for (const crId of cardPositions.keys()) {
			const rels = service.getRelationshipsForPerson(crId);
			for (const rel of rels) {
				const type = overlayTypes.get(rel.type.id);
				if (!type) continue;
				// Require both endpoints to be in the current visible tree
				if (!cardPositions.has(rel.sourceCrId) || !cardPositions.has(rel.targetCrId)) continue;
				// As-of date filter: skip relationships whose from/to range excludes the selected date
				if (!this.relationshipActiveAtAsOfDate(rel)) continue;
				// Dedupe: canonicalize by sorted crId pair + canonical type id.
				// For inverse-type pairs that are both overlay-enabled (e.g. sire/childer,
				// mentor/disciple), use the alphabetically-first of the pair so both sides
				// collapse to a single line rather than rendering stacked identical strokes.
				const pairKey = [rel.sourceCrId, rel.targetCrId].sort().join('|');
				const canonicalTypeId = type.inverse && overlayTypes.has(type.inverse)
					? [type.id, type.inverse].sort()[0]
					: type.id;
				const dedupeKey = `${pairKey}|${canonicalTypeId}`;
				if (seen.has(dedupeKey)) continue;
				seen.add(dedupeKey);
				out.push({ rel, type });
			}
		}

		return out;
	}

	/**
	 * Check whether a relationship's date range contains the current as-of date.
	 * If no as-of date is set, returns true. If the relationship has no date range,
	 * also returns true (relationship is treated as always-active).
	 */
	private relationshipActiveAtAsOfDate(rel: ParsedRelationship): boolean {
		if (!this.asOfDate) return true;
		if (rel.from && this.compareDateStrings(rel.from, this.asOfDate) > 0) return false;
		if (rel.to && this.compareDateStrings(rel.to, this.asOfDate) < 0) return false;
		return true;
	}

	/**
	 * Format a relationship's date range for tooltip display.
	 */
	private formatRelationshipDateRange(rel: ParsedRelationship): string {
		if (!rel.from && !rel.to) return '';
		if (rel.from && rel.to) return `${rel.from} – ${rel.to}`;
		if (rel.from) return `from ${rel.from}`;
		return `until ${rel.to}`;
	}

	/**
	 * Toggle the master "Show custom relationships" overlay.
	 */
	private toggleCustomRelationships(): void {
		this.showCustomRelationships = !this.showCustomRelationships;
		this.app.workspace.requestSaveLayout();
		if (this.showCustomRelationships) {
			this.renderRelationshipOverlay();
		} else {
			this.clearRelationshipOverlayForUpdate();
		}
		new Notice(`Custom relationships ${this.showCustomRelationships ? 'shown' : 'hidden'}`);
	}

	/**
	 * Toggle visibility of a specific relationship type in the overlay.
	 */
	private toggleCustomRelationshipType(typeId: string): void {
		// Default is visible (true); toggle sets false / back to true
		const current = this.customRelationshipTypeVisibility[typeId] !== false;
		this.customRelationshipTypeVisibility = {
			...this.customRelationshipTypeVisibility,
			[typeId]: !current
		};
		this.app.workspace.requestSaveLayout();
		this.renderRelationshipOverlay();
	}

	// ─── Highlight Groups (#379) ───────────────────────────────────────

	/**
	 * Open the Highlight Groups modal.
	 */
	private openHighlightGroupsModal(): void {
		new HighlightGroupsModal(this.app, {
			getGroups: () => this.highlightGroups,
			saveGroups: (groups) => {
				this.highlightGroups = groups;
				this.app.workspace.requestSaveLayout();
				this.applyHighlightClasses();
			}
		}).open();
	}

	/**
	 * Schedule re-application of highlight classes after tree animation.
	 */
	private scheduleHighlightRerender(): void {
		if (this.hasActiveHighlights()) {
			setTimeout(() => this.applyHighlightClasses(), 1500);
		}
	}

	private hasActiveHighlights(): boolean {
		return this.highlightGroups.some(g => g.enabled && g.value.trim() !== '');
	}

	/**
	 * Apply per-card CSS classes for the highlight feature.
	 * Each card gets either cr-hl-match--{color} (if it matches a group) or
	 * cr-hl-dim (if any group is active and this card doesn't match).
	 * When no groups are active, all classes are removed.
	 */
	private applyHighlightClasses(): void {
		if (!this.chartContainerEl) return;

		const active = this.hasActiveHighlights();
		this.chartContainerEl.toggleClass('cr-hl-active', active);

		// Build a lookup: crId → PersonNode (for field values)
		const personMap = new Map<string, PersonNode>();
		for (const p of this.familyGraphService.getAllPeople()) {
			personMap.set(p.crId, p);
		}
		const groups = this.highlightGroups;

		d3.selectAll<Element, { data: { id: string } }>('.card_cont')
			.each(function(nodeData) {
				// Strip all previous highlight classes
				this.classList.remove('cr-hl-dim', 'cr-hl-match');
				for (const c of HIGHLIGHT_COLORS) {
					this.classList.remove(`cr-hl-match--${c.value}`);
				}

				if (!active) return;

				const personId = nodeData?.data?.id;
				if (!personId) return;
				const person = personMap.get(personId);
				if (!person) return;

				const match = firstMatchingGroup(person, groups);
				if (match) {
					this.classList.add('cr-hl-match');
					this.classList.add(`cr-hl-match--${match.color}`);
				} else {
					this.classList.add('cr-hl-dim');
				}
			});
	}

	/**
	 * Get card center positions by person ID
	 * Used to identify which people are connected by spouse links
	 */
	private getCardPositions(): Map<string, { x: number; y: number }> {
		const positions = new Map<string, { x: number; y: number }>();

		// Use D3 to get card positions with their bound data. SVG cards expose
		// translate() via the `transform` attribute (no units); HTML cards (used
		// by the circle card style) expose it via `style.transform` in px units.
		d3.selectAll<Element, { data: { id: string } }>('.card_cont')
			.each(function(nodeData) {
				if (!nodeData?.data?.id) return;

				const personId = nodeData.data.id;

				// Try SVG attribute first, then fall back to CSS style
				const transform = this.getAttribute('transform')
					|| (this as HTMLElement).style?.transform
					|| '';
				if (!transform) return;

				// Matches "translate(x, y)" or "translate(xpx, ypx)"
				const match = transform.match(/translate\(\s*([-\d.]+)(?:px)?\s*,\s*([-\d.]+)(?:px)?\s*\)/);
				if (!match) return;

				const x = parseFloat(match[1]);
				const y = parseFloat(match[2]);
				if (!isNaN(x) && !isNaN(y)) {
					positions.set(personId, { x, y });
				}
			});

		return positions;
	}

	/**
	 * Determine the spouse number for a link in multi-spouse scenarios (#195)
	 * Returns 1-based spouse index if this is a multi-spouse link, null otherwise
	 */
	private getSpouseNumberForLink(
		linkPath: SVGPathElement,
		cardPositions: Map<string, { x: number; y: number }>,
		personMap: Map<string, FamilyChartPerson>
	): number | null {
		// Get the link endpoints from the path
		const endpoints = this.getLinkEndpoints(linkPath);
		if (!endpoints) return null;

		// Find which persons are at each endpoint by matching positions
		const tolerance = 50; // Position matching tolerance in pixels
		let person1Id: string | null = null;
		let person2Id: string | null = null;

		for (const [personId, pos] of cardPositions) {
			const dist1 = Math.sqrt(
				Math.pow(pos.x - endpoints.start.x, 2) +
				Math.pow(pos.y - endpoints.start.y, 2)
			);
			const dist2 = Math.sqrt(
				Math.pow(pos.x - endpoints.end.x, 2) +
				Math.pow(pos.y - endpoints.end.y, 2)
			);

			if (dist1 < tolerance && !person1Id) {
				person1Id = personId;
			} else if (dist2 < tolerance && !person2Id) {
				person2Id = personId;
			}
		}

		if (!person1Id || !person2Id) return null;

		// Check if either person has multiple spouses
		const person1 = personMap.get(person1Id);
		const person2 = personMap.get(person2Id);

		if (!person1 || !person2) return null;

		// Find the "hub" person (the one with multiple spouses)
		let hubPerson: FamilyChartPerson | null = null;
		let spouseId: string | null = null;

		if (person1.rels.spouses.length > 1 && person1.rels.spouses.includes(person2Id)) {
			hubPerson = person1;
			spouseId = person2Id;
		} else if (person2.rels.spouses.length > 1 && person2.rels.spouses.includes(person1Id)) {
			hubPerson = person2;
			spouseId = person1Id;
		}

		if (!hubPerson || !spouseId) return null;

		// Return 1-based spouse index
		const spouseIndex = hubPerson.rels.spouses.indexOf(spouseId);
		return spouseIndex >= 0 ? spouseIndex + 1 : null;
	}

	/**
	 * Get the start and end points of a path element
	 */
	private getLinkEndpoints(path: SVGPathElement): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
		try {
			const pathLength = path.getTotalLength();
			if (pathLength === 0) return null;

			const start = path.getPointAtLength(0);
			const end = path.getPointAtLength(pathLength);

			return {
				start: { x: start.x, y: start.y },
				end: { x: end.x, y: end.y }
			};
		} catch {
			return null;
		}
	}

	/**
	 * Convert a number to a circled Unicode character (①, ②, ③, etc.)
	 * For numbers 1-20, uses Unicode circled numbers; for higher numbers, falls back to (N)
	 */
	private getCircledNumber(n: number): string {
		// Unicode circled numbers: ① is U+2460 (9312 decimal)
		if (n >= 1 && n <= 20) {
			return String.fromCharCode(9311 + n);
		}
		// Fallback for numbers > 20
		return `(${n})`;
	}

	/**
	 * Get the midpoint of an SVG path element
	 */
	private getPathMidpoint(path: SVGPathElement): { x: number; y: number } | null {
		try {
			const pathLength = path.getTotalLength();
			const midpoint = path.getPointAtLength(pathLength / 2);
			return { x: midpoint.x, y: midpoint.y };
		} catch {
			return null;
		}
	}

	/**
	 * Build display fields array based on current name and date options (#90)
	 * Each inner array is a line, with fields joined by space
	 */
	private buildDisplayFields(): string[][] {
		const displayFields: string[][] = [];

		// Name display: split mode puts given/surname on separate lines
		if (this.nameDisplayMode === 'split') {
			displayFields.push(['first name']);
			displayFields.push(['last name']);
		} else {
			displayFields.push(['first name', 'last name']);
		}

		// Alt name: only add if any person in the chart has one (#346)
		if (this.hasAltNames()) {
			displayFields.push(['alt name']);
		}

		// Identity-leaning descriptive fields (#374)
		if (this.showNickname) displayFields.push(['nickname']);
		if (this.showTitle) displayFields.push(['title']);
		if (this.showPronouns) displayFields.push(['pronouns']);

		// Add dates
		if (this.showBirthDates && this.showDeathDates) {
			displayFields.push(['birthday']);
			displayFields.push(['deathday']);
		} else if (this.showBirthDates) {
			displayFields.push(['birthday']);
		} else if (this.showDeathDates) {
			displayFields.push(['deathday']);
		}

		// Descriptive fields that are usually longer / secondary (#374)
		if (this.showOccupation) displayFields.push(['occupation']);
		if (this.showReligion) displayFields.push(['religion']);
		if (this.showCaste) displayFields.push(['caste']);

		return displayFields;
	}

	/**
	 * Check if any person in the current chart data has an alt_name
	 */
	private hasAltNames(): boolean {
		return this.chartData.some(p => !!(p.data['alt name']));
	}

	/**
	 * Calculate total content lines for card height calculation (#90)
	 */
	private calculateContentLines(): number {
		const nameLines = this.nameDisplayMode === 'split' ? 2 : 1;
		const altNameLine = this.hasAltNames() ? 1 : 0;
		const dateLines = (this.showBirthDates ? 1 : 0) + (this.showDeathDates ? 1 : 0);
		// Built-in descriptive field toggles (#374)
		const descriptiveLines =
			(this.showTitle ? 1 : 0) +
			(this.showOccupation ? 1 : 0) +
			(this.showNickname ? 1 : 0) +
			(this.showReligion ? 1 : 0) +
			(this.showCaste ? 1 : 0) +
			(this.showPronouns ? 1 : 0);
		return nameLines + altNameLine + dateLines + descriptiveLines;
	}

	/**
	 * Get card dimensions based on card style and content lines (#90)
	 */
	private getCardDimensions(style: CardStyle): { w: number; h: number; text_x: number; text_y: number; img_w: number; img_h: number; img_x: number; img_y: number } {
		const lines = this.calculateContentLines();

		switch (style) {
			case 'compact': {
				// Compact cards; optionally show a small avatar when enabled (#373)
				if (this.showAvatars) {
					const imgSize = 35;
					return {
						w: 180,
						h: Math.max(imgSize + 10, 35 + (lines - 1) * 15),
						text_x: imgSize + 10,
						text_y: 12,
						img_w: imgSize,
						img_h: imgSize,
						img_x: 5,
						img_y: 5
					};
				}
				return {
					w: 180,
					h: 35 + (lines - 1) * 15,
					text_x: 10,
					text_y: 12,
					img_w: 0,
					img_h: 0,
					img_x: 0,
					img_y: 0
				};
			}

			case 'mini': {
				// Mini cards; optionally show a small avatar when enabled (#373)
				if (this.showAvatars) {
					const imgSize = 25;
					return {
						w: 120,
						h: Math.max(imgSize + 10, 35 + (lines - 1) * 15),
						text_x: imgSize + 7,
						text_y: 10,
						img_w: imgSize,
						img_h: imgSize,
						img_x: 3,
						img_y: 5
					};
				}
				return {
					w: 120,
					h: 35 + (lines - 1) * 15,
					text_x: 5,
					text_y: 10,
					img_w: 0,
					img_h: 0,
					img_x: 0,
					img_y: 0
				};
			}

			case 'rectangle':
			default: {
				// Default: SVG cards with square avatars
				// Base: 2 lines = 70px, each additional line adds 20px
				// Avatar scales with card height
				const baseHeight = 70;
				const extraLines = Math.max(0, lines - 2);
				const h = baseHeight + extraLines * 20;
				const imgSize = Math.min(80, h - 10); // Avatar size scales with height, max 80px
				return {
					w: 200 + extraLines * 10,
					h,
					text_x: imgSize + 15,
					text_y: 12,
					img_w: imgSize,
					img_h: imgSize,
					img_x: 5,
					img_y: 5
				};
			}
		}
	}

	/**
	 * Minimum safe node spacing for the current card style (#373)
	 *
	 * The family-chart library uses node_separation as a center-to-center
	 * distance, so a spacing smaller than the card's width produces overlap.
	 * This floor keeps at least a small edge-to-edge gap regardless of which
	 * preset the user picks. Card width can grow with enabled content
	 * toggles (rectangle style adds 10px per extra line), so this value
	 * depends on the current display state.
	 */
	private getMinimumNodeSpacing(style: CardStyle): number {
		const cardWidth = this.getCardDimensions(style).w;
		return cardWidth + 20;
	}

	/**
	 * Minimum safe level (Y) spacing for the current card style and content
	 *
	 * As with X spacing, the family-chart library uses level_separation as a
	 * center-to-center distance. Enabling more card field toggles (#374)
	 * grows cards vertically, so the minimum safe spacing grows too.
	 */
	private getMinimumLevelSpacing(style: CardStyle): number {
		const cardHeight = this.getCardDimensions(style).h;
		return cardHeight + 20;
	}

	/**
	 * Default node spacing per card style (#373)
	 *
	 * Each style's default is chosen to leave a consistent edge-to-edge gap
	 * between siblings: spacing = card width + ~20px. This keeps compact and
	 * mini visibly tighter than rectangle rather than all three sharing the
	 * same 250px lane. Users can still override via the spacing menu.
	 */
	private getDefaultNodeSpacing(style: CardStyle): number {
		switch (style) {
			case 'compact': return 200;
			case 'mini': return 140;
			case 'circle':
			case 'rectangle':
			default: return 250;
		}
	}

	/**
	 * Update card display based on current options
	 */
	private updateCardDisplay(): void {
		if (!this.f3Chart || !this.f3Card) return;

		const displayFields = this.buildDisplayFields();

		// Update card display and dimensions based on card style
		this.f3Card.setCardDisplay(displayFields);

		// Update card dimensions for styles that support dynamic sizing
		if (this.cardStyle === 'rectangle' || this.cardStyle === 'compact' || this.cardStyle === 'mini') {
			this.f3Card.setCardDim(this.getCardDimensions(this.cardStyle));
		}

		// Toggling content fields (#374) can grow the card vertically past
		// the current level spacing, or horizontally past the current node
		// spacing. Re-clamp both so cards never overlap after a toggle.
		const minNodeSpacing = this.getMinimumNodeSpacing(this.cardStyle);
		if (this.nodeSpacing < minNodeSpacing) {
			this.nodeSpacing = minNodeSpacing;
			this.f3Chart.setCardXSpacing(this.nodeSpacing);
		}
		const minLevelSpacing = this.getMinimumLevelSpacing(this.cardStyle);
		if (this.levelSpacing < minLevelSpacing) {
			this.levelSpacing = minLevelSpacing;
			this.f3Chart.setCardYSpacing(this.levelSpacing);
		}

		// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
		this.f3Chart.updateTree({});
	}

	/**
	 * Set node (horizontal) spacing and refresh
	 *
	 * Clamped to `getMinimumNodeSpacing()` for the current card style so a
	 * user-picked preset can't collapse cards into each other (#373).
	 */
	private setNodeSpacing(spacing: number): void {
		const minSpacing = this.getMinimumNodeSpacing(this.cardStyle);
		const clamped = Math.max(spacing, minSpacing);
		this.nodeSpacing = clamped;
		if (this.f3Chart) {
			// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
			this.f3Chart.setCardXSpacing(clamped);
			this.f3Chart.updateTree({});
			if (clamped !== spacing) {
				new Notice(`Spacing clamped to ${clamped}px; ${this.cardStyle} cards need at least that to avoid overlap. Pick a smaller card style for a tighter tree.`);
			} else {
				new Notice(`Node spacing set to ${clamped}px`);
			}
		}
		// Trigger Obsidian to save view state
		this.app.workspace.requestSaveLayout();
	}

	/**
	 * Set level (vertical) spacing and refresh
	 *
	 * Clamped to `getMinimumLevelSpacing()` for the current card style and
	 * content so a user-picked preset can't collapse generations into each
	 * other (#374).
	 */
	private setLevelSpacing(spacing: number): void {
		const minSpacing = this.getMinimumLevelSpacing(this.cardStyle);
		const clamped = Math.max(spacing, minSpacing);
		this.levelSpacing = clamped;
		if (this.f3Chart) {
			// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
			this.f3Chart.setCardYSpacing(clamped);
			this.f3Chart.updateTree({});
			if (clamped !== spacing) {
				new Notice(`Level spacing clamped to ${clamped}px to fit the current card height. Toggle off some fields or pick a smaller card style to go tighter.`);
			} else {
				new Notice(`Level spacing set to ${clamped}px`);
			}
		}
		// Trigger Obsidian to save view state
		this.app.workspace.requestSaveLayout();
	}

	// ============ Edit Mode ============

	/**
	 * Toggle edit mode on/off
	 */
	private toggleEditMode(): void {
		this.editMode = !this.editMode;

		// Update button state
		if (this.editModeBtn) {
			this.editModeBtn.classList.toggle('is-active', this.editMode);
		}

		// Update container class for styling
		if (this.chartContainerEl) {
			this.chartContainerEl.classList.toggle('is-edit-mode', this.editMode);
		}

		logger.info('edit-mode', `Edit mode ${this.editMode ? 'enabled' : 'disabled'}`);

		// If edit mode is enabled, make sure EditTree is configured
		if (this.editMode && this.f3EditTree) {
			this.f3EditTree.setEdit();
		} else if (!this.editMode && this.f3EditTree) {
			this.f3EditTree.setNoEdit();
			this.f3EditTree.closeForm();
		}
	}

	/**
	 * Initialize EditTree for editing capabilities
	 */
	private initializeEditTree(): void {
		if (!this.f3Chart || !this.f3Card) return;

		logger.debug('edit-tree-init', 'Initializing EditTree');

		// Create EditTree instance
		// Note: We don't use setCardClickOpen() here because we have our own custom info panel
		// that handles editing. The EditTree is kept for its data management and export capabilities.
		this.f3EditTree = this.f3Chart.editTree()
			// Configure editable fields (still needed for data export structure)
			.setFields([
				{ type: 'text', label: 'First name', id: 'first name' },
				{ type: 'text', label: 'Last name', id: 'last name' },
				{ type: 'text', label: 'Birth date', id: 'birthday' },
				{ type: 'text', label: 'Death date', id: 'deathday' }
			])
			// Handle data changes for bidirectional sync
			.setOnChange(() => this.handleChartDataChange())
			// Custom submit handler for sync to markdown
			.setOnSubmit((e, datum, applyChanges, postSubmit) => {
				// Apply changes in family-chart first
				applyChanges();
				// Then sync to markdown
				void this.syncDatumToMarkdown(datum);
				// Complete the submission
				postSubmit();
			})
			// Custom delete handler
			.setOnDelete((datum, deletePerson, postSubmit) => {
				// Show confirmation modal
				const personName = `${datum.data['first name']} ${datum.data['last name']}`;
				new DeletePersonConfirmModal(this.app, personName, (confirmed) => {
					if (confirmed) {
						// Delete in family-chart
						deletePerson();
						// Note: actual file deletion would be a separate concern
						// For now, just remove from chart (file remains but relationships are cleaned)
						logger.info('edit-delete', 'Person deleted from chart', { id: datum.id });
						postSubmit({});
					}
				}).open();
			})
			// Start in no-edit mode (toggle button enables it)
			.setNoEdit();

		// If edit mode is already enabled, activate it
		if (this.editMode) {
			this.f3EditTree.setEdit();
		}

		logger.debug('edit-tree-init', 'EditTree initialized');
	}

	/**
	 * Handle data changes from the chart (bidirectional sync)
	 */
	private handleChartDataChange(): void {
		if (!this.f3EditTree || this.isSyncing) return;

		logger.debug('chart-change', 'Chart data changed, syncing to markdown');

		// Export the updated data
		const updatedData = this.f3EditTree.exportData();

		// The onChange fires on any edit, we'll handle the actual sync
		// in the onSubmit handler for individual changes
		logger.debug('chart-change', 'Data exported', { count: Array.isArray(updatedData) ? updatedData.length : 0 });

		// Update history buttons state
		this.updateHistoryButtons();
	}

	/**
	 * Sync a single datum (person) to their markdown file
	 */
	private async syncDatumToMarkdown(datum: { id: string; data: Record<string, unknown>; rels?: { parents?: string[]; spouses?: string[]; children?: string[] } }): Promise<void> {
		if (this.isSyncing) return;

		this.isSyncing = true;

		try {
			const crId = datum.id;
			logger.debug('sync-to-md', 'Syncing datum to markdown', { crId, data: datum.data });

			// Find the file for this person
			const files = this.app.vault.getMarkdownFiles();
			let targetFile: TFile | null = null;

			for (const file of files) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.frontmatter?.cr_id === crId) {
					targetFile = file;
					break;
				}
			}

			if (!targetFile) {
				logger.warn('sync-to-md', 'Could not find file for person', { crId });
				return;
			}

			// Read current content
			const content = await this.app.vault.read(targetFile);

			// Parse frontmatter
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
			if (!frontmatterMatch) {
				logger.warn('sync-to-md', 'No frontmatter found in file', { path: targetFile.path });
				return;
			}

			const frontmatterContent = frontmatterMatch[1];
			const bodyContent = content.slice(frontmatterMatch[0].length);

			// Build updated frontmatter
			const updatedFrontmatter = this.buildUpdatedFrontmatter(frontmatterContent, datum);

			// Write back to file
			const newContent = `---\n${updatedFrontmatter}\n---${bodyContent}`;
			await this.app.vault.modify(targetFile, newContent);

			logger.info('sync-to-md', 'Successfully synced frontmatter', { path: targetFile.path });

			// Check if file should be renamed based on name change
			const firstName = (datum.data['first name'] as string) || '';
			const lastName = (datum.data['last name'] as string) || '';
			const newFullName = `${firstName} ${lastName}`.trim();

			if (newFullName) {
				// Sanitize the new name for use as filename
				const sanitizedName = this.sanitizeFilename(newFullName);
				const currentBasename = targetFile.basename;

				if (sanitizedName && sanitizedName !== currentBasename) {
					// Build new path preserving the directory
					const directory = targetFile.parent?.path || '';
					const newPath = directory ? `${directory}/${sanitizedName}.md` : `${sanitizedName}.md`;

					// Check if target file already exists
					const existingFile = this.app.vault.getAbstractFileByPath(newPath);
					if (existingFile) {
						logger.warn('sync-to-md', 'Cannot rename: file already exists', { newPath });
					} else {
						await this.app.vault.rename(targetFile, newPath);
						logger.info('sync-to-md', 'Renamed file', { from: targetFile.path, to: newPath });
					}
				}
			}

		} catch (error) {
			logger.error('sync-to-md', 'Failed to sync datum to markdown', { error });
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Build updated frontmatter content from datum data
	 */
	private buildUpdatedFrontmatter(currentFrontmatter: string, datum: { data: Record<string, unknown>; rels?: { parents?: string[]; spouses?: string[]; children?: string[] } }): string {
		const lines = currentFrontmatter.split('\n');
		const updatedLines: string[] = [];
		const processedKeys = new Set<string>();

		// Combine first and last name
		const firstName = (datum.data['first name'] as string) || '';
		const lastName = (datum.data['last name'] as string) || '';
		const fullName = `${firstName} ${lastName}`.trim();

		// Process existing lines
		for (const line of lines) {
			const keyMatch = line.match(/^(\w+):/);
			if (keyMatch) {
				const key = keyMatch[1];
				processedKeys.add(key);

				// Update name
				if (key === 'name') {
					updatedLines.push(`name: "${fullName}"`);
					continue;
				}

				// Update birth_date
				if (key === 'birth_date') {
					const birthDate = datum.data['birthday'] as string;
					if (birthDate) {
						updatedLines.push(`birth_date: "${birthDate}"`);
					} else {
						updatedLines.push(line); // Keep original if no value
					}
					continue;
				}

				// Update death_date
				if (key === 'death_date') {
					const deathDate = datum.data['deathday'] as string;
					if (deathDate) {
						updatedLines.push(`death_date: "${deathDate}"`);
					} else {
						updatedLines.push(line);
					}
					continue;
				}

				// Update sex
				if (key === 'sex') {
					const sex = datum.data['gender'] as string; // family-chart uses 'gender' internally
					if (sex) {
						const sexValue = sex === 'F' ? 'female' : 'male';
						updatedLines.push(`sex: ${sexValue}`);
					} else {
						updatedLines.push(line);
					}
					continue;
				}

				// Update alt_name (#351)
				if (key === 'alt_name') {
					const altName = datum.data['alt name'] as string;
					if (altName) {
						updatedLines.push(`alt_name: ${altName}`);
					}
					// Remove property if cleared
					continue;
				}

				// Update pronouns (#351)
				if (key === 'pronouns') {
					const pronouns = datum.data['pronouns'] as string;
					if (pronouns) {
						updatedLines.push(`pronouns: ${pronouns}`);
					}
					continue;
				}

				// Update occupation (#351)
				if (key === 'occupation') {
					const occupation = datum.data['occupation'] as string;
					if (occupation) {
						updatedLines.push(`occupation: "${occupation}"`);
					}
					continue;
				}

				// Update birth_place (#351)
				if (key === 'birth_place') {
					const birthPlace = datum.data['birth place'] as string;
					if (birthPlace) {
						updatedLines.push(`birth_place: "${birthPlace}"`);
					}
					continue;
				}

				// Update death_place (#351)
				if (key === 'death_place') {
					const deathPlace = datum.data['death place'] as string;
					if (deathPlace) {
						updatedLines.push(`death_place: "${deathPlace}"`);
					}
					continue;
				}

				// Update research_level (#351)
				if (key === 'research_level') {
					const rl = datum.data['research level'] as string;
					if (rl) {
						updatedLines.push(`research_level: ${rl}`);
					}
					continue;
				}

				// Update collection (#351)
				if (key === 'collection') {
					const coll = datum.data['collection'] as string;
					if (coll) {
						updatedLines.push(`collection: "${coll}"`);
					}
					continue;
				}
			}

			// Keep other lines unchanged
			updatedLines.push(line);
		}

		// Add new properties if they don't exist
		if (!processedKeys.has('name') && fullName) {
			updatedLines.push(`name: "${fullName}"`);
		}

		const birthDate = datum.data['birthday'] as string;
		if (!processedKeys.has('birth_date') && birthDate) {
			updatedLines.push(`birth_date: "${birthDate}"`);
		}

		const deathDate = datum.data['deathday'] as string;
		if (!processedKeys.has('death_date') && deathDate) {
			updatedLines.push(`death_date: "${deathDate}"`);
		}

		// Add new properties if they don't exist (#351)
		const altName = datum.data['alt name'] as string;
		if (!processedKeys.has('alt_name') && altName) {
			updatedLines.push(`alt_name: ${altName}`);
		}

		const pronouns = datum.data['pronouns'] as string;
		if (!processedKeys.has('pronouns') && pronouns) {
			updatedLines.push(`pronouns: ${pronouns}`);
		}

		const occupation = datum.data['occupation'] as string;
		if (!processedKeys.has('occupation') && occupation) {
			updatedLines.push(`occupation: "${occupation}"`);
		}

		const birthPlace = datum.data['birth place'] as string;
		if (!processedKeys.has('birth_place') && birthPlace) {
			updatedLines.push(`birth_place: "${birthPlace}"`);
		}

		const deathPlace = datum.data['death place'] as string;
		if (!processedKeys.has('death_place') && deathPlace) {
			updatedLines.push(`death_place: "${deathPlace}"`);
		}

		const researchLevel = datum.data['research level'] as string;
		if (!processedKeys.has('research_level') && researchLevel) {
			updatedLines.push(`research_level: ${researchLevel}`);
		}

		const collection = datum.data['collection'] as string;
		if (!processedKeys.has('collection') && collection) {
			updatedLines.push(`collection: "${collection}"`);
		}

		return updatedLines.join('\n');
	}

	/**
	 * Sanitize a string for use as a filename
	 * Removes/replaces characters that are invalid in filenames
	 */
	private sanitizeFilename(name: string): string {
		// Replace characters that are invalid in filenames on most OS
		// Windows: \ / : * ? " < > |
		// Also replace # and ^ which can cause issues in Obsidian
		return name
			.replace(/[\\/:*?"<>|#^]/g, '')
			.replace(/\s+/g, ' ')  // Collapse multiple spaces
			.trim();
	}

	/**
	 * Sync filename to frontmatter name property when file is renamed
	 */
	private async syncFilenameToFrontmatter(file: TFile): Promise<void> {
		if (this.isSyncing) return;

		this.isSyncing = true;

		try {
			const newName = file.basename;
			logger.debug('sync-filename', 'Syncing filename to frontmatter', { filename: newName });

			// Read current content
			const content = await this.app.vault.read(file);

			// Parse frontmatter
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
			if (!frontmatterMatch) {
				logger.warn('sync-filename', 'No frontmatter found in file', { path: file.path });
				return;
			}

			const frontmatterContent = frontmatterMatch[1];
			const bodyContent = content.slice(frontmatterMatch[0].length);

			// Check if name property exists and differs
			const nameMatch = frontmatterContent.match(/^name:\s*["']?(.+?)["']?\s*$/m);
			const currentName = nameMatch ? nameMatch[1] : '';

			if (currentName === newName) {
				logger.debug('sync-filename', 'Name already matches filename', { name: newName });
				return;
			}

			// Update name in frontmatter
			let updatedFrontmatter: string;
			if (nameMatch) {
				// Replace existing name
				updatedFrontmatter = frontmatterContent.replace(
					/^name:\s*["']?.+?["']?\s*$/m,
					`name: "${newName}"`
				);
			} else {
				// Add name property at the beginning
				updatedFrontmatter = `name: "${newName}"\n${frontmatterContent}`;
			}

			// Write back to file
			const newContent = `---\n${updatedFrontmatter}\n---${bodyContent}`;
			await this.app.vault.modify(file, newContent);

			logger.info('sync-filename', 'Successfully synced filename to frontmatter', { path: file.path, name: newName });

		} catch (error) {
			logger.error('sync-filename', 'Failed to sync filename to frontmatter', { error });
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Check if the view is currently in a sidebar
	 */
	private isInSidebar(): boolean {
		const root = this.leaf.getRoot();
		// Check if we're in left or right sidebar by checking the root type
		// Sidebar roots have different types than the main workspace root
		return root !== this.app.workspace.rootSplit;
	}

	/**
	 * Move this view from sidebar to main workspace
	 */
	private popOutToMainWorkspace(): void {
		void this.plugin.moveFamilyChartToMainWorkspace(this.leaf);
	}

	/**
	 * Destroy the chart instance and clean up
	 */
	private destroyChart(): void {
		// Clean up EditTree
		if (this.f3EditTree) {
			this.f3EditTree.destroy();
			this.f3EditTree = null;
		}

		// Disconnect transform sanitizer
		this.transformObserver?.disconnect();
		this.transformObserver = null;

		// family-chart doesn't have an explicit destroy method
		// Clean up by clearing the container
		if (this.chartContainerEl) {
			this.chartContainerEl.empty();
		}
		this.f3Chart = null;
		this.f3Card = null;
		this.chartData = [];
	}

	/**
	 * Register event handlers for vault changes
	 */
	private registerEventHandlers(): void {
		// Listen for metadata changes (fires after frontmatter is parsed)
		this.registerEvent(
			this.app.metadataCache.on('changed', (file: TFile) => {
				if (file.extension !== 'md') return;

				// Check if this is a person note
				const cache = this.app.metadataCache.getFileCache(file);
				if (!cache?.frontmatter?.cr_id) return;

				// Debounce rapid changes
				this.scheduleRefresh();
			})
		);

		// Listen for file deletions
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.scheduleRefresh();
				}
			})
		);

		// Listen for file renames to update chart with new names
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'md') {
					// Check if this is a person note
					const cache = this.app.metadataCache.getFileCache(file);
					if (cache?.frontmatter?.cr_id) {
						logger.debug('file-rename', 'Person note renamed', { oldPath, newPath: file.path });
						// Update frontmatter name to match new filename
						void this.syncFilenameToFrontmatter(file);
						this.scheduleRefresh();
					}
				}
			})
		);

		// Listen for active leaf changes to handle deferred refreshes when view becomes visible
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf === this.leaf) {
					// This view became active - check for pending refresh
					this.handleViewVisible();
				}
			})
		);
	}

	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Check if the chart container is visible and has valid dimensions
	 */
	private isChartVisible(): boolean {
		if (!this.chartContainerEl) return false;
		const rect = this.chartContainerEl.getBoundingClientRect();
		// Container must have non-zero dimensions to be considered visible
		return rect.width > 0 && rect.height > 0;
	}

	/**
	 * Schedule a debounced refresh
	 * If the chart is not visible, defers the refresh until the view becomes visible again
	 */
	private scheduleRefresh(): void {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refreshTimeout = null;

			// If chart isn't visible, defer the refresh
			if (!this.isChartVisible()) {
				logger.debug('refresh', 'Chart not visible, deferring refresh');
				this.pendingRefresh = true;
				return;
			}

			void this.refreshChart();
		}, 500);
	}

	/**
	 * Handle when view becomes visible again (e.g., user switches back to this tab)
	 * Performs any deferred refresh
	 */
	private handleViewVisible(): void {
		if (this.pendingRefresh) {
			logger.debug('refresh', 'View became visible, performing deferred refresh');
			this.pendingRefresh = false;
			void this.refreshChart();
		}
	}

	// ============ State Persistence ============

	getState(): FamilyChartViewState {
		logger.debug('get-state', 'Saving view state', { cardStyle: this.cardStyle, nodeSpacing: this.nodeSpacing, levelSpacing: this.levelSpacing });
		return {
			rootPersonId: this.rootPersonId,
			colorScheme: this.colorScheme,
			editMode: this.editMode,
			nodeSpacing: this.nodeSpacing,
			levelSpacing: this.levelSpacing,
			showBirthDates: this.showBirthDates,
			showDeathDates: this.showDeathDates,
			showKinshipLabels: this.showKinshipLabels,
			showCustomRelationships: this.showCustomRelationships,
			customRelationshipTypeVisibility: this.customRelationshipTypeVisibility,
			highlightGroups: this.highlightGroups,
			showAvatars: this.showAvatars,
			isHorizontal: this.isHorizontal,
			ancestryDepth: this.ancestryDepth,
			progenyDepth: this.progenyDepth,
			showSiblingsOfMain: this.showSiblingsOfMain,
			showSingleParentEmptyCard: this.showSingleParentEmptyCard,
			sortChildrenByBirthDate: this.sortChildrenByBirthDate,
			sortSpousesByMarriageDate: this.sortSpousesByMarriageDate,
			asOfDate: this.asOfDate,
			hidePrivateLiving: this.hidePrivateLiving,
			cardStyle: this.cardStyle,
			nameDisplayMode: this.nameDisplayMode,
			showTitle: this.showTitle,
			showOccupation: this.showOccupation,
			showNickname: this.showNickname,
			showReligion: this.showReligion,
			showCaste: this.showCaste,
			showPronouns: this.showPronouns,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- Base class requires Promise<void> return type
	async setState(state: Partial<FamilyChartViewState>): Promise<void> {
		logger.debug('set-state', 'Restoring view state', state);
		logger.debug('set-state', 'Spacing values', { nodeSpacing: state.nodeSpacing, levelSpacing: state.levelSpacing });
		logger.debug('set-state', 'Incoming cardStyle', { stateCardStyle: state.cardStyle, currentCardStyle: this.cardStyle });

		if (state.rootPersonId !== undefined) {
			this.rootPersonId = state.rootPersonId;
		}
		if (state.colorScheme !== undefined) {
			this.colorScheme = state.colorScheme;
		}
		if (state.editMode !== undefined) {
			this.editMode = state.editMode;
		}
		if (state.nodeSpacing !== undefined) {
			this.nodeSpacing = state.nodeSpacing;
		}
		if (state.levelSpacing !== undefined) {
			this.levelSpacing = state.levelSpacing;
		}
		if (state.showBirthDates !== undefined) {
			this.showBirthDates = state.showBirthDates;
		}
		if (state.showDeathDates !== undefined) {
			this.showDeathDates = state.showDeathDates;
		}
		if (state.showKinshipLabels !== undefined) {
			this.showKinshipLabels = state.showKinshipLabels;
		}
		if (state.showCustomRelationships !== undefined) {
			this.showCustomRelationships = state.showCustomRelationships;
		}
		if (state.customRelationshipTypeVisibility !== undefined) {
			this.customRelationshipTypeVisibility = state.customRelationshipTypeVisibility;
		}
		if (state.highlightGroups !== undefined) {
			this.highlightGroups = state.highlightGroups;
		}
		if (state.showAvatars !== undefined) {
			this.showAvatars = state.showAvatars;
		}
		if (state.isHorizontal !== undefined) {
			this.isHorizontal = state.isHorizontal;
		}
		if (state.ancestryDepth !== undefined) {
			this.ancestryDepth = state.ancestryDepth;
		}
		if (state.progenyDepth !== undefined) {
			this.progenyDepth = state.progenyDepth;
		}
		if (state.showSiblingsOfMain !== undefined) {
			this.showSiblingsOfMain = state.showSiblingsOfMain;
		}
		if (state.showSingleParentEmptyCard !== undefined) {
			this.showSingleParentEmptyCard = state.showSingleParentEmptyCard;
		}
		if (state.sortChildrenByBirthDate !== undefined) {
			this.sortChildrenByBirthDate = state.sortChildrenByBirthDate;
		}
		if (state.sortSpousesByMarriageDate !== undefined) {
			this.sortSpousesByMarriageDate = state.sortSpousesByMarriageDate;
		}
		if (state.asOfDate !== undefined) {
			this.asOfDate = state.asOfDate;
		}
		if (state.hidePrivateLiving !== undefined) {
			this.hidePrivateLiving = state.hidePrivateLiving;
		}
		if (state.cardStyle !== undefined) {
			this.cardStyle = state.cardStyle;
			logger.debug('set-state', 'cardStyle set to', { cardStyle: this.cardStyle });
		}
		if (state.nameDisplayMode !== undefined) {
			this.nameDisplayMode = state.nameDisplayMode;
		}
		if (state.showTitle !== undefined) {
			this.showTitle = state.showTitle;
		}
		if (state.showOccupation !== undefined) {
			this.showOccupation = state.showOccupation;
		}
		if (state.showNickname !== undefined) {
			this.showNickname = state.showNickname;
		}
		if (state.showReligion !== undefined) {
			this.showReligion = state.showReligion;
		}
		if (state.showCaste !== undefined) {
			this.showCaste = state.showCaste;
		}
		if (state.showPronouns !== undefined) {
			this.showPronouns = state.showPronouns;
		}

		// Clamp restored spacing to the minimum safe values for the restored
		// card style and display toggles, in case a stale state would cause
		// card overlap (#373, #374).
		this.nodeSpacing = Math.max(this.nodeSpacing, this.getMinimumNodeSpacing(this.cardStyle));
		this.levelSpacing = Math.max(this.levelSpacing, this.getMinimumLevelSpacing(this.cardStyle));

		// Re-initialize chart if the view is already open (chartContainerEl exists)
		// If called before onOpen(), the state is just stored and onOpen() will use it
		if (this.chartContainerEl) {
			if (this.rootPersonId) {
				void this.initializeChart();
			} else {
				this.showEmptyState();
			}
		}
	}

	// ============ Pane Menu ============

	onPaneMenu(menu: Menu, source: string): void {
		menu.addItem((item) => {
			item.setTitle('Refresh chart')
				.setIcon('refresh-cw')
				.onClick(() => void this.refreshChart());
		});

		menu.addItem((item) => {
			item.setTitle('Select person')
				.setIcon('user')
				.onClick(() => void this.promptSelectPerson());
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle('Duplicate in new tab')
				.setIcon('copy')
				.onClick(() => void this.duplicateView());
		});

		menu.addSeparator();

		super.onPaneMenu(menu, source);
	}

	/**
	 * Duplicate this view in a new tab with the same root person
	 */
	private async duplicateView(): Promise<void> {
		// Open a new family chart view with the same root person
		await this.plugin.activateFamilyChartView(this.rootPersonId || undefined, true, true);
	}

	// ============ Public API ============

	/**
	 * Set the root person and refresh the chart
	 */
	setRootPerson(crId: string): void {
		this.rootPersonId = crId;
		void this.initializeChart();
	}
}
