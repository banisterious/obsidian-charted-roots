/**
 * Sources Section
 *
 * Renders a list of source references (wikilinks) with resolved
 * source type badges where possible.
 */

import type { App } from 'obsidian';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface SourcesSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
	sectionId?: string;
}

export function renderSourcesSection(
	parent: HTMLElement,
	sourceLinks: string[],
	options: SourcesSectionOptions
): void {
	const sectionId = options.sectionId || 'sources';
	const count = sourceLinks.length;
	const summary = `${count} source${count !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId,
		title: 'Sources',
		summary,
		expanded: options.sectionStates[sectionId] ?? false,
		onToggle: options.onToggle,
		icon: 'book-open'
	});
	if (!content) return;

	if (count === 0) {
		content.createDiv({ cls: 'cr-profile__section-empty', text: 'No sources attached' });
		return;
	}

	const list = content.createDiv({ cls: 'cr-profile__sources-list' });
	for (const sourceLink of sourceLinks) {
		const name = stripWikilink(sourceLink);
		const row = list.createDiv({ cls: 'cr-profile__source-row' });

		// Try to resolve to get more metadata
		const file = options.app.metadataCache.getFirstLinkpathDest(name, '');

		const link = row.createSpan({
			text: name,
			cls: 'cr-profile__entity-link'
		});

		if (file) {
			const cache = options.app.metadataCache.getFileCache(file);
			const crId = cache?.frontmatter?.cr_id as string | undefined;
			const sourceType = cache?.frontmatter?.source_type as string | undefined;

			if (sourceType) {
				row.createSpan({ text: sourceType, cls: 'cr-profile__source-type-badge' });
			}

			if (crId) {
				link.addEventListener('click', () => {
					options.onEntityLinkClick(crId, name, 'source', file.path);
				});
			}
		}
	}
}

function stripWikilink(link: string): string {
	return link.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
}
