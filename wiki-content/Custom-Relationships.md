# Custom Relationships

Custom relationships allow you to define and track non-family connections between people in your genealogical database. While standard family links (father, mother, spouse, children) are handled automatically, custom relationships let you capture additional connections like godparents, guardians, mentors, witnesses, and more.

---

## Table of Contents

- [Overview](#overview)
- [Built-in Relationship Types](#built-in-relationship-types)
- [When to Use Non-Family Relationships](#when-to-use-non-family-relationships)
- [Adding Custom Relationships](#adding-custom-relationships)
- [Frontmatter Format](#frontmatter-format)
- [Control Center - Relationships Tab](#control-center---relationships-tab)
- [Canvas Edge Rendering](#canvas-edge-rendering)
- [Commands and Context Menu](#commands-and-context-menu)
- [Best Practices](#best-practices)

---

## Overview

Custom relationships are:
- **Stored in person note frontmatter** in a `relationships` array
- **Typed** - each relationship has a defined type with properties like color and inverse
- **Directional or symmetric** - some relationships have inverses (godparent/godchild), others are symmetric (witness)
- **Separate from family links** - they complement but don't replace standard genealogical connections

### Terminology

To avoid confusion, Charted Roots uses distinct terms:

| Term | Description |
|------|-------------|
| **Family links** | Standard genealogical connections (father, mother, spouse, children) shown in the People tab |
| **Custom relationships** | Extended relationship types managed in the Relationships tab |

---

## Built-in Relationship Types

Charted Roots ships with **25 built-in non-family relationship types across 6 categories**, covering common genealogical needs and extending to worldbuilding, historical fiction, and social-network research scenarios.

Core family links (spouse, parent, child, sibling) are handled by dedicated frontmatter fields — see [Essential Properties](Essential-Properties) — and don't need to be added as custom relationships.

### Legal / Guardianship

| Type | Inverse | Color | Line |
|------|---------|-------|------|
| Guardian | Ward | Teal | Solid |
| Step-parent | Step-child | Teal | Dashed |
| Adoptive parent | Adopted child | Cyan | Dotted |
| Foster parent | Foster child | Sky | Solid |

### Religious / Spiritual

| Type | Inverse | Color | Line |
|------|---------|-------|------|
| Godparent | Godchild | Blue | Solid |
| Mentor | Disciple | Purple | Solid |

### Professional

| Type | Inverse | Color | Line |
|------|---------|-------|------|
| Master | Apprentice | Orange | Solid |
| Employer | Employee | Orange | Solid |

### Social

| Type | Inverse | Color | Line |
|------|---------|-------|------|
| Witness | *(one-way)* | Gray | Dashed |
| Neighbor | *(symmetric)* | Gray | Dashed |
| Companion | *(symmetric)* | Green | Solid |
| Betrothed | *(symmetric)* | Pink | Dashed |

### Feudal / World-building

For political and social hierarchies in historical fiction or worldbuilding universes:

| Type | Inverse | Color | Line |
|------|---------|-------|------|
| Liege lord | Vassal | Gold | Solid |
| Ally | *(symmetric)* | Emerald | Dashed |
| Rival | *(symmetric)* | Red | Dashed |

### DNA / Genetic

Opt-in — requires the `enableDnaTracking` setting:

| Type | Inverse | Color | Line |
|------|---------|-------|------|
| DNA match | *(symmetric)* | Purple | Dashed |

DNA match is a statistical/biological relationship, not a genealogical one — it's kept separate so the genealogical data model stays clean.

---

## When to Use Non-Family Relationships

These types are easy to overlook if you only use Charted Roots for traditional genealogy. A few use cases worth considering:

**Genealogical research (FAN networks)**
- Mark witnesses on wills, baptisms, and marriages — these often reveal friend/family networks that weren't otherwise documented
- Track neighbors across census records to surface FAN (Friends, Associates, Neighbors) clusters for focused research
- Document mentor/apprentice relationships from trade apprenticeship records

**Historical fiction and worldbuilding**
- Track liege/vassal hierarchies in a fictional nobility or a real historical court
- Model shifting alliances and rivalries across generations of a dynasty
- Follow master/apprentice chains through a magical or craft tradition
- Represent betrothals that didn't result in marriages (useful for dynastic-politics stories)

**Collaborative and household tracking**
- Guardian/ward and foster/adoptive relationships for orphan networks and non-biological parenting
- Companions and household members for documenting who lived or traveled together, especially for historical or ecclesiastical research

---

## Adding Custom Relationships

### Via Context Menu

1. Right-click on a person note
2. Navigate to **Charted Roots** → **Relationships** → **Add custom relationship...**
3. In the modal:
   - Select the relationship type from the dropdown (grouped by category)
   - Click "Select person" to choose the target person
   - Optionally add notes about the relationship
4. Click "Add relationship"

**Symmetric types auto-propagate.** When the chosen type is flagged symmetric (e.g., `twin`, `neighbor`, `ally`), the Add Relationship modal also writes the reciprocal entry onto the target person's note, so you only need to add the link once. Idempotent: if the target already lists you via the same type, the modal silently skips — safe to re-run from either side. Asymmetric types (`mentor` → `disciple`, `captor` → `prisoner`) are not auto-propagated; set the inverse side explicitly on the other person if you want both ends represented.

### Via Command Palette

1. Open a person note
2. Open the command palette (`Ctrl/Cmd + P`)
3. Run **Charted Roots: Add custom relationship to current person**
4. Follow the same modal workflow as above

### Manual Frontmatter

Add a `relationships` array to the person note frontmatter:

```yaml
---
name: John Smith
cr_id: person-john-smith
relationships:
  - type: godparent
    target: "[[Jane Doe]]"
    target_id: person-jane-doe
    notes: "Became godparent at baptism in 1920"
  - type: mentor
    target: "[[Robert Brown]]"
    target_id: person-robert-brown
---
```

---

## Frontmatter Format

### Relationship Properties

| Property | Required | Description |
|----------|----------|-------------|
| `type` | Yes | The relationship type ID (e.g., `godparent`, `guardian`, `mentor`) |
| `target` | Yes | Wikilink to the target person note |
| `target_id` | Yes | The `cr_id` of the target person (for robust tracking) |
| `notes` | No | Optional notes about the relationship |

### Example

```yaml
relationships:
  - type: godparent
    target: "[[Jane Doe]]"
    target_id: person-jane-doe
    notes: "Became godparent at baptism in 1920"
  - type: mentor
    target: "[[Robert Brown]]"
    target_id: person-robert-brown
  - type: witness
    target: "[[Mary Johnson]]"
    target_id: person-mary-johnson
    notes: "Witnessed marriage ceremony"
```

---

## Control Center - Relationships Tab

The Relationships tab in Control Center provides comprehensive relationship management:

### Custom Relationship Types Card

- **Table view** of all available relationship types
- **Color swatches** showing edge colors for each type
- **Category column** showing type grouping
- **Inverse column** showing the inverse relationship (if any)
- **Source column** indicating built-in or custom types
- **Toggle** to show/hide built-in types
- **Add type** button (for creating custom types - coming soon)

### Custom Relationships Card

- **List of all custom relationships** defined in the vault
- **Clickable source and target names** to open person notes
- **Relationship type** with color indicator
- **Statistics summary** at top

### Statistics Card

- Total relationships count
- Breakdown by relationship type
- People with custom relationships count

---

## Canvas Edge Rendering

Custom relationships can be rendered as colored edges on canvas trees:

- Each relationship type defines an **edge color** — renders in both vanilla Obsidian Canvas and [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas)
- Relationship types can also specify **dashed or dotted line styles** — but these only render when the **Advanced Canvas** plugin is installed. Vanilla Obsidian Canvas ignores edge style attributes and renders all edges as solid lines. Colors display correctly regardless.
- Enable/disable custom relationship edges in tree generation settings

> **Tip:** Install the Advanced Canvas community plugin if you want distinguishing line styles (dashed, dotted) on canvas trees. Without it, different relationship types remain distinguishable by color and label.

---

## Family Chart Overlay

Custom relationships can also render as **styled overlay lines on the interactive Family Chart**, independently of whether they participate in tree structure. This is decoupled from the tree-structure integration described in [Data Model](Data-Model) — a relationship type can be tree-only, overlay-only, or both.

### Enabling overlay rendering per type

In the Relationship Type editor modal (Control Center → Relationships → edit a type), the **Family chart overlay** section has a toggle:

- **Render on family chart as overlay line** — when enabled, this type draws as a styled line between the two people it connects on the Family Chart view, using the type's color and line style.

### Display toggles on the Family Chart

Once one or more types have the overlay flag enabled, open the Family Chart view's **Display** menu:

- **Show custom relationships** — master toggle that enables/disables the entire overlay layer
- **Per-type toggles** — when multiple overlay-enabled types exist, each appears as its own toggle indented under the master toggle, letting you focus on specific categories

### How overlay lines render

Overlay rendering picks between two visual treatments based on the relationship type:

- **Purely non-family types** (`ally`, `mentor`, `sire`, `liege`, `godparent`, etc.) render as **curves that arc below the chord between the two cards.** The sag scales with chord length, so short and long spans both read as clearly-curved. Curvature signals "this is not a family line," independent of where the endpoints sit in the tree.
- **Adopted / step / foster types** (which map onto a structural parent-child link) **restyle the existing parent-child line** with the overlay's color and dash pattern when that link is visible and uncomplicated — no separate line is drawn. When the pair has a duplicate card (f3 chart renders some people twice when they appear in multiple family contexts) or the structural link isn't in the current view, rendering falls back to the arc.

Common properties regardless of treatment:

- Color matches the relationship type's configured color
- Line style matches the type's configured style (solid / dashed / dotted)
- **Multiple relationships on the same pair (arc rendering)** stack with a perpendicular offset so they don't overlap — useful when two people have, e.g., both `ally` and `mentor` between them
- **Symmetric types** (`ally`, `friend`, etc.) render one line per pair, not two
- **Asymmetric types** (`mentor` → `disciple`, `captor` → `prisoner`) render one line in the declared direction
- **As-of date filter** (from the Family Chart toolbar): relationships with `from`/`to` date ranges are skipped when the selected date is outside the range

### Hover tooltip

Hovering a line (either an arc or a restyled structural link) shows a tooltip with: source name, relationship type, target name, and date range if present. A widened transparent hit target sits over each line so hover-for-tooltip works without pixel-precise cursor placement.

### Use cases

- **Worldbuilding** — Political allegiances, liege/vassal relationships, rivalries, magical bonds, vampire sire/childer lineages rendered alongside biological kinship
- **Genealogy** — FAN-network relationships (friends, associates, neighbors), godparent/godchild, master/apprentice, witness relationships
- **Research** — Any non-family connection that helps contextualize a person's social or professional network

---

## Commands and Context Menu

### Commands

| Command | Description |
|---------|-------------|
| Add custom relationship to current person | Opens the Add Relationship modal for the active person note |
| Open relationships tab | Opens Control Center to the Relationships tab |

### Context Menu

Right-click on a person note:
- **Charted Roots** → **Relationships** → **Add custom relationship...** - Opens the Add Relationship modal

---

## Best Practices

### Use target_id

Always include the `target_id` for robust linking. Even if notes are renamed, the `cr_id` reference ensures the relationship remains valid.

### Be Consistent

Use the same relationship type across your database. For example, always use `godparent` rather than mixing "Godparent" and "godparent".

### Add Notes

Document when and where the relationship was established. This context is valuable for future research.

### Consider Inverses

Some relationships should be added to both people:
- If John is Jane's godparent, you should also add that Jane is John's godchild
- Currently this must be done manually (automatic inverse creation coming soon)

### Separate from Family Links

Don't use custom relationships for connections that are already handled by family links:
- Use `father`/`mother` for parents, not "Biological Parent" custom relationship
- Use `spouse` for marriages, not custom relationship types

---

## Coming Soon

- **Create custom relationship types** with your own colors and categories
- **Edit and delete** custom types
- **Automatic inverse relationship creation**
- **Bulk relationship management**
