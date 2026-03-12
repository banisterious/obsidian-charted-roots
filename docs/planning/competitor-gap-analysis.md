# Competitor Gap Analysis

Date: 2026-03-12

Gap analysis based on feature comparison against Gramps, RootsMagic, FamilySearch, Ancestry, WikiTree, MyHeritage, Legacy Family Tree, Family Historian, and MacFamilyTree.

Features already present in Charted Roots (relationship calculator, duplicate detection/merge, data verification, fan chart, descendant views/reports, hourglass layout) were excluded.

---

## Roadmap entries

These introduce a new capability category for the plugin.

### Smart/dynamic lists (saved queries) — DEFERRED

Auto-updating filtered lists based on saved criteria, e.g., "all brick wall ancestors," "people born in Ireland with no death date," "people missing sources." Present in: Family Historian ("Named Lists"), Gramps (custom filter system).

- **Status:** Deferred
- **Builds on:** Could integrate with Obsidian Bases or Dataview
- **Scope:** Large (platform-level feature)
- **Reason deferred:** Obsidian Bases already cover ~80% of this use case natively — each Base supports multiple named views with formula-based filters that auto-update as data changes. The remaining gap is graph-aware queries (e.g., "ancestors of X with no parents," "people not connected to root") which require relationship traversal that Bases can't express. Those specific queries are better addressed as individual features (brick wall report, unconnected people finder) rather than a generic query engine.

### Static website generation — DEFERRED

Generate a navigable family history website from vault data with pages for individuals, families, sources, places, and media. Present in: Gramps ("Narrated Web Site"), RootsMagic, Family Historian.

- **Status:** Deferred
- **Builds on:** Report generators, entity data model
- **Scope:** Large
- **Reason deferred:** Obsidian Publish already covers the core use case (publishing markdown notes with wikilinks, backlinks, graph view, search, and media). The existing freeze-to-markdown feature on dynamic blocks bridges the main gap (code blocks don't render on Publish). The incremental value over Publish is narrow (auto-generated index pages, embedded tree images, no subscription) relative to the implementation cost. A lighter "Prepare vault for Publish" command (batch freeze, generate index notes, strip private data) would deliver more value with far less effort if sharing becomes a priority.

### Book/narrative compilation

Combine multiple reports (descendant register, family group sheets, timeline, sources) into a single formatted document with table of contents and index. Present in: RootsMagic ("Book Creator"), Gramps ("Book Report"), Legacy Family Tree.

- **Status:** Not started
- **Builds on:** Existing report generators, PDF export
- **Scope:** Large

---

## Feature request issues

These extend an existing capability with well-defined scope.

### Person-focused map journey (#295)

Enhance existing journey paths with person selection, animated step-through playback, and richer waypoint context. The core journey path infrastructure (dashed polylines connecting life events chronologically) already exists — this adds the ability to isolate and explore a single person's or family's geographic story. Present in: MacFamilyTree ("Virtual Globe"), Gramps (person events map with connecting lines).

- **Extends:** Map view journey paths, map data service
- **Scope:** Small-medium

### Historical context on timelines (#296)

Overlay historical events (wars, pandemics, migrations, local events) alongside a person's life events for context. Present in: Ancestry ("Historical Insights"), Legacy (chronology view).

- **Extends:** Timeline dynamic block
- **Scope:** Small-medium

### End-of-line / brick wall report (#297)

Identify the furthest-back ancestor on each branch with no parents defined. Useful for prioritizing research. Present in: Gramps ("End of Line Report").

- **Extends:** Report generators, family graph traversal
- **Scope:** Small

### Unconnected people finder (#298)

Identify person notes not linked to the main family network (no parent, child, or spouse relationships connecting them to the root). Present in: Gramps ("Find Unconnected People," "Not Related Tool").

- **Extends:** Data quality system, family graph analysis
- **Scope:** Small

### Calendar view (#299)

Monthly calendar showing birthdays, anniversaries, and death anniversaries for people in the vault. Present in: Gramps ("Calendar Report"), MacFamilyTree.

- **Extends:** Event service, date parsing
- **Scope:** Small-medium

### Kinship report (#300)

List all people related to a selected person with their relationship description and degree (e.g., "2nd cousin once removed"). Present in: Gramps ("Kinship Report"), RootsMagic.

- **Extends:** Relationship calculator
- **Scope:** Small

### Record superlatives (#301)

"Oldest person," "largest family," "most children," "longest marriage," etc. Present in: Gramps ("Records Report").

- **Extends:** Statistics dashboard
- **Scope:** Small
