import { describe, expect, it, vi } from 'vitest';
import {
	extractName,
	loadRelationships,
	resolveCrIdToName,
	resolveNameToCrId,
	type PersonLookupPool
} from '../src/plugin/relationship-loader';

/**
 * Regression coverage for #410 (and its parent #403) — the Edit Person
 * modal's relationship load path. Focuses on the three gaps that produced
 * silent relationship drops:
 *   Gap A: name-resolver was basename-blind.
 *   Gap B: legacy array fallback was all-or-nothing, losing unresolved
 *          entries in mixed-ID states.
 *   Gap C: unresolvable wikilinks were dropped entirely at save.
 *
 * #415 extends this with IDs-only fallback — frontmatter that carries
 * `*_id` arrays with no paired wikilink array used to load as empty
 * (then save wiped the id array). The inverse of Gap B.
 */

function pool(
	people: Array<{ crId: string; name: string; basename: string }>
): PersonLookupPool {
	return {
		getAllPeople: () =>
			people.map(p => ({
				crId: p.crId,
				name: p.name,
				file: { basename: p.basename }
			}))
	};
}

describe('extractName', () => {
	it('unwraps [[Name]]', () => {
		expect(extractName('[[Alice]]')).toBe('Alice');
	});

	it('unwraps quoted "[[Name]]"', () => {
		expect(extractName('"[[Alice]]"')).toBe('Alice');
	});

	it('preserves pipe-alias stems: [[basename|Display]] → "basename|Display"', () => {
		// The resolver downstream splits on `|` to get the basename stem.
		expect(extractName('[[mildred-barrow|Mildred Barrow]]')).toBe('mildred-barrow|Mildred Barrow');
	});

	it('returns a bare string unchanged when not wrapped', () => {
		expect(extractName('Alice')).toBe('Alice');
	});

	it.each([undefined, null, ''])('returns undefined for %s', (v) => {
		expect(extractName(v)).toBeUndefined();
	});
});

describe('resolveNameToCrId — Gap A (basename-aware lookup)', () => {
	const wife = { crId: 'wife-id', name: 'Mildred Ann Barrow', basename: 'mildred-barrow' };

	it('matches by the person `name` field', () => {
		expect(resolveNameToCrId('Mildred Ann Barrow', pool([wife]))).toBe('wife-id');
	});

	it('matches by the note basename when `name` differs (#410 Gap A)', () => {
		expect(resolveNameToCrId('mildred-barrow', pool([wife]))).toBe('wife-id');
	});

	it('strips the alias from [[basename|Display]] before matching', () => {
		// extractName returns "mildred-barrow|Display"; resolver splits on `|`.
		expect(resolveNameToCrId('mildred-barrow|Display', pool([wife]))).toBe('wife-id');
	});

	it('returns undefined for an unknown wikilink', () => {
		expect(resolveNameToCrId('nobody', pool([wife]))).toBeUndefined();
	});

	it('returns undefined and reports ambiguity when multiple people match', () => {
		const onAmbiguous = vi.fn();
		const people = pool([
			{ crId: 'a', name: 'Alice', basename: 'alice-1' },
			{ crId: 'b', name: 'Alice', basename: 'alice-2' }
		]);
		expect(resolveNameToCrId('Alice', people, onAmbiguous)).toBeUndefined();
		expect(onAmbiguous).toHaveBeenCalledWith('Alice', 2);
	});
});

describe('resolveCrIdToName — #415 inverse resolver', () => {
	const alice = { crId: 'alice-id', name: 'Alice', basename: 'alice' };
	const bob = { crId: 'bob-id', name: 'Bob Jones', basename: 'bob-jones' };

	it('resolves a known crId to the stored name', () => {
		expect(resolveCrIdToName('alice-id', pool([alice, bob]))).toBe('Alice');
	});

	it('returns undefined for an unknown crId', () => {
		expect(resolveCrIdToName('ghost-id', pool([alice, bob]))).toBeUndefined();
	});

	it('returns undefined for empty input', () => {
		expect(resolveCrIdToName('', pool([alice]))).toBeUndefined();
	});

	it('trims whitespace before lookup', () => {
		expect(resolveCrIdToName('  alice-id  ', pool([alice]))).toBe('Alice');
	});
});

