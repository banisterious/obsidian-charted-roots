# Guides — Plan

**Target placement:** New top-level `/guides/` section on chartedroots.com, with `/guides/research/` and `/guides/worldbuilding/` subsections matching the existing track pages. Each guide is a single recipe-style workflow article.
**Status:** 🟢 Phases 1 + 2 complete — 29 guides live at chartedroots.com/guides/ (9 P0 shipped 2026-05-01, 20 P1 shipped 2026-05-02). Phase 3 (P2) opportunistic.

---

## Why

The Charted Roots documentation surfaces today are:

- **Wiki** — reference. Feature-by-feature. Answers "what does X do?"
- **Website /features/** — breadth showcase. Answers "what's in the plugin?"
- **Track pages** — audience-oriented narrative. Answers "why this plugin for genealogists / worldbuilders?"

What's missing is a **workflow-oriented** surface. A genealogist starting fresh doesn't know that "import GEDCOM → run cleanup wizard → set up source tracking → generate a Family Group Sheet" is a single workflow that touches four pages of the wiki. The features page lists capabilities; the wiki documents them; nothing draws threads together for the reader who has a specific outcome in mind.

Recipe-style guides fill that gap. Each guide answers a stated goal ("I want to..."), walks through the actual procedure, and points back to the wiki for deeper reference.

The plugin has been out long enough to have a real user base, so the guides need to cover the breadth of common workflows — not just newbie onboarding.

---

## URL structure and IA

```
/guides/                       — landing index (both tracks visible, brief blurb each)
/guides/research/              — research-track index
/guides/research/<slug>/       — individual recipe
/guides/worldbuilding/         — worldbuilding-track index
/guides/worldbuilding/<slug>/  — individual recipe
```

**Cross-references between guides** use the slug-based URL above. Cross-references **into the wiki** use the absolute GitHub wiki URL (per the website-content-refresh's link conventions).

**Discoverability:**

- The site nav drops "Documentation" as a standalone top-level item and gains a **"Docs ▾" dropdown** containing — in this order — **Guides**, Documentation, FAQ, Changelog. Guides goes at the top of the dropdown because for most readers it's the more actionable entry point ("I want to do X" beats "let me read the reference"). Documentation sits second for users who know what they're looking for. FAQ and Changelog round out the dropdown as reference-y items that don't need top-level real estate.
- After the consolidation, the visible nav reduces to: Features · Research · Worldbuilding · Docs ▾ · GitHub icon · Search icon. Three top-level destinations, one dropdown, two icons.
- The track pages (research-track, worldbuilder-track) link out to their respective guides indexes via prominent in-page CTAs, separate from the nav.
- Individual feature sections on `/features/` link to relevant guides at the bottom (e.g., "Family Chart View" features section links to "Generate a printable family tree").

**Adjacent nav work** (out of scope for the guides plan itself, but blocks the Docs-dropdown landing cleanly at typical desktop widths): the chartedroots.com Blowfish theme currently renders both a logo image and the site title text in the brand area, producing a visible "Charted Roots Charted Roots" duplicate that consumes ~12 chars of horizontal space. Pick one — recommended: keep the logo, drop the duplicated title text. Frees enough room for the Docs dropdown to fit without crowding. To be addressed during the website session that scaffolds `/guides/`.

**Index page shape (curated start-here, with track headers):**

The `/guides/` landing page is split into two track sections (Research and Worldbuilding). Each track has:

- A **start-here block** at the top: 3-5 hand-picked guides that cover the most common first-week workflows for that track. One sentence per guide explaining what it gets you (sourced from the guide's `description` frontmatter — no extra authoring).
- A **full catalog** below the start-here, listed in a flat alphabetical or thematic group, every guide with title + one-line description.

This shape is what most recipe-style sites converge on (NYT Cooking, Serious Eats). It solves three things simultaneously: newbie discovery (start-here), track separation (headers), and browsability (full catalog). Authoring overhead is minimal — the start-here picks ARE the P0 list.

---

## Recipe template

Every guide follows the same structure so readers know what to expect.

```markdown
---
title: "I want to <goal>"
description: <one-line summary>
track: research | worldbuilding
difficulty: easy | medium | advanced
time_estimate: ~5 min | ~15 min | ~30+ min
last_reviewed: 2026-MM-DD
relevant_releases: 0.22.x  # the version(s) this guide was written against
---

# <Guide title>

<One-paragraph framing: who this is for, what success looks like, what the
endpoint of the workflow is. Sets the reader's expectations in 2-3 sentences.>

## What you'll need

- <Prerequisite, e.g., a GEDCOM file>
- <Setting that needs to be enabled, e.g., trackFactSourcing>
- <Optional but recommended, e.g., the Web Clipper extension>

## Steps

### 1. <First major step>

<Procedure. Use bold for clickable elements ("**Settings → Research →
Enable fact-level source tracking**"). Use code blocks for frontmatter
or commands. Inline screenshots only where they're load-bearing.>

### 2. <Second major step>

<...>

### 3. <Final step / verification>

<How to confirm the workflow worked.>

## Variations

- **If <variant condition>**: <how to adapt>
- **If <another variant>**: <how to adapt>

## Related guides

- [Other guide that builds on this one](slug)
- [Alternative workflow](slug)

## Reference

- [Wiki: <relevant page>](wiki-url)
- [Wiki: <another page>](wiki-url)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*
```

The `[issue-link]` resolves to a GitHub new-issue URL with the title pre-filled (`[Guides] <slug>: `) and the `guides` label baked in. Discussions are not used for guide feedback — issues are more actionable (closeable, assignable) and the plugin already has a healthy issue-driven feedback culture. A single `guides` label keeps reports in one place.

**Authoring rules:**

- **Length cap: 1000 words.** Anything longer is two guides, or it's a wiki page in disguise.
- **Screenshots only where load-bearing.** Text-heavy guides age better than screenshot-heavy ones. Use a screenshot when a visual orientation point is genuinely needed (e.g., "the Cleanup Wizard tile grid looks like this") rather than when the procedure could be described in prose.
- **No marketing voice.** Same conventions as `website-content-refresh.md`: no em-dashes, no adjective triads, no "seamless" / "comprehensive" / "robust."
- **Speak in the second person.** "You'll see..." rather than "The user will see..."
- **Real fixture data where possible.** Reuse the Andersons / Royal Families / Dying Earth / Gaean Reach fixtures the rest of the docs already use. Continuity helps readers who've seen the screenshots elsewhere recognize the data.
- **Difficulty + time-estimate together** are how readers judge "is this for me." Difficulty captures prerequisite knowledge (easy = no prior plugin experience needed; medium = comfortable with one major area; advanced = touches multiple subsystems or edge cases). Time-estimate captures commitment. Pair both in the frontmatter — neither alone tells the full story.
- **Write i18n-friendly.** Avoid idioms, keep sentences short, define jargon on first use. A future translation pass would be cheaper for it. Costs nothing to write clearly today.

---

## Guide enumeration

Comprehensive list. Tier indicates ship priority (P0 ships first, P2 fills out the catalog). Slug is the URL fragment.

### Research track

| Slug | Title | Tier |
|---|---|---|
| `import-gedcom-and-cleanup` | I want to import a GEDCOM file and clean up the result | ✅ 2026-05-01 |
| `add-first-person-manually` | I want to add my first person from scratch | ✅ 2026-05-01 |
| `set-up-source-tracking` | I want to set up per-fact source citations | ✅ 2026-05-01 |
| `generate-printable-family-tree` | I want to generate a printable family tree | ✅ 2026-05-01 |
| `find-and-merge-duplicates` | I want to find and merge duplicate persons | ✅ 2026-05-01 |
| `clip-a-source-from-the-web` | I want to capture a source from a website | ✅ 2026-05-02 |
| `attach-one-source-to-multiple-people` | I want to attach one source (e.g., a census record) to multiple people | ✅ 2026-05-02 |
| `migrate-from-family-tree-maker` | I want to migrate from Family Tree Maker | ✅ 2026-05-02 |
| `migrate-from-ancestry` | I want to migrate from Ancestry | ✅ 2026-05-02 |
| `migrate-from-rootsmagic` | I want to migrate from RootsMagic | ✅ 2026-05-02 |
| `migrate-from-gramps` | I want to migrate from Gramps (with media) | ✅ 2026-05-02 |
| `map-an-ancestor-life` | I want to map an ancestor's life | ✅ 2026-05-02 |
| `generate-family-group-sheet` | I want to generate a family group sheet | ✅ 2026-05-02 |
| `assemble-family-history-book` | I want to assemble a family history book | ✅ 2026-05-02 |
| `add-new-family-member` | I want to add a new family member (e.g., a new baby) | ✅ 2026-05-02 |
| `delete-and-clean-up-references` | I want to delete a person and clean up references | ✅ 2026-05-02 |
| `generate-family-reunion-report` | I want to generate a family reunion report | ✅ 2026-05-02 |
| `onboard-non-technical-relative` | I want to help a non-technical family member get started | ✅ 2026-05-02 |
| `use-bases-for-data-analysis` | I want to filter and analyze my data with Bases | ✅ 2026-05-02 |
| `track-research-progress` | I want to track research progress on a long-term project | P2 |
| `write-a-proof-summary` | I want to write a proof summary for a contested fact | P2 |
| `handle-conflicting-evidence` | I want to handle conflicting evidence between two sources | P2 |
| `compare-migration-paths-across-siblings` | I want to compare migration paths across siblings | P2 |
| `print-wall-sized-pedigree` | I want to print a wall-sized pedigree | P2 |
| `generate-kinship-report` | I want to generate a kinship report between two people | P2 |
| `share-tree-with-non-obsidian-relative` | I want to share a family tree with a non-Obsidian relative | P2 |
| `track-dna-matches` | I want to track DNA matches and identify cousin relationships | P2 |
| `identify-research-gaps` | I want to identify which facts in my tree need more research | P2 |
| `set-up-staging-workflow` | I want to set up a staging workflow for messy imports | P2 |
| `research-enslaved-ancestors` | I want to research enslaved ancestors (Beyond Kin methodology) | P2 |
| `conduct-one-name-study` | I want to conduct a one-name study | P2 |
| `analyze-fan-clusters` | I want to analyze FAN clusters to break through a brick wall | P2 |
| `research-historical-figure` | I want to research a historical figure | P2 |
| `document-local-cemetery` | I want to document a local cemetery | P2 |
| `name-women-and-placeholder-surnames` | I want to track married women and placeholder surnames consistently | P2 |
| `organize-multi-document-source-collections` | I want to organize a multi-document source collection | P2 |
| `cite-jurisdictions-that-changed-over-time` | I want to construct citations for jurisdictions that have changed names | P2 |
| `modernize-legacy-genealogy-data` | I want to modernize inherited (pre-GPS) genealogy data | P2 |
| `transcribe-sources-with-ai-assistance` | I want to use AI assistance to transcribe and extract source data | P2 |

### Worldbuilding track

| Slug | Title | Tier |
|---|---|---|
| `create-fictional-universe` | I want to create a fictional universe | ✅ 2026-05-01 |
| `set-up-custom-calendar` | I want to set up a custom calendar with eras | ✅ 2026-05-01 |
| `build-fictional-family-tree` | I want to build a family tree for fictional characters | ✅ 2026-05-01 |
| `create-custom-image-map` | I want to create a custom map of my fictional world | ✅ 2026-05-01 |
| `use-built-in-calendar` | I want to use a built-in calendar (Middle-earth / Westeros / Star Wars) | ✅ 2026-05-02 |
| `link-drilldown-maps` | I want to link drilldown maps for regions | ✅ 2026-05-02 |
| `align-hand-drawn-map` | I want to align a hand-drawn map to coordinates | ✅ 2026-05-02 |
| `build-noble-house-with-succession` | I want to build a noble house with succession over generations | ✅ 2026-05-02 |
| `track-narrative-events` | I want to track narrative events alongside vital ones | ✅ 2026-05-02 |
| `compile-worldbuilding-bible` | I want to compile a worldbuilding bible from my notes | ✅ 2026-05-02 |
| `track-organizations-across-generations` | I want to track organizations across generations | P2 |
| `generate-timeline-of-events` | I want to generate a calendar-spanning timeline of events | P2 |
| `cross-genre-historical-fiction` | I want to track historical fiction (real + fictional people) | P2 |
| `share-universe-bible-with-collaborators` | I want to share my worldbuilding bible with collaborators | P2 |
| `manage-characters-for-creative-project` | I want to manage characters for a creative project (novel or TTRPG) | P2 |

**P0 totals:** 5 research + 4 worldbuilding = 9 guides.
**P1 totals:** 14 research + 6 worldbuilding = 20 guides.
**P2 totals:** 20 research + 5 worldbuilding = 25 guides.
**Grand total:** 54 guides if the catalog ships in full.

The P1 / P2 expansion incorporates community use cases sourced from `wiki-content/Community-Use-Cases.md`. New entries cover operational needs (add new family member, delete and clean up, family reunion report), supporter onboarding, Bases analysis, specialized research methodologies (Beyond Kin, one-name studies, FAN clusters), the historian persona (researching figures, cemeteries), and creative-project character management (collapses the novel + TTRPG cases into one guide with variations).

A second P2 expansion came from synthesizing GitHub threads from active power users (see `p2-guides-user-research-digest.md`). Five additional research-track guides cover naming conventions for married/placeholder surnames, multi-document source collections, citation construction across jurisdiction renames, modernizing inherited pre-GPS data, and AI-assisted source transcription. All five are research-heavy in source evidence; worldbuilding-track P2 expansion would need a different research source.

---

## Phase plan

### Phase 1 — P0 launch ✅ Shipped 2026-05-01

Nine P0 guides live at chartedroots.com/guides/. Established the `/guides/` section with both research and worldbuilding tracks populated, validated the recipe template across nine real workflows, and surfaced one defect during authoring (Merge Wizard CSS, fixed in #514).

**Why these nine:** the workflows that 80%+ of new users hit in their first week. Import + cleanup is the single most common first action; "add a person from scratch" covers the alternative starting path; source tracking + duplicate merging cover the most-asked "how do I" questions about evidence; "generate a printable tree" is the wow-moment people share. On the worldbuilding side, universe + calendar + tree + custom map are the four pillars of the worldbuilder workflow.

**Estimated effort:** ~9 hours of focused authoring (1 hour per guide on average, including screenshot capture for guides where one is load-bearing). Plus site-config work for the new section, nav entry, and index pages.

### Phase 2 — P1 fills ✅ Shipped 2026-05-02

All 20 P1 guides live. Highlights: four placeholder-closers from P0 cross-refs, four migration guides (FTM / Ancestry / RootsMagic / Gramps), the worldbuilding cluster (noble houses, narrative events, worldbuilding bible), the output cluster (family group sheets, family history books, reunion reports), and four operational / supporter guides from the Community-Use-Cases additions including the deliberately non-standard `onboard-non-technical-relative` meta-guide. One side-effect bug fix shipped during authoring (#516, Bases Spouse(s) column aggregation).

**Why this tier:** The migration guides serve users coming from competing tools (a real adoption channel). Web Clipper, source attribution, and family-history-book guides cover the depth of the research workflow. On the worldbuilding side, built-in calendars and drilldown maps cover the "I'm using this for a specific universe" use case.

### Phase 3 — P2 catalog (target: opportunistic)

Write P2 guides as user reports surface specific friction. No firm deadline; some may never need writing if user behavior shows the workflow isn't surfacing as a need.

---

## Per-guide authoring workflow

Each guide goes through:

1. **Outline** — bullet list of steps + prerequisites + variations. Posted as a draft for review.
2. **Draft** — full recipe markdown matching the template. Reviewed against the authoring rules.
3. **Screenshots** — captured if needed, optimized via `oxipng` (or `cwebp` fallthrough), stored under `docs/images/` per [media library convention](../../planning/archive/media-library-consolidation.md). Filenames `cr-guide-<slug>-<step>.png`.
4. **Port** — translated into the website's Hugo structure during a website session. Frontmatter added; nav entries wired up.
5. **Cross-link** — relevant `/features/` sections, wiki pages, and other guides updated with links to the new guide.
6. **Mark in this plan** — flip the tier table entry to ✅ Done with the deploy date.

Drafts live alongside this plan in `docs/planning/website-content/guides/` as plain markdown, organized as `research/<slug>.md` and `worldbuilding/<slug>.md`. The website session ports them.

---

## Maintenance

Guides go stale faster than reference docs because they're workflow-narrative ("click this, then that"). Wiki pages survive UI changes more cheaply because each describes one thing.

**Review cadence:**

- **On every MAJOR release** (1.0, 2.0): full audit of all guides. UI changes, command renames, settings relocations, new features that obsolete the old workflow — all need a sweep.
- **On MINOR releases that change a workflow surface** (e.g., a new modal, a moved menu item): targeted audit of guides that touch that surface. The `relevant_releases` frontmatter field on each guide makes the impact easy to scope.
- **On user reports** that a guide is wrong: priority fix, regardless of release cadence.

**Last-reviewed marker** — every guide carries a `last_reviewed` frontmatter date. Anything older than 6 months gets a banner: "This guide hasn't been reviewed since X. Recent UI changes may not be reflected." Soft signal to readers, not a hard block.

---

## Decisions log

Resolved before Phase 1 starts so authoring can begin without re-litigating:

- **Index page** — curated start-here list with track headers (see [URL structure and IA](#url-structure-and-ia) above for the spec).
- **Difficulty rating** — keep the three-level system (easy / medium / advanced), pair with `time_estimate` in frontmatter so readers see prerequisite knowledge and time commitment as separate dimensions. Revisit only if the catalog grows past P2.
- **Video supplements** — link out to existing chapters of the Phase 1 video tour where it covers a workflow. Do not re-record per-guide videos. Revisit later if the catalog stabilizes and a per-guide video supplement would add value beyond the existing tour.
- **Feedback channel** — "Suggest an edit" footer on every guide pointing at a GitHub issue (not Discussions), pre-filled with the `guides` label. Single channel, actionable, fits the plugin's existing feedback culture.
- **Translation / localization** — out of scope. The recipe-template authoring rules include an i18n-friendly bullet so prose style doesn't block a future translation pass; no further planning today.

---

## Source material pointers

For drafting:

- **[wiki-content/](../../../wiki-content/)** — feature reference. Most guides will pull procedure from these pages and condense.
- **[CHANGELOG.md](../../../CHANGELOG.md)** — release-anchored context for "this guide was written against version X" frontmatter.
- **[website-content-refresh.md](../website-content-refresh.md)** — voice / link / version conventions that apply to all website content, including guides.
- **[docs/images/](../../../docs/images/)** — capture library for screenshots. Many P0 guides can reuse existing captures from the v1 capture program.
- **[website-content/research-track.md](research-track.md) and [worldbuilder-track.md](world-builder-track.md)** — track narratives that frame each guide's audience.

---

## Related work

- **#511** (per-fact citations UI) — closed by 0.22.17. The `set-up-source-tracking` guide is the natural follow-through to that change.
- **website-content-refresh.md** — parent plan for the website content effort. This guides plan is a Phase 3 ("new content") item under that plan's structure.
- **Phase 1 video tour** — chapter deep-links into specific feature areas. Guides can cross-reference chapters where the existing tour covers the workflow in motion.
