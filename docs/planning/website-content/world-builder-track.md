# Worldbuilding Track Page — draft

**Target page:** `/worldbuilding/_index.md` (new) on chartedroots.com
**Status:** 🔶 In progress — draft complete, awaiting review.
**Source material:** feature descriptions in [features-refresh.md](features-refresh.md), wiki pages (Universe-Notes, Fictional-Date-Systems, Custom-Maps, Book-Builder, Custom-Relationships).

---

## Purpose

Dedicated page for worldbuilders: novelists, game masters, fictional-universe historians. The main landing page serves both audiences; this page goes deep on the worldbuilding-specific features and how they chain together into a workflow. Parallels `/research/` as a topic-based deep dive on one capability area.

---

## Structure

Five H2 sections plus opening paragraph:

1. Universes
2. Custom calendars and fictional date systems
3. Custom image maps
4. Book and narrative compilation
5. Related features that work for fiction too

Example worked workflow deferred until a capture session can provide screenshots.

---

## Draft content

Everything below this line is intended as the website page body. Hugo frontmatter (`title`, `description`, `date`, etc.) is added during the port.

---

Worldbuilders get the same entity graph genealogists do (people, places, events, sources, organizations) plus a set of tools built specifically for fictional settings. A universe entity scopes your world's data. Custom calendars handle in-world dating systems from BBY/ABY to Tolkien's Third Age. Image maps work in invented coordinate systems where real-world longitude and latitude don't apply. Book Builder compiles the result into a PDF or ODT narrative. All of it lives in plain-text markdown in an Obsidian vault.

## Universes

A universe in Charted Roots is a first-class entity type, the same way a person or a place is. It has its own note, its own frontmatter, and its own profile view. Entities scoped to a universe via a `universe: [[The Dying Earth]]` property inherit that context: fictional dates render with the universe's calendar, custom maps cluster by universe, reports can be filtered to a single world.

The universe note holds world-level metadata like author, genre, status, default calendar, default map, and validation schemas. The universe wizard walks you through creation with calendar and map steps if you want to set them up at once, or you can start from a blank universe and add systems later.

Dynamic content blocks on a universe note auto-populate tables of everything scoped to that universe: people, places, events, organizations, and custom maps. The blocks refresh as you add new entities. Open a universe note and you get a living index of the world.

[Read more: Universe Notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Universe-Notes)

## Custom calendars and fictional date systems

Fictional settings come with their own calendars. Star Wars measures time relative to the Battle of Yavin (BBY before, ABY after). Tolkien's legendarium uses Ages (First Age, Second Age, Third Age) with each age's year count starting fresh. Warhammer 40k uses the Imperial Dating System. Charted Roots supports any of these as fictional date systems with configurable eras.

Built-in calendars ship for common fictional settings. The Galactic Standard Calendar covers Star Wars out of the box with BBY and ABY eras. You can also define your own in settings: a name, one or more eras (each with an abbreviation, direction, and zero point), and the plugin handles parsing and rendering.

Fictional dates use the era abbreviation as a prefix or suffix: `ABY 1042` and `1042 ABY` both parse. When a date is written on an entity in a universe that has a linked calendar, the plugin resolves era math correctly, including descending eras like BBY that count down, and produces correct ages and durations on timelines, map popups, and reports.

The Calendarium plugin is supported when installed, so any calendars you've already defined in Calendarium are usable in Charted Roots directly.

