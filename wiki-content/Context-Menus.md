# Context Menus

Charted Roots adds context menu actions throughout Obsidian. Right-click on files, folders, and canvases to access quick actions without opening the Control Center.

---

## Table of Contents

- [Person Notes](#person-notes)
- [Place Notes](#place-notes)
- [Source Notes](#source-notes)
- [Event Notes](#event-notes)
- [Map Notes](#map-notes)
- [Canvas Files](#canvas-files)
- [Folders](#folders)
- [Multiple Files](#multiple-files)
- [Plain Markdown Files](#plain-markdown-files)
- [Mobile vs Desktop](#mobile-vs-desktop)
- [Control Center Context Menus](#control-center-context-menus)
- [Tips](#tips)

---

## Person Notes

Right-click on any markdown file with a `cr_id` frontmatter property:

| Action | Description |
|--------|-------------|
| **Generate visual tree** | Open the Tree Wizard with this person pre-selected |
| **[Open profile](Entity-Profile-View)** | Open the Entity Profile View for this person |
| **Edit person** | Open the person editing modal |
| **Add relationship...** | |
| → Add parent | Add a father or mother relationship |
| → Add spouse | Add a spouse relationship |
| → Add child | Add a child relationship |
| **Validate relationships** | Check for relationship inconsistencies |
| **Find on canvas** | Locate this person on an open canvas |
| **Open in map view** | Show this person's locations on the map |
| **[Show journey on map](Geographic-Features#journey-mode)** | Enter journey mode on the map for this person |
| **[Show on calendar](Calendar-View)** | Open the calendar at this person's birth month/year |
| **[Generate report](Statistics-And-Reports#generating-reports)** | Open the Report Wizard with this person pre-selected |
| **Calculate relationship...** | Find how this person relates to another |
| **Set group name** | Assign a custom name to this person's family group |
| **Set collection** | Add this person to a collection |
| **Add source...** | Add a source citation to this person |
| **Events** | |
| → Create event for this person | Open Create Event modal with person pre-filled |
| → Link to existing event | Search for and link this person to an existing event note |
| → Export timeline to Canvas | Export all events for this person to a Canvas file |
| → Export timeline to Excalidraw | Export all events for this person to an Excalidraw file |
| **Mark as root person** | Designate as a tree root (toggles to "Unmark" if already set) |
| **Assign reference numbers** | |
| → Ahnentafel (ancestors) | Assign ancestor numbering from this person |
| → d'Aboville (descendants) | Assign descendant numbering with dots |
| → Henry (descendants) | Assign compact descendant numbering |
| → Generation (all relatives) | Assign generation depth numbers |
| **Assign lineage** | |
| → All descendants | Mark all descendants with a lineage tag |
| → Patrilineal (father's line) | Mark descendants through male line only |
| → Matrilineal (mother's line) | Mark descendants through female line only |
| **Create place notes...** | Create notes for places mentioned in this person's data |
| **Add essential properties** | |
| → Add essential person properties | Add missing cr_id, cr_type, name, born, died, etc. |
| → Add essential place properties | Convert to a place note with required fields |
| **More options...** | Open the Control Center |

## Place Notes

Right-click on markdown files with `type: place` in frontmatter:

| Action | Description |
|--------|-------------|
| **Set collection** | Add this place to a collection |
| **Open in map view** | Show this place on the map |
| **Edit place** | Open the place editing modal |
| **[Open profile](Entity-Profile-View)** | Open the Entity Profile View for this place |
| **Add essential properties** | Add missing place properties |

## Source Notes

Right-click on markdown files with `cr_type: source` in frontmatter:

| Action | Description |
|--------|-------------|
| **Edit source** | Open the source editing modal |
| **Generate citation** | Generate a formatted citation for this source |
| **Open sources tab** | Open the Control Center Sources tab |
| **[Open profile](Entity-Profile-View)** | Open the Entity Profile View for this source |
| **Add source roles block** | Insert a dynamic source roles block into the note |
| **Link to existing event** | Search for and link this source to an existing event note |
| **Add essential properties** | Add missing source or person properties |

## Event Notes

Right-click on markdown files with `cr_type: event` in frontmatter:

| Action | Description |
|--------|-------------|
| **Edit event** | Open the event editing modal |
| **[Open profile](Entity-Profile-View)** | Open the Entity Profile View for this event |
| **[Show on calendar](Calendar-View)** | Open the calendar at this event's date |
| **Media** | |
| → Link media... | Attach an image or document to this event |
| → Manage media... | View and manage linked media |
| **Add essential event properties** | Add missing event properties |
| **Add cr_id** | Add a unique identifier if missing |

## Map Notes

Right-click on markdown files with `type: map` in frontmatter:

| Action | Description |
|--------|-------------|
| **Open in map view** | Open this custom map in the Map View |
| **Add essential map properties** | Add missing map configuration properties |

## Canvas Files

Right-click on `.canvas` files generated by Charted Roots:

| Action | Description |
|--------|-------------|
| **Regenerate canvas** | Update the tree with current data |
| **Show tree statistics** | Display information about the tree |
| **Customize canvas styles** | Open styling options |
| **Open in family chart** | View in the interactive Family Chart |
| **Export** | |
| → Export to Excalidraw | Convert to Excalidraw for annotation |
| → Export as PNG | Save as high-resolution image |
| → Export as SVG | Save as vector graphic |
| → Export as PDF | Save as PDF document |
| **Split canvas wizard** | Plan how to split large trees |
| **More options...** | Open the Control Center |

## Folders

Right-click on folders in the file explorer. Available actions depend on which folder type is configured:

### People folder

| Action | Description |
|--------|-------------|
| **Create person** | Open the create person modal |
| **Create family** | Open the family creation wizard |
| **Import GEDCOM to this folder** | Import a GEDCOM file, creating notes in this folder |
| **Export GEDCOM from this folder** | Export all person notes in this folder to GEDCOM |
| **Scan for relationship issues** | Check all notes in folder for problems |
| **New people base from template** | Create an Obsidian Base for managing people |
| **Generate all trees** | Create canvases for all family groups in this folder |
| **Show folder statistics** | Display data quality metrics for this folder |

### Sources folder

| Action | Description |
|--------|-------------|
| **Create source** | Open the create source modal |
| **Add essential source properties** | Add missing source properties to all files in folder |
| **Add cr_id** | Add missing `cr_id` to source notes |
| **New sources base from template** | Create an Obsidian Base for managing sources |
| **Show folder statistics** | Display data quality metrics for this folder |

### Events folder

| Action | Description |
|--------|-------------|
| **Create event** | Open the create event modal |
| **Add essential event properties** | Add missing event properties to all files in folder |
| **Add cr_id** | Add missing `cr_id` to event notes |
| **New events base from template** | Create an Obsidian Base for managing events |
| **Show folder statistics** | Display data quality metrics for this folder |

### Any folder

| Action | Description |
|--------|-------------|
| **Set as people folder** | Configure as the default folder for person notes |
| **Set as places folder** | Configure as the default folder for place notes |
| **Show folder statistics** | Display data quality metrics for this folder |

## Multiple Files

When selecting multiple markdown files, right-click for bulk operations:

| Action | Description |
|--------|-------------|
| **Add essential person properties** | Add missing person properties to all selected files |
| **Add essential place properties** | Add missing place properties to all selected files |

These options only appear if at least one selected file is missing the relevant properties.

## Plain Markdown Files

Right-click on markdown files without Charted Roots properties:

| Action | Description |
|--------|-------------|
| **Add essential person properties** | Convert to a person note with cr_id, cr_type, name, etc. |
| **Add essential place properties** | Convert to a place note with required fields |

## Mobile vs Desktop

On **desktop**, context menu items are organized in nested submenus under a "Charted Roots" parent menu.

On **mobile**, all items appear as a flat list with "Charted Roots:" prefixes for clarity in the smaller interface.

## Control Center Context Menus

The Control Center includes context menus for quick actions within its various tabs and cards.

### Person List (People Tab)

Right-click on any person in the People tab list:

| Action | Description |
|--------|-------------|
| **Open note** | Open the person's note in the current tab |
| **Open in new tab** | Open the person's note in a new tab |
| **Events** | |
| → Create event for this person | Open Create Event modal with person pre-filled |
| → Link to existing event | Search for and link this person to an existing event note |
| → Export timeline to Canvas | Export all events for this person to a Canvas file |
| → Export timeline to Excalidraw | Export all events for this person to an Excalidraw file |

### Event Timeline (Events Tab)

Right-click on any event row in the Timeline card:

| Action | Description |
|--------|-------------|
| **Open note** | Open the event note in the current tab |
| **Open in new tab** | Open the event note in a new tab |
| **Delete event** | Delete the event note (with confirmation dialog) |

### Source List (Sources Tab)

Right-click on any source row:

| Action | Description |
|--------|-------------|
| **Edit source** | Open the source editing modal |
| **Extract events** | Extract events from this source |
| **Open note** | Open the source note |

## Tips

- **Quick tree generation**: Right-click a person → Generate visual tree (opens wizard with person pre-selected)
- **Bulk property addition**: Select multiple files → right-click → Add essential properties
- **Fast relationship editing**: Right-click a person → Add relationship → choose type
- **Canvas updates**: After editing notes, right-click canvas → Regenerate canvas
- **Quick event creation**: In People tab, right-click a person → Events → Create event for this person
