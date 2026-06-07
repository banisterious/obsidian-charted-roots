/**
 * Timeline Renderer
 *
 * Renders timeline HTML for the charted-roots-timeline code block.
 * Creates a styled list of events with dates and descriptions.
 */

import { MarkdownRenderer, MarkdownRenderChild, setIcon, TFile } from 'obsidian';
import type { DynamicBlockContext, DynamicBlockConfig } from '../services/dynamic-content-service';
import type { DynamicContentService } from '../services/dynamic-content-service';
import type { PersonNode, FamilyGraphService } from '../../core/family-graph';
import type { DateService } from '../../dates/services/date-service';
import { getEventType, type EventTypeDefinition } from '../../events/types/event-types';
import type { LucideIconName } from '../../ui/lucide-icons';
import { capitalize } from '../../utils/format-utils';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';

/**
 * Event types that should ALWAYS show title, never description (#157)
 * Most event types show description when available, but these fundamental
 * life events are more meaningful with the person's name in the title.
 */
const TITLE_ONLY_TYPES = ['birth', 'death'];

/**
 * Heuristic: does the input look like a fictional-era date (era abbreviation
 * adjacent to a year number, in either order)? Used by `computeEventAge`'s
 * fallback to avoid era-stripping age math when DateService can't parse the
 * input (#565). Intentionally permissive on era-abbrev length — Charted
 * Roots supports any letter run as an era abbreviation.
 */
export function looksLikeFictionalDate(date: string | undefined): boolean {
	if (typeof date !== 'string') return false;
	const trimmed = date.trim();
	// "EF 30", "EF30", "30 EF", "30EF" — at least one letter group + digit
	// group adjacent (with optional whitespace).
	return /^[A-Za-z]+\s*\d+|\d+\s*[A-Za-z]+$/.test(trimmed);
}

/**
 * Gregorian context-note line: optional bullet, a 4-digit start year (with
 * optional ISO month/day), an optional range end (`–`/`-` then another
 * 4-digit year), then `: <title>`. Kept verbatim from the original inline
 * regex so every real-world context note parses exactly as before; fictional
 * eras are handled by the fallback in `parseContextLine`.
 */
const CONTEXT_GREGORIAN_LINE_REGEX = /^(?:[-*]\s+)?(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*(?:[-–]\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?))?:\s*(.+)$/;

/** A context-note line split into its raw date token(s) and title. */
export interface ParsedContextLine {
	/** Raw start-date token (e.g. "1914", "1929-10-29", "BBY 32", "32 BBY"). */
	startRaw: string;
	/** Raw end-date token for a range, if present. */
	endRaw?: string;
	title: string;
}

/**
 * Parse a single context-note list line into its date token(s) + title.
 *
 * Real-world dates go through the original Gregorian regex unchanged. Lines
 * that the Gregorian regex rejects get a fictional-era fallback (#693): split
 * on the first colon into a date region + title, accept the region only when
 * it looks like a fictional date (an era abbreviation adjacent to a year, in
 * either order — so prose lines are still skipped), and split an optional
 * range on an explicit separator (en/em-dash, spaced hyphen, or "to"). The
 * raw tokens are resolved to years/eras later via DateService, mirroring how
 * the person's own events are handled. Returns null for non-event lines.
 */
export function parseContextLine(line: string): ParsedContextLine | null {
	const trimmed = line.trim();

	const gMatch = trimmed.match(CONTEXT_GREGORIAN_LINE_REGEX);
	if (gMatch) {
		return { startRaw: gMatch[1], endRaw: gMatch[2] || undefined, title: gMatch[3].trim() };
	}

	// Fictional-era fallback. Split on the FIRST colon so titles may contain
	// their own colons, matching the Gregorian regex's greedy-title behavior.
	const noBullet = trimmed.replace(/^[-*]\s+/, '');
	const colonIdx = noBullet.indexOf(':');
	if (colonIdx === -1) return null;
	const dateRegion = noBullet.slice(0, colonIdx).trim();
	const title = noBullet.slice(colonIdx + 1).trim();
	if (!title) return null;
	// Gate on the fictional-date shape so headings / prose ("Note: ...") are
	// skipped; pure-numeric and ISO dates already matched the Gregorian path.
	if (!looksLikeFictionalDate(dateRegion)) return null;

	const parts = dateRegion.split(/\s*[–—]\s*|\s+-\s+|\s+to\s+/);
	const startRaw = parts[0].trim();
	const endRaw = parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
	if (!startRaw) return null;
	return { startRaw, endRaw, title };
}

/**
 * Timeline entry combining events from EventService with person birth/death
 */
export interface TimelineEntry {
	date: string;
	year: string;
	type: string;
	title: string;
	place?: string;
	description?: string;
	/** For linking to the event note */
	eventFile?: string;
	/** Whether this is a historical context event (not a person event) */
	isContext?: boolean;
	/** Whether this is a family member's event (child birth, spouse death, etc.) */
	isFamilyEvent?: boolean;
	/** Whether this is a section divider (for grouped layout) */
	isSectionDivider?: boolean;
	/** Age of the person at the time of this event */
	age?: number;
	/**
	 * Raw source date string before `formatDate` transforms it. Used as a
	 * sort tiebreak when entries share a year (#609 — twin / triplet
	 * disambiguation). Preserves the time suffix on ISO dates
	 * (`1985-04-12T03:42`) and fictional-era dates (`BBY 29 T20:03:04`),
	 * both of which `formatDate` strips or rewrites for display.
	 */
	rawDate?: string;
	/**
	 * Topological sort_order value from the event's frontmatter, populated
	 * by the v0.22.45 #569 auto-compute service from `before`/`after`
	 * relationships. Used as a same-year tiebreak so events with explicit
	 * ordering constraints render in the right narrative order (#625).
	 * Undefined for non-Event-derived entries (birth/death from the Person
	 * model, family events from relationship walks, context events).
	 */
	sortOrder?: number;
}

/**
 * Compare two timeline entries by year, with raw-date string lex compare
 * as the tiebreak so twins / triplets sharing a year sort by their ISO-time
 * or fictional-time suffix when present (#609). Identical raw dates fall
 * through to a 0 return, leaving the surrounding `Array.prototype.sort` to
 * preserve insertion order (stable sort guaranteed by ES2019).
 *
 * `sortOrder` inverts both the year compare and the raw-date tiebreak, so
 * reverse-chronological timelines still order twins consistently (the
 * firstborn ends up in the "earlier" slot relative to the rendering direction).
 *
 * Exported for unit testing; in production this is used by the three sort
 * sites in `TimelineRenderer` (main, template-section, secondary builder).
 */
/**
 * True iff either rawDate in the pair parses as a fictional date in a
 * backward-direction era (BBY / BC / etc.). The two same-year tiebreaks —
 * `sort_order` (#625, #638) and rawDate (#609) — both invert when this
 * predicate fires so they track the year sort's old-at-bottom direction.
 * Keeping the check in one place stops the two tiebreaks from drifting
 * apart if either changes later.
 */
function isBackwardEraPair(
	rawA: string,
	rawB: string,
	dateService: DateService | null | undefined
): boolean {
	if (!dateService) return false;
	const parsedA = rawA ? dateService.parseDate(rawA) : null;
	const parsedB = rawB ? dateService.parseDate(rawB) : null;
	return (
		(parsedA?.type === 'fictional' && parsedA.fictional?.era?.direction === 'backward') ||
		(parsedB?.type === 'fictional' && parsedB.fictional?.era?.direction === 'backward')
	);
}

export function compareTimelineEntriesByDate(
	a: TimelineEntry,
	b: TimelineEntry,
	sortOrder: 'chronological' | 'reverse',
	dateService?: DateService | null
): number {
	const yearA = parseInt(a.year) || 0;
	const yearB = parseInt(b.year) || 0;
	if (yearA !== yearB) {
		return sortOrder === 'reverse' ? yearB - yearA : yearA - yearB;
	}
	const rawA = a.rawDate || '';
	const rawB = b.rawDate || '';
	const backward = isBackwardEraPair(rawA, rawB, dateService);
	// Same-year tiebreak: respect `sort_order` topological values when both
	// entries have them (#625). Events with `before`/`after` frontmatter
	// receive sort_order values from the v0.22.45 #569 auto-compute
	// service; per-person timelines were missed in that sweep. The check
	// only fires when BOTH entries have a value, so events without
	// before/after constraints (birth from person, marriage, family events,
	// context entries) continue to fall through to the rawDate tiebreak
	// below rather than mixing with explicitly-ordered events. In a
	// backward-era pair, invert so the topological order follows the
	// year sort's old-at-bottom direction (#638).
	if (a.sortOrder !== undefined && b.sortOrder !== undefined && a.sortOrder !== b.sortOrder) {
		let cmp = a.sortOrder - b.sortOrder;
		if (backward) cmp = -cmp;
		return sortOrder === 'reverse' ? -cmp : cmp;
	}
	if (rawA !== rawB) {
		// For descending-era rawDates (BBY / BC / etc.), the literal lex
		// compare on the era-prefixed string puts firstborn-at-top, but
		// the surrounding year sort renders descending eras with old-at-
		// bottom (parseInt is era-blind, so BBY 18 sorts before BBY 80).
		// Invert the tiebreak so same-year twins follow the same direction
		// as their year neighbours and the firstborn lands in the slot the
		// reader expects (#609 follow-on to v0.22.48's #609 fix).
		let cmp = rawA < rawB ? -1 : 1;
		if (backward) cmp = -cmp;
		return sortOrder === 'reverse' ? -cmp : cmp;
	}
	return 0;
}

