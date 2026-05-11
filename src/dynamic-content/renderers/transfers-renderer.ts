/**
 * Transfers Renderer
 *
 * Renders transfer history HTML for the charted-roots-transfers code block.
 * Creates a styled list of transfer events showing ownership changes over time.
 */

import { MarkdownRenderer, MarkdownRenderChild, setIcon } from 'obsidian';
import type { DynamicBlockContext, DynamicBlockConfig } from '../services/dynamic-content-service';
import type { DynamicContentService } from '../services/dynamic-content-service';
import type { EventNote } from '../../events/types/event-types';

/**
 * Labels for transfer types
 */
const TRANSFER_TYPE_LABELS: Record<string, string> = {
	inheritance: 'Inherited',
	purchase: 'Purchased',
	gift: 'Gift',
	hire: 'Hired out',
	seizure: 'Seized',
	birth: 'Born into',
	relocation: 'Relocated'
};

/**
 * Icons for transfer types
 */
const TRANSFER_TYPE_ICONS: Record<string, string> = {
	inheritance: 'scroll-text',
	purchase: 'banknote',
	gift: 'gift',
	hire: 'clock',
	seizure: 'gavel',
	birth: 'baby',
	relocation: 'map-pin'
};

/**
 * Transfer entry for display
 */
export interface TransferEntry {
	date: string;
	year: string;
	transferType: string;
	title: string;
	description?: string;
	place?: string;
	participants?: string[];
	eventFile?: string;
}

/**
 * Renders transfer history content into an HTML element
 */
export class TransfersRenderer {
	private service: DynamicContentService;
	/** Store entries for freeze functionality */
	private currentEntries: TransferEntry[] = [];
	private currentContext: DynamicBlockContext | null = null;

	constructor(service: DynamicContentService) {
		this.service = service;
	}

	/**
	 * Render the transfers block
	 */
	async render(
		el: HTMLElement,
		context: DynamicBlockContext,
		config: DynamicBlockConfig,
		component: MarkdownRenderChild
	): Promise<void> {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-transfers' });

		// Build transfer entries
		const entries = this.buildTransferEntries(context, config);

		// Store for freeze functionality
		this.currentEntries = entries;
		this.currentContext = context;

		// Render header (needs entries for freeze)
		this.renderHeader(container, config);

		// Render content
		const contentEl = container.createDiv({ cls: 'cr-dynamic-block__content' });

		if (entries.length === 0) {
			contentEl.createDiv({
				cls: 'cr-dynamic-block__empty',
				text: 'No transfer events found for this person.'
			});
			return;
		}

		// Render transfer list
		await this.renderTransferList(contentEl, entries, context, component);
	}

