/**
 * Life Events Migration Service
 *
 * Handles migration from inline `events` arrays to separate event note files.
 * The new format uses `life_events` property with wikilinks to event notes.
 *
 * This service is used by:
 * - Post-Import Cleanup Wizard (Step 13)
 * - Migration Notice view (v0.18.9)
 */

import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import { getLogger } from '../../core/logging';
import { isPersonNote } from '../../utils/note-type-detection';
import { generateCrId } from '../../core/uuid';
import type { EventType } from '../../maps/types/map-types';
import {
	computeEventIdentity,
	extractEventIdentityFromFrontmatter
} from '../event-identity';

const logger = getLogger('LifeEventsMigration');

/** Track if legacy format warning has been shown (only warn once per session) */
let legacyWarningShown = false;

/**
 * Log a warning for legacy events array
 */
function logLegacyFormatWarning(count: number): void {
	if (legacyWarningShown) return;
	legacyWarningShown = true;

	console.warn(
		`[Charted Roots] Found ${count} person note(s) using inline 'events' arrays. ` +
		`This format is deprecated in favor of separate event note files. ` +
		`Use the Cleanup Wizard to migrate to event notes.`
	);
}

/**
 * Inline event from the legacy events array
 */
export interface InlineEvent {
	event_type: EventType;
	place?: string;
	date_from?: string | number;
	date_to?: string | number;
	description?: string;
}

/**
 * A person note with inline events that can be migrated
 */
export interface LegacyEventsNote {
	/** The file containing the inline events array */
	file: TFile;
	/** The person's name (for generating event titles) */
	personName: string;
	/** The person's cr_id (for linking) */
	personCrId: string;
	/** The inline events array */
	events: InlineEvent[];
	/** Number of events to migrate */
	eventCount: number;
}

/**
 * Preview of what migration would create for a single event
 */
export interface EventMigrationPreview {
	/** Suggested title for the event note */
	title: string;
	/** The event type */
	eventType: EventType;
	/** Place (if any) */
	place?: string;
	/** Date from */
	dateFrom?: string;
	/** Date to */
	dateTo?: string;
	/** Description */
	description?: string;
}

/**
 * Preview of what migration would do for a single person note
 */
export interface LifeEventsMigrationPreview {
	/** The file that would be modified */
	file: TFile;
	/** Person name */
	personName: string;
	/** Number of events that would be created */
	eventCount: number;
	/** The events that would be created */
	events: EventMigrationPreview[];
}

/**
 * Result of the migration operation
 */
export interface LifeEventsMigrationResult {
	/** Total person notes processed */
	processed: number;
	/** Person notes actually modified */
	modified: number;
	/** Person notes skipped */
	skipped: number;
	/** Errors encountered */
	errors: Array<{ file: string; error: string }>;
	/** Total event notes created */
	eventNotesCreated: number;
	/** Paths of created event notes */
	createdEventPaths: string[];
	/**
	 * Total event notes reused instead of created. Matches happen when
	 * an existing `cr_type: event` note in the vault already encodes the
	 * same `(persons, event_type, date)` tuple as an inline event about
	 * to be migrated, so the migration links to it rather than minting
	 * a duplicate file (#414).
	 */
	eventNotesReused: number;
	/** Paths of event notes that were reused via semantic-identity match (#414) */
	reusedEventPaths: string[];
}

/**
 * Event type display names for generating titles
 */
const EVENT_TYPE_NAMES: Record<EventType, string> = {
	residence: 'Residence',
	occupation: 'Occupation',
	education: 'Education',
	military: 'Military Service',
	immigration: 'Immigration',
	baptism: 'Baptism',
	confirmation: 'Confirmation',
	ordination: 'Ordination',
	custom: 'Event'
};

/**
 * Pure helper: format an event date value (number or string) to its
 * display-string representation. Numbers are assumed to be year-only and
 * stringified directly; strings pass through unchanged. Null / undefined
 * input returns undefined.
 *
 * Exported so title generation and test coverage don't need an instance
 * of the migration service (1.0 testing gate for migrations).
 */
export function formatEventDate(value: string | number | undefined | null): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'number') {
		return String(value);
	}
	return String(value);
}

/**
 * Pure helper: generate an event-note title from a person name and an
 * inline event. If the event has a parseable start date, the year is
 * included in the title (e.g. "Alice - Baptism 1850"). Otherwise the
 * title omits the year (e.g. "Alice - Baptism").
 */
export function generateEventTitle(personName: string, event: InlineEvent): string {
	const typeName = EVENT_TYPE_NAMES[event.event_type] || 'Event';
	const dateStr = formatEventDate(event.date_from);
	if (dateStr) {
		const year = dateStr.substring(0, 4);
		return `${personName} - ${typeName} ${year}`;
	}
	return `${personName} - ${typeName}`;
}

