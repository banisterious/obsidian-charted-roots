# Create Person Modal UX Improvements

**GitHub Issue:** TBD

**Status:** Planning

---

## Problem Statement

The "Create person note" modal has grown long and complex, requiring users to scroll extensively to reach the "Create person" button. Many fields are rarely used during initial person creation but take up significant vertical space.

---

## Proposed Improvements

### 1. Collapsible Sections

Make rarely-used sections collapsible (collapsed by default):

- **DNA information** - Only relevant when Person type is "DNA Match" and DNA tracking is enabled
- **Step & adoptive parents** - 4 fields that are rarely needed during initial creation
- **Sources** - Can be added after creation via Edit Person

Sections that should remain expanded:
- Basic identity fields (Name, Nickname, Given name, Surname, Sex, Pronouns, Person type)
- Life events (Birth/Death dates and places)
- Core family relationships (Father, Mother, Spouse)
- Organization fields (Collection, Universe, Directory)

### 2. Reorder Fields

Move life events (birth/death) higher in the form, closer to basic identity:

**Proposed order:**
1. Name, Nickname, Given name, Surname(s)
2. Sex, Pronouns, Person type
3. Birth date, Birth place, Death date, Death place
4. Sources (collapsible)
5. Family relationships (Father, Mother, Spouse)
6. Step & adoptive parents (collapsible)
7. DNA information (collapsible, only if DNA tracking enabled)
8. Collection, Universe, Directory
9. Include dynamic blocks toggle

### 3. Sticky Footer

Keep the Cancel/Create person buttons visible at all times while scrolling through the form.

---

## Implementation Plan

### Phase 1: Collapsible Sections

1. **Create collapsible section component**
   - Reusable component with header, chevron icon, and content area
   - Animate expand/collapse with CSS transitions
   - Store collapsed state (in memory for session, not persisted)

2. **Apply to sections**
   - DNA information (collapsed by default, hidden entirely if DNA tracking disabled)
   - Step & adoptive parents (collapsed by default)
   - Sources (collapsed by default)

3. **Update CSS**
   - Add styles for collapsible headers
   - Add chevron rotation animation
   - Ensure consistent spacing when collapsed/expanded

### Phase 2: Reorder Fields

1. **Move life events section**
   - Relocate Birth date, Birth place, Death date, Death place
   - Position after Sex/Pronouns/Person type, before Sources

2. **Adjust section groupings**
   - Group related fields visually
   - Add subtle separators between sections

### Phase 3: Sticky Footer

1. **CSS changes**
   - Make modal content scrollable with fixed footer
   - Set max-height on content area
   - Position footer with buttons at bottom

2. **Handle modal sizing**
   - Ensure footer doesn't overlap content
   - Test with various viewport heights

---

## Files to Modify

- `src/ui/create-person-modal.ts` - Main modal implementation
- `styles/modals.css` or equivalent - Modal styling

---

## Considerations

- **Accessibility**: Collapsible sections should be keyboard navigable and work with screen readers (use proper ARIA attributes)
- **Discoverability**: Collapsed sections should have clear visual indication they can be expanded
- **State**: Consider whether to remember collapsed state between modal opens (probably not - keep it simple)
- **DNA section visibility**: Already conditionally shown based on settings; ensure collapsible behavior integrates with this

---

## Open Questions

1. Should Sources section be collapsible or just moved lower?
2. Should we add visual section headers/dividers for better grouping?
3. Any other sections that should be collapsible?
