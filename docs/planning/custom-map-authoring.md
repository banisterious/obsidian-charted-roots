# Custom Map Authoring

Planning document for enhancing custom map creation and place management workflows.

- **Status:** Planning
- **GitHub Issue:** #TBD
- **Created:** 2025-12-28
- **Updated:** 2025-12-28

---

## Overview

The core problem: **Adding places to custom maps requires tedious manual coordinate entry.**

A worldbuilder scenario illustrates this:
> "I have a beautiful map of my fantasy world. I want to mark cities, dungeons, and points of interest. But to add each place, I have to open the map image in an external editor, find the pixel coordinates, manually type them into the place note's frontmatter, reload the map to check placement, and repeat until it's right. It takes 5 minutes per place."

The current workflow forces users into a tedious loop:
1. Open map image in external editor
2. Hover over desired location to find pixel coordinates
3. Create place note with those coordinates
4. Reload map to verify placement
5. Coordinates are wrong → repeat steps 2-4
6. ...repeat for every place

**Goal:** Enable intuitive place creation and positioning directly on the map.

---

## Phase 1: Click-to-Create Place

Allow users to click on a map location to create a new place with coordinates auto-populated.

### Core Feature: Click on Map → Create Place

When in edit mode, clicking empty map space:
1. Captures the coordinates at click location
2. Opens Create Place modal with coordinates pre-filled
3. User enters name and other details
4. New place appears on map immediately after creation

### Scope

1. **Edit mode toggle**
   - New "Edit places" toolbar button
   - Clear visual indicator when active
   - Prevents accidental creation during normal viewing

2. **Coordinate capture**
   - Geographic maps: Capture latitude/longitude
   - Pixel-based maps: Capture pixel_x/pixel_y
   - Round to appropriate precision

3. **Pre-filled Create Place modal**
   - Coordinates populated from click location
   - User provides: name (required), place_type, category
   - "Create" saves note and adds marker to map
   - Uses same directory as other places in this map/universe

### Design Decisions

1. **Requires explicit edit mode**
   - Rationale: Clicking map normally pans/zooms. Need clear separation.
   - Matches pattern from existing map image alignment editing
   - Consistent with Draggable Place Markers (Phase 2)

2. **Opens existing Create Place modal (not quick create)**
   - Rationale: Places have more required fields than inline person creation
   - Coordinates are the friction point, not the form itself
   - User may want to set category, place_type, parent_place immediately

3. **Works with both coordinate systems**
   - Geographic maps use lat/lng
   - Custom pixel maps use pixel_x/pixel_y
   - Map type determines which coordinates to populate

### UI Flow

```
Map View (Edit Mode Active)
  └── Click on empty map area
        └── Capture coordinates at click point
              └── Open CreatePlaceModal
                    ├── Coordinates pre-filled (read-only display)
                    ├── Name input (required)
                    ├── Place type dropdown
                    ├── Category dropdown
                    └── [Create] → saves note, marker appears on map
```

### Implementation Notes

- Add edit mode state to `MapController` or `MapView`
- Add click listener to map (not markers) when in edit mode
- Distinguish click-on-marker (show popup) from click-on-map (create place)
- Pass coordinates to `CreatePlaceModal` via new options
- Refresh map after place creation (or add marker dynamically)

---

## Phase 2: Draggable Place Markers

Allow repositioning places by dragging their markers, with automatic frontmatter updates.

> **Note:** This phase has detailed planning in [draggable-place-markers.md](./draggable-place-markers.md).

### Summary

- Markers become draggable when edit mode is active
- Drag-end updates place note frontmatter with new coordinates
- Toast notification with Undo option
- Works with both geographic and pixel coordinate systems

### Key Design Decisions (from existing doc)

1. **Edit mode required** — Prevents accidental moves
2. **Immediate frontmatter update** — Changes persist on drag-end
3. **Undo support** — Toast with 5-second undo window
4. **Coordinate system awareness** — Updates correct properties based on map type

---

## Phase 3: Place Coordinate Import

Import places from a coordinates file (CSV/JSON) with bulk creation.

> **Depends on:** Phase 1 and 2 provide single-place workflow; this adds bulk capability.

### Motivation

Worldbuilders often have existing location data:
- Spreadsheet of cities with coordinates
- Exported data from other mapping tools
- AI-generated location lists with positions

### Scope

