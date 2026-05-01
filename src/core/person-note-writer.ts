/**
 * Person note writer utilities for Charted Roots
 * Creates person notes with proper YAML frontmatter
 */

import { App, TFile, normalizePath } from 'obsidian';
import { generateCrId } from './uuid';
import { getLogger } from './logging';
import type { ResearchLevel } from '../types/frontmatter';
import { SOURCED_PROPERTY_NAMES } from '../sources/types/source-types';
import { computeRelationshipArrayPatch, applyRelationshipArrayPatch } from './relationship-emit';
import { detectSpouseTargetFormat } from './spouse-format-detector';

const logger = getLogger('PersonNoteWriter');

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
 * Strip wikilink brackets from a string
 * Handles both [[Name]] and [[Basename|Display]] formats
 */
function stripWikilink(text: string): string {
	// Match [[basename|display]] or [[name]]
	const match = text.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
	if (match) {
		// Return the display name if present, otherwise the basename
		return match[2] || match[1];
	}
	return text;
}

/**
 * Create a wikilink with proper handling of duplicate filenames
 * Uses [[basename|name]] format when basename differs from name
 * @param name The display name (can already be a wikilink)
 * @param app The Obsidian app instance for file resolution
 */
function createSmartWikilink(name: string, app: App): string {
	// If already formatted as a complete wikilink, return as-is
	// This allows callers to pass pre-constructed [[basename|display]] links
	// that bypass name-based resolution (avoids wrong-file resolution on duplicates)
	if (name.startsWith('[[') && name.endsWith(']]')) {
		return name;
	}

	// Strip existing brackets if present
	const cleanName = stripWikilink(name);

	// Try to resolve the name to a file
	const resolvedFile = app.metadataCache.getFirstLinkpathDest(cleanName, '');
	if (resolvedFile && resolvedFile.basename !== cleanName) {
		return `[[${resolvedFile.basename}|${cleanName}]]`;
	}

	// Standard format
	return `[[${cleanName}]]`;
}

/**
 * Extract `sourced_*` frontmatter properties into the structured shape the
 * Edit Person modal expects (a Record keyed by sourced property name, values
 * are arrays of source basenames).
 *
 * Each `sourced_<fact>` property in frontmatter is an array of wikilinks (or
 * a single wikilink string for legacy data); this helper strips the wikilink
 * brackets and any pipe-aliases, leaving just the basename so the modal can
 * round-trip it through its chip UI.
 *
 * Returns undefined when no `sourced_*` properties are present, so callers
 * can leave editPersonData.sourcedFacts unset in that case.
 *
 * Closes the data-loss bug (#512) where Edit Person callers built
 * editPersonData manually and never populated `sourcedFacts` from the file's
 * frontmatter, causing every Save round-trip to wipe `sourced_*` properties.
 */
export function extractSourcedFactsFromFrontmatter(
	fm: Record<string, unknown>
): Record<string, string[]> | undefined {
	const result: Record<string, string[]> = {};
	let found = false;
	for (const prop of SOURCED_PROPERTY_NAMES) {
		const value = fm[prop];
		if (value === undefined || value === null) continue;
		const list = Array.isArray(value) ? value : [value];
		const basenames: string[] = [];
		for (const item of list) {
			if (typeof item !== 'string') continue;
			const trimmed = item.trim();
			if (!trimmed) continue;
			// Match [[basename]] or [[basename|alias]] — keep the basename
			// portion (left of the pipe). For bare strings without brackets,
			// pass through unchanged.
			const match = trimmed.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
			basenames.push(match ? match[1].trim() : trimmed);
		}
		if (basenames.length > 0) {
			result[prop] = basenames;
			found = true;
		}
	}
	return found ? result : undefined;
}

/**
 * Per-spouse marriage metadata for indexed spouse format (#204)
 */
export interface SpouseMetadata {
	crId: string;
	name: string;
	marriageDate?: string;
	marriageLocation?: string;
	marriageLocationCrId?: string;
	marriageStatus?: 'current' | 'divorced' | 'widowed' | 'separated' | 'annulled';
	divorceDate?: string;
}

/**
 * Person data for note creation
 */
export interface PersonData {
	/** Display name (optional - allows creating placeholder persons) */
	name?: string;
	crId?: string;
	/** Person subtype (e.g., "DNA Match" for genetic genealogy) */
	personType?: string;
	nickname?: string;           // Informal name, alias, or nickname (e.g., "Bobby" for Robert)
	// Name components (#174, #192)
	givenName?: string;          // First/given name(s) - from GEDCOM GIVN tag
	surnames?: string[];         // Surnames - supports single or multiple
	maidenName?: string;         // Birth surname (before marriage)
	marriedNames?: string[];     // Married surnames (supports multiple marriages)
	// Basic info
	birthDate?: string;
	deathDate?: string;
	birthPlace?: string;
	deathPlace?: string;
	occupation?: string;
	sex?: string;
	pronouns?: string[];    // Pronouns (e.g., ["she/her", "they/them"])
	cr_living?: boolean;    // Manual override for living status detection
	collection?: string;    // User-defined grouping
	universe?: string;      // Fictional universe or world
	father?: string;        // Legacy: name-based relationship (deprecated)
	mother?: string;        // Legacy: name-based relationship (deprecated)
	spouse?: string[];      // Legacy: name-based relationship (deprecated)
	fatherCrId?: string;    // Father's cr_id for reliable resolution
	fatherName?: string;    // Father's name for wikilink display
	motherCrId?: string;    // Mother's cr_id for reliable resolution
	motherName?: string;    // Mother's name for wikilink display
	spouseCrId?: string[];  // Spouse(s) cr_id for reliable resolution
	spouseName?: string[];  // Spouse(s) name for wikilink display
	spouseMetadata?: SpouseMetadata[];  // Per-spouse marriage metadata (#204)
	childCrId?: string[];   // Children's cr_ids for reliable resolution
	childName?: string[];   // Children's names for wikilink display
	// Step-parent relationships
	stepfatherCrId?: string[];   // Step-father(s) cr_id
	stepfatherName?: string[];   // Step-father(s) name for wikilink display
	stepmotherCrId?: string[];   // Step-mother(s) cr_id
	stepmotherName?: string[];   // Step-mother(s) name for wikilink display
	// Adoptive parent relationships
	adoptiveFatherCrId?: string; // Adoptive father's cr_id
	adoptiveFatherName?: string; // Adoptive father's name for wikilink display
	adoptiveMotherCrId?: string; // Adoptive mother's cr_id
	adoptiveMotherName?: string; // Adoptive mother's name for wikilink display
	// Gender-neutral parent relationships
	parentCrId?: string[];       // Gender-neutral parent(s) cr_id
	parentName?: string[];       // Gender-neutral parent(s) name for wikilink display
	// Place relationships (dual storage like relationships)
	birthPlaceCrId?: string;     // Birth place cr_id for reliable resolution
	birthPlaceName?: string;     // Birth place name for wikilink display
	deathPlaceCrId?: string;     // Death place cr_id for reliable resolution
	deathPlaceName?: string;     // Death place name for wikilink display
	// Media references
	media?: string[];            // Wikilinks to media files (e.g., ["[[photo.jpg]]"])
	// Research tracking
	researchLevel?: ResearchLevel;  // Research level (0-6) based on Hoitink's Six Levels
	// Source references (general person-level sources)
	sourceCrIds?: string[];      // Source cr_ids for reliable resolution
	sourceNames?: string[];      // Source names for wikilink display
	// Notes content (from Gramps import)
	notesContent?: string;       // Markdown notes content to append to note body
	// Privacy flag
	private?: boolean;           // Mark note as private (e.g., for Gramps priv flag)
	// External IDs (for import round-trip)
	externalId?: string;         // Original ID from import source (e.g., GEDCOM xref, Gramps handle)
	externalIdSource?: string;   // Source of the external ID (e.g., "gedcom", "gramps")
	// DNA tracking fields (opt-in via enableDnaTracking setting)
	dnaSharedCm?: number;        // Shared centiMorgans
	dnaTestingCompany?: string;  // Testing company (AncestryDNA, 23andMe, etc.)
	dnaKitId?: string;           // Kit identifier
	dnaMatchType?: string;       // BKM | BMM | confirmed | unconfirmed
	dnaEndogamyFlag?: boolean;   // Flag for endogamous populations
	dnaNotes?: string;           // Free-form notes
	needsResearch?: string[];    // Research questions requiring investigation
	tags?: string[];             // Obsidian tags (e.g., from Gramps import)
	// Fact-level source tracking (sourced_* properties)
	sourcedFacts?: Record<string, string[]>;  // Maps sourced property name → array of source basenames
	// GEDCOM name components (#317)
	namePrefix?: string;         // Name prefix (NPFX: "Dr.", "Rev.")
	nameSuffix?: string;         // Name suffix (NSFX: "Jr.", "III")
	surnamePrefix?: string;      // Surname prefix (SPFX: "von", "de la")
	// GEDCOM attributes (#317)
	burialDate?: string;         // Burial date (BURI.DATE)
	burialPlace?: string;        // Burial place (BURI.PLAC)
	adoptionDate?: string;       // Adoption date — for the adoptee (#396)
	deathCause?: string;         // Cause of death (DEAT.CAUS)
	title?: string;              // Title/nobility (TITL)
	religion?: string;           // Religion (RELI)
	nationality?: string;        // Nationality (NATI)
	physicalDescription?: string; // Physical description (DSCR)
	identityNumber?: string;     // National ID number (IDNO)
	property?: string;           // Property/possessions (PROP)
	caste?: string;              // Caste (CAST)
	childrenCount?: number;      // Number of children (NCHI)
	marriageCount?: number;      // Number of marriages (NMR)
	ssn?: string;                // Social Security Number (SSN)
}

/**
 * Filename format options
 */
export type FilenameFormat = 'original' | 'kebab-case' | 'snake_case';

/**
 * Dynamic block types that can be included in person notes
 */
export type DynamicBlockType = 'timeline' | 'relationships' | 'media';

/**
 * Options for person note creation
 */
