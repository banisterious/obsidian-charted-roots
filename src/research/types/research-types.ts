/**
 * Type definitions for research workflow entities
 *
 * Research entities support GPS (Genealogical Proof Standard) methodology
 * within Charted Roots, enabling structured research tracking without
 * forcing rigid workflows.
 */

import type { ResearchLevel } from '../../types/frontmatter';

/**
 * Research entity types for cr_type property
 */
export type ResearchEntityType =
	| 'research_project'
	| 'research_report'
	| 'individual_research_note'
	| 'research_journal'
	| 'research_log_entry';

/**
 * All research entity types for validation
 */
export const RESEARCH_ENTITY_TYPES: readonly ResearchEntityType[] = [
	'research_project',
	'research_report',
	'individual_research_note',
	'research_journal',
	'research_log_entry'
] as const;

/**
 * Research project status values
 */
export type ResearchProjectStatus = 'open' | 'in-progress' | 'on-hold' | 'completed';

/**
 * Research report status values
 */
export type ResearchReportStatus = 'draft' | 'review' | 'final' | 'published';

/**
 * Research report audience
 */
export type ReportAudience = 'File' | 'Family' | 'Client' | 'Public' | 'Print';

/**
 * IRN (Individual Research Note) status values
 */
export type IRNStatus = 'in-progress' | 'completed';

/**
 * Research log entry result
 */
export type ResearchResult = 'positive' | 'negative' | 'inconclusive';

/**
 * Common properties shared by all research entities
 */
export interface ResearchEntityCommon {
	cr_type: ResearchEntityType;
	cr_id?: string;
	title?: string;
	private?: boolean;
	up?: string; // Wikilink to parent in hierarchy
	related?: string | string[]; // Wikilinks to related research entities
}

/**
 * Research Project frontmatter
 *
 * Hub for complex, multi-phase research cases.
 */
export interface ResearchProjectFrontmatter extends ResearchEntityCommon {
	cr_type: 'research_project';
	status?: ResearchProjectStatus;
	research_level?: ResearchLevel;
}

/**
 * Research Report frontmatter
 *
 * Living/working document analyzing specific research question with findings and evidence.
 */
export interface ResearchReportFrontmatter extends ResearchEntityCommon {
	cr_type: 'research_report';
	status?: ResearchReportStatus;
	reportTo?: ReportAudience;
}

/**
 * Individual Research Note (IRN) frontmatter
 *
 * Synthesis document between research reports and person notes,
 * combining analysis across multiple sources.
 */
export interface IndividualResearchNoteFrontmatter extends ResearchEntityCommon {
	cr_type: 'individual_research_note';
	subject?: string; // Wikilink to person note being researched
	status?: IRNStatus;
}

/**
 * Research Journal frontmatter
 *
 * Daily/session-level research log for tracking activity across projects.
 */
export interface ResearchJournalFrontmatter extends ResearchEntityCommon {
	cr_type: 'research_journal';
	date?: string; // Date of journal entry
	repositories?: string | string[]; // Wikilinks to repositories visited
}

/**
 * Research Log Entry frontmatter (optional separate notes)
 *
 * For users who prefer queryable research logs as separate notes
 * rather than embedded in Research Project markdown.
 */
export interface ResearchLogEntryFrontmatter extends ResearchEntityCommon {
	cr_type: 'research_log_entry';
	date?: string;
	project?: string; // Wikilink to parent Research Project
	source?: string; // Wikilink to source searched
	searched_for?: string;
	result?: ResearchResult;
}

/**
 * Union type for all research entity frontmatter types
 */
export type ResearchEntityFrontmatter =
	| ResearchProjectFrontmatter
	| ResearchReportFrontmatter
	| IndividualResearchNoteFrontmatter
	| ResearchJournalFrontmatter
	| ResearchLogEntryFrontmatter;

/**
 * Research entity metadata for display purposes
 */
export interface ResearchEntityTypeInfo {
	type: ResearchEntityType;
	displayName: string;
	description: string;
	icon: string; // Lucide icon name
}

/**
 * Research entity type metadata
 */
export const RESEARCH_ENTITY_INFO: Record<ResearchEntityType, ResearchEntityTypeInfo> = {
	research_project: {
		type: 'research_project',
		displayName: 'Research project',
		description: 'Hub for complex, multi-phase research cases',
		icon: 'folder-search'
	},
	research_report: {
		type: 'research_report',
		displayName: 'Research report',
		description: 'Analysis document with findings and evidence',
		icon: 'file-text'
	},
	individual_research_note: {
		type: 'individual_research_note',
		displayName: 'Individual research note',
		description: 'Synthesis document for a person across sources',
		icon: 'user-search'
	},
	research_journal: {
		type: 'research_journal',
		displayName: 'Research journal',
		description: 'Daily/session-level research log',
		icon: 'book-open'
	},
	research_log_entry: {
		type: 'research_log_entry',
		displayName: 'Research log entry',
		description: 'Individual log entry for queryable tracking',
		icon: 'list-plus'
	}
};

/**
 * Research project status metadata for display
 */
export const RESEARCH_PROJECT_STATUSES: Record<ResearchProjectStatus, { displayName: string; color: string }> = {
	'open': { displayName: 'Open', color: 'var(--text-muted)' },
	'in-progress': { displayName: 'In progress', color: 'var(--color-blue)' },
	'on-hold': { displayName: 'On hold', color: 'var(--color-yellow)' },
	'completed': { displayName: 'Completed', color: 'var(--color-green)' }
};

/**
 * Research report status metadata for display
 */
export const RESEARCH_REPORT_STATUSES: Record<ResearchReportStatus, { displayName: string; color: string }> = {
	'draft': { displayName: 'Draft', color: 'var(--text-muted)' },
	'review': { displayName: 'Review', color: 'var(--color-yellow)' },
	'final': { displayName: 'Final', color: 'var(--color-blue)' },
	'published': { displayName: 'Published', color: 'var(--color-green)' }
};

/**
 * Report audience metadata for display
 */
export const REPORT_AUDIENCES: Record<ReportAudience, { displayName: string; description: string }> = {
	'File': { displayName: 'File', description: 'Personal reference only' },
	'Family': { displayName: 'Family', description: 'Sharing with family members' },
	'Client': { displayName: 'Client', description: 'Professional genealogy client' },
	'Public': { displayName: 'Public', description: 'Public publication' },
	'Print': { displayName: 'Print', description: 'Printed publication' }
};

/**
 * Check if a cr_type value is a research entity type
 */
export function isResearchEntityType(crType: string | undefined): crType is ResearchEntityType {
	return typeof crType === 'string' && RESEARCH_ENTITY_TYPES.includes(crType as ResearchEntityType);
}
