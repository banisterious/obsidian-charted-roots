/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Place Lookup Service
 *
 * Provides unified place lookup from multiple external sources:
 * - Phase 1: Wikidata, GeoNames, Nominatim
 * - Phase 3: FamilySearch Places, GOV (deferred)
 *
 * @see docs/planning/unified-place-lookup.md
 */

import { Notice, requestUrl } from 'obsidian';
import { getLogger } from '../../core/logging';

const logger = getLogger('PlaceLookupService');

/**
 * Supported place lookup sources
 * Phase 1: wikidata, geonames, nominatim
 * Phase 3: familysearch, gov (require additional implementation)
 */
export type PlaceLookupSource = 'wikidata' | 'geonames' | 'nominatim' | 'familysearch' | 'gov';

/**
 * Result from a place lookup query
 */
export interface PlaceLookupResult {
	/** Source that returned this result */
	source: PlaceLookupSource;
	/** Standardized place name */
	standardizedName: string;
	/** Geographic coordinates */
	coordinates?: { lat: number; lng: number };
	/** Place type (city, county, state, country, etc.) */
	placeType?: string;
	/** Immediate parent place name */
	parentPlace?: string;
	/** Full administrative hierarchy chain */
	hierarchy?: string[];
	/** Alternative names for this place */
	alternateNames?: string[];
	/** Source-specific external ID */
	externalId?: string;
	/** Match quality score (0-1) */
	confidence: number;
	/** Source-specific additional data */
	metadata?: Record<string, unknown>;
}

/**
 * Options for place lookup
 */
export interface PlaceLookupOptions {
	/** Which sources to query (defaults to all Phase 1 sources) */
	sources?: PlaceLookupSource[];
	/** Historical date for time-aware lookups (Phase 3) */
	historicalDate?: string;
	/** ISO 3166-1 alpha-2 country code for GeoNames filtering */
	countryCode?: string;
	/** Maximum results per source */
	maxResults?: number;
}

/**
 * User-Agent header for API requests
 */
const USER_AGENT = 'Charted Roots Obsidian plugin (https://github.com/banisterious/obsidian-charted-roots)';

/**
 * Rate limiting configuration per source (milliseconds)
 */
const RATE_LIMITS: Record<PlaceLookupSource, number> = {
	nominatim: 1100,  // 1 req/sec strict
	geonames: 1100,   // 1 req/sec recommended
	wikidata: 500,    // More permissive
	familysearch: 1000,
	gov: 1000
};

/**
 * Get the user's preferred language from Obsidian's locale setting.
 * Falls back to 'en' if not available.
 */
function getUserLanguage(): string {
	try {
		// Obsidian exposes the user's language setting via moment.locale()
		const locale = window.moment?.locale?.();
		if (locale && typeof locale === 'string') {
			// Extract primary language code (e.g., 'nl' from 'nl-NL')
			return locale.split('-')[0].toLowerCase();
		}
	} catch {
		// Fall back to English if moment is not available
	}
	return 'en';
}

/**
 * Get a label from a Wikidata entity, trying user's language first, then English.
 */
function getWikidataLabel(
	labels: Record<string, { value: string }> | undefined,
	fallback: string
): string {
	if (!labels) return fallback;
	const userLang = getUserLanguage();
	return labels[userLang]?.value || labels.en?.value || fallback;
}

/**
 * Get aliases from a Wikidata entity in user's language, falling back to English.
 */
function getWikidataAliases(aliases: Record<string, Array<{ value: string }>> | undefined): string[] {
	if (!aliases) return [];
	const userLang = getUserLanguage();
	const userAliases = aliases[userLang]?.map(a => a.value) || [];
	const enAliases = aliases.en?.map(a => a.value) || [];
	// Combine user language aliases with English, deduplicating
	return [...new Set([...userAliases, ...enAliases])];
}

/**
 * GeoNames feature codes to Charted Roots place types mapping
 */
const GEONAMES_TYPE_MAP: Record<string, string> = {
	'PCLI': 'country',
	'ADM1': 'state',
	'ADM2': 'county',
	'ADM3': 'district',
	'ADM4': 'district',
	'PPL': 'city',
	'PPLA': 'city',
	'PPLA2': 'city',
	'PPLA3': 'city',
	'PPLA4': 'city',
	'PPLC': 'city',
	'PPLL': 'village',
	'PPLX': 'neighborhood',
	'RGN': 'region',
	'ISL': 'island',
	'MT': 'mountain',
	'MTS': 'mountain',
	'PK': 'mountain',
	'LK': 'lake',
	'LKNI': 'lake',
	'STM': 'river',
	'CHN': 'channel',
	'SEA': 'sea',
	'OCN': 'sea',
	'CSTL': 'castle',
	'CH': 'church',
	'CMTY': 'cemetery',
	'HSP': 'hospital',
	'SCH': 'school',
	'UNIV': 'school'
};

