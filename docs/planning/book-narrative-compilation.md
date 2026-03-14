# Book / Narrative Compilation

## Overview

A book builder that lets users combine multiple generated reports, visual trees, and existing vault notes into a single sequenced document with cover page, table of contents, and optional index. Outputs as PDF or ODT.

Modeled after RootsMagic "Publisher" and Gramps "Book Report," adapted for Obsidian's local-first, markdown-native workflow.

---

## Motivation

Users currently generate individual reports one at a time. There is no way to combine them into a cohesive document for sharing with family or compiling research. This feature bridges the gap between per-report generation and a publishable artifact.

---

## Use cases

### Family history book

A polished document for sharing with relatives or printing. Might include:

1. Cover page with family name, dates, author
2. Table of contents
3. User-written introduction (vault note)
4. Pedigree chart (visual tree PDF)
5. Narrative family history (vault note)
6. Individual summaries for key ancestors
7. Family group sheets for each nuclear family
8. Descendant chart from a common ancestor
9. Timeline of the family across generations
10. Source bibliography
11. Index of names

### Research compilation

A working document for the researcher's own use. Might include:

1. Cover page
2. Table of contents
3. Gaps report (what's missing)
4. Source summary for a person under research
5. Individual summary with all known facts
6. Ahnentafel of known ancestors
7. User-written research notes (vault note)
8. Negative findings summary

---

## Design

### Chapter types

Each chapter in the book is one of:

| Type | Source | Description |
|------|--------|-------------|
| Generated report | Report generator | Any of the 17 existing report types, configured inline |
| Visual tree | Tree generator | Pedigree, descendant, hourglass, or fan chart |
| Vault note | Existing .md file | User-written markdown rendered into the document |
| Section divider | Built-in | Title page for a new section/part of the book |

### Book structure

```
Book
├── Metadata (title, subtitle, author, date)
├── Cover page
├── Table of contents (auto-generated)
├── Chapter[]
│   ├── type: 'report' | 'visual-tree' | 'vault-note' | 'section-divider'
│   ├── title: string (override or auto from report type)
│   ├── config: report-specific options
│   └── pageBreakBefore: boolean
└── Back matter
    ├── Source bibliography (optional, auto-collected)
    └── Name index (optional, auto-generated)
```

### Book definition storage

Books are saved as JSON files in the vault (e.g., `Books/Smith Family History.book.json`), allowing re-generation as data changes. The schema stores chapter sequence, configuration per chapter, and book-level metadata.

### Presets / templates

Offer starter templates that pre-populate the chapter list:

- **Family history book** — cover, pedigree chart, individual summaries for direct ancestors, family group sheets, descendant register, timeline, bibliography, index
- **Research compilation** — cover, gaps report, source summaries, individual summaries, ahnentafel, bibliography
- **Blank book** — empty, user builds from scratch

Templates prompt for a root person and derive chapter subjects from the family graph (e.g., generate a family group sheet for each nuclear family in the direct line).

---

## UI

### Book builder modal

A multi-step modal, similar in spirit to the existing report wizard:

**Step 1: Book setup**
- Title, subtitle, author, date
- Select preset template or start blank
- Root person selection (if using a template)

**Step 2: Chapter list**
- Drag-and-drop reorderable list of chapters
- Add chapter button with type picker:
  - "Add report" — opens report type selector with inline config
  - "Add visual tree" — opens tree type selector with inline config
  - "Add vault note" — file picker for existing .md files
  - "Add section divider" — title input
- Per-chapter: edit config, rename title, remove, toggle page break
- Preview count (estimated pages/people/sources)

**Step 3: Output settings**
- Output format: PDF or ODT
- Page size, orientation
- Font selection
- Include table of contents (yes/no)
- Include name index (yes/no)
- Include consolidated bibliography (yes/no)
- Cover page options (same as existing PDF cover config)

**Step 4: Generate**
- Progress bar showing chapter-by-chapter generation
- Cancel button
- On completion: save to vault or download

### Reopening a book

Books saved as `.book.json` can be reopened in the builder to modify chapters or regenerate with updated data. A command ("Open book builder") and context menu on `.book.json` files provide entry points.

---

## Implementation

### Phases

#### Phase 1: Core book engine ✅ (v0.20.25)

- Book definition schema (`src/book/types/book-types.ts`)
- Book generation service (`src/book/services/book-generation-service.ts`) — orchestrates chapter generation, delegates to report/tree/vault services, sanitizes vault note markdown
- PDF book renderer (`src/book/services/pdf-book-renderer.ts`) — single pdfmake document with cover page, auto-generated TOC, chapter headings, embedded tree images, section dividers, headers/footers
- ODT book renderer (`src/book/services/odt-book-renderer.ts`) — single ODT with cover, TOC, chapter headings, embedded images, page breaks
- Exposed public methods on `PdfReportRenderer` and `OdtGenerator` for reuse by book renderers

#### Phase 2: Book builder UI ✅ (v0.20.25)

- Book builder modal (4-step wizard) (`src/book/ui/book-builder-modal.ts`)
- Chapter list with drag-and-drop reordering
- Inline chapter configuration via `ChapterConfigModal` for all four chapter types
- Preset templates (family history book, research compilation, blank)
- Save/load book definitions as `.book.json`
- Command registration and context menu on `.book.json` files

#### Phase 3: Back matter and polish ✅ (v0.20.25)

- Consolidated bibliography — collects footnote definitions across chapters, deduplicates by normalized text, sorted alphabetically
- Name index — collects bold person names and table cell names across chapters, sorted by last name, grouped by initial letter
- Enhanced section divider pages with upper/lower decorative lines and subtitle support
- Chapter numbering options (none, numeric, Roman numerals) with TOC integration

#### Phase 4: Template intelligence ✅ (v0.20.25)

- Templates traverse the family graph to auto-generate individual summaries for direct-line ancestors (up to 4 generations) and family group sheets for each nuclear family in the direct line, with spouse deduplication
- "Regenerate book" command (`regenerate-book`) and context menu item on `.book.json` files — re-runs all chapters with current vault data without opening the wizard
- Change detection via djb2 content hashing per chapter — stores `lastGeneratedAt` and `lastChapterHashes` in the `.book.json` definition, reports changed chapter count on regeneration

---

## Technical considerations

### PDF rendering

The existing `PdfReportRenderer` uses pdfmake, which supports multi-section documents natively. The book renderer would build a single pdfmake document definition with chapters as sequential content sections. Table of contents can use pdfmake's `toc` feature or be manually constructed from chapter titles and page references.

### ODT rendering

The existing `OdtGenerator` produces a single content.xml. For books, each chapter's content would be appended sequentially with appropriate section breaks. ODT supports automatic table of contents via `text:table-of-content` elements.

### Visual tree chapters

Visual trees currently render as SVG → PNG → PDF. For book integration, the PNG data URL from the visual tree pipeline would be embedded as an image in the chapter's content, fitting to page dimensions.

### Vault note rendering

Existing markdown-to-PDF conversion in `PdfReportRenderer` handles headings, tables, bold/italic, lists, and footnotes. Vault notes would go through the same conversion pipeline. Wikilinks would be rendered as plain text (or optionally resolved to page references within the book).

### Performance

A large book (20+ chapters) could take significant time to generate. Chapter-by-chapter progress reporting is essential. Consider generating chapters in parallel where possible (report generation is independent), then assembling sequentially.

---

## Dependencies

- Existing report generation service (17 report types)
- Existing PDF renderer (pdfmake)
- Existing ODT generator (JSZip)
- Existing visual tree service (SVG renderer)
- Drag-and-drop UI (Obsidian's `sortable` or manual implementation)

---

## References

- RootsMagic "Publisher" / "Book Creator"
- Gramps "Book Report"
- Legacy Family Tree book generation
- Existing report wizard: `src/reports/ui/report-wizard-modal.ts`
- Existing PDF renderer: `src/reports/services/pdf-report-renderer.ts`
- Existing ODT generator: `src/reports/services/odt-generator.ts`
