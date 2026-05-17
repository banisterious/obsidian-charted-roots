/**
 * Relationship Query Service
 *
 * Unified API for traversing family relationships on `PersonNode`. Wraps
 * a `PersonLookup` callback so the service is pure (no Obsidian deps)
 * and consumers don't reimplement the same walks across renderers,
 * report generators, profile views, and dynamic content blocks.
 *
 * Tracking issue: #546.
 *
 * Design notes:
 * - Every query that crosses a relationship-kind boundary requires the
 *   caller to specify `include` ('all' | 'bio' | 'adopted' | 'step' for
 *   children/siblings; 'all' | 'bio' | 'adoptive' | 'step' for parents).
 *   No default — callers make a conscious choice. Callers that previously
 *   silently walked only `childrenCrIds` are now forced to declare whether
 *   that's intentional ('bio' for pedigree-style reports) or a gap.
 * - `walkDescendants` / `walkAncestors` stop at adopted/adoptive and step
 *   boundaries by default. Opt in with `followAdopted` / `followAdoptive` /
 *   `followStep`. Preserves the existing comment in `family-graph.ts:978`
 *   ("Don't recurse descendants for adopted children — they have their
 *   own family line"); consumers that want fuller inclusion declare it.
 * - Returned items always carry a `kind` discriminator so consumers can
 *   style by relationship type without re-deriving from the source.
 */

import type { PersonNode } from './family-graph';
import type { SpouseRelationship } from '../models/person';
import type { DateService } from '../dates/services/date-service';

/** Resolves a crId to a PersonNode, or undefined if not in the cache. */
export type PersonLookup = (crId: string) => PersonNode | undefined;

/** Discriminator on every query result so consumers can style by kind. */
export type ChildKind = 'bio' | 'adopted' | 'step';
export type ParentKind = 'bio' | 'adoptive' | 'step';
export type SiblingKind = 'bio' | 'adopted' | 'step';

/** Variant filter for child/sibling queries. */
export type ChildInclude = 'all' | ChildKind;
export type SiblingInclude = 'all' | SiblingKind;

/** Variant filter for parent queries. */
export type ParentInclude = 'all' | ParentKind;

export interface ChildQueryResult {
	person: PersonNode;
	kind: ChildKind;
}

export interface ParentQueryResult {
	person: PersonNode;
	kind: ParentKind;
}

export interface SiblingQueryResult {
	person: PersonNode;
	kind: SiblingKind;
}

/** Options for descendant traversal. */
export interface WalkDescendantsOptions {
	/** Follow adopted-child edges into their descendants. Default: false. */
	followAdopted?: boolean;
	/** Follow stepchild edges into their descendants. Default: false. */
	followStep?: boolean;
	/** Maximum generations to descend. 0 or undefined = unlimited. */
	maxGenerations?: number;
}

/** Options for ancestor traversal. */
export interface WalkAncestorsOptions {
	/** Follow adoptive-parent edges into their ancestors. Default: false. */
	followAdoptive?: boolean;
	/** Follow step-parent edges into their ancestors. Default: false. */
	followStep?: boolean;
	/** Maximum generations to ascend. 0 or undefined = unlimited. */
	maxGenerations?: number;
}

/** Visit callback for walks. Receives the visited person and their depth. */
export type VisitFn = (
	person: PersonNode,
	depth: number,
	kind: ChildKind | ParentKind | 'root'
) => void;

export class RelationshipQueryService {
	constructor(private readonly getPerson: PersonLookup) {}

