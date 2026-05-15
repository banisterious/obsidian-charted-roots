/**
 * ODT Book Renderer
 *
 * Assembles multiple chapters into a single ODT document with
 * cover page and page breaks between chapters.
 * Reuses OdtGenerator for markdown conversion and XML helpers.
 */

import { ZipBuilder } from '../../utils/zip';
import { OdtGenerator } from '../../reports/services/odt-generator';
import type {
	BookDefinition,
	ChapterGenerationResult,
	BibliographyEntry,
	NameIndexEntry,
} from '../types/book-types';

/**
 * ODT Book Renderer
 *
 * Builds a single multi-chapter ODT document from chapter generation results.
 */
export class OdtBookRenderer {
	private odtGenerator: OdtGenerator;

	constructor() {
		this.odtGenerator = new OdtGenerator();
	}

	/**
	 * Render a complete book as an ODT blob.
	 */
	async renderBook(
		definition: BookDefinition,
		chapterResults: ChapterGenerationResult[],
		bibliography: BibliographyEntry[] = [],
		nameIndex: NameIndexEntry[] = []
	): Promise<Blob> {
		const zip = new ZipBuilder();
		const { metadata, outputOptions } = definition;
		const imageEntries: Array<{ filename: string; data: string }> = [];

		// Add standard ODT structure
		zip.file('mimetype', 'application/vnd.oasis.opendocument.text', {
			compression: 'STORE',
		});

		const hasImages = chapterResults.some(r => r.chapterType === 'visual-tree' && r.imageDataUrl);
		this.addManifest(zip, hasImages ? chapterResults.filter(r => r.imageDataUrl).length : 0);
		this.addStyles(zip);

		// Build body content from chapters
		let bodyContent = '';

		// Cover page
		if (outputOptions.includeCoverPage && metadata.title) {
			bodyContent += this.odtGenerator.generateCoverPage({
				title: metadata.title,
				subtitle: metadata.subtitle,
				author: metadata.author,
				coverNotes: metadata.coverNotes,
				includeCoverPage: true,
			});
		}

		// Table of contents
		if (outputOptions.includeTableOfContents) {
			bodyContent += this.buildTableOfContents(definition, chapterResults);
		}

		// Chapters
		const successfulResults = chapterResults.filter(r => r.success);
		let imageIndex = 0;
		let chapterNumber = 0;

		for (let i = 0; i < successfulResults.length; i++) {
			const result = successfulResults[i];
			const chapter = definition.chapters.find(c => c.id === result.chapterId);
			if (!chapter) continue;

			// Build display title with optional numbering
			let displayTitle = chapter.title;
			if (chapter.type !== 'section-divider' && outputOptions.chapterNumbering !== 'none') {
				chapterNumber++;
				const prefix = outputOptions.chapterNumbering === 'roman'
					? this.toRoman(chapterNumber)
					: String(chapterNumber);
				displayTitle = `${prefix}. ${chapter.title}`;
			}

			// Page break before chapter (except first after cover/TOC)
			if (i > 0 || outputOptions.includeCoverPage || outputOptions.includeTableOfContents) {
				bodyContent += '      <text:p text:style-name="Page_20_Break"/>\n';
			}

			switch (chapter.type) {
				case 'report':
				case 'vault-note': {
					bodyContent += `      <text:h text:style-name="Heading_20_1" text:outline-level="1">${this.odtGenerator.escapeXml(displayTitle)}</text:h>\n`;
					bodyContent += this.odtGenerator.markdownToOdtContent(result.markdown || '');
					break;
				}
				case 'visual-tree': {
					bodyContent += `      <text:h text:style-name="Heading_20_1" text:outline-level="1">${this.odtGenerator.escapeXml(displayTitle)}</text:h>\n`;
					if (result.imageDataUrl && result.imageDimensions) {
						const filename = `tree_${imageIndex}.png`;
						bodyContent += this.buildImageFrame(filename, result.imageDimensions);
						imageEntries.push({ filename, data: result.imageDataUrl });
						imageIndex++;
					}
					break;
				}
				case 'section-divider': {
					bodyContent += '      <text:p text:style-name="Standard"/>\n';
					bodyContent += '      <text:p text:style-name="Standard"/>\n';
					bodyContent += `      <text:h text:style-name="Heading_20_1" text:outline-level="1">${this.odtGenerator.escapeXml(displayTitle)}</text:h>\n`;
					const dividerConfig = chapter.config as import('../types/book-types').SectionDividerConfig;
					if (dividerConfig.subtitle) {
						bodyContent += `      <text:p text:style-name="Subtitle">${this.odtGenerator.escapeXml(dividerConfig.subtitle)}</text:p>\n`;
					}
					break;
				}
			}
		}

		// Back matter: bibliography
		if (outputOptions.includeBibliography && bibliography.length > 0) {
			bodyContent += this.renderBibliography(bibliography);
		}

		// Back matter: name index
		if (outputOptions.includeNameIndex && nameIndex.length > 0) {
			bodyContent += this.renderNameIndex(nameIndex);
		}

		// Build content.xml
		this.addContent(zip, bodyContent);

		// Add embedded images
		for (const entry of imageEntries) {
			const base64Data = entry.data.replace(/^data:image\/png;base64,/, '');
			zip.file(`Pictures/${entry.filename}`, base64Data, { base64: true });
		}

		return zip.generateAsync({
			mimeType: 'application/vnd.oasis.opendocument.text',
		});
	}

