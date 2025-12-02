/**
 * Migration Flow Diagram Modal
 * Visualizes migration patterns (birth place -> death place) as an arc diagram
 */

import { App, Modal } from 'obsidian';
import { createLucideIcon } from './lucide-icons';
import { PlaceGraphService } from '../core/place-graph';

interface MigrationFlow {
	from: string;
	to: string;
	count: number;
}

interface PlaceData {
	name: string;
	birthCount: number;
	deathCount: number;
	x?: number;
}

/**
 * Modal displaying a migration flow diagram
 */
export class MigrationDiagramModal extends Modal {
	private placeService: PlaceGraphService;
	private migrationPatterns: MigrationFlow[];
	private minFlowCount: number = 1;

	constructor(app: App) {
		super(app);
		this.placeService = new PlaceGraphService(app);
		this.placeService.reloadCache();

		const stats = this.placeService.calculateStatistics();
		this.migrationPatterns = stats.migrationPatterns;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('crc-migration-diagram-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'crc-modal-header' });
		const titleContainer = header.createDiv({ cls: 'crc-modal-title' });
		const icon = createLucideIcon('arrow-right', 24);
		titleContainer.appendChild(icon);
		titleContainer.appendText('Migration patterns');

		// Description
		contentEl.createEl('p', {
			text: 'Visualizing migration flows from birth locations to death locations.',
			cls: 'crc-text--muted'
		});

		if (this.migrationPatterns.length === 0) {
			contentEl.createEl('p', {
				text: 'No migration patterns found. People must have different birth and death places to show migration.',
				cls: 'crc-text--muted crc-mt-3'
			});
			return;
		}

		// Filter control
		const controlsRow = contentEl.createDiv({ cls: 'crc-migration-controls' });
		controlsRow.createEl('span', { text: 'Minimum people: ', cls: 'crc-text--muted' });

		const slider = controlsRow.createEl('input', {
			type: 'range',
			cls: 'crc-migration-slider'
		});
		slider.min = '1';
		slider.max = String(Math.max(...this.migrationPatterns.map(p => p.count)));
		slider.value = '1';

		const countLabel = controlsRow.createEl('span', {
			text: '1',
			cls: 'crc-migration-count-label'
		});

		// Diagram container
		const diagramContainer = contentEl.createDiv({ cls: 'crc-migration-diagram' });

		// Initial render
		this.renderDiagram(diagramContainer, this.minFlowCount);

		// Update on slider change
		slider.addEventListener('input', () => {
			this.minFlowCount = parseInt(slider.value);
			countLabel.textContent = slider.value;
			this.renderDiagram(diagramContainer, this.minFlowCount);
		});

		// Legend
		const legend = contentEl.createDiv({ cls: 'crc-migration-legend' });
		legend.createEl('div', { cls: 'crc-migration-legend-item' }).innerHTML =
			'<span class="crc-migration-legend-dot crc-migration-legend-dot--birth"></span> Birth location';
		legend.createEl('div', { cls: 'crc-migration-legend-item' }).innerHTML =
			'<span class="crc-migration-legend-dot crc-migration-legend-dot--death"></span> Death location';
		legend.createEl('div', { cls: 'crc-migration-legend-item' }).innerHTML =
			'<span class="crc-migration-legend-line"></span> Migration flow (thicker = more people)';
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the migration diagram as an arc diagram
	 */
	private renderDiagram(container: HTMLElement, minCount: number): void {
		container.empty();

		// Filter flows by minimum count
		const flows = this.migrationPatterns.filter(p => p.count >= minCount);

		if (flows.length === 0) {
			container.createEl('p', {
				text: 'No migration patterns match the current filter.',
				cls: 'crc-text--muted crc-text--center'
			});
			return;
		}

		// Collect unique places and calculate their stats
		const places = new Map<string, PlaceData>();

		for (const flow of flows) {
			if (!places.has(flow.from)) {
				places.set(flow.from, { name: flow.from, birthCount: 0, deathCount: 0 });
			}
			if (!places.has(flow.to)) {
				places.set(flow.to, { name: flow.to, birthCount: 0, deathCount: 0 });
			}
			places.get(flow.from)!.birthCount += flow.count;
			places.get(flow.to)!.deathCount += flow.count;
		}

		// Sort places by total activity
		const sortedPlaces = Array.from(places.values())
			.sort((a, b) => (b.birthCount + b.deathCount) - (a.birthCount + a.deathCount));

		// Calculate layout
		const width = 800;
		const height = Math.max(400, sortedPlaces.length * 40 + 100);
		const padding = 150;
		const nodeRadius = 8;

		// Assign x positions
		const nodeSpacing = (width - padding * 2) / Math.max(sortedPlaces.length - 1, 1);
		sortedPlaces.forEach((place, i) => {
			place.x = padding + i * nodeSpacing;
		});

		// Create SVG
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', String(width));
		svg.setAttribute('height', String(height));
		svg.setAttribute('class', 'crc-migration-svg');

		// Create place index for quick lookup
		const placeIndex = new Map<string, PlaceData>();
		for (const place of sortedPlaces) {
			placeIndex.set(place.name, place);
		}

		// Calculate max flow for scaling
		const maxFlow = Math.max(...flows.map(f => f.count));

		// Draw arcs for each migration flow
		const centerY = height / 2 - 20;

		for (const flow of flows) {
			const fromPlace = placeIndex.get(flow.from);
			const toPlace = placeIndex.get(flow.to);

			if (!fromPlace || !toPlace || fromPlace.x === undefined || toPlace.x === undefined) continue;

			// Calculate arc
			const x1 = fromPlace.x;
			const x2 = toPlace.x;
			const midX = (x1 + x2) / 2;
			const distance = Math.abs(x2 - x1);
			const curveHeight = Math.min(distance / 2, height / 3);

			// Determine if arc goes above or below
			const arcAbove = x1 < x2;
			const arcY = arcAbove ? centerY - curveHeight : centerY + curveHeight;

			// Create path
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			const d = `M ${x1} ${centerY} Q ${midX} ${arcY} ${x2} ${centerY}`;
			path.setAttribute('d', d);
			path.setAttribute('fill', 'none');
			path.setAttribute('stroke', 'var(--text-accent)');
			path.setAttribute('stroke-opacity', String(0.3 + 0.5 * (flow.count / maxFlow)));
			path.setAttribute('stroke-width', String(1 + 4 * (flow.count / maxFlow)));
			path.setAttribute('class', 'crc-migration-arc');

			// Add arrow marker
			const arrowId = `arrow-${Math.random().toString(36).substr(2, 9)}`;
			const defs = svg.querySelector('defs') || svg.insertBefore(
				document.createElementNS('http://www.w3.org/2000/svg', 'defs'),
				svg.firstChild
			);

			const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
			marker.setAttribute('id', arrowId);
			marker.setAttribute('viewBox', '0 0 10 10');
			marker.setAttribute('refX', '8');
			marker.setAttribute('refY', '5');
			marker.setAttribute('markerWidth', '6');
			marker.setAttribute('markerHeight', '6');
			marker.setAttribute('orient', 'auto-start-reverse');

			const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
			arrowPath.setAttribute('fill', 'var(--text-accent)');
			arrowPath.setAttribute('fill-opacity', String(0.3 + 0.5 * (flow.count / maxFlow)));
			marker.appendChild(arrowPath);
			defs.appendChild(marker);

			path.setAttribute('marker-end', `url(#${arrowId})`);

			// Tooltip
			path.setAttribute('data-tooltip', `${flow.from} → ${flow.to}: ${flow.count} ${flow.count === 1 ? 'person' : 'people'}`);

			svg.appendChild(path);
		}

		// Draw place nodes
		for (const place of sortedPlaces) {
			if (place.x === undefined) continue;

			// Node group
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			g.setAttribute('class', 'crc-migration-node');

			// Circle
			const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			circle.setAttribute('cx', String(place.x));
			circle.setAttribute('cy', String(centerY));
			circle.setAttribute('r', String(nodeRadius));

			// Color based on whether it's primarily a birth or death location
			if (place.birthCount > place.deathCount) {
				circle.setAttribute('fill', 'var(--color-green)');
				circle.setAttribute('class', 'crc-migration-node--birth');
			} else if (place.deathCount > place.birthCount) {
				circle.setAttribute('fill', 'var(--color-red)');
				circle.setAttribute('class', 'crc-migration-node--death');
			} else {
				circle.setAttribute('fill', 'var(--text-muted)');
			}
			g.appendChild(circle);

			// Label
			const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			text.setAttribute('x', String(place.x));
			text.setAttribute('y', String(centerY + nodeRadius + 15));
			text.setAttribute('text-anchor', 'middle');
			text.setAttribute('class', 'crc-migration-label');
			text.textContent = this.truncatePlaceName(place.name, 15);
			g.appendChild(text);

			// Stats below label
			const stats = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			stats.setAttribute('x', String(place.x));
			stats.setAttribute('y', String(centerY + nodeRadius + 30));
			stats.setAttribute('text-anchor', 'middle');
			stats.setAttribute('class', 'crc-migration-stats');
			stats.textContent = `↑${place.birthCount} ↓${place.deathCount}`;
			g.appendChild(stats);

			svg.appendChild(g);
		}

		container.appendChild(svg);

		// Add tooltip handler
		this.addTooltipHandler(container);
	}

	/**
	 * Truncate place name for display
	 */
	private truncatePlaceName(name: string, maxLength: number): string {
		if (name.length <= maxLength) return name;
		return name.substring(0, maxLength - 1) + '…';
	}

	/**
	 * Add tooltip handler for arcs
	 */
	private addTooltipHandler(container: HTMLElement): void {
		const tooltip = container.createDiv({ cls: 'crc-migration-tooltip' });
		tooltip.style.display = 'none';

		const arcs = container.querySelectorAll('.crc-migration-arc');
		arcs.forEach((arc) => {
			arc.addEventListener('mouseenter', (e: Event) => {
				const target = e.target as SVGPathElement;
				const text = target.getAttribute('data-tooltip');
				if (text) {
					tooltip.textContent = text;
					tooltip.style.display = 'block';
				}
			});

			arc.addEventListener('mousemove', (e: Event) => {
				const event = e as MouseEvent;
				const rect = container.getBoundingClientRect();
				tooltip.style.left = `${event.clientX - rect.left + 10}px`;
				tooltip.style.top = `${event.clientY - rect.top - 20}px`;
			});

			arc.addEventListener('mouseleave', () => {
				tooltip.style.display = 'none';
			});
		});
	}
}
