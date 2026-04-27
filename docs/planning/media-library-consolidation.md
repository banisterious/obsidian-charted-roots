# Media Library Consolidation

**Status:** 📋 Planned. Execution deferred until the website capture program is complete.
**Authored:** 2026-04-27.
**Trigger:** Begin Phase 1 once every legacy `docs/images/` file either has a modern replacement available in `docs/images/raw/` or has been re-captured as part of an ongoing capture session. Pragmatic shorthand: "after the website captures are all complete" (Calendar View, Custom Relationships Overlay motion capture, plus the small re-capture work this plan introduces for legacy README content).
**Out of scope today:** No file moves yet. This is a written plan; the per-phase commits land later.

---

## Why this plan exists

On 2026-04-27 (commits `2de9eb9e` + `77ff5367`) `docs/images/raw/` was reframed from "archival storage of last resort after the website session ships" to "the project's canonical media library, available to any surface — wiki, in-repo docs, website, future tracks." Both static (.png) and motion (.webm / .mp4) captures are now tracked.

That reframing surfaces an open question about the parent directory `docs/images/`: it currently holds 8 legacy files left over from earlier plugin development, all referenced from `README.md` only, all using a pre-modern naming convention (`charted-roots-<feature>.png`, `family-tree-canvas.png`, `buy-me-a-coffee.png`). They predate the `cr-<feature>-<variant>.<ext>` convention used for everything in `raw/`.

Goal: eventually consolidate so that `docs/images/raw/` (or a renamed-up `docs/images/`) is the single canonical media location, with consistent naming, no parallel legacy directory.

Approach: staged migration over time, not a one-shot bulk move. Avoids the failure mode of "modernize everything, ship a stale shot under a modern name."

---

## Three options considered

| Option | Approach | Why not chosen |
|---|---|---|
| **A** | Bulk move + rename. Move every legacy file into `raw/` with a modernized name in one pass; update README. | Risk of shipping stale captures under modern naming. The legacy shots are from earlier UI / different theme; renaming masks the quality gap. |
| **B** | Active/legacy split. Keep `docs/images/raw/` as the modern library; `docs/images/` as the parent for "non-capture branding + legacy README content awaiting modernization." | Functional, but the split grows muddy over time. Cruft accumulates. |
| **C** | Staged migration. Branding relocation + same-day pointer swaps for already-superseded shots; per-feature re-captures for the rest as future capture sessions land them. | ✅ Chosen. Avoids quality-gap risk; defers work to natural capture sessions; ends in the same final state as Option A without the rush. |

---

## Reference audit

All 8 legacy files in `docs/images/` are referenced exclusively from `README.md`. No wiki references, no `docs/` references, no website references. That makes the migration scope contained: one file to update per move/replace.

```bash
# Reproduce the audit:
for f in $(ls docs/images/*.png | xargs -I{} basename {}); do
    echo "=== $f ==="
    git grep -l "$f" | grep -v node_modules
done
```

---

## File-by-file disposition

| Legacy file | Bucket | Modern replacement | Phase |
|---|---|---|---|
| `buy-me-a-coffee.png` | Branding badge (not a feature capture) | Moved as-is to `docs/assets/branding/buy-me-a-coffee.png` | Phase 1 |
| `charted-roots-family-chart-view.png` | Already superseded | `cr-family-chart-live.png` (already in `raw/`) | Phase 2 |
| `charted-roots-interactive-map-view.png` | Already superseded | `cr-map-migration-paths.png` (already in `raw/`) | Phase 2 |
| `family-tree-canvas.png` | Already superseded | `cr-canvas-tree-multi-generational.png` (already in `raw/`) | Phase 2 |
| `charted-roots-control-center-dashboard-tab.png` | Needs re-capture | `cr-control-center-dashboard.png` (TBD) | Phase 3 |
| `charted-roots-control-center-maps-tab.png` | Needs re-capture | `cr-control-center-maps.png` (TBD) | Phase 3 |
| `charted-roots-person-note.png` | Needs evaluation | Either reuse `cr-entity-profile-person.png` or fresh `cr-person-note.png` capture | Phase 3 |
| `charted-roots-statistics-view.png` | Needs re-capture | `cr-statistics-view.png` (TBD) | Phase 3 |

Three already-superseded shots can retire as soon as Phase 2 ships; four require new captures and ride future capture sessions.

---

## Phases

### Phase 1 — Branding relocation

**Scope:** `buy-me-a-coffee.png` doesn't belong in `images/` at all. It's a sponsor badge, not a feature capture. The brand kit already lives under `docs/assets/branding/`; the badge belongs there too.

**Steps:**
1. `git mv docs/images/buy-me-a-coffee.png docs/assets/branding/buy-me-a-coffee.png`
2. Update `README.md` reference to the new path
3. Single commit: `chore: Relocate buy-me-a-coffee badge to docs/assets/branding/`

**Risk:** Negligible. One file, one reference.

### Phase 2 — Pointer swaps for already-superseded shots

**Scope:** Three legacy shots have direct modern replacements already in `raw/`. Update the three README references to point at the modern files; delete the legacy.

**Steps:**
1. Edit `README.md`:
   - `docs/images/charted-roots-family-chart-view.png` → `docs/images/raw/cr-family-chart-live.png`
   - `docs/images/charted-roots-interactive-map-view.png` → `docs/images/raw/cr-map-migration-paths.png`
   - `docs/images/family-tree-canvas.png` → `docs/images/raw/cr-canvas-tree-multi-generational.png`
