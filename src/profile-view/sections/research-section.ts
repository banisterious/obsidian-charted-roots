/**
 * Research Activity Section
 *
 * Displays cross-project research activity for a person entity,
 * aggregating IRNs, log entries, journal/report mentions, and
 * surfacing project-level coverage.
 */

import type { App, TFile } from 'obsidian';
import { setIcon } from 'obsidian';
import type { SectionState, SectionToggleFn, EntityLinkClickFn } from '../profile-types';
import { renderProfileSection } from './section-base';
import type CanvasRootsPlugin from '../../../main';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';

/** A single research touchpoint for this person */
interface ResearchEntry {
	file: TFile;
	crType: string;
	date?: string;
	project?: string;
	result?: string;
	title: string;
}

/** Research entries grouped by project */
interface ProjectGroup {
	project: string;
	entries: ResearchEntry[];
	dateRange: string;
}

interface ResearchSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: App;
	plugin: CanvasRootsPlugin;
}

/**
 * Render the research activity section for a person profile
 */
export function renderResearchSection(
	parent: HTMLElement,
	personBasename: string,
	options: ResearchSectionOptions
): void {
	const sectionId = 'research';

	// Gather all research entries for this person
	const entries = gatherResearchEntries(personBasename, options.app);
	const groups = groupByProject(entries);
	const totalEntries = entries.length;
	const projectCount = groups.length;

	const summary = totalEntries === 0
		? 'No research'
		: `${totalEntries} item${totalEntries !== 1 ? 's' : ''} across ${projectCount} project${projectCount !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId,
		title: 'Research activity',
		summary,
		expanded: options.sectionStates[sectionId] ?? false,
		onToggle: options.onToggle,
		hidden: totalEntries === 0,
		icon: 'folder-search',
		contentRenderer: (contentEl: HTMLElement) => {
			renderResearchContent(contentEl, groups, options);
		}
	});

	if (!content) return;
}

/**
 * Scan the vault for research entities referencing this person
 */
function gatherResearchEntries(personBasename: string, app: App): ResearchEntry[] {
	const entries: ResearchEntry[] = [];
	const normalizedPerson = personBasename.toLowerCase();

	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm) continue;

		const crType = (fm.cr_type || fm.type) as string | undefined;
		if (!crType) continue;

		// Check research entity types
		if (crType === 'individual_research_note') {
			// IRN: check subject field
			const subject = resolvePersonRef(fm.subject);
			if (subject?.toLowerCase() === normalizedPerson) {
				entries.push({
					file,
					crType,
					date: typeof fm.date === 'string' ? fm.date : undefined,
					project: resolvePersonRef(fm.project || fm.up),
					title: typeof fm.name === 'string' ? fm.name : file.basename
				});
			}
		} else if (crType === 'research_log_entry') {
			// Log entry: check subject or person field
			const subject = resolvePersonRef(fm.subject || fm.person);
			if (subject?.toLowerCase() === normalizedPerson) {
				entries.push({
					file,
					crType,
					date: typeof fm.date === 'string' ? fm.date : undefined,
					project: resolvePersonRef(fm.project || fm.up),
					result: typeof fm.result === 'string' ? fm.result : undefined,
					title: typeof fm.searched_for === 'string'
						? fm.searched_for
						: (typeof fm.name === 'string' ? fm.name : file.basename)
				});
			}
		} else if (['research_journal', 'research_report', 'research_project'].includes(crType)) {
			// Check if the file's content references this person via wikilink
			// We check frontmatter links first (cheaper than reading file content)
			const links = cache?.links || [];
			const hasPersonLink = links.some(link =>
				link.link.toLowerCase() === normalizedPerson ||
				link.displayText?.toLowerCase() === normalizedPerson
			);
			if (hasPersonLink) {
				entries.push({
					file,
					crType,
					date: typeof fm.date === 'string' ? fm.date : undefined,
					project: crType === 'research_project'
						? (typeof fm.name === 'string' ? fm.name : file.basename)
						: resolvePersonRef(fm.project || fm.up),
					title: typeof fm.name === 'string' ? fm.name : file.basename
				});
			}
		}
	}

	// Sort by date descending (most recent first)
	entries.sort((a, b) => {
		if (!a.date && !b.date) return 0;
		if (!a.date) return 1;
		if (!b.date) return -1;
		return b.date.localeCompare(a.date);
	});

	return entries;
}

/**
 * Extract a person/project reference from a frontmatter value
 */
function resolvePersonRef(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	return extractWikilinkPath(value) || value;
}

/**
 * Group entries by project, with "Unassigned" for entries without a project
 */
function groupByProject(entries: ResearchEntry[]): ProjectGroup[] {
	const map = new Map<string, ResearchEntry[]>();

	for (const entry of entries) {
		const project = entry.project || 'Unassigned';
		if (!map.has(project)) {
			map.set(project, []);
		}
		map.get(project)!.push(entry);
	}

	const groups: ProjectGroup[] = [];
	for (const [project, projectEntries] of map) {
		const dates = projectEntries
			.map(e => e.date)
			.filter((d): d is string => !!d)
			.sort();

		let dateRange = '';
		if (dates.length === 1) {
			dateRange = dates[0].substring(0, 10);
		} else if (dates.length > 1) {
			dateRange = `${dates[0].substring(0, 10)} – ${dates[dates.length - 1].substring(0, 10)}`;
		}

		groups.push({ project, entries: projectEntries, dateRange });
	}

	// Sort by entry count descending
	groups.sort((a, b) => b.entries.length - a.entries.length);

	return groups;
}

/**
 * Render the research content grouped by project
 */
function renderResearchContent(
	contentEl: HTMLElement,
	groups: ProjectGroup[],
	options: ResearchSectionOptions
): void {
	for (const group of groups) {
		const groupEl = contentEl.createDiv({ cls: 'cr-profile__research-group' });

		// Project header
		const header = groupEl.createDiv({ cls: 'cr-profile__research-group-header' });
		const iconSpan = header.createSpan({ cls: 'cr-profile__research-group-icon' });
		setIcon(iconSpan, 'folder');
		header.createSpan({
			text: group.project,
			cls: 'cr-profile__research-group-name'
		});
		header.createSpan({
			text: `${group.entries.length} item${group.entries.length !== 1 ? 's' : ''}`,
			cls: 'cr-profile__research-group-count'
		});
		if (group.dateRange) {
			header.createSpan({
				text: group.dateRange,
				cls: 'cr-profile__research-group-dates'
			});
		}

		// Entry list
		const list = groupEl.createDiv({ cls: 'cr-profile__research-entries' });
		for (const entry of group.entries) {
			const row = list.createDiv({ cls: 'cr-profile__research-entry' });

			// Type badge
			const typeBadge = row.createSpan({ cls: 'cr-profile__research-type-badge' });
			typeBadge.textContent = formatType(entry.crType);

			// Title as clickable link
			const titleEl = row.createSpan({
				text: entry.title,
				cls: 'cr-profile__entity-link'
			});
			titleEl.addEventListener('click', () => {
				void options.app.workspace.openLinkText(entry.file.basename, entry.file.path);
			});

			// Result indicator (for log entries)
			if (entry.result) {
				const resultEl = row.createSpan({ cls: `cr-profile__research-result cr-profile__research-result--${entry.result}` });
				resultEl.textContent = entry.result;
			}

			// Date
			if (entry.date) {
				row.createSpan({
					text: entry.date.substring(0, 10),
					cls: 'cr-profile__research-date'
				});
			}
		}
	}
}

/**
 * Format cr_type for display
 */
function formatType(crType: string): string {
	switch (crType) {
		case 'individual_research_note': return 'IRN';
		case 'research_log_entry': return 'Log';
		case 'research_journal': return 'Journal';
		case 'research_report': return 'Report';
		case 'research_project': return 'Project';
		default: return crType;
	}
}
