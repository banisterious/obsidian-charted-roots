import { describe, expect, it } from 'vitest';
import {
	RelationshipQueryService,
	type PersonLookup,
	type ChildKind,
	type ParentKind,
	type SiblingKind
} from '../src/core/relationship-query-service';
import type { PersonNode } from '../src/core/family-graph';
import { createDateService } from '../src/dates/services/date-service';

/**
 * Coverage for the unified relationship-query service introduced under
 * #546. The service is pure (I/O lives in the `getPerson` callback), so
 * tests fence behavior directly without an Obsidian vault.
 *
 * Test fixtures use a "Lars/Skywalker" cast as a recurring scenario for
 * adopted/step coverage — Cliegg + Shmi (parents), with Cliegg's bio son
 * Owen (Shmi's stepson) and Shmi's bio son Anakin (Cliegg's stepson),
 * plus Galen as an adopted child of an unrelated couple. Reflects the
 * #545 / DigitalDreamn vault shape that motivated this work.
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
		spouses: overrides.spouses,
		childrenCrIds: overrides.childrenCrIds ?? [],
		adoptedChildCrIds: overrides.adoptedChildCrIds ?? [],
		stepchildrenCrIds: overrides.stepchildrenCrIds ?? [],
		birthDate: overrides.birthDate,
		deathDate: overrides.deathDate
	} as PersonNode;
}

function makeLookup(people: PersonNode[]): PersonLookup {
	const map = new Map(people.map(p => [p.crId, p]));
	return (crId: string) => map.get(crId);
}

describe('RelationshipQueryService — getChildren', () => {
	it('returns bio children with kind="bio" when include="bio"', () => {
		const ben = makePerson({ crId: 'ben', childrenCrIds: ['luke', 'leia'] });
		const luke = makePerson({ crId: 'luke' });
		const leia = makePerson({ crId: 'leia' });
		const svc = new RelationshipQueryService(makeLookup([ben, luke, leia]));

		const result = svc.getChildren(ben, { include: 'bio' });
		expect(result).toHaveLength(2);
		expect(result.map(r => r.person.crId)).toEqual(['luke', 'leia']);
		expect(result.every(r => r.kind === 'bio')).toBe(true);
	});

	it('returns adopted children with kind="adopted" when include="adopted"', () => {
		const marie = makePerson({ crId: 'marie', adoptedChildCrIds: ['galen'] });
		const galen = makePerson({ crId: 'galen' });
		const svc = new RelationshipQueryService(makeLookup([marie, galen]));

		const result = svc.getChildren(marie, { include: 'adopted' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('galen');
		expect(result[0].kind).toBe('adopted');
	});

	it('returns step children with kind="step" when include="step"', () => {
		const shmi = makePerson({ crId: 'shmi', stepchildrenCrIds: ['owen'] });
		const owen = makePerson({ crId: 'owen' });
		const svc = new RelationshipQueryService(makeLookup([shmi, owen]));

		const result = svc.getChildren(shmi, { include: 'step' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('owen');
		expect(result[0].kind).toBe('step');
	});

	it('returns bio + adopted + step in that order when include="all"', () => {
		const parent = makePerson({
			crId: 'p',
			childrenCrIds: ['bio1'],
			adoptedChildCrIds: ['adopted1'],
			stepchildrenCrIds: ['step1']
		});
		const bio1 = makePerson({ crId: 'bio1' });
		const adopted1 = makePerson({ crId: 'adopted1' });
		const step1 = makePerson({ crId: 'step1' });
		const svc = new RelationshipQueryService(makeLookup([parent, bio1, adopted1, step1]));

		const result = svc.getChildren(parent, { include: 'all' });
		expect(result.map(r => r.person.crId)).toEqual(['bio1', 'adopted1', 'step1']);
		expect(result.map(r => r.kind)).toEqual(['bio', 'adopted', 'step']);
	});

	it('skips children whose crId resolves to undefined (orphaned references)', () => {
		const parent = makePerson({
			crId: 'p',
			childrenCrIds: ['real', 'missing']
		});
		const real = makePerson({ crId: 'real' });
		const svc = new RelationshipQueryService(makeLookup([parent, real]));

		const result = svc.getChildren(parent, { include: 'all' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('real');
	});

	it('returns empty array when person has no children of any kind', () => {
		const lonely = makePerson({ crId: 'lonely' });
		const svc = new RelationshipQueryService(makeLookup([lonely]));

		expect(svc.getChildren(lonely, { include: 'all' })).toEqual([]);
		expect(svc.getChildren(lonely, { include: 'bio' })).toEqual([]);
		expect(svc.getChildren(lonely, { include: 'adopted' })).toEqual([]);
		expect(svc.getChildren(lonely, { include: 'step' })).toEqual([]);
	});

	describe('sortByBirthDate tiebreak (#590)', () => {
		const dateService = createDateService({
			enableFictionalDates: false,
			showBuiltInDateSystems: false,
			fictionalDateSystems: [],
		});

		it('sorts twins on the same date by ISO 8601 time component', () => {
			const parent = makePerson({ crId: 'parent', childrenCrIds: ['twin-b', 'twin-a'] });
			const twinA = makePerson({ crId: 'twin-a', birthDate: '1985-04-12T03:42' });
			const twinB = makePerson({ crId: 'twin-b', birthDate: '1985-04-12T03:51' });
			const svc = new RelationshipQueryService(makeLookup([parent, twinA, twinB]));

			const result = svc.getChildren(parent, { include: 'bio', sortByBirthDate: dateService });
			expect(result.map(r => r.person.crId)).toEqual(['twin-a', 'twin-b']);
		});

		it('sorts triplets on the same date by ISO 8601 time component', () => {
			const parent = makePerson({ crId: 'parent', childrenCrIds: ['c', 'a', 'b'] });
			const a = makePerson({ crId: 'a', birthDate: '1985-04-12T03:42' });
			const b = makePerson({ crId: 'b', birthDate: '1985-04-12T03:51' });
			const c = makePerson({ crId: 'c', birthDate: '1985-04-12T04:10' });
			const svc = new RelationshipQueryService(makeLookup([parent, a, b, c]));

			const result = svc.getChildren(parent, { include: 'bio', sortByBirthDate: dateService });
			expect(result.map(r => r.person.crId)).toEqual(['a', 'b', 'c']);
		});

		it('sorts siblings within the same year by month and day', () => {
			const parent = makePerson({ crId: 'parent', childrenCrIds: ['younger', 'older'] });
			const older = makePerson({ crId: 'older', birthDate: '1985-03-15' });
			const younger = makePerson({ crId: 'younger', birthDate: '1985-09-22' });
			const svc = new RelationshipQueryService(makeLookup([parent, older, younger]));

			const result = svc.getChildren(parent, { include: 'bio', sortByBirthDate: dateService });
			expect(result.map(r => r.person.crId)).toEqual(['older', 'younger']);
		});

		it('falls back to insertion order when birth dates are exactly equal', () => {
			const parent = makePerson({ crId: 'parent', childrenCrIds: ['second', 'first'] });
			const first = makePerson({ crId: 'first', birthDate: '1985-04-12' });
			const second = makePerson({ crId: 'second', birthDate: '1985-04-12' });
			const svc = new RelationshipQueryService(makeLookup([parent, first, second]));

			const result = svc.getChildren(parent, { include: 'bio', sortByBirthDate: dateService });
			// Insertion order preserved: 'second' first, then 'first'
			expect(result.map(r => r.person.crId)).toEqual(['second', 'first']);
		});

		it('sinks children without a birth date to the end, preserving relative order', () => {
			const parent = makePerson({ crId: 'parent', childrenCrIds: ['undated-1', 'dated', 'undated-2'] });
			const dated = makePerson({ crId: 'dated', birthDate: '1985-04-12' });
			const undated1 = makePerson({ crId: 'undated-1' });
			const undated2 = makePerson({ crId: 'undated-2' });
			const svc = new RelationshipQueryService(makeLookup([parent, dated, undated1, undated2]));

			const result = svc.getChildren(parent, { include: 'bio', sortByBirthDate: dateService });
			expect(result.map(r => r.person.crId)).toEqual(['dated', 'undated-1', 'undated-2']);
		});
	});
});

describe('RelationshipQueryService — getParents', () => {
	it('returns bio parents from fatherCrId / motherCrId / parentCrIds', () => {
		const child = makePerson({
			crId: 'child',
			fatherCrId: 'dad',
			motherCrId: 'mom',
			parentCrIds: ['neutral-parent']
		});
		const dad = makePerson({ crId: 'dad' });
		const mom = makePerson({ crId: 'mom' });
		const np = makePerson({ crId: 'neutral-parent' });
		const svc = new RelationshipQueryService(makeLookup([child, dad, mom, np]));

		const result = svc.getParents(child, { include: 'bio' });
		expect(result.map(r => r.person.crId)).toEqual(['dad', 'mom', 'neutral-parent']);
		expect(result.every(r => r.kind === 'bio')).toBe(true);
	});

	it('returns adoptive parents from adoptiveFatherCrId / adoptiveMotherCrId / adoptiveParentCrIds', () => {
		const galen = makePerson({
			crId: 'galen',
			adoptiveFatherCrId: 'ben',
			adoptiveMotherCrId: 'marie',
			adoptiveParentCrIds: ['extra-adoptive']
		});
		const ben = makePerson({ crId: 'ben' });
		const marie = makePerson({ crId: 'marie' });
		const extra = makePerson({ crId: 'extra-adoptive' });
		const svc = new RelationshipQueryService(makeLookup([galen, ben, marie, extra]));

		const result = svc.getParents(galen, { include: 'adoptive' });
		expect(result.map(r => r.person.crId)).toEqual(['ben', 'marie', 'extra-adoptive']);
		expect(result.every(r => r.kind === 'adoptive')).toBe(true);
	});

	it('returns step parents from stepfatherCrIds / stepmotherCrIds', () => {
		const anakin = makePerson({
			crId: 'anakin',
			stepfatherCrIds: ['cliegg']
		});
		const cliegg = makePerson({ crId: 'cliegg' });
		const svc = new RelationshipQueryService(makeLookup([anakin, cliegg]));

		const result = svc.getParents(anakin, { include: 'step' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('cliegg');
		expect(result[0].kind).toBe('step');
	});

	it('returns bio + adoptive + step in that order when include="all"', () => {
		const child = makePerson({
			crId: 'child',
			fatherCrId: 'dad',
			adoptiveFatherCrId: 'adoptive-dad',
			stepfatherCrIds: ['step-dad']
		});
		const dad = makePerson({ crId: 'dad' });
		const adoptiveDad = makePerson({ crId: 'adoptive-dad' });
		const stepDad = makePerson({ crId: 'step-dad' });
		const svc = new RelationshipQueryService(
			makeLookup([child, dad, adoptiveDad, stepDad])
		);

		const result = svc.getParents(child, { include: 'all' });
		expect(result.map(r => r.kind)).toEqual(['bio', 'adoptive', 'step']);
		expect(result.map(r => r.person.crId)).toEqual(['dad', 'adoptive-dad', 'step-dad']);
	});

	it('skips parents whose crId resolves to undefined', () => {
		const child = makePerson({
			crId: 'child',
			fatherCrId: 'dad',
			motherCrId: 'missing-mom'
		});
		const dad = makePerson({ crId: 'dad' });
		const svc = new RelationshipQueryService(makeLookup([child, dad]));

		const result = svc.getParents(child, { include: 'bio' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('dad');
	});
});

describe('RelationshipQueryService — getSiblings', () => {
	it('returns bio siblings from shared bio parents, excluding self', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['a', 'b', 'c'] });
		const a = makePerson({ crId: 'a', fatherCrId: 'dad' });
		const b = makePerson({ crId: 'b', fatherCrId: 'dad' });
		const c = makePerson({ crId: 'c', fatherCrId: 'dad' });
		const svc = new RelationshipQueryService(makeLookup([dad, a, b, c]));

		const result = svc.getSiblings(a, { include: 'bio' });
		expect(result.map(r => r.person.crId).sort()).toEqual(['b', 'c']);
		expect(result.every(r => r.kind === 'bio')).toBe(true);
	});

	it('returns adopted siblings: adopted children of bio parents', () => {
		const dad = makePerson({
			crId: 'dad',
			childrenCrIds: ['bio-self'],
			adoptedChildCrIds: ['adopted-sibling']
		});
		const bioSelf = makePerson({ crId: 'bio-self', fatherCrId: 'dad' });
		const adoptedSibling = makePerson({ crId: 'adopted-sibling', adoptiveFatherCrId: 'dad' });
		const svc = new RelationshipQueryService(makeLookup([dad, bioSelf, adoptedSibling]));

		const result = svc.getSiblings(bioSelf, { include: 'adopted' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('adopted-sibling');
		expect(result[0].kind).toBe('adopted');
	});

	it('returns adopted siblings: bio + adopted children of adoptive parents', () => {
		const adoptiveDad = makePerson({
			crId: 'adoptive-dad',
			childrenCrIds: ['bio-cousin'],
			adoptedChildCrIds: ['self', 'other-adoptee']
		});
		const self = makePerson({ crId: 'self', adoptiveFatherCrId: 'adoptive-dad' });
		const bioCousin = makePerson({ crId: 'bio-cousin', fatherCrId: 'adoptive-dad' });
		const otherAdoptee = makePerson({ crId: 'other-adoptee', adoptiveFatherCrId: 'adoptive-dad' });
		const svc = new RelationshipQueryService(
			makeLookup([adoptiveDad, self, bioCousin, otherAdoptee])
		);

		const result = svc.getSiblings(self, { include: 'adopted' });
		expect(result.map(r => r.person.crId).sort()).toEqual(['bio-cousin', 'other-adoptee']);
		expect(result.every(r => r.kind === 'adopted')).toBe(true);
	});

	it('returns step siblings: stepchildren of bio parents and any children of step-parents', () => {
		const cliegg = makePerson({
			crId: 'cliegg',
			childrenCrIds: ['owen'],
			spouseCrIds: ['shmi']
		});
		const shmi = makePerson({
			crId: 'shmi',
			childrenCrIds: ['anakin'],
			spouseCrIds: ['cliegg'],
			stepchildrenCrIds: ['owen']
		});
		const owen = makePerson({
			crId: 'owen',
			fatherCrId: 'cliegg',
			stepmotherCrIds: ['shmi']
		});
		const anakin = makePerson({
			crId: 'anakin',
			motherCrId: 'shmi',
			stepfatherCrIds: ['cliegg']
		});
		const svc = new RelationshipQueryService(makeLookup([cliegg, shmi, owen, anakin]));

		// Anakin's step siblings: bio + adopted children of his step-father Cliegg
		const result = svc.getSiblings(anakin, { include: 'step' });
		expect(result.map(r => r.person.crId)).toEqual(['owen']);
		expect(result[0].kind).toBe('step');
	});

	it('excludes self from sibling list even when self appears in a parent\'s children array', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['self', 'sibling'] });
		const self = makePerson({ crId: 'self', fatherCrId: 'dad' });
		const sibling = makePerson({ crId: 'sibling', fatherCrId: 'dad' });
		const svc = new RelationshipQueryService(makeLookup([dad, self, sibling]));

		const result = svc.getSiblings(self, { include: 'all' });
		expect(result.map(r => r.person.crId)).toEqual(['sibling']);
	});

	it('dedupes siblings reachable through multiple parent paths', () => {
		// Both parents have the same child in their `childrenCrIds`, which
		// is the typical case for any child with two parents in the cache.
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['self', 'sib'] });
		const mom = makePerson({ crId: 'mom', childrenCrIds: ['self', 'sib'] });
		const self = makePerson({ crId: 'self', fatherCrId: 'dad', motherCrId: 'mom' });
		const sib = makePerson({ crId: 'sib', fatherCrId: 'dad', motherCrId: 'mom' });
		const svc = new RelationshipQueryService(makeLookup([dad, mom, self, sib]));

		const result = svc.getSiblings(self, { include: 'bio' });
		expect(result).toHaveLength(1);
		expect(result[0].person.crId).toBe('sib');
	});
});

describe('RelationshipQueryService — getSpouses', () => {
	it('returns enhanced SpouseRelationship[] when present', () => {
		const person = makePerson({
			crId: 'p',
			spouseCrIds: ['s1'],
			spouses: [
				{
					personId: 's1',
					marriageDate: '2020-06-15',
					marriageLocation: 'Naboo'
				}
			]
		});
		const svc = new RelationshipQueryService(makeLookup([person]));

		const result = svc.getSpouses(person);
		expect(result).toHaveLength(1);
		expect(result[0].personId).toBe('s1');
		expect(result[0].marriageDate).toBe('2020-06-15');
		expect(result[0].marriageLocation).toBe('Naboo');
	});

	it('synthesizes minimal SpouseRelationship[] from spouseCrIds when enhanced data is absent', () => {
		const person = makePerson({
			crId: 'p',
			spouseCrIds: ['s1', 's2']
		});
		const svc = new RelationshipQueryService(makeLookup([person]));

		const result = svc.getSpouses(person);
		expect(result.map(s => s.personId)).toEqual(['s1', 's2']);
		expect(result.every(s => s.marriageDate === undefined)).toBe(true);
	});

	it('filters out enhanced entries with empty personId', () => {
		const person = makePerson({
			crId: 'p',
			spouseCrIds: ['s1'],
			spouses: [
				{ personId: 's1' },
				{ personId: '' }
			]
		});
		const svc = new RelationshipQueryService(makeLookup([person]));

		const result = svc.getSpouses(person);
		expect(result).toHaveLength(1);
		expect(result[0].personId).toBe('s1');
	});

	it('returns empty array when no spouses', () => {
		const person = makePerson({ crId: 'p' });
		const svc = new RelationshipQueryService(makeLookup([person]));

		expect(svc.getSpouses(person)).toEqual([]);
	});
});

describe('RelationshipQueryService — walkDescendants', () => {
	it('visits root and bio descendants depth-first', () => {
		const ancestor = makePerson({ crId: 'gen0', childrenCrIds: ['gen1a', 'gen1b'] });
		const gen1a = makePerson({ crId: 'gen1a', fatherCrId: 'gen0', childrenCrIds: ['gen2'] });
		const gen1b = makePerson({ crId: 'gen1b', fatherCrId: 'gen0' });
		const gen2 = makePerson({ crId: 'gen2', fatherCrId: 'gen1a' });
		const svc = new RelationshipQueryService(
			makeLookup([ancestor, gen1a, gen1b, gen2])
		);

		const visited: { crId: string; depth: number; kind: string }[] = [];
		svc.walkDescendants(ancestor, (p, depth, kind) => {
			visited.push({ crId: p.crId, depth, kind });
		});

		expect(visited).toEqual([
			{ crId: 'gen0', depth: 0, kind: 'root' },
			{ crId: 'gen1a', depth: 1, kind: 'bio' },
			{ crId: 'gen2', depth: 2, kind: 'bio' },
			{ crId: 'gen1b', depth: 1, kind: 'bio' }
		]);
	});

	it('visits adopted child but does NOT recurse into their descendants by default — the #545 contract', () => {
		const marie = makePerson({ crId: 'marie', adoptedChildCrIds: ['galen'] });
		const galen = makePerson({
			crId: 'galen',
			adoptiveMotherCrId: 'marie',
			childrenCrIds: ['galen-jr']
		});
		const galenJr = makePerson({ crId: 'galen-jr', fatherCrId: 'galen' });
		const svc = new RelationshipQueryService(makeLookup([marie, galen, galenJr]));

		const visited: { crId: string; kind: string }[] = [];
		svc.walkDescendants(marie, (p, _depth, kind) => {
			visited.push({ crId: p.crId, kind });
		});

		expect(visited).toEqual([
			{ crId: 'marie', kind: 'root' },
			{ crId: 'galen', kind: 'adopted' }
		]);
		// galen-jr is NOT visited because we stop at the adopted boundary
	});

	it('recurses through adopted descendants when followAdopted: true', () => {
		const marie = makePerson({ crId: 'marie', adoptedChildCrIds: ['galen'] });
		const galen = makePerson({
			crId: 'galen',
			adoptiveMotherCrId: 'marie',
			childrenCrIds: ['galen-jr']
		});
		const galenJr = makePerson({ crId: 'galen-jr', fatherCrId: 'galen' });
		const svc = new RelationshipQueryService(makeLookup([marie, galen, galenJr]));

		const visited: string[] = [];
		svc.walkDescendants(
			marie,
			p => visited.push(p.crId),
			{ followAdopted: true }
		);

		expect(visited).toEqual(['marie', 'galen', 'galen-jr']);
	});

	it('visits stepchild but does NOT recurse by default; recurses when followStep: true', () => {
		const shmi = makePerson({ crId: 'shmi', stepchildrenCrIds: ['owen'] });
		const owen = makePerson({
			crId: 'owen',
			stepmotherCrIds: ['shmi'],
			childrenCrIds: ['beru']
		});
		const beru = makePerson({ crId: 'beru', fatherCrId: 'owen' });
		const svc = new RelationshipQueryService(makeLookup([shmi, owen, beru]));

		const noFollow: string[] = [];
		svc.walkDescendants(shmi, p => noFollow.push(p.crId));
		expect(noFollow).toEqual(['shmi', 'owen']);

		const withFollow: string[] = [];
		svc.walkDescendants(shmi, p => withFollow.push(p.crId), { followStep: true });
		expect(withFollow).toEqual(['shmi', 'owen', 'beru']);
	});

	it('respects maxGenerations limit', () => {
		const a = makePerson({ crId: 'a', childrenCrIds: ['b'] });
		const b = makePerson({ crId: 'b', fatherCrId: 'a', childrenCrIds: ['c'] });
		const c = makePerson({ crId: 'c', fatherCrId: 'b', childrenCrIds: ['d'] });
		const d = makePerson({ crId: 'd', fatherCrId: 'c' });
		const svc = new RelationshipQueryService(makeLookup([a, b, c, d]));

		const visited: string[] = [];
		svc.walkDescendants(a, p => visited.push(p.crId), { maxGenerations: 2 });

		// depth 0 (a), 1 (b), 2 (c) but stop before 3 (d)
		expect(visited).toEqual(['a', 'b', 'c']);
	});

	it('handles cycles without infinite recursion', () => {
		// Pathological: a is its own grandparent
		const a = makePerson({ crId: 'a', childrenCrIds: ['b'] });
		const b = makePerson({ crId: 'b', fatherCrId: 'a', childrenCrIds: ['a'] });
		const svc = new RelationshipQueryService(makeLookup([a, b]));

		const visited: string[] = [];
		svc.walkDescendants(a, p => visited.push(p.crId));
		expect(visited).toEqual(['a', 'b']);
	});

	it('skips nodes whose crId resolves to undefined', () => {
		const a = makePerson({ crId: 'a', childrenCrIds: ['real', 'missing'] });
		const real = makePerson({ crId: 'real', fatherCrId: 'a' });
		const svc = new RelationshipQueryService(makeLookup([a, real]));

		const visited: string[] = [];
		svc.walkDescendants(a, p => visited.push(p.crId));
		expect(visited).toEqual(['a', 'real']);
	});
});

describe('RelationshipQueryService — walkAncestors', () => {
	it('visits root and bio ancestors depth-first', () => {
		const grandparent = makePerson({ crId: 'gp' });
		const parent = makePerson({ crId: 'p', fatherCrId: 'gp' });
		const self = makePerson({ crId: 'self', fatherCrId: 'p' });
		const svc = new RelationshipQueryService(makeLookup([grandparent, parent, self]));

		const visited: { crId: string; depth: number; kind: string }[] = [];
		svc.walkAncestors(self, (p, depth, kind) => {
			visited.push({ crId: p.crId, depth, kind });
		});

		expect(visited).toEqual([
			{ crId: 'self', depth: 0, kind: 'root' },
			{ crId: 'p', depth: 1, kind: 'bio' },
			{ crId: 'gp', depth: 2, kind: 'bio' }
		]);
	});

	it('visits adoptive parent but does NOT recurse by default', () => {
		const adoptiveGrandparent = makePerson({ crId: 'adop-gp' });
		const adoptiveParent = makePerson({ crId: 'adop-p', fatherCrId: 'adop-gp' });
		const self = makePerson({ crId: 'self', adoptiveFatherCrId: 'adop-p' });
		const svc = new RelationshipQueryService(
			makeLookup([adoptiveGrandparent, adoptiveParent, self])
		);

		const visited: { crId: string; kind: string }[] = [];
		svc.walkAncestors(self, (p, _d, kind) => {
			visited.push({ crId: p.crId, kind });
		});

		expect(visited).toEqual([
			{ crId: 'self', kind: 'root' },
			{ crId: 'adop-p', kind: 'adoptive' }
		]);
	});

	it('recurses through adoptive ancestors when followAdoptive: true', () => {
		const adoptiveGrandparent = makePerson({ crId: 'adop-gp' });
		const adoptiveParent = makePerson({ crId: 'adop-p', fatherCrId: 'adop-gp' });
		const self = makePerson({ crId: 'self', adoptiveFatherCrId: 'adop-p' });
		const svc = new RelationshipQueryService(
			makeLookup([adoptiveGrandparent, adoptiveParent, self])
		);

		const visited: string[] = [];
		svc.walkAncestors(self, p => visited.push(p.crId), { followAdoptive: true });
		expect(visited).toEqual(['self', 'adop-p', 'adop-gp']);
	});

	it('visits step parent but does NOT recurse by default; recurses when followStep: true', () => {
		const stepGrandparent = makePerson({ crId: 'step-gp' });
		const stepParent = makePerson({ crId: 'step-p', fatherCrId: 'step-gp' });
		const self = makePerson({ crId: 'self', stepfatherCrIds: ['step-p'] });
		const svc = new RelationshipQueryService(
			makeLookup([stepGrandparent, stepParent, self])
		);

		const noFollow: string[] = [];
		svc.walkAncestors(self, p => noFollow.push(p.crId));
		expect(noFollow).toEqual(['self', 'step-p']);

		const withFollow: string[] = [];
		svc.walkAncestors(self, p => withFollow.push(p.crId), { followStep: true });
		expect(withFollow).toEqual(['self', 'step-p', 'step-gp']);
	});

	it('respects maxGenerations limit', () => {
		const ggp = makePerson({ crId: 'ggp' });
		const gp = makePerson({ crId: 'gp', fatherCrId: 'ggp' });
		const p = makePerson({ crId: 'p', fatherCrId: 'gp' });
		const self = makePerson({ crId: 'self', fatherCrId: 'p' });
		const svc = new RelationshipQueryService(makeLookup([ggp, gp, p, self]));

		const visited: string[] = [];
		svc.walkAncestors(self, x => visited.push(x.crId), { maxGenerations: 2 });
		expect(visited).toEqual(['self', 'p', 'gp']);
	});

	it('handles cycles without infinite recursion', () => {
		const a = makePerson({ crId: 'a', fatherCrId: 'b' });
		const b = makePerson({ crId: 'b', fatherCrId: 'a' });
		const svc = new RelationshipQueryService(makeLookup([a, b]));

		const visited: string[] = [];
		svc.walkAncestors(a, p => visited.push(p.crId));
		expect(visited).toEqual(['a', 'b']);
	});
});

describe('RelationshipQueryService — kind discriminators are exhaustive', () => {
	// Compile-time exhaustiveness check via TypeScript narrowing.
	// If any kind is added without updating consumers, this fails to compile.
	it('ChildKind, ParentKind, SiblingKind cover the union', () => {
		const childExhaustive = (k: ChildKind): string => {
			switch (k) {
				case 'bio': return 'bio';
				case 'adopted': return 'adopted';
				case 'step': return 'step';
			}
		};
		const parentExhaustive = (k: ParentKind): string => {
			switch (k) {
				case 'bio': return 'bio';
				case 'adoptive': return 'adoptive';
				case 'step': return 'step';
			}
		};
		const siblingExhaustive = (k: SiblingKind): string => {
			switch (k) {
				case 'bio': return 'bio';
				case 'adopted': return 'adopted';
				case 'step': return 'step';
			}
		};

		expect(childExhaustive('bio')).toBe('bio');
		expect(parentExhaustive('adoptive')).toBe('adoptive');
		expect(siblingExhaustive('step')).toBe('step');
	});
});
