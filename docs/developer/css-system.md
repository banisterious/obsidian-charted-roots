# CSS Build System

## Overview

Charted Roots uses a component-based CSS build system that automatically concatenates, lints, and formats CSS files from the `styles/` directory into a single `styles.css` file for Obsidian.

## Directory Structure

```
styles/
├── variables.css              # CSS custom properties and design tokens
├── style-settings.css         # Style Settings plugin configuration
├── base.css                   # Base structural elements
├── layout.css                 # Layout utilities
├── settings.css               # Settings interface
├── control-center.css         # Control Center core UI
├── entity-create-modals.css   # Person picker and entity creation modals
├── place-modals.css           # Place-specific modals
├── media-modals.css           # Media management modals
├── import-export-wizard.css   # Import/Export wizard
├── staging-manager.css        # Staging management modal
├── cleanup-wizard.css         # Cleanup wizard (all steps)
├── ...                        # 30+ more component files
├── dynamic-content.css        # Dynamic content blocks
├── migration-notice.css       # Migration notice view
└── responsive.css             # Responsive breakpoints (last)
```

The `styles/` directory contains **44 component CSS files**, concatenated in a defined order by `build-css.js`.

## Available Commands

### Building CSS

```bash
# Full build with linting and formatting
npm run build:css

# Build only (skip linting)
npm run build:css -- --build-only

# Watch mode for development
npm run build:css:watch
```

### Linting CSS

```bash
# Lint CSS files
npm run lint:css

# Lint and auto-fix
npm run lint:css:fix
```

### Formatting CSS

```bash
# Format CSS files with Prettier
npm run format:css
```

## Build Process

The CSS build system follows this pipeline:

1. **Format** - Prettier formats all component files
2. **Lint** - Stylelint checks for errors and enforces rules
3. **Build** - Components are concatenated in dependency order
4. **Output** - Final `styles.css` is generated with build metadata

The top-level `npm run build` calls `build:css` with `--no-fail-on-lint`, meaning lint warnings don't block production builds but errors still do.

## Component Order

Components are concatenated in a specific order defined in the `componentOrder` array in `build-css.js`. The order ensures proper CSS cascade:

1. Variables and design tokens (`variables.css`, `style-settings.css`)
2. Base and layout (`base.css`, `layout.css`)
3. Settings (`settings.css`)
4. Control Center and modals (largest group — `control-center.css`, entity/place/media modals, wizards)
5. Feature views (family chart, reports, data quality, maps, events, etc.)
6. Entity tabs (organizations, sources, universes, collections)
7. Dynamic content blocks
8. Responsive styles (last — `responsive.css`)

Any `.css` file in `styles/` not listed in `componentOrder` or `excludedFiles` triggers an "orphaned files" warning during build.

## CSS Naming Conventions

### Class Names

Use BEM-style naming with one of four valid prefixes:

| Prefix | Usage |
|--------|-------|
| `cr-` | General plugin classes (most common) |
| `crc-` | Control Center classes (extensive — hundreds of classes) |
| `canvas-roots-` | Legacy structural classes (e.g., `.canvas-roots-container`) |
| `charted-roots-` | New registrations and dynamic content blocks |

```css
/* Block */
.cr-person-node { }

/* Block with element */
.cr-person-node__name { }

/* Block with modifier */
.cr-person-node--highlighted { }

/* Control Center prefix */
.crc-drawer { }
.crc-nav-item--active { }
```

### Custom Properties

Use `--cr-` prefix for Charted Roots variables:

```css
:root {
  --cr-spacing-md: 16px;
  --cr-node-width: 200px;
  --cr-primary: var(--interactive-accent);
}
```

Obsidian's variables (prefixed with `--`) can be used directly for theme compatibility.

## Stylelint Configuration

The project uses Stylelint with these configurations:

- `stylelint-config-standard` - Standard CSS rules
- `stylelint-config-prettier` - Prettier compatibility

### Key Rules

- **Class Pattern**: `^(cr|crc|canvas-roots|charted-roots)-[a-z0-9-]+(__[a-z0-9-]+)?(--[a-z0-9-]+)?$`
- **Custom Property Pattern**: Disabled (`null`) — no enforcement on custom property names
- **String Quotes**: Double quotes
- **Color Hex**: Short notation, lowercase

### Rule Overrides

Several files have relaxed rules to accommodate third-party code, Obsidian conventions, or legacy patterns:

- `variables.css` - Custom property pattern disabled
- 17 component files (including `base.css`, `events.css`, `family-chart-view.css`, `map-view.css`, `sources.css`, etc.) - Multiple relaxed rules including class pattern, custom property pattern, color notation, and duplicate selectors

> **Note:** The `.stylelintrc.json` also contains stale overrides for `theme.css` and `modals.css` which no longer exist as files. These are harmless dead entries.

## Adding New Components

To add a new CSS component:

1. **Create the file** in `styles/` directory

2. **Add to build order** in `build-css.js`:
   ```javascript
   componentOrder: [
     // ... existing components
     'my-component.css',  // Add here in correct order
     // ... remaining components
   ]
   ```

3. **Write your CSS** following naming conventions

4. **Build** to generate updated `styles.css`:
   ```bash
   npm run build:css
   ```

## Development Workflow

### Watch Mode

For active development, use watch mode:

```bash
npm run build:css:watch
```

This will:
- Watch for changes in `styles/` directory
- Automatically rebuild on file changes
- Show build status and errors in real-time

### Testing Styles

1. Build CSS: `npm run build:css`
2. Deploy to vault: `npm run deploy` (requires local `deploy.sh`)
3. Reload Obsidian (Ctrl/Cmd + R)

## Integration with Main Build

The CSS build is automatically integrated into the main build process:

```bash
npm run build
```

This runs:
1. Font building (`build:fonts`)
2. TypeScript type checking
3. JavaScript bundling (esbuild)
4. CSS building (with `--no-fail-on-lint` flag)

## Theme Compatibility

### Using Obsidian Variables

Always prefer Obsidian's CSS variables for colors and common properties:

```css
.cr-my-element {
  color: var(--text-normal);           /* Text color */
  background: var(--background-primary); /* Background */
  border-color: var(--background-modifier-border); /* Borders */
}
```

### Light and Dark Themes

Theme-specific overrides are placed inline within the component files that need them:

```css
/* In the relevant component file (e.g., family-chart-view.css) */
.theme-light .cr-fcv-chart-container {
  /* Light theme specific overrides */
}

.theme-dark .cr-fcv-chart-container {
  /* Dark theme specific overrides */
}
```

## Troubleshooting

### Build Fails at Linting Stage

Check the error output for specific CSS issues:

```bash
npm run lint:css
```

Auto-fix common issues:

```bash
npm run lint:css:fix
```

### Orphaned Files Warning

If you see warnings about orphaned CSS files, either:
- Add them to `componentOrder` in `build-css.js`
- Or add them to `excludedFiles` if they shouldn't be included

### Component Not Included

Verify the component is:
1. In the `styles/` directory
2. Listed in `componentOrder` array
3. Has a `.css` extension

## Performance

The CSS build is fast:
- Typical build time: <100ms
- Full pipeline (format + lint + build): <1 second
- Watch mode rebuild: Near-instant

## References

- [Stylelint Documentation](https://stylelint.io/)
- [Prettier Documentation](https://prettier.io/)
- [Obsidian CSS Variables](https://docs.obsidian.md/Reference/CSS+variables/)
