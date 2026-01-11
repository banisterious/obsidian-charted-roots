/**
 * Terminology helpers for configurable UI labels
 *
 * These helpers allow users to customize terminology throughout the UI
 * without affecting the underlying data model or frontmatter properties.
 */

import type { CanvasRootsSettings } from '../settings';

/**
 * Get the appropriate label for romantic relationships based on user preference.
 * @param settings Plugin settings (defaults to 'spouse' terminology if undefined)
 * @param options.plural Return plural form ("Spouses" or "Partners")
 * @param options.lowercase Return lowercase form
 */
export function getSpouseLabel(
	settings: CanvasRootsSettings | undefined,
	options?: { plural?: boolean; lowercase?: boolean }
): string {
	const isPartner = settings?.romanticRelationshipLabel === 'partner';
	let label: string;

	if (options?.plural) {
		label = isPartner ? 'Partners' : 'Spouses';
	} else {
		label = isPartner ? 'Partner' : 'Spouse';
	}

	return options?.lowercase ? label.toLowerCase() : label;
}

/**
 * Get action label like "Add spouse" or "Add partner"
 */
export function getAddSpouseLabel(settings: CanvasRootsSettings | undefined): string {
	return `Add ${getSpouseLabel(settings, { lowercase: true })}`;
}

/**
 * Get compound labels like "Spouse arrows" or "Partner arrows"
 */
export function getSpouseCompoundLabel(
	settings: CanvasRootsSettings | undefined,
	suffix: string
): string {
	return `${getSpouseLabel(settings)} ${suffix}`;
}
