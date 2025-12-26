# Cleanup Wizard Phase 4: Polish & Customization

## Overview

Phase 4 focuses on user experience refinements for the Post-Import Cleanup Wizard. These enhancements improve usability, accessibility, and personalization without changing core functionality.

**Status:** Planning
**Target Version:** v0.18.0 or later (post Data Cleanup Bundle)
**Prerequisite:** Phase 1-3 complete (Steps 1-10 functional)

## Tasks

### Task 1: Keyboard Navigation

**Goal:** Full keyboard accessibility for wizard navigation.

**Requirements:**
- Arrow keys for tile selection on overview
- Enter to select/activate focused tile
- Escape to go back or close modal
- Tab/Shift+Tab for form field navigation
- Number keys 1-0 as shortcuts for steps 1-10

**Implementation:**

```typescript
// Add to CleanupWizardModal
private setupKeyboardNavigation(): void {
  this.modalEl.addEventListener('keydown', (e: KeyboardEvent) => {
    // On overview screen
    if (this.currentStep === null) {
      this.handleOverviewKeyboard(e);
    } else {
      this.handleStepKeyboard(e);
    }
  });
}

private handleOverviewKeyboard(e: KeyboardEvent): void {
  const tiles = this.tileContainerEl?.querySelectorAll('.cr-cleanup-tile');
  if (!tiles) return;

  switch (e.key) {
    case 'ArrowRight':
      this.moveFocus(tiles, 1);
      e.preventDefault();
      break;
    case 'ArrowLeft':
      this.moveFocus(tiles, -1);
      e.preventDefault();
      break;
    case 'ArrowDown':
      this.moveFocus(tiles, 5); // Move to next row (5 tiles per row)
      e.preventDefault();
      break;
    case 'ArrowUp':
      this.moveFocus(tiles, -5);
      e.preventDefault();
      break;
    case 'Enter':
      this.activateFocusedTile();
      e.preventDefault();
      break;
    case '1': case '2': case '3': case '4': case '5':
    case '6': case '7': case '8': case '9': case '0':
      const stepNum = e.key === '0' ? 10 : parseInt(e.key);
      this.navigateToStep(stepNum);
      e.preventDefault();
      break;
  }
}
```

**Visual Feedback:**
- Focused tile has accent border (same as hover)
- Focus indicator visible for accessibility
- Screen reader announcements for tile selection

**Effort:** Low
**Priority:** High (accessibility requirement)

---

### Task 2: Step Reordering (Drag-Drop Tiles)

**Goal:** Allow users to customize the order of steps for their workflow.

**Constraints:**
- Cannot violate step dependencies
- Steps 7 → 7b → 8 → 9 must remain in order (place operations)
- Step 1 (Quality Report) must remain first
- Step 2 (Bidirectional) should remain before 3-6

**Implementation Approach:**

1. **Drag-drop library:** Use native HTML5 drag-drop API
2. **Dependency validation:** Prevent invalid orderings
3. **Visual feedback:** Show drop zones and invalid targets

```typescript
interface StepOrder {
  /** Custom order of step IDs */
  order: string[];
  /** Whether custom order is active */
  isCustom: boolean;
}

// Dependency graph for validation
const STEP_DEPENDENCIES: Record<string, string[]> = {
  'quality-report': [],
  'bidirectional': [],
  'dates': ['bidirectional'],
  'gender': ['bidirectional'],
  'orphans': ['bidirectional'],
  'sources': ['orphans'],
  'place-variants': [],
  'place-dedup': ['place-variants'],
  'geocode': ['place-variants'],
  'place-hierarchy': ['geocode'],
  'flatten': []
};

function isValidOrder(order: string[]): boolean {
  const positions = new Map(order.map((id, i) => [id, i]));

  for (const [stepId, deps] of Object.entries(STEP_DEPENDENCIES)) {
    const stepPos = positions.get(stepId);
    for (const dep of deps) {
      const depPos = positions.get(dep);
      if (depPos !== undefined && stepPos !== undefined && depPos > stepPos) {
        return false; // Dependency comes after dependent step
      }
    }
  }
  return true;
}
```

**UI Updates:**
- Drag handle icon on each tile (6-dot grip)
- Disabled drag for locked steps (show lock icon)
- "Reset to default order" button
- Toast notification when order saved

**Effort:** Medium
**Priority:** Low (nice-to-have)

---

### Task 3: Cleanup Profiles

**Goal:** Save and load named cleanup configurations.

**Use Cases:**
- "Quick cleanup" profile: Steps 1-5 only
- "Full cleanup" profile: All steps
- "Places only" profile: Steps 7-9
- Custom profiles for specific import sources

**Profile Data Structure:**

