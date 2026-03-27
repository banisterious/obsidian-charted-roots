# Citation-Level Metadata (PAGE/QUAY)

Planning document for citation-level metadata support.

**Status:** ✅ Phase 1-2 complete | Phase 3-4 planned

**Related:** [#316](https://github.com/banisterious/obsidian-charted-roots/issues/316), [#317](https://github.com/banisterious/obsidian-charted-roots/issues/317) (GEDCOM field coverage umbrella)

---

## Overview

Add per-citation metadata (page references, quality assessments) to support lossless GEDCOM roundtrips and GPS-aligned research workflows. Citations are modeled as lightweight notes — one per citation occurrence — with flat Obsidian-compatible properties.

## Design Decision

**Option D: Lightweight citation notes** was selected after community discussion. Each citation note represents one citation occurrence (one source + one fact on one subject), mapping 1:1 to GEDCOM's `SOUR` blocks under assertions.

### Why not other options?

- **Option A (store on source note):** Loses per-citation granularity — same source cited for different facts needs different page refs.
- **Option B (indexed flat properties):** Breaks down with multiple sources per fact, fragile positional alignment, unbounded field proliferation.
- **Option C (full citation entity):** Conceptually correct but heavyweight — Option D achieves the same with less complexity.
- **Alternative (nested YAML):** Obsidian does not support nested properties in the property panel.

---

## Data Model

### Citation note

**Folder:** `Charted Roots/Citations/`

**Filename convention:** `Citation - {SourceBasename} - {SubjectBasename} {fact}.md`

**Properties (all flat):**

```yaml
cr_type: citation
cr_id: (auto-generated)
source: "[[Census 1850]]"
subject: "[[John Smith]]"
fact: birth_date
page: "p. 42, entry 15"
quality: 3
```

- `source` — wikilink to the source note
- `subject` — wikilink to the person (or event) note being cited
- `fact` — the frontmatter property being supported (e.g., `birth_date`, `death_place`, `occupation`)
- `page` — free-text citation detail (GEDCOM PAGE)
- `quality` — integer 0-3 (GEDCOM QUAY: 0=unreliable, 1=questionable, 2=secondary, 3=primary)

### Person note changes

New flat `citations` array property:

```yaml
citations:
  - "[[Citation - Census 1850 - John Smith birth_date]]"
  - "[[Citation - Census 1850 - John Smith birth_place]]"
```

### Relationship to existing sourced_* fields

The existing `sourced_birth_date`, `sourced_death_place`, etc. fields continue to work as they do today. They can be derived from citation notes but are **not replaced** — backward compatibility is preserved.

---

## GEDCOM Mapping

### Import

For each `SOUR` block under an assertion (e.g., `BIRT`, `DEAT`, `NAME`):

1. Create a citation note with the parsed `PAGE` and `QUAY` values
2. Link the citation note to the person via the `citations` array
3. Continue writing `sourced_*` fields as before for backward compatibility

### Export

For each citation note linked to a person:

1. Find the assertion tag corresponding to `fact` (e.g., `birth_date` → `BIRT`)
2. Write a `SOUR` sub-tag under that assertion with `PAGE` and `QUAY`

---

## Implementation Phases

### Phase 1 — Core model and GEDCOM import ✅

- ✅ Define `CitationNote` interface and types (`src/sources/types/citation-types.ts`)
- ✅ Register `citation` as entity type in note-type-detection
- ✅ Add `citationsFolder` setting (default: `Charted Roots/Citations`)
- ✅ Create `CitationNoteService` with CRUD operations (`src/sources/services/citation-note-service.ts`)
- ✅ Update GEDCOM importer to generate citation notes from `SOUR.PAGE` and `SOUR.QUAY`
- ✅ Add `citations` array to person notes on import
- ✅ Test fixture: `tests/fixtures/gedcom/gedcom-sample-citation-metadata.ged`

### Phase 2 — GEDCOM export ✅

- ✅ Load citation notes into lookup map keyed by `subjectCrId|eventType|sourceCrId`
- ✅ Write `3 PAGE` and `3 QUAY` sub-tags under `2 SOUR` on event-level exports
- ✅ Add SOUR with PAGE/QUAY to person-level BIRT/DEAT/BURI exports
- ✅ Add `citationsFolder` to export options and export wizard
- ✅ Map `fact` property back to GEDCOM assertion tags via `factToEventType()`
- ✅ Exclude citation notes from family graph person cache
- ✅ Resolve place wikilinks in person-level exports
- ✅ Fix place hierarchy order (GEDCOM most-specific-first)

### Phase 3 — UI and commands

- "Add citation" command — creates a citation note and links it to the current person
- Citation picker modal — select source, enter page/quality, select fact
- Display citations in Entity Profile View (person profile, sources section)
- Citation count/coverage indicators

### Phase 4 — Integration

- Derive `sourced_*` fields from citation notes (optional migration path)
- Citation-aware reports (source summary report includes page references)
- Statistics dashboard: citation coverage metrics