describe('loadRelationships — IDs-only fallback (#415)', () => {
	const child1 = { crId: 'child1-id', name: 'Child One', basename: 'child-one' };
	const child2 = { crId: 'child2-id', name: 'Child Two', basename: 'child-two' };
	const child3 = { crId: 'child3-id', name: 'Child Three', basename: 'child-three' };

	it('children_id only, no children wikilink → populated from graph', () => {
		// DigitalDreamn's Benjymn repro: 5 children_id entries, no `children:` array.
		// Pre-fix: both arrays empty, save wiped children_id. Post-fix: names are
		// resolved from the graph and save heals the frontmatter.
		const r = loadRelationships(
			{ children_id: ['child1-id', 'child2-id', 'child3-id'] },
			pool([child1, child2, child3])
		);
		expect(r.childNames).toEqual(['Child One', 'Child Two', 'Child Three']);
		expect(r.childIds).toEqual(['child1-id', 'child2-id', 'child3-id']);
	});

	it('children_id scalar (single id) coerces to array and resolves', () => {
		const r = loadRelationships(
			{ children_id: 'child1-id' },
			pool([child1])
		);
		expect(r.childNames).toEqual(['Child One']);
		expect(r.childIds).toEqual(['child1-id']);
	});

	it('spouse_id only, no spouse wikilink → populated from graph', () => {
		const wife = { crId: 'wife-id', name: 'Wife One', basename: 'wife-one' };
		const r = loadRelationships(
			{ spouse_id: ['wife-id'] },
			pool([wife])
		);
		expect(r.spouseNames).toEqual(['Wife One']);
		expect(r.spouseIds).toEqual(['wife-id']);
	});

	it('parents_id only, no parents wikilink → populated from graph', () => {
		const parent = { crId: 'p-id', name: 'Parent', basename: 'parent' };
		const r = loadRelationships(
			{ parents_id: ['p-id'] },
			pool([parent])
		);
		expect(r.parentNames).toEqual(['Parent']);
		expect(r.parentIds).toEqual(['p-id']);
	});

	it('IDs-only with orphan id (not in graph) → uses id as placeholder name', () => {
		// Pragmatic edge-case behavior: preserving the id is more important than
		// a pristine wikilink. The placeholder surfaces the orphan to the user
		// for cleanup rather than silently dropping it or writing `[[]]`.
		const r = loadRelationships(
			{ children_id: ['child1-id', 'orphan-id'] },
			pool([child1])
		);
		expect(r.childNames).toEqual(['Child One', 'orphan-id']);
		expect(r.childIds).toEqual(['child1-id', 'orphan-id']);
	});

	it('empty children_id → no entries (does not invent phantoms)', () => {
		const r = loadRelationships(
			{ children_id: [] },
			pool([child1])
		);
		expect(r.childNames).toEqual([]);
		expect(r.childIds).toEqual([]);
	});

	it('children_id with falsy entries are skipped', () => {
		const r = loadRelationships(
			{ children_id: ['child1-id', '', null, 'child2-id'] as unknown as string[] },
			pool([child1, child2])
		);
		expect(r.childNames).toEqual(['Child One', 'Child Two']);
		expect(r.childIds).toEqual(['child1-id', 'child2-id']);
	});

	it('wikilink array present (even empty) → does not trigger IDs-only fallback', () => {
		// Guard against double-processing: if `children` is present as an empty
		// array, the wikilink walk runs (and produces nothing), and the IDs-only
		// path stays dormant. Avoids producing phantom names for an explicitly
		// empty children list on a note whose children_id was left stale.
		const r = loadRelationships(
			{ children: [], children_id: ['child1-id'] },
			pool([child1])
		);
		expect(r.childNames).toEqual([]);
		expect(r.childIds).toEqual([]);
	});

	it('both arrays present → normal wikilink-first path, fallback stays dormant', () => {
		const r = loadRelationships(
			{
				children: ['[[Child One]]', '[[Child Two]]'],
				children_id: ['child1-id', 'child2-id']
			},
			pool([child1, child2])
		);
		expect(r.childNames).toEqual(['Child One', 'Child Two']);
		expect(r.childIds).toEqual(['child1-id', 'child2-id']);
	});
});

