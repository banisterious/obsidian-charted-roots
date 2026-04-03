/**
 * Calendar Data Service (#299)
 *
 * Aggregates birth/death dates from FamilyGraphService and
 * event dates from EventService into CalendarEvent objects.
 */

import type { App } from 'obsidian';
import type { CanvasRootsSettings } from '../../main';
import type { CalendarEvent, CalendarFilter } from './types/calendar-types';
import { DEFAULT_EVENT_TYPES } from './types/calendar-types';
import { FamilyGraphService } from '../core/family-graph';
import { FolderFilterService } from '../core/folder-filter';
import { EventService } from '../events/services/event-service';
import { getLogger } from '../core/logging';

const logger = getLogger('CalendarDataService');

export class CalendarDataService {
	private app: App;
	private settings: CanvasRootsSettings;
	private eventService: EventService | null;

	constructor(app: App, settings: CanvasRootsSettings, eventService?: EventService | null) {
		this.app = app;
		this.settings = settings;
		this.eventService = eventService ?? null;
	}

	/**
	 * Get all calendar events, optionally filtered
	 */
	getEvents(filter?: CalendarFilter): CalendarEvent[] {
		const events: CalendarEvent[] = [];
		const currentYear = new Date().getFullYear();
		const activeTypes = filter?.eventTypes ?? DEFAULT_EVENT_TYPES;

		// Gather from person notes
		if (activeTypes.includes('birth') || activeTypes.includes('death')) {
			const familyGraph = this.createFamilyGraph();
			familyGraph.ensureCacheLoaded();
			const allPeople = familyGraph.getAllPeople();

			for (const person of allPeople) {
				// Apply collection filter
				if (filter?.collection && person.collectionName !== filter.collection) continue;

				// Apply universe filter
				if (filter?.universe && person.universe !== filter.universe) continue;

				// Apply living status filter
				if (filter?.livingStatus === 'living' && person.deathDate) continue;
				if (filter?.livingStatus === 'deceased' && !person.deathDate) continue;

				// Birth event
				if (activeTypes.includes('birth') && person.birthDate) {
					const parsed = this.parseDate(person.birthDate);
					if (parsed) {
						events.push({
							id: person.crId,
							personName: person.name,
							personCrId: person.crId,
							eventType: 'birth',
							date: person.birthDate,
							month: parsed.month,
							day: parsed.day,
							year: parsed.year,
							yearsAgo: currentYear - parsed.year,
							placeName: person.birthPlace,
							isApproximate: parsed.isApproximate,
							source: 'person',
							filePath: person.file.path
						});
					}
				}

				// Death event
				if (activeTypes.includes('death') && person.deathDate) {
					const parsed = this.parseDate(person.deathDate);
					if (parsed) {
						events.push({
							id: `${person.crId}_death`,
							personName: person.name,
							personCrId: person.crId,
							eventType: 'death',
							date: person.deathDate,
							month: parsed.month,
							day: parsed.day,
							year: parsed.year,
							yearsAgo: currentYear - parsed.year,
							placeName: person.deathPlace,
							isApproximate: parsed.isApproximate,
							source: 'person',
							filePath: person.file.path
						});
					}
				}
			}
		}

		// Gather from event notes (marriage, baptism, immigration, etc.)
		if (this.eventService) {
			const personBirthDeathIds = new Set(events.map(e => e.id));
			const allEventNotes = this.eventService.getAllEvents();

			for (const eventNote of allEventNotes) {
				// Skip events without dates or with unknown precision
				if (!eventNote.date || eventNote.datePrecision === 'unknown') continue;

				// Skip event types not in the active filter
				if (!activeTypes.includes(eventNote.eventType)) continue;

				// Apply universe filter
				if (filter?.universe && eventNote.universe !== filter.universe) continue;

				const parsed = this.parseDate(eventNote.date);
				if (!parsed) continue;

				// Resolve person name from wikilink
				const personWikilink = eventNote.person || '';
				const personName = this.extractNameFromWikilink(personWikilink) || eventNote.title;

				// Skip if this would duplicate a person-note birth/death
				// (person notes are authoritative for birth/death)
				if (eventNote.eventType === 'birth' || eventNote.eventType === 'death') {
					continue;
				}

				// Resolve place from wikilink
				const placeName = eventNote.place
					? this.extractNameFromWikilink(eventNote.place)
					: undefined;

				events.push({
					id: `event_${eventNote.crId}`,
					personName,
					personCrId: eventNote.crId,
					eventType: eventNote.eventType,
					date: eventNote.date,
					month: parsed.month,
					day: parsed.day,
					year: parsed.year,
					yearsAgo: currentYear - parsed.year,
					placeName,
					isApproximate: parsed.isApproximate,
					source: 'event',
					filePath: eventNote.filePath
				});
			}
		}

		logger.debug('get-events', `Collected ${events.length} calendar events`);
		return events;
	}

