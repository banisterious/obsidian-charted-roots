/**
 * GEDCOM Importer v2 for Canvas Roots
 *
 * Enhanced importer that creates event notes, source notes, and place notes
 * in addition to person notes.
 */

import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import { GedcomParserV2 } from './gedcom-parser-v2';
import {
	GedcomDataV2,
	GedcomIndividualV2,
	GedcomFamilyV2,
	GedcomEvent,
	GedcomSource,
	GedcomImportOptionsV2,
	GedcomImportResultV2
} from './gedcom-types';
import { GedcomValidationResult } from './gedcom-parser';
import { createPersonNote, PersonData } from '../core/person-note-writer';
import { generateCrId } from '../core/uuid';
import { getErrorMessage } from '../core/error-utils';
import type { CreateEventData, DatePrecision, EventConfidence } from '../events/types/event-types';

/**
 * Enhanced GEDCOM Importer (v2)
 *
 * Creates:
 * - Person notes with extended attributes
 * - Event notes for all parsed events
 * - Source notes (Phase 2)
 * - Place notes (Phase 3)
 */
export class GedcomImporterV2 {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Analyze GEDCOM file before import (v2)
	 * Returns statistics including event and source counts
	 */
	analyzeFile(content: string): {
		individualCount: number;
		familyCount: number;
		sourceCount: number;
		eventCount: number;
		uniquePlaces: number;
		componentCount: number;
	} {
		const gedcomData = GedcomParserV2.parse(content);

		// Count individuals and families
		const individualCount = gedcomData.individuals.size;
		const familyCount = gedcomData.families.size;
		const sourceCount = gedcomData.sources.size;

		// Count events
		let eventCount = 0;
		for (const individual of gedcomData.individuals.values()) {
			eventCount += individual.events.length;
		}
		for (const family of gedcomData.families.values()) {
			eventCount += family.events.length;
		}

		// Count unique places
		const places = new Set<string>();
		for (const individual of gedcomData.individuals.values()) {
			if (individual.birthPlace) places.add(individual.birthPlace.toLowerCase());
			if (individual.deathPlace) places.add(individual.deathPlace.toLowerCase());
			for (const event of individual.events) {
				if (event.place) places.add(event.place.toLowerCase());
			}
		}
		for (const family of gedcomData.families.values()) {
			if (family.marriagePlace) places.add(family.marriagePlace.toLowerCase());
			for (const event of family.events) {
				if (event.place) places.add(event.place.toLowerCase());
			}
		}

		// Analyze connected components using BFS
		// Pre-build family lookup indexes for O(1) access instead of O(families) per person
		const familiesByPerson = new Map<string, Set<{ husbandRef?: string; wifeRef?: string; childRefs: string[] }>>();
		for (const family of gedcomData.families.values()) {
			// Index by husband
			if (family.husbandRef) {
				if (!familiesByPerson.has(family.husbandRef)) {
					familiesByPerson.set(family.husbandRef, new Set());
				}
				familiesByPerson.get(family.husbandRef)!.add(family);
			}
			// Index by wife
			if (family.wifeRef) {
				if (!familiesByPerson.has(family.wifeRef)) {
					familiesByPerson.set(family.wifeRef, new Set());
				}
				familiesByPerson.get(family.wifeRef)!.add(family);
			}
		}

		const visited = new Set<string>();
		let componentCount = 0;

		for (const [gedcomId] of gedcomData.individuals) {
			if (visited.has(gedcomId)) continue;

			componentCount++;
			const queue: string[] = [gedcomId];

			while (queue.length > 0) {
				const currentId = queue.shift()!;
				if (visited.has(currentId)) continue;

				visited.add(currentId);
				const individual = gedcomData.individuals.get(currentId);
				if (!individual) continue;

				const related: string[] = [];
				if (individual.fatherRef) related.push(individual.fatherRef);
				if (individual.motherRef) related.push(individual.motherRef);

				// Use pre-built index instead of iterating all families
				const personFamilies = familiesByPerson.get(currentId);
				if (personFamilies) {
					for (const family of personFamilies) {
						if (family.husbandRef === currentId && family.wifeRef) {
							related.push(family.wifeRef);
						}
						if (family.wifeRef === currentId && family.husbandRef) {
							related.push(family.husbandRef);
						}
						related.push(...family.childRefs);
					}
				}

				for (const relatedId of related) {
					if (!visited.has(relatedId) && gedcomData.individuals.has(relatedId)) {
						queue.push(relatedId);
					}
				}
			}
		}

		return {
			individualCount,
			familyCount,
			sourceCount,
			eventCount,
			uniquePlaces: places.size,
			componentCount
		};
	}

