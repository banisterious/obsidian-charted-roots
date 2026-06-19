import { describe, expect, it } from 'vitest';
import { detectNoteType, isNoteType, isPersonNote } from '../src/utils/note-type-detection';

/**
 * #738 — adding a member to an organization silently failed when the person
 * note also carried a foreign `type` key (e.g. `type: character` from the
 * user's own data model). The org-side member scan used an ad-hoc guard that
 * excluded any note whose `type` wasn't "person", wiping the org's members.
 *
 * The fix routes the scan through the shared detection, where `cr_type` is the
 * authoritative primary property and `type` is only a fallback. These tests
 * lock that priority so the regression can't return.
 */
describe('note-type detection — cr_type priority over legacy type (#738)', () => {
	it('treats a cr_type: person note as a person even with a foreign type key', () => {
		const fm = { cr_type: 'person', type: 'character' };
		expect(detectNoteType(fm)).toBe('person');
		expect(isNoteType(fm, 'person')).toBe(true);
	});

	it('detects person from cr_type alone', () => {
		expect(detectNoteType({ cr_type: 'person' })).toBe('person');
	});

	it('falls back to legacy type: person when cr_type is absent', () => {
		expect(detectNoteType({ type: 'person' })).toBe('person');
		expect(isNoteType({ type: 'person' }, 'person')).toBe(true);
	});

	it('does not treat a non-CR type value as a person when cr_type is absent', () => {
		expect(detectNoteType({ type: 'character' })).toBeNull();
		expect(isNoteType({ type: 'character' }, 'person')).toBe(false);
	});

	it('keeps cr_type authoritative for other entity types too', () => {
		expect(detectNoteType({ cr_type: 'organization', type: 'character' })).toBe('organization');
		expect(isNoteType({ cr_type: 'organization', type: 'character' }, 'person')).toBe(false);
	});
});

/**
 * #742 — the org member scan must use isPersonNote, not isNoteType. The org's
 * member list is built by scanning person notes; a person note with a `cr_id`
 * but no explicit `cr_type`/`type` (a long-supported legacy shape) was dropped
 * by the stricter isNoteType, so its org memberships vanished. isPersonNote
 * honours the cr_id heuristic while still respecting cr_type when present.
 */
describe('isPersonNote — untyped person notes (#742 / #738)', () => {
	it('treats a cr_id note with membership fields and no cr_type as a person (#742)', () => {
		const fm = {
			cr_id: 'prd-569-bhk-516',
			name: 'Lucas Halo',
			membership_orgs: ['[[Aetherion Corporation]]'],
			membership_org_ids: ['aetherion-corp']
		};
		expect(isPersonNote(fm)).toBe(true);
		// The stricter check that caused the regression returns false here.
		expect(isNoteType(fm, 'person')).toBe(false);
	});

	it('still treats cr_type: person as a person even with a foreign type (#738)', () => {
		expect(isPersonNote({ cr_id: 'x', cr_type: 'person', type: 'character' })).toBe(true);
	});

	it('excludes a non-person note', () => {
		expect(isPersonNote({ cr_id: 'o1', cr_type: 'organization' })).toBe(false);
	});

	it('excludes an untyped cr_id note that has another entity\'s properties', () => {
		// cr_id but no type, with place-distinguishing props → not a person.
		expect(isPersonNote({ cr_id: 'p1', place_category: 'real' })).toBe(false);
	});
});
