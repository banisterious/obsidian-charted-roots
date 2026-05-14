/**
 * Find Related Research Modal
 *
 * Displays all research activity related to a specific person,
 * aggregated across projects. Accessible via command palette.
 */

import { App, ButtonComponent, Modal, TFile, setIcon } from 'obsidian';
import { extractWikilinkPath } from '../utils/wikilink-resolver';

/** A single research touchpoint */
interface ResearchEntry {
	file: TFile;
	crType: string;
	date?: string;
	project?: string;
	result?: string;
	title: string;
}

/** Entries grouped by project */
interface ProjectGroup {
	project: string;
	entries: ResearchEntry[];
	dateRange: string;
}

export class FindRelatedResearchModal extends Modal {
	private personName: string;
	private personBasename: string;

	constructor(app: App, personName: string, personBasename: string) {
		super(app);
		this.personName = personName;
		this.personBasename = personBasename;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass('cr-find-research-modal');

		// Title
		const titleEl = contentEl.createDiv({ cls: 'cr-find-research__title' });
		const iconSpan = titleEl.createSpan({ cls: 'cr-find-research__title-icon' });
		setIcon(iconSpan, 'folder-search');
		titleEl.createEl('h2', { text: `Research for ${this.personName}` });

		// Loading
		const loadingEl = contentEl.createDiv({ cls: 'cr-find-research__loading' });
		loadingEl.createEl('p', { text: 'Searching vault...', cls: 'cr-text-muted' });

		// Gather results
		const entries = this.gatherEntries();
		const groups = this.groupByProject(entries);
		loadingEl.remove();

		if (entries.length === 0) {
			this.renderEmpty(contentEl);
		} else {
			this.renderResults(contentEl, groups, entries.length);
		}

		// Close button
		const buttonContainer = contentEl.createDiv({ cls: 'cr-modal-buttons' });
		new ButtonComponent(buttonContainer)
			.setButtonText('Close')
			.onClick(() => this.close());
	}

	private renderEmpty(container: HTMLElement): void {
		const emptyEl = container.createDiv({ cls: 'cr-find-research__empty' });
		const emptyIcon = emptyEl.createSpan({ cls: 'cr-find-research__empty-icon' });
		setIcon(emptyIcon, 'search-x');
		emptyEl.createEl('p', { text: 'No research activity found for this person.' });
	}

	private renderResults(container: HTMLElement, groups: ProjectGroup[], totalCount: number): void {
		// Summary
		const summary = container.createDiv({ cls: 'cr-find-research__summary' });
		summary.createEl('p', {
			text: `${totalCount} item${totalCount !== 1 ? 's' : ''} across ${groups.length} project${groups.length !== 1 ? 's' : ''}`
		});

		// Scrollable results
		const resultsEl = container.createDiv({ cls: 'cr-find-research__results' });

		for (const group of groups) {
			const groupEl = resultsEl.createDiv({ cls: 'cr-find-research__group' });

			// Group header
			const header = groupEl.createDiv({ cls: 'cr-find-research__group-header' });
			const folderIcon = header.createSpan({ cls: 'cr-find-research__group-icon' });
			setIcon(folderIcon, 'folder');
			header.createSpan({ text: group.project, cls: 'cr-find-research__group-name' });
			header.createSpan({
				text: `${group.entries.length} item${group.entries.length !== 1 ? 's' : ''}`,
				cls: 'cr-find-research__group-count'
			});
			if (group.dateRange) {
				header.createSpan({ text: group.dateRange, cls: 'cr-find-research__group-dates' });
			}

			// Entries
			const list = groupEl.createDiv({ cls: 'cr-find-research__entries' });
			for (const entry of group.entries) {
				const row = list.createDiv({ cls: 'cr-find-research__entry' });

				// Type badge
				row.createSpan({
					text: this.formatType(entry.crType),
					cls: 'cr-find-research__type-badge'
				});

				// Clickable title
				const titleEl = row.createSpan({
					text: entry.title,
					cls: 'cr-find-research__entry-link'
				});
				titleEl.addEventListener('click', () => {
					void this.app.workspace.openLinkText(entry.file.basename, entry.file.path);
					this.close();
				});

				// Result indicator
				if (entry.result) {
					row.createSpan({
						text: entry.result,
						cls: `cr-find-research__result cr-find-research__result--${entry.result}`
					});
				}

				// Date
				if (entry.date) {
					row.createSpan({
						text: entry.date.substring(0, 10),
						cls: 'cr-find-research__date'
					});
				}
			}
		}
	}

	private gatherEntries(): ResearchEntry[] {
		const entries: ResearchEntry[] = [];
		const normalizedPerson = this.personBasename.toLowerCase();

		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			const crType = (fm.cr_type || fm.type) as string | undefined;
			if (!crType) continue;

			if (crType === 'individual_research_note') {
				const subject = this.resolveRef(fm.subject);
				if (subject?.toLowerCase() === normalizedPerson) {
					entries.push({
						file,
						crType,
						date: typeof fm.date === 'string' ? fm.date : undefined,
						project: this.resolveRef(fm.project || fm.up),
						title: typeof fm.name === 'string' ? fm.name : file.basename
					});
				}
			} else if (crType === 'research_log_entry') {
				const subject = this.resolveRef(fm.subject || fm.person);
				if (subject?.toLowerCase() === normalizedPerson) {
					entries.push({
						file,
						crType,
						date: typeof fm.date === 'string' ? fm.date : undefined,
						project: this.resolveRef(fm.project || fm.up),
						result: typeof fm.result === 'string' ? fm.result : undefined,
						title: typeof fm.searched_for === 'string'
							? fm.searched_for
							: (typeof fm.name === 'string' ? fm.name : file.basename)
					});
				}
			} else if (['research_journal', 'research_report', 'research_project'].includes(crType)) {
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
							: this.resolveRef(fm.project || fm.up),
						title: typeof fm.name === 'string' ? fm.name : file.basename
					});
				}
			}
		}

		entries.sort((a, b) => {
			if (!a.date && !b.date) return 0;
			if (!a.date) return 1;
			if (!b.date) return -1;
			return b.date.localeCompare(a.date);
		});

		return entries;
	}

	private resolveRef(value: unknown): string | undefined {
		if (typeof value !== 'string') return undefined;
		return extractWikilinkPath(value) || value;
	}

	private groupByProject(entries: ResearchEntry[]): ProjectGroup[] {
		const map = new Map<string, ResearchEntry[]>();

		for (const entry of entries) {
			const project = entry.project || 'Unassigned';
			if (!map.has(project)) map.set(project, []);
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

		groups.sort((a, b) => b.entries.length - a.entries.length);
		return groups;
	}

	private formatType(crType: string): string {
		switch (crType) {
			case 'individual_research_note': return 'IRN';
			case 'research_log_entry': return 'Log';
			case 'research_journal': return 'Journal';
			case 'research_report': return 'Report';
			case 'research_project': return 'Project';
			default: return crType;
		}
	}
}
