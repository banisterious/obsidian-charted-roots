/**
 * GEDCOM Exporter for Charted Roots
 *
 * Exports person notes from Obsidian vault to GEDCOM 5.5.1 format.
 */

import { App, Notice } from 'obsidian';
import { FamilyGraphService, type PersonNode } from '../core/family-graph';
import { FolderFilterService } from '../core/folder-filter';
import { getLogger } from '../core/logging';
import { getErrorMessage } from '../core/error-utils';
import { PrivacyService, type PrivacySettings } from '../core/privacy-service';
import { PropertyAliasService } from '../core/property-alias-service';
import { ValueAliasService } from '../core/value-alias-service';
import { EventService } from '../events/services/event-service';
import type { EventNote } from '../events/types/event-types';
import { SourceService } from '../sources/services/source-service';
import type { SourceNote } from '../sources/types/source-types';
import { PlaceGraphService } from '../core/place-graph';
import type { PlaceNode } from '../models/place';
import type { CanvasRootsSettings } from '../settings';
import { RelationshipService } from '../relationships';
import { extractWikilinkPath } from '../utils/wikilink-resolver';
import type { CitationNote, CitationQuality } from '../sources/types/citation-types';

const logger = getLogger('GedcomExporter');

/**
 * GEDCOM export options
 */
export interface GedcomExportOptions {
	/** People folder to export from */
	peopleFolder: string;

	/** Collection filter - only export people in this collection */
	collectionFilter?: string;

	/** Branch filter - cr_id of person to filter around */
	branchRootCrId?: string;

	/** Branch direction - export ancestors or descendants of branchRootCrId */
	branchDirection?: 'ancestors' | 'descendants';

	/** Include spouses when exporting a branch (applies to descendants) */
	branchIncludeSpouses?: boolean;

	/** Include collection codes in GEDCOM output */
	includeCollectionCodes?: boolean;

	/** Include custom relationships as ASSO records */
	includeCustomRelationships?: boolean;

	/** Export filename (without .ged extension) */
	fileName?: string;

	/** Source application identifier for GEDCOM header */
	sourceApp?: string;

	/** Source version for GEDCOM header */
	sourceVersion?: string;

	/** Privacy settings for protecting living persons */
	privacySettings?: PrivacySettings;

	/** Citations folder for PAGE/QUAY export */
	citationsFolder?: string;
}

/**
 * GEDCOM export result
 */
export interface GedcomExportResult {
	success: boolean;
	individualsExported: number;
	familiesExported: number;
	errors: string[];
	gedcomContent?: string;
	fileName: string;
	/** Number of living persons excluded due to privacy settings */
	privacyExcluded?: number;
	/** Number of living persons with obfuscated data */
	privacyObfuscated?: number;
}

/**
 * Internal representation of a GEDCOM family record
 */
/** Event types that belong on FAM records, not INDI records */
const FAMILY_EVENT_TYPES = new Set([
	'marriage', 'divorce', 'annulment',
	'marriage_bann', 'marriage_contract', 'marriage_license',
	'marriage_settlement', 'divorce_filed'
]);

interface GedcomFamilyRecord {
	id: string;
	husbandId?: string;
	wifeId?: string;
	childIds: string[];
	marriageDate?: string;
	marriagePlace?: string;
	divorceDate?: string;
	divorcePlace?: string;
	/** Additional family events (MARB, MARC, MARL, MARS, DIVF) */
	familyEvents?: EventNote[];
	/** Pedigree type for child relationships: 'birth' (default), 'step', 'adop' */
	pediType?: 'birth' | 'step' | 'adop';
}

/**
 * FAMC reference with optional pedigree type
 */
interface FamcReference {
	familyId: string;
	pediType?: 'birth' | 'step' | 'adop';
}

/**
 * Export person notes to GEDCOM format
 */
export class GedcomExporter {
	private app: App;
	private graphService: FamilyGraphService;
	private eventService: EventService | null = null;
	private sourceService: SourceService | null = null;
	private placeGraphService: PlaceGraphService | null = null;
	private propertyAliasService: PropertyAliasService | null = null;
	private valueAliasService: ValueAliasService | null = null;
	private relationshipService: RelationshipService | null = null;

	constructor(app: App, folderFilter?: FolderFilterService) {
		this.app = app;
		this.graphService = new FamilyGraphService(app);
		if (folderFilter) {
			this.graphService.setFolderFilter(folderFilter);
		}
	}

	/**
	 * Set event service for loading event notes
	 */
	setEventService(settings: CanvasRootsSettings): void {
		this.eventService = new EventService(this.app, settings);
	}

	/**
	 * Set source service for loading source notes
	 */
	setSourceService(settings: CanvasRootsSettings): void {
		this.sourceService = new SourceService(this.app, settings);
	}

	/**
	 * Set place graph service for loading place notes
	 */
	setPlaceGraphService(settings: CanvasRootsSettings): void {
		this.placeGraphService = new PlaceGraphService(this.app);
		this.placeGraphService.setSettings(settings);
		if (settings.valueAliases) {
			this.placeGraphService.setValueAliases(settings.valueAliases);
		}
	}

	/**
	 * Set property alias service for resolving custom property names
	 */
	setPropertyAliasService(service: PropertyAliasService): void {
		this.propertyAliasService = service;
	}

	/**
	 * Set value alias service for resolving custom property values
	 */
	setValueAliasService(service: ValueAliasService): void {
		this.valueAliasService = service;
	}

	/**
	 * Set relationship service for loading custom relationships
	 */
	setRelationshipService(service: RelationshipService): void {
		this.relationshipService = service;
	}