	/**
	 * Extract display name from a wikilink string like "[[John Smith]]" or "[[path/John Smith|Display Name]]"
	 */
	private extractNameFromWikilink(wikilink: string): string | undefined {
		const match = wikilink.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
		if (!match) return undefined;
		// Use display text if present, otherwise use link target's basename
		if (match[2]) return match[2].trim();
		const target = match[1].trim();
		return target.split('/').pop() || target;
	}

	/**
	 * Get events for a specific month
	 */
	getEventsForMonth(year: number, month: number, filter?: CalendarFilter): {
		dayEvents: Map<number, CalendarEvent[]>;
		impreciseEvents: CalendarEvent[];
	} {
		const allEvents = this.getEvents(filter);
		const dayEvents = new Map<number, CalendarEvent[]>();
		const impreciseEvents: CalendarEvent[] = [];

		for (const event of allEvents) {
			if (event.month !== month) continue;

			if (event.day !== null) {
				const existing = dayEvents.get(event.day) || [];
				existing.push(event);
				dayEvents.set(event.day, existing);
			} else {
				// Month known but day unknown
				impreciseEvents.push(event);
			}
		}

		return { dayEvents, impreciseEvents };
	}

	/**
	 * Parse a date string into month/day/year components
	 */
	private parseDate(dateStr: string): { month: number | null; day: number | null; year: number; isApproximate: boolean } | null {
		if (!dateStr) return null;

		let cleaned = dateStr.trim();
		let isApproximate = false;

		// Strip GEDCOM qualifiers
		const qualifiers = ['ABT', 'ABOUT', 'CIRCA', 'C.', 'CAL', 'EST', 'BEF', 'BEFORE', 'AFT', 'AFTER', '~'];
		for (const q of qualifiers) {
			if (cleaned.toUpperCase().startsWith(q + ' ')) {
				cleaned = cleaned.substring(q.length + 1).trim();
				isApproximate = true;
				break;
			}
			if (cleaned.startsWith('~')) {
				cleaned = cleaned.substring(1).trim();
				isApproximate = true;
				break;
			}
		}

		// Skip ranges (BET...AND)
		if (cleaned.toUpperCase().startsWith('BET ')) return null;

		// Try ISO format: YYYY-MM-DD
		const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
		if (isoMatch) {
			return {
				year: parseInt(isoMatch[1]),
				month: parseInt(isoMatch[2]),
				day: parseInt(isoMatch[3]),
				isApproximate
			};
		}

		// Try YYYY-MM (month only)
		const monthMatch = cleaned.match(/^(\d{4})-(\d{1,2})$/);
		if (monthMatch) {
			return {
				year: parseInt(monthMatch[1]),
				month: parseInt(monthMatch[2]),
				day: null,
				isApproximate
			};
		}

		// Try year only: YYYY
		const yearMatch = cleaned.match(/^(\d{4})$/);
		if (yearMatch) {
			return {
				year: parseInt(yearMatch[1]),
				month: null,
				day: null,
				isApproximate
			};
		}

		// Try GEDCOM text format: DD MMM YYYY or MMM YYYY
		const gedcomMonths: Record<string, number> = {
			JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
			JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
		};

		// DD MMM YYYY
		const gedcomFull = cleaned.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
		if (gedcomFull) {
			const m = gedcomMonths[gedcomFull[2].toUpperCase()];
			if (m) {
				return {
					year: parseInt(gedcomFull[3]),
					month: m,
					day: parseInt(gedcomFull[1]),
					isApproximate
				};
			}
		}

		// MMM YYYY
		const gedcomMonth = cleaned.match(/^([A-Za-z]{3})\s+(\d{4})$/);
		if (gedcomMonth) {
			const m = gedcomMonths[gedcomMonth[1].toUpperCase()];
			if (m) {
				return {
					year: parseInt(gedcomMonth[2]),
					month: m,
					day: null,
					isApproximate
				};
			}
		}

		return null;
	}

	private createFamilyGraph(): FamilyGraphService {
		const folderFilter = new FolderFilterService(this.settings);
		const familyGraph = new FamilyGraphService(this.app);
		familyGraph.setFolderFilter(folderFilter);
		familyGraph.setPropertyAliases(this.settings.propertyAliases);
		familyGraph.setValueAliases(this.settings.valueAliases);
		return familyGraph;
	}
}