export interface CreatePersonNoteOptions {
	/** Directory path where person notes are stored (default: root) */
	directory?: string;
	/** Whether to open the note after creation (default: false) */
	openAfterCreate?: boolean;
	/** Whether to add bidirectional spouse links (default: true) */
	addBidirectionalLinks?: boolean;
	/** Property aliases for writing custom property names (user property → canonical) */
	propertyAliases?: Record<string, string>;
	/** Filename format (default: 'original') */
	filenameFormat?: FilenameFormat;
	/** Include dynamic content blocks in the note body */
	includeDynamicBlocks?: boolean;
	/** Which dynamic block types to include (default: ['media', 'timeline', 'relationships']) */
	dynamicBlockTypes?: DynamicBlockType[];
	/**
	 * Set of paths already created in this batch import session.
	 * Used to track duplicates when vault indexing hasn't caught up.
	 * The function will add the final path to this set after creation.
	 */
	createdPaths?: Set<string>;
}

/**
 * Create a person note with YAML frontmatter
 *
 * @param app - Obsidian app instance
 * @param person - Person data
 * @param options - Creation options
 * @returns The created TFile
 *
 * @example
 * const file = await createPersonNote(app, {
 *   name: "John Robert Smith",
 *   birthDate: "1888-05-15",
 *   deathDate: "1952-08-20"
 * }, {
 *   directory: "People",
 *   openAfterCreate: true
 * });
 */
