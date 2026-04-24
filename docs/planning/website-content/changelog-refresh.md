# Changelog Page Refresh — draft

**Target page:** `/changelog/_index.md` on chartedroots.com
**Status:** 🔶 In progress — 0.22.x cluster fully drafted as shape sample; 0.20.x and 0.21.x pending approval of the shape.
**Source material:** [CHANGELOG.md](../../../CHANGELOG.md), [wiki-content/Release-History.md](../../../wiki-content/Release-History.md).

---

## Authoring notes

Goal of this refresh: close the ~4-month gap between the live page (ends at v0.19.1, January 2026) and the current state (v0.22.5, April 2026). That's roughly 25 releases covering the bulk of the world-building work, evidence tracking, and the 1.0 stability run.

Rather than a per-release bullet list, this draft uses **cluster spotlights**: one section per minor-version cluster (0.20.x, 0.21.x, 0.22.x), each with a theme paragraph + 5–7 headline features getting 2–3 sentences apiece. Full release lists link out to GitHub.

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

v0.21.0 was a focused stability release centered on the Edit Person modal. Four round-trip bugs were fixed and the testing infrastructure was formalized.

### Relationships preserved through partial ID and basename mismatches ([#410](https://github.com/banisterious/obsidian-charted-roots/issues/410))

Relationships were being dropped on edit when the wikilink array held items whose target notes had basenames differing from the `name` field, or when only IDs were present without the paired wikilinks. The fix extended the v0.20.62 resolver to also match on a note's basename and made the array-field fallback run per-entry instead of all-or-nothing. Unresolvable wikilinks are now preserved through the round trip rather than silently dropped.

### Clearing optional fields actually clears frontmatter ([#406](https://github.com/banisterious/obsidian-charted-roots/issues/406))

