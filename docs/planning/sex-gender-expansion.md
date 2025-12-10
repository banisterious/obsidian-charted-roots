# Sex/Gender Identity Expansion - Implementation Plan

## Overview

More inclusive handling of sex and gender for writers and worldbuilders, while maintaining GEDCOM compatibility for genealogists. This feature leverages the existing Schema system for custom value definitions and extends Value Aliases to support the sex field.

## Motivation

User feedback prompted consideration of how the plugin handles non-binary sex/gender scenarios:

1. **Fiction writers** creating characters may want gender identity fields separate from biological sex
2. **Worldbuilders** creating non-human species need custom sex categories (hermaphrodite, asexual, etc.)
3. **Genealogists** need GEDCOM-standard M/F values for historical record compatibility

The plugin should serve all three user personas without forcing any group to compromise.

## Current State

- The `sex` field follows GEDCOM standards (M/F) for historical record compatibility
- The "Normalize sex values" batch operation standardizes variations to M/F
- Unrecognized values (e.g., "hermaphrodite") are shown in preview but not changed
- The Schema system already supports `enum` types with custom values per universe/collection

## User Personas

| Persona | Use Case |
|---------|----------|
| **Genealogist** | GEDCOM M/F for historical records; optionally `gender_identity` for living relatives or LGBTQ+ research |
| **Fiction writer / Worldbuilder** | Custom sex values via Schema, `gender_identity` field, flexible normalization |

## Phased Approach

### Phase 1: Separate `gender_identity` Field

**Complexity:** Low (~50-100 lines)

Add optional `gender_identity` field to person notes, distinct from biological `sex`.

**Changes:**
- Add `gender_identity` to person note schema documentation
- Display in People tab person details
- Include in CSV export (new column)
- Add to create person modal as optional field

**No changes to:**
- Tree visualization (continues to use `sex` for colors)
- GEDCOM export (no standard field for gender identity)

**Respectful handling of trans individuals:**

When documenting trans family members or historical figures, users may need to track both legal/historical records and current identity. The plugin should support this respectfully:

- `name` field holds the person's chosen/current name (displayed by default)
- Optional `birth_name` field can hold the name from birth records if needed for research
- `gender_identity` captures current identity; `sex` captures what appears on historical records
- UI and exports should prioritize `name` over `birth_name` by default
- Export privacy options should allow excluding `birth_name` and `sex` fields
- Search should find the person by either name

This approach allows genealogists to maintain accurate historical documentation while respecting individuals' identities. The goal is to support research needs without forcing users to deadname individuals in everyday use.

### Phase 2: Schema-Based Sex/Gender Definitions

**Complexity:** Already done

The Schema system already supports this. A worldbuilder can create a schema today:

```yaml
---
cr_type: schema
cr_id: schema-alien-species
name: Alien Species Schema
applies_to_type: universe
applies_to_value: "Sci-Fi Universe"
---

# Alien Species Schema

Validation rules for alien species with non-binary biological sex.

```json schema
{
  "properties": {
    "sex": {
      "type": "enum",
      "values": ["male", "female", "neuter", "hermaphrodite", "asexual"],
      "description": "Biological sex for this species"
    }
  }
}
```

**Documentation needed:**
- Add example to Schema wiki documentation
- Create template schema for worldbuilders

### Phase 3: Value Aliases for Sex Field

**Status:** ✅ Complete (v0.9.4, enhanced v0.10.19)

**Complexity:** Low-Medium (~100-150 lines)

Value Aliases already support the `sex` field with 4 canonical values.

**Implemented Value Alias fields:**
- Event type (13 canonical values)
- Sex (4 canonical values: male, female, nonbinary, unknown)
- Place category (6 canonical values)
- Note type (8 canonical values)

**Implementation:**
- `sex` is included in `ValueAliasField` type
- `CANONICAL_SEX_VALUES = ['male', 'female', 'nonbinary', 'unknown'] as const`
- Unified Property Configuration UI (v0.10.19) provides sex value alias configuration
- Built-in synonyms: m→male, f→female, man→male, woman→female, nb→nonbinary, enby→nonbinary

**Example aliases:**
| User Value | Maps To |
|------------|---------|
| `m` | `male` (built-in) |
| `f` | `female` (built-in) |
| `nb` / `enby` | `nonbinary` (built-in) |
| Custom values | (user-configurable aliases) |

### Phase 4: Configurable Normalization

**Complexity:** Medium (~200-300 lines)

Make batch normalization operations schema-aware.

**Current behavior:**
- "Normalize sex values" batch operation standardizes all values to M/F
- No consideration of schema-defined allowed values

**Proposed behavior:**
1. **New setting:** `sexNormalizationMode`
   - `standard` (default): Normalize to M/F per GEDCOM standard
   - `schema-aware`: Skip normalization for notes with applicable schemas
   - `disabled`: Never normalize sex values

2. **Schema-aware normalization:**
   - Check if person note has an applicable schema
   - If schema defines custom `sex` enum values, skip normalization
   - Otherwise, apply standard M/F normalization

3. **Batch preview enhancement:**
   - Show which notes would be skipped due to schema
   - Add "(schema override)" indicator for skipped notes

**Settings UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Sex value normalization                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Standard (GEDCOM M/F)                              [▼] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ • Standard: Normalize all sex values to M/F                 │
│ • Schema-aware: Respect schema-defined values               │
│ • Disabled: Never normalize sex values                      │
└─────────────────────────────────────────────────────────────┘
```

