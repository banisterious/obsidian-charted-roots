/**
 * Place Name Normalizer
 *
 * Utilities for normalizing and standardizing place names.
 * Handles US state abbreviations, county abbreviations, and common formatting issues.
 */

/**
 * US state abbreviations mapped to full names
 */
export const US_STATE_ABBREVIATIONS: Record<string, string> = {
	'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
	'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
	'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
	'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
	'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
	'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
	'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
	'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
	'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
	'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
	'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
	'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
	'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

/**
 * Set of all US state full names (lowercase for matching)
 */
export const US_STATE_NAMES = new Set(
	Object.values(US_STATE_ABBREVIATIONS).map(s => s.toLowerCase())
);

/**
 * Check if a string is a US state name (full or abbreviated)
 */
export function isUSState(value: string): boolean {
	const upper = value.toUpperCase().trim();
	const lower = value.toLowerCase().trim();
	return US_STATE_ABBREVIATIONS[upper] !== undefined || US_STATE_NAMES.has(lower);
}

/**
 * Get the full US state name from an abbreviation or return the input if not found
 */
export function expandStateAbbreviation(abbr: string): string {
	const upper = abbr.toUpperCase().trim();
	return US_STATE_ABBREVIATIONS[upper] || abbr;
}

/**
 * Normalize a hierarchical place name string
 *
 * Performs the following normalizations:
 * 1. Expand US state abbreviations (CT → Connecticut)
 * 2. Expand "Co"/"CO" to "County" when it appears to be an abbreviation
 * 3. Remove empty parts (double commas)
 * 4. Append "USA" when a US state is detected without a country
 * 5. Trim whitespace from all parts
 *
 * @param placeName - The place name to normalize (e.g., "Union Valley, Hunt Co, TX")
 * @returns The normalized place name (e.g., "Union Valley, Hunt County, Texas, USA")
 */
export function normalizePlaceName(placeName: string): string {
	if (!placeName || !placeName.trim()) {
		return placeName;
	}

	// Split on commas
	let parts = placeName.split(',').map(p => p.trim()).filter(p => p !== '');

	// Track if we found a US state (to decide whether to append USA)
	let hasUSState = false;
	let hasCountry = false;

	// Process each part
	parts = parts.map((part, index) => {
		// Check if this part is a US state abbreviation
		const upperPart = part.toUpperCase();
		if (US_STATE_ABBREVIATIONS[upperPart]) {
			hasUSState = true;
			return US_STATE_ABBREVIATIONS[upperPart];
		}

		// Check if this is already a full US state name
		if (US_STATE_NAMES.has(part.toLowerCase())) {
			hasUSState = true;
			// Capitalize properly
			return expandStateAbbreviation(part) || part;
		}

		// Check for "USA", "United States", etc.
		const lowerPart = part.toLowerCase();
		if (lowerPart === 'usa' || lowerPart === 'united states' || lowerPart === 'united states of america') {
			hasCountry = true;
			return 'USA';
		}

		// Check for space-separated state abbreviation at the end (e.g., "Abbeville SC")
		const words = part.split(' ');
		if (words.length >= 2) {
			const lastWord = words[words.length - 1].toUpperCase();
			if (US_STATE_ABBREVIATIONS[lastWord]) {
				hasUSState = true;
				// Split into locality and state
				const locality = words.slice(0, -1).join(' ');
				const state = US_STATE_ABBREVIATIONS[lastWord];
				// Return as separate parts (will be joined later)
				return `${locality}, ${state}`;
			}
		}

		// Expand "Co" or "CO" to "County" when it's part of a county name
		// Be careful not to expand "Colorado" or standalone "CO" that means Colorado
		const expandedCounty = expandCountyAbbreviation(part);
		if (expandedCounty !== part) {
			return expandedCounty;
		}

		return part;
	});

	// Flatten any parts that were split (e.g., "Abbeville, South Carolina" from "Abbeville SC")
	parts = parts.flatMap(p => p.includes(',') ? p.split(',').map(s => s.trim()) : [p]);

	// Remove any empty parts that resulted from processing
	parts = parts.filter(p => p !== '');

	// Append USA if we found a US state but no country
	if (hasUSState && !hasCountry) {
		// Check if the last part looks like a country
		const lastPart = parts[parts.length - 1]?.toLowerCase() || '';
		const commonCountries = ['usa', 'uk', 'canada', 'england', 'scotland', 'ireland', 'wales',
			'germany', 'france', 'italy', 'spain', 'australia', 'mexico'];
		if (!commonCountries.includes(lastPart) && lastPart !== 'united states') {
			parts.push('USA');
		}
	}

	return parts.join(', ');
}

/**
 * Expand "Co" or "CO" to "County" when it appears to be an abbreviation
 *
 * Handles patterns like:
 * - "Hunt Co" → "Hunt County"
 * - "Hunt Co." → "Hunt County"
 * - "Rockwall CO" → "Rockwall County"
 *
 * Does NOT expand:
 * - "CO" alone (could be Colorado)
 * - "Company" or words containing "co"
 */
function expandCountyAbbreviation(part: string): string {
	// Pattern: word(s) followed by "Co" or "CO" or "Co." at the end
	// Must have at least one word before "Co"
	const coPattern = /^(.+?)\s+(Co\.?|CO\.?)$/i;
	const match = part.match(coPattern);

	if (match) {
		const prefix = match[1];
		// Make sure the prefix isn't empty and doesn't look like it's part of another word
		if (prefix.trim()) {
			return `${prefix} County`;
		}
	}

	return part;
}

/**
 * Normalize an array of place names
 */
export function normalizePlaceNames(placeNames: string[]): string[] {
	return placeNames.map(normalizePlaceName);
}

/**
 * Result of place name normalization with change tracking
 */
export interface NormalizationResult {
	original: string;
	normalized: string;
	changed: boolean;
}

/**
 * Normalize place names and track which ones changed
 */
export function normalizePlaceNamesWithTracking(placeNames: string[]): NormalizationResult[] {
	return placeNames.map(original => {
		const normalized = normalizePlaceName(original);
		return {
			original,
			normalized,
			changed: original !== normalized
		};
	});
}
