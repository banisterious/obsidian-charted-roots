# Settings & Configuration

This page documents all Charted Roots settings and configuration options. Access settings via **Obsidian Settings → Charted Roots**.

---

## Table of Contents

- [Control Center Overview](#control-center-overview)
- [Setting Categories](#setting-categories)
- [Property Aliases](#property-aliases)
- [Value Aliases](#value-aliases)
- [Settings Reference](#settings-reference)

---

## Control Center Overview

The Control Center (`Cmd/Ctrl+Shift+F`) is the main hub for Charted Roots features. It has a tabbed interface:

| Tab | Description |
|-----|-------------|
| **Dashboard** | Quick actions, vault health, recent files |
| **People** | Browse, search, and manage person notes |
| **Events** | View and manage life events with timeline visualization |
| **Places** | Manage place notes, view place hierarchy |
| **Sources** | Manage source notes and evidence |
| **Organizations** | Manage organization notes and memberships |
| **Universes** | Fictional universe management |
| **Collections** | Family groups and custom collections |
| **Data Quality** | Validation issues, duplicate detection, research gaps |
| **Schemas** | Create and run validation schemas |
| **Relationships** | Custom relationship type definitions |
| **Visual Trees** | Canvas tree generation with preview |
| **Maps** | Interactive map view, custom image maps |

Most entity tabs also support **dockable sidebar views** — see [Control Center](Control-Center#dockable-sidebar-views) for details.

---

## Folder Locations

Configure where Charted Roots stores and looks for different note types.

| Setting | Default | Description |
|---------|---------|-------------|
| **People folder** | `Charted Roots/People` | Default folder for person notes |
| **Places folder** | `Charted Roots/Places` | Default folder for place notes |
| **Map notes folder** | `Charted Roots/Places/Maps` | Default folder for map notes |
| **Organizations folder** | `Charted Roots/Organizations` | Default folder for organization notes |
| **Sources folder** | `Charted Roots/Sources` | Default folder for source notes |
| **Events folder** | `Charted Roots/Events` | Default folder for event notes |
| **Schemas folder** | `Charted Roots/Schemas` | Default folder for validation schemas |
| **Canvases folder** | `Charted Roots/Canvases` | Default folder for generated canvas files |
| **Bases folder** | `Charted Roots/Bases` | Folder for Obsidian Bases templates |
| **Staging folder** | *(empty)* | Folder for import staging (isolated from main operations) |

### Staging Folder

The staging folder is used for importing GEDCOM/CSV files before merging into your main tree. When configured:

- Imported notes go to the staging folder first
- The staging folder is excluded from normal operations (tree generation, duplicate detection)
- You can review and merge staged notes using the Import/Export tab

Set **Enable staging isolation** to automatically exclude the staging folder from normal scans.

### Media Folders

Control which folders Charted Roots scans when discovering media files.

| Setting | Default | Description |
|---------|---------|-------------|
| **Limit media scanning to specified folders** | Off | When enabled, only scan listed folders for media |
| **Media folders** | *(empty)* | List of folders to scan (one per line) |

When enabled, folder filtering affects:
- **Find Unlinked** results in the Media Manager
- **Media Manager statistics** (total files, coverage percentage)
- **Media picker** file lists when linking media

It does **not** affect:
- Already-linked media (always displayed regardless of location)
- **Linked Media Gallery** (shows all linked media)
- Media imported from Gramps packages

See [Media Management](Media-Management#media-folder-settings) for more details.

---

## Property Aliases

If your vault uses different property names than Charted Roots defaults, you can create **property aliases** to map your custom names to the canonical Charted Roots fields.

### Configuring Aliases

Go to **Settings → Charted Roots → Property & value aliases** to add, edit, or remove aliases.

### How Aliases Work

| Scenario | Behavior |
|----------|----------|
| **Reading notes** | Charted Roots checks for the canonical property first, then falls back to your alias |
| **Creating/importing notes** | New notes use your aliased property name instead of the canonical name |
| **Both properties exist** | The canonical property takes precedence |

### Example

If your vault uses `birthdate` instead of `born`:

1. Add an alias: `birthdate` → `born`
2. Charted Roots will now read `birthdate` as the birth date
3. When importing GEDCOM files, notes will be created with `birthdate` instead of `born`
4. Bases templates will use `note.birthdate` in views and formulas

### Bases Templates and Aliases

When you create a new People base template (Control Center → Advanced → Create Bases template), it will use your configured aliases:

- Column references use aliased names (e.g., `note.birthdate` instead of `note.born`)
- Filter expressions use aliased names
- Formulas reference aliased properties

> **Note:** Existing Bases files are not automatically updated when aliases change. Delete and recreate the base file to apply new alias configurations.

### Supported Properties

| Category | Properties |
|----------|------------|
| Identity | `name`, `cr_id`, `gender`, `nickname`, `maiden_name` |
| Dates | `born`, `died` |
| Places | `birth_place`, `death_place` |
| Relationships | `father`, `father_id`, `mother`, `mother_id`, `spouse`, `spouse_id`, `child`, `children_id` |
| Other | `occupation`, `universe`, `image`, `sourced_facts`, `relationships` |

---

## Value Aliases

In addition to property names, you can also create **value aliases** to map custom property values to Charted Roots' canonical values. This is useful when your vault uses different terminology for enumerated fields.

### Configuring Value Aliases

Go to **Settings → Charted Roots → Property & value aliases → Value aliases** to add, edit, or remove value aliases.

### How Value Aliases Work

| Scenario | Behavior |
|----------|----------|
| **Reading notes** | Charted Roots checks if the value is canonical first, then checks for an alias |
| **Unknown event types** | Unrecognized event types are treated as `custom` |
| **Unknown gender/place category** | Unrecognized values are passed through unchanged |

### Supported Fields

#### Event Types

Map custom event type values to canonical types:

| Canonical Value | Description | Example Aliases |
|-----------------|-------------|-----------------|
| `birth` | Birth of a person | `nameday`, `born` |
| `death` | Death of a person | `passing`, `died` |
| `marriage` | Marriage ceremony | `wedding`, `union` |
| `burial` | Burial or interment | `interment`, `funeral` |
| `residence` | Change of residence | `moved`, `relocation` |
| `occupation` | Employment change | `job`, `career` |
| `education` | Educational milestone | `school`, `graduated` |
| `military` | Military service | `service`, `enlisted` |
| `immigration` | Immigration or emigration | `moved_abroad`, `emigration` |
| `baptism` | Baptism ceremony | `christening` |
| `confirmation` | Religious confirmation | — |
| `ordination` | Religious ordination | — |
| `custom` | Custom/other event type | — |

#### Gender

Map custom gender values to canonical values:

| Canonical Value | Description | Example Aliases |
|-----------------|-------------|-----------------|
| `male` | Male | `m`, `masc`, `man` |
| `female` | Female | `f`, `fem`, `woman` |
| `nonbinary` | Non-binary | `nb`, `enby`, `other` |
| `unknown` | Unknown | `?`, `unspecified` |

> **Note:** Charted Roots also recognizes legacy values `M` and `F` for compatibility with existing vaults.

#### Place Categories

Map custom place category values to canonical categories:

| Canonical Value | Description | Example Aliases |
|-----------------|-------------|-----------------|
| `real` | Real-world location | `actual`, `existing` |
| `historical` | Historical (no longer exists) | `former`, `past` |
| `disputed` | Disputed territory | `contested` |
| `legendary` | Legendary location | `mythical` |
| `mythological` | Mythological location | `myth` |
| `fictional` | Fictional location | `made_up`, `fantasy`, `canon` |

### Example

If your vault uses `nameday` instead of `birth` for event types:

1. Add a value alias: `nameday` → `birth` (Field: Event type)
2. Charted Roots will now treat `event_type: nameday` as a birth event
3. Birth markers will appear on maps for events with `nameday` type

---

## Layout Settings

Control the dimensions and spacing of nodes in generated family tree canvases.

| Setting | Default | Description |
|---------|---------|-------------|
| **Default node width** | `200` | Width of person nodes in pixels |
| **Default node height** | `100` | Height of person nodes in pixels |
| **Horizontal spacing** | `400` | Space between nodes horizontally (multiplied by 1.5× in layout engine) |
| **Vertical spacing** | `250` | Space between generations vertically |

> **Tip:** After changing layout settings, right-click any existing canvas file and select "Regenerate canvas" to apply the new settings.

---

## Canvas Styling

Customize the appearance of generated family trees.

### Node Coloring

| Setting | Options | Description |
|---------|---------|-------------|
| **Node color scheme** | `gender`, `generation`, `collection`, `monochrome` | How to color person nodes |

- **Gender**: Green for male, purple for female (default)
- **Generation**: Different colors for each generation level
- **Collection**: Different colors for each collection/universe
- **Monochrome**: No coloring, neutral appearance

### Edge Styling

| Setting | Options | Description |
|---------|---------|-------------|
| **Parent-child arrow style** | `directed`, `bidirectional`, `undirected` | Arrow style for parent→child edges |
| **Spouse arrow style** | `directed`, `bidirectional`, `undirected` | Arrow style for spouse edges |
| **Parent-child edge color** | Obsidian colors or none | Color for parent→child edges |
| **Spouse edge color** | Obsidian colors or none | Color for spouse edges |

Arrow style options:
- **Directed** (→): Single arrow pointing to child/target
- **Bidirectional** (↔): Arrows on both ends
- **Undirected** (—): No arrows, just lines

### Spouse Edge Display

| Setting | Default | Description |
|---------|---------|-------------|
| **Show spouse edges** | Off | Display edges between spouses with marriage metadata |
| **Spouse edge label format** | `none` | How to display marriage information on spouse edges |

Spouse edge label format options:
- **None**: No labels on spouse edges
- **Date only**: e.g., "m. 1985"
- **Date and location**: e.g., "m. 1985 | Boston, MA"
- **Full details**: e.g., "m. 1985 | Boston, MA | div. 1992"

> **Note:** When "Show spouse edges" is disabled (default), spouses are visually grouped by positioning only, without connecting edges.

### Source Indicators

| Setting | Default | Description |
|---------|---------|-------------|
| **Show source indicators** | Off | Display source count badges on nodes (e.g., "📎 3") |

---

## Data Settings

### Auto-Generation

| Setting | Default | Description |
|---------|---------|-------------|
| **Auto-generate cr_id** | On | Automatically generate `cr_id` for person notes that don't have one |

### Bidirectional Sync

| Setting | Default | Description |
|---------|---------|-------------|
| **Enable bidirectional relationship sync** | On | Automatically maintain reciprocal relationships |
| **Sync on file modify** | On | Sync relationships when person notes are edited |

When bidirectional sync is enabled:
- Setting someone as a `father` automatically adds a `child` link in the father's note
- Works for all relationship types (parent, spouse, child)
- Supports both manual edits and Bases table edits

### Folder Filtering

Control which folders are scanned for person notes.

| Setting | Options | Description |
|---------|---------|-------------|
| **Folder filtering mode** | `disabled`, `exclude`, `include` | How to filter folders |

- **Disabled**: Scan all folders (default)
- **Exclude**: Scan all folders except those listed
- **Include**: Only scan folders in the list

When exclude or include mode is enabled, configure the folder list (one per line).

---

## Privacy Settings

Protect living persons in exports and canvas displays.

| Setting | Default | Description |
|---------|---------|-------------|
| **Enable privacy protection** | Off | Obfuscate living persons in exports |
| **Living person age threshold** | `100` | Years to assume someone is living (if no death date) |
| **Privacy display format** | `living` | How to display protected persons |
| **Hide details for living persons** | On | Hide birth dates/places for living persons |

Privacy display format options:
- **living**: Show "Living" as the name
- **private**: Show "Private" as the name
- **initials**: Show initials only (e.g., "J.S.")
- **hidden**: Exclude from output entirely

---

## Research Tools (Optional)

Found under **Research > Research tools** in the settings panel (moved out of Advanced in v0.22.17). Tools for evidence-based genealogical research, aligned with the Genealogical Proof Standard.

| Setting | Default | Description |
|---------|---------|-------------|
| **Enable fact-level source tracking** | On | Track which facts have source citations |
| **Fact coverage threshold** | `6` | Number of key facts for 100% coverage |
| **Show research gaps in status** | On | Display unsourced facts summary |

When fact-level source tracking is enabled:
- Person notes can include `sourced_facts` property
- Data Quality tab shows research coverage statistics
- Helps identify which facts need documentary evidence
- **Research level** dropdown appears in Edit Person modal
- **Research level filter** appears in Gaps Report options
- Bases views include "By research level", "Needs research", and "Not assessed"

When disabled, research level UI elements are hidden but existing `research_level` values in notes are preserved.

> **Note:** These are opt-in tools for serious researchers. Casual users can leave them disabled.

---

## Logging Settings

Configure console logging and log exports.

| Setting | Default | Description |
|---------|---------|-------------|
| **Log level** | `debug` | Verbosity of console logging |
| **Log export folder** | `.charted-roots/logs` | Folder for exported log files |
| **Obfuscate log exports** | On | Replace PII with placeholders in exports |

Log levels (from most to least verbose):
- **Debug**: All messages
- **Info**: Important events
- **Warn**: Warnings only
- **Error**: Errors only
- **Off**: No logging

---

## Export Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Export filename pattern** | `{name}-family-chart-{date}` | Pattern for exported filenames |

Placeholders:
- `{name}`: Root person's name
- `{date}`: Current date (YYYY-MM-DD)

---

## Fictional Content Settings

Settings for working with fictional genealogies (fantasy worlds, historical fiction, etc.).

### Fictional Date Systems

Located in **Settings > Dates & validation > Fictional date systems**.

| Setting | Default | Description |
|---------|---------|-------------|
| **Enable fictional dates** | On | Parse and display fictional date formats |
| **Show built-in date systems** | On | Show Middle-earth, Westeros, Star Wars presets |

When enabled, built-in systems are displayed in a table with Name, Eras, and Universe columns. Custom systems can be added, edited, and deleted from the same section. Also accessible from the Control Center Events tab via the "Fictional date systems" button.

See [Fictional Date Systems](Fictional-Date-Systems) for full documentation.

### Organization Types

| Setting | Default | Description |
|---------|---------|-------------|
| **Show built-in organization types** | On | Show noble house, guild, etc. |

### Source Types

| Setting | Default | Description |
|---------|---------|-------------|
| **Default citation format** | `evidence_explained` | Citation format for sources |
| **Show source thumbnails** | On | Show media previews in gallery |
| **Thumbnail size** | `medium` | Size of thumbnails |
| **Show built-in source types** | On | Show census, vital record, etc. |

---

## Event Settings

Settings for the Events & Timelines feature.

| Setting | Default | Description |
|---------|---------|-------------|
| **Events folder** | `Charted Roots/Events` | Default folder for new event notes |
| **Show built-in event types** | On | Include 22 built-in event types |
| **Custom event types** | *(empty)* | User-defined event types |

### Event Types

Charted Roots includes 22 built-in event types across four categories:

- **Core** (4): birth, death, marriage, divorce
- **Extended** (9): burial, residence, occupation, education, military, immigration, baptism, confirmation, ordination
- **Narrative** (8): anecdote, lore_event, plot_point, flashback, foreshadowing, backstory, climax, resolution

Custom event types can be added with:
- **ID**: Unique identifier (lowercase, no spaces)
- **Name**: Display name
- **Color**: Hex color for timeline displays
- **Icon**: Lucide icon name
- **Category**: `custom` (automatically assigned)

### Timeline Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Default timeline context** | *(empty)* | Note with historical events to overlay on all timelines (e.g., `[[World History]]`). Can be overridden per block with `context: [[Note]]` or suppressed with `context: none`. See [Dynamic Note Content](Dynamic-Note-Content#historical-context-overlay) for details. |
| **Context lifespan margin** | `0` | Only show context events within this many years of the person's own lifespan. `0` = show all (default). Uses only the person's own events — family events (sibling births, spouse deaths) do not expand the range. |
| **Default layout** | `chronological` | How events are arranged: `chronological` (interleaved by date), `grouped` (sections for personal/family/context), or `personal-first`. See [Layout modes](Dynamic-Note-Content#timeline-layout-modes). |
| **Default timeline template** | *(empty)* | Note defining timeline sections with custom sort, include, and format. See [Template notes](Dynamic-Note-Content#timeline-template-notes). |

### Timeline Labels

Override default labels for timeline events. Use `{name}` as a placeholder for the family member's name.

| Setting | Default | Description |
|---------|---------|-------------|
| **Birth label** | `Born` | Label for the person's own birth event |
| **Death label** | `Died` | Label for the person's own death event |
| **Child birth label** | `Birth of {name}` | Label for children's birth events |
| **Spouse death label** | `Death of {name}` | Label for spouse death events |
| **Parent death label** | `Death of {name}` | Label for parent death events |
| **Sibling birth label** | `Birth of {name}` | Label for sibling birth events |

### Family Events on Timelines

Show significant life events of family members on person timelines. Most default off; **Show divorces** defaults on.

| Setting | Default | Description |
|---------|---------|-------------|
| **Show children's births** | Off | Display "Birth of [[Child Name]]" entries for biological children |
| **Show adopted children's births** | Off | Display "Birth of [[Child Name]]" entries for adopted children. Independent of "Show children's births" — lets you control biological and adopted child visibility separately. |
| **Show spouse deaths** | Off | Display "Death of [[Spouse Name]]" entries |
| **Show parent deaths** | Off | Display "Death of [[Parent Name]]" entries |
| **Show sibling births** | Off | Display "Birth of [[Sibling Name]]" entries. Siblings are derived from shared parents **or** anyone declared via the built-in `sibling` relationship type. |
| **Show divorces** | On | Display "Divorce from [[Spouse Name]]" entries. Marriages always render when present; this toggle governs divorces only. |

Each entry links to the family member's note and shows age annotations. Use `familyEvents: none` in an individual timeline code block to suppress family events on that specific timeline.

> **Note:** The subject's own life events — `born`, `died`, `adoption_date`, and marriages — always render on the timeline when present. No toggle is needed. Adoption events also appear on the adoptive parent's timeline as "Adopted [[Child]]" when the adopted child has `adoption_date` set — this is always on since adoption is a shared life event.

### Relationship Calculator

| Setting | Default | Description |
|---------|---------|-------------|
| **Max search depth** | `10` | Maximum generations to search when finding multiple relationships. `0` = unlimited (may be slow on large vaults). |

---

## Place Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Default place category** | `real` | Default category for new places |
| **Map path label outline** | `None` | Adds a contrasting outline around path labels (person names rendered along migration and journey paths) for legibility on colorful or dark backgrounds. Choices: `None`, `White outline`, `Black outline`. The outline is a 2px SVG `paint-order: stroke fill` halo applied to the label glyphs. See [Geographic Features → Path label legibility](Geographic-Features#path-label-legibility) for visual context. |

Place categories: `real`, `historical`, `disputed`, `legendary`, `mythological`, `fictional`

Category rules can be configured to automatically set categories based on folder or collection.

---

## Relationship Types

| Setting | Default | Description |
|---------|---------|-------------|
| **Show built-in relationship types** | On | Show standard relationship types |

Custom relationship types can be added for specialized genealogical relationships.

---

## Integrations

Settings for third-party plugin integrations.

### Calendarium Integration

If the [Calendarium](https://github.com/javalent/calendarium) plugin is installed, you can import its calendar definitions for use with fictional dates.

| Setting | Options | Description |
|---------|---------|-------------|
| **Integration mode** | `off`, `read` | Controls how Charted Roots interacts with Calendarium |

- **Off**: No integration (default)
- **Read-only (import calendars)**: Import calendar definitions from Calendarium

When enabled, Calendarium calendars appear in:
- The Fictional date systems section in Settings > Dates & validation
- The Date system dropdown in the Create Event modal

See [Fictional Date Systems - Calendarium Integration](Fictional-Date-Systems#calendarium-integration) for details.

---

## See Also

- [Frontmatter Reference](Frontmatter-Reference) - Complete property documentation
- [Data Management](Data-Management) - Managing your family data
- [Schema Validation](Schema-Validation) - Creating validation rules
- [Geographic Features](Geographic-Features) - Place and map features
- [Fictional Date Systems](Fictional-Date-Systems) - Custom calendars and Calendarium integration
