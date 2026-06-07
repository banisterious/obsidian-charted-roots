/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Family Chart Export Functions
 *
 * Standalone export functions extracted from FamilyChartView.
 * All functions accept a FamilyChartExportContext that provides access
 * to the view's state needed for export operations.
 */

import { Notice, Menu } from 'obsidian';
import { jsPDF } from 'jspdf';

/**
 * Type for the vfs_fonts module with multiple possible export shapes.
 * Different bundler configurations export the vfs differently.
 * Uses index signature to allow font file property access.
 */
interface VfsFontsModule {
	pdfMake?: { vfs: Record<string, string> };
	default?: {
		pdfMake?: { vfs: Record<string, string> };
		vfs?: Record<string, string>;
		[fontFile: string]: unknown;
	};
	vfs?: Record<string, string>;
	[fontFile: string]: unknown;
}

import type { ProgressCallback } from './family-chart-export-progress-modal';
import { generateOdt } from './odt-generator';
import { getLogger } from '../../core/logging';

const logger = getLogger('FamilyChartExport');

/**
 * Context interface providing access to view state needed by export functions.
 * Implemented by FamilyChartView via getExportContext().
 */
export interface FamilyChartExportContext {
	/** The family-chart instance's SVG element */
	getChartSvg(): SVGSVGElement | null;
	/** The chart container element (for HTML card export) */
	chartContainerEl: HTMLElement | null;
	/** Current card style */
	cardStyle: string;
	/** Chart data (person records) */
	chartData: Array<{
		id: string;
		data: {
			'first name': string;
			'last name': string;
			avatar?: string;
			[key: string]: unknown;
		};
		rels: { parents: string[]; spouses: string[]; children: string[] };
		[key: string]: unknown;
	}>;
	/** Root person ID */
	rootPersonId: string | null;
	/** Export filename pattern from settings */
	exportFilenamePattern: string;
	/** Ancestry depth (for warning messages) */
	ancestryDepth: number | null;
	/** Progeny depth (for warning messages) */
	progenyDepth: number | null;
}

/**
 * PDF page size definitions (in points, 72 points = 1 inch)
 */
export const PDF_PAGE_SIZES: Record<string, { width: number; height: number; label: string } | null> = {
	fit: null, // Dynamic sizing to match content
	a4: { width: 595, height: 842, label: 'A4' },
	letter: { width: 612, height: 792, label: 'Letter' },
	legal: { width: 612, height: 1008, label: 'Legal' },
	tabloid: { width: 792, height: 1224, label: 'Tabloid' }
};

/**
 * Export chart with options from the wizard
 */
export async function exportWithOptions(
	ctx: FamilyChartExportContext,
	options: {
		format: 'png' | 'svg' | 'pdf' | 'odt';
		filename: string;
		includeAvatars: boolean;
		scale?: number;
		// PDF/ODT-specific options
		pageSize?: 'fit' | 'a4' | 'letter' | 'legal' | 'tabloid';
		layout?: 'single' | 'tiled';
		orientation?: 'auto' | 'portrait' | 'landscape';
		includeCoverPage?: boolean;
		coverTitle?: string;
		coverSubtitle?: string;
		// Progress tracking
		onProgress?: ProgressCallback;
		isCancelled?: () => boolean;
	}
): Promise<void> {
	const { format, filename, includeAvatars, scale, onProgress, isCancelled } = options;

	switch (format) {
		case 'png':
			await exportAsPngWithOptions(ctx, filename, includeAvatars, scale ?? 2, onProgress, isCancelled);
			break;
		case 'svg':
			await exportAsSvgWithOptions(ctx, filename, includeAvatars, onProgress, isCancelled);
			break;
		case 'pdf':
			await exportAsPdfWithOptions(ctx, filename, includeAvatars, scale ?? 2, {
				pageSize: options.pageSize ?? 'fit',
				layout: options.layout ?? 'single',
				orientation: options.orientation ?? 'auto',
				includeCoverPage: options.includeCoverPage ?? false,
				coverTitle: options.coverTitle ?? '',
				coverSubtitle: options.coverSubtitle ?? ''
			}, onProgress, isCancelled);
			break;
		case 'odt':
			await exportAsOdtWithOptions(ctx, filename, includeAvatars, scale ?? 2, {
				includeCoverPage: options.includeCoverPage ?? false,
				coverTitle: options.coverTitle ?? '',
				coverSubtitle: options.coverSubtitle ?? ''
			}, onProgress, isCancelled);
			break;
	}
}

/**
 * Export as PNG with options
 */
async function exportAsPngWithOptions(
	ctx: FamilyChartExportContext,
	filename: string,
	includeAvatars: boolean,
	scale: number,
	onProgress?: ProgressCallback,
	isCancelled?: () => boolean
): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		onProgress?.({ phase: 'preparing', current: 0, total: 100, message: 'Preparing chart...' });

		const { svgClone, width, height } = prepareSvgForExport(ctx, svg);

		logger.debug('export-png', 'Preparing PNG export', { width, height, scale, includeAvatars });

		// Check for canvas size limits
		const maxDimension = 16384;
		const maxArea = 268435456;
		const scaledWidth = width * scale;
		const scaledHeight = height * scale;
		const scaledArea = scaledWidth * scaledHeight;

		if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
			new Notice(`Chart too large for PNG export (${Math.round(width)}x${Math.round(height)}px). Try SVG export instead.`, 0);
			return;
		}

		if (scaledArea > maxArea) {
			new Notice(`Chart too large for PNG export (${Math.round(scaledArea / 1000000)}M pixels). Try SVG export instead.`, 0);
			return;
		}

		// Check for cancellation
		if (isCancelled?.()) return;

		// Handle avatars based on option
		if (includeAvatars) {
			await embedImagesAsBase64WithProgress(svgClone, onProgress, isCancelled);
			if (isCancelled?.()) return;
		} else {
			removeAppImages(svgClone);
		}

		onProgress?.({ phase: 'rendering', current: 0, total: 100, message: 'Rendering image...' });

		// Serialize SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		// Create canvas and draw SVG
		const canvas = activeDocument.createElement('canvas');
		canvas.width = scaledWidth;
		canvas.height = scaledHeight;
		const ctxCanvas = canvas.getContext('2d');
		if (!ctxCanvas) {
			new Notice('Failed to create canvas context');
			return;
		}

		const img = new Image();
		img.onload = () => {
			ctxCanvas.scale(scale, scale);
			ctxCanvas.drawImage(img, 0, 0);
			URL.revokeObjectURL(svgUrl);

			onProgress?.({ phase: 'encoding', current: 0, total: 100, message: 'Creating PNG...' });

			canvas.toBlob((blob) => {
				if (blob) {
					onProgress?.({ phase: 'saving', current: 0, total: 100, message: 'Saving file...' });
					const url = URL.createObjectURL(blob);
					const link = activeDocument.createElement('a');
					link.href = url;
					link.download = filename;
					link.click();
					URL.revokeObjectURL(url);
					onProgress?.({ phase: 'complete', current: 100, total: 100, message: 'Done!' });
					new Notice('PNG exported successfully');
				} else {
					new Notice('Failed to create PNG image');
				}
			}, 'image/png');
		};
		img.onerror = () => {
			URL.revokeObjectURL(svgUrl);
			new Notice('Failed to render chart as PNG. Try SVG export instead.');
		};
		img.src = svgUrl;

	} catch (error) {
		logger.error('export-png', 'Failed to export PNG', { error });
		new Notice('Failed to export PNG');
	}
}

