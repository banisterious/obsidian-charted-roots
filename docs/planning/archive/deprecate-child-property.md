# Deprecate `child` Property in Favor of `children`

**Status:** Complete
**Issue:** #65
**Priority:** Medium
**Target Release:** v0.18.11

## Problem

The codebase has inconsistent naming for the children wikilink property:
- `child` (singular) - legacy, used by some older code paths
- `children` (plural) - preferred, matches `children_id`

This causes duplicate properties to appear in YAML when both systems write to the same note.

## Current State (v0.18.9)

### Already Fixed
- `BidirectionalLinker` now writes to `children` (was `child`)
- `person-note-writer` writes to `children` and removes legacy `child`
- `control-center` deduplication migrates `child` → `children`
- All read operations check both properties for backward compatibility

### Remaining Work

None — all work completed in v0.18.11.

## Import/Export Audit (2024-12-30)

All import/export code paths were audited. **No changes needed.**

### GEDCOM (gedcom-parser.ts, gedcom-importer-v2.ts, gedcom-exporter.ts)
- Uses `child` only as a **variable name** (e.g., `const child = ...`)
- Works with internal `GedcomIndividual` data structures
- Writes to frontmatter via `person-note-writer` which uses `children`

### Gramps (gramps-parser.ts, gramps-importer.ts, gramps-exporter.ts)
- Uses `child` only as a **variable name**
- Works with internal `GrampsPerson` data structures
- Writes to frontmatter via `person-note-writer` which uses `children`

### GedcomX (gedcomx-parser.ts, gedcomx-importer.ts, gedcomx-exporter.ts)
- Uses `child` only as a **variable name**
- Works with internal data structures
- Writes to frontmatter via `person-note-writer` which uses `children`

### CSV (csv-parser.ts, csv-importer.ts, csv-exporter.ts)
- No `child` usage at all

### Files Still Reading `child` Property (for backward compatibility)
These read BOTH `child` and `children` to support legacy data:
- `main.ts:5161-5162` - Reads `fm.child` for backward compatibility
- `control-center.ts` - Dedup operations check both properties
- `bidirectional-linker.ts:283` - Reads `frontmatter.children || frontmatter.child`
- `family-graph.ts:1386` - Reads `child` field for backward compatibility
- `base-template.ts:71` - Obsidian Bases template supports `child` property

### Files That Map/Reference `child` Property
- `merge-service.ts:317` - Maps `'child': 'children_id'` for merge operations
- `property-alias-service.ts:51, 202, 485` - Lists `child` as an aliasable property

## Implementation Notes

### Cleanup Wizard Step 14

```typescript
// In cleanup-wizard-modal.ts, add step:
{
  id: 'child-to-children',
  number: 14,
  title: 'Normalize Children Property',
  shortTitle: 'Children',
  description: 'Rename legacy "child" property to "children" for consistency.',
  type: 'batch',
  // Custom implementation - simpler than a full service
}
```

### Detection Logic

```typescript
function detectLegacyChildProperty(): TFile[] {
  const files: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.frontmatter?.child) {
      files.push(file);
    }
  }
  return files;
}
```

### Migration Logic

```typescript
await app.fileManager.processFrontMatter(file, (fm) => {
  if (fm.child) {
    // Merge with existing children if both exist
    const childValue = fm.child;
    const childrenValue = fm.children;

    if (childrenValue) {
      // Merge arrays, deduplicate
      const merged = [...new Set([
        ...(Array.isArray(childrenValue) ? childrenValue : [childrenValue]),
        ...(Array.isArray(childValue) ? childValue : [childValue])
      ])];
      fm.children = merged.length === 1 ? merged[0] : merged;
    } else {
      fm.children = childValue;
    }

    delete fm.child;
  }
});
```

## Timeline

- v0.18.9: Core fix implemented (BidirectionalLinker, person-note-writer)
- v0.18.11: Add Cleanup Wizard step for batch migration + wiki documentation
- Future: Consider removing `child` read support (breaking change)

## Files Changed

### v0.18.9 (completed)
- `src/core/bidirectional-linker.ts` - Write to `children`, read both
- `src/core/person-note-writer.ts` - Write to `children`, delete `child`
- `src/ui/control-center.ts` - Dedup migrates `child` → `children`

### v0.18.11 (completed)
- `src/ui/cleanup-wizard-modal.ts` - Added Step 14 with detection, preview, and migration
- `wiki-content/Frontmatter-Reference.md` - Updated `children` as canonical, added deprecation note for `child`
- Fixed hardcoded step count (10) to use `WIZARD_STEPS.length` for extensibility
