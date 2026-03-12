# Competitor Gap Analysis

Date: 2026-03-12

Gap analysis based on feature comparison against Gramps, RootsMagic, FamilySearch, Ancestry, WikiTree, MyHeritage, Legacy Family Tree, Family Historian, and MacFamilyTree.

Features already present in Charted Roots (relationship calculator, duplicate detection/merge, data verification, fan chart, descendant views/reports, hourglass layout) were excluded.

---

## Roadmap entries

These introduce a new capability category for the plugin.

### Migration path visualization

Show a person's movement through life on the map by connecting event locations chronologically. Animated or static line overlay on the existing Leaflet map. Present in: MacFamilyTree ("Virtual Globe"), Gramps (person events map with connecting lines).

- **Status:** Not started
- **Builds on:** Leaflet map view, event service, place coordinates
- **Scope:** Medium-large

### Smart/dynamic lists (saved queries)

Auto-updating filtered lists based on saved criteria, e.g., "all brick wall ancestors," "people born in Ireland with no death date," "people missing sources." Present in: Family Historian ("Named Lists"), Gramps (custom filter system).

- **Status:** Not started
- **Builds on:** Could integrate with Obsidian Bases or Dataview
- **Scope:** Large (platform-level feature)

### Static website generation

Generate a navigable family history website from vault data with pages for individuals, families, sources, places, and media. Present in: Gramps ("Narrated Web Site"), RootsMagic, Family Historian.

- **Status:** Not started
- **Builds on:** Report generators, entity data model
- **Scope:** Large

### Book/narrative compilation

Combine multiple reports (descendant register, family group sheets, timeline, sources) into a single formatted document with table of contents and index. Present in: RootsMagic ("Book Creator"), Gramps ("Book Report"), Legacy Family Tree.

- **Status:** Not started
- **Builds on:** Existing report generators, PDF export
- **Scope:** Large

---

## Feature request issues

These extend an existing capability with well-defined scope.

### Historical context on timelines

Overlay historical events (wars, pandemics, migrations, local events) alongside a person's life events for context. Present in: Ancestry ("Historical Insights"), Legacy (chronology view).

- **Extends:** Timeline dynamic block
- **Scope:** Small-medium

### End-of-line / brick wall report

Identify the furthest-back ancestor on each branch with no parents defined. Useful for prioritizing research. Present in: Gramps ("End of Line Report").

- **Extends:** Report generators, family graph traversal
- **Scope:** Small

### Unconnected people finder

Identify person notes not linked to the main family network (no parent, child, or spouse relationships connecting them to the root). Present in: Gramps ("Find Unconnected People," "Not Related Tool").

- **Extends:** Data quality system, family graph analysis
- **Scope:** Small

### Calendar view

Monthly calendar showing birthdays, anniversaries, and death anniversaries for people in the vault. Present in: Gramps ("Calendar Report"), MacFamilyTree.

- **Extends:** Event service, date parsing
- **Scope:** Small-medium

### Kinship report

List all people related to a selected person with their relationship description and degree (e.g., "2nd cousin once removed"). Present in: Gramps ("Kinship Report"), RootsMagic.

- **Extends:** Relationship calculator
- **Scope:** Small

### Record superlatives

"Oldest person," "largest family," "most children," "longest marriage," etc. Present in: Gramps ("Records Report").

- **Extends:** Statistics dashboard
- **Scope:** Small
