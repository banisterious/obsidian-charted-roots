import { describe, expect, it } from 'vitest';
import { App } from 'obsidian';
import { FamilyGraphService, type PersonNode } from '../src/core/family-graph';

/**
 * Golden-output regression coverage for the three bugs surfaced via
 * #545 / #546 (and DigitalDreamn's follow-up):
 *
 * 1. **Bug A1** — descendant trees: adopted children get an edge but no
 *    node, so canvas-generator's edge-rendering pass (which drops edges
 *    where either endpoint isn't positioned) silently discards the
 *    relationship. Galen never appears on Marie's descendant tree.
 *
 * 2. **Bug A2** — full trees: the BFS doesn't walk a parent's
 *    `adoptedChildCrIds` at all. Adopted children only enter the tree
 *    when reached via some other path, then their `adoptive_X` field
 *    walks back to the parent. Generated full-tree from Marie misses
 *    Galen entirely.
 *
 * 3. **Bug B** — full trees: the `!visited.has(stepX)` /
 *    `!visited.has(adoptiveX)` guards on the relationship-edge-emission
 *    branches double up as cycle-check AND edge-gate. When the step or
 *    adoptive parent has been visited via a different path first
 *    (e.g., Shmi as Anakin's bio mother before Owen's processing
 *    discovers her as his stepmother), the relationship edge is never
 *    emitted.
 *
 * Tests use direct private-access to inject a pre-built `personCache`
 * and invoke the tree-builders without going through Obsidian I/O.
 * Same `as unknown as PrivateAccess` pattern as the existing
 * extract-person tests.
 */

interface FamilyEdge {
	from: string;
	to: string;
	type: 'parent' | 'spouse' | 'child' | 'relationship';
	relationshipTypeId?: string;
	relationshipLabel?: string;
}

interface TreeOptions {
	rootCrId: string;
	treeType: 'ancestors' | 'descendants' | 'full';
	maxGenerations?: number;
	includeSpouses?: boolean;
	includeStepParents?: boolean;
	includeAdoptiveParents?: boolean;
}

interface PrivateTreeBuilderAccess {
	personCache: Map<string, PersonNode>;
	buildDescendantTree(
		node: PersonNode,
		nodes: Map<string, PersonNode>,
		edges: FamilyEdge[],
		options: TreeOptions,
		currentGeneration: number,
		visited?: Set<string>
	): void;
	buildFullTree(
		node: PersonNode,
		nodes: Map<string, PersonNode>,
		edges: FamilyEdge[],
		options: TreeOptions
	): void;
	buildAncestorTree(
		node: PersonNode,
		nodes: Map<string, PersonNode>,
		edges: FamilyEdge[],
		options: TreeOptions,
		currentGeneration: number,
		visited?: Set<string>
	): void;
}

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

function makeService(people: PersonNode[]): {
	service: FamilyGraphService;
	access: PrivateTreeBuilderAccess;
} {
	const service = new FamilyGraphService(new App());
	const access = service as unknown as PrivateTreeBuilderAccess;
	access.personCache = new Map(people.map(p => [p.crId, p]));
	return { service, access };
}

