/**
 * GEDCOM Quality Analyzer
 *
 * Analyzes parsed GEDCOM data for data quality issues before import.
 * Detects date inconsistencies, relationship problems, and place name variants.
 */

import type { GedcomDataV2, GedcomIndividualV2, GedcomFamilyV2 } from './gedcom-types';
import { PLACE_NAME_VARIANTS } from '../ui/standardize-place-variants-modal';

// ============================================================================
// Types
// ============================================================================

/**
 * Severity levels for quality issues
 */
export type QualityIssueSeverity = 'error' | 'warning' | 'info';

/**
 * Categories of quality issues
 */
export type QualityIssueCategory =
	| 'date'
	| 'relationship'
	| 'data'
	| 'place'
	| 'reference';

/**
 * A single quality issue found in GEDCOM data
 */
export interface GedcomQualityIssue {
	/** Unique code for this issue type */
	code: string;
	/** Human-readable description */
	message: string;
	/** Severity level */
	severity: QualityIssueSeverity;
	/** Category for grouping */
	category: QualityIssueCategory;
	/** GEDCOM ID of affected record (e.g., 'I1', 'F2') */
	recordId: string;
	/** Type of record ('individual' or 'family') */
	recordType: 'individual' | 'family';
	/** Display name for the record */
	recordName: string;
	/** Additional details */
	details?: Record<string, string | number | boolean>;
	/** Can this be auto-fixed? */
	autoFixable?: boolean;
}

/**
 * Place name variant found in GEDCOM data
 */
export interface PlaceVariantInfo {
	/** The variant form found (e.g., "United States of America") */
	variant: string;
	/** The canonical form (e.g., "USA") */
	canonical: string;
	/** Count of occurrences */
	count: number;
	/** Record IDs using this variant */
	recordIds: string[];
}

/**
 * User choices for how to handle issues during import
 */
export interface QualityFixChoices {
	/** Which canonical form to use for each variant */
	placeVariantChoices: Map<string, string>;
	/** Whether to normalize date formats */
	normalizeDates: boolean;
	/** Whether to skip records with critical errors */
	skipErrorRecords: boolean;
	/** Specific record IDs to skip */
	skipRecordIds: Set<string>;
}

/**
 * Summary statistics for quality analysis
 */
export interface QualityAnalysisSummary {
	totalIndividuals: number;
	totalFamilies: number;
	totalIssues: number;
	bySeverity: Record<QualityIssueSeverity, number>;
	byCategory: Record<QualityIssueCategory, number>;
	placeVariants: PlaceVariantInfo[];
	/** Unique place names found */
	uniquePlaces: string[];
}

/**
 * Complete quality analysis result
 */
export interface GedcomQualityAnalysis {
	issues: GedcomQualityIssue[];
	summary: QualityAnalysisSummary;
	/** Default choices (can be modified by user) */
	defaultChoices: QualityFixChoices;
}

// ============================================================================
// Variant Lookup
// ============================================================================

/**
 * Build reverse lookup from variant to canonical
 */
function buildVariantLookup(): Map<string, string> {
	const lookup = new Map<string, string>();
	for (const [canonical, variants] of Object.entries(PLACE_NAME_VARIANTS)) {
		for (const variant of variants) {
			lookup.set(variant.toLowerCase(), canonical);
		}
	}
	return lookup;
}

const VARIANT_LOOKUP = buildVariantLookup();

// ============================================================================
// Main Analyzer
// ============================================================================

/**
 * Analyze GEDCOM data for quality issues
 */
export function analyzeGedcomQuality(data: GedcomDataV2): GedcomQualityAnalysis {
	const issues: GedcomQualityIssue[] = [];
	const placeVariantMap = new Map<string, PlaceVariantInfo>();
	const allPlaces = new Set<string>();

	// Analyze individuals
	for (const [_id, individual] of data.individuals) {
		// Date issues
		analyzeIndividualDates(individual, issues);

		// Data completeness
		analyzeIndividualData(individual, issues);

		// Collect place info
		collectPlaces(individual, placeVariantMap, allPlaces);
	}

	// Analyze families
	for (const [_id, family] of data.families) {
		// Relationship issues
		analyzeFamilyRelationships(family, data, issues);

		// Reference issues
		analyzeFamilyReferences(family, data, issues);

		// Collect places from family events
		collectFamilyPlaces(family, placeVariantMap, allPlaces);
	}

	// Check for orphan references
	analyzeOrphanReferences(data, issues);

	// Build summary
	const summary = buildSummary(data, issues, placeVariantMap, allPlaces);

	// Build default choices
	const defaultChoices = buildDefaultChoices(placeVariantMap);

	return { issues, summary, defaultChoices };
}

