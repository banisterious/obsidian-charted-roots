import { describe, expect, it } from 'vitest';
import { lineageExportLabel } from '../src/core/lineage-export-naming';

/**
 * #673 — the Split wizard's Single-lineage export defaulted to a generic
 * `lineage.canvas`, so a second lineage collided with the first. The default
 * label now folds the start and end person into the name (mirroring the #657
 * timeline-export naming), giving each lineage a distinguishing filename.
 */

describe('lineageExportLabel (#673)', () => {
	it('folds start and end person into the default label', () => {
		expect(lineageExportLabel('Aaron Wilkin', 'Mara Wilkin')).toBe('lineage-Aaron-Wilkin-to-Mara-Wilkin');
	});

	it('distinguishes two different lineages (no collision)', () => {
		const a = lineageExportLabel('Aaron Wilkin', 'Mara Wilkin');
		const b = lineageExportLabel('Rolf Wilkin', 'Jace Wilkin');
		expect(a).not.toBe(b);
	});

	it('falls back to a bare label when an endpoint is missing', () => {
		expect(lineageExportLabel(undefined, 'Mara Wilkin')).toBe('lineage');
		expect(lineageExportLabel('Aaron Wilkin', undefined)).toBe('lineage');
		expect(lineageExportLabel(undefined, undefined)).toBe('lineage');
		expect(lineageExportLabel('', '')).toBe('lineage');
	});

	it('collapses whitespace to dashes and trims', () => {
		expect(lineageExportLabel('  Aaron   Wilkin  ', 'Mara Wilkin')).toBe('lineage-Aaron-Wilkin-to-Mara-Wilkin');
	});
});
