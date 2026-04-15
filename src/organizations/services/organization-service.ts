/**
 * Organization Service
 *
 * Provides CRUD operations for organization notes and manages
 * the organization cache for efficient lookups.
 */

import { App, TFile, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type {
	OrganizationInfo,
	OrganizationType,
	OrganizationStats,
	OrganizationHierarchyNode
} from '../types/organization-types';
import { isValidOrganizationType, getOrganizationType } from '../constants/organization-type-defaults';
import { getLogger } from '../../core/logging';
import { parseMediaRefs } from '../../core/media-service';
import { isOrganizationNote } from '../../utils/note-type-detection';
import type { MembershipService } from './membership-service';

const logger = getLogger('OrganizationService');

/**
 * Get the property name to write, respecting aliases
 * If user has an alias for this canonical property, return the user's property name
 */
function getWriteProperty(canonical: string, aliases: Record<string, string>): string {
	for (const [userProp, canonicalProp] of Object.entries(aliases)) {
		if (canonicalProp === canonical) {
			return userProp;
		}
	}
	return canonical;
}

/**
 * Create a wikilink with proper handling of duplicate filenames
 * Uses [[basename|name]] format when basename differs from name
 * @param name The display name
 * @param app The Obsidian app instance for file resolution
 */
function createSmartWikilink(name: string, app: App): string {
	// If already a wikilink, return as-is
	if (name.startsWith('[[') && name.endsWith(']]')) {
		return name;
	}

	// Try to resolve the name to a file
	const resolvedFile = app.metadataCache.getFirstLinkpathDest(name, '');
	if (resolvedFile && resolvedFile.basename !== name) {
		return `[[${resolvedFile.basename}|${name}]]`;
	}

	// Standard format
	return `[[${name}]]`;
}

/**
 * Service for managing organization notes
 */
export class OrganizationService {
	private app: App;
	private plugin: CanvasRootsPlugin;
	private organizationCache: Map<string, OrganizationInfo>;
	private cacheLoaded: boolean = false;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.organizationCache = new Map();
	}

	/**
	 * Ensure the organization cache is loaded
	 */
	ensureCacheLoaded(): void {
		if (!this.cacheLoaded) {
			this.loadOrganizationCache();
		}
	}

	/**
	 * Force reload the organization cache
	 */
	reloadCache(): void {
		this.loadOrganizationCache();
	}

	/**
	 * Get all organizations
	 */
	getAllOrganizations(): OrganizationInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.organizationCache.values());
	}

	/**
	 * Get organization by cr_id
	 */
	getOrganization(crId: string): OrganizationInfo | null {
		this.ensureCacheLoaded();
		return this.organizationCache.get(crId) || null;
	}

	/**
	 * Get organization by file path
	 */
	getOrganizationByFile(file: TFile): OrganizationInfo | null {
		this.ensureCacheLoaded();
		for (const org of this.organizationCache.values()) {
			if (org.file.path === file.path) {
				return org;
			}
		}
		return null;
	}

	/**
	 * Get child organizations (those with parentOrg = given crId)
	 */
	getChildOrganizations(parentCrId: string): OrganizationInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.organizationCache.values())
			.filter(org => org.parentOrg === parentCrId);
	}

	/**
	 * Get organization hierarchy (ancestors from current to root)
	 */
	getOrganizationHierarchy(crId: string): OrganizationInfo[] {
		this.ensureCacheLoaded();
		const hierarchy: OrganizationInfo[] = [];
		let currentId: string | undefined = crId;
		const visited = new Set<string>();

		while (currentId && !visited.has(currentId)) {
			visited.add(currentId);
			const org = this.organizationCache.get(currentId);
			if (org) {
				hierarchy.push(org);
				currentId = org.parentOrg;
			} else {
				break;
			}
		}

		return hierarchy;
	}

	/**
	 * Get organizations by type
	 */
	getOrganizationsByType(orgType: OrganizationType): OrganizationInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.organizationCache.values())
			.filter(org => org.orgType === orgType);
	}

	/**
	 * Get organizations by universe
	 */
	getOrganizationsByUniverse(universe: string): OrganizationInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.organizationCache.values())
			.filter(org => org.universe === universe);
	}

	/**
	 * Get root organizations (those without a parent)
	 */
	getRootOrganizations(): OrganizationInfo[] {
		this.ensureCacheLoaded();
		return Array.from(this.organizationCache.values())
			.filter(org => !org.parentOrg);
	}

	/**
	 * Build a hierarchy tree from root organizations
	 */
	buildHierarchyTree(): OrganizationHierarchyNode[] {
		this.ensureCacheLoaded();
		const roots = this.getRootOrganizations();

		const buildNode = (org: OrganizationInfo, depth: number): OrganizationHierarchyNode => {
			const children = this.getChildOrganizations(org.crId);
			return {
				org,
				children: children.map(child => buildNode(child, depth + 1)),
				depth,
				isExpanded: depth < 2 // Auto-expand first 2 levels
			};
		};

		return roots.map(root => buildNode(root, 0));
	}

	/**
	 * Get organization statistics
	 */
	getStats(membershipService?: MembershipService): OrganizationStats {
		this.ensureCacheLoaded();
		const orgs = Array.from(this.organizationCache.values());

		// Build type counts dynamically to support custom types
		const byType: Record<string, number> = {};

		for (const org of orgs) {
			const typeId = org.orgType;
			byType[typeId] = (byType[typeId] || 0) + 1;
		}

		// Calculate membership stats (#368)
		let peopleWithMemberships = 0;
		let totalMemberships = 0;
		let emptyOrganizations = orgs.length;

		if (membershipService) {
			const membershipStats = membershipService.getMembershipStats();
			peopleWithMemberships = membershipStats.peopleWithMemberships;
			totalMemberships = membershipStats.totalMemberships;

			// Count orgs with at least one member
			emptyOrganizations = 0;
			for (const org of orgs) {
				const members = membershipService.getOrganizationMembers(org.crId);
				if (members.length === 0) {
					emptyOrganizations++;
				}
			}
		}

		return {
			total: orgs.length,
			byType,
			peopleWithMemberships,
			totalMemberships,
			emptyOrganizations
		};
	}

	/**
	 * Create a new organization note
	 */
	async createOrganization(
		name: string,
		orgType: OrganizationType,
		options?: {
			parentOrg?: string;
			universe?: string;
			founded?: string;
			motto?: string;
			seat?: string;
			roles?: string[];
			folder?: string;
		}
	): Promise<TFile> {
		const folder = options?.folder || this.plugin.settings.organizationsFolder;

		// Helper to get aliased property name
		const aliases = this.plugin.settings.propertyAliases || {};
		const prop = (canonical: string) => getWriteProperty(canonical, aliases);

		// Generate cr_id
		const crId = `org-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

		// Build frontmatter
		const frontmatterLines = [
			'---',
			`${prop('cr_type')}: organization`,
			`${prop('cr_id')}: ${crId}`,
			`${prop('name')}: "${name}"`,
			`org_type: ${orgType}`
		];

		if (options?.parentOrg) {
			frontmatterLines.push(`parent_org: "${createSmartWikilink(options.parentOrg, this.app)}"`);
		}
		if (options?.universe) {
			frontmatterLines.push(`${prop('universe')}: ${options.universe}`);
		}
		if (options?.founded) {
			frontmatterLines.push(`founded: "${options.founded}"`);
		}
		if (options?.motto) {
			frontmatterLines.push(`motto: "${options.motto}"`);
		}
		if (options?.seat) {
			frontmatterLines.push(`seat: "${createSmartWikilink(options.seat, this.app)}"`);
		}
		if (options?.roles && options.roles.length > 0) {
			frontmatterLines.push('roles:');
			for (const role of options.roles) {
				frontmatterLines.push(`  - "${role}"`);
			}
		}

		frontmatterLines.push('---');
		frontmatterLines.push('');
		frontmatterLines.push(`# ${name}`);
		frontmatterLines.push('');

		const content = frontmatterLines.join('\n');

		// Ensure folder exists
		const folderPath = folder;
		if (folderPath) {
			const folderExists = this.app.vault.getAbstractFileByPath(folderPath);
			if (!folderExists) {
				await this.app.vault.createFolder(folderPath);
			}
		}

		// Create file
		const filePath = folderPath ? `${folderPath}/${name}.md` : `${name}.md`;
		const file = await this.app.vault.create(filePath, content);

		// Reload cache
		this.reloadCache();

		new Notice(`Created organization: ${name}`);
		return file;
	}

	/**
	 * Update an existing organization note
	 */
	async updateOrganization(
		file: TFile,
		data: {
			name?: string;
			orgType?: OrganizationType;
			parentOrg?: string;
			universe?: string;
			founded?: string;
			motto?: string;
			seat?: string;
			roles?: string[];
		}
	): Promise<void> {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			throw new Error('File has no frontmatter');
		}

		// Use processFrontMatter to preserve existing properties
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Update only the fields that are being edited
			if (data.name !== undefined) {
				frontmatter.name = data.name || undefined;
				if (!data.name) delete frontmatter.name;
			}

			if (data.orgType !== undefined) {
				frontmatter.org_type = data.orgType;
			}

			if (data.parentOrg !== undefined) {
				if (data.parentOrg) {
					frontmatter.parent_org = data.parentOrg;
				} else {
					delete frontmatter.parent_org;
				}
			}

			if (data.universe !== undefined) {
				if (data.universe) {
					frontmatter.universe = data.universe;
				} else {
					delete frontmatter.universe;
				}
			}

			if (data.founded !== undefined) {
				if (data.founded) {
					frontmatter.founded = data.founded;
				} else {
					delete frontmatter.founded;
				}
			}

			if (data.motto !== undefined) {
				if (data.motto) {
					frontmatter.motto = data.motto;
				} else {
					delete frontmatter.motto;
				}
			}

			if (data.seat !== undefined) {
				if (data.seat) {
					frontmatter.seat = data.seat;
				} else {
					delete frontmatter.seat;
				}
			}

			if (data.roles !== undefined) {
				if (data.roles.length > 0) {
					frontmatter.roles = data.roles;
				} else {
					delete frontmatter.roles;
				}
			}
		});

		// Reload cache
		this.reloadCache();

		new Notice(`Updated organization: ${data.name || cache.frontmatter.name}`);
	}

	/**
	 * Get the effective roles for an organization.
	 * Falls back to the org type's default roles if the org has none defined.
	 */
	getEffectiveRoles(org: OrganizationInfo): string[] {
		if (org.roles && org.roles.length > 0) {
			return org.roles;
		}
		const typeDef = getOrganizationType(
			org.orgType,
			this.plugin.settings.customOrganizationTypes,
			this.plugin.settings.organizationTypeCustomizations
		);
		return typeDef.defaultRoles || [];
	}

	/**
	 * Load all organization notes into cache
	 */
	private loadOrganizationCache(): void {
		this.organizationCache.clear();

		const files = this.app.vault.getMarkdownFiles();
		let loadedCount = 0;

		for (const file of files) {
			const org = this.extractOrganizationInfo(file);
			if (org) {
				this.organizationCache.set(org.crId, org);
				loadedCount++;
			}
		}

		this.cacheLoaded = true;
		logger.debug('loadOrganizationCache', `Loaded ${loadedCount} organizations`);
	}

	/**
	 * Extract organization info from a file
	 */
	private extractOrganizationInfo(file: TFile): OrganizationInfo | null {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return null;
		}

		const fm = cache.frontmatter;

		// Must be an organization note (uses flexible detection)
		if (!isOrganizationNote(fm, cache, this.plugin.settings.noteTypeDetection)) {
			return null;
		}

		// Must have cr_id
		if (!fm.cr_id) {
			logger.warn('extractOrganizationInfo', `Organization without cr_id: ${file.path}`);
			return null;
		}

		// Must have a valid org_type
		const orgType = fm.org_type || 'custom';
		const customTypes = this.plugin.settings.customOrganizationTypes || [];
		if (!isValidOrganizationType(orgType, customTypes)) {
			logger.warn('extractOrganizationInfo', `Invalid org_type "${orgType}" in ${file.path}`);
		}

		// Extract parent org cr_id from wikilink if present
		let parentOrg: string | undefined;
		if (fm.parent_org_id) {
			parentOrg = fm.parent_org_id;
		} else if (fm.parent_org) {
			// Try to resolve wikilink to cr_id
			parentOrg = this.resolveWikilinkToCrId(fm.parent_org);
		}

		// Parse media array
		const media = this.parseMediaProperty(fm);

		// Parse roles array
		const roles = Array.isArray(fm.roles)
			? (fm.roles as string[]).filter(r => typeof r === 'string' && r.trim().length > 0)
			: undefined;

		return {
			file,
			crId: fm.cr_id,
			name: typeof fm.name === 'string' ? fm.name : file.basename,
			orgType: isValidOrganizationType(orgType, customTypes) ? orgType : 'custom',
			parentOrg,
			parentOrgLink: fm.parent_org,
			founded: fm.founded,
			dissolved: fm.dissolved,
			motto: fm.motto,
			seat: fm.seat,
			universe: fm.universe,
			media: media.length > 0 ? media : undefined,
			roles: roles && roles.length > 0 ? roles : undefined
		};
	}

	/**
	 * Parse media array from frontmatter.
	 * Expects YAML array format:
	 *   media:
	 *     - "[[file1.jpg]]"
	 *     - "[[file2.jpg]]"
	 */
	private parseMediaProperty(fm: Record<string, unknown>): string[] {
		return parseMediaRefs(fm.media);
	}

	/**
	 * Resolve a wikilink to a cr_id by finding the linked file
	 */
	private resolveWikilinkToCrId(wikilink: string): string | undefined {
		if (!wikilink) return undefined;

		// Extract filename from wikilink
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
 * Create an OrganizationService instance
 */
export function createOrganizationService(plugin: CanvasRootsPlugin): OrganizationService {
	return new OrganizationService(plugin);
}
