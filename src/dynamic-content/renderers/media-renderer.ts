/**
 * Media Renderer
 *
 * Renders media gallery HTML for the charted-roots-media code block.
 * Creates a styled grid of thumbnails from the note's `media` frontmatter property.
 */

import { MarkdownRenderChild, TFile, Notice, setIcon, setTooltip, Menu } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { DynamicBlockContext, DynamicBlockConfig } from '../services/dynamic-content-service';
import type { DynamicContentService } from '../services/dynamic-content-service';
import { extractWikilinkPath } from '../../utils/wikilink-resolver';
import { openGalleryLightbox, type LightboxItem } from '../../ui/media-lightbox-modal';
import { PdfThumbnailService } from '../../core/pdf-thumbnail-service';
import { type MediaCrop } from '../../core/media-service';
import { applyCropToImage } from '../../core/crop-renderer';
import { CropRegionModal, type CropRegionResult } from '../../core/ui/crop-region-modal';
import { CaptionModal, type CaptionResult } from '../../core/ui/caption-modal';

/**
 * Media item extracted from frontmatter
 */
export interface MediaItem {
	/** Original wikilink from frontmatter (e.g., "[[media/photo.jpg]]") */
	wikilink: string;
	/** Resolved file path */
	path: string;
	/** File extension (lowercase) */
	extension: string;
	/** Resolved TFile if it exists */
	file?: TFile;
	/** Whether this is an image (vs document) */
	isImage: boolean;
	/** Whether this is the first item (thumbnail) */
	isThumbnail: boolean;
	/** Crop region for this image (#354) */
	crop?: MediaCrop;
	/** Caption for this image (#523) — short label rendered beneath the thumbnail */
	caption?: string;
}

/**
 * Gallery size configuration
 */
type GallerySize = 'small' | 'medium' | 'large';

/**
 * Gallery filter type
 */
type GalleryFilter = 'all' | 'images' | 'documents';

/**
 * Renders media gallery content into an HTML element
 */
export class MediaRenderer {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private currentItems: MediaItem[] = [];
	private currentContext: DynamicBlockContext | null = null;
	private isEditable: boolean = false;
	private gridElement: HTMLElement | null = null;
	private draggedItem: HTMLElement | null = null;
	private draggedIndex: number = -1;
	private pdfThumbnailService: PdfThumbnailService;

	constructor(plugin: CanvasRootsPlugin, service: DynamicContentService) {
		this.plugin = plugin;
		this.service = service;
		this.pdfThumbnailService = new PdfThumbnailService(plugin.app);
	}

