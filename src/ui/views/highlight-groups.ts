/**
 * Highlight groups for the family chart (#379).
 *
 * Users pick a person property (e.g. occupation, caste, religion) and a value;
 * matching cards get a colored outline, non-matching cards are dimmed. Up to
 * MAX_HIGHLIGHT_GROUPS concurrent groups are supported; when a person matches
 * multiple groups, first-match-wins for the visual color.
 */

import type { PersonNode } from '../../core/family-graph';

export interface HighlightGroup {
	id: string;
	/** Frontmatter key / PersonNode field to match against */
	field: HighlightField;
	/** Value to match. Exact, case-insensitive string equality in v1. */
	value: string;
	/** Palette key; see HIGHLIGHT_COLORS */
	color: HighlightColor;
	/** User-set label shown in the group list (optional; defaults to "field = value") */
	label?: string;
	enabled: boolean;
}

export type HighlightField =
	| 'sex'
	| 'occupation'
	| 'title'
	| 'religion'
	| 'caste'
	| 'nationality'
	| 'universe'
	| 'group_name';

export type HighlightColor = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'teal';

export const HIGHLIGHT_FIELDS: { value: HighlightField; label: string }[] = [
	{ value: 'sex', label: 'Sex' },
	{ value: 'occupation', label: 'Occupation' },
	{ value: 'title', label: 'Title' },
	{ value: 'religion', label: 'Religion' },
	{ value: 'caste', label: 'Caste' },
	{ value: 'nationality', label: 'Nationality' },
	{ value: 'universe', label: 'Universe' },
	{ value: 'group_name', label: 'Collection' }
];

export const HIGHLIGHT_COLORS: { value: HighlightColor; label: string; hex: string }[] = [
	{ value: 'gold', label: 'Gold', hex: '#d4a017' },
	{ value: 'blue', label: 'Blue', hex: '#3b82f6' },
	{ value: 'green', label: 'Green', hex: '#22c55e' },
	{ value: 'purple', label: 'Purple', hex: '#a855f7' },
	{ value: 'red', label: 'Red', hex: '#ef4444' },
	{ value: 'teal', label: 'Teal', hex: '#14b8a6' }
];

export const MAX_HIGHLIGHT_GROUPS = 3;

/**
 * Extract a highlight field value from a PersonNode. Returns a lowercased string
 * for case-insensitive comparison, or null if the field is absent.
 */
export function getHighlightFieldValue(person: PersonNode, field: HighlightField): string | null {
	let raw: unknown;
	switch (field) {
		case 'sex': raw = person.sex; break;
		case 'occupation': raw = person.occupation; break;
		case 'title': raw = person.title; break;
		case 'religion': raw = person.religion; break;
		case 'caste': raw = person.caste; break;
		case 'nationality': raw = person.nationality; break;
		case 'universe': raw = person.universe; break;
		case 'group_name': raw = person.collection ?? person.collectionName; break;
	}
	if (raw === undefined || raw === null) return null;
	// All person fields we read here are primitives (string / number); narrow explicitly.
	if (typeof raw !== 'string' && typeof raw !== 'number') return null;
	const str = String(raw).trim();
	return str === '' ? null : str.toLowerCase();
}

/**
 * Normalize a value for matching, handling field-specific canonical forms.
 * PersonNode.sex is stored as the canonical "M"/"F"/"X"/"U" (via resolveGender),
 * so the user's input ("male", "man") also needs to map to canonical form for
 * comparison. Other fields (occupation, religion, etc.) are free-text and don't
 * need this treatment.
 */
function normalizeForField(value: string, field: HighlightField): string {
	const v = value.trim().toLowerCase();
	if (field === 'sex') {
		const sexAliases: Record<string, string> = {
			'm': 'm', 'male': 'm', 'man': 'm', 'boy': 'm',
			'f': 'f', 'female': 'f', 'woman': 'f', 'girl': 'f',
			'x': 'x', 'nonbinary': 'x', 'non-binary': 'x', 'nb': 'x', 'enby': 'x', 'other': 'x',
			'u': 'u', 'unknown': 'u', 'unspecified': 'u', '': 'u'
		};
		return sexAliases[v] ?? v;
	}
	return v;
}

/**
 * True when the person's value for this group's field matches the group's target value
 * (case-insensitive exact match, with field-specific canonical normalization).
 */
export function personMatchesGroup(person: PersonNode, group: HighlightGroup): boolean {
	if (!group.enabled) return false;
	const personValue = getHighlightFieldValue(person, group.field);
	if (personValue === null) return false;
	const personNormalized = normalizeForField(personValue, group.field);
	const groupNormalized = normalizeForField(group.value, group.field);
	return personNormalized === groupNormalized;
}

/**
 * Find the first enabled group that a person matches, or null.
 * First-match-wins: earlier groups in the list take priority for visual styling.
 */
export function firstMatchingGroup(person: PersonNode, groups: HighlightGroup[]): HighlightGroup | null {
	for (const group of groups) {
		if (personMatchesGroup(person, group)) return group;
	}
	return null;
}