## Files to Modify

### Phase 1
| File | Changes |
|------|---------|
| `wiki-content/Person-Notes.md` | Document `gender_identity` field |
| `src/ui/control-center.ts` | Display in People tab person details |
| `src/csv/csv-exporter.ts` | Add `gender_identity` column |
| `src/ui/create-person-modal.ts` | Add optional field |

### Phase 3
| File | Changes |
|------|---------|
| `src/core/value-alias-service.ts` | Add `sex` to ValueAliasField, add CANONICAL_SEX_VALUES |
| `src/ui/preferences-tab.ts` | Add Sex to value alias modal field dropdown |
| `src/core/family-graph.ts` | Integrate sex alias resolution |

### Phase 4
| File | Changes |
|------|---------|
| `src/settings.ts` | Add `sexNormalizationMode` setting |
| `src/core/data-quality.ts` | Make `getNormalizedGenderChanges` schema-aware |
| `src/ui/control-center.ts` | Update batch preview for schema overrides |
| `src/ui/preferences-tab.ts` | Add normalization mode setting |
| `src/schemas/services/schema-service.ts` | Add method to check schema sex values |

## Export Considerations

| Format | Gender Identity | Custom Sex Values |
|--------|-----------------|-------------------|
| GEDCOM 5.5.1 | Not exported (no standard field) | Map to SEX M/F/U or skip |
| GEDCOM 7.0 | Not exported | May have extension mechanism |
| GEDCOM X | Could use custom fact type | Map to enum or extension |
| Gramps XML | Could use attribute | Map to gender enum |
| CSV | New column | Pass through as-is |

**Recommendation:** Non-standard sex values should:
1. Be preserved in the vault
2. Generate a warning on export to GEDCOM
3. Map to `unknown` (U) in GEDCOM export with note in description

## Implementation Order

1. **Phase 2 (documentation)** - No code changes, just wiki updates
2. **Phase 1** - Add `gender_identity` field
3. **Phase 3** - Extend Value Aliases
4. **Phase 4** - Configurable normalization

Rationale: Phase 2 is free (already works), Phase 1 is standalone, Phases 3-4 build on each other.

## Success Criteria

- [ ] `gender_identity` field supported in person notes
- [x] Schema documentation includes sex/gender customization example (Phase 2)
- [x] Value Aliases extended to support sex field (Phase 3 - v0.9.4, enhanced v0.10.19)
- [ ] Batch normalization respects schema-defined values
- [x] GEDCOM M/F compatibility preserved for genealogists
- [x] No breaking changes to existing functionality

## Status

**🔄 In Progress**

- Phase 2: ✅ Complete (existing Schema system supports custom sex enums)
- Phase 3: ✅ Complete (v0.9.4, enhanced v0.10.19)
- Phase 1: 📋 In progress (adding gender_identity field)
- Phase 4: 📋 Planned (configurable normalization)
