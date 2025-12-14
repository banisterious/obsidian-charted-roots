# Fictional Date Systems Implementation Plan

## Overview

Fictional Date Systems allow users to define custom calendars and eras for world-building, historical fiction, and alternate history research. This enables proper date handling for universes like Middle-earth (Third Age, Fourth Age), Westeros (years since Aegon's Conquest), or custom fictional worlds.

## MVP Scope (v0.7.0)

The initial implementation focuses on **era-based dating** with simple year notation. Complex calendar systems (custom months, variable day lengths) are deferred to a future release.

### In Scope
- Era definitions with name, abbreviation, and epoch year
- Date parsing for `{abbrev} {year}` format (e.g., "TA 2941")
- Age calculation within a single calendar system
- Display formatting in UI (Control Center, person notes)
- Bases integration (sorting, filtering by era/year)
- Universe-scoped calendar systems
- Settings UI for managing date formats

### Deferred (v0.8.0+)
- Custom month/day structures
- Multiple eras in single date (e.g., "TA 3021 / FA 1")
- Era conversion utilities
- Leaflet timeline slider integration
- Date range support within fictional systems
- Import/export of calendar definitions

---

## Schema Design

### Calendar System Definition

Stored in plugin settings under `fictionalDateSystems`:

```typescript
interface FictionalDateSystem {
  id: string;                    // Unique identifier (e.g., "middle_earth")
  name: string;                  // Display name (e.g., "Middle-earth Calendar")
  universe?: string;             // Optional universe scope
  eras: FictionalEra[];
  defaultEra?: string;           // Default era ID for new dates
}

interface FictionalEra {
  id: string;                    // Unique identifier (e.g., "third_age")
  name: string;                  // Full name (e.g., "Third Age")
  abbrev: string;                // Abbreviation (e.g., "TA")
  epoch: number;                 // Year offset from system epoch (0 for first era)
  direction?: 'forward' | 'backward';  // Count direction (default: forward)
}
```

### Example Configuration

```typescript
{
  id: "middle_earth",
  name: "Middle-earth Calendar",
  universe: "middle-earth",
  eras: [
    { id: "first_age", name: "First Age", abbrev: "FA", epoch: -37000 },
    { id: "second_age", name: "Second Age", abbrev: "SA", epoch: -6000 },
    { id: "third_age", name: "Third Age", abbrev: "TA", epoch: 0 },
    { id: "fourth_age", name: "Fourth Age", abbrev: "FoA", epoch: 3021 }
  ],
  defaultEra: "third_age"
}
```

### Person Note Usage

```yaml
---
name: Bilbo Baggins
universe: middle-earth
born: "TA 2890"
died: "FoA 61"
---
```

---

## Implementation Phases

### Phase 1: Core Types and Parser

**Files:**
- `src/dates/types/date-types.ts` - Type definitions
- `src/dates/parser/fictional-date-parser.ts` - Date parsing logic
- `src/dates/index.ts` - Module exports

**FictionalDateParser class:**
```typescript
class FictionalDateParser {
  constructor(systems: FictionalDateSystem[]);

  // Parse a date string like "TA 2941" into structured form
  parse(dateStr: string, universe?: string): ParsedFictionalDate | null;

  // Format a parsed date back to string
  format(date: ParsedFictionalDate): string;

  // Convert to canonical year (for sorting/comparison)
  toCanonicalYear(date: ParsedFictionalDate): number;

  // Calculate age between two dates in same system
  calculateAge(birth: ParsedFictionalDate, death: ParsedFictionalDate): number | null;
}

interface ParsedFictionalDate {
  system: FictionalDateSystem;
  era: FictionalEra;
  year: number;
  raw: string;
}
```

### Phase 2: Settings and Storage

**Files:**
- `src/dates/settings/date-system-settings.ts` - Settings integration
- Update `src/settings/settings.ts` - Add fictionalDateSystems array

**Settings Structure:**
```typescript
interface CanvasRootsSettings {
  // ... existing settings
  fictionalDateSystems: FictionalDateSystem[];
  enableFictionalDates: boolean;
}
```

### Phase 3: Control Center UI

**Files:**
- `src/dates/ui/date-systems-card.ts` - UI component for Control Center
- Update `src/ui/control-center.ts` - Add to Settings or new Dates tab

**UI Features:**
- List of configured date systems
- Add/Edit/Delete date systems
- Era configuration within each system
- Preview of date parsing
- Test input for validating date formats

### Phase 4: Integration Points

**Files to Update:**
- `src/services/person-service.ts` - Age calculation with fictional dates
- `src/ui/control-center.ts` - Display formatted dates in People tab
- `src/services/data-service.ts` - Sorting/filtering support

**Age Display:**
- When a person has fictional dates, calculate age using the appropriate system
- Display as "Lived 111 years (TA 2890 - FoA 61)"
- Fallback gracefully for unrecognized date formats

### Phase 5: Bases Integration

**Updates:**
- Ensure `born` and `died` fields with fictional dates sort correctly
- Add computed `canonical_birth_year` and `canonical_death_year` for sorting
- Filter support: "Show all people born in the Third Age"

---

## Built-in Date Systems

Include common fictional calendars as optional presets:

| System | Eras | Use Case |
|--------|------|----------|
| Middle-earth | FA, SA, TA, FoA | Tolkien's legendarium |
| Westeros | AC, BC (Before Conquest) | Game of Thrones |
| Star Wars | BBY, ABY | Star Wars universe |
| Generic Fantasy | Age 1, Age 2, Age 3 | Custom worlds |

Users can enable/disable built-in systems and create custom ones.

---

## UI Mockups

### Date Systems Card (Control Center > Settings)

```
┌─────────────────────────────────────────────────────────┐
│ Fictional Date Systems                          [+ Add] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🌍 Middle-earth Calendar                    [Edit] │ │
│ │    Eras: FA, SA, TA, FoA                           │ │
│ │    Universe: middle-earth                          │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚔️ Westeros Calendar                        [Edit] │ │
│ │    Eras: BC, AC                                    │ │
│ │    Universe: westeros                              │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Test date parsing:                                      │
│ [TA 2941____________] → Third Age, Year 2941           │
│                         Canonical: 2941                 │
└─────────────────────────────────────────────────────────┘
```

### Add/Edit Date System Modal

```
┌─────────────────────────────────────────────────────────┐
│ Add Date System                                    [×]  │
├─────────────────────────────────────────────────────────┤
│ Name: [Middle-earth Calendar_______________]            │
│ ID:   [middle_earth________________________]            │
│ Universe: [middle-earth____________________] (optional) │
│                                                         │
│ Eras:                                                   │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Name          Abbrev    Epoch    [↑] [↓] [×]     │   │
│ │ [First Age  ] [FA    ]  [-37000]                  │   │
│ │ [Second Age ] [SA    ]  [-6000 ]                  │   │
│ │ [Third Age  ] [TA    ]  [0     ]                  │   │
│ │ [Fourth Age ] [FoA   ]  [3021  ]                  │   │
│ └───────────────────────────────────────────────────┘   │
│                                        [+ Add Era]      │
│                                                         │
│ Default era: [Third Age ▼]                              │
│                                                         │
│                              [Cancel]  [Save]           │
└─────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
- Date parsing for various formats
- Age calculation across era boundaries
- Canonical year conversion
- Edge cases: year 0, negative years, unknown eras

### Integration Tests
- Settings persistence
- Control Center display
- Person note age calculation
- Bases sorting

### Manual Testing
- Create custom date system
- Add person with fictional dates
- Verify age display
- Test with multiple universes

---

## Migration Considerations

- Existing vaults with ISO dates continue to work unchanged
- Fictional dates are opt-in per universe
- No automatic conversion of existing dates
- Document migration path for users adopting fictional dates

---

## Dependencies

- No external libraries required
- Uses existing plugin settings infrastructure
- Integrates with existing universe system

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Core Types and Parser | Medium |
| Phase 2: Settings and Storage | Small |
| Phase 3: Control Center UI | Medium |
| Phase 4: Integration Points | Medium |
| Phase 5: Bases Integration | Small |

**Total: Medium-sized feature**

---

## Open Questions

1. Should fictional dates support approximate markers (e.g., "c. TA 2890")?
2. How to handle dates that span era boundaries in age calculations?
3. Should we support era-only dates without year (e.g., "Third Age")?

---

## References

- [Roadmap: Fictional Date Systems](../../wiki-content/Roadmap.md#fictional-date-systems)
- [Custom Relationship Types Plan](./custom-relationship-types-plan.md) - Similar feature structure
