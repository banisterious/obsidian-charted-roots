/**
 * Membership Service
 *
 * Handles person-to-organization membership relationships,
 * including parsing, updating, and querying memberships.
 */

import { App, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type {
	MembershipRecord,
	PersonMembership,
	OrganizationInfo,
	FlatMembershipProperties
} from '../types/organization-types';
import { OrganizationService } from './organization-service';
import { getLogger } from '../../core/logging';

const logger = getLogger('MembershipService');

/**
 * Service for managing person memberships in organizations
 */
export class MembershipService {
	private app: App;
	private plugin: CanvasRootsPlugin;
	private organizationService: OrganizationService;

	constructor(plugin: CanvasRootsPlugin, organizationService: OrganizationService) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.organizationService = organizationService;
	}

	/**
	 * Get all memberships for a person by their cr_id
	 */
	getPersonMemberships(personCrId: string): PersonMembership[] {
		const personFile = this.findPersonFileByCrId(personCrId);
		if (!personFile) {
			return [];
		}

		return this.getPersonMembershipsFromFile(personFile);
	}

	/**
	 * Get all memberships from a person file
	 *
	 * Reads from three formats in priority order:
	 * 1. Flat parallel arrays (membership_orgs, etc.) - preferred
	 * 2. Legacy nested array (memberships) - deprecated
	 * 3. Simple single membership (house/organization) - legacy
	 */
	getPersonMembershipsFromFile(personFile: TFile): PersonMembership[] {
		const cache = this.app.metadataCache.getFileCache(personFile);
		if (!cache?.frontmatter) {
			return [];
		}

		const fm = cache.frontmatter;
		const memberships: PersonMembership[] = [];

		const personCrId = fm.cr_id || '';
		const personName = typeof fm.name === 'string' ? fm.name : personFile.basename;

		// Coerce a frontmatter value into a string array.
		// Obsidian may store single-item YAML lists as plain strings.
		const toArray = (val: unknown): string[] => {
			if (Array.isArray(val)) return val as string[];
			if (typeof val === 'string' && val) return [val];
			return [];
		};

		// Priority 1: Check for flat parallel arrays (new format)
		const fmOrgs = toArray(fm.membership_orgs);
		if (fmOrgs.length > 0) {
			const orgs = fmOrgs;
			const orgIds = toArray(fm.membership_org_ids);
			const roles = toArray(fm.membership_roles);
			const fromDates = toArray(fm.membership_from_dates);
			const toDates = toArray(fm.membership_to_dates);
			const notes = toArray(fm.membership_notes);

			for (let i = 0; i < orgs.length; i++) {
				const orgLink = orgs[i];
				if (!orgLink) continue;

				const toDate = toDates[i];
				const membership = this.createMembership(
					personCrId,
					personName,
					personFile,
					orgLink,
					orgIds[i],
					roles[i],
					fromDates[i],
					toDate,
					notes[i],
					!toDate // Current if no end date
				);
				memberships.push(membership);
			}

			return memberships;
		}

		// Priority 2: Check for legacy nested memberships array
		if (Array.isArray(fm.memberships)) {
			for (const m of fm.memberships) {
				if (typeof m === 'object' && m.org) {
					const membership = this.createMembership(
						personCrId,
						personName,
						personFile,
						m.org,
						m.org_id,
						m.role,
						m.from,
						m.to,
						m.notes,
						!m.to // Current if no end date
					);
					memberships.push(membership);
				}
			}

			return memberships;
		}

		// Priority 3: Check for simple house/role membership (legacy)
		if (fm.house || fm.organization) {
			const orgLink = fm.house || fm.organization;
			const membership = this.createMembership(
				personCrId,
				personName,
				personFile,
				orgLink,
				fm.house_id || fm.organization_id,
				fm.role,
				undefined,
				undefined,
				undefined, // No notes in simple format
				true // Simple memberships are considered current
			);
			memberships.push(membership);
		}

		return memberships;
	}

	/**
	 * Get all members of an organization by cr_id
	 */
	getOrganizationMembers(orgCrId: string): PersonMembership[] {
		const members: PersonMembership[] = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;

			// Skip non-person notes (check both cr_type and legacy type)
			if ((fm.cr_type && fm.cr_type !== 'person') || (fm.type && fm.type !== 'person')) continue;

			const personMemberships = this.getPersonMembershipsFromFile(file);
			for (const membership of personMemberships) {
				if (membership.orgId === orgCrId) {
					members.push(membership);
				}
			}
		}

		return members;
	}

	/**
	 * Get the primary/current organization for a person
	 */
	getPrimaryOrganization(personCrId: string): OrganizationInfo | null {
		const memberships = this.getPersonMemberships(personCrId);
		const currentMembership = memberships.find(m => m.isCurrent);
		return currentMembership?.org || null;
	}

	/**
	 * Add a membership to a person's note using flat parallel arrays
	 */
	async addMembership(personFile: TFile, membership: MembershipRecord): Promise<void> {
		await this.app.fileManager.processFrontMatter(personFile, (frontmatter) => {
			// Get existing flat arrays or initialize empty
			const orgs: string[] = Array.isArray(frontmatter.membership_orgs) ? [...frontmatter.membership_orgs] : [];
			const orgIds: string[] = Array.isArray(frontmatter.membership_org_ids) ? [...frontmatter.membership_org_ids] : [];
			const roles: string[] = Array.isArray(frontmatter.membership_roles) ? [...frontmatter.membership_roles] : [];
			const fromDates: string[] = Array.isArray(frontmatter.membership_from_dates) ? [...frontmatter.membership_from_dates] : [];
			const toDates: string[] = Array.isArray(frontmatter.membership_to_dates) ? [...frontmatter.membership_to_dates] : [];
			const notes: string[] = Array.isArray(frontmatter.membership_notes) ? [...frontmatter.membership_notes] : [];

			// Add new membership to each array
			orgs.push(membership.org);
			orgIds.push(membership.org_id || '');
			roles.push(membership.role || '');
			fromDates.push(membership.from || '');
			toDates.push(membership.to || '');
			notes.push(membership.notes || '');

			// Update all flat arrays
			frontmatter.membership_orgs = orgs;
			frontmatter.membership_org_ids = orgIds;
			frontmatter.membership_roles = roles;
			frontmatter.membership_from_dates = fromDates;
			frontmatter.membership_to_dates = toDates;
			frontmatter.membership_notes = notes;
		});

		logger.info('addMembership', `Added membership to ${personFile.basename}`);
	}

	/**
	 * Remove a membership from a person's note
	 *
	 * Handles all three formats:
	 * - Flat parallel arrays (new format)
	 * - Legacy nested array (memberships)
	 * - Simple single membership (house/organization)
	 */
	async removeMembership(personFile: TFile, orgCrId: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(personFile, (frontmatter) => {
			// Check flat parallel arrays first (new format)
			if (Array.isArray(frontmatter.membership_org_ids)) {
				const orgIds = frontmatter.membership_org_ids as string[];
				const indexToRemove = orgIds.findIndex(id => id === orgCrId);

				if (indexToRemove !== -1) {
					// Remove from all parallel arrays at the same index
					const orgs: string[] = Array.isArray(frontmatter.membership_orgs) ? [...frontmatter.membership_orgs] : [];
					const roles: string[] = Array.isArray(frontmatter.membership_roles) ? [...frontmatter.membership_roles] : [];
					const fromDates: string[] = Array.isArray(frontmatter.membership_from_dates) ? [...frontmatter.membership_from_dates] : [];
					const toDates: string[] = Array.isArray(frontmatter.membership_to_dates) ? [...frontmatter.membership_to_dates] : [];
					const notes: string[] = Array.isArray(frontmatter.membership_notes) ? [...frontmatter.membership_notes] : [];
					const newOrgIds = [...orgIds];

					orgs.splice(indexToRemove, 1);
					newOrgIds.splice(indexToRemove, 1);
					roles.splice(indexToRemove, 1);
					fromDates.splice(indexToRemove, 1);
					toDates.splice(indexToRemove, 1);
					notes.splice(indexToRemove, 1);

					// Update all arrays (or remove if empty)
					if (orgs.length === 0) {
						delete frontmatter.membership_orgs;
						delete frontmatter.membership_org_ids;
						delete frontmatter.membership_roles;
						delete frontmatter.membership_from_dates;
						delete frontmatter.membership_to_dates;
						delete frontmatter.membership_notes;
					} else {
						frontmatter.membership_orgs = orgs;
						frontmatter.membership_org_ids = newOrgIds;
						frontmatter.membership_roles = roles;
						frontmatter.membership_from_dates = fromDates;
						frontmatter.membership_to_dates = toDates;
						frontmatter.membership_notes = notes;
					}

					logger.info('removeMembership', `Removed membership from ${personFile.basename}`);
					return;
				}
			}

			// Check legacy nested memberships array
			if (Array.isArray(frontmatter.memberships)) {
				const filteredMemberships = frontmatter.memberships.filter(
					(m: MembershipRecord) => m.org_id !== orgCrId
				);

				if (filteredMemberships.length !== frontmatter.memberships.length) {
					if (filteredMemberships.length === 0) {
						delete frontmatter.memberships;
					} else {
						frontmatter.memberships = filteredMemberships;
					}
					logger.info('removeMembership', `Removed membership from ${personFile.basename}`);
					return;
				}
			}

			// Check simple membership format
			if (frontmatter.house_id === orgCrId || frontmatter.organization_id === orgCrId) {
				delete frontmatter.house;
				delete frontmatter.house_id;
				delete frontmatter.organization;
				delete frontmatter.organization_id;
				delete frontmatter.role;
				logger.info('removeMembership', `Removed simple membership from ${personFile.basename}`);
			}
		});
	}

	/**
	 * Sync members list to an organization note's frontmatter
	 *
	 * Updates `members` and `members_id` arrays on the org note so that
	 * Obsidian Bases queries against org notes can display member data.
	 */
	async syncMembersToOrg(orgFile: TFile, orgCrId: string): Promise<void> {
		const members = this.getOrganizationMembers(orgCrId);

		await this.app.fileManager.processFrontMatter(orgFile, (frontmatter) => {
			if (members.length > 0) {
				frontmatter.members = members.map(m => `[[${m.personName}]]`);
				frontmatter.members_id = members.map(m => m.personCrId);
			} else {
				delete frontmatter.members;
				delete frontmatter.members_id;
			}
		});

		logger.info('syncMembersToOrg', `Synced ${members.length} members to ${orgFile.basename}`);
	}

	/**
	 * Get count of people with memberships and total memberships
	 */
	getMembershipStats(): { peopleWithMemberships: number; totalMemberships: number } {
		const files = this.app.vault.getMarkdownFiles();
		let peopleWithMemberships = 0;
		let totalMemberships = 0;

		for (const file of files) {
			const memberships = this.getPersonMembershipsFromFile(file);
			if (memberships.length > 0) {
				peopleWithMemberships++;
				totalMemberships += memberships.length;
			}
		}

		return { peopleWithMemberships, totalMemberships };
	}

	/**
	 * Create a PersonMembership object
	 */
	private createMembership(
		personCrId: string,
		personName: string,
		personFile: TFile,
		orgLink: string,
		orgId: string | undefined,
		role: string | undefined,
		from: string | undefined,
		to: string | undefined,
		notes: string | undefined,
		isCurrent: boolean
	): PersonMembership {
		// Try to resolve org cr_id from link if not provided
		let resolvedOrgId = orgId;
		if (!resolvedOrgId && orgLink) {
			resolvedOrgId = this.resolveWikilinkToCrId(orgLink);
		}

		// Try to get organization info
		let org: OrganizationInfo | undefined;
		if (resolvedOrgId) {
			org = this.organizationService.getOrganization(resolvedOrgId) || undefined;
		}

		return {
			personCrId,
			personName,
			personFile,
			org,
			orgLink,
			orgId: resolvedOrgId,
			role,
			from,
			to,
			notes,
			isCurrent
		};
	}

	/**
	 * Find a person file by their cr_id
	 */
	private findPersonFileByCrId(crId: string): TFile | null {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.cr_id === crId) {
				return file;
			}
		}

		return null;
	}

	/**
	 * Resolve a wikilink to a cr_id
	 */
	private resolveWikilinkToCrId(wikilink: string): string | undefined {
		if (!wikilink) return undefined;

		const match = wikilink.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
		if (!match) return undefined;

		const linkPath = match[1];
		const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
		if (!linkedFile) return undefined;

		const cache = this.app.metadataCache.getFileCache(linkedFile);
		return cache?.frontmatter?.cr_id;
	}
}

/**
 * Create a MembershipService instance
 */
export function createMembershipService(
	plugin: CanvasRootsPlugin,
	organizationService: OrganizationService
): MembershipService {
	return new MembershipService(plugin, organizationService);
}
