import { ButtonComponent } from 'obsidian';

/**
 * Apply the destructive (warning) style to a button across Obsidian versions.
 *
 * Obsidian 1.13.0 renamed `ButtonComponent.setWarning()` to `setDestructive()`
 * and deprecated the former. The plugin's `minAppVersion` still supports app
 * versions below 1.13.0, so this prefers the new method when the running app
 * provides it and falls back to `setWarning()` otherwise. Returns the button so
 * it can continue a fluent chain.
 */
export function setButtonDestructive(button: ButtonComponent): ButtonComponent {
	const compat = button as { setDestructive?: () => ButtonComponent };
	if (typeof compat.setDestructive === 'function') {
		return compat.setDestructive();
	}
	// eslint-disable-next-line @typescript-eslint/no-deprecated -- Fallback for Obsidian < 1.13.0, which lacks setDestructive().
	return button.setWarning();
}