	/**
	 * Export people to GEDCOM format
	 */
	exportToGedcom(options: GedcomExportOptions): GedcomExportResult {
		const result: GedcomExportResult = {
			success: false,
			individualsExported: 0,
			familiesExported: 0,
			errors: [],
			fileName: options.fileName || 'export',
			privacyExcluded: 0,
			privacyObfuscated: 0
		};

		// Create privacy service if settings provided
		const privacyService = options.privacySettings
			? new PrivacyService(options.privacySettings)
			: null;

		try {
			new Notice('Reading person notes...');

			// Load all people using the family graph service
			this.graphService['loadPersonCache']();
			const allPeople = Array.from(this.graphService['personCache'].values());

			if (allPeople.length === 0) {
				throw new Error(`No person notes found in folder: ${options.peopleFolder}`);
			}

			logger.info('export', `Loaded ${allPeople.length} people`);

			// Apply collection filter if specified
			let filteredPeople = allPeople;
			if (options.collectionFilter) {
				filteredPeople = allPeople.filter(person => {
					return person.collection === options.collectionFilter;
				});

				logger.info('export', `Filtered to ${filteredPeople.length} people in collection: ${options.collectionFilter}`);

				if (filteredPeople.length === 0) {
					throw new Error(`No people found in collection "${options.collectionFilter}". Found ${allPeople.length} total people, but none match this collection.`);
				}
			}

			// Apply branch filter if specified
			if (options.branchRootCrId && options.branchDirection) {
				const branchPeople = options.branchDirection === 'ancestors'
					? this.graphService.getAncestors(options.branchRootCrId, true)
					: this.graphService.getDescendants(options.branchRootCrId, true, options.branchIncludeSpouses);

				const branchCrIds = new Set(branchPeople.map(p => p.crId));
				filteredPeople = filteredPeople.filter(p => branchCrIds.has(p.crId));

				logger.info('export', `Filtered to ${filteredPeople.length} people in ${options.branchDirection} branch of ${options.branchRootCrId}`);

				if (filteredPeople.length === 0) {
					throw new Error(`No people found in ${options.branchDirection} branch. The branch root may not exist or has no ${options.branchDirection}.`);
				}
			}

			// Apply privacy filtering if enabled
			if (privacyService && options.privacySettings?.enablePrivacyProtection) {
				const beforeCount = filteredPeople.length;

				// Count obfuscated (living but not excluded)
				for (const person of filteredPeople) {
					const privacyResult = privacyService.applyPrivacy({
						name: person.name,
						birthDate: person.birthDate,
						deathDate: person.deathDate,
						cr_living: person.cr_living
					});
					if (privacyResult.isProtected && !privacyResult.excludeFromOutput) {
						result.privacyObfuscated = (result.privacyObfuscated || 0) + 1;
					}
				}

				// Filter out excluded people (privacy format = 'hidden')
				if (options.privacySettings.privacyDisplayFormat === 'hidden') {
					filteredPeople = filteredPeople.filter(person => {
						const privacyResult = privacyService.applyPrivacy({
							name: person.name,
							birthDate: person.birthDate,
							deathDate: person.deathDate,
							cr_living: person.cr_living
						});
						return !privacyResult.excludeFromOutput;
					});
					result.privacyExcluded = beforeCount - filteredPeople.length;
					logger.info('export', `Privacy: excluded ${result.privacyExcluded} living persons`);
				}

				if (result.privacyObfuscated && result.privacyObfuscated > 0) {
					logger.info('export', `Privacy: obfuscating ${result.privacyObfuscated} living persons`);
				}
			}

			// Load events if event service is available
			let allEvents: EventNote[] = [];
			if (this.eventService) {
				new Notice('Loading event notes...');
				allEvents = this.eventService.getAllEvents();
				logger.info('export', `Loaded ${allEvents.length} events`);
			}

			// Load sources if source service is available
			let allSources: SourceNote[] = [];
			if (this.sourceService) {
				new Notice('Loading source notes...');
				allSources = this.sourceService.getAllSources();
				logger.info('export', `Loaded ${allSources.length} sources`);
			}

			// Load places if place graph service is available
			let allPlaces: PlaceNode[] = [];
			if (this.placeGraphService) {
				new Notice('Loading place notes...');
				allPlaces = this.placeGraphService.getAllPlaces();
				logger.info('export', `Loaded ${allPlaces.length} places`);
			}

			// Build GEDCOM content
			new Notice('Generating GEDCOM data...');
			const gedcomContent = this.buildGedcomContent(
				filteredPeople,
				allEvents,
				allSources,
				allPlaces,
				options,
				privacyService
			);

			// Count families
			const families = this.extractFamilies(filteredPeople, new Map());

			result.gedcomContent = gedcomContent;
			result.individualsExported = filteredPeople.length;
			result.familiesExported = families.length;
			result.success = true;

			new Notice(`Export complete: ${result.individualsExported} people exported`);

		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			result.errors.push(`Export failed: ${errorMsg}`);
			logger.error('export', 'Export failed', error);
			new Notice(`Export failed: ${errorMsg}`);
		}

		return result;
	}

	/**
	 * Build complete GEDCOM content
	 */
	private buildGedcomContent(
		people: PersonNode[],
		events: EventNote[],
		sources: SourceNote[],
		places: PlaceNode[],
		options: GedcomExportOptions,
		privacyService: PrivacyService | null
	): string {
		const lines: string[] = [];

		// Build header
		lines.push(...this.buildHeader(options));

		// Build source records
		const sourceIdMap = new Map<string, string>();
		let sourceCounter = 1;

		for (const source of sources) {
			const sourceId = `S${sourceCounter}`;
			sourceIdMap.set(source.crId, sourceId);
			lines.push(...this.buildSourceRecord(source, sourceId));
			sourceCounter++;
		}

		// Load citation notes for PAGE/QUAY export
		// Key: "subjectCrId|fact|sourceCrId" → { page, quality }
		const citationLookup = this.loadCitationLookup(options);

		// Build individual ID map first
		// Prefer original GEDCOM xref if available (for round-trip support #175)
		const crIdToGedcomId = new Map<string, string>();
		const usedGedcomIds = new Set<string>();
		let individualCounter = 1;

		for (const person of people) {
			let gedcomId: string;

			// Use original GEDCOM xref if available and not already used
			if (person.externalId && person.externalIdSource === 'gedcom' && !usedGedcomIds.has(person.externalId)) {
				gedcomId = person.externalId;
			} else {
				// Generate new ID, ensuring no collision with preserved xrefs
				do {
					gedcomId = `I${individualCounter}`;
					individualCounter++;
				} while (usedGedcomIds.has(gedcomId));
			}

			usedGedcomIds.add(gedcomId);
			crIdToGedcomId.set(person.crId, gedcomId);
		}

		// Extract families BEFORE building individual records (needed for FAMS/FAMC references)
		const families = this.extractFamilies(people, crIdToGedcomId);

		// Assign family IDs and build lookup maps
		const familyIdMap = new Map<GedcomFamilyRecord, string>();
		let familyCounter = 1;
		for (const family of families) {
			const familyId = `F${familyCounter}`;
			familyIdMap.set(family, familyId);
			familyCounter++;
		}

		// Build FAMS lookup (person GEDCOM ID -> family IDs where they are a spouse)
		const famsLookup = new Map<string, string[]>();
		// Build FAMC lookup (person GEDCOM ID -> family references where they are a child)
		const famcLookup = new Map<string, FamcReference[]>();

		for (const [family, familyId] of familyIdMap) {
			// FAMS: families where person is husband or wife
			if (family.husbandId) {
				const existing = famsLookup.get(family.husbandId) || [];
				existing.push(familyId);
				famsLookup.set(family.husbandId, existing);
			}
			if (family.wifeId) {
				const existing = famsLookup.get(family.wifeId) || [];
				existing.push(familyId);
				famsLookup.set(family.wifeId, existing);
			}

			// FAMC: family where person is a child (with pedigree type)
			for (const childId of family.childIds) {
				const existing = famcLookup.get(childId) || [];
				existing.push({
					familyId,
					pediType: family.pediType
				});
				famcLookup.set(childId, existing);
			}
		}

		// Build individual records with FAMS/FAMC references
		for (const person of people) {
			const gedcomId = crIdToGedcomId.get(person.crId);
			if (!gedcomId) continue;

			lines.push(...this.buildIndividualRecord(
				person,
				gedcomId,
				crIdToGedcomId,
				events,
				sourceIdMap,
				options,
				privacyService,
				famsLookup.get(gedcomId),
				famcLookup.get(gedcomId),
				citationLookup
			));
		}

		// Attach family event notes to their matching FAM records
		const familyEventNotes = events.filter(e => FAMILY_EVENT_TYPES.has(e.eventType));
		for (const event of familyEventNotes) {
			// Find which family this event belongs to by matching persons
			const eventPersonIds = new Set<string>();
			if (event.person) {
				const personLink = extractWikilinkPath(event.person);
				for (const p of people) {
					if (personLink === p.name || personLink === p.file.basename) {
						eventPersonIds.add(crIdToGedcomId.get(p.crId) || '');
					}
				}
			}
			if (event.persons) {
				for (const ep of event.persons) {
					const personLink = extractWikilinkPath(ep);
					for (const p of people) {
						if (personLink === p.name || personLink === p.file.basename) {
							eventPersonIds.add(crIdToGedcomId.get(p.crId) || '');
						}
					}
				}
			}

			// Match to a family where both spouses are in the event's persons
			for (const [family] of familyIdMap) {
				if (family.husbandId && family.wifeId &&
					eventPersonIds.has(family.husbandId) && eventPersonIds.has(family.wifeId)) {
					if (!family.familyEvents) family.familyEvents = [];
					family.familyEvents.push(event);
					break;
				}
			}
		}

		// Build family records
		for (const [family, familyId] of familyIdMap) {
			lines.push(...this.buildFamilyRecord(family, familyId));
		}

		// Build trailer
		lines.push('0 TRLR');

		return lines.join('\n');
	}

