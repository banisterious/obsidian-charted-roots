# Roadmap

This document outlines planned features for Charted Roots. For completed features, see [Release History](Release-History). For version-specific changes, see the [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases).

---

## Table of Contents

- [Completed Features](#completed-features)
- [Planned Features](#planned-features)
  - [GPS Research Workflow Integration](#gps-research-workflow-integration) 📋 Medium ✅ Phase 3 mostly complete
  - [Calendarium Integration](#calendarium-integration) 💡 Low
- [Future Considerations](#future-considerations)
  - [Universe Batch Operations](#universe-batch-operations)
  - [Import Wizard Filename Parser Enhancements](#import-wizard-filename-parser-enhancements)
  - [Configurable Family Chart Card Dimensions](#configurable-family-chart-card-dimensions)
  - [Structural Filters for the Family Chart](#structural-filters-for-the-family-chart)
  - [Cross-Spouse Interleaved Child Sort](#cross-spouse-interleaved-child-sort)
  - [Time-Varying Relationships](#time-varying-relationships)
  - [Dated / Time-Varying Property Values](#dated--time-varying-property-values)
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

### Calendarium Integration

**Priority:** 💡 Low — Unified timeline experience for fictional worldbuilders

**Status:** ✅ Phase 1 complete (v0.12.0) | ✅ Phase 2 complete (v0.15.2) | Phases 3-4 planned

**Summary:** Integration with the [Calendarium](https://plugins.javalent.com/calendarium) plugin to share calendar definitions, eliminating duplicate configuration for worldbuilders. Designed to be invisible to users who don't need it—settings default to off, and no UI changes appear unless Calendarium is installed.

**Phased Approach:**
- ✅ **Phase 1 (v0.12.0):** Import calendar definitions from Calendarium—delivers ~80% of value
- ✅ **Phase 2 (v0.15.2):** Display Calendarium events on Charted Roots timelines; support date ranges (`fc-end`)
- **Phase 3:** Bidirectional sync between plugins
- **Phase 4:** Cross-calendar date translation

See [Fictional Date Systems - Calendarium Integration](Fictional-Date-Systems#calendarium-integration) for usage documentation and [Calendarium Integration Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/calendarium-integration.md) for implementation details.

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
