/**
 * Place Type Manager Card
 *
 * A card component for the Places tab that displays all place types
 * with options to customize, hide, and create new types.
 */

import { Notice, Modal, Setting, setIcon } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import type { LucideIconName } from '../../ui/lucide-icons';
import {
	DEFAULT_PLACE_TYPES,
	getAllPlaceTypesWithCustomizations,
	getAllPlaceTypeCategories,
	reorderPlaceTypeCategories,
	nextHierarchyLevelForCategory,
	reorderTypeWithinCategory,
	isBuiltInPlaceTypeCategory
} from '../';
import { BUILT_IN_PLACE_TYPE_CATEGORIES } from '../types/place-types';
import type { PlaceTypeDefinition, PlaceTypeCategoryDefinition } from '../types/place-types';
import { PlaceTypeEditorModal } from './place-type-editor-modal';

/**
 * Render the Place Type Manager card
 */
export function renderPlaceTypeManagerCard(
	container: HTMLElement,
	plugin: CanvasRootsPlugin,
	createCard: (options: { title: string; icon?: LucideIconName; subtitle?: string }) => HTMLElement,
	onRefresh: () => void
): void {
	const card = createCard({
		title: 'Manage place types',
		icon: 'sliders',
		subtitle: 'Customize, hide, or create place types'
	});
	const content = card.querySelector('.crc-card__content') as HTMLElement;

	// Create place type button
	new Setting(content)
		.setName('Create place type')
		.setDesc('Define a new custom place type')
		.addButton(button => button
			.setButtonText('Create')
			.setCta()
			.onClick(() => {
				const modal = new PlaceTypeEditorModal(plugin.app, plugin, {
					onSave: () => {
						renderTypeList();
						onRefresh();
					}
				});
				modal.open();
			}));

	// Add category button
	new Setting(content)
		.setName('Add category')
		.setDesc('Create a new category to organize place types')
		.addButton(button => button
			.setButtonText('Add')
			.onClick(() => {
				openCategoryEditor(plugin, null, false, () => {
					renderTypeList();
					onRefresh();
				});
			}));

	// Toggle built-in types
	new Setting(content)
		.setName('Show built-in types')
		.setDesc('Toggle visibility of default place types')
		.addToggle(toggle => toggle
			.setValue(plugin.settings.showBuiltInPlaceTypes !== false)
			.onChange(async (value) => {
				plugin.settings.showBuiltInPlaceTypes = value;
				await plugin.saveSettings();
				renderTypeList();
				onRefresh();
			}));

	// Type list container
	const listContainer = content.createDiv({ cls: 'crc-type-manager-list' });

	// Render the type list as a table
	const renderTypeList = () => {
		listContainer.empty();

		// Get all categories (built-in + custom, with customizations and hiding)
		const categories = getAllPlaceTypeCategories(
			plugin.settings.customPlaceTypeCategories || [],
			plugin.settings.placeTypeCategoryCustomizations,
			plugin.settings.hiddenPlaceTypeCategories
		);

		// Refresh data - get all types including hidden for display
		const types = getAllPlaceTypesWithCustomizations(
			plugin.settings.customPlaceTypes || [],
			plugin.settings.showBuiltInPlaceTypes !== false,
			plugin.settings.placeTypeCustomizations,
			[] // Show all including hidden
		);

		const hiddenTypes = new Set(plugin.settings.hiddenPlaceTypes || []);
		const hiddenCats = new Set(plugin.settings.hiddenPlaceTypeCategories || []);
		const customizedIds = new Set(Object.keys(plugin.settings.placeTypeCustomizations || {}));
		const customizedCatIds = new Set(Object.keys(plugin.settings.placeTypeCategoryCustomizations || {}));

		// Group by explicit category field
		const byCategory: Record<string, PlaceTypeDefinition[]> = {};
		for (const cat of categories) {
			byCategory[cat.id] = [];
		}
		for (const type of types) {
			if (!byCategory[type.category]) {
				byCategory[type.category] = [];
			}
			byCategory[type.category].push(type);
		}

		// Render each category as a table section
		for (const [categoryIndex, category] of categories.entries()) {
			// Shallowest-first so the reorder arrows read top-to-bottom (#734).
			const categoryTypes = (byCategory[category.id] || []).slice()
				.sort((a, b) => a.hierarchyLevel - b.hierarchyLevel || a.name.localeCompare(b.name));
			const isBuiltIn = isBuiltInPlaceTypeCategory(category.id);
			const isCatCustomized = customizedCatIds.has(category.id);

			// Show section even if empty (so user can edit/delete)
			const categorySection = listContainer.createDiv({ cls: 'crc-type-category' });

			// Category header with actions for ALL categories
			const categoryHeaderRow = categorySection.createDiv({ cls: 'crc-type-category-header' });
			const headingEl = categoryHeaderRow.createEl('h4', {
				text: category.name,
				cls: 'crc-type-category-heading'
			});

			// Show customized badge for built-in categories
			if (isBuiltIn && isCatCustomized) {
				headingEl.createEl('span', {
					text: ' (customized)',
					cls: 'crc-text-muted crc-type-category-badge'
				});
			}

			// Add reorder/edit/delete buttons for ALL categories
			const actionsContainer = categoryHeaderRow.createDiv({ cls: 'crc-type-category-actions' });

			// Reorder controls — move this category up or down in the display
			// order, renumbering all categories so a custom category can sit above
			// the built-ins (#733).
			const moveCategory = (direction: 'up' | 'down') => {
				void persistCategoryOrder(plugin, categories.map(c => c.id), category.id, direction, () => {
					renderTypeList();
					onRefresh();
				});
			};
			const moveUpBtn = actionsContainer.createEl('button', {
				text: '↑',
				cls: 'crc-btn crc-btn--small',
				attr: { 'aria-label': 'Move category up' }
			});
			moveUpBtn.disabled = categoryIndex === 0;
			moveUpBtn.addEventListener('click', () => moveCategory('up'));

			const moveDownBtn = actionsContainer.createEl('button', {
				text: '↓',
				cls: 'crc-btn crc-btn--small',
				attr: { 'aria-label': 'Move category down' }
			});
			moveDownBtn.disabled = categoryIndex === categories.length - 1;
			moveDownBtn.addEventListener('click', () => moveCategory('down'));

			// Icon (gear for Customize, pencil for Edit) with a tooltip, to keep
			// the action row from feeling cluttered (#734 follow-up).
			const editCatLabel = isBuiltIn ? 'Customize' : 'Edit';
			const editCatBtn = actionsContainer.createEl('button', {
				cls: 'crc-btn crc-btn--small',
				attr: { 'aria-label': editCatLabel, title: editCatLabel }
			});
			setIcon(editCatBtn, isBuiltIn ? 'settings' : 'pencil');
			editCatBtn.addEventListener('click', () => {
				openCategoryEditor(plugin, category, isBuiltIn, () => {
					renderTypeList();
					onRefresh();
				});
			});

			const deleteCatBtn = actionsContainer.createEl('button', {
				text: isBuiltIn ? 'Hide' : 'Delete',
				cls: 'crc-btn crc-btn--small crc-btn--danger'
			});
			deleteCatBtn.addEventListener('click', () => {
				confirmDeleteCategory(plugin, category, isBuiltIn, categoryTypes.length, () => {
					renderTypeList();
					onRefresh();
				});
			});

			// Add a type directly into this category, pre-selecting it and
			// defaulting to a sensible hierarchy level (#734).
			const addTypeBtn = actionsContainer.createEl('button', {
				text: '+ Add type',
				cls: 'crc-btn crc-btn--small'
			});
			addTypeBtn.addEventListener('click', () => {
				const modal = new PlaceTypeEditorModal(plugin.app, plugin, {
					defaultCategory: category.id,
					defaultHierarchyLevel: nextHierarchyLevelForCategory(
						category.id,
						categoryTypes.map(t => t.hierarchyLevel)
					),
					onSave: () => {
						renderTypeList();
						onRefresh();
					}
				});
				modal.open();
			});

			if (categoryTypes.length > 0) {
				// Create table
				const table = categorySection.createEl('table', { cls: 'crc-type-table' });
				const tbody = table.createEl('tbody');

				for (const [typeIndex, type] of categoryTypes.entries()) {
					const isHidden = hiddenTypes.has(type.id);
					const isCustomized = customizedIds.has(type.id);

					renderTypeRow(tbody, type, isHidden, isCustomized, plugin, () => {
						renderTypeList();
						onRefresh();
					}, {
						// A move only does something when the neighbour sits at a
						// different level — swapping equal levels can't reorder tied
						// types, so disable the arrow there rather than no-op silently.
						canMoveUp: typeIndex > 0
							&& categoryTypes[typeIndex - 1].hierarchyLevel !== type.hierarchyLevel,
						canMoveDown: typeIndex < categoryTypes.length - 1
							&& categoryTypes[typeIndex + 1].hierarchyLevel !== type.hierarchyLevel,
						onMove: (direction) => {
							void persistTypeOrder(plugin, categoryTypes, type.id, direction, () => {
								renderTypeList();
								onRefresh();
							});
						}
					});
				}
			} else {
				categorySection.createEl('p', {
					text: 'No types in this category',
					cls: 'crc-text-muted crc-type-empty-category'
				});
			}
		}

		// Show hidden categories count (for restoring)
		if (hiddenCats.size > 0) {
			const hiddenCatsInfo = listContainer.createDiv({ cls: 'crc-hidden-types-info' });
			hiddenCatsInfo.createEl('span', {
				text: `${hiddenCats.size} categor${hiddenCats.size !== 1 ? 'ies' : 'y'} hidden`,
				cls: 'crc-text-muted'
			});

			const showAllCatsBtn = hiddenCatsInfo.createEl('button', {
				text: 'Show all',
				cls: 'crc-btn-link'
			});
			showAllCatsBtn.addEventListener('click', () => {
				void (async () => {
					plugin.settings.hiddenPlaceTypeCategories = [];
					await plugin.saveSettings();
					renderTypeList();
					onRefresh();
				})();
			});
		}

		// Show hidden types count
		if (hiddenTypes.size > 0) {
			const hiddenInfo = listContainer.createDiv({ cls: 'crc-hidden-types-info' });
			hiddenInfo.createEl('span', {
				text: `${hiddenTypes.size} type${hiddenTypes.size !== 1 ? 's' : ''} hidden`,
				cls: 'crc-text-muted'
			});

			const showAllBtn = hiddenInfo.createEl('button', {
				text: 'Show all',
				cls: 'crc-btn-link'
			});
			showAllBtn.addEventListener('click', () => {
				void (async () => {
					plugin.settings.hiddenPlaceTypes = [];
					await plugin.saveSettings();
					renderTypeList();
					onRefresh();
				})();
			});
		}
	};

	renderTypeList();
	container.appendChild(card);
}

