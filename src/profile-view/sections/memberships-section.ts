/**
 * Memberships Section (Person)
 *
 * Displays the organizations a person belongs to (#536), mirroring the
 * Organization Profile View's Members section in the inverse direction.
 * Each row shows the role label, organization link, date range, current
 * badge if applicable, and per-membership notes beneath. Visible only
 * when the person has at least one membership — hidden otherwise.
 */

import type { App, TFile } from 'obsidian';
import type { PersonMembership } from '../../organizations/types/organization-types';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface MembershipsSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

/** Resolve an organization wikilink target to a TFile via vault lookup. */
function resolveOrgFile(
	memb: PersonMembership,
	app: App
): TFile | null {
	if (memb.org?.file) return memb.org.file;
	if (!memb.orgId) return null;
	const files = app.vault.getMarkdownFiles();
	return files.find(f => {
		const cache = app.metadataCache.getFileCache(f);
		return cache?.frontmatter?.cr_id === memb.orgId;
	}) ?? null;
}

/** Display name for the org — prefers the resolved info, falls back to the raw wikilink. */
function orgDisplayName(memb: PersonMembership): string {
	if (memb.org?.name) return memb.org.name;
	const link = memb.orgLink || '';
	const inner = link.replace(/^\[\[|\]\]$/g, '');
	const aliasSplit = inner.split('|');
	return aliasSplit[aliasSplit.length - 1] || link;
}

export function renderMembershipsSection(
	parent: HTMLElement,
	memberships: PersonMembership[],
	options: MembershipsSectionOptions
): void {
	const count = memberships.length;
	if (count === 0) return;

	const summary = `${count} membership${count !== 1 ? 's' : ''}`;
	const content = renderProfileSection(parent, {
		sectionId: 'memberships',
		title: 'Memberships',
		summary,
		expanded: options.sectionStates['memberships'] ?? true,
		onToggle: options.onToggle,
		icon: 'briefcase'
	});
	if (!content) return;

	for (const memb of memberships) {
		// Wrap each row so any per-membership notes can sit on their own
		// line beneath without breaking the row's flex layout — same
		// pattern the Other Relationships subsection uses for #530 notes.
		const item = content.createDiv({ cls: 'cr-profile__rel-item' });
		const row = item.createDiv({ cls: 'cr-profile__rel-row' });

		row.createSpan({
			text: memb.role || 'Member',
			cls: 'cr-profile__rel-type-label'
		});

		const orgName = orgDisplayName(memb);
		const link = row.createSpan({
			text: orgName,
			cls: 'cr-profile__entity-link'
		});

		const orgFile = resolveOrgFile(memb, options.app);
		if (memb.orgId && orgFile) {
			link.addEventListener('click', () => {
				options.onEntityLinkClick(memb.orgId!, orgName, 'organization', orgFile.path);
			});
		}

		if (memb.from || memb.to) {
			const dates = memb.from && memb.to
				? `${memb.from} – ${memb.to}`
				: memb.from || `– ${memb.to}`;
			row.createSpan({ text: dates, cls: 'cr-profile__rel-dates' });
		}

		if (memb.isCurrent) {
			row.createSpan({
				text: 'Current',
				cls: 'cr-profile__member-badge cr-profile__member-badge--current'
			});
		}

		if (memb.notes && memb.notes.trim()) {
			item.createDiv({
				text: memb.notes,
				cls: 'cr-profile__rel-notes'
			});
		}
	}
}
