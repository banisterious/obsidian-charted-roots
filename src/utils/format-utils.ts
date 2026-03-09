/**
 * Shared formatting utilities
 */

/**
 * Format a pronouns value (string or array) for display.
 * Returns a comma-separated string, or empty string if undefined.
 */
export function formatPronouns(pronouns: string | string[] | undefined): string {
	if (!pronouns) return '';
	return Array.isArray(pronouns) ? pronouns.join(', ') : pronouns;
}
