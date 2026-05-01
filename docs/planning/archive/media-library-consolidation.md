# Media Library Consolidation

**Status:** ✅ Complete (2026-05-01). All structural consolidation work shipped: Phase 1 (buy-me-a-coffee branding relocation), Phase 2 (README curation refresh — seven legacy captures retired, six modern replacements), Phase 4 (`docs/images/raw/` collapsed to `docs/images/`). The originally-scoped Phase 3 was largely obviated by the Tier 3 README curation; one residual non-blocking item — capturing `cr-statistics-view.png` for the Statistics-And-Reports wiki page — survives as a small future addition tracked in [wiki-media-integration.md](wiki-media-integration.md)'s mapping table, not a structural-cleanup task.
**Authored:** 2026-04-27.
**Trigger:** Originally "after the website captures are all complete." Met 2026-04-28; first commit landed 2026-05-01.

---

## Why this plan exists

On 2026-04-27 (commits `2de9eb9e` + `77ff5367`) `docs/images/` was reframed from "archival storage of last resort after the website session ships" to "the project's canonical media library, available to any surface — wiki, in-repo docs, website, future tracks." Both static (.png) and motion (.webm / .mp4) captures are now tracked.

That reframing surfaces an open question about the parent directory `docs/images/`: it currently holds 8 legacy files left over from earlier plugin development, all referenced from `README.md` only, all using a pre-modern naming convention (`charted-roots-<feature>.png`, `family-tree-canvas.png`, `buy-me-a-coffee.png`). They predate the `cr-<feature>-<variant>.<ext>` convention used for everything in `raw/`.

Goal: eventually consolidate so that `docs/images/` (or a renamed-up `docs/images/`) is the single canonical media location, with consistent naming, no parallel legacy directory.

Approach: staged migration over time, not a one-shot bulk move. Avoids the failure mode of "modernize everything, ship a stale shot under a modern name."

---

## Three options considered

| Option | Approach | Why not chosen |
|---|---|---|
| **A** | Bulk move + rename. Move every legacy file into `raw/` with a modernized name in one pass; update README. | Risk of shipping stale captures under modern naming. The legacy shots are from earlier UI / different theme; renaming masks the quality gap. |
| **B** | Active/legacy split. Keep `docs/images/` as the modern library; `docs/images/` as the parent for "non-capture branding + legacy README content awaiting modernization." | Functional, but the split grows muddy over time. Cruft accumulates. |
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

| Legacy file | Disposition | Status |
|---|---|---|
| `buy-me-a-coffee.png` | Move to `docs/assets/branding/` | Phase 1 — pending |
| `charted-roots-family-chart-view.png` | Removed; README points at `cr-family-chart-live.png` | ✅ Done 2026-05-01 |
| `charted-roots-interactive-map-view.png` | Removed; README points at `cr-map-migration-paths.png` | ✅ Done 2026-05-01 |
| `family-tree-canvas.png` | Removed; README points at `cr-canvas-tree-multi-generational.png` | ✅ Done 2026-05-01 |
| `charted-roots-control-center-dashboard-tab.png` | Removed; dropped from README curation (Tier 3) — replaced by `cr-control-center-collections.png` slot | ✅ Done 2026-05-01 |
| `charted-roots-control-center-maps-tab.png` | Removed; dropped from README curation entirely (duplicated the geographic map cell) | ✅ Done 2026-05-01 |
| `charted-roots-person-note.png` | Removed; Demo section's full-tour thumbnail switched to YouTube auto-thumb | ✅ Done 2026-05-01 |
| `charted-roots-statistics-view.png` | Removed from README; future wiki use ([Statistics-And-Reports.md](../../../wiki-content/Statistics-And-Reports.md)) still wants a fresh `cr-statistics-view.png` per [wiki-media-integration.md](wiki-media-integration.md) | Wiki-only — pending |

The Tier 3 curation pass collapsed three of the four originally-Phase-3 re-captures by dropping those features from the README entirely. The remaining Phase 3 work is a single capture for wiki use.

---

## Phases

### Phase 1 — Branding relocation ✅ Complete (2026-05-01, commit `b7154df0`)

`buy-me-a-coffee.png` moved from `docs/images/` to `docs/assets/branding/`; README reference updated. With this move, `docs/images/` had only `raw/` remaining as a child — fed directly into Phase 4 in the same session.

### Phase 2 — Pointer swaps for already-superseded shots ✅ Complete (2026-05-01)

Originally scoped as three pointer swaps. Shipped as a broader Tier 3 curation refresh (commit `e7bc00a6`) that retired all seven legacy README captures in one pass:

