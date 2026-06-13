/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Sort Order Computation Service
 *
 * Computes sort_order values for events based on before/after DAG relationships.
 * Uses topological sort to order events respecting their relative ordering constraints.
 */

import { App, TFile } from 'obsidian';
import type { EventNote } from '../types/event-types';
import type { DateService } from '../../dates/services/date-service';
import { getLogger } from '../../core/logging';

const logger = getLogger('SortOrderService');

/**
 * Result of computing sort order for events
 */
export interface SortOrderResult {
	/** Number of events that were updated */
	updatedCount: number;
	/** Titles of events that couldn't be ordered due to cycles (for the toast) */
	cycleEvents: string[];
	/**
	 * Events that couldn't be ordered, with their notes so the result can be
	 * navigable — the inspectable result view links each one (#723).
	 */
	cycleEventNotes: CycleEventNote[];
	/** Any errors encountered */
	errors: string[];
}

/** A cycle event paired with its note, so the result view can link to it (#723). */
export interface CycleEventNote {
	title: string;
	file: TFile;
}

/**
 * Format cycle-event titles for a user-facing Notice — quoted, capped, with an
 * "and N more" overflow so a long list stays readable while still naming the
 * events involved (#721).
 */
export function formatCycleEvents(titles: string[], max = 5): string {
	const shown = titles.slice(0, max).map(t => `"${t}"`).join(', ');
	const extra = titles.length - max;
	return extra > 0 ? `${shown}, and ${extra} more` : shown;
}

/**
 * Add a directed edge `from -> to`, incrementing the target's in-degree only
 * when the edge is new. The adjacency Set already dedupes the edge; counting
 * in-degree per relationship would over-count a reciprocal before/after pair
 * (which encodes the same edge twice) and leave the target unresolvable, so the
 * topological sort would report a phantom cycle (#721).
 */
function addEdge(
	graph: Map<string, Set<string>>,
	inDegree: Map<string, number>,
	from: string,
	to: string
): void {
	const adj = graph.get(from);
	if (!adj || adj.has(to)) return;
	adj.add(to);
	inDegree.set(to, (inDegree.get(to) || 0) + 1);
}

/**
 * Compute and update sort_order values for events based on before/after relationships.
 * Uses topological sort respecting date-based ordering first, then before/after constraints.
 *
 * @param app - Obsidian App instance
 * @param events - All event notes to process
 * @param dateService - Optional DateService for fictional-date-aware comparison;
 *                     without it, dates fall back to leading-integer extraction
 *                     which mis-sorts multi-era inputs alphabetically (#564).
 * @returns Result with counts and any cycle information
 */
