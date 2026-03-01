# Map-Place Universe Sync

Planning document for [#223](https://github.com/banisterious/obsidian-charted-roots/issues/223).

---

## Overview

Automatically synchronize universe assignment when linking existing places to maps via context menu.

**Design Philosophy:**
- Silent operation for the common case (place has no universe)
- Explicit confirmation only when there's a potential conflict
- Support multi-universe places for edge cases (crossovers)

---

## Problem Statement

When a user adds an existing place to a map via the map view context menu, the place may not have a universe assigned, or may belong to a different universe than the map. This creates data inconsistency and can cause places to not appear where expected.

---

## User Requirements

Based on discussion in #223 (@doctorwodka):

| Requirement | Decision |
|-------------|----------|
| Entry point | Map view context menu |
| Default assumption | Single universe per place |
| Multi-universe support | Yes, for edge cases like crossovers |

---

## Scope & Constraints

### When Universe Sync Applies

Universe sync only triggers when **all** of the following are true:

1. **Custom map with universe** — The active map is a custom image map with a `universe` property. OpenStreetMap (real world) has no universe, so sync is skipped.

2. **Fictional or historical place** — The place has `place_category: fictional` or `place_category: historical`. Real places (`place_category: real`) are skipped since they exist independently of fictional universes.

### Out of Scope (v1)

| Feature | Rationale |
|---------|-----------|
| Undo support | User can manually edit frontmatter if needed. Consider relationship-history tracking in future if requested. |
| Batch operations | Single-place workflow sufficient for v1. |

### User Feedback

When silently adding a universe to a place (no-universe case), show a brief auto-dismissing notice:
> Added "Winterfell" to universe "westeros"

This prevents surprise when users later discover the universe property.

---

## Proposed Solution

### Logic Flow

```
When adding existing place to map via context menu:
│
├─ Map has no universe (e.g., OpenStreetMap)?
│  └─ Skip universe sync, proceed with link
│
├─ Place is real-world (place_category: real)?
│  └─ Skip universe sync, proceed with link
│
├─ Place has no universe?
│  └─ Silently add map's universe to place, show notice
│
├─ Place has same universe as map?
│  └─ No action needed
│
└─ Place has different universe?
   └─ Show confirmation dialog:
      ├─ "Add universe" → Append map's universe to place's universe list
      ├─ "Replace universe" → Overwrite with map's universe
      └─ "Cancel" → Abort the operation
```

### Confirmation Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Universe mismatch                                  [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  "Winterfell" belongs to universe "westeros".           │
│  This map belongs to universe "middle-earth".           │
│                                                         │
│  How would you like to proceed?                         │
│                                                         │
│  [Add universe]  [Replace universe]  [Cancel]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation

### Location

- **Main logic:** `src/maps/map-view.ts` — `handleUniverseSync()` method in `linkExistingPlaceToCoordinates()` flow
- **Confirmation modal:** `src/maps/ui/universe-sync-modal.ts`
- **CSS:** `styles/map-view.css` — `.cr-universe-sync-modal` section

### Steps

1. **Detect universe mismatch** when user selects "Link to existing place"
2. **Check place's current universe:**
   - `undefined` or empty → silently assign map's universe
   - Same as map → proceed without modification
   - Different → show confirmation dialog
3. **Update place frontmatter** based on user choice:
   - "Add universe" → append to `universe` array
   - "Replace universe" → overwrite `universe` property
4. **Complete the link operation** after universe sync

### Data Model

Places can have:
- No universe: `universe: undefined`
- Single universe: `universe: "westeros"`
- Multiple universes: `universe: ["westeros", "middle-earth"]`

---

## Edge Cases

1. **Place already in multiple universes:** Show which universes in dialog, offer same options
2. **Map has no universe (OpenStreetMap):** Skip universe sync entirely, proceed with link
3. **Real-world place:** Skip universe sync entirely, proceed with link
4. **User cancels confirmation:** Abort the entire link operation (don't add place to map)
5. **Historical place:** Treat same as fictional — historical places can belong to alternate history universes

---

## Related

- Per-Map Marker Assignment (v0.19.6) — Related universe scoping feature
