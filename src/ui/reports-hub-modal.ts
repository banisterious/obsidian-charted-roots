/**
 * Reports Hub Modal
 * A hub modal providing access to different report types:
 * - Narrative Reports (opens Report Wizard)
 * - Visual Charts (opens Unified Tree Wizard)
 */

import { App, Modal, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../main';

/**
 * Reports Hub Modal
 * Provides a card-based interface to access different report generation tools
 */
export class ReportsHubModal extends Modal {
	private plugin: CanvasRootsPlugin;

	constructor(app: App, plugin: CanvasRootsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-reports-hub-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-reports-hub-header' });
		const headerIcon = header.createDiv({ cls: 'crc-reports-hub-header-icon' });
		setIcon(headerIcon, 'bar-chart');
		header.createEl('h2', { text: 'Reports' });

		// Action cards grid
		const grid = contentEl.createDiv({ cls: 'crc-reports-hub-grid' });

		// Narrative Reports card
		this.renderActionCard(grid, {
			icon: 'file-text',
			iconClass: 'narrative',
			title: 'Narrative Reports',
			description: 'Generate text-based reports like ancestor narratives, descendant reports, and family group sheets.',
			onClick: () => this.openReportType('narrative')
		});

		// Visual Charts card
		this.renderActionCard(grid, {
			icon: 'git-branch',
			iconClass: 'visual',
			title: 'Visual Charts',
			description: 'Create pedigree charts, descendant trees, fan charts, and other visual family tree diagrams.',
			onClick: () => this.openReportType('visual')
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
		const card = container.createDiv({ cls: 'crc-reports-hub-card' });

		const cardHeader = card.createDiv({ cls: 'crc-reports-hub-card-header' });
		const iconEl = cardHeader.createDiv({ cls: `crc-reports-hub-card-icon crc-reports-hub-card-icon--${config.iconClass}` });
		setIcon(iconEl, config.icon);
		cardHeader.createDiv({ cls: 'crc-reports-hub-card-title', text: config.title });

		card.createDiv({ cls: 'crc-reports-hub-card-description', text: config.description });

		card.addEventListener('click', config.onClick);
	}

	/**
	 * Open the selected report type modal
	 */
	private openReportType(type: 'narrative' | 'visual'): void {
		// Close this hub first
		this.close();

		if (type === 'narrative') {
			// Open Report Wizard
			import('../reports/ui/report-wizard-modal').then(({ ReportWizardModal }) => {
				new ReportWizardModal(this.plugin).open();
			});
		} else {
			// Open Unified Tree Wizard
			import('../trees/ui/unified-tree-wizard-modal').then(({ UnifiedTreeWizardModal }) => {
				new UnifiedTreeWizardModal(this.plugin).open();
			});
		}
	}
}
