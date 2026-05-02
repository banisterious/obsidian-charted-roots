---
title: "I want to research enslaved ancestors (Beyond Kin methodology)"
description: Document enslaved ancestors by working outward from slaveholder records — probate packets, appraisements, sale bills — using source roles, source hierarchy, and Beyond Kin naming conventions.
track: research
difficulty: advanced
time_estimate: ~30+ min for the first packet; ongoing as records accumulate
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to research enslaved ancestors (Beyond Kin methodology)

Use this when you're researching African American genealogy across the 1865 documentary divide. Pre-emancipation, enslaved ancestors typically appear as named property in slaveholder records — probate appraisements, sale bills, advancements to heirs, plantation account books — rather than in vital records. The [Beyond Kin Project methodology](https://beyondkin.org/a-method-to-document-enslaved-populations/) treats these records as the documentary surface for reconstructing family relationships before emancipation. By the end of this guide, you'll have a slaveholder's probate packet structured as a parent source with its component documents, named enslaved individuals tracked as a source role, and a workflow that scales as more records surface.

## What you'll need

- Charted Roots **v0.22.17 or later** (source-roles and source-hierarchy features required).
- At least one slaveholder probate packet, will, estate inventory, or appraisement to start with. Sale bills and plantation account books work too.
- Familiarity with the [Beyond Kin naming conventions](https://beyondkin.org/beyond-kin-naming-conventions/). This guide uses them but doesn't reproduce them.

## Steps

### 1. Create the parent source for the record group

A probate packet is a multi-document record group: a will, an inventory, an appraisement, an advancement, a sale bill, and final settlement papers may all be one packet. Model the packet itself as a source note, then create child source notes for each document.

Right-click your sources folder → **New sources base from template**, or use the Create Source modal from Control Center → Sources. Frontmatter for the packet:

```yaml
cr_type: source
cr_id: src_hardwick_probate_packet
title: "William H. Hardwick Probate Packet (1863–1870)"
source_type: probate
source_repository: York County, South Carolina, Probate Court
```

### 2. Create child source notes for each component document

For each document in the packet (appraisement, sale bill, advancement, etc.), create a separate source note and link it to the parent via `source_parent`:

```yaml
cr_type: source
cr_id: src_hardwick_appraisement_1864
title: "Hardwick Estate Appraisement (1864)"
source_type: probate
source_parent: "[[William H. Hardwick Probate Packet (1863–1870)]]"
source_parent_id: src_hardwick_probate_packet
```

The dual `source_parent` + `source_parent_id` properties give you Obsidian backlink visibility plus reliable id-based resolution.

### 3. Track named enslaved individuals via source roles

On each component document, list the enslaved individuals named in that document under the `enslaved_individuals` role:

```yaml
enslaved_individuals:
  - "[[Mary]]"
  - "[[Peter]]"
  - "[[Susan]]"
```

Each entry is a wikilink to a person note. Create the person notes as you go — Beyond Kin practice typically uses the given name plus an indicator of the slaveholder (e.g., `Susan (Hardwick)`) since surnames usually aren't recorded for enslaved persons in pre-emancipation documents.

You can use the Create/Edit Source modal's **Person roles** section instead of editing YAML directly: expand the section, click **Add person**, pick from the picker, choose `Enslaved individuals` as the role.

### 4. Capture transfers as the documents reveal them

Appraisements value enslaved persons as estate property; advancements distribute them to heirs; sale bills name buyers. Each of those is a transfer event — a change in who has legal control over the person — that's worth recording.

For each named individual, set ownership properties on the person note:

```yaml
cr_type: person
cr_id: person_mary_hardwick
name: "Mary"
property_of: "[[Reuben Hardwick]]"
held_at: "[[Hardwick Plantation]]"
appraised_value: 350
```

These represent the *current/final* state. To track changes over time (Mary appraised in 1864, advanced to a daughter in 1866, sold in 1869), create transfer event notes. The `charted-roots-transfers` block on the person note will display them chronologically.

### 5. Use FAN-cluster roles to capture community networks

A sale bill names buyers; an appraisement names appraisers; a will names executors and witnesses. These are all members of the slaveholder's FAN (Friends, Associates, Neighbors) network — and many of them are themselves slaveholders, future buyers, or kin to the family you're researching.

Track them with the standard role categories on the source note:

```yaml
officials:
  - "[[James Wilson|James Wilson (Appraiser)]]"
witnesses:
  - "[[Thomas Brown|Thomas Brown (Will witness)]]"
others:
  - "[[Samuel Davis|Samuel Davis (Buyer at sale)]]"
```

See [the FAN clusters guide](analyze-fan-clusters) for the analysis workflow once these networks are populated.

### 6. Work around name normalization until #517 ships

Beyond Kin's placeholder names (single-name entries, surname-deferred conventions) can be flagged by Charted Roots' "Normalize name formatting" Data Quality operation. Until [#517](https://github.com/banisterious/obsidian-charted-roots/issues/517) ships per-note exclusion, the workaround is: when running normalize names, review the preview list and **uncheck** entries that use your Beyond Kin conventions before applying. The operation is interactive — you choose which changes go through.

## Variations

- **Single-document starting point.** If you don't have a full probate packet yet — just an isolated appraisement, for instance — skip steps 1 and 2 and create that document as a standalone source. Add the parent source later when more documents in the same group surface.
- **Plantation account books and ledgers.** These often record both forced labor and individual identifiers across years. Model the book as a parent source with monthly or annual entries as children. Same role-tracking pattern.
- **Pension files (1865+).** USCT pension applications often name still-living enslaved kin and former slaveholders. Track applicants as principals, named relatives as `family`, and former slaveholders in `others` with role detail in the wikilink display text.
- **Terminology preference.** This guide uses "Enslaved individuals" and "Slaveholder," following the convention adopted in [#189](https://github.com/banisterious/obsidian-charted-roots/issues/189). Other practitioners use "Slave" / "Enslaver"; both are valid within the community. The frontmatter property is fixed (`enslaved_individuals`) but role display text and prose terminology are yours to choose.

## Related guides

- [I want to analyze FAN clusters to break through a brick wall](analyze-fan-clusters) — slaveholder community networks and FAN networks overlap completely
- [I want to organize a multi-document source collection](organize-multi-document-source-collections) — the `source_parent` pattern in detail
- [I want to handle conflicting evidence between two sources](handle-conflicting-evidence) — when an appraisement and a sale bill name the same person under different details

## Reference

- [Beyond Kin Project — Method](https://beyondkin.org/a-method-to-document-enslaved-populations/)
- [Beyond Kin Project — Naming Conventions](https://beyondkin.org/beyond-kin-naming-conventions/)
- Wiki: [Evidence & Sources — Person Roles in Sources](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources#person-roles-in-sources)
- Wiki: [Frontmatter Reference — Source hierarchy](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#source-hierarchy)
- Wiki: [Frontmatter Reference — Ownership & Transfer Tracking](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#ownership--transfer-tracking)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+research-enslaved-ancestors%3A+

---

## Notes for review

- Length: ~970 words. Right at the cap; cuts available in step 5 (FAN paragraph could shorten if needed).
- No screenshots intentional — the workflow is mostly frontmatter + modal interactions already covered in companion guides. Adding captures here would duplicate.
- Step 6 documents a workaround pending #517. Once that ships, replace the workaround paragraph with the supported per-note exclusion property.
- The Hardwick packet is the running example throughout, matching the existing `source_parent` example in the Frontmatter Reference wiki — continuity for readers who landed there first.
