# Flatten Nested Properties Feature Plan

## Overview

Add a "Flatten" action to nested property warnings in the Data Quality tab, allowing users to convert non-flat frontmatter structures to flat properties with a before/after preview.

## Motivation

In v0.9.4, we added detection of nested/non-flat frontmatter properties. Users can now see which notes have nested structures, but there's no built-in way to fix them. The Obsidian Linter plugin doesn't address this use case, leaving users to manually edit notes or use external tools.

Example nested structure:
```yaml
coordinates:
  lat: 32.753177
  long: -97.3327459
```

Proposed flattened structure:
```yaml
coordinates_lat: 32.753177
coordinates_long: -97.3327459
```

## Scope

### In Scope

- Per-record "Flatten" button in Data Quality results
- Before/after preview modal
- Underscore-join flattening strategy (`parent_child`)
- Support for simple nested objects (1 level deep)
- Support for arrays of objects
- Collision detection with warnings

### Out of Scope (Future)

- Batch flatten all nested properties at once
- Configurable flattening strategies (camelCase, dot notation)
- Deeply nested structures (3+ levels) - report only, no auto-flatten
- Undo functionality (users can use Obsidian's file history)

## Design

### UI Flow

1. User runs Data Quality analysis
2. Nested property issues appear with category badge "Nested"
3. Each issue has a "Flatten" button (instead of generic "Fix")
4. Clicking "Flatten" opens a modal showing:
   - File name and path
   - **Before**: Current YAML structure (syntax highlighted)
   - **After**: Proposed flattened properties
   - Warning if any key collisions detected
   - "Cancel" and "Apply" buttons
5. User reviews and clicks "Apply" to modify the file
6. Success notice, issue removed from list

### Modal Mockup

```
┌─────────────────────────────────────────────────────┐
│ Flatten nested property                             │
├─────────────────────────────────────────────────────┤
│ File: People/John Smith.md                          │
│                                                     │
│ Before:                                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ coordinates:                                    │ │
│ │   lat: 32.753177                                │ │
│ │   long: -97.3327459                             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ After:                                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ coordinates_lat: 32.753177                      │ │
│ │ coordinates_long: -97.3327459                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⓘ The original nested property will be removed.    │
│                                                     │
│                          [Cancel]  [Apply flatten]  │
└─────────────────────────────────────────────────────┘
```

### Collision Warning Example

```
┌─────────────────────────────────────────────────────┐
│ ⚠ Key collision detected                           │
│                                                     │
│ The property "coordinates_lat" already exists.      │
│ Flattening would overwrite the existing value.      │
│                                                     │
│ Existing: 32.0                                      │
│ New:      32.753177                                 │
│                                                     │
│                          [Cancel]  [Apply anyway]   │
└─────────────────────────────────────────────────────┘
```

### Flattening Strategy

**Underscore join**: `parentKey_childKey`

| Nested Structure | Flattened Properties |
|-----------------|---------------------|
| `coordinates: { lat: 32, long: -97 }` | `coordinates_lat: 32`, `coordinates_long: -97` |
| `address: { city: "Austin", state: "TX" }` | `address_city: "Austin"`, `address_state: "TX"` |
| `events: [{ type: "birth", date: "1900" }]` | `events_0_type: "birth"`, `events_0_date: "1900"` |

### Edge Cases

| Case | Behavior |
|------|----------|
| **Key collision** | Show warning, allow user to proceed or cancel |
| **Deeply nested (3+ levels)** | Only flatten top 2 levels, leave rest as-is |
| **Array of objects** | Use indexed keys: `prop_0_key`, `prop_1_key` |
| **Empty nested object** | Remove the property entirely |
| **Mixed array** | Skip non-object items in array |

## Implementation

### Files to Modify

- `src/core/data-quality.ts` - Add `flattenNestedProperty()` method
- `src/ui/control-center.ts` - Add "Flatten" button to issue rows
- `src/ui/flatten-modal.ts` - New modal for before/after preview

### New Modal Class

```typescript
class FlattenPropertyModal extends Modal {
  private file: TFile;
  private propertyName: string;
  private nestedValue: unknown;
  private onSuccess: () => void;

  // Shows before/after preview
  // Detects collisions
  // Applies changes on confirm
}
```

### Flattening Logic

```typescript
function flattenObject(
  obj: Record<string, unknown>,
  prefix: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = `${prefix}_${key}`;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse for nested objects (limit depth)
      Object.assign(result, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      // Handle arrays
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          Object.assign(result, flattenObject(item, `${newKey}_${index}`));
        } else {
          result[`${newKey}_${index}`] = item;
        }
      });
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
```

## Testing

### Test Cases

1. Simple nested object (coordinates with lat/long)
2. Nested object with multiple keys
3. Array of objects
4. Key collision scenario
5. Empty nested object
6. Deeply nested structure (should partially flatten)
7. Cancel operation (no changes made)

### Manual Testing

1. Create test note with nested frontmatter
2. Run Data Quality analysis
3. Verify "Flatten" button appears
4. Click and verify preview is correct
5. Apply and verify file is updated
6. Re-run analysis to confirm issue is resolved

## Future Enhancements

- **Batch mode**: "Flatten all" button for multiple issues
- **Strategy options**: Let users choose camelCase, dot notation, etc.
- **Preserve comments**: Maintain YAML comments during transformation
- **Smart detection**: Recognize common patterns (coordinates) and suggest appropriate handling

## Related

- [Nested Property Detection](../src/core/data-quality.ts) - v0.9.4 implementation
- [Data Quality Tab](../src/ui/control-center.ts) - UI for displaying issues
