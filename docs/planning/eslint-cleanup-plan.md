# ESLint Baseline Cleanup

Plan for triaging the real lint output that was hidden by a broken `npm run lint` script.

**Status:** 🟡 In progress — Tier 0, Tier 1, and Tier 2 complete; Tier 3 partial (quick wins done); Tier 4 pending

**Root cause context:** `node_modules/.bin/eslint` was a zero-byte file (likely caused by WSL symlink-creation failing during `npm install --no-bin-links` at some point). The `npm run lint` script resolved to the empty binary and exited 0 silently. Fixed in commit [77848f14](#) by switching the lint/lint:fix scripts to direct `node` invocation. See `package.json` scripts.

---

## Baseline Snapshot

Taken immediately after the `npm run lint` fix.

- **Total problems (initial):** 1173 (1142 errors, 31 warnings), 161 files
- **After Tier 0:** 1041 (1010 errors, 31 warnings)
- **After first Tier 1 batch:** 999 (968 errors, 31 warnings) — `no-floating-promises` (29), `no-misused-promises` (12), `await-thenable` (1)
- **After Tier 1 errors complete:** 979 (948 errors, 31 warnings) — `no-undef` (20) resolved; all remaining items are warnings
- **After Tier 1 warnings complete:** 954 (948 errors, 6 warnings) — `no-base-to-string` (23) + `no-deprecated` (2 of 8) resolved
- **After Tier 1 complete:** 948 (948 errors, 0 warnings) — MembershipData renamed to MembershipRecord; all Tier 1 items resolved
- **After Tier 2/3 quick wins:** 896 (896 errors, 0 warnings) — lint:fix cleared autofixable rules (24 + 19); remaining small groups (useless-escape, case-declarations, prefer-const, tfile-cast, command-naming, redeclare, this-alias) resolved manually
- **After Tier 2 complete:** 873 (873 errors, 0 warnings) — `no-static-styles-assignment` (23) resolved via `el.show()`/`el.hide()` for display toggles, CSS class additions for style values, toggleClass for cursor states, one targeted eslint-disable for a Leaflet-generated DOM element
- **After Tier 3 require-await:** 862 (862 errors, 0 warnings) — `require-await` (11) resolved. ItemView `onOpen`/`setState` and one MarkdownPostProcessor `process` kept async with targeted eslint-disable; Phase 3 stubs (`lookupFamilySearch`, `lookupGOV`) kept async with eslint-disable; remaining 6 methods converted to sync (callers updated to drop `await`/`void`)
- **After Tier 3 no-unused-vars:** 733 (733 errors, 0 warnings) — `no-unused-vars` (129) resolved. `context-menus.ts` and `control-center.ts` shed ~57 unused imports each from prior feature extractions; remaining items were one-off unused imports (~40), unused locals / parameters (~20), and unused helper functions (~12) prefixed with `_` where the code could plausibly be revived (people-tab badges, trees-tab analyzers, family-chart-export `inlineStyles`). All non-sentence-case errors are now clear — only Tier 4 remains.
- **Exit status:** 1 (sentence-case errors — Tier 4 — still trip non-zero exit)

---

## Rule Breakdown

| # | Rule | Count | Category |
|---|------|------:|----------|
| 1 | `obsidianmd/ui/sentence-case` | 733 | UI text — mostly false positives likely |
| 2 | `no-undef` | 131 | Scope — largely non-TS scripts missing Node env |
| 3 | `@typescript-eslint/no-unused-vars` | 125 | Cleanup |
| 4 | `@typescript-eslint/no-floating-promises` | 29 | Correctness |
| 5 | `obsidianmd/settings-tab/no-manual-html-headings` | 24 | Obsidian anti-pattern |
| 6 | `obsidianmd/no-static-styles-assignment` | 23 | Obsidian anti-pattern |
| 7 | `@typescript-eslint/no-base-to-string` | 23 | Correctness |
| 8 | `no-unused-vars` | 21 | Cleanup (stock rule dup with TS variant) |
| 9 | `@typescript-eslint/no-unnecessary-type-assertion` | 19 | Cleanup |
| 10 | `@typescript-eslint/no-misused-promises` | 12 | Correctness |
| 11 | `@typescript-eslint/require-await` | 11 | Cleanup |
| 12 | `@typescript-eslint/no-deprecated` | 8 | Obsidian API migration |
| 13 | `prefer-const` | 4 | Trivial |
| 14 | `no-useless-escape` | 3 | Trivial |
| 15 | `no-case-declarations` | 2 | Trivial |
| 16 | `obsidianmd/no-tfile-tfolder-cast` | 1 | Obsidian anti-pattern |
| 17 | `obsidianmd/commands/no-command-in-command-name` | 1 | Obsidian anti-pattern |
| 18 | `obsidianmd/commands/no-command-in-command-id` | 1 | Obsidian anti-pattern |
| 19 | `no-redeclare` | 1 | Trivial |
| 20 | `@typescript-eslint/await-thenable` | 1 | Correctness |

---

## Proposed Triage Tiers

### Tier 0 — Infrastructure (first, cheapest, biggest noise reduction) ✅

Goal: eliminate noise that doesn't reflect real issues so the remaining signal is clear.

- [x] **Excluded non-TS build and test-fixture scripts.** Added `build-fonts.js`, `patch-family-chart.js`, and `tests/fixtures/**` to the `ignores` list in `eslint.config.mjs` (matching the existing treatment of `build-css.js`). These are Node scripts that produced `no-undef` noise for `require`, `__dirname`, `console`, `process`, etc.
- [x] **Duplicate stock `no-unused-vars` hits gone.** Those 21 hits were all in the now-excluded non-TS files. The TypeScript variant remains active for `src/` and `main.ts`.

**Actual impact:** 1173 → 1041 problems (-132). `no-undef` dropped from 131 to 20; stock `no-unused-vars` from 21 to 0. The remaining 20 `no-undef` hits are real type-resolution issues in `src/*.ts` — moved to Tier 1.

### Tier 1 — Correctness (real bugs)

These rules catch runtime problems. Fix them regardless.

- [x] **`@typescript-eslint/no-floating-promises` (29)** ✅ — resolved by prefixing fire-and-forget async calls with `void`. Biggest concentration (17) was `this.initializeChart()` in family chart view toggle handlers.
- [x] **`@typescript-eslint/no-misused-promises` (12)** ✅ — resolved by replacing async callbacks with sync wrappers that kick off a void IIFE, or `() => { void this.method(); }` for one-liners.
- [x] **`@typescript-eslint/await-thenable` (1)** ✅ — `await imageMapManager.loadMapConfigs()` was awaiting a sync method; dropped the await.
- [x] **`@typescript-eslint/no-base-to-string` (23, warnings)** ✅ — resolved via explicit typeof narrowing (e.g., `typeof fm?.name === 'string' ? fm.name : file.basename`), an `asString()` helper for the data-quality membership-reading loop, and type assertions on `personData.data['research level']` reads in family-chart-view.
- [x] **`@typescript-eslint/no-deprecated` — 2 of 8** ✅ — `gedcomDateToISO` wrapper updated to call `normalizeGedcomDate`; media-lightbox-modal replaced `workspace.activeLeaf` with `getActiveViewOfType(MarkdownView)`.
- [x] **`@typescript-eslint/no-deprecated` — 6 MembershipData warnings** ✅ — resolved by renaming `MembershipData` → `MembershipRecord` and dropping the `@deprecated` tag (the on-disk migration had already shipped; the type was a misnamed in-memory API object). See [membership-type-cleanup.md](membership-type-cleanup.md).
- [x] **`no-undef` in actual TS files (20)** ✅ — resolved. Mix of missing type imports (`CalendarViewState`, `SourceNote`, `UniverseEntities`/`UniverseEntityEntry`, `NumberingSystem`), missing utility imports (`getErrorMessage` x6), a missing function parameter (`validationService`), a missing local variable lookup (`folderFilter` via `plugin.getFolderFilter()`), Obsidian runtime globals added to ESLint config (`createDiv`, `createFragment`, `createEl`, `createSpan`), and a qualified type reference in a module-augmentation declaration file (`Menu` → `import('obsidian').Menu`).

**Expected effort:** 1-2 focused sessions. These are worth serious attention because they're actual bugs.

### Tier 2 — Structural / Obsidian anti-patterns

Real problems flagged by `obsidianmd/*` — not immediate correctness bugs, but architecturally significant.

- [ ] **`obsidianmd/settings-tab/no-manual-html-headings` (24)** — settings should use `.setHeading()`. Per-site fix in the settings tab(s).
- [ ] **`obsidianmd/no-static-styles-assignment` (23)** — `.style.X = Y` should be CSS classes. Each fix may require a small CSS addition.
- [ ] **`obsidianmd/no-tfile-tfolder-cast` (1)** — replace cast with `instanceof` check.
- [ ] **`obsidianmd/commands/no-command-in-command-name/id` (2)** — remove the word "command" from command names/IDs.

**Expected effort:** 1 session for the 3 small rules; 24 + 23 settings-tab/styles-assignment cases need per-site judgment.

### Tier 3 — Cleanup / code quality

Not bugs, but reduce maintenance drag.

- [x] **`@typescript-eslint/no-unused-vars` (129)** ✅ — dead imports removed (~97 across 40 files), unused locals/parameters trimmed, dead helpers prefixed with `_` for future revival.
- [x] **`@typescript-eslint/no-unnecessary-type-assertion` (19)** ✅ — cleared incidentally during Tier 2 (no items remained by time Tier 3 began).
- [x] **`@typescript-eslint/require-await` (11)** ✅ — ItemView lifecycle methods + one MarkdownPostProcessor + two Phase 3 stubs kept async via targeted eslint-disable; 6 private/internal methods converted to sync.
- [ ] **`prefer-const` (4)**, **`no-useless-escape` (3)**, **`no-case-declarations` (2)**, **`no-redeclare` (1)** — trivial. Batch-fix with `lint:fix` where supported.

**Expected effort:** Half a session for trivial; 1-2 sessions for unused-vars if done thoughtfully.

### Tier 4 — Sentence-case triage (separate effort)

`obsidianmd/ui/sentence-case` produces **733** of the 1173 problems (62%). This needs its own pass:

- Many will be genuine false positives covered by the existing exception list (`coding-standards.md § 4 ESLint Plugin Enforcement → Handling false positives`). Verify and extend the `brands` / `acronyms` config in `eslint.config.mjs`.
- Some will be real Title Case that should be sentence case (per the "Review and potentially fix" category in the existing doc).
- A handful may be inherent to source data (e.g., place names) and need per-site `eslint-disable-next-line`.

**Recommended approach:** bucket the 733 hits by source file. If a file has >20 hits, it's usually a single false-positive pattern (repeated brand, entity-type label, etc.). Bulk-fix by adding to the brands list or by per-file disable where appropriate.

**Expected effort:** Full dedicated session. This one might reveal that the sentence-case rule as currently configured is too aggressive for our codebase and needs to be a `warn` rather than an `error`.

---

## Severity Floor

Proposed for this cleanup effort:

- **Must fix:** everything in Tier 1 (real bugs).
- **Should fix:** Tier 2 (anti-patterns) and Tier 3's unused-vars (maintenance impact).
- **Eventual:** Tier 3 trivial rules, Tier 4 sentence-case.
- **Omit entirely:** nothing in the baseline is "not worth looking at." Every finding has a concrete anchor.

---

## Open Questions Before Execution

1. **Scope of first pass.** Do Tier 0 + Tier 1 together as one release, or Tier 0 alone first (smaller commit, gets clean baseline)?
2. **Sentence-case handling.** Drop severity to `warn` to unblock while we triage, or keep at `error` and work through the 733 systematically?
3. **`require-await` on Obsidian ItemView methods** — per earlier investigation (technical-debt audit), 38 of the `require-await` warnings were acknowledged as justified because `ItemView` methods require the async signature. The count here (11) is smaller than that audit's count, suggesting either cleanup since, or a subset. Worth verifying before treating the 11 as actionable.
4. **Commit strategy.** One cleanup PR per tier, or smaller per-rule commits?

---

## Related

- `archive/technical-debt-audit.md` — completed prior audit; some overlap in spirit, no overlap in findings
- `archive/codebase-cleanup-scan.md` — completed prior scan; focused on duplicate code, doesn't cover lint hygiene
- `CLAUDE.md` (user-local) — references `eslint.config.mjs` and `coding-standards.md` as authoritative; no direct mention of this cleanup

---

## Note on the Lint Baseline

The 1173-problem baseline reflects code that passed CI and merge review for months while the lint script was silently broken. Most of the findings are in code that was reviewed by humans and deemed fine; the machine-readable layer of quality assurance just wasn't running. This context matters for triage: the obvious-looking auto-fixes may still warrant per-site review, since the reason the code shipped is that it "looked fine to a careful reader," not that it was explicitly exempted.
