/**
 * GEDCOM 5.5.1 Parser for Charted Roots
 *
 * Parses GEDCOM files and converts them to Charted Roots person data structures.
 */

import { getErrorMessage } from '../core/error-utils';

/**
 * Parsed GEDCOM individual record
 */
export interface GedcomIndividual {
	id: string;
	name: string;
	givenName?: string;
	surname?: string;
	sex?: 'M' | 'F' | 'U';
	birthDate?: string;
	birthPlace?: string;
	deathDate?: string;
	deathPlace?: string;
	occupation?: string;
	fatherRef?: string;
	motherRef?: string;
	spouseRefs: string[];
	familyAsChildRef?: string;
	familyAsSpouseRefs: string[];
}

/**
 * Parsed GEDCOM family record
 */
export interface GedcomFamily {
	id: string;
	husbandRef?: string;
	wifeRef?: string;
	childRefs: string[];
	marriageDate?: string;
	marriagePlace?: string;
}

/**
 * Complete parsed GEDCOM data
 */
export interface GedcomData {
	individuals: Map<string, GedcomIndividual>;
	families: Map<string, GedcomFamily>;
	header: {
		source?: string;
		version?: string;
		date?: string;
		fileName?: string;
	};
}

/**
 * GEDCOM parsing error
 */
export class GedcomParseError extends Error {
	constructor(message: string, public line?: number) {
		super(message);
		this.name = 'GedcomParseError';
	}
}

/**
 * GEDCOM line structure
 */
interface GedcomLine {
	level: number;
	tag: string;
	value: string;
	xref?: string;
	lineNumber: number;
}

/**
 * Validation result
 */
export interface GedcomValidationResult {
	valid: boolean;
	errors: Array<{ line?: number; message: string }>;
	warnings: Array<{ line?: number; message: string }>;
	stats: {
		individualCount: number;
		familyCount: number;
		version?: string;
	};
}

/**
 * Parse a GEDCOM file into structured data
 */
export class GedcomParser {
	/**
	 * Validate GEDCOM content before parsing
	 */
	static validate(content: string): GedcomValidationResult {
		const result: GedcomValidationResult = {
			valid: true,
			errors: [],
			warnings: [],
			stats: {
				individualCount: 0,
				familyCount: 0
			}
		};

		if (!content || content.trim().length === 0) {
			result.valid = false;
			result.errors.push({ message: 'GEDCOM file is empty' });
			return result;
		}

		try {
			const lines = this.parseLines(content);

			// Check for required header
			const hasHeader = lines.some(l => l.level === 0 && l.tag === 'HEAD');
			if (!hasHeader) {
				result.errors.push({ message: 'Missing required GEDCOM header (0 HEAD)' });
				result.valid = false;
			}

			// Check for trailer
			const hasTrailer = lines.some(l => l.level === 0 && l.tag === 'TRLR');
			if (!hasTrailer) {
				result.warnings.push({ message: 'Missing GEDCOM trailer (0 TRLR)' });
			}

			// Count records and check version
			let inHeader = false;
			for (const line of lines) {
				if (line.level === 0) {
					if (line.tag === 'HEAD') {
						inHeader = true;
					} else if (line.tag === 'TRLR') {
						inHeader = false;
					} else if (line.xref && line.tag === 'INDI') {
						result.stats.individualCount++;
					} else if (line.xref && line.tag === 'FAM') {
						result.stats.familyCount++;
					}
				}

				if (inHeader && line.tag === 'VERS') {
					result.stats.version = line.value;
					// Warn if not 5.5 or 5.5.1
					if (line.value && !line.value.startsWith('5.5')) {
						result.warnings.push({
							line: line.lineNumber,
							message: `GEDCOM version ${line.value} may not be fully supported. Recommended: 5.5 or 5.5.1`
						});
					}
				}
			}

			// Warn if no individuals
			if (result.stats.individualCount === 0) {
				result.warnings.push({ message: 'No individual records found in GEDCOM file' });
			}

		} catch (error: unknown) {
			result.valid = false;
			// Include line number if available from GedcomParseError
			const lineInfo = error instanceof GedcomParseError && error.line ? ` at line ${error.line}` : '';
			result.errors.push({ message: `Parse error: ${getErrorMessage(error)}${lineInfo}` });
		}

		return result;
	}