	/**
	 * Render the media gallery block
	 */
	render(
		el: HTMLElement,
		context: DynamicBlockContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): void {
		// Parse editable option
		this.isEditable = this.parseEditable(config.editable);

		const containerClasses = ['cr-dynamic-block', 'cr-media'];
		if (this.isEditable) {
			containerClasses.push('cr-media--editable');
		}
		const container = el.createDiv({ cls: containerClasses.join(' ') });

		// Get media items from frontmatter
		const items = this.getMediaItems(context, config);

		// Store for freeze functionality
		this.currentItems = items;
		this.currentContext = context;

		// Parse config options
		const columns = this.parseColumns(config.columns);
		const size = this.parseSize(config.size);

		// Render header
		this.renderHeader(container, items.length, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (items.length === 0) {
			this.renderEmptyState(contentEl);
			return;
		}

		// Render gallery grid
		this.renderGalleryGrid(contentEl, items, columns, size, component);
	}

	/**
	 * Get media items from the note's frontmatter
	 */
	private getMediaItems(context: DynamicBlockContext, config: DynamicBlockConfig): MediaItem[] {
		const { file } = context;
		const app = this.plugin.app;

		// Get frontmatter
		const cache = app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;

		if (!frontmatter) {
			return [];
		}

		// Get media array from frontmatter
		const mediaProperty = this.plugin.resolveFrontmatterProperty<string | string[]>(frontmatter, 'media');

		if (!mediaProperty) {
			return [];
		}

		// Normalize to array
		const mediaLinks = Array.isArray(mediaProperty) ? mediaProperty : [mediaProperty];

		// Parse filter option
		const filter = this.parseFilter(config.filter);

		// Parse media_crop array (#354)
		const cropMap = new Map<string, MediaCrop>();
		if (Array.isArray(frontmatter.media_crop)) {
			for (const entry of frontmatter.media_crop) {
				if (typeof entry === 'object' && entry) {
					const obj = entry as Record<string, unknown>;
					const image = obj.image as string;
					if (image && typeof obj.x === 'number' && typeof obj.y === 'number' &&
						typeof obj.w === 'number' && typeof obj.h === 'number') {
						cropMap.set(image, { x: obj.x, y: obj.y, w: obj.w, h: obj.h });
					}
				}
			}
		}

		// Parse media_captions array (#523) — keyed by filename, mirroring media_crop.
		const captionMap = this.plugin.getMediaService()?.parseMediaCaptions(frontmatter) ?? new Map<string, string>();

		// Convert to MediaItem objects
		const items: MediaItem[] = [];

		for (let i = 0; i < mediaLinks.length; i++) {
			const link = mediaLinks[i];
			const item = this.parseMediaLink(link, i === 0);

			if (!item) continue;

			// Attach crop if defined (#354)
			if (item.file) {
				const crop = cropMap.get(item.file.name) || cropMap.get(item.file.basename + '.' + item.file.extension);
				if (crop) {
					item.crop = crop;
				}
				// Attach caption if defined (#523)
				const caption = captionMap.get(item.file.name) || captionMap.get(item.file.basename + '.' + item.file.extension);
				if (caption) {
					item.caption = caption;
				}
			}

			// Apply filter
			if (filter === 'images' && !item.isImage) continue;
			if (filter === 'documents' && item.isImage) continue;

			items.push(item);
		}

		return items;
	}

	/**
	 * Parse a media wikilink into a MediaItem
	 */
	private parseMediaLink(link: unknown, isFirst: boolean): MediaItem | null {
		if (!link) return null;

		// Handle different link formats:
		// 1. String wikilink: "[[filename.jpg]]" (properly quoted in YAML)
		// 2. Link object: { link: "filename.jpg", ... } (Obsidian parses unquoted [[]] as Link)
		// 3. Nested array: [["filename.jpg"]] (YAML parses unquoted [[]] as nested array)
		let linkStr: string;
		if (typeof link === 'string') {
			linkStr = link;
		} else if (typeof link === 'object' && 'link' in link && typeof (link as { link: unknown }).link === 'string') {
			// Obsidian Link object - extract the path directly
			linkStr = (link as { link: string }).link;
		} else if (Array.isArray(link)) {
			// Nested array from YAML parsing unquoted [[filename]] as [["filename"]]
			// Commas in filenames cause YAML to split into multiple elements,
			// e.g. [[Name, File.jpg]] → [["Name", " File.jpg"]]
			const inner = link.length === 1 && Array.isArray(link[0]) ? link[0] as unknown[] : link;
			if (inner.length > 0 && inner.every((el): el is string => typeof el === 'string')) {
				linkStr = inner.map(s => s.trim()).join(', ');
			} else {
				return null;
			}
		} else {
			return null;
		}

		// Strip wikilink brackets and handle alias format
		const path = extractWikilinkPath(linkStr) || linkStr;

		if (!path) return null;

		// Get extension
		const lastDot = path.lastIndexOf('.');
		const extension = lastDot !== -1 ? path.substring(lastDot + 1).toLowerCase() : '';

		// Check if it's an image
		const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff'];
		const isImage = imageExtensions.includes(extension);

		// Try to resolve the file
		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(path, '');

		return {
			wikilink: linkStr.includes('[[') ? linkStr : `[[${linkStr}]]`,
			path,
			extension,
			file: file instanceof TFile ? file : undefined,
			isImage,
			isThumbnail: isFirst
		};
	}

	/**
	 * Parse columns config option
	 */
	private parseColumns(value: unknown): number | 'auto' {
		if (value === 'auto') return 'auto';
		if (typeof value === 'number' && value >= 2 && value <= 6) return value;
		return 3; // default
	}

	/**
	 * Parse size config option
	 */
	private parseSize(value: unknown): GallerySize {
		if (value === 'small' || value === 'medium' || value === 'large') {
			return value;
		}
		return 'medium'; // default
	}

	/**
	 * Parse filter config option
	 */
	private parseFilter(value: unknown): GalleryFilter {
		if (value === 'images' || value === 'documents' || value === 'all') {
			return value;
		}
		return 'all'; // default
	}

	/**
	 * Parse editable config option
	 */
	private parseEditable(value: unknown): boolean {
		if (value === true || value === 'true') return true;
		return false; // default
	}

	/**
	 * Render the header with title and toolbar
	 */
	private renderHeader(container: HTMLElement, itemCount: number, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		// Title with count
		const titleText = config.title as string || 'Media Gallery';
		const titleWithCount = itemCount > 0 ? `${titleText} (${itemCount})` : titleText;

		const titleEl = header.createSpan({ cls: 'cr-dynamic-block__title' });

		// Add icon
		const iconEl = titleEl.createSpan({ cls: 'cr-dynamic-block__icon' });
		setIcon(iconEl, 'image');

		titleEl.createSpan({ text: ` ${titleWithCount}` });

		// Toolbar
		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

		// Freeze button
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to markdown' }
		});
		freezeBtn.textContent = '❄️';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});

		// Copy button
		const copyBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Copy as embeds' }
		});
		copyBtn.textContent = '📋';
		copyBtn.addEventListener('click', () => {
			this.copyAsEmbeds();
		});
	}

	/**
	 * Render empty state when no media is linked
	 */
	private renderEmptyState(contentEl: HTMLElement): void {
		const empty = contentEl.createDiv({ cls: 'cr-media__empty' });

		// Icon
		const iconEl = empty.createDiv({ cls: 'cr-media__empty-icon' });
		setIcon(iconEl, 'image');

		empty.createDiv({ cls: 'cr-media__empty-text', text: 'No media linked to this note.' });
		empty.createDiv({ cls: 'cr-media__empty-hint', text: 'Add media wikilinks to the "media" frontmatter property.' });
	}

	/**
	 * Render the gallery grid
	 */
	private renderGalleryGrid(
		contentEl: HTMLElement,
		items: MediaItem[],
		columns: number | 'auto',
		size: GallerySize,
		_component: MarkdownRenderChild
	): void {
		// Create grid with appropriate classes
		const gridClasses = ['cr-media__grid'];

		if (columns === 'auto') {
			gridClasses.push('cr-media__grid--auto');
		} else {
			gridClasses.push(`cr-media__grid--cols-${columns}`);
		}

		gridClasses.push(`cr-media__grid--${size}`);

		const grid = contentEl.createDiv({ cls: gridClasses.join(' ') });
		this.gridElement = grid;

		// Render each item with index for drag-and-drop
		for (let i = 0; i < items.length; i++) {
			this.renderGalleryItem(grid, items[i], i);
		}
	}

	/**
	 * Render a single gallery item
	 */
	private renderGalleryItem(grid: HTMLElement, item: MediaItem, index: number): void {
		const itemClasses = ['cr-media__item'];
		if (item.isThumbnail) {
			itemClasses.push('cr-media__item--thumbnail');
		}

		const itemEl = grid.createDiv({ cls: itemClasses.join(' ') });
		itemEl.dataset.index = String(index);
		itemEl.dataset.wikilink = item.wikilink;

		// Add drag handle when editable
		if (this.isEditable) {
			itemEl.setAttribute('draggable', 'true');
			this.setupDragEvents(itemEl, index);

			// Add drag handle indicator using Lucide grip-vertical icon
			const handle = itemEl.createDiv({ cls: 'cr-media__drag-handle' });
			setIcon(handle, 'grip-vertical');
			setTooltip(handle, 'Drag to reorder');
		}

		if (item.isImage && item.file) {
			// Render image thumbnail
			const img = itemEl.createEl('img', {
				cls: 'cr-media__image',
				attr: {
					alt: item.file.basename,
					loading: 'lazy'
				}
			});

			// Get resource path for the image
			const resourcePath = this.plugin.app.vault.getResourcePath(item.file);
			img.src = resourcePath;

			// Apply crop region if defined (#354)
			if (item.crop && item.file) {
				void applyCropToImage(this.plugin.app, img, item.file, item.crop);
			}

			// Add click handler to open in lightbox
			// Using lightbox keeps the note in reading mode (fixes issue #232)
			// Use capture phase and stopImmediatePropagation to intercept before Obsidian
			// Also handle mousedown to prevent Obsidian's edit mode trigger
			// In editable mode, use double-click to avoid conflicts with drag
			const clickEvent = this.isEditable ? 'dblclick' : 'click';

			// Prevent mousedown from triggering edit mode
			// preventDefault() stops the focus change that causes the mode switch
			// In editable mode, allow mousedown through so drag-to-reorder works (#236)
			if (!this.isEditable) {
				itemEl.addEventListener('mousedown', (e) => {
					e.preventDefault();
					e.stopImmediatePropagation();
				}, { capture: true });
			}

			itemEl.addEventListener(clickEvent, (e) => {
				e.stopImmediatePropagation();
				e.preventDefault();
				this.openImageLightbox(index);
			}, { capture: true });

			// Add right-click context menu for editing metadata (#234)
			itemEl.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				const menu = new Menu();

				menu.addItem((menuItem) => {
					menuItem
						.setTitle('Open in Obsidian')
						.setIcon('image')
						.onClick(() => {
							if (item.file) {
								// Use openLinkText to trigger Obsidian's native file handling
								// This enables compatibility with plugins like "Image Metadata"
								void this.plugin.app.workspace.openLinkText(item.path, '', false);
							}
						});
				});

				menu.addItem((menuItem) => {
					menuItem
						.setTitle('Open in new tab')
						.setIcon('file-plus')
						.onClick(() => {
							if (item.file) {
								void this.plugin.app.workspace.getLeaf('tab').openFile(item.file);
							}
						});
				});

				// Set crop region for images (#354)
				if (item.isImage && item.file && this.currentContext) {
					menu.addSeparator();
					menu.addItem((menuItem) => {
						menuItem
							.setTitle(item.crop ? 'Edit crop region' : 'Set crop region')
							.setIcon('crop')
							.onClick(() => {
								if (!item.file || !this.currentContext) return;
								new CropRegionModal(
									this.plugin.app,
									item.file,
									this.currentContext.file,
									(result: CropRegionResult) => {
										this.saveCropToFrontmatter(result);
									},
									item.crop
								).open();
							});
					});

					if (item.crop) {
						menu.addItem((menuItem) => {
							menuItem
								.setTitle('Remove crop')
								.setIcon('x')
								.onClick(() => {
									if (!item.file || !this.currentContext) return;
									this.removeCropFromFrontmatter(item.file.name);
								});
						});
					}

					// Set / edit / remove caption (#523) — mirrors the crop affordance.
					menu.addSeparator();
					menu.addItem((menuItem) => {
						menuItem
							.setTitle(item.caption ? 'Edit caption' : 'Set caption')
							.setIcon('text-cursor-input')
							.onClick(() => {
								if (!item.file || !this.currentContext) return;
								new CaptionModal(
									this.plugin.app,
									item.file,
									item.caption,
									(result: CaptionResult) => {
										this.saveCaptionToFrontmatter(result);
									}
								).open();
							});
					});

					if (item.caption) {
						menu.addItem((menuItem) => {
							menuItem
								.setTitle('Remove caption')
								.setIcon('x')
								.onClick(() => {
									if (!item.file || !this.currentContext) return;
									this.removeCaptionFromFrontmatter(item.file.name);
								});
						});
					}
				}

				menu.showAtMouseEvent(e);
			});

			// Add thumbnail badge if applicable
			if (item.isThumbnail) {
				const badge = itemEl.createDiv({ cls: 'cr-media__badge', text: 'Thumbnail' });
				badge.setAttribute('aria-label', 'This image is used as the thumbnail');
			}

		} else if (item.extension === 'pdf' && item.file) {
			// Render PDF thumbnail (#350)
			itemEl.addClass('cr-media__item--pdf');

			// Show placeholder while thumbnail generates
			const placeholderEl = itemEl.createDiv({ cls: 'cr-media__doc-icon' });
			setIcon(placeholderEl, 'file-text');

			const nameEl = itemEl.createDiv({ cls: 'cr-media__doc-name' });
			nameEl.textContent = item.file.basename || 'PDF';

			// Generate thumbnail asynchronously
			void this.pdfThumbnailService.getThumbnail(item.file).then(dataUrl => {
				if (dataUrl) {
					placeholderEl.remove();
					nameEl.remove();
					const img = itemEl.createEl('img', {
						cls: 'cr-media__pdf-thumb',
						attr: {
							src: dataUrl,
							alt: item.file?.basename || 'PDF preview',
							loading: 'lazy'
						}
					});
					img.addEventListener('error', () => {
						img.remove();
						const fallback = itemEl.createDiv({ cls: 'cr-media__doc-icon' });
						setIcon(fallback, 'file-text');
					});
				}
			});

			// Click opens PDF in Obsidian viewer
			const clickEvent = this.isEditable ? 'dblclick' : 'click';
			itemEl.addEventListener(clickEvent, () => {
				void this.plugin.app.workspace.openLinkText(item.path, '', false);
			});
		} else {
			// Render document placeholder
			itemEl.addClass('cr-media__item--doc');

			const iconEl = itemEl.createDiv({ cls: 'cr-media__doc-icon' });
			setIcon(iconEl, this.getDocumentIconName(item.extension));

			const nameEl = itemEl.createDiv({ cls: 'cr-media__doc-name' });
			nameEl.textContent = item.file?.basename || item.path.split('/').pop() || 'Document';

			// Add click handler to open document
			// In editable mode, use double-click to avoid conflicts with drag
			const clickEvent = this.isEditable ? 'dblclick' : 'click';
			itemEl.addEventListener(clickEvent, () => {
				if (item.file) {
					void this.plugin.app.workspace.openLinkText(item.path, '', false);
				}
			});
		}

		// Render per-image caption beneath the thumbnail (#523).
		// Single-line truncated; full text on hover via the title attribute.
		if (item.caption) {
			const captionEl = itemEl.createDiv({
				cls: 'cr-media__caption',
				text: item.caption
			});
			setTooltip(captionEl, item.caption);
		}
	}

	/**
	 * Setup drag-and-drop event handlers for an item
	 */
	private setupDragEvents(itemEl: HTMLElement, index: number): void {
		itemEl.addEventListener('dragstart', (e) => {
			this.draggedItem = itemEl;
			this.draggedIndex = index;
			itemEl.addClass('cr-media__item--dragging');
			e.dataTransfer?.setData('text/plain', String(index));
			e.dataTransfer!.effectAllowed = 'move';
		});

		itemEl.addEventListener('dragend', () => {
			itemEl.removeClass('cr-media__item--dragging');
			this.draggedItem = null;
			this.draggedIndex = -1;

			// Remove all drag-over classes
			if (this.gridElement) {
				this.gridElement.querySelectorAll('.cr-media__item--drag-over').forEach(el => {
					el.removeClass('cr-media__item--drag-over');
				});
			}
		});

		itemEl.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.dataTransfer!.dropEffect = 'move';

			// Don't highlight self
			if (this.draggedIndex === index) return;

			itemEl.addClass('cr-media__item--drag-over');
		});

		itemEl.addEventListener('dragleave', () => {
			itemEl.removeClass('cr-media__item--drag-over');
		});

		itemEl.addEventListener('drop', (e) => {
			e.preventDefault();
			itemEl.removeClass('cr-media__item--drag-over');

			const fromIndex = this.draggedIndex;
			const toIndex = index;

			if (fromIndex === -1 || fromIndex === toIndex) return;

			// Reorder items
			void this.reorderItems(fromIndex, toIndex);
		});
	}

	/**
	 * Reorder items and update frontmatter
	 */
	private async reorderItems(fromIndex: number, toIndex: number): Promise<void> {
		if (!this.currentContext || !this.gridElement) return;

		// Move item in array
		const [movedItem] = this.currentItems.splice(fromIndex, 1);
		this.currentItems.splice(toIndex, 0, movedItem);

		// Update isThumbnail flags
		this.currentItems.forEach((item, i) => {
			item.isThumbnail = i === 0;
		});

		// Visually reorder DOM elements
		this.updateGridOrder();

		// Update frontmatter
		const newMediaRefs = this.currentItems.map(item => item.wikilink);
		await this.updateMediaFrontmatter(this.currentContext.file, newMediaRefs);

		new Notice('Media order updated');
	}

	/**
	 * Update the visual order of grid items to match currentItems
	 */
	private updateGridOrder(): void {
		if (!this.gridElement) return;

		const domItems = Array.from(this.gridElement.children) as HTMLElement[];

		// Build a map of wikilink -> DOM element for matching
		const domMap = new Map<string, HTMLElement>();
		for (const domItem of domItems) {
			const wikilink = this.getWikilinkFromDom(domItem);
			if (wikilink) {
				domMap.set(wikilink, domItem);
			}
		}

		// Re-append in new order based on currentItems
		for (let i = 0; i < this.currentItems.length; i++) {
			const mediaItem = this.currentItems[i];
			const domItem = domMap.get(mediaItem.wikilink);

			if (domItem) {
				// Update thumbnail styling
				if (i === 0) {
					domItem.addClass('cr-media__item--thumbnail');
					// Add badge if not present
					if (!domItem.querySelector('.cr-media__badge')) {
						const badge = domItem.createDiv({ cls: 'cr-media__badge', text: 'Thumbnail' });
						badge.setAttribute('aria-label', 'This image is used as the thumbnail');
					}
				} else {
					domItem.removeClass('cr-media__item--thumbnail');
					// Remove badge if present
					const badge = domItem.querySelector('.cr-media__badge');
					if (badge) badge.remove();
				}

				// Update index
				domItem.dataset.index = String(i);
				domItem.dataset.wikilink = mediaItem.wikilink;

				// Re-append to move to correct position
				this.gridElement.appendChild(domItem);
			}
		}

		// Re-setup drag events with new indices
		const newItems = Array.from(this.gridElement.children) as HTMLElement[];
		newItems.forEach((el, i) => {
			// Remove old listeners by cloning (simplest approach)
			const newEl = el.cloneNode(true) as HTMLElement;
			el.replaceWith(newEl);
			this.setupDragEvents(newEl, i);
		});
	}

	/**
	 * Extract the wikilink from a DOM element for matching
	 */
	private getWikilinkFromDom(el: HTMLElement): string | null {
		// Check stored data attribute first
		if (el.dataset.wikilink) {
			return el.dataset.wikilink;
		}

		// For images, extract from src
		const img = el.querySelector('img');
		if (img && img.src) {
			// Match against current items by checking if src contains the file path
			for (const item of this.currentItems) {
				if (item.file && img.src.includes(encodeURIComponent(item.file.name))) {
					return item.wikilink;
				}
			}
		}

		// For documents, match by name
		const docName = el.querySelector('.cr-media__doc-name');
		if (docName?.textContent) {
			for (const item of this.currentItems) {
				const expectedName = item.file?.basename || item.path.split('/').pop() || '';
				if (docName.textContent === expectedName) {
					return item.wikilink;
				}
			}
		}

		return null;
	}

	/**
	 * Update the media frontmatter property with new order
	 */
	private async updateMediaFrontmatter(file: TFile, mediaRefs: string[]): Promise<void> {
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			if (mediaRefs.length > 0) {
				fm.media = mediaRefs;
			} else {
				delete fm.media;
			}
		});
	}

	/**
	 * Open the image lightbox for the given item index
	 * Filters to only images with files and finds the correct index
	 */
	private openImageLightbox(clickedIndex: number): void {
		// Filter to only images with resolved files
		const imageItems = this.currentItems.filter(item => item.isImage && item.file);

		if (imageItems.length === 0) return;

		// Find the clicked item in the filtered list
		const clickedItem = this.currentItems[clickedIndex];
		const lightboxIndex = imageItems.findIndex(item =>
			item.file?.path === clickedItem.file?.path
		);

		if (lightboxIndex === -1) return;

		// Convert to LightboxItem format
		const lightboxItems: LightboxItem[] = imageItems.map(item => ({
			file: item.file!,
			displayName: item.file!.basename
		}));

		openGalleryLightbox(this.plugin.app, lightboxItems, lightboxIndex);
	}

	/**
	 * Get Lucide icon name for document type
	 */
	/**
	 * Save crop region to the entity note's frontmatter (#354)
	 */
	private saveCropToFrontmatter(result: CropRegionResult): void {
		if (!this.currentContext) return;

		void this.plugin.app.fileManager.processFrontMatter(this.currentContext.file, (fm) => {
			const crops = Array.isArray(fm.media_crop) ? [...fm.media_crop] : [];

			// Remove existing crop for this image
			const filtered = crops.filter((c: Record<string, unknown>) => c.image !== result.image);

			// Add new crop
			filtered.push({
				image: result.image,
				x: result.crop.x,
				y: result.crop.y,
				w: result.crop.w,
				h: result.crop.h
			});

			fm.media_crop = filtered;
		});
	}

	/**
	 * Remove crop region from the entity note's frontmatter (#354)
	 */
	private removeCropFromFrontmatter(imageName: string): void {
		if (!this.currentContext) return;

		void this.plugin.app.fileManager.processFrontMatter(this.currentContext.file, (fm) => {
			if (!Array.isArray(fm.media_crop)) return;

			fm.media_crop = fm.media_crop.filter((c: Record<string, unknown>) => c.image !== imageName);

			// Remove property entirely if empty
			if (fm.media_crop.length === 0) {
				delete fm.media_crop;
			}
		});

		new Notice('Crop region removed');
	}

	/**
	 * Save (or update) a per-image caption to the entity note's frontmatter
	 * (#523). Mirrors `saveCropToFrontmatter` — keyed by image filename so
	 * captions survive reordering of the primary `media:` array. An empty
	 * caption is treated as a removal request.
	 */
	private saveCaptionToFrontmatter(result: CaptionResult): void {
		if (!this.currentContext) return;

		if (!result.caption) {
			this.removeCaptionFromFrontmatter(result.image);
			return;
		}

		void this.plugin.app.fileManager.processFrontMatter(this.currentContext.file, (fm) => {
			const captions = Array.isArray(fm.media_captions) ? [...fm.media_captions] : [];

			// Replace any existing entry for this image, then append the new one.
			const filtered = captions.filter((c: Record<string, unknown>) => c.image !== result.image);
			filtered.push({ image: result.image, caption: result.caption });

			fm.media_captions = filtered;
		});
	}

	/**
	 * Remove a per-image caption from the entity note's frontmatter (#523).
	 */
	private removeCaptionFromFrontmatter(imageName: string): void {
		if (!this.currentContext) return;

		void this.plugin.app.fileManager.processFrontMatter(this.currentContext.file, (fm) => {
			if (!Array.isArray(fm.media_captions)) return;

			fm.media_captions = fm.media_captions.filter((c: Record<string, unknown>) => c.image !== imageName);

			if (fm.media_captions.length === 0) {
				delete fm.media_captions;
			}
		});

		new Notice('Caption removed');
	}

	private getDocumentIconName(extension: string): string {
		// PDF files use file-text icon
		if (extension === 'pdf') {
			return 'file-text';
		}

		// Generic document icon
		return 'file';
	}

	/**
	 * Copy media items as embed syntax to clipboard
	 */
	private copyAsEmbeds(): void {
		if (this.currentItems.length === 0) {
			new Notice('No media to copy');
			return;
		}

		const embeds = this.currentItems.map(item => `!${item.wikilink}`).join('\n');
		void navigator.clipboard.writeText(embeds);
		new Notice('Copied media embeds to clipboard');
	}

	/**
	 * Generate markdown from current items and replace the code block
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentContext || this.currentItems.length === 0) {
			new Notice('No media to freeze');
			return;
		}

		const markdown = this.generateFrozenMarkdown();
		await this.service.freezeToMarkdown(
			this.currentContext.file,
			'charted-roots-media',
			markdown
		);
	}

	/**
	 * Generate frozen markdown representation using callout syntax.
	 * When an item has a per-image caption (#523), it's preserved by
	 * inserting it as the wikilink's display-text alias so the frozen
	 * output stays self-contained — the gallery block's caption metadata
	 * is no longer consulted once the block is frozen.
	 */
	private generateFrozenMarkdown(): string {
		const calloutType = this.plugin.settings.frozenGalleryCalloutType || 'info';
		const lines: string[] = [`> [!${calloutType}|cr-frozen-gallery]`];

		for (const item of this.currentItems) {
			const wikilink = item.caption
				? this.injectAliasIntoWikilink(item.wikilink, item.caption)
				: item.wikilink;
			lines.push(`> !${wikilink}`);
		}

		return lines.join('\n');
	}

	/**
	 * Insert (or replace) the display-text alias on a wikilink so the
	 * caption surfaces as the alt text in the frozen markdown output.
	 * Falls back to the original wikilink if the input doesn't match
	 * the expected `[[target]]` / `[[target|alias]]` shape.
	 */
	private injectAliasIntoWikilink(wikilink: string, caption: string): string {
		const match = wikilink.match(/^\[\[([^\]]+)\]\]$/);
		if (!match) return wikilink;
		const inner = match[1];
		const target = inner.split('|')[0];
		const safeCaption = caption.replace(/\|/g, ' ').replace(/\]\]/g, ']');
		return `[[${target}|${safeCaption}]]`;
	}
}
