/**
 * Relationship Calculator
 *
 * Calculates the relationship between two people in the family graph
 * using BFS pathfinding and genealogical relationship naming conventions.
 */

import { App } from 'obsidian';
import { FamilyGraphService, PersonNode } from './family-graph';
import { FolderFilterService } from './folder-filter';
import { getLogger } from './logging';
import { pluralize } from '../utils/format-utils';

const logger = getLogger('RelationshipCalculator');

/**
 * Represents a step in the relationship path
 */
export interface RelationshipStep {
	person: PersonNode;
	relationship:
		| 'father' | 'mother' | 'spouse' | 'child' | 'start'
		| 'stepfather' | 'stepmother' | 'stepchild'
		| 'adoptive_father' | 'adoptive_mother' | 'adopted_child';
	direction: 'up' | 'down' | 'lateral' | 'start';
}

/**
 * Whether the relationship path goes through bio, step, or adoptive edges.
 * `step` wins over `adoptive` when both kinds appear on the same path.
 */
export type RelationshipPathKind = 'bio' | 'step' | 'adoptive';

/**
 * Result of a relationship calculation
 */
export interface RelationshipResult {
	personA: PersonNode;
	personB: PersonNode;
	path: RelationshipStep[];
	relationshipDescription: string;
	commonAncestor?: PersonNode;
	commonAncestors?: PersonNode[];
	generationsUp: number;
	generationsDown: number;
	isDirectLine: boolean;
	isBloodRelation: boolean;
	pathKind: RelationshipPathKind;
}

/**
 * Options for relationship calculation
 */
export interface RelationshipCalculatorOptions {
	/** Maximum search depth in generations (0 = unlimited) */
	maxDepth?: number;
}

/**
 * Service for calculating relationships between people
 */
export class RelationshipCalculator {
	private app: App;
	private familyGraph: FamilyGraphService;

	constructor(app: App, folderFilter?: FolderFilterService) {
		this.app = app;
		this.familyGraph = new FamilyGraphService(app);
		if (folderFilter) {
			this.familyGraph.setFolderFilter(folderFilter);
		}
	}

	/**
	 * Calculate the relationship between two people
	 */
	calculateRelationship(
		personACrId: string,
		personBCrId: string
	): RelationshipResult | null {
		// Load the family graph
		this.familyGraph.ensureCacheLoaded();

		const personA = this.familyGraph.getPersonByCrId(personACrId);
		const personB = this.familyGraph.getPersonByCrId(personBCrId);

		if (!personA || !personB) {
			logger.warn('calculate-relationship', 'Person not found', {
				personACrId,
				personBCrId,
				foundA: !!personA,
				foundB: !!personB
			});
			return null;
		}

		if (personACrId === personBCrId) {
			return {
				personA,
				personB,
				path: [{ person: personA, relationship: 'start', direction: 'start' }],
				relationshipDescription: 'Same person',
				generationsUp: 0,
				generationsDown: 0,
				isDirectLine: true,
				isBloodRelation: true,
				pathKind: 'bio'
			};
		}

		// Find path using BFS
		logger.debug('calculate-relationship', 'Starting path search', {
			personACrId: personA.crId,
			personBCrId: personB.crId
		});

		const path = this.findPath(personA, personB);

		if (!path || path.length === 0) {
			logger.warn('calculate-relationship', 'No path found between people', {
				personACrId: personA.crId,
				personBCrId: personB.crId
			});
			return {
				personA,
				personB,
				path: [],
				relationshipDescription: 'Not related',
				generationsUp: 0,
				generationsDown: 0,
				isDirectLine: false,
				isBloodRelation: false,
				pathKind: 'bio'
			};
		}

		logger.debug('calculate-relationship', 'Path found', {
			pathLength: path.length,
			pathCrIds: path.map(step => step.person.crId)
		});

		// Analyze the path to determine relationship
		const analysis = this.analyzePath(path);

		return {
			personA,
			personB,
			path,
			relationshipDescription: analysis.description,
			commonAncestor: analysis.commonAncestor,
			commonAncestors: analysis.commonAncestor ? [analysis.commonAncestor] : undefined,
			generationsUp: analysis.generationsUp,
			generationsDown: analysis.generationsDown,
			isDirectLine: analysis.isDirectLine,
			isBloodRelation: analysis.isBloodRelation,
			pathKind: analysis.pathKind
		};
	}