1. **Import formats**
   - CSV: `name,x,y` or `name,latitude,longitude`
   - JSON: `[{name, coordinates: {x, y}}]`
   - Detect format automatically

2. **Import wizard**
   - Step 1: Select file or paste data
   - Step 2: Map columns to fields (name, x, y, type, category)
   - Step 3: Preview places on map before creation
   - Step 4: Create notes, show results

3. **Conflict handling**
   - Place with same name exists: Skip / Overwrite / Rename
   - Preview shows conflicts before creation

### Open Questions

1. Should import create place notes immediately or stage them for review?
2. How to handle places that fall outside map bounds?
3. Support for importing parent_place relationships?

---

## Phase 4: Map Configuration Wizard (Future)

Guided setup for custom pixel-based maps with coordinate system definition.

> **Standalone feature:** Helps users configure custom maps correctly from the start.

### Motivation

Custom maps require correct configuration to work properly:
- Image bounds (min/max x/y)
- Coordinate system (pixels, custom units)
- Optional: mapping to real-world coordinates

Currently users must figure this out manually.

### Concept

1. **Step 1:** Select map image
2. **Step 2:** Define coordinate system
   - Pure pixel (0,0 at top-left)
   - Custom bounds (user-defined min/max)
   - Geographic alignment (place two known points)
3. **Step 3:** Set map metadata
   - Name, universe association
   - Default place category for this map
4. **Step 4:** Create map configuration note

---

## Completed Enhancements

### Map View Tab ✅ (v0.6.2)

- Interactive map display in Control Center
- Layer toggles for places, events, people
- Support for both geographic and custom maps

### Place Picker Integration ✅ (v0.14.x)

- Place picker includes "Create new place" option
- Inline creation from person edit modal
- Places created with cr_id for reliable linking

### Custom Map Image Support ✅ (v0.9.x)

- Upload and configure custom map images
- Pixel-based coordinate system
- Image alignment editing

---

## Known Limitations to Address

### No Visual Feedback During Place Creation

Currently, creating a place via Create Place modal doesn't show where it will appear on the map until after creation. The click-to-create flow (Phase 1) solves this by starting from the map location.

### Coordinate Entry is Error-Prone

Users must manually type coordinates, with no validation that they fall within map bounds. Phase 1's click capture and Phase 2's drag-to-position both eliminate this friction.

### No Bulk Operations

Adding many places requires repeating the creation workflow for each. Phase 3 addresses this with import capability.

---

## Implementation Checklist

### Phase 1: Click-to-Create Place

#### Phase 1a: Edit Mode Infrastructure
- [ ] Add `isEditMode` state to `MapController` or `MapView`
- [ ] Add "Edit places" toolbar button with toggle behavior
- [ ] Add visual indicator when edit mode is active (banner or button highlight)
- [ ] Ensure edit mode state persists across map layer changes

#### Phase 1b: Click Handler
- [ ] Add click listener to map container (not markers)
- [ ] Detect if click is on marker vs empty space
- [ ] Capture coordinates from click event
- [ ] Convert to appropriate coordinate system (lat/lng vs pixel)

#### Phase 1c: CreatePlaceModal Enhancement
- [ ] Add `prefilledCoordinates` option to `CreatePlaceModal`
- [ ] Display coordinates as read-only info (not editable fields)
- [ ] Handle both geographic and pixel coordinate prefill
- [ ] Pass map's universe context for default values

#### Phase 1d: Map Refresh
- [ ] After place creation, refresh map to show new marker
- [ ] Or: dynamically add marker without full refresh
- [ ] Ensure new place is visible (pan to location if needed)

### Phase 2: Draggable Place Markers

See [draggable-place-markers.md](./draggable-place-markers.md) for detailed checklist.

### Phase 3: Place Coordinate Import

- [ ] Design import wizard UI
- [ ] Implement CSV parser with column mapping
- [ ] Implement JSON parser
- [ ] Add preview visualization on map
- [ ] Batch place note creation
- [ ] Conflict detection and resolution UI

---

## Related Documents

- [Draggable Place Markers](./draggable-place-markers.md) — Detailed Phase 2 planning
- [Geographic Features](../../wiki-content/Geographic-Features.md) — User documentation
- [Frontmatter Reference](../../wiki-content/Frontmatter-Reference.md) — Place property documentation
- [Create Place Modal](../../src/ui/create-place-modal.ts) — Current implementation
