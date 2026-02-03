# Dockable Views Discoverability

Planning document for improving discoverability of dockable sidebar views.

**Status:** 📋 Planning

**Related:** [#243](https://github.com/banisterious/obsidian-charted-roots/issues/243) (Dock button visibility)

---

## Problem

The v0.20.0 release introduced dockable sidebar views for 9 entity types, but users have had trouble discovering them:

1. **Dock buttons are hover-only** — the buttons on card headers only appear when hovering, so users don't know they exist
2. **No centralized entry point** — users must navigate to each tab and hover to find the dock button, or know the command palette command

---

## Solution

Two changes:

### 1. Dashboard "Dockable views" section

Add a new section to the Dashboard tab with a tile grid showing all available dockable views:

| View | Icon |
|------|------|
| People | `users` |
| Places | `map-pin` |
| Events | `calendar` |
| Sources | `book-open` |
| Organizations | `building` |
| Relationships | `git-merge` |
| Universes | `globe` |
| Collections | `folder` |
| Data Quality | `shield-check` |
| Entity Profile | `user` (future) |

Each tile:
- Shows the view icon and name
- Clicks to open/reveal that view in the sidebar
- Uses consistent styling with existing Dashboard tiles

This provides a clear visual menu on the landing page where users naturally look first.

### 2. Always-visible dock buttons on card headers

Change the dock buttons on entity card headers from hover-only (`opacity: 0` → `opacity: 1` on hover) to always visible. This makes them discoverable without requiring users to hover.

CSS change in `styles/control-center.css`:

```css
/* Before */
.crc-card__dock-btn {
  opacity: 0;
  transition: opacity 150ms ease;
}

.crc-card__header:hover .crc-card__dock-btn {
  opacity: 1;
}

/* After */
.crc-card__dock-btn {
  opacity: 0.6;
  transition: opacity 150ms ease;
}

.crc-card__header:hover .crc-card__dock-btn,
.crc-card__dock-btn:hover {
  opacity: 1;
}
```

The buttons remain subtle (60% opacity) but are visible without hover. Full opacity on hover provides feedback.

---

## Implementation

### Dashboard section

1. Add `renderDockableViewsSection()` function in `dashboard-tab.ts`
2. Create a tile grid with 9 (eventually 10) tiles
3. Each tile calls the existing `openOrRevealView()` helper for that view type
4. Add section after "Quick actions" or similar prominent position

### CSS change

1. Update `.crc-card__dock-btn` in `styles/control-center.css`
2. Rebuild `styles.css`

---

## Scope

- Small, self-contained change
- No new dependencies
- Builds on existing tile and view infrastructure
