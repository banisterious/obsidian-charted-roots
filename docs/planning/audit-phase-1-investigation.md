# Audit Phase 1 — Investigation

**Status:** ✅ Complete (2026-05-12)
**Created:** 2026-05-12
**Branch:** `audit/phase-1-investigation`
**Parent plan:** [audit-implementation-plan.md](audit-implementation-plan.md)

This doc is the evidence base for Phases 2-6. No source code changes ship from this branch; only the document itself plus the gitignored helper scripts used to produce it.

The eight sub-investigations below are designed to be read independently — each section opens with its headline finding and ends with the implications for downstream phases. Read top-to-bottom for the full picture; jump to a section by name when working on the matching phase.

---

## 1. Bundle metafile analysis

### Headline

Production `main.js` is **14.93 MB**. esbuild metafile input bytes total **15.60 MB** (6.93 MB from `node_modules`, 8.67 MB from `src/` + `main.ts`).

### Method

A one-off script ([audit-metafile.mjs](../../audit-metafile.mjs), gitignored) mirrors `esbuild.config.mjs` in production mode with `metafile: true` and writes the metafile to `/tmp/audit-meta.json`. A second script ([audit-metafile-analyze.mjs](../../audit-metafile-analyze.mjs), also gitignored) buckets input bytes by `node_modules` package name and by `src/` subdirectory.

### Top node_modules contributors

