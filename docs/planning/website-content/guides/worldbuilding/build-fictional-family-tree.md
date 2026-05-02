---
title: "I want to build a family tree for fictional characters"
description: Add fictional characters to a universe with parent / spouse / child relationships, optionally using a custom calendar for dates.
track: worldbuilding
difficulty: easy
time_estimate: ~5 min per character (longer for whole families)
last_reviewed: 2026-05-01
relevant_releases: 0.22.17
---

# I want to build a family tree for fictional characters

Use this when you're populating a fictional universe with characters and their relationships. Maybe you're building out the noble houses of a fantasy world, the bloodlines of a sci-fi dynasty, or the alternate-history forks of a real lineage. By the end, you'll have at least one character note linked to your universe, with relationships wired up and (optionally) fictional-calendar dates in place.

The workflow mirrors [I want to add my first person from scratch](../research/add-first-person-manually) — same Create Person modal, same relationship fields. The worldbuilding-specific bits are the **universe** field and (optionally) **fictional dates** in `born` / `died`.

## What you'll need

- A universe note for your world. See [I want to create a fictional universe](create-fictional-universe).
- (Optional) A custom calendar registered for that universe, if you want to use fictional dates. See [I want to set up a custom calendar with eras](set-up-custom-calendar).
- A character to start with — typically the central figure of a noble house or family group.

## Steps

### 1. Open the Create Person modal

Three paths:

- Command palette → **Charted Roots: Create person**
- Dashboard → **Create Person** tile
- Right-click a folder in the file explorer → **Create person**

The folder context-menu path pre-populates the destination. If you have a universe note open or selected when you trigger the modal, the universe field also pre-populates — saves a step.

### 2. Fill in the basics, including the universe

Required: **Name**. Set the **Universe** field to the universe you created. Autocomplete suggests universe IDs from your existing universe notes; pick yours.

Optional fields: nickname, sex, birth date.

For dates, use either:

- **Real-world dates** in `YYYY-MM-DD` format if your fiction uses Gregorian dating.
- **Fictional dates** like `TA 2941` (Third Age) or `AoL 1234` (custom) if you've registered a calendar for this universe.

Choose **Create & Open** to land in the new note, or **Create & Add Another** to keep the form open for the next character.

### 3. Add relationships from the Edit Person modal

Right-click the new note → **Edit**. Each relationship field — Father, Mother, Spouse, Children — has a **+** to create a new linked character inline (auto-bidirectional) or **Add existing** to pick from your vault. Inline-created characters inherit the same universe.

![Edit Person modal with relationships and events populated for a fictional character](images/cr-edit-person-modal.png)

### 4. (Optional) Add narrative events

The events section records births, deaths, marriages, battles, ascensions, exiles — anything from your storyline. Each becomes its own event note linked back to the person, with the same fictional-calendar date support if you set one up.

### 5. Verify

Open the note. Frontmatter shows `cr_type: person`, the auto-generated `cr_id`, your universe link, and any other fields you set. Open the **Universes** tab in Control Center — the entity count for your universe ticks up by one, confirming the link is wired.

## Variations

- **Building a whole noble house at once.** Use the Family Creation Wizard (`Charted Roots: Create family wizard`). Five-step flow for central character + spouses + children + parents, with bidirectional linking. Each character inherits the universe of the central figure.
- **Adding properties to an existing note.** Right-click the file → **Charted Roots → Add essential person properties**. Adds `cr_id`, `cr_type`, `name`, plus common optional fields. Multi-select to apply across many character notes.
- **Bulk entry across many characters.** [Bases Integration](https://github.com/banisterious/obsidian-charted-roots/wiki/Bases-Integration) gives a spreadsheet-like editing surface — useful when sketching out a noble house's three-generation roster.
- **Organizations and houses.** For tracking guild memberships, houses, military units, religious orders, see [Organization Notes](https://github.com/banisterious/obsidian-charted-roots/wiki/Organization-Notes). Organizations are also universe-scoped and link to characters via membership.

## Related guides

- [I want to create a fictional universe](create-fictional-universe) — prerequisite
- [I want to set up a custom calendar with eras](set-up-custom-calendar) — for non-Gregorian dating
- [I want to create a custom map of my fictional world](create-custom-image-map)

## Reference

- Wiki: [Universe Notes](https://github.com/banisterious/obsidian-charted-roots/wiki/Universe-Notes)
- Wiki: [Data Entry](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Entry)
- Wiki: [Fictional Date Systems](https://github.com/banisterious/obsidian-charted-roots/wiki/Fictional-Date-Systems)
- Wiki: [Frontmatter Reference](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+build-fictional-family-tree%3A+

---

## Notes for review

- This guide deliberately mirrors `add-first-person-manually` rather than rewriting the workflow from scratch. The two share the same Create Person modal — the worldbuilding additions (universe, fictional dates) are highlighted in steps 2 and 4. Cross-link to the research guide is in the framing paragraph for readers who want the full general guide.
- The Edit Person screenshot (Cugel the Clever from Dying Earth) is genuinely a worldbuilding fixture, so it's appropriate here even though it's also the load-bearing capture for `add-first-person-manually`. Same shot, both contexts.
- Organizations / noble houses are mentioned in Variations but not promoted to a step. They're a natural follow-up but their own thing — `track-organizations-across-generations` is on the P2 list.
- Length: ~620 words.
