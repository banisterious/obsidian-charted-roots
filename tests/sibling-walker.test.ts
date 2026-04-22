import { describe, expect, it } from 'vitest';
import {
	findAdoptiveSiblingCrIds,
	findBiologicalSiblingCrIds,
	gatherSiblingsFromParents
} from '../src/dynamic-content/sibling-walker';
import type { PersonNode } from '../src/core/family-graph';

/**
 * Regression coverage for #417 — the dynamic relationships block's
 * sibling walker now traverses adoptive parent edges in addition to
 * biological ones. The helpers are pure (I/O lives in the `getPerson`
 * callback), so the tests fence their behavior directly without an
 * Obsidian vault or a live family graph.
 */

/**
 * Build a minimal PersonNode stub. Only the fields the walker touches
 * need to be populated; defaults cover the rest.
 */
function makePerson(overrides: Partial<PersonNode> & { crId: string }): PersonNode {
	return {
		crId: overrides.crId,
		name: overrides.name ?? overrides.crId,
		file: overrides.file ?? ({} as PersonNode['file']),
		fatherCrId: overrides.fatherCrId,
		motherCrId: overrides.motherCrId,
		parentCrIds: overrides.parentCrIds ?? [],
		stepfatherCrIds: overrides.stepfatherCrIds ?? [],
		stepmotherCrIds: overrides.stepmotherCrIds ?? [],
		adoptiveFatherCrId: overrides.adoptiveFatherCrId,
		adoptiveMotherCrId: overrides.adoptiveMotherCrId,
		adoptiveParentCrIds: overrides.adoptiveParentCrIds ?? [],
		spouseCrIds: overrides.spouseCrIds ?? [],
		childrenCrIds: overrides.childrenCrIds ?? [],
		birthDate: overrides.birthDate,
		deathDate: overrides.deathDate
	} as PersonNode;
}

/**
 * Build a lookup callback over a fixed set of PersonNodes, keyed by crId.
 */
function makeLookup(people: PersonNode[]): (crId: string) => PersonNode | undefined {
	const map = new Map(people.map(p => [p.crId, p]));
	return (crId: string) => map.get(crId);
}

describe('gatherSiblingsFromParents', () => {
	it('returns other children of a single parent, excluding self', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['me', 'alice', 'bob'] });
		const result = gatherSiblingsFromParents(['dad'], 'me', makeLookup([dad]));
		expect(result.sort()).toEqual(['alice', 'bob']);
	});

	it('deduplicates across multiple parents with overlapping children', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['me', 'alice', 'bob'] });
		const mom = makePerson({ crId: 'mom', childrenCrIds: ['me', 'alice', 'carol'] });
		const result = gatherSiblingsFromParents(['dad', 'mom'], 'me', makeLookup([dad, mom]));
		expect(result.sort()).toEqual(['alice', 'bob', 'carol']);
	});

	it('skips missing parents rather than failing the walk', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['me', 'alice'] });
		// 'ghost' is not in the lookup map; walker should ignore it.
		const result = gatherSiblingsFromParents(['dad', 'ghost'], 'me', makeLookup([dad]));
		expect(result).toEqual(['alice']);
	});

	it('returns empty when no parents are provided', () => {
		const result = gatherSiblingsFromParents([], 'me', makeLookup([]));
		expect(result).toEqual([]);
	});

	it('returns empty when parent has no other children', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['me'] });
		const result = gatherSiblingsFromParents(['dad'], 'me', makeLookup([dad]));
		expect(result).toEqual([]);
	});
});