	/**
	 * Find additional relationships beyond the primary (shortest) one.
	 * Searches for paths through different common ancestors by excluding
	 * previously found common ancestors from the search.
	 */
	findAdditionalRelationships(
		personACrId: string,
		personBCrId: string,
		excludeAncestorCrIds: string[],
		options?: RelationshipCalculatorOptions
	): RelationshipResult[] {
		this.familyGraph.ensureCacheLoaded();

		const personA = this.familyGraph.getPersonByCrId(personACrId);
		const personB = this.familyGraph.getPersonByCrId(personBCrId);
		if (!personA || !personB) return [];

		const results: RelationshipResult[] = [];
		const excludeSet = new Set(excludeAncestorCrIds);
		const maxDepth = options?.maxDepth || 0;
		const maxResults = 10; // Safety limit

		// Find paths excluding previously found common ancestors
		for (let attempt = 0; attempt < maxResults; attempt++) {
			const path = this.findPath(personA, personB, excludeSet, maxDepth);
			if (!path || path.length === 0) break;

			const analysis = this.analyzePath(path);
			if (!analysis.commonAncestor) break;

			// Skip if we already found this common ancestor
			if (excludeSet.has(analysis.commonAncestor.crId)) break;

			excludeSet.add(analysis.commonAncestor.crId);

			results.push({
				personA,
				personB,
				path,
				relationshipDescription: analysis.description,
				commonAncestor: analysis.commonAncestor,
				commonAncestors: analysis.commonAncestor ? [analysis.commonAncestor] : undefined,
				generationsUp: analysis.generationsUp,
				generationsDown: analysis.generationsDown,
				isDirectLine: analysis.isDirectLine,
				isBloodRelation: analysis.isBloodRelation,
				pathKind: analysis.pathKind
			});
		}

		return results;
	}

