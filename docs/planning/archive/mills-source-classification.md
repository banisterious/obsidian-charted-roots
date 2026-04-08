# Mills-Aligned Source Classification

- **Status:** Phase 1 complete (v0.20.17) | Phase 2-3 planned
- **GitHub Issue:** [#276](https://github.com/banisterious/obsidian-charted-roots/issues/276)
- **Created:** 2026-02-28
- **Community Contributors:** @ANYroots (methodology guidance, real-world examples, deprecation path, proof-analysis block concept)

## Background

Elizabeth Shown Mills' *Evidence Explained* defines three independent axes for evaluating genealogical evidence. The existing `source_quality` property (`primary`/`secondary`/`derivative`) conflates Mills' source and information classifications into a single value, making consistent application difficult — users can't distinguish "what is the document?" from "who provided the information?"

## Phase 1 — Source-Level Classification (Complete, v0.20.17)

Three optional, independent frontmatter properties on source notes:

| Property | Values | Question |
|----------|--------|----------|
| `source_classification` | `original`, `derivative`, `authored_narrative` | What is the document itself? |
| `information_classification` | `primary`, `secondary`, `undetermined` | Who provided the information? |
| `evidence_classification` | `direct`, `indirect`, `negative` | How does it relate to the research question? |

### What shipped

- **Create Source modal**: Collapsible "Source classification (Mills)" section with three dropdowns
- **Evidence analysis**: `getEffectiveInformationQuality()` bridge prefers `information_classification` over `source_quality` when present
- **Reports**: Source Summary, Sources by Role, and PDF conditionally display classification columns
- **Templates**: Census (derivative/primary), vital record (original/primary/direct), full template (three suggesters)
- **No breaking changes**: `source_quality` unchanged; classifications are purely additive

### Key implementation files

- Types: `src/sources/types/source-types.ts` — union types, label constants, bridge function
- Service: `src/sources/services/source-service.ts` — parse, create, update
- Evidence: `src/sources/services/evidence-service.ts` — quality assessment via bridge
- Proofs: `src/sources/services/proof-summary-service.ts` — conflict analysis via bridge
- UI: `src/sources/ui/create-source-modal.ts` — classification section (lines 419-500)
- Reports: `source-summary-generator.ts`, `sources-by-role-generator.ts`, `pdf-report-renderer.ts`

---

## Phase 2 — `source_quality` Deprecation & Data Quality Integration

### `source_quality` deprecation path

Per @ANYroots' recommendation: clear deprecation timeline rather than indefinite coexistence.

**Rationale:** Users who want a lightweight assessment already have `confidence` (high/medium/low/unknown). Keeping `source_quality` with its `primary`/`secondary`/`derivative` values perpetuates exactly the conflation this feature was designed to fix — a user who starts with `source_quality` and later adopts GPS methodology will hit the same "is `primary` describing the source or the information?" confusion.

**Proposed approach:**

1. **Add `source_condition` property** (optional) — physical condition and legibility of the source document. Values TBD, but candidates: `excellent`, `good`, `fair`, `poor`, `damaged`. This covers the legitimate use case that `source_quality` sometimes served (document condition) without semantic ambiguity. Alternatively, condition notes could live in the note body rather than structured frontmatter.

2. **Deprecation timeline:**
   - **Phase 2a**: Add Data Quality flag for sources with `source_quality` but no Mills properties. Show migration guidance.
   - **Phase 2b**: Add automated migration tool (Data Quality → bulk convert `source_quality` values to `information_classification` equivalents where mapping is unambiguous: `primary` → `primary`, `secondary` → `secondary`; `derivative` has no clean mapping since it conflates source and information — flag for manual review).
   - **Phase 2c**: Stop writing `source_quality` in new sources. Existing values continue to be read via `getEffectiveInformationQuality()` fallback.
   - **Phase 2d**: Remove `source_quality` from UI (Create Source modal, template snippets). Property still parsed for backward compatibility but no longer surfaced.

3. **GEDCOM consideration**: GEDCOM's `QUAY` tag currently maps to `source_quality`. Import would need to map to `information_classification` instead. Export: no GEDCOM equivalent for Mills properties exists; QUAY could be reverse-mapped from `information_classification`.

### Data Quality integration

Flag sources with incomplete or inconsistent classification:

| Rule | Severity | Description |
|------|----------|-------------|
| Has `source_classification` but missing `information_classification` | Info | Incomplete Mills classification |
| Has `source_classification` but missing `evidence_classification` | Info | Incomplete Mills classification |
| Has `source_quality` but no Mills properties | Info | Legacy property; consider migrating |
| Has both `source_quality` and `information_classification` | Warning | Redundant; `information_classification` takes precedence |

---

## Phase 3 — Per-Claim Classification

### Problem

The same source can provide different quality information for different claims. A death certificate provides *primary* information for the death date but *secondary* information for the parents' names (the informant may not have firsthand knowledge). Phase 1 puts classification on the source note globally — this covers the common case but doesn't capture per-claim nuance.

### Proposed location: proof summary notes

Per @ANYroots: proof summaries are the natural home for per-claim classification because they already connect sources to specific claims. A source note describes the document; a proof summary evaluates its evidence for a specific question.

Current proof evidence structure:

```yaml
evidence:
  - source: "[[Marriage Certificate - John and Mary]]"
    information: "Married on 15 June 1850"
    support: strongly
```

Extended with per-claim classification:

```yaml
evidence:
  - source: "[[Marriage Certificate - John and Mary]]"
    information: "Married on 15 June 1850"
    support: strongly
    source_classification: original
    information_classification: primary
    evidence_classification: direct
  - source: "[[Obituary - Mary Smith]]"
    information: "Married approximately 35 years"
    support: moderately
    source_classification: authored_narrative
    information_classification: undetermined
    evidence_classification: indirect
```

### `charted-roots-proof-analysis` dynamic block

Per @ANYroots' suggestion: a new dynamic block for proof summary notes that renders a classification matrix.

```markdown
```charted-roots-proof-analysis
```
```

Rendered output:

| Record | Claim | Source | Information | Evidence |
|--------|-------|--------|-------------|----------|
| Marriage certificate (loose paper) | Married [date] | original | primary | direct |
| Marriage license and return (bound volume) | License issued [date]; married [date] | derivative | primary | direct |
| Obituary (newspaper) | Married XX years | authored narrative | undetermined | indirect |

**Design considerations:**

- Block reads from the proof summary's `evidence` array
- Source-level classification (from Phase 1) serves as default when per-claim values aren't specified
- Fallback chain: per-claim classification → source-level classification → empty
- Freeze-to-markdown support (consistent with other dynamic blocks)
- Could include a "strongest evidence" summary row highlighting the best-supported claim

### Open questions

1. **YAML structure**: Flat properties on evidence entries (shown above) vs. nested `classification:` object? Flat is simpler but adds three properties per evidence entry.
2. **UI for per-claim classification**: Inline dropdowns in the Create Proof modal's evidence rows? Could get visually dense.
3. **Aggregation**: Should the proof summary display an overall classification assessment (e.g., "strongest evidence: primary/direct")?
4. **Phase 1 interaction**: When per-claim classification exists, should it override the source-level values in reports, or should both be visible?

---

## Explicit Non-Scope

- **Per-claim classification on person notes** — `sourced_*` properties link facts to sources but don't carry classification metadata. This would require a significant frontmatter redesign and is better served by proof summaries.
- **Automated classification inference** — No attempt to guess classification from source type (e.g., "vital_record" → "original"). Users must classify explicitly.
- **GEDCOM X classification mapping** — No standard GEDCOM X vocabulary for Mills' framework exists. Revisit if one emerges.
