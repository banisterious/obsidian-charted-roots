# Book Builder

The Book Builder lets you compile reports, visual trees, vault notes, and section dividers into a single PDF or ODT document — a complete family history book or research compilation.

---

## Table of Contents

- [Overview](#overview)
- [Opening the Book Builder](#opening-the-book-builder)
- [Step 1: Setup](#step-1-setup)
  - [Templates](#templates)
- [Step 2: Chapters](#step-2-chapters)
  - [Chapter types](#chapter-types)
  - [Drag-and-drop ordering](#drag-and-drop-ordering)
- [Step 3: Output](#step-3-output)
- [Step 4: Generate](#step-4-generate)
- [Saving and Reusing Book Definitions](#saving-and-reusing-book-definitions)
- [Back Matter](#back-matter)
- [Change Detection](#change-detection)

---

## Overview

The Book Builder provides:

- **Multi-chapter compilation**: Combine any mix of generated reports, visual tree diagrams, vault markdown notes, and section dividers
- **Preset templates**: Start from a "Family history book" or "Research compilation" template that auto-populates chapters from your family graph
- **Drag-and-drop ordering**: Reorder chapters visually in the builder
- **Professional output**: Cover page, table of contents, consolidated bibliography, and name index
- **Saveable definitions**: Save your book as a `.book.json` file and regenerate it as your vault data changes

---

## Opening the Book Builder

There are several ways to open the Book Builder:

1. **Command palette**: "Charted Roots: Open book builder"
2. **Command menu**: Books & compilation > Open book builder
3. **Control Center**: Trees & Reports tab > Book builder tile
4. **Context menu**: Right-click a `.book.json` file > Open in book builder

---

## Step 1: Setup

Enter your book's metadata:

| Field | Description |
|-------|-------------|
| **Title** | Book title (appears on cover page and headers) |
| **Subtitle** | Optional subtitle |
| **Author** | Author name |
| **Date** | Generation date |

### Templates

Choose a starting template to auto-populate chapters:

| Template | Description |
|----------|-------------|
| **Family history book** | Polished document for sharing. Auto-generates individual summaries for direct-line ancestors and family group sheets for each nuclear family, derived from your family graph. |
| **Research compilation** | Working document with research-focused reports. Includes gaps report, brick wall analysis, and source summaries. |
| **Blank** | Start with an empty chapter list and add chapters manually. |

When selecting a template that uses the family graph (Family history book), you'll be prompted to select a root person. The template traverses the ancestor tree and generates chapters automatically.

---

## Step 2: Chapters

### Chapter types

Add chapters of four types:

| Type | Description | Configuration |
|------|-------------|---------------|
| **Report** | Any of the plugin's report types (Ahnentafel, Family Group Sheet, etc.) | Report type, subject person, report-specific options |
| **Visual tree** | Pedigree, descendant, or hourglass | Chart type, root person, max generations |
| **Vault note** | Any markdown note from your vault | File picker to select the note |
| **Section divider** | A title page or separator between sections | Title, optional subtitle |

**Adding a chapter:**
1. Click "Add chapter"
2. Select the chapter type
3. Configure the chapter options
4. The chapter appears in the list

**Editing a chapter:**
- Click the edit icon on any chapter to modify its configuration
- Click the remove icon to delete it

### Drag-and-drop ordering

Chapters can be reordered by dragging:
- Grab the grip handle on the left side of any chapter
- Drag to the desired position
- Drop to reorder

---

## Step 3: Output

Configure the output format and styling:

| Option | Description |
|--------|-------------|
| **Format** | PDF or ODT |
| **Page size** | A4 or Letter |
| **Font style** | Serif or sans-serif |
| **Include cover page** | Add a title page with book metadata |
| **Include table of contents** | Auto-generated TOC with chapter titles and page numbers |
| **Chapter numbering** | Numeric (1, 2, 3) or Roman (I, II, III) |

---

## Step 4: Generate

Review a summary of your book configuration, then click "Generate" to compile the document.

- A progress bar shows chapter-by-chapter progress
- After generation, the document downloads automatically
- Any warnings (e.g., a report that couldn't find its subject person) are displayed

---

## Saving and Reusing Book Definitions

Book definitions can be saved as `.book.json` files in your vault:

- **Save**: Click "Save definition" in the builder to save the current configuration
- **Reopen**: Right-click a `.book.json` file in the file explorer and select "Open in book builder"
- **Regenerate**: Use the "Regenerate book" command or right-click a `.book.json` file and select "Regenerate book" to regenerate without opening the builder

Saved definitions store all chapter configurations, output settings, and metadata. When your vault data changes (new people, updated events, additional sources), regenerating the same definition produces an updated book.

---

## Back Matter

Books can include automatically generated back matter:

### Table of contents

When enabled, a TOC is inserted after the cover page listing all chapter titles with page numbers (PDF) or section links (ODT).

### Consolidated bibliography

All footnotes and source citations across chapters are deduplicated and collected into a single bibliography at the end of the book.

### Name index

An alphabetical index of all people mentioned in the book, sorted by last name and grouped by letter. Each entry lists the chapters where the person appears.

---

## Change Detection

When regenerating a book from a saved `.book.json` definition, the system uses content hashing to detect which chapters have changed since the last generation. After regeneration, a summary reports which chapters were updated, which remained the same, and which are new.

---

## Related Documentation

- [Statistics & Reports](Statistics-And-Reports) - Individual report types and the report wizard
- [Visual Trees](Visual-Trees) - Canvas tree generation and PDF export
- [Dynamic Note Content](Dynamic-Note-Content) - Live content blocks in notes
