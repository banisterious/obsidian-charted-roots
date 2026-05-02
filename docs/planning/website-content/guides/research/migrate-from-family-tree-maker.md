---
title: "I want to migrate from Family Tree Maker"
description: Export your tree from Family Tree Maker as GEDCOM, then import into Charted Roots with media-path stripping for FTM's typical absolute Windows paths.
track: research
difficulty: medium
time_estimate: ~30 min for the export + import; longer for cleanup
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to migrate from Family Tree Maker

Use this when you've been maintaining a tree in Family Tree Maker (FTM) and want to move it to Charted Roots — either to switch tools entirely, or to use both side by side. By the end you'll have a `.ged` file exported from FTM and an imported tree in your vault, with the FTM-specific gotchas (media paths, custom tags) handled.

## What you'll need

- A working installation of Family Tree Maker with your tree open. Versions 2014, 2017, 2019, and 2024 all support GEDCOM export.
- (Recommended) A Staging folder configured under **Settings → Charted Roots → Folders → System folders** so you can review before merging.
- Familiarity with where FTM stores your media files (typically a `Media` subfolder next to your `.ftm` file). You'll need this for the path-stripping step.

## Steps

### 1. Export from Family Tree Maker

Open your tree in FTM. Then:

- **File → Export** (in older versions: **File → Save As → GEDCOM**)
- Choose **GEDCOM 5.5.1** as the format. (5.5 also works but loses some metadata.)
- Choose what to include — privacy filters for living persons, source citations, media references. Default settings are usually fine for a first import.
- Choose a destination folder you can find again. Save the `.ged` file.
- (If you want media): copy the FTM `Media` subfolder into your Obsidian vault at the path you'll use for the **Path prefix to strip** setting in step 3 (e.g., `media/`). Don't move the originals — copy.

### 2. Open the Charted Roots Import Wizard

Control Center → Tools → **Import/Export** → **Import**. Pick **GEDCOM 5.5.1** as the format. Drag-and-drop the `.ged` file from step 1.

### 3. Configure import options

In step 3 of the wizard, the FTM-specific settings:

- **Entity types** — leave defaults on (People, Events, Sources, Places).
- **Target folder** — your Staging folder if you set one up.
- **Media references** — enable.
- **Path prefix to strip** — set to your FTM media folder's absolute path (e.g., `C:\Users\You\Documents\Family Tree Maker\Media\`). The wizard preview shows how each path resolves; tune the prefix until paths render as clean wikilinks like `[[photo.jpg]]`.

### 4. Run the import and triage

The Data Quality Preview surfaces any FTM-specific data issues (custom event types FTM uses that don't map cleanly to GEDCOM, place-name variants from county-formatting differences). See [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) for the full import + cleanup workflow.

### 5. Verify

Check that your media renders. Open a few person notes that had FTM photos attached — the `media:` array should contain working `[[filename]]` wikilinks. If the media folder validation reports missing files, the path-strip prefix in step 3 was off; re-run with a corrected prefix.

## Variations

- **No media migration.** Disable **Media references** in step 3 to skip media entirely. Your tree comes over without photos and you can attach media manually later.
- **CSV export instead of GEDCOM.** FTM's CSV export captures less than GEDCOM (relationships are flattened, no events). Use GEDCOM unless you have a specific reason.
- **Custom FTM event types.** FTM supports user-defined event types that may not have a direct GEDCOM equivalent. The import surfaces these as `custom` events with their original label preserved. Re-categorize them after import via the Edit Event modal.
- **FTM 2024 syncing.** Charted Roots doesn't sync with Ancestry (which FTM 2024 still does). One-way migration only.

## Related guides

- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) — shared import workflow
- [I want to find and merge duplicate persons](find-and-merge-duplicates) — for re-import or vault-wide cleanup
- [I want to migrate from Ancestry](migrate-from-ancestry) — alternative if your FTM tree is synced from Ancestry

## Reference

- Wiki: [Import & Export](https://github.com/banisterious/obsidian-charted-roots/wiki/Import-Export)
- Wiki: [Staging & Cleanup](https://github.com/banisterious/obsidian-charted-roots/wiki/Staging-And-Cleanup)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+migrate-from-family-tree-maker%3A+

---

## Notes for review

- Step 1's export-path instructions cover FTM 2014/2017/2019/2024 with the broad "File → Export" wording. FTM 2024 specifically uses **File → Export**; older versions used **File → Save As → GEDCOM**. If you'd rather pin to one version, drop the older-versions parenthetical.
- The path-strip prefix is the single biggest FTM-import gotcha. Step 3's framing leans on the wizard's live preview to mitigate user error.
- Length: ~620 words.
