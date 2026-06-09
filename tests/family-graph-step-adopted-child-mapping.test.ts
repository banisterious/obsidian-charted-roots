/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { FamilyGraphService } from '../src/core/family-graph';
import type { PersonNode } from '../src/core/family-graph';

/**
 * Regression coverage for the #525 / #526 follow-up: when a parent's
 * frontmatter declares step or adopted children via the flat properties
 * `step_child` / `adopted_child` (matched via the relationship-type
 * registry's `parseRelationshipsArrayForFamilyGraph` path), those entries
 * MUST land on the dedicated `stepchildrenCrIds` / `adoptedChildCrIds`
 * arrays — not bio `childrenCrIds`.
 *
 * Bug shape: both `step_child` and `adopted_child` relationship types had
 * `familyGraphMapping: 'child'`, so `addToFamilyGraphResult` pushed them
 * into `result.childrenCrIds` (bio). The relationship calculator's BFS
 * then found the child via the bio edge first and labeled the path as
 * a blood relation, ignoring the step/adoptive nature.
 *
 * Fix: distinct `'stepchild'` / `'adopted_child'` mapping values, with
 * dedicated cases in `addToFamilyGraphResult` and merge paths in
 * `extractPersonNode` so the dedicated arrays get populated.
 */

interface PrivateAccess {
	extractPersonNode: (file: TFile) => PersonNode | null;
}

function makeFile(path: string, basename: string): TFile {
	return makeTFile({ path, basename, extension: 'md' });
}

describe('FamilyGraphService — step_child / adopted_child relationship-array mapping (#525/#526 follow-up)', () => {
	it('routes a parent\'s flat `adopted_child` array to adoptedChildCrIds (not childrenCrIds)', () => {
		// Mirrors the Person B frontmatter shape we observed in the dev-vault
		// repro after running the test walkthroughs:
		//   adopted_child: ['[[Person A]]', '[[Person F]]']
		//   adopted_child_id: ['a-cr', 'f-cr']
		const app = new App();
		const service = new FamilyGraphService(app);

		const parentFile = makeFile('people/Parent.md', 'Parent');
		app.vault.files.set(parentFile.path, parentFile);
		app.metadataCache._setFrontmatter(parentFile, {
			cr_id: 'parent-cr',
			cr_type: 'person',
			name: 'Parent',
			adopted_child: ['[[Person A]]', '[[Person F]]'],
			adopted_child_id: ['a-cr', 'f-cr']
		});

		const node = (service as unknown as PrivateAccess).extractPersonNode(parentFile);
		expect(node).not.toBeNull();
		expect(node!.adoptedChildCrIds).toEqual(expect.arrayContaining(['a-cr', 'f-cr']));
		expect(node!.childrenCrIds).not.toContain('a-cr');
		expect(node!.childrenCrIds).not.toContain('f-cr');
	});

	it('routes a parent\'s flat `step_child` array to stepchildrenCrIds (not childrenCrIds)', () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		const parentFile = makeFile('people/Stepparent.md', 'Stepparent');
		app.vault.files.set(parentFile.path, parentFile);
		app.metadataCache._setFrontmatter(parentFile, {
			cr_id: 'sp-cr',
			cr_type: 'person',
			name: 'Stepparent',
			step_child: ['[[Person C]]'],
			step_child_id: ['c-cr']
		});

		const node = (service as unknown as PrivateAccess).extractPersonNode(parentFile);
		expect(node).not.toBeNull();
		expect(node!.stepchildrenCrIds).toContain('c-cr');
		expect(node!.childrenCrIds).not.toContain('c-cr');
	});

	it('still routes bio child entries to childrenCrIds (regression guard)', () => {
		// The `child` relationship type retains `familyGraphMapping: 'child'`,
		// so a parent's bio children should still land in childrenCrIds.
		// Use the canonical `children_id` plural field (matches Person B's
		// dev-vault frontmatter shape).
		const app = new App();
		const service = new FamilyGraphService(app);

		const parentFile = makeFile('people/BioParent.md', 'BioParent');
		app.vault.files.set(parentFile.path, parentFile);
		app.metadataCache._setFrontmatter(parentFile, {
			cr_id: 'bp-cr',
			cr_type: 'person',
			name: 'BioParent',
			children: '[[Person G]]',
			children_id: 'g-cr'
		});

		const node = (service as unknown as PrivateAccess).extractPersonNode(parentFile);
		expect(node).not.toBeNull();
		expect(node!.childrenCrIds).toContain('g-cr');
		expect(node!.adoptedChildCrIds).not.toContain('g-cr');
		expect(node!.stepchildrenCrIds).not.toContain('g-cr');
	});

	it('handles mixed bio + adopted child arrays on the same parent', () => {
		// A parent who has BOTH a bio child and an adopted child.
		// (The dev-vault Person B is exactly this shape — one bio child G,
		// two adopted children A and F.)
		const app = new App();
		const service = new FamilyGraphService(app);

		const parentFile = makeFile('people/MixedParent.md', 'MixedParent');
		app.vault.files.set(parentFile.path, parentFile);
		app.metadataCache._setFrontmatter(parentFile, {
			cr_id: 'mp-cr',
			cr_type: 'person',
			name: 'MixedParent',
			children: '[[Person G]]',
			children_id: 'g-cr',
			adopted_child: ['[[Person A]]'],
			adopted_child_id: ['a-cr']
		});

		const node = (service as unknown as PrivateAccess).extractPersonNode(parentFile);
		expect(node).not.toBeNull();
		// Bio child stays bio
		expect(node!.childrenCrIds).toContain('g-cr');
		// Adopted child is in adoptedChildCrIds, NOT in childrenCrIds
		expect(node!.adoptedChildCrIds).toContain('a-cr');
		expect(node!.childrenCrIds).not.toContain('a-cr');
	});
});