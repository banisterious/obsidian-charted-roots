# Research and Evidence Track Page — stub

**Target page:** `/research/_index.md` (new) on chartedroots.com
**Status:** 📋 Stub — Phase 3, non-urgent.

---

## Purpose

Long-form narrative for the research workflow. The sources subsystem, citation integration, Genealogical Proof Standard tracking, and data-quality tools all deserve more room than the main features page gives them. A dedicated topic page lets the workflow tell itself end-to-end.

Audience is anyone who cares about evidence-based claims: family historians building GPS-compliant cases, academic researchers, and worldbuilders tracking in-universe citations. The page is topic-centered (research workflow) rather than audience-centered (genealogy), so it parallels `/worldbuilding/` as a deep dive on a capability area, not an audience-gated track.

---

## Proposed structure

1. **Opening frame.** What the research toolkit is for. One paragraph on why evidence and sourcing deserve more than a basic wikilink. Frames the rest of the page.
2. **Sources as first-class notes.** Source notes, source types, source hierarchies (parent / child documents). Mills source classification as a worked example of structured typing.
3. **Citations.** Citation integration, citation metadata properties, the override path for edge cases, citation-to-source sync behavior.
4. **Genealogical Proof Standard workflow.** Research level tracking, gap reports, conflict detection. How the plugin surfaces open questions as data.
5. **Evidence on entities.** `sourced_*` properties on person / place / event / source / organization notes. Attribution visibility in the profile view. The sourced-facts subsystem as the bridge between individual entities and source notes.
6. **Data quality tools.** Smart duplicate detection, merge wizard, schema validation, the 14-step post-import cleanup wizard. Framed as "how you keep the research trustworthy over time."
7. **Research-aware import and export.** Comprehensive GEDCOM field coverage (preserves citation metadata), Gramps XML, privacy-aware exports (anonymize living persons). One paragraph on why round-trip fidelity matters for researchers.
8. **Example workflow (deferred).** Tracing a single claim from hypothesis through conflicting evidence to a cited conclusion. Needs a realistic worked example with screenshots; probably a later draft pass once the rest of the page is stable.

---

## Notes for drafting

- The sources subsystem has grown a lot since January: source hierarchies (v0.20.46), citation integration (v0.20.34 / v0.20.38), Mills classification (v0.22.x). Audit those release notes against the content when drafting.
- Keep the voice grounded in the workflow, not the feature list. The features page is the feature list; this page tells a story that happens to name features along the way.
- Short worked examples in the middle sections are probably more useful than at the end. "Here's what the sourced_birth_date property looks like" beats an abstract description.
- Cross-link to `/features/` for readers who want the full capability inventory, and to `/worldbuilding/` for the in-universe sourcing callout.

---

## Open questions

1. **URL confirmed as `/research/`.** Short, workflow-focused, works for both family historians and worldbuilders.
2. **Page length.** Worldbuilding page is projected at a similar depth; research page could be longer given the breadth of the sources toolkit. No hard cap; aim for one-sitting readability.
3. **Worked example scope.** A single realistic claim traced through the toolkit would be the most compelling content but is the heaviest to author (sample vault, screenshots, annotation). Start text-only; add visuals later if the page earns the depth.
4. **Overlap with features page.** The features page has a short Evidence and Sources section today. When this page lands, that section shrinks to a teaser and links here. Worth a note during features-refresh drafting.
5. **Mills classification treatment.** Feature name is specific and load-bearing. Use it without explanation (link to the Wikipedia article for Elizabeth Shown Mills if needed), or add a brief gloss the first time it appears?
