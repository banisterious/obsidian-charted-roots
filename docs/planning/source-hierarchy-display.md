# Source Hierarchy Display and Navigation

Planning document for source hierarchy display and navigation features.

**Status:** ✅ Phases 1-4 complete | Phase 5 deferred

**Related:** [#338](https://github.com/banisterious/obsidian-charted-roots/issues/338)

**Depends on:** [#337](https://github.com/banisterious/obsidian-charted-roots/issues/337) (source_parent / source_parent_id) — ✅ Implemented

---

## Overview

Build hierarchy-aware features on top of the `source_parent` / `source_parent_id` relationship introduced in #337. The source profile view, Sources tab, and reports should understand and display parent-child relationships between source notes.

---

## Existing Infrastructure

| Component | Location | Relevance |
|-----------|----------|-----------|
| `SourceNote.sourceParent` / `.sourceParentId` | `src/sources/types/source-types.ts` | Properties parsed and written (#337) |
| `SourceService` | `src/sources/services/source-service.ts` | `getAllSources()`, `getSourceById()`, parsing |
| Source profile view | `src/profile-view/` | Referenced Facts + Media sections already exist |
| `renderProfileSection()` | `src/profile-view/sections/section-base.ts` | Section rendering infrastructure |
| `SourceProfileData` | `src/profile-view/profile-types.ts` | Data loaded for source profiles |
| Profile data loader | `src/profile-view/profile-data-loader.ts` | Loads source data for profile view |
| Sources tab | `src/sources/ui/sources-tab.ts` | Filtering, sorting, pagination |
| Place hierarchy pattern | `src/core/place-graph.ts` | `parentId`, `childIds[]`, `getChildren()` — reference pattern |

---

## Implementation Phases

### Phase 1 — Profile view hierarchy display

Add parent and child sections to the source entity profile view.

**Parent source link (on child source profiles):**
- New section at the top of the source profile: "Parent source"
- Shows parent source title as a clickable link
- Click → opens the parent source note
- Profile button → opens parent source profile view
- Only shown when `sourceParentId` or `sourceParent` is set

**Child documents section (on parent source profiles):**
- New section: "Child documents"
- Lists all sources where `source_parent_id` matches this source's `cr_id`
- Each entry shows: title, source type badge, document date
- Click title → open note, profile icon → open profile view
- Empty state: section hidden when no children exist

**Data loading changes:**
- `ProfileDataLoader`: Look up parent source by `sourceParentId`
- `ProfileDataLoader`: Query all sources for children matching this source's `cr_id`
- Add `parentSource?: SourceNote` and `childSources: SourceNote[]` to `SourceProfileData`

**Files to modify:**
- `src/profile-view/profile-types.ts` — extend `SourceProfileData`
- `src/profile-view/profile-data-loader.ts` — load parent + children
- `src/profile-view/sections/` — new `source-hierarchy-section.ts`
- `src/profile-view/profile-view.ts` — register new section
- `styles/profile-view.css` — styles for hierarchy section

### Phase 2 — Related sources (siblings)

In a child source's profile, show sibling documents that share the same parent.

**"Related documents" section:**
- Only shown on child source profiles (has a parent)
- Lists other sources with the same `source_parent_id`, excluding self
- Same display format as child documents (title, type badge, date)
- Section hidden when no siblings exist

**Files to modify:**
- `src/profile-view/profile-data-loader.ts` — load siblings
- `src/profile-view/profile-types.ts` — add `siblingSourcess: SourceNote[]`
- `src/profile-view/sections/source-hierarchy-section.ts` — add siblings rendering

### Phase 3 — Sources tab filtering

Add hierarchy-aware filtering to the Sources tab in Control Center.

**New filter options:**
- "Has parent" — show only child sources
- "No parent (top-level)" — show only sources without a parent
- "Children of: [source picker]" — show children of a specific parent source

**Parent source column:**
- Add optional "Parent" column to the sources list showing the parent title (truncated)
- Clicking the parent name filters to that parent's children

**Files to modify:**
- `src/sources/ui/sources-tab.ts` — add filter options, column

### Phase 4 — Source tree visualization

Collapsible tree view in the parent source's profile showing the full hierarchy.

**Tree display:**
- Indented tree with expand/collapse controls
- Parent at root, children as branches
- Each node shows: title, source type, date
- Click to navigate
- Collapsible for large hierarchies

**Implementation:**
- Could be a standalone section in the profile view or an enhancement to the child documents section
- Reuse the place hierarchy rendering pattern if applicable

**Files to modify:**
- `src/profile-view/sections/source-hierarchy-section.ts` — tree rendering mode
- `styles/profile-view.css` — tree indentation styles

### Phase 5 — Report integration

Reports that reference sources can optionally group by parent/children.

**Enhancements:**
- Source-related reports can group child sources under their parent
- Citation generation can reference the parent source for context
- Export formats (GEDCOM, CSV) can include parent-child relationships

**This phase is lower priority** and can be scoped once the display features are in use and real-world feedback is available.

---

## Key Types

```typescript
// Extended SourceProfileData
interface SourceProfileData {
    // ... existing fields
    parentSource?: SourceNote;      // Parent source (if this is a child)
    childSources: SourceNote[];     // Child sources (if this is a parent)
    siblingSources: SourceNote[];   // Sibling sources (same parent, excluding self)
}
```

---

## Risks and Considerations

- **Performance:** `getAllSources()` is already called for the parent picker autocomplete. Filtering children by `source_parent_id` is O(n) over all sources — acceptable for typical vault sizes, but could cache if needed.
- **Circular references:** A source could theoretically reference itself or create a cycle as parent. Guard against this in the data loader.
- **Deep hierarchies:** The initial implementation assumes one level (parent → children). Multi-level nesting (grandchildren) is unlikely for the probate packet use case but could be supported later with recursive loading.
- **Orphaned references:** If a parent source is deleted, child sources retain stale `source_parent_id`. The data loader should handle missing parents gracefully.