| KB | Package | Notes |
|---:|---|---|
| 3596 | pdfmake | Already `await import()`-d at [pdf-report-renderer.ts:197](../../src/reports/services/pdf-report-renderer.ts#L197); see section 2 for why this doesn't shrink the bundle today |
| 440 | leaflet | Static import from [map-controller.ts:7](../../src/maps/map-controller.ts#L7), [image-map-manager.ts:11](../../src/maps/image-map-manager.ts#L11), [world-map-preview.ts:10](../../src/maps/ui/world-map-preview.ts#L10), [map-preview-section.ts:8](../../src/profile-view/sections/map-preview-section.ts#L8) |
| 431 | html2canvas | Pulled by family-chart-export and tree-preview PDF paths |
| 346 | leaflet-distortableimage | Already dynamically imported at [image-map-manager.ts:63](../../src/maps/image-map-manager.ts#L63) |
| 335 | jspdf | Static import from [tree-preview.ts:12](../../src/ui/tree-preview.ts#L12) and [family-chart-export.ts:10](../../src/ui/views/family-chart-export.ts#L10) |
| 221 | pako | gzip/zlib used by gpkg-extractor (Gramps) |
| 215 | family-chart | Static — bundled into main chunk |
| 176 | canvg | SVG-to-canvas used by tree-preview / family-chart-export |
| 138 | core-js | esbuild target polyfills |
| 95 | jszip | Gramps + Word export |
| 94 | d3-geo | Map projections (used by map view) |
| 87 | fflate | Used by gpkg-extractor |
| 79 | leaflet.markercluster | Already dynamically imported at [map-controller.ts:36](../../src/maps/map-controller.ts#L36) |
| 72 | robust-predicates | d3-delaunay dependency |
| 62 | dompurify | Reused across many UI paths |
| 60 | d3-shape | Family-chart + statistics |
| 43 | fast-png | tree-preview |
| 40 | d3-array | |
| 37 | d3-hierarchy | Family chart |
| 33 | d3-scale | |
| 30 | leaflet-search | Already dynamically imported |
| ... | leaflet-{heat,polylinedecorator,fullscreen,minimap,textpath,toolbar} | All already dynamically imported |

Plus the generated PDF font VFS in `src/reports/fonts/`:

| KB | File |
|---:|---|
| 1582 | `src/reports/fonts/vfs_fonts_all.ts` (Roboto family — base64 TTFs as TS literal) |
| (small) | `src/reports/fonts/vfs_fonts_mono.ts` |
| 811 | `node_modules/pdfmake/build/vfs_fonts.js` (also bundled) |

Two separate font sources end up in the bundle because pdfmake ships its own Roboto fonts (`pdfmake/build/vfs_fonts.js`) and Charted Roots regenerates a parallel VFS in `src/reports/fonts/vfs_fonts_all.ts` for the dynamic loader to install. This duplication is an unintentional ~800 KB cost: investigate whether `vfs_fonts_all.ts` can pass-through from `pdfmake/build/vfs_fonts` instead of bundling Roboto twice.

### Top local buckets

| KB | Bucket |
|---:|---|
| 2049 | `src/reports` (dominated by the fonts subdirectory) |
| 2023 | `src/ui` |
| 1121 | `src/core` |
| 386 | `src/maps` |
| 385 | `src/sources` |
| 289 | `src/events` |
| 264 | `src/gedcom` |
| 262 | `src/plugin` |
| 259 | `src/dynamic-content` |
| 197 | `src/gramps` |
| 188 | `src/trees` |
| 156 | `src/organizations` |
| 156 | `src/statistics` |
| 126 | `src/dates` |
| 121 | `src/profile-view` |

### Top individual files

| KB | File |
|---:|---|
| 2785 | `node_modules/pdfmake/build/pdfmake.js` |
| 1582 | `src/reports/fonts/vfs_fonts_all.ts` |
| 811 | `node_modules/pdfmake/build/vfs_fonts.js` |
| 440 | `node_modules/leaflet/dist/leaflet-src.js` |
| 431 | `node_modules/html2canvas/dist/html2canvas.js` |
| 346 | `node_modules/leaflet-distortableimage/dist/leaflet.distortableimage.js` |
| 335 | `node_modules/jspdf/dist/jspdf.es.min.js` |
| 173 | [family-chart-view.ts](../../src/ui/views/family-chart-view.ts) |
| 147 | [cleanup-wizard-modal.ts](../../src/ui/cleanup-wizard-modal.ts) |
| 120 | [context-menus.ts](../../src/plugin/context-menus.ts) |
| 115 | [settings.ts](../../src/settings.ts) — flagged by audit plan; matches the file-size class that drove Phase 4 of the prior technical-debt audit |
| 109 | [canvas-split.ts](../../src/core/canvas-split.ts) |
| 108 | [create-person-modal.ts](../../src/ui/create-person-modal.ts) |
| 103 | [gedcom-importer-v2.ts](../../src/gedcom/gedcom-importer-v2.ts) |
| 96 | [people-tab.ts](../../src/ui/people-tab.ts) |
| 96 | [report-wizard-modal.ts](../../src/reports/ui/report-wizard-modal.ts) |
| 96 | [data-quality.ts](../../src/core/data-quality.ts) |
| 95 | `node_modules/jszip/dist/jszip.min.js` |
| 94 | [map-controller.ts](../../src/maps/map-controller.ts) |
| 92 | [map-view.ts](../../src/maps/map-view.ts) |
| 90 | [family-graph.ts](../../src/core/family-graph.ts) |
| 87 | `node_modules/fflate/esm/browser.js` |
| 86 | [pdf-report-renderer.ts](../../src/reports/services/pdf-report-renderer.ts) |

### Implications for Phase 3

The audit-implementation-plan hypothesized lazy-loading pdfmake, jspdf, leaflet plugins, and the importers for an ~8 MB cumulative reduction. The metafile changes the picture:

1. **Most leaflet plugins are already dynamically imported.** Only the core `leaflet` package (440 KB) is statically imported. Lazy-loading the core needs Unit 3a (which the plan already names), but the leaflet-plugin sweep the plan implied is already done.
2. **pdfmake is already `await import()`-d.** But the bundle still contains the full 4.4 MB pdfmake+vfs_fonts mass, because esbuild's CJS-with-`outfile` mode bundles dynamic imports into the main chunk. The `await import()` defers *evaluation*, not *download*. To actually reduce the shipped bundle, Phase 3 needs an esbuild config change: either switch to `format: 'esm'` + `splitting: true` + `outdir`, or use a code-splitting plugin to emit pdfmake into a separate chunk that Obsidian loads on demand. This is a meaningful constraint shift on Phase 3's premise — confirm with maintainer before designing the lazy-load implementation.
3. **The 1.6 MB `vfs_fonts_all.ts` duplicates pdfmake's bundled fonts.** Investigating de-duplication is independently worth its own bullet, possibly more leverage per hour than the lazy-load mechanics.
4. **jspdf (335 KB) is statically imported at two sites.** It's a smaller win than pdfmake but tractable: only two call sites, both in family-chart-export and tree-preview, both already gated behind explicit user invocation (PDF export). Unit 3c.
5. **The GEDCOM-X and Gramps importers are NOT large bundle contributors** as the audit hypothesized. `src/gedcomx` is 36 KB; `src/gramps` is 197 KB (mostly the gpkg-extractor's pako+fflate dependencies, already counted under those packages). Unit 3d's working hypothesis doesn't survive Phase 1; skip Unit 3d.

The cumulative pre-1.0 bundle-reduction ceiling, given the esbuild-splitting constraint, is approximately 4.4 MB (pdfmake mass) + 0.4 MB (leaflet core) + 0.3 MB (jspdf) + 0.8 MB (de-dup vfs_fonts_all) = ~6 MB if every unit lands. The audit plan's "working hypothesis, not commitment" framing for the 8 MB number was prescient.

---

## 2. PDF library path map

### pdfmake consumers

All four consumers use the shared `PdfReportRenderer` class — which is the right shape; pdfmake itself is reached through one centralized service:

- [src/trees/ui/unified-tree-wizard-modal.ts:237](../../src/trees/ui/unified-tree-wizard-modal.ts#L237) — `new PdfReportRenderer()` (tree wizard PDF export)
- [src/reports/ui/report-wizard-modal.ts:291](../../src/reports/ui/report-wizard-modal.ts#L291)
- [src/reports/ui/report-generator-modal.ts:255](../../src/reports/ui/report-generator-modal.ts#L255)
- [src/book/services/pdf-book-renderer.ts:38](../../src/book/services/pdf-book-renderer.ts#L38) — wraps `PdfReportRenderer` for the Book Builder export

The renderer's `ensurePdfMake()` method ([pdf-report-renderer.ts:189](../../src/reports/services/pdf-report-renderer.ts#L189)) dynamically imports both `pdfmake/build/pdfmake` and the local `vfs_fonts_all.ts`. The lazy-load contract from the consumer side is correct; only the bundler config (section 1, finding 2) prevents it from translating into a smaller bundle.

### jspdf consumers

Two direct importers, both used only on user-triggered export actions:

- [src/ui/tree-preview.ts:12,714](../../src/ui/tree-preview.ts#L12) — tree preview PDF export (`new jsPDF({...}); pdf.save(...)`)
- [src/ui/views/family-chart-export.ts:10,403,1742](../../src/ui/views/family-chart-export.ts#L10) — family chart PDF export with cover page, footer, multi-page tiling

The two paths use jspdf independently — there is no shared jspdf service. They could be migrated to dynamic-import at the function boundary independently, or a tiny shared `lazyLoadJsPdf()` helper could be extracted.

### Overlap

family-chart-export.ts pulls Roboto fonts from **pdfmake's VFS** ([family-chart-export.ts:623](../../src/ui/views/family-chart-export.ts#L623)) and registers them with **jspdf** ([family-chart-export.ts:716](../../src/ui/views/family-chart-export.ts#L716)). So one export flow touches *both* libraries: pdfmake for fonts, jspdf for the document.

Implication: Units 3b (pdfmake) and 3c (jspdf) are not fully disjoint. If both ship lazy-loaded, the family-chart PDF export path will trigger both module loads on first invocation; bundle the user-facing indicator string accordingly.

---

## 3. Platform.is* survey

Eight call sites across seven files, all in UI-facing code:

| File:line | Call | Gate |
|---|---|---|
| [src/maps/map-view.ts:269](../../src/maps/map-view.ts#L269) | `Platform.isPhone` | Map view phone-specific layout (v0.22.20 / #528) |
| [src/ui/people-tab.ts:1809](../../src/ui/people-tab.ts#L1809) | `Platform.isDesktop && !Platform.isMobile` | Whether to use Obsidian submenu (desktop only) |
| [src/ui/control-center.ts:231](../../src/ui/control-center.ts#L231) | `Platform.isMobile \|\| document.body.classList.contains('is-mobile')` | Mobile-class detection helper |
| [src/ui/control-center.ts:458](../../src/ui/control-center.ts#L458) | `Platform.isMobile` | Mobile-specific branch inside control center |
| [src/profile-view/profile-view.ts:101](../../src/profile-view/profile-view.ts#L101) | `Platform.isMobile` | Profile view container class application |
| [src/profile-view/profile-view.ts:401](../../src/profile-view/profile-view.ts#L401) | `isMobile: Platform.isMobile` | Passes mobile-state to section renderers |
| [src/plugin/context-menus.ts:126](../../src/plugin/context-menus.ts#L126) | `Platform.isDesktop && !Platform.isMobile` | Submenu vs flat context-menu selection (people) |
| [src/plugin/context-menus.ts:330](../../src/plugin/context-menus.ts#L330) | `Platform.isDesktop && !Platform.isMobile` | Same pattern for entity context menus |

### Implications for Phase 4a

The list is short enough that the audit plan's `MobileClassManager` covers most of it: every site is either *applying* mobile-class state to a container (profile-view, control-center) or *gating* a UI affordance (submenu vs flat). The class-based pattern (Phase 4a's `cr-phone` / `cr-mobile` / `cr-desktop` body classes) gives CSS the toggle it needs and lets these `Platform.is*` reads stay where they are — they're not redundant, they live in code that genuinely branches behavior.

The submenu-vs-flat pattern in `people-tab.ts:1809` and `context-menus.ts:126,330` is *identical*. A shared helper `shouldUseSubmenu()` would consolidate; small refactor opportunity, not phase-blocking. Note as Phase 5 candidate.

The `Platform.isMobile || document.body.classList.contains('is-mobile')` check in control-center.ts:231 reflects Obsidian's mobile-class convention. Once Phase 4a is in, that classList check can drop — `Platform.isMobile` alone is authoritative, and the body class is set by Obsidian Mobile, not us.

---

## 4. setTimeout / setInterval survey

**Total call sites: 122** across `src/` + `main.ts` (excluding tests). This is the upper bound that the `prefer-active-window-timers` lint rule cares about (count was 151 in the eslint re-baseline; the delta likely reflects internal helpers `setTimeout(resolve, ms)` inside `await new Promise(...)` patterns that the rule may double-count or count differently per call shape).

### Bucketing by intent

**Async sleep helpers** (`await new Promise(resolve => setTimeout(resolve, N))`) — ~25 sites. These are mostly internal pacing for batch operations (gedcom-importer, validation-service, family-chart-export) and don't cross window boundaries. The window timer migration is mostly a no-op here in terms of pop-out-window correctness, but the rule will still want them migrated. Mechanical sweep.

**Debounced refresh handlers** on view classes — 16+ sites. Pattern: `this.refreshTimeout = setTimeout(() => { ... }, N)` in `events-view`, `places-view`, `people-view`, `sources-view`, `organizations-view`, `universes-view`, `collections-view`, `data-quality-view`, `statistics-view`, `relationships-view`, `family-chart-view`, `profile-view`, `calendar-view`. Each view caches the handle and clears it in `onClose`. **These need `activeWindow.setTimeout` because views can open in pop-out windows.** Pop-out-window correctness lives here.

**Focus deferral** — ~15 sites. Pattern: `setTimeout(() => searchInput.focus(), 50)` in modals. Same window-boundary concern: a modal opened in a pop-out window needs `activeWindow`.

**Animation / playback timers** in maps — `journeyPlaybackInterval` and `animationInterval` in [map-view.ts:1711,2227](../../src/maps/map-view.ts#L1711). Already use `window.setInterval`; should be `activeWindow.setInterval`.

**One-shot deferred init** — Phase 0's snapshot timer ([main.ts:706](../../main.ts#L706)) is the cleanest example.

### Unique window-boundary risk sites

The category with real pop-out-window correctness payoff is the **view refresh-debounce timers + view-attached focus-deferral**. Counting only the timers attached to a view that can be opened in a pop-out:

- [events-view.ts:132](../../src/dates/ui/events-view.ts#L132)
- [places-view.ts:132](../../src/ui/views/places-view.ts#L132)
- [people-view.ts:132](../../src/ui/views/people-view.ts#L132)
- [sources-view.ts:133](../../src/sources/ui/sources-view.ts#L133)
- [organizations-view.ts:133](../../src/organizations/ui/organizations-view.ts#L133)
- [universes-view.ts:133](../../src/universes/ui/universes-view.ts#L133)
- [collections-view.ts:129](../../src/ui/collections-view.ts#L129)
- [data-quality-view.ts:129](../../src/ui/data-quality-view.ts#L129)
- [statistics-view.ts:2061](../../src/statistics/ui/statistics-view.ts#L2061)
- [relationships-view.ts:128](../../src/relationships/ui/relationships-view.ts#L128)
- [family-chart-view.ts:4922](../../src/ui/views/family-chart-view.ts#L4922) (plus 7 more in-file kinship-label / zoom-display / journey timers)
- [profile-view.ts:203,247](../../src/profile-view/profile-view.ts#L203)
- [calendar-view.ts:90,117,677](../../src/calendar/calendar-view.ts#L90)
- [map-view.ts:197,1382,1711,1795,2227](../../src/maps/map-view.ts#L197)

That's roughly 30 high-leverage sites for Phase 2's timer migration.

### Implications for Phase 2

Phase 2's `activeWindow.setTimeout` migration should land in three commits:

1. **View-attached timers** (~30 sites) — pop-out window correctness, highest priority.
2. **Modal focus-deferral** (~15 sites) — also pop-out relevant but lower visibility.
3. **Sleep-helpers and internal pacing** (~75 sites) — mechanical sweep for lint compliance only; minimal user-visible change.

Phase 0's snapshot timer is already in the right shape and serves as the migration template for one-shot deferred init.

---

## 5. onload audit

### Sequence

[main.ts:352-446](../../main.ts#L352-L446) is the current `onload` body. Sequenced left-to-right:

1. `registerCustomIcons()` — sync, trivial
2. `await this.loadSettings()` — disk I/O, small
3. Set logger level — sync
4. Construct `FolderFilterService`, `TemplateFilterService`, `PersonIndexService` — sync; index build is lazy on first use
5. Construct `EventService` + `setupVaultListeners(this)` — registers metadataCache + vault listeners
6. Construct `RecentFilesService`, `MediaService` — sync
7. Construct `WebClipperService` + **`startWatching()`** — registers a vault-change listener for clipper templates
8. `createDateService({...})` — sync factory
9. `await this.migrateCollectionNameToGroupName()` — **gated by Phase 0** (`migratedCollectionNameToGroupName` flag); short-circuits on subsequent loads
10. `await this.migrateCanvasRootsToChartedRoots()` — gated by `migratedToChartedRoots` flag (pre-Phase-0)
11. `addSettingTab(...)` — sync
12. `onLayoutReady(() => { parse-style-settings + templateFilter.initialize() })` — deferred ✓
13. `registerViews()` — sync; only registration, view classes don't run until opened
14. `registerCodeBlockProcessors()` — sync; constructs ~17 processors with `new` per processor
15. `registerCommandsAndEvents()` — sync
16. `registerContextMenus()` — sync
17. `onLayoutReady(() => void this.checkVersionUpgrade())` — deferred ✓
18. `registerFileModificationHandler()`, `registerFileDeleteHandler()`, `registerUniverseRenameHandler()` — register metadataCache + vault listeners
19. `initializeBidirectionalSnapshots()` — **1-second deferred** via setTimeout (Phase 0 tracked) ✓
20. `await this.initializeRelationshipHistory()` — `loadData()` disk I/O

### Blocking vs deferrable

**Blocking (awaited or sync in onload body):**
- `loadSettings` — necessary; settings drive every subsequent decision
- The two migration scans — already gated; cost paid only on first-ever run after the relevant version
- `initializeRelationshipHistory` (`loadData` call) — small disk I/O, but blocks

**Deferred via onLayoutReady or setTimeout:**
- Style Settings trigger
- Template folder detection
- Version-upgrade migration notice
- Bidirectional snapshot init (1s setTimeout)

**Eagerly registered but not blocking:**
- All view registrations
- Code-block processor instantiations
- Command/context-menu registrations
- All vault/metadataCache listener registrations

### Defer candidates

The largest remaining startup-cost opportunities are:

1. **`WebClipperService.startWatching()`** at [main.ts:386](../../main.ts#L386) — registers a vault listener. The listener itself is cheap, but the service constructor scans for templates on initial start. Could defer behind `onLayoutReady` without user impact.
2. **`EventService.setupVaultListeners(this)`** at [main.ts:376](../../main.ts#L376) — similar pattern; defer behind `onLayoutReady`.
3. **`registerFileModificationHandler` / `registerFileDeleteHandler` / `registerUniverseRenameHandler`** at [main.ts:427-436](../../main.ts#L427-L436) — registers cheap listeners but the `metadataCache.on('changed')` handler does substantial work per change once it's wired; deferring the registration past `onLayoutReady` means changes that happen during initial vault index don't trigger the sync work, which is desirable.
4. **`initializeRelationshipHistory`** at [main.ts:445](../../main.ts#L445) — currently awaited. Could be fire-and-forget (`void this.initializeRelationshipHistory()`) since downstream code already null-guards on `this.relationshipHistory`.

### Implications

Phase 0 already removed the biggest historical cost (the unconditional migration scan on every load). The remaining opportunities are small but consistent — likely sub-100ms per defer candidate. The work is single-sitting and worth bundling into the Phase 2 sweep rather than warranting its own phase, **unless** Phase 1 measurement on a 5K+ note vault reveals one of the candidates has surprising cost (TBD; add to Phase 2 doc as measurement-gated work).

---

## 6. ESLint 0.2.9 re-baseline confirmation

### Headline

**Total: 1375 problems (435 errors, 940 warnings).**

Drift since the 2026-05-11 baseline is minimal: 435 errors matches exactly (Batch B partial's final count); 940 warnings is **+1** from the 939 baseline. The new warning is the `clearTimeout` introduced by Phase 0's snapshot-timer cleanup ([main.ts:706](../../main.ts#L706)), as the audit plan anticipated.

### Errors (435)

All 435 errors are `obsidianmd/ui/sentence-case`. Batch A cleared the real-signal-error categories; what remains is the per-site review backlog the user paused on during Batch B (risk of breaking quoted button-label references and lowercasing proper nouns). No new error rules surfaced.

### Warnings (940), by rule

| Count | Rule | Notes |
|---:|---|---|
| 507 | `obsidianmd/prefer-create-el` | Phase 5 candidate per audit plan / eslint-cleanup-plan. Bulk migration would touch many files for minimal correctness payoff. |
| 163 | `obsidianmd/prefer-active-doc` | Same shape as the timer migration — Obsidian-pattern adoption for pop-out window correctness. |
| 152 | `obsidianmd/prefer-active-window-timers` | **+1 from baseline 151** = Phase 0's snapshot-timer `clearTimeout`. Phase 2 sweep. |
| 74 | `@typescript-eslint/no-unused-vars` | +1 from 73 baseline. Phase 5 candidate. |
| 44 | `@typescript-eslint/require-await` | Async functions declared without `await`. Not previously called out in the cleanup plan's tier list. Most are likely interface-driven (callbacks the framework expects to be async even when the implementation is sync). Phase 2 can mechanically migrate via `// eslint-disable-next-line` where intentional, or drop the `async` keyword where safe. |

### Drift since 2026-05-11

- `prefer-active-window-timers`: 151 → 152 (+1 from Phase 0's new `clearTimeout`).
- `no-unused-vars`: 73 → 74 (+1 — origin not investigated; mechanical sweep will absorb it).
- All other counts unchanged.

### Implications

The **152 `prefer-active-window-timers`** warnings are the standout correctness item (pop-out window timer firing). Combined with section 4's bucketing, Phase 2's timer migration touches ~30 high-leverage view-attached sites plus ~120 low-leverage internal sites. The high-leverage subset is the actual user-correctness win; the rest is mechanical.

The **44 `require-await`** warnings are a new category to triage in Phase 2 or fold into the cleanup-plan's Tier work. Not previously enumerated.

The **507 `prefer-create-el` + 163 `prefer-active-doc`** remain the largest deferred warning categories. Per the audit plan, these stay opportunistic (file-by-file as files get touched) rather than triggering a dedicated sweep — keep that convention.

---

## 7. Service-instantiation survey refresh

Comparing to the prior technical-debt audit's counts (22/31 SourceService, 16/33 FamilyGraphService, 21/35 PlaceGraphService migrated to factory methods):

| Service | Direct `new` sites today | Factory call sites today | Notes |
|---|---:|---:|---|
| `SourceService` | 9 | 24 (`getSourceService`) | 22/31 migrated → 22/(22+9) = 22/31. **No drift.** Remaining sites all use the `?? new SourceService()` fallback shape (exporters, evidence-service, proof-summary-service, media-inventory-generator, sources-by-role-generator, source-summary-generator). These don't easily migrate without plugin access. |
| `FamilyGraphService` | 17 | 75 (`createFamilyGraphService`) | 16/33 migrated → 17/(17+16) ~= 17/33. **One site re-emerged or wasn't counted.** Sites are split between exporters (gedcomx, csv, gedcom, gramps), one-off utilities (reference-numbering, lineage-tracking, duplicate-detection, cross-import-detection, relationship-calculator, statistics-service), modal one-offs (split-wizard, standardize-places, folder-statistics, export-wizard, person-picker), and one core-utility static call ([family-graph.ts:2594](../../src/core/family-graph.ts#L2594), inside `getStandalonePerson()`). |
| `PlaceGraphService` | 14 | ? | 21/35 migrated → 14/(14+21) = 14/35. **Matches prior count.** Remaining are mostly modal one-offs (merge-duplicate-places, standardize-places-modal, place-network-modal, migration-diagram-modal, etc.). |
| `EventService` | 18 | 0 named factory (constructed inline as `plugin.eventService` singleton in main.ts; other sites do `new EventService(app, settings)`) | The plugin singleton is at `this.eventService = new EventService(this.app, this.settings)` (main.ts:375). 18 direct-new sites elsewhere don't read the singleton — they construct fresh, which is correct because EventService is per-call lightweight, but inconsistent. |
| `OrganizationService` | 13 | 8 (`createOrganizationService`) | Mix of modal one-offs and the bottom-of-file `createOrganizationService(plugin)` factory. Could converge. |
| `RelationshipService` | 7 | — (no shared factory) | All sites construct fresh; small service. |
| `UniverseService` | 11 | 1 (`createUniverseService`) | Factory exists ([universe-service.ts:849](../../src/universes/services/universe-service.ts#L849)) but rarely called. Many tabs and processors `new` directly. Easy consolidation. |
| `MediaService` | 6 | — | All in core/ui/* modals. |
| `MembershipService` | 6 | — | All co-located with `OrganizationService` constructions. |
| `BidirectionalLinker` | 3 (one is the Phase 0 singleton at [main.ts:196](../../main.ts#L196); two stale call sites in [people-tab.ts:2789](../../src/ui/people-tab.ts#L2789), [people-tab.ts:3040](../../src/ui/people-tab.ts#L3040)) | 3 (`getBidirectionalLinker`) | **The two people-tab.ts sites construct the linker without folder-filter / inclusive-parents / DNA-tracking setup that the Phase 0 singleton applies — a real correctness bug surface.** Migrate to `this.getBidirectionalLinker()` in Phase 2. |
| `ProofSummaryService` | 0 | 5 (`getProofSummaryService`) | Fully migrated. ✓ |

### Implications for Phase 2

The **BidirectionalLinker** finding is the most actionable — two missed call sites in `people-tab.ts` that construct without the configuration the singleton applies. Fix as a Phase 2 commit with `Refs #` annotations for whichever issue prompts it (none yet — file or fold into Phase 2's CHANGELOG entry).

The exporters + report generators + service-to-service patterns (9 SourceService, 4 FamilyGraphService in exporters) are the durable "no plugin access" cases that don't benefit from migration. Leave them.

The `UniverseService` direct-news (11) are the highest-leverage cleanup — `createUniverseService(plugin)` exists and is barely used; pulling these into the factory would be ~10 mechanical edits and reduce friction for any future singletonization.

---

## 8. Declarative-write-registry scope notes (Phase 6 forward pointer)

### Current write locations (cross-ref [bidirectional-sync-audit.md](bidirectional-sync-audit.md))

The bidirectional-sync audit catalogued five disjoint sync locations across the writer surface. Phase 6 inventory should reference that doc rather than restate. Locations as of 2026-05-12:

1. `BidirectionalLinker.linkSpouses()` / `linkParents()` / `linkChildren()` / `linkSiblings()` / `linkAdoptedChild()` / `linkStepChild()` (the singleton's snapshot-driven sync)
2. `MembershipService.syncMembersToOrg()` (post-#552 fix)
3. `AddRelationshipModal` source + reciprocal write path (post-#553 fix)
4. `RelationshipManager.updateRelationshipWikilinks()` (generalized post-#555)
5. `person-delete-cleanup` reverse-unlink pass

### `createSmartWikilink` copies

Four copies, three already consolidated through the cr-id-resolver helper but the wrapping wikilink-generation logic remains duplicated:

- [src/core/person-note-writer.ts](../../src/core/person-note-writer.ts) — `createSmartWikilink`
- [src/places/services/place-note-writer.ts](../../src/places/services/place-note-writer.ts) — `createSmartWikilink` + `createWikilink` helper
- [src/organizations/services/organization-service.ts](../../src/organizations/services/organization-service.ts) — `createSmartWikilink`
- [src/events/services/event-service.ts](../../src/events/services/event-service.ts) — different signature (takes TFile directly), used by event writes

Phase 6 should propose either consolidating these into one helper that takes an entity-type discriminant, or formalizing the differences in a registry where each entity-type's writer is one row.

### Other N-place patterns surfaced by Phase 1

From the bundle survey:
- **Two PDF font sources** (`src/reports/fonts/vfs_fonts_all.ts` and `pdfmake/build/vfs_fonts.js`) ship the same Roboto family. Not a write-registry concern; logged in section 1 as a separate Phase 3 sub-investigation.
- **13 `refreshTimeout = setTimeout(...)` patterns** across view classes (section 4) — same shape, hand-copied. Not a write-registry concern; if Phase 2 wants to extract a `createRefreshDebouncer(view, fn, ms)` helper that wraps the `activeWindow.setTimeout` migration with the registration boilerplate, that's a small Phase 2 win.
- **5 deletion-cleanup handlers** that hand-iterate paired `*_id` arrays (#557 deferred) — already documented as the seventh bidi-sync gap; Phase 6 inventory should reference rather than restate.

### Status

Phase 6 produces a `docs/planning/declarative-write-registry.md` proposal. Phase 1's contribution is the inventory cross-references above. Execution is post-1.0; the proposal can land pre-1.0.

---

## Pattern: parallel date-handling surfaces

Surfaced during the post-Phase-1 investigation of issues #563 / #564 / #565 / #566 (all multi-era fictional-date bugs filed within a 24-hour window on 2026-05-11 / 2026-05-12). Documented here so the underlying structural smell isn't lost when the four fixes ship as small per-issue commits.

The plugin has two parallel date-handling surfaces:

- **The `DateService` family** ([src/dates/services/date-service.ts](../../src/dates/services/date-service.ts), [src/dates/parser/fictional-date-parser.ts](../../src/dates/parser/fictional-date-parser.ts)) — fictional-aware, canonical-year-based, knows about era systems and universes. Correct.
- **Local "extract year" / "compare dates" helpers** scattered across the codebase — fictional-blind, raw-digit-based. Each was written when its consumer didn't yet need fictional-aware behavior; now each one quietly misbehaves on multi-era inputs.

Sites surfaced by the four-issue cluster:

- `DynamicContentService.extractYear` ([dynamic-content-service.ts:405](../../src/dynamic-content/services/dynamic-content-service.ts#L405)) — strips era prefixes, returns raw digits. Used at the timeline-block default rendering and the relationships-block birth/death rendering. Caused #563.
- `DynamicContentService.formatDate` ([dynamic-content-service.ts:322](../../src/dynamic-content/services/dynamic-content-service.ts#L322)) — never calls `DateService.formatDate`; reimplements a subset that doesn't know about fictional eras. Adjacent to #563.
- `compareDates` local helper in [sort-order-service.ts:223](../../src/events/services/sort-order-service.ts#L223) — its inline `extractYear` matches only a leading `-?\d+`, falls to `localeCompare` on multi-era inputs. Caused #564.
- `computeEventAge` fallback at [timeline-renderer.ts:94](../../src/dynamic-content/renderers/timeline-renderer.ts#L94) — when `DateService.calculateAge` returns null, falls back to `parseInt(extractYear(...))` math which strips eras. Caused #565.
- `maxAge` filter in `StatisticsService` ([line 1171](../../src/statistics/services/statistics-service.ts#L1171) for Longevity, [line 1306](../../src/statistics/services/statistics-service.ts#L1306) for Marriage Patterns) — era-blind cap. Cross-era canonical lifespans exceed it and get silently dropped. Caused #566.

Prior issues that fit the same pattern: #437 (statistics extractYear deferral), #454 (map-data-service parseYear), #524 / #540 / #543 / #549 / #559 (writer-side fictional-date interactions).

**Convergent fix shape (future phase).** Route every display and math path through `DateService`:

- Replace local `extractYear` implementations with calls to `dateService.parseDate` returning canonical year for math.
- Add a `formatYearForDisplay(dateStr, universe)` helper on `DynamicContentService` that uses `dateService.formatDate` for fictional inputs and the existing logic for standard inputs.
- Audit `maxAge`-style sanity filters: skip when any input is fictional, or expose a separate `maxFictionalAge` setting.
- Add a contributor-facing rule in `coding-standards.md`: no new local date-extraction helpers; route through `DateService`.

**Status.** Four fixes ship as small per-issue commits in May 2026 (bisect-friendly, independent soak windows). The convergent refactor is a candidate for a dedicated audit-plan phase once the per-issue dust settles. Phase 6's declarative-write-registry proposal is a sibling pattern — both are "consolidate parallel surfaces" work.

---

## Followups discovered during Phase 1

These items surfaced during investigation but are not Phase 1 deliverables. Listed here so they don't get lost; each will fold into the appropriate downstream phase or its own issue.

1. **vfs_fonts duplication** (section 1) — `src/reports/fonts/vfs_fonts_all.ts` (1582 KB) duplicates pdfmake's bundled `vfs_fonts.js` (811 KB). Investigate pass-through vs regeneration. Phase 3 sub-item; could ship independently of the lazy-load mechanics.
2. **esbuild splitting constraint** (section 1) — the lazy-load pattern in `PdfReportRenderer.ensurePdfMake()` doesn't reduce bundle size under CJS+outfile. Phase 3 needs a build-config change (likely `format: 'esm'` + `splitting: true` + `outdir: '.'`); verify Obsidian's plugin loader accepts the resulting output before committing to Phase 3.
3. **Two stale `new BidirectionalLinker` sites in people-tab.ts** (section 7) — construct without folder-filter / inclusive-parents / DNA-tracking. Fold into Phase 2 with a CHANGELOG note.
4. **`shouldUseSubmenu()` helper** (section 3) — same three-way pattern in `people-tab.ts:1809`, `context-menus.ts:126`, `context-menus.ts:330`. Phase 5 candidate.
5. **Drop `document.body.classList.contains('is-mobile')` belt-and-suspenders check** in `control-center.ts:231` once Phase 4a lands (section 3).
6. **UniverseService direct-new sweep** (section 7) — 11 sites, factory already exists. Phase 2 candidate.

---

## Acceptance

- [x] Planning doc exists (this file).
- [x] All eight sub-investigations have findings and downstream-implication sections.
- [x] Doc reviewed; informs Phase 2 / Phase 3 / Phase 4a / Phase 5 / Phase 6 prompts.
- [x] No source code changes shipped from this branch.
