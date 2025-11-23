# Canvas Roots: Development Roadmap

> **Last Updated:** 2025-11-23
> **Current Version:** v0.2.0-beta

Canvas Roots is in beta with core functionality complete and stable. Advanced features and enhancements are planned for future releases.

---

## 🎯 Released Versions

### v0.2.0-beta (Current)

**Beta Release:**
- Transitioned from alpha to beta status
- Core features confirmed stable and production-ready
- All essential genealogical workflows fully functional
- Foundation established for advanced feature development

### v0.1.4-alpha

**GEDCOM Export:**
- GEDCOM 5.5.1 format generation with complete header and trailer
- Individual record export with name, sex, birth/death dates and places
- Family record extraction from parent-child and spouse relationships
- UUID preservation using custom _UID tags for round-trip compatibility
- Collection code preservation (_COLL and _COLLN tags)
- Marriage metadata export (dates, locations from SpouseRelationship)
- Sex inference from father/mother relationships
- Collection filtering for selective export
- Control Center UI with export configuration
- Context menu integration on folders ("Export GEDCOM from this folder")
- Browser download with .ged file extension
- Comprehensive Guide tab documentation

### v0.1.3-alpha

**Collections & Groups (Complete):**
- Dual organization system: auto-detected family groups + user-defined collections
- Auto-detected groups with customizable group names (`collection_name` property)
- User collections for manual organization (`collection` property)
- Context menu actions: "Set group name" and "Add to collection"
- Collections tab with three browse modes: All people, Detected families, My collections
- Cross-collection connection detection showing bridge people
- Collection filtering in tree generation (all tree types)
- Collection-based node coloring with hash-based color assignment
- Collection overview canvas generation with grid layout and connection edges
- Analytics dashboard with comprehensive statistics and data quality metrics
- Comprehensive Guide tab documentation with advanced features

**UI Polish:**
- Refactored Control Center to use Obsidian's native `Setting` component throughout
- Standardized form layouts with horizontal label/control pattern across all tabs
- Canvas Settings: Native dropdowns for arrow styles and color schemes, proper input controls
- Data Entry: Clean horizontal layout for person creation form
- Tree Generation: Streamlined configuration with native slider, dropdowns
- Collections: Replaced radio buttons with dropdown for browse mode
- Advanced: Native controls for logging and export configuration
- Reduced code by 319 lines while improving consistency and accessibility

**Documentation:**
- Updated README with Collections & Groups feature
- New Collections & Groups section in user guide
- Complete Collections architecture documentation (All Phases 1-3 implemented)

### v0.1.2-alpha

**Context Menu Actions:**
- Person notes: Add relationships, validate data integrity, find on canvases
- Folders: Set as people folder, import GEDCOM, scan for relationship issues
- Canvas files: Regenerate trees, view statistics
- Full desktop and mobile support

### v0.1.1-alpha

**Tree Statistics & Regeneration:**
- Tree statistics modal showing person count, generation depth, edge counts
- Canvas regeneration with options to preserve/update layout and styling
- Context menu integration for canvas files

### v0.1.0-alpha

**Core Functionality:**
- TypeScript-based plugin foundation with Obsidian API integration
- Control Center modal UI for plugin management
- GEDCOM import with person note generation
- Dual storage relationship system (wikilinks + `cr_id` references)
- Bidirectional relationship linking
- Structured logging system with export capability

