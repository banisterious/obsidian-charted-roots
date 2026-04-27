/**
 * Calendar View Types (#299)
 */

/**
 * A calendar event representing a significant date
 */
export interface CalendarEvent {
	/** Unique identifier (crId + suffix for death events) */
	id: string;
	/** Display name of the person */
	personName: string;
	/** Person cr_id */
	personCrId: string;
	/** Type of event */
	eventType: CalendarEventType;
	/** Raw date string from frontmatter */
	date: string;
	/** Month (1-12), null if unknown */
	month: number | null;
	/** Day (1-31), null if unknown */
	day: number | null;
	/** Year of the event */
	year: number;
	/** Years ago from current year */
	yearsAgo: number;
	/** Place name, if available */
	placeName?: string;
	/** Whether the date is approximate */
	isApproximate: boolean;
	/** Source: person note or event note */
	source: 'person' | 'event';
	/** File path for navigation */
	filePath: string;
}

export type CalendarEventType = 'birth' | 'death' | 'marriage' | string;

/**
 * Filter state for the calendar view
 */
export interface CalendarFilter {
	/** Which event types to show */
	eventTypes: string[];
	/** Collection filter */
	collection?: string;
	/** Universe filter */
	universe?: string;
	/** Living status filter */
	livingStatus: 'all' | 'living' | 'deceased';
}

/**
 * Persisted view state
 */
export interface CalendarViewState {
	/** Currently displayed month (0-11) */
	month: number;
	/** Currently displayed year (canonical signed year — negative for descending eras like BBY/BC) */
	year: number;
	/** Universe context for era-formatted year display, detected from era-suffixed year input. Drives `formatCanonicalYear`. (#480) */
	yearUniverse?: string | null;
	/** Active filters */
	filter: CalendarFilter;
	/** Currently selected day (1-31), null if none */
	selectedDay: number | null;
	/** Whether to show text labels in day cells */
	showLabels: boolean;
	/** Index signature for Obsidian view state compatibility */
	[key: string]: unknown;
}

/**
 * Events grouped by day for rendering
 */
export interface CalendarDay {
	/** Day of month (1-31) */
	day: number;
	/** Events on this day */
	events: CalendarEvent[];
}

/** Default event types shown in the calendar */
export const DEFAULT_EVENT_TYPES = ['birth', 'death', 'marriage'];

/** Color mapping for event types */
export const EVENT_TYPE_COLORS: Record<string, string> = {
	birth: 'var(--color-blue)',
	death: 'var(--color-red)',
	marriage: 'var(--color-yellow)',
};
