import { App, Modal } from 'obsidian';
import { createLucideIcon, LucideIconName } from './lucide-icons';

/**
 * Import progress phases
 */
export type ImportPhase =
	| 'validating'
	| 'parsing'
	| 'places'
	| 'sources'
	| 'people'
	| 'relationships'
	| 'events'
	| 'complete';

/**
 * Progress state for GEDCOM import
 */
export interface ImportProgress {
	phase: ImportPhase;
	current: number;
	total: number;
	message?: string;
}

/**
 * Phase display configuration
 */
const PHASE_CONFIG: Record<ImportPhase, { label: string; icon: LucideIconName }> = {
	validating: { label: 'Validating file', icon: 'file-check' },
	parsing: { label: 'Parsing GEDCOM', icon: 'file-code' },
	places: { label: 'Creating places', icon: 'map-pin' },
	sources: { label: 'Creating sources', icon: 'book-open' },
	people: { label: 'Creating people', icon: 'users' },
	relationships: { label: 'Linking relationships', icon: 'git-branch' },
	events: { label: 'Creating events', icon: 'calendar' },
	complete: { label: 'Complete', icon: 'check' }
};

/**
 * Modal to display GEDCOM import progress
 */
export class GedcomImportProgressModal extends Modal {
	private progressBar: HTMLElement | null = null;
	private progressText: HTMLElement | null = null;
	private phaseLabel: HTMLElement | null = null;
	private phaseIcon: HTMLElement | null = null;
	private statsContainer: HTMLElement | null = null;
	private currentPhase: ImportPhase = 'validating';

	// Running totals for stats display
	private stats = {
		places: 0,
		sources: 0,
		people: 0,
		events: 0
	};

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class and prevent closing by clicking outside
		this.modalEl.addClass('cr-import-progress-modal');

		// Title
		contentEl.createEl('h2', {
			text: 'Importing GEDCOM',
			cls: 'crc-modal-title'
		});

		// Phase indicator
		const phaseContainer = contentEl.createDiv({ cls: 'cr-import-phase' });
		this.phaseIcon = phaseContainer.createDiv({ cls: 'cr-import-phase__icon' });
		this.phaseLabel = phaseContainer.createEl('span', {
			cls: 'cr-import-phase__label',
			text: 'Validating file…'
		});

		// Progress bar container
		const progressContainer = contentEl.createDiv({ cls: 'cr-import-progress' });
		const progressTrack = progressContainer.createDiv({ cls: 'cr-import-progress__track' });
		this.progressBar = progressTrack.createDiv({ cls: 'cr-import-progress__bar' });
		this.progressBar.style.setProperty('width', '0%');

		// Progress text
		this.progressText = contentEl.createDiv({
			cls: 'cr-import-progress__text',
			text: 'Starting…'
		});

		// Stats container (shows running totals)
		this.statsContainer = contentEl.createDiv({ cls: 'cr-import-running-stats' });
		this.updateStatsDisplay();

		// Update icon for initial phase
		this.updatePhaseIcon('validating');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Update the progress display
	 */
	updateProgress(progress: ImportProgress): void {
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
		this.progressBar.style.setProperty('width', `${percentage}%`);

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
	 * Update running statistics
	 */
	updateStats(stats: Partial<typeof this.stats>): void {
		Object.assign(this.stats, stats);
		this.updateStatsDisplay();
	}

	/**
	 * Mark import as complete
	 */
	markComplete(): void {
		if (!this.progressBar || !this.progressText || !this.phaseLabel) return;

		this.currentPhase = 'complete';
		this.phaseLabel.textContent = 'Import complete';
		this.updatePhaseIcon('complete');
		this.progressBar.style.setProperty('width', '100%');
		this.progressText.textContent = 'Done!';
	}

	/**
	 * Update the phase icon
	 */
	private updatePhaseIcon(phase: ImportPhase): void {
		if (!this.phaseIcon) return;

		this.phaseIcon.empty();
		const config = PHASE_CONFIG[phase];
		const icon = createLucideIcon(config.icon, 24);
		if (phase === 'complete') {
			icon.addClass('cr-icon--success');
		}
		this.phaseIcon.appendChild(icon);
	}

	/**
	 * Update the stats display
	 */
	private updateStatsDisplay(): void {
		if (!this.statsContainer) return;

		this.statsContainer.empty();

		const items: { label: string; value: number; icon: LucideIconName }[] = [];

		if (this.stats.places > 0) {
			items.push({ label: 'Places', value: this.stats.places, icon: 'map-pin' });
		}
		if (this.stats.sources > 0) {
			items.push({ label: 'Sources', value: this.stats.sources, icon: 'book-open' });
		}
		if (this.stats.people > 0) {
			items.push({ label: 'People', value: this.stats.people, icon: 'users' });
		}
		if (this.stats.events > 0) {
			items.push({ label: 'Events', value: this.stats.events, icon: 'calendar' });
		}

		for (const item of items) {
			const statEl = this.statsContainer.createDiv({ cls: 'cr-import-stat' });
			const icon = createLucideIcon(item.icon, 16);
			statEl.appendChild(icon);
			statEl.createEl('span', { text: `${item.value} ${item.label.toLowerCase()}` });
		}
	}
}
