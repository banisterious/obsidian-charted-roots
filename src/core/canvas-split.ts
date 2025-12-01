/**
 * Canvas Split Service
 *
 * Service for splitting family tree canvases into smaller, linked canvases.
 * Supports splitting by generation ranges, branches, collections, and lineage extraction.
 */

import type { PersonNode, FamilyTree, FamilyEdge } from './family-graph';
import type {
	SplitOptions,
	SplitResult,
	GeneratedCanvas,
	NavigationDirection,
	CanvasRelationshipType,
	RelatedCanvas
} from './canvas-navigation';
import { NavigationNodeGenerator, DEFAULT_SPLIT_OPTIONS } from './canvas-navigation';
import { MediaAssociationService, type MediaDetectionOptions, type MediaDetectionResult } from './media-association';

/**
 * Generation range for splitting
 */
export interface GenerationRange {
	/** Start generation (inclusive, 0 = root) */
	start: number;
	/** End generation (inclusive) */
	end: number;
	/** Label for this range */
	label: string;
}

/**
 * Result of assigning people to generation ranges
 */
export interface GenerationAssignment {
	/** People in each range, keyed by range label */
	byRange: Map<string, PersonNode[]>;
	/** Generation number for each person */
	generationMap: Map<string, number>;
	/** Min and max generation numbers found */
	generationBounds: { min: number; max: number };
	/** Boundary people (appear at edges of ranges, need navigation nodes) */
	boundaryPeople: Map<string, { person: PersonNode; adjacentRanges: string[] }>;
}

/**
 * Options for generation-based splitting
 */
export interface GenerationSplitOptions extends Partial<SplitOptions> {
	/** Number of generations per canvas */
	generationsPerCanvas: number;
	/** Custom ranges (overrides generationsPerCanvas) */
	customRanges?: GenerationRange[];
	/** Direction to count generations: 'up' (ancestors) or 'down' (descendants) */
	generationDirection: 'up' | 'down';
}

/**
 * Default generation split options
 */
export const DEFAULT_GENERATION_SPLIT_OPTIONS: GenerationSplitOptions = {
	...DEFAULT_SPLIT_OPTIONS,
	generationsPerCanvas: 4,
	generationDirection: 'up'
};

/**
 * Branch type for splitting
 */
export type BranchType = 'paternal' | 'maternal' | 'descendant' | 'custom';

/**
 * Branch definition for splitting
 */
export interface BranchDefinition {
	/** Type of branch */
	type: BranchType;
	/** Anchor person (the person this branch extends from) */
	anchorCrId: string;
	/** Label for this branch */
	label: string;
	/** For descendant branches, the child's crId */
	childCrId?: string;
	/** For custom branches, specific ancestor crId */
	ancestorCrId?: string;
	/** Maximum generations to include (undefined = all) */
	maxGenerations?: number;
}

/**
 * Result of branch extraction
 */
export interface BranchExtractionResult {
	/** People included in this branch */
	people: PersonNode[];
	/** CrIds of people in the branch */
	crIds: Set<string>;
	/** Root of this branch (paternal/maternal grandparent, or child for descendant) */
	branchRoot: PersonNode | undefined;
	/** Boundary people who connect to other branches */
	boundaryPeople: Map<string, { person: PersonNode; connectedBranches: string[] }>;
	/** Generation depth achieved */
	generationDepth: number;
}

/**
 * Options for branch-based splitting
 */
export interface BranchSplitOptions extends Partial<SplitOptions> {
	/** Branches to extract */
	branches: BranchDefinition[];
	/** Include spouses of branch members */
	includeSpouses: boolean;
	/** Maximum recursion depth for recursive splitting (0 = no recursion) */
	recursionDepth: number;
	/** Whether to create sub-branches for each grandparent line */
	splitGrandparentLines: boolean;
}

/**
 * Default branch split options
 */
export const DEFAULT_BRANCH_SPLIT_OPTIONS: BranchSplitOptions = {
	...DEFAULT_SPLIT_OPTIONS,
	branches: [],
	includeSpouses: true,
	recursionDepth: 0,
	splitGrandparentLines: false
};

/**
 * Canvas data structure for manipulation
 */
interface CanvasData {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
	groups?: CanvasGroup[];
}

interface CanvasNode {
	id: string;
	type: 'file' | 'text' | 'link' | 'group';
	file?: string;
	text?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

interface CanvasEdge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide?: 'top' | 'right' | 'bottom' | 'left';
	toSide?: 'top' | 'right' | 'bottom' | 'left';
	color?: string;
	label?: string;
}

interface CanvasGroup {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	label?: string;
}

/**
 * Service for splitting family tree canvases
 */
