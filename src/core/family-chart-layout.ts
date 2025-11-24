/**
 * Family Chart Layout Engine
 *
 * Uses the family-chart library to calculate proper family tree layouts.
 * This library handles spouse relationships correctly, unlike D3's hierarchical tree.
 */

import f3, { type Data, type Datum } from 'family-chart';
import { FamilyTree, PersonNode } from './family-graph';
import { LayoutOptions, NodePosition, LayoutResult } from './layout-engine';

/**
 * Default layout options for family-chart
 * Note: Much larger spacing needed to prevent overlaps when multiple couples exist at same level
 * The family-chart library adds extra spacing based on spouse relationships
 * Extra horizontal space also needed for Canvas name labels rendered above nodes
 */
const DEFAULT_LAYOUT: Required<LayoutOptions> = {
	nodeSpacingX: 1200,  // Very large spacing - accounts for node width + Canvas labels above nodes
	nodeSpacingY: 250,   // Vertical spacing between generations
	nodeWidth: 250,
	nodeHeight: 120,
	direction: 'vertical',
	treeType: 'descendant',
	layoutType: 'standard'
};

/**
 * Layout engine using family-chart library
 */
export class FamilyChartLayoutEngine {
	/**
	 * Calculates layout positions using family-chart
	 *
	 * @param familyTree The family tree to layout
	 * @param options Layout configuration options
	 * @returns Layout result with positioned nodes
	 */
	calculateLayout(
		familyTree: FamilyTree,
		options: LayoutOptions = {}
	): LayoutResult {
		const opts = { ...DEFAULT_LAYOUT, ...options };

		// Convert our data to family-chart format
		const f3Data = this.convertToFamilyChartFormat(familyTree);

		// For descendant trees, find the topmost ancestor to use as main_id
		// family-chart places main_id at y=0 and shows parents above, children below
		// So for a descendant tree, we want the eldest ancestor as the "main" person
		const topAncestor = this.findTopAncestor(familyTree);
		console.log('[FamilyChartLayout] Top ancestor:', topAncestor.name, 'crId:', topAncestor.crId);
		console.log('[FamilyChartLayout] Family tree root:', familyTree.root.name, 'crId:', familyTree.root.crId);

		// Use family-chart's layout engine
		// Multiply spacing by 1.5x for family-chart - it needs extra room for complex trees
		// The library's internal algorithm doesn't account for Canvas name labels above nodes
		const tree = f3.calculateTree(f3Data, {
			main_id: topAncestor.crId,
			node_separation: opts.nodeSpacingX * 1.5,  // 1.5x multiplier for balanced spacing
			level_separation: opts.nodeSpacingY,
			is_horizontal: opts.direction === 'horizontal',
			single_parent_empty_card: false,
			// Show everyone - let family-chart handle the full tree
			ancestry_depth: undefined,  // Show all ancestors
			progeny_depth: undefined    // Show all descendants
		});

		// Calculate generation numbers for all nodes
		const generationMap = this.calculateGenerations(familyTree, topAncestor.crId);

		// Extract positions from family-chart's tree
		const positions: NodePosition[] = [];

		for (const node of tree.data) {
			const person = familyTree.nodes.get(node.data.id);
			if (person) {
				positions.push({
					crId: person.crId,
					person,
					x: node.x || 0,
					y: node.y || 0,
					generation: generationMap.get(person.crId)
				});
			}
		}

		console.log('[FamilyChartLayout] Raw positions:', positions.map(p =>
			`${p.person.name}: (${Math.round(p.x)}, ${Math.round(p.y)})`
		).join(', '));

		// Add missing people (siblings-in-law, etc.) that family-chart excluded
		// These are people connected only through marriage, not blood relation
		const positionedIds = new Set(positions.map(p => p.crId));
		for (const [crId, person] of familyTree.nodes) {
			if (!positionedIds.has(crId)) {
				// Person is missing from family-chart's layout
				// Try to position them based on their relationships

				// Strategy 1: If they have a spouse who IS positioned, place next to spouse
				if (person.spouseCrIds && person.spouseCrIds.length > 0) {
					const spousePos = positions.find(p => person.spouseCrIds!.includes(p.crId));
					if (spousePos) {
						// Place to the right of spouse at same Y level (same generation)
						positions.push({
							crId: person.crId,
							person,
							x: spousePos.x + (opts.nodeSpacingX * 1.5),  // Match the 1.5x multiplier
							y: spousePos.y,
							generation: spousePos.generation  // Same generation as spouse
						});
						console.log(`[FamilyChartLayout] Added ${person.name} next to spouse ${spousePos.person.name}`);
						continue;
					}
				}

				// Strategy 2: If they have children who ARE positioned, place above them
				if (person.childrenCrIds && person.childrenCrIds.length > 0) {
					const childPos = positions.find(p => person.childrenCrIds!.includes(p.crId));
					if (childPos) {
						// Place above child (one generation earlier)
						positions.push({
							crId: person.crId,
							person,
							x: childPos.x,
							y: childPos.y - opts.nodeSpacingY,
							generation: childPos.generation !== undefined ? childPos.generation - 1 : undefined
						});
						console.log(`[FamilyChartLayout] Added ${person.name} above child ${childPos.person.name}`);
						continue;
					}
				}

				// Strategy 3: If they have positioned parents, place next to siblings
				const fatherPos = person.fatherCrId ? positions.find(p => p.crId === person.fatherCrId) : null;
				const motherPos = person.motherCrId ? positions.find(p => p.crId === person.motherCrId) : null;
				const parentPos = fatherPos || motherPos;

				if (parentPos) {
					// Find positioned siblings (same parents)
					const siblings = positions.filter(p => {
						const sibling = p.person;
						return (
							sibling.crId !== person.crId &&
							((person.fatherCrId && sibling.fatherCrId === person.fatherCrId) ||
							 (person.motherCrId && sibling.motherCrId === person.motherCrId))
						);
					});

					if (siblings.length > 0) {
						// Place to the right of rightmost sibling (same generation)
						const rightmostSibling = siblings.reduce((prev, curr) =>
							curr.x > prev.x ? curr : prev
						);
						positions.push({
							crId: person.crId,
							person,
							x: rightmostSibling.x + (opts.nodeSpacingX * 1.5),
							y: rightmostSibling.y,
							generation: rightmostSibling.generation  // Same generation as sibling
						});
						console.log(`[FamilyChartLayout] Added ${person.name} next to sibling ${rightmostSibling.person.name}`);
						continue;
					} else {
						// No siblings positioned yet - place below parent (one generation later)
						positions.push({
							crId: person.crId,
							person,
							x: parentPos.x,
							y: parentPos.y + opts.nodeSpacingY,
							generation: parentPos.generation !== undefined ? parentPos.generation + 1 : undefined
						});
						console.log(`[FamilyChartLayout] Added ${person.name} below parent ${parentPos.person.name}`);
						continue;
					}
				}

				console.warn(`[FamilyChartLayout] Could not position ${person.name} - no positioned relatives found`);
			}
		}

		// Post-process positions to enforce minimum spacing
		// Family-chart doesn't always respect our spacing parameters with complex trees
		const adjustedPositions = this.enforceMinimumSpacing(positions, opts);

		console.log('[FamilyChartLayout] Adjusted positions:', adjustedPositions.map(p =>
			`${p.person.name}: (${Math.round(p.x)}, ${Math.round(p.y)})`
		).join(', '));

		return {
			positions: adjustedPositions,
			options: opts
		};
	}

