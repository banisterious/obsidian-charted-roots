/**
 * Entity Picker Modal
 *
 * Allows users to select entities to link media files to.
 * Used in the media-first workflow (Link Media tile).
 *
 * Workflow:
 * 1. Modal opens with preselected media files
 * 2. Select entity type (Person, Event, Place, Organization, Source)
 * 3. View all entities of that type
 * 4. Select entities to link the media to
 * 5. Execute linking
 */

import { App, Modal, TFile, setIcon, Notice, Setting } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { MediaService, type MediaEntityType } from '../media-service';
import { BulkMediaLinkProgressModal } from './bulk-media-link-progress-modal';
import { FamilyGraphService, type PersonNode } from '../family-graph';
import { PlaceGraphService } from '../place-graph';
import { FolderFilterService } from '../folder-filter';
import { EventService } from '../../events/services/event-service';
import type { EventNote } from '../../events/types/event-types';
import { OrganizationService } from '../../organizations/services/organization-service';
import { getOrganizationType } from '../../organizations/constants/organization-types';
import { SourceService } from '../../sources/services/source-service';

/**
 * Entity item for display in the modal
 */
interface EntityItem {
	/** Unique identifier */
	crId: string;
	/** Display name */
	name: string;
	/** Entity file */
	file: TFile;
	/** Whether this entity is selected for linking */
	isSelected: boolean;
	/** Secondary info (type, date, etc.) */
	subtitle?: string;
	/** Whether this entity already has the media files linked */
	hasMedia?: boolean;
}

/**
 * Entity type configuration
 */
interface EntityTypeConfig {
	value: MediaEntityType;
	label: string;
	icon: string;
}

const ENTITY_TYPES: EntityTypeConfig[] = [
	{ value: 'person', label: 'People', icon: 'user' },
	{ value: 'event', label: 'Events', icon: 'calendar' },
	{ value: 'place', label: 'Places', icon: 'map-pin' },
	{ value: 'organization', label: 'Organizations', icon: 'building' },
	{ value: 'source', label: 'Sources', icon: 'book-open' }
];

/**
 * Entity Picker Modal
 */
