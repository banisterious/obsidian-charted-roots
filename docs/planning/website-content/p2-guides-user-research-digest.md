# P2 guides — user research digest

**Status:** 📚 Reference material. Synthesized 2026-05-02 from GitHub issues + discussions authored by `ANYroots` and `wilbry` in `banisterious/obsidian-charted-roots`. Both users were under the 40-item sampling cap (ANYroots: 17 items, wilbry: 9). Used to inform P2 guide drafts on methodology-aligned and specialized-research topics.

**How to use:** When drafting any of the seven P2 guides covered below, read the relevant section first. The synthesis sub-sections suggest concrete framing, terminology, and worked examples to incorporate. Issue / discussion numbers link back to the original threads for deeper context.

**When this file becomes stale:** Once all P2 guides covered here have shipped to chartedroots.com, this digest can move to `docs/planning/archive/`. Until then, it's working reference.

---

## writing-proof-summaries (P2 guide)

**ANYroots context:**
- Discussion #48 ("Confused by Arrays — bug(s) or me?"): Walks through trying to record an `evidence` array on a proof note for two conflicting census-derived birth-year estimates (1817-18 vs. 1824-25). Demonstrates the literal frontmatter shape a researcher attempts when starting a proof summary — `source`, `information`, `supports: conflicts`, `notes` — and shows that the Create Proof Summary flow from Data Quality > Source Conflicts is the entry point users discover.
- Discussion #38 ("Research Considerations"): Proposes a `research_level` property based on Yvette Hoitink's Six Levels of Ancestral Profiles, where Level 5 = "GPS met — exhaustive research, written conclusion." Frames proof summaries as the artifact that distinguishes Level 5 from lower levels.

**wilbry context:** No direct items.

**Synthesis for the guide:** ANYroots' census birth-year case is a perfect concrete example for the guide — two routine sources, ages don't reconcile within ±2 years, requiring a written analysis. Show the `evidence` array shape that the Create Proof Summary modal generates (the structure she pasted) so users recognize what their saved file should look like. Anchor the guide's "when do I need a proof summary?" framing to Hoitink's Level 5 ("written conclusion required"); ANYroots already thinks in those terms and other GPS-leaning users will too. Pair the worked example with a callout that the flow originates from Data Quality > Source Conflicts, since that's how researchers find it.

---

## handling-conflicting-evidence (P2 guide)

**ANYroots context:**
- Discussion #38: Distinguishes `evidence_quality` (direct / indirect / **negative**) from `information_quality` (primary / secondary / undetermined) and `source_quality` (clear / marginal / damaged) per Mills' Evidence Analysis Map. Argues the current single `source_quality` property conflates layers that should be separate when adjudicating conflicts.
- Issue #276 ("Enhanced Mills-Aligned Source Properties"): Re-opens #38's argument with concrete examples — a FamilySearch census image is *original source* but *undetermined information* (we don't know who in the household answered the enumerator); a Find A Grave memorial bundling a 1949 newspaper article is *authored narrative* with *secondary or undetermined* information; a clerk's marriage register is *derivative* but *primary*. Each example would weight differently when reconciling a conflict, and conflating them produces ambiguous classifications.
- Discussion #48: Live conflict already in her vault (1870 vs. 1880 census birth-year mismatch).

**wilbry context:**
- Issue #305 ("Parse negative findings from research_report notes"): Treats negative evidence as first-class — explicitly logs negative newspaper search results in research reports (e.g., "No birth announcements found for John Robert Smith"). Useful framing for the guide because reconciling conflicts often turns on whether a record's *absence* is meaningful.

