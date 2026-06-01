/**
 * Participants Section (Event)
 *
 * Displays the principal person and other participants
 * for an event note.
 */

import type { App } from 'obsidian';
import type { EventNote } from '../../events/types/event-types';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';
import { extractDisplayLabel } from '../../utils/wikilink-resolver';

interface ParticipantsSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

export function renderParticipantsSection(
	parent: HTMLElement,
	event: EventNote,
	options: ParticipantsSectionOptions
): void {
	const participants: string[] = [];
	if (event.person) participants.push(event.person);
	if (event.persons) {
		for (const p of event.persons) {
			if (!participants.includes(p)) participants.push(p);
		}
	}

	const count = participants.length;
	const summary = `${count} participant${count !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId: 'participants',
		title: 'Participants',
		summary,
		expanded: options.sectionStates['participants'] ?? true,
		onToggle: options.onToggle,
		hidden: count === 0,
		icon: 'users'
	});
	if (!content) return;

	const list = content.createDiv({ cls: 'cr-profile__participants-list' });
	for (let i = 0; i < participants.length; i++) {
		const personLink = participants[i];
		// Display the alias (e.g. `[[Filename|Display]]` → `Display`); fall back
		// to the filename for the linkpath lookup used for navigation (#658).
		const displayName = extractDisplayLabel(personLink);
		const linkPath = stripWikilink(personLink);
		const row = list.createDiv({ cls: 'cr-profile__participant-row' });

		const link = row.createSpan({
			text: displayName,
			cls: 'cr-profile__entity-link'
		});

		// Mark principal
		if (i === 0 && event.person) {
			row.createSpan({ text: '(principal)', cls: 'cr-profile__participant-badge' });
		}

		// Resolve file for navigation
		const file = options.app.metadataCache.getFirstLinkpathDest(linkPath, '');
		if (file) {
			link.addEventListener('click', () => {
				const cache = options.app.metadataCache.getFileCache(file);
				const crId = cache?.frontmatter?.cr_id as string | undefined;
				if (crId) {
					const personName = (cache?.frontmatter?.name as string) || file.basename;
					options.onEntityLinkClick(crId, personName, 'person', file.path);
				}
			});
		}
	}
}

function stripWikilink(link: string): string {
	return link.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
}