[Read more: Fictional Date Systems →](https://github.com/banisterious/obsidian-charted-roots/wiki/Fictional-Date-Systems)

## Custom image maps

When your world doesn't have real-world geography, you need a map that doesn't assume real-world coordinates. Image maps in Charted Roots let you upload an image (a drawn map, a generated terrain, a fantasy atlas page) and place markers using pixel coordinates relative to that image.

The 4-step map creation wizard walks you through setup: the image file, the coordinate system (pixel or geographic), the display name, and any universe scoping. Place notes attached to that map become markers; their coordinates are draggable and persist automatically.

Multi-scale worldbuilding uses linked maps. A continent map can have `linked_map` properties on its place markers that point to city-level maps, and each child map declares `parent_map` pointing back up. Breadcrumb navigation in the map view lets you drill from continent to region to city without losing context. Child map markers on the parent map show where each child map covers; a region-editing overlay lets you reposition or resize those regions by dragging on the parent.

[Read more: Custom Maps →](https://github.com/banisterious/obsidian-charted-roots/wiki/Custom-Maps)

## Book and narrative compilation

Worldbuilding tends to produce lots of disconnected notes: character bios, place gazetteers, event timelines, faction write-ups. The Book Builder compiles those into a single sequenced PDF or ODT document that feels like a published world bible rather than a set of loose notes.

Chapter types cover different kinds of content. Generated reports (individual summaries, family group sheets, pedigree charts) produce formatted entries from entity notes. Visual trees embed as chart images. Vault notes render your own markdown directly. Section dividers add title pages and structural breaks.

Preset templates derive chapter structure from the family graph. Family history book assembles a genealogy-first document with cover, pedigree chart, individual summaries, and bibliography. Research compilation focuses on evidence with a gaps report and source summaries. Blank gives you an empty canvas. Worldbuilders typically pick Blank and assemble chapters by universe, faction, or era.

Book definitions save as `.book.json` files you can open, edit, and regenerate as the underlying data changes. A consolidated bibliography deduplicates footnotes across chapters. An auto-generated name index sorts entities by last name with alphabetical grouping.

[Read more: Book Builder →](https://github.com/banisterious/obsidian-charted-roots/wiki/Book-Builder)

## Related features that work for fiction too

Most of Charted Roots works the same whether your data is factual or fictional. A few tools worth naming explicitly for worldbuilders.

**Custom relationships and the overlay.** Fictional settings have connections real-world genealogy doesn't: sire and childer in vampire lore, liege and vassal in feudal political systems, mentor and apprentice in magic schools, sworn rival or nemesis in adventure fiction. Custom relationship types let you model these explicitly. The Custom Relationships Overlay renders them as colored lines on top of the biological family tree in the Family Chart View, with per-type toggles so you can isolate political alliances, tutelage chains, or rivalries independently.

**Sources, citations, and web clippers.** Fictional universes have their own canons and in-world sources. Published canons (Wookieepedia, A Wiki of Ice and Fire) and invented references (the Annals of Gondor, Count Dooku's memoirs) both fit into the same source-note structure as real-world records. The evidence-tracking toolkit applies identically. Web clippers also come in handy for capturing real-world inspiration like period photography, historical maps, or cultural context alongside your in-universe sources. The [research track](/research/) covers all of this in depth.

**GEDCOM interoperability.** GEDCOM works for fictional trees. Export your fictional family history to any genealogy tool, or hand it to a cowriter in a standard format. The schema doesn't care whether the names are historical or invented.

**Entity Profile View.** The dockable profile panel is useful for deep fictional biographies where a character accumulates a lot of metadata (family, allegiances, appearances, sources). Pin a character's profile to a sidebar while you work on scenes in the main pane.

[Read more: Custom Relationships →](https://github.com/banisterious/obsidian-charted-roots/wiki/Custom-Relationships)

---

## Open questions

1. **Worked example deferred.** A short "build a Star Wars family history in 15 minutes" or "set up Dying Earth as a universe in 10 minutes" walkthrough would be the most compelling content on the page but is the heaviest to author (sample vault, screenshots, annotation). Revisit when capture session for motion loops happens.
2. **Tone on fictional-calendar rough edges.** The universe↔calendar linking contract has some gaps currently tracked in #432. Current prose describes what works (built-in Galactic Standard Calendar parses BBY/ABY correctly for most users) without over-claiming on the edge cases. When #432 resolves, the section could pick up a "set up your world's calendar in one click" line.
3. **Overlap with research-track.** The "Related features" section and research-track both name the sources subsystem and web clippers. Current approach points worldbuilders to the research track for depth rather than duplicating the content. Feels right but flagging.
4. **Landing-tile link destination.** The landing page has a "World Building" pillar tile. This page is what that tile's "Learn more" link should go to. Confirm during landing refresh.
