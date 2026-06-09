/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Interactive Family Chart View
 *
 * An Obsidian ItemView that renders the family-chart library for interactive
 * exploration and editing of family trees.
 */

import { ItemView, WorkspaceLeaf, Menu, TFile, Notice, setIcon } from 'obsidian';
import f3 from 'family-chart';
import * as d3 from 'd3';

import type CanvasRootsPlugin from '../../../main';
import { FamilyGraphService, PersonNode } from '../../core/family-graph';
import type { ColorScheme, FamilyChartColors } from '../../settings';
import { getLogger } from '../../core/logging';
import { addSourceToPersonNote } from '../../plugin/context-menu-helpers';
import { getCroppedImageUrl } from '../../core/crop-renderer';
import { PersonPickerModal } from '../person-picker';
import { PlacePickerModal, type SelectedPlaceInfo } from '../place-picker';
import { AddRelationshipModal } from '../add-relationship-modal';
import { getAllRelationshipTypesWithCustomizations } from '../../relationships/constants/default-relationship-types';
import { RelationshipService } from '../../relationships/services/relationship-service';
import type { ParsedRelationship, RelationshipTypeDefinition } from '../../relationships/types/relationship-types';
import { FamilyChartExportWizard } from './family-chart-export-wizard';
import { DeletePersonConfirmModal, FamilyChartStyleModal, HighlightGroupsModal } from './family-chart-view-modals';
import { stripDateTimeSuffix } from '../../dates/utils/date-display';
import { shouldPaintOverlayUnderLinks } from './family-chart-overlay-z';
import { wrapNameToTwoLines } from './family-chart-name-wrap';
import { effectiveCardSpacing } from './family-chart-spacing';
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
import { arePersonsSpouses } from './family-chart-kinship';
import { pluralize } from '../../utils/format-utils';
import { unwrapWikilinkDisplay } from '../../utils/wikilink-resolver';
import { ensureVisibleLineColor } from '../../utils/color-contrast';

const logger = getLogger('FamilyChartView');