	/**
	 * Import GEDCOM file (v2)
	 */
	async importFile(
		content: string,
		options: GedcomImportOptionsV2
	): Promise<GedcomImportResultV2> {
		const result: GedcomImportResultV2 = {
			success: false,
			individualsImported: 0,
			eventsCreated: 0,
			sourcesCreated: 0,
			placesCreated: 0,
			placesUpdated: 0,
			errors: [],
			warnings: []
		};

		// Helper to report progress
		const reportProgress = options.onProgress || (() => {});

		try {
			// Validate GEDCOM first
			reportProgress({ phase: 'validating', current: 0, total: 1, message: 'Validating GEDCOM file…' });
			const validation = GedcomParserV2.validate(content);

			if (!validation.valid) {
				result.errors.push(...validation.errors.map(e => e.message));
				return result;
			}

			if (validation.warnings.length > 0) {
				result.warnings.push(...validation.warnings.map(w => w.message));
			}

			// Parse GEDCOM with v2 parser
			reportProgress({ phase: 'parsing', current: 0, total: 1, message: 'Parsing GEDCOM file…' });
			const gedcomData = GedcomParserV2.parse(content);

			reportProgress({ phase: 'parsing', current: 1, total: 1, message: `Found ${gedcomData.individuals.size} individuals` });

			// Count events for progress
			let totalEvents = 0;
			for (const individual of gedcomData.individuals.values()) {
				totalEvents += individual.events.length;
			}
			for (const family of gedcomData.families.values()) {
				totalEvents += family.events.length;
			}

			// Ensure folders exist
			if (options.createPeopleNotes) {
				await this.ensureFolderExists(options.peopleFolder);
			}
			if (options.createEventNotes) {
				await this.ensureFolderExists(options.eventsFolder);
			}
			if (options.createSourceNotes) {
				await this.ensureFolderExists(options.sourcesFolder);
			}
			if (options.createPlaceNotes) {
				await this.ensureFolderExists(options.placesFolder);
			}

			// Create mapping of GEDCOM IDs to cr_ids and note paths
			const gedcomToCrId = new Map<string, string>();
			const gedcomToNotePath = new Map<string, string>();
			const sourceIdToNotePath = new Map<string, string>();
			let placeToNotePath = new Map<string, string>();

			// Phase 0: Create place notes (if enabled) - do this first for wikilinks
			if (options.createPlaceNotes) {
				const allPlaces = this.collectAllPlaces(gedcomData);
				if (allPlaces.size > 0) {
					reportProgress({ phase: 'places', current: 0, total: allPlaces.size, message: 'Creating place notes…' });
					const placeResult = await this.createPlaceNotes(allPlaces, options, reportProgress);
					placeToNotePath = placeResult.placeToNotePath;
					result.placesCreated = placeResult.created;
					result.placesUpdated = placeResult.updated;
				}
			}

			// Phase 1a: Create source notes (if enabled)
			if (options.createSourceNotes && gedcomData.sources.size > 0) {
				const totalSources = gedcomData.sources.size;
				let sourceIndex = 0;
				for (const [sourceId, source] of gedcomData.sources) {
					reportProgress({ phase: 'sources', current: sourceIndex, total: totalSources });
					try {
						const notePath = await this.createSourceNote(source, options);
						sourceIdToNotePath.set(sourceId, notePath);
						result.sourcesCreated++;
					} catch (error: unknown) {
						result.errors.push(
							`Failed to create source ${source.title || sourceId}: ${getErrorMessage(error)}`
						);
					}
					sourceIndex++;
				}
			}

			// Phase 1b: Create all person notes (if enabled)
			if (options.createPeopleNotes) {
				const totalPeople = gedcomData.individuals.size;
				let personIndex = 0;
				for (const [gedcomId, individual] of gedcomData.individuals) {
					reportProgress({ phase: 'people', current: personIndex, total: totalPeople });
					try {
						const { crId, notePath } = await this.importIndividual(
							individual,
							gedcomData,
							options,
							gedcomToCrId
						);

						gedcomToCrId.set(gedcomId, crId);
						gedcomToNotePath.set(gedcomId, notePath);
						result.individualsImported++;
					} catch (error: unknown) {
						result.errors.push(
							`Failed to import ${individual.name || 'Unknown'}: ${getErrorMessage(error)}`
						);
					}
					personIndex++;
				}

				// Phase 2: Update relationships with real cr_ids
				let relIndex = 0;
				for (const [, individual] of gedcomData.individuals) {
					reportProgress({ phase: 'relationships', current: relIndex, total: totalPeople });
					try {
						await this.updateRelationships(
							individual,
							gedcomData,
							gedcomToCrId,
							options
						);
					} catch (error: unknown) {
						result.errors.push(
							`Failed to update relationships for ${individual.name || 'Unknown'}: ${getErrorMessage(error)}`
						);
					}
					relIndex++;
				}
			}

			// Phase 3: Create event notes
			if (options.createEventNotes && totalEvents > 0) {
				let eventIndex = 0;

				// Individual events
				for (const individual of gedcomData.individuals.values()) {
					for (const event of individual.events) {
						reportProgress({ phase: 'events', current: eventIndex, total: totalEvents });
						try {
							await this.createEventNote(
								event,
								individual,
								null,
								gedcomData,
								gedcomToNotePath,
								sourceIdToNotePath,
								placeToNotePath,
								options
							);
							result.eventsCreated++;
						} catch (error: unknown) {
							result.errors.push(
								`Failed to create event ${event.eventType} for ${individual.name || 'Unknown'}: ${getErrorMessage(error)}`
							);
						}
						eventIndex++;
					}
				}

				// Family events
				for (const family of gedcomData.families.values()) {
					for (const event of family.events) {
						reportProgress({ phase: 'events', current: eventIndex, total: totalEvents });
						try {
							await this.createEventNote(
								event,
								null,
								family,
								gedcomData,
								gedcomToNotePath,
								sourceIdToNotePath,
								placeToNotePath,
								options
							);
							result.eventsCreated++;
						} catch (error: unknown) {
							const spouse1 = family.husbandRef ? gedcomData.individuals.get(family.husbandRef)?.name : 'Unknown';
							const spouse2 = family.wifeRef ? gedcomData.individuals.get(family.wifeRef)?.name : 'Unknown';
							result.errors.push(
								`Failed to create event ${event.eventType} for ${spouse1} & ${spouse2}: ${getErrorMessage(error)}`
							);
						}
						eventIndex++;
					}
				}
			}

			// Mark complete
			reportProgress({ phase: 'complete', current: 1, total: 1, message: 'Import complete' });

			// Build import complete message
			let importMessage = `Import complete: ${result.individualsImported} people`;
			if (result.placesCreated > 0 || result.placesUpdated > 0) {
				const placeParts: string[] = [];
				if (result.placesCreated > 0) placeParts.push(`${result.placesCreated} created`);
				if (result.placesUpdated > 0) placeParts.push(`${result.placesUpdated} updated`);
				importMessage += `, ${placeParts.join('/')} places`;
			}
			if (result.sourcesCreated > 0) {
				importMessage += `, ${result.sourcesCreated} sources`;
			}
			if (result.eventsCreated > 0) {
				importMessage += `, ${result.eventsCreated} events`;
			}
			if (result.errors.length > 0) {
				importMessage += `. ${result.errors.length} errors occurred`;
			}

			new Notice(importMessage, 8000);
			result.success = result.errors.length === 0;

		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			result.errors.push(`GEDCOM parse error: ${errorMsg}`);
			new Notice(`Import failed: ${errorMsg}`);
		}

		return result;
	}

