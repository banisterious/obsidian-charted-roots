# Report Wizard Enhancements

Planning document for enhancing the report generator with additional customization options and a wizard-based UI.

- **Status:** Planning
- **Priority:** Medium
- **GitHub Issue:** #TBD
- **Created:** 2025-12-20

---

## Overview

The Report Generator modal has grown significantly with the Extended Report Types release (v0.13.5). It now handles 13 report types across 5 categories, plus extensive PDF customization options. This planning document explores:

1. **Additional customization options** for PDF and Markdown output
2. **Wizard-based UI** to manage complexity and improve user experience
3. **Architecture considerations** for maintainability

---

## Current State

### Modal Complexity

The current `ReportGeneratorModal` manages:

| Area | Elements |
|------|----------|
| **Report Selection** | 13 report types, 5 category filters |
| **Subject Selection** | Person picker, place picker, universe picker, collection picker |
| **Report Options** | Generation limits, inclusion toggles (spouses, sources, details) |
| **Output Selection** | Save to vault, Download as MD, Download as PDF |
| **PDF Options** | Page size, date format, cover page toggle, logo upload, custom title, title scope, custom subtitle, cover notes |

This is approximately 20+ configurable options spread across a single scrollable modal.

### Pain Points

1. **Overwhelming for new users** — Too many options visible at once
2. **Cognitive load** — Hard to understand which options apply to which output format
3. **Progressive disclosure lacking** — PDF-only options shown even when MD selected
4. **Discoverability** — Advanced options may be missed
5. **Scalability** — Adding more options will compound these issues

---

## Proposed Customization Options

### PDF Export Options

#### Header & Footer Customization

| Option | Description | Default |
|--------|-------------|---------|
| **Show header** | Toggle header visibility | On |
| **Show footer** | Toggle footer visibility | On |
| **Header alignment** | Title position: left, center, right | Left |
| **Header margin** | Space above content (10-40pt) | 20pt |
| **Footer margin** | Space below content (10-40pt) | 10pt |

**Note:** Removing header/footer entirely may reduce report professionalism, but some users may want clean pages for further editing. Consider keeping this but with a warning.

#### Visual Styling

| Option | Description | Default |
|--------|-------------|---------|
| **Accent color** | Color for headers, lines, highlights | #4a90d9 |
| **Header border** | None, underline, box | Underline |
| **Footer border** | None, overline, box | None |
| **Section dividers** | Style for section separators | Single line |

#### Watermark & Branding

| Option | Description | Default |
|--------|-------------|---------|
| **Watermark text** | Diagonal text across pages (e.g., "DRAFT", "CONFIDENTIAL") | None |
| **Watermark opacity** | Transparency (10-50%) | 20% |
| **Custom footer graphic** | Small image in footer (e.g., family crest) | None |
| **Canvas Roots branding** | Show "Canvas Roots for Obsidian" on cover | On |

#### Typography

| Option | Description | Default |
|--------|-------------|---------|
| **Font style** | Serif, Sans-serif | Serif |
| **Base font size** | 9, 10, 11, 12pt | 10pt |

### Markdown Export Options

Currently, Markdown output has no customization. Proposed additions:

| Option | Description | Default |
|--------|-------------|---------|
| **Date format** | MDY, DMY, YMD for dates in content | MDY |
| **Custom title** | Override default report title | None |
| **Custom subtitle** | Additional subtitle line | None |
| **Introductory notes** | Text block after title (equivalent to PDF cover notes) | None |
| **Include metadata block** | YAML frontmatter with report info | Off |

### Save to Vault Options

Same as Markdown export, plus:

| Option | Description | Default |
|--------|-------------|---------|
| **Output folder** | Where to save (existing) | Reports/ |
| **Filename template** | Pattern for filename | {type}-{subject}-{date} |

---

## Wizard UI Design

### Approach Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Current Modal** | Quick for power users, familiar pattern | Overwhelming, hard to scale |
| **Multi-Step Wizard** | Focused steps, progressive disclosure, scalable | More clicks, navigation complexity |
| **Tabbed Modal** | Organized sections, single view | Still shows all options, limited scalability |
| **Hybrid: Quick + Advanced** | Best of both worlds | Two code paths to maintain |

### Recommended: Multi-Step Wizard with Quick Generate

A hybrid approach:

1. **Quick Generate** (default for repeat users)
   - Remembers last settings
   - Single-click generate with previous options
   - "Customize" button to enter wizard

2. **Full Wizard** (for new users or customization)
   - Step-by-step with clear progression
   - Back/Next navigation
   - Optional steps can be skipped

### Proposed Wizard Steps

```
┌─────────────────────────────────────────────────────────┐
│  Generate Report                            Step 1 of 4 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ○ ○ ○ ○  (step indicators)                            │
│                                                         │
│  STEP 1: Choose Report Type                            │
│  ─────────────────────────                             │
│                                                         │
│  [Category Filter: All ▼]                              │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │ 📊 Ahnentafel       │  │ 📊 Pedigree Chart   │     │
│  │ Numbered ancestors  │  │ ASCII ancestor tree │     │
│  └─────────────────────┘  └─────────────────────┘     │
│  ...                                                   │
│                                                         │
│                              [Cancel]  [Next →]        │
└─────────────────────────────────────────────────────────┘
```

