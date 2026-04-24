# Changelog Page Refresh — draft

**Target page:** `/changelog/_index.md` on chartedroots.com
**Status:** 🔶 In progress — 0.22.x cluster fully drafted as shape sample; 0.20.x and 0.21.x pending approval of the shape.
**Source material:** [CHANGELOG.md](../../../CHANGELOG.md), [wiki-content/Release-History.md](../../../wiki-content/Release-History.md).

---

## Authoring notes

Goal of this refresh: close the ~4-month gap between the live page (ends at v0.19.1, January 2026) and the current state (v0.22.5, April 2026). That's roughly 25 releases covering the bulk of the world-building work, evidence tracking, and the 1.0 stability run.

Rather than a per-release bullet list, this draft uses **cluster spotlights** — one section per minor-version cluster (0.20.x, 0.21.x, 0.22.x), each with a theme paragraph + 5–7 headline features getting 2–3 sentences apiece. Full release lists link out to GitHub.

Shape is modeled loosely on the existing Release-History.md narrative but trimmed for an external-facing audience.

---

## Draft content

Everything below this line is intended as the website page body. Hugo frontmatter (`title`, `description`, `date`, etc.) is added during the port.

---

# Changelog

For the full per-release log, see [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases). This page groups headline changes by release cluster.

---

## v0.22.x — Stability and fictional-calendar groundwork

Six-release cluster focused on stability and polish in the run-up to 1.0. Four of the releases (0.22.1–0.22.4) were same-day hotfixes for critical data-loss bugs surfaced by community testing; 0.22.5 wrapped the cluster with three non-data-loss fixes from a fictional-calendar triage. The plugin's regression suite grew from 189 to 241 tests across the cluster.

### Cross-entity Collections ([#426](https://github.com/banisterious/obsidian-charted-roots/issues/426))

Collections created through the Create Place modal now surface everywhere, not just on the place side. Previously a Collection defined on a place note was invisible to the Edit Person dropdown, the Control Center Collections tab, and the dockable Collections sidebar — those surfaces read from a person-focused aggregator. A new cross-entity helper merges person-side and place-side counts and the three UI surfaces consume it uniformly, with contextual membership badges ("5 people", "3 places", "5 people, 3 places").

### Step-parent persistence ([#429](https://github.com/banisterious/obsidian-charted-roots/issues/429))

Setting a step-father or step-mother in Edit Person now actually writes to the file. A three-way gap in the edit path — the loader, the plumbing, and the writer each had a missing branch for step-parents — caused linked step-parents to be silently dropped on save despite a success notice. Fix mirrors the adjacent adoptive-parent pattern across all three places and adds six regression tests. Adoptive and step relationships now round-trip symmetrically through the Edit Person modal.

### IDs-only relationship array recovery ([#415](https://github.com/banisterious/obsidian-charted-roots/issues/415))

Edit Person correctly handles notes whose frontmatter carried `children_id` / `spouse_id` / `parents_id` arrays with no paired wikilink arrays. Previously these appeared as empty relationship blocks and saving wiped the IDs entirely. The load path now falls back to resolving IDs into display names when the wikilink array is genuinely absent (empty arrays are still respected as intentional clears), and the writer heals the frontmatter to the full dual-storage shape on save. Orphan IDs are preserved round-trip.

### Data-quality validator understands fictional dates ([#433](https://github.com/banisterious/obsidian-charted-roots/issues/433))

