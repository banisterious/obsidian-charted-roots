/**
 * Kinship Report Generator (#300)
 *
 * Lists all people related to a selected person with their relationship
 * description and degree. Uses the existing RelationshipCalculator to
 * compute proper genealogical terms (cousins, removals, in-laws, etc.)
 * for every reachable person in the family network.
 */

import { App } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	KinshipReportOptions,
	KinshipReportResult,
	KinshipEntry,
	ReportPerson
} from '../types/report-types';
import { createConfiguredFamilyGraph } from '../../core/family-graph';
import { RelationshipCalculator } from '../../core/relationship-calculator';
import { FolderFilterService } from '../../core/folder-filter';
import { nodeToReportPerson } from './report-utils';
import { getLogger } from '../../core/logging';

const logger = getLogger('KinshipReportGenerator');

/**
 * Generator for kinship reports
 */
export class KinshipReportGenerator {
	private app: App;
	private settings: CanvasRootsSettings;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Generate a kinship report
	 */
	async generate(options: KinshipReportOptions): Promise<KinshipReportResult> {
		await Promise.resolve(); // Satisfy async requirement
		logger.info('generate', 'Generating kinship report', {
			rootPersonCrId: options.rootPersonCrId,
			maxDegree: options.maxDegree
		});

		const warnings: string[] = [];

		// Initialize family graph to find component members
		const familyGraph = createConfiguredFamilyGraph(this.app, this.settings);

		// Get the root person
		const rootNode = familyGraph.getPersonByCrId(options.rootPersonCrId);
		if (!rootNode) {
			return {
				success: false,
				content: '',
				suggestedFilename: 'kinship-report.md',
				stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0 },
				error: `Person not found: ${options.rootPersonCrId}`,
				warnings: [],
				rootPerson: { crId: '', name: 'Unknown', filePath: '' },
				entries: [],
				summary: {
					totalRelatives: 0,
					bloodRelatives: 0,
					inLaws: 0,
					maxDegreeFound: 0,
					byCategory: {}
				}
			};
		}

		const rootPerson = nodeToReportPerson(rootNode);

		// Find all people in the same connected component as root
		const components = familyGraph.findAllFamilyComponents();
		const rootComponent = components.find(c =>
			c.people.some(p => p.crId === options.rootPersonCrId)
		);

		if (!rootComponent) {
			warnings.push('Root person not found in any component');
			return {
				success: true,
				content: this.generateMarkdown(rootPerson, [], options, {
					totalRelatives: 0, bloodRelatives: 0, inLaws: 0, maxDegreeFound: 0, byCategory: {}
				}),
				suggestedFilename: this.sanitizeFilename(`Kinship Report - ${rootPerson.name}.md`),
				stats: { peopleCount: 1, eventsCount: 0, sourcesCount: 0 },
				warnings,
				rootPerson,
				entries: [],
				summary: {
					totalRelatives: 0, bloodRelatives: 0, inLaws: 0, maxDegreeFound: 0, byCategory: {}
				}
			};
		}

		// Initialize relationship calculator
		const folderFilter = this.settings.folderFilterMode !== 'disabled'
			? new FolderFilterService(this.settings)
			: undefined;
		const calculator = new RelationshipCalculator(this.app, folderFilter);

		// Calculate relationship for each person in the component
		const entries: KinshipEntry[] = [];
		const maxDegree = options.maxDegree ?? 20;

		for (const personNode of rootComponent.people) {
			if (personNode.crId === options.rootPersonCrId) continue; // Skip self

			const result = calculator.calculateRelationship(
				options.rootPersonCrId,
				personNode.crId
			);

			if (!result || result.relationshipDescription === 'Not related') continue;

			const degree = result.generationsUp + result.generationsDown;
			if (degree > maxDegree) continue;

			entries.push({
				person: nodeToReportPerson(personNode),
				relationshipDescription: result.relationshipDescription,
				degree,
				generationsUp: result.generationsUp,
				generationsDown: result.generationsDown,
				isBloodRelation: result.isBloodRelation,
				isDirectLine: result.isDirectLine
			});
		}

		// Sort entries
		this.sortEntries(entries, options.sortBy ?? 'degree');

		// Calculate summary statistics
		const bloodRelatives = entries.filter(e => e.isBloodRelation).length;
		const inLaws = entries.filter(e => !e.isBloodRelation).length;
		const maxDegreeFound = entries.reduce((max, e) => Math.max(max, e.degree), 0);

