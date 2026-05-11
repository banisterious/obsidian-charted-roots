/**
 * Place note writer utilities for Charted Roots
 * Creates place notes with proper YAML frontmatter
 */

import { App, TFile, normalizePath } from 'obsidian';
import { generateCrId } from './uuid';
import { getLogger } from './logging';
import {
	PlaceCategory,
	PlaceType,
	GeoCoordinates,
	CustomCoordinates,
	HistoricalName,
	DEFAULT_PLACE_CATEGORY
} from '../models/place';
import { isPlaceNote } from '../utils/note-type-detection';
import { getCanonicalLinktext } from '../utils/wikilink-resolver';
import { findCrNoteByCrId } from '../utils/cr-id-resolver';

const logger = getLogger('PlaceNoteWriter');

/**
 * Get the property name to write, respecting aliases
 * If user has an alias for this canonical property, return the user's property name
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
 * Place data for note creation
 */
export interface PlaceData {
	name: string;
	crId?: string;
	aliases?: string[];
	placeCategory?: PlaceCategory;
	placeType?: PlaceType;
	universe?: string;
	parentPlace?: string;      // Wikilink or name for display
	parentPlaceId?: string;    // Parent's cr_id for reliable resolution
	coordinates?: GeoCoordinates;
	customCoordinates?: CustomCoordinates;
	historicalNames?: HistoricalName[];
	collection?: string;       // User-defined collection/grouping
	media?: string[];          // Wikilinks to media files
	notesContent?: string;     // Markdown notes content to append
	private?: boolean;         // Privacy flag (if any attached note is private)
	maps?: string[];           // Map IDs this place appears on (for per-map filtering)
	needsResearch?: string[];  // Research questions requiring investigation
	tags?: string[];           // Obsidian tags (e.g., from Gramps import)
}

/**
 * Options for place note creation
 */
export interface CreatePlaceNoteOptions {
	/** Directory path where place notes are stored (default: root) */
	directory?: string;
	/** Whether to open the note after creation (default: false) */
	openAfterCreate?: boolean;
	/** Property aliases for writing custom property names (user property → canonical) */
	propertyAliases?: Record<string, string>;
	/** Override the auto-computed filename (without .md extension).
	 *  When provided, this is used instead of deriving from place.name.
	 *  Useful when the importer computes a disambiguated name (e.g., "Pennsylvania USA"). */
	fileName?: string;
	/** Include dynamic content blocks in the note body */
	includeDynamicBlocks?: boolean;
}

/**
 * Create a place note with YAML frontmatter
 *
 * @param app - Obsidian app instance
 * @param place - Place data
 * @param options - Creation options
 * @returns The created TFile
 *
 * @example
 * const file = await createPlaceNote(app, {
 *   name: "London",
 *   placeCategory: "real",
 *   placeType: "city",
 *   parentPlace: "[[England]]",
 *   coordinates: { lat: 51.5074, long: -0.1278 }
 * }, {
 *   directory: "Places",
 *   openAfterCreate: true
 * });
 */