export class EntityPickerModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private mediaService: MediaService;
	private preselectedFiles: TFile[];

	// Current state
	private selectedEntityType: MediaEntityType = 'person';
	private entities: EntityItem[] = [];
	private selectedEntities: Set<string> = new Set();
	private searchQuery: string = '';

	// UI elements
	private entityTypeSelect!: HTMLSelectElement;
	private searchInput!: HTMLInputElement;
	private entityListContainer!: HTMLElement;
	private selectionCountEl!: HTMLElement;
	private linkButton!: HTMLButtonElement;

	constructor(app: App, plugin: CanvasRootsPlugin, preselectedFiles: TFile[]) {
		super(app);
		this.plugin = plugin;
		this.mediaService = new MediaService(app, plugin.settings);
		this.preselectedFiles = preselectedFiles;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-entity-picker-modal');

		this.createModalContent();
		this.loadEntities();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Create the modal content
	 */
	private createModalContent(): void {
		const { contentEl } = this;

		// Header
		const header = contentEl.createDiv({ cls: 'crc-picker-header' });
		const titleSection = header.createDiv({ cls: 'crc-picker-title' });
		const icon = titleSection.createSpan();
		setIcon(icon, 'link');
		titleSection.appendText('Link media to entities');

		const fileCount = this.preselectedFiles.length;
		const subtitleText = `Select entities to link ${fileCount} media file${fileCount > 1 ? 's' : ''} to`;
		header.createDiv({
			cls: 'crc-picker-subtitle',
			text: subtitleText
		});

		// Entity type selector
		const selectorSection = contentEl.createDiv({ cls: 'crc-entity-picker-selector' });

		new Setting(selectorSection)
			.setName('Entity type')
			.setDesc('Select the type of entities to link media to')
			.addDropdown(dropdown => {
				this.entityTypeSelect = dropdown.selectEl;
				ENTITY_TYPES.forEach(type => {
					dropdown.addOption(type.value, type.label);
				});
				dropdown.setValue(this.selectedEntityType);
				dropdown.onChange(value => {
					this.selectedEntityType = value as MediaEntityType;
					this.selectedEntities.clear();
					this.loadEntities();
				});
			});

		// Search
		const searchSection = contentEl.createDiv({ cls: 'crc-entity-picker-search' });
		this.searchInput = searchSection.createEl('input', {
			type: 'text',
			placeholder: 'Search entities...',
			cls: 'crc-picker-search-input'
		});
		this.searchInput.addEventListener('input', () => {
			this.searchQuery = this.searchInput.value.toLowerCase();
			this.renderEntityList();
		});

		// Instructions
		const instructions = contentEl.createDiv({ cls: 'crc-info-callout crc-mb-3' });
		instructions.createEl('p', {
			text: 'Select one or more entities to link your media files to. Entities that already have these files linked are marked.',
			cls: 'crc-text--small'
		});

		// Select all / Deselect all buttons
		const bulkActions = contentEl.createDiv({ cls: 'crc-entity-picker-actions' });

		const selectAllBtn = bulkActions.createEl('button', {
			cls: 'crc-btn crc-btn--small',
			text: 'Select all'
		});
		selectAllBtn.addEventListener('click', () => this.selectAll());

		const deselectAllBtn = bulkActions.createEl('button', {
			cls: 'crc-btn crc-btn--small',
			text: 'Deselect all'
		});
		deselectAllBtn.addEventListener('click', () => this.deselectAll());

		// Entity list container
		this.entityListContainer = contentEl.createDiv({ cls: 'crc-entity-picker-list' });

		// Footer with selection count and action buttons
		const footer = contentEl.createDiv({ cls: 'crc-picker-footer crc-picker-footer--spaced' });

		this.selectionCountEl = footer.createDiv({ cls: 'crc-picker-selection-count' });

		const footerButtons = footer.createDiv({ cls: 'crc-picker-footer__buttons' });

		const cancelBtn = footerButtons.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		this.linkButton = footerButtons.createEl('button', {
			cls: 'mod-cta',
			text: 'Link to selected entities'
		});
		this.linkButton.disabled = true;
		this.linkButton.addEventListener('click', () => this.linkMediaToEntities());

		this.updateSelectionCount();
	}

	/**
	 * Load entities for the selected type
	 */
	private loadEntities(): void {
		this.entities = [];

		switch (this.selectedEntityType) {
			case 'person':
				this.loadPeople();
				break;
			case 'event':
				this.loadEvents();
				break;
			case 'place':
				this.loadPlaces();
				break;
			case 'organization':
				this.loadOrganizations();
				break;
			case 'source':
				this.loadSources();
				break;
		}

		this.renderEntityList();
		this.updateSelectionCount();
	}

	/**
	 * Load all people
	 */
	private loadPeople(): void {
		const folderFilter = new FolderFilterService(this.plugin.settings);
		const familyGraph = new FamilyGraphService(this.app);
		familyGraph.setFolderFilter(folderFilter);
		familyGraph.setPropertyAliases(this.plugin.settings.propertyAliases);
		familyGraph.setValueAliases(this.plugin.settings.valueAliases);
		familyGraph.ensureCacheLoaded();

		const people = familyGraph.getAllPeople();

		this.entities = people.map(p => ({
			crId: p.crId,
			name: p.name,
			file: p.file,
			isSelected: false,
			subtitle: this.formatPersonSubtitle(p),
			hasMedia: this.hasAnyPreselectedMedia(p.media || [])
		}));
	}

	/**
	 * Load all events
	 */
	private loadEvents(): void {
		const eventService = new EventService(this.app, this.plugin.settings);

		const events = eventService.getAllEvents();

		this.entities = events.map(e => ({
			crId: e.crId,
			name: e.title,
			file: e.file,
			isSelected: false,
			subtitle: this.formatEventSubtitle(e),
			hasMedia: this.hasAnyPreselectedMedia(e.media || [])
		}));
	}

	/**
	 * Load all places
	 */
	private loadPlaces(): void {
		const folderFilter = new FolderFilterService(this.plugin.settings);
		const placeGraph = new PlaceGraphService(this.app);
		placeGraph.setSettings(this.plugin.settings);
		placeGraph.setFolderFilter(folderFilter);

		const places = placeGraph.getAllPlaces();

		this.entities = places
			.map(p => {
				const file = this.app.vault.getAbstractFileByPath(p.filePath);
				if (!(file instanceof TFile)) return null;
				const entity: EntityItem = {
					crId: p.id,
					name: p.name,
					file,
					isSelected: false,
					subtitle: p.placeType || p.category,
					hasMedia: this.hasAnyPreselectedMedia(p.media || [])
				};
				return entity;
			})
			.filter((e): e is EntityItem => e !== null);
	}

	/**
	 * Load all organizations
	 */
	private loadOrganizations(): void {
		const orgService = new OrganizationService(this.plugin);

		const orgs = orgService.getAllOrganizations();

		this.entities = orgs.map(o => {
			const typeDef = getOrganizationType(o.orgType);
			return {
				crId: o.crId,
				name: o.name,
				file: o.file,
				isSelected: false,
				subtitle: typeDef?.name || o.orgType || 'Organization',
				hasMedia: this.hasAnyPreselectedMedia(o.media || [])
			};
		});
	}

	/**
	 * Load all sources
	 */
	private loadSources(): void {
		const sourceService = new SourceService(this.app, this.plugin.settings);

		const sources = sourceService.getAllSources();

		this.entities = sources
			.map(s => {
				const file = this.app.vault.getAbstractFileByPath(s.filePath);
				if (!(file instanceof TFile)) return null;
				const entity: EntityItem = {
					crId: s.crId,
					name: s.title,
					file,
					isSelected: false,
					subtitle: s.sourceType || 'Source',
					hasMedia: this.hasAnyPreselectedMedia(s.media || [])
				};
				return entity;
			})
			.filter((e): e is EntityItem => e !== null);
	}

	/**
	 * Check if entity already has any of the preselected media
	 */
	private hasAnyPreselectedMedia(mediaRefs: string[]): boolean {
		const preselectedPaths = this.preselectedFiles.map(f => f.path);
		for (const ref of mediaRefs) {
			const item = this.mediaService.resolveMediaItem(ref);
			if (item.file && preselectedPaths.includes(item.file.path)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Format person subtitle (dates, etc.)
	 */
	private formatPersonSubtitle(person: PersonNode): string {
		const parts: string[] = [];
		if (person.birthDate) parts.push(`b. ${person.birthDate}`);
		if (person.deathDate) parts.push(`d. ${person.deathDate}`);
		return parts.length > 0 ? parts.join(' · ') : '';
	}

	/**
	 * Format event subtitle (type, date)
	 */
	private formatEventSubtitle(event: EventNote): string {
		const parts: string[] = [];
		if (event.eventType) parts.push(event.eventType);
		if (event.date) parts.push(event.date);
		return parts.length > 0 ? parts.join(' · ') : '';
	}

	/**
	 * Render the entity list with search filtering
	 */
	private renderEntityList(): void {
		this.entityListContainer.empty();

		// Filter by search query
		let filteredEntities = this.entities;
		if (this.searchQuery) {
			filteredEntities = this.entities.filter(e =>
				e.name.toLowerCase().includes(this.searchQuery) ||
				(e.subtitle && e.subtitle.toLowerCase().includes(this.searchQuery))
			);
		}

		if (filteredEntities.length === 0) {
			this.renderEmptyState();
			return;
		}

		// Sort alphabetically by name
		const sortedEntities = [...filteredEntities].sort((a, b) =>
			a.name.localeCompare(b.name)
		);

		for (const entity of sortedEntities) {
			this.renderEntityRow(entity);
		}
	}

	/**
	 * Render empty state when no entities match search
	 */
	private renderEmptyState(): void {
		const emptyState = this.entityListContainer.createDiv({ cls: 'crc-picker-empty' });
		const emptyIcon = emptyState.createSpan();
		setIcon(emptyIcon, 'search');

		if (this.searchQuery) {
			emptyState.createEl('p', { text: 'No entities found' });
			emptyState.createEl('p', {
				text: `Try a different search term`,
				cls: 'crc-text-muted'
			});
		} else {
			const typeConfig = ENTITY_TYPES.find(t => t.value === this.selectedEntityType);
			const typeName = typeConfig?.label.toLowerCase() || 'entities';
			emptyState.createEl('p', { text: `No ${typeName} found` });
		}
	}

	/**
	 * Render a single entity row
	 */
	private renderEntityRow(entity: EntityItem): void {
		const row = this.entityListContainer.createDiv({
			cls: `crc-entity-picker-row ${entity.isSelected ? 'crc-entity-picker-row--selected' : ''}`
		});

		// Checkbox
		const checkbox = row.createEl('input', {
			type: 'checkbox',
			cls: 'crc-entity-picker-row__checkbox'
		});
		checkbox.checked = this.selectedEntities.has(entity.crId);

		checkbox.addEventListener('change', () => {
			this.toggleEntitySelection(entity, checkbox.checked);
			row.toggleClass('crc-entity-picker-row--selected', checkbox.checked);
		});

		// Icon
		const typeConfig = ENTITY_TYPES.find(t => t.value === this.selectedEntityType);
		const iconEl = row.createDiv({ cls: 'crc-entity-picker-row__icon' });
		setIcon(iconEl, typeConfig?.icon || 'file');

		// Info
		const info = row.createDiv({ cls: 'crc-entity-picker-row__info' });
		const nameContainer = info.createDiv({ cls: 'crc-entity-picker-row__name-container' });
		nameContainer.createSpan({ cls: 'crc-entity-picker-row__name', text: entity.name });

		// Show indicator if entity already has this media
		if (entity.hasMedia) {
			const badge = nameContainer.createSpan({ cls: 'crc-entity-picker-row__badge' });
			setIcon(badge, 'check');
			badge.title = 'Already has this media';
		}

		if (entity.subtitle) {
			info.createDiv({ cls: 'crc-entity-picker-row__subtitle', text: entity.subtitle });
		}

		// Make row clickable (excluding checkbox)
		row.addEventListener('click', (e) => {
			if (e.target !== checkbox) {
				checkbox.checked = !checkbox.checked;
				this.toggleEntitySelection(entity, checkbox.checked);
				row.toggleClass('crc-entity-picker-row--selected', checkbox.checked);
			}
		});
	}

	/**
	 * Toggle entity selection
	 */
	private toggleEntitySelection(entity: EntityItem, selected: boolean): void {
		if (selected) {
			this.selectedEntities.add(entity.crId);
		} else {
			this.selectedEntities.delete(entity.crId);
		}
		this.updateSelectionCount();
	}

	/**
	 * Select all visible entities
	 */
	private selectAll(): void {
		// Only select entities visible in current search
		let visibleEntities = this.entities;
		if (this.searchQuery) {
			visibleEntities = this.entities.filter(e =>
				e.name.toLowerCase().includes(this.searchQuery) ||
				(e.subtitle && e.subtitle.toLowerCase().includes(this.searchQuery))
			);
		}

		for (const entity of visibleEntities) {
			this.selectedEntities.add(entity.crId);
		}
		this.renderEntityList();
		this.updateSelectionCount();
	}

	/**
	 * Deselect all entities
	 */
	private deselectAll(): void {
		this.selectedEntities.clear();
		this.renderEntityList();
		this.updateSelectionCount();
	}

	/**
	 * Update selection count display
	 */
	private updateSelectionCount(): void {
		const count = this.selectedEntities.size;

		if (count === 0) {
			this.selectionCountEl.setText('No entities selected');
		} else if (count === 1) {
			this.selectionCountEl.setText('1 entity selected');
		} else {
			this.selectionCountEl.setText(`${count} entities selected`);
		}

		this.linkButton.disabled = count === 0;
	}

	/**
	 * Link media files to selected entities
	 */
	private async linkMediaToEntities(): Promise<void> {
		const selectedEntities = this.entities.filter(e => this.selectedEntities.has(e.crId));
		if (selectedEntities.length === 0) return;

		// For small operations (< 5 entities), skip the progress modal
		const showProgress = selectedEntities.length >= 5;

		let progressModal: BulkMediaLinkProgressModal | null = null;
		if (showProgress) {
			progressModal = new BulkMediaLinkProgressModal(this.app, this.preselectedFiles.length);
			progressModal.open();
		}

		let successCount = 0;
		let errorCount = 0;

		for (let i = 0; i < selectedEntities.length; i++) {
			const entity = selectedEntities[i];

			// Check for cancellation
			if (progressModal?.wasCancelled()) {
				break;
			}

			// Update progress
			if (progressModal) {
				progressModal.updateProgress({
					current: i + 1,
					total: selectedEntities.length,
					currentEntityName: entity.name
				});
			}

			try {
				for (const file of this.preselectedFiles) {
					const wikilink = this.mediaService.pathToWikilink(file.path);
					await this.mediaService.addMediaToEntity(entity.file, wikilink);
				}
				successCount++;
				progressModal?.recordSuccess();
			} catch (error) {
				console.error(`Failed to link media to ${entity.name}:`, error);
				errorCount++;
				progressModal?.recordError();
			}

			// Small delay to allow UI updates and prevent blocking
			if (showProgress && i % 10 === 0) {
				await new Promise(resolve => setTimeout(resolve, 0));
			}
		}

		// Mark complete and show results
		if (progressModal) {
			progressModal.markComplete();
		} else {
			// Show result notification for small operations
			const fileCount = this.preselectedFiles.length;
			if (errorCount === 0) {
				new Notice(`Linked ${fileCount} media file${fileCount > 1 ? 's' : ''} to ${successCount} ${successCount === 1 ? 'entity' : 'entities'}`);
			} else {
				new Notice(`Linked media to ${successCount} ${successCount === 1 ? 'entity' : 'entities'}, ${errorCount} failed`);
			}
		}

		this.close();
	}
}
