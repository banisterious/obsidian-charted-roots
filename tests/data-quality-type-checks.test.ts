import { describe, expect, it } from 'vitest';
import { findMistypedTypeFields, coerceTypeValueToText } from '../src/ui/data-quality-type-checks';

/**
 * #758 — detect text/identity fields stored as a number or date (which YAML
 * parses as non-text) and coerce them back to text. Motivated by #746, where a
 * single `event_type: 1850` broke the map refresh.
 */

describe('findMistypedTypeFields (#758)', () => {
	it('flags a numeric event_type on an event note', () => {
		const found = findMistypedTypeFields({ cr_type: 'event', event_type: 1850 });
		expect(found).toEqual([{ property: 'event_type', value: 1850, coerced: '1850' }]);
	});

	it('leaves a normal text event_type alone', () => {
		expect(findMistypedTypeFields({ cr_type: 'event', event_type: 'divorce' })).toEqual([]);
	});

	it('flags numeric place_category, org_type, and source_type by entity', () => {
		expect(findMistypedTypeFields({ cr_type: 'place', place_category: 1 })[0]?.property).toBe('place_category');
		expect(findMistypedTypeFields({ cr_type: 'organization', org_type: 2 })[0]?.property).toBe('org_type');
		expect(findMistypedTypeFields({ cr_type: 'source', source_type: 3 })[0]?.property).toBe('source_type');
	});

	it('flags a non-text cr_type itself', () => {
		const found = findMistypedTypeFields({ cr_type: 42 });
		expect(found).toEqual([{ property: 'cr_type', value: 42, coerced: '42' }]);
	});

	it('only checks the type field relevant to the note\'s cr_type', () => {
		// event_type is not a place field, so a stray numeric event_type on a
		// place note is not in scope for this check.
		expect(findMistypedTypeFields({ cr_type: 'place', event_type: 1850 })).toEqual([]);
	});

	it('skips array, null, empty, and missing values', () => {
		expect(findMistypedTypeFields({ cr_type: 'event', event_type: ['a', 'b'] })).toEqual([]);
		expect(findMistypedTypeFields({ cr_type: 'event', event_type: null })).toEqual([]);
		expect(findMistypedTypeFields({ cr_type: 'event', event_type: '' })).toEqual([]);
		expect(findMistypedTypeFields({ cr_type: 'event' })).toEqual([]);
	});

	it('flags a boolean value', () => {
		expect(findMistypedTypeFields({ cr_type: 'event', event_type: false })).toEqual([
			{ property: 'event_type', value: false, coerced: 'false' },
		]);
	});
});

describe('coerceTypeValueToText (#758)', () => {
	it('stringifies numbers and booleans', () => {
		expect(coerceTypeValueToText(1850)).toBe('1850');
		expect(coerceTypeValueToText(true)).toBe('true');
	});

	it('renders a Date as a plain local YYYY-MM-DD', () => {
		expect(coerceTypeValueToText(new Date(2020, 0, 5))).toBe('2020-01-05');
	});
});