/**
 * Pure helper: convert a title string into a URL-safe filename slug.
 * Lowercases, replaces non-alphanumeric runs with single hyphens, trims
 * leading/trailing hyphens, and caps the result at 100 characters.
 */
export function slugifyTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 100);
}

/**
 * Service for migrating inline events to event note files
 */
export class LifeEventsMigrationService {
	constructor(
		private app: App,
		private settings: CanvasRootsSettings
	) {}

	/**
	 * Detect all person notes with inline events arrays
	 */
	detectInlineEvents(): LegacyEventsNote[] {
		const results: LegacyEventsNote[] = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter as Record<string, unknown>;

			// Only process person notes (must have cr_id)
			if (!fm.cr_id) continue;

			// Must be a person note
			if (!isPersonNote(fm, cache, this.settings.noteTypeDetection)) continue;

			// Check for events array
			const events = fm.events;
			if (!events || !Array.isArray(events) || events.length === 0) continue;

			// Get person info
			const personName = typeof fm.name === 'string' ? fm.name : file.basename;
			const personCrId = fm.cr_id as string;

			// Parse events
			const parsedEvents: InlineEvent[] = [];
			for (const event of events) {
				if (typeof event !== 'object' || event === null) continue;
				const e = event as Record<string, unknown>;

				// Must have event_type
				if (!e.event_type || typeof e.event_type !== 'string') continue;

				parsedEvents.push({
					event_type: e.event_type as EventType,
					place: typeof e.place === 'string' ? e.place : undefined,
					date_from: e.date_from as string | number | undefined,
					date_to: e.date_to as string | number | undefined,
					description: typeof e.description === 'string' ? e.description : undefined
				});
			}

			if (parsedEvents.length > 0) {
				results.push({
					file,
					personName,
					personCrId,
					events: parsedEvents,
					eventCount: parsedEvents.length
				});
			}
		}

		if (results.length > 0) {
			logLegacyFormatWarning(results.length);
		}

