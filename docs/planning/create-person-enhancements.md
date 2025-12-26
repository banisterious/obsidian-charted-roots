# Create Person Enhancements

Planning document for enhancing person creation and editing workflows.

**Status:** Planning
**GitHub Issue:** #TBD
**Created:** 2025-12-18
**Updated:** 2025-12-26

---

## Overview

Enhance the Create/Edit Person modal to support linking children and improve the overall data entry experience. Long-term, consider a wizard or tabbed modal approach for comprehensive data entry.

---

## Phase 1: Add Children Section to Edit Modal ✅ Planned

Add the ability to link children directly from the Edit Person modal.

### Context

- The plugin already has `child` frontmatter property and bidirectional linking
- Setting `father: [[John]]` on Jane's note automatically adds `[[Jane]]` to John's `child` array
- Users want to link children from the parent's perspective (batch operation)

### Scope

1. **Children section in Edit mode only**
   - Add "Children" section with multi-select person picker
   - Display currently linked children (from `child` array)
   - Allow adding/removing children
   - Skip in Create mode (typically don't know children when creating a person)

2. **Parent field auto-detection**
   - When adding children, auto-detect which parent field to set based on parent's `sex` field
   - Male → set child's `father` field
   - Female → set child's `mother` field
   - Unknown/other → prompt user to choose

3. **Bidirectional sync**
   - Adding child to parent's `child` array triggers bidirectional linker
   - Child's `father`/`mother` field updated automatically
   - Removing child updates both directions

### Implementation Notes

- Reuse existing PersonPickerModal with multi-select support
- Similar pattern to existing spouses field
- Consider filtering candidates (people without this person as parent already)

### Open Questions

1. Should we filter candidate children to exclude people already linked to another parent of the same type?
2. Should there be a confirmation when adding many children at once?

---

## Phase 2: Create Person Wizard (Future)

A multi-step wizard for comprehensive data entry, similar to Universe Setup Wizard and Report Wizard.

### Motivation

As the Create Person modal grows with more fields (places, sources, children), a wizard approach would:
- Break entry into logical steps
- Reduce cognitive load
- Allow skipping irrelevant sections
- Provide guidance for new users

### Alternative: Tabbed Modal

Instead of a full wizard, consider a tabbed modal:
- Keeps everything in one place
- Organized into collapsible/tabbed sections
- Less disruptive than step-by-step wizard
- Better for quick edits

### Proposed Sections

| Section | Fields |
|---------|--------|
| **Basic** | Name, sex, nicknames, cr_id |
| **Dates & Places** | Birth date + place, death date + place, living status |
| **Family** | Father, mother, spouses, children |
| **Extended** | Occupations, custom relationships, sources |
| **Options** | Target folder, filename format, dynamic blocks |

### Features

- Steps/tabs can be skipped (all optional except Basic)
- Remember last-used settings (folder, collection, universe)
- Preview of frontmatter before creation
- Validation at each step
- State persistence for resume functionality

### Implementation Notes

- Follow existing wizard patterns (Universe Wizard, Report Wizard)
- Reuse components from Phase 1 (place picker, person picker)
- Consider wizard state persistence across Obsidian restarts (already implemented for modals)

### When to Implement

This becomes valuable when:
- Modal complexity continues to grow
- Users report feeling overwhelmed by the form
- Need to add more relationship types or source linking

---

## Completed Enhancements

### Place Picker Integration ✅ (v0.14.x)

- Added place picker for birth/death places
- Link button opens place picker modal
- Create new place inline if none exists
- Dual storage: wikilink in `birth_place`, cr_id in `birth_place_id`

### Field Reordering ✅ (v0.14.x)

- Grouped related fields logically:
  - Birth date + Birth place
  - Death date + Death place

---

## Related Documents

- [Frontmatter Reference](../../wiki-content/Frontmatter-Reference.md) - Property documentation
- [Data Entry](../../wiki-content/Data-Entry.md) - Current documentation
- [Bidirectional Linking](../../wiki-content/Relationship-Tools.md) - How relationships sync
