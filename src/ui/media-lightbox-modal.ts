/**
 * Media Lightbox Modal
 *
 * A shared lightbox modal for viewing images without navigating away
 * from the current note. Used by charted-roots-media and sources media gallery.
 */

import { App, Modal, TFile, setIcon, MarkdownView, WorkspaceLeaf } from 'obsidian';

/**
 * Minimal interface for lightbox items
 */
export interface LightboxItem {
	/** The resolved file */
	file: TFile;
	/** Display name for the caption */
	displayName: string;
	/** Optional subtitle for additional context */
	subtitle?: string;
}

/**
 * Modal for viewing images in a lightbox overlay
 *
 * This modal saves and restores the reading mode state to prevent
 * Obsidian's focus management from switching notes to edit mode
 * when the modal closes.
 */
export class MediaLightboxModal extends Modal {
	private items: LightboxItem[];
	private currentIndex: number;
	private imageContainer: HTMLElement | null = null;
	private captionEl: HTMLElement | null = null;
	private counterEl: HTMLElement | null = null;

	// Saved leaf for restoring view state on close
	private savedLeaf: WorkspaceLeaf | null = null;

	constructor(app: App, items: LightboxItem[], startIndex: number = 0) {
		super(app);
		this.items = items;
		this.currentIndex = startIndex;

		// Save the current view state before opening
		this.saveViewState();
	}

	/**
	 * Save the current leaf so we can restore its state on close
	 */
	private saveViewState(): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			this.savedLeaf = view.leaf;
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-media-lightbox');

		// Close button
		const closeBtn = contentEl.createDiv({ cls: 'cr-media-lightbox-close' });
		setIcon(closeBtn, 'x');
		closeBtn.addEventListener('click', () => this.close());

		// Navigation (if multiple images)
		if (this.items.length > 1) {
			// Previous button
			const prevBtn = contentEl.createDiv({ cls: 'cr-media-lightbox-nav cr-media-lightbox-prev' });
			setIcon(prevBtn, 'chevron-left');
			prevBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.navigate(-1);
			});

			// Next button
			const nextBtn = contentEl.createDiv({ cls: 'cr-media-lightbox-nav cr-media-lightbox-next' });
			setIcon(nextBtn, 'chevron-right');
			nextBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.navigate(1);
			});
		}

		// Image container
		this.imageContainer = contentEl.createDiv({ cls: 'cr-media-lightbox-image-container' });

		// Footer with caption and counter
		const footer = contentEl.createDiv({ cls: 'cr-media-lightbox-footer' });
		this.captionEl = footer.createDiv({ cls: 'cr-media-lightbox-caption' });
		this.counterEl = footer.createDiv({ cls: 'cr-media-lightbox-counter' });

		// Render current image
		this.renderCurrentImage();

		// Keyboard navigation
		this.scope.register([], 'ArrowLeft', () => {
			this.navigate(-1);
			return false;
		});
		this.scope.register([], 'ArrowRight', () => {
			this.navigate(1);
			return false;
		});
		this.scope.register([], 'Escape', () => {
			this.close();
			return false;
		});

		// Click outside to close
		contentEl.addEventListener('click', (e) => {
			if (e.target === contentEl || e.target === this.imageContainer) {
				this.close();
			}
		});
	}

	private navigate(direction: number): void {
		const newIndex = this.currentIndex + direction;
		if (newIndex >= 0 && newIndex < this.items.length) {
			this.currentIndex = newIndex;
			this.renderCurrentImage();
		}
	}

	private renderCurrentImage(): void {
		if (!this.imageContainer || !this.captionEl || !this.counterEl) return;

		const item = this.items[this.currentIndex];
		if (!item.file) return;

		// Clear container
		this.imageContainer.empty();

		// Load image
		const imgUrl = this.app.vault.getResourcePath(item.file);
		this.imageContainer.createEl('img', {
			cls: 'cr-media-lightbox-image',
			attr: {
				src: imgUrl,
				alt: item.displayName
			}
		});

		// Update caption
		this.captionEl.empty();
		this.captionEl.createDiv({ cls: 'cr-media-lightbox-filename', text: item.displayName });
		if (item.subtitle) {
			this.captionEl.createDiv({
				cls: 'cr-media-lightbox-source',
				text: item.subtitle
			});
		}

		// Update counter
		if (this.items.length > 1) {
			this.counterEl.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
		} else {
			this.counterEl.textContent = '';
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Always restore to preview mode when lightbox closes.
		// The lightbox is used from reading mode contexts (media gallery in code blocks),
		// and Obsidian's focus management can switch to edit mode. Since preventing
		// the mode switch via preventDefault doesn't work (Obsidian uses a different
		// mechanism), we simply restore to preview mode unconditionally.
		if (this.savedLeaf) {
			const leaf = this.savedLeaf;
			// Use setTimeout to ensure this runs after Obsidian's focus restoration
			activeWindow.setTimeout(() => {
				const view = leaf.view;
				if (view instanceof MarkdownView) {
					const currentState = view.getState();
					if (currentState.mode !== 'preview') {
						void view.setState({ ...currentState, mode: 'preview' }, { history: false });
					}
				}
			}, 0);
		}
	}
}

/**
 * Helper to open a single image in the lightbox
 */
export function openImageLightbox(app: App, file: TFile, displayName?: string): void {
	const item: LightboxItem = {
		file,
		displayName: displayName || file.basename
	};
	new MediaLightboxModal(app, [item], 0).open();
}

/**
 * Helper to open multiple images in the lightbox with navigation
 */
export function openGalleryLightbox(
	app: App,
	items: LightboxItem[],
	startIndex: number = 0
): void {
	if (items.length === 0) return;
	new MediaLightboxModal(app, items, startIndex).open();
}
