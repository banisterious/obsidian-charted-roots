/**
 * Members Section (Organization)
 *
 * Displays a flat list of organization members with roles,
 * dates, and current/former status.
 */

import type { App } from 'obsidian';
import type { PersonMembership } from '../../organizations/types/organization-types';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface MembersSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

export function renderMembersSection(
	parent: HTMLElement,
	members: PersonMembership[],
	options: MembersSectionOptions
): void {
	const count = members.length;
	const summary = `${count} member${count !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId: 'members',
		title: 'Members',
		summary,
		expanded: options.sectionStates['members'] ?? true,
		onToggle: options.onToggle,
		icon: 'users'
	});
	if (!content) return;

	if (count === 0) {
		content.createDiv({ cls: 'cr-profile__section-empty', text: 'No members found' });
		return;
	}

	const list = content.createDiv({ cls: 'cr-profile__members-list' });
	for (const member of members) {
		const row = list.createDiv({ cls: 'cr-profile__member-row' });

		// Person name (clickable)
		const link = row.createSpan({
			text: member.personName,
			cls: 'cr-profile__entity-link'
		});

		if (member.personCrId) {
			// Resolve file for navigation
			const files = options.app.vault.getMarkdownFiles();
			const personFile = files.find(f => {
				const cache = options.app.metadataCache.getFileCache(f);
				return cache?.frontmatter?.cr_id === member.personCrId;
			});
			if (personFile) {
				link.addEventListener('click', () => {
					options.onEntityLinkClick(member.personCrId, member.personName, 'person', personFile.path);
				});
			}
		}

		// Role
		if (member.role) {
			row.createSpan({ text: member.role, cls: 'cr-profile__member-role' });
		}

		// Dates
		if (member.from || member.to) {
			const dates = member.from && member.to
				? `${member.from} – ${member.to}`
				: member.from || `– ${member.to}`;
			row.createSpan({ text: dates, cls: 'cr-profile__member-dates' });
		}

		// Current/former badge
		if (member.isCurrent) {
			row.createSpan({ text: 'Current', cls: 'cr-profile__member-badge cr-profile__member-badge--current' });
		}
	}
}
