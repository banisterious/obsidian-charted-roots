# Inheritance & Succession Tracking

Planning document for [#123](https://github.com/banisterious/obsidian-charted-roots/issues/123).

**Status:** Complete

---

## Overview

Track inheritance and succession relationships—applicable to both genealogical research (estate/property inheritance, enslaved ancestor tracking) and fictional worldbuilding (titles, thrones, positions).

**Design Philosophy:**
- Start with a minimal approach using existing infrastructure (custom properties + events)
- Keep person/place notes simple and queryable
- Use event notes for transfer history and details
- Support both genealogical and worldbuilding use cases with the same underlying model

---

## Use Cases

### Genealogical Research

**Primary:** Tracking enslaved ancestors through ownership chains.

When a slaveholder died, enslaved people were often divided among heirs via probate. Researchers need to:
- Track current/final ownership (`property_of`)
- Follow chains forward through transfer events
- Determine whether enslaved people came from paternal or maternal estates
- Link to source documents (wills, probate records, estate inventories)
- Track location (which plantation/property someone was held at)

**Example:**
- John Smith Sr. dies 1817 → Estate divided among children
- John Smith Jr. inherits "Mary" and her children
- John Smith Jr. dies 1842 → His heirs inherit Mary's descendants
- Researcher traces this chain via transfer events

### Fictional Worldbuilding

Track succession of titles, thrones, and positions:
- Line of succession calculations
- Inheritance rules (primogeniture, elective, etc.)
- Regnal numbering (Henry VIII, etc.)
- Contested successions, interregnums

---

## Agreed Design

### Person/Place Notes (Simple, Queryable)

Keep person and place notes flat with properties for current state only:

```yaml
# On enslaved person's note
cr_type: person
property_of: "[[John Smith Jr.]]"    # Current/final owner
held_at: "[[Smith Plantation]]"       # Current/final location
appraised_value: 150                  # From estate records (optional)

# On place note (plantation)
cr_type: place
property_of: "[[John Smith Jr.]]"     # Owner of the property
```

**Key properties:**

| Property | Type | Description |
|----------|------|-------------|
| `property_of` | wikilink | Current/final owner (works for both people and places) |
| `held_at` | wikilink | Current/final location (link to place note) |
| `appraised_value` | number | Value from estate records |

### Event Notes (Transfer History)

Full transfer details live on event notes, not person notes:

```yaml
cr_type: event
event_type: transfer              # Generic transfer event
event_date: 1817-03-15
transfer_type: inheritance        # inheritance, purchase, gift, hire, seizure, birth
participants:
  - "[[Mary (enslaved)]]"         # Person/property being transferred
  - "[[John Smith Sr.]]"          # Previous owner (decedent for inheritance)
  - "[[William Smith]]"           # New owner (heir)
transfer_source: "[[Chester County Probate Book A, p. 47]]"
description: "Estate division per will of John Smith Sr."
```

**Transfer types:**

| Type | Description |
|------|-------------|
| `inheritance` | Transfer at death via will/probate |
| `purchase` | Sale transaction |
| `gift` | Transfer without payment |
| `hire` | Temporary transfer (hiring out) |
| `seizure` | Court-ordered transfer, debt collection |
| `birth` | Born into ownership |
| `relocation` | Move to different location (same owner) |

### Location Tracking

- `held_at` on person note for current/final location
- `relocation` transfer events for tracking moves over time

```yaml
# Relocation event
cr_type: event
event_type: transfer
transfer_type: relocation
event_date: 1825
participants:
  - "[[Mary (enslaved)]]"
held_at: "[[River Farm]]"         # New location
previous_location: "[[Smith Plantation]]"
```

### Querying

**Find all people owned by someone:**
```
property_of = [[John Smith Jr.]]
```

**Find all transfer events for a person:**
Filter events where participants includes the person.

**Reconstruct ownership chain:**
Query transfer events by participant, sorted by date.

---

## Implementation Phases

### Phase 1: Documentation ✓

**Effort:** Low — Documentation only
**Status:** Complete

- Added transfer event type to Events-And-Timelines.md
- Added Transfers Block section to Dynamic-Note-Content.md
- Documented ownership properties (`property_of`, `held_at`, `appraised_value`) in Frontmatter-Reference.md
- Documented transfer event properties including `transfer_type`

### Phase 2: Property Aliases ✓

**Effort:** Low
**Status:** Complete

Register property aliases so properties appear in person/place forms:
- `property_of` → Person picker
- `held_at` → Place picker
- `appraised_value` → Number field

### Phase 3: Transfer Event Type ✓

**Effort:** Medium
**Status:** Complete

- Add `transfer` as a recognized event type with dedicated form fields
- Dropdown for transfer_type (inheritance, purchase, gift, etc.)
- Validation and autocomplete

### Phase 4: Transfer History Block ✓

**Effort:** Medium
**Status:** Complete

- `charted-roots-transfers` code block for person notes
- Shows chronological list of transfer events
- Auto-updates when events change
- Freeze to markdown and copy features

---

## Resolved Questions

These questions were answered through discussion on #123:

1. **Minimal approach first?** Yes — custom properties + event notes meet immediate needs. Dedicated UI can come later if needed.

2. **Unified vs separate properties?** Unified `transfer_type` approach preferred over separate `inherited_from`/`purchased_from` properties (avoids 18+ new properties).

3. **Person note complexity?** Keep person notes simple (`property_of`, `held_at`) — transfer history lives on event notes.

4. **Property tracking for places?** Yes — `property_of` works for both enslaved people and places (plantations), with `cr_type` distinguishing them.

5. **Location changes?** `held_at` for current state, `relocation` events for moves over time.

---

## Related

- [Roadmap entry](https://github.com/banisterious/obsidian-charted-roots/wiki/Roadmap#inheritance--succession-tracking)
- [Original discussion](https://github.com/banisterious/obsidian-canvas-roots/discussions/93#discussioncomment-15394738)
- Issue #123 comments for full design discussion