/**
 * Export as SVG with options
 */
async function exportAsSvgWithOptions(
	ctx: FamilyChartExportContext,
	filename: string,
	includeAvatars: boolean,
	onProgress?: ProgressCallback,
	isCancelled?: () => boolean
): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		onProgress?.({ phase: 'preparing', current: 0, total: 100, message: 'Preparing chart...' });

		const { svgClone } = prepareSvgForExport(ctx, svg);

		// Check for cancellation
		if (isCancelled?.()) return;

		// Handle avatars based on option
		if (includeAvatars) {
			await embedImagesAsBase64WithProgress(svgClone, onProgress, isCancelled);
			if (isCancelled?.()) return;
		} else {
			removeAppImages(svgClone);
		}

		onProgress?.({ phase: 'saving', current: 0, total: 100, message: 'Saving file...' });

		// Serialize and download
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = activeDocument.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);

		onProgress?.({ phase: 'complete', current: 100, total: 100, message: 'Done!' });
		new Notice('SVG exported successfully');

	} catch (error) {
		logger.error('export-svg', 'Failed to export SVG', { error });
		new Notice('Failed to export SVG');
	}
}

/**
 * Export as PDF with options
 */
async function exportAsPdfWithOptions(
	ctx: FamilyChartExportContext,
	filename: string,
	includeAvatars: boolean,
	scale: number,
	pdfOptions: {
		pageSize: 'fit' | 'a4' | 'letter' | 'legal' | 'tabloid';
		layout: 'single' | 'tiled';
		orientation: 'auto' | 'portrait' | 'landscape';
		includeCoverPage: boolean;
		coverTitle: string;
		coverSubtitle: string;
	},
	onProgress?: ProgressCallback,
	isCancelled?: () => boolean
): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		onProgress?.({ phase: 'preparing', current: 0, total: 100, message: 'Preparing chart...' });

		const { svgClone, width, height } = prepareSvgForExport(ctx, svg);

		logger.debug('export-pdf', 'Preparing PDF export', {
			width, height, scale, includeAvatars, pdfOptions
		});

		// Check for canvas size limits
		const maxDimension = 16384;
		const maxArea = 268435456;
		const scaledWidth = width * scale;
		const scaledHeight = height * scale;
		const scaledArea = scaledWidth * scaledHeight;

		if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
			new Notice(`Chart too large for PDF export (${Math.round(width)}x${Math.round(height)}px). Try SVG export instead.`, 0);
			return;
		}

		if (scaledArea > maxArea) {
			new Notice(`Chart too large for PDF export (${Math.round(scaledArea / 1000000)}M pixels). Try SVG export instead.`, 0);
			return;
		}

		// Check for cancellation
		if (isCancelled?.()) return;

		// Handle avatars based on option
		if (includeAvatars) {
			await embedImagesAsBase64WithProgress(svgClone, onProgress, isCancelled);
			if (isCancelled?.()) return;
		} else {
			removeAppImages(svgClone);
		}

		// Load Roboto fonts from pdfmake VFS for visual consistency with report PDFs
		const robotoFonts = await loadRobotoFonts();

		// Serialize SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		onProgress?.({ phase: 'rendering', current: 0, total: 100, message: 'Rendering image...' });

		// Create canvas
		const canvas = activeDocument.createElement('canvas');
		canvas.width = scaledWidth;
		canvas.height = scaledHeight;
		const ctxCanvas = canvas.getContext('2d');
		if (!ctxCanvas) {
			new Notice('Failed to create canvas context');
			return;
		}

		const img = new Image();
		img.onload = () => {
			ctxCanvas.scale(scale, scale);
			ctxCanvas.drawImage(img, 0, 0);
			URL.revokeObjectURL(svgUrl);

			onProgress?.({ phase: 'encoding', current: 0, total: 100, message: 'Creating PDF...' });

			// Determine PDF dimensions and orientation
			const pageSpec = PDF_PAGE_SIZES[pdfOptions.pageSize];

			let pdfOrientation: 'portrait' | 'landscape';
			let pdfFormat: [number, number] | string;

			if (pageSpec === null) {
				// "Fit to content" mode - use chart dimensions
				pdfOrientation = width > height ? 'landscape' : 'portrait';
				pdfFormat = [width, height];
			} else {
				// Fixed page size
				if (pdfOptions.orientation === 'auto') {
					pdfOrientation = width > height ? 'landscape' : 'portrait';
				} else {
					pdfOrientation = pdfOptions.orientation;
				}

				// For fixed page sizes, we scale the chart to fit
				pdfFormat = pdfOptions.pageSize.toUpperCase();
			}

			// Create PDF
			const pdf = new jsPDF({
				orientation: pdfOrientation,
				unit: 'pt', // Use points for standard page sizes
				format: pdfFormat
			});

			// Register Roboto fonts if available
			const useRoboto = robotoFonts !== null;
			if (robotoFonts) {
				registerRobotoFonts(pdf, robotoFonts);
			}

			// Set document metadata
			pdf.setDocumentProperties({
				title: pdfOptions.coverTitle || filename.replace('.pdf', ''),
				subject: 'Family Tree Chart',
				author: 'Charted Roots - Obsidian Plugin',
				keywords: 'family tree, genealogy, chart',
				creator: 'Charted Roots'
			});

			// Track total pages for footer
			const totalPages = pdfOptions.includeCoverPage ? 2 : 1;
			let currentPage = 1;

			// Add cover page if requested
			// Note: Cover page has its own footer section with date, people count, and branding
			// so we don't add the standard footer (which would duplicate "Generated on")
			if (pdfOptions.includeCoverPage) {
				addPdfCoverPage(pdf, pdfOptions.coverTitle, pdfOptions.coverSubtitle, useRoboto, ctx.chartData.length);
				currentPage++;
				pdf.addPage(pdfFormat, pdfOrientation);
			}

			// Calculate image placement
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();
			const imgData = canvas.toDataURL('image/png');

			if (pageSpec === null) {
				// Fit to content - image fills the page
				pdf.addImage(imgData, 'PNG', 0, 0, width, height);
			} else {
				// Fixed page size - scale image to fit with padding
				const padding = 20; // points
				const footerHeight = 30; // Reserve space for footer
				const availableWidth = pdfWidth - (padding * 2);
				const availableHeight = pdfHeight - (padding * 2) - footerHeight;

				const chartAspect = width / height;
				const pageAspect = availableWidth / availableHeight;

				let imgWidth: number, imgHeight: number;
				if (chartAspect > pageAspect) {
					// Chart is wider - fit to width
					imgWidth = availableWidth;
					imgHeight = availableWidth / chartAspect;
				} else {
					// Chart is taller - fit to height
					imgHeight = availableHeight;
					imgWidth = availableHeight * chartAspect;
				}

				// Center the image (vertically adjusted for footer)
				const x = (pdfWidth - imgWidth) / 2;
				const y = (pdfHeight - imgHeight - footerHeight) / 2;

				pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
			}

			// Add footer to chart page
			addPdfFooter(pdf, currentPage, totalPages, useRoboto);

			onProgress?.({ phase: 'saving', current: 0, total: 100, message: 'Saving file...' });
			pdf.save(filename);
			onProgress?.({ phase: 'complete', current: 100, total: 100, message: 'Done!' });
			new Notice('PDF exported successfully');
		};
		img.onerror = () => {
			URL.revokeObjectURL(svgUrl);
			new Notice('Failed to render chart as PDF. Try SVG export instead.');
		};
		img.src = svgUrl;

	} catch (error) {
		logger.error('export-pdf', 'Failed to export PDF', { error });
		new Notice('Failed to export PDF');
	}
}