**Synthesis for the guide:** The guide should explicitly walk through the three Mills layers (source / information / evidence) when adjudicating a conflict, because both users — ANYroots through her detailed proposals and wilbry through his report-driven workflow — assume separation between "what kind of document is this," "who told the document this fact," and "what does this fact tell us about my question." Use ANYroots' census-image example ("original source but undetermined information") as the canonical case for why a conflict between two census records isn't a conflict between two equally weighted facts. Include negative evidence as a category; wilbry's newspaper example shows users do log it and want to surface it in conflict resolution. Be aware that v0.20.46 shipped expanded source-classification fields, so the guide can reference current property names rather than the proposal terminology in #276.

---

## tracking-research-progress (P2 guide)

**ANYroots context:**
- Discussion #38: The Hoitink Six Levels proposal (Level 0 unidentified through Level 6 biography) is explicitly framed as a long-term progress-tracking mechanism — a `research_level` property the user could update over years as an ancestor moves from "name only" to "GPS met." This is the cleanest user-articulated model in the corpus for tracking progress per ancestor over time.
- Discussion #275 ("Source note granularity for probate packets"): Real-world example of multi-year tracking — the William H. Hardwick probate packet spans 1863–1870 with 15+ documents; ANYroots later returned to the thread after physically traveling to the courthouse to obtain ~15-20 missing pages, then returned again to refine her citations. Shows how research on a single record group unfolds over months in fits and starts, with iterations on transcription, citation, and re-acquisition.

**wilbry context:**
- Issue #305 + Discussion #177: wilbry's workflow centers on `research_report` notes that double as both analysis document and chronological research log. Quote: "My reports serve as both the analysis document and the research log." Each report has a `## Research Log` section with dated entries (e.g., "### 5 March 2026 — Newspaper search — Negative finding"), tracking what was searched, where, with what parameters, and the outcome.
- Issue #175 ("Store External IDs after Import"): Suggests `external_id` and `external_id_provider` frontmatter so that re-imports from Ancestry/MyHeritage/etc. preserve the user's accumulated work — implicit framing that long-term progress survives schema or source changes.

**Synthesis for the guide:** Present two complementary models the guide can recommend to different audiences. ANYroots' Hoitink levels suit researchers who think per-ancestor and want a status field they can sort/filter on (which feeds into research-gap identification too). wilbry's "report as living log" suits researchers who think per-question and want a chronological account of what they tried. The guide should show both, including wilbry's verbatim log-line format (`- **2026-03-05** — [[State Newspapers]] — Searched "John Smith" -> negative.`) since that exact pattern is now parsed by the `charted-roots-negative-findings` block (per #305's resolution). Note ANYroots' point that real research isn't continuous — she paused the probate transcription for weeks while traveling, then resumed; the guide should normalize that intermittent cadence rather than implying a steady weekly workflow.

---

## identifying-research-gaps (P2 guide)

**ANYroots context:**
- Issue #266 ("Missing 'Research Needed' DQ card and command palette prompt"): Was actively trying to use `needs_research` frontmatter as her gap-tracking mechanism. Her example list — `"1910 census residence"`, `"1920 census residence"`, `"1930 census residence"`, `"Death record (Spartanburg Co.)"` — is exactly the granularity the guide should advocate (specific record + year + jurisdiction, not vague "find more").
- Discussion #38: Frames research-gap identification as a function of `research_level` — moving from Level 2 (vital statistics) to Level 3 (occupations, residence, children, spouses) implicitly defines what's missing.
- Discussion #48: Notes Data Quality > Research Gaps reported "239 unsourced facts" on a vault with only 24 notes — surfaces user confusion about what counts as a "gap" and how aggressively the report flags missing sourcing. Useful for the guide to address: gap reports surface both "I haven't researched this" gaps and "I researched it but haven't recorded the source" gaps.

**wilbry context:**
- Issue #306 ("Gaps report crashes"): wilbry actively uses the Gaps report and traced the crash himself (suspected `buildReportOptions()` missing the gaps-report case). Confirms gaps reports are a primary tool in his workflow.