	/**
	 * Build GEDCOM header
	 */
	private buildHeader(options: GedcomExportOptions): string[] {
		const now = new Date();
		const dateStr = `${now.getDate()} ${this.getMonthAbbreviation(now.getMonth())} ${now.getFullYear()}`;
		const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

		const sourceApp = options.sourceApp || 'Charted Roots';
		const sourceVersion = options.sourceVersion || '0.1.3-alpha';

		return [
			'0 HEAD',
			'1 SOUR ' + sourceApp,
			`2 VERS ${sourceVersion}`,
			'2 NAME Charted Roots for Obsidian',
			'1 DEST ANY',
			'1 DATE ' + dateStr,
			`2 TIME ${timeStr}`,
			'1 SUBM @SUBM1@',
			'1 FILE ' + (options.fileName || 'export') + '.ged',
			'1 GEDC',
			'2 VERS 5.5.1',
			'2 FORM LINEAGE-LINKED',
			'1 CHAR UTF-8',
			'0 @SUBM1@ SUBM',
			'1 NAME Charted Roots User'
		];
	}

	/**
	 * Build source record
	 */
	private buildSourceRecord(source: SourceNote, sourceId: string): string[] {
		const lines: string[] = [];

		lines.push(`0 @${sourceId}@ SOUR`);

		// Title
		if (source.title) {
			lines.push(`1 TITL ${source.title}`);
		}

		// Repository (mapped to AUTH in GEDCOM 5.5.1)
		if (source.repository) {
			lines.push(`1 AUTH ${source.repository}`);
		}

		// Collection (mapped to PUBL in GEDCOM 5.5.1)
		if (source.collection) {
			lines.push(`1 PUBL ${source.collection}`);
		}

		// Date of original document
		if (source.date) {
			const gedcomDate = this.formatDateForGedcom(source.date);
			if (gedcomDate) {
				lines.push(`1 DATA`);
				lines.push(`2 DATE ${gedcomDate}`);
			}
		}

		// Repository URL as note
		if (source.repositoryUrl) {
			lines.push(`1 NOTE ${source.repositoryUrl}`);
		}

		return lines;
	}

	/**
	 * Build hierarchical place string from place node
	 * Returns comma-separated hierarchy from specific to general (e.g., "Dublin, Dublin County, Leinster, Ireland")
	 */
	private buildPlaceHierarchy(placeNode: PlaceNode): string {
		if (!this.placeGraphService) {
			return placeNode.name;
		}

		const hierarchy = this.placeGraphService.getHierarchyPath(placeNode.id);
		return hierarchy.map(p => p.name).join(', ');
	}

	/**
	 * Build place lines with hierarchy and coordinates
	 * Returns GEDCOM lines for a place (PLAC, FORM, MAP with LATI/LONG)
	 */
	private buildPlaceLines(placeName: string, level: number): string[] {
		const lines: string[] = [];

		// If no place graph service, just output simple place name
		if (!this.placeGraphService) {
			lines.push(`${level} PLAC ${placeName}`);
			return lines;
		}

		// Try to find the place by name
		const placeNode = this.placeGraphService.getPlaceByName(placeName);

		if (!placeNode) {
			// Place not found in graph - output as-is
			lines.push(`${level} PLAC ${placeName}`);
			return lines;
		}

		// Build hierarchical place name
		const hierarchyString = this.buildPlaceHierarchy(placeNode);
		lines.push(`${level} PLAC ${hierarchyString}`);

		// Add FORM to indicate hierarchy structure (if there's a hierarchy)
		const hierarchy = this.placeGraphService.getHierarchyPath(placeNode.id);
		if (hierarchy.length > 1) {
			const formParts = hierarchy.map(p => p.placeType || 'Place');
			lines.push(`${level + 1} FORM ${formParts.join(', ')}`);
		}

		// Add MAP record with coordinates if available
		if (placeNode.coordinates) {
			lines.push(`${level + 1} MAP`);

			// Format latitude with N/S prefix
			const latPrefix = placeNode.coordinates.lat >= 0 ? 'N' : 'S';
			const latValue = Math.abs(placeNode.coordinates.lat).toFixed(4);
			lines.push(`${level + 2} LATI ${latPrefix}${latValue}`);

			// Format longitude with E/W prefix
			const longPrefix = placeNode.coordinates.long >= 0 ? 'E' : 'W';
			const longValue = Math.abs(placeNode.coordinates.long).toFixed(4);
			lines.push(`${level + 2} LONG ${longPrefix}${longValue}`);
		}

		return lines;
	}

