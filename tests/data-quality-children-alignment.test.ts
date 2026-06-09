import { describe, expect, it } from 'vitest';
import { DataQualityService } from '../src/core/data-quality';
import type { PersonNode } from '../src/core/family-graph';

/**
 * #666 — a parent note's `children` / `children_id` arrays can fall out of
 * alignment, after which edits silently mis-pair or drop relationships. The
 * Data Quality repair rebuilds a flagged parent's children from the
 * authoritative reciprocal side (the people who list it as a parent), unioned
 * with any current child that still resolves, so it recovers missing children
 * and cleans the misleading aliases without dropping a legitimate link.
 */

function person(overrides: Partial<PersonNode> & { crId: string; basename: string }): PersonNode {
	return {
		name: overrides.name ?? overrides.basename,
		file: { path: `${overrides.basename}.md`, basename: overrides.basename } as unknown as PersonNode['file'],
		stepfatherCrIds: [],
		stepmotherCrIds: [],
		stepchildrenCrIds: [],
		adoptiveParentCrIds: [],
		adoptedChildCrIds: [],
		parentCrIds: [],
		spouseCrIds: [],
		childrenCrIds: [],
		...overrides
	} as PersonNode;
}

/**
 * Build a DataQualityService backed by in-memory mocks: a family graph that
 * returns `people`, a metadata cache that returns `frontmatter[path]`, and a
 * PersonIndex that resolves a wikilink basename to a cr_id.
 */
function makeService(
	people: PersonNode[],
	frontmatter: Record<string, Record<string, unknown>>
) {
	const byBasename = new Map(people.map(p => [p.file.basename, p.crId]));

	const app = {
		metadataCache: {
			getFileCache: (file: { path: string }) => {
				const fm = frontmatter[file.path];
				return fm ? { frontmatter: fm } : null;
			}
		},
		fileManager: {
			processFrontMatter: async (file: { path: string }, cb: (fm: Record<string, unknown>) => void) => {
				const fm = frontmatter[file.path] ?? (frontmatter[file.path] = {});
				cb(fm);
			}
		}
	};
	const familyGraph = {
		ensureCacheLoaded: () => undefined,
		getAllPeople: () => people
	};
	const personIndex = {
		getCrIdByWikilink: (wikilink: string): string | null => {
			const leaf = wikilink.includes('/') ? wikilink.split('/').pop()! : wikilink;
			return byBasename.get(leaf) ?? null;
		},
		hasAmbiguousFilename: () => false
	};

	const service = new DataQualityService(
		app as never,
		{} as never,
		familyGraph as never,
		{} as never
	);
	service.setPersonIndex(personIndex as never);
	return service;
}

describe('detectChildrenAlignmentRepairs (#666)', () => {
	// Adom's four real children all list him as father (reciprocal intact).
	const adom = person({ crId: 'adom', basename: 'Adom' });
	const ben = person({ crId: 'ben', basename: 'Ben', fatherCrId: 'adom' });
	const rebecca = person({ crId: 'rebecca', basename: 'Rebecca', fatherCrId: 'adom' });
	const leslie = person({ crId: 'leslie', basename: 'Leslie', fatherCrId: 'adom' });
	const sydny = person({ crId: 'sydny', basename: 'Sydny', fatherCrId: 'adom' });
	const people = [adom, ben, rebecca, leslie, sydny];

	it('recovers a dropped child, cleans aliases, and drops a broken link', () => {
		// Corrupted: 4 names vs 3 ids (length flag); aliases shifted; Rebecca
		// dropped from the id list; a stale "[[Ghost]]" link points nowhere.
		const fm = {
			'Adom.md': {
				cr_id: 'adom',
				children: ['[[Ben]]', '[[Leslie|Rebecca]]', '[[Sydny|Leslie]]', '[[Ghost]]'],
				children_id: ['ben', 'leslie', 'sydny']
			}
		};
		const service = makeService(people, fm);
		const repairs = service.detectChildrenAlignmentRepairs();

		expect(repairs).toHaveLength(1);
		const plan = repairs[0];
		expect(plan.finalChildren.map(c => c.crId)).toEqual(['ben', 'leslie', 'sydny', 'rebecca']);
		expect(plan.recovered.map(c => c.crId)).toEqual(['rebecca']);
		expect(plan.removedBroken).toEqual(['[[Ghost]]']);
		expect(plan.noReciprocal).toEqual([]);
	});

	it('keeps a one-directional child but flags it as having no reciprocal', () => {
		// Cyrus is listed under Adom's children but does NOT list Adom as a
		// parent. Must be kept (never silently dropped) yet surfaced.
		const cyrus = person({ crId: 'cyrus', basename: 'Cyrus' });
		const fm = {
			'Adom.md': {
				cr_id: 'adom',
				children: ['[[Ben]]', '[[Cyrus]]'],
				children_id: ['ben'] // length mismatch flags the note
			}
		};
		const service = makeService([...people, cyrus], fm);
		const plan = service.detectChildrenAlignmentRepairs()[0];

		expect(plan.finalChildren.map(c => c.crId)).toContain('cyrus');
		expect(plan.noReciprocal.map(c => c.crId)).toEqual(['cyrus']);
	});

	it('ignores a healthy aligned note', () => {
		const fm = {
			'Adom.md': { cr_id: 'adom', children: ['[[Ben]]', '[[Rebecca]]'], children_id: ['ben', 'rebecca'] }
		};
		const service = makeService(people, fm);
		expect(service.detectChildrenAlignmentRepairs()).toEqual([]);
	});

	it('flags an equal-length note whose only defect is a broken link (#666 follow-up)', () => {
		// The co-parent case that slipped through: children/children_id are
		// equal length and every *resolvable* name matches its paired id, so
		// neither the length nor the mis-pair check fires — yet a broken-link
		// name masks a real child (Sydny) reachable only via that name's paired
		// id. Detection must still flag the note, drop the broken link, and
		// recover the masked child from the reciprocal side.
		const fm = {
			'Adom.md': {
				cr_id: 'adom',
				// 4 names / 4 ids (equal). Ben/Rebecca/Leslie resolve and match;
				// the fourth name is broken while its paired id belongs to Sydny.
				children: ['[[Ben]]', '[[Rebecca]]', '[[Leslie]]', '[[Ghost]]'],
				children_id: ['ben', 'rebecca', 'leslie', 'sydny']
			}
		};
		const service = makeService(people, fm);
		const repairs = service.detectChildrenAlignmentRepairs();

		expect(repairs).toHaveLength(1);
		const plan = repairs[0];
		expect(plan.removedBroken).toEqual(['[[Ghost]]']);
		expect(plan.recovered.map(c => c.crId)).toEqual(['sydny']);
		expect(plan.finalChildren.map(c => c.crId)).toEqual(['ben', 'rebecca', 'leslie', 'sydny']);
	});
});

