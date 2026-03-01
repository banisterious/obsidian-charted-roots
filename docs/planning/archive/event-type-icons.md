# Event Type Icons for Visual Views

**GitHub Issue:** [#184](https://github.com/banisterious/obsidian-charted-roots/issues/184)

**Status:** Phase 1 Complete

---

## Problem Statement

Visual representations like timelines, canvas trees, and maps use text labels for event types, which can add clutter and reduce the visual cohesiveness of the display.

---

## User Feedback

From @wilbry:

> Visually focused representation of information, such a timelines, charts, etc could benefit from adopting a standard set of icons for event types to allow for a more uniform and cohesive visual style while potentially reducing clutter of text.

**Key considerations raised:**
- What do we do for custom events?
- What about future events without obvious icons (e.g., generic religious rites)?

---

## Current State

Event types already have icons defined in `src/events/types/event-types.ts`:

| Event Type | Icon | Category |
|------------|------|----------|
| birth | `baby` | vital |
| death | `skull` | vital |
| marriage | `heart` | vital |
| divorce | `heart-off` | vital |
| residence | `home` | life |
| occupation | `hammer` | life |
| military | `shield` | life |
| immigration | `ship` | life |
| education | `graduation-cap` | life |
| burial | `map-pin` | life |
| baptism | `droplets` | life |
| confirmation | `church` | life |
| ordination | `book-open` | life |
| anecdote | `mic` | narrative |
| lore_event | `scroll` | narrative |
| plot_point | `bookmark` | narrative |
| flashback | `history` | narrative |
| foreshadowing | `eye` | narrative |
| backstory | `history` | narrative |
| climax | `zap` | narrative |
| resolution | `check` | narrative |

Icons are Lucide icons, already available via `src/ui/lucide-icons.ts`.

**Custom event types** can also have icons assigned via the Event Type Editor modal.

---

## Proposed Solution

Add an option to display icons instead of (or alongside) text labels for event types in visual views.

### Phase 1 Scope

**Views to update:**
1. **Timelines** (person, family, place timelines via dynamic content)
2. **Canvas trees** (event nodes on generated canvases)
3. **Maps** (event markers on interactive map view)

**Dynamic blocks in scope:**
- `canvas-roots-timeline` — Person timeline
- `canvas-roots-family-timeline` — Family timeline
- `canvas-roots-place-timeline` — Place timeline
- `canvas-roots-events` — Events list/table

**Out of scope for Phase 1:**
- `canvas-roots-media` — Media gallery (no event types)
- `canvas-roots-facts` — Facts display (no event types)

### Display Modes

| Mode | Description |
|------|-------------|
| `text` | Current behavior: text labels only (default) |
| `icon` | Icons only, with text in tooltip |
| `both` | Icon + text label |

### Settings

Add per-view toggle or global setting:

```typescript
interface EventIconSettings {
  // Global default
  eventIconMode: 'text' | 'icon' | 'both';

  // Per-view overrides (optional)
  timelineIconMode?: 'text' | 'icon' | 'both';
  canvasIconMode?: 'text' | 'icon' | 'both';
  mapIconMode?: 'text' | 'icon' | 'both';
}
```

**Recommendation:** Start with a single global setting. Add per-view overrides only if users request them.

---

## Implementation Plan

### Phase 1: Core Icon Rendering

1. **Create icon rendering utility**
   - Function to render Lucide icon for event type
   - Fallback icon for unknown/custom types without icons assigned
   - Support for icon + color from event type definition

2. **Update timeline rendering**
   - Modify `src/events/ui/person-timeline.ts`
   - Modify `src/events/ui/family-timeline.ts`
   - Modify `src/events/ui/place-timeline.ts`
   - Add icon before/instead of event type text based on setting

3. **Update canvas tree generation**
   - Modify `src/events/services/timeline-canvas-exporter.ts`
   - Render icon in event node cards

4. **Update map markers**
   - Modify map event marker rendering
   - Use icon in popup or as marker symbol

5. **Add settings**
   - Add `eventIconMode` to settings
   - Add UI in Preferences tab

### Phase 2: Polish & Customization (Future)

1. **Per-view overrides** if requested
2. **Icon size options** (small, medium, large)
3. **Custom icon assignment** for custom event types (already supported in Event Type Editor)

---

## Technical Considerations

### Lucide Icon Rendering

Icons are rendered via `setIcon()` from Obsidian API or custom SVG insertion. The `src/ui/lucide-icons.ts` file provides icon utilities.

```typescript
import { setIcon } from 'obsidian';

// Render icon into container
setIcon(containerEl, 'baby'); // birth icon
```

### Fallback for Custom/Unknown Types

If an event type doesn't have an icon assigned:
- Use a generic fallback icon (e.g., `circle-dot` or `calendar`)
- Fall back to text label

### Canvas Compatibility

Canvas nodes are JSON-based. Icons would need to be:
- Rendered as SVG in card content, OR
- Prepended as emoji/text character (simpler but less flexible)

**Recommendation:** Use SVG rendering for consistency with other views.

### Export Compatibility

Icons should export correctly in:
- PNG/SVG/PDF canvas exports (SVG icons)
- Timeline markdown exports (use text fallback or emoji)

---

## Mockups

### Timeline with Icons

**Current (text):**
```
● 1850 — Birth — John Smith born in Philadelphia
● 1875 — Marriage — Married Mary Jones
● 1920 — Death — Died in Philadelphia
```

**Icon mode:**
```
👶 1850 — John Smith born in Philadelphia
💒 1875 — Married Mary Jones
💀 1920 — Died in Philadelphia
```

**Both mode:**
```
👶 Birth — 1850 — John Smith born in Philadelphia
💒 Marriage — 1875 — Married Mary Jones
💀 Death — 1920 — Died in Philadelphia
```

*(Note: Actual implementation uses Lucide SVG icons, not emoji)*

### Canvas Event Node

```
┌────────────────────┐
│ 👶 Birth           │
│ 1850-03-15         │
│ Philadelphia, PA   │
└────────────────────┘
```

---

## Design Decisions

### Icon Size

Use **16px** uniformly across all views for simplicity. Lucide icons scale well, and a consistent size reduces visual complexity. Adjust per-view only if testing reveals issues.

### Color Handling

| View | Icon Color | Rationale |
|------|------------|-----------|
| Timelines | Monochrome | Clean look, works with light/dark themes |
| Canvas nodes | Monochrome | Cards already have structure, icon is secondary |
| Map markers | Event type color | Stands out against busy map background, aids visual scanning |

### Tooltip Behavior (Icon-Only Mode)

- **Desktop:** Show tooltip on hover with event type name (via `title` attribute or CSS tooltip)
- **Touch devices:** No special handling - the date and description provide context; users can switch to "both" mode if needed

### Default Mode

Default to `text` (current behavior). Icons are opt-in to preserve existing user experience.

---

## Alternatives Considered

### Emoji instead of Lucide icons

**Pros:** No SVG rendering needed, exports easily
**Cons:** Less consistent across platforms, limited icon choices, doesn't match Obsidian aesthetic

**Decision:** Use Lucide icons for consistency with Obsidian and existing event type definitions.

### Always show icons (no text option)

**Pros:** Simpler implementation
**Cons:** Less flexible, some users may prefer text

**Decision:** Provide options to accommodate different preferences.

---

## Implementation Notes (Phase 1)

Phase 1 was completed in January 2026. Here's what was implemented:

### Setting Added

- `eventIconMode: 'text' | 'icon' | 'both'` — Global setting in Preferences > Canvas & Trees > Event display
- Default: `'text'` (preserves existing behavior)

### Views Updated

| View | Location | Implementation |
|------|----------|----------------|
| Person timeline | Control Center > People tab | Icon in timeline node circle |
| Family timeline | Control Center > People tab | Icon in timeline node circle |
| Place timeline | Control Center > Places tab | Icon in timeline node circle |
| Dynamic timeline block | `canvas-roots-timeline` | Inline icon before year |
| Map popups | Map view marker click | Icon with event type color before label |

### Files Modified

- `src/settings.ts` — Added `EventIconMode` type and `eventIconMode` setting with UI
- `src/events/ui/person-timeline.ts` — Icon mode support
- `src/events/ui/family-timeline.ts` — Icon mode support
- `src/events/ui/place-timeline.ts` — Icon mode support
- `src/dynamic-content/services/dynamic-content-service.ts` — Added `getSettings()` method
- `src/dynamic-content/renderers/timeline-renderer.ts` — Icon support
- `src/maps/map-controller.ts` — Popup icon support
- `src/maps/map-view.ts` — Pass event icon settings to controller
- `src/maps/types/map-types.ts` — Added icon settings to `MapSettings` interface
- `styles/events.css` — Added `--dot` CSS variants for text-only mode
- `styles/dynamic-content.css` — Added `.cr-timeline__icon` styles
- `styles/map-view.css` — Added `.cr-map-popup-type-icon` styles

### Design Decisions Applied

- **Icon size:** 14-16px depending on context
- **Timeline icons:** Colored to match event type
- **Map popup icons:** Colored to match event type (stands out against map background)
- **Text-only mode:** Shows colored dot in timeline nodes instead of icon
- **Icon-only mode:** Shows tooltip on hover with event type name
- **Canvas trees:** Not applicable — canvas exports use file embeds, not custom rendered content

### Not Implemented (Out of Scope)

- Per-view overrides (single global setting only)
- Icon size options
- Canvas tree event node icons (would require significant canvas rendering changes)

---

## Related

- [Event Type Editor](https://github.com/banisterious/obsidian-charted-roots/wiki/Events-And-Timelines) - Custom event types with icons
- [Styling & Theming](https://github.com/banisterious/obsidian-charted-roots/wiki/Styling-And-Theming) - Visual customization
- Discussion #157 (original inspiration)
