/**
 * Unconnected People Generator (#298)
 *
 * Identifies person notes not linked to the main family network. Uses
 * FamilyGraphService.findAllFamilyComponents() to detect connected components,
 * then reports all components that do not contain the selected root person.
 *
 * Distinguishes between:
 * - Isolated people (no relationships at all — component size 1)
 * - Small clusters (mutually connected people disconnected from the main tree)
 */

import { App } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	UnconnectedPeopleOptions,
	UnconnectedPeopleResult,
	DisconnectedComponent,
	ReportPerson
} from '../types/report-types';
import { createConfiguredFamilyGraph } from '../../core/family-graph';
import { nodeToReportPerson } from './report-utils';
import { getLogger } from '../../core/logging';

const logger = getLogger('UnconnectedPeopleGenerator');

/**
 * Generator for unconnected people reports
 */
export class UnconnectedPeopleGenerator {
	private app: App;
	private settings: CanvasRootsSettings;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Generate an unconnected people report
	 */
	async generate(options: UnconnectedPeopleOptions): Promise<UnconnectedPeopleResult> {
		await Promise.resolve(); // Satisfy async requirement
		logger.info('generate', 'Generating unconnected people report', {
			rootPersonCrId: options.rootPersonCrId
		});

		const warnings: string[] = [];

		// Initialize family graph service
		const familyGraph = createConfiguredFamilyGraph(this.app, this.settings);

		// Get the root person
		const rootNode = familyGraph.getPersonByCrId(options.rootPersonCrId);
		if (!rootNode) {
			return {
				success: false,
				content: '',
				suggestedFilename: 'unconnected-people.md',
				stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0 },
				error: `Person not found: ${options.rootPersonCrId}`,
				warnings: [],
				rootPerson: { crId: '', name: 'Unknown', filePath: '' },
				mainComponentSize: 0,
				disconnectedComponents: [],
				totalUnconnected: 0,
				totalPeople: 0,
				isolatedCount: 0
			};
		}

		const rootPerson = nodeToReportPerson(rootNode);

		// Find all connected components
		const components = familyGraph.findAllFamilyComponents();

		// Find the component containing the root person
		const mainComponent = components.find(c =>
			c.people.some(p => p.crId === options.rootPersonCrId)
		);

		if (!mainComponent) {
			warnings.push('Root person not found in any component — this should not happen');
		}

		const mainComponentSize = mainComponent?.size ?? 0;
		const totalPeople = components.reduce((sum, c) => sum + c.size, 0);

		// All other components are "disconnected"
		const disconnectedComponents: DisconnectedComponent[] = components
			.filter(c => c !== mainComponent)
			.map(c => ({
				representative: nodeToReportPerson(c.representative),
				people: c.people
					.map(p => nodeToReportPerson(p))
					.sort((a, b) => a.name.localeCompare(b.name)),
				collectionName: c.collectionName
			}));

		// Sort disconnected components: largest first
		disconnectedComponents.sort((a, b) => b.people.length - a.people.length);

		const totalUnconnected = disconnectedComponents.reduce((sum, c) => sum + c.people.length, 0);
		const isolatedCount = disconnectedComponents.filter(c => c.people.length === 1).length;

		// Generate markdown content
		const content = this.generateMarkdown(
			rootPerson, mainComponentSize, disconnectedComponents,
			totalUnconnected, totalPeople, isolatedCount
		);

		const suggestedFilename = `Unconnected People - ${rootPerson.name}.md`;

		return {
			success: true,
			content,
			suggestedFilename: this.sanitizeFilename(suggestedFilename),
			stats: {
				peopleCount: totalPeople,
				eventsCount: 0,
				sourcesCount: 0
			},
			warnings,
			rootPerson,
			mainComponentSize,
			disconnectedComponents,
			totalUnconnected,
			totalPeople,
			isolatedCount
		};
	}

	/**
	 * Generate markdown content for the report
	 */
	private generateMarkdown(
		rootPerson: ReportPerson,
		mainComponentSize: number,
		disconnectedComponents: DisconnectedComponent[],
		totalUnconnected: number,
		totalPeople: number,
		isolatedCount: number
	): string {
		const lines: string[] = [];

		// Title
		lines.push(`# Unconnected People Report`);
		lines.push('');
		lines.push(`People not linked to the family network of **[[${rootPerson.name}]]**.`);
		lines.push('');

		// Summary
		lines.push('## Summary');
		lines.push('');
		lines.push(`- **Total people in vault:** ${totalPeople}`);
		lines.push(`- **Connected to ${rootPerson.name}:** ${mainComponentSize}`);
		lines.push(`- **Unconnected:** ${totalUnconnected}`);
		if (totalUnconnected > 0) {
			lines.push(`  - Isolated (no relationships): ${isolatedCount}`);
			const clusterCount = disconnectedComponents.filter(c => c.people.length > 1).length;
			if (clusterCount > 0) {
				lines.push(`  - In disconnected clusters: ${totalUnconnected - isolatedCount} (across ${clusterCount} cluster${clusterCount > 1 ? 's' : ''})`);
			}
		}
		const connectedness = totalPeople > 0
			? Math.round((mainComponentSize / totalPeople) * 100)
			: 0;
		lines.push(`- **Network coverage:** ${connectedness}%`);
		lines.push('');

		if (totalUnconnected === 0) {
			lines.push('All people in the vault are connected to the main family network.');
			lines.push('');
		} else {
			// Disconnected clusters (size > 1)
			const clusters = disconnectedComponents.filter(c => c.people.length > 1);
			if (clusters.length > 0) {
				lines.push('## Disconnected clusters');
				lines.push('');
				lines.push('These groups of people are connected to each other but not to the main network.');
				lines.push('');

				for (const cluster of clusters) {
					const label = cluster.collectionName
						? `${cluster.collectionName} (${cluster.people.length} people)`
						: `Cluster of ${cluster.people.length} (via ${cluster.representative.name})`;
					lines.push(`### ${label}`);
					lines.push('');

					for (const person of cluster.people) {
						const vitals = this.formatVitals(person);
						lines.push(`- **[[${person.name}]]**${vitals ? ` — ${vitals}` : ''}`);
					}
					lines.push('');
				}
			}

			// Isolated people (size === 1)
			const isolated = disconnectedComponents.filter(c => c.people.length === 1);
			if (isolated.length > 0) {
				lines.push('## Isolated people');
				lines.push('');
				lines.push('These people have no parent, spouse, or child relationships defined.');
				lines.push('');

				for (const component of isolated) {
					const person = component.people[0];
					const vitals = this.formatVitals(person);
					lines.push(`- **[[${person.name}]]**${vitals ? ` — ${vitals}` : ''}`);
				}
				lines.push('');
			}
		}

		// Footer
		lines.push('---');
		lines.push('*Generated by Charted Roots*');

		return lines.join('\n');
	}

	/**
	 * Format birth/death vitals as a compact string
	 */
	private formatVitals(person: ReportPerson): string {
		const parts: string[] = [];
		if (person.birthDate) parts.push(`b. ${person.birthDate}`);
		if (person.deathDate) parts.push(`d. ${person.deathDate}`);
		return parts.join(', ');
	}

	/**
	 * Sanitize a filename by removing invalid characters
	 */
	private sanitizeFilename(filename: string): string {
		return filename.replace(/[<>:"/\\|?*]/g, '-');
	}
}
