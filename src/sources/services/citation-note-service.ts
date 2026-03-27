/**
 * Citation Note Service
 *
 * CRUD operations for citation notes — lightweight linkage records
 * connecting a source to a specific fact on a subject with page/quality metadata.
 * Each citation note represents one citation occurrence (one GEDCOM SOUR block).
 */

import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { CitationData, CitationNote, CitationQuality } from '../types/citation-types';
import { generateCrId } from '../../core/uuid';

export class CitationNoteService {
	private app: App;
	private plugin: CanvasRootsPlugin;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
	}

	/**
	 * Create a citation note in the citations folder
	 */
	async createCitationNote(data: CitationData): Promise<TFile> {
		const folder = await this.ensureCitationsFolder();
		const crId = generateCrId();

		// Build filename from source, subject, and fact
		const sourceBasename = this.extractBasename(data.source);
		const subjectBasename = this.extractBasename(data.subject);
		const filename = this.sanitizeFilename(
			`Citation - ${sourceBasename} - ${subjectBasename} ${data.fact}`
		);

		// Deduplicate filename if needed
		const finalPath = await this.getUniqueFilePath(folder.path, filename);

		// Build frontmatter
		const lines: string[] = [
			'---',
			'cr_type: citation',
			`cr_id: ${crId}`,
			`source: "${data.source}"`,
		];
		if (data.sourceCrId) {
			lines.push(`source_id: ${data.sourceCrId}`);
		}
		lines.push(`subject: "${data.subject}"`);
		if (data.subjectCrId) {
			lines.push(`subject_id: ${data.subjectCrId}`);
		}
		lines.push(`fact: ${data.fact}`);
		if (data.page) {
			lines.push(`page: "${data.page}"`);
		}
		if (data.quality !== undefined) {
			lines.push(`quality: ${data.quality}`);
		}
		lines.push('---', '');

		const content = lines.join('\n');
		return await this.app.vault.create(finalPath, content);
	}

	/**
	 * Create multiple citation notes in batch (used during GEDCOM import)
	 */
	async createCitationNotes(citations: CitationData[]): Promise<TFile[]> {
		const files: TFile[] = [];
		for (const data of citations) {
			const file = await this.createCitationNote(data);
			files.push(file);
		}
		return files;
	}

	/**
	 * Get all citation notes for a given subject (person or event)
	 */
	getCitationsForSubject(subjectCrId: string): CitationNote[] {
		const citations: CitationNote[] = [];
		const folder = this.plugin.settings.citationsFolder;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!file.path.startsWith(folder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || fm.cr_type !== 'citation') continue;

			const subjectId = fm.subject_id as string;
			if (subjectId !== subjectCrId) continue;

			citations.push(this.parseCitationNote(file, fm));
		}

		return citations;
	}

	/**
	 * Get all citation notes for a given source
	 */
	getCitationsForSource(sourceCrId: string): CitationNote[] {
		const citations: CitationNote[] = [];
		const folder = this.plugin.settings.citationsFolder;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!file.path.startsWith(folder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || fm.cr_type !== 'citation') continue;

			const sourceId = fm.source_id as string;
			if (sourceId !== sourceCrId) continue;

			citations.push(this.parseCitationNote(file, fm));
		}

		return citations;
	}

	/**
	 * Get all citation notes in the vault
	 */
	getAllCitations(): CitationNote[] {
		const citations: CitationNote[] = [];
		const folder = this.plugin.settings.citationsFolder;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!file.path.startsWith(folder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || fm.cr_type !== 'citation') continue;

			citations.push(this.parseCitationNote(file, fm));
		}

		return citations;
	}

	/**
	 * Parse a citation note from frontmatter
	 */
	private parseCitationNote(
		file: TFile,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fm: Record<string, any>
	): CitationNote {
		return {
			filePath: file.path,
			crId: fm.cr_id as string,
			source: fm.source as string,
			sourceCrId: fm.source_id as string | undefined,
			subject: fm.subject as string,
			subjectCrId: fm.subject_id as string | undefined,
			fact: fm.fact as string,
			page: fm.page as string | undefined,
			quality: fm.quality as CitationQuality | undefined
		};
	}

	/**
	 * Ensure the citations folder exists
	 */
	private async ensureCitationsFolder(): Promise<TFolder> {
		const folderPath = normalizePath(this.plugin.settings.citationsFolder);
		const existing = this.app.vault.getAbstractFileByPath(folderPath);
		if (existing instanceof TFolder) {
			return existing;
		}
		return await this.app.vault.createFolder(folderPath);
	}

	/**
	 * Extract basename from a wikilink like "[[Census 1850]]" → "Census 1850"
	 */
	private extractBasename(wikilink: string): string {
		const match = wikilink.match(/\[\[([^\]|]+)/);
		return match ? match[1] : wikilink;
	}

	/**
	 * Sanitize a string for use as a filename
	 */
	private sanitizeFilename(name: string): string {
		return name.replace(/[\\/:*?"<>|]/g, '-');
	}

	/**
	 * Get a unique file path, appending a number if the file already exists
	 */
	private async getUniqueFilePath(folder: string, basename: string): Promise<string> {
		let path = normalizePath(`${folder}/${basename}.md`);
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(`${folder}/${basename} ${counter}.md`);
			counter++;
		}
		return path;
	}
}
