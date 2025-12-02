/**
 * Modal for standardizing place name variations
 * Finds similar place names and allows unification to a canonical form
 */

import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import { createLucideIcon } from './lucide-icons';
import { PlaceGraphService } from '../core/place-graph';

interface PlaceVariationGroup {
	/** All variations found (including the suggested canonical) */
	variations: string[];
	/** Suggested canonical name (most common or linked) */
	canonical: string;
	/** Total reference count across all variations */
	totalCount: number;
	/** Whether any variation is linked to a place note */
	hasLinkedVariation: boolean;
}

interface StandardizePlacesOptions {
	onComplete?: (updated: number) => void;
}

/**
 * Modal for reviewing and standardizing place name variations
 */
export class StandardizePlacesModal extends Modal {
	private placeService: PlaceGraphService;
	private variationGroups: PlaceVariationGroup[];
	private selectedGroups: Map<PlaceVariationGroup, string>; // group -> chosen canonical
	private onComplete?: (updated: number) => void;

	constructor(
		app: App,
		variationGroups: PlaceVariationGroup[],
		options: StandardizePlacesOptions = {}
	) {
		super(app);
		this.placeService = new PlaceGraphService(app);
		this.variationGroups = variationGroups;
		this.selectedGroups = new Map();
		this.onComplete = options.onComplete;

		// Pre-select the suggested canonical for each group
		for (const group of variationGroups) {
			this.selectedGroups.set(group, group.canonical);
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('crc-standardize-places-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-modal-header' });
		const titleContainer = header.createDiv({ cls: 'crc-modal-title' });
		const icon = createLucideIcon('edit', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Standardize place names');

		// Description
		contentEl.createEl('p', {
			text: `Found ${this.variationGroups.length} group${this.variationGroups.length !== 1 ? 's' : ''} of similar place names. Select which name to use as the standard for each group.`,
			cls: 'crc-text--muted'
		});

		if (this.variationGroups.length === 0) {
			contentEl.createEl('p', {
				text: 'No place name variations found. Your place names are already consistent!',
				cls: 'crc-text--success crc-mt-3'
			});

			const buttonContainer = contentEl.createDiv({ cls: 'crc-modal-buttons' });
			const closeBtn = buttonContainer.createEl('button', {
				text: 'Close',
				cls: 'crc-btn crc-btn--primary'
			});
			closeBtn.addEventListener('click', () => this.close());
			return;
		}

		// Variation groups container
		const groupsContainer = contentEl.createDiv({ cls: 'crc-variation-groups' });
		this.renderGroups(groupsContainer);

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'crc-modal-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'crc-btn'
		});
		cancelBtn.addEventListener('click', () => this.close());

