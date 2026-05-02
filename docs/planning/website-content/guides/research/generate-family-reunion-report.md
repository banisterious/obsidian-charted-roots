---
title: "I want to generate a family reunion report"
description: Generate a Descendant Report or Ancestor Report for sharing at a family reunion — multi-generation, shareable, easy for non-technical relatives to read.
track: research
difficulty: easy
time_estimate: ~10 min
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to generate a family reunion report

Use this when you're preparing for a family reunion and want a printed handout showing the family tree, key dates, and biographical info for relatives who don't use Obsidian (or anything genealogy-related). The Report Wizard's Descendant Report and Ancestor Report formats are the right shape for this — multi-generation, structured for reading, easy to scan and pass around.

By the end you'll have a PDF document suitable for printing as a single handout or stapled booklet.

## What you'll need

- A documented common ancestor or yourself as the starting point.
- A general idea of how many generations to include — too few feels thin, too many becomes a tome.

## Steps

### 1. Open the Report Wizard

Control Center → Reports → **Generate Report**.

### 2. Pick the report type

For a family reunion, two report types fit:

- **Descendant Report** — starts from a common ancestor and shows their descendants forward. Best when reunion attendees share a common ancestor (typical reunion shape).
- **Ancestor Report** — starts from a current generation and works backward through ancestors. Best when the reunion centers on a living person and you want to celebrate their ancestry.

Pick whichever fits your reunion's framing.

### 3. Select the starting person

Search for the common ancestor (Descendant Report) or the central living person (Ancestor Report). Birth/death years appear next to names for disambiguation.

### 4. Configure generations and inclusions

- **Number of generations** — 4 to 6 is the sweet spot for a reunion handout. Fewer than 4 feels too sparse; more than 6 produces a document that takes 30+ minutes to read.
- **Include spouses** — yes, almost always. Reunion attendees want to see who married into the family.
- **Birth/death dates** — yes; helps date-conscious relatives place themselves on the tree.
- **Birth/death places** — optional; useful for diasporic families where geography is part of the story.
- **Notes** — optional; include for biographical color, exclude if you want a structural-only document.

### 5. Choose output format

- **PDF** — print-ready. Default choice.
- **ODT** — editable in LibreOffice, Word, or Google Docs. Pick this if you want to add a custom cover page, photos, or a personal welcome message before printing.

### 6. Generate

Click **Generate**. The report saves to your configured output folder. Open it to verify before printing.

### 7. (Optional) Polish in a word processor

If you exported to ODT, open the file in your word processor and add:

- A cover page with the reunion date, location, and a family photo.
- A brief introduction or family-history note from the reunion organizer.
- Photos of family members alongside their entries.

Then export to PDF for printing.

## Variations

- **Multiple reports for multiple branches.** For larger reunions where attendees span multiple branches, generate one Descendant Report per founding ancestor and bind them together. Easier than a single mega-report.
- **Save the report config as a preset.** If you generate a similar report annually, save the wizard configuration so re-running next year is a single click.
- **Pair with a printable tree.** Many reunions use a Descendant Report handout PLUS a wall-sized printed tree as a visual centerpiece. See [I want to generate a printable family tree](generate-printable-family-tree).
- **Privacy for living persons.** If the report will be shared publicly (or with extended-family who include privacy-conscious individuals), enable living-person privacy under **Settings → Charted Roots → Privacy**. The report respects your privacy threshold.

## Related guides

- [I want to generate a printable family tree](generate-printable-family-tree) — for the visual centerpiece companion
- [I want to generate a family group sheet](generate-family-group-sheet) — for per-couple handouts
- [I want to assemble a family history book](assemble-family-history-book) — for the deeper book-length version

## Reference

- Wiki: [Statistics & Reports](https://github.com/banisterious/obsidian-charted-roots/wiki/Statistics-And-Reports)
- Wiki: [Community Use Cases — Generating a Family Reunion Report](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases#generating-a-family-reunion-report)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+generate-family-reunion-report%3A+

---

## Notes for review

- 4-6 generations as the sweet spot is a real recommendation, not just a guess — bigger reports become unreadable as handouts. Worth keeping the explicit guidance in step 4.
- ODT-then-PDF workflow at step 7 is the polish path; many users skip it but those who use it produce noticeably better reunion materials.
- No new capture; the existing `cr-report-family-group-sheet.png` is conceptually adjacent but specifically a group sheet, not a multi-gen descendant report. Could capture a Descendant Report shot later if useful; not load-bearing.
- Length: ~620 words.
