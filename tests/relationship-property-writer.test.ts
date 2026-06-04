import { describe, expect, it } from 'vitest';
import {
	addFlatRelationship,
	normalizeToArray,
	removeFlatRelationship,
	computeCustomReciprocalRemovals
} from '../src/relationships/relationship-property-writer';

/**
 * Regression coverage for #419 — symmetric custom relationships now
 * auto-propagate to the target. The writer helper underpins both the
 * source-side add and the reciprocal mirror, so these tests fence the
 * add/skip/duplicate contract and the scalar-vs-array encoding that
 * callers round-trip to Obsidian frontmatter.
 */

describe('normalizeToArray', () => {
	it('null returns empty array', () => {
		expect(normalizeToArray(null)).toEqual([]);
	});

	it('undefined returns empty array', () => {
		expect(normalizeToArray(undefined)).toEqual([]);
	});

	it('empty string returns empty array', () => {
		expect(normalizeToArray('')).toEqual([]);
	});

	it('scalar string returns single-element array', () => {
		expect(normalizeToArray('[[Alice]]')).toEqual(['[[Alice]]']);
	});

	it('string array returns a copy with entries preserved', () => {
		expect(normalizeToArray(['[[Alice]]', '[[Bob]]'])).toEqual(['[[Alice]]', '[[Bob]]']);
	});

	it('non-string scalar is JSON-stringified', () => {
		expect(normalizeToArray(42)).toEqual(['42']);
	});

	it('array with non-string entries stringifies the non-strings', () => {
		expect(normalizeToArray(['[[Alice]]', 42])).toEqual(['[[Alice]]', '42']);
	});
});

describe('addFlatRelationship', () => {
	describe('add to empty frontmatter', () => {
		it('returns "added" and writes scalar encoding for single entry', () => {
			const fm: Record<string, unknown> = {};

			const result = addFlatRelationship(fm, 'twin', '[[Alice]]', 'cr_alice');

			expect(result).toBe('added');
			expect(fm.twin).toBe('[[Alice]]');
			expect(fm.twin_id).toBe('cr_alice');
		});
	});

	describe('add when scalar entry already present', () => {
		it('promotes both keys to arrays on the second add', () => {
			const fm: Record<string, unknown> = {
				twin: '[[Alice]]',
				twin_id: 'cr_alice'
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('added');
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]']);
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob']);
		});
	});

	describe('add when array already present', () => {
		it('appends to the existing arrays', () => {
			const fm: Record<string, unknown> = {
				twin: ['[[Alice]]', '[[Bob]]'],
				twin_id: ['cr_alice', 'cr_bob']
			};

			const result = addFlatRelationship(fm, 'twin', '[[Carol]]', 'cr_carol');

			expect(result).toBe('added');
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]', '[[Carol]]']);
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob', 'cr_carol']);
		});
	});

	describe('duplicate cr_id', () => {
		it('returns "duplicate" and does not mutate frontmatter (scalar case)', () => {
			const fm: Record<string, unknown> = {
				twin: '[[Alice]]',
				twin_id: 'cr_alice'
			};

			const result = addFlatRelationship(fm, 'twin', '[[Alice]]', 'cr_alice');

			expect(result).toBe('duplicate');
			expect(fm.twin).toBe('[[Alice]]');
			expect(fm.twin_id).toBe('cr_alice');
		});

		it('returns "duplicate" and does not mutate frontmatter (array case)', () => {
			const fm: Record<string, unknown> = {
				twin: ['[[Alice]]', '[[Bob]]'],
				twin_id: ['cr_alice', 'cr_bob']
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('duplicate');
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]']);
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob']);
		});
	});

	describe('unrelated keys', () => {
		it('preserves unrelated frontmatter entries', () => {
			const fm: Record<string, unknown> = {
				name: 'Alice',
				cr_id: 'cr_alice',
				spouse: '[[Bob]]',
				spouse_id: 'cr_bob'
			};

			addFlatRelationship(fm, 'twin', '[[Carol]]', 'cr_carol');

			expect(fm.name).toBe('Alice');
			expect(fm.cr_id).toBe('cr_alice');
			expect(fm.spouse).toBe('[[Bob]]');
			expect(fm.spouse_id).toBe('cr_bob');
			expect(fm.twin).toBe('[[Carol]]');
			expect(fm.twin_id).toBe('cr_carol');
		});
	});

	describe('mismatched-state input', () => {
		it('handles target key present without id key (legacy wikilink-only row)', () => {
			const fm: Record<string, unknown> = {
				twin: '[[Alice]]'
				// twin_id intentionally missing
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('added');
			// Source target gets promoted to array; id key starts fresh with
			// a single id, so it normalizes to scalar.
			expect(fm.twin).toEqual(['[[Alice]]', '[[Bob]]']);
			expect(fm.twin_id).toBe('cr_bob');
		});

		it('handles id key present without target key (legacy id-only row)', () => {
			const fm: Record<string, unknown> = {
				twin_id: 'cr_alice'
				// twin intentionally missing
			};

			const result = addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(result).toBe('added');
			expect(fm.twin).toBe('[[Bob]]');
			expect(fm.twin_id).toEqual(['cr_alice', 'cr_bob']);
		});
	});

	describe('different relationship types coexist', () => {
		it('adding twin does not touch the mentor pair', () => {
			const fm: Record<string, unknown> = {
				mentor: '[[Alice]]',
				mentor_id: 'cr_alice'
			};

			addFlatRelationship(fm, 'twin', '[[Bob]]', 'cr_bob');

			expect(fm.mentor).toBe('[[Alice]]');
			expect(fm.mentor_id).toBe('cr_alice');
			expect(fm.twin).toBe('[[Bob]]');
			expect(fm.twin_id).toBe('cr_bob');
		});
	});
});

