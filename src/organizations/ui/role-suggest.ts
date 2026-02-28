/**
 * Role Suggest Component
 *
 * Provides inline autocomplete suggestions for role input fields.
 * Shows matching roles from the organization's roles list.
 * Allows freeform text entry for roles not in the list.
 */

import { App, AbstractInputSuggest, type TextComponent } from 'obsidian';

/**
 * Inline suggest for role fields with autocomplete from an organization's role list
 */
export class RoleSuggest extends AbstractInputSuggest<string> {
	private roles: string[];
	private textComponent: TextComponent | null;
	private onSelectValue: (value: string) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		roles: string[],
		onSelectValue: (value: string) => void,
		textComponent?: TextComponent
	) {
		super(app, inputEl);
		this.roles = roles;
		this.textComponent = textComponent ?? null;
		this.onSelectValue = onSelectValue;
	}

	getSuggestions(inputStr: string): string[] {
		const lowerInput = inputStr.toLowerCase();
		if (!lowerInput) return this.roles;
		return this.roles.filter(role =>
			role.toLowerCase().includes(lowerInput)
		);
	}

	renderSuggestion(role: string, el: HTMLElement): void {
		el.setText(role);
	}

	selectSuggestion(role: string): void {
		if (this.textComponent) {
			this.textComponent.setValue(role);
		} else {
			(this.inputEl as HTMLInputElement).value = role;
		}
		this.onSelectValue(role);
		this.close();
	}
}