	/**
	 * Render the header with title and toolbar
	 */
	private renderHeader(container: HTMLElement, config: DynamicBlockConfig): void {
		const header = container.createDiv({ cls: 'cr-dynamic-block__header' });

		const title = config.title as string || 'Transfer history';
		header.createSpan({ cls: 'cr-dynamic-block__title', text: title });

		const toolbar = header.createDiv({ cls: 'cr-dynamic-block__toolbar' });

		// Freeze button
		const freezeBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Freeze to Markdown' }
		});
		freezeBtn.textContent = '❄️';
		freezeBtn.addEventListener('click', () => {
			void this.freezeToMarkdown();
		});

		// Copy button
		const copyBtn = toolbar.createEl('button', {
			cls: 'cr-dynamic-block__btn clickable-icon',
			attr: { 'aria-label': 'Copy transfer history' }
		});
		copyBtn.textContent = '📋';
		copyBtn.addEventListener('click', () => {
			this.copyToClipboard(container);
		});
	}

	/**
	 * Build transfer entries from events
	 */
	private buildTransferEntries(
		context: DynamicBlockContext,
		config: DynamicBlockConfig
	): TransferEntry[] {
		const entries: TransferEntry[] = [];
		const { person, eventService, crId } = context;

		if (!eventService || !crId) {
			return [];
		}

		// Get transfer events linked to this person
		const personLink = person?.file ? `[[${person.file.basename}]]` : '';
		if (!personLink) return [];

		const allEvents = eventService.getEventsForPerson(personLink);

		// Filter to only transfer events
		const transferEvents = allEvents.filter(e => e.eventType === 'transfer');

		for (const event of transferEvents) {
			entries.push({
				date: this.service.formatDate(event.date),
				year: this.service.extractYear(event.date),
				transferType: (event as EventNote & { transferType?: string }).transferType || 'unknown',
				title: event.title,
				description: event.description,
				place: event.place ? this.service.stripWikilink(event.place) : undefined,
				participants: event.persons?.map(p => this.service.stripWikilink(p)),
				eventFile: event.file?.basename
			});
		}

		// Sort entries by date
		const sortOrder = config.sort as string || 'chronological';
		entries.sort((a, b) => {
			const yearA = parseInt(a.year) || 0;
			const yearB = parseInt(b.year) || 0;

			if (sortOrder === 'reverse') {
				return yearB - yearA;
			}
			return yearA - yearB;
		});

		// Apply limit
		const limit = config.limit as number | undefined;
		if (limit && limit > 0 && entries.length > limit) {
			return entries.slice(0, limit);
		}

		return entries;
	}

	/**
	 * Render the transfer list
	 */
	private async renderTransferList(
		contentEl: HTMLElement,
		entries: TransferEntry[],
		context: DynamicBlockContext,
		component: MarkdownRenderChild
	): Promise<void> {
		const list = contentEl.createEl('ul', { cls: 'cr-transfers__list' });

		for (const entry of entries) {
			const li = list.createEl('li', { cls: 'cr-transfers__item' });

			// Icon based on transfer type
			const iconName = TRANSFER_TYPE_ICONS[entry.transferType] || 'arrow-right-left';
			const iconSpan = li.createSpan({ cls: 'cr-transfers__icon' });
			setIcon(iconSpan, iconName);

			// Year/date
			const yearSpan = li.createSpan({ cls: 'cr-transfers__year' });
			yearSpan.textContent = entry.year || entry.date || '?';

			// Separator
			li.createSpan({ cls: 'cr-transfers__separator', text: ' — ' });

			// Transfer type label
			const typeLabel = TRANSFER_TYPE_LABELS[entry.transferType] || entry.transferType;
			const typeSpan = li.createSpan({ cls: 'cr-transfers__type' });
			typeSpan.textContent = typeLabel;

			// Event title with link
			if (entry.eventFile) {
				li.appendText(': ');
				const titleSpan = li.createSpan({ cls: 'cr-transfers__title' });
				await MarkdownRenderer.render(
					context.familyGraph['app'],
					`[[${entry.eventFile}|${entry.title}]]`,
					titleSpan,
					context.file.path,
					component
				);
			} else if (entry.description) {
				li.appendText(': ');
				li.createSpan({ cls: 'cr-transfers__title', text: entry.description });
			}

			// Place (if present)
			if (entry.place) {
				li.appendText('\u00A0');
				li.createSpan({ cls: 'cr-transfers__place', text: `at ${entry.place}` });
			}

			// Participants (other than current person)
			if (entry.participants && entry.participants.length > 1) {
				const currentPerson = context.person?.name || '';
				const others = entry.participants.filter(p => p !== currentPerson);
				if (others.length > 0) {
					li.appendText('\u00A0');
					li.createSpan({
						cls: 'cr-transfers__participants',
						text: `(with ${others.join(', ')})`
					});
				}
			}
		}
	}

	/**
	 * Copy transfer history to clipboard as plain text
	 */
	private copyToClipboard(container: HTMLElement): void {
		const items = container.querySelectorAll('.cr-transfers__item');
		const lines: string[] = [];

		items.forEach(item => {
			const year = item.querySelector('.cr-transfers__year')?.textContent || '';
			const type = item.querySelector('.cr-transfers__type')?.textContent || '';
			const title = item.querySelector('.cr-transfers__title')?.textContent || '';
			const place = item.querySelector('.cr-transfers__place')?.textContent || '';
			lines.push(`${year} — ${type}: ${title}${place}`);
		});

		const text = lines.join('\n');
		void navigator.clipboard.writeText(text);
	}

	/**
	 * Generate markdown from current entries and replace the code block
	 */
	private async freezeToMarkdown(): Promise<void> {
		if (!this.currentContext || this.currentEntries.length === 0) {
			return;
		}

		const markdown = this.generateMarkdown();
		await this.service.freezeToMarkdown(
			this.currentContext.file,
			'charted-roots-transfers',
			markdown
		);
	}

	/**
	 * Generate markdown representation of the transfer history
	 */
	private generateMarkdown(): string {
		const lines: string[] = ['## Transfer history', ''];

		for (const entry of this.currentEntries) {
			const typeLabel = TRANSFER_TYPE_LABELS[entry.transferType] || entry.transferType;
			let line = `- **${entry.year || entry.date || '?'}** — ${typeLabel}`;

			// Add title with wikilink if it's an event
			if (entry.eventFile) {
				line += `: [[${entry.eventFile}|${entry.title}]]`;
			} else if (entry.description) {
				line += `: ${entry.description}`;
			}

			// Add place
			if (entry.place) {
				line += ` at ${entry.place}`;
			}

			lines.push(line);
		}

		return lines.join('\n');
	}
}