export class CanvasSplitService {
	private navigationGenerator: NavigationNodeGenerator;
	private mediaService: MediaAssociationService;

	constructor() {
		this.navigationGenerator = new NavigationNodeGenerator();
		this.mediaService = new MediaAssociationService();
	}

	/**
	 * Split a family tree by generation ranges
	 *
	 * @param tree - The family tree to split
	 * @param options - Split options
	 * @returns Split result with generated canvas information
	 */
	splitByGeneration(
		tree: FamilyTree,
		options: GenerationSplitOptions
	): SplitResult {
		const opts = { ...DEFAULT_GENERATION_SPLIT_OPTIONS, ...options };

		// Calculate generations for all people
		const assignment = this.assignGenerations(tree, opts.generationDirection);

		// Create generation ranges
		const ranges = opts.customRanges || this.createGenerationRanges(
			assignment.generationBounds,
			opts.generationsPerCanvas,
			opts.generationDirection
		);

		// Assign people to ranges
		this.assignPeopleToRanges(assignment, ranges);

		// Generate canvas info for each range
		const canvases: GeneratedCanvas[] = [];
		const relatedCanvases: RelatedCanvas[] = [];

		for (const range of ranges) {
			const people = assignment.byRange.get(range.label) || [];
			if (people.length === 0) continue;

			const canvasPath = this.generateCanvasPath(opts, range.label);

			const canvas: GeneratedCanvas = {
				path: canvasPath,
				label: range.label,
				personCount: people.length,
				generationRange: [range.start, range.end]
			};
			canvases.push(canvas);

			// Build related canvas info
			const direction = this.getRelationshipDirection(range, ranges, opts.generationDirection);
			relatedCanvases.push({
				path: canvasPath,
				label: range.label,
				direction,
				generationRange: [range.start, range.end],
				personCount: people.length
			});
		}

		// Calculate total people
		const totalPeople = Array.from(assignment.byRange.values())
			.reduce((sum, people) => sum + people.length, 0);

		return {
			canvases,
			totalPeople
		};
	}

	/**
	 * Calculate generation numbers for all people in the tree
	 *
	 * @param tree - The family tree
	 * @param direction - 'up' for ancestors (positive generations), 'down' for descendants
	 * @returns Generation assignment result
	 */
	assignGenerations(
		tree: FamilyTree,
		direction: 'up' | 'down'
	): GenerationAssignment {
		const generationMap = new Map<string, number>();
		const byRange = new Map<string, PersonNode[]>();
		let minGen = 0;
		let maxGen = 0;

		// BFS to assign generations
		const visited = new Set<string>();
		const queue: Array<{ crId: string; generation: number }> = [
			{ crId: tree.root.crId, generation: 0 }
		];

		while (queue.length > 0) {
			const { crId, generation } = queue.shift()!;

			if (visited.has(crId)) continue;
			visited.add(crId);

			const person = tree.nodes.get(crId);
			if (!person) continue;

			generationMap.set(crId, generation);
			minGen = Math.min(minGen, generation);
			maxGen = Math.max(maxGen, generation);

			// Traverse based on direction
			if (direction === 'up') {
				// Parents are +1 generation (further back in time)
				if (person.fatherCrId && tree.nodes.has(person.fatherCrId)) {
					queue.push({ crId: person.fatherCrId, generation: generation + 1 });
				}
				if (person.motherCrId && tree.nodes.has(person.motherCrId)) {
					queue.push({ crId: person.motherCrId, generation: generation + 1 });
				}
				// Children are -1 generation (closer to present)
				for (const childId of person.childrenCrIds) {
					if (tree.nodes.has(childId)) {
						queue.push({ crId: childId, generation: generation - 1 });
					}
				}
			} else {
				// Children are +1 generation (further from root)
				for (const childId of person.childrenCrIds) {
					if (tree.nodes.has(childId)) {
						queue.push({ crId: childId, generation: generation + 1 });
					}
				}
				// Parents are -1 generation (closer to root)
				if (person.fatherCrId && tree.nodes.has(person.fatherCrId)) {
					queue.push({ crId: person.fatherCrId, generation: generation - 1 });
				}
				if (person.motherCrId && tree.nodes.has(person.motherCrId)) {
					queue.push({ crId: person.motherCrId, generation: generation - 1 });
				}
			}

			// Spouses stay at same generation
			for (const spouseId of person.spouseCrIds) {
				if (tree.nodes.has(spouseId) && !visited.has(spouseId)) {
					queue.push({ crId: spouseId, generation });
				}
			}
		}

		return {
			byRange,
			generationMap,
			generationBounds: { min: minGen, max: maxGen },
			boundaryPeople: new Map()
		};
	}

