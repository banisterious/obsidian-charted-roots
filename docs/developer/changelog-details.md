# Detailed Changelog

This document contains detailed implementation notes for significant features. For high-level release notes, see the [CHANGELOG](../../CHANGELOG.md).

## Table of Contents

- [Version 0.10.x - 0.11.x Summary](#version-010x---011x-summary-2025-12)
- [Re-Layout Canvas Command](#re-layout-canvas-command-2025-11-21)
- [Canvas Metadata & Smart Re-layout](#canvas-metadata--smart-re-layout-2025-11-22)
- [Tree Generation Tab Streamlining](#tree-generation-tab-streamlining-2025-11-21)
- [Person Picker Enhancements](#person-picker-enhancements-2025-11-20)
- [Recent Trees History](#recent-trees-history-2025-11-20)
- [GEDCOM X and Gramps XML Export](#gedcom-x-and-gramps-xml-export-2025-12-02)
- [Canvas Color Enhancements](#canvas-color-enhancements-2025-11-20)
- [Evidence Visualization](#evidence-visualization-2025-12-05)
- [GEDCOM Test Datasets](#gedcom-test-datasets-2025-11-20)
- [Entity Profile View — Phase 3 Polish](#entity-profile-view--phase-3-polish-2026-03-03)
- [Entity Profile View — Inline Editing](#entity-profile-view--inline-editing-2026-03-02)
- [Structured Role Lists for Organizations](#structured-role-lists-for-organizations-2026-02-28)
- [Mills-Aligned Source Classification](#mills-aligned-source-classification-2026-02-28)

---

## Entity Profile View — Phase 3 Polish (2026-03-03)

**GitHub Issue:** [#251](https://github.com/banisterious/obsidian-charted-roots/issues/251)

Adds lazy section rendering, keyboard navigation, mobile-responsive layout, and an embedded Leaflet map preview for place profiles.

**Problem:** Phase 1-2 delivered a functional profile view with inline editing, but sections rendered eagerly even when collapsed, there was no keyboard accessibility, the layout didn't adapt to mobile, and the place map section showed only text coordinates.

**Solution:** Four additions to the profile view infrastructure.

**Implementation:**

- **Lazy section rendering** (`section-base.ts`): Optional `contentRenderer` callback on `ProfileSectionOptions` defers DOM population until first expand. Uses `childElementCount === 0` guard (pattern from `people-tab.ts`). Optional `onCollapse` callback for cleanup. Fully backward-compatible — callers that don't use the new options work identically.
- **Keyboard navigation** (`section-base.ts`): Section headers receive `tabindex="0"`, `role="button"`, and `aria-expanded` attributes. `keydown` handler implements WAI-ARIA accordion pattern: ArrowUp/Down moves focus between section headers (wrapping), Enter/Space toggles expand/collapse, Home/End jumps to first/last section. Helper functions `focusAdjacentHeader()` and `focusFirstOrLastHeader()` use DOM queries on `.cr-profile__section-header`.
- **Mobile-responsive layout** (`profile-view.ts`, `profile-view.css`): `Platform.isMobile` detection adds `cr-profile--mobile` class with 44px touch targets on section headers. `@media (max-width: 400px)` query stacks header metadata vertically and hides section summaries for narrow panes. `isMobile` flag added to `SectionRenderOptions`.
- **Embedded Leaflet map** (`map-preview-section.ts`): Replaces text-only coordinate display with an interactive Leaflet map using lazy rendering (map initializes on first section expand). Uses `L.divIcon` marker matching the map-controller pattern. `cleanupMapPreview()` exported for lifecycle management — called on collapse, entity switch, and view close. "Open in Geo Map" button now passes `focusCoordinates` (with `long` → `lng` translation) to center the full map on the place.

**Files modified:** `section-base.ts`, `map-preview-section.ts`, `profile-view.ts`, `profile-view.css`

---

## Entity Profile View — Inline Editing (2026-03-02)

**GitHub Issue:** [#251](https://github.com/banisterious/obsidian-charted-roots/issues/251)

Adds click-to-edit for all identity header fields in the Entity Profile View across all five entity types. Users can edit names, dates, metadata, and categorical fields directly in the profile without opening the underlying note.

**Problem:** Phase 1 delivered a read-only profile view. Editing any field required opening the note and modifying frontmatter manually, breaking the "deep work without context-switching" goal.

**Solution:** Click-to-edit controls on identity header fields with immediate frontmatter persistence. Click a value → input appears → Enter/blur saves, Escape cancels. One field active at a time.

**Implementation:**

- **Type system** (`profile-types.ts`): `EditableFieldConfig` with property name, display/raw values, input type (`text`/`number`/`select`), select options, and placeholder. `InlineEditSaveFn` and `InlineEditNotifyFn` callback types.
- **Inline edit module** (`inline-edit.ts`): Module-scoped `activeEdit` singleton tracks the one active field. `createEditableField()` factory returns a span that transforms to input on click. `commitActiveEdit()` exported for pre-render cleanup. 150ms blur delay prevents race conditions when clicking between fields.
- **Identity section refactor** (`identity-section.ts`): Major rewrite from joined metadata strings to individual editable fields. Per-entity field definitions with `renderPersonMeta()`, `getPlaceFields()`, `getEventFields()`, `getSourceFields()`, `renderOrgMeta()`. Person dates rendered as two separate born/died fields. Select dropdowns for sex (M/F/X/U) and place category (6 values). Number inputs for coordinates.
- **Save callback** (`profile-view.ts`): Uses `PropertyAliasService.getWriteProperty()` for property name resolution, `app.fileManager.processFrontMatter()` for writes, `requoteWikilinksInFrontmatter()` for wikilink-valued fields. Handles empty → delete, number → `parseFloat()`. Invalidates data loader cache after save.
- **Self-modify guard** (`profile-view.ts`): `selfModified` flag prevents the 2s debounced re-render from undoing optimistic DOM updates after inline edits, while still allowing external edits to trigger re-renders.
- **CSS** (`profile-view.css`): `.cr-profile__editable` click-to-edit wrapper with hover highlight, `.cr-profile__editable-placeholder` faint italic for empty values, `.cr-profile__edit-input`/`.cr-profile__edit-select` input styling.

**Editable fields:**

| Entity | Fields |
|--------|--------|
| Person | name, born, died, birth_place, occupation, sex (select) |
| Place | name, place_category (select), coordinates_lat (number), coordinates_long (number) |
| Event | title, event_type, date, place |
| Source | title, source_type, date, repository |
| Organization | name, org_type, founded, dissolved, seat |

**Files modified:** `profile-types.ts`, `identity-section.ts`, `profile-view.ts`, `place-note-writer.ts` (export `requoteWikilinksInFrontmatter`), `profile-view.css`

**Files created:** `inline-edit.ts`

---

## Structured Role Lists for Organizations (2026-02-28)

**GitHub Issue:** [#274](https://github.com/banisterious/obsidian-charted-roots/issues/274)

Adds a `roles` property to organization notes defining valid roles and display order, with role picker autocomplete in membership modals, per-type default role templates, and automatic role ordering in the members renderer.

**Problem:** Organization membership roles were freeform text, causing typos, inconsistency, and repetitive data entry. The `role-order` config on `charted-roots-members` blocks helped with display ordering but had to be maintained per-block.

**Solution:** A `roles` array on organization notes that serves as both a validation list and display-order specification:

```yaml
roles:
  - Lord
  - Heir
  - Castellan
  - Maester
```

**Implementation:**

- **Type system** (`organization-types.ts`): Added `roles?: string[]` to `OrganizationInfo` and `OrganizationFrontmatter`; added `defaultRoles?: string[]` to `OrganizationTypeDefinition` for per-type role templates
- **Organization service** (`organization-service.ts`): Parse, create, update roles; `getEffectiveRoles()` method with fallback chain (org roles → type default roles → empty)
- **RoleSuggest** (`role-suggest.ts`): New `AbstractInputSuggest<string>` component for combobox-style autocomplete on role text inputs; works with both `Setting.addText()` and raw `<input>` elements
- **Add Membership modal**: Role suggest attached dynamically when organization selection changes
- **Manage Members modal**: Role suggest attached in inline edit form
- **Members renderer**: 3-level fallback for role ordering: block-level `role-order` → org-level `roles` → alphabetical
- **Create Organization modal**: Chip-based roles editor with add/remove, auto-populated from type defaults
- **Organization Type Editor**: Default roles editor with same chip UI, persisted in all save paths (create, edit, customize built-in)
- **CSS**: `.cr-roles-chip-list`, `.cr-roles-chip`, `.cr-roles-chip__remove` styles

## Mills-Aligned Source Classification (2026-02-28)

**GitHub Issue:** [#276](https://github.com/banisterious/obsidian-charted-roots/issues/276)

Adds three optional source classification axes from Elizabeth Shown Mills' *Evidence Explained*, enabling GPS-oriented genealogists to classify sources with precision matching professional methodology.

**Problem:** The existing `source_quality` property (`primary`/`secondary`/`derivative`) conflates Mills' source and information classification systems, making consistent application difficult.

**Solution:** Three independent, optional frontmatter properties alongside the existing `source_quality`:

| Property | Values | Question |
|----------|--------|----------|
| `source_classification` | `original`, `derivative`, `authored_narrative` | What is the document? |
| `information_classification` | `primary`, `secondary`, `undetermined` | Who provided the info? |
| `evidence_classification` | `direct`, `indirect`, `negative` | How does it relate to the question? |

**Implementation:**

- **Type system** (`source-types.ts`): Three union types, label constants with descriptions, `getEffectiveInformationQuality()` bridge function that maps `information_classification` to the existing `SourceQuality` type for backward compatibility
- **Source service** (`source-service.ts`): Create, update, and parse operations for all three properties with frontmatter validation
- **Create Source modal** (`create-source-modal.ts`): Collapsible "Source classification (Mills)" section following the existing `crc-inline-expand` pattern, with three dropdowns and auto-expand when data exists
- **Evidence analysis** (`evidence-service.ts`, `proof-summary-service.ts`): `getEffectiveInformationQuality()` replaces `getSourceQuality()` — when `information_classification` is present, it takes precedence
- **Reports** (`source-summary-generator.ts`, `sources-by-role-generator.ts`, `pdf-report-renderer.ts`): Conditionally display Mills classification columns when any source has classification data
- **Templates** (`template-snippets-modal.ts`): Census (derivative/primary), vital record (original/primary/direct), full template (three Templater suggesters)

**Design decisions:**
- `source_quality` remains fully functional with no semantic changes — gradual deprecation path
- Classifications live on source notes, not per-claim (per-claim is v2 for proof summaries)
- No breaking changes — existing data works identically

---

## Version 0.10.x - 0.11.x Summary (2025-12)

The v0.10.x and v0.11.x releases focused on data quality, GEDCOM import reliability, and UI polish for Obsidian community plugin review submission.

**Major Features:**
- **Data Quality Tab** - Comprehensive data quality analysis with bidirectional relationship sync, duplicate detection, parent claim conflicts, orphan reference detection, and batch operations
- **GEDCOM Import V2** - Pre-import data quality preview with place name standardization, issue detection before file creation
- **Maps Module** - Leaflet map view, custom image maps for fictional worlds, bulk geocoding via OpenStreetMap
- **Events Module** - Event notes, timeline export to markdown callouts and Canvas, event type management
- **Organizations Module** - Organization notes with membership tracking
- **Places Module** - Place hierarchy management, geocoding, place type customization
- **Relationships Module** - Custom relationship type definitions
- **Schemas Module** - Note validation schemas for data consistency

**GEDCOM Import Fixes (v0.11.5-0.11.9):**
- Fixed race condition with BidirectionalLinker during import
- Fixed ID replacement for duplicate names (numeric suffix handling)
- Fixed regex substring matching causing corrupt cr_id formats
- Fixed children_id replacement in Phase 2
- Added corrupt cr_id format detection in data quality checks

**UI/UX Improvements:**
- 15 Control Center tabs (up from 6)
- Parent claim conflict resolution card
- Improved person picker with sorting/filtering
- Pre-import quality preview modal
- Place name variant standardization

---

## Re-Layout Canvas Command (2025-11-21)

**Added:** Complete re-layout functionality for existing family tree canvases.

**Implemented Features:**

1. **Command Integration:**
   - Command Palette: "Re-layout current canvas"
   - Right-click menu on canvas files (file explorer, tab bar, three-dot menu)
   - Uses current plugin settings for spacing and node dimensions

2. **Smart Re-Layout Logic:**
   - Reads existing canvas JSON structure
   - Extracts person notes and relationships
   - Rebuilds family tree from current vault data
   - Recalculates positions using family-chart layout engine
   - Preserves Obsidian's exact JSON formatting

3. **Non-Destructive Updates:**
   - Updates canvas in-place (same file, same location)
   - Uses current relationship data from person notes
   - Applies current spacing/sizing settings
   - Shows success notification with person count

**Use Cases:**
- Update tree after editing relationships in person notes
- Apply new spacing settings to existing canvases
- Fix layout after data corrections
- Standardize multiple trees with consistent settings
- Refresh trees created with older layout algorithms
- Test different layout configurations

**Files Modified:**
- `main.ts` - Added `relayoutCanvas()` method (lines 165-310)
- `main.ts` - Added `formatCanvasJson()` helper (lines 321-358)
- `main.ts` - Added file-menu context integration
- `main.ts` - Added command registration
- `src/ui/relayout-options-modal.ts` - Modal for re-layout direction selection

**Technical Details:**
- Uses full tree generation (`treeType: 'full'`) to include all people in canvas
- Detects root person automatically (first person note with cr_id)
- Applies 100ms delay when opening canvas before re-layout
- Formats JSON with tabs and compact objects to match Obsidian format
- Comprehensive error handling with user-friendly notices

---

## Canvas Metadata & Smart Re-layout (2025-11-22)

**Added:** Embedded generation metadata in canvas files to enable intelligent re-layout with preserved settings.

**Implemented Features:**

1. **Canvas Generation Metadata:**
   - Stores complete generation parameters in canvas frontmatter
   - Metadata includes: root person (cr_id and name), tree type, max generations, spouse inclusion, layout direction, timestamp
   - Layout settings preserved: node dimensions, horizontal/vertical spacing
   - Metadata format compatible with Obsidian Canvas JSON specification

2. **Smart Re-Layout with Settings Preservation:**
   - Re-layout modal reads original generation settings from canvas metadata
   - Displays original settings to user: "Originally generated as 'full' tree from Thomas Wilson with direction: vertical"
   - Preserves all original settings (tree type, generations, spouses) when re-layouting
   - Only allows changing layout direction (vertical ↔ horizontal)
   - Maintains generation timestamp for tracking

3. **Metadata Infrastructure:**
   - `CanvasRootsMetadata` interface in canvas-generator.ts defines metadata schema
   - Metadata embedded in canvas JSON at generation time (both Control Center and Generate All Trees)
   - `formatCanvasJson()` methods properly serialize metadata to frontmatter
   - Re-layout reads metadata and passes to canvas generator to preserve settings

**Files Modified:**
- `src/core/canvas-generator.ts` - Added `CanvasRootsMetadata` interface, metadata logging, metadata embedding in canvas output
- `src/ui/control-center.ts` - Added metadata to `handleTreeGeneration()` and `openAndGenerateAllTrees()`, fixed `formatCanvasJson()` to serialize frontmatter
- `main.ts` - Updated `relayoutCanvas()` to read and use stored metadata, fixed `formatCanvasJson()` to serialize frontmatter
- `src/ui/relayout-options-modal.ts` - Enhanced modal to read and display original generation settings from metadata

**Technical Details:**
- Metadata stored in standard Obsidian Canvas `metadata.frontmatter` field as `Record<string, unknown>`
- TypeScript literal types (`as const`) ensure type safety for fixed values like 'canvas-roots', 'full', 'vertical'
- Uses plugin's structured logging system (`getLogger('CanvasGenerator')`) instead of console.log
- Metadata passed through generation pipeline via `canvasRootsMetadata` option parameter
- JSON serialization via `JSON.stringify()` for nested metadata object

**Use Cases:**
- Preserve complex tree configurations when switching between vertical/horizontal layouts
- Track when and how each canvas was generated for audit trail
- Enable future "regenerate with same settings" functionality
- Support canvas versioning and migration in future updates

---

## Tree Generation Tab Streamlining (2025-11-21)

**Enhanced:** Redesigned Tree Generation tab with inline person browser for improved UX.

**Major Changes:**
- **Removed Modal Dependency:** Eliminated PersonPickerModal from Tree Generation workflow
- **Inline Person Browser:** Integrated complete person selection directly into Root Person card
- **Single-Card Interface:** Consolidated all tree generation actions into one streamlined card
- **Improved Prominence:** Moved generate buttons into Root Person card for better visibility

**Implemented Features:**

1. **Inline Person Browser in Root Person Card:**
   - Real-time search filtering by person name
   - 5 sort options (Name A-Z/Z-A, Birth year ascending/descending, Recently modified)
   - 3 filter categories (Living status, Birth date presence, Sex)
   - Family group sidebar for multi-family vaults (shows disconnected components)
   - Constrained height (400px max) with scrollable results
   - Async loading of all person notes and family components

2. **Integrated Generation Actions:**
   - Canvas name input field (optional)
   - Large, prominent "Generate family tree" button
   - "Generate all trees" option with dynamic family group count
   - Visual "OR" separator for clarity
   - Both generation options in same card - no scrolling required

3. **Multi-Family Detection:**
   - Uses BFS graph traversal via FamilyGraphService
   - Automatically detects disconnected family components
   - Dynamic message shows actual count: "Found 6 disconnected family groups"
   - "Generate all trees" auto-selects one representative per component

**Layout Before:**
- Root person field in Configuration card (modal picker)
- Configuration card (tree type, generations, spouses)
- Layout card (direction, spacing)
- Output card at bottom (canvas name, generate button) - easy to miss

**Layout After:**
- Root Person card (person display, inline browser, canvas name, both generate buttons)
- Tree Configuration card (tree type, generations, spouses)
- Layout Options card (direction, spacing)

**UX Benefits:**
- No modal switching required - entire workflow in one view
- Primary action impossible to miss (large button at top)
- Clear distinction between single-tree and multi-tree workflows
- Faster person selection with inline filtering
- Better understanding of vault structure via family group detection

---

## Person Picker Enhancements (2025-11-20)

**Added:** Sorting and filtering capabilities for person selection modal.

**Note:** PersonPickerModal is now primarily used in the Data Entry tab. The Tree Generation tab uses an inline person browser implementation (see Tree Generation Tab Streamlining above).

**Implemented Features:**
- **5 Sort Options:**
  - Name (A-Z / Z-A)
  - Birth year (oldest first / youngest first)
  - Recently modified
- **3 Filter Categories:**
  - Living status (all / living / deceased)
  - Birth date presence (all / has date / missing date)
  - Sex (all / M / F)

**Smart Date Parsing:**
- Extracts year from various date formats for chronological sorting
- Handles people without birth dates gracefully (sorted to end)

---

## Recent Trees History (2025-11-20)

**Added:** "Recently generated trees" card in Control Center Status tab.

**Implemented Features:**
- **Automatic Tree Tracking:**
  - Saves metadata for each generated tree
  - Tracks: canvas name, path, people count, edge count, root person, timestamp
  - Stores last 10 trees in plugin settings
- **Status Tab Display:**
  - Clickable tree names that open the canvas
  - Shows root person and generation stats
  - Relative timestamps ("2 hours ago", "just now")
- **Automatic Cleanup:**
  - Filters out deleted canvas files when rendering
  - Updates settings to remove dead entries
  - Keeps settings tidy automatically

---

## GEDCOM X and Gramps XML Export (2025-12-02)

**Added:** Full export capabilities for GEDCOM X (JSON) and Gramps XML formats, completing round-trip support for all import formats.

**Implemented Features:**

1. **GEDCOM X Export (src/gedcomx/gedcomx-exporter.ts):**
   - FamilySearch-compatible JSON format
   - Exports persons with names, gender, and facts (birth, death)
   - Exports ParentChild and Couple relationships
   - Privacy-aware: optional anonymization of living persons
   - Configurable filename with sanitization

2. **Gramps XML Export (src/gramps/gramps-exporter.ts):**
   - Gramps genealogy software compatible XML format
   - Exports persons, families, events, and places
   - Proper XML escaping and formatting
   - Privacy-aware: optional anonymization of living persons
   - Family records link parents to children

3. **Control Center UI Enhancements:**
   - Separated Import and Export into distinct cards
   - Folder configuration card for shared settings
   - Format dropdowns for import and export selection
   - All formats available for both import and export

4. **Context Menu Integration:**
   - Consolidated Export submenu (Excalidraw + image formats)
   - Charted Roots submenu for place notes
   - Charted Roots submenu for blank notes (Add essential properties)

**Technical Details:**
- Reuses existing type definitions from gedcomx-types.ts and gramps-types.ts
- Leverages PrivacyService for consistent privacy protection across all formats
- Supports per-export privacy override in export options

---

## Canvas Color Enhancements (2025-11-20)

**Enhanced:** Gender-based node coloring using all 6 available Canvas colors.

**Implemented Features:**
- **Gender Detection:** Reads `sex` or `gender` field from YAML frontmatter
  - Male (M/MALE): Canvas color 4 (Green)
  - Female (F/FEMALE): Canvas color 6 (Purple)
  - Unknown/Neutral: Canvas color 2 (Orange)
- **GEDCOM Compatibility:** Supports standard GEDCOM SEX tag values (M, F, U)
- **Fallback Support:** Legacy name-based detection (Mr., Mrs., etc.) still works
- **Enhanced Edge Colors:**
  - Parent-child relationships: Canvas color 1 (Red)
  - Spouse relationships: Canvas color 5 (Blue)
  - Default edges: Canvas color 3 (Yellow)

**Technical Details:**
- Added `sex` field to `PersonNode` interface
- Updated `extractPersonNode()` to extract sex/gender from frontmatter
- Enhanced `getPersonColor()` to prioritize frontmatter over name heuristics
- Updated `getEdgeColor()` to use more distinctive colors
- All 6 Obsidian Canvas colors now utilized for visual clarity

**Benefits:**
- More accurate gender representation using GEDCOM-standard data
- Better visual differentiation using full color palette
- Maintains compatibility with existing vaults (graceful degradation)
- Prepares foundation for future customizable color schemes

---

## Evidence Visualization (2025-12-05)

**Added:** GPS-aligned fact tracking, proof summaries, and canvas conflict markers for v0.9.0.

**Implemented Features:**

1. **Fact-Level Source Tracking:**
   - New `sourced_facts` property on person notes
   - Per-fact source arrays: `birth_date`, `birth_place`, `death_date`, `death_place`, `marriage_date`, `occupation`
   - Research coverage percentage calculated from sourced vs total facts
   - Configurable fact coverage threshold in settings

2. **Source Quality Classification:**
   - Three quality levels: Primary, Secondary, Derivative (per Evidence Explained methodology)
   - `source_quality` property on source notes
   - Color-coded quality badges throughout the UI

3. **Research Gaps Report:**
   - Data Quality tab shows unsourced facts across the tree
   - Filter by fact type or person
   - Priority ranking by number of missing sources

4. **Proof Summary Notes:**
   - New note type `type: proof_summary` with structured frontmatter
   - Track subject person, fact type, conclusion, status, and confidence
   - Evidence array linking sources with support levels (strongly/moderately/weakly/conflicts)
   - Status workflow: draft → complete → needs_review → conflicted
   - Confidence levels: proven, probable, possible, disproven
   - Full CRUD operations via Create Proof modal

5. **Source Conflict Detection:**
   - Detects proof summaries with `status: conflicted` or conflicting evidence items
   - Source Conflicts section in Data Quality tab
   - Shows conflict count per person

6. **Canvas Conflict Markers:**
   - `⚠️ N` indicator at top-left of person nodes with unresolved conflicts
   - Red color (canvas color '1') draws attention to research issues
   - Only visible when `trackFactSourcing` is enabled
   - Complements existing source indicator (`📎 N · %`) at top-right

**Settings Added:**
- `trackFactSourcing`: Enable fact-level source tracking (default: false)
- `factCoverageThreshold`: Number of facts for 100% coverage (default: 6)
- `showResearchGapsInStatus`: Show research gaps in Status tab (default: true)

---

## GEDCOM Test Datasets (2025-11-20)

**Created:** Progressive test files for scale testing the layout engine.

**Test Files:**
- **gedcom-sample-small.ged:** 27 people, 4 generations (baseline scale test)
- **gedcom-sample-medium.ged:** 60 people, 5 generations (medium complexity)
- **gedcom-sample-large.ged:** 163 people, 6 generations (realistic genealogy)
- **gedcom-sample-xlarge.ged:** 599 people, 7 generations (extreme stress test)

**Documentation:**
- `gedcom-testing/TESTING.md` - Comprehensive testing guide with success criteria
- Includes methodology, metrics to track, and expected challenges
- **Note:** All individuals in test files are entirely fictional
