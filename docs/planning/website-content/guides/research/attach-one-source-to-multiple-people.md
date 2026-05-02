---
title: "I want to attach one source to multiple people"
description: Link a single source note (census record, will, probate packet) to every person it names — naming each person's role within the document for FAN-network research.
track: research
difficulty: easy
time_estimate: ~5 min per source
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to attach one source to multiple people

Use this when a single document names multiple people — a census household, a probate packet that lists heirs, a marriage certificate naming witnesses, a slave schedule, or a family Bible page. By the end you'll have one source note linked to every person it documents, with each person's role within the source captured (principal, witness, informant, official, etc.) for FAN-network research and information-quality analysis.

## What you'll need

- A source note already created, or the materials to create one. See [I want to set up per-fact source citations](set-up-source-tracking) for source-note basics.
- The person notes the source names (or willingness to create them as you transcribe).

## Steps

### 1. Open the source note

Navigate to the source note. If you don't have one, create one via Control Center → Sources tab → Create source, or right-click a folder → **New sources base from template**.

### 2. List people in the body

The simplest way to link multiple people is in the source note's body. Add a section listing each person as a wikilink:

```markdown
## People in this record

- [[John Smith]] — Head of household
- [[Mary Smith]] — Wife
- [[Robert Smith]] — Son, age 12
- [[Alice Smith]] — Daughter, age 8
```

Charted Roots uses Obsidian's `resolvedLinks` to detect these connections automatically. Any wikilink from a source note to a person note counts — the person's profile will list this source.

### 3. Add structured roles via the modal

Body wikilinks work for basic linking, but for FAN-network research and information-quality analysis, add structured roles. Open the Edit Source modal (right-click → **Edit source**). Expand the **Person roles** section and click **Add person** for each role:

- **Principals** — subject(s) of the document (deceased on a death certificate, groom/bride on a marriage record).
- **Witnesses** — named witnesses who signed the document.
- **Informants** — person providing the information (the death-certificate informant who told the clerk what they knew).
- **Officials** — clerks, judges, officiants, physicians, justices of the peace.
- **Family** — named family members of principals.
- **Enslaved individuals** — persons listed as property in wills, inventories, appraisements.
- **Others** — catch-all for roles that don't fit above.

Pick the role category, select the person from the picker, and optionally add role details (e.g., "Administrator", "Heir") that show up in reports.

### 4. (Alternative) Edit roles in YAML

The modal writes to frontmatter arrays you can edit directly:

```yaml
---
cr_type: source
title: "Estate Inventory of John Smith Sr."
source_type: probate
date: 1817-03-15
principals:
  - "[[John Smith Sr.|John Smith Sr. (Decedent)]]"
officials:
  - "[[Thomas Brown|Thomas Brown (Administrator)]]"
  - "[[James Wilson|James Wilson (Appraiser)]]"
family:
  - "[[John Smith Jr.|John Smith Jr. (Heir)]]"
---
```

The display-text after `|` carries the role detail; the link target before `|` is the person note.

### 5. Verify

Open one of the linked person notes. The Sources section in the Entity Profile View shows the source. If you used structured roles, the Sources by Role report (Control Center → Reports) lists every source where this person appears in each role.

## Variations

- **Body-only linking.** Skip step 3 if you don't need role-level detail. The body wikilinks alone are enough for the source to appear on each person's profile.
- **Per-fact citations.** For per-fact source attribution (which fact each source supports), use sourced fields or citation notes — see [I want to set up per-fact source citations](set-up-source-tracking).
- **Multi-page records.** For records like census pages or tax rolls where you want to capture multiple families on the same physical page, name the source by enumeration district + page number rather than by surname (e.g., `1880-census_SC_Chester-ED37-p60`). Lets you link multiple families to the same source note.
- **Page-level granularity.** If you need to distinguish citations from page X vs page Y of the same source, create citation notes (one per page) and link those instead of attaching every reference to the parent source.

## Related guides

- [I want to set up per-fact source citations](set-up-source-tracking) — for fact-level granularity
- [I want to capture a source from a website](clip-a-source-from-the-web) — for sourcing the source
- [I want to analyze FAN clusters to break through a brick wall](analyze-fan-clusters)

## Reference

- Wiki: [Evidence & Sources — Person Roles in Sources](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources#person-roles-in-sources)
- Wiki: [Source Hierarchies](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources#source-hierarchies) — for parent/child source relationships

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+attach-one-source-to-multiple-people%3A+

---

## Notes for review

- The seven role categories are the load-bearing reference at step 3. Bullet list rather than a table since each entry needs more than one line of explanation.
- Body-only linking (Variation 1) is the lightest path; structured roles only matter for FAN research and Mills-style information analysis. Light vs deep is a real choice.
- Length: ~660 words.