	/**
	 * Build individual record
	 */
	private buildIndividualRecord(
		person: PersonNode,
		gedcomId: string,
		_crIdToGedcomId: Map<string, string>,
		events: EventNote[],
		sourceIdMap: Map<string, string>,
		options: GedcomExportOptions,
		privacyService: PrivacyService | null,
		famsIds?: string[],
		famcRefs?: FamcReference[],
		citationLookup?: Map<string, { page?: string; quality?: CitationQuality }>
	): string[] {
		const lines: string[] = [];

		// Check privacy status
		const privacyResult = privacyService?.applyPrivacy({
			name: person.name,
			birthDate: person.birthDate,
			deathDate: person.deathDate,
			cr_living: person.cr_living
		});

		lines.push(`0 @${gedcomId}@ INDI`);

		// Name (possibly obfuscated)
		const displayName = privacyResult?.isProtected
			? privacyResult.displayName
			: (person.name || 'Unknown');

		// Build NAME line using explicit components when available (#317)
		if (!privacyResult?.isProtected && (person.givenName || person.surnames)) {
			const prefix = person.namePrefix ? `${person.namePrefix} ` : '';
			const given = person.givenName || '';
			const surnamePrefix = person.surnamePrefix ? `${person.surnamePrefix} ` : '';
			const surname = person.surnames?.join(' ') || '';
			const suffix = person.nameSuffix ? ` ${person.nameSuffix}` : '';
			const gedcomName = `${prefix}${given} /${surnamePrefix}${surname}/${suffix}`.trim();
			lines.push(`1 NAME ${gedcomName}`);
		} else {
			const gedcomName = this.formatNameForGedcom(displayName);
			lines.push(`1 NAME ${gedcomName}`);
		}

		// Add given/surname if available (only if not obfuscated)
		// Prefer explicit name components from frontmatter, fall back to parsing from display name
		if (!privacyResult?.isProtected) {
			// Given name: prefer explicit givenName, fall back to parsed
			const givenName = person.givenName || this.parseNameParts(displayName).given;
			if (givenName) {
				lines.push(`2 GIVN ${givenName}`);
			}

			// Surname: prefer explicit surnames array, fall back to parsed
			const surname = (person.surnames && person.surnames.length > 0 ? person.surnames.join(' ') : undefined)
				|| this.parseNameParts(displayName).surname;
			if (surname) {
				lines.push(`2 SURN ${surname}`);
			}

			// Name prefix/suffix (#317)
			if (person.namePrefix) {
				lines.push(`2 NPFX ${person.namePrefix}`);
			}
			if (person.nameSuffix) {
				lines.push(`2 NSFX ${person.nameSuffix}`);
			}
			if (person.surnamePrefix) {
				lines.push(`2 SPFX ${person.surnamePrefix}`);
			}
			if (person.nickname) {
				lines.push(`2 NICK ${person.nickname}`);
			}
		}

		// Sex (resolve using alias services, infer from relationships if not found)
		const sex = this.resolveSexValue(person);
		if (sex) {
			lines.push(`1 SEX ${sex}`);
		}

		// Gender identity (custom tag for gender identity, distinct from biological sex)
		const genderIdentity = this.resolveGenderIdentityValue(person);
		if (genderIdentity && !privacyResult?.isProtected) {
			lines.push(`1 EVEN ${genderIdentity}`);
			lines.push('2 TYPE Gender Identity');
		}

		// Birth (hide if protected and hideDetailsForLiving is enabled)
		const showBirthDetails = !privacyResult?.isProtected || privacyResult.showBirthDate;
		if (showBirthDetails && (person.birthDate || person.birthPlace)) {
			lines.push('1 BIRT');
			if (person.birthDate && (!privacyResult?.isProtected || privacyResult.showBirthDate)) {
				const birthDate = this.formatDateForGedcom(person.birthDate);
				if (birthDate) {
					lines.push(`2 DATE ${birthDate}`);
				}
			}
			if (person.birthPlace && (!privacyResult?.isProtected || privacyResult.showBirthPlace)) {
				lines.push(...this.buildPlaceLines(person.birthPlace, 2));
			}
		}

		// Death (always show - living persons won't have death data anyway)
		if (person.deathDate || person.deathPlace || person.deathCause) {
			lines.push('1 DEAT');
			if (person.deathDate) {
				const deathDate = this.formatDateForGedcom(person.deathDate);
				if (deathDate) {
					lines.push(`2 DATE ${deathDate}`);
				}
			}
			if (person.deathPlace) {
				lines.push(...this.buildPlaceLines(person.deathPlace, 2));
			}
			if (person.deathCause) {
				lines.push(`2 CAUS ${person.deathCause}`);
			}
		}

		// Burial (#317)
		if (person.burialDate || person.burialPlace) {
			lines.push('1 BURI');
			if (person.burialDate) {
				const burialDate = this.formatDateForGedcom(person.burialDate);
				if (burialDate) {
					lines.push(`2 DATE ${burialDate}`);
				}
			}
			if (person.burialPlace) {
				lines.push(...this.buildPlaceLines(person.burialPlace, 2));
			}
		}

		// Occupation (hide for protected persons)
		if (person.occupation && !privacyResult?.isProtected) {
			lines.push(`1 OCCU ${person.occupation}`);
		}

		// Person attributes (#317) - hide for protected persons
		if (!privacyResult?.isProtected) {
			if (person.title) lines.push(`1 TITL ${person.title}`);
			if (person.religion) lines.push(`1 RELI ${person.religion}`);
			if (person.nationality) lines.push(`1 NATI ${person.nationality}`);
			if (person.physicalDescription) lines.push(`1 DSCR ${person.physicalDescription}`);
			if (person.identityNumber) lines.push(`1 IDNO ${person.identityNumber}`);
			if (person.property) lines.push(`1 PROP ${person.property}`);
			if (person.caste) lines.push(`1 CAST ${person.caste}`);
			if (person.childrenCount !== undefined) lines.push(`1 NCHI ${person.childrenCount}`);
			if (person.marriageCount !== undefined) lines.push(`1 NMR ${person.marriageCount}`);
			if (person.ssn) lines.push(`1 SSN ${person.ssn}`);
		}

		// Add events linked to this person
		if (events.length > 0) {
			const eventLines = this.buildEventRecords(person, events, sourceIdMap, citationLookup);
			lines.push(...eventLines);
		}

		// Add custom relationships as ASSO records
		if (options.includeCustomRelationships && this.relationshipService) {
			const assoLines = this.buildAssoRecords(person, _crIdToGedcomId);
			lines.push(...assoLines);
		}

		// FAMS - families where this person is a spouse
		if (famsIds && famsIds.length > 0) {
			for (const famsId of famsIds) {
				lines.push(`1 FAMS @${famsId}@`);
			}
		}

		// FAMC - families where this person is a child (with pedigree type)
		if (famcRefs && famcRefs.length > 0) {
			for (const famcRef of famcRefs) {
				lines.push(`1 FAMC @${famcRef.familyId}@`);
				// Add PEDI tag for non-biological relationships
				if (famcRef.pediType && famcRef.pediType !== 'birth') {
					lines.push(`2 PEDI ${famcRef.pediType}`);
				}
			}
		}

		// UUID preservation using _UID custom tag
		lines.push(`1 _UID ${person.crId}`);

		// Collection codes if enabled
		if (options.includeCollectionCodes) {
			if (person.collection) {
				lines.push(`1 _COLL ${person.collection}`);
			}
			if (person.collectionName) {
				lines.push(`1 _COLLN ${person.collectionName}`);
			}
		}

		// Research level (0-6 based on Hoitink's Six Levels)
		if (person.researchLevel !== undefined) {
			lines.push(`1 _RESEARCH_LEVEL ${person.researchLevel}`);
		}

		return lines;
	}

