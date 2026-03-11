/**
 * Command Menu / Multi-Action Launcher
 *
 * A searchable, categorized modal that provides quick access to all plugin
 * commands via a single hotkey. Uses Obsidian's SuggestModal for built-in
 * search, keyboard navigation, and fuzzy matching.
 *
 * @see https://github.com/banisterious/obsidian-charted-roots/issues/290
 */

import { SuggestModal, setIcon } from 'obsidian';
import type { App } from 'obsidian';

// ── Types ──────────────────────────────────────────────────────────────

interface CommandEntry {
	type: 'command';
	id: string;
	name: string;
	icon: string;
	category: string;
}

interface SeparatorEntry {
	type: 'separator';
	category: string;
}

type CommandMenuItem = CommandEntry | SeparatorEntry;

// ── Command Registry ───────────────────────────────────────────────────

const PLUGIN_ID = 'charted-roots';

interface CategoryDef {
	label: string;
	icon: string;
	commands: { id: string; name: string; icon: string }[];
}

const CATEGORIES: CategoryDef[] = [
	{
		label: 'Create',
		icon: 'plus-circle',
		commands: [
			{ id: 'create-person-note', name: 'Create person note', icon: 'user' },
			{ id: 'create-event-note', name: 'Create event note', icon: 'calendar' },
			{ id: 'create-place-note', name: 'Create place note', icon: 'map-pin' },
			{ id: 'create-source-note', name: 'Create source note', icon: 'file-text' },
			{ id: 'create-organization-note', name: 'Create organization note', icon: 'building' },
			{ id: 'create-note', name: 'Create note', icon: 'file-plus' },
			{ id: 'create-family-wizard', name: 'Create family wizard', icon: 'users' },
			{ id: 'create-universe', name: 'Create universe', icon: 'globe' },
		],
	},
	{
		label: 'View',
		icon: 'eye',
		commands: [
			{ id: 'open-family-chart', name: 'Open family chart', icon: 'users' },
			{ id: 'open-map-view', name: 'Open map view', icon: 'map' },
			{ id: 'open-statistics-dashboard', name: 'Open statistics dashboard', icon: 'chart-bar-decreasing' },
			{ id: 'open-entity-profile', name: 'Open entity profile', icon: 'id-card' },
			{ id: 'open-people-view', name: 'Open people', icon: 'user' },
			{ id: 'open-events-view', name: 'Open events', icon: 'calendar' },
			{ id: 'open-places-view', name: 'Open places', icon: 'map-pin' },
			{ id: 'open-organizations-view', name: 'Open organizations', icon: 'building' },
			{ id: 'open-sources-view', name: 'Open sources', icon: 'file-text' },
			{ id: 'open-universes-view', name: 'Open universes', icon: 'globe' },
			{ id: 'open-collections-view', name: 'Open collections', icon: 'folder' },
			{ id: 'open-relationships-view', name: 'Open relationships', icon: 'link' },
			{ id: 'open-data-quality-view', name: 'Open data quality', icon: 'check-circle' },
		],
	},
	{
		label: 'Edit',
		icon: 'pencil',
		commands: [
			{ id: 'edit-current-note', name: 'Edit current note', icon: 'pencil' },
			{ id: 'add-research-question', name: 'Add research question', icon: 'help-circle' },
			{ id: 'add-custom-relationship', name: 'Add custom relationship', icon: 'link' },
			{ id: 'insert-dynamic-blocks', name: 'Insert dynamic blocks', icon: 'code' },
		],
	},
	{
		label: 'Trees & numbering',
		icon: 'git-branch',
		commands: [
			{ id: 'generate-tree-for-current-note', name: 'Generate tree for current note', icon: 'git-branch' },
			{ id: 'regenerate-tree', name: 'Regenerate tree', icon: 'refresh-cw' },
			{ id: 'generate-all-trees', name: 'Generate all trees', icon: 'git-branch' },
			{ id: 'split-tree-wizard', name: 'Split tree wizard', icon: 'scissors' },
			{ id: 'assign-ahnentafel', name: 'Assign Ahnentafel numbers (ancestors)', icon: 'hash' },
			{ id: 'assign-daboville', name: "Assign d'Aboville numbers (descendants)", icon: 'hash' },
			{ id: 'assign-henry', name: 'Assign Henry numbers (descendants)', icon: 'hash' },
			{ id: 'assign-generation', name: 'Assign generation numbers', icon: 'hash' },
			{ id: 'clear-reference-numbers', name: 'Clear reference numbers', icon: 'x' },
			{ id: 'assign-lineage', name: 'Assign lineage from root person', icon: 'arrow-down' },
			{ id: 'remove-lineage', name: 'Remove lineage tags', icon: 'x' },
		],
	},
	{
		label: 'Bases',
		icon: 'table',
		commands: [
			{ id: 'create-all-bases', name: 'Create all base templates', icon: 'layers' },
			{ id: 'create-base-template', name: 'Create people base template', icon: 'user' },
			{ id: 'create-events-base-template', name: 'Create events base template', icon: 'calendar' },
			{ id: 'create-places-base-template', name: 'Create places base template', icon: 'map-pin' },
			{ id: 'create-sources-base-template', name: 'Create sources base template', icon: 'file-text' },
			{ id: 'create-organizations-base-template', name: 'Create organizations base template', icon: 'building' },
			{ id: 'create-universes-base-template', name: 'Create universes base template', icon: 'globe' },
			{ id: 'create-notes-base-template', name: 'Create notes base template', icon: 'file-plus' },
			{ id: 'create-research-base-template', name: 'Create research base template', icon: 'search' },
		],
	},
	{
		label: 'Tools',
		icon: 'wrench',
		commands: [
			{ id: 'open-control-center', name: 'Open control center', icon: 'settings' },
			{ id: 'manage-staging-area', name: 'Manage staging area', icon: 'inbox' },
			{ id: 'open-cleanup-wizard', name: 'Post-import cleanup wizard', icon: 'wand' },
			{ id: 'calculate-relationship', name: 'Calculate relationship', icon: 'git-merge' },
			{ id: 'find-duplicates', name: 'Find duplicate people', icon: 'copy' },
			{ id: 'merge-duplicate-places', name: 'Merge duplicate places', icon: 'git-merge' },
			{ id: 'validate-vault-schemas', name: 'Validate vault against schemas', icon: 'check-circle' },
			{ id: 'lookup-place', name: 'Look up place', icon: 'search' },
			{ id: 'create-custom-map', name: 'Create custom map', icon: 'map' },
			{ id: 'generate-place-notes', name: 'Generate place notes from strings', icon: 'map-pin' },
			{ id: 'view-relationship-history', name: 'View relationship history', icon: 'history' },
			{ id: 'undo-relationship-change', name: 'Undo last relationship change', icon: 'undo' },
		],
	},
];

