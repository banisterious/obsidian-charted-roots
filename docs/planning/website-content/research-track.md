# Research and Evidence Track Page — draft

**Target page:** `/research/_index.md` (new) on chartedroots.com
**Status:** 🔶 In progress — draft complete, awaiting review.
**Source material:** [docs/clipper-templates/CLIPPER-TEMPLATES.md](../../clipper-templates/CLIPPER-TEMPLATES.md), wiki content for Evidence-And-Sources and Research-Workflow, [features-refresh.md](features-refresh.md).

---

## Purpose

Long-form narrative for the research workflow. The sources subsystem, citation integration, Genealogical Proof Standard tracking, and data-quality tools all deserve more room than the main features page gives them. A dedicated topic page lets the workflow tell itself end-to-end.

Audience is anyone who cares about evidence-based claims: family historians building GPS-compliant cases, academic researchers, and worldbuilders tracking in-universe citations. The page is topic-centered (research workflow) rather than audience-centered (genealogy), so it parallels `/worldbuilding/` as a deep dive on a capability area, not an audience-gated track.

---

## Structure

Seven H2 sections in narrative order, opening frame as lead paragraph:

1. **Opening paragraph** — what the toolkit is for, why both audiences are served.
2. **Sources as first-class notes** — source entity, types, hierarchies, Mills classification.
3. **Capturing sources with the Web Clipper** — purpose-built templates, CSS vs LLM variants, landing clipped pages as source notes.
4. **Citations** — citation entity, page references, quality assessments, bidirectional sync with sourced fields.
5. **Genealogical Proof Standard workflow** — research level, gaps reports, conflict detection, research entity types.
6. **Evidence on entities** — `sourced_*` properties, attribution visibility, cross-entity support.
7. **Data quality tools** — duplicate detection, merge wizard, schema validation, cleanup wizard.
8. **Research-aware import and export** — comprehensive GEDCOM, Gramps, privacy-aware exports.

Example workflow (tracing a claim end-to-end with screenshots) is deferred. Worth adding later once the page settles and a real sample vault is captured.

---

## Draft content

Everything below this line is intended as the website page body. Hugo frontmatter (`title`, `description`, `date`, etc.) is added during the port.

---

In genealogy, a claim is only as good as the evidence behind it. Charted Roots treats evidence as a first-class part of the data model: sources are their own note type, with classification, hierarchy, citation metadata, and explicit links to the facts they support. The same structure works for worldbuilders tracking in-universe citations like gazetteers, chronicles, and character dossiers, so the research toolkit below applies across both audiences.

## Sources as first-class notes

A source in Charted Roots is a note with its own frontmatter, not a field on a person. Real-world sources have structure beyond "there was a birth certificate": a type, a provenance, specific pages, roles played by different people in the record.

Source types let you tag a source as a vital record, census page, will, church register, or any of a dozen other categories. The type controls how the plugin parses the source and renders it in reports.

Source hierarchies model multi-document record groups. A probate packet contains a will, an inventory, letters of administration, and distribution records. Each is a separate source note, linked to a parent with `source_parent: [[Probate of John Smith 1834]]`. The profile view shows child documents on the parent, the parent on each child, and sibling documents across the group.

Mills classification captures three questions genealogists ask about every source. Source type (original, derivative, authored narrative) describes what the document is. Information type (primary, secondary, undetermined) describes who provided the information. Evidence type (direct, indirect, negative) describes how the information relates to the research question. All three properties are optional; tag what you can, leave the rest alone. The classification is named after Elizabeth Shown Mills' *Evidence Explained*, the standard reference in US genealogy.

[Read more: Evidence and sources →](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)

## Capturing sources with the Web Clipper

Most genealogical sources live on the web first: Find a Grave memorials, FamilySearch records, Wikipedia biographies, Wikidata place entries. The Obsidian Web Clipper plugin turns a browser click into a vault note. Charted Roots ships templates that turn that note into a proper source with citation metadata already populated, not a generic markdown dump.

Available templates:

- **Find a Grave Person** for memorial pages. Captures name, dates, place, memorial ID, the link, and the photo when present.
- **FamilySearch Source** for indexed records and record collections. Captures repository, record type, date, and page reference.
- **Wikipedia Biography** for biographical articles. Extracts name, dates, place of origin, nationality, and notable claims.
- **Wikidata Place** for place entities. Captures coordinates, administrative hierarchy, and population where available.

Each template has two variants. The CSS variant uses page selectors for fast extraction and works well on structured pages with stable markup. The LLM variant is an extraction fallback for pages where selectors aren't reliable; you provide an API key for whichever model you prefer, and the template uses it to pull structured data from the page.

Clipped pages land as source notes ready to link. The citation metadata is already in place.

