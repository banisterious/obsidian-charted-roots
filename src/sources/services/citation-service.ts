/**
 * Citation Service for Evidence & Source Management
 *
 * Generates citations in standard academic and genealogical formats:
 * - Chicago Manual of Style
 * - Evidence Explained (Elizabeth Shown Mills)
 * - MLA (Modern Language Association)
 * - Turabian
 */

import type { SourceNote, CitationFormat } from '../types/source-types';

/**
 * Citation output format
 */
export interface Citation {
	/** The formatted citation text */
	text: string;
	/** Format used */
	format: CitationFormat;
	/** Whether the citation is complete or missing data */
	isComplete: boolean;
	/** List of missing fields that would improve the citation */
	missingFields: string[];
}

/**
 * Generate a citation for a source in the specified format
 */
export function generateCitation(source: SourceNote, format: CitationFormat): Citation {
	const missingFields: string[] = [];

	// Check for essential fields
	if (!source.date) missingFields.push('date');
	if (!source.repository) missingFields.push('repository');

	let text: string;

	switch (format) {
		case 'chicago':
			text = generateChicagoCitation(source, missingFields);
			break;
		case 'evidence_explained':
			text = generateEvidenceExplainedCitation(source, missingFields);
			break;
		case 'mla':
			text = generateMLACitation(source, missingFields);
			break;
		case 'turabian':
			text = generateTurabianCitation(source, missingFields);
			break;
		default:
			text = generateChicagoCitation(source, missingFields);
	}

	return {
		text,
		format,
		isComplete: missingFields.length === 0,
		missingFields
	};
}

/**
 * Generate Chicago Manual of Style citation
 *
 * Chicago style emphasizes source location and access information.
 * Format varies by source type.
 */
function generateChicagoCitation(source: SourceNote, _missingFields: string[]): string {
	// Handle citation override
	if (source.citationOverride) {
		return source.citationOverride;
	}

	const parts: string[] = [];

	// Title (required)
	parts.push(`"${source.title}."`);

	// Collection/Database
	if (source.collection) {
		parts.push(source.collection + '.');
	}

	// Repository
	if (source.repository) {
		if (source.repositoryUrl) {
			parts.push(`${source.repository}, ${source.repositoryUrl}.`);
		} else {
			parts.push(source.repository + '.');
		}
	}

	// Location
	if (source.location) {
		parts.push(source.location + '.');
	}

	// Date of document
	if (source.date) {
		parts.push(formatDate(source.date) + '.');
	}

	// Access date for online sources
	if (source.repositoryUrl && source.dateAccessed) {
		parts.push(`Accessed ${formatDate(source.dateAccessed)}.`);
	}

	return parts.join(' ');
}

/**
 * Generate Evidence Explained citation
 *
 * Evidence Explained format by Elizabeth Shown Mills is the standard
 * for genealogical research. It emphasizes layered citation with
 * source of the source.
 */
function generateEvidenceExplainedCitation(source: SourceNote, _missingFields: string[]): string {
	// Handle citation override
	if (source.citationOverride) {
		return source.citationOverride;
	}

	const parts: string[] = [];

	// Source label based on type
	const sourceLabel = getEvidenceExplainedLabel(source.sourceType);

	// Location (jurisdiction first in EE style)
	if (source.location) {
		parts.push(source.location + ',');
	}

	// Title with document type
	parts.push(`${sourceLabel}: "${source.title}"`);

	// Date of document
	if (source.date) {
		parts.push(`(${formatDate(source.date)})`);
	}

	// Add semicolon before citing source of source
	if (parts.length > 0) {
		// Remove trailing punctuation from last part for semicolon
		const lastIdx = parts.length - 1;
		parts[lastIdx] = parts[lastIdx].replace(/[.,;]$/, '') + ';';
	}

	// Collection (source of source)
	if (source.collection) {
		parts.push(source.collection + ',');
	}

	// Repository
	if (source.repository) {
		parts.push(source.repository);
	}

	// URL and access date
	if (source.repositoryUrl) {
		parts.push(`(${source.repositoryUrl} : accessed ${source.dateAccessed ? formatDate(source.dateAccessed) : 'n.d.'})`);
	}

	return parts.join(' ').replace(/,\s*;/g, ';').replace(/\s+/g, ' ').trim() + '.';
}

/**
 * Generate MLA citation
 *
 * MLA style is commonly used in humanities. It emphasizes
 * author, title, container, and access information.
 */