/**
 * Render a single type row in the table
 */
function renderTypeRow(
	tbody: HTMLElement,
	type: PlaceTypeDefinition,
	isHidden: boolean,
	isCustomized: boolean,
	plugin: CanvasRootsPlugin,
	onUpdate: () => void,
	reorder?: { canMoveUp: boolean; canMoveDown: boolean; onMove: (direction: 'up' | 'down') => void }
): void {
	const row = tbody.createEl('tr', {
		cls: `crc-type-row ${isHidden ? 'is-hidden' : ''}`
	});

	// Level badge cell (unique to place types)
	const levelCell = row.createEl('td', { cls: 'crc-type-cell-level' });
	const levelBadge = levelCell.createSpan({ cls: 'crc-place-level-badge' });
	levelBadge.textContent = `L${type.hierarchyLevel}`;
	levelBadge.setAttribute('title', `Hierarchy level ${type.hierarchyLevel}`);

	// Name cell
	const nameCell = row.createEl('td', { cls: 'crc-type-cell-name' });
	nameCell.createEl('span', { text: type.name });
	if (type.description) {
		nameCell.createEl('span', { text: ` — ${type.description}`, cls: 'crc-text-muted crc-type-description' });
	}

	// Status cell (badges)
	const statusCell = row.createEl('td', { cls: 'crc-type-cell-status' });
	if (isCustomized) {
		statusCell.createEl('span', { text: 'Customized', cls: 'crc-type-badge crc-type-badge--customized' });
	}
	if (isHidden) {
		statusCell.createEl('span', { text: 'Hidden', cls: 'crc-type-badge crc-type-badge--hidden' });
	}

	// Actions cell
	const actionsCell = row.createEl('td', { cls: 'crc-type-cell-actions' });
	const actionsWrapper = actionsCell.createDiv({ cls: 'crc-type-actions-wrapper' });

	// Reorder controls — move this type up/down within its category, renumbering
	// the category's hierarchy levels so the order is WYSIWYG (#734).
	if (reorder) {
		const upBtn = actionsWrapper.createEl('button', {
			text: '↑',
			cls: 'crc-btn crc-btn--small',
			attr: { 'aria-label': 'Move type up (shallower)' }
		});
		upBtn.disabled = !reorder.canMoveUp;
		upBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			reorder.onMove('up');
		});

		const downBtn = actionsWrapper.createEl('button', {
			text: '↓',
			cls: 'crc-btn crc-btn--small',
			attr: { 'aria-label': 'Move type down (deeper)' }
		});
		downBtn.disabled = !reorder.canMoveDown;
		downBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			reorder.onMove('down');
		});
	}

	// Edit/Customize button — icon + tooltip to reduce row clutter (#734 follow-up).
	const editLabel = type.builtIn ? 'Customize' : 'Edit';
	const editBtn = actionsWrapper.createEl('button', {
		cls: 'crc-btn crc-btn--small',
		attr: { 'aria-label': editLabel, title: editLabel }
	});
	setIcon(editBtn, type.builtIn ? 'settings' : 'pencil');
	editBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		if (type.builtIn) {
			const builtIn = DEFAULT_PLACE_TYPES.find(t => t.id === type.id);
			if (builtIn) {
				const modal = new PlaceTypeEditorModal(plugin.app, plugin, {
					customizeBuiltIn: builtIn,
					onSave: onUpdate
				});
				modal.open();
			}
		} else {
			const modal = new PlaceTypeEditorModal(plugin.app, plugin, {
				editType: type,
				onSave: onUpdate
			});
			modal.open();
		}
	});

	// Hide/Show button — icon + tooltip to reduce row clutter (#734 follow-up).
	const hideLabel = isHidden ? 'Show' : 'Hide';
	const hideBtn = actionsWrapper.createEl('button', {
		cls: 'crc-btn crc-btn--small',
		attr: { 'aria-label': hideLabel, title: hideLabel }
	});
	setIcon(hideBtn, isHidden ? 'eye' : 'eye-off');
	hideBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		void (async () => {
			const hidden = plugin.settings.hiddenPlaceTypes || [];
			if (isHidden) {
				plugin.settings.hiddenPlaceTypes = hidden.filter(id => id !== type.id);
			} else {
				hidden.push(type.id);
				plugin.settings.hiddenPlaceTypes = hidden;
			}
			await plugin.saveSettings();
			onUpdate();
		})();
	});

	// Reset button for customized built-in types — icon + tooltip to reduce row
	// clutter, a revert arrow alongside the gear/pencil and eye (#734 follow-up).
	if (type.builtIn && isCustomized) {
		const resetBtn = actionsWrapper.createEl('button', {
			cls: 'crc-btn crc-btn--small',
			attr: { 'aria-label': 'Reset to default', title: 'Reset to default' }
		});
		setIcon(resetBtn, 'rotate-ccw');
		resetBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			void (async () => {
				if (plugin.settings.placeTypeCustomizations) {
					delete plugin.settings.placeTypeCustomizations[type.id];
				}
				await plugin.saveSettings();
				onUpdate();
			})();
		});
	}

	// Delete button for custom types
	if (!type.builtIn) {
		const deleteBtn = actionsWrapper.createEl('button', {
			text: 'Delete',
			cls: 'crc-btn crc-btn--small crc-btn--danger'
		});
		deleteBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			confirmDeleteType(plugin, type, onUpdate);
		});
	}
}