// ============================================================================
// Individual Analysis
// ============================================================================

/**
 * Analyze date issues for an individual
 */
function analyzeIndividualDates(individual: GedcomIndividualV2, issues: GedcomQualityIssue[]): void {
	const birthYear = parseYear(individual.birthDate);
	const deathYear = parseYear(individual.deathDate);
	const currentYear = new Date().getFullYear();

	// Death before birth
	if (birthYear && deathYear && deathYear < birthYear) {
		issues.push({
			code: 'death_before_birth',
			message: `Death date (${individual.deathDate}) is before birth date (${individual.birthDate})`,
			severity: 'error',
			category: 'date',
			recordId: individual.id,
			recordType: 'individual',
			recordName: individual.name || 'Unknown',
			details: {
				birthDate: individual.birthDate || '',
				deathDate: individual.deathDate || ''
			}
		});
	}

	// Future birth date
	if (birthYear && birthYear > currentYear) {
		issues.push({
			code: 'future_birth',
			message: `Birth date (${individual.birthDate}) is in the future`,
			severity: 'warning',
			category: 'date',
			recordId: individual.id,
			recordType: 'individual',
			recordName: individual.name || 'Unknown',
			details: { birthDate: individual.birthDate || '' }
		});
	}

	// Very old without death (born before 1900, no death date)
	if (birthYear && birthYear < 1900 && !individual.deathDate) {
		issues.push({
			code: 'very_old_no_death',
			message: `Born in ${birthYear} with no death date recorded`,
			severity: 'info',
			category: 'date',
			recordId: individual.id,
			recordType: 'individual',
			recordName: individual.name || 'Unknown',
			details: { birthYear }
		});
	}

	// Check events for date issues
	for (const event of individual.events) {
		const eventYear = parseYear(event.date);

		// Event before birth
		if (birthYear && eventYear && eventYear < birthYear && event.tag !== 'BIRT') {
			issues.push({
				code: 'event_before_birth',
				message: `${event.tag} event (${event.date}) is before birth (${individual.birthDate})`,
				severity: 'warning',
				category: 'date',
				recordId: individual.id,
				recordType: 'individual',
				recordName: individual.name || 'Unknown',
				details: {
					eventType: event.tag,
					eventDate: event.date || '',
					birthDate: individual.birthDate || ''
				}
			});
		}

		// Event after death
		if (deathYear && eventYear && eventYear > deathYear && event.tag !== 'DEAT' && event.tag !== 'BURI' && event.tag !== 'PROB') {
			issues.push({
				code: 'event_after_death',
				message: `${event.tag} event (${event.date}) is after death (${individual.deathDate})`,
				severity: 'warning',
				category: 'date',
				recordId: individual.id,
				recordType: 'individual',
				recordName: individual.name || 'Unknown',
				details: {
					eventType: event.tag,
					eventDate: event.date || '',
					deathDate: individual.deathDate || ''
				}
			});
		}
	}
}

/**
 * Analyze data completeness for an individual
 */
function analyzeIndividualData(individual: GedcomIndividualV2, issues: GedcomQualityIssue[]): void {
	// Missing name
	if (!individual.name || individual.name === '//' || individual.name.trim() === '') {
		issues.push({
			code: 'missing_name',
			message: 'Individual has no name',
			severity: 'warning',
			category: 'data',
			recordId: individual.id,
			recordType: 'individual',
			recordName: `[${individual.id}]`
		});
	}

	// Missing sex
	if (!individual.sex || individual.sex === 'U') {
		issues.push({
			code: 'unknown_sex',
			message: 'Sex is unknown or not specified',
			severity: 'info',
			category: 'data',
			recordId: individual.id,
			recordType: 'individual',
			recordName: individual.name || `[${individual.id}]`
		});
	}

	// No dates at all
	if (!individual.birthDate && !individual.deathDate && individual.events.length === 0) {
		issues.push({
			code: 'no_dates',
			message: 'No dates or events recorded',
			severity: 'info',
			category: 'data',
			recordId: individual.id,
			recordType: 'individual',
			recordName: individual.name || `[${individual.id}]`
		});
	}
}

// ============================================================================
// Family Analysis
// ============================================================================

