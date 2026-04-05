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

### Phase 1 — Consolidate duplicate utilities
- [ ] Wikilink extraction: remove duplicate, import canonical
- [ ] Place normalization: replace private variants with canonical import
- [ ] Date formatting: consolidate

### Phase 2 — Split context-menus.ts
- [ ] Extract person note context menus
- [ ] Extract place note context menus
- [ ] Extract source note context menus
- [ ] Extract event note context menus
- [ ] Extract folder context menus
- [ ] Extract canvas/map context menus

### Phase 3 — Standardize service access
- [ ] Add missing plugin methods (PlaceGraphService, SourceService)
- [ ] Migrate direct `new` calls in high-traffic files

### Phase 4 — Split remaining large files (as needed)
- [ ] create-person-modal.ts — extract form sections
- [ ] family-chart-view.ts — extract services
- [ ] cleanup-wizard-modal.ts — extract step renderers

### Phase 5 — Minor cleanup
- [ ] Convert `@ts-ignore` to `@ts-expect-error`
- [ ] Review `as any` and non-justified suppressions
- [ ] File issues for actionable TODOs
- [ ] Remove unused exports
