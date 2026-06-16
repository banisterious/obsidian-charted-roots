import { describe, expect, it } from 'vitest';
import { detectNoteType, isNoteType } from '../src/utils/note-type-detection';

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
