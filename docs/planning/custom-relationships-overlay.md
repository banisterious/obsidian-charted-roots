# Custom Relationships Overlay on the Family Chart

Planning document for rendering custom (non-family) relationships — liege/vassal, ally/rival, master/apprentice, mentor/disciple, godparent, betrothed, etc. — as styled overlay lines on the interactive family chart.

**Status:** ✅ Phases 1–2 shipped (#386, with the paint-on-top z-order refinement in #450 and the v0.22.10 verification pass). 🔶 Phases 3–4 (line labels, routing / clutter handling) remain gated on real-world testing per the original plan; no decision yet on whether they're needed.

**Related:** [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386), [#450](https://github.com/banisterious/obsidian-charted-roots/issues/450)

**Composes with:** [#376](https://github.com/banisterious/obsidian-charted-roots/issues/376) (as-of date filter, already shipped in v0.20.58)

---

## Overview

The plugin already supports custom relationship types with per-type colors and line styles, and users can create relationships between any two people. But these relationships don't appear anywhere on the **family chart view** today — they exist only as data, surfacing in the relationships tab and Entity Profile View.

This is a discoverability problem as much as a feature gap: worldbuilders and historians use custom relationships to model political and social structure, but can't see those structures on the chart that's their primary working surface. The worldbuilder feedback in [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371) showed a user who didn't realize custom relationship types existed at all.

The overlay renders each qualifying relationship as a styled line between the two people it connects, drawn on top of the existing tree render. It follows the same architectural pattern as the kinship-label overlay already in the view: a plugin-owned `<g>` layer refreshed on `setAfterUpdate`.

---

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Overlay rendering pattern | Plugin-owned `<g class="cr-relationship-overlay">` in the `.view` group, refreshed on `setBeforeUpdate` (clear) / `setAfterUpdate` (re-render) | Proven pattern from the kinship-label overlay. Zero coordination with family-chart internals. |
| New per-type flag | `includeOnFamilyChartOverlay?: boolean` on `RelationshipTypeDefinition` | Decoupled from `includeOnFamilyTree` / `familyGraphMapping`. A type can be tree-only, overlay-only, or both. Addresses the vampire-sire use case from @doctorwodka on #386. |
| Default value for built-in types | `false` | Opt-in. Avoids unexpected rendering changes for existing users. Users enable per type via the relationship-type editor modal. |
| Line geometry (v1) | Straight line between card centers | Issue scope. Routing is a Phase 4 concern only if clutter becomes real. |
| Symmetric relationships | Render once per pair | Two-line duplication is visual noise with no added information. |
| Multi-edge stacking | Short perpendicular offset per additional relationship between the same pair | Prevents overlapping lines when (e.g.) two people are both `ally` and `mentor`. Simple index-based offset is enough for v1. |
| As-of date integration | Skip relationships whose `from`/`to` range doesn't include the selected date, using the same `compareDateStrings` pattern | Composes with #376 already in the view. Uses `ParsedRelationship.from` / `.to` fields already parsed. |
| Endpoint visibility | Only render when **both** cards are visible in the current tree | Lines to off-screen cards clutter more than they inform; add arrows-to-offscreen only if feedback asks for it. |
| Master toggle | Single "Show custom relationships" toggle in the display menu, next to "Show kinship labels" | Mirrors existing UX. Persisted in view state. |
| Per-type toggles | Submenu under the master toggle, listing types with `includeOnFamilyChartOverlay === true` | Users with many types can focus. Master toggle disables everything; per-type toggles fine-tune. |
| Labels on lines (v1) | Deferred to Phase 3, decision gated on real-world testing | Real design branches (always-on vs hover, collision handling) sharpen when lines are in front of users. Hover tooltips may be sufficient. |
| Curved/offset routing (v1) | Deferred to Phase 4, decision gated on real-world testing | YAGNI: we don't know if clutter is a problem until v1 renders on real trees. If it is, the fix may not be curves. |

---

## Data Model Changes

### `RelationshipTypeDefinition`

Add one optional field to [src/relationships/types/relationship-types.ts:55-89](../../src/relationships/types/relationship-types.ts#L55-L89):

```ts
interface RelationshipTypeDefinition {
  // ...existing fields...

  /** If true, this relationship type is drawn as an overlay line on the family chart. */
  includeOnFamilyChartOverlay?: boolean;
}
```

**Explicitly decoupled from:** `includeOnFamilyTree` and `familyGraphMapping`. A type can have any combination:

| `includeOnFamilyTree` | `includeOnFamilyChartOverlay` | Behavior |
|---|---|---|
| `true` | `false` | Current behavior — mapped to tree structure, no overlay line |
| `false` | `true` | Overlay only — independent styled line, no tree-layout impact |
| `true` | `true` | Both — participates in layout *and* drawn as overlay line |
| `false` | `false` | Data-only — exists in relationships tab / profile view, no chart presence |

### Settings UI

Add a new section to [src/relationships/ui/relationship-type-editor-modal.ts:273-288](../../src/relationships/ui/relationship-type-editor-modal.ts#L273-L288):

- Heading: **Family Chart Overlay** (sibling to the existing "Family Tree Integration" heading)
- Toggle: **Render on family chart as overlay line**
- Help text: "When enabled, this relationship type is drawn as a styled line between the two people it connects, on top of the family tree. Decoupled from tree-structure integration above."

---

## Rendering

### New overlay layer

Parallel to the kinship-label group at [family-chart-view.ts:3219-3340](../../src/ui/views/family-chart-view.ts#L3219-L3340):

```
<g class="cr-relationship-overlay">
  <!-- one <line> per qualifying relationship -->
</g>
```

Appended to the `.view` group (transform-aware) so lines pan/zoom with the chart.

### Lifecycle hooks

Same pattern as kinship labels ([family-chart-view.ts:1209-1211](../../src/ui/views/family-chart-view.ts#L1209-L1211)):

```
setBeforeUpdate(() => this.clearRelationshipOverlayForUpdate());
setAfterUpdate(() => this.scheduleRelationshipOverlayRerender());
```

`scheduleRelationshipOverlayRerender()` uses the same ~1500ms delay to let family-chart finish its 800ms transition before drawing over it.

### Render pipeline

```
renderRelationshipOverlay():
  if !showCustomRelationships → clear and return
  1. Gather qualifying relationships:
     - for each visible card in the current tree,
       getRelationshipsForPerson(card.crId)  [RelationshipService:158]
     - filter: type.includeOnFamilyChartOverlay === true
     - filter: enabled per-type toggles
     - filter: asOfDate ∈ [from, to]  (if asOfDate set and range exists)
     - dedupe symmetric pairs (canonicalize endpoint order by crId)
  2. Resolve card positions:
     - getCardPositions() → Map<crId, {x, y}>  [family-chart-view.ts:3315]
     - skip relationship if either endpoint not in map
  3. Stack multi-edge pairs:
     - group by canonical endpoint pair
     - assign perpendicular offset per relationship: ±(index * 8px)
  4. Draw:
     - create <line> with stroke = type.color, stroke-dasharray from type.lineStyle
     - midpoint offset if stacking offset != 0
  5. Append to <g class="cr-relationship-overlay">
```

### Display menu

Add to the existing display menu in [family-chart-view.ts:2390-2394](../../src/ui/views/family-chart-view.ts#L2390-L2394) area:

- Master toggle: "Show custom relationships" (top-level)
- Per-type submenu: one toggle per type with `includeOnFamilyChartOverlay === true`, disabled when master toggle off

---

## Phases

### Phase 1 — Core overlay (MVP)

- [ ] Add `includeOnFamilyChartOverlay` to `RelationshipTypeDefinition`
- [ ] Add toggle to relationship-type-editor-modal ("Family Chart Overlay" section)
- [ ] Migrate existing built-in types to include the new field set to `false`
- [ ] Add `<g class="cr-relationship-overlay">` layer; wire `setBeforeUpdate` / `setAfterUpdate`
- [ ] Implement `renderRelationshipOverlay()` with endpoint discovery, color/line-style application, symmetric dedupe
- [ ] Integrate with as-of date filter (skip out-of-range relationships)
- [ ] Add master "Show custom relationships" toggle to display menu
- [ ] Persist master toggle in view state
- [ ] Multi-edge stacking (perpendicular offset for concurrent relationships on same pair)

### Phase 2 — Per-type toggles

- [ ] Submenu in display menu listing types with `includeOnFamilyChartOverlay === true`
- [ ] Persist per-type visibility state
- [ ] Empty-submenu handling (hide submenu when no types are overlay-enabled)

### Phase 3 — Labels on lines (gated on real-world testing)

- [ ] Decide: always-on labels vs hover tooltips vs per-type choice
- [ ] If always-on: position (midpoint, offset), collision avoidance, typography, truncation
- [ ] If hover: tooltip shape, dwell time, show-on-focus-for-keyboard
- [ ] User feedback from Phase 1–2 ship informs this

### Phase 4 — Routing / clutter fixes (gated on real-world testing)

- [ ] Evaluate whether clutter is actually a problem on real trees
- [ ] If it is: evaluate curved routing, per-type opacity, filtering, or other approaches
- [ ] Build whichever lands on the evidence

---

## Integration Points

### With existing services

- `RelationshipService.getRelationshipsForPerson(crId)` ([relationship-service.ts:158](../../src/relationships/services/relationship-service.ts#L158)) — primary data source
- `ParsedRelationship` type ([relationship-types.ts:112-135](../../src/relationships/types/relationship-types.ts#L112-L135)) — relationship records used for rendering

### With as-of date filter (#376)

- State variable `asOfDate` ([family-chart-view.ts:136](../../src/ui/views/family-chart-view.ts#L136))
- Comparison helper `compareDateStrings` ([family-chart-view.ts:3093-3110](../../src/ui/views/family-chart-view.ts#L3093-L3110)) — reused for the relationship `from`/`to` range check
- When `asOfDate` is set, the overlay filter becomes: `(!from || compareDateStrings(from, asOfDate) <= 0) && (!to || compareDateStrings(to, asOfDate) >= 0)`

### With existing overlays

Coexists with the kinship-label overlay — different `<g>` layer, independent refresh. Both render on `setAfterUpdate`; their ~1500ms delay is shared infrastructure that already handles the family-chart transition.

---

## Testing Approach

- **Unit tests** — relationship filter predicate (overlay flag + as-of date + symmetric dedupe), multi-edge stacking math
- **Integration tests** — render overlay on a known fixture with multiple overlay-enabled relationships, verify expected lines exist with expected styles
- **Manual / visual tests**:
  - Type with `includeOnFamilyTree: true, includeOnFamilyChartOverlay: true` → appears on tree *and* as overlay line
  - Type with `includeOnFamilyTree: false, includeOnFamilyChartOverlay: true` → overlay only, no layout impact
  - Two people with 2+ overlay relationships → lines don't perfectly overlap (stacked)
  - As-of date advances past a relationship's `to` date → line disappears
  - Asymmetric type (e.g. `master` → `apprentice`) → one line drawn, not two
  - Pan/zoom → lines move with the chart
  - Master toggle off → no overlay lines at all

---

## Open Questions

None outstanding at plan time. Items deliberately deferred pending real-world feedback:

- **Label display model** — always-on vs. hover vs. per-type? Phase 3 decides based on Phase 1–2 deployment.
- **Routing for clutter** — curves, opacity, filtering, or none needed? Phase 4 decides based on actual behavior on populated trees.
- **Arrows to off-screen endpoints** — currently skipping the relationship if either endpoint isn't in the visible tree. Revisit if users ask.

---

## References

- [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386) — feature request
- [#376](https://github.com/banisterious/obsidian-charted-roots/issues/376) — as-of date filter (composes cleanly)
- [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371) — worldbuilder discussion that surfaced the discoverability gap
- Existing kinship-label overlay: [family-chart-view.ts:3219-3340](../../src/ui/views/family-chart-view.ts#L3219-L3340) — architectural template
- Default relationship types: [default-relationship-types.ts](../../src/relationships/constants/default-relationship-types.ts)
