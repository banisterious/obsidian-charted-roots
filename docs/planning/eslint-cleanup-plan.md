# ESLint Baseline Cleanup

Plan for triaging the real lint output that was hidden by a broken `npm run lint` script, plus the 2026-05-11 re-baseline after the `eslint-plugin-obsidianmd` 0.1.9 → 0.2.9 upgrade.

**Status:** 🟡 In progress — Tier 0 / 1 / 2 / 3 historical work shipped; 2026-05-11 upgrade re-baseline introduces new rules and resurfaces some previously-cleared categories. Tier 4 (sentence-case) still pending. **Next session: tackle the 2026-05-11 upgrade findings.**

**Root cause context (original):** `node_modules/.bin/eslint` was a zero-byte file (likely caused by WSL symlink-creation failing during `npm install --no-bin-links` at some point). The `npm run lint` script resolved to the empty binary and exited 0 silently. Fixed in commit [77848f14](#) by switching the lint/lint:fix scripts to direct `node` invocation.

**2026-05-11 upgrade context:** `eslint-plugin-obsidianmd` upgraded 0.1.9 → 0.2.9 in commit `489d1eca`. The 0.2.x line adds many new rules and refines existing ones. Plugin config refactored to use the recommended preset (`obsidianmd.configs.recommended`) + CR-specific overrides — see commit message for full scope. Requires Node 20.11+; the project dev environment is now on 20.20.2 via nvm. The post-Tier-3 state was 733 sentence-case-only errors (all other tiers green); the upgrade reset the baseline because the recommended preset enables stricter typed rules and several brand-new rules.

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

## 2026-05-11 — 0.2.9 Upgrade Re-Baseline

After upgrading `eslint-plugin-obsidianmd` 0.1.9 → 0.2.9 and refactoring the config to use the plugin's recommended preset, the lint surface is **1592 problems (653 errors, 939 warnings)** across the same codebase. Down from the pre-upgrade noise baseline of 8197, but up from the post-Tier-3 state of 733 (sentence-case only).

Two distinct sources of new findings:

1. **New rules introduced by 0.2.x** that didn't exist in 0.1.9.
2. **Stricter detection in existing rules** — some categories cleared by previous tier work are showing hits again because the typed-rule infrastructure resolves more cases, or new code added since the last cleanup pass.

### Current Rule Breakdown (2026-05-11, post-upgrade)

**Errors (653):**

| # | Rule | Count | Status | Category |
|---|------|------:|--------|----------|
| 1 | `obsidianmd/ui/sentence-case` | 577 | Carried over | UI text — mostly brand/acronym false positives, see Tier 4 |
| 2 | `@typescript-eslint/no-floating-promises` | 26 | **Resurfaced** | Correctness — was 0 after Tier 1 |
| 3 | `@typescript-eslint/no-base-to-string` | 11 | **Resurfaced** | Correctness — was 0 after Tier 1 |
| 4 | `@typescript-eslint/no-unnecessary-type-assertion` | 6 | **Resurfaced** | Cleanup — was 0 after Tier 2/3 |
| 5 | `@typescript-eslint/no-redundant-type-constituents` | 5 | **NEW (0.2.x)** | New typed-rule detection |
| 6 | `obsidianmd/no-tfile-tfolder-cast` | 4 | **Resurfaced** | Obsidian anti-pattern — was 0 after Tier 2 |
| 7 | `@typescript-eslint/restrict-template-expressions` | 4 | **NEW** | New typed-rule detection |
| 8 | `obsidianmd/prefer-instanceof` | 3 | **NEW (0.2.x)** | Obsidian-specific — prefer `instanceof` over duck-typing |
| 9 | `no-useless-escape` | 2 | **Resurfaced** | Trivial — was 0 after Tier 3 |
| 10 | `depend/ban-dependencies` | 2 | **NEW (0.2.x)** | New rule from `eslint-plugin-depend` |
| 11 | `no-unsanitized/property` | 1 | **NEW (0.2.x)** | New rule from `eslint-plugin-no-unsanitized` |
| 12 | `no-undef` | 1 | **Resurfaced** | Scope |
| 13 | `import/no-extraneous-dependencies` | 1 | **NEW (0.2.x)** | New rule from `eslint-plugin-import` |

**Warnings (939):**

| # | Rule | Count | Status | Severity demoted from `error`? |
|---|------|------:|--------|---|
| 1 | `obsidianmd/prefer-create-el` | 285 | **NEW (0.2.x)** | Yes — demoted to `warn` in CR config |
| 2 | `obsidianmd/prefer-active-doc` | 163 | **NEW (0.2.x)** | Yes — demoted to `warn` |
| 3 | `obsidianmd/prefer-active-window-timers` | 151 | **NEW (0.2.x)** | Yes — demoted to `warn` |
| 4 | `@typescript-eslint/no-unused-vars` | 73 | **Resurfaced** | Recommended-preset sets it to `warn` (was `error` pre-upgrade); 73 new hits since Tier 3 |

### New Rules to Decide On

These rules didn't exist in the 0.1.9 baseline. CR config currently leaves them at their recommended-preset severity except where explicitly demoted in `eslint.config.mjs`. Decision points for the next session:

- **`prefer-create-el` (285 warn)** — Obsidian-specific preference for `parent.createEl('div', {...})` over `parent.appendChild(document.createElement('div'))`. Real ergonomic improvement; non-trivial to mechanically fix because many sites use third-party libraries that return raw DOM elements. Could be deferred indefinitely or addressed file-by-file as those files get touched for other reasons.
- **`prefer-active-doc` (163 warn)** — prefer `app.workspace.activeEditor.editor` / `getActiveViewOfType` over direct `document.activeElement` lookups. Same shape as `prefer-create-el` — real preference, non-trivial sweep.
- **`prefer-active-window-timers` (151 warn)** — prefer `activeWindow.setTimeout` over global `setTimeout` to support Obsidian's pop-out window feature. Important for users with pop-out windows; could be a real correctness issue when timers fire on the wrong window.
- **`prefer-instanceof` (3 err)** — small count, likely quick fixes.
- **`no-redundant-type-constituents` (5 err)** — type-union simplifications; auto-fixable in some cases.
- **`restrict-template-expressions` (4 err)** — disallows `${obj}` template interpolation when `obj`'s `.toString()` would yield `[object Object]`. Real signal.
- **`depend/ban-dependencies` (2 err)** — checks for deprecated/abandoned dependencies; look at the specific dependencies flagged before deciding action.
- **`no-unsanitized/property` (1 err)** — `innerHTML` / `outerHTML` writes without sanitization. Almost certainly a real signal worth fixing.
- **`import/no-extraneous-dependencies` (1 err)** — single import not declared in `package.json` dependencies. Check the specific case.

### Resurfaced Rules (was 0 after prior tier work)

These were cleared by historical tier work but are showing hits again. Either new code added since, or stricter detection in the upgraded plugin.

| Rule | Prior tier | Current count | Likely cause |
|------|------------|--------------:|--------------|
| `no-floating-promises` | Tier 1 (29 → 0) | 26 | Mix of new code + possibly stricter detection |
| `no-base-to-string` | Tier 1 (23 → 0) | 11 | Likely new code calling `.toString()` on objects without explicit `String(x)` |
| `no-unnecessary-type-assertion` | Tier 2/3 (19 → 0) | 6 | Likely new code with redundant `as X` |
| `no-tfile-tfolder-cast` | Tier 2 (1 → 0) | 4 | New code with `as TFile` casts |
| `no-unused-vars` | Tier 3 (129 → 0) | 73 | Accumulated through 0.22.x cycle work |
| `no-useless-escape` | Tier 3 (3 → 0) | 2 | Trivial |
| `no-undef` | Tier 1 (20 → 0) | 1 | Trivial |

### Proposed Re-Baseline Triage

Three batches for the next session (roughly in order of value-per-minute):

**Batch A — Real-signal errors (~76, ~1-2 hrs total)**

Everything in the Errors table above except sentence-case (577). Most are small per-site fixes. Order:

1. Single-hit rules first (`no-unsanitized/property`, `import/no-extraneous-dependencies`, `no-undef`) — fastest signal.
2. `no-redundant-type-constituents` (5) and `prefer-instanceof` (3) — likely auto-fixable or near-auto.
3. `no-tfile-tfolder-cast` (4) and `restrict-template-expressions` (4) — small but per-site.
4. `no-unnecessary-type-assertion` (6) — likely `lint:fix` covers most.
5. `no-base-to-string` (11) and `no-useless-escape` (2) — per-site.
6. `no-floating-promises` (26) — biggest single batch; same pattern as Tier 1's resolution (`void` prefix or `.catch()`).
7. `depend/ban-dependencies` (2) — read the rule's report; might be a quick declarative fix.

**Batch B — Tier 4 sentence-case (577, ~1 session)**

Same approach as the original Tier 4 plan: bucket by file, look for repeated false-positive patterns (brands/acronyms missing from the config's list), bulk-fix via config additions or per-file disables. The 0.2.9 upgrade already cleaned up some of these via the broader default brand list — went from 733 (post-Tier-3) to 577. Worth re-running after Batch A clears in case some sentence-case overlaps real-signal fixes.

**Batch C — New rules with high warning counts (defer / decide separately)**

- `prefer-create-el` (285 warn) — defer or address opportunistically.
- `prefer-active-doc` (163 warn) — same.
- `prefer-active-window-timers` (151 warn) — worth a proper survey before deciding; pop-out-window users could hit real timer-on-wrong-window bugs.
- `no-unused-vars` (73 warn) — sweep, same shape as the Tier 3 pass.

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

- [x] **`obsidianmd/settings-tab/no-manual-html-headings` (24)** ✅ — cleared via `lint:fix` during Tier 2/3 quick-win batch.
- [x] **`obsidianmd/no-static-styles-assignment` (23)** ✅ — resolved via `el.show()`/`el.hide()` for display toggles, CSS class additions for style values, `toggleClass` for cursor states, one targeted eslint-disable for a Leaflet-generated DOM element.
- [x] **`obsidianmd/no-tfile-tfolder-cast` (1)** ✅ — replaced cast with `instanceof` check.
- [x] **`obsidianmd/commands/no-command-in-command-name/id` (2)** ✅ — removed "command" from command names/IDs.

**Expected effort:** 1 session for the 3 small rules; 24 + 23 settings-tab/styles-assignment cases need per-site judgment.

### Tier 3 — Cleanup / code quality

Not bugs, but reduce maintenance drag.

- [x] **`@typescript-eslint/no-unused-vars` (129)** ✅ — dead imports removed (~97 across 40 files), unused locals/parameters trimmed, dead helpers prefixed with `_` for future revival.
- [x] **`@typescript-eslint/no-unnecessary-type-assertion` (19)** ✅ — cleared incidentally during Tier 2 (no items remained by time Tier 3 began).
- [x] **`@typescript-eslint/require-await` (11)** ✅ — ItemView lifecycle methods + one MarkdownPostProcessor + two Phase 3 stubs kept async via targeted eslint-disable; 6 private/internal methods converted to sync.
- [x] **`prefer-const` (4)**, **`no-useless-escape` (3)**, **`no-case-declarations` (2)**, **`no-redeclare` (1)** ✅ — cleared via `lint:fix` during Tier 2/3 quick-win batch.

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
- `docs/developer/coding-standards.md` — authoritative for the project's TS/CSS standards including sentence-case false-positive handling; referenced by the rule config in `eslint.config.mjs`

---

## Note on the Lint Baseline

The 1173-problem baseline reflects code that passed CI and merge review for months while the lint script was silently broken. Most of the findings are in code that was reviewed by humans and deemed fine; the machine-readable layer of quality assurance just wasn't running. This context matters for triage: the obvious-looking auto-fixes may still warrant per-site review, since the reason the code shipped is that it "looked fine to a careful reader," not that it was explicitly exempted.
