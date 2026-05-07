/**
 * Relationships Renderer
 *
 * Renders relationships HTML for the charted-roots-relationships code block.
 * Creates grouped sections for family relationships with wikilinks.
 */

import { MarkdownRenderer, MarkdownRenderChild } from 'obsidian';
import type { DynamicBlockContext, DynamicBlockConfig, DynamicContentService } from '../services/dynamic-content-service';
import type { PersonNode } from '../../core/family-graph';
import { findAdoptiveSiblingCrIds, findBiologicalSiblingCrIds } from '../sibling-walker';

/**
 * Relationship entry for rendering
 */
interface RelationshipEntry {
	name: string;
	filePath?: string;
	dates?: string;
}

/**
 * Grouped relationships for display
 */
interface RelationshipGroups {
	parents: RelationshipEntry[];
	spouse: RelationshipEntry[];
	children: RelationshipEntry[];
	siblings: RelationshipEntry[];
}

/**
 * Renders relationships content into an HTML element
 */
export class RelationshipsRenderer {
	private service: DynamicContentService;
	/** Store groups for freeze functionality */
	private currentGroups: RelationshipGroups | null = null;
	private currentContext: DynamicBlockContext | null = null;
	private currentConfig: DynamicBlockConfig | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the relationships block
	 */
	async render(
		el: HTMLElement,
		context: DynamicBlockContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-relationships' });

		// Build relationship groups
		const groups = this.buildRelationshipGroups(context, config);

		// Store for freeze functionality
		this.currentGroups = groups;
		this.currentContext = context;
		this.currentConfig = config;

		// Render header (needs groups for freeze)
		this.renderHeader(container, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		const isEmpty = groups.parents.length === 0 &&
			groups.spouse.length === 0 &&
			groups.children.length === 0 &&
			groups.siblings.length === 0;

		if (isEmpty) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No family relationships found.'
			});
			return;
		}

		// Render each section
		await this.renderSections(contentEl, groups, context, config, component);
	}

	/**
	 * Render the header with title and toolbar
	 */
	private renderHeader(container: HTMLElement, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const title = config.title as string || 'Family';
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
	 * Build relationship groups from person data
	 */
	private buildRelationshipGroups(
		context: DynamicBlockContext,
		config: DynamicBlockConfig
	): RelationshipGroups {
		const { person, familyGraph } = context;

		const groups: RelationshipGroups = {
			parents: [],
			spouse: [],
			children: [],
			siblings: []
		};

		if (!person) {
			return groups;
		}

		// Check what relationship types to include
		const include = config.include as string[] | undefined;
		const shouldInclude = (type: string): boolean => {
			if (!include || include.length === 0) return true;
			return include.includes(type);
		};

		// Parents — biological, gender-neutral, adoptive, and step
		if (shouldInclude('parents')) {
			if (person.fatherCrId) {
				const father = familyGraph.getPersonByCrId(person.fatherCrId);
				if (father) {
					groups.parents.push(this.personToEntry(father, 'Father'));
				}
			}
			if (person.motherCrId) {
				const mother = familyGraph.getPersonByCrId(person.motherCrId);
				if (mother) {
					groups.parents.push(this.personToEntry(mother, 'Mother'));
				}
			}
			// Gender-neutral parents
			for (const parentCrId of person.parentCrIds) {
				const parent = familyGraph.getPersonByCrId(parentCrId);
				if (parent) {
					groups.parents.push(this.personToEntry(parent, 'Parent'));
				}
			}
			// Adoptive parents (#392)
			if (person.adoptiveFatherCrId) {
				const adoptiveFather = familyGraph.getPersonByCrId(person.adoptiveFatherCrId);
				if (adoptiveFather) {
					groups.parents.push(this.personToEntry(adoptiveFather, 'Adoptive father'));
				}
			}
			if (person.adoptiveMotherCrId) {
				const adoptiveMother = familyGraph.getPersonByCrId(person.adoptiveMotherCrId);
				if (adoptiveMother) {
					groups.parents.push(this.personToEntry(adoptiveMother, 'Adoptive mother'));
				}
			}
			for (const adoptiveParentCrId of person.adoptiveParentCrIds) {
				const adoptiveParent = familyGraph.getPersonByCrId(adoptiveParentCrId);
				if (adoptiveParent) {
					groups.parents.push(this.personToEntry(adoptiveParent, 'Adoptive parent'));
				}
			}
			// Step-parents
			for (const stepfatherCrId of person.stepfatherCrIds) {
				const stepfather = familyGraph.getPersonByCrId(stepfatherCrId);
				if (stepfather) {
					groups.parents.push(this.personToEntry(stepfather, 'Stepfather'));
				}
			}
			for (const stepmotherCrId of person.stepmotherCrIds) {
				const stepmother = familyGraph.getPersonByCrId(stepmotherCrId);
				if (stepmother) {
					groups.parents.push(this.personToEntry(stepmother, 'Stepmother'));
				}
			}
		}

		// Spouses
		if (shouldInclude('spouse') && person.spouseCrIds.length > 0) {
			for (const spouseCrId of person.spouseCrIds) {
				const spouse = familyGraph.getPersonByCrId(spouseCrId);
				if (spouse) {
					groups.spouse.push(this.personToEntry(spouse));
				}
			}
		}

		// Children — biological, adopted, step. Mirrors the parents section
		// pattern (#531 follow-up); each non-bio source labels its entries
		// to match the corresponding parent label ("Adoptive father" /
		// "Adopted child", "Stepfather" / "Stepchild", etc.).
		if (shouldInclude('children')) {
			for (const childCrId of person.childrenCrIds) {
				const child = familyGraph.getPersonByCrId(childCrId);
				if (child) {
					groups.children.push(this.personToEntry(child));
				}
			}
			for (const adoptedChildCrId of person.adoptedChildCrIds) {
				const adoptedChild = familyGraph.getPersonByCrId(adoptedChildCrId);
				if (adoptedChild) {
					groups.children.push(this.personToEntry(adoptedChild, 'Adopted child'));
				}
			}
			for (const stepchildCrId of person.stepchildrenCrIds) {
				const stepchild = familyGraph.getPersonByCrId(stepchildCrId);
				if (stepchild) {
					groups.children.push(this.personToEntry(stepchild, 'Stepchild'));
				}
			}
		}

		// Siblings (computed from shared parents). Bio and adoptive sources
		// are merged then sorted by birth date so the display follows
		// chronological age order rather than the parent's frontmatter
		// `children:` array order (#532). Adoptive siblings (#417) get the
		// "Adoptive sibling" label and are deduped against the biological
		// set so a person showing on both edges isn't listed twice.
		if (shouldInclude('siblings')) {
			const getPerson = (crId: string) => familyGraph.getPersonByCrId(crId);
			const biologicalIds = findBiologicalSiblingCrIds(person, getPerson);
			const biologicalSet = new Set(biologicalIds);
			const items: { person: PersonNode; isAdoptive: boolean }[] = [];
			for (const siblingCrId of biologicalIds) {
				const sibling = getPerson(siblingCrId);
				if (sibling) {
					items.push({ person: sibling, isAdoptive: false });
				}
			}
			const adoptiveIds = findAdoptiveSiblingCrIds(person, getPerson);
			for (const siblingCrId of adoptiveIds) {
				if (biologicalSet.has(siblingCrId)) continue;
				const sibling = getPerson(siblingCrId);
				if (sibling) {
					items.push({ person: sibling, isAdoptive: true });
				}
			}
			this.sortByBirthDate(items, context.person?.universe);
			for (const item of items) {
				groups.siblings.push(
					this.personToEntry(item.person, item.isAdoptive ? 'Adoptive sibling' : undefined)
				);
			}
		}

		return groups;
	}

	/**
	 * Stable sort persons by birth date (oldest first), in place. Uses the
	 * universe-aware canonical-year comparison from `dateService` so that
	 * descending fictional eras (e.g. Star Wars BBY) order correctly
	 * alongside Gregorian dates. Persons without a parseable birth date
	 * sink to the end while preserving their relative order. Falls back to
	 * a no-op when the date service isn't available.
	 */
	private sortByBirthDate(
		items: { person: PersonNode; [key: string]: unknown }[],
		universe: string | undefined
	): void {
		const dateService = this.service.getDateService();
		if (!dateService) return;
		const yearOf = (p: PersonNode): number | null =>
			p.birthDate ? dateService.getCanonicalYear(p.birthDate, universe) : null;
		// Decorate-sort-undecorate to keep the sort stable across engines.
		const decorated = items.map((item, index) => ({ item, index, year: yearOf(item.person) }));
		decorated.sort((a, b) => {
			if (a.year === null && b.year === null) return a.index - b.index;
			if (a.year === null) return 1;
			if (b.year === null) return -1;
			if (a.year !== b.year) return a.year - b.year;
			return a.index - b.index;
		});
		for (let i = 0; i < decorated.length; i++) {
			items[i] = decorated[i].item;
		}
	}

	/**
	 * Convert a PersonNode to a RelationshipEntry
	 */
	private personToEntry(person: PersonNode, label?: string): RelationshipEntry {
		const entry: RelationshipEntry = {
			name: person.name,
			filePath: person.file?.path
		};

		// Add dates if available
		if (person.birthDate || person.deathDate) {
			const birth = person.birthDate ? this.service.extractYear(person.birthDate) : '?';
			const death = person.deathDate ? this.service.extractYear(person.deathDate) : '';
			entry.dates = death ? `(${birth}–${death})` : `(b. ${birth})`;
		}

		// Prepend label if provided
		if (label) {
			entry.name = `${label}: ${person.name}`;
		}

		return entry;
	}

	/**
	 * Render all relationship sections
	 */
	private async renderSections(
		contentEl: HTMLElement,
		groups: RelationshipGroups,
		context: DynamicBlockContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		// Define section order and labels
		const sections: { key: keyof RelationshipGroups; label: string }[] = [
			{ key: 'parents', label: 'Parents' },
			{ key: 'spouse', label: 'Spouse' },
			{ key: 'children', label: 'Children' },
			{ key: 'siblings', label: 'Siblings' }
		];

		// Check config for display type
		const displayType = config.type as string || 'immediate';

		for (const section of sections) {
			const entries = groups[section.key];
			if (entries.length === 0) continue;

			// Skip siblings in 'immediate' type (parents, spouse, children only)
			if (displayType === 'immediate' && section.key === 'siblings') {
				continue;
			}

			await this.renderSection(contentEl, section.label, entries, context, component);
		}
	}

	/**
	 * Render a single relationship section
	 */
	private async renderSection(
		contentEl: HTMLElement,
		label: string,
		entries: RelationshipEntry[],
		context: DynamicBlockContext,
		component: MarkdownRenderChild
	): Promise<void> {
		const section = contentEl.createDiv({ cls: 'cr-relationships__section' });

		// Section heading
		section.createEl('h4', { cls: 'cr-relationships__heading', text: label });

		// List of entries
		const list = section.createEl('ul', { cls: 'cr-relationships__list' });

		for (const entry of entries) {
			const li = list.createEl('li', { cls: 'cr-relationships__item' });

			// Render as wikilink if we have a file path
			if (entry.filePath) {
				const linkEl = li.createSpan({ cls: 'cr-relationships__link' });
				const basename = entry.filePath.replace(/\.md$/, '').split('/').pop() || entry.name;
				// Use alias format if basename differs from name (duplicate handling)
				const wikilink = basename !== entry.name ? `[[${basename}|${entry.name}]]` : `[[${basename}]]`;
				await MarkdownRenderer.render(
					context.familyGraph['app'],
					wikilink,
					linkEl,
					context.file.path,
					component
				);
			} else {
				li.createSpan({ cls: 'cr-relationships__name', text: entry.name });
			}

			// Dates
			if (entry.dates) {
				li.createSpan({ cls: 'cr-relationships__dates', text: ` ${entry.dates}` });
			}
		}
	}

	/**
	 * Generate markdown from current groups and replace the code block
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentContext || !this.currentGroups) {
			return;
		}

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentContext.file,
			'charted-roots-relationships',
			markdown
		);
	}

	/**
	 * Generate markdown representation of the relationships
	 */
	private generateMarkdown(): string {
		if (!this.currentGroups || !this.currentConfig) {
			return '';
		}

		const lines: string[] = ['## Family', ''];

		// Define section order and labels
		const sections: { key: keyof RelationshipGroups; label: string }[] = [
			{ key: 'parents', label: 'Parents' },
			{ key: 'spouse', label: 'Spouse' },
			{ key: 'children', label: 'Children' },
			{ key: 'siblings', label: 'Siblings' }
		];

		// Check config for display type
		const displayType = this.currentConfig.type as string || 'immediate';

		for (const section of sections) {
			const entries = this.currentGroups[section.key];
			if (entries.length === 0) continue;

			// Skip siblings in 'immediate' type
			if (displayType === 'immediate' && section.key === 'siblings') {
				continue;
			}

			lines.push(`### ${section.label}`);
			lines.push('');

			for (const entry of entries) {
				let line = '- ';

				// Add wikilink if we have a file path
				if (entry.filePath) {
					const basename = entry.filePath.replace(/\.md$/, '').split('/').pop() || entry.name;
					// Use alias format if basename differs from name (duplicate handling)
					line += basename !== entry.name ? `[[${basename}|${entry.name}]]` : `[[${basename}]]`;
				} else {
					line += entry.name;
				}

				// Add dates
				if (entry.dates) {
					line += ` ${entry.dates}`;
				}

				lines.push(line);
			}

			lines.push('');
		}

		return lines.join('\n').trim();
	}
}
