import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { FamilyGraphService } from '../src/core/family-graph';

/**
 * #761 follow-up — the Collections-tab "Collection highlights" (largest /
 * smallest) and the family count come from
 * `FamilyGraphService.calculateCollectionAnalytics()`, which built its
 * collection list straight from `findAllFamilyComponents()` — the un-merged
 * connected components. People hand-grouped under a shared `group_name` (no
 * biological links) therefore each formed a one-person component, so the
 * analytics reported the smallest collection as 1 person even though the
 * Detected-families table (which merges by collection name, #761) showed them
 * as a single group.
 *
 * Reported by @DigitalDreamn: "Jedi" reads as 6 people in the families table
 * but "Smallest: Jedi (1 people)" in the highlights after the original #761
 * fix. This suite fences the merge into the analytics surface.
 */

function makeFile(path: string, basename: string): TFile {
	return makeTFile({ path, basename, extension: 'md' });
}

function seedPerson(app: App, basename: string, fm: Record<string, unknown>): void {
	const file = makeFile(`People/${basename}.md`, basename);
	app.vault.files.set(file.path, file);
	app.metadataCache._setFrontmatter(file, fm);
}

describe('calculateCollectionAnalytics — hand-grouped families merge (#761 follow-up)', () => {
	it('counts isolated people sharing a group_name as one collection, not several one-person families', () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		// Three unrelated people hand-grouped under the same group_name, with no
		// biological links between them (the @DigitalDreamn "Jedi" case).
		seedPerson(app, 'Obi-Wan', { cr_id: 'p1', cr_type: 'person', group_name: 'Jedi' });
		seedPerson(app, 'Yoda', { cr_id: 'p2', cr_type: 'person', group_name: 'Jedi' });
		seedPerson(app, 'Mace', { cr_id: 'p3', cr_type: 'person', group_name: 'Jedi' });

		const analytics = service.calculateCollectionAnalytics();

		// The three Jedi merge into a single 3-person collection — so the
		// largest and smallest (the only collection) both read 3, not 1.
		expect(analytics.totalFamilies).toBe(1);
		expect(analytics.largestCollection?.name).toBe('Jedi');
		expect(analytics.largestCollection?.size).toBe(3);
		expect(analytics.smallestCollection?.name).toBe('Jedi');
		expect(analytics.smallestCollection?.size).toBe(3);
	});

	it('keeps a smaller unnamed family as the smallest once hand-grouped members merge', () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		// Four people hand-grouped as "Jedi" (no links) plus a connected
		// two-person spouse pair with no group_name.
		seedPerson(app, 'Obi-Wan', { cr_id: 'p1', cr_type: 'person', group_name: 'Jedi' });
		seedPerson(app, 'Yoda', { cr_id: 'p2', cr_type: 'person', group_name: 'Jedi' });
		seedPerson(app, 'Mace', { cr_id: 'p3', cr_type: 'person', group_name: 'Jedi' });
		seedPerson(app, 'Qui-Gon', { cr_id: 'p4', cr_type: 'person', group_name: 'Jedi' });
		seedPerson(app, 'Han', { cr_id: 'p5', cr_type: 'person', spouse_id: 'p6' });
		seedPerson(app, 'Leia', { cr_id: 'p6', cr_type: 'person', spouse_id: 'p5' });

		const analytics = service.calculateCollectionAnalytics();

		// Two collections: merged Jedi (4) and the spouse pair (2).
		expect(analytics.totalFamilies).toBe(2);
		expect(analytics.largestCollection?.size).toBe(4);
		expect(analytics.largestCollection?.name).toBe('Jedi');
		// The smallest is the unnamed spouse pair, not a stray size-1 Jedi.
		expect(analytics.smallestCollection?.size).toBe(2);
	});

	it('excludes a lone unconnected note from the largest/smallest highlights', () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		// A two-person spouse pair plus a single orphan with no links and no group.
		seedPerson(app, 'Han', { cr_id: 'p1', cr_type: 'person', spouse_id: 'p2' });
		seedPerson(app, 'Leia', { cr_id: 'p2', cr_type: 'person', spouse_id: 'p1' });
		seedPerson(app, 'Lone Wanderer', { cr_id: 'p3', cr_type: 'person' });

		const analytics = service.calculateCollectionAnalytics();

		// The orphan is still counted as a family, but is not surfaced as the
		// smallest collection — the multi-person pair is.
		expect(analytics.totalFamilies).toBe(2);
		expect(analytics.smallestCollection?.size).toBe(2);
		expect(analytics.largestCollection?.size).toBe(2);
	});

	it('omits the highlights entirely when every collection is a single person', () => {
		const app = new App();
		const service = new FamilyGraphService(app);

		// Two unrelated, ungrouped orphans — no multi-person collection exists.
		seedPerson(app, 'Orphan A', { cr_id: 'p1', cr_type: 'person' });
		seedPerson(app, 'Orphan B', { cr_id: 'p2', cr_type: 'person' });

		const analytics = service.calculateCollectionAnalytics();

		expect(analytics.totalFamilies).toBe(2);
		expect(analytics.largestCollection).toBeNull();
		expect(analytics.smallestCollection).toBeNull();
	});
});