describe('loadRelationships — legacy spouse array', () => {
	const wife1 = { crId: 'wife1-id', name: 'Wife One', basename: 'wife-one' };
	const wife2 = { crId: 'wife2-id', name: 'Wife Two', basename: 'wife-two' };

	it('no spouse data → empty arrays', () => {
		const r = loadRelationships({}, pool([]));
		expect(r.spouseNames).toEqual([]);
		expect(r.spouseIds).toEqual([]);
	});

	it('all wikilinks, no `_id` at all → per-entry fallback resolves all (#403)', () => {
		const r = loadRelationships(
			{ spouse: ['[[Wife One]]', '[[Wife Two]]'] },
			pool([wife1, wife2])
		);
		expect(r.spouseNames).toEqual(['Wife One', 'Wife Two']);
		expect(r.spouseIds).toEqual(['wife1-id', 'wife2-id']);
	});

	it('mixed state: one `_id` present, another missing → both resolve (#410 Gap B)', () => {
		const r = loadRelationships(
			{
				spouse: ['[[Wife One]]', '[[Wife Two]]'],
				spouse_id: ['wife1-id']
			},
			pool([wife1, wife2])
		);
		expect(r.spouseNames).toEqual(['Wife One', 'Wife Two']);
		expect(r.spouseIds).toEqual(['wife1-id', 'wife2-id']);
	});

	it('wikilink uses basename that differs from `name` → Gap A fallback resolves', () => {
		// `name` in frontmatter: "Mildred Ann Barrow"; wikilink stem: "mildred-barrow"
		const wife = { crId: 'wife-id', name: 'Mildred Ann Barrow', basename: 'mildred-barrow' };
		const r = loadRelationships(
			{ spouse: '[[mildred-barrow]]' },
			pool([wife])
		);
		expect(r.spouseNames).toEqual(['mildred-barrow']);
		expect(r.spouseIds).toEqual(['wife-id']);
	});

	it('unresolvable wikilink → preserved with empty crId (#410 Gap C)', () => {
		const r = loadRelationships(
			{ spouse: '[[Ghost Spouse]]' },
			pool([])
		);
		expect(r.spouseNames).toEqual(['Ghost Spouse']);
		expect(r.spouseIds).toEqual(['']);
	});

	it('mix of resolvable + unresolvable → aligned arrays with empty slot for unresolvable', () => {
		const r = loadRelationships(
			{ spouse: ['[[Wife One]]', '[[Ghost]]', '[[Wife Two]]'] },
			pool([wife1, wife2])
		);
		expect(r.spouseNames).toEqual(['Wife One', 'Ghost', 'Wife Two']);
		expect(r.spouseIds).toEqual(['wife1-id', '', 'wife2-id']);
	});

	it('single spouse (not array) → handled as one-entry array', () => {
		const r = loadRelationships(
			{ spouse: '[[Wife One]]', spouse_id: 'wife1-id' },
			pool([wife1])
		);
		expect(r.spouseNames).toEqual(['Wife One']);
		expect(r.spouseIds).toEqual(['wife1-id']);
	});

	it('honors the direct `_id` at matching index over fallback resolution', () => {
		// Even though name resolves, prefer the provided id.
		const r = loadRelationships(
			{ spouse: '[[Wife One]]', spouse_id: 'explicit-id' },
			pool([wife1])
		);
		expect(r.spouseIds).toEqual(['explicit-id']);
	});
});