- Three already-superseded shots swapped to `raw/` modern equivalents (Family Chart, Map view, Canvas tree).
- Three Phase-3-bucketed shots dropped from the README curation entirely (Control Center Dashboard tab, Control Center Maps tab, Statistics — see Phase 3 for what's left).
- Demo section's full-tour thumbnail switched from the legacy person-note shot to the YouTube auto-thumbnail, matching the Quick tour cell's format.
- Curation also added two new slots not previously represented in the README's Screenshots grid: Worldbuilding (`cr-universe-overview.png`) and Evidence & sources (`cr-entity-attribution.png`).

Net effect: README's Screenshots section refreshed end-to-end; the originally-anticipated "render at acceptable proportions" risk did not materialize.

### Phase 3 — Per-feature re-capture replacements (reduced)

Originally scoped as four re-captures. The Tier 3 curation pass collapsed three of them by dropping those features from the README entirely (Control Center Dashboard, Control Center Maps, person-note Demo thumbnail). The remaining one is wiki-only:

| Feature | Capture target | For |
|---|---|---|
| Statistics View | `cr-statistics-view.png` (single shot) | [wiki-content/Statistics-And-Reports.md](../../../wiki-content/Statistics-And-Reports.md) per [wiki-media-integration.md](wiki-media-integration.md) |

**Approach:** Capture using the standard conventions (1920×1080, dark theme, Anderson fixture, etc. — see [website-content/media-plan.md](../website-content/media-plan.md)). Land in `docs/images/` with the modern filename. Use during the wiki-media-integration Phase 1 (visualization track).

No README change involved — this is purely future wiki work.

### Phase 4 — Structural cleanup ✅ Complete (2026-05-01)

Chose option (b) — collapsed `docs/images/raw/` up to `docs/images/`. Rationale: by the time Phases 1 + 2 shipped, the `raw/` label had lost meaning (the directory was no longer a staging buffer feeding the website's deploy pipeline; it had become the canonical media library that the README and wiki reference directly). The cost-of-rename grows with each new committed reference, so doing it immediately after the curation pass minimized scope.

53 files moved via `git mv`; 6 README references rewritten; planning-doc references updated; `.gitignore` comment updated. Decision was made earlier in this session than the plan originally anticipated (the plan deferred the choice until Phase 3 completed; instead, Phase 4 ran ahead of the reduced Phase 3 because Phase 3's remaining work is wiki-only and decoupled from the structural shape of `docs/images/`).

---

## Trigger conditions (historical)

Originally: begin Phases 1 + 2 after the website's v1 capture program completed (Calendar View + Custom Relationships Overlay shots). Trigger met 2026-04-28; the actual run shipped 2026-05-01 alongside Phase 4. Phase 3 has no firm trigger; it rides whichever future capture session covers the Statistics view for wiki use.

---

## Acceptance criteria

- [x] Phase 1: `buy-me-a-coffee.png` lives at `docs/assets/branding/`; `docs/images/buy-me-a-coffee.png` no longer exists; README renders correctly. (2026-05-01, commit `b7154df0`)
- [x] Phase 2: All seven legacy README captures retired; README points at modern `docs/images/cr-*.png` files for the curated grid + uses YouTube auto-thumb for the Demo full-tour thumbnail. (2026-05-01, commit `e7bc00a6`)
- [ ] Phase 3 (reduced — wiki-only): `cr-statistics-view.png` captured to `docs/images/` for wiki use.
- [x] Phase 4: Collapsed `docs/images/raw/` up to `docs/images/`; references updated in README, planning docs, and `.gitignore`. (2026-05-01)
- [ ] No remaining references to legacy filenames anywhere in the repo (audit via the same `git grep` pattern in the Reference audit section).

---

## Open questions

1. ~~**Person note shot framing.**~~ Resolved 2026-05-01 — Demo section's full-tour thumbnail now uses the YouTube auto-thumbnail, eliminating the need for a person-note still in the README. The wiki integration plan handles `cr-entity-profile-person.png` placement on its own terms.
2. ~~**Modern shot proportions in README context.**~~ Resolved 2026-05-01 — modern `raw/` shots render acceptably in GitHub's README table-cell layout. No proportion-related issues observed in the curation refresh.
3. ~~**Whether to re-frame `docs/images/` itself.**~~ Resolved 2026-05-01 — chose option (b), collapsed `raw/` up one level. The cost-of-rename argument cited in the original phrasing tipped in favor of doing it immediately after Phase 2 rather than later, since reference count grows with each new commit.

---

## Related work

- [website-content/media-plan.md](../website-content/media-plan.md) — canonical media plan including capture conventions and the Visualization static-shots queue (Calendar View, Statistics View, etc.) that Phase 3 will piggyback on.
- Commits `2de9eb9e` + `77ff5367` — the 2026-04-27 reframing of `docs/images/` from archival storage to project media library that motivated this plan.