/**
 * Coverage for #530 — the Add Relationship modal's "Notes (optional)" input
 * was being captured into a private field but never persisted to frontmatter
 * (silently discarded when the modal closed). Fix uses a parallel
 * `<type>_notes` flat array, index-aligned with the existing `<type>` and
 * `<type>_id` arrays. This matches the existing `<type>_from` / `<type>_to`
 * convention already read by `parseFlatRelationships` and respects the
 * project's flat-YAML-only preference.
 */
describe('addFlatRelationship — notes (#530)', () => {
	it('writes a scalar note alongside a single new relationship', () => {
		const fm: Record<string, unknown> = {};

		addFlatRelationship(fm, 'godparent', '[[Alice]]', 'cr_alice', { notes: 'Confirmed in 1990' });

		expect(fm.godparent).toBe('[[Alice]]');
		expect(fm.godparent_id).toBe('cr_alice');
		expect(fm.godparent_notes).toBe('Confirmed in 1990');
	});

	it('does NOT write a notes key when no note is provided and none exists yet', () => {
		const fm: Record<string, unknown> = {};

		addFlatRelationship(fm, 'godparent', '[[Alice]]', 'cr_alice');

		expect(fm.godparent).toBe('[[Alice]]');
		expect('godparent_notes' in fm).toBe(false);
	});

	it('trims whitespace around the note', () => {
		const fm: Record<string, unknown> = {};

		addFlatRelationship(fm, 'godparent', '[[Alice]]', 'cr_alice', { notes: '  Confirmed in 1990  ' });

		expect(fm.godparent_notes).toBe('Confirmed in 1990');
	});

	it('treats a whitespace-only note as no note', () => {
		const fm: Record<string, unknown> = {};

		addFlatRelationship(fm, 'godparent', '[[Alice]]', 'cr_alice', { notes: '   ' });

		expect('godparent_notes' in fm).toBe(false);
	});

	it('pads earlier note slots with empty strings when adding a note to a later target', () => {
		// Existing: two godparents, no notes recorded yet.
		const fm: Record<string, unknown> = {
			godparent: ['[[Alice]]', '[[Bob]]'],
			godparent_id: ['cr_alice', 'cr_bob']
		};

		addFlatRelationship(fm, 'godparent', '[[Carol]]', 'cr_carol', { notes: 'Carol confirmed in 2010' });

		// Targets/ids extended.
		expect(fm.godparent).toEqual(['[[Alice]]', '[[Bob]]', '[[Carol]]']);
		expect(fm.godparent_id).toEqual(['cr_alice', 'cr_bob', 'cr_carol']);
		// Notes array padded so Carol's note lands at index 2 (matching her target index).
		expect(fm.godparent_notes).toEqual(['', '', 'Carol confirmed in 2010']);
	});

	it('preserves earlier notes when adding a later note', () => {
		// Existing: one godparent with a note.
		const fm: Record<string, unknown> = {
			godparent: '[[Alice]]',
			godparent_id: 'cr_alice',
			godparent_notes: 'Alice note'
		};

		addFlatRelationship(fm, 'godparent', '[[Bob]]', 'cr_bob', { notes: 'Bob note' });

		expect(fm.godparent).toEqual(['[[Alice]]', '[[Bob]]']);
		expect(fm.godparent_notes).toEqual(['Alice note', 'Bob note']);
	});

	it('extends the notes array with empty string when adding a target with no note (alignment)', () => {
		// Existing godparent has a note; adding a second godparent without one.
		// The notes key must extend to keep index alignment with the targets.
		const fm: Record<string, unknown> = {
			godparent: '[[Alice]]',
			godparent_id: 'cr_alice',
			godparent_notes: 'Alice note'
		};

		addFlatRelationship(fm, 'godparent', '[[Bob]]', 'cr_bob');

		expect(fm.godparent).toEqual(['[[Alice]]', '[[Bob]]']);
		expect(fm.godparent_notes).toEqual(['Alice note', '']);
	});

	it('returns "duplicate" without modifying notes when the cr_id already exists', () => {
		const fm: Record<string, unknown> = {
			godparent: '[[Alice]]',
			godparent_id: 'cr_alice',
			godparent_notes: 'original'
		};

		const result = addFlatRelationship(fm, 'godparent', '[[Alice]]', 'cr_alice', { notes: 'overwrite attempt' });

		expect(result).toBe('duplicate');
		expect(fm.godparent_notes).toBe('original');
	});
});

