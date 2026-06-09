/* eslint-disable @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { createSmartWikilink } from '../src/organizations/services/organization-service';

/**
 * Property-based input-shape coverage for the organization-side
 * `createSmartWikilink` variant (#548). Mirrors the person-note-writer
 * fuzz pattern — the function's logic is identical (pipe/path stem
 * collapse, cr_id-first resolution, basename-ambiguity disambiguation),
 * just with a different signature and call site.
 *
 * Org-side call sites that go through this helper:
 * - `OrganizationService.createOrganization` (parent_org, seat fields).
 * - `OrganizationService.updateOrganization` (parent_org, seat after
 *   the #549 writer-side rewrap).
 * - `MembershipService.addMembership` / `removeMembership` (#542 routing).
 *
 * When the next variant in the wikilink-input cluster surfaces here,
 * add the new shape to the corpus below.
 */

function seedOrganization(
	app: App,
	args: { path: string; basename: string; name: string; crId: string }
): TFile {
	const file = makeTFile({ path: args.path, basename: args.basename, extension: 'md' });
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'organization',
		cr_id: args.crId,
		name: args.name,
	});
	return file;
}

/**
 * Mirrors the loader's `extractName` behavior: strip `[[…]]` brackets
 * and return the inner content verbatim.
 */
const loaderViewOf = (wikilink: string): string => {
	const match = wikilink.match(/^\[\[([^\]]+)\]\]$/);
	return match ? match[1] : wikilink;
};

/** Default vault: a single org, basename matches name, unique. */
const seedUniqueVault = (app: App): void => {
	seedOrganization(app, {
		path: 'Charted Roots/Organizations/Jedi Order.md',
		basename: 'Jedi Order',
		name: 'Jedi Order',
		crId: 'org-jedi-order',
	});
};

/** Vault with a duplicate-basename file outside the CR structure. */
const seedAmbiguousVault = (app: App): void => {
	seedUniqueVault(app);
	const duplicate = makeTFile({
		path: 'Lore/Jedi Order.md',
		basename: 'Jedi Order',
		extension: 'md',
	});
	app.vault._addFile(duplicate);
};

describe('organization-service.createSmartWikilink — property-based input-shape coverage (#548)', () => {
	const uniqueVaultCases: Array<{ label: string; input: string }> = [
		{ label: 'bare basename', input: 'Jedi Order' },
		{ label: 'pre-formatted bracketed (returned as-is)', input: '[[Jedi Order]]' },

		// Pipe-stem inputs (#537).
		{ label: 'pipe-stem self-aliased', input: 'Jedi Order|Jedi Order' },
		{ label: 'pipe-accumulation triple', input: 'Jedi Order|Jedi Order|Jedi Order' },

		// Path-form inputs (#538).
		{ label: 'bare path-form', input: 'Charted Roots/Organizations/Jedi Order' },
		{ label: 'path with explicit alias', input: 'Charted Roots/Organizations/Jedi Order|Jedi Order' },
		{ label: 'inverted alias residue (#538 shape)', input: 'Jedi Order|Charted Roots/Organizations/Jedi Order' },
		{ label: 'deeply nested path', input: 'Charted Roots/Organizations/Galactic/Old Republic/Jedi Order' },

		// Compound corruption.
		{ label: 'path with triple-pipe accumulation', input: 'Jedi Order|Jedi Order|Charted Roots/Organizations/Jedi Order' },
	];

	it.each(uniqueVaultCases)('unique vault: $label is parseable + idempotent', ({ input }) => {
		const app = new App();
		seedUniqueVault(app);

		const first = createSmartWikilink(input, app as unknown as App, 'org-jedi-order');

		// Property 1: output is a parseable wikilink.
		expect(first).toMatch(/^\[\[[^\]]+\]\]$/);

		// Property 2: round-trip idempotency.
		const second = createSmartWikilink(loaderViewOf(first), app as unknown as App, 'org-jedi-order');
		expect(second).toBe(first);
	});

	const ambiguousVaultCases: Array<{ label: string; input: string }> = [
		{ label: 'bare basename → disambiguated', input: 'Jedi Order' },
		{ label: 'pipe-stem self-aliased', input: 'Jedi Order|Jedi Order' },
		{ label: 'pipe-accumulation triple', input: 'Jedi Order|Jedi Order|Jedi Order' },
		{ label: 'bare path-form', input: 'Charted Roots/Organizations/Jedi Order' },
		{ label: 'path with explicit alias', input: 'Charted Roots/Organizations/Jedi Order|Jedi Order' },
		{ label: 'inverted alias residue', input: 'Jedi Order|Charted Roots/Organizations/Jedi Order' },
	];

	it.each(ambiguousVaultCases)('ambiguous vault: $label is parseable + idempotent + path-disambiguated', ({ input }) => {
		const app = new App();
		seedAmbiguousVault(app);

		const first = createSmartWikilink(input, app as unknown as App, 'org-jedi-order');

		// Property 1: output is a parseable wikilink.
		expect(first).toMatch(/^\[\[[^\]]+\]\]$/);

		// Property 3 (ambiguous-only): output contains the canonical CR path
		// so Obsidian's resolver lands on the right org note (#540).
		expect(first).toContain('Charted Roots/Organizations/Jedi Order');

		// Property 2: round-trip idempotency holds even with ambiguity.
		const second = createSmartWikilink(loaderViewOf(first), app as unknown as App, 'org-jedi-order');
		expect(second).toBe(first);
	});

	describe('cr_id resolution behavior', () => {
		it('resolves to the canonical org file when cr_id is provided', () => {
			const app = new App();
			seedOrganization(app, {
				path: 'Charted Roots/Organizations/House Targaryen.md',
				basename: 'House Targaryen',
				name: 'House Targaryen',
				crId: 'org-targaryen',
			});
			expect(createSmartWikilink('House Targaryen', app as unknown as App, 'org-targaryen'))
				.toBe('[[House Targaryen]]');
		});

		it('falls back to name-based lookup when cr_id does not resolve', () => {
			const app = new App();
			seedOrganization(app, {
				path: 'Charted Roots/Organizations/House Stark.md',
				basename: 'House Stark',
				name: 'House Stark',
				crId: 'org-stark',
			});
			// Pass a cr_id that doesn't exist in the vault — should fall back
			// to the metadataCache.getFirstLinkpathDest lookup by name.
			expect(createSmartWikilink('House Stark', app as unknown as App, 'org-bogus'))
				.toBe('[[House Stark]]');
		});

		it('emits standard form when no resolution succeeds', () => {
			const app = new App();
			// Empty vault — no resolution possible.
			expect(createSmartWikilink('Unknown Org', app as unknown as App))
				.toBe('[[Unknown Org]]');
		});
	});
});