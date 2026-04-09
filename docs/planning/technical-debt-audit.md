# Technical Debt Audit

Planning document for addressing technical debt identified in the April 2026 codebase audit.

**Status:** In progress

**Codebase stats:** 386 TypeScript source files, ~237,000 lines of code

---

## Summary

| Issue | Severity | Count | Effort | Status |
|-------|----------|-------|--------|--------|
| Large files needing refactor | Critical | 5 files | High | Planned |
| Duplicate code patterns | Critical | 3 major patterns | Medium | Planned |
| Service instantiation inconsistency | High | 2 patterns | Medium | Planned |
| TODO items | Medium | 16 comments | Varies | Tracked |
| Type safety suppressions | Low-Medium | 24 instances | Medium | Deferred |
| ESLint-disabled rules | Low | 41 instances | Low | Acceptable |

---

## Critical: Large Files

Files over 3,000 lines that are candidates for splitting:

| File | Lines | Methods | Recommendation |
|------|-------|---------|----------------|
| `src/plugin/context-menus.ts` | 5,813 | — | Split by entity type (person, place, source, event, folder) |
| `src/ui/views/family-chart-view.ts` | 5,343 | 154 | Extract rendering, interaction, and export logic into services |
| `src/ui/cleanup-wizard-modal.ts` | 4,211 | 115 | Extract step renderers into separate files |
| `src/core/canvas-split.ts` | 4,067 | — | Extract layout algorithms into separate modules |
| `src/ui/create-person-modal.ts` | 3,335 | 76 | Extract form sections (parents, spouses, sources, DNA) |

### Priority order

1. **context-menus.ts** — Highest churn, most imports (50+), most likely to cause merge conflicts
2. **create-person-modal.ts** — Frequently modified for new features
3. **family-chart-view.ts** — Complex but relatively stable
4. **cleanup-wizard-modal.ts** — Step-based structure makes splitting natural
5. **canvas-split.ts** — Complex but rarely modified

---

## Critical: Duplicate Code Patterns

### 1. Wikilink extraction (2 implementations)

| Location | Function | Notes |
|----------|----------|-------|
| `src/utils/wikilink-resolver.ts` | `extractWikilinkPath()` | Comprehensive, handles edge cases |
| `src/relationships/types/relationship-types.ts` | `extractWikilinkPath()` | Simpler, no edge case handling |

**Fix:** Remove the relationship-types version and import from wikilink-resolver.ts.

### 2. Place name normalization (7+ implementations)

| Location | Function | Scope |
|----------|----------|-------|
| `src/utils/place-name-normalizer.ts` | `normalizePlaceName()` | Canonical (exported) |
| `src/ui/standardize-places-modal.ts` | `normalizePlaceName()` | Private duplicate |
| `src/enhancement/services/place-generator.ts` | `normalizePlaceString()` | Private variant |
| `src/gedcom/gedcom-importer-v2.ts` | `normalizePlaceString()` | Private variant |
| `src/statistics/services/statistics-service.ts` | `normalizePlace()` | Private variant |
| `src/core/cross-import-detection.ts` | `normalizeName()` | Private (for names) |
| `src/core/duplicate-detection.ts` | `normalizeName()` | Private (for names) |

**Fix:** Replace all private variants with imports from the canonical `place-name-normalizer.ts`. For name normalization, create or use a shared `normalizeName()` utility.

### 3. Date formatting (2 implementations)

| Location | Function | Notes |
|----------|----------|-------|
| `src/dates/utils/date-display.ts` | `formatDisplayDate()` | Standalone function |
| `src/dates/services/date-service.ts` | `formatDisplayDate()` | Instance method |

**Fix:** Have the service method delegate to the standalone function, or consolidate.

---

## High: Service Instantiation Inconsistency

Two patterns in use:

**Pattern A: Direct instantiation** — `new FamilyGraphService(app)` (82 instances)
**Pattern B: Plugin methods** — `plugin.createFamilyGraphService()` (85 instances)

| Service | Direct `new` | Plugin method | Has plugin method? |
|---------|-------------|---------------|-------------------|
| FamilyGraphService | 33 | 54 | Yes (`create`) |
| PlaceGraphService | 31 | 0 | No |
| EventService | 18 | 31 | Yes (`get`) |
| SourceService | inline | 0 | No |

**Fix:**
1. Add `createPlaceGraphService()` and `getSourceService()` to the plugin class
2. Gradually migrate direct `new` calls to plugin methods
3. Consider caching frequently-created services (FamilyGraphService, PlaceGraphService)

---

## Medium: TODO Comments (16)

| Category | Count | Action |
|----------|-------|--------|
| Future phases (Place Lookup Phase 3, OAuth) | 2 | Leave as-is |
| Unimplemented pickers (universe, collection) | 2 | File issues |
| Incomplete features (multiple person picker, membership stats) | 3 | File issues |
| Enhancement ideas (map settings tab, child places) | 3 | File issues |
| Deferred implementation (cross-import review, staging) | 2 | Leave as-is |
| Minor improvements (marriage data, import start) | 4 | Address during related work |

---

## Low-Medium: Type Safety Suppressions (24)

| Type | Count | Justification |
|------|-------|---------------|
| `@ts-expect-error` for Leaflet plugins | 12 | Justified — no types available |
| `@ts-expect-error` for Obsidian internals | 6 | Justified — private API |
| `@ts-expect-error` other | 3 | Review case-by-case |
| `as any` | 2 | Review — may be fixable |
| `@ts-ignore` | 1 | Convert to `@ts-expect-error` |

