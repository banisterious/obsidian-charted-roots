/**
 * Members Renderer
 *
 * Renders organization members as grouped sections for the
 * charted-roots-members code block.
 * Groups members by role with wikilinks and date ranges.
 */

import { MarkdownRenderer, MarkdownRenderChild, App, TFile } from 'obsidian';
import type { DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { OrganizationInfo, PersonMembership } from '../../organizations/types/organization-types';

/**
 * Member entry for rendering
 */
interface MemberEntry {
	name: string;
	filePath?: string;
	role: string;
	dateRange?: string;
	isCurrent: boolean;
}

/**
 * Context for rendering members
 */
export interface MembersContext {
	/** The organization being rendered */
	organization: OrganizationInfo;
	/** Members of the organization */
	members: PersonMembership[];
	/** The organization note file */
	orgFile: TFile;
	/** App instance for rendering */
	app: App;
}

/** Default heading for the no-role group */
const NO_ROLE_HEADING = 'Members';

/**
 * Renders organization members content into an HTML element
 */
export class MembersRenderer {
	private service: DynamicContentService;
	/** Store data for freeze functionality */
	private currentEntries: MemberEntry[] | null = null;
	private currentContext: MembersContext | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the members block
	 */
	async render(
		el: HTMLElement,
		context: MembersContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-members' });

		// Build member entries
		const entries = this.buildMemberEntries(context.members, config);

		// Store for freeze functionality
		this.currentEntries = entries;
		this.currentContext = context;
		this.currentConfig = config;

		// Render header
		this.renderHeader(container, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (entries.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No members found.'
			});
			return;
		}

		// Group and render
		const groupBy = config['group-by'] as string ?? 'role';
		if (groupBy === 'role') {
			const groups = this.groupByRole(entries);
			await this.renderSections(contentEl, groups, context, component);
		} else {
			// Flat list — single group under the title
			const groups = new Map<string, MemberEntry[]>();
			groups.set(NO_ROLE_HEADING, entries);
			await this.renderSections(contentEl, groups, context, component);
		}
	}

	/**
	 * Render the header with title and toolbar
	 */
	private renderHeader(container: HTMLElement, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const title = config.title as string || 'Members';
		header.createSpan({ cls: 'cr-dynamic-block__title', text: title });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

		// Freeze button
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to markdown' }
		});
		freezeBtn.textContent = '❄️';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});
	}

	/**
	 * Build member entries from PersonMembership data
	 */
	private buildMemberEntries(
		members: PersonMembership[],
		config: DynamicBlockConfig
	): MemberEntry[] {
		const showFormer = config['show-former'] !== false;
		const showDates = config['show-dates'] !== false;
		const sortBy = config.sort as string ?? 'name';

		const entries: MemberEntry[] = [];

		for (const member of members) {
			// Filter former members if configured
			if (!showFormer && !member.isCurrent) {
				continue;
			}

			const entry: MemberEntry = {
				name: member.personName,
				filePath: member.personFile?.path,
				role: member.role || '',
				isCurrent: member.isCurrent
			};

			// Build date range
			if (showDates && (member.from || member.to)) {
				if (member.from && member.to) {
					entry.dateRange = `(${member.from}–${member.to})`;
				} else if (member.from && member.isCurrent) {
					entry.dateRange = `(${member.from}–present)`;
				} else if (member.from) {
					entry.dateRange = `(${member.from})`;
				} else if (member.to) {
					entry.dateRange = `(until ${member.to})`;
				}
			}

			entries.push(entry);
		}

		// Sort entries
		entries.sort((a, b) => {
			if (sortBy === 'date') {
				// Current members first, then by name
				if (a.isCurrent !== b.isCurrent) {
					return a.isCurrent ? -1 : 1;
				}
			}
			return a.name.localeCompare(b.name);
		});

		return entries;
	}

	/**
	 * Group entries by role
	 * Named roles sorted alphabetically first, no-role group last
	 */
	private groupByRole(entries: MemberEntry[]): Map<string, MemberEntry[]> {
		const roleMap = new Map<string, MemberEntry[]>();

		for (const entry of entries) {
			const role = entry.role || NO_ROLE_HEADING;
			const group = roleMap.get(role) || [];
			group.push(entry);
			roleMap.set(role, group);
		}

		// Sort: named roles alphabetically, NO_ROLE_HEADING last
		const sorted = new Map<string, MemberEntry[]>();
		const keys = Array.from(roleMap.keys()).sort((a, b) => {
			if (a === NO_ROLE_HEADING) return 1;
			if (b === NO_ROLE_HEADING) return -1;
			return a.localeCompare(b);
		});

		for (const key of keys) {
			sorted.set(key, roleMap.get(key)!);
		}

		return sorted;
	}

	/**
	 * Render grouped sections
	 */
	private async renderSections(
		contentEl: HTMLElement,
		groups: Map<string, MemberEntry[]>,
		context: MembersContext,
		component: MarkdownRenderChild
	): Promise<void> {
		for (const [heading, entries] of groups) {
			if (entries.length === 0) continue;

			const section = contentEl.createDiv({ cls: 'cr-members__section' });

			// Only show heading when there are multiple groups
			if (groups.size > 1) {
				section.createEl('h4', { cls: 'cr-members__heading', text: heading });
			}

			const list = section.createEl('ul', { cls: 'cr-members__list' });

			for (const entry of entries) {
				const itemCls = entry.isCurrent
					? 'cr-members__item'
					: 'cr-members__item cr-members__item--former';
				const li = list.createEl('li', { cls: itemCls });

				// Render as wikilink if we have a file path
				if (entry.filePath) {
					const linkEl = li.createSpan({ cls: 'cr-members__link' });
					const basename = entry.filePath.replace(/\.md$/, '').split('/').pop() || entry.name;
					const wikilink = basename !== entry.name
						? `[[${basename}|${entry.name}]]`
						: `[[${basename}]]`;
					await MarkdownRenderer.render(
						context.app,
						wikilink,
						linkEl,
						context.orgFile.path,
						component
					);
				} else {
					li.createSpan({ cls: 'cr-members__name', text: entry.name });
				}

				// Date range
				if (entry.dateRange) {
					li.createSpan({ cls: 'cr-members__dates', text: ` ${entry.dateRange}` });
				}
			}
		}
	}

	/**
	 * Generate markdown from current data and replace the code block
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentContext || !this.currentEntries) {
			return;
		}

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentContext.orgFile,
			'charted-roots-members',
			markdown
		);
	}

	/**
	 * Generate markdown representation of the members
	 */
	private generateMarkdown(): string {
		if (!this.currentEntries || !this.currentConfig) {
			return '';
		}

		const title = this.currentConfig.title as string || 'Members';
		const lines: string[] = [`## ${title}`, ''];

		if (this.currentEntries.length === 0) {
			lines.push('*No members found.*');
			return lines.join('\n');
		}

		const groupBy = this.currentConfig['group-by'] as string ?? 'role';
		const groups = groupBy === 'role'
			? this.groupByRole(this.currentEntries)
			: new Map<string, MemberEntry[]>([[NO_ROLE_HEADING, this.currentEntries]]);

		for (const [heading, entries] of groups) {
			if (entries.length === 0) continue;

			if (groups.size > 1) {
				lines.push(`### ${heading}`);
				lines.push('');
			}

			for (const entry of entries) {
				let line = '- ';

				if (entry.filePath) {
					const basename = entry.filePath.replace(/\.md$/, '').split('/').pop() || entry.name;
					line += basename !== entry.name
						? `[[${basename}|${entry.name}]]`
						: `[[${basename}]]`;
				} else {
					line += entry.name;
				}

				if (entry.dateRange) {
					line += ` ${entry.dateRange}`;
				}

				lines.push(line);
			}

			lines.push('');
		}

		return lines.join('\n').trim();
	}
}
