/**
 * Excalidraw Exporter for Canvas Roots
 *
 * Converts Obsidian Canvas family trees to Excalidraw format for manual annotation and customization.
 */

import { App, TFile, Notice } from 'obsidian';
import { getLogger } from '../core/logging';
import { getErrorMessage } from '../core/error-utils';
import type { CanvasData } from '../core/canvas-generator';
import type { CanvasNode } from '../models/canvas';

const logger = getLogger('ExcalidrawExporter');

/**
 * Excalidraw export options
 */
export interface ExcalidrawExportOptions {
	/** Source canvas file to export */
	canvasFile: TFile;

	/** Output filename (without extension) */
	fileName?: string;

	/** Preserve colors from canvas */
	preserveColors?: boolean;

	/** Font size for person names */
	fontSize?: number;

	/** Stroke width for edges */
	strokeWidth?: number;
}

/**
 * Excalidraw export result
 */
export interface ExcalidrawExportResult {
	/** Whether export succeeded */
	success: boolean;

	/** Excalidraw markdown content */
	excalidrawContent?: string;

	/** Number of elements exported */
	elementsExported: number;

	/** Error messages if any */
	errors: string[];

	/** Output filename */
	fileName: string;
}

/**
 * Excalidraw element base properties
 */
interface ExcalidrawElement {
	id: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	angle: number;
	strokeColor: string;
	backgroundColor: string;
	fillStyle: 'solid' | 'hachure' | 'cross-hatch';
	strokeWidth: number;
	strokeStyle: 'solid' | 'dashed' | 'dotted';
	roughness: number;
	opacity: number;
	groupIds: string[];
	frameId: null;
	roundness: null | { type: number };
	seed: number;
	version: number;
	versionNonce: number;
	isDeleted: boolean;
	boundElements: { id: string; type: string }[] | null;
	updated: number;
	link: null | string;
	locked: boolean;
}

/**
 * Excalidraw rectangle element
 */
interface ExcalidrawRectangle extends ExcalidrawElement {
	type: 'rectangle';
}

/**
 * Excalidraw text element
 */
interface ExcalidrawText extends ExcalidrawElement {
	type: 'text';
	text: string;
	rawText: string;
	fontSize: number;
	fontFamily: 1 | 2 | 3 | 4 | 5; // 1=Virgil, 2=Helvetica, 3=Cascadia, 4=Virgil, 5=Excalifont
	textAlign: 'left' | 'center' | 'right';
	verticalAlign: 'top' | 'middle';
	baseline: number;
	containerId: string | null;
	originalText: string;
	autoResize: boolean;
	lineHeight: number;
}

/**
 * Excalidraw arrow element
 */
interface ExcalidrawArrow extends ExcalidrawElement {
	type: 'arrow';
	points: [number, number][];
	lastCommittedPoint: null | [number, number];
	startBinding: {
		elementId: string;
		focus: number;
		gap: number;
	} | null;
	endBinding: {
		elementId: string;
		focus: number;
		gap: number;
	} | null;
	startArrowhead: null | 'arrow' | 'bar' | 'dot';
	endArrowhead: null | 'arrow' | 'bar' | 'dot';
	elbowed: boolean;
}

/**
 * Excalidraw file structure (Obsidian Excalidraw plugin format)
 */
interface ExcalidrawFile {
	type: 'excalidraw';
	version: number;
	source: string;
	elements: (ExcalidrawRectangle | ExcalidrawText | ExcalidrawArrow)[];
	appState: {
		gridSize: null;
		viewBackgroundColor: string;
	};
	files: Record<string, unknown>;
}

/**
 * Canvas color to Excalidraw color mapping
 */
const CANVAS_TO_EXCALIDRAW_COLORS: Record<string, string> = {
	'1': '#e03131', // red
	'2': '#f08c00', // orange
	'3': '#fab005', // yellow
	'4': '#82c91e', // green
	'5': '#4dabf7', // blue
	'6': '#be4bdb', // purple
	'none': '#1e1e1e' // default dark
};