	/**
	 * Build ASSO (association) records for custom relationships
	 */
	private buildAssoRecords(person: PersonNode, crIdToGedcomId: Map<string, string>): string[] {
		const lines: string[] = [];

		if (!this.relationshipService) {
			return lines;
		}

		// Get all relationships for this person (only defined ones, not inferred)
		const relationships = this.relationshipService.getRelationshipsForPerson(person.crId);
		const definedRelationships = relationships.filter(r => !r.isInferred);

		for (const rel of definedRelationships) {
			// Skip if target person is not in the export
			if (!rel.targetCrId || !crIdToGedcomId.has(rel.targetCrId)) {
				continue;
			}

			const targetGedcomId = crIdToGedcomId.get(rel.targetCrId)!;

			// Build ASSO record
			lines.push(`1 ASSO @${targetGedcomId}@`);

			// RELA (relationship descriptor)
			// Use the relationship type name as the RELA value
			lines.push(`2 RELA ${rel.type.name}`);

			// Add notes with additional information
			const noteLines: string[] = [];

			// Add date range if present
			if (rel.from || rel.to) {
				let dateNote = 'Relationship';
				if (rel.from && rel.to) {
					dateNote += ` from ${rel.from} to ${rel.to}`;
				} else if (rel.from) {
					dateNote += ` from ${rel.from}`;
				} else if (rel.to) {
					dateNote += ` until ${rel.to}`;
				}
				noteLines.push(dateNote);
			}

			// Add custom notes if present
			if (rel.notes) {
				noteLines.push(rel.notes);
			}

			// Write NOTE records
			if (noteLines.length > 0) {
				for (const note of noteLines) {
					lines.push(`2 NOTE ${note}`);
				}
			}
		}

		return lines;
	}

	/**
	 * Build family record
	 */
	private buildFamilyRecord(
		family: GedcomFamilyRecord,
		familyId: string
	): string[] {
		const lines: string[] = [];

		lines.push(`0 @${familyId}@ FAM`);

		if (family.husbandId) {
			lines.push(`1 HUSB @${family.husbandId}@`);
		}

		if (family.wifeId) {
			lines.push(`1 WIFE @${family.wifeId}@`);
		}

		for (const childId of family.childIds) {
			lines.push(`1 CHIL @${childId}@`);
		}

		if (family.marriageDate || family.marriagePlace) {
			lines.push('1 MARR');

			if (family.marriageDate) {
				const marriageDate = this.formatDateForGedcom(family.marriageDate);
				if (marriageDate) {
					lines.push(`2 DATE ${marriageDate}`);
				}
			}

			if (family.marriagePlace) {
				lines.push(...this.buildPlaceLines(family.marriagePlace, 2));
			}
		}

		if (family.divorceDate || family.divorcePlace) {
			lines.push('1 DIV');

			if (family.divorceDate) {
				const divorceDate = this.formatDateForGedcom(family.divorceDate);
				if (divorceDate) {
					lines.push(`2 DATE ${divorceDate}`);
				}
			}

			if (family.divorcePlace) {
				lines.push(...this.buildPlaceLines(family.divorcePlace, 2));
			}
		}

		// Additional family events (MARB, MARC, MARL, MARS, DIVF)
		if (family.familyEvents) {
			for (const event of family.familyEvents) {
				const gedcomTag = this.eventTypeToGedcomTag(event.eventType);
				if (gedcomTag) {
					lines.push(`1 ${gedcomTag}`);
					if (event.date) {
						const gedcomDate = this.formatDateForGedcom(event.date);
						if (gedcomDate) {
							lines.push(`2 DATE ${gedcomDate}`);
						}
					}
					if (event.place) {
						const placeName = extractWikilinkPath(event.place);
						lines.push(...this.buildPlaceLines(placeName, 2));
					}
				}
			}
		}

		return lines;
	}

