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
import { capitalize } from '../../utils/format-utils';

/**
 * Test whether a relationship belongs in the "Other" subsection.
 * Excludes family-category types and built-in types with familyGraphMapping
 * (already rendered in the Family subsection via PersonNode properties).
 */
export function isOtherRelationship(rel: ParsedRelationship): boolean {
	if ((rel.type?.category || 'other') === 'family') return false;
	if (rel.type?.builtIn && rel.type?.includeOnFamilyTree && rel.type?.familyGraphMapping) return false;
	return true;
}

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
	// Other relationships subsection
	// Exclude: family category (shown above), built-in types with familyGraphMapping (already in PersonNode).
	// Custom types with familyGraphMapping are kept — they appear here with their custom type names
	// (e.g., "Sire" instead of generic "Parent"), and the Family section suppresses the generic entry.
	// Deduplicate direct + inverse entries for the same relationship.
	const allOther = deduplicateRelationships(
		[...data.relationships, ...data.inverseRelationships].filter(isOtherRelationship)
	);

	// Build set of crIds covered by custom Other relationships so the Family section
	// can suppress generic entries for them (e.g., skip "Parent" when "Sire" covers it)
	const otherTargetCrIds = new Set<string>();
	for (const rel of allOther) {
		if (rel.targetCrId && rel.type?.familyGraphMapping) {
			otherTargetCrIds.add(rel.targetCrId);
		}
	}

	// Adjust family count: subtract entries that will be suppressed in favor of custom Other relationships
	const adjustedFamilyCount = options.familyCount - otherTargetCrIds.size;
	const totalCount = adjustedFamilyCount + allOther.length;
	const summaryParts: string[] = [];
	if (adjustedFamilyCount > 0) summaryParts.push(`${adjustedFamilyCount} family`);
	if (allOther.length > 0) summaryParts.push(`${allOther.length} other`);
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
	if (adjustedFamilyCount > 0) {
		renderFamilySubsection(content, data, options, otherTargetCrIds);
	}

	if (allOther.length > 0) {
		renderOtherSubsection(content, allOther, options);
	}
}

function renderFamilySubsection(
	container: HTMLElement,
	data: PersonProfileData,
	options: RelationshipsSectionOptions,
	otherTargetCrIds: Set<string>
): void {
	const familyEl = container.createDiv({ cls: 'cr-profile__relationships-family' });
	const node = data.node;

	// Parents — skip IDs already covered by a custom relationship in the Other section
	const parentEntries: { label: string; crId: string }[] = [];
	if (node.fatherCrId && !otherTargetCrIds.has(node.fatherCrId)) {
		parentEntries.push({ label: 'Father', crId: node.fatherCrId });
	}
	if (node.motherCrId && !otherTargetCrIds.has(node.motherCrId)) {
		parentEntries.push({ label: 'Mother', crId: node.motherCrId });
	}
	for (const id of node.parentCrIds || []) {
		if (id !== node.fatherCrId && id !== node.motherCrId && !otherTargetCrIds.has(id)) {
			parentEntries.push({ label: 'Parent', crId: id });
		}
	}
	for (const id of node.stepfatherCrIds || []) {
		if (!otherTargetCrIds.has(id)) {
			parentEntries.push({ label: 'Step-father', crId: id });
		}
	}
	for (const id of node.stepmotherCrIds || []) {
		if (!otherTargetCrIds.has(id)) {
			parentEntries.push({ label: 'Step-mother', crId: id });
		}
	}
	if (node.adoptiveFatherCrId && !otherTargetCrIds.has(node.adoptiveFatherCrId)) {
		parentEntries.push({ label: 'Adoptive father', crId: node.adoptiveFatherCrId });
	}
	if (node.adoptiveMotherCrId && !otherTargetCrIds.has(node.adoptiveMotherCrId)) {
		parentEntries.push({ label: 'Adoptive mother', crId: node.adoptiveMotherCrId });
	}
	for (const id of node.adoptiveParentCrIds || []) {
		if (id !== node.adoptiveFatherCrId && id !== node.adoptiveMotherCrId && !otherTargetCrIds.has(id)) {
			parentEntries.push({ label: 'Adoptive parent', crId: id });
		}
	}

	if (parentEntries.length > 0) {
		renderRelGroup(familyEl, 'Parents', parentEntries, options);
	}

	// Spouses — skip IDs already covered by a custom relationship in the Other section
	if (node.spouseCrIds && node.spouseCrIds.length > 0) {
		const spouseEntries = node.spouseCrIds
			.filter(id => !otherTargetCrIds.has(id))
			.map(id => ({ label: 'Spouse', crId: id }));
		if (spouseEntries.length > 0) {
			renderRelGroup(familyEl, 'Spouses', spouseEntries, options);
		}
	}

	// Children — skip IDs already covered by a custom relationship in the Other section.
	// A child can appear in multiple arrays (biological + step, biological + adopted);
	// label by the most specific marker, with adopted/step taking precedence over plain
	// "Child" so the relationship type isn't lost (#443).
	const childEntries: { label: string; crId: string }[] = [];
	const adoptedSet = new Set(node.adoptedChildCrIds || []);
	const stepchildSet = new Set(node.stepchildrenCrIds || []);
	for (const id of node.childrenCrIds || []) {
		if (otherTargetCrIds.has(id) || adoptedSet.has(id) || stepchildSet.has(id)) continue;
		childEntries.push({ label: 'Child', crId: id });
	}
	for (const id of node.adoptedChildCrIds || []) {
		if (!otherTargetCrIds.has(id)) {
			childEntries.push({ label: 'Adopted child', crId: id });
		}
	}
	for (const id of node.stepchildrenCrIds || []) {
		if (!otherTargetCrIds.has(id)) {
			childEntries.push({ label: 'Stepchild', crId: id });
		}
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
			text: capitalize(category),
			cls: 'cr-profile__rel-category-label'
		});

		for (const rel of rels) {
			// Wrap each relationship in an item container so the notes line
			// can sit directly beneath the row without breaking flex layout.
			const item = catEl.createDiv({ cls: 'cr-profile__rel-item' });

			const row = item.createDiv({ cls: 'cr-profile__rel-row' });
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

			// Per-relationship notes (#530). Rendered on its own line below the row.
			if (rel.notes && rel.notes.trim()) {
				item.createDiv({
					text: rel.notes,
					cls: 'cr-profile__rel-notes'
				});
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
