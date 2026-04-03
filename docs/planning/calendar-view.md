# Calendar View

Planning document for the calendar view feature.

**Status:** Planning

**Related:** [#299](https://github.com/banisterious/obsidian-charted-roots/issues/299)

---

## Overview

A workspace view showing a monthly calendar grid of significant dates across the vault — birthdays, death anniversaries, marriage dates, and other life events. Genealogists and family historians can see "what happened this month in my family's history" for commemoration or engagement with living relatives.

---

## Decisions

| Question | Decision |
|----------|----------|
| Implementation approach | Workspace view (main tab, not sidebar) |
| Date precision handling | Entries without a specific day shown in a separate list below the grid |
| Initial scope | Vital events (birth, death, marriage) by default; other event types opt-in via filter |

---

## Data Sources

### Person notes (via FamilyGraphService)

- `PersonNode.birthDate` — birth dates
- `PersonNode.deathDate` — death dates
- Access: `plugin.createFamilyGraphService()` → `getAllPeople()`

### Event notes (via EventService)

- `EventNote.date`, `EventNote.eventType`, `EventNote.datePrecision`
- Marriage, baptism, immigration, residence, occupation, etc.
- Access: `plugin.getEventService()` → `getAllEvents()`

### Date parsing (via DateService)

- `parseDate(dateStr)` → `{ year, type, isApproximate }`
- `formatDisplayDate(dateStr)` → prettified display ("c. 1878", "before 1950")
- `getCanonicalYear(dateStr)` → numeric year for age/anniversary calculations
- Supports GEDCOM qualifiers (ABT, BEF, AFT, BET...AND), partial dates, fictional calendars

---

## Date Precision Handling

Genealogical dates often lack day or month precision. The calendar handles this as follows:

| Precision | Example | Calendar placement |
|-----------|---------|-------------------|
| Exact (YYYY-MM-DD) | 1842-03-15 | Placed in day cell |
| Month (YYYY-MM) | 1842-03 | Listed in "This month, day unknown" section below grid |
| Year only (YYYY) | 1842 | Omitted from calendar (no meaningful placement) |
| Approximate (ABT, BEF, AFT) | ABT 1842-03-15 | Placed in day cell with approximate indicator |
| Range (BET...AND) | BET 1842 AND 1845 | Omitted from calendar |
| Unknown | — | Omitted |

---

## UI Design

### Layout

```
┌─────────────────────────────────────────────────────┐
│  ◀  March 2026  ▶          [Filters ▾]  [Refresh]  │  ← Header
├─────────────────────────────────────────────────────┤
│  Sun   Mon   Tue   Wed   Thu   Fri   Sat            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐        │
│  │   │ │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │        │
│  │   │ │   │ │🔵 │ │   │ │   │ │🔴 │ │   │        │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘        │
│  ...                                                │  ← Calendar grid
│                                                     │
├─────────────────────────────────────────────────────┤
│  This month, day unknown                            │  ← Imprecise dates
│  • John Smith — Born, March 1842 (184 years ago)    │
│  • Mary Jones — Died, March 1901 (125 years ago)    │
└─────────────────────────────────────────────────────┘
```

### Header

- **Month/year label** with previous/next navigation arrows
- **"Today" button** — jump to current month
- **Filters dropdown** — event types, collection, universe, living/deceased
- **Refresh button**

### Calendar Grid

- Standard 7-column month grid (Sunday or Monday start, respecting locale)
- **Today** cell highlighted
- **Day cells** show colored dots for event types:
  - 🔵 Blue — birth
  - 🔴 Red — death
  - 💛 Gold — marriage
  - ⚪ Gray — other events
- **Event count badge** when more than 3 events on a day
- **Click a day cell** to expand and show event details in a detail panel below the grid or in a popover

### Day Detail (expanded)

When a day is clicked:

| Field | Example |
|-------|---------|
| Person name | John Smith |
| Event type | Born |
| Date | 15 March 1842 |
| Years ago | 184 years ago |
| Age at event | — (birth) or calculated |
| Place | London, England |

- Person name is clickable → opens the person note
- Multiple events on the same day listed vertically

### Imprecise Dates Section

Below the grid, a collapsible section "This month, day unknown" lists entries that have month+year but no day. Each entry shows:
- Person name (clickable)
- Event type
- Date string
- Years ago

---

## Filtering

| Filter | Options | Default |
|--------|---------|---------|
| Event types | Birth, death, marriage, + all other event types | Birth, death, marriage |
| Collection | All / specific collection | All |
| Universe | All / specific universe | All |
| Status | All / living / deceased | All |

Filters persist across month navigation via view state (`getState()`/`setState()`).

---

## Existing Infrastructure to Reuse

| Component | Location | Usage |
|-----------|----------|-------|
| `FamilyGraphService` | `src/core/family-graph.ts` | `getAllPeople()` for birth/death dates |
| `EventService` | `src/events/services/event-service.ts` | `getAllEvents()` for event dates |
| `DateService` | `src/dates/services/date-service.ts` | `parseDate()`, `formatDisplayDate()`, `getCanonicalYear()` |
| `FolderFilterService` | `src/core/folder-filter.ts` | Collection filtering |
| View registration | `main.ts` `registerViews()` | Standard `registerView()` pattern |
| View activation | `src/plugin/activation.ts` | `activateView()` helper |
| Command registration | `src/plugin/commands.ts` | `open-calendar-view` command |
| CSS build | `build-css.js` `componentOrder` | Add `calendar-view.css` entry |

---

## File Structure

```
src/calendar/
├── calendar-view.ts           # ItemView — workspace view
├── calendar-data-service.ts   # Aggregates events from FamilyGraph + EventService
└── types/
    └── calendar-types.ts      # CalendarEvent, CalendarDay, CalendarFilter, etc.

styles/
└── calendar-view.css          # Calendar grid, day cells, detail panel
```

---

## Key Types

```typescript
interface CalendarEvent {
    id: string;
    personName: string;
    personCrId: string;
    eventType: string;           // 'birth' | 'death' | 'marriage' | etc.
    date: string;                // Raw date string
    month: number;               // 1-12
    day: number | null;          // null for imprecise dates
    year: number;
    yearsAgo: number;
    placeName?: string;
    isApproximate: boolean;
    source: 'person' | 'event';  // Whether from PersonNode or EventNote
}

interface CalendarFilter {
    eventTypes: string[];
    collection?: string;
    universe?: string;
    livingStatus: 'all' | 'living' | 'deceased';
}

interface CalendarViewState {
    month: number;               // 0-11
    year: number;
    filter: CalendarFilter;
    selectedDay: number | null;
}
```

---

## Implementation Phases

### Phase 1 — Core calendar grid

- View registration, activation, command
- `CalendarDataService` aggregating birth/death dates from `FamilyGraphService`
- Month grid rendering with day cells
- Event dots (birth = blue, death = red)
- Month navigation (prev/next, today button)
- Day click → detail panel showing events for that day
- Today highlight
- CSS component file

### Phase 2 — Event notes and filtering

- Integrate `EventService` for marriage, baptism, immigration, etc.
- Event type filter (checkboxes or dropdown)
- Collection and universe filter dropdowns
- Living/deceased filter
- Event type color coding (gold for marriage, gray for others)
- Imprecise dates section below grid

### Phase 3 — Polish and state

- View state persistence (selected month, filters)
- Auto-refresh on vault changes (debounced)
- Locale-aware week start (Sunday vs Monday)
- Event count badges for busy days
- Keyboard navigation (arrow keys for month nav)
- Empty state messaging

---

## Risks and Considerations

- **Performance:** Large vaults with thousands of people/events could make aggregation slow. Consider caching the aggregated data and only rebuilding on vault changes.
- **Fictional dates:** Fictional calendar systems (Middle-earth, Westeros) have different month/day structures. Phase 1 can skip fictional dates; Phase 2+ could integrate via `CalendariumBridge`.
- **Duplicate events:** A person's birth date exists both in `PersonNode.birthDate` and potentially as a birth `EventNote`. Deduplicate by preferring the event note (richer data) when both exist.
- **Date ambiguity:** "March 1842" could mean any day in March. The "day unknown" section handles this without guessing.
- **Week start:** Some locales start on Monday, others Sunday. Use `moment.localeData().firstDayOfWeek()` or Obsidian's locale if available.
