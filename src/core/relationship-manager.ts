import { App, TFile, Notice } from 'obsidian';
import { RelationshipHistoryService, RelationshipChangeType } from './relationship-history';
import { getLogger } from './logging';
import { getErrorMessage } from './error-utils';

const logger = getLogger('RelationshipManager');

/**
 * Callback for recording relationship changes to history
 */
export type HistoryRecorder = (
	type: RelationshipChangeType,
	sourceFile: TFile,
	sourceName: string,
	sourceCrId: string,
	targetFile: TFile,
	targetName: string,
	targetCrId: string,
	newValue?: string
) => Promise<void>;

/**
 * Service for managing relationships between person notes
 * Handles bidirectional relationship updates in note frontmatter
 */
export class RelationshipManager {
	private historyRecorder?: HistoryRecorder;

	constructor(private app: App, historyService?: RelationshipHistoryService | null) {
		if (historyService) {
			this.historyRecorder = async (
				type, sourceFile, sourceName, sourceCrId,
				targetFile, targetName, targetCrId, newValue
			) => {
				await historyService.recordChange({
					type,
					sourceFile,
					sourceName,
					sourceCrId,
					targetFile,
					targetName,
					targetCrId,
					newValue,
					isBidirectionalSync: false
				});
			};
		}
	}

	/**
	 * Add a parent-child relationship
	 * Updates child's father/father_id or mother/mother_id and parent's children/children_id
	 * @param knownParentCrId Optional cr_id if already known (avoids metadata cache timing issues)
	 */
	async addParentRelationship(
		childFile: TFile,
		parentFile: TFile,
		parentType: 'father' | 'mother',
		knownParentCrId?: string
	): Promise<void> {
		// Extract cr_ids from both notes (use provided cr_id if available to avoid cache timing issues)
		const childCrId = this.extractCrId(childFile);
		const parentCrId = knownParentCrId || this.extractCrId(parentFile);
		const parentSex = this.extractSex(parentFile);
		const childName = this.extractName(childFile);
		const parentName = this.extractName(parentFile);

		if (!childCrId || !parentCrId) {
			const missing = !childCrId && !parentCrId ? 'both notes' :
				!childCrId ? `child (${childFile.basename})` : `parent (${parentFile.basename})`;
			new Notice(`Error: could not find cr_id in ${missing}`);
			logger.error('relationship-manager', 'Missing cr_id in addParentRelationship', {
				childFile: childFile.path,
				childCrId,
				parentFile: parentFile.path,
				parentCrId
			});
			return;
		}

		// Validate parent type matches sex
		if (parentType === 'father' && parentSex === 'F') {
			new Notice('Warning: selected person has sex: F but being added as father');
		} else if (parentType === 'mother' && parentSex === 'M') {
			new Notice('Warning: selected person has sex: M but being added as mother');
		}

		// Update child's frontmatter (dual storage: wikilink + ID)
		await this.updateParentField(childFile, parentFile, parentCrId, parentName, parentType);

		// Update parent's children array (dual storage: wikilink + ID)
		await this.addToChildrenArray(parentFile, childFile, childCrId, childName);

		// Record to history
		if (this.historyRecorder) {
			const changeType: RelationshipChangeType = parentType === 'father' ? 'add_father' : 'add_mother';
			await this.historyRecorder(
				changeType,
				childFile, childName, childCrId,
				parentFile, parentName, parentCrId,
				`[[${parentName}]]`
			);
		}

		new Notice(
			`Added ${parentFile.basename} as ${parentType} of ${childFile.basename}`
		);
	}

