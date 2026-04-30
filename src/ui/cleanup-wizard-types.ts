/**
 * Type definitions, constants, and pure utility functions for CleanupWizardModal
 * Extracted from cleanup-wizard-modal.ts for maintainability
 */

import type { PlaceNode, PlaceType } from '../models/place';
import type { PlaceGraphService } from '../core/place-graph';

/**
 * Wizard step types
 */
export type StepType = 'review' | 'batch' | 'interactive';

/**
 * Step status
 */
export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'skipped';

/**
 * Wizard step configuration
 */
export interface WizardStepConfig {
	id: string;
	number: number;
	title: string;
	shortTitle: string;
	description: string;
	type: StepType;
	service: string;
	detectMethod?: string;
	previewMethod?: string;
	applyMethod?: string;
	dependencies: number[];
}

/**
 * Step state
 */
export interface StepState {
	status: StepStatus;
	issueCount: number;
	fixCount: number;
	skippedReason?: string;
}

/**
 * Wizard state
 */
export interface CleanupWizardState {
	currentStep: number;
	steps: Record<number, StepState>;
	startTime: number;
	isPreScanning: boolean;
	preScanComplete: boolean;
}

/**
 * Result of hierarchy enrichment for a single place
 */
export interface HierarchyEnrichmentResult {
	placeName: string;
	success: boolean;
	/** Parsed hierarchy components from geocoding */
	hierarchy?: string[];
	/** Parent places created */
	parentsCreated?: string[];
	/** Parent place linked to */
	parentLinked?: string;
	/** Error message if failed */
	error?: string;
	/** Whether place was skipped (already has parent) */
	skipped?: boolean;
}

/** Maximum age of persisted state before it's considered stale (24 hours) */
export const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Known place type mappings from OSM/Nominatim address components
 */
export const OSM_TYPE_MAP: Record<string, PlaceType> = {
	country: 'country',
	state: 'state',
	province: 'province',
	region: 'region',
	county: 'county',
	city: 'city',
	town: 'town',
	village: 'village',
	municipality: 'city',
	district: 'district',
	suburb: 'district',
	neighbourhood: 'district',
	hamlet: 'village'
};

/**
 * Wizard step definitions
 */
export const WIZARD_STEPS: WizardStepConfig[] = [
	{
		id: 'quality-report',
		number: 1,
		title: 'Quality Report',
		shortTitle: 'Quality Report',
		description: 'Review data quality issues identified in your vault.',
		type: 'review',
		service: 'DataQualityService',
		detectMethod: 'getIssuesSummary',
		dependencies: []
	},
	{
		id: 'bidirectional',
		number: 2,
		title: 'Fix Bidirectional Relationships',
		shortTitle: 'Bidir Rels',
		description: 'Ensure parent-child relationships are properly linked in both directions.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectBidirectionalIssues',
		applyMethod: 'fixBidirectionalInconsistencies',
		dependencies: [1]
	},
	{
		id: 'date-normalize',
		number: 3,
		title: 'Normalize Date Formats',
		shortTitle: 'Dates',
		description: 'Convert non-standard date formats to ISO 8601 (YYYY-MM-DD).',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectDateIssues',
		applyMethod: 'normalizeDateFormats',
		dependencies: [2]
	},
	{
		id: 'gender-normalize',
		number: 4,
		title: 'Normalize Gender Values',
		shortTitle: 'Gender',
		description: 'Standardize gender/sex values to consistent format.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectGenderIssues',
		applyMethod: 'normalizeGenderValues',
		dependencies: [2]
	},
	{
		id: 'orphan-clear',
		number: 5,
		title: 'Clear Orphan References',
		shortTitle: 'Orphans',
		description: 'Remove dangling links to non-existent notes.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectOrphanReferences',
		applyMethod: 'clearOrphanReferences',
		dependencies: [2]
	},
	{
		id: 'source-migrate',
		number: 6,
		title: 'Migrate Source Properties',
		shortTitle: 'Sources',
		description: 'Convert indexed source properties (source_2, source_3) to array format.',
		type: 'batch',
		service: 'SourceMigrationService',
		detectMethod: 'detectIndexedSources',
		applyMethod: 'migrateToArrayFormat',
		dependencies: [5]
	},
	{
		id: 'place-variants',
		number: 7,
		title: 'Standardize Place Variants',
		shortTitle: 'Place Names',
		description: 'Choose canonical names for places with multiple variants.',
		type: 'interactive',
		service: 'PlaceGraphService',
		detectMethod: 'detectPlaceVariants',
		applyMethod: 'standardizeVariant',
		dependencies: []
	},
	{
		id: 'geocode',
		number: 8,
		title: 'Bulk Geocode',
		shortTitle: 'Geocode',
		description: 'Add geographic coordinates to place notes.',
		type: 'interactive',
		service: 'GeocodingService',
		detectMethod: 'detectUngeocoded',
		applyMethod: 'geocodePlace',
		dependencies: [7]
	},
	{
		id: 'place-hierarchy',
		number: 9,
		title: 'Enrich Place Hierarchy',
		shortTitle: 'Hierarchy',
		description: 'Build containment chains (city \u2192 county \u2192 state \u2192 country).',
		type: 'interactive',
		service: 'PlaceGraphService',
		detectMethod: 'detectMissingHierarchy',
		applyMethod: 'enrichHierarchy',
		dependencies: [8]
	},
	{
		id: 'flatten-props',
		number: 10,
		title: 'Flatten Nested Properties',
		shortTitle: 'Flatten',
		description: 'Convert nested YAML objects to flat property format.',
		type: 'batch',
		service: 'DataQualityService',
		detectMethod: 'detectNestedProperties',
		applyMethod: 'flattenProperties',
		dependencies: []
	},
	{
		id: 'event-person-migrate',
		number: 11,
		title: 'Migrate Event Person Properties',
		shortTitle: 'Event Persons',
		description: 'Convert singular person property to persons array format.',
		type: 'batch',
		service: 'EventPersonMigrationService',
		detectMethod: 'detectLegacyPersonProperty',
		applyMethod: 'migrateToArrayFormat',
		dependencies: [6]
	},
	{
		id: 'sourced-facts-migrate',
		number: 12,
		title: 'Migrate Evidence Tracking',
		shortTitle: 'Evidence',
		description: 'Convert nested sourced_facts to flat sourced_* properties.',
		type: 'batch',
		service: 'SourcedFactsMigrationService',
		detectMethod: 'detectLegacySourcedFacts',
		applyMethod: 'migrateToFlatFormat',
		dependencies: []
	},
	{
		id: 'life-events-migrate',
		number: 13,
		title: 'Migrate Life Events',
		shortTitle: 'Life Events',
		description: 'Convert inline events arrays to separate event note files.',
		type: 'batch',
		service: 'LifeEventsMigrationService',
		detectMethod: 'detectInlineEvents',
		applyMethod: 'migrateToEventNotes',
		dependencies: []
	},
	{
		id: 'child-to-children',
		number: 14,
		title: 'Normalize Children Property',
		shortTitle: 'Children',
		description: 'Rename legacy "child" property to "children" for consistency.',
		type: 'batch',
		service: 'inline', // No external service needed
		detectMethod: 'detectLegacyChildProperty',
		applyMethod: 'migrateChildToChildren',
		dependencies: []
	},
	{
		id: 'place-cr-id',
		number: 15,
		title: 'Add cr_id to place notes',
		shortTitle: 'Place IDs',
		description: 'Generate cr_id for place notes that lack one. Without cr_id, places are silently excluded from the place graph and don’t appear in by-name lookups, the parent dropdown, or map markers.',
		type: 'batch',
		service: 'inline',
		detectMethod: 'detectPlacesWithoutCrId',
		applyMethod: 'addCrIdToPlaces',
		dependencies: []
	}
];