2. `git rm` the three legacy files
3. Single commit: `docs(media): Retire three superseded README captures`

**Risk:** Low. Modern shots are higher-quality; visual replacement should read as an upgrade. Worth a `gh pr preview` or local README render to confirm modern shots render at acceptable proportions in the README's specific layout context (e.g., centered hero, table cell, etc.) — README shots sometimes have framing constraints that the modern captures don't share.

### Phase 3 — Per-feature re-capture replacements

**Scope:** Four legacy shots require new captures. Each rides a future capture session that covers the relevant feature.

| Feature | Capture target | Replaces |
|---|---|---|
| Statistics View | `cr-statistics-view.png` (single shot) | `charted-roots-statistics-view.png` |
| Control Center — Dashboard tab | `cr-control-center-dashboard.png` | `charted-roots-control-center-dashboard-tab.png` |
| Control Center — Maps tab | `cr-control-center-maps.png` | `charted-roots-control-center-maps-tab.png` |
| Person note (reading view) | TBD: either `cr-person-note.png` fresh capture or repoint to `cr-entity-profile-person.png` | `charted-roots-person-note.png` |

**Approach per shot:**
1. Capture using the standard conventions (1920×1080, dark theme, Anderson fixture, etc. — see [website-content/media-plan.md](website-content/media-plan.md) Static format conventions).
2. Land in `docs/images/raw/` with the modern filename (commit alongside the capture session per the media-library convention).
3. In the same or a follow-up commit, update the README reference and `git rm` the legacy file.

These shots also fit naturally into eventual website captures (Statistics View especially — it's been on the media-plan's pending Visualization list since the start). Doing the README replacement at the same time piggybacks on the capture work without adding a separate session.

### Phase 4 — Final cleanup

**Scope:** Once Phases 1–3 are complete, `docs/images/` will be empty of files. Two structural choices:

- **(a) Leave the structure as-is.** `docs/images/raw/` continues to hold the canonical library; `docs/images/` is just an empty parent directory. No change needed; nothing breaks.
- **(b) Collapse `raw/` up one level.** Rename `docs/images/raw/` to `docs/images/` (effectively dropping the `raw/` segment). Update all references in `wiki-content/`, in-repo docs, and the website session's brief patterns. Cleaner final structure but requires a coordinated update across all surfaces.

(a) is the safer default. (b) is a polish item that could land much later — the structural improvement is small and the reference-update cost is real.

**Decision deferred until Phase 3 completes.** Easier to evaluate when the actual file set is known.

---

## Trigger conditions

Begin Phase 1 + Phase 2 when:

- The Calendar View capture batch (2 shots) has been captured and committed to `raw/`.
- The Custom Relationships Overlay motion capture has been recorded and committed to `raw/`.

These two are explicit blockers in the media-plan's "Visualization static-shots remaining" list. After they ship, the website-capture program for the v1 / 1.0 launch is functionally complete — that's the natural milestone.

Phase 1 + Phase 2 don't depend on this trigger technically (they're dependency-free at the file level). The trigger exists to reduce context-switching: keep capture work in capture mode, then do the consolidation cleanup as a single focused pass.

Phase 3 happens opportunistically as future capture sessions cover the relevant features. No firm trigger; it's "do the README swap when you happen to be capturing that feature for any reason."

Phase 4 happens whenever Phase 3 is fully complete and the structural decision feels worth making.

---

## Acceptance criteria

- [ ] Phase 1: `buy-me-a-coffee.png` lives at `docs/assets/branding/`; `docs/images/buy-me-a-coffee.png` no longer exists; README renders correctly.
- [ ] Phase 2: Three already-superseded files removed from `docs/images/`; README points at modern `raw/` files; README renders at least as well as before.
- [ ] Phase 3 (gated on per-feature captures): Four re-captured files in `raw/`; README references swapped; legacy versions deleted.
- [ ] Phase 4 (post-Phase 3): structural decision documented — either `docs/images/raw/` retained or collapsed to `docs/images/`.
- [ ] No remaining references to legacy filenames anywhere in the repo (audit via the same `git grep` pattern in the Reference audit section).

---

## Open questions

1. **Person note shot framing.** The README's `charted-roots-person-note.png` shows a person note's reading view. The modern `cr-entity-profile-person.png` shows the same note PLUS the Profile View pane on the right. Are these interchangeable for the README's purpose, or does the README want a cleaner reading-view-only shot? Decide during Phase 3.
2. **Modern shot proportions in README context.** The README's image layout may have specific framing constraints (e.g., wide hero shots vs. centered medium-width captures). Modern captures from `raw/` are 1920×1080 sources optimized to ~1280px display width. May read differently in the README's layout. Verify during Phase 2 visual check.
3. **Whether to re-frame `docs/images/` itself.** Option (b) of Phase 4 (collapsing `raw/` up one level) is structurally cleaner but requires coordinated reference updates across `wiki-content/`, internal docs, the website's `static/img/` layout, and any external links to GitHub raw URLs. The cost may exceed the benefit. Revisit when the file set is final.

---

## Related work

- [website-content/media-plan.md](website-content/media-plan.md) — canonical media plan including capture conventions and the Visualization static-shots queue (Calendar View, Statistics View, etc.) that Phase 3 will piggyback on.
- Commits `2de9eb9e` + `77ff5367` — the 2026-04-27 reframing of `docs/images/raw/` from archival storage to project media library that motivated this plan.