export async function createPlaceNote(
	app: App,
	place: PlaceData,
	options: CreatePlaceNoteOptions = {}
): Promise<TFile> {
	const { directory = '', openAfterCreate = false, propertyAliases = {} } = options;

	// Helper to get aliased property name
	const prop = (canonical: string) => getWriteProperty(canonical, propertyAliases);

	// Generate cr_id if not provided
	const crId = place.crId || generateCrId();

	// Sanitize name - strip wikilink brackets if present
	const cleanName = stripWikilinkBrackets(place.name || '');

	// Build frontmatter with aliased property names
	const frontmatter: Record<string, unknown> = {
		[prop('cr_type')]: 'place',
		[prop('cr_id')]: crId,
		[prop('name')]: cleanName
	};

	// Aliases
	if (place.aliases && place.aliases.length > 0) {
		frontmatter.aliases = place.aliases;
	}

	// Category (only include if not default)
	if (place.placeCategory && place.placeCategory !== DEFAULT_PLACE_CATEGORY) {
		frontmatter[prop('place_category')] = place.placeCategory;
	}

	// Place type
	if (place.placeType) {
		frontmatter[prop('place_type')] = place.placeType;
	}

	// Universe (only for fictional/mythological/legendary places)
	if (place.universe && isUniverseApplicable(place.placeCategory)) {
		frontmatter[prop('universe')] = place.universe;
	}

	// Parent place (dual storage)
	if (place.parentPlaceId && place.parentPlace) {
		frontmatter[prop('parent_place')] = createSmartWikilink(place.parentPlace, app, place.parentPlaceId);
		frontmatter.parent_place_id = place.parentPlaceId;
	} else if (place.parentPlaceId) {
		frontmatter.parent_place_id = place.parentPlaceId;
	} else if (place.parentPlace) {
		frontmatter[prop('parent_place')] = createSmartWikilink(place.parentPlace, app, place.parentPlaceId);
	}

	// Coordinates (only for real/historical/disputed places) - flat properties
	if (place.coordinates && isCoordinatesApplicable(place.placeCategory)) {
		frontmatter.coordinates_lat = place.coordinates.lat;
		frontmatter.coordinates_long = place.coordinates.long;
	}

	// Custom coordinates (applicable to all place types) - flat properties
	if (place.customCoordinates) {
		frontmatter.custom_coordinates_x = place.customCoordinates.x;
		frontmatter.custom_coordinates_y = place.customCoordinates.y;
		if (place.customCoordinates.map) {
			frontmatter.custom_coordinates_map = place.customCoordinates.map;
		}
	}

	// Historical names
	if (place.historicalNames && place.historicalNames.length > 0) {
		frontmatter.historical_names = place.historicalNames.map(hn => {
			const entry: Record<string, string> = { name: hn.name };
			if (hn.period) {
				entry.period = hn.period;
			}
			return entry;
		});
	}

	// Collection (user-defined grouping)
	if (place.collection) {
		frontmatter[prop('collection')] = place.collection;
	}

	// Media references
	if (place.media && place.media.length > 0) {
		frontmatter[prop('media')] = place.media;
	}

	// Privacy flag (if any attached note is private)
	if (place.private) {
		frontmatter[prop('private')] = true;
	}

	// Map restrictions (for per-map filtering)
	if (place.maps && place.maps.length > 0) {
		frontmatter[prop('maps')] = place.maps;
	}

	// Research questions
	if (place.needsResearch && place.needsResearch.length > 0) {
		frontmatter[prop('needs_research')] = place.needsResearch;
	}

	if (place.tags && place.tags.length > 0) {
		frontmatter['tags'] = place.tags;
	}

	logger.debug('frontmatter', `Final: ${JSON.stringify(frontmatter)}`);

	// Build YAML frontmatter string
	const yamlContent = buildYamlFrontmatter(frontmatter);

	// Build note content with optional notes section
	const contentParts = [
		yamlContent,
		'',
		`# ${cleanName}`,
		'',
		''
	];

	// Add media block if dynamic blocks enabled and place has media
	if (options.includeDynamicBlocks && place.media && place.media.length > 0) {
		contentParts.push('```charted-roots-media');
		contentParts.push('columns: 3');
		contentParts.push('size: medium');
		contentParts.push('editable: true');
		contentParts.push('```');
		contentParts.push('');
	}

	// Append notes content if provided
	if (place.notesContent) {
		contentParts.push(place.notesContent);
	}

	contentParts.push('');
	const noteContent = contentParts.join('\n');

	// Use caller-provided filename or derive from place name
	const filename = options.fileName ?? sanitizeFilename(cleanName || 'Untitled Place');

	// Build full path
	const fullPath = directory
		? normalizePath(`${directory}/${filename}.md`)
		: normalizePath(`${filename}.md`);

	// Check if file already exists
	let finalPath = fullPath;
	let counter = 1;
	while (app.vault.getAbstractFileByPath(finalPath)) {
		const baseName = filename;
		const newFilename = `${baseName} ${counter}`;
		finalPath = directory
			? normalizePath(`${directory}/${newFilename}.md`)
			: normalizePath(`${newFilename}.md`);
		counter++;
	}

	// Create the file
	const file = await app.vault.create(finalPath, noteContent);
	logger.info('create', `Created place note: ${finalPath}`);

	// Open the file if requested
	if (openAfterCreate) {
		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	return file;
}

/**
 * Update an existing place note's frontmatter
 *
 * @param app - Obsidian app instance
 * @param file - The place note file to update
 * @param updates - Partial place data to update
 */
export async function updatePlaceNote(
	app: App,
	file: TFile,
	updates: Partial<PlaceData>
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		if (updates.name !== undefined) {
			frontmatter.name = updates.name;
		}
		if (updates.aliases !== undefined) {
			frontmatter.aliases = updates.aliases;
		}
		if (updates.placeCategory !== undefined) {
			if (updates.placeCategory === DEFAULT_PLACE_CATEGORY) {
				delete frontmatter.place_category;
			} else {
				frontmatter.place_category = updates.placeCategory;
			}
		}
		if (updates.placeType !== undefined) {
			frontmatter.place_type = updates.placeType;
		}
		if (updates.universe !== undefined) {
			if (updates.universe && isUniverseApplicable(updates.placeCategory || frontmatter.place_category)) {
				frontmatter.universe = updates.universe;
			} else {
				delete frontmatter.universe;
			}
		}
		if (updates.parentPlace !== undefined) {
			frontmatter.parent_place = createWikilink(updates.parentPlace, app, updates.parentPlaceId);
		}
		if (updates.parentPlaceId !== undefined) {
			frontmatter.parent_place_id = updates.parentPlaceId;
		}
		if (updates.coordinates !== undefined) {
			delete frontmatter.coordinates; // Remove legacy nested
			if (updates.coordinates) {
				frontmatter.coordinates_lat = updates.coordinates.lat;
				frontmatter.coordinates_long = updates.coordinates.long;
			} else {
				delete frontmatter.coordinates_lat;
				delete frontmatter.coordinates_long;
			}
		}
		if (updates.customCoordinates !== undefined) {
			delete frontmatter.custom_coordinates; // Remove legacy nested
			if (updates.customCoordinates) {
				frontmatter.custom_coordinates_x = updates.customCoordinates.x;
				frontmatter.custom_coordinates_y = updates.customCoordinates.y;
				if (updates.customCoordinates.map) {
					frontmatter.custom_coordinates_map = updates.customCoordinates.map;
				} else {
					delete frontmatter.custom_coordinates_map;
				}
			} else {
				delete frontmatter.custom_coordinates_x;
				delete frontmatter.custom_coordinates_y;
				delete frontmatter.custom_coordinates_map;
			}
		}
		if (updates.historicalNames !== undefined) {
			frontmatter.historical_names = updates.historicalNames;
		}
		if (updates.collection !== undefined) {
			if (updates.collection) {
				frontmatter.collection = updates.collection;
			} else {
				delete frontmatter.collection;
			}
		}
		if (updates.maps !== undefined) {
			if (updates.maps && updates.maps.length > 0) {
				frontmatter.maps = updates.maps;
			} else {
				delete frontmatter.maps;
			}
		}
		if (updates.needsResearch !== undefined) {
			if (updates.needsResearch && updates.needsResearch.length > 0) {
				frontmatter.needs_research = updates.needsResearch;
			} else {
				delete frontmatter.needs_research;
			}
		}
	});

	// Post-fix: Obsidian's processFrontMatter re-serializes the entire YAML.
	// Its serializer may strip quotes from values containing [[wikilinks]],
	// causing YAML to reinterpret them as nested arrays on the next parse.
	// Re-quote any bare [[...]] values in the frontmatter to prevent corruption.
	await requoteWikilinksInFrontmatter(app, file);

	logger.info('update', `Updated place note: ${file.path}`);
}

