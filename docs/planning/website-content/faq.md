# FAQ — draft

**Target page:** `/faq/_index.md` (new) on chartedroots.com
**Status:** 🔶 In progress — draft complete, awaiting review.
**Source material:** [SECURITY.md](../../../SECURITY.md), wiki pages (FAQ, Privacy-And-Security, Getting-Started, Community-Use-Cases), recurring Q&A themes from [GitHub Discussions](https://github.com/banisterious/obsidian-charted-roots/discussions).

---

## Purpose

Marketing-forward FAQ for prospective users deciding whether to install. Short answers, heavy wiki linking for depth. Complements rather than duplicates the wiki FAQ (which is the reference for "how do I do X"), Community-Use-Cases (scenario walkthroughs), and SECURITY.md (the definitive privacy and security policy).

---

## Structure

Five sections, 19 questions total. Each answer one to two sentences plus a link.

1. **Getting started** (4) — what is it, do I need to code, install, free
2. **Will it work for my situation?** (4) — existing data, mobile, both audiences, "right for me" teaser
3. **Privacy and data** (5) — local storage, network behavior, living persons, SSN protection, sharing publicly
4. **Common how-to's** (4) — marriages, adopted/step, DNA, fictional dates
5. **Getting help** (2) — docs, bugs and feature requests

---

## Draft content

Everything below this line is intended as the website page body. Hugo frontmatter (`title`, `description`, `date`, etc.) is added during the port.

---

Common questions about Charted Roots. For detailed how-to's beyond what's here, see the [wiki FAQ](https://github.com/banisterious/obsidian-charted-roots/wiki/FAQ). For scenario-specific walkthroughs, see [Community Use Cases](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases).

## Getting started

### What is Charted Roots?

An Obsidian plugin that turns structured genealogical data in your markdown notes into family trees, maps, reports, and evidence-tracked research. Works for both real-world genealogy and fictional worldbuilding.

### Do I need to know how to code?

No. The plugin stores data in YAML frontmatter in your markdown notes, a simple key-value format. If you can write `name: John Smith`, you can use Charted Roots.

### How do I install it?

Open Obsidian's Community Plugins, search for **Charted Roots**, then click Install → Enable. That's it.

For early access to releases before they reach the directory, use [BRAT](https://github.com/TfTHacker/obsidian42-brat) and add `banisterious/obsidian-charted-roots` as a beta plugin. [Full install guide →](https://github.com/banisterious/obsidian-charted-roots/wiki/Getting-Started#installation)

### Is it free?

Yes. MIT-licensed and free to use. Donations are welcome via [Buy Me a Coffee](https://buymeacoffee.com/banisterious) or [GitHub Sponsors](https://github.com/sponsors/banisterious) but never required.

## Will it work for my situation?

### Can I use my existing genealogy data?

Yes, if your existing tool can export to GEDCOM, GEDCOM X, Gramps XML, or CSV. Ancestry, FamilySearch, MyHeritage, Legacy Family Tree, Gramps, and most genealogy software export to one of these. [Import workflows for specific sources →](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases)

### Does it work on mobile?

Partial. The plugin UI is responsive and core features work on mobile, but some operations (canvas tree generation, large reports) are desktop-only.

### Is it for genealogy, worldbuilding, or both?

Both. The same entity types (people, places, events, sources, organizations) work for either use case. See the [research track](/research/) for evidence-based genealogy workflows and the [worldbuilding track](/worldbuilding/) for fictional universes.

### Is Charted Roots right for me?

Depends on your comfort with Obsidian and YAML frontmatter. The wiki has an honest treatment of who thrives with Charted Roots, who finds it overwhelming, and what the alternatives are. [Full discussion →](https://github.com/banisterious/obsidian-charted-roots/wiki/FAQ#is-charted-roots-right-for-me-do-i-need-to-be-technical)

## Privacy and data

### Where is my data stored?

Entirely in your local Obsidian vault as plain-text markdown files. No cloud, no external services, no syncing unless you've configured Obsidian Sync or another sync tool yourself.

### Does the plugin connect to the internet?

Not as part of core operations. Data is never transmitted to the network. Optional features like Nominatim geocoding and Wikipedia or Wikidata place lookups are explicit user actions, not background behaviors. [Security policy →](https://github.com/banisterious/obsidian-charted-roots/blob/main/SECURITY.md)

### How does it handle living-person data?

Living-person protection is built in. The plugin auto-detects potentially living persons (no death date, born within a configurable threshold, default 100 years) and can display them as "Living", "Private", initials, or hide them entirely on generated canvases and in exports. You can also mark anyone explicitly with `cr_living: true` or `false` to override the automatic detection. [Privacy guide →](https://github.com/banisterious/obsidian-charted-roots/wiki/Privacy-And-Security#privacy-protection-for-living-persons)

### Are Social Security Numbers and identity numbers protected?

Yes. SSNs and national identity numbers are always excluded from GEDCOM, GEDCOM X, Gramps XML, and CSV exports regardless of other privacy settings. The redaction is hardcoded, not a configurable toggle.

### Can I share my tree publicly while protecting living relatives?

Yes. Privacy-aware exports can anonymize living persons across all supported formats. Family structure stays intact so the tree remains useful for sharing; personal details on living relatives are stripped. [Privacy in exports →](https://github.com/banisterious/obsidian-charted-roots/wiki/Privacy-And-Security#privacy-in-exports)

## Common how-to's

### How do I handle multiple marriages or divorces?

Indexed spouse properties (`spouse1`, `spouse1_marriage_date`, `spouse2`, and so on) let you record any number of marriages with dates, divorces, and source attribution. [Multiple marriages →](https://github.com/banisterious/obsidian-charted-roots/wiki/FAQ#how-do-i-handle-multiple-marriages)

### How do I handle adopted or step relationships?

Dedicated frontmatter fields for adoptive and step parents with distinct line styles on canvas trees. Both adoptive and step relationships round-trip through the Edit Person modal. [Relationship tools →](https://github.com/banisterious/obsidian-charted-roots/wiki/Relationship-Tools)

### Can I track DNA matches?

Yes, via an opt-in feature. When enabled, person notes can be flagged as DNA matches with shared cM, testing company, kit ID, and match type. Designed to complement specialized tools like DNAPainter, not replace them. [DNA tracking case study →](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases#tracking-dna-matches)

### What about fictional dates like BBY/ABY or Tolkien's Third Age?

Built-in support for fictional date systems including the Galactic Standard Calendar used in Star Wars. You can also define your own calendars with custom eras, abbreviations, and zero points. [Worldbuilding track →](/worldbuilding/)

## Getting help

### Where's the documentation?

The [GitHub wiki](https://github.com/banisterious/obsidian-charted-roots/wiki) has detailed guides for every feature area. [Community Use Cases](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases) has case studies for specific scenarios ranging from "migrating from Ancestry" to "building a TTRPG dynasty."

### How do I report a bug or suggest a feature?

Bugs go in [GitHub Issues](https://github.com/banisterious/obsidian-charted-roots/issues) with a reproducer when possible. Workflow questions and feature discussions go in [GitHub Discussions](https://github.com/banisterious/obsidian-charted-roots/discussions).

---

## Open questions

1. **"Is Charted Roots right for me?"** — current approach is a one-line teaser linking to the wiki's longer, honest treatment. Alternative: paraphrase a shorter version in the marketing voice. Current approach preserves the wiki version's tone, which is worth more than a shorter copy.
2. **Question count.** 19 questions in five sections feels right for a prospect-level FAQ. Could trim one or two from the how-to's section if it reads long during port.
3. **Anchor links to the wiki FAQ.** Several answers link to specific anchors on the wiki FAQ (e.g., `#how-do-i-handle-multiple-marriages`). Those anchors exist today. If the wiki FAQ gets restructured in the future, those links should be audited.