/**
 * Icon (and optional color) for a family-event timeline row (#632).
 *
 * Adoption family events — the adoptive parent's `Adopted {name}` row and the
 * adopted-sibling / adopted-grandchild `Adoption of {name}` rows added in
 * #621/#623 — reuse the built-in `adoption` event type so their icon and
 * warm-orange color match the focal person's own `Adopted` row (#627), keeping
 * continuity across every Dynamic Timeline surface. All other family events use
 * the generic `users` icon; birth rows stay on `users` because they're typed
 * `family_birth`, not `adoption`. Falls back to `users` if the adoption type is
 * unavailable (e.g. built-ins disabled with no custom override).
 */
export function resolveFamilyEventIcon(
	type: string,
	customEventTypes: EventTypeDefinition[] = [],
	showBuiltInEventTypes = true
): { icon: LucideIconName; color?: string } {
	if (type === 'adoption') {
		const adoptionType = getEventType('adoption', customEventTypes, showBuiltInEventTypes);
		if (adoptionType) {
			return { icon: adoptionType.icon, color: adoptionType.color };
		}
	}
	return { icon: 'users' as LucideIconName };
}

/**
 * Renders timeline content into an HTML element
 */
export class TimelineRenderer {
	private service: DynamicContentService;
	/** Store entries for freeze functionality */
	private currentEntries: TimelineEntry[] = [];
	private currentContext: DynamicBlockContext | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Compute event age via DateService when available, falling back to
	 * naive year subtraction. Returns undefined when neither path produces
	 * a value.
	 *
	 * The naive `entryYear - birthYear` form (with `entryYear >= birthYear`
	 * guard) breaks for descending fictional eras like BBY, where years
	 * count down — `26 BBY >= 82 BBY` evaluates as `26 >= 82` (false), so
	 * age is never assigned. DateService.calculateAge handles canonical-year
	 * semantics across both directions. Same fix shape as #434 / #437.
	 */
	private computeEventAge(
		birthDate: string | undefined,
		eventDate: string | undefined,
		universe: string | undefined
	): number | undefined {
		if (!birthDate || !eventDate) return undefined;

		const dateService = this.service.getDateService();
		if (dateService) {
			const age = dateService.calculateAge(birthDate, eventDate, universe);
			if (age !== null) {
				// DateService resolved the calculation. The fictional parser
				// returns `Math.abs(years)` with an `error` field set when the
				// dates are reversed (event predates birth) — treat that as
				// "no age to render" rather than falling through to the naive
				// fallback, which would produce the wrong answer for
				// descending fictional eras.
				if (age.error) return undefined;
				return age.years >= 0 ? age.years : undefined;
			}
		}

		// Fallback only when DateService returned null (couldn't parse either
		// date) or wasn't available. Covers real-world ISO dates, plain years,
		// and unrecognized fictional formats.
		//
		// Bail when either input has the shape of a fictional date (a letter
		// run plus a digit run) — the fallback uses extractYear, which strips
		// era prefixes and produces era-local digits. For multi-era inputs
		// like EF 30 vs DE 100, subtracting era-local years yields an answer
		// off by the era epoch (#565). Returning undefined for these is safer
		// than rendering a silently wrong "age N" annotation.
		if (looksLikeFictionalDate(birthDate) || looksLikeFictionalDate(eventDate)) {
			return undefined;
		}

		const birthYear = parseInt(this.service.extractYear(birthDate));
		const eventYear = parseInt(this.service.extractYear(eventDate));
		if (!isNaN(birthYear) && !isNaN(eventYear) && eventYear >= birthYear) {
			return eventYear - birthYear;
		}

		return undefined;
	}

	/**
	 * Whether a relative-event date falls after the focal person's death,
	 * i.e., outside their reality window. Used to filter spouse / parent
	 * deaths and similar relative-event surfaces (#457).
	 *
	 * Returns false (event allowed) when the focal person has no death
	 * date, or when either date can't be resolved — only filters when we
	 * have unambiguous evidence the event happened after the focal person
	 * died. Same-year events are allowed (intra-year ordering unknown).
	 */
	private isEventAfterFocalDeath(
		focalDeathDate: string | undefined,
		eventDate: string | undefined,
		universe: string | undefined
	): boolean {
		if (!focalDeathDate || !eventDate) return false;

		const dateService = this.service.getDateService();
		if (!dateService) return false;

		const focalYear = dateService.getCanonicalYear(focalDeathDate, universe);
		const eventYear = dateService.getCanonicalYear(eventDate, universe);
		if (focalYear === null || eventYear === null) return false;

		return eventYear > focalYear;
	}

	/**
	 * Whether a relative-event date falls before the focal person's birth,
	 * i.e., outside the front edge of their reality window. Used to filter
	 * sibling births where an older sibling's birth would otherwise appear
	 * before the focal person's own birth on their timeline (#469).
	 *
	 * Returns false (event allowed) when the focal person has no birth
	 * date, or when either date can't be resolved — only filters when we
	 * have unambiguous evidence the event happened before the focal person
	 * was born. Same-year events are allowed (intra-year ordering unknown).
	 */
	private isEventBeforeFocalBirth(
		focalBirthDate: string | undefined,
		eventDate: string | undefined,
		universe: string | undefined
	): boolean {
		if (!focalBirthDate || !eventDate) return false;

		const dateService = this.service.getDateService();
		if (!dateService) return false;

		const focalYear = dateService.getCanonicalYear(focalBirthDate, universe);
		const eventYear = dateService.getCanonicalYear(eventDate, universe);
		if (focalYear === null || eventYear === null) return false;

		return eventYear < focalYear;
	}

	/**
	 * Render the timeline block
	 */
	async render(
		el: HTMLElement,
		context: DynamicBlockContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-timeline' });

		// Build timeline entries (including context events)
		const entries = await this.buildTimelineEntriesWithContext(context, config);

		// Store for freeze functionality
		this.currentEntries = entries;
		this.currentContext = context;

		// Render header (needs entries for freeze)
		this.renderHeader(container, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (entries.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No events found for this person.'
			});
			return;
		}

		// Check for template-based rendering (Phase 4)
		const settings = this.service.getSettings();
		const templateParam = (config.template as string | undefined) || settings.defaultTimelineTemplate;
		if (templateParam) {
			await this.renderWithTemplate(contentEl, entries, context, component, templateParam);
			return;
		}