export async function createPersonNote(
	app: App,
	person: PersonData,
	options: CreatePersonNoteOptions = {}
): Promise<TFile> {
	const {
		directory = '',
		openAfterCreate = false,
		addBidirectionalLinks = true,
		propertyAliases = {},
		filenameFormat = 'original',
		includeDynamicBlocks = false,
		dynamicBlockTypes = ['media', 'timeline', 'relationships']
	} = options;

	// Helper to get aliased property name
	const prop = (canonical: string) => getWriteProperty(canonical, propertyAliases);

	// Generate cr_id if not provided
	const crId = person.crId || generateCrId();

	// Build frontmatter with essential properties
	// Essential properties are always included (per Guide documentation)
	// Property names respect user-configured aliases
	const frontmatter: Record<string, string | string[] | number | boolean> = {
		[prop('cr_id')]: crId,
		[prop('cr_type')]: 'person',
		[prop('name')]: person.name || '',
		[prop('born')]: person.birthDate || '',
		[prop('died')]: person.deathDate || ''
	};

	// Person type (e.g., "DNA Match" for genetic genealogy)
	if (person.personType) {
		frontmatter[prop('personType')] = person.personType;
	}

	// Birth place (dual storage: wikilink + ID for reliable resolution)
	if (person.birthPlaceCrId && person.birthPlaceName) {
		frontmatter[prop('birth_place')] = `"${createSmartWikilink(person.birthPlaceName, app)}"`;
		frontmatter[prop('birth_place_id')] = person.birthPlaceCrId;
		logger.debug('birthPlace', `Added (dual): wikilink=${person.birthPlaceName}, id=${person.birthPlaceCrId}`);
	} else if (person.birthPlace) {
		// Fallback for plain text (legacy or unlinked)
		frontmatter[prop('birth_place')] = person.birthPlace;
		logger.debug('birthPlace', `Added (plain text): ${person.birthPlace}`);
	}

	// Death place (dual storage: wikilink + ID for reliable resolution)
	if (person.deathPlaceCrId && person.deathPlaceName) {
		frontmatter[prop('death_place')] = `"${createSmartWikilink(person.deathPlaceName, app)}"`;
		frontmatter[prop('death_place_id')] = person.deathPlaceCrId;
		logger.debug('deathPlace', `Added (dual): wikilink=${person.deathPlaceName}, id=${person.deathPlaceCrId}`);
	} else if (person.deathPlace) {
		// Fallback for plain text (legacy or unlinked)
		frontmatter[prop('death_place')] = person.deathPlace;
		logger.debug('deathPlace', `Added (plain text): ${person.deathPlace}`);
	}

	if (person.nickname) {
		frontmatter[prop('nickname')] = person.nickname;
	}

	// Name components (#174, #192)
	if (person.givenName) {
		frontmatter[prop('given_name')] = person.givenName;
	}
	if (person.surnames && person.surnames.length > 0) {
		frontmatter[prop('surnames')] = person.surnames;
	}
	if (person.maidenName) {
		frontmatter[prop('maiden_name')] = person.maidenName;
	}
	if (person.marriedNames && person.marriedNames.length > 0) {
		frontmatter[prop('married_names')] = person.marriedNames;
	}
	if (person.namePrefix) {
		frontmatter[prop('name_prefix')] = person.namePrefix;
	}
	if (person.nameSuffix) {
		frontmatter[prop('name_suffix')] = person.nameSuffix;
	}
	if (person.surnamePrefix) {
		frontmatter[prop('surname_prefix')] = person.surnamePrefix;
	}

	// GEDCOM attributes (#317)
	if (person.burialDate) {
		frontmatter[prop('burial_date')] = person.burialDate;
	}
	if (person.burialPlace) {
		frontmatter[prop('burial_place')] = person.burialPlace;
	}
	if (person.adoptionDate) {
		frontmatter[prop('adoption_date')] = person.adoptionDate;
	}
	if (person.deathCause) {
		frontmatter[prop('death_cause')] = person.deathCause;
	}
	if (person.title) {
		frontmatter[prop('title')] = person.title;
	}
	if (person.religion) {
		frontmatter[prop('religion')] = person.religion;
	}
	if (person.nationality) {
		frontmatter[prop('nationality')] = person.nationality;
	}
	if (person.physicalDescription) {
		frontmatter[prop('physical_description')] = person.physicalDescription;
	}
	if (person.identityNumber) {
		frontmatter[prop('identity_number')] = person.identityNumber;
	}
	if (person.property) {
		frontmatter[prop('property')] = person.property;
	}
	if (person.caste) {
		frontmatter[prop('caste')] = person.caste;
	}
	if (person.childrenCount !== undefined) {
		frontmatter[prop('children_count')] = person.childrenCount;
	}
	if (person.marriageCount !== undefined) {
		frontmatter[prop('marriage_count')] = person.marriageCount;
	}
	if (person.ssn) {
		frontmatter[prop('ssn')] = person.ssn;
	}

	if (person.occupation) {
		frontmatter[prop('occupation')] = person.occupation;
	}

	if (person.sex) {
		frontmatter[prop('sex')] = person.sex;
	}

	if (person.pronouns && person.pronouns.length > 0) {
		frontmatter[prop('pronouns')] = person.pronouns;
	}

	if (person.collection) {
		frontmatter[prop('collection')] = person.collection;
	}

	if (person.universe) {
		frontmatter[prop('universe')] = person.universe;
	}

	if (person.researchLevel !== undefined) {
		frontmatter[prop('research_level')] = person.researchLevel;
	}

	if (person.needsResearch && person.needsResearch.length > 0) {
		frontmatter[prop('needs_research')] = person.needsResearch;
	}

	if (person.tags && person.tags.length > 0) {
		frontmatter['tags'] = person.tags;
	}

	// Sources (dual storage: wikilinks + _id array)
	if (person.sourceCrIds && person.sourceCrIds.length > 0 && person.sourceNames && person.sourceNames.length > 0) {
		frontmatter[prop('sources')] = person.sourceNames.map(name => `"${createSmartWikilink(name, app)}"`);
		frontmatter[prop('sources_id')] = person.sourceCrIds;
		logger.debug('sources', `Added ${person.sourceCrIds.length} sources`);
	}

	// Fact-level source tracking (sourced_* properties)
	if (person.sourcedFacts) {
		for (const sourcedProp of SOURCED_PROPERTY_NAMES) {
			const names = person.sourcedFacts[sourcedProp];
			if (names && names.length > 0) {
				frontmatter[prop(sourcedProp)] = names.map(name => `"${createSmartWikilink(name, app)}"`);
			}
		}
	}

	// Privacy flag (e.g., from Gramps priv attribute)
	if (person.private === true) {
		frontmatter[prop('private')] = 'true';
	}

	// External IDs (for import round-trip support)
	if (person.externalId) {
		frontmatter[prop('external_id')] = person.externalId;
		logger.debug('externalId', `Added: ${person.externalId}`);
	}
	if (person.externalIdSource) {
		frontmatter[prop('external_id_source')] = person.externalIdSource;
		logger.debug('externalIdSource', `Added: ${person.externalIdSource}`);
	}

	// DNA tracking fields (opt-in via enableDnaTracking setting)
	if (person.dnaSharedCm !== undefined) {
		frontmatter[prop('dna_shared_cm')] = person.dnaSharedCm;
	}
	if (person.dnaTestingCompany) {
		frontmatter[prop('dna_testing_company')] = person.dnaTestingCompany;
	}
	if (person.dnaKitId) {
		frontmatter[prop('dna_kit_id')] = person.dnaKitId;
	}
	if (person.dnaMatchType) {
		frontmatter[prop('dna_match_type')] = person.dnaMatchType;
	}
	if (person.dnaEndogamyFlag !== undefined) {
		frontmatter[prop('dna_endogamy_flag')] = person.dnaEndogamyFlag;
	}
	if (person.dnaNotes) {
		frontmatter[prop('dna_notes')] = person.dnaNotes;
	}

	// Handle relationships using dual storage: wikilinks for Obsidian + _id fields for reliability
	// Property names respect user-configured aliases
	logger.debug('relationships', `Processing - fatherCrId: ${person.fatherCrId}, motherCrId: ${person.motherCrId}, spouseCrId: ${person.spouseCrId?.join(', ') ?? 'none'}`);

	// Father relationship (dual storage)
	if (person.fatherCrId && person.fatherName) {
		frontmatter[prop('father')] = `"${createSmartWikilink(person.fatherName, app)}"`;
		frontmatter[prop('father_id')] = person.fatherCrId;
		logger.debug('father', `Added (dual): wikilink=${person.fatherName}, id=${person.fatherCrId}`);
	} else if (person.fatherCrId) {
		// ID only (fallback for legacy data)
		frontmatter[prop('father_id')] = person.fatherCrId;
		logger.debug('father', `Added (id only): ${person.fatherCrId}`);
	} else if (person.father) {
		// Legacy: name-based relationship only
		frontmatter[prop('father')] = `"${createSmartWikilink(person.father, app)}"`;
		logger.debug('father', `Added (legacy): ${person.father}`);
	}

	// Mother relationship (dual storage)
	if (person.motherCrId && person.motherName) {
		frontmatter[prop('mother')] = `"${createSmartWikilink(person.motherName, app)}"`;
		frontmatter[prop('mother_id')] = person.motherCrId;
		logger.debug('mother', `Added (dual): wikilink=${person.motherName}, id=${person.motherCrId}`);
	} else if (person.motherCrId) {
		// ID only (fallback for legacy data)
		frontmatter[prop('mother_id')] = person.motherCrId;
		logger.debug('mother', `Added (id only): ${person.motherCrId}`);
	} else if (person.mother) {
		// Legacy: name-based relationship only
		frontmatter[prop('mother')] = `"${createSmartWikilink(person.mother, app)}"`;
		logger.debug('mother', `Added (legacy): ${person.mother}`);
	}

	// Spouse relationship(s) - use indexed format with metadata when available (#204)
	const hasSpouseMetadata = person.spouseMetadata?.some(s =>
		s.marriageDate || s.marriageLocation || s.marriageStatus || s.divorceDate
	);

	if (hasSpouseMetadata && person.spouseMetadata) {
		// Write indexed spouse format with metadata (spouse1, spouse1_id, spouse1_marriage_date, etc.)
		for (let i = 0; i < person.spouseMetadata.length; i++) {
			const spouse = person.spouseMetadata[i];
			const idx = i + 1; // 1-indexed

			// Write spouse link and ID
			frontmatter[prop(`spouse${idx}`)] = `"${createSmartWikilink(spouse.name, app)}"`;
			frontmatter[prop(`spouse${idx}_id`)] = spouse.crId;

			// Write optional metadata fields
			if (spouse.marriageDate) {
				frontmatter[prop(`spouse${idx}_marriage_date`)] = spouse.marriageDate;
			}
			if (spouse.marriageLocation) {
				if (spouse.marriageLocationCrId) {
					frontmatter[prop(`spouse${idx}_marriage_location`)] = `"${createSmartWikilink(spouse.marriageLocation, app)}"`;
					frontmatter[prop(`spouse${idx}_marriage_location_id`)] = spouse.marriageLocationCrId;
				} else {
					frontmatter[prop(`spouse${idx}_marriage_location`)] = spouse.marriageLocation;
				}
			}
			if (spouse.marriageStatus) {
				frontmatter[prop(`spouse${idx}_marriage_status`)] = spouse.marriageStatus;
			}
			if (spouse.divorceDate) {
				frontmatter[prop(`spouse${idx}_divorce_date`)] = spouse.divorceDate;
			}
		}
		logger.debug('spouse', `Added (indexed): ${person.spouseMetadata.length} spouses with metadata`);
	} else if (person.spouseCrId && person.spouseCrId.length > 0) {
		// Legacy dual storage format (spouse/spouse_id arrays)
		if (person.spouseName && person.spouseName.length === person.spouseCrId.length) {
			// Dual storage with both names and IDs
			if (person.spouseName.length === 1) {
				frontmatter[prop('spouse')] = `"${createSmartWikilink(person.spouseName[0], app)}"`;
				frontmatter[prop('spouse_id')] = person.spouseCrId[0];
			} else {
				frontmatter[prop('spouse')] = person.spouseName.map(s => `"${createSmartWikilink(s, app)}"`);
				frontmatter[prop('spouse_id')] = person.spouseCrId;
			}
			logger.debug('spouse', `Added (dual): wikilinks=${JSON.stringify(person.spouseName)}, ids=${JSON.stringify(person.spouseCrId)}`);
		} else {
			// ID only (fallback for legacy data or missing names)
			if (person.spouseCrId.length === 1) {
				frontmatter[prop('spouse_id')] = person.spouseCrId[0];
			} else {
				frontmatter[prop('spouse_id')] = person.spouseCrId;
			}
			logger.debug('spouse', `Added (id only): ${JSON.stringify(person.spouseCrId)}`);
		}
	} else if (person.spouse && person.spouse.length > 0) {
		// Legacy: name-based relationship only
		if (person.spouse.length === 1) {
			frontmatter[prop('spouse')] = `"${createSmartWikilink(person.spouse[0], app)}"`;
		} else {
			frontmatter[prop('spouse')] = person.spouse.map(s => `"${createSmartWikilink(s, app)}"`);
		}
		logger.debug('spouse', `Added (legacy): ${JSON.stringify(person.spouse)}`);
	}

	// Children relationship(s) (dual storage)
	// Uses 'children' (plural) per v0.18.11 property naming normalization
	if (person.childCrId && person.childCrId.length > 0) {
		if (person.childName && person.childName.length === person.childCrId.length) {
			// Dual storage with both names and IDs
			if (person.childName.length === 1) {
				frontmatter[prop('children')] = `"${createSmartWikilink(person.childName[0], app)}"`;
				frontmatter[prop('children_id')] = person.childCrId[0];
			} else {
				frontmatter[prop('children')] = person.childName.map(c => `"${createSmartWikilink(c, app)}"`);
				frontmatter[prop('children_id')] = [...person.childCrId]; // Make a copy to avoid reference issues
			}
			logger.debug('children', `Added (dual): wikilinks=${JSON.stringify(person.childName)}, ids=${JSON.stringify(person.childCrId)}`);
		} else {
			// ID only (fallback for legacy data or missing names)
			if (person.childCrId.length === 1) {
				frontmatter[prop('children_id')] = person.childCrId[0];
			} else {
				frontmatter[prop('children_id')] = [...person.childCrId]; // Make a copy to avoid reference issues
			}
			logger.debug('children', `Added (id only): ${JSON.stringify(person.childCrId)}`);
		}

		// Debug: Log what was actually set
		logger.debug('children-output', `Person ${person.name}: frontmatter[children_id]=${JSON.stringify(frontmatter[prop('children_id')])}`);
	}

	// Step-father relationship(s) (dual storage)
	if (person.stepfatherCrId && person.stepfatherCrId.length > 0) {
		if (person.stepfatherName && person.stepfatherName.length === person.stepfatherCrId.length) {
			if (person.stepfatherName.length === 1) {
				frontmatter[prop('stepfather')] = `"${createSmartWikilink(person.stepfatherName[0], app)}"`;
				frontmatter[prop('stepfather_id')] = person.stepfatherCrId[0];
			} else {
				frontmatter[prop('stepfather')] = person.stepfatherName.map(s => `"${createSmartWikilink(s, app)}"`);
				frontmatter[prop('stepfather_id')] = person.stepfatherCrId;
			}
			logger.debug('stepfather', `Added (dual): wikilinks=${JSON.stringify(person.stepfatherName)}, ids=${JSON.stringify(person.stepfatherCrId)}`);
		} else {
			if (person.stepfatherCrId.length === 1) {
				frontmatter[prop('stepfather_id')] = person.stepfatherCrId[0];
			} else {
				frontmatter[prop('stepfather_id')] = person.stepfatherCrId;
			}
			logger.debug('stepfather', `Added (id only): ${JSON.stringify(person.stepfatherCrId)}`);
		}
	}

	// Step-mother relationship(s) (dual storage)
	if (person.stepmotherCrId && person.stepmotherCrId.length > 0) {
		if (person.stepmotherName && person.stepmotherName.length === person.stepmotherCrId.length) {
			if (person.stepmotherName.length === 1) {
				frontmatter[prop('stepmother')] = `"${createSmartWikilink(person.stepmotherName[0], app)}"`;
				frontmatter[prop('stepmother_id')] = person.stepmotherCrId[0];
			} else {
				frontmatter[prop('stepmother')] = person.stepmotherName.map(s => `"${createSmartWikilink(s, app)}"`);
				frontmatter[prop('stepmother_id')] = person.stepmotherCrId;
			}
			logger.debug('stepmother', `Added (dual): wikilinks=${JSON.stringify(person.stepmotherName)}, ids=${JSON.stringify(person.stepmotherCrId)}`);
		} else {
			if (person.stepmotherCrId.length === 1) {
				frontmatter[prop('stepmother_id')] = person.stepmotherCrId[0];
			} else {
				frontmatter[prop('stepmother_id')] = person.stepmotherCrId;
			}
			logger.debug('stepmother', `Added (id only): ${JSON.stringify(person.stepmotherCrId)}`);
		}
	}

	// Adoptive father relationship (dual storage)
	if (person.adoptiveFatherCrId) {
		if (person.adoptiveFatherName) {
			frontmatter[prop('adoptive_father')] = `"${createSmartWikilink(person.adoptiveFatherName, app)}"`;
			frontmatter[prop('adoptive_father_id')] = person.adoptiveFatherCrId;
			logger.debug('adoptive_father', `Added (dual): wikilink=${person.adoptiveFatherName}, id=${person.adoptiveFatherCrId}`);
		} else {
			frontmatter[prop('adoptive_father_id')] = person.adoptiveFatherCrId;
			logger.debug('adoptive_father', `Added (id only): ${person.adoptiveFatherCrId}`);
		}
	}

	// Adoptive mother relationship (dual storage)
	if (person.adoptiveMotherCrId) {
		if (person.adoptiveMotherName) {
			frontmatter[prop('adoptive_mother')] = `"${createSmartWikilink(person.adoptiveMotherName, app)}"`;
			frontmatter[prop('adoptive_mother_id')] = person.adoptiveMotherCrId;
			logger.debug('adoptive_mother', `Added (dual): wikilink=${person.adoptiveMotherName}, id=${person.adoptiveMotherCrId}`);
		} else {
			frontmatter[prop('adoptive_mother_id')] = person.adoptiveMotherCrId;
			logger.debug('adoptive_mother', `Added (id only): ${person.adoptiveMotherCrId}`);
		}
	}

	// Gender-neutral parent relationship(s) (dual storage)
	if (person.parentCrId && person.parentCrId.length > 0) {
		if (person.parentName && person.parentName.length === person.parentCrId.length) {
			// Preserve alignment when some entries are unresolved; drop
			// parents_id entirely if every entry is empty (#410)
			const hasAnyResolvedId = person.parentCrId.some(id => id);
			if (person.parentName.length === 1) {
				frontmatter[prop('parents')] = `"${createSmartWikilink(person.parentName[0], app)}"`;
				if (hasAnyResolvedId) {
					frontmatter[prop('parents_id')] = person.parentCrId[0];
				} else {
					delete frontmatter[prop('parents_id')];
				}
			} else {
				frontmatter[prop('parents')] = person.parentName.map(p => `"${createSmartWikilink(p, app)}"`);
				if (hasAnyResolvedId) {
					frontmatter[prop('parents_id')] = person.parentCrId;
				} else {
					delete frontmatter[prop('parents_id')];
				}
			}
			logger.debug('parents', `Added (dual): wikilinks=${JSON.stringify(person.parentName)}, ids=${JSON.stringify(person.parentCrId)}`);
		} else {
			if (person.parentCrId.length === 1) {
				frontmatter[prop('parents_id')] = person.parentCrId[0];
			} else {
				frontmatter[prop('parents_id')] = person.parentCrId;
			}
			logger.debug('parents', `Added (id only): ${JSON.stringify(person.parentCrId)}`);
		}
	}

	// Add media references if available
	if (person.media && person.media.length > 0) {
		// Media is stored as array of wikilinks
		frontmatter[prop('media')] = person.media;
		logger.debug('media', `Added ${person.media.length} media references`);
	}

	// Ensure all essential properties are present (even if empty)
	// This matches the "Add essential properties" feature expectations
	// Property names respect user-configured aliases
	const fatherProp = prop('father');
	const fatherIdProp = prop('father_id');
	if (!(fatherProp in frontmatter) && !(fatherIdProp in frontmatter)) {
		frontmatter[fatherProp] = '';
	}
	const motherProp = prop('mother');
	const motherIdProp = prop('mother_id');
	if (!(motherProp in frontmatter) && !(motherIdProp in frontmatter)) {
		frontmatter[motherProp] = '';
	}
	const spouseProp = prop('spouse');
	const spouseIdProp = prop('spouse_id');
	const hasIndexedSpouse = Object.keys(frontmatter).some(k => /^spouse\d+/.test(k));
	if (!(spouseProp in frontmatter) && !(spouseIdProp in frontmatter) && !hasIndexedSpouse) {
		frontmatter[spouseProp] = [];
	}
	// Note: children property is intentionally not added as empty by default
	// It will be populated when children are actually added via relationships
	const groupNameProp = prop('group_name');
	if (!(groupNameProp in frontmatter)) {
		frontmatter[groupNameProp] = '';
	}

	// Build YAML frontmatter string
	const yamlLines = ['---'];
	for (const [key, value] of Object.entries(frontmatter)) {
		if (Array.isArray(value)) {
			yamlLines.push(`${key}:`);
			for (const item of value) {
				// Handle potential object items in arrays
				const itemStr = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);
				// Quote strings containing wikilinks to prevent YAML parsing as nested arrays
				// [[foo]] in YAML is interpreted as [["foo"]] without quotes
				const needsQuotes = typeof item === 'string' && itemStr.includes('[[') && !itemStr.startsWith('"');
				if (needsQuotes) {
					yamlLines.push(`  - "${itemStr}"`);
				} else {
					yamlLines.push(`  - ${itemStr}`);
				}
			}
		} else if (typeof value === 'object' && value !== null) {
			// Handle nested objects by serializing to JSON
			yamlLines.push(`${key}: ${JSON.stringify(value)}`);
		} else {
			// Quote values that contain wikilinks to prevent YAML parsing issues
			// [[foo]] in YAML is interpreted as nested array [["foo"]]
			const strValue = String(value);
			const needsQuotes = typeof value === 'string' && strValue.includes('[[') && !strValue.startsWith('"');
			if (needsQuotes) {
				yamlLines.push(`${key}: "${strValue}"`);
			} else {
				yamlLines.push(`${key}: ${strValue}`);
			}
		}
	}
	yamlLines.push('---');

	// Build note content
	const bodyLines: string[] = ['', '# Research Notes', '', '', ''];

	// Add dynamic content blocks if requested, in the order specified by dynamicBlockTypes
	if (includeDynamicBlocks && dynamicBlockTypes.length > 0) {
		for (const blockType of dynamicBlockTypes) {
			if (blockType === 'media') {
				bodyLines.push('```charted-roots-media');
				bodyLines.push('columns: 3');
				bodyLines.push('size: medium');
				bodyLines.push('editable: true');
				bodyLines.push('```');
				bodyLines.push('');
			} else if (blockType === 'timeline') {
				bodyLines.push('```charted-roots-timeline');
				bodyLines.push('sort: chronological');
				bodyLines.push('```');
				bodyLines.push('');
			} else if (blockType === 'relationships') {
				bodyLines.push('```charted-roots-relationships');
				bodyLines.push('type: immediate');
				bodyLines.push('```');
				bodyLines.push('');
			}
		}
	}

	// Append notes content (from Gramps import) at the end
	if (person.notesContent) {
		bodyLines.push(person.notesContent);
	}

	const noteContent = [
		...yamlLines,
		...bodyLines
	].join('\n');

	// Format filename based on selected format
	const filename = formatFilename(person.name || 'Untitled Person', filenameFormat);

	// Build full path
	const fullPath = directory
		? normalizePath(`${directory}/${filename}`)
		: normalizePath(filename);

	// Check if file already exists (check both vault index and batch-created paths)
	const createdPaths = options.createdPaths;
	let finalPath = fullPath;
	let counter = 1;
	while (app.vault.getAbstractFileByPath(finalPath) || createdPaths?.has(finalPath)) {
		const baseName = person.name || 'Untitled Person';
		const newFilename = formatFilename(`${baseName} ${counter}`, filenameFormat);
		finalPath = directory
			? normalizePath(`${directory}/${newFilename}`)
			: normalizePath(newFilename);
		counter++;
	}

	// Track this path as created before actually creating the file
	createdPaths?.add(finalPath);

	// Create the file with retry logic for race conditions
	// where the vault index hasn't caught up with recently created files
	const maxRetries = 10;
	let lastError: Error | null = null;
	let file: TFile | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			file = await app.vault.create(finalPath, noteContent);
			break;
		} catch (error) {
			if (error instanceof Error && error.message.includes('File already exists')) {
				// File exists but wasn't detected by vault.getAbstractFileByPath
				// Increment counter and try again
				const baseName = person.name || 'Untitled Person';
				const newFilename = formatFilename(`${baseName} ${counter}`, filenameFormat);
				finalPath = directory
					? normalizePath(`${directory}/${newFilename}`)
					: normalizePath(newFilename);
				createdPaths?.add(finalPath);
				counter++;
				lastError = error;
			} else {
				throw error;
			}
		}
	}

	if (!file) {
		throw lastError || new Error(`Failed to create person note after ${maxRetries} attempts`);
	}

	// Handle bidirectional linking for relationships
	// Use person name or empty string for wikilink display
	const personDisplayName = person.name || '';

	if (addBidirectionalLinks) {
		// Spouse linking
		if (person.spouseCrId && person.spouseCrId.length > 0) {
			for (const spouseCrId of person.spouseCrId) {
				await addBidirectionalSpouseLink(app, spouseCrId, crId, personDisplayName, directory);
			}
		}

		// Parent-child linking: add this person as child to father
		if (person.fatherCrId && person.fatherName) {
			await addChildToParent(app, person.fatherCrId, crId, personDisplayName, directory);
		}

		// Parent-child linking: add this person as child to mother
		if (person.motherCrId && person.motherName) {
			await addChildToParent(app, person.motherCrId, crId, personDisplayName, directory);
		}

		// Reverse parent-child linking: add children to this person's children array
		if (person.childCrId && person.childCrId.length > 0 && person.childName && person.childName.length === person.childCrId.length) {
			for (let i = 0; i < person.childCrId.length; i++) {
				const childCrId = person.childCrId[i];
				// childName is available but not needed for the addParentToChild call
				await addParentToChild(app, childCrId, crId, personDisplayName, person.sex, directory);
			}
		}
	}

	// Open the file if requested
	if (openAfterCreate) {
		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	return file;
}

