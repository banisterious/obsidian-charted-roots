/**
 * Bulk Geocode Modal
 *
 * Modal for batch geocoding of places without coordinates.
 * Shows progress, allows cancellation, and displays results summary.
 */

import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { GeocodingService, GeocodingResult, BulkGeocodingResult } from '../services/geocoding-service';
import { PlaceGraphService } from '../../core/place-graph';
import type { PlaceNode } from '../../models/place';
import { createLucideIcon, setLucideIcon } from '../../ui/lucide-icons';

/**
 * Options for the bulk geocode modal
 */
export interface BulkGeocodeModalOptions {
	/** Callback when geocoding is complete */
	onComplete?: (result: BulkGeocodingResult) => void;
}

/**
 * Modal for bulk geocoding places
 */
export class BulkGeocodeModal extends Modal {
	private placeGraph: PlaceGraphService;
	private geocodingService: GeocodingService;
	private options: BulkGeocodeModalOptions;

	private placesToGeocode: PlaceNode[] = [];
	private isRunning = false;
	private isCancelled = false;
	private hasCompleted = false;

	private progressContainer: HTMLElement | null = null;
	private progressBar: HTMLElement | null = null;
	private progressText: HTMLElement | null = null;
	private resultsList: HTMLElement | null = null;
	private startButton: HTMLButtonElement | null = null;
	private cancelButton: HTMLButtonElement | null = null;

	constructor(
		app: App,
		placeGraph: PlaceGraphService,
		options: BulkGeocodeModalOptions = {}
	) {
		super(app);
		this.placeGraph = placeGraph;
		this.geocodingService = new GeocodingService(app);
		this.options = options;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-bulk-geocode-modal');

		// Modal title
		contentEl.createEl('h2', { text: 'Bulk geocode places' });

		// Load places without coordinates
		this.loadPlacesToGeocode();

		// Description
		const description = contentEl.createDiv({ cls: 'cr-bulk-geocode-description' });

		if (this.placesToGeocode.length === 0) {
			description.createEl('p', {
				text: 'All places already have coordinates.',
				cls: 'cr-text-success'
			});

			new Setting(contentEl)
				.addButton(btn => btn
					.setButtonText('Close')
					.onClick(() => this.close()));

			return;
		}

		description.createEl('p', {
			text: `Found ${this.placesToGeocode.length} place${this.placesToGeocode.length !== 1 ? 's' : ''} without coordinates.`
		});

		description.createEl('p', {
			text: 'This will use OpenStreetMap\'s Nominatim service to look up coordinates. The process respects the API rate limit (1 request per second).',
			cls: 'cr-text-muted cr-text-small'
		});

		// Estimated time
		const estimatedMinutes = Math.ceil(this.placesToGeocode.length / 60);
		const timeText = estimatedMinutes === 1 ? 'about 1 minute' : `about ${estimatedMinutes} minutes`;
		description.createEl('p', {
			text: `Estimated time: ${timeText}`,
			cls: 'cr-text-muted cr-text-small'
		});

		// Progress section (hidden initially)
		this.progressContainer = contentEl.createDiv({ cls: 'cr-bulk-geocode-progress cr-hidden' });

		const progressHeader = this.progressContainer.createDiv({ cls: 'cr-progress-header' });
		this.progressText = progressHeader.createEl('span', { text: 'Starting...' });

		const progressBarContainer = this.progressContainer.createDiv({ cls: 'cr-progress-bar-container' });
		this.progressBar = progressBarContainer.createDiv({ cls: 'cr-progress-bar' });
		this.progressBar.style.width = '0%';

		// Results list (scrollable)
		this.resultsList = this.progressContainer.createDiv({ cls: 'cr-geocode-results-list' });

		// Backup warning
		const warning = contentEl.createDiv({ cls: 'crc-warning-callout' });
		const warningIcon = createLucideIcon('alert-triangle', 16);
		warning.appendChild(warningIcon);
		warning.createSpan({
			text: ' Backup your vault before proceeding. This operation will modify existing notes.'
		});

		// Buttons
		const buttonsContainer = contentEl.createDiv({ cls: 'cr-bulk-geocode-buttons' });

		new Setting(buttonsContainer)
			.addButton(btn => {
				this.cancelButton = btn.buttonEl;
				btn.setButtonText('Cancel')
					.onClick(() => {
						if (this.isRunning) {
							this.isCancelled = true;
							btn.setDisabled(true);
							btn.setButtonText('Cancelling...');
						} else {
							this.close();
						}
					});
			})
			.addButton(btn => {
				this.startButton = btn.buttonEl;
				btn.setButtonText('Start geocoding')
					.setCta()
					.onClick(() => this.startGeocoding());
			});
	}

