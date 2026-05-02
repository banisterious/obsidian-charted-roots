---
title: "I want to organize a multi-document source collection"
description: Use the source_parent pattern to model probate packets, military pension files, and other multi-document record groups so individual documents stay independently citable but the collection holds together.
track: research
difficulty: medium
time_estimate: ~15-30 min for the first collection
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to organize a multi-document source collection

Use this when a single source-name doesn't capture what you're working with. A probate packet might span a will, an inventory, an appraisement, an advancement, a sale bill, and a final settlement — six documents in one record group, each with its own date, its own information, its own citation needs. Likewise for military pension files (application + supporting affidavits + Bureau correspondence), Civil War service records, multi-page census enumerations, and court case files. By the end of this guide, you'll have a parent source representing the collection, child source notes for each component document, and a structure that lets you cite individual documents while preserving the relationship to the collection as a whole.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- A real multi-document collection to model. Probate packets are the classic case; the same pattern applies to any record group where the parts are independently citable but the whole has a name.
- A folder convention you're comfortable with. The `source_parent` pattern is folder-agnostic but most users find a per-collection subfolder helpful.

## Steps

### 1. Decide if you need a parent source

Not every multi-document situation needs the parent/child treatment. Use the pattern when:

- The documents share a **bibliographic identity** (same case file, same probate packet, same pension claim) that you'd cite as a unit in EE-style notation.
- The documents have **dependencies** (an appraisement is meaningless without knowing whose estate it appraises) that the parent makes obvious.
- You want **backlinks from the children to the collection** so that opening any one document gets you to the others.

Skip the pattern when the documents are independently meaningful and only loosely related — e.g., three different census records on the same family aren't a "collection," they're three sources.

### 2. Create the parent source note

Right-click your sources folder → **New sources base from template**, or use the Create Source modal. Frontmatter for a probate packet:

```yaml
cr_type: source
cr_id: src_hardwick_probate_packet
title: "William H. Hardwick Probate Packet (1863–1870)"
source_type: probate
source_repository: "York County, South Carolina, Probate Court"
source_date: "1863-1870"
```

Two practical conventions:

- **Title the parent for what the collection *is***, not what it contains. "William H. Hardwick Probate Packet" beats "Hardwick Will + Inventory + Sale Bill." The contents will change as you discover new documents; the identity won't.
- **Date the parent as the span**, not as a single date. The component documents have their own specific dates; the parent reflects the bracket.

The parent doesn't need full citation detail — its role is to anchor the collection. Citation detail lives on the children.

### 3. Create child source notes for each component document

For each document in the collection, create a separate source note and link it to the parent via both `source_parent` and `source_parent_id`:

```yaml
cr_type: source
cr_id: src_hardwick_appraisement_1864
title: "Hardwick Estate Appraisement (1864)"
source_type: probate
source_date: "1864-03-15"
source_repository: "York County, South Carolina, Probate Court"
source_parent: "[[William H. Hardwick Probate Packet (1863–1870)]]"
source_parent_id: src_hardwick_probate_packet
```

The dual-storage pattern (`source_parent` for Obsidian backlinks + `source_parent_id` for reliable resolution) is how Charted Roots handles all its hierarchical references. Always set both.

### 4. Cite the collection vs. cite a document

When you attach a source to a person via `sourced_*` arrays, source roles, or citation notes, attach the **specific child document**, not the parent. The parent is a structural anchor; it doesn't say anything about specific facts. The child documents do.

```yaml
sourced_appraised_value:
  - "[[Hardwick Estate Appraisement (1864)]]"
sourced_residence:
  - "[[Hardwick Will (1863)]]"
```

The parent backlink graph still gets you to the collection level any time you need it.

### 5. Construct citations layer by layer

Mills' Evidence Explained citation construction works naturally with the parent/child structure: the parent holds the **outer-most layer** (jurisdiction, court, record group), and the children inherit it. Children typically only need to add the document-specific layer (document type, date, page or item identifier).

For repositories that restate the jurisdiction in the inner layer (often because the parent reference uses an older jurisdictional name — *York District* historically vs. *York County* now, *Court of Ordinary* vs. *Probate Court*), do restate. Layer 2 redundancy that's actually helpful is fine; redundancy that just repeats the parent verbatim isn't.

### 6. Verify the structure holds

Open the parent source note. The Obsidian backlinks panel should list all child documents. Open a child; the `source_parent` wikilink should resolve back to the parent. The full collection is now navigable from any entry point.

If you're using Bases, a Sources base filtered by `source_parent contains "Hardwick"` gives you a one-shot view of the entire collection.

## Variations

- **Census enumeration districts.** Model the district as parent, individual pages as children. Children inherit the district's enumerator, date, and jurisdiction; they add page number and household identifier. Particularly useful when working a neighborhood for FAN context.
- **Military pension files.** Pension claim as parent; application, affidavits, surgeon's certificate, Bureau correspondence as children. The application's citation references the claim number; child documents cite the same claim number plus the document-specific identifier.
- **Court case files.** Case file as parent; complaint, depositions, exhibits, judgment as children. Children share the case caption and number; they add the filing-specific detail.
- **Compiled service records (CSRs).** Service record jacket as parent; component cards (muster rolls, prisoner records, etc.) as children. Less common to model this granularly unless you're doing close military-unit work.
- **Multi-volume published sets.** A multi-volume genealogy or local history as parent; specific volumes as children. Mostly useful when you cite multiple volumes from the same set; otherwise overkill.

## Related guides

- [I want to research enslaved ancestors (Beyond Kin methodology)](research-enslaved-ancestors) — probate packets are the canonical use case for this pattern in pre-emancipation research
- [I want to attach one source to multiple people](attach-one-source-to-multiple-people) — child documents typically attach to many people in the family group
- [I want to set up per-fact source citations](set-up-source-tracking) — `sourced_*` arrays attach to children, not parents

## Reference

- Wiki: [Frontmatter Reference — Source hierarchy](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#source-hierarchy)
- Wiki: [Evidence & Sources](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)
- Elizabeth Shown Mills, *Evidence Explained* (4th ed., 2024) — citation layering across record groups

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+organize-multi-document-source-collections%3A+

---

## Notes for review

- Length: ~960 words.
- The Hardwick fixture continues from the enslaved-ancestors guide; this guide generalizes that example to non-Beyond-Kin uses (military, court, census). Cross-link is bidirectional.
- Step 5's "York District vs. York County" callout is verbatim from ANYroots' citation refinement in #275 follow-ups; concrete jurisdictional-name change examples are hard to invent from scratch and Mills cites this exact case.
- No screenshots — the workflow is mostly frontmatter editing and modal use already covered visually elsewhere.