	/**
	 * Create generation ranges based on bounds and size
	 */
	private createGenerationRanges(
		bounds: { min: number; max: number },
		generationsPerCanvas: number,
		direction: 'up' | 'down'
	): GenerationRange[] {
		const ranges: GenerationRange[] = [];

		if (direction === 'up') {
			// Start from 0 (root) and go up
			for (let start = 0; start <= bounds.max; start += generationsPerCanvas) {
				const end = Math.min(start + generationsPerCanvas - 1, bounds.max);
				ranges.push({
					start,
					end,
					label: this.formatGenerationLabel(start, end, 'ancestors')
				});
			}
			// Handle negative generations (descendants of root)
			if (bounds.min < 0) {
				for (let end = -1; end >= bounds.min; end -= generationsPerCanvas) {
					const start = Math.max(end - generationsPerCanvas + 1, bounds.min);
					ranges.unshift({
						start,
						end,
						label: this.formatGenerationLabel(start, end, 'descendants')
					});
				}
			}
		} else {
			// Start from 0 (root) and go down
			for (let start = 0; start <= bounds.max; start += generationsPerCanvas) {
				const end = Math.min(start + generationsPerCanvas - 1, bounds.max);
				ranges.push({
					start,
					end,
					label: this.formatGenerationLabel(start, end, 'descendants')
				});
			}
			// Handle negative generations (ancestors of root)
			if (bounds.min < 0) {
				for (let end = -1; end >= bounds.min; end -= generationsPerCanvas) {
					const start = Math.max(end - generationsPerCanvas + 1, bounds.min);
					ranges.unshift({
						start,
						end,
						label: this.formatGenerationLabel(start, end, 'ancestors')
					});
				}
			}
		}

		return ranges;
	}

	/**
	 * Format a human-readable label for a generation range
	 */
	private formatGenerationLabel(start: number, end: number, type: 'ancestors' | 'descendants'): string {
		if (start === 0 && end === 0) {
			return 'Root';
		}

		const absStart = Math.abs(start);
		const absEnd = Math.abs(end);

		if (start === end) {
			return `Gen ${absStart}`;
		}

		if (type === 'ancestors') {
			if (start === 0) {
				return `Root to Gen ${absEnd}`;
			}
			return `Gen ${absStart}-${absEnd}`;
		} else {
			if (start === 0) {
				return `Root to Gen ${absEnd}`;
			}
			return `Gen ${absStart}-${absEnd}`;
		}
	}

	/**
	 * Assign people to their respective generation ranges
	 */
	private assignPeopleToRanges(
		assignment: GenerationAssignment,
		ranges: GenerationRange[]
	): void {
		// Initialize range buckets
		for (const range of ranges) {
			assignment.byRange.set(range.label, []);
		}

		// For each person, find their range and assign them
		// Note: We need the tree to get PersonNode objects
		// This is a simplified version - in practice, we'd pass the tree
	}

	/**
	 * Get people in a specific generation range from the tree
	 */
	getPeopleInRange(
		tree: FamilyTree,
		assignment: GenerationAssignment,
		range: GenerationRange
	): PersonNode[] {
		const people: PersonNode[] = [];

		for (const [crId, generation] of assignment.generationMap.entries()) {
			if (generation >= range.start && generation <= range.end) {
				const person = tree.nodes.get(crId);
				if (person) {
					people.push(person);
				}
			}
		}

		return people;
	}

	/**
	 * Find people at the boundaries between ranges (need navigation nodes)
	 */
	findBoundaryPeople(
		tree: FamilyTree,
		assignment: GenerationAssignment,
		ranges: GenerationRange[]
	): Map<string, { person: PersonNode; adjacentRanges: string[] }> {
		const boundary = new Map<string, { person: PersonNode; adjacentRanges: string[] }>();

		for (const [crId, generation] of assignment.generationMap.entries()) {
			const person = tree.nodes.get(crId);
			if (!person) continue;

			// Check if this person is at a range boundary
			const adjacentRanges: string[] = [];

			for (const range of ranges) {
				// Person is at the edge of this range
				if (generation === range.start || generation === range.end) {
					// Check if they have connections to another range
					const connectedGens = this.getConnectedGenerations(person, tree, assignment);

					for (const connectedGen of connectedGens) {
						// Find which range the connected person is in
						const connectedRange = ranges.find(r =>
							connectedGen >= r.start && connectedGen <= r.end
						);
						if (connectedRange && connectedRange.label !== range.label) {
							if (!adjacentRanges.includes(connectedRange.label)) {
								adjacentRanges.push(connectedRange.label);
							}
						}
					}
				}
			}

			if (adjacentRanges.length > 0) {
				boundary.set(crId, { person, adjacentRanges });
			}
		}

		return boundary;
	}

