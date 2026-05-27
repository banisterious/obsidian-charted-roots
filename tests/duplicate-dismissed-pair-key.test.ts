import { describe, expect, it } from 'vitest';
import { dismissedDuplicatePairKey } from '../src/core/duplicate-detection';

/**
 * #633 — "Not a duplicate" dismissals must persist across sessions and
 * rescans. The persisted key has to be order-independent, because the
 * duplicate detector may list the same pair as (A, B) in one scan and (B, A)
 * in another; if the key depended on order, the dismissal wouldn't match on
 * the next scan and the pair would reappear.
 */
describe('dismissedDuplicatePairKey (#633)', () => {
	it('produces the same key regardless of argument order', () => {
		expect(dismissedDuplicatePairKey('cr-aaa', 'cr-bbb'))
			.toBe(dismissedDuplicatePairKey('cr-bbb', 'cr-aaa'));
	});

	it('joins the sorted cr_ids with a :: separator', () => {
		expect(dismissedDuplicatePairKey('cr-bbb', 'cr-aaa')).toBe('cr-aaa::cr-bbb');
	});

	it('a dismissal recorded from one ordering matches the pair seen in the other ordering', () => {
		// Pair dismissed when the detector listed it as (bbb, aaa)
		const dismissed = new Set([dismissedDuplicatePairKey('cr-bbb', 'cr-aaa')]);
		// Next scan lists the same pair as (aaa, bbb)
		expect(dismissed.has(dismissedDuplicatePairKey('cr-aaa', 'cr-bbb'))).toBe(true);
	});

	it('keeps distinct pairs distinct', () => {
		expect(dismissedDuplicatePairKey('cr-aaa', 'cr-bbb'))
			.not.toBe(dismissedDuplicatePairKey('cr-aaa', 'cr-ccc'));
	});
});