describe('loadRelationships — indexed spouse format', () => {
	const wife1 = { crId: 'wife1-id', name: 'Wife One', basename: 'wife-one' };
	const wife2 = { crId: 'wife2-id', name: 'Wife Two', basename: 'wife-two' };

	it('loads indexed spouse1/spouse1_id with metadata', () => {
		const r = loadRelationships(
			{
				spouse1: '[[Wife One]]',
				spouse1_id: 'wife1-id',
				spouse1_marriage_date: '1850-06-15',
				spouse1_marriage_location: 'Somewhere'
			},
			pool([wife1])
		);
		expect(r.hasIndexedSpouses).toBe(true);
		expect(r.spouseMetadata).toHaveLength(1);
		expect(r.spouseMetadata[0]).toMatchObject({
			crId: 'wife1-id',
			name: 'Wife One',
			marriageDate: '1850-06-15',
			marriageLocation: 'Somewhere'
		});
	});

	it('per-index fallback resolves spouseN when spouseN_id is missing', () => {
		const r = loadRelationships(
			{ spouse1: '[[Wife One]]' },
			pool([wife1])
		);
		expect(r.hasIndexedSpouses).toBe(true);
		expect(r.spouseMetadata[0].crId).toBe('wife1-id');
	});

	it('indexed format skips the legacy-array path entirely', () => {
		const r = loadRelationships(
			{
				spouse1: '[[Wife One]]',
				spouse1_id: 'wife1-id',
				// These legacy keys should be ignored because indexed format wins.
				spouse: '[[Should Be Ignored]]',
				spouse_id: 'ignored-id'
			},
			pool([wife1, wife2])
		);
		expect(r.spouseNames).toEqual(['Wife One']);
		expect(r.spouseIds).toEqual(['wife1-id']);
	});
});

describe('loadRelationships — children + parents parallel behavior', () => {
	const child = { crId: 'child-id', name: 'Child One', basename: 'child-one' };
	const _parent = { crId: 'parent-id', name: 'Parent One', basename: 'parent-one' };
	// `pool([child, parent])` was used by an earlier test in this describe block
	// that's been superseded by the per-test setups below; keep the helper call
	// out so the unused-vars rule stays clean.

	it('children: mixed-ID state resolves via per-entry fallback (#410 Gap B)', () => {
		const child2 = { crId: 'child2-id', name: 'Child Two', basename: 'child-two' };
		const r = loadRelationships(
			{
				children: ['[[Child One]]', '[[Child Two]]'],
				children_id: ['child-id']
			},
			pool([child, child2])
		);
		expect(r.childNames).toEqual(['Child One', 'Child Two']);
		expect(r.childIds).toEqual(['child-id', 'child2-id']);
	});

	it('children: unresolvable wikilinks preserved with empty crId', () => {
		const r = loadRelationships(
			{ children: '[[Ghost Child]]' },
			pool([])
		);
		expect(r.childNames).toEqual(['Ghost Child']);
		expect(r.childIds).toEqual(['']);
	});

	it('parents: basename-only wikilink resolves via Gap A fallback', () => {
		const parentByBasename = {
			crId: 'p-id',
			name: 'Proper Name',
			basename: 'parent-basename'
		};
		const r = loadRelationships(
			{ parents: '[[parent-basename]]' },
			pool([parentByBasename])
		);
		expect(r.parentNames).toEqual(['parent-basename']);
		expect(r.parentIds).toEqual(['p-id']);
	});
});