	/**
	 * Build ODT table of contents element.
	 */
	private buildTableOfContents(
		definition: BookDefinition,
		chapterResults: ChapterGenerationResult[]
	): string {
		const { outputOptions } = definition;
		const successfulIds = new Set(chapterResults.filter(r => r.success).map(r => r.chapterId));
		let content = '';
		let chapterNumber = 0;

		content += '      <text:h text:style-name="Heading_20_1" text:outline-level="1">Table of contents</text:h>\n';

		for (const chapter of definition.chapters) {
			if (!successfulIds.has(chapter.id)) continue;

			let displayTitle = chapter.title;
			if (chapter.type !== 'section-divider' && outputOptions.chapterNumbering !== 'none') {
				chapterNumber++;
				const prefix = outputOptions.chapterNumbering === 'roman'
					? this.toRoman(chapterNumber)
					: String(chapterNumber);
				displayTitle = `${prefix}. ${chapter.title}`;
			}

			content += `      <text:p text:style-name="Standard">${this.odtGenerator.escapeXml(displayTitle)}</text:p>\n`;
		}

		return content;
	}

	/**
	 * Build an image frame element for embedded images.
	 */
	private buildImageFrame(filename: string, dimensions: { width: number; height: number }): string {
		// Convert points to cm (1 point = 0.0353 cm)
		const widthCm = (dimensions.width * 0.0353).toFixed(2);
		const heightCm = (dimensions.height * 0.0353).toFixed(2);

		return `      <text:p text:style-name="Standard">
        <draw:frame draw:style-name="TreeImage" draw:name="${filename}" text:anchor-type="paragraph" svg:width="${widthCm}cm" svg:height="${heightCm}cm">
          <draw:image xlink:href="Pictures/${filename}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
        </draw:frame>
      </text:p>\n`;
	}

	/**
	 * Render consolidated bibliography as ODT content.
	 */
	private renderBibliography(entries: BibliographyEntry[]): string {
		let content = '      <text:p text:style-name="Page_20_Break"/>\n';
		content += '      <text:h text:style-name="Heading_20_1" text:outline-level="1">Bibliography</text:h>\n';

		for (const entry of entries) {
			content += `      <text:p text:style-name="Standard">${this.odtGenerator.escapeXml(entry.citation)}</text:p>\n`;
			if (entry.referencedIn.length > 1) {
				content += `      <text:p text:style-name="Footnote"><text:span text:style-name="Italic">Referenced in: ${this.odtGenerator.escapeXml(entry.referencedIn.join(', '))}</text:span></text:p>\n`;
			}
		}

		return content;
	}

	/**
	 * Render name index as ODT content, grouped by last name initial.
	 */
	private renderNameIndex(entries: NameIndexEntry[]): string {
		let content = '      <text:p text:style-name="Page_20_Break"/>\n';
		content += '      <text:h text:style-name="Heading_20_1" text:outline-level="1">Name index</text:h>\n';

		let currentLetter = '';
		for (const entry of entries) {
			const lastName = entry.name.split(/\s+/).pop() || '';
			const letter = lastName.charAt(0).toUpperCase();

			if (letter !== currentLetter) {
				currentLetter = letter;
				content += `      <text:h text:style-name="Heading_20_2" text:outline-level="2">${this.odtGenerator.escapeXml(letter)}</text:h>\n`;
			}

			content += `      <text:p text:style-name="Standard"><text:span text:style-name="Bold">${this.odtGenerator.escapeXml(entry.name)}</text:span> — ${this.odtGenerator.escapeXml(entry.chapters.join(', '))}</text:p>\n`;
		}

		return content;
	}

	/**
	 * Convert a number to a Roman numeral string.
	 */
	private toRoman(num: number): string {
		const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
		const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
		let result = '';
		for (let i = 0; i < values.length; i++) {
			while (num >= values[i]) {
				result += numerals[i];
				num -= values[i];
			}
		}
		return result;
	}