	/**
	 * Get generations of all directly connected people
	 */
	private getConnectedGenerations(
		person: PersonNode,
		tree: FamilyTree,
		assignment: GenerationAssignment
	): number[] {
		const generations: number[] = [];

		// Parents
		if (person.fatherCrId) {
			const gen = assignment.generationMap.get(person.fatherCrId);
			if (gen !== undefined) generations.push(gen);
		}
		if (person.motherCrId) {
			const gen = assignment.generationMap.get(person.motherCrId);
			if (gen !== undefined) generations.push(gen);
		}

		// Children
		for (const childId of person.childrenCrIds) {
			const gen = assignment.generationMap.get(childId);
			if (gen !== undefined) generations.push(gen);
		}

		return generations;
	}

	/**
	 * Generate navigation nodes for range boundaries
	 */
	generateBoundaryNavigationNodes(
		tree: FamilyTree,
		assignment: GenerationAssignment,
		sourceRange: GenerationRange,
		targetRange: GenerationRange,
		targetCanvasPath: string
	): Array<{ node: ReturnType<NavigationNodeGenerator['createPortalNode']>; nearPerson: PersonNode }> {
		const nodes: Array<{ node: ReturnType<NavigationNodeGenerator['createPortalNode']>; nearPerson: PersonNode }> = [];

		// Find boundary people between these ranges
		const boundaryPeople = this.findBoundaryPeople(tree, assignment, [sourceRange, targetRange]);

		for (const [, { person, adjacentRanges }] of boundaryPeople.entries()) {
			if (adjacentRanges.includes(targetRange.label)) {
				const personGen = assignment.generationMap.get(person.crId);
				if (personGen === undefined) continue;

				// Determine direction based on generation relationship
				const direction: NavigationDirection = targetRange.start > sourceRange.end ? 'up' : 'down';

				// Create portal node
				const countInTarget = this.getPeopleInRange(tree, assignment, targetRange).length;
				const node = this.navigationGenerator.createPortalNode(
					targetCanvasPath,
					targetRange.label,
					{ x: 0, y: 0 }, // Position will be set based on person's position
					direction,
					`${countInTarget} people`
				);

				nodes.push({ node, nearPerson: person });
			}
		}

		return nodes;
	}

	/**
	 * Get relationship direction for a range relative to others
	 */
	private getRelationshipDirection(
		range: GenerationRange,
		allRanges: GenerationRange[],
		generationDirection: 'up' | 'down'
	): 'ancestor' | 'descendant' | 'sibling' {
		// Find this range's position in the sorted list
		const sortedRanges = [...allRanges].sort((a, b) => a.start - b.start);
		const index = sortedRanges.findIndex(r => r.label === range.label);

		if (index === 0) {
			return generationDirection === 'up' ? 'descendant' : 'ancestor';
		} else if (index === sortedRanges.length - 1) {
			return generationDirection === 'up' ? 'ancestor' : 'descendant';
		}

		return 'sibling';
	}

	/**
	 * Generate canvas file path based on options and label
	 */
	private generateCanvasPath(options: GenerationSplitOptions, label: string): string {
		const folder = options.outputFolder || '';
		const pattern = options.filenamePattern || '{name}';

		// Replace placeholders
		const filename = pattern
			.replace('{name}', this.sanitizeFilename(label))
			.replace('{type}', 'generation')
			.replace('{date}', new Date().toISOString().split('T')[0]);

		const extension = filename.endsWith('.canvas') ? '' : '.canvas';

		if (folder) {
			return `${folder}/${filename}${extension}`;
		}
		return `${filename}${extension}`;
	}