	/**
	 * Extract family records from person nodes
	 */
	private extractFamilies(
		people: PersonNode[],
		crIdToGedcomId: Map<string, string>
	): GedcomFamilyRecord[] {
		const families: GedcomFamilyRecord[] = [];
		const processedFamilies = new Set<string>();

		// Build families from parent-child relationships
		for (const person of people) {
			if (person.fatherCrId || person.motherCrId) {
				const familyKey = `${person.fatherCrId || 'NONE'}_${person.motherCrId || 'NONE'}`;

				if (!processedFamilies.has(familyKey)) {
					const family: GedcomFamilyRecord = {
						id: `F${families.length + 1}`,
						childIds: [],
						husbandId: person.fatherCrId ? crIdToGedcomId.get(person.fatherCrId) : undefined,
						wifeId: person.motherCrId ? crIdToGedcomId.get(person.motherCrId) : undefined
					};

					// Find all children of this family
					for (const child of people) {
						if (child.fatherCrId === person.fatherCrId && child.motherCrId === person.motherCrId) {
							const childGedcomId = crIdToGedcomId.get(child.crId);
							if (childGedcomId) {
								family.childIds.push(childGedcomId);
							}
						}
					}

					// Populate marriage/divorce from spouse relationships
					const father = person.fatherCrId ? people.find(p => p.crId === person.fatherCrId) : undefined;
					if (father?.spouses && person.motherCrId) {
						const spouseRel = father.spouses.find(s => s.personId === person.motherCrId);
						if (spouseRel) {
							family.marriageDate = spouseRel.marriageDate;
							family.marriagePlace = spouseRel.marriageLocation;
							family.divorceDate = spouseRel.divorceDate;
						}
					}

					families.push(family);
					processedFamilies.add(familyKey);
				}
			}
		}

		// Build families from step-parent relationships
		const processedStepFamilies = new Set<string>();
		for (const person of people) {
			// Step-fathers
			if (person.stepfatherCrIds && person.stepfatherCrIds.length > 0) {
				for (const stepfatherCrId of person.stepfatherCrIds) {
					const familyKey = `step_${stepfatherCrId}_NONE`;
					if (!processedStepFamilies.has(familyKey)) {
						const family: GedcomFamilyRecord = {
							id: `F${families.length + 1}`,
							childIds: [],
							husbandId: crIdToGedcomId.get(stepfatherCrId),
							pediType: 'step'
						};

						// Find all children with this stepfather
						for (const child of people) {
							if (child.stepfatherCrIds?.includes(stepfatherCrId)) {
								const childGedcomId = crIdToGedcomId.get(child.crId);
								if (childGedcomId) {
									family.childIds.push(childGedcomId);
								}
							}
						}

						if (family.childIds.length > 0) {
							families.push(family);
							processedStepFamilies.add(familyKey);
						}
					}
				}
			}

			// Step-mothers
			if (person.stepmotherCrIds && person.stepmotherCrIds.length > 0) {
				for (const stepmotherCrId of person.stepmotherCrIds) {
					const familyKey = `step_NONE_${stepmotherCrId}`;
					if (!processedStepFamilies.has(familyKey)) {
						const family: GedcomFamilyRecord = {
							id: `F${families.length + 1}`,
							childIds: [],
							wifeId: crIdToGedcomId.get(stepmotherCrId),
							pediType: 'step'
						};

						// Find all children with this stepmother
						for (const child of people) {
							if (child.stepmotherCrIds?.includes(stepmotherCrId)) {
								const childGedcomId = crIdToGedcomId.get(child.crId);
								if (childGedcomId) {
									family.childIds.push(childGedcomId);
								}
							}
						}

						if (family.childIds.length > 0) {
							families.push(family);
							processedStepFamilies.add(familyKey);
						}
					}
				}
			}
		}

		// Build families from adoptive parent relationships
		const processedAdoptiveFamilies = new Set<string>();
		for (const person of people) {
			if (person.adoptiveFatherCrId || person.adoptiveMotherCrId) {
				const familyKey = `adop_${person.adoptiveFatherCrId || 'NONE'}_${person.adoptiveMotherCrId || 'NONE'}`;

				if (!processedAdoptiveFamilies.has(familyKey)) {
					const family: GedcomFamilyRecord = {
						id: `F${families.length + 1}`,
						childIds: [],
						husbandId: person.adoptiveFatherCrId ? crIdToGedcomId.get(person.adoptiveFatherCrId) : undefined,
						wifeId: person.adoptiveMotherCrId ? crIdToGedcomId.get(person.adoptiveMotherCrId) : undefined,
						pediType: 'adop'
					};

					// Find all children with the same adoptive parents
					for (const child of people) {
						if (child.adoptiveFatherCrId === person.adoptiveFatherCrId &&
							child.adoptiveMotherCrId === person.adoptiveMotherCrId) {
							const childGedcomId = crIdToGedcomId.get(child.crId);
							if (childGedcomId) {
								family.childIds.push(childGedcomId);
							}
						}
					}

					if (family.childIds.length > 0) {
						families.push(family);
						processedAdoptiveFamilies.add(familyKey);
					}
				}
			}
		}

		// Build families from spouse relationships (marriages without children)
		for (const person of people) {
			if (person.spouseCrIds && person.spouseCrIds.length > 0) {
				for (const spouseCrId of person.spouseCrIds) {
					// Check if this spouse relationship already has a family
					const hasFamily = families.some(f =>
						(f.husbandId === crIdToGedcomId.get(person.crId) && f.wifeId === crIdToGedcomId.get(spouseCrId)) ||
						(f.wifeId === crIdToGedcomId.get(person.crId) && f.husbandId === crIdToGedcomId.get(spouseCrId))
					);

					if (!hasFamily) {
						// Determine husband/wife based on inferred sex
						const personSex = this.inferSex(person, people);
						const spouse = people.find(p => p.crId === spouseCrId);
						const spouseSex = spouse ? this.inferSex(spouse, people) : undefined;

						const family: GedcomFamilyRecord = {
							id: `F${families.length + 1}`,
							childIds: [],
							husbandId: personSex === 'M' ? crIdToGedcomId.get(person.crId) :
								spouseSex === 'M' ? crIdToGedcomId.get(spouseCrId) :
								crIdToGedcomId.get(person.crId),
							wifeId: personSex === 'F' ? crIdToGedcomId.get(person.crId) :
								spouseSex === 'F' ? crIdToGedcomId.get(spouseCrId) :
								crIdToGedcomId.get(spouseCrId)
						};

						// Extract marriage metadata if available
						if (person.spouses) {
							const spouseRelationship = person.spouses.find(s => s.personId === spouseCrId);
							if (spouseRelationship) {
								family.marriageDate = spouseRelationship.marriageDate;
								family.marriagePlace = spouseRelationship.marriageLocation;
								family.divorceDate = spouseRelationship.divorceDate;
							}
						}

						families.push(family);
					}
				}
			}
		}

		return families;
	}

	/**
	 * Format name for GEDCOM (surname in slashes)
	 */
	private formatNameForGedcom(name: string): string {
		if (!name || typeof name !== 'string') {
			logger.warn('name-format', 'Invalid or missing name, using "Unknown"');
			return 'Unknown //';
		}

		const trimmed = name.trim();
		if (trimmed.length === 0) {
			return 'Unknown //';
		}

		const parts = trimmed.split(/\s+/);

		if (parts.length === 0 || parts[0].length === 0) {
			return 'Unknown //';
		}

		if (parts.length === 1) {
			return `${parts[0]} //`;
		}

		// Assume last part is surname
		const surname = parts[parts.length - 1];
		const givenNames = parts.slice(0, -1).join(' ');

		return `${givenNames} /${surname}/`;
	}

	/**
	 * Parse name into given/surname parts
	 */
	private parseNameParts(name: string): { given?: string; surname?: string } {
		const parts = name.trim().split(/\s+/);

		if (parts.length === 0) {
			return {};
		}

		if (parts.length === 1) {
			return { given: parts[0] };
		}

		// Assume last part is surname
		return {
			given: parts.slice(0, -1).join(' '),
			surname: parts[parts.length - 1]
		};
	}

	/**
	 * Resolve sex value using property and value alias services
	 * Returns GEDCOM-format sex value (M, F, or U)
	 */
	private resolveSexValue(person: PersonNode): 'M' | 'F' | 'U' | undefined {
		// Try to resolve sex from frontmatter using property aliases
		let sexValue: string | undefined = person.sex;

		// If property alias service is available, try to resolve from raw frontmatter
		if (this.propertyAliasService) {
			const cache = this.app.metadataCache.getFileCache(person.file);
			if (cache?.frontmatter) {
				const resolved = this.propertyAliasService.resolve(cache.frontmatter, 'sex');
				if (resolved && typeof resolved === 'string') {
					sexValue = resolved;
				}
			}
		}

		// If we have a sex value, resolve it using value alias service
		if (sexValue && this.valueAliasService) {
			const canonicalSex = this.valueAliasService.resolve('sex', sexValue);

			// Map canonical values to GEDCOM format
			const normalized = canonicalSex.toLowerCase();
			if (normalized === 'male' || normalized === 'm') return 'M';
			if (normalized === 'female' || normalized === 'f') return 'F';
			if (normalized === 'nonbinary' || normalized === 'unknown' || normalized === 'u') return 'U';

			// For unrecognized values, try legacy format
			if (sexValue === 'M' || sexValue === 'F' || sexValue === 'U') {
				return sexValue;
			}
		} else if (sexValue) {
			// No value alias service, use value directly if it's in GEDCOM format
			const upper = sexValue.toUpperCase();
			if (upper === 'M' || upper === 'F' || upper === 'U') {
				return upper;
			}
		}

		return undefined;
	}

