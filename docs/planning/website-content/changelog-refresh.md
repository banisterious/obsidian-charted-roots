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

## v0.22.x: Stability run before 1.0

Six releases across this cluster. Four same-day hotfixes (0.22.1 through 0.22.4) closed critical data-loss bugs surfaced by community testing. 0.22.5 finished out the cluster with three smaller fixes from a fictional-calendar investigation. Regression tests grew from 189 to 241 across the six releases.

### Cross-entity Collections ([#426](https://github.com/banisterious/obsidian-charted-roots/issues/426))

Collections defined on a place note are now visible in the Edit Person dropdown, the Control Center Collections tab, and the dockable Collections sidebar. Before 0.22.3 those surfaces only read from a person-focused aggregator, so a place-only Collection appeared to vanish. The aggregator was rewritten to merge person and place counts, and the UI shows membership badges like "5 people, 3 places" where the split matters.

### Step-parent persistence ([#429](https://github.com/banisterious/obsidian-charted-roots/issues/429))

Setting a step-father or step-mother in Edit Person now writes to the file. Before 0.22.4, three separate gaps in the edit path caused the save to silently drop the step-parent fields: the frontmatter loader never extracted them, the plumbing between loader and modal didn't carry them, and the writer had no branch to persist them. Each gap existed in a path where adoptive parents already worked correctly. The fix copies that pattern into all three places. Six new regression tests cover the load side.

### IDs-only relationship array recovery ([#415](https://github.com/banisterious/obsidian-charted-roots/issues/415))

Edit Person handles notes whose frontmatter carries `children_id` / `spouse_id` / `parents_id` arrays but no paired wikilink arrays. Before 0.22.2, those notes loaded as empty relationship blocks and saving wiped the IDs. The load path now falls back to the ID array when the wikilink array is missing. An empty `[]` still counts as an intentional clear, so the fallback doesn't kick in when the user actually meant "no relationships here." The writer restores both shapes on save. Orphan IDs that don't resolve to any person in the vault are preserved as-is.

### Data-quality validator understands fictional dates ([#433](https://github.com/banisterious/obsidian-charted-roots/issues/433))

Dates like `22 BBY` or `ABY 1042` stop getting flagged as non-standard for persons in a fictional-calendar universe. The validator used to accept only real-world formats (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`). It now consults the fictional date parser first, so anything that resolves through a registered era abbreviation is recognized.

### Map popup ages respect fictional calendars ([#434](https://github.com/banisterious/obsidian-charted-roots/issues/434))

Ages and durations in map waypoint popups now match the fictional calendar for universe-scoped entities. The code used to do plain numeric year subtraction, which falls apart for descending eras like BBY and fails outright on era boundaries like BBY-to-ABY. The popup now calls into the date service with the person's universe as context.

### Spouse format migration hardening ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423), [#420](https://github.com/banisterious/obsidian-charted-roots/issues/420), [#417](https://github.com/banisterious/obsidian-charted-roots/issues/417))

Three lingering issues from the 0.21 spouse-format migration are fixed. The phantom-deletion cascade that could fire during a migration no longer triggers. Cross-note indexed-spouse corruption on older notes is corrected on next load. Adoptive siblings render correctly in the relationships dynamic block.

**Full cluster:** [0.22.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.0) · [0.22.1](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.1) · [0.22.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.2) · [0.22.3](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.3) · [0.22.4](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.4) · [0.22.5](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.5)

---

## v0.21.x: Edit Person Round-Up

*[TODO — draft after 0.22.x shape is confirmed.]*

Theme: focused release centered on the Edit Person modal (relationships, step/adoptive parents, custom relationship handling).

Planned spotlights (5–7):
- Custom relationships round-tripping (symmetric inverse handling)
- Adoptive parent singletons in load/plumbing/write
- *[fill in from Release-History.md + CHANGELOG.md]*

---

## v0.20.x: World-building, sources, and narrative

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

## v0.19.2–v0.19.x: Transition

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