	/**
	 * Children of `person` matching the requested variants.
	 *
	 * Callers must specify `include`:
	 * - `'all'` — bio + adopted + step (the safe default for renderers)
	 * - `'bio'` — bio only (pedigree-style reports, GEDCOM bio export)
	 * - `'adopted'` — adopted only
	 * - `'step'` — step only
	 *
	 * Order: bio first, then adopted, then step. Each kind dedupes within
	 * its own slice; cross-kind dedupe is the caller's responsibility (a
	 * person could in principle appear in multiple arrays in malformed
	 * frontmatter, though the loader normally prevents that).
	 */
	getChildren(
		person: PersonNode,
		opts: { include: ChildInclude; sortByBirthDate?: DateService | null }
	): ChildQueryResult[] {
		const results: ChildQueryResult[] = [];

		if (opts.include === 'all' || opts.include === 'bio') {
			for (const crId of person.childrenCrIds) {
				const child = this.getPerson(crId);
				if (child) results.push({ person: child, kind: 'bio' });
			}
		}

		if (opts.include === 'all' || opts.include === 'adopted') {
			for (const crId of person.adoptedChildCrIds) {
				const child = this.getPerson(crId);
				if (child) results.push({ person: child, kind: 'adopted' });
			}
		}

		if (opts.include === 'all' || opts.include === 'step') {
			for (const crId of person.stepchildrenCrIds) {
				const child = this.getPerson(crId);
				if (child) results.push({ person: child, kind: 'step' });
			}
		}

		// Optional birth-date sort. When opt-in, callers get a merged-by-age
		// ordering across the requested variants (#586 / #587 / sweep), using
		// the universe-aware canonical-year compare so descending fictional
		// eras (BBY, etc.) order correctly alongside Gregorian dates. Persons
		// without a parseable birth date sink to the end, preserving their
		// relative order. Focal universe is read from `person.universe`.
		//
		// Within a year, ties are broken by lexicographic compare on the raw
		// birth-date string (#590). For ISO 8601 dates this orders by month,
		// then day, then time-of-day if specified (`YYYY-MM-DDTHH:MM`), so
		// twins and triplets with the same date but different birth times
		// sort deterministically. Final fallback is insertion order.
		if (opts.sortByBirthDate) {
			const dateService = opts.sortByBirthDate;
			const focalUniverse = person.universe;
			const yearOf = (p: PersonNode): number | null =>
				p.birthDate ? dateService.getCanonicalYear(p.birthDate, focalUniverse) : null;
			const decorated = results.map((item, index) => ({
				item,
				index,
				year: yearOf(item.person),
				birthDate: item.person.birthDate ?? ''
			}));
			decorated.sort((a, b) => {
				if (a.year === null && b.year === null) return a.index - b.index;
				if (a.year === null) return 1;
				if (b.year === null) return -1;
				if (a.year !== b.year) return a.year - b.year;
				if (a.birthDate !== b.birthDate) {
					return a.birthDate < b.birthDate ? -1 : 1;
				}
				return a.index - b.index;
			});
			return decorated.map(d => d.item);
		}

		return results;
	}

	/**
	 * Parents of `person` matching the requested variants.
	 *
	 * Bio parents are read from `fatherCrId`, `motherCrId`, and the
	 * gender-neutral `parentCrIds`. Adoptive parents from
	 * `adoptiveFatherCrId`, `adoptiveMotherCrId`, and `adoptiveParentCrIds`.
	 * Step parents from `stepfatherCrIds` and `stepmotherCrIds`.
	 *
	 * Order: bio first, then adoptive, then step.
	 */
	getParents(person: PersonNode, opts: { include: ParentInclude }): ParentQueryResult[] {
		const results: ParentQueryResult[] = [];

		if (opts.include === 'all' || opts.include === 'bio') {
			if (person.fatherCrId) {
				const father = this.getPerson(person.fatherCrId);
				if (father) results.push({ person: father, kind: 'bio' });
			}
			if (person.motherCrId) {
				const mother = this.getPerson(person.motherCrId);
				if (mother) results.push({ person: mother, kind: 'bio' });
			}
			for (const crId of person.parentCrIds) {
				const parent = this.getPerson(crId);
				if (parent) results.push({ person: parent, kind: 'bio' });
			}
		}

		if (opts.include === 'all' || opts.include === 'adoptive') {
			if (person.adoptiveFatherCrId) {
				const f = this.getPerson(person.adoptiveFatherCrId);
				if (f) results.push({ person: f, kind: 'adoptive' });
			}
			if (person.adoptiveMotherCrId) {
				const m = this.getPerson(person.adoptiveMotherCrId);
				if (m) results.push({ person: m, kind: 'adoptive' });
			}
			for (const crId of person.adoptiveParentCrIds) {
				const p = this.getPerson(crId);
				if (p) results.push({ person: p, kind: 'adoptive' });
			}
		}

		if (opts.include === 'all' || opts.include === 'step') {
			for (const crId of person.stepfatherCrIds) {
				const sf = this.getPerson(crId);
				if (sf) results.push({ person: sf, kind: 'step' });
			}
			for (const crId of person.stepmotherCrIds) {
				const sm = this.getPerson(crId);
				if (sm) results.push({ person: sm, kind: 'step' });
			}
		}

		return results;
	}

