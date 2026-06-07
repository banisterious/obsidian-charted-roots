import { describe, expect, it } from 'vitest';
import {
	estimateImportSize,
	LARGE_IMPORT_THRESHOLD,
	type ImportSizeEstimateInput,
} from '../src/core/import-size-estimate';

/**
 * #688 — Warn and estimate before importing a very large GEDCOM. The import
 * wizard now projects how many notes an import will create (across the enabled
 * entity types) and flags imports large enough to degrade Obsidian, before any
 * notes are written. `estimateImportSize` is the pure decision behind that.
 */
function input(overrides: Partial<ImportSizeEstimateInput> = {}): ImportSizeEstimateInput {
	return {
		people: 0,
		places: 0,
		sources: 0,
		events: 0,
		importPeople: true,
		importPlaces: true,
		importSources: true,
		importEvents: true,
		...overrides,
	};
}

describe('estimateImportSize', () => {
	it('sums the counts of all enabled entity types', () => {
		const result = estimateImportSize(input({ people: 100, places: 40, sources: 25, events: 60 }));
		expect(result.totalNotes).toBe(225);
		expect(result.isLarge).toBe(false);
	});

	it('excludes disabled entity types from the total', () => {
		const result = estimateImportSize(input({
			people: 100, places: 40, sources: 25, events: 60,
			importPlaces: false, importEvents: false,
		}));
		expect(result.totalNotes).toBe(125); // people + sources only
	});

	it('flags an import at or above the threshold as large', () => {
		const atThreshold = estimateImportSize(input({ people: LARGE_IMPORT_THRESHOLD }));
		expect(atThreshold.isLarge).toBe(true);

		const justUnder = estimateImportSize(input({ people: LARGE_IMPORT_THRESHOLD - 1 }));
		expect(justUnder.isLarge).toBe(false);
	});

	it('flags @inerlogic-scale imports (38k people + 87k places) as large', () => {
		const result = estimateImportSize(input({ people: 37954, places: 87000, sources: 5000, events: 120000 }));
		expect(result.totalNotes).toBe(249954);
		expect(result.isLarge).toBe(true);
	});

	it('respects a custom threshold', () => {
		const result = estimateImportSize(input({ people: 500 }), 1000);
		expect(result.isLarge).toBe(false);
		expect(estimateImportSize(input({ people: 1000 }), 1000).isLarge).toBe(true);
	});

	it('is not large when everything is disabled', () => {
		const result = estimateImportSize(input({
			people: 50000, places: 50000, sources: 50000, events: 50000,
			importPeople: false, importPlaces: false, importSources: false, importEvents: false,
		}));
		expect(result.totalNotes).toBe(0);
		expect(result.isLarge).toBe(false);
	});

	it('treats negative or non-finite counts as zero', () => {
		const result = estimateImportSize(input({
			people: -5, places: NaN, sources: Infinity, events: 10,
		}));
		expect(result.totalNotes).toBe(10);
	});

	it('floors fractional counts', () => {
		const result = estimateImportSize(input({ people: 10.9, places: 0, sources: 0, events: 0 }));
		expect(result.totalNotes).toBe(10);
	});
});
