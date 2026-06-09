/**
 * Inline Edit Utilities
 *
 * Click-to-edit field controls for the profile view identity header.
 * Supports text, number, and select inputs.
 * Only one field may be active at a time.
 */

import type { EditableFieldConfig, InlineEditSaveFn, InlineEditNotifyFn } from './profile-types';

// ────────────────────────────────────────────────────────────
// Module state: one active edit at a time
// ────────────────────────────────────────────────────────────

interface ActiveEditController {
	property: string;
	cancel(): void;
	save(): void;
}

let activeEdit: ActiveEditController | null = null;

/**
 * Commit (save) the currently active edit, if any.
 * Call before re-rendering to avoid losing an in-progress edit.
 */
export function commitActiveEdit(): void {
	if (activeEdit) {
		activeEdit.save();
		activeEdit = null;
	}
}

// ────────────────────────────────────────────────────────────
// Editable field factory
// ────────────────────────────────────────────────────────────

/**
 * Create a click-to-edit field. Returns a span that shows the display value
 * and transforms into an input on click.
 */
export function createEditableField(
	container: HTMLElement,
	config: EditableFieldConfig,
	onSave: InlineEditSaveFn,
	onNotify: InlineEditNotifyFn
): HTMLElement {
	const wrapper = container.createSpan({ cls: 'cr-profile__editable' });
	wrapper.setAttribute('aria-label', config.label);
	wrapper.dataset.property = config.property;

	const displayEl = wrapper.createSpan({
		text: config.displayValue || config.placeholder || '',
	});
	if (!config.displayValue) {
		displayEl.addClass('cr-profile__editable-placeholder');
	}

	wrapper.addEventListener('click', (e) => {
		e.stopPropagation();
		if (wrapper.hasClass('cr-profile__editable--editing')) return;

		commitActiveEdit();
		enterEditMode(wrapper, displayEl, config, onSave, onNotify);
	});

	return wrapper;
}

/**
 * Create a ` · ` separator between metadata fields.
 */
export function createMetaSeparator(container: HTMLElement): HTMLElement {
	return container.createSpan({ text: ' · ', cls: 'cr-profile__meta-separator' });
}

// ────────────────────────────────────────────────────────────
// Edit mode
// ────────────────────────────────────────────────────────────

function enterEditMode(
	wrapper: HTMLElement,
	displayEl: HTMLElement,
	config: EditableFieldConfig,
	onSave: InlineEditSaveFn,
	onNotify: InlineEditNotifyFn
): void {
	wrapper.addClass('cr-profile__editable--editing');
	displayEl.hide();

	const inputEl = createInputElement(wrapper, config);
	let saving = false;

	const controller: ActiveEditController = {
		property: config.property,
		cancel: () => exitEditMode(wrapper, displayEl, inputEl),
		save: () => { void doSave(); }
	};
	activeEdit = controller;

	async function doSave(): Promise<void> {
		if (saving) return;
		saving = true;

		const newValue = inputEl.value.trim();
		if (newValue !== config.rawValue) {
			try {
				onNotify();
				await onSave(config.property, newValue);
				// Optimistic DOM update
				config.rawValue = newValue;
				config.displayValue = newValue;
				displayEl.textContent = newValue || config.placeholder || '';
				if (newValue) {
					displayEl.removeClass('cr-profile__editable-placeholder');
				} else {
					displayEl.addClass('cr-profile__editable-placeholder');
				}
			} catch {
				// Revert on failure — just restore original text
			}
		}
		exitEditMode(wrapper, displayEl, inputEl);
		saving = false;
	}

	inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			void doSave();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			exitEditMode(wrapper, displayEl, inputEl);
		}
	});

	inputEl.addEventListener('blur', () => {
		// Delay to allow click on another editable field to fire first
		window.setTimeout(() => {
			if (activeEdit?.property === config.property && !saving) {
				void doSave();
			}
		}, 150);
	});

	inputEl.focus();
	if (inputEl instanceof HTMLInputElement) {
		inputEl.select();
	}
}

function createInputElement(
	wrapper: HTMLElement,
	config: EditableFieldConfig
): HTMLInputElement | HTMLSelectElement {
	if (config.inputType === 'select' && config.selectOptions) {
		const select = wrapper.createEl('select', { cls: 'cr-profile__edit-select' });
		for (const opt of config.selectOptions) {
			const optEl = select.createEl('option', { value: opt.value, text: opt.label });
			if (opt.value === config.rawValue) {
				optEl.selected = true;
			}
		}
		return select;
	}

	const input = wrapper.createEl('input', {
		cls: 'cr-profile__edit-input',
		attr: {
			type: config.inputType === 'number' ? 'number' : 'text',
			value: config.rawValue,
			placeholder: config.placeholder || ''
		}
	});
	if (config.inputType === 'number') {
		input.setAttribute('step', 'any');
	}
	return input;
}

function exitEditMode(
	wrapper: HTMLElement,
	displayEl: HTMLElement,
	inputEl: HTMLElement
): void {
	wrapper.removeClass('cr-profile__editable--editing');
	inputEl.remove();
	displayEl.show();
	if (activeEdit?.property === wrapper.dataset.property) {
		activeEdit = null;
	}
}
