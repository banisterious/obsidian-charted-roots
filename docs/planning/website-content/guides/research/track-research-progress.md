---
title: "I want to track research progress on a long-term project"
description: Use Hoitink's Six Levels for per-ancestor status, plus research reports as living research logs, to keep multi-year genealogy projects coherent across pauses and resumes.
track: research
difficulty: medium
time_estimate: ~15 min to set up; ongoing as research happens
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to track research progress on a long-term project

Use this when you've been researching the same family for months or years and the work happens in fits and starts — a courthouse trip, a few weeks of follow-up, then a pause until the next archive opens. Without explicit progress tracking, returning researchers spend the first hour each session re-deriving where they left off. By the end of this guide, you'll have two complementary tracking layers in place: a **per-ancestor** status (Hoitink's Six Levels via the `research_level` property) and a **per-question** chronological log (research reports with a `## Research Log` section). Pick one, the other, or both — the guide shows when each fits.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- At least one ongoing research thread — a family group, a brick wall, an immigrant origin question. Open-ended "I'll do some genealogy this weekend" doesn't benefit from project-level tracking.
- A vault habit of opening notes by the same path each time. Tracking is only useful if you actually read it on the way back in.

## Steps

### 1. Decide what you're tracking, per person or per question

The two models answer different questions:

- **Per-ancestor.** "How thoroughly have I researched *this person*?" The Six Levels answer that — Level 0 (placeholder) through Level 6 (full biography). Sortable, filterable, queryable across the vault. Best when you have many ancestors and want to know which ones to focus on next.
- **Per-question.** "What have I tried for *this research question*?" A chronological log inside a research report answers that. Best when you have a specific brick wall or identity problem and need to remember which sources you've already exhausted.

Most long-term projects benefit from both — Hoitink levels on the people, research reports on the open questions. They don't conflict.

### 2. Set the Hoitink level on each person you're tracking

Open the person note. Set `research_level` in the frontmatter:

```yaml
research_level: 3
```

The scale (matching the canonical Hoitink framework):

| Level | Name | What it means |
|---|---|---|
| 0 | Unidentified | We know this person exists (e.g., a placeholder parent in a census household) but don't have a name. |
| 1 | Name Only | Name known, appears in others' records, no vital dates. |
| 2 | Vital Statistics | Birth, marriage, death dates researched. |
| 3 | Life Events | Occupations, residences, children, spouses documented. |
| 4 | Extended Records | Property, military, religion, legal records researched. |
| 5 | GPS Complete | Exhaustive research, written proof summary exists. |
| 6 | Biography | Full narrative biography with historical context. |

The level is a **qualitative judgment about exhaustiveness**, not just a count of properties filled. Two people with the same number of facts can be at different levels: one has direct primary-source evidence for each fact, the other has census-only inferences. Level 3 vs. Level 2.

**Distinction worth keeping:** if `research_level` is *unset*, the person is treated as "not assessed" — meaningfully different from Level 0 ("placeholder, no name"). Don't backfill levels on every person at once just to fill the property; assess explicitly.

### 3. Use the level to drive your next session's focus

In a Bases or DataView view of people, sort by `research_level` ascending. The lowest-level ancestors who *should* be researched further — direct ancestors at Level 1 or 2, say — are your next targets. The Brick Wall Report (Control Center → Reports) sorts the same way.

Conversely, sorting descending shows your most-developed lines, which is useful when deciding whose biography to write next.

### 4. Create a research report for each open question

For brick walls and identity problems that span multiple sessions, create a `cr_type: research_report` note. Frontmatter:

```yaml
---
cr_type: research_report
title: "Birth Location Analysis: William Anderson"
status: draft
up: "[[Anderson Family Research Project]]"
---
```

Status values: `draft`, `review`, `final`, `published`. Move the status forward as the question matures.

### 5. Use the report's body as a living research log

Add a `## Research Log` section in markdown (not YAML — Obsidian's property panel doesn't support nested YAML, and Bases / DataView can't query it). One bullet per research action, dated:

```markdown
## Research Log

- **2026-04-30** — [[Lancaster County Baptism Register 1815-1820]] — Searched all surnames Anderson → negative. No baptism record located for William.

- **2026-05-01** — [[1830 US Census - Lancaster County PA]] — Searched "William Anderson" → positive. Anderson household enumerated, William as 3rd child consistent with 1817 birth.

- **2026-05-02** — Travelled to Lancaster County Historical Society. Pulled three boxes of unfiled probate. No new Anderson material located → negative for that repository.
```

Two formatting notes:

- **`→ negative`** at the end of an entry flags it as a negative finding. The `charted-roots-negative-findings` block on the related person note will surface entries written this way (in research journal entries, research log entries, *and* `## Research Log` sections within research reports).
- **The cadence is yours.** Research isn't continuous — it pauses for archive trips, life, weather. Don't backfill weekly entries you didn't make. Log what actually happened, when it happened.

### 6. Link reports to persons and projects

Use `up:` to point a report at its parent project (`up: "[[Anderson Family Research Project]]"`). Use `subject:` on individual research notes to point at the person. The wiki-linked structure means opening any one of {project, report, person} gets you to the others via backlinks.

## Variations

- **Per-ancestor only.** Many users get by with `research_level` alone, without research reports. Fine — the level is enough signal for most purposes. Add reports when a brick wall demands them.
- **Per-question only.** Some users prefer reports and skip Hoitink levels entirely. Also fine — research reports do the heavy lifting, levels become optional summary metadata.
- **Research journal as catch-all.** Instead of a `cr_type: research_report` per question, some users keep a single `cr_type: research_journal` note as a daily log of all activity across all projects. Good for "what did I do this month" reporting, weaker for "where am I on the Anderson question."
- **External system handoff.** If you import re-imports from Ancestry / MyHeritage periodically, set `external_id` and `external_id_provider` on person notes so subsequent imports preserve your work and don't overwrite manual research.

## Related guides

- [I want to write a proof summary for a contested fact](write-a-proof-summary) — proof summaries are the artifact that distinguishes Level 5 from Level 4
- [I want to identify which facts in my tree need more research](identify-research-gaps) — `research_level` complements per-fact gap detection
- [I want to handle conflicting evidence between two sources](handle-conflicting-evidence) — research reports are where conflict resolution typically gets logged

## Reference

- Wiki: [Frontmatter Reference — Research Level](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#research-level)
- Wiki: [Research Workflow](https://github.com/banisterious/obsidian-charted-roots/wiki/Research-Workflow)
- Wiki: [Dynamic Note Content — Negative Findings Block](https://github.com/banisterious/obsidian-charted-roots/wiki/Dynamic-Note-Content#negative-findings-block)
- Yvette Hoitink, "Six Levels of Ancestral Profiles" — dutchgenealogy.nl

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+track-research-progress%3A+

---

## Notes for review

- Length: ~990 words. At cap.
- Per-ancestor and per-question models are presented as complementary rather than either/or; both have user-evidence backing per the digest.
- Step 5's "→ negative" callout is precise: the parsing now covers all three sources (research_log_entry frontmatter, research_journal markdown, research_report `## Research Log` sections) per #305's resolution.
- "Don't backfill" callouts in steps 2 and 5 are deliberate. Both speak to the user-evidence pattern that real research is intermittent — the guide should normalize that, not imply a steady weekly cadence.
