/**
 * Relationships Section (Person)
 *
 * Displays family relationships (expanded) and other relationships
 * (collapsed) with clickable entity links.
 */

import type { App } from 'obsidian';
import type { PersonProfileData, SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import type { ParsedRelationship } from '../../relationships/types/relationship-types';
import { renderProfileSection } from './section-base';

interface RelationshipsSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
	plugin: import('../../../main').default;
	familyCount: number;
	otherCount: number;
}

export function renderRelationshipsSection(
	parent: HTMLElement,
	data: PersonProfileData,
	options: RelationshipsSectionOptions
): void {
	const totalCount = options.familyCount + options.otherCount;
	const summaryParts: string[] = [];
	if (options.familyCount > 0) summaryParts.push(`${options.familyCount} family`);
	if (options.otherCount > 0) summaryParts.push(`${options.otherCount} other`);
	const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'None';

	const content = renderProfileSection(parent, {
		sectionId: 'relationships',
		title: 'Relationships',
		summary,
		expanded: options.sectionStates['relationships'] ?? true,
		onToggle: options.onToggle,
		hidden: totalCount === 0,
		icon: 'users'
	});
	if (!content) return;

	// Family subsection (always expanded)
	if (options.familyCount > 0) {
		renderFamilySubsection(content, data, options);
	}

	// Other relationships subsection
	// Exclude: family category (shown above), types with familyGraphMapping (already in PersonNode),
	// and deduplicate direct + inverse entries for the same relationship.
	const allOther = deduplicateRelationships(
		[...data.relationships, ...data.inverseRelationships]
			.filter(rel => {
				if ((rel.type?.category || 'other') === 'family') return false;
				if (rel.type?.includeOnFamilyTree && rel.type?.familyGraphMapping) return false;
				return true;
			})
	);
	if (allOther.length > 0) {
		renderOtherSubsection(content, allOther, options);
	}
}

function renderFamilySubsection(
	container: HTMLElement,
	data: PersonProfileData,
	options: RelationshipsSectionOptions
): void {
	const familyEl = container.createDiv({ cls: 'cr-profile__relationships-family' });
	const node = data.node;

	// Parents
	const parentEntries: { label: string; crId: string }[] = [];
	if (node.fatherCrId) parentEntries.push({ label: 'Father', crId: node.fatherCrId });
	if (node.motherCrId) parentEntries.push({ label: 'Mother', crId: node.motherCrId });
	for (const id of node.parentCrIds || []) {
		if (id !== node.fatherCrId && id !== node.motherCrId) {
			parentEntries.push({ label: 'Parent', crId: id });
		}
	}
	for (const id of node.stepfatherCrIds || []) {
		parentEntries.push({ label: 'Step-father', crId: id });
	}
	for (const id of node.stepmotherCrIds || []) {
		parentEntries.push({ label: 'Step-mother', crId: id });
	}
	if (node.adoptiveFatherCrId) parentEntries.push({ label: 'Adoptive father', crId: node.adoptiveFatherCrId });
	if (node.adoptiveMotherCrId) parentEntries.push({ label: 'Adoptive mother', crId: node.adoptiveMotherCrId });
	for (const id of node.adoptiveParentCrIds || []) {
		if (id !== node.adoptiveFatherCrId && id !== node.adoptiveMotherCrId) {
			parentEntries.push({ label: 'Adoptive parent', crId: id });
		}
	}

	if (parentEntries.length > 0) {
		renderRelGroup(familyEl, 'Parents', parentEntries, options);
	}

	// Spouses
	if (node.spouseCrIds && node.spouseCrIds.length > 0) {
		const spouseEntries = node.spouseCrIds.map(id => ({ label: 'Spouse', crId: id }));
		renderRelGroup(familyEl, 'Spouses', spouseEntries, options);
	}

	// Children
	const childEntries: { label: string; crId: string }[] = [];
	for (const id of node.childrenCrIds || []) {
		childEntries.push({ label: 'Child', crId: id });
	}
	for (const id of node.adoptedChildCrIds || []) {
		childEntries.push({ label: 'Adopted child', crId: id });
	}
	if (childEntries.length > 0) {
		renderRelGroup(familyEl, 'Children', childEntries, options);
	}
}

function renderOtherSubsection(
	container: HTMLElement,
	relationships: ParsedRelationship[],
	options: RelationshipsSectionOptions
): void {
	const otherEl = container.createDiv({ cls: 'cr-profile__relationships-other' });

	const header = otherEl.createDiv({ cls: 'cr-profile__rel-group-header' });
	header.createSpan({ text: 'Other relationships', cls: 'cr-profile__rel-group-title' });

	// Group by category
	const byCategory = new Map<string, ParsedRelationship[]>();
	for (const rel of relationships) {
		const category = rel.type?.category || 'other';
		if (!byCategory.has(category)) {
			byCategory.set(category, []);
		}
		byCategory.get(category)!.push(rel);
	}

	for (const [category, rels] of byCategory) {
		const catEl = otherEl.createDiv({ cls: 'cr-profile__rel-category' });
		catEl.createSpan({
			text: category.charAt(0).toUpperCase() + category.slice(1),
			cls: 'cr-profile__rel-category-label'
		});

		for (const rel of rels) {
			const row = catEl.createDiv({ cls: 'cr-profile__rel-row' });
			row.createSpan({
				text: rel.type?.name || rel.type?.id || 'Related',
				cls: 'cr-profile__rel-type-label'
			});

			const link = row.createSpan({
				text: rel.targetName,
				cls: 'cr-profile__entity-link'
			});

			if (rel.targetCrId && rel.targetFilePath) {
				link.addEventListener('click', () => {
					options.onEntityLinkClick(
						rel.targetCrId!,
						rel.targetName,
						'person',
						rel.targetFilePath!
					);
				});
			}

			if (rel.from || rel.to) {
				const dates = rel.from && rel.to ? `${rel.from} – ${rel.to}` : rel.from || `– ${rel.to}`;
				row.createSpan({ text: dates, cls: 'cr-profile__rel-dates' });
			}
		}
	}
}

function renderRelGroup(
	container: HTMLElement,
	groupLabel: string,
	entries: { label: string; crId: string }[],
	options: RelationshipsSectionOptions
): void {
	const group = container.createDiv({ cls: 'cr-profile__rel-group' });
	group.createSpan({ text: groupLabel, cls: 'cr-profile__rel-group-title' });

	for (const entry of entries) {
		const row = group.createDiv({ cls: 'cr-profile__rel-row' });
		row.createSpan({ text: entry.label, cls: 'cr-profile__rel-type-label' });

		// Resolve name via personIndex (cr_id → TFile → frontmatter name)
		const personFile = options.plugin.personIndex?.getFileByCrId(entry.crId) ?? null;
		let displayName = entry.crId;
		if (personFile) {
			const cache = options.app.metadataCache.getFileCache(personFile);
			displayName = (cache?.frontmatter?.name as string) || personFile.basename;
		}

		const link = row.createSpan({
			text: displayName,
			cls: 'cr-profile__entity-link'
		});

		if (personFile) {
			link.addEventListener('click', () => {
				options.onEntityLinkClick(entry.crId, displayName, 'person', personFile.path);
			});
		}
	}
}

/** Remove duplicate relationships (same source, target, and type). */
function deduplicateRelationships(rels: ParsedRelationship[]): ParsedRelationship[] {
	const seen = new Set<string>();
	return rels.filter(rel => {
		const key = `${rel.sourceCrId}:${rel.targetCrId || ''}:${rel.type.id}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