	/**
	 * Siblings of `person` matching the requested variants. Derived by
	 * walking each parent's children and filtering out `person` itself.
	 *
	 * Mirrors the existing semantics in `sibling-walker.ts`:
	 * - `'bio'` — children of bio parents, in bio array.
	 * - `'adopted'` — adopted children of bio parents, plus all children
	 *   (bio + adopted) of adoptive parents. Three sources merged per
	 *   `findAdoptiveSiblingCrIds` (#417 / #525 / #526).
	 * - `'step'` — children (any kind) of step-parents, plus stepchildren
	 *   of bio/adoptive parents.
	 */
	getSiblings(person: PersonNode, opts: { include: SiblingInclude }): SiblingQueryResult[] {
		const seen = new Set<string>();
		const results: SiblingQueryResult[] = [];

		const push = (crId: string, kind: SiblingKind) => {
			if (crId === person.crId || seen.has(crId)) return;
			const sibling = this.getPerson(crId);
			if (!sibling) return;
			seen.add(crId);
			results.push({ person: sibling, kind });
		};

		const bioParents = this.collectBioParentCrIds(person);
		const adoptiveParents = this.collectAdoptiveParentCrIds(person);
		const stepParents = this.collectStepParentCrIds(person);

		if (opts.include === 'all' || opts.include === 'bio') {
			for (const parentCrId of bioParents) {
				const parent = this.getPerson(parentCrId);
				if (!parent) continue;
				for (const childCrId of parent.childrenCrIds) {
					push(childCrId, 'bio');
				}
			}
		}

		if (opts.include === 'all' || opts.include === 'adopted') {
			// Adopted children of bio parents (someone else adopted into self's bio household)
			for (const parentCrId of bioParents) {
				const parent = this.getPerson(parentCrId);
				if (!parent) continue;
				for (const childCrId of parent.adoptedChildCrIds) {
					push(childCrId, 'adopted');
				}
			}
			// Bio + adopted children of adoptive parents
			for (const parentCrId of adoptiveParents) {
				const parent = this.getPerson(parentCrId);
				if (!parent) continue;
				for (const childCrId of parent.childrenCrIds) {
					push(childCrId, 'adopted');
				}
				for (const childCrId of parent.adoptedChildCrIds) {
					push(childCrId, 'adopted');
				}
			}
		}

		if (opts.include === 'all' || opts.include === 'step') {
			// Stepchildren of bio/adoptive parents
			for (const parentCrId of [...bioParents, ...adoptiveParents]) {
				const parent = this.getPerson(parentCrId);
				if (!parent) continue;
				for (const childCrId of parent.stepchildrenCrIds) {
					push(childCrId, 'step');
				}
			}
			// All children of step-parents
			for (const parentCrId of stepParents) {
				const parent = this.getPerson(parentCrId);
				if (!parent) continue;
				for (const childCrId of parent.childrenCrIds) {
					push(childCrId, 'step');
				}
				for (const childCrId of parent.adoptedChildCrIds) {
					push(childCrId, 'step');
				}
				for (const childCrId of parent.stepchildrenCrIds) {
					push(childCrId, 'step');
				}
			}
		}

		return results;
	}

	/**
	 * Spouses of `person`. Returns enhanced `SpouseRelationship[]` when
	 * the indexed/enhanced format is populated; otherwise synthesizes
	 * minimal records from the legacy `spouseCrIds` array. Callers can
	 * always read `personId` to get the spouse crId; metadata fields
	 * (marriageDate, marriageLocation, etc.) are optional and may be
	 * absent on legacy-format vaults.
	 */
	getSpouses(person: PersonNode): SpouseRelationship[] {
		if (person.spouses && person.spouses.length > 0) {
			return person.spouses.filter(s => !!s.personId);
		}
		return person.spouseCrIds.map(crId => ({ personId: crId }));
	}

