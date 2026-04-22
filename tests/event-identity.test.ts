import { describe, expect, it } from 'vitest';
import {
	computeEventIdentity,
	extractEventIdentityFromFrontmatter
} from '../src/events/event-identity';

/**
 * Regression coverage for #414 — the Life Events Migration's
 * semantic-identity dedup helper. Two equivalent events (same persons,
 * same type, same date) must produce the same key regardless of
 * wikilink syntax, argument order, or date encoding. Non-equivalent
 * events (different refinement, different type, partial data) must
 * produce different keys so the migration never silently merges them.
 *
 * The helper is pure, so tests exercise it directly without an
 * Obsidian vault.
 */

describe('computeEventIdentity', () => {
	describe('basic key generation', () => {
		it('returns a stable key for a single person + type + date', () => {
			const key = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: '1850'
			});
			expect(key).toBe('Alice||baptism||1850');
		});

		it('returns the same key on repeated invocation', () => {
			const input = {
				persons: ['Alice'],
				eventType: 'baptism',
				date: '1850'
			};
			expect(computeEventIdentity(input)).toBe(computeEventIdentity(input));
		});
	});

	describe('wikilink normalization', () => {
		it('strips [[ and ]] from wikilink-formatted persons', () => {
			expect(computeEventIdentity({
				persons: ['[[Alice]]'],
				eventType: 'baptism',
				date: '1850'
			})).toBe('Alice||baptism||1850');
		});

		it('wikilink and plain name produce the same key', () => {
			const wiki = computeEventIdentity({
				persons: ['[[Alice]]'],
				eventType: 'baptism',
				date: '1850'
			});
			const plain = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: '1850'
			});
			expect(wiki).toBe(plain);
		});

		it('strips alias after | in [[target|alias]] form', () => {
			expect(computeEventIdentity({
				persons: ['[[Alice Smith|Ali]]'],
				eventType: 'baptism',
				date: '1850'
			})).toBe('Alice Smith||baptism||1850');
		});
	});

	describe('multiple persons', () => {
		it('sorts persons so argument order does not matter', () => {
			const ab = computeEventIdentity({
				persons: ['Alice', 'Bob'],
				eventType: 'marriage',
				date: '1875'
			});
			const ba = computeEventIdentity({
				persons: ['Bob', 'Alice'],
				eventType: 'marriage',
				date: '1875'
			});
			expect(ab).toBe(ba);
			expect(ab).toBe('Alice|Bob||marriage||1875');
		});

		it('mixed wikilink and plain still matches after normalization', () => {
			const a = computeEventIdentity({
				persons: ['[[Alice]]', 'Bob'],
				eventType: 'marriage',
				date: '1875'
			});
			const b = computeEventIdentity({
				persons: ['Alice', '[[Bob]]'],
				eventType: 'marriage',
				date: '1875'
			});
			expect(a).toBe(b);
		});
	});

	describe('event type normalization', () => {
		it('case-insensitive on event type', () => {
			const lower = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: '1850'
			});
			const mixed = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'Baptism',
				date: '1850'
			});
			expect(lower).toBe(mixed);
		});
	});

	describe('date normalization', () => {
		it('accepts numeric years (bare-year YAML) and stringifies', () => {
			expect(computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: 1850
			})).toBe('Alice||baptism||1850');
		});

		it('treats missing date as an empty segment (matches other missing)', () => {
			const undef = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism'
			});
			const nul = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: null
			});
			expect(undef).toBe(nul);
			expect(undef).toBe('Alice||baptism||');
		});

		it('"1850" and "1850-01-01" are DIFFERENT identities (strict match)', () => {
			const year = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: '1850'
			});
			const iso = computeEventIdentity({
				persons: ['Alice'],
				eventType: 'baptism',
				date: '1850-01-01'
			});
			expect(year).not.toBe(iso);
		});
	});

	describe('returns null when required fields missing', () => {
		it('empty persons array returns null', () => {
			expect(computeEventIdentity({
				persons: [],
				eventType: 'baptism',
				date: '1850'
			})).toBeNull();
		});

		it('persons array of only blank strings returns null', () => {
			expect(computeEventIdentity({
				persons: ['', '   '],
				eventType: 'baptism',
				date: '1850'
			})).toBeNull();
		});

		it('empty event type returns null', () => {
			expect(computeEventIdentity({
				persons: ['Alice'],
				eventType: '',
				date: '1850'
			})).toBeNull();
		});

		it('whitespace-only event type returns null', () => {
			expect(computeEventIdentity({
				persons: ['Alice'],
				eventType: '   ',
				date: '1850'
			})).toBeNull();
		});
	});
});

describe('extractEventIdentityFromFrontmatter', () => {
	it('reads modern persons array', () => {
		const key = extractEventIdentityFromFrontmatter({
			cr_type: 'event',
			persons: ['[[Alice]]', '[[Bob]]'],
			event_type: 'marriage',
			date: '1875'
		});
		expect(key).toBe('Alice|Bob||marriage||1875');
	});

	it('reads scalar persons value', () => {
		const key = extractEventIdentityFromFrontmatter({
			persons: '[[Alice]]',
			event_type: 'baptism',
			date: '1850'
		});
		expect(key).toBe('Alice||baptism||1850');
	});

	it('falls back to legacy person scalar', () => {
		const key = extractEventIdentityFromFrontmatter({
			person: '[[Alice]]',
			event_type: 'baptism',
			date: '1850'
		});
		expect(key).toBe('Alice||baptism||1850');
	});

	it('round-trips with computeEventIdentity', () => {
		const direct = computeEventIdentity({
			persons: ['Alice'],
			eventType: 'baptism',
			date: '1850'
		});
		const extracted = extractEventIdentityFromFrontmatter({
			persons: ['[[Alice]]'],
			event_type: 'baptism',
			date: '1850'
		});
		expect(extracted).toBe(direct);
	});

	it('handles numeric date from YAML (bare year)', () => {
		const key = extractEventIdentityFromFrontmatter({
			persons: ['[[Alice]]'],
			event_type: 'baptism',
			date: 1850
		});
		expect(key).toBe('Alice||baptism||1850');
	});

	it('returns null when persons is missing entirely', () => {
		const key = extractEventIdentityFromFrontmatter({
			event_type: 'baptism',
			date: '1850'
		});
		expect(key).toBeNull();
	});

	it('returns null when event_type is missing', () => {
		const key = extractEventIdentityFromFrontmatter({
			persons: ['[[Alice]]'],
			date: '1850'
		});
		expect(key).toBeNull();
	});

	it('ignores non-string entries in persons array', () => {
		const key = extractEventIdentityFromFrontmatter({
			persons: ['[[Alice]]', 42, null, '[[Bob]]'],
			event_type: 'marriage',
			date: '1875'
		});
		expect(key).toBe('Alice|Bob||marriage||1875');
	});
});
