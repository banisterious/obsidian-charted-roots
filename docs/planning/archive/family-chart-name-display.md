# Family Chart Name Display Options

- **Status:** Planning
- **GitHub Issue:** [#90](https://github.com/banisterious/obsidian-charted-roots/issues/90)
- **Created:** 2026-01-19

## Problem Statement

On the Family Chart, long names can extend beyond card boundaries, making them difficult to read. Currently, names are displayed on a single line as "First Last" (e.g., "John William Smith").

## Proposed Solution

Add a **Name display** option to the Family Chart toolbar with two modes:

| Mode | Line 1 | Line 2 |
|------|--------|--------|
| **Full name** (default) | John William Smith | *(dates if enabled)* |
| **Given / Surname** | John William | Smith |

This leverages the name components feature added in v0.19.7 (`given_name`, `surnames` properties).

## User Feedback

From [#90 discussion](https://github.com/banisterious/obsidian-charted-roots/issues/90):

1. **Fallback splitting:** Split at the last space ("John William Smith" → "John William" / "Smith")
2. **Multiple surnames:** Show all surnames on line 2 (don't leave data out)
3. **Mini cards:** Allow the option, making mini cards slightly taller

## Implementation Details

### New View State Property

```typescript
// In FamilyChartViewState interface
nameDisplayMode?: 'full' | 'split';  // 'full' = single line, 'split' = given/surname on separate lines
```

```typescript
// In FamilyChartView class
private nameDisplayMode: 'full' | 'split' = 'full';
```

### Display Fields Configuration

Current (full name mode):
```typescript
const displayFields: string[][] = [['first name', 'last name']];
```

New (split mode):
```typescript
const displayFields: string[][] = [['first name'], ['last name']];
```

### Name Extraction in transformPersonNode

Current logic:
```typescript
const nameParts = (person.name || '').trim().split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts.slice(1).join(' ');
```

New logic:
```typescript
// Use explicit name components if available, otherwise fall back to parsing
let firstName: string;
let lastName: string;

if (person.givenName) {
    firstName = person.givenName;
} else {
    // Fallback: first word of name
    const nameParts = (person.name || '').trim().split(' ');
    firstName = nameParts[0] || '';
}

if (person.surnames && person.surnames.length > 0) {
    // Join all surnames (supports Hispanic/Portuguese naming)
    lastName = person.surnames.join(' ');
} else {
    // Fallback: split at last space (per user feedback)
    const nameParts = (person.name || '').trim().split(' ');
    lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    // If split mode, firstName should be everything except the last word
    if (this.nameDisplayMode === 'split' && !person.givenName) {
        firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
    }
}
```

### Card Dimension Adjustments

The card height calculation needs to account for split name mode:

```typescript
// Calculate number of content lines
const nameLines = this.nameDisplayMode === 'split' ? 2 : 1;
const dateLines = (this.showBirthDates ? 1 : 0) + (this.showDeathDates ? 1 : 0);
const totalLines = nameLines + dateLines;

// Adjust card dimensions based on total lines
// Current: 2 lines (name + date) = 70px, 3 lines = 90px
// New: need to handle 2, 3, or 4 lines
```

Card height mapping:

| Lines | Height (rectangle) | Height (compact) | Height (mini) |
|-------|-------------------|------------------|---------------|
| 1 | 50px | 35px | 35px |
| 2 | 70px | 50px | 50px |
| 3 | 90px | 65px | 65px |
| 4 | 110px | 80px | 80px |

### Menu Integration

Add to the Display Options menu (alongside birth/death date toggles):

```typescript
menu.addItem((item) => {
    item.setTitle(`${this.nameDisplayMode === 'split' ? '✓ ' : ''}Split given/surname`)
        .onClick(() => this.toggleNameDisplayMode());
});
```

Or use a submenu for clarity:

```typescript
menu.addItem((item) => {
    item.setTitle('Name display')
        .setSubmenu()
        .addItem((sub) => {
            sub.setTitle(`${this.nameDisplayMode === 'full' ? '✓ ' : ''}Full name`)
                .onClick(() => this.setNameDisplayMode('full'));
        })
        .addItem((sub) => {
            sub.setTitle(`${this.nameDisplayMode === 'split' ? '✓ ' : ''}Given / Surname`)
                .onClick(() => this.setNameDisplayMode('split'));
        });
});
```

### State Serialization

Add to `getState()`:
```typescript
nameDisplayMode: this.nameDisplayMode,
```

Add to `setState()`:
```typescript
if (state.nameDisplayMode !== undefined) {
    this.nameDisplayMode = state.nameDisplayMode;
}
```

## Files to Modify

1. **src/ui/views/family-chart-view.ts**
   - Add `nameDisplayMode` property and interface field
   - Update `transformPersonNode()` for smarter name extraction
   - Update `buildDisplayFields()` or inline logic for display configuration
   - Update card dimension calculations
   - Add menu option
   - Update state serialization

## Testing Checklist

- [ ] Full name mode displays as before (no regression)
- [ ] Split mode shows given name on line 1, surname(s) on line 2
- [ ] Fallback works when `given_name`/`surnames` properties are missing
- [ ] Multiple surnames are joined with space
- [ ] Card height adjusts correctly for all combinations:
  - [ ] Split name only
  - [ ] Split name + birth date
  - [ ] Split name + death date
  - [ ] Split name + both dates
- [ ] Works with all card styles: rectangle, circle, compact, mini
- [ ] Setting persists across view reloads
- [ ] Menu toggle shows correct checkmark state

## Future Considerations

- **Maiden name display:** Could add option to show maiden name in parentheses
- **Name order preference:** Some cultures prefer surname-first display
- **Nickname display:** Could show nickname if available

## References

- [Name Components feature (v0.19.7)](../../wiki-content/Release-History.md#name-components-v0197)
- [PersonNode interface](../../src/core/family-graph.ts) - lines 104-108
- [family-chart library documentation](../../external/family-chart/)