/**
 * Confirm and delete a user-defined type
 */
function confirmDeleteType(
	plugin: CanvasRootsPlugin,
	type: PlaceTypeDefinition,
	onUpdate: () => void
): void {
	const modal = new Modal(plugin.app);
	modal.titleEl.setText('Delete place type');
	modal.contentEl.createEl('p', {
		text: `Are you sure you want to delete "${type.name}"? Existing place notes using this type will still work, but the type will no longer appear in dropdowns.`
	});

	const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

	const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
	cancelBtn.addEventListener('click', () => modal.close());

	const deleteBtn = buttonContainer.createEl('button', {
		text: 'Delete',
		cls: 'mod-warning'
	});
	deleteBtn.addEventListener('click', () => {
		void (async () => {
			plugin.settings.customPlaceTypes = plugin.settings.customPlaceTypes.filter(
				t => t.id !== type.id
			);
			// Also remove from hidden if it was hidden
			plugin.settings.hiddenPlaceTypes = (plugin.settings.hiddenPlaceTypes || []).filter(
				id => id !== type.id
			);
			await plugin.saveSettings();
			modal.close();
			new Notice(`Deleted "${type.name}"`);
			onUpdate();
		})();
	});

	modal.open();
}

/**
 * Move a category up or down and persist the resulting sequential order (#733).
 *
 * The whole category list is renumbered 0..n so the order is WYSIWYG: built-in
 * categories store their new position as a `sortOrder` customization (dropped
 * again when it happens to match the default, to keep the "customized" badge
 * honest), and custom categories get their `sortOrder` updated in place.
 */