	/**
	 * Resolve gender_identity value using property and value alias services
	 * Returns resolved gender identity value as string
	 */
	private resolveGenderIdentityValue(person: PersonNode): string | undefined {
		// Try to resolve gender_identity from frontmatter using property aliases
		let genderIdentityValue: string | undefined;

		// If property alias service is available, try to resolve from raw frontmatter
		if (this.propertyAliasService) {
			const cache = this.app.metadataCache.getFileCache(person.file);
			if (cache?.frontmatter) {
				const resolved = this.propertyAliasService.resolve(cache.frontmatter, 'gender_identity');
				if (resolved && typeof resolved === 'string') {
					genderIdentityValue = resolved;
				}
			}
		}

		// If we have a gender_identity value, resolve it using value alias service
		if (genderIdentityValue && this.valueAliasService) {
			return this.valueAliasService.resolve('gender_identity', genderIdentityValue);
		}

		return genderIdentityValue;
	}

	/**
	 * Infer sex from relationships or return undefined
	 * Note: This requires access to all people, so it's used during export
	 */
	private inferSex(person: PersonNode, allPeople?: PersonNode[]): 'M' | 'F' | undefined {
		// Check if sex is already recorded
		if (person.sex === 'M' || person.sex === 'F') {
			return person.sex;
		}

		if (!allPeople) return undefined;

		// Check if person is a father
		const isFather = allPeople.some(p => p.fatherCrId === person.crId);
		if (isFather) return 'M';

		// Check if person is a mother
		const isMother = allPeople.some(p => p.motherCrId === person.crId);
		if (isMother) return 'F';

		// Cannot infer sex
		return undefined;
	}

	/**
	 * Format date for GEDCOM (DD MMM YYYY)
	 * Handles qualifiers (ABT, BEF, AFT, CAL, EST) and ranges (BET X AND Y)
	 */
	private formatDateForGedcom(dateStr: string): string | undefined {
		if (!dateStr) return undefined;

		const trimmed = dateStr.trim();

		// Handle BET X AND Y ranges - pass through as-is
		if (/^BET\s+\d{4}\s+AND\s+\d{4}$/i.test(trimmed)) {
			return trimmed.toUpperCase();
		}

		// Check for and extract qualifier prefix
		let qualifier = '';
		let datePart = trimmed;
		const qualifierMatch = trimmed.match(/^(ABT|BEF|AFT|CAL|EST)\s+(.+)$/i);
		if (qualifierMatch) {
			qualifier = qualifierMatch[1].toUpperCase() + ' ';
			datePart = qualifierMatch[2];
		}

		// Parse ISO date (YYYY-MM-DD or variations)
		const match = datePart.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
		if (!match) {
			// Not an ISO format - might already be in GEDCOM format, pass through
			if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/i.test(datePart) ||
			    /^[A-Z]{3}\s+\d{4}$/i.test(datePart) ||
			    /^\d{4}$/.test(datePart)) {
				return qualifier + datePart.toUpperCase();
			}
			logger.warn('date-format', `Invalid date format for GEDCOM: ${dateStr}`);
			return undefined;
		}

		const year = match[1];
		const month = match[2];
		const day = match[3];

		if (!month) {
			// Year only
			return qualifier + year;
		}

		const monthNum = parseInt(month);
		if (monthNum < 1 || monthNum > 12) {
			logger.warn('date-format', `Invalid month value: ${month} in date ${dateStr}`);
			return qualifier + year; // Fallback to year only
		}

		const monthAbbr = this.getMonthAbbreviation(monthNum - 1);

		if (!day) {
			// Month and year
			return qualifier + `${monthAbbr} ${year}`;
		}

		const dayNum = parseInt(day);
		if (dayNum < 1 || dayNum > 31) {
			logger.warn('date-format', `Invalid day value: ${day} in date ${dateStr}`);
			return qualifier + `${monthAbbr} ${year}`; // Fallback to month and year
		}

