/**
 * Dynamic Content Service
 *
 * Shared utilities for dynamic note content processors:
 * - Parse YAML-like config from code block source
 * - Resolve current note's cr_id from MarkdownPostProcessorContext
 * - Provide access to FamilyGraphService and EventService
 */

import { MarkdownPostProcessorContext, TFile, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { FamilyGraphService, PersonNode } from '../../core/family-graph';
import type { EventService } from '../../events/services/event-service';
import type { EventNote } from '../../events/types/event-types';
import { RelationshipService } from '../../relationships/services/relationship-service';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';
import { splitAndTrim } from '../../utils/format-utils';
import { getLogger } from '../../core/logging';

const logger = getLogger('DynamicContentService');

/** Block type for freeze operations */
export type DynamicBlockType = 'charted-roots-timeline' | 'charted-roots-relationships' | 'charted-roots-media' | 'charted-roots-source-roles' | 'charted-roots-transfers' | 'charted-roots-members' | 'charted-roots-sources' | 'charted-roots-extractions' | 'charted-roots-negative-findings' | 'charted-roots-research-timeline';

/**
 * Parsed configuration from a code block
 */
export interface DynamicBlockConfig {
	[key: string]: string | number | boolean | string[];
}

/**
 * Context for rendering a dynamic block
 */
export interface DynamicBlockContext {
	/** The note file containing the code block */
	file: TFile;
	/** The cr_id of the person in the current note (if it's a person note) */
	crId: string | undefined;
	/** The resolved PersonNode (if the note is a person note) */
	person: PersonNode | undefined;
	/** Access to the FamilyGraphService */
	familyGraph: FamilyGraphService;
	/** Access to the EventService */
	eventService: EventService | null;
}

/**
 * Service providing shared utilities for dynamic content processors
 */
export class DynamicContentService {
	private plugin: CanvasRootsPlugin;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Get the plugin settings
	 */
	getSettings() {
		return this.plugin.settings;
	}

	/**
	 * Get the Obsidian App instance
	 */
	getApp() {
		return this.plugin.app;
	}

	/**
	 * Get the DateService instance (may be null if the plugin hasn't
	 * finished onload). Used by renderers that need era-aware date
	 * arithmetic (e.g., age calculations across descending fictional eras).
	 */
	getDateService() {
		return this.plugin.getDateService?.() ?? null;
	}

	/**
	 * Construct a RelationshipService instance. Used by renderers that need
	 * to query non-tree-structure relationships (e.g. manual siblings).
	 */
	createRelationshipService(): RelationshipService {
		return new RelationshipService(this.plugin);
	}

	/**
	 * Parse YAML-like config from code block source
	 * Supports simple key: value pairs and arrays
	 *
	 * Example input:
	 * ```
	 * sort: chronological
	 * include: birth, death, marriage
	 * limit: 10
	 * ```
	 */
	parseConfig(source: string): DynamicBlockConfig {
		const config: DynamicBlockConfig = {};
		const lines = source.trim().split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) {
				continue; // Skip empty lines and comments
			}

			const colonIndex = trimmed.indexOf(':');
			if (colonIndex === -1) {
				continue; // Skip lines without a colon
			}

			const key = trimmed.slice(0, colonIndex).trim();
			const value = trimmed.slice(colonIndex + 1).trim();

			if (!key) {
				continue;
			}

			// Parse the value
			config[key] = this.parseValue(value);
		}

		return config;
	}

	/**
	 * Parse a single value from config
	 * - Comma-separated values become arrays (but not if commas are inside wikilinks)
	 * - "true"/"false" become booleans
	 * - Numbers become numbers
	 * - Everything else stays as string
	 */
	private parseValue(value: string): string | number | boolean | string[] {
		// Check for comma-separated list, but only split if commas are outside wikilinks
		// This prevents breaking values like [[Person Name|Alias]] or [[Place, City]]
		if (value.includes(',')) {
			// Count brackets to determine if commas are inside wikilinks
			let bracketDepth = 0;
			let hasCommaOutsideBrackets = false;

			for (let i = 0; i < value.length; i++) {
				if (value[i] === '[' && value[i + 1] === '[') {
					bracketDepth++;
					i++; // Skip next bracket
				} else if (value[i] === ']' && value[i + 1] === ']') {
					bracketDepth--;
					i++; // Skip next bracket
				} else if (value[i] === ',' && bracketDepth === 0) {
					hasCommaOutsideBrackets = true;
					break;
				}
			}

			// Only split on commas if we found commas outside wikilinks
			if (hasCommaOutsideBrackets) {
				return splitAndTrim(value);
			}
		}

		// Check for boolean
		const lower = value.toLowerCase();
		if (lower === 'true') return true;
		if (lower === 'false') return false;

		// Check for number
		const num = Number(value);
		if (!isNaN(num) && value.length > 0) {
			return num;
		}

		return value;
	}

	/**
	 * Build context for rendering a dynamic block.
	 * Returns null when the source file can't be resolved (e.g. the container note
	 * was renamed or deleted while a registered metadata handler still fires for
	 * the old path). Callers should skip the render in that case.
	 */
	buildContext(ctx: MarkdownPostProcessorContext): DynamicBlockContext | null {
		const app = this.plugin.app;

		// Get the file from the source path
		const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(file instanceof TFile)) {
			logger.warn('buildContext', `Source file not found, skipping render: ${ctx.sourcePath}`);
			return null;
		}

		// Create family graph service - force reload to get fresh data
		// This ensures newly created persons are included
		const familyGraph = this.plugin.createFamilyGraphService();
		familyGraph.clearCache();
		familyGraph.ensureCacheLoaded();

		// Get event service and invalidate its cache to pick up new events
		const eventService = this.plugin.getEventService();
		if (eventService) {
			eventService.invalidateCache();
		}

		// Try to get cr_id from the note's frontmatter
		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		const crId = this.plugin.resolveFrontmatterProperty<string>(frontmatter, 'cr_id');

		// Look up the person if we have a cr_id
		let person: PersonNode | undefined;
		if (crId) {
			person = familyGraph.getPersonByCrId(crId);
		}

		return {
			file,
			crId,
			person,
			familyGraph,
			eventService
		};
	}

	/**
	 * Get events for a person, sorted by date
	 * Combines events from EventService with birth/death from person note
	 */
	getPersonEvents(context: DynamicBlockContext, config: DynamicBlockConfig): EventNote[] {
		const { person, eventService, crId } = context;

		if (!eventService || !crId) {
			return [];
		}

		// Get events linked to this person from EventService
		const personLink = person?.file ? `[[${person.file.basename}]]` : '';
		const events = personLink ? eventService.getEventsForPerson(personLink) : [];

		// Apply include/exclude filters
		const include = config.include as string[] | undefined;
		const exclude = config.exclude as string[] | undefined;

		let filtered = events;

		if (include && include.length > 0) {
			filtered = filtered.filter(e => include.includes(e.eventType));
		}

		if (exclude && exclude.length > 0) {
			filtered = filtered.filter(e => !exclude.includes(e.eventType));
		}

		// Sort events
		const sortOrder = config.sort as string || 'chronological';
		filtered.sort((a, b) => {
			const dateA = this.extractSortableDate(a.date);
			const dateB = this.extractSortableDate(b.date);

			if (sortOrder === 'reverse') {
				return dateB - dateA;
			}
			return dateA - dateB;
		});

		// Apply limit
		const limit = config.limit as number | undefined;
		if (limit && limit > 0) {
			filtered = filtered.slice(0, limit);
		}

		return filtered;
	}

	/**
	 * Extract a sortable numeric date from a date string
	 * Returns a large number for dates that can't be parsed (pushes them to end)
	 */
	private extractSortableDate(dateStr: string | undefined): number {
		if (!dateStr) return Number.MAX_SAFE_INTEGER;

		// Try to extract year from various formats
		// ISO: 1845-03-15
		// GEDCOM: 15 MAR 1845
		// Simple year: 1845

		// ISO format
		const isoMatch = dateStr.match(/^(\d{4})-(\d{2})?-?(\d{2})?/);
		if (isoMatch) {
			const year = parseInt(isoMatch[1]);
			const month = isoMatch[2] ? parseInt(isoMatch[2]) : 0;
			const day = isoMatch[3] ? parseInt(isoMatch[3]) : 0;
			return year * 10000 + month * 100 + day;
		}

		// GEDCOM format (day month year)
		const gedcomMatch = dateStr.match(/(\d{1,2})?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)?\s*(\d{4})/i);
		if (gedcomMatch) {
			const year = parseInt(gedcomMatch[3]);
			const monthMap: Record<string, number> = {
				JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
				JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
			};
			const month = gedcomMatch[2] ? monthMap[gedcomMatch[2].toUpperCase()] || 0 : 0;
			const day = gedcomMatch[1] ? parseInt(gedcomMatch[1]) : 0;
			return year * 10000 + month * 100 + day;
		}

		// Simple 4-digit year
		const yearMatch = dateStr.match(/\b(\d{4})\b/);
		if (yearMatch) {
			return parseInt(yearMatch[1]) * 10000;
		}

		return Number.MAX_SAFE_INTEGER;
	}

	/**
	 * Format a date for display
	 * Converts ISO dates and GEDCOM qualifiers to a more readable format
	 */
	formatDate(dateStr: string | number | undefined | null): string {
		if (dateStr === undefined || dateStr === null || dateStr === '') return '';

		// Coerce to string so callers can pass YAML-parsed values directly.
		// Obsidian parses bare-year frontmatter like `died: 1893` as Number,
		// and calling `.trim()` / `.match()` on a number throws (#416).
		const value = typeof dateStr === 'string' ? dateStr : String(dateStr);
		const trimmed = value.trim();
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
			'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		// Handle BET X AND Y ranges → "X–Y"
		const betMatch = trimmed.match(/^BET\s+(\d{4})\s+AND\s+(\d{4})$/i);
		if (betMatch) {
			return `${betMatch[1]}–${betMatch[2]}`;
		}

		// Handle qualifiers with year only (ABT 1878 → "c. 1878")
		const qualifierYearMatch = trimmed.match(/^(ABT|BEF|AFT|CAL|EST)\s+(\d{4})$/i);
		if (qualifierYearMatch) {
			const qualifier = qualifierYearMatch[1].toUpperCase();
			const year = qualifierYearMatch[2];
			switch (qualifier) {
				case 'ABT':
				case 'CAL':
				case 'EST':
					return `c. ${year}`;
				case 'BEF':
					return `before ${year}`;
				case 'AFT':
					return `after ${year}`;
			}
		}

		// Handle qualifiers with ISO partial date (ABT 1855-03 → "c. Mar 1855")
		const qualifierPartialMatch = trimmed.match(/^(ABT|BEF|AFT|CAL|EST)\s+(\d{4})-(\d{2})$/i);
		if (qualifierPartialMatch) {
			const qualifier = qualifierPartialMatch[1].toUpperCase();
			const year = qualifierPartialMatch[2];
			const monthIdx = parseInt(qualifierPartialMatch[3]) - 1;
			const formattedDate = `${months[monthIdx]} ${year}`;
			switch (qualifier) {
				case 'ABT':
				case 'CAL':
				case 'EST':
					return `c. ${formattedDate}`;
				case 'BEF':
					return `before ${formattedDate}`;
				case 'AFT':
					return `after ${formattedDate}`;
			}
		}

		// If already in GEDCOM-like format, return as-is
		if (trimmed.match(/\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}/i)) {
			return trimmed;
		}

		// Convert ISO to readable format (YYYY-MM-DD → "D Mon YYYY")
		const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (isoMatch) {
			const year = isoMatch[1];
			const monthIdx = parseInt(isoMatch[2]) - 1;
			const day = parseInt(isoMatch[3]);
			return `${day} ${months[monthIdx]} ${year}`;
		}

		// Year-month only (YYYY-MM → "Mon YYYY")
		const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
		if (yearMonthMatch) {
			const year = yearMonthMatch[1];
			const monthIdx = parseInt(yearMonthMatch[2]) - 1;
			return `${months[monthIdx]} ${year}`;
		}

		return trimmed;
	}

	/**
	 * Extract year from a date string for display purposes
	 * Handles: ISO format (-0011, 0014), BCE/AD suffix (11 BCE, 14 AD), plain years
	 * Returns the year as a string, with negative sign for BCE dates
	 */
	extractYear(dateStr: string | number | undefined | null): string {
		if (dateStr === undefined || dateStr === null || dateStr === '') return '';

		// Coerce to string so callers can pass YAML-parsed values directly.
		// A bare-year frontmatter value like `died: 1893` is a Number at
		// runtime; calling `.match()` on a number throws (#416).
		const value = typeof dateStr === 'string' ? dateStr : String(dateStr);

		// Check for BCE/BC suffix (e.g., "11 BCE", "39 BC")
		const bceMatch = value.match(/(\d+)\s*(?:BCE|BC)\b/i);
		if (bceMatch) {
			return `-${bceMatch[1]}`;
		}

		// Check for ISO format with negative year (e.g., "-0011-01-15")
		const negativeIsoMatch = value.match(/^-(\d+)/);
		if (negativeIsoMatch) {
			return `-${parseInt(negativeIsoMatch[1], 10)}`;
		}

		// Check for AD/CE suffix (e.g., "14 AD", "100 CE") - return positive
		const adMatch = value.match(/(\d+)\s*(?:AD|CE)\b/i);
		if (adMatch) {
			return adMatch[1];
		}

		// Standard positive year (4 digits)
		const yearMatch = value.match(/\b(\d{4})\b/);
		if (yearMatch) {
			return yearMatch[1];
		}

		// Fallback: any digits
		const anyDigits = value.match(/(\d+)/);
		return anyDigits ? anyDigits[1] : '';
	}

	/**
	 * Strip wikilink brackets from a string
	 * Now supports alias format: [[basename|name]]
	 */
	stripWikilink(value: string | undefined): string {
		if (!value) return '';
		return extractWikilinkPath(value);
	}

	/**
	 * Freeze a dynamic block to static markdown
	 * Replaces the code block in the file with the generated markdown
	 */
	async freezeToMarkdown(
		file: TFile,
		blockType: DynamicBlockType,
		markdown: string
	): Promise<boolean> {
		try {
			const content = await this.plugin.app.vault.read(file);

			// Find the code block pattern
			// Match both charted-roots-* and canvas-roots-* prefixes so freeze works
			// regardless of which name the user wrote in their note
			const alt = blockType.startsWith('canvas-roots-')
				? blockType.replace('canvas-roots-', 'charted-roots-')
				: blockType.replace('charted-roots-', 'canvas-roots-');
			const blockPattern = new RegExp(
				'```(?:' + blockType + '|' + alt + ')[^\\n]*(?:\\r?\\n)[\\s\\S]*?```',
				'g'
			);

			const matches = content.match(blockPattern);
			if (!matches || matches.length === 0) {
				new Notice(`Could not find ${blockType} block in file`);
				return false;
			}

			// Replace the first match (in case there are multiple)
			const newContent = content.replace(blockPattern, markdown);

			if (newContent === content) {
				new Notice('No changes made');
				return false;
			}

			await this.plugin.app.vault.modify(file, newContent);
			new Notice('Block frozen to markdown');
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to freeze block: ${message}`);
			return false;
		}
	}
}

/**
 * Render a standardized error message in a dynamic content block.
 */
export function renderBlockError(el: HTMLElement, message: string): void {
	const container = el.createDiv({ cls: 'cr-dynamic-block cr-dynamic-block--error' });
	container.createDiv({ cls: 'cr-dynamic-block__error-message', text: message });
}

/**
 * Render a standardized loading state in a dynamic content block.
 */
export function renderBlockLoading(el: HTMLElement, message: string): void {
	const container = el.createDiv({ cls: 'cr-dynamic-block cr-dynamic-block--loading' });
	container.createDiv({ cls: 'cr-dynamic-block__loading-message', text: message });
}