		const applyBtn = buttonContainer.createEl('button', {
			text: 'Apply changes',
			cls: 'crc-btn crc-btn--primary'
		});
		applyBtn.addEventListener('click', async () => {
			await this.applyStandardization();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the variation groups
	 */
	private renderGroups(container: HTMLElement): void {
		container.empty();

		for (const group of this.variationGroups) {
			const groupEl = container.createDiv({ cls: 'crc-variation-group' });

			// Group header
			const groupHeader = groupEl.createDiv({ cls: 'crc-variation-group-header' });
			groupHeader.createEl('strong', {
				text: `${group.variations.length} variations`,
				cls: 'crc-variation-count'
			});
			groupHeader.createEl('span', {
				text: ` • ${group.totalCount} total references`,
				cls: 'crc-text--muted'
			});
			if (group.hasLinkedVariation) {
				const linkedBadge = groupHeader.createEl('span', {
					text: 'has place note',
					cls: 'crc-badge crc-badge--success crc-badge--small crc-ml-2'
				});
				linkedBadge.title = 'One or more variations are linked to place notes';
			}

			// Radio buttons for each variation
			const variationsEl = groupEl.createDiv({ cls: 'crc-variation-options' });

			for (const variation of group.variations) {
				const optionEl = variationsEl.createDiv({ cls: 'crc-variation-option' });

				const radioId = `variation-${this.variationGroups.indexOf(group)}-${group.variations.indexOf(variation)}`;
				const radio = optionEl.createEl('input', {
					type: 'radio',
					cls: 'crc-radio'
				});
				radio.name = `group-${this.variationGroups.indexOf(group)}`;
				radio.id = radioId;
				radio.checked = this.selectedGroups.get(group) === variation;
				radio.addEventListener('change', () => {
					if (radio.checked) {
						this.selectedGroups.set(group, variation);
					}
				});

				const label = optionEl.createEl('label', { cls: 'crc-radio-label' });
				label.setAttribute('for', radioId);
				label.createEl('span', { text: variation });

				// Show reference count and linked status
				const references = this.getVariationReferences(variation);
				const isLinked = this.isVariationLinked(variation);

				const meta = label.createEl('span', { cls: 'crc-variation-meta' });
				meta.createEl('span', {
					text: ` (${references.length})`,
					cls: 'crc-text--muted'
				});
				if (isLinked) {
					meta.createEl('span', {
						text: ' ✓ linked',
						cls: 'crc-text--success'
					});
				}
			}
		}
	}

	/**
	 * Get references for a specific variation
	 */
	private getVariationReferences(variation: string): Array<{ personId: string }> {
		this.placeService.ensureCacheLoaded();
		const allRefs = this.placeService.getPlaceReferences();
		return allRefs.filter(ref => ref.rawValue === variation);
	}

	/**
	 * Check if a variation is linked to a place note
	 */
	private isVariationLinked(variation: string): boolean {
		this.placeService.ensureCacheLoaded();
		const place = this.placeService.getPlaceByName(variation);
		return place !== undefined;
	}

	/**
	 * Apply the standardization changes
	 */
	private async applyStandardization(): Promise<void> {
		let totalUpdated = 0;
		const errors: string[] = [];

		for (const [group, canonical] of this.selectedGroups.entries()) {
			// Find all variations that need to be updated (not the canonical one)
			const variationsToUpdate = group.variations.filter(v => v !== canonical);

			for (const oldValue of variationsToUpdate) {
				try {
					const updated = await this.updatePlaceReferences(oldValue, canonical);
					totalUpdated += updated;
				} catch (error) {
					errors.push(`${oldValue} → ${canonical}: ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			}
		}

		if (errors.length > 0) {
			console.error('Errors during standardization:', errors);
			new Notice(`Updated ${totalUpdated} references. ${errors.length} errors occurred.`);
		} else if (totalUpdated > 0) {
			new Notice(`Updated ${totalUpdated} place reference${totalUpdated !== 1 ? 's' : ''}`);
		} else {
			new Notice('No changes were needed');
		}

		if (this.onComplete) {
			this.onComplete(totalUpdated);
		}

		this.close();
	}

	/**
	 * Update all place references from oldValue to newValue
	 */
	private async updatePlaceReferences(oldValue: string, newValue: string): Promise<number> {
		let updated = 0;
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;

			// Skip place notes
			if (fm.type === 'place') continue;

			// Check if any place fields match the old value
			const fieldsToUpdate: string[] = [];

			if (fm.birth_place === oldValue) fieldsToUpdate.push('birth_place');
			if (fm.death_place === oldValue) fieldsToUpdate.push('death_place');
			if (fm.burial_place === oldValue) fieldsToUpdate.push('burial_place');

			// Check spouse marriage locations
			let spouseIndex = 1;
			while (fm[`spouse${spouseIndex}`] || fm[`spouse${spouseIndex}_id`]) {
				if (fm[`spouse${spouseIndex}_marriage_location`] === oldValue) {
					fieldsToUpdate.push(`spouse${spouseIndex}_marriage_location`);
				}
				spouseIndex++;
			}

			if (fieldsToUpdate.length > 0) {
				await this.updateFileFrontmatter(file, fieldsToUpdate, newValue);
				updated += fieldsToUpdate.length;
			}
		}

		return updated;
	}

	/**
	 * Update specific frontmatter fields in a file
	 */
	private async updateFileFrontmatter(file: TFile, fields: string[], newValue: string): Promise<void> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');

		// Find frontmatter boundaries
		if (lines[0] !== '---') return;

		let endIndex = -1;
		for (let i = 1; i < lines.length; i++) {
			if (lines[i] === '---') {
				endIndex = i;
				break;
			}
		}

		if (endIndex === -1) return;

		// Update matching fields in frontmatter
		for (let i = 1; i < endIndex; i++) {
			const line = lines[i];
			for (const field of fields) {
				// Match field: value or field: "value" patterns
				const regex = new RegExp(`^(${field}:\\s*)(.+)$`);
				const match = line.match(regex);
				if (match) {
					// Preserve quoting style
					const oldValPart = match[2];
					let newLine: string;
					if (oldValPart.startsWith('"') && oldValPart.endsWith('"')) {
						newLine = `${match[1]}"${newValue}"`;
					} else if (oldValPart.startsWith("'") && oldValPart.endsWith("'")) {
						newLine = `${match[1]}'${newValue}'`;
					} else {
						// Use quotes if newValue contains special characters
						if (newValue.includes(':') || newValue.includes('#') || newValue.includes(',')) {
							newLine = `${match[1]}"${newValue}"`;
						} else {
							newLine = `${match[1]}${newValue}`;
						}
					}
					lines[i] = newLine;
				}
			}
		}

		await this.app.vault.modify(file, lines.join('\n'));
	}
}

/**
 * Find groups of similar place names that might be variations
 */
export function findPlaceNameVariations(app: App): PlaceVariationGroup[] {
	const placeService = new PlaceGraphService(app);
	placeService.reloadCache();

	const references = placeService.getReferencedPlaces();
	const allPlaceNames: Array<{ name: string; count: number; linked: boolean }> = [];

	for (const [name, info] of references.entries()) {
		allPlaceNames.push({ name, count: info.count, linked: info.linked });
	}

	// Group similar names using various heuristics
	const groups: PlaceVariationGroup[] = [];
	const processed = new Set<string>();

	for (const place of allPlaceNames) {
		if (processed.has(place.name)) continue;

		const similar = findSimilarNames(place.name, allPlaceNames, processed);

		if (similar.length > 1) {
			// Sort by: linked first, then by count (descending)
			similar.sort((a, b) => {
				if (a.linked !== b.linked) return a.linked ? -1 : 1;
				return b.count - a.count;
			});

			const group: PlaceVariationGroup = {
				variations: similar.map(s => s.name),
				canonical: similar[0].name, // Suggest the linked or most common
				totalCount: similar.reduce((sum, s) => sum + s.count, 0),
				hasLinkedVariation: similar.some(s => s.linked)
			};

			groups.push(group);

			for (const s of similar) {
				processed.add(s.name);
			}
		} else {
			processed.add(place.name);
		}
	}

	// Sort groups by total count (most references first)
	groups.sort((a, b) => b.totalCount - a.totalCount);

	return groups;
}

/**
 * Find names similar to the given name
 */
function findSimilarNames(
	name: string,
	allNames: Array<{ name: string; count: number; linked: boolean }>,
	processed: Set<string>
): Array<{ name: string; count: number; linked: boolean }> {
	const similar: Array<{ name: string; count: number; linked: boolean }> = [];

	// Normalize for comparison
	const normalized = normalizePlaceName(name);

	for (const place of allNames) {
		if (processed.has(place.name)) continue;

		const otherNormalized = normalizePlaceName(place.name);

		// Check various similarity criteria
		if (
			normalized === otherNormalized ||
			isSubstringMatch(normalized, otherNormalized) ||
			isAbbreviationMatch(name, place.name) ||
			isPunctuationVariation(name, place.name)
		) {
			similar.push(place);
		}
	}

	return similar;
}

/**
 * Normalize a place name for comparison
 */
function normalizePlaceName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[,.\-']/g, ' ')  // Replace punctuation with spaces
		.replace(/\s+/g, ' ')      // Normalize whitespace
		.trim();
}

/**
 * Check if one name is a substring of another (after normalization)
 */
function isSubstringMatch(a: string, b: string): boolean {
	// One must be significantly shorter to be a substring match
	if (Math.abs(a.length - b.length) < 3) return false;

	const shorter = a.length < b.length ? a : b;
	const longer = a.length < b.length ? b : a;

	// The shorter one should be a significant part of the longer
	return longer.includes(shorter) && shorter.length >= 4;
}

/**
 * Check for common abbreviation patterns
 */
function isAbbreviationMatch(a: string, b: string): boolean {
	const abbreviations: Record<string, string[]> = {
		'united states': ['usa', 'us', 'u.s.', 'u.s.a.'],
		'united kingdom': ['uk', 'u.k.', 'britain', 'great britain'],
		'new york': ['ny', 'n.y.'],
		'california': ['ca', 'calif.'],
		'massachusetts': ['ma', 'mass.'],
		'pennsylvania': ['pa', 'penn.'],
		'district of columbia': ['dc', 'd.c.', 'washington dc'],
		'saint': ['st', 'st.'],
		'mount': ['mt', 'mt.'],
		'fort': ['ft', 'ft.'],
		'north': ['n', 'n.'],
		'south': ['s', 's.'],
		'east': ['e', 'e.'],
		'west': ['w', 'w.'],
	};

	const aLower = a.toLowerCase();
	const bLower = b.toLowerCase();

	for (const [full, abbrevs] of Object.entries(abbreviations)) {
		for (const abbrev of abbrevs) {
			// Check if one contains the full form and the other contains the abbreviation
			if (
				(aLower.includes(full) && bLower.includes(abbrev)) ||
				(bLower.includes(full) && aLower.includes(abbrev))
			) {
				// Make sure the rest of the name is similar
				const aRest = aLower.replace(full, '').replace(abbrev, '').trim();
				const bRest = bLower.replace(full, '').replace(abbrev, '').trim();
				if (aRest === bRest || Math.abs(aRest.length - bRest.length) <= 2) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Check for punctuation/formatting variations
 */
function isPunctuationVariation(a: string, b: string): boolean {
	// Remove all punctuation and compare
	const aNoPunct = a.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
	const bNoPunct = b.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

	return aNoPunct === bNoPunct && a !== b;
}