async function persistCategoryOrder(
	plugin: CanvasRootsPlugin,
	orderedIds: string[],
	categoryId: string,
	direction: 'up' | 'down',
	onSave: () => void
): Promise<void> {
	const newOrder = reorderPlaceTypeCategories(orderedIds, categoryId, direction);

	const customizations = plugin.settings.placeTypeCategoryCustomizations ?? {};
	const customCategories = plugin.settings.customPlaceTypeCategories ?? [];
	const customById = new Map(customCategories.map(c => [c.id, c]));

	for (const { id, sortOrder } of newOrder) {
		if (isBuiltInPlaceTypeCategory(id)) {
			const builtInDef = BUILT_IN_PLACE_TYPE_CATEGORIES.find(c => c.id === id);
			const existing = { ...(customizations[id] ?? {}) };
			if (builtInDef && sortOrder === builtInDef.sortOrder) {
				// Back at its default slot — drop the redundant sortOrder, and the
				// whole entry if nothing else was customized.
				delete existing.sortOrder;
				if (Object.keys(existing).length === 0) {
					delete customizations[id];
				} else {
					customizations[id] = existing;
				}
			} else {
				customizations[id] = { ...existing, sortOrder };
			}
		} else {
			const custom = customById.get(id);
			if (custom) custom.sortOrder = sortOrder;
		}
	}

	plugin.settings.placeTypeCategoryCustomizations = customizations;
	plugin.settings.customPlaceTypeCategories = customCategories;
	await plugin.saveSettings();
	onSave();
}

