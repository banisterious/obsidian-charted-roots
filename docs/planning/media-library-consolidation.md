# Media Library Consolidation

**Status:** 🔶 In progress. **Phase 2 shipped 2026-05-01** via the README curation refresh (commit `e7bc00a6`) — seven legacy README captures retired, six replacements drawn from the modern `raw/` library. The curation pass also obviated three of the four Phase 3 re-captures (Control Center Dashboard, Control Center Maps, person-note Demo thumbnail) by dropping them from the README entirely. Phase 1 (buy-me-a-coffee relocation) and a reduced Phase 3 (Statistics — wiki-only) still pending.
**Authored:** 2026-04-27.
**Trigger:** Originally "after the website captures are all complete." Met 2026-04-28; first commit landed 2026-05-01.

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

| Legacy file | Disposition | Status |
|---|---|---|
| `buy-me-a-coffee.png` | Move to `docs/assets/branding/` | Phase 1 — pending |
| `charted-roots-family-chart-view.png` | Removed; README points at `cr-family-chart-live.png` | ✅ Done 2026-05-01 |
| `charted-roots-interactive-map-view.png` | Removed; README points at `cr-map-migration-paths.png` | ✅ Done 2026-05-01 |
| `family-tree-canvas.png` | Removed; README points at `cr-canvas-tree-multi-generational.png` | ✅ Done 2026-05-01 |
| `charted-roots-control-center-dashboard-tab.png` | Removed; dropped from README curation (Tier 3) — replaced by `cr-control-center-collections.png` slot | ✅ Done 2026-05-01 |
| `charted-roots-control-center-maps-tab.png` | Removed; dropped from README curation entirely (duplicated the geographic map cell) | ✅ Done 2026-05-01 |
| `charted-roots-person-note.png` | Removed; Demo section's full-tour thumbnail switched to YouTube auto-thumb | ✅ Done 2026-05-01 |
| `charted-roots-statistics-view.png` | Removed from README; future wiki use ([Statistics-And-Reports.md](../../wiki-content/Statistics-And-Reports.md)) still wants a fresh `cr-statistics-view.png` per [wiki-media-integration.md](wiki-media-integration.md) | Wiki-only — pending |

The Tier 3 curation pass collapsed three of the four originally-Phase-3 re-captures by dropping those features from the README entirely. The remaining Phase 3 work is a single capture for wiki use.

---

## Phases

### Phase 1 — Branding relocation

**Scope:** `buy-me-a-coffee.png` doesn't belong in `images/` at all. It's a sponsor badge, not a feature capture. The brand kit already lives under `docs/assets/branding/`; the badge belongs there too.

**Steps:**
1. `git mv docs/images/buy-me-a-coffee.png docs/assets/branding/buy-me-a-coffee.png`
2. Update `README.md` reference to the new path
3. Single commit: `chore: Relocate buy-me-a-coffee badge to docs/assets/branding/`

**Risk:** Negligible. One file, one reference.

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
| Statistics View | `cr-statistics-view.png` (single shot) | [wiki-content/Statistics-And-Reports.md](../../wiki-content/Statistics-And-Reports.md) per [wiki-media-integration.md](wiki-media-integration.md) |

**Approach:** Capture using the standard conventions (1920×1080, dark theme, Anderson fixture, etc. — see [website-content/media-plan.md](website-content/media-plan.md)). Land in `docs/images/raw/` with the modern filename. Use during the wiki-media-integration Phase 1 (visualization track).

No README change involved — this is purely future wiki work.

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
- [x] Phase 2: All seven legacy README captures retired; README points at modern `raw/` files for the curated grid + uses YouTube auto-thumb for the Demo full-tour thumbnail. (2026-05-01, commit `e7bc00a6`)
- [ ] Phase 3 (reduced — wiki-only): `cr-statistics-view.png` captured to `raw/` for wiki use.
- [ ] Phase 4 (post-Phase 3): structural decision documented — either `docs/images/raw/` retained or collapsed to `docs/images/`.
- [ ] No remaining references to legacy filenames anywhere in the repo (audit via the same `git grep` pattern in the Reference audit section).

---

## Open questions

1. ~~**Person note shot framing.**~~ Resolved 2026-05-01 — Demo section's full-tour thumbnail now uses the YouTube auto-thumbnail, eliminating the need for a person-note still in the README. The wiki integration plan handles `cr-entity-profile-person.png` placement on its own terms.
2. ~~**Modern shot proportions in README context.**~~ Resolved 2026-05-01 — modern `raw/` shots render acceptably in GitHub's README table-cell layout. No proportion-related issues observed in the curation refresh.
3. **Whether to re-frame `docs/images/` itself.** Option (b) of Phase 4 (collapsing `raw/` up one level) is structurally cleaner but requires coordinated reference updates across `wiki-content/`, internal docs, the website's `static/img/` layout, and any external links to GitHub raw URLs. The cost may exceed the benefit. Revisit when the file set is final.

---

## Related work

- [website-content/media-plan.md](website-content/media-plan.md) — canonical media plan including capture conventions and the Visualization static-shots queue (Calendar View, Statistics View, etc.) that Phase 3 will piggyback on.
- Commits `2de9eb9e` + `77ff5367` — the 2026-04-27 reframing of `docs/images/raw/` from archival storage to project media library that motivated this plan.