	/**
	 * Parse GEDCOM content into structured data
	 */
	static parse(content: string): GedcomData {
		const lines = this.parseLines(content);
		const data: GedcomData = {
			individuals: new Map(),
			families: new Map(),
			header: {}
		};

		let currentRecord: 'INDI' | 'FAM' | 'HEAD' | null = null;
		let currentIndividual: GedcomIndividual | null = null;
		let currentFamily: GedcomFamily | null = null;
		let currentContext: string[] = [];

		for (const line of lines) {
			// Level 0 records
			if (line.level === 0) {
				// Save previous record
				if (currentIndividual && currentIndividual.id) {
					data.individuals.set(currentIndividual.id, currentIndividual);
				}
				if (currentFamily && currentFamily.id) {
					data.families.set(currentFamily.id, currentFamily);
				}

				// Start new record
				currentIndividual = null;
				currentFamily = null;
				currentContext = [];

				if (line.tag === 'HEAD') {
					currentRecord = 'HEAD';
				} else if (line.xref && line.tag === 'INDI') {
					currentRecord = 'INDI';
					currentIndividual = {
						id: line.xref,
						name: '',
						spouseRefs: [],
						familyAsSpouseRefs: []
					};
				} else if (line.xref && line.tag === 'FAM') {
					currentRecord = 'FAM';
					currentFamily = {
						id: line.xref,
						childRefs: []
					};
				} else if (line.tag === 'TRLR') {
					currentRecord = null;
				}
				continue;
			}

			// Process based on current record type
			if (currentRecord === 'HEAD') {
				this.parseHeaderLine(line, data.header);
			} else if (currentRecord === 'INDI' && currentIndividual) {
				this.parseIndividualLine(line, currentIndividual, currentContext);
			} else if (currentRecord === 'FAM' && currentFamily) {
				this.parseFamilyLine(line, currentFamily, currentContext);
			}
		}

		// Save last record
		if (currentIndividual && currentIndividual.id) {
			data.individuals.set(currentIndividual.id, currentIndividual);
		}
		if (currentFamily && currentFamily.id) {
			data.families.set(currentFamily.id, currentFamily);
		}

		// Link families to individuals
		this.linkFamilies(data);

		return data;
	}

	/**
	 * Parse raw GEDCOM lines
	 */
	private static parseLines(content: string): GedcomLine[] {
		const lines = content.split(/\r?\n/);
		const parsed: GedcomLine[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const match = line.match(/^(\d+)\s+(@[^@]+@\s+)?(\S+)(\s+(.*))?$/);
			if (!match) {
				throw new GedcomParseError(`Invalid GEDCOM line format`, i + 1);
			}

			parsed.push({
				level: parseInt(match[1]),
				xref: match[2]?.trim().replace(/@/g, ''),
				tag: match[3],
				value: match[5]?.trim() || '',
				lineNumber: i + 1
			});
		}

		return parsed;
	}

	/**
	 * Parse header line
	 */
	private static parseHeaderLine(line: GedcomLine, header: GedcomData['header']): void {
		switch (line.tag) {
			case 'SOUR':
				header.source = line.value;
				break;
			case 'VERS':
				header.version = line.value;
				break;
			case 'DATE':
				header.date = line.value;
				break;
			case 'FILE':
				header.fileName = line.value;
				break;
		}
	}