		// Group by category for summary
		const byCategory: Record<string, number> = {};
		for (const entry of entries) {
			const category = this.categorize(entry);
			byCategory[category] = (byCategory[category] ?? 0) + 1;
		}

		const summary = {
			totalRelatives: entries.length,
			bloodRelatives,
			inLaws,
			maxDegreeFound,
			byCategory
		};

		// Generate markdown
		const content = this.generateMarkdown(rootPerson, entries, options, summary);
		const suggestedFilename = `Kinship Report - ${rootPerson.name}.md`;

		return {
			success: true,
			content,
			suggestedFilename: this.sanitizeFilename(suggestedFilename),
			stats: {
				peopleCount: entries.length + 1,
				eventsCount: 0,
				sourcesCount: 0
			},
			warnings,
			rootPerson,
			entries,
			summary
		};
	}

	/**
	 * Categorize a kinship entry for summary grouping
	 */
	private categorize(entry: KinshipEntry): string {
		const desc = entry.relationshipDescription;
		if (desc === 'Spouse') return 'Spouses';
		if (desc === 'Parent' || desc === 'Child') return 'Parents & children';
		if (desc === 'Sibling') return 'Siblings';
		if (desc.includes('Grandparent') || desc.includes('Grandchild')) return 'Grandparents & grandchildren';
		if (desc.includes('Aunt') || desc.includes('Uncle') || desc.includes('Niece') || desc.includes('Nephew')) return 'Aunts, uncles, nieces & nephews';
		if (desc.includes('Cousin')) return 'Cousins';
		if (desc.includes('in-law') || desc.includes('marriage')) return 'In-laws';
		return 'Other';
	}

	/**
	 * Sort kinship entries
	 */
	private sortEntries(entries: KinshipEntry[], sortBy: string): void {
		switch (sortBy) {
			case 'degree':
				entries.sort((a, b) => a.degree - b.degree || a.person.name.localeCompare(b.person.name));
				break;
			case 'name':
				entries.sort((a, b) => a.person.name.localeCompare(b.person.name));
				break;
			case 'relationship':
				entries.sort((a, b) =>
					a.relationshipDescription.localeCompare(b.relationshipDescription) ||
					a.person.name.localeCompare(b.person.name)
				);
				break;
			default:
				entries.sort((a, b) => a.degree - b.degree || a.person.name.localeCompare(b.person.name));
		}
	}

	/**
	 * Generate markdown content
	 */
	private generateMarkdown(
		rootPerson: ReportPerson,
		entries: KinshipEntry[],
		options: KinshipReportOptions,
		summary: KinshipReportResult['summary']
	): string {
		const lines: string[] = [];

		// Title
		lines.push(`# Kinship Report: ${rootPerson.name}`);
		lines.push('');
		lines.push(`All relatives of **[[${rootPerson.name}]]** within ${options.maxDegree ?? 20} degrees.`);
		lines.push('');

		// Summary
		lines.push('## Summary');
		lines.push('');
		lines.push(`- **Total relatives:** ${summary.totalRelatives}`);
		lines.push(`- **Blood relatives:** ${summary.bloodRelatives}`);
		lines.push(`- **By marriage:** ${summary.inLaws}`);
		lines.push(`- **Furthest degree:** ${summary.maxDegreeFound}`);
		lines.push('');

		// Category breakdown
		if (Object.keys(summary.byCategory).length > 0) {
			lines.push('### By category');
			lines.push('');
			// Sort categories by count descending
			const sortedCategories = Object.entries(summary.byCategory)
				.sort(([, a], [, b]) => b - a);
			for (const [category, count] of sortedCategories) {
				lines.push(`- ${category}: ${count}`);
			}
			lines.push('');
		}

		if (entries.length === 0) {
			lines.push('No relatives found.');
			lines.push('');
		} else {
			// Main table
			lines.push('## Relatives');
			lines.push('');
			lines.push('| Name | Relationship | Degree | Blood |');
			lines.push('|------|-------------|--------|-------|');

			for (const entry of entries) {
				const blood = entry.isBloodRelation ? 'Yes' : 'No';
				lines.push(`| [[${entry.person.name}]] | ${entry.relationshipDescription} | ${entry.degree} | ${blood} |`);
			}
			lines.push('');
		}

		// Footer
		lines.push('---');
		lines.push('*Generated by Charted Roots*');

		return lines.join('\n');
	}

	/**
	 * Sanitize a filename by removing invalid characters
	 */
	private sanitizeFilename(filename: string): string {
		return filename.replace(/[<>:"/\\|?*]/g, '-');
	}
}