/**
 * Export as ODT with options
 */
async function exportAsOdtWithOptions(
	ctx: FamilyChartExportContext,
	filename: string,
	includeAvatars: boolean,
	scale: number,
	odtOptions: {
		includeCoverPage: boolean;
		coverTitle: string;
		coverSubtitle: string;
	},
	onProgress?: ProgressCallback,
	isCancelled?: () => boolean
): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		onProgress?.({ phase: 'preparing', current: 0, total: 100, message: 'Preparing chart...' });

		const { svgClone, width, height } = prepareSvgForExport(ctx, svg);

		logger.debug('export-odt', 'Preparing ODT export', {
			width, height, scale, includeAvatars, odtOptions
		});

		// Check for canvas size limits
		const maxDimension = 16384;
		const maxArea = 268435456;
		const scaledWidth = width * scale;
		const scaledHeight = height * scale;
		const scaledArea = scaledWidth * scaledHeight;

		if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
			new Notice(`Chart too large for ODT export (${Math.round(width)}x${Math.round(height)}px). Try SVG export instead.`, 0);
			return;
		}

		if (scaledArea > maxArea) {
			new Notice(`Chart too large for ODT export (${Math.round(scaledArea / 1000000)}M pixels). Try SVG export instead.`, 0);
			return;
		}

		// Check for cancellation
		if (isCancelled?.()) return;

		// Handle avatars based on option
		if (includeAvatars) {
			await embedImagesAsBase64WithProgress(svgClone, onProgress, isCancelled);
			if (isCancelled?.()) return;
		} else {
			removeAppImages(svgClone);
		}

		onProgress?.({ phase: 'rendering', current: 0, total: 100, message: 'Rendering image...' });

		// Serialize SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		// Create canvas
		const canvas = activeDocument.createElement('canvas');
		canvas.width = scaledWidth;
		canvas.height = scaledHeight;
		const ctxCanvas = canvas.getContext('2d');
		if (!ctxCanvas) {
			new Notice('Failed to create canvas context');
			return;
		}

		const img = new Image();
		img.onload = async () => {
			ctxCanvas.scale(scale, scale);
			ctxCanvas.drawImage(img, 0, 0);
			URL.revokeObjectURL(svgUrl);

			onProgress?.({ phase: 'encoding', current: 0, total: 100, message: 'Creating ODT...' });

			// Get PNG data from canvas
			const pngDataUrl = canvas.toDataURL('image/png');

			// Get export info for cover page
			const exportInfo = getExportInfo(ctx);

			// Generate ODT using the odt-generator module
			const odtBlob = await generateOdt({
				title: odtOptions.coverTitle || `${exportInfo.rootPersonName} Family Tree`,
				chartImageData: pngDataUrl,
				chartWidth: scaledWidth,
				chartHeight: scaledHeight,
				includeCoverPage: odtOptions.includeCoverPage,
				coverTitle: odtOptions.coverTitle,
				coverSubtitle: odtOptions.coverSubtitle,
				peopleCount: exportInfo.peopleCount,
				rootPersonName: exportInfo.rootPersonName
			});

			onProgress?.({ phase: 'saving', current: 0, total: 100, message: 'Saving file...' });

			// Download the ODT file
			const url = URL.createObjectURL(odtBlob);
			const link = activeDocument.createElement('a');
			link.href = url;
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);

			onProgress?.({ phase: 'complete', current: 100, total: 100, message: 'Done!' });
			new Notice('ODT exported successfully');
		};
		img.onerror = () => {
			URL.revokeObjectURL(svgUrl);
			new Notice('Failed to render chart as ODT. Try SVG export instead.');
		};
		img.src = svgUrl;

	} catch (error) {
		logger.error('export-odt', 'Failed to export ODT', { error });
		new Notice('Failed to export ODT');
	}
}

/**
 * Load Roboto fonts from pdfmake's VFS for use in jsPDF
 * This provides visual consistency with report PDFs which use pdfmake
 */
async function loadRobotoFonts(): Promise<Record<string, string> | null> {
	try {
		const vfsFonts = await import('pdfmake/build/vfs_fonts');
		const vfsModule = vfsFonts as VfsFontsModule;

		// Debug: log the actual structure we're getting
		logger.debug('pdf-fonts', 'VFS module structure', {
			topLevelKeys: Object.keys(vfsModule),
			hasPdfMake: !!vfsModule.pdfMake,
			hasDefault: !!vfsModule.default,
			hasVfs: !!vfsModule.vfs,
			defaultKeys: vfsModule.default ? Object.keys(vfsModule.default) : []
		});

		// Try multiple possible structures based on bundler behavior
		let vfs: Record<string, string> | null = null;

		// Structure 1: Direct pdfMake.vfs
		if (vfsModule.pdfMake?.vfs) {
			vfs = vfsModule.pdfMake.vfs;
			logger.debug('pdf-fonts', 'Found VFS at pdfMake.vfs');
		}
		// Structure 2: default.pdfMake.vfs
		else if (vfsModule.default?.pdfMake?.vfs) {
			vfs = vfsModule.default.pdfMake.vfs;
			logger.debug('pdf-fonts', 'Found VFS at default.pdfMake.vfs');
		}
		// Structure 3: Direct vfs property
		else if (vfsModule.vfs) {
			vfs = vfsModule.vfs;
			logger.debug('pdf-fonts', 'Found VFS at vfs');
		}
		// Structure 4: default.vfs
		else if (vfsModule.default?.vfs) {
			vfs = vfsModule.default.vfs;
			logger.debug('pdf-fonts', 'Found VFS at default.vfs');
		}
		// Structure 5: The module itself might be the vfs object (check for Roboto keys)
		else if (vfsModule['Roboto-Regular.ttf']) {
			vfs = vfsModule as unknown as Record<string, string>;
			logger.debug('pdf-fonts', 'Module itself is the VFS');
		}
		// Structure 6: default is the vfs object
		else if (vfsModule.default?.['Roboto-Regular.ttf']) {
			vfs = vfsModule.default as unknown as Record<string, string>;
			logger.debug('pdf-fonts', 'default is the VFS');
		}

		if (!vfs) {
			logger.warn('pdf-fonts', 'Could not locate VFS in module structure');
			return null;
		}

		// Debug: log available font keys
		const fontKeys = Object.keys(vfs).filter(k => k.includes('Roboto'));
		logger.debug('pdf-fonts', 'Available Roboto fonts in VFS', { fontKeys });

		const regular = vfs['Roboto-Regular.ttf'];
		const medium = vfs['Roboto-Medium.ttf'];
		const italic = vfs['Roboto-Italic.ttf'];
		const mediumItalic = vfs['Roboto-MediumItalic.ttf'];

		// Verify fonts were found
		if (!regular || !medium) {
			logger.warn('pdf-fonts', 'Roboto fonts not found in VFS', {
				hasRegular: !!regular,
				hasMedium: !!medium,
				hasItalic: !!italic,
				hasMediumItalic: !!mediumItalic
			});
			return null;
		}

		logger.debug('pdf-fonts', 'Successfully loaded Roboto fonts from pdfmake VFS');

		return {
			regular: regular,
			medium: medium,
			italic: italic ?? regular, // Fallback to regular if italic missing
			mediumItalic: mediumItalic ?? medium // Fallback to medium if mediumItalic missing
		};
	} catch (error) {
		logger.warn('pdf-fonts', 'Failed to load Roboto fonts, falling back to Helvetica', { error });
		return null;
	}
}

