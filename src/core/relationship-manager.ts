/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { App, TFile, Notice } from 'obsidian';
import { RelationshipHistoryService, RelationshipChangeType } from './relationship-history';
import { getLogger } from './logging';
import { getErrorMessage } from './error-utils';
import { extractDisplayLabel, getCanonicalLinktext } from '../utils/wikilink-resolver';
import { type ConflictPolicy, overwriteOnConflict } from './conflict-policy';

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
	private conflictPolicy: ConflictPolicy;

	/**
	 * @param conflictPolicy How to resolve writes that would overwrite an
	 * existing scalar relationship field (`father` / `mother`) with a
	 * different person reference. UI-driven sites should pass a prompt
	 * policy (see `promptOnConflict` in `src/ui/conflict-guard-modal.ts`);
	 * background / reactive sites should pass `skipOnConflict`. Defaults
	 * to `overwriteOnConflict` to preserve pre-v0.22.47 behavior for any
	 * caller that doesn't yet specify a policy (#606).
	 */
	constructor(
		private app: App,
		historyService?: RelationshipHistoryService | null,
		conflictPolicy?: ConflictPolicy
	) {
		this.conflictPolicy = conflictPolicy ?? overwriteOnConflict;
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
	 * @returns `true` if the relationship was added, `false` if the
	 *   conflict policy canceled the write or a precondition failed (#606).
	 *   Callers should suppress their own success notices on `false`.
	 */
	async addParentRelationship(
		childFile: TFile,
		parentFile: TFile,
		parentType: 'father' | 'mother',
		knownParentCrId?: string
	): Promise<boolean> {
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
			return false;
		}

		// Validate parent type matches sex (handle both raw and normalized values)
		const normalizedParentSex = parentSex?.toLowerCase();
		if (parentType === 'father' && (normalizedParentSex === 'f' || normalizedParentSex === 'female')) {
			new Notice('Warning: selected person has sex: F but being added as father');
		} else if (parentType === 'mother' && (normalizedParentSex === 'm' || normalizedParentSex === 'male')) {
			new Notice('Warning: selected person has sex: M but being added as mother');
		}

		// Update child's frontmatter (dual storage: wikilink + ID).
		// Bails before reciprocal writes if the conflict guard canceled (#606).
		const wrote = await this.updateParentField(childFile, parentFile, parentCrId, parentName, parentType);
		if (!wrote) {
			return false;
		}

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
		return true;
	}

	/**
	 * Add a parent-child relationship using the gender-neutral `parents` array on
	 * the child's side instead of the gendered `father` / `mother` fields. Used
	 * when the "Enable gender-neutral parent property" setting is on, or when
	 * the target parent's sex is not `male` / `female` (so the gendered
	 * fallback would be the wrong fit).
	 *
	 * The parent side still updates `children` / `children_id` via the same
	 * helper as the gendered path — that shape is independent of the parent's sex.
	 */
	async addInclusiveParentRelationship(
		childFile: TFile,
		parentFile: TFile,
		knownParentCrId?: string
	): Promise<void> {
		const childCrId = this.extractCrId(childFile);
		const parentCrId = knownParentCrId || this.extractCrId(parentFile);
		const childName = this.extractName(childFile);
		const parentName = this.extractName(parentFile);

		if (!childCrId || !parentCrId) {
			const missing = !childCrId && !parentCrId ? 'both notes' :
				!childCrId ? `child (${childFile.basename})` : `parent (${parentFile.basename})`;
			new Notice(`Error: could not find cr_id in ${missing}`);
			logger.error('relationship-manager', 'Missing cr_id in addInclusiveParentRelationship', {
				childFile: childFile.path,
				childCrId,
				parentFile: parentFile.path,
				parentCrId
			});
			return;
		}

		// Update child's parents / parents_id arrays (dual storage)
		await this.addToParentsArray(childFile, parentFile, parentCrId, parentName);

		// Update parent's children array (same code path as gendered case)
		await this.addToChildrenArray(parentFile, childFile, childCrId, childName);

		// Record to history
		if (this.historyRecorder) {
			await this.historyRecorder(
				'add_parent',
				childFile, childName, childCrId,
				parentFile, parentName, parentCrId,
				`[[${parentName}]]`
			);
		}

		new Notice(
			`Added ${parentFile.basename} as parent of ${childFile.basename}`
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
	): Promise<boolean> {
		const parentCrId = this.extractCrId(parentFile);
		const childCrId = knownChildCrId || this.extractCrId(childFile);
		const parentSex = this.extractSex(parentFile);
		const parentName = this.extractName(parentFile);
		const childName = this.extractName(childFile);

		if (!childCrId || !parentCrId) {
			new Notice('Error: could not find cr_id in one or both notes');
			return false;
		}

		// Determine parent type from sex (handle both raw and normalized values)
		const normalizedSex = parentSex?.toLowerCase();
		const parentType: 'father' | 'mother' = (normalizedSex === 'f' || normalizedSex === 'female') ? 'mother' : 'father';

		// Update child's frontmatter (dual storage: wikilink + ID).
		// Bails before reciprocal writes if the conflict guard canceled (#606).
		const wrote = await this.updateParentField(childFile, parentFile, parentCrId, parentName, parentType);
		if (!wrote) {
			return false;
		}

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
		return true;
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
	 * Find a file by its cr_id property
	 */
	private findFileByCrId(crId: string): TFile | null {
		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.cr_id === crId) {
				return file;
			}
		}
		return null;
	}

	/**
	 * Update father/mother fields in child's frontmatter (dual storage)
	 * Writes both wikilink field (father/mother) and ID field (father_id/mother_id)
	 * Uses processFrontMatter to safely modify without corrupting other fields
	 *
	 * Returns `true` if the write proceeded, `false` if the conflict policy
	 * canceled (caller should bail on subsequent reciprocal writes and the
	 * success notice — #606).
	 */
	private async updateParentField(
		childFile: TFile,
		parentFile: TFile,
		parentCrId: string,
		parentName: string,
		parentType: 'father' | 'mother'
	): Promise<boolean> {
		const idFieldName = parentType === 'father' ? 'father_id' : 'mother_id';
		const linkFieldName = parentType; // 'father' or 'mother'
		const wikilink = this.createSmartWikilink(parentName, parentFile);

		// Conflict guard (#606): an existing scalar parent reference that
		// points to a different person is data-loss territory. Consult the
		// configured policy before overwriting; the policy may prompt the
		// user, log + skip, or proceed unconditionally depending on which
		// path constructed this manager.
		const cache = this.app.metadataCache.getFileCache(childFile);
		const existingId = cache?.frontmatter?.[idFieldName];
		let previousParentCrId: string | null = null;
		if (
			typeof existingId === 'string'
			&& existingId !== ''
			&& existingId !== parentCrId
		) {
			const existingLink = cache?.frontmatter?.[linkFieldName];
			const existingDisplay = typeof existingLink === 'string' && existingLink.trim()
				? extractDisplayLabel(existingLink)
				: existingId;
			const decision = await this.conflictPolicy({
				fieldName: idFieldName,
				fieldLabel: parentType === 'father' ? 'Father' : 'Mother',
				existingValue: existingId,
				newValue: parentCrId,
				existingDisplay,
				newDisplay: parentName,
				subjectFile: childFile,
			});
			if (decision === 'cancel') {
				return false;
			}
			previousParentCrId = existingId;
		}

		try {
			await this.app.fileManager.processFrontMatter(childFile, (frontmatter) => {
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
			return false;
		}

		// Reciprocal cleanup (#606): the user just replaced the previous
		// scalar parent. The bidi-linker handles add-on-set but doesn't
		// watch for removed references, so without this cleanup the
		// previous parent would keep the child stranded in their
		// `children` arrays. Done after the child-side write succeeded
		// so a failed write doesn't leave a half-applied state.
		if (previousParentCrId) {
			const previousParentFile = this.findFileByCrId(previousParentCrId);
			const childCrId = cache?.frontmatter?.cr_id;
			if (previousParentFile && typeof childCrId === 'string' && childCrId) {
				await this.removeFromChildrenArray(previousParentFile, childCrId);
			}
		}

		return true;
	}

	/**
	 * Remove a child reference from a parent's `children` / `children_id`
	 * arrays. Used by the conflict-guard replace path to keep the previous
	 * parent from claiming a child who has been re-parented elsewhere
	 * (#606).
	 */
	private async removeFromChildrenArray(parentFile: TFile, childCrId: string): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(parentFile, (frontmatter) => {
				// Filter ID array (or scalar) → array minus the removed id.
				const existingIds = frontmatter.children_id;
				if (existingIds) {
					const idArray = Array.isArray(existingIds) ? existingIds : [existingIds];
					const filteredIds = idArray.filter((id: unknown) => id !== childCrId);
					if (filteredIds.length === 0) {
						delete frontmatter.children_id;
					} else if (filteredIds.length === 1) {
						frontmatter.children_id = filteredIds[0];
					} else {
						frontmatter.children_id = filteredIds;
					}
				}

				// Filter wikilink array (or scalar) by checking each entry's
				// canonical link target against the removed child's cr_id.
				const existingLinks = frontmatter.children;
				if (existingLinks) {
					const linkArray = Array.isArray(existingLinks) ? existingLinks : [existingLinks];
					const filteredLinks = linkArray.filter((link: unknown) => {
						if (typeof link !== 'string') return true;
						const linkPath = link.replace(/\[\[|\]\]/g, '').replace(/\|.*/, '');
						const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, parentFile.path);
						if (!linkedFile) return true;
						const linkedCrId = this.app.metadataCache.getFileCache(linkedFile)?.frontmatter?.cr_id;
						return linkedCrId !== childCrId;
					});
					if (filteredLinks.length === 0) {
						delete frontmatter.children;
					} else if (filteredLinks.length === 1) {
						frontmatter.children = filteredLinks[0];
					} else {
						frontmatter.children = filteredLinks;
					}
				}
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to remove from children array', {
				file: parentFile.path,
				childCrId,
				error: getErrorMessage(error)
			});
		}
	}

	/**
	 * Create a wikilink with proper handling of duplicate filenames
	 * Uses [[basename|name]] format when basename differs from name
	 */
	private createSmartWikilink(name: string, file: TFile): string {
		// Idempotency: collapse `basename|alias` stem (#537) and `path/to/file`
		// form (#538) so repeated calls don't accumulate aliases or preserve paths.
		const afterPipe = name.includes('|')
			? name.split('|').pop()!.trim() || name
			: name;
		const displayName = afterPipe.includes('/')
			? afterPipe.split('/').pop()!.trim() || afterPipe
			: afterPipe;
		// Path-form when basename is ambiguous in the vault (#540).
		const target = getCanonicalLinktext(this.app, file);
		if (target !== displayName) {
			return `[[${target}|${displayName}]]`;
		}
		return `[[${target}]]`;
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

		// Build a set of valid cr_ids by checking which existing children_id entries
		// resolve to actual files in the vault
		const validCrIds = new Set<string>();
		const cache = this.app.metadataCache.getFileCache(parentFile);
		const existingIds = cache?.frontmatter?.children_id;
		if (existingIds) {
			const idArray = Array.isArray(existingIds) ? existingIds : [existingIds];
			for (const id of idArray) {
				// Check if this cr_id resolves to an existing file
				if (this.findFileByCrId(id)) {
					validCrIds.add(id);
				}
			}
		}

		try {
			await this.app.fileManager.processFrontMatter(parentFile, (frontmatter) => {
				// Rebuild children_id from valid entries + new child
				const cleanIds = Array.from(validCrIds);
				if (!cleanIds.includes(childCrId)) {
					cleanIds.push(childCrId);
				}
				frontmatter.children_id = cleanIds.length === 1 ? cleanIds[0] : cleanIds;

				// Rebuild children wikilinks to match valid IDs
				const cleanLinks: string[] = [];
				// Keep existing valid wikilinks
				const existingLinks = frontmatter.children;
				if (existingLinks) {
					const linkArray = Array.isArray(existingLinks) ? existingLinks : [existingLinks];
					for (const link of linkArray) {
						// Check if the linked file still exists
						const linkPath = link.replace(/\[\[|\]\]/g, '').replace(/\|.*/, '');
						const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, parentFile.path);
						if (linkedFile) {
							const linkedCrId = this.app.metadataCache.getFileCache(linkedFile)?.frontmatter?.cr_id;
							if (linkedCrId && validCrIds.has(linkedCrId)) {
								cleanLinks.push(link);
							}
						}
					}
				}
				// Add new child wikilink if not already present
				if (!cleanLinks.includes(wikilink)) {
					cleanLinks.push(wikilink);
				}
				frontmatter.children = cleanLinks.length === 1 ? cleanLinks[0] : cleanLinks;
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to add to children array', {
				file: parentFile.path,
				error: getErrorMessage(error)
			});
		}
	}

	/**
	 * Add parent to child's parents arrays (dual storage, gender-neutral path)
	 * Writes both wikilink field (parents) and ID field (parents_id)
	 * Uses processFrontMatter to safely modify without corrupting other fields
	 */
	private async addToParentsArray(
		childFile: TFile,
		parentFile: TFile,
		parentCrId: string,
		parentName: string
	): Promise<void> {
		const wikilink = this.createSmartWikilink(parentName, parentFile);

		// Build a set of valid cr_ids by checking which existing parents_id entries
		// resolve to actual files in the vault
		const validCrIds = new Set<string>();
		const cache = this.app.metadataCache.getFileCache(childFile);
		const existingIds = cache?.frontmatter?.parents_id;
		if (existingIds) {
			const idArray = Array.isArray(existingIds) ? existingIds : [existingIds];
			for (const id of idArray) {
				if (this.findFileByCrId(id)) {
					validCrIds.add(id);
				}
			}
		}

		try {
			await this.app.fileManager.processFrontMatter(childFile, (frontmatter) => {
				// Rebuild parents_id from valid entries + new parent
				const cleanIds = Array.from(validCrIds);
				if (!cleanIds.includes(parentCrId)) {
					cleanIds.push(parentCrId);
				}
				frontmatter.parents_id = cleanIds.length === 1 ? cleanIds[0] : cleanIds;

				// Rebuild parents wikilinks to match valid IDs
				const cleanLinks: string[] = [];
				const existingLinks = frontmatter.parents;
				if (existingLinks) {
					const linkArray = Array.isArray(existingLinks) ? existingLinks : [existingLinks];
					for (const link of linkArray) {
						const linkPath = link.replace(/\[\[|\]\]/g, '').replace(/\|.*/, '');
						const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, childFile.path);
						if (linkedFile) {
							const linkedCrId = this.app.metadataCache.getFileCache(linkedFile)?.frontmatter?.cr_id;
							if (linkedCrId && validCrIds.has(linkedCrId)) {
								cleanLinks.push(link);
							}
						}
					}
				}
				if (!cleanLinks.includes(wikilink)) {
					cleanLinks.push(wikilink);
				}
				frontmatter.parents = cleanLinks.length === 1 ? cleanLinks[0] : cleanLinks;
			});
		} catch (error) {
			logger.error('relationship-manager', 'Failed to add to parents array', {
				file: childFile.path,
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
	 * Check if frontmatter contains a reference to the given cr_id.
	 *
	 * Scans every frontmatter key ending in `_id` rather than a hardcoded
	 * list (#555). The previous static list missed indexed-spouse
	 * (`spouseN_id`), `adopted_child_id`, `step_child_id`,
	 * `adoptive_parent_id`, custom-relationship `<typeId>_id` arrays, and
	 * any future relationship field added without a corresponding entry
	 * here. The id-match comparison naturally skips non-person fields
	 * (place / event / source ids won't match a renamed person's cr_id).
	 */
	private frontmatterContainsCrId(fm: Record<string, unknown>, crId: string): boolean {
		for (const key of Object.keys(fm)) {
			if (!key.endsWith('_id')) continue;
			const value = fm[key];
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
	 * Update wikilinks in a file's frontmatter.
	 *
	 * Iterates every frontmatter key with a paired `<key>_id` field rather
	 * than a hardcoded list (#555). Each wikilink-bearing field is rewritten
	 * to canonical form when its paired `_id` matches the renamed person's
	 * cr_id. This naturally covers indexed-spouse slots (`spouse1` +
	 * `spouse1_id`), gender-neutral relationships (`adoptive_parent`,
	 * `parents`), step/adopted-child arrays on parents' notes, and any
	 * custom relationship type a user has configured — all of which the
	 * previous static field list missed.
	 *
	 * The id-match guard ensures non-person paired fields (place / event /
	 * source) are skipped: their `_id` values won't match a person's cr_id.
	 */
	private async updateWikilinksInFile(
		file: TFile,
		oldWikilinks: string[],
		newWikilink: string,
		personCrId: string
	): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				for (const field of Object.keys(frontmatter)) {
					// Skip the `_id` fields themselves — we drive iteration
					// from the wikilink-bearing key and look up its `_id` pair.
					if (field.endsWith('_id')) continue;

					const value = frontmatter[field];
					if (!value) continue;

					const idField = `${field}_id`;
					const idValue = frontmatter[idField];
					if (idValue === undefined) continue;

					if (typeof value === 'string') {
						// Check if this wikilink matches any old form
						if (oldWikilinks.some(old => value.includes(old.slice(2, -2)))) {
							if (this.idMatches(idValue, personCrId)) {
								frontmatter[field] = newWikilink;
							}
						}
					} else if (Array.isArray(value)) {
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

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- Match scope of file-level disable at top. */
