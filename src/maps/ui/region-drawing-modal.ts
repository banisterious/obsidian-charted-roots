/**
 * Region Drawing Modal (#362)
 *
 * Visual modal for drawing a rectangular region on a parent map image.
 * The user draws/adjusts a rectangle to define where a child map sits
 * on its parent, and the coordinates are saved as parent_region_x/y/w/h.
 */

import { Modal, App, Notice } from 'obsidian';
import type { CustomMapConfig } from '../types/map-types';
import { resolveImageToUrl } from '../../utils/wikilink-resolver';

export interface RegionDrawingResult {
	x: number;
	y: number;
	w: number;
	h: number;
}

export class RegionDrawingModal extends Modal {
	private parentMapConfig: CustomMapConfig;
	private childMapName: string;
	private existingRegion?: RegionDrawingResult;
	private onSave: (result: RegionDrawingResult) => void;

	// Canvas elements
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private loadedImage: HTMLImageElement | null = null;

	// Display scaling (image may be scaled to fit modal)
	private scale: number = 1;

	// Region rectangle (in image-pixel coordinates for canvas drawing)
	private regionRect: RegionDrawingResult = { x: 0, y: 0, w: 100, h: 100 };

	// Scale factors between image pixels and parent map bounds space
	private boundsScaleX: number = 1;
	private boundsScaleY: number = 1;

	// Drag state
	private isDragging: boolean = false;
	private isResizing: boolean = false;
	private isDrawing: boolean = false;
	private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
	private drawStart: { x: number; y: number } = { x: 0, y: 0 };

	// Coordinate display element
	private coordDisplay: HTMLElement | null = null;

	constructor(
		app: App,
		parentMapConfig: CustomMapConfig,
		childMapName: string,
		onSave: (result: RegionDrawingResult) => void,
		existingRegion?: RegionDrawingResult
	) {
		super(app);
		this.parentMapConfig = parentMapConfig;
		this.childMapName = childMapName;
		this.onSave = onSave;
		this.existingRegion = existingRegion;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-region-drawing-modal');

		contentEl.createEl('h2', { text: 'Draw child map region' });
		contentEl.createEl('p', {
			text: `Draw the region on "${this.parentMapConfig.name}" where "${this.childMapName}" is located. Click and drag to draw a rectangle, or adjust the existing one.`,
			cls: 'cr-region-drawing-modal__desc'
		});

		// Canvas container
		const canvasContainer = contentEl.createDiv({ cls: 'cr-region-drawing-modal__canvas-container' });

		// Load and display the parent map image
		void this.loadImage(canvasContainer);

		// Coordinate display
		this.coordDisplay = contentEl.createDiv({ cls: 'cr-region-drawing-modal__coords' });

		// Buttons
		const footer = contentEl.createDiv({ cls: 'cr-region-drawing-modal__footer' });

		const clearBtn = footer.createEl('button', { text: 'Clear region' });
		clearBtn.addEventListener('click', () => {
			this.initDefaultRect();
			this.renderCanvas();
			this.updateCoordDisplay();
		});

		const btnGroup = footer.createDiv({ cls: 'cr-region-drawing-modal__buttons' });

		const cancelBtn = btnGroup.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const saveBtn = btnGroup.createEl('button', { text: 'Save region', cls: 'mod-cta' });
		saveBtn.addEventListener('click', () => {
			this.saveRegion();
		});
	}

	private async loadImage(container: HTMLElement): Promise<void> {
		const imageUrl = await resolveImageToUrl(this.app, this.parentMapConfig.imagePath);
		if (!imageUrl) {
			container.createEl('p', {
				text: 'Failed to load parent map image',
				cls: 'cr-region-drawing-modal__error'
			});
			return;
		}

		const img = new Image();

		img.onload = () => {
			this.loadedImage = img;

			// Compute scale factors between image pixels and parent map bounds
			// The parent map's bounds define its Leaflet coordinate space.
			// For pixel CRS: boundsWidth = image_width (or auto-detected), same for height.
			// The modal draws on the actual image, so we need to map between the two.
			const bounds = this.parentMapConfig.bounds;
			const boundsW = Math.abs(bounds.bottomRight.x - bounds.topLeft.x);
			const boundsH = Math.abs(bounds.topLeft.y - bounds.bottomRight.y);
			this.boundsScaleX = boundsW / img.naturalWidth;
			this.boundsScaleY = boundsH / img.naturalHeight;

			// Calculate scale to fit in modal (max 700px wide, 500px tall)
			const maxW = 700;
			const maxH = 500;
			this.scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);

			const displayW = Math.round(img.naturalWidth * this.scale);
			const displayH = Math.round(img.naturalHeight * this.scale);

			// Create canvas
			this.canvas = container.createEl('canvas', {
				cls: 'cr-region-drawing-modal__canvas',
				attr: {
					width: String(displayW),
					height: String(displayH)
				}
			});
			this.ctx = this.canvas.getContext('2d');

			// Initialize region rectangle (convert from bounds space to image-pixel space)
			if (this.existingRegion) {
				this.regionRect = this.boundsToImageCoords(this.existingRegion);
			} else {
				this.initDefaultRect();
			}

			// Setup mouse events
			this.setupMouseEvents();

			// Initial render
			this.renderCanvas();
			this.updateCoordDisplay();
		};