/**
 * Re-quote any bare [[wikilinks]] in a file's YAML frontmatter.
 *
 * Obsidian's YAML serializer can strip quotes from wikilink values,
 * turning `"[[Place Name]]"` into `[[Place Name]]`. In YAML, unquoted
 * `[[...]]` is parsed as a nested array, corrupting the data on
 * the next read. This function wraps any bare occurrences in quotes.
 */
export async function requoteWikilinksInFrontmatter(app: App, file: TFile): Promise<void> {
	await app.vault.process(file, (content) => {
		// Find frontmatter boundaries
		const fmStart = content.indexOf('---');
		if (fmStart !== 0) return content;
		const fmEnd = content.indexOf('---', 3);
		if (fmEnd === -1) return content;

		const before = content.slice(0, fmStart);
		const frontmatter = content.slice(fmStart, fmEnd + 3);
		const after = content.slice(fmEnd + 3);

		// Match bare [[...]] that aren't already inside quotes.
		// Targets values like `- [[Foo]]` or `key: [[Foo]]` where the
		// wikilink is not surrounded by " characters on the same line.
		const fixed = frontmatter.replace(
			/^(\s*(?:-\s*)?(?:\w[\w\s]*:\s*)?)(\[\[.+?\]\])(\s*)$/gm,
			(match, prefix: string, wikilink: string, suffix: string) => {
				// Check if the line already has quotes around the wikilink
				const trimmedPrefix = prefix.trimEnd();
				if (trimmedPrefix.endsWith('"') || trimmedPrefix.endsWith("'")) {
					return match; // Already quoted
				}
				return `${prefix}"${wikilink}"${suffix}`;
			}
		);

		if (fixed === frontmatter) return content;
		return before + fixed + after;
	});
}