	/**
	 * Add a spouse relationship
	 * Updates both notes' spouse/spouse_id arrays (bidirectional, dual storage)
	 * @param knownPerson2CrId Optional cr_id if already known (avoids metadata cache timing issues)
	 */
	async addSpouseRelationship(person1File: TFile, person2File: TFile, knownPerson2CrId?: string): Promise<void> {
		const person1CrId = this.extractCrId(person1File);
		const person2CrId = knownPerson2CrId || this.extractCrId(person2File);
		const person1Name = this.extractName(person1File);
		const person2Name = this.extractName(person2File);

		if (!person1CrId || !person2CrId) {
			new Notice('Error: could not find cr_id in one or both notes');
			return;
		}

		// Add each person to the other's spouse arrays (dual storage: wikilink + ID)
		await this.addToSpouseArray(person1File, person2File, person2CrId, person2Name);
		await this.addToSpouseArray(person2File, person1File, person1CrId, person1Name);

		// Record to history (record as person1 adding spouse person2)
		if (this.historyRecorder) {
			await this.historyRecorder(
				'add_spouse',
				person1File, person1Name, person1CrId,
				person2File, person2Name, person2CrId,
				`[[${person2Name}]]`
			);
		}

		new Notice(`Added spouse relationship between ${person1File.basename} and ${person2File.basename}`);
	}

	/**
	 * Add a parent-child relationship (inverse of addParent)
	 * Updates parent's children/children_id and child's father/father_id or mother/mother_id
	 * @param knownChildCrId Optional cr_id if already known (avoids metadata cache timing issues)
	 */
	async addChildRelationship(
		parentFile: TFile,
		childFile: TFile,
		knownChildCrId?: string
	): Promise<void> {
		const parentCrId = this.extractCrId(parentFile);
		const childCrId = knownChildCrId || this.extractCrId(childFile);
		const parentSex = this.extractSex(parentFile);
		const parentName = this.extractName(parentFile);
		const childName = this.extractName(childFile);

		if (!childCrId || !parentCrId) {
			new Notice('Error: could not find cr_id in one or both notes');
			return;
		}

		// Determine parent type from sex
		const parentType: 'father' | 'mother' = parentSex === 'F' ? 'mother' : 'father';

		// Update child's frontmatter (dual storage: wikilink + ID)
		await this.updateParentField(childFile, parentFile, parentCrId, parentName, parentType);

		// Update parent's children array (dual storage: wikilink + ID)
		await this.addToChildrenArray(parentFile, childFile, childCrId, childName);

		// Record to history
		if (this.historyRecorder) {
			await this.historyRecorder(
				'add_child',
				parentFile, parentName, parentCrId,
				childFile, childName, childCrId,
				`[[${childName}]]`
			);
		}

		new Notice(`Added ${childFile.basename} as child of ${parentFile.basename}`);
	}

	/**
	 * Extract cr_id from note frontmatter
	 */
	private extractCrId(file: TFile): string | null {
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter?.cr_id ?? null;
	}

	/**
	 * Extract sex from note frontmatter
	 */
	private extractSex(file: TFile): string | null {
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter?.sex ?? null;
	}

	/**
	 * Extract name from note frontmatter, falling back to filename
	 */
	private extractName(file: TFile): string {
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter?.name ?? file.basename;
	}

	/**
	 * Update father/mother fields in child's frontmatter (dual storage)
	 * Writes both wikilink field (father/mother) and ID field (father_id/mother_id)
	 * Uses processFrontMatter to safely modify without corrupting other fields
	 */
	private async updateParentField(
		childFile: TFile,
		parentFile: TFile,
		parentCrId: string,
		parentName: string,
		parentType: 'father' | 'mother'
	): Promise<void> {
		const idFieldName = parentType === 'father' ? 'father_id' : 'mother_id';
		const linkFieldName = parentType; // 'father' or 'mother'
		const wikilink = this.createSmartWikilink(parentName, parentFile);

		try {
			await this.app.fileManager.processFrontMatter(childFile, (frontmatter) => {
				const existingValue = frontmatter[idFieldName];
				if (existingValue && existingValue !== '' && existingValue !== parentCrId) {
					new Notice(`Warning: ${idFieldName} already set to ${existingValue}, replacing with ${parentCrId}`);
				}
				// Dual storage: wikilink + ID
				frontmatter[linkFieldName] = wikilink;
				frontmatter[idFieldName] = parentCrId;
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to update parent field', {
				file: childFile.path,
				fieldName: idFieldName,
				error: getErrorMessage(error)
			});
		}
	}