describe('FamilyGraphService.buildDescendantTree — Bug A1: adopted child must be added as a node', () => {
	it('adds an adopted child to the nodes map (so canvas-generator can position them)', () => {
		// Marie adopts Galen. Generating Marie's descendant tree must
		// surface Galen — both as a node AND with the adoptive-parent
		// edge. Without the node, canvas-generator's edge-renderer
		// drops the edge for missing endpoint position.
		const marie = makePerson({
			crId: 'marie',
			adoptedChildCrIds: ['galen']
		});
		const galen = makePerson({
			crId: 'galen',
			adoptiveMotherCrId: 'marie'
		});
		const { access } = makeService([marie, galen]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildDescendantTree(
			marie,
			nodes,
			edges,
			{ rootCrId: 'marie', treeType: 'descendants' },
			0
		);

		expect(nodes.has('marie')).toBe(true);
		expect(nodes.has('galen')).toBe(true);
		expect(
			edges.some(
				e =>
					e.from === 'marie' &&
					e.to === 'galen' &&
					e.relationshipTypeId === 'adoptive_parent'
			)
		).toBe(true);
	});

	it('adds adopted child to nodes even when ALSO reachable via bio child path (no double-counting)', () => {
		// Pathological: a child appears in BOTH `childrenCrIds` and
		// `adoptedChildCrIds` of the same parent. Should produce one
		// node and one edge (preferring the bio relationship).
		const parent = makePerson({
			crId: 'parent',
			childrenCrIds: ['kid'],
			adoptedChildCrIds: ['kid']
		});
		const kid = makePerson({ crId: 'kid', fatherCrId: 'parent' });
		const { access } = makeService([parent, kid]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildDescendantTree(
			parent,
			nodes,
			edges,
			{ rootCrId: 'parent', treeType: 'descendants' },
			0
		);

		expect(nodes.has('kid')).toBe(true);
		// Bio edge wins; no duplicate adoptive edge for the same pair
		const parentEdges = edges.filter(e => e.from === 'parent' && e.to === 'kid');
		expect(parentEdges).toHaveLength(1);
		expect(parentEdges[0].type).toBe('parent');
	});

	it('preserves the existing "do not recurse adopted-child descendants" intent', () => {
		// Galen has bio children of his own. They should NOT appear in
		// Marie's descendant tree by default (preserves the intent
		// codified in the old comment at family-graph.ts:978).
		const marie = makePerson({
			crId: 'marie',
			adoptedChildCrIds: ['galen']
		});
		const galen = makePerson({
			crId: 'galen',
			adoptiveMotherCrId: 'marie',
			childrenCrIds: ['galen-jr']
		});
		const galenJr = makePerson({ crId: 'galen-jr', fatherCrId: 'galen' });
		const { access } = makeService([marie, galen, galenJr]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildDescendantTree(
			marie,
			nodes,
			edges,
			{ rootCrId: 'marie', treeType: 'descendants' },
			0
		);

		expect(nodes.has('galen')).toBe(true);
		expect(nodes.has('galen-jr')).toBe(false);
	});

	it('still includes bio children correctly (regression guard)', () => {
		const dad = makePerson({ crId: 'dad', childrenCrIds: ['kid'] });
		const kid = makePerson({ crId: 'kid', fatherCrId: 'dad' });
		const { access } = makeService([dad, kid]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildDescendantTree(
			dad,
			nodes,
			edges,
			{ rootCrId: 'dad', treeType: 'descendants' },
			0
		);

		expect(nodes.has('kid')).toBe(true);
		expect(
			edges.some(e => e.from === 'dad' && e.to === 'kid' && e.type === 'parent')
		).toBe(true);
	});
});

describe('FamilyGraphService.buildFullTree — Bug A2: adopted children walked from parent\'s side', () => {
	it('full tree from Marie includes Galen (her adopted child)', () => {
		// In a full tree starting from Marie, Galen should appear
		// regardless of whether his bio parents happen to be reachable.
		const marie = makePerson({
			crId: 'marie',
			adoptedChildCrIds: ['galen']
		});
		const galen = makePerson({
			crId: 'galen',
			adoptiveMotherCrId: 'marie'
		});
		const { access } = makeService([marie, galen]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildFullTree(marie, nodes, edges, {
			rootCrId: 'marie',
			treeType: 'full'
		});

		expect(nodes.has('marie')).toBe(true);
		expect(nodes.has('galen')).toBe(true);
		expect(
			edges.some(
				e =>
					((e.from === 'marie' && e.to === 'galen') ||
						(e.from === 'galen' && e.to === 'marie')) &&
					e.relationshipTypeId === 'adoptive_parent'
			)
		).toBe(true);
	});
});

describe('FamilyGraphService.buildFullTree — Bug B: step-parent edge emitted regardless of visit order', () => {
	it('Shmi-Owen step-parent edge is emitted even though Shmi was visited first via Anakin\'s bio-mother walk', () => {
		// The Lars/Skywalker scenario from DigitalDreamn's vault:
		//   Cliegg + Shmi (married)
		//   Anakin = Shmi's bio son (Cliegg's stepson)
		//   Owen = Cliegg's bio son (Shmi's stepson)
		//
		// Full tree from Anakin:
		//   - BFS visits Anakin → walks bio mother Shmi (Shmi visited)
		//   - BFS walks Anakin's stepfather Cliegg (edge Cliegg→Anakin emitted; Cliegg visited)
		//   - BFS visits Cliegg → walks bio child Owen (Owen visited)
		//   - BFS visits Owen → walks his stepmother Shmi
		//   - Pre-fix: `!visited.has('shmi')` is FALSE → edge NEVER emitted
		//   - Post-fix: edge emitted unconditionally (with dedup); visited only gates recursion
		const cliegg = makePerson({
			crId: 'cliegg',
			spouseCrIds: ['shmi'],
			childrenCrIds: ['owen'],
			stepchildrenCrIds: ['anakin']
		});
		const shmi = makePerson({
			crId: 'shmi',
			spouseCrIds: ['cliegg'],
			childrenCrIds: ['anakin'],
			stepchildrenCrIds: ['owen']
		});
		const anakin = makePerson({
			crId: 'anakin',
			motherCrId: 'shmi',
			stepfatherCrIds: ['cliegg']
		});
		const owen = makePerson({
			crId: 'owen',
			fatherCrId: 'cliegg',
			stepmotherCrIds: ['shmi']
		});
		const { access } = makeService([cliegg, shmi, anakin, owen]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildFullTree(anakin, nodes, edges, {
			rootCrId: 'anakin',
			treeType: 'full',
			includeSpouses: true
		});

		// Both step relationships must produce edges, regardless of BFS order
		expect(
			edges.some(
				e =>
					e.from === 'cliegg' &&
					e.to === 'anakin' &&
					e.relationshipTypeId === 'step_parent'
			)
		).toBe(true);
		expect(
			edges.some(
				e =>
					e.from === 'shmi' &&
					e.to === 'owen' &&
					e.relationshipTypeId === 'step_parent'
			)
		).toBe(true);
	});

	it('dedupes step-parent edges if reachable via multiple paths', () => {
		// Symmetric: Cliegg and Shmi each declare each other's child
		// via stepchildrenCrIds and the children declare via stepX. The
		// edge should appear exactly once per (from, to) pair.
		const cliegg = makePerson({
			crId: 'cliegg',
			childrenCrIds: ['owen'],
			stepchildrenCrIds: ['anakin']
		});
		const shmi = makePerson({
			crId: 'shmi',
			childrenCrIds: ['anakin'],
			stepchildrenCrIds: ['owen']
		});
		const anakin = makePerson({
			crId: 'anakin',
			motherCrId: 'shmi',
			stepfatherCrIds: ['cliegg']
		});
		const owen = makePerson({
			crId: 'owen',
			fatherCrId: 'cliegg',
			stepmotherCrIds: ['shmi']
		});
		const { access } = makeService([cliegg, shmi, anakin, owen]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildFullTree(anakin, nodes, edges, {
			rootCrId: 'anakin',
			treeType: 'full'
		});

		const cliegg_anakin = edges.filter(
			e =>
				e.from === 'cliegg' &&
				e.to === 'anakin' &&
				e.relationshipTypeId === 'step_parent'
		);
		const shmi_owen = edges.filter(
			e =>
				e.from === 'shmi' &&
				e.to === 'owen' &&
				e.relationshipTypeId === 'step_parent'
		);
		expect(cliegg_anakin).toHaveLength(1);
		expect(shmi_owen).toHaveLength(1);
	});

	it('Bug B applies to adoptive parents the same way (regression guard)', () => {
		// Same shape with adoptive: if the adoptive parent has been
		// visited via a different path before the adopted child's
		// `adoptive_X` walk fires, the edge must still be emitted.
		const marie = makePerson({
			crId: 'marie',
			adoptedChildCrIds: ['galen'],
			childrenCrIds: ['bio-kid']
		});
		const bioKid = makePerson({
			crId: 'bio-kid',
			motherCrId: 'marie',
			// Some random sibling-like adoptive link to surface Marie via a non-adopted path
			adoptiveMotherCrId: 'marie'
		});
		const galen = makePerson({
			crId: 'galen',
			adoptiveMotherCrId: 'marie'
		});
		const { access } = makeService([marie, bioKid, galen]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildFullTree(bioKid, nodes, edges, {
			rootCrId: 'bio-kid',
			treeType: 'full'
		});

		// Marie should have an adoptive-parent edge to Galen even though
		// she was first reached as bio-kid's mother
		expect(
			edges.some(
				e =>
					e.from === 'marie' &&
					e.to === 'galen' &&
					e.relationshipTypeId === 'adoptive_parent'
			)
		).toBe(true);
	});

	it('preserves working Anakin-Cliegg case (regression guard)', () => {
		// The existing-correct path: Cliegg is reached only via Anakin's
		// stepfather walk, never via any prior path. Pre-fix worked here;
		// post-fix must keep working.
		const cliegg = makePerson({ crId: 'cliegg' });
		const anakin = makePerson({
			crId: 'anakin',
			stepfatherCrIds: ['cliegg']
		});
		const { access } = makeService([cliegg, anakin]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildFullTree(anakin, nodes, edges, {
			rootCrId: 'anakin',
			treeType: 'full'
		});

		expect(
			edges.some(
				e =>
					e.from === 'cliegg' &&
					e.to === 'anakin' &&
					e.relationshipTypeId === 'step_parent'
			)
		).toBe(true);
	});
});

describe('FamilyGraphService — cycle handling', () => {
	it('buildDescendantTree handles a circular relationship without infinite recursion', () => {
		const a = makePerson({ crId: 'a', childrenCrIds: ['b'] });
		const b = makePerson({ crId: 'b', fatherCrId: 'a', childrenCrIds: ['a'] });
		const { access } = makeService([a, b]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildDescendantTree(
			a,
			nodes,
			edges,
			{ rootCrId: 'a', treeType: 'descendants' },
			0
		);
		expect(nodes.has('a')).toBe(true);
		expect(nodes.has('b')).toBe(true);
	});

	it('buildFullTree handles a circular relationship without infinite recursion', () => {
		const a = makePerson({ crId: 'a', childrenCrIds: ['b'] });
		const b = makePerson({ crId: 'b', fatherCrId: 'a', childrenCrIds: ['a'] });
		const { access } = makeService([a, b]);

		const nodes = new Map<string, PersonNode>();
		const edges: FamilyEdge[] = [];
		access.buildFullTree(a, nodes, edges, {
			rootCrId: 'a',
			treeType: 'full'
		});
		expect(nodes.has('a')).toBe(true);
		expect(nodes.has('b')).toBe(true);
	});
});
