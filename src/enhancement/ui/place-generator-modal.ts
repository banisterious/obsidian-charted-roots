/**
 * Place Generator Modal
 *
 * UI for generating place notes from place strings found in person and event notes.
 * Part of the Data Enhancement Pass feature.
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import { createLucideIcon } from '../../ui/lucide-icons';
import {
	PlaceGeneratorService,
	PlaceGeneratorOptions,
	PlaceGeneratorResult,
	FoundPlace,
	DEFAULT_PLACE_GENERATOR_OPTIONS
} from '../services/place-generator';
import type { CanvasRootsSettings } from '../../settings';

/**
 * Options for the place generator modal
 */
export interface PlaceGeneratorModalOptions {
	/** Callback when generation is complete */
	onComplete?: (result: PlaceGeneratorResult) => void;
}

/**
 * Modal for generating place notes from existing data
 */
export class PlaceGeneratorModal extends Modal {
	private settings: CanvasRootsSettings;
	private modalOptions: PlaceGeneratorModalOptions;
	private service: PlaceGeneratorService;

	// Options state
	private options: PlaceGeneratorOptions;

	// UI state
	private previewResult: PlaceGeneratorResult | null = null;
	private isScanning = false;
	private isGenerating = false;

	// UI elements
	private contentContainer: HTMLElement | null = null;
	private previewButton: HTMLButtonElement | null = null;
	private generateButton: HTMLButtonElement | null = null;
	private progressContainer: HTMLElement | null = null;
	private resultsContainer: HTMLElement | null = null;

