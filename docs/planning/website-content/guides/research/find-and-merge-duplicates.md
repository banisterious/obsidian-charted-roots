# Outline — find-and-merge-duplicates

**Status:** 📋 Outline. Not yet drafted.
**Slug:** `find-and-merge-duplicates`
**Title:** I want to find and merge duplicate persons
**Track:** research
**Difficulty:** medium
**Time estimate:** ~15-30 min (depends on how many duplicates surface)
**Relevant releases:** 0.22.17
**Length estimate (drafted):** ~750 words

---

## Framing

A reader with a vault large enough to have accidental duplicates. Common after GEDCOM imports, Web Clipper batches, multiple data-entry sessions, or merging vaults with a relative. Success endpoint: every confirmed duplicate either dismissed (kept as separate people because they're not actually the same person) or merged via the Merge Wizard with relationship references reconciled to point at the kept record.

This guide is also the back-half of the `import-gedcom-and-cleanup` workflow. Anyone landing there will likely follow through here.

## What you'll need

- A vault with at least two person notes that might be duplicates
- (Optional) Adjusted detection sensitivity under **Settings → Charted Roots → Data**:
  - **Name similarity threshold** (default `0.8`) — higher = stricter, fewer false positives.
  - **Date tolerance** (default `2` years) — set to `0` for exact-date matching only.

## Steps

1. **Run duplicate detection.** Command palette → `Charted Roots: Find duplicate people`. The detection modal opens with all potential pairs grouped by confidence. Detection uses fuzzy name matching (Levenshtein distance — handles typos and reversed "Smith, John" / "John Smith" forms), date proximity, and confidence scoring.
2. **Triage by confidence.** Each pair shows:
   - Confidence level: **High** (strong name + close dates), **Medium** (good name match, dates may differ), or **Low** (worth reviewing).
   - Side-by-side name comparison.
   - Birth and death dates for both records.
3. **For each pair, decide:**
   - **Confirm as Duplicate** — opens the Merge Wizard.
   - **Dismiss False Positive** — marks the pair as "not duplicates," remembered across sessions so it won't appear in future scans.
4. **Use the Merge Wizard.** Side-by-side comparison of every field. For each row:
   - Identical values show a checkmark — no decision needed.
   - Differing values show a dropdown: **Main**, **Staging**, or (for arrays like spouses/children) **Both** to combine.
5. **Preview, then merge.** Click **Preview** to see the merged record before committing. Click **Merge** to execute.
6. **Confirm the reconciliation.** Charted Roots automatically updates relationship references — if the deleted person was listed as someone's father, that reference updates to point at the kept record. Same for spouse and child relationships.
7. **Regenerate trees.** Any canvas trees that included either person should be regenerated to reflect the new structure.

## Variations

- **Cross-import detection (staging workflow).** If your duplicates came from a recent GEDCOM/Gramps/CSV import to a Staging folder, use the Staging Manager's per-batch **Check duplicates** instead. Confidence scoring uses the same factors. See `set-up-staging-workflow` (P2).
- **Tighter detection.** Raise the name-similarity threshold (e.g., 0.9) to catch only near-exact matches. Lower the date tolerance (e.g., 0) to require exact birth/death dates.
- **Looser detection.** Lower the threshold (0.7 or below) to catch more variants — useful when migrating from a source with inconsistent name formatting.
- **Bulk dismissals.** "Different people" dismissals persist across sessions, so you only dismiss each false-positive pair once. Useful for siblings or cousins with identical names.
- **Merge from cross-import review.** Open Import/Export tab → "Review matches with main tree" → click "Same person" on a match → click **Merge**. Same Merge Wizard, different entry point.

## Related guides

- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup) — this guide is the natural follow-through
- [I want to set up a staging workflow for messy imports](set-up-staging-workflow) — P2

## Reference

- Wiki: [Staging & Cleanup](https://github.com/banisterious/obsidian-charted-roots/wiki/Staging-And-Cleanup) — Smart Duplicate Detection + Merging Duplicate Records sections
- Wiki: [Data Quality](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Quality)

## Screenshot needs

- **1 load-bearing capture (NEW):** the **Merge Wizard mid-resolution** — side-by-side comparison with at least one field-conflict dropdown visible. The existing `cr-merge-wizard-conflict-res.webm` shows the right scene in motion; capture a still of the same workflow at a representative frame. Drop in after step 4 as the workflow moment.
- *No other captures load-bearing.* The detection modal is conventional (list with confidence labels); the prose at step 2 covers it. Same for the dismiss flow at step 3.

**Capture spec for the new still:**
- **Theme:** Obsidian light mode.
- **Fixture:** Use a believable duplicate pair from the dev vault (e.g., two slightly-different versions of an Anderson family member). The wizard's UI should show the side-by-side comparison, with at least one row featuring a value mismatch and the dropdown active.
- **Filename:** `cr-guide-find-and-merge-duplicates-wizard.png`.
- **Save to:** `docs/images/`.
- **Optimize:** `oxipng -o 6 --strip safe docs/images/cr-guide-find-and-merge-duplicates-wizard.png`.

## Open questions for review

- The Merge Wizard description in the wiki uses "Staging" / "Main" terminology because it's framed around staging-import workflows. For a vault-wide duplicate-detection scenario (no staging), those labels still appear but are less intuitive — they map to "Record A" and "Record B" semantically. Worth either softening the language in this guide or noting the labels are staging-flavored. Currently I use the wiki's labels verbatim; happy to soften if it reads weirdly.
- Step 7 ("Regenerate trees") could be optional — many users don't have generated canvases to regenerate. Worth dropping into Variations? Currently kept in Steps because it's a real gotcha if forgotten.
- Cross-link to `import-gedcom-and-cleanup` is bidirectional now. The other guide already points here. Worth checking the cross-ref renders cleanly in Hugo.
