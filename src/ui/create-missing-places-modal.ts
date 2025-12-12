/**
 * Modal for batch creating missing place notes
 * Shows referenced places that don't have notes and allows selection for creation
 */

import { App, Modal, Setting, Notice, normalizePath, TFile } from 'obsidian';
import { createPlaceNote } from '../core/place-note-writer';
import { createLucideIcon } from './lucide-icons';
import { PlaceGraphService } from '../core/place-graph';
import { PlaceReference } from '../models/place';
import { normalizePlaceName } from '../utils/place-name-normalizer';

interface MissingPlace {
	name: string;
	normalizedName: string;
	count: number;
}

/**
 * Parent place information resolved from hierarchy
 */
interface ParentPlaceInfo {
	name: string;
	crId: string;
}

interface CreateMissingPlacesOptions {
	directory?: string;
	onComplete?: (created: number) => void;
	/** PlaceGraphService for auto-linking */
	placeGraph?: PlaceGraphService;
}

/**
 * Modal for selecting and creating missing place notes in batch
 */
export class CreateMissingPlacesModal extends Modal {
	private places: MissingPlace[];
	private selectedPlaces: Set<string>;
	private directory: string;
	private onComplete?: (created: number) => void;
	private placeGraph?: PlaceGraphService;
	private autoLinkEnabled: boolean = true;
	private normalizeEnabled: boolean = true;

	constructor(
		app: App,
		places: Array<{ name: string; count: number }>,
		options: CreateMissingPlacesOptions = {}
	) {
		super(app);
		// Pre-compute normalized names for all places
		this.places = places.map(p => ({
			name: p.name,
			normalizedName: normalizePlaceName(p.name),
			count: p.count
		}));
		this.selectedPlaces = new Set();
		this.directory = options.directory || '';
		this.onComplete = options.onComplete;
		this.placeGraph = options.placeGraph;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('crc-create-missing-places-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-modal-header' });
		const titleContainer = header.createDiv({ cls: 'crc-modal-title' });
		const icon = createLucideIcon('map-pin', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Create missing place notes');

		// Description
		contentEl.createEl('p', {
			text: `Found ${this.places.length} place${this.places.length !== 1 ? 's' : ''} referenced in person notes without corresponding place notes.`,
			cls: 'crc-text--muted'
		});

		// Directory setting
		const form = contentEl.createDiv({ cls: 'crc-form' });

		new Setting(form)
			.setName('Directory')
			.setDesc('Where to create the new place notes')
			.addText(text => text
				.setPlaceholder('e.g., Places')
				.setValue(this.directory)
				.onChange(value => {
					this.directory = value;
				}));

		// Normalize place names option
		const normalizeCount = this.places.filter(p => p.name !== p.normalizedName).length;
		if (normalizeCount > 0) {
			new Setting(form)
				.setName('Normalize place names')
				.setDesc(`Expand abbreviations and standardize ${normalizeCount} place name${normalizeCount !== 1 ? 's' : ''} (e.g., "Hunt Co, TX" → "Hunt County, Texas, USA")`)
				.addToggle(toggle => toggle
					.setValue(this.normalizeEnabled)
					.onChange(value => {
						this.normalizeEnabled = value;
						this.renderPlaceList(placeListContainer);
					}));
		}

		// Auto-link option (only if placeGraph is available)
		if (this.placeGraph) {
			new Setting(form)
				.setName('Auto-link person notes')
				.setDesc('Update person notes to link to the newly created place notes')
				.addToggle(toggle => toggle
					.setValue(this.autoLinkEnabled)
					.onChange(value => {
						this.autoLinkEnabled = value;
					}));
		}

		// Selection controls
		const controlsRow = contentEl.createDiv({ cls: 'crc-controls-row crc-mb-3' });

		const selectAllBtn = controlsRow.createEl('button', {
			text: 'Select all',
			cls: 'crc-btn crc-btn--small'
		});
		selectAllBtn.addEventListener('click', () => {
			this.selectAll();
			this.renderPlaceList(placeListContainer);
		});

		const selectNoneBtn = controlsRow.createEl('button', {
			text: 'Select none',
			cls: 'crc-btn crc-btn--small crc-ml-2'
		});
		selectNoneBtn.addEventListener('click', () => {
			this.selectNone();
			this.renderPlaceList(placeListContainer);
		});

		const selectionCount = controlsRow.createEl('span', {
			cls: 'crc-text--muted crc-ml-3'
		});
		this.updateSelectionCount(selectionCount);

		// Place list container
		const placeListContainer = contentEl.createDiv({ cls: 'crc-place-list-container' });
		this.renderPlaceList(placeListContainer);

		// Update selection count when checkboxes change
		placeListContainer.addEventListener('change', () => {
			this.updateSelectionCount(selectionCount);
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'crc-btn'
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const createBtn = buttonContainer.createEl('button', {
			text: 'Create selected',
			cls: 'crc-btn crc-btn--primary'
		});
		createBtn.addEventListener('click', () => void this.createSelectedPlaces());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the place list with checkboxes
	 */
	private renderPlaceList(container: HTMLElement): void {
		container.empty();

		const list = container.createEl('div', { cls: 'crc-checkbox-list' });

		for (const place of this.places) {
			const item = list.createDiv({ cls: 'crc-checkbox-item' });

			const checkbox = item.createEl('input', {
				type: 'checkbox',
				cls: 'crc-checkbox'
			});
			checkbox.checked = this.selectedPlaces.has(place.name);
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedPlaces.add(place.name);
				} else {
					this.selectedPlaces.delete(place.name);
				}
			});

			const label = item.createEl('label', { cls: 'crc-checkbox-label' });

			// Show the name that will be used (normalized or original)
			const displayName = this.normalizeEnabled ? place.normalizedName : place.name;
			const willBeNormalized = this.normalizeEnabled && place.name !== place.normalizedName;

			if (willBeNormalized) {
				// Show original with strikethrough and normalized name
				label.createEl('span', {
					text: place.name,
					cls: 'crc-text--strikethrough crc-text--muted'
				});
				label.createEl('span', { text: ' → ' });
				label.createEl('span', { text: place.normalizedName });
			} else {
				label.createEl('span', { text: displayName });
			}

			label.createEl('span', {
				text: ` (${place.count} reference${place.count !== 1 ? 's' : ''})`,
				cls: 'crc-text--muted'
			});

			// Make label toggle checkbox
			label.addEventListener('click', () => {
				checkbox.checked = !checkbox.checked;
				checkbox.dispatchEvent(new Event('change', { bubbles: true }));
			});
		}
	}

