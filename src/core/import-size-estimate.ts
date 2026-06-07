/**
 * Projected-size estimate for an import, used to warn before a very large
 * import runs (#688). Obsidian degrades well before tens of thousands of
 * notes — community experience puts the slowdown in the low thousands — so a
 * heads-up with the projected note count lets a user scope their file down
 * before committing to a long import that produces an unusable vault.
 */

/**
 * Total projected notes at or above which an import is flagged as large.
 * Chosen around the point where vault size starts to noticeably degrade
 * Obsidian (#688 cites ~10k as a reasonable soft threshold).
 */
export const LARGE_IMPORT_THRESHOLD = 10_000;

export interface ImportSizeEstimateInput {
	/** Per-entity record counts from the parse/preview pass. */
	people: number;
	places: number;
	sources: number;
	events: number;
	/** Whether each entity type is selected for import (drives note creation). */
	importPeople: boolean;
	importPlaces: boolean;
	importSources: boolean;
	importEvents: boolean;
}

export interface ImportSizeEstimate {
	/** Projected notes created across the enabled entity types. */
	totalNotes: number;
	/** True when the total is large enough to risk degrading Obsidian. */
	isLarge: boolean;
}

/**
 * Project how many notes an import will create from the per-entity preview
 * counts, summing only the entity types the user has enabled, and flag whether
 * that total crosses the large-import threshold. Counts are treated as 0 when
 * negative or non-finite so a malformed preview can't produce a bogus estimate.
 */
export function estimateImportSize(
	input: ImportSizeEstimateInput,
	threshold: number = LARGE_IMPORT_THRESHOLD
): ImportSizeEstimate {
	const safe = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

	let totalNotes = 0;
	if (input.importPeople) totalNotes += safe(input.people);
	if (input.importPlaces) totalNotes += safe(input.places);
	if (input.importSources) totalNotes += safe(input.sources);
	if (input.importEvents) totalNotes += safe(input.events);

	return {
		totalNotes,
		isLarge: totalNotes >= threshold,
	};
}
