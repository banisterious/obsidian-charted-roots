# Maps Tab - Planning Document

## Overview

Add a dedicated Maps tab to the Control Center to consolidate map visualization features. This separates map *visualization* from place *data management* (which remains in the Places tab).

## Motivation

Currently map-related features are scattered:
- Map View accessed via command/ribbon only
- Migration diagrams in Places tab
- Place network visualization in Places tab
- No central location for custom map management

A Maps tab provides:
- Single entry point for all map visualizations
- Custom map gallery with thumbnail previews
- Clearer separation of concerns (data vs visualization)

## Tab Structure

### Card 1: Open Map View

Primary action card with a prominent button to launch the Map View.

**Contents:**
- "Open Map View" button
- Brief description of Map View capabilities
- Quick stats (e.g., "X places with coordinates")

### Card 2: Custom Maps

Grid of thumbnail previews for custom image maps.

**Contents:**
- Thumbnail grid (3 columns on desktop, responsive)
- Each thumbnail shows:
  - Map image preview (scaled, `object-fit: cover`)
  - Map name overlay
  - Universe/world badge (if set)
  - Hover actions: Open, Edit note
- "Create custom map" button
- Empty state when no custom maps exist

**Technical notes:**
- Use `vault.getResourcePath()` to convert vault paths to displayable URLs
- Thumbnail size: ~150x100px with consistent aspect ratio
- Handle missing/invalid images gracefully (placeholder icon)
- Load images lazily for performance

### Card 3: Visualizations

Migration and network diagram tools (moved from Places tab).

**Contents:**
- "Migration diagram" button - opens MigrationDiagramModal
- "Place network" button - opens PlaceNetworkModal
- Brief descriptions of each visualization type

### Card 4: Map Statistics

Overview of geographic data in the vault.

**Contents:**
- Places with coordinates (count)
- Places without coordinates (count)
- Custom maps (count)
- Universes/worlds defined (list)
- Common locations (top 5)

## Implementation Steps

### Step 1: Add tab configuration

In `src/ui/lucide-icons.ts`, add to `TAB_CONFIGS`:

```typescript
{
  id: 'maps',
  name: 'Maps',
  icon: 'map',
  description: 'Map visualizations and custom maps'
}
```

Position after 'places' tab in the array.

### Step 2: Add case statement

In `src/ui/control-center.ts`, add to the switch in `showTab()`:

```typescript
case 'maps':
  void this.showMapsTab();
  break;
```

### Step 3: Implement showMapsTab method

Create `private async showMapsTab(): Promise<void>` with the four cards described above.

### Step 4: Add CSS for thumbnail grid

In `src/ui/control-center.css` or `styles.css`:

```css
.cr-map-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.cr-map-thumbnail {
  position: relative;
  aspect-ratio: 3/2;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
}

.cr-map-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cr-map-thumbnail__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: white;
}

.cr-map-thumbnail__name {
  font-weight: 500;
  font-size: 13px;
}

.cr-map-thumbnail__universe {
  font-size: 11px;
  opacity: 0.8;
}
```

### Step 5: Remove visualization buttons from Places tab

Remove the migration diagram and place network buttons from `showPlacesTab()` since they're now in Maps tab.

### Step 6: Update wiki documentation

- Update Geographic-Features.md to mention Maps tab
- Consider adding a dedicated Maps tab section

## Helper Methods Needed

### getCustomMaps()

```typescript
private async getCustomMaps(): Promise<MapNote[]> {
  // Find all notes with type: map in frontmatter
  // Return array with path, name, image, universe, bounds
}
```

### renderMapThumbnail()

```typescript
private renderMapThumbnail(container: HTMLElement, map: MapNote): void {
  // Create thumbnail element with image preview
  // Handle missing image with placeholder
  // Add click handler to open in Map View
}
```

## Open Questions

1. Should the "Create custom map" flow be a wizard or just create a template note?
2. Should we show OpenStreetMap as a "default map" in the grid, or keep it separate?
3. Should thumbnails have a context menu (right-click) for additional actions?

## Future Enhancements

- Filter maps by universe
- Search/filter for large map collections
- Drag-and-drop reordering
- Map groups/folders
- Preview migration paths on thumbnail hover
