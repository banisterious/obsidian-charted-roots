/**
 * Note Writer
 * Creates separate note entity files for Phase 4 Gramps integration
 */

import { App, normalizePath } from 'obsidian';
import type { GrampsNote } from '../gramps/gramps-types';
import { generateCrId } from './uuid';
import { convertNoteToMarkdown } from '../gramps/gramps-note-converter';

/**
 * Options for writing a note file
 */
export interface NoteWriteOptions {
	/** Folder to create the note in */
	notesFolder: string;
	/** Property aliases for custom frontmatter names */
	propertyAliases?: Record<string, string>;
	/** First referencing entity name (for generating note name) */
	referencingEntityName?: string;
	/** Whether to overwrite existing files */
	overwriteExisting?: boolean;
}

/**
 * Result of writing a note file
 */
export interface NoteWriteResult {
	/** Whether the write was successful */
	success: boolean;
	/** Path to the created/updated note file */
	path: string;
	/** The cr_id assigned to the note */
	crId: string;
	/** Wikilink to use for referencing this note */
	wikilink: string;
	/** Generated note filename (without extension) */
	filename: string;
	/** Error message if not successful */
	error?: string;
}

/**
 * Get the property name to use in frontmatter.
 * If an alias exists for the canonical property, returns the user's aliased name.
 */
function getWriteProperty(canonical: string, aliases: Record<string, string>): string {
	for (const [userProp, canonicalProp] of Object.entries(aliases)) {
		if (canonicalProp === canonical) {
			return userProp;
		}
	}
	return canonical;
}

/**
 * Generate a note filename from the Gramps note type and referencing entity
 *
 * Naming convention:
 * 1. Type + first linked entity: "Research on John Smith"
 * 2. If no linked entity: "Research Note N0001"
 * 3. If no type: "Note N0001"
 */
export function generateNoteFilename(
	note: GrampsNote,
	referencingEntityName?: string
): string {
	const noteType = note.type || '';
	const grampsId = note.id || note.handle.substring(0, 8);

	if (noteType && referencingEntityName) {
		// Pattern 1: "Research on John Smith"
		return `${noteType} on ${referencingEntityName}`;
	} else if (noteType) {
		// Pattern 2: "Research Note N0001"
		return `${noteType} ${grampsId}`;
	} else {
		// Pattern 3: "Note N0001"
		return `Note ${grampsId}`;
	}
}

/**
 * Sanitize a filename for use in the vault
 */
function sanitizeFilename(name: string): string {
	// Remove or replace invalid characters
	return name
		.replace(/[<>:"/\\|?*]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Write a Gramps note as a separate note file
 */
export async function writeNoteFile(
	app: App,
	note: GrampsNote,
	options: NoteWriteOptions
): Promise<NoteWriteResult> {
	const aliases = options.propertyAliases || {};
	const prop = (canonical: string) => getWriteProperty(canonical, aliases);

	// Generate cr_id
	const crId = `note_${note.id || generateCrId()}`;

	// Generate filename
	const baseFilename = sanitizeFilename(
		generateNoteFilename(note, options.referencingEntityName)
	);

	// Check for existing files and add suffix if needed
	let filename = baseFilename;
	let filePath = normalizePath(`${options.notesFolder}/${filename}.md`);
	let suffix = 1;

	if (!options.overwriteExisting) {
		while (app.vault.getAbstractFileByPath(filePath)) {
			suffix++;
			filename = `${baseFilename} (${suffix})`;
			filePath = normalizePath(`${options.notesFolder}/${filename}.md`);
		}
	}

	// Build frontmatter
	const frontmatterLines: string[] = [
		'---',
		`${prop('cr_type')}: note`,
		`${prop('cr_id')}: ${crId}`
	];

	// Add gramps_id and gramps_handle for sync support
	if (note.id) {
		frontmatterLines.push(`${prop('gramps_id')}: ${note.id}`);
	}
	frontmatterLines.push(`${prop('gramps_handle')}: ${note.handle}`);

	// Add note type
	if (note.type) {
		frontmatterLines.push(`${prop('cr_note_type')}: ${note.type}`);
	}

	// Add privacy flag
	if (note.private) {
		frontmatterLines.push(`${prop('private')}: true`);
	}

	frontmatterLines.push('---');

	// Convert note content to markdown
	let content = '';
	if (note.text) {
		content = convertNoteToMarkdown(note);
	}

	// Build full file content
	const fileContent = frontmatterLines.join('\n') + '\n\n' + content;

	try {
		// Ensure folder exists
		const folder = app.vault.getAbstractFileByPath(options.notesFolder);
		if (!folder) {
			await app.vault.createFolder(options.notesFolder);
		}

		// Check if file exists
		const existingFile = app.vault.getAbstractFileByPath(filePath);
		if (existingFile && options.overwriteExisting) {
			await app.vault.modify(existingFile as import('obsidian').TFile, fileContent);
		} else {
			await app.vault.create(filePath, fileContent);
		}

		return {
			success: true,
			path: filePath,
			crId,
			wikilink: `[[${filename}]]`,
			filename
		};
	} catch (error) {
		return {
			success: false,
			path: filePath,
			crId,
			wikilink: `[[${filename}]]`,
			filename,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

/**
 * Entity reference info for note naming
 */
export interface NoteEntityReference {
	entityName: string;
	entityType: 'person' | 'event' | 'place' | 'source';
}

/**
 * Build a note-to-entity reference map from parsed Gramps data
 * Maps note handle to the first entity that references it
 *
 * This is used to generate meaningful note names like "Research on John Smith"
 * instead of just "Research N0001"
 */
export function buildNoteReferenceMap(
	persons: Map<string, { name?: string; noteRefs: string[] }>,
	events?: Map<string, { type?: string; description?: string; noteRefs: string[] }>,
	places?: Map<string, { name?: string; noteRefs: string[] }>,
	sources?: Map<string, { title?: string; noteRefs: string[] }>
): Map<string, NoteEntityReference> {
	const map = new Map<string, NoteEntityReference>();

	// Process persons first (most common reference)
	for (const [, person] of persons) {
		if (person.noteRefs) {
			for (const noteRef of person.noteRefs) {
				if (!map.has(noteRef)) {
					map.set(noteRef, {
						entityName: person.name || 'Unknown Person',
						entityType: 'person'
					});
				}
			}
		}
	}

	// Process events
	if (events) {
		for (const [, event] of events) {
			if (event.noteRefs) {
				for (const noteRef of event.noteRefs) {
					if (!map.has(noteRef)) {
						map.set(noteRef, {
							entityName: event.description || event.type || 'Unknown Event',
							entityType: 'event'
						});
					}
				}
			}
		}
	}

	// Process places
	if (places) {
		for (const [, place] of places) {
			if (place.noteRefs) {
				for (const noteRef of place.noteRefs) {
					if (!map.has(noteRef)) {
						map.set(noteRef, {
							entityName: place.name || 'Unknown Place',
							entityType: 'place'
						});
					}
				}
			}
		}
	}

	// Process sources
	if (sources) {
		for (const [, source] of sources) {
			if (source.noteRefs) {
				for (const noteRef of source.noteRefs) {
					if (!map.has(noteRef)) {
						map.set(noteRef, {
							entityName: source.title || 'Unknown Source',
							entityType: 'source'
						});
					}
				}
			}
		}
	}

	return map;
}
