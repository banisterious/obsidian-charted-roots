# Project Structure

This document describes the Charted Roots plugin directory layout and component status.

## Table of Contents

- [Directory Layout](#directory-layout)
- [Component Map](#component-map)
  - [Core Services](#core-services-srccore)
  - [Sources Module](#sources-module-srcsources)
  - [Events Module](#events-module-srcevents)
  - [Maps Module](#maps-module-srcmaps)
  - [Places Module](#places-module-srcplaces)
  - [Organizations Module](#organizations-module-srcorganizations)
  - [Relationships Module](#relationships-module-srcrelationships)
  - [Dates Module](#dates-module-srcdates)
  - [Schemas Module](#schemas-module-srcschemas)
  - [Statistics Module](#statistics-module-srcstatistics)
  - [Reports Module](#reports-module-srcreports)
  - [Universes Module](#universes-module-srcuniverses)
  - [Trees Module](#trees-module-srctrees)
  - [Enhancement Module](#enhancement-module-srcenhancement)
  - [Dynamic Content Module](#dynamic-content-module-srcdynamic-content)
  - [UI Components](#ui-components-srcui)
  - [Data Models](#data-models-srcmodels)
- [Commands](#commands-maints)
- [Context Menus](#context-menus)
- [Control Center Tabs](#control-center-tabs)

---

## Directory Layout

```
charted-roots/
├── main.ts                    # Plugin entry point
├── styles.css                 # Final compiled CSS for Obsidian
├── src/
│   ├── settings.ts            # Plugin settings interface
│   ├── core/                  # Core business logic
│   │   ├── bidirectional-linker.ts   # Automatic relationship sync
│   │   ├── canvas-generator.ts       # Canvas JSON generation
│   │   ├── data-quality.ts           # Data quality service
│   │   ├── family-chart-layout.ts    # Family tree layout
│   │   ├── family-graph.ts           # Relationship graph builder
│   │   ├── place-graph.ts            # Place hierarchy graph
│   │   ├── privacy-service.ts        # Living person detection
│   │   ├── logging.ts                # Structured logging
│   │   └── ...
│   ├── dates/                 # Custom date system support
│   │   ├── services/             # Date parsing and formatting
│   │   ├── types/                # Date type definitions
│   │   ├── parser/               # Fictional date parser
│   │   ├── constants/            # Default date systems
│   │   └── ui/                   # Date systems card
│   ├── events/                # Event management
│   │   ├── services/             # Event service, timeline export
│   │   ├── types/                # Event type definitions
│   │   └── ui/                   # Event modals and timeline views
│   ├── gedcom/                # GEDCOM 5.5.1 support
│   │   ├── gedcom-importer.ts    # Import from GEDCOM with quality preview
│   │   ├── gedcom-parser.ts      # GEDCOM parsing
│   │   ├── gedcom-exporter.ts    # Export to GEDCOM
│   │   └── gedcom-quality-analyzer.ts # Pre-import quality analysis
│   ├── gedcomx/               # GEDCOM X (FamilySearch) support
│   │   ├── gedcomx-importer.ts   # Import from GEDCOM X JSON
│   │   ├── gedcomx-exporter.ts   # Export to GEDCOM X JSON
│   │   └── gedcomx-types.ts      # Type definitions
│   ├── gramps/                # Gramps XML support
│   │   ├── gramps-importer.ts    # Import from Gramps XML
│   │   ├── gramps-exporter.ts    # Export to Gramps XML
│   │   └── gramps-types.ts       # Type definitions
│   ├── csv/                   # CSV import support
│   │   ├── csv-parser.ts         # CSV parsing
│   │   └── csv-importer.ts       # CSV import to person notes
│   ├── integrations/          # Third-party plugin integrations
│   │   ├── calendarium-bridge.ts     # Calendarium calendar import
│   │   └── integrations-settings.ts  # Integration settings UI
│   ├── maps/                  # Map visualizations
│   │   ├── services/             # Geocoding service
│   │   ├── types/                # Map type definitions
│   │   ├── ui/                   # Map UI components
│   │   ├── map-view.ts           # Leaflet map view
│   │   ├── map-controller.ts     # Map interactions
│   │   └── image-map-manager.ts  # Custom image maps
│   ├── organizations/         # Organization management
│   │   ├── services/             # Organization/membership services
│   │   ├── types/                # Organization type definitions
│   │   ├── constants/            # Default organization types
│   │   └── ui/                   # Organization modals and tab
│   ├── places/                # Place management
│   │   ├── types/                # Place type definitions
│   │   ├── constants/            # Default place types
│   │   └── ui/                   # Place type editor
│   ├── relationships/         # Custom relationship types
│   │   ├── services/             # Relationship type service
│   │   ├── types/                # Relationship type definitions
│   │   ├── constants/            # Default relationship types
│   │   └── ui/                   # Relationship type editor and tab
│   ├── schemas/               # Note validation schemas
│   │   ├── services/             # Schema and validation services
│   │   ├── types/                # Schema type definitions
│   │   └── index.ts              # Module exports
│   ├── sources/               # Evidence & Source Management
│   │   ├── services/             # Source-related services
│   │   ├── types/                # Type definitions
│   │   └── ui/                   # Source UI components
│   ├── statistics/            # Statistics and analytics
│   │   ├── services/             # Statistics computation
│   │   ├── types/                # Statistics type definitions
│   │   ├── constants/            # Section IDs, limits
│   │   └── ui/                   # Statistics tab and view
│   ├── reports/               # Report generation
│   │   ├── services/             # Report generators
│   │   ├── types/                # Report type definitions
│   │   └── ui/                   # Report generation modal
│   ├── universes/             # Fictional world management
│   │   ├── services/             # Universe service
│   │   ├── types/                # Universe type definitions
│   │   └── ui/                   # Universe UI components
│   ├── enhancement/           # Data enhancement tools
│   │   ├── services/             # Place generator service
│   │   └── ui/                   # Place generator modal
│   ├── constants/             # Base templates for Obsidian Bases
│   │   ├── base-template.ts       # People base template
│   │   ├── events-base-template.ts
│   │   ├── notes-base-template.ts
│   │   ├── organizations-base-template.ts
│   │   ├── places-base-template.ts
│   │   ├── sources-base-template.ts
│   │   └── universes-base-template.ts
│   ├── dynamic-content/       # Live content rendering
│   │   ├── processors/           # Code block processors (7 blocks)
│   │   ├── renderers/            # Content renderers (7 renderers)
│   │   └── services/             # Dynamic content service
│   ├── excalidraw/            # Excalidraw export
│   │   └── excalidraw-exporter.ts # Export to Excalidraw format
│   ├── migration/             # Plugin rename migration
│   │   └── plugin-rename-migration-service.ts
│   ├── models/                # TypeScript interfaces
│   │   ├── person.ts             # Person data structures
│   │   ├── place.ts              # Place data structures
│   │   └── canvas.ts             # Canvas JSON types
│   ├── research/              # Research workflow
│   │   ├── index.ts              # Module exports
│   │   └── types/                # Research type definitions
│   ├── trees/                 # Visual tree generation
│   │   ├── services/
│   │   │   ├── visual-tree-service.ts       # Tree generation orchestration
│   │   │   └── visual-tree-svg-renderer.ts  # SVG rendering
│   │   ├── types/                # Visual tree type definitions
│   │   └── ui/                   # Trees tab and wizard modal
│   ├── types/                 # Shared type definitions
│   │   ├── frontmatter.ts        # Person frontmatter interface
│   │   └── obsidian-ext.d.ts     # Obsidian API extensions
│   ├── utils/                 # Utility functions
│   │   └── place-name-normalizer.ts # Place name standardization
│   └── ui/                    # User interface components
│       ├── control-center.ts     # Control Center modal
│       ├── tree-preview.ts       # Interactive SVG preview
│       ├── settings-tab.ts       # Plugin settings tab
│       └── ...
├── styles/                    # CSS source files (44 components)
│   ├── variables.css          # CSS custom properties
│   ├── modals.css             # Modal styling
│   ├── control-center.css     # Control Center component styles
│   ├── data-quality.css       # Data quality tab styling
│   ├── map-view.css           # Leaflet map styling
│   ├── timeline-callouts.css  # Timeline markdown export styling
│   └── ...                    # Additional component styles
├── docs/                      # Documentation
│   ├── development.md         # Development guide index
│   ├── architecture/          # Design documents
│   ├── developer/             # Developer documentation
│   └── planning/              # Feature planning documents
├── wiki-content/              # GitHub wiki source
│   ├── Home.md                # Wiki home page
│   ├── Roadmap.md             # Feature roadmap
│   ├── Data-Quality.md        # Data quality documentation
│   └── ...                    # Additional wiki pages
├── manifest.json              # Obsidian plugin metadata
├── package.json               # NPM configuration
├── tsconfig.json              # TypeScript configuration
├── esbuild.config.mjs         # Build configuration
├── build-css.js               # CSS build system
└── .eslintrc.json             # ESLint configuration
```

---

## Component Map

### Core Services (src/core/)

| Component | Status | Purpose |
|-----------|--------|---------|
| `bidirectional-linker.ts` | ✅ Complete | Automatic relationship synchronization with dual storage |
| `canvas-finder.ts` | ✅ Complete | Finds canvases containing specific person notes |
| `canvas-generator.ts` | ✅ Complete | Converts positioned nodes to Canvas JSON format with styling |
| `canvas-style-overrides.ts` | ✅ Complete | Canvas node styling customization |
| `error-utils.ts` | ✅ Complete | Centralized error handling utilities |
| `family-chart-layout.ts` | ✅ Complete | Family tree layout using family-chart library with support for complex relationships |
| `family-graph.ts` | ✅ Complete | Builds relationship graphs from person notes with dual storage support |
| `hourglass-layout.ts` | ✅ Complete | Ancestors above, descendants below root person layout |
| `layout-engine.ts` | 🟡 Deprecated | Original D3.js hierarchy layout (superseded by family-chart-layout.ts) |
| `lineage-tracking.ts` | ✅ Complete | Multi-generational lineage assignment (patrilineal, matrilineal, all descendants) |
| `logging.ts` | ✅ Complete | Structured logging with export capability and persistent log level settings |
| `person-note-writer.ts` | ✅ Complete | Creates person notes with YAML frontmatter, includes all essential properties by default |
| `privacy-service.ts` | ✅ Complete | Privacy protection for all exports (living person detection, anonymization) |
| `reference-numbering.ts` | ✅ Complete | Genealogical reference systems (Ahnentafel, d'Aboville, Henry, Generation) |
| `relationship-calculator.ts` | ✅ Complete | BFS pathfinding to calculate genealogical relationships between people |
| `relationship-history.ts` | ✅ Complete | Tracks relationship changes with timestamps for undo functionality |
| `relationship-manager.ts` | ✅ Complete | Centralized relationship CRUD operations with history integration |
| `relationship-validator.ts` | ✅ Complete | Validates relationship data integrity and detects orphaned links |
| `timeline-layout.ts` | ✅ Complete | Chronological positioning by birth year layout |
| `uuid.ts` | ✅ Complete | UUID v4 generation for `cr_id` fields |
| `recent-files-service.ts` | ✅ Complete | Tracks recently accessed files for Dashboard recent section |
| `vault-stats.ts` | ✅ Complete | Calculates vault-wide statistics |
| `duplicate-detection.ts` | ✅ Complete | Finds potential duplicate person records |
| `folder-filter.ts` | ✅ Complete | Configurable folder filtering for plugin scope |
| `media-service.ts` | ✅ Complete | Media file association and management |
| `media-association.ts` | ✅ Complete | Links media files to entity notes |
| `merge-service.ts` | ✅ Complete | Merges duplicate person records |
| `note-writer.ts` | ✅ Complete | Generic note writing (GEDCOM notes, research notes) |
| `person-index-service.ts` | ✅ Complete | Fast person lookup index by cr_id and name |
| `place-note-writer.ts` | ✅ Complete | Creates and updates place notes |
| `property-alias-service.ts` | ✅ Complete | Canonical ↔ alias property name mapping |
| `staging-service.ts` | ✅ Complete | Staging area for web clipper and bulk operations |
| `template-filter.ts` | ✅ Complete | Filters template/example files from operations |
| `value-alias-service.ts` | ✅ Complete | Value normalization (sex M/F/X/U, etc.) |
| `web-clipper-service.ts` | ✅ Complete | Integration with web clipper for source import |
| `compression-utils.ts` | ✅ Complete | Data compression for exports |
| `export-statistics-service.ts` | ✅ Complete | Export statistics tracking |

### Sources Module (src/sources/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `source-service.ts` | ✅ Complete | Parses source notes, extracts metadata, calculates source statistics |
| `evidence-service.ts` | ✅ Complete | Fact-level source tracking, research coverage calculation, research gaps detection |
| `citation-service.ts` | ✅ Complete | Citation generation in Chicago, Evidence Explained, MLA, Turabian formats |
| `proof-summary-service.ts` | ✅ Complete | Proof summary note CRUD, conflict detection, evidence linking |
| **Types** | | |
| `source-types.ts` | ✅ Complete | Source quality, fact keys, sourced facts interfaces |
| `proof-types.ts` | ✅ Complete | Proof status, confidence levels, evidence support types |
| `source-templates.ts` | ✅ Complete | Source note templates by type (vital records, census, etc.) |
| **UI Components** | | |
| `sources-tab.ts` | ✅ Complete | Sources tab in Control Center with source list and statistics |
| `create-source-modal.ts` | ✅ Complete | Modal for creating new source notes with templates |
| `create-proof-modal.ts` | ✅ Complete | Modal for creating/editing proof summary notes |
| `source-picker-modal.ts` | ✅ Complete | Modal for selecting sources to link |
| `media-gallery.ts` | ✅ Complete | Thumbnail grid of source media with lightbox viewer |
| `citation-generator.ts` | ✅ Complete | Citation format selection and preview UI |

### Events Module (src/events/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `event-service.ts` | ✅ Complete | Event note parsing, CRUD operations, event statistics |
| `timeline-markdown-exporter.ts` | ✅ Complete | Export timelines to styled markdown callouts |
| `timeline-canvas-exporter.ts` | ✅ Complete | Export timelines to Obsidian Canvas |
| `sort-order-service.ts` | ✅ Complete | Event sort order management |
| `timeline-style-overrides.ts` | ✅ Complete | Timeline visual styling configuration |
| **Types** | | |
| `event-types.ts` | ✅ Complete | Event type definitions and interfaces |
| **UI Components** | | |
| `create-event-modal.ts` | ✅ Complete | Modal for creating new event notes |
| `event-type-editor-modal.ts` | ✅ Complete | Modal for editing custom event types |
| `event-type-manager-card.ts` | ✅ Complete | Event type management card in Events tab |
| `extract-events-modal.ts` | ✅ Complete | Extract events from person notes |
| `family-timeline.ts` | ✅ Complete | Family timeline view component |
| `person-timeline.ts` | ✅ Complete | Individual person timeline view |
| `place-timeline.ts` | ✅ Complete | Place-based timeline view |
| `timeline-style-modal.ts` | ✅ Complete | Timeline styling options modal |

### Maps Module (src/maps/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `geocoding-service.ts` | ✅ Complete | Address geocoding via OpenStreetMap Nominatim |
| `map-data-service.ts` | ✅ Complete | Map data aggregation and statistics |
| **Core** | | |
| `map-view.ts` | ✅ Complete | Leaflet map view with markers and popups |
| `map-controller.ts` | ✅ Complete | Map interaction handling (pan, zoom, click) |
| `image-map-manager.ts` | ✅ Complete | Custom image map support for fictional worlds |
| **UI Components** | | |
| `world-map-preview.ts` | ✅ Complete | Embedded map preview in Control Center |
| `enrich-place-hierarchy-modal.ts` | ✅ Complete | Modal for enriching place hierarchies |
| `bulk-geocode-modal.ts` | ✅ Complete | Bulk geocoding operations modal |

### Places Module (src/places/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Types** | | |
| `place-types.ts` | ✅ Complete | Place type definitions and interfaces |
| **Constants** | | |
| `default-place-types.ts` | ✅ Complete | Built-in place type definitions |
| **UI Components** | | |
| `place-type-editor-modal.ts` | ✅ Complete | Modal for editing custom place types |
| `place-type-manager-card.ts` | ✅ Complete | Place type management card in Places tab |

### Organizations Module (src/organizations/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `organization-service.ts` | ✅ Complete | Organization note parsing and CRUD |
| `membership-service.ts` | ✅ Complete | Membership tracking and history |
| **Types** | | |
| `organization-types.ts` | ✅ Complete | Organization type definitions |
| **Constants** | | |
| `organization-types.ts` | ✅ Complete | Built-in organization type definitions |
| **UI Components** | | |
| `organizations-tab.ts` | ✅ Complete | Organizations tab content |
| `create-organization-modal.ts` | ✅ Complete | Modal for creating organization notes |
| `add-membership-modal.ts` | ✅ Complete | Modal for adding memberships to people |
| `organization-type-editor-modal.ts` | ✅ Complete | Modal for editing organization types |
| `organization-type-manager-card.ts` | ✅ Complete | Organization type management card |

### Relationships Module (src/relationships/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `relationship-service.ts` | ✅ Complete | Custom relationship type management |
| **Types** | | |
| `relationship-types.ts` | ✅ Complete | Relationship type definitions |
| **Constants** | | |
| `default-relationship-types.ts` | ✅ Complete | Built-in relationship type definitions |
| **UI Components** | | |
| `relationships-tab.ts` | ✅ Complete | Relationships tab content |
| `relationship-type-editor-modal.ts` | ✅ Complete | Modal for editing relationship types |
| `relationship-type-manager-card.ts` | ✅ Complete | Relationship type management card |

### Dates Module (src/dates/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `date-service.ts` | ✅ Complete | Date parsing and formatting with custom calendars |
| **Parser** | | |
| `fictional-date-parser.ts` | ✅ Complete | Parser for fictional/custom date formats |
| **Types** | | |
| `date-types.ts` | ✅ Complete | Date system type definitions |
| **Constants** | | |
| `default-date-systems.ts` | ✅ Complete | Built-in date system definitions |
| **UI Components** | | |
| `date-systems-card.ts` | ✅ Complete | Date systems configuration card |
| `events-tab.ts` | ✅ Complete | Events tab with date system support |

### Schemas Module (src/schemas/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `schema-service.ts` | ✅ Complete | Schema definition and management |
| `validation-service.ts` | ✅ Complete | Note validation against schemas |
| **Types** | | |
| `schema-types.ts` | ✅ Complete | Schema type definitions |

### Statistics Module (src/statistics/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `statistics-service.ts` | ✅ Complete | Core statistics computation with caching and drill-down methods |
| **Types** | | |
| `statistics-types.ts` | ✅ Complete | Statistics type definitions |
| **Constants** | | |
| `statistics-constants.ts` | ✅ Complete | Section IDs, display limits |
| **UI Components** | | |
| `statistics-tab.ts` | ✅ Complete | Statistics tab in Control Center |
| `statistics-view.ts` | ✅ Complete | Workspace dashboard view |

### Reports Module (src/reports/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `report-generation-service.ts` | ✅ Complete | Report orchestration and output |
| `ahnentafel-generator.ts` | ✅ Complete | Ahnentafel ancestor report |
| `family-group-sheet-generator.ts` | ✅ Complete | Family group sheet report |
| `individual-summary-generator.ts` | ✅ Complete | Individual person summary |
| `gaps-report-generator.ts` | ✅ Complete | Missing data report |
| `register-report-generator.ts` | ✅ Complete | NGSQ-style descendant report |
| `pedigree-chart-generator.ts` | ✅ Complete | Markdown pedigree chart |
| `descendant-chart-generator.ts` | ✅ Complete | Markdown descendant chart |
| `collection-overview-generator.ts` | ✅ Complete | Collection overview report |
| `media-inventory-generator.ts` | ✅ Complete | Media inventory report |
| `place-summary-generator.ts` | ✅ Complete | Place summary report |
| `source-summary-generator.ts` | ✅ Complete | Source summary report |
| `sources-by-role-generator.ts` | ✅ Complete | Sources organized by person role |
| `timeline-generator.ts` | ✅ Complete | Timeline report generation |
| `universe-overview-generator.ts` | ✅ Complete | Universe overview report |
| `research-report-export-generator.ts` | ✅ Complete | Research report export |
| `odt-generator.ts` | ✅ Complete | OpenDocument (ODT) export |
| `pdf-report-renderer.ts` | ✅ Complete | PDF rendering with pdfmake |
| **Utils** | | |
| `footnote-parser.ts` | ✅ Complete | Footnote parsing for reports |
| **Types** | | |
| `report-types.ts` | ✅ Complete | Report type definitions |
| **UI Components** | | |
| `report-wizard-modal.ts` | ✅ Complete | Report wizard with template selection and options |

### Universes Module (src/universes/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `universe-service.ts` | ✅ Complete | Universe note management |
| **Types** | | |
| `universe-types.ts` | ✅ Complete | Universe type definitions |
| **UI Components** | | |
| `universes-tab.ts` | ✅ Complete | Universes tab in Control Center |
| `create-universe-modal.ts` | ✅ Complete | Modal for creating universe notes |

### Trees Module (src/trees/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `visual-tree-service.ts` | ✅ Complete | Visual tree generation orchestration |
| `visual-tree-svg-renderer.ts` | ✅ Complete | SVG rendering for tree export (PNG/SVG) |
| **Types** | | |
| `visual-tree-types.ts` | ✅ Complete | Visual tree type definitions |
| **UI Components** | | |
| `trees-tab.ts` | ✅ Complete | Trees & reports tab in Control Center |
| `unified-tree-wizard-modal.ts` | ✅ Complete | Unified tree generation wizard |

### Enhancement Module (src/enhancement/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `place-generator.ts` | ✅ Complete | Generate place notes from person data |
| **UI Components** | | |
| `place-generator-modal.ts` | ✅ Complete | Bulk place generation modal |

### Dynamic Content Module (src/dynamic-content/)

| Component | Status | Purpose |
|-----------|--------|---------|
| **Services** | | |
| `dynamic-content-service.ts` | ✅ Complete | Shared utilities: config parsing, context building, freeze-to-markdown |
| **Processors** | | |
| `timeline-processor.ts` | ✅ Complete | `charted-roots-timeline` code block |
| `relationships-processor.ts` | ✅ Complete | `charted-roots-relationships` code block |
| `media-processor.ts` | ✅ Complete | `charted-roots-media` code block |
| `source-roles-processor.ts` | ✅ Complete | `charted-roots-source-roles` code block |
| `transfers-processor.ts` | ✅ Complete | `charted-roots-transfers` code block |
| `members-processor.ts` | ✅ Complete | `charted-roots-members` code block |
| `sources-processor.ts` | ✅ Complete | `charted-roots-sources` code block |
| `extractions-processor.ts` | ✅ Complete | `charted-roots-extractions` code block |
| **Renderers** | | |
| `timeline-renderer.ts` | ✅ Complete | Timeline content renderer |
| `relationships-renderer.ts` | ✅ Complete | Relationships content renderer |
| `media-renderer.ts` | ✅ Complete | Media gallery renderer |
| `source-roles-renderer.ts` | ✅ Complete | Person roles table renderer |
| `transfers-renderer.ts` | ✅ Complete | Property transfers renderer |
| `members-renderer.ts` | ✅ Complete | Organization members renderer |
| `sources-renderer.ts` | ✅ Complete | Sources table renderer |
| `extractions-renderer.ts` | ✅ Complete | Source extractions renderer |

### UI Components (src/ui/)

| Component | Status | Purpose |
|-----------|--------|---------|
| `control-center.ts` | ✅ Complete | Main Control Center modal with 13 tabs for all plugin functionality |
| `dashboard-tab.ts` | ✅ Complete | Dashboard tab with quick-action tiles, vault health, and recent files |
| `settings-tab.ts` | ✅ Complete | Plugin settings tab in Obsidian settings |
| `canvas-style-modal.ts` | ✅ Complete | Modal for canvas styling options |
| `find-on-canvas-modal.ts` | ✅ Complete | Find person across all canvases |
| `folder-scan-modal.ts` | ✅ Complete | Scan folder for relationship issues |
| `folder-statistics-modal.ts` | ✅ Complete | Comprehensive folder analytics and data completeness metrics |
| `gedcom-import-results-modal.ts` | ✅ Complete | Detailed GEDCOM import results with success/warning/error counts |
| `lucide-icons.ts` | ✅ Complete | Lucide icon integration helpers and tab configurations |
| `person-picker.ts` | ✅ Complete | Person search modal with fuzzy matching, sorting, filtering |
| `regenerate-options-modal.ts` | ✅ Complete | Options modal for canvas regeneration |
| `relationship-calculator-modal.ts` | ✅ Complete | UI for calculating relationship between two people |
| `relationship-history-modal.ts` | ✅ Complete | View and undo relationship changes with timestamps |
| `tree-preview.ts` | ✅ Complete | Interactive SVG tree preview with pan/zoom, color schemes, tooltips, PNG/SVG export |
| `tree-statistics-modal.ts` | ✅ Complete | Tree generation statistics display |
| `validation-results-modal.ts` | ✅ Complete | Display validation results for relationship data |
| `add-relationship-modal.ts` | ✅ Complete | Modal for adding parent/spouse/child relationships |
| `create-person-modal.ts` | ✅ Complete | Modal for creating new person notes |
| `duplicate-detection-modal.ts` | ✅ Complete | Duplicate person detection and merge wizard |
| `merge-wizard-modal.ts` | ✅ Complete | Guided merge workflow for duplicate records |
| `split-wizard-modal.ts` | ✅ Complete | Split incorrectly merged person records |
| `standardize-places-modal.ts` | ✅ Complete | Bulk place name standardization |
| `build-place-hierarchy-modal.ts` | ✅ Complete | Build place hierarchies from flat data |
| `create-schema-modal.ts` | ✅ Complete | Create validation schemas for note types |
| `template-snippets-modal.ts` | ✅ Complete | Template snippets for dynamic blocks and properties |
| `family-creation-wizard.ts` | ✅ Complete | Guided family creation (parents + children) |
| `quick-create-person-modal.ts` | ✅ Complete | Quick person creation with minimal fields |
| `import-wizard-modal.ts` | ✅ Complete | Unified import wizard (GEDCOM, Gramps, CSV) |
| `export-wizard-modal.ts` | ✅ Complete | Unified export wizard |
| `import-export-hub-modal.ts` | ✅ Complete | Import/export hub with format selection |
| `cleanup-wizard-modal.ts` | ✅ Complete | Post-import cleanup operations |
| `staging-management-modal.ts` | ✅ Complete | Manage web clipper staging area |
| `create-place-modal.ts` | ✅ Complete | Modal for creating place notes |
| `create-note-modal.ts` | ✅ Complete | Modal for creating generic notes |
| `create-map-wizard-modal.ts` | ✅ Complete | Custom map creation wizard |
| `reports-hub-modal.ts` | ✅ Complete | Reports hub with type selection |
| `media-lightbox-modal.ts` | ✅ Complete | Full-screen media viewer |
| `privacy-notice-modal.ts` | ✅ Complete | Privacy notice for exports |
| `add-research-question-modal.ts` | ✅ Complete | Add research questions to notes |
| **Dockable Views** | | |
| `views/family-chart-view.ts` | ✅ Complete | Interactive family chart (family-chart library) |
| `views/map-view.ts` | ✅ Complete | Leaflet map view with markers |
| **Shared** | | |
| `shared/card-component.ts` | ✅ Complete | Reusable card UI component |

### Data Models (src/models/)

| Component | Status | Purpose |
|-----------|--------|---------|
| `person.ts` | ✅ Complete | Person note schema and interfaces |
| `place.ts` | ✅ Complete | Place note schema and interfaces |
| `canvas.ts` | ✅ Complete | Canvas JSON type definitions |

---

## Commands (main.ts)

| Command | Status | Purpose |
|---------|--------|---------|
| **Control Center** | | |
| Open Control Center | ✅ Complete | Opens main Control Center modal |
| Generate Tree for Current Note | ✅ Complete | Opens Control Center with current person pre-selected in Tree Output tab |
| Create Person Note | ✅ Complete | Opens Control Center to People tab for creating new person notes |
| **Canvas Operations** | | |
| Regenerate Canvas | ✅ Complete | Recalculates layout for active canvas using current settings |
| Generate All Trees | ✅ Complete | Generates separate canvases for each disconnected family component |
| **Relationship Calculations** | | |
| Calculate Relationship | ✅ Complete | Calculate genealogical relationship between any two people |
| View Relationship History | ✅ Complete | View and undo recent relationship changes |
| Undo Last Relationship | ✅ Complete | Undo the most recent relationship change |
| **Reference Numbering** | | |
| Assign Ahnentafel Numbers | ✅ Complete | Assign Ahnentafel ancestor numbering from selected person |
| Assign d'Aboville Numbers | ✅ Complete | Assign d'Aboville descendant numbering from selected person |
| Assign Henry Numbers | ✅ Complete | Assign Henry system descendant numbering from selected person |
| Assign Generation Numbers | ✅ Complete | Assign relative generation depth from selected person |
| Clear Reference Numbers | ✅ Complete | Remove specific numbering type from all person notes |
| **Lineage Tracking** | | |
| Assign Lineage | ✅ Complete | Assign lineage tags from root person (patrilineal, matrilineal, all) |
| Remove Lineage Tags | ✅ Complete | Remove lineage tags from person notes |
| **Data Quality** | | |
| Fix Bidirectional Relationships | ✅ Complete | Sync all bidirectional relationship links in vault |
| Detect Duplicate People | ✅ Complete | Find potential duplicate person records |
| **Creation** | | |
| Create Family | ✅ Complete | Opens family creation wizard |
| Create Event Note | ✅ Complete | Create a new event note |
| Create Organization Note | ✅ Complete | Create a new organization note |
| Create Source Note | ✅ Complete | Create a new source note |
| Create Note | ✅ Complete | Create a new generic note |
| Create Custom Map | ✅ Complete | Create a custom image map |
| **Editing** | | |
| Edit Current Note | ✅ Complete | Opens appropriate edit modal (person/place/event) for active note |
| Insert Dynamic Blocks | ✅ Complete | Insert dynamic blocks in current note |
| **Views** | | |
| Open Family Chart | ✅ Complete | Open new family chart view |
| Open Family Chart for Note | ✅ Complete | Open family chart centered on current person |
| Open Map View | ✅ Complete | Open new map view |
| Open Statistics Dashboard | ✅ Complete | Open statistics dashboard view |
| Open People/Events/Places/Sources/Organizations/Universes/Collections/Data Quality View | ✅ Complete | Open the corresponding dockable view |
| **Import/Export** | | |
| Add Research Question | ✅ Complete | Add research question to current note |
| Manage Staging Area | ✅ Complete | Open staging area management |
| Open Cleanup Wizard | ✅ Complete | Post-import cleanup |
| Validate Vault Against Schemas | ✅ Complete | Run schema validation across all notes |
| **Trees** | | |
| Split Tree Wizard | ✅ Complete | Split incorrectly connected trees |
| **Places** | | |
| Merge Duplicate Place Notes | ✅ Complete | Merge duplicate places |
| Look Up Place | ✅ Complete | Geocoding lookup |
| Generate Place Notes from Place Strings | ✅ Complete | Bulk place note generation |

---

## Context Menus

| Menu Item | Status | Trigger | Purpose |
|-----------|--------|---------|---------|
| **Person Note Context Menu** | | | |
| "Generate tree" submenu | ✅ Complete | Right-click on person note | Canvas (full options) or Excalidraw (instant) tree generation |
| "Add relationship" submenu | ✅ Complete | Right-click on person note | Add parent, spouse, or child relationships |
| "Reference numbers" submenu | ✅ Complete | Right-click on person note | Assign Ahnentafel, d'Aboville, Henry, or Generation numbers |
| "Assign lineage" submenu | ✅ Complete | Right-click on person note | Assign patrilineal, matrilineal, or all descendants lineage |
| "Calculate relationship" | ✅ Complete | Right-click on person note | Calculate relationship to another person |
| "Validate relationships" | ✅ Complete | Right-click on person note | Check for relationship data integrity issues |
| "Find on canvas" | ✅ Complete | Right-click on person note | Find this person across all canvases |
| "Mark/Unmark as root person" | ✅ Complete | Right-click on person note | Toggle root person status for lineage tracking |
| "Set group name" | ✅ Complete | Right-click on person note | Set custom name for family group |
| "Edit person" | ✅ Complete | Right-click on person note | Open edit modal for person |
| "Link/Manage media" | ✅ Complete | Right-click on person note | Media management submenu |
| "Add source" | ✅ Complete | Right-click on person note | Link source to person |
| "Add essential properties" | ✅ Complete | Right-click on person note | Add all standard person properties |
| "Add cr_id" | ✅ Complete | Right-click on person note | Generate cr_id if missing |
| "Insert dynamic blocks" | ✅ Complete | Right-click on person note | Insert timeline/relationships/media blocks |
| "Open in family chart" | ✅ Complete | Right-click on person note | Open person in interactive family chart |
| **Place Note Context Menu** | | | |
| "Charted Roots" submenu | ✅ Complete | Right-click on place note | Geocode place, view on map, enrich hierarchy |
| **Event Note Context Menu** | | | |
| "Charted Roots" submenu | ✅ Complete | Right-click on event note | Edit event, view timeline |
| **Source Note Context Menu** | | | |
| "Charted Roots" submenu | ✅ Complete | Right-click on source note | Generate citation, view media |
| **Organization Note Context Menu** | | | |
| "Charted Roots" submenu | ✅ Complete | Right-click on organization note | View members, edit organization |
| **Generic Markdown Context Menu** | | | |
| "Add essential properties" | ✅ Complete | Right-click on markdown file(s) | Bulk-add all essential properties for note type |
| **Folder Context Menu** | | | |
| "View folder statistics" | ✅ Complete | Right-click on folder | Comprehensive folder analytics |
| "Scan for relationship issues" | ✅ Complete | Right-click on folder | Check all notes in folder for issues |
| "Import GEDCOM to folder" | ✅ Complete | Right-click on folder | Import GEDCOM file to selected folder |
| "Export folder to GEDCOM" | ✅ Complete | Right-click on folder | Export folder contents to GEDCOM |
| **Canvas Context Menu** | | | |
| "Regenerate canvas" | ✅ Complete | Right-click on canvas file | Recalculates canvas layout |
| "View tree statistics" | ✅ Complete | Right-click on canvas file | View statistics for the tree |
| "Export" submenu | ✅ Complete | Right-click on canvas file | Export to Excalidraw, PNG, SVG, or PDF |
| **Folder Context Menu (extended)** | | | |
| "Add essential person properties" | ✅ Complete | Right-click on People folder | Bulk-add standard properties to all notes |
| "Add cr_id" | ✅ Complete | Right-click on any entity folder | Bulk-generate cr_id for all notes |
| "Insert dynamic blocks" | ✅ Complete | Right-click on People folder | Bulk-insert dynamic blocks |
| "New base from template" | ✅ Complete | Right-click on entity folder | Create Obsidian Base from template |
| "Generate all trees" | ✅ Complete | Right-click on People folder | Generate trees for all components |
| **Multi-file Selection** | | | |
| "Add essential properties" | ✅ Complete | Right-click on selected files | Bulk operations on selected files |
| "Add cr_id" | ✅ Complete | Right-click on selected files | Bulk-generate cr_id for selected files |

---

## Control Center Tabs

| Tab | Status | Purpose |
|-----|--------|---------|
| Dashboard | ✅ Complete | Quick-action tiles, vault health section, recent files with context menu |
| People | ✅ Complete | Person notes table, parent claim conflicts, batch operations, data entry |
| Events | ✅ Complete | Event notes table, timeline export (markdown/canvas), event type management |
| Places | ✅ Complete | Place notes table, place hierarchy, geocoding, place type management |
| Sources | ✅ Complete | Source notes, media gallery, citation generator, proof summaries |
| Organizations | ✅ Complete | Organization notes, membership tracking, organization types |
| Universes | ✅ Complete | Manage fictional universes and worlds |
| Collections | ✅ Complete | Family components and user collections with cross-collection detection |
| Data Quality | ✅ Complete | Comprehensive data quality analysis: orphan refs, duplicates, date issues, bidirectional sync |
| Schemas | ✅ Complete | Validation schemas for note type consistency |
| Relationships | ✅ Complete | Custom relationship type definitions and management |
| Trees & reports | ✅ Complete | Tree generation with layout options, color schemes, interactive preview, export to Canvas/Excalidraw/PNG/SVG |
| Maps | ✅ Complete | Leaflet map view with markers, custom image maps, bulk geocoding |

### Dockable Sidebar Views

13 dockable ItemViews open as persistent sidebar panels or main panes:

| View | View Type | Content |
|------|-----------|---------|
| PeopleView | `charted-roots-people` | Filter/sort/search table with expandable details |
| PlacesView | `charted-roots-places` | Filter/sort/search table with category badges |
| EventsView | `charted-roots-events` | Type/person/search filters, sortable table |
| SourcesView | `charted-roots-sources` | Filter/sort table with type/confidence badges |
| OrganizationsView | `charted-roots-organizations` | Filter/sort table with type badges, member counts |
| RelationshipsView | `charted-roots-relationships` | Table with type badges, filter/sort |
| UniversesView | `charted-roots-universes` | Filter/sort/search table with status badges |
| CollectionsView | `charted-roots-collections` | Mode switcher + corresponding list |
| DataQualityView | `charted-roots-data-quality` | Read-only dashboard with quality score and issues |
| FamilyChartView | `charted-roots-family-chart` | Interactive family chart (family-chart library) |
| MapView | `charted-roots-map` | Leaflet map with markers and popups |
| StatisticsView | `charted-roots-statistics` | Statistics dashboard with charts and breakdowns |
| MigrationNoticeView | `charted-roots-migration-notice` | One-time migration notice for plugin rename |
