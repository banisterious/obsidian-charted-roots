---
title: "I want to migrate from Gramps (with media)"
description: Export your Gramps tree as a .gpkg package and import into Charted Roots. Gramps XML import preserves more than GEDCOM and extracts media automatically.
track: research
difficulty: easy
time_estimate: ~20 min for export + import
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to migrate from Gramps (with media)

Use this when you've been maintaining a tree in [Gramps](https://gramps-project.org/) and want to move it to Charted Roots. Gramps users have an advantage other migrations don't: Charted Roots has **dedicated Gramps XML import** that preserves more than GEDCOM, and the **`.gpkg` package format** bundles your media files so they extract automatically into your vault.

By the end you'll have a `.gpkg` file from Gramps, an imported tree in your vault with media in place, and Gramps-specific entities (notes, source citations, custom event types) carried through more faithfully than GEDCOM allows.

## What you'll need

- A working Gramps installation with your family tree open. Versions 5.x and 6.x both produce compatible exports.
- (Recommended) A Staging folder configured under **Settings → Charted Roots → Folders → System folders**.

## Steps

### 1. Export as a Gramps Package (.gpkg)

In Gramps:

- **Family Trees → Export** (or in some versions: **Tools → Family Tree Tools → Export**).
- The export wizard appears. Pick a destination folder.
- For the format, choose **`Gramps package (.gpkg)`** — this bundles your XML data with media files in a single archive.
- Apply privacy filters if you want to exclude living persons.
- Click **Forward** through the remaining steps and **Apply**.

If you don't need media, choose **`Gramps XML (.gramps)`** instead — it's smaller and faster, just no media bundled.

> **Why not GEDCOM?** Gramps can export GEDCOM too, but Gramps XML preserves more: custom event types, structured notes, multiple researcher levels, and Gramps-specific source classifications all carry through XML but are flattened or lost in GEDCOM. Use the native format unless you have a specific reason not to.

### 2. Open the Charted Roots Import Wizard

Control Center → Tools → **Import/Export** → **Import**. Pick **Gramps XML** as the format (the wizard handles `.gpkg`, `.gramps`, and `.xml` from this option). Drag-and-drop the file.

### 3. Configure import options

- **Entity types** — leave defaults on (People, Events, Sources, Places).
- **Target folder** — your Staging folder if you set one up.
- **Notes** — enabled by default. Gramps notes attached to people / events / places get appended as `## Notes` sections in the corresponding entity note.
- **Create separate note files** — opt-in. When enabled, Gramps notes become standalone `cr_type: note` files with wikilinks from the entity. Recommended if you plan to round-trip back to Gramps later, since note identity is preserved.

Media files in the `.gpkg` are extracted automatically into your configured media folder.

### 4. Run the import

The wizard shows progress as it parses the XML, creates entity notes, and extracts media. Larger trees (10K+ people) take a few minutes.

The Data Quality Preview surfaces issues — but Gramps XML produces fewer than GEDCOM since the data model maps closely. Place-name variants are still worth normalizing if you have inconsistent regional formatting.

See [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) for the universal import + post-import cleanup workflow.

### 5. Verify

Open a few entity notes to confirm:

- ✅ Person notes — relationships, dates, places, attached media
- ✅ Event notes — Gramps events map to Charted Roots event types (births, deaths, marriages, plus the broader life-event types)
- ✅ Place notes — full hierarchy (city → county → state → country) preserved when "Create place notes" was enabled
- ✅ Media — files extracted into your media folder, linked via `media:` arrays on entities
- ✅ Notes — appended as `## Notes` sections (or as separate note files if you opted in)

The first media item on each entity serves as the thumbnail (matching Gramps' convention).

## Variations

- **Without media (smaller export).** Choose **`Gramps XML (.gramps)`** instead of `.gpkg`. Faster export, smaller file. Re-attach media manually if needed.
- **GEDCOM from Gramps.** Possible but discouraged — see step 1's "Why not GEDCOM?" note. Use only if a downstream tool requires it.
- **External media folder.** If your Gramps media is large (gigabytes), consider creating an Obsidian symlink that points at the Gramps media folder rather than duplicating files. Skip the `.gpkg` and use `.gramps` (XML-only); manually create the symlink afterward.
- **Round-trip support.** Gramps XML round-trip works for the core data model. `gramps_id` and `gramps_handle` are preserved on imported entities, so re-exporting later (Control Center → Export → Gramps XML) preserves identity.
- **Repositories.** Gramps repository records create properties on source notes but not separate repository notes. The repository name and address land on the source's frontmatter.

## Related guides

- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) — shared import workflow
- [I want to find and merge duplicate persons](find-and-merge-duplicates)
- [I want to set up per-fact source citations](set-up-source-tracking)

## Reference

- Wiki: [Import & Export — Gramps XML Import](https://github.com/banisterious/obsidian-charted-roots/wiki/Import-Export#gramps-xml-import)
- Wiki: [Media Management](https://github.com/banisterious/obsidian-charted-roots/wiki/Media-Management)
- [Gramps Project](https://gramps-project.org/)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+migrate-from-gramps%3A+

---

## Notes for review

- The Gramps guide is the only one in this batch that recommends a non-GEDCOM path. Calling out the rationale ("Why not GEDCOM?") at step 1 is important — Gramps users will reflexively reach for GEDCOM if they don't know about the dedicated XML support.
- The "External media folder" Variation is from the Community-Use-Cases entry; it's a real Gramps-specific tip that other tools' migration guides don't need.
- Length: ~720 words (heaviest of the four migration guides; all the variation in Gramps's export options + the format-recommendation rationale).
