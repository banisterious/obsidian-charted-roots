---
title: "I want to set up per-fact source citations"
description: Track which sources support each fact about a person, with coverage scoring across your tree.
track: research
difficulty: medium
time_estimate: ~15 min
last_reviewed: 2026-05-01
relevant_releases: 0.22.17
---

# I want to set up per-fact source citations

Use this when you have source notes (or want to start making them) and you want a clear signal of which facts about each person are documented. Aligns with the Genealogical Proof Standard's "complete and accurate citations" pillar without forcing strict GPS compliance. By the end, at least one person will have `sourced_*` properties wired up, and you'll see coverage data appear in the Entity Profile View, the Control Center's Data Quality card, and (optionally) on tree badges.

## What you'll need

- Charted Roots **v0.22.17 or later**. The per-fact UI in the Edit Person modal requires this version. Earlier versions only support the YAML-only approach.
- At least one person note. We'll use **William Anderson** as the running example.
- At least one source note. We'll use **1950 US Federal Census** as the example. Step 3 covers creation if you don't have one.
- (Optional) A sense of which of the 10 trackable facts you care about: birth date, birth place, death date, death place, parents, spouse, marriage date, marriage place, occupation, residence.

## Steps

### 1. Confirm fact tracking is enabled

Go to **Settings → Charted Roots → Research → Research tools → Enable fact-level source tracking**. As of v0.22.17 this defaults to **on**. Verify it isn't off, then leave it.

> If you're on an older version, the same setting lives under **Advanced → Research tools** instead. The relocation is the only change in v0.22.17 — the toggle behavior is identical.

### 2. (Optional) Adjust the coverage threshold

Same panel: **Fact coverage threshold**. Default is **6** — sourcing 6 of the 10 facts gives 100% coverage. Lower if you don't track every fact (e.g., if occupation and residence aren't your focus). Raise it (up to 10) if you want every fact weighted equally.

### 3. Create at least one source note

Skip if you have one already. Right-click a folder → **New sources base from template**, or use the Create Source modal from Control Center → Sources tab. The minimum frontmatter is:

```yaml
cr_type: source
cr_id: <unique>
title: <descriptive title>
source_type: <census, vital_record, etc.>
```

Other fields — `source_repository`, `source_date`, `confidence` — are recommended but optional.

### 4. Open the person note and edit it

Right-click the note → **Edit person**. Find the **Source tracking** section in the modal — it lists all 10 trackable facts as one row each, with `+` buttons to attach sources.

### 5. Attach sources to facts

For each fact you have evidence for, click `+` and pick the source note from the picker. Multiple sources per fact are encouraged. A birth date confirmed by both the birth certificate *and* a census is stronger than either alone — that's the "independent attestation" pattern the Genealogical Proof Standard is built around.

![Edit Person modal showing the Source tracking section with multiple sources attached to several facts](images/cr-guide-set-up-source-tracking-modal.png)

### 6. Save

The frontmatter now contains arrays like:

```yaml
sourced_birth_date:
  - "[[Family Bible]]"
  - "[[Birth Certificate - William Anderson]]"
sourced_birth_place:
  - "[[Birth Certificate - William Anderson]]"
sourced_parents:
  - "[[Birth Certificate - William Anderson]]"
```

One array per fact you tracked. Note the distinction:

- A **missing property** means the fact hasn't been tracked yet.
- An **empty array** (`sourced_birth_date: []`) means the fact is explicitly marked as unsourced.

The empty-array form is useful when you've actively looked and confirmed nothing exists — different from "haven't looked yet."

### 7. Verify the coverage shows up

Coverage data appears in three places:

- **Entity Profile View** for the person — Data Quality section shows the coverage percentage, with primary / secondary evidence badges.
- **Control Center → Data Quality card** — research-gaps view shows unsourced and weakly sourced facts across the whole vault, grouped by fact type. This is where you go to find your next research target.
- **Tree badges** (if you've enabled them under **Canvas styling → Show source indicators**) — node badges include the coverage percentage alongside the source count.

![Person profile showing per-fact attribution with primary and secondary evidence badges, and a coverage summary](images/cr-entity-attribution.png)

## Variations

- **YAML-first.** Edit frontmatter directly instead of the modal. Same shape — wikilink arrays, one per `sourced_*` property. Useful for scripting or for editing in Obsidian's property panel.
- **Citation notes for deeper detail.** If you need per-fact metadata like page references or quality ratings (0–3 mapping to GEDCOM `QUAY`), use citation notes instead. Command palette → **Charted Roots: Add citation to current note**. Citations and `sourced_*` arrays sync in both directions: `Sync sourced fields from citation notes` populates arrays from existing citations, and `Generate citation notes from sourced fields` does the reverse.
- **Bulk-populate from a GEDCOM import.** If your imported GEDCOM had `SOUR` blocks with `PAGE` or `QUAY` metadata, citation notes were created automatically. Run `Charted Roots: Sync sourced fields from citation notes (all people)` to derive `sourced_*` arrays for every person.
- **Per-vault disable.** Toggle the switch off. Coverage won't compute and badges won't display, but `sourced_*` data on existing notes is preserved — re-enable later without losing anything.

## Related guides

- [I want to capture a source from a website](clip-a-source-from-the-web)
- [I want to attach one source to multiple people](attach-one-source-to-multiple-people)
- [I want to identify which facts in my tree need more research](identify-research-gaps)

## Reference

- Wiki: [Evidence & Sources](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)
- Wiki: [Settings & Configuration](https://github.com/banisterious/obsidian-charted-roots/wiki/Settings-And-Configuration)
- Wiki: [Frontmatter Reference](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+set-up-source-tracking%3A+

---

## Notes for review

- William Anderson is the running example to match the new modal capture. The YAML example in step 6 reflects what's visible in the screenshot.
- Step 1 includes a callout for v0.22.17 readers landing here from older docs (Settings location moved). Worth keeping for ~6 months until the migration is no longer recent, then drop the callout.
- Citation notes get a paragraph in Variations, not a step. Anyone who wants per-fact metadata can follow that thread; otherwise the simple `sourced_*` workflow is the headline.
- Both screenshots are load-bearing: the modal capture at step 5 (workflow moment), the entity-profile capture at step 7 (success verification).
- Length: ~830 words.
