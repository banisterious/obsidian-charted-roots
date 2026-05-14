/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Add Relationship Modal
 * Allows users to add custom relationships between person notes
 */

import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { PersonPickerModal, PersonInfo } from './person-picker';
import { RelationshipContext } from './quick-create-person-modal';
import { RelationshipService } from '../relationships';
import type { RelationshipTypeDefinition } from '../relationships';
import { addFlatRelationship } from '../relationships/relationship-property-writer';
import type CanvasRootsPlugin from '../../main';
import { capitalize } from '../utils/format-utils';
import { RelationshipManager } from '../core/relationship-manager';
import { createSmartWikilink } from '../core/person-note-writer';
import { createSmartWikilink } from '../core/person-note-writer';

/**
 * Modal for adding a custom relationship to a person note
 */
export class AddRelationshipModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private sourceFile: TFile;
	private relationshipService: RelationshipService;

	private selectedType: RelationshipTypeDefinition | null = null;
	private selectedTarget: PersonInfo | null = null;
	private notes: string = '';

	constructor(app: App, plugin: CanvasRootsPlugin, sourceFile: TFile) {
		super(app);
		this.plugin = plugin;
		this.sourceFile = sourceFile;
		this.relationshipService = new RelationshipService(plugin);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-add-relationship-modal');

		// Get source person info
		const sourceCache = this.app.metadataCache.getFileCache(this.sourceFile);
		const sourceName = sourceCache?.frontmatter?.name || this.sourceFile.basename;
		const sourceCrId = sourceCache?.frontmatter?.cr_id;

		if (!sourceCrId) {
			new Notice('Source person does not have a cr_id');
			this.close();
			return;
		}

		contentEl.createEl('h2', { text: 'Add relationship' });
		contentEl.createEl('p', {
			text: `Adding relationship from: ${sourceName}`,
			cls: 'crc-text-muted'
		});

		// Relationship type selector
		const types = this.relationshipService.getAllRelationshipTypes();
		const typesByCategory = new Map<string, RelationshipTypeDefinition[]>();

		for (const type of types) {
			const existing = typesByCategory.get(type.category) || [];
			existing.push(type);
			typesByCategory.set(type.category, existing);
		}

		new Setting(contentEl)
			.setName('Relationship type')
			.setDesc('Select the type of relationship')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Select a type...');

				// Group by category
				for (const [category, categoryTypes] of typesByCategory) {
					const categoryLabel = capitalize(category);
					for (const type of categoryTypes) {
						dropdown.addOption(type.id, `${categoryLabel}: ${type.name}`);
					}
				}

				dropdown.onChange(value => {
					this.selectedType = types.find(t => t.id === value) || null;
					this.updateAddButton();
				});
			});

		// Target person selector
		const targetSetting = new Setting(contentEl)
			.setName('Target person')
			.setDesc('Select the person this relationship points to');

		const targetDisplay = targetSetting.controlEl.createDiv({ cls: 'cr-target-display' });
		targetDisplay.createSpan({ text: 'None selected', cls: 'crc-text-muted' });

		targetSetting.addButton(btn => btn
			.setButtonText('Select person')
			.onClick(() => {
				// Build context for inline creation
				const cache = this.app.metadataCache.getFileCache(this.sourceFile);
				const crId = cache?.frontmatter?.cr_id;
				const directory = this.sourceFile.parent?.path || '';

				// Use selected relationship type (if any)
				const relationshipType = this.selectedType?.id || 'related';

				const createContext: RelationshipContext = {
					relationshipType: relationshipType,
					suggestedSex: undefined, // Custom relationships don't suggest sex
					parentCrId: crId,
					directory: directory
				};

				const picker = new PersonPickerModal(this.app, (selected) => {
					this.selectedTarget = selected;
					targetDisplay.empty();
					targetDisplay.createSpan({ text: selected.name });
					this.updateAddButton();
				}, {
					title: 'Select person',
					createContext: createContext,
					onCreateNew: () => {
						// Callback signals inline creation support
					},
					plugin: this.plugin,
					excludeFiles: [this.sourceFile]
				});
				picker.open();
			})
		);

		// Optional notes
		new Setting(contentEl)
			.setName('Notes (optional)')
			.setDesc('Additional notes about this relationship')
			.addTextArea(text => text
				.setPlaceholder('e.g., "Became godparent in 1920"')
				.onChange(value => {
					this.notes = value;
				})
			);

		// Action buttons
		const buttonContainer = contentEl.createDiv({ cls: 'cr-modal-buttons' });

		const addBtn = buttonContainer.createEl('button', {
			text: 'Add relationship',
			cls: 'mod-cta'
		});
		addBtn.disabled = true;
		addBtn.addEventListener('click', () => void this.addRelationship());

		// Store reference for enabling/disabling
		(this as { addButton?: HTMLButtonElement }).addButton = addBtn;

		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => this.close());
	}

	private updateAddButton() {
		const addBtn = (this as { addButton?: HTMLButtonElement }).addButton;
		if (addBtn) {
			addBtn.disabled = !this.selectedType || !this.selectedTarget;
		}
	}

	private async addRelationship() {
		if (!this.selectedType || !this.selectedTarget) {
			new Notice('Please select a relationship type and target person');
			return;
		}

		const sourceCache = this.app.metadataCache.getFileCache(this.sourceFile);
		const targetCache = this.app.metadataCache.getFileCache(this.selectedTarget.file);

		const sourceCrId = sourceCache?.frontmatter?.cr_id;
		const targetCrId = targetCache?.frontmatter?.cr_id;
		const targetName = targetCache?.frontmatter?.name || this.selectedTarget.file.basename;

		if (!sourceCrId || !targetCrId) {
			new Notice('Both people must have cr_id fields');
			return;
		}

		try {
			// For built-in family types, delegate to RelationshipManager
			// which knows how to write the correct frontmatter properties
			const mapping = this.selectedType.familyGraphMapping;
			if (mapping) {
				const mgr = new RelationshipManager(this.app, this.plugin.relationshipHistory);
				if (mapping === 'spouse') {
					await mgr.addSpouseRelationship(this.sourceFile, this.selectedTarget.file, targetCrId);
				} else if (mapping === 'parent') {
					// Determine father/mother from the target's sex
					const targetSex = targetCache?.frontmatter?.sex;
					const parentType = (targetSex === 'female' || targetSex === 'f') ? 'mother' : 'father';
					await mgr.addParentRelationship(this.sourceFile, this.selectedTarget.file, parentType, targetCrId);
				} else if (mapping === 'child' && this.selectedType.id === 'child') {
					// Only biological child uses addChildRelationship
					await mgr.addChildRelationship(this.sourceFile, this.selectedTarget.file, targetCrId);
				} else if (this.selectedType.id === 'adoptive_parent') {
					// Adoptive parents: write to gender-specific singular field based on
					// target's sex (#391). Falls back to the gender-neutral array when the
					// matching slot is already occupied (e.g., two fathers).
					await this.writeAdoptiveParentProperties(targetCrId, targetCache?.frontmatter?.sex as string | undefined);
				} else {
					// Other family mappings (guardian, stepparent, adopted_child,
					// step_child, foster_child, ward, etc.)
					// Use the generic relationship property write
					await this.writeRelationshipProperties(targetCrId);
				}
			} else {
				// Custom/non-family relationships: write flat properties directly
				await this.writeRelationshipProperties(targetCrId);
			}

			const typeName = this.selectedType.name;
			new Notice(`Added ${typeName} relationship to ${targetName}`);

			// Refresh the relationship service cache
			this.relationshipService.refreshCache();

			this.close();
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to add relationship: ${msg}`);
		}
	}

	/**
	 * Write an adoptive-parent relationship to the gender-specific singular field
	 * (`adoptive_father_id` or `adoptive_mother_id`) based on the target's sex.
	 * Falls back to the gender-neutral `adoptive_parent_ids` array when the
	 * matching slot is already occupied (same-sex adoptive parents).
	 */
	private async writeAdoptiveParentProperties(targetCrId: string, targetSex: string | undefined): Promise<void> {
		if (!this.selectedTarget) return;
		const targetWikilink = `[[${this.selectedTarget.file.basename}]]`;
		const sex = targetSex?.toLowerCase();
		const isFemale = sex === 'f' || sex === 'female';
		const isMale = sex === 'm' || sex === 'male';

		await this.app.fileManager.processFrontMatter(this.sourceFile, (frontmatter) => {
			// Check if relationship already exists in any adoptive field
			const existingIds: string[] = [
				frontmatter.adoptive_father_id,
				frontmatter.adoptive_mother_id,
				...this.normalizeToArray(frontmatter.adoptive_parent_ids)
			].filter((v): v is string => typeof v === 'string' && v.length > 0);
			if (existingIds.includes(targetCrId)) {
				throw new Error('This relationship already exists');
			}

			if (isFemale) {
				if (!frontmatter.adoptive_mother_id) {
					frontmatter.adoptive_mother = targetWikilink;
					frontmatter.adoptive_mother_id = targetCrId;
					return;
				}
			} else if (isMale) {
				if (!frontmatter.adoptive_father_id) {
					frontmatter.adoptive_father = targetWikilink;
					frontmatter.adoptive_father_id = targetCrId;
					return;
				}
			}

			// Fall through to the gender-neutral array (unknown sex OR matching slot already taken)
			const existingParents = this.normalizeToArray(frontmatter.adoptive_parents);
			const existingParentIds = this.normalizeToArray(frontmatter.adoptive_parent_ids);
			existingParents.push(targetWikilink);
			existingParentIds.push(targetCrId);
			frontmatter.adoptive_parents = existingParents.length === 1 ? existingParents[0] : existingParents;
			frontmatter.adoptive_parent_ids = existingParentIds.length === 1 ? existingParentIds[0] : existingParentIds;
		});
	}

	/**
	 * Write relationship as flat properties (for custom and non-core family types)
	 */
	private async writeRelationshipProperties(targetCrId: string): Promise<void> {
		if (!this.selectedType || !this.selectedTarget) return;

		const typeId = this.selectedType.id;
		// Route through createSmartWikilink so the write carries canonical-form
		// basename-ambiguity disambiguation (#540) instead of a raw `[[basename]]`
		// that can resolve to the wrong file when two people share the same
		// filename (#553). Matches the writer-side pattern from #549.
		const targetWikilink = createSmartWikilink(this.selectedTarget.file.basename, this.app, targetCrId);
		const notes = this.notes.trim() || undefined;

		await this.app.fileManager.processFrontMatter(this.sourceFile, (frontmatter) => {
			const result = addFlatRelationship(frontmatter, typeId, targetWikilink, targetCrId, { notes });
			if (result === 'duplicate') {
				throw new Error('This relationship already exists');
			}
		});

		if (this.selectedType.symmetric) {
			await this.writeReciprocalRelationshipProperties(typeId);
		}
	}

	/**
	 * Mirror a symmetric custom relationship onto the target's note so that
	 * adding A -twin-> B automatically creates B -twin-> A (#419).
	 *
	 * Idempotent: silently no-ops when the target already lists the source
	 * (e.g., a user adding the same symmetric link from both sides).
	 * The source write has already committed by the time this runs; a
	 * failure here surfaces a partial-success notice so the user knows to
	 * fix the target by hand rather than assuming the whole save failed.
	 */
	private async writeReciprocalRelationshipProperties(typeId: string): Promise<void> {
		if (!this.selectedTarget) return;

		const sourceCache = this.app.metadataCache.getFileCache(this.sourceFile);
		const sourceCrId = sourceCache?.frontmatter?.cr_id;
		if (typeof sourceCrId !== 'string' || sourceCrId.length === 0) return;

		// Same canonical-form rewrap as the source-side write (#553).
		const sourceWikilink = createSmartWikilink(this.sourceFile.basename, this.app, sourceCrId);
		const targetFile = this.selectedTarget.file;

		const notes = this.notes.trim() || undefined;

		try {
			await this.app.fileManager.processFrontMatter(targetFile, (frontmatter) => {
				addFlatRelationship(frontmatter, typeId, sourceWikilink, sourceCrId, { notes });
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			new Notice(`Added on ${this.sourceFile.basename}, but failed to mirror on ${targetFile.basename}: ${msg}`);
		}
	}

	/**
	 * Normalize a value to an array
	 */
	private normalizeToArray(value: unknown): string[] {
		if (!value) return [];
		if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : JSON.stringify(v));
		return [typeof value === 'string' ? value : JSON.stringify(value)];
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
