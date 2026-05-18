# Styling and CSS

This document covers the Charted Roots CSS architecture, build system, and customization options.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Build System](#build-system)
  - [Build Commands](#build-commands)
  - [Component Order](#component-order)
  - [Adding New Components](#adding-new-components)
- [Design Tokens](#design-tokens)
  - [Spacing](#spacing)
  - [Colors](#colors)
  - [Transitions](#transitions)
- [Style Settings Integration](#style-settings-integration)
- [Component Files](#component-files)
- [Theme Compatibility](#theme-compatibility)
- [Mobile Styling](#mobile-styling)
- [Development Workflow](#development-workflow)

---

## Architecture Overview

Charted Roots uses a modular CSS architecture with component files that are concatenated into a single `styles.css` for Obsidian.

```
charted-roots/
├── styles/                    # Component CSS files (44 files)
│   ├── variables.css          # CSS custom properties
│   ├── style-settings.css     # Style Settings plugin config
│   ├── base.css               # Base structural elements
│   ├── control-center.css     # Control Center core UI (~107KB)
│   ├── sources.css            # Sources tab (~57KB)
│   ├── cleanup-wizard.css     # Cleanup wizard modal (~41KB)
│   ├── import-export-wizard.css # Import/Export wizards (~41KB)
│   ├── media-modals.css       # Media management modals (~37KB)
│   ├── map-view.css           # Leaflet map styling (~40KB)
│   └── ...                    # 35 more component files
├── styles.css                 # Generated output (DO NOT EDIT)
└── build-css.js               # Node.js build script
```

**Key principles:**
- Component files are self-contained
- Use CSS custom properties for theming
- Reference Obsidian's built-in variables for theme compatibility
- Prefix custom properties with `--cr-` namespace

---

## Build System

The CSS build system is a Node.js script (`build-css.js`) that:
1. Formats CSS with Prettier
2. Lints CSS with Stylelint
3. Concatenates component files in dependency order
4. Generates `styles.css` with metadata headers

### Build Commands

```bash
# Full build (format + lint + build)
npm run build:css

# Build only (skip format/lint)
npm run build:css -- --build-only

# Watch mode for development
npm run build:css -- --watch

# Lint only
npm run build:css -- --lint

# Format only
npm run build:css -- --format
```

### Component Order

Components are concatenated in a specific order to handle dependencies:

```javascript
componentOrder: [
  'variables.css',           // 1. CSS custom properties
  'style-settings.css',      // 2. Style Settings plugin config
  'base.css',                // 3. Base structural elements
  'layout.css',              // 4. Layout utilities
  'settings.css',            // 5. Settings interface
  'control-center.css',      // 6. Control Center core UI
  'entity-create-modals.css', // 7. Person picker and entity creation
  'place-modals.css',        // 8. Place-specific modals
  'media-modals.css',        // 9. Media management modals
  'import-export-wizard.css', // 10. Import/Export wizards
  'staging-manager.css',     // 11. Staging management
  'cleanup-wizard.css',      // 12. Cleanup wizard (all steps)
  // ... 32 more components
  'responsive.css'           // Responsive breakpoints (last)
]
```

### Adding New Components

1. Create the component file in `styles/`:
   ```css
   /* styles/my-component.css */
   .cr-my-component {
     /* styles */
   }
   ```

2. Add to `componentOrder` in `build-css.js`:
   ```javascript
   componentOrder: [
     // ... existing components
     'my-component.css',
     // ... remaining components
   ]
   ```

3. Rebuild:
   ```bash
   npm run build:css
   ```

**Orphan detection:** The build system warns about CSS files not in the component order.

---

## Design Tokens

Design tokens are defined in `styles/variables.css` and prefixed with `--cr-`.

### Spacing

```css
:root {
  --cr-spacing-xs: 4px;
  --cr-spacing-sm: 8px;
  --cr-spacing-md: 16px;
  --cr-spacing-lg: 24px;
  --cr-spacing-xl: 32px;
}
```

### Colors

Colors reference Obsidian's CSS variables for automatic theme compatibility. All 37 custom properties are defined in `variables.css`:

```css
:root {
  /* Core colors - inherit from Obsidian */
  --cr-primary: var(--interactive-accent);
  --cr-bg: var(--background-primary);
  --cr-text: var(--text-normal);
  --cr-border: var(--background-modifier-border);

  /* Node dimensions */
  --cr-node-width: 200px;
  --cr-node-height: 100px;
  --cr-node-padding: var(--cr-spacing-md);

  /* Borders */
  --cr-border-width: 1px;
  --cr-border-radius: 6px;
  --cr-radius-xs: 4px;
  --cr-radius-sm: 6px;
  --cr-radius-md: 8px;
  --cr-radius-lg: 12px;

  /* Family Chart colors - customizable via Style Settings */
  --cr-fcv-female-color: rgb(196, 138, 146);
  --cr-fcv-male-color: rgb(120, 159, 172);
  --cr-fcv-unknown-color: rgb(211, 211, 211);
  --cr-fcv-background-light: rgb(250, 250, 250);
  --cr-fcv-background-dark: rgb(33, 33, 33);
  --cr-fcv-text-light: #333;
  --cr-fcv-text-dark: #fff;

  /* Evidence colors - customizable via Style Settings */
  --cr-source-primary: #22c55e;
  --cr-source-secondary: #f59e0b;
  --cr-source-derivative: #ef4444;
  --cr-coverage-high: #22c55e;
  --cr-coverage-medium: #f59e0b;
  --cr-coverage-low: #ef4444;

  /* Frozen media gallery - customizable via Style Settings */
  --cr-gallery-gap: 5px;
  --cr-gallery-img-max-height: 200px;
  --cr-gallery-img-max-width: 250px;
  --cr-gallery-img-border-radius: 8px;
  --cr-gallery-object-fit: cover;
  --cr-gallery-background: transparent;
}
```

### Transitions

```css
:root {
  --cr-transition-fast: 150ms ease;
  --cr-transition-normal: 250ms ease;
  --cr-transition-slow: 350ms ease;
}
```

---

## Style Settings Integration

Charted Roots integrates with the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) plugin for user customization.

Configuration is defined in `styles/style-settings.css`:

```css
/* @settings

name: Charted Roots
id: charted-roots
settings:
  -
    id: family-chart-heading
    title: Family Chart View
    type: heading
    level: 1
    collapsed: true
  -
    id: cr-fcv-female-color
    title: Female card color
    type: variable-color
    format: rgb
    default: "rgb(196, 138, 146)"
  ...
*/
```

**Customizable settings:**

| Category | Settings |
|----------|----------|
| Family Chart View | Female/male/unknown card colors, background colors, text colors |
| Evidence Visualization | Primary/secondary/derivative source colors, coverage level colors |
| Canvas Node Dimensions | Node width and height for canvas trees |
| Timeline Callouts | Dot colors per event type, title/date/description styling, connector colors |
| Frozen Media Gallery | Image dimensions, border radius, gap, object-fit, background |

Users with Style Settings installed can customize these values in Settings → Style Settings → Charted Roots.

---

## Component Files

| Component | Purpose | Size |
|-----------|---------|------|
| `variables.css` | CSS custom properties and design tokens | 1 KB |
| `style-settings.css` | Style Settings plugin configuration | 6 KB |
| `base.css` | Base structural elements | 1 KB |
| `sources.css` | Sources tab, media gallery, citations | 55 KB |
| `map-view.css` | Leaflet map view (includes bundled Leaflet CSS) | 40 KB |
| `cleanup-wizard.css` | Cleanup wizard modal (all 9 steps) | 38 KB |
| `import-export-wizard.css` | Import/Export wizard modals | 41 KB |
| `statistics.css` | Statistics tab and workspace view | 30 KB |
| `tree-output.css` | Tree output two-panel layout | 30 KB |
| `events.css` | Events tab, timeline components | 28 KB |
| `data-quality.css` | Data quality analysis tab | 28 KB |
| `family-chart-view.css` | Interactive family chart | 30 KB |
| `control-center.css` | Control Center core UI (tabs, navigation, cards) | 107 KB |
| `media-modals.css` | Media picker, manager, gallery, bulk link | 37 KB |
| `report-wizard.css` | Report generator wizard | 19 KB |
| `place-modals.css` | Place creation, standardization, merge, network | 26 KB |
| `family-wizard.css` | Family creation wizard | 15 KB |
| `canvas-navigation.css` | Canvas navigation and split wizard | 15 KB |
| `family-chart-export.css` | Family chart export wizard | 15 KB |
| `map-wizard.css` | Map creation wizard modal | 13 KB |
| `universe-wizard.css` | Universe setup wizard | 11 KB |
| `staging-manager.css` | Staging management modal | 11 KB |
| `entity-create-modals.css` | Person picker, create forms, relationships | 22 KB |
| `timeline-callouts.css` | Timeline callout styles for markdown export | 11 KB |
| `dynamic-content.css` | Dynamic content blocks | 11 KB |
| `relationships.css` | Relationships tab | 10 KB |
| `leaflet-distortable.css` | Leaflet toolbar plugins (vendored) | 8 KB |
| `dashboard.css` | Dashboard tab (Control Center home) | 8 KB |
| `preferences.css` | Preferences tab | 7 KB |
| `date-systems.css` | Date systems card | 5 KB |
| `relationship-calculator.css` | Relationship calculator modal | 5 KB |
| `organizations.css` | Organizations tab | 10 KB |
| `settings.css` | Plugin settings tab | 4 KB |
| `duplicate-detection.css` | Duplicate detection modal | 3 KB |
| `migration-notice.css` | Migration notice view | 3 KB |
| `tree-statistics.css` | Tree statistics modal | 3 KB |
| `folder-scan.css` | Folder scan modal | 3 KB |
| `find-on-canvas.css` | Find on canvas modal | 2 KB |
| `validation.css` | Validation results modal | 2 KB |
| `universes.css` | Universes tab and dockable view | 1 KB |
| `collections.css` | Collections tab and dockable view | 1 KB |
| `data-quality-view.css` | Data quality dockable view | 1 KB |
| `layout.css` | Layout utilities | 1 KB |
| `responsive.css` | Responsive breakpoints | <1 KB |

---

## Theme Compatibility

Charted Roots maintains compatibility with Obsidian themes by:

1. **Using Obsidian CSS variables:**
   ```css
   .cr-component {
     background: var(--background-primary);
     color: var(--text-normal);
     border: 1px solid var(--background-modifier-border);
   }
   ```

2. **Respecting theme mode:**
   ```css
   .theme-light .cr-fcv-chart-container {
     background: var(--cr-fcv-background-light);
     color: var(--cr-fcv-text-light);
   }

   .theme-dark .cr-fcv-chart-container {
     background: var(--cr-fcv-background-dark);
     color: var(--cr-fcv-text-dark);
   }
   ```

3. **Avoiding hardcoded colors** - except for semantic colors (success/warning/error) that should remain consistent across themes.

**Common Obsidian CSS variables:**

| Variable | Purpose |
|----------|---------|
| `--background-primary` | Main background color |
| `--background-secondary` | Secondary/alt background |
| `--background-modifier-border` | Border color |
| `--text-normal` | Normal text color |
| `--text-muted` | Muted/secondary text |
| `--text-faint` | Faint text (disabled, etc.) |
| `--interactive-accent` | Accent/primary color |
| `--interactive-accent-hover` | Accent hover state |

---

## Mobile Styling

Charted Roots provides basic mobile support for Obsidian on tablets and phones. The mobile styling approach uses two complementary strategies.

### JavaScript-Applied Classes

The primary mobile styling is in `control-center.css` and uses classes applied via JavaScript when `Platform.isMobile` is detected:

```css
/* Full-screen modal on mobile */
.crc-mobile-mode {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  border-radius: 0;
}

/* Slide-in drawer navigation */
.crc-drawer.crc-drawer--mobile {
  position: fixed !important;
  transform: translateX(-100%) !important;
  transition: transform 0.3s ease !important;
}

.crc-drawer.crc-drawer--mobile.crc-drawer--open {
  transform: translateX(0) !important;
}
```

**Mobile-specific adjustments:**

| Element | Mobile Behavior |
|---------|-----------------|
| Modals | Full-screen, no border radius |
| Navigation drawer | Slide-in from left with backdrop |
| Tables | Horizontal scroll with `-webkit-overflow-scrolling: touch` |
| Form inputs | 16px font size to prevent iOS zoom on focus |
| Header actions | Reduced padding and font size |
| Cards | Adjusted padding (12px vs 16px) |

### Media Query Breakpoints

Component files use standard CSS media queries for responsive adjustments:

```css
/* responsive.css - global breakpoint */
@media (max-width: 768px) {
  :root {
    --cr-node-width: 150px;
    --cr-node-height: 80px;
  }
}

/* Component-specific breakpoints */
@media (max-width: 600px) {
  .cr-fcv-toolbar {
    flex-wrap: wrap;
  }
  .cr-fcv-label {
    display: none;
  }
}
```

**Files with responsive styles:**

| File | Breakpoint | Purpose |
|------|------------|---------|
| `responsive.css` | 768px | Global node dimension adjustments |
| `control-center.css` | 500px | Template tiles, reports/import-export hub grids |
| `family-chart-view.css` | 600px, 800px | Toolbar wrapping, info panel width |
| `map-view.css` | 600px, 768px | Map controls, world map preview height |
| `cleanup-wizard.css` | 400px, 500px, 600px | Tile grid columns (5→3→2), summary stats |
| `media-modals.css` | 500px, 600px, 1024px | Media manager grid (3→2→1 columns), gallery controls |
| `import-export-wizard.css` | 500px | Format grids, preview counts, stat grids |
| `tree-output.css` | 600px, 900px | Two-panel layout collapse, output format cards |
| `events.css` | 600px | Timeline connector and node sizing |
| `sources.css` | 500px | Citation format grid |
| `dashboard.css` | 500px | Dashboard tiles and metrics grids |
| `staging-manager.css` | 500px | Stats grid, item actions |
| `family-wizard.css` | 600px | Modal full width on mobile |
| `map-wizard.css` | 700px | Modal full width on mobile |
| `relationship-calculator.css` | 500px | Selection layout (row→column) |

### Adding Mobile Styles

When adding new mobile styles:

1. **For Control Center modals**: Add to the `.crc-mobile-mode` section in `control-center.css`
2. **For wizard modals**: Add mobile styles in the respective wizard CSS file (e.g., `cleanup-wizard.css`)
3. **For view components**: Add `@media` queries at the end of the component file
4. **Use Obsidian's classes**: Check for `.is-mobile`, `.is-phone`, `.is-tablet` on `body` if needed
5. **Touch targets**: Ensure tappable elements are at least 44px × 44px
6. **Font size**: Use minimum 16px for inputs to prevent iOS zoom

---

## Development Workflow

### Initial Setup

```bash
# Install dependencies
npm install

# Build CSS
npm run build:css
```

### Development

1. Start watch mode:
   ```bash
   npm run build:css -- --watch
   ```

2. Edit component files in `styles/`

3. Changes automatically rebuild `styles.css`

4. Reload Obsidian to see changes (or use Hot Reload plugin)

### Before Committing

1. Run full build to format and lint:
   ```bash
   npm run build:css
   ```

2. Fix any linting errors

3. Commit both component files and generated `styles.css`

### CSS Conventions

**Class naming:**
- Use BEM-like naming: `.cr-component__element--modifier`
- Four valid prefixes enforced by Stylelint:

| Prefix | Usage |
|--------|-------|
| `cr-` | General plugin classes (most common) |
| `crc-` | Control Center classes |
| `canvas-roots-` | Legacy structural classes |
| `charted-roots-` | New registrations and dynamic content blocks |

**Selector specificity:**
- Keep specificity low where possible
- Use `:where()` for opt-out overrides
- Avoid `!important` except for Style Settings variables
- **Watch for single-class collisions with global utility classes.** The global `.crc-hidden` / `.cr-hidden` rule (`display: none`) has specificity 0,1,0 — same as any component class like `.cr-fcv-info-panel`. When a component rule sets `display: flex` (or any other display value), bundle order determines the winner, and `.crc-hidden` silently loses if the component class is declared later in the bundle. The fix is a combined-class rule like `.cr-fcv-info-panel.crc-hidden { display: none; }` to win the specificity comparison. This bit us in #604 (Family Chart Person details pane). When you add a `display:` rule to a component class, also add the combined-class override.

**Organization within components:**
- Group related rules together
- Comment sections for clarity
- Place responsive styles at the end

```css
/* Component: Example Card */
.cr-example-card {
  /* Layout */
  display: flex;
  flex-direction: column;

  /* Sizing */
  padding: var(--cr-spacing-md);

  /* Appearance */
  background: var(--background-primary);
  border-radius: var(--cr-border-radius);

  /* Transitions */
  transition: var(--cr-transition-normal);
}

.cr-example-card__header {
  /* ... */
}

.cr-example-card--highlighted {
  /* ... */
}

/* Responsive */
@media (max-width: 768px) {
  .cr-example-card {
    padding: var(--cr-spacing-sm);
  }
}
```