	/**
	 * Finds the topmost ancestor(s) in the family tree
	 * Simply looks for people with no parents in the tree
	 *
	 * @param familyTree The family tree to search
	 * @returns The topmost ancestor node
	 */
	private findTopAncestor(familyTree: FamilyTree): PersonNode {
		// Find all people with no parents (top ancestors)
		const topAncestors: PersonNode[] = [];

		for (const [_, person] of familyTree.nodes) {
			const hasParents =
				(person.fatherCrId && familyTree.nodes.has(person.fatherCrId)) ||
				(person.motherCrId && familyTree.nodes.has(person.motherCrId));

			if (!hasParents) {
				topAncestors.push(person);
			}
		}

		console.log('[FamilyChartLayout] Top ancestors (no parents):', topAncestors.map(p => p.name).join(', '));

		if (topAncestors.length === 0) {
			console.log('[FamilyChartLayout] No top ancestors found, using root:', familyTree.root.name);
			return familyTree.root;
		}

		// Score each ancestor by how connected they are to the main family line
		// Prefer ancestors whose descendants connect to other family lines (via marriage)
		const scoredAncestors = topAncestors.map(ancestor => {
			let score = 0;

			// Count total descendants (children, grandchildren, etc.)
			// Also track if the root person is in this descendant tree
			let rootIsDescendant = false;
			const countDescendants = (crId: string, visited = new Set<string>()): number => {
				if (visited.has(crId)) return 0;
				visited.add(crId);

				if (crId === familyTree.root.crId) {
					rootIsDescendant = true;
				}

				const person = familyTree.nodes.get(crId);
				if (!person || !person.childrenCrIds) return 0;

				let count = person.childrenCrIds.length;
				for (const childCrId of person.childrenCrIds) {
					count += countDescendants(childCrId, visited);
				}
				return count;
			};

			score += countDescendants(ancestor.crId);

			// Huge bonus if the root person is a descendant of this ancestor
			// This ensures we always show the user's selected root person and their lineage
			if (rootIsDescendant) {
				score += 10000;
			}

			// Bonus points if this ancestor is NOT the root person
			// (prefer in-laws over the root person for better layout)
			// But only if root is NOT a descendant (don't penalize root's ancestry)
			if (ancestor.crId !== familyTree.root.crId && !rootIsDescendant) {
				score += 100;
			}

			// Extra bonus if this ancestor is NOT married to the root
			// (prefer separate family lines over spouse of root)
			// But only if root is NOT a descendant (don't penalize root's ancestry)
			const rootSpouses = familyTree.root.spouseCrIds || [];
			if (!rootSpouses.includes(ancestor.crId) && !rootIsDescendant) {
				score += 1000; // Big bonus for being in a different family line
			}

			return { ancestor, score };
		});

		// Sort by score (highest first)
		scoredAncestors.sort((a, b) => b.score - a.score);

		const selected = scoredAncestors[0].ancestor;
		console.log('[FamilyChartLayout] Ancestor scores:', scoredAncestors.map(s => `${s.ancestor.name}: ${s.score}`).join(', '));
		console.log('[FamilyChartLayout] Selected top ancestor:', selected.name);

		return selected;
	}

