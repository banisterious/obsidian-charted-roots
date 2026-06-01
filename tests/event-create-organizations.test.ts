import { describe, expect, it } from 'vitest';
import { App } from 'obsidian';
import { EventService } from '../src/events/services/event-service';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #659 follow-up — the Create/Edit Event modal added an "Organizations" field
 * but never threaded it into the save paths, so a person could enter
 * organizations and the modal reported success while writing nothing. The
 * modal now passes the parsed names as `data.organizations` (create) and
 * writes the wikilink array to frontmatter (edit). These tests lock the
 * service write contract the modal relies on: `data.organizations` plain names
 * round-trip to a `[[Name]]` frontmatter array.
 *
 * Settings are constructed minimally for the same reason as the #510
 * createEvent regression test (importing DEFAULT_SETTINGS pulls in Obsidian
 * Modal subclasses the mock doesn't carry).
 */

function makeService(): { service: EventService; app: App } {
	const app = new App();
	const settings = {
		eventsFolder: 'Charted Roots/Events',
		propertyAliases: {},
	} as unknown as CanvasRootsSettings;
	const service = new EventService(app as unknown as App, settings);
	return { service, app };
}

describe('EventService.createEvent — organizations (#659 follow-up)', () => {
	it('writes plain organization names as a wikilink array', async () => {
		const { service, app } = makeService();

		const file = await service.createEvent({
			title: 'Destruction of Lian Hua Sect',
			eventType: 'custom',
			datePrecision: 'exact',
			organizations: ['Jedi Order', 'Galactic Senate'],
		});

		const content = await app.vault.read(file);
		expect(content).toContain('- "[[Jedi Order]]"');
		expect(content).toContain('- "[[Galactic Senate]]"');
	});

	it('omits the organizations property entirely when none are given', async () => {
		const { service, app } = makeService();

		const file = await service.createEvent({
			title: 'Untethered event',
			eventType: 'custom',
			datePrecision: 'exact',
		});

		const content = await app.vault.read(file);
		expect(content).not.toContain('organizations:');
	});
});
