/**
 * Sources by Role Generator (#219)
 *
 * Generates a report of sources where a person appears in various roles
 * (witness, informant, official, etc.).
 */

import { App } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	SourcesByRoleOptions,
	SourcesByRoleResult,
	SourceRoleEntry,
	ReportPerson
} from '../types/report-types';
import { createConfiguredFamilyGraph, PersonNode } from '../../core/family-graph';
import { nodeToReportPerson } from './report-utils';
import { SourceService } from '../../sources/services/source-service';
import {
	PERSON_ROLE_PROPERTIES,
	PERSON_ROLE_LABELS,
	parsePersonRoleEntries,
	getSourceQuality,
	SOURCE_CLASSIFICATION_LABELS,
	INFORMATION_CLASSIFICATION_LABELS,
	EVIDENCE_CLASSIFICATION_LABELS
} from '../../sources/types/source-types';

import { getLogger } from '../../core/logging';

/**
 * Quality type used in report entries
 */
type ReportQuality = 'primary' | 'secondary' | 'derivative' | 'undetermined';

const logger = getLogger('SourcesByRoleGenerator');

/**
 * Generator for Sources by Role reports
 */
export class SourcesByRoleGenerator {
	private app: App;
	private settings: CanvasRootsSettings;
	private sourceService: SourceService;

	constructor(app: App, settings: CanvasRootsSettings, sourceService?: SourceService) {
		this.app = app;
		this.settings = settings;
		this.sourceService = sourceService ?? new SourceService(app, settings);
	}

	/**
	 * Generate a Sources by Role report
	 */
	async generate(options: SourcesByRoleOptions): Promise<SourcesByRoleResult> {
		await Promise.resolve(); // Satisfy async requirement
		logger.info('generate', 'Generating Sources by Role', { personCrId: options.personCrId });

		const warnings: string[] = [];

		// Initialize services
		const familyGraph = createConfiguredFamilyGraph(this.app, this.settings);

		const sourceService = this.sourceService;

		// Get the person
		const personNode = familyGraph.getPersonByCrId(options.personCrId);
		if (!personNode) {
			return this.errorResult(`Person not found: ${options.personCrId}`);
		}

		const person = nodeToReportPerson(personNode);

		// Get all sources
		const allSources = sourceService.getAllSources();

		// Find sources where this person appears in any role
		const entriesByRole: Record<string, SourceRoleEntry[]> = {};
		const allEntries: SourceRoleEntry[] = [];
		const byRoleCounts: Record<string, number> = {};
		const processedSourceIds = new Set<string>();

		// Initialize role buckets
		for (const prop of PERSON_ROLE_PROPERTIES) {
			entriesByRole[prop] = [];
			byRoleCounts[prop] = 0;
		}

		// Check each source for this person
		for (const source of allSources) {
			for (const roleProp of PERSON_ROLE_PROPERTIES) {
				// Check role filter
				if (options.roleFilter.length > 0 && !options.roleFilter.includes(roleProp)) {
					continue;
				}

				const roleEntries = source[roleProp];
				if (!roleEntries || roleEntries.length === 0) continue;

				// Parse role entries to find this person
				const parsedEntries = parsePersonRoleEntries(roleEntries);

				for (const parsed of parsedEntries) {
					// Check if this entry matches the person
					const matchesPerson = this.doesEntryMatchPerson(
						parsed.linkTarget,
						parsed.displayName,
						personNode
					);

					if (matchesPerson) {
						const quality: ReportQuality = getSourceQuality(source);

						const entry: SourceRoleEntry = {
							source: {
								crId: source.crId,
								title: source.title,
								sourceType: source.sourceType,
								quality,
								repository: source.repository,
								sourceClassification: source.sourceClassification,
								informationClassification: source.informationClassification,
								evidenceClassification: source.evidenceClassification,
								factTypes: []
							},
							role: roleProp,
							roleLabel: PERSON_ROLE_LABELS[roleProp],
							details: parsed.details,
							date: source.date
						};

						entriesByRole[roleProp].push(entry);
						allEntries.push(entry);
						byRoleCounts[roleProp]++;
						processedSourceIds.add(source.crId);
					}
				}
			}
		}

		// Sort entries by date if chronological grouping
		if (options.groupBy === 'chronological') {
			allEntries.sort((a, b) => {
				if (!a.date && !b.date) return 0;
				if (!a.date) return 1;
				if (!b.date) return -1;
				return a.date.localeCompare(b.date);
			});
		}

		const summary = {
			totalSources: processedSourceIds.size,
			byRole: byRoleCounts
		};

		// Generate markdown content
		const content = this.generateMarkdown(
			person,
			summary,
			entriesByRole,
			allEntries,
			options
		);

		const suggestedFilename = `Sources by Role - ${person.name}.md`;

		return {
			success: true,
			content,
			suggestedFilename: this.sanitizeFilename(suggestedFilename),
			stats: {
				peopleCount: 1,
				eventsCount: 0,
				sourcesCount: processedSourceIds.size
			},
			warnings,
			person,
			summary,
			entriesByRole,
			allEntries
		};
	}

