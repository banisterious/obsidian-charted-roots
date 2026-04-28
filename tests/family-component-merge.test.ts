import { describe, expect, it } from 'vitest';
import {
	mergeFamilyComponentsByCollectionName,
	type FamilyComponent
} from '../src/core/family-component-merge';
import type { PersonNode } from '../src/core/family-graph';

/**
 * #491 — Person picker treated each disconnected graph component as a
 * separate "Family N" tab even when multiple components shared a
 * `collectionName` (user-named groups spanning unrelated characters,
 * like player groups or friend circles). The merge helper folds
 * same-collection components into a single tab while leaving unnamed
 * components alone, and preserves the largest-first sort contract from
 * `FamilyGraphService.findAllFamilyComponents`.
 */

function person(name: string, crId: string, birthDate?: string): PersonNode {
	// Minimal PersonNode shape — only the fields the merge helper reads.
	return { name, crId, birthDate } as PersonNode;
}

function component(
	rep: PersonNode,
	people: PersonNode[],
	collectionName?: string
): FamilyComponent {
	return {
		representative: rep,
		size: people.length,
		people,
		collectionName
	};
}

describe('mergeFamilyComponentsByCollectionName (#491)', () => {
	it('passes empty input through', () => {
		expect(mergeFamilyComponentsByCollectionName([])).toEqual([]);
	});

	it('passes unnamed components through unchanged', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const b = person('Bob', 'b1', '1905-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			component(a, [a]),
			component(b, [b])
		]);
		expect(result).toHaveLength(2);
		expect(result[0].people).toHaveLength(1);
		expect(result[1].people).toHaveLength(1);
	});

	it('merges two components with the same collectionName', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const b = person('Bob', 'b1', '1905-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			component(a, [a], 'player_group_alpha'),
			component(b, [b], 'player_group_alpha')
		]);
		expect(result).toHaveLength(1);
		expect(result[0].size).toBe(2);
		expect(result[0].people).toHaveLength(2);
		expect(result[0].collectionName).toBe('player_group_alpha');
	});

	it('keeps differently-named components separate', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const b = person('Bob', 'b1', '1905-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			component(a, [a], 'group_x'),
			component(b, [b], 'group_y')
		]);
		expect(result).toHaveLength(2);
		expect(result.map(c => c.collectionName)).toContain('group_x');
		expect(result.map(c => c.collectionName)).toContain('group_y');
	});

	it('mixes named and unnamed components correctly', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const b = person('Bob', 'b1', '1905-01-01');
		const c = person('Carol', 'c1', '1910-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			component(a, [a], 'group_x'),
			component(b, [b]),                      // unnamed, passes through
			component(c, [c], 'group_x')            // merges with first
		]);
		// Merged group_x (size 2) + unnamed Bob (size 1) = 2 entries
		expect(result).toHaveLength(2);
		const named = result.find(r => r.collectionName === 'group_x');
		expect(named?.size).toBe(2);
		expect(named?.people.map(p => p.name).sort()).toEqual(['Alice', 'Carol']);
	});

	it('sorts merged output by size descending (largest first)', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const b = person('Bob', 'b1', '1905-01-01');
		const c = person('Carol', 'c1', '1910-01-01');
		const d = person('Dave', 'd1', '1915-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			// Two unnamed components (size 1 each)
			component(a, [a]),
			component(b, [b]),
			// Three components in 'big' (sizes 1, 1, 1 → merges to size 3)
			component(c, [c], 'big'),
			component(d, [d], 'big'),
			component(person('Eve', 'e1'), [person('Eve', 'e1')], 'big')
		]);
		// 'big' (size 3) should come first
		expect(result[0].collectionName).toBe('big');
		expect(result[0].size).toBe(3);
	});

	it('picks the older birth date as representative when merging', () => {
		const elder = person('Alice', 'a1', '1850-01-01');
		const younger = person('Bob', 'b1', '1920-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			component(younger, [younger], 'group_x'),
			component(elder, [elder], 'group_x')
		]);
		expect(result[0].representative.crId).toBe('a1');
	});

	it('alphabetical tiebreak when birth dates match', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const z = person('Zelda', 'z1', '1900-01-01');
		const result = mergeFamilyComponentsByCollectionName([
			component(z, [z], 'group_x'),
			component(a, [a], 'group_x')
		]);
		expect(result[0].representative.name).toBe('Alice');
	});

	it('prefers a candidate with a birth date over one without', () => {
		const known = person('Alice', 'a1', '1900-01-01');
		const unknown = person('Bob', 'b1');
		const result = mergeFamilyComponentsByCollectionName([
			component(unknown, [unknown], 'group_x'),
			component(known, [known], 'group_x')
		]);
		expect(result[0].representative.crId).toBe('a1');
	});

	it('does not mutate the input components array', () => {
		const a = person('Alice', 'a1', '1900-01-01');
		const input = [component(a, [a], 'group_x')];
		const inputCopyBefore = [...input];
		mergeFamilyComponentsByCollectionName(input);
		expect(input).toEqual(inputCopyBefore);
	});
});
