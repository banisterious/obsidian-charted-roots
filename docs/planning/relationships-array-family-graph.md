# Relationships Array in Family Graph

Planning document for integrating the `relationships` array with the family graph and canvas tree generation.

**Status:** Planning
**GitHub Issue:** #TBD
**Priority:** Low
**Created:** 2025-12-27
**Updated:** 2025-12-27

---

## Overview

Currently, the family graph and canvas tree generation only read direct frontmatter properties (`stepfather`, `adoptive_father`, etc.) and do not parse the `relationships` array. Users who define step-parents or adoptive parents via the relationships array don't see them on canvas trees.

**User report:** "i have noticed that you've stated that step and adoptive parents appear on the family view and canvas but based on my usage it doesnt seem to be the case? i suspect it's because to indicate that you have to use the relationships array and it's simply not rendering that"

---

## Current State

### What FamilyGraphService Reads

| Property | Supported | Notes |
|----------|-----------|-------|
| `father` / `father_id` | Yes | Biological father |
| `mother` / `mother_id` | Yes | Biological mother |
| `stepfather` / `stepfather_id` | Yes | Can be array for multiple |
| `stepmother` / `stepmother_id` | Yes | Can be array for multiple |
| `adoptive_father` / `adoptive_father_id` | Yes | Single value |
| `adoptive_mother` / `adoptive_mother_id` | Yes | Single value |
| `spouse` / `spouse_id` | Yes | Can be array |
| `children` / `children_id` | Yes | Can be array |
| `relationships` array | **No** | Not parsed |

### What RelationshipService Parses

The `relationships` array is already parsed by `RelationshipService` for the Relationships dynamic block and statistics. The array format is:

```yaml
relationships:
  - type: adoptive_parent
    target: "[[John Doe]]"
    target_id: person_abc123
    from: 1850
    to: 1875
    notes: "Adopted after parents died"
```

### Built-in Relationship Types (Family-Relevant)

| Type ID | Name | Inverse | Category |
|---------|------|---------|----------|
| `step_parent` | Step-parent | `step_child` | legal |
| `step_child` | Step-child | `step_parent` | legal |
| `adoptive_parent` | Adoptive parent | `adopted_child` | legal |
| `adopted_child` | Adopted child | `adoptive_parent` | legal |
| `foster_parent` | Foster parent | `foster_child` | legal |
| `foster_child` | Foster child | `foster_parent` | legal |
| `guardian` | Guardian | `ward` | legal |
| `ward` | Ward | `guardian` | legal |

---

## Proposed Implementation

### Phase 1: Parse Relationships Array in FamilyGraphService

Extend `parsePersonFromFrontmatter()` to also check the `relationships` array for parent-type relationships.

**Mapping logic:**

| Relationship Type | Target Gender | Maps To |
|-------------------|---------------|---------|
| `step_parent` | male | `stepfatherCrIds` |
| `step_parent` | female | `stepmotherCrIds` |
| `step_parent` | unknown/other | `stepfatherCrIds` (or new generic array) |
| `adoptive_parent` | male | `adoptiveFatherCrId` |
| `adoptive_parent` | female | `adoptiveMotherCrId` |
| `foster_parent` | any | New: `fosterParentCrIds` |
| `guardian` | any | New: `guardianCrIds` |

**Gender detection:** Look up the target person's `gender` property to determine stepfather vs stepmother.

**Implementation location:** `src/core/family-graph.ts`, around line 1264 after adoptive parent parsing.

### Phase 2: Add Foster Parent and Guardian Support

Extend `FamilyGraphNode` interface:

```typescript
// Foster parent relationships
fosterFatherCrId?: string;
fosterMotherCrId?: string;
// OR generic:
fosterParentCrIds: string[];

// Guardian relationships
guardianCrIds: string[];
```

Update tree traversal methods to include these relationships (with distinct edge types and styling).

### Phase 3: Settings for Tree Inclusion

Add settings to control which relationship types appear on canvas trees:

```typescript
// In settings
treeIncludeStepParents: boolean;      // default: true (already supported)
treeIncludeAdoptiveParents: boolean;  // default: true (already supported)
treeIncludeFosterParents: boolean;    // default: false
treeIncludeGuardians: boolean;        // default: false
```

### Phase 4: Canvas Tree Styling

Use relationship type definitions (`lineStyle`, `color`) to style edges on canvas trees:
- Step-parents: dashed line (already implemented)
- Adoptive parents: dotted line (already implemented)
- Foster parents: solid line, different color
- Guardians: dashed line, different color

---

## Technical Details

### Files to Modify

**Phase 1:**
- `src/core/family-graph.ts`
  - Import `RelationshipService` or directly parse `relationships` array
  - Extend `parsePersonFromFrontmatter()` to check relationships array
  - Add helper to resolve target person's gender

**Phase 2:**
- `src/core/family-graph.ts`
  - Add `fosterParentCrIds` and `guardianCrIds` to `FamilyGraphNode`
  - Update `collectAncestors()` and `collectFullTree()` to traverse new relationships
  - Update edge creation with appropriate `relationshipTypeId`

**Phase 3:**
- `src/settings.ts` - Add tree inclusion settings
- `src/ui/control-center.ts` - Add settings UI
- `src/core/family-graph.ts` - Check settings when collecting relationships

**Phase 4:**
- `src/core/canvas-generator.ts` - Use relationship type styling for edges

### Considerations

1. **Performance:** Parsing relationships array adds iteration. Should be minimal impact since it's already iterated for RelationshipService.

2. **Bidirectional resolution:** If Alice has `relationships: [{type: step_parent, target: "[[Bob]]"}]`, should Bob automatically show Alice as step-child on his tree? Currently no — this would require inverse relationship resolution.

3. **Duplicate handling:** If someone specifies both `stepfather: "[[Bob]]"` AND `relationships: [{type: step_parent, target: "[[Bob]]"}]`, should deduplicate.

4. **Custom relationship types:** Users can define custom relationship types. Should only family-relevant types (categories: `family`, `legal`) be considered for tree inclusion?

---

## Workaround (Current)

Until this is implemented, users should use direct properties instead of the relationships array:

```yaml
# Instead of:
relationships:
  - type: adoptive_parent
    target: "[[John Doe]]"

# Use:
adoptive_father: "[[John Doe]]"
# or
adoptive_mother: "[[John Doe]]"
```

---

## Open Questions

1. **Foster parents on trees?** Should foster parents appear on canvas trees by default, or only when explicitly enabled?

2. **Guardians on trees?** Guardians are often temporary/legal rather than familial. Should they appear on family trees at all, or only on a separate "legal relationships" view?

3. **Custom parent types?** If a user defines a custom relationship type like `milk_mother` (wet nurse who also acts as surrogate mother), should there be a way to mark it as "include on family tree"?

---

## References

- [Custom Relationships on Canvas Trees](../wiki-content/Roadmap.md#custom-relationships-on-canvas-trees) - Related roadmap item
- `src/core/family-graph.ts` - Family graph service
- `src/relationships/services/relationship-service.ts` - Relationship parsing
- `src/relationships/constants/default-relationship-types.ts` - Built-in types
