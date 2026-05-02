---
title: "I want to migrate from RootsMagic"
description: Export your RootsMagic tree as GEDCOM 5.5.1 and import into Charted Roots. RootsMagic exports cleanly; this is the most predictable migration path.
track: research
difficulty: easy
time_estimate: ~20 min for export + import
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to migrate from RootsMagic

Use this when you've been maintaining a tree in RootsMagic and want to move it to Charted Roots. RootsMagic produces some of the cleanest GEDCOM exports of any major genealogy tool — citations, source templates, and media references all carry through reliably. By the end you'll have a `.ged` file from RootsMagic and an imported tree in your vault.

## What you'll need

- A working RootsMagic installation with your tree open. RootsMagic 7, 8, and 9 all support GEDCOM 5.5.1 export.
- (Recommended) A Staging folder configured under **Settings → Charted Roots → Folders → System folders**.
- Knowledge of your RootsMagic media folder location if you want to bring media across.

## Steps

### 1. Export from RootsMagic

In RootsMagic:

- **File → Export** (RootsMagic 8/9) or **File → Export GEDCOM** (RootsMagic 7).
- Choose **GEDCOM 5.5.1** as the version.
- Select what to include: People, Families, Sources, Citations, Media references, Notes. The full set is recommended.
- Choose privacy options if you want living-person filtering at export time.
- Save the `.ged` file. RootsMagic typically exports to UTF-8 by default — confirm this in the export options if your tree has non-ASCII names.
- (If migrating media): RootsMagic's media references are typically relative paths to a media folder next to your `.rmtree` file. Copy that folder into your Obsidian vault at a path you'll reference in step 3.

### 2. Open the Charted Roots Import Wizard

Control Center → Tools → **Import/Export** → **Import**. Pick **GEDCOM 5.5.1**. Drag-and-drop the `.ged` file.

### 3. Configure import options

- **Entity types** — leave defaults on.
- **Target folder** — your Staging folder if you set one up.
- **Media references** — enable.
- **Path prefix to strip** — set to your RootsMagic media folder's path (e.g., `C:\Users\You\Documents\RootsMagic\Media\`). The wizard's live preview shows how each path resolves; tune until paths render as clean `[[filename]]` wikilinks.

### 4. Run the import

RootsMagic's GEDCOM is structured cleanly enough that the Data Quality Preview usually surfaces few issues. The preview's place-name variants pane is still worth a pass — Charted Roots normalizes US state abbreviations automatically, but other regional formatting (county names, country variants) benefits from explicit canonical-form choices. See [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) for the full preview workflow.

### 5. Verify citations

RootsMagic's citation handling is one of its strengths. After import, open a person note that had several citations in RootsMagic — you should see the citations as a `citations:` array of wikilinks pointing at separate citation notes (auto-created from the GEDCOM `SOUR` blocks with `PAGE` / `QUAY` metadata). The Entity Profile View for the person shows them grouped by source.

If you used RootsMagic's source templates, the source notes carry the `title`, `author`, `publication`, and `repository` fields. Charted Roots also generates `cr_id` for each.

## Variations

- **Bidirectional sharing.** Export from Charted Roots back to GEDCOM 5.5.1 (Control Center → Import/Export → Export) and re-import into RootsMagic. Round-trip works for the core fields; some Charted Roots-specific properties (custom relationships, sourced facts) flatten or drop.
- **Multiple RootsMagic databases.** RootsMagic supports multiple separate database files. Each is a separate migration — export each as GEDCOM and import to the same Charted Roots vault, optionally to different staging subfolders for review.
- **No media migration.** Disable **Media references** in step 3 to skip media. Tree comes over without photos; you can attach media manually later.

## Related guides

- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) — shared import workflow
- [I want to find and merge duplicate persons](find-and-merge-duplicates)
- [I want to set up per-fact source citations](set-up-source-tracking) — to extend RootsMagic's source handling per-fact

## Reference

- Wiki: [Import & Export](https://github.com/banisterious/obsidian-charted-roots/wiki/Import-Export)
- Wiki: [Evidence & Sources — Citation Notes](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources#citation-notes)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+migrate-from-rootsmagic%3A+

---

## Notes for review

- Headlined RootsMagic's clean GEDCOM in the framing — accurate, and the citation-handling angle in step 5 is the differentiator vs. other migration sources.
- Step 5's citation framing assumes the user actually used RootsMagic's source-templates feature. If they didn't, step 5 still applies but with thinner citation data.
- Length: ~610 words.
