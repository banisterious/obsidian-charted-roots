# Customizable Timeline Display Templates

Planning document for customizable timeline display templates.

**Status:** ✅ Complete (all 4 phases)

**Related:** [#325](https://github.com/banisterious/obsidian-charted-roots/issues/325), originated from [#323](https://github.com/banisterious/obsidian-charted-roots/issues/323) (@jeff962)

---

## Overview

Add user control over how timeline entries are displayed — labels, formatting, section ordering, and full template notes. Currently, timeline parameters (`sort`, `include`, `exclude`, `limit`, `context`, `familyEvents`) control which events appear but not how they're rendered.

---

## Implementation Phases

### Phase 1 — Section ordering

Control how different event categories are arranged on the timeline.

**New parameter:** `layout`

| Value | Behavior |
|-------|----------|
| `chronological` (default) | All events interleaved by date |
| `grouped` | Sections: Personal events → Family events → Historical context |
| `personal-first` | Personal events first, then family/context chronologically |

**Implementation:**
- In `buildTimelineEntriesWithContext`, after merging all entries, partition by category before sorting
- For `grouped` layout, render section dividers between categories
- Each section sorted chronologically within itself

### Phase 2 — Label customization

Override default labels for event types and family events.

**New settings:** Under Advanced > Timeline labels

| Setting | Default | Example override |
|---------|---------|------------------|
| `timelineBirthLabel` | `Born` | `Birth` |
| `timelineDeathLabel` | `Died` | `Death` |
| `timelineChildBirthLabel` | `Birth of {name}` | `{name} born` |
| `timelineSpouseDeathLabel` | `Death of {name}` | `{name} died` |
| `timelineParentDeathLabel` | `Death of {name}` | `Lost {name}` |
| `timelineSiblingBirthLabel` | `Birth of {name}` | `Sibling: {name}` |

**Implementation:**
- Labels support `{name}`, `{year}`, `{place}` placeholders
- Stored as settings, applied in the timeline renderer when building entry titles
- Affects both live rendering and freeze-to-markdown

### Phase 3 — Format strings

Per-block parameter controlling the display format of each entry.

**New parameter:** `format`

```
format: "{year} — {icon} {title} in {place}"
```

**Available placeholders:**

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{year}` | Year or date range | `1850` |
| `{date}` | Full date | `1850-01-01` |
| `{type}` | Event type label | `Birth` |
| `{title}` | Event title/description | `Born` or `Birth of John` |
| `{place}` | Place name | `Boston, MA` |
| `{age}` | Age annotation | `age 23` |
| `{icon}` | Event type icon | (rendered as inline icon) |
| `{link}` | Wikilink to event/person | `[[John Smith]]` |

**Implementation:**
- Parse format string into tokens
- For each entry, substitute placeholders with values
- Missing values produce empty strings (no "in undefined")
- Default format when not specified: current behavior

### Phase 4 — Template notes

Reference a markdown note that defines the timeline layout.

**New parameter:** `template: [[My Timeline Template]]`

**Template note format:**

```markdown
---
cr_type: timeline_template
---

# Sections

## Personal
sort: chronological
include: birth, death, marriage, occupation
format: "{year} — {title} in {place}"

## Family
sort: chronological
include: children_births, spouse_deaths
format: "{year} — {title}"

## Historical
sort: chronological
format: "{year} — {title}"
```

**Implementation:**
- Template notes are parsed into section definitions
- Each section has its own sort, include, and format
- Template overrides all per-block parameters
- Templates can be shared across notes via the parameter

**Design decisions:**
- Templates are optional — all existing parameters continue to work
- A template can be set as the global default via a setting
- Template notes are a new `cr_type` but don't need a dedicated folder

---

## Settings summary

| Setting | Phase | Default |
|---------|-------|---------|
| `timelineLayout` | 1 | `chronological` |
| `timelineBirthLabel` | 2 | `Born` |
| `timelineDeathLabel` | 2 | `Died` |
| `timelineChildBirthLabel` | 2 | `Birth of {name}` |
| `timelineSpouseDeathLabel` | 2 | `Death of {name}` |
| `timelineParentDeathLabel` | 2 | `Death of {name}` |
| `timelineSiblingBirthLabel` | 2 | `Birth of {name}` |
| `defaultTimelineTemplate` | 4 | *(empty)* |

---

## Risks and considerations

- **Phase 3 complexity:** Format strings require a tokenizer and careful handling of missing values. Need to avoid XSS-like issues with user-provided format strings in HTML rendering.
- **Phase 4 scope:** Template notes are the most ambitious part. Could be deferred if Phases 1-3 cover enough use cases.
- **Backward compatibility:** All phases are additive — existing timelines render identically without any new parameters.
- **Freeze-to-markdown:** Custom formats need to be reflected in frozen output, not just live rendering.
