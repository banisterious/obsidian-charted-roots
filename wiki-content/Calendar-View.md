# Calendar View

The Calendar View shows a monthly calendar grid of significant dates across your vault — birthdays, death anniversaries, marriage dates, and other life events. Use it to see "what happened this month in my family's history."

---

## Table of Contents

- [Opening the Calendar](#opening-the-calendar)
- [Calendar Grid](#calendar-grid)
- [Navigation](#navigation)
- [Day Detail Panel](#day-detail-panel)
- [Imprecise Dates](#imprecise-dates)
- [Text Labels](#text-labels)
- [Filtering](#filtering)
- [Creating Events](#creating-events)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [State Persistence](#state-persistence)

---

## Opening the Calendar

There are several ways to open the Calendar View:

- **Command palette** — Press `Ctrl/Cmd + P` and search for **Charted Roots: Open calendar view**
- **Control Center dashboard** — Click the **Calendar** tile in the quick actions grid
- **Events tab** — In the Control Center Events tab, click the **Calendar** button in the Actions card
- **Person context menu** — Right-click a person note → **Charted Roots > Show on calendar** (navigates to the person's birth month and year)
- **Event context menu** — Right-click an event note → **Charted Roots > Show on calendar** (navigates to the event's date)

The calendar opens as a workspace tab, like the Map View or Statistics View.

## Calendar Grid

The calendar displays a standard 7-column month grid with:

- **Color-coded dots** on days that have events:
  - Blue — birth
  - Red — death
  - Yellow — marriage
  - Gray — other event types
- **Event count badge** when a day has more than 3 events
- **Today highlight** — the current date is highlighted with an accent background

## Navigation

The header provides flexible navigation:

- **Month dropdown** — select any month directly
- **Year input** — type any year (e.g., 1842) and press Enter to jump there
- **Previous/next arrows** — step one month at a time
- **Today button** — jump back to the current month and date

## Day Detail Panel

Click any day cell to see a detail panel below the grid showing all events on that day:

| Field | Description |
|-------|-------------|
| **Person name** | Clickable — opens the person or event note |
| **Event type** | Birth, death, marriage, etc. |
| **Year** | Year of the event, with approximate indicator if applicable |
| **Years ago** | How many years ago the event occurred |
| **Place** | Location, if available |

Click the same day again to deselect and hide the detail panel.

## Imprecise Dates

Many genealogical dates have only a month and year (e.g., "March 1842") without a specific day. These entries appear in a **"This month, day unknown"** section below the calendar grid, showing the same detail fields as the day panel.

Dates with only a year (no month) are omitted from the calendar entirely, as there is no meaningful placement.

## Text Labels

By default, events appear as small colored dots. Click the **tag icon** in the header to toggle **text labels**, which show the person's name next to each dot inside the day cell. Up to 3 labels are shown per cell, with a "+N more" indicator for additional events.

## Filtering

Click the **filter icon** in the header to open the filter menu:

### Event types

Toggle which event types appear in the calendar:

- Birth, death, marriage (shown by default)
- Residence, occupation, education, military, immigration, religious, baptism, burial

### Living status

- **All** — show everyone (default)
- **Living** — show only people without a death date
- **Deceased** — show only people with a death date

## Creating Events

Right-click any day cell to see **"Create event on [date]"**. This opens the Create Event modal with the date pre-filled.

## Keyboard Shortcuts

When the calendar is focused:

| Key | Action |
|-----|--------|
| **Left arrow** | Previous month |
| **Right arrow** | Next month |
| **T** | Jump to today |

## State Persistence

The calendar remembers your current month, year, filter settings, and label toggle across sessions. Navigate to any date and it will be restored when you reopen the calendar.

## Data Sources

The calendar draws from two sources:

- **Person notes** — `birthDate` and `deathDate` from person frontmatter (via FamilyGraphService)
- **Event notes** — marriage, baptism, immigration, and other event types (via EventService)

Birth and death dates from person notes take priority. Event notes for birth and death types are skipped to avoid duplicates.

## Related Pages

- [Events & Timelines](Events-And-Timelines) — Event notes and timeline visualization
- [Geographic Features](Geographic-Features) — Map-based visualization of the same data
- [Data Entry](Data-Entry) — Creating person notes with dates
