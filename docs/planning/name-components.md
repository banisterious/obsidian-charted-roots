# Plan: Name Components Support

- **Status:** Implemented (v0.19.7)
- **GitHub Issues:** [#174](https://github.com/banisterious/obsidian-charted-roots/issues/174), [#192](https://github.com/banisterious/obsidian-charted-roots/issues/192)
- **GitHub Discussion:** [#171](https://github.com/banisterious/obsidian-charted-roots/discussions/171), [#190](https://github.com/banisterious/obsidian-charted-roots/discussions/190)

---

## Overview

Support explicit name component properties in frontmatter to handle:

1. **Multiple surnames** (#174): Hispanic, Portuguese, and other multi-surname naming conventions
2. **Maiden/married names** (#190): Tracking birth surnames and married surnames separately

These features share common infrastructure (property definitions, statistics, Split Wizard, GEDCOM) and were implemented together for consistency.

## Implementation Summary

### Frontmatter Properties

| Property | Type | Description | Use Case |
|----------|------|-------------|----------|
| `given_name` | string | First/given name(s) | GEDCOM GIVN tag |
| `surnames` | string[] | Surnames (one or more) | All naming conventions |
| `maiden_name` | string | Birth surname | Already existed with aliases |
| `married_names` | string[] | Married surname(s) | Supports multiple marriages |

**Note:** We simplified the API by using only array properties (`surnames`, `married_names`) rather than having both singular and plural forms. This reduces complexity without sacrificing functionality—a single surname is just an array with one element.

### Naming Convention Examples

**Convention A: Married name as primary (traditional)**
```yaml
name: "Jane Smith"           # Current/married name
maiden_name: "Jones"         # Birth surname
```

**Convention B: Maiden name as primary (stable identifier)**
```yaml
name: "Jane Jones"           # Birth name (stable)
married_names:               # Married surnames
  - "Smith"
  - "Williams"               # Supports multiple marriages
```

**Convention C: Hispanic dual surnames**
```yaml
name: "José García López"
surnames:
  - García                   # Paternal surname
  - López                    # Maternal surname
```

**Convention D: Compound surname**
```yaml
name: "Maria da Silva"
surnames:
  - "da Silva"               # Explicit to avoid parsing errors
```

### Property Priority for Statistics

When computing surname statistics via `extractSurnames()`:

1. If `surnames` array exists → count each surname
2. Else if `maiden_name` exists → count that (for maiden-name-primary users)
3. Else → fall back to parsing last word from `name`

## Implementation Details

### Phase 1: Core Properties & Statistics ✅

- **Property aliases** (`src/core/property-alias-service.ts`): Added `given_name`, `surnames`, `married_names`
- **Name utilities** (`src/utils/name-utils.ts`): Created `extractSurnames()`, `extractAllSurnames()`, `matchesSurname()`
- **Statistics service** (`src/statistics/services/statistics-service.ts`): Uses `extractSurnames()` for Top Surnames
- **PersonNode type** (`src/core/family-graph.ts`): Added `givenName`, `surnames`, `maidenName`, `marriedNames`
- **Family graph parsing** (`src/core/family-graph.ts`): Parses name components from frontmatter

### Phase 2: Split Wizard Integration ✅

- **Surname matching** (`src/ui/split-wizard-modal.ts`): Uses `matchesSurname()` for comprehensive matching against all surname variants

### Phase 3: GEDCOM Import ✅

- **GEDCOM importer** (`src/gedcom/gedcom-importer-v2.ts`): Writes `given_name` and `surnames` from GEDCOM GIVN/SURN tags
- **Person note writer** (`src/core/person-note-writer.ts`): Supports writing all name component properties

### Phase 4: UI Modals ✅

- **Create/Edit Person modal** (`src/ui/create-person-modal.ts`): Added fields for given name, surnames, maiden name, married names
- **Context menu edit** (`main.ts`): Fixed to pass name components to edit modal

### Phase 5: GEDCOM Export ✅

- **GEDCOM exporter** (`src/gedcom/gedcom-exporter.ts`): Exports `givenName` to GIVN tag, `surnames` to SURN tag

## Key Files Modified

| File | Changes |
|------|---------|
| `src/utils/name-utils.ts` | **New** - Shared surname extraction utilities |
| `src/core/property-alias-service.ts` | Added name component property definitions |
| `src/core/family-graph.ts` | Added PersonNode properties, frontmatter parsing |
| `src/statistics/services/statistics-service.ts` | Uses `extractSurnames()` |
| `src/ui/split-wizard-modal.ts` | Uses `matchesSurname()` for matching |
| `src/gedcom/gedcom-importer-v2.ts` | Writes name components to frontmatter |
| `src/core/person-note-writer.ts` | Supports writing name components |
| `src/ui/create-person-modal.ts` | Added name component input fields |
| `src/ui/control-center.ts` | Passes name components to edit modal |
| `main.ts` | Context menu passes name components to edit modal |
| `src/gedcom/gedcom-exporter.ts` | Exports name components to GEDCOM tags |

## Test Cases

### Statistics

| Person Name | surnames | maiden_name | Expected Counts |
|-------------|----------|-------------|-----------------|
| José García López | ["García", "López"] | - | García +1, López +1 |
| Maria da Silva | ["da Silva"] | - | da Silva +1 |
| John Smith | - | - | Smith +1 (parsed) |
| Jane Smith | - | "Jones" | Jones +1 (maiden primary) |

### Split Wizard Surname Matching

| Person | surnames | maiden_name | married_names | Matches "Jones"? |
|--------|----------|-------------|---------------|------------------|
| Jane Smith | - | "Jones" | - | Yes |
| Jane Jones | - | - | ["Smith"] | Yes (matches "Jones" from name) |

### GEDCOM Round-Trip

Import:
```gedcom
1 NAME José /García López/
2 GIVN José
2 SURN García López
```

Produces:
```yaml
name: "José García López"
given_name: "José"
surnames:
  - "García López"
```

Export uses explicit `surnames` if available, otherwise parses from name.

## Edge Cases Handled

1. **Compound surnames with particles**: "da Silva", "van der Berg" - use explicit `surnames` array
2. **Hyphenated surnames**: "García-López" - treat as single surname in array
3. **Empty surname**: Single names work gracefully (fallback returns empty array)
4. **Mixed data**: People with/without explicit surnames both work
5. **Case sensitivity**: Normalized for counting, preserved for display
6. **YAML arrays**: Handles both array format and single string (converted to array)

## Future Considerations

- **Naming convention setting**: Default parsing behavior (Western, Hispanic, etc.)
- **Patronymic systems**: Icelandic, Russian - different patterns entirely
- **Display preferences**: "García López, José" vs "José García López"
- **Name change timeline**: Track when names changed (marriage dates, etc.)
- **Prefix/suffix support**: "Dr.", "Jr.", "III", etc.

## References

- [World naming conventions map](https://github.com/banisterious/obsidian-charted-roots/discussions/171) (attached to discussion)
- [Discussion #190: Naming conventions for married women](https://github.com/banisterious/obsidian-charted-roots/discussions/190)
- GEDCOM 5.5.1: NAME structure with GIVN and SURN subtags
