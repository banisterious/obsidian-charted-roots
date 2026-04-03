/**
 * Source Hierarchy Section
 *
 * Displays parent source, child documents, and sibling sources
 * for source notes with hierarchy relationships (#338).
 */

import { setIcon } from 'obsidian';
import type { App } from 'obsidian';
import type { SourceNote } from '../../sources/types/source-types';
import type { SectionToggleFn, EntityLinkClickFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';
import { getSourceType } from '../../sources/types/source-types';

interface SourceHierarchySectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
}

/**
 * Render parent source link at top of profile
 */
export function renderParentSourceSection(
	parent: HTMLElement,
	parentSource: SourceNote,
	options: SourceHierarchySectionOptions
): void {
	const content = renderProfileSection(parent, {
		sectionId: 'parent-source',
		title: 'Parent source',
		summary: parentSource.title,
		expanded: options.sectionStates['parent-source'] ?? true,
		onToggle: options.onToggle,
		icon: 'arrow-up'
	});
	if (!content) return;

	const row = content.createDiv({ cls: 'cr-profile__source-hierarchy-item' });

	// Source type badge
	renderSourceTypeBadge(row, parentSource.sourceType);

	// Title (clickable → open note)
	const link = row.createSpan({
		text: parentSource.title,
		cls: 'cr-profile__entity-link'
	});
	link.addEventListener('click', () => {
		options.onEntityLinkClick(
			parentSource.crId,
			parentSource.title,
			'source',
			parentSource.filePath
		);
	});

	// Date
	if (parentSource.date) {
		row.createSpan({
			text: parentSource.date,
			cls: 'cr-profile__source-hierarchy-date'
		});
	}
}

/**
 * Render child documents section
 */
export function renderChildSourcesSection(
	parent: HTMLElement,
	childSources: SourceNote[],
	options: SourceHierarchySectionOptions
): void {
	const summary = `${childSources.length} document${childSources.length !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId: 'child-sources',
		title: 'Child documents',
		summary,
		expanded: options.sectionStates['child-sources'] ?? true,
		onToggle: options.onToggle,
		icon: 'files'
	});
	if (!content) return;

	renderSourceList(content, childSources, options);
}

/**
 * Render sibling sources section (related documents with the same parent)
 */
export function renderSiblingSourcesSection(
	parent: HTMLElement,
	siblingSources: SourceNote[],
	options: SourceHierarchySectionOptions
): void {
	const summary = `${siblingSources.length} document${siblingSources.length !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId: 'sibling-sources',
		title: 'Related documents',
		summary,
		expanded: options.sectionStates['sibling-sources'] ?? false,
		onToggle: options.onToggle,
		icon: 'git-branch'
	});
	if (!content) return;

	renderSourceList(content, siblingSources, options);
}

/**
 * Render a collapsible source tree showing parent → children hierarchy
 */
export function renderSourceTreeSection(
	parent: HTMLElement,
	rootSource: SourceNote,
	childSources: SourceNote[],
	options: SourceHierarchySectionOptions
): void {
	const total = childSources.length + 1;
	const summary = `${total} document${total !== 1 ? 's' : ''} in hierarchy`;

	const content = renderProfileSection(parent, {
		sectionId: 'source-tree',
		title: 'Source tree',
		summary,
		expanded: options.sectionStates['source-tree'] ?? false,
		onToggle: options.onToggle,
		icon: 'list-tree'
	});
	if (!content) return;

	const tree = content.createDiv({ cls: 'cr-profile__source-tree' });

	// Root node (this source)
	const rootNode = tree.createDiv({ cls: 'cr-profile__source-tree-root' });
	renderSourceTypeBadge(rootNode, rootSource.sourceType);
	rootNode.createSpan({
		text: rootSource.title,
		cls: 'cr-profile__source-tree-current'
	});
	if (rootSource.date) {
		rootNode.createSpan({
			text: rootSource.date,
			cls: 'cr-profile__source-hierarchy-date'
		});
	}

	// Child nodes (indented)
	for (const child of childSources) {
		const childNode = tree.createDiv({ cls: 'cr-profile__source-tree-child' });

		renderSourceTypeBadge(childNode, child.sourceType);

		const link = childNode.createSpan({
			text: child.title,
			cls: 'cr-profile__entity-link'
		});
		link.addEventListener('click', () => {
			options.onEntityLinkClick(
				child.crId,
				child.title,
				'source',
				child.filePath
			);
		});

		if (child.date) {
			childNode.createSpan({
				text: child.date,
				cls: 'cr-profile__source-hierarchy-date'
			});
		}
	}
}

/**
 * Render a list of source notes with type badge, title, and date
 */
function renderSourceList(
	container: HTMLElement,
	sources: SourceNote[],
	options: SourceHierarchySectionOptions
): void {
	for (const source of sources) {
		const row = container.createDiv({ cls: 'cr-profile__source-hierarchy-item' });

		// Source type badge
		renderSourceTypeBadge(row, source.sourceType);

		// Title (clickable → open note)
		const link = row.createSpan({
			text: source.title,
			cls: 'cr-profile__entity-link'
		});
		link.addEventListener('click', () => {
			options.onEntityLinkClick(
				source.crId,
				source.title,
				'source',
				source.filePath
			);
		});

		// Date
		if (source.date) {
			row.createSpan({
				text: source.date,
				cls: 'cr-profile__source-hierarchy-date'
			});
		}
	}
}

/**
 * Render a small source type badge
 */
function renderSourceTypeBadge(container: HTMLElement, sourceType: string): void {
	const typeDef = getSourceType(sourceType, [], true);
	const badge = container.createSpan({ cls: 'cr-profile__source-type-badge' });

	if (typeDef) {
		const iconEl = badge.createSpan({ cls: 'cr-profile__source-type-icon' });
		setIcon(iconEl, typeDef.icon);
		if (typeDef.color) {
			iconEl.style.color = typeDef.color;
		}
	}

	badge.createSpan({
		text: typeDef?.name || sourceType,
		cls: 'cr-profile__source-type-label'
	});
}