		// Render timeline list
		await this.renderTimelineList(contentEl, entries, context, component, config);
	}

	/**
	 * Render the header with title and toolbar
	 */
	private renderHeader(container: HTMLElement, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const title = config.title as string || 'Timeline';
		header.createSpan({ cls: 'cr-dynamic-block__title', text: title });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

		// Freeze button
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to Markdown' }
		});
		freezeBtn.textContent = '❄️';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});

		// Copy button
		const copyBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Copy timeline' }
		});
		copyBtn.textContent = '📋';
		copyBtn.addEventListener('click', () => {
			this.copyTimelineToClipboard(container);
		});
	}

	/**
	 * Build timeline entries with context events merged in
	 */
	private async buildTimelineEntriesWithContext(
		context: DynamicBlockContext,
		config: DynamicBlockConfig
	): Promise<TimelineEntry[]> {
		const entries = this.buildTimelineEntries(context, config);

		// Add age annotations to person events. Uses DateService when available
		// so descending fictional eras (BBY) and era crossings resolve correctly;
		// falls back to naive year subtraction for real-world dates.
		const birthDate = context.person?.birthDate;
		const universe = context.person?.universe;
		if (birthDate) {
			for (const entry of entries) {
				const age = this.computeEventAge(birthDate, entry.date || entry.year, universe);
				if (age !== undefined) {
					entry.age = age;
				}
			}
		}

		// Add family events if enabled (and not suppressed by per-block override)
		const familyEventsParam = config.familyEvents as string | undefined;
		if (familyEventsParam !== 'none' && context.person) {
			const familyEntries = this.gatherFamilyEvents(context);
			entries.push(...familyEntries);
		}

		// Resolve context note path
		const contextParam = config.context as string | undefined;
		const settings = this.service.getSettings();
		const contextValue = (contextParam !== 'none') ? (contextParam || settings.defaultTimelineContext) : '';;

		if (contextValue) {
			const contextPath = extractWikilinkPath(contextValue);
			const contextEntries = await this.parseContextNote(contextPath, context);

			// Filter context events by margin (0 = no filtering, default)
			const margin = typeof config.contextMargin === 'number'
				? config.contextMargin
				: (settings.contextLifespanMargin ?? 0);

			if (margin > 0) {
				// Use only the person's own events (not family or context) for margin range
				const personYears = entries
					.filter(e => !e.isContext && !e.isFamilyEvent)
					.map(e => parseInt(e.year))
					.filter(y => !isNaN(y));
				if (personYears.length > 0) {
					const minYear = Math.min(...personYears) - margin;
					const maxYear = Math.max(...personYears) + margin;
					const filtered = contextEntries.filter(e => {
						const year = parseInt(e.year);
						return !isNaN(year) && year >= minYear && year <= maxYear;
					});
					entries.push(...filtered);
				} else {
					entries.push(...contextEntries);
				}
			} else {
				entries.push(...contextEntries);
			}
		}

		// Apply layout mode
		const layout = (config.layout as string) || settings.timelineLayout || 'chronological';
		const sortOrder = (config.sort as string === 'reverse' ? 'reverse' : 'chronological');
		const sortFn = (a: TimelineEntry, b: TimelineEntry) =>
			compareTimelineEntriesByDate(a, b, sortOrder, this.service.getDateService());

		if (layout === 'grouped') {
			// Partition into personal, family, context — each sorted internally
			const personal = entries.filter(e => !e.isFamilyEvent && !e.isContext);
			const family = entries.filter(e => e.isFamilyEvent);
			const context = entries.filter(e => e.isContext);
			personal.sort(sortFn);
			family.sort(sortFn);
			context.sort(sortFn);

			// Add section markers
			const result: TimelineEntry[] = [];
			if (personal.length > 0) {
				result.push({ date: '', year: '', type: 'section_divider', title: 'Life events', isSectionDivider: true });
				result.push(...personal);
			}
			if (family.length > 0) {
				result.push({ date: '', year: '', type: 'section_divider', title: 'Family events', isSectionDivider: true });
				result.push(...family);
			}
			if (context.length > 0) {
				result.push({ date: '', year: '', type: 'section_divider', title: 'Historical context', isSectionDivider: true });
				result.push(...context);
			}
			return result;
		} else if (layout === 'personal-first') {
			// Personal events first (sorted), then everything else (sorted)
			const personal = entries.filter(e => !e.isFamilyEvent && !e.isContext);
			const others = entries.filter(e => e.isFamilyEvent || e.isContext);
			personal.sort(sortFn);
			others.sort(sortFn);
			return [...personal, ...others];
		} else {
			// chronological — all interleaved
			entries.sort(sortFn);
			return entries;
		}
	}

	/**
	 * Parse a context note for historical events.
	 * Expected format: markdown list items with date prefix.
	 *   - 1861-1865: American Civil War
	 *   - 1914: World War I begins
	 *   - 1929-10-29: Black Tuesday
	 */
	private async parseContextNote(
		notePath: string,
		context: DynamicBlockContext
	): Promise<TimelineEntry[]> {
		const app = this.service.getApp();
		const file = app.metadataCache.getFirstLinkpathDest(notePath, context.file.path);
		if (!(file instanceof TFile)) return [];

		const content = await app.vault.read(file);
		const entries: TimelineEntry[] = [];

		const birthDate = context.person?.birthDate;
		const universe = context.person?.universe;

		// Supported line formats (bullet optional):
		//   - 1861-1865: Event   1914: Event   * 1929-10-29: Event
		//   - BBY 32: Event      32 BBY – 22 BBY: Event   (fictional eras, #693)
		for (const line of content.split('\n')) {
			const parsed = parseContextLine(line);
			if (!parsed) continue;

			const { startRaw, endRaw, title } = parsed;
			// `extractYear` strips era prefixes to digits, so it's parseInt-safe
			// for the sort comparator and matches what person/family events store
			// in `year`. The raw token stays in `date`/`rawDate` so the era-aware
			// display (formatYearForDisplay) and backward-era sort tiebreak work.
			const startYear = this.service.extractYear(startRaw);
			const endYear = endRaw ? this.service.extractYear(endRaw) : '';
			const displayYear = endYear ? `${startYear}–${endYear}` : startYear;

			const entry: TimelineEntry = {
				date: startRaw,
				year: displayYear,
				type: 'context',
				title,
				isContext: true,
				rawDate: startRaw
			};

			// Add age annotation for context events too
			const age = this.computeEventAge(birthDate, startRaw, universe);
			if (age !== undefined) {
				entry.age = age;
			}

			entries.push(entry);
		}

		return entries;
	}

	/**
	 * Gather family events (children's births, spouse deaths, etc.)
	 * based on settings toggles
	 */
	/**
	 * Apply a label template, replacing `{name}` with the person's name
	 * and (optionally) any additional placeholders supplied via `extras`.
	 * Used by the children's-marriage label (#607) to substitute `{spouse}`
	 * alongside `{name}`.
	 */
	private applyLabel(template: string, name: string, extras?: Record<string, string>): string {
		let out = template.replace(/\{name\}/g, name);
		if (extras) {
			for (const [key, value] of Object.entries(extras)) {
				out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
			}
		}
		return out;
	}

	/**
	 * Render a timeline entry using a format string.
	 * Supported placeholders: {year}, {date}, {type}, {title}, {place}, {age}
	 */
	private renderFormattedEntry(
		li: HTMLElement,
		entry: TimelineEntry,
		format: string,
		context: DynamicBlockContext,
		component: MarkdownRenderChild
	): void {
		// Strip surrounding quotes if present (YAML may include them)
		const cleanFormat = format.replace(/^["']|["']$/g, '');

		// Build substitution values. Use formatYearForDisplay so fictional-era
		// abbreviations (BBY/ABY/EF/DE/etc.) survive into the rendered output;
		// `entry.year` alone is era-stripped digits suitable for math but not
		// for display (#563).
		const displayYear = this.service.formatYearForDisplay(entry.date, context.person?.universe);
		const values: Record<string, string> = {
			year: displayYear || entry.year || entry.date || '?',
			date: entry.date || entry.year || '?',
			type: capitalize(entry.type),
			title: entry.title,
			place: entry.place || '',
			age: entry.age !== undefined ? `age ${entry.age}` : ''
		};

		// Parse format string into segments
		const segments = cleanFormat.split(/(\{[a-z]+\})/g);

		for (const segment of segments) {
			const match = segment.match(/^\{([a-z]+)\}$/);
			if (match) {
				const key = match[1];
				const value = values[key];
				if (value) {
					if (key === 'year') {
						li.createSpan({ cls: 'cr-timeline__year', text: value });
					} else if (key === 'age') {
						li.createSpan({ cls: 'cr-timeline__age', text: value });
					} else if (key === 'place' && entry.place) {
						li.createSpan({ cls: 'cr-timeline__place', text: value });
					} else if (key === 'title') {
						const titleSpan = li.createSpan({ cls: 'cr-timeline__title' });
						if (entry.eventFile) {
							void MarkdownRenderer.render(
								context.familyGraph['app'],
								`[[${entry.eventFile}|${value}]]`,
								titleSpan,
								context.file.path,
								component
							);
						} else {
							titleSpan.textContent = value;
						}
					} else {
						li.appendText(value);
					}
				}
			} else if (segment) {
				// Literal text — skip trailing "in " if place is empty
				let text = segment;
				if (!entry.place) {
					text = text.replace(/\s+in\s*$/, '');
				}
				if (text) {
					// Replace regular spaces with non-breaking spaces to prevent
					// whitespace collapse from adjacent block-level elements
					const nbspText = text.replace(/ /g, '\u00A0');
					li.createSpan({ text: nbspText, cls: 'cr-timeline__literal' });
				}
			}
		}
	}

	/**
	 * Template section definition parsed from a template note
	 */
	private parseTemplateNote(content: string): Array<{ title: string; sort?: string; include?: string[]; format?: string }> {
		const sections: Array<{ title: string; sort?: string; include?: string[]; format?: string }> = [];
		let currentSection: { title: string; sort?: string; include?: string[]; format?: string } | null = null;

		for (const line of content.split('\n')) {
			const trimmed = line.trim();

			// Section header (## Title)
			const headerMatch = trimmed.match(/^##\s+(.+)$/);
			if (headerMatch) {
				if (currentSection) sections.push(currentSection);
				currentSection = { title: headerMatch[1] };
				continue;
			}

			if (!currentSection) continue;

			// Key: value pairs
			const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
			if (kvMatch) {
				const [, key, value] = kvMatch;
				if (key === 'sort') currentSection.sort = value.trim();
				if (key === 'include') currentSection.include = value.split(',').map(s => s.trim());
				if (key === 'format') currentSection.format = value.trim().replace(/^["']|["']$/g, '');
			}
		}

		if (currentSection) sections.push(currentSection);
		return sections;
	}

	/**
	 * Render timeline entries using a template note
	 */
	private async renderWithTemplate(
		contentEl: HTMLElement,
		allEntries: TimelineEntry[],
		context: DynamicBlockContext,
		component: MarkdownRenderChild,
		templateParam: string
	): Promise<void> {
		const app = this.service.getApp();
		const templatePath = extractWikilinkPath(templateParam);
		const templateFile = app.metadataCache.getFirstLinkpathDest(templatePath, context.file.path);

		if (!(templateFile instanceof TFile)) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: `Template note not found: ${templatePath}`
			});
			return;
		}

		const templateContent = await app.vault.read(templateFile);
		const sections = this.parseTemplateNote(templateContent);

		if (sections.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No sections found in template note. Use ## headings to define sections.'
			});
			return;
		}

		// Category mapping for include filters
		const categoryMap: Record<string, (e: TimelineEntry) => boolean> = {
			'children_births': e => e.isFamilyEvent === true && e.type === 'family_birth' && e.title.startsWith(this.service.getSettings().timelineChildBirthLabel?.split('{')[0] || 'Birth of'),
			'spouse_deaths': e => e.isFamilyEvent === true && e.type === 'family_death',
			'parent_deaths': e => e.isFamilyEvent === true && e.type === 'family_death',
			'sibling_births': e => e.isFamilyEvent === true && e.type === 'family_birth',
			'children_marriages': e => e.isFamilyEvent === true && e.type === 'family_child_marriage',
			'parent_marriages': e => e.isFamilyEvent === true && e.type === 'family_parent_marriage',
			'sibling_marriages': e => e.isFamilyEvent === true && e.type === 'family_sibling_marriage',
			'context': e => e.isContext === true,
			'family': e => e.isFamilyEvent === true,
			'personal': e => !e.isFamilyEvent && !e.isContext
		};

		const list = contentEl.createEl('ul', { cls: 'cr-timeline__list' });

		for (const section of sections) {
			// Section divider
			const divider = list.createEl('li', { cls: 'cr-timeline__section-divider' });
			divider.createSpan({ text: section.title, cls: 'cr-timeline__section-title' });

			// Filter entries for this section
			let sectionEntries: TimelineEntry[];
			if (section.include && section.include.length > 0) {
				sectionEntries = allEntries.filter(entry => {
					for (const inc of section.include!) {
						// Check category filters
						if (categoryMap[inc]) {
							if (categoryMap[inc](entry)) return true;
						}
						// Check event type match
						if (entry.type === inc) return true;
					}
					return false;
				});
			} else {
				// No include filter — show all remaining entries
				sectionEntries = [...allEntries];
			}

			const sortOrder = (section.sort === 'reverse' ? 'reverse' : 'chronological');
			sectionEntries.sort((a, b) => compareTimelineEntriesByDate(a, b, sortOrder, this.service.getDateService()));

			// Render entries
			for (const entry of sectionEntries) {
				let itemCls = 'cr-timeline__item';
				if (entry.isContext) itemCls += ' cr-timeline__item--context';
				if (entry.isFamilyEvent) itemCls += ' cr-timeline__item--family';
				const li = list.createEl('li', { cls: itemCls });

				if (section.format) {
					this.renderFormattedEntry(li, entry, section.format, context, component);
				} else {
					// Minimal default rendering. Prefer the era-aware display
					// when DateService can parse the entry's raw date as
					// fictional (#563); fall back to the digit-only year for
					// standard inputs or section-divider entries.
					const displayYear = this.service.formatYearForDisplay(entry.date, context.person?.universe);
					li.createSpan({ cls: 'cr-timeline__year', text: displayYear || entry.year || '?' });
					if (entry.age !== undefined) {
						li.createSpan({ cls: 'cr-timeline__age', text: `age ${entry.age}` });
					}
					li.createSpan({ cls: 'cr-timeline__separator', text: ' — ' });
					const titleSpan = li.createSpan({ cls: 'cr-timeline__title' });
					if (entry.eventFile) {
						await MarkdownRenderer.render(
							context.familyGraph['app'],
							`[[${entry.eventFile}|${entry.title}]]`,
							titleSpan,
							context.file.path,
							component
						);
					} else {
						titleSpan.textContent = entry.title;
					}
					if (entry.place) {
						li.appendText('\u00A0');
						li.createSpan({ cls: 'cr-timeline__place', text: `in ${entry.place}` });
					}
				}
			}

			if (sectionEntries.length === 0) {
				const emptyLi = list.createEl('li', { cls: 'cr-timeline__item' });
				emptyLi.createSpan({ cls: 'cr-timeline__title', text: 'No events' });
			}
		}
	}

	private gatherFamilyEvents(
		context: DynamicBlockContext
	): TimelineEntry[] {
		const settings = this.service.getSettings();
		const person = context.person;
		if (!person) return [];

		const entries: TimelineEntry[] = [];
		const graph = context.familyGraph;
		const birthDate = person.birthDate;
		const universe = person.universe;

		// Children's births (biological only — adopted children are handled
		// separately by the adopted-children block below, gated on
		// timelineShowAdoptedChildrenBirths; stepchildren are excluded entirely,
		// because the principal-of-the-birth-event was the biological parent
		// alone, and a stepparent wasn't around for the birth (#441). Anyone
		// in both childrenCrIds and adoptedChildCrIds, or in stepchildrenCrIds,
		// is skipped here so the toggles stay independent and stepkids' births
		// don't leak onto stepparents' timelines.
		if (settings.timelineShowChildrenBirths && person.childrenCrIds) {
			const adoptedSet = new Set(person.adoptedChildCrIds || []);
			const stepchildSet = new Set(person.stepchildrenCrIds || []);
			for (const childCrId of person.childrenCrIds) {
				if (adoptedSet.has(childCrId)) continue;
				if (stepchildSet.has(childCrId)) continue;
				const child = graph.getPersonByCrId(childCrId);
				if (child?.birthDate) {
					const year = this.service.extractYear(child.birthDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(child.birthDate),
						year,
						type: 'family_birth',
						title: this.applyLabel(settings.timelineChildBirthLabel || 'Birth of {name}', child.name),
						eventFile: child.file?.basename,
						isFamilyEvent: true,
						rawDate: child.birthDate
					};
					const age = this.computeEventAge(birthDate, child.birthDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Spouse deaths. Skip events that happened after the focal person
		// died — those aren't part of the focal person's lived experience
		// (#457).
		if (settings.timelineShowSpouseDeaths && person.spouseCrIds) {
			for (const spouseCrId of person.spouseCrIds) {
				const spouse = graph.getPersonByCrId(spouseCrId);
				if (spouse?.deathDate) {
					if (this.isEventAfterFocalDeath(person.deathDate, spouse.deathDate, universe)) continue;
					const year = this.service.extractYear(spouse.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineSpouseDeathLabel || 'Death of {name}', spouse.name),
						eventFile: spouse.file?.basename,
						isFamilyEvent: true,
						rawDate: spouse.deathDate
					};
					const age = this.computeEventAge(birthDate, spouse.deathDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Parent deaths
		if (settings.timelineShowParentDeaths) {
			const parentCrIds = [
				person.fatherCrId,
				person.motherCrId,
				...(person.parentCrIds || [])
			].filter(Boolean) as string[];

			for (const parentCrId of parentCrIds) {
				const parent = graph.getPersonByCrId(parentCrId);
				if (parent?.deathDate) {
					if (this.isEventAfterFocalDeath(person.deathDate, parent.deathDate, universe)) continue;
					const year = this.service.extractYear(parent.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(parent.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineParentDeathLabel || 'Death of {name}', parent.name),
						eventFile: parent.file?.basename,
						isFamilyEvent: true,
						rawDate: parent.deathDate
					};
					const age = this.computeEventAge(birthDate, parent.deathDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Sibling births. Skip step-siblings (#456); see collectSiblingCrIds
		// for the walk + custom-relationship logic. Births that predate the
		// focal person's birth are skipped per #469 (older siblings exist
		// genealogically but fall outside the front edge of the focal
		// reality window). Adopted siblings are gated on the shared
		// `Show adopted children's births` toggle (#618) and rendered with
		// a distinct "Birth of adopted sibling {name}" label when shown.
		if (settings.timelineShowSiblingBirths) {
			for (const [siblingCrId, kind] of this.collectSiblingCrIds(person, graph)) {
				if (kind === 'adopted' && !settings.timelineShowAdoptedChildrenBirths) continue;
				const sibling = graph.getPersonByCrId(siblingCrId);
				if (sibling?.birthDate) {
					if (this.isEventBeforeFocalBirth(birthDate, sibling.birthDate, universe)) continue;
					const year = this.service.extractYear(sibling.birthDate);
					const label = kind === 'adopted'
						? (settings.timelineAdoptedSiblingBirthLabel || 'Birth of adopted sibling {name}')
						: (settings.timelineSiblingBirthLabel || 'Birth of {name}');
					const entry: TimelineEntry = {
						date: this.service.formatDate(sibling.birthDate),
						year,
						type: 'family_birth',
						title: this.applyLabel(label, sibling.name),
						eventFile: sibling.file?.basename,
						isFamilyEvent: true,
						rawDate: sibling.birthDate
					};
					const age = this.computeEventAge(birthDate, sibling.birthDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Adopted siblings: adoption events (#621 + #623). Always-on,
		// mirroring the adoptive parent's `Adopted {name}` event (#396) —
		// the adoption of a sibling is a family event the focal canonically
		// experienced, independent of whether the user wants to see all
		// adopted-relation births via `Show adopted children's births`.
		// Independent of `timelineShowSiblingBirths` for the same reason.
		for (const [siblingCrId, kind] of this.collectSiblingCrIds(person, graph)) {
			if (kind !== 'adopted') continue;
			const sibling = graph.getPersonByCrId(siblingCrId);
			if (!sibling?.adoptionDate) continue;
			if (this.isEventBeforeFocalBirth(birthDate, sibling.adoptionDate, universe)) continue;
			const year = this.service.extractYear(sibling.adoptionDate);
			const entry: TimelineEntry = {
				date: this.service.formatDate(sibling.adoptionDate),
				year,
				type: 'adoption',
				title: this.applyLabel(settings.timelineAdoptedSiblingAdoptionLabel || 'Adoption of {name}', sibling.name),
				eventFile: sibling.file?.basename,
				isFamilyEvent: true,
				rawDate: sibling.adoptionDate
			};
			const age = this.computeEventAge(birthDate, sibling.adoptionDate, universe);
			if (age !== undefined) entry.age = age;
			entries.push(entry);
		}

		// Sibling deaths (#584). Symmetric to sibling births: walk the same
		// step-sibling-aware set, but emit death entries gated on the focal
		// person still being alive at the time of the death. No adopted-vs-bio
		// gate here — a sibling's death is meaningful regardless of adoption
		// status (the parent's surface has no equivalent toggle for deaths).
		if (settings.timelineShowSiblingDeaths) {
			for (const siblingCrId of this.collectSiblingCrIds(person, graph).keys()) {
				const sibling = graph.getPersonByCrId(siblingCrId);
				if (sibling?.deathDate) {
					if (this.isEventAfterFocalDeath(person.deathDate, sibling.deathDate, universe)) continue;
					const year = this.service.extractYear(sibling.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(sibling.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineSiblingDeathLabel || 'Death of {name}', sibling.name),
						eventFile: sibling.file?.basename,
						isFamilyEvent: true,
						rawDate: sibling.deathDate
					};
					const age = this.computeEventAge(birthDate, sibling.deathDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Children's deaths (#582). Covers biological, adopted, and step
		// children. Losing any of them is a major life event for a still-
		// living parent. Skip deaths that postdate the focal person's death.
		if (settings.timelineShowChildrenDeaths) {
			const childCrIds = new Set<string>([
				...(person.childrenCrIds || []),
				...(person.adoptedChildCrIds || []),
				...(person.stepchildrenCrIds || [])
			]);
			for (const childCrId of childCrIds) {
				const child = graph.getPersonByCrId(childCrId);
				if (child?.deathDate) {
					if (this.isEventAfterFocalDeath(person.deathDate, child.deathDate, universe)) continue;
					const year = this.service.extractYear(child.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(child.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineChildDeathLabel || 'Death of {name}', child.name),
						eventFile: child.file?.basename,
						isFamilyEvent: true,
						rawDate: child.deathDate
					};
					const age = this.computeEventAge(birthDate, child.deathDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Stepparent deaths (#583). Walks stepfather/stepmother arrays.
		// Skip deaths that postdate the focal person's death.
		if (settings.timelineShowStepparentDeaths) {
			const stepparentCrIds = new Set<string>([
				...(person.stepfatherCrIds || []),
				...(person.stepmotherCrIds || [])
			]);
			for (const stepparentCrId of stepparentCrIds) {
				const stepparent = graph.getPersonByCrId(stepparentCrId);
				if (stepparent?.deathDate) {
					if (this.isEventAfterFocalDeath(person.deathDate, stepparent.deathDate, universe)) continue;
					const year = this.service.extractYear(stepparent.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(stepparent.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineStepparentDeathLabel || 'Death of {name}', stepparent.name),
						eventFile: stepparent.file?.basename,
						isFamilyEvent: true,
						rawDate: stepparent.deathDate
					};
					const age = this.computeEventAge(birthDate, stepparent.deathDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Grandchildren births (#585). Walks one generation down from the
		// focal person's biological and adopted children. Skip stepchildren
		// as the parent step (no step-grandchildren). Skip births that
		// postdate the focal person's death (the grandparent wasn't around).
		// Adopted grandchildren (those in the connecting child's
		// `adoptedChildCrIds`) are gated on the shared
		// `Show adopted children's births` toggle (#618) and rendered with
		// a distinct "Birth of adopted grandchild {name}" label when shown.
		// "Adopted wins" across multiple paths: a grandchild seen via both
		// bio and adopted routes is treated as adopted.
		if (settings.timelineShowGrandchildrenBirths) {
			const grandchildKind = new Map<string, 'bio' | 'adopted'>();
			const childCrIds = new Set<string>([
				...(person.childrenCrIds || []),
				...(person.adoptedChildCrIds || [])
			]);
			for (const childCrId of childCrIds) {
				const child = graph.getPersonByCrId(childCrId);
				if (!child) continue;
				if (child.childrenCrIds) {
					for (const grandchildCrId of child.childrenCrIds) {
						if (!grandchildKind.has(grandchildCrId)) grandchildKind.set(grandchildCrId, 'bio');
					}
				}
				if (child.adoptedChildCrIds) {
					for (const grandchildCrId of child.adoptedChildCrIds) {
						grandchildKind.set(grandchildCrId, 'adopted');
					}
				}
			}
			for (const [grandchildCrId, kind] of grandchildKind) {
				if (kind === 'adopted' && !settings.timelineShowAdoptedChildrenBirths) continue;
				const grandchild = graph.getPersonByCrId(grandchildCrId);
				if (grandchild?.birthDate) {
					if (this.isEventAfterFocalDeath(person.deathDate, grandchild.birthDate, universe)) continue;
					const year = this.service.extractYear(grandchild.birthDate);
					const label = kind === 'adopted'
						? (settings.timelineAdoptedGrandchildBirthLabel || 'Birth of adopted grandchild {name}')
						: (settings.timelineGrandchildBirthLabel || 'Birth of {name}');
					const entry: TimelineEntry = {
						date: this.service.formatDate(grandchild.birthDate),
						year,
						type: 'family_birth',
						title: this.applyLabel(label, grandchild.name),
						eventFile: grandchild.file?.basename,
						isFamilyEvent: true,
						rawDate: grandchild.birthDate
					};
					const age = this.computeEventAge(birthDate, grandchild.birthDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Adopted grandchildren: adoption events (#621 + #623). Always-on,
		// mirroring the adoptive parent's `Adopted {name}` event (#396).
		// Walks the focal person's children (bio + adopted) and emits an
		// adoption entry for each grandchild that the connecting child
		// adopted. Independent of `timelineShowGrandchildrenBirths` —
		// adoption is its own surface, mirroring the sibling-adoption pattern.
		const adoptedGrandchildCrIds = new Set<string>();
		const childCrIds = new Set<string>([
			...(person.childrenCrIds || []),
			...(person.adoptedChildCrIds || [])
		]);
		for (const childCrId of childCrIds) {
			const child = graph.getPersonByCrId(childCrId);
			if (!child?.adoptedChildCrIds) continue;
			for (const grandchildCrId of child.adoptedChildCrIds) {
				adoptedGrandchildCrIds.add(grandchildCrId);
			}
		}
		for (const grandchildCrId of adoptedGrandchildCrIds) {
			const grandchild = graph.getPersonByCrId(grandchildCrId);
			if (!grandchild?.adoptionDate) continue;
			if (this.isEventAfterFocalDeath(person.deathDate, grandchild.adoptionDate, universe)) continue;
			const year = this.service.extractYear(grandchild.adoptionDate);
			const entry: TimelineEntry = {
				date: this.service.formatDate(grandchild.adoptionDate),
				year,
				type: 'adoption',
				title: this.applyLabel(settings.timelineAdoptedGrandchildAdoptionLabel || 'Adoption of {name}', grandchild.name),
				eventFile: grandchild.file?.basename,
				isFamilyEvent: true,
				rawDate: grandchild.adoptionDate
			};
			const age = this.computeEventAge(birthDate, grandchild.adoptionDate, universe);
			if (age !== undefined) entry.age = age;
			entries.push(entry);
		}

		// Parents' marriages (#608). Walks the focal child's biological +
		// adoptive parents, iterates each parent's spouses, and emits a
		// family_marriage entry per marriage with two filters:
		//
		// 1. The bio-pairing marriage (when both partners in the marriage
		//    are biological parents of the focal child) is excluded — that
		//    pairing is "obviously known" from the existing parent links,
		//    so surfacing it on the child's timeline adds clutter. What
		//    users want is REmarriages (stepparent acquisition) and
		//    adoptive-parent couple marriages, not the foundational pairing.
		//
		// 2. Per-marriage dedupe by sorted (parentA, parentB) cr_id pair
		//    plus date — when both partners are in the parent set (e.g., an
		//    adoptive couple), the marriage would otherwise emit twice
		//    (once when iterating parent A's spouses, once for parent B).
		//
		// Pre-birth / post-death filters apply (the child wasn't around for
		// pre-birth marriages, and `isEventAfterFocalDeath` is consistent
		// with the other family-event blocks).
		if (settings.timelineShowParentMarriages) {
			const bioParentCrIds = new Set<string>([
				...(person.fatherCrId ? [person.fatherCrId] : []),
				...(person.motherCrId ? [person.motherCrId] : []),
				...(person.parentCrIds || [])
			]);
			const allParentCrIds = new Set<string>([
				...bioParentCrIds,
				...(person.adoptiveFatherCrId ? [person.adoptiveFatherCrId] : []),
				...(person.adoptiveMotherCrId ? [person.adoptiveMotherCrId] : []),
				...(person.adoptiveParentCrIds || [])
			]);
			const seenMarriagePairs = new Set<string>();
			for (const parentCrId of allParentCrIds) {
				const parent = graph.getPersonByCrId(parentCrId);
				if (!parent?.spouses) continue;
				for (const spouse of parent.spouses) {
					if (!spouse.marriageDate) continue;
					// Filter: skip the bio-pairing marriage (both partners
					// are bio parents of the focal child).
					if (bioParentCrIds.has(parentCrId) && bioParentCrIds.has(spouse.personId)) continue;
					// Dedupe shared marriages across iterations.
					const pairKey = [parentCrId, spouse.personId].sort().join(':') + '|' + spouse.marriageDate;
					if (seenMarriagePairs.has(pairKey)) continue;
					seenMarriagePairs.add(pairKey);
					if (this.isEventBeforeFocalBirth(birthDate, spouse.marriageDate, universe)) continue;
					if (this.isEventAfterFocalDeath(person.deathDate, spouse.marriageDate, universe)) continue;
					const spouseNode = graph.getPersonByCrId(spouse.personId);
					const spouseName = spouseNode?.name || spouse.personLink || spouse.personId;
					const year = this.service.extractYear(spouse.marriageDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.marriageDate),
						year,
						type: 'family_parent_marriage',
						title: this.applyLabel(
							settings.timelineParentMarriageLabel || 'Marriage of {name} to {spouse}',
							parent.name,
							{ spouse: spouseName }
						),
						place: spouse.marriageLocation ? this.service.stripWikilink(spouse.marriageLocation) : undefined,
						eventFile: parent.file?.basename,
						isFamilyEvent: true,
						rawDate: spouse.marriageDate
					};
					const age = this.computeEventAge(birthDate, spouse.marriageDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Sibling marriages (#661). Bio and adopted siblings (step-siblings are
		// excluded by collectSiblingCrIds, matching sibling births). Each
		// sibling's spouses are iterated; marriages outside the focal person's
		// reality window are skipped, and a marriage shared across iterations is
		// de-duplicated on the (pair, date) key.
		if (settings.timelineShowSiblingMarriages) {
			const seenSiblingMarriages = new Set<string>();
			for (const [siblingCrId] of this.collectSiblingCrIds(person, graph)) {
				const sibling = graph.getPersonByCrId(siblingCrId);
				if (!sibling?.spouses) continue;
				for (const spouse of sibling.spouses) {
					if (!spouse.marriageDate) continue;
					const pairKey = [siblingCrId, spouse.personId].sort().join(':') + '|' + spouse.marriageDate;
					if (seenSiblingMarriages.has(pairKey)) continue;
					seenSiblingMarriages.add(pairKey);
					if (this.isEventBeforeFocalBirth(birthDate, spouse.marriageDate, universe)) continue;
					if (this.isEventAfterFocalDeath(person.deathDate, spouse.marriageDate, universe)) continue;
					const spouseNode = graph.getPersonByCrId(spouse.personId);
					const spouseName = spouseNode?.name || spouse.personLink || spouse.personId;
					const year = this.service.extractYear(spouse.marriageDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.marriageDate),
						year,
						type: 'family_sibling_marriage',
						title: this.applyLabel(
							settings.timelineSiblingMarriageLabel || 'Marriage of {name} to {spouse}',
							sibling.name,
							{ spouse: spouseName }
						),
						place: spouse.marriageLocation ? this.service.stripWikilink(spouse.marriageLocation) : undefined,
						eventFile: sibling.file?.basename,
						isFamilyEvent: true,
						rawDate: spouse.marriageDate
					};
					const age = this.computeEventAge(birthDate, spouse.marriageDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Children's marriages (#607). Covers biological, adopted, and step
		// children — the focal person was a parent (or stepparent) at the
		// time of the marriage, so the event belongs on their timeline. Skip
		// marriages that postdate the focal person's death (they weren't
		// around for them).
		if (settings.timelineShowChildrenMarriages) {
			const childCrIds = new Set<string>([
				...(person.childrenCrIds || []),
				...(person.adoptedChildCrIds || []),
				...(person.stepchildrenCrIds || [])
			]);
			for (const childCrId of childCrIds) {
				const child = graph.getPersonByCrId(childCrId);
				if (!child?.spouses) continue;
				for (const spouse of child.spouses) {
					if (!spouse.marriageDate) continue;
					if (this.isEventAfterFocalDeath(person.deathDate, spouse.marriageDate, universe)) continue;
					const spouseNode = graph.getPersonByCrId(spouse.personId);
					const spouseName = spouseNode?.name || spouse.personLink || spouse.personId;
					const year = this.service.extractYear(spouse.marriageDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.marriageDate),
						year,
						type: 'family_child_marriage',
						title: this.applyLabel(
							settings.timelineChildMarriageLabel || 'Marriage of {name} to {spouse}',
							child.name,
							{ spouse: spouseName }
						),
						place: spouse.marriageLocation ? this.service.stripWikilink(spouse.marriageLocation) : undefined,
						eventFile: child.file?.basename,
						isFamilyEvent: true,
						rawDate: spouse.marriageDate
					};
					const age = this.computeEventAge(birthDate, spouse.marriageDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Adopted children: adoption events on the adoptive parent's timeline
		// (#396). Adoption is a shared life event — appears on both adoptee's
		// timeline (as "Adopted") and on each adoptive parent's timeline (as
		// "Adopted [[Child]]"). Always on, no toggle — matches the marriage-
		// on-both-sides pattern. Adopted children's BIRTHS are gated on
		// timelineShowAdoptedChildrenBirths, independent from the biological
		// "Show children's births" toggle (which filters out anyone also in
		// adoptedChildCrIds, so no dedupe is needed here).
		for (const adoptedChildCrId of person.adoptedChildCrIds) {
			const adoptedChild = graph.getPersonByCrId(adoptedChildCrId);
			if (!adoptedChild) continue;

			if (adoptedChild.adoptionDate) {
				const year = this.service.extractYear(adoptedChild.adoptionDate);
				const entry: TimelineEntry = {
					date: this.service.formatDate(adoptedChild.adoptionDate),
					year,
					type: 'adoption',
					title: this.applyLabel('Adopted {name}', adoptedChild.name),
					eventFile: adoptedChild.file?.basename,
					isFamilyEvent: true,
					rawDate: adoptedChild.adoptionDate
				};
				const age = this.computeEventAge(birthDate, adoptedChild.adoptionDate, universe);
				if (age !== undefined) entry.age = age;
				entries.push(entry);
			}

			if (settings.timelineShowAdoptedChildrenBirths && adoptedChild.birthDate) {
				const year = this.service.extractYear(adoptedChild.birthDate);
				const entry: TimelineEntry = {
					date: this.service.formatDate(adoptedChild.birthDate),
					year,
					type: 'family_birth',
					title: this.applyLabel(settings.timelineChildBirthLabel || 'Birth of {name}', adoptedChild.name),
					eventFile: adoptedChild.file?.basename,
					isFamilyEvent: true,
					rawDate: adoptedChild.birthDate
				};
				const age = this.computeEventAge(birthDate, adoptedChild.birthDate, universe);
				if (age !== undefined) entry.age = age;
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * Collect sibling cr_ids for the focal person across biological and
	 * adoptive parent walks plus the custom `sibling` relationship type.
	 * Step-siblings are excluded per #456 (children who share a step-parent
	 * shouldn't surface as siblings on the focal timeline). Centralized so
	 * sibling-births (#469) and sibling-deaths (#584) share the same set.
	 */
	private collectSiblingCrIds(person: PersonNode, graph: FamilyGraphService): Map<string, 'bio' | 'adopted'> {
		// Walk both biological and adoptive parents. Adopted children
		// land in the adoptive parent's `adoptedChildCrIds`, not
		// `childrenCrIds`, so the bio-parent walk alone misses anyone
		// adopted into the household and vice versa (#531).
		//
		// The 'bio' / 'adopted' kind is tracked per sibling so callers can
		// gate adopted-sibling rendering on the `Show adopted children's
		// births` toggle and apply a distinct label (#618). "Adopted wins":
		// a sibling marked adopted via any shared parent stays adopted even
		// if also recorded as bio via another parent — the surrounding label
		// just clarifies the relationship rather than asserting blood ties.
		const parentCrIds = [
			person.fatherCrId,
			person.motherCrId,
			...(person.parentCrIds || []),
			person.adoptiveFatherCrId,
			person.adoptiveMotherCrId,
			...(person.adoptiveParentCrIds || [])
		].filter(Boolean) as string[];
		const siblingCrIds = new Map<string, 'bio' | 'adopted'>();

		const stepSiblingCrIds = new Set<string>();
		for (const parentCrId of parentCrIds) {
			const parent = graph.getPersonByCrId(parentCrId);
			if (parent?.stepchildrenCrIds) {
				for (const stepChildCrId of parent.stepchildrenCrIds) {
					stepSiblingCrIds.add(stepChildCrId);
				}
			}
		}

		for (const parentCrId of parentCrIds) {
			const parent = graph.getPersonByCrId(parentCrId);
			if (!parent) continue;
			if (parent.childrenCrIds) {
				for (const childCrId of parent.childrenCrIds) {
					if (childCrId !== person.crId && !stepSiblingCrIds.has(childCrId)) {
						if (!siblingCrIds.has(childCrId)) siblingCrIds.set(childCrId, 'bio');
					}
				}
			}
			if (parent.adoptedChildCrIds) {
				for (const adoptedChildCrId of parent.adoptedChildCrIds) {
					if (adoptedChildCrId !== person.crId && !stepSiblingCrIds.has(adoptedChildCrId)) {
						// Adopted wins: overwrite a prior 'bio' marking from
						// another parent's array. Reflects the focal-vs-sibling
						// relationship containing at least one adoptive link.
						siblingCrIds.set(adoptedChildCrId, 'adopted');
					}
				}
			}
		}

		// Also include siblings declared manually via the built-in `sibling`
		// relationship type (#398). Covers the worldbuilder case where parents
		// aren't modeled as notes but sibling pairs are still defined explicitly.
		// Manually-declared siblings are treated as 'bio' (the relationship type
		// itself doesn't carry adoption metadata).
		const relService = this.service.createRelationshipService();
		for (const rel of relService.getRelationshipsForPerson(person.crId)) {
			if (rel.type.id === 'sibling' && rel.targetCrId && rel.targetCrId !== person.crId) {
				if (!siblingCrIds.has(rel.targetCrId)) siblingCrIds.set(rel.targetCrId, 'bio');
			}
		}
		// Symmetric: also catch siblings who declared us as a sibling on their note
		for (const rel of relService.getInverseRelationships(person.crId)) {
			if (rel.type.id === 'sibling' && rel.targetCrId && rel.targetCrId !== person.crId) {
				if (!siblingCrIds.has(rel.targetCrId)) siblingCrIds.set(rel.targetCrId, 'bio');
			}
		}

		return siblingCrIds;
	}

	/**
	 * Build timeline entries from events and person data
	 */
	private buildTimelineEntries(
		context: DynamicBlockContext,
		config: DynamicBlockConfig
	): TimelineEntry[] {
		const entries: TimelineEntry[] = [];
		const { person } = context;

		// Check what event types to include
		const include = config.include as string[] | undefined;
		const shouldInclude = (type: string): boolean => {
			if (!include || include.length === 0) return true;
			return include.includes(type);
		};

		const settings = this.service.getSettings();

		// Add birth from person note
		if (person?.birthDate && shouldInclude('birth')) {
			entries.push({
				date: this.service.formatDate(person.birthDate),
				year: this.service.extractYear(person.birthDate),
				type: 'birth',
				title: settings.timelineBirthLabel || 'Born',
				place: person.birthPlace ? this.service.stripWikilink(person.birthPlace) : undefined,
				rawDate: person.birthDate
			});
		}

		// Add events from EventService
		const events = this.service.getPersonEvents(context, config);
		for (const event of events) {
			// Skip birth/death if they're from EventService but we already have them from person
			if (event.eventType === 'birth' && person?.birthDate) continue;
			if (event.eventType === 'death' && person?.deathDate) continue;

			entries.push({
				date: this.service.formatDate(event.date),
				year: this.service.extractYear(event.date),
				type: event.eventType,
				title: event.title,
				place: event.place ? this.service.stripWikilink(event.place) : undefined,
				description: event.description,
				eventFile: event.file?.basename,
				rawDate: event.date,
				sortOrder: event.sortOrder
			});
		}

		// Add adoption from person note (#396)
		// Adoption is the subject's own life event; always on when the field is set,
		// no toggle needed. Parallels born/died handling.
		if (person?.adoptionDate && shouldInclude('adoption')) {
			entries.push({
				date: this.service.formatDate(person.adoptionDate),
				year: this.service.extractYear(person.adoptionDate),
				type: 'adoption',
				title: 'Adopted',
				rawDate: person.adoptionDate
			});
		}

		// Add marriages and divorces from spouse relationship metadata (#399).
		// These are the subject's own life events; always on when data is present,
		// no toggle needed. Matches born/died/adoption handling.
		if (person?.spouses && shouldInclude('marriage')) {
			const birthDate = person.birthDate;
			const universe = person.universe;
			for (const spouse of person.spouses) {
				const spouseNode = context.familyGraph.getPersonByCrId(spouse.personId);
				const spouseName = spouseNode?.name || spouse.personLink || spouse.personId;

				if (spouse.marriageDate) {
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.marriageDate),
						year: this.service.extractYear(spouse.marriageDate),
						type: 'marriage',
						title: `Marriage to ${spouseName}`,
						place: spouse.marriageLocation ? this.service.stripWikilink(spouse.marriageLocation) : undefined,
						eventFile: spouseNode?.file?.basename,
						rawDate: spouse.marriageDate
					};
					const age = this.computeEventAge(birthDate, spouse.marriageDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}

				if (spouse.divorceDate && settings.timelineShowDivorces) {
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.divorceDate),
						year: this.service.extractYear(spouse.divorceDate),
						type: 'divorce',
						title: `Divorce from ${spouseName}`,
						eventFile: spouseNode?.file?.basename,
						rawDate: spouse.divorceDate
					};
					const age = this.computeEventAge(birthDate, spouse.divorceDate, universe);
					if (age !== undefined) entry.age = age;
					entries.push(entry);
				}
			}
		}

		// Add death from person note
		if (person?.deathDate && shouldInclude('death')) {
			entries.push({
				date: this.service.formatDate(person.deathDate),
				year: this.service.extractYear(person.deathDate),
				type: 'death',
				title: settings.timelineDeathLabel || 'Died',
				place: person.deathPlace ? this.service.stripWikilink(person.deathPlace) : undefined,
				rawDate: person.deathDate
			});
		}

		// Add burial from person note (#408). Mirrors the death emission
		// pattern: fixed "Buried" title plus stripped burial_place rendered
		// as "in X" by the timeline renderer. Age is filled in by
		// buildTimelineEntriesWithContext downstream. (Bare-year input like
		// `burial_date: 1893` is handled by the service's date helpers
		// thanks to #416.)
		if (person?.burialDate && shouldInclude('burial')) {
			entries.push({
				date: this.service.formatDate(person.burialDate),
				year: this.service.extractYear(person.burialDate),
				type: 'burial',
				title: 'Buried',
				place: person.burialPlace ? this.service.stripWikilink(person.burialPlace) : undefined,
				rawDate: person.burialDate
			});
		}

		const sortOrder = (config.sort as string === 'reverse' ? 'reverse' : 'chronological');
		entries.sort((a, b) => compareTimelineEntriesByDate(a, b, sortOrder, this.service.getDateService()));

		// Apply limit
		const limit = config.limit as number | undefined;
		if (limit && limit > 0 && entries.length > limit) {
			return entries.slice(0, limit);
		}

		return entries;
	}

	/**
	 * Render the timeline list
	 */
	private async renderTimelineList(
		contentEl: HTMLElement,
		entries: TimelineEntry[],
		context: DynamicBlockContext,
		component: MarkdownRenderChild,
		config?: DynamicBlockConfig
	): Promise<void> {
		const settings = this.service.getSettings();
		const iconMode = settings.eventIconMode || 'text';
		// Always show icons when family events are present for consistent alignment
		const hasFamilyEvents = entries.some(e => e.isFamilyEvent);
		const showIcon = iconMode === 'icon' || iconMode === 'both' || hasFamilyEvents;

		const list = contentEl.createEl('ul', { cls: 'cr-timeline__list' });

		for (const entry of entries) {
			// Section divider (grouped layout)
			if (entry.isSectionDivider) {
				const divider = list.createEl('li', { cls: 'cr-timeline__section-divider' });
				divider.createSpan({ text: entry.title, cls: 'cr-timeline__section-title' });
				continue;
			}

			let itemCls = 'cr-timeline__item';
			if (entry.isContext) itemCls += ' cr-timeline__item--context';
			if (entry.isFamilyEvent) itemCls += ' cr-timeline__item--family';
			const li = list.createEl('li', { cls: itemCls });

			// Render icons (applies to both standard and format string paths)
			if (entry.isContext) {
				const iconSpan = li.createSpan({ cls: 'cr-timeline__icon cr-timeline__icon--context' });
				setIcon(iconSpan, 'landmark' as LucideIconName);
			} else if (entry.isFamilyEvent) {
				const iconSpan = li.createSpan({ cls: 'cr-timeline__icon cr-timeline__icon--family' });
				// Adoption family events read as adoptions, not generic family events
				// (#632) — see resolveFamilyEventIcon for the rationale.
				const { icon, color } = resolveFamilyEventIcon(
					entry.type,
					settings.customEventTypes || [],
					settings.showBuiltInEventTypes !== false
				);
				setIcon(iconSpan, icon);
				if (color) iconSpan.style.setProperty('color', color);
			} else {
				const eventType = getEventType(
					entry.type,
					settings.customEventTypes || [],
					settings.showBuiltInEventTypes !== false
				);

				if (showIcon) {
					if (eventType) {
						const iconSpan = li.createSpan({ cls: 'cr-timeline__icon' });
						setIcon(iconSpan, eventType.icon);
						iconSpan.style.setProperty('color', eventType.color);
						if (iconMode === 'icon') {
							iconSpan.setAttribute('title', eventType.name);
						}
					} else {
						li.createSpan({ cls: 'cr-timeline__icon cr-timeline__icon--placeholder' });
					}
				}
			}

			// Format string rendering (Phase 3)
			const formatStr = config?.format as string | undefined;
			if (formatStr) {
				this.renderFormattedEntry(li, entry, formatStr, context, component);
				continue;
			}

			// Year/date — prefer the era-aware display when DateService can
			// parse the entry's raw date as fictional (#563); falls through to
			// the digit-only year for standard inputs. The two earlier render
			// paths (renderFormattedEntry, renderWithTemplate's default block)
			// were updated in v0.22.31; this flat-list path was missed.
			const displayYear = this.service.formatYearForDisplay(entry.date, context.person?.universe);
			const yearSpan = li.createSpan({ cls: 'cr-timeline__year' });
			yearSpan.textContent = displayYear || entry.year || entry.date || '?';

			// Age annotation
			if (entry.age !== undefined) {
				li.createSpan({
					cls: 'cr-timeline__age',
					text: `age ${entry.age}`
				});
			}

			// Separator
			li.createSpan({ cls: 'cr-timeline__separator', text: ' — ' });

			// Determine display text (#157, #184)
			// Show "Type: description" for most event types when description exists
			// Birth/death events always show title (e.g., "Born", "Died")
			// Always include type label in timelines - icon-only mode still needs
			// the verb for sentence structure (icon replaces the badge, not the verb)
			let displayText = entry.title;
			if (entry.description && !TITLE_ONLY_TYPES.includes(entry.type)) {
				const typeLabel = capitalize(entry.type);
				displayText = `${typeLabel}: ${entry.description}`;
			}

			// Event title with optional link
			const titleSpan = li.createSpan({ cls: 'cr-timeline__title' });
			if (entry.eventFile) {
				// Render as wikilink
				await MarkdownRenderer.render(
					context.familyGraph['app'], // Access app from familyGraph
					`[[${entry.eventFile}|${displayText}]]`,
					titleSpan,
					context.file.path,
					component
				);
			} else {
				titleSpan.textContent = displayText;
			}

			// Place (if present)
			if (entry.place) {
				// Add non-breaking space before "in" to prevent whitespace collapse
				// when MarkdownRenderer creates block-level elements for wikilinks
				li.appendText('\u00A0');
				li.createSpan({ cls: 'cr-timeline__place', text: `in ${entry.place}` });
			}
		}
	}

	/**
	 * Copy timeline to clipboard as plain text
	 */
	private copyTimelineToClipboard(container: HTMLElement): void {
		const items = container.querySelectorAll('.cr-timeline__item');
		const lines: string[] = [];

		items.forEach(item => {
			const year = item.querySelector('.cr-timeline__year')?.textContent || '';
			const title = item.querySelector('.cr-timeline__title')?.textContent || '';
			const place = item.querySelector('.cr-timeline__place')?.textContent || '';
			lines.push(`${year} — ${title}${place}`);
		});

		const text = lines.join('\n');
		void navigator.clipboard.writeText(text);
	}

	/**
	 * Generate markdown from current entries and replace the code block
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentContext || this.currentEntries.length === 0) {
			return;
		}

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentContext.file,
			'charted-roots-timeline',
			markdown
		);
	}

	/**
	 * Generate markdown representation of the timeline
	 */
	private generateMarkdown(): string {
		const lines: string[] = ['## Timeline', ''];

		for (const entry of this.currentEntries) {
			// Section divider
			if (entry.isSectionDivider) {
				lines.push(`### ${entry.title}`, '');
				continue;
			}

			const yearDisplay = entry.year || entry.date || '?';
			const ageStr = entry.age !== undefined ? ` (age ${entry.age})` : '';
			const prefix = entry.isContext ? '🏛️ ' : entry.isFamilyEvent ? '👨‍👩‍👧 ' : '';
			let line = `- **${yearDisplay}**${ageStr} — ${prefix}`;

			// Determine display text (#157)
			// Show "Type: description" for most event types when description exists
			let displayText = entry.title;
			if (entry.description && !TITLE_ONLY_TYPES.includes(entry.type)) {
				const typeLabel = capitalize(entry.type);
				displayText = `${typeLabel}: ${entry.description}`;
			}

			// Add title with wikilink if it's an event
			if (entry.eventFile) {
				line += `[[${entry.eventFile}|${displayText}]]`;
			} else {
				line += displayText;
			}

			// Add place
			if (entry.place) {
				line += ` in ${entry.place}`;
			}

			lines.push(line);
		}

		return lines.join('\n');
	}
}
