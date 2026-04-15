# Codebase Cleanup Scan

Results from the April 2026 full codebase scan.

**Status:** ✅ Complete

---

## Duplicate Functions

### 1. `formatCanvasJson()` — 3 copies

| Location | Lines |
|----------|-------|
| `src/core/canvas-utils.ts` | Canonical location |
| `src/trees/ui/trees-tab.ts` | Duplicate |
| `src/plugin/bulk-operations.ts` | Duplicate |

**Fix:** Remove duplicates from trees-tab and bulk-operations, import from canvas-utils.

### 2. `getContrastColor()` — 2 copies

| Location | Lines |
|----------|-------|
| `src/ui/create-person-types.ts` | Extracted during tech debt audit |
| `src/ui/shared/card-component.ts` | Original location |

**Fix:** Keep in one location (create-person-types or a shared utility), remove from the other, update imports.

### 3. `findDuplicatePlaceNotes()` — 2 copies with different signatures

| Location | Signature |
|----------|-----------|
| `src/ui/standardize-place-variants-modal.ts` | Returns `PlaceDuplicateGroup[]` |
| `src/ui/merge-duplicate-places-modal.ts` | Returns `DuplicatePlaceGroup[]`, takes options parameter |

**Fix:** These serve different purposes (variant detection vs merge detection). Rename one to clarify the distinction rather than consolidating.

---

## TODO Comments (12)

These are all planned/deferred features, not bugs. Track as issues if they become actionable.

| File | TODO | Category |
|------|------|----------|
| `src/core/family-graph.ts:2038` | Look up target's sex for step-parent assignment | [#365](https://github.com/banisterious/obsidian-charted-roots/issues/365) |
| `src/events/ui/create-event-modal.ts:303` | Add multiple person picker support | [#366](https://github.com/banisterious/obsidian-charted-roots/issues/366) |
| `src/schemas/ui/schemas-tab.ts:358` | Implement targeted validation | [#367](https://github.com/banisterious/obsidian-charted-roots/issues/367) |
| `src/organizations/services/organization-service.ts:212` | Calculate membership stats | [#368](https://github.com/banisterious/obsidian-charted-roots/issues/368) |
| `src/places/services/place-lookup-service.ts:534` | Implement OAuth 2.0 flow (Phase 3) | Deferred |
| `src/places/services/place-lookup-service.ts:547` | Research GOV API (Phase 3) | Deferred |
| `src/reports/ui/report-wizard-modal.ts:1125` | Implement universe picker | [#369](https://github.com/banisterious/obsidian-charted-roots/issues/369) |
| `src/reports/ui/report-wizard-modal.ts:1129` | Implement collection picker | [#369](https://github.com/banisterious/obsidian-charted-roots/issues/369) |
| `src/maps/map-view.ts:2514` | Add full map settings to plugin settings | Deferred |
| `src/reports/services/pdf-report-renderer.ts:809` | Add marriage data to FamilyGroupSheet | [#370](https://github.com/banisterious/obsidian-charted-roots/issues/370) |
| `src/reports/services/timeline-generator.ts:401` | Expand place hierarchy for child places | Deferred |
| `src/ui/staging-management-modal.ts:611` | Open CrossImportReviewModal | Deferred |

---

## Implementation Plan

- [x] Create planning doc
- [x] Consolidate `formatCanvasJson()` — removed 2 duplicates (trees-tab, bulk-operations), canonical in canvas-utils.ts
- [x] Consolidate `getContrastColor()` — removed 8 duplicates across tab/manager files, canonical in create-person-types.ts. One additional private method copy in organization-type-editor-modal remains.
- [x] Rename `findDuplicatePlaceNotes()` → `findDuplicatePlacesByFullName()` in standardize-place-variants-modal to disambiguate from merge-duplicate-places-modal version
