import { describe, expect, it } from 'vitest';
import { composePersonName } from '../src/gedcom/gedcom-name';

/**
 * #685 — GEDCOM stores a generational suffix (Jr./Sr./III) in a separate NSFX
 * tag, which the import dropped from the note name. Relatives who share a given
 * name and surname then collided to one base name and got numeric-deduplicated
 * ("Name", "Name 1", "Name 2") instead of keeping their suffix. composePersonName
 * folds NSFX back into the name so they stay distinct.
 */

describe('composePersonName (#685)', () => {
	it('appends the NSFX suffix to the name', () => {
		expect(composePersonName('John Smith', 'III')).toBe('John Smith III');
		expect(composePersonName('John Smith', 'Jr.')).toBe('John Smith Jr.');
	});

	it('returns the name unchanged when there is no suffix', () => {
		expect(composePersonName('John Smith', undefined)).toBe('John Smith');
		expect(composePersonName('John Smith', '')).toBe('John Smith');
		expect(composePersonName('John Smith', '   ')).toBe('John Smith');
	});

	it('keeps three same-name relatives distinct by their suffix', () => {
		const names = [
			composePersonName('John Smith', 'Sr.'),
			composePersonName('John Smith', 'Jr.'),
			composePersonName('John Smith', 'III'),
		];
		expect(new Set(names).size).toBe(3);
	});

	it('does not double-append when the suffix is already the trailing word', () => {
		// Some GEDCOMs put the suffix inline in NAME as well as in NSFX.
		expect(composePersonName('John Smith III', 'III')).toBe('John Smith III');
		expect(composePersonName('John Smith iii', 'III')).toBe('John Smith iii');
	});

	it('does not treat a suffix that is merely a substring of the last word as present', () => {
		// "Martini" ends with "i" but is not the suffix "I".
		expect(composePersonName('John Martini', 'I')).toBe('John Martini I');
	});

	it('trims surrounding whitespace', () => {
		expect(composePersonName('  John Smith  ', '  Jr.  ')).toBe('John Smith Jr.');
	});

	it('falls back to the suffix alone when the name is empty', () => {
		expect(composePersonName('', 'III')).toBe('III');
	});
});
