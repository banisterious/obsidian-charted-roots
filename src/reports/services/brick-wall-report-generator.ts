/**
 * Brick Wall Report Generator (#297)
 *
 * Identifies end-of-line ancestors — people at the furthest extent of each
 * branch with no parents defined. These "brick walls" represent the most
 * productive targets for further research.
 *
 * Uses Sosa-Stradonitz (Ahnentafel) numbering to traverse the ancestor tree
 * and collects every terminal node.
 */

import { App } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	BrickWallReportOptions,
	BrickWallReportResult,
	BrickWallEntry,
	ReportPerson
} from '../types/report-types';
import { FamilyGraphService, createConfiguredFamilyGraph, PersonNode } from '../../core/family-graph';
import { nodeToReportPerson } from './report-utils';
import { getLogger } from '../../core/logging';

const logger = getLogger('BrickWallReportGenerator');

/**
 * Generator for brick wall (end-of-line) reports
 */
export class BrickWallReportGenerator {
	private app: App;
	private settings: CanvasRootsSettings;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Generate a brick wall report
	 */
	async generate(options: BrickWallReportOptions): Promise<BrickWallReportResult> {
		await Promise.resolve(); // Satisfy async requirement
		logger.info('generate', 'Generating brick wall report', {
			rootPersonCrId: options.rootPersonCrId,
			maxGenerations: options.maxGenerations
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
				suggestedFilename: 'brick-wall-report.md',
				stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0, generationsCount: 0 },
				error: `Person not found: ${options.rootPersonCrId}`,
				warnings: [],
				rootPerson: { crId: '', name: 'Unknown', filePath: '' },
				brickWalls: [],
				summary: {
					totalSlots: 0,
					ancestorsFound: 0,
					brickWallCount: 0,
					maxGeneration: 0,
					completeness: 0
				}
			};
		}

		const rootPerson = nodeToReportPerson(rootNode);

		// Traverse ancestors and collect brick walls
		const brickWalls: BrickWallEntry[] = [];
		let ancestorsFound = 0;
		let maxGenFound = 1;

		this.collectBrickWalls(
			1, rootNode, familyGraph, options.maxGenerations, 1,
			[], brickWalls, { count: 0 }, { max: 1 }
		);

		// Count total ancestors found (need a separate pass)
		ancestorsFound = this.countAncestors(1, rootNode, familyGraph, options.maxGenerations, 1);
		maxGenFound = brickWalls.reduce((max, bw) => Math.max(max, bw.generation), 1);

		// Calculate theoretical maximum ancestor slots
		let totalSlots = 0;
		for (let gen = 2; gen <= options.maxGenerations; gen++) {
			totalSlots += Math.pow(2, gen - 1);
		}
		const completeness = totalSlots > 0
			? Math.round(((ancestorsFound - 1) / totalSlots) * 100) // -1 to exclude root
			: 0;

		// Sort brick walls
		this.sortBrickWalls(brickWalls, options.sortBy);

		// Generate markdown content
		const content = this.generateMarkdown(rootPerson, brickWalls, options, {
			totalSlots,
			ancestorsFound: ancestorsFound - 1, // Exclude root from count
			brickWallCount: brickWalls.length,
			maxGeneration: maxGenFound,
			completeness
		});

		const suggestedFilename = `Brick Wall Report - ${rootPerson.name}.md`;

