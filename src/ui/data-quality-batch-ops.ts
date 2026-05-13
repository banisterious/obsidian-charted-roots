/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/* eslint-disable obsidianmd/ui/sentence-case -- Rule misfires on quoted button labels, month names, proper-noun section paths, and example strings; per-site audit deferred. */
/**
 * Data Quality batch operations
 *
 * Extracted from data-quality-tab.ts — standalone exported functions for
 * performing data cleaning and validation operations on vault notes.
 */

import { App, Notice, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { FolderFilterService } from '../core/folder-filter';
import { DataQualityService } from '../core/data-quality';
import type { BidirectionalInconsistency, ImpossibleDateIssue } from '../core/data-quality';
import { getErrorMessage } from '../core/error-utils';
import { AddPersonTypePreviewModal } from './add-person-type-modal';
import { pluralize } from '../utils/format-utils';
import {
	DuplicateRelationshipsPreviewModal,
	PlaceholderRemovalPreviewModal,
	NameNormalizationPreviewModal,
	OrphanedRefsPreviewModal,
	BidirectionalInconsistencyPreviewModal,
	ImpossibleDatesPreviewModal,
	DateValidationPreviewModal
} from './data-quality-modals';

/**
 * Preview removing duplicate relationships
 */
export function previewRemoveDuplicateRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	const changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check spouse array for duplicates
		if (Array.isArray(fm.spouse) && fm.spouse.length > 1) {
			const unique = [...new Set(fm.spouse)];
			const dupCount = fm.spouse.length - unique.length;
			if (dupCount > 0) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'spouse',
					oldValue: `${fm.spouse.length} ${pluralize(fm.spouse.length, 'entry', 'entries')} (${dupCount} ${pluralize(dupCount, 'duplicate')})`,
					newValue: `${unique.length} ${pluralize(unique.length, 'entry', 'entries')} (deduplicated)`,
					file: person.file
				});
			}
		}

		// Check spouse_id array for duplicates
		if (Array.isArray(fm.spouse_id) && fm.spouse_id.length > 1) {
			const unique = [...new Set(fm.spouse_id)];
			const dupCount = fm.spouse_id.length - unique.length;
			if (dupCount > 0) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'spouse_id',
					oldValue: `${fm.spouse_id.length} ${pluralize(fm.spouse_id.length, 'entry', 'entries')} (${dupCount} ${pluralize(dupCount, 'duplicate')})`,
					newValue: `${unique.length} ${pluralize(unique.length, 'entry', 'entries')} (deduplicated)`,
					file: person.file
				});
			}
		}

		// Check children/child arrays for duplicates
		const childrenArray = fm.children || fm.child;
		if (Array.isArray(childrenArray) && childrenArray.length > 1) {
			const unique = [...new Set(childrenArray)];
			const dupCount = childrenArray.length - unique.length;
			if (dupCount > 0) {
				const fieldName = fm.children ? 'children' : 'child';
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: fieldName,
					oldValue: `${childrenArray.length} ${pluralize(childrenArray.length, 'entry', 'entries')} (${dupCount} ${pluralize(dupCount, 'duplicate')})`,
					newValue: `${unique.length} ${pluralize(unique.length, 'entry', 'entries')} (deduplicated)`,
					file: person.file
				});
			}
		}

		// Check children_id array for duplicates
		if (Array.isArray(fm.children_id) && fm.children_id.length > 1) {
			const unique = [...new Set(fm.children_id)];
			const dupCount = fm.children_id.length - unique.length;
			if (dupCount > 0) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'children_id',
					oldValue: `${fm.children_id.length} ${pluralize(fm.children_id.length, 'entry', 'entries')} (${dupCount} ${pluralize(dupCount, 'duplicate')})`,
					newValue: `${unique.length} ${pluralize(unique.length, 'entry', 'entries')} (deduplicated)`,
					file: person.file
				});
			}
		}
	}

	if (changes.length === 0) {
		new Notice('No duplicate relationships found');
		return;
	}

	// Show preview modal
	const modal = new DuplicateRelationshipsPreviewModal(
		app,
		changes,
		async () => await removeDuplicateRelationships(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Remove duplicate relationships
 */
export async function removeDuplicateRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Removing duplicate relationships...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const modifiedFiles: TFile[] = [];
	const errors: string[] = [];

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter as Record<string, unknown>;
			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Deduplicate spouse array
				if (Array.isArray(fm.spouse) && fm.spouse.length > 1) {
					const unique = [...new Set(fm.spouse)];
					if (unique.length < fm.spouse.length) {
						frontmatter.spouse = unique;
						hasChanges = true;
					}
				}

				// Deduplicate spouse_id array
				if (Array.isArray(fm.spouse_id) && fm.spouse_id.length > 1) {
					const unique = [...new Set(fm.spouse_id)];
					if (unique.length < fm.spouse_id.length) {
						frontmatter.spouse_id = unique;
						hasChanges = true;
					}
				}

				// Deduplicate and normalize children arrays
				// Prefer 'children' (plural), migrate from 'child' (legacy) if present
				const childrenArray = fm.children || fm.child;
				if (Array.isArray(childrenArray) && childrenArray.length > 0) {
					const unique = [...new Set(childrenArray)];
					// Always write to 'children' (preferred name)
					frontmatter.children = unique.length === 1 ? unique[0] : unique;
					// Remove legacy 'child' property if present
					if (fm.child) {
						delete frontmatter.child;
						hasChanges = true;
					}
					if (unique.length < childrenArray.length) {
						hasChanges = true;
					}
				}

				// Deduplicate children_id array
				if (Array.isArray(fm.children_id) && fm.children_id.length > 1) {
					const unique = [...new Set(fm.children_id)];
					if (unique.length < fm.children_id.length) {
						frontmatter.children_id = unique;
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
				modifiedFiles.push(person.file);
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Removed duplicates from ${modified} ${pluralize(modified, 'file')}`);
	} else {
		new Notice('No duplicate relationships found');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Remove duplicates errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache(modifiedFiles);

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview removing empty/placeholder values
 */
export function previewRemovePlaceholders(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	const changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];

	// Common placeholder patterns (actual placeholder text, not empty values)
	const placeholderPatterns = [
		'(unknown)',
		'(Unknown)',
		'unknown',
		'Unknown',
		'UNKNOWN',
		'N/A',
		'n/a',
		'???',
		'...',
		'Empty',
		'empty',
		'EMPTY',
		'None',
		'none',
		'NONE',
	];

	const isPlaceholder = (value: unknown): boolean => {
		// Note: null, undefined, and empty strings are NOT placeholders - they're
		// intentionally empty fields, which is valid for optional properties.
		// We only flag actual placeholder text like "Unknown", "N/A", etc.
		if (value === null || value === undefined) return false;
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed === '') return false;
			if (placeholderPatterns.includes(trimmed)) return true;
			// Check for malformed wikilinks like "[[unknown) ]]"
			if (/^\[\[.*?\)\s*\]\]$/.test(trimmed)) return true;
			// Check for strings that are just commas and spaces
			if (/^[,\s]+$/.test(trimmed)) return true;
		}
		return false;
	};

	const cleanPlaceValue = (value: string): string | null => {
		// Handle comma-separated values like ", , , Canada"
		const parts = value.split(',').map(p => p.trim()).filter(p => p && !isPlaceholder(p));
		if (parts.length === 0) return null;
		return parts.join(', ');
	};

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check name field
		if (fm.name && isPlaceholder(fm.name)) {
			changes.push({
				person: { name: person.name || 'Unknown' },
				field: 'name',
				oldValue: String(fm.name as string),
				newValue: '(remove field)',
				file: person.file
			});
		}

		// Check place fields with comma cleanup
		const placeFields = ['birth_place', 'death_place', 'burial_place', 'residence'];
		for (const field of placeFields) {
			const value = fm[field];
			if (typeof value === 'string' && value.trim()) {
				const cleaned = cleanPlaceValue(value);
				if (cleaned === null) {
					// Entirely placeholder
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: value,
						newValue: '(remove field)',
						file: person.file
					});
				} else if (cleaned !== value) {
					// Has cleanup needed
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: value,
						newValue: cleaned,
						file: person.file
					});
				}
			} else if (field in fm && isPlaceholder(value)) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field,
					oldValue: String(value),
					newValue: '(remove field)',
					file: person.file
				});
			}
		}

		// Check relationship fields (spouse, father, mother, child/children)
		const relationshipFields = ['spouse', 'father', 'mother', 'child', 'children'];
		for (const field of relationshipFields) {
			const value = fm[field];
			if (Array.isArray(value)) {
				// Check if array contains only placeholders
				const nonPlaceholders = value.filter(v => !isPlaceholder(v));
				if (nonPlaceholders.length === 0 && value.length > 0) {
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: `[${value.length} placeholder ${pluralize(value.length, 'entry', 'entries')}]`,
						newValue: '(remove field)',
						file: person.file
					});
				} else if (nonPlaceholders.length < value.length) {
					changes.push({
						person: { name: person.name || 'Unknown' },
						field,
						oldValue: `${value.length} entries (${value.length - nonPlaceholders.length} placeholders)`,
						newValue: `${nonPlaceholders.length} entries (cleaned)`,
						file: person.file
					});
				}
			} else if (field in fm && isPlaceholder(value)) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field,
					oldValue: String(value),
					newValue: '(remove field)',
					file: person.file
				});
			}
		}

		// Note: Empty parent/spouse fields (null, undefined, '') are intentionally
		// NOT flagged as issues - they represent unknown/missing data which is valid.
	}

	if (changes.length === 0) {
		new Notice('No placeholder values found');
		return;
	}

	// Show preview modal
	const modal = new PlaceholderRemovalPreviewModal(
		app,
		changes,
		async () => await removePlaceholders(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Remove empty/placeholder values
 */
export async function removePlaceholders(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Removing placeholder values...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const modifiedFiles: TFile[] = [];
	const errors: string[] = [];

	// Common placeholder patterns (actual placeholder text, not empty values)
	const placeholderPatterns = [
		'(unknown)',
		'(Unknown)',
		'unknown',
		'Unknown',
		'UNKNOWN',
		'N/A',
		'n/a',
		'???',
		'...',
		'Empty',
		'empty',
		'EMPTY',
		'None',
		'none',
		'NONE',
	];

	const isPlaceholder = (value: unknown): boolean => {
		// Note: null, undefined, and empty strings are NOT placeholders - they're
		// intentionally empty fields, which is valid for optional properties.
		// We only flag actual placeholder text like "Unknown", "N/A", etc.
		if (value === null || value === undefined) return false;
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed === '') return false;
			if (placeholderPatterns.includes(trimmed)) return true;
			// Check for malformed wikilinks like "[[unknown) ]]"
			if (/^\[\[.*?\)\s*\]\]$/.test(trimmed)) return true;
			// Check for strings that are just commas and spaces
			if (/^[,\s]+$/.test(trimmed)) return true;
		}
		return false;
	};

	const cleanPlaceValue = (value: string): string | null => {
		// Handle comma-separated values like ", , , Canada"
		const parts = value.split(',').map(p => p.trim()).filter(p => p && !isPlaceholder(p));
		if (parts.length === 0) return null;
		return parts.join(', ');
	};

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Remove placeholder name
				if (frontmatter.name && isPlaceholder(frontmatter.name)) {
					delete frontmatter.name;
					hasChanges = true;
				}

				// Clean or remove place fields
				const placeFields = ['birth_place', 'death_place', 'burial_place', 'residence'];
				for (const field of placeFields) {
					const value = frontmatter[field];
					if (typeof value === 'string' && value.trim()) {
						const cleaned = cleanPlaceValue(value);
						if (cleaned === null) {
							delete frontmatter[field];
							hasChanges = true;
						} else if (cleaned !== value) {
							frontmatter[field] = cleaned;
							hasChanges = true;
						}
					} else if (field in frontmatter && isPlaceholder(value)) {
						delete frontmatter[field];
						hasChanges = true;
					}
				}

				// Clean relationship arrays or remove if all placeholders
				const relationshipFields = ['spouse', 'child', 'children'];
				for (const field of relationshipFields) {
					const value = frontmatter[field];
					if (Array.isArray(value)) {
						const nonPlaceholders = value.filter(v => !isPlaceholder(v));
						if (nonPlaceholders.length === 0) {
							delete frontmatter[field];
							hasChanges = true;
						} else if (nonPlaceholders.length < value.length) {
							frontmatter[field] = nonPlaceholders;
							hasChanges = true;
						}
					} else if (field in frontmatter && isPlaceholder(value)) {
						delete frontmatter[field];
						hasChanges = true;
					}
				}

				// Remove placeholder parent fields
				const parentFields = ['father', 'mother'];
				for (const field of parentFields) {
					if (field in frontmatter && isPlaceholder(frontmatter[field])) {
						delete frontmatter[field];
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
				modifiedFiles.push(person.file);
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Removed placeholders from ${modified} ${pluralize(modified, 'file')}`);
	} else {
		new Notice('No placeholder values found');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Remove placeholders errors:', errors);
	}

	// Refresh the family graph cache. The reload awaits each modified
	// file's metadata-cache refresh internally \u2014 no extra delay needed.
	await familyGraph.reloadCache(modifiedFiles);

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview adding cr_type: person to person notes
 */
export function previewAddPersonType(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	console.debug(`[DEBUG] previewAddPersonType: Found ${people.length} people from getAllPeople()`);

	const changes: Array<{ person: { name: string }; file: TFile }> = [];

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check if cr_type already exists
		if (!fm.cr_type) {
			changes.push({
				person: { name: person.name || 'Unknown' },
				file: person.file
			});
		}
	}

	console.debug(`[DEBUG] previewAddPersonType: Found ${changes.length} people needing cr_type`);

	// Show preview modal
	new AddPersonTypePreviewModal(
		app,
		changes,
		async () => await addPersonType(plugin, app, showTab)
	).open();
}

/**
 * Add cr_type: person to all person notes
 */
export async function addPersonType(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Adding cr_type property...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const modifiedFiles: TFile[] = [];
	const errors: string[] = [];

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Add cr_type if it doesn't exist
				if (!frontmatter.cr_type) {
					frontmatter.cr_type = 'person';
					hasChanges = true;
				}
			});

			if (hasChanges) {
				modified++;
				modifiedFiles.push(person.file);
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Added cr_type property to ${modified} ${pluralize(modified, 'file')}`);
	} else {
		new Notice('All person notes already have cr_type property');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Add person type errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache(modifiedFiles);

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview name formatting normalization
 */
export function previewNormalizeNames(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	const changes: Array<{ person: { name: string }; field: string; oldValue: string; newValue: string; file: TFile }> = [];

	/**
	 * Normalize a name to proper Title Case with smart handling of prefixes
	 */
	const normalizeName = (name: string): string | null => {
		if (!name || typeof name !== 'string') return null;

		// Trim and collapse multiple spaces
		const cleaned = name.trim().replace(/\s+/g, ' ');
		if (!cleaned) return null;

		// Helper function to normalize a single word/segment
		const normalizeWord = (word: string, isFirstWord: boolean): string => {
			if (!word) return word;

			const lowerWord = word.toLowerCase();

			// Preserve initials (A., B., A.B., H.G., etc.)
			// Matches patterns like "A.", "A.B.", "H.G.", etc.
			if (/^([a-z]\.)+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Preserve Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
			if (/^[ivx]+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Common surname prefixes that should stay lowercase (unless at start)
			const lowercasePrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'den', 'der', 'ten', 'ter', 'du'];
			if (!isFirstWord && lowercasePrefixes.includes(lowerWord)) {
				return lowerWord;
			}

			// Handle Mac prefix (but not "Mack" as a standalone name)
			// Only apply if there are at least 2 more letters after "Mac"
			if (lowerWord.startsWith('mac') && word.length > 5) {
				return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
			}

			// Handle Mc prefix
			if (lowerWord.startsWith('mc') && word.length > 2) {
				return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle O' prefix
			if (lowerWord.startsWith("o'") && word.length > 2) {
				return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle hyphenated names (Abdul-Aziz, Mary-Jane, etc.)
			if (word.includes('-')) {
				return word.split('-')
					.map(part => normalizeWord(part, false))
					.join('-');
			}

			// Standard title case
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		};

		// Split by spaces to get words
		const words = cleaned.split(' ');
		const normalized = words.map((word, index) => {
			// Handle parentheses - preserve content inside and apply title case
			if (word.startsWith('(') && word.endsWith(')')) {
				const inner = word.slice(1, -1);
				return '(' + normalizeWord(inner, false) + ')';
			}

			// Handle opening parenthesis
			if (word.startsWith('(')) {
				const inner = word.slice(1);
				return '(' + normalizeWord(inner, index === 0);
			}

			// Handle closing parenthesis
			if (word.endsWith(')')) {
				const inner = word.slice(0, -1);
				return normalizeWord(inner, false) + ')';
			}

			return normalizeWord(word, index === 0);
		});

		const result = normalized.join(' ');

		// Only return if it's different from the input
		return result !== cleaned ? result : null;
	};

	for (const person of people) {
		const cache = app.metadataCache.getFileCache(person.file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter as Record<string, unknown>;

		// Check name field
		if (fm.name && typeof fm.name === 'string') {
			const normalized = normalizeName(fm.name);
			if (normalized) {
				changes.push({
					person: { name: person.name || 'Unknown' },
					field: 'name',
					oldValue: fm.name,
					newValue: normalized,
					file: person.file
				});
			}
		}
	}

	if (changes.length === 0) {
		new Notice('No names need normalization');
		return;
	}

	const modal = new NameNormalizationPreviewModal(
		app,
		changes,
		async () => await normalizeNames(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Apply name formatting normalization
 */
export async function normalizeNames(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	new Notice('Normalizing name formatting...');

	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();
	const people = familyGraph.getAllPeople();

	let modified = 0;
	const modifiedFiles: TFile[] = [];
	const errors: string[] = [];

	/**
	 * Normalize a name to proper Title Case with smart handling of prefixes
	 */
	const normalizeName = (name: string): string | null => {
		if (!name || typeof name !== 'string') return null;

		// Trim and collapse multiple spaces
		const cleaned = name.trim().replace(/\s+/g, ' ');
		if (!cleaned) return null;

		// Helper function to normalize a single word/segment
		const normalizeWord = (word: string, isFirstWord: boolean): string => {
			if (!word) return word;

			const lowerWord = word.toLowerCase();

			// Preserve initials (A., B., A.B., H.G., etc.)
			// Matches patterns like "A.", "A.B.", "H.G.", etc.
			if (/^([a-z]\.)+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Preserve Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
			if (/^[ivx]+$/i.test(word)) {
				return word.toUpperCase();
			}

			// Common surname prefixes that should stay lowercase (unless at start)
			const lowercasePrefixes = ['van', 'von', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'den', 'der', 'ten', 'ter', 'du'];
			if (!isFirstWord && lowercasePrefixes.includes(lowerWord)) {
				return lowerWord;
			}

			// Handle Mac prefix (but not "Mack" as a standalone name)
			// Only apply if there are at least 2 more letters after "Mac"
			if (lowerWord.startsWith('mac') && word.length > 5) {
				return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
			}

			// Handle Mc prefix
			if (lowerWord.startsWith('mc') && word.length > 2) {
				return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle O' prefix
			if (lowerWord.startsWith("o'") && word.length > 2) {
				return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
			}

			// Handle hyphenated names (Abdul-Aziz, Mary-Jane, etc.)
			if (word.includes('-')) {
				return word.split('-')
					.map(part => normalizeWord(part, false))
					.join('-');
			}

			// Standard title case
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		};

		// Split by spaces to get words
		const words = cleaned.split(' ');
		const normalized = words.map((word, index) => {
			// Handle parentheses - preserve content inside and apply title case
			if (word.startsWith('(') && word.endsWith(')')) {
				const inner = word.slice(1, -1);
				return '(' + normalizeWord(inner, false) + ')';
			}

			// Handle opening parenthesis
			if (word.startsWith('(')) {
				const inner = word.slice(1);
				return '(' + normalizeWord(inner, index === 0);
			}

			// Handle closing parenthesis
			if (word.endsWith(')')) {
				const inner = word.slice(0, -1);
				return normalizeWord(inner, false) + ')';
			}

			return normalizeWord(word, index === 0);
		});

		const result = normalized.join(' ');

		// Only return if it's different from the input
		return result !== cleaned ? result : null;
	};

	for (const person of people) {

		try {
			const cache = app.metadataCache.getFileCache(person.file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter as Record<string, unknown>;
			let hasChanges = false;

			await app.fileManager.processFrontMatter(person.file, (frontmatter) => {
				// Normalize name field
				if (fm.name && typeof fm.name === 'string') {
					const normalized = normalizeName(fm.name);
					if (normalized) {
						frontmatter.name = normalized;
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
				modifiedFiles.push(person.file);
			}
		} catch (error) {
			errors.push(`${person.file.path}: ${getErrorMessage(error)}`);
		}
	}

	// Show result
	if (modified > 0) {
		new Notice(`\u2713 Normalized names in ${modified} ${pluralize(modified, 'file')}`);
	} else {
		new Notice('No names needed normalization');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Normalize names errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache(modifiedFiles);

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview orphaned cr_id reference removal
 */
export function previewRemoveOrphanedRefs(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): void {
	const changes: Array<{ person: { name: string; file: TFile }; field: string; orphanedId: string }> = [];

	// Build a map of all valid cr_ids
	const validCrIds = new Set<string>();
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id;
		if (crId && typeof crId === 'string') {
			validCrIds.add(crId);
		}
	}

	// Check each person for orphaned references
	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter?.cr_id) continue;

		const fm = cache.frontmatter as Record<string, unknown>;
		const personName = (fm.name as string) || file.basename;

		// Check father_id
		const fatherId = fm.father_id;
		if (fatherId && typeof fatherId === 'string' && !validCrIds.has(fatherId)) {
			changes.push({
				person: { name: personName, file },
				field: 'father_id',
				orphanedId: fatherId
			});
		}

		// Check mother_id
		const motherId = fm.mother_id;
		if (motherId && typeof motherId === 'string' && !validCrIds.has(motherId)) {
			changes.push({
				person: { name: personName, file },
				field: 'mother_id',
				orphanedId: motherId
			});
		}

		// Check spouse_id (can be string or array)
		const spouseId = fm.spouse_id;
		if (spouseId) {
			const spouseIds = Array.isArray(spouseId) ? spouseId : [spouseId];
			for (const id of spouseIds) {
				if (typeof id === 'string' && !validCrIds.has(id)) {
					changes.push({
						person: { name: personName, file },
						field: 'spouse_id',
						orphanedId: id
					});
				}
			}
		}

		// Check partners_id (alias for spouse_id)
		const partnersId = fm.partners_id;
		if (partnersId) {
			const partnerIds = Array.isArray(partnersId) ? partnersId : [partnersId];
			for (const id of partnerIds) {
				if (typeof id === 'string' && !validCrIds.has(id)) {
					changes.push({
						person: { name: personName, file },
						field: 'partners_id',
						orphanedId: id
					});
				}
			}
		}

		// Check children_id (can be string or array)
		const childrenId = fm.children_id;
		if (childrenId) {
			const childrenIds = Array.isArray(childrenId) ? childrenId : [childrenId];
			for (const id of childrenIds) {
				if (typeof id === 'string' && !validCrIds.has(id)) {
					changes.push({
						person: { name: personName, file },
						field: 'children_id',
						orphanedId: id
					});
				}
			}
		}
	}

	if (changes.length === 0) {
		new Notice('No orphaned cr_id references found');
		return;
	}

	const modal = new OrphanedRefsPreviewModal(
		app,
		changes,
		async () => await removeOrphanedRefs(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Remove orphaned cr_id references
 */
export async function removeOrphanedRefs(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();

	let modified = 0;
	const modifiedFiles: TFile[] = [];
	const errors: Array<{ file: string; error: string }> = [];

	new Notice('Removing orphaned cr_id references...');

	// Build a map of all valid cr_ids
	const validCrIds = new Set<string>();
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		const crId = cache?.frontmatter?.cr_id;
		if (crId && typeof crId === 'string') {
			validCrIds.add(crId);
		}
	}

	// Process each file
	for (const file of files) {

		try {
			const cache = app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter?.cr_id) continue;

			let hasChanges = false;

			await app.fileManager.processFrontMatter(file, (frontmatter) => {
				// Clean father_id
				if (frontmatter.father_id && typeof frontmatter.father_id === 'string') {
					if (!validCrIds.has(frontmatter.father_id)) {
						delete frontmatter.father_id;
						hasChanges = true;
					}
				}

				// Clean mother_id
				if (frontmatter.mother_id && typeof frontmatter.mother_id === 'string') {
					if (!validCrIds.has(frontmatter.mother_id)) {
						delete frontmatter.mother_id;
						hasChanges = true;
					}
				}

				// Clean spouse_id
				if (frontmatter.spouse_id) {
					const spouseIds = Array.isArray(frontmatter.spouse_id)
						? frontmatter.spouse_id
						: [frontmatter.spouse_id];
					const validSpouseIds = spouseIds.filter((id: unknown) =>
						typeof id === 'string' && validCrIds.has(id)
					);

					if (validSpouseIds.length !== spouseIds.length) {
						if (validSpouseIds.length === 0) {
							delete frontmatter.spouse_id;
						} else if (validSpouseIds.length === 1) {
							frontmatter.spouse_id = validSpouseIds[0];
						} else {
							frontmatter.spouse_id = validSpouseIds;
						}
						hasChanges = true;
					}
				}

				// Clean partners_id
				if (frontmatter.partners_id) {
					const partnerIds = Array.isArray(frontmatter.partners_id)
						? frontmatter.partners_id
						: [frontmatter.partners_id];
					const validPartnerIds = partnerIds.filter((id: unknown) =>
						typeof id === 'string' && validCrIds.has(id)
					);

					if (validPartnerIds.length !== partnerIds.length) {
						if (validPartnerIds.length === 0) {
							delete frontmatter.partners_id;
						} else if (validPartnerIds.length === 1) {
							frontmatter.partners_id = validPartnerIds[0];
						} else {
							frontmatter.partners_id = validPartnerIds;
						}
						hasChanges = true;
					}
				}

				// Clean children_id
				if (frontmatter.children_id) {
					const childrenIds = Array.isArray(frontmatter.children_id)
						? frontmatter.children_id
						: [frontmatter.children_id];
					const validChildrenIds = childrenIds.filter((id: unknown) =>
						typeof id === 'string' && validCrIds.has(id)
					);

					if (validChildrenIds.length !== childrenIds.length) {
						if (validChildrenIds.length === 0) {
							delete frontmatter.children_id;
						} else if (validChildrenIds.length === 1) {
							frontmatter.children_id = validChildrenIds[0];
						} else {
							frontmatter.children_id = validChildrenIds;
						}
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				modified++;
				modifiedFiles.push(file);
			}
		} catch (error) {
			errors.push({
				file: file.path,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	if (modified > 0) {
		new Notice(`\u2713 Removed orphaned references from ${modified} ${pluralize(modified, 'file')}`);
	} else {
		new Notice('No orphaned cr_id references found');
	}

	if (errors.length > 0) {
		new Notice(`\u26A0 ${errors.length} errors occurred. Check console for details.`);
		console.error('Remove orphaned refs errors:', errors);
	}

	// Refresh the family graph cache
	await familyGraph.reloadCache(modifiedFiles);

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview fixing bidirectional relationship inconsistencies
 */
export async function previewFixBidirectionalRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	// Create folder filter and family graph service
	const folderFilter1 = new FolderFilterService(plugin.settings);
	const familyGraph1 = plugin.createFamilyGraphService();
	// Force reload to ensure we have fresh data (cache may be stale after previous fixes)
	await familyGraph1.reloadCache();
	familyGraph1.setFolderFilter(folderFilter1);
	familyGraph1.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph1.setValueAliases(plugin.settings.valueAliases);

	const dataQuality1 = new DataQualityService(
		app,
		plugin.settings,
		familyGraph1,
		folderFilter1,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality1.setPersonIndex(plugin.personIndex);
	}

	new Notice('Detecting bidirectional relationship inconsistencies...');

	const inconsistencies = dataQuality1.detectBidirectionalInconsistencies();

	if (inconsistencies.length === 0) {
		new Notice('No bidirectional relationship inconsistencies found');
		return;
	}

	// Separate fixable inconsistencies from conflicts
	const fixableInconsistencies = inconsistencies.filter(i => i.type !== 'conflicting-parent-claim');
	const conflictCount = inconsistencies.filter(i => i.type === 'conflicting-parent-claim').length;

	// Notify about conflicts (handled separately in People tab)
	if (conflictCount > 0) {
		new Notice(`Found ${conflictCount} parent claim ${pluralize(conflictCount, 'conflict')}. See the "Parent claim conflicts" card in the People tab to resolve.`, 8000);
	}

	if (fixableInconsistencies.length === 0) {
		if (conflictCount > 0) {
			new Notice('No auto-fixable inconsistencies found. Only conflicts requiring manual resolution.');
		}
		return;
	}

	// Transform fixable inconsistencies to modal format
	const changes = fixableInconsistencies.map((issue: BidirectionalInconsistency) => ({
		person: {
			name: issue.person.name || issue.person.file.basename,
			file: issue.person.file
		},
		relatedPerson: {
			name: issue.relatedPerson.name || issue.relatedPerson.file.basename,
			file: issue.relatedPerson.file
		},
		type: issue.type,
		description: issue.description
	}));

	const modal = new BidirectionalInconsistencyPreviewModal(
		app,
		changes,
		async () => await fixBidirectionalRelationships(plugin, app, showTab)
	);
	modal.open();
}

/**
 * Fix bidirectional relationship inconsistencies
 */
export async function fixBidirectionalRelationships(plugin: CanvasRootsPlugin, app: App, showTab: (tabId: string) => void): Promise<void> {
	// Create folder filter and family graph service
	const folderFilter2 = new FolderFilterService(plugin.settings);
	const familyGraph2 = plugin.createFamilyGraphService();
	// Force reload to ensure we have fresh data before fixing
	await familyGraph2.reloadCache();
	familyGraph2.setFolderFilter(folderFilter2);
	familyGraph2.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph2.setValueAliases(plugin.settings.valueAliases);

	const dataQuality2 = new DataQualityService(
		app,
		plugin.settings,
		familyGraph2,
		folderFilter2,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality2.setPersonIndex(plugin.personIndex);
	}

	new Notice('Detecting inconsistencies...');

	const inconsistencies = dataQuality2.detectBidirectionalInconsistencies();

	if (inconsistencies.length === 0) {
		new Notice('No bidirectional relationship inconsistencies found');
		return;
	}

	new Notice('Fixing bidirectional relationship inconsistencies...');

	// Suspend automatic bidirectional linking during batch operation
	// to prevent interference with our updates
	plugin.bidirectionalLinker?.suspend();

	try {
		const result = await dataQuality2.fixBidirectionalInconsistencies(inconsistencies);

		if (result.modified > 0) {
			new Notice(`\u2713 Fixed ${result.modified} of ${result.processed} ${pluralize(result.processed, 'inconsistency', 'inconsistencies')}. Wait a moment before re-checking.`, 5000);
		} else {
			new Notice('No inconsistencies were fixed');
		}

		if (result.errors.length > 0) {
			new Notice(`\u26A0 ${result.errors.length} errors occurred. Check console for details.`);
			console.error('Fix bidirectional relationships errors:', result.errors);
		}

		// Wait for all pending file watcher events to process before resuming linker
		// This prevents the bidirectional linker from reverting our fixes
		await new Promise(resolve => window.setTimeout(resolve, 500));
	} finally {
		// Always resume bidirectional linking, even if errors occurred
		plugin.bidirectionalLinker?.resume();
	}

	// Refresh the People tab
	showTab('people');
}

/**
 * Preview impossible dates detection
 */
export function previewDetectImpossibleDates(plugin: CanvasRootsPlugin, app: App): void {
	const folderFilter3 = new FolderFilterService(plugin.settings);
	const familyGraph3 = plugin.createFamilyGraphService();
	familyGraph3.ensureCacheLoaded();
	familyGraph3.setFolderFilter(folderFilter3);
	familyGraph3.setPropertyAliases(plugin.settings.propertyAliases);
	familyGraph3.setValueAliases(plugin.settings.valueAliases);

	const dataQuality3 = new DataQualityService(
		app,
		plugin.settings,
		familyGraph3,
		folderFilter3,
		plugin
	);
	if (plugin.personIndex) {
		dataQuality3.setPersonIndex(plugin.personIndex);
	}

	const issues = dataQuality3.detectImpossibleDates();

	// Transform to modal format
	const previewItems = issues.map((issue: ImpossibleDateIssue) => ({
		person: {
			name: issue.person.name || issue.person.file.basename,
			file: issue.person.file
		},
		relatedPerson: issue.relatedPerson ? {
			name: issue.relatedPerson.name || issue.relatedPerson.file.basename,
			file: issue.relatedPerson.file
		} : undefined,
		type: issue.type,
		description: issue.description,
		personDate: issue.personDate,
		relatedDate: issue.relatedDate
	}));

	// Open modal
	const modal = new ImpossibleDatesPreviewModal(app, previewItems);
	modal.open();
}

/**
 * Preview date format validation
 */
export function previewValidateDates(plugin: CanvasRootsPlugin, app: App): void {
	const familyGraph = plugin.createFamilyGraphService();
	familyGraph.ensureCacheLoaded();

	const issues: Array<{
		file: TFile;
		name: string;
		field: string;
		value: string;
		issue: string;
	}> = [];

	new Notice('Analyzing date formats...');

	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter?.cr_id) continue;

		const fm = cache.frontmatter as Record<string, unknown>;
		const name = (fm.name as string) || file.basename;

		// Skip fictional dates (they have fc-calendar property)
		if (fm['fc-calendar']) continue;

		// Check born/birth_date field
		const born = fm.born || fm.birth_date;
		if (born && typeof born === 'string') {
			const issue = validateDateFormat(born, plugin);
			if (issue) {
				issues.push({
					file,
					name,
					field: fm.born ? 'born' : 'birth_date',
					value: born,
					issue
				});
			}
		}

		// Check died/death_date field
		const died = fm.died || fm.death_date;
		if (died && typeof died === 'string') {
			const issue = validateDateFormat(died, plugin);
			if (issue) {
				issues.push({
					file,
					name,
					field: fm.died ? 'died' : 'death_date',
					value: died,
					issue
				});
			}
		}
	}

	if (issues.length === 0) {
		new Notice('\u2713 All dates are valid according to your validation settings');
		return;
	}

	// Show preview modal
	new DateValidationPreviewModal(app, plugin, issues).open();
}

/**
 * Validate a date string according to current settings
 * @returns Issue description if invalid, null if valid
 */
function validateDateFormat(dateStr: string, plugin: CanvasRootsPlugin): string | null {
	const settings = plugin.settings;
	const trimmed = dateStr.trim();

	// Check for circa dates
	const circaPrefixes = ['c.', 'ca.', 'circa', '~'];
	const hasCirca = circaPrefixes.some(prefix =>
		trimmed.toLowerCase().startsWith(prefix) ||
		trimmed.toLowerCase().startsWith(prefix + ' ')
	);

	if (hasCirca && !settings.allowCircaDates) {
		return 'Circa dates not allowed (check "Allow circa dates" setting)';
	}

	// Remove circa prefix for further validation
	let cleanDate = trimmed;
	if (hasCirca) {
		for (const prefix of circaPrefixes) {
			if (cleanDate.toLowerCase().startsWith(prefix)) {
				cleanDate = cleanDate.slice(prefix.length).trim();
				break;
			}
			if (cleanDate.toLowerCase().startsWith(prefix + ' ')) {
				cleanDate = cleanDate.slice(prefix.length + 1).trim();
				break;
			}
		}
	}

	// Check for date ranges
	const hasRange = cleanDate.includes(' to ') ||
		(cleanDate.includes('-') && cleanDate.split('-').length === 3 && cleanDate.split('-')[2].length === 4);

	if (hasRange && !settings.allowDateRanges) {
		return 'Date ranges not allowed (check "Allow date ranges" setting)';
	}

	// If it's a range, validate each part separately
	if (hasRange) {
		const parts = cleanDate.includes(' to ')
			? cleanDate.split(' to ')
			: cleanDate.split('-').slice(0, 2);

		for (const part of parts) {
			const partIssue = validateSingleDate(part.trim(), plugin);
			if (partIssue) return partIssue;
		}
		return null;
	}

	// Validate single date
	return validateSingleDate(cleanDate, plugin);
}

/**
 * Validate a single date (not a range) according to current settings
 */
function validateSingleDate(dateStr: string, plugin: CanvasRootsPlugin): string | null {
	const settings = plugin.settings;

	// ISO 8601 format: YYYY-MM-DD or YYYY-MM or YYYY
	const iso8601Full = /^(\d{4})-(\d{2})-(\d{2})$/;
	const iso8601Month = /^(\d{4})-(\d{2})$/;
	const iso8601Year = /^(\d{4})$/;
	const iso8601NoZeros = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

	// GEDCOM format: DD MMM YYYY or DD MMM or MMM YYYY
	const gedcomFull = /^(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/i;
	const gedcomMonth = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})$/i;

	// Check for standard: ISO 8601
	if (settings.dateFormatStandard === 'iso8601') {
		// Check if leading zeros are required
		if (settings.requireLeadingZeros) {
			if (iso8601Full.test(dateStr)) return null;
			if (settings.allowPartialDates && iso8601Month.test(dateStr)) return null;
			if (settings.allowPartialDates && iso8601Year.test(dateStr)) return null;
			return 'ISO 8601 format required with leading zeros (YYYY-MM-DD)';
		} else {
			if (iso8601Full.test(dateStr) || iso8601NoZeros.test(dateStr)) return null;
			if (settings.allowPartialDates && (iso8601Month.test(dateStr) || iso8601Year.test(dateStr))) return null;
			return 'ISO 8601 format required (YYYY-MM-DD or YYYY-M-D)';
		}
	}

	// Check for standard: GEDCOM
	if (settings.dateFormatStandard === 'gedcom') {
		if (gedcomFull.test(dateStr)) return null;
		if (settings.allowPartialDates && gedcomMonth.test(dateStr)) return null;
		if (settings.allowPartialDates && iso8601Year.test(dateStr)) return null;
		return 'GEDCOM format required (DD MMM YYYY, e.g., 15 JAN 1920)';
	}

	// Flexible standard: accept multiple formats
	if (settings.dateFormatStandard === 'flexible') {
		// Accept ISO 8601 formats
		if (iso8601Full.test(dateStr) || (!settings.requireLeadingZeros && iso8601NoZeros.test(dateStr))) return null;
		if (settings.allowPartialDates && (iso8601Month.test(dateStr) || iso8601Year.test(dateStr))) return null;

		// Accept GEDCOM formats
		if (gedcomFull.test(dateStr)) return null;
		if (settings.allowPartialDates && gedcomMonth.test(dateStr)) return null;

		// If we got here, the format is not recognized
		return 'Unrecognized date format (expected YYYY-MM-DD or DD MMM YYYY)';
	}

	return 'Unknown date format standard';
}

/**
 * Apply date format validation (currently just shows preview)
 * Note: We don't auto-correct dates as this could introduce errors
 */
export function validateDates(plugin: CanvasRootsPlugin, app: App): void {
	new Notice('Date validation is preview-only. Review issues and manually correct dates in your notes.');
	previewValidateDates(plugin, app);
}