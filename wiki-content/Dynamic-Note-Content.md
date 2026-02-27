# Dynamic Note Content

Charted Roots can render live, computed content directly within notes using special code blocks. These blocks automatically display data from your vault and update when you view the note. Most blocks are designed for person notes, while some (Sources Block, Extractions Block, Source Roles Block) are intended for source notes.

---

## Table of Contents

- [Overview](#overview)
- [Block Types](#block-types)
  - [Timeline Block](#timeline-block)
  - [Relationships Block](#relationships-block)
  - [Media Block](#media-block)
  - [Source Roles Block](#source-roles-block)
  - [Transfers Block](#transfers-block)
  - [Sources Block](#sources-block)
  - [Extractions Block](#extractions-block)
- [Rendered Output](#rendered-output)
- [Freeze to Markdown](#freeze-to-markdown)
- [Inserting Blocks](#inserting-blocks)
- [Tips](#tips)
- [Related Features](#related-features)

---

## Overview

Dynamic content blocks solve the problem of person notes containing only static frontmatter. With these blocks, you can see a person's complete timeline, family relationships, and more without leaving the note.

**Key Features:**
- **Live rendering**: Content computed from your vault data
- **Freeze to markdown**: Convert to static text for editing or export
- **Configurable**: Options for sorting, filtering, and display
- **Multiple insertion methods**: Command palette, context menu, import wizards

## Block Types

### Timeline Block

The `canvas-roots-timeline` block shows a chronological list of events for a person.

~~~markdown
```canvas-roots-timeline
sort: chronological
```
~~~

**What it displays:**
- Birth and death dates from the person's frontmatter
- All event notes linked to this person
- Year, event type, and place for each entry
- Clickable wikilinks to event and place notes

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `sort` | `chronological`, `reverse` | Event order (default: chronological) |
| `include` | comma-separated types | Only show these event types |
| `exclude` | comma-separated types | Hide these event types |
| `limit` | number | Maximum events to display |
| `title` | string | Custom header text (default: "Timeline") |

**Example with options:**

~~~markdown
```canvas-roots-timeline
sort: reverse
exclude: residence, occupation
limit: 10
title: Key Life Events
```
~~~

### Relationships Block

The `canvas-roots-relationships` block displays family members with clickable links.

~~~markdown
```canvas-roots-relationships
type: immediate
```
~~~

**What it displays:**
- Parents (father, mother)
- Spouse(s)
- Children
- Siblings (when using `type: extended` or `type: all`)

Each person is shown as a wikilink with their birth-death years.

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `type` | `immediate`, `extended`, `all` | Relationship scope (default: immediate) |
| `include` | comma-separated types | Only show these relationship types |
| `exclude` | comma-separated types | Hide these relationship types |
| `title` | string | Custom header text (default: "Family") |

**Relationship types:**
- `immediate`: Parents, spouse, children (no siblings)
- `extended`: Adds siblings
- `all`: All relationships including extended family

**Example with options:**

~~~markdown
```canvas-roots-relationships
type: extended
title: Family Tree
```
~~~

### Media Block

The `canvas-roots-media` block displays a gallery of media files linked to the person.

~~~markdown
```canvas-roots-media
columns: 3
size: medium
```
~~~

**What it displays:**
- All media files linked via the `media` frontmatter property
- Image thumbnails in a responsive grid
- Document placeholders for non-image files (PDFs, etc.)
- First item highlighted as the "thumbnail" (used for Family Chart avatars)

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `columns` | 2-6, `auto` | Number of columns in grid (default: 3) |
| `size` | `small`, `medium`, `large` | Thumbnail size (default: medium) |
| `editable` | `true`, `false` | Enable drag-to-reorder (default: false) |
| `title` | string | Custom header text (default: "Media") |

**Example with options:**

~~~markdown
```canvas-roots-media
columns: 4
size: large
editable: true
title: Photos & Documents
```
~~~

**Editable Mode:**

When `editable: true` is set:
- Items show a drag handle on hover
- Drag items to reorder their position
- First item becomes the thumbnail (shown on Family Chart nodes)
- Frontmatter is updated automatically when you drop
- Gallery has a dashed border to indicate edit mode

### Source Roles Block

The `charted-roots-source-roles` block displays a table of people and their roles in a source document.

~~~markdown
```charted-roots-source-roles
source: "[[Estate Inventory of John Smith Sr.]]"
```
~~~

**What it displays:**
- All people listed in the source's role properties (`principals`, `witnesses`, `informants`, etc.)
- Role category and label for each person
- Role details (e.g., "Decedent", "Administrator") when present
- Clickable wikilinks to person notes

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `source` | wikilink | Source note to display roles from (default: current note) |

**Rendered output:**

| Role | Person | Details |
|------|--------|---------|
| Principal | [[John Smith Sr.]] | Decedent |
| Official | [[Thomas Brown]] | Administrator |
| Enslaved Individual | [[Mary]] | — |

**Inserting the block:**

1. **Context menu:** Right-click on a source note and select **Charted Roots > Add source roles block**
2. **Manual:** Add the code block to any note, specifying the source

When inserted via context menu, the `source` parameter is pre-filled with the current note's wikilink.

**Note:** This block is designed for source notes (`cr_type: source`) that have role properties defined. See [Person Roles in Sources](Evidence-And-Sources#person-roles-in-sources) for details on setting up role properties.

### Transfers Block

The `charted-roots-transfers` block displays a chronological list of transfer events for a person. This is useful for tracking ownership changes in genealogical research (e.g., enslaved ancestor tracking) or succession in worldbuilding.

~~~markdown
```charted-roots-transfers
sort: chronological
```
~~~

**What it displays:**
- All transfer events linked to this person
- Transfer type (inheritance, purchase, gift, hire, seizure, birth, relocation)
- Date and event title with clickable wikilink
- Location (if recorded)
- Other participants in the transfer

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `sort` | `chronological`, `reverse` | Event order (default: chronological) |
| `limit` | number | Maximum events to display |
| `title` | string | Custom header text (default: "Transfer history") |

**Example with options:**

~~~markdown
```charted-roots-transfers
sort: reverse
limit: 10
title: Ownership history
```
~~~

**Transfer types:**

| Type | Label | Description |
|------|-------|-------------|
| `inheritance` | Inherited | Transfer at death via will/probate |
| `purchase` | Purchased | Sale transaction |
| `gift` | Gift | Transfer without payment |
| `hire` | Hired out | Temporary transfer (hiring out) |
| `seizure` | Seized | Court-ordered transfer, debt collection |
| `birth` | Born into | Born into ownership |
| `relocation` | Relocated | Move to different location (same owner) |

**Use cases:**
- **Genealogical research:** Track enslaved ancestors through ownership chains, estate divisions, and probate records
- **Worldbuilding:** Track succession of titles, thrones, and positions

**Related:** Transfer events require creating event notes with `event_type: transfer` and `transfer_type` property. See [Events & Timelines](Events-And-Timelines#event-types) for details on creating transfer events.

### Sources Block

The `charted-roots-sources` block displays a table of sources linked to a person note. It shows each source's type, title, date, and which facts the source supports.

~~~markdown
```charted-roots-sources
sort: chronological
```
~~~

**What it displays:**
- All sources linked via the `sources` frontmatter array
- Sources referenced by `sourced_*` properties (fact-level citations)
- Legacy `sourced_facts` entries
- Source type icon, title as a clickable wikilink, date, and fact labels

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `sort` | `chronological`, `reverse`, `type` | Sort order (default: chronological) |
| `filter` | comma-separated types | Only show these source types |
| `exclude` | comma-separated types | Hide these source types |
| `title` | string | Custom header text (default: "Sources") |

**Example with options:**

~~~markdown
```charted-roots-sources
sort: type
filter: census, vital_record
title: Census & Vital Records
```
~~~

**Rendered output:**

| Type | Title | Date | Facts |
|------|-------|------|-------|
| 📋 | [[1850 Census - Smith Family]] | 1850 | Name, Birth date, Residence |
| 📜 | [[Birth Certificate - John Smith]] | 1845 | Name, Birth date, Birth place |

**Fact-level citations:**

When a source is linked via a `sourced_*` property (e.g., `sourced_birth_date`), the Facts column shows which specific facts cite that source. This gives a clear picture of what evidence each source provides for the person.

**Note:** This block is designed for person notes (`cr_type: person`). See [Evidence & Sources](Evidence-And-Sources) for details on linking sources to persons.

### Extractions Block

The `charted-roots-extractions` block is the inverse of the Sources block — it renders a reverse lookup from a source note to all entities that cite it. Place this block in a source note to answer the question "what have I extracted from this source?"

~~~markdown
```charted-roots-extractions
title: Extractions
```
~~~

**What it displays:**

Three grouped sections, each with a count in its heading:

1. **Persons** — All person notes that reference this source via `sources`, `sourced_*`, or legacy `sourced_facts` properties. Shows which facts each person cites this source for.
2. **Events** — All event notes that include this source in their `sources` array, sorted chronologically. Shows event type, title, date, person(s), and place.
3. **Places** — Unique places derived from the citing events, with a count of how many events reference each place.

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `title` | string | Custom header text (default: "Extractions") |

**Rendered output:**

#### Persons (3)

| Name | Facts cited |
|------|------------|
| [[John Smith]] | Name, Birth date |
| [[Jane Smith]] | Name, Marriage date |
| [[Mary Smith]] | Name |

#### Events (2)

| Type | Title | Date | Person(s) | Place |
|------|-------|------|-----------|-------|
| 🎂 | [[Birth of John Smith]] | 1845-03-15 | [[John Smith]] | [[Dublin, Ireland]] |
| 💒 | [[Marriage of John and Jane]] | 1867-06-20 | [[John Smith]], [[Jane Smith]] | [[Boston, MA]] |

#### Places (2)

| Place | Events |
|-------|--------|
| [[Boston, MA]] | 1 |
| [[Dublin, Ireland]] | 1 |

Sections with no data are omitted. If no entities reference the source at all, an empty state message is shown.

**Note:** This block is designed for source notes (`cr_type: source`). It complements the Sources block on person notes by providing the reverse perspective. See [Evidence & Sources](Evidence-And-Sources) for details on the source citation model.

## Rendered Output

In reading view, code blocks render as styled containers:

```
┌─────────────────────────────────────────────┐
│ Timeline                               [❄️] │
├─────────────────────────────────────────────┤
│ • 1845 — Born in [[Dublin, Ireland]]        │
│ • 1867 — Married [[Jane Smith]]             │
│ • 1890 — Resided in [[Boston, MA]]          │
│ • 1912 — Died in [[Boston, MA]]             │
└─────────────────────────────────────────────┘
```

**Toolbar buttons:**
- ❄️ **Freeze**: Convert to static markdown
- 📋 **Copy**: Copy timeline text to clipboard (timeline only)

**Empty states:**
- If no data is found, blocks show a helpful message
- Example: "No events found for this person"

## Freeze to Markdown

Click the ❄️ freeze button to convert a live block to static markdown. This is useful for:

- **Manual editing**: Add notes, reorder items, customize formatting
- **Export compatibility**: Static markdown works everywhere
- **Performance**: Reduce computation in large vaults

**Before freezing:**

~~~markdown
```canvas-roots-timeline
sort: chronological
```
~~~

**After freezing:**

```markdown
## Timeline

- **1845** — Born in [[Dublin, Ireland]]
- **1867** — [[Marriage of John and Jane|Married]] in [[Boston, MA]]
- **1912** — Died in [[Boston, MA]]
```

The frozen content preserves wikilinks and can be edited like any markdown.

**Media gallery freeze:**

Media galleries freeze to a styled callout that displays images in a responsive grid:

~~~markdown
> [!info|cr-frozen-gallery]
> ![[portrait.jpg]]
> ![[wedding-photo.jpg]]
> ![[birth-certificate.pdf]]
~~~

The frozen gallery:
- Uses Obsidian's native callout syntax with a special `cr-frozen-gallery` metadata tag
- Renders images in a flex layout with configurable styling
- Click-and-hold on an image to zoom to full screen
- Styling can be customized via the Style Settings plugin

## Inserting Blocks

### Create Person Modal

When creating a new person note via the Create Person modal, enable the "Include dynamic blocks" toggle to automatically add timeline, relationships, and media blocks to the note body.

### Import Wizards

All import wizards (GEDCOM, Gramps, CSV) include an "Include dynamic blocks" toggle. When enabled, imported person notes will include all three block types. Media blocks are included with `editable: true` by default.

### Context Menu

Right-click on a person note in the file explorer:

1. Select **Insert dynamic blocks**
2. Timeline, relationships, and media blocks are added to the note body

### Bulk Insert (Folders)

Right-click on a folder containing person notes:

1. Select **Insert dynamic blocks in folder**
2. A progress modal shows the operation
3. Blocks are added to all person notes in the folder that don't already have them

### Command Palette

Use the command palette (`Ctrl/Cmd + P`):

- **Charted Roots: Insert dynamic blocks** - Adds blocks to the current note

### Manual Entry

Type the code block syntax directly in any person note:

~~~markdown
```canvas-roots-timeline
```

```canvas-roots-relationships
```
~~~

## Tips

- **Placement**: Add blocks after your frontmatter and any static content you want to keep at the top
- **Multiple blocks**: You can have both timeline and relationships blocks in the same note
- **Re-ordering**: Frozen content can be moved anywhere in the note
- **Performance**: For large vaults (1000+ people), consider using frozen blocks to avoid computation on every note open
- **cr_id required**: Blocks only work in notes with a valid `cr_id` property

## Related Features

- [Events & Timelines](Events-And-Timelines) - Creating and managing event notes
- [Context Menus](Context-Menus) - All available right-click actions
- [Import & Export](Import-Export) - Import wizards with dynamic block toggle
- [Data Entry](Data-Entry) - Creating person notes
