# Image Region Crop

Planning document for image region selection / crop thumbnails.

**Status:** ✅ All phases complete

**Related:** [#354](https://github.com/banisterious/obsidian-charted-roots/issues/354)

---

## Overview

Allow users to select a region of an image (e.g., a face in a group photo) to use as the thumbnail for a person, place, or other entity. The crop region is stored in frontmatter and applied when rendering thumbnails across all views.

---

## Decisions

| Question | Decision |
|----------|----------|
| Data model | Option B — separate `media_crop` property (preserves existing `media` format) |
| Scope | Any media item, not just the thumbnail |
| Multiple crops | Yes — same image can have different crops on different notes. One crop per image per note. |
| Gramps import | Yes — import crop coordinates from `.gpkg` files (future phase) |
| Display | Both Family Chart avatars and media block thumbnails |

---

## Data Model

```yaml
media:
  - "[[group-photo.jpg]]"
  - "[[document.pdf]]"
media_crop:
  - image: "group-photo.jpg"
    x: 100
    y: 50
    w: 200
    h: 250
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `media_crop` | `array` | Array of crop definitions |
| `media_crop[].image` | `string` | Filename (without path or wikilink brackets) matching a media item |
| `media_crop[].x` | `number` | X offset of crop region (pixels from left) |
| `media_crop[].y` | `number` | Y offset of crop region (pixels from top) |
| `media_crop[].w` | `number` | Width of crop region (pixels) |
| `media_crop[].h` | `number` | Height of crop region (pixels) |

### Resolution

When rendering a media item:
1. Check if `media_crop` contains an entry matching the image filename
2. If yes, render only the specified region (using CSS `object-fit` + `object-position`, or canvas crop)
3. If no, render the full image (current behavior)

---

## Implementation Phases

### Phase 1 — Crop data model and rendering ✅

- [x] `MediaCrop` interface and optional `crop` field on `MediaItem`
- [x] `resolveMediaItemsWithCrops()` and `parseMediaCrops()` in `MediaService`
- [x] `CropRenderer` — canvas-based crop to data URL with in-memory cache
- [x] Apply crop in `charted-roots-media` dynamic block
- [x] Apply crop in Family Chart avatars (async with await before chart build)
- [x] Apply crop in Entity Profile View header avatar
- [x] Apply crop in Entity Profile View media section
- [x] Crop data flows through profile data loader via frontmatter parameter

### Phase 2 — Crop selection UI ✅

- [x] `CropRegionModal` — canvas with draggable/resizable rectangle, darkened overlay, live preview
- [x] Right-click context menu on media block images: "Set crop region" / "Edit crop region" / "Remove crop"
- [x] Save crop coordinates to frontmatter via `processFrontMatter`
- [x] Remove crop cleans up `media_crop` property (deletes if empty)

### Phase 3 — Gramps import

- [x] Parse `<region>` elements from Gramps `<objref>` XML with percentage-based corner coordinates
- [x] Convert Gramps corner format (corner1_x/y, corner2_x/y) to CR's x/y/w/h format
- [x] Write `media_crop` with `percent: true` flag during import
- [x] `CropRenderer` handles percentage → pixel conversion at render time using actual image dimensions

---

## Technical Approach

### Rendering crops

**CSS approach (preferred for thumbnails):**
```css
img {
  object-fit: cover;
  object-position: -100px -50px;  /* offset by crop x,y */
  width: 200px;   /* crop width */
  height: 250px;  /* crop height */
}
```

Con: Doesn't truly crop — just shifts the visible window. Works for fixed-size thumbnails but not for responsive layouts.

**Canvas approach (more precise):**
```typescript
const canvas = document.createElement('canvas');
canvas.width = crop.w;
canvas.height = crop.h;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
const dataUrl = canvas.toDataURL('image/png');
```

Pro: True crop, works everywhere. Con: Async, needs image loaded first.

**Recommendation:** Use canvas approach for generating a cropped data URL on first render, then cache the result (similar to PdfThumbnailService pattern).

### Crop selection modal

- Load the full image into a canvas or img element
- Overlay a draggable, resizable rectangle (using mouse events)
- Show a live preview of the cropped region
- On save, write the rectangle coordinates to `media_crop` in frontmatter
- Handle image scaling (modal may display image smaller than actual size)

---

## Files to Modify

### Phase 1
- `src/core/media-service.ts` — Parse `media_crop` from frontmatter, add to `MediaItem`
- `src/dynamic-content/renderers/media-renderer.ts` — Apply crop when rendering
- `src/ui/views/family-chart-view.ts` — Apply crop to avatars
- `src/profile-view/sections/media-section.ts` — Apply crop
- `src/sources/ui/media-gallery.ts` — Apply crop

### Phase 2
- `src/core/ui/crop-region-modal.ts` — New modal for visual crop selection
- `src/dynamic-content/renderers/media-renderer.ts` — Add "Set crop" button/menu
- `src/core/media-service.ts` — Write crop data to frontmatter