	/**
	 * Walk descendants depth-first, calling `visit` for each person.
	 *
	 * Stops at adopted-child and stepchild boundaries by default — the
	 * adopted/step person is reported via `visit` (so renderers can
	 * place them) but their own descendants are NOT recursed. Opt in
	 * with `followAdopted: true` / `followStep: true`.
	 *
	 * Cycle detection via a shared visited set: a person is visited at
	 * most once per walk regardless of how many edges lead to them.
	 */
	walkDescendants(
		root: PersonNode,
		visit: VisitFn,
		opts: WalkDescendantsOptions = {}
	): void {
		const visited = new Set<string>();
		const recurse = (
			node: PersonNode,
			depth: number,
			kind: ChildKind | 'root'
		): void => {
			if (visited.has(node.crId)) return;
			visited.add(node.crId);
			visit(node, depth, kind);

			if (opts.maxGenerations && depth >= opts.maxGenerations) return;

			for (const crId of node.childrenCrIds) {
				const child = this.getPerson(crId);
				if (child) recurse(child, depth + 1, 'bio');
			}

			for (const crId of node.adoptedChildCrIds) {
				const child = this.getPerson(crId);
				if (!child || visited.has(child.crId)) continue;
				if (opts.followAdopted) {
					recurse(child, depth + 1, 'adopted');
				} else {
					// Report but don't recurse.
					visited.add(child.crId);
					visit(child, depth + 1, 'adopted');
				}
			}

			for (const crId of node.stepchildrenCrIds) {
				const child = this.getPerson(crId);
				if (!child || visited.has(child.crId)) continue;
				if (opts.followStep) {
					recurse(child, depth + 1, 'step');
				} else {
					visited.add(child.crId);
					visit(child, depth + 1, 'step');
				}
			}
		};

		recurse(root, 0, 'root');
	}

	/**
	 * Walk ancestors depth-first, calling `visit` for each person.
	 *
	 * Stops at adoptive-parent and step-parent boundaries by default.
	 * Opt in with `followAdoptive: true` / `followStep: true`. Same
	 * cycle-detection pattern as `walkDescendants`.
	 */
	walkAncestors(
		root: PersonNode,
		visit: VisitFn,
		opts: WalkAncestorsOptions = {}
	): void {
		const visited = new Set<string>();
		const recurse = (
			node: PersonNode,
			depth: number,
			kind: ParentKind | 'root'
		): void => {
			if (visited.has(node.crId)) return;
			visited.add(node.crId);
			visit(node, depth, kind);

			if (opts.maxGenerations && depth >= opts.maxGenerations) return;

			if (node.fatherCrId) {
				const f = this.getPerson(node.fatherCrId);
				if (f) recurse(f, depth + 1, 'bio');
			}
			if (node.motherCrId) {
				const m = this.getPerson(node.motherCrId);
				if (m) recurse(m, depth + 1, 'bio');
			}
			for (const crId of node.parentCrIds) {
				const p = this.getPerson(crId);
				if (p) recurse(p, depth + 1, 'bio');
			}

			const handleNonBioParent = (
				crId: string | undefined,
				kindLabel: ParentKind,
				follow: boolean | undefined
			): void => {
				if (!crId) return;
				const p = this.getPerson(crId);
				if (!p || visited.has(p.crId)) return;
				if (follow) {
					recurse(p, depth + 1, kindLabel);
				} else {
					visited.add(p.crId);
					visit(p, depth + 1, kindLabel);
				}
			};

			handleNonBioParent(node.adoptiveFatherCrId, 'adoptive', opts.followAdoptive);
			handleNonBioParent(node.adoptiveMotherCrId, 'adoptive', opts.followAdoptive);
			for (const crId of node.adoptiveParentCrIds) {
				handleNonBioParent(crId, 'adoptive', opts.followAdoptive);
			}
			for (const crId of node.stepfatherCrIds) {
				handleNonBioParent(crId, 'step', opts.followStep);
			}
			for (const crId of node.stepmotherCrIds) {
				handleNonBioParent(crId, 'step', opts.followStep);
			}
		};

		recurse(root, 0, 'root');
	}

	private collectBioParentCrIds(person: PersonNode): string[] {
		const ids: string[] = [];
		if (person.fatherCrId) ids.push(person.fatherCrId);
		if (person.motherCrId) ids.push(person.motherCrId);
		for (const crId of person.parentCrIds) ids.push(crId);
		return ids;
	}

	private collectAdoptiveParentCrIds(person: PersonNode): string[] {
		const ids: string[] = [];
		if (person.adoptiveFatherCrId) ids.push(person.adoptiveFatherCrId);
		if (person.adoptiveMotherCrId) ids.push(person.adoptiveMotherCrId);
		for (const crId of person.adoptiveParentCrIds) ids.push(crId);
		return ids;
	}

	private collectStepParentCrIds(person: PersonNode): string[] {
		return [...person.stepfatherCrIds, ...person.stepmotherCrIds];
	}
}
