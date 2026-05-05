import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { RelationshipCalculator } from '../src/core/relationship-calculator';
import type { FamilyGraphService, PersonNode } from '../src/core/family-graph';

/**
 * Regression coverage for #525 (adoptive parent/child relationships) and
 * #526 (step parent/child relationships) — the BFS in
 * `relationship-calculator.ts` previously only traversed bio edges, so paths
 * crossing step or adoptive edges either failed entirely (no path) or were
 * mislabeled (e.g. "Child / Blood: Yes" for an adoptive child, "Parent-in-law"
 * for a stepfather). Plus DigitalDreamn's follow-up: confirm adoptive siblings
 * resolve through shared adoptive parents.
 *
 * These tests inject PersonNodes directly into the FamilyGraphService's
 * private cache to exercise just the BFS + path interpretation in isolation,
 * separate from the frontmatter-extraction layer covered by other suites.
 */

interface PrivateGraph {
	personCache: Map<string, PersonNode>;
}

function makeFile(crId: string, name: string): TFile {
	return new TFile({
		path: `people/${name}.md`,
		basename: name,
		extension: 'md'
	});
}

function makeNode(crId: string, name: string, overrides: Partial<PersonNode> = {}): PersonNode {
	return {
		crId,
		name,
		file: makeFile(crId, name),
		stepfatherCrIds: [],
		stepmotherCrIds: [],
		adoptiveParentCrIds: [],
		adoptedChildCrIds: [],
		stepchildrenCrIds: [],
		parentCrIds: [],
		spouseCrIds: [],
		childrenCrIds: [],
		...overrides
	};
}

function makeCalculator(nodes: PersonNode[]): RelationshipCalculator {
	const app = new App();
	const calc = new RelationshipCalculator(app);
	const graph = calc.getFamilyGraph() as unknown as PrivateGraph;
	for (const node of nodes) {
		graph.personCache.set(node.crId, node);
	}
	return calc;
}

describe('RelationshipCalculator — adoptive relationships (#525)', () => {
	it('finds adoptive parent path symmetrically (parent → child and child → parent)', () => {
		// Ben adopts Galen. Galen has no bio parents recorded.
		const ben = makeNode('ben', 'Ben Solo', {
			adoptedChildCrIds: ['galen']
		});
		const galen = makeNode('galen', 'Galen', {
			adoptiveFatherCrId: 'ben'
		});
		const calc = makeCalculator([ben, galen]);

		// Child → Parent (the failure direction in the bug report)
		const galenToBen = calc.calculateRelationship('galen', 'ben');
		expect(galenToBen).not.toBeNull();
		expect(galenToBen!.relationshipDescription).toBe('Adoptive parent');
		expect(galenToBen!.pathKind).toBe('adoptive');
		expect(galenToBen!.isBloodRelation).toBe(false);

		// Parent → Child (the working direction in the bug report — but with
		// the wrong "blood relation" label)
		const benToGalen = calc.calculateRelationship('ben', 'galen');
		expect(benToGalen).not.toBeNull();
		expect(benToGalen!.relationshipDescription).toBe('Adopted child');
		expect(benToGalen!.pathKind).toBe('adoptive');
		expect(benToGalen!.isBloodRelation).toBe(false);
	});

	it('finds gender-neutral adoptive parent path via adoptiveParentCrIds', () => {
		const parent = makeNode('parent', 'Adoptive Parent', {
			adoptedChildCrIds: ['child']
		});
		const child = makeNode('child', 'Adopted Child', {
			adoptiveParentCrIds: ['parent']
		});
		const calc = makeCalculator([parent, child]);

		const result = calc.calculateRelationship('child', 'parent');
		expect(result!.relationshipDescription).toBe('Adoptive parent');
		expect(result!.pathKind).toBe('adoptive');
	});

	it('labels adoptive grandparent through adoptive father → bio mother', () => {
		// Anna's adoptive father Brian has bio mother Carla.
		// Anna → adoptive_father → Brian → mother → Carla = adoptive grandparent.
		const anna = makeNode('anna', 'Anna', { adoptiveFatherCrId: 'brian' });
		const brian = makeNode('brian', 'Brian', {
			motherCrId: 'carla',
			adoptedChildCrIds: ['anna']
		});
		const carla = makeNode('carla', 'Carla', { childrenCrIds: ['brian'] });
		const calc = makeCalculator([anna, brian, carla]);

		const result = calc.calculateRelationship('anna', 'carla');
		expect(result!.relationshipDescription).toBe('Adoptive grandparent');
		expect(result!.pathKind).toBe('adoptive');
		expect(result!.isBloodRelation).toBe(false);
	});
});

