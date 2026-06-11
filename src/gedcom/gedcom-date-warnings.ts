/**
 * Collects user-facing warnings for GEDCOM dates that were ambiguous or
 * non-standard, so the import wizard can surface them in the preview step
 * (before import) and the importer can report them on the result. Scanning
 * the parsed data directly means each family's marriage date is examined once,
 * so a couple's date warns once rather than once per spouse (#716).
 */
import { GedcomParser } from './gedcom-parser';
import type { GedcomDataV2 } from './gedcom-types';

/** Build the warning message for a non-`ok` date, or null if nothing to warn. */
function warningFor(raw: string | undefined, fieldLabel: string, subject: string): string | null {
	if (!raw) return null;
	const result = GedcomParser.normalizeGedcomDateDetailed(raw);
	switch (result.status) {
		case 'event-label':
			return `${fieldLabel} for ${subject}: read "${result.original}" as ${result.value} — dropped the "${result.label}" label; verify this is the intended date.`;
		case 'ambiguous-slash':
			return `${fieldLabel} for ${subject}: "${result.original}" is ambiguous (day/month vs month/day); read as day/month → ${result.value}.`;
		case 'unparsed':
			return `${fieldLabel} for ${subject}: could not parse "${result.original}" — left blank.`;
		default:
			return null;
	}
}

/**
 * Scan parsed GEDCOM data for birth, death, and marriage dates that could not
 * be parsed cleanly, returning a warning per affected date.
 */
export function collectDateWarnings(data: GedcomDataV2): string[] {
	const warnings: string[] = [];
	const nameOf = (ref: string | undefined): string =>
		(ref ? data.individuals.get(ref)?.name : undefined) || 'Unknown';

	for (const individual of data.individuals.values()) {
		const subject = `"${individual.name || 'Unknown'}"`;
		const birth = warningFor(individual.birthDate, 'Birth date', subject);
		if (birth) warnings.push(birth);
		const death = warningFor(individual.deathDate, 'Death date', subject);
		if (death) warnings.push(death);
	}

	for (const family of data.families.values()) {
		const subject = `"${nameOf(family.husbandRef)}" & "${nameOf(family.wifeRef)}"`;
		const marriage = warningFor(family.marriageDate, 'Marriage date', subject);
		if (marriage) warnings.push(marriage);
	}

	return warnings;
}
