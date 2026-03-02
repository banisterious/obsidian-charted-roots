# Entity Profile Views

Planning document for entity Profile Views feature.

**Status:** ✅ Phase 1-2 complete | Phase 3 planned

**Related:** [#239](https://github.com/banisterious/obsidian-charted-roots/discussions/239) (Control Center modularization), [#240](https://github.com/banisterious/obsidian-charted-roots/discussions/240) (Dockable sidebar views), [#242](https://github.com/banisterious/obsidian-charted-roots/discussions/242) (Profile Views discussion)

---

## Overview

The Profile View is a single `ItemView` that provides a comprehensive, focused workspace for deep work on any entity (person, place, event, source, organization). It auto-syncs to the active note, rendering entity-type-specific sections with a sticky identity header and collapsible detail sections below.

**Motivation:**
- Current workflows are entity-type-centric (People tab, Events tab, Sources tab), but real user workflows cut across entity types — adding a birth event to a person requires jumping between People, Events, and Sources, losing context along the way
- The v0.20.0 dockable Browser views solve the window management problem but preserve the context-switching problem
- A Profile View keeps all related data visible together in collapsible sections, enabling deep work on a single entity without tab-hopping

---

## Architecture

### Single view type with auto-sync

One registered `ItemView` (`VIEW_TYPE_ENTITY_PROFILE`) that:
- **Auto-syncs** to the active note — when the user switches to a different entity note, the Profile View updates to show that entity's profile
- **Detects entity type** from frontmatter (`cr_type` or person detection) and renders the appropriate sections
- **Supports multiple instances** — unlike Browser views which enforce single-instance, the Profile View allows multiple docked instances for side-by-side work
- **Pin/unpin toggle** — freezes the current entity to stop auto-syncing; unpinned instances follow the active note

This approach avoids tab sprawl from five separate view types and matches Obsidian's existing conventions (Outline, Backlinks, and Properties panels all auto-sync to the active note).

### Layout: hybrid with sticky header

The view uses a hybrid layout:
- **Sticky identity header** — always visible at the top regardless of scroll position. Shows entity name, key metadata (dates, type badges), avatar thumbnail (for people), and section jump links. The user always knows which entity they're viewing.
- **Scrollable section area** — collapsible sections stacked vertically below the header. Each section can be expanded or collapsed independently. Collapsed sections show a compact summary (e.g., "12 events", "4 sources").

### Entity-type sections

| Entity type | Sections |
|-------------|----------|
| Person | Identity → Relationships → Events → Sources → Media → Data Quality |
| Place | Identity → Events at location → Sources → Media → Map preview → Research questions* |
| Event | Identity → Participants → Sources → Media → Place link → Research questions* |
| Source | Identity → Referenced facts → Persons cited → Media |
| Organization | Identity → Members → Events → Sources → Media |

*Research questions section only appears if `needs_research` property exists on the entity.

#### Person Relationships section

The Relationships section replaces the simpler "Family" section to accommodate all relationship types while keeping family relationships prominent.

**Structure:**
- **Family** (expanded by default)
  - Parents (biological)
  - Step-parents
  - Adoptive parents
  - Foster parents
  - Spouses
  - Children (biological, step, adopted, foster)
  - Siblings
- **Other relationships** (collapsed by default; hidden if empty)
  - *Religious:* Godparents / godchildren, Mentor / disciple
  - *Professional:* Master / apprentice, Employer / employee
  - *Social:* Witnesses, Neighbors, Companions, Betrothed
  - *Legal:* Guardians / wards
  - *Feudal (worldbuilding):* Liege / vassal, Allies, Rivals
  - *DNA:* DNA matches (when `enableDnaTracking` is on)

Relationship types are defined in `src/relationships/constants/default-relationship-types.ts` and are customizable via settings.

**Rationale:** Family relationships are primary data for genealogy and should be immediately visible. Other relationship types (witnesses, godparents, business partners) provide valuable historical context but are secondary — collapsing them by default keeps the interface clean for users who don't need them, while making them discoverable for those who do.

#### Person Data Quality section

The Data Quality section provides research status at a glance:

- **Research level** (0-6): Visual indicator based on Hoitink's "Six Levels of Ancestral Profiles"
  - 0: Unidentified → 6: Biography (full narrative)
- **Source coverage**: Percentage of key facts with sources attached (from `EvidenceService`)
  - Shows which facts are sourced vs. unsourced (birth, death, parents, etc.)
- **Research questions**: Items from `needs_research` property
  - Clickable to jump to specific questions
  - Quick-add button to append new questions
- **Proof summaries**: Link to associated proof notes (if any exist)

**Note:** Places and Events can also have `needs_research` questions displayed in their profiles, though they may not have research levels.

#### Organization Members section

The Members section displays organization membership:

- **Member list**: People linked to this organization via `member` / `member_id` properties
- **Roles** (if tracked): Position or role within the organization
- **Membership dates** (if tracked): Start/end dates for membership
- **Add member**: Button to link existing person to organization

**Decision:** Flat member list for Phase 1. Hierarchical role display (e.g., President → Vice President → Members) can be revisited if users request it.

#### Place Map Preview section

The Map Preview section provides geographic context:

- **Static map**: Embedded Leaflet map centered on place coordinates, rendered as a non-interactive snapshot
  - Uses `latitude` / `longitude` from place frontmatter
  - Shows this place only (no nearby/related places — adds complexity without clear value)
- **Open in Geo Map**: Clicking the map opens the full interactive Geo Map view focused on this place

**Fallback:** If no coordinates exist, shows a prompt to add them or displays "No location data."

#### Source Referenced Facts section

The Referenced Facts section answers "what claims does this source support?" by querying entities that cite this source via `sourced_*` frontmatter properties.

- **Fact list**: Shows the actual facts with values (e.g., `birth_date: 1842-05-12`, `death_place: Springfield`) where the corresponding `sourced_*` property includes this source
- **Entity links**: Each fact links back to the entity it belongs to (person, event, place)
- **Grouped by entity**: Facts are grouped under the entity they belong to, so the user sees "John Smith: birth_date, death_date" rather than a flat list

**Implementation:** Query all notes in the vault where any `sourced_*` property value contains a wikilink to this source note. Extract the corresponding unsourced property name and value. This is a vault-wide search and should be cached per source entity.

### Section renderers

Section renderers are standalone functions (e.g., `renderProfileRelationshipsSection()`, `renderProfileEventsSection()`) following the existing tab renderer pattern from Phase 1. Sections shared across entity types (Sources, Media) use the same render function.

### File and module structure

```
src/profile-view/
  profile-view.ts              # ProfileView class (ItemView subclass), auto-sync, pin/unpin
  profile-data-loader.ts       # Coordinated data loading, caching, entity resolution
  profile-types.ts             # Shared types: ProfileEntityData, SectionState, BreadcrumbEntry
  sections/
    section-base.ts            # Collapsible section infrastructure (expand/collapse, summary rendering)
    identity-section.ts        # Identity header content (shared across all entity types)
    relationships-section.ts   # Person relationships (family + other subsections)
    events-section.ts          # Events list (person, place, organization)
    sources-section.ts         # Sources list (person, event, place, organization)
    media-section.ts           # Media grid (all entity types)
    data-quality-section.ts    # Research level, coverage, questions (person-only)
    participants-section.ts    # Event participants
    members-section.ts         # Organization members
    map-preview-section.ts     # Place map snapshot
    referenced-facts-section.ts # Source referenced facts
```

Sections shared across entity types (Sources, Media, Events) are single renderer files called with entity-specific data. The view class orchestrates which sections to render based on detected entity type.

### Auto-sync mechanism

The view listens for `workspace.on('active-leaf-change')` to detect note switches.

- **Debounce**: 150ms debounce on the listener to avoid flicker during rapid navigation (e.g., holding arrow keys in the file explorer)
- **Same-entity guard**: If the resolved entity's `cr_id` matches the currently displayed entity, skip re-render entirely
- **Non-entity notes**: When the active note is not a recognized entity, the view freezes on the last displayed entity rather than showing a blank pane. A subtle indicator (e.g., dimmed header or "not synced" badge) signals that the view is stale.
- **Pinned instances**: Pinned views ignore `active-leaf-change` entirely

### Data loading

A single coordinated load fires per entity switch, orchestrated by `ProfileDataLoader`:

1. Resolve entity type and core frontmatter data
2. Fan out service calls in parallel (`FamilyGraphService`, `EventService`, `SourceService`, `MediaService`, etc.) based on which sections the entity type needs
3. Pass resolved data into section renderers

**Collapsed sections** receive their data but skip DOM rendering. This keeps expand instant (no fetch delay) while avoiding unnecessary DOM work. Phase 3 can refine this with true lazy-render if profiling shows the parallel service calls are a bottleneck.

**Caching**: `ProfileDataLoader` caches the last loaded entity's data keyed by `cr_id`. Navigating back to a recently viewed entity reuses the cache (invalidated on `vault.on('modify')` for that file).

### View states

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton placeholder in the section area while data resolves. Header shows entity name immediately from frontmatter. |
| **Non-entity note active** | Freeze on last entity. Show a subtle "not following active note" indicator. If no entity has been shown yet, display an empty state with instructions. |
| **Empty section** | Section header still visible with summary showing "None" or "0 items". Section body shows a contextual empty message (e.g., "No events recorded", "No media attached"). |
| **Error** | Section-level error display (e.g., "Could not load events"). Other sections render normally. |

### Section collapsed summaries

When collapsed, each section shows a compact summary string:

| Section | Collapsed summary example |
|---------|--------------------------|
| Relationships | "3 family, 2 other" |
| Events | "12 events" |
| Sources | "4 sources" |
| Media | "8 items" |
| Data Quality | "Level 4 · 67% sourced" |
| Participants | "3 participants" |
| Members | "15 members" |
| Map preview | "43.6°N, 72.3°W" (or "No coordinates") |
| Referenced facts | "7 facts across 3 entities" |
| Research questions | "2 open questions" |

---

## Navigation

### Entry points

- **Command palette**: "Charted Roots: Open entity profile" — opens/reveals the Profile View in the sidebar. Once docked, it persists across sessions and auto-syncs to the active note.
- **Context menu**: Right-click a note in the file tree or editor → "Open profile" — opens the Profile View and navigates to that entity
- **Control Center**: A button in the Dashboard tab or header area that opens the Profile View. Always accessible regardless of which tab is active.
- **Browser view row action**: A profile icon on each entity row in the dockable Browser views (People, Events, etc.). Click the entity name to open their note (existing behavior); click the profile icon to open/navigate the Profile View to that entity.
- **Auto-sync** — once docked, the Profile View follows the active note automatically (when unpinned)

### Pin/unpin

- **Unpinned** (default): The view follows the active note. This is the typical single-pane usage — dock the Profile View in the sidebar and it updates as you navigate.
- **Pinned**: The view is frozen on a specific entity. Pin a profile to keep it visible, then continue navigating — the pinned instance stays while unpinned instances (or new instances) follow the active note.

### Cross-entity navigation

Clicking a related entity (e.g., a source link in a Person profile) navigates the Profile View in-place to that entity. A "pop-out" action (modifier-click or icon button) opens a new pinned Profile View pane for side-by-side work.

### Breadcrumb bar

Shows navigation path within a single view instance (e.g., "John Smith → Birth Event → Springfield"). Clicking a breadcrumb navigates back. Breadcrumb history is per-instance and persists across sessions.

### Relationship to existing views

The Profile View is an **additional option**, not a replacement for existing behavior. Users who prefer working in raw markdown continue to do so. Browser views preserve their current "open note" behavior, with the Profile View available as a complementary workspace.

---

## Save behavior

Follows the Obsidian Properties UI pattern:
- **Simple fields** (name, dates, occupation): save on blur
- **Relationship additions** (spouse, parent, source): save on picker confirmation
- **Relationship removals**: save immediately with confirmation prompt for destructive changes
- No explicit Save button — changes write immediately to frontmatter
- This matches Obsidian's convention of immediate persistence and avoids crash-risk from deferred saves

---

## Reusable components

The existing codebase provides strong building blocks:

| Component | Location | Use in Profile View |
|-----------|----------|---------------------|
| `FamilyGraphService` | `src/core/family-graph.ts` | Load person, resolve family relationships |
| `PlaceGraphService` | `src/core/place-graph.ts` | Load/resolve place entities |
| `EventService` | `src/events/services/event-service.ts` | Load events for a person/place |
| `SourceService` | `src/sources/services/source-service.ts` | Load/manage sources |
| `EvidenceService` | `src/sources/services/evidence-service.ts` | Research coverage %, fact sourcing |
| `ProofSummaryService` | `src/sources/services/proof-summary-service.ts` | Proof notes, conflict tracking |
| `MediaService` | `src/core/media-service.ts` | Resolve media linked to entity |
| `renderPersonTimeline()` | `src/events/ui/person-timeline.ts` | Chronological event display |
| `PersonPickerModal` | `src/ui/person-picker.ts` | Browse & select person |
| `PlacePickerModal` | `src/ui/place-picker.ts` | Browse & select place |
| `SourcePickerModal` | `src/sources/ui/source-picker-modal.ts` | Browse & select source |
| `EventPickerModal` | `src/events/ui/event-picker-modal.ts` | Browse & select event |
| Collapsible section pattern | `src/sources/ui/create-source-modal.ts` | Chevron toggle, expand/collapse |
| `Setting` class | Obsidian API | Form field rendering |

---

## CSS naming

- View container: `cr-profile`
- Sticky header: `cr-profile__header`
- Pin toggle: `cr-profile__pin-toggle`
- Breadcrumb: `cr-profile__breadcrumb`
- Section shared: `cr-profile__section`, `cr-profile__section-header`, `cr-profile__section-summary`
- Section content: `cr-profile__identity`, `cr-profile__relationships`, `cr-profile__relationships-family`, `cr-profile__relationships-other`, `cr-profile__events`, `cr-profile__sources`, `cr-profile__media`, `cr-profile__data-quality`, `cr-profile__participants`, `cr-profile__members`, `cr-profile__map-preview`

---

## Implementation phases

### Phase 1 — Read-only Profile View

- Register single `ProfileView` ItemView with auto-sync to active note
- Implement entity type detection from frontmatter
- Implement sticky identity header with entity name, metadata, avatar
- Implement collapsible section infrastructure with chevron toggle and compact summaries
- Implement pin/unpin toggle for freezing on a specific entity
- Implement section renderers for all entity types (read-only display)
- Reuse existing components: `renderPersonTimeline()` for events, `MediaService` for thumbnails, `EvidenceService` for data quality
- Breadcrumb navigation for in-place entity traversal
- Context menu and command palette entry points
- State persistence (pinned entity, expanded sections, breadcrumb history)

### Phase 2 — Inline editing (complete)

- ✅ Click-to-edit for all identity header fields across all five entity types
- ✅ Text, number, and select (dropdown) inputs with Enter/blur save, Escape cancel
- ✅ Single-active-field tracking via module-scoped controller
- ✅ Immediate frontmatter persistence via `processFrontMatter()` with property alias support
- ✅ Wikilink requoting for link-valued fields
- ✅ Self-modify guard to prevent redundant re-renders after inline edits
- ✅ Empty fields show clickable placeholders when editing is available
- Deferred: relationship management via picker modals, inline event/source creation, undo support

### Phase 3 — Polish and integration

- Section jump links in sticky header for quick navigation to sections
- Browser view "Open profile" integration (click row → open profile)
- Pop-out action for cross-entity links (open new pinned pane)
- Keyboard navigation between sections
- Mobile-responsive layout (collapse sections by default, touch-friendly targets)
- Performance optimization (lazy-render sections on expand)

---

## Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| View registration | Single view type, multi-instance | Avoids tab sprawl from 5 view types; matches Obsidian Outline/Backlinks pattern |
| Active note sync | Auto-sync with pin/unpin | Familiar Obsidian UX; pinning enables side-by-side without separate view types |
| Layout | Sticky identity header + scrollable collapsible sections | Always know which entity you're viewing; expand only the sections you need |
| Section renderers | Standalone functions per section | Reusable, testable, consistent with existing tab renderer pattern |
| Save model | Save on blur / on picker confirm | Matches Obsidian conventions, avoids crash-risk from deferred saves |
| Browser relationship | Profile is additional option, not replacement | Preserves existing workflow for users who prefer raw markdown |
| Cross-entity links | Navigate in-place; pop-out for side-by-side | Simple default; explicit action for multi-pane |
| Multiple instances | Allowed (not single-instance) | Enables side-by-side via pinned panes |
| Auto-sync event | `active-leaf-change` with 150ms debounce | Avoids flicker on rapid navigation; same-entity guard prevents redundant re-renders |
| Data loading | Single coordinated load per entity switch | Parallel service calls, collapsed sections receive data but skip DOM; keeps expand instant |
| Non-entity active note | Freeze on last entity with stale indicator | Better than blank pane; user retains context |
| Organization hierarchy | Flat member list (Phase 1) | Sufficient for current use; revisit if requested |
| Map preview | Static snapshot, click to open Geo Map | Simpler than full Leaflet embed; sufficient for coordinate review |