	/**
	 * Create a wikilink with proper handling of duplicate filenames
	 * Uses [[basename|name]] format when basename differs from name
	 */
	private createSmartWikilink(name: string, file: TFile): string {
		if (file.basename !== name) {
			return `[[${file.basename}|${name}]]`;
		}
		return `[[${name}]]`;
	}

	/**
	 * Add child to parent's children arrays (dual storage)
	 * Writes both wikilink field (children) and ID field (children_id)
	 * Uses processFrontMatter to safely modify without corrupting other fields
	 */
	private async addToChildrenArray(
		parentFile: TFile,
		childFile: TFile,
		childCrId: string,
		childName: string
	): Promise<void> {
		const wikilink = this.createSmartWikilink(childName, childFile);

		try {
			await this.app.fileManager.processFrontMatter(parentFile, (frontmatter) => {
				// Update children_id array
				const existingIds = frontmatter.children_id;
				if (!existingIds) {
					frontmatter.children_id = [childCrId];
				} else if (Array.isArray(existingIds)) {
					if (!existingIds.includes(childCrId)) {
						existingIds.push(childCrId);
					}
				} else {
					if (existingIds !== childCrId) {
						frontmatter.children_id = [existingIds, childCrId];
					}
				}

				// Update children wikilink array
				const existingLinks = frontmatter.children;
				if (!existingLinks) {
					frontmatter.children = [wikilink];
				} else if (Array.isArray(existingLinks)) {
					// Check if this wikilink already exists (by cr_id match above, we know it's new)
					if (!existingLinks.includes(wikilink)) {
						existingLinks.push(wikilink);
					}
				} else {
					if (existingLinks !== wikilink) {
						frontmatter.children = [existingLinks, wikilink];
					}
				}
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to add to children array', {
				file: parentFile.path,
				error: getErrorMessage(error)
			});
		}
	}

	/**
	 * Add spouse to person's spouse arrays (dual storage)
	 * Writes both wikilink field (spouse) and ID field (spouse_id)
	 * Uses processFrontMatter to safely modify without corrupting other fields
	 */
	private async addToSpouseArray(
		personFile: TFile,
		spouseFile: TFile,
		spouseCrId: string,
		spouseName: string
	): Promise<void> {
		const wikilink = this.createSmartWikilink(spouseName, spouseFile);

		try {
			await this.app.fileManager.processFrontMatter(personFile, (frontmatter) => {
				// Update spouse_id array
				const existingIds = frontmatter.spouse_id;
				if (!existingIds) {
					frontmatter.spouse_id = [spouseCrId];
				} else if (Array.isArray(existingIds)) {
					if (!existingIds.includes(spouseCrId)) {
						existingIds.push(spouseCrId);
					}
				} else {
					if (existingIds !== spouseCrId) {
						frontmatter.spouse_id = [existingIds, spouseCrId];
					}
				}

				// Update spouse wikilink array
				const existingLinks = frontmatter.spouse;
				if (!existingLinks) {
					frontmatter.spouse = [wikilink];
				} else if (Array.isArray(existingLinks)) {
					if (!existingLinks.includes(wikilink)) {
						existingLinks.push(wikilink);
					}
				} else {
					if (existingLinks !== wikilink) {
						frontmatter.spouse = [existingLinks, wikilink];
					}
				}
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to add to spouse array', {
				file: personFile.path,
				error: getErrorMessage(error)
			});
		}
	}

