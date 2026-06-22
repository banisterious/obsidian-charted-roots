/**
 * Collects user-facing warnings for GEDCOM dates that were ambiguous or
 * non-standard, so the import wizard can surface them in the preview step
 * (before import) and the importer can report them on the result. Scanning
 * the parsed data directly means each family's marriage date is examined once,
 * so a couple's date warns once rather than once per spouse (#716).
 */
import { GedcomParser } from './gedcom-parser';
import type { GedcomDateInterpretation } from './gedcom-parser';
import type { GedcomDataV2 } from './gedcom-types';

/** Build the warning message for a non-`ok` date, or null if nothing to warn. */
function warningFor(
	raw: string | undefined,
	fieldLabel: string,
	subject: string,
	interpretation?: GedcomDateInterpretation
): string | null {
	if (!raw) return null;
	const result = GedcomParser.normalizeGedcomDateDetailed(raw, interpretation);
	switch (result.status) {
		case 'event-label':
			// When the user chose to skip event-label dates the value is blank.
			return result.value
				? `${fieldLabel} for ${subject}: read "${result.original}" as ${result.value} — dropped the "${result.label}" label; verify this is the intended date.`
				: `${fieldLabel} for ${subject}: skipped "${result.original}" (the "${result.label}" label) — left blank.`;
		case 'ambiguous-slash': {
			const order = interpretation?.slashOrder === 'month-day' ? 'month/day' : 'day/month';
			return `${fieldLabel} for ${subject}: "${result.original}" is ambiguous (day/month vs month/day); read as ${order} → ${result.value}.`;
		}
		case 'unparsed':
			return `${fieldLabel} for ${subject}: could not parse "${result.original}" — left blank.`;
		default:
			return null;
	}
}

/**
 * Scan parsed GEDCOM data for birth, death, and marriage dates that could not
 * be parsed cleanly, returning a warning per affected date. The warnings
 * reflect the chosen interpretation (#718) so they match what the import will
 * actually do; omitting `interpretation` reproduces #716's default wording.
 */
export function collectDateWarnings(
	data: GedcomDataV2,
	interpretation?: GedcomDateInterpretation
): string[] {
	const warnings: string[] = [];
	const nameOf = (ref: string | undefined): string =>
		(ref ? data.individuals.get(ref)?.name : undefined) || 'Unknown';

	for (const individual of data.individuals.values()) {
		const subject = `"${individual.name || 'Unknown'}"`;
		const birth = warningFor(individual.birthDate, 'Birth date', subject, interpretation);
		if (birth) warnings.push(birth);
		const death = warningFor(individual.deathDate, 'Death date', subject, interpretation);
		if (death) warnings.push(death);
	}

	for (const family of data.families.values()) {
		const subject = `"${nameOf(family.husbandRef)}" & "${nameOf(family.wifeRef)}"`;
		const marriage = warningFor(family.marriageDate, 'Marriage date', subject, interpretation);
		if (marriage) warnings.push(marriage);
	}

	return warnings;
}

/**
 * Per-category counts of dates that #716 can only resolve by a default
 * convention, used to drive the import wizard's date-interpretation controls
 * (#718). Counts are independent of the chosen interpretation — the
 * classification of a date (ambiguous slash, event label, unparsed) doesn't
 * change when the user picks how to read it.
 */
export interface DateInterpretationSummary {
	/** Ambiguous DD/MM-vs-MM/DD slash dates. */
	ambiguousSlashCount: number;
	/** Total dates carrying a stripped event label (Bapt, Buried, …). */
	eventLabelCount: number;
	/** Event-label counts grouped by a friendly label family (baptism, burial). */
	eventLabelByFamily: Record<string, number>;
	/** Non-empty dates that no format matched (informational; always left blank). */
	unparsedCount: number;
}

/** Group a raw stripped label onto a friendly family for display counts. */
function labelFamily(label: string): string {
	const l = label.toLowerCase();
	if (l.startsWith('bur')) return 'burial';
	if (l.startsWith('bapt') || l.startsWith('chr')) return 'baptism';
	return l;
}

/**
 * Tally the birth, death, and marriage dates by interpretation category so the
 * wizard can show how many dates each control affects ("82 slash dates",
 * "5 baptism dates"). Scans the same fields as {@link collectDateWarnings}.
 */
export function summarizeDateInterpretations(data: GedcomDataV2): DateInterpretationSummary {
	const summary: DateInterpretationSummary = {
		ambiguousSlashCount: 0,
		eventLabelCount: 0,
		eventLabelByFamily: {},
		unparsedCount: 0
	};

	const tally = (raw: string | undefined): void => {
		if (!raw) return;
		const result = GedcomParser.normalizeGedcomDateDetailed(raw);
		switch (result.status) {
			case 'ambiguous-slash':
				summary.ambiguousSlashCount++;
				break;
			case 'event-label': {
				summary.eventLabelCount++;
				const family = labelFamily(result.label || 'other');
				summary.eventLabelByFamily[family] = (summary.eventLabelByFamily[family] || 0) + 1;
				break;
			}
			case 'unparsed':
				summary.unparsedCount++;
				break;
		}
	};

	for (const individual of data.individuals.values()) {
		tally(individual.birthDate);
		tally(individual.deathDate);
	}
	for (const family of data.families.values()) {
		tally(family.marriageDate);
	}

	return summary;
}
