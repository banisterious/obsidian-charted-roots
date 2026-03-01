# Entity Profile View

The Entity Profile View is a dockable sidebar panel that gives you a comprehensive, focused view of any entity (person, place, event, source, or organization). It automatically syncs to whichever note you're viewing, showing all related data in collapsible sections — no more jumping between tabs to see a person's events, sources, and relationships.

---

## Table of Contents

- [Opening the Profile View](#opening-the-profile-view)
- [How Auto-sync Works](#how-auto-sync-works)
- [Identity Header](#identity-header)
- [Pin and Unpin](#pin-and-unpin)
- [Collapsible Sections](#collapsible-sections)
- [Sections by Entity Type](#sections-by-entity-type)
  - [Person Profiles](#person-profiles)
  - [Place Profiles](#place-profiles)
  - [Event Profiles](#event-profiles)
  - [Source Profiles](#source-profiles)
  - [Organization Profiles](#organization-profiles)
- [Navigating Between Entities](#navigating-between-entities)
- [Multiple Profile Views](#multiple-profile-views)
- [State Persistence](#state-persistence)
- [Profile View vs Browser Views](#profile-view-vs-browser-views)

---

## Opening the Profile View

**Method 1: Command palette**
1. Press `Ctrl/Cmd + P`
2. Type "Charted Roots: Open entity profile"
3. The profile opens in the right sidebar, synced to the currently active note

**Method 2: Context menu**
1. Right-click any entity note (person, place, event, source, or organization) in the file explorer or editor
2. In the **Charted Roots** submenu, click **Open profile**
3. The profile opens showing that entity

**Method 3: From dockable sidebar**
Once opened, the Profile View stays docked in your sidebar and automatically follows whichever entity note you navigate to.

---

## How Auto-sync Works

When the Profile View is **unpinned** (the default), it automatically updates to show the profile for whichever entity note is currently active in the editor. As you click between notes:

- **Entity notes** (person, place, event, source, organization): The profile updates to show that entity's data
- **Non-entity notes** (plain markdown, canvas, etc.): The profile stays on the last entity it was showing, with a subtle "Not following" indicator

This means you can dock the Profile View once and it follows your work — similar to how Obsidian's Outline and Backlinks panels follow the active note.

---

## Identity Header

The top of the profile is a sticky header that stays visible as you scroll through sections:

- **Entity type badge**: Color-coded label (Person, Place, Event, Source, Organization)
- **Entity name**: The primary name from the note
- **Key metadata**: Varies by entity type:
  - Person: birth/death dates, birth place, occupation
  - Place: category, coordinates
  - Event: type, date, place
  - Source: type, date, repository
  - Organization: type, founded/dissolved dates, seat
- **Avatar**: For person entities with linked media, shows the first image as a thumbnail
- **Pin toggle**: Pin/unpin the profile to freeze it on this entity
- **Open note**: Button to jump to the underlying markdown file

---

## Pin and Unpin

Click the pin icon in the header to toggle between:

- **Unpinned** (default): The profile follows the active note
- **Pinned**: The profile stays on the current entity, even as you navigate to other notes

Pinning is useful when you want to keep a reference entity visible while working on another note.

---

## Collapsible Sections

Below the header, the profile shows entity-specific data in collapsible sections. Each section has:

- **Section header**: Click to expand or collapse
- **Summary text**: When collapsed, shows a brief summary (e.g., "12 events", "4 sources", "Level 3 · 45% sourced")
- **Section content**: The full data, shown when expanded

Section expand/collapse states are remembered across sessions and between entities.

---

## Sections by Entity Type

### Person Profiles

| Section | What it shows |
|---------|---------------|
| **Relationships** | Family members (parents, spouses, children, siblings) and other relationships (godparents, witnesses, mentors, etc.) |
| **Events** | Timeline of events associated with this person |
| **Sources** | Sources cited in the person note |
| **Media** | Thumbnail grid of linked photos and documents |
| **Data Quality** | Research level (0-6), source coverage percentage, research questions, proof summaries |

The Relationships section is split into two subsections:
- **Family** (expanded by default): Biological parents, step/adoptive/foster parents, spouses with marriage dates, children, siblings
- **Other** (collapsed by default, hidden if empty): Religious, professional, social, legal, and other relationship types

### Place Profiles

| Section | What it shows |
|---------|---------------|
| **Events at location** | Events that occurred at this place |
| **Sources** | Sources referencing this place |
| **Media** | Linked photos and documents |
| **Map** | Coordinates display and button to open the full Geo Map view |

The Map section shows latitude and longitude values. Click "Open in Geo Map" to view the place on the interactive map.

### Event Profiles

| Section | What it shows |
|---------|---------------|
| **Participants** | People involved in the event (principal person highlighted) |
| **Sources** | Sources documenting the event |
| **Media** | Linked photos and documents |

### Source Profiles

| Section | What it shows |
|---------|---------------|
| **Referenced facts** | Which entities cite this source and for which facts. Grouped by entity — for example, "John Smith: birth_date, death_date" |
| **Media** | Linked documents and images |

The Referenced Facts section answers the question: "What claims does this source support?" It scans your vault for entities that reference this source via `sourced_*` properties.

### Organization Profiles

| Section | What it shows |
|---------|---------------|
| **Members** | People linked to this organization, with roles, dates, and current/former status |
| **Events** | Events associated with the organization |
| **Sources** | Sources referencing the organization |
| **Media** | Linked photos and documents |

---

## Navigating Between Entities

When you click an entity name within a section (such as a person's name in the Participants section, or a source title in Sources), the profile navigates **in-place** to that entity. A breadcrumb bar appears below the header showing your navigation path:

```
John Smith > Birth Event > Springfield
```

Click any breadcrumb to jump back to that entity. The breadcrumb history is remembered for each profile instance.

---

## Multiple Profile Views

Unlike other dockable views (which enforce a single instance), you can open multiple Profile Views:

1. Open a profile and **pin** it to freeze it on an entity
2. Open the command again — a new unpinned profile opens alongside
3. The pinned profile stays on its entity while the new one follows the active note

This enables side-by-side comparison of two entities.

---

## State Persistence

The Profile View remembers the following across Obsidian sessions:

- Whether the profile is pinned, and which entity it's pinned to
- Which sections are expanded or collapsed
- Breadcrumb navigation history

---

## Profile View vs Browser Views

The Profile View and Browser Views (People, Events, Sources, etc.) serve different purposes:

| Aspect | Browser Views | Profile View |
|--------|---------------|--------------|
| **Shows** | A filterable list of all entities of one type | All data for a single entity |
| **Use case** | Browsing, searching, filtering across many entities | Deep work on one entity — seeing its relationships, events, sources, and media together |
| **Sync** | Manual refresh when vault changes | Auto-syncs to the active note |
| **Instances** | One per type | Multiple (via pinning) |

Both are complementary — use Browser Views to find entities, and the Profile View to work with them in depth.

---

## See Also

- [Control Center](Control-Center) — Hub for accessing all Charted Roots features
- [Evidence & Sources](Evidence-And-Sources) — How sources are tracked across entities
- [Data Quality](Data-Quality) — Research levels and source coverage
- [Relationship Tools](Relationship-Tools) — Managing family and custom relationships
- [Media Management](Media-Management) — Linking photos and documents to entities
