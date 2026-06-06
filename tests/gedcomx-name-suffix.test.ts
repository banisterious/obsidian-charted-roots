import { describe, expect, it } from 'vitest';
import { GedcomXParser } from '../src/gedcomx/gedcomx-parser';

/**
 * #685 (parallel surface) — GEDCOM-X stores a generational suffix as a `Suffix`
 * name-part, which `extractName` ignored. A file using name parts without a
 * `fullText` therefore dropped the suffix, so same-name relatives collided just
 * like the GEDCOM importer did. The suffix is now folded into the name.
 */

function gedcomX(persons: unknown[]): string {
	return JSON.stringify({ persons });
}

function part(type: string, value: string) {
	return { type: `http://gedcomx.org/${type}`, value };
}

describe('GedcomXParser name suffix (#685)', () => {
	it('keeps the Suffix part when building the name from parts (no fullText)', () => {
		const data = GedcomXParser.parse(gedcomX([
			{ id: 'p1', names: [{ nameForms: [{ parts: [part('Given', 'John'), part('Surname', 'Smith'), part('Suffix', 'III')] }] }] },
			{ id: 'p2', names: [{ nameForms: [{ parts: [part('Given', 'John'), part('Surname', 'Smith'), part('Suffix', 'Jr.')] }] }] },
		]));
		expect(data.persons.get('p1')?.name).toBe('John Smith III');
		expect(data.persons.get('p2')?.name).toBe('John Smith Jr.');
		// Distinct, so they won't collide into "John Smith" / "John Smith 1".
		expect(data.persons.get('p1')?.name).not.toBe(data.persons.get('p2')?.name);
	});

	it('does not double the suffix when fullText already includes it', () => {
		const data = GedcomXParser.parse(gedcomX([
			{ id: 'p1', names: [{ nameForms: [{ fullText: 'John Smith III', parts: [part('Suffix', 'III')] }] }] },
		]));
		expect(data.persons.get('p1')?.name).toBe('John Smith III');
	});

	it('appends the suffix to a fullText that lacks it', () => {
		const data = GedcomXParser.parse(gedcomX([
			{ id: 'p1', names: [{ nameForms: [{ fullText: 'John Smith', parts: [part('Suffix', 'Jr.')] }] }] },
		]));
		expect(data.persons.get('p1')?.name).toBe('John Smith Jr.');
	});

	it('leaves a name without a suffix unchanged', () => {
		const data = GedcomXParser.parse(gedcomX([
			{ id: 'p1', names: [{ nameForms: [{ parts: [part('Given', 'John'), part('Surname', 'Smith')] }] }] },
		]));
		expect(data.persons.get('p1')?.name).toBe('John Smith');
	});
});