[Read more: Web Clipper Integration →](https://github.com/banisterious/obsidian-charted-roots/wiki/Web-Clipper-Integration)

## Citations

Citations in Charted Roots are a separate entity from sources. A source is the document; a citation is a specific reference to that document, at a specific page, for a specific fact. That separation matters when the same source supports multiple facts, each at a different page.

Citation metadata captures page references (`citation_page`) and quality assessments (`citation_quality`). Both survive GEDCOM roundtrip via the PAGE and QUAY sub-tags, so citations imported from or exported to other genealogy software stay intact.

The plugin keeps citation notes and `sourced_*` fields on entities in sync bidirectionally. Add a citation manually and the corresponding `sourced_birth_date` on the person gets set. Update a `sourced_*` field and the citation note reflects the change. A Source Summary report includes a Page column when the citations carry page references, so you can see which specific page of a census or register supported which claim.

[Read more: Evidence and sources →](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)

## Genealogical Proof Standard workflow

The Genealogical Proof Standard (GPS) is the evidence-evaluation methodology used in professional genealogy. Its five criteria call for reasonably exhaustive research, complete and accurate source citations, thorough analysis and correlation of evidence, resolution of conflicting evidence, and soundly reasoned written conclusions. Charted Roots surfaces each criterion as tracked data you can query.

Research level is a 0 to 6 scale running from "no research" (0) through "exhaustively researched, proof complete" (6). Each person, place, or event note can carry a research level. The plugin aggregates levels across a family for gap reporting.

Gaps reports list which claims lack supporting sources, sorted by priority. A gap is a person missing a birth-date source, a place missing geographic coordinates, or an event with participants but no witnesses. The report doubles as a work list and a completeness check.

Source conflict detection compares sourced claims across entities. When two sources disagree on the same fact (one says 1885, another 1887), the plugin flags the conflict so you can resolve it explicitly. Conflicts appear in the entity profile view and on the Statistics Dashboard.

Research entities give the workflow a home in the vault:

- `research_project` tracks a multi-phase research case.
- `research_report` captures an analytical document answering a specific research question.
- `individual_research_note` (IRN) sits between reports and person notes as per-person synthesis.
- `research_journal` handles daily or session-level tracking across projects.
- `research_log_entry` records individual logged actions as queryable notes.

Project statuses (open, in-progress, on-hold, completed) and report statuses (draft, review, final, published) let you see at a glance where each case stands.

[Read more: Research workflow →](https://github.com/banisterious/obsidian-charted-roots/wiki/Research-Workflow)

## Evidence on entities

Facts on person, place, event, source, and organization notes can be individually sourced. A person's birth date might come from one source, marriage from another, burial from a third. The `sourced_*` property family encodes that fine-grained attribution directly on the entity note.

The schema is simple: for a property called `X`, the corresponding attribution lives in `sourced_X` and points to a source or citation note. `sourced_birth_date`, `sourced_marriage_date`, `sourced_parents`, and so on for any fact worth tracking.

The Entity Profile View shows attribution visibility per fact. When you look at a person, you see `Birth: 1850` followed by the source as a clickable link rather than a bare year. The provenance is always one click away.

Attribution works across entity types. A place's coordinates, an event's date, or an organization's founding can all carry `sourced_*` pointers. Sources themselves can be sourced when a secondary source cites a primary one.

[Read more: Evidence and sources →](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)

## Data quality tools

Research works only if the data underneath stays trustworthy. Several tools help keep the vault coherent as it grows.

Smart duplicate detection uses fuzzy name matching and date proximity to surface people who might be the same person. The merge wizard resolves conflicts field by field: when two notes disagree on a birth year, you pick which value wins (or enter a third), and the plugin reconciles relationships on both sides automatically.

Schema validation lets you define required properties per entity type and run validation against notes matching each schema. A person without a birth date shows up as a missing-field issue. The validator surfaces everything the schema says should be present.

The 14-step post-import cleanup wizard handles what a fresh GEDCOM import typically brings in: date format normalization, gender code canonicalization, relationship reconciliation, place normalization, source deduplication, property aliasing. Each step is opt-in and previewable before changes commit.

Data quality issues surface continuously in the Statistics Dashboard: date inconsistencies, missing relationships, orphan references, schema violations. Drill-down lists let you address them in batches.

[Read more: Data quality →](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Quality)

## Research-aware import and export

A research vault is not just its current state. It is the accumulated record of every claim and every citation. Import and export matter because they determine how much of that record survives when you move data in or out.

GEDCOM 5.5.1 import and export preserve 16+ additional fields that older implementations often drop: name components (NPFX, NSFX, SPFX, NICK), person attributes (TITL, RELI, NATI, DSCR, IDNO, and more), burial, death cause, age at event, and date ranges in both BET/AND and FROM/TO formats. Family events export on FAM records where the spec wants them. Citation metadata survives via the PAGE and QUAY sub-tags.

Gramps XML covers most of the same ground, with added support for `.gpkg` package imports that bundle media alongside the genealogical data. Full roundtrip for research vaults already invested in Gramps.

Privacy-aware export anonymizes living persons automatically when enabled. Names, precise dates, and identifying details are stripped; relationships and structural data remain. Anonymization is per-entity-type and opt-in, so you can share a research compilation for review without compromising the subjects' privacy.

[Read more: Import and Export →](https://github.com/banisterious/obsidian-charted-roots/wiki/Import-Export)

---

## Open questions

1. **Worked example deferred.** A single claim traced end-to-end (hypothesis → conflicting evidence → cited conclusion) would be the most compelling content on the page but is the heaviest to author (sample vault, screenshots, annotation). Skipped for now. Worth revisiting once the page is live and the capture session for motion loops happens.
2. **Cross-link to `/worldbuilding/`.** The opening paragraph names the worldbuilding audience. A stronger cross-link at the end of the page ("For in-universe citations and fictional sourcing, see the Worldbuilding track") could help reinforce the topic-not-audience framing. Held until `/worldbuilding/` ships.
3. **Mills classification gloss.** The section names Elizabeth Shown Mills' *Evidence Explained* as the standard reference. That attribution might read as name-dropping to newcomers. Could trim to "a standard US genealogy reference" without the title. Current wording feels right for the GPS audience this page is aimed at.
4. **Wiki coverage for Mills classification.** The Evidence-And-Sources wiki page is the umbrella. No standalone wiki page for Mills specifically. Page-level reader who wants depth has to dig through. Future wiki work could add a dedicated page.
