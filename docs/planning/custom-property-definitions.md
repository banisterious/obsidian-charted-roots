# Custom Property Definitions

Planning document for introducing user-declared custom properties as a first-class plugin concept. v1 scope: person notes only, with the foundation shaped to extend to other entity types later.

**Status:** 📝 Draft — posted to [#377](https://github.com/banisterious/obsidian-charted-roots/issues/377) for community review

**Related:**
- [#377](https://github.com/banisterious/obsidian-charted-roots/issues/377) — tracking issue (this doc)
- [#378](https://github.com/banisterious/obsidian-charted-roots/issues/378) — render custom properties on in-tree card
- [#379](https://github.com/banisterious/obsidian-charted-roots/issues/379) — highlight family chart nodes by property value (built-in fields first, extends here)
- [#380](https://github.com/banisterious/obsidian-charted-roots/issues/380) — render in family chart info panel
- [#381](https://github.com/banisterious/obsidian-charted-roots/issues/381) — render in Entity Profile View
- [#382](https://github.com/banisterious/obsidian-charted-roots/issues/382) — sort spouses by custom property

---

## Overview

The person schema is fixed today. Users with domain-specific data (military service records, religious affiliation detail, worldbuilding properties like rank / title / clan / dishu status / house sigil) currently have to cram that data into existing fields (usually `occupation` or free-text notes) or put it in frontmatter where the plugin simply ignores it. The `PersonFrontmatter` interface accepts arbitrary keys via its index signature, but those keys aren't read into the family graph model, don't render on any surface, and can't participate in filtering or sorting.

This foundation adds:

- **Declaration UI:** a settings surface for declaring a custom property with a name, type, optional description, and entity-type scope.
- **Data reading:** the plugin reads declared custom property keys from note frontmatter into the family graph model alongside built-in fields.
- **Storage:** definitions persist in plugin settings; values live in each note's frontmatter (no separate storage layer).
- **Obsidian Properties integration:** declared types are registered with Obsidian's native Properties panel so properties render with correct types (text, number, date, list).

This doc does **not** cover rendering, sorting, or filtering. Those are tracked in the sub-issues linked above.

---

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Data types (v1) | `text`, `number`, `tag-list`, `date`, `image` | The five named in the issue. Boolean, wikilink, and enum deferred — see §2 |
| ID immutability | IDs cannot change after save; only name / description / type can be edited | Lesson from the recent relationship-type rename bug: when an editable ID diverges from frontmatter keys, saved data becomes orphaned. |
| Type changes post-save | Disallowed; force delete-and-recreate | Changing `text` -> `number` could break existing frontmatter values. Delete-and-recreate forces the user to handle the transition explicitly. |
| Entity-type scope | Schema carries `entityTypes: EntityType[]` as first-class; v1 ships with `['person']` UI enabled | Extending to place/event/source/organization in future is additive — no migration. |
| Obsidian Properties integration | Write property types to `.obsidian/types.json` eagerly on declaration | Produces correct-typed properties even before any note uses them. Touching another plugin's file is a small blast radius we accept for the UX. |
| Settings UI location | Control Center -> new "Custom properties" tab | Consistent with other entity-type managers; keeps settings pane less crowded |
| Value parse failures | Log at debug level and leave value as `undefined` | No notices, no halts. Standard pattern for optional frontmatter reads. |
| Reserved-key validation | Maintained as a constant; fail at definition save time | Prevents colliding with `cr_id`, `name`, `born`, spouse chains, etc. |
| ID format | Lowercase ASCII + digits + underscores, no leading digit | Avoids YAML parser ambiguity and keeps slugification predictable. |

---

## Data Types (v1)

| Type | Storage shape | Obsidian property type | Notes |
|---|---|---|---|
| `text` | string | Text | Free-form |
| `number` | number | Number | Integer or decimal |
| `tag-list` | string[] | List | Array of short strings, rendered as pills in UI |
| `date` | ISO string or fuzzy | Date | GEDCOM qualifiers (`ABT`, `BEF`, etc.) handled via existing `DateService` |
| `image` | wikilink string | Text (no native image type) | Points at a vault attachment; rendering via existing media service |

### Deferred to follow-ups

- **`boolean`** — trivially useful, low urgency. Would layer in after v1 ships.
- **`wikilink` (to another person / place / source)** — significant. Needs relationship-like validation, optional inverse handling, graph integration. Too cross-cutting for this foundation; probably deserves its own issue.
- **`enum` (dropdown with predefined values)** — needs a per-property values list. Design once a real use case surfaces.

---

## Schema

```ts
type CustomPropertyType = 'text' | 'number' | 'tag-list' | 'date' | 'image';

type EntityType = 'person' | 'place' | 'event' | 'source' | 'organization';

interface CustomPropertyDefinition {
  /** Stable identifier used as the frontmatter key. Immutable once saved. */
  id: string;
  /** Display label, editable. */
  name: string;
  /** Optional short description shown in settings and property panel tooltips. */
  description?: string;
  /** Value type; determines parsing and UI. */
  type: CustomPropertyType;
  /** Which entity types this property applies to.
   *  v1 ships with ['person'] support; schema ready for extension. */
  entityTypes: EntityType[];
  /** Ordering within the settings UI. */
  order?: number;
}
```

Settings field:

```ts
interface CanvasRootsSettings {
  // ...existing fields...
  customPropertyDefinitions: CustomPropertyDefinition[];
}
```

Graph node extension:

```ts
interface PersonNode {
  // ...existing fields...
  customProperties?: Record<string, unknown>;
}
```

Values read from frontmatter at `definition.id`, parsed per `type`, and attached to `customProperties` keyed by `id`.

---

## Declaration UI

**Location:** Control Center -> **Custom properties** tab (new).

### Per-definition form

- **Name:** text input. Auto-generates ID via slugify on first creation.
- **ID:** readonly after save. Shown in a monospace font with a "why can't I edit this?" tooltip.
- **Type:** dropdown of the five types.
- **Description:** text input, optional.
- **Entity types:** multi-select. Defaults to `['person']`. Non-person options are disabled in v1 with a "Coming soon" tooltip.

### List view

- All definitions grouped by entity type.
- Each row: name, type badge, description, Edit / Delete buttons.
- **Create** button at top of list.
- Reordering: schema supports `order` field but v1 ships without the drag-to-reorder UI — ships sorted alphabetically, UI polish deferred.

### ID conflict rules

Reserved keys (cannot be used as custom property IDs):

- Plugin built-ins: `cr_id`, `cr_type`, `name`, `born`, `died`, `sex`, `father`, `mother`, `spouse`, `spouse1`, `spouse2`, ..., `birth_place`, `death_place`, `burial_place`, `occupation`, `media`, `universe`, `group_name`, `father_id`, `mother_id`, etc.
- Every built-in relationship type ID.
- Every existing custom property ID.

Maintained as a constant so validation happens at definition save time.

---

## Obsidian Properties Integration

Obsidian's core Properties plugin stores property type metadata in `.obsidian/types.json`. When a user declares a custom property, Charted Roots should:

1. **On declaration save**: write/update the entry in `.obsidian/types.json` mapping `property_id -> obsidian_type` (per the mapping in the data types table).
2. **On declaration delete**: leave the entry alone (user may still want the type registered even if the Charted Roots definition is removed).
3. **On plugin load**: re-check that registered entries still match current definitions; reconcile drift silently.

### Open call on this integration

Writing to another plugin's data file has a small blast radius. The alternative (relying on Obsidian's auto-detection from usage) means properties show with wrong types (text-typed dates) until someone enters data. The UX penalty is real enough that eager registration seems worth the blast-radius cost. Calling this out for explicit feedback.

---

## Reading Values from Frontmatter

On family graph cache load, after built-in fields are parsed, iterate each declared definition:

| Type | Parse logic |
|---|---|
| `text` | `String(value)` |
| `number` | `Number(value)` if `Number.isFinite`, else `undefined` |
| `tag-list` | If array: map to strings; if string: split on `,`, trim each |
| `date` | Pass through `DateService.normalize()` — handles ISO strings, fuzzy GEDCOM dates, Date objects |
| `image` | Pass wikilink through; resolution happens at render time via existing media service |

Parse failures log at debug level and leave the value as `undefined`. No notices, no halts — matches how optional built-in fields already work.

---

## Entity-Type Scope

### v1 ships with person-scope only

The UI disables the other entity types with a "Coming soon" tooltip. But the schema's `entityTypes: EntityType[]` makes later extension additive. Adding place-scope just means enabling the toggle and wiring `PlaceNode.customProperties` in the place data loader.

### Rationale for explicit scope (vs. implicit)

- **Different entity types have different natural property sets.** A place note doesn't want a "rank" property; a person note doesn't want a "population" property.
- **Settings UI can group sensibly.** Person properties listed separately from place properties reduces noise.
- **Sub-issue surfaces (card, info panel, profile view) can filter by scope.** A property tagged as `['person']` won't show up on a place's Entity Profile View.

---

## Open Questions

### (A) Settings UI location

Control Center tab, Obsidian Settings tab, or command-palette modal? Leaning Control Center tab for consistency with other entity-type managers. Open to alternatives.

### (B) ID validation strictness

Proposed: lowercase ASCII + digits + underscores only, no leading digit. Avoids frontmatter ambiguity across YAML parsers and keeps slugification predictable. Stricter than what Obsidian accepts natively (which allows Unicode) — deliberately so.

### (C) Reserved-key list exhaustiveness

The list in §4 is based on enumeration of built-in fields as of now. Likely missing a few. Proposed: maintain as a constant exported from `src/core/reserved-keys.ts` so new built-ins update it alongside their own code. Fail-loudly at save time.

### (D) Migration when a type changes

Proposed: disallow type changes after save — force delete-and-recreate. Alternative: allow with a "values may not parse after this change" warning. Leaning disallow; the alternative silently strands data.

### (E) Ordering in v1

Schema supports `order` field for user-reorderable lists. v1 ships sorted alphabetically (no drag UI). If that feels wrong, we can prioritize the drag-to-reorder UI.

### (F) Values panel integration

Open: does Obsidian's Property panel UI need plugin-specific hooks to render `image` values as image previews (vs. text wikilinks)? Might need a custom property suggester / renderer. Worth investigating during implementation.

---

## Implementation Order

Once design here is accepted, the rough order for sub-tasks:

1. **This foundation (#377)**: schema, settings UI, data reading, Properties integration
2. **#378** - render on in-tree card (second priority — primary value surface)
3. **#380** - render in info panel
4. **#381** - render in Entity Profile View
5. **#382** - sort spouses by custom property (depends on spouse-sort infra from #375, already shipped)
6. **#379** - highlighting extends to custom properties once this lands; can start now with built-in fields

---

## References

- [#371](https://github.com/banisterious/obsidian-charted-roots/discussions/371) - worldbuilder discussion that surfaced the feature request
- [#377](https://github.com/banisterious/obsidian-charted-roots/issues/377) - tracking issue
- `src/core/frontmatter.ts` - `PersonFrontmatter` interface with the index signature for arbitrary keys
- `src/core/family-graph.ts` - `PersonNode` graph model (where `customProperties` lands)
- `.obsidian/types.json` - Obsidian's property types registry
