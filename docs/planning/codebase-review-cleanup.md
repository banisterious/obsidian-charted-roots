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

## Phase 3: Dynamic content processor base class

8 processors follow near-identical service + renderer pattern. Extract shared base.

**Files:** `src/dynamic-content/*.ts`

## Phase 4: main.ts decomposition

At 9,386 lines, this is the highest-impact structural change. Break into focused modules:

| Module | Lines | Content |
|--------|-------|---------|
| `src/commands/index.ts` | ~500 | Command registrations |
| `src/context-menus/index.ts` | ~800 | Context menu handlers |
| `src/view-registration.ts` | ~100 | View type registrations |
| `src/activation/index.ts` | ~300+ | activateMapView, activateChartView, etc. |

main.ts becomes a thin orchestrator that imports and wires these together.

## Phase 5: Large modal/view decomposition

Lower priority — tackle after main.ts:
- `family-chart-view.ts` (5,634 lines)
- `cleanup-wizard-modal.ts` (4,210 lines)
- `create-person-modal.ts` (3,175 lines)
- `data-quality-tab.ts` (3,347 lines)
- `settings.ts` (2,402 lines)

Each would be broken into smaller focused components/sections.

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
