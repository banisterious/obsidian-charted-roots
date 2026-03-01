# Control Center Modularization

Planning document for [#239](https://github.com/banisterious/obsidian-charted-roots/discussions/239).

**Status:** ✅ Phase 1 complete | ✅ Phase 2 complete

---

## Overview

Migrate the Control Center from a single ~13,760-line modal (`control-center.ts`) into modular, independently dockable workspace views. This is a two-phase effort: first extract each tab into its own component file (still hosted by the modal), then migrate each component to a standalone `ItemView`.

**Motivation:**
- The Control Center modal has grown to 16 tabs and ~13,760 lines — maintaining it as a monolith is increasingly difficult
- Users have requested persistent, dockable views that can stay open alongside notes (see #239)
- The existing Statistics, Family Chart, and Map views already demonstrate the ItemView pattern successfully

---

## Current State

### Control Center Tabs (16 total)

| Tab | Lines | Extraction Status | Notes |
|-----|-------|-------------------|-------|
| Dashboard | ~14 | ✅ Extracted to `dashboard-tab.ts` (794 lines) | Delegates via `renderDashboardTab()` |
| People | ~265 | ❌ Embedded | Has filter/sort state, relationship field UI |
| Events | ~13 | ✅ Extracted | Delegates to external renderer |
| Places | ~16 | ✅ Extracted to `places-tab.ts` (1,720 lines) | Delegates via `renderPlacesTab()` |
| Sources | ~13 | ✅ Extracted | Delegates to external renderer |
| Organizations | ~13 | ✅ Extracted | Delegates to external renderer |
| Universes | ~310 | ❌ Embedded | Has filter/sort state, embedded table renderer |
| Collections | ~74 | ❌ Embedded | Uses cached services |
| Data Quality | ~325 | ❌ Embedded | Multiple embedded helper classes and modals |
| Schemas | ~178 | ❌ Embedded | Delegates to helpers from `../schemas` |
| Relationships | ~13 | ✅ Extracted | Delegates to external renderer |
| Trees & Reports | ~254 | ❌ Embedded | Complex wizard logic |
| Maps | ~194 | ❌ Embedded | Uses PlaceGraphService |
| Status | ~394 | 🗑️ Legacy (redirects to Dashboard) | Can be removed |
| Guide | ~650 | 🗑️ Legacy (redirects to Dashboard) | Can be removed |
| Statistics | ~14 | 🗑️ Legacy (redirects to Dashboard) | Can be removed |

### Embedded Helper Classes

The following classes are currently defined inside `control-center.ts` and would need to be extracted alongside their parent tabs:

- `PersonTableRenderer` — People tab
- `UniverseTableRenderer` — Universes tab
- `DataQualityAnalyzer` — Data Quality tab
- `ResearchGapsRenderer` — Data Quality tab
- `BidirectionalLinksModal` — Data Quality tab
- `ImpossibleDatesModal` — Data Quality tab
- `OrphanedParentReferencesModal` — Data Quality tab
- `InvalidSexValuesModal` — Data Quality tab
- `MissingCRIDsModal` — Data Quality tab
- `ConfirmationDialog` — shared

### Shared Infrastructure

These remain in `control-center.ts` (or a shared utility) across both phases:

- **Modal shell:** Header, drawer, content container, tab switching
- **`createCard()`** — Card component used by all tabs
- **Cache management:** `getCachedFamilyGraph()`, `getCachedPlaceGraph()`, `getCachedUniverses()`, `invalidateCaches()`
- **Public API:** `openToTab()`, `openWithPerson()`, `openAndGenerateAllTrees()`

### Cross-Tab Navigation

Some tabs navigate to other tabs:

- Data Quality → People, Places, Schemas
- Universes → Events, Places

In Phase 1 (component extraction), these remain as callbacks. In Phase 2 (ItemViews), they would become command invocations or workspace navigation.

---

## Phase 1: Component Extraction ✅

**Goal:** Extract each embedded tab into its own file, following the existing pattern established by `dashboard-tab.ts` and `places-tab.ts`. The Control Center modal remains the host — no user-facing changes.

**Result:** `control-center.ts` reduced from ~13,760 to ~1,451 lines (89% reduction). All 9 extraction commits completed on `feature/control-center-modularization` branch.

### Extraction Pattern

Each extracted tab follows the existing convention:

```typescript
// src/ui/tabs/people-tab.ts
export interface PeopleTabOptions {
    container: HTMLElement;
    plugin: CanvasRootsPlugin;
    app: App;
    createCard: (options: CardOptions) => HTMLElement;
    switchTab: (tabId: string) => void;
    closeModal: () => void;
}

export function renderPeopleTab(options: PeopleTabOptions): void {
    // All rendering logic extracted here
}
```

The modal's `showTab()` dispatcher calls the extracted function:

```typescript
private showPeopleTab(): void {
    renderPeopleTab({
        container: this.contentContainer,
        plugin: this.plugin,
        app: this.app,
        createCard: this.createCard.bind(this),
        switchTab: this.switchTab.bind(this),
        closeModal: () => this.close()
    });
}
```

### File Structure

```
src/ui/
├── control-center.ts            (modal shell + tab switching, greatly reduced)
├── tabs/
│   ├── dashboard-tab.ts         (existing, move from ui/)
│   ├── people-tab.ts
│   ├── events-tab.ts            (existing, consolidate)
│   ├── places-tab.ts            (existing, move from ui/)
│   ├── sources-tab.ts           (existing, consolidate)
│   ├── organizations-tab.ts     (existing, consolidate)
│   ├── universes-tab.ts
│   ├── collections-tab.ts
│   ├── data-quality-tab.ts
│   ├── schemas-tab.ts
│   ├── relationships-tab.ts     (existing, consolidate)
│   ├── tree-generation-tab.ts
│   └── maps-tab.ts
└── shared/
    ├── card-component.ts        (createCard, createStatRow, etc.)
    └── confirmation-dialog.ts
```

### Extraction Order

Ordered by complexity (simplest first):

1. **Schemas** — Already delegates to helpers in `../schemas`, minimal state
2. **Collections** — Small (74 lines), uses cached services
3. **Maps** — Moderate (194 lines), uses PlaceGraphService
4. **Trees & Reports** — Moderate (254 lines), self-contained wizard logic
5. **People** — Moderate (265 lines), has filter/sort state and relationship fields
6. **Universes** — Higher (310 lines), has filter/sort state and embedded table renderer
7. **Data Quality** — Highest (325 lines), multiple embedded helper classes and modals

### Cleanup

- Remove legacy tabs (Status, Guide, Statistics redirects) — dead code
- Extract `createCard()` and shared UI helpers to `shared/card-component.ts`
- Extract `ConfirmationDialog` to `shared/confirmation-dialog.ts`
- Move existing extracted tabs (`dashboard-tab.ts`, `places-tab.ts`) into `tabs/` directory

### Consolidation of Already-Extracted Tabs

Six tabs are already partially extracted (delegating to external render functions). These need to be moved into the `src/ui/tabs/` directory for consistency:

- `dashboard-tab.ts` — move from `src/ui/`
- `places-tab.ts` — move from `src/ui/`
- Events, Sources, Organizations, Relationships — consolidate external renderers into `src/ui/tabs/`

### State Migration

Tab-specific state currently stored as class properties on the modal (e.g., `personListFilter`, `personListSort`, `universeListFilter`) needs to move into the extracted components. Options:

- **Local component state** — each render function manages its own state via closures or a simple state object passed by the host
- **Plugin settings** — persist filter/sort preferences across sessions (needed for Phase 2 ItemViews via `getState()`/`setState()`)

### Verification

Each extraction is a pure refactor — no user-facing behavior should change. After extracting each tab:

1. Open the Control Center and navigate to the extracted tab
2. Verify all UI elements render correctly
3. Test interactive features (filters, sorts, context menus, modals launched from the tab)
4. Verify cross-tab navigation still works (e.g., Data Quality → People)
5. Run `npm run build` to confirm no type errors

---

## Phase 2: ItemView Migration ✅

**Goal:** Create dockable workspace views for entity browsing. Each dockable view contains a **focused subset** of its modal tab — the entity list with filter/sort/search — not a 1:1 clone of the full tab. Actions, batch operations, configuration, statistics, and type managers stay modal-only.

**Result:** 9 dockable ItemViews created (8 entity list views + 1 data quality dashboard). Each view follows a 3-commit pattern: (1) add exported `render*List()`/`render*Dashboard()` function + types, (2) create ItemView class + register in main.ts + CSS, (3) add dock button to card header. All views support state persistence, auto-refresh on vault changes, and single-instance activation.

### Design Principles

1. **Focused subset, not full clone.** Dockable views contain only the browsable entity list (filter/sort/search/table/context menus). Everything else stays in the modal.
2. **Single instance per view type.** Clicking the dock button when a view is already open focuses the existing instance rather than creating a duplicate.
3. **Modal stays open on dock.** The dock button opens/focuses the ItemView without closing the Control Center modal, so users can dock multiple lists in one session.
4. **Modal is not deprecated.** Both the modal and ItemViews share the same extracted tab components. No maintenance overhead from supporting both.

### Dock Button UX

Each dockable card in the Control Center modal gets a small dock button in its card header:

- **Icon:** `panel-right` (Lucide), small, right-aligned in the card header bar
- **Scope:** Only on cards identified as dockable (see table below)
- **On click:** Opens the content as a dockable ItemView; modal stays open
- **Already docked:** Focuses the existing view instance (single-instance)
- **Default placement:** Right sidebar via `getRightLeaf(false)` — entity lists are reference panels used alongside notes, matching Obsidian's Outline/Backlinks convention. Users can drag to the main area if they want more space.

### Dockable Views (9 total)

| Tab | Dockable card | View class | Content in dockable view |
|-----|--------------|------------|--------------------------|
| **People** | People list | `PeopleView` | Filter/sort/search table with expandable details, context menus |
| **Places** | Place notes list | `PlacesView` | Filter/sort/search table with category badges, coordinates, context menus |
| **Events** | Timeline table | `EventsView` | Type/person/search filters, sortable table, context menus |
| **Sources** | Sources list | `SourcesView` | Filter/sort table with type/confidence badges, context menus |
| **Organizations** | Organizations list | `OrganizationsView` | Filter/sort table with type badges, member counts, context menus |
| **Relationships** | Relationships table | `RelationshipsView` | Table with type badges, filter/sort, context menus |
| **Universes** | Universe list | `UniversesView` | Filter/sort/search table with status badges, entity counts, context menus |
| **Collections** | Browse card | `CollectionsView` | Mode switcher (all people / detected families / user collections) + corresponding list |
| **Data Quality** | Vault-wide analysis | `DataQualityView` | Read-only dashboard: research gaps, source conflicts, auto-running vault-wide analysis with quality score, completeness bars, and filterable/searchable issues |

### Modal-Only Tabs (no dockable view)

| Tab | Reason |
|-----|--------|
| **Schemas** | Configuration and validation tooling. No browsable entity list. |
| **Trees & Reports** | Wizard launchers, configuration, export actions. No browsable entity list. |
| **Maps** | Already has a dedicated full ItemView (`map-view.ts`). Modal tab is for management. |
| **Dashboard** | Navigation hub and overview. No entity list. |
| **Preferences** | Deprecated — settings consolidated into Plugin Settings (#176). |

### Relationships Tab Enhancement

The Relationships tab currently has a minimal read-only table (hard-capped at 50 rows, no filter/sort, no context menu). Before or during Phase 2, add:

- Filter dropdown (by type, by category, by person)
- Sort dropdown (by type, by from-person, by to-person, by date)
- Pagination (load more pattern, matching other tabs)
- Context menus on rows

### ItemView Pattern

Each view follows the existing Statistics/Family Chart/Map convention:

```typescript
// src/ui/views/people-view.ts
export const VIEW_TYPE_PEOPLE = 'canvas-roots-people';

export class PeopleView extends ItemView {
    getViewType(): string { return VIEW_TYPE_PEOPLE; }
    getDisplayText(): string { return 'People'; }
    getIcon(): string { return 'users'; }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        // Render only the dockable subset — the people list component
        renderPeopleList({
            container: container as HTMLElement,
            plugin: this.plugin,
            app: this.app,
            // ... adapted options
        });
    }
}
```

### Registration & Commands

Each view gets registered in `main.ts`:

```typescript
this.registerView(VIEW_TYPE_PEOPLE, (leaf) => new PeopleView(leaf, this));
this.addCommand({
    id: 'show-people-view',
    name: 'Show people',
    callback: () => this.activatePeopleView()
});
```

### Cross-Tab Navigation

In Phase 1, tabs navigate via `switchTab('places')` callback. In Phase 2, this becomes workspace navigation:

```typescript
// Open the Places view in the workspace
await this.plugin.activatePlacesView();
```

### State Persistence

Each ItemView persists its filter/sort state via `getState()`/`setState()` so preferences survive across sessions. State to persist:

- Filter selection (e.g., `currentFilter: 'all'`)
- Sort selection (e.g., `currentSort: 'name_asc'`)
- Search query (optional — may be better to clear on reopen)
- Pagination position (reset on reopen)
- For Collections: selected browse mode (`'all' | 'families' | 'collections'`)

### Coexistence with Control Center Modal

The Control Center modal is **not deprecated**. Both the modal and ItemViews share the same extracted tab components (from Phase 1), so there is no maintenance overhead from supporting both. The modal remains available for users who prefer quick, transient access — open, act, close — while ItemViews serve users who want persistent, dockable views for extended sessions.

- The modal hosts components in a drawer layout with tab switching
- ItemViews host the same components as standalone workspace tabs
- Same rendering code, two different shells

### Migration Order

Same order as Phase 1 extraction. Each tab can be migrated independently once its component is extracted.

---

## Open Questions

1. **Workspace layout presets** — Should we provide a "Control Center layout" command that opens all views in a predefined arrangement?
2. ~~**Auto-refresh** — Should entity views auto-refresh when vault files change (like Statistics does), or require manual refresh?~~ **Resolved:** All dockable views auto-refresh on vault changes (debounced 2s).
3. **Navigation hub** — Should Dashboard become a lightweight "home" view that links to all other views?

## Future Work

- **Remove deprecated Preferences tab** — `renderPreferencesTab()` and its helpers can be deleted. Two exported functions (`renderCanvasLayoutCard`, `renderCanvasStylingCard`) are still imported by trees-tab.ts and need relocation first. CSS file (`preferences.css`) must be kept as Plugin Settings uses its classes.
- **Preferences tab cleanup** tracked separately from this modularization effort.
