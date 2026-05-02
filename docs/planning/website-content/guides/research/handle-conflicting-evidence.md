---
title: "I want to handle conflicting evidence between two sources"
description: Reconcile contradictory sources using Mills' three-axis classification — source, information, evidence — and capture the resolution as a proof summary so the reasoning survives.
track: research
difficulty: advanced
time_estimate: ~30+ min per conflict
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to handle conflicting evidence between two sources

Use this when two sources tell you different things about the same fact — two census records giving different birth years, a death certificate and a tombstone disagreeing on a date, a family Bible contradicting a baptism record. Per the Genealogical Proof Standard, conflicts must be *resolved*, not ignored. By the end of this guide, you'll have classified each source on Mills' three independent axes (source / information / evidence), weighed them on actual analytical merit rather than vibes, and captured the resolution as a proof summary that any later reviewer (including future you) can follow.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- The conflict in front of you — at minimum, two source notes covering the same fact about the same person.
- Some patience. Conflict resolution isn't a 5-minute task; doing it right means recording why one piece of evidence outweighs another.

## Steps

### 1. State the conflict precisely

Vague conflicts don't resolve. Write the question down in one sentence:

> "The 1870 census suggests William Anderson was born ~1818; the 1880 census suggests ~1825. Which is correct?"

That sentence is the research question for the proof summary you'll write at the end. It scopes everything that follows.

### 2. Classify each conflicting source on three axes

Mills' *Evidence Explained* methodology treats source quality as three independent classifications, not one. Set the relevant frontmatter properties on each source note:

```yaml
source_classification: original | derivative | authored_narrative
information_classification: primary | secondary | undetermined
evidence_classification: direct | indirect | negative
```

What each axis answers:

| Axis | Question it answers | Example values |
|---|---|---|
| Source | What kind of document is this? | A census image is `original`. A FamilySearch transcription of that census is `derivative`. A published genealogy citing the census is `authored_narrative`. |
| Information | Who provided this information, and how close were they to the event? | A census respondent reporting their own age provides `primary` information. The same respondent reporting a parent's birthplace provides `secondary` information. An unsigned record where you can't tell who informed it is `undetermined`. |
| Evidence | How does this information relate to your specific question? | A birth certificate proving the date is `direct` evidence. Age on a census implying a birth year is `indirect`. A person's absence from a census where they should appear is `negative` — and meaningful. |

The two census records in the William Anderson conflict are both `original` sources but contain `secondary` information (the household informant likely didn't witness William's birth). That changes how heavily either record weighs against, say, a contemporary family Bible entry recording the birth date in original ink.

### 3. Look for negative evidence

Negative findings are first-class. If the conflict is "where was William born," and you've searched a county's church baptism registers covering the relevant years and found nothing, that's `evidence_classification: negative` on the absence — and it has to be recorded, not silently dropped. Document it in your research log:

```markdown
## Research Log

- **2026-04-30** — [[Lancaster County Baptism Register 1815-1820]] — Searched all surnames Anderson → negative. No baptism record located for William.
```

The `charted-roots-negative-findings` block on the person note will surface entries like this when the time comes to write the proof summary.

### 4. Reconcile the conflict

With the three-axis classifications in front of you, the conflict usually stops being symmetrical. Common patterns:

- **Direct beats indirect.** A birth certificate (direct evidence of the date) outweighs a census age (indirect evidence implying a year).
- **Primary beats secondary.** The person reporting their own marriage date outweighs a death-certificate informant reporting the deceased's marriage date decades later.
- **Original beats derivative.** The original handwritten census schedule outweighs a database transcription of it — especially when the transcription is what you're getting at first glance.
- **Contemporary beats retrospective.** A document created at the time of the event beats one created from memory years later, all else equal.
- **Negative evidence narrows the field.** If a baptism register exists for the right place and years and doesn't list the person, that's a real signal — possibly that the family wasn't there, possibly that the family wasn't of that denomination.

Sometimes the conflict doesn't resolve cleanly. That's also a finding. Capture it as `confidence: possible` rather than forcing a conclusion.

### 5. Capture the resolution as a proof summary

Open Control Center → Data Quality tab → **Source conflicts** card → **Create proof summary**, or go to the person directly via People tab → **New proof**. Either entry point opens the same modal.

In the modal:

- Add each conflicting source as an evidence item.
- For each, set **Supports** to `Conflicts with` for the contradicting source(s) and `Strongly` / `Moderately` / `Weakly` for the source(s) you favor.
- Write the **Conclusion** as the answer to step 1's research question.
- Set **Status** to `Conflicted` if you couldn't reconcile, or `Complete` if you did. Set **Confidence** to match — `Proven`, `Probable`, `Possible`, or `Disproven`.

In the body of the saved note, write the analysis: which axis tipped the decision, why the negative evidence supports the conclusion, what would change your mind. See [the proof-summary guide](write-a-proof-summary) for the full structure.

### 6. Verify the conflict surfaces (or doesn't) in Data Quality

Control Center → Data Quality tab → **Source conflicts** card displays a count of unresolved conflicts (proof summaries with status `Conflicted` and at least one evidence item marked `Conflicts with`). When you flip a status from `Conflicted` to `Complete`, the count decrements. That's how you confirm the resolution registered.

## Variations

- **Three or more sources in conflict.** Same workflow, more evidence items in the same proof summary. The three-axis classification matters more, not less, when the field gets crowded.
- **Conflict you can't resolve yet.** Leave status as `Conflicted` and confidence as `Possible`. The proof summary becomes a placeholder that surfaces in Data Quality every time you open the Control Center — a nudge to revisit when more evidence surfaces.
- **Conflict turns out to be two different people.** This happens. Resolve by splitting the person record (or running [duplicate detection in reverse](find-and-merge-duplicates) — the dismissals are also persistent). The proof summary's conclusion becomes "Sources A and B are evidence about distinct individuals, not the same person."
- **Quality classification you're unsure about.** The defaults inferred from `source_type` (e.g., `census` defaults to `primary` source quality) are usually right for the document but say nothing about information quality. Override `information_classification` explicitly when you can — it's the axis that most often shifts how a conflict resolves.

## Related guides

- [I want to write a proof summary for a contested fact](write-a-proof-summary) — the resolution mechanism in detail
- [I want to track research progress on a long-term project](track-research-progress) — where the negative-findings log lives
- [I want to set up per-fact source citations](set-up-source-tracking) — the `sourced_*` arrays that feed into conflict detection

## Reference

- Wiki: [Frontmatter Reference — Source Classification (Mills' Evidence Explained)](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#source-classification-mills-evidence-explained)
- Wiki: [Evidence & Sources](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)
- Wiki: [Research Workflow — Negative Findings](https://github.com/banisterious/obsidian-charted-roots/wiki/Research-Workflow#negative-findings)
- Elizabeth Shown Mills, *Evidence Explained: Citing History Sources from Artifacts to Cyberspace* (4th ed., 2024)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+handle-conflicting-evidence%3A+

---

## Notes for review

- Length: ~990 words. Right at the cap.
- Pairs intentionally with `write-a-proof-summary` using the same William Anderson birth-year fixture. Cross-link is bidirectional.
- The three-axis framing is the load-bearing piece. ANYroots and wilbry both think in those terms; users coming from a one-axis (`source_quality` only) mental model need this guide to upgrade.
- Step 6 is precise about what the Data Quality "Source conflicts" card actually counts — proof summaries with status `conflicted` and at least one `conflicts` evidence item — to avoid false expectation that it auto-detects conflicts from raw source notes.
