/**
 * Events Tab UI Component
 *
 * Renders the Events tab in the Control Center, showing
 * date systems configuration and temporal data statistics.
 */

import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import { createDateSystemsCard } from './date-systems-card';

/**
 * Render the Events tab content
 */
export function renderEventsTab(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement,
	showTab: (tabId: string) => void
): void {
	// Date Systems card (moved from Canvas Settings)
	const dateSystemsCard = createDateSystemsCard(
		container,
		plugin,
		createCard
	);
	container.appendChild(dateSystemsCard);

	// Statistics card
	renderStatisticsCard(container, plugin, createCard);
}

/**
 * Render the Statistics card with date coverage metrics
 */
function renderStatisticsCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName }) => HTMLElement
): void {
	const card = createCard({
		title: 'Statistics',
		icon: 'bar-chart'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Get person notes with date information
	const stats = calculateDateStatistics(plugin);

	// Date coverage section
	const coverageSection = content.createDiv({ cls: 'cr-stats-section' });
	coverageSection.createEl('h4', { text: 'Date coverage', cls: 'cr-subsection-heading' });

	const coverageList = coverageSection.createEl('ul', { cls: 'cr-stats-list' });

	// Birth dates
	const birthItem = coverageList.createEl('li');
	const birthPercent = stats.totalPersons > 0
		? Math.round((stats.withBirthDates / stats.totalPersons) * 100)
		: 0;
	birthItem.setText(`${stats.withBirthDates} of ${stats.totalPersons} person notes have birth dates (${birthPercent}%)`);

	// Death dates
	const deathItem = coverageList.createEl('li');
	const deathPercent = stats.totalPersons > 0
		? Math.round((stats.withDeathDates / stats.totalPersons) * 100)
		: 0;
	deathItem.setText(`${stats.withDeathDates} of ${stats.totalPersons} person notes have death dates (${deathPercent}%)`);

	// Fictional dates section (only show if fictional dates are enabled)
	if (plugin.settings.enableFictionalDates) {
		const fictionalSection = content.createDiv({ cls: 'cr-stats-section' });
		fictionalSection.createEl('h4', { text: 'Fictional dates', cls: 'cr-subsection-heading' });

		const fictionalList = fictionalSection.createEl('ul', { cls: 'cr-stats-list' });

		// Count of notes using fictional dates
		const fictionalItem = fictionalList.createEl('li');
		fictionalItem.setText(`${stats.withFictionalDates} notes use fictional date systems`);

		// Systems in use
		if (stats.systemsInUse.length > 0) {
			const systemsItem = fictionalList.createEl('li');
			const systemsText = stats.systemsInUse
				.map(s => `${s.name} (${s.count})`)
				.join(', ');
			systemsItem.setText(`Systems in use: ${systemsText}`);
		}
	}

	// Empty state if no persons
	if (stats.totalPersons === 0) {
		content.empty();
		const emptyState = content.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No person notes found.',
			cls: 'crc-text-muted'
		});
		emptyState.createEl('p', {
			text: 'Create person notes with type: person in frontmatter to see date statistics.',
			cls: 'crc-text-muted'
		});
	}

	container.appendChild(card);
}

/**
 * Statistics about dates in the vault
 */
interface DateStatistics {
	totalPersons: number;
	withBirthDates: number;
	withDeathDates: number;
	withFictionalDates: number;
	systemsInUse: Array<{ name: string; count: number }>;
}

/**
 * Calculate date statistics from person notes
 */
function calculateDateStatistics(plugin: CanvasRootsPlugin): DateStatistics {
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

	for (const file of files) {
		const cache = plugin.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) continue;

		// Check if this is a person note
		if (frontmatter.type !== 'person') continue;

		stats.totalPersons++;

		// Check for birth date
		const bornValue = frontmatter.born;
		if (bornValue !== undefined && bornValue !== null && bornValue !== '') {
			stats.withBirthDates++;

			// Check if it looks like a fictional date (has era abbreviation)
			if (typeof bornValue === 'string' && looksLikeFictionalDate(bornValue)) {
				stats.withFictionalDates++;
				const systemName = detectDateSystem(bornValue, plugin);
				if (systemName) {
					systemCounts[systemName] = (systemCounts[systemName] || 0) + 1;
				}
			}
		}

		// Check for death date
		const diedValue = frontmatter.died;
		if (diedValue !== undefined && diedValue !== null && diedValue !== '') {
			stats.withDeathDates++;

			// Also check died for fictional date (if born wasn't fictional)
			if (typeof diedValue === 'string' && looksLikeFictionalDate(diedValue)) {
				const systemName = detectDateSystem(diedValue, plugin);
				if (systemName && !systemCounts[systemName]) {
					// Only count the system once per person
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

/**
 * Check if a date string looks like a fictional date (has era abbreviation)
 */
function looksLikeFictionalDate(dateStr: string): boolean {
	// Look for era patterns like "TA 2941", "AC 300", "BBY 19"
	return /^[A-Z]{1,4}\s+\d+/i.test(dateStr.trim()) ||
		/\d+\s+[A-Z]{1,4}$/i.test(dateStr.trim());
}

/**
 * Try to detect which date system a date string belongs to
 */
function detectDateSystem(dateStr: string, plugin: CanvasRootsPlugin): string | null {
	// Get all active systems
	const systems = [];

	if (plugin.settings.showBuiltInDateSystems) {
		// Import DEFAULT_DATE_SYSTEMS lazily to avoid circular deps
		const { DEFAULT_DATE_SYSTEMS } = require('../constants/default-date-systems');
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