**Synthesis for the guide:** Show the `needs_research` workflow with ANYroots' exact example list as the model for entry granularity — record + year + jurisdiction. Address the 239-vs-24 confusion explicitly: distinguish between *factual gaps* (no information yet recorded) and *sourcing gaps* (information recorded but not yet linked to a source), since users encountering Data Quality > Research Gaps for the first time conflate them. Reference the Gaps report (the broader, vault-wide tool wilbry uses) as the complement to per-note `needs_research` lists, and connect it back to the proof-summary and conflict guides — a gap that's "I have conflicting evidence and haven't reconciled it" should route to the proof-summary workflow.

---

## research-enslaved-ancestors (Beyond Kin) (P2 guide)

**ANYroots context:**
- Discussion #38: Direct request — "Are the Beyond Kin naming conventions compatible with the Canvas Roots system?" Cites the [Beyond Kin Project methodology](https://beyondkin.org/a-method-to-document-enslaved-populations/) and [naming conventions](https://beyondkin.org/beyond-kin-naming-conventions/), describes the method as "working outward from slaveholder records" with virtual family connections linking slaveholders, enslaved populations, individuals, and source documents.
- Discussion #275 (probate packet): The motivating context for the entire thread is African American genealogy. Slaveholder probate records — specifically appraisements, sale bills, and advancements to heirs — name enslaved persons and "sometimes group them in ways that suggest family units." The packet she's working with names enslaved persons in the appraisement, distributes them among heirs in the advancement, and documents sales. Concrete patterns: appraisements generate `enslaved_individuals` roles and potentially `transfer` events; sale bills name dozens of buyers who are themselves FAN network members.
- Discussion #189 ("Person Roles in Event and/or Source Notes"): Co-developed with wilbry. Includes "Enslaved persons" as a first-class role on Will, Estate Inventory, and Appraisement source notes. Quote: "Tracking who appears as enslaved property in wills, inventories, and appraisements—and linking them to the enslavers, heirs, and appraisers named in those documents—is critical for building family networks before emancipation." Also covers the terminology conversation: ANYroots prefers "Enslaved Individuals" and "Slaveholder," but notes other practitioners use "Slave" / "Enslaver" — a matter of personal preference within the community. (Decision in thread: CR ships with "Enslaved Individuals" as the standard role name.)
- Issue #193 (Ancestry GEDCOM import): Flags that her Beyond Kin formatting was caught by name/placeholder normalization. Quote: "1 concern about standardization of names/placeholders, specifically dealing with the Beyond Kin methodology. Is there or could there be a way to mark these types of notes as 'excluded' from name and placeholder normalization?" This is a gotcha worth documenting — Beyond Kin uses placeholder names like `Susan~` for unknown surnames and the tooling can mistake them for data-quality issues.

**wilbry context:**
- Discussion #189: Contributed the canonical role list (Principals, Witnesses, Informants, Officials, Enslaved Persons, Family, Others) and explicitly noted "Enslaved Persons (I default to your judgement on the naming of this @ANYroots, just wanted to include it because its important)."

