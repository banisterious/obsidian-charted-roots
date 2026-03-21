# Research Workflow

Charted Roots supports GPS-aligned research workflow features, enabling genealogists to manage research projects, reports, and individual research notes within their vault.

---

## Table of Contents

- [Overview](#overview)
- [Entity Types](#entity-types)
  - [Research Project](#research-project)
  - [Research Report](#research-report)
  - [Individual Research Note (IRN)](#individual-research-note-irn)
  - [Research Journal](#research-journal)
  - [Research Log Entry](#research-log-entry)
- [Properties Reference](#properties-reference)
  - [Common Properties](#common-properties)
  - [Understanding `subject` vs `up`](#understanding-subject-vs-up)
- [Research Log Format](#research-log-format)
- [Statistics Integration](#statistics-integration)
- [Using with DataView and Bases](#using-with-dataview-and-bases)
- [Example Workflows](#example-workflows)
- [Find Related Research](#find-related-research)
- [Related Pages](#related-pages)

---

## Overview

The research workflow features are inspired by the **Genealogical Proof Standard (GPS)**, the methodology outlined in Elizabeth Shown Mills' *Evidence Explained* and used by professional genealogists to build reliable family histories.

These features help you:

- **Organize complex research** with projects and reports
- **Separate analysis from data** by keeping research notes distinct from person notes
- **Track negative findings** documenting what you searched and didn't find
- **Document your reasoning** in Individual Research Notes (IRNs)

### Design Philosophy

The research workflow is designed to be:

- **Flexible** - Use what you need, ignore what you don't
- **Lightweight** - No complex UI or mandatory structures
- **Compatible** - Works with DataView, Bases, and standard Obsidian tools
- **Non-enforcing** - No required folder structures or naming conventions

---

## Entity Types

Research workflow introduces five entity types, each identified by the `cr_type` frontmatter property.

### Research Project

**Purpose:** Hub for complex, multi-phase research cases.

A research project represents an overarching question you're trying to answer, potentially spanning multiple sources, people, and research sessions.

**Example:**

```yaml
---
cr_type: research_project
title: "Identity of John Smith (1850-1920)"
status: in-progress
research_level: 3
private: false
up: "[[Research Notebook]]"
related: ["[[Sarah Jones Identity Project]]"]
---

# Identity of John Smith (1850-1920)

## Research Question

Was John Smith (b. ~1850) who married Mary Jones in 1875 the same person as John Smith enumerated in the 1860 census?

## Research Log

- **2026-01-04** — [[1860 Census - District 42]] — Searched "John Smith, age 10-12" → negative. Searched all pages, no match in expected age range.

- **2026-01-05** — [[Marriage Record - Smith-Jones 1875]] — Searched "John Smith parents" → positive. Parents listed as William and Elizabeth Smith.

## Related Reports

- [[Smith Identity Research Report]]
- [[Smith Family Group Analysis]]
```

**Status values:** `open`, `in-progress`, `on-hold`, `completed`

### Research Report

**Purpose:** Living document analyzing a specific research question with findings and evidence.

Research reports focus on a narrower question than projects and contain analysis, source citations, and conclusions.

**Example:**

```yaml
---
cr_type: research_report
title: "John Smith Birth Location Analysis"
status: draft
reportTo: File
private: false
up: "[[Identity of John Smith Project]]"
---

# John Smith Birth Location Analysis

## Research Question

Where was John Smith (1850-1920) born?

## Sources Consulted

- [[1860 Census - Smith Household]]
- [[1875 Marriage Record - Smith-Jones]]
- [[Death Certificate - John Smith 1920]]

## Findings

### Census Evidence
The 1860 census shows John Smith (age 10) enumerated with William and Elizabeth Smith...

### Marriage Record Evidence
Marriage certificate states birthplace as "Pennsylvania"...

## Conclusions

[Analysis and synthesis]
```

**Status values:** `draft`, `review`, `final`, `published`

**reportTo values:** `File`, `Family`, `Client`, `Public`, `Print`

### Individual Research Note (IRN)

**Purpose:** Synthesis document between research reports and person notes, combining analysis across multiple sources.

IRNs contain your reasoned conclusions about a person based on evidence evaluation. They're separate from person notes to keep structured genealogical data distinct from research analysis.

**Example:**

```yaml
---
cr_type: individual_research_note
subject: "[[John Smith]]"
status: in-progress
private: false
up: "[[Identity of John Smith Project]]"
---

# Individual Research Note: John Smith

## Identity

**Full Name:** John Smith
**Birth:** ~1850, Pennsylvania (conflicting evidence)
**Death:** 20 Aug 1920, Philadelphia, PA

## Research Summary

### Birth Evidence
- 1860 Census: Born New York (per enumeration)
- 1875 Marriage: Born Pennsylvania (stated)
- Unresolved conflict requiring further investigation

### Family Relationships
- Father: William Smith (confirmed via multiple sources)
- Mother: Elizabeth [Unknown] Smith (confirmed)
- Spouse: Mary Jones (m. 1875)

## Outstanding Questions

1. Resolve birth location conflict (NY vs PA)
2. Locate birth record
3. Identify Elizabeth's maiden name

## Related Research

- [[Smith Identity Research Report]]
- [[Smith Family Group Analysis]]
```

**Note:** IRNs use both `subject` (the person being researched) and `up` (parent in research hierarchy). See [Understanding `subject` vs `up`](#understanding-subject-vs-up).

### Research Journal

**Purpose:** Daily or session-level research log for tracking activity across projects.

Research journals are optional and useful for documenting what you researched during a session, regardless of project boundaries.

**Example:**

```yaml
---
cr_type: research_journal
date: 2026-01-04
repositories: ["[[FamilySearch]]", "[[Ancestry.com]]"]
---

# Research Journal - 2026-01-04

## Projects Worked On

- [[Identity of John Smith Project]]
- [[Sarah Jones Identity Project]]

## Activities

- Searched FamilySearch for John Smith birth records in PA (1845-1855)
- Negative finding: No matches in Philadelphia County
- Reviewed 1860 census images for Smith households

## Next Steps

- Expand PA search to adjacent counties
- Check NY birth records for alternative birth location
```

### Research Log Entry

**Purpose:** Individual research log entries as separate notes for queryable research tracking.

Most users embed research logs in project notes using markdown. However, if you need queryable log entries (for DataView or Bases), you can create separate notes:

**Example:**

```yaml
---
cr_type: research_log_entry
date: 2026-01-04
project: "[[Identity of John Smith Project]]"
source: "[[1860 Census - District 42]]"
searched_for: "John Smith, age 10-12"
result: negative
---

Searched all pages of district 42, no match in expected age range.
```

This approach uses flat frontmatter properties that work with DataView and Bases, at the cost of more files in the vault.

---

## Properties Reference

### Common Properties

All research entity types share these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `cr_type` | string | Yes | Entity type identifier |
| `title` | string | Recommended | Display name |
| `status` | string | No | Current state |
| `private` | boolean | No | Exclude from exports if true |
| `up` | wikilink | No | Parent in research hierarchy |
| `related` | wikilink[] | No | Related research entities |

### Entity-Specific Properties

**Research Project:**

| Property | Type | Description |
|----------|------|-------------|
| `research_level` | number | GPS research level (0-6) |

**Research Report:**

| Property | Type | Description |
|----------|------|-------------|
| `reportTo` | string | Intended audience |

**Individual Research Note:**

| Property | Type | Description |
|----------|------|-------------|
| `subject` | wikilink | Person note being researched |

**Research Journal:**

| Property | Type | Description |
|----------|------|-------------|
| `date` | date | Journal entry date |
| `repositories` | wikilink[] | Repositories visited/searched |

**Research Log Entry:**

| Property | Type | Description |
|----------|------|-------------|
| `date` | date | Entry date |
| `project` | wikilink | Parent research project |
| `source` | wikilink | Source consulted |
| `searched_for` | string | What was searched |
| `result` | string | `positive`, `negative`, `inconclusive` |

### Understanding `subject` vs `up`

IRNs use two linking properties that serve different purposes:

- **`subject`** — Links to the **person note** being researched
  - Example: `subject: "[[John Smith]]"`
  - Identifies *who* the research is about

- **`up`** — Links to the **parent entity** in your research hierarchy
  - Example: `up: "[[Smith Family Research Project]]"`
  - Identifies *where* this note sits organizationally

**Example:** An IRN about John Smith might have:
- `subject: "[[John Smith]]"` — the person being researched
- `up: "[[Smith Family Research Project]]"` — the parent project containing this research

Both properties are optional. Use what makes sense for your workflow.

---

## Research Log Format

Research logs appear in `## Research Log` sections within Research Projects. We recommend simple markdown format rather than structured YAML:

```markdown
## Research Log

- **2026-01-04** — [[1860 Census - District 42]] — Searched "John Smith, age 10-12" → negative. Searched all pages of district 42, no match in expected age range.

- **2026-01-05** — [[Marriage Record - Smith-Jones 1875]] — Searched "John Smith parents" → positive. Parents listed as William and Elizabeth Smith.

- **2026-01-06** — Searched "Elizabeth Smith maiden name" → negative. No records found in county index 1820-1850.
```

### Why Markdown Instead of YAML?

Nested YAML in note content causes problems:

- Obsidian's Properties editor doesn't support it
- DataView and Bases can't query it
- Special characters and multi-line notes break parsing

Simple markdown is:

- Human-readable and editable
- Searchable with text search
- Consistent with how most Obsidian users document research

### Negative Findings

Document "searched X, found nothing" scenarios with `→ negative`. This tracks meaningful absence of expected records per Mills' methodology. Negative findings are often as important as positive ones.

---

## Statistics Integration

Research entities appear in the Statistics view under a dedicated **Research** section:

- **Projects** — Count and status breakdown (open, in-progress, on-hold, completed)
- **Reports** — Count and status breakdown (draft, review, final, published)
- **IRNs** — Total count
- **Journals** — Total count
- **Log Entries** — Total count (if using separate notes)

The dashboard also shows how many research entities are marked as `private`.

---

## Using with DataView and Bases

Since Phase 1 provides entity recognition without dedicated UI, you can query research entities using standard Obsidian tools.

### DataView Examples

**List all in-progress research projects:**

```dataview
TABLE status, title
FROM ""
WHERE cr_type = "research_project" AND status = "in-progress"
SORT file.name ASC
```

**Find IRNs for a specific person:**

```dataview
LIST
FROM ""
WHERE cr_type = "individual_research_note" AND contains(subject, "John Smith")
```

**Count research entities by type:**

```dataview
TABLE length(rows) as Count
FROM ""
WHERE contains(["research_project", "research_report", "individual_research_note"], cr_type)
GROUP BY cr_type
```

### Tag Detection

Research entities can also be detected via tags:

| Tag | Entity Type |
|-----|-------------|
| `#research-project` or `#research_project` | Research Project |
| `#research-report` or `#research_report` | Research Report |
| `#individual-research-note` or `#irn` | Individual Research Note |
| `#research-journal` or `#research_journal` | Research Journal |
| `#research-log-entry` or `#research_log_entry` | Research Log Entry |

Tags support nested paths (e.g., `#genealogy/research-project`).

---

## Example Workflows

### Complex Research Case

**User:** Investigating a multi-source identity question.

1. Create Research Project: "Identity of John Smith (1850-1920)"
2. Add research log entries as you consult sources
3. Document negative findings: "searched PA birth records, no match"
4. Create Research Report: "Smith Birth Location Analysis"
5. Link report to project via `up` property
6. Create IRN synthesizing findings across multiple reports
7. Link IRN to person note via `subject` property

### Quick Research Session

**User:** Documenting a day's research activity.

1. Create Research Journal entry for today
2. List projects worked on with wikilinks
3. Document sources searched and findings
4. Note next steps for future sessions
5. Use DataView to query all journal entries by date range

### Tracking Research Gaps

**User:** Identifying which ancestors need more research.

1. Review person notes for missing information
2. Create Research Project for each investigation
3. Link projects to the people being researched
4. Track progress via project status
5. View research entity counts in Statistics

---

## Find Related Research

The **Find related research** command aggregates all research activity for a specific person across your vault, surfacing cross-project connections.

### How to access

- **Command palette:** Search for "Find related research for person"
- **Command menu:** Listed under the Tools category
- **Entity Profile View:** The "Research activity" section in person profiles shows the same data inline — see [Entity Profile View](Entity-Profile-View)

If the active note is a person, the command opens the results modal directly. Otherwise, a person picker appears first.

### What it shows

The modal displays research entries grouped by project:

- **Project header** — project name, entry count, and date range
- **Entry details** — type badge (IRN, Log, Journal, Report, Project), clickable title, result indicator (positive/negative/inconclusive), and date
- **Cross-project visibility** — immediately see which projects have researched the same person and how much overlap exists

### What it searches

The command scans the vault for:

| Entity type | How the person is matched |
|-------------|--------------------------|
| Individual research note (IRN) | `subject` property matches the person |
| Research log entry | `subject` or `person` property matches |
| Research journal | Wikilink to the person in the note body |
| Research report | Wikilink to the person in the note body |
| Research project | Wikilink to the person in the note body |

---

## Related Pages

- [Evidence & Sources](Evidence-And-Sources) — Source management and GPS methodology
- [Statistics & Reports](Statistics-And-Reports) — Research entity statistics
- [Frontmatter Reference](Frontmatter-Reference) — Complete property documentation
- [Data Quality](Data-Quality) — Research level tracking