	// ============================================================================
	// Private: Individual Import
	// ============================================================================

	private async importIndividual(
		individual: GedcomIndividualV2,
		gedcomData: GedcomDataV2,
		options: GedcomImportOptionsV2,
		gedcomToCrId: Map<string, string>
	): Promise<{ crId: string; notePath: string }> {
		const crId = generateCrId();

		// Convert GEDCOM individual to PersonData
		const personData: PersonData = {
			name: individual.name || 'Unknown',
			crId: crId,
			birthDate: GedcomParserV2.gedcomDateToISO(individual.birthDate || ''),
			deathDate: GedcomParserV2.gedcomDateToISO(individual.deathDate || ''),
			birthPlace: individual.birthPlace,
			deathPlace: individual.deathPlace,
			occupation: individual.occupation,
			gender: individual.sex === 'M' ? 'Male' : individual.sex === 'F' ? 'Female' : undefined
		};

		// Add extended attributes
		for (const [propName, value] of Object.entries(individual.attributes)) {
			(personData as unknown as Record<string, unknown>)[propName] = value;
		}

		// Add relationship references
		if (individual.fatherRef) {
			personData.fatherCrId = individual.fatherRef;
			const father = gedcomData.individuals.get(individual.fatherRef);
			if (father) {
				personData.fatherName = father.name || 'Unknown';
			}
		}
		if (individual.motherRef) {
			personData.motherCrId = individual.motherRef;
			const mother = gedcomData.individuals.get(individual.motherRef);
			if (mother) {
				personData.motherName = mother.name || 'Unknown';
			}
		}
		if (individual.spouseRefs.length > 0) {
			personData.spouseCrId = individual.spouseRefs;
			personData.spouseName = individual.spouseRefs.map(ref => {
				const spouse = gedcomData.individuals.get(ref);
				return spouse?.name || 'Unknown';
			});
		}

		// Extract children from families
		const childRefs: string[] = [];
		const childNames: string[] = [];
		for (const family of gedcomData.families.values()) {
			if (family.husbandRef === individual.id || family.wifeRef === individual.id) {
				for (const childRef of family.childRefs) {
					if (!childRefs.includes(childRef)) {
						childRefs.push(childRef);
						const child = gedcomData.individuals.get(childRef);
						childNames.push(child?.name || 'Unknown');
					}
				}
			}
		}
		if (childRefs.length > 0) {
			personData.childCrId = childRefs;
			personData.childName = childNames;
		}

		// Create person note
		const file = await createPersonNote(this.app, personData, {
			directory: options.peopleFolder,
			addBidirectionalLinks: false,
			propertyAliases: options.propertyAliases,
			filenameFormat: this.getFormatForType('people', options)
		});

		return { crId, notePath: file.path };
	}

