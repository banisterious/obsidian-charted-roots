/**
 * Calendar View (#299)
 *
 * Workspace view showing a monthly calendar grid of significant
 * dates (birthdays, death anniversaries, marriages) across the vault.
 */

import { ItemView, WorkspaceLeaf, setIcon, Menu } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import type { CalendarEvent, CalendarFilter, CalendarViewState } from './types/calendar-types';
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
	private currentYear: number; // canonical signed year (negative for descending eras like BBY/BC)
	private currentYearUniverse: string | null = null; // detected from era-suffixed input; drives display formatting via formatCanonicalYear (#480)
	private selectedDay: number | null = null;
	private filter: CalendarFilter = {
		eventTypes: [...DEFAULT_EVENT_TYPES],
		livingStatus: 'all'
	};

	// Display options
	private showLabels: boolean = false;
	private stateRestored = false;

	// UI elements
	private headerEl: HTMLElement | null = null;
	private gridEl: HTMLElement | null = null;
	private detailEl: HTMLElement | null = null;
	private impreciseEl: HTMLElement | null = null;

	// Auto-refresh
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
	private persistTimeout: ReturnType<typeof setTimeout> | null = null;
	private initialRender = true;

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
		this.restorePersistedState();
		this.buildUI();
		this.initialRender = true;
		this.renderCalendar();
		// Delay enabling persistence to avoid overwrites from Obsidian's setState lifecycle
		activeWindow.setTimeout(() => { this.initialRender = false; }, 1000);
		this.registerEventHandlers();
	}

	async onClose(): Promise<void> {
		// Flush any pending persist
		if (this.persistTimeout) {
			activeWindow.clearTimeout(this.persistTimeout);
		}
		// Persist immediately on close
		const state = this.getState();
		const settings = this.plugin.settings as Record<string, unknown>;
		settings.calendarViewState = state;
		void this.plugin.saveSettings();

		if (this.refreshTimeout) {
			activeWindow.clearTimeout(this.refreshTimeout);
		}
	}

	// ========================================================================
	// State persistence
	// ========================================================================

	private persistState(): void {
		if (this.persistTimeout) activeWindow.clearTimeout(this.persistTimeout);
		this.persistTimeout = activeWindow.setTimeout(() => {
			const state = this.getState();
			const settings = this.plugin.settings as Record<string, unknown>;
			settings.calendarViewState = state;
			void this.plugin.saveSettings();
		}, 500);
	}

	private restorePersistedState(): void {
		const settings = this.plugin.settings as Record<string, unknown>;
		const state = settings.calendarViewState as Partial<CalendarViewState> | undefined;
		if (state) {
			if (state.month !== undefined) this.currentMonth = state.month;
			if (state.year !== undefined) this.currentYear = state.year;
			if (state.yearUniverse !== undefined) this.currentYearUniverse = state.yearUniverse;
			if (state.filter) this.filter = { ...this.filter, ...state.filter };
			if (state.showLabels !== undefined) this.showLabels = state.showLabels;
		}
		this.stateRestored = true;
	}

	getState(): CalendarViewState {
		return {
			month: this.currentMonth,
			year: this.currentYear,
			yearUniverse: this.currentYearUniverse,
			filter: { ...this.filter },
			selectedDay: this.selectedDay,
			showLabels: this.showLabels
		};
	}

	async setState(state: Partial<CalendarViewState>): Promise<void> {
		// Ignore Obsidian's setState if we already restored our own persisted state
		// (Obsidian loads calendarViewState from settings and passes it here,
		// but we handle restoration ourselves in onOpen to control timing)
		if (this.stateRestored) return;

		if (state.month !== undefined) this.currentMonth = state.month;
		if (state.year !== undefined) this.currentYear = state.year;
		if (state.yearUniverse !== undefined) this.currentYearUniverse = state.yearUniverse;
		if (state.filter) this.filter = { ...state.filter };
		if (state.selectedDay !== undefined) this.selectedDay = state.selectedDay;
		if (state.showLabels !== undefined) this.showLabels = state.showLabels;

		// Only re-render if UI is already built (setState can be called before onOpen)
		if (this.headerEl) {
			this.renderCalendar();
		}
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
		if (!this.initialRender) {
			this.persistState();
		}
		this.initialRender = false;
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

		// Year input — text-typed so era-suffixed strings ("82 BBY", "1499 ABY",
		// "5 ABY", "30 AC") are accepted alongside plain integers and ISO dates.
		// Round-trip via DateService so the displayed value carries the era
		// abbreviation when the input parses as fictional. (#480)
		const yearInput = nav.createEl('input', {
			type: 'text',
			cls: 'cr-calendar-year-input',
			attr: { 'aria-label': 'Year (accepts plain numbers or era-suffixed input like "82 BBY")' }
		});
		yearInput.value = this.formatCurrentYear();
		yearInput.addEventListener('change', () => {
			const trimmed = yearInput.value.trim();
			if (!trimmed) {
				yearInput.value = this.formatCurrentYear();
				return;
			}
			const dateService = this.plugin.getDateService();
			const parsed = dateService?.parseDate(trimmed);
			if (parsed && parsed.year !== null) {
				if (parsed.year === this.currentYear) return;
				this.currentYear = parsed.year;
				this.currentYearUniverse = parsed.type === 'fictional' && parsed.fictional
					? parsed.fictional.system.universe ?? null
					: null;
				this.selectedDay = null;
				this.renderCalendar();
				return;
			}
			// Fallback: bare integer (covers DateService-unavailable case + any
			// shape parseDate didn't recognize). Negative years allowed.
			const year = parseInt(trimmed, 10);
			if (!isNaN(year) && year !== this.currentYear) {
				this.currentYear = year;
				this.currentYearUniverse = null;
				this.selectedDay = null;
				this.renderCalendar();
			} else {
				// Reject silently — restore the current display so the input doesn't
				// leave the user's unparseable text in place.
				yearInput.value = this.formatCurrentYear();
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

		// Labels toggle
		const labelsBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': 'Show labels' }
		});
		setIcon(labelsBtn, 'tag');
		if (this.showLabels) labelsBtn.classList.add('is-active');
		labelsBtn.addEventListener('click', () => {
			this.showLabels = !this.showLabels;
			labelsBtn.classList.toggle('is-active', this.showLabels);
			this.renderGrid();
			this.persistState();
		});

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

			// Event dots / labels
			if (events.length > 0) {
				cell.addClass('cr-calendar-cell--has-events');

				if (this.showLabels) {
					const labelsEl = cell.createDiv({ cls: 'cr-calendar-labels' });
					const maxLabels = 3;
					const shown = events.slice(0, maxLabels);
					for (const event of shown) {
						const labelRow = labelsEl.createDiv({ cls: 'cr-calendar-label-row' });
						const dot = labelRow.createSpan({ cls: 'cr-calendar-dot' });
						const color = EVENT_TYPE_COLORS[event.eventType] || 'var(--text-muted)';
						dot.style.backgroundColor = color;
						labelRow.createSpan({
							cls: 'cr-calendar-label-text',
							text: event.personName
						});
					}
					if (events.length > maxLabels) {
						labelsEl.createSpan({
							cls: 'cr-calendar-label-more',
							text: `+${events.length - maxLabels} more`
						});
					}
				} else {
					const dotsEl = cell.createDiv({ cls: 'cr-calendar-dots' });
					if (events.length <= 3) {
						for (const event of events) {
							const dot = dotsEl.createSpan({ cls: 'cr-calendar-dot' });
							const color = EVENT_TYPE_COLORS[event.eventType] || 'var(--text-muted)';
							dot.style.backgroundColor = color;
						}
					} else {
						dotsEl.createSpan({
							cls: 'cr-calendar-event-count',
							text: String(events.length)
						});
					}
				}
			}

			// Click to select day
			cell.addEventListener('click', () => {
				this.selectedDay = this.selectedDay === day ? null : day;
				this.renderGrid();
				this.renderDetail();
			});

			// Right-click context menu
			cell.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
				const menu = new Menu();
				menu.addItem((item) => {
					item.setTitle(`Create event on ${MONTH_NAMES[this.currentMonth]} ${day}, ${this.currentYear}`)
						.setIcon('calendar-plus')
						.onClick(() => {
							const eventService = (this.plugin as unknown as { getEventService: () => unknown }).getEventService?.() as import('../events/services/event-service').EventService | null;
							if (eventService) {
								const { CreateEventModal } = require('../events/ui/create-event-modal');
								new CreateEventModal(this.app, eventService, this.plugin.settings, {
									initialDate: dateStr,
									plugin: this.plugin,
									onCreated: () => this.renderCalendar()
								}).open();
							}
						});
				});
				menu.showAtMouseEvent(e);
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
		this.currentYearUniverse = null; // today is real-world; clear any prior era context
		this.selectedDay = now.getDate();
		this.renderCalendar();
	}

	/**
	 * Format `this.currentYear` for display in the year input, applying the
	 * tracked era universe (if any) so era-suffixed input round-trips through
	 * navigation. Falls back to plain numeric output when no universe context
	 * is set or DateService isn't available. (#480)
	 */
	private formatCurrentYear(): string {
		const dateService = this.plugin.getDateService();
		if (!dateService) return String(this.currentYear);
		return dateService.formatCanonicalYear(
			this.currentYear,
			this.currentYearUniverse ?? undefined
		);
	}

	/**
	 * Navigate to a specific month and year (public, for external callers)
	 */
	navigateToDate(month: number, year: number): void {
		this.currentMonth = month;
		this.currentYear = year;
		this.selectedDay = null;
		this.renderCalendar();
	}

	// ── Event Handlers ──────────────────────────────────────

	private registerEventHandlers(): void {
		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', () => {
				this.scheduleRefresh();
			})
		);

		// Keyboard navigation
		this.registerDomEvent(this.contentEl, 'keydown', (e: KeyboardEvent) => {
			// Don't intercept when typing in input fields
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				this.navigateMonth(-1);
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				this.navigateMonth(1);
			} else if (e.key === 't' || e.key === 'T') {
				e.preventDefault();
				this.goToToday();
			}
		});

		// Make content focusable for keyboard events
		this.contentEl.tabIndex = 0;
	}

	private scheduleRefresh(): void {
		if (this.refreshTimeout) activeWindow.clearTimeout(this.refreshTimeout);
		this.refreshTimeout = activeWindow.setTimeout(() => {
			this.refreshTimeout = null;
			this.renderCalendar();
		}, 2000);
	}
}
