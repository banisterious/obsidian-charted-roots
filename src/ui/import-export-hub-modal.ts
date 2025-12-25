/**
 * Import/Export Hub Modal
 * A hub modal providing access to import and export functionality:
 * - Import (opens Import Wizard)
 * - Export (opens Export Wizard)
 */

import { App, Modal, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';

/**
 * Import/Export Hub Modal
 * Provides a card-based interface to access import and export wizards
 */
export class ImportExportHubModal extends Modal {
	private plugin: CanvasRootsPlugin;

	constructor(app: App, plugin: CanvasRootsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-import-export-hub-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-import-export-hub-header' });
		const headerIcon = header.createDiv({ cls: 'crc-import-export-hub-header-icon' });
		setIcon(headerIcon, 'arrow-up-down');
		header.createEl('h2', { text: 'Import/Export' });

		// Action cards grid
		const grid = contentEl.createDiv({ cls: 'crc-import-export-hub-grid' });

		// Import card
		this.renderActionCard(grid, {
			icon: 'download',
			iconClass: 'import',
			title: 'Import',
			description: 'Import family data from GEDCOM, Gramps, or CSV files into your vault.',
			onClick: () => this.openWizard('import')
		});

		// Export card
		this.renderActionCard(grid, {
			icon: 'upload',
			iconClass: 'export',
			title: 'Export',
			description: 'Export your genealogical data to GEDCOM, GEDCOM X, Gramps XML, or CSV formats.',
			onClick: () => this.openWizard('export')
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render an action card
	 */
	private renderActionCard(
		container: HTMLElement,
		config: {
			icon: string;
			iconClass: string;
			title: string;
			description: string;
			onClick: () => void;
		}
	): void {
		const card = container.createDiv({ cls: 'crc-import-export-hub-card' });

		const cardHeader = card.createDiv({ cls: 'crc-import-export-hub-card-header' });
		const iconEl = cardHeader.createDiv({ cls: `crc-import-export-hub-card-icon crc-import-export-hub-card-icon--${config.iconClass}` });
		setIcon(iconEl, config.icon);
		cardHeader.createDiv({ cls: 'crc-import-export-hub-card-title', text: config.title });

		card.createDiv({ cls: 'crc-import-export-hub-card-description', text: config.description });

		card.addEventListener('click', config.onClick);
	}

	/**
	 * Open the selected wizard modal
	 */
	private openWizard(type: 'import' | 'export'): void {
		// Close this hub first
		this.close();

		if (type === 'import') {
			// Open Import Wizard
			import('./import-wizard-modal').then(({ ImportWizardModal }) => {
				new ImportWizardModal(this.app, this.plugin).open();
			});
		} else {
			// Open Export Wizard
			import('./export-wizard-modal').then(({ ExportWizardModal }) => {
				new ExportWizardModal(this.app, this.plugin).open();
			});
		}
	}
}