describe('RelationshipCalculator — step relationships (#526)', () => {
	it('finds step parent path symmetrically (parent → child and child → parent)', () => {
		// Cliegg is Anakin's stepfather (Shmi's husband).
		const cliegg = makeNode('cliegg', 'Cliegg Lars', {
			stepchildrenCrIds: ['anakin']
		});
		const anakin = makeNode('anakin', 'Anakin Skywalker', {
			stepfatherCrIds: ['cliegg']
		});
		const calc = makeCalculator([cliegg, anakin]);

		// Child → Stepparent (the "Parent-in-law" misreport direction)
		const anakinToCliegg = calc.calculateRelationship('anakin', 'cliegg');
		expect(anakinToCliegg!.relationshipDescription).toBe('Stepparent');
		expect(anakinToCliegg!.pathKind).toBe('step');
		expect(anakinToCliegg!.isBloodRelation).toBe(false);

		// Stepparent → Child (the "Child / Blood: Yes" misreport direction)
		const clieggToAnakin = calc.calculateRelationship('cliegg', 'anakin');
		expect(clieggToAnakin!.relationshipDescription).toBe('Stepchild');
		expect(clieggToAnakin!.pathKind).toBe('step');
		expect(clieggToAnakin!.isBloodRelation).toBe(false);
	});

	it('does not register a stepchild as a blood relation (#526 Anakin/Owen pattern)', () => {
		// Owen is Cliegg's bio son. Cliegg is Anakin's stepfather.
		// Anakin and Owen are stepsiblings, NOT blood relations.
		const cliegg = makeNode('cliegg', 'Cliegg Lars', {
			childrenCrIds: ['owen'],
			stepchildrenCrIds: ['anakin']
		});
		const owen = makeNode('owen', 'Owen Lars', {
			fatherCrId: 'cliegg'
		});
		const anakin = makeNode('anakin', 'Anakin Skywalker', {
			stepfatherCrIds: ['cliegg']
		});
		const calc = makeCalculator([cliegg, owen, anakin]);

		const result = calc.calculateRelationship('anakin', 'owen');
		expect(result!.isBloodRelation).toBe(false);
		expect(result!.pathKind).toBe('step');
		expect(result!.relationshipDescription).toBe('Stepsibling');
	});

	it('labels step grandparent through stepfather → bio mother', () => {
		const child = makeNode('child', 'Child', { stepfatherCrIds: ['stepdad'] });
		const stepdad = makeNode('stepdad', 'Stepdad', {
			motherCrId: 'gran',
			stepchildrenCrIds: ['child']
		});
		const gran = makeNode('gran', 'Gran', { childrenCrIds: ['stepdad'] });
		const calc = makeCalculator([child, stepdad, gran]);

		const result = calc.calculateRelationship('child', 'gran');
		expect(result!.relationshipDescription).toBe('Step-grandparent');
		expect(result!.pathKind).toBe('step');
	});
});

describe('RelationshipCalculator — adoptive siblings (DigitalDreamn follow-up)', () => {
	it('labels two adopted children of the same adoptive parent as adoptive siblings', () => {
		// Two children adopted by the same parent. No bio link between them.
		const parent = makeNode('parent', 'Adoptive Parent', {
			adoptedChildCrIds: ['kid_a', 'kid_b']
		});
		const kidA = makeNode('kid_a', 'Kid A', { adoptiveFatherCrId: 'parent' });
		const kidB = makeNode('kid_b', 'Kid B', { adoptiveFatherCrId: 'parent' });
		const calc = makeCalculator([parent, kidA, kidB]);

		const result = calc.calculateRelationship('kid_a', 'kid_b');
		expect(result!.relationshipDescription).toBe('Adoptive sibling');
		expect(result!.pathKind).toBe('adoptive');
		expect(result!.isBloodRelation).toBe(false);
	});

	it('labels one adopted + one bio child sharing a parent as adoptive sibling', () => {
		// Mixed: one bio, one adopted. The path crosses an adoptive edge so
		// pathKind is 'adoptive'.
		const parent = makeNode('parent', 'Parent', {
			childrenCrIds: ['bio_kid'],
			adoptedChildCrIds: ['adopted_kid']
		});
		const bioKid = makeNode('bio_kid', 'Bio Kid', { fatherCrId: 'parent' });
		const adoptedKid = makeNode('adopted_kid', 'Adopted Kid', { adoptiveFatherCrId: 'parent' });
		const calc = makeCalculator([parent, bioKid, adoptedKid]);

		const result = calc.calculateRelationship('bio_kid', 'adopted_kid');
		expect(result!.relationshipDescription).toBe('Adoptive sibling');
		expect(result!.pathKind).toBe('adoptive');
		expect(result!.isBloodRelation).toBe(false);
	});
});

describe('RelationshipCalculator — bio paths unchanged (regression guard)', () => {
	it('still labels bio parent/child correctly', () => {
		const parent = makeNode('parent', 'Parent', { childrenCrIds: ['child'] });
		const child = makeNode('child', 'Child', { fatherCrId: 'parent' });
		const calc = makeCalculator([parent, child]);

		const childToParent = calc.calculateRelationship('child', 'parent');
		expect(childToParent!.relationshipDescription).toBe('Parent');
		expect(childToParent!.pathKind).toBe('bio');
		expect(childToParent!.isBloodRelation).toBe(true);

		const parentToChild = calc.calculateRelationship('parent', 'child');
		expect(parentToChild!.relationshipDescription).toBe('Child');
		expect(parentToChild!.isBloodRelation).toBe(true);
	});

	it('still labels bio siblings correctly', () => {
		const parent = makeNode('parent', 'Parent', { childrenCrIds: ['a', 'b'] });
		const a = makeNode('a', 'A', { fatherCrId: 'parent' });
		const b = makeNode('b', 'B', { fatherCrId: 'parent' });
		const calc = makeCalculator([parent, a, b]);

		const result = calc.calculateRelationship('a', 'b');
		expect(result!.relationshipDescription).toBe('Sibling');
		expect(result!.pathKind).toBe('bio');
		expect(result!.isBloodRelation).toBe(true);
	});

	it('still labels spouse-in-laws correctly when no step edges exist', () => {
		// Plain in-law: A married B; B has bio parent P. A → spouse → B → father → P.
		// No step/adoptive edges in the data, so should stay "Parent-in-law".
		const a = makeNode('a', 'A', { spouseCrIds: ['b'] });
		const b = makeNode('b', 'B', { spouseCrIds: ['a'], fatherCrId: 'p' });
		const p = makeNode('p', 'P', { childrenCrIds: ['b'] });
		const calc = makeCalculator([a, b, p]);

		const result = calc.calculateRelationship('a', 'p');
		expect(result!.relationshipDescription).toBe('Parent-in-law');
		expect(result!.pathKind).toBe('bio');
		expect(result!.isBloodRelation).toBe(false);
	});
});
