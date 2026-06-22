import { describe, expect, it } from 'vitest';
import { GedcomParserV2 } from '../src/gedcom/gedcom-parser-v2';
import { collectDateWarnings, summarizeDateInterpretations } from '../src/gedcom/gedcom-date-warnings';

/**
 * #716 — pre-import scan that surfaces ambiguous / non-standard / unparseable
 * dates so the wizard can review them before import. Scanning parsed data
 * directly means a couple's marriage date warns once, not once per spouse.
 */
const ged = `0 HEAD
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Clara /Pemberton/
1 BIRT
2 DATE 05/06/1990
1 FAMS @F1@
0 @I2@ INDI
1 NAME Arthur /Pemberton/
1 BIRT
2 DATE 19/08/1990
1 FAMS @F1@
0 @I3@ INDI
1 NAME Thomas /Ashford/
1 BIRT
2 DATE Bapt 18 Dec 1690
0 @I4@ INDI
1 NAME Margaret /Ashford/
1 DEAT
2 DATE Buried 11 April 1758
0 @I5@ INDI
1 NAME Edmund /Crowe/
1 BIRT
2 DATE sometime in the spring
0 @I6@ INDI
1 NAME Henry /Standard/
1 BIRT
2 DATE 15 MAR 1950
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 MARR
2 DATE 03/04/2015
0 TRLR`;

describe('collectDateWarnings (#716)', () => {
	const warnings = collectDateWarnings(GedcomParserV2.parse(ged));

	it('warns for exactly the five problem dates', () => {
		expect(warnings).toHaveLength(5);
	});

	it('flags the ambiguous birth slash date', () => {
		expect(warnings.some(w => w.includes('Clara') && w.includes('is ambiguous'))).toBe(true);
	});

	it('flags both event-label dates with the dropped label', () => {
		expect(warnings.some(w => w.includes('Thomas') && w.includes('dropped the "Bapt" label'))).toBe(true);
		expect(warnings.some(w => w.includes('Margaret') && w.includes('dropped the "Buried" label'))).toBe(true);
	});

	it('flags the unparseable date as left blank', () => {
		expect(warnings.some(w => w.includes('Edmund') && w.includes('could not parse'))).toBe(true);
	});

	it('warns once per couple, not once per spouse', () => {
		const marriageWarnings = warnings.filter(w => w.startsWith('Marriage date'));
		expect(marriageWarnings).toHaveLength(1);
		expect(marriageWarnings[0]).toContain('is ambiguous');
	});

	it('does not warn for clean control dates', () => {
		expect(warnings.some(w => w.includes('Henry'))).toBe(false);
		expect(warnings.some(w => w.includes('Arthur') && w.includes('Birth date'))).toBe(false);
	});
});

describe('summarizeDateInterpretations (#718)', () => {
	const summary = summarizeDateInterpretations(GedcomParserV2.parse(ged));

	it('counts the ambiguous slash dates (Clara birth + the marriage)', () => {
		expect(summary.ambiguousSlashCount).toBe(2);
	});

	it('counts the event-label dates and groups them by family', () => {
		expect(summary.eventLabelCount).toBe(2);
		expect(summary.eventLabelByFamily).toEqual({ baptism: 1, burial: 1 });
	});

	it('counts the unparseable date', () => {
		expect(summary.unparsedCount).toBe(1);
	});

	it('ignores clean and unambiguous dates', () => {
		// Arthur (19/08), Henry (15 MAR 1950) contribute to no category.
		const total = summary.ambiguousSlashCount + summary.eventLabelCount + summary.unparsedCount;
		expect(total).toBe(5);
	});
});

describe('collectDateWarnings honors interpretation (#718)', () => {
	const data = GedcomParserV2.parse(ged);

	it('reports month/day wording when the slash order is flipped', () => {
		const warnings = collectDateWarnings(data, { slashOrder: 'month-day' });
		expect(warnings.some(w => w.includes('Clara') && w.includes('read as month/day → 1990-05-06'))).toBe(true);
	});

	it('reports event-label dates as skipped when skip is chosen', () => {
		const warnings = collectDateWarnings(data, { eventLabel: 'skip' });
		expect(warnings.some(w => w.includes('Thomas') && w.includes('skipped') && w.includes('left blank'))).toBe(true);
	});
});