export async function computeSortOrder(
	app: App,
	events: EventNote[],
	dateService?: DateService | null
): Promise<SortOrderResult> {
	const result: SortOrderResult = {
		updatedCount: 0,
		cycleEvents: [],
		cycleEventNotes: [],
		errors: []
	};

	if (events.length === 0) {
		return result;
	}

	// Build lookup maps
	const eventByPath = new Map<string, EventNote>();
	const eventByCrId = new Map<string, EventNote>();

	for (const event of events) {
		eventByPath.set(event.filePath, event);
		// Also index without .md extension for wikilinks
		const pathWithoutMd = event.filePath.replace(/\.md$/, '');
		eventByPath.set(pathWithoutMd, event);
		// Also just filename for simple wikilinks
		const filename = event.filePath.split('/').pop()?.replace(/\.md$/, '') || '';
		if (filename) {
			eventByPath.set(filename, event);
		}
		eventByCrId.set(event.crId, event);
	}

	// Build adjacency list for the DAG
	// edge from A -> B means "A comes before B"
	const graph = new Map<string, Set<string>>();
	const inDegree = new Map<string, number>();

	// Initialize all nodes
	for (const event of events) {
		graph.set(event.crId, new Set());
		inDegree.set(event.crId, 0);
	}

	// Add edges from before/after relationships
	for (const event of events) {
		// If this event has "before" references, it should come before those events
		// This event -> referenced event
		if (event.before) {
			for (const beforeRef of event.before) {
				const refPath = normalizeWikilink(beforeRef);
				const targetEvent = eventByPath.get(refPath);
				if (targetEvent) {
					// Edge: this event -> target event (this comes before target).
					// Only count the in-degree for a NEW edge — a reciprocal pair
					// (A before B + B after A) encodes the same edge twice, and
					// double-counting in-degree would leave the target unresolvable
					// and report a phantom cycle (#721).
					addEdge(graph, inDegree, event.crId, targetEvent.crId);
				}
			}
		}

		// If this event has "after" references, those events should come before this one
		// Referenced event -> this event
		if (event.after) {
			for (const afterRef of event.after) {
				const refPath = normalizeWikilink(afterRef);
				const sourceEvent = eventByPath.get(refPath);
				if (sourceEvent) {
					// Edge: source event -> this event (source comes before this).
					addEdge(graph, inDegree, sourceEvent.crId, event.crId);
				}
			}
		}
	}

	// Perform topological sort using Kahn's algorithm
	// Start with events that have no incoming edges
	const queue: EventNote[] = [];

	// Sort by date first, then add to queue. When two events share a start
	// date and only one has a `date_end` (i.e., one is a point event and
	// one is a range event), the point event sorts first (#569): readers
	// expect "what happened on this date" before "state that began here."
	// Without this tiebreak, insertion order decides and feels arbitrary.
	const sortedByDate = [...events].sort((a, b) => {
		if (a.date && b.date) {
			const cmp = compareDates(a.date, b.date, a.universe, b.universe, dateService);
			if (cmp !== 0) return cmp;
			return compareRangeKind(a, b);
		}
		if (a.date) return -1;
		if (b.date) return 1;
		return a.title.localeCompare(b.title);
	});

	// Add events with no dependencies to the queue
	for (const event of sortedByDate) {
		if (inDegree.get(event.crId) === 0) {
			queue.push(event);
		}
	}

	// Process the queue
	const sortedOrder: EventNote[] = [];
	const visited = new Set<string>();

	while (queue.length > 0) {
		// Sort queue by date for stable ordering, with the same
		// point-before-range tiebreak as the initial sort (#569).
		queue.sort((a, b) => {
			if (a.date && b.date) {
				const cmp = compareDates(a.date, b.date, a.universe, b.universe, dateService);
				if (cmp !== 0) return cmp;
				return compareRangeKind(a, b);
			}
			if (a.date) return -1;
			if (b.date) return 1;
			return a.title.localeCompare(b.title);
		});

		const event = queue.shift()!;

		if (visited.has(event.crId)) {
			continue;
		}

		visited.add(event.crId);
		sortedOrder.push(event);

		// Process outgoing edges
		for (const neighborId of graph.get(event.crId) || []) {
			const newDegree = (inDegree.get(neighborId) || 1) - 1;
			inDegree.set(neighborId, newDegree);

			if (newDegree === 0 && !visited.has(neighborId)) {
				const neighbor = eventByCrId.get(neighborId);
				if (neighbor) {
					queue.push(neighbor);
				}
			}
		}
	}

	// Check for cycles (events that weren't visited)
	for (const event of events) {
		if (!visited.has(event.crId)) {
			result.cycleEvents.push(event.title);
			result.cycleEventNotes.push({ title: event.title, file: event.file });
		}
	}

	if (result.cycleEvents.length > 0) {
		logger.warn('computeSortOrder', `Detected cycles involving ${result.cycleEvents.length} event(s): ${result.cycleEvents.join(', ')}`);
	}

	// Assign sort_order values and update frontmatter
	for (let i = 0; i < sortedOrder.length; i++) {
		const event = sortedOrder[i];
		const sortOrder = (i + 1) * 10; // Use increments of 10 for flexibility

		// Only update if the value changed
		if (event.sortOrder !== sortOrder) {
			try {
				await updateEventSortOrder(app, event.file, sortOrder);
				result.updatedCount++;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				result.errors.push(`Failed to update ${event.title}: ${errorMsg}`);
				logger.error('computeSortOrder', `Failed to update ${event.filePath}`, error);
			}
		}
	}

	logger.info('computeSortOrder', `Updated sort_order for ${result.updatedCount} events`);
	return result;
}

