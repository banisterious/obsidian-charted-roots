/**
 * Image Filename Parser Service
 *
 * Parses genealogy source image filenames to extract metadata like surnames,
 * years, record types, and locations. Handles messy, inconsistent naming
 * conventions common in real-world collections.
 */

/** Parsed metadata from an image filename */
export interface ParsedImageFilename {
	originalFilename: string;
	extension: string;
	surnames: string[];
	givenNames: string[];
	birthYear?: number;
	recordYear?: number;
	recordType?: string;
	location?: {
		country?: string;
		state?: string;
	};
	partIndicator?: string;
	isMultiPart: boolean;
	uncertaintyMarker?: string;
	confidence: 'high' | 'medium' | 'low';
}

/** Record type mappings from filename tokens */
const RECORD_TYPE_MAPPINGS: Record<string, string> = {
	// Census
	census: 'census',
	cens: 'census',

	// Vital records
	birth: 'vital_record',
	birth_record: 'vital_record',
	birth_certificate: 'vital_record',
	birth_cert: 'vital_record',
	death: 'vital_record',
	death_record: 'vital_record',
	death_certificate: 'vital_record',
	death_cert: 'vital_record',
	marriage: 'vital_record',
	marriage_record: 'vital_record',
	marriage_certificate: 'vital_record',
	marriage_cert: 'vital_record',
	marriage_license: 'vital_record',
	wedding: 'vital_record',
	divorce: 'court_record',

	// Obituaries
	obit: 'obituary',
	obituary: 'obituary',

	// Military
	military: 'military',
	draft: 'military',
	draft_card: 'military',
	draft_registration: 'military',
	wwi_draft: 'military',
	wwii_draft: 'military',
	civil_war: 'military',
	civil_war_record: 'military',

	// Immigration
	immigration: 'immigration',
	passenger: 'immigration',
	passenger_list: 'immigration',
	passenger_manifest: 'immigration',
	pas_list: 'immigration',
	ellis_island: 'immigration',

	// Cemetery
	cemetery: 'cemetery',
	burial: 'cemetery',
	burial_record: 'cemetery',
	gravestone: 'cemetery',
	grave: 'cemetery',

	// Photos
	photo: 'photo',
	photograph: 'photo',
	portrait: 'photo',

	// Other
	family_record: 'custom',
	family: 'custom',
};

/** US state codes */
const US_STATES = new Set([
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
]);

/** Multi-part indicator patterns */
const PART_PATTERNS = [
	/^p(\d+)$/i, // p1, p2
	/^page(\d+)$/i, // page1, page2
	/^part([a-z])$/i, // partA, partB
	/^([a-z])$/i, // a, b, c (single letter)
	/^(\d{2})$/, // 01, 02
	/^(\d+)$/, // 1, 2
];

/** Uncertainty markers */
const UNCERTAINTY_MARKERS = ['maybe', 'possibly', 'unverified', 'questionable', 'pos_wrong', 'uncertain'];

/** Edit/version suffixes to strip */
const EDIT_SUFFIXES = ['final', 'v2', 'v3', 'edited', 'cropped', 'enhanced', 'contrast'];

/** Common given names for detection */
const COMMON_GIVEN_NAMES = new Set([
	'william',
	'john',
	'james',
	'george',
	'charles',
	'thomas',
	'henry',
	'robert',
	'edward',
	'joseph',
	'mary',
	'elizabeth',
	'margaret',
	'ann',
	'anna',
	'sarah',
	'jane',
	'ellen',
	'dorothy',
	'helen',
	'rosa',
	'linda',
	'eugene',
	'ward',
	'chester',
	'francis',
	'frances',
	'walter',
	'frank',
	'arthur',
	'albert',
	'harold',
	'paul',
	'carl',
	'raymond',
	'earl',
	'martha',
	'ruth',
	'alice',
	'clara',
	'mildred',
	'florence',
	'edith',
	'grace',
	'emma',
]);

/** Non-name tokens to skip */
const SKIP_TOKENS = new Set([
	'and',
	'for',
	'the',
	'of',
	'in',
	'at',
	'to',
	'from',
	'by',
	'with',
	'usa',
	'uk',
	'england',
	'ireland',
	'germany',
	'record',
	'certificate',
	'cert',
	'card',
	'registration',
	'reg',
	'list',
	'manifest',
	'herald',
	'chronicle',
	'times',
	'memorial',
	'park',
	'island',
	'ss', // ship prefix
	'scan',
	'img',
	'document',
	'photo',
	'image',
]);

