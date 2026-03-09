/**
 * Shared formatting utilities
 */

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Return singular or plural form based on count.
 * If plural is omitted, appends 's' to singular.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural ?? singular + 's');
}

/**
 * Split a string by separator, trim each part, and remove empty strings.
 */
export function splitAndTrim(str: string, separator = ','): string[] {
	return str.split(separator).map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Format a pronouns value (string or array) for display.
 * Returns a comma-separated string, or empty string if undefined.
 */
export function formatPronouns(pronouns: string | string[] | undefined): string {
	if (!pronouns) return '';
	return Array.isArray(pronouns) ? pronouns.join(', ') : pronouns;
}
