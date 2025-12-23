import { App, Modal } from 'obsidian';
import { createLucideIcon, LucideIconName } from '../lucide-icons';

/**
 * Export progress phases for family chart
 */
export type FamilyChartExportPhase =
	| 'preparing'
	| 'embedding'
	| 'rendering'
	| 'encoding'
	| 'saving'
	| 'complete';

/**
 * Progress state for family chart export
 */
export interface FamilyChartExportProgress {
	phase: FamilyChartExportPhase;
	current: number;
	total: number;
	message?: string;
}

/**
 * Phase display configuration
 */
const PHASE_CONFIG: Record<FamilyChartExportPhase, { label: string; icon: LucideIconName }> = {
	preparing: { label: 'Preparing chart', icon: 'git-branch' },
	embedding: { label: 'Embedding avatars', icon: 'image' },
	rendering: { label: 'Rendering image', icon: 'layout' },
	encoding: { label: 'Encoding output', icon: 'file-code' },
	saving: { label: 'Saving file', icon: 'download' },
	complete: { label: 'Complete', icon: 'check' }
};

/**
 * Callback type for progress updates
 */
export type ProgressCallback = (progress: FamilyChartExportProgress) => void;

/**
 * Modal to display family chart export progress with cancel support
 */
export class FamilyChartExportProgressModal extends Modal {
	private progressBar: HTMLElement | null = null;
	private progressText: HTMLElement | null = null;
	private phaseLabel: HTMLElement | null = null;
	private phaseIcon: HTMLElement | null = null;
	private cancelButton: HTMLElement | null = null;
	private currentPhase: FamilyChartExportPhase = 'preparing';
	private formatName: string;
	private _cancelled = false;

	constructor(app: App, formatName: string) {
		super(app);
		this.formatName = formatName;
	}

	/**
	 * Check if export was cancelled
	 */
	get cancelled(): boolean {
		return this._cancelled;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class
		this.modalEl.addClass('cr-fcv-export-progress-modal');

		// Title
		contentEl.createEl('h2', {
			text: `Exporting ${this.formatName}`,
			cls: 'crc-modal-title'
		});

		// Phase indicator
		const phaseContainer = contentEl.createDiv({ cls: 'cr-fcv-export-phase' });
		this.phaseIcon = phaseContainer.createDiv({ cls: 'cr-fcv-export-phase__icon' });
		this.phaseLabel = phaseContainer.createEl('span', {
			cls: 'cr-fcv-export-phase__label',
			text: 'Preparing chart…'
		});

		// Progress bar container
		const progressContainer = contentEl.createDiv({ cls: 'cr-fcv-export-progress' });
		const progressTrack = progressContainer.createDiv({ cls: 'cr-fcv-export-progress__track' });
		this.progressBar = progressTrack.createDiv({ cls: 'cr-fcv-export-progress__bar' });
		this.progressBar.style.width = '0%';

		// Progress text
		this.progressText = contentEl.createDiv({
			cls: 'cr-fcv-export-progress__text',
			text: 'Starting…'
		});

		// Cancel button container
		const buttonContainer = contentEl.createDiv({ cls: 'cr-fcv-export-buttons' });
		this.cancelButton = buttonContainer.createEl('button', {
			cls: 'cr-btn cr-btn--secondary',
			text: 'Cancel'
		});
		this.cancelButton.addEventListener('click', () => {
			this._cancelled = true;
			this.cancelButton?.setText('Cancelling…');
			this.cancelButton?.setAttribute('disabled', 'true');
		});

		// Update icon for initial phase
		this.updatePhaseIcon('preparing');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Update the progress display
	 */
	updateProgress(progress: FamilyChartExportProgress): void {
		if (!this.progressBar || !this.progressText || !this.phaseLabel) return;

		// Update phase if changed
		if (progress.phase !== this.currentPhase) {
			this.currentPhase = progress.phase;
			const config = PHASE_CONFIG[progress.phase];
			this.phaseLabel.textContent = config.label + '…';
			this.updatePhaseIcon(progress.phase);
		}

		// Update progress bar
		const percentage = progress.total > 0
			? Math.round((progress.current / progress.total) * 100)
			: 0;
		this.progressBar.style.width = `${percentage}%`;

		// Update progress text
		if (progress.message) {
			this.progressText.textContent = progress.message;
		} else if (progress.total > 0) {
			this.progressText.textContent = `${progress.current} of ${progress.total}`;
		} else {
			this.progressText.textContent = 'Processing…';
		}
	}

	/**
	 * Mark export as complete
	 */
	markComplete(): void {
		if (!this.progressBar || !this.progressText || !this.phaseLabel) return;

		this.currentPhase = 'complete';
		this.phaseLabel.textContent = 'Export complete';
		this.updatePhaseIcon('complete');
		this.progressBar.style.width = '100%';
		this.progressText.textContent = 'Done!';

		// Hide cancel button on completion
		if (this.cancelButton) {
			this.cancelButton.style.display = 'none';
		}
	}

	/**
	 * Mark export as cancelled
	 */
	markCancelled(): void {
		if (!this.progressText || !this.phaseLabel) return;

		this.phaseLabel.textContent = 'Export cancelled';
		this.progressText.textContent = '';

		if (this.cancelButton) {
			this.cancelButton.style.display = 'none';
		}
	}

	/**
	 * Update the phase icon
	 */
	private updatePhaseIcon(phase: FamilyChartExportPhase): void {
		if (!this.phaseIcon) return;

		this.phaseIcon.empty();
		const config = PHASE_CONFIG[phase];
		const icon = createLucideIcon(config.icon, 24);
		if (phase === 'complete') {
			icon.addClass('cr-icon--success');
		}
		this.phaseIcon.appendChild(icon);
	}
}