/**
 * Register Roboto fonts with jsPDF instance
 */
function registerRobotoFonts(pdf: jsPDF, fonts: Record<string, string>): void {
	try {
		// Add font files to jsPDF's virtual file system
		pdf.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
		pdf.addFileToVFS('Roboto-Medium.ttf', fonts.medium);
		pdf.addFileToVFS('Roboto-Italic.ttf', fonts.italic);
		pdf.addFileToVFS('Roboto-MediumItalic.ttf', fonts.mediumItalic);

		// Register the fonts with jsPDF
		pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
		pdf.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
		pdf.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');
		pdf.addFont('Roboto-MediumItalic.ttf', 'Roboto', 'bolditalic');

		logger.debug('pdf-fonts', 'Roboto fonts registered with jsPDF');
	} catch (error) {
		logger.error('pdf-fonts', 'Failed to register Roboto fonts with jsPDF', { error });
		throw error;
	}
}

/**
 * Add a styled cover page to the PDF
 * Design matches the report PDF cover page style from pdf-report-renderer.ts
 * Uses Roboto font for visual consistency with report PDFs
 */
function addPdfCoverPage(pdf: jsPDF, title: string, subtitle: string, useRoboto: boolean, peopleCount: number): void {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();

	// Font family - use Roboto if loaded, otherwise fall back to Helvetica
	const fontFamily = useRoboto ? 'Roboto' : 'helvetica';

	// Vertical position for title (about 42% from top - better visual balance)
	const titleY = pageHeight * 0.42;

	// Title - centered, large font (28pt in reports, same here for consistency)
	pdf.setFontSize(28);
	pdf.setFont(fontFamily, 'bold');
	pdf.setTextColor(51, 51, 51); // #333333 - primary text color
	pdf.text(title, pageWidth / 2, titleY, { align: 'center' });

	// Subtitle if provided (italics, secondary color)
	if (subtitle) {
		const subtitleY = titleY + 28;
		pdf.setFontSize(16);
		pdf.setFont(fontFamily, 'italic');
		pdf.setTextColor(102, 102, 102); // #666666 - secondary text color
		pdf.text(subtitle, pageWidth / 2, subtitleY, { align: 'center' });
	}

	// Generation info near bottom (compact layout)
	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const footerY = pageHeight - 55;

	// "Generated on" date
	pdf.setFontSize(10);
	pdf.setFont(fontFamily, 'normal');
	pdf.setTextColor(128, 128, 128); // #808080 - muted text
	pdf.text(`Generated on ${dateStr}`, pageWidth / 2, footerY, { align: 'center' });

	// People count
	pdf.text(`${peopleCount} people`, pageWidth / 2, footerY + 14, { align: 'center' });

	// "Charted Roots for Obsidian" branding
	pdf.setFontSize(9);
	pdf.setTextColor(170, 170, 170); // #aaaaaa - light muted
	pdf.text('Charted Roots for Obsidian', pageWidth / 2, footerY + 26, { align: 'center' });

	// Reset text color for subsequent pages
	pdf.setTextColor(0, 0, 0);
}

/**
 * Add a footer to the current page
 * Design matches the report PDF footer style from pdf-report-renderer.ts
 * Page numbers only shown for multi-page documents (2+ pages)
 * Uses Roboto font for visual consistency with report PDFs
 */
function addPdfFooter(pdf: jsPDF, currentPage: number, totalPages: number, useRoboto: boolean): void {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();

	// Font family - use Roboto if loaded, otherwise fall back to Helvetica
	const fontFamily = useRoboto ? 'Roboto' : 'helvetica';

	// Format date like reports
	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	// Footer Y position (near bottom with margin)
	const footerY = pageHeight - 20;
	const margin = 40;

	pdf.setFontSize(9);
	pdf.setFont(fontFamily, 'normal');
	pdf.setTextColor(128, 128, 128); // Muted gray

	// Left side: Generated date
	pdf.text(`Generated: ${dateStr}`, margin, footerY, { align: 'left' });

	// Right side: Page X of Y (only for multi-page documents)
	if (totalPages > 1) {
		pdf.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
	}

	// Reset text color
	pdf.setTextColor(0, 0, 0);
}

/**
 * Show export menu with PNG and SVG options
 * @deprecated Use openExportWizard() instead - kept for potential fallback
 */
export function showExportMenu(ctx: FamilyChartExportContext, e: MouseEvent): void {
	const menu = new Menu();

	menu.addItem((item) => {
		item.setTitle('Export as PNG')
			.setIcon('image')
			.onClick(() => void exportAsPng(ctx));
	});

	menu.addItem((item) => {
		item.setTitle('Export as SVG')
			.setIcon('file-code')
			.onClick(() => void exportAsSvg(ctx, true));
	});

	menu.addItem((item) => {
		item.setTitle('Export as SVG (no avatars)')
			.setIcon('file-code')
			.onClick(() => void exportAsSvg(ctx, false));
	});

	menu.addItem((item) => {
		item.setTitle('Export as PDF')
			.setIcon('file-text')
			.onClick(() => void exportAsPdf(ctx));
	});

	menu.showAtMouseEvent(e);
}

/**
 * Generate export filename from pattern
 * Replaces {name} with root person's name and {date} with current date
 */
export function generateExportFilename(ctx: FamilyChartExportContext, extension: string): string {
	const pattern = ctx.exportFilenamePattern || '{name}-family-chart-{date}';

	// Get root person's name
	let personName = 'unknown';
	if (ctx.rootPersonId && ctx.chartData.length > 0) {
		const rootPerson = ctx.chartData.find(p => p.id === ctx.rootPersonId);
		if (rootPerson) {
			const firstName = rootPerson.data['first name'] || '';
			const lastName = rootPerson.data['last name'] || '';
			personName = `${firstName} ${lastName}`.trim() || 'unknown';
		}
	}

	// Sanitize name for filename (remove characters invalid in filenames)
	const sanitizedName = personName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-');

	// Format date as YYYY-MM-DD
	const date = new Date().toISOString().split('T')[0];

	// Replace placeholders
	const filename = pattern
		.replace(/{name}/g, sanitizedName)
		.replace(/{date}/g, date);

	return `${filename}.${extension}`;
}