describe('loadRelationships — singleton father/mother/adoptive', () => {
	const dad = { crId: 'dad-id', name: 'Dad Name', basename: 'dad-basename' };

	it('uses father_id directly when present', () => {
		const r = loadRelationships(
			{ father: '[[Dad Name]]', father_id: 'explicit-dad-id' },
			pool([dad])
		);
		expect(r.fatherName).toBe('Dad Name');
		expect(r.fatherId).toBe('explicit-dad-id');
	});

	it('falls back to name resolution when father_id missing', () => {
		const r = loadRelationships(
			{ father: '[[Dad Name]]' },
			pool([dad])
		);
		expect(r.fatherId).toBe('dad-id');
	});

	it('falls back by basename when wikilink stem differs from `name` (#410 Gap A)', () => {
		const r = loadRelationships(
			{ father: '[[dad-basename]]' },
			pool([dad])
		);
		expect(r.fatherId).toBe('dad-id');
	});

	it('no father info → undefined', () => {
		const r = loadRelationships({}, pool([]));
		expect(r.fatherName).toBeUndefined();
		expect(r.fatherId).toBeUndefined();
	});

	it('mother, adoptive_father, adoptive_mother follow the same pattern', () => {
		const mom = { crId: 'mom-id', name: 'Mom', basename: 'mom' };
		const afath = { crId: 'af-id', name: 'AFather', basename: 'afather' };
		const amoth = { crId: 'am-id', name: 'AMother', basename: 'amother' };
		const r = loadRelationships(
			{
				mother: '[[Mom]]',
				adoptive_father: '[[AFather]]',
				adoptive_mother: '[[AMother]]'
			},
			pool([mom, afath, amoth])
		);
		expect(r.motherId).toBe('mom-id');
		expect(r.adoptiveFatherId).toBe('af-id');
		expect(r.adoptiveMotherId).toBe('am-id');
	});
});

describe('loadRelationships — step-parent singletons (#429)', () => {
	const stepDad = { crId: 'step-dad-id', name: 'Step Dad', basename: 'step-dad' };
	const stepMom = { crId: 'step-mom-id', name: 'Step Mom', basename: 'step-mom' };

	it('no step-parent data → both undefined', () => {
		const r = loadRelationships({}, pool([]));
		expect(r.stepfatherName).toBeUndefined();
		expect(r.stepfatherId).toBeUndefined();
		expect(r.stepmotherName).toBeUndefined();
		expect(r.stepmotherId).toBeUndefined();
	});

	it('uses stepfather_id directly when present', () => {
		const r = loadRelationships(
			{ stepfather: '[[Step Dad]]', stepfather_id: 'explicit-step-dad-id' },
			pool([stepDad])
		);
		expect(r.stepfatherName).toBe('Step Dad');
		expect(r.stepfatherId).toBe('explicit-step-dad-id');
	});

	it('falls back to name resolution when stepfather_id missing', () => {
		const r = loadRelationships(
			{ stepfather: '[[Step Dad]]' },
			pool([stepDad])
		);
		expect(r.stepfatherId).toBe('step-dad-id');
	});

	it('falls back by basename when stepfather wikilink stem differs from `name`', () => {
		const r = loadRelationships(
			{ stepfather: '[[step-dad]]' },
			pool([stepDad])
		);
		expect(r.stepfatherId).toBe('step-dad-id');
	});

	it('stepmother follows the same pattern as stepfather', () => {
		const r = loadRelationships(
			{ stepmother: '[[Step Mom]]' },
			pool([stepMom])
		);
		expect(r.stepmotherName).toBe('Step Mom');
		expect(r.stepmotherId).toBe('step-mom-id');
	});

	it('step-parent + adoptive-parent coexist without interfering', () => {
		// Regression guard: the #429 fix added step-parent alongside the
		// existing adoptive-parent extraction. Loading a note that sets both
		// must populate both without losing either.
		const afath = { crId: 'af-id', name: 'AFather', basename: 'afather' };
		const r = loadRelationships(
			{
				stepfather: '[[Step Dad]]',
				stepfather_id: 'step-dad-id',
				adoptive_father: '[[AFather]]',
				adoptive_father_id: 'af-id'
			},
			pool([stepDad, afath])
		);
		expect(r.stepfatherId).toBe('step-dad-id');
		expect(r.adoptiveFatherId).toBe('af-id');
	});
});

/**
 * #666 — a parent note's `children` (names) and `children_id` (ids) lists are
 * parallel and positionally paired. When one id is silently dropped (e.g. a
 * child link left in path form during earlier testing never paired an id),
 * the lists fall out of step. The old loader padded the shorter id array by
 * position, manufacturing an equal-length-but-misaligned pair that defeated
 * the writer's mismatch guard — so the next save rewrote every link past the
 * gap as `[[next person's note|this person's old name]]`.
 *
 * The loader now: (a) resolves path-form wikilinks to their basename, and
 * (b) when the two arrays disagree in length, pairs each link with its OWN
 * resolved identity instead of trusting position.
 */
