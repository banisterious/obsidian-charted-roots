/**
 * Modal for standardizing place types
 * Helps convert generic types like 'locality' to specific types (city, town, village)
 */

import { App, Modal, Notice, TFile } from 'obsidian';
import { createLucideIcon, setLucideIcon } from './lucide-icons';
import { PlaceGraphService } from '../core/place-graph';
import { PlaceNode, KnownPlaceType } from '../models/place';

/**
 * Place types that should be reviewed/standardized
 */
const NON_STANDARD_TYPES = ['locality', 'township', 'municipality', 'hamlet', 'settlement'];

/**
 * Standard place types to convert to
 */
const STANDARD_SETTLEMENT_TYPES: KnownPlaceType[] = ['city', 'town', 'village'];

interface StandardizePlaceTypesOptions {
	onComplete?: (updated: number) => void;
}

/**
 * Modal for reviewing and standardizing place types
 */
export class StandardizePlaceTypesModal extends Modal {
	private placeService: PlaceGraphService;
	private placesToReview: PlaceNode[];
	private selectedTypes: Map<string, string>; // place id -> new type
	private appliedPlaces: Set<string>; // place ids that have been updated
	private listContainer: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;
	private onComplete?: (updated: number) => void;
	private totalUpdated = 0;

	constructor(
		app: App,
		placeService: PlaceGraphService,
		options: StandardizePlaceTypesOptions = {}
	) {
		super(app);
		this.placeService = placeService;
		this.selectedTypes = new Map();
		this.appliedPlaces = new Set();
		this.onComplete = options.onComplete;

		// Find places with non-standard types
		this.placesToReview = this.findPlacesToReview();

		// Pre-select 'city' as the default for all
		for (const place of this.placesToReview) {
			this.selectedTypes.set(place.id, 'city');
		}
	}

	/**
	 * Find places with non-standard types that should be reviewed
	 */
	private findPlacesToReview(): PlaceNode[] {
		const allPlaces = this.placeService.getAllPlaces();
		return allPlaces.filter(place =>
			place.placeType &&
			NON_STANDARD_TYPES.includes(place.placeType.toLowerCase())
		);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('crc-standardize-types-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-modal-header' });
		const titleContainer = header.createDiv({ cls: 'crc-modal-title' });
		const icon = createLucideIcon('map-pin', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Standardize place types');

		// Description
		const descriptionEl = contentEl.createDiv({ cls: 'crc-standardize-description' });

		if (this.placesToReview.length === 0) {
			descriptionEl.createEl('p', {
				text: 'No places with non-standard types found. All place types are already standardized!',
				cls: 'crc-text--success'
			});

			const buttonContainer = contentEl.createDiv({ cls: 'crc-modal-buttons' });
			const closeBtn = buttonContainer.createEl('button', {
				text: 'Close',
				cls: 'crc-btn crc-btn--primary'
			});
			closeBtn.addEventListener('click', () => this.close());
			return;
		}

		descriptionEl.createEl('p', {
			text: `Found ${this.placesToReview.length} place${this.placesToReview.length !== 1 ? 's' : ''} with generic types like "locality" that could be standardized.`,
			cls: 'crc-text--muted'
		});

		const explanationEl = descriptionEl.createDiv({ cls: 'crc-standardize-explanation' });
		explanationEl.createEl('p', {
			text: 'Generic types like "locality" are often assigned during import when the specific type is unknown. Review each place and select the appropriate type:',
			cls: 'crc-text--muted'
		});
		const typesList = explanationEl.createEl('ul', { cls: 'crc-field-list' });
		typesList.createEl('li', { text: 'City — Large urban area, typically >10,000 population' });
		typesList.createEl('li', { text: 'Town — Medium settlement, typically 1,000–10,000 population' });
		typesList.createEl('li', { text: 'Village — Small rural settlement, typically <1,000 population' });

		// Bulk actions
		this.renderBulkActions(contentEl);

		// Status display
		this.statusEl = contentEl.createDiv({ cls: 'crc-standardize-status crc-text--muted crc-text-small crc-mb-2' });
		this.updateStatus();

		// Places list
		this.listContainer = contentEl.createDiv({ cls: 'crc-standardize-list' });
		this.renderPlacesList();

		// Footer buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-modal-buttons' });

		const applyAllBtn = buttonContainer.createEl('button', {
			text: 'Apply all',
			cls: 'crc-btn crc-btn--primary'
		});
		applyAllBtn.addEventListener('click', () => {
			void this.applyAll();
		});

		const closeBtn = buttonContainer.createEl('button', {
			text: 'Close',
			cls: 'crc-btn crc-btn--ghost'
		});
		closeBtn.addEventListener('click', () => this.close());
	}

	/**
	 * Render bulk action controls
	 */
	private renderBulkActions(container: HTMLElement) {
		const bulkActions = container.createDiv({ cls: 'crc-bulk-actions crc-mb-3' });

		bulkActions.createEl('span', {
			text: 'Set all to: ',
			cls: 'crc-text--muted'
		});

		for (const type of STANDARD_SETTLEMENT_TYPES) {
			const btn = bulkActions.createEl('button', {
				text: type.charAt(0).toUpperCase() + type.slice(1),
				cls: 'crc-btn crc-btn--small crc-btn--ghost crc-ml-1'
			});
			btn.addEventListener('click', () => this.setAllToType(type));
		}
	}

	/**
	 * Set all pending places to a specific type
	 */
	private setAllToType(type: string) {
		for (const place of this.placesToReview) {
			if (!this.appliedPlaces.has(place.id)) {
				this.selectedTypes.set(place.id, type);
			}
		}
		this.renderPlacesList();
	}

