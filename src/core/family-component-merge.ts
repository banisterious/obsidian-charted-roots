/**
 * Family component merging for the Person Picker (#491).
 *
 * The picker treats each disconnected graph component as a separate "Family N"
 * tab even when multiple components share a `collectionName` (user-named groups
 * spanning unrelated characters, like player groups or friend circles). The
 * merge helper folds same-collection components into a single tab while
 * leaving unnamed components alone, and preserves the largest-first sort
 * contract from `FamilyGraphService.findAllFamilyComponents`.
 *
 * Extracted to its own file so the merge logic can be unit-tested without
 * pulling in the picker's UI dependencies.
 */

import type { PersonNode } from './family-graph';

/**
 * Shape returned by `FamilyGraphService.findAllFamilyComponents`, plus the
 * `collectionName` field the graph service computes when every member of a
 * connected component shares the same `group_name` / `collection` value.
 */
export interface FamilyComponent {
	representative: PersonNode;
	size: number;
	people: PersonNode[];
	collectionName?: string;
}

/**
 * Merge components that share the same `collectionName` into a single
 * component. Components without a `collectionName` are passed through
 * unchanged.
 *
 * `representative` after merge follows the same rule the graph service uses
 * for individual components (oldest birth date, alphabetical tiebreak).
 * Output is sorted by size descending so the largest groups land at the top
 * of the tab list.
 */
export function mergeFamilyComponentsByCollectionName(
	components: FamilyComponent[]
): FamilyComponent[] {
	const merged: FamilyComponent[] = [];
	const byName = new Map<string, FamilyComponent>();

	for (const component of components) {
		if (component.collectionName) {
			const existing = byName.get(component.collectionName);
			if (existing) {
				existing.people.push(...component.people);
				existing.size += component.size;
				if (preferAsRepresentative(component.representative, existing.representative)) {
					existing.representative = component.representative;
				}
			} else {
				const copy: FamilyComponent = { ...component, people: [...component.people] };
				byName.set(component.collectionName, copy);
				merged.push(copy);
			}
		} else {
			merged.push(component);
		}
	}

	// Re-sort by size descending so the merge doesn't break the largest-
	// first contract `findAllFamilyComponents` enforces on its output.
	merged.sort((a, b) => b.size - a.size);

	return merged;
}

/**
 * Choose between two representative candidates when merging components.
 * Mirrors the rule in `FamilyGraphService.findAllFamilyComponents`: prefer
 * an older birth date, with alphabetical tiebreak on equal (or missing)
 * birth dates. Returns `true` when the candidate should replace the current.
 */
function preferAsRepresentative(candidate: PersonNode, current: PersonNode): boolean {
	if (!current.birthDate && candidate.birthDate) return true;
	if (current.birthDate && !candidate.birthDate) return false;
	if (current.birthDate && candidate.birthDate) {
		if (candidate.birthDate < current.birthDate) return true;
		if (candidate.birthDate > current.birthDate) return false;
	}
	return candidate.name < current.name;
}
