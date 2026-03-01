/**
 * Media Section
 *
 * Renders a grid of media thumbnails for images and icons for
 * other file types. Shared across all entity types.
 */

import type { App } from 'obsidian';
import type { MediaItem } from '../../core/media-service';
import type { SectionToggleFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface MediaSectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	app: App;
	sectionId?: string;
}

export function renderMediaSection(
	parent: HTMLElement,
	media: MediaItem[],
	options: MediaSectionOptions
): void {
	const sectionId = options.sectionId || 'media';
	const count = media.length;
	const summary = `${count} item${count !== 1 ? 's' : ''}`;

	const content = renderProfileSection(parent, {
		sectionId,
		title: 'Media',
		summary,
		expanded: options.sectionStates[sectionId] ?? false,
		onToggle: options.onToggle,
		hidden: count === 0,
		icon: 'image'
	});
	if (!content) return;

	const grid = content.createDiv({ cls: 'cr-profile__media-grid' });
	for (const item of media) {
		const cell = grid.createDiv({ cls: 'cr-profile__media-cell' });

		if (item.type === 'image' && item.file) {
			const img = cell.createEl('img', {
				cls: 'cr-profile__media-thumb',
				attr: {
					src: options.app.vault.getResourcePath(item.file),
					alt: item.displayName,
					loading: 'lazy'
				}
			});
			img.addEventListener('error', () => {
				img.remove();
				cell.createSpan({ text: item.displayName, cls: 'cr-profile__media-fallback' });
			});
		} else {
			cell.createSpan({ text: item.displayName, cls: 'cr-profile__media-filename' });
		}

		cell.addEventListener('click', () => {
			if (item.file) {
				void options.app.workspace.openLinkText(item.file.basename, item.file.path);
			}
		});
		cell.title = item.displayName;
	}
}
