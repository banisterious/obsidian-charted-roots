import { afterEach, describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { CalendariumBridge } from '../src/integrations/calendarium-bridge';

/**
 * #725 — Calendarium calendars never appeared in any CR menu or setting.
 * Root cause: the bridge's `this.api` is only populated by the async
 * `initialize()` (which waits on `onSettingsLoaded`), but most read paths —
 * the event-modal dropdown, the sync date-system path — never called it, so
 * `importCalendars()` always returned []. The fix grabs `window.Calendarium`
 * synchronously on read (`ensureApi`), so calendars load without depending on
 * a prior `initialize()` call. These tests fence that: a present global yields
 * calendars from a fresh bridge with no initialize(); an absent one yields [].
 */

interface FakeCalendar {
	name: string;
	static?: { months?: { name: string }[]; eras?: unknown[] };
}

function fakeCalendariumApi(calendars: FakeCalendar[]) {
	return {
		getCalendars: () => calendars.map(c => c.name),
		getAPI: (name: string) => {
			const cal = calendars.find(c => c.name === name);
			if (!cal) throw new ReferenceError('No calendar store by that name exists.');
			return { getObject: () => cal };
		},
		onSettingsLoaded: (cb: () => void) => cb(),
	};
}

function setGlobal(api: unknown): void {
	(globalThis as unknown as { window: { Calendarium?: unknown } }).window = { Calendarium: api };
}

afterEach(() => {
	delete (globalThis as unknown as { window?: unknown }).window;
});

describe('CalendariumBridge — synchronous API grab (#725)', () => {
	it('imports calendars from window.Calendarium without a prior initialize() call', () => {
		setGlobal(fakeCalendariumApi([
			{ name: 'Middle-earth', static: { months: [{ name: 'Narvinyë' }] } },
			{ name: 'Harptos', static: { months: [{ name: 'Hammer' }] } },
		]));

		const bridge = new CalendariumBridge({} as App);
		// No initialize() — the regression was that nothing ever called it.
		const systems = bridge.importCalendars();

		expect(systems.map(s => s.name).sort()).toEqual(['Harptos', 'Middle-earth']);
	});

	it('returns no calendars when window.Calendarium is absent', () => {
		(globalThis as unknown as { window: Record<string, unknown> }).window = {};
		const bridge = new CalendariumBridge({} as App);
		expect(bridge.importCalendars()).toEqual([]);
	});

	it('skips an unknown calendar name without throwing (getAPI throws on miss)', () => {
		const api = fakeCalendariumApi([{ name: 'Real', static: { months: [{ name: 'M1' }] } }]);
		// getCalendars advertises a name getAPI then rejects — must not crash import.
		api.getCalendars = () => ['Real', 'Ghost'];
		setGlobal(api);

		const bridge = new CalendariumBridge({} as App);
		const systems = bridge.importCalendars();
		expect(systems.map(s => s.name)).toEqual(['Real']);
	});
});