/**
 * Find a person file by cr_id
 */
export function findPersonByCrId(app: App, crId: string, directory?: string): TFile | null {
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		// Only check files in the specified directory (or root if no directory)
		if (directory && !file.path.startsWith(directory)) {
			continue;
		}

		const cache = app.metadataCache.getFileCache(file);
		if (cache?.frontmatter?.cr_id === crId) {
			return file;
		}
	}

	return null;
}

/**
 * Add bidirectional spouse link to an existing person note
 * Updates the spouse's spouse_id array to include the new person
 */
export async function addBidirectionalSpouseLink(
	app: App,
	spouseCrId: string,
	newSpouseCrId: string,
	newSpouseName: string,
	directory: string
): Promise<void> {
	logger.debug('bidirectional-spouse', `Adding ${newSpouseCrId} (${newSpouseName}) as spouse to ${spouseCrId}`);

	// Find the spouse's file by cr_id
	const spouseFile = findPersonByCrId(app, spouseCrId, directory);

	if (!spouseFile) {
		logger.warn('bidirectional-spouse', `Could not find spouse file with cr_id: ${spouseCrId}`);
		return;
	}

	logger.debug('bidirectional-spouse', `Found spouse file: ${spouseFile.path}`);

	// Get existing spouse data
	const cache = app.metadataCache.getFileCache(spouseFile);
	const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

	// Short-circuit if already linked in either format. Checking both
	// flat and indexed spouse_id keys prevents double-adds when this
	// function runs alongside the bidi linker's own cache-driven sync.
	const flatIds = fm.spouse_id;
	const flatIdsArray = Array.isArray(flatIds)
		? flatIds
		: (typeof flatIds === 'string' && flatIds.length > 0 ? [flatIds] : []);
	if (flatIdsArray.includes(newSpouseCrId)) {
		logger.debug('bidirectional-spouse', `Spouse ${newSpouseCrId} already linked (flat) in ${spouseFile.path}`);
		return;
	}
	for (let i = 1; i <= 10; i++) {
		if (fm[`spouse${i}_id`] === newSpouseCrId) {
			logger.debug('bidirectional-spouse', `Spouse ${newSpouseCrId} already linked (indexed slot ${i}) in ${spouseFile.path}`);
			return;
		}
	}

	// Detect the target's existing frontmatter format. When the target
	// uses indexed `spouseN:` slots we MUST NOT route through
	// updatePersonNote with flat spouse arrays — updatePersonNote clears
	// spouse1..spouse10 before writing the flat form, which silently
	// wipes the target's indexed spouse list (#420 Gap B).
	const targetFormat = detectSpouseTargetFormat(fm);

	if (targetFormat.format === 'indexed') {
		const nextIndex = targetFormat.nextIndex;
		const wikilink = `[[${newSpouseName}]]`;
		await app.fileManager.processFrontMatter(spouseFile, (frontmatter) => {
			frontmatter[`spouse${nextIndex}`] = wikilink;
			frontmatter[`spouse${nextIndex}_id`] = newSpouseCrId;
		});
		logger.info('bidirectional-spouse', `Added indexed spouse link in ${spouseFile.path}`, {
			slot: nextIndex,
			crId: newSpouseCrId
		});
		return;
	}

	// Flat format: preserve the original array-based append path. This
	// relies on updatePersonNote's flat-spouse writer, which is the
	// correct behavior when the target has no indexed slots.
	const existingSpouseNames = fm.spouse;
	const spouseIds: string[] = [...flatIdsArray];
	const spouseNames: string[] = Array.isArray(existingSpouseNames)
		? [...existingSpouseNames]
		: (typeof existingSpouseNames === 'string' && existingSpouseNames.length > 0 ? [existingSpouseNames] : []);
	spouseIds.push(newSpouseCrId);
	spouseNames.push(newSpouseName);

	logger.debug('bidirectional-spouse', `Updating flat spouse arrays: ids=${JSON.stringify(spouseIds)}, names=${JSON.stringify(spouseNames)}`);
	await updatePersonNote(app, spouseFile, {
		spouseCrId: spouseIds,
		spouseName: spouseNames
	});
	logger.info('bidirectional-spouse', `Updated flat spouse link in ${spouseFile.path}`);
}

