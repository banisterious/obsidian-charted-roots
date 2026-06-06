/**
 * Helpers for composing a person's display name from GEDCOM name parts.
 */

/**
 * Fold a generational name suffix (e.g. "Jr.", "Sr.", "III") into the display
 * name (#685). Some import formats keep the suffix in a separate field — GEDCOM
 * in the `NSFX` tag, GEDCOM-X in a `Suffix` name-part — so relatives who share a
 * given name and surname otherwise resolve to the same note name and get
 * numeric-deduplicated (`John Smith`, `John Smith 1`, `John Smith 2`) instead of
 * keeping their suffix. Appending it keeps them distinct in both the note name
 * and the filename. Shared by the GEDCOM and GEDCOM-X importers.
 *
 * The suffix is only appended when it isn't already the trailing word of the
 * name, since some GEDCOMs also place it inline in the NAME value — guarding
 * against a doubled "John Smith III III".
 */
export function composePersonName(name: string, nameSuffix?: string): string {
	const base = (name ?? '').trim();
	const suffix = nameSuffix?.trim();
	if (!suffix) return base;

	const lowerBase = base.toLowerCase();
	const lowerSuffix = suffix.toLowerCase();
	if (lowerBase === lowerSuffix || lowerBase.endsWith(` ${lowerSuffix}`)) {
		return base;
	}

	return base ? `${base} ${suffix}` : suffix;
}
