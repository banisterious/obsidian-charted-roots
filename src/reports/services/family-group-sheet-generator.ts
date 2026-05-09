/**
 * Family Group Sheet Generator
 *
 * Generates a family group sheet report for a couple and their children.
 */

import { App } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	FamilyGroupSheetOptions,
	FamilyGroupSheetResult,
	ReportPerson
} from '../types/report-types';
import { FamilyGraphService, createConfiguredFamilyGraph, PersonNode } from '../../core/family-graph';
import { nodeToReportPerson } from './report-utils';
import { getLogger } from '../../core/logging';

const logger = getLogger('FamilyGroupSheetGenerator');

/**
 * Generator for Family Group Sheet reports
 */
export class FamilyGroupSheetGenerator {
	private app: App;
	private settings: CanvasRootsSettings;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Generate a Family Group Sheet report
	 */
	async generate(options: FamilyGroupSheetOptions): Promise<FamilyGroupSheetResult> {
		await Promise.resolve(); // Satisfy async requirement
		logger.info('generate', 'Generating Family Group Sheet', { personCrId: options.personCrId });

		const warnings: string[] = [];
		const sourcesSet = new Set<string>();

		// Initialize family graph service
		const familyGraph = createConfiguredFamilyGraph(this.app, this.settings);

		// Get the primary person
		const primaryNode = familyGraph.getPersonByCrId(options.personCrId);
		if (!primaryNode) {
			return {
				success: false,
				content: '',
				suggestedFilename: 'family-group-sheet.md',
				stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0 },
				error: `Person not found: ${options.personCrId}`,
				warnings: [],
				primaryPerson: { crId: '', name: 'Unknown', filePath: '' },
				spouses: [],
				marriages: [],
				children: []
			};
		}

		const primaryPerson = nodeToReportPerson(primaryNode);

		// Get spouses and marriage data (#370)
		const spouses: ReportPerson[] = [];
		const marriages: import('../types/report-types').ReportMarriage[] = [];
		for (const spouseCrId of primaryNode.spouseCrIds) {
			const spouseNode = familyGraph.getPersonByCrId(spouseCrId);
			if (spouseNode) {
				spouses.push(nodeToReportPerson(spouseNode));

				// Extract marriage data from spouse relationships
				const spouseRel = primaryNode.spouses?.find(s => s.personId === spouseCrId);
				if (spouseRel && (spouseRel.marriageDate || spouseRel.marriageLocation)) {
					marriages.push({
						spouseCrId,
						date: spouseRel.marriageDate,
						place: spouseRel.marriageLocation?.replace(/^\[\[|\]\]$/g, '')
					});
				}
			} else {
				warnings.push(`Spouse not found: ${spouseCrId}`);
			}
		}

		// Get children — bio only (Family Group Sheets traditionally show
		// the biological children of a couple; #546). Adopted/step children
		// would shift this away from the canonical genealogy form.
		const children: ReportPerson[] = [];
		if (options.includeChildren) {
			for (const { person: childNode } of familyGraph.getQueryService().getChildren(primaryNode, { include: 'bio' })) {
				const childPerson = nodeToReportPerson(childNode);
				// Add spouse info for child if available
				if (childNode.spouseCrIds.length > 0) {
					const firstSpouse = familyGraph.getPersonByCrId(childNode.spouseCrIds[0]);
					if (firstSpouse) {
						(childPerson as ReportPerson & { spouseName?: string }).spouseName = firstSpouse.name;
					}
				}
				children.push(childPerson);
			}
		}

		// Get parents for both primary person and spouse(s)
		const primaryParents = this.getParents(primaryNode, familyGraph);
		const spouseParents: Array<{ father?: ReportPerson; mother?: ReportPerson }> = [];
		for (const spouse of spouses) {
			const spouseNode = familyGraph.getPersonByCrId(spouse.crId);
			if (spouseNode) {
				spouseParents.push(this.getParents(spouseNode, familyGraph));
			}
		}

		// Generate markdown content
		const content = this.generateMarkdown(
			primaryPerson,
			primaryParents,
			spouses,
			spouseParents,
			children,
			marriages,
			options,
			sourcesSet
		);

		// Determine filename
		const suggestedFilename = spouses.length > 0
			? `Family Group - ${primaryPerson.name} & ${spouses[0].name}.md`
			: `Family Group - ${primaryPerson.name}.md`;

