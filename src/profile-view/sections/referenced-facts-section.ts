/**
 * Referenced Facts Section (Source)
 *
 * Displays entities that cite this source, grouped by entity,
 * showing the specific facts each entity cites.
 */

import type { App } from 'obsidian';
import type { ReferencedFactGroup, SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface ReferencedFactsSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

export function renderReferencedFactsSection(
	parent: HTMLElement,
	factGroups: ReferencedFactGroup[],
	options: ReferencedFactsSectionOptions
): void {
	const totalFacts = factGroups.reduce((sum, g) => sum + g.facts.length, 0);
	const entityCount = factGroups.length;
	const summary = totalFacts > 0
		? `${totalFacts} fact${totalFacts !== 1 ? 's' : ''} across ${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'}`
		: 'No references found';

	const content = renderProfileSection(parent, {
		sectionId: 'referenced-facts',
		title: 'Referenced facts',
		summary,
		expanded: options.sectionStates['referenced-facts'] ?? true,
		onToggle: options.onToggle,
		icon: 'file-search'
	});
	if (!content) return;

	if (factGroups.length === 0) {
		content.createDiv({ cls: 'cr-profile__section-empty', text: 'No entities reference this source' });
		return;
	}

	for (const group of factGroups) {
		const groupEl = content.createDiv({ cls: 'cr-profile__fact-group' });

		// Entity name (clickable)
		const header = groupEl.createDiv({ cls: 'cr-profile__fact-group-header' });
		const link = header.createSpan({
			text: group.entityName,
			cls: 'cr-profile__entity-link'
		});

		if (group.entityCrId) {
			link.addEventListener('click', () => {
				options.onEntityLinkClick(
					group.entityCrId,
					group.entityName,
					'person', // Most common; could be enhanced to detect type
					group.entityFilePath
				);
			});
		}

		// Facts list
		const factList = groupEl.createDiv({ cls: 'cr-profile__fact-list' });
		for (const fact of group.facts) {
			const factRow = factList.createDiv({ cls: 'cr-profile__fact-row' });
			factRow.createSpan({
				text: fact.factKey.replace(/_/g, ' '),
				cls: 'cr-profile__fact-key'
			});
			factRow.createSpan({
				text: fact.factValue,
				cls: 'cr-profile__fact-value'
			});
		}
	}
}
