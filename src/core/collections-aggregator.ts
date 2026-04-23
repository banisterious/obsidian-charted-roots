/**
 * Cross-entity collection aggregator — pure helper that merges person-side
 * and place-side collection lists into a single sorted list with per-entity
 * counts. Factored out of the UI call sites so the merge logic can be
 * unit-tested without pulling in Obsidian or service mocks (#426).
 *
 * Collections are stored as frontmatter `collection:` strings on both
 * person and place notes. Each source (FamilyGraphService, PlaceGraphService)
 * has its own aggregator that returns per-entity-type counts; this helper
 * joins them by collection name, preserving zero-counts on the empty side
 * so callers can render contextual "X people / Y places / X people, Y places"
 * badges without re-deriving the breakdown.
 */

/**
 * A single collection after cross-entity aggregation. `totalCount` is
 * guaranteed to equal `personCount + placeCount` and is never zero (the
 * aggregator drops empty rows — a name present in the input with zero
 * on both sides would only happen if a caller passed a malformed entry).
 */
export interface AggregatedCollection {
	name: string;
	personCount: number;
	placeCount: number;
	totalCount: number;
}

/**
 * Merge person-side and place-side collection lists into a cross-entity
 * list. Both inputs are flat `{ name, count }` arrays — the caller derives
 * these from the respective services (`FamilyGraphService.getUserCollections()`
 * for persons, `PlaceGraphService.calculateStatistics().byCollection` for
 * places) so this helper stays service-agnostic and easy to test.
 *
 * Sort order: `totalCount` descending, ties broken alphabetically by name
 * (case-insensitive). Matches the existing `FamilyGraphService.getUserCollections`
 * sort so UI ordering stays consistent across callers.
 *
 * Duplicate names within a single input array are collapsed additively
 * (their counts sum). Names that appear in both inputs are joined with
 * per-entity-type counts preserved separately — this is the whole point
 * of the helper.
 */
export function aggregateCollections(
	personCollections: Array<{ name: string; count: number }>,
	placeCollections: Array<{ name: string; count: number }>
): AggregatedCollection[] {
	const byName = new Map<string, { personCount: number; placeCount: number }>();

	for (const entry of personCollections) {
		if (!entry.name) continue;
		const existing = byName.get(entry.name);
		if (existing) {
			existing.personCount += entry.count;
		} else {
			byName.set(entry.name, { personCount: entry.count, placeCount: 0 });
		}
	}

	for (const entry of placeCollections) {
		if (!entry.name) continue;
		const existing = byName.get(entry.name);
		if (existing) {
			existing.placeCount += entry.count;
		} else {
			byName.set(entry.name, { personCount: 0, placeCount: entry.count });
		}
	}

	const result: AggregatedCollection[] = [];
	for (const [name, counts] of byName.entries()) {
		const totalCount = counts.personCount + counts.placeCount;
		if (totalCount === 0) continue;
		result.push({
			name,
			personCount: counts.personCount,
			placeCount: counts.placeCount,
			totalCount
		});
	}

	result.sort((a, b) => {
		if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
		return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
	});

	return result;
}
