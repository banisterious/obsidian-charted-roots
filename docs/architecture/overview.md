# Architecture Overview

This document describes the high-level architecture of the Charted Roots Obsidian plugin.

## Table of Contents

- [Plugin Entry Point](#plugin-entry-point)
- [Initialization and Lifecycle](#initialization-and-lifecycle)
- [Module Organization](#module-organization)
- [Service Layer](#service-layer)
- [Plugin Orchestration (src/plugin/)](#plugin-orchestration-srcplugin)
- [Dynamic Content System](#dynamic-content-system)
- [View System](#view-system)
- [Shared Utilities](#shared-utilities)
- [CSS Build System](#css-build-system)

---

## Plugin Entry Point

`main.ts` defines the `CanvasRootsPlugin` class extending Obsidian's `Plugin`. It serves as the orchestration layer — initializing services, registering views, and delegating to extracted modules. After refactoring, main.ts focuses on:

- Service field declarations and initialization
- `onload()` orchestration (calls four registration methods)
- Factory methods (`createFamilyGraphService()`, `createPlaceGraphService()`)
- Public accessors for services needed by UI components
- File modification handler for bidirectional sync

Heavy implementation is extracted to `src/plugin/`.

---

## Initialization and Lifecycle

### onload() Decomposition

The `onload()` method follows a clear initialization sequence:

```
1. Register custom icons
2. Load settings
3. Initialize LoggerFactory with saved log level
4. Initialize core services (in dependency order):
   - FolderFilterService
   - TemplateFilterService (depends on FolderFilter)
   - PersonIndexService (depends on FolderFilter)
   - EventService
   - RecentFilesService
   - MediaService
   - WebClipperService
5. Run migrations (property renames, plugin rename)
6. Add settings tab
7. Trigger Style Settings plugin
8. Call four registration methods:
   - registerViews()
   - registerCodeBlockProcessors()
   - registerCommandsAndEvents()
   - registerContextMenus()
9. Register file modification handler
10. Initialize bidirectional snapshots
11. Initialize relationship history service
```

### Registration Methods

| Method | Purpose | Delegate |
|--------|---------|----------|
| `registerViews()` | Register 15 ItemViews | Inline in main.ts |
| `registerCodeBlockProcessors()` | Register 9 dynamic content blocks (+ legacy aliases) | Inline in main.ts |
| `registerCommandsAndEvents()` | Register 56+ commands | `src/plugin/commands.ts` |
| `registerContextMenus()` | Register file/folder context menus | `src/plugin/context-menus.ts` |

---

## Module Organization

The codebase follows a domain-driven module structure under `src/`:

```
src/
├── core/              # Core business logic and services
├── plugin/            # Plugin orchestration (extracted from main.ts)
│   ├── activation.ts      # View activation methods (14 activator functions)
│   ├── base-templates.ts  # Base template creators (9 functions)
│   ├── bulk-operations.ts # Bulk operation commands (11 operations)
│   ├── commands.ts        # Command registration and event handlers
│   └── context-menus.ts   # File context menu implementation
├── models/            # TypeScript interfaces (person, place, canvas)
├── types/             # Shared type definitions
├── utils/             # Shared utility functions
│
├── sources/           # Evidence & Source Management
├── events/            # Event management
├── dates/             # Custom date systems
├── places/            # Place management
├── organizations/     # Organization management
├── relationships/     # Custom relationship types
├── universes/         # Fictional world management
├── schemas/           # Note validation schemas
├── statistics/        # Statistics and analytics
├── enhancement/       # Data enhancement tools
├── research/          # Research workflow
│
├── reports/           # Report generation (16+ generators)
├── dynamic-content/   # Live code block rendering (9 block types)
├── trees/             # Visual tree generation (SVG/PNG)
├── profile-view/      # Entity Profile View
│
├── gedcom/            # GEDCOM 5.5.1 import/export
├── gedcomx/           # GEDCOM X (FamilySearch) support
├── gramps/            # Gramps XML import/export
├── csv/               # CSV import
├── excalidraw/        # Excalidraw export
├── migration/         # Plugin rename migration
├── integrations/      # Third-party plugin integrations
│
├── maps/              # Map visualizations (Leaflet)
└── ui/                # UI components (modals, views, tabs)
```

Each domain module follows a consistent internal structure:

```
module/
├── services/     # Business logic
├── types/        # Type definitions
├── constants/    # Default values and enums
├── ui/           # UI components
└── index.ts      # Barrel exports
```

---

## Service Layer

Services are initialized in `onload()` and stored as plugin fields. Two patterns exist:

### Singleton Services (on plugin instance)

Created once during `onload()`, shared across the plugin lifetime:

| Service | Field | Purpose |
|---------|-------|---------|
| `FolderFilterService` | `folderFilter` | Configurable folder filtering |
| `TemplateFilterService` | `templateFilter` | Template/example file detection |
| `PersonIndexService` | `personIndex` | Fast person lookup by cr_id/name |
| `EventService` | `eventService` | Event note CRUD and parsing |
| `RecentFilesService` | `recentFilesService` | Recently accessed file tracking |
| `MediaService` | `mediaService` | Media file management |
| `WebClipperService` | `webClipperService` | Web clipper integration |
| `BidirectionalLinker` | `bidirectionalLinker` | Relationship sync |
| `RelationshipHistoryService` | `relationshipHistory` | Undo support |
| `MobileClassManager` | `mobileClassManager` | Attaches `cr-mobile` / `cr-desktop` / `cr-phone` / `cr-tablet` classes to each registered view's container at construction (audit Phase 4a). Consumed by Phase 4b's per-component CSS migration. |

### On-Demand Services (factory methods)

Created when needed, configured with current settings:

| Factory | Service | Purpose |
|---------|---------|---------|
| `createFamilyGraphService()` | `FamilyGraphService` | Build relationship graph from vault |
| `createPlaceGraphService()` | `PlaceGraphService` | Build place hierarchy graph |

The `createFamilyGraphService()` factory is used by 12+ report generators and UI components. It applies the current folder filter and settings to each fresh graph build.

`FamilyGraphService` exposes a **`getQueryService()`** method that returns a `RelationshipQueryService` (constructed once per graph). The query service consolidates the read-side relationship walks — `getChildren()`, `getParents()`, `getSiblings()`, `getSpouses()`, etc. — with an `include: 'bio' | 'adoptive' | 'all'` option so consumers don't reimplement the bio/adoptive/step traversal logic. The `getChildren()` method additionally accepts a `sortByBirthDate: DateService` option which honors the v0.22.46 sibling-sort consolidation. 14+ read sites across reports, visual trees, the family timeline view, and the dynamic-content renderers route through this service (issue [#546](https://github.com/banisterious/obsidian-charted-roots/issues/546) tracks the remaining unmigrated sites). The write-side parallel is post-1.0 work — see audit Phase 6 Arc 1 in `docs/planning/audit-implementation-plan.md`.

### Module-Level Services

Some modules provide their own service constructors:

| Service | Module | Instantiation |
|---------|--------|---------------|
| `RelationshipService` | `src/relationships/` | Created on-demand |
| `OrganizationService` | `src/organizations/` | Created on-demand |
| `SourceService` | `src/sources/` | Created on-demand |
| `EvidenceService` | `src/sources/` | Imported from barrel |
| `ProofSummaryService` | `src/sources/` | Imported from barrel |

---

## Plugin Orchestration (src/plugin/)

Code extracted from main.ts to improve maintainability:

### commands.ts

Exports `registerCommandsAndEvents(plugin)` which registers all 56+ commands via `plugin.addCommand()`. Also registers protocol handlers and workspace events.

### context-menus.ts

Exports `registerContextMenus(plugin)` which registers the `file-menu` event handler. Implements nested submenus on desktop, flat menus on mobile. Handles all entity types (person, place, event, source, organization), folders, canvases, and multi-file selections.

### activation.ts

Exports 14 `activate*View(plugin, ...)` functions that handle the single-instance view activation pattern: check for existing leaf → reveal or create in right sidebar.

### bulk-operations.ts

Exports command handler functions that require vault scanning or multi-file operations (tree generation, reference numbering, lineage assignment, bulk edits, etc.).

### base-templates.ts

Exports 9 functions for creating Obsidian Base template files (People, Places, Events, Sources, Organizations, Universes, Notes, Research, and "create all").

---

## Dynamic Content System

Nine code block processors render live, computed content within notes:

| Block Type | Processor | Purpose |
|------------|-----------|---------|
| `charted-roots-timeline` | `TimelineProcessor` | Event timeline for entity |
| `charted-roots-relationships` | `RelationshipsProcessor` | Relationship table |
| `charted-roots-media` | `MediaProcessor` | Media gallery grid |
| `charted-roots-source-roles` | `SourceRolesProcessor` | Person roles from sources |
| `charted-roots-transfers` | `TransfersProcessor` | Property transfers |
| `charted-roots-members` | `MembersProcessor` | Organization members |
| `charted-roots-sources` | `SourcesProcessor` | Sources table |
| `charted-roots-extractions` | `ExtractionsProcessor` | Source extractions |
| `charted-roots-negative-findings` | `NegativeFindingsProcessor` | Negative research findings |

All processors share infrastructure from `DynamicContentService`:

- **Config parsing**: YAML-like key/value from code block source
- **Block context**: Resolves the current note's entity type and cr_id
- **Error/loading states**: `renderBlockError()`, `renderBlockLoading()`
- **Freeze-to-markdown**: Converts live block to static markdown via gear menu

Legacy `canvas-roots-*` aliases are registered for the first 3 block types (timeline, relationships, media) for backward compatibility.

The Processor/Renderer separation allows the processor to handle Obsidian lifecycle (registering `MarkdownRenderChild`, resolving context) while the renderer handles pure DOM construction.

---

## View System

### ItemViews (15 registered)

Views are registered in `registerViews()` and activated via methods in `src/plugin/activation.ts`:

- **9 entity views**: People, Places, Events, Sources, Organizations, Universes, Collections, Relationships, Data Quality
- **4 specialized views**: Family Chart (family-chart lib), Map (Leaflet), Statistics, Entity Profile
- **2 utility views**: Migration Notice, Statistics Dashboard

Entity views share a pattern: the modal tab has full functionality (batch operations, type managers), while the dockable view exposes a browse-only subset via an extracted `render*List()` function.

Each registered view goes through a `registerCRView` wrapper in `main.ts` that calls `mobileClassManager.applyPlatformClasses(view.containerEl)` after construction. The classes (`cr-mobile` / `cr-desktop` / `cr-phone` / `cr-tablet`) are then available to component stylesheets for class-based scoping — the v0.22.20 [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) Map View fix established that `@media (max-width: 768px)` doesn't fire reliably on Obsidian Mobile, so class-based selectors driven by `Platform.is*` flags are the path forward. Per-component CSS migration to consume these classes is Phase 4b of the audit plan.

### Entity Profile View

A read-only detail view (`src/profile-view/`) that auto-syncs with the active note. Renders sections (identity, relationships, events, sources, data quality) for all 5 entity types. Uses a `sections/` subdirectory for composable section renderers.

---

## Shared Utilities

### Formatting (src/utils/format-utils.ts)

| Function | Purpose | Replaces |
|----------|---------|----------|
| `capitalize(str)` | Capitalize first letter | ~35 inline occurrences |
| `pluralize(count, singular, plural?)` | Singular/plural forms | ~100 inline patterns |
| `splitAndTrim(str, separator?)` | Split, trim, filter empty | ~13 inline chains |
| `formatPronouns(pronouns)` | Format pronoun arrays | Inline formatting |

### Report Utilities (src/reports/services/report-utils.ts)

| Function | Purpose |
|----------|---------|
| `normalizeSex(sex?)` | Canonical sex values (male/female/other/unknown) |
| `nodeToReportPerson(node)` | Convert PersonNode → ReportPerson |

### Dynamic Content (src/dynamic-content/services/dynamic-content-service.ts)

| Function | Purpose |
|----------|---------|
| `renderBlockError(el, message)` | Standard error UI for code blocks |
| `renderBlockLoading(el, message)` | Standard loading UI for code blocks |

### Cache (src/utils/cache-utils.ts)

| Function | Purpose |
|----------|---------|
| `waitForCacheRefresh(app, file, timeoutMs?)` | Wait for `metadataCache.changed` for a file before reading it back after a write. Used by the cache-holding services' `reloadCache(modifiedFiles?)` methods to bridge the gap between synchronous frontmatter writes and Obsidian's asynchronous metadata-cache catch-up. |

### Wikilink (src/utils/wikilink-resolver.ts)

| Function | Purpose |
|----------|---------|
| `extractDisplayLabel(value)` | Strip `[[…]]` brackets, collapse pipe-form to the alias, and collapse path-form to the basename. Used by Edit Person / Edit Organization / Edit Event modal display sites so users see clean labels (`Errol Naberrie`) regardless of how the underlying frontmatter stores the wikilink (`[[path|alias]]` after #540 disambiguation). |
| `unwrapWikilinkDisplay(value)` | Display-safe variant for free-form text fields that *may* contain a wikilink. Delegates to `extractDisplayLabel` only when the input is fully bracket-wrapped; otherwise the trimmed value is returned unchanged so legitimate `/` or `|` characters in free text (e.g., `occupation: "Cook/Server"`) aren't collapsed away. Used by the Family Chart's six free-form text card fields and the info-panel place display (#622). |
| `getCanonicalLinktext(app, file)` | Return the canonical wikilink target for a file: the bare basename when unique in the vault, or the full path (without `.md`) when basename is ambiguous. Used by `createSmartWikilink` across all entity writers to decide whether to emit `[[basename]]` or the disambiguated `[[path|basename]]` form. |

### Platform (src/utils/platform-utils.ts)

| Function | Purpose |
|----------|---------|
| `shouldUseSubmenu()` | Whether the current platform should render submenus (`Platform.isDesktop && !Platform.isMobile`). The dual check handles hybrid platforms that report both flags true; mobile builds collapse submenu items to the top level if asked to render them. Used by the file-menu context handler and the people-tab quick-action menu. |

---

## CSS Build System

Component CSS files live in `styles/` and are concatenated by `build-css.js` into the root `styles.css` that Obsidian loads.

- Component files are listed in the `componentOrder` array in `build-css.js`
- Order matters: variables and theme must come first
- New components must be added to the array to be included
- Class naming follows BEM with `cr-`/`crc-`/`canvas-roots-` prefixes
- Custom properties use `--cr-` or `--md-` prefixes

See [coding-standards.md](../developer/coding-standards.md) for CSS naming conventions.