/**
 * Export the chart as PNG
 */
export async function exportAsPng(ctx: FamilyChartExportContext): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		// Prepare SVG for export using shared helper
		const { svgClone, width, height } = prepareSvgForExport(ctx, svg);

		logger.debug('export-png', 'Preparing PNG export', { width, height, area: width * height });

		// Check for canvas size limits (browsers typically cap at ~16384px or ~268 million pixels)
		const maxDimension = 16384;
		const maxArea = 268435456; // 2^28 pixels
		const scaledWidth = width * 2;
		const scaledHeight = height * 2;
		const scaledArea = scaledWidth * scaledHeight;

		if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
			logger.warn('export-png', 'Canvas dimensions exceed browser limits', { scaledWidth, scaledHeight, maxDimension });
			new Notice(`Chart too large for PNG export (${Math.round(width)}x${Math.round(height)}px). Try SVG export instead.`, 0);
			return;
		}

		if (scaledArea > maxArea) {
			logger.warn('export-png', 'Canvas area exceeds browser limits', { scaledArea, maxArea });
			new Notice(`Chart too large for PNG export (${Math.round(scaledArea / 1000000)}M pixels). Try SVG export instead.`, 0);
			return;
		}

		// Embed avatar images as base64 for export
		await embedImagesAsBase64(svgClone);

		// Serialize SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		logger.debug('export-png', 'SVG serialized', { svgStringLength: svgString.length });

		// Create canvas and draw SVG
		const canvas = activeDocument.createElement('canvas');
		canvas.width = scaledWidth;
		canvas.height = scaledHeight;
		const ctxCanvas = canvas.getContext('2d');
		if (!ctxCanvas) {
			new Notice('Failed to create canvas context');
			return;
		}

		// Generate filename before the async callback
		const filename = generateExportFilename(ctx, 'png');

		const img = new Image();
		img.onload = () => {
			logger.debug('export-png', 'Image loaded, drawing to canvas');
			ctxCanvas.scale(2, 2);
			ctxCanvas.drawImage(img, 0, 0);
			URL.revokeObjectURL(svgUrl);

			// Download PNG
			canvas.toBlob((blob) => {
				if (blob) {
					logger.debug('export-png', 'Blob created', { size: blob.size });
					const url = URL.createObjectURL(blob);
					const link = activeDocument.createElement('a');
					link.href = url;
					link.download = filename;
					link.click();
					URL.revokeObjectURL(url);
					new Notice('PNG exported successfully');
				} else {
					logger.error('export-png', 'Failed to create blob from canvas');
					new Notice('Failed to create PNG image');
				}
			}, 'image/png');
		};
		img.onerror = (e) => {
			URL.revokeObjectURL(svgUrl);
			logger.error('export-png', 'Failed to load SVG as image', { error: e });
			new Notice('Failed to render chart as PNG. Try SVG export instead.');
		};
		img.src = svgUrl;

	} catch (error) {
		logger.error('export-png', 'Failed to export PNG', { error });
		new Notice('Failed to export PNG');
	}
}

/**
 * Prepare SVG for export by handling transforms and styling
 * Family-chart uses CSS transforms on .view group for pan/zoom, which must be
 * converted to a proper viewBox for standalone SVG export
 */
