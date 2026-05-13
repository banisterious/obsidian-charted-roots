/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Modal for adding research questions to an entity note
 */

import { App, Modal, Setting, TFile } from 'obsidian';

export class AddResearchQuestionModal extends Modal {
	private file: TFile;
	private inputEl: HTMLInputElement | null = null;

	constructor(app: App, file: TFile) {
		super(app);
		this.file = file;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('crc-add-research-question-modal');

		contentEl.createEl('h2', { text: 'Add research question' });

		const form = contentEl.createDiv({ cls: 'crc-form' });

		new Setting(form)
			.setName('Research question')
			.setDesc('What needs to be researched for this entity?')
			.addText(text => {
				text.setPlaceholder('e.g., Find birth certificate');
				this.inputEl = text.inputEl;
				// Focus and handle Enter key
				text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						void this.submit();
					}
				});
			});

		new Setting(form)
			.addButton(btn => btn
				.setButtonText('Add question')
				.setCta()
				.onClick(() => void this.submit()));

		// Focus the input after a short delay
		window.setTimeout(() => {
			this.inputEl?.focus();
		}, 50);
	}

	async submit(): Promise<void> {
		const question = this.inputEl?.value.trim();
		if (!question) {
			return;
		}

		await this.app.fileManager.processFrontMatter(this.file, (fm) => {
			if (!Array.isArray(fm.needs_research)) {
				fm.needs_research = [];
			}
			fm.needs_research.push(question);
		});

		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}