	/**
	 * Render the list of places to review
	 */
	private renderPlacesList() {
		if (!this.listContainer) return;
		this.listContainer.empty();

		const pendingPlaces = this.placesToReview.filter(p => !this.appliedPlaces.has(p.id));

		if (pendingPlaces.length === 0) {
			this.listContainer.createEl('p', {
				text: 'All places have been updated!',
				cls: 'crc-text--success crc-text-center'
			});
			return;
		}

		for (const place of pendingPlaces) {
			this.renderPlaceRow(place);
		}
	}

	/**
	 * Render a single place row
	 */
	private renderPlaceRow(place: PlaceNode) {
		if (!this.listContainer) return;

		const row = this.listContainer.createDiv({ cls: 'crc-standardize-row' });

		// Place info
		const infoContainer = row.createDiv({ cls: 'crc-standardize-info' });

		const nameContainer = infoContainer.createDiv({ cls: 'crc-standardize-name' });
		const mapIcon = nameContainer.createSpan({ cls: 'crc-standardize-icon' });
		setLucideIcon(mapIcon, 'map-pin', 14);
		nameContainer.createSpan({ text: place.name });

		// Current type badge
		nameContainer.createSpan({
			text: place.placeType || 'unknown',
			cls: 'crc-type-badge crc-type-badge--current'
		});

		// Parent info if available
		if (place.parentId) {
			const parent = this.placeService.getPlaceByCrId(place.parentId);
			if (parent) {
				infoContainer.createEl('span', {
					text: `in ${parent.name}`,
					cls: 'crc-text--muted crc-text-small crc-ml-2'
				});
			}
		}

		// Type selector
		const selectorContainer = row.createDiv({ cls: 'crc-standardize-selector' });

		const select = selectorContainer.createEl('select', {
			cls: 'crc-select'
		});

		for (const type of STANDARD_SETTLEMENT_TYPES) {
			const option = select.createEl('option', {
				text: type.charAt(0).toUpperCase() + type.slice(1),
				value: type
			});
			if (this.selectedTypes.get(place.id) === type) {
				option.selected = true;
			}
		}

		// Also add option to keep current type
		const keepOption = select.createEl('option', {
			text: `Keep as ${place.placeType}`,
			value: place.placeType || ''
		});
		if (this.selectedTypes.get(place.id) === place.placeType) {
			keepOption.selected = true;
		}

		select.addEventListener('change', () => {
			this.selectedTypes.set(place.id, select.value);
		});

		// Apply button for individual place
		const applyBtn = selectorContainer.createEl('button', {
			cls: 'crc-btn crc-btn--small crc-btn--primary crc-ml-2',
			attr: { 'aria-label': 'Apply' }
		});
		const checkIcon = createLucideIcon('check', 14);
		applyBtn.appendChild(checkIcon);
		applyBtn.addEventListener('click', () => {
			void this.applyToPlace(place);
		});
	}

	/**
	 * Apply type change to a single place
	 */
	private async applyToPlace(place: PlaceNode) {
		const newType = this.selectedTypes.get(place.id);
		if (!newType || newType === place.placeType) {
			// No change needed
			this.appliedPlaces.add(place.id);
			this.renderPlacesList();
			this.updateStatus();
			return;
		}

		try {
			const file = this.app.vault.getAbstractFileByPath(place.filePath);
			if (!(file instanceof TFile)) {
				new Notice(`Could not find file: ${place.filePath}`);
				return;
			}

			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter.place_type = newType;
			});

			this.appliedPlaces.add(place.id);
			this.totalUpdated++;
			this.renderPlacesList();
			this.updateStatus();

		} catch (error) {
			console.error('Failed to update place type:', error);
			new Notice(`Failed to update ${place.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Apply all pending type changes
	 */
	private async applyAll() {
		const pendingPlaces = this.placesToReview.filter(p => !this.appliedPlaces.has(p.id));

		if (pendingPlaces.length === 0) {
			new Notice('No places to update');
			return;
		}

		let updated = 0;
		let skipped = 0;
		let failed = 0;

		for (const place of pendingPlaces) {
			const newType = this.selectedTypes.get(place.id);

			// Skip if keeping current type
			if (!newType || newType === place.placeType) {
				this.appliedPlaces.add(place.id);
				skipped++;
				continue;
			}

			try {
				const file = this.app.vault.getAbstractFileByPath(place.filePath);
				if (!(file instanceof TFile)) {
					failed++;
					continue;
				}

				await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
					frontmatter.place_type = newType;
				});

				this.appliedPlaces.add(place.id);
				updated++;
				this.totalUpdated++;

			} catch (error) {
				console.error('Failed to update place type:', error);
				failed++;
			}
		}

		// Update UI
		this.renderPlacesList();
		this.updateStatus();

		// Show result
		let message = `Updated ${updated} place${updated !== 1 ? 's' : ''}`;
		if (skipped > 0) message += `, skipped ${skipped}`;
		if (failed > 0) message += `, ${failed} failed`;
		new Notice(message);
	}

	/**
	 * Update the status display
	 */
	private updateStatus() {
		if (!this.statusEl) return;

		const pending = this.placesToReview.length - this.appliedPlaces.size;
		const applied = this.appliedPlaces.size;

		this.statusEl.textContent = `${pending} pending, ${applied} applied (${this.totalUpdated} updated)`;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();

		if (this.onComplete && this.totalUpdated > 0) {
			this.onComplete(this.totalUpdated);
		}
	}
}

/**
 * Find places with non-standard types that should be reviewed
 */
export function findNonStandardTypePlaces(placeService: PlaceGraphService): PlaceNode[] {
	const allPlaces = placeService.getAllPlaces();
	return allPlaces.filter(place =>
		place.placeType &&
		NON_STANDARD_TYPES.includes(place.placeType.toLowerCase())
	);
}