/**
 * Analyze relationship issues in a family
 */
function analyzeFamilyRelationships(
	family: GedcomFamilyV2,
	data: GedcomDataV2,
	issues: GedcomQualityIssue[]
): void {
	const husband = family.husbandRef ? data.individuals.get(family.husbandRef) : undefined;
	const wife = family.wifeRef ? data.individuals.get(family.wifeRef) : undefined;

	// Gender mismatch: female as husband
	if (husband && husband.sex === 'F') {
		issues.push({
			code: 'female_husband',
			message: `${husband.name} is listed as HUSB but has SEX F`,
			severity: 'warning',
			category: 'relationship',
			recordId: family.id,
			recordType: 'family',
			recordName: `Family ${family.id}`,
			details: { personId: husband.id, personName: husband.name }
		});
	}

	// Gender mismatch: male as wife
	if (wife && wife.sex === 'M') {
		issues.push({
			code: 'male_wife',
			message: `${wife.name} is listed as WIFE but has SEX M`,
			severity: 'warning',
			category: 'relationship',
			recordId: family.id,
			recordType: 'family',
			recordName: `Family ${family.id}`,
			details: { personId: wife.id, personName: wife.name }
		});
	}

	// Parent younger than child
	const marriageYear = parseYear(family.marriageDate);
	for (const childRef of family.childRefs) {
		const child = data.individuals.get(childRef);
		if (!child) continue;

		const childBirthYear = parseYear(child.birthDate);
		if (!childBirthYear) continue;

		// Check father age
		if (husband) {
			const fatherBirthYear = parseYear(husband.birthDate);
			if (fatherBirthYear && fatherBirthYear >= childBirthYear) {
				issues.push({
					code: 'parent_younger_than_child',
					message: `Father ${husband.name} (b. ${fatherBirthYear}) is same age or younger than child ${child.name} (b. ${childBirthYear})`,
					severity: 'error',
					category: 'relationship',
					recordId: family.id,
					recordType: 'family',
					recordName: `Family ${family.id}`,
					details: {
						parentId: husband.id,
						parentBirth: fatherBirthYear,
						childId: child.id,
						childBirth: childBirthYear
					}
				});
			}
		}

		// Check mother age
		if (wife) {
			const motherBirthYear = parseYear(wife.birthDate);
			if (motherBirthYear && motherBirthYear >= childBirthYear) {
				issues.push({
					code: 'parent_younger_than_child',
					message: `Mother ${wife.name} (b. ${motherBirthYear}) is same age or younger than child ${child.name} (b. ${childBirthYear})`,
					severity: 'error',
					category: 'relationship',
					recordId: family.id,
					recordType: 'family',
					recordName: `Family ${family.id}`,
					details: {
						parentId: wife.id,
						parentBirth: motherBirthYear,
						childId: child.id,
						childBirth: childBirthYear
					}
				});
			}
		}

		// Marriage before child's birth (by more than 9 months is fine, but marriage after birth is suspicious)
		if (marriageYear && childBirthYear && marriageYear > childBirthYear) {
			issues.push({
				code: 'child_before_marriage',
				message: `Child ${child.name} (b. ${childBirthYear}) born before parents' marriage (${marriageYear})`,
				severity: 'info',
				category: 'relationship',
				recordId: family.id,
				recordType: 'family',
				recordName: `Family ${family.id}`,
				details: {
					childId: child.id,
					childBirth: childBirthYear,
					marriageYear
				}
			});
		}
	}

	// Empty family (no husband, wife, or children)
	if (!family.husbandRef && !family.wifeRef && family.childRefs.length === 0) {
		issues.push({
			code: 'empty_family',
			message: 'Family has no members',
			severity: 'warning',
			category: 'data',
			recordId: family.id,
			recordType: 'family',
			recordName: `Family ${family.id}`
		});
	}
}

/**
 * Analyze reference issues in a family
 */
