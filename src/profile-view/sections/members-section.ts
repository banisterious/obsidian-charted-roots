/**
 * Members Section (Organization)
 *
 * Displays organization members grouped by role with current/former
 * status, dates, and clickable links. Grouping + ordering rules match
 * the dynamic Members block (#535) so the two surfaces stay in sync.
 */

import type { App } from 'obsidian';
import type { OrganizationInfo, PersonMembership } from '../../organizations/types/organization-types';
import { groupMembersByRole } from '../../organizations/utils/group-members-by-role';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface MembersSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

/**
 * Render a single member row with name, role label (if needed),
 * dates, and current-badge.
 */
function renderMemberRow(
	container: HTMLElement,
	member: PersonMembership,
	options: MembersSectionOptions
): void {
	const row = container.createDiv({ cls: 'cr-profile__member-row' });

	const link = row.createSpan({
		text: member.personName,
		cls: 'cr-profile__entity-link'
	});

	if (member.personCrId) {
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

	if (member.from || member.to) {
		const dates = member.from && member.to
			? `${member.from} – ${member.to}`
			: member.from || `– ${member.to}`;
		row.createSpan({ text: dates, cls: 'cr-profile__member-dates' });
	}

	if (member.isCurrent) {
		row.createSpan({ text: 'Current', cls: 'cr-profile__member-badge cr-profile__member-badge--current' });
	}
}

export function renderMembersSection(
	parent: HTMLElement,
	members: PersonMembership[],
	org: OrganizationInfo | undefined,
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

	// Sort by name (current-first then by name) before grouping so each
	// role bucket reads in a stable, alphabetised order. Mirrors the
	// dynamic Members block's default `sort: 'name'` behavior.
	const sorted = [...members].sort((a, b) => {
		if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
		return a.personName.localeCompare(b.personName);
	});

	// Group by role using the org's declared role-order (if any) for
	// the pinned-role chain; remaining roles fall through alphabetically;
	// the no-role group is always last.
	const groups = groupMembersByRole(
		sorted.map(m => ({ ...m, role: m.role || '' })),
		org?.roles
	);

	const list = content.createDiv({ cls: 'cr-profile__members-list' });

	// If only one group AND it's the no-role catch-all, render flat
	// without the redundant "Members" heading (matches the dynamic
	// block's heading-suppression rule).
	const onlyNoRole = groups.size === 1 && groups.has('Members');

	for (const [heading, entries] of groups) {
		if (entries.length === 0) continue;

		const group = list.createDiv({ cls: 'cr-profile__rel-group' });
		if (!onlyNoRole) {
			group.createSpan({ text: heading, cls: 'cr-profile__rel-group-title' });
		}
		for (const entry of entries) {
			renderMemberRow(group, entry, options);
		}
	}
}