/**
 * Update the sort_order property in an event note's frontmatter
 */
async function updateEventSortOrder(app: App, file: TFile, sortOrder: number): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.sort_order = sortOrder;
	});
}

/**
 * Normalize a wikilink to a path for lookup
 */
function normalizeWikilink(link: string): string {
	return link
		.replace(/^\[\[/, '')
		.replace(/\]\]$/, '')
		.trim();
}

/**
 * Compare two date strings for sorting.
 *
 * When a `DateService` is provided and both inputs parse to canonical years,
 * comparison uses those — so multi-era fictional dates like `EF 10`
 * (canonical -90 with EF epoch -100) sort correctly against `DE 5` (canonical
 * 5 with DE epoch 0) regardless of era-abbreviation alphabetical order
 * (#564). Without a service, or for inputs neither side can parse, falls
 * back to a leading-integer regex that handles ISO format and negative
 * years — same behavior as the pre-#564 implementation.
 *
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
/**
 * Tiebreak comparator for two events sharing a start date (#569). When
 * one event has a `date_end` (range event) and the other doesn't (point
 * event), the point event sorts first. Returns 0 when both are the same
 * kind so the next tier of tiebreaks can decide.
 */
export function compareRangeKind(a: EventNote, b: EventNote): number {
	const aIsRange = !!a.dateEnd;
	const bIsRange = !!b.dateEnd;
	if (aIsRange === bIsRange) return 0;
	return aIsRange ? 1 : -1;
}

function compareDates(
	a: string,
	b: string,
	aUniverse?: string,
	bUniverse?: string,
	dateService?: DateService | null
): number {
	if (dateService) {
		const parsedA = dateService.parseDate(a, aUniverse);
		const parsedB = dateService.parseDate(b, bUniverse);
		if (parsedA?.year != null && parsedB?.year != null) {
			if (parsedA.year !== parsedB.year) {
				return parsedA.year - parsedB.year;
			}
			// Same canonical year: order by month/day when fictional dates carry
			// sub-year precision, so e.g. two same-year era dates sort by month
			// rather than by raw-string compare (#722). A year-precision date
			// (no month) sorts as the start of the year.
			const fa = parsedA.fictional;
			const fb = parsedB.fictional;
			if (fa && fb) {
				const monthDiff = (fa.month ?? 0) - (fb.month ?? 0);
				if (monthDiff !== 0) return monthDiff;
				const dayDiff = (fa.day ?? 0) - (fb.day ?? 0);
				if (dayDiff !== 0) return dayDiff;
			}
			return a.localeCompare(b);
		}
	}

	// Fallback: leading-integer extraction (ISO + negative years).
	const extractYear = (date: string): number => {
		const match = date.match(/^(-?\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	};

	const yearA = extractYear(a);
	const yearB = extractYear(b);

	if (yearA !== yearB) {
		return yearA - yearB;
	}

	return a.localeCompare(b);
}

/**
 * Clear sort_order values from all events
 */
export async function clearSortOrder(
	app: App,
	events: EventNote[]
): Promise<number> {
	let clearedCount = 0;

	for (const event of events) {
		if (event.sortOrder !== undefined) {
			try {
				await app.fileManager.processFrontMatter(event.file, (frontmatter) => {
					delete frontmatter.sort_order;
				});
				clearedCount++;
			} catch (error) {
				logger.error('clearSortOrder', `Failed to clear sort_order for ${event.filePath}`, error);
			}
		}
	}

	logger.info('clearSortOrder', `Cleared sort_order from ${clearedCount} events`);
	return clearedCount;
}

/* eslint-enable @typescript-eslint/no-unsafe-member-access -- Match scope of file-level disable at top. */