/**
 * Move a place type up or down within its category and persist the renumbered
 * hierarchy levels (#734). Built-in types store their new level as a
 * customization; custom types are updated on their own definition. A no-op move
 * (boundary or unknown id) returns without saving.
 */
async function persistTypeOrder(
	plugin: CanvasRootsPlugin,
	categoryTypes: ReadonlyArray<{ id: string; hierarchyLevel: number; builtIn: boolean }>,
	typeId: string,
	direction: 'up' | 'down',
	onSave: () => void
): Promise<void> {
	const newLevels = reorderTypeWithinCategory(categoryTypes, typeId, direction);
	if (newLevels.length === 0) return;

	const builtInById = new Map(categoryTypes.map(t => [t.id, t.builtIn]));
	const customizations = plugin.settings.placeTypeCustomizations ?? {};
	const customTypes = plugin.settings.customPlaceTypes ?? [];
	const customById = new Map(customTypes.map(t => [t.id, t]));

	for (const { id, hierarchyLevel } of newLevels) {
		if (builtInById.get(id)) {
			const existing = { ...(customizations[id] ?? {}) };
			existing.hierarchyLevel = hierarchyLevel;
			customizations[id] = existing;
		} else {
			const custom = customById.get(id);
			if (custom) custom.hierarchyLevel = hierarchyLevel;
		}
	}

	plugin.settings.placeTypeCustomizations = customizations;
	plugin.settings.customPlaceTypes = customTypes;
	await plugin.saveSettings();
	onSave();
}

