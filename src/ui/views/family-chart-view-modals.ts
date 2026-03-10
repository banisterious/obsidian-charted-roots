/**
 * Helper modal classes for the Family Chart view
 *
 * Extracted from family-chart-view.ts to keep that file focused on chart logic.
 */

import { App, Modal, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { FamilyChartColors } from '../../settings';

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