	/**
	 * Select all places
	 */
	private selectAll(): void {
		for (const place of this.places) {
			this.selectedPlaces.add(place.name);
		}
	}

	/**
	 * Deselect all places
	 */
	private selectNone(): void {
		this.selectedPlaces.clear();
	}

	/**
	 * Update the selection count display
	 */
	private updateSelectionCount(element: HTMLElement): void {
		element.textContent = `${this.selectedPlaces.size} of ${this.places.length} selected`;
	}

	/**
	 * Create place notes for selected places
	 */
	private async createSelectedPlaces(): Promise<void> {
		if (this.selectedPlaces.size === 0) {
			new Notice('No places selected');
			return;
		}

		try {
			// Ensure directory exists
			if (this.directory) {
				const normalizedDir = normalizePath(this.directory);
				const folder = this.app.vault.getAbstractFileByPath(normalizedDir);
				if (!folder) {
					await this.app.vault.createFolder(normalizedDir);
				}
			}

			let created = 0;
			const errors: string[] = [];
			// Track both original and created names for auto-linking
			const createdPlaceMappings: Array<{ original: string; created: string }> = [];

			for (const originalName of this.selectedPlaces) {
				// Find the place entry to get the normalized name
				const placeEntry = this.places.find(p => p.name === originalName);
				if (!placeEntry) continue;

				// Use normalized name if enabled, otherwise original
				const nameToCreate = this.normalizeEnabled ? placeEntry.normalizedName : originalName;

				try {
					// Create with the (possibly normalized) name
					// Store original as alias if different, so linking still works
					const aliases = (this.normalizeEnabled && originalName !== nameToCreate)
						? [originalName]
						: undefined;

					// Try to find a parent place from the hierarchy
					// Use the name we're creating (normalized if enabled) for parent lookup
					const parentInfo = this.findParentPlace(nameToCreate);

					await createPlaceNote(this.app, {
						name: nameToCreate,
						aliases,
						parentPlace: parentInfo?.name,
						parentPlaceId: parentInfo?.crId
					}, {
						directory: this.directory,
						openAfterCreate: false
					});
					created++;
					createdPlaceMappings.push({ original: originalName, created: nameToCreate });
				} catch (error) {
					errors.push(`${nameToCreate}: ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			}

			// Auto-link person notes if enabled
			let linkedCount = 0;
			if (this.autoLinkEnabled && this.placeGraph && createdPlaceMappings.length > 0) {
				// Pass the original names for matching references
				const originalNames = createdPlaceMappings.map(m => m.original);
				linkedCount = await this.autoLinkPersonNotes(originalNames);
			}

			if (errors.length > 0) {
				console.error('Errors creating place notes:', errors);
				new Notice(`Created ${created} place notes. ${errors.length} failed.`);
			} else {
				let message = `Created ${created} place note${created !== 1 ? 's' : ''}`;
				if (linkedCount > 0) {
					message += ` and updated ${linkedCount} person note${linkedCount !== 1 ? 's' : ''}`;
				}
				new Notice(message);
			}

			if (this.onComplete) {
				this.onComplete(created);
			}

			this.close();
		} catch (error) {
			console.error('Failed to create place notes:', error);
			new Notice(`Failed to create place notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Auto-link person notes to newly created place notes
	 * Updates frontmatter to convert plain text place names to wikilinks
	 */
	private async autoLinkPersonNotes(createdPlaces: string[]): Promise<number> {
		if (!this.placeGraph) return 0;

		// Reload the cache to get fresh references
		this.placeGraph.reloadCache();
		const allRefs = this.placeGraph.getPlaceReferences();

		// Find unlinked references that match our created places
		const refsToUpdate: PlaceReference[] = allRefs.filter(ref =>
			!ref.isLinked && createdPlaces.includes(ref.rawValue)
		);

		if (refsToUpdate.length === 0) return 0;

		// Group references by person file
		const refsByPerson = new Map<string, PlaceReference[]>();
		for (const ref of refsToUpdate) {
			const existing = refsByPerson.get(ref.personId) || [];
			existing.push(ref);
			refsByPerson.set(ref.personId, existing);
		}

		let updatedCount = 0;

		// Update each person's frontmatter
		for (const [personId, refs] of refsByPerson) {
			try {
				// Find the person's file
				const personFile = this.findPersonFile(personId);
				if (!personFile) continue;

				await this.updatePersonFrontmatter(personFile, refs);
				updatedCount++;
			} catch (error) {
				console.error(`Failed to auto-link places for person ${personId}:`, error);
			}
		}

		return updatedCount;
	}

	/**
	 * Find a person file by cr_id
	 */
	private findPersonFile(crId: string): TFile | null {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;

			if (fm?.type === 'person' && fm?.cr_id === crId) {
				return file;
			}
		}

		return null;
	}

	/**
	 * Find the parent place for a hierarchical place name
	 *
	 * For "Union Valley, Hunt County, Texas, USA":
	 * - Tries to find "Hunt County, Texas, USA" first
	 * - Then "Hunt County, Texas"
	 * - Then "Hunt County"
	 * - Returns the first match found
	 */
	private findParentPlace(placeName: string): ParentPlaceInfo | null {
		if (!this.placeGraph) return null;

		// Split the place name into components
		const parts = placeName.split(',').map(p => p.trim()).filter(p => p !== '');

		// Need at least 2 parts to have a parent (place + parent)
		if (parts.length < 2) return null;

		// Try progressively shorter parent names
		// For "Union Valley, Hunt County, Texas, USA":
		// - Try "Hunt County, Texas, USA"
		// - Try "Hunt County, Texas"
		// - Try "Hunt County"
		for (let i = 1; i < parts.length; i++) {
			const parentName = parts.slice(i).join(', ');
			const place = this.placeGraph.getPlaceByName(parentName);

			if (place) {
				return {
					name: place.name,
					crId: place.id
				};
			}
		}

		return null;
	}

	/**
	 * Update person frontmatter to convert place strings to wikilinks
	 */
	private async updatePersonFrontmatter(file: TFile, refs: PlaceReference[]): Promise<void> {
		// Map reference types to frontmatter fields
		const fieldMap: Record<string, string> = {
			birth: 'birth_place',
			death: 'death_place',
			burial: 'burial_place',
			marriage: 'spouse_marriage_location' // Will handle spouse indexes
		};

		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			for (const ref of refs) {
				const placeName = ref.rawValue;
				const wikilink = `[[${placeName}]]`;

				if (ref.referenceType === 'marriage') {
					// Handle spouse marriage locations (spouse1_marriage_location, spouse2_marriage_location, etc.)
					let spouseIndex = 1;
					while (frontmatter[`spouse${spouseIndex}`] || frontmatter[`spouse${spouseIndex}_id`]) {
						const field = `spouse${spouseIndex}_marriage_location`;
						if (frontmatter[field] === placeName) {
							frontmatter[field] = wikilink;
						}
						spouseIndex++;
					}
				} else {
					const field = fieldMap[ref.referenceType];
					if (field && frontmatter[field] === placeName) {
						frontmatter[field] = wikilink;
					}
				}
			}
		});
	}
}
