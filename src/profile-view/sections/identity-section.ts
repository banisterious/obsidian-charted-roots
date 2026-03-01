/**
 * Identity Section
 *
 * Renders the sticky header with entity name, metadata, avatar,
 * pin toggle, and stale indicator. Shared across all entity types.
 */

import { type App, TFile, setIcon } from 'obsidian';
import type { MediaService } from '../../core/media-service';
import type { ProfileEntityData } from '../profile-types';

export interface IdentityHeaderOptions {
	pinned: boolean;
	stale: boolean;
	onTogglePin: () => void;
	onOpenNote: (file: TFile) => void;
	app: App;
	mediaService: MediaService;
}

export function renderIdentityHeader(
	container: HTMLElement,
	data: ProfileEntityData,
	options: IdentityHeaderOptions
): void {
	container.empty();

	// Top row: pin toggle + entity type badge + actions
	const topRow = container.createDiv({ cls: 'cr-profile__header-top' });

	// Pin toggle
	const pinBtn = topRow.createEl('button', {
		cls: 'cr-profile__pin-toggle clickable-icon',
		attr: { 'aria-label': options.pinned ? 'Unpin profile' : 'Pin profile' }
	});
	setIcon(pinBtn, options.pinned ? 'pin-off' : 'pin');
	pinBtn.addEventListener('click', options.onTogglePin);

	// Entity type badge
	const badge = topRow.createSpan({ cls: 'cr-profile__type-badge' });
	badge.addClass(`cr-profile__type-badge--${data.entityType}`);
	badge.textContent = formatEntityType(data.entityType);

	// Stale indicator
	const staleBadge = topRow.createSpan({
		cls: 'cr-profile__stale-badge',
		text: 'Not following'
	});
	staleBadge.style.display = options.stale ? 'inline-flex' : 'none';

	// Open note button
	const openBtn = topRow.createEl('button', {
		cls: 'cr-profile__open-note clickable-icon',
		attr: { 'aria-label': 'Open note' }
	});
	setIcon(openBtn, 'file-text');
	openBtn.addEventListener('click', () => options.onOpenNote(data.file));

	// Main content: avatar + name + metadata
	const main = container.createDiv({ cls: 'cr-profile__header-main' });

	// Avatar (person only)
	if (data.entityType === 'person' && data.node.media && data.node.media.length > 0) {
		const thumb = options.mediaService.getFirstThumbnailFile(data.node.media);
		if (thumb) {
			const avatarEl = main.createDiv({ cls: 'cr-profile__header-avatar' });
			const img = avatarEl.createEl('img', {
				attr: {
					src: options.app.vault.getResourcePath(thumb),
					alt: data.name
				}
			});
			img.addEventListener('error', () => {
				avatarEl.remove();
			});
		}
	}

	const info = main.createDiv({ cls: 'cr-profile__header-info' });

	// Name
	info.createEl('h2', { text: data.name, cls: 'cr-profile__header-name' });

	// Metadata (entity-type-specific)
	const meta = info.createDiv({ cls: 'cr-profile__header-meta' });
	renderEntityMeta(meta, data);
}

function renderEntityMeta(container: HTMLElement, data: ProfileEntityData): void {
	switch (data.entityType) {
		case 'person': {
			const parts: string[] = [];
			if (data.node.birthDate || data.node.deathDate) {
				const birth = data.node.birthDate || '?';
				const death = data.node.deathDate || '';
				parts.push(death ? `${birth} – ${death}` : `b. ${birth}`);
			}
			if (data.node.birthPlace) {
				parts.push(data.node.birthPlace);
			}
			if (data.node.occupation) {
				parts.push(data.node.occupation);
			}
			if (parts.length > 0) {
				container.createSpan({ text: parts.join(' · ') });
			}
			break;
		}
		case 'place': {
			const parts: string[] = [];
			if (data.node.category) {
				parts.push(data.node.category);
			}
			if (data.node.coordinates) {
				const lat = data.node.coordinates.lat;
				const lon = data.node.coordinates.long;
				parts.push(`${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`);
			}
			if (parts.length > 0) {
				container.createSpan({ text: parts.join(' · ') });
			}
			break;
		}
		case 'event': {
			const parts: string[] = [];
			if (data.event.eventType) {
				parts.push(data.event.eventType);
			}
			if (data.event.date) {
				parts.push(String(data.event.date));
			}
			if (data.event.place) {
				parts.push(stripWikilink(data.event.place));
			}
			if (parts.length > 0) {
				container.createSpan({ text: parts.join(' · ') });
			}
			break;
		}
		case 'source': {
			const parts: string[] = [];
			if (data.source.sourceType) {
				parts.push(data.source.sourceType);
			}
			if (data.source.date) {
				parts.push(String(data.source.date));
			}
			if (data.source.repository) {
				parts.push(stripWikilink(data.source.repository));
			}
			if (parts.length > 0) {
				container.createSpan({ text: parts.join(' · ') });
			}
			break;
		}
		case 'organization': {
			const parts: string[] = [];
			if (data.org.orgType) {
				parts.push(data.org.orgType);
			}
			if (data.org.founded) {
				const dissolved = data.org.dissolved ? ` – ${data.org.dissolved}` : '';
				parts.push(`est. ${data.org.founded}${dissolved}`);
			}
			if (data.org.seat) {
				parts.push(stripWikilink(data.org.seat));
			}
			if (parts.length > 0) {
				container.createSpan({ text: parts.join(' · ') });
			}
			break;
		}
	}
}

function formatEntityType(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

function stripWikilink(link: string): string {
	return link.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/\|.*$/, '');
}