/**
 * Build the flat list of menu items (separators + commands) for unfiltered display
 */
function buildFullMenu(): CommandMenuItem[] {
	const items: CommandMenuItem[] = [];
	for (const cat of CATEGORIES) {
		items.push({ type: 'separator', category: cat.label });
		for (const cmd of cat.commands) {
			items.push({ type: 'command', ...cmd, category: cat.label });
		}
	}
	return items;
}

/**
 * Build a flat list of only command entries (for search)
 */
function buildCommandList(): CommandEntry[] {
	const items: CommandEntry[] = [];
	for (const cat of CATEGORIES) {
		for (const cmd of cat.commands) {
			items.push({ type: 'command', ...cmd, category: cat.label });
		}
	}
	return items;
}

// ── Modal ──────────────────────────────────────────────────────────────

export class CommandMenuModal extends SuggestModal<CommandMenuItem> {
	private fullMenu: CommandMenuItem[];
	private commandList: CommandEntry[];

	constructor(app: App) {
		super(app);
		this.fullMenu = buildFullMenu();
		this.commandList = buildCommandList();
		this.setPlaceholder('Search commands...');
		this.modalEl.addClass('cr-command-menu');
	}

	getSuggestions(query: string): CommandMenuItem[] {
		if (!query.trim()) {
			return this.fullMenu;
		}

		const lower = query.toLowerCase();
		const terms = lower.split(/\s+/);

		// Score and filter commands
		const scored: { item: CommandEntry; score: number }[] = [];
		for (const cmd of this.commandList) {
			const nameLower = cmd.name.toLowerCase();
			const catLower = cmd.category.toLowerCase();
			const searchable = `${nameLower} ${catLower}`;

			// All terms must match somewhere
			const allMatch = terms.every((t) => searchable.includes(t));
			if (!allMatch) continue;

			// Score: prefer name-starts-with, then name-contains, then category-only
			let score = 0;
			if (nameLower.startsWith(lower)) {
				score = 3;
			} else if (nameLower.includes(lower)) {
				score = 2;
			} else {
				score = 1;
			}

			scored.push({ item: cmd, score });
		}

		scored.sort((a, b) => b.score - a.score);
		return scored.map((s) => s.item);
	}

	renderSuggestion(item: CommandMenuItem, el: HTMLElement): void {
		if (item.type === 'separator') {
			el.addClass('cr-command-menu__separator');
			el.setText(item.category);
			return;
		}

		el.addClass('cr-command-menu__item');

		const iconEl = el.createSpan({ cls: 'cr-command-menu__icon' });
		setIcon(iconEl, item.icon);

		el.createSpan({ cls: 'cr-command-menu__name', text: item.name });
		el.createSpan({ cls: 'cr-command-menu__category', text: item.category });
	}

	onChooseSuggestion(item: CommandMenuItem): void {
		if (item.type === 'separator') return;
		this.app.commands.executeCommandById(`${PLUGIN_ID}:${item.id}`);
	}
}
