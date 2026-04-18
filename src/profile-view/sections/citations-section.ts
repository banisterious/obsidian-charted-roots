/**
 * Citations Section
 *
 * Renders citation notes for a person in the Profile View,
 * grouped by source with page references and quality indicators.
 */

import type { App } from 'obsidian';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';
import type { CitationNote } from '../../sources/types/citation-types';
import { CITATION_QUALITY_LABELS, type CitationQuality } from '../../sources/types/citation-types';

interface CitationsSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

export function renderCitationsSection(
	parent: HTMLElement,
	citations: CitationNote[],
	options: CitationsSectionOptions
): void {
	const sectionId = 'citations';
	const count = citations.length;
	const summary = `${count} citation${count !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId,
		title: 'Citations',
		summary,
		expanded: options.sectionStates[sectionId] ?? false,
		onToggle: options.onToggle,
		icon: 'quote',
		hidden: count === 0
	});
	if (!content) return;

	// Group citations by source
	const bySource = new Map<string, CitationNote[]>();
	for (const citation of citations) {
		const sourceKey = citation.source || 'Unknown source';
		const existing = bySource.get(sourceKey) || [];
		existing.push(citation);
		bySource.set(sourceKey, existing);
	}

	const list = content.createDiv({ cls: 'cr-profile__citations-list' });

	for (const [sourceWikilink, sourceCitations] of bySource) {
		const sourceName = stripWikilink(sourceWikilink);
		const sourceGroup = list.createDiv({ cls: 'cr-profile__citation-group' });

		// Source header
		const sourceHeader = sourceGroup.createDiv({ cls: 'cr-profile__citation-source' });
		const sourceLink = sourceHeader.createSpan({
			text: sourceName,
			cls: 'cr-profile__entity-link'
		});

		// Resolve source for click navigation
		const sourceFile = options.app.metadataCache.getFirstLinkpathDest(sourceName, '');
		if (sourceFile) {
			const cache = options.app.metadataCache.getFileCache(sourceFile);
			const sourceCrId = cache?.frontmatter?.cr_id as string | undefined;
			if (sourceCrId) {
				sourceLink.addEventListener('click', () => {
					options.onEntityLinkClick(sourceCrId, sourceName, 'source', sourceFile.path);
				});
			}
		}

		// Citation entries under this source
		for (const citation of sourceCitations) {
			const row = sourceGroup.createDiv({ cls: 'cr-profile__citation-row' });

			// Fact label
			const factLabel = formatFactLabel(citation.fact);
			row.createSpan({ text: factLabel, cls: 'cr-profile__citation-fact' });

			// Page reference
			if (citation.page) {
				row.createSpan({ text: citation.page, cls: 'cr-profile__citation-page' });
			}

			// Quality badge
			if (citation.quality !== undefined) {
				const qualityLabel = CITATION_QUALITY_LABELS[citation.quality] || `Q${citation.quality}`;
				const badge = row.createSpan({
					text: qualityLabel,
					cls: 'cr-profile__citation-quality'
				});
				badge.dataset.quality = String(citation.quality);
			}
		}
	}
}

/**
 * Convert a fact key to a human-readable label
 */
function formatFactLabel(fact: string): string {
	return fact
		.replace(/_/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Strip wikilink brackets from a string
 */
function stripWikilink(link: string): string {
	const match = link.match(/\[\[([^\]|]+)/);
	return match ? match[1] : link;
}
