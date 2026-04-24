# Features Page Refresh — draft

**Target page:** `/features/_index.md` on chartedroots.com
**Status:** 📝 Stub — audit pending.
**Source material:** current live page, [CHANGELOG.md](../../../CHANGELOG.md), [wiki-content/Release-History.md](../../../wiki-content/Release-History.md), feature docs in [docs/](../../../docs/).

---

## Authoring approach

1. **Audit pass** — copy the current live page's section headings into this doc and mark each as: ✅ current · 🔶 needs refresh · ❌ missing · 🗑️ outdated-remove.
2. **Gap pass** — list features shipped since January 2026 that deserve a section or sub-section (Entity Profile Views, Collections, Universes, Calendar View, Data Quality, etc.).
3. **Draft pass** — keep the existing capability-area structure (Canvas Tree, Family Chart, Import/Export, Maps, Evidence, etc.) and add new sections for subsystems that didn't exist in the January snapshot.

---

## Current live page section inventory (from defuddle pull)

Capability areas present on the live page today (placeholder — confirm during audit):

- Canvas Tree Generation
- Interactive Family Chart View
- Import & Export (GEDCOM 5.5.1 / GEDCOM X / Gramps / CSV-TSV / Excalidraw / Privacy)
- Geographic Features (Interactive Map View / Custom Image Maps)
- *[rest of sections TBD after full-page pull]*

---

## Known missing / needs-refresh (preliminary)

- **Entity Profile Views** (#251) — read-only profile across persons, places, events, sources, organizations. Shipped in 0.20.x territory. Whole new subsystem, deserves its own section.
- **Collections (cross-entity)** — shipped incrementally across 0.20.x, hardened in 0.22.3. Appears across Create Place, Edit Person, Control Center, dockable sidebar.
- **Universes** — universe management, custom calendars, fictional date systems with universe scoping. Central to the world-builder track.
- **Calendar View** — shipped v0.20.47.
- **Source Hierarchies and display** — shipped v0.20.46. Linked parent/child source structures.
- **Citation Integration + Metadata** — shipped v0.20.34 / v0.20.38.
- **Customizable Timeline Display Templates** — shipped v0.20.38.
- **Historical Context Overlay and Age Annotations** — shipped v0.20.34.
- **Comprehensive GEDCOM Field Coverage** — shipped v0.20.33.
- **Book & Narrative Compilation** — shipped v0.20.26. Major feature; may deserve its own top-level section.
- **Data Quality tools** — live page mentions these briefly; recent work (merge wizard, schema validation, 14-step cleanup wizard, duplicate detection) may warrant expansion.
- **Person-Focused Map Journey** — v0.20.45.
- **Interactive Family Chart** — needs edits for recent improvements.
- **Structured Role Lists for Organizations** (#274).
- **Mills Source Classification** (#276).
- **Web Clipper integration and templates** — shipped across 0.18.x / 0.20.x. Purpose-built templates for genealogical sources (Find a Grave person, FamilySearch source, Wikipedia biography, Wikidata place) with CSS and LLM variants. Likely deserves its own section on the features page, plus a dedicated treatment in [research-track.md](research-track.md). Source reference at [docs/clipper-templates/CLIPPER-TEMPLATES.md](../../clipper-templates/CLIPPER-TEMPLATES.md).

---

## Draft content

*[TODO — populate during draft pass.]*

---

## Open questions

1. **Section ordering** — the current page leads with Canvas Tree + Family Chart (visualization). With the feature catalog growing, should the order shift to lead with the two audience tracks (genealogy / world-building) and tuck visualization beneath? Current ordering is visualization-first and that's probably still right — it's the most immediately legible capability.
2. **Depth per section** — current page uses bullet lists with short lead-ins. Keep that, or expand to paragraph form for sections that have grown complex (Universes, Sources, Book Builder)?
3. **Feature pages vs one big page** — as the catalog grows, consider splitting headline features into dedicated pages (`/features/universes/`, `/features/book-builder/`) with the main `/features/` as an index. Not for this refresh, but worth flagging for Phase 3+.