	/**
	 * Check if a parsed role entry matches the target person
	 */
	private doesEntryMatchPerson(
		linkTarget: string,
		displayName: string,
		person: PersonNode
	): boolean {
		// Match by file basename (without extension)
		const personFileName = person.file.basename;
		if (linkTarget === personFileName) return true;

		// Match by full file path
		if (linkTarget === person.file.path) return true;

		// Match by name
		if (linkTarget === person.name || displayName === person.name) return true;

		// Match by cr_id (unlikely but possible)
		if (linkTarget === person.crId) return true;

		return false;
	}

	/**
	 * Generate markdown content for the Sources by Role report
	 */
	private generateMarkdown(
		person: ReportPerson,
		summary: { totalSources: number; byRole: Record<string, number> },
		entriesByRole: Record<string, SourceRoleEntry[]>,
		allEntries: SourceRoleEntry[],
		options: SourcesByRoleOptions
	): string {
		const lines: string[] = [];
		const date = new Date().toLocaleDateString();

		// Title
		lines.push(`# Sources by Role: ${person.name}`);
		lines.push('');
		lines.push(`Generated: ${date}`);
		lines.push('');

		// Summary
		lines.push('## Summary');
		lines.push('');
		lines.push(`- **Total sources:** ${summary.totalSources}`);
		lines.push('');

		// Role breakdown
		lines.push('### By role');
		lines.push('');
		for (const prop of PERSON_ROLE_PROPERTIES) {
			const count = summary.byRole[prop] || 0;
			if (count > 0) {
				lines.push(`- **${PERSON_ROLE_LABELS[prop]}:** ${count}`);
			}
		}
		lines.push('');

		// Main content based on groupBy option
		if (options.groupBy === 'role') {
			this.generateByRoleContent(lines, entriesByRole, options);
		} else if (options.groupBy === 'chronological') {
			this.generateChronologicalContent(lines, allEntries, options);
		} else {
			// groupBy === 'source'
			this.generateBySourceContent(lines, allEntries, options);
		}

		// Footer
		lines.push('---');
		lines.push('*Generated by Charted Roots*');

		return lines.join('\n');
	}

	/**
	 * Generate content grouped by role
	 */
	private generateByRoleContent(
		lines: string[],
		entriesByRole: Record<string, SourceRoleEntry[]>,
		options: SourcesByRoleOptions
	): void {
		lines.push('## Sources by role');
		lines.push('');

		for (const prop of PERSON_ROLE_PROPERTIES) {
			const entries = entriesByRole[prop];
			if (!entries || entries.length === 0) continue;

			lines.push(`### ${PERSON_ROLE_LABELS[prop]}`);
			lines.push('');

			this.generateSourceTable(lines, entries, options);
			lines.push('');
		}
	}

	/**
	 * Generate content in chronological order
	 */
	private generateChronologicalContent(
		lines: string[],
		allEntries: SourceRoleEntry[],
		options: SourcesByRoleOptions
	): void {
		lines.push('## Sources (chronological)');
		lines.push('');

		if (allEntries.length === 0) {
			lines.push('*No sources found*');
			lines.push('');
			return;
		}

		this.generateSourceTable(lines, allEntries, options, true);
		lines.push('');
	}

