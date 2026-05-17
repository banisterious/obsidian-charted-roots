# Roadmap

This document outlines planned features for Charted Roots. For completed features, see [Release History](Release-History). For version-specific changes, see the [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases).

---

## Table of Contents

- [Completed Features](#completed-features)
- [Planned Features](#planned-features)
  - [GPS Research Workflow Integration](#gps-research-workflow-integration) 📋 Medium ✅ Phase 3 mostly complete
  - [Timelines and Calendars](#timelines-and-calendars) 📋 Medium
    - [Interactive Timeline View](#interactive-timeline-view) 📋 Medium 📝 Planning
    - [Calendarium Integration](#calendarium-integration) 💡 Low
    - [Single-Person Inline Life Events](#single-person-inline-life-events) 📋 Medium
- [Future Considerations](#future-considerations)
  - [Universe Batch Operations](#universe-batch-operations)
  - [Import Wizard Filename Parser Enhancements](#import-wizard-filename-parser-enhancements)
  - [Configurable Family Chart Card Dimensions](#configurable-family-chart-card-dimensions)
  - [Structural Filters for the Family Chart](#structural-filters-for-the-family-chart)
  - [Cross-Spouse Interleaved Child Sort](#cross-spouse-interleaved-child-sort)
  - [Time-Varying Relationships](#time-varying-relationships)
  - [Dated / Time-Varying Property Values](#dated--time-varying-property-values)
  - [Internationalization and Translation](#internationalization-and-translation)
  - [Accessibility](#accessibility)
- [Contributing](#contributing)

---

## Completed Features

For the complete list of implemented features, see [Release History](Release-History).

| Version | Feature | Summary |
|:-------:|---------|---------|
| v0.20.33 | [GEDCOM Field Coverage](Release-History#comprehensive-gedcom-field-coverage-v02033) | Full import/export for 16+ GEDCOM fields: name components, person attributes, burial, death cause, AGE, family events. [#316](https://github.com/banisterious/obsidian-charted-roots/issues/316) (citation metadata) still open |
| v0.20.26 | [Book & Narrative Compilation](Release-History#book--narrative-compilation-v02026) | Compile reports, visual trees, vault notes into single PDF/ODT documents with TOC, bibliography, name index |
| v0.20.25 | [Research Timeline](Dynamic-Note-Content#research-timeline-block) | `charted-roots-research-timeline` code block with table, heatmap, and timeline views with gap detection |
| v0.20.18 | [Entity Profile View](Release-History#entity-profile-view-v02018) | Auto-syncing sidebar with collapsible sections for all 5 entity types, inline editing, pin/unpin, breadcrumb navigation, state persistence |
| v0.20.17 | [Structured Role Lists](Release-History#structured-role-lists-for-organizations-v02017) | `roles` property on org notes with autocomplete picker, per-type defaults, and 3-level ordering fallback |
| v0.20.17 | [Mills-Aligned Source Classification](Release-History#mills-aligned-source-classification-v02017) | Three independent classification axes from *Evidence Explained*: source, information, and evidence classification |
| v0.20.3 | [Map View Marker Layering](Release-History#map-view-marker-layering-v0203) | Place markers now use hollow circles and render below event markers for visual distinction |
| v0.20.0 | [Control Center Modularization](Release-History#control-center-modularization) | 9 dockable sidebar views (People, Places, Events, Sources, Organizations, Relationships, Universes, Collections, Data Quality) with filter/sort/search, auto-refresh, and state persistence |
| v0.19.19 | [Inheritance & Succession Tracking](Release-History#inheritance--succession-tracking) | Track ownership changes, property transfers, and succession through event notes with dedicated UI |
| v0.19.18 | [Organization Member Management](Release-History#organization-member-management) | Manage organization memberships via context menu with multi-select person picker and inline editing |
| v0.19.17 | [Unified Place Lookup](Release-History#unified-place-lookup-v01917) | Query Wikidata, GeoNames, and Nominatim from a single interface to create place notes with coordinates and hierarchies |
| v0.19.16 | [Person Roles in Sources](Release-History#person-roles-in-sources-v01916) | Track roles (witness, informant, official, etc.) on source notes with modal UI, dynamic block, and Sources by Role report |
| v0.19.15 | [Event Type Icons](Release-History#event-type-icons-v01915) | Display Lucide icons for event types in timelines and map popups with configurable display modes |
| v0.19.14 | [Multi-Spouse Visual Cues](Release-History#multi-spouse-visual-cues-v01914) | Circled spouse numbers (①②③) on family chart edges clarify multi-spouse relationships |
| v0.19.13 | [GEDCOM Media Import](Release-History#gedcom-media-import-v01913) | Import media references (OBJE records) from GEDCOM files with path resolution and vault validation |
| v0.19.11 | [Research Workflow Phase 1](Release-History#research-workflow-phase-1-v01911) | GPS-aligned research entity types with Statistics Dashboard integration |

See [Release History](Release-History) for earlier releases.

---

## Planned Features

Features are prioritized to complete the data lifecycle: **import → enhance → export/share**.

| Priority | Label | Description |
|----------|-------|-------------|
| ⚡ High | Core workflow | Completes essential data portability |
| 📋 Medium | User value | Highly requested sharing/output features |
| 💡 Low | Specialized | Advanced use cases, niche workflows |

---

### GPS Research Workflow Integration

**Priority:** 📋 Medium — Supports GPS methodology for serious genealogists

**Status:** ✅ Phase 1 complete | ✅ Phase 2 Needs-Research Tagging complete | ✅ Phase 3 mostly complete (3/4 items shipped)

**GitHub Issue:** [#145](https://github.com/banisterious/obsidian-charted-roots/issues/145) (consolidates #124, #125)

**Summary:** Enable genealogists to manage research workflow using GPS (Genealogical Proof Standard) methodology with support for research projects, reports, individual research notes, and research journals.

**Phase 1 — Foundation (Complete):**

See [Research Workflow Phase 1 (v0.19.11)](Release-History#research-workflow-phase-1-v01911) for implementation details.

**Phase 2 — Workflow Integration:**

| Feature | Description | Status |
|---------|-------------|--------|
| Needs-research tagging | `needs_research` property on person/event/place notes with Data Quality integration | ✅ Complete |
| Research log entry form | Modal for adding structured log entries (date, source, result, notes) | Planned |
| IRN auto-generation | "Create Person with Research Note" command generates paired person + IRN files | Deferred |
| IRN refresh | "Refresh IRN from Sources" command updates auto-generated sections | Deferred |
| Breadcrumb navigation | Visual breadcrumb trail at top of research notes following `up` property chain | Deferred |

**Phase 3 — Advanced Features (Future):**

| Feature | Description | Status |
|---------|-------------|--------|
| Negative findings view | Query view surfacing all `result: negative` entries across projects | ✅ Complete (#287, v0.20.23) |
| Research timeline | Visual timeline of research activities with gap detection | ✅ Complete (#293, v0.20.25) |
| Cross-project queries | "Find related research" command and Profile View section | ✅ Complete (#303, v0.20.34) |
| Templates/Bases | Ready-to-use Bases templates for all research entity types | ✅ Complete (v0.20.16) |

**Export & Citations (Separate):**

Export features discussed in #145 are tracked separately:
- Footnote preservation in PDF/ODT exports
- Table formatting options
- Research Report export type

**Documentation:**
- [Research Workflow](Research-Workflow) — Usage documentation
- [Research Workflow Integration Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/research-workflow-integration.md) — Full specifications for Phases 2-3
- Community contributors: @ANYroots (IRN structure, GPS methodology), @wilbry (lightweight approach, unified design)

---

### Timelines and Calendars

Three related directions for how Charted Roots handles time — an interactive pan/zoom timeline view, integration with the Calendarium plugin for worldbuilders using fictional calendars, and an inline life-events family that lets users surface discrete per-person events on the timeline block without creating separate event notes. Each is scoped, prioritized, and staged independently; they're grouped here because they share the "rendering and handling time in the vault" theme.

---

#### Interactive Timeline View

**Priority:** 📋 Medium — Completes the timeline gap alongside the existing calendar view and static codeblock timelines

**Status:** 📝 Planning — see [Interactive Timeline View planning doc](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/interactive-timeline-view.md)

**GitHub Issue:** [#384](https://github.com/banisterious/obsidian-charted-roots/issues/384)

**Summary:** A new dockable workspace view that plots vault events on a horizontal time axis the user can pan and zoom. Events are color-coded by type, clickable to open their note, and groupable into swimlanes (by person, place, or universe) for worldbuilding and multi-generation genealogy. Fills the "pan/zoom interactive timeline" gap — today the plugin has a calendar view (monthly grid) and static codeblock timelines, but no axis-based interactive surface.

**Design approach:**
- Built on [vis-timeline](https://visjs.github.io/vis-timeline/) (~200KB, BSD-2 license). Handles pan/zoom, multi-scale date axis rendering, and hit-testing — genuinely hard problems we don't need to re-solve.
- Conceptual model borrowed from [chronos-timeline-md](https://github.com/clairefro/chronos-timeline-md) (events / periods / points / markers / swimlanes), but the chronos library itself is not bundled — we write our own adapter from the plugin's `EventNote` data directly to vis-timeline, skipping the markdown DSL round-trip.

**Phased delivery:**

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 — MVP | Dockable view, flat axis with all events plotted, click to open note, toolbar with search/fit/refresh, date-precision handling (approximate / year-only / undated) | Planned |
| Phase 2 — Grouping & Periods | Swimlane modes (flat / by person / by place / by universe); person lifespans and organization active ranges as background periods | Planned |
| Phase 3 — Filters & Polish | Event type / universe / folder / date-range filters; "today" axis marker; keyboard shortcuts; empty states | Planned |
| Phase 4 — Integration & Export | "Open in timeline" links from Events tab and profile view; PNG / markdown export; saved view presets | Planned |

**Out of scope (v1):** Drag-to-edit, a `charted-roots-interactive-timeline` codeblock, native fictional-calendar axis rendering (Calendarium mapping is a separate future consideration). See the [planning doc](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/interactive-timeline-view.md) for the full decisions table.

---

#### Calendarium Integration

**Priority:** 💡 Low — Unified timeline experience for fictional worldbuilders

**Status:** ✅ Phase 1 complete (v0.12.0) | ✅ Phase 2 complete (v0.15.2) | Phases 3-4 planned — [soliciting input from users of both plugins](https://github.com/banisterious/obsidian-charted-roots/discussions/385)

**Summary:** Integration with the [Calendarium](https://plugins.javalent.com/calendarium) plugin to share calendar definitions, eliminating duplicate configuration for worldbuilders. Designed to be invisible to users who don't need it—settings default to off, and no UI changes appear unless Calendarium is installed.

**Phased Approach:**
- ✅ **Phase 1 (v0.12.0):** Import calendar definitions from Calendarium—delivers ~80% of value
- ✅ **Phase 2 (v0.15.2):** Display Calendarium events on Charted Roots timelines; support date ranges (`fc-end`)
- **Phase 3:** Bidirectional sync between plugins
- **Phase 4:** Cross-calendar date translation

See [Fictional Date Systems - Calendarium Integration](Fictional-Date-Systems#calendarium-integration) for usage documentation and [Calendarium Integration Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/calendarium-integration.md) for implementation details.

---

#### Single-Person Inline Life Events

**Priority:** 📋 Medium — Reduces event-note overhead for discrete, single-person life moments

**Status:** 📝 In scoping — see tracking issue [#409](https://github.com/banisterious/obsidian-charted-roots/issues/409) for the candidate list; each ships as its own small FR when prioritized.

**Summary:** Render discrete single-person life events directly on the `charted-roots-timeline` block, derived from frontmatter fields on the person note — without requiring a separate event note. Extends the existing inline pattern (birth, death, adoption, marriage, divorce) to a broader set of one-person-one-date-one-place moments.

**Motivation:** Surfaced in [discussion #385](https://github.com/banisterious/obsidian-charted-roots/discussions/385). @doctorwodka noted that creating separate event notes for every discrete life moment (burial, knighting, transformation, etc.) bloats vault size without adding analytic value — the event is captured fine as a frontmatter date, but today only a handful of events actually *render* on the timeline. The goal is parity between "field recognized in frontmatter" and "field surfaces on the timeline" for single-person events.

**Candidates being tracked:**

- **Burial** — existing `burial_date` / `burial_place` fields, already parsed. Implementation-ready: [#408](https://github.com/banisterious/obsidian-charted-roots/issues/408).
- **Transformation / turning** — new field set. High-signal for worldbuilders modeling undead, lycanthropy, or ascension (separate from `died`, which many users reserve for permanent destruction).
- **Coming of age / initiation, knighting / ennoblement, oath-taking, ordination / consecration, exile / banishment** — worldbuilder-oriented events with clear "one person, one date, one place" shape. Each requires a schema decision (field naming, whether a place field pairs with the date) that gets made at sub-FR time rather than upfront.

**Shipping approach:** Incremental per event. Each candidate graduates from the tracking FR's checkbox list to its own small FR when prioritized, following the pattern established by adoption ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396)), marriage/divorce ([#399](https://github.com/banisterious/obsidian-charted-roots/issues/399)), and burial ([#408](https://github.com/banisterious/obsidian-charted-roots/issues/408)). No "big bang" release — the feature accrues one event at a time, driven by community-feedback priority.

**Out of scope for now:** User-defined custom single-person event types — @doctorwodka floated the idea during #385, but the overlap with existing event notes needs more community input before designing. Left as a discussion topic, to revisit if demand materializes.

---

## Future Considerations

These features are under consideration but not yet prioritized.

---

### Universe Batch Operations

Bulk operations for managing entities across universes:

- Move entities between universes
- Bulk universe assignment to existing entities
- Universe merge/split tools

### Import Wizard Filename Parser Enhancements

Extend the Bulk Source Image Import wizard's filename parser to recognize additional naming conventions used by genealogists:

**Enumeration District / Page patterns:**
- `YYYY-recordType_State_County_Locality-ED-p` (e.g., `1880-census_SC_Chester_Baton-Rouge-ED37-p60`)
- Support for slave schedules: `1850-slave-schedule_VA_Henrico-ED12-p3`

This pattern is already documented as a [recommended naming convention](Evidence-And-Sources#page-level-naming-for-multi-page-records) but not yet recognized by the automatic parser. Benefits include:
- Linking multiple families to the same enumeration page
- Supporting FAN (Friends, Associates, Neighbors) research workflows
- Better handling of enslaved ancestor research where context matters

**Note:** Charted Roots intentionally avoids dictating naming conventions—this would be an opt-in enhancement for users who follow the ED/page pattern.

### Configurable Family Chart Card Dimensions

Independent width/height controls for family chart in-tree cards, beyond the current four built-in styles (rectangle/circle/compact/mini). Useful for very wide or very vertical trees where the default sizing trades off poorly.

**Note:** Reassess after [#373](https://github.com/banisterious/obsidian-charted-roots/issues/373) (couple node spacing to card width) ships — that fix may remove the underlying pain and obviate the need for separate dimension settings.

**Source:** Discussion [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371).

### Structural Filters for the Family Chart

Filter or highlight family chart nodes based on structural/relational criteria rather than just property values. Examples:

- Nth child of a family (e.g. "all second sons")
- Mth-generation descendants of a selected person
- People within N degrees of a selected person
- People linked by a specific relationship type to a selected person

Deliberately avoids building a general graph-query engine. Better scoped as a small set of predefined structural filters covering common worldbuilding and genealogy use cases.

**Related:** Builds on [#379](https://github.com/banisterious/obsidian-charted-roots/issues/379) (property-value highlight).

**Source:** Discussion [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371).

### Cross-Spouse Interleaved Child Sort

When a person has multiple spouses, sort children strictly by birth date across all mothers, rather than the current per-mother grouping. Accepts overlapping parent-child lines as a tradeoff.

**Considerations:**

- Requires changes to the family-chart layout engine.
- May reduce readability for users outside the original author — line crossings are precisely why per-mother grouping is the dominant family tree convention.
- Worth confirming this is a hard requirement rather than a preference before committing to the design effort.

**Source:** Discussion [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371) (polygamous family modeling).

### Time-Varying Relationships

Relationships with effective date ranges that can flip over time — e.g. friendship transitioning to rivalry on a specific date. Evaluated against a selected "as-of" date from [#376](https://github.com/banisterious/obsidian-charted-roots/issues/376).

Partial substrate already exists: custom relationships carry `from`/`to` fields. This work extends that pattern so the relationship evaluation engine can resolve a person's active relationship set for any given date.

**Source:** Discussion [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371).

### Dated / Time-Varying Property Values

Property values that change over time (e.g. rank = A in 1650, B in 1680). Requires a new data model for dated property values, UI for entering timeline entries on a property, and rendering logic that resolves values against a selected "as-of" date.

The most transformative feature for worldbuilding use cases, and the largest data-model change on the roadmap. Not viable until [#377](https://github.com/banisterious/obsidian-charted-roots/issues/377) (custom property definitions) lands.

**Source:** Discussion [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371).

### Internationalization and Translation

UI string translation, locale detection, and a workflow for translation contributors. Charted Roots currently ships English-only.

**Considerations:**

- Multi-month infrastructure work; touches every UI surface in the plugin.
- Ongoing maintenance: every new string requires translation for each supported locale.
- Post-1.0 work. Starting before 1.0 ships would compound rework as strings continue to change against a moving UI surface.
- First language is likely Simplified Chinese (zh-CN); contributor offer already in hand.

**Source:** Discussion [#594](https://github.com/banisterious/obsidian-charted-roots/discussions/594) (Roadmap: Internationalization and translation contributions), originally requested in [#589](https://github.com/banisterious/obsidian-charted-roots/issues/589).

### Accessibility

**Summary:** Improve usability for users with visual, motor, or cognitive disabilities.

**Already Implemented:**
- **ARIA labels** — Interactive buttons, tiles, and controls include `aria-label` attributes for screen readers
- **Keyboard navigation** — Cleanup Wizard supports arrow keys, Enter/Space activation, and Escape to close (v0.18.11)
- **Focus indicators** — Standard Obsidian focus styles on interactive elements

**Planned Improvements:**
- **Systematic ARIA coverage** — Audit all modals and UI components for missing labels
- **Focus management** — Trap focus in modals, restore focus on close
- **Skip-to-content links** — Allow keyboard users to bypass navigation in Control Center
- **Reduced motion** — Respect `prefers-reduced-motion` for animations
- **Color-independent indicators** — Add icons/patterns alongside color for status (not just red/green)
- **High contrast mode** — Test and adjust colors for high contrast themes

**Testing Approach:**
- Screen reader testing with NVDA (Windows) and VoiceOver (macOS)
- Keyboard-only navigation testing
- Automated accessibility linting where feasible

---

## Contributing

We welcome feedback on feature priorities!

1. Check [existing issues](https://github.com/banisterious/obsidian-charted-roots/issues)
2. Open a new issue with `feature-request` label
3. Describe your use case and why the feature would be valuable

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

**Questions?** Open an issue on [GitHub](https://github.com/banisterious/obsidian-charted-roots/issues).
