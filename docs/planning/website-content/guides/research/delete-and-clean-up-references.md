---
title: "I want to delete a person and clean up references"
description: Delete a person note safely, then sweep the vault for orphaned references in relationship fields, events, and sources.
track: research
difficulty: easy
time_estimate: ~5 min
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to delete a person and clean up references

Use this when you've discovered a duplicate entry, received incorrect family information from a relative, or otherwise need to remove a person from your tree. Charted Roots doesn't have a one-click "Delete with cleanup" action, but the two-step workflow — delete the note, then sweep for orphaned references — is straightforward and safe. By the end the person is gone, all relationship fields pointing at them are cleaned up, and no broken wikilinks remain.

## What you'll need

- The person note(s) you want to remove.
- A few minutes after the deletion to run the orphan-references cleanup. Best done after all your deletions for the session, not after each one.

## Steps

### 1. (Recommended) Check backlinks before deleting

In Obsidian, open the person's note and use the **Backlinks** panel (right sidebar) to see what currently references them. This is a sanity check — large numbers of backlinks mean lots of cleanup work; very few means a clean delete.

If the backlinks include important content you don't want to lose (e.g., research notes that mention them in passing, source notes that name them), consider whether you really want to delete or whether merging into another record would preserve more.

### 2. Delete the person note

In the file explorer, right-click the person note → **Delete** (or select it and press the `Delete` key). Obsidian moves the file to its trash. Repeat for any other notes you're deleting in this session.

### 3. Open the Cleanup Wizard

Control Center → **Data Quality** tab → **Cleanup Wizard**. Or via command palette → `Charted Roots: Post-import cleanup wizard`.

### 4. Run the orphan-references step

Step through (or jump directly to) **Clear Orphan References**. Click **Scan**. The wizard finds all `father_id` and `mother_id` values that point to non-existent people and lists them.

### 5. Review and fix

Read the list of orphan references. For each entry, the wizard shows the person whose frontmatter contains the dangling reference and which property is affected. Click **Fix All** to remove the orphan references, or fix them individually if you want to verify each.

### 6. Verify

Re-open the file explorer and any tree canvases that included the deleted person. Trees should regenerate cleanly without the deleted node. The Backlinks panel on related people should no longer reference the deleted note's basename.

## Variations

- **Batch deletions.** Delete all the notes you want to remove first, then run the cleanup once. Faster than deleting + cleaning up after each one, since the orphan scan runs against the whole vault each time.
- **Restoring a deleted note.** Obsidian's trash holds deleted files until you empty it. If you delete by mistake, restore from the trash before running cleanup. If you've already run cleanup, the orphan references are gone too — restoring the note doesn't restore the relationship references that pointed at it.
- **Periodic sanity check.** The orphan-references step is also useful as a periodic sweep during active research, even when you haven't deliberately deleted anything. Note renames or accidental deletions can leave orphans you didn't notice.
- **Events and sources.** Deleting a person doesn't automatically delete their event notes or source notes. Review those separately — orphan event notes (events whose primary person was deleted) and source notes that named the deleted person are still in your vault. The Cleanup Wizard's other steps cover some related cleanup; for full event/source review, browse the relevant folder or filter the events/sources tabs in Control Center.

## Related guides

- [I want to find and merge duplicate persons](find-and-merge-duplicates) — often the right alternative to deletion
- [I want to add a new family member](add-new-family-member)
- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup)

## Reference

- Wiki: [Data Quality — Clear Orphan References](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Quality)
- Wiki: [Staging & Cleanup](https://github.com/banisterious/obsidian-charted-roots/wiki/Staging-And-Cleanup)
- Wiki: [Community Use Cases — Deleting a Person](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases#deleting-a-person-and-cleaning-up-references)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+delete-and-clean-up-references%3A+

---

## Notes for review

- The Data Quality wiki defines step 5's scope as `father_id` and `mother_id` specifically. The Community-Use-Cases entry described it more broadly (relationship fields, event participants, source references, wikilinks). I went with the wiki's narrower wording at step 4 since it's more accurate; mentioned event/source review separately in Variations as the proper way to handle those.
- Step 1 (check backlinks) is recommended rather than required — most users won't bother, but for high-stakes deletions (long-standing notes with extensive content) it's the difference between a clean delete and a regretted one.
- "Restoring a deleted note" Variation honestly notes that restoration doesn't undo the orphan-cleanup. Worth being upfront — readers will hit this surprise otherwise.
- No new capture needed for this guide. The Cleanup Wizard step is conventional enough that prose covers it; existing `cr-cleanup-wizard.png` is from a different step (data quality preview during GEDCOM import) so reuse would be off-topic.
- Length: ~640 words.
