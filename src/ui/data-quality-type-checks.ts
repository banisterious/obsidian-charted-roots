/**
 * Pure checks for mistyped type/identity frontmatter values (#758).
 *
 * Text/identity fields like `event_type` are meant to hold a word (e.g.
 * `divorce`). When a bare number or date is entered (`event_type: 1850`), YAML
 * parses it as a number/date rather than text, which can break type-matching
 * downstream — a single such value stopped the whole map refresh in #746.
 *
 * These helpers detect such values and coerce them back to text, so a batch
 * operation can clean them up without the user hunting note-by-note.
 */

/**
 * Per-`cr_type` text/identity fields to validate, in addition to `cr_type`
 * itself (which every entity note carries).
 */
const TYPE_FIELDS_BY_CR_TYPE: Record<string, string[]> = {
	event: ['event_type'],
	place: ['place_category'],
	organization: ['org_type'],
	source: ['source_type'],
};

/** A frontmatter field whose stored value isn't the expected text. */
export interface MistypedTypeField {
	/** The frontmatter property name (e.g. `event_type`). */
	property: string;
	/** The raw parsed value as read from the metadata cache. */
	value: unknown;
	/** The value coerced to its intended text form. */
	coerced: string;
}

/**
 * Coerce a mistyped type value back to text. Numbers and booleans stringify
 * directly; a Date renders as a plain `YYYY-MM-DD` (the bare date a user most
 * likely typed) rather than a full timestamp.
 */
export function coerceTypeValueToText(value: unknown): string {
	if (value instanceof Date) {
		// Local date parts — avoid the timezone shift a UTC ISO slice can cause.
		const y = value.getFullYear();
		const m = String(value.getMonth() + 1).padStart(2, '0');
		const d = String(value.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	return String(value);
}

/**
 * Inspect a note's frontmatter and return any text/identity fields holding a
 * non-text value. Arrays are left alone (multi-value handling is a separate
 * concern), as are absent/null/empty values.
 */
export function findMistypedTypeFields(fm: Record<string, unknown>): MistypedTypeField[] {
	const crType = typeof fm.cr_type === 'string' ? fm.cr_type : undefined;

	const fields = new Set<string>(['cr_type']);
	if (crType && TYPE_FIELDS_BY_CR_TYPE[crType]) {
		for (const field of TYPE_FIELDS_BY_CR_TYPE[crType]) {
			fields.add(field);
		}
	}

	const mistyped: MistypedTypeField[] = [];
	for (const property of fields) {
		if (!(property in fm)) continue;
		const value = fm[property];
		if (value === null || value === undefined || value === '') continue;
		if (typeof value === 'string') continue;
		// A list value is out of scope for this check.
		if (Array.isArray(value)) continue;
		mistyped.push({ property, value, coerced: coerceTypeValueToText(value) });
	}
	return mistyped;
}
