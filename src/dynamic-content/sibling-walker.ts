/**
 * Sibling-derivation helpers for the dynamic relationships block.
 *
 * Extracted as pure functions so the walker can be unit-tested without
 * instantiating a real `FamilyGraphService`. Callers pass a lookup
 * callback that encapsulates the graph access; the helpers themselves
 * do no I/O.
 *
 * Biological and adoptive siblings are derived separately so the caller
 * can label or dedupe them independently (#417).
 */

import type { PersonNode } from '../core/family-graph';

/** Callback the walker uses to resolve a crId → PersonNode. */
export type PersonLookup = (crId: string) => PersonNode | undefined;

/**
 * Walk each parent's children to produce the set of sibling crIds,
 * excluding the target person. Missing parents (resolver returns
 * undefined) are skipped rather than failing the whole walk.
 */
export function gatherSiblingsFromParents(
	parentCrIds: readonly string[],
	selfCrId: string,
	getPerson: PersonLookup
): string[] {
	const siblings = new Set<string>();
	for (const parentCrId of parentCrIds) {
		const parent = getPerson(parentCrId);
		if (!parent) continue;
		for (const childCrId of parent.childrenCrIds) {
			if (childCrId !== selfCrId) {
				siblings.add(childCrId);
			}
		}
	}
	return Array.from(siblings);
}

/**
 * Biological siblings: anyone else listed under this person's
 * `father` / `mother` / gender-neutral `parents` edges.
 */
export function findBiologicalSiblingCrIds(
	person: PersonNode,
	getPerson: PersonLookup
): string[] {
	const parentCrIds: string[] = [];
	if (person.fatherCrId) parentCrIds.push(person.fatherCrId);
	if (person.motherCrId) parentCrIds.push(person.motherCrId);
	for (const crId of person.parentCrIds) parentCrIds.push(crId);
	return gatherSiblingsFromParents(parentCrIds, person.crId, getPerson);
}

/**
 * Adoptive siblings: anyone else listed under this person's
 * `adoptive_father` / `adoptive_mother` / gender-neutral
 * `adoptive_parents` edges. Distinct from biological so the caller
 * can label and dedupe separately.
 */
export function findAdoptiveSiblingCrIds(
	person: PersonNode,
	getPerson: PersonLookup
): string[] {
	const parentCrIds: string[] = [];
	if (person.adoptiveFatherCrId) parentCrIds.push(person.adoptiveFatherCrId);
	if (person.adoptiveMotherCrId) parentCrIds.push(person.adoptiveMotherCrId);
	for (const crId of person.adoptiveParentCrIds) parentCrIds.push(crId);
	return gatherSiblingsFromParents(parentCrIds, person.crId, getPerson);
}