**Tree Generation:**
- Genealogical layout engine using [family-chart](https://github.com/donatso/family-chart) library
- Canvas generation from person notes with complex relationship handling
- Multiple tree types: ancestors (pedigree), descendants, full family tree
- Generation limits and spouse inclusion controls
- Vertical and horizontal layout directions

**UI & Workflow:**
- Streamlined Tree Generation tab with inline person browser
- Person search, sort, and filter capabilities
- Multi-family detection and automatic family group organization
- "Generate all trees" command for batch tree creation

**Styling & Customization:**
- Comprehensive canvas styling options within JSON Canvas spec
- Node coloring: gender-based, generation-based, or monochrome
- Arrow styles: directed, bidirectional, undirected
- Edge colors for parent-child and spouse relationships

**Multiple Spouse Support:**
- Flat indexed YAML properties (`spouse1`, `spouse2`, etc.)
- Marriage metadata: dates, locations, status (divorced, widowed, etc.)
- Optional spouse edge display with configurable labels
- Label formats: none, date-only, date-location, full

**Data Management:**
- Obsidian Bases template with one-click creation
- 6 pre-configured views for family data management
- YAML-first data storage for maximum compatibility

---

## 🚧 In Active Development

No features currently in active development. See Planned Features below for roadmap.

---

## 📋 Planned Features

### Export & Interoperability

**Excalidraw Integration:**
- Export family trees to Excalidraw format
- Preserve node styling and layout
- Enable manual annotation and customization
- Support for Excalidraw's drawing tools and features

### Reference Numbering Systems

- Ahnentafel numbering system support
- Dollarhide-Cole numbering system support
- d'Aboville descendant numbering
- Automatic number assignment and display
- Integration with Obsidian Properties panel

### Advanced UI

- Person Detail Panel with relationship visualization
- Rich inline person information display
- Quick editing capabilities
- Interactive tree preview with real-time layout configuration using family-chart
- Multiple preview modes (family-chart, D3 layouts)
- Zoomed-out tree previews in analytics dashboard
- Preview before canvas generation
- Canvas export as image/PDF

### Privacy & Obfuscation

- Optional data obfuscation for exports
- PII protection for canvas display
- Living person privacy controls
- Configurable obfuscation rules

### Batch Operations

- "Generate all family trees" folder action
- Batch tree generation with progress tracking
- Folder-level statistics and health reports

### Canvas Navigation & Organization

- Split large canvases by branch, generation, or geography
- Linked branch canvases with navigation nodes
- Ancestor/descendant canvas linking for same root person
- Canvas-to-canvas file nodes for easy navigation
- Master overview canvases with links to detailed views

### World-Building Features

- Visual grouping by house/faction
- Dual relationship trees (biological vs. political)
- Complex succession rules
- Fantasy dynasties and corporate succession tracking
- Geographic grouping and timeline support

---

## 🔮 Future Considerations

**Advanced Features:**
- Alternative parent relationships (adoption, foster care, step-parents)
- Unknown parent handling with placeholder nodes
- Flexible date formats (circa dates, date ranges)
- Child ordering within families
- Multi-generational gap handling
- Relationship quality visualization (close, distant, estranged)
- Medical genogram support
- Location and migration tracking
- Place note system

**Integration:**
- DataView template library
- Advanced Canvas plugin integration
- Multi-vault merging with collection matching
- Cloud sync considerations

**Performance:**
- Large tree optimization (1000+ people)
- Incremental layout updates
- Canvas rendering performance improvements

---

## 📊 Known Limitations

See [known-limitations.md](known-limitations.md) for a complete list of current limitations and workarounds.

**Key Limitations:**
- No GEDCOM export yet (import only)
- No reference numbering systems
- Living person privacy not yet implemented
- Single vault only (no multi-vault merging)
- No interactive tree previews yet

---

## 🤝 Contributing to the Roadmap

We welcome feedback on feature priorities! Please:

1. Check [existing issues](https://github.com/banisterious/obsidian-canvas-roots/issues) first
2. Open a new issue with the `feature-request` label
3. Describe your use case and why the feature would be valuable
4. Be specific about genealogical standards or workflows you need

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and contribution guidelines.

---

## 📅 Release Philosophy

Canvas Roots follows semantic versioning:
- **Patch releases (v0.1.x):** Bug fixes, minor improvements
- **Minor releases (v0.x.0):** New features, backward compatible
- **Major releases (v1.0.0+):** Breaking changes, major milestones

Features are prioritized based on:
- User feedback and requests
- Genealogical standards compliance
- Foundation for future features
- Development complexity vs. value

---

**Questions or suggestions?** Open an issue on [GitHub](https://github.com/banisterious/obsidian-canvas-roots/issues).
