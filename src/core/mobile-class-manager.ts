import { Platform } from 'obsidian';

/**
 * Read-only snapshot of the platform-detection flags this service consumes.
 * Mirrors the four `Platform.is*` flags from Obsidian. Defined as a separate
 * type so tests can pass a stub without mocking the `obsidian` module.
 */
export interface PlatformState {
	isMobile: boolean;
	isDesktop: boolean;
	isPhone: boolean;
	isTablet: boolean;
}

/**
 * Applies platform-state CSS classes (`cr-mobile` / `cr-desktop` / `cr-phone`
 * / `cr-tablet`) to view container elements so per-component stylesheets can
 * select on class rather than `@media (max-width:Npx)`. Establishes the
 * infrastructure that Phase 4b's per-file CSS migration will consume.
 *
 * The four classes are not mutually exclusive — some hybrid platforms report
 * both `isDesktop` and `isMobile` true (the same quirk that motivated
 * `shouldUseSubmenu()`'s dual check), so every matching class is applied
 * rather than picking one winner. Stylesheets that need the unambiguous-
 * desktop case can scope on `.cr-desktop:not(.cr-mobile)`.
 *
 * The v0.22.20 #528 fix established the precedent that Obsidian's
 * `@media (max-width: 768px)` doesn't fire reliably on Obsidian Mobile;
 * class-based selectors driven by `Platform.is*` are the recommended path.
 */
export class MobileClassManager {
	/**
	 * Attach the appropriate `cr-*` platform classes to `containerEl`.
	 * Idempotent — calling repeatedly with the same platform state is a
	 * no-op on the second call (classList.add is set-shaped).
	 *
	 * The `platform` parameter defaults to Obsidian's runtime `Platform`
	 * object; tests pass an override to avoid mocking the `obsidian` module.
	 */
	applyPlatformClasses(containerEl: HTMLElement, platform: PlatformState = Platform): void {
		if (platform.isMobile) containerEl.classList.add('cr-mobile');
		if (platform.isDesktop) containerEl.classList.add('cr-desktop');
		if (platform.isPhone) containerEl.classList.add('cr-phone');
		if (platform.isTablet) containerEl.classList.add('cr-tablet');
	}
}