/**
 * Find a place note by cr_id
 *
 * @param app - Obsidian app instance
 * @param crId - The place's cr_id
 * @param directory - Optional directory to limit search
 * @returns The TFile if found, null otherwise
 */
export function findPlaceNoteByCrId(
	app: App,
	crId: string,
	directory?: string
): TFile | null {
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		// Filter by directory if specified
		if (directory && !file.path.startsWith(directory)) {
			continue;
		}

		const cache = app.metadataCache.getFileCache(file);
		if (isPlaceNote(cache?.frontmatter, cache) && cache?.frontmatter?.cr_id === crId) {
			return file;
		}
	}

	return null;
}

/**
 * Find all place notes in the vault
 *
 * @param app - Obsidian app instance
 * @param directory - Optional directory to limit search
 * @returns Array of place note files
 */
export function findAllPlaceNotes(
	app: App,
	directory?: string
): TFile[] {
	const files = app.vault.getMarkdownFiles();
	const placeNotes: TFile[] = [];

	for (const file of files) {
		// Filter by directory if specified
		if (directory && !file.path.startsWith(directory)) {
			continue;
		}

		const cache = app.metadataCache.getFileCache(file);
		if (isPlaceNote(cache?.frontmatter, cache)) {
			placeNotes.push(file);
		}
	}

	return placeNotes;
}

/**
 * Check if universe field is applicable for a place category
 */
function isUniverseApplicable(category?: PlaceCategory): boolean {
	if (!category) return false;
	return ['fictional', 'mythological', 'legendary'].includes(category);
}

/**
 * Check if real-world coordinates are applicable for a place category
 */
function isCoordinatesApplicable(category?: PlaceCategory): boolean {
	// Default category is 'real', so if not specified, coordinates are applicable
	if (!category) return true;
	return ['real', 'historical', 'disputed'].includes(category);
}

/**
 * Create a wikilink with proper handling of duplicate filenames
 * Uses [[basename|name]] format when basename differs from name
 * @param name The display name
 * @param app The Obsidian app instance for file resolution
 */
function createSmartWikilink(name: string, app: App, crId?: string): string {
	// If already a wikilink, quote and return as-is
	if (name.startsWith('[[') && name.endsWith(']]')) {
		return `"${name}"`;
	}

	// Idempotency: collapse `basename|alias` stem form (#537) and `path/to/file`
	// form (#538) so repeated saves don't accumulate aliases or preserve paths.
	const afterPipe = name.includes('|')
		? name.split('|').pop()!.trim() || name
		: name;
	const displayName = afterPipe.includes('/')
		? afterPipe.split('/').pop()!.trim() || afterPipe
		: afterPipe;

	// Preferred path: when caller provides cr_id, look up the file by cr_id
	// to derive the basename directly. Mirrors person-note-writer's #524 fix.
	// Filtered to `cr_type: place` so a duplicate file outside CR's folder
	// structure can't shadow the canonical place note (#559).
	if (crId) {
		const fileById = findCrNoteByCrId(app, crId, 'place');
		if (fileById) {
			// Path-form when basename is ambiguous in the vault (#540).
			const target = getCanonicalLinktext(app, fileById);
			if (target !== displayName) {
				return `"[[${target}|${displayName}]]"`;
			}
			return `"[[${target}]]"`;
		}
	}

	// Fallback: try to resolve the name to a file
	const resolvedFile = app.metadataCache.getFirstLinkpathDest(displayName, '');
	if (resolvedFile) {
		const target = getCanonicalLinktext(app, resolvedFile);
		if (target !== displayName) {
			return `"[[${target}|${displayName}]]"`;
		}
		return `"[[${target}]]"`;
	}

	// Standard format
	return `"[[${displayName}]]"`;
}


