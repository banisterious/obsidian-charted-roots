/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Universe Service
 *
 * Provides CRUD operations for universe notes and manages
 * the universe cache for efficient lookups. Also supports
 * detecting "orphan" universes (string values without matching notes).
 */

import { App, TFile, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type {
	UniverseInfo,
	UniverseStatus,
	UniverseStats,
	UniverseEntityCounts,
	UniverseEntities,
	UniverseEntityEntry,
	UniverseWithCounts,
	UniverseValidationResult,
	OrphanUniverse,
	CreateUniverseData
} from '../types/universe-types';
import { getLogger } from '../../core/logging';
import { isUniverseNote } from '../../utils/note-type-detection';
import { sanitizeName } from '../../utils/name-sanitization';
import { waitForCacheRefresh } from '../../utils/cache-utils';
import { normalizeLabelValue } from '../../utils/wikilink-resolver';

const logger = getLogger('UniverseService');

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
 * Service for managing universe notes
 */
export class UniverseService {
	private app: App;
	private plugin: CanvasRootsPlugin;
	private universeCache: Map<string, UniverseInfo>;
	private cacheLoaded: boolean = false;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.universeCache = new Map();
	}

	/**
	 * Ensure the universe cache is loaded
	 */
	ensureCacheLoaded(): void {
		if (!this.cacheLoaded) {
			this.loadUniverseCache();
		}
	}

	/**
	 * Force reload the universe cache.
	 *
	 * `processFrontMatter` and `vault.create` / `vault.modify` write the
	 * file synchronously, but Obsidian's metadata cache catches up
	 * asynchronously via the file watcher. A `loadUniverseCache()` call
	 * between those two points reads stale data for the just-touched
	 * files. Callers that just performed writes should pass the modified
	 * TFiles so this method awaits each file's `metadataCache.changed`
	 * event before rebuilding (#547).
	 */
	async reloadCache(modifiedFiles?: TFile[]): Promise<void> {
		if (modifiedFiles && modifiedFiles.length > 0) {
			await Promise.all(
				modifiedFiles.map(file => waitForCacheRefresh(this.app, file))
			);
		}
		this.loadUniverseCache();
	}

	/**
	 * Get all universes
	 */
	getAllUniverses(): UniverseInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.universeCache.values());
	}

	/**
	 * Get universe by cr_id
	 */
	getUniverse(crId: string): UniverseInfo | null {
		this.ensureCacheLoaded();
		return this.universeCache.get(crId) || null;
	}

	/**
	 * Get universe by name (case-insensitive)
	 */
	getUniverseByName(name: string): UniverseInfo | null {
		this.ensureCacheLoaded();
		const lowerName = name.toLowerCase();
		for (const universe of this.universeCache.values()) {
			if (universe.name.toLowerCase() === lowerName) {
				return universe;
			}
		}
		return null;
	}

	/**
	 * Get universe by file path
	 */
	getUniverseByFile(file: TFile): UniverseInfo | null {
		this.ensureCacheLoaded();
		for (const universe of this.universeCache.values()) {
			if (universe.file.path === file.path) {
				return universe;
			}
		}
		return null;
	}

	/**
	 * Get universes by status
	 */
	getUniversesByStatus(status: UniverseStatus): UniverseInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.universeCache.values())
			.filter(universe => universe.status === status);
	}

	/**
	 * Get active universes (non-archived)
	 */
	getActiveUniverses(): UniverseInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.universeCache.values())
			.filter(universe => universe.status !== 'archived');
	}

	/**
	 * Cascade a Universe note's rename across referencing entity notes (#488 Part 2).
	 *
	 * When a Universe note's basename changes (e.g. `Star Wars` → `Star Wars (AU)`),
	 * `universe:` frontmatter fields on people / places / events / organizations
	 * that referenced the old basename as a plain string are still pointing at
	 * the old name and won't resolve. This method sweeps those references and
	 * rewrites them to the new basename.
	 *
	 * Scope:
	 * - Only updates plain-string `universe:` values that match `oldBasename`
	 *   exactly (case-sensitive). Wikilink-syntax values (`[[Old Name]]`) are
	 *   left alone because Obsidian's native wikilink-rewrite handles those on
	 *   rename. cr_id-based or slug-based references are stable identifiers
	 *   that don't track the basename and shouldn't be touched.
	 * - Touches notes with `cr_type` of person, place, event, organization,
	 *   or map. Map notes carry a `universe:` field that scopes which markers
	 *   render on them; without inclusion the map keeps pointing at the old
	 *   universe and its filter no longer matches the cascaded entities (#503).
	 *
	 * Returns the number of files updated. Caller is responsible for any UI
	 * surfacing (e.g. a `Notice`) and for re-loading the universe cache so the
	 * dropdown picks up the new state.
	 */
	async cascadeUniverseRename(oldBasename: string, newBasename: string): Promise<number> {
		const REFERENCING_TYPES: ReadonlyArray<string> = [
			'person', 'place', 'event', 'organization', 'map'
		];
		let updateCount = 0;
		const updatedFiles: TFile[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const crType = cache.frontmatter.cr_type;
			if (typeof crType !== 'string' || !REFERENCING_TYPES.includes(crType)) continue;

			const universe = cache.frontmatter.universe;
			if (typeof universe !== 'string') continue;
			if (universe !== oldBasename) continue;

			try {
				await this.app.fileManager.processFrontMatter(file, (fm) => {
					fm.universe = newBasename;
				});
				updateCount++;
				updatedFiles.push(file);
			} catch (error) {
				logger.error('cascadeUniverseRename', 'Failed to update universe reference', {
					file: file.path,
					oldBasename,
					newBasename,
					error
				});
			}
		}

		if (updateCount > 0) {
			// Bust the cache so the dropdown and other consumers pick up the
			// new state. The renamed Universe note's own cache entry is
			// invalidated by Obsidian's rename event; this reload also brings
			// the referencing-note view back in sync. Pass the touched files
			// so the reload waits for each metadataCache.changed event before
			// rebuilding (#547).
			await this.reloadCache(updatedFiles);
			logger.info('cascadeUniverseRename',
				`Updated universe references on ${updateCount} note(s)`,
				{ oldBasename, newBasename, updateCount });
		}

		return updateCount;
	}

	/**
	 * Validate a universe reference
	 * Returns validation result with universe info or suggestions for near-matches
	 */
	validateUniverseReference(value: string): UniverseValidationResult {
		this.ensureCacheLoaded();

		// Check for exact match by cr_id
		const byId = this.universeCache.get(value);
		if (byId) {
			return { isValid: true, universe: byId };
		}

		// Check for exact match by name
		const byName = this.getUniverseByName(value);
		if (byName) {
			return { isValid: true, universe: byName };
		}

		// Find suggestions (case-insensitive partial matches)
		const lowerValue = value.toLowerCase();
		const suggestions = Array.from(this.universeCache.values())
			.filter(u => u.name.toLowerCase().includes(lowerValue) ||
				u.crId.toLowerCase().includes(lowerValue))
			.slice(0, 5);

		return {
			isValid: false,
			error: `Universe "${value}" not found`,
			suggestions: suggestions.length > 0 ? suggestions : undefined
		};
	}

	/**
	 * Get universe statistics
	 */
	getStats(): UniverseStats {
		this.ensureCacheLoaded();
		const universes = Array.from(this.universeCache.values());

		const byStatus: Record<UniverseStatus, number> = {
			active: 0,
			draft: 0,
			archived: 0
		};

		for (const universe of universes) {
			byStatus[universe.status]++;
		}

		// Get orphan count (requires scanning entities)
		const orphans = this.findOrphanUniverses();

		return {
			total: universes.length,
			byStatus,
			orphanCount: orphans.length,
			totalEntities: this.countTotalEntitiesInUniverses()
		};
	}

	/**
	 * Create a new universe note
	 */
	async createUniverse(data: CreateUniverseData): Promise<TFile> {
		const folder = this.plugin.settings.universesFolder || '';

		// Helper to get aliased property name
		const aliases = this.plugin.settings.propertyAliases || {};
		const prop = (canonical: string) => getWriteProperty(canonical, aliases);

		// Use provided cr_id or generate one
		const crId = data.crId || `universe-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

		// Build frontmatter
		const frontmatterLines = [
			'---',
			`${prop('cr_type')}: universe`,
			`${prop('cr_id')}: ${crId}`,
			`${prop('name')}: "${data.name}"`
		];

		if (data.description) {
			frontmatterLines.push(`description: "${data.description}"`);
		}
		if (data.author) {
			frontmatterLines.push(`author: "${data.author}"`);
		}
		if (data.genre) {
			frontmatterLines.push(`genre: "${data.genre}"`);
		}

		frontmatterLines.push(`status: ${data.status || 'active'}`);
		if (data.defaultCalendar) {
			frontmatterLines.push(`default_calendar: "${data.defaultCalendar}"`);
		}
		if (data.currentDate) {
			frontmatterLines.push(`current_date: "${data.currentDate}"`);
		}
		frontmatterLines.push(`created: ${new Date().toISOString().split('T')[0]}`);

		frontmatterLines.push('---');
		frontmatterLines.push('');
		frontmatterLines.push(`# ${data.name}`);
		frontmatterLines.push('');
		if (data.description) {
			frontmatterLines.push(data.description);
			frontmatterLines.push('');
		}

		const content = frontmatterLines.join('\n');

		// Ensure folder exists
		if (folder) {
			const folderExists = this.app.vault.getAbstractFileByPath(folder);
			if (!folderExists) {
				await this.app.vault.createFolder(folder);
			}
		}

		// Create file
		const filePath = folder ? `${folder}/${data.name}.md` : `${data.name}.md`;
		const file = await this.app.vault.create(filePath, content);

		// Reload cache. Pass the new file so the reload waits for the
		// metadata cache to index it before re-extracting (#547) — without
		// this, the new universe is silently dropped from the cache until
		// something else triggers a reload.
		await this.reloadCache([file]);

		new Notice(`Created universe: ${data.name}`);
		return file;
	}

	/**
	 * Update an existing universe note
	 */
	async updateUniverse(
		file: TFile,
		data: {
			name?: string;
			description?: string;
			author?: string;
			genre?: string;
			status?: UniverseStatus;
			defaultCalendar?: string;
			defaultMap?: string;
			currentDate?: string;
		}
	): Promise<void> {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			throw new Error('File has no frontmatter');
		}

		// Read current file content
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');

		// Find frontmatter boundaries
		let frontmatterStart = -1;
		let frontmatterEnd = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '---') {
				if (frontmatterStart === -1) {
					frontmatterStart = i;
				} else {
					frontmatterEnd = i;
					break;
				}
			}
		}

		if (frontmatterStart === -1 || frontmatterEnd === -1) {
			throw new Error('Could not find frontmatter boundaries');
		}

		// Build updated frontmatter
		const fm = cache.frontmatter;
		const newFrontmatterLines = ['---'];

		// Preserve cr_type and cr_id
		newFrontmatterLines.push(`cr_type: ${fm.cr_type || 'universe'}`);
		newFrontmatterLines.push(`cr_id: ${fm.cr_id}`);

		// Update fields
		const name = data.name ?? fm.name;
		if (name) newFrontmatterLines.push(`name: "${name}"`);

		const description = data.description !== undefined ? data.description : fm.description;
		if (description) newFrontmatterLines.push(`description: "${description}"`);

		const author = data.author !== undefined ? data.author : fm.author;
		if (author) newFrontmatterLines.push(`author: "${author}"`);

		const genre = data.genre !== undefined ? data.genre : fm.genre;
		if (genre) newFrontmatterLines.push(`genre: "${genre}"`);

		const status = data.status ?? fm.status ?? 'active';
		newFrontmatterLines.push(`status: ${status}`);

		const defaultCalendar = data.defaultCalendar !== undefined ? data.defaultCalendar : fm.default_calendar;
		if (defaultCalendar) newFrontmatterLines.push(`default_calendar: "${defaultCalendar}"`);

		const defaultMap = data.defaultMap !== undefined ? data.defaultMap : fm.default_map;
		if (defaultMap) newFrontmatterLines.push(`default_map: "${defaultMap}"`);

		const currentDate = data.currentDate !== undefined ? data.currentDate : fm.current_date;
		if (currentDate) newFrontmatterLines.push(`current_date: "${currentDate}"`);

		// Preserve created date
		if (fm.created) newFrontmatterLines.push(`created: ${fm.created}`);

		newFrontmatterLines.push('---');

		// Reconstruct file content
		const beforeFrontmatter = lines.slice(0, frontmatterStart);
		const afterFrontmatter = lines.slice(frontmatterEnd + 1);
		const newContent = [
			...beforeFrontmatter,
			...newFrontmatterLines,
			...afterFrontmatter
		].join('\n');

		await this.app.vault.modify(file, newContent);

		// Rename the file when the user changed the name (#488 Part 3). The
		// Part 2 cascade is keyed on `vault.on('rename')`; without renaming
		// the file here, changing the universe via Edit Universe modal would
		// only update the frontmatter `name` property and never propagate to
		// entities' `universe:` references. Renaming triggers the cascade
		// automatically (and lets Obsidian rewrite any [[oldName]] wikilinks
		// to [[newName]] for free).
		if (data.name) {
			const sanitized = sanitizeName(data.name);
			if (sanitized && sanitized !== file.basename) {
				const parentPath = file.parent?.path ?? '';
				const newPath = parentPath
					? `${parentPath}/${sanitized}.md`
					: `${sanitized}.md`;
				try {
					await this.app.fileManager.renameFile(file, newPath);
				} catch (error) {
					logger.error(
						'updateUniverse',
						`Renamed universe note failed; frontmatter saved but basename out of sync: ${error instanceof Error ? error.message : String(error)}`
					);
					new Notice(`Universe saved, but file rename failed — entities may not pick up the new name`);
				}
			}
		}

		// Reload cache. Pass the modified file so the reload waits for the
		// metadata cache to reflect the just-written change (#547) — without
		// this, the cached entry retains pre-edit state.
		await this.reloadCache([file]);

		new Notice(`Updated universe: ${name}`);
	}

	/**
	 * Archive a universe (soft delete)
	 */
	async archiveUniverse(file: TFile): Promise<void> {
		await this.updateUniverse(file, { status: 'archived' });
	}

	/**
	 * Get all unique universe values from entity notes
	 * Returns both registered universes and orphan string values
	 */
	getAllUniverseReferences(): Map<string, number> {
		const references = new Map<string, number>();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (fm?.universe) {
				// Normalize wikilink syntax so [[Lands of the Undying]],
				// [[Lands of the Undying|Lands of the Undying]], and the plain form
				// collapse to a single reference instead of separate orphan buckets (#755).
				const value = normalizeLabelValue(fm.universe);
				if (value) {
					references.set(value, (references.get(value) || 0) + 1);
				}
			}
		}

		return references;
	}

	/**
	 * Find orphan universes (referenced but no matching universe note)
	 */
	findOrphanUniverses(): OrphanUniverse[] {
		this.ensureCacheLoaded();
		const references = this.getAllUniverseReferences();
		const orphans: OrphanUniverse[] = [];

		// Collect known universe identifiers (cr_id and name)
		const knownIdentifiers = new Set<string>();
		for (const universe of this.universeCache.values()) {
			knownIdentifiers.add(universe.crId);
			knownIdentifiers.add(universe.name.toLowerCase());
		}

		// Find references that don't match any known universe
		for (const [value, count] of references) {
			const lowerValue = value.toLowerCase();
			const isKnown = knownIdentifiers.has(value) ||
				knownIdentifiers.has(lowerValue);

			if (!isKnown) {
				// Count by entity type
				const byType = this.countOrphanByType(value);
				orphans.push({
					value,
					entityCount: count,
					byType
				});
			}
		}

		return orphans;
	}

	/**
	 * Count entities by type for an orphan universe value
	 */
	private countOrphanByType(universeValue: string): OrphanUniverse['byType'] {
		const counts = {
			people: 0,
			places: 0,
			events: 0,
			organizations: 0,
			calendars: 0,
			maps: 0
		};

		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			// Compare against the normalized form so a wikilinked reference matches
			// the normalized orphan key gathered in getAllUniverseReferences (#755).
			if (!fm?.universe || normalizeLabelValue(fm.universe) !== universeValue) continue;

			const crType = fm.cr_type || fm.type;
			switch (crType) {
				case 'person':
					counts.people++;
					break;
				case 'place':
					counts.places++;
					break;
				case 'event':
					counts.events++;
					break;
				case 'organization':
					counts.organizations++;
					break;
				case 'map':
					counts.maps++;
					break;
				// Check for calendar-related properties
				default:
					if (fm.calendar_type || fm.year_length || fm.months) {
						counts.calendars++;
					}
			}
		}

		return counts;
	}

	/**
	 * Count total entities across all universes
	 */
	private countTotalEntitiesInUniverses(): number {
		let total = 0;
		const references = this.getAllUniverseReferences();
		for (const count of references.values()) {
			total += count;
		}
		return total;
	}

	/**
	 * Get entity counts for a specific universe
	 */
	getEntityCountsForUniverse(crIdOrName: string): UniverseEntityCounts {
		const counts: UniverseEntityCounts = {
			people: 0,
			places: 0,
			events: 0,
			organizations: 0,
			calendars: 0,
			maps: 0,
			schemas: 0
		};

		const files = this.app.vault.getMarkdownFiles();
		const lowerValue = crIdOrName.toLowerCase();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm?.universe) continue;

			const universeValue = String(fm.universe).toLowerCase();
			if (universeValue !== lowerValue && universeValue !== crIdOrName) continue;

			const crType = fm.cr_type || fm.type;
			switch (crType) {
				case 'person':
					counts.people++;
					break;
				case 'place':
					counts.places++;
					break;
				case 'event':
					counts.events++;
					break;
				case 'organization':
					counts.organizations++;
					break;
				case 'map':
					counts.maps++;
					break;
				case 'schema':
					counts.schemas++;
					break;
				default:
					// Check for calendar-related properties
					if (fm.calendar_type || fm.year_length || fm.months) {
						counts.calendars++;
					}
			}
		}

		return counts;
	}

	/**
	 * Get entities belonging to a universe identified by file, matching against
	 * any of the universe note's aliases (basename, frontmatter `name`, or
	 * `cr_id`). Resilient to the cascade-write-by-basename vs. dropdown-write-
	 * by-name divergence that surfaces after the universe is renamed and the
	 * sanitized basename diverges from the typed name (#503).
	 */
	getEntitiesForUniverseFile(file: TFile): UniverseEntities {
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;

		const aliases = new Set<string>();
		aliases.add(file.basename.toLowerCase());
		if (typeof fm?.name === 'string') aliases.add(fm.name.toLowerCase());
		if (typeof fm?.cr_id === 'string') aliases.add(fm.cr_id.toLowerCase());

		return this.collectEntities((universeValue) => aliases.has(universeValue));
	}

	/**
	 * Get entities belonging to a universe, grouped by type.
	 * Returns file references with basic frontmatter data for rendering.
	 */
	getEntitiesForUniverse(crIdOrName: string): UniverseEntities {
		const lowerValue = crIdOrName.toLowerCase();
		return this.collectEntities((universeValue) =>
			universeValue === lowerValue || universeValue === crIdOrName
		);
	}

	/**
	 * Walk markdown files and group entities by type for any whose `universe:`
	 * field passes the supplied matcher (called with the lowercased value).
	 * Shared by the string-keyed and file-keyed lookup variants.
	 */
	private collectEntities(matches: (lowerUniverseValue: string) => boolean): UniverseEntities {
		const result: UniverseEntities = {
			people: [],
			places: [],
			events: [],
			organizations: []
		};

		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm?.universe) continue;

			const universeValue = String(fm.universe).toLowerCase();
			if (!matches(universeValue)) continue;

			const crType = fm.cr_type || fm.type;
			const entry: UniverseEntityEntry = {
				name: fm.name || file.basename,
				file,
				crType: crType || 'unknown'
			};

			switch (crType) {
				case 'person':
					entry.born = fm.born ? String(fm.born) : undefined;
					entry.died = fm.died ? String(fm.died) : undefined;
					entry.occupation = fm.occupation ? String(fm.occupation) : undefined;
					entry.sex = fm.sex ? String(fm.sex) : undefined;
					result.people.push(entry);
					break;
				case 'place':
					entry.placeType = fm.place_type ? String(fm.place_type) : undefined;
					result.places.push(entry);
					break;
				case 'event': {
					entry.eventType = fm.event_type ? String(fm.event_type) : undefined;
					entry.date = fm.date ? String(fm.date) : undefined;
					if (Array.isArray(fm.persons)) {
						entry.persons = fm.persons.map((p: string) => {
							const match = p.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
							return match ? (match[2] || match[1].split('/').pop() || p) : p;
						});
					}
					const placeFm = fm.place ? String(fm.place) : undefined;
					if (placeFm) {
						const match = placeFm.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
						entry.placeName = match ? (match[2] || match[1].split('/').pop() || placeFm) : placeFm;
					}
					result.events.push(entry);
					break;
				}
				case 'organization':
					entry.orgType = fm.org_type ? String(fm.org_type) : undefined;
					result.organizations.push(entry);
					break;
			}
		}

		result.people.sort((a, b) => a.name.localeCompare(b.name));
		result.places.sort((a, b) => a.name.localeCompare(b.name));
		result.events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
		result.organizations.sort((a, b) => a.name.localeCompare(b.name));

		return result;
	}

	/**
	 * Get universes with entity counts
	 */
	getUniversesWithCounts(): UniverseWithCounts[] {
		this.ensureCacheLoaded();
		return Array.from(this.universeCache.values()).map(universe => ({
			...universe,
			counts: this.getEntityCountsForUniverse(universe.crId)
		}));
	}

	/**
	 * Get universe names for autocomplete
	 */
	getUniverseNamesForAutocomplete(): string[] {
		this.ensureCacheLoaded();
		return Array.from(this.universeCache.values())
			.filter(u => u.status !== 'archived')
			.map(u => u.name)
			.sort();
	}

	/**
	 * Load all universe notes into cache
	 */
	private loadUniverseCache(): void {
		this.universeCache.clear();

		const files = this.app.vault.getMarkdownFiles();
		let loadedCount = 0;

		for (const file of files) {
			const universe = this.extractUniverseInfo(file);
			if (universe) {
				this.universeCache.set(universe.crId, universe);
				loadedCount++;
			}
		}

		this.cacheLoaded = true;
		logger.debug('loadUniverseCache', `Loaded ${loadedCount} universes`);
	}

	/**
	 * Extract universe info from a file
	 */
	private extractUniverseInfo(file: TFile): UniverseInfo | null {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return null;
		}

		const fm = cache.frontmatter;

		// Must be a universe note (uses flexible detection)
		if (!isUniverseNote(fm, cache, this.plugin.settings.noteTypeDetection)) {
			return null;
		}

		// Must have cr_id
		if (!fm.cr_id) {
			logger.warn('extractUniverseInfo', `Universe without cr_id: ${file.path}`);
			return null;
		}

		return {
			file,
			crId: fm.cr_id,
			name: typeof fm.name === 'string' ? fm.name : file.basename,
			description: fm.description,
			author: fm.author,
			genre: fm.genre,
			status: this.parseStatus(fm.status),
			defaultCalendar: fm.default_calendar,
			defaultMap: fm.default_map,
			currentDate: typeof fm.current_date === 'string' ? fm.current_date : undefined,
			created: fm.created
		};
	}

	/**
	 * Parse status value with fallback
	 */
	private parseStatus(value: unknown): UniverseStatus {
		if (value === 'active' || value === 'draft' || value === 'archived') {
			return value;
		}
		return 'active';
	}
}

/**
 * Create a UniverseService instance
 */
export function createUniverseService(plugin: CanvasRootsPlugin): UniverseService {
	return new UniverseService(plugin);
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Match scope of file-level disable at top. */
