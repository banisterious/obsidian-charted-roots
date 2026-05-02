---
title: "I want to analyze FAN clusters to break through a brick wall"
description: Use source roles to track Friends, Associates, and Neighbors across documents, then run the Sources by Role report to surface community networks that lead through brick-wall ancestors.
track: research
difficulty: advanced
time_estimate: ~30+ min for the first cluster; ongoing as more sources accrue roles
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to analyze FAN clusters to break through a brick wall

Use this when an ancestor's direct paper trail has gone cold and you need to widen the search to the people they appear next to in records — witnesses on a deed, bondsmen on a marriage license, sureties on a court filing, neighbors on a census, fellow buyers at an estate sale. The FAN principle (Friends, Associates, and Neighbors) holds that genealogical brick walls usually break by tracing the people *around* the ancestor, not the ancestor directly. By the end of this guide, you'll have FAN-relevant roles captured on at least one source document and a Sources by Role report showing every record where a person of interest appears in any capacity.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- A few source notes covering the same person, family, or community. The denser the overlap, the more useful the analysis. A handful of deeds, a marriage license, and a probate document is plenty to start.
- A specific brick-wall question to anchor the work — "who were Sarah's parents?" or "where did James come from before 1840?" — rather than open-ended cluster building.

## Steps

### 1. Inventory FAN-relevant roles on existing source notes

Open the source notes you have for the brick-wall ancestor and the immediate family. For each, identify everyone named in the document who isn't a principal subject. The seven canonical role categories cover most cases:

| Role property | Use for |
|---|---|
| `principals` | Subject(s) of the document |
| `witnesses` | Signing witnesses, event witnesses |
| `informants` | Death certificate informants, census respondents |
| `officials` | Clerks, judges, officiants, appraisers, bondsmen |
| `enslaved_individuals` | Persons listed as property in pre-emancipation records |
| `family` | Family members of principals |
| `others` | Buyers at sales, neighbors, anyone not fitting above |

A marriage license naming the bride, groom, two witnesses, the bondsman, and the officiant is five FAN data points on one document.

### 2. Add the roles via YAML or the modal

Either edit frontmatter directly:

```yaml
principals:
  - "[[James Cooper|James Cooper (Groom)]]"
  - "[[Sarah Anderson|Sarah Anderson (Bride)]]"
witnesses:
  - "[[Thomas Brown|Thomas Brown (Witness)]]"
  - "[[William Anderson|William Anderson (Witness, brother of bride)]]"
officials:
  - "[[Reverend John Wilson|Rev. John Wilson (Officiant)]]"
  - "[[Henry Cooper|Henry Cooper (Bondsman, father of groom)]]"
```

— or open the source via Edit Source, expand the **Person roles** section, and add each person through the picker. The modal writes to the same frontmatter arrays. Use the wikilink display text (`(Witness, brother of bride)`) to capture the role detail you'll want when reading the report later.

### 3. Create person notes for FAN members as you encounter them

A FAN cluster is only useful if the people in it are nodes you can query. The bondsman on a marriage license might be a stub note today (`name`, `cr_type: person`, nothing else) and a fully researched person tomorrow when you discover he's the bride's uncle. Stub notes are fine — they let the wikilinks resolve and give the Sources by Role report something to find.

### 4. Run the Sources by Role report

Control Center → People tab → select the brick-wall person → **Generate report** → **Sources by Role**.

Configure the report:

- **Person** — your brick-wall ancestor, or a likely-FAN member you want to investigate.
- **Role filter** — leave on "All roles" the first time. Narrow later (e.g., "only witnesses") once you know what you're looking for.
- **Group by** — `Role` for the first pass (shows all the contexts a person appears in); switch to `Chronological` to see how their network evolved over time.
- **Show role details** — on. The role detail in the wikilink display text is the most useful column.

Run it for each candidate FAN member who keeps recurring across your sources. Patterns emerge fast: the same surname appearing in three unrelated documents is a research lead.

### 5. Cross-reference with the relationship overlay

If you've defined custom relationships (godparent, business partner, neighbor, witness-relationship), the relationship system records non-family connections explicitly. Combined with the Sources by Role report, you can see both *documented co-occurrence* (the role report) and *asserted relationships* (the overlay) for the same person.

### 6. Follow the strongest signal

A FAN cluster is research input, not output. The report tells you *who* keeps appearing alongside your ancestor; the next step is researching *those* people directly — their parents, their migration paths, their land transactions — for the link back to your brick-wall ancestor. That's where the actual genealogy happens.

## Variations

- **Single-source FAN extraction.** A 1850 census page lists 30+ neighbors. Add them as `others` on the page-as-source note. Even without further work, the page becomes a queryable cluster.
- **Probate-packet FAN density.** Estate inventories, sale bills, and advancements each name many people. See [the enslaved-ancestors guide](research-enslaved-ancestors) — the same source-roles substrate handles both Beyond Kin and FAN analysis, and the two converge in pre-emancipation records.
- **Bases for FAN exploration.** A Sources base filtered by `contains(witnesses, "[[Person]]")` (or by formula: `contains(witnesses, "Person")`) gives an ad-hoc, interactive view. Useful when you want to scan rather than generate a formal report.
- **DataView for one-off queries.** `TABLE title, date FROM "Sources" WHERE contains(witnesses, "[[Henry Cooper]]")` for quick lookups outside the report system.
- **Bondsman-and-surety focus.** Marriage bonds and court bonds frequently name the closest male relatives of the principal — fathers, brothers, brothers-in-law. A `Role filter: officials` report scoped to bonds is one of the highest-yield FAN passes for pre-1880 research.

## Related guides

- [I want to research enslaved ancestors (Beyond Kin methodology)](research-enslaved-ancestors) — same source-roles substrate, complementary methodology
- [I want to attach one source to multiple people](attach-one-source-to-multiple-people) — the linking pattern roles depend on
- [I want to track research progress on a long-term project](track-research-progress) — log what you tried and what came of it

## Reference

- Wiki: [Evidence & Sources — Person Roles in Sources](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources#person-roles-in-sources)
- Wiki: [Statistics & Reports — Sources by Role](https://github.com/banisterious/obsidian-charted-roots/wiki/Statistics-And-Reports#sources-by-role)
- Wiki: [Custom Relationships](https://github.com/banisterious/obsidian-charted-roots/wiki/Custom-Relationships)
- Elizabeth Shown Mills, "QuickLesson 11: Identity Problems & the FAN Principle" — historicalhandbook.com primer for the methodology

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+analyze-fan-clusters%3A+

---

## Notes for review

- Length: ~880 words.
- No screenshots — same reasoning as the enslaved-ancestors guide. Person Roles modal capture would duplicate Evidence-And-Sources wiki visuals.
- The Mills FAN reference at the bottom is bibliographic — site-external like the Beyond Kin links in the companion guide. Not load-bearing if a copy editor wants it cut.
- Step 5 mentions Custom Relationships as a complement; if that subsystem changes shape post-1.0, this paragraph may need a touch-up.