export function prepareSvgForExport(ctx: FamilyChartExportContext, svg: SVGSVGElement): { svgClone: SVGSVGElement; width: number; height: number } {
	// Get bounds from the view group which contains all content
	// Use getBBox on the cards_view and links_view to get untransformed bounds
	const cardsView = svg.querySelector('.cards_view') as SVGGElement;
	const linksView = svg.querySelector('.links_view') as SVGGElement;

	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

	// Get the bounding box of cards view (in its local coordinate system)
	if (cardsView) {
		try {
			const cardsBBox = cardsView.getBBox();
			minX = Math.min(minX, cardsBBox.x);
			minY = Math.min(minY, cardsBBox.y);
			maxX = Math.max(maxX, cardsBBox.x + cardsBBox.width);
			maxY = Math.max(maxY, cardsBBox.y + cardsBBox.height);
		} catch {
			// getBBox can throw if element is not rendered
		}
	}

	// Get the bounding box of links view
	if (linksView) {
		try {
			const linksBBox = linksView.getBBox();
			minX = Math.min(minX, linksBBox.x);
			minY = Math.min(minY, linksBBox.y);
			maxX = Math.max(maxX, linksBBox.x + linksBBox.width);
			maxY = Math.max(maxY, linksBBox.y + linksBBox.height);
		} catch {
			// getBBox can throw if element is not rendered
		}
	}

	// For circle style, calculate bounds from HTML cards since SVG cards_view is empty
	if (ctx.cardStyle === 'circle') {
		const htmlCardsView = ctx.chartContainerEl?.querySelector('#htmlSvg .cards_view');
		if (htmlCardsView) {
			const cardConts = htmlCardsView.querySelectorAll('.card_cont');
			cardConts.forEach((cardCont: Element) => {
				const style = cardCont.getAttribute('style') || '';
				const transformMatch = style.match(/transform:\s*translate\(([^)]+)\)/);
				if (transformMatch) {
					const [xStr, yStr] = transformMatch[1].split(',').map((s: string) => s.trim());
					const x = parseFloat(xStr);
					const y = parseFloat(yStr);
					if (!isNaN(x) && !isNaN(y)) {
						// Circle cards are ~90px diameter + label below
						minX = Math.min(minX, x - 60);
						minY = Math.min(minY, y - 60);
						maxX = Math.max(maxX, x + 60);
						maxY = Math.max(maxY, y + 80); // Extra for label
					}
				}
			});
		}
	}

	// Fallback if bounds couldn't be calculated
	if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
		const rect = svg.getBoundingClientRect();
		minX = 0;
		minY = 0;
		maxX = rect.width || 800;
		maxY = rect.height || 600;
	}

	// Add padding
	const padding = 50;
	minX -= padding;
	minY -= padding;
	maxX += padding;
	maxY += padding;

	// Calculate dimensions
	const width = maxX - minX;
	const height = maxY - minY;

	// Clone SVG
	const svgClone = svg.cloneNode(true) as SVGSVGElement;
	svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	svgClone.setAttribute('width', String(width));
	svgClone.setAttribute('height', String(height));
	svgClone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);

	// Reset the transform on the view group since we're using viewBox
	const viewGroup = svgClone.querySelector('.view') as SVGGElement;
	if (viewGroup) {
		viewGroup.removeAttribute('style');
		viewGroup.setAttribute('transform', '');
	}

	// Theme colors
	const isDark = activeDocument.body.classList.contains('theme-dark');
	const textColor = isDark ? '#ffffff' : '#333333';
	const bgColor = isDark ? 'rgb(33, 33, 33)' : 'rgb(250, 250, 250)';
	const femaleColor = 'rgba(154, 89, 113, 1)';
	const maleColor = 'rgba(69, 123, 141, 1)';
	const nonbinaryColor = 'rgba(180, 150, 60, 1)';
	const genderlessColor = 'rgb(59, 85, 96)';
	// Focus (root person) outline: a contrasty accent independent of the text
	// colour, so it stays visible against every card fill (#689).
	const focusOutlineColor = '#8b5cf6';

	// Embed CSS styles directly in the SVG for standalone rendering
	const styleEl = createSvg('style');
	styleEl.textContent = `
		text, tspan {
			fill: ${textColor};
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			font-size: 14px;
		}
		.card-body-rect { fill: ${bgColor}; }
		.card-female .card-body-rect { fill: ${femaleColor}; }
		.card-male .card-body-rect { fill: ${maleColor}; }
		.card-nonbinary .card-body-rect { fill: ${nonbinaryColor}; }
		.card-genderless .card-body-rect { fill: ${genderlessColor}; }
		.link { stroke: ${textColor}; stroke-width: 2px; fill: none; }
		.card-main-outline { stroke: ${focusOutlineColor}; stroke-width: 4px; }
	`;
	svgClone.insertBefore(styleEl, svgClone.firstChild);

	// Set fill on all text elements for maximum compatibility
	// Also remove any inline styles that might override our fill, and ensure visibility
	svgClone.querySelectorAll('text, tspan').forEach((el) => {
		el.setAttribute('fill', textColor);
		// Remove any inline style that might contain CSS variables or override fill
		const style = el.getAttribute('style');
		if (style) {
			// Remove fill, color, and any CSS variable references from inline style
			const cleanedStyle = style
				.replace(/fill:[^;]+;?/gi, '')
				.replace(/color:[^;]+;?/gi, '')
				.replace(/var\([^)]+\)/gi, textColor)
				.trim();
			if (cleanedStyle) {
				el.setAttribute('style', cleanedStyle);
			} else {
				el.removeAttribute('style');
			}
		}
		// Ensure text is visible
		el.setAttribute('opacity', '1');
		el.setAttribute('visibility', 'visible');
	});

	// Remove mask references (but keep clip-path for text clipping!)
	// The mask creates fade effect but doesn't export well; clip-path provides hard clipping
	svgClone.querySelectorAll('[mask]').forEach((el) => {
		el.removeAttribute('mask');
	});
	svgClone.querySelectorAll('[style*="mask"]').forEach((el) => {
		const style = el.getAttribute('style') || '';
		el.setAttribute('style', style.replace(/mask:[^;]+;?/g, ''));
	});

	// Remove text-overflow-mask elements - they cover the text when mask is removed
	// The clip-path on .card-text will still clip long text
	svgClone.querySelectorAll('.text-overflow-mask').forEach((el) => {
		el.remove();
	});

	// Replace CSS variables in Open note buttons with actual colors
	// These buttons use Obsidian CSS variables that won't work in standalone SVG
	const buttonBgColor = isDark ? 'rgb(30, 30, 30)' : 'rgb(255, 255, 255)';
	const buttonStrokeColor = isDark ? 'rgb(150, 150, 150)' : 'rgb(100, 100, 100)';

	svgClone.querySelectorAll('.cr-open-note-btn').forEach((btnGroup) => {
		// Fix circle background
		const circle = btnGroup.querySelector('circle');
		if (circle) {
			const fill = circle.getAttribute('fill');
			if (fill && fill.includes('var(')) {
				circle.setAttribute('fill', buttonBgColor);
			}
			const stroke = circle.getAttribute('stroke');
			if (stroke && stroke.includes('var(')) {
				circle.setAttribute('stroke', buttonStrokeColor);
			}
		}
		// Fix path (icon) stroke
		const path = btnGroup.querySelector('path');
		if (path) {
			const stroke = path.getAttribute('stroke');
			if (stroke && stroke.includes('var(')) {
				path.setAttribute('stroke', buttonStrokeColor);
			}
		}
	});

	// Embed HTML cards (circle style) as foreignObject elements for export
	if (ctx.cardStyle === 'circle') {
		embedHtmlCardsForExport(ctx, svgClone, isDark);
	}

	// Add background rect
	const bgRect = createSvg('rect');
	bgRect.setAttribute('x', String(minX));
	bgRect.setAttribute('y', String(minY));
	bgRect.setAttribute('width', String(width));
	bgRect.setAttribute('height', String(height));
	bgRect.setAttribute('fill', bgColor);
	svgClone.insertBefore(bgRect, svgClone.firstChild);

	return { svgClone, width, height };
}

/**
 * Embed HTML cards into SVG as native SVG elements for export
 * This is needed for circle card style which uses HTML rendering
 * We use native SVG (circle, image, text) instead of foreignObject to avoid
 * cross-origin/tainted canvas issues with app:// URLs
 */
