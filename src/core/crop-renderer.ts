/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Crop Renderer (#354)
 *
 * Renders cropped image regions using canvas. Accepts a MediaCrop
 * definition and produces either a cropped img element or a data URL.
 */

import type { App } from 'obsidian';
import type { TFile } from 'obsidian';
import type { MediaCrop } from './media-service';
import { getLogger } from './logging';

const logger = getLogger('CropRenderer');

/** Cache of cropped image data URLs */
const cropCache = new Map<string, string>();

/**
 * Get a cache key for a crop operation
 */
function getCacheKey(filePath: string, crop: MediaCrop): string {
	return `${filePath}:${crop.x},${crop.y},${crop.w},${crop.h}`;
}

/**
 * Render a cropped image as a data URL.
 * Returns cached result if available.
 */
export async function getCroppedImageUrl(
	app: App,
	file: TFile,
	crop: MediaCrop
): Promise<string | null> {
	const key = getCacheKey(file.path, crop);
	const cached = cropCache.get(key);
	if (cached) return cached;

	try {
		const resourcePath = app.vault.getResourcePath(file);

		return new Promise<string | null>((resolve) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				try {
					// Convert percentage-based crops to pixel values
					let cx = crop.x, cy = crop.y, cw = crop.w, ch = crop.h;
					if (crop.percent) {
						cx = Math.round(img.naturalWidth * crop.x / 100);
						cy = Math.round(img.naturalHeight * crop.y / 100);
						cw = Math.round(img.naturalWidth * crop.w / 100);
						ch = Math.round(img.naturalHeight * crop.h / 100);
					}

					const canvas = activeDocument.createElement('canvas');
					canvas.width = cw;
					canvas.height = ch;

					const ctx = canvas.getContext('2d');
					if (!ctx) {
						resolve(null);
						return;
					}

					ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
					const dataUrl = canvas.toDataURL('image/png');

					cropCache.set(key, dataUrl);
					logger.debug('crop-render', `Cropped ${file.name} (${crop.w}×${crop.h} from ${crop.x},${crop.y})`);

					resolve(dataUrl);
				} catch (error) {
					logger.warn('crop-render', `Failed to crop ${file.name}`, { error });
					resolve(null);
				}
			};
			img.onerror = () => {
				logger.warn('crop-render', `Failed to load image ${file.name}`);
				resolve(null);
			};
			img.src = resourcePath;
		});
	} catch (error) {
		logger.warn('crop-render', `Failed to get resource path for ${file.name}`, { error });
		return null;
	}
}

/**
 * Apply a crop to an existing img element by replacing its src with a cropped data URL.
 * Falls back to the original image if cropping fails.
 */
export async function applyCropToImage(
	app: App,
	imgEl: HTMLImageElement,
	file: TFile,
	crop: MediaCrop
): Promise<void> {
	const croppedUrl = await getCroppedImageUrl(app, file, crop);
	if (croppedUrl) {
		imgEl.src = croppedUrl;
	}
}

/**
 * Clear the crop cache
 */
export function clearCropCache(): void {
	cropCache.clear();
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment -- Match scope of file-level disable at top. */
