# Leaflet-Distortable CSS Dedupe Plan

**Status:** Active — Phase A pending
**Target release:** v0.22.39
**Branch:** `event-ordering-leaflet-dedupe-v0.22.39`
**Triggered by:** Obsidian Community automated review against v0.22.38 (25 duplicate-selector warnings in the leaflet-distortable surface)

## The problem

The scanner reports ~25 duplicate-selector warnings between two CSS source files. Both files ship rules for `.ldi-*` and `a.leaflet-toolbar-icon.*` selectors — the icon and toolbar styling for the `leaflet-distortable` library used in custom-map image editing.

On investigation, the duplication is structural, not coincidental:

- **`styles/map-view.css:1798-1996`** (~200 lines): a theme-aware re-implementation using Obsidian CSS variables (`var(--interactive-accent)`, `var(--background-primary)`, `var(--text-error)`, `var(--radius-l)`, etc.) and some selectors scoped to `.cr-map-view`.
- **`styles/leaflet-distortable.css:153-360`**: the library's original CSS with hardcoded colors (`#0078a8`, `rgba(255,255,255,1)`, `21px` radii, etc.).

Both files are concatenated in build order: `map-view.css` first, `leaflet-distortable.css` second (per `build-css.js:55-56`). Since the bare-class selectors have identical specificity in both files, **the library's hardcoded values win** for every bare selector. The theme-aware rules in `map-view.css` are silently overridden — wasted effort, and a latent visual bug (the distortable image editing toolbar renders in the library's blue/red/black colors regardless of theme; the keymapper panel renders with a hardcoded white background even in dark mode).

The scanner warning is a symptom; the real problem is the un-cascading override pair.

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

### Phase C — Visual verification (~45 min)

In dev vault, with both light and dark themes:

1. Open a custom-map image in edit mode. Cycle through rotate / scale / drag / distort / lock modes. Confirm icons render in theme colors (not hardcoded blue / red / black).
2. Open the keymapper panel (keyboard shortcut). Confirm background renders in `var(--background-primary)` for both themes (not pure white in dark mode).
3. Toggle the keymapper close button. Confirm hover state renders correctly.
4. Test the Loading and Disabled toolbar icon states (use a slow or invalid image URL).
5. Confirm the cancel button on edit-mode exit renders correctly.

Capture before / after screenshots for the v0.22.39 release notes — visual change is real (icons go from hardcoded library colors to theme-aware).

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

- [ ] Phase A audit complete with per-selector table.
- [ ] Phase B consolidation: `map-view.css:1798-1996` block removed, `leaflet-distortable.css` updated with theme-aware values.
- [ ] `npm run build` produces a `styles.css` ~200 lines shorter than v0.22.38's.
- [ ] `npm run lint:css` produces zero new warnings.
- [ ] Phase C visual verification across light + dark themes documented (screenshots optional).
- [ ] Phase D scanner verification confirms ~25 duplicate-selector warnings cleared.

When complete, update status header to `✅ Complete` and `git mv` to `docs/planning/archive/`.
