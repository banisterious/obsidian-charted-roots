/**
 * Calendar View (#299)
 *
 * Workspace view showing a monthly calendar grid of significant
 * dates (birthdays, death anniversaries, marriages) across the vault.
 */

import { ItemView, WorkspaceLeaf, setIcon, Menu } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import type { CalendarEvent, CalendarViewState, CalendarFilter } from './types/calendar-types';
import { DEFAULT_EVENT_TYPES, EVENT_TYPE_COLORS } from './types/calendar-types';
import { CalendarDataService } from './calendar-data-service';
import { capitalize } from '../utils/format-utils';
import { getLogger } from '../core/logging';

const logger = getLogger('CalendarView');

export const VIEW_TYPE_CALENDAR = 'canvas-roots-calendar';

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class CalendarView extends ItemView {
	plugin: CanvasRootsPlugin;
	private dataService: CalendarDataService;

	// View state
	private currentMonth: number; // 0-11
	private currentYear: number;
	private selectedDay: number | null = null;
	private filter: CalendarFilter = {
		eventTypes: [...DEFAULT_EVENT_TYPES],
		livingStatus: 'all'
	};

	// UI elements
	private headerEl: HTMLElement | null = null;
	private gridEl: HTMLElement | null = null;
	private detailEl: HTMLElement | null = null;
	private impreciseEl: HTMLElement | null = null;

	// Auto-refresh
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.dataService = new CalendarDataService(
			plugin.app,
			plugin.settings,
			(plugin as unknown as { getEventService: () => unknown }).getEventService?.() as import('../events/services/event-service').EventService | null
		);

		const now = new Date();
		this.currentMonth = now.getMonth();
		this.currentYear = now.getFullYear();
	}

	getViewType(): string {
		return VIEW_TYPE_CALENDAR;
	}

	getDisplayText(): string {
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar';
	}

	async onOpen(): Promise<void> {
		logger.debug('view-open', 'Opening CalendarView');
		this.buildUI();
		this.renderCalendar();
		this.registerEventHandlers();
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- ItemView requires async onClose
	async onClose(): Promise<void> {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
	}

	// ========================================================================
	// State persistence
	// ========================================================================

	getState(): CalendarViewState {
		return {
			month: this.currentMonth,
			year: this.currentYear,
			filter: { ...this.filter },
			selectedDay: this.selectedDay
		};
	}

	async setState(state: Partial<CalendarViewState>): Promise<void> {
		if (state.month !== undefined) this.currentMonth = state.month;
		if (state.year !== undefined) this.currentYear = state.year;
		if (state.filter) this.filter = { ...state.filter };
		if (state.selectedDay !== undefined) this.selectedDay = state.selectedDay;
		this.renderCalendar();
	}

	// ========================================================================
	// UI
	// ========================================================================

	private buildUI(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass('cr-calendar-view');

		// Header with navigation
		this.headerEl = container.createDiv({ cls: 'cr-calendar-header' });

		// Calendar grid
		this.gridEl = container.createDiv({ cls: 'cr-calendar-grid-container' });

		// Day detail panel
		this.detailEl = container.createDiv({ cls: 'cr-calendar-detail' });

		// Imprecise dates section
		this.impreciseEl = container.createDiv({ cls: 'cr-calendar-imprecise' });
	}

	private renderCalendar(): void {
		this.renderHeader();
		this.renderGrid();
		this.renderDetail();
		this.renderImpreciseDates();
	}

	// ── Header ──────────────────────────────────────────────

	private renderHeader(): void {
		if (!this.headerEl) return;
		this.headerEl.empty();

		const nav = this.headerEl.createDiv({ cls: 'cr-calendar-nav' });

		// Previous month
		const prevBtn = nav.createEl('button', {
			cls: 'cr-calendar-nav-btn clickable-icon',
			attr: { 'aria-label': 'Previous month' }
		});
		setIcon(prevBtn, 'chevron-left');
		prevBtn.addEventListener('click', () => this.navigateMonth(-1));

		// Month dropdown
		const monthSelect = nav.createEl('select', {
			cls: 'dropdown cr-calendar-month-select'
		});
		for (let i = 0; i < 12; i++) {
			monthSelect.createEl('option', {
				value: String(i),
				text: MONTH_NAMES[i]
			});
		}
		monthSelect.value = String(this.currentMonth);
		monthSelect.addEventListener('change', () => {
			this.currentMonth = parseInt(monthSelect.value);
			this.selectedDay = null;
			this.renderCalendar();
		});

		// Year input
		const yearInput = nav.createEl('input', {
			type: 'number',
			cls: 'cr-calendar-year-input',
			value: String(this.currentYear),
			attr: { 'aria-label': 'Year' }
		});
		yearInput.addEventListener('change', () => {
			const year = parseInt(yearInput.value);
			if (!isNaN(year) && year > 0 && year < 10000) {
				this.currentYear = year;
				this.selectedDay = null;
				this.renderCalendar();
			}
		});

		// Next month
		const nextBtn = nav.createEl('button', {
			cls: 'cr-calendar-nav-btn clickable-icon',
			attr: { 'aria-label': 'Next month' }
		});
		setIcon(nextBtn, 'chevron-right');
		nextBtn.addEventListener('click', () => this.navigateMonth(1));

		// Today button
		const actions = this.headerEl.createDiv({ cls: 'cr-calendar-actions' });
		const todayBtn = actions.createEl('button', {
			cls: 'cr-calendar-today-btn',
			text: 'Today'
		});
		todayBtn.addEventListener('click', () => this.goToToday());

		// Filter button
		const filterBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': 'Filter events' }
		});
		setIcon(filterBtn, 'filter');
		filterBtn.addEventListener('click', (e) => this.showFilterMenu(e));

		// Refresh button
		const refreshBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': 'Refresh' }
		});
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.addEventListener('click', () => this.renderCalendar());
	}

	// ── Filter Menu ─────────────────────────────────────────

	private showFilterMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Event type toggles
		menu.addItem((item) => {
			item.setTitle('Event types')
				.setIsLabel(true);
		});

		const allEventTypes = ['birth', 'death', 'marriage', 'residence', 'occupation',
			'education', 'military', 'immigration', 'religious', 'baptism', 'burial'];

		for (const type of allEventTypes) {
			const isActive = this.filter.eventTypes.includes(type);
			menu.addItem((item) => {
				item.setTitle(capitalize(type))
					.setChecked(isActive)
					.onClick(() => {
						if (isActive) {
							this.filter.eventTypes = this.filter.eventTypes.filter(t => t !== type);
						} else {
							this.filter.eventTypes.push(type);
						}
						this.renderCalendar();
					});
			});
		}

		menu.addSeparator();

		// Living status
		menu.addItem((item) => {
			item.setTitle('Status')
				.setIsLabel(true);
		});

		for (const status of ['all', 'living', 'deceased'] as const) {
			menu.addItem((item) => {
				item.setTitle(capitalize(status))
					.setChecked(this.filter.livingStatus === status)
					.onClick(() => {
						this.filter.livingStatus = status;
						this.renderCalendar();
					});
			});
		}

		menu.showAtMouseEvent(e);
	}

	// ── Grid ────────────────────────────────────────────────

	private renderGrid(): void {
		if (!this.gridEl) return;
		this.gridEl.empty();

		const { dayEvents } = this.dataService.getEventsForMonth(
			this.currentYear, this.currentMonth + 1, this.filter
		);

		const grid = this.gridEl.createDiv({ cls: 'cr-calendar-grid' });

		// Day-of-week headers
		for (const dayName of DAY_NAMES) {
			grid.createDiv({ cls: 'cr-calendar-day-header', text: dayName });
		}

		// Calculate grid layout
		const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
		const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
		const today = new Date();
		const isCurrentMonth = today.getFullYear() === this.currentYear && today.getMonth() === this.currentMonth;

		// Empty cells before first day
		for (let i = 0; i < firstDay; i++) {
			grid.createDiv({ cls: 'cr-calendar-cell cr-calendar-cell--empty' });
		}

		// Day cells
		for (let day = 1; day <= daysInMonth; day++) {
			const cell = grid.createDiv({ cls: 'cr-calendar-cell' });
			const events = dayEvents.get(day) || [];

			// Today highlight
			if (isCurrentMonth && day === today.getDate()) {
				cell.addClass('cr-calendar-cell--today');
			}

			// Selected highlight
			if (day === this.selectedDay) {
				cell.addClass('cr-calendar-cell--selected');
			}

			// Day number
			cell.createSpan({ cls: 'cr-calendar-day-number', text: String(day) });

			// Event dots
			if (events.length > 0) {
				cell.addClass('cr-calendar-cell--has-events');
				const dotsEl = cell.createDiv({ cls: 'cr-calendar-dots' });

				if (events.length <= 3) {
					for (const event of events) {
						const dot = dotsEl.createSpan({ cls: 'cr-calendar-dot' });
						const color = EVENT_TYPE_COLORS[event.eventType] || 'var(--text-muted)';
						dot.style.backgroundColor = color;
					}
				} else {
					// Show count badge for busy days
					dotsEl.createSpan({
						cls: 'cr-calendar-event-count',
						text: String(events.length)
					});
				}
			}

			// Click to select day
			cell.addEventListener('click', () => {
				this.selectedDay = this.selectedDay === day ? null : day;
				this.renderGrid();
				this.renderDetail();
			});
		}
	}

	// ── Detail Panel ────────────────────────────────────────

	private renderDetail(): void {
		if (!this.detailEl) return;
		this.detailEl.empty();

		if (this.selectedDay === null) return;

		const { dayEvents } = this.dataService.getEventsForMonth(
			this.currentYear, this.currentMonth + 1, this.filter
		);
		const events = dayEvents.get(this.selectedDay) || [];

		if (events.length === 0) {
			this.detailEl.createDiv({
				cls: 'cr-calendar-detail-empty',
				text: `No events on ${MONTH_NAMES[this.currentMonth]} ${this.selectedDay}`
			});
			return;
		}

		const heading = this.detailEl.createDiv({ cls: 'cr-calendar-detail-heading' });
		heading.createSpan({
			text: `${MONTH_NAMES[this.currentMonth]} ${this.selectedDay}`
		});
		heading.createSpan({
			cls: 'cr-calendar-detail-count',
			text: `${events.length} event${events.length !== 1 ? 's' : ''}`
		});

		for (const event of events) {
			this.renderEventRow(this.detailEl, event);
		}
	}

	// ── Imprecise Dates ─────────────────────────────────────

	private renderImpreciseDates(): void {
		if (!this.impreciseEl) return;
		this.impreciseEl.empty();

		const { impreciseEvents } = this.dataService.getEventsForMonth(
			this.currentYear, this.currentMonth + 1, this.filter
		);

		if (impreciseEvents.length === 0) return;

		const header = this.impreciseEl.createDiv({ cls: 'cr-calendar-imprecise-header' });
		header.createSpan({ text: 'This month, day unknown' });
		header.createSpan({
			cls: 'cr-calendar-detail-count',
			text: String(impreciseEvents.length)
		});

		for (const event of impreciseEvents) {
			this.renderEventRow(this.impreciseEl, event);
		}
	}

	// ── Shared Rendering ────────────────────────────────────

	private renderEventRow(container: HTMLElement, event: CalendarEvent): void {
		const row = container.createDiv({ cls: 'cr-calendar-event-row' });

		// Event type dot
		const dot = row.createSpan({ cls: 'cr-calendar-event-dot' });
		const color = EVENT_TYPE_COLORS[event.eventType] || 'var(--text-muted)';
		dot.style.backgroundColor = color;

		// Person name (clickable)
		const nameEl = row.createSpan({
			cls: 'cr-calendar-event-name',
			text: event.personName
		});
		nameEl.addEventListener('click', () => {
			void this.app.workspace.openLinkText(event.filePath, '');
		});

		// Event type
		row.createSpan({
			cls: 'cr-calendar-event-type',
			text: capitalize(event.eventType)
		});

		// Year and years ago
		const yearText = event.isApproximate ? `c. ${event.year}` : String(event.year);
		row.createSpan({
			cls: 'cr-calendar-event-year',
			text: `${yearText} (${event.yearsAgo} year${event.yearsAgo !== 1 ? 's' : ''} ago)`
		});

		// Place
		if (event.placeName) {
			row.createSpan({
				cls: 'cr-calendar-event-place',
				text: event.placeName
			});
		}
	}

	// ── Navigation ──────────────────────────────────────────

	private navigateMonth(delta: number): void {
		this.currentMonth += delta;
		if (this.currentMonth > 11) {
			this.currentMonth = 0;
			this.currentYear++;
		} else if (this.currentMonth < 0) {
			this.currentMonth = 11;
			this.currentYear--;
		}
		this.selectedDay = null;
		this.renderCalendar();
	}

	private goToToday(): void {
		const now = new Date();
		this.currentMonth = now.getMonth();
		this.currentYear = now.getFullYear();
		this.selectedDay = now.getDate();
		this.renderCalendar();
	}

	// ── Event Handlers ──────────────────────────────────────

	private registerEventHandlers(): void {
		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', () => {
				this.scheduleRefresh();
			})
		);
	}

	private scheduleRefresh(): void {
		if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
		this.refreshTimeout = setTimeout(() => {
			this.refreshTimeout = null;
			this.renderCalendar();
		}, 2000);
	}
}