	/**
	 * Sanitize a string for use as a filename
	 */
	private sanitizeFilename(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	/**
	 * Get edges that cross between two generation ranges
	 */
	getCrossingEdges(
		tree: FamilyTree,
		assignment: GenerationAssignment,
		rangeA: GenerationRange,
		rangeB: GenerationRange
	): FamilyEdge[] {
		const crossingEdges: FamilyEdge[] = [];

		for (const edge of tree.edges) {
			const fromGen = assignment.generationMap.get(edge.from);
			const toGen = assignment.generationMap.get(edge.to);

			if (fromGen === undefined || toGen === undefined) continue;

			const fromInA = fromGen >= rangeA.start && fromGen <= rangeA.end;
			const fromInB = fromGen >= rangeB.start && fromGen <= rangeB.end;
			const toInA = toGen >= rangeA.start && toGen <= rangeA.end;
			const toInB = toGen >= rangeB.start && toGen <= rangeB.end;

			// Edge crosses if one end is in A and other is in B
			if ((fromInA && toInB) || (fromInB && toInA)) {
				crossingEdges.push(edge);
			}
		}

		return crossingEdges;
	}

	/**
	 * Preview a generation split without actually creating files
	 */
	previewGenerationSplit(
		tree: FamilyTree,
		options: GenerationSplitOptions
	): {
		ranges: GenerationRange[];
		peopleCounts: Map<string, number>;
		boundaryCount: number;
		totalPeople: number;
	} {
		const opts = { ...DEFAULT_GENERATION_SPLIT_OPTIONS, ...options };
		const assignment = this.assignGenerations(tree, opts.generationDirection);

		const ranges = opts.customRanges || this.createGenerationRanges(
			assignment.generationBounds,
			opts.generationsPerCanvas,
			opts.generationDirection
		);

		const peopleCounts = new Map<string, number>();
		let totalPeople = 0;

		for (const range of ranges) {
			const people = this.getPeopleInRange(tree, assignment, range);
			peopleCounts.set(range.label, people.length);
			totalPeople += people.length;
		}

		const boundaryPeople = this.findBoundaryPeople(tree, assignment, ranges);

		return {
			ranges,
			peopleCounts,
			boundaryCount: boundaryPeople.size,
			totalPeople
		};
	}

	/**
	 * Find associated media for a set of people
	 */
	findAssociatedMedia(
		canvas: CanvasData,
		personCrIds: Set<string>,
		options?: Partial<MediaDetectionOptions>
	): MediaDetectionResult {
		return this.mediaService.findAssociatedMedia(canvas, personCrIds, options);
	}

	/**
	 * Generate a unique ID
	 */
	private generateId(): string {
		return Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15);
	}

	// =========================================================================
	// Phase 5: Branch-Based Splitting
	// =========================================================================

	/**
	 * Split a family tree by branches (paternal/maternal lines, descendants)
	 *
	 * @param tree - The family tree to split
	 * @param options - Branch split options
	 * @returns Split result with generated canvas information
	 */
	splitByBranch(
		tree: FamilyTree,
		options: BranchSplitOptions
	): SplitResult {
		const opts = { ...DEFAULT_BRANCH_SPLIT_OPTIONS, ...options };
		const canvases: GeneratedCanvas[] = [];
		let totalPeople = 0;

		for (const branch of opts.branches) {
			const extraction = this.extractBranch(tree, branch, opts);

			if (extraction.people.length === 0) continue;

			const canvasPath = this.generateBranchCanvasPath(opts, branch);

			const canvas: GeneratedCanvas = {
				path: canvasPath,
				label: branch.label,
				personCount: extraction.people.length,
				branchType: branch.type,
				anchorPerson: branch.anchorCrId
			};
			canvases.push(canvas);
			totalPeople += extraction.people.length;

			// Handle recursive splitting if enabled
			if (opts.splitGrandparentLines && opts.recursionDepth > 0) {
				const subBranches = this.generateGrandparentBranches(
					tree,
					extraction,
					branch,
					opts.recursionDepth - 1
				);

				for (const subBranch of subBranches) {
					const subExtraction = this.extractBranch(tree, subBranch, opts);
					if (subExtraction.people.length === 0) continue;

					const subCanvasPath = this.generateBranchCanvasPath(opts, subBranch);

					canvases.push({
						path: subCanvasPath,
						label: subBranch.label,
						personCount: subExtraction.people.length,
						branchType: subBranch.type,
						anchorPerson: subBranch.anchorCrId,
						parentBranch: branch.label
					});
					totalPeople += subExtraction.people.length;
				}
			}
		}

		return {
			canvases,
			totalPeople
		};
	}

