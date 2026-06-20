/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { ValueAliasService, CANONICAL_SEX_VALUES } from '../src/core/value-alias-service';

/**
 * #629 — Profile View writes single-letter sex markers (M / F / X / U,
 * GEDCOM-aligned per `CANONICAL_SEX_VALUES`); Edit Person previously
 * wrote word forms (`male` / `female` / `nonbinary` / `''`). Reopening
 * an existing note in Edit Person therefore showed the field as
 * "unrecognized" (grayed-out dropdown) when the saved value was a
 * marker, and the two surfaces wrote divergent shapes for the same
 * logical value. The fix routes the loaded sex value through
 * `ValueAliasService.resolve('sex', ...)` before populating the
 * dropdown, normalizing every shape the codebase has seen (word
 * forms, aliases like `enby` / `nb`, the GEDCOM markers themselves)
 * onto the canonical M/F/X/U set. This suite fences the resolve map
 * so future variants don't quietly drift.
 */

// Minimal plugin stub — ValueAliasService only reads
// `plugin.settings.valueAliases` for user-defined overrides. The
// suite covers the built-in synonyms path, so an empty aliases map
// is sufficient for fencing.
function makeServiceStub(): ValueAliasService {
	const stubPlugin = {
		settings: {
			valueAliases: {},
		},
	} as any;
	return new ValueAliasService(stubPlugin);
}

describe('Sex value normalization (#629)', () => {
	const service = makeServiceStub();

	describe('Word forms resolve to canonical markers', () => {
		it('"male" -> "M"', () => {
			expect(service.resolve('sex', 'male')).toBe('M');
		});
		it('"female" -> "F"', () => {
			expect(service.resolve('sex', 'female')).toBe('F');
		});
		it('"nonbinary" -> "X"', () => {
			expect(service.resolve('sex', 'nonbinary')).toBe('X');
		});
		it('"unknown" -> "U"', () => {
			expect(service.resolve('sex', 'unknown')).toBe('U');
		});
	});

	describe('Case-insensitive resolution', () => {
		it('"MALE" -> "M"', () => {
			expect(service.resolve('sex', 'MALE')).toBe('M');
		});
		it('"Female" -> "F"', () => {
			expect(service.resolve('sex', 'Female')).toBe('F');
		});
		it('"NonBinary" -> "X"', () => {
			expect(service.resolve('sex', 'NonBinary')).toBe('X');
		});
	});

	describe('Existing canonical markers pass through unchanged', () => {
		it('"M" -> "M"', () => {
			expect(service.resolve('sex', 'M')).toBe('M');
		});
		it('"F" -> "F"', () => {
			expect(service.resolve('sex', 'F')).toBe('F');
		});
		it('"X" -> "X"', () => {
			expect(service.resolve('sex', 'X')).toBe('X');
		});
		it('"U" -> "U"', () => {
			expect(service.resolve('sex', 'U')).toBe('U');
		});
	});

	describe('Non-binary aliases all converge on "X"', () => {
		it('"non-binary" -> "X"', () => {
			expect(service.resolve('sex', 'non-binary')).toBe('X');
		});
		it('"nb" -> "X"', () => {
			expect(service.resolve('sex', 'nb')).toBe('X');
		});
		it('"enby" -> "X"', () => {
			expect(service.resolve('sex', 'enby')).toBe('X');
		});
		it('"intersex" -> "X"', () => {
			expect(service.resolve('sex', 'intersex')).toBe('X');
		});
	});

	describe('Empty / unrecognized inputs', () => {
		it('empty string passes through (no value set)', () => {
			expect(service.resolve('sex', '')).toBe('');
		});
		it('unrecognized string passes through unchanged (custom value)', () => {
			// The dropdown will show this as gray/unrecognized, but the
			// resolve path doesn't invent a value for inputs it can't map.
			expect(service.resolve('sex', 'something-custom')).toBe('something-custom');
		});
	});

	it('all four canonical markers are in CANONICAL_SEX_VALUES', () => {
		// Sanity: fences the contract that the dropdown's option set
		// matches the canonical set used everywhere else in the codebase.
		expect(CANONICAL_SEX_VALUES).toEqual(['M', 'F', 'X', 'U']);
	});
});

describe('resolve() tolerates non-string frontmatter values (#746)', () => {
	const service = makeServiceStub();

	it('does not throw on a bare-number value (the map-refresh crash)', () => {
		// `event_type: 1850` parsed by YAML reaches resolve as a number; the
		// uncoerced `.toLowerCase()` threw "A.toLowerCase is not a function".
		expect(() => service.resolve('eventType', 1850)).not.toThrow();
	});

	it('coerces an unknown numeric event_type to custom', () => {
		expect(service.resolve('eventType', 1850)).toBe('custom');
	});

	it('coerces a numeric value that maps to a known canonical (passthrough fields)', () => {
		// 1 is not a known sex marker -> stringified, then passed through.
		expect(service.resolve('sex', 1)).toBe('1');
	});

	it('treats non-finite numbers and non-primitive values as empty (no eventType fallback)', () => {
		// Empty short-circuits before the field-specific fallback, so even
		// eventType returns '' rather than 'custom' for uncoercible input.
		expect(service.resolve('eventType', NaN)).toBe('');
		expect(service.resolve('sex', NaN)).toBe('');
		expect(service.resolve('sex', {})).toBe('');
		expect(service.resolve('sex', null)).toBe('');
		expect(service.resolve('sex', undefined)).toBe('');
	});
});
