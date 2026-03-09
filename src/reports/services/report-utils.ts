/**
 * Shared utilities for report generators.
 */

import type { PersonNode } from '../../core/family-graph';
import type { ReportPerson } from '../types/report-types';

/**
 * Normalize a sex/gender string to the canonical ReportPerson sex type.
 */
export function normalizeSex(sex?: string): 'male' | 'female' | 'other' | 'unknown' | undefined {
	if (!sex) return undefined;
	const lower = sex.toLowerCase();
	if (lower === 'male' || lower === 'm') return 'male';
	if (lower === 'female' || lower === 'f') return 'female';
	if (lower === 'other') return 'other';
	return 'unknown';
}

/**
 * Convert a PersonNode to a ReportPerson for use in report output.
 */
export function nodeToReportPerson(node: PersonNode): ReportPerson {
	return {
		crId: node.crId,
		name: node.name,
		birthDate: node.birthDate,
		birthPlace: node.birthPlace,
		deathDate: node.deathDate,
		deathPlace: node.deathPlace,
		sex: normalizeSex(node.sex),
		pronouns: node.pronouns,
		occupation: node.occupation,
		filePath: node.file.path,
		researchLevel: node.researchLevel
	};
}