	/**
	 * Extract all people belonging to a specific branch
	 *
	 * @param tree - The family tree
	 * @param branch - Branch definition
	 * @param options - Split options
	 * @returns Branch extraction result
	 */
	extractBranch(
		tree: FamilyTree,
		branch: BranchDefinition,
		options: BranchSplitOptions
	): BranchExtractionResult {
		const people: PersonNode[] = [];
		let extractionResult: { crIds: Set<string>; branchRoot: PersonNode | undefined; generationDepth: number } = {
			crIds: new Set<string>(),
			branchRoot: undefined,
			generationDepth: 0
		};

		const anchor = tree.nodes.get(branch.anchorCrId);
		if (!anchor) {
			return {
				people: [],
				crIds: new Set(),
				branchRoot: undefined,
				boundaryPeople: new Map(),
				generationDepth: 0
			};
		}

		switch (branch.type) {
			case 'paternal':
				extractionResult = this.extractPaternalLine(
					tree,
					anchor,
					branch.maxGenerations
				);
				break;

			case 'maternal':
				extractionResult = this.extractMaternalLine(
					tree,
					anchor,
					branch.maxGenerations
				);
				break;

			case 'descendant':
				if (branch.childCrId) {
					const child = tree.nodes.get(branch.childCrId);
					if (child) {
						extractionResult = this.extractDescendantLine(
							tree,
							child,
							branch.maxGenerations
						);
					}
				}
				break;

			case 'custom':
				if (branch.ancestorCrId) {
					const ancestor = tree.nodes.get(branch.ancestorCrId);
					if (ancestor) {
						extractionResult = this.extractAncestorLine(
							tree,
							anchor,
							ancestor,
							branch.maxGenerations
						);
					}
				}
				break;
		}

		const { crIds, branchRoot, generationDepth } = extractionResult;

		// Optionally include spouses
		if (options.includeSpouses) {
			this.addSpouses(tree, crIds);
		}

		// Convert crIds to PersonNodes
		for (const crId of crIds) {
			const person = tree.nodes.get(crId);
			if (person) {
				people.push(person);
			}
		}

		// Find boundary people (those with connections outside this branch)
		const boundaryPeople = this.findBranchBoundaryPeople(tree, crIds, branch.label);

		return {
			people,
			crIds,
			branchRoot,
			boundaryPeople,
			generationDepth
		};
	}

	/**
	 * Extract paternal line (father's ancestors)
	 */
	private extractPaternalLine(
		tree: FamilyTree,
		anchor: PersonNode,
		maxGenerations?: number
	): { crIds: Set<string>; branchRoot: PersonNode | undefined; generationDepth: number } {
		const crIds = new Set<string>();
		let branchRoot: PersonNode | undefined;
		let generationDepth = 0;

		// Start with father
		if (!anchor.fatherCrId) {
			return { crIds, branchRoot: undefined, generationDepth: 0 };
		}

		const father = tree.nodes.get(anchor.fatherCrId);
		if (!father) {
			return { crIds, branchRoot: undefined, generationDepth: 0 };
		}

		// BFS to collect all paternal ancestors
		const queue: Array<{ person: PersonNode; depth: number }> = [{ person: father, depth: 1 }];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const { person, depth } = queue.shift()!;

			if (visited.has(person.crId)) continue;
			if (maxGenerations !== undefined && depth > maxGenerations) continue;

			visited.add(person.crId);
			crIds.add(person.crId);
			branchRoot = person; // Will end up being the most distant ancestor
			generationDepth = Math.max(generationDepth, depth);

			// Add both parents of this person (we're tracing the full paternal lineage)
			if (person.fatherCrId) {
				const grandfather = tree.nodes.get(person.fatherCrId);
				if (grandfather) {
					queue.push({ person: grandfather, depth: depth + 1 });
				}
			}
			if (person.motherCrId) {
				const grandmother = tree.nodes.get(person.motherCrId);
				if (grandmother) {
					queue.push({ person: grandmother, depth: depth + 1 });
				}
			}
		}