Dates like `22 BBY` or `ABY 1042` on persons in a fictional-calendar universe are no longer flagged as non-standard. The validator previously accepted only real-world numeric shapes (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`); it now consults the fictional date parser first, so anything that parses through a registered era abbreviation is treated as a recognized format.

### Map popup ages respect fictional calendars ([#434](https://github.com/banisterious/obsidian-charted-roots/issues/434))

The rich popup that appears for each waypoint on the person-journey map now produces correct ages and durations for fictional dates. Previously age-at-event was computed as a plain numeric subtraction of years, which silently produced wrong answers for eras that count down (BBY) or cross era boundaries (BBY → ABY). The popup now defers to the date service with the person's universe passed through.

### Spouse format migration hardening ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423), [#420](https://github.com/banisterious/obsidian-charted-roots/issues/420), [#417](https://github.com/banisterious/obsidian-charted-roots/issues/417))

Several sharp corners of the spouse frontmatter format migration smoothed over during the cluster. The phantom-deletion cascade that could fire during a migration no longer triggers; cross-note indexed-spouse corruption is fixed; adoptive siblings now render in the relationships dynamic block. Together these close the book on the 0.21.0 → 0.22.0 format transition.

**Full cluster:** [0.22.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.0) · [0.22.1](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.1) · [0.22.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.2) · [0.22.3](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.3) · [0.22.4](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.4) · [0.22.5](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.5)

---

## v0.21.x — Edit Person Round-Up

*[TODO — draft after 0.22.x shape is confirmed.]*

Theme: focused release centered on the Edit Person modal (relationships, step/adoptive parents, custom relationship handling).

Planned spotlights (5–7):
- Custom relationships round-tripping (symmetric inverse handling)
- Adoptive parent singletons in load/plumbing/write
- *[fill in from Release-History.md + CHANGELOG.md]*

---

## v0.20.x — World-building, sources, and narrative

*[TODO — draft after 0.22.x shape is confirmed.]*

Theme: the big feature-additions period. This cluster shipped the world-building toolkit (universes, fictional calendars, custom maps), the evidence/sources subsystem maturation, and the narrative-compilation track.

Planned spotlights (likely 7–8 given cluster size):
- Book & Narrative Compilation (v0.20.26)
- Calendar View (v0.20.47)
- Source Hierarchies + display (v0.20.46)
- Citation Integration + Metadata Support (v0.20.34 / v0.20.38)
- Universe Entity Dynamic Blocks + Universe Map Thumbnails (v0.20.56)
- Linked Map Drill-Down Navigation + Child Map Markers + Region Editing (v0.20.56)
- Person-Focused Map Journey (v0.20.45)
- Comprehensive GEDCOM Field Coverage (v0.20.33)
- v0.20.57 Feature Round-Up (summary release — aggregate small wins)

Open question: should 0.20.x be one section or split into sub-themes (world-building / sources / narrative)? Single section keeps it browsable; split makes themes clearer. Will decide when drafting.

---

## v0.19.2–v0.19.x — Transition

*[TODO — lightweight treatment, probably 3–4 spotlights max.]*

Theme: plugin rename (Canvas Roots → Charted Roots) in v0.19.0; subsequent releases polished the migration and shipped smaller improvements. Page currently stops at v0.19.1 so only 0.19.2 onward needs catch-up.

Planned spotlights:
- Plugin rename with automatic vault migration
- Web Clipper improvements
- *[fill in from CHANGELOG.md]*

---

## Open questions for this draft

1. **Scope bound** — do we catch up from 0.19.2 onward (matches where the live page stops), or go back further and re-do 0.19.x too? Current plan: forward from 0.19.2.
2. **Per-cluster vs per-release** — are cluster spotlights the right shape, or would per-release summaries be preferable? The 0.22.x section above is the shape sample; if that feels off, easy to flip.
3. **Release-tag links** — currently linking `/releases/tag/0.22.0` etc. Worth checking those URLs resolve correctly (release tags have no `v` prefix in the repo).
4. **Length budget** — any target? Current 0.22.x section is ~450 words. 0.20.x would likely be 800–1200 at the same density given the cluster size.
5. **Cross-links to features page** — worth linking changelog spotlights to their corresponding features-page section? E.g., "[Collections](/features/#collections)" from the #426 spotlight. Adds value but ties the two pages together more tightly.