function analyzeFamilyReferences(
	family: GedcomFamilyV2,
	data: GedcomDataV2,
	issues: GedcomQualityIssue[]
): void {
	// Check husband reference
	if (family.husbandRef && !data.individuals.has(family.husbandRef)) {
		issues.push({
			code: 'missing_person_ref',
			message: `HUSB references non-existent person @${family.husbandRef}@`,
			severity: 'error',
			category: 'reference',
			recordId: family.id,
			recordType: 'family',
			recordName: `Family ${family.id}`,
			details: { missingRef: family.husbandRef, role: 'HUSB' }
		});
	}

	// Check wife reference
	if (family.wifeRef && !data.individuals.has(family.wifeRef)) {
		issues.push({
			code: 'missing_person_ref',
			message: `WIFE references non-existent person @${family.wifeRef}@`,
			severity: 'error',
			category: 'reference',
			recordId: family.id,
			recordType: 'family',
			recordName: `Family ${family.id}`,
			details: { missingRef: family.wifeRef, role: 'WIFE' }
		});
	}

	// Check child references
	for (const childRef of family.childRefs) {
		if (!data.individuals.has(childRef)) {
			issues.push({
				code: 'missing_person_ref',
				message: `CHIL references non-existent person @${childRef}@`,
				severity: 'error',
				category: 'reference',
				recordId: family.id,
				recordType: 'family',
				recordName: `Family ${family.id}`,
				details: { missingRef: childRef, role: 'CHIL' }
			});
		}
	}
}

/**
 * Analyze orphan references (individuals referencing non-existent families)
 */
function analyzeOrphanReferences(data: GedcomDataV2, issues: GedcomQualityIssue[]): void {
	for (const [_id, individual] of data.individuals) {
		// Check FAMC reference
		if (individual.familyAsChildRef && !data.families.has(individual.familyAsChildRef)) {
			issues.push({
				code: 'missing_family_ref',
				message: `FAMC references non-existent family @${individual.familyAsChildRef}@`,
				severity: 'error',
				category: 'reference',
				recordId: individual.id,
				recordType: 'individual',
				recordName: individual.name || `[${individual.id}]`,
				details: { missingRef: individual.familyAsChildRef, refType: 'FAMC' }
			});
		}

		// Check FAMS references
		for (const famRef of individual.familyAsSpouseRefs) {
			if (!data.families.has(famRef)) {
				issues.push({
					code: 'missing_family_ref',
					message: `FAMS references non-existent family @${famRef}@`,
					severity: 'error',
					category: 'reference',
					recordId: individual.id,
					recordType: 'individual',
					recordName: individual.name || `[${individual.id}]`,
					details: { missingRef: famRef, refType: 'FAMS' }
				});
			}
		}
	}

	// Check for children claimed by multiple families
	const childToFamilies = new Map<string, string[]>();
	for (const [famId, family] of data.families) {
		for (const childRef of family.childRefs) {
			const families = childToFamilies.get(childRef) || [];
			families.push(famId);
			childToFamilies.set(childRef, families);
		}
	}

	for (const [childId, families] of childToFamilies) {
		if (families.length > 1) {
			const child = data.individuals.get(childId);
			issues.push({
				code: 'multiple_parent_families',
				message: `Child is claimed by ${families.length} families: ${families.map(f => '@' + f + '@').join(', ')}`,
				severity: 'warning',
				category: 'relationship',
				recordId: childId,
				recordType: 'individual',
				recordName: child?.name || `[${childId}]`,
				details: { familyCount: families.length, families: families.join(', ') }
			});
		}
	}
}

// ============================================================================
// Place Analysis
// ============================================================================

/**
 * Collect places from an individual and detect variants
 */
function collectPlaces(
	individual: GedcomIndividualV2,
	variantMap: Map<string, PlaceVariantInfo>,
	allPlaces: Set<string>
): void {
	const places = [individual.birthPlace, individual.deathPlace];

	// Add places from events
	for (const event of individual.events) {
		if (event.place) {
			places.push(event.place);
		}
	}

	for (const place of places) {
		if (!place) continue;
		analyzePlaceForVariants(place, individual.id, variantMap, allPlaces);
	}
}

/**
 * Collect places from a family's events
 */
function collectFamilyPlaces(
	family: GedcomFamilyV2,
	variantMap: Map<string, PlaceVariantInfo>,
	allPlaces: Set<string>
): void {
	const places = [family.marriagePlace];

	// Add places from events
	for (const event of family.events) {
		if (event.place) {
			places.push(event.place);
		}
	}

	for (const place of places) {
		if (!place) continue;
		analyzePlaceForVariants(place, family.id, variantMap, allPlaces);
	}
}

/**
 * Analyze a place string for variants
 */
