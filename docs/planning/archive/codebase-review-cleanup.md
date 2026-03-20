# Full Codebase Review & Cleanup

## Context

Recent `/simplify` reviews have been scoped to git diffs (recent changes only). The codebase has grown organically to 352 TypeScript files and needs a comprehensive review for code reuse, quality, and efficiency. This plan structures that effort into manageable phases.

## Scope

Full codebase — all `.ts` files in `src/` and `main.ts`. Not a rewrite; focused on cleanup, deduplication, and consistency improvements.

## Phase 1: Pattern hunts (quick wins)

Targeted searches across the full codebase for specific anti-patterns. Each can be a standalone commit.

### 1a. Duplicate utility logic — DONE
- Added `capitalize()`, `pluralize()`, `splitAndTrim()` to `src/utils/format-utils.ts`
- Replaced 35 inline capitalize patterns across 24 files
- Replaced ~100 inline pluralization patterns across 34 files
- Replaced 13 split-trim-filter chains across 10 files
- ~20 variant patterns intentionally left (capitalize+toLowerCase, capitalize+replace, initials-only)

### 1b. Repeated service initialization — DONE
- Added `createConfiguredFamilyGraph(app, settings)` factory to `src/core/family-graph.ts`
- Replaced 7-line boilerplate in all 12 report generators (-79 lines net)
- Non-report callers use partial patterns (missing setSettings or ensureCacheLoaded) — left as-is

### 1c. Dead code and unused exports — DONE
- Removed unused `PersonNode` interface from `src/models/person.ts` (superseded by `core/family-graph.ts`)
- Unexported local `NoteType` in `src/ui/create-note-modal.ts`
- Duplicate `PersonFrontmatter` in merge-service.ts left as-is (different index signature, used internally)
- 13 TODO comments audited — all legitimate future work

### 1d. Inconsistent patterns — DONE
- Renamed `organizations/constants/organization-types.ts` → `organization-type-defaults.ts` (resolved naming conflict with `types/organization-types.ts`)
- Standardized RelationshipService imports to use barrel exports (2 files)
- Service instantiation audit: 8 singletons on plugin, ~15 on-demand services, 9 factory functions exist but mostly unused. Standardizing would require architectural decisions — deferred to Phase 4 (main.ts decomposition)
- Logger pattern (`getLogger()`) and vault read pattern (`app.vault.read()`) are already consistent

## Phase 2: Report generator deduplication — DONE

**Completed:**
- Extracted `nodeToReportPerson()` and `normalizeSex()` into `src/reports/services/report-utils.ts`
- Replaced identical private methods in 10 generators (-290 lines)
- `createConfiguredFamilyGraph()` factory already extracted in Phase 1b (-79 lines)

**Deferred (low ROI):**
- Base class for constructor + logger: only ~7 lines per generator, and each `generate()` method has a different signature. A base class would add inheritance complexity without proportional benefit.
- place-summary-generator uses a different node type — would need a generic or overload, adding complexity

## Phase 3: Dynamic content processor deduplication — DONE

**Completed:**
- Extracted `renderBlockError()` and `renderBlockLoading()` into `dynamic-content-service.ts`
- Replaced identical private methods across all 8 processors (-67 lines net)

**Deferred (low ROI):**
- Base class for process() flow: each processor has unique metadata watching strategies, different re-render triggers, async/sync differences. A base class would add more complexity than it removes.
- Constructor pattern varies (renderer instantiation differs per processor)

## Phase 4: main.ts decomposition — DONE

**Completed:**
- Decomposed `onload()` into `registerViews()`, `registerCodeBlockProcessors()`, `registerCommandsAndEvents()`, `registerContextMenus()` (onload went from ~4900 lines to 72 lines)
- Extracted context menus + 34 supporting methods to `src/plugin/context-menus.ts` (5,604 lines)
- Extracted commands to `src/plugin/commands.ts` (~859 lines)
- Extracted activation methods to `src/plugin/activation.ts` (~277 lines, with shared `activateSidebarView()` helper)
- Extracted base template methods to `src/plugin/base-templates.ts` (~252 lines, consolidated 8 near-identical methods into shared `createBaseFile()`)
- Extracted bulk operations to `src/plugin/bulk-operations.ts` (~1,055 lines: edit modals, reference numbering, lineage, tree/canvas ops, dynamic blocks)
- main.ts reduced from 9,386 → 937 lines (90% reduction)

## Phase 5: Large modal/view decomposition — DONE (partial)

**Completed:**
- `settings.ts`: decomposed `display()` from ~984 lines into 9 private `render*Section()` methods within the same class
- `family-chart-view.ts`: extracted `DeletePersonConfirmModal` + `FamilyChartStyleModal` to `family-chart-view-modals.ts` (~291 lines); cleaned up private access bracket notation hacks
- `data-quality-tab.ts`: extracted batch operations block (~1,500 lines) to `data-quality-batch-ops.ts`; updated callers in `control-center.ts`

**Deferred (single-class modals — too tightly coupled for safe extraction):**
- `cleanup-wizard-modal.ts` (4,211 lines): single class, 180+ private methods all sharing wizard state; extraction would require making ~10+ fields public — high risk, low ROI
- `create-person-modal.ts` (3,176 lines): same pattern — single class, 90+ private methods sharing modal state

**Note:** The export wizard for family-chart was already extracted before this phase (`family-chart-export-wizard.ts`, `family-chart-export-progress-modal.ts`). The remaining export implementation methods in family-chart-view.ts are deeply coupled to chart-specific private fields (`f3Chart`, `chartData`, etc.) — not extractable without exposing a large internal API.

## Execution approach

- Work phase-by-phase, one commit per logical change
- Each phase can be its own PR or grouped into a few PRs
- Phases 1-3 are low-risk refactors (no behavioral changes)
- Phase 4 (main.ts) is higher-risk — needs careful testing
- Phase 5 is optional/ongoing — tackle as files are touched for features

## Verification

After each phase:
1. `npm run build` — no compile errors
2. Manual smoke test in Obsidian (open views, generate reports, use context menus)
3. Verify no behavioral changes — purely structural