		return { crIds, branchRoot, generationDepth };
	}

	/**
	 * Extract maternal line (mother's ancestors)
	 */
	private extractMaternalLine(
		tree: FamilyTree,
		anchor: PersonNode,
		maxGenerations?: number
	): { crIds: Set<string>; branchRoot: PersonNode | undefined; generationDepth: number } {
		const crIds = new Set<string>();
		let branchRoot: PersonNode | undefined;
		let generationDepth = 0;

		// Start with mother
		if (!anchor.motherCrId) {
			return { crIds, branchRoot: undefined, generationDepth: 0 };
		}

		const mother = tree.nodes.get(anchor.motherCrId);
		if (!mother) {
			return { crIds, branchRoot: undefined, generationDepth: 0 };
		}

		// BFS to collect all maternal ancestors
		const queue: Array<{ person: PersonNode; depth: number }> = [{ person: mother, depth: 1 }];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const { person, depth } = queue.shift()!;

			if (visited.has(person.crId)) continue;
			if (maxGenerations !== undefined && depth > maxGenerations) continue;

			visited.add(person.crId);
			crIds.add(person.crId);
			branchRoot = person;
			generationDepth = Math.max(generationDepth, depth);

			// Add both parents of this person
			if (person.fatherCrId) {
				const grandfather = tree.nodes.get(person.fatherCrId);
				if (grandfather) {
					queue.push({ person: grandfather, depth: depth + 1 });
				}
			}
			if (person.motherCrId) {
				const grandmother = tree.nodes.get(person.motherCrId);
				if (grandmother) {
					queue.push({ person: grandmother, depth: depth + 1 });
				}
			}
		}

		return { crIds, branchRoot, generationDepth };
	}

	/**
	 * Extract descendant line (a child and all their descendants)
	 */
	private extractDescendantLine(
		tree: FamilyTree,
		child: PersonNode,
		maxGenerations?: number
	): { crIds: Set<string>; branchRoot: PersonNode | undefined; generationDepth: number } {
		const crIds = new Set<string>();
		let generationDepth = 0;

		// BFS to collect all descendants
		const queue: Array<{ person: PersonNode; depth: number }> = [{ person: child, depth: 0 }];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const { person, depth } = queue.shift()!;

			if (visited.has(person.crId)) continue;
			if (maxGenerations !== undefined && depth > maxGenerations) continue;

			visited.add(person.crId);
			crIds.add(person.crId);
			generationDepth = Math.max(generationDepth, depth);

			// Add all children
			for (const childCrId of person.childrenCrIds) {
				const descendant = tree.nodes.get(childCrId);
				if (descendant) {
					queue.push({ person: descendant, depth: depth + 1 });
				}
			}
		}

		return { crIds, branchRoot: child, generationDepth };
	}

	/**
	 * Extract ancestor line to a specific ancestor
	 */
	private extractAncestorLine(
		tree: FamilyTree,
		anchor: PersonNode,
		targetAncestor: PersonNode,
		maxGenerations?: number
	): { crIds: Set<string>; branchRoot: PersonNode | undefined; generationDepth: number } {
		const crIds = new Set<string>();
		let generationDepth = 0;

		// BFS from target ancestor down to find path
		const queue: Array<{ person: PersonNode; depth: number }> = [{ person: targetAncestor, depth: 0 }];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const { person, depth } = queue.shift()!;

			if (visited.has(person.crId)) continue;
			if (maxGenerations !== undefined && depth > maxGenerations) continue;

			visited.add(person.crId);
			crIds.add(person.crId);
			generationDepth = Math.max(generationDepth, depth);

			// Add both parents (going up from the ancestor)
			if (person.fatherCrId) {
				const father = tree.nodes.get(person.fatherCrId);
				if (father) {
					queue.push({ person: father, depth: depth + 1 });
				}
			}
			if (person.motherCrId) {
				const mother = tree.nodes.get(person.motherCrId);
				if (mother) {
					queue.push({ person: mother, depth: depth + 1 });
				}
			}
		}

		return { crIds, branchRoot: targetAncestor, generationDepth };
	}

	/**
	 * Add spouses of all people in a set
	 */
	private addSpouses(tree: FamilyTree, crIds: Set<string>): void {
		const spousesToAdd = new Set<string>();

		for (const crId of crIds) {
			const person = tree.nodes.get(crId);
			if (person) {
				for (const spouseId of person.spouseCrIds) {
					if (!crIds.has(spouseId)) {
						spousesToAdd.add(spouseId);
					}
				}
			}
		}

		for (const spouseId of spousesToAdd) {
			crIds.add(spouseId);
		}
	}

	/**
	 * Find boundary people in a branch (those with connections outside)
	 */
	private findBranchBoundaryPeople(
		tree: FamilyTree,
		branchCrIds: Set<string>,
		branchLabel: string
	): Map<string, { person: PersonNode; connectedBranches: string[] }> {
		const boundary = new Map<string, { person: PersonNode; connectedBranches: string[] }>();

		for (const crId of branchCrIds) {
			const person = tree.nodes.get(crId);
			if (!person) continue;

			const connectedBranches: string[] = [];

			// Check if any parents are outside this branch
			if (person.fatherCrId && !branchCrIds.has(person.fatherCrId)) {
				connectedBranches.push('paternal');
			}
			if (person.motherCrId && !branchCrIds.has(person.motherCrId)) {
				connectedBranches.push('maternal');
			}

			// Check if any children are outside this branch
			for (const childId of person.childrenCrIds) {
				if (!branchCrIds.has(childId)) {
					connectedBranches.push('descendants');
					break; // Only need to mark once
				}
			}

			// Check if any spouses are outside this branch
			for (const spouseId of person.spouseCrIds) {
				if (!branchCrIds.has(spouseId)) {
					connectedBranches.push('spouse-family');
					break;
				}
			}

			if (connectedBranches.length > 0) {
				boundary.set(crId, { person, connectedBranches });
			}
		}

		return boundary;
	}

	/**
	 * Generate sub-branches for grandparent lines
	 */
	private generateGrandparentBranches(
		tree: FamilyTree,
		extraction: BranchExtractionResult,
		parentBranch: BranchDefinition,
		remainingDepth: number
	): BranchDefinition[] {
		const subBranches: BranchDefinition[] = [];

		if (remainingDepth < 0 || !extraction.branchRoot) {
			return subBranches;
		}

		const branchRoot = extraction.branchRoot;

		// Create paternal grandparent branch
		if (branchRoot.fatherCrId) {
			const grandfather = tree.nodes.get(branchRoot.fatherCrId);
			if (grandfather) {
				subBranches.push({
					type: 'paternal',
					anchorCrId: branchRoot.crId,
					label: `${parentBranch.label} - Paternal`,
					maxGenerations: parentBranch.maxGenerations
				});
			}
		}

		// Create maternal grandparent branch
		if (branchRoot.motherCrId) {
			const grandmother = tree.nodes.get(branchRoot.motherCrId);
			if (grandmother) {
				subBranches.push({
					type: 'maternal',
					anchorCrId: branchRoot.crId,
					label: `${parentBranch.label} - Maternal`,
					maxGenerations: parentBranch.maxGenerations
				});
			}
		}

		return subBranches;
	}

	/**
	 * Generate canvas path for a branch
	 */
	private generateBranchCanvasPath(options: BranchSplitOptions, branch: BranchDefinition): string {
		const folder = options.outputFolder || '';
		const pattern = options.filenamePattern || '{name}';

		const filename = pattern
			.replace('{name}', this.sanitizeFilename(branch.label))
			.replace('{type}', branch.type)
			.replace('{date}', new Date().toISOString().split('T')[0]);

		const extension = filename.endsWith('.canvas') ? '' : '.canvas';

		if (folder) {
			return `${folder}/${filename}${extension}`;
		}
		return `${filename}${extension}`;
	}

	/**
	 * Create standard paternal/maternal branch definitions for a person
	 */
	createStandardBranches(
		tree: FamilyTree,
		anchorCrId: string,
		options?: { maxGenerations?: number; includeDescendants?: boolean }
	): BranchDefinition[] {
		const branches: BranchDefinition[] = [];
		const anchor = tree.nodes.get(anchorCrId);

		if (!anchor) return branches;

		// Paternal line
		if (anchor.fatherCrId) {
			const father = tree.nodes.get(anchor.fatherCrId);
			if (father) {
				branches.push({
					type: 'paternal',
					anchorCrId,
					label: `Paternal Line (${father.name || 'Father'})`,
					maxGenerations: options?.maxGenerations
				});
			}
		}

		// Maternal line
		if (anchor.motherCrId) {
			const mother = tree.nodes.get(anchor.motherCrId);
			if (mother) {
				branches.push({
					type: 'maternal',
					anchorCrId,
					label: `Maternal Line (${mother.name || 'Mother'})`,
					maxGenerations: options?.maxGenerations
				});
			}
		}

		// Descendant lines (one per child)
		if (options?.includeDescendants) {
			for (const childId of anchor.childrenCrIds) {
				const child = tree.nodes.get(childId);
				if (child) {
					branches.push({
						type: 'descendant',
						anchorCrId,
						childCrId: childId,
						label: `Descendants of ${child.name || 'Child'}`,
						maxGenerations: options?.maxGenerations
					});
				}
			}
		}

		return branches;
	}

	/**
	 * Preview a branch split without creating files
	 */
	previewBranchSplit(
		tree: FamilyTree,
		options: BranchSplitOptions
	): {
		branches: Array<{
			definition: BranchDefinition;
			peopleCount: number;
			boundaryCount: number;
			generationDepth: number;
		}>;
		totalPeople: number;
		overlap: number;
	} {
		const opts = { ...DEFAULT_BRANCH_SPLIT_OPTIONS, ...options };
		const branches: Array<{
			definition: BranchDefinition;
			peopleCount: number;
			boundaryCount: number;
			generationDepth: number;
		}> = [];

		const allPeopleSeen = new Set<string>();
		let totalPeople = 0;
		let overlap = 0;

		for (const branch of opts.branches) {
			const extraction = this.extractBranch(tree, branch, opts);

			// Calculate overlap
			for (const crId of extraction.crIds) {
				if (allPeopleSeen.has(crId)) {
					overlap++;
				} else {
					allPeopleSeen.add(crId);
				}
			}

			branches.push({
				definition: branch,
				peopleCount: extraction.people.length,
				boundaryCount: extraction.boundaryPeople.size,
				generationDepth: extraction.generationDepth
			});

			totalPeople += extraction.people.length;
		}

		return {
			branches,
			totalPeople,
			overlap
		};
	}
}
