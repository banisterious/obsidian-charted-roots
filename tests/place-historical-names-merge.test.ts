import { describe, expect, it } from 'vitest';
import { computeMergedHistoricalNames, type PlaceNode, type HistoricalName } from '../src/models/place';
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