	/**
	 * Find the shortest path between two people using BFS
	 */
	private findPath(
		personA: PersonNode,
		personB: PersonNode,
		excludeNodes?: Set<string>,
		maxDepth?: number
	): RelationshipStep[] | null {
		interface QueueItem {
			person: PersonNode;
			path: RelationshipStep[];
		}

		const visited = new Set<string>();
		// Pre-populate visited with excluded nodes (for multi-path search)
		if (excludeNodes) {
			for (const crId of excludeNodes) {
				visited.add(crId);
			}
		}
		const queue: QueueItem[] = [{
			person: personA,
			path: [{ person: personA, relationship: 'start', direction: 'start' }]
		}];

		visited.add(personA.crId);

		// Track exploration for debugging
		let iterations = 0;
		const maxIterations = 10000; // Safety limit
		const depthLimit = maxDepth && maxDepth > 0 ? maxDepth : Infinity;

		while (queue.length > 0 && iterations < maxIterations) {
			iterations++;
			const current = queue.shift()!;

			// Skip if path exceeds depth limit
			if (current.path.length > depthLimit * 2) continue;

			// Check if we found the target
			if (current.person.crId === personB.crId) {
				logger.debug('find-path', 'Target found', {
					iterations,
					visitedCount: visited.size,
					pathLength: current.path.length
				});
				return current.path;
			}

			// Explore parents (going up)
			if (current.person.fatherCrId) {
				const father = this.familyGraph.getPersonByCrId(current.person.fatherCrId);
				if (father && !visited.has(father.crId)) {
					visited.add(father.crId);
					queue.push({
						person: father,
						path: [...current.path, { person: father, relationship: 'father', direction: 'up' }]
					});
				} else if (!father && current.person.fatherCrId) {
					// Father ID exists but person not found in cache - data issue
					logger.debug('find-path', 'Father not in cache', {
						personCrId: current.person.crId,
						fatherCrId: current.person.fatherCrId
					});
				}
			}

			if (current.person.motherCrId) {
				const mother = this.familyGraph.getPersonByCrId(current.person.motherCrId);
				if (mother && !visited.has(mother.crId)) {
					visited.add(mother.crId);
					queue.push({
						person: mother,
						path: [...current.path, { person: mother, relationship: 'mother', direction: 'up' }]
					});
				} else if (!mother && current.person.motherCrId) {
					// Mother ID exists but person not found in cache - data issue
					logger.debug('find-path', 'Mother not in cache', {
						personCrId: current.person.crId,
						motherCrId: current.person.motherCrId
					});
				}
			}

			// Explore gender-neutral parents (going up)
			for (const parentCrId of current.person.parentCrIds) {
				const parent = this.familyGraph.getPersonByCrId(parentCrId);
				if (parent && !visited.has(parent.crId)) {
					visited.add(parent.crId);
					queue.push({
						person: parent,
						// Use 'father' as relationship type for consistency with path analysis
						// The direction 'up' is what matters for relationship calculation
						path: [...current.path, { person: parent, relationship: 'father', direction: 'up' }]
					});
				} else if (!parent) {
					logger.debug('find-path', 'Gender-neutral parent not in cache', {
						personCrId: current.person.crId,
						parentCrId
					});
				}
			}

			// Explore step-parents (going up) — #525/#526
			for (const stepfatherCrId of current.person.stepfatherCrIds) {
				const stepfather = this.familyGraph.getPersonByCrId(stepfatherCrId);
				if (stepfather && !visited.has(stepfather.crId)) {
					visited.add(stepfather.crId);
					queue.push({
						person: stepfather,
						path: [...current.path, { person: stepfather, relationship: 'stepfather', direction: 'up' }]
					});
				}
			}

			for (const stepmotherCrId of current.person.stepmotherCrIds) {
				const stepmother = this.familyGraph.getPersonByCrId(stepmotherCrId);
				if (stepmother && !visited.has(stepmother.crId)) {
					visited.add(stepmother.crId);
					queue.push({
						person: stepmother,
						path: [...current.path, { person: stepmother, relationship: 'stepmother', direction: 'up' }]
					});
				}
			}

			// Explore adoptive parents (going up) — #525
			if (current.person.adoptiveFatherCrId) {
				const adoptiveFather = this.familyGraph.getPersonByCrId(current.person.adoptiveFatherCrId);
				if (adoptiveFather && !visited.has(adoptiveFather.crId)) {
					visited.add(adoptiveFather.crId);
					queue.push({
						person: adoptiveFather,
						path: [...current.path, { person: adoptiveFather, relationship: 'adoptive_father', direction: 'up' }]
					});
				}
			}

			if (current.person.adoptiveMotherCrId) {
				const adoptiveMother = this.familyGraph.getPersonByCrId(current.person.adoptiveMotherCrId);
				if (adoptiveMother && !visited.has(adoptiveMother.crId)) {
					visited.add(adoptiveMother.crId);
					queue.push({
						person: adoptiveMother,
						path: [...current.path, { person: adoptiveMother, relationship: 'adoptive_mother', direction: 'up' }]
					});
				}
			}

			for (const adoptiveParentCrId of current.person.adoptiveParentCrIds) {
				const adoptiveParent = this.familyGraph.getPersonByCrId(adoptiveParentCrId);
				if (adoptiveParent && !visited.has(adoptiveParent.crId)) {
					visited.add(adoptiveParent.crId);
					queue.push({
						person: adoptiveParent,
						// Gender-neutral; use 'adoptive_father' as the type for consistency
						// (matches the bio-side parentCrIds → 'father' convention).
						path: [...current.path, { person: adoptiveParent, relationship: 'adoptive_father', direction: 'up' }]
					});
				}
			}

			// Explore children (going down) — bio + step + adopted via the
			// unified query service (#546). Kind discriminator drives the
			// path-segment relationship label (#525 / #526 retained).
			for (const { person: child, kind } of this.familyGraph.getQueryService().getChildren(current.person, { include: 'all' })) {
				if (visited.has(child.crId)) continue;
				visited.add(child.crId);
				const relationship = kind === 'adopted' ? 'adopted_child'
					: kind === 'step' ? 'stepchild'
					: 'child';
				queue.push({
					person: child,
					path: [...current.path, { person: child, relationship, direction: 'down' }]
				});
			}

			// Explore spouses (lateral)
			for (const spouseCrId of current.person.spouseCrIds) {
				const spouse = this.familyGraph.getPersonByCrId(spouseCrId);
				if (spouse && !visited.has(spouse.crId)) {
					visited.add(spouse.crId);
					queue.push({
						person: spouse,
						path: [...current.path, { person: spouse, relationship: 'spouse', direction: 'lateral' }]
					});
				}
			}
		}

		// Log detailed info when no path found
		logger.warn('find-path', 'No path found - BFS exhausted', {
			iterations,
			visitedCount: visited.size,
			queueExhausted: queue.length === 0,
			hitMaxIterations: iterations >= maxIterations,
			personACrId: personA.crId,
			personBCrId: personB.crId,
			// Include visited cr_ids to help identify which component was explored
			visitedSample: Array.from(visited).slice(0, 20)
		});

		return null; // No path found
	}