/**
 * Open category editor modal
 * Supports editing both custom and built-in categories
 */
function openCategoryEditor(
	plugin: CanvasRootsPlugin,
	category: PlaceTypeCategoryDefinition | null,
	isBuiltIn: boolean,
	onSave: () => void
): void {
	const modal = new Modal(plugin.app);
	const isEditing = category !== null;

	modal.titleEl.setText(
		isBuiltIn
			? `Customize "${category?.name}"`
			: isEditing
				? 'Edit category'
				: 'Create category'
	);

	if (isBuiltIn) {
		const info = modal.contentEl.createDiv({ cls: 'cr-modal-info' });
		info.createEl('p', {
			text: 'Customize this built-in category. You can rename it or change its position.',
			cls: 'crc-text-muted'
		});
	}

	// Name field
	const nameRow = modal.contentEl.createDiv({ cls: 'setting-item' });
	nameRow.createDiv({ cls: 'setting-item-info' }).createDiv({
		cls: 'setting-item-name',
		text: 'Name'
	});
	const nameInput = nameRow.createDiv({ cls: 'setting-item-control' }).createEl('input', {
		type: 'text',
		value: category?.name || '',
		placeholder: 'e.g., Bodies of water'
	});
	nameInput.addClass('crc-form-input');

	// Sort order field
	const orderRow = modal.contentEl.createDiv({ cls: 'setting-item' });
	orderRow.createDiv({ cls: 'setting-item-info' }).createDiv({
		cls: 'setting-item-name',
		text: 'Sort order'
	});
	const orderInput = orderRow.createDiv({ cls: 'setting-item-control' }).createEl('input', {
		type: 'number',
		value: String(category?.sortOrder ?? (plugin.settings.customPlaceTypeCategories?.length || 0) + 5)
	});
	orderInput.addClass('crc-form-input');

	// Buttons
	const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

	// Reset button for built-in categories
	if (isBuiltIn && category) {
		const hasCustomization = plugin.settings.placeTypeCategoryCustomizations?.[category.id];
		if (hasCustomization) {
			const resetBtn = buttonContainer.createEl('button', { text: 'Reset to default' });
			resetBtn.addEventListener('click', () => {
				void (async () => {
					if (plugin.settings.placeTypeCategoryCustomizations) {
						delete plugin.settings.placeTypeCategoryCustomizations[category.id];
					}
					await plugin.saveSettings();
					modal.close();
					new Notice('Reset to default');
					onSave();
				})();
			});
		}
	}

	const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
	cancelBtn.addEventListener('click', () => modal.close());

	const saveBtn = buttonContainer.createEl('button', {
		text: isBuiltIn ? 'Save customization' : isEditing ? 'Save' : 'Create',
		cls: 'mod-cta'
	});
	saveBtn.addEventListener('click', () => {
		void (async () => {
			const name = nameInput.value.trim();
			if (!name) {
				new Notice('Category name is required');
				return;
			}

			const sortOrder = parseInt(orderInput.value) || 0;

			if (isBuiltIn && category) {
				// Save as customization of built-in category
				if (!plugin.settings.placeTypeCategoryCustomizations) {
					plugin.settings.placeTypeCategoryCustomizations = {};
				}

				// Get the original built-in definition
				const builtInDef = BUILT_IN_PLACE_TYPE_CATEGORIES.find(c => c.id === category.id);
				const customization: Partial<PlaceTypeCategoryDefinition> = {};

				// Only store properties that differ from built-in defaults
				if (builtInDef && name !== builtInDef.name) customization.name = name;
				if (builtInDef && sortOrder !== builtInDef.sortOrder) customization.sortOrder = sortOrder;

				if (Object.keys(customization).length > 0) {
					plugin.settings.placeTypeCategoryCustomizations[category.id] = customization;
				} else {
					// No customizations - remove any existing
					delete plugin.settings.placeTypeCategoryCustomizations[category.id];
				}

				await plugin.saveSettings();
				modal.close();
				new Notice('Category customized');
				onSave();
			} else if (isEditing && category) {
				// Update existing custom category
				const existing = plugin.settings.customPlaceTypeCategories || [];
				plugin.settings.customPlaceTypeCategories = existing.map(c =>
					c.id === category.id ? { id: c.id, name, sortOrder } : c
				);
				await plugin.saveSettings();
				modal.close();
				new Notice(`Updated "${name}"`);
				onSave();
			} else {
				// Create new custom category
				const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

				// Check for duplicate ID
				const existing = plugin.settings.customPlaceTypeCategories || [];
				const builtInConflict = BUILT_IN_PLACE_TYPE_CATEGORIES.some(c => c.id === id);
				if (builtInConflict || existing.some(c => c.id === id)) {
					new Notice('A category with this ID already exists');
					return;
				}

				plugin.settings.customPlaceTypeCategories = [...existing, { id, name, sortOrder }];
				await plugin.saveSettings();
				modal.close();
				new Notice(`Created "${name}"`);
				onSave();
			}
		})();
	});

	modal.open();
}