	/**
	 * Generate content grouped by source
	 */
	private generateBySourceContent(
		lines: string[],
		allEntries: SourceRoleEntry[],
		options: SourcesByRoleOptions
	): void {
		lines.push('## Sources');
		lines.push('');

		if (allEntries.length === 0) {
			lines.push('*No sources found*');
			lines.push('');
			return;
		}

		// Group by source
		const bySource = new Map<string, SourceRoleEntry[]>();
		for (const entry of allEntries) {
			const existing = bySource.get(entry.source.crId) || [];
			existing.push(entry);
			bySource.set(entry.source.crId, existing);
		}

		// Sort sources by title
		const sortedSources = Array.from(bySource.entries())
			.sort((a, b) => {
				const titleA = a[1][0]?.source.title || '';
				const titleB = b[1][0]?.source.title || '';
				return titleA.localeCompare(titleB);
			});

		for (const [_crId, entries] of sortedSources) {
			const source = entries[0].source;
			lines.push(`### ${source.title}`);
			lines.push('');

			if (source.sourceType) {
				lines.push(`- **Type:** ${source.sourceType}`);
			}
			if (entries[0].date) {
				lines.push(`- **Date:** ${entries[0].date}`);
			}
			if (options.showSourceQuality && source.quality) {
				lines.push(`- **Quality:** ${this.formatQuality(source.quality)}`);
			}
			if (options.showSourceQuality && source.sourceClassification) {
				lines.push(`- **Source classification:** ${SOURCE_CLASSIFICATION_LABELS[source.sourceClassification].label}`);
			}
			if (options.showSourceQuality && source.informationClassification) {
				lines.push(`- **Information classification:** ${INFORMATION_CLASSIFICATION_LABELS[source.informationClassification].label}`);
			}
			if (options.showSourceQuality && source.evidenceClassification) {
				lines.push(`- **Evidence classification:** ${EVIDENCE_CLASSIFICATION_LABELS[source.evidenceClassification].label}`);
			}
			if (options.showRepositoryInfo && source.repository) {
				lines.push(`- **Repository:** ${source.repository}`);
			}

			lines.push('');
			lines.push('**Roles:**');
			for (const entry of entries) {
				const detailStr = options.showRoleDetails && entry.details ? ` (${entry.details})` : '';
				lines.push(`- ${entry.roleLabel}${detailStr}`);
			}
			lines.push('');
		}
	}

	/**
	 * Generate a table of source entries
	 */
	private generateSourceTable(
		lines: string[],
		entries: SourceRoleEntry[],
		options: SourcesByRoleOptions,
		includeRole = false
	): void {
		// Check if any entry has Mills classification data
		const hasMillsData = options.showSourceQuality && entries.some(
			e => e.source.sourceClassification || e.source.informationClassification || e.source.evidenceClassification
		);

		// Build header
		const headers = ['Source'];
		if (includeRole) headers.push('Role');
		if (options.showRoleDetails) headers.push('Details');
		headers.push('Date');
		if (options.showSourceQuality) headers.push('Quality');
		if (hasMillsData) headers.push('Source cls.', 'Information cls.', 'Evidence cls.');
		if (options.showRepositoryInfo) headers.push('Repository');

		lines.push('| ' + headers.join(' | ') + ' |');
		lines.push('|' + headers.map(() => '---').join('|') + '|');

		for (const entry of entries) {
			const cols: string[] = [];

			// Source link
			cols.push(`[[${entry.source.title}]]`);

			// Role (if showing in table)
			if (includeRole) {
				const detailStr = options.showRoleDetails && entry.details ? ` (${entry.details})` : '';
				cols.push(`${entry.roleLabel}${detailStr}`);
			}

			// Details column (if separate)
			if (options.showRoleDetails && !includeRole) {
				cols.push(entry.details || '');
			}

			// Date
			cols.push(entry.date || '');

			// Quality
			if (options.showSourceQuality) {
				cols.push(this.formatQuality(entry.source.quality));
			}

			// Mills classifications
			if (hasMillsData) {
				const sc = entry.source.sourceClassification ? SOURCE_CLASSIFICATION_LABELS[entry.source.sourceClassification].label : '';
				const ic = entry.source.informationClassification ? INFORMATION_CLASSIFICATION_LABELS[entry.source.informationClassification].label : '';
				const ec = entry.source.evidenceClassification ? EVIDENCE_CLASSIFICATION_LABELS[entry.source.evidenceClassification].label : '';
				cols.push(sc, ic, ec);
			}

			// Repository
			if (options.showRepositoryInfo) {
				cols.push(entry.source.repository || '');
			}

			lines.push('| ' + cols.join(' | ') + ' |');
		}
	}

	/**
	 * Format quality level for display
	 */
	private formatQuality(quality?: 'primary' | 'secondary' | 'derivative' | 'undetermined'): string {
		if (!quality) return '';
		switch (quality) {
			case 'primary':
				return 'Primary';
			case 'secondary':
				return 'Secondary';
			case 'derivative':
				return 'Derivative';
			case 'undetermined':
				return 'Undetermined';
			default:
				return quality;
		}
	}

	/**
	 * Create an error result
	 */
	private errorResult(error: string): SourcesByRoleResult {
		return {
			success: false,
			content: '',
			suggestedFilename: 'sources-by-role.md',
			stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0 },
			error,
			warnings: [],
			person: { crId: '', name: 'Unknown', filePath: '' },
			summary: { totalSources: 0, byRole: {} },
			entriesByRole: {},
			allEntries: []
		};
	}

	/**
	 * Sanitize a filename by removing invalid characters
	 */
	private sanitizeFilename(filename: string): string {
		return filename.replace(/[<>:"/\\|?*]/g, '-');
	}
}
