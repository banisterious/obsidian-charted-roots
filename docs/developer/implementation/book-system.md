# Book Compilation System

This document covers the book builder architecture, generation pipeline, and rendering.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Book Definition Schema](#book-definition-schema)
- [Generation Pipeline](#generation-pipeline)
- [PDF Book Renderer](#pdf-book-renderer)
- [ODT Book Renderer](#odt-book-renderer)
- [Book Builder UI](#book-builder-ui)
- [Template Intelligence](#template-intelligence)
- [Change Detection](#change-detection)

---

## Overview

The book compilation system assembles multi-chapter documents from reports, visual trees, vault notes, and section dividers. It reuses the existing report generation and visual tree rendering infrastructure, adding orchestration and multi-chapter document assembly.

**Key design decisions:**
- **Reuse existing generators**: Report chapters delegate to `ReportGenerationService`, tree chapters delegate to `VisualTreeService` + `VisualTreeSvgRenderer`
- **Markdown as intermediate format**: Report content is generated as markdown, then converted by the book renderer (same pattern as individual reports)
- **Saveable definitions**: Book configurations are stored as `.book.json` files in the vault, enabling regeneration without reopening the builder

---

## Architecture

### File Structure

```
/src/book/
├── index.ts                        # Public exports
├── types/
│   └── book-types.ts              # BookDefinition, chapter configs, generation types
├── services/
│   ├── book-generation-service.ts # Orchestrator: iterates chapters, delegates generation
│   ├── pdf-book-renderer.ts       # Multi-chapter PDF assembly via pdfmake
│   └── odt-book-renderer.ts       # Multi-chapter ODT assembly via JSZip
└── ui/
    └── book-builder-modal.ts      # 4-step wizard modal
```

### Data Flow

```
BookDefinition (.book.json)
    ↓
BookGenerationService.generateBook()
    ↓
For each chapter:
  ├─ Report → ReportGenerationService.generateReport() → markdown
  ├─ Visual Tree → VisualTreeService + SvgRenderer → SVG → PNG
  ├─ Vault Note → vault.read() → sanitize → markdown
  └─ Section Divider → title/subtitle metadata
    ↓
Based on output format:
  ├─ PDF → PdfBookRenderer → pdfmake document → download
  └─ ODT → OdtBookRenderer → JSZip → download
```

---

## Book Definition Schema

**Location:** `src/book/types/book-types.ts`

```typescript
interface BookDefinition {
  id: string;
  metadata: BookMetadata;
  chapters: BookChapter[];
  outputOptions: BookOutputOptions;
  lastGenerated?: string;          // ISO date
  contentHashes?: Record<string, string>;  // For change detection
}

interface BookMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
}

interface BookChapter {
  id: string;
  type: 'report' | 'visual-tree' | 'vault-note' | 'section-divider';
  title: string;
  config: ReportChapterConfig | VisualTreeChapterConfig
        | VaultNoteChapterConfig | SectionDividerChapterConfig;
}

interface BookOutputOptions {
  format: 'pdf' | 'odt';
  pageSize: 'A4' | 'LETTER';
  fontStyle: 'serif' | 'sans-serif';
  includeCoverPage: boolean;
  includeToc: boolean;
  chapterNumbering: 'numeric' | 'roman';
}
```

### Chapter Config Types

```typescript
interface ReportChapterConfig {
  reportType: ReportType;
  subjectCrId: string;      // Mapped to personCrId or rootPersonCrId at generation time
  subjectName: string;
  reportOptions: Record<string, unknown>;
}

interface VisualTreeChapterConfig {
  treeType: 'ancestors' | 'descendants' | 'full' | 'fan';
  rootPersonCrId: string;
  rootPersonName: string;
  maxGenerations: number;
}

interface VaultNoteChapterConfig {
  filePath: string;
}

interface SectionDividerChapterConfig {
  subtitle?: string;
}
```

---

## Generation Pipeline

**Location:** `src/book/services/book-generation-service.ts`

### Orchestration

```typescript
class BookGenerationService {
  async generateBook(
    definition: BookDefinition,
    onProgress?: (progress: BookGenerationProgress) => void
  ): Promise<BookGenerationResult> {
    const chapterResults: ChapterGenerationResult[] = [];

    for (const chapter of definition.chapters) {
      onProgress?.({ currentChapter: chapter.title, ... });

      const result = await this.generateChapter(chapter);
      chapterResults.push(result);
    }

    // Render to PDF or ODT
    const blob = await this.renderBook(definition, chapterResults);
    return { success: true, blob, suggestedFilename, ... };
  }
}
```

### Subject ID Mapping

Report generators expect different field names for the subject person:
- `personCrId`: family-group-sheet, individual-summary, source-summary, sources-by-role
- `rootPersonCrId`: ahnentafel, register, pedigree-chart, descendant-chart, brick-wall, unconnected-people, kinship

The generation service maps the chapter config's `subjectCrId` to the correct field:

```typescript
const personCrIdReports = ['family-group-sheet', 'individual-summary',
                           'source-summary', 'sources-by-role'];
const subjectField = personCrIdReports.includes(config.reportType)
  ? { personCrId: config.subjectCrId }
  : { rootPersonCrId: config.subjectCrId };
```

### Vault Note Sanitization

Vault notes are read via `vault.read()` and sanitized before inclusion:
- Frontmatter (YAML between `---` delimiters) is stripped
- Wikilinks `[[target|display]]` are converted to plain text
- Dynamic code blocks (charted-roots-*, canvas-roots-*) are removed

---

## PDF Book Renderer

**Location:** `src/book/services/pdf-book-renderer.ts`

Assembles a single pdfmake document with:
- **Cover page**: Title, subtitle, author, date, decorative separator
- **Table of contents**: Auto-generated via pdfmake's `tocItem` markers
- **Chapters**: Each starts on a new page with a numbered heading
- **Bibliography**: Deduplicated footnotes from all chapters
- **Name index**: Alphabetical, grouped by first letter, sorted by last name
- **Headers/footers**: Book title in header, page numbers in footer

### Chapter Numbering

Supports numeric (1, 2, 3) or Roman numeral (I, II, III) chapter prefixes via the `chapterNumbering` output option.

### Section Dividers

Rendered as centered title pages with decorative horizontal lines above and below, optional subtitle in italics.

---

## ODT Book Renderer

**Location:** `src/book/services/odt-book-renderer.ts`

Same logical structure as the PDF renderer but outputs an ODT ZIP archive:
- Cover page as styled paragraphs
- Chapter headings with page breaks
- Markdown-to-ODT XML conversion (reuses `OdtGenerator` methods)
- Embedded tree images with numbered filenames (e.g., `tree-001.png`)
- Page breaks between chapters

---

## Book Builder UI

**Location:** `src/book/ui/book-builder-modal.ts`

A 4-step wizard modal following the report wizard pattern:

| Step | Name | Purpose |
|------|------|---------|
| 1 | Setup | Book metadata + template selection + root person picker |
| 2 | Chapters | Drag-and-drop chapter list with add/edit/remove |
| 3 | Output | Format, page size, font, TOC/cover toggles |
| 4 | Generate | Summary, progress bar, download |

### Drag-and-Drop

Uses HTML5 drag-and-drop (same pattern as `media-manage-modal.ts`):
- Grip handle on each chapter row
- `dragstart`/`dragover`/`drop` events for reordering
- Visual feedback: opacity on drag source, border on drop target

### Entry Points

- Command: `open-book-builder`
- Command menu: Books & compilation category
- Control Center: Trees & Reports tab tile
- Context menu: Right-click `.book.json` files
- Regenerate command: `regenerate-book` (skips wizard, generates directly)

---

## Template Intelligence

Templates auto-populate chapters by traversing the family graph from a selected root person:

### Family History Book Template

1. Individual summary for the root person
2. Individual summaries for each direct-line ancestor (via ancestor traversal)
3. Family group sheets for each nuclear family in the direct line
4. Ahnentafel report for the root person

### Research Compilation Template

1. Gaps report (all people)
2. Brick wall report for the root person
3. Source summaries for key people

---

## Change Detection

When regenerating from a saved `.book.json`:

1. Previous content hashes are stored in `BookDefinition.contentHashes`
2. After regeneration, new content is hashed per chapter
3. A diff report shows which chapters changed, which are unchanged, and which are new
4. Updated hashes are saved back to the `.book.json` file

This lets users quickly see what's different without comparing full documents.

---

## Related Documentation

- [Reports System](reports-system.md) - Individual report generators
- [Canvas and Charts](canvas-and-charts.md) - Visual tree rendering
- [UI Architecture](ui-architecture.md) - Modal patterns
- [Third-Party Libraries](third-party-libraries.md) - pdfmake and JSZip
