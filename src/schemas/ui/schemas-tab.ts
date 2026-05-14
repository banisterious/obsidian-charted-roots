/**
 * Schemas tab for the Control Center
 *
 * Displays schema validation controls, gallery, violations, and statistics.
 */

import { App, ButtonComponent, Menu, MenuItem, Modal, Notice, Setting, TFile, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { setLucideIcon, LucideIconName } from '../../ui/lucide-icons';
import { createStatItem } from '../../ui/shared/card-component';
import { pluralize } from '../../utils/format-utils';
import { SchemaService } from '../services/schema-service';
import { ValidationService } from '../services/validation-service';
import type { SchemaNote, ValidationResult, ValidationSummary } from '../types/schema-types';
import { SchemaValidationProgressModal } from '../../ui/schema-validation-progress-modal';
import { CreateSchemaModal } from '../../ui/create-schema-modal';
import { getErrorMessage } from '../../core/error-utils';

export interface SchemasTabOptions {
	container: HTMLElement;
	plugin: CanvasRootsPlugin;
	app: App;
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement;
	showTab: (tabId: string) => void;
	closeModal: () => void;
}

/** Module-level state: persists across re-renders within the modal lifecycle */
let lastValidationResults: ValidationResult[] = [];
let lastValidationSummary: ValidationSummary | null = null;

export async function renderSchemasTab(options: SchemasTabOptions): Promise<void> {
	const { container, plugin, app, createCard, showTab, closeModal } = options;

	// Initialize services
	const schemaService = new SchemaService(plugin);
	const validationService = new ValidationService(plugin, schemaService);

	// Card 1: Validation
	const validationCard = createCard({
		title: 'Validate vault',
		icon: 'clipboard-check',
		subtitle: 'Check person notes against your schemas'
	});

	const validationContent = validationCard.querySelector('.crc-card__content') as HTMLElement;

	// Explanation for users
	const explanation = validationContent.createDiv({ cls: 'crc-info-callout crc-mb-3' });
	explanation.createEl('p', {
		text: 'Schema validation checks your person notes against rules you define. ' +
			'Use it to ensure required properties are filled in, values are the correct type, ' +
			'and data follows your standards.',
		cls: 'crc-text--small'
	});

	// Check if there are any schemas
	const hasSchemas = await schemaService.getAllSchemas().then(s => s.length > 0);
	if (!hasSchemas) {
		const noSchemasNote = validationContent.createDiv({ cls: 'crc-empty-state crc-compact' });
		setIcon(noSchemasNote.createSpan({ cls: 'crc-empty-icon' }), 'info');
		noSchemasNote.createEl('p', {
			text: 'No schemas defined yet. Create a schema below to start validating your data.',
			cls: 'crc-text--muted'
		});
		container.appendChild(validationCard);
	}

	// Only show validation controls if schemas exist
	if (hasSchemas) {
		// Show last validation summary if available
		if (lastValidationSummary) {
			const summaryDiv = validationContent.createDiv({ cls: 'crc-validation-summary crc-mb-3' });
			const summary = lastValidationSummary;

			const statsRow = summaryDiv.createDiv({ cls: 'crc-stats-row' });
			statsRow.createEl('span', {
				text: `Last validated: ${summary.validatedAt.toLocaleString()}`,
				cls: 'crc-text--muted crc-text--small'
			});

			const statsGrid = summaryDiv.createDiv({ cls: 'crc-stats-grid crc-mt-2' });
			createStatItem(statsGrid, 'People', summary.totalPeopleValidated.toString(), 'users');
			createStatItem(statsGrid, 'Schemas', summary.totalSchemas.toString(), 'clipboard-check');
			createStatItem(statsGrid, 'Errors', summary.totalErrors.toString(), summary.totalErrors > 0 ? 'alert-circle' : 'check');
			createStatItem(statsGrid, 'Warnings', summary.totalWarnings.toString(), 'alert-triangle');
		}

		// Validate vault button
		new Setting(validationContent)
			.setName('Run validation')
			.setDesc('Check all person notes against your schemas')
			.addButton(button => button
				.setButtonText('Validate')
				.setCta()
				.onClick(() => void (async () => {
			// Open progress modal
			const progressModal = new SchemaValidationProgressModal(app);
			progressModal.open();

			try {
				// Run validation with progress callback
				lastValidationResults = await validationService.validateVault(
					(progress) => progressModal.updateProgress(progress)
				);
				lastValidationSummary = validationService.getSummary(lastValidationResults);

				// Mark complete and close after a short delay
				progressModal.markComplete(lastValidationSummary);
				window.setTimeout(() => {
					progressModal.close();
					// Refresh the tab to show updated results
					container.empty();
					void renderSchemasTab(options);
				}, 1500);

				const errorCount = lastValidationSummary.totalErrors;
				if (errorCount === 0) {
					new Notice('✓ Validation passed! No schema violations found.');
				} else {
					new Notice(`Found ${errorCount} validation ${pluralize(errorCount, 'error')}`);
				}
			} catch (error) {
				progressModal.close();
				new Notice('Validation failed: ' + getErrorMessage(error));
			}
		})()));
	}

	container.appendChild(validationCard);

	// Card 2: Schemas Gallery
	const schemasCard = createCard({
		title: 'Schemas',
		icon: 'file-check',
		subtitle: 'Define validation rules for person notes'
	});

	const schemasContent = schemasCard.querySelector('.crc-card__content') as HTMLElement;

	// Create schema button
	new Setting(schemasContent)
		.setName('Create schema')
		.setDesc('Define a new validation schema for person notes')
		.addButton(button => button
			.setButtonText('Create')
			.setCta()
			.onClick(() => {
				new CreateSchemaModal(app, plugin, {
					onCreated: () => {
						void loadSchemasGallery(app, plugin, schemaService, validationService, schemasGridContainer, closeModal);
					}
				}).open();
			}));

	// Import schema button
	new Setting(schemasContent)
		.setName('Import schema')
		.setDesc('Import a schema from a JSON file')
		.addButton(button => button
			.setButtonText('Import')
			.onClick(() => {
				importSchemaFromJson(app, plugin, schemaService, validationService, schemasGridContainer, closeModal);
			}));

	// Gallery section
	const gallerySection = schemasContent.createDiv({ cls: 'cr-schema-gallery-section' });
	gallerySection.createEl('h4', { text: 'Gallery', cls: 'cr-schema-gallery-heading' });

	const schemasGridContainer = gallerySection.createDiv();
	schemasGridContainer.createEl('p', {
		text: 'Loading schemas...',
		cls: 'crc-text--muted'
	});

	container.appendChild(schemasCard);

	// Load schemas asynchronously
	void loadSchemasGallery(app, plugin, schemaService, validationService, schemasGridContainer, closeModal);

	// Card 3: Recent Violations
	if (lastValidationResults.length > 0) {
		const violationsCard = createCard({
			title: 'Recent violations',
			icon: 'alert-circle',
			subtitle: 'Issues found in last validation'
		});

		const violationsContent = violationsCard.querySelector('.crc-card__content') as HTMLElement;
		renderRecentViolations(violationsContent, app, showTab, closeModal);

		container.appendChild(violationsCard);
	}

	// Card 4: Schema Statistics
	const statsCard = createCard({
		title: 'Statistics',
		icon: 'bar-chart',
		subtitle: 'Schema overview'
	});

	const statsContent = statsCard.querySelector('.crc-card__content') as HTMLElement;
	await renderSchemaStatistics(statsContent, schemaService);

	container.appendChild(statsCard);
}

/**
 * Load schemas into the gallery
 */
async function loadSchemasGallery(
	app: App,
	plugin: CanvasRootsPlugin,
	schemaService: SchemaService,
	validationService: ValidationService,
	container: HTMLElement,
	closeModal: () => void
): Promise<void> {
	container.empty();

	const schemas = await schemaService.getAllSchemas();

	if (schemas.length === 0) {
		const emptyState = container.createDiv({ cls: 'crc-empty-state' });
		emptyState.createEl('p', {
			text: 'No schemas found.',
			cls: 'crc-text--muted'
		});
		emptyState.createEl('p', {
			text: 'Create a schema to define validation rules for person notes.',
			cls: 'crc-text--muted crc-text--small'
		});
		return;
	}

	// Create list of schemas
	const list = container.createEl('ul', { cls: 'crc-schema-list' });

	for (const schema of schemas) {
		const item = list.createEl('li', { cls: 'crc-schema-list-item' });

		// Schema info
		const info = item.createDiv({ cls: 'crc-schema-info' });
		const nameRow = info.createDiv({ cls: 'crc-schema-name-row' });

		nameRow.createEl('span', { text: schema.name, cls: 'crc-schema-name' });

		// Scope badge
		nameRow.createEl('span', {
			text: formatSchemaScope(schema),
			cls: 'crc-badge crc-badge--muted'
		});

		if (schema.description) {
			info.createEl('div', { text: schema.description, cls: 'crc-schema-desc crc-text--muted crc-text--small' });
		}

		// Properties count
		const propCount = Object.keys(schema.definition.properties).length;
		const reqCount = schema.definition.requiredProperties.length;
		const constraintCount = schema.definition.constraints.length;
		info.createEl('div', {
			text: `${propCount} properties, ${reqCount} required, ${constraintCount} constraints`,
			cls: 'crc-text--muted crc-text--small'
		});

		// Action buttons
		const actions = item.createDiv({ cls: 'crc-schema-actions' });

		// Edit button
		const editBtn = actions.createEl('button', {
			cls: 'crc-btn crc-btn--icon',
			attr: { 'aria-label': 'Edit schema' }
		});
		setLucideIcon(editBtn, 'edit', 14);
		editBtn.addEventListener('click', () => {
			new CreateSchemaModal(app, plugin, {
				editSchema: schema,
				onUpdated: () => {
					void loadSchemasGallery(app, plugin, schemaService, validationService, container, closeModal);
				}
			}).open();
		});

		// More options button
		const moreBtn = actions.createEl('button', {
			cls: 'crc-btn crc-btn--icon',
			attr: { 'aria-label': 'More options' }
		});
		setLucideIcon(moreBtn, 'more-vertical', 14);
		moreBtn.addEventListener('click', (e) => {
			showSchemaContextMenu(app, plugin, schema, schemaService, validationService, container, closeModal, e);
		});

		// Click to open note
		item.addEventListener('click', (e) => {
			if ((e.target as HTMLElement).closest('.crc-schema-actions')) return;
			const file = app.vault.getAbstractFileByPath(schema.filePath);
			if (file instanceof TFile) {
				void app.workspace.getLeaf(false).openFile(file);
				closeModal();
			}
		});
	}
}

/**
 * Format schema scope for display
 */
function formatSchemaScope(schema: SchemaNote): string {
	switch (schema.appliesToType) {
		case 'all':
			return 'All people';
		case 'collection':
			return `Collection: ${schema.appliesToValue}`;
		case 'folder':
			return `Folder: ${schema.appliesToValue}`;
		case 'universe':
			return `Universe: ${schema.appliesToValue}`;
		default:
			return schema.appliesToType;
	}
}

/**
 * Show context menu for a schema
 */
function showSchemaContextMenu(
	app: App,
	plugin: CanvasRootsPlugin,
	schema: SchemaNote,
	schemaService: SchemaService,
	validationService: ValidationService,
	galleryContainer: HTMLElement,
	closeModal: () => void,
	event: MouseEvent
): void {
	const menu = new Menu();

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Edit schema')
			.setIcon('edit')
			.onClick(() => {
				new CreateSchemaModal(app, plugin, {
					editSchema: schema,
					onUpdated: () => {
						void loadSchemasGallery(app, plugin, schemaService, validationService, galleryContainer, closeModal);
					}
				}).open();
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Validate matching notes')
			.setIcon('play')
			.onClick(async () => {
				const progressModal = new SchemaValidationProgressModal(app);
				progressModal.open();

				try {
					const results = await validationService.validateForSchema(
						schema,
						(progress) => progressModal.updateProgress(progress)
					);
					const summary = validationService.getSummary(results);

					// Update module-level state so violations tab shows results
					lastValidationResults = results;
					lastValidationSummary = summary;

					progressModal.markComplete(summary);

					const errorCount = summary.totalErrors;
					if (errorCount === 0) {
						new Notice(`Schema "${schema.name}": no violations found.`);
					} else {
						new Notice(`Schema "${schema.name}": ${errorCount} ${pluralize(errorCount, 'error')} found.`);
					}
				} catch (error) {
					progressModal.close();
					new Notice('Validation failed: ' + getErrorMessage(error));
				}
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Duplicate schema')
			.setIcon('copy')
			.onClick(async () => {
				try {
					await schemaService.duplicateSchema(schema.cr_id);
					new Notice(`Schema duplicated: ${schema.name} (Copy)`);
					void loadSchemasGallery(app, plugin, schemaService, validationService, galleryContainer, closeModal);
				} catch (error) {
					new Notice('Failed to duplicate schema: ' + getErrorMessage(error));
				}
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Export to JSON')
			.setIcon('download')
			.onClick(async () => {
				try {
					const json = await schemaService.exportSchemaAsJson(schema.cr_id);
					await navigator.clipboard.writeText(json);
					new Notice('Schema JSON copied to clipboard');
				} catch (error) {
					new Notice('Failed to export schema: ' + getErrorMessage(error));
				}
			});
	});

	menu.addSeparator();

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Open note')
			.setIcon('file-text')
			.onClick(async () => {
				const file = app.vault.getAbstractFileByPath(schema.filePath);
				if (file instanceof TFile) {
					await app.workspace.getLeaf(false).openFile(file);
					closeModal();
				}
			});
	});

	menu.addItem((item: MenuItem) => {
		item
			.setTitle('Delete schema')
			.setIcon('trash')
			.onClick(async () => {
				const confirmed = await confirmSchemaDelete(app, schema.name);
				if (confirmed) {
					try {
						await schemaService.deleteSchema(schema.cr_id);
						new Notice(`Schema deleted: ${schema.name}`);
						void loadSchemasGallery(app, plugin, schemaService, validationService, galleryContainer, closeModal);
					} catch (error) {
						new Notice('Failed to delete schema: ' + getErrorMessage(error));
					}
				}
			});
	});

	menu.showAtMouseEvent(event);
}

/**
 * Confirm schema deletion
 */
async function confirmSchemaDelete(app: App, schemaName: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(app);
		modal.titleEl.setText('Delete schema?');

		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete the schema "${schemaName}"?`
		});
		modal.contentEl.createEl('p', {
			text: 'This will delete the schema note file. This action cannot be undone.',
			cls: 'crc-text--muted'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'crc-button-row crc-mt-3' });

		new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => {
				modal.close();
				resolve(false);
			});

		const deleteBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

/**
 * Import a schema from JSON
 */
function importSchemaFromJson(
	app: App,
	plugin: CanvasRootsPlugin,
	schemaService: SchemaService,
	validationService: ValidationService,
	galleryContainer: HTMLElement,
	closeModal: () => void
): void {
	const modal = new Modal(app);
	modal.titleEl.setText('Import schema from JSON');

	const textarea = modal.contentEl.createEl('textarea', {
		cls: 'crc-form-textarea crc-form-textarea--code',
		attr: {
			placeholder: 'Paste schema JSON here...',
			rows: '10'
		}
	});

	const buttonContainer = modal.contentEl.createDiv({ cls: 'crc-button-row crc-mt-3' });

	new ButtonComponent(buttonContainer)
		.setButtonText('Cancel')
		.onClick(() => modal.close());

	new ButtonComponent(buttonContainer)
		.setButtonText('Import')
		.setCta()
		.onClick(() => void (async () => {
			const json = textarea.value.trim();
			if (!json) {
				new Notice('Please paste schema JSON');
				return;
			}

			try {
				await schemaService.importSchemaFromJson(json);
				new Notice('Schema imported successfully');
				modal.close();
				void loadSchemasGallery(app, plugin, schemaService, validationService, galleryContainer, closeModal);
			} catch (error) {
				new Notice('Failed to import schema: ' + getErrorMessage(error));
			}
		})());

	modal.open();
}

/**
 * Render recent validation violations
 */
function renderRecentViolations(
	container: HTMLElement,
	app: App,
	showTab: (tabId: string) => void,
	closeModal: () => void
): void {
	const invalidResults = lastValidationResults.filter(r => !r.isValid);

	if (invalidResults.length === 0) {
		container.createEl('p', {
			text: 'No violations found in last validation.',
			cls: 'crc-text--muted'
		});
		return;
	}

	// Show top 10 violations
	const topViolations = invalidResults.slice(0, 10);
	const list = container.createEl('ul', { cls: 'crc-violations-list' });

	for (const result of topViolations) {
		const item = list.createEl('li', { cls: 'crc-violation-item crc-clickable' });

		const header = item.createDiv({ cls: 'crc-violation-header' });
		header.createEl('span', { text: result.personName, cls: 'crc-violation-person' });
		header.createEl('span', {
			text: `(${result.schemaName})`,
			cls: 'crc-text--muted crc-text--small'
		});

		const errorList = item.createEl('ul', { cls: 'crc-error-list' });
		for (const error of result.errors.slice(0, 3)) {
			errorList.createEl('li', {
				text: error.message,
				cls: 'crc-text--error crc-text--small'
			});
		}

		if (result.errors.length > 3) {
			errorList.createEl('li', {
				text: `... and ${result.errors.length - 3} more`,
				cls: 'crc-text--muted crc-text--small'
			});
		}

		// Click to open person note
		item.addEventListener('click', () => {
			const file = app.vault.getAbstractFileByPath(result.filePath);
			if (file instanceof TFile) {
				void app.workspace.getLeaf(false).openFile(file);
				closeModal();
			}
		});
	}

	if (invalidResults.length > 10) {
		container.createEl('p', {
			text: `... and ${invalidResults.length - 10} more violations`,
			cls: 'crc-text--muted crc-mt-2'
		});
	}

	// Link to Data Quality tab
	const linkDiv = container.createDiv({ cls: 'crc-mt-2' });
	const viewAllLink = linkDiv.createEl('a', {
		text: 'View all in data quality →',
		cls: 'crc-link'
	});
	viewAllLink.addEventListener('click', () => {
		showTab('data-quality');
	});
}

/**
 * Render schema statistics
 */
async function renderSchemaStatistics(container: HTMLElement, schemaService: SchemaService): Promise<void> {
	const stats = await schemaService.getStats();

	const statsGrid = container.createDiv({ cls: 'crc-stats-grid' });

	createStatItem(statsGrid, 'Total schemas', stats.totalSchemas.toString(), 'clipboard-check');
	createStatItem(statsGrid, 'Global (all)', stats.byScope.all.toString(), 'globe');
	createStatItem(statsGrid, 'By collection', stats.byScope.collection.toString(), 'folder');
	createStatItem(statsGrid, 'By folder', stats.byScope.folder.toString(), 'folder');
	createStatItem(statsGrid, 'By universe', stats.byScope.universe.toString(), 'globe');

	// Error breakdown from last validation
	if (lastValidationSummary && lastValidationSummary.totalErrors > 0) {
		container.createEl('h4', { text: 'Error types from last validation', cls: 'crc-section-title crc-mt-3' });

		const errorGrid = container.createDiv({ cls: 'crc-stats-grid' });
		const errorsByType = lastValidationSummary.errorsByType;

		if (errorsByType.missing_required > 0) {
			createStatItem(errorGrid, 'Missing required', errorsByType.missing_required.toString(), 'alert-circle');
		}
		if (errorsByType.invalid_type > 0) {
			createStatItem(errorGrid, 'Invalid type', errorsByType.invalid_type.toString(), 'alert-circle');
		}
		if (errorsByType.invalid_enum > 0) {
			createStatItem(errorGrid, 'Invalid enum', errorsByType.invalid_enum.toString(), 'alert-circle');
		}
		if (errorsByType.out_of_range > 0) {
			createStatItem(errorGrid, 'Out of range', errorsByType.out_of_range.toString(), 'alert-circle');
		}
		if (errorsByType.constraint_failed > 0) {
			createStatItem(errorGrid, 'Constraint failed', errorsByType.constraint_failed.toString(), 'alert-circle');
		}
		if (errorsByType.conditional_required > 0) {
			createStatItem(errorGrid, 'Conditional required', errorsByType.conditional_required.toString(), 'alert-circle');
		}
		if (errorsByType.invalid_wikilink_target > 0) {
			createStatItem(errorGrid, 'Invalid wikilink', errorsByType.invalid_wikilink_target.toString(), 'alert-circle');
		}
	}
}