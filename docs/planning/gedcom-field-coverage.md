# Comprehensive GEDCOM 5.5.1 Field Coverage

Planning document for comprehensive GEDCOM field coverage.

**Status:** In progress

**Related:** [#317](https://github.com/banisterious/obsidian-charted-roots/issues/317) (umbrella issue), [#316](https://github.com/banisterious/obsidian-charted-roots/issues/316) (citation metadata — separate design decision)

**Supersedes:** #313 (NPFX/NSFX), #314 (MARR.DATE/MARR.PLAC), #315 (BURI.DATE)

---

## Overview

Several GEDCOM 5.5.1 fields are either unsupported or only partially supported (parsed on import but dropped on export). This document tracks all mechanical coverage gaps to ensure lossless roundtrip GEDCOM workflows.

Citation-level metadata (PAGE/QUAY) is tracked separately in #316 as it requires a data model decision.

---

## Investigation notes

### FAM.MARR.DATE / FAM.MARR.PLAC (#314)

**Confirmed as a real gap.** The pipeline is broken at the importer stage:

- **Parser (both v1 and v2):** Correctly parses `MARR.DATE` and `MARR.PLAC` into `family.marriageDate` and `family.marriagePlace`
- **Importer (`gedcom-importer-v2.ts`):** Writes spouse wikilinks and `spouse_id` to person frontmatter, but **never writes `spouse[N]_marriage_date` or `spouse[N]_marriage_location`**. The parsed marriage data is dropped here.
- **Export (`gedcom-exporter.ts`):** Correctly reads `SpouseRelationship.marriageDate` from PersonNode and writes `FAM.MARR.DATE/PLAC` — but since the importer never populated the frontmatter, there's nothing to read on freshly imported vaults.

**Fix:** Update `gedcom-importer-v2.ts` to write indexed `spouse[N]_marriage_date` and `spouse[N]_marriage_location` properties to person frontmatter when family marriage data exists.

---

## Gaps ranked by user impact

### Tier 1 — High impact

Common data fields that affect most users doing GEDCOM roundtrips.

#### 1. Person attribute export (TITL, RELI, NATI, DSCR, IDNO, PROP, CAST, NCHI, NMR, SSN)

- **Import:** Fully supported. `gedcom-parser-v2.ts` lines 657-664 parse all 10 attributes into `individual.attributes`
- **Export:** Not supported. `PersonNode` lacks fields for these attributes; `gedcom-exporter.ts` does not write them
- **Fix:** Add attribute fields to `PersonNode`, map to frontmatter properties, export from `buildIndividualRecord()`

#### 2. NICK export

- **Import:** Supported. `gedcom-parser-v2.ts` line 837 stores as `individual.nickname`
- **Export:** Not supported. `PersonNode` has no `nickname` field
- **Fix:** Add `nickname` to `PersonNode`, map to frontmatter, export as `2 NICK` under `1 NAME`

#### 3. BURI.DATE import

- **Import:** Only PLAC is mapped to `burial_place` frontmatter. DATE is parsed generically but not stored as a dedicated property
- **Export:** Burial exported as event type but no dedicated `burial_date` field exists
- **Fix:** Add `burial_date` property, map `BURI.DATE` to it on import, export it

#### 4. NPFX / NSFX (name prefix and suffix)

- **Import:** Not supported. `gedcom-parser-v2.ts` handles GIVN, SURN, NICK under NAME but skips NPFX and NSFX
- **Export:** Not supported. No properties exist
- **Fix:** Add `name_prefix` and `name_suffix` properties, parse from NAME sub-tags, export as `2 NPFX` / `2 NSFX`

### Tier 2 — Medium impact

Less common fields but important for data accuracy and completeness.

#### 5. SPFX (surname prefix)

- **Import:** Not supported
- **Export:** Not supported
- **Fix:** Add `surname_prefix` property, parse from `2 SPFX` under NAME, export it back

#### 6. CAUS (cause of death)

- **Import:** Not supported (sub-tag of DEAT)
- **Export:** Not supported
- **Fix:** Add `death_cause` property, parse from `2 CAUS` under `1 DEAT`, export it back

#### 7. Marriage variants (MARB, MARC, MARL, MARS, DIVF)

- **Import:** Not clear if these are handled as generic events or dropped
- **Export:** Likely not exported
- **Fix:** Ensure all marriage-related event types are mapped through the event system

#### 8. CHRA (adult christening)

- **Import:** Not clear if handled
- **Export:** Likely not exported
- **Fix:** Add as recognized event type if not already present

### Tier 3 — Lower impact

Specialist use cases; derivable from other data or rarely used.

#### 9. AGE (age at event)

- **Import:** Not supported (sub-tag of any event)
- **Export:** Not supported
- **Fix:** Store as property on event notes. Low priority since age is derivable from birth date + event date

#### 10. TEXT (source transcription)

- **Import:** Not supported
- **Export:** Not supported
- **Fix:** Add a `transcription` or `text` field to source notes

#### 11. Source-level NOTE / OBJE

- **Import:** Source citations capture `sourceRef`, `page`, `quay` but not NOTE or OBJE sub-tags
- **Export:** Only exports `2 SOUR @xref@` with no sub-tags
- **Fix:** Store citation notes and media references. May overlap with #316 design decisions

---

## Data model changes required

### New PersonNode fields

- `namePrefix` (string) — NPFX
- `nameSuffix` (string) — NSFX
- `surnamePrefix` (string) — SPFX
- `nickname` (string) — NICK (already parsed, needs PersonNode field)
- `burialDate` (string) — BURI.DATE
- `deathCause` (string) — DEAT.CAUS
- `nationality` (string) — NATI
- `religion` (string) — RELI
- `title` (string) — TITL
- `physicalDescription` (string) — DSCR
- `identityNumber` (string) — IDNO
- `property` (string) — PROP
- `caste` (string) — CAST
- `childrenCount` (number) — NCHI
- `marriageCount` (number) — NMR
- `ssn` (string) — SSN

### New frontmatter properties

Corresponding properties for each new PersonNode field, following existing naming conventions (snake_case):

`name_prefix`, `name_suffix`, `surname_prefix`, `nickname`, `burial_date`, `death_cause`, `nationality`, `religion`, `title`, `physical_description`, `identity_number`, `property`, `caste`, `children_count`, `marriage_count`, `ssn`

---

## Implementation approach

1. Add new fields to `PersonNode` interface
2. Map frontmatter properties to PersonNode fields in the family graph builder
3. Update GEDCOM parser to populate new fields on import
4. Update GEDCOM exporter to write new fields on export
5. Verify roundtrip: import → export → re-import produces identical data