/**
 * Add this person as a child to a parent's children array
 * Updates the parent's children_id and child fields
 */
export async function addChildToParent(
	app: App,
	parentCrId: string,
	childCrId: string,
	childName: string,
	directory: string
): Promise<void> {
	logger.debug('bidirectional-child', `Adding ${childCrId} (${childName}) as child to parent ${parentCrId}`);

	// Find the parent's file by cr_id
	const parentFile = findPersonByCrId(app, parentCrId, directory);

	if (!parentFile) {
		logger.warn('bidirectional-child', `Could not find parent file with cr_id: ${parentCrId}`);
		return;
	}

	logger.debug('bidirectional-child', `Found parent file: ${parentFile.path}`);

	// Get existing children data
	const cache = app.metadataCache.getFileCache(parentFile);
	const existingChildIds = cache?.frontmatter?.children_id;
	const existingChildNames = cache?.frontmatter?.children;

	// Normalize to arrays
	let childIds: string[] = [];
	let childNames: string[] = [];

	if (existingChildIds) {
		childIds = Array.isArray(existingChildIds) ? [...existingChildIds] : [existingChildIds];
	}
	if (existingChildNames) {
		childNames = Array.isArray(existingChildNames) ? [...existingChildNames] : [existingChildNames];
	}

	// Add new child if not already present
	if (!childIds.includes(childCrId)) {
		childIds.push(childCrId);
		childNames.push(childName);

		logger.debug('bidirectional-child', `Updating children arrays: ids=${JSON.stringify(childIds)}, names=${JSON.stringify(childNames)}`);

		// Use updatePersonNote to properly handle dual storage
		await updatePersonNote(app, parentFile, {
			childCrId: childIds,
			childName: childNames
		});

		logger.info('bidirectional-child', `Updated children link in ${parentFile.path}`);
	} else {
		logger.debug('bidirectional-child', `Child ${childCrId} already linked in ${parentFile.path}`);
	}
}

/**
 * Add a parent relationship to a child's father_id/mother_id field
 * Updates the child's father or mother field based on parent's sex
 * Also automatically links the parent's spouse as the other parent
 */
export async function addParentToChild(
	app: App,
	childCrId: string,
	parentCrId: string,
	parentName: string,
	parentSex: string | undefined,
	directory: string
): Promise<void> {
	logger.debug('bidirectional-parent', `Adding ${parentCrId} (${parentName}) as parent to child ${childCrId}`);

	// Find the child's file by cr_id
	const childFile = findPersonByCrId(app, childCrId, directory);

	if (!childFile) {
		logger.warn('bidirectional-parent', `Could not find child file with cr_id: ${childCrId}`);
		return;
	}

	logger.debug('bidirectional-parent', `Found child file: ${childFile.path}`);

	// Get existing parent data
	const cache = app.metadataCache.getFileCache(childFile);
	const existingFatherId = cache?.frontmatter?.father_id;
	const existingMotherId = cache?.frontmatter?.mother_id;

	// Determine parent type from sex (default to father if unknown)
	const isMother = parentSex === 'female' || parentSex === 'F';

	// Check if parent is already set
	if (isMother && existingMotherId === parentCrId) {
		logger.debug('bidirectional-parent', `Mother ${parentCrId} already linked in ${childFile.path}`);
		return;
	}
	if (!isMother && existingFatherId === parentCrId) {
		logger.debug('bidirectional-parent', `Father ${parentCrId} already linked in ${childFile.path}`);
		return;
	}

	// Add parent relationship
	if (isMother) {
		logger.debug('bidirectional-parent', `Setting mother: ${parentName} (${parentCrId})`);
		await updatePersonNote(app, childFile, {
			motherCrId: parentCrId,
			motherName: parentName
		});
	} else {
		logger.debug('bidirectional-parent', `Setting father: ${parentName} (${parentCrId})`);
		await updatePersonNote(app, childFile, {
			fatherCrId: parentCrId,
			fatherName: parentName
		});
	}

	logger.info('bidirectional-parent', `Updated parent link in ${childFile.path}`);

	// Also link the parent's spouse as the other parent (if they have one)
	const parentFile = findPersonByCrId(app, parentCrId, directory);
	if (parentFile) {
		const parentCache = app.metadataCache.getFileCache(parentFile);
		const spouseIds = parentCache?.frontmatter?.spouse_id;
		const spouseNames = parentCache?.frontmatter?.spouse;

		logger.debug('bidirectional-parent', `Checking for spouse - spouseIds: ${JSON.stringify(spouseIds)}, spouseNames: ${JSON.stringify(spouseNames)}`);

		if (spouseIds) {
			// Normalize to arrays
			const spouseIdArray = Array.isArray(spouseIds) ? spouseIds : [spouseIds];
			const spouseNameArray = Array.isArray(spouseNames) ? spouseNames : spouseNames ? [spouseNames] : [];

			// Link the first spouse as the other parent
			if (spouseIdArray.length > 0 && spouseNameArray.length > 0) {
				const spouseCrId = spouseIdArray[0];
				const spouseName = spouseNameArray[0];

				logger.debug('bidirectional-parent', `Also linking spouse ${spouseCrId} (${spouseName}) as other parent`);

				// Set the spouse as the other parent on the child
				if (isMother) {
					// Parent is mother, so spouse is father
					if (!existingFatherId) {
						await updatePersonNote(app, childFile, {
							fatherCrId: spouseCrId,
							fatherName: spouseName
						});
						logger.info('bidirectional-parent', `Set spouse as father in ${childFile.path}`);
					} else {
						logger.debug('bidirectional-parent', `Skipping father link - already set to ${existingFatherId}`);
					}
				} else {
					// Parent is father, so spouse is mother
					if (!existingMotherId) {
						await updatePersonNote(app, childFile, {
							motherCrId: spouseCrId,
							motherName: spouseName
						});
						logger.info('bidirectional-parent', `Set spouse as mother in ${childFile.path}`);
					} else {
						logger.debug('bidirectional-parent', `Skipping mother link - already set to ${existingMotherId}`);
					}
				}

				// Add child to spouse's children array
				logger.debug('bidirectional-parent', `Adding child ${childCrId} to spouse ${spouseCrId}`);
				await addChildToParent(app, spouseCrId, childCrId, cache?.frontmatter?.name || childFile.basename, directory);
			} else {
				logger.debug('bidirectional-parent', `Spouse arrays empty or mismatched lengths`);
			}
		} else {
			logger.debug('bidirectional-parent', `Parent ${parentCrId} has no spouse`);
		}
	} else {
		logger.warn('bidirectional-parent', `Could not find parent file for cr_id: ${parentCrId}`);
	}
}

// Helpers for collecting a set of crIds from a spouse-related frontmatter.
// Handles both the indexed format (spouse1, spouse2, ...) and the legacy array
// (spouse_id). Returned Set is deduped and stringified.
function collectSpouseIds(fm: Record<string, unknown> | undefined): Set<string> {
	const ids = new Set<string>();
	if (!fm) return ids;
	for (let i = 1; i <= 10; i++) {
		const id = fm[`spouse${i}_id`];
		if (id) ids.add(String(id));
	}
	const legacy = fm.spouse_id;
	if (legacy !== undefined && legacy !== null) {
		if (Array.isArray(legacy)) {
			for (const id of legacy) ids.add(String(id));
		} else {
			ids.add(String(legacy));
		}
	}
	return ids;
}

