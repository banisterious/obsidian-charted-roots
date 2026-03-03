/**
 * Collapsible Section Infrastructure
 *
 * Reusable function for rendering a collapsible profile section with
 * chevron toggle, summary text, expand/collapse state management,
 * lazy content rendering, and keyboard navigation.
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
	/** Lazy content renderer — called on first expand. If omitted, caller populates content directly. */
	contentRenderer?: (contentEl: HTMLElement) => void;
	/** Called when section collapses — for cleanup (e.g., Leaflet map removal) */
	onCollapse?: (contentEl: HTMLElement) => void;
}

/**
 * Move focus to an adjacent section header (wrapping at boundaries).
 */
function focusAdjacentHeader(current: HTMLElement, direction: 1 | -1): void {
	const container = current.closest('.cr-profile__sections');
	if (!container) return;
	const headers = Array.from(container.querySelectorAll<HTMLElement>('.cr-profile__section-header'));
	const idx = headers.indexOf(current);
	if (idx === -1) return;
	const next = (idx + direction + headers.length) % headers.length;
	headers[next].focus();
}

/**
 * Move focus to the first or last section header.
 */
function focusFirstOrLastHeader(current: HTMLElement, first: boolean): void {
	const container = current.closest('.cr-profile__sections');
	if (!container) return;
	const headers = Array.from(container.querySelectorAll<HTMLElement>('.cr-profile__section-header'));
	if (headers.length === 0) return;
	headers[first ? 0 : headers.length - 1].focus();
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
	header.setAttribute('tabindex', '0');
	header.setAttribute('role', 'button');
	header.setAttribute('aria-expanded', String(options.expanded));

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

	// Lazy rendering: populate content on first expand
	if (options.contentRenderer) {
		if (options.expanded) {
			options.contentRenderer(content);
		}
		// Deferred rendering handled in the toggle handler below
	}

	// Toggle behavior
	const toggleSection = (): void => {
		const isExpanded = section.hasClass('cr-profile__section--expanded');
		if (isExpanded) {
			section.removeClass('cr-profile__section--expanded');
			header.setAttribute('aria-expanded', 'false');
			if (options.onCollapse) {
				options.onCollapse(content);
			}
		} else {
			section.addClass('cr-profile__section--expanded');
			header.setAttribute('aria-expanded', 'true');
			// Lazy render on first expand
			if (options.contentRenderer && content.childElementCount === 0) {
				options.contentRenderer(content);
			}
		}
		options.onToggle(options.sectionId, !isExpanded);
	};

	header.addEventListener('click', toggleSection);

	// Keyboard navigation (WAI-ARIA accordion pattern)
	header.addEventListener('keydown', (e: KeyboardEvent) => {
		switch (e.key) {
			case 'Enter':
			case ' ':
				e.preventDefault();
				toggleSection();
				break;
			case 'ArrowDown':
				e.preventDefault();
				focusAdjacentHeader(header, 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				focusAdjacentHeader(header, -1);
				break;
			case 'Home':
				e.preventDefault();
				focusFirstOrLastHeader(header, true);
				break;
			case 'End':
				e.preventDefault();
				focusFirstOrLastHeader(header, false);
				break;
		}
	});

	return content;
}
