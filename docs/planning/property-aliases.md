# Property Aliases Planning Document

## Overview

Property Aliases allow users to map custom frontmatter property names to Canvas Roots' expected fields. This enables compatibility with existing vaults, other plugins, and personal naming preferences without requiring users to rename their existing properties.

## Motivation

A community member requested the ability to use custom property names:

> "Can I use 'birthdate' instead of 'born'? My vault already has hundreds of notes with 'birthdate'."

Currently, Canvas Roots requires specific property names (`born`, `died`, `father`, `mother`, etc.). Users with established vaults or those using other plugins with different conventions face a difficult choice:
1. Rename all existing properties (potentially breaking other workflows)
2. Maintain duplicate properties (error-prone and tedious)
3. Not use Canvas Roots

Property Aliases solves this by allowing users to define mappings like `birthdate → born` without changing their actual frontmatter.

## Design

### Alias Configuration

Aliases are configured in plugin settings, stored as a mapping object:

```typescript
interface PropertyAliases {
  // Maps user's property name → Canvas Roots internal name
  [userProperty: string]: string;
}

// Example settings
{
  propertyAliases: {
    "birthdate": "born",
    "deathdate": "died",
    "father_name": "father",
    "mother_name": "mother",
    "spouse_name": "spouse",
    "birthplace": "birth_place"
  }
}
```

### Supported Properties

Initial support for core genealogical fields:

| Canvas Roots Property | Common Alternatives |
|-----------------------|---------------------|
| `born` | birthdate, birth_date, dob, date_of_birth |
| `died` | deathdate, death_date, dod, date_of_death |
| `father` | father_name, dad, père |
| `mother` | mother_name, mom, mère |
| `spouse` | spouse_name, partner, husband, wife |
| `birth_place` | birthplace, place_of_birth |
| `death_place` | deathplace, place_of_death |
| `gender` | sex |
| `cr_id` | id, person_id, uuid |

### Resolution Logic

When reading a person note:

1. Check for Canvas Roots' canonical property name first
2. If not found, check configured aliases
3. First matching alias wins (order not guaranteed)
4. If both canonical and alias exist, canonical takes precedence

```typescript
function resolveProperty(frontmatter: any, property: string, aliases: PropertyAliases): any {
  // Canonical property takes precedence
  if (frontmatter[property] !== undefined) {
    return frontmatter[property];
  }

  // Check aliases
  for (const [userProp, canonicalProp] of Object.entries(aliases)) {
    if (canonicalProp === property && frontmatter[userProp] !== undefined) {
      return frontmatter[userProp];
    }
  }

  return undefined;
}
```

### UI Design

#### Settings Location

Add "Property aliases" card to Preferences tab in Control Center.

#### Settings UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Property aliases                                           [?]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Map your custom property names to Canvas Roots fields.         │
│ Your frontmatter stays unchanged - Canvas Roots reads your     │
│ property names and treats them as the mapped field.            │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Your property      │ Maps to           │ Actions            │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ birthdate          │ born              │ [✎] [🗑]           │ │
│ │ deathdate          │ died              │ [✎] [🗑]           │ │
│ │ father_name        │ father            │ [✎] [🗑]           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [+ Add alias]                                                   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ℹ️ Tip: If both your alias and the Canvas Roots property    │ │
│ │ exist in a note, the Canvas Roots property takes precedence │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Add Alias Modal

```
┌─────────────────────────────────────────────────┐
│ Add property alias                              │
├─────────────────────────────────────────────────┤
│                                                 │
│ Your property name                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ birthdate                                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Maps to Canvas Roots property                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ born                                    [▼] │ │
│ └─────────────────────────────────────────────┘ │
│ (dropdown with: born, died, father, mother,     │
│  spouse, birth_place, death_place, gender,      │
│  cr_id, name, nickname, maiden_name, universe)  │
│                                                 │
│                    [Cancel]  [Add alias]        │
└─────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Core Alias System

1. Add `propertyAliases` to plugin settings schema
2. Create `PropertyAliasService` with resolution logic
3. Update `PersonService.getPersonData()` to use alias resolution
4. Add settings UI to Preferences tab

### Phase 2: Integration Points

Update all code paths that read person properties:
- Tree generation (canvas and Excalidraw)
- Family Chart View
- Control Center displays
- Import/export (GEDCOM, CSV, etc.)
- Bases templates
- Schema validation
- Data Quality checks

### Phase 3: Advanced Features (Future)

- Alias presets (e.g., "Gramps compatibility", "GEDCOM style")
- Bidirectional aliases (write back to user's property name)
- Collection-scoped aliases
- Alias migration wizard ("Convert aliases to canonical")

## Considerations

### Write Behavior

**Initial implementation**: Read-only aliases
- Canvas Roots reads from aliased properties
- Any writes (from modals, import, etc.) use canonical names
- User's aliased properties remain unchanged

**Future enhancement**: Bidirectional option
- Setting to write back to user's property name
- Useful for users who want to maintain their naming scheme

### Conflicts

If a note has both the canonical property AND an aliased property:
- Canonical wins (consistent, predictable behavior)
- Optionally: Data Quality warning about redundant properties

### Performance

- Alias resolution adds minimal overhead (simple object lookup)
- Cache resolved aliases per note if performance becomes an issue

### Migration

Users with existing aliased vaults don't need to change anything - just configure aliases once and Canvas Roots works with their existing data.

## Related Documentation

- [Frontmatter Reference](https://github.com/banisterious/obsidian-canvas-roots/wiki/Frontmatter-Reference) - Canonical property names
- [Getting Started](https://github.com/banisterious/obsidian-canvas-roots/wiki/Getting-Started) - Initial setup

## Success Criteria

- [ ] Users can define custom property aliases in settings
- [ ] All Canvas Roots features work correctly with aliased properties
- [ ] Canonical properties take precedence over aliases
- [ ] No changes required to user's existing frontmatter
- [ ] Clear documentation of supported aliases
- [ ] Import/export respects aliases appropriately