function embedHtmlCardsForExport(ctx: FamilyChartExportContext, svgClone: SVGSVGElement, _isDark: boolean): void {
	const htmlSvg = ctx.chartContainerEl?.querySelector('#htmlSvg .cards_view');
	if (!htmlSvg) return;

	const cardConts = htmlSvg.querySelectorAll('.card_cont');
	if (cardConts.length === 0) return;

	// Find or create the view group to add SVG elements
	const viewGroup = svgClone.querySelector('.view');
	if (!viewGroup) return;

	// Theme colors
	const femaleColor = 'rgb(196, 138, 146)';
	const maleColor = 'rgb(120, 159, 172)';
	const nonbinaryColor = 'rgb(200, 175, 80)';
	const genderlessColor = 'rgb(140, 140, 140)';
	const labelBgColor = 'rgba(0, 0, 0, 0.6)';
	const textColor = '#fff';

	cardConts.forEach((cardCont: Element) => {
		// Get the transform from the card container (e.g., "translate(100px, 200px)")
		const style = cardCont.getAttribute('style') || '';
		const transformMatch = style.match(/transform:\s*translate\(([^)]+)\)/);
		if (!transformMatch) return;

		// Parse the translate values
		const translateStr = transformMatch[1];
		const [xStr, yStr] = translateStr.split(',').map((s: string) => s.trim());
		const x = parseFloat(xStr);
		const y = parseFloat(yStr);

		if (isNaN(x) || isNaN(y)) return;

		// Get the card element and its classes
		const card = cardCont.querySelector('.card');
		if (!card) return;

		const cardInner = card.querySelector('.card-image, .card-text');
		if (!cardInner) return;

		const isMale = cardInner.classList.contains('card-male');
		const isFemale = cardInner.classList.contains('card-female');
		const isNonbinary = cardInner.classList.contains('card-nonbinary');
		const isImage = cardInner.classList.contains('card-image');

		// Determine background color
		const bgColor = isFemale ? femaleColor : isMale ? maleColor : isNonbinary ? nonbinaryColor : genderlessColor;

		// Create a group for this card
		const cardGroup = createSvg('g');
		cardGroup.setAttribute('transform', `translate(${x}, ${y})`);

		if (isImage) {
			// Circle card with image
			const img = cardInner.querySelector('img');
			const label = cardInner.querySelector('.card-label');
			const imgSrc = img?.getAttribute('src') || '';
			const labelText = label?.textContent || '';

			const radius = 40; // Circle radius (90px diameter / 2 - padding)
			const cardPadding = 5;

			// Background circle
			const bgCircle = createSvg('circle');
			bgCircle.setAttribute('r', String(radius + cardPadding));
			bgCircle.setAttribute('fill', bgColor);
			cardGroup.appendChild(bgCircle);

			// Clip path for circular image
			const clipId = `circle-clip-${x}-${y}`.replace(/[.-]/g, '_');
			const defs = svgClone.querySelector('defs') || svgClone.insertBefore(
				createSvg('defs'),
				svgClone.firstChild
			);
			const clipPath = createSvg('clipPath');
			clipPath.setAttribute('id', clipId);
			const clipCircle = createSvg('circle');
			clipCircle.setAttribute('r', String(radius));
			clipPath.appendChild(clipCircle);
			defs.appendChild(clipPath);

			// Image element (will be converted to base64 by embedImagesAsBase64)
			const imageEl = createSvg('image');
			imageEl.setAttribute('href', imgSrc);
			imageEl.setAttribute('x', String(-radius));
			imageEl.setAttribute('y', String(-radius));
			imageEl.setAttribute('width', String(radius * 2));
			imageEl.setAttribute('height', String(radius * 2));
			imageEl.setAttribute('preserveAspectRatio', 'xMidYMid slice');
			imageEl.setAttribute('clip-path', `url(#${clipId})`);
			cardGroup.appendChild(imageEl);

			// Label background
			const labelWidth = Math.max(labelText.length * 7, 60);
			const labelRect = createSvg('rect');
			labelRect.setAttribute('x', String(-labelWidth / 2));
			labelRect.setAttribute('y', String(radius + cardPadding + 5));
			labelRect.setAttribute('width', String(labelWidth));
			labelRect.setAttribute('height', '22');
			labelRect.setAttribute('rx', '3');
			labelRect.setAttribute('fill', labelBgColor);
			cardGroup.appendChild(labelRect);

			// Label text
			const labelTextEl = createSvg('text');
			labelTextEl.setAttribute('x', '0');
			labelTextEl.setAttribute('y', String(radius + cardPadding + 18));
			labelTextEl.setAttribute('text-anchor', 'middle');
			labelTextEl.setAttribute('fill', textColor);
			labelTextEl.setAttribute('font-size', '12');
			labelTextEl.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
			labelTextEl.textContent = labelText;
			cardGroup.appendChild(labelTextEl);
		} else {
			// Text-only card (fallback)
			const labelText = cardInner.textContent || '';
			const cardWidth = 120;
			const cardHeight = 70;

			// Background rect
			const bgRectEl = createSvg('rect');
			bgRectEl.setAttribute('x', String(-cardWidth / 2));
			bgRectEl.setAttribute('y', String(-cardHeight / 2));
			bgRectEl.setAttribute('width', String(cardWidth));
			bgRectEl.setAttribute('height', String(cardHeight));
			bgRectEl.setAttribute('rx', '3');
			bgRectEl.setAttribute('fill', bgColor);
			cardGroup.appendChild(bgRectEl);

			// Text
			const textEl = createSvg('text');
			textEl.setAttribute('x', '0');
			textEl.setAttribute('y', '5');
			textEl.setAttribute('text-anchor', 'middle');
			textEl.setAttribute('fill', textColor);
			textEl.setAttribute('font-size', '14');
			textEl.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
			textEl.textContent = labelText;
			cardGroup.appendChild(textEl);
		}

		viewGroup.appendChild(cardGroup);
	});
}

/**
 * Convert image URLs in SVG to base64 data URIs for export
 * This is necessary because app:// URLs don't work outside Obsidian
 */
export async function embedImagesAsBase64(svgClone: SVGSVGElement): Promise<void> {
	const imageElements = svgClone.querySelectorAll('image[href]');

	// Filter to only app:// URLs that need conversion
	const imagesToConvert: { element: Element; href: string }[] = [];
	imageElements.forEach((imgEl) => {
		const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
		if (!href) return;
		// Only convert app:// URLs (Obsidian internal)
		if (!href.startsWith('app://')) return;
		imagesToConvert.push({ element: imgEl, href });
	});

	if (imagesToConvert.length === 0) return;

	const totalImages = imagesToConvert.length;

	// Warn user about large exports
	if (totalImages > 50) {
		new Notice(`Embedding ${totalImages} images... This may take a moment.`, 5000);
	}

	logger.debug('export', 'Embedding images as base64', { totalImages });

	// Process images ONE AT A TIME to prevent memory pressure
	// Each image creates temporary Image + Canvas objects that need GC
	for (let i = 0; i < totalImages; i++) {
		const { element, href } = imagesToConvert[i];

		try {
			const base64 = await convertImageToBase64(href);
			if (base64) {
				element.setAttribute('href', base64);
				// Also set xlink:href for older SVG viewers
				element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', base64);
			}
		} catch (error) {
			logger.warn('export', 'Failed to convert image to base64', { href, error });
		}

		// Yield after EVERY image for large exports to allow GC
		// Longer delay (50ms) gives browser time to reclaim memory
		await new Promise(resolve => window.setTimeout(resolve, totalImages > 50 ? 50 : 10));
	}
}

/**
 * Convert image URLs in SVG to base64 data URIs with progress reporting
 * Used by the export wizard to show progress during avatar embedding
 */
async function embedImagesAsBase64WithProgress(
	svgClone: SVGSVGElement,
	onProgress?: ProgressCallback,
	isCancelled?: () => boolean
): Promise<void> {
	const imageElements = svgClone.querySelectorAll('image[href]');

	// Filter to only app:// URLs that need conversion
	const imagesToConvert: { element: Element; href: string }[] = [];
	imageElements.forEach((imgEl) => {
		const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
		if (!href) return;
		// Only convert app:// URLs (Obsidian internal)
		if (!href.startsWith('app://')) return;
		imagesToConvert.push({ element: imgEl, href });
	});

	if (imagesToConvert.length === 0) return;

	const totalImages = imagesToConvert.length;

	logger.debug('export', 'Embedding images as base64 with progress', { totalImages });

	// Process images ONE AT A TIME to prevent memory pressure
	for (let i = 0; i < totalImages; i++) {
		// Check for cancellation
		if (isCancelled?.()) {
			logger.debug('export', 'Image embedding cancelled');
			return;
		}

		const { element, href } = imagesToConvert[i];

		// Report progress
		onProgress?.({
			phase: 'embedding',
			current: i + 1,
			total: totalImages,
			message: `Embedding avatar ${i + 1} of ${totalImages}...`
		});

		try {
			const base64 = await convertImageToBase64(href);
			if (base64) {
				element.setAttribute('href', base64);
				element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', base64);
			}
		} catch (error) {
			logger.warn('export', 'Failed to convert image to base64', { href, error });
		}

		// Yield after EVERY image for large exports to allow GC
		await new Promise(resolve => window.setTimeout(resolve, totalImages > 50 ? 50 : 10));
	}
}

/**
 * Convert an image URL to a base64 data URI
 * Downscales large images to reduce memory usage and base64 string size
 */