		return {
			success: true,
			content,
			suggestedFilename: this.sanitizeFilename(suggestedFilename),
			stats: {
				peopleCount: 1 + spouses.length + children.length,
				eventsCount: 0,
				sourcesCount: sourcesSet.size
			},
			warnings,
			primaryPerson,
			spouses,
			marriages,
			children
		};
	}

	/**
	 * Get parents for a person
	 */
	private getParents(
		node: PersonNode,
		familyGraph: FamilyGraphService
	): { father?: ReportPerson; mother?: ReportPerson } {
		const result: { father?: ReportPerson; mother?: ReportPerson } = {};

		if (node.fatherCrId) {
			const father = familyGraph.getPersonByCrId(node.fatherCrId);
			if (father) {
				result.father = nodeToReportPerson(father);
			}
		}

		if (node.motherCrId) {
			const mother = familyGraph.getPersonByCrId(node.motherCrId);
			if (mother) {
				result.mother = nodeToReportPerson(mother);
			}
		}

		return result;
	}

	/**
	 * Generate markdown content for the Family Group Sheet
	 */
	private generateMarkdown(
		primaryPerson: ReportPerson,
		primaryParents: { father?: ReportPerson; mother?: ReportPerson },
		spouses: ReportPerson[],
		spouseParents: Array<{ father?: ReportPerson; mother?: ReportPerson }>,
		children: ReportPerson[],
		marriages: import('../types/report-types').ReportMarriage[],
		options: FamilyGroupSheetOptions,
		sourcesSet: Set<string>
	): string {
		const lines: string[] = [];

		// Title
		const title = spouses.length > 0
			? `# Family Group Sheet: ${primaryPerson.name} & ${spouses[0].name}`
			: `# Family Group Sheet: ${primaryPerson.name}`;
		lines.push(title);
		lines.push('');

		// Determine who is husband/wife based on sex, or use primary/spouse
		const primaryIsHusband = primaryPerson.sex === 'male' || spouses[0]?.sex === 'female';

		// Husband section
		const husband = primaryIsHusband ? primaryPerson : spouses[0];
		const husbandParents = primaryIsHusband ? primaryParents : spouseParents[0] ?? {};
		if (husband) {
			lines.push('## Husband');
			lines.push(...this.formatPersonSection(husband, husbandParents, options.includeSources, sourcesSet));
			lines.push('');
		}

		// Wife section
		const wife = primaryIsHusband ? spouses[0] : primaryPerson;
		const wifeParents = primaryIsHusband ? spouseParents[0] ?? {} : primaryParents;
		if (wife) {
			lines.push('## Wife');
			lines.push(...this.formatPersonSection(wife, wifeParents, options.includeSources, sourcesSet));
			lines.push('');
		}

		// Marriage section (#370)
		if (options.includeEvents && marriages.length > 0) {
			for (const marriage of marriages) {
				const spouseName = spouses.find(s => s.crId === marriage.spouseCrId)?.name;
				const label = marriages.length > 1 && spouseName
					? `## Marriage to [[${spouseName}]]`
					: '## Marriage';
				lines.push(label);
				lines.push(`- **Date:** ${marriage.date ?? 'Unknown'}`);
				lines.push(`- **Place:** ${marriage.place ? `[[${marriage.place}]]` : 'Unknown'}`);
				lines.push('');
			}
		}

		// Children section
		if (options.includeChildren && children.length > 0) {
			lines.push('## Children');
			lines.push('| Name | Birth | Death | Spouse |');
			lines.push('|------|-------|-------|--------|');

			for (const child of children) {
				const childWithSpouse = child as ReportPerson & { spouseName?: string };
				const nameLink = `[[${child.name}]]`;
				const birth = child.birthDate ?? '';
				const death = child.deathDate ?? '';
				const spouse = childWithSpouse.spouseName ? `[[${childWithSpouse.spouseName}]]` : '';
				lines.push(`| ${nameLink} | ${birth} | ${death} | ${spouse} |`);
			}
			lines.push('');
		} else if (options.includeChildren) {
			lines.push('## Children');
			lines.push('No children recorded.');
			lines.push('');
		}

		// Sources section
		if (options.includeSources && sourcesSet.size > 0) {
			lines.push('## Sources');
			for (const source of Array.from(sourcesSet).sort()) {
				lines.push(`- [[${source}]]`);
			}
			lines.push('');
		}

		// Footer
		lines.push('---');
		lines.push('*Generated by Charted Roots*');

		return lines.join('\n');
	}

	/**
	 * Format a person section with their details
	 */
	private formatPersonSection(
		person: ReportPerson,
		parents: { father?: ReportPerson; mother?: ReportPerson },
		includeSources: boolean,
		sourcesSet: Set<string>
	): string[] {
		const lines: string[] = [];

		lines.push(`- **Name:** [[${person.name}]]`);

		if (person.birthDate || person.birthPlace) {
			const birthParts = [person.birthDate, person.birthPlace].filter(Boolean);
			lines.push(`- **Birth:** ${birthParts.join(', ')}`);
		}

		if (person.deathDate || person.deathPlace) {
			const deathParts = [person.deathDate, person.deathPlace].filter(Boolean);
			lines.push(`- **Death:** ${deathParts.join(', ')}`);
		}

		if (person.occupation) {
			lines.push(`- **Occupation:** ${person.occupation}`);
		}

		// Parents
		if (parents.father || parents.mother) {
			const parentNames: string[] = [];
			if (parents.father) parentNames.push(`[[${parents.father.name}]]`);
			if (parents.mother) parentNames.push(`[[${parents.mother.name}]]`);
			lines.push(`- **Parents:** ${parentNames.join(' & ')}`);
		}

		return lines;
	}

	/**
	 * Sanitize a filename by removing invalid characters
	 */
	private sanitizeFilename(filename: string): string {
		return filename.replace(/[<>:"/\\|?*]/g, '-');
	}
}
