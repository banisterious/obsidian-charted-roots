/**
 * Spouse frontmatter format detector.
 *
 * The bidirectional linker writes a reciprocal spouse entry to a target
 * note when a source note's spouse relationship is saved. Historically
 * the write branched on the SOURCE's format (indexed `spouseN:` vs flat
 * `spouse:`), which meant a target already using indexed format could
 * have a flat `spouse:` key added — producing duplicate YAML keys and
 * silently wiping the target's indexed spouse list (#420 Gap B).
 *
 * This helper inspects the TARGET's frontmatter and decides how a new
 * spouse entry should be written on it, preserving the target's
 * existing format. Pure: no I/O, no Obsidian types.
 */

/**
 * Maximum indexed spouse slot we probe for. Matches the bounds used
 * elsewhere in the codebase (e.g., `person-note-writer.ts` clears
 * `spouse1`–`spouse10` when switching formats).
 */
const MAX_SPOUSE_INDEX = 10;

/**
 * Decision on how to write a new spouse entry to a target note.
 *
 * - `indexed` — the target already uses `spouseN:` slots; append at the
 *   next unused index.
 * - `flat` — the target has no indexed slots; use the legacy
 *   `spouse:` / `spouse_id:` scalar-or-array form.
 */
export type SpouseTargetFormat =
	| { format: 'indexed'; nextIndex: number }
	| { format: 'flat' };

/**
 * Detect whether a target's frontmatter currently uses indexed
 * `spouseN:` slots. Scans `spouse1`..`spouseN` and `spouse1_id`..
 * `spouseN_id` up to MAX_SPOUSE_INDEX.
 *
 * If any indexed slot has a non-empty value, the target is considered
 * to use indexed format and the helper returns the first open slot.
 * Otherwise the target uses flat format.
 *
 * Indexed wins on mixed state (indexed + flat keys both present) so a
 * target whose flat keys are residue from an earlier incorrect bidi
 * write still appends cleanly to its indexed list instead of adding
 * another flat duplicate.
 */
export function detectSpouseTargetFormat(
	frontmatter: Record<string, unknown>
): SpouseTargetFormat {
	let firstOpenIndex: number | null = null;
	let anyIndexedSlotUsed = false;

	for (let i = 1; i <= MAX_SPOUSE_INDEX; i++) {
		const wikilinkValue = frontmatter[`spouse${i}`];
		const idValue = frontmatter[`spouse${i}_id`];
		const slotIsUsed = hasValue(wikilinkValue) || hasValue(idValue);

		if (slotIsUsed) {
			anyIndexedSlotUsed = true;
		} else if (firstOpenIndex === null) {
			firstOpenIndex = i;
		}
	}

	if (anyIndexedSlotUsed) {
		return {
			format: 'indexed',
			nextIndex: firstOpenIndex ?? MAX_SPOUSE_INDEX + 1
		};
	}

	return { format: 'flat' };
}

/**
 * Treat null / undefined / empty-string / empty-array values as "slot
 * not used." Matches the existing bidi-linker's field-presence checks.
 */
function hasValue(value: unknown): boolean {
	if (value === undefined || value === null) return false;
	if (typeof value === 'string') return value.length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}