	/**
	 * Enforces minimum spacing between nodes at the same generation level
	 * Post-processes positions to ensure nodes don't overlap visually
	 *
	 * @param positions Original positions from family-chart
	 * @param options Layout options including spacing requirements
	 * @returns Adjusted positions with proper spacing
	 */
	private enforceMinimumSpacing(
		positions: NodePosition[],
		options: Required<LayoutOptions>
	): NodePosition[] {
		// Calculate minimum spacing needed (node width + desired gap)
		// Use larger spacing to account for Canvas name labels above nodes
		const minSpacing = options.nodeWidth + 200; // 200px gap between nodes for label clearance

		// Group nodes by Y coordinate (generation level)
		const byGeneration = new Map<number, NodePosition[]>();
		for (const pos of positions) {
			const generation = pos.y;
			if (!byGeneration.has(generation)) {
				byGeneration.set(generation, []);
			}
			byGeneration.get(generation)!.push(pos);
		}

		// Process each generation
		const adjusted: NodePosition[] = [];
		for (const [_y, nodesAtLevel] of byGeneration) {
			// Sort by X coordinate
			const sorted = [...nodesAtLevel].sort((a, b) => a.x - b.x);

			// Track adjusted nodes for this generation only
			const generationAdjusted: NodePosition[] = [];

			// Check spacing and adjust if needed
			for (let i = 0; i < sorted.length; i++) {
				if (i === 0) {
					// First node in generation stays where it is
					generationAdjusted.push(sorted[i]);
				} else {
					const prev = generationAdjusted[generationAdjusted.length - 1];
					const current = sorted[i];

					// Calculate actual spacing
					const actualSpacing = current.x - prev.x;

					if (actualSpacing < minSpacing) {
						// Too close - push current node to the right
						const newX = prev.x + minSpacing;
						generationAdjusted.push({
							...current,
							x: newX
						});
					} else {
						// Spacing is fine
						generationAdjusted.push(current);
					}
				}
			}

			// Add this generation's nodes to final result
			adjusted.push(...generationAdjusted);
		}

		return adjusted;
	}

