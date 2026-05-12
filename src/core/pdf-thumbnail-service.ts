/**
 * PDF Thumbnail Service (#350)
 *
 * Generates thumbnail previews of PDF first pages using Obsidian's
 * built-in loadPdfJs() API. Thumbnails are cached in memory to avoid
 * re-rendering on every block refresh.
 */

import { TFile, loadPdfJs } from 'obsidian';
import type { App } from 'obsidian';
import { getLogger } from './logging';

const logger = getLogger('PdfThumbnailService');

/** Default thumbnail dimensions */
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 280;

export class PdfThumbnailService {
	private app: App;
	private cache: Map<string, string> = new Map(); // path → data URL
	private pendingRequests: Map<string, Promise<string | null>> = new Map();
	private pdfjsLib: unknown = null;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get a thumbnail data URL for a PDF file.
	 * Returns from cache if available, otherwise generates asynchronously.
	 */
	async getThumbnail(file: TFile): Promise<string | null> {
		// Check cache first
		const cached = this.cache.get(file.path);
		if (cached) return cached;

		// Deduplicate concurrent requests for the same file
		const pending = this.pendingRequests.get(file.path);
		if (pending) return pending;

		const request = this.generateThumbnail(file);
		this.pendingRequests.set(file.path, request);

		try {
			const result = await request;
			return result;
		} finally {
			this.pendingRequests.delete(file.path);
		}
	}

	/**
	 * Check if a thumbnail is already cached (synchronous check).
	 */
	getCached(filePath: string): string | null {
		return this.cache.get(filePath) ?? null;
	}

	/**
	 * Clear the cache (e.g., when vault changes).
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Generate a thumbnail for a PDF file's first page.
	 */
	private async generateThumbnail(file: TFile): Promise<string | null> {
		try {
			// Lazy-load PDF.js
			if (!this.pdfjsLib) {
				this.pdfjsLib = await loadPdfJs();
			}

			const pdfjs = this.pdfjsLib as {
				getDocument: (data: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
			};

			// Read the PDF file
			const arrayBuffer = await this.app.vault.readBinary(file);

			// Load the PDF document
			const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

			// Get the first page
			const page = await pdf.getPage(1);

			// Calculate scale to fit within thumbnail dimensions
			const viewport = page.getViewport({ scale: 1 });
			const scaleX = THUMBNAIL_WIDTH / viewport.width;
			const scaleY = THUMBNAIL_HEIGHT / viewport.height;
			const scale = Math.min(scaleX, scaleY);

			const scaledViewport = page.getViewport({ scale });

			// Create an offscreen canvas
			const canvas = activeDocument.createElement('canvas');
			canvas.width = scaledViewport.width;
			canvas.height = scaledViewport.height;

			const context = canvas.getContext('2d');
			if (!context) {
				logger.warn('generate-thumbnail', 'Could not get canvas 2d context');
				return null;
			}

			// Render the page
			await page.render({
				canvasContext: context,
				viewport: scaledViewport
			}).promise;

			// Convert to data URL
			const dataUrl = canvas.toDataURL('image/png');

			// Cache the result
			this.cache.set(file.path, dataUrl);

			logger.debug('generate-thumbnail', `Generated thumbnail for ${file.path} (${canvas.width}×${canvas.height})`);

			// Clean up
			pdf.destroy();

			return dataUrl;
		} catch (error) {
			logger.warn('generate-thumbnail', `Failed to generate thumbnail for ${file.path}`, { error });
			return null;
		}
	}
}

/** Minimal PDF.js document interface */
interface PdfDocument {
	getPage(pageNumber: number): Promise<PdfPage>;
	destroy(): void;
}

/** Minimal PDF.js page interface */
interface PdfPage {
	getViewport(options: { scale: number }): { width: number; height: number };
	render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
}
