# Family Chart Info Panel Enhancement

- **Status:** Planning
- **Created:** 2026-01-10
- **Updated:** 2026-04-07
- **Origin:** User feedback from jeff962 in [Discussion #147](https://github.com/banisterious/obsidian-charted-roots/discussions/147), related to "Family Chart as Primary Interaction Hub"

## Problem Statement

The Family Chart info panel currently supports editing only 5 basic fields:
- First name
- Last name
- Birth date
- Death date
- Sex

The Create/Edit Person modal supports many more fields that users expect to edit. The gap forces users to leave the Family Chart and navigate to the full modal for common edits, adding friction.

**Recent additions (view mode only):**
- Alt name (#346) — displayed below name in view mode, not yet editable

## Proposed Solution

Expand the info panel to support all fields available in the Create/Edit Person modal, making the panel scrollable to accommodate the additional content.

## Fields to Add

### Basic Info Section
| Field | Type | Implementation |
|-------|------|----------------|
| Alt name | Text input | Simple text field (already displayed in view mode via #346) |
| Pronouns | Text input | Simple text field |
| Occupation | Text input | Simple text field |

### Places Section
| Field | Type | Implementation |
|-------|------|----------------|
| Birth place | Picker | PlacePickerModal integration |
| Death place | Picker | PlacePickerModal integration |

### Relationships Section (currently read-only, make editable)
| Field | Type | Implementation |
|-------|------|----------------|
| Father | Picker | PersonPickerModal integration |
| Mother | Picker | PersonPickerModal integration |
| Step-parents | Multi-picker | PersonPickerModal, multi-value UI |
| Adoptive parents | Multi-picker | PersonPickerModal, multi-value UI |
| Gender-neutral parents | Multi-picker | PersonPickerModal, multi-value UI (for worldbuilders) |
| Spouses | Multi-picker | PersonPickerModal, multi-value UI |
| Children | Multi-picker | PersonPickerModal, multi-value UI |

### Sources Section
| Field | Type | Implementation |
|-------|------|----------------|
| Linked sources | Multi-picker | SourcePickerModal, multi-value UI |

### Metadata Section
| Field | Type | Implementation |
|-------|------|----------------|
| Research level | Dropdown | Existing RESEARCH_LEVELS values |
| Collection | Text/suggest | Existing collections suggester |

## Implementation Notes

### Files to Modify

- `src/ui/views/family-chart-view.ts` (3,668 lines after export extraction) - Main implementation:
  - Expand `infoPanelEditData` interface to include new fields
  - Add new fields to `renderInfoPanelEditMode()`
  - Add new fields to `renderInfoPanelViewMode()`
  - Expand `saveInfoPanelChanges()` to persist all fields
  - Wire up picker modal integrations
- `src/ui/views/family-chart-export.ts` - No changes needed (export logic is separate)

### Reusable Patterns from Create/Edit Person Modal

The `CreatePersonModal` class in `src/ui/create-person-modal.ts` already has:
- Place picker integration (`PlacePickerModal`)
- Person picker integration (`PersonPickerModal`)
- Source picker integration (`SourcePickerModal`)
- Multi-value field handling for spouses, children, sources
- Research level dropdown
- Collection field with suggestions

These patterns can be adapted for the info panel context.

### UI Considerations

1. **Scrollable content** - The `info-panel-content` div already has `overflow-y: auto`
2. **Section grouping** - Add visual dividers between logical groups (Basic, Dates, Places, Relationships, Sources, Metadata)
3. **Picker buttons** - Use compact "Pick" buttons next to readonly inputs
4. **Multi-value display** - Use pill/chip UI with remove buttons and "Add" button

### Technical Considerations

1. **Picker modals from view** - Verify modals work correctly when opened from a view panel vs. from another modal
2. **Chart data sync** - After save, ensure chart visualization updates if displayed data changes
3. **Property aliases** - Respect user's property alias settings when reading/writing frontmatter

## Phases

### Phase 1: Simple Fields
- Add alt name text field (extends existing view-mode display)
- Add pronouns text field
- Add occupation text field
- Test save/load

### Phase 2: Places
- Add birth place with PlacePickerModal
- Add death place with PlacePickerModal
- Test save/load

### Phase 3: Relationships
- Add father picker
- Add mother picker
- Add step-parents multi-picker
- Add adoptive parents multi-picker
- Add gender-neutral parents multi-picker
- Add spouses multi-picker
- Add children multi-picker
- Test bidirectional relationship sync

### Phase 4: Sources & Metadata
- Add sources multi-picker
- Add research level dropdown
- Add collection field
- Test save/load

## Decisions

1. **Step/adoptive parents** — Yes. Support step-parents, adoptive parents, and gender-neutral parents (for worldbuilders) in Phase 3.
2. **Relationship editing safety** — No confirmation dialog. Bidirectional linker handles sync automatically. The full Edit Person modal doesn't have one either, and Obsidian's Ctrl+Z provides a safety net.
3. **Panel width** — Start with compact layout, evaluate during testing. Make adjustable if needed.
4. **Undo support** — Cancel discards all changes (current behavior). No individual field tracking — the panel should stay lightweight.

## Success Criteria

- All fields from Create/Edit Person modal are available in info panel
- Picker modals work correctly from panel context
- Changes persist correctly to markdown frontmatter
- Panel remains usable and scrolls smoothly
- No regression in existing edit functionality