// --- Pure utility functions ---

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
	return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Parse hierarchy from geocoding address components
 */
export function parseHierarchyFromAddress(
	addressComponents: Record<string, string>,
	placeName: string
): string[] {
	const hierarchy: string[] = [];

	// Order of address components from most specific to least
	const componentOrder = [
		'city', 'town', 'village', 'municipality', 'hamlet',
		'county', 'district', 'suburb',
		'state', 'province', 'region',
		'country'
	];

	// Track what we've added to avoid duplicates
	const added = new Set<string>();
	added.add(placeName.toLowerCase()); // Don't include the place itself

	for (const component of componentOrder) {
		const value = addressComponents[component];
		if (value && !added.has(value.toLowerCase())) {
			hierarchy.push(value);
			added.add(value.toLowerCase());
		}
	}

	return hierarchy;
}

/**
 * Find an existing place by name in the place graph
 */
export function findPlaceByName(name: string, placeGraph: PlaceGraphService): PlaceNode | undefined {
	const allPlaces = placeGraph.getAllPlaces();
	const nameLower = name.toLowerCase();

	return allPlaces.find(p =>
		p.name.toLowerCase() === nameLower ||
		p.aliases.some(a => a.toLowerCase() === nameLower)
	);
}

/**
 * Infer place type from address components using OSM type mapping
 */
export function inferPlaceType(name: string, addressComponents: Record<string, string>): PlaceType | undefined {
	// Check which component matches this name
	for (const [component, value] of Object.entries(addressComponents)) {
		if (value.toLowerCase() === name.toLowerCase()) {
			return OSM_TYPE_MAP[component];
		}
	}
	return undefined;
}

/**
 * Strip wikilink brackets from a place value
 */
export function stripWikilink(value: string): { inner: string; hadBrackets: boolean } {
	if (value.startsWith('[[') && value.endsWith(']]')) {
		return { inner: value.slice(2, -2), hadBrackets: true };
	}
	return { inner: value, hadBrackets: false };
}

/**
 * Check if a place value contains the variant (as a standalone component)
 */
export function containsPlaceVariant(value: string, variant: string): boolean {
	const { inner } = stripWikilink(value);
	const parts = inner.split(',').map(p => p.trim());
	return parts.some(part => part.toLowerCase() === variant.toLowerCase());
}

/**
 * Replace a variant in a place value with the canonical form
 */
export function replacePlaceVariant(value: string, oldVariant: string, newCanonical: string): string {
	const { inner, hadBrackets } = stripWikilink(value);
	const parts = inner.split(',').map(p => p.trim());
	const newParts = parts.map(part => {
		if (part.toLowerCase() === oldVariant.toLowerCase()) {
			return newCanonical;
		}
		return part;
	});
	const result = newParts.join(', ');
	return hadBrackets ? `[[${result}]]` : result;
}

/**
 * Get stats from persisted state
 */
export function getPersistedStateStats(state: { steps: Record<number, { status: string }> }): { completed: number; total: number } {
	let completed = 0;
	const total = WIZARD_STEPS.length;
	for (const step of Object.values(state.steps)) {
		if (step.status === 'complete' || step.status === 'skipped') {
			completed++;
		}
	}
	return { completed, total };
}
