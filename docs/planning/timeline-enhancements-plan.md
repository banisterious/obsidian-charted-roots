# Timeline Enhancements Plan

## Overview

This plan covers two areas of improvement for the Events/Timeline feature:
1. Additional markdown export formats beyond the vertical callout timeline
2. UI improvements to the Timeline card in the Control Center

---

## Part 1: Additional Export Formats

### 1.1 Condensed Table Format

**Output Example:**
```markdown
| Year | Event | Person(s) | Place | Sources |
|------|-------|-----------|-------|---------|
| 1647 | [[Marriage of Matthew and Elizabeth\|Marriage]] | [[Matthew Marvin]], [[Elizabeth Gregory]] | Hartford | 2 |
| 1650 | [[Birth of Reinold Marvin\|Birth]] | [[Reinold Marvin]] | Hartford | 1 |
```

**Use Cases:**
- Quick reference/lookup
- Printing or PDF export
- Embedding in larger documents
- Data review and verification

**Implementation:**
- Add `exportToTable()` method to `TimelineMarkdownExporter`
- Generate standard markdown table with configurable columns
- Options: include/exclude columns (Year, Event, Person(s), Place, Sources, Date precision)

**Effort:** Low

---

### 1.2 Simple List Format

**Output Example:**
```markdown
## 1647
- [[Marriage of Matthew and Elizabeth|Marriage]] of [[Matthew Marvin]] and [[Elizabeth Gregory]] - Hartford

## 1650
- [[Birth of Reinold Marvin|Birth]] of [[Reinold Marvin]] - Hartford
```

**Use Cases:**
- Maximum compatibility (no CSS required)
- Easy copy/paste to other applications
- Simple embedding anywhere

**Implementation:**
- Add `exportToList()` method
- Use headers for year grouping (or flat list option)
- Minimal formatting, just links and text

**Effort:** Low

---

### 1.3 Dataview-Compatible Query Block

**Output Example:**
```markdown
```dataview
TABLE WITHOUT ID
  link(file.link, eventType) as Event,
  dateformat(date(date), "yyyy-MM-dd") as Date,
  person as Person,
  place as Place
FROM "Events"
WHERE type = "event"
SORT date ASC
```
```

**Use Cases:**
- Dynamic timeline that updates automatically
- Users who prefer Dataview's query capabilities
- Advanced filtering and grouping

**Implementation:**
- Add `exportToDataviewQuery()` method
- Generate a pre-configured Dataview query based on current filters
- Include comment noting Dataview plugin requirement
- Could also offer DataviewJS variant for more complex rendering

**Effort:** Low (just generating query text)

**Note:** This doesn't require Dataview as a dependency - we just generate the query text. Users choose whether to install Dataview.

---

### 1.4 Horizontal Timeline (Future)

**Description:** Left-to-right scrolling CSS timeline, good for shorter timespans or period overviews.

**Implementation:** Would require new CSS and possibly a different callout structure.

**Effort:** Medium-High

**Status:** Defer to future release

---

## Part 2: Timeline Card UI Improvements

### 2.1 Current State

The Timeline card currently shows:
- Title and description
- Export button
- Basic options (title, filters)

### 2.2 Proposed Enhancements

#### Quick Stats Display
Show at-a-glance information:
```
42 events spanning 1647-1892 (245 years)
12 people | 8 places | 38 dated events
```

**Implementation:**
- Call `getExportSummary()` on card render
- Display stats in a subtle info row
- Update when filters change

#### Export Format Selector
Radio buttons or dropdown to choose format:
- [ ] Vertical Timeline (callouts)
- [ ] Condensed Table
- [ ] Simple List
- [ ] Dataview Query

**Implementation:**
- Add format selection UI element
- Store last-used format preference
- Show format-specific options based on selection

#### Filter Presets
Quick-access buttons for common filters:
- "Vital events only" (birth, death, marriage)
- "All events for [person]" (if person context available)
- "Clear filters"

**Implementation:**
- Add preset buttons row
- Presets populate the filter dropdowns
- Could be expandable/collapsible section

#### Recent Exports Section
Show last 2-3 generated timelines:
```
Recent:
- Marvin Family Timeline (2 hours ago) [Open] [Regenerate]
- Hartford Events 1640-1700 (yesterday) [Open] [Regenerate]
```

**Implementation:**
- Track exports in plugin settings (path, timestamp, options used)
- Limit to last 3-5 exports
- Quick actions to open file or regenerate with same options

**Effort:** Medium

#### Preview Thumbnail (Future)
Mini-preview showing approximate timeline appearance.

**Effort:** High (would need to render preview somehow)

**Status:** Defer to future release

---

## Implementation Phases

### Phase 1: Export Formats (This Release)
1. Add Table format export
2. Add Simple List format export
3. Add Dataview Query export
4. Add format selector to Timeline card

### Phase 2: Card UI Improvements (This Release)
1. Add quick stats display
2. Add filter presets
3. Improve visual hierarchy and spacing

### Phase 3: Future Enhancements
1. Recent exports tracking
2. Horizontal timeline format
3. Preview thumbnail

---

## Technical Notes

### New Methods for TimelineMarkdownExporter

```typescript
// Table format
exportToTable(events: EventNote[], options: TableExportOptions): Promise<TimelineMarkdownResult>

// Simple list format
exportToList(events: EventNote[], options: ListExportOptions): Promise<TimelineMarkdownResult>

// Dataview query generation
exportToDataviewQuery(options: DataviewQueryOptions): Promise<TimelineMarkdownResult>
```

### Export Options Interface Updates

```typescript
interface TimelineExportOptions extends TimelineMarkdownOptions {
  format: 'callout' | 'table' | 'list' | 'dataview';
  // Table-specific
  tableColumns?: ('year' | 'event' | 'persons' | 'place' | 'sources' | 'date')[];
  // List-specific
  listGroupByYear?: boolean;
  listIncludePlace?: boolean;
  // Dataview-specific
  dataviewFolder?: string;
}
```

### Settings Storage for Recent Exports

```typescript
interface RecentExport {
  path: string;
  timestamp: number;
  options: TimelineExportOptions;
}

// In settings
recentTimelineExports: RecentExport[];
```

---

## Open Questions

1. Should table format support sorting in reading mode? (Requires specific markdown table syntax)
2. For Dataview query, should we support DataviewJS for richer rendering?
3. Should filter presets be user-configurable?
4. Maximum number of recent exports to track?

---

## Acceptance Criteria

### Phase 1
- [ ] User can select export format from dropdown/radio
- [ ] Table export generates valid markdown table with event data
- [ ] List export generates simple markdown with year headers
- [ ] Dataview export generates working query (when Dataview installed)
- [ ] Each format respects the same filter options

### Phase 2
- [ ] Quick stats show event count, date range, unique people/places
- [ ] Stats update when filters change
- [ ] Filter presets work correctly
- [ ] Card has improved visual hierarchy
