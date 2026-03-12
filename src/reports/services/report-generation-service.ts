/**
 * Report Generation Service
 *
 * Main orchestration service for generating genealogy reports.
 * Coordinates between specific report generators and handles output.
 */

import { App, TFolder, normalizePath } from 'obsidian';
import type { CanvasRootsSettings } from '../../settings';
import type {
	ReportType,
	ReportResult,
	FamilyGroupSheetOptions,
	IndividualSummaryOptions,
	AhnentafelOptions,
	GapsReportOptions,
	RegisterReportOptions,
	PedigreeChartOptions,
	DescendantChartOptions,
	SourceSummaryOptions,
	SourcesByRoleOptions,
	TimelineReportOptions,
	PlaceSummaryOptions,
	MediaInventoryOptions,
	UniverseOverviewOptions,
	CollectionOverviewOptions,
	ResearchReportExportOptions,
	BrickWallReportOptions,
	UnconnectedPeopleOptions
} from '../types/report-types';
import { FamilyGroupSheetGenerator } from './family-group-sheet-generator';
import { IndividualSummaryGenerator } from './individual-summary-generator';
import { AhnentafelGenerator } from './ahnentafel-generator';
import { GapsReportGenerator } from './gaps-report-generator';
import { RegisterReportGenerator } from './register-report-generator';
import { PedigreeChartGenerator } from './pedigree-chart-generator';
import { DescendantChartGenerator } from './descendant-chart-generator';
import { SourceSummaryGenerator } from './source-summary-generator';
import { SourcesByRoleGenerator } from './sources-by-role-generator';
import { TimelineGenerator } from './timeline-generator';
import { PlaceSummaryGenerator } from './place-summary-generator';
import { MediaInventoryGenerator } from './media-inventory-generator';
import { UniverseOverviewGenerator } from './universe-overview-generator';
import { CollectionOverviewGenerator } from './collection-overview-generator';
import { ResearchReportExportGenerator } from './research-report-export-generator';
import { BrickWallReportGenerator } from './brick-wall-report-generator';
import { UnconnectedPeopleGenerator } from './unconnected-people-generator';
import { getLogger } from '../../core/logging';

const logger = getLogger('ReportGenerationService');

/**
 * Service for generating and outputting genealogy reports
 */
export class ReportGenerationService {
	private app: App;
	private settings: CanvasRootsSettings;

	// Specific generators
	private familyGroupSheetGenerator: FamilyGroupSheetGenerator;
	private individualSummaryGenerator: IndividualSummaryGenerator;
	private ahnentafelGenerator: AhnentafelGenerator;
	private gapsReportGenerator: GapsReportGenerator;
	private registerReportGenerator: RegisterReportGenerator;
	private pedigreeChartGenerator: PedigreeChartGenerator;
	private descendantChartGenerator: DescendantChartGenerator;
	private sourceSummaryGenerator: SourceSummaryGenerator;
	private sourcesByRoleGenerator: SourcesByRoleGenerator;
	private timelineGenerator: TimelineGenerator;
	private placeSummaryGenerator: PlaceSummaryGenerator;
	private mediaInventoryGenerator: MediaInventoryGenerator;
	private universeOverviewGenerator: UniverseOverviewGenerator;
	private collectionOverviewGenerator: CollectionOverviewGenerator;
	private researchReportExportGenerator: ResearchReportExportGenerator;
	private brickWallReportGenerator: BrickWallReportGenerator;
	private unconnectedPeopleGenerator: UnconnectedPeopleGenerator;

	constructor(app: App, settings: CanvasRootsSettings) {
		this.app = app;
		this.settings = settings;

		// Initialize generators
		this.familyGroupSheetGenerator = new FamilyGroupSheetGenerator(app, settings);
		this.individualSummaryGenerator = new IndividualSummaryGenerator(app, settings);
		this.ahnentafelGenerator = new AhnentafelGenerator(app, settings);
		this.gapsReportGenerator = new GapsReportGenerator(app, settings);
		this.registerReportGenerator = new RegisterReportGenerator(app, settings);
		this.pedigreeChartGenerator = new PedigreeChartGenerator(app, settings);
		this.descendantChartGenerator = new DescendantChartGenerator(app, settings);
		this.sourceSummaryGenerator = new SourceSummaryGenerator(app, settings);
		this.sourcesByRoleGenerator = new SourcesByRoleGenerator(app, settings);
		this.timelineGenerator = new TimelineGenerator(app, settings);
		this.placeSummaryGenerator = new PlaceSummaryGenerator(app, settings);
		this.mediaInventoryGenerator = new MediaInventoryGenerator(app, settings);
		this.universeOverviewGenerator = new UniverseOverviewGenerator(app, settings);
		this.collectionOverviewGenerator = new CollectionOverviewGenerator(app, settings);
		this.researchReportExportGenerator = new ResearchReportExportGenerator(app, settings);
		this.brickWallReportGenerator = new BrickWallReportGenerator(app, settings);
		this.unconnectedPeopleGenerator = new UnconnectedPeopleGenerator(app, settings);
	}

