/**
 * Place data model for Charted Roots geographic features
 * Supports real-world locations, historical places, and fictional geography
 */

/**
 * Place categories for classification
 * - real: Verified real-world location (default)
 * - historical: Real place that no longer exists or changed significantly
 * - disputed: Location debated by historians/archaeologists
 * - legendary: May have historical basis but heavily fictionalized
 * - mythological: Place from mythology/religion, not claimed to be real
 * - fictional: Invented for a story/world
 */
export type PlaceCategory = 'real' | 'historical' | 'disputed' | 'legendary' | 'mythological' | 'fictional';

/**
 * Known place types for hierarchical organization
 * Custom types are also supported via the "Other..." option
 */
export type KnownPlaceType =
	| 'planet'
	| 'continent'
	| 'country'
	| 'state'
	| 'province'
	| 'region'
	| 'county'
	| 'township'
	| 'city'
	| 'town'
	| 'village'
	| 'district'
	| 'parish'
	| 'castle'
	| 'estate'
	| 'cemetery'
	| 'church';

/**
 * Place type: can be any string value
 * Known types (KnownPlaceType) have predefined hierarchy levels
 * Custom types are treated as leaf-level in hierarchy (level 99)
 * Use isKnownPlaceType() to check if a type is a known type
 */
export type PlaceType = string;

/**
 * Real-world geographic coordinates
 */
export interface GeoCoordinates {
	lat: number;
	long: number;
}

/**
 * Custom coordinates for fictional maps or custom map images
 */
export interface CustomCoordinates {
	x: number;
	y: number;
	/** Path to the custom map image (relative to vault) */
	map?: string;
}

/**
 * Historical name entry for places that changed names over time
 */
export interface HistoricalName {
	name: string;
	/** Time period (e.g., "Roman", "1066-1485", "Medieval") */
	period?: string;
}

/**
 * Read `historical_names` from frontmatter into HistoricalName entries.
 *
 * The current shape is flat parallel arrays — a `historical_names` string list
 * with an index-aligned, optional `historical_name_periods` string list — so the
 * property isn't a nested object (Obsidian doesn't fully support those). For
 * backward compatibility this also reads the legacy nested form (`[{ name,
 * period }]`) and a bare-string array, so notes written before the flatten still
 * load. Malformed entries are skipped.
 */
export function parseHistoricalNames(fm: Record<string, unknown>): HistoricalName[] {
	const raw = fm.historical_names;
	if (!Array.isArray(raw)) return [];

	const periods = Array.isArray(fm.historical_name_periods) ? fm.historical_name_periods : [];
	const periodAt = (i: number): string | undefined => {
		const p = periods[i];
		return typeof p === 'string' && p.trim() ? p.trim() : undefined;
	};

	const result: HistoricalName[] = [];
	for (let i = 0; i < raw.length; i++) {
		const entry = raw[i];
		if (typeof entry === 'string') {
			const name = entry.trim();
			if (name) result.push(periodAt(i) ? { name, period: periodAt(i) } : { name });
		} else if (entry && typeof entry === 'object') {
			// Legacy nested form: { name, period? }
			const obj = entry as Record<string, unknown>;
			const name = typeof obj.name === 'string' ? obj.name.trim() : '';
			if (!name) continue;
			const period = typeof obj.period === 'string' && obj.period.trim() ? obj.period.trim() : undefined;
			result.push(period ? { name, period } : { name });
		}
	}
	return result;
}

/**
 * Serialize HistoricalName entries to the flat parallel-array frontmatter shape.
 * Returns `null` when the list is empty (so callers can clear the properties).
 * `historical_name_periods` is only included when at least one entry has a
 * period, keeping the common period-less case a plain string list.
 */
export function toFlatHistoricalNames(
	names: HistoricalName[]
): { historical_names: string[]; historical_name_periods?: string[] } | null {
	if (names.length === 0) return null;
	const historical_names = names.map(h => h.name);
	if (names.some(h => h.period)) {
		return { historical_names, historical_name_periods: names.map(h => h.period ?? '') };
	}
	return { historical_names };
}

/**
 * Fold the names of discarded duplicate places into a canonical place's
 * historical names, so a merge preserves the older/variant forms instead of
 * trashing them with the duplicate note. The canonical (modern) name stays
 * primary; each discarded place contributes its own primary name plus any
 * historical names it already carried. Entries are deduped case-insensitively
 * and any form equal to the canonical's current name is skipped. (#635)
 *
 * Returns the full merged list (existing canonical entries first, in order).
 * Because entries are only ever added, callers can detect "nothing new" by
 * comparing the result length to the canonical's existing entry count.
 */
export function computeMergedHistoricalNames(
	canonical: PlaceNode,
	duplicates: PlaceNode[]
): HistoricalName[] {
	const result: HistoricalName[] = [...(canonical.historicalNames ?? [])];
	const canonicalKey = canonical.name.trim().toLowerCase();
	const seen = new Set<string>(result.map(h => h.name.trim().toLowerCase()));

	const add = (name: string, period?: string): void => {
		const trimmedName = name.trim();
		const key = trimmedName.toLowerCase();
		if (!key || key === canonicalKey || seen.has(key)) return;
		seen.add(key);
		const trimmedPeriod = period?.trim();
		result.push(trimmedPeriod ? { name: trimmedName, period: trimmedPeriod } : { name: trimmedName });
	};

	for (const duplicate of duplicates) {
		add(duplicate.name);
		for (const historical of duplicate.historicalNames ?? []) {
			add(historical.name, historical.period);
		}
	}

	return result;
}

/**
 * Place data as stored in frontmatter
 */