		// Full date
		return qualifier + `${dayNum} ${monthAbbr} ${year}`;
	}

	/**
	 * Get month abbreviation for GEDCOM
	 */
	private getMonthAbbreviation(monthIndex: number): string {
		const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
			'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
		return months[monthIndex] || 'JAN';
	}

	/**
	 * Map Charted Roots event type to GEDCOM tag
	 */
	private eventTypeToGedcomTag(eventType: string): string | null {
		const mapping: Record<string, string> = {
			'birth': 'BIRT',
			'death': 'DEAT',
			'burial': 'BURI',
			'cremation': 'CREM',
			'adoption': 'ADOP',
			'graduation': 'GRAD',
			'retirement': 'RETI',
			'census': 'CENS',
			'residence': 'RESI',
			'occupation': 'OCCU',
			'education': 'EDUC',
			'probate': 'PROB',
			'will': 'WILL',
			'naturalization': 'NATU',
			'military': 'MILI',
			'immigration': 'IMMI',
			'emigration': 'EMIG',
			'baptism': 'BAPM',
			'christening': 'CHR',
			'confirmation': 'CONF',
			'first_communion': 'FCOM',
			'ordination': 'ORDN',
			'bar_mitzvah': 'BARM',
			'bas_mitzvah': 'BASM',
			'blessing': 'BLES',
			'engagement': 'ENGA',
			'annulment': 'ANUL',
			// Marriage variants and adult christening (#317)
			'marriage_bann': 'MARB',
			'marriage_contract': 'MARC',
			'marriage_license': 'MARL',
			'marriage_settlement': 'MARS',
			'divorce_filed': 'DIVF',
			'adult_christening': 'CHRA'
		};

		return mapping[eventType] || null;
	}

	/**
	 * Build event records for a person
	 * Returns GEDCOM lines for events linked to this person
	 */
	private buildEventRecords(
		person: PersonNode,
		events: EventNote[],
		sourceIdMap: Map<string, string>,
		citationLookup?: Map<string, { page?: string; quality?: CitationQuality }>
	): string[] {
		const lines: string[] = [];

		// Filter events that reference this person
		const personEvents = events.filter(event => {
			// Check if person is referenced in event.person field
			if (event.person) {
				const personLink = extractWikilinkPath(event.person);
				if (personLink === person.name || personLink === person.file.basename) {
					return true;
				}
			}

			// Check if person is in event.persons array
			if (event.persons) {
				for (const p of event.persons) {
					const personLink = extractWikilinkPath(p);
					if (personLink === person.name || personLink === person.file.basename) {
						return true;
					}
				}
			}

			return false;
		});

		// Filter out family events — they belong on FAM records, not INDI
		// Also filter out birth/death/burial events that duplicate person-level data
		const individualEvents = personEvents.filter(e => {
			if (FAMILY_EVENT_TYPES.has(e.eventType)) return false;
			if (e.eventType === 'birth' && person.birthDate) return false;
			if (e.eventType === 'death' && person.deathDate) return false;
			if (e.eventType === 'burial' && (person.burialDate || person.burialPlace)) return false;
			if (e.eventType === 'occupation' && person.occupation) return false;
			return true;
		});

		// Build GEDCOM lines for each event
		for (const event of individualEvents) {
			const gedcomTag = this.eventTypeToGedcomTag(event.eventType);

			if (gedcomTag) {
				// Standard GEDCOM event tag
				lines.push(`1 ${gedcomTag}`);

				// Add date (with range support)
				if (event.date) {
					if (event.dateEnd) {
						const startDate = this.formatDateForGedcom(event.date);
						const endDate = this.formatDateForGedcom(event.dateEnd);
						if (startDate && endDate) {
							lines.push(`2 DATE FROM ${startDate} TO ${endDate}`);
						} else if (startDate) {
							lines.push(`2 DATE ${startDate}`);
						}
					} else {
						const gedcomDate = this.formatDateForGedcom(event.date);
						if (gedcomDate) {
							lines.push(`2 DATE ${gedcomDate}`);
						}
					}
				}

				// Add place if present
				if (event.place) {
					const placeName = extractWikilinkPath(event.place);
					lines.push(...this.buildPlaceLines(placeName, 2));
				}

				// Add age if present
				if (event.age) {
					lines.push(`2 AGE ${event.age}`);
				}

				// Add cause if present
				if (event.cause) {
					lines.push(`2 CAUS ${event.cause}`);
				}

				// Add source references if present
				if (event.sources && event.sources.length > 0) {
					for (const sourceLink of event.sources) {
						const sourceCrId = this.extractSourceCrId(sourceLink);
						if (sourceCrId) {
							const sourceId = sourceIdMap.get(sourceCrId);
							if (sourceId) {
								lines.push(`2 SOUR @${sourceId}@`);
								// Look up citation metadata (PAGE/QUAY)
								if (citationLookup) {
									const key = `${person.crId}|${event.eventType}|${sourceCrId}`;
									const citation = citationLookup.get(key);
									if (citation?.page) {
										lines.push(`3 PAGE ${citation.page}`);
									}
									if (citation?.quality !== undefined) {
										lines.push(`3 QUAY ${citation.quality}`);
									}
								}
							}
						}
					}
				}

				// Add note with event title and description
				if (event.title || event.description) {
					const noteText = event.description || event.title;
					lines.push(`2 NOTE ${noteText}`);
				}
			} else if (event.eventType === 'custom' || event.eventType) {
				// Custom event type - use EVEN tag with TYPE
				lines.push('1 EVEN');

				// Add custom type
				const eventName = event.title || event.eventType;
				lines.push(`2 TYPE ${eventName}`);

				// Add date if present
				if (event.date) {
					const gedcomDate = this.formatDateForGedcom(event.date);
					if (gedcomDate) {
						lines.push(`2 DATE ${gedcomDate}`);
					}
				}

				// Add place if present
				if (event.place) {
					const placeName = extractWikilinkPath(event.place);
					lines.push(...this.buildPlaceLines(placeName, 2));
				}

				// Add source references if present
				if (event.sources && event.sources.length > 0) {
					for (const sourceLink of event.sources) {
						const sourceCrId = this.extractSourceCrId(sourceLink);
						if (sourceCrId) {
							const sourceId = sourceIdMap.get(sourceCrId);
							if (sourceId) {
								lines.push(`2 SOUR @${sourceId}@`);
								// Look up citation metadata (PAGE/QUAY)
								if (citationLookup) {
									const key = `${person.crId}|${event.eventType}|${sourceCrId}`;
									const citation = citationLookup.get(key);
									if (citation?.page) {
										lines.push(`3 PAGE ${citation.page}`);
									}
									if (citation?.quality !== undefined) {
										lines.push(`3 QUAY ${citation.quality}`);
									}
								}
							}
						}
					}
				}

				// Add note with description
				if (event.description) {
					lines.push(`2 NOTE ${event.description}`);
				}
			}
		}

		return lines;
	}

	/**
	 * Extract cr_id from a source wikilink
	 * Handles formats like [[Source Name]] or [[Source Name|Display]]
	 */
	private extractSourceCrId(wikilink: string): string | null {
		// Extract link path (handles alias format automatically)
		const linkPath = extractWikilinkPath(wikilink);

		// Try to find source by title (file name without extension)
		if (this.sourceService) {
			const sources = this.sourceService.getAllSources();
			const source = sources.find(s => {
				const fileName = s.filePath.split('/').pop()?.replace('.md', '') || '';
				return fileName === linkPath || s.title === linkPath;
			});
			return source?.crId || null;
		}

		return null;
	}

	/**
	 * Load all citation notes and build a lookup map for PAGE/QUAY export.
	 * Key format: "subjectCrId|eventType|sourceCrId"
	 * The fact property (e.g., "birth_date") is mapped back to event type (e.g., "birth").
	 */
	private loadCitationLookup(
		options: GedcomExportOptions
	): Map<string, { page?: string; quality?: CitationQuality }> {
		const lookup = new Map<string, { page?: string; quality?: CitationQuality }>();
		const citationsFolder = options.citationsFolder || 'Charted Roots/Citations';

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!file.path.startsWith(citationsFolder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || fm.cr_type !== 'citation') continue;

			const subjectCrId = fm.subject_id as string;
			const fact = fm.fact as string;
			const page = fm.page as string | undefined;
			const quality = fm.quality as CitationQuality | undefined;

			if (!subjectCrId || !fact) continue;
			if (page === undefined && quality === undefined) continue;

			// Resolve source cr_id from the source wikilink
			const sourceWikilink = fm.source as string;
			let sourceCrId = fm.source_id as string | undefined;
			if (!sourceCrId && sourceWikilink) {
				sourceCrId = this.extractSourceCrId(sourceWikilink) || undefined;
			}
			if (!sourceCrId) continue;

			// Map fact back to event type for lookup key
			const eventType = this.factToEventType(fact);

			const key = `${subjectCrId}|${eventType}|${sourceCrId}`;
			lookup.set(key, { page, quality });
		}

		logger.info('citations', `Loaded ${lookup.size} citation metadata entries for export`);
		return lookup;
	}

	/**
	 * Map a fact property name back to event type for citation lookup
	 */
	private factToEventType(fact: string): string {
		const mapping: Record<string, string> = {
			'birth_date': 'birth',
			'death_date': 'death',
			'burial_date': 'burial',
			'baptism_date': 'baptism',
			'christening_date': 'christening',
			'marriage_date': 'marriage',
			'divorce_date': 'divorce',
			'census': 'census',
			'immigration': 'immigration',
			'emigration': 'emigration',
			'naturalization': 'naturalization',
			'residence': 'residence',
			'occupation': 'occupation',
			'education': 'education',
			'military_service': 'military',
			'confirmation': 'confirmation',
			'ordination': 'ordination',
			'retirement': 'retirement',
			'will': 'will',
			'probate': 'probate'
		};
		return mapping[fact] || fact;
	}
}
