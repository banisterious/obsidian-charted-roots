import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { computeSortOrder, formatCycleEvents } from '../src/events/services/sort-order-service';
import type { EventNote } from '../src/events/types/event-types';

/**
 * #721 — a reciprocal before/after pair (A says "before B", B says "after A")
 * encodes the same edge A→B twice. The adjacency is a Set (one edge), but
 * in-degree was incremented per relationship, so B's in-degree reached 2 and
 * never resolved — the topological sort reported a phantom cycle. The fix counts
 * in-degree only for new edges. Also covers that genuine cycles still surface
 * their event titles for the user.
 */

function makeEvent(overrides: Partial<EventNote> & { crId: string; title: string }): EventNote {
	const path = `${overrides.title}.md`;
	return {
		filePath: path,
		file: { path } as unknown as EventNote['file'],
		...overrides,
	} as EventNote;
}

/** Minimal App that captures sort_order writes instead of touching a vault. */
function makeApp(writes: Map<string, number>): App {
	return {
		fileManager: {
			processFrontMatter: async (file: { path: string }, cb: (fm: Record<string, unknown>) => void) => {
				const fm: Record<string, unknown> = {};
				cb(fm);
				if (typeof fm.sort_order === 'number') writes.set(file.path, fm.sort_order);
			},
		},
	} as unknown as App;
}

describe('computeSortOrder cycle handling (#721)', () => {
	it('orders a reciprocal before/after pair without reporting a phantom cycle', async () => {
		const events = [
			makeEvent({ crId: 'a', title: 'A', before: ['[[B]]'], date: 'EP -6' }),
			makeEvent({ crId: 'b', title: 'B', after: ['[[A]]'], date: 'EP -6' }),
		];
		const writes = new Map<string, number>();
		const result = await computeSortOrder(makeApp(writes), events, null);

		expect(result.cycleEvents).toEqual([]);
		// A precedes B: A gets the lower sort_order.
		expect(writes.get('A.md')!).toBeLessThan(writes.get('B.md')!);
	});

	it('still surfaces the titles of events in a genuine cycle', async () => {
		const events = [
			makeEvent({ crId: 'a', title: 'A', before: ['[[B]]'] }),
			makeEvent({ crId: 'b', title: 'B', before: ['[[A]]'] }), // real loop: A→B and B→A
		];
		const result = await computeSortOrder(makeApp(new Map()), events, null);

		expect(result.cycleEvents).toContain('A');
		expect(result.cycleEvents).toContain('B');
	});

	it('orders a non-reciprocal chain correctly', async () => {
		const events = [
			makeEvent({ crId: 'c', title: 'C', after: ['[[B]]'] }),
			makeEvent({ crId: 'b', title: 'B', after: ['[[A]]'] }),
			makeEvent({ crId: 'a', title: 'A' }),
		];
		const writes = new Map<string, number>();
		const result = await computeSortOrder(makeApp(writes), events, null);

		expect(result.cycleEvents).toEqual([]);
		expect(writes.get('A.md')!).toBeLessThan(writes.get('B.md')!);
		expect(writes.get('B.md')!).toBeLessThan(writes.get('C.md')!);
	});
});

describe('formatCycleEvents (#721)', () => {
	it('quotes and joins a short list', () => {
		expect(formatCycleEvents(['Scarring', 'Battle'])).toBe('"Scarring", "Battle"');
	});

	it('caps the list with an "and N more" overflow', () => {
		expect(formatCycleEvents(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 5))
			.toBe('"a", "b", "c", "d", "e", and 2 more');
	});
});
