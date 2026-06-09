/* eslint-disable @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, TFile, makeTFile } from 'obsidian';
import { findCrNoteByCrId } from '../src/utils/cr-id-resolver';

/**
 * #559: cr_id resolution must filter by expected cr_type so a duplicate
 * file outside Charted Roots' folder structure — recovered via File
 * Recovery, copied for troubleshooting, etc. — can't shadow the canonical
 * CR note by sharing its cr_id.
 *
 * Surfaced by @DigitalDreamn via #537: her vault had a canonical
 * `Jodni Naberrie-Waldin.md` (cr_type: person) inside Charted Roots, plus
 * a recovered `Jodni Naberrie.md` outside CR with the same cr_id. The
 * pre-#559 resolver returned the first match across the entire vault,
 * which could be the non-CR duplicate, causing the wikilink writer to
 * land on the wrong target.
 */

describe('findCrNoteByCrId — #559', () => {
	function makeFile(path: string): TFile {
		return makeTFile({ path, basename: path.split('/').pop()!.replace('.md', ''), extension: 'md' });
	}

	it('returns the file matching both cr_id and expected cr_type', () => {
		const app = new App();
		const file = makeFile('Charted Roots/People/Alice.md');
		app.vault._addFile(file);
		app.metadataCache._setFrontmatter(file, { cr_id: 'abc-123-def-456', cr_type: 'person' });

		const found = findCrNoteByCrId(app as unknown as App, 'abc-123-def-456', 'person');
		expect(found).toBe(file);
	});

	it('returns null when no file has the cr_id', () => {
		const app = new App();
		const file = makeFile('Charted Roots/People/Alice.md');
		app.vault._addFile(file);
		app.metadataCache._setFrontmatter(file, { cr_id: 'abc-123-def-456', cr_type: 'person' });

		const found = findCrNoteByCrId(app as unknown as App, 'xyz-999-aaa-000', 'person');
		expect(found).toBe(null);
	});

	it('returns null when cr_id matches but cr_type differs (cross-type)', () => {
		// A place note happens to share a cr_id with a person query.
		// Filter should reject it.
		const app = new App();
		const place = makeFile('Charted Roots/Places/Naboo.md');
		app.vault._addFile(place);
		app.metadataCache._setFrontmatter(place, { cr_id: 'abc-123-def-456', cr_type: 'place' });

		const found = findCrNoteByCrId(app as unknown as App, 'abc-123-def-456', 'person');
		expect(found).toBe(null);
	});

	// The headline case from @DigitalDreamn's report: duplicate cr_id where
	// one file is the canonical CR note and the other is an outside-CR
	// duplicate (no cr_type or different cr_type). Resolver must return the
	// CR note, not the duplicate.
	it('skips outside-CR duplicates (no cr_type) and returns the canonical CR file', () => {
		const app = new App();
		const crFile = makeFile('Charted Roots/People/Jodni Naberrie-Waldin.md');
		const outsideDuplicate = makeFile('Recovered/Jodni Naberrie.md');
		// Add the outside duplicate FIRST so it appears before the CR file
		// in getMarkdownFiles() order — the pre-#559 bug returned whatever
		// came first.
		app.vault._addFile(outsideDuplicate);
		app.vault._addFile(crFile);
		app.metadataCache._setFrontmatter(outsideDuplicate, { cr_id: 'jdn-001-naa-001' });
		app.metadataCache._setFrontmatter(crFile, { cr_id: 'jdn-001-naa-001', cr_type: 'person' });

		const found = findCrNoteByCrId(app as unknown as App, 'jdn-001-naa-001', 'person');
		expect(found).toBe(crFile);
	});

	it('skips files with no frontmatter at all', () => {
		const app = new App();
		const file = makeFile('Notes/Plain.md');
		app.vault._addFile(file);
		// No frontmatter set.

		const found = findCrNoteByCrId(app as unknown as App, 'abc-123-def-456', 'person');
		expect(found).toBe(null);
	});

	it('returns the first match when multiple CR notes share the cr_id and cr_type', () => {
		// Pathological vault state — duplicate CR files. Resolver returns
		// the first; up to data-quality / dedup-detection to surface this.
		const app = new App();
		const first = makeFile('Charted Roots/People/Alice.md');
		const duplicate = makeFile('Charted Roots/People/Alice (1).md');
		app.vault._addFile(first);
		app.vault._addFile(duplicate);
		app.metadataCache._setFrontmatter(first, { cr_id: 'abc-123-def-456', cr_type: 'person' });
		app.metadataCache._setFrontmatter(duplicate, { cr_id: 'abc-123-def-456', cr_type: 'person' });

		const found = findCrNoteByCrId(app as unknown as App, 'abc-123-def-456', 'person');
		expect(found).toBe(first);
	});
});