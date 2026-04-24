# What's New in 1.0 — draft

**Target page:** `/1-0/_index.md` (new page) on chartedroots.com
**Status:** 📝 Stub — draft once 1.0 is imminent (stability window ends ~2026-05-14 at earliest).
**Source material:** 0.20.x / 0.21.x / 0.22.x cluster content from [changelog-refresh.md](changelog-refresh.md).

---

## Purpose

A dedicated landing surface for the 1.0 release. Goes live with the 1.0 tag, is linked prominently from the landing page banner and the GitHub release post, and stays up indefinitely as "what shipped in 1.0."

Audience: both existing users ("what's new since you last looked") and prospective users ("here's the shape of what you get when you install"). Should work as standalone reading without requiring them to click through to the changelog.

---

## Proposed structure

1. **Hero** — "Charted Roots 1.0 is here" — one-sentence stability / maturity statement, not a feature pitch.
2. **What 1.0 means** — short paragraph on VERSIONING.md policy: public API stability (`cr_*` schema, command IDs, settings keys, GEDCOM round-trip), the three-criteria gate that closed, 0.x → 1.0 as a reliability statement not a feature ceiling.
3. **Highlights since [prior baseline]** — 6–8 spotlight features drawn from the 0.20.x / 0.21.x / 0.22.x clusters, each 2–3 sentences. Cross-links to features page for depth.
4. **Migration notes** — any actions existing users should take (likely none; migrations are automatic).
5. **What's next** — brief forward-look (post-1.0 tracks: #339 source hierarchy, custom property definitions, interactive timeline view, etc.). Ties into the Roadmap if we have one.
6. **Install / upgrade** — BRAT users: just update. Community Plugins users: standard update. New users: see Getting Started.

---

## Open questions

1. **"Since when" baseline** — 1.0 catches up everything since the current live page (0.19.1) or since the actual 1.0 development arc started (~0.20.0)? Probably the latter — 1.0 is about the maturity arc, not the rename arc.
2. **Include stability window narrative?** — the "241 tests, 3-week BRAT window, four critical bugs fixed on the road to 1.0" story is compelling but may be too inside-baseball for a public landing. Probably drop or abbreviate.
3. **Community Plugins listing** — if listing lands before 1.0, mention it prominently here. If after, add a callout post-listing.
4. **Should this page stay up long-term or get rolled into the changelog?** — probably stays up as-is; 1.0 is a milestone worth preserving a dedicated page for.

---

## Draft content

*[TODO — draft in the week before 1.0 ships. Assemble from approved 0.20.x / 0.21.x / 0.22.x changelog spotlights, plus the "what 1.0 means" and "what's next" sections that are unique to this page.]*
