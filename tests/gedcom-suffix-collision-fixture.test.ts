import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GedcomParserV2 } from '../src/gedcom/gedcom-parser-v2';
import { composePersonName } from '../src/gedcom/gedcom-name';

/**
 * #685 — integration over the tiny suffix-collision fixture: three "John Smith"
 * relatives differing only by NSFX (Sr./Jr./III). Confirms the parser reads the
 * suffix and composePersonName yields three distinct note names, instead of the
 * pre-fix "John Smith" / "John Smith 1" / "John Smith 2" collision.
 */

const ged = readFileSync(
	new URL('./fixtures/gedcom/gedcom-sample-tiny-suffix.ged', import.meta.url),
	'utf-8',
);

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
