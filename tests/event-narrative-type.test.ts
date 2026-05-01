import { describe, expect, it } from 'vitest';
import {
	NARRATIVE_EVENT_TYPES,
	isNarrativeEventType,
} from '../src/events/types/event-types';

/**
 * #507 follow-up — fences the narrative-event-type membership list that
 * gates the Worldbuilding section's visibility in the Edit Event modal.
 * The dropdown's onChange uses `isNarrativeEventType` to reactively show/
 * hide the section when the user picks a different type, so adding or
 * removing a type from the list directly affects which events surface
 * the `Canonical event` toggle.
 */

describe('isNarrativeEventType (#507)', () => {
	it('returns true for the canonical narrative event types', () => {
		for (const type of NARRATIVE_EVENT_TYPES) {
			expect(isNarrativeEventType(type)).toBe(true);
		}
	});

	it('returns false for vital event types', () => {
		// Births, marriages, deaths, burials — vital records, not storytelling.
		expect(isNarrativeEventType('birth')).toBe(false);
		expect(isNarrativeEventType('marriage')).toBe(false);
		expect(isNarrativeEventType('death')).toBe(false);
		expect(isNarrativeEventType('burial')).toBe(false);
	});

	it('returns false for life event types', () => {
		// Residences, immigrations, occupations — life events, not storytelling.
		expect(isNarrativeEventType('residence')).toBe(false);
		expect(isNarrativeEventType('immigration')).toBe(false);
		expect(isNarrativeEventType('occupation')).toBe(false);
		expect(isNarrativeEventType('education')).toBe(false);
		expect(isNarrativeEventType('military')).toBe(false);
	});

	it('returns false for transfer / custom / unknown types', () => {
		expect(isNarrativeEventType('transfer')).toBe(false);
		expect(isNarrativeEventType('custom')).toBe(false);
		expect(isNarrativeEventType('')).toBe(false);
		expect(isNarrativeEventType('not-a-real-type')).toBe(false);
	});

	it('is case-sensitive (matches storage canonical-form values)', () => {
		// Frontmatter stores types in lowercase canonical form; capitalized
		// or display-formatted variants should not match.
		expect(isNarrativeEventType('Anecdote')).toBe(false);
		expect(isNarrativeEventType('BACKSTORY')).toBe(false);
	});
});