/**
 * Create a wikilink for use with processFrontMatter (no YAML quoting)
 */
function createWikilink(name: string, app: App, crId?: string): string {
	if (name.startsWith('[[') && name.endsWith(']]')) {
		return name;
	}

	// Idempotency on `basename|alias` stem (#537) and `path/to/file` form (#538).
	const afterPipe = name.includes('|')
		? name.split('|').pop()!.trim() || name
		: name;
	const displayName = afterPipe.includes('/')
		? afterPipe.split('/').pop()!.trim() || afterPipe
		: afterPipe;

	if (crId) {
		const fileById = findFileByCrId(app, crId);
		if (fileById) {
			// Path-form when basename is ambiguous in the vault (#540).
			const target = getCanonicalLinktext(app, fileById);
			if (target !== displayName) {
				return `[[${target}|${displayName}]]`;
			}
			return `[[${target}]]`;
		}
	}

	const resolvedFile = app.metadataCache.getFirstLinkpathDest(displayName, '');
	if (resolvedFile) {
		const target = getCanonicalLinktext(app, resolvedFile);
		if (target !== displayName) {
			return `[[${target}|${displayName}]]`;
		}
		return `[[${target}]]`;
	}

	return `[[${displayName}]]`;
}

/**
 * Safely convert a value to string for YAML output
 */
function toYamlValue(value: unknown): string {
	if (typeof value === 'object' && value !== null) {
		return JSON.stringify(value);
	}
	return String(value);
}

/**
 * Build YAML frontmatter string from an object
 */
function buildYamlFrontmatter(frontmatter: Record<string, unknown>): string {
	const lines: string[] = ['---'];

	for (const [key, value] of Object.entries(frontmatter)) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			if (value.length === 0) continue;

			lines.push(`${key}:`);
			for (const item of value) {
				if (typeof item === 'object' && item !== null) {
					// Object in array (e.g., historical_names)
					const objLines = formatObjectForYaml(item as Record<string, unknown>, 4);
					lines.push(`  - ${objLines[0]}`);
					for (let i = 1; i < objLines.length; i++) {
						lines.push(`    ${objLines[i]}`);
					}
				} else {
					lines.push(`  - ${item}`);
				}
			}
		} else if (typeof value === 'object' && value !== null) {
			// Nested object (e.g., coordinates)
			lines.push(`${key}:`);
			const objLines = formatObjectForYaml(value as Record<string, unknown>, 2);
			for (const line of objLines) {
				lines.push(`  ${line}`);
			}
		} else if (typeof value === 'string' && value.includes('\n')) {
			// Multiline string
			lines.push(`${key}: |`);
			for (const line of value.split('\n')) {
				lines.push(`  ${line}`);
			}
		} else {
			lines.push(`${key}: ${toYamlValue(value)}`);
		}
	}

	lines.push('---');
	return lines.join('\n');
}

/**
 * Format an object for YAML output
 */
function formatObjectForYaml(obj: Record<string, unknown>, indent: number = 0): string[] {
	const lines: string[] = [];
	const entries = Object.entries(obj);

	for (let i = 0; i < entries.length; i++) {
		const [key, value] = entries[i];
		if (value === undefined || value === null) continue;

		if (i === 0 && indent > 0) {
			// First property on same line as array dash
			lines.push(`${key}: ${toYamlValue(value)}`);
		} else {
			lines.push(`${key}: ${toYamlValue(value)}`);
		}
	}

	return lines;
}

/**
 * Strip wikilink brackets from a string if present
 */
function stripWikilinkBrackets(value: string): string {
	return value
		.replace(/^\[\[/, '')
		.replace(/\]\]$/, '');
}

/**
 * Sanitize a filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
	return filename
		// Remove filesystem-invalid characters (including brackets)
		.replace(/[\\/:*?"<>|[\]]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}
