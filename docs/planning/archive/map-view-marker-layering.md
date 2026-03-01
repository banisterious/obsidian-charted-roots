# Map View Marker Layering

Planning document for improving visual distinction between event markers and place markers on Map View.

**Status:** 📋 Planning

**Related:** [#164](https://github.com/banisterious/obsidian-charted-roots/issues/164) (Map view support for unlinked places)

---

## Problem

When the "All places" layer is enabled in Map View, there's visual confusion between event markers and place markers:

1. **Separate clustering** — Place markers and event markers use independent MarkerClusterGroup instances, causing overlapping clusters at similar coordinates (e.g., teal "3" + green "2" at the same location)

2. **Z-order conflicts** — Place markers can obscure event markers at the same location

3. **Visual similarity** — Both layer types use solid circular markers, making it hard to distinguish context (places) from primary data (events)

---

## Solution: Z-ordering + Visual Separation

Keep both layers but improve visual distinction:

### 1. Z-ordering

Ensure event markers always render on top of place markers:
- Set `zIndexOffset` on event marker layer to be higher than place marker layer
- Or use Leaflet pane ordering to enforce layer stacking

### 2. Visual differentiation for place markers

Make place markers clearly read as "background context" rather than primary data:

**Options (choose one):**

| Style | Pros | Cons |
|-------|------|------|
| Hollow circles (stroke only) | Clear distinction, lightweight | May be harder to see on busy maps |
| Smaller size (60-70% of event markers) | Subtle but effective | Still solid, could blend |
| Different shape (diamond, square) | Unmistakable | May clash with Leaflet clustering |
| Lower opacity (40-50%) | Simple CSS change | Could look washed out |

**Recommendation:** Hollow circles with teal stroke, or smaller solid markers with lower opacity.

### 3. Clustering adjustments

**Options:**

| Approach | Description | Complexity |
|----------|-------------|------------|
| Unified cluster group | Merge place + event markers into single cluster group with distinct colors | Medium — requires cluster icon customization |
| Increased cluster distance | Keep separate groups but increase `disableClusteringAtZoom` for places so they don't cluster as aggressively | Low |
| Exclude overlapping places | Filter "All places" to exclude places that already have events at that exact location | Low |

**Recommendation:** Start with increased cluster distance for places + visual differentiation. If still confusing, consider unified clustering.

---

## Implementation

### Phase 1: Visual differentiation

1. Update place marker creation in `map-view.ts` to use:
   - Smaller radius (e.g., 6px vs 8px for events)
   - Hollow style (stroke only, no fill) OR lower opacity fill
   - Ensure `zIndexOffset` is lower than event markers

2. Update cluster styling for place layer to be visually distinct

### Phase 2: Clustering improvements (if needed)

1. Adjust `disableClusteringAtZoom` threshold for place layer
2. Or implement unified clustering with marker-type-aware cluster icons

---

## Alternatives Considered

### Option 1: Exclude places that already have events

Filter the "All places" layer to only show places without event markers at that location.

- **Pro:** Simplest solution, no visual overlap
- **Con:** Users who want to see both (place background info + events) lose that ability

### Option 2: Unified clustering

Merge both layers into a single MarkerClusterGroup while preserving distinct marker colors.

- **Pro:** No overlapping clusters, single coherent view
- **Con:** Higher complexity, cluster icons need customization to show mixed content

User feedback (from @ANYroots) indicates they want both event and place markers preserved and visibly distinct, since they plan to add background info to place notes. This rules out Option 1.

---

## Scope

- Medium complexity
- Touches `src/map/map-view.ts` and potentially `styles/map-view.css`
- No new dependencies
- User-facing visual change

---

## Community Input

@ANYroots (issue reporter):
> "My place notes are pretty empty right now but I plan to include location background info, local resources, etc., so it would be useful if both event and place markers were preserved and visibly distinct."
