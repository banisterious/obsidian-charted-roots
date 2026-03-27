# Entity Profile View

Implementation guide for the Entity Profile View — a dockable sidebar view that auto-syncs to the active note and displays entity-specific sections for all five entity types.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [File Structure](#file-structure)
  - [View Registration](#view-registration)
  - [Auto-sync Mechanism](#auto-sync-mechanism)
  - [Data Loading](#data-loading)
- [Section Infrastructure](#section-infrastructure)
  - [Collapsible Section Base](#collapsible-section-base)
  - [Section Renderers](#section-renderers)
  - [Sections by Entity Type](#sections-by-entity-type)
- [Identity Header](#identity-header)
- [Navigation](#navigation)
  - [Breadcrumb Bar](#breadcrumb-bar)
  - [Entity Links](#entity-links)
  - [Pin/Unpin](#pinunpin)
- [State Persistence](#state-persistence)
- [Context Menu Integration](#context-menu-integration)
- [Inline Editing](#inline-editing)
- [CSS Architecture](#css-architecture)
- [Key Design Decisions](#key-design-decisions)

---

## Overview

The Profile View (`VIEW_TYPE_ENTITY_PROFILE`) is a single `ItemView` that provides a focused workspace for any entity (person, place, event, source, organization). It auto-syncs to the active note, rendering entity-type-specific sections with a sticky identity header and collapsible detail sections below. Identity header fields support inline editing with immediate frontmatter persistence.

**Motivation:** Existing workflows are entity-type-centric (People tab, Events tab, Sources tab), but real work cuts across types. The Profile View keeps all related data visible together in collapsible sections, enabling deep work on a single entity without tab-hopping.

**Key differences from other dockable views:**

| Aspect | Browser views (People, Events, etc.) | Profile View |
|--------|--------------------------------------|--------------|
| Content | Entity list (table) | Single entity detail |
| Sync | Manual refresh on vault changes | Auto-sync to active note |
| Instances | Single instance per type | Multiple instances allowed (pinned) |
| Data source | One service per view | Multiple services per entity type |

---

## Architecture

### File Structure

```
src/profile-view/
  profile-view.ts              # ProfileView class (ItemView subclass)
  profile-data-loader.ts       # Coordinated data loading, single-entity cache
  profile-types.ts             # Shared types (discriminated union, view state, inline edit types)
  inline-edit.ts               # Click-to-edit field utilities (single-active-field tracking)
  sections/
    section-base.ts            # Collapsible section infrastructure (lazy render, keyboard nav)
    identity-section.ts        # Sticky header with editable fields (all entity types)
    relationships-section.ts   # Family + other relationships (person)
    events-section.ts          # Events list (person, place, organization)
    sources-section.ts         # Sources list (person, place, organization)
    citations-section.ts       # Citation notes grouped by source (person)
    media-section.ts           # Media thumbnail grid (all entity types)
    data-quality-section.ts    # Research level, coverage, questions (person)
    participants-section.ts    # Event participants (event)
    members-section.ts         # Organization members (organization)
    map-preview-section.ts     # Embedded Leaflet map preview (place)
    referenced-facts-section.ts # Source referenced facts (source)
```

### View Registration

```typescript
// main.ts
import { ProfileView, VIEW_TYPE_ENTITY_PROFILE } from './src/profile-view/profile-view';

this.registerView(
    VIEW_TYPE_ENTITY_PROFILE,
    (leaf) => new ProfileView(leaf, this)
);

this.addCommand({
    id: 'open-entity-profile',
    name: 'Open entity profile',
    callback: () => this.activateProfileView()
});
```

The `activateProfileView(file?)` method differs from other activate methods:
- Finds an existing **unpinned** profile leaf (not just any leaf of the type)
- Falls back to creating a new leaf in the right sidebar
- Optionally accepts a `TFile` to navigate the profile to a specific entity

### Auto-sync Mechanism

The view listens for `active-leaf-change` to detect note switches:

```
active-leaf-change → 150ms debounce → detectNoteType() → loadAndRenderEntity()
```

**Guards:**
- **Same-entity guard**: If the resolved entity's `cr_id` matches `this.currentEntityCrId`, skip re-render entirely
- **Non-entity notes**: When the active note is not a recognized entity, the view freezes on the last displayed entity and shows a "Not following" stale badge
- **Pinned instances**: Pinned views ignore `active-leaf-change` entirely

The view also registers `vault.on('modify')` with 2000ms debounce for the current entity's file, triggering a re-load when frontmatter changes.

Entity type detection uses `detectNoteType()` from `src/utils/note-type-detection.ts` with `isPersonNote()` fallback for legacy person notes without explicit `cr_type`.

### Data Loading

`ProfileDataLoader` coordinates parallel service calls per entity type with a single-entity cache keyed by `crId`:

**Service access patterns per entity type:**

| Entity type | Services used |
|-------------|--------------|
| Person | FamilyGraphService, EventService, RelationshipService, MembershipService, EvidenceService, ProofSummaryService, MediaService |
| Place | PlaceGraphService, EventService, MediaService |
| Event | EventService, MediaService |
| Source | SourceService, vault-wide `sourced_*` scan, MediaService |
| Organization | OrganizationService, MembershipService, EventService, MediaService |

**Source referenced facts:** The data loader adapts the vault-scanning logic from `ExtractionsProcessor.gatherExtractions()` (`src/dynamic-content/processors/extractions-processor.ts`) to find entities that cite a source via `sourced_*` frontmatter properties. This is the most expensive query — it scans all markdown files in the vault.

**Cache invalidation:** The single-entity cache (`lastLoadedCrId` / `lastLoadedData`) is invalidated by `ProfileDataLoader.invalidate(crId)`, called from the view's vault modify listener.

---

## Section Infrastructure

### Collapsible Section Base

`renderProfileSection(parent, options)` creates the shared DOM structure:

```
.cr-profile__section
  .cr-profile__section-header  (clickable)
    .cr-profile__section-chevron  (rotates 90deg on expand)
    .cr-profile__section-icon     (optional Lucide icon)
    .cr-profile__section-title    ("Relationships")
    .cr-profile__section-summary  ("3 family, 2 other" — hidden when expanded)
  .cr-profile__section-content    (hidden by default, shown when expanded)
```

Toggle works via CSS class `.cr-profile__section--expanded` on the section wrapper. State changes call `onToggle(sectionId, expanded)` so the view persists section state.

**Lazy rendering:** Optional `contentRenderer` callback defers DOM population until first expand. When provided, the content div starts empty for collapsed sections. On first expand, `childElementCount === 0` triggers the renderer. An optional `onCollapse` callback handles cleanup (used by the Leaflet map preview to free resources). Callers that don't use these options work identically to before.

**Keyboard navigation:** Section headers have `tabindex="0"`, `role="button"`, and `aria-expanded` attributes. A `keydown` handler implements the WAI-ARIA accordion pattern: ArrowUp/Down moves focus between headers (wrapping), Enter/Space toggles, Home/End jumps to first/last.

### Section Renderers

Each section is a standalone exported function following the pattern:

```typescript
export function renderEventsSection(
    parent: HTMLElement,
    events: EventNote[],
    options: EventsSectionOptions
): void
```

Options always include `sectionStates`, `onToggle`, `onEntityLinkClick`, and `isMobile`. Section renderers receive their full data regardless of collapsed state — DOM is simply hidden via CSS, making expand instant. Sections that use lazy rendering (e.g., map preview) provide a `contentRenderer` callback instead of populating the content div directly.

### Sections by Entity Type

| Entity | Sections rendered |
|--------|-------------------|
| Person | Identity, Relationships, Events, Sources, Media, Data Quality |
| Place | Identity, Events at location, Sources, Media, Map preview |
| Event | Identity, Participants, Sources, Media |
| Source | Identity, Referenced facts, Media |
| Organization | Identity, Members, Events, Sources, Media |

Shared sections (Events, Sources, Media) use the same renderer function called with entity-specific data.

### Relationships Section (Person)

The person Relationships section (`relationships-section.ts`) splits into Family and Other subsections:

- **Family**: Rendered from `PersonNode` properties (parents, spouses, children). These are populated by relationship types with a `familyGraphMapping`.
- **Other**: Combines direct and inverse relationships, then filters out family-category types and types with `includeOnFamilyTree && familyGraphMapping` (already shown in Family). A `deduplicateRelationships()` helper removes entries where the same source/target/type appear in both the direct and inverse sets.

The `otherCount` in the section summary uses the same filter and dedup logic via `countOtherRelationships()` in `profile-view.ts`.

---

## Identity Header

`renderIdentityHeader(container, data, options)` renders the sticky header visible at all scroll positions:

- **Pin toggle**: `pin`/`pin-off` Lucide icons with `clickable-icon` class
- **Entity type badge**: Colored by type (person=blue, place=green, event=orange, source=purple, organization=yellow)
- **Stale indicator**: "Not following" badge when the view is showing a frozen entity
- **Open note button**: Opens the underlying markdown file
- **Avatar**: For person entities with media, shows the first thumbnail
- **Name**: Entity name from frontmatter (editable via inline edit)
- **Metadata**: Entity-type-specific editable fields (see [Inline Editing](#inline-editing))

When `options.onFieldSave` is provided, all identity fields render as click-to-edit controls via `createEditableField()`. When null, the header renders in read-only mode.

---

## Navigation

### Breadcrumb Bar

When a user clicks entity links within sections (e.g., clicking a source name in a person's Sources section), the view navigates in-place to that entity. A breadcrumb bar tracks the navigation path:

```
John Smith > Birth Event > Springfield
```

- Clicking a breadcrumb truncates history and navigates back
- Hidden when only one entry (the current entity)
- Persisted in view state across sessions

### Entity Links

Section renderers receive an `onEntityLinkClick(crId, name, entityType, filePath)` callback. Entity names (persons, sources, places) render as clickable spans with `cr-profile__entity-link` class that push to breadcrumbs and navigate in-place.

### Pin/Unpin

- **Unpinned** (default): Follows the active note via auto-sync
- **Pinned**: Frozen on a specific entity; ignores `active-leaf-change`

Pinning allows multiple profile instances for side-by-side work — one pinned on a specific entity, another following the active note.

---

## State Persistence

`getState()` / `setState()` persist the following across sessions:

```typescript
interface ProfileViewState {
    pinned: boolean;
    pinnedEntityCrId?: string;
    pinnedEntityFilePath?: string;
    sectionStates: Record<string, boolean>;  // section ID -> expanded
    breadcrumbs: BreadcrumbEntry[];
}
```

When restoring state, the view loads the pinned entity file from `pinnedEntityFilePath` if the file still exists.

---

## Context Menu Integration

"Open profile" is added to the Charted Roots submenu for all five entity types in the `file-menu` handler:

- **Desktop**: Added as a submenu item with `id-card` icon in each entity type's Charted Roots submenu
- **Mobile**: Added as a flat `Charted Roots: Open profile` item

All context menu items call `this.activateProfileView(file)` to open/reveal the profile and navigate to that entity.

---

## Inline Editing

Identity header fields support click-to-edit via the `inline-edit.ts` module.

### Module state

A module-scoped `activeEdit: ActiveEditController | null` ensures only one field edits at a time. `commitActiveEdit()` is exported so the view can save any in-progress edit before re-rendering.

### Field factory

`createEditableField(container, config, onSave, onNotify)` creates a `<span class="cr-profile__editable">` that:
- Displays the field value (or placeholder if empty)
- On click: commits any active edit, enters edit mode with an `<input>` or `<select>`
- Enter/blur → save: calls `onNotify()` (sets self-modify flag), calls `onSave(property, value)`, optimistically updates DOM
- Escape → cancel: restores original display
- Blur uses a 150ms delay so clicking another editable field fires before the blur save

### Input types

| `inputType` | Renders | Used for |
|-------------|---------|----------|
| `text` | `<input type="text">` | Name, dates, occupation, event type, etc. |
| `number` | `<input type="number" step="any">` | Latitude, longitude |
| `select` | `<select>` with `<option>` elements | Sex (M/F/X/U), place category |

### Save callback (`profile-view.ts`)

The view creates an `onFieldSave` callback in `renderEntity()` that:

1. Resolves the canonical property name via `PropertyAliasService.getWriteProperty()`
2. Writes to frontmatter via `app.fileManager.processFrontMatter()`
3. Handles special cases:
   - Empty string → deletes the property
   - Number fields (`coordinates_lat`, `coordinates_long`) → writes as `parseFloat()`
   - Wikilink fields (`birth_place`, `place`, `repository`, `seat`) → calls `requoteWikilinksInFrontmatter()` afterward
4. Invalidates the data loader cache for the entity

### Self-modify guard

A `selfModified` flag on `ProfileView` prevents the 2s debounced re-render after user-initiated edits. The save callback sets `selfModified = true` via `onEditNotify()`. The vault modify handler checks and resets it, skipping the re-render but still invalidating the cache so future navigations get fresh data.

### Editable fields per entity type

| Entity | Fields | Notes |
|--------|--------|-------|
| Person | name, born, died, birth_place, occupation, sex | Dates are two separate editable fields with ` – ` separator |
| Place | name, place_category, coordinates_lat, coordinates_long | Category is a select dropdown |
| Event | title, event_type, date, place | |
| Source | title, source_type, date, repository | |
| Organization | name, org_type, founded, dissolved, seat | Founded/dissolved are separate fields with `est.` prefix |

---

## CSS Architecture

All styles are in `styles/profile-view.css` using BEM with `cr-profile__` prefix.

**Key selectors:**

| Selector | Purpose |
|----------|---------|
| `.cr-profile` | Flex column container, full height |
| `.cr-profile__header` | Sticky, z-index 10, border-bottom |
| `.cr-profile__breadcrumb` | Flex wrap, font-ui-smaller |
| `.cr-profile__sections` | Flex 1, overflow-y auto |
| `.cr-profile__section` | Collapsible via `--expanded` modifier |
| `.cr-profile__section-chevron` | Rotate(90deg) transition on expand |
| `.cr-profile__section-content` | Display none/block toggle |
| `.cr-profile__media-grid` | CSS grid, auto-fill minmax(80px, 1fr) |
| `.cr-profile__entity-link` | Clickable, text-accent, underline on hover |
| `.cr-profile__editable` | Click-to-edit field wrapper, cursor pointer, hover highlight |
| `.cr-profile__editable--editing` | Active edit state, no hover |
| `.cr-profile__editable-placeholder` | Faint italic for empty field values |
| `.cr-profile__edit-input` | Text/number input, inherits font |
| `.cr-profile__edit-select` | Select dropdown, inherits font |
| `.cr-profile__meta-separator` | ` · ` separator between metadata fields |
| `.cr-profile__section-header:focus-visible` | Keyboard focus ring (interactive-accent) |
| `.cr-profile--mobile` | Mobile layout modifier (44px touch targets) |
| `.cr-profile__map-container` | Embedded Leaflet map (200px height, rounded) |
| `.cr-profile__map-marker` | Map marker icon (accent color dot) |
| `.cr-profile__map-open-btn` | Full-width "Open in Geo Map" button |
| `.cr-profile__empty-state` | Centered placeholder |

All colors use Obsidian CSS variables. Type badge colors use CSS variable fallbacks for theme compatibility.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| View type | Single view, multi-instance | Avoids 5 separate view types; pinning enables side-by-side |
| Auto-sync debounce | 150ms | Fast enough for responsive feel, prevents flicker on rapid navigation |
| Vault modify debounce | 2000ms | Matches other views; avoids excessive reloads during typing |
| Section data loading | Eager (collapsed sections receive data) | Makes expand instant; no fetch delay on toggle |
| Source referenced facts | Vault-wide scan at load time | Adapted from ExtractionsProcessor; cached per entity |
| Non-entity active note | Freeze on last entity with stale badge | Better than blank pane; user retains context |
| Map preview | Embedded Leaflet map with lazy init | Map only initializes on section expand; cleaned up on collapse/close |
| Coordinate properties | `lat`/`long` (not latitude/longitude) | Matches `GeoCoordinates` interface in `src/models/place.ts` |
| Inline edit scope | Identity header fields only | Section content editing deferred to future phases |
| Self-modify guard | `selfModified` flag skips re-render | Prevents 2s debounce from undoing optimistic DOM update |
| Active edit tracking | Module-scoped singleton | One field at a time avoids race conditions |
| Blur delay | 150ms timeout before saving on blur | Allows click on another field to fire before blur save |
| Property aliasing | `PropertyAliasService.getWriteProperty()` | Respects user-configured property name mappings |
| Lazy section rendering | Optional `contentRenderer` callback | Backward-compatible; defers DOM until first expand |
| Keyboard navigation | WAI-ARIA accordion on section headers | ArrowUp/Down, Enter/Space, Home/End with focus wrapping |
| Mobile detection | `Platform.isMobile` + CSS class | 44px touch targets; narrow-pane media query at 400px |