	/**
	 * Parse individual record line
	 */
	private static parseIndividualLine(
		line: GedcomLine,
		individual: GedcomIndividual,
		context: string[]
	): void {
		// Update context for level 1 tags
		if (line.level === 1) {
			context.length = 0;
			context.push(line.tag);
		} else if (line.level === 2) {
			context.length = 1;
			context.push(line.tag);
		}

		switch (line.tag) {
			case 'NAME':
				individual.name = line.value.replace(/\//g, '');
				break;

			case 'GIVN':
				individual.givenName = line.value;
				break;

			case 'SURN':
				individual.surname = line.value;
				break;

			case 'SEX':
				individual.sex = line.value === 'M' ? 'M' : line.value === 'F' ? 'F' : 'U';
				break;

			case 'OCCU':
				individual.occupation = line.value;
				break;

			case 'DATE':
				if (context[0] === 'BIRT') {
					individual.birthDate = line.value;
				} else if (context[0] === 'DEAT') {
					individual.deathDate = line.value;
				}
				break;

			case 'PLAC':
				if (context[0] === 'BIRT') {
					individual.birthPlace = line.value;
				} else if (context[0] === 'DEAT') {
					individual.deathPlace = line.value;
				}
				break;

			case 'FAMC':
				individual.familyAsChildRef = line.value.replace(/@/g, '');
				break;

			case 'FAMS':
				individual.familyAsSpouseRefs.push(line.value.replace(/@/g, ''));
				break;
		}
	}

	/**
	 * Parse family record line
	 */
	private static parseFamilyLine(
		line: GedcomLine,
		family: GedcomFamily,
		context: string[]
	): void {
		// Update context for level 1 tags
		if (line.level === 1) {
			context.length = 0;
			context.push(line.tag);
		} else if (line.level === 2) {
			context.length = 1;
			context.push(line.tag);
		}

		switch (line.tag) {
			case 'HUSB':
				family.husbandRef = line.value.replace(/@/g, '');
				break;

			case 'WIFE':
				family.wifeRef = line.value.replace(/@/g, '');
				break;

			case 'CHIL':
				family.childRefs.push(line.value.replace(/@/g, ''));
				break;

			case 'DATE':
				if (context[0] === 'MARR') {
					family.marriageDate = line.value;
				}
				break;

			case 'PLAC':
				if (context[0] === 'MARR') {
					family.marriagePlace = line.value;
				}
				break;
		}
	}

	/**
	 * Link family relationships to individuals
	 */
	private static linkFamilies(data: GedcomData): void {
		for (const family of data.families.values()) {
			// Link parents to children
			for (const childRef of family.childRefs) {
				const child = data.individuals.get(childRef);
				if (child) {
					if (family.husbandRef) {
						child.fatherRef = family.husbandRef;
					}
					if (family.wifeRef) {
						child.motherRef = family.wifeRef;
					}
				}
			}

			// Link spouses
			if (family.husbandRef && family.wifeRef) {
				const husband = data.individuals.get(family.husbandRef);
				const wife = data.individuals.get(family.wifeRef);

				if (husband && !husband.spouseRefs.includes(family.wifeRef)) {
					husband.spouseRefs.push(family.wifeRef);
				}
				if (wife && !wife.spouseRefs.includes(family.husbandRef)) {
					wife.spouseRefs.push(family.husbandRef);
				}
			}
		}
	}

	/**
	 * Normalize GEDCOM date to a consistent format while preserving precision.
	 *
	 * - Full dates (DD MMM YYYY) → ISO format (YYYY-MM-DD)
	 * - Month + year (MMM YYYY) → ISO partial (YYYY-MM)
	 * - Year only (YYYY) → year only (YYYY)
	 * - Qualifiers (ABT, BEF, AFT, CAL, EST) → preserved as prefix
	 * - Ranges (BET X AND Y) → passed through as-is
	 *
	 * @deprecated Use normalizeGedcomDate() instead - this alias exists for backwards compatibility
	 */
	static gedcomDateToISO(gedcomDate: string): string | undefined {
		return this.normalizeGedcomDate(gedcomDate);
	}

	/**
	 * Normalize GEDCOM date to a consistent format while preserving precision.
	 *
	 * Output formats:
	 * - Full dates: YYYY-MM-DD (e.g., "1950-03-15")
	 * - Month + year: YYYY-MM (e.g., "1950-03")
	 * - Year only: YYYY (e.g., "1950")
	 * - With qualifiers: "ABT 1950", "BEF 1950-03", etc.
	 * - Ranges: "BET 1882 AND 1885" (passed through)
	 */
	static normalizeGedcomDate(gedcomDate: string): string | undefined {
		if (!gedcomDate) return undefined;

		const trimmed = gedcomDate.trim();

		// Handle date ranges (BET X AND Y) - pass through as-is
		if (/^BET\s+.+\s+AND\s+.+$/i.test(trimmed)) {
			return trimmed.toUpperCase();
		}

		// Extract qualifier prefix if present (ABT, BEF, AFT, CAL, EST)
		const qualifierMatch = trimmed.match(/^(ABT|BEF|AFT|CAL|EST)\s+(.+)$/i);
		const qualifier = qualifierMatch ? qualifierMatch[1].toUpperCase() : null;
		const datePart = qualifierMatch ? qualifierMatch[2].trim() : trimmed;

		// Parse the date portion
		const normalized = this.parseDatePart(datePart);
		if (!normalized) return undefined;

		// Return with qualifier prefix if present
		return qualifier ? `${qualifier} ${normalized}` : normalized;
	}

	/**
	 * Parse a date string (without qualifiers) into normalized format.
	 * Preserves precision - doesn't add false month/day.
	 */
	private static parseDatePart(datePart: string): string | undefined {
		// Format: DD MMM YYYY (e.g., "15 MAR 1950") → YYYY-MM-DD
		const fullMatch = datePart.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i);
		if (fullMatch) {
			const day = fullMatch[1].padStart(2, '0');
			const month = this.monthToNumber(fullMatch[2]);
			const year = fullMatch[3];
			return `${year}-${month}-${day}`;
		}

		// Format: MMM YYYY (e.g., "MAR 1950") → YYYY-MM
		const monthYearMatch = datePart.match(/^([A-Z]{3})\s+(\d{4})$/i);
		if (monthYearMatch) {
			const month = this.monthToNumber(monthYearMatch[1]);
			const year = monthYearMatch[2];
			return `${year}-${month}`;
		}

		// Format: YYYY (e.g., "1950") → YYYY
		const yearMatch = datePart.match(/^(\d{4})$/);
		if (yearMatch) {
			return yearMatch[1];
		}

		return undefined;
	}

	/**
	 * Convert month abbreviation to number
	 */
	private static monthToNumber(month: string): string {
		const months: Record<string, string> = {
			'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
			'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
			'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
		};
		return months[month.toUpperCase()] || '01';
	}
}