	/**
	 * Update relationship wikilinks when a person is renamed
	 * Finds all notes that reference this person and updates the wikilink to the new name
	 * @param personCrId The cr_id of the renamed person
	 * @param oldName The previous name
	 * @param newName The new name
	 * @param newFile The renamed file
	 */
	async updateRelationshipWikilinks(
		personCrId: string,
		oldName: string,
		newName: string,
		newFile: TFile
	): Promise<void> {
		logger.info('relationship-manager', 'Updating relationship wikilinks after rename', {
			personCrId,
			oldName,
			newName,
			newPath: newFile.path
		});

		const newWikilink = this.createSmartWikilink(newName, newFile);
		const oldWikilinks = [
			`[[${oldName}]]`,
			`[[${oldName}|${oldName}]]`  // Aliased form
		];

		// Find all markdown files
		const markdownFiles = this.app.vault.getMarkdownFiles();
		let updatedCount = 0;

		for (const file of markdownFiles) {
			// Skip the renamed file itself
			if (file.path === newFile.path) continue;

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			// Check if this file references the person by cr_id
			const fm = cache.frontmatter;
			const referencesPersonById = this.frontmatterContainsCrId(fm, personCrId);

			if (referencesPersonById) {
				await this.updateWikilinksInFile(file, oldWikilinks, newWikilink, personCrId);
				updatedCount++;
			}
		}

		logger.info('relationship-manager', `Updated wikilinks in ${updatedCount} files`);
	}

	/**
	 * Check if frontmatter contains a reference to the given cr_id
	 */
	private frontmatterContainsCrId(fm: Record<string, unknown>, crId: string): boolean {
		const idFields = [
			'father_id', 'mother_id',
			'stepfather_id', 'stepmother_id',
			'adoptive_father_id', 'adoptive_mother_id',
			'parents_id', 'spouse_id', 'children_id'
		];

		for (const field of idFields) {
			const value = fm[field];
			if (!value) continue;

			if (typeof value === 'string' && value === crId) {
				return true;
			}
			if (Array.isArray(value) && value.includes(crId)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Update wikilinks in a file's frontmatter
	 */
	private async updateWikilinksInFile(
		file: TFile,
		oldWikilinks: string[],
		newWikilink: string,
		personCrId: string
	): Promise<void> {
		const wikiliinkFields = [
			'father', 'mother',
			'stepfather', 'stepmother',
			'adoptive_father', 'adoptive_mother',
			'parents', 'spouse', 'children'
		];

		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				for (const field of wikiliinkFields) {
					const value = frontmatter[field];
					if (!value) continue;

					if (typeof value === 'string') {
						// Check if this wikilink matches any old form
						if (oldWikilinks.some(old => value.includes(old.slice(2, -2)))) {
							// Verify by checking the corresponding _id field
							const idField = this.getIdFieldName(field);
							const idValue = frontmatter[idField];
							if (this.idMatches(idValue, personCrId)) {
								frontmatter[field] = newWikilink;
							}
						}
					} else if (Array.isArray(value)) {
						// Update matching entries in array
						const idField = this.getIdFieldName(field);
						const idValue = frontmatter[idField];

						for (let i = 0; i < value.length; i++) {
							const entry = value[i];
							if (typeof entry === 'string' && oldWikilinks.some(old => entry.includes(old.slice(2, -2)))) {
								// For arrays, check if the cr_id at the same index matches
								if (Array.isArray(idValue) && idValue[i] === personCrId) {
									value[i] = newWikilink;
								} else if (typeof idValue === 'string' && idValue === personCrId) {
									// Single ID but array of names (shouldn't happen but handle it)
									value[i] = newWikilink;
								}
							}
						}
					}
				}
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to update wikilinks in file', {
				file: file.path,
				error: getErrorMessage(error)
			});
		}
	}

	/**
	 * Get the corresponding _id field name for a wikilink field
	 */
	private getIdFieldName(field: string): string {
		const fieldMap: Record<string, string> = {
			'father': 'father_id',
			'mother': 'mother_id',
			'stepfather': 'stepfather_id',
			'stepmother': 'stepmother_id',
			'adoptive_father': 'adoptive_father_id',
			'adoptive_mother': 'adoptive_mother_id',
			'parents': 'parents_id',
			'spouse': 'spouse_id',
			'children': 'children_id'
		};
		return fieldMap[field] || `${field}_id`;
	}

	/**
	 * Check if an ID value matches the target cr_id
	 */
	private idMatches(idValue: unknown, targetCrId: string): boolean {
		if (typeof idValue === 'string') {
			return idValue === targetCrId;
		}
		if (Array.isArray(idValue)) {
			return idValue.includes(targetCrId);
		}
		return false;
	}
}
