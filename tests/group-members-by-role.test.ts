import { describe, expect, it } from 'vitest';
import { groupMembersByRole, NO_ROLE_HEADING } from '../src/organizations/utils/group-members-by-role';

/**
 * Coverage for the shared grouping helper used by both the dynamic
 * Members block (`charted-roots-members`) and the Organization Profile
 * View's Members section (#535). The helper is pure — these tests
 * fence its behavior directly without any DOM or Obsidian setup.
 */

interface TestEntry {
	role: string;
	name: string;
}

function entry(name: string, role = ''): TestEntry {
	return { name, role };
}

describe('groupMembersByRole', () => {
	it('returns an empty map for empty input', () => {
		const result = groupMembersByRole<TestEntry>([]);
		expect(result.size).toBe(0);
	});

	it('groups a single role into its own bucket', () => {
		const items = [entry('Alice', 'Founder'), entry('Bob', 'Founder')];
		const result = groupMembersByRole(items);
		expect([...result.keys()]).toEqual(['Founder']);
		expect(result.get('Founder')!.map(e => e.name)).toEqual(['Alice', 'Bob']);
	});

	it('orders multiple roles alphabetically when no roleOrder is provided', () => {
		const items = [
			entry('A', 'Captain'),
			entry('B', 'Bishop'),
			entry('C', 'Apostle')
		];
		const result = groupMembersByRole(items);
		expect([...result.keys()]).toEqual(['Apostle', 'Bishop', 'Captain']);
	});

	it('places pinned roles first in roleOrder sequence, then remaining alphabetically', () => {
		const items = [
			entry('A', 'Apostle'),
			entry('B', 'Bishop'),
			entry('C', 'Captain'),
			entry('D', 'Deacon')
		];
		// Pin Captain + Bishop, leaving Apostle + Deacon to fall through alphabetically.
		const result = groupMembersByRole(items, ['Captain', 'Bishop']);
		expect([...result.keys()]).toEqual(['Captain', 'Bishop', 'Apostle', 'Deacon']);
	});

	it('skips pinned roles that have no members', () => {
		const items = [entry('A', 'Apostle')];
		const result = groupMembersByRole(items, ['Captain', 'Apostle']);
		expect([...result.keys()]).toEqual(['Apostle']);
	});

	it('places the no-role bucket last regardless of roleOrder', () => {
		const items = [
			entry('A', 'Apostle'),
			entry('B', ''),
			entry('C', 'Captain')
		];
		const result = groupMembersByRole(items, ['Captain']);
		expect([...result.keys()]).toEqual(['Captain', 'Apostle', NO_ROLE_HEADING]);
		expect(result.get(NO_ROLE_HEADING)!.map(e => e.name)).toEqual(['B']);
	});

	it('preserves input order within each role bucket', () => {
		const items = [
			entry('Charlie', 'Founder'),
			entry('Alice', 'Founder'),
			entry('Bob', 'Founder')
		];
		const result = groupMembersByRole(items);
		// Helper does not re-sort within a group — caller's responsibility.
		expect(result.get('Founder')!.map(e => e.name)).toEqual(['Charlie', 'Alice', 'Bob']);
	});

	it('handles a mixed scenario: pinned + alphabetical + no-role together', () => {
		const items = [
			entry('A', 'Apostle'),
			entry('B', 'Bishop'),
			entry('C', 'Captain'),
			entry('D', ''),
			entry('E', 'Deacon')
		];
		const result = groupMembersByRole(items, ['Bishop', 'Apostle']);
		expect([...result.keys()]).toEqual(['Bishop', 'Apostle', 'Captain', 'Deacon', NO_ROLE_HEADING]);
	});

	it('treats undefined roleOrder same as omitted (alphabetical for all)', () => {
		const items = [entry('A', 'Bishop'), entry('B', 'Apostle')];
		const result = groupMembersByRole(items, undefined);
		expect([...result.keys()]).toEqual(['Apostle', 'Bishop']);
	});

	it('treats empty roleOrder same as omitted', () => {
		const items = [entry('A', 'Bishop'), entry('B', 'Apostle')];
		const result = groupMembersByRole(items, []);
		expect([...result.keys()]).toEqual(['Apostle', 'Bishop']);
	});
});
