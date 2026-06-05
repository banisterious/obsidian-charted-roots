/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Manage Organization Members Modal
 *
 * Dedicated modal for viewing, adding, and editing organization members
 * with bulk add capability and inline editing.
 *
 * See docs/planning/organization-member-management.md for design details.
 */

import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { setButtonDestructive } from '../../ui/button-helpers';
import type { OrganizationInfo, PersonMembership, MembershipRecord } from '../types/organization-types';
import { MembershipService } from '../services/membership-service';
import { OrganizationService } from '../services/organization-service';
import { createLucideIcon } from '../../ui/lucide-icons';
import { pluralize } from '../../utils/format-utils';
import { getLogger } from '../../core/logging';

const logger = getLogger('ManageOrganizationMembersModal');

interface ManageMembersOptions {
	organization: OrganizationInfo;
	organizationService: OrganizationService;
	membershipService: MembershipService;
	onMembersChanged?: () => void;
}

/**
 * Modal for managing organization members
 */
export class ManageOrganizationMembersModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private organization: OrganizationInfo;
	private membershipService: MembershipService;
	private organizationService: OrganizationService;
	private members: PersonMembership[] = [];
	private membersListEl: HTMLElement | null = null;
	private onMembersChanged?: () => void;
	private editingMemberIndex: number | null = null;

	constructor(app: App, plugin: CanvasRootsPlugin, options: ManageMembersOptions) {
		super(app);
		this.plugin = plugin;
		this.organization = options.organization;
		this.onMembersChanged = options.onMembersChanged;

		// Get services from options
		this.organizationService = options.organizationService;
		this.membershipService = options.membershipService;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass('cr-manage-members-modal');

		this.loadMembers();
		this.render();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Load current members from the membership service
	 */
	private loadMembers(): void {
		this.members = this.membershipService.getOrganizationMembers(this.organization.crId);
		logger.debug('loadMembers', `Loaded ${this.members.length} members for ${this.organization.name}`);
	}

	/**
	 * Render the modal content
	 */
	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Header
		const header = contentEl.createDiv({ cls: 'cr-manage-members-header' });
		const titleRow = header.createDiv({ cls: 'cr-manage-members-title-row' });

		const icon = createLucideIcon('users', 24);
		titleRow.appendChild(icon);
		titleRow.createEl('h2', { text: `Manage members: ${this.organization.name}` });

		// Add members button
		const addBtn = contentEl.createEl('button', {
			cls: 'cr-btn cr-btn--primary cr-manage-members-add-btn'
		});
		const plusIcon = createLucideIcon('plus', 16);
		addBtn.appendChild(plusIcon);
		addBtn.appendText(' Add members');
		addBtn.addEventListener('click', () => this.openMultiSelectPicker());

		// Members list
		const membersSection = contentEl.createDiv({ cls: 'cr-manage-members-section' });
		membersSection.createEl('h3', {
			text: `Current members (${this.members.length})`,
			cls: 'cr-manage-members-section-title'
		});

		this.membersListEl = membersSection.createDiv({ cls: 'cr-manage-members-list' });
		this.renderMembersList();

		// Footer with Done button
		const footer = contentEl.createDiv({ cls: 'cr-manage-members-footer' });
		new Setting(footer)
			.addButton(btn => btn
				.setButtonText('Done')
				.setCta()
				.onClick(() => this.close()));
	}

	/**
	 * Render the list of current members
	 */
	private renderMembersList(): void {
		if (!this.membersListEl) return;
		this.membersListEl.empty();

		if (this.members.length === 0) {
			const emptyState = this.membersListEl.createDiv({ cls: 'cr-manage-members-empty' });
			const emptyIcon = createLucideIcon('user-plus', 48);
			emptyState.appendChild(emptyIcon);
			emptyState.createEl('p', { text: 'No members yet' });
			emptyState.createEl('p', {
				text: 'Click "Add members" to add people to this organization',
				cls: 'cr-text-muted'
			});
			return;
		}

		for (let i = 0; i < this.members.length; i++) {
			const member = this.members[i];
			this.renderMemberCard(member, i);
		}
	}

	/**
	 * Render a single member card
	 */
	private renderMemberCard(member: PersonMembership, index: number): void {
		if (!this.membersListEl) return;

		const card = this.membersListEl.createDiv({ cls: 'cr-manage-members-card' });

		// Check if this card is being edited
		if (this.editingMemberIndex === index) {
			this.renderEditForm(card, member, index);
			return;
		}

		// Member info section
		const infoSection = card.createDiv({ cls: 'cr-manage-members-card-info' });

		// Name row
		const nameRow = infoSection.createDiv({ cls: 'cr-manage-members-card-name' });
		nameRow.createSpan({ text: member.personName });

		// Details row
		const detailsRow = infoSection.createDiv({ cls: 'cr-manage-members-card-details' });

		const details: string[] = [];
		if (member.role) details.push(`Role: ${member.role}`);
		if (member.from) details.push(`Joined: ${member.from}`);
		if (member.to) details.push(`Left: ${member.to}`);
		if (member.isCurrent && !member.to) details.push('Active');

		if (details.length > 0) {
			detailsRow.createSpan({ text: details.join('  |  '), cls: 'cr-text-muted' });
		}

		// Actions section
		const actionsSection = card.createDiv({ cls: 'cr-manage-members-card-actions' });

		// Edit button
		const editBtn = actionsSection.createEl('button', {
			cls: 'cr-btn cr-btn--small cr-btn--ghost',
			attr: { 'aria-label': 'Edit membership' }
		});
		const editIcon = createLucideIcon('pencil', 14);
		editBtn.appendChild(editIcon);
		editBtn.addEventListener('click', () => {
			this.editingMemberIndex = index;
			this.renderMembersList();
		});

		// Remove button
		const removeBtn = actionsSection.createEl('button', {
			cls: 'cr-btn cr-btn--small cr-btn--ghost cr-btn--danger',
			attr: { 'aria-label': 'Remove member' }
		});
		const removeIcon = createLucideIcon('x', 14);
		removeBtn.appendChild(removeIcon);
		removeBtn.addEventListener('click', () => this.confirmRemoveMember(member));
	}

	/**
	 * Render inline edit form for a member
	 */
	private renderEditForm(container: HTMLElement, member: PersonMembership, _index: number): void {
		container.addClass('cr-manage-members-card--editing');

		// Name (read-only)
		const nameRow = container.createDiv({ cls: 'cr-manage-members-edit-name' });
		nameRow.createSpan({ text: member.personName, cls: 'cr-manage-members-edit-name-text' });

		// Form fields
		const form = container.createDiv({ cls: 'cr-manage-members-edit-form' });

		// Role field
		const roleRow = form.createDiv({ cls: 'cr-manage-members-edit-row' });
		roleRow.createEl('label', { text: 'Role' });
		const roleInput = roleRow.createEl('input', {
			cls: 'cr-form-input',
			attr: { type: 'text', placeholder: 'e.g., Lord, Squire, Maester' }
		});
		roleInput.value = member.role || '';

		// Show clickable role chips if the organization has defined roles
		const effectiveRoles = this.organizationService.getEffectiveRoles(this.organization);
		if (effectiveRoles.length > 0) {
			const rolesRow = form.createDiv({ cls: 'cr-manage-members-role-chips' });
			for (const role of effectiveRoles) {
				const chip = rolesRow.createEl('button', {
					cls: 'cr-btn cr-btn--ghost cr-btn--small cr-manage-members-role-chip',
					text: role
				});
				chip.addEventListener('click', (e) => {
					e.preventDefault();
					roleInput.value = role;
					roleInput.focus();
				});
			}
		}

		// Date joined field
		const fromRow = form.createDiv({ cls: 'cr-manage-members-edit-row' });
		fromRow.createEl('label', { text: 'Date joined' });
		const fromInput = fromRow.createEl('input', {
			cls: 'cr-form-input',
			attr: { type: 'text', placeholder: 'e.g., 283 AC' }
		});
		fromInput.value = member.from || '';

		// Date left field
		const toRow = form.createDiv({ cls: 'cr-manage-members-edit-row' });
		toRow.createEl('label', { text: 'Date left' });
		const toInput = toRow.createEl('input', {
			cls: 'cr-form-input',
			attr: { type: 'text', placeholder: 'Leave empty if still active' }
		});
		toInput.value = member.to || '';

		// Action buttons
		const actions = form.createDiv({ cls: 'cr-manage-members-edit-actions' });

		const saveBtn = actions.createEl('button', {
			cls: 'cr-btn cr-btn--primary cr-btn--small'
		});
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => {
			void (async () => {
				await this.saveMemberEdit(member, {
					role: roleInput.value.trim() || undefined,
					from: fromInput.value.trim() || undefined,
					to: toInput.value.trim() || undefined
				});
				this.editingMemberIndex = null;
				this.renderMembersList();
			})();
		});

		const cancelBtn = actions.createEl('button', {
			cls: 'cr-btn cr-btn--ghost cr-btn--small'
		});
		cancelBtn.textContent = 'Cancel';
		cancelBtn.addEventListener('click', () => {
			this.editingMemberIndex = null;
			this.renderMembersList();
		});
	}

	/**
	 * Save edits to a member's membership details
	 */
	private async saveMemberEdit(
		member: PersonMembership,
		updates: { role?: string; from?: string; to?: string }
	): Promise<void> {
		try {
			// We need to update the person's frontmatter
			// First remove the old membership, then add the updated one
			await this.membershipService.removeMembership(member.personFile, this.organization.crId);

			const newMembership: MembershipRecord = {
				org: `[[${this.organization.name}]]`,
				org_id: this.organization.crId,
				role: updates.role,
				from: updates.from,
				to: updates.to
			};

			await this.membershipService.addMembership(member.personFile, newMembership);

			// Wait for metadata cache to update
			await this.waitForCacheUpdate(member.personFile);

			// Sync members list to org note
			await this.membershipService.syncMembersToOrg(this.organization.file, this.organization.crId);

			// Reload members
			this.loadMembers();
			this.onMembersChanged?.();

			new Notice(`Updated membership for ${member.personName}`);
		} catch (error) {
			logger.error('saveMemberEdit', `Failed to update membership: ${error}`);
			new Notice(`Failed to update membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Confirm and remove a member from the organization
	 */
	private confirmRemoveMember(member: PersonMembership): void {
		// Simple confirmation via modal
		const confirmModal = new Modal(this.app);
		confirmModal.contentEl.createEl('h3', { text: 'Remove member?' });
		confirmModal.contentEl.createEl('p', {
			text: `Remove ${member.personName} from ${this.organization.name}?`
		});

		new Setting(confirmModal.contentEl)
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => confirmModal.close()))
			.addButton(btn => setButtonDestructive(btn.setButtonText('Remove'))
				.onClick(async () => {
					confirmModal.close();
					await this.removeMember(member);
				}));

		confirmModal.open();
	}

	/**
	 * Remove a member from the organization
	 */
	private async removeMember(member: PersonMembership): Promise<void> {
		try {
			await this.membershipService.removeMembership(member.personFile, this.organization.crId);

			// Wait for metadata cache to update
			await this.waitForCacheUpdate(member.personFile);

			// Sync members list to org note
			await this.membershipService.syncMembersToOrg(this.organization.file, this.organization.crId);

			// Reload members
			this.loadMembers();
			this.renderMembersList();
			this.onMembersChanged?.();

			new Notice(`Removed ${member.personName} from ${this.organization.name}`);
		} catch (error) {
			logger.error('removeMember', `Failed to remove member: ${error}`);
			new Notice(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Open the multi-select person picker to add members
	 */
	private openMultiSelectPicker(): void {
		// Get existing member cr_ids to exclude
		const existingMemberIds = new Set(this.members.map(m => m.personCrId));

		const picker = new MultiSelectPersonPickerModal(
			this.app,
			this.plugin,
			{
				title: 'Select members to add',
				excludeCrIds: existingMemberIds,
				onSelect: (selectedPeople) => {
					void this.addSelectedMembers(selectedPeople);
				}
			}
		);
		picker.open();
	}

	/**
	 * Add selected people as members
	 */
	private async addSelectedMembers(people: PersonInfo[]): Promise<void> {
		let addedCount = 0;
		const addedFiles: TFile[] = [];

		for (const person of people) {
			try {
				const membership: MembershipRecord = {
					org: `[[${this.organization.name}]]`,
					org_id: this.organization.crId
				};

				await this.membershipService.addMembership(person.file, membership);
				addedFiles.push(person.file);
				addedCount++;
			} catch (error) {
				logger.error('addSelectedMembers', `Failed to add ${person.name}: ${error}`);
			}
		}

		if (addedCount > 0) {
			new Notice(`Added ${addedCount} ${pluralize(addedCount, 'member')} to ${this.organization.name}`);
		}

		// Wait for metadata cache to update for all modified files
		await this.waitForFilesCache(addedFiles);

		// Sync members list to org note
		await this.membershipService.syncMembersToOrg(this.organization.file, this.organization.crId);

		// Reload members
		this.loadMembers();
		this.renderMembersList();
		this.onMembersChanged?.();
	}

	/**
	 * Wait for the metadata cache to update after file modifications.
	 * Uses Obsidian's metadata cache events with a fallback timeout.
	 */
	private waitForCacheUpdate(file: TFile): Promise<void> {
		return new Promise(resolve => {
			const timeout = window.setTimeout(() => {
				// Fallback if event doesn't fire within 500ms
				this.app.metadataCache.off('changed', handler);
				resolve();
			}, 500);

			const handler = (changedFile: TFile) => {
				if (changedFile.path === file.path) {
					window.clearTimeout(timeout);
					this.app.metadataCache.off('changed', handler);
					// Small additional delay to ensure cache is fully updated
					window.setTimeout(resolve, 50);
				}
			};

			this.app.metadataCache.on('changed', handler);
		});
	}

	/**
	 * Wait for metadata cache to update for multiple files.
	 */
	private async waitForFilesCache(files: TFile[]): Promise<void> {
		if (files.length === 0) return;

		// Wait for all files in parallel with a global timeout
		const promises = files.map(file => this.waitForCacheUpdate(file));
		await Promise.all(promises);
	}
}

/**
 * Person info for the multi-select picker
 */
interface PersonInfo {
	name: string;
	crId: string;
	file: TFile;
	birthDate?: string;
	deathDate?: string;
}

interface MultiSelectPickerOptions {
	title?: string;
	excludeCrIds?: Set<string>;
	onSelect: (people: PersonInfo[]) => void;
}

/**
 * Multi-select person picker modal
 */
class MultiSelectPersonPickerModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private options: MultiSelectPickerOptions;
	private allPeople: PersonInfo[] = [];
	private filteredPeople: PersonInfo[] = [];
	private selectedPeople: Map<string, PersonInfo> = new Map();
	private searchQuery: string = '';
	private resultsContainer: HTMLElement | null = null;
	private selectedCountEl: HTMLElement | null = null;

	constructor(app: App, plugin: CanvasRootsPlugin, options: MultiSelectPickerOptions) {
		super(app);
		this.plugin = plugin;
		this.options = options;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass('cr-multi-select-picker-modal');

		this.loadPeople();
		this.render();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Load all person notes from the vault
	 */
	private loadPeople(): void {
		this.allPeople = [];
		const files = this.app.vault.getMarkdownFiles();
		const excludeIds = this.options.excludeCrIds || new Set();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;

			// Must be a person note
			const crType = fm.cr_type || fm.type;
			if (crType && crType !== 'person') continue;
			if (!fm.cr_id) continue;

			// Exclude already-members
			if (excludeIds.has(fm.cr_id)) continue;

			const name = typeof fm.name === 'string' ? fm.name : file.basename;
			const birthDate = fm.born instanceof Date ? fm.born.toISOString().split('T')[0] : fm.born;
			const deathDate = fm.died instanceof Date ? fm.died.toISOString().split('T')[0] : fm.died;

			this.allPeople.push({
				name,
				crId: fm.cr_id,
				file,
				birthDate,
				deathDate
			});
		}

		// Sort by name
		this.allPeople.sort((a, b) => a.name.localeCompare(b.name));
		this.filteredPeople = [...this.allPeople];
	}

	/**
	 * Render the modal content
	 */
	private render(): void {
		const { contentEl } = this;

		// Header
		const header = contentEl.createDiv({ cls: 'cr-multi-select-header' });
		const titleRow = header.createDiv({ cls: 'cr-multi-select-title-row' });
		const icon = createLucideIcon('users', 20);
		titleRow.appendChild(icon);
		titleRow.createSpan({ text: this.options.title || 'Select people' });

		// Search input
		const searchSection = contentEl.createDiv({ cls: 'cr-multi-select-search' });
		const searchInput = searchSection.createEl('input', {
			cls: 'cr-form-input',
			attr: { type: 'text', placeholder: 'Search by name...' }
		});
		searchInput.addEventListener('input', () => {
			this.searchQuery = searchInput.value.toLowerCase();
			this.filterPeople();
		});

		// Auto-focus search
		window.setTimeout(() => searchInput.focus(), 50);

		// Results
		this.resultsContainer = contentEl.createDiv({ cls: 'cr-multi-select-results' });
		this.renderResults();

		// Footer with selected count and actions
		const footer = contentEl.createDiv({ cls: 'cr-multi-select-footer' });

		this.selectedCountEl = footer.createDiv({ cls: 'cr-multi-select-count' });
		this.updateSelectedCount();

		const actions = footer.createDiv({ cls: 'cr-multi-select-actions' });

		const cancelBtn = actions.createEl('button', { cls: 'cr-btn cr-btn--ghost' });
		cancelBtn.textContent = 'Cancel';
		cancelBtn.addEventListener('click', () => this.close());

		const addBtn = actions.createEl('button', { cls: 'cr-btn cr-btn--primary' });
		addBtn.textContent = 'Add selected';
		addBtn.addEventListener('click', () => {
			if (this.selectedPeople.size > 0) {
				this.options.onSelect(Array.from(this.selectedPeople.values()));
			}
			this.close();
		});
	}

	/**
	 * Filter people based on search query
	 */
	private filterPeople(): void {
		if (!this.searchQuery) {
			this.filteredPeople = [...this.allPeople];
		} else {
			this.filteredPeople = this.allPeople.filter(p =>
				p.name.toLowerCase().includes(this.searchQuery)
			);
		}
		this.renderResults();
	}

	/**
	 * Render the filtered results
	 */
	private renderResults(): void {
		if (!this.resultsContainer) return;
		this.resultsContainer.empty();

		if (this.filteredPeople.length === 0) {
			const emptyState = this.resultsContainer.createDiv({ cls: 'cr-multi-select-empty' });
			emptyState.createEl('p', { text: 'No people found' });
			return;
		}

		for (const person of this.filteredPeople) {
			this.renderPersonRow(person);
		}
	}

	/**
	 * Render a single person row with checkbox
	 */
	private renderPersonRow(person: PersonInfo): void {
		if (!this.resultsContainer) return;

		const row = this.resultsContainer.createDiv({ cls: 'cr-multi-select-row' });
		const isSelected = this.selectedPeople.has(person.crId);

		if (isSelected) {
			row.addClass('cr-multi-select-row--selected');
		}

		// Checkbox
		const checkbox = row.createEl('input', {
			cls: 'cr-multi-select-checkbox',
			attr: { type: 'checkbox' }
		});
		checkbox.checked = isSelected;

		// Person info
		const info = row.createDiv({ cls: 'cr-multi-select-person-info' });
		info.createSpan({ text: person.name, cls: 'cr-multi-select-person-name' });

		if (person.birthDate || person.deathDate) {
			const dates = info.createSpan({ cls: 'cr-multi-select-person-dates cr-text-muted' });
			if (person.birthDate && person.deathDate) {
				dates.textContent = `${person.birthDate} – ${person.deathDate}`;
			} else if (person.birthDate) {
				dates.textContent = `b. ${person.birthDate}`;
			} else if (person.deathDate) {
				dates.textContent = `d. ${person.deathDate}`;
			}
		}

		// Click handler for entire row
		row.addEventListener('click', (e) => {
			if (e.target === checkbox) return; // Let checkbox handle itself

			if (this.selectedPeople.has(person.crId)) {
				this.selectedPeople.delete(person.crId);
				row.removeClass('cr-multi-select-row--selected');
				checkbox.checked = false;
			} else {
				this.selectedPeople.set(person.crId, person);
				row.addClass('cr-multi-select-row--selected');
				checkbox.checked = true;
			}
			this.updateSelectedCount();
		});

		// Checkbox change handler
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) {
				this.selectedPeople.set(person.crId, person);
				row.addClass('cr-multi-select-row--selected');
			} else {
				this.selectedPeople.delete(person.crId);
				row.removeClass('cr-multi-select-row--selected');
			}
			this.updateSelectedCount();
		});
	}

	/**
	 * Update the selected count display
	 */
	private updateSelectedCount(): void {
		if (!this.selectedCountEl) return;

		const count = this.selectedPeople.size;
		if (count === 0) {
			this.selectedCountEl.textContent = 'No people selected';
		} else {
			const names = Array.from(this.selectedPeople.values())
				.slice(0, 3)
				.map(p => p.name)
				.join(', ');
			const extra = count > 3 ? ` +${count - 3} more` : '';
			this.selectedCountEl.textContent = `Selected (${count}): ${names}${extra}`;
		}
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- Match scope of file-level disable at top. */