/**
 * Wikidata Q-IDs (instance of P31) to Charted Roots place types mapping
 */
const WIKIDATA_TYPE_MAP: Record<string, string> = {
	'Q6256': 'country',
	'Q7275': 'state',
	'Q28575': 'state',    // province
	'Q180673': 'county',
	'Q515': 'city',
	'Q1549591': 'city',   // big city
	'Q532': 'village',
	'Q5084': 'village',   // hamlet
	'Q123705': 'neighborhood',
	'Q82794': 'region',
	'Q23442': 'island',
	'Q8502': 'mountain',
	'Q23397': 'lake',
	'Q4022': 'river',
	'Q39614': 'cemetery',
	'Q16970': 'church'
};

/**
 * Service for looking up places from multiple external sources
 */
export class PlaceLookupService {
	private geonamesUsername?: string;
	private lastRequestTime: Map<PlaceLookupSource, number> = new Map();

	constructor(geonamesUsername?: string) {
		this.geonamesUsername = geonamesUsername;
	}

	/**
	 * Update GeoNames username (e.g., when settings change)
	 */
	setGeonamesUsername(username: string | undefined): void {
		this.geonamesUsername = username;
	}

	/**
	 * Look up a place across multiple sources
	 */
	async lookup(
		placeName: string,
		options: PlaceLookupOptions = {}
	): Promise<PlaceLookupResult[]> {
		if (!placeName?.trim()) {
			return [];
		}

		// Phase 1 default sources (no complex auth required)
		const sources = options.sources || ['wikidata', 'geonames', 'nominatim'];
		const results: PlaceLookupResult[] = [];

		// Query all sources in parallel
		const promises = sources.map(source => {
			switch (source) {
				case 'wikidata':
					return this.lookupWikidata(placeName, options);
				case 'geonames':
					return this.lookupGeoNames(placeName, options);
				case 'nominatim':
					return this.lookupNominatim(placeName, options);
				case 'familysearch':
					return this.lookupFamilySearch(placeName, options);
				case 'gov':
					return this.lookupGOV(placeName, options);
				default:
					return Promise.resolve([]);
			}
		});

		const sourceResults = await Promise.allSettled(promises);

		for (const result of sourceResults) {
			if (result.status === 'fulfilled') {
				results.push(...result.value);
			} else {
				logger.warn('lookup-failed', `Source lookup failed: ${result.reason}`);
			}
		}

		// Sort by confidence score (highest first)
		return results.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Look up place in Wikidata
	 */
	private async lookupWikidata(
		placeName: string,
		options: PlaceLookupOptions
	): Promise<PlaceLookupResult[]> {
		await this.enforceRateLimit('wikidata');

		try {
			// Check if input is a Q-number
			const qMatch = placeName.match(/^Q\d+$/i);
			let entityId: string | null = null;

			if (qMatch) {
				entityId = qMatch[0].toUpperCase();
			} else {
				// Search for place by name (use user's language for better results)
				const searchLang = getUserLanguage();
				const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(placeName)}&language=${searchLang}&format=json&origin=*&type=item&limit=${options.maxResults || 5}`;
				const searchResponse = await requestUrl({
					url: searchUrl,
					headers: { 'User-Agent': USER_AGENT }
				});
				const searchData = searchResponse.json;

				if (!searchData.search || searchData.search.length === 0) {
					return [];
				}

				// Process multiple search results
				const results: PlaceLookupResult[] = [];
				const maxResults = options.maxResults || 5;

				for (let i = 0; i < Math.min(searchData.search.length, maxResults); i++) {
					const searchResult = searchData.search[i];
					const result = await this.fetchWikidataEntity(searchResult.id, i);
					if (result) {
						results.push(result);
					}
				}

				return results;
			}

			// Single entity lookup
			const result = await this.fetchWikidataEntity(entityId, 0);
			return result ? [result] : [];

		} catch (error) {
			logger.warn('wikidata-lookup-failed', `Wikidata lookup failed: ${error}`);
			return [];
		}
	}

	/**
	 * Fetch a single Wikidata entity and convert to PlaceLookupResult
	 */
	private async fetchWikidataEntity(entityId: string, index: number): Promise<PlaceLookupResult | null> {
		try {
			const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`;
			const entityResponse = await requestUrl({
				url: entityUrl,
				headers: { 'User-Agent': USER_AGENT }
			});
			const entityData = entityResponse.json;

			const entity = entityData.entities?.[entityId];
			if (!entity) return null;

			// Extract coordinates (P625)
			const coordClaim = entity.claims?.P625?.[0];
			const coordValue = coordClaim?.mainsnak?.datavalue?.value;
			const coordinates = coordValue
				? { lat: coordValue.latitude, lng: coordValue.longitude }
				: undefined;

			// Extract place type from P31 (instance of)
			let placeType: string | undefined;
			const instanceOfClaim = entity.claims?.P31?.[0];
			if (instanceOfClaim?.mainsnak?.datavalue?.value?.id) {
				const typeId = instanceOfClaim.mainsnak.datavalue.value.id;
				placeType = WIKIDATA_TYPE_MAP[typeId] || 'other';
			}

			// Extract parent administrative territory (P131)
			let parentPlace: string | undefined;
			const adminClaim = entity.claims?.P131?.[0];
			if (adminClaim?.mainsnak?.datavalue?.value?.id) {
				const parentId = adminClaim.mainsnak.datavalue.value.id;
				// Fetch parent name (simplified)
				try {
					const parentUrl = `https://www.wikidata.org/wiki/Special:EntityData/${parentId}.json`;
					const parentResponse = await requestUrl({
						url: parentUrl,
						headers: { 'User-Agent': USER_AGENT }
					});
					const parentData = parentResponse.json;
					parentPlace = getWikidataLabel(parentData.entities?.[parentId]?.labels, parentId);
				} catch {
					// Parent fetch failed, continue without
				}
			}

			// Extract alternate names (user's language + English)
			const alternateNames = getWikidataAliases(entity.aliases);

			// Extract Wikipedia URL (prefer user's language wiki, fall back to English)
			const userLang = getUserLanguage();
			const userWikiKey = `${userLang}wiki`;
			const wikipediaUrl = entity.sitelinks?.[userWikiKey]?.url || entity.sitelinks?.enwiki?.url;

			return {
				source: 'wikidata',
				standardizedName: getWikidataLabel(entity.labels, entityId),
				coordinates,
				placeType,
				parentPlace,
				hierarchy: parentPlace ? [parentPlace] : [],
				alternateNames,
				externalId: entityId,
				confidence: index === 0 ? 0.85 : 0.7 - (index * 0.1),
				metadata: { wikipediaUrl }
			};

		} catch (error) {
			logger.debug('wikidata-entity-failed', `Failed to fetch Wikidata entity ${entityId}: ${error}`);
			return null;
		}
	}

	/**
	 * Look up place in GeoNames
	 */
	private async lookupGeoNames(
		placeName: string,
		options: PlaceLookupOptions
	): Promise<PlaceLookupResult[]> {
		if (!this.geonamesUsername) {
			logger.debug('geonames-no-username', 'GeoNames username not configured');
			return [];
		}

		await this.enforceRateLimit('geonames');

		try {
			let url = `https://secure.geonames.org/searchJSON?q=${encodeURIComponent(placeName)}&username=${this.geonamesUsername}&maxRows=${options.maxResults || 5}`;

			if (options.countryCode) {
				url += `&country=${options.countryCode}`;
			}

			const response = await requestUrl({
				url,
				headers: { 'User-Agent': USER_AGENT }
			});
			const data = response.json;

			if (!data.geonames || data.geonames.length === 0) {
				return [];
			}

			const results: PlaceLookupResult[] = [];

			for (let i = 0; i < data.geonames.length; i++) {
				const place = data.geonames[i];

				// Build hierarchy
				const hierarchy: string[] = [];
				if (place.adminName4) hierarchy.push(place.adminName4);
				if (place.adminName3) hierarchy.push(place.adminName3);
				if (place.adminName2) hierarchy.push(place.adminName2);
				if (place.adminName1) hierarchy.push(place.adminName1);
				if (place.countryName) hierarchy.push(place.countryName);

				// Map place type
				const placeType = place.fcode ? (GEONAMES_TYPE_MAP[place.fcode] || 'other') : undefined;

				results.push({
					source: 'geonames',
					standardizedName: place.name,
					coordinates: {
						lat: parseFloat(place.lat),
						lng: parseFloat(place.lng)
					},
					placeType,
					parentPlace: place.adminName1 || place.countryName,
					hierarchy,
					alternateNames: place.alternateNames?.map((a: { name: string }) => a.name) || [],
					externalId: place.geonameId?.toString(),
					confidence: i === 0 ? 0.8 : 0.6 - (i * 0.1),
					metadata: {
						population: place.population,
						elevation: place.elevation,
						featureCode: place.fcode,
						featureClass: place.fcl
					}
				});
			}

			return results;

		} catch (error) {
			const errorMsg = String(error);
			logger.warn('geonames-lookup-failed', `GeoNames lookup failed: ${errorMsg}`);
			if (errorMsg.includes('401')) {
				new Notice('GeoNames lookup failed: invalid or inactive username. Check Settings > Places > GeoNames username.');
			}
			return [];
		}
	}

	/**
	 * Look up place using Nominatim (OpenStreetMap)
	 */
	private async lookupNominatim(
		placeName: string,
		options: PlaceLookupOptions
	): Promise<PlaceLookupResult[]> {
		await this.enforceRateLimit('nominatim');

		try {
			const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&addressdetails=1&limit=${options.maxResults || 5}`;

			const response = await requestUrl({
				url,
				headers: { 'User-Agent': USER_AGENT }
			});

			const data = response.json as Array<{
				lat: string;
				lon: string;
				display_name: string;
				type: string;
				place_id: number;
				address?: Record<string, string>;
			}>;

			if (!data || data.length === 0) {
				return [];
			}

			const results: PlaceLookupResult[] = [];

			for (let i = 0; i < data.length; i++) {
				const place = data[i];

				// Build hierarchy from address
				const hierarchy: string[] = [];
				const addr = place.address || {};
				if (addr.city || addr.town || addr.village) {
					hierarchy.push(addr.city || addr.town || addr.village || '');
				}
				if (addr.county) hierarchy.push(addr.county);
				if (addr.state) hierarchy.push(addr.state);
				if (addr.country) hierarchy.push(addr.country);

				results.push({
					source: 'nominatim',
					standardizedName: place.display_name,
					coordinates: {
						lat: parseFloat(place.lat),
						lng: parseFloat(place.lon)
					},
					placeType: place.type,
					parentPlace: addr.state || addr.country,
					hierarchy: hierarchy.filter(h => h),
					alternateNames: [],
					externalId: place.place_id?.toString(),
					confidence: i === 0 ? 0.75 : 0.55 - (i * 0.1)
				});
			}

			return results;

		} catch (error) {
			logger.warn('nominatim-lookup-failed', `Nominatim lookup failed: ${error}`);
			return [];
		}
	}

	/**
	 * Look up place in FamilySearch Places API
	 * NOTE: Phase 3 - Requires OAuth 2.0 authentication
	 */
	private async lookupFamilySearch(
		_placeName: string,
		_options: PlaceLookupOptions
	): Promise<PlaceLookupResult[]> {
		// TODO Phase 3: Implement OAuth 2.0 flow
		logger.debug('familysearch-not-implemented', 'FamilySearch lookup requires OAuth (Phase 3)');
		return [];
	}

	/**
	 * Look up place in GOV (Genealogisches Ortsverzeichnis)
	 * NOTE: Phase 3 - Requires API research
	 */
	private async lookupGOV(
		_placeName: string,
		_options: PlaceLookupOptions
	): Promise<PlaceLookupResult[]> {
		// TODO Phase 3: Research GOV API structure and implement
		logger.debug('gov-not-implemented', 'GOV lookup requires API research (Phase 3)');
		return [];
	}

	/**
	 * Enforce rate limiting for a source
	 */
	private async enforceRateLimit(source: PlaceLookupSource): Promise<void> {
		const now = Date.now();
		const lastTime = this.lastRequestTime.get(source) || 0;
		const delay = RATE_LIMITS[source] || 1000;
		const elapsed = now - lastTime;

		if (elapsed < delay) {
			const waitTime = delay - elapsed;
			logger.debug('rate-limit-wait', `Waiting ${waitTime}ms for ${source} rate limit`);
			await this.sleep(waitTime);
		}

		this.lastRequestTime.set(source, Date.now());
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => window.setTimeout(resolve, ms));
	}
}