	/**
	 * Calculates generation numbers for all nodes in the tree
	 * Uses breadth-first search from the root node
	 *
	 * @param familyTree The family tree
	 * @param rootCrId The ID of the root person (generation 0)
	 * @returns Map of crId to generation number
	 */
	private calculateGenerations(familyTree: FamilyTree, rootCrId: string): Map<string, number> {
		const generationMap = new Map<string, number>();
		const visited = new Set<string>();
		const queue: Array<{ crId: string; generation: number }> = [];

		// Start with root at generation 0
		queue.push({ crId: rootCrId, generation: 0 });
		visited.add(rootCrId);

		while (queue.length > 0) {
			const { crId, generation } = queue.shift()!;
			generationMap.set(crId, generation);

			const person = familyTree.nodes.get(crId);
			if (!person) continue;

			// Add parents (previous generation: -1)
			if (person.fatherCrId && !visited.has(person.fatherCrId)) {
				queue.push({ crId: person.fatherCrId, generation: generation - 1 });
				visited.add(person.fatherCrId);
			}
			if (person.motherCrId && !visited.has(person.motherCrId)) {
				queue.push({ crId: person.motherCrId, generation: generation - 1 });
				visited.add(person.motherCrId);
			}

			// Add children (next generation: +1)
			if (person.childrenCrIds) {
				for (const childId of person.childrenCrIds) {
					if (!visited.has(childId)) {
						queue.push({ crId: childId, generation: generation + 1 });
						visited.add(childId);
					}
				}
			}

			// Add spouses (same generation)
			if (person.spouseCrIds) {
				for (const spouseId of person.spouseCrIds) {
					if (!visited.has(spouseId)) {
						queue.push({ crId: spouseId, generation });
						visited.add(spouseId);
					}
				}
			}
		}

		return generationMap;
	}

	/**
	 * Converts our PersonNode format to family-chart's Data format
	 *
	 * @param familyTree The family tree to convert
	 * @returns family-chart compatible data array
	 */
	private convertToFamilyChartFormat(familyTree: FamilyTree): Data {
		const data: Data = [];

		for (const [crId, person] of familyTree.nodes) {
			// Infer gender from relationships if not available
			// Default to 'M', but if this person is someone's mother, use 'F'
			let gender: 'M' | 'F' = 'M';

			// Check if this person is referenced as anyone's mother
			for (const [_, otherPerson] of familyTree.nodes) {
				if (otherPerson.motherCrId === crId) {
					gender = 'F';
					break;
				}
			}

			const datum: Datum = {
				id: crId,
				data: {
					gender,
					'first name': person.name,
					'last name': '',
					birthday: person.birthDate || '',
					avatar: ''
				},
				rels: {
					parents: [],
					spouses: [],
					children: []
				}
			};

			// Add parent relationships (only if parent exists in tree)
			if (person.fatherCrId && familyTree.nodes.has(person.fatherCrId)) {
				datum.rels.parents!.push(person.fatherCrId);
			}
			if (person.motherCrId && familyTree.nodes.has(person.motherCrId)) {
				datum.rels.parents!.push(person.motherCrId);
			}

			// Add spouse relationships (only if spouse exists in tree)
			// Prefer enhanced spouse metadata for proper ordering, fall back to simple array
			if (person.spouses && person.spouses.length > 0) {
				// Use enhanced metadata - this preserves marriage order (spouse1, spouse2, spouse3...)
				datum.rels.spouses = person.spouses
					.map(s => s.personId)
					.filter(id => familyTree.nodes.has(id));
			} else if (person.spouseCrIds && person.spouseCrIds.length > 0) {
				// Fall back to simple array (no ordering information)
				datum.rels.spouses = person.spouseCrIds.filter(id => familyTree.nodes.has(id));
			}

			// Add children relationships (only if child exists in tree)
			if (person.childrenCrIds && person.childrenCrIds.length > 0) {
				datum.rels.children = person.childrenCrIds.filter(id => familyTree.nodes.has(id));
			}

			data.push(datum);
		}

		return data;
	}
}
