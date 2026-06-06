import { describe, expect, it } from 'vitest';
import {
	computeMergedHistoricalNames,
	parseHistoricalNames,
	toFlatHistoricalNames,
	type PlaceNode,
	type HistoricalName,
} from '../src/models/place';
import { PlaceGraphService } from '../src/core/place-graph';

/**
 * #635 — merging duplicate places used to trash the discarded note (and its
 * name) outright, losing period-appropriate / GEDCOM-variant forms. The merge
 * now folds each discarded place's name into the canonical's historical names,
 * keeping the modern (canonical) name primary. This suite pins the pure fold.
 */

function place(partial: Partial<PlaceNode> & { id: string; name: string }): PlaceNode {
	return { filePath: `${partial.name}.md`, category: 'real', childIds: [], aliases: [], ...partial } as PlaceNode;
}

describe('computeMergedHistoricalNames (#635)', () => {
	it('folds a discarded duplicate name into the canonical historical names', () => {
		const canonical = place({ id: 'c', name: 'Mumbai' });
		const dup = place({ id: 'd', name: 'Bombay' });
		expect(computeMergedHistoricalNames(canonical, [dup])).toEqual([{ name: 'Bombay' }]);
	});

	it('keeps the canonical (modern) name primary by never folding it in', () => {
		const canonical = place({ id: 'c', name: 'Mumbai' });
		const dup = place({ id: 'd', name: 'mumbai' }); // same name, different case
		// Nothing to preserve — the discarded form equals the surviving name.
		expect(computeMergedHistoricalNames(canonical, [dup])).toEqual([]);
	});

	it("carries over the discarded place's own historical names", () => {
		const canonical = place({ id: 'c', name: 'Mumbai' });
		const dup = place({
			id: 'd',
			name: 'Bombay',
			historicalNames: [{ name: 'Bom Bahia', period: 'colonial' }],
		});
		expect(computeMergedHistoricalNames(canonical, [dup])).toEqual([
			{ name: 'Bombay' },
			{ name: 'Bom Bahia', period: 'colonial' },
		]);
	});

	it('preserves existing canonical entries first and dedupes case-insensitively', () => {
		const canonical = place({
			id: 'c',
			name: 'Mumbai',
			historicalNames: [{ name: 'Bombay', period: 'British Raj' }],
		});
		const dup = place({ id: 'd', name: 'BOMBAY' }); // already present (case-insensitive)
		const merged = computeMergedHistoricalNames(canonical, [dup]);
		// Existing entry unchanged, no duplicate added.
		expect(merged).toEqual([{ name: 'Bombay', period: 'British Raj' }]);
		// "Nothing new" signal: length did not grow past the existing count.
		expect(merged.length).toBe(canonical.historicalNames!.length);
	});

	it('folds multiple duplicates in order and dedupes across them', () => {
		const canonical = place({ id: 'c', name: 'Istanbul' });
		const dups = [
			place({ id: 'd1', name: 'Constantinople' }),
			place({ id: 'd2', name: 'Byzantium' }),
			place({ id: 'd3', name: 'constantinople' }), // dup of d1
		];
		expect(computeMergedHistoricalNames(canonical, dups)).toEqual([
			{ name: 'Constantinople' },
			{ name: 'Byzantium' },
		]);
	});

	it('signals "nothing new" when there is nothing to preserve', () => {
		const canonical = place({ id: 'c', name: 'Mumbai' });
		const dup = place({ id: 'd', name: 'Mumbai' });
		const merged = computeMergedHistoricalNames(canonical, [dup]);
		expect(merged.length).toBe(canonical.historicalNames?.length ?? 0);
	});

	it('trims whitespace and omits blank periods', () => {
		const canonical = place({ id: 'c', name: 'York' });
		const dup = place({ id: 'd', name: '  Eboracum  ', historicalNames: [{ name: 'Jorvik', period: '  ' }] });
		expect(computeMergedHistoricalNames(canonical, [dup])).toEqual([
			{ name: 'Eboracum' },
			{ name: 'Jorvik' },
		]);
	});
});

interface ParseAccess {
	parseHistoricalNames: (fm: Record<string, unknown>) => HistoricalName[];
}

function parse(fm: Record<string, unknown>): HistoricalName[] {
	const service = new PlaceGraphService({} as never);
	return (service as unknown as ParseAccess).parseHistoricalNames(fm);
}

describe('PlaceGraphService.parseHistoricalNames — load survives round-trip (#635)', () => {
	it('parses the canonical object form with and without a period', () => {
		expect(parse({ historical_names: [{ name: 'Bombay', period: 'British Raj' }, { name: 'Heptanesia' }] }))
			.toEqual([{ name: 'Bombay', period: 'British Raj' }, { name: 'Heptanesia' }]);
	});

	it('accepts a bare string entry as a name-only historical name', () => {
		expect(parse({ historical_names: ['Constantinople'] })).toEqual([{ name: 'Constantinople' }]);
	});

	it('skips malformed entries and blank names', () => {
		expect(parse({ historical_names: [{ period: 'orphan period' }, '', '  ', null, 42, { name: 'Byzantium' }] }))
			.toEqual([{ name: 'Byzantium' }]);
	});

	it('returns an empty array when historical_names is absent or not an array', () => {
		expect(parse({})).toEqual([]);
		expect(parse({ historical_names: 'Bombay' })).toEqual([]);
	});
});

describe('parseHistoricalNames — flat parallel-array form (#687)', () => {
	it('reads a flat string list with index-aligned periods', () => {
		expect(parseHistoricalNames({
			historical_names: ['Bombay', 'Heptanesia'],
			historical_name_periods: ['British Raj', ''],
		})).toEqual([{ name: 'Bombay', period: 'British Raj' }, { name: 'Heptanesia' }]);
	});

	it('reads a flat string list with no periods array', () => {
		expect(parseHistoricalNames({ historical_names: ['Lutèce', 'Paris'] }))
			.toEqual([{ name: 'Lutèce' }, { name: 'Paris' }]);
	});

	it('still reads the legacy nested object form (backward compatibility)', () => {
		expect(parseHistoricalNames({ historical_names: [{ name: 'Bombay', period: 'British Raj' }] }))
			.toEqual([{ name: 'Bombay', period: 'British Raj' }]);
	});
});

describe('toFlatHistoricalNames (#687)', () => {
	it('returns a plain string list when no entry has a period', () => {
		expect(toFlatHistoricalNames([{ name: 'Bombay' }, { name: 'Heptanesia' }]))
			.toEqual({ historical_names: ['Bombay', 'Heptanesia'] });
	});

	it('includes an index-aligned periods array when any entry has a period', () => {
		expect(toFlatHistoricalNames([{ name: 'Bombay', period: 'British Raj' }, { name: 'Heptanesia' }]))
			.toEqual({ historical_names: ['Bombay', 'Heptanesia'], historical_name_periods: ['British Raj', ''] });
	});

	it('returns null for an empty list', () => {
		expect(toFlatHistoricalNames([])).toBeNull();
	});

	it('round-trips through parseHistoricalNames', () => {
		const entries: HistoricalName[] = [{ name: 'Bombay', period: 'British Raj' }, { name: 'Heptanesia' }];
		const flat = toFlatHistoricalNames(entries)!;
		expect(parseHistoricalNames(flat as unknown as Record<string, unknown>)).toEqual(entries);
	});
});
