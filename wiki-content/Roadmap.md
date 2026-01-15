# Roadmap

This document outlines planned features for Charted Roots. For completed features, see [Release History](Release-History). For version-specific changes, see the [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases).

---

## Table of Contents

- [Completed Features](#completed-features)
- [Planned Features](#planned-features)
  - [GPS Research Workflow Integration](#gps-research-workflow-integration) 📋 Medium
  - [Calendarium Integration](#calendarium-integration) 💡 Low
  - [Transcript Nodes & Oral History](#transcript-nodes--oral-history) 💡 Low
- [Future Considerations](#future-considerations)
  - [Research Tracking](#research-tracking)
  - [Dynasty Management](#dynasty-management)
  - [Universe Batch Operations](#universe-batch-operations)
  - [Import Wizard Filename Parser Enhancements](#import-wizard-filename-parser-enhancements)
  - [Accessibility](#accessibility)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)

---

## Completed Features

For the complete list of implemented features, see [Release History](Release-History).

| Version | Feature | Summary |
|:-------:|---------|---------|
| v0.19.11 | [Research Workflow Phase 1](Release-History#research-workflow-phase-1-v01911) | GPS-aligned research entity types with Statistics Dashboard integration |
| v0.19.9 | [DNA Match Tracking](Release-History#dna-match-tracking-v0199) | Opt-in DNA match tracking with person type, fields, bidirectional relationships, and person picker badge |
| v0.19.7 | [Name Components](Release-History#name-components-v0197) | Explicit surname properties for multi-surname cultures and maiden/married name tracking |
| v0.19.6 | [Per-Map Marker Assignment](Release-History#per-map-marker-assignment-v0196) | Restrict places to specific custom maps within a universe |
| v0.19.5 | [GEDCOM Notes Support](Release-History#gedcom-notes-support-v0195) | Import GEDCOM NOTE tags with optional separate note files |
| v0.19.5 | [Timeline Event Description Display](Release-History#timeline-event-description-display-v0195) | All event types show description when available (except birth/death) |
| v0.19.5 | [Romantic Relationship Label Preference](Release-History#romantic-relationship-label-preference-v0195) | UI preference to display "Spouse" or "Partner" terminology |
| v0.19.3 | [Place Category Folder Mapping](Release-History#place-category-folder-mapping-v0193) | Automatic organization of places into category-based subfolders |
| v0.19.2 | [Partial Date Support](Release-History#partial-date-support-v0192) | GEDCOM import preserves date precision (year-only, month+year, qualifiers, ranges) |
| v0.19.0 | [Plugin Rename](Release-History#plugin-rename-canvas-roots--charted-roots-v0190) | Renamed from Canvas Roots to Charted Roots with automatic vault migration |
| v0.18.32 | [Automatic Wikilink Resolution](Release-History#automatic-wikilink-resolution-v01832) | Resolve `[[Person Name]]` wikilinks to cr_id values in relationship fields |
| v0.18.28 | [MyHeritage GEDCOM Import Compatibility](Release-History#myheritage-gedcom-import-compatibility-v01828) | Auto-detect and fix MyHeritage GEDCOM exports (BOM, double-encoded entities, `<br>` tags) |

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

**Status:** ✅ Phase 1 complete | Phases 2-3 planned

**GitHub Issue:** [#145](https://github.com/banisterious/obsidian-charted-roots/issues/145) (consolidates #124, #125)

**Summary:** Enable genealogists to manage research workflow using GPS (Genealogical Proof Standard) methodology with support for research projects, reports, individual research notes, and research journals.

**The Problem:** Serious genealogists need to track research progress, document negative findings, maintain research logs, and synthesize analysis across sources. Current Charted Roots focuses on person/event/source entities but lacks structures for research workflow.

**The Solution:** Five GPS-aligned research entity types:
- **Research Project** — Hub for complex, multi-phase research cases
- **Research Report** — Living/working document analyzing specific questions
- **Individual Research Note (IRN)** — Synthesis between reports and person notes
- **Research Journal** — Optional daily/session tracking across projects
- **Research Log Entry** — Optional separate notes for queryable research logs

**Phased Approach:**

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Foundation: Entity Recognition & Statistics | ✅ Complete |
| 2 | Workflow Integration: Tagging & Auto-generation | After Phase 1 feedback |
| 3 | Advanced Features: Queries & Timeline Views | Future |

**Phase 1 — Foundation (Complete):**
- Entity type recognition for all five types via `cr_type` or tags
- Tag detection including `#irn` shorthand for Individual Research Notes
- Research entities counted in Statistics view with status breakdowns
- Properties: `status`, `private`, `up`, `related`, `reportTo`, `subject`
- Works with DataView and Bases for querying

See [Research Workflow](Research-Workflow) for usage documentation.

**Phase 2 — Workflow Integration (Future):**
- `needs_research` tagging on person/event/place notes
- IRN auto-generation with refresh capability
- Breadcrumb navigation showing hierarchy
- Research log entry form

**Phase 3 — Advanced Features (Future):**
- Negative findings surfacing across projects
- Research timeline views
- Cross-project queries
- Templates/Bases for research entities

**Key Features:**
- **Research logs with negative findings** — Document "searched X, found nothing" scenarios per Mills' methodology
- **Hierarchical organization** — Use `up`/`related` properties for flexible hierarchy (recognized but not enforced)
- **IRNs separate from person notes** — Analysis/synthesis vs structured facts (GPS methodology)
- **Integration with existing features** — Statistics dashboard, export privacy

**Documentation:**
- See [Research Workflow](Research-Workflow) for usage documentation
- See [Research Workflow Integration Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/research-workflow-integration.md) for detailed specifications
- Community contributors: @ANYroots (IRN structure, GPS methodology, templates), @wilbry (lightweight approach, unified design)

---

### Calendarium Integration

**Priority:** 💡 Low — Unified timeline experience for fictional worldbuilders

**Status:** ✅ Phase 1 complete (v0.12.0) | ✅ Phase 2 complete (v0.15.2) | Phases 3-4 planned

**Summary:** Integration with the [Calendarium](https://plugins.javalent.com/calendarium) plugin to share calendar definitions, eliminating duplicate configuration for worldbuilders. Designed to be invisible to users who don't need it—settings default to off, and no UI changes appear unless Calendarium is installed.

**User Feedback (December 2024):**
- Calendar definition is the main value—users want Calendarium for setting up calendar structure (dates, eras), not primarily for events
- Date ranges (`fc-date` + `fc-end`) are important for lifespans, reign periods, residences
- Pain points with Calendarium include era handling and per-calendar frontmatter fields
- Phase 1 (read-only calendar import) validated as the right starting point

**Integration Modes:**

| Mode | Description | Use Case |
|------|-------------|----------|
| Standalone | Charted Roots manages its own calendars | Users without Calendarium |
| Calendarium Primary | Charted Roots reads Calendarium calendars | Existing Calendarium users |
| Bidirectional | Full sync between both plugins | Power users wanting unified experience |

**Phased Approach:**
- ✅ **Phase 1 (v0.12.0):** Import calendar definitions from Calendarium—delivers ~80% of value
- ✅ **Phase 2 (v0.15.2):** Display Calendarium events on Charted Roots timelines; support date ranges (`fc-end`)
- **Phase 3:** Bidirectional sync between plugins
- **Phase 4:** Cross-calendar date translation

**Phase 1 Implementation (v0.12.0):**
- Detects Calendarium plugin installation
- Imports calendar definitions (names, eras, abbreviations, year directions)
- Displays imported calendars in Date Systems card and Create Event modal
- Graceful fallback when Calendarium not installed
- Integrations card hidden when Calendarium not installed

See [Fictional Date Systems - Calendarium Integration](Fictional-Date-Systems#calendarium-integration) for usage documentation.

**Data Mapping (Planned for Phase 3+):**

| Charted Roots Field | Calendarium Field |
|--------------------|-------------------|
| `fictional_date` | `fc-date` / `fc-start` |
| `fictional_date_end` | `fc-end` |
| `calendar_system` | `fc-calendar` |
| `event_category` | `fc-category` |
| `display_name` | `fc-display-name` |

**Settings:**
- `calendariumIntegration`: off / read-only (bidirectional planned for Phase 3)

**API Integration:** Uses `window.Calendarium` global when available, with graceful fallback when Calendarium is not installed.

**Future Consideration:** Per-calendar frontmatter fields (e.g., `mycalendar-date` instead of `fc-calendar` + `fc-date`) to allow one note to have dates across multiple calendars.

See [Calendarium Integration Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/calendarium-integration.md) for implementation details.

---

### Transcript Nodes & Oral History

**Priority:** 💡 Low — Specialized for oral history researchers

**Summary:** Time-stamped citations from audio/video with direct linking.

**Schema:**
```yaml
oral_facts:
  - media: "[[Interview with Grandma.mp3]]"
    timestamp: "1m30s"
    fact_type: birth_date
    quote: "I was born on May 15th, 1922"
```

**Features:**
- Deep links with timestamp: `[[Interview.mp3]]#t=1m30s`
- Range support: `#t=1m30s-2m15s`
- One-click playback from timestamp
- Transcript nodes with speech bubble styling on canvas

**Interview Subject Graph:**
- Map relationship structure of interviews
- Interview as central hub node
- Edge thickness indicates mention frequency

---

## Future Considerations

These features are under consideration but not yet prioritized.

---

### Research Tracking

**Summary:** Tools for tracking research progress toward GPS-compliant documentation.

**Already Implemented:**
- **Research level property** (v0.17.x) — 7-level scale (0-6) based on Hoitink's "Six Levels of Ancestral Profiles," with Edit Person modal, Research Gaps Report filtering/sorting, and Bases views
- **Confidence levels** — Source confidence (high/medium/low/unknown), proof confidence (proven/probable/possible/disproven)
- **Source documentation per fact** — `sourced_*` properties linking facts to sources, coverage percentages in reports
- **Proof summaries** — GPS-aligned proof summary notes with evidence tracking, conflict detection, and resolution

**Potential Future Additions:**
- Research to-do tracking (per-person or per-fact task lists)
- Research log notes (session-based research journals)

For DNA match tracking, see [DNA Match Tracking](#dna-match-tracking) in Planned Features.

See [Evidence and Sources](Evidence-And-Sources) for documentation on existing features.

### Dynasty Management

Tools for tracking succession and inheritance in worldbuilding:

- Line of succession calculator
- Title/position inheritance rules
- Regnal numbering
- Heir designation and succession events

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

## Known Limitations

See [known-limitations.md](known-limitations.md) for complete details.

**Key Limitations:**
- Single vault only (no multi-vault merging)
- No undo/redo for Bases edits (platform limitation)
- No bulk operations from Bases multi-select (platform limitation)
- Privacy obfuscation for canvas display requires generation-time application (runtime toggle not feasible due to Obsidian Canvas API limitations) — see [#95](https://github.com/banisterious/obsidian-charted-roots/issues/95)
- Interactive Canvas features limited by Obsidian Canvas API

### Context Menu Submenu Behavior

On desktop, submenus don't dismiss when hovering over a different submenu. This is a limitation of Obsidian's native `Menu` API. Potential solutions (flattening menus, modal dialogs, custom menu component) are under consideration based on user feedback.

---

## Contributing

We welcome feedback on feature priorities!

1. Check [existing issues](https://github.com/banisterious/obsidian-charted-roots/issues)
2. Open a new issue with `feature-request` label
3. Describe your use case and why the feature would be valuable

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

**Questions?** Open an issue on [GitHub](https://github.com/banisterious/obsidian-charted-roots/issues).
