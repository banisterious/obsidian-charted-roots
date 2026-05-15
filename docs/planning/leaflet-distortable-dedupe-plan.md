# Leaflet-Distortable CSS Dedupe Plan

**Status:** Phase B implemented — Phase C + D pending user verification
**Target release:** v0.22.39
**Branch:** `event-ordering-leaflet-dedupe-v0.22.39`
**Triggered by:** Obsidian Community automated review against v0.22.38 (25 duplicate-selector warnings in the leaflet-distortable surface)

## Implementation notes (2026-05-15)

- **Phase A skipped in favor of analytical confirmation.** Source-order analysis (map-view.css concatenated before leaflet-distortable.css per `build-css.js:55-56`, identical specificity for bare-class duplicates) confirmed the library's hardcoded colors were winning in the cascade and the theme-aware re-implementation in map-view.css was dead code. Scope of visible impact narrowed mid-implementation after discovering `suppressToolbar: true` in `image-map-manager.ts`: most consolidated rules cover the suppressed popup toolbar / keymapper, so theme-aware values there are defensive only. The single user-visible change is the corner-handle selection highlight (`.cr-map-view .ldi img.leaflet-image-layer.collected`'s box-shadow), now `var(--interactive-accent)` instead of `#ffea00`. Phase C visual verification replaces Phase A by checking the post-fix state directly.
- **`.cr-map-view` scoping applied to all consolidated rules** (deviation from initial plan's "leave bare" framing). The library's CSS contains some absurdly broad selectors that leak to general Obsidian UI when bundled — `input[type="text"]::-webkit-input-placeholder`, `li.disabled`, ID selectors `#toggle-keymapper` / `#cancel`. Scoping every rule with `.cr-map-view` contains the leakage to the Charted Roots map view and also avoids cascade conflicts if a user has another plugin running leaflet-distortable. The leaflet-toolbar block (lines 8-132 of `leaflet-distortable.css`) was not scoped — outside the scope of the duplicate-selector cleanup.
- **Bundle size impact:** styles.css went from 41,244 → 40,970 lines (−274). map-view.css went from 2,498 → 2,224 lines (−274). leaflet-distortable.css stayed at 371 lines (content updated in place; `.cr-map-view` prefix adds characters but not lines).

## The problem

The scanner reports ~25 duplicate-selector warnings between two CSS source files. Both files ship rules for `.ldi-*` and `a.leaflet-toolbar-icon.*` selectors — the icon and toolbar styling for the `leaflet-distortable` library used in custom-map image editing.

On investigation, the duplication is structural, not coincidental:

- **`styles/map-view.css:1798-1996`** (~200 lines): a theme-aware re-implementation using Obsidian CSS variables (`var(--interactive-accent)`, `var(--background-primary)`, `var(--text-error)`, `var(--radius-l)`, etc.) and some selectors scoped to `.cr-map-view`.
- **`styles/leaflet-distortable.css:153-360`**: the library's original CSS with hardcoded colors (`#0078a8`, `rgba(255,255,255,1)`, `21px` radii, etc.).

Both files are concatenated in build order: `map-view.css` first, `leaflet-distortable.css` second (per `build-css.js:55-56`). Since the bare-class selectors have identical specificity in both files, **the library's hardcoded values win** for every bare selector. The theme-aware rules in `map-view.css` are silently overridden.

The cascade conflict's user-visible effect is narrower than first thought, however: leaflet-distortable's popup toolbar (rotate / scale / distort / lock controls), the keymapper panel, and the toggle / cancel buttons are intentionally suppressed in Charted Roots' map view (`suppressToolbar: true` in `image-map-manager.ts`). So most of the theme-aligned rules cover UI that doesn't render. The one user-visible consequence: the corner-handle selection highlight (`.cr-map-view .ldi img.leaflet-image-layer.collected`'s box-shadow) renders in the library's hardcoded yellow (`#ffea00`) instead of `var(--interactive-accent)`.

The scanner warning is the primary motivation; theme alignment for the suppressed surfaces is defensive (in case `suppressToolbar` is ever flipped off).

## Upstream status (no rescue available)

`publiclab/Leaflet.DistortableImage` is effectively dormant — last meaningful code change 2023-03-11, with 2025 commits being GitHub Actions / documentation maintenance only. No issues reference theming, dark mode, or CSS variables — the gap apparently never bothered anyone enough to file upstream. No actively maintained themed fork exists (top forks are all 1-star and stale).

Implications:

- No upstream coordination required.
- Our vendored copy is effectively the canonical themed copy of this library's CSS that exists.
- No PR to draft upstream — it would sit indefinitely against a dormant repo.

## Decision — consolidate into `leaflet-distortable.css`

Overwrite the library's hardcoded values directly in `leaflet-distortable.css`, then delete the duplicate block from `map-view.css`.

- One canonical block — cascade no longer depends on file order.
- `leaflet-distortable.css` is already file-level `stylelint-disable`'d and documented as vendored in `automated-review-notes.md` §5.4 — no new disable conventions needed.
- No upstream tracking burden since the library isn't shipping CSS releases.

The alternative (strip duplicates from `leaflet-distortable.css`, keep theme-aware versions in `map-view.css`) was rejected because (a) the library doesn't ship CSS upstream, so vendor-boundary clarity has no practical value, and (b) it would require a per-selector audit to confirm `map-view.css` covers everything in `leaflet-distortable.css`.

## Implementation phases

### Phase A — Cascade audit (~30 min)

Empirically confirm which file is currently winning in the rendered output for each duplicated selector. Use the dev-vault custom-map editing flow:

1. Open a custom-map image in edit mode (rotate / scale / drag controls visible).
2. DevTools: inspect each toolbar icon, panel, and keymapper element.
3. Record the *Computed* style for each duplicated selector. Compare against `map-view.css` body vs `leaflet-distortable.css` body to identify which file's rule applied.
4. Note any selectors where the cascade outcome is surprising (specificity tie + source-order win is the expected default; deviations need a closer look).

Output: a per-selector audit table indicating which file's body should survive consolidation.

### Phase B — Consolidation (~1.5 hr)

Working in `styles/leaflet-distortable.css`:

1. For each duplicated selector, replace the library's hardcoded body with the theme-aware body from `map-view.css`. Preserve any `.cr-map-view` scoping by promoting those selectors to a separate consolidated block within `leaflet-distortable.css` (or keeping them in `map-view.css` if they're already scoped).
2. Delete the corresponding block from `styles/map-view.css:1798-1996`.
3. Run `npm run lint:css` — expect zero new warnings (file-level disable still in effect for `leaflet-distortable.css`).
4. Run `npm run build` and confirm the bundle line count drops by ~200 lines.

Specific selectors to consolidate (from scan output):

- `.ldi-icon`, `.ldi-icon.ldi-delete_forever`, `.ldi-icon.ldi-keyboard_open`, `.ldi-icon.loader`
- `input.ldi`, `input[type="text"]::-webkit-input-placeholder`
- `.ldi-keymapper`, `.ldi-keymapper tr`, `.ldi-keymapper td`, `.ldi-keymapper kbd`
- `#toggle-keymapper`, `#toggle-keymapper:hover`, `.close-icon#toggle-keymapper`, `.close-icon#toggle-keymapper:hover`
- `a.leaflet-toolbar-icon.rotate.selected-mode, a.leaflet-toolbar-icon.freeRotate.selected-mode` (plus `.ldi-icon` descendant variant)
- `a.leaflet-toolbar-icon.drag.selected-mode`
- `a.leaflet-toolbar-icon.distort.selected-mode, a.leaflet-toolbar-icon.scale.selected-mode` (plus `.ldi-icon` descendant variant)
- `a.leaflet-toolbar-icon.lock.selected-mode` (plus `.ldi-icon` descendant variant)
- `a.leaflet-toolbar-icon.disabled`, `li.disabled`
- `a.leaflet-toolbar-icon[title="Loading..."]`
- `#cancel`

### Phase C — Visual verification (~10 min)

In dev vault, with both light and dark themes:

1. Open a custom-map image in edit mode (Charted Roots' edit-mode banner appears with Save alignment / Undo changes / Reset / Cancel buttons).
2. Click on the image to mark it "selected" (collected) — this triggers the box-shadow halo around the image.
3. Confirm the halo renders in `var(--interactive-accent)` (theme accent color, typically purple in default Obsidian dark theme) rather than yellow (`#ffea00`).
4. Switch theme (light ↔ dark) and confirm halo follows the theme accent.

Scope of visible change is narrow because leaflet-distortable's popup toolbar / keymapper are intentionally suppressed in Charted Roots (`suppressToolbar: true` at `image-map-manager.ts:686`). The toolbar icons, keymapper panel, and `#toggle-keymapper` rules were theme-aligned for defensive reasons only.

### Phase D — Scanner verification

Re-run the Community automated review against a pre-tag build of v0.22.39:

- Expect: ~25 duplicate-selector warnings gone from the CSS lint section.
- Remaining warnings should be exactly the §5 irreducible categories: 4 multicolumn (timeline-callouts) + 1 `!important` (family-chart).

## Risks

- **Visual regression**: a theme-aware rule body may exhibit subtly different behavior than the library's hardcoded one (e.g., `var(--radius-l)` is `8px` in default Obsidian themes vs the library's `21px` — that is a meaningful shape change for the keymapper panel). Phase C verification catches this.
- **Missed selectors**: Phase B targets only the scanner-flagged duplicates. If `map-view.css` covers selectors the scanner *didn't* flag (because their bodies happen to be identical), those stay in both files. Worth a one-time grep at end of Phase B to confirm `map-view.css` has no remaining `.ldi-*` rules.
- **Plugin reload required**: CSS changes need full plugin disable / re-enable in the dev vault for visual verification — Obsidian's CSS hot-reload can be stale.

## Research notes (collected before plan creation)

- **Upstream search** against `publiclab/Leaflet.DistortableImage`: no issues about theming, dark mode, color customization, or CSS-variable support. No actively maintained themed fork.
- **Internal search** against `banisterious/obsidian-charted-roots`: zero issue reports for the latent visual bug. The custom-map image editing flow is rarely re-entered after initial placement, so the regression has gone unnoticed.
- **Bundle size impact**: ~200 lines removed from `styles.css` (~6 KB). Negligible against the 14.81 MB main.js >5MB Sync Standard warning, but worth noting in the release entry.

## Scope

**In scope for this plan:**

- All 25 scanner-flagged duplicate selectors between `map-view.css` and `leaflet-distortable.css`.

**Out of scope (separate work):**

- The 4 timeline-callouts multicolumn warnings (`automated-review-notes.md` §5.2) — Option B in the broader scan-cleanup discussion. Revisit only if the score remains below target after this dedupe.
- The 1 family-chart `!important` warning (`automated-review-notes.md` §5.1) — pending upstream library update; not blocking.
- The release-level scanner findings (>5MB main.js, Bitcoin wallet false positive, setInterval+network false positive).

## Effort estimate

~3 hours including verification. Single-file branch, one commit, no test changes (no behavioral change at the runtime layer).

Suggested commit subject: `refactor(css): Consolidate leaflet-distortable duplicates and theme-align icons`.

## Completion criteria

- [x] Phase A audit (skipped — analytical confirmation replaced it).
- [x] Phase B consolidation: distortable block removed from `map-view.css` (lines 1773-2045, −274 lines), `leaflet-distortable.css` updated with theme-aware values and `.cr-map-view` scoping.
- [x] `npm run build` produces a `styles.css` 274 lines shorter than v0.22.38's (41,244 → 40,970).
- [x] `npm run lint:css` produces zero new warnings (0 errors / 113 warnings — same as v0.22.38 baseline).
- [ ] Phase C visual verification across light + dark themes (pending user dev-vault inspection).
- [ ] Phase D scanner verification confirms ~25 duplicate-selector warnings cleared (pending user-triggered Community scan against the branch).

When Phase C + D are verified, update status header to `✅ Complete` and `git mv` to `docs/planning/archive/`.
