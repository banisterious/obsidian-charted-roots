import { describe, expect, it } from 'vitest';
import { App, TFile } from 'obsidian';
import { OrganizationService } from '../src/organizations/services/organization-service';

/**
 * #649 — the `dissolved` organization property was typed, read, and rendered
 * (templates, profile view, wiki) but neither write path serialized it, and
 * the Create/Edit Organization modal had no input. These tests fence the two
 * service write paths now that the modal threads `dissolved` through.
 */

interface OrgServiceLike {
	createOrganization: (
		name: string,
		orgType: string,
		options?: { founded?: string; dissolved?: string }
	) => Promise<TFile>;
	updateOrganization: (file: TFile, data: { dissolved?: string }) => Promise<void>;
}

// The service is constructed against a minimal plugin stub and cast to a typed
// view of the two methods under test — this keeps the calls cleanly typed
// (the real plugin type pulls in any-typed Obsidian surfaces).
function makeService(app: App): OrgServiceLike {
	const plugin = {
		app,
		settings: { organizationsFolder: 'Charted Roots/Organizations', propertyAliases: {} },
	} as never;
	return new OrganizationService(plugin) as unknown as OrgServiceLike;
}

function seedOrg(app: App, path: string, frontmatter: Record<string, unknown>): TFile {
	const file = new TFile({
		path,
		basename: path.split('/').pop()!.replace(/\.md$/, ''),
		extension: 'md',
	});
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, frontmatter);
	return file;
}

describe('OrganizationService dissolved write path (#649)', () => {
	it('createOrganization serializes dissolved into the new note frontmatter', async () => {
		const app = new App();
		const file = await makeService(app).createOrganization('Jedi Order', 'custom', {
			founded: 'TA 2000',
			dissolved: 'TA 2050',
		});

		const content = await app.vault.read(file);
		expect(content).toContain('founded: "TA 2000"');
		expect(content).toContain('dissolved: "TA 2050"');
	});

	it('createOrganization omits dissolved when not provided', async () => {
		const app = new App();
		const file = await makeService(app).createOrganization('Sith Order', 'custom', {
			founded: 'TA 1000',
		});

		const content = await app.vault.read(file);
		expect(content).not.toContain('dissolved:');
	});

	it('updateOrganization sets dissolved on an existing note', async () => {
		const app = new App();
		const file = seedOrg(app, 'Charted Roots/Organizations/Rebel Alliance.md', {
			cr_type: 'organization',
			cr_id: 'org-rebels',
			name: 'Rebel Alliance',
			founded: 'BBY 2',
		});

		await makeService(app).updateOrganization(file, { dissolved: 'ABY 4' });

		expect(app.metadataCache.getFileCache(file)?.frontmatter?.dissolved).toBe('ABY 4');
	});

	it('updateOrganization deletes dissolved when cleared', async () => {
		const app = new App();
		const file = seedOrg(app, 'Charted Roots/Organizations/Old Republic.md', {
			cr_type: 'organization',
			cr_id: 'org-old-republic',
			name: 'Old Republic',
			dissolved: 'BBY 19',
		});

		await makeService(app).updateOrganization(file, { dissolved: '' });

		expect(app.metadataCache.getFileCache(file)?.frontmatter?.dissolved).toBeUndefined();
	});
});