```typescript
interface CleanupProfile {
  /** Profile identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Which steps are enabled */
  enabledSteps: number[];
  /** Custom step order (optional) */
  stepOrder?: string[];
  /** Per-step settings (optional) */
  stepSettings?: {
    [stepId: string]: Record<string, unknown>;
  };
  /** Whether this is a built-in profile */
  isBuiltIn: boolean;
  /** Last modified timestamp */
  modified: number;
}

// Built-in profiles
const BUILTIN_PROFILES: CleanupProfile[] = [
  {
    id: 'full',
    name: 'Full Cleanup',
    description: 'Run all cleanup steps',
    enabledSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    isBuiltIn: true,
    modified: 0
  },
  {
    id: 'quick',
    name: 'Quick Cleanup',
    description: 'Essential fixes only (Steps 1-5)',
    enabledSteps: [1, 2, 3, 4, 5],
    isBuiltIn: true,
    modified: 0
  },
  {
    id: 'places',
    name: 'Places Only',
    description: 'Place standardization and geocoding',
    enabledSteps: [7, 8, 9],
    isBuiltIn: true,
    modified: 0
  }
];
```

**UI Components:**

1. **Profile selector dropdown** (on overview screen)
   - Shows profile name and description
   - "Manage Profiles..." option opens profile manager

2. **Profile manager modal**
   - List of saved profiles
   - Create new profile
   - Edit profile (name, description, enabled steps)
   - Delete custom profiles
   - Export/import profiles as JSON

3. **"Save as Profile" button** on summary screen
   - Captures current step selection as new profile

**Storage:**
- Profiles saved in `plugin.settings.cleanupProfiles`
- Custom profiles only (built-in profiles are in code)

**Effort:** Medium-High
**Priority:** Medium

---

### Task 4: Step Transition Animations

**Goal:** Smooth visual transitions between wizard states.

**Animations:**

1. **Tile to step transition**
   - Selected tile expands to fill modal
   - Other tiles fade out
   - Step content fades in

2. **Step to step transition**
   - Slide left/right based on direction
   - Progress indicator animates

3. **Progress bar animations**
   - Smooth width transitions during operations
   - Pulse effect during processing

4. **Results appearance**
   - Result items fade in sequentially (staggered)
   - Summary cards animate in

**Implementation:**

```css
/* Tile expansion animation */
.cr-cleanup-tile {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.cr-cleanup-tile.expanding {
  transform: scale(1.1);
  z-index: 10;
}

.cr-cleanup-tile.fading {
  opacity: 0;
  transform: scale(0.9);
}

/* Step slide transition */
.cr-step-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.cr-step-content.slide-out-left {
  transform: translateX(-100%);
  opacity: 0;
}

.cr-step-content.slide-in-right {
  transform: translateX(100%);
  opacity: 0;
}

/* Staggered fade-in for results */
.cr-result-item {
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}

.cr-result-item:nth-child(1) { animation-delay: 0ms; }
.cr-result-item:nth-child(2) { animation-delay: 50ms; }
.cr-result-item:nth-child(3) { animation-delay: 100ms; }
/* ... */

@keyframes fadeIn {
  to { opacity: 1; }
}
```

**Considerations:**
- Respect `prefers-reduced-motion` media query
- Keep animations short (200-300ms)
- Avoid animations during batch operations (performance)

**Effort:** Low-Medium
**Priority:** Low (purely cosmetic)

---

### Task 5: Schema Validation Integration

**Goal:** Integrate wizard with future schema validation system.

**Dependency:** Requires schema validation feature to be implemented first.

**Integration Points:**

1. **Pre-scan enhancement**
   - Run schema validation alongside existing detection
   - Show schema violations in Quality Report (Step 1)

2. **New step: Schema Validation**
   - Could be inserted as Step 0 or as part of Step 1
   - Shows schema violations grouped by field
   - Option to auto-fix where possible

3. **Per-step schema checking**
   - After each batch fix, validate affected files
   - Warn if fixes introduce schema violations

**Deferred until:** Schema validation feature is planned and implemented.

**Effort:** High
**Priority:** Low (depends on unplanned feature)

---

## Implementation Order

Recommended implementation sequence:

1. **Task 1: Keyboard Navigation** (High priority, low effort)
   - Immediate accessibility improvement
   - No breaking changes

2. **Task 4: Animations** (Low priority, low effort)
   - Quick win for UX polish
   - Can be added incrementally

3. **Task 3: Cleanup Profiles** (Medium priority, medium effort)
   - Useful for power users
   - Foundation for task 2

4. **Task 2: Step Reordering** (Low priority, medium effort)
   - Complex due to dependency validation
   - May not be needed if profiles cover the use case

5. **Task 5: Schema Integration** (Low priority, high effort)
   - Defer until schema validation exists

---

## Open Questions

1. **Profile sharing:** Should profiles be exportable/importable between vaults?
2. **Step disabling:** Can users disable steps entirely (not just skip)?
3. **Animation toggle:** Should there be a setting to disable all animations?
4. **Keyboard hints:** Show keyboard shortcuts in UI (tooltips or legend)?

---

## Related Documentation

- [Post-Import Cleanup Wizard](./archive/post-import-cleanup-wizard.md) - Main planning document
- [Source Array Migration](./archive/source-array-migration.md) - Step 6 details
