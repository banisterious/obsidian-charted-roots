/**
 * Universe Management - Type Definitions
 *
 * Universes are first-class entities for organizing fictional worlds.
 * They serve as a canonical registry linking related calendars, maps,
 * places, people, and schemas within a fictional setting.
 */

import type { TFile } from 'obsidian';

/**
 * Universe status values
 */
export type UniverseStatus = 'active' | 'draft' | 'archived';

/**
 * Parsed universe information from a note
 */
export interface UniverseInfo {
	/** The source file */
	file: TFile;
	/** Unique identifier (cr_id) */
	crId: string;
	/** Display name */
	name: string;
	/** Brief description of the universe */
	description?: string;
	/** Creator/author of the fictional world */
	author?: string;
	/** Genre (fantasy, sci-fi, historical, etc.) */
	genre?: string;
	/** Universe status */
	status: UniverseStatus;
	/** Default calendar cr_id for this universe */
	defaultCalendar?: string;
	/** Default map cr_id for this universe */
	defaultMap?: string;
	/** Creation date */
	created?: string;
}

/**
 * Raw universe frontmatter as stored in notes
 */
export interface UniverseFrontmatter {
	cr_type: 'universe';
	cr_id: string;
	name: string;
	description?: string;
	author?: string;
	genre?: string;
	status?: UniverseStatus;
	default_calendar?: string;
	default_map?: string;
	created?: string;
}

/**
 * Data for creating a new universe
 */
export interface CreateUniverseData {
	/** Universe name (required) */
	name: string;
	/** Brief description */
	description?: string;
	/** Creator/author */
	author?: string;
	/** Genre */
	genre?: string;
	/** Initial status (defaults to 'active') */
	status?: UniverseStatus;
}

/**
 * Entity counts for a universe
 */
export interface UniverseEntityCounts {
	/** Number of people in this universe */
	people: number;
	/** Number of places in this universe */
	places: number;
	/** Number of events in this universe */
	events: number;
	/** Number of organizations in this universe */
	organizations: number;
	/** Number of date systems/calendars for this universe */
	calendars: number;
	/** Number of custom maps for this universe */
	maps: number;
	/** Number of schemas scoped to this universe */
	schemas: number;
}

/**
 * Universe with entity counts loaded
 */
export interface UniverseWithCounts extends UniverseInfo {
	/** Entity counts for this universe */
	counts: UniverseEntityCounts;
}

/**
 * Result of universe reference validation
 */
export interface UniverseValidationResult {
	/** Whether the reference is valid */
	isValid: boolean;
	/** The universe info if valid */
	universe?: UniverseInfo;
	/** Error message if invalid */
	error?: string;
	/** Suggested universes (for autocomplete/correction) */
	suggestions?: UniverseInfo[];
}

/**
 * An orphan universe string (used in entities but no universe note exists)
 */
export interface OrphanUniverse {
	/** The universe string value */
	value: string;
	/** Number of entities using this value */
	entityCount: number;
	/** Breakdown by entity type */
	byType: {
		people: number;
		places: number;
		events: number;
		organizations: number;
		calendars: number;
		maps: number;
	};
}

/**
 * Statistics about universes in the vault
 */
export interface UniverseStats {
	/** Total number of universe notes */
	total: number;
	/** Count by status */
	byStatus: Record<UniverseStatus, number>;
	/** Number of orphan universe strings */
	orphanCount: number;
	/** Total entities across all universes */
	totalEntities: number;
}
