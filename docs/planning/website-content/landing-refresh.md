# Landing Page Refresh — draft

**Target page:** `/_index.md` on chartedroots.com
**Status:** 📝 Stub — deferred to Phase 2 (coincides with 1.0 launch prep).
**Source material:** current live page, [CHANGELOG.md](../../../CHANGELOG.md), feature descriptions drafted in [features-refresh.md](features-refresh.md).

---

## Current live page structure (from defuddle pull)

1. Hero — seal + tagline + two CTAs (View on GitHub · Get Started)
2. "Why Charted Roots?" — positioning paragraph + 6 pillar tiles (Canvas Tree / Maps / GEDCOM·Gramps / Statistics·Reports / Evidence / World-building)
3. "Key Features" — 6 expanded descriptions of the pillars
4. "Getting Started" — install (BRAT / Manual / Source)
5. Support — Wiki, Issues, Discussions, Buy Me a Coffee, GitHub Sponsors

---

## What to change

**Keep:** overall structure works. Hero, pillar grid, install flow, support links — all still the right shape.

**Update:**

- **Tagline** — current "Genealogical family tree plugin for Obsidian" is accurate but sells the world-building track short. Consider something that explicitly bridges both audiences without listing every feature. Draft: *"Genealogy and world-building plugin for Obsidian — for family historians, researchers, and world-builders."* (Alt phrasings in open questions below.)
- **Positioning paragraph** under "Why Charted Roots?" — currently "professional-grade genealogical tool ... for genealogists, historians, writers, and world-builders." Fine as-is but can be tighter and more specific about what "professional-grade" actually means (source quality tracking, GPS workflow, full round-trip import/export, etc.).
- **Pillar tiles** — 6 is the right count. Current tiles: Canvas Tree / Interactive Maps / GEDCOM·Gramps / Statistics·Reports / Evidence Tracking / World Building. All still accurate; copy inside could be tightened. Consider whether "Evidence Tracking" should become "Sources & Evidence" to reflect the sources subsystem maturation.
- **"Key Features" section** — 6 descriptions. Worth reviewing each for currency (especially Family Chart and Evidence-tracking paragraphs) and ensuring they don't just restate the tiles above. Could be swapped for 4 longer "capability spotlights" if we want to surface new subsystems (Entity Profile Views, Book Builder, Universes).
- **Getting Started install flow** — currently leads with BRAT. **Flip to lead with Community Plugins directory once listing lands.** For now BRAT is correct; keep an eye on `project_community_plugins_status.md`.

**Probably don't change:** support section (already correct), overall layout, branding (already tier-1 deployed).

---

## Draft content

*[TODO — draft after features-refresh.md settles, since hero copy should echo feature depth. Target: Phase 2, ideally in the week before 1.0.]*

---

## Open questions

1. **Tagline phrasing** — current is accurate but single-audience-leaning. Alternatives:
   - *"Genealogy and world-building plugin for Obsidian"* (short, two-audience)
   - *"Family history and world-building in Obsidian"* (less technical, warmer)
   - *"Professional genealogy and worldbuilding for Obsidian"* (leans into the "professional-grade" framing)
   - *[other candidates]*
2. **Hero CTA wording** — current "View on GitHub" + "Get Started" is fine. Once Community Plugins lists, could become "Install from Obsidian" + "Read the docs" or similar.
3. **Pillar count** — six works visually. Do we want to expand to eight (to include Book Builder and Entity Profile Views) or consolidate? Probably six is still right; add new depth inside the "Key Features" section instead.
4. **1.0 banner / badge** — on launch day, worth adding a small "1.0 is here" banner or version badge above the hero? Removable once the launch dust settles.