function generateMLACitation(source: SourceNote, _missingFields: string[]): string {
	// Handle citation override
	if (source.citationOverride) {
		return source.citationOverride;
	}

	const parts: string[] = [];

	// Title in quotes
	parts.push(`"${source.title}."`);

	// Container (collection/database)
	if (source.collection) {
		parts.push(`*${source.collection}*,`);
	} else if (source.repository) {
		parts.push(`*${source.repository}*,`);
	}

	// Date
	if (source.date) {
		parts.push(formatDate(source.date) + '.');
	}

	// Location
	if (source.location) {
		parts.push(source.location + '.');
	}

	// URL (MLA uses URL without angle brackets as of 8th edition)
	if (source.repositoryUrl) {
		parts.push(source.repositoryUrl + '.');
	}

	// Access date
	if (source.dateAccessed) {
		parts.push(`Accessed ${formatDate(source.dateAccessed)}.`);
	}

	return parts.join(' ');
}

/**
 * Generate Turabian citation
 *
 * Turabian is based on Chicago style but simplified for students.
 * Similar structure with minor differences.
 */
function generateTurabianCitation(source: SourceNote, _missingFields: string[]): string {
	// Handle citation override
	if (source.citationOverride) {
		return source.citationOverride;
	}

	const parts: string[] = [];

	// Title
	parts.push(`"${source.title}."`);

	// Collection
	if (source.collection) {
		parts.push(source.collection + '.');
	}

	// Repository and location
	if (source.repository) {
		const repoInfo = source.location
			? `${source.repository}, ${source.location}`
			: source.repository;
		parts.push(repoInfo + '.');
	} else if (source.location) {
		parts.push(source.location + '.');
	}

	// Date
	if (source.date) {
		parts.push(formatDate(source.date) + '.');
	}

	// URL and access date
	if (source.repositoryUrl) {
		parts.push(source.repositoryUrl + '.');
		if (source.dateAccessed) {
			parts.push(`Accessed ${formatDate(source.dateAccessed)}.`);
		}
	}

	return parts.join(' ');
}

/**
 * Get Evidence Explained source type label
 */
function getEvidenceExplainedLabel(sourceType: string): string {
	const labels: Record<string, string> = {
		vital_record: 'Vital Record',
		census: 'Census',
		church_record: 'Church Record',
		court_record: 'Court Record',
		land_deed: 'Land Record',
		probate: 'Probate Record',
		military: 'Military Record',
		immigration: 'Immigration Record',
		obituary: 'Obituary',
		newspaper: 'Newspaper Article',
		correspondence: 'Personal Correspondence',
		photo: 'Photograph',
		oral_history: 'Oral History'
	};

	return labels[sourceType] || 'Document';
}

/**
 * Format a date string for citation
 *
 * Handles various input formats and outputs readable dates.
 */
function formatDate(dateStr: string): string {
	// Try to parse as ISO date
	const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		const monthIdx = parseInt(month, 10) - 1;
		const dayNum = parseInt(day, 10);
		return `${dayNum} ${monthNames[monthIdx]} ${year}`;
	}

	// Try year-month format
	const yearMonthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
	if (yearMonthMatch) {
		const [, year, month] = yearMonthMatch;
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		const monthIdx = parseInt(month, 10) - 1;
		return `${monthNames[monthIdx]} ${year}`;
	}

	// Year only
	const yearMatch = dateStr.match(/^\d{4}$/);
	if (yearMatch) {
		return dateStr;
	}

	// Return as-is if can't parse
	return dateStr;
}

/**
 * Get all available citation formats
 */
export function getCitationFormats(): Array<{ id: CitationFormat; name: string; description: string }> {
	return [
		{
			id: 'chicago',
			name: 'Chicago',
			description: 'Chicago Manual of Style - widely used in publishing and academia'
		},
		{
			id: 'evidence_explained',
			name: 'Evidence Explained',
			description: 'Elizabeth Shown Mills style - standard for genealogical research'
		},
		{
			id: 'mla',
			name: 'MLA',
			description: 'Modern Language Association - common in humanities'
		},
		{
			id: 'turabian',
			name: 'Turabian',
			description: 'Based on Chicago, simplified for students'
		}
	];
}

/**
 * Generate all citation formats for a source
 */
export function generateAllCitations(source: SourceNote): Record<CitationFormat, Citation> {
	return {
		chicago: generateCitation(source, 'chicago'),
		evidence_explained: generateCitation(source, 'evidence_explained'),
		mla: generateCitation(source, 'mla'),
		turabian: generateCitation(source, 'turabian')
	};
}

/**
 * Copy citation to clipboard
 */
export async function copyCitationToClipboard(citation: Citation): Promise<void> {
	await navigator.clipboard.writeText(citation.text);
}