/**
 * #675 — deleting a symmetric custom relationship from one note's YAML left the
 * reciprocal orphaned on the target note (it was written on add but never
 * cleaned up on delete), and the source's profile inferred it straight back.
 * `removeFlatRelationship` strips the orphaned reciprocal; `computeCustom
 * ReciprocalRemovals` decides which reciprocals a deletion should trigger.
 */
describe('removeFlatRelationship (#675)', () => {
	it('removes the only entry and deletes the now-empty keys', () => {
		const fm: Record<string, unknown> = { friend: '[[Alice]]', friend_id: 'cr_alice' };
		expect(removeFlatRelationship(fm, 'friend', 'cr_alice')).toBe('removed');
		expect(fm.friend).toBeUndefined();
		expect(fm.friend_id).toBeUndefined();
	});

	it('splices one entry from arrays and re-encodes the remainder as a scalar', () => {
		const fm: Record<string, unknown> = {
			friend: ['[[Alice]]', '[[Bob]]'],
			friend_id: ['cr_alice', 'cr_bob']
		};
		expect(removeFlatRelationship(fm, 'friend', 'cr_alice')).toBe('removed');
		expect(fm.friend).toBe('[[Bob]]');
		expect(fm.friend_id).toBe('cr_bob');
	});

	it('keeps every parallel companion array index-aligned on removal', () => {
		const fm: Record<string, unknown> = {
			friend: ['[[Alice]]', '[[Bob]]', '[[Cara]]'],
			friend_id: ['cr_alice', 'cr_bob', 'cr_cara'],
			friend_from: ['1990', '1991', '1992'],
			friend_to: ['', '', ''],
			friend_notes: ['met at school', 'cousin', 'neighbor']
		};
		expect(removeFlatRelationship(fm, 'friend', 'cr_bob')).toBe('removed');
		expect(fm.friend).toEqual(['[[Alice]]', '[[Cara]]']);
		expect(fm.friend_id).toEqual(['cr_alice', 'cr_cara']);
		expect(fm.friend_from).toEqual(['1990', '1992']);
		expect(fm.friend_notes).toEqual(['met at school', 'neighbor']);
	});

	it('returns "not-found" without mutating when the cr_id is absent (idempotent cascade stop)', () => {
		const fm: Record<string, unknown> = { friend: '[[Alice]]', friend_id: 'cr_alice' };
		const snapshot = { ...fm };
		expect(removeFlatRelationship(fm, 'friend', 'cr_nobody')).toBe('not-found');
		expect(fm).toEqual(snapshot);
	});

	it('removes every occurrence of a duplicated cr_id (corruption-tolerant)', () => {
		const fm: Record<string, unknown> = {
			friend: ['[[Alice]]', '[[Bob]]', '[[Alice]]'],
			friend_id: ['cr_alice', 'cr_bob', 'cr_alice']
		};
		expect(removeFlatRelationship(fm, 'friend', 'cr_alice')).toBe('removed');
		expect(fm.friend).toBe('[[Bob]]');
		expect(fm.friend_id).toBe('cr_bob');
	});
});

describe('computeCustomReciprocalRemovals (#675)', () => {
	const symmetric = new Set(['friend', 'sibling']);

	it('flags a target whose entry was removed from the note', () => {
		const previous = { friend: { targets: ['[[Alice]]', '[[Bob]]'], ids: ['cr_alice', 'cr_bob'] } };
		// Alice was deleted; Bob remains.
		const current = { friend: '[[Bob]]', friend_id: 'cr_bob' };
		expect(computeCustomReciprocalRemovals(previous, current, symmetric)).toEqual([
			{ typeId: 'friend', targetLink: '[[Alice]]', targetCrId: 'cr_alice' }
		]);
	});

	it('flags all entries when the whole field is deleted', () => {
		const previous = { friend: { targets: ['[[Alice]]', '[[Bob]]'], ids: ['cr_alice', 'cr_bob'] } };
		const current = {}; // entire friend field gone
		expect(computeCustomReciprocalRemovals(previous, current, symmetric)).toEqual([
			{ typeId: 'friend', targetLink: '[[Alice]]', targetCrId: 'cr_alice' },
			{ typeId: 'friend', targetLink: '[[Bob]]', targetCrId: 'cr_bob' }
		]);
	});

	it('flags nothing when entries are unchanged', () => {
		const previous = { friend: { targets: ['[[Alice]]'], ids: ['cr_alice'] } };
		const current = { friend: '[[Alice]]', friend_id: 'cr_alice' };
		expect(computeCustomReciprocalRemovals(previous, current, symmetric)).toEqual([]);
	});

	it('ignores types no longer considered symmetric', () => {
		const previous = { mentor: { targets: ['[[Alice]]'], ids: ['cr_alice'] } };
		const current = {}; // mentor deleted, but mentor is asymmetric → no reciprocal to strip
		expect(computeCustomReciprocalRemovals(previous, current, symmetric)).toEqual([]);
	});
});
