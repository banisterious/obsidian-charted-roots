# FAQ — stub

**Target page:** `/faq/_index.md` (new) on chartedroots.com
**Status:** 📋 Stub — Phase 3, non-urgent.

---

## Purpose

Common questions that come up in issues, discussions, and first-install experiences. Reduces support load and sets expectations for prospective users.

---

## Candidate questions (needs culling from actual discussions)

Drawn from recurring themes in GitHub Discussions and issue triage. Exact wording and answers TBD during draft pass.

### Getting started

- **Can I use this without Obsidian?** → No — it's a plugin. But because it's all markdown + frontmatter, your data is portable if you ever leave Obsidian.
- **Do I need to know GEDCOM?** → No. GEDCOM is one of several import/export formats; you can also start from scratch or import from a CSV.
- **Will it work with my existing genealogy data?** → Full round-trip support for GEDCOM 5.5.1, GEDCOM X, Gramps XML, and CSV. Specific GEDCOM features supported listed on features page.

### Compatibility and safety

- **Will this mess with my vault?** → The plugin only touches files it creates or the files you explicitly edit through its modals. It doesn't scan or modify arbitrary notes.
- **Does it work on mobile?** → Partial — UI is responsive but some features (canvas tree generation, large reports) are desktop-only.
- **Is my data private?** → Data stays in your vault. The plugin has no network calls except for optional Wikipedia/Wikidata lookups and optional Calendarium integration, both explicit.

### Worldbuilding-specific

- **Can I use it for a fictional family tree?** → Yes — universes and fictional date systems make this a first-class use case. See [worldbuilding](/worldbuilding/) for the dedicated walkthrough.
- **Will my fictional dates break the math?** → The date service handles BBY/ABY-style eras including era crossings. See features page for current state.

### Relationship to other plugins

- **How does this compare to Plugin X?** → *[probably avoid direct comparisons; keep focused on what Charted Roots does]*
- **Does it work with Calendarium?** → Yes, with optional integration (read-only currently).

### Contributing / feedback

- **I found a bug — what do I do?** → File an issue on GitHub with a minimal reproducer.
- **I have a feature request.** → Post to GitHub Discussions; `post-1.0` is the usual label for non-blocking additions.

---

## Open questions

1. **Source the real questions** — before drafting answers, pull recurring themes from GitHub Discussions and from the Community Plugins review if it's generated any. The candidate list above is educated guessing.
2. **Length and depth** — short Q&A entries (2–3 sentences each) or longer explanatory answers with code/config snippets where relevant? Probably short-first; expand as needed.
3. **Page layout** — flat list, accordion, or grouped sections? Grouped sections (Getting started / Compatibility / Worldbuilding / etc.) likely easiest to scan.
