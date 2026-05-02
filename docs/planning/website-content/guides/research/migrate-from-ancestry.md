---
title: "I want to migrate from Ancestry"
description: Download your Ancestry tree as GEDCOM and import into Charted Roots. Photos and stories don't come with the GEDCOM — plan for that.
track: research
difficulty: easy
time_estimate: ~20 min for export + import
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to migrate from Ancestry

Use this when you've been building your tree on Ancestry.com and want to move it (or a copy of it) into Charted Roots. By the end you'll have your tree's structured data — people, relationships, dates, places, sources — imported into your vault. Photos, stories, and Ancestry's hints/research tools won't come over (a known Ancestry limitation), but the structured genealogy comes through cleanly.

You don't have to abandon Ancestry to do this. Exporting a GEDCOM doesn't delete or modify your Ancestry tree; it's a one-way snapshot.

## What you'll need

- Your Ancestry account credentials.
- Your tree available in your account (any size).
- (Recommended) A Staging folder configured under **Settings → Charted Roots → Folders → System folders** so you can review before merging.

## Steps

### 1. Export your tree from Ancestry

In a browser:

- Sign in to Ancestry.com.
- Click the **Trees** tab → select your tree from the dropdown.
- Click the **Settings** gear icon for the tree.
- Click **Export tree**.
- Choose GEDCOM format (Ancestry's export is GEDCOM 5.5).
- Click **Download**. For large trees, the download may take a few minutes to generate; Ancestry will email you when it's ready.
- Save the `.ged` file somewhere you can find again.

### 2. Import into Charted Roots

Control Center → Tools → **Import/Export** → **Import**. Pick **GEDCOM 5.5.1** as the format (5.5 files import fine via this path). Drag-and-drop the file.

Configure import options — entity types, target folder (your Staging folder if you set one up), conflict handling. Run the import.

The Data Quality Preview surfaces Ancestry-specific quirks: place-name variants are common because Ancestry doesn't enforce a canonical form. Standardize them in the preview before importing — see [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) for the full preview workflow.

### 3. Verify and assess what's missing

Open a few person notes. You should see:

- ✅ Names, dates, places, relationships
- ✅ Source citations from Ancestry (your saved sources come through)
- ✅ Notes you wrote in Ancestry's note fields
- ❌ Photos — not in the GEDCOM; re-attach manually if needed
- ❌ Stories — not in the GEDCOM; re-attach manually
- ❌ Ancestry hints and research tools — Ancestry-only feature, doesn't transfer

For photos and stories, you can download them individually from Ancestry and attach via the [media management workflow](https://github.com/banisterious/obsidian-charted-roots/wiki/Media-Management).

## Variations

- **Living person privacy.** Ancestry's export honors your privacy settings — living people may be redacted as "Living" or excluded depending on your tree's settings. Configure Charted Roots' own privacy-on-export settings under **Settings → GEDCOM** if you plan to re-share.
- **Subset export.** Ancestry exports your full tree — no built-in subset option. To narrow scope, do a full import and then use Charted Roots' selective branch export to share narrower slices later.
- **Re-import after Ancestry edits.** Each export is a snapshot. Re-importing overwrites or merges based on your conflict-handling setting. **Merge** is the safe default for re-imports — preserves your Charted Roots-side edits while picking up new Ancestry data.
- **Using both tools side by side.** Export from Ancestry → import to Charted Roots → continue research in either or both. There's no sync; treat them as independent trees that share a starting point.

## Related guides

- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) — shared import workflow
- [I want to find and merge duplicate persons](find-and-merge-duplicates)
- [I want to migrate from Family Tree Maker](migrate-from-family-tree-maker) — alternative if you also have an FTM tree synced from Ancestry

## Reference

- Wiki: [Import & Export](https://github.com/banisterious/obsidian-charted-roots/wiki/Import-Export)
- Wiki: [Community Use Cases — Getting Started from Ancestry or FamilySearch](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases#getting-started-from-ancestry-or-familysearch)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+migrate-from-ancestry%3A+

---

## Notes for review

- Step 3 explicitly lists what does and doesn't come over. Ancestry's photos-and-stories gap is the single biggest user surprise; better to spell it out upfront than answer in support.
- "You don't have to abandon Ancestry" framing in the introduction is from the Community-Use-Cases entry — shipped users specifically appreciated knowing the migration is non-destructive.
- Length: ~570 words.