describe('applyChildrenAlignmentRepairs (#666)', () => {
	const adom = person({ crId: 'adom', basename: 'Adom' });
	const ben = person({ crId: 'ben', basename: 'Ben', fatherCrId: 'adom' });
	const rebecca = person({ crId: 'rebecca', basename: 'Rebecca', fatherCrId: 'adom' });
	const leslie = person({ crId: 'leslie', basename: 'Leslie', fatherCrId: 'adom' });
	const sydny = person({ crId: 'sydny', basename: 'Sydny', fatherCrId: 'adom' });
	const people = [adom, ben, rebecca, leslie, sydny];

	it('writes clean, aligned children and children_id', async () => {
		const fm: Record<string, Record<string, unknown>> = {
			'Adom.md': {
				cr_id: 'adom',
				children: ['[[Ben]]', '[[Leslie|Rebecca]]', '[[Sydny|Leslie]]', '[[Ghost]]'],
				children_id: ['ben', 'leslie', 'sydny']
			}
		};
		const service = makeService(people, fm);
		const repairs = service.detectChildrenAlignmentRepairs();
		const result = await service.applyChildrenAlignmentRepairs(repairs);

		expect(result.modified).toBe(1);
		expect(fm['Adom.md'].children).toEqual(['[[Ben]]', '[[Leslie]]', '[[Sydny]]', '[[Rebecca]]']);
		expect(fm['Adom.md'].children_id).toEqual(['ben', 'leslie', 'sydny', 'rebecca']);
	});

	it('collapses a single remaining child to scalar form', async () => {
		const fm: Record<string, Record<string, unknown>> = {
			'Adom.md': { cr_id: 'adom', children: ['[[Ben]]', '[[Ghost]]'], children_id: ['ben', 'ghost', 'extra'] }
		};
		// Only Ben lists Adom; Ghost is unresolvable. Result: just Ben (scalar).
		const service = makeService([adom, ben], fm);
		const repairs = service.detectChildrenAlignmentRepairs();
		await service.applyChildrenAlignmentRepairs(repairs);

		expect(fm['Adom.md'].children).toBe('[[Ben]]');
		expect(fm['Adom.md'].children_id).toBe('ben');
	});
});

describe('reconciles both parents of a shared child in one pass (#666 follow-up)', () => {
	// A co-parent pair sharing two children, both of whom list each parent.
	const adom = person({ crId: 'adom', basename: 'Adom' });
	const elena = person({ crId: 'elena', basename: 'Elena' });
	const ben = person({ crId: 'ben', basename: 'Ben', fatherCrId: 'adom', motherCrId: 'elena' });
	const liam = person({ crId: 'liam', basename: 'Liam', fatherCrId: 'adom', motherCrId: 'elena' });
	const people = [adom, elena, ben, liam];

	it('repairs a clean co-parent that is missing a child its partner recovers', () => {
		const fm = {
			// Adom is flagged on his own (a broken link + length mismatch); his
			// reciprocal recovers Liam.
			'Adom.md': { cr_id: 'adom', children: ['[[Ben]]', '[[Ghost]]'], children_id: ['ben'] },
			// Elena's columns are clean and aligned, but she is simply missing
			// Liam — she would never be flagged on her own.
			'Elena.md': { cr_id: 'elena', children: ['[[Ben]]'], children_id: ['ben'] }
		};
		const service = makeService(people, fm);
		const byId = new Map(service.detectChildrenAlignmentRepairs().map(r => [r.parent.crId, r]));

		expect(byId.has('adom')).toBe(true);
		// Reconciled in the same run despite her clean columns.
		expect(byId.has('elena')).toBe(true);
		expect(byId.get('elena')?.recovered.map(c => c.crId)).toContain('liam');
		expect(byId.get('elena')?.finalChildren.map(c => c.crId).sort()).toEqual(['ben', 'liam']);
	});

	it('does not touch a co-parent that is already consistent', () => {
		const fm = {
			'Adom.md': { cr_id: 'adom', children: ['[[Ben]]', '[[Ghost]]'], children_id: ['ben'] },
			// Elena already lists both children, aligned — nothing to reconcile.
			'Elena.md': { cr_id: 'elena', children: ['[[Ben]]', '[[Liam]]'], children_id: ['ben', 'liam'] }
		};
		const service = makeService(people, fm);
		const ids = service.detectChildrenAlignmentRepairs().map(r => r.parent.crId);

		expect(ids).toContain('adom');
		expect(ids).not.toContain('elena'); // no churn
	});
});
