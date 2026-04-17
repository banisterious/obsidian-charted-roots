# Interactive Timeline View

Planning document for a dedicated, interactive timeline view showing events from the vault on a pan/zoom time axis.

**Status:** 📝 Draft

**Related:** [#384](https://github.com/banisterious/obsidian-charted-roots/issues/384)

---

## Overview

A dockable workspace view that plots events from the vault on a horizontal time axis the user can pan and zoom. Events are grouped into swimlanes (by person, place, universe, or flat), color-coded by event type, and clickable to open the associated note.

Today the plugin has **no interactive timeline** — only:

- `charted-roots-timeline` and `charted-roots-research-timeline` codeblocks (static renders inside notes)
- Control Center expandable timeline sections (person, family, place — chronological lists, not a time axis)
- Events tab table (filterable, not a timeline)
- Calendar view (month grid, not a time axis)

This is the dedicated interactive timeline surface that completes the gap.

---

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Surface type | **New dockable workspace view** (main tab, registered like the calendar view and map view) | Timeline needs full-tab real estate for pan/zoom to feel right; embedding in the Events tab would cramp both |
| Rendering engine | `vis-timeline` (BSD-2 license), imported as a runtime dependency | Solves pan/zoom, hit-testing, multi-scale date axis — genuinely hard problems. Already proven in Obsidian via other plugins. |
| Bundle impact | ~200KB added to a 15MB `main.js` (~1.3% increase) | Verified against current build; within budget |
| Library wrapper | Own thin wrapper; no chronos-timeline-md bundling | We don't need chronos's markdown DSL — our data comes from frontmatter. Direct vis-timeline usage avoids the round-trip and gives us control over the data adapter. |
| Initial data sources | Event notes (via `EventService`) + person birth/death from `PersonNode` | Matches existing calendar view pattern |
| Initial grouping | None (flat), with opt-in swimlane modes in a follow-up phase | Flat view works for everyone; grouping is a power-user feature |
| Default grouping in v2 | Flat; users opt into swimlane modes from a menu | Flat is always legible; large-tree users will actively reach for grouping. Matches map view's "one unified layer by default" pattern |
| Multi-participant events in swimlane view | Render once per participant swimlane (duplicate with shared identity) | Each swimlane reads as locally complete. Clicking any instance opens the same underlying note. |
| Date precision — events without exact dates | Rendered in a collapsible section beneath the axis (mirroring the calendar view's "day unknown" pattern) | Users keep access to the data; imprecise events don't clutter the axis |
| Edit/drag | Read-only in v1. No drag-to-edit | Editing events through a timeline is a significant feature class; defer |
| Codeblock variant (e.g. `charted-roots-interactive-timeline`) | Out of scope for v1 | View-first validates the interaction model before adding an authoring DSL |
| Conceptual model draws from | chronos-timeline-md (event / period / point / marker / swimlane / flag taxonomy) | Even without bundling chronos, its conceptual model is well-designed and applicable |

---

## Why vis-timeline, not chronos directly

`chronos-timeline-md` is a markdown-DSL layer over `vis-timeline`. Evaluated in [#TODO], we'd be paying for:

- A markdown parser we don't need (our data is structured, not markdown)
- A DSL users would have to learn if they wanted to author custom timelines
- A dependency chain we'd rather own

Going direct to vis-timeline means:

- Bundle size: ~200 KB (acceptable for a dedicated feature)
- License: BSD-2, compatible with the plugin's MIT license
- API stability: vis-timeline is mature, well-documented, actively maintained
- We still borrow chronos's **conceptual model** (events, periods, points, markers, swimlanes) without its code

---

## Data Sources

### Event notes (primary, via `EventService`)

- `EventNote.date`, `EventNote.dateEnd` — plotting coordinates
- `EventNote.datePrecision` — determines exact-date vs approximate treatment
- `EventNote.eventType` — color coding
- `EventNote.principalCrId`, `EventNote.participants` — for person grouping
- `EventNote.placeCrId` — for place grouping
- `EventNote.universe` — for universe grouping / filtering
- `EventNote.description` — tooltip content
- Access: `plugin.getEventService()` → `getAllEvents()`

### Person notes (secondary, via `FamilyGraphService`)

- `PersonNode.birthDate` / `PersonNode.deathDate` — plotted as birth/death events when person has no corresponding event notes (avoids double-plotting)
- **Lifespans as periods** (future phase): `birthDate`–`deathDate` as a background span under each person's swimlane
- Access: `plugin.createFamilyGraphService()` → `getAllPeople()`

### Date parsing (via `DateService`)

- `parseDate(dateStr)` → `{ year, type, isApproximate }`
- `getCanonicalYear(dateStr)` → numeric year
- Existing fictional-date-system support (Calendarium integration) should pass through unchanged, since vis-timeline accepts `Date` objects and we produce them via DateService

---

## Conceptual Model (borrowed from chronos)

| Concept | Definition | Plugin mapping |
|---------|------------|----------------|
| **Event** | A single-date or date-range occurrence | Any `EventNote` with `date` (and optional `dateEnd`) |
| **Period** | A background span representing ongoing state | Person lifespans (birth → death), organization active ranges (founding → dissolution); Phase 2+ |
| **Point** | A milestone marker at a specific instant | Same as Event with no `dateEnd` (no separate concept in v1) |
| **Marker** | A vertical axis line marking a notable date | "Today" marker; user-added reference dates (Phase 2+) |
| **Swimlane** | A horizontal group containing related events | Grouping by person / place / universe; Phase 2+ |
| **Flag** | View-level config | Initial zoom range, default view, ordering; handled via view state, not user-authored syntax |

---

## UI Design

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  [🔍] [Filters ▾] [Group ▾] [Fit] [Refresh]             [?]       │  ← Toolbar
├────────────────────────────────────────────────────────────────────┤
│  1800        1850         1900         1950         2000          │  ← Top axis (auto-scale)
│   │           │            │            │            │            │
│   │  ●══════════════════════●                                      │  ← Event (range)
│   │           ●                                                    │  ← Event (point)
│   │                     ●                ●                         │  ← More events
│   │                                                                │
│  1800        1850         1900         1950         2000          │  ← Bottom axis
├────────────────────────────────────────────────────────────────────┤
│  Selected: Margaret O'Brien — Birth, 1908-06-22                    │  ← Info bar
│  Dublin, Ireland · Astronaut · [Open note]                        │
└────────────────────────────────────────────────────────────────────┘
```

### Toolbar controls (v1)

- **Search** — quick filter by event title / participant / place (text match across visible events)
- **Filters menu** — event type (multi-select), universe, folder, date range (from/to)
- **Group menu** — flat / by person / by place / by universe (Phase 2; v1 ships flat only)
- **Fit** — reset zoom to show all events (vis-timeline `fit()`)
- **Refresh** — re-read vault and re-render (also auto-refreshes on metadata change)

### Event rendering

- **Point event** (single date): round dot with label
- **Range event** (date + dateEnd): horizontal bar with label
- **Color**: derived from `eventType` using the same palette as the Events tab and calendar view (consistency across surfaces)
- **Approximate dates**: rendered with a dashed border or reduced opacity

### Interaction

- **Pan**: click+drag horizontally
- **Zoom**: mouse wheel or pinch; zoom range from decades → single day, with axis ticks auto-scaling
- **Click an event**: highlights it, populates the info bar, shows "Open note" button
- **Double-click an event**: opens the event's note directly
- **Hover an event**: tooltip showing date, title, participants, place

### Info bar

Thin status bar at the bottom (not a full side panel — that's heavy). Shows:

- Event title, type, date (formatted via DateService)
- Principal person, place
- "Open note" button

(If we find users want richer details, a collapsible side panel is a natural Phase 2 addition — matches the family-chart info panel pattern.)

---

## Implementation Phases

### Phase 1 — MVP

Goal: dockable view, all events plotted flat on a time axis, click to open note.

- [ ] Register `VIEW_TYPE_INTERACTIVE_TIMELINE` in main.ts
- [ ] Add `vis-timeline` as a runtime dependency (confirm bundle size impact before committing)
- [ ] Build `src/timeline-view/interactive-timeline-view.ts` following the calendar view pattern
- [ ] Build `src/timeline-view/event-to-timeline-item.ts` adapter: `EventNote[]` → vis-timeline `DataSet<TimelineItem>`
- [ ] Handle date precision: exact → plotted; year-only → plotted at January 1 with visual marker; approximate → dashed border
- [ ] Click event → populate info bar; double-click → open note
- [ ] Toolbar: search box, fit button, refresh
- [ ] Command palette entry: "Open interactive timeline"
- [ ] Ribbon icon (optional; defer unless cheap)
- [ ] State persistence: current zoom range, last-selected event, search text

### Phase 2 — Grouping & Periods

- [ ] Group menu: flat / by person / by place / by universe
- [ ] Swimlane rendering (vis-timeline native `groups` feature)
- [ ] Person lifespans as background periods when grouped by person
- [ ] Organization active ranges as background periods when grouped by universe

### Phase 3 — Filters & Polish

- [ ] Filters menu: event type multi-select, universe, folder, date range
- [ ] "Today" axis marker (using vis-timeline's `customTime`)
- [ ] Empty state (no events in vault)
- [ ] Keyboard shortcuts: arrow keys pan, +/- zoom, Esc clear selection

### Phase 4 — Integration & Export

- [ ] Link from Events tab: "Open in timeline" button
- [ ] Link from person profile view: "Person timeline" button
- [ ] Export current view as image (PNG) and as markdown (reuse `timeline-markdown-exporter`)
- [ ] Save/load named views (saved filters + zoom range)

---

## Integration Points

### With existing services

- `EventService` — primary data source; subscribe to change events for auto-refresh
- `FamilyGraphService` — person data for grouping / lifespan periods
- `DateService` — all date parsing and formatting
- `FolderFilterService` — respect the user's vault scope
- Universe/collection filters — reuse existing filter logic where possible

### With existing color schemes

The Events tab and calendar view already color-code by event type. Timeline should use the same palette (from `src/events/event-type-icons.ts` or equivalent) for visual consistency.

### With Calendarium (fictional dates)

Fictional date systems are already supported in the calendar view and event timelines. vis-timeline accepts `Date` objects; for fictional calendars, we'd need to either:

- Convert to a canonical Gregorian date for rendering (loses precision but simple)
- Extend vis-timeline's axis rendering to accept custom calendar systems (significant work)

v1 likely takes the first approach; Calendarium integration improvement would be a follow-up.

---

## Testing Approach

- **Unit tests**: event-to-timeline-item adapter (date precision, color mapping, group key derivation)
- **Integration tests**: load a known vault → render view → assert expected items / groups exist
- **Manual / visual tests** (no automated coverage feasible):
  - Small vault (<10 events) — verify rendering
  - Large vault (1000+ events) — verify performance and auto-refresh
  - Mixed date precision — approximate vs exact
  - Missing dates — events without dates should be omitted or surfaced separately
  - Multi-universe vault — universe filter behavior
  - Fictional-calendar events — verify they render (even if mapped to canonical years)

---

## Open Questions

None outstanding at plan time — key design decisions are captured in the table above. Items to revisit as phases ship:

- **Fictional calendar support** — v1 converts fictional dates to canonical Gregorian for rendering. Full Calendarium integration (native non-Gregorian axes) is a future consideration if demand surfaces.
- **Performance at 5000+ events** — vis-timeline handles large datasets but may need virtualization tuning or a density filter. Revisit once real vaults stress-test it.
- **Right-click context menu on events** — not in v1 scope; evaluate based on user feedback after MVP ships.

---

## References

- [vis-timeline documentation](https://visjs.github.io/vis-timeline/docs/timeline/)
- [chronos-timeline-md](https://github.com/clairefro/chronos-timeline-md) — cloned at `external/chronos-timeline-md/` for conceptual reference
- Existing calendar view planning: [archive/calendar-view.md](archive/calendar-view.md) — similar view-type / data-sources pattern
- User-reported gap: discussion [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371) (timeline context arose from the worldbuilder use-case thread)
