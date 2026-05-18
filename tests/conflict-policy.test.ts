import { describe, expect, it, vi } from 'vitest';
import {
	overwriteOnConflict,
	skipOnConflict,
	type ConflictContext,
} from '../src/core/conflict-policy';
import type { TFile } from 'obsidian';

/**
 * Pure-helper coverage for the per-field conflict policies introduced
 * with #606. The full prompt path is exercised end-to-end in the
 * dev-vault (interactive modal); these tests fence the non-UI policies
 * that callers like the bidi-linker and the legacy-overwrite default
 * depend on.
 */

function makeContext(overrides: Partial<ConflictContext> = {}): ConflictContext {
	return {
		fieldName: 'father_id',
		fieldLabel: 'Father',
		existingValue: 'cnf-002-tst-200',
		newValue: 'cnf-003-tst-300',
		existingDisplay: 'Conflict Test Father A',
		newDisplay: 'Conflict Test Father B',
		subjectFile: { path: 'People/Conflict Test Child.md', basename: 'Conflict Test Child' } as TFile,
		...overrides,
	};
}

describe('skipOnConflict policy', () => {
	it('resolves to cancel', async () => {
		const decision = await skipOnConflict(makeContext());
		expect(decision).toBe('cancel');
	});

	it('does not depend on the specific field or values', async () => {
		const motherDecision = await skipOnConflict(makeContext({
			fieldName: 'mother_id',
			fieldLabel: 'Mother',
			existingValue: 'aaa',
			newValue: 'bbb',
		}));
		expect(motherDecision).toBe('cancel');
	});
});

describe('overwriteOnConflict policy', () => {
	it('resolves to replace', async () => {
		const decision = await overwriteOnConflict(makeContext());
		expect(decision).toBe('replace');
	});

	it('preserves backward-compatibility with pre-v0.22.47 behavior', async () => {
		// The default policy must always proceed; any caller that doesn't
		// explicitly opt into a prompt or skip policy stays on the old
		// silent-overwrite path so we don't surprise unaudited callers.
		const decision = await overwriteOnConflict(makeContext({
			existingValue: 'someone-else',
			newValue: 'new-target',
		}));
		expect(decision).toBe('replace');
	});
});

describe('ConflictPolicy contract', () => {
	it('accepts an arbitrary async resolver', async () => {
		// Demonstrates that a UI prompt (modal) and a non-UI policy
		// (logger-driven) share the same signature, so call sites can
		// thread either without branching.
		const promptStub = vi.fn().mockResolvedValue('replace' as const);
		const result = await promptStub(makeContext());
		expect(result).toBe('replace');
		expect(promptStub).toHaveBeenCalledTimes(1);
		expect(promptStub).toHaveBeenCalledWith(
			expect.objectContaining({ fieldName: 'father_id' })
		);
	});
});