	onClose(): void {
		// Only set cancelled if we're still running and haven't completed
		// (prevents false "cancelled" message when closing after completion)
		if (this.isRunning && !this.hasCompleted) {
			this.isCancelled = true;
		}
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Load places that need geocoding
	 */
	private loadPlacesToGeocode(): void {
		const allPlaces = this.placeGraph.getAllPlaces();

		// Filter to places without coordinates that are "real" category
		// (fictional/mythological places shouldn't use real-world geocoding)
		this.placesToGeocode = allPlaces.filter(place =>
			!place.coordinates &&
			['real', 'historical', 'disputed'].includes(place.category)
		);
	}

	/**
	 * Start the geocoding process
	 */
	private async startGeocoding(): Promise<void> {
		// Guard against re-entry: don't start if already running or already completed
		if (this.isRunning || this.hasCompleted) return;

		this.isRunning = true;
		this.isCancelled = false;
		this.hasCompleted = false;

		// Update UI
		if (this.startButton) {
			this.startButton.disabled = true;
			this.startButton.textContent = 'Processing...';
		}

		if (this.progressContainer) {
			this.progressContainer.removeClass('cr-hidden');
		}

		// Prepare places for geocoding
		const placesForGeocoding = this.placesToGeocode.map(place => ({
			name: place.name,
			parentPlace: place.parentId ? this.placeGraph.getPlaceByCrId(place.parentId)?.name : undefined,
			hasCoordinates: false,
			node: place
		}));

		let successCount = 0;
		let failCount = 0;

		// Run geocoding
		const result = await this.geocodingService.geocodeBulk(
			placesForGeocoding,
			{
				onProgress: (current, total, geocodeResult) => {
					this.updateProgress(current, total, geocodeResult);

					if (geocodeResult.success && geocodeResult.coordinates) {
						successCount++;
					} else if (!geocodeResult.error?.includes('Already has')) {
						failCount++;
					}
				},
				isCancelled: () => this.isCancelled
			}
		);

		// Update files with coordinates
		let updatedCount = 0;
		for (let i = 0; i < result.results.length; i++) {
			const geocodeResult = result.results[i];
			if (geocodeResult.success && geocodeResult.coordinates) {
				const place = placesForGeocoding[i].node;
				const file = this.app.vault.getAbstractFileByPath(place.filePath);
				if (file instanceof TFile) {
					try {
						await this.geocodingService.updatePlaceCoordinates(file, geocodeResult.coordinates);
						updatedCount++;
					} catch (error) {
						console.error(`Failed to update ${place.name}:`, error);
					}
				}
			}
		}

		// Mark as completed before showing completion UI
		this.hasCompleted = true;

		// Show completion
		this.showCompletion(result, updatedCount);

		// Callback
		this.options.onComplete?.(result);

		this.isRunning = false;
	}

	/**
	 * Update progress display
	 */
	private updateProgress(current: number, total: number, result: GeocodingResult): void {
		const percent = Math.round((current / total) * 100);

		if (this.progressBar) {
			this.progressBar.style.width = `${percent}%`;
		}

		if (this.progressText) {
			this.progressText.textContent = `Processing ${current} of ${total} (${percent}%)`;
		}

		if (this.resultsList) {
			const item = this.resultsList.createDiv({ cls: 'cr-geocode-result-item' });

			const icon = item.createSpan({ cls: 'cr-geocode-result-icon' });
			if (result.success && result.coordinates) {
				setLucideIcon(icon, 'check', 14);
				icon.addClass('cr-text-success');
			} else if (result.error?.includes('Already has')) {
				setLucideIcon(icon, 'minus', 14);
				icon.addClass('cr-text-muted');
			} else {
				setLucideIcon(icon, 'x', 14);
				icon.addClass('cr-text-warning');
			}

			const text = item.createSpan({ cls: 'cr-geocode-result-text' });
			text.textContent = result.placeName;

			if (result.success && result.coordinates) {
				const coords = item.createSpan({ cls: 'cr-geocode-result-coords cr-text-muted' });
				coords.textContent = ` (${result.coordinates.lat.toFixed(4)}, ${result.coordinates.long.toFixed(4)})`;
			} else if (result.error && !result.error.includes('Already has')) {
				const error = item.createSpan({ cls: 'cr-geocode-result-error cr-text-warning' });
				error.textContent = ` - ${result.error}`;
			}

			// Auto-scroll to bottom
			this.resultsList.scrollTop = this.resultsList.scrollHeight;
		}
	}

	/**
	 * Show completion summary
	 */
	private showCompletion(result: BulkGeocodingResult, updatedCount: number): void {
		if (this.progressText) {
			if (result.cancelled > 0) {
				this.progressText.textContent = `Cancelled. Processed ${result.total - result.cancelled} of ${result.total}.`;
			} else {
				this.progressText.textContent = 'Complete!';
			}
		}

		if (this.startButton) {
			this.startButton.textContent = 'Done';
			this.startButton.disabled = false;
			this.startButton.onclick = () => this.close();
		}

		if (this.cancelButton) {
			this.cancelButton.style.display = 'none';
		}

		// Show summary notice
		const message = result.cancelled > 0
			? `Geocoding cancelled. Found ${result.success} coordinates, updated ${updatedCount} files.`
			: `Geocoding complete! Found ${result.success} coordinates, updated ${updatedCount} files. ${result.failed} not found.`;

		new Notice(message, 5000);
	}
}