#### Step 1: Report Type
- Category filter chips
- Report cards with icons and descriptions
- Selection highlights

#### Step 2: Subject Selection
- Varies by report type:
  - Person picker (most reports)
  - Place picker (Place Summary)
  - Universe picker (Universe Overview)
  - Collection picker (Collection Overview)
  - None (Media Inventory, Gaps Report)
- Generation/depth options where applicable

#### Step 3: Content Options
- Report-specific toggles:
  - Include spouses
  - Include sources
  - Include details
  - Include children
  - Date range (Timeline)
  - etc.
- Preview of what will be included (optional)

#### Step 4: Output & Styling
- Output method selection (Vault / MD / PDF)
- **Conditional sections based on output:**
  - **All outputs:** Date format, custom title, custom subtitle, introductory notes
  - **PDF only:** Page size, cover page, logo, accent color, header/footer options, watermark
  - **Vault only:** Output folder, filename template

### Quick Generate Feature

For users who generate reports frequently:

```
┌─────────────────────────────────────────────────────────┐
│  Generate Report                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  RECENT                                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Ahnentafel for John Smith → PDF                   │ │
│  │ [Generate] [Edit]                                 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  PRESETS                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Family      │ │ Quick       │ │ Research    │      │
│  │ Archive     │ │ Share       │ │ Draft       │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  [+ New Report]                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Recent Reports:** Shows the last 3-5 generated reports with one-click regenerate or edit options.

**Presets:** User-saved configurations for common workflows (see Preset System below).

---

## Implementation Architecture

### State Management

Current approach uses instance variables in the modal class. For wizard:

```typescript
interface ReportWizardState {
  // Step 1
  reportType: ReportType | null;

  // Step 2
  subject: {
    personCrId?: string;
    placeCrId?: string;
    universeCrId?: string;
    collectionId?: string;
  };
  generationLimit: number;

  // Step 3
  contentOptions: {
    includeSpouses: boolean;
    includeSources: boolean;
    includeDetails: boolean;
    // ... report-specific options
  };

  // Step 4
  outputMethod: 'vault' | 'download-md' | 'download-pdf';
  commonOptions: {
    dateFormat: 'mdy' | 'dmy' | 'ymd';
    customTitle: string;
    customSubtitle: string;
    introductoryNotes: string;
  };
  pdfOptions: PdfOptions;
  vaultOptions: {
    outputFolder: string;
    filenameTemplate: string;
  };
}
```

### Component Structure

```
src/reports/ui/
├── report-generator-modal.ts      # Entry point, manages wizard flow
├── wizard/
│   ├── WizardContainer.ts         # Step navigation, state management
│   ├── steps/
│   │   ├── ReportTypeStep.ts      # Step 1
│   │   ├── SubjectStep.ts         # Step 2
│   │   ├── ContentOptionsStep.ts  # Step 3
│   │   └── OutputStep.ts          # Step 4
│   ├── components/
│   │   ├── StepIndicator.ts       # Progress dots
│   │   ├── ReportCard.ts          # Clickable report type card
│   │   ├── PersonPicker.ts        # Reusable person selector
│   │   └── ColorPicker.ts         # Accent color selector
│   └── quick-generate/
│       └── QuickGenerateView.ts   # Last-used quick generate
```

### Backward Compatibility

- Existing command palette command continues to work
- API for programmatic report generation unchanged
- Settings migration for saved preferences

---

## Phased Implementation

### Phase 1: Foundation
- Refactor modal into wizard container with step components
- Implement basic navigation (back/next/cancel)
- Step 1 (Report Type) and Step 2 (Subject) functional
- No new options yet, just reorganization

### Phase 2: Content & Output Steps
- Step 3 (Content Options) with report-specific toggles
- Step 4 (Output) with current options organized by output type
- Recent Reports tracking (last 5 generated)

### Phase 3: Preset System
- Preset data model and storage
- "Save as Preset" button in wizard step 4
- Quick Generate home screen with preset cards
- Preset management (edit, duplicate, delete)
- Optional: Built-in starter presets

### Phase 4: Enhanced PDF Options
- Header/footer visibility toggle and customization
- Header alignment options
- Accent colors
- Watermark support
- Font size option

### Phase 5: Enhanced Markdown Options
- Date format for MD output
- Custom title/subtitle for MD
- Introductory notes
- Metadata block option

### Phase 6: Advanced Features
- Filename templates for vault saves
- Header/footer graphics
- Preset export/import for sharing

---

## Preset System

Presets allow users to save named configurations for common report workflows. This reduces repetitive configuration and enables one-click generation for frequently used report styles.

### Preset Data Model

```typescript
interface ReportPreset {
  id: string;                    // UUID
  name: string;                  // User-defined name
  description?: string;          // Optional description
  createdAt: number;             // Timestamp
  updatedAt: number;             // Timestamp

  // What the preset configures
  reportType: ReportType;        // Required - which report

