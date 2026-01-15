# Multi-Spouse Visual Cues in Family Chart

**GitHub Issue:** [#195](https://github.com/banisterious/obsidian-charted-roots/issues/195)

**Status:** Planning

---

## Problem Statement

When a person has multiple spouses, the family chart's linear horizontal layout makes relationships ambiguous. Spouses are placed in a line:

```
Philomene > Régis > Morven
```

This makes it look like Régis is the central "hub" connecting the other two, when actually Philomene is the person with multiple marriages.

---

## User Feedback

From @doctorwodka:

> I think visual cues or hover highlighting would be great; I'm leaning a bit towards visual cues as it would be easier for users to export as an image without having to worry about how the multi-spouses might appear in a non-interactive manner.

**Key insight:** Visual cues are preferred over hover highlighting because they work in static image exports.

---

## Proposed Solution

Add visual cues to distinguish spouse relationships when a person has multiple spouses.

### Visual Cue Options

1. **Spouse numbering on edges**
   - Display "1", "2", etc. on the connecting lines
   - Numbers correspond to marriage order (if known) or frontmatter order

2. **Edge labels**
   - Display "Spouse 1", "Spouse 2" or marriage dates on edges
   - More explicit but takes more space

3. **Edge styling**
   - Different line styles (solid, dashed, dotted) for each spouse
   - Or different colors
   - Less intrusive but may be harder to interpret

4. **Marriage date annotations**
   - Show marriage year on the connecting edge
   - Provides chronological context
   - Requires marriage date data

### Recommended Approach

**Phase 1: Spouse numbering on edges**
- Simple, unambiguous visual cue
- Works in exports
- Low implementation complexity
- Number based on array order in frontmatter

**Phase 2 (optional): Marriage date annotations**
- If `spouse1_marriage_date` or marriage event data available, show year
- Falls back to numbering if no date available

---

## Technical Considerations

### Family Chart View

The family chart is rendered using D3.js in [src/ui/views/family-chart-view.ts](../../src/ui/views/family-chart-view.ts).

**Key areas to modify:**

1. **Edge rendering** - Add text labels to spouse connection lines
2. **Spouse detection** - Identify when a person has multiple spouses
3. **Order determination** - Use array index or indexed spouse format (`spouse1`, `spouse2`)

### Data Sources

Spouse information comes from:
- Simple array: `spouse: ["[[Person A]]", "[[Person B]]"]` - use array index
- Indexed format: `spouse1`, `spouse2`, etc. - use explicit numbering
- Marriage events: Can provide dates for chronological ordering

### Export Compatibility

Visual cues must work in:
- PNG export (rasterized)
- SVG export (vector)
- PDF export

D3 text elements should export correctly in all formats.

---

## Implementation Plan

### Phase 1: Basic Spouse Numbering

1. **Detect multi-spouse scenarios**
   - In family chart data processing, flag persons with >1 spouse

2. **Add edge labels**
   - Modify edge rendering to add numbered labels
   - Position label at midpoint of edge or near the hub person

3. **Style the labels**
   - Small, unobtrusive text (e.g., circled number)
   - Consistent with existing chart styling

### Phase 2: Enhanced Annotations (Future)

1. **Marriage date display**
   - Extract marriage dates from indexed spouse properties or events
   - Display year on edge if available

2. **Settings**
   - Toggle for spouse numbering (on by default for multi-spouse)
   - Option to show marriage dates vs numbers

---

## Mockup

```
                    ┌─────────┐
        ①──────────│Philomene│──────────②
        │          └─────────┘           │
   ┌────┴────┐                     ┌─────┴────┐
   │  Régis  │                     │  Morven  │
   └─────────┘                     └──────────┘
```

The numbers ① and ② indicate spouse order, making it clear that Philomene is the person with multiple marriages.

---

## Alternatives Considered

### Hub Layout

Modify positioning to keep multi-spouse person centered with spouses radiating outward.

**Pros:** More intuitive visual hierarchy
**Cons:** Requires significant layout algorithm changes; may conflict with other layout constraints

**Decision:** Defer to future work. Visual cues solve the immediate clarity problem with less complexity.

### Hover Highlighting

Highlight relevant spouse edge on hover while dimming others.

**Pros:** Clean, interactive
**Cons:** Doesn't work in static exports; user specifically requested export-friendly solution

**Decision:** Not pursuing per user feedback.

---

## Related

- [Family Chart View wiki](https://github.com/banisterious/obsidian-charted-roots/wiki/Family-Chart-View)
- Indexed spouse format (see [Discussion #194](https://github.com/banisterious/obsidian-charted-roots/discussions/194))
