# Dynamic Note Content

Charted Roots can render live, computed content directly within notes using special code blocks. These blocks automatically display data from your vault and update when you view the note. Most blocks are designed for person notes, while some target other note types: Sources Block, Extractions Block, and Source Roles Block are intended for source notes, and the Members Block is intended for organization notes.

---

## Table of Contents

- [Overview](#overview)
- [Block Types](#block-types)
  - [Timeline Block](#timeline-block)
  - [Relationships Block](#relationships-block)
  - [Media Block](#media-block)
  - [Source Roles Block](#source-roles-block)
  - [Transfers Block](#transfers-block)
  - [Members Block](#members-block)
  - [Sources Block](#sources-block)
  - [Extractions Block](#extractions-block)
  - [Negative Findings Block](#negative-findings-block)
  - [Research Timeline Block](#research-timeline-block)
  - [Universe Entity Blocks](#universe-entity-blocks)
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

The `charted-roots-timeline` block shows a chronological list of events for a person.

~~~markdown
```charted-roots-timeline
sort: chronological
```
~~~

**What it displays:**
- Birth and death dates from the person's frontmatter
- A person's inline `events` array (residence, occupation, immigration, and the like) — the same flat-YAML list that places markers on the Map View, now interleaved chronologically on the timeline and de-duplicated against any matching event notes
- All event notes linked to this person
- Age annotations on each event (when birth date is known)
- Family member events — children's births (biological + adopted), spouse deaths, parent deaths, sibling births (biological + adopted, derived from any shared parent — bio or adoptive — using both `childrenCrIds` and `adoptedChildCrIds` on each parent so adopted siblings surface on bio-side household pages and vice versa). Toggled in Settings > Advanced > [Family events on timelines](Settings-And-Configuration#family-events-on-timelines)
- Historical context events from an overlay note (when configured)
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
| `context` | `[[Note]]`, `none` | Historical context note to overlay (see below) |
| `contextMargin` | number | Only show context events within N years of the person's lifespan (overrides global setting) |
| `place_context` | `true`, `false` | Append each place's parent location, e.g. "London, England" instead of "London" (overrides the global **Show place context** setting). The parent comes from the place note hierarchy (`parent_place`); places that are not place notes, or have no parent, are left unchanged |
| `familyEvents` | `none` | Suppress family member events on this timeline (overrides global toggles) |
| `layout` | `chronological`, `grouped`, `personal-first` | How events are arranged (see [Layout modes](#timeline-layout-modes)) |
| `format` | format string | Custom display format with placeholders (see [Format strings](#timeline-format-strings)) |
| `template` | `[[Note]]` | Reference a template note defining custom sections (see [Template notes](#timeline-template-notes)) |

**Example with options:**

~~~markdown
```charted-roots-timeline
sort: reverse
exclude: residence, occupation
limit: 10
title: Key Life Events
```
~~~

#### Historical context overlay

You can overlay historical events alongside a person's life events by referencing a context note. This helps understand what was happening in the world around them — wars, pandemics, economic events — and why ancestors may have made certain decisions.

**Context note format:** Create a markdown note with date-prefixed list items:

```markdown
- 1861-1865: American Civil War
- 1914: World War I begins
- 1929-10-29: Black Tuesday
- 1941-1945: World War II
```

Dates can be a single year (`1914`), a year range (`1861-1865`), or a full date (`1929-10-29`). Fictional-calendar dates also work — an era abbreviation plus a year in either order (`BBY 32` or `32 BBY`), including ranges (`BBY 22 - BBY 19`) — and they sort chronologically alongside dates from real-world or other eras.

**Usage:** Reference the note in your timeline block:

~~~markdown
```charted-roots-timeline
context: [[US History]]
```
~~~

To suppress the default context on a specific block, use `context: none`.

**Filtering:** By default, all context events are shown (`contextLifespanMargin: 0`). Set a margin in Settings > Events & timelines > Context events > **Context lifespan margin** to limit context events to within N years of the person's own lifespan. The margin uses only the person's own events (birth, death, etc.) — family events like sibling births do not expand the range.

**Default setting:** Rather than adding `context:` to every timeline block, you can set a default context note in Settings > Events & timelines > Context events > **Default timeline context**. All timelines will use this note unless overridden per block.

#### Age annotations

When a person's birth date is known, all timeline events (including context events) display an age annotation showing the person's age at the time of the event. For example, a marriage in 1875 for someone born in 1850 would show "age 25".

#### Timeline layout modes

The `layout` parameter (or the global setting in Settings > Advanced > Timeline layout) controls how events are arranged:

| Mode | Description |
|------|-------------|
| `chronological` (default) | All events interleaved by date |
| `grouped` | Separate sections with dividers: Life events, Family events, Historical context |
| `personal-first` | Personal events first (sorted), then family and context events chronologically |

#### Timeline format strings

The `format` parameter controls how each entry is rendered using placeholders:

~~~markdown
```charted-roots-timeline
format: "{year} — {title} in {place}"
```
~~~

**Available placeholders:**

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{year}` | Year or date range | `1850` |
| `{date}` | Full date | `1850-01-01` |
| `{type}` | Event type label | `Birth` |
| `{title}` | Event title/description | `Born` or `Birth of John` |
| `{place}` | Place name (omitted if empty) | `Boston, MA` |
| `{age}` | Age annotation (omitted if unknown) | `age 23` |

When a placeholder's value is empty, it and surrounding literal text (like "in ") are automatically omitted.

#### Timeline template notes

For full control, reference a template note that defines custom sections with independent configuration:

~~~markdown
```charted-roots-timeline
template: [[My Timeline Template]]
```
~~~

**Template note format:**

A template note uses `##` headings for sections, each with optional `sort:`, `include:`, and `format:` config lines:

    ---
    cr_type: timeline_template
    ---

    ## Life events
    sort: chronological
    include: birth, death, marriage, occupation
    format: "{year} — {title} in {place}"

    ## Family
    sort: chronological
    include: family
    format: "{year} — {title}"

    ## Historical context
    sort: chronological
    include: context

**Include filter values:** Event types (`birth`, `death`, `marriage`, etc.) and categories (`personal`, `family`, `context`, `children_births`, `spouse_deaths`, `parent_deaths`, `sibling_births`).

Set a global default template in Settings > Advanced > Default timeline template to apply it to all timelines without editing individual notes.

### Relationships Block

The `charted-roots-relationships` block displays family members with clickable links.

~~~markdown
```charted-roots-relationships
type: immediate
```
~~~

**What it displays:**
- Parents (father, mother, adoptive father, adoptive mother, step-parents)
- Spouse(s)
- Children — biological children, adopted children (`Adopted child:` label), and stepchildren (`Stepchild:` label), matching the labeling convention used for adoptive / step parents. Bio + adopted + step children are merged and **sorted by birth date** using the same universe-aware comparator as siblings, so the Children list reads chronologically regardless of frontmatter order or relationship-type source.
- Siblings (when using `type: extended` or `type: all`) — biological siblings share a parent with the focal person; adoptive siblings appear with an `Adoptive sibling:` label and cover three sources: bio kids of the focal's adoptive parents, anyone adopted into the focal's biological-parent household, and other adopted children of the focal's adoptive parents (so the relationship surfaces symmetrically regardless of which side is bio and which is adopted). Bio + adoptive siblings are merged and **sorted by birth date** using the universe's calendar, oldest first — descending fictional eras (e.g. Star Wars BBY) sort correctly alongside Gregorian dates, and persons without a parseable birth date sink to the end while preserving relative order.

Each person is shown as a wikilink with their birth-death years.

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `type` | `immediate`, `extended`, `all` | Relationship scope (default: immediate) |
| `include` | comma-separated types | Only show these relationship types |
| `exclude` | comma-separated types | Hide these relationship types |
| `title` | string | Custom header text (default: "Family") |

**Relationship types:**
- `immediate`: Parents (biological, adoptive, step-), spouse(s), children. No siblings.
- `extended`: Everything in `immediate`, plus siblings — biological (derived from shared parents) and adoptive (derived from shared adoptive parents, labeled `Adoptive sibling:`).
- `all`: Everything in `extended`, plus custom-typed relationships declared in the person's `relationships` frontmatter array (mentor, godparent, ally, etc.).

2nd-degree kinship — aunts, uncles, cousins, grandparents, grandchildren — is not currently derived in any mode; see [#424](https://github.com/banisterious/obsidian-charted-roots/issues/424) for the tracked enhancement.

**Example with options:**

~~~markdown
```charted-roots-relationships
type: extended
title: Family Tree
```
~~~

### Media Block

The `charted-roots-media` block displays a gallery of media files linked to the person.

~~~markdown
```charted-roots-media
columns: 3
size: medium
```
~~~

**What it displays:**
- All media files linked via the `media` frontmatter property
- Image thumbnails in a responsive grid
- PDF first-page thumbnail previews (generated via Obsidian's built-in PDF.js)
- Document placeholders for other non-image files
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
```charted-roots-media
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

**Per-image captions:**

Each thumbnail can carry a short caption — useful for the deep-archive use case where many photos per person each benefit from a brief label like "1978 - Jon Aged 3" rather than a single long-form description in the note body. Captions render beneath the thumbnail in muted text, single-line truncated with full text on hover.

- Right-click any thumbnail for **Set caption** / **Edit caption** / **Remove caption** options, mirroring the existing crop-region affordance.
- Captions persist as a flat `media_captions` parallel string array on the entity note's frontmatter, index-aligned with the `media:` array — same shape as the `<type>_notes` pattern from custom relationships. Empty / missing slots are padded with empty strings to keep indices aligned, and the array reshuffles in lockstep when you drag to reorder media in editable mode.
- Frozen-gallery output (the `❄️` button) preserves captions by injecting them into the wikilink alias slot (`![[wedding-1925.jpg|Wedding day, June 1925]]`), so the static markdown stays self-contained after the block is replaced.

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

### Members Block

The `charted-roots-members` block displays the members of an organization, grouped by role. Place this block in an organization note to see all persons who are members. The [Org Profile View → Members section](Entity-Profile-View#organization-profiles) follows the same role-grouping rules and shares a single grouping helper, so the two surfaces stay consistent.

~~~markdown
```charted-roots-members
group-by: role
```
~~~

**What it displays:**
- All persons with a membership linking them to this organization
- Members grouped by role, with clickable wikilinks to person notes
- Date ranges for membership periods (e.g., "1850–1865" or "1920–present")
- Former members shown with a dimmed style
- Optional membership notes

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `group-by` | `role`, `none` | Group members by role (default: role) |
| `sort` | `name`, `date` | Sort order within groups (default: name). `date` sorts by each member's membership start date (`from`) — earliest first, undated members last, name as a tiebreak — and fictional BBY/ABY join dates order by true chronology |
| `show-former` | `true`, `false` | Include former members (default: true) |
| `show-dates` | `true`, `false` | Show membership date ranges (default: true) |
| `show-notes` | `true`, `false` | Show membership notes (default: false) |
| `role-order` | comma-separated roles | Pin specific roles to the top in order |
| `title` | string | Custom header text (default: "Members") |

**Example with options:**

~~~markdown
```charted-roots-members
group-by: role
sort: date
show-notes: true
role-order: Pastor, Elder, Deacon
title: Congregation
```
~~~

**Rendered output:**

When grouped by role, each role gets its own heading:

#### Pastor
- [[John Smith]] (1850–1875)

#### Elder
- [[James Brown]] (1852–present)
- [[Thomas Davis]] (1860–1868)

#### Members
- [[Jane Smith]]
- [[Mary Johnson]]

**Role ordering fallback chain:**

1. **Block-level `role-order`** — if specified, those roles appear first in that sequence
2. **Organization's `roles` property** — if the organization note defines a `roles` list, that order is used
3. **Alphabetical** — remaining named roles follow alphabetically; members with no role appear last under "Members"

This means if your organization note already defines `roles`, the members block will use that order automatically without needing `role-order` config.

**Note:** This block is designed for organization notes (`cr_type: organization`). Membership data is stored on person notes via the `organizations` frontmatter property. See [Organizations](Organizations) for details on setting up organizations and memberships.

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

### Negative Findings Block

The `charted-roots-negative-findings` block displays a log of negative research findings — sources searched that did not yield results for a person.

~~~markdown
```charted-roots-negative-findings
sort: chronological
```
~~~

**What it displays:**
- All negative findings logged for the person from research journal entries
- Date searched, source name, what was searched for, and notes
- Helps identify which sources have already been exhausted

See [Research Workflow](Research-Workflow) for details on logging negative findings.

### Research Timeline Block

The `charted-roots-research-timeline` block visualizes research activity across your vault with three view modes.

~~~markdown
```charted-roots-research-timeline
view: table
person: "[[John Smith]]"
```
~~~

**View modes:**

#### Table view (default)

A chronological activity log showing all research sessions:

| Column | Description |
|--------|-------------|
| **Date** | When the research was conducted |
| **Source** | Source searched |
| **Searched for** | What was being looked for |
| **Result** | Positive, negative, or inconclusive (with icon) |
| **Project** | Associated research project |
| **Person** | Person the research relates to |
| **Gap** | Days since last research activity (flagged if exceeding threshold) |

Rows exceeding the gap threshold are highlighted in orange to draw attention to periods of inactivity.

#### Heatmap view

A GitHub-style contribution grid showing 52 weeks of research activity density. Color intensity indicates the number of research sessions per day. Includes a summary showing the longest gap period.

~~~markdown
```charted-roots-research-timeline
view: heatmap
```
~~~

#### Timeline view

Horizontal bars per person or project with color-coded markers:
- **Green**: Positive result
- **Red**: Negative result
- **Yellow**: Inconclusive result

Gap regions between markers are highlighted to show periods of inactivity.

~~~markdown
```charted-roots-research-timeline
view: timeline
```
~~~

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `view` | `table`, `heatmap`, `timeline` | Visualization mode (default: table) |
| `person` | wikilink | Filter to a specific person |
| `project` | string | Filter to a specific research project |
| `gap` | number | Minimum days to flag as a gap (default: 30) |
| `sort` | `chronological`, `reverse` | Sort order (default: chronological) |
| `group` | `person`, `project`, `source` | Group rows by field (table view only) |
| `title` | string | Custom header text |

**Data sources:** Gathers entries from both `research_log_entry` frontmatter and `research_journal` markdown entries. Re-renders live when vault metadata changes. The table view supports freeze-to-markdown.

### Universe Entity Blocks

Four blocks for universe notes that automatically list all entities belonging to that universe. Place these in a universe note.

**`charted-roots-universe-people`** — Table of people with name, born, died, occupation:

~~~markdown
```charted-roots-universe-people
sort: name
limit: 50
```
~~~

**`charted-roots-universe-places`** — Table of places with name and place type.

**`charted-roots-universe-events`** — Table of events with name, date, type badge, and place.

**`charted-roots-universe-organizations`** — Table of organizations with name and type.

**`charted-roots-universe-maps`** — Clickable map image thumbnails for custom maps. Shows place count badge. Supports `size` parameter (small/medium/large).

All entries are clickable wikilinks. Supports `sort` (name/date/type) and `limit` parameters. Auto-refreshes when vault data changes.

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
```charted-roots-timeline
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
```charted-roots-timeline
```

```charted-roots-relationships
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
