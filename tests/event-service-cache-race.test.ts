/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { describe, expect, it } from 'vitest';
import { App, Plugin, TFile, makeTFile } from 'obsidian';
import { EventService } from '../src/events/services/event-service';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #519 regression: when EventService.createEvent writes a new event file,
 * Obsidian's metadata cache hasn't yet indexed the file. If a read happens
 * before indexing catches up, loadEventCache silently skips the new file
 * (because cache.frontmatter is undefined) and marks the cache valid
 * anyway — poisoning it until something external invalidates.
 *
 * The fix: subscribe to metadataCache.on('changed') so the cache
 * re-clears once Obsidian catches up. Also handle vault delete and
 * rename for completeness.
 *
 * These tests use the mock's lazy metadata model: vault.create writes the
 * file but does NOT auto-index frontmatter (matches Obsidian's async
 * behavior). The test then fires metadataCache._fire('changed', ...)
 * to simulate the catch-up moment.
 */

function makeServiceWithListeners(): {
	service: EventService;
	app: App;
	plugin: Plugin;
} {
	const app = new App();
	const plugin = new Plugin(app);
	const settings = {
		eventsFolder: 'Charted Roots/Events',
		propertyAliases: {},
	} as unknown as CanvasRootsSettings;
	const service = new EventService(app as unknown as App, settings);
	service.setupVaultListeners(plugin);
	return { service, app, plugin };
}

function seedExistingEvent(
	app: App,
	args: { path: string; basename: string; crId: string; title: string }
): TFile {
	const file = makeTFile({ path: args.path, basename: args.basename, extension: 'md' });
	app.vault._addFile(file);
	app.metadataCache._setFrontmatter(file, {
		cr_type: 'event',
		cr_id: args.crId,
		title: args.title,
		event_type: 'plot_point',
		date_precision: 'exact',
	});
	return file;
}

describe('EventService — metadata-cache race after createEvent (#519)', () => {
	it('reloads the cache once metadataCache.on("changed") fires for the new file', async () => {
		const { service, app } = makeServiceWithListeners();

		// Seed one pre-existing event so the cache has prior contents.
		seedExistingEvent(app, {
			path: 'Charted Roots/Events/Joins the Apprentice Legislature.md',
			basename: 'Joins the Apprentice Legislature',
			crId: 'evt-existing-001',
			title: 'Joins the Apprentice Legislature',
		});

		// Initial read populates cache with the seeded event.
		expect(service.getAllEvents()).toHaveLength(1);

		// Simulate the bug window: a new file is created on disk via
		// createEvent. The mock's vault.create does NOT auto-index
		// frontmatter, so this matches Obsidian's "metadata not yet
		// indexed" state.
		const newFile = await service.createEvent({
			title: 'Kidnapped by Tuskan Raiders',
			eventType: 'plot_point',
			datePrecision: 'exact',
			date: 'BBY 22',
		});

		// First read after createEvent: the service-level invalidate
		// fires loadEventCache, which can't see the new file's
		// frontmatter yet → cache is poisoned with the prior event only.
		expect(service.getAllEvents()).toHaveLength(1);
		expect(service.getEventById('evt-existing-001')).toBeDefined();

		// Now Obsidian "catches up" and indexes the new file. In
		// production this triggers metadataCache.on('changed'); we
		// simulate by seeding the cache and firing the event.
		app.metadataCache._setFrontmatter(newFile, {
			cr_type: 'event',
			cr_id: 'evt-new-002',
			title: 'Kidnapped by Tuskan Raiders',
			event_type: 'plot_point',
			date_precision: 'exact',
		});
		app.metadataCache._fire('changed', newFile);

		// Cache should now be invalidated; next read picks up the new
		// event alongside the existing one.
		const allEvents = service.getAllEvents();
		expect(allEvents).toHaveLength(2);
		expect(service.getEventById('evt-new-002')).toBeDefined();
	});

	it('invalidates the cache when a cached event file is deleted', () => {
		const { service, app } = makeServiceWithListeners();
		const file = seedExistingEvent(app, {
			path: 'Charted Roots/Events/Test.md',
			basename: 'Test',
			crId: 'evt-delete-test',
			title: 'Test',
		});

		expect(service.getAllEvents()).toHaveLength(1);

		// Remove from vault + fire delete event.
		app.vault.files.delete(file.path);
		app.vault._fire('delete', file);

		expect(service.getAllEvents()).toHaveLength(0);
	});

	it('invalidates the cache when a cached event file is renamed', () => {
		const { service, app } = makeServiceWithListeners();
		const file = seedExistingEvent(app, {
			path: 'Charted Roots/Events/Old Name.md',
			basename: 'Old Name',
			crId: 'evt-rename-test',
			title: 'Old Name',
		});

		expect(service.getAllEvents()).toHaveLength(1);
		const oldPath = file.path;

		// Rename the file and fire the event with the old path.
		app.vault._rename(file, 'Charted Roots/Events/New Name.md');
		app.vault._fire('rename', file, oldPath);

		// Cache should re-load and reflect the new path.
		const reloaded = service.getEventById('evt-rename-test');
		expect(reloaded?.filePath).toBe('Charted Roots/Events/New Name.md');
	});

	it('does not invalidate the cache when a non-event file changes', () => {
		const { service, app } = makeServiceWithListeners();
		seedExistingEvent(app, {
			path: 'Charted Roots/Events/Stable.md',
			basename: 'Stable',
			crId: 'evt-stable',
			title: 'Stable',
		});

		// Prime the cache.
		expect(service.getAllEvents()).toHaveLength(1);

		// A person note changes — should not affect the event cache.
		const personFile = makeTFile({
			path: 'People/Luke Skywalker.md',
			basename: 'Luke Skywalker',
			extension: 'md',
		});
		app.vault._addFile(personFile);
		app.metadataCache._setFrontmatter(personFile, {
			cr_type: 'person',
			cr_id: 'person-luke',
			name: 'Luke Skywalker',
		});
		app.metadataCache._fire('changed', personFile);

		// Still just the one event, cache untouched.
		expect(service.getAllEvents()).toHaveLength(1);
	});

	it('registers three event listeners on the plugin', () => {
		const { plugin } = makeServiceWithListeners();
		// metadataCache.changed + vault.delete + vault.rename
		expect(plugin._registeredEventCount()).toBe(3);
	});
});