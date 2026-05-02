---
title: "I want to write a proof summary for a contested fact"
description: Document the reasoning chain for a genealogical conclusion — evidence, analysis, confidence — using the Create Proof Summary modal so the conclusion holds up to review.
track: research
difficulty: advanced
time_estimate: ~30+ min per proof
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to write a proof summary for a contested fact

Use this when a fact about an ancestor doesn't fall out of a single source — when you have to reconcile conflicting records, infer from indirect evidence, or argue why one interpretation outweighs another. Per the Genealogical Proof Standard, conclusions of that kind require a **written proof summary**: the evidence cited, how each piece supports or conflicts with the conclusion, and why the conclusion holds up. By the end of this guide, you'll have a `cr_type: proof_summary` note in your vault that links to its supporting sources, records confidence and status, and shows up in the person's Entity Profile View and Control Center.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- A person note for the subject of the proof.
- At least two source notes covering the contested fact. One source isn't a proof summary — it's just a citation. Proof summaries exist when evidence has to be weighed.
- A clear research question. "What was William Anderson's birth year?" is a proof-summary question. "Tell me about William Anderson" isn't.

## Steps

### 1. Frame the conclusion before opening the modal

A proof summary needs three things you should have ready: the **conclusion** (one sentence — "William Anderson was born in 1817"), the **evidence** (which sources speak to that conclusion), and the **analysis** (the reasoning chain). Drafting these in your head or in a scratch note first makes the modal a transcription exercise rather than a thinking exercise.

The example throughout this guide: William Anderson's birth year, where the 1870 census suggests ~1818 and the 1880 census suggests ~1825 — a seven-year discrepancy that needs to be reconciled.

### 2. Open the Create Proof Summary modal

Two entry points:

- **From the person directly.** Control Center → People tab → click the person's card → expand **Proof summaries** → **New proof**. The subject person is pre-filled.
- **From a known conflict.** Control Center → Data Quality tab → **Source conflicts** card → **Create proof summary**. The subject person, fact type, and conflicting sources are pre-filled. This is the right entry point when [the source-conflicts detection](handle-conflicting-evidence) surfaced the issue for you.

### 3. Fill in the header

- **Title** — short, descriptive. "Birth year of William Anderson (1817)" is enough.
- **Subject person** — wikilink to the person note.
- **Fact type** — one of the 10 trackable facts (birth date, birth place, death date, etc.). Proof summaries are scoped to a single fact so reports can find them.
- **Conclusion** — one sentence stating what you're proving. "William Anderson was born in 1817 in Lancaster County, Pennsylvania."
- **Status** — start at `Draft`. Move to `Needs review` when ready for a second pair of eyes, `Complete` when you're satisfied, `Conflicted` if you couldn't reconcile.
- **Confidence** — `Possible`, `Probable`, `Proven`, or `Disproven`. These map to the GPS standard: `Proven` means preponderance of evidence, not certainty.

### 4. Add evidence items, one per source

For each source that bears on the conclusion, click **Add evidence**. Each entry has:

- **Source** — wikilink picker (or `+` to create a new source). The source must already exist as a note in the vault.
- **Information** — what this source actually says. Quote it concisely. *"Age 52 in 1870 → birth year 1818."*
- **Supports** — `Strongly`, `Moderately`, `Weakly`, or `Conflicts with`.
- **Notes** — optional. Use for caveats: "informant unknown," "transcription not the original," "approximate age likely rounded."

Example evidence chain for William's birth year:

```yaml
evidence:
  - source: "[[1870 US Census - Pennsylvania]]"
    information: "Age 52, suggesting birth year ~1818."
    supports: moderately
    notes: "Census ages are approximate; informant unknown."
  - source: "[[1880 US Census - Pennsylvania]]"
    information: "Age 55, suggesting birth year ~1825."
    supports: conflicts
    notes: "Conflicts with 1870 by ~7 years."
  - source: "[[Family Bible - Anderson]]"
    information: "Recorded birth: March 12, 1817."
    supports: strongly
    notes: "Contemporary entry, written in original ink, no later additions."
```

Three evidence items, three different `supports` values, one of them flagged as a conflict.

### 5. Write the analysis in the note body

The modal saves the structured frontmatter; the actual reasoning goes in the body of the note as markdown. After saving, open the note and write the analysis under the auto-generated headers. Cover:

- **Why the strongest evidence wins.** The Family Bible is contemporary, in original ink, with no signs of later alteration — it's the most direct evidence available.
- **Why the conflict resolves.** Census ages are notoriously imprecise; the 1880 figure is consistent with a person rounding their age, while the 1870 figure aligns with the Bible within one year.
- **What you didn't find.** Negative findings count: "No baptism record located in Lancaster County church registers, 1815–1820." Acknowledging gaps strengthens the proof.

### 6. Save and verify

Save the modal. Charted Roots writes the proof summary as a `cr_type: proof_summary` note. Verify it appears in:

- The subject person's **Entity Profile View** (Proof summaries section).
- Control Center → People tab → person card → Proof summaries.
- The Sources by Role report and DataView/Bases queries scoped to `cr_type = "proof_summary"`.

### 7. Update `research_level` if the proof completes Level 5

A written proof summary is the qualitative marker that a person has reached Hoitink Level 5 — "GPS Complete: exhaustive research, written proof summary." If this proof brings the person to that bar, update their `research_level` to `5` on the person note. See [the research progress guide](track-research-progress) for the full Six Levels framework.

## Variations

- **Proofs that depend on other proofs.** If your conclusion rests on another proof summary (e.g., "William's parents were John and Mary, *as established in proof summary X*"), use the `depends_on` array to record the dependency. The dependency chain is queryable.
- **Disproven conclusions.** Set status to `Complete` and confidence to `Disproven`. A "this isn't true and here's why" proof summary is as valuable as a "this is true" one — sometimes more.
- **Iterative drafting.** Status `Draft` is for in-progress work. The note is fully editable; revisit it as new evidence surfaces. Move status forward as your confidence does.

## Related guides

- [I want to handle conflicting evidence between two sources](handle-conflicting-evidence) — the upstream workflow when conflicts surface
- [I want to track research progress on a long-term project](track-research-progress) — Hoitink Level 5 framing
- [I want to set up per-fact source citations](set-up-source-tracking) — the per-fact `sourced_*` arrays that proof summaries complement

## Reference

- Wiki: [Research Workflow — Research Reports and Proofs](https://github.com/banisterious/obsidian-charted-roots/wiki/Research-Workflow)
- Wiki: [Evidence & Sources — GPS overview](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)
- *Genealogy Standards*, 2nd ed. (2019), Board for Certification of Genealogists — defines the GPS

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+write-a-proof-summary%3A+

---

## Notes for review

- Length: ~970 words.
- William Anderson + the 1870/1880 census + Family Bible example is the canonical worked example from the user-research digest. Pairs naturally with the conflict-handling guide using the same fixture.
- Step 4's evidence YAML mirrors the actual `ProofEvidence` shape (`source`, `information`, `supports`, `notes`) from `src/sources/types/proof-types.ts`.
- No screenshots intentional. If a Create Proof Summary modal capture lands, it goes at step 4.
