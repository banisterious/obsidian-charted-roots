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
	/** Whether this is a family member's event (child birth, spouse death, etc.) */
	isFamilyEvent?: boolean;
	/** Whether this is a section divider (for grouped layout) */
	isSectionDivider?: boolean;
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

		// Add family events if enabled (and not suppressed by per-block override)
		const familyEventsParam = config.familyEvents as string | undefined;
		if (familyEventsParam !== 'none' && context.person) {
			const familyEntries = this.gatherFamilyEvents(context, birthYear);
			entries.push(...familyEntries);
		}

		// Resolve context note path
		const contextParam = config.context as string | undefined;
		const settings = this.service.getSettings();
		const contextValue = (contextParam !== 'none') ? (contextParam || settings.defaultTimelineContext) : '';;

		if (contextValue) {
			const contextPath = extractWikilinkPath(contextValue);
			const contextEntries = await this.parseContextNote(contextPath, context, birthYear);

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
		const sortOrder = config.sort as string || 'chronological';
		const sortFn = (a: TimelineEntry, b: TimelineEntry) => {
			const yearA = parseInt(a.year) || 0;
			const yearB = parseInt(b.year) || 0;
			return sortOrder === 'reverse' ? yearB - yearA : yearA - yearB;
		};

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
		context: DynamicBlockContext,
		birthYear: number
	): Promise<TimelineEntry[]> {
		const app = this.service.getApp();
		const file = app.metadataCache.getFirstLinkpathDest(notePath, context.file.path);
		if (!(file instanceof TFile)) return [];

		const content = await app.vault.read(file);
		const entries: TimelineEntry[] = [];

		// Match lines with date prefix: bullet optional
		// Formats: "- 1861-1865: Event", "1914: Event", "* 1929-10-29: Event"
		const lineRegex = /^(?:[-*]\s+)?(\d{4}(?:-\d{2}(?:-\d{2})?)?)\s*(?:[-–]\s*(\d{4}(?:-\d{2}(?:-\d{2})?)?))?:\s*(.+)$/;

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
	 * Gather family events (children's births, spouse deaths, etc.)
	 * based on settings toggles
	 */
	/**
	 * Apply a label template, replacing {name} with the person's name
	 */
	private applyLabel(template: string, name: string): string {
		return template.replace(/\{name\}/g, name);
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

		// Build substitution values
		const values: Record<string, string> = {
			year: entry.year || entry.date || '?',
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

			// Sort
			const sortOrder = section.sort || 'chronological';
			sectionEntries.sort((a, b) => {
				const yearA = parseInt(a.year) || 0;
				const yearB = parseInt(b.year) || 0;
				return sortOrder === 'reverse' ? yearB - yearA : yearA - yearB;
			});

			// Render entries
			for (const entry of sectionEntries) {
				let itemCls = 'cr-timeline__item';
				if (entry.isContext) itemCls += ' cr-timeline__item--context';
				if (entry.isFamilyEvent) itemCls += ' cr-timeline__item--family';
				const li = list.createEl('li', { cls: itemCls });

				if (section.format) {
					this.renderFormattedEntry(li, entry, section.format, context, component);
				} else {
					// Minimal default rendering
					li.createSpan({ cls: 'cr-timeline__year', text: entry.year || '?' });
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
		context: DynamicBlockContext,
		birthYear: number
	): TimelineEntry[] {
		const settings = this.service.getSettings();
		const person = context.person;
		if (!person) return [];

		const entries: TimelineEntry[] = [];
		const graph = context.familyGraph;

		// Children's births
		if (settings.timelineShowChildrenBirths && person.childrenCrIds) {
			for (const childCrId of person.childrenCrIds) {
				const child = graph.getPersonByCrId(childCrId);
				if (child?.birthDate) {
					const year = this.service.extractYear(child.birthDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(child.birthDate),
						year,
						type: 'family_birth',
						title: this.applyLabel(settings.timelineChildBirthLabel || 'Birth of {name}', child.name),
						eventFile: child.file?.basename,
						isFamilyEvent: true
					};
					const entryYear = parseInt(year);
					if (!isNaN(birthYear) && !isNaN(entryYear) && entryYear >= birthYear) {
						entry.age = entryYear - birthYear;
					}
					entries.push(entry);
				}
			}
		}

		// Spouse deaths
		if (settings.timelineShowSpouseDeaths && person.spouseCrIds) {
			for (const spouseCrId of person.spouseCrIds) {
				const spouse = graph.getPersonByCrId(spouseCrId);
				if (spouse?.deathDate) {
					const year = this.service.extractYear(spouse.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineSpouseDeathLabel || 'Death of {name}', spouse.name),
						eventFile: spouse.file?.basename,
						isFamilyEvent: true
					};
					const entryYear = parseInt(year);
					if (!isNaN(birthYear) && !isNaN(entryYear) && entryYear >= birthYear) {
						entry.age = entryYear - birthYear;
					}
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
					const year = this.service.extractYear(parent.deathDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(parent.deathDate),
						year,
						type: 'family_death',
						title: this.applyLabel(settings.timelineParentDeathLabel || 'Death of {name}', parent.name),
						eventFile: parent.file?.basename,
						isFamilyEvent: true
					};
					const entryYear = parseInt(year);
					if (!isNaN(birthYear) && !isNaN(entryYear) && entryYear >= birthYear) {
						entry.age = entryYear - birthYear;
					}
					entries.push(entry);
				}
			}
		}

		// Sibling births
		if (settings.timelineShowSiblingBirths) {
			const parentCrIds = [person.fatherCrId, person.motherCrId].filter(Boolean) as string[];
			const siblingCrIds = new Set<string>();

			for (const parentCrId of parentCrIds) {
				const parent = graph.getPersonByCrId(parentCrId);
				if (parent?.childrenCrIds) {
					for (const childCrId of parent.childrenCrIds) {
						if (childCrId !== person.crId) {
							siblingCrIds.add(childCrId);
						}
					}
				}
			}

			// Also include siblings declared manually via the built-in `sibling`
			// relationship type (#398). Covers the worldbuilder case where parents
			// aren't modeled as notes but sibling pairs are still defined explicitly.
			const relService = this.service.createRelationshipService();
			for (const rel of relService.getRelationshipsForPerson(person.crId)) {
				if (rel.type.id === 'sibling' && rel.targetCrId !== person.crId) {
					siblingCrIds.add(rel.targetCrId);
				}
			}
			// Symmetric: also catch siblings who declared us as a sibling on their note
			for (const rel of relService.getInverseRelationships(person.crId)) {
				if (rel.type.id === 'sibling' && rel.targetCrId !== person.crId) {
					siblingCrIds.add(rel.targetCrId);
				}
			}

			for (const siblingCrId of siblingCrIds) {
				const sibling = graph.getPersonByCrId(siblingCrId);
				if (sibling?.birthDate) {
					const year = this.service.extractYear(sibling.birthDate);
					const entry: TimelineEntry = {
						date: this.service.formatDate(sibling.birthDate),
						year,
						type: 'family_birth',
						title: this.applyLabel(settings.timelineSiblingBirthLabel || 'Birth of {name}', sibling.name),
						eventFile: sibling.file?.basename,
						isFamilyEvent: true
					};
					const entryYear = parseInt(year);
					if (!isNaN(birthYear) && !isNaN(entryYear) && entryYear >= birthYear) {
						entry.age = entryYear - birthYear;
					}
					entries.push(entry);
				}
			}
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

		const settings = this.service.getSettings();

		// Add birth from person note
		if (person?.birthDate && shouldInclude('birth')) {
			entries.push({
				date: this.service.formatDate(person.birthDate),
				year: this.service.extractYear(person.birthDate),
				type: 'birth',
				title: settings.timelineBirthLabel || 'Born',
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

		// Add adoption from person note (#396)
		// Adoption is the subject's own life event; always on when the field is set,
		// no toggle needed. Parallels born/died handling.
		if (person?.adoptionDate && shouldInclude('adoption')) {
			entries.push({
				date: this.service.formatDate(person.adoptionDate),
				year: this.service.extractYear(person.adoptionDate),
				type: 'adoption',
				title: 'Adopted'
			});
		}

		// Add marriages and divorces from spouse relationship metadata (#399).
		// These are the subject's own life events; always on when data is present,
		// no toggle needed. Matches born/died/adoption handling.
		if (person?.spouses && shouldInclude('marriage')) {
			const birthYearForAge = person.birthDate ? parseInt(this.service.extractYear(person.birthDate)) : NaN;
			for (const spouse of person.spouses) {
				const spouseNode = context.familyGraph.getPersonByCrId(spouse.personId);
				const spouseName = spouseNode?.name || spouse.personLink || spouse.personId;

				if (spouse.marriageDate) {
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.marriageDate),
						year: this.service.extractYear(spouse.marriageDate),
						type: 'marriage',
						title: `Marriage to [[${spouseName}]]`,
						place: spouse.marriageLocation ? this.service.stripWikilink(spouse.marriageLocation) : undefined,
						eventFile: spouseNode?.file?.basename
					};
					const entryYear = parseInt(entry.year);
					if (!isNaN(birthYearForAge) && !isNaN(entryYear) && entryYear >= birthYearForAge) {
						entry.age = entryYear - birthYearForAge;
					}
					entries.push(entry);
				}

				if (spouse.divorceDate) {
					const entry: TimelineEntry = {
						date: this.service.formatDate(spouse.divorceDate),
						year: this.service.extractYear(spouse.divorceDate),
						type: 'divorce',
						title: `Divorce from [[${spouseName}]]`,
						eventFile: spouseNode?.file?.basename
					};
					const entryYear = parseInt(entry.year);
					if (!isNaN(birthYearForAge) && !isNaN(entryYear) && entryYear >= birthYearForAge) {
						entry.age = entryYear - birthYearForAge;
					}
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
				setIcon(iconSpan, 'users' as LucideIconName);
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
