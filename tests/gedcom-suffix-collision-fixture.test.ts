import { describe, expect, it } from 'vitest';
import { GedcomParserV2 } from '../src/gedcom/gedcom-parser-v2';
import { composePersonName } from '../src/gedcom/gedcom-name';

/**
 * #685 — integration over a tiny suffix-collision sample: three "John Smith"
 * relatives differing only by NSFX (Sr./Jr./III). Confirms the parser reads the
 * suffix and composePersonName yields three distinct note names, instead of the
 * pre-fix "John Smith" / "John Smith 1" / "John Smith 2" collision.
 */

const ged = `0 HEAD
1 SOUR Charted Roots Test
2 VERS 1.0
2 NAME Charted Roots Suffix Collision Sample
1 DEST ANY
1 DATE 5 JUN 2026
1 SUBM @SUBM1@
1 FILE suffix-collision.ged
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @SUBM1@ SUBM
1 NAME Charted Roots User
0 @I1@ INDI
1 NAME John /Smith/
2 GIVN John
2 SURN Smith
2 NSFX Sr.
1 SEX M
1 BIRT
2 DATE 3 FEB 1920
2 PLAC Boston, Massachusetts, USA
1 FAMS @F1@
0 @I2@ INDI
1 NAME John /Smith/
2 GIVN John
2 SURN Smith
2 NSFX Jr.
1 SEX M
1 BIRT
2 DATE 18 JUL 1945
2 PLAC Boston, Massachusetts, USA
1 FAMC @F1@
1 FAMS @F2@
0 @I3@ INDI
1 NAME John /Smith/
2 GIVN John
2 SURN Smith
2 NSFX III
1 SEX M
1 BIRT
2 DATE 9 OCT 1970
2 PLAC Boston, Massachusetts, USA
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I3@
0 TRLR`;

describe('GEDCOM tiny suffix-collision fixture (#685)', () => {
	const data = GedcomParserV2.parse(ged);
	const individuals = [...data.individuals.values()];

	it('parses three individuals', () => {
		expect(individuals).toHaveLength(3);
	});

	it('reads the same base name and distinct NSFX suffixes', () => {
		for (const ind of individuals) {
			expect(ind.name).toBe('John Smith');
		}
		expect(individuals.map(i => i.nameSuffix).sort()).toEqual(['III', 'Jr.', 'Sr.']);
	});

	it('composes three distinct note names from the suffixes', () => {
		const names = individuals.map(i => composePersonName(i.name || '', i.nameSuffix));
		expect(new Set(names).size).toBe(3);
		expect(names.sort()).toEqual(['John Smith III', 'John Smith Jr.', 'John Smith Sr.']);
	});
});
