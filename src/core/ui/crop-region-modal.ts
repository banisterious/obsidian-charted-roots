/**
 * Crop Region Modal (#354)
 *
 * Visual modal for selecting a rectangular region of an image.
 * The user draws/adjusts a rectangle on the image, and the
 * coordinates are saved to the note's flat crop properties (#683).
 */

import { Modal, App, TFile, Notice } from 'obsidian';
import type { MediaCrop } from '../media-service';

export interface CropRegionResult {
	image: string;
	crop: MediaCrop;
}

export class CropRegionModal extends Modal {
	private imageFile: TFile;
	private entityFile: TFile;
	private existingCrop?: MediaCrop;
	private onSave: (result: CropRegionResult) => void;

	// Canvas elements
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private loadedImage: HTMLImageElement | null = null;

	// Display scaling (image may be scaled to fit modal)
	private scale: number = 1;

	// Crop rectangle (in original image coordinates)
	private cropRect: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 100, h: 100 };

	// Drag state
	private isDragging: boolean = false;
	private isResizing: boolean = false;
	private dragStart: { x: number; y: number } = { x: 0, y: 0 };
	private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

	constructor(
		app: App,
		imageFile: TFile,
		entityFile: TFile,
		onSave: (result: CropRegionResult) => void,
		existingCrop?: MediaCrop
	) {
		super(app);
		this.imageFile = imageFile;
		this.entityFile = entityFile;
		this.onSave = onSave;
		this.existingCrop = existingCrop;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-crop-modal');

		contentEl.createEl('h2', { text: 'Select crop region' });
		contentEl.createEl('p', {
			text: `Select the region of "${this.imageFile.basename}" to use as the thumbnail.`,
			cls: 'cr-crop-modal__desc'
		});

		// Canvas container
		const canvasContainer = contentEl.createDiv({ cls: 'cr-crop-modal__canvas-container' });

		// Load and display the image
		this.loadImage(canvasContainer);

		// Preview + buttons
		const footer = contentEl.createDiv({ cls: 'cr-crop-modal__footer' });

		const previewContainer = footer.createDiv({ cls: 'cr-crop-modal__preview' });
		previewContainer.createEl('span', { text: 'Preview:', cls: 'cr-crop-modal__preview-label' });
		const previewImg = previewContainer.createEl('img', {
			cls: 'cr-crop-modal__preview-img',
			attr: { alt: 'Crop preview' }
		});

		const buttons = footer.createDiv({ cls: 'cr-crop-modal__buttons' });

		const cancelBtn = buttons.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const saveBtn = buttons.createEl('button', { text: 'Save crop', cls: 'mod-cta' });
		saveBtn.addEventListener('click', () => {
			this.saveCrop();
		});

		// Store preview img ref for updates
		this.previewImg = previewImg;
	}

	private previewImg: HTMLImageElement | null = null;

	private loadImage(container: HTMLElement): void {
		const resourcePath = this.app.vault.getResourcePath(this.imageFile);
		const img = new Image();

		img.onload = () => {
			this.loadedImage = img;

			// Calculate scale to fit in modal (max 600px wide, 400px tall)
			const maxW = 600;
			const maxH = 400;
			this.scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);

			const displayW = Math.round(img.naturalWidth * this.scale);
			const displayH = Math.round(img.naturalHeight * this.scale);

			// Create canvas
			this.canvas = container.createEl('canvas', {
				cls: 'cr-crop-modal__canvas',
				attr: {
					width: String(displayW),
					height: String(displayH)
				}
			});
			this.ctx = this.canvas.getContext('2d');

			// Initialize crop rectangle
			if (this.existingCrop) {
				this.cropRect = { ...this.existingCrop };
			} else {
				// Default: center square, 1/3 of smallest dimension
				const size = Math.min(img.naturalWidth, img.naturalHeight) / 3;
				this.cropRect = {
					x: Math.round((img.naturalWidth - size) / 2),
					y: Math.round((img.naturalHeight - size) / 2),
					w: Math.round(size),
					h: Math.round(size)
				};
			}

			// Setup mouse events
			this.setupMouseEvents();

			// Initial render
			this.renderCanvas();
			this.updatePreview();
		};

		img.onerror = () => {
			container.createEl('p', { text: 'Failed to load image', cls: 'cr-crop-modal__error' });
		};

		img.src = resourcePath;
	}

	private setupMouseEvents(): void {
		if (!this.canvas) return;

		this.canvas.addEventListener('mousedown', (e) => {
			const rect = this.canvas!.getBoundingClientRect();
			const mx = (e.clientX - rect.left) / this.scale;
			const my = (e.clientY - rect.top) / this.scale;

			// Check if clicking near the bottom-right corner (resize handle)
			const handleSize = 15 / this.scale;
			const cr = this.cropRect;
			if (Math.abs(mx - (cr.x + cr.w)) < handleSize && Math.abs(my - (cr.y + cr.h)) < handleSize) {
				this.isResizing = true;
				this.dragStart = { x: mx, y: my };
			}
			// Check if clicking inside the crop rectangle (drag)
			else if (mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) {
				this.isDragging = true;
				this.dragOffset = { x: mx - cr.x, y: my - cr.y };
			}
			// Click outside — move crop to click position
			else {
				this.cropRect.x = Math.round(mx - cr.w / 2);
				this.cropRect.y = Math.round(my - cr.h / 2);
				this.clampCropRect();
				this.isDragging = true;
				this.dragOffset = { x: cr.w / 2, y: cr.h / 2 };
				this.renderCanvas();
				this.updatePreview();
			}
		});

		this.canvas.addEventListener('mousemove', (e) => {
			if (!this.isDragging && !this.isResizing) return;

			const rect = this.canvas!.getBoundingClientRect();
			const mx = (e.clientX - rect.left) / this.scale;
			const my = (e.clientY - rect.top) / this.scale;

			if (this.isDragging) {
				this.cropRect.x = Math.round(mx - this.dragOffset.x);
				this.cropRect.y = Math.round(my - this.dragOffset.y);
				this.clampCropRect();
			} else if (this.isResizing) {
				this.cropRect.w = Math.max(20, Math.round(mx - this.cropRect.x));
				this.cropRect.h = Math.max(20, Math.round(my - this.cropRect.y));
				this.clampCropRect();
			}

			this.renderCanvas();
			this.updatePreview();
		});

		const endDrag = () => {
			this.isDragging = false;
			this.isResizing = false;
		};

		this.canvas.addEventListener('mouseup', endDrag);
		this.canvas.addEventListener('mouseleave', endDrag);
	}

	private clampCropRect(): void {
		if (!this.loadedImage) return;
		const iw = this.loadedImage.naturalWidth;
		const ih = this.loadedImage.naturalHeight;

		// Clamp size
		this.cropRect.w = Math.min(this.cropRect.w, iw);
		this.cropRect.h = Math.min(this.cropRect.h, ih);

		// Clamp position
		this.cropRect.x = Math.max(0, Math.min(this.cropRect.x, iw - this.cropRect.w));
		this.cropRect.y = Math.max(0, Math.min(this.cropRect.y, ih - this.cropRect.h));
	}

	private renderCanvas(): void {
		if (!this.ctx || !this.canvas || !this.loadedImage) return;

		const ctx = this.ctx;
		const img = this.loadedImage;
		const s = this.scale;
		const cr = this.cropRect;

		// Clear
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw full image
		ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

		// Darken outside crop region
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		// Top
		ctx.fillRect(0, 0, this.canvas.width, cr.y * s);
		// Bottom
		ctx.fillRect(0, (cr.y + cr.h) * s, this.canvas.width, this.canvas.height - (cr.y + cr.h) * s);
		// Left
		ctx.fillRect(0, cr.y * s, cr.x * s, cr.h * s);
		// Right
		ctx.fillRect((cr.x + cr.w) * s, cr.y * s, this.canvas.width - (cr.x + cr.w) * s, cr.h * s);

		// Draw crop border
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.strokeRect(cr.x * s, cr.y * s, cr.w * s, cr.h * s);

		// Draw resize handle (bottom-right corner)
		const handleSize = 8;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(
			(cr.x + cr.w) * s - handleSize,
			(cr.y + cr.h) * s - handleSize,
			handleSize * 2,
			handleSize * 2
		);
	}

	private updatePreview(): void {
		if (!this.previewImg || !this.loadedImage) return;

		const canvas = activeDocument.createElement('canvas');
		const cr = this.cropRect;
		canvas.width = cr.w;
		canvas.height = cr.h;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.drawImage(this.loadedImage, cr.x, cr.y, cr.w, cr.h, 0, 0, cr.w, cr.h);
		this.previewImg.src = canvas.toDataURL('image/png');
	}

	private saveCrop(): void {
		this.onSave({
			image: this.imageFile.name,
			crop: { ...this.cropRect }
		});
		new Notice(`Crop region saved for ${this.imageFile.basename}`);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