	/**
	 * Analyze a path to determine the relationship description
	 */
	private analyzePath(path: RelationshipStep[]): {
		description: string;
		commonAncestor?: PersonNode;
		generationsUp: number;
		generationsDown: number;
		isDirectLine: boolean;
		isBloodRelation: boolean;
		pathKind: RelationshipPathKind;
	} {
		// Count generations up and down, track spouse connections
		let generationsUp = 0;
		let generationsDown = 0;
		let hasSpouseConnection = false;
		let hasStepEdge = false;
		let hasAdoptiveEdge = false;
		let commonAncestorIndex = -1;

		// Find where the path changes direction (common ancestor)
		let direction: 'up' | 'down' | null = null;

		for (let i = 1; i < path.length; i++) {
			const step = path[i];

			if (step.direction === 'up') {
				if (direction === 'down') {
					// Changed direction - this shouldn't happen in a proper path
					// but handle it gracefully
				}
				direction = 'up';
				generationsUp++;
				commonAncestorIndex = i;
			} else if (step.direction === 'down') {
				if (direction === 'up' && commonAncestorIndex === -1) {
					commonAncestorIndex = i - 1;
				}
				direction = 'down';
				generationsDown++;
			} else if (step.direction === 'lateral') {
				hasSpouseConnection = true;
			}

			if (step.relationship === 'stepfather' || step.relationship === 'stepmother' || step.relationship === 'stepchild') {
				hasStepEdge = true;
			} else if (step.relationship === 'adoptive_father' || step.relationship === 'adoptive_mother' || step.relationship === 'adopted_child') {
				hasAdoptiveEdge = true;
			}
		}

		// If we only went up, the common ancestor is the last person
		if (generationsUp > 0 && generationsDown === 0 && commonAncestorIndex === -1) {
			commonAncestorIndex = path.length - 1;
		}

		const commonAncestor = commonAncestorIndex >= 0 ? path[commonAncestorIndex].person : undefined;
		const isDirectLine = generationsUp === 0 || generationsDown === 0;
		const pathKind: RelationshipPathKind = hasStepEdge ? 'step' : hasAdoptiveEdge ? 'adoptive' : 'bio';
		const isBloodRelation = !hasSpouseConnection && pathKind === 'bio';

		// Generate description
		const description = this.generateRelationshipDescription(
			generationsUp,
			generationsDown,
			hasSpouseConnection,
			pathKind,
			path
		);

		return {
			description,
			commonAncestor,
			generationsUp,
			generationsDown,
			isDirectLine,
			isBloodRelation,
			pathKind
		};
	}

	/**
	 * Generate a human-readable relationship description
	 */
	private generateRelationshipDescription(
		generationsUp: number,
		generationsDown: number,
		hasSpouseConnection: boolean,
		pathKind: RelationshipPathKind,
		path: RelationshipStep[]
	): string {
		// In-laws (spouse-connected paths) keep their existing labels regardless
		// of pathKind — the BFS prefers shorter step/adoptive paths over
		// spouse-traversal paths when the data records explicit step/adoptive
		// edges, so a spouse-connected path here means we genuinely don't have
		// a step/adoptive edge to surface.
		if (hasSpouseConnection) {
			if (generationsUp === 0 && generationsDown === 0) {
				return 'Spouse';
			}
			if (generationsUp === 1 && generationsDown === 0) {
				return 'Parent-in-law';
			}
			if (generationsUp === 0 && generationsDown === 1) {
				return 'Child-in-law';
			}
			if (generationsUp === 1 && generationsDown === 1) {
				return 'Sibling-in-law';
			}
			return 'Related by marriage';
		}

		const baseTerm = this.getBaseRelationshipTerm(generationsUp, generationsDown, path);

		if (pathKind === 'step') {
			return this.applyStepPrefix(baseTerm);
		}
		if (pathKind === 'adoptive') {
			return this.applyAdoptivePrefix(baseTerm);
		}
		return baseTerm;
	}