		img.onerror = () => {
			container.createEl('p', {
				text: 'Failed to load parent map image',
				cls: 'cr-region-drawing-modal__error'
			});
		};

		img.src = imageUrl;
	}

	private initDefaultRect(): void {
		if (!this.loadedImage) return;
		// Default: center rectangle, 1/4 of image dimensions
		const w = Math.round(this.loadedImage.naturalWidth / 4);
		const h = Math.round(this.loadedImage.naturalHeight / 4);
		this.regionRect = {
			x: Math.round((this.loadedImage.naturalWidth - w) / 2),
			y: Math.round((this.loadedImage.naturalHeight - h) / 2),
			w,
			h
		};
	}

	private setupMouseEvents(): void {
		if (!this.canvas) return;

		this.canvas.addEventListener('mousedown', (e) => {
			const rect = this.canvas!.getBoundingClientRect();
			const mx = (e.clientX - rect.left) / this.scale;
			const my = (e.clientY - rect.top) / this.scale;

			// Check if clicking near the bottom-right corner (resize handle)
			const handleSize = 15 / this.scale;
			const cr = this.regionRect;
			if (Math.abs(mx - (cr.x + cr.w)) < handleSize && Math.abs(my - (cr.y + cr.h)) < handleSize) {
				this.isResizing = true;
			}
			// Check if clicking inside the rectangle (drag)
			else if (mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) {
				this.isDragging = true;
				this.dragOffset = { x: mx - cr.x, y: my - cr.y };
			}
			// Click outside — start drawing a new rectangle
			else {
				this.isDrawing = true;
				this.drawStart = { x: mx, y: my };
				this.regionRect = { x: Math.round(mx), y: Math.round(my), w: 0, h: 0 };
			}
		});

		this.canvas.addEventListener('mousemove', (e) => {
			if (!this.isDragging && !this.isResizing && !this.isDrawing) {
				// Update cursor based on hover position
				this.updateCursor(e);
				return;
			}

			const rect = this.canvas!.getBoundingClientRect();
			const mx = (e.clientX - rect.left) / this.scale;
			const my = (e.clientY - rect.top) / this.scale;

			if (this.isDragging) {
				this.regionRect.x = Math.round(mx - this.dragOffset.x);
				this.regionRect.y = Math.round(my - this.dragOffset.y);
				this.clampRegionRect();
			} else if (this.isResizing) {
				this.regionRect.w = Math.max(20, Math.round(mx - this.regionRect.x));
				this.regionRect.h = Math.max(20, Math.round(my - this.regionRect.y));
				this.clampRegionRect();
			} else if (this.isDrawing) {
				// Draw from start point to current position
				const x = Math.min(this.drawStart.x, mx);
				const y = Math.min(this.drawStart.y, my);
				const w = Math.abs(mx - this.drawStart.x);
				const h = Math.abs(my - this.drawStart.y);
				this.regionRect = {
					x: Math.round(x),
					y: Math.round(y),
					w: Math.max(20, Math.round(w)),
					h: Math.max(20, Math.round(h))
				};
				this.clampRegionRect();
			}

			this.renderCanvas();
			this.updateCoordDisplay();
		});

		const endDrag = () => {
			this.isDragging = false;
			this.isResizing = false;
			this.isDrawing = false;
		};

		this.canvas.addEventListener('mouseup', endDrag);
		this.canvas.addEventListener('mouseleave', endDrag);
	}

	private updateCursor(e: MouseEvent): void {
		if (!this.canvas) return;
		const rect = this.canvas.getBoundingClientRect();
		const mx = (e.clientX - rect.left) / this.scale;
		const my = (e.clientY - rect.top) / this.scale;

		const handleSize = 15 / this.scale;
		const cr = this.regionRect;

		if (Math.abs(mx - (cr.x + cr.w)) < handleSize && Math.abs(my - (cr.y + cr.h)) < handleSize) {
			this.canvas.style.cursor = 'nwse-resize';
		} else if (mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) {
			this.canvas.style.cursor = 'move';
		} else {
			this.canvas.style.cursor = 'crosshair';
		}
	}

	private clampRegionRect(): void {
		if (!this.loadedImage) return;
		const iw = this.loadedImage.naturalWidth;
		const ih = this.loadedImage.naturalHeight;

		// Clamp size
		this.regionRect.w = Math.min(this.regionRect.w, iw);
		this.regionRect.h = Math.min(this.regionRect.h, ih);

		// Clamp position
		this.regionRect.x = Math.max(0, Math.min(this.regionRect.x, iw - this.regionRect.w));
		this.regionRect.y = Math.max(0, Math.min(this.regionRect.y, ih - this.regionRect.h));
	}

	private renderCanvas(): void {
		if (!this.ctx || !this.canvas || !this.loadedImage) return;

		const ctx = this.ctx;
		const img = this.loadedImage;
		const s = this.scale;
		const cr = this.regionRect;

		// Clear
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw full image
		ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

		// Darken outside region
		ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		// Top
		ctx.fillRect(0, 0, this.canvas.width, cr.y * s);
		// Bottom
		ctx.fillRect(0, (cr.y + cr.h) * s, this.canvas.width, this.canvas.height - (cr.y + cr.h) * s);
		// Left
		ctx.fillRect(0, cr.y * s, cr.x * s, cr.h * s);
		// Right
		ctx.fillRect((cr.x + cr.w) * s, cr.y * s, this.canvas.width - (cr.x + cr.w) * s, cr.h * s);

		// Draw region border (dashed, matching overlay style)
		ctx.strokeStyle = '#4a90d9';
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 4]);
		ctx.strokeRect(cr.x * s, cr.y * s, cr.w * s, cr.h * s);
		ctx.setLineDash([]);

		// Draw resize handle (bottom-right corner)
		const handleSize = 8;
		ctx.fillStyle = '#4a90d9';
		ctx.fillRect(
			(cr.x + cr.w) * s - handleSize,
			(cr.y + cr.h) * s - handleSize,
			handleSize * 2,
			handleSize * 2
		);

		// Draw corner markers
		ctx.fillStyle = '#ffffff';
		const cornerSize = 4;
		// Top-left
		ctx.fillRect(cr.x * s - cornerSize / 2, cr.y * s - cornerSize / 2, cornerSize, cornerSize);
		// Top-right
		ctx.fillRect((cr.x + cr.w) * s - cornerSize / 2, cr.y * s - cornerSize / 2, cornerSize, cornerSize);
		// Bottom-left
		ctx.fillRect(cr.x * s - cornerSize / 2, (cr.y + cr.h) * s - cornerSize / 2, cornerSize, cornerSize);
	}

	private updateCoordDisplay(): void {
		if (!this.coordDisplay) return;
		const r = this.regionRect;
		this.coordDisplay.setText(
			`Region: x=${r.x}, y=${r.y}, w=${r.w}, h=${r.h}`
		);
	}

	/**
	 * Convert from parent map bounds space to image-pixel space (for canvas drawing)
	 */
	private boundsToImageCoords(region: RegionDrawingResult): RegionDrawingResult {
		return {
			x: Math.round(region.x / this.boundsScaleX),
			y: Math.round(region.y / this.boundsScaleY),
			w: Math.round(region.w / this.boundsScaleX),
			h: Math.round(region.h / this.boundsScaleY)
		};
	}

	/**
	 * Convert from image-pixel space to parent map bounds space (for saving)
	 */
	private imageToBoundsCoords(region: RegionDrawingResult): RegionDrawingResult {
		return {
			x: Math.round(region.x * this.boundsScaleX),
			y: Math.round(region.y * this.boundsScaleY),
			w: Math.round(region.w * this.boundsScaleX),
			h: Math.round(region.h * this.boundsScaleY)
		};
	}

	private saveRegion(): void {
		// Convert from image-pixel space to parent map bounds space
		const result = this.imageToBoundsCoords(this.regionRect);

		this.onSave(result);
		new Notice('Child map region saved');
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
