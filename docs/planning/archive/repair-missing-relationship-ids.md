# Repair Missing Relationship IDs

Planning document for [#197](https://github.com/banisterious/obsidian-charted-roots/issues/197).

---

## Overview

When users edit relationships through Obsidian Bases or directly in YAML, they can add wikilinks (like `father: [[John Smith]]`) but the corresponding `_id` field (`father_id`) stays empty. Since the plugin treats IDs as authoritative for tree rendering, this breaks the family tree display.

This feature adds:
1. **Detection** — A new data quality check that identifies missing `_id` fields
2. **Repair** — A batch operation to auto-populate missing IDs by resolving wikilinks

**Design Philosophy:**
- Repair/migration tool, not real-time sync
- Conservative: only fix unambiguous cases
- Preview before applying changes
- Integrate with existing Data Quality infrastructure

---

## Problem Statement

### The Dual Storage Pattern

Charted Roots uses a dual storage pattern for relationships:

```yaml
# Wikilink for human readability and Obsidian graph
father: "[[John Smith]]"
# cr_id for reliable programmatic resolution
father_id: "cr-abc123"
```

The wikilink provides:
- Human-readable links in the note
- Obsidian's graph view integration
- Quick navigation

The `_id` field provides:
- Rename-proof references
- Unambiguous resolution (handles duplicate basenames)
- Fast lookup without file system traversal

### When IDs Go Missing

IDs can become missing when:
1. **Bases editing** — User adds wikilink in table view, but `_id` column isn't visible/edited
2. **Manual YAML editing** — User adds wikilink directly, forgets the `_id`
3. **CSV import** — Data source only has names, not IDs
4. **Template usage** — Template has wikilink placeholders without ID fields

### Impact

When `_id` is missing:
- Tree rendering may fail to include the relationship
- Relationship calculations may be incomplete
- Bidirectional sync may not work correctly

---

## Solution Design

### Part 1: Detection (Data Quality Analysis)

Add a new check to `DataQualityService.analyze()` that identifies:

**`MISSING_RELATIONSHIP_ID`** (severity: `warning`)
- Field has a wikilink value
- Corresponding `_id` field is empty
- Wikilink resolves to a single person with a `cr_id`
- Can be auto-repaired

**`UNRESOLVABLE_RELATIONSHIP_WIKILINK`** (severity: `warning`)
- Field has a wikilink value
- Corresponding `_id` field is empty
- Wikilink cannot be resolved (broken link, missing target, or target has no `cr_id`)
- Requires manual intervention

**`AMBIGUOUS_WIKILINK`** (already exists)
- Field has a wikilink value
- Wikilink matches multiple files
- Suggestion to add `_id` field to disambiguate

### Part 2: Repair (Batch Operation)

Add to `NormalizationPreview`:
```typescript
missingIdRepairs: MissingIdRepair[];
```

Where:
```typescript
interface MissingIdRepair {
  person: PersonNode;
  field: string;           // e.g., 'father', 'spouse'
  wikilink: string;        // e.g., '[[John Smith]]'
  resolvedCrId: string;    // e.g., 'cr-abc123'
  targetName: string;      // Display name for preview
}
```

Add `repairMissingIds()` method that:
1. Iterates through all repairable cases from preview
2. For each, adds the `_id` field to frontmatter
3. Returns `BatchOperationResult` with counts and errors

### Part 3: UI Integration

Add to Control Center > Data Quality > Cross-domain Batch Operations:

```
Repair missing relationship IDs
Populate _id fields from resolvable wikilinks
[Preview] [Apply]
```

Follows existing Preview/Apply pattern used by other batch operations.

---

## Relationship Fields to Check

### Core Family Relationships
- `father` / `father_id`
- `mother` / `mother_id`
- `parents` / `parents_id` (array)
- `spouse` / `spouse_id` (array)
- `children` / `children_id` (array)

### Extended Family Relationships
- `stepfather` / `stepfather_id`
- `stepmother` / `stepmother_id`
- `adoptive_father` / `adoptive_father_id`
- `adoptive_mother` / `adoptive_mother_id`
- `adoptive_parent` / `adoptive_parent_id`

### Custom Relationships (Flat Format)
Custom relationships added via Add Relationship modal use the same pattern:
- `mentor` / `mentor_id`
- `godparent` / `godparent_id`
- `dna_match` / `dna_match_id`
- etc.

The repair should handle any field matching the pattern `{field}` + `{field}_id`.

---

## Edge Cases

### Ambiguous Wikilinks
**Scenario:** `[[John Smith]]` matches multiple files in the vault.

**Behavior:**
- Detection: Flag as `AMBIGUOUS_WIKILINK` (existing check)
- Repair: Skip — do not auto-repair ambiguous cases
- User action: Add full path `[[People/John Smith]]` or manually set `_id`

### Broken Wikilinks
**Scenario:** `[[Jane Doe]]` doesn't match any file.

**Behavior:**
- Detection: Flag as `UNRESOLVABLE_RELATIONSHIP_WIKILINK`
- Repair: Skip — cannot repair without valid target
- User action: Create the missing person note or fix the wikilink

### Target Missing cr_id
**Scenario:** `[[John Smith]]` resolves to a file, but that file has no `cr_id`.

**Behavior:**
- Detection: Flag as `UNRESOLVABLE_RELATIONSHIP_WIKILINK` with details
- Repair: Skip — cannot set `_id` without source value
- User action: Add `cr_id` to target note first

### Array Fields
**Scenario:** `children: ["[[Alice]]", "[[Bob]]"]` with `children_id` missing or partial.

**Behavior:**
- Check each wikilink independently
- Build array of resolved IDs for repairable entries
- Preserve existing IDs, only add missing ones
- Handle mixed arrays (some resolved, some not)

### Aliased Wikilinks
**Scenario:** `father: "[[People/John Smith|Dad]]"`

**Behavior:**
- Extract path from wikilink (`People/John Smith`)
- Resolve using path, not display text
- Works correctly with `extractWikilinkPath()` utility

---

## Implementation Details

### Files to Modify

**`src/core/data-quality.ts`**
- Add `checkMissingRelationshipIds()` method
- Call from `analyze()` with new check option
- Add `missingIdRepairs` to `NormalizationPreview`
- Add preview logic in `previewNormalization()`
- Add `repairMissingIds()` method

**`src/ui/control-center.ts`**
- Add UI for "Repair missing relationship IDs" in Data Quality tab
- Wire up Preview/Apply buttons to service methods

### Dependencies

- `PersonIndexService` — For `getCrIdByWikilink()` resolution
- `extractWikilinkPath()` — For parsing wikilink syntax
- `isWikilink()` — For detecting wikilink format

### New Issue Category

Consider adding a new `IssueCategory`:
```typescript
| 'missing_id'  // Missing _id field for relationship
```

Or reuse `'relationship_inconsistency'` since it's related to relationship data quality.

---

## Preview Modal Content

The preview should show:

```
Repair Missing Relationship IDs

Found 12 relationships with missing IDs that can be repaired:

Person              Field      Target           ID to Add
─────────────────────────────────────────────────────────
Alice Johnson       father     John Smith       cr-abc123
Alice Johnson       mother     Mary Smith       cr-def456
Bob Williams        spouse     Carol Williams   cr-ghi789
...

⚠️ 3 relationships could not be resolved:
- Charlie Brown: father [[Unknown Person]] — No matching file
- Diana Prince: spouse [[John Smith]] — Ambiguous (2 matches)
- Eve Adams: mother [[Jane Doe]] — Target has no cr_id
```

---

## Testing Requirements

### Unit Tests

1. **Detection tests:**
   - Detects missing ID when wikilink exists
   - Skips when ID already present
   - Handles array fields correctly
   - Reports unresolvable wikilinks
   - Reports ambiguous wikilinks

2. **Repair tests:**
   - Adds ID field when wikilink resolves
   - Preserves existing frontmatter
   - Handles array fields (partial repair)
   - Skips unresolvable cases
   - Returns accurate counts

### Manual Testing

1. Create person notes with wikilinks but no IDs
2. Run Data Quality analysis → verify issues appear
3. Preview repair → verify correct changes shown
4. Apply repair → verify IDs added correctly
5. Verify tree rendering works after repair

---

## Future Considerations

### Real-time Sync Option
Could add a setting to auto-repair IDs when wikilinks are added. However, this adds complexity and could conflict with user intent. Keep as manual operation for now.

### Bases Integration
Could add a "Repair IDs" button directly in Bases views when missing IDs are detected. Deferred pending user feedback.

### Reverse Repair
Could add option to populate wikilinks from IDs (opposite direction). Lower priority since IDs are the authoritative source.

---

## Status

| Component | Status |
|-----------|--------|
| Planning doc | ✅ Complete |
| Detection implementation | 🔲 Not started |
| Repair implementation | 🔲 Not started |
| UI integration | 🔲 Not started |
| Testing | 🔲 Not started |
| Documentation | 🔲 Not started |

---

## References

- [Issue #197](https://github.com/banisterious/obsidian-charted-roots/issues/197)
- [Data Quality wiki page](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Quality)
- [Frontmatter Reference](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference)