function analyzePlaceForVariants(
	place: string,
	recordId: string,
	variantMap: Map<string, PlaceVariantInfo>,
	allPlaces: Set<string>
): void {
	allPlaces.add(place);

	// Split by comma and check each component
	const parts = place.split(',').map(p => p.trim());

	for (const part of parts) {
		const lowerPart = part.toLowerCase();
		const canonical = VARIANT_LOOKUP.get(lowerPart);

		if (canonical && part !== canonical) {
			// Found a variant
			const key = `${part}|||${canonical}`;
			const existing = variantMap.get(key);

			if (existing) {
				existing.count++;
				if (!existing.recordIds.includes(recordId)) {
					existing.recordIds.push(recordId);
				}
			} else {
				variantMap.set(key, {
					variant: part,
					canonical,
					count: 1,
					recordIds: [recordId]
				});
			}
		}
	}
}

// ============================================================================
// Summary & Defaults
// ============================================================================

/**
 * Build analysis summary
 */
function buildSummary(
	data: GedcomDataV2,
	issues: GedcomQualityIssue[],
	variantMap: Map<string, PlaceVariantInfo>,
	allPlaces: Set<string>
): QualityAnalysisSummary {
	const bySeverity: Record<QualityIssueSeverity, number> = {
		error: 0,
		warning: 0,
		info: 0
	};

	const byCategory: Record<QualityIssueCategory, number> = {
		date: 0,
		relationship: 0,
		data: 0,
		place: 0,
		reference: 0
	};

	for (const issue of issues) {
		bySeverity[issue.severity]++;
		byCategory[issue.category]++;
	}

	// Convert variant map to array
	const placeVariants: PlaceVariantInfo[] = [];
	for (const [_key, info] of variantMap) {
		placeVariants.push(info);
	}
	placeVariants.sort((a, b) => b.count - a.count);

	return {
		totalIndividuals: data.individuals.size,
		totalFamilies: data.families.size,
		totalIssues: issues.length,
		bySeverity,
		byCategory,
		placeVariants,
		uniquePlaces: Array.from(allPlaces).sort()
	};
}

/**
 * Build default fix choices
 */
function buildDefaultChoices(variantMap: Map<string, PlaceVariantInfo>): QualityFixChoices {
	const placeVariantChoices = new Map<string, string>();

	// Default to canonical form for all variants
	for (const [_key, info] of variantMap) {
		placeVariantChoices.set(info.variant, info.canonical);
	}

	return {
		placeVariantChoices,
		normalizeDates: true,
		skipErrorRecords: false,
		skipRecordIds: new Set()
	};
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse a year from a GEDCOM date string
 */
function parseYear(dateStr: string | undefined): number | null {
	if (!dateStr) return null;

	// Remove modifiers like ABT, BEF, AFT, etc.
	const cleaned = dateStr
		.replace(/^(ABT|BEF|AFT|EST|CAL|FROM|TO|BET|AND)\s*/gi, '')
		.trim();

	// Try to find a 4-digit year
	const match = cleaned.match(/\b(\d{4})\b/);
	if (match) {
		return parseInt(match[1], 10);
	}

	return null;
}

/**
 * Apply quality fix choices to GEDCOM data (mutates the data)
 */
export function applyQualityFixes(
	data: GedcomDataV2,
	choices: QualityFixChoices
): void {
	// Apply place variant fixes
	if (choices.placeVariantChoices.size > 0) {
		for (const [_id, individual] of data.individuals) {
			individual.birthPlace = normalizePlace(individual.birthPlace, choices.placeVariantChoices);
			individual.deathPlace = normalizePlace(individual.deathPlace, choices.placeVariantChoices);

			for (const event of individual.events) {
				event.place = normalizePlace(event.place, choices.placeVariantChoices);
			}
		}

		for (const [_id, family] of data.families) {
			family.marriagePlace = normalizePlace(family.marriagePlace, choices.placeVariantChoices);

			for (const event of family.events) {
				event.place = normalizePlace(event.place, choices.placeVariantChoices);
			}
		}
	}

	// Remove skipped records
	if (choices.skipRecordIds.size > 0) {
		for (const id of choices.skipRecordIds) {
			data.individuals.delete(id);
			data.families.delete(id);
		}
	}
}

/**
 * Normalize a place string using the variant choices
 */
function normalizePlace(
	place: string | undefined,
	choices: Map<string, string>
): string | undefined {
	if (!place) return place;

	const parts = place.split(',').map(p => p.trim());
	const normalizedParts = parts.map(part => {
		// Check if this part has a chosen canonical form
		const canonical = choices.get(part);
		return canonical || part;
	});

	return normalizedParts.join(', ');
}