	// ============================================================================
	// Private: Relationship Update
	// ============================================================================

	private async updateRelationships(
		individual: GedcomIndividualV2,
		gedcomData: GedcomDataV2,
		gedcomToCrId: Map<string, string>,
		options: GedcomImportOptionsV2
	): Promise<void> {
		const crId = gedcomToCrId.get(individual.id);
		if (!crId) return;

		const fileName = this.formatFilename(individual.name || 'Unknown', this.getFormatForType('people', options));
		const filePath = options.peopleFolder
			? `${options.peopleFolder}/${fileName}`
			: fileName;

		const normalizedPath = normalizePath(filePath);
		const file = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!file || !(file instanceof TFile)) {
			return;
		}

		const content = await this.app.vault.read(file);
		let updatedContent = content;

		// Replace GEDCOM IDs with real cr_ids
		const replacements: Array<{ from: string; to: string }> = [];

		if (individual.fatherRef) {
			const fatherCrId = gedcomToCrId.get(individual.fatherRef);
			if (fatherCrId) {
				replacements.push({ from: individual.fatherRef, to: fatherCrId });
			}
		}
		if (individual.motherRef) {
			const motherCrId = gedcomToCrId.get(individual.motherRef);
			if (motherCrId) {
				replacements.push({ from: individual.motherRef, to: motherCrId });
			}
		}
		for (const spouseRef of individual.spouseRefs) {
			const spouseCrId = gedcomToCrId.get(spouseRef);
			if (spouseCrId) {
				replacements.push({ from: spouseRef, to: spouseCrId });
			}
		}

		// Apply replacements
		for (const { from, to } of replacements) {
			const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			// Replace in property values
			updatedContent = updatedContent.replace(
				new RegExp(`(father_id|mother_id|spouse_id|children_id):\\s*${escapedFrom}`, 'g'),
				`$1: ${to}`
			);
			// Replace in array format
			updatedContent = updatedContent.replace(
				new RegExp(`(\\s{2}- )${escapedFrom}$`, 'gm'),
				`$1${to}`
			);
		}