	/**
	 * Add manifest.xml with entries for all images.
	 */
	private addManifest(zip: ZipBuilder, imageCount: number): void {
		let manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>`;

		for (let i = 0; i < imageCount; i++) {
			manifest += `\n  <manifest:file-entry manifest:media-type="image/png" manifest:full-path="Pictures/tree_${i}.png"/>`;
		}

		manifest += '\n</manifest:manifest>';
		zip.file('META-INF/manifest.xml', manifest);
	}

	/**
	 * Add styles.xml — delegates pattern from existing OdtGenerator.
	 */
	private addStyles(zip: ZipBuilder): void {
		// Use the same styles as OdtGenerator by calling addStyles on a temporary instance.
		// The styles are static XML, so we replicate the structure here.
		const styles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                        xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                        xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                        xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                        office:version="1.2">
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.2cm" fo:margin-bottom="0.2cm"/>
      <style:text-properties fo:font-size="11pt" style:font-name="Liberation Sans"/>
    </style:style>
    <style:style style:name="Title" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:text-align="center" fo:margin-top="1cm" fo:margin-bottom="0.5cm"/>
      <style:text-properties fo:font-size="24pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Subtitle" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:text-align="center" fo:margin-bottom="0.5cm"/>
      <style:text-properties fo:font-size="16pt" fo:font-style="italic" fo:color="#666666"/>
    </style:style>
    <style:style style:name="Heading_20_1" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.8cm" fo:margin-bottom="0.4cm" fo:keep-with-next="always"/>
      <style:text-properties fo:font-size="18pt" fo:font-weight="bold" fo:color="#1a1a2e"/>
    </style:style>
    <style:style style:name="Heading_20_2" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.6cm" fo:margin-bottom="0.3cm" fo:keep-with-next="always"/>
      <style:text-properties fo:font-size="14pt" fo:font-weight="bold" fo:color="#2c5282"/>
    </style:style>
    <style:style style:name="Heading_20_3" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.2cm" fo:keep-with-next="always"/>
      <style:text-properties fo:font-size="12pt" fo:font-weight="bold" fo:color="#4a4a5a"/>
    </style:style>
    <style:style style:name="List" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-left="1cm" fo:margin-top="0.1cm" fo:margin-bottom="0.1cm"/>
    </style:style>
    <style:style style:name="Page_20_Break" style:family="paragraph">
      <style:paragraph-properties fo:break-before="page"/>
    </style:style>
    <style:style style:name="Bold" style:family="text">
      <style:text-properties fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Italic" style:family="text">
      <style:text-properties fo:font-style="italic"/>
    </style:style>
    <style:style style:name="Footnote" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.1cm" fo:margin-bottom="0.1cm"/>
      <style:text-properties fo:font-size="9pt"/>
    </style:style>
  </office:styles>
</office:document-styles>`;
		zip.file('styles.xml', styles);
	}

	/**
	 * Add content.xml with the assembled body content.
	 */
	private addContent(zip: ZipBuilder, bodyContent: string): void {
		const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                         xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                         xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                         xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                         xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                         xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                         xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                         xmlns:xlink="http://www.w3.org/1999/xlink"
                         office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Table" style:family="table">
      <style:table-properties style:width="17cm" table:align="margins"/>
    </style:style>
    <style:style style:name="Table.Column" style:family="table-column">
      <style:table-column-properties style:use-optimal-column-width="true"/>
    </style:style>
    <style:style style:name="Table.Row" style:family="table-row">
      <style:table-row-properties style:min-row-height="0.5cm"/>
    </style:style>
    <style:style style:name="Table.Cell" style:family="table-cell">
      <style:table-cell-properties fo:padding-top="0.15cm" fo:padding-bottom="0.15cm" fo:padding-left="0.2cm" fo:padding-right="0.2cm" fo:border="0.5pt solid #888888"/>
    </style:style>
    <style:style style:name="Table.HeaderCell" style:family="table-cell">
      <style:table-cell-properties fo:padding-top="0.15cm" fo:padding-bottom="0.15cm" fo:padding-left="0.2cm" fo:padding-right="0.2cm" fo:border="0.5pt solid #666666" fo:background-color="#d0d0d0"/>
    </style:style>
    <style:style style:name="Table.CellContent" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0cm"/>
      <style:text-properties fo:font-size="10pt"/>
    </style:style>
    <style:style style:name="Table.HeaderContent" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0cm"/>
      <style:text-properties fo:font-size="10pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="TreeImage" style:family="graphic">
      <style:graphic-properties style:horizontal-pos="center" style:horizontal-rel="paragraph"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${bodyContent}
    </office:text>
  </office:body>
</office:document-content>`;

		zip.file('content.xml', content);
	}
}
