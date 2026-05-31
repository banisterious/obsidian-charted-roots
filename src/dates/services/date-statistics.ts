/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Obsidian frontmatter/file caches are any-typed surfaces; project policy accepts these. */
/**
 * Date statistics for the Events tab Statistics card.
 *
 * Pure (UI-free) so it can be unit-tested without dragging in the Events tab's
 * modal/exporter graph. Counters route through the shared DateService rather
 * than local regex heuristics so the card agrees with what the plugin actually
 * parses as a fictional date elsewhere (#648).
 */

import type CanvasRootsPlugin from '../../../main';
import type { DateService } from './date-service';
import { DEFAULT_DATE_SYSTEMS } from '../constants/default-date-systems';
import { PropertyAliasService } from '../../core/property-alias-service';
import { isEventNote, isPersonNote } from '../../utils/note-type-detection';

/**
 * Statistics about dates in the vault
 */
export interface DateStatistics {
	totalPersons: number;
	withBirthDates: number;
	withDeathDates: number;
	withFictionalDates: number;
	systemsInUse: Array<{ name: string; count: number }>;
}

/**
 * Whether a date string parses as a fictional date under the shared date
 * service. Using the service (rather than a local regex heuristic) keeps the
 * Statistics card's fictional-date count in agreement with what the plugin
 * actually parses on timelines and age annotations — including approximation
 * markers, ISO-style month/day suffixes, and time suffixes (#648).
 *
 * Returns false when fictional dates are disabled (dateService is null).
 */
function isFictionalDate(dateService: DateService | null, dateStr: string): boolean {
	return dateService?.parseDate(dateStr)?.type === 'fictional';
}

/**
 * Try to detect which date system a date string belongs to
 */
function detectDateSystem(dateStr: string, plugin: CanvasRootsPlugin): string | null {
	// Get all active systems
	const systems = [];

	if (plugin.settings.showBuiltInDateSystems) {
		systems.push(...DEFAULT_DATE_SYSTEMS);
	}

	systems.push(...plugin.settings.fictionalDateSystems);

	// Check each system's era abbreviations
	const normalizedDate = dateStr.toUpperCase();
	for (const system of systems) {
		for (const era of system.eras) {
			if (normalizedDate.includes(era.abbrev.toUpperCase())) {
				return system.name;
			}
		}
	}

	return null;
}

/**
 * Calculate date statistics from person and event notes
 */
export function calculateDateStatistics(plugin: CanvasRootsPlugin): DateStatistics {
	const stats: DateStatistics = {
		totalPersons: 0,
		withBirthDates: 0,
		withDeathDates: 0,
		withFictionalDates: 0,
		systemsInUse: []
	};

	// Get all markdown files
	const files = plugin.app.vault.getMarkdownFiles();
	const systemCounts: Record<string, number> = {};
	const aliasService = new PropertyAliasService(plugin);
	const dateService = plugin.getDateService();

	for (const file of files) {
		const cache = plugin.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) continue;

		const isPerson = isPersonNote(frontmatter, cache, plugin.settings.noteTypeDetection);
		const isEvent = !isPerson && isEventNote(frontmatter, cache, plugin.settings.noteTypeDetection);
		if (!isPerson && !isEvent) continue;

		if (isPerson) {
			stats.totalPersons++;

			// A person counts once toward withFictionalDates if EITHER its birth
			// or death date parses as fictional, and contributes its date system
			// once (preferring birth). Routing through the shared date service
			// keeps this in sync with what the plugin parses elsewhere — the old
			// local heuristic missed approximation markers (DE ~310), ISO-style
			// month/day suffixes (DE 1264-08), and time suffixes (#648).
			let personIsFictional = false;
			let personSystem: string | null = null;

			// Check for birth date using property alias service
			// Also check common alternatives (birth_date) directly
			const bornValue = aliasService.resolve(frontmatter, 'born') ?? frontmatter.birth_date;
			if (bornValue !== undefined && bornValue !== null && bornValue !== '') {
				stats.withBirthDates++;

				if (typeof bornValue === 'string' && isFictionalDate(dateService, bornValue)) {
					personIsFictional = true;
					personSystem = detectDateSystem(bornValue, plugin);
				}
			}

			// Check for death date using property alias service
			// Also check common alternatives (death_date) directly
			const diedValue = aliasService.resolve(frontmatter, 'died') ?? frontmatter.death_date;
			if (diedValue !== undefined && diedValue !== null && diedValue !== '') {
				stats.withDeathDates++;

				// Count a death-only fictional date too (e.g. "PEF 260ish" with no
				// born) — previously this branch tallied the system but never the
				// person, so death-only fictional people went uncounted (#648).
				if (typeof diedValue === 'string' && isFictionalDate(dateService, diedValue)) {
					personIsFictional = true;
					if (!personSystem) {
						personSystem = detectDateSystem(diedValue, plugin);
					}
				}
			}

			if (personIsFictional) {
				stats.withFictionalDates++;
				if (personSystem) {
					systemCounts[personSystem] = (systemCounts[personSystem] || 0) + 1;
				}
			}
		} else {
			// Event notes: count fictional `date` (#644). Each event with a
			// fictional date contributes to withFictionalDates one-for-one,
			// mirroring how each person's fictional `born` contributes above.
			// Without this branch the Events tab Statistics card was counting
			// only person notes despite the label saying "notes".
			const dateValue = aliasService.resolve(frontmatter, 'date');
			if (typeof dateValue === 'string' && dateValue !== '' && isFictionalDate(dateService, dateValue)) {
				stats.withFictionalDates++;
				const systemName = detectDateSystem(dateValue, plugin);
				if (systemName) {
					systemCounts[systemName] = (systemCounts[systemName] || 0) + 1;
				}
			}
		}
	}

	// Convert system counts to array
	stats.systemsInUse = Object.entries(systemCounts)
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);

	return stats;
}
