/**
 * Build the merged universe list shown in entity-modal dropdowns
 * (Edit Person, etc.).
 *
 * Three sources are combined so the list reflects every universe the user
 * has defined or referenced:
 *
 * 1. Universe notes in the universes folder — the authoritative `name`
 *    source. Includes universes the user has just created or renamed but
 *    whose new name no entity references yet (#488 Part 1). Also preserves
 *    the **typed name** when the file basename has been sanitized (e.g.
 *    `Star Wars (AU)` typed → `Star Wars AU` basename) so users can pick
 *    either form (#505).
 * 2. Distinct `universe:` field values from person notes.
 * 3. Distinct `universe:` field values from place notes.
 *
 * Sources 2 and 3 keep working for vaults that reference universes
 * informally (no Universe note created), and they cover the legacy case
 * where a Universe note's name diverges from a referencing note's
 * `universe:` value (the rename hasn't cascaded through yet — see #488
 * Part 2).
 *
 * Returns a sorted, de-duplicated string list.
 */
export function mergeUniverseList(args: {
	universeNoteNames: ReadonlyArray<string>;
	personUniverses: ReadonlyArray<string>;
	placeUniverses: ReadonlyArray<string>;
}): string[] {
	return [...new Set([
		...args.universeNoteNames,
		...args.personUniverses,
		...args.placeUniverses,
	])].sort();
}