	constructor(
		app: App,
		settings: CanvasRootsSettings,
		modalOptions: PlaceGeneratorModalOptions = {}
	) {
		super(app);
		this.settings = settings;
		this.modalOptions = modalOptions;
		this.service = new PlaceGeneratorService(app, settings);

		// Initialize options with defaults
		this.options = {
			...DEFAULT_PLACE_GENERATOR_OPTIONS,
			placesFolder: settings.placesFolder || DEFAULT_PLACE_GENERATOR_OPTIONS.placesFolder
		};
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.addClass('cr-place-generator-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-modal-header' });
		const titleContainer = header.createDiv({ cls: 'crc-modal-title' });
		const icon = createLucideIcon('map-pin', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Generate place notes');

		// Description
		const description = contentEl.createDiv({ cls: 'crc-modal-description' });
		description.createEl('p', {
			text: 'Scans person and event notes for place strings (not wikilinks) and creates place notes with proper hierarchy. ' +
				'Optionally updates references to use wikilinks.'
		});

		// Content container
		this.contentContainer = contentEl.createDiv({ cls: 'cr-place-generator-content' });

		// Options section
		this.renderOptionsSection();

		// Progress container (hidden initially)
		this.progressContainer = this.contentContainer.createDiv({ cls: 'cr-place-generator-progress' });
		this.progressContainer.style.display = 'none';

		// Results container
		this.resultsContainer = this.contentContainer.createDiv({ cls: 'cr-place-generator-results' });
		this.renderInitialPrompt();

		// Footer with buttons
		const footer = contentEl.createDiv({ cls: 'crc-modal-footer' });

		this.previewButton = footer.createEl('button', {
			text: 'Preview',
			cls: 'mod-cta'
		});
		this.previewButton.addEventListener('click', () => void this.runPreview());

		this.generateButton = footer.createEl('button', {
			text: 'Generate',
			cls: 'mod-warning'
		});
		this.generateButton.disabled = true;
		this.generateButton.addEventListener('click', () => void this.runGenerate());

		footer.createEl('button', { text: 'Close' })
			.addEventListener('click', () => this.close());
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the options section
	 */
	private renderOptionsSection(): void {
		if (!this.contentContainer) return;

		const optionsSection = this.contentContainer.createDiv({ cls: 'cr-place-generator-options' });
		optionsSection.createEl('h3', { text: 'Options' });

		// Scan person notes
		new Setting(optionsSection)
			.setName('Scan person notes')
			.setDesc('Look for birth_place and death_place properties')
			.addToggle(toggle => toggle
				.setValue(this.options.scanPersonNotes)
				.onChange(value => {
					this.options.scanPersonNotes = value;
					this.previewResult = null;
					this.updateButtonStates();
				})
			);

		// Scan event notes
		new Setting(optionsSection)
			.setName('Scan event notes')
			.setDesc('Look for place properties in event notes')
			.addToggle(toggle => toggle
				.setValue(this.options.scanEventNotes)
				.onChange(value => {
					this.options.scanEventNotes = value;
					this.previewResult = null;
					this.updateButtonStates();
				})
			);

		// Parse hierarchy
		new Setting(optionsSection)
			.setName('Parse place hierarchy')
			.setDesc('Create parent places (e.g., "Dublin, Ireland" creates both Dublin and Ireland)')
			.addToggle(toggle => toggle
				.setValue(this.options.parseHierarchy)
				.onChange(value => {
					this.options.parseHierarchy = value;
					this.previewResult = null;
					this.updateButtonStates();
				})
			);

		// Update references
		new Setting(optionsSection)
			.setName('Update references')
			.setDesc('Convert place strings to wikilinks after creating notes')
			.addToggle(toggle => toggle
				.setValue(this.options.updateReferences)
				.onChange(value => {
					this.options.updateReferences = value;
					this.previewResult = null;
					this.updateButtonStates();
				})
			);

		// Places folder
		new Setting(optionsSection)
			.setName('Places folder')
			.setDesc('Where to create new place notes')
			.addText(text => text
				.setValue(this.options.placesFolder)
				.onChange(value => {
					this.options.placesFolder = value || DEFAULT_PLACE_GENERATOR_OPTIONS.placesFolder;
				})
			);
	}

	/**
	 * Render initial prompt before preview
	 */
	private renderInitialPrompt(): void {
		if (!this.resultsContainer) return;

		this.resultsContainer.empty();
		this.resultsContainer.createEl('p', {
			text: 'Click "Preview" to scan for place strings that can be converted to place notes.',
			cls: 'crc-text--muted'
		});
	}

	/**
	 * Run preview scan
	 */
	private async runPreview(): Promise<void> {
		if (this.isScanning || this.isGenerating) return;

		this.isScanning = true;
		this.updateButtonStates();

		// Show progress
		if (this.progressContainer) {
			this.progressContainer.style.display = 'block';
			this.progressContainer.empty();
			this.progressContainer.createEl('p', { text: 'Scanning notes for place strings...' });
		}

		try {
			this.previewResult = await this.service.preview(this.options);
			this.renderPreviewResults();
		} catch (error) {
			console.error('Error scanning for places:', error);
			new Notice('Error scanning notes. Check console for details.');
		} finally {
			this.isScanning = false;
			this.updateButtonStates();
			if (this.progressContainer) {
				this.progressContainer.style.display = 'none';
			}
		}
	}

	/**
	 * Render preview results
	 */
	private renderPreviewResults(): void {
		if (!this.resultsContainer || !this.previewResult) return;

		this.resultsContainer.empty();
		const result = this.previewResult;

		// No places found
		if (result.placesFound === 0) {
			const successMsg = this.resultsContainer.createDiv({ cls: 'crc-success-callout' });
			const successIcon = createLucideIcon('check-circle', 16);
			successMsg.appendChild(successIcon);
			successMsg.appendText(' No place strings found. All places may already be using wikilinks.');
			return;
		}

		// Summary section
		const summary = this.resultsContainer.createDiv({ cls: 'cr-place-generator-summary' });
		summary.createEl('h4', { text: 'Preview summary' });

		const statsGrid = summary.createDiv({ cls: 'cr-place-generator-stats' });

		this.createStatItem(statsGrid, 'map-pin', 'Places found', result.placesFound);
		this.createStatItem(statsGrid, 'plus-circle', 'New notes to create', result.notesCreated);
		this.createStatItem(statsGrid, 'check-circle', 'Existing notes matched', result.existingMatched);

		if (this.options.updateReferences) {
			this.createStatItem(statsGrid, 'link', 'References to update', result.referencesUpdated);
		}

		// Place list section
		const placesSection = this.resultsContainer.createDiv({ cls: 'cr-place-generator-places' });
		placesSection.createEl('h4', { text: 'Places to create' });

		// Filter to show only places that would be new
		const newPlaces = result.foundPlaces.filter(p => {
			// Simple heuristic: places with referencing files are primary places
			return p.referencingFiles.length > 0;
		});

		if (newPlaces.length === 0) {
			placesSection.createEl('p', {
				text: 'No new place notes needed. All places already exist.',
				cls: 'crc-text--muted'
			});
		} else {
			const list = placesSection.createEl('ul', { cls: 'cr-place-generator-place-list' });

			// Show up to 30 places
			const maxToShow = 30;
			const placesToShow = newPlaces.slice(0, maxToShow);

			for (const place of placesToShow) {
				const li = list.createEl('li');
				const placeText = li.createSpan({ text: place.placeString });

				// Show reference count
				if (place.referencingFiles.length > 0) {
					li.createSpan({
						text: ` (${place.referencingFiles.length} reference${place.referencingFiles.length === 1 ? '' : 's'})`,
						cls: 'crc-text--muted'
					});
				}

				// Show hierarchy if parsing is enabled
				if (this.options.parseHierarchy && place.hierarchyParts.length > 1) {
					li.createEl('br');
					li.createSpan({
						text: `  └ Hierarchy: ${place.hierarchyParts.join(' → ')}`,
						cls: 'crc-text--small crc-text--muted'
					});
				}
			}

			if (newPlaces.length > maxToShow) {
				list.createEl('li', {
					text: `... and ${newPlaces.length - maxToShow} more`,
					cls: 'crc-text--muted'
				});
			}
		}

		// Warning callout
		const warning = this.resultsContainer.createDiv({ cls: 'crc-warning-callout' });
		const warningIcon = createLucideIcon('alert-triangle', 16);
		warning.appendChild(warningIcon);
		warning.createSpan({
			text: ' Backup your vault before proceeding. This operation will create new files and modify existing notes.'
		});

		this.updateButtonStates();
	}

	/**
	 * Create a stat item
	 */
	private createStatItem(
		container: HTMLElement,
		iconName: 'map-pin' | 'plus-circle' | 'check-circle' | 'link' | 'file-text',
		label: string,
		value: number
	): void {
		const item = container.createDiv({ cls: 'cr-place-generator-stat-item' });
		const icon = createLucideIcon(iconName, 16);
		item.appendChild(icon);
		item.createSpan({ text: `${label}: ` });
		item.createSpan({ text: String(value), cls: 'cr-place-generator-stat-value' });
	}

	/**
	 * Run place generation
	 */
	private async runGenerate(): Promise<void> {
		if (this.isScanning || this.isGenerating || !this.previewResult) return;

		// Confirm before proceeding
		if (this.previewResult.notesCreated > 0 || this.previewResult.referencesUpdated > 0) {
			const confirmMessage = `This will create ${this.previewResult.notesCreated} place note(s)`;
			const updateMessage = this.options.updateReferences
				? ` and update ${this.previewResult.referencesUpdated} reference(s)`
				: '';
			const proceed = confirm(`${confirmMessage}${updateMessage}. Continue?`);
			if (!proceed) return;
		}

		this.isGenerating = true;
		this.updateButtonStates();

		// Show progress
		if (this.progressContainer) {
			this.progressContainer.style.display = 'block';
			this.progressContainer.empty();
		}

		try {
			const result = await this.service.generate({
				...this.options,
				dryRun: false
			});

			this.renderGenerationResults(result);

			// Callback
			if (this.modalOptions.onComplete) {
				this.modalOptions.onComplete(result);
			}

			// Success notice
			if (result.errors.length === 0) {
				new Notice(`Created ${result.notesCreated} place note(s), updated ${result.referencesUpdated} reference(s).`);
			} else {
				new Notice(`Completed with ${result.errors.length} error(s). Check console for details.`);
			}

		} catch (error) {
			console.error('Error generating place notes:', error);
			new Notice('Error generating place notes. Check console for details.');
		} finally {
			this.isGenerating = false;
			this.updateButtonStates();
			if (this.progressContainer) {
				this.progressContainer.style.display = 'none';
			}
		}
	}

	/**
	 * Render generation results
	 */
	private renderGenerationResults(result: PlaceGeneratorResult): void {
		if (!this.resultsContainer) return;

		this.resultsContainer.empty();

		// Success header
		const header = this.resultsContainer.createDiv({ cls: 'cr-place-generator-complete-header' });
		const successIcon = createLucideIcon('check-circle', 24);
		header.appendChild(successIcon);
		header.createEl('h4', { text: 'Generation complete' });

		// Stats grid
		const statsGrid = this.resultsContainer.createDiv({ cls: 'cr-place-generator-stats' });

		this.createStatItem(statsGrid, 'plus-circle', 'Notes created', result.notesCreated);
		this.createStatItem(statsGrid, 'check-circle', 'Existing matched', result.existingMatched);
		this.createStatItem(statsGrid, 'link', 'References updated', result.referencesUpdated);
		this.createStatItem(statsGrid, 'file-text', 'Files modified', result.filesModified);

		// Errors section
		if (result.errors.length > 0) {
			const errorsSection = this.resultsContainer.createDiv({ cls: 'cr-place-generator-errors' });
			errorsSection.createEl('h4', { text: 'Errors' });

			const errorList = errorsSection.createEl('ul', { cls: 'cr-place-generator-error-list' });
			for (const error of result.errors.slice(0, 10)) {
				errorList.createEl('li', {
					text: `${error.place}: ${error.error}`,
					cls: 'crc-text--error'
				});
			}

			if (result.errors.length > 10) {
				errorList.createEl('li', {
					text: `... and ${result.errors.length - 10} more errors`,
					cls: 'crc-text--muted'
				});
			}
		}

		// Created notes section
		if (result.placeNotes.length > 0) {
			const notesSection = this.resultsContainer.createDiv({ cls: 'cr-place-generator-created-notes' });
			notesSection.createEl('h4', { text: 'Created notes' });

			const newNotes = result.placeNotes.filter(n => n.isNew);
			if (newNotes.length > 0) {
				const list = notesSection.createEl('ul', { cls: 'cr-place-generator-note-list' });

				for (const note of newNotes.slice(0, 20)) {
					const li = list.createEl('li');
					const link = li.createEl('a', {
						text: note.name,
						cls: 'cr-place-generator-note-link'
					});
					link.addEventListener('click', (e) => {
						e.preventDefault();
						void this.app.workspace.openLinkText(note.path, '');
					});
				}

				if (newNotes.length > 20) {
					list.createEl('li', {
						text: `... and ${newNotes.length - 20} more`,
						cls: 'crc-text--muted'
					});
				}
			}
		}

		// Clear preview result so generate button is disabled
		this.previewResult = null;
		this.updateButtonStates();
	}

	/**
	 * Update button states
	 */
	private updateButtonStates(): void {
		const canScan = !this.isScanning && !this.isGenerating &&
			(this.options.scanPersonNotes || this.options.scanEventNotes);

		const canGenerate = !this.isScanning && !this.isGenerating &&
			this.previewResult !== null &&
			(this.previewResult.notesCreated > 0 || this.previewResult.referencesUpdated > 0);

		if (this.previewButton) {
			this.previewButton.disabled = !canScan;
			this.previewButton.textContent = this.isScanning ? 'Scanning...' : 'Preview';
		}

		if (this.generateButton) {
			this.generateButton.disabled = !canGenerate;
			this.generateButton.textContent = this.isGenerating ? 'Generating...' : 'Generate';
		}
	}
}
