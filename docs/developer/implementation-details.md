# Implementation Details

This document is the index for Charted Roots technical implementation documentation.

## Documentation Index

The implementation details have been organized into focused sub-documents for easier navigation and maintenance.

### Core Systems

| Document | Description |
|----------|-------------|
| [Entity System](implementation/entity-system.md) | Note types, dual storage, schema validation, custom relationship types |
| [Canvas and Charts](implementation/canvas-and-charts.md) | Canvas generation, family chart layout system, layout engines |
| [Maps System](implementation/maps-system.md) | Leaflet maps, coordinate systems, geocoding, custom image maps |
| [Reports System](implementation/reports-system.md) | Report types, PDF rendering, ODT export, report wizard |

### Data Management

| Document | Description |
|----------|-------------|
| [Data Services](implementation/data-services.md) | Property/value aliases, data quality, batch operations, collections |
| [Import/Export](implementation/import-export.md) | GEDCOM, GEDCOM X, Gramps XML, CSV; source image management |

### User Interface

| Document | Description |
|----------|-------------|
| [UI Architecture](implementation/ui-architecture.md) | Context menus, Control Center (13 tabs), dockable views, settings, mobile adaptations |

### Specialized Features

| Document | Description |
|----------|-------------|
| [Specialized Features](implementation/specialized-features.md) | Fictional date systems, privacy protection, Obsidian Bases integration |
| [Third-Party Libraries](implementation/third-party-libraries.md) | pdfmake, family-chart, Leaflet, D3, dependency management |

## Quick Reference

### Entity Types

Eight primary entity types: Person, Place, Event, Source, Organization, Universe, Map, Schema (plus Timeline as a system type)

See [Entity System](implementation/entity-system.md) for full details.

### Layout Engines

Three layout algorithms: Family-Chart (default), Timeline, Hourglass — plus a core layout engine (`layout-engine.ts`) that wraps D3's hierarchy layout as shared infrastructure

See [Canvas and Charts](implementation/canvas-and-charts.md) for full details.

### Control Center Tabs

13 tabs: Dashboard, People, Events, Places, Sources, Organizations, Universes, Collections, Data quality, Schemas, Relationships, Trees & reports, Maps — plus a Tools group with 6 modal/leaf launchers

13 registered views: 9 entity dockable sidebar views (People, Places, Events, Sources, Organizations, Relationships, Universes, Collections, Data quality) plus 4 specialized views (Family Chart, Map, Statistics, Migration Notice)

See [UI Architecture](implementation/ui-architecture.md) for full details.

### Supported Import/Export Formats

| Format | Import | Export |
|--------|--------|--------|
| GEDCOM 5.5.1 | ✅ | ✅ |
| GEDCOM X | ✅ | ✅ |
| Gramps XML | ✅ | ✅ |
| CSV | ✅ | ✅ |

See [Import/Export](implementation/import-export.md) for full details.

## Related Documentation

- [Getting Started](getting-started.md) - Development environment setup
- [Project Structure](project-structure.md) - Directory layout and component status
- [Coding Standards](coding-standards.md) - TypeScript and CSS guidelines
- [Styling Guide](styling.md) - CSS architecture and theming
- [Design Decisions](design-decisions.md) - Architecture decision records
