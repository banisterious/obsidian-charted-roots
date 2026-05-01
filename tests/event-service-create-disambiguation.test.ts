import { describe, expect, it } from 'vitest';
import { App } from 'obsidian';
import { EventService } from '../src/events/services/event-service';
import type { CanvasRootsSettings } from '../src/settings';

/**
 * #510 end-to-end regression: createEvent must produce
 * `[[basename|name]]` wikilinks when callers pass the basename hint
 * via personsBasenames / placeBasename. doctorwodka's reproducer was
 * two persons sharing `name: Harold James` with distinct filenames;
 * without disambiguation the event silently linked the wrong person.
 *
 * Settings are constructed minimally — importing DEFAULT_SETTINGS pulls
 * in src/settings.ts which transitively imports Obsidian Modal subclasses
 * the mock doesn't carry, so the mock-friendly path is to satisfy only the
 * settings fields createEvent actually reads.
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

describe('EventService.createEvent — wikilink disambiguation (#510)', () => {
	it('emits [[basename|name]] for a person whose basename differs from display name', async () => {
		const { service, app } = makeService();

		const file = await service.createEvent({
			title: 'Birth of Harold James',
			eventType: 'birth',
			datePrecision: 'exact',
			date: '1950-01-01',
			person: 'Harold James',
			personBasename: 'Harold James 2',
		});

		const content = await app.vault.read(file);
		expect(content).toContain('[[Harold James 2|Harold James]]');
		// Reproducer bug: ambiguous unaliased form would be `- "[[Harold James]]"`.
		expect(content).not.toContain('- "[[Harold James]]"');
	});

	it('emits [[name]] when basename matches name', async () => {
		const { service, app } = makeService();

		const file = await service.createEvent({
			title: 'Birth of Jane Doe',
			eventType: 'birth',
			datePrecision: 'exact',
			date: '1850-01-01',
			person: 'Jane Doe',
			personBasename: 'Jane Doe',
		});

		const content = await app.vault.read(file);
		expect(content).toContain('- "[[Jane Doe]]"');
		expect(content).not.toContain('|Jane Doe]]');
	});

	it('disambiguates per-index when multiple persons share the same display name', async () => {
		const { service, app } = makeService();

		const file = await service.createEvent({
			title: 'Reunion',
			eventType: 'custom',
			datePrecision: 'exact',
			date: '1980-01-01',
			persons: ['Harold James', 'Harold James'],
			personsBasenames: ['Harold James 1', 'Harold James 2'],
		});

		const content = await app.vault.read(file);
		expect(content).toContain('[[Harold James 1|Harold James]]');
		expect(content).toContain('[[Harold James 2|Harold James]]');
	});

	it('emits [[basename|name]] for place via placeBasename', async () => {
		const { service, app } = makeService();

		const file = await service.createEvent({
			title: 'Christening',
			eventType: 'christening',
			datePrecision: 'exact',
			date: '1880-06-15',
			place: 'Springfield',
			placeBasename: 'Springfield IL',
		});

		const content = await app.vault.read(file);
		expect(content).toContain('place: "[[Springfield IL|Springfield]]"');
	});

	it('preserves index alignment when legacy `person` is shifted to front of persons', async () => {
		const { service, app } = makeService();

		// Mixed legacy + new: `person` is the primary, `persons` is the rest.
		// The service unshifts `person` to position 0 and must shift
		// `personBasename` along with it so basenames stay aligned.
		const file = await service.createEvent({
			title: 'Wedding',
			eventType: 'marriage',
			datePrecision: 'exact',
			date: '1900-05-01',
			person: 'Harold James',
			personBasename: 'Harold James 2',
			persons: ['Mary Ellen Smith'],
			personsBasenames: ['Mary Ellen Smith Jr'],
		});

		const content = await app.vault.read(file);
		expect(content).toContain('[[Harold James 2|Harold James]]');
		expect(content).toContain('[[Mary Ellen Smith Jr|Mary Ellen Smith]]');
	});
});
