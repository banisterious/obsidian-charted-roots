/**
 * Type augmentations for the Vitest Obsidian mock (`tests/mocks/obsidian.ts`).
 *
 * At runtime, vitest aliases `obsidian` to the mock (see `vitest.config.ts`),
 * so the mock's test-helper seams (`_addFile`, `_setFrontmatter`, `_fire`, the
 * public `files` map, etc.) and the deprecated global `window.app` are present.
 * But `tsc` resolves `import ... from 'obsidian'` to the real `obsidian.d.ts`,
 * which declares none of those, so the test suite reported ~180 phantom
 * "property does not exist" errors (#704).
 *
 * These declaration-merging augmentations add the seams to the obsidian types
 * so the suite type-checks against the same surface it runs against. They are
 * test-only hygiene; production code does not use the `_`-prefixed seams.
 */
import type { App } from 'obsidian';

declare module 'obsidian' {
	interface Vault {
		/** Mock seam: the mock vault's file map. */
		files: Map<string, TFile>;
		/** Mock seam: seed a file into the mock vault. */
		_addFile(file: TFile, content?: string): void;
		/** Mock seam: simulate Obsidian's rename; returns the old path. */
		_rename(file: TFile, newPath: string): string;
		/** Mock seam: fire a vault event manually. */
		_fire(event: string, ...args: unknown[]): void;
		/** Mock seam: count listeners registered for an event. */
		_listenerCount(event: string): number;
		_attachMetadataCache(cache: MetadataCache): void;
		_getMetadataCache(): MetadataCache | null;
	}

	interface MetadataCache {
		/** Mock seam: seed metadata for a file. */
		_setFrontmatter(file: TFile, frontmatter: Record<string, unknown>): void;
		/** Mock seam: fire a metadata-cache event manually. */
		_fire(event: string, ...args: unknown[]): void;
		_updateFrontmatter(file: TFile, frontmatter: Record<string, unknown>): void;
		_moveCacheEntry(oldPath: string, newPath: string): void;
		_attachVault(vault: Vault): void;
		/** Mock seam: count listeners registered for an event. */
		_listenerCount(event: string): number;
	}

	interface Plugin {
		/** Mock seam: count events registered via `registerEvent`. */
		_registeredEventCount(): number;
	}
}

declare global {
	interface Window {
		/** Obsidian's deprecated global app handle; set by the mock in tests. */
		app: App;
	}
}