export async function convertImageToBase64(url: string, maxSize: number = 150): Promise<string | null> {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			try {
				// Downscale large images to reduce memory and base64 size
				// Avatars display at ~60-80px, so 150px is plenty
				let width = img.naturalWidth;
				let height = img.naturalHeight;

				if (width > maxSize || height > maxSize) {
					const scale = maxSize / Math.max(width, height);
					width = Math.round(width * scale);
					height = Math.round(height * scale);
				}

				const canvas = activeDocument.createElement('canvas');
				canvas.width = width;
				canvas.height = height;

				const ctxCanvas = canvas.getContext('2d');
				if (!ctxCanvas) {
					resolve(null);
					return;
				}

				ctxCanvas.drawImage(img, 0, 0, width, height);
				// Use JPEG for photos (smaller) with good quality
				const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
				resolve(dataUrl);
			} catch (error) {
				logger.warn('export', 'Failed to convert image to canvas', { url, error });
				resolve(null);
			}
		};

		img.onerror = () => {
			logger.warn('export', 'Failed to load image for conversion', { url });
			resolve(null);
		};

		img.src = url;
	});
}

/**
 * Get export information for the wizard to display estimates
 */
export function getExportInfo(ctx: FamilyChartExportContext): {
	rootPersonName: string;
	peopleCount: number;
	avatarCount: number;
} {
	// Get root person name
	let rootPersonName = 'unknown';
	if (ctx.rootPersonId && ctx.chartData.length > 0) {
		const rootPerson = ctx.chartData.find(p => p.id === ctx.rootPersonId);
		if (rootPerson) {
			const firstName = rootPerson.data['first name'] || '';
			const lastName = rootPerson.data['last name'] || '';
			rootPersonName = `${firstName} ${lastName}`.trim() || 'unknown';
		}
	}

	// Count avatars
	let avatarCount = 0;
	for (const person of ctx.chartData) {
		if (person.data.avatar) {
			avatarCount++;
		}
	}

	return {
		rootPersonName,
		peopleCount: ctx.chartData.length,
		avatarCount
	};
}

/**
 * Export the chart as SVG
 */
export async function exportAsSvg(ctx: FamilyChartExportContext, includeAvatars: boolean = true): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		// Prepare SVG for export using shared helper
		const { svgClone } = prepareSvgForExport(ctx, svg);

		// Count avatar images
		const imageElements = svgClone.querySelectorAll('image[href]');
		let avatarCount = 0;
		imageElements.forEach((imgEl) => {
			const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
			if (href?.startsWith('app://')) {
				avatarCount++;
			}
		});

		if (includeAvatars && avatarCount > 0) {
			// Warn about large exports that may crash due to memory exhaustion
			if (avatarCount > 75) {
				const depthHint = (ctx.ancestryDepth === null || ctx.progenyDepth === null)
					? ' Try reducing tree depth first (branch icon in toolbar).'
					: '';
				new Notice(
					`Warning: Exporting ${avatarCount} avatars may cause issues.${depthHint} Consider "Export as SVG (no avatars)" for large trees.`,
					10000
				);
			}
			// Embed avatar images as base64 for export
			await embedImagesAsBase64(svgClone);
		} else if (!includeAvatars) {
			// Remove avatar images entirely for faster/smaller export
			imageElements.forEach((imgEl) => {
				const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
				if (href?.startsWith('app://')) {
					imgEl.remove();
				}
			});
			logger.debug('export-svg', 'Removed avatar images', { count: avatarCount });
		}

		// Serialize
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		logger.debug('export-svg', 'SVG serialized', { length: svgString.length });

		// Download
		const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = activeDocument.createElement('a');
		link.href = url;
		link.download = generateExportFilename(ctx, 'svg');
		link.click();
		URL.revokeObjectURL(url);

		new Notice('SVG exported successfully');

	} catch (error) {
		logger.error('export-svg', 'Failed to export SVG', { error });
		new Notice('Failed to export SVG');
	}
}

/**
 * Export the chart as PDF
 */
export async function exportAsPdf(ctx: FamilyChartExportContext): Promise<void> {
	const svg = ctx.getChartSvg();
	if (!svg) {
		new Notice('No chart to export');
		return;
	}

	try {
		// Prepare SVG for export using shared helper
		const { svgClone, width, height } = prepareSvgForExport(ctx, svg);

		logger.debug('export-pdf', 'Preparing PDF export', { width, height, area: width * height });

		// Check for canvas size limits (same as PNG - PDF uses canvas internally)
		const maxDimension = 16384;
		const maxArea = 268435456; // 2^28 pixels
		const scale = 2; // Higher quality
		const scaledWidth = width * scale;
		const scaledHeight = height * scale;
		const scaledArea = scaledWidth * scaledHeight;

		if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
			logger.warn('export-pdf', 'Canvas dimensions exceed browser limits', { scaledWidth, scaledHeight, maxDimension });
			new Notice(`Chart too large for PDF export (${Math.round(width)}x${Math.round(height)}px). Try SVG export instead.`, 0);
			return;
		}

		if (scaledArea > maxArea) {
			logger.warn('export-pdf', 'Canvas area exceeds browser limits', { scaledArea, maxArea });
			new Notice(`Chart too large for PDF export (${Math.round(scaledArea / 1000000)}M pixels). Try SVG export instead.`, 0);
			return;
		}

		// Embed avatar images as base64 for export
		await embedImagesAsBase64(svgClone);

		// Serialize SVG
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgClone);
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		// Create canvas and draw SVG (same as PNG export)
		const canvas = activeDocument.createElement('canvas');
		canvas.width = scaledWidth;
		canvas.height = scaledHeight;
		const ctxCanvas = canvas.getContext('2d');
		if (!ctxCanvas) {
			new Notice('Failed to create canvas context');
			return;
		}

		// Generate filename before the async callback
		const filename = generateExportFilename(ctx, 'pdf');

		const img = new Image();
		img.onload = () => {
			logger.debug('export-pdf', 'Image loaded, drawing to canvas');
			ctxCanvas.scale(scale, scale);
			ctxCanvas.drawImage(img, 0, 0);
			URL.revokeObjectURL(svgUrl);

			// Create PDF with appropriate page size
			// Use landscape if wider than tall, portrait otherwise
			const orientation = width > height ? 'landscape' : 'portrait';
			const pdf = new jsPDF({
				orientation,
				unit: 'px',
				format: [width, height]
			});

			// Add canvas image to PDF
			const imgData = canvas.toDataURL('image/png');
			pdf.addImage(imgData, 'PNG', 0, 0, width, height);

			// Save PDF
			pdf.save(filename);
			new Notice('PDF exported successfully');
		};
		img.onerror = (e) => {
			URL.revokeObjectURL(svgUrl);
			logger.error('export-pdf', 'Failed to load SVG as image', { error: e });
			new Notice('Failed to render chart as PDF. Try SVG export instead.');
		};
		img.src = svgUrl;

	} catch (error) {
		logger.error('export-pdf', 'Failed to export PDF', { error });
		new Notice('Failed to export PDF');
	}
}

// ============ Internal Helpers ============

/**
 * Remove app:// images from an SVG clone (used when avatars are excluded)
 */
function removeAppImages(svgClone: SVGSVGElement): void {
	const imageElements = svgClone.querySelectorAll('image[href]');
	imageElements.forEach((imgEl) => {
		const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
		if (href?.startsWith('app://')) {
			imgEl.remove();
		}
	});
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment -- Match scope of file-level disable at top. */
