/* eslint-disable obsidianmd/ui/sentence-case -- Rule misfires on quoted button labels, month names, proper-noun section paths, and example strings; per-site audit deferred. */
import { describe, expect, it } from 'vitest';

/**
 * Harness smoke test. Confirms Vitest runs and the obsidian mock resolves.
 * Replace with real tests as coverage grows.
 */

describe('vitest harness', () => {
	it('is alive', () => {
		expect(1 + 1).toBe(2);
	});

	it('resolves the obsidian mock', async () => {
		const { App, Notice } = await import('obsidian');
		const app = new App();
		expect(app.vault).toBeDefined();
		expect(app.metadataCache).toBeDefined();
		expect(app.fileManager).toBeDefined();
		const n = new Notice('hello');
		expect(n.message).toBe('hello');
	});
});