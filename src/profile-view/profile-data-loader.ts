/**
 * Profile Data Loader
 *
 * Coordinates service calls per entity type, returning typed ProfileEntityData.
 * Maintains a single-entity cache keyed by crId.
 */

import type { TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import type {
	ProfileEntityType,
	ProfileEntityData,
	PersonProfileData,
	PlaceProfileData,
	EventProfileData,
	SourceProfileData,
	OrganizationProfileData,
	ReferencedFactGroup
} from './profile-types';
import type { MediaItem } from '../core/media-service';
import { RelationshipService } from '../relationships';
import { MembershipService } from '../organizations/services/membership-service';
import { OrganizationService } from '../organizations/services/organization-service';
import { EvidenceService } from '../sources/services/evidence-service';
import { ProofSummaryService } from '../sources/services/proof-summary-service';
import { SOURCED_PROPERTY_NAMES, SOURCED_PROPERTY_TO_FACT_KEY } from '../sources/types/source-types';
import type { SourcedPropertyName, SourceNote } from '../sources/types/source-types';
import { getLogger } from '../core/logging';

const logger = getLogger('ProfileDataLoader');

export class ProfileDataLoader {
	private plugin: CanvasRootsPlugin;
	private lastLoadedCrId: string | null = null;
	private lastLoadedData: ProfileEntityData | null = null;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
	}

	/** Invalidate cache for a specific entity */
	invalidate(crId: string): void {
		if (this.lastLoadedCrId === crId) {
			this.lastLoadedCrId = null;
			this.lastLoadedData = null;
		}
	}

	/** Load entity data. Returns cached result if same crId. */
	async loadEntity(file: TFile, entityType: ProfileEntityType): Promise<ProfileEntityData | null> {
		const app = this.plugin.app;
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm) return null;

		const crId = String(fm.cr_id || '');
		if (!crId) return null;

		// Cache hit
		if (crId === this.lastLoadedCrId && this.lastLoadedData) {
			return this.lastLoadedData;
		}

		let data: ProfileEntityData | null = null;

		try {
			switch (entityType) {
				case 'person':
					data = this.loadPerson(file, fm, crId);
					break;
				case 'place':
					data = this.loadPlace(file, fm, crId);
					break;
				case 'event':
					data = this.loadEvent(file, fm, crId);
					break;
				case 'source':
					data = this.loadSource(file, fm, crId);
					break;
				case 'organization':
					data = this.loadOrganization(file, fm, crId);
					break;
			}
		} catch (err) {
			logger.error('loadEntity', `Failed to load ${entityType} ${crId}`, err);
			return null;
		}

		if (data) {
			this.lastLoadedCrId = crId;
			this.lastLoadedData = data;
		}

		return data;
	}

	// ── Person ──────────────────────────────────────────────

	private loadPerson(
		file: TFile,
		fm: Record<string, unknown>,
		crId: string
	): PersonProfileData | null {
		const app = this.plugin.app;
		const settings = this.plugin.settings;
		const name = (fm.name as string) || file.basename;

		// PersonNode from FamilyGraphService
		const graphService = this.plugin.createFamilyGraphService();
		graphService.ensureCacheLoaded();
		const node = graphService.getPersonByCrId(crId);
		if (!node) {
			logger.warn('loadPerson', `PersonNode not found for ${crId}`);
			return null;
		}

		// Events
		const eventService = this.plugin.getEventService();
		const events = eventService?.getEventsForPerson(`[[${file.basename}]]`) ?? [];

		// Relationships
		const relService = new RelationshipService(this.plugin);
		const relationships = relService.getRelationshipsForPerson(crId);
		const inverseRelationships = relService.getInverseRelationships(crId);

		// Memberships
		const orgService = new OrganizationService(this.plugin);
		const membershipService = new MembershipService(this.plugin, orgService);
		const memberships = membershipService.getPersonMemberships(crId);

		// Research coverage
		const evidenceService = new EvidenceService(app, settings);
		const researchCoverage = evidenceService.getFactCoverage(crId);

		// Proof summaries
		const proofService = new ProofSummaryService(app, settings);
		proofService.setPersonIndex(this.plugin.personIndex);
		const proofSummaries = proofService.getProofsForPerson(crId);

		// Media (with crop data from frontmatter #354)
		const media = this.resolveMedia(node.media, fm as Record<string, unknown>);

		// Needs research
		const needsResearch = this.parseStringArray(fm.needs_research);

		// Sources (from frontmatter)
		const sources = this.parseStringArray(fm.sources);

		return {
			entityType: 'person',
			crId,
			name,
			file,
			node,
			events,
			relationships,
			inverseRelationships,
			memberships,
			media,
			researchCoverage,
			proofSummaries,
			needsResearch,
			sources
		};
	}

	// ── Place ───────────────────────────────────────────────

	private loadPlace(
		file: TFile,
		fm: Record<string, unknown>,
		crId: string
	): PlaceProfileData | null {
		const name = (fm.name as string) || file.basename;

		// PlaceNode from PlaceGraphService
		const placeGraph = this.plugin.createPlaceGraphService();
		placeGraph.reloadCache();
		const node = placeGraph.getPlaceByCrId(crId);
		if (!node) {
			logger.warn('loadPlace', `PlaceNode not found for ${crId}`);
			return null;
		}

		// Events at location
		const eventService = this.plugin.getEventService();
		const events = eventService?.getEventsAtPlace(`[[${file.basename}]]`) ?? [];

		// Media
		const media = this.resolveMedia(node.media);

		// Research / sources
		const needsResearch = this.parseStringArray(fm.needs_research);
		const sources = this.parseStringArray(fm.sources);

		return {
			entityType: 'place',
			crId,
			name,
			file,
			node,
			events,
			media,
			needsResearch,
			sources
		};
	}

	// ── Event ───────────────────────────────────────────────

	private loadEvent(
		file: TFile,
		fm: Record<string, unknown>,
		crId: string
	): EventProfileData | null {
		const name = (fm.name as string) || (fm.title as string) || file.basename;

		// Find event by crId
		const eventService = this.plugin.getEventService();
		const allEvents = eventService?.getAllEvents() ?? [];
		const event = allEvents.find(e => e.crId === crId);
		if (!event) {
			logger.warn('loadEvent', `EventNote not found for ${crId}`);
			return null;
		}

		// Media
		const mediaRefs = event.media || [];
		const media = this.resolveMedia(mediaRefs);

		// Research
		const needsResearch = this.parseStringArray(fm.needs_research);

		return {
			entityType: 'event',
			crId,
			name,
			file,
			event,
			media,
			needsResearch
		};
	}

	// ── Source ───────────────────────────────────────────────

	private loadSource(
		file: TFile,
		fm: Record<string, unknown>,
		crId: string
	): SourceProfileData | null {
		const app = this.plugin.app;
		const settings = this.plugin.settings;
		const name = (fm.name as string) || (fm.title as string) || file.basename;

		// Source note
		const sourceService = this.plugin.getSourceService();
		const source = sourceService.getSourceById(crId);
		if (!source) {
			logger.warn('loadSource', `SourceNote not found for ${crId}`);
			return null;
		}

		// Referenced facts (adapted from ExtractionsProcessor)
		const referencedFacts = this.findReferencedFacts(file.basename);

		// Media
		const media = this.resolveMedia(source.media);

		// Source hierarchy (#338)
		const allSources = sourceService.getAllSources();

		// Parent source
		let parentSource: SourceNote | undefined;
		if (source.sourceParentId) {
			parentSource = allSources.find(s => s.crId === source.sourceParentId);
		}

		// Child sources
		const childSources = allSources.filter(s => s.sourceParentId === crId);

		// Sibling sources (same parent, excluding self)
		let siblingSources: SourceNote[] = [];
		if (source.sourceParentId) {
			siblingSources = allSources.filter(s =>
				s.sourceParentId === source.sourceParentId && s.crId !== crId
			);
		}

		return {
			entityType: 'source',
			crId,
			name,
			file,
			source,
			referencedFacts,
			media,
			parentSource,
			childSources,
			siblingSources
		};
	}

	// ── Organization ────────────────────────────────────────

	private loadOrganization(
		file: TFile,
		fm: Record<string, unknown>,
		crId: string
	): OrganizationProfileData | null {
		const name = (fm.name as string) || file.basename;

		// Organization info
		const orgService = new OrganizationService(this.plugin);
		orgService.ensureCacheLoaded();
		const org = orgService.getOrganization(crId);
		if (!org) {
			logger.warn('loadOrganization', `OrganizationInfo not found for ${crId}`);
			return null;
		}

		// Members
		const membershipService = new MembershipService(this.plugin, orgService);
		const members = membershipService.getOrganizationMembers(crId);

		// Events (placeholder — proper org event scanning deferred)
		const eventService = this.plugin.getEventService();
		const events = (eventService?.getAllEvents() ?? []).filter(e => {
			// Simple filter: events that mention the org name in participants
			const orgBasename = file.basename;
			if (e.person && e.person.includes(orgBasename)) return true;
			if (e.persons) {
				return e.persons.some(p => p.includes(orgBasename));
			}
			return false;
		});

		// Media
		const media = this.resolveMedia(org.media);

		// Sources
		const sources = this.parseStringArray(fm.sources);

		return {
			entityType: 'organization',
			crId,
			name,
			file,
			org,
			members,
			events,
			media,
			sources
		};
	}

	// ── Referenced facts (for Source profile) ────────────────

	/**
	 * Find entities that reference a source via sourced_* properties.
	 * Adapted from ExtractionsProcessor.findPersonsReferencingSource().
	 */
	private findReferencedFacts(sourceBasename: string): ReferencedFactGroup[] {
		const app = this.plugin.app;
		const groups: ReferencedFactGroup[] = [];

		for (const file of app.vault.getFiles()) {
			if (file.extension !== 'md') continue;

			const cache = app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			// Only check person notes (primary use case for sourced_*)
			const crType = fm.cr_type || fm.type;
			if (crType !== 'person' && !this.looksLikePersonNote(fm)) continue;

			const facts: { factKey: string; factValue: string }[] = [];

			// Check sourced_* properties
			for (const propName of SOURCED_PROPERTY_NAMES) {
				const propValue = fm[propName];
				if (!propValue) continue;

				const links = Array.isArray(propValue) ? propValue : [propValue];
				for (const link of links) {
					if (typeof link === 'string' && this.matchesSource(link, sourceBasename)) {
						const factKey = SOURCED_PROPERTY_TO_FACT_KEY[propName as SourcedPropertyName];
						const factValue = fm[factKey] !== undefined ? String(fm[factKey]) : '';
						facts.push({ factKey, factValue });
						break;
					}
				}
			}

			// Check general sources array
			if (facts.length === 0) {
				const sourcesArr = fm.sources;
				if (sourcesArr) {
					const links = Array.isArray(sourcesArr) ? sourcesArr : [sourcesArr];
					for (const link of links) {
						if (typeof link === 'string' && this.matchesSource(link, sourceBasename)) {
							facts.push({ factKey: 'general', factValue: 'Referenced in sources' });
							break;
						}
					}
				}
			}

			if (facts.length > 0) {
				const entityName = (fm.name as string) || file.basename;
				const entityCrId = (fm.cr_id as string) || '';
				groups.push({
					entityName,
					entityFilePath: file.path,
					entityCrId,
					facts
				});
			}
		}

		return groups;
	}

	// ── Helpers ──────────────────────────────────────────────

	private matchesSource(link: string, sourceBasename: string): boolean {
		const stripped = link.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
		return stripped === sourceBasename || stripped.endsWith('/' + sourceBasename);
	}

	private looksLikePersonNote(fm: Record<string, unknown>): boolean {
		// Heuristic: has typical person properties
		return 'born' in fm || 'died' in fm || 'father' in fm || 'mother' in fm;
	}

	private resolveMedia(mediaRefs: string[] | undefined, frontmatter?: Record<string, unknown>): MediaItem[] {
		if (!mediaRefs || mediaRefs.length === 0) return [];

		const mediaService = this.plugin.getMediaService();
		if (!mediaService) return [];

		// Parse crop data if frontmatter provided (#354)
		const cropMap = new Map<string, import('../core/media-service').MediaCrop>();
		if (frontmatter && Array.isArray(frontmatter.media_crop)) {
			for (const entry of frontmatter.media_crop) {
				if (typeof entry === 'object' && entry) {
					const obj = entry as Record<string, unknown>;
					const image = obj.image as string;
					if (image && typeof obj.x === 'number' && typeof obj.y === 'number' &&
						typeof obj.w === 'number' && typeof obj.h === 'number') {
						cropMap.set(image, { x: obj.x, y: obj.y, w: obj.w, h: obj.h });
					}
				}
			}
		}

		const items: MediaItem[] = [];

		for (const ref of mediaRefs) {
			const name = ref.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
			const file = this.plugin.app.metadataCache.getFirstLinkpathDest(name, '');
			if (file) {
				const ext = '.' + file.extension.toLowerCase();
				const type = mediaService.getMediaType(ext);
				const crop = cropMap.get(file.name) || cropMap.get(file.basename + '.' + file.extension);
				items.push({
					mediaRef: ref,
					file,
					type,
					displayName: file.basename,
					extension: ext,
					crop
				});
			}
		}

		return items;
	}

	private parseStringArray(value: unknown): string[] {
		if (Array.isArray(value)) {
			return value.filter((v): v is string => typeof v === 'string');
		}
		if (typeof value === 'string' && value) {
			return [value];
		}
		return [];
	}
}