Eleven optional person fields didn't actually clear when emptied through the modal. Affected fields included universe, collection, personType, sex, givenName, maidenName, pronouns, and the four DNA-related properties. All now use the `?? ''` (or `?? []`) pattern so the writer's clear path fires correctly. A sibling fix landed for the nickname field's three-way gap ([#412](https://github.com/banisterious/obsidian-charted-roots/issues/412)) and for the endogamy flag's toggle-off value getting converted to undefined ([#413](https://github.com/banisterious/obsidian-charted-roots/issues/413)).

### Testing infrastructure

A Vitest test harness landed alongside the fixes, with 31 regression tests for the relationship load path. The project's public API was formalized in a new [VERSIONING.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/VERSIONING.md) file documenting plugin-specific SemVer rules and the criteria for 1.0.

**Full cluster:** [v0.21.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.21.0).

---

## v0.20.x: World-building, sources, and narrative

The 0.20.x cluster ran several months and landed the bulk of the worldbuilding toolkit, the sources-and-evidence subsystem, and the narrative-compilation track. The headline additions are below. The [GitHub releases](https://github.com/banisterious/obsidian-charted-roots/releases) page has the per-release detail.

### Entity Profile View ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251))

A dockable view that auto-syncs to the active note and displays all related data for any entity type (Person, Place, Event, Source, Organization) in collapsible sections. Replaces the tab-hopping that deep research used to require. Phase 1 shipped read-only in v0.20.18; later phases added inline editing on identity fields, lazy rendering of section content, keyboard navigation, and an embedded map preview for place profiles.

### Book and Narrative Compilation ([#294](https://github.com/banisterious/obsidian-charted-roots/issues/294))

A book builder that compiles generated reports, visual trees, and user-written vault notes into a single sequenced document. Output is PDF or ODT with a cover page, table of contents, and optional name index. Three preset templates (Family history book, Research compilation, Blank) derive chapter structure from the family graph. Book definitions save as `.book.json` files, so a book can be regenerated as the underlying vault data changes. Shipped in v0.20.26.

### Evidence and sources matured across the cluster

Mills-aligned source classification ([#276](https://github.com/banisterious/obsidian-charted-roots/issues/276), v0.20.17) added three optional axes drawn from Elizabeth Shown Mills' *Evidence Explained*: source type, information type, and evidence type. Citation metadata support ([#316](https://github.com/banisterious/obsidian-charted-roots/issues/316), v0.20.34) introduced citation as a first-class entity with page references and quality assessments, with full GEDCOM roundtrip. Citation integration ([#324](https://github.com/banisterious/obsidian-charted-roots/issues/324), v0.20.38) wired bidirectional sync between citation notes and `sourced_*` fields. Source hierarchies ([#337](https://github.com/banisterious/obsidian-charted-roots/issues/337), [#338](https://github.com/banisterious/obsidian-charted-roots/issues/338), v0.20.46) added `source_parent` and `source_parent_id` properties so multi-document record groups like probate packets, census pages, and multi-volume collections can be modeled as linked parent-child structures.

### Comprehensive GEDCOM field coverage ([#317](https://github.com/banisterious/obsidian-charted-roots/issues/317))

v0.20.33 closed most of the roundtrip fidelity gaps with full import and export support for 16+ additional GEDCOM 5.5.1 fields: name components (NPFX, NSFX, SPFX, NICK), person attributes (TITL, RELI, NATI, IDNO, PROP, CAST, NCHI, NMR, SSN), burial date and place, death cause, and age-at-event. FROM / TO date ranges now parse and export alongside the existing BET / AND format. Fixes on the export side eliminated duplicate BIRT / DEAT / BURI records and moved family events onto FAM records where they belong.

### Calendar View ([#299](https://github.com/banisterious/obsidian-charted-roots/issues/299))

v0.20.47 added a workspace view with a monthly calendar grid of significant dates across the vault: birthdays, death anniversaries, marriage dates, and other life events. Color-coded event dots per day, a text-label toggle for person names, a day detail panel with events and years-ago, filters by event type or living status. An "imprecise dates" section catches entries with a month but no day. Right-click a day cell to create an event pre-filled with that date.

### Map evolution

Three distinct map capabilities landed during the cluster. Person-focused map journey ([#295](https://github.com/banisterious/obsidian-charted-roots/issues/295), v0.20.45) isolated a single person's geographic path with animated step-through playback, rich waypoint popups, and a family-journey overlay color-coded by relationship. Child map markers with on-map region editing ([#362](https://github.com/banisterious/obsidian-charted-roots/issues/362), v0.20.56) put draggable markers on parent maps for every child map, with an inline overlay that saves `parent_region_x/y/w/h` back to frontmatter. Linked map drill-down navigation ([#361](https://github.com/banisterious/obsidian-charted-roots/issues/361), v0.20.56) added `linked_map` and `parent_map` properties for multi-scale worldbuilding, with breadcrumb navigation between maps.

### Universe tooling ([#359](https://github.com/banisterious/obsidian-charted-roots/issues/359), [#360](https://github.com/banisterious/obsidian-charted-roots/issues/360))

Universe notes picked up auto-generated content blocks in v0.20.56. `charted-roots-universe-people`, `-places`, `-events`, and `-organizations` render tables of every entity scoped to the current universe, with sorting and limits. A companion `charted-roots-universe-maps` block renders clickable thumbnail grids for every custom map belonging to the universe. All blocks refresh automatically when vault data changes.

### Feature round-up release (v0.20.57)

A consolidated release aggregating smaller enhancements from community feedback. Multiple person picker in the event modal ([#366](https://github.com/banisterious/obsidian-charted-roots/issues/366)), marriage data in the Family Group Sheet report ([#370](https://github.com/banisterious/obsidian-charted-roots/issues/370)), targeted schema validation against notes matching a specific schema ([#367](https://github.com/banisterious/obsidian-charted-roots/issues/367)), organization membership statistics ([#368](https://github.com/banisterious/obsidian-charted-roots/issues/368)), universe and collection fuzzy pickers in the Report Wizard ([#369](https://github.com/banisterious/obsidian-charted-roots/issues/369)), and Web Clipper discoverability info-boxes in Places, Sources, and People tabs ([#364](https://github.com/banisterious/obsidian-charted-roots/issues/364)).

**Full cluster:** 62 releases spanning [v0.20.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.20.0) through [v0.20.62](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.20.62).

---

## v0.19.2–v0.19.x: Transition

The 0.19.x cluster continued after the v0.19.0 rename from Canvas Roots. Headline additions from v0.19.2 onward:

### Research workflow foundations ([#145](https://github.com/banisterious/obsidian-charted-roots/issues/145))

v0.19.11 introduced five GPS-aligned research entity types: `research_project`, `research_report`, `individual_research_note`, `research_journal`, and `research_log_entry`. Each has its own status tracking: projects use open / in-progress / on-hold / completed, reports use draft / review / final / published. A new research section in the Statistics view surfaces entity counts and status breakdowns. Tag detection recognizes `#irn` shorthand for individual research notes. This subsystem was the scaffolding the 0.20.x sources and citations work built on top of.

### Organizations, roles, and inheritance (v0.19.16)

Three related capabilities shipped in v0.19.16. Organization Member Management added first-class membership modeling with roles and date ranges. Person Roles in Sources extended the same role-linking pattern to source notes, so informants, enumerators, clerks, and other source-side roles can be tracked as structured data. Inheritance & Succession Tracking added `inherited_from` and `successor` properties for title, estate, and office succession.

### DNA Match Tracking ([#126](https://github.com/banisterious/obsidian-charted-roots/issues/126))

v0.19.9 added opt-in DNA match tracking for genetic genealogists, off by default. When enabled, person notes can be flagged as a DNA Match and tracked with shared cM, testing company, kit ID, match type (BKM / BMM / confirmed / unconfirmed), endogamy flag, and notes. A `dna_match` relationship type handles bidirectional linking. Scope is intentionally narrow: track key matches, not full chromosome analysis. Tools like DNAPainter handle that better and this feature is designed to live alongside them.

**Full cluster:** [v0.19.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.19.2) through [v0.19.17](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.19.17).

---

## Open questions for this draft

1. **Scope bound** — do we catch up from 0.19.2 onward (matches where the live page stops), or go back further and re-do 0.19.x too? Current plan: forward from 0.19.2.
2. **Per-cluster vs per-release** — are cluster spotlights the right shape, or would per-release summaries be preferable? The 0.22.x section above is the shape sample; if that feels off, easy to flip.
3. **Release-tag links** — currently linking `/releases/tag/0.22.0` etc. Worth checking those URLs resolve correctly (release tags have no `v` prefix in the repo).
4. **Length budget** — any target? Current 0.22.x section is ~450 words. 0.20.x would likely be 800–1200 at the same density given the cluster size.
5. **Cross-links to features page** — worth linking changelog spotlights to their corresponding features-page section? E.g., "[Collections](/features/#collections)" from the #426 spotlight. Adds value but ties the two pages together more tightly.
