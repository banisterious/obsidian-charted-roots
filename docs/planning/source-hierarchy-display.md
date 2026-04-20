# Source Hierarchy Display and Navigation

Planning document for source hierarchy display and navigation features.

**Status:** ✅ Phases 1-4 complete | Phase 5 scoped, ready to implement (2026-04-20)

**Related:** [#338](https://github.com/banisterious/obsidian-charted-roots/issues/338) (Phases 1-4), [#339](https://github.com/banisterious/obsidian-charted-roots/issues/339) (Phase 5)

**Depends on:** [#337](https://github.com/banisterious/obsidian-charted-roots/issues/337) (source_parent / source_parent_id) — ✅ Implemented. Phase 5 also benefits from [#407](https://github.com/banisterious/obsidian-charted-roots/issues/407) (FS source clipper templates) to populate `repositoryUrl` for the citation generator's FS-variant heuristic.

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

### Phase 5 — Report integration (#339)

Reports that reference sources understand parent-child relationships. Citation generation references the parent source where applicable. Exports preserve the hierarchy where the target format allows it.

Scoped from [discussion #275](https://github.com/banisterious/obsidian-charted-roots/discussions/275) (@ANYroots probate packet use case) and captured in [#339](https://github.com/banisterious/obsidian-charted-roots/issues/339). Design decisions below reflect that conversation.

#### 5.1 — Source Summary report: group under parent

**Default display mode:** child sources grouped under their parent. Matches how multi-document record groups (probate packets, court case files, multi-page census entries) actually function.

**Flat-list mode:** available as an option (display toggle on the report) for specific use cases that want flat ordering.

**Implementation:**
- `src/reports/services/source-summary-generator.ts` — group by `sourceParentId`, render parent header + child list; emit flat list when `flat: true` option is set
- Parent sources without children render as standalone entries
- Orphan children (parent missing from vault) render under an "Unresolved parent" group with a warning badge

#### 5.2 — Citation generator: reference the parent

Auto-generate structural pieces only; leave contextual commentary to user-authored fields.

**Template fields:**

| Piece | Source | Auto-generate? |
|---|---|---|
| Child document name + date | Child note frontmatter | Yes |
| Parent case identifier | Parent note frontmatter | Yes |
| Page range / locator within parent | `source_detail` (free-text — see 5.4) | Yes (when set) |
| Jurisdictional / contextual commentary | Free-text note body or `notes` field | No — user-authored |

**Example output** (Evidence Explained format, child source with `source_parent` set, direct-PDF access):

> York District, South Carolina, Court of Ordinary, Estate Files, William H. Hardwick estate, petition for administration, filed 4 March 1863; PDF, York County, South Carolina, Probate Court, County Clerk's Office, file identifier "1863es4602009," pp. 62-63.

**Layer 1 / Layer 2 redundancy rule** (@ANYroots correction, 2026-04-19):

The access layer (Layer 2) shouldn't be a blind concatenation after Layer 1. When Layer 1's jurisdiction/court naming matches the current custodian, Layer 2 should drop the redundant pieces. When Layer 1 uses historical names that differ from the current custodian (e.g., "York District" vs "York County," or "Court of Ordinary" vs "Probate Court"), the full access layer stays so the reader can reconcile the name changes.

**Implementation approach for the redundancy rule:**
- Compare jurisdiction + court fields between the child note's Layer 1 (historical / document-era naming stored on the child) and the parent note's Layer 2 (current custodian naming stored on the parent).
- If case-insensitive token comparison matches, suppress the redundant tokens in the Layer 2 output.
- If tokens differ (e.g., District ↔ County, Ordinary ↔ Probate), emit the full Layer 2 as-is.
- String normalization: lowercase, strip punctuation, trim, optionally stem common abbreviations (St./Saint, etc.).

**Parent-alone citation** (when the packet is cited as a whole): Layer 2 drops the custodian entirely because Layer 1 already establishes it.

> York County, South Carolina, Probate Court, Estate Files, William H. Hardwick, 1863; PDF, file identifier "1863es4602009," County Clerk's Office, York.

**FamilySearch variant** — second template for sources accessed via online image collections:

When `repositoryUrl` contains `familysearch.org`, the generator switches to the FS access-layer form instead of the direct-PDF form. FS form uses a browse-path narrative with image number, date accessed, and source-of-source attribution:

> "South Carolina, Probate Records, Files and Loose Papers, 1732–1964," browsable images, *FamilySearch* (https://www.familysearch.org/en/search/collection/1911928 : accessed 19 April 2026) > Browse all images > York > Probate Court, Estate records > 1774–1960 > Files 2007–2128 > image 407 of 697, case no. 49, file no. 2009, estate of William H. Hardwick, petition for administration, filed 4 March 1863; citing South Carolina county courthouses and South Carolina Department of Archives and History, Columbia.

**Data-capture path for FS variant:** source notes clipped via the templates proposed in [#407](https://github.com/banisterious/obsidian-charted-roots/issues/407) will always have `repositoryUrl` populated with a FS URL, so the heuristic fires reliably. Users can also populate the field manually.

**Implementation:**
- `src/sources/services/citation-service.ts` — add `generateEvidenceExplainedFamilySearchCitation()` as a sibling to `generateEvidenceExplainedCitation()`
- Router check: if `source.repositoryUrl?.includes('familysearch.org')`, call the FS variant; otherwise fall through to the standard EE generator
- `citation_override` continues to bypass both paths when set (preserves user authority)

#### 5.3 — Page-range / locator field: reuse `source_detail`

**Decision (2026-04-20):** Reuse `source_detail` as a free-text container for locator information. Users write `"pp. 62-63"` / `"folio 4r"` / `"entry 42 of 108"` / `"image 407 of 697"` per the source's conventions.

**Rejected alternatives:** dedicated `source_pages` or `source_page_range` fields. Different source types have genuinely different locator conventions, and a page-based field name would imply a convention that isn't universal.

**No schema change** — `source_detail` already exists. Citation generator reads it as-is and appends to the citation output (location TBD within the structural template — likely after the document-name + date but before the attribution tail).

#### 5.4 — GEDCOM / CSV exports: conservative default

**Decision:** Include `source_parent_id` as a reference to the parent note when a parent exists; skip otherwise.

**GEDCOM:** No native concept of source hierarchies. Write the parent reference as a custom `NOTE` under the `SOUR` record, or a custom sub-tag, clearly marked as a Charted Roots extension. Document the tag in `docs/developer/gedcom-reference.md`.

**CSV:** Add a `source_parent` column in the sources CSV export. Value is the parent's title (or crId if titles aren't unique enough).

#### 5.5 — Deferred: Sources by Role report

Filter / grouping behavior with hierarchy on the Sources by Role report is deferred until real-world feedback surfaces specific needs. Not in scope for the initial Phase 5 implementation.

#### Files to modify

- `src/reports/services/source-summary-generator.ts` — hierarchy-aware grouping with flat-list option
- `src/sources/services/citation-service.ts` — Layer 1/Layer 2 redundancy compression, FS variant router, `generateEvidenceExplainedFamilySearchCitation()`
- `src/gedcom/gedcom-exporter.ts` — emit `source_parent_id` as custom NOTE or sub-tag
- `src/csv/csv-exporter.ts` — add `source_parent` column
- `docs/developer/gedcom-reference.md` — document the custom parent-ref tag

#### Testing plan

- Source Summary with a parent source that has 3+ children — verify grouping and ordering
- Source Summary with a child source whose parent is missing from the vault — verify "Unresolved parent" group
- Citation generation on a child source with direct-PDF `repositoryUrl` — verify Layer 2 compresses when naming matches, stays full when it differs
- Citation generation on a child source with FS `repositoryUrl` — verify FS variant fires
- `citation_override` set on a child source — verify override wins in both variants
- GEDCOM round-trip with source hierarchy — verify parent reference survives export+import
- CSV export — verify `source_parent` column appears and values resolve correctly

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