function collectIdsFromField(fm: Record<string, unknown> | undefined, key: string): Set<string> {
	const ids = new Set<string>();
	if (!fm) return ids;
	const raw = fm[key];
	if (raw === undefined || raw === null) return ids;
	if (Array.isArray(raw)) {
		for (const id of raw) ids.add(String(id));
	} else {
		ids.add(String(raw));
	}
	return ids;
}

/**
 * Remove `childCrId` from the parent's `children` / `children_id` arrays.
 * No-op if the child isn't currently linked, so this is safe to call
 * repeatedly and cycle-safe via `skipReverseUnlink`.
 */
export async function removeChildFromParent(
	app: App,
	parentCrId: string,
	childCrId: string,
	directory: string
): Promise<void> {
	const parentFile = findPersonByCrId(app, parentCrId, directory);
	if (!parentFile) return;
	const cache = app.metadataCache.getFileCache(parentFile);
	const existingIds = cache?.frontmatter?.children_id;
	const existingNames = cache?.frontmatter?.children;
	const idArray = existingIds === undefined || existingIds === null
		? []
		: (Array.isArray(existingIds) ? [...existingIds] : [existingIds]).map(String);
	const nameArray = existingNames === undefined || existingNames === null
		? []
		: (Array.isArray(existingNames) ? [...existingNames] : [existingNames]).map(String);
	const idx = idArray.indexOf(childCrId);
	if (idx === -1) return;
	idArray.splice(idx, 1);
	if (idx < nameArray.length) nameArray.splice(idx, 1);
	logger.debug('reverse-unlink', `Removing child ${childCrId} from parent ${parentCrId}`);
	await updatePersonNote(app, parentFile, {
		childCrId: idArray,
		childName: nameArray
	}, { skipReverseUnlink: true });
}

/**
 * Remove `childCrId` from the adoptive parent's `adopted_child` arrays.
 */
export async function removeAdoptedChildFromParent(
	app: App,
	parentCrId: string,
	childCrId: string,
	directory: string
): Promise<void> {
	const parentFile = findPersonByCrId(app, parentCrId, directory);
	if (!parentFile) return;
	await app.fileManager.processFrontMatter(parentFile, (fm) => {
		const existingIds = fm.adopted_child_id;
		const existingNames = fm.adopted_child;
		const idArray = existingIds === undefined || existingIds === null
			? []
			: (Array.isArray(existingIds) ? [...existingIds] : [existingIds]).map(String);
		const nameArray = existingNames === undefined || existingNames === null
			? []
			: (Array.isArray(existingNames) ? [...existingNames] : [existingNames]).map(String);
		const idx = idArray.indexOf(childCrId);
		if (idx === -1) return;
		idArray.splice(idx, 1);
		if (idx < nameArray.length) nameArray.splice(idx, 1);
		if (idArray.length === 0) {
			delete fm.adopted_child;
			delete fm.adopted_child_id;
		} else {
			fm.adopted_child_id = idArray.length === 1 ? idArray[0] : idArray;
			fm.adopted_child = nameArray.length === 1 ? nameArray[0] : nameArray;
		}
		logger.debug('reverse-unlink', `Removed adopted child ${childCrId} from parent ${parentCrId}`);
	});
}

/**
 * Remove `thisPersonCrId` from a former spouse's spouse arrays, handling
 * both indexed (`spouseN` / `spouseN_id` + marriage metadata) and legacy
 * array (`spouse` / `spouse_id`) formats.
 */
export async function removeSpouseLink(
	app: App,
	formerSpouseCrId: string,
	thisPersonCrId: string,
	directory: string
): Promise<void> {
	const spouseFile = findPersonByCrId(app, formerSpouseCrId, directory);
	if (!spouseFile) return;
	const cache = app.metadataCache.getFileCache(spouseFile);
	const fm = cache?.frontmatter;
	if (!fm) return;

	// Indexed format
	let foundIndexed = false;
	for (let i = 1; i <= 10; i++) {
		if (fm[`spouse${i}_id`] && String(fm[`spouse${i}_id`]) === thisPersonCrId) {
			foundIndexed = true;
			break;
		}
	}
	if (foundIndexed) {
		const surviving: SpouseMetadata[] = [];
		for (let i = 1; i <= 10; i++) {
			const id = fm[`spouse${i}_id`];
			if (!id) continue;
			if (String(id) === thisPersonCrId) continue;
			const linkRaw = fm[`spouse${i}`];
			const name = extractWikilinkName(linkRaw) || String(id);
			surviving.push({
				crId: String(id),
				name,
				marriageDate: fm[`spouse${i}_marriage_date`] as string | undefined,
				marriageLocation: fm[`spouse${i}_marriage_location`] as string | undefined,
				marriageStatus: fm[`spouse${i}_marriage_status`] as SpouseMetadata['marriageStatus'],
				divorceDate: fm[`spouse${i}_divorce_date`] as string | undefined
			});
		}
		logger.debug('reverse-unlink', `Removing spouse ${thisPersonCrId} from ${formerSpouseCrId} (indexed)`);
		await updatePersonNote(app, spouseFile, {
			spouseCrId: surviving.map(s => s.crId),
			spouseName: surviving.map(s => s.name),
			spouseMetadata: surviving
		}, { skipReverseUnlink: true });
		return;
	}

	// Legacy array format
	const existingIds = fm.spouse_id;
	const existingNames = fm.spouse;
	const idArray = existingIds === undefined || existingIds === null
		? []
		: (Array.isArray(existingIds) ? [...existingIds] : [existingIds]).map(String);
	const nameArray = existingNames === undefined || existingNames === null
		? []
		: (Array.isArray(existingNames) ? [...existingNames] : [existingNames]).map((n: unknown) => extractWikilinkName(n) || String(n));
	const idx = idArray.indexOf(thisPersonCrId);
	if (idx === -1) return;
	idArray.splice(idx, 1);
	if (idx < nameArray.length) nameArray.splice(idx, 1);
	logger.debug('reverse-unlink', `Removing spouse ${thisPersonCrId} from ${formerSpouseCrId} (legacy)`);
	await updatePersonNote(app, spouseFile, {
		spouseCrId: idArray,
		spouseName: nameArray
	}, { skipReverseUnlink: true });
}

/**
 * Extract the plain-text name from a wikilink value (`[[Name]]` or `[[Name|Alias]]`).
 * Returns `undefined` for missing/empty values. Used by reverse-unlink helpers.
 */
function extractWikilinkName(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const str = String(value);
	if (!str) return undefined;
	const match = str.match(/\[\[([^\]]+)\]\]/);
	const inner = match ? match[1] : str;
	return inner.split('|')[0].trim();
}

/**
 * Clear any reference to `formerParentCrId` from the child's parent-like
 * fields (father / mother / adoptive / gender-neutral parents).
 */
export async function removeParentFromChild(
	app: App,
	childCrId: string,
	formerParentCrId: string,
	directory: string
): Promise<void> {
	const childFile = findPersonByCrId(app, childCrId, directory);
	if (!childFile) return;
	await app.fileManager.processFrontMatter(childFile, (fm) => {
		let changed = false;
		if (fm.father_id && String(fm.father_id) === formerParentCrId) {
			delete fm.father;
			delete fm.father_id;
			changed = true;
		}
		if (fm.mother_id && String(fm.mother_id) === formerParentCrId) {
			delete fm.mother;
			delete fm.mother_id;
			changed = true;
		}
		if (fm.adoptive_father_id && String(fm.adoptive_father_id) === formerParentCrId) {
			delete fm.adoptive_father;
			delete fm.adoptive_father_id;
			changed = true;
		}
		if (fm.adoptive_mother_id && String(fm.adoptive_mother_id) === formerParentCrId) {
			delete fm.adoptive_mother;
			delete fm.adoptive_mother_id;
			changed = true;
		}
		if (fm.parents_id) {
			const ids = Array.isArray(fm.parents_id) ? [...fm.parents_id] : [fm.parents_id];
			const names = Array.isArray(fm.parents)
				? [...fm.parents]
				: fm.parents ? [fm.parents] : [];
			const idx = ids.map(String).indexOf(formerParentCrId);
			if (idx !== -1) {
				ids.splice(idx, 1);
				if (idx < names.length) names.splice(idx, 1);
				if (ids.length === 0) {
					delete fm.parents;
					delete fm.parents_id;
				} else {
					fm.parents_id = ids.length === 1 ? ids[0] : ids;
					fm.parents = names.length === 1 ? names[0] : names;
				}
				changed = true;
			}
		}
		if (changed) {
			logger.debug('reverse-unlink', `Removed parent ${formerParentCrId} from child ${childCrId}`);
		}
	});
}

/**
 * Update an existing person note's frontmatter
 *
 * @param app - Obsidian app instance
 * @param file - The file to update
 * @param person - Person data to update
 * @param options - Optional flags. Set `skipReverseUnlink: true` when called
 *   from one of the reverse-unlink helpers to prevent cascading recursion
 *   through the other side of the relationship (#405).
 */