/**
 * Export canvas to Excalidraw format
 */
export class ExcalidrawExporter {
	private app: App;
	private idCounter: number;

	constructor(app: App) {
		this.app = app;
		this.idCounter = 0;
	}

	/**
	 * Export canvas file to Excalidraw format
	 */
	async exportToExcalidraw(options: ExcalidrawExportOptions): Promise<ExcalidrawExportResult> {
		const result: ExcalidrawExportResult = {
			success: false,
			elementsExported: 0,
			errors: [],
			fileName: options.fileName || options.canvasFile.basename
		};

		try {
			new Notice('Reading canvas file...');

			// Read canvas JSON
			const canvasContent = await this.app.vault.read(options.canvasFile);
			const canvasData: CanvasData = JSON.parse(canvasContent);

			logger.info('export', `Loaded canvas with ${canvasData.nodes.length} nodes and ${canvasData.edges.length} edges`);

			// Convert to Excalidraw elements
			new Notice('Converting to Excalidraw format...');
			const excalidrawData = this.convertCanvasToExcalidraw(canvasData, options);

			logger.info('export', `Converted to ${excalidrawData.elements.length} Excalidraw elements`);

			// Build Excalidraw markdown content (Obsidian Excalidraw plugin format)
			logger.info('export', 'Building Excalidraw markdown...');
			const excalidrawMarkdown = this.buildExcalidrawMarkdown(excalidrawData);

			logger.info('export', `Generated markdown with ${excalidrawMarkdown.length} characters`);

			result.excalidrawContent = excalidrawMarkdown;
			result.elementsExported = excalidrawData.elements.length;
			result.success = true;

			logger.info('export', 'Export completed successfully');
			new Notice(`Export complete: ${result.elementsExported} elements exported`);

		} catch (error: unknown) {
			const errorMsg = getErrorMessage(error);
			const errorStack = error instanceof Error ? error.stack : '';
			result.errors.push(`Export failed: ${errorMsg}`);
			logger.error('export', 'Export failed', { error: errorMsg, stack: errorStack });
			new Notice(`Export failed: ${errorMsg}`);
		}

		return result;
	}

	/**
	 * Convert Canvas data to Excalidraw format
	 */
	private convertCanvasToExcalidraw(
		canvasData: CanvasData,
		options: ExcalidrawExportOptions
	): ExcalidrawFile {
		const elements: (ExcalidrawRectangle | ExcalidrawText | ExcalidrawArrow)[] = [];
		const nodeIdMap = new Map<string, string>(); // Canvas ID -> Excalidraw ID

		const fontSize = options.fontSize || 16;
		const strokeWidth = options.strokeWidth || 2;
		const preserveColors = options.preserveColors ?? true;

		// Calculate bounds to normalize coordinates
		let minX = Infinity;
		let minY = Infinity;
		for (const node of canvasData.nodes) {
			minX = Math.min(minX, node.x);
			minY = Math.min(minY, node.y);
		}

		// Add padding so elements aren't right at edge
		const padding = 50;
		const offsetX = -minX + padding;
		const offsetY = -minY + padding;

		logger.info('export', `Coordinate offset: (${offsetX}, ${offsetY}) from bounds (${minX}, ${minY})`);

		// Convert nodes
		for (const node of canvasData.nodes) {
			const excalidrawId = this.generateId();
			nodeIdMap.set(node.id, excalidrawId);

			// Create rectangle for node (with coordinate offset applied)
			const rectColor = preserveColors && node.color
				? CANVAS_TO_EXCALIDRAW_COLORS[node.color] || CANVAS_TO_EXCALIDRAW_COLORS['none']
				: CANVAS_TO_EXCALIDRAW_COLORS['none'];

			const rectangle = this.createRectangle(
				excalidrawId,
				node.x + offsetX,
				node.y + offsetY,
				node.width,
				node.height,
				rectColor
			);
			elements.push(rectangle);

			// Create text label (with coordinate offset applied)
			// Extract person name from file path or text content
			const labelText = this.extractNodeLabel(node);
			if (labelText) {
				const textElement = this.createText(
					this.generateId(),
					node.x + offsetX + node.width / 2,
					node.y + offsetY + node.height / 2,
					labelText,
					fontSize,
					excalidrawId // container ID
				);
				elements.push(textElement);
			}
		}

		// Convert edges
		for (const edge of canvasData.edges) {
			const fromExcalidrawId = nodeIdMap.get(edge.fromNode);
			const toExcalidrawId = nodeIdMap.get(edge.toNode);

			if (!fromExcalidrawId || !toExcalidrawId) {
				logger.warn('export', `Skipping edge with missing node: ${edge.id}`);
				continue;
			}

			// Get source and target node positions
			const fromNode = canvasData.nodes.find(n => n.id === edge.fromNode);
			const toNode = canvasData.nodes.find(n => n.id === edge.toNode);

			if (!fromNode || !toNode) continue;

			const edgeColor = preserveColors && edge.color
				? CANVAS_TO_EXCALIDRAW_COLORS[edge.color] || CANVAS_TO_EXCALIDRAW_COLORS['none']
				: CANVAS_TO_EXCALIDRAW_COLORS['none'];

			const arrow = this.createArrow(
				this.generateId(),
				fromNode,
				toNode,
				fromExcalidrawId,
				toExcalidrawId,
				edgeColor,
				strokeWidth,
				offsetX,
				offsetY,
				edge.label
			);
			elements.push(arrow);
		}

		return {
			type: 'excalidraw',
			version: 2,
			source: 'https://github.com/banisterious/obsidian-canvas-roots',
			elements,
			appState: {
				gridSize: null,
				viewBackgroundColor: '#ffffff'
			},
			files: {}
		};
	}

