/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, Plugin, TFile } from 'obsidian';
import { ProofSummaryService } from '../src/sources/services/proof-summary-service';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #519 mirror — same metadata-cache race in ProofSummaryService.
 * createProof writes a file via vault.create, but Obsidian's metadata
 * cache hasn't indexed it yet. Without the listener fix, loadProofCache
 * silently skips the new file and stays poisoned.
 */

function makeServiceWithListeners(): {
	service: ProofSummaryService;
	app: App;
	plugin: Plugin;
} {
	const app = new App();
	const plugin = new Plugin(app);
	const settings = {
		sourcesFolder: 'Charted Roots/Sources',
		propertyAliases: {},
		customSourceTypes: [],
	} as unknown as CanvasRootsSettings;
	const service = new ProofSummaryService(app as unknown as App, settings);
	service.setupVaultListeners(plugin);
	return { service, app, plugin };
}

function seedExistingProof(
	app: App,
	args: { path: string; basename: string; crId: string; title: string }
): TFile {
	const file = new TFile({ path: args.path, basename: args.basename, extension: 'md' });
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'proof_summary',
		cr_id: args.crId,
		title: args.title,
		subject_person: '[[William Anderson]]',
		fact_type: 'birth_date',
		conclusion: 'William Anderson was born in 1817.',
		status: 'draft',
		confidence: 'probable',
		evidence: [],
	});
	return file;
}

describe('ProofSummaryService — metadata-cache race after createProof (#519 mirror)', () => {
	it('reloads the cache once metadataCache.on("changed") fires for the new file', async () => {
		const { service, app } = makeServiceWithListeners();

		seedExistingProof(app, {
			path: 'Charted Roots/Sources/Proofs/Existing Proof.md',
			basename: 'Existing Proof',
			crId: 'proof-existing-001',
			title: 'Existing Proof',
		});

		expect(service.getAllProofs()).toHaveLength(1);

		const newFile = await service.createProof({
			title: 'Birth year of William Anderson (1817)',
			subjectPerson: '[[William Anderson]]',
			factType: 'birth_date',
			conclusion: 'William Anderson was born in 1817.',
		});

		// Race window: cache loaded before metadata indexed → new proof missing.
		expect(service.getAllProofs()).toHaveLength(1);
		expect(service.getProofById('proof-existing-001')).toBeDefined();

		// Obsidian catches up.
		app.metadataCache._setFrontmatter(newFile, {
			cr_type: 'proof_summary',
			cr_id: 'proof-new-002',
			title: 'Birth year of William Anderson (1817)',
			subject_person: '[[William Anderson]]',
			fact_type: 'birth_date',
			conclusion: 'William Anderson was born in 1817.',
			status: 'draft',
			confidence: 'possible',
			evidence: [],
		});
		app.metadataCache._fire('changed', newFile);

		const allProofs = service.getAllProofs();
		expect(allProofs).toHaveLength(2);
		expect(service.getProofById('proof-new-002')).toBeDefined();
	});

	it('invalidates the cache when a cached proof file is deleted', () => {
		const { service, app } = makeServiceWithListeners();
		const file = seedExistingProof(app, {
			path: 'Charted Roots/Sources/Proofs/Test.md',
			basename: 'Test',
			crId: 'proof-delete-test',
			title: 'Test',
		});

		expect(service.getAllProofs()).toHaveLength(1);

		app.vault.files.delete(file.path);
		app.vault._fire('delete', file);

		expect(service.getAllProofs()).toHaveLength(0);
	});

	it('invalidates the cache when a cached proof file is renamed', () => {
		const { service, app } = makeServiceWithListeners();
		const file = seedExistingProof(app, {
			path: 'Charted Roots/Sources/Proofs/Old Name.md',
			basename: 'Old Name',
			crId: 'proof-rename-test',
			title: 'Old Name',
		});

		expect(service.getAllProofs()).toHaveLength(1);
		const oldPath = file.path;

		app.vault._rename(file, 'Charted Roots/Sources/Proofs/New Name.md');
		app.vault._fire('rename', file, oldPath);

		const reloaded = service.getProofById('proof-rename-test');
		expect(reloaded?.filePath).toBe('Charted Roots/Sources/Proofs/New Name.md');
	});

	it('does not invalidate the cache when a non-proof file changes', () => {
		const { service, app } = makeServiceWithListeners();
		seedExistingProof(app, {
			path: 'Charted Roots/Sources/Proofs/Stable.md',
			basename: 'Stable',
			crId: 'proof-stable',
			title: 'Stable',
		});

		expect(service.getAllProofs()).toHaveLength(1);

		const sourceFile = new TFile({
			path: 'Charted Roots/Sources/Some Census.md',
			basename: 'Some Census',
			extension: 'md',
		});
		app.vault._addFile(sourceFile);
		app.metadataCache._setFrontmatter(sourceFile, {
			cr_type: 'source',
			cr_id: 'src-some',
			title: 'Some Census',
		});
		app.metadataCache._fire('changed', sourceFile);

		expect(service.getAllProofs()).toHaveLength(1);
	});

	it('registers three event listeners on the plugin', () => {
		const { plugin } = makeServiceWithListeners();
		expect(plugin._registeredEventCount()).toBe(3);
	});
});