**Synthesis for the guide:** This is the topic with the deepest user-supplied substance. Center the guide on ANYroots' actual workflow: working outward from a slaveholder's probate packet, using the appraisement to identify named enslaved individuals, tracking them as those individuals are distributed to heirs in advancement documents and sold in sale bills. Explicitly cover: (1) the `enslaved_individuals` person role on source notes (shipped per #189), (2) the source-hierarchy / `source_parent` pattern for keeping a multi-document probate packet organized (shipped in v0.20.46 per #275 update), (3) Beyond Kin naming conventions and the gotcha that name-normalization may flag them — recommend turning off normalization for those notes or using a folder convention. Use ANYroots' actual citations as exemplars; she's already worked through Mills-style EE citations for both the parent packet and child documents at FamilySearch and the courthouse PDF. Adopt her terminology choices ("Enslaved Individuals," "Slaveholder") as the guide defaults but acknowledge community variation.

---

## conduct-one-name-study (P2 guide)

**ANYroots context:** None directly. Closest tangential signal: discussion #190's "track married surnames separately" pattern (`maiden` vs. married_name) is relevant to a one-name study because it determines whether women born to a surname remain searchable under it after marriage.

**wilbry context:** None.

**Synthesis for the guide:** Neither user has substantive content on one-name studies. The guide should be drafted from authoritative external sources (Guild of One-Name Studies, etc.) rather than user threads. The single transferrable insight from these threads is ANYroots' #190 discussion of naming conventions for married women: a one-name-study guide should recommend tracking married women by maiden name (with married surnames in a separate field) so they remain visible in surname-scoped queries and Bases views. Her shorthand `Susan Smith~` (where `~` flags Smith as a married surname, keeping the entry sortable with other Smiths but visually distinct) is a workable pattern to mention.

---

## analyze-fan-clusters (P2 guide)

**ANYroots context:**
- Discussion #38: Explicitly asks how Beyond Kin and FAN clusters interact — "this might tie into how FAN (Friends, Associates, Neighbors) clusters are handled generally—both are crucial relationships for genealogical research but aren't family connections."
- Discussion #189: Frames person roles as the substrate FAN analysis is built on. Quote: "Witnesses, informants, bondsmen, appraisers, and officials are often family, friends, associates, or neighbors—tracking these roles helps identify research leads." Also: "Filtering/querying: 'Show me all sources where Person X appears as a witness' or 'Find all documents where Person X served as bondsman.'"
- Discussion #275: The probate packet's sale-bill section names "dozens of buyers — most of whom are FAN network members, not research subjects. The buyers and payment methods are genealogically significant (they reveal economic relationships in the community)." A concrete example of FAN data hidden inside a single source document.

**wilbry context:**
- Discussion #189: His simplified role categories (Principals, Witnesses, Informants, Officials, Enslaved Persons, Family, Others) are the canonical taxonomy for capturing FAN-relevant roles on source notes. Maintainer reply in #189 explicitly named FAN as one of the two value props for the feature.

**Synthesis for the guide:** Anchor the guide in the source-roles feature that #189 produced — that's the mechanical foundation for FAN analysis in CR. Show the canonical role list (Principals, Witnesses, Informants, Officials, Enslaved Individuals, Family, Others) and the inline-notation pattern (Option B from the discussion) that shipped: `witnesses: ["[[John Smith]] (Neighbor)", "[[Jane Doe]] (Sister of bride)"]`. Use ANYroots' probate-packet example to show how a single source can yield large FAN clusters when buyers / sureties / appraisers are recorded as roles. Cover the recommended queries — "all sources where Person X appears as a witness" and "all documents where Person X served as bondsman" — since those are the workflows users articulated wanting. Link to the enslaved-ancestor guide because Beyond Kin and FAN converge: in pre-emancipation research, slaveholder community networks are simultaneously FAN networks and the documentary surface for tracing enslaved family relationships.

---

## Additional themes worth flagging

These don't fit the seven planned guides but are methodology-adjacent themes the maintainer may want to consider for future guide additions, separate issues, or the catalog expansion plan.

### Naming conventions for married women / unknown surnames (ANYroots #190)

Her `Susan Smith~` convention and `~` suffix for "this surname is married, not maiden" are practical patterns that span Beyond Kin (unknown enslaved-person surnames), one-name studies, and general female-ancestor research. Worth its own short reference page — the kind of pattern that's hard to discover from feature docs alone.

### Source granularity for multi-document record groups (ANYroots #275 + shipped `source_parent`)

The probate packet is the motivating case but the pattern generalizes — multi-volume collections, court case files, military pension files, multi-page census transcriptions. A "structuring complex sources" guide could collect this with `source_parent` as the load-bearing feature.

### Citation construction with custodian / jurisdiction name changes over time (ANYroots in #275 follow-ups)

Her correction on Layer 2 redundancy — "dropped 'York County, South Carolina, Probate Court' from Layer 2 because Layer 1 already establishes it... in child citations it stays in Layer 2 only because Layer 1 references the jurisdiction under a different name: York District not County, Court of Ordinary not Probate Court" — is a sophisticated citation-mechanics insight that intermediate users would benefit from. Could feed a Mills-EE citation guide.

### Importing pre-GPS legacy data (wilbry #179)

His grandfather's PAF-era GEDCOM has informal source notes like "Information from PERSON in letter of September 25, 1990" — not GPS-compliant but a genuine starting point. A "modernizing inherited research" guide could cover triaging legacy notes and gradually upgrading them.

### Web Clipper / LLM-assisted source ingestion (wilbry #127, ANYroots' Claude-project workflow described in #275)

Both users are using LLM-assisted extraction — wilbry proposing it as a clipper feature, ANYroots already using a Claude project to transcribe and abstract documents into CR's source-note format. Methodology guide on "AI-assisted transcription with human verification" would be relevant given the existing `docs/clipper-templates/` feature surface.

---

## Action items extracted from the digest

Concrete things to verify, file, or decide separately from drafting the P2 guides themselves.

### Verification (completed 2026-05-02)

- [x] **Hoitink `research_level` property** — ✅ Fully shipped: 0-6 scale matching Hoitink's Six Levels, "not assessed" = unset (distinct from level 0). Used across reports, family chart view, GEDCOM exporter, person-note-writer, family-graph, brick-wall report. Documented in Frontmatter Reference wiki at line 179. P2 progress-tracking guide can reference current behavior without caveats.
- [x] **239-vs-24-notes Research Gaps confusion (Discussion #48)** — ✅ Already fixed via #54 "[Bug] Research Gaps Showing Inflated Unsourced Facts Count" (closed, released). Fix scopes the count to "only count unsourced facts for people actively using GPS tracking." The gaps guide can document current correct behavior without needing to address the historical confusion.
- [x] **Negative-findings parsing (#305)** — ✅ Fully shipped: `charted-roots-negative-findings` block scans three sources (`research_log_entry` frontmatter, `research_journal` markdown, and `research_report` `## Research Log` sections — the third path was added by #305 itself). Wiki documented at `Dynamic-Note-Content.md` and `Research-Workflow.md`. P2 progress-tracking guide can reference both the block syntax and wilbry's "report as living log" format as supported parsing.

### Deferred FRs from #193 — filed 2026-05-02

When #193 closed, two follow-up FRs were promised but never created. Filed as fresh issues:

- [x] **Beyond Kin name exclusion** — filed as **#517** (`enhancement`, `data-quality`, `low-priority`, `post-1.0`). Until this ships, the Beyond Kin guide documents the workaround (folder-scoped normalization disable) rather than the supported feature.
- [x] **Merge duplicate place modal UX** — filed as **#518** (`enhancement`, `data-quality`, `low-priority`, `post-1.0`). Existing find-and-merge-duplicates guide remains accurate; the friction it introduces gets resolved when the modal collapse-after-action lands.

### Catalog expansion candidates (5 additional guides to consider)

If any of the additional themes warrant promotion to actual guides, they'd extend the catalog from 49 to up to 54. Decision points for each:

- [ ] **Naming conventions for married women / unknown surnames** — promote to P2/P3? Tangentially supports Beyond Kin, one-name studies, and general research.
- [ ] **Source granularity for multi-document record groups** — promote to P2/P3? Generalizes ANYroots' probate-packet workflow.
- [ ] **Citation construction with custodian / jurisdiction name changes** — promote to P3? Niche but high-value for intermediate Mills-EE researchers.
- [ ] **Modernizing pre-GPS legacy data** — promote to P2/P3? Real audience among users with inherited PAF/early-GEDCOM trees.
- [ ] **AI-assisted transcription with human verification** — promote to P2/P3? Both users actively use it; documenting the verification discipline is the methodology angle.