	/**
	 * Create Excalidraw rectangle element
	 */
	private createRectangle(
		id: string,
		x: number,
		y: number,
		width: number,
		height: number,
		color: string
	): ExcalidrawRectangle {
		return {
			id,
			type: 'rectangle',
			x,
			y,
			width,
			height,
			angle: 0,
			strokeColor: color,
			backgroundColor: 'transparent',
			fillStyle: 'solid',
			strokeWidth: 2,
			strokeStyle: 'solid',
			roughness: 1,
			opacity: 100,
			groupIds: [],
			frameId: null,
			roundness: { type: 3 },
			seed: this.generateSeed(),
			version: 1,
			versionNonce: this.generateSeed(),
			isDeleted: false,
			boundElements: null,
			updated: Date.now(),
			link: null,
			locked: false
		};
	}

	/**
	 * Create Excalidraw text element
	 */
	private createText(
		id: string,
		x: number,
		y: number,
		text: string,
		fontSize: number,
		containerId: string | null = null
	): ExcalidrawText {
		// Center text within container
		const textWidth = text.length * fontSize * 0.6; // Approximate width
		const textHeight = fontSize * 1.2;

		return {
			id,
			type: 'text',
			x: x - textWidth / 2,
			y: y - textHeight / 2,
			width: textWidth,
			height: textHeight,
			angle: 0,
			strokeColor: '#1e1e1e',
			backgroundColor: 'transparent',
			fillStyle: 'solid',
			strokeWidth: 2,
			strokeStyle: 'solid',
			roughness: 0,
			opacity: 100,
			groupIds: [],
			frameId: null,
			roundness: null,
			seed: this.generateSeed(),
			version: 1,
			versionNonce: this.generateSeed(),
			isDeleted: false,
			boundElements: null,
			updated: Date.now(),
			link: null,
			locked: false,
			text,
			rawText: text,
			fontSize,
			fontFamily: 1, // Virgil (hand-drawn style)
			textAlign: 'center',
			verticalAlign: 'middle',
			baseline: fontSize,
			containerId,
			originalText: text,
			autoResize: true,
			lineHeight: 1.25
		};
	}