		return {
			success: true,
			content,
			suggestedFilename: this.sanitizeFilename(suggestedFilename),
			stats: {
				peopleCount: ancestorsFound,
				eventsCount: 0,
				sourcesCount: 0,
				generationsCount: maxGenFound
			},
			warnings,
			rootPerson,
			brickWalls,
			summary: {
				totalSlots,
				ancestorsFound: ancestorsFound - 1,
				brickWallCount: brickWalls.length,
				maxGeneration: maxGenFound,
				completeness
			}
		};
	}

	/**
	 * Recursively traverse ancestors and collect brick walls (terminal nodes).
	 * A brick wall is any ancestor who has no father AND no mother defined.
	 * The root person (generation 1) is excluded.
	 */
	private collectBrickWalls(
		sosaNumber: number,
		node: PersonNode,
		familyGraph: FamilyGraphService,
		maxGenerations: number,
		currentGeneration: number,
		lineageParts: string[],
		brickWalls: BrickWallEntry[],
		ancestorCount: { count: number },
		maxGen: { max: number }
	): void {
		ancestorCount.count++;
		if (currentGeneration > maxGen.max) {
			maxGen.max = currentGeneration;
		}

		// Stop if we've reached max generations — this person is a brick wall
		// (we can't look further even if they have parents)
		if (currentGeneration >= maxGenerations) {
			// Only add if they actually have no parents, or if we hit the generation limit
			if (!node.fatherCrId && !node.motherCrId) {
				if (currentGeneration > 1) {
					brickWalls.push(this.createBrickWallEntry(node, currentGeneration, sosaNumber, lineageParts, familyGraph));
				}
			} else if (currentGeneration >= maxGenerations) {
				// At generation limit with parents — not a brick wall, just a boundary
				// Don't add these
			}
			return;
		}

		const hasFather = node.fatherCrId ? !!familyGraph.getPersonByCrId(node.fatherCrId) : false;
		const hasMother = node.motherCrId ? !!familyGraph.getPersonByCrId(node.motherCrId) : false;

		// If this person has no parents at all, they're a brick wall
		// (skip the root person at generation 1)
		if (!hasFather && !hasMother && currentGeneration > 1) {
			brickWalls.push(this.createBrickWallEntry(node, currentGeneration, sosaNumber, lineageParts, familyGraph));
			return;
		}

		// Recurse into father (2n)
		if (hasFather) {
			const father = familyGraph.getPersonByCrId(node.fatherCrId!);
			if (father) {
				const fatherLineage = [...lineageParts, this.getRelationshipTerm(currentGeneration, 'father')];
				this.collectBrickWalls(
					sosaNumber * 2, father, familyGraph, maxGenerations,
					currentGeneration + 1, fatherLineage, brickWalls, ancestorCount, maxGen
				);
			}
		} else if (currentGeneration > 1) {
			// Father slot is empty — this is a partial brick wall (missing father line)
			// Create a placeholder entry for the missing father
			brickWalls.push({
				person: {
					crId: '',
					name: `Unknown father of ${node.name}`,
					filePath: ''
				},
				generation: currentGeneration + 1,
				ahnentafelNumber: sosaNumber * 2,
				lineagePath: [...lineageParts, this.getRelationshipTerm(currentGeneration, 'father')].join(' → '),
				sourceCount: 0
			});
		}

		// Recurse into mother (2n+1)
		if (hasMother) {
			const mother = familyGraph.getPersonByCrId(node.motherCrId!);
			if (mother) {
				const motherLineage = [...lineageParts, this.getRelationshipTerm(currentGeneration, 'mother')];
				this.collectBrickWalls(
					sosaNumber * 2 + 1, mother, familyGraph, maxGenerations,
					currentGeneration + 1, motherLineage, brickWalls, ancestorCount, maxGen
				);
			}
		} else if (currentGeneration > 1) {
			// Mother slot is empty — missing mother line
			brickWalls.push({
				person: {
					crId: '',
					name: `Unknown mother of ${node.name}`,
					filePath: ''
				},
				generation: currentGeneration + 1,
				ahnentafelNumber: sosaNumber * 2 + 1,
				lineagePath: [...lineageParts, this.getRelationshipTerm(currentGeneration, 'mother')].join(' → '),
				sourceCount: 0
			});
		}
	}

	/**
	 * Create a brick wall entry from a person node
	 */
	private createBrickWallEntry(
		node: PersonNode,
		generation: number,
		sosaNumber: number,
		lineageParts: string[],
		_familyGraph: FamilyGraphService
	): BrickWallEntry {
		return {
			person: nodeToReportPerson(node),
			generation,
			ahnentafelNumber: sosaNumber,
			lineagePath: lineageParts.join(' → '),
			sourceCount: node.sourceCount ?? 0
		};
	}

	/**
	 * Count total ancestors found (including root)
	 */
	private countAncestors(
		sosaNumber: number,
		node: PersonNode,
		familyGraph: FamilyGraphService,
		maxGenerations: number,
		currentGeneration: number
	): number {
		let count = 1; // This person

		if (currentGeneration >= maxGenerations) return count;

		if (node.fatherCrId) {
			const father = familyGraph.getPersonByCrId(node.fatherCrId);
			if (father) {
				count += this.countAncestors(sosaNumber * 2, father, familyGraph, maxGenerations, currentGeneration + 1);
			}
		}

		if (node.motherCrId) {
			const mother = familyGraph.getPersonByCrId(node.motherCrId);
			if (mother) {
				count += this.countAncestors(sosaNumber * 2 + 1, mother, familyGraph, maxGenerations, currentGeneration + 1);
			}
		}

		return count;
	}

	/**
	 * Get a relationship term for lineage path construction
	 */
	private getRelationshipTerm(generation: number, parent: 'father' | 'mother'): string {
		if (generation === 1) {
			return parent === 'father' ? 'Father' : 'Mother';
		}
		// For deeper generations, use possessive form
		return parent === 'father' ? 'father' : 'mother';
	}

	/**
	 * Sort brick wall entries by the specified order
	 */
	private sortBrickWalls(brickWalls: BrickWallEntry[], sortBy: string): void {
		switch (sortBy) {
			case 'generation':
				brickWalls.sort((a, b) => a.generation - b.generation || a.ahnentafelNumber - b.ahnentafelNumber);
				break;
			case 'name':
				brickWalls.sort((a, b) => a.person.name.localeCompare(b.person.name));
				break;
			case 'research_level':
				brickWalls.sort((a, b) => {
					const aLevel = a.person.researchLevel ?? -1;
					const bLevel = b.person.researchLevel ?? -1;
					return aLevel - bLevel || a.generation - b.generation;
				});
				break;
			default:
				brickWalls.sort((a, b) => a.generation - b.generation || a.ahnentafelNumber - b.ahnentafelNumber);
		}
	}

	/**
	 * Get generation label
	 */
	private getGenerationLabel(generation: number): string {
		switch (generation) {
			case 1: return 'Self';
			case 2: return 'Parents';
			case 3: return 'Grandparents';
			case 4: return 'Great-grandparents';
			case 5: return '2nd great-grandparents';
			case 6: return '3rd great-grandparents';
			default: return `${generation - 2}th great-grandparents`;
		}
	}

	/**
	 * Get research level label
	 */
	private getResearchLevelLabel(level: number | undefined): string {
		if (level === undefined || level === null) return 'Unassessed';
		switch (level) {
			case 0: return 'Level 0 — No research';
			case 1: return 'Level 1 — Initial';
			case 2: return 'Level 2 — Basic';
			case 3: return 'Level 3 — Intermediate';
			case 4: return 'Level 4 — Advanced';
			case 5: return 'Level 5 — Comprehensive';
			case 6: return 'Level 6 — Exhaustive';
			default: return `Level ${level}`;
		}
	}

	/**
	 * Generate markdown content for the brick wall report
	 */
	private generateMarkdown(
		rootPerson: ReportPerson,
		brickWalls: BrickWallEntry[],
		options: BrickWallReportOptions,
		summary: BrickWallReportResult['summary']
	): string {
		const lines: string[] = [];

		// Title
		lines.push(`# Brick Wall Report: ${rootPerson.name}`);
		lines.push('');
		lines.push(`End-of-line ancestors identified across ${options.maxGenerations} generations.`);
		lines.push('');

		// Summary section
		lines.push('## Summary');
		lines.push('');
		lines.push(`- **Ancestors found:** ${summary.ancestorsFound}`);
		lines.push(`- **Brick walls:** ${summary.brickWallCount}`);
		lines.push(`- **Deepest generation:** ${summary.maxGeneration} (${this.getGenerationLabel(summary.maxGeneration)})`);
		lines.push(`- **Tree completeness:** ${summary.completeness}%`);
		lines.push('');

		// Completeness by generation
		lines.push('### Completeness by generation');
		lines.push('');
		lines.push('| Generation | Level | Found | Expected | Complete |');
		lines.push('|-----------|-------|-------|----------|----------|');

		for (let gen = 2; gen <= Math.min(options.maxGenerations, summary.maxGeneration + 1); gen++) {
			const expected = Math.pow(2, gen - 1);
			const genAncestors = this.countAncestorsAtGeneration(brickWalls, gen, expected);
			const percent = Math.round((genAncestors / expected) * 100);
			lines.push(`| ${gen} | ${this.getGenerationLabel(gen)} | ${genAncestors} | ${expected} | ${percent}% |`);
		}
		lines.push('');

		if (brickWalls.length === 0) {
			lines.push('No brick walls found — all ancestor lines extend to the generation limit.');
			lines.push('');
		} else {
			// Brick wall listing
			lines.push('## Brick walls');
			lines.push('');

			if (options.sortBy === 'generation') {
				// Group by generation
				const byGeneration = new Map<number, BrickWallEntry[]>();
				for (const bw of brickWalls) {
					const gen = bw.generation;
					if (!byGeneration.has(gen)) byGeneration.set(gen, []);
					byGeneration.get(gen)!.push(bw);
				}

				for (const [gen, entries] of byGeneration) {
					lines.push(`### Generation ${gen} (${this.getGenerationLabel(gen)})`);
					lines.push('');

					for (const entry of entries) {
						this.renderBrickWallEntry(lines, entry, options.includeDetails);
					}
				}
			} else {
				// Flat list
				for (const entry of brickWalls) {
					this.renderBrickWallEntry(lines, entry, options.includeDetails);
				}
			}
		}

		// Footer
		lines.push('---');
		lines.push('*Generated by Charted Roots*');

		return lines.join('\n');
	}

	/**
	 * Render a single brick wall entry as markdown
	 */
	private renderBrickWallEntry(lines: string[], entry: BrickWallEntry, includeDetails: boolean): void {
		const isUnknown = !entry.person.crId;
		const nameDisplay = isUnknown
			? `*${entry.person.name}*`
			: `**[[${entry.person.name}]]**`;

		lines.push(`- ${nameDisplay} (Gen ${entry.generation}, #${entry.ahnentafelNumber})`);
		lines.push(`  - Lineage: ${entry.lineagePath || 'Direct'}`);

		if (includeDetails && !isUnknown) {
			if (entry.person.birthDate || entry.person.birthPlace) {
				const parts = [entry.person.birthDate, entry.person.birthPlace].filter(Boolean);
				lines.push(`  - Birth: ${parts.join(', ')}`);
			}
			if (entry.person.deathDate || entry.person.deathPlace) {
				const parts = [entry.person.deathDate, entry.person.deathPlace].filter(Boolean);
				lines.push(`  - Death: ${parts.join(', ')}`);
			}
			lines.push(`  - Sources: ${entry.sourceCount}`);
			if (entry.person.researchLevel !== undefined) {
				lines.push(`  - Research: ${this.getResearchLevelLabel(entry.person.researchLevel)}`);
			}
		}

		lines.push('');
	}

	/**
	 * Estimate the number of ancestors found at a given generation
	 * by looking at brick walls at that generation and deeper
	 */
	private countAncestorsAtGeneration(
		brickWalls: BrickWallEntry[],
		generation: number,
		expected: number
	): number {
		// Count unknown placeholders at this generation
		const unknownSlots = brickWalls.filter(bw => bw.generation === generation && bw.person.crId === '');
		// The number of ancestors at this generation is the expected minus the unknown slots
		return Math.max(0, expected - unknownSlots.length);
	}

	/**
	 * Sanitize a filename by removing invalid characters
	 */
	private sanitizeFilename(filename: string): string {
		return filename.replace(/[<>:"/\\|?*]/g, '-');
	}
}
