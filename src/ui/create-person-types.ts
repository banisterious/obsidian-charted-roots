/**
 * Type definitions and utility functions for CreatePersonModal
 * Extracted from create-person-modal.ts for maintainability
 */

import type { ResearchLevel } from '../types/frontmatter';

/**
 * Relationship field data
 */
export interface RelationshipField {
	crId?: string;
	name?: string;
}

/**
 * Multi-relationship field data (for children)
 */
export interface MultiRelationshipField {
	crIds: string[];
	names: string[];
}

/**
 * Marriage status options
 */
export type MarriageStatus = 'current' | 'divorced' | 'widowed' | 'separated' | 'annulled';

/**
 * Spouse with marriage metadata for enhanced spouse tracking (#204)
 */
export interface SpouseWithMetadata {
	crId: string;
	name: string;
	marriageDate?: string;
	marriageLocation?: string;
	marriageLocationCrId?: string;
	marriageStatus?: MarriageStatus;
	divorceDate?: string;
}

/**
 * Multi-relationship field data with per-spouse metadata
 */
export interface SpousesFieldData {
	spouses: SpouseWithMetadata[];
}

/**
 * Form data structure for persistence
 */
export interface PersonFormData {
	name?: string;
	sex?: string;
	pronouns?: string[];
	birthDate?: string;
	deathDate?: string;
	occupation?: string;
	researchLevel?: ResearchLevel;
	collection?: string;
	universe?: string;
	directory?: string;
	includeDynamicBlocks?: boolean;
	// Relationship fields
	fatherCrId?: string;
	fatherName?: string;
	motherCrId?: string;
	motherName?: string;
	// Spouses (multi-relationship with optional metadata)
	spouseCrIds?: string[];
	spouseNames?: string[];
	spouseMetadata?: SpouseWithMetadata[];
	stepfatherCrId?: string;
	stepfatherName?: string;
	stepmotherCrId?: string;
	stepmotherName?: string;
	adoptiveFatherCrId?: string;
	adoptiveFatherName?: string;
	adoptiveMotherCrId?: string;
	adoptiveMotherName?: string;
	// Gender-neutral parents (multi-relationship)
	parentCrIds?: string[];
	parentNames?: string[];
	// Children fields
	childCrIds?: string[];
	childNames?: string[];
	// Place fields
	birthPlaceCrId?: string;
	birthPlaceName?: string;
	deathPlaceCrId?: string;
	deathPlaceName?: string;
	// Sources fields
	sourceCrIds?: string[];
	sourceNames?: string[];
	// Fact-level source tracking
	sourcedFacts?: Record<string, string[]>;
}

/**
 * Get contrasting text color for a background color
 */
export function getContrastColor(hexColor: string): string {
	const hex = hexColor.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Check if a person reference (wikilink) matches a given person
 */
export function matchesPersonReference(
	reference: string,
	personName: string | undefined,
	personCrId: string | undefined
): boolean {
	// Extract name from wikilink: [[Name]] or "[[Name]]"
	const match = reference.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
	const refName = match ? match[1] : reference;

	// Match by name
	if (personName && refName.toLowerCase() === personName.toLowerCase()) {
		return true;
	}

	// Match by cr_id if present in reference (less common but possible)
	if (personCrId && reference.includes(personCrId)) {
		return true;
	}

	return false;
}
