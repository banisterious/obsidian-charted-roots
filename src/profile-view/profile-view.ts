/**
 * Entity Profile View
 *
 * A dockable ItemView that auto-syncs to the active note, displaying
 * entity-specific sections with collapsible headers, breadcrumb navigation,
 * and pin/unpin support. Supports all five entity types: person, place,
 * event, source, and organization.
 */

import { ItemView, Platform, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import type {
	ProfileEntityData,
	ProfileEntityType,
	ProfileViewState,
	BreadcrumbEntry,
	SectionState,
	SectionToggleFn,
	EntityLinkClickFn,
	InlineEditSaveFn,
	InlineEditNotifyFn
} from './profile-types';
import { ProfileDataLoader } from './profile-data-loader';
import { renderIdentityHeader } from './sections/identity-section';
import { renderRelationshipsSection } from './sections/relationships-section';
import { renderEventsSection } from './sections/events-section';
import { renderSourcesSection } from './sections/sources-section';
import { renderMediaSection } from './sections/media-section';
import { renderDataQualitySection } from './sections/data-quality-section';
import { renderMapPreviewSection } from './sections/map-preview-section';
import { renderParticipantsSection } from './sections/participants-section';
import { renderReferencedFactsSection } from './sections/referenced-facts-section';
import { renderMembersSection } from './sections/members-section';
import { renderProfileSection } from './sections/section-base';
import { detectNoteType, isPersonNote } from '../utils/note-type-detection';
import type { NoteType } from '../utils/note-type-detection';
import { PropertyAliasService } from '../core/property-alias-service';
import { requoteWikilinksInFrontmatter } from '../core/place-note-writer';

export const VIEW_TYPE_ENTITY_PROFILE = 'charted-roots-entity-profile';

/** Entity types the profile view can display */
const PROFILE_ENTITY_TYPES: NoteType[] = ['person', 'place', 'event', 'source', 'organization'];

export class ProfileView extends ItemView {
	plugin: CanvasRootsPlugin;
	private dataLoader: ProfileDataLoader;

	// Current state
	private pinned = false;
	private currentEntityCrId: string | null = null;
	private currentEntityFilePath: string | null = null;
	private currentEntityData: ProfileEntityData | null = null;
	private staleIndicator = false;
	private sectionStates: SectionState = {};
	private breadcrumbs: BreadcrumbEntry[] = [];

	// Inline edit state
	private selfModified = false;

	// Debounce timers
	private syncDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	// DOM references
	private headerEl: HTMLElement | null = null;
	private breadcrumbEl: HTMLElement | null = null;
	private sectionsEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasRootsPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.dataLoader = new ProfileDataLoader(plugin);
	}

	getViewType(): string {
		return VIEW_TYPE_ENTITY_PROFILE;
	}

	getDisplayText(): string {
		if (this.currentEntityData) {
			return `Profile: ${this.currentEntityData.name}`;
		}
		return 'Entity profile';
	}

	getIcon(): string {
		return 'id-card';
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- ItemView.onOpen requires async signature
	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass('cr-profile');
		if (Platform.isMobile) {
			container.addClass('cr-profile--mobile');
		}

		// Create structural elements
		this.headerEl = container.createDiv({ cls: 'cr-profile__header' });
		this.breadcrumbEl = container.createDiv({ cls: 'cr-profile__breadcrumb' });
		this.sectionsEl = container.createDiv({ cls: 'cr-profile__sections' });

		// Show empty state initially
		this.renderEmptyState();

		// Register auto-sync listener
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				if (this.pinned) return;
				this.scheduleSyncToActiveNote();
			})
		);

		// Register vault change listener for current entity
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.path === this.currentEntityFilePath) {
					this.dataLoader.invalidate(this.currentEntityCrId || '');
					if (this.selfModified) {
						// Skip re-render — DOM was updated optimistically by inline edit
						this.selfModified = false;
						return;
					}
					this.scheduleRefresh();
				}
			})
		);

		// Do initial sync
		this.scheduleSyncToActiveNote();
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- ItemView.onClose requires async signature
	async onClose(): Promise<void> {
		if (this.syncDebounceTimeout) clearTimeout(this.syncDebounceTimeout);
		if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
	}

	// ── State persistence ───────────────────────────────────

	getState(): ProfileViewState {
		return {
			pinned: this.pinned,
			pinnedEntityCrId: this.pinned ? (this.currentEntityCrId ?? undefined) : undefined,
			pinnedEntityFilePath: this.pinned ? (this.currentEntityFilePath ?? undefined) : undefined,
			sectionStates: { ...this.sectionStates },
			breadcrumbs: [...this.breadcrumbs]
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- ItemView.setState requires async signature
	async setState(state: Partial<ProfileViewState>): Promise<void> {
		if (state.pinned !== undefined) this.pinned = state.pinned;
		if (state.sectionStates) this.sectionStates = { ...state.sectionStates };
		if (state.breadcrumbs) this.breadcrumbs = [...state.breadcrumbs];

		// Restore pinned entity
		if (this.pinned && state.pinnedEntityFilePath) {
			const file = this.app.vault.getFileByPath(state.pinnedEntityFilePath);
			if (file) {
				const entityType = this.detectEntityType(file);
				if (entityType) {
					void this.loadAndRenderEntity(file, entityType);
					return;
				}
			}
		}

		// If not pinned, sync to active note
		this.syncToActiveNote();
	}

	// ── Public API ──────────────────────────────────────────

	/** Whether this view is pinned to a specific entity */
	isPinned(): boolean {
		return this.pinned;
	}

	/** Navigate the profile view to a specific file */
	navigateToFile(file: TFile): void {
		const entityType = this.detectEntityType(file);
		if (entityType) {
			this.breadcrumbs = [];
			void this.loadAndRenderEntity(file, entityType);
		}
	}

	// ── Auto-sync ───────────────────────────────────────────

	private scheduleSyncToActiveNote(): void {
		if (this.syncDebounceTimeout) {
			clearTimeout(this.syncDebounceTimeout);
		}
		this.syncDebounceTimeout = setTimeout(() => {
			this.syncDebounceTimeout = null;
			this.syncToActiveNote();
		}, 150);
	}

	private syncToActiveNote(): void {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;

		const entityType = this.detectEntityType(file);
		if (!entityType) {
			// Non-entity note: freeze on last entity
			if (this.currentEntityData) {
				this.staleIndicator = true;
				this.updateStaleIndicator();
			}
			return;
		}

		// Get crId from frontmatter
		const cache = this.app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id as string | undefined;
		if (!crId) return;

		// Same-entity guard
		if (crId === this.currentEntityCrId) {
			if (this.staleIndicator) {
				this.staleIndicator = false;
				this.updateStaleIndicator();
			}
			return;
		}

		// New entity — reset breadcrumbs and load
		this.breadcrumbs = [];
		this.staleIndicator = false;
		void this.loadAndRenderEntity(file, entityType);
	}

	private scheduleRefresh(): void {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refreshTimeout = null;
			if (this.currentEntityFilePath) {
				const file = this.app.vault.getFileByPath(this.currentEntityFilePath);
				if (file) {
					const entityType = this.detectEntityType(file);
					if (entityType) {
						void this.loadAndRenderEntity(file, entityType);
					}
				}
			}
		}, 2000);
	}

	// ── Entity detection ────────────────────────────────────

	private detectEntityType(file: TFile): ProfileEntityType | null {
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm) return null;

		let noteType = detectNoteType(fm, cache, this.plugin.settings);

		// Fallback: person notes may not have explicit type
		if (!noteType && isPersonNote(fm, cache, this.plugin.settings)) {
			noteType = 'person';
		}

		if (!noteType || !PROFILE_ENTITY_TYPES.includes(noteType)) {
			return null;
		}

		return noteType as ProfileEntityType;
	}

	// ── Load and render ─────────────────────────────────────

	private async loadAndRenderEntity(file: TFile, entityType: ProfileEntityType): Promise<void> {
		const cache = this.app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id as string | undefined;
		if (!crId) return;

		const name = (cache?.frontmatter?.name as string) || file.basename;

		// Update current entity tracking
		this.currentEntityCrId = crId;
		this.currentEntityFilePath = file.path;

		// Add to breadcrumbs if navigating via link click
		if (this.breadcrumbs.length === 0) {
			this.breadcrumbs.push({ crId, name, entityType, filePath: file.path });
		}

		// Update display text
		this.leaf.updateHeader();

		// Load data
		const data = await this.dataLoader.loadEntity(file, entityType);
		if (!data) {
			this.renderErrorState('Could not load entity data.');
			return;
		}

		this.currentEntityData = data;
		this.staleIndicator = false;

		// Render
		this.renderEntity(data);
	}

	// ── Rendering ───────────────────────────────────────────

	private renderEntity(data: ProfileEntityData): void {
		if (!this.headerEl || !this.breadcrumbEl || !this.sectionsEl) return;

		// Clear previous content
		this.headerEl.empty();
		this.breadcrumbEl.empty();
		this.sectionsEl.empty();

		// Inline edit callbacks
		const onFieldSave: InlineEditSaveFn = async (property, newValue) => {
			const file = this.currentEntityData?.file;
			if (!file) return;

			const aliasService = new PropertyAliasService(this.plugin);
			const writeProperty = aliasService.getWriteProperty(property);

			await this.app.fileManager.processFrontMatter(file, (fm) => {
				if (newValue === '') {
					delete fm[writeProperty];
				} else if (['coordinates_lat', 'coordinates_long'].includes(property)) {
					const num = parseFloat(newValue);
					if (!isNaN(num)) fm[writeProperty] = num;
				} else {
					fm[writeProperty] = newValue;
				}
			});

			// Re-quote wikilinks if needed (Obsidian YAML serializer strips quotes)
			const wikilinkFields = ['birth_place', 'death_place', 'place', 'repository', 'seat', 'parent_place'];
			if (wikilinkFields.includes(property)) {
				await requoteWikilinksInFrontmatter(this.app, file);
			}

			this.dataLoader.invalidate(this.currentEntityCrId || '');
		};

		const onEditNotify: InlineEditNotifyFn = () => {
			this.selfModified = true;
		};

		// Identity header
		renderIdentityHeader(this.headerEl, data, {
			pinned: this.pinned,
			stale: this.staleIndicator,
			onTogglePin: () => this.togglePin(),
			onOpenNote: (file) => {
				void this.app.workspace.openLinkText(file.basename, file.path);
			},
			app: this.app,
			mediaService: this.plugin.getMediaService(),
			onFieldSave,
			onEditNotify
		});

		// Breadcrumbs
		this.renderBreadcrumbs();

		// Section toggle callback
		const onToggle: SectionToggleFn = (sectionId, expanded) => {
			this.sectionStates[sectionId] = expanded;
		};

		// Entity link click callback
		const onEntityLinkClick: EntityLinkClickFn = (crId, name, entityType, filePath) => {
			if (crId !== this.currentEntityCrId) {
				this.breadcrumbs.push({ crId, name, entityType, filePath });
				const file = this.app.vault.getFileByPath(filePath);
				if (file) {
					void this.loadAndRenderEntity(file, entityType);
				}
			}
		};

		const sectionOptions = {
			sectionStates: this.sectionStates,
			onToggle,
			onEntityLinkClick,
			app: this.app,
			plugin: this.plugin,
			isMobile: Platform.isMobile
		};

		// Render entity-type-specific sections
		switch (data.entityType) {
			case 'person':
				this.renderPersonSections(data, sectionOptions);
				break;
			case 'place':
				this.renderPlaceSections(data, sectionOptions);
				break;
			case 'event':
				this.renderEventSections(data, sectionOptions);
				break;
			case 'source':
				this.renderSourceSections(data, sectionOptions);
				break;
			case 'organization':
				this.renderOrganizationSections(data, sectionOptions);
				break;
		}
	}

	private renderPersonSections(
		data: ProfileEntityData & { entityType: 'person' },
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;

		const familyCount = this.countFamilyMembers(data);
		const otherCount = [...data.relationships, ...data.inverseRelationships]
			.filter(rel => (rel.type?.category || 'other') !== 'family').length;

		renderRelationshipsSection(this.sectionsEl, data, {
			...options,
			familyCount,
			otherCount
		});

		renderEventsSection(this.sectionsEl, data.events, {
			...options,
			sectionId: 'events',
			personFile: data.file,
			personName: data.name
		});

		renderSourcesSection(this.sectionsEl, data.sources, {
			...options,
			sectionId: 'sources'
		});

		renderMediaSection(this.sectionsEl, data.media, {
			...options,
			sectionId: 'media'
		});

		renderDataQualitySection(this.sectionsEl, data, options);
	}

	private renderPlaceSections(
		data: ProfileEntityData & { entityType: 'place' },
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;

		renderEventsSection(this.sectionsEl, data.events, {
			...options,
			sectionId: 'events-at-location',
			title: 'Events at location'
		});

		renderSourcesSection(this.sectionsEl, data.sources, {
			...options,
			sectionId: 'sources'
		});

		renderMediaSection(this.sectionsEl, data.media, {
			...options,
			sectionId: 'media'
		});

		renderMapPreviewSection(this.sectionsEl, data.node, options);

		if (data.needsResearch.length > 0) {
			this.renderResearchQuestions(data.needsResearch, options);
		}
	}

	private renderEventSections(
		data: ProfileEntityData & { entityType: 'event' },
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;

		renderParticipantsSection(this.sectionsEl, data.event, options);

		if (data.event.sources && data.event.sources.length > 0) {
			renderSourcesSection(this.sectionsEl, data.event.sources, {
				...options,
				sectionId: 'sources'
			});
		}

		renderMediaSection(this.sectionsEl, data.media, {
			...options,
			sectionId: 'media'
		});

		if (data.event.place) {
			this.renderPlaceLink(data.event.place, options);
		}

		if (data.needsResearch.length > 0) {
			this.renderResearchQuestions(data.needsResearch, options);
		}
	}

	private renderSourceSections(
		data: ProfileEntityData & { entityType: 'source' },
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;

		renderReferencedFactsSection(this.sectionsEl, data.referencedFacts, options);

		renderMediaSection(this.sectionsEl, data.media, {
			...options,
			sectionId: 'media'
		});
	}

	private renderOrganizationSections(
		data: ProfileEntityData & { entityType: 'organization' },
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;

		renderMembersSection(this.sectionsEl, data.members, options);

		renderEventsSection(this.sectionsEl, data.events, {
			...options,
			sectionId: 'events',
			title: 'Events'
		});

		renderSourcesSection(this.sectionsEl, data.sources, {
			...options,
			sectionId: 'sources'
		});

		renderMediaSection(this.sectionsEl, data.media, {
			...options,
			sectionId: 'media'
		});
	}

	// ── Inline helper sections ──────────────────────────────

	private renderPlaceLink(
		placeLink: string,
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;
		const content = renderProfileSection(this.sectionsEl, {
			sectionId: 'place-link',
			title: 'Place',
			summary: this.stripWikilink(placeLink),
			expanded: this.sectionStates['place-link'] ?? true,
			onToggle: options.onToggle,
			icon: 'map-pin'
		});
		if (!content) return;

		const link = content.createSpan({
			text: this.stripWikilink(placeLink),
			cls: 'cr-profile__entity-link'
		});
		link.addEventListener('click', () => {
			this.navigateToWikilink(placeLink, 'place', options.onEntityLinkClick);
		});
	}

	private renderResearchQuestions(
		questions: string[],
		options: SectionRenderOptions
	): void {
		if (!this.sectionsEl) return;
		const content = renderProfileSection(this.sectionsEl, {
			sectionId: 'research-questions',
			title: 'Research questions',
			summary: `${questions.length} open question${questions.length !== 1 ? 's' : ''}`,
			expanded: this.sectionStates['research-questions'] ?? false,
			onToggle: options.onToggle,
			icon: 'help-circle'
		});
		if (!content) return;

		const list = content.createEl('ul', { cls: 'cr-profile__research-list' });
		for (const q of questions) {
			list.createEl('li', { text: q });
		}
	}

	// ── Breadcrumbs ─────────────────────────────────────────

	private renderBreadcrumbs(): void {
		if (!this.breadcrumbEl) return;
		this.breadcrumbEl.empty();

		if (this.breadcrumbs.length <= 1) {
			this.breadcrumbEl.style.display = 'none';
			return;
		}

		this.breadcrumbEl.style.display = 'flex';

		this.breadcrumbs.forEach((entry, i) => {
			if (i > 0) {
				this.breadcrumbEl!.createSpan({
					text: ' › ',
					cls: 'cr-profile__breadcrumb-separator'
				});
			}

			const isLast = i === this.breadcrumbs.length - 1;
			const crumb = this.breadcrumbEl!.createSpan({
				text: entry.name,
				cls: isLast ? 'cr-profile__breadcrumb-current' : 'cr-profile__breadcrumb-link'
			});

			if (!isLast) {
				crumb.addEventListener('click', () => {
					this.breadcrumbs = this.breadcrumbs.slice(0, i + 1);
					const file = this.app.vault.getFileByPath(entry.filePath);
					if (file) {
						void this.loadAndRenderEntity(file, entry.entityType);
					}
				});
			}
		});
	}

	// ── Pin / unpin ─────────────────────────────────────────

	private togglePin(): void {
		this.pinned = !this.pinned;
		this.updatePinIndicator();

		if (!this.pinned) {
			// Unpinned — sync to active note
			this.scheduleSyncToActiveNote();
		}
	}

	private updatePinIndicator(): void {
		const pinBtn = this.headerEl?.querySelector('.cr-profile__pin-toggle');
		if (pinBtn) {
			pinBtn.empty();
			setIcon(pinBtn as HTMLElement, this.pinned ? 'pin-off' : 'pin');
			pinBtn.setAttribute('aria-label', this.pinned ? 'Unpin profile' : 'Pin profile');
		}
	}

	private updateStaleIndicator(): void {
		const indicator = this.headerEl?.querySelector('.cr-profile__stale-badge');
		if (indicator) {
			(indicator as HTMLElement).style.display = this.staleIndicator ? 'inline-flex' : 'none';
		}
	}

	// ── Empty / error states ────────────────────────────────

	private renderEmptyState(): void {
		if (!this.headerEl || !this.sectionsEl) return;
		this.headerEl.empty();
		this.breadcrumbEl?.empty();
		this.sectionsEl.empty();

		const empty = this.sectionsEl.createDiv({ cls: 'cr-profile__empty-state' });
		const iconEl = empty.createDiv();
		setIcon(iconEl, 'id-card');
		empty.createEl('p', { text: 'Open an entity note to see its profile' });
		empty.createEl('p', {
			text: 'Navigate to a person, place, event, source, or organization note.',
			cls: 'cr-profile__empty-hint'
		});
	}

	private renderErrorState(message: string): void {
		if (!this.sectionsEl) return;
		this.sectionsEl.empty();
		const error = this.sectionsEl.createDiv({ cls: 'cr-profile__error-state' });
		setIcon(error, 'alert-circle');
		error.createEl('p', { text: message });
	}

	// ── Utility ─────────────────────────────────────────────

	private countFamilyMembers(data: ProfileEntityData & { entityType: 'person' }): number {
		const node = data.node;
		let count = 0;
		if (node.fatherCrId) count++;
		if (node.motherCrId) count++;
		count += (node.stepfatherCrIds?.length ?? 0);
		count += (node.stepmotherCrIds?.length ?? 0);
		if (node.adoptiveFatherCrId) count++;
		if (node.adoptiveMotherCrId) count++;
		count += (node.adoptiveParentCrIds?.length ?? 0);
		count += (node.parentCrIds?.length ?? 0);
		count += (node.spouseCrIds?.length ?? 0);
		count += (node.childrenCrIds?.length ?? 0);
		count += (node.adoptedChildCrIds?.length ?? 0);
		return count;
	}

	private stripWikilink(link: string): string {
		return link.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
	}

	private navigateToWikilink(
		wikilink: string,
		expectedType: ProfileEntityType,
		onEntityLinkClick: EntityLinkClickFn
	): void {
		const name = this.stripWikilink(wikilink);
		const file = this.app.metadataCache.getFirstLinkpathDest(name, '');
		if (!file) return;
		const cache = this.app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id as string | undefined;
		if (!crId) return;
		const detectedType = this.detectEntityType(file);
		onEntityLinkClick(crId, name, detectedType || expectedType, file.path);
	}
}

/** Options passed to section rendering functions */
export interface SectionRenderOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	onEntityLinkClick: EntityLinkClickFn;
	app: import('obsidian').App;
	plugin: CanvasRootsPlugin;
	isMobile: boolean;
}
