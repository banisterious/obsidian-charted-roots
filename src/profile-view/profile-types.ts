/**
 * Entity Profile View Types
 *
 * Shared types for the profile view subsystem.
 */

import type { TFile } from 'obsidian';
import type { PersonNode } from '../core/family-graph';
import type { PlaceNode } from '../models/place';
import type { EventNote } from '../events/types/event-types';
import type { SourceNote } from '../sources/types/source-types';
import type { OrganizationInfo, PersonMembership } from '../organizations/types/organization-types';
import type { ParsedRelationship } from '../relationships/types/relationship-types';
import type { PersonResearchCoverage } from '../sources/types/source-types';
import type { MediaItem } from '../core/media-service';
import type { ProofSummaryNote } from '../sources/types/proof-types';

// ────────────────────────────────────────────────────────────
// Core types
// ────────────────────────────────────────────────────────────

/** Entity types supported by the profile view */
export type ProfileEntityType = 'person' | 'place' | 'event' | 'source' | 'organization';

/** Breadcrumb navigation entry */
export interface BreadcrumbEntry {
	crId: string;
	name: string;
	entityType: ProfileEntityType;
	filePath: string;
}

/** Section collapse state map (section ID → expanded) */
export type SectionState = Record<string, boolean>;

/** Callback for section toggle events */
export type SectionToggleFn = (sectionId: string, expanded: boolean) => void;

/** Callback for entity link clicks (triggers breadcrumb navigation) */
export type EntityLinkClickFn = (crId: string, name: string, entityType: ProfileEntityType, filePath: string) => void;

// ────────────────────────────────────────────────────────────
// View state (persisted by Obsidian across sessions)
// ────────────────────────────────────────────────────────────

export interface ProfileViewState {
	pinned: boolean;
	pinnedEntityCrId?: string;
	pinnedEntityFilePath?: string;
	sectionStates: SectionState;
	breadcrumbs: BreadcrumbEntry[];
}

// ────────────────────────────────────────────────────────────
// Per-entity loaded data (discriminated union)
// ────────────────────────────────────────────────────────────

export interface PersonProfileData {
	entityType: 'person';
	crId: string;
	name: string;
	file: TFile;
	node: PersonNode;
	events: EventNote[];
	relationships: ParsedRelationship[];
	inverseRelationships: ParsedRelationship[];
	memberships: PersonMembership[];
	media: MediaItem[];
	researchCoverage: PersonResearchCoverage | null;
	proofSummaries: ProofSummaryNote[];
	needsResearch: string[];
	sources: string[];
}

export interface PlaceProfileData {
	entityType: 'place';
	crId: string;
	name: string;
	file: TFile;
	node: PlaceNode;
	events: EventNote[];
	media: MediaItem[];
	needsResearch: string[];
	sources: string[];
}

export interface EventProfileData {
	entityType: 'event';
	crId: string;
	name: string;
	file: TFile;
	event: EventNote;
	media: MediaItem[];
	needsResearch: string[];
}

export interface SourceProfileData {
	entityType: 'source';
	crId: string;
	name: string;
	file: TFile;
	source: SourceNote;
	referencedFacts: ReferencedFactGroup[];
	/** Event notes that cite this source via their `sources` array (#654) */
	referencedEvents: EventNote[];
	media: MediaItem[];
	/** Parent source note (if this is a child) */
	parentSource?: SourceNote;
	/** Child source notes (if this is a parent) */
	childSources: SourceNote[];
	/** Sibling source notes — same parent, excluding self */
	siblingSources: SourceNote[];
}

export interface OrganizationProfileData {
	entityType: 'organization';
	crId: string;
	name: string;
	file: TFile;
	org: OrganizationInfo;
	members: PersonMembership[];
	events: EventNote[];
	media: MediaItem[];
	sources: string[];
}

/** Union of all entity profile data types */
export type ProfileEntityData =
	| PersonProfileData
	| PlaceProfileData
	| EventProfileData
	| SourceProfileData
	| OrganizationProfileData;

// ────────────────────────────────────────────────────────────
// Source referenced facts
// ────────────────────────────────────────────────────────────

/** A group of facts from a single entity that reference a particular source */
export interface ReferencedFactGroup {
	entityName: string;
	entityFilePath: string;
	entityCrId: string;
	facts: ReferencedFact[];
}

/** A single fact-value pair referenced by a source */
export interface ReferencedFact {
	factKey: string;
	factValue: string;
}

// ────────────────────────────────────────────────────────────
// Inline editing (Phase 2)
// ────────────────────────────────────────────────────────────

/** Input type for inline editable fields */
export type InlineEditInputType = 'text' | 'number' | 'select';

/** Option for select dropdown fields */
export interface SelectOption {
	value: string;
	label: string;
}

/** Configuration for a single editable field */
export interface EditableFieldConfig {
	/** Canonical frontmatter property name (e.g., 'born', 'sex') */
	property: string;
	/** Display label shown as tooltip (e.g., 'Birth date') */
	label: string;
	/** Formatted value for display */
	displayValue: string;
	/** Raw value for the input (may differ from displayValue for wikilinks) */
	rawValue: string;
	/** Input type */
	inputType: InlineEditInputType;
	/** Options for select inputs */
	selectOptions?: SelectOption[];
	/** Placeholder text when value is empty */
	placeholder?: string;
}

/** Callback invoked when a field is saved */
export type InlineEditSaveFn = (property: string, newValue: string) => Promise<void>;

/** Callback to notify the profile view that an edit is about to save */
export type InlineEditNotifyFn = () => void;
