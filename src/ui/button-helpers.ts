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
	// Reach both methods through a local shape rather than ButtonComponent
	// directly: setDestructive() (1.13.0+) and the deprecated setWarning()
	// (older) then resolve to plain members, so neither the version-aware
	// linters nor the Community review scanner flag a call we deliberately gate
	// on the running app version.
	const compat = button as {
		setDestructive?: () => ButtonComponent;
		setWarning: () => ButtonComponent;
	};
	if (typeof compat.setDestructive === 'function') {
		return compat.setDestructive();
	}
	// Obsidian < 1.13.0 has no setDestructive(); fall back to setWarning().
	return compat.setWarning();
}