  // Content options (report-specific)
  contentOptions: {
    includeSpouses?: boolean;
    includeSources?: boolean;
    includeDetails?: boolean;
    maxGenerations?: number;
    // ... other report-specific options
  };

  // Output configuration
  outputMethod: 'vault' | 'download-md' | 'download-pdf';

  // Common options (all formats)
  commonOptions: {
    dateFormat: 'mdy' | 'dmy' | 'ymd';
    customTitle?: string;
    customSubtitle?: string;
    introductoryNotes?: string;
  };

  // PDF-specific options (only if outputMethod is 'download-pdf')
  pdfOptions?: {
    pageSize: 'A4' | 'LETTER';
    includeCoverPage: boolean;
    logoDataUrl?: string;
    accentColor?: string;
    showHeader?: boolean;
    showFooter?: boolean;
    headerAlignment?: 'left' | 'center' | 'right';
    watermarkText?: string;
    watermarkOpacity?: number;
    fontSize?: number;
  };

  // Vault-specific options (only if outputMethod is 'vault')
  vaultOptions?: {
    outputFolder: string;
    filenameTemplate: string;
    includeMetadataBlock: boolean;
  };
}
```

### Preset Management UI

**In the Quick Generate view:**
- Preset cards with name and icon
- Click to generate with preset (prompts for subject if needed)
- Right-click or overflow menu for: Edit, Duplicate, Delete, Export

**Preset Editor:**
- Opens as step 4 of wizard with "Save as Preset" button
- Or dedicated modal accessed from preset context menu
- Name and description fields
- All options from the wizard pre-filled

### Built-in Presets (Optional)

Consider shipping a few default presets as examples:

| Preset | Description |
|--------|-------------|
| **Family Archive** | PDF with cover page, serif font, full details |
| **Quick Share** | MD download, minimal options, no sources |
| **Research Draft** | Vault save, includes sources, no styling |

Users could modify or delete these.

### Storage

Presets stored in plugin settings:

```typescript
interface CanvasRootsSettings {
  // ... existing settings
  reportPresets: ReportPreset[];
  recentReports: RecentReportEntry[];  // Last 5 generated
}

interface RecentReportEntry {
  reportType: ReportType;
  subjectName: string;
  subjectCrId: string;
  outputMethod: string;
  generatedAt: number;
  // Snapshot of options used (for "Edit" action)
  options: Partial<ReportWizardState>;
}
```

### Preset Workflows

**Creating a preset:**
1. User completes wizard steps 1-4
2. Before generating, clicks "Save as Preset"
3. Enters preset name and optional description
4. Preset saved; report generates

**Using a preset:**
1. User opens Report Generator
2. Clicks a preset card
3. If report requires a subject (person/place/etc.):
   - Mini subject picker appears
   - User selects subject
4. Report generates immediately

**Editing a preset:**
1. Right-click preset → "Edit"
2. Opens wizard with preset values pre-filled
3. User modifies options
4. Clicks "Update Preset"

---

## Open Questions

1. **Step count trade-off:** 4 steps feels right, but should Content Options (Step 3) be optional/skippable for simple reports?

2. **Mobile experience:** Obsidian mobile has limited screen space. Should wizard adapt to smaller screens?

3. **Accessibility:** How to ensure keyboard navigation works well across steps?

4. **Validation timing:** Validate per-step or only on generate? Per-step prevents forward navigation issues but adds friction.

5. **Preset sharing:** Should presets be exportable/importable for sharing between vaults or users?

---

## Alternatives Considered

### Tabbed Modal (Not Recommended)

```
┌─────────────────────────────────────────────────────────┐
│  Generate Report                                        │
├───────────┬───────────┬───────────┬───────────┬────────┤
│  Report   │  Subject  │  Options  │  Output   │  PDF   │
├───────────┴───────────┴───────────┴───────────┴────────┤
│                                                         │
│  [Tab content here]                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Why not:**
- Tabs don't enforce order
- Users might miss required tabs
- PDF tab would be empty for MD output
- Doesn't solve discoverability

### Collapsible Sections (Partially Viable)

Could be used within wizard steps for advanced options:

```
Step 4: Output & Styling
├─ Output Method: [PDF ▼]
├─ Page Size: [A4 ▼]
├─ Cover Page: [✓]
└─ ▶ Advanced Styling Options
   ├─ Accent Color: [#4a90d9]
   ├─ Header Alignment: [Left ▼]
   └─ Watermark: [None]
```

This could be combined with the wizard for advanced options.

---

## Related Documents

- [Extended Report Types](extended-report-types.md) — Current report types
- [PDF Report Export](pdf-report-export.md) — PDF infrastructure
- [Statistics and Reports](../../wiki-content/Statistics-And-Reports.md) — User documentation

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-20 | Created planning document | Modal complexity requires structured approach |
| 2025-12-20 | Hybrid wizard + quick generate approach | Best of both worlds: power users get speed, new users get guidance |
| 2025-12-20 | Include preset system | Valuable for reducing repetitive configuration in common workflows |
| 2025-12-20 | 6-phase implementation plan | Allows incremental delivery with foundation first |
| | | |