export async function updatePersonNote(
	app: App,
	file: TFile,
	person: Partial<PersonData>,
	options?: { skipReverseUnlink?: boolean }
): Promise<void> {
	const skipReverseUnlink = options?.skipReverseUnlink === true;

	// Capture before-state so we can reverse-unlink relationships the caller
	// is clearing (#405). Must be read before processFrontMatter mutates the
	// file.
	const beforeCache = app.metadataCache.getFileCache(file);
	const beforeFm = beforeCache?.frontmatter as Record<string, unknown> | undefined;
	const thisCrId = beforeFm?.cr_id ? String(beforeFm.cr_id) : undefined;
	const directory = file.parent?.path || '';
	const beforeFatherId = beforeFm?.father_id ? String(beforeFm.father_id) : undefined;
	const beforeMotherId = beforeFm?.mother_id ? String(beforeFm.mother_id) : undefined;
	const beforeAdoptiveFatherId = beforeFm?.adoptive_father_id ? String(beforeFm.adoptive_father_id) : undefined;
	const beforeAdoptiveMotherId = beforeFm?.adoptive_mother_id ? String(beforeFm.adoptive_mother_id) : undefined;
	const beforeSpouseIds = collectSpouseIds(beforeFm);
	const beforeChildIds = collectIdsFromField(beforeFm, 'children_id');

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		// Update basic fields if provided
		if (person.name !== undefined) frontmatter.name = person.name;
		if (person.personType !== undefined) {
			if (person.personType) {
				frontmatter.personType = person.personType;
			} else {
				delete frontmatter.personType;
			}
		}
		if (person.birthDate !== undefined) frontmatter.born = person.birthDate || '';
		if (person.deathDate !== undefined) frontmatter.died = person.deathDate || '';
		if (person.sex !== undefined) {
			if (person.sex) {
				frontmatter.sex = person.sex;
			} else {
				delete frontmatter.sex;
			}
		}
		if (person.pronouns !== undefined) {
			if (person.pronouns && person.pronouns.length > 0) {
				frontmatter.pronouns = person.pronouns;
			} else {
				delete frontmatter.pronouns;
			}
		}
		if (person.cr_living !== undefined) {
			if (typeof person.cr_living === 'boolean') {
				frontmatter.cr_living = person.cr_living;
			} else {
				delete frontmatter.cr_living;
			}
		}
		if (person.nickname !== undefined) {
			if (person.nickname) {
				frontmatter.nickname = person.nickname;
			} else {
				delete frontmatter.nickname;
			}
		}
		// Name components (#174, #192)
		if (person.givenName !== undefined) {
			if (person.givenName) {
				frontmatter.given_name = person.givenName;
			} else {
				delete frontmatter.given_name;
			}
		}
		if (person.surnames !== undefined) {
			if (person.surnames && person.surnames.length > 0) {
				frontmatter.surnames = person.surnames;
			} else {
				delete frontmatter.surnames;
			}
		}
		if (person.maidenName !== undefined) {
			if (person.maidenName) {
				frontmatter.maiden_name = person.maidenName;
			} else {
				delete frontmatter.maiden_name;
			}
		}
		if (person.marriedNames !== undefined) {
			if (person.marriedNames && person.marriedNames.length > 0) {
				frontmatter.married_names = person.marriedNames;
			} else {
				delete frontmatter.married_names;
			}
		}
		if (person.occupation !== undefined) {
			if (person.occupation) {
				frontmatter.occupation = person.occupation;
			} else {
				delete frontmatter.occupation;
			}
		}
		// Adoption date — for the adoptee (#396)
		if (person.adoptionDate !== undefined) {
			if (person.adoptionDate) {
				frontmatter.adoption_date = person.adoptionDate;
			} else {
				delete frontmatter.adoption_date;
			}
		}
		if (person.researchLevel !== undefined) {
			if (person.researchLevel !== null) {
				frontmatter.research_level = person.researchLevel;
			} else {
				delete frontmatter.research_level;
			}
		}
		if (person.needsResearch !== undefined) {
			if (Array.isArray(person.needsResearch) && person.needsResearch.length > 0) {
				frontmatter.needs_research = person.needsResearch;
			} else {
				delete frontmatter.needs_research;
			}
		}
		// DNA tracking fields
		if (person.dnaSharedCm !== undefined) {
			if (typeof person.dnaSharedCm === 'number') {
				frontmatter.dna_shared_cm = person.dnaSharedCm;
			} else {
				delete frontmatter.dna_shared_cm;
			}
		}
		if (person.dnaTestingCompany !== undefined) {
			if (person.dnaTestingCompany) {
				frontmatter.dna_testing_company = person.dnaTestingCompany;
			} else {
				delete frontmatter.dna_testing_company;
			}
		}
		if (person.dnaKitId !== undefined) {
			if (person.dnaKitId) {
				frontmatter.dna_kit_id = person.dnaKitId;
			} else {
				delete frontmatter.dna_kit_id;
			}
		}
		if (person.dnaMatchType !== undefined) {
			if (person.dnaMatchType) {
				frontmatter.dna_match_type = person.dnaMatchType;
			} else {
				delete frontmatter.dna_match_type;
			}
		}
		if (person.dnaEndogamyFlag !== undefined) {
			if (typeof person.dnaEndogamyFlag === 'boolean') {
				frontmatter.dna_endogamy_flag = person.dnaEndogamyFlag;
			} else {
				delete frontmatter.dna_endogamy_flag;
			}
		}
		if (person.dnaNotes !== undefined) {
			if (person.dnaNotes) {
				frontmatter.dna_notes = person.dnaNotes;
			} else {
				delete frontmatter.dna_notes;
			}
		}
		// Handle birth place (dual storage: wikilink + ID)
		if (person.birthPlaceCrId !== undefined || person.birthPlaceName !== undefined) {
			if (person.birthPlaceCrId && person.birthPlaceName) {
				frontmatter.birth_place = `${createSmartWikilink(person.birthPlaceName, app)}`;
				frontmatter.birth_place_id = person.birthPlaceCrId;
			} else if (person.birthPlaceName) {
				frontmatter.birth_place = `${createSmartWikilink(person.birthPlaceName, app)}`;
				delete frontmatter.birth_place_id;
			} else {
				// Clear birth place
				delete frontmatter.birth_place;
				delete frontmatter.birth_place_id;
			}
		} else if (person.birthPlace !== undefined) {
			// Legacy: plain text birth place
			if (person.birthPlace) {
				frontmatter.birth_place = person.birthPlace;
			} else {
				delete frontmatter.birth_place;
			}
		}

		// Handle death place (dual storage: wikilink + ID)
		if (person.deathPlaceCrId !== undefined || person.deathPlaceName !== undefined) {
			if (person.deathPlaceCrId && person.deathPlaceName) {
				frontmatter.death_place = `${createSmartWikilink(person.deathPlaceName, app)}`;
				frontmatter.death_place_id = person.deathPlaceCrId;
			} else if (person.deathPlaceName) {
				frontmatter.death_place = `${createSmartWikilink(person.deathPlaceName, app)}`;
				delete frontmatter.death_place_id;
			} else {
				// Clear death place
				delete frontmatter.death_place;
				delete frontmatter.death_place_id;
			}
		} else if (person.deathPlace !== undefined) {
			// Legacy: plain text death place
			if (person.deathPlace) {
				frontmatter.death_place = person.deathPlace;
			} else {
				delete frontmatter.death_place;
			}
		}

		// Handle collection
		if (person.collection !== undefined) {
			if (person.collection) {
				frontmatter.collection = person.collection;
			} else {
				delete frontmatter.collection;
			}
		}

		// Handle universe
		if (person.universe !== undefined) {
			if (person.universe) {
				frontmatter.universe = person.universe;
			} else {
				delete frontmatter.universe;
			}
		}

		// Handle sources (dual storage: wikilinks + _id array)
		if (person.sourceCrIds !== undefined || person.sourceNames !== undefined) {
			if (person.sourceCrIds && person.sourceCrIds.length > 0 && person.sourceNames && person.sourceNames.length > 0) {
				frontmatter.sources = person.sourceNames.map(name => `${createSmartWikilink(name, app)}`);
				frontmatter.sources_id = person.sourceCrIds;
			} else {
				// Clear sources
				delete frontmatter.sources;
				delete frontmatter.sources_id;
			}
		}

		// Handle fact-level source tracking (sourced_* properties)
		if (person.sourcedFacts !== undefined) {
			for (const prop of SOURCED_PROPERTY_NAMES) {
				const names = person.sourcedFacts[prop];
				if (names && names.length > 0) {
					frontmatter[prop] = names.map(name => `${createSmartWikilink(name, app)}`);
				} else {
					delete frontmatter[prop];
				}
			}
		}

		// Handle father relationship
		if (person.fatherCrId !== undefined || person.fatherName !== undefined) {
			if (person.fatherCrId && person.fatherName) {
				frontmatter.father = `${createSmartWikilink(person.fatherName, app)}`;
				frontmatter.father_id = person.fatherCrId;
			} else if (person.fatherCrId) {
				frontmatter.father_id = person.fatherCrId;
			} else if (person.fatherName) {
				frontmatter.father = `${createSmartWikilink(person.fatherName, app)}`;
			} else {
				// Clear father
				delete frontmatter.father;
				delete frontmatter.father_id;
			}
		}

		// Handle mother relationship
		if (person.motherCrId !== undefined || person.motherName !== undefined) {
			if (person.motherCrId && person.motherName) {
				frontmatter.mother = `${createSmartWikilink(person.motherName, app)}`;
				frontmatter.mother_id = person.motherCrId;
			} else if (person.motherCrId) {
				frontmatter.mother_id = person.motherCrId;
			} else if (person.motherName) {
				frontmatter.mother = `${createSmartWikilink(person.motherName, app)}`;
			} else {
				// Clear mother
				delete frontmatter.mother;
				delete frontmatter.mother_id;
			}
		}

		// Handle adoptive father relationship (#390)
		if (person.adoptiveFatherCrId !== undefined || person.adoptiveFatherName !== undefined) {
			if (person.adoptiveFatherCrId && person.adoptiveFatherName) {
				frontmatter.adoptive_father = `${createSmartWikilink(person.adoptiveFatherName, app)}`;
				frontmatter.adoptive_father_id = person.adoptiveFatherCrId;
			} else if (person.adoptiveFatherCrId) {
				frontmatter.adoptive_father_id = person.adoptiveFatherCrId;
			} else if (person.adoptiveFatherName) {
				frontmatter.adoptive_father = `${createSmartWikilink(person.adoptiveFatherName, app)}`;
			} else {
				// Clear adoptive father
				delete frontmatter.adoptive_father;
				delete frontmatter.adoptive_father_id;
			}
		}

		// Handle adoptive mother relationship (#390)
		if (person.adoptiveMotherCrId !== undefined || person.adoptiveMotherName !== undefined) {
			if (person.adoptiveMotherCrId && person.adoptiveMotherName) {
				frontmatter.adoptive_mother = `${createSmartWikilink(person.adoptiveMotherName, app)}`;
				frontmatter.adoptive_mother_id = person.adoptiveMotherCrId;
			} else if (person.adoptiveMotherCrId) {
				frontmatter.adoptive_mother_id = person.adoptiveMotherCrId;
			} else if (person.adoptiveMotherName) {
				frontmatter.adoptive_mother = `${createSmartWikilink(person.adoptiveMotherName, app)}`;
			} else {
				// Clear adoptive mother
				delete frontmatter.adoptive_mother;
				delete frontmatter.adoptive_mother_id;
			}
		}

		// Handle step-father relationship (#429). PersonData sends arrays
		// because createPersonNote supports multi-step parents, but the Edit
		// Person modal's step-parent UI is single-slot, so arrays are always
		// length 0 (cleared) or 1 (one linked person) in the edit path.
		if (person.stepfatherCrId !== undefined || person.stepfatherName !== undefined) {
			const ids = person.stepfatherCrId;
			const names = person.stepfatherName;
			if (ids && ids.length > 0 && names && names.length === ids.length) {
				if (ids.length === 1) {
					frontmatter.stepfather = createSmartWikilink(names[0], app);
					frontmatter.stepfather_id = ids[0];
				} else {
					frontmatter.stepfather = names.map(n => createSmartWikilink(n, app));
					frontmatter.stepfather_id = ids;
				}
			} else {
				// Clear step-father (user unlinked or mismatched arrays)
				delete frontmatter.stepfather;
				delete frontmatter.stepfather_id;
			}
		}

		// Handle step-mother relationship (#429). Same contract as step-father
		// above — arrays on the payload, but the modal's single-slot UI means
		// the array length is 0 or 1 in practice.
		if (person.stepmotherCrId !== undefined || person.stepmotherName !== undefined) {
			const ids = person.stepmotherCrId;
			const names = person.stepmotherName;
			if (ids && ids.length > 0 && names && names.length === ids.length) {
				if (ids.length === 1) {
					frontmatter.stepmother = createSmartWikilink(names[0], app);
					frontmatter.stepmother_id = ids[0];
				} else {
					frontmatter.stepmother = names.map(n => createSmartWikilink(n, app));
					frontmatter.stepmother_id = ids;
				}
			} else {
				// Clear step-mother (user unlinked or mismatched arrays)
				delete frontmatter.stepmother;
				delete frontmatter.stepmother_id;
			}
		}

		// Handle spouse relationships - use indexed format with metadata when available (#204)
		if (person.spouseCrId !== undefined || person.spouseName !== undefined || person.spouseMetadata !== undefined) {
			// Check if any spouse has metadata
			const hasMetadata = person.spouseMetadata?.some(s =>
				s.marriageDate || s.marriageLocation || s.marriageStatus || s.divorceDate
			);

			// First, clear any existing indexed spouse properties
			for (let i = 1; i <= 10; i++) {
				delete frontmatter[`spouse${i}`];
				delete frontmatter[`spouse${i}_id`];
				delete frontmatter[`spouse${i}_marriage_date`];
				delete frontmatter[`spouse${i}_marriage_location`];
				delete frontmatter[`spouse${i}_marriage_location_id`];
				delete frontmatter[`spouse${i}_marriage_status`];
				delete frontmatter[`spouse${i}_divorce_date`];
			}

			if (hasMetadata && person.spouseMetadata && person.spouseMetadata.length > 0) {
				// Write indexed spouse format with metadata
				for (let i = 0; i < person.spouseMetadata.length; i++) {
					const spouse = person.spouseMetadata[i];
					const idx = i + 1;

					frontmatter[`spouse${idx}`] = createSmartWikilink(spouse.name, app);
					frontmatter[`spouse${idx}_id`] = spouse.crId;

					if (spouse.marriageDate) {
						frontmatter[`spouse${idx}_marriage_date`] = spouse.marriageDate;
					}
					if (spouse.marriageLocation) {
						if (spouse.marriageLocationCrId) {
							frontmatter[`spouse${idx}_marriage_location`] = createSmartWikilink(spouse.marriageLocation, app);
							frontmatter[`spouse${idx}_marriage_location_id`] = spouse.marriageLocationCrId;
						} else {
							frontmatter[`spouse${idx}_marriage_location`] = spouse.marriageLocation;
							delete frontmatter[`spouse${idx}_marriage_location_id`];
						}
					}
					if (spouse.marriageStatus) {
						frontmatter[`spouse${idx}_marriage_status`] = spouse.marriageStatus;
					}
					if (spouse.divorceDate) {
						frontmatter[`spouse${idx}_divorce_date`] = spouse.divorceDate;
					}
				}
				// Clear legacy arrays when using indexed format
				delete frontmatter.spouse;
				delete frontmatter.spouse_id;
				delete frontmatter.spouses;
				logger.debug('update-spouse', `Set indexed: ${person.spouseMetadata.length} spouses with metadata`);
			} else if (person.spouseCrId && person.spouseCrId.length > 0) {
				// Legacy array format (no metadata). The align/prune logic —
				// including #410 Option 2's empty-slot preservation and all-
				// empty pruning — lives in computeRelationshipArrayPatch so
				// it can be unit-tested without the writer's runtime deps.
				const patch = computeRelationshipArrayPatch(
					person.spouseName,
					person.spouseCrId,
					(name) => createSmartWikilink(name, app)
				);
				applyRelationshipArrayPatch(frontmatter, 'spouse', 'spouse_id', patch);
				if (patch.mismatched) {
					logger.warn('update-spouse', `Mismatched spouse arrays: ${person.spouseCrId.length} IDs, ${person.spouseName?.length ?? 0} names. Cleared spouse field.`);
				}
			} else {
				// Clear spouse
				delete frontmatter.spouse;
				delete frontmatter.spouse_id;
				delete frontmatter.spouses;
			}
		}

		// Handle children relationships (use 'children' plural to match 'children_id')
		if (person.childCrId !== undefined || person.childName !== undefined) {
			if (person.childCrId && person.childCrId.length > 0) {
				// Same align/prune logic as the spouse block above — see
				// computeRelationshipArrayPatch for the full contract.
				const patch = computeRelationshipArrayPatch(
					person.childName,
					person.childCrId,
					(name) => createSmartWikilink(name, app)
				);
				applyRelationshipArrayPatch(frontmatter, 'children', 'children_id', patch);
				if (patch.mismatched) {
					logger.warn('update-children', `Mismatched children arrays: ${person.childCrId.length} IDs, ${person.childName?.length ?? 0} names. Cleared children field.`);
				}
				// Remove legacy 'child' property if present
				delete frontmatter.child;
				logger.debug('update-children', `Set children: ${JSON.stringify(person.childName)}, ids: ${JSON.stringify(person.childCrId)}`);
			} else {
				// Clear children (both new and legacy property names)
				delete frontmatter.children;
				delete frontmatter.child;
				delete frontmatter.children_id;
				logger.debug('update-children', 'Cleared children');
			}
		}

		logger.debug('update-person', `Updated frontmatter for ${file.path}`);
	});

	// Reverse-unlink pass: when the caller has cleared a relationship field,
	// propagate the clear to the other side's note so the link doesn't dangle
	// and get resurrected by reverse-inference (#405). Skipped entirely when
	// `skipReverseUnlink` is set (the reverse-unlink helpers themselves call
	// updatePersonNote with that flag to terminate the cascade).
	if (!skipReverseUnlink && thisCrId) {
		// Parent singletons (father, mother, adoptive father/mother) cleared on
		// this child-side note → remove this person from the parent's children
		// (or adopted_child) list on the parent's note.
		if (beforeFatherId && person.fatherCrId === '' && !person.fatherName) {
			await removeChildFromParent(app, beforeFatherId, thisCrId, directory);
		}
		if (beforeMotherId && person.motherCrId === '' && !person.motherName) {
			await removeChildFromParent(app, beforeMotherId, thisCrId, directory);
		}
		if (beforeAdoptiveFatherId && person.adoptiveFatherCrId === '' && !person.adoptiveFatherName) {
			await removeAdoptedChildFromParent(app, beforeAdoptiveFatherId, thisCrId, directory);
		}
		if (beforeAdoptiveMotherId && person.adoptiveMotherCrId === '' && !person.adoptiveMotherName) {
			await removeAdoptedChildFromParent(app, beforeAdoptiveMotherId, thisCrId, directory);
		}

		// Spouses: any spouse present before that isn't present now → unlink.
		if (person.spouseCrId !== undefined || person.spouseMetadata !== undefined) {
			const afterIds = new Set<string>();
			if (person.spouseMetadata) {
				for (const s of person.spouseMetadata) if (s.crId) afterIds.add(s.crId);
			}
			if (person.spouseCrId) {
				for (const id of person.spouseCrId) if (id) afterIds.add(id);
			}
			for (const formerId of beforeSpouseIds) {
				if (!afterIds.has(formerId)) {
					await removeSpouseLink(app, formerId, thisCrId, directory);
				}
			}
		}

		// Children: any child present before that isn't present now → clear
		// this person from that child's parent fields.
		if (person.childCrId !== undefined) {
			const afterIds = new Set<string>();
			if (person.childCrId) {
				for (const id of person.childCrId) if (id) afterIds.add(id);
			}
			for (const formerId of beforeChildIds) {
				if (!afterIds.has(formerId)) {
					await removeParentFromChild(app, formerId, thisCrId, directory);
				}
			}
		}
	}
}

/**
 * Format a filename based on the selected format option
 *
 * @param name - The name to format
 * @param format - The filename format to use
 * @returns Formatted filename with .md extension
 */
function formatFilename(name: string, format: FilenameFormat): string {
	// First sanitize illegal filesystem characters and problematic wikilink characters
	const sanitized = name
		.replace(/[\\/:*?"<>|()[\]{}]/g, '')
		.trim();

	// Fallback to 'Unknown' if sanitization results in empty string
	const safeName = sanitized || 'Unknown';

	switch (format) {
		case 'kebab-case':
			return safeName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
				.substring(0, 100) + '.md';

		case 'snake_case':
			return safeName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_+|_+$/g, '')
				.substring(0, 100) + '.md';

		case 'original':
		default:
			// Keep original casing and spaces, just sanitize
			return safeName.replace(/\s+/g, ' ').substring(0, 100) + '.md';
	}
}
