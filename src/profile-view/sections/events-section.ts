/**
 * Events Section
 *
 * Renders a list of events for any entity type. For persons, reuses
 * renderPersonTimeline(). For places/organizations, displays a simpler list.
 */

import type { App, TFile } from 'obsidian';
import type { EventNote } from '../../events/types/event-types';
import { getEventType } from '../../events/types/event-types';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';
import { renderPersonTimeline } from '../../events/ui/person-timeline';
import { createLucideIcon } from '../../ui/lucide-icons';

interface EventsSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
	plugin: import('../../../main').default;
	sectionId?: string;
	title?: string;
	personFile?: TFile;
	personName?: string;
}

export function renderEventsSection(
	parent: HTMLElement,
	events: EventNote[],
	options: EventsSectionOptions
): void {
	const sectionId = options.sectionId || 'events';
	const title = options.title || 'Events';
	const count = events.length;
	const summary = `${count} event${count !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId,
		title,
		summary,
		expanded: options.sectionStates[sectionId] ?? true,
		onToggle: options.onToggle,
		icon: 'calendar'
	});
	if (!content) return;

	if (count === 0) {
		content.createDiv({ cls: 'cr-profile__section-empty', text: 'No events recorded' });
		return;
	}

	// Try to use renderPersonTimeline for person events
	if (options.personFile && options.personName) {
		const eventService = options.plugin.getEventService();
		if (eventService) {
			try {
				renderPersonTimeline(
					content,
					options.personFile,
					options.personName,
					options.app,
					options.plugin.settings,
					eventService,
					{ showEmptyState: true }
				);
				return;
			} catch {
				// Fallback to simple list
			}
		}
	}

	// Simple event list for non-person entities
	const list = content.createDiv({ cls: 'cr-profile__events-list' });
	for (const event of events) {
		const row = list.createDiv({ cls: 'cr-profile__event-row' });

		if (event.date) {
			row.createSpan({ text: String(event.date), cls: 'cr-profile__event-date' });
		}

		const titleEl = row.createSpan({ cls: 'cr-profile__event-title' });
		if (event.crId && event.file) {
			const link = titleEl.createSpan({
				text: event.title || event.file.basename,
				cls: 'cr-profile__entity-link'
			});
			link.addEventListener('click', () => {
				options.onEntityLinkClick(event.crId, event.title || event.file.basename, 'event', event.file.path);
			});
		} else {
			titleEl.textContent = event.title || 'Untitled event';
		}

		if (event.eventType) {
			// Resolve the type id to its catalog definition so custom and
			// built-in types show a friendly name and icon instead of the raw
			// slug (e.g. `lore_event` → "Lore event") (#659).
			const settings = options.plugin.settings;
			const typeDef = getEventType(
				event.eventType,
				settings.customEventTypes || [],
				settings.showBuiltInEventTypes !== false,
				settings.eventTypeCustomizations
			);
			const typeEl = row.createSpan({ cls: 'cr-profile__event-type-label' });
			if (typeDef) {
				typeEl.appendChild(createLucideIcon(typeDef.icon, 12));
				typeEl.appendText(` ${typeDef.name}`);
			} else {
				typeEl.textContent = event.eventType;
			}
		}
	}
}