	/**
	 * Get the bio relationship term for a given (up, down) generational pair.
	 * Step/adoptive prefixes are applied separately by the caller.
	 */
	private getBaseRelationshipTerm(
		generationsUp: number,
		generationsDown: number,
		path: RelationshipStep[]
	): string {
		// Direct line ancestors
		if (generationsUp > 0 && generationsDown === 0) {
			return this.getAncestorTerm(generationsUp);
		}

		// Direct line descendants
		if (generationsUp === 0 && generationsDown > 0) {
			return this.getDescendantTerm(generationsDown, path);
		}

		// Siblings (same parents)
		if (generationsUp === 1 && generationsDown === 1) {
			return 'Sibling';
		}

		// Aunts/Uncles and Nieces/Nephews
		if (generationsUp === 1 && generationsDown === 2) {
			return 'Niece/Nephew';
		}
		if (generationsUp === 2 && generationsDown === 1) {
			return 'Aunt/Uncle';
		}

		// Cousins
		if (generationsUp > 1 && generationsDown > 1) {
			return this.getCousinTerm(generationsUp, generationsDown);
		}

		// Great aunts/uncles and grand nieces/nephews
		if (generationsUp > 1 && generationsDown === 1) {
			const greats = generationsUp - 2;
			const prefix = greats > 0 ? 'Great-'.repeat(greats) : '';
			return `${prefix}Grand Aunt/Uncle`;
		}
		if (generationsUp === 1 && generationsDown > 2) {
			const greats = generationsDown - 2;
			const prefix = greats > 0 ? 'Great-'.repeat(greats) : '';
			return `${prefix}Grand Niece/Nephew`;
		}

		// Fallback for complex relationships
		return `Related (${generationsUp} gen. up, ${generationsDown} gen. down)`;
	}

	/**
	 * Apply the "step" prefix to a base relationship term.
	 * Closed compounds for Parent / Child / Sibling; hyphen prefix elsewhere.
	 */
	private applyStepPrefix(baseTerm: string): string {
		if (baseTerm === 'Parent') return 'Stepparent';
		if (baseTerm === 'Child') return 'Stepchild';
		if (baseTerm === 'Sibling') return 'Stepsibling';
		// Hyphen prefix with lowercase tail (matches "Sibling-in-law" style).
		return `Step-${baseTerm.toLowerCase()}`;
	}

	/**
	 * Apply the "adoptive" prefix to a base relationship term.
	 * "Adopted" for the direct child case; "Adoptive" elsewhere.
	 */
	private applyAdoptivePrefix(baseTerm: string): string {
		if (baseTerm === 'Child') return 'Adopted child';
		return `Adoptive ${baseTerm.toLowerCase()}`;
	}

	/**
	 * Get the term for a direct ancestor
	 */
	private getAncestorTerm(generations: number): string {
		switch (generations) {
			case 1: return 'Parent';
			case 2: return 'Grandparent';
			case 3: return 'Great-Grandparent';
			default: {
				const greats = generations - 2;
				return 'Great-'.repeat(greats) + 'Grandparent';
			}
		}
	}

	/**
	 * Get the term for a direct descendant
	 */
	private getDescendantTerm(generations: number, path: RelationshipStep[]): string {
		// Try to determine gender from the final person if available
		switch (generations) {
			case 1: return 'Child';
			case 2: return 'Grandchild';
			case 3: return 'Great-Grandchild';
			default: {
				const greats = generations - 2;
				return 'Great-'.repeat(greats) + 'Grandchild';
			}
		}
	}

	/**
	 * Get the cousin term with proper ordinal and removal
	 */
	private getCousinTerm(generationsUp: number, generationsDown: number): string {
		// Cousin degree is based on the minimum generations from common ancestor
		const minGen = Math.min(generationsUp, generationsDown) - 1;
		const removal = Math.abs(generationsUp - generationsDown);

		const ordinal = this.getOrdinal(minGen);
		const removalText = removal > 0
			? ` ${removal} ${pluralize(removal, 'time')} removed`
			: '';

		return `${ordinal} Cousin${removalText}`;
	}

	/**
	 * Get ordinal string for a number
	 */
	private getOrdinal(n: number): string {
		if (n === 1) return '1st';
		if (n === 2) return '2nd';
		if (n === 3) return '3rd';
		return `${n}th`;
	}

	/**
	 * Get the FamilyGraphService for external access
	 */
	getFamilyGraph(): FamilyGraphService {
		return this.familyGraph;
	}
}
