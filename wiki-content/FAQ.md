# FAQ

Common questions about Canvas Roots.

---

## Table of Contents

- [General](#general)
- [Data Entry](#data-entry)
- [Tree Generation](#tree-generation)
- [Family Chart View](#family-chart-view)
- [Import/Export](#importexport)
- [Media](#media)
- [Reports & Output](#reports--output)
- [Geographic Features](#geographic-features)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Events](#events)
- [Property Aliases](#property-aliases)
- [Getting Help](#getting-help)

---

## General

### What is Canvas Roots?

Canvas Roots is an Obsidian plugin that transforms genealogical data stored in your markdown notes into visual family trees on the Obsidian Canvas. It supports both real-world family research and fictional world-building.

### Do I need to know how to code?

No. Canvas Roots uses YAML frontmatter in your markdown notes, which is a simple key-value format. If you can write `name: John Smith`, you can use Canvas Roots.

### Can I use Canvas Roots for fictional family trees?

Yes! Canvas Roots works equally well for real genealogy and fictional world-building. Use the `universe` property on place notes to organize fictional worlds, and the geographic features support custom image maps for fantasy worlds.

## Data Entry

### What's the minimum information needed for a person?

Just two things:
- `cr_id`: A unique identifier (Canvas Roots can auto-generate this)
- `name`: The person's name

Everything else (dates, relationships, places) is optional.

### Should I use wikilinks or IDs for relationships?

Use both when possible. Wikilinks (`father: "[[John Smith]]"`) show in Obsidian's graph view and backlinks. IDs (`father_id: "abc-123"`) provide reliable programmatic resolution that survives file renames.

### How do I handle multiple marriages?

Use indexed spouse properties:
```yaml
spouse1: "[[First Spouse]]"
spouse1_id: "spouse1-cr-id"
spouse1_marriage_date: "1980"
spouse2: "[[Second Spouse]]"
spouse2_id: "spouse2-cr-id"
spouse2_marriage_date: "1995"
```

### What date formats are supported?

Canvas Roots accepts:
- Year only: `1888`
- Year and month: `1888-05`
- Full date: `1888-05-15`

ISO format (YYYY-MM-DD) is recommended for consistency.

## Tree Generation

### Why isn't someone showing in my tree?

Check:
1. They have a `cr_id` property
2. Their `cr_id` is referenced correctly in relationship fields
3. Generation limits aren't excluding them
4. If they're a spouse, check if "Include spouses" is enabled

### What's the difference between layout algorithms?

- **Standard**: Best for most trees, proper spouse positioning
- **Compact**: 50% tighter spacing for large trees (50+ people)
- **Timeline**: Positions by birth year horizontally
- **Hourglass**: Root person centered, ancestors above, descendants below

### How do I update a tree after editing notes?

Right-click the canvas → "Regenerate canvas", or use the command palette.

## Family Chart View

### What's the difference between Family Chart View and Canvas?

| Aspect | Family Chart View | Canvas |
|--------|-------------------|--------|
| Purpose | Interactive exploration | Static documentation |
| Editing | Direct in-chart editing | Edit source notes |
| Persistence | View state saved | Canvas file saved |
| Export | PNG, SVG, PDF, ODT | Canvas file |
| Styling | Theme presets, custom colors | Style Settings only |
| Best for | Day-to-day research | Sharing/archiving |

### Can I export from the Family Chart View?

Yes. Click the Export button to open the Export Wizard with:
- **5 Quick Presets**: Quick Share, High Quality, Print Ready, Editable, Document
- **Format options**: PNG, SVG, PDF, ODT
- **Customization**: Scale, avatars, cover pages, page layout

See [Family Chart View: Exporting](Family-Chart-View#exporting-the-chart) for details.

### Can I have multiple chart views open?

Yes. Use "Open new family chart" to open additional tabs with different root persons.

## Import/Export

### What genealogy software can I import from?

Canvas Roots supports multiple import formats:

**GEDCOM 5.5.1** — The universal genealogy exchange format, exported by:
- Ancestry
- FamilySearch
- MyHeritage
- Legacy Family Tree
- Most other genealogy software

**Gramps XML / .gpkg** — Direct import from Gramps:
- Gramps XML files (`.gramps` or exported XML)
- Gramps Packages (`.gpkg`) with bundled media files automatically extracted

**CSV** — Spreadsheet data with configurable column mapping

See [Import & Export](Import-Export) for detailed instructions.

### Will importing overwrite my existing data?

No. Canvas Roots detects duplicates by `cr_id` and updates relationships without overwriting research notes you've added.

### How do I protect living relatives in exports?

Enable privacy protection in Settings → Canvas Roots → GEDCOM:
- Set a birth year threshold
- Choose to exclude or anonymize living persons

## Media

### What types of media can I link to entities?

Canvas Roots supports images, videos, audio, PDFs, and documents. Media can be linked to:
- People
- Events
- Places
- Organizations
- Sources

Use the `media` property in frontmatter with wikilinks:

```yaml
media:
  - "[[portrait.jpg]]"
  - "[[birth-certificate.pdf]]"
```

### What's the difference between the media linking tools?

Canvas Roots offers several ways to link media, each suited to different workflows:

| Tool | Best for | Access |
|------|----------|--------|
| **Bulk Link Media** | Linking files to multiple entities at once | Dashboard → Media → Bulk Link Media |
| **Find Unlinked** | Discovering orphaned media files | Dashboard → Media → Find Unlinked |
| **Source Media Linker** | Smart filename matching to sources | Dashboard → Media → Source Media Linker |
| **Linked Media Gallery** | Browsing all linked media | Dashboard → Media → Linked Media Gallery |

See [Media Management](Media-Management) for detailed documentation.

### How do I display media in person notes?

Use the dynamic `canvas-roots-media` code block:

~~~markdown
```canvas-roots-media
columns: 3
editable: true
```
~~~

This renders a gallery from the note's `media` property. With `editable: true`, you can drag to reorder—the first item becomes the thumbnail shown on Family Chart cards.

### How do I get media into my vault from Gramps?

Export from Gramps as a **Gramps Package (`.gpkg`)** file, which bundles XML data and media files together. When you import the `.gpkg` file, Canvas Roots automatically:
1. Extracts media files to your configured media folder
2. Creates notes with `media` properties linking to the extracted files

## Reports & Output

### What export/output options does Canvas Roots offer?

Canvas Roots provides several ways to visualize and share your data:

| Output Type | Formats | Best for |
|-------------|---------|----------|
| **Family Chart** | PNG, SVG, PDF, ODT | Interactive exploration, sharing trees |
| **Canvas** | Obsidian Canvas, Excalidraw | Permanent documentation, Obsidian integration |
| **Reports** | Markdown, PDF | Narrative genealogy, research documentation |
| **Data Export** | GEDCOM, Gramps XML, CSV | Backup, sharing with other software |

### When should I use Family Chart vs Canvas generation?

**Use Family Chart View when:**
- Exploring and navigating your tree interactively
- Making quick edits to person data
- Exporting to share (PNG, PDF)
- You want live sync with your notes

**Use Canvas generation when:**
- Creating a permanent, editable document
- You want to annotate the tree in Obsidian
- Exporting to Excalidraw for further editing
- Building a static reference document

### What report types are available?

Canvas Roots includes several genealogical report types:

- **Ancestor Report** — List of ancestors with dates and places
- **Descendant Report** — List of descendants organized by generation
- **Family Group Sheet** — Traditional genealogy format for a nuclear family
- **Timeline Report** — Chronological view of events
- **Pedigree Chart** — Visual ancestor tree (PDF)
- **Descendant Tree** — Visual descendant tree (PDF)
- **Media Inventory** — Catalog of linked media files

Access reports via **Dashboard → Reports** or the command palette.

### Can I export reports as PDF?

Yes. Most reports support PDF export with:
- Custom cover page with title and subtitle
- Optional logo
- Styled formatting

Click "Export as PDF" when viewing a report.

## Geographic Features

### Do I need coordinates for every place?

No. Coordinates are only needed for map visualization. Places without coordinates still work for frontmatter references and hierarchy.

### Can I use custom maps for fictional worlds?

Yes. Create a map note with a custom image and coordinate bounds. See [Geographic Features](Geographic-Features#custom-image-maps) for details.

### How do I look up coordinates automatically?

Canvas Roots can query OpenStreetMap's Nominatim service. In place editing, click "Look up coordinates" and review the results.

## Performance

### How many people can Canvas Roots handle?

Canvas Roots has been tested with trees of 500+ people. For very large trees:
- Use generation limits
- Generate focused subtrees (ancestors only, or descendants only)
- Use the Compact layout algorithm

### Why is tree generation slow?

Large trees with complex relationships take longer. Try:
- Limiting generations
- Generating ancestors or descendants separately
- Using the Preview feature to check layout before generating

## Troubleshooting

### My tree won't generate

- Verify the root person has a `cr_id`
- Check relationships reference valid `cr_id` values
- Enable debug logging in Settings → Canvas Roots → Logging

### Relationships aren't syncing bidirectionally

- Verify bidirectional sync is enabled in Settings
- Check that "Sync on file modify" is also enabled
- Ensure person notes have valid `cr_id` fields

### When should I run "Fix bidirectional relationship inconsistencies"?

**Good times to run it:**
- After manual edits where you added a relationship to one person but forgot the reciprocal link
- As a periodic sanity check during active data entry (every 10-20 manual edits)
- Before major exports or canvas generation

**When it's unnecessary:**
- After GEDCOM imports — the importer already creates complete bidirectional relationships
- After using the plugin's built-in relationship editing UI

**Important:** If you have unresolved parent claim conflicts (e.g., step-parents), resolve those first before running the bidirectional fix.

### GEDCOM import shows errors

- Verify the file is valid GEDCOM 5.5.1 format
- Check for encoding issues (should be UTF-8)
- Try importing a smaller subset first

## Events

### How do I associate events with families or organizations?

Use the `groups` property on event notes to tag them with families, factions, lineages, or organizations:

```yaml
cr_type: event
title: "Smith Family moves to Boston"
event_type: residence
date: 1892
place: "[[Boston, Massachusetts]]"
groups:
  - "Smith Family"
  - "Irish Immigrants"
```

This enables:
- **Filtering** timeline exports by group/faction
- **Organizing** events by family branch or lineage
- **Tracking** organizational history (guilds, houses, companies)

For worldbuilding, you can tag events with nations, factions, or power structures:

```yaml
groups:
  - "House Stark"
  - "The North"
```

See [Events & Timelines: Groups and Factions](Events-And-Timelines#groups-and-factions) for more details.

### What's the difference between `groups` and organization notes?

- **`groups`**: Free-text tags for filtering and organizing events. Quick and flexible.
- **Organization notes**: Full entity notes with `cr_type: organization`, hierarchies, membership tracking, and structured data.

Use `groups` for lightweight tagging. Use organization notes when you need to track members, roles, parent organizations, or other structured relationships.

## Property Aliases

### Can I use the same property name for different entity types?

**Question:** Instead of `place_type`, `org_type`, `event_type`, etc., can I map them all to a single property like `category`?

**Answer:** This is possible with property aliases, but we don't recommend collapsing distinct type properties into one. Here's why:

**The ambiguity problem:**

```yaml
# Note A
cr_type: place
category: church

# Note B
cr_type: organization
category: church
```

Is "church" a place type (St. Patrick's Cathedral as a location) or an org type (the Catholic Church as an institution)? The plugin would need `cr_type` to disambiguate, which it already does—but queries become more complex, Dataview/Bases views need compound filters, and the value space becomes a messy union of all possible types.

**The better approach:**

Use property aliases to achieve consistent naming without ambiguity:

```yaml
# In settings, map:
place_type → category
org_type → category
event_type → category
```

Now you use `category` everywhere in your notes, but the plugin knows from `cr_type` which domain the value belongs to. Each entity type maintains its own valid value set.

### Can I map parent properties to a generic name like `hierarchy`?

Yes. If you want `parent_org` and `parent_place` to both be called `parent` or `hierarchy` in your frontmatter, property aliases support this. The plugin will read from your aliased property name and understand from the note's `cr_type` which parent relationship it represents.

### Which properties support aliases?

See [Settings & Configuration](Settings-And-Configuration#property-aliases) for the full list. Note that some properties don't yet have alias support—this is being expanded over time.

## Getting Help

- **Bug reports**: [GitHub Issues](https://github.com/banisterious/obsidian-canvas-roots/issues)
- **Feature requests**: [GitHub Issues](https://github.com/banisterious/obsidian-canvas-roots/issues) with "enhancement" label
- **Documentation**: This wiki
