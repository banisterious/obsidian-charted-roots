# Event Person Property Consolidation

Planning document for consolidating `person` and `persons` event properties into a single unified property.

**Status:** Planning
**GitHub Issue:** #TBD
**Created:** 2025-12-27
**Updated:** 2025-12-27

---

## Overview

Currently, event notes use two different properties to track participants:

- **`person`** (string): Single participant, used for individual events like birth, death, occupation
- **`persons`** (array): Multiple participants, used for family events like marriage, divorce, residence

This duality creates complexity in:
- Base templates (requires formula to coalesce both properties)
- Importers (must decide which property to populate)
- User understanding (which property to use when?)

**Goal:** Consolidate to a single `persons` array property that works for all events.

---

## Current State

### Property Usage

| Event Type | Current Property | Value Example |
|------------|------------------|---------------|
| Birth | `person` | `"[[John Smith]]"` |
| Death | `person` | `"[[John Smith]]"` |
| Occupation | `person` | `"[[John Smith]]"` |
| Marriage | `persons` | `["[[John Smith]]", "[[Jane Doe]]"]` |
| Divorce | `persons` | `["[[John Smith]]", "[[Jane Doe]]"]` |
| Residence | `persons` | `["[[John Smith]]", "[[Jane Doe]]"]` |

### Events Base Template Workaround

In v0.17.7, we added a `participant` formula to handle this duality:

```yaml
participant: 'if(${person}, ${person}, ${persons}.map([value, html("<span style=\"margin-left:-0.25em\">,</span>")]).flat().slice(0, -1))'
```

This works but is a symptom of the underlying schema issue.

---

## Proposed Solution

### Target Schema

All events use a single `persons` property (array):

| Event Type | Property | Value Example |
|------------|----------|---------------|
| Birth | `persons` | `["[[John Smith]]"]` |
| Death | `persons` | `["[[John Smith]]"]` |
| Occupation | `persons` | `["[[John Smith]]"]` |
| Marriage | `persons` | `["[[John Smith]]", "[[Jane Doe]]"]` |
| Divorce | `persons` | `["[[John Smith]]", "[[Jane Doe]]"]` |

Single-participant events simply have an array with one element.

### Benefits

1. **Consistency**: One property to learn and use
2. **Simpler base formulas**: No coalescing needed
3. **Simpler importers**: Always populate the same property
4. **Future-proof**: Any event can have multiple participants without schema change

---

## Migration Strategy

### Phase 1: Update Importers

Update Gramps and GEDCOM importers to always use `persons` array:

**Files to modify:**
- `src/gramps/gramps-parser.ts`
- `src/gedcom/gedcom-parser.ts`

**Change:**
- Single-participant events: `persons: ["[[Person]]"]` instead of `person: "[[Person]]"`
- Multi-participant events: unchanged (already use `persons`)

### Phase 2: Update Base Templates

Simplify the events base template formula:

**Before:**
```yaml
participant: 'if(${person}, ${person}, ${persons}.map([value, html(...)]).flat().slice(0, -1))'
```

**After:**
```yaml
participant: '${persons}.map([value, html("<span style=\"margin-left:-0.25em\">,</span>")]).flat().slice(0, -1)'
```

Or even simpler if Bases handles single-element arrays gracefully:
```yaml
participant: '${persons}'
```

### Phase 3: Migration Tool

Add a cleanup wizard step or standalone migration command:

1. Find all event notes with `person` property (singular)
2. Convert `person: "[[X]]"` → `persons: ["[[X]]"]`
3. Remove the old `person` property
4. Report results to user

**Implementation options:**
- Add to Cleanup Wizard Phase 4
- Standalone command: "Canvas Roots: Migrate event person properties"
- Run automatically on plugin load with user confirmation

### Phase 4: Update Documentation

- Frontmatter Reference: Remove `person`, document `persons` as the canonical property
- Migration notes in CHANGELOG
- Update any examples using `person`

---

## Backward Compatibility

### Reading Old Notes

The base template formula should continue to support both properties during transition:

```yaml
participant: 'if(${persons}, ${persons}.map(...), if(${person}, [${person}], []))'
```

### Property Aliases

Users with property aliases for `person` should be notified and guided to update their aliases to `persons`.

---

## Open Questions

1. **Property name**: Keep `persons` or rename to `participants`?
   - `persons` matches existing usage
   - `participants` is more descriptive but a longer word

2. **Migration timing**: When to run the migration?
   - On plugin update (risky, could surprise users)
   - Manual command (requires user action)
   - Cleanup Wizard integration (natural place for data fixes)

3. **Deprecation period**: How long to support reading `person`?
   - Forever (just stop writing it)
   - 2-3 versions with deprecation warning
   - Remove after major version bump

---

## Implementation Checklist

- [ ] Update `gramps-parser.ts` to use `persons` for all events
- [ ] Update `gedcom-parser.ts` to use `persons` for all events
- [ ] Add migration command/wizard step
- [ ] Update events base template
- [ ] Update Frontmatter Reference documentation
- [ ] Add CHANGELOG entry
- [ ] Test with existing vaults containing both property types

---

## Related Documents

- [Frontmatter Reference](../../wiki-content/Frontmatter-Reference.md) - Property documentation
- [Events Base Template](../../src/constants/events-base-template.ts) - Current formula workaround
- [Cleanup Wizard Phase 4](./cleanup-wizard-phase4.md) - Potential integration point
