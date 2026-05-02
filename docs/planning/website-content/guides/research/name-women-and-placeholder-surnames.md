---
title: "I want to track married women and placeholder surnames consistently"
description: Use maiden_name, married_names, and a personal placeholder convention to keep women searchable under both maiden and married surnames, and to handle unknown surnames without losing the person.
track: research
difficulty: easy
time_estimate: ~10 min to set the conventions; ongoing as you enter people
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to track married women and placeholder surnames consistently

Use this when you've hit one of two common research problems: married women who effectively disappear from surname-scoped queries because they're filed under their husband's name, or people whose surnames you don't yet know but who can't just be omitted from your tree. By the end of this guide, you'll have a consistent way to handle both, with `maiden_name` and `married_names` populated for women whose marriages are documented, plus a placeholder convention you can apply across Beyond Kin research, one-name studies, and ordinary unknown-surname cases.

## What you'll need

- Charted Roots **v0.22.17 or later**.
- A vault with at least a few women whose surname situation you've been working around. The fix is per-person, but the conventions are vault-wide.
- A decision about your placeholder character (this guide uses `~` as a worked example, but it's your call — see step 4).

## Steps

### 1. Use `maiden_name` for the birth surname

For any woman whose birth surname differs from her current `name`, set `maiden_name` in the frontmatter:

```yaml
cr_type: person
name: "Sarah Cooper"
maiden_name: "Anderson"
```

Now Sarah is searchable under both surnames. A Bases query filtered by `surname = "Anderson"` (or by formula) will catch her even though she's filed under Cooper.

`maiden_name` is the GEDCOM-aligned property and the default for genealogy import/export. Use it consistently — partial coverage is worse than none, because users who see *some* maiden names assume the absence elsewhere is meaningful.

### 2. Use `married_names` for one or more married surnames

For women who married more than once, the `married_names` array tracks all of them:

```yaml
cr_type: person
name: "Sarah Cooper"
maiden_name: "Anderson"
married_names:
  - "Cooper"
  - "Bryant"
```

This is also worth setting when the woman is filed under maiden name (some users prefer that) — `married_names` then becomes the searchable record of her marriage history.

### 3. Decide your filing convention and stay consistent

Two common conventions:

- **File under maiden name** (`name: "Sarah Anderson"`, `married_names: ["Cooper"]`) — keeps siblings together in alphabetical views, makes generation-spanning surname studies natural. Common in academic genealogy.
- **File under married name** (`name: "Sarah Cooper"`, `maiden_name: "Anderson"`) — matches how most documents name her after marriage, easier for users coming from family-tree software with this convention.

Either works. Pick one and apply it across the vault. Mixing produces confusing alphabetical views and harder mental modeling.

### 4. Pick a placeholder convention for unknown surnames

When you know a person exists (they're named in a record, they're a parent on a vital record) but you don't know their surname, you have three options:

- **Use `[Unknown]` as the surname** — `Mary [Unknown]`. Standard in published genealogy. Verbose but unambiguous.
- **Use a single character marker** — `Mary ~` or `Mary _`. Compact, sortable, distinguishes "I don't know" from "no surname applicable."
- **Use no surname** — `Mary` alone. Cleanest visually but conflates unknown-surname with name-as-given (saints, mononymic figures, enslaved persons in pre-emancipation records).

For Beyond Kin research, where surnames are typically not recorded for enslaved persons in pre-emancipation documents, the third option is often the right one (see [the enslaved-ancestors guide](research-enslaved-ancestors)). For everyday "we know she existed but the marriage record doesn't give her surname" cases, a placeholder marker is more practical.

This guide uses `~` as the worked example because it sorts adjacent to alphabetical names and is visually distinctive. Pick yours and document it for your future self.

### 5. Handle "married woman whose surname tracks her family" cases

Some communities and some periods recorded a woman's married surname with a marker showing it's *acquired*, not maiden. One workable pattern: store the woman as `Sarah Smith~` where the trailing marker means "this surname is married, not maiden." It keeps her sortable with other Smiths in alphabetical views (which is where her in-laws are filed) but visually distinct from women born to the surname.

This is a personal convention, not a built-in feature. Document it in a vault README or a properties stub note so it's discoverable later. The frontmatter shape stays standard:

```yaml
name: "Sarah Smith~"
maiden_name: "Anderson"
married_names:
  - "Smith"
```

The `~` only appears in `name`; the structured fields stay clean.

### 6. Handle the "Normalize name formatting" interaction

The Data Quality "Normalize name formatting" operation may flag entries using personal placeholder conventions (`Mary ~`, `Sarah Smith~`) as needing standardization. The operation is interactive — it shows a preview of every change before applying. **Uncheck** entries that use your placeholder conventions before clicking Apply. Per-note exclusion is tracked in [#517](https://github.com/banisterious/obsidian-charted-roots/issues/517) but not yet shipped; until then, the manual unchecking is the workaround.

## Variations

- **One-name studies.** A one-name study tracks every person who ever held a particular surname, including women who married into it. Use `married_names` to make in-marrying women queryable: a Bases filter on `married_names contains "Smith"` catches them even when they're filed under maiden name.
- **Beyond Kin (enslaved ancestors).** Pre-emancipation enslaved persons typically appear in records by given name only. Some practitioners use the slaveholder's surname in parens — `Mary (Hardwick)` — as a disambiguator, others use no surname. See the dedicated [Beyond Kin guide](research-enslaved-ancestors) for the methodology.
- **Step-relations and adoptive surnames.** People who took a stepfather's or adoptive parent's surname can be tracked the same way as remarriage cases — `name` for current, `maiden_name` for birth, `married_names` for any in-between.
- **Reclaimed surnames.** Modern "I went back to my maiden name after divorce" cases work with the same property set; the `married_names` array becomes a historical record.
- **Patronymics.** Cultures that historically used patronymics (Icelandic, pre-1900 Russian, Welsh) need their own conventions; the tools above help but the cultural-naming patterns are out of scope for this guide.

## Related guides

- [I want to research enslaved ancestors (Beyond Kin methodology)](research-enslaved-ancestors) — placeholder conventions overlap heavily
- [I want to filter and analyze my data with Bases](use-bases-for-data-analysis) — for the surname-scoped queries that depend on `maiden_name` / `married_names` being populated

## Reference

- Wiki: [Frontmatter Reference — Name Components](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference#name-components)
- Beyond Kin Project — [Naming Conventions](https://beyondkin.org/beyond-kin-naming-conventions/)
- Guild of One-Name Studies — guidance on tracking female-line variants

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+name-women-and-placeholder-surnames%3A+

---

## Notes for review

- Length: ~990 words.
- Difficulty marked `easy` because the tools are all simple frontmatter, even though the *decision-making* (which convention to adopt) is the hard part. The guide reflects that asymmetry.
- The `~` convention attribution is intentionally soft ("this guide uses `~` as the worked example because…") — it's a personal pattern from the digest, not a recommended Charted Roots default. Users adopting it are choosing it; the guide doesn't prescribe.
- Step 6 documents the same #517 workaround as the enslaved-ancestors guide; both will need updating once that ships.