// Overlay types that map directly onto a structural parent-child link in the
// tree. When enabled, we restyle the existing structural link with the
// overlay's color / dash pattern instead of drawing a separate arc, so the
// viewer sees one expressive line rather than two parallel ones (#404).
const STRUCTURAL_COUNTERPART_TYPES = new Set<string>([
	'adoptive_parent', 'adopted_child',
	'step_parent', 'step_child',
	'foster_parent', 'foster_child'
]);

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
	// Content-driven card width (#669 follow-up). After a render, the widest
	// rendered line is measured and, if it exceeds the style's fixed base
	// width, this override widens the (uniform) card so long names and the
	// descriptive toggle fields are no longer clipped. null = use base width.
	private contentCardWidth: number | null = null;
	// Width last pushed to the f3 card dimension, to skip no-op re-renders.
	private appliedCardWidth: number | null = null;
	// Name display mode: full (single line) or split (given/surname on separate lines) (#90)
	private nameDisplayMode: NameDisplayMode = 'full';
	// Whether any card's full name overflowed and was wrapped to a second line
	// (#671). Set by `prepareNameWrapping()` each rebuild; when true the shared
	// display template carries `cr_name_1` / `cr_name_2` instead of the single
	// name line and `calculateContentLines()` reserves the extra line.
	private nameWrapActive: boolean = false;
	// Built-in descriptive field toggles on the in-tree card (#374)
	private showTitle: boolean = false;
	private showOccupation: boolean = false;
	private showNickname: boolean = false;
	private showReligion: boolean = false;
	private showCaste: boolean = false;
	private showPronouns: boolean = false;

	// family-chart instances
	private f3Chart: ReturnType<typeof f3.createChart> | null = null;
	// All card styles use the SVG card renderer (#669 moved 'circle' off the
	// HTML renderer, which never drew the connection-indicator bubbles).
	private f3Card: ReturnType<ReturnType<typeof f3.createChart>['setCardSvg']>
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
		return 'Family Chart';
	}

	getIcon(): string {
		return 'git-fork';
	}

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
			this.createInfoField(fieldsSection, 'Birth place', unwrapWikilinkDisplay(personData.data['birth place'] as string));
		}

		// Death place (#351)
		if (personData.data['death place']) {
			this.createInfoField(fieldsSection, 'Death place', unwrapWikilinkDisplay(personData.data['death place'] as string));
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
			void placeGraph.reloadCache();
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
			// Keep `_display` mirrors in sync so the card re-renders with
			// any updated tiebreak time stripped (#590).
			this.chartData[personIndex].data['birthday_display'] = stripDateTimeSuffix(this.infoPanelEditData.birthDate);
			this.chartData[personIndex].data['deathday_display'] = stripDateTimeSuffix(this.infoPanelEditData.deathDate);
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
		instructions.createEl('p', { text: 'To view a Family Chart:' });

		const list = instructions.createEl('ul');
		list.createEl('li', { text: 'Choose a person from the list below, or' });
		list.createEl('li', { text: 'Open a person note (with cr_id property) and run "Open Family Chart"' });

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

		// Start each rebuild at the style's base width; refitCardWidth widens
		// from the freshly measured content after the initial render (#669).
		this.contentCardWidth = null;
		this.appliedCardWidth = null;

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
		const isDarkMode = activeDocument.body.classList.contains('theme-dark');
		const customColors = this.plugin.settings.familyChartColors;

		// Set CSS variables - family-chart relies on these for card colors
		// Use custom colors if set, otherwise use defaults
		const backgroundColor = isDarkMode
			? (customColors?.backgroundDark ?? 'rgb(33, 33, 33)')
			: (customColors?.backgroundLight ?? 'rgb(250, 250, 250)');
		const textColor = isDarkMode
			? (customColors?.textDark ?? '#fff')
			: (customColors?.textLight ?? '#333');
		this.chartContainerEl.setCssProps({
			'--female-color': customColors?.femaleColor ?? 'rgb(196, 138, 146)',
			'--male-color': customColors?.maleColor ?? 'rgb(120, 159, 172)',
			'--genderless-color': customColors?.unknownColor ?? 'rgb(140, 140, 140)',
			'--background-color': backgroundColor,
			'--text-color': textColor,
			// #668: keep connector lines visible when the theme's text colour
			// matches the background (e.g. High Contrast dark = black on black).
			'--link-color': ensureVisibleLineColor(textColor, backgroundColor)
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
			// Measure names and wrap any that overflow before sizing (#671): the
			// wrap decision adds a name line, which feeds the height / spacing
			// floors computed just below via calculateContentLines.
			this.prepareNameWrapping();

			// Apply the style's minimum-spacing floor as the effective spacing,
			// keeping the user's saved preference intact so the tree re-compacts
			// toward it when cards shrink again (#669 follow-up).
			const effectiveNodeSpacing = effectiveCardSpacing(this.nodeSpacing, this.getMinimumNodeSpacing(this.cardStyle));
			const effectiveLevelSpacing = effectiveCardSpacing(this.levelSpacing, this.getMinimumLevelSpacing(this.cardStyle));

			// Create the chart with normal transition time
			logger.debug('init-chart', 'Creating chart with spacing', { nodeSpacing: this.nodeSpacing, levelSpacing: this.levelSpacing, effectiveNodeSpacing, effectiveLevelSpacing });
			this.f3Chart = f3.createChart(this.chartContainerEl, this.chartData as Parameters<typeof f3.createChart>[1])
				.setTransitionTime(800)
				.setCardXSpacing(effectiveNodeSpacing)
				.setCardYSpacing(effectiveLevelSpacing)
				// Clear overlays before any tree update to prevent stale rendering (#195, #386)
				// This handles all update sources: mini-tree buttons, navigation, spacing changes, etc.
				.setBeforeUpdate(() => {
					this.clearKinshipLabelsForUpdate();
					this.clearRelationshipOverlayForUpdate();
				})
				// Re-render overlays after tree animation completes (#195, #386, #379)
				.setAfterUpdate(() => {
					// Re-assert the round-avatar clip first: f3's fit-to-view (and
					// other re-renders) can drop a per-card clip, which is what
					// turned Circle avatars back into squares in a pop-out window
					// (#677). The per-card onCardUpdate hook also sets it, but
					// position-only updates like fit may not re-run that hook.
					this.reapplyCircleAvatarClips();
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

			// Apply sort children by birth date. Matches the universe-aware
			// canonical-year compare used by the other four sibling-sort
			// surfaces (#586/#587/#590), with the same lex-string tiebreak
			// for twins/triplets carrying ISO 8601 time components. The
			// previous straight localeCompare was fictional-blind (BBY/EF/DE
			// dates sorted lexically rather than chronologically) and missed
			// the #590 tiebreak (#605).
			if (this.sortChildrenByBirthDate) {
				this.f3Chart.setSortChildrenFunction((a, b) => {
					const aBirthday = (a.data?.birthday as string | undefined) || '';
					const bBirthday = (b.data?.birthday as string | undefined) || '';
					if (!aBirthday && !bBirthday) return 0;
					if (!aBirthday) return 1; // No date goes last
					if (!bBirthday) return -1;
					const dateService = this.plugin.getDateService();
					if (dateService) {
						const focalUniverse = this.rootPersonId
							? this.familyGraphService.getPersonByCrId(this.rootPersonId)?.universe
							: undefined;
						const aYear = dateService.getCanonicalYear(aBirthday, focalUniverse);
						const bYear = dateService.getCanonicalYear(bBirthday, focalUniverse);
						if (aYear !== null && bYear !== null && aYear !== bYear) {
							return aYear - bYear;
						}
					}
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
					// SVG cards with a round avatar (#669). Uses the same native SVG
					// card renderer as the other styles so the connection-indicator
					// bubbles and the image placeholder render; the avatar is clipped
					// to a circle via CSS (`.card-style-circle .card_image`). The old
					// HTML-card path skipped both because the HTML renderer never drew
					// the f3 `card_family_tree` toggles.
					this.f3Card = this.f3Chart.setCardSvg()
						.setCardDisplay(displayFields)
						.setCardDim(this.getCardDimensions('circle'))
						.setOnCardClick((e, d) => this.handleCardClick(e, d))
						.setOnCardUpdate(this.createOpenNoteButtonCallback());
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

			// Widen cards to fit their longest line before the deferred fit runs,
			// while the container is still hidden — no visible reflow (#669).
			this.refitCardWidth();

			// Defer positioning operation until container dimensions are stable
			window.setTimeout(() => {
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
					window.setTimeout(() => {
						if (this.chartContainerEl) {
							this.chartContainerEl.setCssStyles({ visibility: 'visible' });
							loadingOverlay.remove();
						}
					}, 850);
				}
			}, 50);

			// Initial kinship-label render is driven by the setAfterUpdate
			// callback (line ~1248) which schedules a stability-polled render
			// via scheduleKinshipLabelRerender (#619). No explicit setTimeout
			// here — that path would fire before card positions are stable,
			// snapshotting mid-animation SVG path coordinates and producing
			// labels that overlap cards until the next refresh.
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

		// Defensive symmetry pass (#575). family-chart requires every claimed
		// relationship to be reciprocated by the other side; asymmetric data
		// (e.g., a child with father_id pointing at a parent whose own
		// children list doesn't include them, often produced by interrupted
		// writes or sync conflicts) can freeze the library's tree
		// construction in an internal loop that no surrounding try-catch can
		// recover from. Drop unreciprocated references before they reach
		// f3.createChart, and log warnings so the data shape can be
		// inspected via the Data Quality view later.
		this.dropAsymmetricRelationships();

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
				// Check for crop region (#354, flat form #683)
				const cache = this.app.metadataCache.getFileCache(person.file);
				const cropForThumb = cache?.frontmatter
					? mediaService.parseMediaCrops(cache.frontmatter).get(thumbnailFile.name)
					: undefined;

				if (cropForThumb) {
					// Await crop generation so the cropped URL is in cache before chart renders
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
				// Keep `birthday` / `deathday` raw so the edit panel,
				// privacy-filter, and not-yet-born check see the original
				// string (including any `T HH:MM[:SS]` tiebreak suffix).
				// `birthday_display` / `deathday_display` are the time-
				// stripped variants used by the card-text display fields
				// in `buildDisplayFields()` (#590).
				birthday: person.birthDate,
				deathday: person.deathDate,
				'birthday_display': stripDateTimeSuffix(person.birthDate),
				'deathday_display': stripDateTimeSuffix(person.deathDate),
				avatar,
				'alt name': unwrapWikilinkDisplay(person.altName),
				'pronouns': Array.isArray(person.pronouns) ? person.pronouns.join(', ') : (person.pronouns || ''),
				'occupation': unwrapWikilinkDisplay(person.occupation),
				'title': unwrapWikilinkDisplay(person.title),
				'nickname': unwrapWikilinkDisplay(person.nickname),
				'religion': unwrapWikilinkDisplay(person.religion),
				'caste': unwrapWikilinkDisplay(person.caste),
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
	 * Strict bidirectional sanitization for chartData (#575).
	 *
	 * family-chart's internal tree construction can freeze (infinite loop,
	 * not a throw) when asymmetric relationship data reaches it — e.g., a
	 * person whose `rels.parents` lists P but P's `rels.children` doesn't
	 * include them. The transformPersonNode pass already filters the children
	 * direction; this method completes the symmetry by walking every node
	 * and dropping any parent / child / spouse reference the other side
	 * doesn't mirror.
	 *
	 * Warnings are logged so the source data shape can be reviewed via the
	 * Data Quality view (a future enhancement) or by inspecting the console.
	 */
	private dropAsymmetricRelationships(): void {
		const nodeById = new Map(this.chartData.map(n => [n.id, n]));
		let dropped = 0;

		for (const node of this.chartData) {
			node.rels.parents = node.rels.parents.filter(parentId => {
				const parent = nodeById.get(parentId);
				if (!parent) {
					dropped++;
					return false;
				}
				if (!parent.rels.children.includes(node.id)) {
					logger.warn('sanitize', 'Dropping unreciprocated parent reference', {
						personId: node.id,
						parentId,
					});
					dropped++;
					return false;
				}
				return true;
			});

			node.rels.children = node.rels.children.filter(childId => {
				const child = nodeById.get(childId);
				if (!child) {
					dropped++;
					return false;
				}
				if (!child.rels.parents.includes(node.id)) {
					logger.warn('sanitize', 'Dropping unreciprocated child reference', {
						personId: node.id,
						childId,
					});
					dropped++;
					return false;
				}
				return true;
			});

			node.rels.spouses = node.rels.spouses.filter(spouseId => {
				const spouse = nodeById.get(spouseId);
				if (!spouse) {
					dropped++;
					return false;
				}
				if (!spouse.rels.spouses.includes(node.id)) {
					logger.warn('sanitize', 'Dropping unreciprocated spouse reference', {
						personId: node.id,
						spouseId,
					});
					dropped++;
					return false;
				}
				return true;
			});
		}

		if (dropped > 0) {
			logger.info('sanitize', `Dropped ${dropped} asymmetric relationship reference(s) before family-chart render. Review the source notes to repair the bidirectional data.`);
		}
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
	 * Re-apply the element-local circle clip to every avatar when the Circle
	 * style is active. f3 re-renders (notably fit-to-view) can re-lay the card
	 * images and drop a per-card clip, which is what turned Circle avatars back
	 * into squares in a pop-out window. A `circle(50%)` basic shape carries no
	 * document reference, so it resolves in the pop-out's separate document
	 * where the old `url(#…)` clip reference could not (#677).
	 */
	private reapplyCircleAvatarClips(): void {
		if (this.cardStyle !== 'circle' || !this.f3Chart) return;
		const svg = this.f3Chart.svg as SVGSVGElement | undefined;
		if (!svg) return;
		// Re-assert the round clip on every avatar...
		d3.select(svg).selectAll('.card_image').style('clip-path', 'circle(50%)');
		// ...and re-inject any gender disc that f3's fit-to-view re-render dropped.
		// The per-card onCardUpdate hook (addOpenNoteButton) injects the disc, but
		// position-only updates like fit may not re-run it, so the colored ring
		// vanished after "Fit to view" even though the avatar stayed round (#677).
		d3.select(svg)
			.selectAll<SVGGElement, { data?: { data?: { gender?: string }; main?: boolean } }>('.card_cont')
			.each((datum, index, nodes) => {
				this.ensureCircleDisc(nodes[index], datum?.data?.data?.gender, !!datum?.data?.main);
			});
	}

	/**
	 * Inject the gender-colored disc behind a circle card's round avatar, unless
	 * one is already present. Shared by the per-card update hook and the
	 * after-update re-assertion so both paths produce an identical ring (#677).
	 */
	private ensureCircleDisc(cardEl: SVGGElement, gender: string | undefined, isMain: boolean): void {
		const inner = d3.select(cardEl).select('.card-inner');
		if (inner.empty() || !inner.select('.cr-circle-disc').empty()) return;
		const dim = this.getCardDimensions('circle');
		const discClass = gender === 'M' ? 'card-male'
			: gender === 'F' ? 'card-female'
			: gender === 'X' ? 'card-nonbinary'
			: 'card-genderless';
		inner.insert('circle', ':first-child')
			.attr('class', `cr-circle-disc ${discClass}${isMain ? ' cr-circle-disc--main' : ''}`)
			.attr('cx', dim.img_x + dim.img_w / 2)
			.attr('cy', dim.img_y + dim.img_h / 2)
			.attr('r', dim.img_w / 2 + 4);
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

		// Circle style (#669): the rectangular card body is hidden via CSS, so
		// inject a gender-colored disc behind the round avatar to carry the
		// gender color the body would have shown. Inserted as the first child of
		// .card-inner so it sits behind the avatar; guarded against duplicates.
		if (this.cardStyle === 'circle') {
			// Clip the avatar to a circle with an element-local `circle(50%)`
			// basic shape set as an inline style. Unlike an SVG `<clipPath>`
			// referenced via `clip-path: url(#id)`, a basic-shape clip carries no
			// document reference, so it keeps working when the chart is moved to a
			// pop-out window — whose separate document can't resolve the `url(#…)`
			// reference — and it survives f3's fit-to-view re-render that
			// previously dropped the round avatars back to squares (#677). The
			// square avatar box (see getBaseCardDimensions) makes `circle(50%)`
			// inscribe a true circle. Set inline via render code, never in
			// styles.css, so the Community CSS scanner (which only reads
			// styles.css) stays clean — see #669/v0.22.60.
			d3.select(cardEl).select('.card_image').style('clip-path', 'circle(50%)');
			const isMain = !!(d.data as { main?: boolean }).main;
			this.ensureCircleDisc(cardEl, gender, isMain);
		}

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
			case 'circle':
				btnX = 146; // 160 width, top-right corner
				btnY = 12;
				btnRadius = 9;
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
			await new Promise(resolve => window.setTimeout(resolve, 2000));
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
			window.setTimeout(() => this.updateZoomLevelDisplay(), 300);
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
			// Apply synchronously rather than via a d3 `.transition()`. d3's
			// transition scheduler runs on the requestAnimationFrame of the window
			// d3 was loaded in (the main window), so for an element living in a
			// pop-out window's document the transition never fires — the transform
			// attribute is never set, the tree renders untransformed at full scale,
			// and the viewport is parked on empty space (the #678 blank-on-refresh).
			// A direct attribute set applies in any document/window, and since the
			// refresh already rebuilds the chart there's nothing to animate.
			transformGroup.attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
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
			window.setTimeout(() => {
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
				// Pastel card backgrounds are light in both modes, so dark-mode
				// text must stay dark too — white reads poorly on the pastel
				// fills (#672). Mirrors the High Contrast preset's dark textDark.
				textDark: '#333333'
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
		const isDark = activeDocument.body.classList.contains('theme-dark');

		// Set family-chart library variables (used for card colors)
		el.style.setProperty('--female-color', colors.femaleColor);
		el.style.setProperty('--male-color', colors.maleColor);
		el.style.setProperty('--genderless-color', colors.unknownColor);
		const backgroundColor = isDark ? colors.backgroundDark : colors.backgroundLight;
		const textColor = isDark ? colors.textDark : colors.textLight;
		el.style.setProperty('--background-color', backgroundColor);
		el.style.setProperty('--text-color', textColor);
		// #668: keep connector lines visible when the theme's text colour
		// matches the background (e.g. High Contrast dark = black on black).
		el.style.setProperty('--link-color', ensureVisibleLineColor(textColor, backgroundColor));

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
		const isDark = activeDocument.body.classList.contains('theme-dark');

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
	 *
	 * Renders directly without stability polling — at toggle time the
	 * chart is already at rest, so waiting for an "observed change" via
	 * waitForCardPositionStability would just stall on the safety
	 * backstop (#619 follow-up to the setAfterUpdate path).
	 */
	private toggleKinshipLabels(): void {
		this.showKinshipLabels = !this.showKinshipLabels;
		this.renderKinshipLabels();
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
	 *
	 * Polls for card-position stability before rendering rather than relying
	 * on a fixed setTimeout (#619). f3 chart fires setAfterUpdate while cards
	 * are still mid-animation, and the kinship labels read SVG path
	 * coordinates that change frame-to-frame as cards move. A fixed delay
	 * sometimes snapshotted mid-animation positions, leaving the Parent
	 * label overlapping the bottom card until the next manual refresh.
	 *
	 * Mirrors the scheduleRelationshipOverlayRerender shape (#591) — same
	 * setAfterUpdate timing problem, same stability-polling solution.
	 */
	private scheduleKinshipLabelRerender(): void {
		if (this.showKinshipLabels) {
			this.waitForCardPositionStability(() => this.renderKinshipLabels());
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
		const labelsGroup = createSvg('g');
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

			// f3 connects any two co-parents with a straight line so their
			// shared child can branch from the midpoint, and the geometry test
			// above reads that as a spouse link. Only keep the "Spouse" label
			// when the two endpoints are actually spouses in the data — drop it
			// for co-parent-only connectors so unmarried parents aren't labelled
			// spouses (#694). When the endpoints can't be resolved to a person
			// pair, fall through and label as before so legitimate spouse links
			// aren't lost.
			if (isSpouseLink) {
				const pair = this.getLinkPersonPair(linkEl, cardPositions);
				if (pair && !arePersonsSpouses(personMap.get(pair.person1Id), personMap.get(pair.person2Id))) {
					return;
				}
			}

			// Create label text
			const label = createSvg('text');
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
			} else {
				// Parent-child link: position the label on the child-side riser
				// segment — the visible "line down" branch from the child's top
				// up (or across in horizontal mode) to where it joins the
				// horizontal trunk. f3's `LinkVertical` builds the path as
				// `[child, riser-end, riser-end, trunk-end, descent-top, parent]`
				// where the riser sits at `child.x` and ends at `halfway-y`.
				// Using the path's arc-length midpoint instead lands the label
				// on the horizontal trunk for displaced children — the rightmost
				// label drifts into empty trunk space and labels stack on top of
				// each other for couples (#619).
				//
				// Anchor: a fixed offset above the child card's top edge (not
				// the riser midpoint). f3 cards are translated by (-50%, -50%)
				// so `endpoints.start` is the card center; subtract half the
				// card height plus a margin to land in the visible gap just
				// above the card. The midpoint-of-riser approach overlapped
				// the card on short risers (close-stacked generations), since
				// half a short riser is less than half a card-height.
				const endpoints = this.getLinkEndpoints(linkEl);
				if (endpoints) {
					const cardDim = this.getCardDimensions(this.cardStyle);
					const LABEL_MARGIN = 20; // pixels clear of the card edge
					if (this.isHorizontal) {
						// Horizontal mode: riser runs along child.y; cards
						// stack left-right. Anchor to the LEFT edge of the
						// child card (start of the riser going toward parent).
						labelY = endpoints.start.y;
						labelX = endpoints.start.x - cardDim.w / 2 - LABEL_MARGIN;
					} else {
						// Vertical mode (default): cards stack top-bottom.
						// Anchor to the TOP edge of the child card.
						labelX = endpoints.start.x;
						labelY = endpoints.start.y - cardDim.h / 2 - LABEL_MARGIN;
					}
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
	 * Schedule overlay re-render once the chart's card positions are stable.
	 *
	 * f3 chart uses *staggered* entrance delays on initial render
	 * (`calculateDelay` in the library), so deeper cards finish animating
	 * much later than a fixed timer can reliably anticipate. A hard-coded
	 * 1500ms timer previously captured mid-animation transforms on larger
	 * trees, producing overlay lines drawn from wrong coordinates (#386).
	 *
	 * Instead, poll card transforms on successive animation frames and
	 * render once the positions stop changing for several frames in a row.
	 * Small trees stabilize quickly; large trees wait through the stagger.
	 */
	private scheduleRelationshipOverlayRerender(): void {
		if (!this.showCustomRelationships) return;
		this.waitForCardPositionStability(() => {
			this.renderRelationshipOverlay();

			// #615 backstop. The stability poll can occasionally fire against an
			// intermediate card position when f3's entrance animation stalls
			// within the poll's 3-frame tolerance — leaving the overlay's source
			// endpoint detached from its card. (Not reproducible on most hardware;
			// confirmed via a forced mid-animation draw.) After a short beat,
			// check whether any card moved since we drew: if so, the first render
			// was premature, so re-run the stability poll and redraw once the
			// cards have truly settled. Re-running the poll — rather than drawing
			// on a fixed timer — keeps this safe on large trees, where a fixed
			// timer could itself capture a mid-animation frame (the #386 hazard
			// the poll was introduced to avoid). No-op in the common case where
			// positions are already final.
			const drawnPositions = this.getCardPositions();
			const BACKSTOP_CHECK_DELAY_MS = 750;
			window.setTimeout(() => {
				if (!this.showCustomRelationships) return;
				const current = this.getCardPositions();
				if (!this.cardPositionsEqual(current, drawnPositions)) {
					this.waitForCardPositionStability(() => this.renderRelationshipOverlay());
				}
			}, BACKSTOP_CHECK_DELAY_MS);
		});
	}

	/**
	 * Call `callback` once card positions are stable across several
	 * animation frames, or after a hard timeout as a safety backstop.
	 *
	 * On refresh, f3 chart parks every card at the focal person's origin
	 * (0, 0) for several frames before kicking off its entrance transition.
	 * A pure "same as last frame N times in a row" check latches onto that
	 * pre-animation plateau and fires the callback while all positions are
	 * still collapsed at the origin, producing a degenerate overlay arc
	 * (#591). Require at least one observed *change* before treating
	 * positions as stable, so we wait through the plateau and only fire
	 * after the animation has actually moved cards into place.
	 */
	private waitForCardPositionStability(callback: () => void): void {
		const REQUIRED_STABLE_FRAMES = 3;
		const MAX_ATTEMPTS = 240; // ~4 seconds at 60fps
		let lastPositions = new Map<string, { x: number; y: number }>();
		let stableFrames = 0;
		let attempts = 0;
		let hasObservedChange = false;

		const tick = () => {
			attempts++;
			const current = this.getCardPositions();
			const isEqual = this.cardPositionsEqual(current, lastPositions);
			if (!isEqual && lastPositions.size > 0) {
				hasObservedChange = true;
			}
			if (current.size > 0 && isEqual && hasObservedChange) {
				if (++stableFrames >= REQUIRED_STABLE_FRAMES) {
					callback();
					return;
				}
			} else {
				stableFrames = 0;
			}
			lastPositions = current;
			if (attempts < MAX_ATTEMPTS) {
				window.requestAnimationFrame(tick);
			} else {
				callback();
			}
		};

		window.requestAnimationFrame(tick);
	}

	private cardPositionsEqual(
		a: Map<string, { x: number; y: number }>,
		b: Map<string, { x: number; y: number }>
	): boolean {
		if (a.size !== b.size) return false;
		for (const [id, posA] of a) {
			const posB = b.get(id);
			if (!posB || posB.x !== posA.x || posB.y !== posA.y) return false;
		}
		return true;
	}

	/**
	 * Render custom relationships as overlay lines on the family chart.
	 * Pulls relationships for each visible card, filters to types flagged for
	 * overlay rendering and enabled per-type, applies the as-of date filter,
	 * and draws a styled curve between each pair of card centers. Curves arc
	 * below the straight chord so overlay relationships read distinctly from
	 * the tree's perpendicular structural links (#404). Curvature also avoids
	 * the ambiguity that would arise if a straight route between distant
	 * relatives happened to trace along existing parent-child lines.
	 */
	private renderRelationshipOverlay(): void {
		if (!this.chartContainerEl) return;

		// Remove existing overlay group(s)
		const existing = this.chartContainerEl.querySelectorAll('.cr-relationship-overlay');
		existing.forEach(el => el.remove());

		// Revert any structural-link restyling from a previous pass — we'll
		// re-apply below if the current state still calls for it (#404).
		this.revertStructuralLinkRestyling();

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
		const overlayGroup = createSvg('g');
		overlayGroup.setAttribute('class', 'cr-relationship-overlay');

		// Track the deepest arc stack on any single endpoint pair (after
		// structural-counterpart restyling drops entries that restyle the
		// structural link in place). Drives the z-order decision below: paint
		// UNDER family links only when stacking is heavy enough to threaten
		// occluding the structural line; paint ON TOP otherwise so non-stacked
		// arcs aren't themselves hidden by the family-link layer (#450).
		let maxArcStackDepth = 0;

		// Draw lines
		const STACK_OFFSET_PX = 8;
		for (const [, entries] of byPair) {
			// If any entry's type maps to a structural parent-child link and
			// we can locate that link in the chart, restyle the link and
			// drop that entry from the arc-drawing pass (#404).
			const structuralEntry = entries.find(e => STRUCTURAL_COUNTERPART_TYPES.has(e.type.id));
			const arcEntries = structuralEntry && this.tryRestyleStructuralLink(svg, structuralEntry)
				? entries.filter(e => e !== structuralEntry)
				: entries;

			if (arcEntries.length > maxArcStackDepth) {
				maxArcStackDepth = arcEntries.length;
			}

			arcEntries.forEach((entry, index) => {
				const { rel, type } = entry;
				const sourcePos = cardPositions.get((rel.sourceCrId ?? ''));
				const targetPos = cardPositions.get((rel.targetCrId ?? ''));
				if (!sourcePos || !targetPos) return;

				// Sort the two endpoints into an "upper" → "lower" chord
				// (by y, then x for horizontal-tie stability). The bow
				// direction is derived from this canonical ordering rather
				// than from the source/target ordering, which is what the
				// rel enumeration happened to produce — that ordering is
				// unstable across renders (f3 layout can flip subpixel
				// x-positions between initial draw and refresh), and the
				// previous `if (py < 0)` flip then sent the bow to opposite
				// sides on different renders, sometimes through an
				// intermediate card (#591). With sorted endpoints the
				// perpendicular orientation is deterministic.
				const sourceFirst =
					sourcePos.y < targetPos.y ||
					(sourcePos.y === targetPos.y && sourcePos.x <= targetPos.x);
				const from = sourceFirst ? sourcePos : targetPos;
				const to = sourceFirst ? targetPos : sourcePos;

				// Perpendicular offset for stacking when multiple relationships share a pair
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const len = Math.sqrt(dx * dx + dy * dy) || 1;
				// Unit perpendicular vector (rotate 90° CCW). With the
				// upper-to-lower canonical chord above, dy is always >= 0,
				// so px is always <= 0 and near-vertical chords bow
				// consistently to the left (px ≈ -1, py ≈ 0). For chords
				// with significant horizontal spread, this perpendicular
				// points roughly screen-down, matching the previous intent.
				const px = -dy / len;
				const py = dx / len;
				// Center stack around 0 with a half-step shift for odd counts so
				// no line lands on the midpoint where a family link might sit
				// (marriage, parent-child). Even counts are already symmetric
				// around 0 and don't coincide with the midpoint.
				const N = arcEntries.length;
				const halfShift = N % 2 === 1 ? 0.5 : 0;
				const offsetIndex = index - (N - 1) / 2 + halfShift;
				const offset = offsetIndex * STACK_OFFSET_PX;
				const ox = px * offset;
				const oy = py * offset;

				// Clip the chord endpoints to the card boundaries (#591).
				// `cardPositions` returns the SVG translate anchor for each
				// card, which is the card's center; without clipping the
				// bezier visibly starts inside the source card and ends
				// inside the target. Trim by the ray-rectangle intersection
				// distance from each center along the chord direction.
				const dims = this.getCardDimensions(this.cardStyle);
				const halfW = dims.w / 2;
				const halfH = dims.h / 2;
				const absUx = Math.abs(dx) / len;
				const absUy = Math.abs(dy) / len;
				// Distance from a card center to its rectangular boundary
				// along the chord direction. The `?: Infinity` branches
				// handle the degenerate cases (purely horizontal / vertical
				// chord) where one component is zero; the boundary in that
				// case is the perpendicular edge.
				const tFrom = Math.min(
					absUx > 0 ? halfW / absUx : Infinity,
					absUy > 0 ? halfH / absUy : Infinity
				);
				const tTo = tFrom; // cards share dimensions in current chart styling
				const fromEdgeX = from.x + (dx / len) * tFrom;
				const fromEdgeY = from.y + (dy / len) * tFrom;
				const toEdgeX = to.x - (dx / len) * tTo;
				const toEdgeY = to.y - (dy / len) * tTo;

				// Build a quadratic bezier that arcs along the down-oriented
				// perpendicular to the chord. Sag scales with chord length
				// so short and long spans both read as clearly-curved.
				// Additionally, the sag must be large enough that the
				// curve's perpendicular apex (≈ sag/2 from the chord)
				// clears the half-width of any intermediate card the chord
				// passes through — otherwise a near-vertical chord
				// connecting stacked cards visibly cuts through the card
				// in the middle (#591). The `verticality` weighting keeps
				// horizontal-spread chords from getting unnecessarily
				// exaggerated arcs (their chord already passes alongside
				// intermediate cards rather than through them).
				const verticality = Math.abs(dy) / len;
				const cardClearanceSag = (halfW + 30) * 2 * verticality;
				const x1 = fromEdgeX + ox;
				const y1 = fromEdgeY + oy;
				const x2 = toEdgeX + ox;
				const y2 = toEdgeY + oy;
				const mx = (x1 + x2) / 2;
				const my = (y1 + y2) / 2;
				const sag = Math.min(300, Math.max(40, len / 3, cardClearanceSag));
				const cx = mx + px * sag;
				const cy = my + py * sag;
				const pathD = `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;

				// Invisible wider "hit path" makes hover-to-tooltip easier
				// without thickening the visible curve.
				const hitPath = createSvg('path');
				hitPath.setAttribute('d', pathD);
				hitPath.setAttribute('stroke', 'transparent');
				hitPath.setAttribute('stroke-width', '14');
				hitPath.setAttribute('fill', 'none');
				hitPath.setAttribute('class', 'cr-relationship-overlay-hitline');
				// Tooltip hangs on the hit path so hover works across the wider area
				const tooltip = createSvg('title');
				const dateRange = this.formatRelationshipDateRange(rel);
				tooltip.textContent = dateRange
					? `${rel.sourceName} — ${type.name} — ${rel.targetName} (${dateRange})`
					: `${rel.sourceName} — ${type.name} — ${rel.targetName}`;
				hitPath.appendChild(tooltip);
				overlayGroup.appendChild(hitPath);

				const path = createSvg('path');
				path.setAttribute('d', pathD);
				path.setAttribute('stroke', type.color);
				path.setAttribute('stroke-width', '2');
				path.setAttribute('fill', 'none');
				// Visible path defers pointer events to the hit path so the
				// wider hit target is always the hover target.
				path.setAttribute('pointer-events', 'none');
				if (type.lineStyle === 'dashed') {
					path.setAttribute('stroke-dasharray', '8,4');
				} else if (type.lineStyle === 'dotted') {
					path.setAttribute('stroke-dasharray', '2,3');
				}
				path.setAttribute('class', `cr-relationship-overlay-line cr-relationship-overlay-line--${type.id}`);
				overlayGroup.appendChild(path);
			});
		}

		// Z-order: paint UNDER `links_view` only when the heaviest arc stack
		// threatens to occlude a structural family line (the original #386
		// concern). Otherwise paint ON TOP so non-stacked arcs aren't
		// themselves hidden by the family-link layer (#450).
		const paintUnderLinks = shouldPaintOverlayUnderLinks(maxArcStackDepth);
		const viewGroup = svg.querySelector('.view');
		if (viewGroup) {
			const linksView = viewGroup.querySelector('.links_view');
			if (linksView && paintUnderLinks) {
				viewGroup.insertBefore(overlayGroup, linksView);
			} else {
				viewGroup.appendChild(overlayGroup);
			}
		} else {
			svg.appendChild(overlayGroup);
		}
	}

	/**
	 * For an overlay relationship whose type maps onto a structural parent-child
	 * link (adopted / step / foster), try to find that link in the current chart
	 * and restyle it with the overlay's color + dash pattern. Returns true if a
	 * link was found and styled — the caller should then skip the arc-drawing
	 * pass for this entry (#404).
	 */
	private tryRestyleStructuralLink(
		svg: Element,
		entry: { rel: ParsedRelationship; type: RelationshipTypeDefinition }
	): boolean {
		const linksView = svg.querySelector('.links_view');
		if (!linksView) return false;
		const { rel, type } = entry;

		// f3 chart renders a person twice when they appear in multiple family
		// contexts (e.g., an adopted child who is also a spouse-parent elsewhere).
		// The structural link then connects to the duplicate card at a position
		// different from the primary visible card — restyling that link paints
		// a colored line heading to an off-layout position, not the visible
		// counterpart. Skip the restyle in that case and let the caller fall
		// through to arc rendering, which anchors on the primary card positions.
		if (this.countCardsForCrId((rel.sourceCrId ?? '')) > 1 || this.countCardsForCrId((rel.targetCrId ?? '')) > 1) {
			return false;
		}

		// f3 chart structural links carry source/target that may be a single
		// tree node OR an array of parent nodes (progeny-side links), with
		// each node exposing the person crId at `.data.id`. Extract both
		// shapes so we can match either side of the relationship.
		const extractIds = (endpoint: unknown): string[] => {
			if (!endpoint) return [];
			const arr = Array.isArray(endpoint) ? endpoint : [endpoint];
			return arr
				.map(n => (n as { data?: { id?: string } })?.data?.id)
				.filter((id): id is string => typeof id === 'string' && id.length > 0);
		};
		const linkEls = linksView.querySelectorAll<SVGPathElement>('path.link');
		for (const linkEl of Array.from(linkEls)) {
			const datum = d3.select(linkEl).datum() as
				| { source?: unknown; target?: unknown }
				| undefined;
			const sourceIds = extractIds(datum?.source);
			const targetIds = extractIds(datum?.target);
			if (sourceIds.length === 0 || targetIds.length === 0) continue;
			const matches =
				(sourceIds.includes((rel.sourceCrId ?? '')) && targetIds.includes((rel.targetCrId ?? ''))) ||
				(sourceIds.includes((rel.targetCrId ?? '')) && targetIds.includes((rel.sourceCrId ?? '')));
			if (!matches) continue;

			linkEl.classList.add('cr-structural-link-overlay');
			linkEl.classList.add(`cr-structural-link-overlay--${type.id}`);
			linkEl.setAttribute('stroke', type.color);
			if (type.lineStyle === 'dashed') {
				linkEl.setAttribute('stroke-dasharray', '8,4');
			} else if (type.lineStyle === 'dotted') {
				linkEl.setAttribute('stroke-dasharray', '2,3');
			} else {
				linkEl.removeAttribute('stroke-dasharray');
			}

			// Wider transparent hit path on top of the now-thin-colored structural
			// link, so hover-for-tooltip works without pixel-precise cursor
			// placement — mirrors the pattern v0.20.61 added for overlay arcs.
			const tooltipText = this.formatOverlayTooltip(rel, type);
			const hitPath = createSvg('path');
			hitPath.setAttribute('d', linkEl.getAttribute('d') || '');
			hitPath.setAttribute('stroke', 'transparent');
			hitPath.setAttribute('stroke-width', '14');
			hitPath.setAttribute('fill', 'none');
			hitPath.setAttribute('class', 'cr-structural-link-overlay-hitline');
			const hitTitle = createSvg('title');
			hitTitle.textContent = tooltipText;
			hitPath.appendChild(hitTitle);
			linkEl.parentNode?.insertBefore(hitPath, linkEl.nextSibling);

			return true;
		}
		return false;
	}

	/** Count rendered `.card_cont` elements matching a given crId. */
	private countCardsForCrId(crId: string): number {
		if (!this.chartContainerEl) return 0;
		return Array.from(
			this.chartContainerEl.querySelectorAll<Element>('.card_cont')
		).filter(
			el => (el as Element & { __data__?: { data?: { id?: string } } }).__data__?.data?.id === crId
		).length;
	}

	/** Build the tooltip string for an overlay relationship. */
	private formatOverlayTooltip(rel: ParsedRelationship, type: RelationshipTypeDefinition): string {
		const dateRange = this.formatRelationshipDateRange(rel);
		return dateRange
			? `${rel.sourceName} — ${type.name} — ${rel.targetName} (${dateRange})`
			: `${rel.sourceName} — ${type.name} — ${rel.targetName}`;
	}

	/**
	 * Undo any structural-link restyling applied by a prior overlay pass so
	 * the links return to their default appearance. Called at the top of
	 * renderRelationshipOverlay before re-applying.
	 */
	private revertStructuralLinkRestyling(): void {
		if (!this.chartContainerEl) return;
		const restyled = this.chartContainerEl.querySelectorAll<SVGPathElement>('.cr-structural-link-overlay');
		restyled.forEach(el => {
			el.removeAttribute('stroke');
			el.removeAttribute('stroke-dasharray');
			for (const cls of Array.from(el.classList)) {
				if (cls === 'cr-structural-link-overlay' || cls.startsWith('cr-structural-link-overlay--')) {
					el.classList.remove(cls);
				}
			}
			const title = el.querySelector(':scope > title');
			if (title) title.remove();
		});
		// Also remove the widened hit paths we added alongside each restyled link.
		this.chartContainerEl
			.querySelectorAll('.cr-structural-link-overlay-hitline')
			.forEach(el => el.remove());
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
				if (!cardPositions.has((rel.sourceCrId ?? '')) || !cardPositions.has((rel.targetCrId ?? ''))) continue;
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
			window.setTimeout(() => this.applyHighlightClasses(), 1500);
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

		// Scope the card iteration to this view's own container, not the global
		// document. A bare d3.selectAll queries the main window's document and so
		// matches nothing when the chart is in a detached pop-out window, leaving
		// highlight groups with no effect there (surfaced in the #670 discussion;
		// same pop-out-document family as #677/#678).
		d3.select(this.chartContainerEl).selectAll<Element, { data: { id: string } }>('.card_cont')
			.each(function(nodeData) {
				// Strip all previous highlight classes and any dim overlay left by
				// an earlier build (the overlay mechanism was retired in the #670
				// follow-up — see below).
				this.classList.remove('cr-hl-dim', 'cr-hl-match');
				for (const c of HIGHLIGHT_COLORS) {
					this.classList.remove(`cr-hl-match--${c.value}`);
				}
				this.querySelector('.cr-hl-dim-overlay')?.remove();

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
					// Dim the card via the `cr-hl-dim` marker class; the CSS lowers
					// opacity on the inner `.card` group. No overlay is appended —
					// the overlay (used through v0.22.65) sat above the card and
					// washed out the connector-line stub routing into each dimmed
					// card, so the edge lines appeared to change colour at every
					// non-matching node (#670 follow-up). See the CSS rule for why
					// the opacity is scoped to `.card`, not `.card_cont`.
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
		if (!this.chartContainerEl) return positions;

		// Scope to the current chart's container — otherwise d3.selectAll matches
		// card_cont elements from other open family chart tabs or stale hidden
		// charts, producing wrong coordinates for a crId when positions.set
		// overwrites with the last-matched duplicate (#386).
		// SVG cards expose translate() via the `transform` attribute (no units);
		// HTML cards (circle card style) expose it via `style.transform` in px units.
		d3.select(this.chartContainerEl).selectAll<Element, { data: { id: string } }>('.card_cont')
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
	/**
	 * Resolve a link path's two endpoints to the person IDs whose cards sit at
	 * each end, by matching card positions within a tolerance. Returns null
	 * when either endpoint can't be matched to a card. Shared by the
	 * spouse-number labeler and the co-parent-vs-spouse check (#694).
	 */
	private getLinkPersonPair(
		linkPath: SVGPathElement,
		cardPositions: Map<string, { x: number; y: number }>
	): { person1Id: string; person2Id: string } | null {
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
		return { person1Id, person2Id };
	}

	private getSpouseNumberForLink(
		linkPath: SVGPathElement,
		cardPositions: Map<string, { x: number; y: number }>,
		personMap: Map<string, FamilyChartPerson>
	): number | null {
		const pair = this.getLinkPersonPair(linkPath, cardPositions);
		if (!pair) return null;
		const { person1Id, person2Id } = pair;

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
	 * Pre-measure card names and wrap any that overflow into two lines (#671).
	 *
	 * The SVG card renderer clips long names at the card's right edge (f3 fades
	 * them out under a mask) rather than wrapping. For the fixed-width
	 * rectangular styles we measure each person's full name against the card's
	 * text region and, when any name is too wide, split it across two lines —
	 * matching the wrap behavior of the HTML-card demos. The split is stored per
	 * person in `cr_name_1` / `cr_name_2`; `buildDisplayFields` swaps the single
	 * name line for those two when wrapping is active, and `calculateContentLines`
	 * reserves the extra line so the uniform-grid cards grow in height to match.
	 *
	 * Scoped to rectangle / compact / mini in full-name mode. Circle content-fits
	 * its width instead (#669); split mode already gives the given and family
	 * names their own lines.
	 */
	private prepareNameWrapping(): void {
		this.nameWrapActive = false;
		for (const person of this.chartData) {
			delete person.data['cr_name_1'];
			delete person.data['cr_name_2'];
		}

		if (this.cardStyle === 'circle' || this.nameDisplayMode === 'split') return;

		const container = this.chartContainerEl;
		if (!container) return;

		const dims = this.getBaseCardDimensions(this.cardStyle);
		// Text is clipped at card width − 10 (f3's overflow mask) and starts at
		// text_x; keep a few px clear of the fade so a fit name doesn't smudge.
		const available = dims.w - 10 - dims.text_x - 4;
		if (available <= 0) return;

		// One hidden measuring node reused for every name. It lives in the same
		// `.f3` container as the cards, so it inherits the identical font cascade
		// (card tspans set no font-size of their own).
		const svgNs = 'http://www.w3.org/2000/svg';
		const measureSvg = activeDocument.createElementNS(svgNs, 'svg');
		// `.cr-fcv-measure` parks it offscreen (absolute, hidden, zero-size) so it
		// renders for getComputedTextLength without disturbing the chart layout.
		measureSvg.setAttribute('class', 'cr-fcv-measure');
		const measureText = activeDocument.createElementNS(svgNs, 'text');
		measureSvg.appendChild(measureText);
		container.appendChild(measureSvg);

		const measure = (s: string): number => {
			measureText.textContent = s;
			try {
				return measureText.getComputedTextLength();
			} catch {
				return 0;
			}
		};

		const fullName = (person: FamilyChartPerson): string => {
			const first = String(person.data['first name'] ?? '').trim();
			const last = String(person.data['last name'] ?? '').trim();
			return `${first} ${last}`.trim();
		};

		try {
			for (const person of this.chartData) {
				const name = fullName(person);
				if (!name || measure(name) <= available) continue;

				const [line1, line2] = wrapNameToTwoLines(name, available, measure);
				if (!line2) continue; // single unbreakable word — nothing to gain
				person.data['cr_name_1'] = line1;
				person.data['cr_name_2'] = line2;
				this.nameWrapActive = true;
			}
		} finally {
			measureSvg.remove();
		}

		if (!this.nameWrapActive) return;

		// Fill the wrap fields for the names that fit, so the shared display
		// template renders a (blank) second line uniformly on every card.
		for (const person of this.chartData) {
			if (person.data['cr_name_1'] === undefined) {
				person.data['cr_name_1'] = fullName(person);
				person.data['cr_name_2'] = '';
			}
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
		} else if (this.nameWrapActive) {
			// A name overflowed and was wrapped (#671): render the precomputed
			// two-line fields. Non-overflowing people carry the whole name in
			// `cr_name_1` with an empty `cr_name_2`, so the second line is blank
			// but still reserves height — keeping the uniform-grid cards aligned.
			displayFields.push(['cr_name_1']);
			displayFields.push(['cr_name_2']);
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

		// Add dates. The `_display` variants strip any `T HH:MM[:SS]`
		// tiebreak suffix used to disambiguate twins (#590); the raw
		// `birthday` / `deathday` fields stay reserved for edit-panel
		// population and the not-yet-born / privacy filter checks.
		if (this.showBirthDates && this.showDeathDates) {
			displayFields.push(['birthday_display']);
			displayFields.push(['deathday_display']);
		} else if (this.showBirthDates) {
			displayFields.push(['birthday_display']);
		} else if (this.showDeathDates) {
			displayFields.push(['deathday_display']);
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
		// Full-name mode is one line, or two when a name wrapped (#671).
		const nameLines = this.nameDisplayMode === 'split' ? 2 : (this.nameWrapActive ? 2 : 1);
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
	 * Get card dimensions for a style, widened to fit content when needed.
	 *
	 * Returns the style's fixed base geometry (see `getBaseCardDimensions`),
	 * then — for the Circle style only — widens the card to `contentCardWidth`
	 * when the measured widest line exceeds the base width (#669 follow-up).
	 * Circle centers a short label under the avatar on an otherwise empty card,
	 * so widening it to fit long names costs no layout density. The rectangular
	 * styles fill their width and sit a fixed node-separation apart, so widening
	 * them would eat the gap between spouse/sibling cards — they keep their base
	 * width instead. Short content keeps the base width unchanged either way.
	 */
	private getCardDimensions(style: CardStyle): { w: number; h: number; text_x: number; text_y: number; img_w: number; img_h: number; img_x: number; img_y: number } {
		const dims = this.getBaseCardDimensions(style);

		if (style !== 'circle' || style !== this.cardStyle || this.contentCardWidth === null || this.contentCardWidth <= dims.w) {
			return dims;
		}

		// Circle centers the label + avatar, so re-anchor both to the new width.
		const w = this.contentCardWidth;
		return { ...dims, w, text_x: w / 2, img_x: (w - dims.img_w) / 2 };
	}

	/**
	 * Get the style's fixed base card dimensions and content lines (#90).
	 */
	private getBaseCardDimensions(style: CardStyle): { w: number; h: number; text_x: number; text_y: number; img_w: number; img_h: number; img_x: number; img_y: number } {
		const lines = this.calculateContentLines();

		switch (style) {
			case 'circle': {
				// Bare-circle look on the SVG renderer (#669): a round avatar
				// centered at the top with the label centered below it, and a
				// transparent card body. Gender shows as a disc behind the avatar
				// (injected in addOpenNoteButton, since the body that normally
				// carries the gender color is hidden). A square image box lets
				// `clip-path: circle(50%)` inscribe a true circle.
				const avatar = 60;
				const ring = 4;
				const w = 160;
				const imgY = 8;
				// First label line sits just below the gender disc. f3 offsets the
				// first tspan by 14 from text_y, so the disc bottom (imgY + avatar
				// + ring) minus that offset puts the baseline a few px below it.
				const textTop = imgY + avatar + ring - 4;
				const h = textTop + lines * 16 + 12;
				return {
					w,
					h,
					text_x: w / 2,
					text_y: textTop,
					img_w: avatar,
					img_h: avatar,
					img_x: (w - avatar) / 2,
					img_y: imgY
				};
			}

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
				// Default: SVG cards with square avatars. Kept compact so a
				// spouse couple doesn't read as one fused block and the tree
				// breathes (#669 follow-up): smaller avatar cap and a narrower
				// base than the original 200/20/80. Height hugs the text — f3
				// renders each line at a fixed 14px, so the card is sized to
				// the line count plus minimal top/bottom chrome rather than
				// reserving ~24px of dead padding. All cards share one size
				// (the library lays the tree on a fixed grid), so a sparse card
				// can't be shorter than the busiest one — this just trims the
				// excess so the gap is as small as the layout allows.
				const lineHeight = 14;
				const extraLines = Math.max(0, lines - 2);
				const h = 18 + lines * lineHeight; // 18 = ~10 top + ~8 bottom chrome
				const imgSize = Math.min(58, h - 10); // Avatar scales with height, max 58px
				return {
					w: 176 + extraLines * 8,
					h,
					text_x: imgSize + 14,
					text_y: 10,
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
	 * This floor keeps an edge-to-edge gap regardless of which preset the user
	 * picks. Rectangle cards fill their width and sit a couple flush, so they
	 * get a wider gap so spouse pairs read as two cards rather than one fused
	 * block (#669 follow-up); the compact/mini styles stay deliberately tight.
	 * Card width can grow with enabled content toggles, so this depends on the
	 * current display state.
	 */
	private getMinimumNodeSpacing(style: CardStyle): number {
		const cardWidth = this.getCardDimensions(style).w;
		const gap = style === 'rectangle' ? 40 : 20;
		return cardWidth + gap;
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
	 * Apply the effective horizontal card spacing: the larger of the user's
	 * chosen `nodeSpacing` and the current style/content minimum. The user's
	 * preference is kept intact rather than overwritten with the minimum, so the
	 * tree re-compacts toward it when cards shrink again — e.g. after toggling
	 * descriptive fields back off, or a long-named card collapsing on refit
	 * (#669 follow-up). Keeping the stored value also leaves the spacing menu
	 * checkmark and saved state on the user's actual choice. (#669)
	 */
	private applyEffectiveNodeSpacing(): void {
		if (!this.f3Chart) return;
		const effective = effectiveCardSpacing(this.nodeSpacing, this.getMinimumNodeSpacing(this.cardStyle));
		this.f3Chart.setCardXSpacing(effective);
	}

	/**
	 * Apply the effective vertical spacing: the larger of the user's chosen
	 * `levelSpacing` and the current style/content minimum, without overwriting
	 * the stored preference. Mirrors {@link applyEffectiveNodeSpacing} so
	 * generations re-compact when cards get shorter again. (#669)
	 */
	private applyEffectiveLevelSpacing(): void {
		if (!this.f3Chart) return;
		const effective = effectiveCardSpacing(this.levelSpacing, this.getMinimumLevelSpacing(this.cardStyle));
		this.f3Chart.setCardYSpacing(effective);
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

		// Toggling descriptive fields (#374) can change a rectangle card's base
		// width, which shifts the wrap threshold — re-measure names first (#671).
		this.prepareNameWrapping();

		const displayFields = this.buildDisplayFields();

		// Update card display and dimensions. Every SVG style sizes from its
		// content lines (height) and the fit width (#669), so refresh the
		// dimension for all of them rather than a subset.
		this.f3Card.setCardDisplay(displayFields);
		this.f3Card.setCardDim(this.getCardDimensions(this.cardStyle));

		// Toggling content fields (#374) changes card size, so the effective
		// spacing floor moves. Re-apply both — growing to avoid overlap when
		// fields turn on, and shrinking back toward the user's preference when
		// they turn off so the tree re-compacts (#669 follow-up).
		this.applyEffectiveNodeSpacing();
		this.applyEffectiveLevelSpacing();

		// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
		this.f3Chart.updateTree({});

		// The new field set changes the longest line; re-measure and widen.
		// Runs synchronously after updateTree, so the browser paints once.
		this.refitCardWidth();
	}

	/**
	 * Measure the widest rendered Circle-card label and widen the (uniform)
	 * cards so long names and descriptive toggle fields are no longer clipped
	 * by the card's text clip path (#669 follow-up).
	 *
	 * Circle only: those cards center a short label on an otherwise empty card,
	 * so widening them costs no layout density. The rectangular styles fill
	 * their width and sit a fixed node-separation apart, so widening them would
	 * pull spouse/sibling cards together — they keep their fixed base width.
	 *
	 * `getBBox()` reports a label's full geometry regardless of the clip, so
	 * the true longest line is measurable even when visually truncated. Width
	 * is uniform per style, so the override is the max needed across all cards;
	 * node spacing is re-clamped via the existing minimum-spacing floor (which
	 * keys off card width). A re-render happens only when the width changes.
	 */
	private refitCardWidth(): void {
		if (!this.f3Chart || !this.f3Card || this.cardStyle !== 'circle') return;
		const svg = this.f3Chart.svg as SVGSVGElement | undefined;
		if (!svg) return;

		let maxLineWidth = 0;
		svg.querySelectorAll('g.card-text text').forEach((node) => {
			try {
				const width = (node as SVGGraphicsElement).getBBox().width;
				if (Number.isFinite(width) && width > maxLineWidth) {
					maxLineWidth = width;
				}
			} catch {
				// getBBox throws on a node that isn't laid out yet; skip it.
			}
		});
		if (maxLineWidth === 0) return; // nothing measurable — keep base width

		const base = this.getBaseCardDimensions(this.cardStyle);
		// Width needed to keep the widest line inside the text clip region
		// (card width − 10). Circle centers the label about text_x = w/2, so it
		// needs a ~10px margin on both sides.
		const PAD = 6;
		const required = Math.ceil(maxLineWidth + 20 + PAD);
		this.contentCardWidth = required;

		const newWidth = this.getCardDimensions(this.cardStyle).w;
		const currentWidth = this.appliedCardWidth ?? base.w;
		if (newWidth === currentWidth) return; // already the right width
		this.appliedCardWidth = newWidth;

		this.f3Card.setCardDim(this.getCardDimensions(this.cardStyle));
		// Re-apply the effective spacing for the new width: a widened card raises
		// the floor, a collapsed one lowers it back toward the user's preference
		// so the tree re-compacts (#669 follow-up).
		this.applyEffectiveNodeSpacing();
		this.f3Chart.updateTree({});
	}

	/**
	 * Set node (horizontal) spacing and refresh
	 *
	 * Clamped to `getMinimumNodeSpacing()` for the current card style so a
	 * user-picked preset can't collapse cards into each other (#373).
	 */
	private setNodeSpacing(spacing: number): void {
		// Store the user's choice as-is; the minimum-spacing floor is applied as
		// the effective value on top, so the preference re-asserts itself when
		// cards get smaller again rather than staying ratcheted up (#669 follow-up).
		this.nodeSpacing = spacing;
		if (this.f3Chart) {
			const effective = effectiveCardSpacing(spacing, this.getMinimumNodeSpacing(this.cardStyle));
			// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
			this.f3Chart.setCardXSpacing(effective);
			this.f3Chart.updateTree({});
			if (effective !== spacing) {
				new Notice(`Showing ${effective}px — ${this.cardStyle} cards need at least that to avoid overlap at the current size. Your ${spacing}px choice is kept and applies when cards are smaller.`);
			} else {
				new Notice(`Node spacing set to ${spacing}px`);
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
		// Store the user's choice as-is; apply the minimum-height floor as the
		// effective value so the preference re-asserts itself when cards get
		// shorter again rather than staying ratcheted up (#669 follow-up).
		this.levelSpacing = spacing;
		if (this.f3Chart) {
			const effective = effectiveCardSpacing(spacing, this.getMinimumLevelSpacing(this.cardStyle));
			// Note: Kinship label clearing/re-rendering is handled by setBeforeUpdate/setAfterUpdate callbacks (#195)
			this.f3Chart.setCardYSpacing(effective);
			this.f3Chart.updateTree({});
			if (effective !== spacing) {
				new Notice(`Showing ${effective}px — fits the current card height. Your ${spacing}px choice is kept and applies when cards are shorter.`);
			} else {
				new Notice(`Level spacing set to ${spacing}px`);
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

	private refreshTimeout: number | null = null;

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
			window.clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = window.setTimeout(() => {
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

		// Restored spacing is kept as the user's preference; the minimum-safe
		// floor for the restored card style + display toggles is applied as the
		// effective value when the chart (re)initializes, so a stale state can't
		// cause overlap while the preference still re-asserts when cards shrink
		// (#373, #374, #669 follow-up).

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

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- Match scope of file-level disable at top. */
