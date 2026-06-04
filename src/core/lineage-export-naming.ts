/**
 * Build the default filename label for a single-lineage canvas export.
 *
 * #673 — the Split wizard's Single-lineage method defaulted every export to a
 * generic `lineage.canvas`, so exporting a second lineage collided with the
 * first. Folding the start and end person into the label gives each lineage a
 * distinguishing name, mirroring the per-person timeline export naming from
 * #657 and the descriptors the other split methods already use.
 *
 * Returns a bare `lineage` when either endpoint is missing (e.g. a preview
 * before both people are selected). Whitespace is collapsed to dashes; the
 * canvas writer applies full filename sanitization on top, so this only needs
 * to produce a readable, distinguishing base.
 */
export function lineageExportLabel(startName?: string | null, endName?: string | null): string {
	const start = startName?.trim();
	const end = endName?.trim();
	if (!start || !end) return 'lineage';
	const dashed = (name: string): string => name.replace(/\s+/g, '-');
	return `lineage-${dashed(start)}-to-${dashed(end)}`;
}
