# Person-Focused Map Journey

Planning document for the person-focused map journey feature.

**Status:** ✅ Phase 1-2 complete | Phase 3-4 planned

**Related:** [#295](https://github.com/banisterious/obsidian-charted-roots/issues/295)

**Mockup:** `docs/mockups/person-focused-map-journey.html`

---

## Overview

Enhance the map view with a person-focused journey mode that isolates a single person's geographic path, provides animated step-through playback, richer waypoint popups, and an optional family overlay.

---

## Existing infrastructure

The map already has most of the building blocks:

| Component | Location | What it does |
|-----------|----------|-------------|
| `MapDataService.buildJourneyPaths()` | `src/maps/map-data-service.ts` | Builds chronologically-ordered waypoints per person with deduplication |
| `MapController.renderJourneyPaths()` | `src/maps/map-controller.ts` | Renders dashed polylines with arrow decorations via Leaflet |
| `MapController.setLayerVisibility()` | `src/maps/map-controller.ts` | Toggles journey/migration path layers |
| Time slider animation | `src/maps/map-view.ts` | Year-by-year playback with `setInterval`, progress bar, speed selector |
| Person picker | `src/ui/person-picker.ts` | Searchable modal with family groups, sort, filter |
| `FamilyGraphService` | `src/core/family-graph.ts` | `spouseCrIds`, `childrenCrIds`, `fatherCrId`, `motherCrId` for family overlay |

---

## Entry points

### Person picker in toolbar
- Add a person picker dropdown to the map toolbar center section
- When a person is selected, enter "journey mode" — hide all other markers/paths, show only this person's events and journey path
- Clear button to exit journey mode and restore the full map view

### External entry points
- Context menu on person note: "Show journey on map"
- Entity Profile View: "Show on map" button
- Both open/focus the map view with that person pre-selected

---

## Design

### Journey mode behavior

When a person is selected:
1. Hide all markers and paths not belonging to this person
2. Show this person's event markers (birth, death, marriage, residence, etc.) as color-coded dots
3. Show journey path (dashed polyline with arrows) connecting events chronologically
4. Fit map bounds to the person's waypoints
5. Show playback controls at the bottom

When cleared:
- Restore the full map view with all visible layers

### Animated step-through

Playback controls (bottom center):
- **Previous / Next** buttons — jump to adjacent waypoint
- **Play / Pause** button — auto-advance through waypoints with a configurable delay
- **Progress bar** — shows current position in the journey
- **Waypoint label** — current event type and location
- **Step counter** — "3 / 7"
- **Speed selector** — 1x, 2x, 0.5x

On each step:
1. Pan and zoom the map to center on the current waypoint
2. Highlight the current waypoint marker (scale up, glow ring)
3. Dim previous waypoints, hide future waypoints (or show all dimmed)
4. Open the rich popup for the current waypoint

### Rich waypoint popups

In journey mode, waypoint popups show expanded context:

| Field | Source |
|-------|--------|
| Event type + title | Event note frontmatter |
| Date | Event date, formatted |
| Place | Place name with hierarchy |
| Age | Calculated from person birth date |
| Duration at location | Time between this event and the next |
| Event description | Event note description field |
| Source links | `sourced_*` or citation notes |

### Family journey overlay

Toggle (top-right): "Show family journeys"

When enabled:
- Show journey paths for immediate family (parents, spouse, children)
- Use dimmed/thinner lines to distinguish from the primary person
- Color-code by relationship type (e.g., blue for parents, pink for spouse)
- Clicking a family member's path switches focus to them

---

## Interaction with existing controls

| Control | In journey mode |
|---------|----------------|
| **Layers menu** | Still functional — toggles apply within the person's events |
| **Time slider** | Mutually exclusive with journey playback. Entering journey mode hides the time slider; exiting restores it |
| **Collection filter** | Applied before entering journey mode — only people in the filtered collection appear in the picker |
| **Year range filter** | Applied — waypoints outside the range are excluded |
| **Custom maps** | Journey mode works on custom maps if the person has events with pixel coordinates |

---

## Implementation phases

### Phase 1 — Person filter and isolation ✅

- ✅ Journey mode button (route icon) in map toolbar right section
- ✅ Person picker opens on click — select a person to enter journey mode
- ✅ Filters markers, migration paths, and journey paths to selected person only
- ✅ Fits map bounds to person's waypoints with padding
- ✅ Person indicator in toolbar center with name and clear button
- ✅ Clear button or re-click exits journey mode and restores full view
- ✅ Disables time slider when entering journey mode (mutually exclusive)
- ✅ Enables journeys layer automatically
- ✅ "Show journey on map" context menu item on person notes (main Charted Roots submenu)
- ✅ Public `enterJourneyModeForPerson()` method for external callers

### Phase 2 — Animated step-through ✅

- ✅ Playback controls bar (bottom center, floating over map)
- ✅ Previous / Play-Pause / Next buttons
- ✅ Progress bar with fill animation
- ✅ Waypoint label showing event type and place
- ✅ Step counter (e.g., "3 / 7")
- ✅ Speed selector cycling through 0.25x–2.5x
- ✅ Map pans and zooms (flyTo) to each waypoint with 1s animation
- ✅ Auto-play loops back to start when reaching end
- ✅ Playback cleanup on exit journey mode

### Phase 3 — Rich waypoint popups

- Expanded popup content: age, duration, description, sources
- Style updates for journey-mode popups
- Source links navigate to source notes

### Phase 4 — Family journey overlay

- Toggle control in journey mode
- Load and render family member journey paths
- Dimmed/thin styling with relationship color coding
- Click to switch focus to family member

---

## Risks and considerations

- **Performance:** Rendering multiple family journey paths alongside the primary person could be slow for large families. Consider lazy-loading family paths.
- **Mobile:** Playback controls need 44px touch targets. Consider a simplified mobile layout.
- **Custom maps:** Pixel coordinate journeys may not animate smoothly — may need to skip or simplify playback on custom maps.
- **Empty journeys:** People with only one geolocated event can't have a journey path. Show a notice rather than an empty playback UI.