export interface Place {
	/** Must be "place" to identify as a place note */
	type: 'place';

	/** Unique identifier (UUID) - REQUIRED */
	cr_id: string;

	/** Primary display name */
	name: string;

	/** Path to the place's note file */
	filePath: string;

	/** Alternative names for the place */
	aliases?: string[];

	/** Classification of the place */
	place_category?: PlaceCategory;

	/** Type of place in hierarchy */
	place_type?: PlaceType;

	/** For fictional/mythological/legendary places - the universe/world it belongs to */
	universe?: string;

	/** Wikilink to parent place */
	parent_place?: string;

	/** Parent place's cr_id for reliable resolution */
	parent_place_id?: string;

	/** Real-world coordinates (for real, historical, disputed places) */
	coordinates?: GeoCoordinates;

	/** Custom coordinates for fictional places or custom maps */
	custom_coordinates?: CustomCoordinates;

	/** Historical names the place has had (flat list; see historical_name_periods) */
	historical_names?: string[];

	/** Periods for each historical name, index-aligned with historical_names */
	historical_name_periods?: string[];

	/** User-defined collection/grouping name (shared with person notes) */
	collection?: string;
}

/**
 * Normalized place data for graph processing
 */
export interface PlaceNode {
	id: string;
	name: string;
	filePath: string;
	category: PlaceCategory;
	placeType?: PlaceType;
	universe?: string;
	parentId?: string;
	childIds: string[];
	aliases: string[];
	coordinates?: GeoCoordinates;
	customCoordinates?: CustomCoordinates;
	collection?: string;
	/** Historical names the place has had (preserved across merges) */
	historicalNames?: HistoricalName[];
	/** Media files linked to this place (wikilinks) */
	media?: string[];
	/** Map IDs this place appears on (for per-map filtering) */
	maps?: string[];
}

/**
 * Place reference from a person note
 * Tracks which people are associated with which places
 */
export interface PlaceReference {
	/** The place identifier (cr_id if linked, or raw string if unlinked) */
	placeId?: string;

	/** The raw string value from frontmatter */
	rawValue: string;

	/** Whether this references an existing place note */
	isLinked: boolean;

	/** Type of reference (birth, death, marriage, residence, etc.) */
	referenceType: PlaceReferenceType;

	/** The person's cr_id who has this place reference */
	personId: string;
}

/**
 * Types of place references from person notes
 */
export type PlaceReferenceType =
	| 'birth'
	| 'death'
	| 'marriage'
	| 'residence'
	| 'burial'
	| 'other';

/**
 * Statistics about places in the vault
 */
export interface PlaceStatistics {
	/** Total number of place notes */
	totalPlaces: number;

	/** Places with coordinates defined */
	withCoordinates: number;

	/** Places without a parent (orphans or top-level) */
	orphanPlaces: number;

	/** Maximum depth of place hierarchy */
	maxHierarchyDepth: number;

	/** Counts by category */
	byCategory: Record<PlaceCategory, number>;

	/** Count of places by type (known types + any custom types found) */
	byType: Record<string, number>;

	/** Places grouped by universe (for fictional places) */
	byUniverse: Record<string, number>;

	/** Places grouped by user-defined collection */
	byCollection: Record<string, number>;

	/** Most common places referenced by people */
	topBirthPlaces: Array<{ place: string; count: number }>;
	topDeathPlaces: Array<{ place: string; count: number }>;

	/** Data quality issues */
	issues: PlaceIssue[];
}

/**
 * Place-related data quality issues
 */
export interface PlaceIssue {
	type: PlaceIssueType;
	message: string;
	placeId?: string;
	placeName?: string;
	filePath?: string;
}

export type PlaceIssueType =
	| 'orphan_place'           // Place has no parent (and isn't top-level)
	| 'missing_place_note'     // Person references place that doesn't exist
	| 'circular_hierarchy'     // Circular parent reference detected
	| 'duplicate_name'         // Multiple places with same name, no disambiguation
	| 'fictional_with_coords'  // Fictional place has real-world coordinates
	| 'real_missing_coords'    // Real place missing coordinates
	| 'invalid_category'       // Unrecognized place category
	| 'wrong_category_folder'; // Place not in category-appropriate folder (#163)

/**
 * Default place category when not specified
 */
export const DEFAULT_PLACE_CATEGORY: PlaceCategory = 'real';

/**
 * Categories that support universe grouping
 */
export const UNIVERSE_CATEGORIES: PlaceCategory[] = ['fictional', 'mythological', 'legendary'];

/**
 * Categories that can have real-world coordinates
 */
export const REAL_COORD_CATEGORIES: PlaceCategory[] = ['real', 'historical', 'disputed'];

/**
 * Check if a place category supports universe grouping
 */
export function supportsUniverse(category: PlaceCategory): boolean {
	return UNIVERSE_CATEGORIES.includes(category);
}

/**
 * Check if a place category can have real-world coordinates
 */
export function supportsRealCoordinates(category: PlaceCategory): boolean {
	return REAL_COORD_CATEGORIES.includes(category);
}

/**
 * List of known place types (for dropdown/validation)
 */
export const KNOWN_PLACE_TYPES: KnownPlaceType[] = [
	'planet',
	'continent',
	'country',
	'state',
	'province',
	'region',
	'county',
	'township',
	'city',
	'town',
	'village',
	'district',
	'parish',
	'castle',
	'estate',
	'cemetery',
	'church'
];

/**
 * Check if a place type is a known type (vs custom)
 */
export function isKnownPlaceType(type: string): type is KnownPlaceType {
	return KNOWN_PLACE_TYPES.includes(type as KnownPlaceType);
}
