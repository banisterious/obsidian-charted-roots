# Data Model

This page describes how Charted Roots organizes data — the entity types, how they relate to each other, and how different views consume them.

---

## Table of Contents

- [Entity Types](#entity-types)
- [Entity Relationships](#entity-relationships)
- [Dual Storage Pattern](#dual-storage-pattern)
- [Events: Array vs Notes](#events-array-vs-notes)
- [Data Flow by View](#data-flow-by-view)
- [Related Pages](#related-pages)

---

## Entity Types

Charted Roots recognizes five entity types, each identified by `cr_type` in frontmatter:

| Entity | `cr_type` | Purpose | Key Properties |
|--------|-----------|---------|----------------|
| **Person** | `person` | An individual in the tree | `name`, `born`, `died`, `birth_place`, `death_place`, `father`, `mother`, `spouse`, `children` |
| **Place** | `place` | A geographic or fictional location | `name`, `coordinates_lat`, `coordinates_long`, `parent_place`, `place_category` |
| **Event** | `event` | A life event (birth, marriage, residence, etc.) | `title`, `event_type`, `date`, `person`, `place`, `sources` |
| **Source** | `source` | A document or record providing evidence | `title`, `source_type`, `source_date`, `repository`, `source_parent` |
| **Organization** | `organization` | A group, institution, or noble house | `name`, `org_type`, `founded`, `dissolved` |

Every entity has a unique `cr_id` property for reliable cross-referencing.

---

## Entity Relationships

```
Person ──── birth_place / death_place ────► Place
   │                                          │
   ├─── father / mother / spouse / children ──► Person
   │                                          │
   ├─── events array (inline) ────────────────► Place (via event.place)
   │                                          
   ├─── person (linked from event note) ◄──── Event ──── place ────► Place
   │                                               │
   ├─── sources ──────────────────────────────► Source
   │                                               │
   └─── memberships ──────────────────────────► Organization
                                                   
Place ──── parent_place ──────────────────────► Place (hierarchy)

Source ──── source_parent ────────────────────► Source (hierarchy)
```

### Relationship storage

Relationships between entities use the **dual storage pattern** (see below). For example, a person's father is stored as both a wikilink and a cr_id:

```yaml
father: "[[John Smith]]"
father_id: abc-123-def-456
```

---

## Dual Storage Pattern

Most cross-entity references use two properties — a wikilink for Obsidian graph/backlink visibility, and a `cr_id` for reliable resolution:

| Wikilink Property | ID Property | Purpose |
|-------------------|-------------|---------|
| `father` | `father_id` | Father relationship |
| `mother` | `mother_id` | Mother relationship |
| `spouse` / `spouse1` | `spouse_id` / `spouse1_id` | Spouse relationship |
| `birth_place` | `birth_place_id` | Birth location |
| `death_place` | `death_place_id` | Death location |
| `parent_place` | `parent_place_id` | Place hierarchy |
| `source_parent` | `source_parent_id` | Source hierarchy |

When both are present, the `_id` property is used for resolution (more reliable across renames). The wikilink provides Obsidian graph visibility and backlinks.

---

## Events: Array vs Notes

Charted Roots supports two ways to record life events. They serve different purposes and are consumed by different views.

### Events array (inline on person notes)

A YAML array directly in the person note's frontmatter:

```yaml
events:
  - event_type: residence
    place: "[[Chicago]]"
    date_from: 1920
    date_to: 1935
  - event_type: immigration
    place: "[[New York]]"
    date_from: 1910
```

**Used by:** Map View (markers, journey paths), migration paths

**Strengths:** Compact, all data on the person note, feeds directly into map visualization

**Limitations:** No room for detailed descriptions, sources, or confidence levels per event

### Event notes (separate files)

Standalone notes with `cr_type: event` and their own frontmatter:

```yaml
---
cr_type: event
cr_id: evt-abc-123
title: "Marriage of John and Jane"
event_type: marriage
date: 1925-06-15
person: "[[John Smith]]"
place: "[[St. Mary's Church]]"
sources:
  - "[[Marriage Certificate]]"
confidence: high
description: "Ceremony witnessed by..."
---
```

**Used by:** Calendar View, timeline blocks (`charted-roots-timeline`), Entity Profile View, family events on timelines

**Strengths:** Rich metadata (descriptions, sources, confidence, participants), standalone documentation, searchable

**Limitations:** Not currently used by Map View for markers (a future enhancement)

### Which should I use?

| Scenario | Recommendation |
|----------|---------------|
| Quick location tracking for maps | Events array |
| Detailed event documentation with sources | Event notes |
| Both maps and timelines | Use both — the events array for map markers, event notes for rich timeline display |
| Imported GEDCOM/Gramps data | Import creates both automatically |

---

## Data Flow by View

Each view reads from specific data sources. This table shows which properties feed into which views:

| View | Person-level properties | Events array | Event notes | Place notes | Source notes |
|------|----------------------|--------------|-------------|-------------|-------------|
| **Family Chart** | name, dates, sex, relationships, alt_name | — | — | — | — |
| **Map View** | birth/death/marriage place | residence, occupation, immigration, etc. | — | coordinates, hierarchy | — |
| **Journey Mode** | birth/death place | all event types with places | — | coordinates | — |
| **Calendar View** | born, died | — | marriage, baptism, immigration, etc. | — | — |
| **Timeline blocks** | born, died | — | all event types | — | sourced via event |
| **Entity Profile** | all properties | — | linked events | linked places | linked sources |
| **Canvas Trees** | name, dates, relationships | — | — | — | — |
| **Statistics** | all properties | — | event counts | place counts | source counts |
| **Reports** | all properties | — | event details | place details | source details |

> **Note:** The Map View currently does not read from event notes — only from person-level place properties and the events array. This is a known gap that may be addressed in a future release.

---

## Related Pages

- [Frontmatter Reference](Frontmatter-Reference) — Complete property documentation for all entity types
- [Data Entry](Data-Entry) — Creating and structuring person notes
- [Events & Timelines](Events-And-Timelines) — Event notes and timeline visualization
- [Geographic Features](Geographic-Features) — Map view and journey mode
- [Evidence & Sources](Evidence-And-Sources) — Source notes and citations
- [Calendar View](Calendar-View) — Calendar visualization of dates