	/**
	 * Create Excalidraw arrow element
	 */
	private createArrow(
		id: string,
		fromNode: CanvasNode,
		toNode: CanvasNode,
		fromExcalidrawId: string,
		toExcalidrawId: string,
		color: string,
		strokeWidth: number,
		offsetX: number,
		offsetY: number,
		label?: string
	): ExcalidrawArrow {
		// Calculate arrow start and end points (with coordinate offset applied)
		const startX = fromNode.x + offsetX + fromNode.width / 2;
		const startY = fromNode.y + offsetY + fromNode.height / 2;
		const endX = toNode.x + offsetX + toNode.width / 2;
		const endY = toNode.y + offsetY + toNode.height / 2;

		// Arrow points are relative to start position
		const points: [number, number][] = [
			[0, 0],
			[endX - startX, endY - startY]
		];

		return {
			id,
			type: 'arrow',
			x: startX,
			y: startY,
			width: Math.abs(endX - startX),
			height: Math.abs(endY - startY),
			angle: 0,
			strokeColor: color,
			backgroundColor: 'transparent',
			fillStyle: 'solid',
			strokeWidth,
			strokeStyle: 'solid',
			roughness: 1,
			opacity: 100,
			groupIds: [],
			frameId: null,
			roundness: { type: 2 },
			seed: this.generateSeed(),
			version: 1,
			versionNonce: this.generateSeed(),
			isDeleted: false,
			boundElements: null,
			updated: Date.now(),
			link: null,
			locked: false,
			points,
			lastCommittedPoint: null,
			startBinding: {
				elementId: fromExcalidrawId,
				focus: 0,
				gap: 10
			},
			endBinding: {
				elementId: toExcalidrawId,
				focus: 0,
				gap: 10
			},
			startArrowhead: null,
			endArrowhead: 'arrow',
			elbowed: false
		};
	}

	/**
	 * Extract label text from canvas node
	 */
	private extractNodeLabel(node: CanvasNode): string {
		if (node.type === 'file' && node.file) {
			// Extract filename without extension and path
			const match = node.file.match(/([^/]+)\.(md|markdown)$/);
			return match ? match[1] : node.file;
		} else if (node.type === 'text' && node.text) {
			// Use first line of text
			const firstLine = node.text.split('\n')[0];
			return firstLine.substring(0, 50); // Limit length
		}
		return '';
	}

	/**
	 * Build Excalidraw markdown content (Obsidian Excalidraw plugin format)
	 */
	private buildExcalidrawMarkdown(excalidrawData: ExcalidrawFile): string {
		const lines: string[] = [];

		// Frontmatter
		lines.push('---');
		lines.push('');
		lines.push('excalidraw-plugin: parsed');
		lines.push('tags:');
		lines.push('  - excalidraw');
		lines.push('  - family-tree');
		lines.push('');
		lines.push('---');
		lines.push('');

		// Excalidraw data marker
		lines.push('==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==');
		lines.push('');
		lines.push('');
		lines.push('# Excalidraw Data');
		lines.push('## Text Elements');
		lines.push('');

		// Add text elements section (for search/indexing)
		// Each text element needs a block reference ID that matches its element ID
		for (const element of excalidrawData.elements) {
			if (element.type === 'text') {
				// Format: "Text content ^elementID"
				// The elementID is used by Excalidraw to link the text list to the drawing
				lines.push(`${element.text} ^${element.id}`);
				lines.push('');
			}
		}

		lines.push('%%');
		lines.push('# Drawing');
		lines.push('```json');
		try {
			lines.push(JSON.stringify(excalidrawData, null, 2));
		} catch (e) {
			logger.error('export', 'Failed to stringify excalidrawData (formatted)', e);
			throw new Error(`JSON stringify failed (formatted): ${e.message}`);
		}
		lines.push('```');
		lines.push('%%');

		return lines.join('\n');
	}

	/**
	 * Generate unique Excalidraw element ID
	 */
	private generateId(): string {
		this.idCounter++;
		return `canvas-roots-${Date.now()}-${this.idCounter}`;
	}

	/**
	 * Generate random seed for Excalidraw roughness
	 */
	private generateSeed(): number {
		return Math.floor(Math.random() * 1000000);
	}
}
