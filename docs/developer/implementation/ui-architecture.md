# UI Architecture

This document covers the user interface implementation including context menus, Control Center, and settings.

## Table of Contents

- [Context Menu Implementation](#context-menu-implementation)
  - [File Menu Integration](#file-menu-integration)
  - [Mobile Adaptations](#mobile-adaptations)
- [Control Center Architecture](#control-center-architecture)
  - [Modal Structure](#modal-structure)
  - [Tab System](#tab-system)
  - [Navigation and Routing](#navigation-and-routing)
  - [Public API](#public-api)
  - [Mobile Adaptations](#mobile-adaptations-1)
- [Dockable Views](#dockable-views)
  - [Architecture](#architecture)
  - [Implementation Pattern](#implementation-pattern)
  - [Key Patterns](#key-patterns)
  - [Registration (main.ts)](#registration-maints)
- [Wizard Modals](#wizard-modals)
  - [Map Creation Wizard](#map-creation-wizard)
  - [State Persistence](#state-persistence)
- [Settings and Configuration](#settings-and-configuration)
  - [Settings Interface](#settings-interface)
  - [Type Definitions](#type-definitions)
  - [Settings Tab](#settings-tab)
  - [Default Values](#default-values)

---

## Context Menu Implementation

### File Menu Integration

The plugin adds context menu items when right-clicking on files. The implementation uses nested submenus on desktop and flat menus on mobile for better UX.

**Basic Pattern in main.ts:**

```typescript
this.registerEvent(
  this.app.workspace.on('file-menu', (menu, file) => {
    // Desktop: use nested submenus; Mobile: use flat menu with prefixes
    const useSubmenu = Platform.isDesktop && !Platform.isMobile;

    if (file instanceof TFile && file.extension === 'md') {
      const cache = this.app.metadataCache.getFileCache(file);
      const hasCrId = !!cache?.frontmatter?.cr_id;

      if (hasCrId) {
        menu.addSeparator();

        if (useSubmenu) {
          menu.addItem((item) => {
            const submenu: Menu = item
              .setTitle('Charted Roots')
              .setIcon('git-fork')
              .setSubmenu();

            // Add submenu items...
            submenu.addItem((subItem) => {
              subItem
                .setTitle('Generate Canvas tree')
                .setIcon('layout')
                .onClick(() => {
                  const modal = new ControlCenterModal(this.app, this);
                  modal.openWithPerson(file);
                });
            });
          });
        } else {
          // Mobile: flat menu with prefix
          menu.addItem((item) => {
            item
              .setTitle('Charted Roots: Generate family tree')
              .setIcon('git-fork')
              .onClick(() => {
                const modal = new ControlCenterModal(this.app, this);
                modal.openWithPerson(file);
              });
          });
        }
      }
    }
  })
);
```

**ControlCenterModal.openWithPerson() in control-center.ts:**

```typescript
public openWithPerson(file: TFile): void {
  const cache = this.app.metadataCache.getFileCache(file);
  if (!cache?.frontmatter?.cr_id) {
    new Notice('This note does not have a cr_id field');
    return;
  }

  const crId = cache.frontmatter.cr_id;
  const name = cache.frontmatter.name || file.basename;

  // Store person info for the tab to use when it renders
  this.pendingRootPerson = {
    name,
    crId,
    birthDate: cache.frontmatter.born,
    deathDate: cache.frontmatter.died,
    file
  };

  // Open to Tree Output tab (combines open + tab switch)
  this.openToTab('tree-generation');
}
```

**Note:** The actual implementation in main.ts is more comprehensive, with separate handling for:
- Canvas files (regenerate, export, statistics)
- Person notes (generate tree, add relationships, reference numbers)
- Place notes (geocode, view on map)
- Source/Event/Organization notes
- Schema notes
- Folders (import/export, statistics)

### Mobile Adaptations

On mobile devices, the plugin adapts its UI patterns for touch interaction:

**Context Menus:**
- Desktop: Nested submenus under a "Charted Roots" parent item
- Mobile: Flat menu with prefixed items (e.g., "Charted Roots: Generate family tree")

**Control Center Modal:**
- Desktop: Fixed sidebar with navigation drawer always visible
- Mobile: Full-screen modal with slide-in drawer navigation

```typescript
// Mobile detection in control-center.ts
private isMobileMode(): boolean {
  return Platform.isMobile || document.body.classList.contains('is-mobile');
}

// Apply mobile classes for CSS targeting
if (this.isMobileMode()) {
  this.drawer.addClass('crc-drawer--mobile');
  this.modalEl.addClass('crc-mobile-mode');
}
```

**Mobile-specific behaviors:**
- Navigation drawer slides in from left, with backdrop overlay
- Drawer auto-closes after tab selection
- Mobile menu toggle button in header
- Touch-friendly tap targets (44px minimum)
- Form inputs use 16px font to prevent iOS zoom

See [Mobile Styling](../styling.md#mobile-styling) for CSS implementation details.

---

## Control Center Architecture

The Control Center (`src/ui/control-center.ts`) is the primary user interface for Charted Roots, providing a centralized modal with 13 tabs organized into navigation groups, plus a Tools group with 6 modal/leaf launchers. After Phase 1 modularization, the modal shell delegates tab rendering to extracted component files. Nine entity tabs have dockable sidebar ItemViews (see [Dockable Views](#dockable-views)).

### Modal Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [≡]  Charted Roots Control Center            [Tab Title]   │  ← Sticky Header
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────┐  │
│  │Dashboard │  │                                         │  │
│  │ People   │  │                                         │  │
│  │ Events   │  │         Content Area                    │  │
│  │ Places   │  │                                         │  │
│  │ Sources  │  │         (Tab-specific content)          │  │
│  │ Orgs     │  │                                         │  │
│  │ Data Qly │  │                                         │  │
│  │ Schemas  │  │                                         │  │
│  │ ...      │  │                                         │  │
│  └──────────┘  └─────────────────────────────────────────┘  │
│   Drawer              Content Container                      │
└─────────────────────────────────────────────────────────────┘
```

**Key DOM elements:**

```typescript
class ControlCenterModal extends Modal {
  private drawer: HTMLElement;           // Navigation sidebar
  private contentContainer: HTMLElement; // Tab content area
  private appBar: HTMLElement;           // Sticky header
  private drawerBackdrop: HTMLElement;   // Mobile overlay

  private activeTab: string = 'dashboard';  // Current tab ID
}
```

**CSS class convention:** All Control Center classes use the `crc-` prefix (Charted Roots Control center).

### Tab System

Tabs and navigation groups are defined in `src/ui/lucide-icons.ts`:

```typescript
type NavGroup = 'dashboard' | 'entities' | 'data-structure' | 'output' | 'tools' | 'settings';

interface TabConfig {
  id: string;         // URL-safe identifier
  name: string;       // Display name
  icon: LucideIconName;
  description: string;
  group: NavGroup;    // Navigation group for drawer organization
}

export const TAB_CONFIGS: TabConfig[] = [
  { id: 'dashboard', name: 'Dashboard', icon: 'home', description: '...', group: 'dashboard' },
  { id: 'people', name: 'People', icon: 'users', description: '...', group: 'entities' },
  // ... 11 more tabs
];
```

**Navigation groups:**

| Group ID | Label | Contents |
|----------|-------|----------|
| `dashboard` | *(none)* | Dashboard tab |
| `entities` | Entities | People, Events, Places, Sources, Organizations, Universes, Collections |
| `data-structure` | Data & Structure | Data quality, Schemas, Relationships |
| `output` | Output | Trees & reports, Maps |
| `tools` | Tools | 6 tool entries (see below) |

**All 13 tabs:**

| Tab ID | Name | Group | Purpose | Dockable |
|--------|------|-------|---------|----------|
| `dashboard` | Dashboard | dashboard | Quick-action tiles, vault health, recent files | — |
| `people` | People | entities | Person notes list, batch operations | ✓ |
| `events` | Events | entities | Event notes, date systems, timelines | ✓ |
| `places` | Places | entities | Place notes, geocoding, hierarchy | ✓ |
| `sources` | Sources | entities | Source notes, citations, media | ✓ |
| `organizations` | Organizations | entities | Organization notes | ✓ |
| `universes` | Universes | entities | Fictional universe management | ✓ |
| `collections` | Collections | entities | Family groups, custom collections | ✓ |
| `data-quality` | Data quality | data-structure | Issue detection, batch fixes | ✓ |
| `schemas` | Schemas | data-structure | Validation schemas | — |
| `relationships` | Relationships | data-structure | Custom relationship types | ✓ |
| `tree-generation` | Trees & reports | output | Canvas/chart generation, report wizard | — |
| `maps` | Maps | output | Map views, custom image maps | — |

**Tools group:**

The Tools group renders modal/leaf launchers (not tabs) in the navigation drawer, marked with an external indicator (↗). Defined in `TOOL_CONFIGS`:

| Tool ID | Name | Action |
|---------|------|--------|
| `templates` | Templates | Opens template snippets modal |
| `media-manager` | Media Manager | Opens media manager modal |
| `family-chart` | Family Chart | Opens interactive family chart view |
| `import-export` | Import/Export | Opens import/export hub modal |
| `statistics` | Statistics | Opens statistics dashboard view |
| `create-family` | Create Family | Opens family creation wizard |

**Removed in Phase 1 modularization (v0.20.0):** Status, Guide, Statistics tabs (legacy redirect tabs). Preferences tab consolidated into Plugin Settings (#176).

**Dashboard layout:**

The Dashboard tab (`src/ui/dashboard-tab.ts`) displays several sections:

1. **Quick Actions** — 12 tiles in a responsive grid (3 rows × 4):
   - Row 1 (entity creation): Person, Event, Place, Source
   - Row 2 (family & visualization): Family, Family Chart, Canvas Trees, Map
   - Row 3 (analysis & utilities): Reports Wizard, Stats & Reports, Media, Import/Export
2. **Dockable Views** — 9 tiles that open sidebar ItemViews (People, Places, Events, Sources, Organizations, Relationships, Universes, Collections, Data quality)
3. **Staging** — Shows staged imports and clipped notes (if any)
4. **Recent** — Recently accessed files
5. **Vault Health** — Collapsible vault statistics via `VaultStatsService`

### Navigation and Routing

**Tab switching:**

```typescript
private showTab(tabId: string): void {
  this.contentContainer.empty();

  switch (tabId) {
    case 'dashboard':
      void this.showDashboardTab();
      break;
    case 'people':
      void this.showPeopleTab();
      break;
    // ... 11 more cases
    default:
      this.showPlaceholderTab(tabId);
  }
}
```

**Drawer navigation:**

```typescript
private createNavigationDrawer(container: HTMLElement): void {
  this.drawer = container.createDiv({ cls: 'crc-drawer' });

  for (const tab of TAB_CONFIGS) {
    const navItem = this.drawer.createDiv({ cls: 'crc-nav-item' });
    setLucideIcon(navItem.createSpan(), tab.icon);
    navItem.createSpan({ text: tab.name });

    navItem.addEventListener('click', () => {
      this.activeTab = tab.id;
      this.updateActiveNavItem();
      this.showTab(tab.id);
    });
  }
}
```

**Active state management:**

```typescript
private updateActiveNavItem(): void {
  const navItems = this.drawer.querySelectorAll('.crc-nav-item');
  navItems.forEach((item, index) => {
    item.toggleClass('crc-nav-item--active', TAB_CONFIGS[index].id === this.activeTab);
  });
}
```

### Public API

The Control Center exposes methods for programmatic access:

```typescript
// Open to a specific tab
public openToTab(tabId: string): void {
  this.activeTab = tabId;
  this.open();
}

// Open with a person pre-selected for tree generation
public openWithPerson(file: TFile): void {
  const cache = this.app.metadataCache.getFileCache(file);
  const crId = cache?.frontmatter?.cr_id;

  this.pendingRootPerson = {
    name: cache.frontmatter.name || file.basename,
    crId,
    birthDate: cache.frontmatter.born,
    deathDate: cache.frontmatter.died,
    file
  };

  this.openToTab('tree-generation');
}

// Generate trees for all disconnected family components
public async openAndGenerateAllTrees(): Promise<void> {
  const components = graphService.findAllFamilyComponents();
  // Creates separate canvases for each family group
}
```

**Usage from main.ts:**

```typescript
// Context menu integration
menu.addItem((item) => {
  item.setTitle('Generate Canvas tree')
      .onClick(() => {
        const modal = new ControlCenterModal(this.app, this);
        modal.openWithPerson(file);
      });
});

// Command palette
this.addCommand({
  id: 'open-control-center',
  name: 'Open Control Center',
  callback: () => new ControlCenterModal(this.app, this).open()
});
```

### Mobile Adaptations

The Control Center adapts its layout for mobile devices:

```typescript
private isMobileMode(): boolean {
  return Platform.isMobile || document.body.classList.contains('is-mobile');
}

// Applied during modal creation
if (this.isMobileMode()) {
  this.drawer.addClass('crc-drawer--mobile');
  this.modalEl.addClass('crc-mobile-mode');
}
```

**Mobile-specific behaviors:**

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Drawer | Always visible sidebar | Slide-in overlay with backdrop |
| Modal size | 90vw × 85vh | Full screen (100vw × 100vh) |
| Tab selection | Click shows content | Click shows content + auto-closes drawer |
| Menu toggle | Hidden | Visible hamburger button |

**Drawer toggle:**

```typescript
private openMobileDrawer(): void {
  this.drawer.addClass('crc-drawer--open');
  this.drawerBackdrop.addClass('crc-backdrop--visible');
}

private closeMobileDrawer(): void {
  this.drawer.removeClass('crc-drawer--open');
  this.drawerBackdrop.removeClass('crc-backdrop--visible');
}

// Auto-close after tab selection on mobile
if (Platform.isMobile) {
  this.closeMobileDrawer();
}
```

---

## Dockable Views

Fourteen registered ItemViews provide persistent sidebar panels and dedicated views. Nine entity tabs have corresponding dockable views that share extracted tab components with the modal. The Entity Profile View provides auto-syncing single-entity detail (see [Profile View](profile-view.md)). Four additional views serve specialized purposes (family chart, map, statistics, migration notice).

**All registered views:**

| View Type Constant | View Type ID | Source |
|---|---|---|
| `VIEW_TYPE_PEOPLE` | `canvas-roots-people` | `src/ui/views/people-view.ts` |
| `VIEW_TYPE_EVENTS` | `canvas-roots-events` | `src/dates/ui/events-view.ts` |
| `VIEW_TYPE_PLACES` | `canvas-roots-places` | `src/ui/views/places-view.ts` |
| `VIEW_TYPE_SOURCES` | `canvas-roots-sources` | `src/sources/ui/sources-view.ts` |
| `VIEW_TYPE_ORGANIZATIONS` | `canvas-roots-organizations` | `src/organizations/ui/organizations-view.ts` |
| `VIEW_TYPE_UNIVERSES` | `canvas-roots-universes` | `src/universes/ui/universes-view.ts` |
| `VIEW_TYPE_COLLECTIONS` | `canvas-roots-collections` | `src/ui/collections-view.ts` |
| `VIEW_TYPE_DATA_QUALITY` | `canvas-roots-data-quality` | `src/ui/data-quality-view.ts` |
| `VIEW_TYPE_RELATIONSHIPS` | `canvas-roots-relationships` | `src/relationships/ui/relationships-view.ts` |
| `VIEW_TYPE_FAMILY_CHART` | `canvas-roots-family-chart` | `src/ui/views/family-chart-view.ts` |
| `VIEW_TYPE_MAP` | `canvas-roots-map` | `src/maps/map-view.ts` |
| `VIEW_TYPE_STATISTICS` | `canvas-roots-statistics` | `src/statistics.ts` |
| `VIEW_TYPE_MIGRATION_NOTICE` | `canvas-roots-migration-notice` | `src/ui/views/migration-notice-view.ts` |
| `VIEW_TYPE_ENTITY_PROFILE` | `charted-roots-entity-profile` | `src/profile-view/profile-view.ts` |

> **Note:** View type IDs still use the `canvas-roots-` prefix for backwards compatibility with existing workspace layouts. The `charted-roots-` prefix is used for dynamic content blocks and new registrations (e.g., the Entity Profile View).

### Architecture

```
Modal Tab (full feature set)          Dockable View (browse-only subset)
┌────────────────────────┐           ┌────────────────────────┐
│ renderPeopleTab()      │           │ PeopleView extends     │
│ - Entity list          │ shared ←→ │   ItemView             │
│ - Batch operations     │ renderer  │ - renderPeopleList()   │
│ - Configuration        │           │ - Filter/sort/search   │
│ - Statistics           │           │ - Context menus        │
│ - Type managers        │           │ - State persistence    │
└────────────────────────┘           └────────────────────────┘
```

### Implementation Pattern

Each dockable view follows a 3-commit pattern:

1. **Add `render*List()` function** — Exported from the tab file, contains the browsable entity list with closure-scoped state
2. **Create ItemView class** — Registered in `main.ts` with command, CSS in `styles/`
3. **Add dock button** — `panel-right` icon in the modal card header, calls `plugin.activate*View()`

### Key Patterns

- **Single instance**: `getLeavesOfType()` checks for existing view; `revealLeaf()` focuses it
- **Default placement**: `getRightLeaf(false)` — right sidebar, matching Obsidian conventions
- **State persistence**: `getState()`/`setState()` for filter/sort/search across sessions
- **Auto-refresh**: Vault change listeners (modify/create/delete) with 2s debounce
- **CSS prefix**: `cr-XX-` pattern (e.g., `cr-pv-` for People View, `cr-dqv-` for Data Quality View)

### Registration (main.ts)

```typescript
this.registerView(VIEW_TYPE_PEOPLE, (leaf) => new PeopleView(leaf, this));
this.addCommand({
    id: 'open-people-view',
    name: 'Open people',
    callback: () => this.activatePeopleView()
});

async activatePeopleView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PEOPLE);
    if (existing.length) {
        this.app.workspace.revealLeaf(existing[0]);
        return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_PEOPLE, active: true });
    }
}
```

---

## Wizard Modals

Charted Roots uses multi-step wizard modals for complex workflows that benefit from guided step-by-step completion.

### Map Creation Wizard

`CreateMapWizardModal` (`src/ui/create-map-wizard-modal.ts`) provides a 4-step workflow for creating custom image maps with interactive place marker placement.

**Modal structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  Create Custom Map                              Step 2 of 4 │  ← Header with progress
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │              Step-specific content                      ││
│  │              (form, image preview, etc.)                ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  [Back]                                    [Next] / [Create]│  ← Navigation footer
└─────────────────────────────────────────────────────────────┘
```

**Step flow:**

| Step | Content | Validation |
|------|---------|------------|
| 1. Select Image | File browser, image preview | Image must be selected |
| 2. Configure Map | Name, universe, coordinate system, bounds | Name required, valid bounds |
| 3. Place Markers | Interactive click-to-place on image preview | Optional (can skip) |
| 4. Review | Configuration summary, place list | Confirmation only |

**Key implementation patterns:**

```typescript
class CreateMapWizardModal extends Modal {
  private currentStep: number = 1;
  private state: WizardState;

  private renderStep(): void {
    this.contentEl.empty();

    switch (this.currentStep) {
      case 1: this.renderImageSelectionStep(); break;
      case 2: this.renderConfigurationStep(); break;
      case 3: this.renderPlaceMarkersStep(); break;
      case 4: this.renderReviewStep(); break;
    }

    this.renderNavigationFooter();
  }

  private canProceed(): boolean {
    // Step-specific validation
    switch (this.currentStep) {
      case 1: return !!this.state.imagePath;
      case 2: return !!this.state.mapName && this.validateBounds();
      default: return true;
    }
  }
}
```

**Place marker placement (Step 3):**

The wizard renders the map image in a scrollable container. Click events create markers:

```typescript
imageContainer.addEventListener('click', (e) => {
  const rect = imageEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Convert to map coordinates
  const coords = this.domToMapCoordinates(x, y);

  // Open Create Place modal with pre-filled coordinates
  const placeModal = new CreatePlaceModal(this.app, this.plugin, {
    prefillCoordinates: coords,
    universe: this.state.universe,
    onSave: (place) => {
      this.state.places.push({ ...place, x, y });
      this.renderPlaceMarkers();
    }
  });
  placeModal.open();
});
```

**Coordinate system conversion:**

The wizard preview uses DOM coordinates (Y=0 at top), but Leaflet Simple CRS uses Y=0 at bottom. Coordinates are flipped when storing and rendering:

```typescript
// Storing: DOM → Leaflet
storedY = imageHeight - domY;

// Rendering: Leaflet → DOM
domY = imageHeight - storedY;
```

### State Persistence

Wizard state is persisted via `ModalStatePersistence` (`src/ui/modal-state-persistence.ts`) to allow resuming interrupted sessions.

**How it works:**

```typescript
// On modal close (without completing)
onClose(): void {
  if (!this.completed) {
    ModalStatePersistence.save('create-map-wizard', this.state);
  }
}

// On modal open
onOpen(): void {
  const savedState = ModalStatePersistence.get('create-map-wizard');
  if (savedState) {
    // Show resume prompt
    this.showResumeDialog(savedState);
  }
}
```

**Resume dialog:**

When reopening a wizard with saved state, users see a prompt:

```
┌─────────────────────────────────────────────┐
│  Resume previous session?                    │
│                                              │
│  You have an incomplete map creation from    │
│  your last session:                          │
│  • Image: maps/middle-earth.png              │
│  • Name: Middle-earth                        │
│  • Places: 3 markers                         │
│                                              │
│  [Start Fresh]              [Resume Session] │
└─────────────────────────────────────────────┘
```

**State cleanup:**

```typescript
// Clear state on successful completion
private async createMap(): Promise<void> {
  await this.doCreateMap();
  ModalStatePersistence.clear('create-map-wizard');
  this.completed = true;
  this.close();
}
```

---

## Settings and Configuration

Plugin settings are managed through `src/settings.ts`, which defines the settings interface, type definitions, and the Obsidian Settings tab.

### Settings Interface

`CanvasRootsSettings` contains 150+ properties organized by category:

```typescript
export interface CanvasRootsSettings {
  // === Layout & Sizing ===
  defaultNodeWidth: number;
  defaultNodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;

  // === Folder Locations ===
  peopleFolder: string;
  placesFolder: string;
  eventsFolder: string;
  sourcesFolder: string;
  organizationsFolder: string;
  universesFolder: string;
  mapsFolder: string;
  schemasFolder: string;
  canvasesFolder: string;
  reportsFolder: string;
  timelinesFolder: string;
  basesFolder: string;
  stagingFolder: string;

  // === Canvas Styling ===
  parentChildArrowStyle: ArrowStyle;
  spouseArrowStyle: ArrowStyle;
  nodeColorScheme: ColorScheme;
  parentChildEdgeColor: CanvasColor;
  spouseEdgeColor: CanvasColor;
  showSpouseEdges: boolean;
  spouseEdgeLabelFormat: SpouseEdgeLabelFormat;
  defaultLayoutType: LayoutType;

  // === Data Sync ===
  enableBidirectionalSync: boolean;
  syncOnFileModify: boolean;
  autoGenerateCrId: boolean;

  // === Privacy ===
  enablePrivacyProtection: boolean;
  livingPersonAgeThreshold: number;
  privacyDisplayFormat: 'living' | 'private' | 'initials' | 'hidden';
  hideDetailsForLiving: boolean;

  // === Import/Export ===
  exportFilenamePattern: string;
  preferredGedcomVersion: '5.5.1' | '7.0';
  lastGedcomExport?: LastExportInfo;
  // ... more export tracking

  // === Folder Filtering ===
  folderFilterMode: FolderFilterMode;
  excludedFolders: string[];
  includedFolders: string[];
  enableStagingIsolation: boolean;

  // === Type Management ===
  customRelationshipTypes: RelationshipTypeDefinition[];
  customEventTypes: EventTypeDefinition[];
  customSourceTypes: SourceTypeDefinition[];
  customOrganizationTypes: OrganizationTypeDefinition[];
  customPlaceTypes: PlaceTypeDefinition[];
  // ... show/hide built-ins, customizations, hidden items

  // === Aliases ===
  propertyAliases: Record<string, string>;
  valueAliases: ValueAliasSettings;

  // === Logging ===
  logLevel: LogLevel;
  logExportPath: string;
  obfuscateLogExports: boolean;

  // === Feature Flags ===
  enableFictionalDates: boolean;
  enableRelationshipHistory: boolean;
  trackFactSourcing: boolean;
  showResearchGapsInStatus: boolean;

  // === Media ===
  mediaFolders: string[];           // Folders to scan for media files
  enableMediaFolderFilter: boolean; // Whether to limit scanning to specified folders
  frozenGalleryCalloutType: string; // Callout type for frozen galleries (default: 'info')

  // === Note Detection ===
  noteTypeDetection: NoteTypeDetectionSettings;

  // === Data Quality ===
  sexNormalizationMode: SexNormalizationMode;
  dateFormatStandard: 'iso8601' | 'gedcom' | 'flexible';
  allowPartialDates: boolean;
  allowCircaDates: boolean;
  allowDateRanges: boolean;

  // === History ===
  recentTrees: RecentTreeInfo[];
  recentImports: RecentImportInfo[];
  historyRetentionDays: number;
}
```

### Type Definitions

Settings use TypeScript union types for constrained options:

```typescript
// Arrow styling
export type ArrowStyle = 'directed' | 'bidirectional' | 'undirected';

// Node coloring schemes
export type ColorScheme = 'sex' | 'generation' | 'collection' | 'monochrome';

// Obsidian's 6 canvas colors
export type CanvasColor = '1' | '2' | '3' | '4' | '5' | '6' | 'none';

// Layout algorithms
export type LayoutType = 'standard' | 'compact' | 'timeline' | 'hourglass';

// Folder scanning modes
export type FolderFilterMode = 'disabled' | 'exclude' | 'include';

// Sex value normalization
export type SexNormalizationMode = 'standard' | 'schema-aware' | 'disabled';

// Spouse edge labels
export type SpouseEdgeLabelFormat = 'none' | 'date-only' | 'date-location' | 'full';
```

**Tracking interfaces:**

```typescript
interface RecentTreeInfo {
  canvasPath: string;
  canvasName: string;
  peopleCount: number;
  edgeCount: number;
  rootPerson: string;
  timestamp: number;
}

interface LastExportInfo {
  timestamp: number;
  peopleCount: number;
  destination: 'download' | 'vault';
  filePath?: string;
  privacyExcluded?: number;
}
```

### Settings Tab

All plugin configuration is managed through the Obsidian Settings Tab (`CanvasRootsSettingTab` in `src/settings.ts`), accessed via Settings → Community Plugins → Charted Roots. The settings tab uses collapsible `<details>` sections with a search/filter box:

**Sections:**

| Section | Contents |
|---------|----------|
| Folders | Entity folders, output folders, staging folder |
| Data & Detection | Bidirectional sync, note type detection, cr_id generation |
| Canvas & Trees | Layout, spacing, node colors, edge styles |
| Dates & Validation | Date format, partial/circa/range dates |
| Sex & Gender | Sex normalization mode, color assignments |
| Places | Geocoding provider, coordinate display |
| Property & Value Aliases | Custom property aliases, value aliases |
| Advanced | Logging level, log export, obfuscation |

> **Note:** The Preferences tab was removed in v0.20.0 (#176). All settings were consolidated into the Plugin Settings tab. The file `preferences-tab.ts` still exists but is no longer rendered as a Control Center tab.

### Default Values

`DEFAULT_SETTINGS` provides initial values for all settings:

```typescript
export const DEFAULT_SETTINGS: CanvasRootsSettings = {
  // Layout
  defaultNodeWidth: 250,
  defaultNodeHeight: 120,
  horizontalSpacing: 300,
  verticalSpacing: 200,

  // Folders
  peopleFolder: 'People',
  placesFolder: 'Places',
  eventsFolder: 'Events',
  sourcesFolder: 'Sources',
  organizationsFolder: 'Organizations',
  universesFolder: 'Universes',
  mapsFolder: 'Maps',
  schemasFolder: 'Schemas',
  canvasesFolder: 'Charted Roots',
  reportsFolder: 'Reports',
  timelinesFolder: 'Timelines',
  basesFolder: 'Charted Roots/Bases',
  stagingFolder: 'Staging',

  // Styling
  parentChildArrowStyle: 'directed',
  spouseArrowStyle: 'undirected',
  nodeColorScheme: 'sex',
  defaultLayoutType: 'standard',

  // Sync
  enableBidirectionalSync: true,
  syncOnFileModify: true,
  autoGenerateCrId: true,

  // Privacy
  enablePrivacyProtection: true,
  livingPersonAgeThreshold: 100,
  privacyDisplayFormat: 'living',
  hideDetailsForLiving: true,

  // Logging
  logLevel: 'info',
  obfuscateLogExports: true,

  // Media
  mediaFolders: [],                // Empty = scan entire vault
  enableMediaFolderFilter: false,  // Disabled by default
  frozenGalleryCalloutType: 'info',

  // Type management
  customRelationshipTypes: [],
  customEventTypes: [],
  showBuiltInRelationshipTypes: true,
  showBuiltInEventTypes: true,
  // ... all empty/true defaults for type management
};
```

**Settings persistence:**

```typescript
// In main.ts
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings);
}
```