describe('findBiologicalSiblingCrIds', () => {
	it('walks fatherCrId', () => {
		const me = makePerson({ crId: 'me', fatherCrId: 'dad' });
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['me', 'alice'] });
		const result = findBiologicalSiblingCrIds(me, makeLookup([me, dad]));
		expect(result).toEqual(['alice']);
	});

	it('walks motherCrId', () => {
		const me = makePerson({ crId: 'me', motherCrId: 'mom' });
		const mom = makePerson({ crId: 'mom', childrenCrIds: ['me', 'bob'] });
		const result = findBiologicalSiblingCrIds(me, makeLookup([me, mom]));
		expect(result).toEqual(['bob']);
	});

	it('walks gender-neutral parentCrIds', () => {
		const me = makePerson({ crId: 'me', parentCrIds: ['parent1', 'parent2'] });
		const p1 = makePerson({ crId: 'parent1', childrenCrIds: ['me', 'alice'] });
		const p2 = makePerson({ crId: 'parent2', childrenCrIds: ['me', 'bob'] });
		const result = findBiologicalSiblingCrIds(me, makeLookup([me, p1, p2]));
		expect(result.sort()).toEqual(['alice', 'bob']);
	});

	it('does NOT walk adoptive parent edges', () => {
		const me = makePerson({
			crId: 'me',
			fatherCrId: 'bio-dad',
			adoptiveFatherCrId: 'adoptive-dad'
		});
		const bioDad = makePerson({ crId: 'bio-dad', childrenCrIds: ['me', 'alice'] });
		const adoptiveDad = makePerson({ crId: 'adoptive-dad', childrenCrIds: ['me', 'carol'] });
		const result = findBiologicalSiblingCrIds(me, makeLookup([me, bioDad, adoptiveDad]));
		expect(result).toEqual(['alice']);
	});

	it('returns empty when no biological parents are set', () => {
		const me = makePerson({ crId: 'me' });
		const result = findBiologicalSiblingCrIds(me, makeLookup([me]));
		expect(result).toEqual([]);
	});
});

describe('findAdoptiveSiblingCrIds', () => {
	it('walks adoptiveFatherCrId (#417)', () => {
		const me = makePerson({ crId: 'me', adoptiveFatherCrId: 'adoptive-dad' });
		const adoptiveDad = makePerson({
			crId: 'adoptive-dad',
			childrenCrIds: ['me', 'alice', 'bob']
		});
		const result = findAdoptiveSiblingCrIds(me, makeLookup([me, adoptiveDad]));
		expect(result.sort()).toEqual(['alice', 'bob']);
	});

	it('walks adoptiveMotherCrId', () => {
		const me = makePerson({ crId: 'me', adoptiveMotherCrId: 'adoptive-mom' });
		const adoptiveMom = makePerson({
			crId: 'adoptive-mom',
			childrenCrIds: ['me', 'carol']
		});
		const result = findAdoptiveSiblingCrIds(me, makeLookup([me, adoptiveMom]));
		expect(result).toEqual(['carol']);
	});

	it('walks gender-neutral adoptiveParentCrIds', () => {
		const me = makePerson({ crId: 'me', adoptiveParentCrIds: ['ap1', 'ap2'] });
		const ap1 = makePerson({ crId: 'ap1', childrenCrIds: ['me', 'dan'] });
		const ap2 = makePerson({ crId: 'ap2', childrenCrIds: ['me', 'eve'] });
		const result = findAdoptiveSiblingCrIds(me, makeLookup([me, ap1, ap2]));
		expect(result.sort()).toEqual(['dan', 'eve']);
	});

	it('does NOT walk biological parent edges', () => {
		const me = makePerson({
			crId: 'me',
			fatherCrId: 'bio-dad',
			adoptiveFatherCrId: 'adoptive-dad'
		});
		const bioDad = makePerson({ crId: 'bio-dad', childrenCrIds: ['me', 'alice'] });
		const adoptiveDad = makePerson({ crId: 'adoptive-dad', childrenCrIds: ['me', 'carol'] });
		const result = findAdoptiveSiblingCrIds(me, makeLookup([me, bioDad, adoptiveDad]));
		expect(result).toEqual(['carol']);
	});

	it('returns empty when no adoptive parents are set', () => {
		const me = makePerson({ crId: 'me', fatherCrId: 'dad' });
		const result = findAdoptiveSiblingCrIds(me, makeLookup([me]));
		expect(result).toEqual([]);
	});

	it('Galen case: adoptive parent with existing biological children', () => {
		// DigitalDreamn's reported scenario: Galen has adoptive parent A who
		// already has biological children B, C. B and C should surface as
		// Galen's adoptive siblings.
		const galen = makePerson({ crId: 'galen', adoptiveFatherCrId: 'adoptive-a' });
		const adoptiveA = makePerson({
			crId: 'adoptive-a',
			childrenCrIds: ['b', 'c', 'galen']
		});
		const result = findAdoptiveSiblingCrIds(galen, makeLookup([galen, adoptiveA]));
		expect(result.sort()).toEqual(['b', 'c']);
	});
});
