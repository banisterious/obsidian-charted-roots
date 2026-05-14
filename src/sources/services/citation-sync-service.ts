/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Citation Sync Service
 *
 * Bidirectional sync between citation notes and sourced_* frontmatter fields.
 * - Forward: derive sourced_* fields from citation notes
 * - Reverse: generate citation notes from existing sourced_* fields
 */

import { App, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { CitationNoteService } from './citation-note-service';
import type { CitationData } from '../types/citation-types';
import { SOURCED_PROPERTY_NAMES, type SourcedPropertyName } from '../types/source-types';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';
import { getLogger } from '../../core/logging';

const logger = getLogger('CitationSyncService');

/**
 * Map citation fact names to sourced_* property names
 */
const FACT_TO_SOURCED: Record<string, SourcedPropertyName> = {
	'birth_date': 'sourced_birth_date',
	'birth_place': 'sourced_birth_place',
	'death_date': 'sourced_death_date',
	'death_place': 'sourced_death_place',
	'parents': 'sourced_parents',
	'marriage_date': 'sourced_marriage_date',
	'marriage_place': 'sourced_marriage_place',
	'spouse': 'sourced_spouse',
	'occupation': 'sourced_occupation',
	'residence': 'sourced_residence'
};

/**
 * Reverse map: sourced_* property names to citation fact names
 */
const SOURCED_TO_FACT: Record<string, string> = {};
for (const [fact, sourced] of Object.entries(FACT_TO_SOURCED)) {
	SOURCED_TO_FACT[sourced] = fact;
}

export class CitationSyncService {
	private app: App;
	private plugin: CanvasRootsPlugin;
	private citationService: CitationNoteService;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.citationService = new CitationNoteService(plugin);
	}

	/**
	 * Sync sourced_* fields from citation notes for a single person.
	 * Reads all citation notes for the person and populates/updates
	 * sourced_* frontmatter properties.
	 */
	async syncSourcedFieldsForPerson(personFile: TFile): Promise<number> {
		const cache = this.app.metadataCache.getFileCache(personFile);
		const crId = cache?.frontmatter?.cr_id as string;
		if (!crId) return 0;

		const citations = this.citationService.getCitationsForSubject(crId);
		if (citations.length === 0) return 0;

		// Group citations by sourced property
		const sourcedMap = new Map<SourcedPropertyName, Set<string>>();

		for (const citation of citations) {
			const sourcedProp = FACT_TO_SOURCED[citation.fact];
			if (!sourcedProp) continue;

			const sourceName = extractWikilinkPath(citation.source);
			if (!sourceName) continue;

			const existing = sourcedMap.get(sourcedProp) || new Set<string>();
			existing.add(sourceName);
			sourcedMap.set(sourcedProp, existing);
		}

		if (sourcedMap.size === 0) return 0;

		// Update frontmatter
		let fieldsUpdated = 0;
		await this.app.fileManager.processFrontMatter(personFile, (frontmatter) => {
			for (const [prop, sourceNames] of sourcedMap) {
				const existing = Array.isArray(frontmatter[prop])
					? (frontmatter[prop] as string[]).map(s => extractWikilinkPath(s))
					: [];
				const merged = new Set([...existing, ...sourceNames]);
				frontmatter[prop] = Array.from(merged).map(name => `[[${name}]]`);
				fieldsUpdated++;
			}
		});

		logger.info('sync', `Updated ${fieldsUpdated} sourced fields for ${personFile.basename}`);
		return fieldsUpdated;
	}

	/**
	 * Sync sourced_* fields from citation notes for all people in the vault.
	 */
	async syncSourcedFieldsVaultWide(): Promise<{ peopleUpdated: number; fieldsUpdated: number }> {
		const peopleFolder = this.plugin.settings.peopleFolder;
		let peopleUpdated = 0;
		let totalFields = 0;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!file.path.startsWith(peopleFolder)) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter?.cr_id) continue;

			const fields = await this.syncSourcedFieldsForPerson(file);
			if (fields > 0) {
				peopleUpdated++;
				totalFields += fields;
			}
		}

		return { peopleUpdated, fieldsUpdated: totalFields };
	}

	/**
	 * Generate citation notes from existing sourced_* fields for a person.
	 * Creates citation notes for source-fact pairs that don't already have one.
	 */
	async generateCitationsFromSourcedFields(personFile: TFile): Promise<number> {
		const cache = this.app.metadataCache.getFileCache(personFile);
		const fm = cache?.frontmatter;
		const crId = fm?.cr_id as string;
		if (!crId || !fm) return 0;

		const personName = (fm.name as string) || personFile.basename;

		// Get existing citations to avoid duplicates
		const existingCitations = this.citationService.getCitationsForSubject(crId);
		const existingKeys = new Set(
			existingCitations.map(c => `${extractWikilinkPath(c.source)}|${c.fact}`)
		);

		const newCitations: CitationData[] = [];

		for (const sourcedProp of SOURCED_PROPERTY_NAMES) {
			const fact = SOURCED_TO_FACT[sourcedProp];
			if (!fact) continue;

			const sources = fm[sourcedProp];
			if (!sources || !Array.isArray(sources)) continue;

			for (const sourceLink of sources) {
				const sourceName = extractWikilinkPath(String(sourceLink));
				if (!sourceName) continue;

				// Skip if citation already exists
				const key = `${sourceName}|${fact}`;
				if (existingKeys.has(key)) continue;

				// Resolve source cr_id
				const sourceFile = this.app.metadataCache.getFirstLinkpathDest(sourceName, '');
				const sourceCrId = sourceFile
					? (this.app.metadataCache.getFileCache(sourceFile)?.frontmatter?.cr_id as string)
					: undefined;

				newCitations.push({
					source: `[[${sourceName}]]`,
					sourceCrId,
					subject: `[[${personName}]]`,
					subjectCrId: crId,
					fact
				});

				existingKeys.add(key);
			}
		}

		if (newCitations.length === 0) return 0;

		// Create citation notes
		const files = await this.citationService.createCitationNotes(newCitations);

		// Add citation links to person note
		await this.app.fileManager.processFrontMatter(personFile, (frontmatter) => {
			const existing = Array.isArray(frontmatter.citations) ? frontmatter.citations : [];
			const newLinks = files.map(f => `[[${f.basename}]]`);
			frontmatter.citations = [...existing, ...newLinks];
		});

		logger.info('generate', `Created ${files.length} citation notes from sourced fields for ${personFile.basename}`);
		return files.length;
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Match scope of file-level disable at top. */