		logger.info('detectInlineEvents', `Found ${results.length} person notes with inline events arrays`);
		return results;
	}

	/**
	 * Preview migration for a set of notes
	 */
	previewMigration(notes: LegacyEventsNote[]): LifeEventsMigrationPreview[] {
		return notes.map(note => {
			const events: EventMigrationPreview[] = note.events.map(event => {
				return {
					title: generateEventTitle(note.personName, event),
					eventType: event.event_type,
					place: event.place,
					dateFrom: formatEventDate(event.date_from),
					dateTo: formatEventDate(event.date_to),
					description: event.description
				};
			});

			return {
				file: note.file,
				personName: note.personName,
				eventCount: note.eventCount,
				events
			};
		});
	}

	/**
	 * Migrate all detected notes to event note format
	 */
	async migrateToEventNotes(
		notes: LegacyEventsNote[],
		onProgress?: (current: number, total: number, currentFile?: string) => void
	): Promise<LifeEventsMigrationResult> {
		const result: LifeEventsMigrationResult = {
			processed: 0,
			modified: 0,
			skipped: 0,
			errors: [],
			eventNotesCreated: 0,
			createdEventPaths: [],
			eventNotesReused: 0,
			reusedEventPaths: []
		};

		const eventsFolder = this.settings.eventsFolder || 'Charted Roots/Events';

		// Ensure events folder exists
		await this.ensureFolderExists(eventsFolder);

		// Build a semantic-identity map of existing event notes so a
		// re-run of the migration (or a run that overlaps with an earlier
		// partial migration) reuses existing notes instead of creating
		// duplicates (#414). The map is seeded with anything currently
		// on disk and updated as we create new notes during this run, so
		// two inline events within the same run that hash to the same
		// identity also collapse to a single note.
		const identityMap = this.buildExistingEventIdentityMap();

		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			// Report progress
			onProgress?.(i + 1, notes.length, note.file.basename);

			result.processed++;

			try {
				const createdEventLinks: string[] = [];

				// Create or reuse an event note for each inline event
				for (const event of note.events) {
					const identity = computeEventIdentity({
						persons: [note.personName],
						eventType: event.event_type,
						date: event.date_from
					});

					const existing = identity ? identityMap.get(identity) : undefined;
					let eventFile: TFile;
					if (existing) {
						eventFile = existing;
						result.eventNotesReused++;
						result.reusedEventPaths.push(existing.path);
					} else {
						eventFile = await this.createEventNote(
							note.personName,
							note.personCrId,
							event,
							eventsFolder
						);
						result.eventNotesCreated++;
						result.createdEventPaths.push(eventFile.path);
						if (identity) identityMap.set(identity, eventFile);
					}

					createdEventLinks.push(`[[${eventFile.basename}]]`);
				}

				// Update person note: add life_events, remove events
				await this.app.fileManager.processFrontMatter(note.file, (frontmatter) => {
					// Add life_events with wikilinks to created event notes
					const existingLifeEvents = frontmatter.life_events;
					if (existingLifeEvents && Array.isArray(existingLifeEvents)) {
						// Merge with existing, avoiding duplicates
						const merged = [...existingLifeEvents];
						for (const link of createdEventLinks) {
							if (!merged.includes(link)) {
								merged.push(link);
							}
						}
						frontmatter.life_events = merged;
					} else {
						frontmatter.life_events = createdEventLinks;
					}

					// Remove the old events array
					delete frontmatter.events;
				});

				result.modified++;

				logger.debug('migrateToEventNotes', `Migrated ${note.file.path}`, {
					eventsCreated: note.eventCount,
					lifeEventsAdded: createdEventLinks.length
				});
			} catch (error) {
				result.errors.push({
					file: note.file.path,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}

		logger.info('migrateToEventNotes', `Migration complete`, result);
		return result;
	}

	/**
	 * Quick check if vault has any inline events arrays
	 * Used for showing migration notices
	 */
	hasInlineEvents(): boolean {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter as Record<string, unknown>;

			// Only check person notes
			if (!fm.cr_id) continue;
			if (!isPersonNote(fm, cache, this.settings.noteTypeDetection)) continue;

			// Check for events array with data
			const events = fm.events;
			if (events && Array.isArray(events) && events.length > 0) {
				return true;
			}
		}

		return false;
	}

	// ============ Private Methods ============

	/**
	 * Scan the vault for existing `cr_type: event` notes and build a map
	 * from canonical `(persons, event_type, date)` identity → TFile.
	 * Used by `migrateToEventNotes` to dedup against previously-created
	 * event notes (#414). Notes whose frontmatter can't be resolved to a
	 * valid identity (missing persons or event_type) are skipped. If two
	 * existing notes happen to share an identity, the first one wins —
	 * this is a pre-existing-duplicates situation the user can clean up
	 * separately; the migration just picks a stable representative.
	 */
	private buildExistingEventIdentityMap(): Map<string, TFile> {
		const map = new Map<string, TFile>();
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;
			const fm = cache.frontmatter as Record<string, unknown>;
			if (fm.cr_type !== 'event') continue;
			const identity = extractEventIdentityFromFrontmatter(fm);
			if (identity === null) continue;
			if (!map.has(identity)) {
				map.set(identity, file);
			}
		}
		return map;
	}

	/**
	 * Create an event note for an inline event
	 */
	private async createEventNote(
		personName: string,
		personCrId: string,
		event: InlineEvent,
		folder: string
	): Promise<TFile> {
		const crId = generateCrId();
		const title = generateEventTitle(personName, event);
		const fileName = slugifyTitle(title) + '.md';
		const filePath = normalizePath(`${folder}/${fileName}`);

		// Handle duplicate filenames by appending a number
		let finalPath = filePath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const baseName = slugifyTitle(title);
			finalPath = normalizePath(`${folder}/${baseName}-${counter}.md`);
			counter++;
		}

		// Build frontmatter
		const frontmatterLines: string[] = [
			'---',
			'cr_type: event',
			`cr_id: ${crId}`,
			`title: "${title.replace(/"/g, '\\"')}"`,
			`event_type: ${event.event_type}`,
			'date_precision: exact',
			'persons:',
			`  - "[[${personName}]]"`
		];

		// Add date if present
		const dateFrom = formatEventDate(event.date_from);
		if (dateFrom) {
			frontmatterLines.push(`date: "${dateFrom}"`);
		}

		const dateTo = formatEventDate(event.date_to);
		if (dateTo) {
			frontmatterLines.push(`date_end: "${dateTo}"`);
		}

		// Add place if present
		if (event.place) {
			// Ensure wikilink format
			const placeValue = event.place.startsWith('[[') ? event.place : `[[${event.place.replace(/^\[\[/, '').replace(/\]\]$/, '')}]]`;
			frontmatterLines.push(`place: "${placeValue}"`);
		}

		// Add description if present
		if (event.description) {
			frontmatterLines.push(`description: "${event.description.replace(/"/g, '\\"')}"`);
		}

		frontmatterLines.push('confidence: medium');
		frontmatterLines.push('---');

		// Build note body
		const body = `\n# ${title}\n\n${event.description || ''}\n`;

		const content = frontmatterLines.join('\n') + body;

		// Create the file
		const file = await this.app.vault.create(finalPath, content);

		logger.debug('createEventNote', `Created event note: ${file.path}`);
		return file;
	}

	// generateEventTitle / formatEventDate / slugifyTitle have been promoted
	// to module-level pure helpers (see top of file). The class delegates to
	// those so tests can exercise the title / date / slug logic directly.

	/**
	 * Ensure a folder exists, creating it if necessary
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		} else if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${normalizedPath}`);
		}
	}
}
