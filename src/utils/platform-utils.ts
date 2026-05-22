import { Platform } from 'obsidian';

/**
 * Whether the current Obsidian platform should render submenus.
 * Mobile builds don't support Menu submenu items — items added under
 * a `Menu` parent there flatten to the top level and lose grouping.
 * The dual check (`isDesktop && !isMobile`) handles hybrid platforms
 * that report both flags true (some tablet builds); only commit to a
 * submenu UI when the platform is unambiguously desktop.
 */
export function shouldUseSubmenu(): boolean {
	return Platform.isDesktop && !Platform.isMobile;
}