/**
 * Confirm and delete a category
 * Supports both custom and built-in categories
 */
function confirmDeleteCategory(
	plugin: CanvasRootsPlugin,
	category: PlaceTypeCategoryDefinition,
	isBuiltIn: boolean,
	typeCount: number,
	onDelete: () => void
): void {
	const modal = new Modal(plugin.app);
	modal.titleEl.setText(isBuiltIn ? 'Hide category' : 'Delete category');

	if (typeCount > 0) {
		modal.contentEl.createEl('p', {
			text: `This category contains ${typeCount} type${typeCount !== 1 ? 's' : ''}. You must move or delete all types before ${isBuiltIn ? 'hiding' : 'deleting'} the category.`
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });
		const okBtn = buttonContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });
		okBtn.addEventListener('click', () => modal.close());
	} else {
		if (isBuiltIn) {
			modal.contentEl.createEl('p', {
				text: `Are you sure you want to hide the category "${category.name}"? You can restore it later from the settings.`
			});
		} else {
			modal.contentEl.createEl('p', {
				text: `Are you sure you want to delete the category "${category.name}"?`
			});
		}

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => modal.close());

		const deleteBtn = buttonContainer.createEl('button', {
			text: isBuiltIn ? 'Hide' : 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			void (async () => {
				if (isBuiltIn) {
					// Hide built-in category by adding to hiddenPlaceTypeCategories
					if (!plugin.settings.hiddenPlaceTypeCategories) {
						plugin.settings.hiddenPlaceTypeCategories = [];
					}
					if (!plugin.settings.hiddenPlaceTypeCategories.includes(category.id)) {
						plugin.settings.hiddenPlaceTypeCategories.push(category.id);
					}
				} else {
					// Delete custom category
					plugin.settings.customPlaceTypeCategories = (plugin.settings.customPlaceTypeCategories || [])
						.filter(c => c.id !== category.id);
				}
				await plugin.saveSettings();
				modal.close();
				new Notice(isBuiltIn ? `Hidden "${category.name}"` : `Deleted "${category.name}"`);
				onDelete();
			})();
		});
	}

	modal.open();
}