/**
 * Parse an image filename to extract genealogy metadata
 */
export function parseFilename(filename: string): ParsedImageFilename {
	// Extract extension
	const lastDot = filename.lastIndexOf('.');
	const extension = lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
	const baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename;

	// Normalize: replace common separators with underscores, lowercase
	const normalized = baseName
		.replace(/[-.\s]+/g, '_')
		.replace(/[()]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.toLowerCase();

	// Tokenize
	const tokens = normalized.split('_').filter((t) => t.length > 0);

	const result: ParsedImageFilename = {
		originalFilename: filename,
		extension,
		surnames: [],
		givenNames: [],
		isMultiPart: false,
		confidence: 'low',
	};

	// Skip scanner/camera auto-named files early
	if (isAutoNamedFile(baseName)) {
		return result;
	}

	// Extract structured data from tokens
	const unclassifiedTokens: string[] = [];

	for (const token of tokens) {
		// Birth year (b1905, b1826)
		const birthMatch = token.match(/^b(\d{4})$/);
		if (birthMatch) {
			result.birthYear = parseInt(birthMatch[1], 10);
			continue;
		}

		// Death year (d1993)
		const deathMatch = token.match(/^d(\d{4})$/);
		if (deathMatch) {
			// Store as potential record year if no other year
			if (!result.recordYear) {
				result.recordYear = parseInt(deathMatch[1], 10);
			}
			continue;
		}

		// Record year (standalone 4-digit year 1800-2030)
		const yearMatch = token.match(/^(\d{4})$/);
		if (yearMatch) {
			const year = parseInt(yearMatch[1], 10);
			if (year >= 1800 && year <= 2030) {
				result.recordYear = year;
				continue;
			}
		}

		// US state code
		if (US_STATES.has(token.toUpperCase())) {
			result.location = result.location || {};
			result.location.state = token.toUpperCase();
			continue;
		}

		// Country code
		if (token === 'usa' || token === 'us') {
			result.location = result.location || {};
			result.location.country = 'USA';
			continue;
		}

		// Part indicator
		for (const pattern of PART_PATTERNS) {
			if (pattern.test(token)) {
				result.partIndicator = token;
				result.isMultiPart = true;
				break;
			}
		}
		if (result.partIndicator === token) continue;

		// Uncertainty marker
		if (UNCERTAINTY_MARKERS.includes(token)) {
			result.uncertaintyMarker = token;
			continue;
		}

		// Edit suffix (skip it)
		if (EDIT_SUFFIXES.includes(token)) {
			continue;
		}

		// Copy number like (1), (2) - already normalized to _1_, _2_
		if (/^\d$/.test(token)) {
			// Likely a copy number, skip
			continue;
		}

		// Record type
		const recordType = matchRecordType(token, tokens);
		if (recordType) {
			result.recordType = recordType;
			continue;
		}

		// Skip common non-name tokens
		if (SKIP_TOKENS.has(token)) {
			continue;
		}

		// Remaining tokens are potential names
		unclassifiedTokens.push(token);
	}

	// Classify remaining tokens as surnames/given names
	classifyNames(unclassifiedTokens, result);

	// Calculate confidence
	result.confidence = calculateConfidence(result);

	return result;
}

/**
 * Check if file appears to be auto-named by scanner/camera
 */
function isAutoNamedFile(baseName: string): boolean {
	const lower = baseName.toLowerCase();
	return (
		/^scan\d+$/i.test(lower) ||
		/^img_?\d+/i.test(lower) ||
		/^document\d*$/i.test(lower) ||
		/^photo\s+\d/i.test(lower) ||
		/^dsc\d+$/i.test(lower) ||
		/^image\d+$/i.test(lower)
	);
}

/**
 * Match a token to a record type, considering multi-token types
 */
function matchRecordType(token: string, allTokens: string[]): string | undefined {
	// Direct match
	if (RECORD_TYPE_MAPPINGS[token]) {
		return RECORD_TYPE_MAPPINGS[token];
	}

	// Multi-token record types (e.g., "birth_record", "passenger_list")
	const tokenIndex = allTokens.indexOf(token);
	if (tokenIndex >= 0 && tokenIndex < allTokens.length - 1) {
		const combined = `${token}_${allTokens[tokenIndex + 1]}`;
		if (RECORD_TYPE_MAPPINGS[combined]) {
			return RECORD_TYPE_MAPPINGS[combined];
		}
	}

	return undefined;
}

/**
 * Classify unclassified tokens as surnames or given names
 */
function classifyNames(tokens: string[], result: ParsedImageFilename): void {
	// Filter out very short tokens and numeric tokens
	const nameTokens = tokens.filter((t) => t.length >= 2 && !/^\d+$/.test(t));

	for (let i = 0; i < nameTokens.length; i++) {
		const token = nameTokens[i];
		const capitalized = capitalize(token);

		// If it's a common given name, add as given name
		if (COMMON_GIVEN_NAMES.has(token)) {
			result.givenNames.push(capitalized);
		}
		// First token that's not a given name is likely surname
		else if (result.surnames.length === 0) {
			result.surnames.push(capitalized);
		}
		// Additional tokens could be middle names or additional surnames
		else if (i === 1 && result.givenNames.length === 0) {
			// Second token when no given names found yet - likely given name
			result.givenNames.push(capitalized);
		} else {
			// Could be additional surname (e.g., "anderson_and_obrien")
			result.surnames.push(capitalized);
		}
	}
}

/**
 * Calculate confidence score based on extracted data
 */
function calculateConfidence(result: ParsedImageFilename): 'high' | 'medium' | 'low' {
	let score = 0;

	// Surname is most important
	if (result.surnames.length > 0) score += 2;

	// Record type helps a lot
	if (result.recordType) score += 2;

	// Year is useful
	if (result.recordYear || result.birthYear) score += 1;

	// Location is a bonus
	if (result.location?.state) score += 1;

	// Given name is helpful
	if (result.givenNames.length > 0) score += 1;

	if (score >= 4) return 'high';
	if (score >= 2) return 'medium';
	return 'low';
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
	if (!str) return str;
	// Handle O'Brien style names
	if (str.startsWith('o') && str.length > 1 && str[1] !== "'") {
		// Check if it might be O'Name pattern (obrien -> O'Brien)
		const rest = str.substring(1);
		if (rest.length >= 4 && /^[a-z]+$/.test(rest)) {
			return "O'" + rest.charAt(0).toUpperCase() + rest.slice(1);
		}
	}
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Detect multi-part document groups from a list of filenames
 * Returns a map of base name -> list of filenames in the group
 */
export function detectMultiPartGroups(filenames: string[]): Map<string, string[]> {
	const groups = new Map<string, string[]>();
	const parsedFiles = filenames.map((f) => ({ filename: f, parsedData: parseFilename(f) }));

	// Build potential groups based on base name similarity
	for (const { filename, parsedData } of parsedFiles) {
		if (!parsedData.isMultiPart) continue;

		// Extract base name by removing part indicator
		const baseName = getBaseName(filename, parsedData.partIndicator);
		if (!baseName) continue;

		const existing = groups.get(baseName) || [];
		existing.push(filename);
		groups.set(baseName, existing);
	}

	// Filter out "groups" with only one file
	for (const [key, files] of groups) {
		if (files.length < 2) {
			groups.delete(key);
		} else {
			// Sort files within group
			groups.set(key, sortMultiPartFiles(files));
		}
	}

	return groups;
}

/**
 * Get the base name of a file by removing part indicators
 */
function getBaseName(filename: string, partIndicator?: string): string | undefined {
	if (!partIndicator) return undefined;

	const lastDot = filename.lastIndexOf('.');
	const baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename;

	// Normalize and remove part indicator
	const normalized = baseName
		.replace(/[-.\s]+/g, '_')
		.replace(/[()]/g, '_')
		.replace(/_+/g, '_')
		.toLowerCase();

	// Remove part indicator from end
	const partPattern = new RegExp(`_?${partIndicator}$`, 'i');
	return normalized.replace(partPattern, '');
}

/**
 * Sort multi-part files in logical order (a, b, c or 1, 2, 3 or p1, p2)
 */
function sortMultiPartFiles(files: string[]): string[] {
	return files.sort((a, b) => {
		const parsedA = parseFilename(a);
		const parsedB = parseFilename(b);

		const partA = parsedA.partIndicator || '';
		const partB = parsedB.partIndicator || '';

		// Extract numeric or alpha part
		const numA = parseInt(partA.replace(/\D/g, ''), 10);
		const numB = parseInt(partB.replace(/\D/g, ''), 10);

		if (!isNaN(numA) && !isNaN(numB)) {
			return numA - numB;
		}

		// Alphabetic comparison
		return partA.localeCompare(partB);
	});
}

/**
 * Map a record type token to the source type used in source notes
 */
export function mapToSourceType(typeToken: string): string {
	const normalized = typeToken.toLowerCase().replace(/[-\s]/g, '_');
	return RECORD_TYPE_MAPPINGS[normalized] || 'custom';
}

/**
 * Generate a standardized filename from parsed metadata
 * Format: surname_given_byyyy_type_yyyy_place.ext
 */
export function generateStandardFilename(parsed: ParsedImageFilename): string {
	const parts: string[] = [];

	// Surname(s)
	if (parsed.surnames.length > 0) {
		parts.push(parsed.surnames.map((s) => s.toLowerCase().replace(/'/g, '')).join('_'));
	}

	// Given name(s)
	if (parsed.givenNames.length > 0) {
		parts.push(parsed.givenNames.map((g) => g.toLowerCase()).join('_'));
	}

	// Birth year
	if (parsed.birthYear) {
		parts.push(`b${parsed.birthYear}`);
	}

	// Record type
	if (parsed.recordType) {
		parts.push(parsed.recordType);
	}

	// Record year
	if (parsed.recordYear) {
		parts.push(String(parsed.recordYear));
	}

	// Location
	if (parsed.location?.country) {
		parts.push(parsed.location.country);
	}
	if (parsed.location?.state) {
		parts.push(parsed.location.state);
	}

	// Part indicator
	if (parsed.partIndicator) {
		parts.push(parsed.partIndicator);
	}

	// If we couldn't extract anything useful, return original
	if (parts.length === 0) {
		return parsed.originalFilename;
	}

	return parts.join('_') + '.' + (parsed.extension || 'jpg');
}

/**
 * Generate a source title from parsed metadata
 */
export function generateSourceTitle(parsed: ParsedImageFilename): string {
	const parts: string[] = [];

	// Record type first
	if (parsed.recordType) {
		const typeLabels: Record<string, string> = {
			census: 'Census',
			vital_record: 'Vital Record',
			obituary: 'Obituary',
			military: 'Military Record',
			immigration: 'Immigration Record',
			cemetery: 'Cemetery Record',
			court_record: 'Court Record',
			photo: 'Photo',
			custom: 'Record',
		};
		parts.push(typeLabels[parsed.recordType] || 'Record');
	}

	// Year
	if (parsed.recordYear) {
		parts.push(String(parsed.recordYear));
	}

	// Names
	const names: string[] = [];
	if (parsed.givenNames.length > 0) {
		names.push(parsed.givenNames.join(' '));
	}
	if (parsed.surnames.length > 0) {
		names.push(parsed.surnames.join(' '));
	}
	if (names.length > 0) {
		parts.push('-');
		parts.push(names.join(' '));
	}

	// Fallback
	if (parts.length === 0) {
		return parsed.originalFilename;
	}

	return parts.join(' ');
}

/**
 * Check if a filename is an image file
 */
export function isImageFile(filename: string): boolean {
	const ext = filename.split('.').pop()?.toLowerCase();
	return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(ext || '');
}

/**
 * Check if a filename should be filtered out (thumbnails, hidden files)
 */
export function shouldFilterFile(filename: string): boolean {
	const lower = filename.toLowerCase();
	return (
		lower.startsWith('thumb_') ||
		lower.startsWith('thumbnail_') ||
		lower.startsWith('.') ||
		lower.endsWith('.doc') ||
		lower.endsWith('.docx') ||
		lower.endsWith('.pdf') ||
		lower.endsWith('.txt')
	);
}
