/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Add Citation Modal
 *
 * Creates a citation note linking a source to a specific fact on a person
 * with optional page reference and quality assessment.
 */

import { Modal, Setting, TFile, Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { SourcePickerModal } from './source-picker-modal';
import { CitationNoteService } from '../services/citation-note-service';
import { CITATION_QUALITY_LABELS, type CitationQuality, type CitationData } from '../types/citation-types';

/** Common fact types for the dropdown */
const FACT_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: 'birth_date', label: 'Birth date' },
	{ value: 'birth_place', label: 'Birth place' },
	{ value: 'death_date', label: 'Death date' },
	{ value: 'death_place', label: 'Death place' },
	{ value: 'burial_date', label: 'Burial date' },
	{ value: 'burial_place', label: 'Burial place' },
	{ value: 'baptism_date', label: 'Baptism date' },
	{ value: 'marriage_date', label: 'Marriage date' },
	{ value: 'marriage_place', label: 'Marriage place' },
	{ value: 'divorce_date', label: 'Divorce date' },
	{ value: 'occupation', label: 'Occupation' },
	{ value: 'residence', label: 'Residence' },
	{ value: 'census', label: 'Census' },
	{ value: 'immigration', label: 'Immigration' },
	{ value: 'military_service', label: 'Military service' },
	{ value: 'education', label: 'Education' },
	{ value: 'name', label: 'Name' },
	{ value: 'sex', label: 'Sex' },
];

export class AddCitationModal extends Modal {
	private plugin: CanvasRootsPlugin;
	private subjectFile: TFile;
	private subjectCrId: string;
	private subjectName: string;

	// Form state
	private selectedSourceName = '';
	private selectedSourceCrId = '';
	private selectedFact = '';
	private page = '';
	private quality: CitationQuality | undefined = undefined;

	constructor(app: import('obsidian').App, plugin: CanvasRootsPlugin, subjectFile: TFile, subjectCrId: string) {
		super(app);
		this.plugin = plugin;
		this.subjectFile = subjectFile;
		this.subjectCrId = subjectCrId;
		this.subjectName = subjectFile.basename;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cr-add-citation-modal');

		contentEl.createEl('h2', { text: 'Add citation' });
		contentEl.createEl('p', {
			text: `Adding citation to: ${this.subjectName}`,
			cls: 'setting-item-description'
		});

		const form = contentEl.createDiv({ cls: 'cr-form' });

		// Source picker
		const sourceSetting = new Setting(form)
			.setName('Source')
			.setDesc('Select the source being cited');

		const sourceDisplay = sourceSetting.controlEl.createSpan({
			text: this.selectedSourceName || 'None selected',
			cls: 'cr-add-citation__source-display'
		});

		sourceSetting.addButton(btn => btn
			.setButtonText('Select source')
			.onClick(() => {
				new SourcePickerModal(this.app, this.plugin, {
					onSelect: (source) => {
						this.selectedSourceName = source.title;
						this.selectedSourceCrId = source.crId;
						sourceDisplay.textContent = source.title;
						this.updateSubmitButton();
					}
				}).open();
			}));

		// Fact selector
		new Setting(form)
			.setName('Fact')
			.setDesc('Which fact does this source support?')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Select a fact...');
				for (const opt of FACT_OPTIONS) {
					dropdown.addOption(opt.value, opt.label);
				}
				dropdown.onChange(value => {
					this.selectedFact = value;
					this.updateSubmitButton();
				});
			});

		// Page reference
		new Setting(form)
			.setName('Page / location')
			.setDesc('Page, entry, or location within the source')
			.addText(text => text
				.setPlaceholder('e.g., p. 42, entry 15')
				.onChange(value => {
					this.page = value;
				}));

		// Quality assessment
		new Setting(form)
			.setName('Quality')
			.setDesc('Source quality assessment (GEDCOM QUAY)')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Not specified');
				for (const [key, label] of Object.entries(CITATION_QUALITY_LABELS)) {
					dropdown.addOption(key, `${key} — ${label}`);
				}
				dropdown.onChange(value => {
					this.quality = value ? parseInt(value) as CitationQuality : undefined;
				});
			});

		// Actions
		const actions = new Setting(form);
		actions.addButton(btn => btn
			.setButtonText('Cancel')
			.onClick(() => this.close()));
		actions.addButton(btn => {
			btn.setButtonText('Add citation')
				.setCta()
				.onClick(() => void this.submit());
			btn.buttonEl.addClass('cr-add-citation__submit');
			btn.buttonEl.disabled = true;
		});
	}

	private updateSubmitButton(): void {
		const submitBtn = this.contentEl.querySelector('.cr-add-citation__submit') as HTMLButtonElement;
		if (submitBtn) {
			submitBtn.disabled = !this.selectedSourceCrId || !this.selectedFact;
		}
	}

	private async submit(): Promise<void> {
		if (!this.selectedSourceCrId || !this.selectedFact) return;

		const sourceBaseName = this.app.metadataCache.getFirstLinkpathDest(
			this.selectedSourceName, ''
		)?.basename || this.selectedSourceName;

		const data: CitationData = {
			source: `[[${sourceBaseName}]]`,
			sourceCrId: this.selectedSourceCrId,
			subject: `[[${this.subjectName}]]`,
			subjectCrId: this.subjectCrId,
			fact: this.selectedFact,
			page: this.page || undefined,
			quality: this.quality
		};

		try {
			const citationService = new CitationNoteService(this.plugin);
			const citationFile = await citationService.createCitationNote(data);

			// Add citation link to the subject note
			await this.app.fileManager.processFrontMatter(this.subjectFile, (frontmatter) => {
				const existing = Array.isArray(frontmatter.citations) ? frontmatter.citations : [];
				existing.push(`[[${citationFile.basename}]]`);
				frontmatter.citations = existing;
			});

			new Notice(`Citation added: ${sourceBaseName} → ${this.selectedFact}`);
			this.close();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to create citation: ${message}`);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Match scope of file-level disable at top. */