	/**
	 * Generate a report based on type and options
	 */
	async generateReport(
		type: ReportType,
		options: FamilyGroupSheetOptions | IndividualSummaryOptions | AhnentafelOptions | GapsReportOptions | RegisterReportOptions | PedigreeChartOptions | DescendantChartOptions | SourceSummaryOptions | SourcesByRoleOptions | TimelineReportOptions | PlaceSummaryOptions | MediaInventoryOptions | UniverseOverviewOptions | CollectionOverviewOptions | ResearchReportExportOptions | BrickWallReportOptions | UnconnectedPeopleOptions
	): Promise<ReportResult> {
		logger.info('generate', `Generating ${type} report`);

		let result: ReportResult;

		switch (type) {
			case 'family-group-sheet':
				result = await this.familyGroupSheetGenerator.generate(options as FamilyGroupSheetOptions);
				break;
			case 'individual-summary':
				result = await this.individualSummaryGenerator.generate(options as IndividualSummaryOptions);
				break;
			case 'ahnentafel':
				result = await this.ahnentafelGenerator.generate(options as AhnentafelOptions);
				break;
			case 'gaps-report':
				result = await this.gapsReportGenerator.generate(options as GapsReportOptions);
				break;
			case 'register-report':
				result = await this.registerReportGenerator.generate(options as RegisterReportOptions);
				break;
			case 'pedigree-chart':
				result = await this.pedigreeChartGenerator.generate(options as PedigreeChartOptions);
				break;
			case 'descendant-chart':
				result = await this.descendantChartGenerator.generate(options as DescendantChartOptions);
				break;
			case 'source-summary':
				result = await this.sourceSummaryGenerator.generate(options as SourceSummaryOptions);
				break;
			case 'sources-by-role':
				result = await this.sourcesByRoleGenerator.generate(options as SourcesByRoleOptions);
				break;
			case 'timeline-report':
				result = await this.timelineGenerator.generate(options as TimelineReportOptions);
				break;
			case 'place-summary':
				result = await this.placeSummaryGenerator.generate(options as PlaceSummaryOptions);
				break;
			case 'media-inventory':
				result = await this.mediaInventoryGenerator.generate(options as MediaInventoryOptions);
				break;
			case 'universe-overview':
				result = await this.universeOverviewGenerator.generate(options as UniverseOverviewOptions);
				break;
			case 'collection-overview':
				result = await this.collectionOverviewGenerator.generate(options as CollectionOverviewOptions);
				break;
			case 'research-report-export':
				result = await this.researchReportExportGenerator.generate(options as ResearchReportExportOptions);
				break;
			case 'brick-wall-report':
				result = await this.brickWallReportGenerator.generate(options as BrickWallReportOptions);
				break;
			case 'unconnected-people':
				result = await this.unconnectedPeopleGenerator.generate(options as UnconnectedPeopleOptions);
				break;
			default:
				return {
					success: false,
					content: '',
					suggestedFilename: 'report.md',
					stats: { peopleCount: 0, eventsCount: 0, sourcesCount: 0 },
					error: `Unknown report type: ${type}`,
					warnings: []
				};
		}

		// Handle output if generation was successful
		if (result.success && options.outputMethod === 'vault') {
			await this.saveToVault(result.content, options.filename ?? result.suggestedFilename, options.outputFolder);
		}

		return result;
	}

	/**
	 * Save report content to the vault
	 */
	async saveToVault(content: string, filename: string, folder?: string): Promise<string> {
		// Ensure filename has .md extension
		const normalizedFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

		// Determine output path
		let outputPath: string;
		if (folder) {
			// Ensure folder exists
			await this.ensureFolderExists(folder);
			outputPath = normalizePath(`${folder}/${normalizedFilename}`);
		} else {
			// Use root of vault
			outputPath = normalizePath(normalizedFilename);
		}

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(outputPath);
		if (existingFile) {
			// Generate unique filename
			const baseName = normalizedFilename.replace('.md', '');
			let counter = 1;
			while (this.app.vault.getAbstractFileByPath(folder
				? normalizePath(`${folder}/${baseName}-${counter}.md`)
				: normalizePath(`${baseName}-${counter}.md`))) {
				counter++;
			}
			outputPath = folder
				? normalizePath(`${folder}/${baseName}-${counter}.md`)
				: normalizePath(`${baseName}-${counter}.md`);
		}

		// Create the file
		await this.app.vault.create(outputPath, content);
		logger.info('save', `Report saved to ${outputPath}`);

		return outputPath;
	}

	/**
	 * Trigger download of report content as a file
	 */
	downloadReport(content: string, filename: string): void {
		// Ensure filename has .md extension
		const normalizedFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

		// Create blob and download
		const blob = new Blob([content], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = normalizedFilename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		logger.info('download', `Report downloaded as ${normalizedFilename}`);
	}

	/**
	 * Ensure a folder exists, creating it if necessary
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		} else if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${normalizedPath}`);
		}
	}

	/**
	 * Get available output folders in the vault
	 */
	getAvailableFolders(): string[] {
		const folders: string[] = [''];  // Root folder

		const collectFolders = (folder: TFolder, prefix: string = '') => {
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					const path = prefix ? `${prefix}/${child.name}` : child.name;
					folders.push(path);
					collectFolders(child, path);
				}
			}
		};

		collectFolders(this.app.vault.getRoot());
		return folders.sort();
	}

	/**
	 * Export timeline to Canvas format
	 * Used for visual canvas exports which bypass the normal markdown generation
	 */
	async exportTimelineToCanvas(options: TimelineReportOptions): Promise<{
		success: boolean;
		path?: string;
		error?: string;
		warnings?: string[];
	}> {
		return this.timelineGenerator.exportToCanvas(options);
	}

	/**
	 * Export timeline to Excalidraw format
	 * Used for visual excalidraw exports which bypass the normal markdown generation
	 */
	async exportTimelineToExcalidraw(options: TimelineReportOptions): Promise<{
		success: boolean;
		path?: string;
		error?: string;
		warnings?: string[];
	}> {
		return this.timelineGenerator.exportToExcalidraw(options);
	}
}

/**
 * Factory function to create a ReportGenerationService
 */
export function createReportGenerationService(app: App, settings: CanvasRootsSettings): ReportGenerationService {
	return new ReportGenerationService(app, settings);
}
