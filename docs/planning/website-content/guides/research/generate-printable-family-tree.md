# Outline — generate-printable-family-tree

**Status:** 📋 Outline. Not yet drafted.
**Slug:** `generate-printable-family-tree`
**Title:** I want to generate a printable family tree
**Track:** research
**Difficulty:** easy
**Time estimate:** ~10 min
**Relevant releases:** 0.22.17
**Length estimate (drafted):** ~700 words

---

## Framing

A researcher who wants a printable artifact — for a family reunion, a wall mount, a gift, archival storage, or sharing with a non-Obsidian relative. The Tree Wizard handles all four output formats from one entry point; this guide focuses on the PDF path because "printable" is the most common reason readers land here. ODT, Canvas, and Excalidraw outputs get pointers via Variations.

## What you'll need

- People notes connected via parent / spouse / child relationships
- One root person to focus the tree around (typically the oldest known ancestor, or the central person of the family group)
- (Optional) Excalidraw plugin installed if you want hand-drawn output instead of standard PDF

## Steps

1. **Open the Tree Wizard.** Three paths:
   - Control Center → Visual Trees tab → **New Tree**
   - Statistics Dashboard → Visual Trees section → click any tree type
   - Right-click a person note → **Charted Roots → Generate Tree**
2. **Step 1 (Root) — pick the focus person.** Search by name, sort by birth/death year, filter by family group / collection / universe. Birth and death years appear next to each name to help disambiguate.
3. **Step 2 (Tree type) — choose the shape.**
   - **Full Tree (Hourglass)** — root in the center, ancestors above, descendants below.
   - **Ancestors (Pedigree)** — only ancestors, branching upward. Binary branching, each person has 2 parents.
   - **Descendants** — only descendants, branching downward.
   - Set generation limits for ancestors/descendants. Toggle "Include spouses" if you want spouse relationships shown.
4. **Step 3 (Output format) — pick PDF.** ODT for word-processor editing, Canvas for interactive, Excalidraw for hand-drawn — see Variations.
5. **Configure PDF options.**
   - **Page size:** Letter / A4 / Legal / Tabloid / A3.
   - **Orientation:** Portrait or Landscape. Pedigrees usually fit better landscape.
   - **Node content:** Name only / with dates / with dates and places.
   - **Color scheme:** Default (gender-based) / Grayscale (best for monochrome printing) / Generational (different colors per generation level).
   - **Large tree handling:** Auto-scale (shrink to fit, may reduce readability), Auto page size (use larger paper), or Limit generations (reduce depth).
6. **Generate.** Set the document title. The PDF downloads.

## Variations

- **Hand-drawn aesthetic.** In step 4, pick **Excalidraw** instead of PDF. Three drawing styles (Architect / Artist / Cartoonist), customizable fonts, and SVG/PNG export. Requires the Excalidraw plugin.
- **Editable in word processors.** Pick **ODT** instead of PDF. Open in LibreOffice, Word, or Google Docs and customize fonts, colors, or add content around the tree.
- **Interactive on-canvas exploration.** Pick **Canvas** for a clickable, zoomable tree linked to person notes. Choose a layout algorithm: Standard, Compact (for 50+ people), Timeline (chronological by birth year), or Hourglass.
- **Wall-sized print.** Tabloid or A3 in Landscape, or see `print-wall-sized-pedigree` (P2) for a deeper coverage of multi-page tiling and large-format options.
- **Privacy protection for living persons.** Available for Canvas and Excalidraw outputs (see Privacy Options in the wizard's options step). For PDF/ODT, configure under **Settings → GEDCOM** and re-export.

## Related guides

- [I want to add my first person from scratch](add-first-person-manually)
- [I want to print a wall-sized pedigree](print-wall-sized-pedigree) — P2

## Reference

- Wiki: [Visual Trees](https://github.com/banisterious/obsidian-charted-roots/wiki/Visual-Trees)
- Wiki: [Tree Preview](https://github.com/banisterious/obsidian-charted-roots/wiki/Tree-Preview)
- Wiki: [Family Chart View](https://github.com/banisterious/obsidian-charted-roots/wiki/Family-Chart-View)

## Screenshot needs

- **1 load-bearing capture:** A printable PDF/pedigree shot showing what a finished output looks like. **`docs/images/cr-report-pedigree-tree.png`** should work — it's a pedigree tree report that demonstrates the printable shape. Drop in after step 6 as the "what success looks like" shot.
- *Optional* second capture: the Tree Wizard's PDF Options step (step 5). Would clarify the option spread but isn't strictly needed since the bullet list spells it out. Skip unless you want to capture during the screenshot pass.
- *No need* to capture step 1 or 2 — the wizard form is conventional and the prose covers it.

## Open questions for review

- The PDF path is the "headline" but the wizard offers four formats. Currently I keep the headline focused on PDF and push the others into Variations. Alternative: open the guide with a "four formats, pick the one for your goal" framing and walk all four equally. The current shape is more decisive but assumes most readers want PDF.
- "Wall-sized print" is mentioned as a Variation but is itself a P2 guide (`print-wall-sized-pedigree`). Worth deciding now whether the P2 guide is "wall-size only" or whether it absorbs the larger-format coverage from this one. Lean toward keeping the basic large-format bullet here and letting the P2 cover the multi-page tiling that genuinely needs depth.
- The Excalidraw bullet under Variations could be its own guide (`hand-drawn-excalidraw-tree`?) but isn't on the P0/P1/P2 list. Skip for now; cross-link to the wiki.
