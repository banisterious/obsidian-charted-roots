/**
 * Helper modal classes for the Family Chart view
 *
 * Extracted from family-chart-view.ts to keep that file focused on chart logic.
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { FamilyChartColors } from '../../settings';
import {
	type HighlightGroup,
	type HighlightField,
	type HighlightColor,
	HIGHLIGHT_FIELDS,
	HIGHLIGHT_COLORS,
	MAX_HIGHLIGHT_GROUPS
} from './highlight-groups';

export type FamilyChartThemePresets = Record<string, { name: string; colors: FamilyChartColors }>;

/**
 * Callbacks interface for FamilyChartStyleModal to manipulate chart colors
 * without requiring a direct reference to FamilyChartView (avoids circular imports)
 */
export interface ChartColorCallbacks {
	apply(): void;
	clear(): void;
}

/**
 * Confirmation modal for deleting a person from the chart
 */
export class DeletePersonConfirmModal extends Modal {
	private personName: string;
	private onResult: (confirmed: boolean) => void;

	constructor(app: App, personName: string, onResult: (confirmed: boolean) => void) {
		super(app);
		this.personName = personName;
		this.onResult = onResult;
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;
		titleEl.setText('Delete person from chart?');

		contentEl.createEl('p', {
			text: `Are you sure you want to remove "${this.personName}" from the chart?`
		});
		contentEl.createEl('p', {
			text: 'The person note file will not be deleted, only their entry in the chart.',
			cls: 'mod-muted'
		});

		const buttonContainer = contentEl.createDiv({ cls: 'crc-confirmation-buttons' });

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'crc-btn-secondary'
		});
		cancelBtn.addEventListener('click', () => {
			this.onResult(false);
			this.close();
		});

		const confirmBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		confirmBtn.addEventListener('click', () => {
			this.onResult(true);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/**
 * Modal for customizing family chart colors
 */
export class FamilyChartStyleModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private themePresets: FamilyChartThemePresets;
	private callbacks: ChartColorCallbacks;
	private colors: FamilyChartColors;
	private originalColors: FamilyChartColors | undefined;

	constructor(
		app: App,
		plugin: CanvasRootsPlugin,
		themePresets: FamilyChartThemePresets,
		callbacks: ChartColorCallbacks
	) {
		super(app);
		this.plugin = plugin;
		this.themePresets = themePresets;
		this.callbacks = callbacks;
		this.originalColors = plugin.settings.familyChartColors
			? { ...plugin.settings.familyChartColors }
			: undefined;
		// Start with current colors or defaults
		this.colors = plugin.settings.familyChartColors
			? { ...plugin.settings.familyChartColors }
			: { ...themePresets.classic.colors };
	}

	onOpen(): void {
		const { contentEl, titleEl, modalEl } = this;
		titleEl.setText('Chart Colors');
		modalEl.addClass('cr-fcv-style-modal');

		// Card colors section
		const cardSection = contentEl.createDiv({ cls: 'cr-fcv-color-section' });
		cardSection.createEl('h3', { text: 'Card Colors' });

		this.createColorRow(cardSection, 'Female', this.colors.femaleColor, (val) => {
			this.colors.femaleColor = val;
			this.previewColors();
		});

		this.createColorRow(cardSection, 'Male', this.colors.maleColor, (val) => {
			this.colors.maleColor = val;
			this.previewColors();
		});

		this.createColorRow(cardSection, 'Unknown', this.colors.unknownColor, (val) => {
			this.colors.unknownColor = val;
			this.previewColors();
		});

		// Background section
		const bgSection = contentEl.createDiv({ cls: 'cr-fcv-color-section' });
		const isDark = document.body.classList.contains('theme-dark');
		bgSection.createEl('h3', { text: `Background (${isDark ? 'dark' : 'light'} theme)` });

		if (isDark) {
			this.createColorRow(bgSection, 'Background', this.colors.backgroundDark, (val) => {
				this.colors.backgroundDark = val;
				this.previewColors();
			});
			this.createColorRow(bgSection, 'Text', this.colors.textDark, (val) => {
				this.colors.textDark = val;
				this.previewColors();
			});
		} else {
			this.createColorRow(bgSection, 'Background', this.colors.backgroundLight, (val) => {
				this.colors.backgroundLight = val;
				this.previewColors();
			});
			this.createColorRow(bgSection, 'Text', this.colors.textLight, (val) => {
				this.colors.textLight = val;
				this.previewColors();
			});
		}

		// Presets section
		const presetsSection = contentEl.createDiv({ cls: 'cr-fcv-color-section' });
		presetsSection.createEl('h3', { text: 'Presets' });
		const presetsRow = presetsSection.createDiv({ cls: 'cr-fcv-presets-row' });

		for (const [, preset] of Object.entries(this.themePresets)) {
			const presetBtn = presetsRow.createEl('button', {
				text: preset.name,
				cls: 'cr-fcv-preset-btn'
			});
			presetBtn.addEventListener('click', () => {
				this.colors = { ...preset.colors };
				this.previewColors();
				this.refreshColorInputs();
			});
		}

		// Button row
		const buttonRow = contentEl.createDiv({ cls: 'cr-fcv-button-row' });

		const resetBtn = buttonRow.createEl('button', {
			text: 'Reset',
			cls: 'cr-fcv-btn-secondary'
		});
		resetBtn.addEventListener('click', () => {
			this.colors = { ...this.themePresets.classic.colors };
			this.previewColors();
			this.refreshColorInputs();
		});

		// Spacer
		buttonRow.createDiv({ cls: 'cr-fcv-button-spacer' });

		const cancelBtn = buttonRow.createEl('button', {
			text: 'Cancel',
			cls: 'cr-fcv-btn-secondary'
		});
		cancelBtn.addEventListener('click', () => {
			// Restore original colors
			if (this.originalColors) {
				this.plugin.settings.familyChartColors = this.originalColors;
				this.callbacks.apply();
			} else {
				delete this.plugin.settings.familyChartColors;
				this.callbacks.clear();
			}
			this.close();
		});

		const applyBtn = buttonRow.createEl('button', {
			text: 'Apply',
			cls: 'mod-cta'
		});
		applyBtn.addEventListener('click', () => {
			void (async () => {
				// Save colors
				this.plugin.settings.familyChartColors = { ...this.colors };
				await this.plugin.saveSettings();
				new Notice('Colors applied');
				this.close();
			})();
		});
	}

	/**
	 * Create a color picker row
	 */
	private createColorRow(
		container: HTMLElement,
		label: string,
		value: string,
		onChange: (value: string) => void
	): HTMLElement {
		const row = container.createDiv({ cls: 'cr-fcv-color-row' });

		row.createEl('label', { text: label });

		const inputContainer = row.createDiv({ cls: 'cr-fcv-color-input-container' });

		const colorInput = inputContainer.createEl('input', {
			type: 'color',
			cls: 'cr-fcv-color-input',
			value: this.toHex(value)
		});
		colorInput.dataset.field = label.toLowerCase();

		const hexDisplay = inputContainer.createEl('span', {
			text: this.toHex(value),
			cls: 'cr-fcv-hex-display'
		});

		colorInput.addEventListener('input', (e) => {
			const hex = (e.target as HTMLInputElement).value;
			hexDisplay.setText(hex);
			onChange(hex);
		});

		return row;
	}

	/**
	 * Convert various color formats to hex
	 */
	private toHex(color: string): string {
		// If already hex, return as-is
		if (color.startsWith('#')) {
			return color.length === 4
				? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
				: color;
		}

		// Parse rgb/rgba
		const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (rgbMatch) {
			const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
			const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
			const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
			return `#${r}${g}${b}`;
		}

		return '#808080'; // Fallback gray
	}

	/**
	 * Preview colors in real-time
	 */
	private previewColors(): void {
		this.plugin.settings.familyChartColors = { ...this.colors };
		this.callbacks.apply();
	}

	/**
	 * Refresh all color inputs after preset selection
	 */
	private refreshColorInputs(): void {
		const inputs = this.contentEl.querySelectorAll<HTMLInputElement>('.cr-fcv-color-input');
		const isDark = document.body.classList.contains('theme-dark');

		inputs.forEach((input) => {
			const field = input.dataset.field;
			let value = '';

			switch (field) {
				case 'female':
					value = this.colors.femaleColor;
					break;
				case 'male':
					value = this.colors.maleColor;
					break;
				case 'unknown':
					value = this.colors.unknownColor;
					break;
				case 'background':
					value = isDark ? this.colors.backgroundDark : this.colors.backgroundLight;
					break;
				case 'text':
					value = isDark ? this.colors.textDark : this.colors.textLight;
					break;
			}

			if (value) {
				const hex = this.toHex(value);
				input.value = hex;
				const hexDisplay = input.parentElement?.querySelector('.cr-fcv-hex-display');
				if (hexDisplay) hexDisplay.setText(hex);
			}
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// ─── Highlight Groups Modal (#379) ──────────────────────────────────

export interface HighlightGroupsModalCallbacks {
	getGroups(): HighlightGroup[];
	saveGroups(groups: HighlightGroup[]): void;
}

/**
 * Modal for managing family-chart highlight groups.
 * Users can add up to MAX_HIGHLIGHT_GROUPS groups, each with a field, value,
 * color, and enabled flag. The modal operates on a working copy and commits
 * on save; no changes are persisted until the user clicks Save.
 */
export class HighlightGroupsModal extends Modal {
	private callbacks: HighlightGroupsModalCallbacks;
	private groups: HighlightGroup[];
	private listEl?: HTMLElement;
	private clearBtn?: HTMLButtonElement;

	constructor(app: App, callbacks: HighlightGroupsModalCallbacks) {
		super(app);
		this.callbacks = callbacks;
		// Clone so we can cancel cleanly
		this.groups = callbacks.getGroups().map(g => ({ ...g }));
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;
		this.modalEl.addClass('cr-highlight-groups-modal');
		titleEl.setText('Highlight groups');

		contentEl.createEl('p', {
			text: 'Highlight Family Chart cards by a property value. Non-matching cards are dimmed. Up to three groups can be active at once; when a card matches multiple groups, the first group in the list wins.',
			cls: 'cr-highlight-groups-modal__desc'
		});

		// Build stable containers once; only re-render their contents on changes
		this.listEl = contentEl.createDiv({ cls: 'cr-highlight-groups-list' });
		this.renderFooter();
		this.refreshGroupsList();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private refreshGroupsList(): void {
		if (!this.listEl) return;
		this.listEl.empty();

		if (this.groups.length === 0) {
			this.listEl.createEl('p', {
				text: 'No highlight groups yet. Click "Add group" to create one.',
				cls: 'cr-highlight-groups-list__empty'
			});
		} else {
			this.groups.forEach((group, index) => this.renderGroupRow(this.listEl!, group, index));
		}

		const actionsEl = this.listEl.createDiv({ cls: 'cr-highlight-groups-list__actions' });

		const addBtn = actionsEl.createEl('button', { text: 'Add group' });
		addBtn.disabled = this.groups.length >= MAX_HIGHLIGHT_GROUPS;
		if (addBtn.disabled) {
			addBtn.setAttr('title', `Limit of ${MAX_HIGHLIGHT_GROUPS} groups reached`);
		}
		addBtn.addEventListener('click', () => {
			this.groups.push(this.makeNewGroup());
			this.refreshGroupsList();
			this.updateClearButton();
		});

		this.updateClearButton();
	}

	private updateClearButton(): void {
		if (!this.clearBtn) return;
		this.clearBtn.style.display = this.groups.length > 0 ? '' : 'none';
	}

	private renderGroupRow(container: HTMLElement, group: HighlightGroup, index: number): void {
		const rowEl = container.createDiv({ cls: 'cr-highlight-group-row' });

		const swatch = rowEl.createDiv({ cls: 'cr-highlight-group-row__swatch' });
		const swatchColor = HIGHLIGHT_COLORS.find(c => c.value === group.color)?.hex ?? '#999';
		swatch.style.setProperty('background-color', swatchColor);

		new Setting(rowEl)
			.setName('Field')
			.addDropdown(dd => {
				for (const f of HIGHLIGHT_FIELDS) dd.addOption(f.value, f.label);
				dd.setValue(group.field);
				dd.onChange(value => {
					group.field = value as HighlightField;
				});
			});

		new Setting(rowEl)
			.setName('Value')
			.setDesc('Exact match (case-insensitive)')
			.addText(text => {
				text.setValue(group.value);
				text.setPlaceholder('e.g. Magician');
				text.onChange(value => {
					group.value = value;
				});
			});

		new Setting(rowEl)
			.setName('Color')
			.addDropdown(dd => {
				for (const c of HIGHLIGHT_COLORS) dd.addOption(c.value, c.label);
				dd.setValue(group.color);
				dd.onChange(value => {
					group.color = value as HighlightColor;
					this.refreshGroupsList();
				});
			});

		const controlsEl = rowEl.createDiv({ cls: 'cr-highlight-group-row__controls' });

		new Setting(controlsEl)
			.setName('Enabled')
			.addToggle(tg => {
				tg.setValue(group.enabled);
				tg.onChange(value => {
					group.enabled = value;
				});
			});

		const deleteBtn = controlsEl.createEl('button', { text: 'Delete', cls: 'mod-warning' });
		deleteBtn.addEventListener('click', () => {
			this.groups.splice(index, 1);
			this.refreshGroupsList();
			this.updateClearButton();
		});
	}

	private renderFooter(): void {
		const footerEl = this.contentEl.createDiv({ cls: 'cr-highlight-groups-modal__footer' });

		// Left-side destructive action
		const leftEl = footerEl.createDiv({ cls: 'cr-highlight-groups-modal__footer-left' });
		this.clearBtn = leftEl.createEl('button', { text: 'Clear all', cls: 'mod-warning' });
		this.clearBtn.addEventListener('click', () => {
			this.groups = [];
			this.refreshGroupsList();
			this.updateClearButton();
		});

		// Right-side primary actions
		const rightEl = footerEl.createDiv({ cls: 'cr-highlight-groups-modal__footer-right' });

		const cancelBtn = rightEl.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const saveBtn = rightEl.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveBtn.addEventListener('click', () => {
			const invalid = this.groups.find(g => g.enabled && g.value.trim() === '');
			if (invalid) {
				new Notice('Enabled groups must have a value');
				return;
			}
			this.callbacks.saveGroups(this.groups);
			this.close();
		});
	}

	private makeNewGroup(): HighlightGroup {
		const usedColors = new Set(this.groups.map(g => g.color));
		const nextColor = HIGHLIGHT_COLORS.find(c => !usedColors.has(c.value))?.value ?? 'gold';
		return {
			id: `hg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			field: 'occupation',
			value: '',
			color: nextColor,
			enabled: true
		};
	}
}
