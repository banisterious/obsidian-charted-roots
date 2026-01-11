# Statistics Dashboard Reorganization

- **Status:** Planning
- **Created:** 2026-01-10
- **Origin:** User feedback from jeff962 in [Discussion #147](https://github.com/banisterious/obsidian-charted-roots/discussions/147)

## Problem Statement

The Statistics Dashboard currently contains "Visual Trees" and "Generate Reports" wizards mixed in with statistical/analytical content. These are action wizards for generating output, not statistics.

As jeff962 noted:
> Having "Visual Trees" and "Generate Reports" tucked in the middle of the Statistics Dashboard seems out of place.

## Proposed Solution

1. **Rename** the existing "Tree Output" tab to "Trees & Reports"
2. **Move** the "Generate Reports" wizard from Statistics to the renamed tab
3. **Keep** Visual Trees wizard in its current location (already in Tree Output)
4. **Result**: Statistics tab becomes purely analytical; Trees & Reports tab consolidates all output generation

## Changes Required

### Tab Rename

| Current | New |
|---------|-----|
| Tree Output | Trees & Reports |

### Content Moves

| Item | From | To |
|------|------|-----|
| Generate Reports wizard | Statistics tab | Trees & Reports tab |
| Visual Trees wizard | Tree Output tab | Trees & Reports tab (stays, tab renamed) |

### Files to Modify

- `src/ui/control-center-modal.ts` - Tab registration, tab name
- `src/ui/statistics-tab.ts` - Remove Generate Reports section
- `src/ui/tree-output-tab.ts` - Add Generate Reports section, update any tab name references
- `docs/developer/project-structure.md` - Update Control Center Tabs documentation

### UI Layout in Trees & Reports Tab

```
Trees & Reports
├── Visual Trees (existing wizard)
│   └── [Canvas/Excalidraw/PNG/SVG generation options]
└── Reports (moved from Statistics)
    └── [Markdown/ODT/PDF report generation options]
```

## Benefits

- Statistics tab becomes focused on analytics only
- Output generation actions are consolidated in one place
- Clearer mental model: "Trees & Reports" = "generate outputs"
- Addresses user feedback about misplaced actions