		if (updatedContent !== content) {
			await this.app.vault.modify(file, updatedContent);
		}
	}

	// ============================================================================
	// Private: Event Note Creation
	// ============================================================================

	private async createEventNote(
		event: GedcomEvent,
		individual: GedcomIndividualV2 | null,
		family: GedcomFamilyV2 | null,
		gedcomData: GedcomDataV2,
		gedcomToNotePath: Map<string, string>,
		sourceIdToNotePath: Map<string, string>,
		placeToNotePath: Map<string, string>,
		options: GedcomImportOptionsV2
	): Promise<TFile> {
		// Build event title
		let title: string;
		const eventTypeLabel = this.formatEventType(event.eventType);

		if (event.isFamilyEvent) {
			// Family event: "Marriage of John Smith and Jane Doe"
			const spouse1Name = event.spouse1Ref
				? gedcomData.individuals.get(event.spouse1Ref)?.name || 'Unknown'
				: 'Unknown';
			const spouse2Name = event.spouse2Ref
				? gedcomData.individuals.get(event.spouse2Ref)?.name || 'Unknown'
				: 'Unknown';
			title = `${eventTypeLabel} of ${spouse1Name} and ${spouse2Name}`;
		} else {
			// Individual event: "Birth of John Smith"
			const personName = individual?.name || 'Unknown';
			title = `${eventTypeLabel} of ${personName}`;
		}

		// Build person reference(s)
		let person: string | undefined;
		let persons: string[] | undefined;

		if (event.isFamilyEvent) {
			// Family events have multiple persons
			persons = [];
			if (event.spouse1Ref) {
				const notePath = gedcomToNotePath.get(event.spouse1Ref);
				if (notePath) {
					const baseName = notePath.replace(/\.md$/, '').split('/').pop() || '';
					persons.push(baseName);
				}
			}
			if (event.spouse2Ref) {
				const notePath = gedcomToNotePath.get(event.spouse2Ref);
				if (notePath) {
					const baseName = notePath.replace(/\.md$/, '').split('/').pop() || '';
					persons.push(baseName);
				}
			}
		} else if (individual) {
			// Individual event has one person
			const notePath = gedcomToNotePath.get(individual.id);
			if (notePath) {
				const baseName = notePath.replace(/\.md$/, '').split('/').pop() || '';
				person = baseName;
			}
		}

		// Build source references from event citations
		const sourceWikilinks: string[] = [];
		for (const citation of event.sourceCitations) {
			const sourcePath = sourceIdToNotePath.get(citation.sourceRef);
			if (sourcePath) {
				const baseName = sourcePath.replace(/\.md$/, '').split('/').pop() || '';
				sourceWikilinks.push(baseName);
			}
		}

		// Build place reference (wikilink if place notes were created)
		let placeValue: string | undefined;
		let placeWikilink: string | undefined;
		if (event.place) {
			const placePath = placeToNotePath.get(event.place);
			if (placePath) {
				// Use wikilink to place note
				const placeBaseName = placePath.replace(/\.md$/, '').split('/').pop() || '';
				placeWikilink = placeBaseName;
			} else {
				// Use plain text
				placeValue = event.place;
			}
		}

		// Build event data
		const eventData: CreateEventData = {
			title,
			eventType: event.eventType,
			datePrecision: event.datePrecision,
			date: event.date,
			dateEnd: event.dateEnd,
			person,
			persons: persons && persons.length > 0 ? persons : undefined,
			place: placeValue, // May be undefined if using wikilink
			description: event.description || `Imported from GEDCOM`,
			confidence: 'unknown' as EventConfidence
		};

		// Create the event note file directly (not using EventService to avoid circular deps)
		const crId = generateCrId();
		const frontmatterLines = this.buildEventFrontmatter(crId, eventData, sourceWikilinks, placeWikilink);
		const body = `\n# ${title}\n\n${eventData.description || ''}\n`;
		const content = frontmatterLines.join('\n') + body;

		// Create file
		const eventFormat = this.getFormatForType('events', options);
		const fileName = this.formatFilename(title, eventFormat);
		const filePath = normalizePath(`${options.eventsFolder}/${fileName}`);

		// Handle duplicate filenames
		let finalPath = filePath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const baseName = this.formatFilename(`${title}-${counter}`, eventFormat);
			finalPath = normalizePath(`${options.eventsFolder}/${baseName}`);
			counter++;
		}

		const file = await this.app.vault.create(finalPath, content);
		return file;
	}

	private buildEventFrontmatter(
		crId: string,
		data: CreateEventData,
		sourceWikilinks: string[] = [],
		placeWikilink?: string
	): string[] {
		const lines: string[] = [
			'---',
			'type: event',
			`cr_id: ${crId}`,
			`title: "${data.title.replace(/"/g, '\\"')}"`,
			`event_type: ${data.eventType}`,
			`date_precision: ${data.datePrecision}`
		];

		if (data.date) {
			lines.push(`date: ${data.date}`);
		}
		if (data.dateEnd) {
			lines.push(`date_end: ${data.dateEnd}`);
		}
		if (data.person) {
			lines.push(`person: "[[${data.person}]]"`);
		}
		if (data.persons && data.persons.length > 0) {
			lines.push(`persons:`);
			for (const p of data.persons) {
				lines.push(`  - "[[${p}]]"`);
			}
		}
		// Place: use wikilink if provided, otherwise plain text
		if (placeWikilink) {
			lines.push(`place: "[[${placeWikilink}]]"`);
		} else if (data.place) {
			lines.push(`place: "${data.place.replace(/"/g, '\\"')}"`);
		}
		if (data.confidence) {
			lines.push(`confidence: ${data.confidence}`);
		}
		if (data.description) {
			lines.push(`description: "${data.description.replace(/"/g, '\\"')}"`);
		}
		// Add source references as wikilinks
		if (sourceWikilinks.length > 0) {
			lines.push(`sources:`);
			for (const source of sourceWikilinks) {
				lines.push(`  - "[[${source}]]"`);
			}
		}

		lines.push('---');
		return lines;
	}

	// ============================================================================
	// Private: Source Note Creation
	// ============================================================================

	private async createSourceNote(
		source: GedcomSource,
		options: GedcomImportOptionsV2
	): Promise<string> {
		const crId = generateCrId();

		// Determine source type (GEDCOM doesn't distinguish, so default to 'document')
		const sourceType = 'document';

		// Build frontmatter
		const frontmatterLines: string[] = [
			'---',
			'type: source',
			`cr_id: ${crId}`,
			`title: "${(source.title || `Source ${source.id}`).replace(/"/g, '\\"')}"`,
			`source_type: ${sourceType}`
		];

		// Add author if available
		if (source.author) {
			frontmatterLines.push(`author: "${source.author.replace(/"/g, '\\"')}"`);
		}

		// Add publisher if available
		if (source.publisher) {
			frontmatterLines.push(`source_repository: "${source.publisher.replace(/"/g, '\\"')}"`);
		}

		// Add publication info as notes/description
		if (source.publication) {
			frontmatterLines.push(`publication_info: "${source.publication.replace(/"/g, '\\"')}"`);
		}

		// Default confidence for imported sources
		frontmatterLines.push(`confidence: unknown`);

		frontmatterLines.push('---');

		// Build note body
		const title = source.title || `Source ${source.id}`;
		let body = `\n# ${title}\n\n`;

		if (source.author) {
			body += `**Author:** ${source.author}\n\n`;
		}
		if (source.publisher) {
			body += `**Publisher:** ${source.publisher}\n\n`;
		}
		if (source.publication) {
			body += `**Publication:** ${source.publication}\n\n`;
		}
		if (source.notes) {
			body += `## Notes\n\n${source.notes}\n\n`;
		}

		body += `\n_Imported from GEDCOM source ${source.id}_\n`;

		const content = frontmatterLines.join('\n') + body;

		// Create file
		const sourceFormat = this.getFormatForType('sources', options);
		const fileName = this.formatFilename(title, sourceFormat);
		const filePath = normalizePath(`${options.sourcesFolder}/${fileName}`);

		// Handle duplicate filenames
		let finalPath = filePath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const baseName = this.formatFilename(`${title}-${counter}`, sourceFormat);
			finalPath = normalizePath(`${options.sourcesFolder}/${baseName}`);
			counter++;
		}

		await this.app.vault.create(finalPath, content);
		return finalPath;
	}

	// ============================================================================
	// Private: Utilities
	// ============================================================================

	/**
	 * Get the filename format for a specific note type
	 */
	private getFormatForType(
		type: 'people' | 'events' | 'sources' | 'places',
		options: GedcomImportOptionsV2
	): 'original' | 'kebab-case' | 'snake_case' {
		// Per-type formats take precedence
		if (options.filenameFormats) {
			return options.filenameFormats[type];
		}
		// Fall back to single format or default
		return options.filenameFormat || 'original';
	}

	private formatEventType(eventType: string): string {
		// Convert snake_case to Title Case
		return eventType
			.split('_')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	/**
	 * Format a filename based on the selected format option
	 */
	private formatFilename(name: string, format: 'original' | 'kebab-case' | 'snake_case' = 'original'): string {
		// First sanitize illegal filesystem characters
		const sanitized = name
			.replace(/[\\/:*?"<>|]/g, '')
			.trim();

		switch (format) {
			case 'kebab-case':
				return sanitized
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-+|-+$/g, '')
					.substring(0, 100) + '.md';

			case 'snake_case':
				return sanitized
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '_')
					.replace(/^_+|_+$/g, '')
					.substring(0, 100) + '.md';

			case 'original':
			default:
				// Keep original casing and spaces, just sanitize
				return sanitized.replace(/\s+/g, ' ').substring(0, 100) + '.md';
		}
	}


	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!folderPath) return;

		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		} else if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${normalizedPath}`);
		}
	}

	// ============================================================================
	// Private: Place Note Creation (Hierarchical)
	// ============================================================================

	/**
	 * Parse a GEDCOM place string into hierarchical components.
	 * GEDCOM places are typically: "Locality, County, State, Country"
	 * Returns array from most specific to most general.
	 */
	private parsePlaceHierarchy(placeString: string): string[] {
		if (!placeString) return [];

		// Split by comma, trim whitespace, filter empty parts
		const parts = placeString
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0);

		return parts;
	}

	/**
	 * Get canonical name for a place at a given level.
	 * E.g., for "Springfield, Sangamon, Illinois, USA" at level 2:
	 * Returns "Illinois, USA" (from index 2 onward)
	 */
	private getPlaceAtLevel(parts: string[], levelIndex: number): string {
		return parts.slice(levelIndex).join(', ');
	}

	/**
	 * Build a set of all unique places including parent chains.
	 * Returns Map of full place string → place hierarchy parts
	 */
	private collectAllPlaces(gedcomData: GedcomDataV2): Map<string, string[]> {
		const places = new Map<string, string[]>();

		const addPlace = (placeString: string) => {
			if (!placeString) return;

			const parts = this.parsePlaceHierarchy(placeString);
			if (parts.length === 0) return;

			// Add the full place
			places.set(placeString, parts);

			// Add all parent levels too
			// E.g., "Springfield, Sangamon, Illinois, USA" creates:
			// - "Springfield, Sangamon, Illinois, USA" (full)
			// - "Sangamon, Illinois, USA" (parent)
			// - "Illinois, USA" (grandparent)
			// - "USA" (great-grandparent)
			for (let i = 1; i < parts.length; i++) {
				const parentPlace = this.getPlaceAtLevel(parts, i);
				if (!places.has(parentPlace)) {
					places.set(parentPlace, parts.slice(i));
				}
			}
		};

		// Collect from individuals
		for (const individual of gedcomData.individuals.values()) {
			if (individual.birthPlace) addPlace(individual.birthPlace);
			if (individual.deathPlace) addPlace(individual.deathPlace);
			for (const event of individual.events) {
				if (event.place) addPlace(event.place);
			}
		}

		// Collect from families
		for (const family of gedcomData.families.values()) {
			if (family.marriagePlace) addPlace(family.marriagePlace);
			for (const event of family.events) {
				if (event.place) addPlace(event.place);
			}
		}

		return places;
	}

	/**
	 * Create all place notes with proper hierarchy.
	 * Creates from most general (country) to most specific (locality).
	 * Checks for existing place notes and updates them if found.
	 * Returns map of placeString → notePath for wikilink generation.
	 */
	private async createPlaceNotes(
		places: Map<string, string[]>,
		options: GedcomImportOptionsV2,
		reportProgress: (progress: { phase: 'places'; current: number; total: number; message?: string }) => void
	): Promise<{ placeToNotePath: Map<string, string>; created: number; updated: number }> {
		const placeToNotePath = new Map<string, string>();
		let created = 0;
		let updated = 0;

		// Build a cache of existing place notes by full_name for fast lookup
		const existingPlaces = await this.buildExistingPlaceCache();

		// Sort places by hierarchy depth (fewest parts first = most general)
		// This ensures parent places are created before children
		const sortedPlaces = Array.from(places.entries())
			.sort((a, b) => a[1].length - b[1].length);

		const totalPlaces = sortedPlaces.length;
		let placeIndex = 0;

		for (const [placeString, parts] of sortedPlaces) {
			reportProgress({ phase: 'places', current: placeIndex, total: totalPlaces });
			try {
				const result = await this.createOrUpdatePlaceNote(
					placeString,
					parts,
					placeToNotePath,
					existingPlaces,
					options
				);
				placeToNotePath.set(placeString, result.path);
				if (result.wasUpdated) {
					updated++;
				} else {
					created++;
				}
			} catch (error: unknown) {
				// Log but continue with other places
				console.warn(`Failed to create place note for "${placeString}": ${getErrorMessage(error)}`);
			}
			placeIndex++;
		}

		return { placeToNotePath, created, updated };
	}

	/**
	 * Build a cache of existing place notes for duplicate detection.
	 * Indexes by:
	 * 1. full_name (case-insensitive) - primary lookup
	 * 2. title + parent combination - fallback for notes without full_name
	 */
	private async buildExistingPlaceCache(): Promise<{
		byFullName: Map<string, TFile>;
		byTitleAndParent: Map<string, TFile>;
	}> {
		const byFullName = new Map<string, TFile>();
		const byTitleAndParent = new Map<string, TFile>();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const fileCache = this.app.metadataCache.getFileCache(file);
			if (!fileCache?.frontmatter) continue;
			if (fileCache.frontmatter.type !== 'place') continue;

			// Index by full_name (case-insensitive)
			if (fileCache.frontmatter.full_name) {
				const fullName = String(fileCache.frontmatter.full_name).toLowerCase();
				byFullName.set(fullName, file);
			}

			// Index by title + parent for fallback matching
			const title = fileCache.frontmatter.title;
			const parent = fileCache.frontmatter.parent;
			if (title) {
				// Extract parent name from wikilink if present
				const parentName = parent
					? String(parent).replace(/^\[\[/, '').replace(/\]\]$/, '').toLowerCase()
					: '';
				const key = `${String(title).toLowerCase()}|${parentName}`;
				byTitleAndParent.set(key, file);
			}
		}

		return { byFullName, byTitleAndParent };
	}

	/**
	 * Find an existing place note that matches the given place string.
	 * Uses multiple strategies:
	 * 1. Exact match on full_name (case-insensitive)
	 * 2. Match on title + parent combination
	 */
	private findExistingPlace(
		placeString: string,
		parts: string[],
		placeToNotePath: Map<string, string>,
		cache: { byFullName: Map<string, TFile>; byTitleAndParent: Map<string, TFile> }
	): TFile | null {
		// Strategy 1: Match by full_name (case-insensitive)
		const existingByFullName = cache.byFullName.get(placeString.toLowerCase());
		if (existingByFullName) {
			return existingByFullName;
		}

		// Strategy 2: Match by title + parent
		const name = parts[0];
		let parentBaseName = '';
		if (parts.length > 1) {
			const parentPlaceString = this.getPlaceAtLevel(parts, 1);
			const parentPath = placeToNotePath.get(parentPlaceString);
			if (parentPath) {
				parentBaseName = (parentPath.replace(/\.md$/, '').split('/').pop() || '').toLowerCase();
			}
		}
		const titleParentKey = `${name.toLowerCase()}|${parentBaseName}`;
		const existingByTitleParent = cache.byTitleAndParent.get(titleParentKey);
		if (existingByTitleParent) {
			return existingByTitleParent;
		}

		return null;
	}

	/**
	 * Create or update a place note.
	 * If a place with the same full_name or title+parent exists, update it.
	 */
	private async createOrUpdatePlaceNote(
		placeString: string,
		parts: string[],
		placeToNotePath: Map<string, string>,
		existingPlaces: { byFullName: Map<string, TFile>; byTitleAndParent: Map<string, TFile> },
		options: GedcomImportOptionsV2
	): Promise<{ path: string; wasUpdated: boolean }> {
		// Check if place already exists using multiple strategies
		const existingFile = this.findExistingPlace(placeString, parts, placeToNotePath, existingPlaces);

		if (existingFile) {
			// Update existing place note if parent wikilink needs to be added/updated
			const wasUpdated = await this.updateExistingPlaceNote(
				existingFile,
				parts,
				placeToNotePath,
				placeString
			);
			return { path: existingFile.path, wasUpdated };
		}

		// Create new place note
		const path = await this.createPlaceNote(placeString, parts, placeToNotePath, options);
		return { path, wasUpdated: false };
	}

	/**
	 * Update an existing place note's parent wikilink and full_name if needed.
	 * Returns true if the note was modified, false otherwise.
	 */
	private async updateExistingPlaceNote(
		file: TFile,
		parts: string[],
		placeToNotePath: Map<string, string>,
		placeString: string
	): Promise<boolean> {
		// Check current frontmatter
		const fileCache = this.app.metadataCache.getFileCache(file);
		const currentFullName = fileCache?.frontmatter?.full_name;
		const currentParent = fileCache?.frontmatter?.parent;

		// Determine what needs updating
		let needsUpdate = false;
		let newParentWikilink: string | undefined;
		let newFullName: string | undefined;

		// Check if full_name needs to be added/updated
		if (!currentFullName) {
			newFullName = placeString;
			needsUpdate = true;
		}

		// Check if parent needs updating
		if (parts.length > 1) {
			const parentPlaceString = this.getPlaceAtLevel(parts, 1);
			const parentPath = placeToNotePath.get(parentPlaceString);
			if (parentPath) {
				const parentBaseName = parentPath.replace(/\.md$/, '').split('/').pop() || '';
				// If parent is not set or doesn't match
				if (!currentParent || !String(currentParent).includes(parentBaseName)) {
					newParentWikilink = parentBaseName;
					needsUpdate = true;
				}
			}
		}

		if (!needsUpdate) {
			return false;
		}

		// Update the frontmatter
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (newParentWikilink) {
				frontmatter.parent = `[[${newParentWikilink}]]`;
			}
			if (newFullName) {
				frontmatter.full_name = newFullName;
			}
		});

		return true;
	}

	/**
	 * Create a single place note with parent wikilink.
	 */
	private async createPlaceNote(
		placeString: string,
		parts: string[],
		placeToNotePath: Map<string, string>,
		options: GedcomImportOptionsV2
	): Promise<string> {
		const crId = generateCrId();

		// The "name" is the most specific part (first in the array)
		const name = parts[0];

		// Determine place type based on position in hierarchy
		// parts.length: 1=country, 2=state, 3=county, 4+=locality
		let placeType = 'locality';
		if (parts.length === 1) {
			placeType = 'country';
		} else if (parts.length === 2) {
			placeType = 'state';
		} else if (parts.length === 3) {
			placeType = 'county';
		}

		// Get parent place string for wikilink (if any)
		let parentWikilink: string | undefined;
		if (parts.length > 1) {
			const parentPlaceString = this.getPlaceAtLevel(parts, 1);
			const parentPath = placeToNotePath.get(parentPlaceString);
			if (parentPath) {
				const parentBaseName = parentPath.replace(/\.md$/, '').split('/').pop() || '';
				parentWikilink = parentBaseName;
			}
		}

		// Build frontmatter
		const frontmatterLines: string[] = [
			'---',
			'type: place',
			`cr_id: ${crId}`,
			`title: "${name.replace(/"/g, '\\"')}"`,
			`place_type: ${placeType}`
		];

		// Add parent reference
		if (parentWikilink) {
			frontmatterLines.push(`parent: "[[${parentWikilink}]]"`);
		}

		// Add full place string for reference/search
		frontmatterLines.push(`full_name: "${placeString.replace(/"/g, '\\"')}"`);

		frontmatterLines.push('---');

		// Build note body
		let body = `\n# ${name}\n\n`;

		if (parentWikilink) {
			body += `**Part of:** [[${parentWikilink}]]\n\n`;
		}

		body += `_Imported from GEDCOM_\n`;

		const content = frontmatterLines.join('\n') + body;

		// Create file - use the specific place name for the filename
		// Include parent for disambiguation if needed
		let baseName: string;
		if (parts.length > 1 && parts.length <= 3) {
			// For counties and states, include immediate parent for clarity
			// e.g., "Sangamon, Illinois" or "Illinois, USA"
			baseName = `${name} ${parts[1]}`;
		} else if (parts.length > 3) {
			// For localities, include county for clarity
			baseName = `${name} ${parts[1]}`;
		} else {
			baseName = name;
		}

		const placeFormat = this.getFormatForType('places', options);
		const fileName = this.formatFilename(baseName, placeFormat);
		const filePath = normalizePath(`${options.placesFolder}/${fileName}`);

		// Handle duplicate filenames
		let finalPath = filePath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const dupeName = this.formatFilename(`${baseName}-${counter}`, placeFormat);
			finalPath = normalizePath(`${options.placesFolder}/${dupeName}`);
			counter++;
		}

		await this.app.vault.create(finalPath, content);
		return finalPath;
	}
}
