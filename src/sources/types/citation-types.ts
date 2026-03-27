/**
 * Citation Types
 *
 * Types for citation notes — lightweight linkage records that connect
 * a source to a specific fact on a specific subject with page/quality metadata.
 * Each citation note represents one citation occurrence (one GEDCOM SOUR block).
 */

/**
 * GEDCOM QUAY (Quality Assessment) values
 * Maps to GEDCOM 5.5.1 specification for source citation quality
 */
export type CitationQuality = 0 | 1 | 2 | 3;

/** Human-readable labels for citation quality values */
export const CITATION_QUALITY_LABELS: Record<CitationQuality, string> = {
	0: 'Unreliable',
	1: 'Questionable',
	2: 'Secondary evidence',
	3: 'Primary evidence'
};

/**
 * A citation note linking a source to a specific fact on a subject
 */
export interface CitationNote {
	/** File path in the vault */
	filePath: string;
	/** Unique CR identifier */
	crId: string;
	/** Wikilink to the source note */
	source: string;
	/** CR ID of the source note */
	sourceCrId?: string;
	/** Wikilink to the subject (person or event) note */
	subject: string;
	/** CR ID of the subject note */
	subjectCrId?: string;
	/** The frontmatter property being supported (e.g., 'birth_date', 'death_place') */
	fact: string;
	/** Page/location within the source (GEDCOM PAGE) */
	page?: string;
	/** Quality assessment 0-3 (GEDCOM QUAY) */
	quality?: CitationQuality;
}

/**
 * Data needed to create a new citation note
 */
export interface CitationData {
	/** Wikilink to the source note */
	source: string;
	/** CR ID of the source note */
	sourceCrId?: string;
	/** Wikilink to the subject note */
	subject: string;
	/** CR ID of the subject note */
	subjectCrId?: string;
	/** The fact being cited */
	fact: string;
	/** Page/location within the source */
	page?: string;
	/** Quality assessment 0-3 */
	quality?: CitationQuality;
}
