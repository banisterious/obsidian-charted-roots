---
title: "I want to identify which facts in my tree need more research"
description: Use three complementary surfaces — per-note research questions, the Research Gaps card, and the Gaps Report — to find what to work on next without conflating "haven't researched" with "haven't sourced."
track: research
difficulty: medium
time_estimate: ~15 min initial pass; ongoing as you research
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to identify which facts in my tree need more research

Use this when your tree has reached the size where "what should I work on next?" stops having an obvious answer. Charted Roots offers three complementary surfaces for finding research gaps, and they answer different questions: a **per-note** list of open questions you've explicitly logged (`needs_research`), a **per-fact aggregation card** in Data Quality (unsourced and weakly sourced facts across the vault), and a **comprehensive Gaps Report** with research-level filtering. By the end of this guide, you'll have used all three and you'll know which one to reach for in different situations.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- A vault with at least a few people and some `sourced_*` data — even partial. Empty trees don't have gaps; they have blanks.
- A real research direction. "Find what's missing" is open-ended; "find direct ancestors at Level 1 or 2 with missing parents" is a query.

## Steps

### 1. Distinguish the three kinds of gap

Before opening any report, get clear on which kind of gap you're looking for:

| Gap type | What it means | Where to find it |
|---|---|---|
| **Open question** | You know what you want to research and you've written it down. | `needs_research` array on the person/place note; surfaces in Entity Profile View → Data Quality → Research questions. |
| **Unsourced fact** | You've recorded a fact (e.g., a birth date) but haven't linked any source supporting it. | Data Quality tab → Research gaps card. |
| **Weakly sourced fact** | You've sourced the fact, but only with secondary or derivative sources. A primary source would strengthen the claim. | Same card, with the "Weakly sourced only" filter. |

These are different problems. Conflating them produces frustrated reactions like "the report says I have 239 unsourced facts but I only have 24 notes" — which usually means the report is counting *unrecorded* facts (no value, no source) alongside *recorded but unsourced* facts. As of v0.22.17 the per-fact card scopes its count to people who have GPS tracking enabled, so this confusion shouldn't surface for new vaults.

### 2. Log per-note research questions as you encounter them

When you're working in a person note and notice something missing — "no marriage record located," "find death cause," "Spartanburg County will" — log it immediately. Don't carry it in your head.

Command palette → **Charted Roots: Add research question to current note**. Type the question; it appends to the `needs_research` frontmatter array:

```yaml
needs_research:
  - "1910 census residence"
  - "1920 census residence"
  - "Death record (Spartanburg Co., SC)"
  - "Find marriage license — partner name unknown"
```

Granularity matters. *"Find more"* is useless six months from now; *"1920 census residence"* is a specific search you can pick up cold. Each entry should name the record + jurisdiction + (when relevant) the year.

The questions surface in Entity Profile View → Data Quality → Research questions. Tick them off by editing the array directly when you've done the work — there's no UI for "mark resolved" yet, so resolved entries get deleted from the list.

### 3. Use the Research gaps card for fact-level triage

Control Center → Data Quality tab → **Research gaps** card. Three filters at the top let you scope:

- **All research gaps** (default) — every fact below the coverage threshold, grouped by fact type.
- **Unsourced only** — facts with no source attached.
- **Weakly sourced only** — facts sourced only by secondary/derivative sources.
- **Needs primary source** — facts where strengthening to primary source would close the gap.

Below the filter, the card shows a breakdown by fact type and a "lowest coverage" list of people. Click any person to open their note. **Export to CSV** in the header is useful when you want to plan a research session offline.

### 4. Generate a Gaps Report for the comprehensive view

When you want a single report covering many gap categories, use the Gaps Report instead. Control Center → Reports → **Gaps Report**.

The report identifies missing data across person notes (birth dates, parents, places, etc.) and is the right tool when you want:

- **Research level filter** — limit to people at or below a specific Hoitink level (e.g., everyone at Level 0–2). Combined with sorting by lowest level first, this surfaces ancestors needing the most work.
- **Per-level statistics** in the summary — "Needs work (0–2): 47 people" gives you a tractable scope rather than "X has missing dates."
- **Multiple gap categories in one document** — missing birth dates, missing parents, missing death dates, etc., all at once. Useful for planning a multi-week research push or sharing with a research partner.

Output formats: vault markdown, download, PDF, ODT.

### 5. Pair gap finding with the Brick Wall Report

The Brick Wall Report (Reports → Brick Wall Report) identifies end-of-line ancestors — people in your ancestor tree with no parents defined. Set a `Root person`, choose how many generations to traverse, and the report ranks unresolved ancestors by generation, Ahnentafel number, and research level. This is the natural complement to the gaps card: the card tells you which *facts* need work; the brick-wall report tells you which *people* are blocking lineage extension.

### 6. Decide what to work on, in priority order

A practical priority order for a research session:

1. **Open questions on direct ancestors** — they're already scoped and you'll close them fast.
2. **Brick-wall ancestors at low Hoitink levels** — biggest unlock per hour invested.
3. **Unsourced facts on direct ancestors** — strengthens proof chains for downstream work.
4. **Weakly sourced facts** — only after the unsourced category is exhausted; primary-source upgrades are a quality pass, not a discovery pass.
5. **Collateral relatives** — useful for FAN cluster work but the lowest priority unless they bear on a brick wall.

## Variations

- **Bases-driven view.** A People base filtered on `research_level <= 2 AND length(needs_research) > 0` gives you a live, browsable list of ancestors with open questions at low research levels. Useful as a daily dashboard.
- **Per-place gaps.** `needs_research` works on place notes too — log "find first municipal records" or "verify parish boundary 1850" against the place rather than against everyone who lived there.
- **Per-event gaps.** Same property works on event notes. For a marriage with an unverified date, log the question against the event rather than scattering it across the spouses.
- **Snapshot for a research trip.** Export the Research gaps card to CSV, filter to people in the relevant geographic area, print. Bring the printout to the archive instead of an open laptop.

## Related guides

- [I want to track research progress on a long-term project](track-research-progress) — the Hoitink levels that gap-prioritization depends on
- [I want to set up per-fact source citations](set-up-source-tracking) — the `sourced_*` arrays the gap card aggregates
- [I want to handle conflicting evidence between two sources](handle-conflicting-evidence) — what to do when a "gap" is actually a conflict

## Reference

- Wiki: [Statistics & Reports — Gaps Report](https://github.com/banisterious/obsidian-charted-roots/wiki/Statistics-And-Reports#gaps-report)
- Wiki: [Statistics & Reports — Brick Wall Report](https://github.com/banisterious/obsidian-charted-roots/wiki/Statistics-And-Reports#brick-wall-report)
- Wiki: [Frontmatter Reference — Research Level](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#research-level)
- Wiki: [Evidence & Sources — Fact-Level Source Tracking](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources#fact-level-source-tracking)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+identify-research-gaps%3A+

---

## Notes for review

- Length: ~990 words.
- Step 1's three-axis distinction is the load-bearing piece. The 239-vs-24 callout is intentional — that's the most common source of new-user confusion per the digest, and it's the kind of thing a guide can preempt in two sentences.
- Step 2's `needs_research` example list is verbatim ANYroots' (#266) — granularity-as-pattern is more persuasive with a real example than with hypothetical phrasing.
- Step 6's priority order is opinion, not feature documentation. Worth reviewing for whether it reflects the maintainer's actual preference.
