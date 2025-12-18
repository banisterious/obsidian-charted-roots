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
	UniverseWithCounts,
	UniverseValidationResult,
	OrphanUniverse,
	CreateUniverseData
} from '../types/universe-types';
import { getLogger } from '../../core/logging';
import { isUniverseNote } from '../../utils/note-type-detection';

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
	 * Force reload the universe cache
	 */
	reloadCache(): void {
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

		// Generate cr_id
		const crId = `universe-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

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

		// Reload cache
		this.reloadCache();

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

		// Reload cache
		this.reloadCache();

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
				const value = String(fm.universe);
				references.set(value, (references.get(value) || 0) + 1);
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
			if (fm?.universe !== universeValue) continue;

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
