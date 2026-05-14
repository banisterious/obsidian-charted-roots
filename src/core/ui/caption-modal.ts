/**
 * Caption Modal (#523)
 *
 * Single-field text input for setting a per-image caption on a media
 * gallery thumbnail. Mirrors the right-click "Set crop region" affordance
 * shape — opens from the gallery item's context menu, and the saved
 * value is persisted to the entity note's `media_captions` frontmatter
 * array (keyed by image filename, symmetric with `media_crop`).
 */

import { Modal, App, Setting, TFile } from 'obsidian';

export interface CaptionResult {
	/** Image filename (e.g. "wedding-1925.jpg") used as the key in media_captions */
	image: string;
	/** Caption text to save (empty string = remove the caption entry) */
	caption: string;
}

export class CaptionModal extends Modal {
	private imageFile: TFile;
	private existingCaption: string;
	private onSave: (result: CaptionResult) => void;

	constructor(
		app: App,
		imageFile: TFile,
		existingCaption: string | undefined,
		onSave: (result: CaptionResult) => void
	) {
		super(app);
		this.imageFile = imageFile;
		this.existingCaption = existingCaption ?? '';
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-caption-modal');

		contentEl.createEl('h2', {
			text: this.existingCaption ? 'Edit caption' : 'Set caption'
		});
		contentEl.createEl('p', {
			text: this.imageFile.name,
			cls: 'cr-caption-modal__filename'
		});

		let captionValue = this.existingCaption;

		new Setting(contentEl)
			.setName('Caption')
			.setDesc('Short label rendered beneath the thumbnail in the gallery')
			.addText(text => {
				text.setValue(captionValue);
				text.setPlaceholder('e.g. Wedding day, June 1925');
				text.onChange(v => {
					captionValue = v;
				});
				// Save on Enter key for one-shot entry.
				text.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						this.commit(captionValue);
					}
				});
				// Focus + select-all so the user can immediately overwrite an existing value.
				window.setTimeout(() => {
					text.inputEl.focus();
					text.inputEl.select();
				}, 0);
			});

		const buttonRow = contentEl.createDiv({ cls: 'cr-caption-modal__buttons' });
		const cancelBtn = buttonRow.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const saveBtn = buttonRow.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveBtn.addEventListener('click', () => this.commit(captionValue));
	}

	private commit(captionValue: string): void {
		this.onSave({
			image: this.imageFile.name,
			caption: captionValue.trim()
		});
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}