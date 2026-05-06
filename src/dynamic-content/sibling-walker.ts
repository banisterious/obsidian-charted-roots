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
 * Walk each parent's biological children to produce the set of sibling
 * crIds, excluding the target person. Missing parents (resolver returns
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
 * Walk each parent's adopted children to produce the set of sibling
 * crIds, excluding the target person. Counterpart to
 * `gatherSiblingsFromParents` — needed because adopted children live in
 * `adoptedChildCrIds` on the parent node, not `childrenCrIds` (#525/#526).
 */
export function gatherAdoptedSiblingsFromParents(
	parentCrIds: readonly string[],
	selfCrId: string,
	getPerson: PersonLookup
): string[] {
	const siblings = new Set<string>();
	for (const parentCrId of parentCrIds) {
		const parent = getPerson(parentCrId);
		if (!parent) continue;
		for (const adoptedChildCrId of parent.adoptedChildCrIds) {
			if (adoptedChildCrId !== selfCrId) {
				siblings.add(adoptedChildCrId);
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
 * Adoptive siblings: anyone who shares an adoptive household with this
 * person via either direction of the adoption edge. Three sources merged:
 *
 *   1. Self bio + sibling adopted — adopted children of self's biological
 *      parents (someone else was adopted into self's bio household).
 *   2. Self adopted + sibling bio — biological children of self's adoptive
 *      parents (the adoptive parents already had bio kids when self was
 *      adopted in).
 *   3. Self adopted + sibling adopted — other adopted children of self's
 *      adoptive parents.
 *
 * Distinct from biological so the caller can label and dedupe separately.
 */
export function findAdoptiveSiblingCrIds(
	person: PersonNode,
	getPerson: PersonLookup
): string[] {
	const bioParentCrIds: string[] = [];
	if (person.fatherCrId) bioParentCrIds.push(person.fatherCrId);
	if (person.motherCrId) bioParentCrIds.push(person.motherCrId);
	for (const crId of person.parentCrIds) bioParentCrIds.push(crId);

	const adoptiveParentCrIds: string[] = [];
	if (person.adoptiveFatherCrId) adoptiveParentCrIds.push(person.adoptiveFatherCrId);
	if (person.adoptiveMotherCrId) adoptiveParentCrIds.push(person.adoptiveMotherCrId);
	for (const crId of person.adoptiveParentCrIds) adoptiveParentCrIds.push(crId);

	const siblings = new Set<string>();
	for (const crId of gatherAdoptedSiblingsFromParents(bioParentCrIds, person.crId, getPerson)) {
		siblings.add(crId);
	}
	for (const crId of gatherSiblingsFromParents(adoptiveParentCrIds, person.crId, getPerson)) {
		siblings.add(crId);
	}
	for (const crId of gatherAdoptedSiblingsFromParents(adoptiveParentCrIds, person.crId, getPerson)) {
		siblings.add(crId);
	}
	return Array.from(siblings);
}