describe('resolveNameToCrId — path-form links (#666)', () => {
	const rebecca = { crId: 'rebecca-id', name: 'Rebecca Wilkin', basename: 'Rebecca Wilkin' };

	it('resolves a path-form target via its final segment', () => {
		expect(resolveNameToCrId('Charted Roots/People/Rebecca Wilkin', pool([rebecca]))).toBe('rebecca-id');
	});

	it('still resolves a plain (non-path) name', () => {
		expect(resolveNameToCrId('Rebecca Wilkin', pool([rebecca]))).toBe('rebecca-id');
	});

	it('returns undefined when the leaf is ambiguous across folders', () => {
		const dup = { crId: 'other-id', name: 'Rebecca Wilkin', basename: 'Rebecca Wilkin' };
		expect(resolveNameToCrId('Archive/Rebecca Wilkin', pool([rebecca, dup]))).toBeUndefined();
	});
});

describe('loadAlignedArray children — desync handling (#666)', () => {
	const people = [
		{ crId: 'ben-id', name: 'Ben Wilkin', basename: 'Ben Wilkin' },
		{ crId: 'aaron-id', name: 'Aaron Wilkin', basename: 'Aaron Wilkin' },
		{ crId: 'rebecca-id', name: 'Rebecca Wilkin', basename: 'Rebecca Wilkin' },
		{ crId: 'leslie-id', name: 'Leslie Wilkin', basename: 'Leslie Wilkin' },
		{ crId: 'sydny-id', name: 'Sydny Wilkin', basename: 'Sydny Wilkin' }
	];

	it('does not cross-wire names to ids when an id is missing (lists out of step)', () => {
		// Rebecca (in path form) has no entry in children_id, so the lists are
		// 5 names vs 4 ids. Each name must still pair with its OWN id.
		const r = loadRelationships(
			{
				children: [
					'[[Ben Wilkin]]',
					'[[Aaron Wilkin]]',
					'[[Charted Roots/People/Rebecca Wilkin]]',
					'[[Leslie Wilkin]]',
					'[[Sydny Wilkin]]'
				],
				children_id: ['ben-id', 'aaron-id', 'leslie-id', 'sydny-id']
			},
			pool(people)
		);
		expect(r.childNames).toEqual([
			'Ben Wilkin',
			'Aaron Wilkin',
			'Charted Roots/People/Rebecca Wilkin',
			'Leslie Wilkin',
			'Sydny Wilkin'
		]);
		// Correctly paired (and Rebecca's dropped id recovered via the path
		// leaf) — NOT the shifted [ben, aaron, leslie, sydny, ''] of the bug.
		expect(r.childIds).toEqual(['ben-id', 'aaron-id', 'rebecca-id', 'leslie-id', 'sydny-id']);
	});

	it('leaves a genuinely unresolvable (stale) link with an empty id rather than borrowing the next one', () => {
		// "Ghost Wilkin" was renamed away and no longer resolves; on a length
		// mismatch it must get '' rather than the following entry's id.
		const r = loadRelationships(
			{
				children: ['[[Ben Wilkin]]', '[[Ghost Wilkin]]', '[[Leslie Wilkin]]'],
				children_id: ['ben-id', 'leslie-id']
			},
			pool(people)
		);
		expect(r.childIds).toEqual(['ben-id', '', 'leslie-id']);
	});

	it('keeps positional pairing when the lists are the same length (rename-safe path)', () => {
		// Aligned lengths: trust the id at each position even if the link text
		// would resolve elsewhere — this is what lets ids survive renames.
		const r = loadRelationships(
			{ children: ['[[Ben Wilkin]]'], children_id: ['leslie-id'] },
			pool(people)
		);
		expect(r.childIds).toEqual(['leslie-id']);
	});
});
