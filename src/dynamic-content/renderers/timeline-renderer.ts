/**
 * Timeline Renderer
 *
 * Renders timeline HTML for the charted-roots-timeline code block.
 * Creates a styled list of events with dates and descriptions.
 */

import { MarkdownRenderer, MarkdownRenderChild, setIcon, TFile } from 'obsidian';
import type { DynamicBlockContext, DynamicBlockConfig } from '../services/dynamic-content-service';
import type { DynamicContentService } from '../services/dynamic-content-service';
import { getEventType } from '../../events/types/event-types';
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
	/** Age of the person at the time of this event */
	age?: number;
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

		// Render timeline list
		await this.renderTimelineList(contentEl, entries, context, component);
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
			attr: { 'aria-label': 'Freeze to markdown' }
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

		// Add age annotations to person events
		const birthYear = context.person?.birthDate
			? parseInt(this.service.extractYear(context.person.birthDate))
			: NaN;
		if (!isNaN(birthYear)) {
			for (const entry of entries) {
				const entryYear = parseInt(entry.year);
				if (!isNaN(entryYear) && entryYear >= birthYear) {
					entry.age = entryYear - birthYear;
				}
			}
		}

		// Resolve context note path
		const contextParam = config.context as string | undefined;
		if (contextParam === 'none') return entries;

		const settings = this.service.getSettings();
		const contextValue = contextParam || settings.defaultTimelineContext;
		if (!contextValue) return entries;

		const contextPath = extractWikilinkPath(contextValue);
		const contextEntries = await this.parseContextNote(contextPath, context, birthYear);

		// Filter context events to the person's lifespan (with 5-year margin)
		const personYears = entries
			.filter(e => !e.isContext)
			.map(e => parseInt(e.year))
			.filter(y => !isNaN(y));
		if (personYears.length > 0) {
			const minYear = Math.min(...personYears) - 5;
			const maxYear = Math.max(...personYears) + 5;
			const filtered = contextEntries.filter(e => {
				const year = parseInt(e.year);
				return !isNaN(year) && year >= minYear && year <= maxYear;
			});
			entries.push(...filtered);
		}

		// Re-sort after merging
		const sortOrder = config.sort as string || 'chronological';
		entries.sort((a, b) => {
			const yearA = parseInt(a.year) || 0;
			const yearB = parseInt(b.year) || 0;
			return sortOrder === 'reverse' ? yearB - yearA : yearA - yearB;
		});

		return entries;
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
		context: DynamicBlockContext,
		birthYear: number
	): Promise<TimelineEntry[]> {
		const app = this.service.getApp();
		const file = app.metadataCache.getFirstLinkpathDest(notePath, context.file.path);
		if (!(file instanceof TFile)) return [];

		const content = await app.vault.read(file);
		const entries: TimelineEntry[] = [];

		// Match list items: - YYYY or - YYYY-YYYY or - YYYY-MM-DD: description
		const lineRegex = /^[-*]\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*(?:[-–]\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?))?:\s*(.+)$/;

		for (const line of content.split('\n')) {
			const match = line.trim().match(lineRegex);
			if (!match) continue;

			const startDate = match[1];
			const endDate = match[2];
			const title = match[3].trim();
			const year = startDate.substring(0, 4);
			const displayYear = endDate
				? `${year}–${endDate.substring(0, 4)}`
				: year;

			const entry: TimelineEntry = {
				date: startDate,
				year: displayYear,
				type: 'context',
				title,
				isContext: true
			};

			// Add age annotation for context events too
			const entryYear = parseInt(year);
			if (!isNaN(birthYear) && !isNaN(entryYear) && entryYear >= birthYear) {
				entry.age = entryYear - birthYear;
			}

			entries.push(entry);
		}

		return entries;
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

		// Add birth from person note
		if (person?.birthDate && shouldInclude('birth')) {
			entries.push({
				date: this.service.formatDate(person.birthDate),
				year: this.service.extractYear(person.birthDate),
				type: 'birth',
				title: 'Born',
				place: person.birthPlace ? this.service.stripWikilink(person.birthPlace) : undefined
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
				eventFile: event.file?.basename
			});
		}

		// Add death from person note
		if (person?.deathDate && shouldInclude('death')) {
			entries.push({
				date: this.service.formatDate(person.deathDate),
				year: this.service.extractYear(person.deathDate),
				type: 'death',
				title: 'Died',
				place: person.deathPlace ? this.service.stripWikilink(person.deathPlace) : undefined
			});
		}

		// Sort entries by date
		const sortOrder = config.sort as string || 'chronological';
		entries.sort((a, b) => {
			const yearA = parseInt(a.year) || 0;
			const yearB = parseInt(b.year) || 0;

			if (sortOrder === 'reverse') {
				return yearB - yearA;
			}
			return yearA - yearB;
		});

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
		component: MarkdownRenderChild
	): Promise<void> {
		const settings = this.service.getSettings();
		const iconMode = settings.eventIconMode || 'text';
		const showIcon = iconMode === 'icon' || iconMode === 'both';

		const list = contentEl.createEl('ul', { cls: 'cr-timeline__list' });

		for (const entry of entries) {
			const itemCls = entry.isContext
				? 'cr-timeline__item cr-timeline__item--context'
				: 'cr-timeline__item';
			const li = list.createEl('li', { cls: itemCls });

			if (entry.isContext) {
				// Context events get a landmark icon
				const iconSpan = li.createSpan({ cls: 'cr-timeline__icon cr-timeline__icon--context' });
				setIcon(iconSpan, 'landmark' as LucideIconName);
			} else {
				// Get event type info for icon/color
				const eventType = getEventType(
					entry.type,
					settings.customEventTypes || [],
					settings.showBuiltInEventTypes !== false
				);

				// Icon (if icon mode is 'icon' or 'both')
				if (showIcon && eventType) {
					const iconSpan = li.createSpan({ cls: 'cr-timeline__icon' });
					setIcon(iconSpan, eventType.icon as LucideIconName);
					iconSpan.style.setProperty('color', eventType.color);
					// Add tooltip for icon-only mode
					if (iconMode === 'icon') {
						iconSpan.setAttribute('title', eventType.name);
					}
				}
			}

			// Year/date
			const yearSpan = li.createSpan({ cls: 'cr-timeline__year' });
			yearSpan.textContent = entry.year || entry.date || '?';

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
			const yearDisplay = entry.year || entry.date || '?';
			const ageStr = entry.age !== undefined ? ` (age ${entry.age})` : '';
			const prefix = entry.isContext ? '🏛️ ' : '';
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
