/**
 * Collapsible Section Infrastructure
 *
 * Reusable function for rendering a collapsible profile section with
 * chevron toggle, summary text, and expand/collapse state management.
 */

import { setIcon } from 'obsidian';
import type { SectionToggleFn } from '../profile-types';

export interface ProfileSectionOptions {
	/** Section identifier (for state persistence) */
	sectionId: string;
	/** Display title (sentence case) */
	title: string;
	/** Summary text when collapsed (e.g., "12 events") */
	summary: string;
	/** Initial expanded state */
	expanded: boolean;
	/** Callback when expand state changes */
	onToggle: SectionToggleFn;
	/** Whether the section should be hidden entirely */
	hidden?: boolean;
	/** Lucide icon name for the section header */
	icon?: string;
}

/**
 * Render a collapsible profile section.
 * Returns the content container for the caller to populate, or null if hidden.
 */
export function renderProfileSection(
	parent: HTMLElement,
	options: ProfileSectionOptions
): HTMLElement | null {
	if (options.hidden) return null;

	const section = parent.createDiv({ cls: 'cr-profile__section' });
	if (options.expanded) {
		section.addClass('cr-profile__section--expanded');
	}

	// Header row: chevron + icon + title + summary
	const header = section.createDiv({ cls: 'cr-profile__section-header' });

	const chevron = header.createSpan({ cls: 'cr-profile__section-chevron' });
	setIcon(chevron, 'chevron-right');

	if (options.icon) {
		const iconEl = header.createSpan({ cls: 'cr-profile__section-icon' });
		setIcon(iconEl, options.icon);
	}

	header.createSpan({ text: options.title, cls: 'cr-profile__section-title' });

	header.createSpan({
		text: options.summary,
		cls: 'cr-profile__section-summary'
	});

	// Content (hidden when collapsed via CSS)
	const content = section.createDiv({ cls: 'cr-profile__section-content' });

	// Toggle behavior
	header.addEventListener('click', () => {
		const isExpanded = section.hasClass('cr-profile__section--expanded');
		if (isExpanded) {
			section.removeClass('cr-profile__section--expanded');
		} else {
			section.addClass('cr-profile__section--expanded');
		}
		options.onToggle(options.sectionId, !isExpanded);
	});

	return content;
}
