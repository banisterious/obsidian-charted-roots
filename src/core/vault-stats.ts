import { App, TFile } from 'obsidian';
import { SpouseValue } from '../types/frontmatter';
import { FolderFilterService } from './folder-filter';

/**
 * Vault statistics for person notes
 */
export interface VaultStats {
	totalPeople: number;
	peopleWithBirthDate: number;
	peopleWithDeathDate: number;
	peopleWithFather: number;
	peopleWithMother: number;
	peopleWithSpouse: number;
	orphanedPeople: number;  // No relationships
	livingPeople: number;    // Has birth date but no death date
}

/**
 * Relationship statistics
 */
export interface RelationshipStats {
	totalFatherLinks: number;
	totalMotherLinks: number;
	totalSpouseLinks: number;
	totalRelationships: number;
}

/**
 * Combined vault statistics
 */
export interface FullVaultStats {
	people: VaultStats;
	relationships: RelationshipStats;
	lastUpdated: Date;
}

/**
 * Service for collecting statistics about person notes in the vault
 */
export class VaultStatsService {
	private app: App;
	private folderFilter: FolderFilterService | null = null;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Set the folder filter service for filtering person notes by folder
	 */
	setFolderFilter(folderFilter: FolderFilterService): void {
		this.folderFilter = folderFilter;
	}

	/**
	 * Collect full vault statistics
	 */
	collectStats(): FullVaultStats {
		const files = this.app.vault.getMarkdownFiles();

		let totalPeople = 0;
		let peopleWithBirthDate = 0;
		let peopleWithDeathDate = 0;
		let peopleWithFather = 0;
		let peopleWithMother = 0;
		let peopleWithSpouse = 0;
		let orphanedPeople = 0;
		let livingPeople = 0;

		let totalFatherLinks = 0;
		let totalMotherLinks = 0;
		let totalSpouseLinks = 0;

		for (const file of files) {
			// Apply folder filter if configured
			if (this.folderFilter && !this.folderFilter.shouldIncludeFile(file)) {
				continue;
			}

			const personData = this.extractPersonData(file);
			if (!personData) continue;

			totalPeople++;

			// Birth/death statistics
			if (personData.hasBirthDate) {
				peopleWithBirthDate++;
				if (!personData.hasDeathDate) {
					livingPeople++;
				}
			}
			if (personData.hasDeathDate) {
				peopleWithDeathDate++;
			}

			// Relationship statistics
			let hasRelationships = false;
			if (personData.hasFather) {
				peopleWithFather++;
				totalFatherLinks++;
				hasRelationships = true;
			}
			if (personData.hasMother) {
				peopleWithMother++;
				totalMotherLinks++;
				hasRelationships = true;
			}
			if (personData.spouseCount > 0) {
				peopleWithSpouse++;
				totalSpouseLinks += personData.spouseCount;
				hasRelationships = true;
			}

			if (!hasRelationships) {
				orphanedPeople++;
			}
		}

		return {
			people: {
				totalPeople,
				peopleWithBirthDate,
				peopleWithDeathDate,
				peopleWithFather,
				peopleWithMother,
				peopleWithSpouse,
				orphanedPeople,
				livingPeople
			},
			relationships: {
				totalFatherLinks,
				totalMotherLinks,
				totalSpouseLinks,
				totalRelationships: totalFatherLinks + totalMotherLinks + totalSpouseLinks
			},
			lastUpdated: new Date()
		};
	}

	/**
	 * Extract person data from a file
	 */
	private extractPersonData(file: TFile): {
		hasCrId: boolean;
		hasBirthDate: boolean;
		hasDeathDate: boolean;
		hasFather: boolean;
		hasMother: boolean;
		spouseCount: number;
	} | null {
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache || !cache.frontmatter) {
				return null;
			}

			const fm = cache.frontmatter;

			// Must have cr_id to be a valid person note
			if (!fm.cr_id) {
				return null;
			}

			return {
				hasCrId: true,
				hasBirthDate: !!(fm.born || fm.birth_date),
				hasDeathDate: !!(fm.died || fm.death_date),
				hasFather: !!(fm.father || fm.father_id),
				hasMother: !!(fm.mother || fm.mother_id),
				spouseCount: this.getSpouseCount(fm.spouse || fm.spouse_id)
			};
		} catch (error: unknown) {
			console.error('Error extracting person data from file:', file.path, error);
			return null;
		}
	}

	/**
	 * Get spouse count from frontmatter
	 */
	private getSpouseCount(spouse: SpouseValue): number {
		if (!spouse) return 0;
		if (Array.isArray(spouse)) return spouse.length;
		return 1;
	}
}
