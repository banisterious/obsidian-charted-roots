/**
 * Shared card UI components used across multiple Control Center tabs
 */

import { createLucideIcon, LucideIconName } from '../lucide-icons';

/**
 * Create a stat item for a statistics grid
 */
export function createStatItem(container: HTMLElement, label: string, value: string, icon?: LucideIconName): void {
	const item = container.createDiv({ cls: 'crc-stat-item' });

	if (icon) {
		const iconEl = createLucideIcon(icon, 16);
		iconEl.addClass('crc-stat-icon');
		item.appendChild(iconEl);
	}

	const content = item.createDiv({ cls: 'crc-stat-content' });
	content.createEl('div', { text: value, cls: 'crc-stat-value' });
	content.createEl('div', { text: label, cls: 'crc-stat-label' });
}