**Fix:** Convert `@ts-ignore` to `@ts-expect-error`. Review the 5 non-Leaflet/non-Obsidian suppressions for better typing.

---

## Low: ESLint Disabled Rules (41)

38 of 41 are `@typescript-eslint/require-await` on Obsidian's `ItemView` methods that require async signatures. These are all justified and not worth changing.

2 are `@typescript-eslint/no-explicit-any` — review for better typing.

---

## Implementation Plan

### Phase 1 — Consolidate duplicate utilities ✅
- [x] Wikilink extraction: replaced duplicate in relationship-types.ts with re-export from canonical wikilink-resolver.ts
- [x] Place normalization: renamed ambiguous `normalizePlaceName` in standardize-places-modal.ts to `normalizeForComparison` (audit found the variants serve different purposes — not true duplicates)
- [x] Date formatting: DateService.formatDisplayDate() now delegates to standalone formatStandardDisplayDate() instead of duplicating GEDCOM qualifier parsing

### Phase 2 — Split context-menus.ts ✅
- [x] Extracted 30+ helper functions (1,691 lines) into `context-menu-helpers.ts`
- [x] Extracted 11 entity-specific menu builders into standalone functions:
  - `buildCanvasContextMenu` (canvas files)
  - `buildPersonContextMenu` (person notes — 1,120 lines, largest section)
  - `buildFolderContextMenu` (folder menus — 1,040 lines)
  - `buildSchemaContextMenu`, `buildMapContextMenu`, `buildPlaceContextMenu`
  - `buildSourceContextMenu`, `buildEventContextMenu`, `buildOrganizationContextMenu`
  - `buildPlainMarkdownContextMenu`, `buildUniverseContextMenu`
- [x] `registerContextMenus()` reduced from ~4,080 lines to ~150 lines of clean dispatch logic
- Note: The builder functions remain in context-menus.ts (4,294 lines total). Could be split into separate files in a follow-up if needed, but readability is already substantially improved.

### Phase 2b — Split context-menus.ts into separate files (optional follow-up)

The 11 builder functions are now standalone but still live in `context-menus.ts` (4,294 lines). Further splitting into separate files would:
- Reduce per-file line count from 4,294 to ~150 (dispatcher) + ~1,100 (person) + ~1,000 (folders) + smaller files
- Make entity-specific menus independently navigable in the file tree
- Reduce import overhead (each file imports only what it needs)

Proposed structure:
- [ ] `context-menus/index.ts` — `registerContextMenus()` dispatcher (~150 lines)
- [ ] `context-menus/person-menus.ts` — `buildPersonContextMenu` (~1,120 lines)
- [ ] `context-menus/folder-menus.ts` — `buildFolderContextMenu` (~1,040 lines)
- [ ] `context-menus/place-menus.ts` — `buildPlaceContextMenu`
- [ ] `context-menus/source-menus.ts` — `buildSourceContextMenu`
- [ ] `context-menus/event-menus.ts` — `buildEventContextMenu`
- [ ] `context-menus/canvas-menus.ts` — `buildCanvasContextMenu`
- [ ] `context-menus/other-menus.ts` — schema, map, org, universe, plain MD builders

Not urgent — readability is already substantially improved. Prioritize if merge conflicts become frequent.

### Phase 3 — Standardize service access (partially complete)
- [x] Added `getSourceService()` to plugin class (lazy-initialized singleton)
- [x] Migrated 22 of 31 direct `new SourceService()` calls to `plugin.getSourceService()`
  - 14 UI/processor files: replaced with `plugin.getSourceService()` directly
  - 7 UI files (create-person-modal, export-wizard, media modals): replaced with `this.plugin.getSourceService()`
  - 9 service/exporter/report files: added optional `sourceService?` constructor parameter with `?? new SourceService()` fallback
- [ ] Migrate 33 direct `new FamilyGraphService()` calls to `plugin.createFamilyGraphService()`
  - Direct calls manually repeat `setFolderFilter`, `setPropertyAliases`, `setValueAliases` setup
  - Plugin method handles all setup automatically — migrating prevents missed setter bugs
  - PlaceGraphService has same issue: 35 direct calls vs 23 via plugin method
- Note: `createPlaceGraphService()` already exists on the plugin (audit incorrectly reported it as missing)

### Phase 4 — Split remaining large files ✅
- [x] create-person-modal.ts (3,334 → 3,226 lines): Extracted 6 type definitions and 2 pure utility functions to `create-person-types.ts`. Most methods tightly coupled to `this`, limiting further extraction.
- [x] family-chart-view.ts (5,366 → 3,668 lines): Extracted all export functionality (1,700 lines) to `family-chart-export.ts` using context-based delegation pattern. Export functions receive `FamilyChartExportContext` instead of `this`.
- [x] cleanup-wizard-modal.ts (4,211 → 3,849 lines): Extracted 6 types, 3 constants (including 14 step configs), and 8 pure utility functions to `cleanup-wizard-types.ts`.

### Phase 5 — Minor cleanup ✅
- [x] Convert `@ts-ignore` to `@ts-expect-error` — no `@ts-ignore` found in codebase (already clean)
- [x] Review `as any` — replaced 1 instance in relationship-service.ts with `Record<string, unknown>`. Remaining `as any` is in excalidraw-automate.d.ts (type definition comment, acceptable)
- [x] File issues for actionable TODOs — no TODO comments found in codebase (already cleaned up)
- [x] Remove unused exports — removed `formatDecimal` from coordinate-converter.ts
