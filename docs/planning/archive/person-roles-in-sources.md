# Person Roles in Source Notes

- **Status:** Complete (all phases implemented)
- **GitHub Issue:** [#219](https://github.com/banisterious/obsidian-charted-roots/issues/219)
- **Discussion:** [#189](https://github.com/banisterious/obsidian-charted-roots/discussions/189)
- **Related:** [#123](https://github.com/banisterious/obsidian-charted-roots/issues/123) (Inheritance & Succession Tracking)
- **Created:** 2026-01-19

## Problem Statement

Genealogical source documents name multiple people in different capacities (principal, witness, informant, official, etc.). Currently, Charted Roots has no structured way to track these roles, making it difficult to:

- Assess information quality (who was the informant on a death certificate?)
- Build FAN (Friends, Associates, Neighbors) networks
- Query across sources ("show all documents where Person X was a witness")
- Track enslaved individuals through legal/property records

## Proposed Solution

Add role-based person tracking to source notes with:
1. Recognized role properties in frontmatter
2. Modal UI for assigning roles when linking people
3. Dynamic block for rendering roles
4. Query/filter support

## Design Decisions

Based on discussion in #189:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Source notes only | Sources are where roles are encountered; events are synthesized |
| YAML structure | Inline notation | More readable, easier to maintain than parallel arrays |
| Role vocabulary | Canonical list with freeform details | Balance between structure and flexibility |
| Terminology | "Enslaved Individuals" | Per @ANYroots' guidance |

## Role Categories

Simplified canonical list per @wilbry's proposal:

| Property | Description | Examples |
|----------|-------------|----------|
| `principals` | Subject(s) of the document | Deceased, testator, groom/bride |
| `witnesses` | Named witnesses | Signing witnesses, event witnesses |
| `informants` | Person providing information | Death certificate informant |
| `officials` | Authority figures | Clerks, judges, officiants, physicians |
| `enslaved_individuals` | Persons listed as property | Named in wills, inventories, appraisements |
| `family` | Family members of principals | Named relatives |
| `others` | Catch-all | Any role not fitting above |

### Relevant Source Types

Role tracking is most useful for source types that name multiple people:

- `probate` — Wills, estate inventories, appraisements
- `vital_record` — Birth, death, marriage certificates
- `legal` — Deeds, contracts, court records
- `church` — Baptism, marriage, burial records
- `military` — Service records, pension applications

Role properties are optional on any source type and will be recognized wherever present.

## Edge Cases

**Person appears in multiple role arrays:** Allowed. A person may legitimately serve multiple roles in a document (e.g., a family member who also witnessed a will).

**Wikilink doesn't resolve to existing note:** Allowed. The person note may not exist yet or may be created later. Parse the link target as-is without validation errors.

**Same person listed multiple times in one array:** Allowed but discouraged. May indicate duplicate entry; no enforcement.

## YAML Structure

Uses Obsidian's wikilink alias syntax to embed optional role details in the display text:

```yaml
---
cr_type: source
source_type: probate
title: "Estate Inventory of John Smith Sr."
date: 1817-03-15

# Person roles
principals:
  - "[[John Smith Sr.|John Smith Sr. (Decedent)]]"
officials:
  - "[[Thomas Brown|Thomas Brown (Administrator)]]"
  - "[[James Wilson|James Wilson (Appraiser)]]"
  - "[[Robert Davis|Robert Davis (Appraiser)]]"
enslaved_individuals:
  - "[[Mary]]"
  - "[[Peter]]"
  - "[[Hannah]]"
family:
  - "[[John Smith Jr.|John Smith Jr. (Heir)]]"
  - "[[William Smith|William Smith (Heir)]]"
---
```

### Parsing Strategy

Role entries use standard wikilink syntax: `[[Link Target]]` or `[[Link Target|Display Text]]`

The role category comes from the array name (e.g., `witnesses`, `officials`). Optional details are embedded in the display text using parentheses.

Regex for parsing wikilinks with optional alias:

    ^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$

- Group 1: Link target (file path or note name)
- Group 2: Optional display text (may contain role details in parentheses)

To extract details from display text:

    ^(.+?)\s*\(([^)]+)\)$

- Group 1: Person name
- Group 2: Role details

## Implementation Phases

### Phase 1: Property Recognition ✅

**Effort:** Low
**Scope:** Read-only recognition
**Status:** Complete

- Add role properties to SourceNote interface
- Parse role entries in source note reader
- Display roles in source info panel (if exists)
- Support in Bases/DataView queries

**Example Dataview Queries:**

Find all sources where a specific person was a witness:

    ```dataview
    TABLE title, date
    FROM "Sources"
    WHERE contains(witnesses, "[[John Smith]]")
    ```

List all witnesses across all sources:

    ```dataview
    TABLE witnesses
    FROM "Sources"
    WHERE witnesses
    FLATTEN witnesses
    ```

**Example Bases Filter:**

In an Obsidian Base, filter sources by role:
- Filter: `witnesses` contains `[[John Smith]]`
- Or use formula: `contains(witnesses, "John Smith")`

### Phase 2: Dynamic Block Rendering ✅

**Effort:** Medium
**Scope:** Visualization
**Status:** Complete

Add `charted-roots-source-roles` dynamic block:

````markdown
```charted-roots-source-roles
source: "[[Estate Inventory of John Smith Sr.]]"
```
````

Renders as a formatted table:

| Role | Person | Details |
|------|--------|---------|
| Principal | [[John Smith Sr.]] | Decedent |
| Official | [[Thomas Brown]] | Administrator |
| Enslaved Individual | [[Mary]] | — |
| ... | ... | ... |

**Discoverability:** Add right-click context menu action on source notes:
- Menu item: "Add source roles block" (or similar)
- Only shown when right-clicking on a source note (cr_type: source)
- Inserts the dynamic block at cursor position or end of note
- Pre-populates `source` parameter with current note's wikilink

### Phase 3: Modal UI Integration ✅

**Effort:** Medium-High
**Scope:** Data entry
**Status:** Complete

When linking a person to a source (e.g., via person picker or source linking modal):

1. Show role dropdown/chips after person selection
2. Optional details text field
3. Auto-add to appropriate role array in frontmatter

UI mockup:
```
┌─────────────────────────────────────────┐
│ Link Person to Source                   │
├─────────────────────────────────────────┤
│ Person: [[John Smith Jr.]]              │
│                                         │
│ Role: [Heir ▼]                          │
│       ○ Principal  ○ Witness            │
│       ○ Informant  ○ Official           │
│       ○ Enslaved Individual  ○ Family   │
│       ● Other: [Heir________]           │
│                                         │
│ Details: [received Mary & Peter_______] │
│                                         │
│ [Cancel]                    [Add Link]  │
└─────────────────────────────────────────┘
```

### Phase 4: Query Support ✅

**Effort:** Medium
**Scope:** Research tools
**Status:** Complete

- "Sources by Role" report in Control Center
- Filter by role type (witness, informant, official, etc.)
- Grouping options: by role, by source, or chronological
- Shows role details and source quality ratings

## Files Modified

### Phase 1 ✅
- `src/sources/types/source-types.ts` — Added role properties to SourceNote, PERSON_ROLE_PROPERTIES constant, labels/descriptions
- `src/sources/services/source-service.ts` — Parse role arrays in parseSourceNote()

### Phase 2 ✅
- `src/dynamic-content/processors/source-roles-processor.ts` — New processor for `charted-roots-source-roles` block
- `src/dynamic-content/renderers/source-roles-renderer.ts` — Renders role table with person links
- `src/dynamic-content/types.ts` — Extended DynamicBlockType enum
- `src/dynamic-content/index.ts` — Export new components
- `src/main.ts` — Register processor and add context menu action
- `styles/dynamic-content.css` — CSS for source roles table

### Phase 3 ✅
- `src/sources/ui/create-source-modal.ts` — Added inline-expand section for person roles, person picker integration, role selection modal
- `src/sources/services/source-service.ts` — Write role properties in createSource/updateSource
- `styles/entity-create-modals.css` — CSS for person roles list in modal

### Phase 4 ✅
- `src/reports/types/report-types.ts` — Added SourcesByRoleOptions, SourcesByRoleResult, SourceRoleEntry interfaces
- `src/reports/services/sources-by-role-generator.ts` — New generator for sources-by-role report
- `src/reports/services/report-generation-service.ts` — Registered generator in orchestration

## Connection to Inheritance Tracking (#123)

Person roles in sources provide the foundation for inheritance chain visualization:

1. Estate inventory source captures:
   - `principals: ["[[John Smith Sr.|John Smith Sr. (Decedent)]]"]`
   - `enslaved_individuals: ["[[Mary]]", "[[Peter]]"]`
   - `family: ["[[Heir A|Heir A (received Mary)]]", "[[Heir B|Heir B (received Peter)]]"]`

2. Inheritance tracking (#123) can then:
   - Query sources for inheritance events
   - Build chains: Decedent → Heir → (subsequent generations)
   - Visualize property/person transfers over time

## Testing Checklist

### Phase 1
- [x] Role properties parsed correctly from frontmatter
- [x] Empty/missing role arrays handled gracefully
- [x] Inline details extracted correctly
- [x] Works with Bases/DataView queries

### Phase 2
- [x] Dynamic block renders role table
- [x] Handles sources with no roles
- [x] Handles sources with many roles
- [x] Details column shows "—" when empty
- [x] Right-click menu shows "Add source roles block" on source notes
- [x] Menu item hidden on non-source notes
- [x] Block inserted with correct source wikilink

### Phase 3
- [x] Modal shows role options
- [x] Selected role written to correct array
- [x] Details appended in parenthetical format
- [x] Existing roles preserved when adding new

### Phase 4
- [x] Report shows sources grouped by role/source/chronological
- [x] Filter by role type works
- [x] Performance acceptable with large datasets

## Future Considerations

- **Role inference:** Auto-suggest roles based on source type (death certificate → likely has informant)
- **Bidirectional linking:** Show "Sources where this person appears" on person notes
- **GEDCOM export:** Map roles to appropriate GEDCOM tags
- **Validation:** Warn if principal is missing from source

## Contributors

- @ANYroots — Original proposal, use cases, terminology guidance
- @wilbry — Simplified role categories, parallel arrays concept
